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

import ActionPopup from '@components/actionpopup';
import ButtonDropdown from '@components/buttondropdown';
import Chip from '@components/chip';
import DropdownMenu from '@components/dropdownmenu';
import Overlay from '@components/overlay';
import ResponsiveGrid from '@components/responsive-grid';
import SapphireDropdown from '@components/sapphiredropdown';
import SapphireInput from '@components/sapphireinput';
import SapphirePopupContent from '@components/sapphirepopupcontent';
import ScrollableContent from '@components/scrollablecontent';
import Skeleton from '@components/skeleton';
import TextEditor from '@components/texteditor';
import Toast from '@components/toast';
import WeekDayPicker from '@components/weekdaypicker';
import { Tabs, TabHeader, TabContent } from '@components/tabs';

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
	ButtonDropdown,
	Chip,
	DesignSystemColors,
	DesignSystemMenu,
	DropdownMenu,
	FilterBar,
	Helpers,
	LabelValue,
	LayoutWrapper,
	Locale,
	Overlay,
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
