/* ═══════════════════════════════════════════════════════════════════════
   SourceDeck — Calendar Connections + Events Fetcher
   ─────────────────────────────────────────────────────────────────────
   Storage contract (localStorage.sd_calendars):
     [{
       id: "cal_<hex>",
       provider: "google" | "microsoft" | "icloud_caldav" | "ics" | "cal_com",
       name: "Ops calendar",
       account: "user@example.com" | null,
       status: "connected" | "degraded" | "disconnected",
       created_at: epoch_ms,
       last_sync_at: epoch_ms | null,
       scopes: [...],
       // provider-specific (tokens client-side ONLY for implicit flows;
       // production should swap to server-held refresh tokens via Worker):
       access_token?: string,
       expires_at?: epoch_ms,
       refresh_token?: string,   // server-only normally
       calendar_id?: string,     // for Google primary, MS "me/events"
       ics_url?: string,         // for ics feed provider
       caldav?: { server, username, app_password_ref }
     }]

   All secrets should be moved to the calendar-oauth Worker for production;
   the storage contract above is the same on both paths — only the token
   location changes. UI never renders tokens.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  const LS_KEY = 'sd_calendars';

  // ─── Storage ──────────────────────────────────────────────────────────
  function list(){ try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); } catch(_){ return []; } }
  function save(arr){ localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
  function upsert(conn){
    const arr = list();
    const i = arr.findIndex(c => c.id === conn.id);
    if (i >= 0) arr[i] = { ...arr[i], ...conn }; else arr.push(conn);
    save(arr);
    try { window.sdTrack && window.sdTrack('calendar_connected', { provider: conn.provider, id: conn.id }); } catch(_){}
    return conn;
  }
  function remove(id){
    save(list().filter(c => c.id !== id));
    try { window.sdTrack && window.sdTrack('calendar_disconnected', { id }); } catch(_){}
  }
  function randomId(){ const b=new Uint8Array(8); crypto.getRandomValues(b); return 'cal_' + [...b].map(x=>x.toString(16).padStart(2,'0')).join(''); }

  // ─── Google Calendar (implicit OAuth → client-side token) ─────────────
  // Requires window.SD_CONFIG.CALENDAR.google.client_id set.
  function googleConnect(redirectUri){
    const cfg = (window.SD_CONFIG && window.SD_CONFIG.CALENDAR && window.SD_CONFIG.CALENDAR.google) || {};
    if (!cfg.client_id) {
      alert("Google Calendar connection isn't configured yet.\n\nAn admin needs to add google.client_id to /assets/sd-config.js.\n\nYou can use the ICS URL feed method today — it works with Google Calendar.");
      return;
    }
    const state = randomId();
    sessionStorage.setItem('sd_oauth_state', state);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', cfg.client_id);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'token');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly openid email profile');
    url.searchParams.set('state', 'google|' + state);
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('prompt', 'consent');
    window.location.href = url.toString();
  }

  async function googleFetchEvents(conn, rangeStart, rangeEnd){
    if (!conn.access_token) throw new Error('no_token');
    if (conn.expires_at && Date.now() > conn.expires_at) throw new Error('token_expired');
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', new Date(rangeStart).toISOString());
    url.searchParams.set('timeMax', new Date(rangeEnd).toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');
    const r = await fetch(url, { headers: { 'Authorization': 'Bearer ' + conn.access_token, 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('google_api:' + r.status);
    const d = await r.json();
    return (d.items || []).map(ev => ({
      id: ev.id,
      title: ev.summary || '(no title)',
      start: ev.start?.dateTime || ev.start?.date,
      end:   ev.end?.dateTime || ev.end?.date,
      all_day: !!(ev.start?.date),
      location: ev.location || '',
      attendees: (ev.attendees || []).map(a => a.email).filter(Boolean),
      description: ev.description || '',
      source: { provider: 'google', connection_id: conn.id, raw_id: ev.id }
    }));
  }

  // ─── Microsoft Graph (PKCE → code, exchanged via Worker) ──────────────
  function microsoftConnect(redirectUri){
    const cfg = (window.SD_CONFIG && window.SD_CONFIG.CALENDAR && window.SD_CONFIG.CALENDAR.microsoft) || {};
    if (!cfg.client_id) {
      alert("Microsoft Outlook connection isn't configured yet.\n\nAn admin needs to add microsoft.client_id to /assets/sd-config.js.\n\nYou can use the ICS URL feed method today — Outlook exposes one.");
      return;
    }
    const state = randomId();
    const verifier = randomVerifier();
    sessionStorage.setItem('sd_oauth_state', state);
    sessionStorage.setItem('sd_oauth_verifier', verifier);
    pkceChallenge(verifier).then(challenge => {
      const url = new URL('https://login.microsoftonline.com/' + (cfg.tenant || 'common') + '/oauth2/v2.0/authorize');
      url.searchParams.set('client_id', cfg.client_id);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_mode', 'query');
      url.searchParams.set('scope', 'openid offline_access email profile Calendars.Read');
      url.searchParams.set('state', 'microsoft|' + state);
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
      window.location.href = url.toString();
    });
  }

  async function microsoftFetchEvents(conn, rangeStart, rangeEnd){
    if (!conn.access_token) throw new Error('no_token');
    const url = new URL('https://graph.microsoft.com/v1.0/me/calendarView');
    url.searchParams.set('startDateTime', new Date(rangeStart).toISOString());
    url.searchParams.set('endDateTime', new Date(rangeEnd).toISOString());
    url.searchParams.set('$top', '250');
    url.searchParams.set('$orderby', 'start/dateTime');
    const r = await fetch(url, { headers: { 'Authorization': 'Bearer ' + conn.access_token, 'Prefer': 'outlook.timezone="UTC"' } });
    if (!r.ok) throw new Error('microsoft_api:' + r.status);
    const d = await r.json();
    return (d.value || []).map(ev => ({
      id: ev.id,
      title: ev.subject || '(no title)',
      start: ev.start?.dateTime,
      end:   ev.end?.dateTime,
      all_day: !!ev.isAllDay,
      location: ev.location?.displayName || '',
      attendees: (ev.attendees || []).map(a => a.emailAddress?.address).filter(Boolean),
      description: ev.bodyPreview || '',
      source: { provider: 'microsoft', connection_id: conn.id, raw_id: ev.id }
    }));
  }

  // ─── ICS URL feed (zero-setup; works with any calendar) ───────────────
  async function icsFetchEvents(conn, rangeStart, rangeEnd){
    if (!conn.ics_url) throw new Error('no_ics_url');
    const r = await fetch(conn.ics_url, { cache: 'no-store' });
    if (!r.ok) throw new Error('ics_fetch:' + r.status);
    const text = await r.text();
    return parseICS(text).filter(ev => {
      const s = new Date(ev.start).getTime();
      return s >= rangeStart && s <= rangeEnd;
    });
  }

  // Minimal ICS parser — handles VEVENT blocks, unfolds CRLF+space continuations
  function parseICS(text){
    // Unfold: RFC 5545 says lines starting with space/tab continue prior line
    const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    const events = [];
    const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1);
    for (const blk of blocks) {
      const body = blk.split(/END:VEVENT/i)[0];
      const get = (key) => {
        const re = new RegExp('^' + key + '(?:;[^:]*)?:(.+)$', 'mi');
        const m = body.match(re);
        return m ? m[1].trim() : '';
      };
      const uid = get('UID');
      const summary = get('SUMMARY').replace(/\\,/g, ',').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      const dtstart = get('DTSTART') || get('DTSTART;VALUE=DATE');
      const dtend = get('DTEND') || get('DTEND;VALUE=DATE');
      const location = get('LOCATION').replace(/\\,/g, ',').replace(/\\n/g, '\n');
      const description = get('DESCRIPTION').replace(/\\,/g, ',').replace(/\\n/g, '\n');
      if (!dtstart) continue;
      const start = icsDateToISO(dtstart);
      const end = dtend ? icsDateToISO(dtend) : start;
      const all_day = /^\d{8}$/.test(dtstart) || dtstart.length === 8;
      events.push({
        id: uid || Math.random().toString(36).slice(2),
        title: summary || '(no title)',
        start, end, all_day,
        location, description,
        attendees: [],
        source: { provider: 'ics', connection_id: '', raw_id: uid }
      });
    }
    return events;
  }
  function icsDateToISO(s){
    // 20260421T143000Z  OR 20260421T143000  OR 20260421
    const m = s.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?Z?$/);
    if (!m) return s;
    if (!m[4]) return `${m[1]}-${m[2]}-${m[3]}`;
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  }

  // ─── PKCE helpers ─────────────────────────────────────────────────────
  function randomVerifier(){
    const b = new Uint8Array(32); crypto.getRandomValues(b);
    return b64url(b);
  }
  async function pkceChallenge(verifier){
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return b64url(new Uint8Array(digest));
  }
  function b64url(bytes){
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  // ─── Unified fetchEvents dispatcher ───────────────────────────────────
  async function fetchEvents(conn, rangeStart, rangeEnd){
    try {
      let events = [];
      if (conn.provider === 'google') events = await googleFetchEvents(conn, rangeStart, rangeEnd);
      else if (conn.provider === 'microsoft') events = await microsoftFetchEvents(conn, rangeStart, rangeEnd);
      else if (conn.provider === 'ics') events = await icsFetchEvents(conn, rangeStart, rangeEnd);
      else throw new Error('unsupported_provider:' + conn.provider);
      upsert({ ...conn, status: 'connected', last_sync_at: Date.now() });
      return events;
    } catch(err) {
      upsert({ ...conn, status: 'degraded', last_sync_error: String(err).slice(0,200) });
      throw err;
    }
  }

  // Fetch events across ALL connected calendars (for Daily Ops briefing)
  async function fetchAllEvents(rangeStart, rangeEnd){
    const cals = list().filter(c => c.status !== 'disconnected');
    const out = [];
    for (const c of cals) {
      try { (await fetchEvents(c, rangeStart, rangeEnd)).forEach(e => out.push({ ...e, source: { ...e.source, connection_id: c.id, calendar_name: c.name } })); }
      catch(_){ /* keep going — individual connection errors don't halt the briefing */ }
    }
    out.sort((a,b) => new Date(a.start) - new Date(b.start));
    return out;
  }

  // ─── Public API ────────────────────────────────────────────────────────
  window.sdCalendar = {
    list, upsert, remove, randomId,
    googleConnect, microsoftConnect,
    fetchEvents, fetchAllEvents,
    parseICS
  };
})();
