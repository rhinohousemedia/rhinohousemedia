const video = document.getElementById('main-video');
const clickLayer = document.getElementById('click-layer');

// Create unmute button
const unmuteBtn = document.createElement('div');
unmuteBtn.id = 'unmute-btn';
unmuteBtn.innerHTML = '🔇';
unmuteBtn.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 20;
  color: rgba(255,255,255,0.7);
  font-size: 1.8rem;
  cursor: pointer;
  padding: 8px;
  transition: opacity 0.4s ease;
`;
document.body.appendChild(unmuteBtn);

let activated = false;

unmuteBtn.addEventListener('click', () => {
  video.muted = false;
  video.play();
  unmuteBtn.innerHTML = '🔊';
  setTimeout(() => {
    unmuteBtn.style.opacity = '0';
    setTimeout(() => unmuteBtn.remove(), 400);
  }, 2000);
});

video.addEventListener('timeupdate', () => {
  if (!activated && video.currentTime >= 4.5) {
    activated = true;
    clickLayer.classList.add('active');
  }
});

clickLayer.addEventListener('click', () => {
  window.location.href = 'downloads.html';
});

setTimeout(() => {
  if (!activated) {
    activated = true;
    clickLayer.classList.add('active');
  }
}, 5000);
