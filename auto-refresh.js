/**********************/
/*** Auto-Refresh	***/
/**********************/

// Time interval for checks
const CHECK_INTERVAL_MS = 1000; 
// Array to store URLs and their last known Last-Modified timestamps
const trackedFiles = []; 
// Define a elemnts selector string
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
/*** Functions		***/
/**********************/

// Send a HEAD request to fetch the last modification time
async function fetchLastModifiedTimestamp(url) {
	try {
		const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' }); // Fetch headers without caching
		const lastMod = res.headers.get('Last-Modified'); // Get the Last-Modified header
		if (!lastMod) throw new Error('No Last-Modified header'); // Error if header is missing
		return new Date(lastMod).getTime(); // Return the modification time as a timestamp
	} catch (err) {
		console.warn(`[AutoReload] Failed to fetch ${url}`, err); // Log error if request fails
		return null; // Return null on failure
	}
}

// Extract the file extension from the URL
function getFileExtension(url) {
	return url.split('.').pop().split('?')[0].toLowerCase(); // Get the part after the last dot and before query parameters, then convert to lowercase
}

// Rebuild the URL by adding or updating the 'x' query parameter with the given timestamp
function rebuildUrl(originalUrl, ts) {
	const [path, query] = originalUrl.split('?'); // Split the URL into path and query parts
	const params = new URLSearchParams(query || ''); // Parse the query string
	params.set('x', ts); // Set or update the 'x' parameter with the timestamp
	return `${path}?${params.toString()}`; // Return the rebuilt URL with the updated query string
}

// Refresh the element by updating its URL if the file has changed
function refreshTrackedFile(index) {
    let item = trackedFiles[index];
    let newUrl = rebuildUrl(item.url, item.ts);
    
    switch (item.ext) {
        case 'css':
            refreshCss(item, newUrl);
            break;
        case 'js':
            refreshJs(index, item, newUrl);
            break;
        case 'iframe': // else if (item.ele.tagName.toLowerCase() === 'iframe') {
            refreshIframe(item, newUrl);
            break;
        default:
            item.ele.setAttribute(item.attr, newUrl);
            break;
    }
}
function refreshCss(item, newUrl) {
    item.ele.setAttribute(item.attr, newUrl);
}
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
function refreshIframe(item, newUrl) {
    item.ele.setAttribute(item.attr, newUrl);
}


// Checks if files (HTML, JS, CSS, etc.) have been updated and reloads them if necessary.
async function checkFiles() {
	
	/**
	* Step 1 – Check if the HTML file has changed
	* 0 is alawys the main file
	**/
	if (trackedFiles[0].ts < await fetchLastModifiedTimestamp(trackedFiles[0].url))
		location.reload();
	
	/**
	/* Step 2 – Check other files (JS, CSS, images, etc.)
	**/
	for (let [index, item] of trackedFiles.entries()) {
		if (index === 0) 
			continue;
		let newTimestamp = await fetchLastModifiedTimestamp(item.url);
		if (item.ts >= newTimestamp)
			continue;
		trackedFiles[index].ts = newTimestamp;
		refreshTrackedFile(index);
	}


}



/**********************/
/*** Execution		***/
/**********************/
document.addEventListener('DOMContentLoaded', async () => {
	
	/**
	** Convert all non-module script tags to type="module" (to isolate scope per file)
	** This ensures any scripts with a src attribute but missing type="module" are treated as ES modules
	**/
	
	document.querySelectorAll('script[src]:not([type="module"])').forEach(script => script.type = 'module');
	
	/**
	** Fetch the last modified timestamp of the current HTML file from the server
	** Used for detecting updates or changes to the page content
	**/
	trackedFiles.push({
		ele: null,
		attr: null,
		url: document.location.pathname,
		ext: null,
		ts: await fetchLastModifiedTimestamp(document.location.pathname)
	});
	
	/**
	** Loop on each element in resources elements selector and set item trackedFiles
	**/
	const earlyElements = Array.from(document.querySelectorAll(resourceSelector));
	for (const el of earlyElements) {
		const attr = el.hasAttribute('src') ? 'src' : el.hasAttribute('href') ? 'href' : el.hasAttribute('data') ? 'data' : null;
		if (!attr) continue; // Skip if no valid attribute

		const originalUrl = el.getAttribute(attr); // Get the original URL
		if (!originalUrl) continue; // Skip if URL is empty

		const fullUrl = new URL(originalUrl, window.location.href); // Resolve the full URL
		if (fullUrl.origin !== window.location.origin) continue; // Skip external URLs

		const ts = await fetchLastModifiedTimestamp(originalUrl); // Get the last modified timestamp of the file
		if (!ts) continue; // Skip if timestamp is unavailable

		trackedFiles.push({
			ele: el,
			attr: attr,
			url: originalUrl,
			ext: getFileExtension(originalUrl),
			ts: ts
		});
	}
	// Step 2 – Periodically check for changes
	setInterval(checkFiles, CHECK_INTERVAL_MS); // Set an interval to check every X seconds
	checkFiles(); // Initial check when the page loads
});