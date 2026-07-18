/* ============================================================
   Hindy-eleven — Event RSVP (Supabase, no dependencies)
   One tap, no name or email. A visitor uuid kept in localStorage
   is the identity, so the same browser counts once per event —
   the same "one per browser" rule the chart votes use.
   The publishable key is meant to be public; the rsvps table is
   locked by RLS and only aggregate counts are ever exposed.
   ============================================================ */
(function(){
  "use strict";

  const SUPABASE_URL = "https://iixdwdrraellcsnxnifb.supabase.co";
  const SUPABASE_KEY = "sb_publishable_6HzNYHjLE9zTguF-DCpHmg_2tcVBlYa";
  const REST = SUPABASE_URL + "/rest/v1/rpc/";

  function rpc(fn, body){
    return fetch(REST + fn, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }).then(async (res) => {
      const data = await res.json().catch(() => null);
      if(!res.ok){
        const msg = (data && (data.message || data.hint)) || "Something went wrong. Try again.";
        throw new Error(msg);
      }
      return data;
    });
  }

  /* This browser's anonymous id. Generated once, then reused. */
  function visitorId(){
    let id = null;
    try { id = localStorage.getItem("visitor"); } catch(e){}
    if(!id){
      id = (crypto.randomUUID && crypto.randomUUID()) ||
           "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
             const r = Math.random() * 16 | 0;
             return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
           });
      try { localStorage.setItem("visitor", id); } catch(e){}
    }
    return id;
  }

  function goingLabel(people){
    if(!people) return "Be the first to RSVP";
    return people + (people === 1 ? " person going" : " people going");
  }

  function hasRsvpd(slug){
    try { return localStorage.getItem("rsvp:" + slug) === "1"; } catch(e){ return false; }
  }
  function remember(slug, yes){
    try {
      if(yes) localStorage.setItem("rsvp:" + slug, "1");
      else localStorage.removeItem("rsvp:" + slug);
    } catch(e){}
  }

  document.addEventListener("DOMContentLoaded", function(){
    const me = visitorId();
    const countEls = {};   // slug -> [elements showing the count]
    const buttons = {};    // slug -> [rsvp buttons]

    /* Wire up any widget not already handled. Runs once at load, and
       again whenever community.js appends events to the list. */
    function scan(){
      const fresh = Array.from(document.querySelectorAll("[data-rsvp]"))
        .filter((el) => !el.dataset.rsvpReady);
      if(!fresh.length) return;

      const slugs = [];
      fresh.forEach((el) => {
        el.dataset.rsvpReady = "1";
        const slug = el.getAttribute("data-rsvp");
        const mode = el.getAttribute("data-rsvp-mode") || "badge";
        if(slugs.indexOf(slug) === -1) slugs.push(slug);
        if(mode === "full") buildFull(el, slug);
        else buildBadge(el, slug);
      });

      // One call loads every count for this batch.
      rpc("get_event_counts", { p_slugs: slugs })
        .then((rows) => {
          const map = {};
          (rows || []).forEach((r) => { map[r.slug] = r.people; });
          slugs.forEach((s) => setCount(s, map[s] || 0));
        })
        .catch(() => { /* leave placeholder text */ });
    }

    scan();
    document.addEventListener("hindy:refresh", scan);

    function setCount(slug, people){
      (countEls[slug] || []).forEach((el) => { el.textContent = goingLabel(people); });
    }
    function register(store, slug, el){
      (store[slug] = store[slug] || []).push(el);
    }

    /* Keep every button for this event in sync — the list badge and
       the page card can both be live at once. */
    function syncButtons(slug){
      const going = hasRsvpd(slug);
      (buttons[slug] || []).forEach((b) => {
        b.classList.toggle("is-going", going);
        b.textContent = going ? "✓ You're going" : b.dataset.idle;
        b.setAttribute("aria-pressed", going ? "true" : "false");
      });
    }

    function toggle(slug, btn){
      const going = hasRsvpd(slug);
      const fn = going ? "unrsvp_anon" : "rsvp_anon";

      remember(slug, !going);   // optimistic — the tap should feel instant
      syncButtons(slug);
      (buttons[slug] || []).forEach((b) => { b.disabled = true; });

      rpc(fn, { p_slug: slug, p_visitor: me })
        .then((r) => { setCount(slug, (r && r.people) || 0); })
        .catch(() => {
          remember(slug, going); // roll back
          syncButtons(slug);
        })
        .then(() => {
          (buttons[slug] || []).forEach((b) => { b.disabled = false; });
        });
    }

    function makeButton(slug, idleLabel, className){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = className;
      btn.dataset.idle = idleLabel;
      btn.textContent = idleLabel;
      btn.addEventListener("click", () => toggle(slug, btn));
      register(buttons, slug, btn);
      return btn;
    }

    /* Compact: count + one tap. Used in the homepage event list. */
    function buildBadge(host, slug){
      host.classList.add("rsvp-badge");
      const dot = document.createElement("span");
      dot.className = "rsvp-badge-dot";
      const label = document.createElement("span");
      label.className = "rsvp-badge-count";
      label.textContent = "Loading…";
      host.appendChild(dot);
      host.appendChild(label);
      host.appendChild(makeButton(slug, "RSVP", "rsvp-tap"));
      register(countEls, slug, label);
      syncButtons(slug);
    }

    /* Full card on the event page — same one tap, more presence. */
    function buildFull(host, slug){
      host.classList.add("rsvp-card");
      host.innerHTML =
        '<div class="rsvp-top">' +
          '<h3 class="rsvp-title">Are you going?</h3>' +
          '<span class="rsvp-count" data-count>Loading…</span>' +
        '</div>' +
        '<p class="rsvp-sub">One tap. No name, no email — we just count heads.</p>' +
        '<div class="rsvp-actions"></div>';

      register(countEls, slug, host.querySelector("[data-count]"));
      host.querySelector(".rsvp-actions")
          .appendChild(makeButton(slug, "I'm going →", "rsvp-btn"));
      syncButtons(slug);
    }
  });
})();
