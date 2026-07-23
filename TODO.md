# Hindy-eleven — Launch checklist (target: Friday Jul 24, 2026)

## Blockers — must be done before going live

- [ ] **Hosting + domain.** Domain is `hindy.online` (Namecheap). All site URLs updated to it
      Jul 22, and a CNAME file added for GitHub Pages. Remaining manual steps:
      1. Push the repo (github.com/pushthev1be/Hindy-11)
      2. GitHub → repo Settings → Pages → deploy from branch `main`, folder `/ (root)`
      3. Namecheap Advanced DNS: **remove** the parking CNAME (www → parkingpage.namecheap.com)
         and the URL Redirect record, then **add**:
         - A record · @ · 185.199.108.153
         - A record · @ · 185.199.109.153
         - A record · @ · 185.199.110.153
         - A record · @ · 185.199.111.153
         - CNAME · www · pushthev1be.github.io.
      4. Back in GitHub Pages settings: custom domain `hindy.online`, wait for DNS check,
         tick "Enforce HTTPS" (may take ~30 min for the certificate)
- [ ] **Places page is 100% placeholder.** Five fake businesses with dead "Website →" links and
      a visible "Placeholder entries" warning. Either fill in real businesses (names, addresses,
      phones) or remove Places from the nav until it's ready. This is the future ad product —
      don't launch it looking fake.
- [ ] **Newsletter "Apply" button does nothing.** The Members / "Friday Gist" signup on the
      homepage has no handler — email addresses typed there vanish. Wire it to Supabase,
      point it at a Google Form / WhatsApp group link, or remove the section.
- [ ] **Placeholder copy on event pages.** Written-by-nobody text still live:
  - AfroWave: "Add a short preview of the night…"
  - Lagos to Jozi: same, plus the "Confirm the details" editor note
  - Independence Gala: same, plus editor note; start time and 21+ policy are unverified
  - Lagos address conflict: homepage row says "address to be confirmed", event page says
    3145 E 10th St — pick one.
- [x] **Homepage SEO head is bare.** ~~index.html has no canonical, og:image, or twitter tags~~
      Done Jul 22 — canonical/og/twitter/robots added to index.html and music.html.
- [ ] **Change the admin password.** The current one was shared in a chat log. Supabase
      dashboard → Authentication → Users, or ask Claude to wire a change-password flow.
- [x] **Commit to git.** Done Jul 22 (commit d766ba0, repo-local git identity configured).
      Commit again after the remaining content fixes, right before deploying.

## Strongly recommended — quick wins

- [x] **Favicon.** Done Jul 22 — H1 monogram cropped from the brand sheet, linked on all 16 pages.
- [x] **Dead links on the homepage:** Done Jul 22 — wordmark now links home; "Read All" removed.
- [ ] **News cards without articles.** "New NSA Indy Leadership" and "The Northside Jollof
      Secret" have no pages behind them — write them, or remove the cards for launch.
- [x] **Trim heavy/unused assets.** Done Jul 22 — hero.png, balanze-diet.jpg, social-media.json
      deleted; oafest-2026.jpg recompressed 579→463 KB. (logo-sheet.png kept as brand source.)
- [ ] **Real-phone pass.** Test on an actual phone: hamburger menu, RSVP taps, flyer slides,
      photo upload from camera roll.
- [ ] **Supabase hygiene:** run the security/performance advisors; confirm email confirmation
      setting for future editor accounts.
- [ ] **After deploy:** set `tracks.art_url` in the database to the live https image URLs so
      chart artwork is data, not code (the current artist-name fallback in chart.js keeps
      working either way).

## Launch week — post-launch (the niche plan)

- [ ] **WhatsApp share buttons** on event pages and galleries — the older generation lives on
      WhatsApp; this is the growth loop for the owambe-memories angle.
- [ ] **"Suggest a place" form** feeding the moderation queue — turns Places into the
      business-listing product.
- [ ] **Analytics** (Plausible or GA) — needed to sell businesses on advertising with real
      traffic numbers.
- [ ] **OAFEST photo drive** — after Aug 15, push the "share your pictures" flow hard; it's the
      first big gallery moment.

## Suggested schedule

- **Wed–Thu:** content fixes (event copy, Places decision, newsletter decision, SEO tags,
  favicon, dead links) — most of this Claude can do; the event blurbs and real business info
  need you.
- **Thu evening:** commit, deploy to host, point domain, change admin password.
- **Fri morning:** test everything on the live URL (RSVP, submit event, photo upload, chart
  vote, admin approve), then announce.
