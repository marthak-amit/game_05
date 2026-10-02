SS.Game.boot();
SS.UI.refreshMenu();
if (SS.native) { document.body.classList.add('native'); setTimeout(() => SS.Ads.showBanner(), 2500); }
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
