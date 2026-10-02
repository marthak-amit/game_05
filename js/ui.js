// Screens, modals, meta-game (missions, daily gift, wheel, skins, shop).
(function () {
  const $ = id => document.getElementById(id), save = SS.save, Game = SS.Game;
  const show = (id, v) => $(id).classList.toggle('hidden', !v);
  const toast = s => { const t = $('toast'); t.textContent = s; t.classList.remove('hidden'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 1800); };
  SS.toast = toast;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ----- seeded missions -----
  function rng(seed) { let a = 0; for (const c of seed) a = (a * 31 + c.charCodeAt(0)) | 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function ensureMissions() {
    if (save.missions.date === SS.today()) return;
    const r = rng(SS.today()), pool = SS.MISSIONS.slice(), list = [];
    for (let i = 0; i < 3; i++) { const m = pool.splice((r() * pool.length) | 0, 1)[0]; list.push({ type: m.type, text: m.text, t: m.targets[i], p: 0, done: false, reward: [100, 200, 350][i] }); }
    save.missions = { date: SS.today(), list }; SS.persist();
  }
  function applyRun(run, dist) {
    ensureMissions();
    for (const m of save.missions.list) {
      if (m.done) continue;
      const v = { dist: dist, chain: run.maxChain }[m.type];
      if (v !== undefined) m.p = Math.max(m.p, v);
      else m.p += { gems: run.gems, runs: 1, perfect: run.perfect, near: run.near, power: run.power }[m.type] || 0;
      m.p = Math.min(m.p, m.t);
    }
    SS.persist();
  }
  const missionsReady = () => save.missions.list.filter(m => m.p >= m.t && !m.done).length;
  const dailyReady = () => save.daily.last !== SS.today();
  const wheelReady = () => Date.now() >= save.wheelNext;

  function refreshMenu() {
    ensureMissions();
    document.querySelectorAll('.coinsV').forEach(e => e.textContent = SS.fmt(save.coins));
    $('menuBest').textContent = SS.fmt(save.best);
    const n = missionsReady(); $('bMis').textContent = n; show('bMis', n > 0);
    show('bDaily', dailyReady()); show('bWheel', wheelReady());
    const c = $('menuSprite').getContext('2d'); c.clearRect(0, 0, 140, 140);
    Game.drawBlob(c, 70, 78, 44, SS.SKINS.find(s => s.id === save.skin), { vx: 80, blink: 1 });
  }

  // ----- modal plumbing -----
  function openModal(title, html, bind) { $('mTitle').textContent = title; $('mBody').innerHTML = html; show('modal', true); bind && bind($('mBody')); SS.Sfx.click(); }
  function closeModal() { show('modal', false); $('mBody').innerHTML = ''; refreshMenu(); }
  $('mClose').onclick = closeModal;
  $('modal').addEventListener('pointerdown', e => { if (e.target === $('modal')) closeModal(); });

  // ----- skins -----
  function skinsModal() {
    const draw = () => {
      $('mBody').innerHTML = '<div class="grid">' + SS.SKINS.map(s => {
        const own = save.owned.includes(s.id), sel = save.skin === s.id;
        let tag = own ? (sel ? '<span class="tag ok">EQUIPPED</span>' : '<span class="tag ok">USE</span>')
          : s.unlock === 'coins' ? `<span class="tag">🪙 ${SS.fmt(s.price)}</span>`
          : s.unlock === 'ad' ? `<span class="tag ad">🎬 ${save.adWatch[s.id] || 0}/${s.ads}</span>`
          : s.unlock === 'streak' ? '<span class="tag lock">7-day streak</span>' : '<span class="tag lock">Starter Pack</span>';
        return `<div class="item ${sel ? 'sel' : ''}" data-id="${s.id}"><canvas width="144" height="144" data-sk="${s.id}"></canvas><div>${s.name}</div>${tag}</div>`;
      }).join('') + '</div>';
      document.querySelectorAll('canvas[data-sk]').forEach(cv => Game.drawBlob(cv.getContext('2d'), 72, 80, 40, SS.SKINS.find(s => s.id === cv.dataset.sk), { vx: 60, blink: 1 }));
      document.querySelectorAll('.item').forEach(el => el.onclick = () => pick(el.dataset.id));
    };
    const pick = id => {
      const s = SS.SKINS.find(x => x.id === id);
      if (save.owned.includes(id)) { save.skin = id; SS.persist(); SS.Sfx.click(); return draw(); }
      if (s.unlock === 'coins') { if (save.coins >= s.price) { save.coins -= s.price; save.owned.push(id); save.skin = id; SS.persist(); SS.Sfx.coin(); toast('Unlocked ' + s.name + '!'); draw(); } else { toast('Need ' + SS.fmt(s.price - save.coins) + ' more coins'); } }
      else if (s.unlock === 'ad') SS.Ads.rewarded('skin_' + id, () => { save.adWatch[id] = (save.adWatch[id] || 0) + 1; if (save.adWatch[id] >= s.ads) { save.owned.push(id); save.skin = id; toast('Unlocked ' + s.name + '!'); } SS.persist(); draw(); });
      else if (s.unlock === 'streak') toast('Reach a 7-day login streak (or buy VIP)');
      else shopModal();
    };
    openModal('Skins', '', draw); draw();
  }

  // ----- missions -----
  function missionsModal() {
    ensureMissions();
    const draw = () => {
      $('mBody').innerHTML = '<div class="list">' + save.missions.list.map((m, i) => {
        const ready = m.p >= m.t && !m.done, pct = Math.round(100 * m.p / m.t);
        return `<div class="rowc"><span class="ico">${m.done ? '✅' : '🎯'}</span><div class="grow">${m.text.replace('{t}', m.t)}<div class="bar"><i style="width:${pct}%"></i></div><small>${m.p}/${m.t}</small></div>` +
          (m.done ? '' : `<button class="btn ${ready ? 'green' : ''}" data-i="${i}" ${ready ? '' : 'disabled'}>+${m.reward}🪙</button>`) + '</div>';
      }).join('') + '</div><p class="big-note">New missions every day!</p>';
      document.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const m = save.missions.list[b.dataset.i]; m.done = true; SS.addCoins(m.reward); SS.Sfx.coin(); toast('+' + m.reward + ' coins'); draw(); });
    };
    openModal('Daily Missions', '', draw); draw();
  }

  // ----- daily gift -----
  function dailyModal() {
    const rewards = SS.CFG.dailyRewards, yest = new Date(Date.now() - 864e5), ys = yest.getFullYear() + '-' + (yest.getMonth() + 1) + '-' + yest.getDate();
    const can = dailyReady(); let streak = save.daily.streak;
    if (can && save.daily.last !== ys) streak = 0;
    const draw = () => {
      $('mBody').innerHTML = '<div class="days">' + rewards.map((r, i) => `<div class="day ${i < streak ? 'done' : i === streak && can ? 'cur' : ''}">Day ${i + 1}<b>${i === 6 ? '🔥' : '🪙'}</b>${i === 6 ? r + '+skin' : r}</div>`).join('') + '</div>' +
        `<button class="btn ${can ? 'green' : ''}" id="dClaim" ${can ? '' : 'disabled'} style="margin:14px auto">${can ? 'CLAIM TODAY' : 'Come back tomorrow'}</button>` +
        (can ? '<button class="btn ghost" id="dDbl" style="margin:0 auto">🎬 Claim x2</button>' : '') + '<p class="big-note">Log in every day — day 7 unlocks the Blaze skin!</p>';
      const claim = dbl => { const idx = Math.min(streak, 6); let c = rewards[idx] * (dbl ? 2 : 1); save.daily = { last: SS.today(), streak: (streak + 1) % 7 }; if (idx === 6 && !save.owned.includes('streak')) { save.owned.push('streak'); toast('Blaze skin unlocked!'); } SS.addCoins(c); SS.Sfx.coin(); toast('+' + c + ' coins'); closeModal(); };
      if (can) { $('dClaim').onclick = () => claim(false); $('dDbl').onclick = () => SS.Ads.rewarded('daily', () => claim(true)); }
    };
    openModal('Daily Gift', '', draw); draw();
  }

  // ----- lucky wheel -----
  function wheelModal() {
    const W = SS.WHEEL, n = W.length, tot = W.reduce((a, b) => a + b.w, 0);
    let rot = 0, spinning = false;
    openModal('Lucky Spin', `<div class="wheelwrap"><div class="pointer">▼</div><canvas id="wv" width="600" height="600"></canvas></div>
      <button class="btn green" id="wFree"></button><button class="btn ghost" id="wAd" style="margin:0 auto">🎬 Extra spin</button><p class="big-note" id="wNote"></p>`, () => {
      const c = $('wv').getContext('2d'), a = Math.PI * 2 / n;
      W.forEach((s, i) => { c.fillStyle = s.col; c.beginPath(); c.moveTo(300, 300); c.arc(300, 300, 290, i * a - Math.PI / 2 - a / 2, (i + 1) * a - Math.PI / 2 - a / 2); c.fill(); c.lineWidth = 6; c.strokeStyle = '#1e293b'; c.stroke();
        c.save(); c.translate(300, 300); c.rotate(i * a); c.fillStyle = '#1e293b'; c.font = '900 52px ui-rounded,system-ui'; c.textAlign = 'center'; c.fillText(s.l, 0, -205); c.restore(); });
      c.fillStyle = '#fff'; c.lineWidth = 8; c.beginPath(); c.arc(300, 300, 40, 0, 7); c.fill(); c.stroke();
      const upd = () => { const r = wheelReady(); $('wFree').textContent = r ? 'FREE SPIN!' : 'Free spin in ' + Math.ceil((save.wheelNext - Date.now()) / 36e5) + 'h'; $('wFree').disabled = !r || spinning; $('wAd').disabled = spinning; };
      const spin = () => {
        spinning = true; upd(); let r = Math.random() * tot, idx = 0; for (; idx < n - 1; idx++) { r -= W[idx].w; if (r < 0) break; }
        rot += 360 * 5 + (360 - idx * (360 / n)) - (rot % 360); $('wv').style.transform = `rotate(${rot}deg)`;
        setTimeout(() => { const s = W[idx]; spinning = false; if (s.c) { SS.addCoins(s.c); toast('+' + s.c + ' coins!'); } else { save.boost = s.b; SS.persist(); toast(s.b === 'shield' ? 'Free shield next run!' : 'Free magnet next run!'); } SS.Sfx.win(); upd(); refreshMenu(); }, 4300);
      };
      $('wFree').onclick = () => { save.wheelNext = Date.now() + SS.CFG.wheelCooldownMs; SS.persist(); spin(); };
      $('wAd').onclick = () => SS.Ads.rewarded('wheel', spin);
      upd();
    });
  }

  // ----- shop -----
  function shopModal() {
    openModal('Shop', '<div class="list">' + SS.PRODUCTS.map(p => {
      const owned = (p.id === 'remove_ads' && save.adsRemoved) || (p.id === 'vip' && save.vip);
      return `<div class="rowc ${p.best ? 'best' : p.hot ? 'hot' : ''}"><span class="ico">${p.icon}</span><div class="grow">${p.title}${p.best ? ' ⭐' : ''}<small>${p.desc}</small></div>` +
        (owned ? '<b>OWNED</b>' : `<button class="btn gold" data-p="${p.id}">${p.price}</button>`) + '</div>';
    }).join('') + '</div><button class="btn ghost" id="restore" style="margin:12px auto 0">Restore purchases</button>', () => {
      document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => SS.IAP.purchase(b.dataset.p, ok => { if (ok) { SS.Sfx.win(); toast('Purchase successful!'); shopModal(); } }));
      $('restore').onclick = () => { SS.IAP.restore(); toast('Purchases restored'); };
    });
  }

  function settingsModal() {
    const S = save.settings, rows = [['sound', '🔊 Sound'], ['music', '🎵 Music'], ['haptic', '📳 Vibration']];
    openModal('Settings', '<div class="list">' + rows.map(r => `<div class="rowc"><div class="grow">${r[1]}</div><div class="toggle ${S[r[0]] ? 'on' : ''}" data-k="${r[0]}"><i></i></div></div>`).join('') + '</div><p class="big-note">Sling Sprite v1.0</p>', () => {
      document.querySelectorAll('.toggle').forEach(t => t.onclick = () => { const k = t.dataset.k; S[k] = !S[k]; t.classList.toggle('on', S[k]); SS.persist(); if (k === 'music') SS.Sfx.setMusic(S[k]); });
    });
  }
  const opens = { skins: skinsModal, missions: missionsModal, daily: dailyModal, wheel: wheelModal, shop: shopModal, settings: settingsModal };
  document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { SS.Sfx.init(); opens[b.dataset.open](); });

  // ----- HUD -----
  const hud = { s: -1, g: -1, c: '' };
  Game.onHud = h => {
    if (h.score !== hud.s) { hud.s = h.score; $('hScore').textContent = h.score; }
    if (h.gems !== hud.g) { hud.g = h.gems; $('hGems').textContent = h.gems; }
    $('hBiome').textContent = h.biome;
    const ch = h.chain >= 2 ? 'x' + h.mult.toFixed(1) : ''; if (ch !== hud.c) { hud.c = ch; show('hChain', !!ch); $('hChainN').textContent = ch; }
    const pw = (h.shield ? '<div>🛡️ Shield</div>' : '') + (h.magnet > 0 ? `<div>🧲 ${Math.ceil(h.magnet)}s</div>` : '') + (h.boost > 0 ? `<div>⚡ x2 ${Math.ceil(h.boost)}s</div>` : '');
    if ($('hPow').innerHTML !== pw) $('hPow').innerHTML = pw;
  };

  // ----- flow -----
  let reviveTimer, lastSummary, coinsGiven;
  function startRun() {
    SS.Sfx.init(); show('s-menu', false); show('s-over', false); show('s-revive', false); show('hud', true);
    hud.s = hud.g = -1; Game.start();
  }
  function toMenu() { show('s-over', false); show('hud', false); show('s-menu', true); Game.toMenu(); refreshMenu(); }
  function afterDeath(sum) {
    lastSummary = sum; SS.persist();
    if (!sum.run.revived && sum.dist >= SS.CFG.reviveMinDist) offerRevive(); else gameOver();
  }
  function offerRevive() {
    show('s-revive', true); let t = SS.CFG.reviveCountdown, t0 = performance.now(); const fg = $('ringFg');
    clearInterval(reviveTimer);
    reviveTimer = setInterval(() => {
      const el = (performance.now() - t0) / 1000, left = Math.max(0, t - el);
      $('reviveN').textContent = Math.ceil(left); fg.style.strokeDashoffset = 276.5 * (el / t);
      if (left <= 0) { clearInterval(reviveTimer); show('s-revive', false); gameOver(); }
    }, 50);
  }
  $('btnRevive').onclick = () => { clearInterval(reviveTimer); SS.Ads.rewarded('revive', () => { show('s-revive', false); Game.revive(); }, () => { show('s-revive', false); gameOver(); }); };
  $('btnNoRevive').onclick = () => { clearInterval(reviveTimer); show('s-revive', false); gameOver(); };

  function gameOver() {
    const s = lastSummary, newBest = s.score > save.best;
    if (newBest) save.best = s.score;
    save.deaths++; save.gems += s.run.gems;
    const coins = Math.round((s.run.coins + Math.floor(s.dist / 50)) * (save.vip ? SS.CFG.vipCoinMult : 1)); coinsGiven = coins;
    SS.addCoins(coins); applyRun(s.run, s.dist); SS.track('run_end', { score: s.score, dist: s.dist });
    $('ovScore').textContent = s.score; $('ovDist').textContent = s.dist; $('ovGems').textContent = s.run.gems; $('ovBest').textContent = save.best; $('ovCoins').textContent = coins;
    show('ovNew', newBest); show('btnDouble', coins >= 5); $('btnDouble').disabled = false; $('btnDouble').textContent = `🎬 Double Coins (+${coins})`;
    show('hud', false);
    SS.Ads.maybeInterstitial(() => { show('s-over', true); if (newBest) SS.Sfx.win(); });
  }
  Game.onDeath = afterDeath;
  $('btnDouble').onclick = () => SS.Ads.rewarded('double', () => { SS.addCoins(coinsGiven); SS.Sfx.coin(); toast('Coins doubled!'); $('btnDouble').disabled = true; $('ovCoins').textContent = coinsGiven * 2; });
  $('btnRetry').onclick = startRun; $('btnHome').onclick = toMenu;
  $('btnShare').onclick = () => { const t = `I scored ${lastSummary.score} in Sling Sprite! Can you beat me?`; if (navigator.share) navigator.share({ title: 'Sling Sprite', text: t, url: location.href }).catch(() => {}); else toast('Score copied!'), navigator.clipboard && navigator.clipboard.writeText(t); };
  $('btnPlay').onclick = startRun;
  $('btnPause').onclick = e => { e.stopPropagation(); Game.pause(true); show('s-pause', true); };
  $('btnResume').onclick = () => { show('s-pause', false); Game.pause(false); };
  $('btnQuit').onclick = () => { show('s-pause', false); Game.pause(false); toMenu(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && Game.state === 'play') { Game.pause(true); show('s-pause', true); } });

  // gameplay input
  const stage = document.getElementById('c');
  stage.addEventListener('pointerdown', e => { e.preventDefault(); SS.Sfx.init(); if (Game.state === 'play') Game.press(); });
  window.addEventListener('pointerup', () => Game.release());
  window.addEventListener('pointercancel', () => Game.release());
  window.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); if (Game.state === 'menu') startRun(); else Game.press(); } });
  window.addEventListener('keyup', e => { if (e.code === 'Space') Game.release(); });
  SS.UI = { refreshMenu };
})();
