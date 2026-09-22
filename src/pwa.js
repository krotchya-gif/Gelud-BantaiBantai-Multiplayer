const install = document.getElementById('install-game');
const status = document.getElementById('pwa-status');
const help = document.getElementById('install-help');
const update = document.getElementById('update-game');
const standalone = matchMedia('(display-mode: standalone)');
let promptEvent;
let registration;
const installed = () => standalone.matches || navigator.standalone === true;
function syncInstall() { install.hidden = installed(); }
syncInstall();
standalone.addEventListener('change', syncInstall);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  promptEvent = event;
  syncInstall();
});
window.addEventListener('appinstalled', () => {
  promptEvent = null;
  install.hidden = true;
  help.hidden = true;
  status.textContent = 'Installed. Open BakuHantam from your home screen.';
});
install.addEventListener('click', async () => {
  if (promptEvent) {
    const event = promptEvent;
    promptEvent = null;
    await event.prompt();
    await event.userChoice;
  } else {
    help.hidden = !help.hidden;
    install.setAttribute('aria-expanded', String(!help.hidden));
  }
});
update.addEventListener('click', () => {
  if (!registration?.waiting) return;
  update.disabled = true;
  status.textContent = 'Updating game…';
  registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
});

if (!window.isSecureContext) {
  status.textContent = 'Installation and offline play require an HTTPS address. HTTP over local Wi-Fi is play-only.';
} else if (!import.meta.env.PROD) {
  status.textContent = 'Installation and offline caching are available in the production build.';
} else if ('serviceWorker' in navigator) {
  let controlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled) location.reload();
    controlled = true;
  });
  function showUpdate() {
    const waiting = !!registration.waiting && !!navigator.serviceWorker.controller;
    update.hidden = !waiting;
    if (waiting) {
      status.textContent = 'A new version is ready. Update from this menu when you finish playing.';
    }
  }
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
    .then(async value => {
      registration = value;
      showUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') showUpdate();
        });
      });
      await navigator.serviceWorker.ready;
      showUpdate();
      if (!registration.waiting) status.textContent = 'Ready for offline play. Your browser may clear stored data when space is low.';
    })
    .catch(error => {
      console.warn('[PWA] Offline setup failed.', error);
      status.textContent = 'Offline setup failed. Reconnect and reopen the game to retry.';
    });
} else {
  status.textContent = 'This browser does not support offline installation.';
}
