// import Helpers from '../../09-utils/helpers';
// import type LayoutWrapper from '../layoutwrapper';
// import { LocalStorageKeys } from '../../09-utils/local-storage-keys';

// export default class LocaleManager {
// 	private locale: string = 'en';
// 	private layoutWrapper: LayoutWrapper;

// 	constructor(layoutWrapper: LayoutWrapper) {
// 		this.layoutWrapper = layoutWrapper;
// 		const htmlEl = document.documentElement;

// 		const observer = new MutationObserver((mutations) => {
// 			for (const mutation of mutations) {
// 				if (mutation.type === 'attributes') {
// 					const attrName = mutation.attributeName;
// 					const newValue = htmlEl.getAttribute(attrName);
// 					const oldValue = mutation.oldValue;
// 					console.log('Attribute changed', 'name:', attrName);
// 					console.log('old:', oldValue, 'new:', newValue);
// 				}
// 			}
// 		});

// 		observer.observe(htmlEl, {
// 			attributes: true,
// 			attributeOldValue: true,
// 			subtree: false,
// 			attributeFilter: ['lang'],
// 		});

// 		this.initialize();
// 	}

// 	initialize(): void {
// 		console.log('LocaleManager.initialize');
// 		this.locale = Helpers.readFromLocalStorage<string>(LocalStorageKeys.locale) || 'ar-KW';
// 		// this.updateDOM();
// 	}

// 	setLocale(locale: string): void {
// 		this.locale = locale;
// 		console.log('LocaleManager.setLocale a', locale);
// 		Helpers.writeToLocalStorage(LocalStorageKeys.locale, locale);
// 		console.log('LocaleManager.setLocale b', this.layoutWrapper);
// 		this.layoutWrapper.setLocale(locale);
// 		// this.updateDOM();
// 	}

// 	// updateDOM(): void {
// 	// 	document.documentElement.lang = this.locale;
// 	// 	if (this.locale === 'ar') {
// 	// 		document.body.classList.add('is-rtl');
// 	// 		document.body.classList.remove('is-ltr');
// 	// 		document.documentElement.dir = 'rtl';
// 	// 	} else {
// 	// 		document.body.classList.add('is-ltr');
// 	// 		document.body.classList.remove('is-rtl');
// 	// 		document.documentElement.dir = 'ltr';
// 	// 	}
// 	// }
// }
