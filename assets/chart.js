/* ============================================================
   Hindy-eleven — Hindy Billboard (Supabase, no dependencies)
   Same access pattern as rsvp.js: publishable key + RLS-locked
   table, all reads/writes through SECURITY DEFINER RPCs.
   One vote per track per browser, remembered in localStorage.
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
      body: JSON.stringify(body || {})
    }).then(async (res) => {
      const data = await res.json().catch(() => null);
      if(!res.ok){
        const msg = (data && (data.message || data.hint)) || "Something went wrong. Try again.";
        throw new Error(msg);
      }
      return data;
    });
  }

  /* Upload cover art to the public `cover-art` bucket and hand back
     its public URL. The bucket caps size and mime type server-side too. */
  function uploadArt(file){
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = "submissions/" + Date.now() + "-" +
                Math.random().toString(36).slice(2, 9) + "." + ext;
    const endpoint = SUPABASE_URL + "/storage/v1/object/cover-art/" + key;

    return fetch(endpoint, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": file.type,
        "x-upsert": "false"
      },
      body: file
    }).then(async (res) => {
      if(!res.ok){
        const data = await res.json().catch(() => null);
        throw new Error((data && data.message) || "Couldn’t upload the cover art. Try again.");
      }
      return SUPABASE_URL + "/storage/v1/object/public/cover-art/" + key;
    });
  }

  function votedDir(id){
    try{ return localStorage.getItem("vote:" + id); }catch(e){ return null; }
  }
  function rememberVote(id, dir){
    try{ localStorage.setItem("vote:" + id, dir); }catch(e){}
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (c) => (
      { "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]
    ));
  }

  document.addEventListener("DOMContentLoaded", function(){
    const list = document.getElementById("chart-list");
    if(!list) return;
    let tracks = [];
    let playerAnim = null; // shared Lottie animation data, fetched once

    if(window.lottie){
      fetch("assets/music-player.json")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { playerAnim = data; render(); })
        .catch(() => {});
    }

    function score(t){ return t.upvotes - t.downvotes; }

    function thumbFor(t, li){
      const holder = li.querySelector(".chart-thumb");
      if(t.art_url){
        const img = document.createElement("img");
        img.src = t.art_url;
        img.alt = t.title + " cover art";
        img.loading = "lazy";
        img.addEventListener("error", () => { img.remove(); mountAnim(holder); });
        holder.appendChild(img);
      } else {
        mountAnim(holder);
      }
    }

    function mountAnim(holder){
      if(!window.lottie || !playerAnim) return; // plain tile until data arrives
      const box = document.createElement("div");
      box.className = "thumb-anim";
      holder.appendChild(box);
      lottie.loadAnimation({ container: box, renderer: "svg", loop: true, autoplay: true, animationData: playerAnim });
    }

    function render(){
      tracks.sort((a, b) => score(b) - score(a) || b.upvotes - a.upvotes);
      list.innerHTML = "";
      if(!tracks.length){
        list.innerHTML = '<li class="chart-empty">No songs yet — be the first to submit one below.</li>';
        return;
      }
      tracks.forEach((t, idx) => {
        const li = document.createElement("li");
        li.className = "chart-row";
        const dir = votedDir(t.id);
        li.innerHTML =
          '<span class="chart-rank">' + (idx + 1) + '</span>' +
          '<span class="chart-thumb" aria-hidden="true"></span>' +
          '<span class="chart-info">' +
            '<a class="chart-title" href="' + escapeHtml(t.listen_url) + '" target="_blank" rel="noopener">' +
              escapeHtml(t.title) + '</a>' +
            '<span class="chart-artist">' + escapeHtml(t.artist) +
              ' · <em>' + escapeHtml(t.platform) + '</em></span>' +
          '</span>' +
          '<span class="chart-votes">' +
            '<button class="vote-btn up' + (dir === "up" ? " voted" : "") + '" aria-label="Upvote ' + escapeHtml(t.title) + '"' + (dir ? " disabled" : "") + '>▲</button>' +
            '<b class="chart-score">' + score(t) + '</b>' +
            '<button class="vote-btn down' + (dir === "down" ? " voted" : "") + '" aria-label="Downvote ' + escapeHtml(t.title) + '"' + (dir ? " disabled" : "") + '>▼</button>' +
          '</span>';

        thumbFor(t, li);
        li.querySelector(".vote-btn.up").addEventListener("click", () => vote(t, true));
        li.querySelector(".vote-btn.down").addEventListener("click", () => vote(t, false));
        list.appendChild(li);
      });
    }

    function vote(t, up){
      if(votedDir(t.id)) return;
      rememberVote(t.id, up ? "up" : "down"); // lock immediately to stop double-taps
      rpc("vote_track", { p_track: t.id, p_up: up })
        .then((rows) => {
          const r = rows && rows[0];
          if(r){ t.upvotes = r.upvotes; t.downvotes = r.downvotes; }
          render();
        })
        .catch(() => {
          try{ localStorage.removeItem("vote:" + t.id); }catch(e){}
          render();
        });
    }

    rpc("get_chart")
      .then((rows) => { tracks = rows || []; render(); })
      .catch(() => {
        list.innerHTML = '<li class="chart-empty">Couldn’t load the chart. Refresh to try again.</li>';
      });

    // ---- Submission form ----
    const form = document.getElementById("submit-form");
    if(!form) return;
    const msg = form.querySelector(".submit-msg");
    const btn = form.querySelector("button[type=submit]");

    // Preview the chosen artwork in the drop zone.
    const artInput = form.querySelector("#art-file");
    const artField = form.querySelector(".art-field");
    if(artInput){
      artInput.addEventListener("change", function(){
        const f = artInput.files && artInput.files[0];
        const thumb = form.querySelector(".art-thumb");
        const label = form.querySelector(".art-text b");
        if(!f){
          artField.classList.remove("has-file");
          if(thumb) thumb.style.backgroundImage = "";
          if(label) label.textContent = "Upload the cover art";
          return;
        }
        artField.classList.add("has-file");
        if(label) label.textContent = f.name;
        if(thumb){
          const reader = new FileReader();
          reader.onload = () => { thumb.style.backgroundImage = 'url("' + reader.result + '")'; };
          reader.readAsDataURL(f);
        }
      });
    }

    form.addEventListener("submit", function(e){
      e.preventDefault();
      const artist = form.artist.value.trim();
      const title = form.title.value.trim();
      const url = form.url.value.trim();
      const by = form.submitted_by.value.trim();
      const file = artInput && artInput.files && artInput.files[0];

      if(!artist || !title){ msg.textContent = "Artist and song title are required."; return; }
      if(!/^https:\/\//.test(url)){ msg.textContent = "Paste a full https:// link to the song."; return; }
      if(!file){ msg.textContent = "Please choose a cover art image."; return; }
      if(!/^image\/(jpeg|png|webp|avif)$/.test(file.type)){
        msg.textContent = "Cover art must be a JPG, PNG, WebP or AVIF image."; return;
      }
      if(file.size > 5 * 1024 * 1024){
        msg.textContent = "That image is over 5 MB — please pick a smaller one."; return;
      }

      let platform = "Other";
      if(/spotify\.com/.test(url)) platform = "Spotify";
      else if(/soundcloud\.com/.test(url)) platform = "SoundCloud";
      else if(/music\.apple\.com/.test(url)) platform = "Apple Music";
      else if(/audiomack\.com/.test(url)) platform = "Audiomack";
      else if(/distrokid\.com/.test(url)) platform = "All platforms";
      else if(/youtu/.test(url)) platform = "YouTube";

      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = "Uploading…";
      msg.textContent = "";

      uploadArt(file)
        .then((artUrl) => {
          btn.textContent = "Sending…";
          return rpc("submit_track", {
            p_artist: artist, p_title: title, p_url: url,
            p_platform: platform, p_submitted_by: by, p_art_url: artUrl
          });
        })
        .then(() => {
          form.innerHTML = '<p class="submit-done">Got it! Your song is in review and will appear on the chart once approved.</p>';
        })
        .catch((err) => {
          btn.disabled = false;
          btn.textContent = original;
          msg.textContent = err.message || "Couldn’t submit. Try again.";
        });
    });
  });
})();
