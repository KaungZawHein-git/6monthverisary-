export function setupMusic(song) {
  const panel = document.getElementById('music-panel');
  const pill = document.getElementById('music-pill');
  const status = document.getElementById('music-status');
  const play = document.getElementById('play-pause-music');
  const toggle = document.getElementById('music-toggle');
  const audio = document.getElementById('our-audio');
  audio.setAttribute('aria-label', `${song.title} — ${song.artist}`);
  let generation = 0;
  function cancelAutoplayRetry() {
    document.removeEventListener('pointerup', retryAutoplay);
    document.removeEventListener('keydown', retryAutoplay);
  }
  function retryAutoplay(event) {
    if (!event.isTrusted || event.target.closest?.('button, a, input, audio, [role="button"]')) return;
    cancelAutoplayRetry();
    start();
  }

  function state(playing) {
    play.textContent = playing ? 'Pause music Ⅱ' : 'Play our song ♫';
    toggle.textContent = playing ? 'Pause Ⅱ' : 'Play ♫';
    toggle.setAttribute('aria-label', playing ? 'Pause our song' : 'Play our song');
    pill.classList.toggle('is-playing', playing);
  }
  async function start() {
    pill.hidden = false;
    const attempt = ++generation;
    status.textContent = 'Starting our song…';
    try {
      await audio.play();
      cancelAutoplayRetry();
    } catch (error) {
      if (attempt !== generation) return;
      state(false);
      status.textContent = error.name === 'NotAllowedError'
        ? 'Tap ♫ below to start our song, baby. Your phone needs a tap first.'
        : 'Could not play our song. Please check your connection and try again.';
      toggle.setAttribute('aria-label', 'Tap to play our song');
      if (error.name === 'NotAllowedError') {
        toggle.textContent = 'Play ♫';
        cancelAutoplayRetry();
        document.addEventListener('pointerup', retryAutoplay);
        document.addEventListener('keydown', retryAutoplay);
      }
    }
  }
  function stop({ dismiss = false } = {}) {
    cancelAutoplayRetry();
    generation++;
    audio.pause();
    audio.currentTime = 0;
    state(false);
    panel.hidden = true;
    document.getElementById('show-music').setAttribute('aria-expanded', 'false');
    if (dismiss) pill.hidden = true;
  }
  function open(autoplay = false) {
    pill.hidden = false;
    // Autoplay uses only the compact pill, never opens a large panel.
    if (autoplay) return start();
    panel.hidden = false;
    document.getElementById('show-music').setAttribute('aria-expanded', 'true');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function togglePlayback() {
    cancelAutoplayRetry();
    if (audio.paused) start();
    else { generation++; audio.pause(); }
  }
  audio.addEventListener('playing', () => {
    state(true);
    status.textContent = 'Our song is playing. Keep exploring our little world. ♡';
  });
  audio.addEventListener('pause', () => {
    state(false);
    status.textContent = 'Paused. Press Play whenever you like, baby.';
  });
  audio.addEventListener('error', () => {
    state(false);
    status.textContent = 'Our song could not load. Please reconnect and try Play again.';
  });
  play.addEventListener('click', togglePlayback);
  toggle.addEventListener('click', togglePlayback);
  document.getElementById('show-music').addEventListener('click', () => open(false));
  document.getElementById('hero-music').addEventListener('click', () => open(true));
  document.getElementById('close-music').addEventListener('click', () => stop());
  document.getElementById('stop-music').addEventListener('click', () => stop());
  document.getElementById('dismiss-music').addEventListener('click', () => stop({ dismiss: true }));
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { stop(); document.getElementById('hero-music').focus(); }
  });
  return { open, stop };
}
