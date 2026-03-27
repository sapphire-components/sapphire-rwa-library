const scssModules = import.meta.glob(['./01-foundations/**/*.scss', './02-outsystems/**/*.scss', './03-helpers/**/*.scss', './04-components/**/*.scss', './09-utils/**/*.scss']);

Object.keys(scssModules)
	.sort()
	.forEach((path) => {
		scssModules[path]();
	});

import { injectIconSprite } from './core/iconsSprite';
import { installBodyPlatformClassStripper } from './core/stripBodyPlatformClasses';

import DropdownMenu from './04-components/dropdownmenu';
import ResponsiveGrid from './04-components/responsive-grid';
import SapphireInput from './04-components/sapphireinput';

function init(): void {
	injectIconSprite();
	installBodyPlatformClassStripper();
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
