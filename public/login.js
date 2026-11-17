let csrf = '';
async function requestJSON(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error('Unable to reach the login server. Please check your connection and try again.');
  }
  if (response.status >= 500) {
    throw new Error(`The login server is unavailable (HTTP ${response.status}). Your password has not been checked. Please check the Vercel runtime logs.`);
  }
  if (response.status === 403) {
    csrf = '';
    throw new Error('Your login session expired. Please refresh the page and try again.');
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The login server returned an unexpected response. Please refresh or check the deployment logs.');
  }
  if (!response.ok) throw new Error(result.error || 'Unable to sign in. Please try again.');
  if (!result || typeof result.csrf !== 'string') {
    throw new Error('The login server returned an incomplete response. Please refresh and try again.');
  }
  return result;
}
async function openWorld(autoplay = true) {
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
      const info = await requestJSON('/api/session');
      csrf = info.csrf;
    }
    const result = await requestJSON('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ password: document.getElementById('password').value }),
    });
    csrf = result.csrf;
    document.getElementById('password').value = '';
    await openWorld();
  } catch (error) {
    document.getElementById('login-error').textContent = error.message || 'Unable to connect. Please try again.';
  } finally { button.disabled = false; }
});
requestJSON('/api/session').then(async info => {
  csrf = info.csrf;
  if (info.authenticated) await openWorld();
}).catch(error => { document.getElementById('login-error').textContent = error.message; });
