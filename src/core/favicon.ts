import faviconSvg from '@/00-assets/favicon.svg?raw';

const FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;

function setScreenFavicon(): void {
	const head = document.head;
	if (!head) return;

	head.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]').forEach((link) => {
		link.remove();
	});

	const link = document.createElement('link');
	link.rel = 'icon';
	link.type = 'image/svg+xml';
	link.href = FAVICON_HREF;
	head.appendChild(link);
}

setScreenFavicon();
