const scssModules = import.meta.glob(['./01-foundations/**/*.scss', './02-components/**/_styles*.scss', './03-layout-helpers/**/*.scss', './09-utils/**/*.scss']);

Object.keys(scssModules)
	.sort()
	.forEach((path) => {
		scssModules[path]();
	});

import { injectIconSprite } from './core/iconsSprite';

import DropdownMenu from './02-components/dropdownmenu';
import ResponsiveGrid from './02-components/responsive-grid';
import SapphireInput from './02-components/sapphireinput';

function init(): void {
	injectIconSprite();
	console.log('SapphireRWALibrary initialized', new Date());
}

const SapphireRWALibrary = {
	DropdownMenu,
	ResponsiveGrid,
	SapphireInput,
	init,
};

window.SapphireRWALibrary = SapphireRWALibrary;
window.SapphireRWALibrary.init();
