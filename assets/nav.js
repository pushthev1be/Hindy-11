/* ============================================================
   Hindy-eleven — slide-out navigation
   Progressive enhancement: the header ships plain links, and
   this turns them into a right-hand panel with a hamburger.
   With JS off the links stay visible and usable.
   ============================================================ */
(function(){
  "use strict";

  document.addEventListener("DOMContentLoaded", function(){
    const header = document.querySelector(".glass-header");
    const nav = header && header.querySelector('nav[aria-label="Main"]');
    if(!nav) return;

    document.body.classList.add("has-slideout");

    // Hamburger — three dashes, becomes an X when open.
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-toggle";
    toggle.setAttribute("aria-label", "Open menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "nav-panel");
    toggle.innerHTML = '<span class="nav-bars" aria-hidden="true">' +
                       '<i></i><i></i><i></i></span>';
    header.appendChild(toggle);

    // Dim the page behind the panel.
    const scrim = document.createElement("div");
    scrim.className = "nav-scrim";
    scrim.hidden = true;
    document.body.appendChild(scrim);

    // Move the existing nav into a panel rather than rebuilding it,
    // so every page's own links (and their relative paths) survive.
    // The panel must hang off <body>, NOT the header: the header is a
    // z-index:100 stacking context, which would trap the panel beneath
    // the body-level scrim and make every link unclickable.
    const panel = document.createElement("div");
    panel.className = "nav-panel";
    panel.id = "nav-panel";
    panel.hidden = true;
    document.body.appendChild(panel);

    const head = document.createElement("div");
    head.className = "nav-panel-head";
    head.innerHTML = '<span class="nav-panel-title">Menu</span>';
    const close = document.createElement("button");
    close.type = "button";
    close.className = "nav-close";
    close.setAttribute("aria-label", "Close menu");
    close.innerHTML = "&times;";
    head.appendChild(close);

    panel.appendChild(head);
    panel.appendChild(nav);

    let open = false;
    let lastFocus = null;

    function setOpen(next){
      if(next === open) return;
      open = next;

      if(open){
        lastFocus = document.activeElement;
        panel.hidden = false;
        scrim.hidden = false;
        // Force a frame so the transition runs from the closed state.
        requestAnimationFrame(() => {
          document.body.classList.add("nav-open");
          const first = panel.querySelector("a, button");
          if(first) first.focus();
        });
      } else {
        document.body.classList.remove("nav-open");
        const done = () => {
          if(!open){ panel.hidden = true; scrim.hidden = true; }
          panel.removeEventListener("transitionend", done);
        };
        panel.addEventListener("transitionend", done);
        // Fallback when transitions are off (reduced motion).
        setTimeout(done, 320);
        if(lastFocus && lastFocus.focus) lastFocus.focus();
      }

      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    toggle.addEventListener("click", () => setOpen(!open));
    close.addEventListener("click", () => setOpen(false));
    scrim.addEventListener("click", () => setOpen(false));

    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && open) setOpen(false);
      if(e.key === "Tab" && open) trap(e);
    });

    // Following a link closes the panel (matters for same-page anchors).
    nav.addEventListener("click", (e) => {
      if(e.target.closest("a")) setOpen(false);
    });

    // Keep keyboard focus inside the panel while it's open.
    function trap(e){
      const items = panel.querySelectorAll("a[href], button:not([disabled])");
      if(!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if(e.shiftKey && document.activeElement === first){
        e.preventDefault(); last.focus();
      } else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault(); first.focus();
      }
    }

    // Mark the current page so the panel shows where you are.
    const here = location.pathname.replace(/\/$/, "/index.html");
    panel.querySelectorAll("a[href]").forEach((a) => {
      const path = a.getAttribute("href").split("#")[0];
      if(!path) return;
      const resolved = new URL(a.href).pathname.replace(/\/$/, "/index.html");
      if(resolved === here) a.setAttribute("aria-current", "page");
    });
  });
})();
