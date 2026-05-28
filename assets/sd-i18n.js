/**
 * SourceDeck — Site-wide i18n / language switcher
 *
 * Single shared script that:
 *   - reads ?lang=en|es (query param wins) then localStorage["site.language"]
 *   - translates text nodes + key attributes via the dictionary in sd-i18n-dict.js
 *   - injects an EN / ES switcher into the footer (or floats it if no footer)
 *   - persists choice to localStorage["site.language"]
 *   - updates <html lang>, <title>, meta description, og:* and twitter:* content
 *   - never causes a full page reload
 *
 * Source of truth for translations: window.SD_I18N (loaded from sd-i18n-dict.js).
 * Pages without sd-i18n-dict.js still get the switcher but fall back to English.
 *
 * Coverage:
 *   - text nodes inside <body> (excluding <script>, <style>, <code>, <pre>,
 *     and elements marked data-sd-i18n="skip")
 *   - attributes: placeholder, title, alt, aria-label, value (on inputs of type
 *     submit/button), content (on <meta name="description"> and the og:/twitter:
 *     family)
 *   - <title> tag
 *
 * Roundtrip safety: the first time the walker sees a node we snapshot the
 * original English string. Switching back to English restores from the
 * snapshot — never from the dictionary — so collisions between English keys
 * never cause drift.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'site.language';
  var SUPPORTED = ['en', 'es'];
  var DEFAULT_LANG = 'en';

  // -------- language resolution --------
  function getQueryLang() {
    try {
      var p = new URLSearchParams(window.location.search);
      var v = (p.get('lang') || '').toLowerCase();
      return SUPPORTED.indexOf(v) !== -1 ? v : null;
    } catch (e) { return null; }
  }
  function getStoredLang() {
    try {
      var v = (localStorage.getItem(STORAGE_KEY) || '').toLowerCase();
      return SUPPORTED.indexOf(v) !== -1 ? v : null;
    } catch (e) { return null; }
  }
  function setStoredLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }
  function resolveInitialLang() {
    return getQueryLang() || getStoredLang() || DEFAULT_LANG;
  }

  // -------- dictionary access --------
  // Normalize a lookup string so dict keys can be written with plain ASCII
  // apostrophes, plain double-quotes, and single spaces. The DOM often
  // contains smart quotes ("’") and &nbsp; ( ) which would otherwise miss.
  function normalizeKey(s) {
    return s
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/–/g, '-')      // en dash (we keep em dash — as-is — many keys use it)
      .replace(/ /g, ' ')      // non-breaking space
      .replace(/\s+/g, ' ')
      .trim();
  }

  // The dictionary itself may be authored with smart quotes too; build a
  // normalized lookup table once per dict reference.
  var _dictNormalized = null;
  var _dictSource = null;
  function dict() {
    return (window.SD_I18N && window.SD_I18N.es) || {};
  }
  function normalizedDict() {
    var d = dict();
    if (_dictSource === d && _dictNormalized) return _dictNormalized;
    var out = Object.create(null);
    for (var k in d) {
      if (!Object.prototype.hasOwnProperty.call(d, k)) continue;
      out[normalizeKey(k)] = d[k];
    }
    _dictSource = d;
    _dictNormalized = out;
    return out;
  }

  function lookup(originalEnglish) {
    if (!originalEnglish) return originalEnglish;
    var trimmed = originalEnglish.trim();
    if (!trimmed) return originalEnglish;
    var key = normalizeKey(trimmed);
    var d = normalizedDict();
    if (Object.prototype.hasOwnProperty.call(d, key)) {
      // preserve original surrounding whitespace
      var leading = originalEnglish.match(/^\s*/)[0];
      var trailing = originalEnglish.match(/\s*$/)[0];
      return leading + d[key] + trailing;
    }
    return originalEnglish;
  }

  // -------- snapshots (original English text per node/attr) --------
  var TEXT_SNAPSHOT = new WeakMap(); // textNode -> originalString
  var ATTR_SNAPSHOTS = new WeakMap(); // element  -> { attrName: originalString }

  function snapTextOnce(node) {
    if (!TEXT_SNAPSHOT.has(node)) TEXT_SNAPSHOT.set(node, node.nodeValue);
    return TEXT_SNAPSHOT.get(node);
  }
  function snapAttrOnce(el, attr) {
    var bag = ATTR_SNAPSHOTS.get(el);
    if (!bag) { bag = {}; ATTR_SNAPSHOTS.set(el, bag); }
    if (!Object.prototype.hasOwnProperty.call(bag, attr)) {
      bag[attr] = el.getAttribute(attr);
    }
    return bag[attr];
  }

  // -------- DOM walk --------
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, PRE: 1, TEXTAREA: 1, TEMPLATE: 1 };
  var TRANSLATABLE_ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];

  function shouldSkipElement(el) {
    if (!el || el.nodeType !== 1) return true;
    if (SKIP_TAGS[el.tagName]) return true;
    if (el.getAttribute && el.getAttribute('data-sd-i18n') === 'skip') return true;
    if (el.closest && el.closest('[data-sd-i18n="skip"]')) return true;
    if (el.id === 'sd-lang-switcher' || (el.closest && el.closest('#sd-lang-switcher'))) return true;
    return false;
  }

  function applyToTextNode(node, lang) {
    var orig = snapTextOnce(node);
    if (!orig || !orig.trim()) return;
    node.nodeValue = lang === 'en' ? orig : lookup(orig);
  }

  function applyToAttr(el, attr, lang) {
    if (!el.hasAttribute(attr)) return;
    var orig = snapAttrOnce(el, attr);
    if (!orig || !orig.trim()) return;
    el.setAttribute(attr, lang === 'en' ? orig : lookup(orig));
  }

  function walk(root, lang) {
    if (!root) return;
    if (root.nodeType === 3) { // text
      var parent = root.parentNode;
      if (parent && !shouldSkipElement(parent)) applyToTextNode(root, lang);
      return;
    }
    if (root.nodeType !== 1) return;
    if (shouldSkipElement(root)) return;

    // translatable attrs
    for (var i = 0; i < TRANSLATABLE_ATTRS.length; i++) {
      applyToAttr(root, TRANSLATABLE_ATTRS[i], lang);
    }
    // input value (only on submit / button types)
    if (root.tagName === 'INPUT') {
      var t = (root.getAttribute('type') || 'text').toLowerCase();
      if (t === 'submit' || t === 'button' || t === 'reset') {
        applyToAttr(root, 'value', lang);
      }
    }

    // recurse
    var child = root.firstChild;
    while (child) {
      var next = child.nextSibling;
      walk(child, lang);
      child = next;
    }
  }

  function applyHeadMeta(lang) {
    // <title>
    var titleEl = document.querySelector('head > title');
    if (titleEl && titleEl.firstChild) {
      applyToTextNode(titleEl.firstChild, lang);
    } else if (titleEl) {
      var orig = titleEl.textContent || '';
      if (!TEXT_SNAPSHOT.has(titleEl)) TEXT_SNAPSHOT.set(titleEl, orig);
      var snap = TEXT_SNAPSHOT.get(titleEl);
      titleEl.textContent = lang === 'en' ? snap : lookup(snap);
    }
    // meta content fields
    var metas = document.querySelectorAll(
      'meta[name="description"],meta[name="twitter:title"],meta[name="twitter:description"],' +
      'meta[property="og:title"],meta[property="og:description"]'
    );
    metas.forEach(function (m) { applyToAttr(m, 'content', lang); });
  }

  // -------- switcher UI --------
  function ensureSwitcherStyle() {
    if (document.getElementById('sd-lang-switcher-style')) return;
    var s = document.createElement('style');
    s.id = 'sd-lang-switcher-style';
    s.textContent =
      '#sd-lang-switcher{display:inline-flex;align-items:center;gap:0;padding:3px;' +
      'border-radius:980px;background:rgba(255,255,255,.05);' +
      'border:.5px solid rgba(255,255,255,.12);font:500 11.5px/1 "Inter",system-ui,sans-serif;' +
      'margin:14px auto 0;color:rgba(245,245,247,.7)}' +
      '#sd-lang-switcher button{appearance:none;background:transparent;border:0;' +
      'color:inherit;font:inherit;padding:6px 12px;border-radius:980px;cursor:pointer;' +
      'letter-spacing:.02em;transition:background .15s,color .15s}' +
      '#sd-lang-switcher button:hover{color:#fff}' +
      '#sd-lang-switcher button[aria-pressed="true"]{background:rgba(255,255,255,.12);color:#fff}' +
      '#sd-lang-switcher button:focus-visible{outline:2px solid #d4a843;outline-offset:2px}' +
      '#sd-lang-switcher-wrap{text-align:center;padding:10px 16px 18px;position:relative;z-index:1}' +
      '#sd-lang-switcher-wrap.sd-lang-floating{position:fixed;right:14px;bottom:14px;' +
      'padding:0;z-index:300;background:rgba(0,0,0,.78);border-radius:980px;' +
      'backdrop-filter:blur(8px);border:.5px solid rgba(255,255,255,.14)}' +
      '#sd-lang-switcher-wrap.sd-lang-floating #sd-lang-switcher{margin:3px}';
    document.head.appendChild(s);
  }

  function buildSwitcher() {
    var wrap = document.createElement('div');
    wrap.id = 'sd-lang-switcher-wrap';
    wrap.setAttribute('data-sd-i18n', 'skip');
    wrap.innerHTML =
      '<div id="sd-lang-switcher" role="group" aria-label="Language">' +
      '<button type="button" data-lang="en" aria-pressed="false">EN</button>' +
      '<button type="button" data-lang="es" aria-pressed="false">ES</button>' +
      '</div>';
    return wrap;
  }

  function mountSwitcher() {
    ensureSwitcherStyle();
    if (document.getElementById('sd-lang-switcher')) return;
    var wrap = buildSwitcher();
    var foot = document.querySelector('footer');
    if (foot) {
      foot.appendChild(wrap);
    } else {
      wrap.classList.add('sd-lang-floating');
      document.body.appendChild(wrap);
    }
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-lang]');
      if (!btn) return;
      setLanguage(btn.getAttribute('data-lang'), { persist: true, updateUrl: true });
    });
    wrap.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var btns = wrap.querySelectorAll('button[data-lang]');
      var i = Array.prototype.indexOf.call(btns, document.activeElement);
      if (i === -1) return;
      var next = e.key === 'ArrowRight' ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length;
      btns[next].focus();
    });
  }

  function reflectActive(lang) {
    var btns = document.querySelectorAll('#sd-lang-switcher button[data-lang]');
    btns.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
  }

  // -------- apply / set --------
  function applyLanguage(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    document.documentElement.setAttribute('lang', lang);
    if (document.body) walk(document.body, lang);
    applyHeadMeta(lang);
    reflectActive(lang);
    // expose for debugging / other scripts
    window.__sdLang = lang;
    document.dispatchEvent(new CustomEvent('sd:language-change', { detail: { lang: lang } }));
  }

  function setLanguage(lang, opts) {
    opts = opts || {};
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    if (opts.persist) setStoredLang(lang);
    if (opts.updateUrl) {
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url);
      } catch (e) {}
    }
    applyLanguage(lang);
  }

  // -------- bootstrap --------
  function init() {
    mountSwitcher();
    var lang = resolveInitialLang();
    // If user came in with ?lang=, persist so subsequent visits remember.
    if (getQueryLang()) setStoredLang(lang);
    applyLanguage(lang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // public API
  window.sdI18n = {
    set: function (lang) { setLanguage(lang, { persist: true, updateUrl: true }); },
    get: function () { return window.__sdLang || resolveInitialLang(); },
    refresh: function () { applyLanguage(window.__sdLang || resolveInitialLang()); }
  };
})();
