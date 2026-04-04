const video = document.getElementById('main-video');
const clickLayer = document.getElementById('click-layer');

let activated = false;

// Activate click zone at 4.5 seconds
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

// Fallback: if video fails to play, activate after 5 seconds
setTimeout(() => {
  if (!activated) {
    activated = true;
    clickLayer.classList.add('active');
  }
}, 5000);
