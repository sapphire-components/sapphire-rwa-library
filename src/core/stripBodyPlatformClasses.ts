const PLATFORM_BODY_CLASSES_TO_STRIP = ['desktop', 'phone', 'tablet', 'landscape', 'portrait'] as const;

function stripPlatformClassesFromBody(): void {
	const body = document.body;
	if (!body) {
		return;
	}
	for (const cls of PLATFORM_BODY_CLASSES_TO_STRIP) {
		if (body.classList.contains(cls)) {
			body.classList.remove(cls);
		}
	}
}

export function installBodyPlatformClassStripper(): void {
	const body = document.body;
	if (!body) {
		document.addEventListener('DOMContentLoaded', () => installBodyPlatformClassStripper(), { once: true });
		return;
	}

	stripPlatformClassesFromBody();

	const observer = new MutationObserver(() => {
		stripPlatformClassesFromBody();
	});

	observer.observe(body, {
		attributes: true,
		attributeFilter: ['class'],
	});
}
