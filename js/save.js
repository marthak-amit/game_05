// Persistent save (localStorage) + tiny helpers.
(function () {
  const KEY = 'slingsprite.v1';
  const def = () => ({
    coins: 0, best: 0, gems: 0, runs: 0, deaths: 0, skin: 'pip', owned: ['pip'],
    adsRemoved: false, vip: false, daily: { last: '', streak: 0 }, wheelNext: 0,
    missions: { date: '', list: [] }, settings: { sound: true, music: true, haptic: true },
    tutorial: false, bestDist: 0, xp: 0, level: 1, boost: null, adWatch: {}, lastInter: 0, runsSinceInter: 0,
  });
  let data;
  try { data = Object.assign(def(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { data = def(); }
  SS.save = data;
  SS.persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
  SS.today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  SS.addCoins = n => { data.coins += n; SS.persist(); };
  SS.track = (ev, props) => { /* hook up Firebase / GameAnalytics here */ if (SS.debug) console.log('[track]', ev, props || ''); };
  SS.fmt = n => Math.floor(n).toLocaleString('en-IN');
})();

SS.xpNeed = lvl => 120 + 80 * (lvl - 1);
// returns {levels:[...gained level numbers]}
SS.addXp = n => { const d = SS.save, up = []; d.xp += n; while (d.xp >= SS.xpNeed(d.level)) { d.xp -= SS.xpNeed(d.level); d.level++; d.coins += 100 * d.level; up.push(d.level); } SS.persist(); return up; };
