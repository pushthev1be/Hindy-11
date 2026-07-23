/* ============================================================
   Hindy-eleven — community submissions
   Three widgets, all opt-in via data attributes:
     [data-events-live]      append approved submitted events to a list
     [data-photos="<slug>"]  approved gallery + upload form for an event
     [data-submit-event]     the "list an event" form
   Nothing a visitor submits appears until an admin approves it.
   ============================================================ */
(function(){
  "use strict";

  const SUPABASE_URL = "https://iixdwdrraellcsnxnifb.supabase.co";
  const SUPABASE_KEY = "sb_publishable_6HzNYHjLE9zTguF-DCpHmg_2tcVBlYa";
  const PUBLIC_PHOTOS = SUPABASE_URL + "/storage/v1/object/public/event-photos/";
  const PENDING_BUCKET = SUPABASE_URL + "/storage/v1/object/event-photos-pending/";

  const MAX_BYTES = 10 * 1024 * 1024;
  const OK_TYPES = /^image\/(jpeg|png|webp|avif)$/;

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

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function parts(iso){
    const d = new Date(iso);
    return {
      day: String(d.getDate()).padStart(2, "0"),
      mon: MONTHS[d.getMonth()],
      long: d.toLocaleString(undefined, {
        weekday:"long", year:"numeric", month:"long", day:"numeric",
        hour:"numeric", minute:"2-digit"
      })
    };
  }

  /* The same cutoff the database uses, so nothing lands in both
     sections or neither. Mirrors: starts_at > now() - interval '1 day'. */
  const DAY = 24 * 60 * 60 * 1000;
  function isPast(iso){ return new Date(iso).getTime() <= Date.now() - DAY; }

  function href(ev){
    return ev.page_url || ("event.html?slug=" + encodeURIComponent(ev.slug));
  }

  /* One row, used for both the upcoming list and the archive. */
  function eventRow(ev, past){
    const p = parts(ev.starts_at);
    const link = href(ev);
    const row = document.createElement("article");
    row.className = "event hover-lift" + (past ? " is-past" : "");
    row.dataset.slug = ev.slug;
    row.dataset.date = ev.starts_at;

    const shots = past
      ? (ev.photo_count
          ? '<a class="event-link" href="gallery.html?event=' +
            encodeURIComponent(ev.slug) + '">' + ev.photo_count +
            (ev.photo_count === 1 ? ' photo' : ' photos') + ' →</a>'
          : '')
      : '<div data-rsvp="' + esc(ev.slug) + '" data-rsvp-mode="badge"></div>';

    row.innerHTML =
      '<div class="date"><b>' + p.day + '</b><span>' + p.mon + '</span></div>' +
      '<div class="event-body">' +
        '<h3><a href="' + esc(link) + '">' + esc(ev.title) + '</a></h3>' +
        (ev.blurb ? '<p>' + esc(ev.blurb) + '</p>' : '') +
        '<div class="where">' +
          esc([ev.venue, ev.address].filter(Boolean).join(" · ") || "Indianapolis") +
        '</div>' +
        '<div class="event-foot">' +
          '<a class="event-link" href="' + esc(link) + '">Details →</a>' +
          (past ? '<a class="share-cta" href="' + esc(link) +
                  '#photos">Share pictures from this event →</a>' : '') +
        '</div>' +
      '</div>' +
      '<div class="event-aside">' +
        '<div class="event-going">' + shots + '</div>' +
        '<div class="event-media"><img class="ph-logo" src="assets/logo-tile.png" alt="" loading="lazy"></div>' +
      '</div>';
    return row;
  }

  /* ---------- The Scene: upcoming, plus an archive underneath ---------- */
  function liveEvents(host){
    const pastHost = document.querySelector("[data-past-events]");
    const pastHead = document.querySelector("[data-past-head]");

    // Every slug already hand-written into the page, counted once and
    // reused for both lists so nothing gets appended twice.
    const existing = new Set(
      Array.from(document.querySelectorAll("[data-slug]")).map((el) => el.dataset.slug)
    );

    // Move any static row whose date has passed into the archive.
    if(pastHost){
      Array.from(host.querySelectorAll(".event[data-date]")).forEach((row) => {
        if(!isPast(row.dataset.date)) return;
        row.classList.add("is-past");
        const foot = row.querySelector(".event-foot");
        if(foot && !foot.querySelector(".share-cta")){
          const a = document.createElement("a");
          a.className = "share-cta";
          const link = row.querySelector("h3 a");
          a.href = (link ? link.getAttribute("href") : "#") + "#photos";
          a.textContent = "Share pictures from this event →";
          foot.appendChild(a);
        }
        pastHost.appendChild(row);
      });
    }

    Promise.all([
      rpc("get_events").catch(() => []),
      pastHost ? rpc("get_past_events").catch(() => []) : Promise.resolve([])
    ]).then(([upcoming, past]) => {
      (upcoming || []).forEach((ev) => {
        if(existing.has(ev.slug)) return;
        existing.add(ev.slug);
        host.appendChild(eventRow(ev, false));
      });

      if(pastHost){
        (past || []).forEach((ev) => {
          if(existing.has(ev.slug)) return;
          existing.add(ev.slug);
          pastHost.appendChild(eventRow(ev, true));
        });
        const any = pastHost.querySelector(".event");
        pastHost.hidden = !any;
        if(pastHead) pastHead.hidden = !any;
      }

      // rsvp.js has already run, so let it pick up the new widgets.
      document.dispatchEvent(new CustomEvent("hindy:refresh"));
    });
  }

  /* ---------- Photo gallery + upload ---------- */
  function photos(host){
    const slug = host.getAttribute("data-photos");
    const when = host.getAttribute("data-event-date");
    const over = when ? isPast(when) : false;
    host.id = host.id || "photos";

    const gallery = document.createElement("div");
    gallery.className = "gallery";
    const empty = document.createElement("p");
    empty.className = "gallery-empty";
    empty.textContent = over
      ? "No photos yet — yours could be the first."
      : "No photos yet — check back after the night.";

    // Once the event is over, the section leads with the invitation.
    host.innerHTML = over
      ? '<div class="share-banner">' +
          '<h2>Were you there?</h2>' +
          '<p>Share your pictures from this event — we\'ll add them to the gallery.</p>' +
        '</div>' +
        '<div class="gallery-head">' +
          '<h2>From the night</h2><span class="gallery-count"></span>' +
        '</div>'
      : '<div class="gallery-head">' +
          '<h2>From the night</h2><span class="gallery-count"></span>' +
        '</div>';
    host.appendChild(gallery);
    host.appendChild(empty);

    const count = host.querySelector(".gallery-count");

    function load(){
      rpc("get_event_photos", { p_slug: slug }).then((rows) => {
        gallery.innerHTML = "";
        const list = rows || [];
        empty.hidden = list.length > 0;
        count.textContent = list.length
          ? list.length + (list.length === 1 ? " photo" : " photos") : "";
        list.forEach((ph) => {
          const fig = document.createElement("figure");
          fig.className = "shot";
          fig.innerHTML =
            '<img loading="lazy" src="' + PUBLIC_PHOTOS + encodeURI(ph.path) + '" alt="' +
              esc(ph.caption || ("Photo from " + slug)) + '">' +
            (ph.caption || ph.submitted_by
              ? '<figcaption>' + esc(ph.caption || "") +
                (ph.submitted_by ? '<span class="shot-by">' + esc(ph.submitted_by) + '</span>' : '') +
                '</figcaption>'
              : '');
          gallery.appendChild(fig);
        });
      }).catch(() => { empty.textContent = "Couldn't load photos."; });
    }
    load();

    // Upload form
    const form = document.createElement("form");
    form.className = "shot-form";
    form.noValidate = true;
    form.innerHTML =
      '<label class="shot-field" for="shot-' + slug + '">' +
        '<input id="shot-' + slug + '" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple>' +
        '<span class="shot-face">' +
          '<span class="shot-icon" aria-hidden="true">＋</span>' +
          '<span class="shot-text"><b>Add your photos</b>' +
          '<small>JPG, PNG or WebP · up to 10 MB each · reviewed before they appear</small></span>' +
        '</span>' +
      '</label>' +
      '<div class="shot-extra" hidden>' +
        '<input class="shot-input" name="caption" type="text" maxlength="140" placeholder="Caption (optional)">' +
        '<input class="shot-input" name="by" type="text" maxlength="60" placeholder="Your name (optional)">' +
        '<button class="shot-btn" type="submit">Send for review →</button>' +
      '</div>' +
      '<p class="shot-msg" role="status" aria-live="polite"></p>';
    host.appendChild(form);

    const file = form.querySelector('input[type=file]');
    const extra = form.querySelector(".shot-extra");
    const msg = form.querySelector(".shot-msg");
    const btn = form.querySelector(".shot-btn");
    const label = form.querySelector(".shot-text b");

    file.addEventListener("change", () => {
      const n = file.files ? file.files.length : 0;
      extra.hidden = n === 0;
      label.textContent = n ? (n + (n === 1 ? " photo selected" : " photos selected"))
                            : "Add your photos";
      msg.textContent = "";
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const files = Array.from(file.files || []);
      if(!files.length){ msg.textContent = "Pick at least one photo."; return; }

      for(const f of files){
        if(!OK_TYPES.test(f.type)){
          msg.textContent = f.name + " isn't a JPG, PNG or WebP."; return;
        }
        if(f.size > MAX_BYTES){
          msg.textContent = f.name + " is over 10 MB."; return;
        }
      }

      const caption = form.caption.value.trim();
      const by = form.by.value.trim();
      btn.disabled = true;
      btn.textContent = "Uploading…";
      msg.textContent = "";

      let done = 0;
      const step = (f) => {
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const key = slug + "/" + Date.now() + "-" +
                    Math.random().toString(36).slice(2, 9) + "." + ext;
        return fetch(PENDING_BUCKET + key, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY,
            "Content-Type": f.type,
            "x-upsert": "false"
          },
          body: f
        }).then((res) => {
          if(!res.ok) throw new Error("Upload failed for " + f.name);
          return rpc("submit_photo", {
            p_slug: slug, p_path: key,
            p_caption: caption, p_submitted_by: by
          });
        }).then(() => { done++; });
      };

      files.reduce((chain, f) => chain.then(() => step(f)), Promise.resolve())
        .then(() => {
          form.innerHTML =
            '<p class="shot-done">Thank you — ' + done +
            (done === 1 ? " photo is" : " photos are") +
            ' with the editors. They\'ll appear here once approved.</p>';
        })
        .catch((err) => {
          btn.disabled = false;
          btn.textContent = "Send for review →";
          msg.textContent = err.message || "Couldn't upload. Try again.";
        });
    });
  }

  /* ---------- "List an event" form ---------- */
  function submitEvent(form){
    const msg = form.querySelector(".le-msg");
    const btn = form.querySelector("button[type=submit]");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = form.title.value.trim();
      const date = form.date.value;
      const time = form.time.value || "20:00";
      const email = form.email.value.trim();

      if(title.length < 3){ msg.textContent = "Give the event a title."; return; }
      if(!date){ msg.textContent = "Pick a date."; return; }
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
        msg.textContent = "Leave a valid contact email."; return;
      }

      // Interpreted in the visitor's own timezone, which for this
      // audience is Indiana in practice.
      const startsAt = new Date(date + "T" + time);
      if(isNaN(startsAt)){ msg.textContent = "That date doesn't look right."; return; }

      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = "Sending…";
      msg.textContent = "";

      rpc("submit_event", {
        p_title: title,
        p_blurb: form.blurb.value.trim(),
        p_starts_at: startsAt.toISOString(),
        p_venue: form.venue.value.trim(),
        p_address: form.address.value.trim(),
        p_ages: form.ages.value.trim(),
        /* The RPC still expects the param, but the site doesn't do ticketing. */
        p_ticket_url: "",
        p_submitted_by: form.by.value.trim(),
        p_contact_email: email
      }).then(() => {
        form.innerHTML =
          '<p class="le-done">Got it — your event is with the editors. ' +
          'We\'ll be in touch at ' + esc(email) + ' if we need anything, ' +
          'and it appears on The Scene once approved.</p>';
      }).catch((err) => {
        btn.disabled = false;
        btn.textContent = original;
        msg.textContent = err.message || "Couldn't send that. Try again.";
      });
    });
  }

  /* ---------- newsletter signup ---------- */
  function newsletter(form){
    const msg = form.parentElement.querySelector(".letter-msg");
    const btn = form.querySelector("button");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
        if(msg) msg.textContent = "Leave a valid email address."; return;
      }
      btn.disabled = true;
      rpc("subscribe_newsletter", { p_email: email })
        .then(() => {
          form.hidden = true;
          if(msg) msg.textContent = "You're on the list — new events land in your inbox.";
        })
        .catch((err) => {
          btn.disabled = false;
          if(msg) msg.textContent = err.message || "Couldn't subscribe. Try again.";
        });
    });
  }

  /* event.html builds its widgets after an async lookup, which can land
     after DOMContentLoaded — so scanning has to be repeatable. */
  function scan(){
    const list = document.querySelector("[data-events-live]:not([data-live-ready])");
    if(list){ list.dataset.liveReady = "1"; liveEvents(list); }

    document.querySelectorAll("[data-photos]:not([data-photos-ready])")
      .forEach((el) => { el.dataset.photosReady = "1"; photos(el); });

    const le = document.querySelector("[data-submit-event]:not([data-le-ready])");
    if(le){ le.dataset.leReady = "1"; submitEvent(le); }

    const nl = document.querySelector("[data-newsletter]:not([data-nl-ready])");
    if(nl){ nl.dataset.nlReady = "1"; newsletter(nl); }
  }

  document.addEventListener("DOMContentLoaded", scan);
  document.addEventListener("hindy:refresh", scan);
})();
