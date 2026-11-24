(() => {
  "use strict";

  const panels = [...document.querySelectorAll(".panel")];
  const byId = new Map(panels.map((panel, i) => [panel.id, i]));
  const marks = [...document.querySelectorAll(".marks a")];
  const main = document.querySelector("main");
  const counter = document.querySelector("#current-number");
  const studioReturn = document.querySelector(".studio-return");
  const prev = document.querySelector("#prev");
  const next = document.querySelector("#next");
  const announcement = document.querySelector("#announcement");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionButton = document.querySelector(".motion-preference");
  let motionOverride = false;
  const motionEnabled = () => !reduced.matches || motionOverride;
  window.studioMotion = {enabled:motionEnabled};
  function applyMotionPreference() {
    const enabled = motionEnabled();
    document.documentElement.dataset.motion = enabled ? "on" : "off";
    motionButton.hidden = !reduced.matches;
    motionButton.textContent = enabled ? "Pause motion" : "Play motion";
    motionButton.setAttribute("aria-pressed", String(enabled));
    if (!enabled) stopTransition();
    window.dispatchEvent(new Event("studio-motion-change"));
  }
  motionButton.addEventListener("click",() => {
    motionOverride = !motionOverride;
    applyMotionPreference();
  });
  window.gsap?.ticker.lagSmoothing(0);
  let active = 0;
  let transitions = [];
  let ignoreClickUntil = 0;
  let touch = null;
  let wheelSum = 0;
  let lastWheelAt = 0;
  let wheelConsumed = false;

  const wrap = index => (index + panels.length) % panels.length;
  const room = document.querySelector("#creative-direction");
  const roomIndex = byId.get(room.id);
  const seriesWall = room.querySelector(".series-wall");
  const approachWall = room.querySelector(".approach-wall");
  const compactRoom = matchMedia("(max-width:760px),(max-aspect-ratio:4/5),(max-height:540px) and (max-width:960px)");
  const approachId = "creative-approach";
  function neighbor(step) {
    if (compactRoom.matches) {
      if (active === roomIndex) {
        if (step > 0 && room.dataset.view !== "approach") return [approachId,"Our approach"];
        if (step < 0 && room.dataset.view === "approach") return [room.id,"The series"];
      }
      if (step < 0 && active === roomIndex+1) return [approachId,"Our approach"];
    }
    const panel=panels[wrap(active+step)];
    return [panel.id,panel.dataset.name];
  }
  function showRoom(view) {
    room.dataset.view = view;
    seriesWall.inert = compactRoom.matches && view === "approach";
    approachWall.inert = compactRoom.matches && view === "series";
  }
  function follow(id,options={}) {
    const isApproach = id === approachId;
    const index = isApproach ? roomIndex : (byId.get(id) ?? 0);
    if (index === roomIndex) {
      const view = isApproach ? "approach" : "series";
      if (active === index && room.dataset.view !== view) {
        showRoom(view);
        if (options.historyEntry !== false) history.pushState(null,"","#"+id);
        updateNav();
        (isApproach ? approachWall : room.querySelector("h2")).focus({preventScroll:true});
        announcement.textContent = isApproach ? "Our approach" : "The series";
        return;
      }
      showRoom(view);
    }
    go(index,{...options,hash:id});
  }
  function stepTo(step,focus=false) {
    follow(neighbor(step)[0],{direction:step,focus});
  }

  function updateNav() {
    counter.textContent = String(active + 1).padStart(2, "0");
    studioReturn.hidden = active === 0;
    marks.forEach((mark, i) => {
      if (i === active) mark.setAttribute("aria-current", "page");
      else mark.removeAttribute("aria-current");
    });
    for (const [link, step, prefix] of [[prev,-1,"Previous"], [next,1,"Next"]]) {
      const [id,name] = neighbor(step);
      link.href = "#" + id;
      link.querySelector("span").textContent = name;
      link.setAttribute("aria-label",prefix+" section, "+name);
    }
    document.title = "Rhino House Media — " + panels[active].dataset.name;
  }

  function stopTransition() {
    main.classList.remove("cube-turn");
    for (const animation of transitions) animation.cancel();
    transitions = [];
    panels.forEach(panel => panel.classList.remove("in-transition"));
  }

  function go(index, { direction, historyEntry = true, animate = true, focus = false, hash = null } = {}) {
    if (index === active) return;
    const incoming = panels[index];
    const outgoing = panels[active];
    const distance = wrap(index - active);
    const sign = direction ?? (distance <= panels.length / 2 ? 1 : -1);
    const focusInside = outgoing.contains(document.activeElement);
    stopTransition();
    outgoing.inert = true;
    outgoing.classList.remove("is-current");
    incoming.classList.add("is-current");
    incoming.inert = false;
    active = index;
    if (historyEntry) window.history.pushState(null, "", "#" + (hash || incoming.id));
    updateNav();
    if (focus || focusInside) (incoming === room && approachWall.inert === false && seriesWall.inert ? approachWall : incoming.querySelector("h1,h2")).focus({preventScroll:true});
    else announcement.textContent = incoming.dataset.name + ", " + (active + 1) + " of " + panels.length;

    if (!animate || !motionEnabled()) return;
    outgoing.classList.add("in-transition");
    if ((incoming.id === "studio" || outgoing.id === "studio") && window.gsap && outgoing.animate) {
      main.classList.add("cube-turn");
      const radius = main.clientWidth / 2;
      const ease = window.gsap.parseEase("power2.inOut");
      // Bake the GSAP turn onto the compositor so an expensive scene frame cannot stall navigation.
      const frames = entering => Array.from({length:41},(_,i) => {
        const offset=i/40;
        const progress=ease(offset);
        const degrees=sign*(entering ? 90*(1-progress) : -90*progress);
        const dolly=-radius*.44*Math.sin(Math.PI*progress);
        return {offset,transform:"translateZ("+(dolly-radius)+"px) rotateY("+degrees+"deg) translateZ("+radius+"px)"};
      });
      const options={duration:940,easing:"linear",fill:"both"};
      transitions=[outgoing.animate(frames(false),options),incoming.animate(frames(true),options)];
      const entering=transitions[1];
      entering.onfinish=() => { if (transitions.includes(entering)) stopTransition(); };
      return;
    }
    if (!outgoing.animate) { stopTransition(); return; }
    const options = {duration:530, easing:"cubic-bezier(.34,.02,.16,1)", fill:"both"};
    const leave = outgoing.animate([{transform:"translateX(0)"},{transform:"translateX(" + (-sign * 100) + "%)"}], options);
    const enter = incoming.animate([{transform:"translateX(" + (sign * 100) + "%)"},{transform:"translateX(0)"}], options);
    transitions = [leave, enter];
    enter.onfinish = () => {
      if (transitions.includes(enter)) stopTransition();
    };
  }

  document.addEventListener("click", event => {
    if (performance.now() < ignoreClickUntil && event.detail) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const link = event.target.closest("[data-go],#prev,#next");
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const id = link.hash.slice(1);
    if (!byId.has(id) && id !== approachId) return;
    event.preventDefault();
    const direction = link === next ? 1 : link === prev ? -1 : undefined;
    follow(id, {direction,focus:event.detail === 0});
  }, true);

  window.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.target.matches("input,textarea,select,[contenteditable=true]")) return;
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step) {
      event.preventDefault();
      if (!event.repeat) stepTo(step,true);
    }
  });

  const touchArea = document.body;
  touchArea.addEventListener("touchstart", event => {
    if (event.touches.length !== 1) { touch = null; return; }
    const point = event.changedTouches[0];
    touch = {x:point.clientX,y:point.clientY,id:point.identifier};
  }, {passive:true});
  touchArea.addEventListener("touchcancel", () => { touch = null; }, {passive:true});
  touchArea.addEventListener("touchend", event => {
    if (!touch) return;
    const point = [...event.changedTouches].find(item => item.identifier === touch.id);
    if (!point) return;
    const dx = point.clientX - touch.x, dy = point.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    const step = dx < 0 ? 1 : -1;
    ignoreClickUntil = performance.now() + 420;
    stepTo(step);
  }, {passive:true});

  window.addEventListener("wheel", event => {
    if (event.ctrlKey || event.metaKey) return;
    const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
    if (!dx || (!event.shiftKey && Math.abs(dx) <= Math.abs(event.deltaY) * 1.25)) return;
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheelAt > 190) { wheelSum = 0; wheelConsumed = false; }
    lastWheelAt = now;
    if (wheelConsumed) return;
    wheelSum += dx * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerWidth : 1);
    if (Math.abs(wheelSum) < 42) return;
    const step = Math.sign(wheelSum);
    wheelConsumed = true;
    stepTo(step);
  }, {passive:false});

  const restore = () => follow(location.hash.slice(1), {historyEntry:false});
  compactRoom.addEventListener("change", () => { showRoom(room.dataset.view || "series");updateNav(); });
  window.addEventListener("popstate", restore);
  window.addEventListener("hashchange", restore);
  reduced.addEventListener("change", () => { motionOverride=false;applyMotionPreference(); });
  applyMotionPreference();
  showRoom("series");
  follow(location.hash.slice(1), {historyEntry:false,animate:false});
  updateNav();

  document.querySelector("#copy-email").addEventListener("click", async () => {
    const address = document.querySelector(".address");
    const status = document.querySelector(".copy-status");
    try {
      await navigator.clipboard.writeText(address.textContent.trim());
      status.textContent = "Email address copied.";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(address);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = "Email selected. Use Copy to save it.";
    }
  });
})();
