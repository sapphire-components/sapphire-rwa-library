import './core/init-bootstrap';

import { injectIconSprite } from './core/iconsSprite';
import { installBodyPlatformClassStripper } from './core/stripBodyPlatformClasses';
import { installClickCooldown } from './core/clickCooldown';

import DesignSystemColors from './02-designsystem/_designsystem-screen-colors';

import LayoutWrapper from './03-core/layout';
import SapphireIntl from './03-core/SapphireIntl';

import FilterBar from './05-helpers/filterbar';
import LabelValue from './05-helpers/labelvalue';
import TableWrapper from './05-helpers/tablewrapper';

import ActionPopup from './06-components/actionpopup';
import ButtonDropdown from './06-components/buttondropdown';
import Chip from './06-components/chip';
import DropdownMenu from './06-components/dropdownmenu';
import Overlay from './06-components/overlay';
import ResponsiveGrid from './06-components/responsive-grid';
import SapphireDropdown from './06-components/sapphiredropdown';
import SapphireInput from './06-components/sapphireinput';
import SapphirePopupContent from './06-components/sapphirepopupcontent';
import ScrollableContent from './06-components/scrollablecontent';
import TextEditor from './06-components/texteditor';
import Toast from './06-components/toast';
import { Tabs, TabHeader, TabContent } from './06-components/tabs';

import Helpers from './09-utils/helpers';
import { LocalStorageKeys } from './09-utils/local-storage-keys';

function init(): void {
	injectIconSprite();
	installBodyPlatformClassStripper();
	installClickCooldown();

	const storedLocale: any = Helpers.readFromLocalStorage<string>(LocalStorageKeys.locale);
	window.SapphireRWALibrary.State.locale = storedLocale['localeCode'];
	window.SapphireRWALibrary.State.isRTL = storedLocale['isRTL'];

	const style1 = 'color: #FFA500; font-weight: bold;';
	console.log(`%cSapphireRWALibrary | ${__APP_VERSION__} | ${window.location.pathname}`, style1);
}

const SapphireRWALibrary = {
	ActionPopup,
	ButtonDropdown,
	Chip,
	DesignSystemColors,
	DropdownMenu,
	FilterBar,
	Helpers,
	LabelValue,
	LayoutWrapper,
	Overlay,
	ResponsiveGrid,
	SapphireDropdown,
	SapphireInput,
	SapphireIntl,
	SapphirePopupContent,
	ScrollableContent,
	TabContent,
	TabHeader,
	TableWrapper,
	Tabs,
	TextEditor,
	Toast: new Toast(),
	init,
};

window.SapphireRWALibrary = { ...window.SapphireRWALibrary, ...SapphireRWALibrary };
window.SapphireRWALibrary.init();
