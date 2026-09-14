export function getToolbarTemplate(
	options: {
		align?: boolean;
		background?: boolean;
		bold?: boolean;
		clean?: boolean;
		color?: boolean;
		italic?: boolean;
		listBullet?: boolean;
		listOrdered?: boolean;
		size?: boolean;
		strike?: boolean;
		underline?: boolean;
		table?: boolean;
	} = {},
) {
	return `
<div class="texteditor-toolbar">
  <div class="texteditor-toolbar-left">
    ${
					options.size
						? `
    <select name="texteditor-size" class="ql-size">
        <option value="huge">Huge</option>
        <option value="large">Large</option>
        <option selected>Regular</option>
        <option value="small">Small</option>
    </select>`
						: ''
				}
    ${options.bold ? '<button class="ql-bold"></button>' : ''}
    ${options.italic ? '<button class="ql-italic"></button>' : ''}
    ${options.underline ? '<button class="ql-underline"></button>' : ''}
    ${options.strike ? '<button class="ql-strike"></button>' : ''}
    ${
					options.color
						? `
    <select name="texteditor-color" class="ql-color">
      <option selected></option>
      <option value="rgb(255, 255, 255)"></option>
      <option value="rgb(250, 204, 204)"></option>
      <option value="rgb(255, 235, 204)"></option>
      <option value="rgb(255, 255, 204)"></option>
      <option value="rgb(204, 232, 204)"></option>
      <option value="rgb(204, 224, 245)"></option>
      <option value="rgb(235, 214, 255)"></option>
      <option value="rgb(187, 187, 187)"></option>
      <option value="rgb(240, 102, 102)"></option>
      <option value="rgb(255, 194, 102)"></option>
      <option value="rgb(255, 255, 102)"></option>
      <option value="rgb(102, 185, 102)"></option>
      <option value="rgb(102, 163, 224)"></option>
      <option value="rgb(194, 133, 255)"></option>
      <option value="rgb(136, 136, 136)"></option>
      <option value="rgb(161, 0, 0)"></option>
      <option value="rgb(178, 107, 0)"></option>
      <option value="rgb(178, 178, 0)"></option>
      <option value="rgb(0, 97, 0)"></option>
      <option value="rgb(0, 71, 178)"></option>
      <option value="rgb(107, 36, 178)"></option>
      <option value="rgb(68, 68, 68)"></option>
    </select>`
						: ''
				}
    ${
					options.background
						? `
    <select name="texteditor-background" class="ql-background">
      <option selected></option>
      <option value="rgb(255, 255, 255)"></option>
      <option value="rgb(250, 204, 204)"></option>
      <option value="rgb(255, 235, 204)"></option>
      <option value="rgb(255, 255, 204)"></option>
      <option value="rgb(204, 232, 204)"></option>
      <option value="rgb(204, 224, 245)"></option>
      <option value="rgb(235, 214, 255)"></option>
      <option value="rgb(187, 187, 187)"></option>
      <option value="rgb(240, 102, 102)"></option>
      <option value="rgb(255, 194, 102)"></option>
      <option value="rgb(255, 255, 102)"></option>
      <option value="rgb(102, 185, 102)"></option>
      <option value="rgb(102, 163, 224)"></option>
      <option value="rgb(194, 133, 255)"></option>
      <option value="rgb(136, 136, 136)"></option>
      <option value="rgb(161, 0, 0)"></option>
      <option value="rgb(178, 107, 0)"></option>
      <option value="rgb(178, 178, 0)"></option>
      <option value="rgb(0, 97, 0)"></option>
      <option value="rgb(0, 71, 178)"></option>
      <option value="rgb(107, 36, 178)"></option>
      <option value="rgb(68, 68, 68)"></option>
    </select>`
						: ''
				}
    ${
					options.align
						? `
    <select name="texteditor-align" class="ql-align">
        <option selected></option>
        <option value="center">Centralizar</option>
        <option value="right">Direita</option>
        <option value="justify">Justificar</option>
    </select>`
						: ''
				}
    ${options.listOrdered ? '<button class="ql-list" value="ordered"></button>' : ''}
    ${options.listBullet ? '<button class="ql-list" value="bullet"></button>' : ''}
    ${options.table ? '<button class="ql-table-better"></button>' : ''}
    ${options.clean ? '<button class="ql-clean"></button>' : ''}


  </div>


</div>
`;
}
