import { startGame } from './games.js';
import { scrapbookMarkup, bindScrapbook } from './scrapbook.js';
import { setupMusic } from './music.js';

const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let data;
let token;
let completed = [];
let cleanupGame = () => {};
const progressKey = 'jason-yan-six-months-games-v1';

export async function mount(csrf, options = {}) {
  token = csrf;
  const response = await fetch('/api/content');
  if (!response.ok) throw new Error('Please sign in again.');
  data = await response.json();
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey) || '[]');
    completed = Array.isArray(saved) ? [...new Set(saved.filter(id => [1, 2, 3].includes(id)))] : [];
  } catch { completed = []; }
  document.title = 'Jason & Yan — Six months of us ♡';
  $('#app').innerHTML = `
    <div class="site-shell">
      <header class="site-header"><a class="wordmark" href="#home" aria-label="Jason and Yan home">j <span>♡</span> y<span class="wordmark-caption">OUR LITTLE WORLD</span></a>
        <nav aria-label="Main navigation"><a href="#memories">Our memories</a><a href="#games">A little fun</a><a href="#letter">For you <span>♡</span></a></nav>
        <button class="lock-button" id="logout" aria-label="Lock website">Lock <span aria-hidden="true">↗</span></button>
      </header>
      <main>
        <section id="home" class="hero">
            <div class="hero-copy"><div class="pill"><span class="tiny-heart">♥</span> &nbsp; 18 MAY — 18 NOVEMBER 2026</div><span class="scrapbook-edition">our first six months, kept forever</span>
            <h1>Six months.<br>A thousand little<br><em>reasons to love you.</em></h1>
            <p class="hero-subtitle">Different places. The same sky. Always us.</p>
            <p class="burmese hero-burmese" lang="my">Happy ၆ လပြည့်ပါ baby လေးရေ ♡</p>
            <div class="hero-actions"><a class="button primary" href="#memories">Turn the pages of us <span>↗</span></a><button class="text-button" id="hero-music">♫ &nbsp; Our song</button></div>
            <div class="hero-signature">For Yan, with all my heart. <span>— Jason</span></div>
            <section class="music-panel" id="music-panel" hidden aria-labelledby="music-heading"><div class="music-panel-head"><span id="music-heading">Our soundtrack ♡</span><button id="close-music" aria-label="Close music player and stop music">×</button></div><audio id="our-audio" src="/music.mp3" preload="none" loop controls></audio><p id="music-status" role="status">A little soundtrack to our story.</p><button class="button primary" id="play-pause-music">Play our song ♫</button><button class="text-button" id="stop-music">Continue without music ×</button></section>
          </div>
          <div class="hero-photos"><span class="handwritten photo-note">my favourite person ↘</span><span class="photo-sparkle" aria-hidden="true">✧</span>
            <figure class="polaroid yan"><img src="/photos/yan.jpg" alt="Yan smiling on a bench in front of a colorful window"><figcaption>you, my favourite view ♡</figcaption></figure>
            <figure class="polaroid jason"><img src="/photos/jason.jpg" alt="Jason on the beach at night"><figcaption>me, always thinking of you</figcaption></figure>
            <span class="photo-sticker" aria-hidden="true">made for<br><strong>each other</strong></span>
            <span class="handwritten photo-bottom">two hearts, one little story.</span>
          </div>
        </section>
        <section class="time-section" aria-label="Our time together"><span class="eyebrow">EVERY SECOND, A LITTLE MORE IN LOVE</span><h2>It started with you.</h2><div class="timer" id="timer"></div><p class="time-caption">Together since 18 May 2026 <span>♡</span> <span id="celebration-status"></span></p></section>
        <section id="memories" class="memories-section section-pad">${scrapbookMarkup(data.scrapbook)}
          <details class="written-notes"><summary>Seven more little notes from Ko Ko <span>♡</span></summary><p>Some memories live in words, too. The little stories I never want to forget.</p><div class="written-notes-grid">${data.memories.map((memory, index) => `<button data-memory="${index}"><span>${memory.icon}</span><div><strong>${escapeHTML(memory.title)}</strong><small lang="my">${escapeHTML(memory.subtitle)}</small></div><span aria-hidden="true">↗</span></button>`).join('')}</div></details>
        </section>
        <section class="quote-strip"><span aria-hidden="true">“</span><blockquote>Of all the places I could be,<br>my favourite is <em>with you.</em></blockquote><span class="quote-credit">JASON + YAN &nbsp; · &nbsp; OUR NEXT CHAPTER IS TOGETHER</span></section>
        <section id="games" class="games-section section-pad"><div class="section-heading"><div><span class="eyebrow">A LITTLE PLAY, A LITTLE HEART</span><h2>Love is in the <em>little things.</em></h2></div><p>Three tiny adventures, just for you.<br>A love letter is waiting at the end.</p></div>
          <div class="games-grid">
            <article class="game-card"><span class="game-emoji" aria-hidden="true">💭</span><span class="eyebrow">CHAPTER 01</span><h3>How well do you know us?</h3><p>A few questions about our favourite story.</p><button class="button secondary" data-game="1">Play our quiz <span>↗</span></button><span class="game-status" id="status-1"></span></article>
            <article class="game-card"><span class="game-emoji" aria-hidden="true">💗</span><span class="eyebrow">CHAPTER 02</span><h3>Catch a little love</h3><p>Catch 12 falling hearts in 30 seconds.</p><button class="button secondary" data-game="2">Catch the hearts <span>↗</span></button><span class="game-status" id="status-2"></span></article>
            <article class="game-card"><span class="game-emoji" aria-hidden="true">🕊️</span><span class="eyebrow">CHAPTER 03</span><h3>On my way to you</h3><p>Fly through five little obstacles. Together.</p><button class="button secondary" data-game="3">Let's fly <span>↗</span></button><span class="game-status" id="status-3"></span></article>
          </div><p class="game-hint" id="progress-note"></p>
        </section>
        <section id="letter" class="letter-section"><div class="letter-intro"><span class="eyebrow">THE THINGS MY HEART WANTS TO SAY</span><h2>A little letter.<br><em>A whole lot of love.</em></h2><p>For my baby, today and all the days after.</p><p class="burmese" lang="my">ကိုကို့ဆီက baby လေးအတွက် စာလေးတစ်စောင် ♡</p></div><button class="letter-envelope" id="open-letter"><span class="envelope-drawing" aria-hidden="true">💌</span><span class="handwritten">To my dearest Yan</span><span class="letter-seal">♡</span><span id="letter-state">Finish our three little adventures to open</span></button></section>
      </main>
      <footer class="site-footer"><a href="#home" class="footer-names">Jason <span>♡</span> Yan</a><p>Six months down. A lifetime of little moments to go.</p><span>18.05.2026 — ALWAYS</span></footer>
    </div>
    <aside class="music-player" id="music-pill" aria-label="Our song"><button id="music-toggle" aria-label="Play our song">Play ♫</button><button id="show-music" class="music-title" aria-controls="music-panel" aria-expanded="false"><strong lang="my">${escapeHTML(data.song.title)}</strong><small lang="my">${escapeHTML(data.song.artist)} · Our song</small></button><button id="dismiss-music" class="dismiss-music" aria-label="Stop music and hide music controls">×</button></aside>
    <dialog id="story-dialog" class="story-dialog"><button class="dialog-close" aria-label="Close dialog">×</button><div id="dialog-content"></div></dialog>
    <div id="celebration-particles" aria-hidden="true"></div>`;
  updateTimer();
  setInterval(updateTimer, 1000);
  updateProgress();
  bindScrapbook(data.scrapbook);
  const music = setupMusic(data.song);
  if (options.autoplay) music.open(true);
  $('#logout').addEventListener('click', async () => {
    try {
      const result = await fetch('/api/logout', { method: 'POST', headers: { 'X-CSRF-Token': token } });
      if (!result.ok) throw new Error();
      music.stop();
      location.reload();
    } catch { alert('Could not lock the site. Please reconnect and try again.'); }
  });
  document.querySelectorAll('[data-memory]').forEach(button => button.addEventListener('click', () => openMemory(Number(button.dataset.memory))));
  document.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => openGame(Number(button.dataset.game))));
  $('#open-letter').addEventListener('click', openLetter);
  $('.dialog-close').addEventListener('click', () => $('#story-dialog').close());
  $('#story-dialog').addEventListener('close', () => { cleanupGame(); cleanupGame = () => {}; document.body.classList.remove('viewing-story'); });
  $('#story-dialog').addEventListener('click', event => {
    const box = event.currentTarget.getBoundingClientRect();
    if (event.target === event.currentTarget && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) event.currentTarget.close();
  });
}

function updateTimer() {
  const now = Date.now();
  const elapsed = Math.max(0, Math.floor((now - new Date(data.start).getTime()) / 1000));
  const values = [Math.floor(elapsed / 86400), Math.floor(elapsed / 3600) % 24, Math.floor(elapsed / 60) % 60, elapsed % 60];
  $('#timer').innerHTML = values.map((value, index) => `<div><strong>${String(value).padStart(2, '0')}</strong><span>${['DAYS', 'HOURS', 'MINUTES', 'SECONDS'][index]}</span></div>`).join('<span class="timer-dot" aria-hidden="true">:</span>');
  const remaining = Math.ceil((new Date(data.celebration).getTime() - now) / 86400000);
  $('#celebration-status').textContent = remaining > 0 ? `${remaining} day${remaining === 1 ? '' : 's'} until our six-month day` : 'Celebrating our first six months & everything after';
}

function showDialog(html) {
  cleanupGame();
  cleanupGame = () => {};
  $('#dialog-content').innerHTML = html;
  if (!$('#story-dialog').open) $('#story-dialog').showModal();
  document.body.classList.add('viewing-story');
  $('#story-dialog').scrollTop = 0;
}

function openMemory(index) {
  const memory = data.memories[index];
  showDialog(`<div class="memory-dialog-icon ${memory.color}">${memory.icon}</div><span class="eyebrow">KEEPSAKE ${String(index + 1).padStart(2, '0')} OF ${data.memories.length}</span><h2>${escapeHTML(memory.title)}</h2><p class="dialog-subtitle" lang="my">${escapeHTML(memory.subtitle)}</p><div class="memory-letter burmese" lang="my">${escapeHTML(memory.text)}</div><p class="handwritten dialog-sign">With love, Ko Ko ♡</p><div class="memory-pagination"><button class="text-button" id="previous-memory">← Previous</button><span>${index + 1} / ${data.memories.length}</span><button class="text-button" id="next-memory">Next memory →</button></div><button class="back-to-pages" id="close-note">Back to our little world ♡</button>`);
  $('#previous-memory').disabled = index === 0;
  $('#next-memory').disabled = index === data.memories.length - 1;
  $('#previous-memory').addEventListener('click', () => openMemory(index - 1));
  $('#next-memory').addEventListener('click', () => openMemory(index + 1));
  $('#close-note').addEventListener('click', () => $('#story-dialog').close());
}

function updateProgress() {
  for (const id of [1, 2, 3]) {
    const button = $(`[data-game="${id}"]`);
    const locked = id > 1 && !completed.includes(id - 1);
    button.disabled = locked;
    $(`#status-${id}`).textContent = completed.includes(id) ? '♡ Completed — play again anytime' : locked ? `Complete chapter 0${id - 1} to unlock` : 'Ready when you are';
  }
  const ready = completed.length === 3;
  $('#progress-note').textContent = ready ? 'All three chapters complete. Your letter is ready, baby. ♡' : `${completed.length} of 3 chapters complete · No rush, love. You can retry as many times as you like.`;
  $('#open-letter').disabled = !ready;
  $('#letter-state').textContent = ready ? 'Tap to open your letter ↗' : 'Finish our three little adventures to open';
  $('#open-letter').classList.toggle('ready', ready);
}

function openGame(id) {
  if (id > 1 && !completed.includes(id - 1)) return;
  showDialog('<div id="game-root"></div>');
  cleanupGame = startGame(id, $('#game-root'), data.quiz, () => {
    if (!completed.includes(id)) completed.push(id);
    try { localStorage.setItem(progressKey, JSON.stringify(completed)); } catch { /* Progress still works in this session. */ }
    updateProgress();
    celebrate();
  }, () => { if (id < 3) openGame(id + 1); else openLetter(); });
}

function openLetter() {
  if (completed.length !== 3) return;
  showDialog(`<div class="letter-paper"><span class="eyebrow">18 NOVEMBER 2026 · SIX MONTHS OF US</span><h2>My dearest <em>Yan,</em></h2><p class="letter-greeting" lang="my">ချစ်ရတဲ့ baby လေးရေ ♡</p>${data.letter.map(paragraph => `<p class="burmese" lang="my">${escapeHTML(paragraph)}</p>`).join('')}<p class="letter-ending">Six months is just the beginning.<br>Here's to our someday, and all the days in between.</p><p class="handwritten signature">Always yours,<br>Jason <span>♡</span></p></div>`);
  celebrate();
}

function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const container = $('#celebration-particles');
  for (let index = 0; index < 24; index++) {
    const heart = document.createElement('span');
    heart.textContent = ['♡', '✧', '♥'][index % 3];
    heart.className = `confetti confetti-${index % 8}`;
    container.append(heart);
    setTimeout(() => heart.remove(), 3000);
  }
}
