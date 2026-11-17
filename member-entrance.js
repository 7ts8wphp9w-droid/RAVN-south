/* The entrance uses the same device-local membership as the rest of the preview. */
(() => {
  const book = '<img class="repbook-app-symbol" src="./assets/repbook-app-symbol.svg" alt="" aria-hidden="true">';
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
    document.title = account ? 'ravnsouth · ' + (route === '/login' ? 'Log in' : 'Sign up') : 'ravnsouth | Training, Nutrition & Mentality';
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
    document.getElementById('app').innerHTML = `<main class="gate" aria-label="ravnsouth entrance">
      <section class="gate-brand"><img src="./assets/ravn-angular-logo.png" alt="ravnsouth — Do it. Prove it.">
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
