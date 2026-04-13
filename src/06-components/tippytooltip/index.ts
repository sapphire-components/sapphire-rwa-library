import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface ITippyOptions {
	appendTo: any | string;
	arrow: boolean;
	content: HTMLElement | null;
	delay: any | { Hide: number; Show: number };
	flip?: boolean;
	hideOnClick: boolean;
	inlinePositioning: boolean;
	interactive: boolean;
	maxWidth: number | string;
	offset?: [number, number];
	onHide: () => void;
	onShow: (instance: TippyInstance) => void;
	onTrigger: (instance: TippyInstance, event: Event) => void;
	onUntrigger: (instance: TippyInstance, event: Event) => void;
	placement: string;
	popperOptions: {};
	theme: string;
	trigger: string;
}

interface ITippyTooltipConfigOptions extends BaseComponentInit {
	actions: {
		OnHide: () => void;
		OnShow: () => void;
	};
	contentId: string;
	externalTriggerId: string;
	height: number;
	maxHeight: number;
	options: ITippyOptions;
	theme: string;
	triggerId: string;
	width: number;
}

export default class TippyTooltip extends BaseComponent {
	private actions!: ITippyTooltipConfigOptions['actions'];
	private configOptions!: ITippyTooltipConfigOptions;
	private tippyOptions!: ITippyOptions;
	private triggerId!: string;
	tippyInstance!: TippyInstance;

	constructor(configOptions: ITippyTooltipConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('TippyTooltip: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.configOptions = configOptions;

		this.actions = configOptions.actions;
		this.tippyOptions = configOptions.options;

		if (this.configOptions.externalTriggerId) {
			this.triggerId = this.configOptions.externalTriggerId;
			if (this.tippyOptions.trigger.includes('click')) {
				document.getElementById(this.configOptions.externalTriggerId)!.style.cursor = 'pointer';
			}
		} else {
			this.triggerId = this.configOptions.triggerId;
		}

		let bootstrapOptions: Partial<ITippyOptions> = {
			appendTo: this.tippyOptions.appendTo === 'body' ? () => document.body : 'parent',
			arrow: this.tippyOptions.arrow,
			content: document.getElementById(this.configOptions.contentId),
			delay: [this.tippyOptions.delay.Show, this.tippyOptions.delay.Hide],
			hideOnClick: this.tippyOptions.hideOnClick,
			inlinePositioning: true,
			interactive: this.tippyOptions.interactive,
			maxWidth: isNaN(Number(this.tippyOptions.maxWidth)) ? 'none' : Number(this.tippyOptions.maxWidth),
			placement: this.tippyOptions.placement,
			theme: this.tippyOptions.theme,
			trigger: this.tippyOptions.trigger,
			onShow: (_instance: TippyInstance): void => {
				const trigger = _instance.reference as HTMLElement;
				const tooltip = _instance.popper as HTMLElement;

				const width = trigger.getBoundingClientRect().width;
				tooltip.style.setProperty('--trigger-width', `${width}px`);

				this.actions.OnShow();
			},
			onHide: () => {
				this.actions.OnHide();
			},
			onTrigger: (_instance: TippyInstance, event: Event) => {
				event.stopPropagation();
			},
			onUntrigger: (_instance: TippyInstance, event: Event) => {
				event.stopPropagation();
			},
		};

		if (!this.tippyOptions.flip) {
			bootstrapOptions.popperOptions = {
				modifiers: [
					{
						name: 'flip',
						enabled: false,
					},
				],
			};
		}

		this.tippyInstance = window.tippy(document.getElementById(this.triggerId), bootstrapOptions);
	}

	parametersChanged(payload: ITippyTooltipConfigOptions): void {
		console.log(payload);
	}

	destroy() {
		this.tippyInstance?.destroy?.();
	}
}
