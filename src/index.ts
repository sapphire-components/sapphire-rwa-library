import './core/init-bootstrap';

// SCSS partials are compiled into dist/sapphire-rwa-library.css by the
// `scss-bundle` Vite plugin (see vite.config.js). They are intentionally NOT
// imported here — Vite's lib + cssCodeSplit:false path drops CSS source maps,
// so the plugin owns SCSS compilation end-to-end.

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
import { Tabs, TabHeader, TabContent } from './06-components/tabs';

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
	TabContent,
	TabHeader,
	TableWrapper,
	Tabs,
	TippyTooltip,
	Toast: new Toast(),
	init,
};

window.SapphireRWALibrary = { ...window.SapphireRWALibrary, ...SapphireRWALibrary };
window.SapphireRWALibrary.init();
