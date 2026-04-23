import './core/init-bootstrap';

const scssModules = import.meta.glob([
	'./01-foundations/**/*.scss',
	'./02-core/**/*.scss',
	'./03-designsystem/**/*.scss',
	'./04-outsystems/**/*.scss',
	'./05-helpers/**/*.scss',
	'./06-components/**/*.scss',
	'./09-utils/**/*.scss',
]);

Object.keys(scssModules)
	.sort()
	.forEach((path) => {
		scssModules[path]();
	});

import { injectIconSprite } from './core/iconsSprite';
import { installBodyPlatformClassStripper } from './core/stripBodyPlatformClasses';

import ButtonDropdown from './06-components/buttondropdown';
import DesignSystemColors from './03-designsystem/_designsystem-colors';
import DropdownMenu from './06-components/dropdownmenu';
import FilterBar from './05-helpers/filterbar';
import Helpers from './09-utils/helpers';
import LayoutWrapper from './02-core/layoutwrapper';
import ResponsiveGrid from './06-components/responsive-grid';
import SapphireInput from './06-components/sapphireinput';
import SapphireIntl from './02-core/SapphireIntl';
import SapphirePopupContent from './06-components/sapphirepopupcontent';
import TableWrapper from './05-helpers/tablewrapper';
import TippyTooltip from './06-components/tippytooltip';
import Toast from './06-components/toast';
import { LocalStorageKeys } from './09-utils/local-storage-keys';

function init(): void {
	injectIconSprite();
	installBodyPlatformClassStripper();

	const storedLocale: any = Helpers.readFromLocalStorage<string>(LocalStorageKeys.locale);
	window.SapphireRWALibrary.State.locale = storedLocale['localeCode'];

	console.log('SapphireRWALibrary initialized', new Date());
}

const SapphireRWALibrary = {
	ButtonDropdown,
	DesignSystemColors,
	DropdownMenu,
	FilterBar,
	LayoutWrapper,
	ResponsiveGrid,
	SapphireInput,
	SapphireIntl,
	SapphirePopupContent,
	TableWrapper,
	TippyTooltip,
	Toast: new Toast(),
	init,
};

window.SapphireRWALibrary = { ...window.SapphireRWALibrary, ...SapphireRWALibrary };
window.SapphireRWALibrary.init();
