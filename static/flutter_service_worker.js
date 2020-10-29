'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "index.html": "86f83bdc5203fcae2fc9dfc63c6dd0e5",
"/": "86f83bdc5203fcae2fc9dfc63c6dd0e5",
"main.dart.js": "25ffd029fdf461de5274728a6bd63273",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"manifest.json": "49f07c118bf1eadfc13ee43541b741c5",
"assets/images/gender_male.svg": "91ba61de3d764e5933e7e4b510d041ef",
"assets/images/greenery.png": "fe251019846667b59bcce89faa28a6b3",
"assets/images/brave.jpg": "6c7015c4307b1ec150eed6bfdd4d000d",
"assets/images/gender_female.svg": "29cda773ae1d871456aa14119a84eae7",
"assets/AssetManifest.json": "330d5b126da8e8ca4e451038763b8e8c",
"assets/NOTICES": "c42e59e864447d1a46b8b6d6e60970d5",
"assets/FontManifest.json": "f1c47960427065063f8fb3cc96ce83c2",
"assets/fonts/MaterialIcons-Regular.ttf": "56d3ffdef7a25659eab6a68a3fbfaf16",
"assets/assets/fonts/PlayfairDisplay-Bold.ttf": "2cc98ebee00fb87618f4e894a3614d77",
"assets/assets/fonts/PlayfairDisplay-SemiBold.ttf": "6165164d7463f005bbf9db13fc92bac1",
"assets/assets/fonts/PlayfairDisplay-Medium.ttf": "6b6f0053a6811a9381a9fa488ac76cb0",
"assets/assets/fonts/PlayfairDisplay-BoldItalic.ttf": "15660f05f3f5742800724772a2112625",
"assets/assets/fonts/PlayfairDisplay-ExtraBoldItalic.ttf": "a2106aaaf8f2da3b65673f6107b4a074",
"assets/assets/fonts/PlayfairDisplay-Italic.ttf": "8969f2415be9fd1fea2f3bc7b72baa73",
"assets/assets/fonts/PlayfairDisplay-Regular.ttf": "b3721ba3bde34e5b38b0e1523cccfd7f",
"assets/assets/fonts/PlayfairDisplay-Black.ttf": "6b2baf9d620742fff583c66e6bb2bedb",
"assets/assets/fonts/PlayfairDisplay-SemiBoldItalic.ttf": "9e8866b265ef8abaecb0a10766713edd",
"assets/assets/fonts/PlayfairDisplay-MediumItalic.ttf": "ecd99b74189fc2d323c7725b29470f39",
"assets/assets/fonts/PlayfairDisplay-BlackItalic.ttf": "8e4c72666923aceca0b6a68dcadf334c",
"assets/assets/fonts/PlayfairDisplay-ExtraBold.ttf": "75ee27eb9a26bfef5ac0d477630f234b"
};

// The application shell files that are downloaded before a service worker can
// start.
const CORE = [
  "/",
"main.dart.js",
"index.html",
"assets/NOTICES",
"assets/AssetManifest.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      // Provide a no-cache param to ensure the latest version is downloaded.
      return cache.addAll(CORE.map((value) => new Request(value, {'cache': 'no-cache'})));
    })
  );
});

// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');

      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        return;
      }

      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});

// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#')) {
    key = '/';
  }
  // If the URL is not the RESOURCE list, skip the cache.
  if (!RESOURCES[key]) {
    return event.respondWith(fetch(event.request));
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache. Ensure the resources are not cached
        // by the browser for longer than the service worker expects.
        var modifiedRequest = new Request(event.request, {'cache': 'no-cache'});
        return response || fetch(modifiedRequest).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
    })
  );
});

self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    return self.skipWaiting();
  }

  if (event.message === 'downloadOffline') {
    downloadOffline();
  }
});

// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey in Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}
