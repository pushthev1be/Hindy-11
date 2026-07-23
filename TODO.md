# Hindy-eleven — Launch checklist (target: Friday Jul 24, 2026)

## Blockers — must be done before going live

- [ ] **Hosting + domain.** Domain is `hindy.online` (Namecheap), hosting on **Render**.
      All site URLs updated Jul 22; repo is pushed. Remaining manual steps:
      1. render.com → New → **Static Site** → connect GitHub repo `pushthev1be/Hindy-11`,
         branch `main`, Build Command: *(leave empty)*, Publish Directory: `.`
      2. After the first deploy, Render → your site → Settings → **Custom Domains** →
         add `hindy.online` (and `www.hindy.online`)
      3. Namecheap Advanced DNS: **remove** the parking CNAME (www → parkingpage.namecheap.com)
         and the URL Redirect record, then **add**:
         - A record · Host `@` · `216.24.57.1`
         - CNAME · Host `www` · `<your-site>.onrender.com.` (Render shows the exact target
           on the Custom Domains screen)
      4. Wait for Render's domain verification — it issues the HTTPS certificate
         automatically (usually minutes after DNS propagates)
      Note: Render auto-deploys on every `git push` to main from then on.
- [x] **Places page is 100% placeholder.** Done Jul 22 — launched with 8 web-verified listings:
      Kalakutah Republic Grill, Miami's Garden (Food) · K-Arise, Victory Super Store (Market) ·
      Olas Villa, Paradox Lounge (Events) · RCCG Rod of God, RCCG Covenant House (Faith),
      with addresses and tap-to-call numbers. Growing it to a full directory (salons, tailors,
      more restaurants/markets/churches from the research list) is a post-launch task — each
      entry needs verification before publishing.
- [x] **Newsletter "Apply" button does nothing.** Done Jul 22 — subscribe form now saves to a
      locked Supabase table (validated, deduped); admin.html has a Subscribers section with a
      copy-all button (paste into BCC to send event updates). Post-launch: automate the sending
      (e.g. Resend + weekly digest) so updates go out without manual emailing.
- [x] **Placeholder copy on event pages.** Done Jul 22 — real blurbs written for AfroWave,
      Lagos to Jozi and the Gala; editor draft-notes removed; homepage Lagos row now shows
      3145 E 10th St (matching the event page's structured data).
      Still worth a human double-check with the organizers: Lagos to Jozi's address, and the
      Gala's start time / 21+ policy (they were seeded as best-guesses).
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

## Stories serial (added Jul 23)

- Stories tab live: `stories.html` (index) + `story.html` (reader), backed by a locked
  `stories` table. Compose/edit/publish from admin.html's "Post a story" section.
- Weekly Monday cadence: write the episode, set the publish date to the coming Monday, tick
  Published — it goes live automatically that day (public RPC only returns published episodes
  whose publish_at has passed; no cron needed). Leave Published unticked to keep a draft.
- Body is plain text: blank line = new paragraph. Slugs auto-generate from episode # + title.
- Optional next: feature the latest episode on the homepage; email subscribers when a new
  episode drops (ties into the newsletter list).

### Voice narration (Google Cloud TTS) — ONE activation step left
- Built: audio_url on stories, public `story-audio` bucket, a `generate-story-audio` Edge
  Function (holds the Google key server-side, chunks long episodes, uploads the MP3),
  a "Generate audio" button per episode in admin, and a Listen player on the reader.
- Verified: auth gate works (401 unauth), admin call reaches Google step. Only the key is missing.
- **TO ACTIVATE (yours):**
  1. Google Cloud Console → create/select a project → enable **Cloud Text-to-Speech API** →
     APIs & Services → Credentials → Create credentials → **API key**. (Restrict it to the
     Text-to-Speech API.) Free tier: ~1M Neural2 chars/month — well beyond weekly episodes.
  2. Supabase dashboard → Project → Edge Functions → **Manage secrets** → add
     `GOOGLE_TTS_API_KEY` = your key. (Optional: `STORY_TTS_VOICE`, default `en-US-Neural2-D`.)
  3. In admin, open any episode → **Generate audio**. The Listen bar then appears on that
     episode's page. Send me the word once the key's in and I'll generate + verify the first one.

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
