import TextEditor from './07-custom-components/inputcontrols/texteditor';

const style = 'color: #FFA500; font-weight: bold;';
console.log(`%cSapphireRWATextEditor | ${__APP_VERSION__} | ${window.location.pathname}`, style);

window.SapphireRWALibrary = window.SapphireRWALibrary || {};
window.SapphireRWALibrary.TextEditor = TextEditor;
