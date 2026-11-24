(() => {
  const panel = document.querySelector('#contact');
  const scene = panel.querySelector('.contact-negative');
  let touchStart = null;

  function shift(x, y) {
    scene.style.setProperty('--look-x', Math.max(-6, Math.min(6, x)) + 'px');
    scene.style.setProperty('--look-y', Math.max(-4, Math.min(4, y)) + 'px');
  }

  function reset() {
    touchStart = null;
    shift(0, 0);
  }

  panel.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') touchStart = [event.clientX, event.clientY];
  }, {passive:true});

  panel.addEventListener('pointermove', event => {
    if (!window.studioMotion.enabled()) return;
    if (event.pointerType === 'mouse') {
      const bounds = panel.getBoundingClientRect();
      shift(12 * ((event.clientX - bounds.left) / bounds.width - .5),
            8 * ((event.clientY - bounds.top) / bounds.height - .5));
    } else if (touchStart) {
      shift((event.clientX - touchStart[0]) * .16, (event.clientY - touchStart[1]) * .16);
    }
  }, {passive:true});

  for (const type of ['pointerleave', 'pointerup', 'pointercancel']) {
    panel.addEventListener(type, reset, {passive:true});
  }
  window.addEventListener('studio-motion-change', reset);
  new MutationObserver(() => {
    if (!panel.classList.contains('is-current')) reset();
  }).observe(panel, {attributes:true, attributeFilter:['class']});
})();
