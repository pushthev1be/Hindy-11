# Hindy-eleven — Launch checklist (target: Friday Jul 24, 2026)

## Blockers — must be done before going live

- [ ] **Hosting + domain.** Pick a static host (Netlify / Vercel / GitHub Pages — all free) and
      deploy. Every canonical URL, og tag, robots.txt and sitemap entry assumes
      `https://hindyeleven.com` — confirm that domain is owned and pointed at the host.
      If launching on a different domain, those URLs must be updated across all pages first.
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
- [ ] **Homepage SEO head is bare.** index.html has no canonical, og:image, or twitter tags
      (the subpages all do). music.html is missing them too. Add before launch — these control
      how links look when shared on WhatsApp.
- [ ] **Change the admin password.** The current one was shared in a chat log. Supabase
      dashboard → Authentication → Users, or ask Claude to wire a change-password flow.
- [ ] **Commit to git.** Nothing has been committed since the initial commit — commit the
      working tree before deploying so there's a restore point.

## Strongly recommended — quick wins

- [ ] **Favicon.** Browser tabs show a generic globe. The brand sheet (assets/logo-sheet.png)
      has favicon designs ready to crop; needs `<link rel="icon">` on all pages.
- [ ] **Dead links on the homepage:** wordmark links to "#" (should be index.html), and
      The Gist's "Read All" goes nowhere.
- [ ] **News cards without articles.** "New NSA Indy Leadership" and "The Northside Jollof
      Secret" have no pages behind them — write them, or remove the cards for launch.
- [ ] **Trim heavy/unused assets.** hero.png (953 KB) and balanze-diet.jpg are no longer used
      anywhere; logo-sheet.png (986 KB) is a source file, not a page asset. Remove or keep out
      of the deploy. oafest-2026.jpg (579 KB) could be compressed ~40% with no visible loss.
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
