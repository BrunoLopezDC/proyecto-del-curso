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

  var desktopButton = document.getElementById('install-app-button-desktop');
  var mobileButton = document.getElementById('install-app-button-mobile');

  if (desktopButton) desktopButton.hidden = false;
  if (mobileButton) mobileButton.hidden = false;
});

window.addEventListener('appinstalled', function() {
  deferredInstallPrompt = null;

  var desktopButton = document.getElementById('install-app-button-desktop');
  var mobileButton = document.getElementById('install-app-button-mobile');

  if (desktopButton) desktopButton.hidden = true;
  if (mobileButton) mobileButton.hidden = true;
});

function requestPwaInstall() {
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
}

window.requestPwaInstall = requestPwaInstall;

['install-app-button-desktop', 'install-app-button-mobile'].forEach(function(buttonId) {
  var button = document.getElementById(buttonId);
  if (button) {
    button.addEventListener('click', requestPwaInstall);
  }
});