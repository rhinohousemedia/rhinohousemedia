/* Rhino House Media - interaction layer.
   Replaces the React state machine from the original build:
   binder entry, reveal observers, ambient parallax, pointer lighting. */
(function () {
  "use strict";

  var site = document.querySelector(".site");
  var shell = document.querySelector(".site-shell");
  var entrySection = document.querySelector(".binder-entry");
  var entryTarget = document.querySelector(".entry-target");
  var heading = document.querySelector(".intro h1");
  var contact = document.querySelector("[data-motion]");

  if (!site || !shell || !entryTarget) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var entered = false;
  var opening = false;
  var motionEnabled = false;
  var observersStarted = false;
  var revealObserver = null;
  var motionObserver = null;
  var parallaxHandler = null;
  var frame = 0;

  /* ---- lock the page behind the binder ---- */

  shell.inert = true;
  document.body.style.overflow = "hidden";
  entryTarget.tabIndex = 0;

  /* ---- motion preference ---- */

  function syncMotion() {
    motionEnabled = !reduceMotion.matches && "IntersectionObserver" in window;
    site.classList.toggle("motion-enabled", motionEnabled);
    if (motionEnabled) {
      startObservers();
    } else {
      stopObservers();
    }
  }

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", syncMotion);
  } else if (reduceMotion.addListener) {
    reduceMotion.addListener(syncMotion);
  }

  /* ---- reveal + ambient depth ---- */

  function startObservers() {
    if (observersStarted || !entered || !motionEnabled) return;
    observersStarted = true;

    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" }
    );
    shell.querySelectorAll("[data-reveal]").forEach(function (el) {
      revealObserver.observe(el);
    });

    motionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("motion-live", entry.isIntersecting);
        });
      },
      { rootMargin: "120px" }
    );
    shell.querySelectorAll("[data-motion]").forEach(function (el) {
      motionObserver.observe(el);
    });

    parallaxHandler = function () {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        shell.style.setProperty(
          "--depth-scroll",
          Math.min(window.scrollY * 0.065, 180) + "px"
        );
        frame = 0;
      });
    };
    window.addEventListener("scroll", parallaxHandler, { passive: true });
    parallaxHandler();
  }

  function stopObservers() {
    if (!observersStarted) return;
    observersStarted = false;
    if (revealObserver) revealObserver.disconnect();
    if (motionObserver) motionObserver.disconnect();
    if (parallaxHandler) window.removeEventListener("scroll", parallaxHandler);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    shell.style.removeProperty("--depth-scroll");
    if (contact) contact.classList.remove("motion-live");
  }

  /* ---- binder entry ---- */

  function enterSite() {
    entered = true;
    site.classList.add("entered");
    shell.inert = false;
    entrySection.setAttribute("aria-hidden", "true");
    entryTarget.tabIndex = -1;
    document.body.style.overflow = "";
    window.scrollTo(0, 0);
    startObservers();
    requestAnimationFrame(function () {
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  entryTarget.addEventListener("click", function () {
    if (opening || entered) return;
    opening = true;
    entryTarget.disabled = true;
    site.classList.add("opening");
    window.setTimeout(enterSite, reduceMotion.matches ? 20 : 1300);
  });

  /* ---- pointer lighting on metal surfaces ---- */

  function moveLight(event) {
    if (event.pointerType !== "mouse" || reduceMotion.matches) return;
    var el = event.currentTarget;
    var rect = el.getBoundingClientRect();
    var x = (event.clientX - rect.left) / rect.width;
    var y = (event.clientY - rect.top) / rect.height;
    el.style.setProperty("--light-x", x * 100 + "%");
    el.style.setProperty("--light-y", y * 100 + "%");
    el.style.setProperty("--rotate-x", (0.5 - y) * 5 + "deg");
    el.style.setProperty("--rotate-y", (x - 0.5) * 5 + "deg");
  }

  function resetLight(event) {
    var el = event.currentTarget;
    el.style.setProperty("--rotate-x", "0deg");
    el.style.setProperty("--rotate-y", "0deg");
  }

  document.querySelectorAll(".metal-panel, .platform").forEach(function (el) {
    el.addEventListener("pointermove", moveLight);
    el.addEventListener("pointerleave", resetLight);
  });

  syncMotion();
})();
