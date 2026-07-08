export const tmplActionPopup = document.createElement('template');
tmplActionPopup.innerHTML = `
	<div class="actionpopup-backdrop" role="presentation" hidden>
		<div class="actionpopup-dialog" role="dialog" aria-modal="true" tabindex="-1">
			<button type="button" class="actionpopup-close btn btn-icon btn-tertiary" aria-label="Close"></button>
			<div class="actionpopup-header">
				<h2 class="actionpopup-title"></h2>
			</div>
			<div class="actionpopup-body">
				<div class="actionpopup-message"></div>
				<div class="actionpopup-content-slot"></div>
			</div>
			<div class="actionpopup-footer">
				<button type="button" class="actionpopup-btn actionpopup-cancel btn btn-tertiary" hidden></button>
				<button type="button" class="actionpopup-btn actionpopup-no btn btn-destructive-secondary" hidden></button>
				<button type="button" class="actionpopup-btn actionpopup-yes btn btn-primary" hidden></button>
			</div>
		</div>
	</div>
`;
