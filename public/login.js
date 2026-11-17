let csrf = '';
async function openWorld(autoplay = false) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/assets/style.css';
  document.head.append(stylesheet);
  const scrapbookStyle = document.createElement('link');
  scrapbookStyle.rel = 'stylesheet';
  scrapbookStyle.href = '/assets/scrapbook.css';
  document.head.append(scrapbookStyle);
  try {
    const { mount } = await import('/assets/app.js');
    await mount(csrf, { autoplay });
    document.getElementById('login-screen').hidden = true;
    document.getElementById('app').hidden = false;
  } catch {
    document.getElementById('login-error').textContent = 'Something went wrong loading our world. Please refresh and try again.';
  }
}
document.getElementById('show-password').addEventListener('click', (event) => {
  const input = document.getElementById('password');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  event.target.textContent = show ? 'Hide' : 'Show';
  event.target.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  event.target.setAttribute('aria-pressed', String(show));
});
document.getElementById('unlock-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.getElementById('unlock-button');
  button.disabled = true;
  document.getElementById('login-error').textContent = '';
  try {
    if (!csrf) {
      const info = await fetch('/api/session').then(response => response.json());
      csrf = info.csrf;
    }
    const response = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ password: document.getElementById('password').value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Please refresh and try again.');
    csrf = result.csrf;
    document.getElementById('password').value = '';
    await openWorld(document.getElementById('login-music').checked);
  } catch (error) {
    document.getElementById('login-error').textContent = error.message || 'Unable to connect. Please try again.';
  } finally { button.disabled = false; }
});
fetch('/api/session').then(response => response.json()).then(async info => {
  csrf = info.csrf;
  if (info.authenticated) await openWorld();
}).catch(() => { document.getElementById('login-error').textContent = 'Unable to connect. Please refresh to try again.'; });
