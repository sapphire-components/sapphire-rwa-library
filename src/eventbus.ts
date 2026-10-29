// Standalone entry, so OutSystems Traditional apps can load it without the Reactive library.

import SapphireEventBus from '@/03-core/sapphireeventbus';

// Reuse the existing bus if the script is loaded twice in the same window.
window.SapphireEventBus ??= new SapphireEventBus('sapphire-events');

const style = 'color: #FFA500; font-weight: bold;';
console.log(`%cSapphireEventBus | ${__APP_VERSION__} | ${window.location.pathname}`, style);
