import '@core/init-bootstrap';

import { installBodyPlatformClassStripper } from '@core/stripBodyPlatformClasses';
import { installClickCooldown } from '@core/clickCooldown';

import DesignSystemColors from '@/02-designsystem/design-system-screen-colors';
import DesignSystemMenu from '@/02-designsystem/design-system-menu';

import LayoutWrapper from '@/03-core/layout';
import Locale from '@/03-core/locale';

import FilterBar from '@helpers/filterbar';
import InputWrapper from '@helpers/inputwrapper';
import LabelValue from '@helpers/labelvalue';
import TableWrapper from '@helpers/tablewrapper';

import PopupContent from '@/07-custom-components/overlay/popupcontent';
import ResponsiveGrid from '@/07-custom-components/layout/responsive-grid';
import ScrollableContent from '@/07-custom-components/layout/scrollablecontent';

import ActionPopup from '@/07-custom-components/overlay/actionpopup';
import AlertBar from '@/07-custom-components/feedback/alertbar';
import ButtonChoice from '@/07-custom-components/buttons/buttonchoice';
import ButtonDropdown from '@/07-custom-components/buttons/buttondropdown';
import Chip from '@/07-custom-components/buttons/chip';
import ColorPicker from '@/07-custom-components/utilities/colorpicker';
import Country from '@/07-custom-components/utilities/country';
import DropdownMenu from '@/07-custom-components/navigation/dropdownmenu';
import HourPicker from '@/07-custom-components/datetime/hourpicker';
import MasterDetail from '@custom-components/masterdetail';
import Overlay from '@/07-custom-components/overlay/overlay';
import SapphireDropdown from '@/07-custom-components/inputcontrols/sapphiredropdown';
import SapphireInput from '@/07-custom-components/inputcontrols/sapphireinput';
import Skeleton from '@/07-custom-components/feedback/skeleton';
import Status from '@/07-custom-components/feedback/status';
import TextEditor from '@/07-custom-components/inputcontrols/texteditor';
import Toast from '@/07-custom-components/feedback/toast';
import WeekDayPicker from '@/07-custom-components/datetime/weekdaypicker';
import { Tabs, TabHeader, TabContent } from '@/07-custom-components/navigation/tabs';

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
	AlertBar,
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
	HourPicker,
	InputWrapper,
	LabelValue,
	LayoutWrapper,
	Locale,
	MasterDetail,
	Overlay,
	PopupContent,
	PrintDocument,
	ResponsiveGrid,
	SapphireDropdown,
	SapphireInput,
	ScrollableContent,
	Skeleton,
	Status,
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
