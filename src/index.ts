import './core/init-bootstrap';

import { injectIconSprite } from './core/iconsSprite';
import { installBodyPlatformClassStripper } from './core/stripBodyPlatformClasses';

import ButtonDropdown from './06-components/buttondropdown';
import DesignSystemColors from './03-designsystem/_designsystem-screen-colors';
import DropdownMenu from './06-components/dropdownmenu';
import FilterBar from './05-helpers/filterbar';
import Helpers from './09-utils/helpers';
import LabelValue from './05-helpers/labelvalue';
import LayoutWrapper from './02-core/layout';
import Overlay from './06-components/overlay';
import ResponsiveGrid from './06-components/responsive-grid';
import SapphireInput from './06-components/sapphireinput';
import SapphireIntl from './02-core/SapphireIntl';
import SapphirePopupContent from './06-components/sapphirepopupcontent';
import ScrollableContent from './06-components/scrollablecontent';
import TableWrapper from './05-helpers/tablewrapper';
import Toast from './06-components/toast';
import { LocalStorageKeys } from './09-utils/local-storage-keys';
import { Tabs, TabHeader, TabContent } from './06-components/tabs';

function init(): void {
	injectIconSprite();
	installBodyPlatformClassStripper();

	const storedLocale: any = Helpers.readFromLocalStorage<string>(LocalStorageKeys.locale);
	window.SapphireRWALibrary.State.locale = storedLocale['localeCode'];
	window.SapphireRWALibrary.State.isRTL = storedLocale['isRTL'];

	const style1 = 'color: #FFA500; font-weight: bold;';
	console.log(`%cSapphireRWALibrary | ${__APP_VERSION__} | ${window.location.pathname}`, style1);
}

const SapphireRWALibrary = {
	ButtonDropdown,
	DesignSystemColors,
	DropdownMenu,
	FilterBar,
	Helpers,
	LabelValue,
	LayoutWrapper,
	Overlay,
	ResponsiveGrid,
	SapphireInput,
	SapphireIntl,
	SapphirePopupContent,
	ScrollableContent,
	TabContent,
	TabHeader,
	TableWrapper,
	Tabs,
	Toast: new Toast(),
	init,
};

window.SapphireRWALibrary = { ...window.SapphireRWALibrary, ...SapphireRWALibrary };
window.SapphireRWALibrary.init();
