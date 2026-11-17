/** Time-based games: independent of display refresh rate, touch and keyboard friendly. */
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function startGame(id, root, quiz, onWin, onNext) {
  let destroyed = false;
  let frame = 0;
  let timer = 0;
  const listeners = [];
  function listen(target, name, handler, options) {
    target.addEventListener(name, handler, options);
    listeners.push(() => target.removeEventListener(name, handler, options));
  }
  function stop() { cancelAnimationFrame(frame); clearTimeout(timer); }
  function result(won, text, retry) {
    stop();
    if (destroyed) return;
    if (won) onWin();
    root.innerHTML = `<div class="game-result"><span class="result-emoji">${won ? '💖' : '🌷'}</span><span class="eyebrow">CHAPTER 0${id}</span><h2>${won ? 'You did it, baby!' : 'A little practice, a little love.'}</h2><p role="status">${text}</p><button class="button primary" id="game-next">${won ? (id === 3 ? 'Open my letter ♡' : 'Next little adventure →') : 'Let’s try again ♡'}</button>${won ? '<button class="text-button" id="game-replay">Play this one again</button>' : ''}</div>`;
    root.querySelector('#game-next').addEventListener('click', won ? onNext : retry);
    root.querySelector('#game-replay')?.addEventListener('click', retry);
  }

  function quizGame() {
    let index = 0;
    let score = 0;
    function renderQuestion() {
      if (destroyed) return;
      const question = quiz[index];
      root.innerHTML = `<span class="eyebrow">OUR LITTLE LOVE QUIZ</span><h2>Our favourite story.</h2><div class="quiz-track"><span>${index + 1} / ${quiz.length}</span><span>${score} correct ♡</span></div><h3 class="quiz-question">${esc(question.question)}</h3><p class="quiz-burmese burmese" lang="my">${esc(question.burmese)}</p><div class="quiz-choices">${question.choices.map((choice, number) => `<button data-answer="${number}"><span>${String.fromCharCode(65 + number)}</span>${esc(choice)}</button>`).join('')}</div><p id="quiz-feedback" class="quiz-feedback" role="status"></p>`;
      root.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
        root.querySelectorAll('[data-answer]').forEach(item => { item.disabled = true; });
        const correct = Number(button.dataset.answer) === question.answer;
        if (correct) score++;
        button.classList.add(correct ? 'correct' : 'incorrect');
        root.querySelector(`[data-answer="${question.answer}"]`).classList.add('correct');
        root.querySelector('#quiz-feedback').textContent = correct ? 'That’s our story, baby. ♡' : `A little reminder: ${question.choices[question.answer]} ♡`;
        timer = setTimeout(() => {
          index++;
          if (index < quiz.length) renderQuestion();
          else result(score === quiz.length, `You remembered ${score} of ${quiz.length} little details.${score < quiz.length ? ' Try once more — now you know our story even better.' : ' The heart-catching game is waiting for you.'}`, quizGame);
        }, 1300);
      }));
    }
    renderQuestion();
  }

  function arcade(type) {
    stop();
    listeners.splice(0).forEach(remove => remove());
    const catching = type === 'catch';
    root.innerHTML = `<span class="eyebrow">CHAPTER 0${id} · MADE FOR YOU</span><h2>${catching ? 'Catch a little love.' : 'On my way to you.'}</h2><p class="arcade-instructions">${catching ? 'Move the basket with your finger, mouse, or ← → keys. Catch 12 hearts in 30 seconds.' : 'Tap the sky, press Space, or use the Fly button to flap. Pass 5 gates to reach me.'}</p><div class="arcade-stats" role="status" aria-live="off"><span id="arcade-score">${catching ? 'Hearts: 0 / 12' : 'Gates: 0 / 5'}</span><span id="arcade-time">${catching ? '30s' : 'You + me ♡'}</span></div><canvas class="game-canvas" width="420" height="440" tabindex="0" aria-label="${catching ? 'Heart catching game. Use left and right arrows to move the basket.' : 'Flying game. Press Space or tap to flap through five gates.'}"></canvas><div class="arcade-controls"><button class="button primary" id="start-arcade">${catching ? 'Start catching ♡' : 'Start flying ♡'}</button>${!catching ? '<button class="button secondary" id="flap" disabled>Fly ↑</button>' : ''}</div><p class="game-kind-note">${catching ? 'Every little heart finds its way to us.' : 'One little flap at a time. We’ll get there.'} Closing the game pauses your adventure until you retry.</p>`;
    const canvas = root.querySelector('canvas');
    const context = canvas.getContext('2d');
    let running = false;
    let previous = 0;
    let elapsed = 0;
    let score = 0;
    let basket = 210;
    let birdY = 220;
    let velocity = 0;
    let spawn = 0;
    let things = [];
    const keys = new Set();
    function flap() { if (running && !catching) velocity = -220; }
    function pointer(event) {
      if (catching) {
        const bounds = canvas.getBoundingClientRect();
        basket = Math.max(32, Math.min(388, (event.clientX - bounds.left) / bounds.width * 420));
      }
    }
    listen(canvas, 'pointermove', pointer);
    listen(canvas, 'pointerdown', event => {
      if (!running) return;
      pointer(event); flap(); canvas.focus();
    });
    listen(canvas, 'keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp'].includes(event.code)) {
        event.preventDefault(); keys.add(event.code);
        if (!event.repeat && ['Space', 'ArrowUp'].includes(event.code)) flap();
      }
    });
    listen(window, 'keyup', event => keys.delete(event.code));
    listen(window, 'blur', () => { keys.clear(); previous = 0; });
    listen(document, 'visibilitychange', () => { previous = 0; keys.clear(); });
    root.querySelector('#flap')?.addEventListener('click', flap);

    function draw() {
      context.clearRect(0, 0, 420, 440);
      const gradient = context.createLinearGradient(0, 0, 0, 440);
      gradient.addColorStop(0, catching ? '#fae8ef' : '#dfedf4');
      gradient.addColorStop(1, '#fffaf2');
      context.fillStyle = gradient; context.fillRect(0, 0, 420, 440);
      context.fillStyle = '#ffffffa0';
      for (const [x, y] of [[40, 80], [260, 130], [130, 260]]) {
        context.beginPath(); context.ellipse(x, y, 48, 15, 0, 0, Math.PI * 2); context.fill();
      }
      context.textAlign = 'center';
      if (catching) {
        context.font = '27px Georgia'; context.fillStyle = '#bf597e';
        things.forEach(heart => context.fillText('♥', heart.x, heart.y));
        context.font = '44px "Noto Color Emoji", Arial'; context.fillText('🧺', basket, 403);
        context.font = '12px Arial'; context.fillStyle = '#8a6778'; context.fillText('a little basket of us', 210, 430);
      } else {
        context.fillStyle = '#94b7ad';
        things.forEach(gate => {
          context.beginPath(); context.roundRect(gate.x, -10, 44, gate.gap - 78 + 10, 10); context.fill();
          context.beginPath(); context.roundRect(gate.x, gate.gap + 78, 44, 450 - gate.gap - 78, 10); context.fill();
          context.fillStyle = '#698f84'; context.font = '17px Georgia'; context.fillText('♡', gate.x + 22, gate.gap - 96); context.fillStyle = '#94b7ad';
        });
        context.font = '31px "Noto Color Emoji", Arial'; context.fillText('🕊️', 90, birdY + 10);
      }
      if (!running) {
        context.fillStyle = '#6f596b'; context.font = 'italic 22px Georgia'; context.fillText('A tiny adventure for two ♡', 210, 210);
        context.font = '13px Arial'; context.fillText('Press the start button when you’re ready', 210, 237);
      }
    }
    function end(won) {
      running = false;
      result(won, won ? (catching ? 'Twelve little hearts, safely caught. Just like you caught mine.' : 'Five gates, two hearts. I knew we would find our way.') : (catching ? `You caught ${score} hearts. Let’s fill our basket again.` : `You passed ${score} gates. No rush — we can always try again, together.`), () => arcade(type));
    }
    function loop(now) {
      if (destroyed || !running) return;
      if (document.hidden) { previous = 0; frame = requestAnimationFrame(loop); return; }
      const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now; elapsed += delta; spawn += delta;
      if (catching) {
        if (keys.has('ArrowLeft')) basket = Math.max(32, basket - 340 * delta);
        if (keys.has('ArrowRight')) basket = Math.min(388, basket + 340 * delta);
        if (spawn > .55) { spawn = 0; things.push({ x: 30 + Math.random() * 360, y: -15, speed: 105 + Math.random() * 45 }); }
        things = things.filter(heart => {
          heart.y += heart.speed * delta;
          if (heart.y > 360 && heart.y < 413 && Math.abs(heart.x - basket) < 39) { score++; return false; }
          return heart.y < 460;
        });
        root.querySelector('#arcade-time').textContent = `${Math.max(0, Math.ceil(30 - elapsed))}s`;
        if (score >= 12) return end(true);
        if (elapsed >= 30) return end(false);
      } else {
        velocity += 500 * delta; birdY += velocity * delta;
        if (spawn > 2.5) { spawn = 0; things.push({ x: 440, gap: 140 + Math.random() * 155, counted: false }); }
        let collision = birdY < 15 || birdY > 422;
        things = things.filter(gate => {
          gate.x -= 95 * delta;
          if (gate.x < 104 && gate.x + 44 > 76 && (birdY - 12 < gate.gap - 78 || birdY + 12 > gate.gap + 78)) collision = true;
          if (!gate.counted && gate.x + 44 < 76) { gate.counted = true; score++; }
          return gate.x > -50;
        });
        if (collision) return end(false);
        if (score >= 5) return end(true);
      }
      root.querySelector('#arcade-score').textContent = catching ? `Hearts: ${score} / 12` : `Gates: ${score} / 5`;
      draw(); frame = requestAnimationFrame(loop);
    }
    root.querySelector('#start-arcade').addEventListener('click', event => {
      if (running) return;
      running = true; event.target.disabled = true;
      if (!catching) { velocity = -150; root.querySelector('#flap').disabled = false; }
      canvas.focus(); frame = requestAnimationFrame(loop);
    });
    draw();
  }
  if (id === 1) quizGame();
  else arcade(id === 2 ? 'catch' : 'fly');
  return () => { destroyed = true; stop(); listeners.forEach(remove => remove()); };
}
