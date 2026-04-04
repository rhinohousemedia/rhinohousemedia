const video = document.getElementById('main-video');

video.play().catch(() => {});

// Unmute button — appears immediately, fades after 5 seconds
const unmuteBtn = document.createElement('div');
unmuteBtn.innerHTML = '🔇';
unmuteBtn.style.cssText = `
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 50;
  font-size: 2.4rem;
  cursor: pointer;
  opacity: 1;
  transition: opacity 0.6s ease;
`;
document.body.appendChild(unmuteBtn);

unmuteBtn.addEventListener('click', () => {
  video.muted = false;
  video.play();
  unmuteBtn.innerHTML = '🔊';
  setTimeout(() => {
    unmuteBtn.style.opacity = '0';
    setTimeout(() => unmuteBtn.remove(), 600);
  }, 1500);
});

setTimeout(() => {
  if (document.body.contains(unmuteBtn)) {
    unmuteBtn.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(unmuteBtn)) unmuteBtn.remove();
    }, 600);
  }
}, 5000);
