/* ============================================================
   Hindy-eleven — Stories (Supabase, no dependencies)
   One file drives two pages:
     #stories-index  — the list of published episodes
     #story-reader   — a single episode, read by ?slug=
   Only episodes that are published AND whose publish_at has
   passed are ever returned, so scheduling a Monday drop is just
   setting a future date — no cron needed.
   ============================================================ */
(function(){
  "use strict";

  const SUPABASE_URL = "https://iixdwdrraellcsnxnifb.supabase.co";
  const SUPABASE_KEY = "sb_publishable_6HzNYHjLE9zTguF-DCpHmg_2tcVBlYa";

  function rpc(fn, body){
    return fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body || {})
    }).then(async (res) => {
      const data = await res.json().catch(() => null);
      if(!res.ok) throw new Error((data && (data.message || data.hint)) || "Something went wrong.");
      return data;
    });
  }

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
      { "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]
    ));
  }

  function longDate(iso){
    return new Date(iso).toLocaleDateString(undefined,
      { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  }
  function shortDate(iso){
    return new Date(iso).toLocaleDateString(undefined,
      { month:"short", day:"numeric", year:"numeric" });
  }
  function epLabel(n){ return (n || n === 0) ? "Episode " + n : "Episode"; }

  /* Plain text → paragraphs. Blank lines separate paragraphs; single
     newlines inside a paragraph become line breaks. Everything escaped. */
  function bodyHtml(text){
    return String(text || "").replace(/\r\n/g, "\n").trim()
      .split(/\n\s*\n/)
      .map((p) => "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>")
      .join("");
  }

  /* ---------- index ---------- */
  function index(host){
    rpc("get_stories").then((rows) => {
      const list = rows || [];
      if(!list.length){
        host.innerHTML =
          '<p class="loading">No episodes yet — the first one drops soon. ' +
          'Check back Monday.</p>';
        return;
      }
      host.innerHTML = "";
      const ul = document.createElement("ul");
      ul.className = "episode-list";
      list.forEach((ep) => {
        const li = document.createElement("li");
        li.className = "episode hover-lift";
        const url = "story.html?slug=" + encodeURIComponent(ep.slug);
        li.innerHTML =
          '<span class="ep-no">' + esc(epLabel(ep.episode_number)) +
            ' · ' + esc(shortDate(ep.publish_at)) + '</span>' +
          '<h2><a href="' + url + '">' + esc(ep.title) + '</a></h2>' +
          (ep.excerpt ? '<p>' + esc(ep.excerpt) + '</p>' : '') +
          '<a class="ep-read" href="' + url + '">Read this episode →</a>';
        ul.appendChild(li);
      });
      host.appendChild(ul);
    }).catch(() => {
      host.innerHTML = '<p class="loading">Couldn’t load the stories. Refresh to try again.</p>';
    });
  }

  /* ---------- reader ---------- */
  function reader(host){
    const slug = new URLSearchParams(location.search).get("slug");
    if(!slug){ notFound(host, "No episode was specified."); return; }

    Promise.all([
      rpc("get_story", { p_slug: slug }),
      rpc("get_stories").catch(() => [])
    ]).then(([rows, all]) => {
      const ep = rows && rows[0];
      if(!ep){ notFound(host, "It may have been removed, or it isn’t out yet."); return; }

      document.title = ep.title + " — Stories — Hindy-eleven";
      const desc = ep.excerpt || (epLabel(ep.episode_number) + " of the Hindy-eleven story.");
      const m = document.querySelector('meta[name=description]');
      if(m) m.setAttribute("content", desc);

      // Newest-first list → neighbours for prev/next-in-series.
      const arr = all || [];
      const i = arr.findIndex((e) => e.slug === ep.slug);
      const newer = i > 0 ? arr[i - 1] : null;         // next in the series
      const older = i >= 0 && i < arr.length - 1 ? arr[i + 1] : null; // previous

      let nav = "";
      if(newer || older){
        nav = '<nav class="ep-nav" aria-label="Episodes">' +
          (older ? '<a class="ep-prev" href="story.html?slug=' +
              encodeURIComponent(older.slug) + '"><span>← Previous episode</span><b>' +
              esc(older.title) + '</b></a>' : '<span></span>') +
          (newer ? '<a class="ep-next" href="story.html?slug=' +
              encodeURIComponent(newer.slug) + '"><span>Next episode →</span><b>' +
              esc(newer.title) + '</b></a>' : '<span></span>') +
          '</nav>';
      }

      const audio = ep.audio_url
        ? '<div class="story-audio">' +
            '<span class="story-audio-label">▶ Listen to this episode</span>' +
            '<audio controls preload="none" src="' + esc(ep.audio_url) + '"></audio>' +
          '</div>'
        : '';

      host.innerHTML =
        '<a class="back-link" href="stories.html">← All episodes</a>' +
        '<div class="article-head">' +
          '<span class="kicker">' + esc(epLabel(ep.episode_number)) +
            ' · ' + esc(longDate(ep.publish_at)) + '</span>' +
          '<h1>' + esc(ep.title) + '</h1>' +
          (ep.excerpt ? '<p class="standfirst">' + esc(ep.excerpt) + '</p>' : '') +
        '</div>' +
        audio +
        '<article class="article-body story-body">' + bodyHtml(ep.body) + '</article>' +
        nav;
    }).catch(() => notFound(host, "Something went wrong loading it. Try again shortly."));
  }

  function notFound(host, text){
    host.innerHTML =
      '<a class="back-link" href="stories.html">← All episodes</a>' +
      '<div class="article-head">' +
        '<span class="kicker">Not found</span>' +
        '<h1>We couldn’t find that episode</h1>' +
        '<p class="standfirst">' + esc(text) + '</p>' +
      '</div>' +
      '<p><a class="article-cta" href="stories.html">See all episodes →</a></p>';
  }

  document.addEventListener("DOMContentLoaded", function(){
    const idx = document.getElementById("stories-index");
    if(idx) index(idx);
    const rd = document.getElementById("story-reader");
    if(rd) reader(rd);
  });
})();
