const scssModules = import.meta.glob(['./01-foundations/**/*.scss', './02-components/**/_styles*.scss', './09-utils/**/*.scss']);

Object.keys(scssModules)
	.sort()
	.forEach((path) => {
		scssModules[path]();
	});

import { injectIconSprite } from './core/iconsSprite';

import DropdownMenu from './02-components/dropdownmenu';
import ResponsiveGrid from './02-components/responsive-grid';

function init(): void {
	injectIconSprite();
	console.log('SapphireBackofficeLibrary initialized', new Date());
}

const SapphireBackofficeLibrary = {
	DropdownMenu,
	ResponsiveGrid,
	init,
};

window.SapphireBackofficeLibrary = SapphireBackofficeLibrary;
window.SapphireBackofficeLibrary.init();
