importScripts('src/js/idb.js');
importScripts('src/js/utility.js');

var CACHE_STATIC_NAME = 'static-v23';
var CACHE_DYNAMIC_NAME = 'dynamic-v23';
var POSTS_URL = 'https://pqkwqymrxwfhbibsatkc.supabase.co/rest/v1/post';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxa3dxeW1yeHdmaGJpYnNhdGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTE4NzAsImV4cCI6MjEwODM4Nzg3MH0.JsNyLPSwb5lk-1XnVraagUX7VkkCrtXGbOY-k897PaY';
var pendingSyncPromise = null;
var STATIC_FILES = [
    '/',
    '/index.html',
    '/offline.html',
    '/help/',
    '/help/index.html',
    '/src/js/app.js',
    '/src/js/feed.js',
    '/src/js/idb.js',
    '/src/js/material.min.js',
    '/src/js/utility.js',
    '/src/css/app.css',
    '/src/css/feed.css',
    '/src/css/help.css',
    '/src/images/main-image.jpg',
    '/src/images/main-image-sm.jpg',
    '/src/images/main-image-lg.jpg',
    'https://fonts.googleapis.com/css?family=Roboto:400,700',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css',
    '/manifest.json',
    '/icons/app-icon-192x192.png',
    '/icons/app-icon-512x512.png',
];

self.addEventListener('install', function (event) {
    self.skipWaiting();

    console.log('[Serviceworker] Installing Service Worker', event);

    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
            .then(function (cache) {
                console.log('[Serviceworker] Caching app shell');

                return Promise.all(
                    STATIC_FILES.map(function (url) {
                        return fetch(url)
                            .then(function (response) {
                                if (!response.ok) {
                                    throw new Error(
                                        'HTTP ' + response.status
                                    );
                                }

                                return cache.put(url, response);
                            })
                            .then(function () {
                                console.log(
                                    '[Serviceworker] Cached:',
                                    url
                                );
                            })
                            .catch(function (error) {
                                console.error(
                                    '[Serviceworker] Failed:',
                                    url,
                                    error
                                );
                            });
                    })
                );
            })
    );
});


self.addEventListener('activate', function (event) {
    console.log('[Serviceworker] Activating Service Worker', event);

    event.waitUntil(
        caches.keys()
            .then(function (keyList) {
                return Promise.all(
                    keyList.map(function (key) {
                        if (
                            key !== CACHE_STATIC_NAME &&
                            key !== CACHE_DYNAMIC_NAME
                        ) {
                            console.log(
                                '[Serviceworker] Removing old cache:',
                                key
                            );
                            return caches.delete(key);
                        }
                    })
                );
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

function isInArray(string, array) {
    var cachePath;
    if (string.indexOf(self.origin) === 0) {
        console.log('matched ', string);
        cachePath = string.substring(self.origin.length);
    } else {
        cachePath = string;
    }
    return array.indexOf(cachePath) > -1;
}


self.addEventListener('fetch', function (event) {
    if (
        event.request.method === 'GET' &&
        event.request.url.indexOf(POSTS_URL) > -1
    ) {
        event.respondWith(fetch(event.request)
            .then(function (res) {
                if (!res.ok) {
                    return res;
                }

                var clonedRes = res.clone();
                return clearAllData('posts')
                    .then(function () {
                        return clonedRes.json();
                    })
                    .then(function (data) {
                        var writeRequests = [];

                        for (var key in data) {
                            writeRequests.push(writeData('posts', data[key]));
                        }

                        return Promise.all(writeRequests);
                    })
                    .then(function () {
                        return res;
                    });
            })
            .catch(function () {
                return caches.match(event.request)
                    .then(function (cachedResponse) {
                        return cachedResponse || Response.error();
                    });
            })
        );
    } else if (
        event.request.method === 'POST' &&
        event.request.url.indexOf(POSTS_URL) > -1
    ) {
        event.respondWith(fetch(event.request));
    } else if (isInArray(event.request.url, STATIC_FILES)) {
        event.respondWith(
            caches.match(event.request)
                .then(function (cachedResponse) {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(event.request)
                        .then(function (networkResponse) {
                            if (!networkResponse.ok) {
                                return networkResponse;
                            }

                            return caches.open(CACHE_STATIC_NAME)
                                .then(function (cache) {
                                    cache.put(event.request.url, networkResponse.clone());
                                    return networkResponse;
                                });
                        })
                        .catch(function () {
                                        var accept = event.request.headers.get('accept') || '';
                                        if (accept.includes('text/html')) {
                                return caches.match('/offline.html');
                            }
                            return Response.error();
                        });
                })
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then(function (response) {
                    if (response) {
                        return response;
                    } else {
                        return fetch(event.request)
                            .then(function (res) {
                                if (!event.request.url.startsWith('http')) {
                                    return res;
                                }

                                return caches.open(CACHE_DYNAMIC_NAME)
                                    .then(function (cache) {
                                        cache.put(
                                            event.request.url,
                                            res.clone()
                                        );
                                        return res;
                                    });
                            })
                            .catch(function () {
                                return caches.open(CACHE_STATIC_NAME)
                                    .then(function (cache) {
                                        var accept = event.request.headers.get('accept') || '';
                                        if (accept.includes('text/html')) {
                                            return cache.match('/offline.html');
                                        }
                                        return Response.error();
                                    });
                            });
                    }
                })
        );
    }
});

function syncPendingPosts() {
    if (pendingSyncPromise) {
        return pendingSyncPromise;
    }

    pendingSyncPromise = readAllData('sync-posts')
        .then(function (data) {
            console.log('[Service Worker] Pending posts:', data.length);
            return Promise.all(data.map(function (dt) {
                return fetch(POSTS_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Prefer': 'resolution=ignore-duplicates'
                    },
                    body: JSON.stringify({
                        id: dt.id,
                        title: dt.title,
                        location: dt.location,
                        image: dt.image
                    })
                })
                    .then(function (res) {
                        if (!res.ok) {
                            return res.text().then(function (body) {
                                throw new Error('HTTP ' + res.status + ': ' + body);
                            });
                        }
                        console.log('[Service Worker] Post sent:', dt.id);
                        return writeData('posts', dt)
                            .then(function () {
                                return deleteItemFromData('sync-posts', dt.id);
                            });
                    });
            }));
        })
        .then(function (result) {
            pendingSyncPromise = null;
            return result;
        }, function (error) {
            pendingSyncPromise = null;
            throw error;
        });

    return pendingSyncPromise;
}

self.addEventListener('sync', function (event) {
    if (event.tag === 'sync-new-posts') {
        console.log('[Service Worker] Syncing new Posts');
        event.waitUntil(syncPendingPosts());
    }
});

self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'sync-new-posts') {
        event.waitUntil(
            syncPendingPosts().catch(function (error) {
                console.log('[Service Worker] Still offline:', error.message);
            })
        );
    }
});