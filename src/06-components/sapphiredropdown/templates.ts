export const tmplPanel = document.createElement('template');
tmplPanel.innerHTML = `
	<div class="sapphiredropdown-panel">
		<div class="sapphiredropdown-search">
			<span class="sapphiredropdown-search-icon" aria-hidden="true"></span>
			<input
				type="text"
				class="sapphiredropdown-search-input"
				autocomplete="off"
				spellcheck="false"
				role="combobox"
				aria-autocomplete="list"
				aria-expanded="true"
			/>
			<span
				class="sapphiredropdown-search-clear"
				role="button"
				aria-label="Clear search"
				tabindex="0"
			></span>
		</div>
		<ul class="sapphiredropdown-list" role="listbox"></ul>
		<div class="sapphiredropdown-empty" hidden></div>
		<div class="sapphiredropdown-loading" aria-hidden="true" hidden>
			<span class="sapphire-spinner" aria-hidden="true"></span>
		</div>
	</div>
`;

export const tmplOption = document.createElement('template');
tmplOption.innerHTML = `
	<li class="sapphiredropdown-option" role="option">
		<span class="sapphiredropdown-option-checkbox" aria-hidden="true"></span>
		<span class="sapphiredropdown-option-icon" aria-hidden="true"></span>
		<span class="sapphiredropdown-option-body">
			<span class="sapphiredropdown-option-label"></span>
			<span class="sapphiredropdown-option-description"></span>
		</span>
	</li>
`;
