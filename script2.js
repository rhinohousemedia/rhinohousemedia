const video = document.getElementById('main-video');

// Play video — downloads section already visible below via CSS animation
video.play().catch(() => {
  // Autoplay blocked on some browsers — video stays paused, downloads still show
});
