import CKEditor from './07-custom-components/inputcontrols/ckeditor';

const style = 'color: #FFA500; font-weight: bold;';
console.log(`%cSapphireRWACKEditor | ${__APP_VERSION__} | ${window.location.pathname}`, style);

window.SapphireRWALibrary = window.SapphireRWALibrary || {};
window.SapphireRWALibrary.CKEditor = CKEditor;
