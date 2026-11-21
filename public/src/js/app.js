if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(function() {
      console.log('Service Worker Registered');
    })
    .catch(function(error) {
      console.error('Service Worker Registration Failed:', error);
    });
}

var deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', function(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  window.dispatchEvent(new CustomEvent('pwa-install-ready'));
});

window.addEventListener('appinstalled', function() {
  deferredInstallPrompt = null;
  console.log('UTEQGram PWA instalada');
});

window.requestPwaInstall = function() {
  if (!deferredInstallPrompt) {
    return Promise.resolve(false);
  }

  deferredInstallPrompt.prompt();
  return deferredInstallPrompt.userChoice
    .then(function(choice) {
      var accepted = choice.outcome === 'accepted';
      deferredInstallPrompt = null;
      return accepted;
    });
};