// Static game data: skins, biomes, missions, shop products, tuning.
window.SS = window.SS || {};
SS.CFG = {
  // ---- economy / monetisation tuning (change without touching code) ----
  interstitialEveryNRuns: 3,     // show an interstitial every N finished runs
  interstitialMinGapMs: 100000,  // never closer than this
  interstitialSkipFirstRuns: 2,  // grace period for new players
  reviveMinDist: 80,             // metres needed before a revive is offered
  reviveCountdown: 5,            // seconds the player has to accept
  wheelCooldownMs: 8 * 3600 * 1000,
  vipCoinMult: 2,
  dailyRewards: [100, 150, 250, 350, 500, 750, 1500],
};

SS.BIOMES = [
  { name: 'Sunny Meadows', top: '#4cc9f0', bot: '#fff1c1', m1: '#9be28f', m2: '#5ecb77', sea: '#2fb4ff', seaD: '#1b7fd1', stars: 0 },
  { name: 'Sunset Canyon', top: '#ff7a8a', bot: '#ffd7a0', m1: '#e4743c', m2: '#b94a2a', sea: '#ff8a3d', seaD: '#e0471a', stars: 0 },
  { name: 'Candy Clouds', top: '#d79bff', bot: '#ffd1ec', m1: '#f0a6ff', m2: '#d46ce8', sea: '#ff7ac6', seaD: '#d9449b', stars: 0 },
  { name: 'Aurora Night', top: '#16124a', bot: '#2fa4a0', m1: '#3b3a99', m2: '#26246e', sea: '#2aa7e8', seaD: '#1269a8', stars: 1 },
  { name: 'Crystal Deep', top: '#05302f', bot: '#17857b', m1: '#1a9c8e', m2: '#0e6b61', sea: '#3de8cf', seaD: '#14a58f', stars: 1 },
];

// shape: decoration drawn on the sprite. unlock: coins | free | ad | streak | iap
SS.SKINS = [
  { id: 'pip',    name: 'Pip',       c: '#ffd23f', a: '#ff9f1c', t: '#ffe38a', shape: 'blob',  unlock: 'free' },
  { id: 'mochi',  name: 'Mochi',     c: '#ff8fb1', a: '#ff4d8d', t: '#ffc2d6', shape: 'cat',   unlock: 'coins', price: 400 },
  { id: 'minty',  name: 'Minty',     c: '#5eead4', a: '#14b8a6', t: '#b9f6ec', shape: 'bunny', unlock: 'coins', price: 700 },
  { id: 'blue',   name: 'Blueberry', c: '#6c8cff', a: '#3b5bdb', t: '#b6c4ff', shape: 'blob',  unlock: 'coins', price: 1000 },
  { id: 'ember',  name: 'Ember',     c: '#ff7a3d', a: '#e8431a', t: '#ffb88f', shape: 'flame', unlock: 'coins', price: 1500 },
  { id: 'grape',  name: 'Grape',     c: '#b36bff', a: '#7b2fe0', t: '#dcb8ff', shape: 'cat',   unlock: 'coins', price: 2000 },
  { id: 'ghosty', name: 'Ghosty',    c: '#f1f5f9', a: '#94a3b8', t: '#ffffff', shape: 'ghost', unlock: 'coins', price: 3000 },
  { id: 'ninja',  name: 'Shadow',    c: '#334155', a: '#ef4444', t: '#94a3b8', shape: 'ninja', unlock: 'ad', ads: 5 },
  { id: 'goldie', name: 'Goldie',    c: '#fbbf24', a: '#d97706', t: '#fff1a8', shape: 'crown', unlock: 'coins', price: 6000 },
  { id: 'rainbow',name: 'Prism',     c: '#ffffff', a: '#ff4d8d', t: 'rainbow', shape: 'blob', unlock: 'coins', price: 10000 },
  { id: 'streak', name: 'Blaze',     c: '#ff5d5d', a: '#ffd23f', t: 'rainbow', shape: 'flame', unlock: 'streak' },
  { id: 'cosmo',  name: 'Cosmo',     c: '#7c3aed', a: '#22d3ee', t: 'rainbow', shape: 'bunny', unlock: 'iap', product: 'starter_pack' },
];

SS.MISSIONS = [
  { type: 'dist',    text: 'Reach {t}m in one run',     targets: [300, 600, 1000] },
  { type: 'gems',    text: 'Collect {t} gems',          targets: [80, 150, 300] },
  { type: 'chain',   text: 'Reach a x{t} chain',        targets: [8, 15, 25] },
  { type: 'runs',    text: 'Play {t} runs',             targets: [3, 5, 8] },
  { type: 'perfect', text: 'Do {t} perfect launches',   targets: [3, 6, 10] },
  { type: 'near',    text: 'Survive {t} close calls',   targets: [3, 6, 10] },
  { type: 'power',   text: 'Grab {t} power-ups',        targets: [2, 4, 6] },
];

SS.WHEEL = [
  { l: '50',  c: 50,  w: 25, col: '#ffd23f' },
  { l: '100', c: 100, w: 20, col: '#ff8fb1' },
  { l: '🛡️',  b: 'shield', w: 10, col: '#5eead4' },
  { l: '200', c: 200, w: 15, col: '#6c8cff' },
  { l: '75',  c: 75,  w: 15, col: '#ff9f1c' },
  { l: '500', c: 500, w: 6,  col: '#b36bff' },
  { l: '🧲',  b: 'magnet', w: 10, col: '#2fd4a8' },
  { l: '1000',c: 1000,w: 2,  col: '#ef4444' },
];

// price strings are INR display placeholders; real prices come from the store.
SS.PRODUCTS = [
  { id: 'remove_ads',   title: 'Remove Ads',    desc: 'No more interstitials. Rewarded ads stay optional.', price: '₹149', icon: '🚫' },
  { id: 'vip',          title: 'VIP Pass',      desc: 'No ads + 2x coins forever + exclusive Blaze skin.', price: '₹299', icon: '👑', best: true },
  { id: 'starter_pack', title: 'Starter Pack',  desc: '5,000 coins + Cosmo skin + Remove Ads.',            price: '₹99',  icon: '🎁', hot: true },
  { id: 'coins_s',      title: '1,500 Coins',   desc: '', price: '₹49',  icon: '🪙', coins: 1500 },
  { id: 'coins_m',      title: '8,000 Coins',   desc: '', price: '₹199', icon: '💰', coins: 8000 },
  { id: 'coins_l',      title: '25,000 Coins',  desc: '', price: '₹499', icon: '🏆', coins: 25000 },
];
