/* The entrance uses the same device-local membership as the rest of the preview. */
(() => {
  const book = '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 49V18L18 11H7v32h11l14 6Zm0 0V18l14-7h11v32H46l-14 6Z" stroke="currentColor" stroke-width="3" stroke-linejoin="bevel"/><path d="m39 25 10-5m-10 12 10-5" stroke="currentColor" stroke-width="3"/></svg>';
  const previousRender = render;
  let destination = '/home';

  render = function () {
    const route = path();
    const account = route === '/signup' || route === '/login';
    if (s.joined && route !== '/' && !account) {
      document.body.classList.remove('gateway-active');
      previousRender();
      return;
    }
    if (!account) destination = route === '/' ? '/home' : route;
    const via = new URLSearchParams(location.hash.split('?')[1]).get('next');
    if (account && via === 'repbook') destination = '/repbook';
    document.querySelector('#vs-dialog')?.remove();
    document.body.classList.remove('arena-active', 'repbook-social');
    document.body.classList.add('gateway-active');
    document.title = 'RAVN South · ' + (account ? route === '/login' ? 'Log in' : 'Sign up' : 'Welcome');
    const form = account ? `<form id="gateway-form" class="gate-form">
      <h1>${route === '/signup' ? 'Sign up' : 'Log in'}</h1>
      <p>This preview uses a profile saved on this device.</p>
      <label>Display name<input name="displayName" required minlength="2" maxlength="45" autocomplete="nickname" value="${esc(s.joined ? s.name : '')}"></label>
      <p id="gate-error" role="alert"></p>
      <button class="gate-primary">${route === '/signup' ? 'Create preview profile' : 'Enter preview'}</button>
      <a href="#/">Back to entrance</a>
    </form>` : '';
    const actions = s.joined ? '<a class="gate-primary" href="#/home">Enter site</a>' :
      '<a class="gate-primary" href="#/signup">Sign up</a><a class="gate-secondary" href="#/login">Log in</a>';
    document.getElementById('app').innerHTML = `<main class="gate" aria-label="RAVN South entrance">
      <section class="gate-brand"><img src="./assets/ravn-angular-logo.png" alt="RAVN South — Do it. Prove it.">
        ${account ? form : '<nav aria-label="Member access">'+actions+'</nav>'}
      </section>
      ${account ? '' : `<section class="gate-community"><a class="gate-book" href="${s.joined ? '#/repbook' : '#/login?next=repbook'}">
        <span>${book}</span><strong>Repbook</strong><small>Enter community</small></a></section>`}
    </main>`;
  };
  document.addEventListener('submit', event => {
    if (event.target.id !== 'gateway-form') return;
    event.preventDefault();
    const name = event.target.elements.displayName.value.trim();
    if (name.length < 2) {
      document.getElementById('gate-error').textContent = 'Enter at least two characters.';
      return;
    }
    s.name = name;
    s.joined = true;
    save();
    navto(destination);
  });
  render();
})();
