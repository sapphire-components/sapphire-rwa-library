import '@core/favicon';
import '@core/init-bootstrap';

import { installBodyPlatformClassStripper } from '@core/stripBodyPlatformClasses';
import { installClickCooldown } from '@core/clickCooldown';

import DesignSystemColors from '@/02-designsystem/design-system-screen-colors';
import DesignSystemMenu from '@/02-designsystem/design-system-menu';

import LayoutWrapper from '@/03-core/layout';
import Locale from '@/03-core/locale';

import BackofficeHeader from '@helpers/backofficeheader';
import FilterBar from '@helpers/filterbar';
import InputWrapper from '@helpers/inputwrapper';
import LabelValue from '@helpers/labelvalue';
import TableWrapper from '@helpers/tablewrapper';
import TitleLeadCaption from '@helpers/titleleadcaption';

import ActionPopup from '@/07-custom-components/overlay/actionpopup';
import AlertBar from '@/07-custom-components/feedback/alertbar';
import Autocomplete from '@/07-custom-components/inputcontrols/autocomplete';
import ButtonChoice from '@/07-custom-components/buttons/buttonchoice';
import ButtonDropdown from '@/07-custom-components/buttons/buttondropdown';
import Chip from '@/07-custom-components/buttons/chip';
import ColorPicker from '@/07-custom-components/utilities/colorpicker';
import Country from '@/07-custom-components/utilities/country';
import DropdownMenu from '@/07-custom-components/navigation/dropdownmenu';
import HourPicker from '@/07-custom-components/datetime/hourpicker';
import MasterDetail from '@custom-components/masterdetail';
import Overlay from '@/07-custom-components/overlay/overlay';
import PhoneInput from '@/07-custom-components/inputcontrols/phoneinput';
import PopupContent from '@/07-custom-components/overlay/popupcontent';
import ResponsiveContainers from '@/07-custom-components/layout/responsive-containers';
import SapphireCard from '@/07-custom-components/datadisplay/sapphirecard';
import SapphireDropdown from '@/07-custom-components/inputcontrols/sapphiredropdown';
import SapphireInput from '@/07-custom-components/inputcontrols/sapphireinput';
import ScrollableContent from '@/07-custom-components/layout/scrollablecontent';
import SidePanel from '@/07-custom-components/overlay/sidepanel';
import Skeleton from '@/07-custom-components/feedback/skeleton';
import Status from '@/07-custom-components/feedback/status';
import Toast from '@/07-custom-components/feedback/toast';
import WeekDayPicker from '@/07-custom-components/datetime/weekdaypicker';
import Iframe from '@/07-custom-components/datadisplay/iframe';
import { Tabs, TabHeader, TabContent } from '@/07-custom-components/navigation/tabs';

import Filters from '@custom-patterns/filters';
import MultiLevel from '@/08-custom-patterns/multilevel';
import LazyList from '@custom-patterns/lazylist';
import PrintDocument from '@custom-patterns/printdocument';
import WhoWhenWhereLog from '@/08-custom-patterns/whowhenwherelog';

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
	Autocomplete,
	BackofficeHeader,
	ButtonChoice,
	ButtonDropdown,
	Chip,
	ColorPicker,
	Country,
	DesignSystemColors,
	DesignSystemMenu,
	DropdownMenu,
	Filters,
	FilterBar,
	Helpers,
	HourPicker,
	InputWrapper,
	LabelValue,
	LayoutWrapper,
	LazyList,
	Locale,
	MasterDetail,
	MultiLevel,
	Overlay,
	Iframe,
	PhoneInput,
	PopupContent,
	PrintDocument,
	ResponsiveContainers,
	SapphireCard,
	SapphireDropdown,
	SapphireInput,
	ScrollableContent,
	SidePanel,
	Skeleton,
	Status,
	TabContent,
	TabHeader,
	TitleLeadCaption,
	TableWrapper,
	Tabs,
	Toast: new Toast(),
	WeekDayPicker,
	WhoWhenWhereLog,
	init,
};

window.SapphireRWALibrary = { ...window.SapphireRWALibrary, ...SapphireRWALibrary };
window.SapphireRWALibrary.init();
