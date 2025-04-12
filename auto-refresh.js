/**********************/
/*** Auto-Refresh   ***/
/**********************/

const CHECK_INTERVAL_MS = 1000; // Interval between checks
const trackedFiles = []; // List of tracked files

const resourceSelector = `
	script[src],
	link[rel="stylesheet"],
	img[src],
	iframe[src],
	video[src],
	audio[src],
	source[src],
	embed[src],
	object[data]
`;

/**********************/
/*** Functions      ***/
/**********************/

// Get Last-Modified header timestamp
async function fetchLastModifiedTimestamp(url) {
	try {
		const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
		const lastMod = res.headers.get('Last-Modified');
		if (!lastMod) throw new Error('No Last-Modified header');
		return new Date(lastMod).getTime();
	} catch (err) {
		console.warn(`[AutoReload] Failed to fetch ${url}`, err);
		return null;
	}
}

// Extract file extension from URL
function getFileExtension(url) {
	return url.split('.').pop().split('?')[0].toLowerCase();
}

// Add/update ?x=timestamp to force reload
function rebuildUrl(originalUrl, ts) {
	const [path, query] = originalUrl.split('?');
	const params = new URLSearchParams(query || '');
	params.set('x', ts);
	return `${path}?${params.toString()}`;
}

// Reload specific resource if changed
function refreshTrackedFile(index) {
	let item = trackedFiles[index];
	let newUrl = rebuildUrl(item.url, item.ts);

	switch (item.ext) {
		case 'js':
			refreshJs(index, item, newUrl);
			break;
		default:
			item.ele.setAttribute(item.attr, newUrl);
			break;
	}
}

// Reload JS file by replacing script tag
function refreshJs(index, item, newUrl) {
	let newScript = document.createElement('script');
	newScript.src = newUrl;
	newScript.type = item.ele.type || 'text/javascript';
	newScript.async = item.ele.async;
	newScript.defer = item.ele.defer;
	item.ele.parentNode.insertBefore(newScript, item.ele.nextSibling);
	item.ele.remove();
	trackedFiles[index].ele = newScript;
}

// Check for updated files
async function checkFiles() {
	// Check main HTML file (index 0)
	if (trackedFiles[0].ts < await fetchLastModifiedTimestamp(trackedFiles[0].url))
		location.reload();

	// Check other tracked resources
	for (let [index, item] of trackedFiles.entries()) {
		if (index === 0) continue;
		let newTimestamp = await fetchLastModifiedTimestamp(item.url);
		if (item.ts >= newTimestamp) continue;
		trackedFiles[index].ts = newTimestamp;
		refreshTrackedFile(index);
	}
}

/**********************/
/*** Execution      ***/
/**********************/

document.addEventListener('DOMContentLoaded', async () => {
	// Convert non-module scripts to modules
	document.querySelectorAll('script[src]:not([type="module"])').forEach(script => script.type = 'module');

	// Track main HTML file
	trackedFiles.push({
		ele: null,
		attr: null,
		url: document.location.pathname,
		ext: null,
		ts: await fetchLastModifiedTimestamp(document.location.pathname)
	});

	// Track all matching resources
	const earlyElements = Array.from(document.querySelectorAll(resourceSelector));
	for (const el of earlyElements) {
		const attr = el.hasAttribute('src') ? 'src' : el.hasAttribute('href') ? 'href' : el.hasAttribute('data') ? 'data' : null;
		if (!attr) continue;

		const originalUrl = el.getAttribute(attr);
		if (!originalUrl) continue;

		const fullUrl = new URL(originalUrl, window.location.href);
		if (fullUrl.origin !== window.location.origin) continue;

		const ts = await fetchLastModifiedTimestamp(originalUrl);
		if (!ts) continue;

		trackedFiles.push({
			ele: el,
			attr: attr,
			url: originalUrl,
			ext: getFileExtension(originalUrl),
			ts: ts
		});
	}

	// Start periodic check
	setInterval(checkFiles, CHECK_INTERVAL_MS);
	checkFiles();
});
