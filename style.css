const video = document.getElementById('main-video');
const clickLayer = document.getElementById('click-layer');

video.play().catch(() => {});

// Unmute button — visible for first 5 seconds
const unmuteBtn = document.createElement('div');
unmuteBtn.id = 'unmute-btn';
unmuteBtn.innerHTML = '🔇';
unmuteBtn.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 20;
  color: rgba(255,255,255,0.8);
  font-size: 1.8rem;
  cursor: pointer;
  padding: 8px;
  opacity: 1;
  transition: opacity 0.6s ease;
`;
document.body.appendChild(unmuteBtn);

// Fade out unmute button after 5 seconds
setTimeout(() => {
  unmuteBtn.style.opacity = '0';
  setTimeout(() => unmuteBtn.remove(), 600);
}, 5000);

unmuteBtn.addEventListener('click', () => {
  video.muted = false;
  video.play();
  unmuteBtn.innerHTML = '🔊';
  setTimeout(() => {
    unmuteBtn.style.opacity = '0';
    setTimeout(() => unmuteBtn.remove(), 600);
  }, 1500);
});

// Activate click layer at 4.5 seconds
let activated = false;
video.addEventListener('timeupdate', () => {
  if (!activated && video.currentTime >= 4.5) {
    activated = true;
    clickLayer.classList.add('active');
  }
});

// Click goes to downloads page
clickLayer.addEventListener('click', () => {
  window.location.href = 'downloads.html';
});

// Fallback
setTimeout(() => {
  if (!activated) {
    activated = true;
    clickLayer.classList.add('active');
  }
}, 5500);
