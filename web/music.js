let apiPromise;

function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    const timeout = setTimeout(() => { script.remove(); apiPromise = null; reject(new Error('The music player took too long to load.')); }, 12000);
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timeout); resolve(window.YT); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); apiPromise = null; reject(new Error('The music player could not connect.')); };
    document.head.append(script);
  });
  return apiPromise;
}

export function setupMusic(song) {
  const panel = document.getElementById('music-panel');
  const pill = document.getElementById('music-pill');
  const status = document.getElementById('music-status');
  const play = document.getElementById('play-pause-music');
  const toggle = document.getElementById('music-toggle');
  let player = null;
  let ready = false;
  let playing = false;
  let generation = 0;
  let starting = false;
  let readyTimeout;

  function state(isPlaying) {
    playing = isPlaying;
    play.textContent = isPlaying ? 'Pause music Ⅱ' : 'Play our song ♫';
    toggle.textContent = isPlaying ? 'Ⅱ' : '♫';
    toggle.setAttribute('aria-label', isPlaying ? 'Pause our song' : 'Play our song');
    pill.classList.toggle('is-playing', isPlaying);
  }
  function stop({ dismiss = false } = {}) {
    generation++;
    clearTimeout(readyTimeout);
    starting = false;
    player?.destroy();
    player = null;
    ready = false;
    state(false);
    document.getElementById('youtube-container').replaceChildren();
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (dismiss) pill.hidden = true;
  }
  async function open(autoplay = false) {
    pill.hidden = false;
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    if (ready) { if (autoplay) player.playVideo(); return; }
    if (starting) return;
    starting = true;
    const attempt = ++generation;
    status.textContent = autoplay ? 'Starting our song… If your phone blocks it, tap Play below.' : 'Loading our little soundtrack…';
    play.disabled = true;
    try {
      const YT = await loadYouTubeAPI();
      if (attempt !== generation || panel.hidden) return;
      const holder = document.createElement('div');
      holder.id = 'youtube-player';
      player?.destroy();
      document.getElementById('youtube-container').replaceChildren(holder);
      player = new YT.Player('youtube-player', {
        host: 'https://www.youtube-nocookie.com',
        width: '100%', height: '200', videoId: song.videoId,
        playerVars: { autoplay: autoplay ? 1 : 0, playsinline: 1, controls: 1, rel: 0, origin: location.origin },
        events: {
          onReady: event => {
            if (attempt !== generation) return;
            clearTimeout(readyTimeout);
            ready = true;
            starting = false;
            play.disabled = false;
            const iframe = event.target.getIframe();
            iframe.title = `${song.title} — ${song.artist}`;
            iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
            status.textContent = 'Tap Play if needed. Keep this player open while listening.';
            if (autoplay) event.target.playVideo();
          },
          onStateChange: event => {
            if (attempt !== generation) return;
            state(event.data === YT.PlayerState.PLAYING);
            if (event.data === YT.PlayerState.PLAYING) status.textContent = 'Our song is playing. Close × stops the music.';
            else if (event.data === YT.PlayerState.PAUSED) status.textContent = 'Paused. Press Play whenever you like, baby.';
            else if (event.data === YT.PlayerState.ENDED) status.textContent = 'One more listen? Press Play to hear our song again.';
          },
          onAutoplayBlocked: () => {
            if (attempt !== generation) return;
            state(false);
            status.textContent = 'Your phone needs a tap first. Press Play below, or tap Play inside the video. ♡';
          },
          onError: () => {
            if (attempt !== generation) return;
            clearTimeout(readyTimeout);
            starting = false;
            play.disabled = false;
            state(false);
            status.textContent = 'This video may not allow playback here. Use “Listen on YouTube” below.';
          },
        },
      });
      player.getIframe().referrerPolicy = 'strict-origin-when-cross-origin';
      player.getIframe().setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      readyTimeout = setTimeout(() => {
        if (attempt !== generation || ready) return;
        starting = false;
        play.disabled = false;
        status.textContent = 'The video is taking a while. Retry Play, use the YouTube link, or continue without music.';
      }, 12000);
    } catch {
      if (attempt !== generation) return;
      starting = false;
      ready = false;
      play.disabled = false;
      state(false);
      status.textContent = 'Could not load YouTube. Retry Play, listen through the link, or continue without music.';
    }
  }
  function togglePlayback() {
    if (ready && playing) player.pauseVideo();
    else if (ready) player.playVideo();
    else open(true);
  }
  play.addEventListener('click', togglePlayback);
  toggle.addEventListener('click', togglePlayback);
  function showPlayer(autoplay) {
    open(autoplay);
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  document.getElementById('show-music').addEventListener('click', () => showPlayer(false));
  document.getElementById('hero-music').addEventListener('click', () => showPlayer(true));
  document.getElementById('close-music').addEventListener('click', () => stop());
  document.getElementById('stop-music').addEventListener('click', () => stop());
  document.getElementById('dismiss-music').addEventListener('click', () => stop({ dismiss: true }));
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { stop(); document.getElementById('hero-music').focus(); } });
  return { open, stop };
}
