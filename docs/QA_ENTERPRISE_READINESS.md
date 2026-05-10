# QA — Enterprise readiness

Run this checklist when shipping anything to a public marketing surface
or before sharing the site with an enterprise prospect.

## 1. Copy claims

- [ ] No "SOC 2 certified" / "HIPAA certified" / "FedRAMP authorized"
      / "CMMC certified" / "ISO 27001 certified" / "HITRUST certified".
- [ ] No "guaranteed compliance" / "zero data retention" /
      "end-to-end encrypted" unless the underlying technical control
      actually exists.
- [ ] No "production watsonx.governance" / "fully governed by watsonx"
      until live runtime association is verified
      (see `docs/IBM_WATSONX_STATUS.md`).
- [ ] No named customer logos unless verified case studies exist.
- [ ] No specific outcome metrics (e.g. "+71% retention", "$2.4M leaked
      revenue exposed") without a published case study and the
      customer's signoff.

## 2. Personal data leak check

- [ ] `grep -rnE "charlie@digiarcg|jeanmaxc|@arcg\.ai|555-906-3676|100066907957468"`
      across `*.html`, `*.js`, `*.css` (excluding `node_modules`,
      `.git`, `server`, `docs`) returns **no hits**.
- [ ] `assets/sd-config.js` `FUNNEL.sender` is `null` (workspace-configured),
      not a hard-coded email.
- [ ] `app/demo/index.html` Socials tab shows "— not configured —"
      placeholders, not real handles.
- [ ] `app/demo/index.html` and `app/downloads/sourcedeck-lcc.html`
      remain byte-identical (`cmp` exits 0).

## 3. Routes render

Static smoke test: `python3 -m http.server 8777 --bind 127.0.0.1`,
then curl every route below — all should return HTTP 200.

- [ ] `/`
- [ ] `/enterprise/`
- [ ] `/security/`
- [ ] `/compliance/`
- [ ] `/agents/`
- [ ] `/app/`
- [ ] `/app/demo/`
- [ ] `/app/downloads/sourcedeck-lcc.html`
- [ ] `/pricing/` (or `/#pricing` anchor)
- [ ] `/sw.js`
- [ ] `/site.webmanifest`
- [ ] `/sitemap.xml`

## 4. Video click does NOT redirect

- [ ] On the homepage, clicking the video frame either plays the video
      inline OR shows the inline "Walkthrough video — Coming soon"
      placeholder. It must **not** navigate to `/app/demo/` or any
      other route.

## 5. CTA flow

- [ ] Hero primary CTA = **Book Enterprise Demo** → `/enterprise/` or
      `mailto:sales@arivergrop.com`.
- [ ] Hero secondary CTA = **Join for Free** → `/app/`.
- [ ] No more than 2 CTAs above the fold.

## 6. Meta + SEO

- [ ] `<title>` matches the new positioning ("Media opportunity
      management for serious teams").
- [ ] `<meta name="description">` ~155 chars, contains keywords:
      `media opportunities`, `journalist queries`, `expert sourcing`,
      `PR teams`, `pitch tracking`, `coverage tracking`.
- [ ] `<meta property="og:title">` and `og:description` consistent
      with the page title and description.
- [ ] One H1 per page.

## 7. IBM watsonx wording

- [ ] Public pages either omit IBM/watsonx OR use one of the
      acceptable phrases in `docs/IBM_WATSONX_STATUS.md`
      (e.g. "AI features available where configured",
      "watsonx configuration pending").

## 8. IBM/Vercel/Stripe/DNS hard rule

- [ ] No commits in this PR touch IBM Cloud resources, Vercel project
      settings, Stripe webhook config, or DNS records.

## Pass criteria

All sections 1–8 green.
Any unchecked box blocks merge to `main`.
