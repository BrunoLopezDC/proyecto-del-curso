var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');
var imageUrl = 'https://pqkwqymrxwfhbibsatkc.supabase.co/storage/v1/object/public/imagenes/sf-boat.jpg';

function openCreatePostModal() {
  createPostArea.style.transform = 'translateY(0)';
}

function closeCreatePostModal() {
  createPostArea.style.transform = 'translateY(100vh)';
}

function clearCards() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

shareImageButton.addEventListener('click', openCreatePostModal);
closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

function createCard(data) {
  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
  var cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = 'url("' + data.image + '")';
  cardTitle.style.backgroundSize = 'cover';
  cardTitle.style.height = '180px';
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.style.color = 'white';
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = 'center';
  cardWrapper.appendChild(cardSupportingText);
  if (typeof componentHandler !== 'undefined') {
    componentHandler.upgradeElement(cardWrapper);
  }
  sharedMomentsArea.appendChild(cardWrapper);
}

function updateUI(data) {
  clearCards();
  for (var i = 0; i < data.length; i++) {
    createCard(data[i]);
  }
}

var url = 'https://pqkwqymrxwfhbibsatkc.supabase.co/rest/v1/post?select=*';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxa3dxeW1yeHdmaGJpYnNhdGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTE4NzAsImV4cCI6MjEwODM4Nzg3MH0.JsNyLPSwb5lk-1XnVraagUX7VkkCrtXGbOY-k897PaY';
var networkDataReceived = false;

fetch(url, {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY
  }
})
  .then(function (res) {
    return res.json();
  })
  .then(function (data) {
    networkDataReceived = true;
    console.log('From web', data);
    var dataArray = [];
    for (var key in data) {
      dataArray.push(data[key]);
    }
    updateUI(dataArray);
  })
  .catch(function (error) {
    console.log('Supabase unavailable, using local data:', error.message);
  });

if ('indexedDB' in window) {
  readAllData('posts')
    .then(function (data) {
      if (!networkDataReceived) {
        console.log('From cache', data);
        updateUI(data);
      }
    });

  function savePostForSync(post) {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
      throw new Error('Background Sync is not supported');
    }

    return navigator.serviceWorker.ready
      .then(function (sw) {
        return writeData('sync-posts', post)
          .then(function () {
            console.log('Post saved in sync-posts');
            return sw.sync.register('sync-new-posts');
          });
      })
      .then(function () {
        var snackbarContainer = document.querySelector('#confirmation-toast');
        var data = { message: 'Your Post was saved for syncing!' };
        snackbarContainer.MaterialSnackbar.showSnackbar(data);
      });
  }

  function sendData(post) {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
          'Accept': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Prefer': 'return=representation'
      },
      body: JSON.stringify(post)
    })
      .then(function (res) {
        console.log('Sent data', res);
        return res.text().then(function (body) {
          if (!res.ok) {
            throw new Error('HTTP ' + res.status + ': ' + body);
          }
          return body ? JSON.parse(body) : [];
        });
      })
      .then(function (data) {
        if (data.length) {
          writeData('posts', data[0])
            .then(function () {
              createCard(data[0]);
            });
        }
      })
      .catch(function (error) {
        if (error instanceof TypeError) {
          return savePostForSync(post)
            .then(function () {
              console.log('Post saved for Background Sync');
            });
        }
        console.error('Error sending data:', error);
      });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
      alert('Please enter valid data!');
      return;
    }

    closeCreatePostModal();

    var post = {
      id: new Date().toISOString(),
      title: titleInput.value,
      location: locationInput.value,
      image: imageUrl
    };

    if (!navigator.onLine) {
      savePostForSync(post)
        .catch(function (err) {
          console.log(err);
        });
    } else {
      sendData(post);
    }
  });

  function requestSync() {
    readAllData('sync-posts').then(function (pending) {
      if (!pending.length) {
        return;
      }

      navigator.serviceWorker.ready.then(function (sw) {
        if (sw.active) {
          sw.active.postMessage({ type: 'sync-new-posts' });
        }
      });
    });
  }

  window.addEventListener('online', requestSync);
  setInterval(requestSync, 5000);

}