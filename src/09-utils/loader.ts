// Shared loading UI primitives. Keep the markup here so every component renders
// the same spinner/overlay and picks up styling from `09-utils/_loader.scss`.

export function createSpinner(): HTMLSpanElement {
	const spinner = document.createElement('span');
	spinner.className = 'sapphire-spinner';
	spinner.setAttribute('aria-hidden', 'true');
	return spinner;
}

// Absolutely centered overlay meant to be appended to a positioned container.
export function createLoadingOverlay(): HTMLDivElement {
	const overlay = document.createElement('div');
	overlay.className = 'sapphire-loading-overlay';
	overlay.setAttribute('aria-hidden', 'true');
	overlay.appendChild(createSpinner());
	return overlay;
}
