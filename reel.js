(() => {
  const track = document.querySelector('.film-track');
  const frames = [...track.querySelectorAll('img')];
  const previous = document.querySelector('#reel-prev');
  const next = document.querySelector('#reel-next');
  const start = i => frames[i].offsetLeft - frames[0].offsetLeft;
  function current() {
    return frames.reduce((best, _, i) =>
      Math.abs(start(i) - track.scrollLeft) < Math.abs(start(best) - track.scrollLeft) ? i : best, 0);
  }
  function sync() {
    previous.disabled = current() === 0;
    next.disabled = current() === frames.length - 1;
  }
  function move(step) {
    const i = Math.max(0, Math.min(frames.length - 1, current() + step));
    track.scrollTo({left:start(i), behavior:window.studioMotion.enabled() ? 'smooth' : 'instant'});
  }
  previous.onclick = () => move(-1);
  next.onclick = () => move(1);
  track.addEventListener('scroll', sync, {passive:true});
  new ResizeObserver(sync).observe(track);
  for (const type of ['touchstart','touchend','wheel']) {
    track.addEventListener(type, event => event.stopPropagation(), {passive:true});
  }
  track.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    move(event.key === 'ArrowRight' ? 1 : -1);
  });
  const read = document.querySelector('.reel-read');
  read.onclick = () => {
    const second = read.closest('.reel-layout').classList.toggle('read-second');
    read.textContent = second ? 'Back to opening' : 'Read on';
  };
  sync();
})();
