const CACHE_VERSION = 'clarity-v3';
const APP_SHELL = ['/', '/dashboard', '/tasks', '/habits', '/goals', '/analytics', '/offline.html'];

function isStaticAsset(request: Request) {
	const url = new URL(request.url);
	if (url.pathname.startsWith('/_app/immutable/')) return true;
	if (url.pathname === '/manifest.webmanifest') return true;
	if (url.pathname === '/favicon.svg') return true;
	return /\.(css|js|png|jpg|jpeg|svg|webp|woff2?)$/i.test(url.pathname);
}

function isApiRequest(request: Request) {
	const url = new URL(request.url);
	return url.pathname.startsWith('/api/');
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_VERSION).then((cache) => {
			return cache.addAll(APP_SHELL);
		})
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			await Promise.all(
				keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
			);
		})
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	if (isApiRequest(event.request)) return;

	if (isStaticAsset(event.request)) {
		event.respondWith(
			caches.match(event.request).then((cached) => {
				if (cached) return cached;
				return fetch(event.request).then((response) => {
					const cloned = response.clone();
					caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, cloned));
					return response;
				});
			})
		);
		return;
	}

	if (event.request.mode === 'navigate') {
		event.respondWith(
			fetch(event.request).catch(async () => {
				const offline = await caches.match('/offline.html');
				return offline ?? new Response('Offline', { status: 503, statusText: 'Offline' });
			})
		);
	}
});
