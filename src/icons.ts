import { injectIconSprite } from '@core/iconsSprite';

const style = 'color: #FFA500; font-weight: bold;';
console.log(`%cSapphireRWAIcons | ${__APP_VERSION__} | ${window.location.pathname}`, style);

window.SapphireRWAIcons = { inject: injectIconSprite };
injectIconSprite();
