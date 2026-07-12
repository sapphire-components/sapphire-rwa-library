import spriteMarkup from '@/10-export/icons-sprite.svg?raw';

let injected = false;

export function injectIconSprite(): void {
	if (injected) return;
	if (typeof document === 'undefined') return;

	const existing = document.body.querySelector('svg[data-svg-icon-sprite]');
	if (existing) {
		injected = true;
		return;
	}

	const container = document.createElement('div');
	container.style.position = 'absolute';
	container.style.width = '0';
	container.style.height = '0';
	container.style.overflow = 'hidden';
	container.style.visibility = 'hidden';
	container.innerHTML = spriteMarkup;

	const svg = container.querySelector('svg');
	if (svg) {
		svg.setAttribute('data-svg-icon-sprite', 'true');
	}

	document.body.prepend(container);
	injected = true;
}
