import '@core/init-bootstrap';

import { installBodyPlatformClassStripper } from '@core/stripBodyPlatformClasses';
import { installClickCooldown } from '@core/clickCooldown';

import DesignSystemColors from '@/02-designsystem/design-system-screen-colors';
import DesignSystemMenu from '@/02-designsystem/design-system-menu';

import LayoutWrapper from '@/03-core/layout';
import Locale from '@/03-core/locale';

import FilterBar from '@helpers/filterbar';
import LabelValue from '@helpers/labelvalue';
import TableWrapper from '@helpers/tablewrapper';
import InputWrapper from '@helpers/inputwrapper';

import SapphirePopupContent from '@custom-layout/sapphirepopupcontent';
import ScrollableContent from '@custom-layout/scrollablecontent';
import ResponsiveGrid from '@custom-layout/responsive-grid';

import ActionPopup from '@custom-components/actionpopup';
import ButtonChoice from '@custom-components/buttonchoice';
import ButtonDropdown from '@custom-components/buttondropdown';
import Chip from '@custom-components/chip';
import ColorPicker from '@custom-components/colorpicker';
import Country from '@custom-components/country';
import DropdownMenu from '@custom-components/dropdownmenu';
import Overlay from '@custom-components/overlay';
import SapphireDropdown from '@custom-components/sapphiredropdown';
import SapphireInput from '@custom-components/sapphireinput';
import Skeleton from '@custom-components/skeleton';
import TextEditor from '@custom-components/texteditor';
import Toast from '@custom-components/toast';
import WeekDayPicker from '@custom-components/weekdaypicker';
import { Tabs, TabHeader, TabContent } from '@custom-components/tabs';

import PrintDocument from '@custom-patterns/printdocument';

import Helpers from '@utils/helpers';
import { LocalStorageKeys } from '@utils/local-storage-keys';

function init(): void {
	const script = document.querySelector('script#sapphire-rwa-library');

	if (script) {
		console.log('Script alredy exists');
	} else {
		installBodyPlatformClassStripper();
		installClickCooldown();

		const storedLocale: any = Helpers.readFromLocalStorage<string>(LocalStorageKeys.locale);
		window.SapphireRWALibrary.State.locale = storedLocale['localeCode'];
		window.SapphireRWALibrary.State.isRTL = storedLocale['isRTL'];

		const style1 = 'color: #FFA500; font-weight: bold;';
		console.log(`%cSapphireRWALibrary | ${__APP_VERSION__} | ${window.location.pathname}`, style1);
	}
}

const SapphireRWALibrary = {
	ActionPopup,
	ButtonChoice,
	ButtonDropdown,
	Chip,
	ColorPicker,
	Country,
	DesignSystemColors,
	DesignSystemMenu,
	DropdownMenu,
	FilterBar,
	Helpers,
	InputWrapper,
	LabelValue,
	LayoutWrapper,
	Locale,
	Overlay,
	PrintDocument,
	ResponsiveGrid,
	SapphireDropdown,
	SapphireInput,
	SapphirePopupContent,
	ScrollableContent,
	Skeleton,
	TabContent,
	TabHeader,
	TableWrapper,
	Tabs,
	TextEditor,
	Toast: new Toast(),
	WeekDayPicker,
	init,
};

window.SapphireRWALibrary = { ...window.SapphireRWALibrary, ...SapphireRWALibrary };
window.SapphireRWALibrary.init();
