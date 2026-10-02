// Sling Sprite engine: grapple-swing physics, world generation, rendering.
(function () {
  const VW = 640, VH_MIN = 1100, LAVA_Y = 1000, PR = 19, GRAV = 1500, CEN_Y = 500;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  const BIO = SS.BIOMES.map(b => ({ ...b, top: hex(b.top), bot: hex(b.bot), m1: hex(b.m1), m2: hex(b.m2), sea: hex(b.sea), seaD: hex(b.seaD) }));
  const BIOME_LEN = 450; // metres

  const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
  let cw = 0, ch = 0, dpr = 1, sc = 1, viewW = VW, viewH = VH_MIN;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = window.innerWidth; ch = window.innerHeight;
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    sc = Math.min(cw / VW, ch / VH_MIN); viewW = cw / sc; viewH = ch / sc;
  }
  window.addEventListener('resize', resize); resize();

  const Game = SS.Game = { state: 'menu', onDeath: null, onHud: null, stats: null };
  let p, cam, anchors, gems, hazards, powers, parts, texts, trail, genX, genY, aid, time, shake, slow, bonus;
  let run, chainT, hitStop, flash = 0, bestX = 0;
  const clouds = Array.from({ length: 9 }, () => ({ x: rand(0, 1400), y: rand(40, 520), s: rand(0.6, 1.5), v: rand(0.05, 0.2) }));
  const starsArr = Array.from({ length: 70 }, () => ({ x: rand(0, 1), y: rand(0, 0.7), r: rand(0.6, 2) }));

  function skin() { return SS.SKINS.find(s => s.id === SS.save.skin) || SS.SKINS[0]; }

  function reset() {
    time = 0; shake = 0; slow = 1; bonus = 0; chainT = 0; hitStop = 0;
    p = { x: -40, y: 470, vx: 330, vy: -90, a: null, L: 0, dead: false, shield: 0, inv: 0, magnet: 0, boost: 0, fizz: 0, blink: 2, lastRel: null, relT: 0, air: 0, sq: 0 };
    cam = { x: -p.x * 0 - 200, y: CEN_Y - viewH / 2 };
    anchors = []; gems = []; hazards = []; powers = []; parts = []; texts = []; trail = [];
    aid = 0; genX = 60; genY = 260;
    bestX = SS.save.bestDist * 20;
    run = { gems: 0, coins: 0, chain: 0, maxChain: 0, perfect: 0, near: 0, power: 0, revived: false, dist: 0, tut: !SS.save.tutorial };
    anchors.push({ x: 120, y: 250, id: ++aid, pulse: 0 }); genX = 120;
    const b = SS.save.boost;
    if (b === 'shield') p.shield = 1; if (b === 'magnet') p.magnet = 15;
    if (b) { SS.save.boost = null; SS.persist(); }
    gen();
  }

  // ---------- world generation ----------
  function gen() {
    while (genX < cam.x + viewW + 700) {
      const m = genX / 20, d = Math.min(1, m / 1800);
      const prevX = genX, prevY = genY;
      genX += rand(190, 250 + 90 * d);
      genY = clamp(genY + rand(-110, 110), 90, 390);
      anchors.push({ x: genX, y: genY, id: ++aid, pulse: rand(0, 6) });
      // gem trail between the two anchors (follows a typical swing arc)
      if (Math.random() < 0.8) {
        const n = 4 + (Math.random() * 3 | 0), y0 = clamp(prevY + rand(230, 330), 380, 760), y1 = clamp(genY + rand(230, 330), 380, 760);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          gems.push({ x: prevX + (genX - prevX) * (0.2 + 0.6 * t), y: y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 60, ph: rand(0, 6), got: false });
        }
      }
      const mid = (prevX + genX) / 2;
      if (m > 90 && Math.random() < Math.min(0.6, 0.12 + m / 700)) {
        const kind = (m > 300 && Math.random() < 0.4 + d * 0.2) ? 'saw' : 'mine';
        hazards.push({ k: kind, x: mid + rand(-40, 40), y: clamp(genY + rand(160, 340), 360, 800), r: kind === 'saw' ? 28 : 22, ph: rand(0, 6), amp: rand(90, 150), near: false });
      }
      if (m > 650 && Math.random() < 0.18 + d * 0.15) hazards.push({ k: 'beam', x: mid + rand(-30, 30), y: 0, r: 12, ph: rand(0, 6), near: false, per: rand(3.0, 3.8) });
      if (m > 40 && Math.random() < 0.075) powers.push({ k: ['shield', 'magnet', 'boost'][Math.random() * 3 | 0], x: mid, y: clamp(genY + rand(220, 300), 380, 680), got: false });
    }
    // remove gems that overlap hazards
    for (const h of hazards) if (h.k !== 'beam') for (const g of gems) if (!g.got && Math.abs(g.x - h.x) < 46 && Math.abs(g.y - h.y) < h.amp * (h.k === 'saw' ? 1 : 0) + 46) g.got = 'x';
    const cut = cam.x - 200;
    while (anchors.length && anchors[0].x < cut) anchors.shift();
    gems = gems.filter(g => g.x > cut); hazards = hazards.filter(h => h.x > cut); powers = powers.filter(q => q.x > cut);
  }

  const hy = h => h.k === 'saw' ? h.y + Math.sin(time * 1.8 + h.ph) * h.amp : h.y;
  const beamState = h => { const t = (time + h.ph) % h.per; return t < h.per - 1.5 ? 0 : t < h.per - 0.8 ? 1 : 2; }; // 0 off, 1 warn, 2 on

  // ---------- input ----------
  function pickAnchor() {
    let best = null, bs = 1e9;
    for (const a of anchors) {
      if (a === p.lastRel && p.relT < 0.25) continue;
      const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy);
      if (dx < -30 || d < 110 || d > 480 || dy > -50) continue;
      const s = Math.abs(dx - 110) + d * 0.25;
      if (s < bs) { bs = s; best = a; }
    }
    return best;
  }
  Game.press = function () {
    if (Game.state !== 'play' || p.dead || p.a) return;
    const a = pickAnchor();
    if (!a) { p.fizz = 0.25; SS.Sfx.fizzle(); if (run.chain) { run.chain = Math.max(0, run.chain - 1); } return; }
    p.a = a; p.L = Math.hypot(a.x - p.x, a.y - p.y); p.air = 0;
    run.chain++; run.maxChain = Math.max(run.maxChain, run.chain); chainT = 0;
    SS.Sfx.attach(); SS.haptic(8); p.sq = 0.25;
    burst(a.x, a.y, 6, '#fff', 120);
    if (run.tut) { run.tut = false; SS.save.tutorial = true; SS.persist(); }
  };
  Game.release = function () {
    if (Game.state !== 'play' || p.dead || !p.a) return;
    const sp = Math.hypot(p.vx, p.vy), ang = Math.atan2(-p.vy, p.vx) * 57.3;
    p.lastRel = p.a; p.relT = 0; p.a = null; SS.Sfx.release();
    if (ang > 22 && ang < 68 && sp > 400) {
      run.perfect++; bonus += 10; run.chain++; run.maxChain = Math.max(run.maxChain, run.chain);
      p.vx *= 1.08; p.vy *= 1.08;
      flash = 0.35; text(p.x, p.y - 40, 'PERFECT +10', '#fff176'); SS.Sfx.perfect(); SS.haptic(15);
      burst(p.x, p.y, 14, '#fff176', 260);
    }
  };

  // ---------- fx ----------
  function burst(x, y, n, col, sp) { for (let i = 0; i < n; i++) { const a = rand(0, 6.28), s = rand(0.3, 1) * sp; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), max: 0.7, size: rand(2, 5), col, g: 300 }); } }
  function text(x, y, s, col) { texts.push({ x, y, s, col, life: 1 }); }
  const mult = () => 1 + Math.min(run.chain, 30) * 0.1;

  // ---------- update ----------
  function die(why) {
    if (p.dead) return;
    if (p.shield > 0 && why !== 'lava' && why !== 'behind') return;
    p.dead = true; p.a = null; shake = 18; slow = 0.25; hitStop = 0.4;
    SS.Sfx.hit(); SS.haptic([40, 40, 80]);
    burst(p.x, p.y, 40, skin().c, 480); burst(p.x, p.y, 16, '#fff', 320);
    Game.state = 'dying'; Game.why = why;
    setTimeout(() => { Game.state = 'dead'; run.dist = Math.floor(p.maxX / 20); Game.onDeath && Game.onDeath(Game.summary()); }, 750);
  }
  Game.summary = () => { const s = score(); return { score: s, dist: Math.floor((p.maxX || 0) / 20), run }; };
  const score = () => Math.floor(Math.max(0, (p.maxX || 0) / 20) + bonus + run.gems * 2);

  function hitShield(h) {
    p.shield = 0; p.inv = 1.2; shake = 10; SS.Sfx.shield(); SS.haptic(30);
    burst(p.x, p.y, 24, '#7dd3fc', 380); text(p.x, p.y - 40, 'SHIELD!', '#7dd3fc');
    if (h && h.k !== 'beam') h.dead = true;
  }

  function step(dt) {
    time += dt; p.relT += dt; p.fizz = Math.max(0, p.fizz - dt); p.sq = Math.max(0, p.sq - dt);
    p.inv = Math.max(0, p.inv - dt); p.magnet = Math.max(0, p.magnet - dt); p.boost = Math.max(0, p.boost - dt);
    p.blink -= dt; if (p.blink < -0.12) p.blink = rand(1.5, 4);
    const sub = 2, h = dt / sub;
    for (let i = 0; i < sub; i++) {
      p.vy += GRAV * h;
      if (p.a) {
        p.L = Math.max(110, p.L - 38 * h);
        let dx = p.x - p.a.x, dy = p.y - p.a.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
        const tx = -ny, ty = nx, vt = p.vx * tx + p.vy * ty;
        if (Math.abs(vt) > 20 && Math.hypot(p.vx, p.vy) < 1000) { const k = Math.sign(vt) * 260 * h; p.vx += tx * k; p.vy += ty * k; }
        p.x += p.vx * h; p.y += p.vy * h;
        dx = p.x - p.a.x; dy = p.y - p.a.y; d = Math.hypot(dx, dy) || 1; nx = dx / d; ny = dy / d;
        if (d > p.L) { p.x = p.a.x + nx * p.L; p.y = p.a.y + ny * p.L; const vr = p.vx * nx + p.vy * ny; if (vr > 0) { p.vx -= vr * nx; p.vy -= vr * ny; } }
      } else {
        p.air += h; if (p.vx < 250) p.vx += 360 * h;
        p.vx *= 1 - 0.05 * h; p.x += p.vx * h; p.y += p.vy * h;
      }
      const sp = Math.hypot(p.vx, p.vy); if (sp > 1150) { p.vx *= 1150 / sp; p.vy *= 1150 / sp; }
    }
    p.maxX = Math.max(p.maxX || 0, p.x);
    if (!p.a && p.air > 1.6 && run.chain > 0) { run.chain = 0; text(p.x, p.y - 50, 'chain lost', '#fff'); p.air = -99; }
    // camera
    const m = p.maxX / 20, auto = 50 + Math.min(150, m * 0.1);
    const target = p.x - viewW * 0.3;
    cam.x = Math.max(cam.x + auto * dt, cam.x + (target - cam.x) * Math.min(1, dt * 6));
    cam.y = CEN_Y - viewH / 2 + clamp((p.y - 450) * 0.12, -60, 60);
    gen();
    // trail
    trail.push({ x: p.x, y: p.y, life: 0.45 }); if (trail.length > 40) trail.shift();
    // pickups
    const mr = p.magnet > 0 ? 170 : 26, gm = mult() * (p.boost > 0 ? 2 : 1);
    for (const g of gems) {
      if (g.got) continue;
      const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy);
      if (p.magnet > 0 && d < mr) { g.x += dx * 8 * dt; g.y += dy * 8 * dt; }
      if (d < PR + 14) {
        g.got = true; const v = Math.max(1, Math.round(gm)); run.gems += v; run.coins += v;
        SS.Sfx.gem(run.chain); burst(g.x, g.y, 5, '#ffe14d', 160); if (v > 1 && Math.random() < 0.3) text(g.x, g.y - 20, '+' + v, '#fff');
      }
    }
    for (const q of powers) if (!q.got && Math.hypot(p.x - q.x, p.y - q.y) < PR + 24) {
      q.got = true; run.power++; SS.Sfx.power(); SS.haptic(12); burst(q.x, q.y, 16, '#fff', 260);
      if (q.k === 'shield') { p.shield = 1; text(q.x, q.y - 30, 'SHIELD', '#7dd3fc'); }
      if (q.k === 'magnet') { p.magnet = 10; text(q.x, q.y - 30, 'MAGNET', '#fca5a5'); }
      if (q.k === 'boost') { p.boost = 10; text(q.x, q.y - 30, 'x2 GEMS', '#fde047'); }
    }
    // hazards
    for (const h of hazards) {
      if (h.dead) continue;
      let hit = false, d;
      if (h.k === 'beam') {
        const st = beamState(h); d = Math.abs(p.x - h.x);
        if (st === 2 && d < h.r + PR - 4) hit = true;
        if (st === 2 && d < 60 && !h.near && !hit) { /* near handled below */ }
      } else { const y = hy(h); d = Math.hypot(p.x - h.x, p.y - y) - h.r; if (d < PR - 4) hit = true; }
      if (hit && p.inv <= 0) { if (p.shield > 0) hitShield(h); else die('hazard'); }
      else if (!hit && !h.near && p.x > h.x && (h.k !== 'beam' || beamState(h) === 2) ) {
        h.near = true; const dd = h.k === 'beam' ? Math.abs(p.x - h.x) : d;
        if (dd < 34 && p.x - h.x < 60) { run.near++; bonus += 5; text(p.x, p.y - 44, 'CLOSE! +5', '#fb923c'); SS.Sfx.near(); }
      }
    }
    // lava / left edge
    if (p.y + PR > lavaY(p.x) + 8 && !p.dead) { burst(p.x, LAVA_Y, 18, '#fff', 300); die('lava'); }
    if (p.x < cam.x - 30 && !p.dead) die('behind');
    if (p.y < -450) { p.vy = Math.abs(p.vy) * 0.3; p.y = -450; }
    if (Game.onHud) Game.onHud({ score: score(), gems: run.gems, chain: run.chain, mult: mult() * (p.boost > 0 ? 2 : 1), shield: p.shield, magnet: p.magnet, boost: p.boost, biome: biomeName(), toBest: bestX > 0 ? Math.min(1, p.maxX / bestX) : 0, hasBest: bestX > 0, bestLeft: Math.max(0, Math.ceil((bestX - p.maxX) / 20)), tut: run.tut, hold: !!p.a });
  }
  const lavaY = x => LAVA_Y + Math.sin(x * 0.02 + time * 2) * 6;
  const biomeName = () => BIO[(Math.floor((p.maxX || 0) / 20 / BIOME_LEN)) % BIO.length].name;

  // ---------- rendering ----------
  function biomeAt(mx) {
    const f = mx / BIOME_LEN, i = Math.floor(f), t = f - i, T = clamp((t - 0.88) / 0.12, 0, 1);
    return { a: BIO[i % BIO.length], b: BIO[(i + 1) % BIO.length], t: T * T * (3 - 2 * T) };
  }
  function drawBack(bi) {
    const { a, b, t } = bi;
    const g = ctx.createLinearGradient(0, 0, 0, viewH);
    g.addColorStop(0, mix(a.top, b.top, t)); g.addColorStop(1, mix(a.bot, b.bot, t));
    ctx.fillStyle = g; ctx.fillRect(0, 0, viewW, viewH);
    const night = a.stars * (1 - t) + b.stars * t;
    if (night > 0.01) { ctx.fillStyle = '#fff'; for (const s of starsArr) { ctx.globalAlpha = night * (0.5 + 0.5 * Math.sin(time * 2 + s.x * 40)); ctx.beginPath(); ctx.arc(((s.x * viewW - cam.x * 0.02) % viewW + viewW) % viewW, s.y * viewH, s.r, 0, 6.28); ctx.fill(); } ctx.globalAlpha = 1; }
    ctx.fillStyle = 'rgba(255,255,255,' + (0.55 - night * 0.4) + ')';
    for (const c of clouds) {
      const x = (((c.x - cam.x * c.v) % (viewW + 300)) + viewW + 300) % (viewW + 300) - 150, y = c.y - (cam.y + 100) * 0.05 * 0 ;
      ctx.beginPath(); ctx.arc(x, y, 34 * c.s, 0, 6.28); ctx.arc(x + 34 * c.s, y + 6, 28 * c.s, 0, 6.28); ctx.arc(x - 32 * c.s, y + 8, 24 * c.s, 0, 6.28); ctx.fill();
    }
    const base = LAVA_Y - cam.y;
    for (let L = 0; L < 2; L++) {
      ctx.fillStyle = mix(L ? a.m2 : a.m1, L ? b.m2 : b.m1, t);
      const sp = L ? 0.22 : 0.1, amp = L ? 90 : 140, fr = L ? 0.006 : 0.004;
      ctx.beginPath(); ctx.moveTo(0, viewH);
      for (let x = 0; x <= viewW + 20; x += 20) { const wx = x + cam.x * sp; ctx.lineTo(x, base - 60 - (L ? 0 : 60) - (Math.sin(wx * fr) * 0.6 + Math.sin(wx * fr * 2.7 + 1) * 0.4 + 1) * amp * 0.5); }
      ctx.lineTo(viewW, viewH); ctx.fill();
    }
  }
  function drawSea(bi) {
    const { a, b, t } = bi, y0 = LAVA_Y - cam.y;
    ctx.fillStyle = mix(a.seaD, b.seaD, t); ctx.fillRect(0, y0, viewW, viewH - y0 + 10);
    ctx.fillStyle = mix(a.sea, b.sea, t); ctx.beginPath(); ctx.moveTo(0, viewH + 10);
    for (let x = 0; x <= viewW + 10; x += 10) ctx.lineTo(x, y0 + Math.sin((x + cam.x) * 0.02 + time * 2) * 6 + Math.sin((x + cam.x) * 0.05 - time * 3) * 2);
    ctx.lineTo(viewW, viewH + 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = 0; x <= viewW + 10; x += 10) { const y = y0 + Math.sin((x + cam.x) * 0.02 + time * 2) * 6 + Math.sin((x + cam.x) * 0.05 - time * 3) * 2; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  function star(x, y, r, pts, k) { ctx.beginPath(); for (let i = 0; i < pts * 2; i++) { const rr = i % 2 ? r * k : r, a = i * Math.PI / pts - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }

  // Draws the sprite; reused for skin previews. o = {vx,vy,sq,blink,look}
  function drawBlob(c, x, y, r, sk, o) {
    o = o || {}; c.save(); c.translate(x, y);
    const sp = Math.hypot(o.vx || 0, o.vy || 0), ang = Math.atan2(o.vy || 0, o.vx || 1) * 0.35;
    const st = 1 + Math.min(sp / 3000, 0.22) + (o.sq || 0) * 0.5;
    c.rotate(ang); c.scale(st, 1 / st); c.rotate(-ang * 0.4);
    c.lineWidth = r * 0.14; c.strokeStyle = '#1e293b'; c.lineJoin = 'round';
    const sh = sk.shape;
    c.fillStyle = sk.a;
    if (sh === 'cat' || sh === 'bunny') {
      const h = sh === 'bunny' ? 1.1 : 0.75;
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * r * 0.2, -r * 0.7); c.lineTo(sx * r * (sh === 'bunny' ? 0.45 : 0.95), -r * (0.7 + h)); c.lineTo(sx * r * 0.85, -r * 0.35); c.closePath(); c.fill(); c.stroke(); }
    }
    if (sh === 'flame') { c.beginPath(); c.moveTo(-r * 0.5, -r * 0.6); c.quadraticCurveTo(-r * 0.3, -r * 1.5, 0, -r * 1.7); c.quadraticCurveTo(r * 0.3, -r * 1.3, r * 0.5, -r * 0.6); c.closePath(); c.fill(); c.stroke(); }
    c.fillStyle = sk.c; c.beginPath();
    if (sh === 'ghost') { c.arc(0, -r * 0.1, r, Math.PI, 0); c.lineTo(r, r); for (let i = 0; i < 3; i++) c.quadraticCurveTo(r - (i * 2 + 1) * r / 3, r * 1.45, r - (i + 1) * 2 * r / 3, r); c.closePath(); }
    else c.arc(0, 0, r, 0, 6.28);
    c.fill(); c.stroke();
    if (sh === 'ninja') { c.fillStyle = sk.a; c.fillRect(-r, -r * 0.55, r * 2, r * 0.3); c.fillStyle = '#e2e8f0'; }
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.45, r * 0.3, r * 0.17, -0.6, 0, 6.28); c.fill();
    const lx = clamp((o.vx || 60) / 900, -1, 1) * r * 0.12, ly = clamp((o.vy || 0) / 900, -1, 1) * r * 0.12;
    const eh = (o.blink || 1) < 0 ? 0.12 : 1;
    for (const sx of [-1, 1]) {
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(sx * r * 0.36, -r * 0.05, r * 0.26, r * 0.3 * eh, 0, 0, 6.28); c.fill(); c.lineWidth = r * 0.08; c.stroke();
      if (eh > 0.5) { c.fillStyle = '#1e293b'; c.beginPath(); c.arc(sx * r * 0.36 + lx * 2, -r * 0.05 + ly * 2, r * 0.13, 0, 6.28); c.fill(); }
    }
    c.fillStyle = sk.a; c.globalAlpha = 0.5; c.beginPath(); c.arc(-r * 0.62, r * 0.28, r * 0.13, 0, 6.28); c.arc(r * 0.62, r * 0.28, r * 0.13, 0, 6.28); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = '#1e293b'; c.lineWidth = r * 0.09; c.beginPath(); c.arc(0, r * 0.28, r * 0.15, 0.1, Math.PI - 0.1); c.stroke();
    if (sh === 'crown') { c.fillStyle = '#fde047'; c.lineWidth = r * 0.1; c.beginPath(); c.moveTo(-r * 0.6, -r * 0.8); c.lineTo(-r * 0.6, -r * 1.35); c.lineTo(-r * 0.2, -r * 1.05); c.lineTo(0, -r * 1.45); c.lineTo(r * 0.2, -r * 1.05); c.lineTo(r * 0.6, -r * 1.35); c.lineTo(r * 0.6, -r * 0.8); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
  }
  Game.drawBlob = drawBlob;

  function drawWorld() {
    if (bestX > 0 && bestX > cam.x - 60 && bestX < cam.x + viewW + 60) {
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 4; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.moveTo(bestX, cam.y); ctx.lineTo(bestX, LAVA_Y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444'; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.rect(bestX, cam.y + 330, 96, 38); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '900 22px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BEST', bestX + 48, cam.y + 358);
    }
    // anchors
    const cand = Game.state === 'play' && !p.a ? pickAnchor() : null;
    for (const a of anchors) {
      if (a.x < cam.x - 40 || a.x > cam.x + viewW + 40) continue;
      const isC = a === cand, pu = Math.sin(time * 4 + a.pulse) * 0.5 + 0.5;
      ctx.fillStyle = 'rgba(255,255,255,' + (isC ? 0.55 : 0.18) + ')'; ctx.beginPath(); ctx.arc(a.x, a.y, 26 + pu * 6 + (isC ? 10 : 0), 0, 6.28); ctx.fill();
      ctx.fillStyle = isC ? '#fff176' : '#f8fafc'; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4; star(a.x, a.y, 16, 5, 0.55); ctx.fill(); ctx.stroke();
      if (isC) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(a.x, a.y); ctx.stroke(); ctx.setLineDash([]); }
    }
    // beams
    for (const h of hazards) {
      if (h.dead || h.x < cam.x - 60 || h.x > cam.x + viewW + 60) continue;
      if (h.k === 'beam') {
        const st = beamState(h), top = cam.y - 20, bot = LAVA_Y;
        if (st === 1 && Math.floor(time * 14) % 2) { ctx.strokeStyle = 'rgba(255,60,90,.55)'; ctx.lineWidth = 3; ctx.setLineDash([12, 12]); ctx.beginPath(); ctx.moveTo(h.x, top); ctx.lineTo(h.x, bot); ctx.stroke(); ctx.setLineDash([]); }
        if (st === 2) { ctx.fillStyle = 'rgba(255,60,90,.35)'; ctx.fillRect(h.x - 22, top, 44, bot - top); ctx.fillStyle = '#ff3b5c'; ctx.fillRect(h.x - 9, top, 18, bot - top); ctx.fillStyle = '#fff'; ctx.fillRect(h.x - 3, top, 6, bot - top); }
        ctx.fillStyle = '#334155'; ctx.fillRect(h.x - 14, top, 28, 18);
      } else {
        const y = hy(h); ctx.save(); ctx.translate(h.x, y); ctx.rotate(time * (h.k === 'saw' ? 5 : 1));
        if (h.k === 'saw' && h.amp) { ctx.restore(); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x, h.y - h.amp); ctx.lineTo(h.x, h.y + h.amp); ctx.stroke(); ctx.save(); ctx.translate(h.x, y); ctx.rotate(time * 5); }
        const n = h.k === 'saw' ? 10 : 8; ctx.fillStyle = h.k === 'saw' ? '#cbd5e1' : '#ff4d6d'; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4; ctx.beginPath();
        for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, r = i % 2 ? h.r * 0.78 : h.r * 1.28; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = h.k === 'saw' ? '#64748b' : '#be123c'; ctx.beginPath(); ctx.arc(0, 0, h.r * 0.45, 0, 6.28); ctx.fill(); ctx.restore();
      }
    }
    // gems & powerups
    for (const g of gems) {
      if (g.got || g.x < cam.x - 20 || g.x > cam.x + viewW + 20) continue;
      const w = Math.abs(Math.cos(time * 3 + g.ph));
      ctx.save(); ctx.translate(g.x, g.y + Math.sin(time * 3 + g.ph) * 3); ctx.scale(0.35 + w * 0.65, 1);
      ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 6.28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-2, -6, 3, 8); ctx.restore();
    }
    const em = { shield: ['#7dd3fc', '🛡️'], magnet: ['#fca5a5', '🧲'], boost: ['#fde047', '⚡'] };
    for (const q of powers) {
      if (q.got || q.x < cam.x - 30 || q.x > cam.x + viewW + 30) continue;
      const y = q.y + Math.sin(time * 3 + q.x) * 6; ctx.fillStyle = em[q.k][0]; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(q.x, y, 22, 0, 6.28); ctx.fill(); ctx.stroke();
      ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(em[q.k][1], q.x, y + 1);
    }
    // trail
    const sk = skin();
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i], k = i / trail.length;
      ctx.fillStyle = sk.t === 'rainbow' ? 'hsl(' + ((time * 200 + i * 12) % 360) + ',95%,65%)' : sk.t;
      ctx.globalAlpha = k * 0.6; ctx.beginPath(); ctx.arc(t.x, t.y, PR * 1.2 * k, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // rope
    if (p.a) {
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.a.x, p.a.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.stroke();
    }
    if (p.fizz > 0) { ctx.strokeStyle = 'rgba(255,255,255,' + p.fizz * 3 + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, PR + 24 - p.fizz * 40, 0, 6.28); ctx.stroke(); }
    // player
    if (!p.dead && Game.state !== 'menu' && (p.inv <= 0 || Math.floor(time * 20) % 2)) {
      if (p.magnet > 0) { ctx.strokeStyle = 'rgba(252,165,165,.5)'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(p.x, p.y, 120 + Math.sin(time * 8) * 6, 0, 6.28); ctx.stroke(); ctx.setLineDash([]); }
      drawBlob(ctx, p.x, p.y, PR * 1.3, sk, { vx: p.vx, vy: p.vy, sq: p.sq, blink: p.blink });
      if (p.shield > 0) { ctx.strokeStyle = 'rgba(125,211,252,.9)'; ctx.fillStyle = 'rgba(125,211,252,.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, PR + 11 + Math.sin(time * 8) * 1.5, 0, 6.28); ctx.fill(); ctx.stroke(); }
    }
    for (const q of parts) { ctx.globalAlpha = clamp(q.life / q.max, 0, 1); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 6.28); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.font = '900 22px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#1e293b'; ctx.lineJoin = 'round';
    for (const t of texts) { ctx.globalAlpha = clamp(t.life * 1.5, 0, 1); ctx.strokeText(t.s, t.x, t.y); ctx.fillStyle = t.col; ctx.fillText(t.s, t.x, t.y); }
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    const mx = cam ? Math.max(0, (p.maxX || 0) / 20) : 0, bi = biomeAt(mx);
    drawBack(bi);
    ctx.save();
    const sx = shake ? rand(-shake, shake) : 0, sy = shake ? rand(-shake, shake) : 0;
    ctx.translate(-cam.x + sx, -cam.y + sy);
    drawWorld(); ctx.restore();
    ctx.save(); ctx.translate(sx, sy); drawSea(bi); ctx.restore();
    // speed lines + flash
    const spd = Game.state === 'play' ? Math.hypot(p.vx, p.vy) : 0;
    if (spd > 650) { ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(0.35, (spd - 650) / 1500) + ')'; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { const y = ((i * 197 + time * 900) % viewH), x = ((i * 331 + time * 1600) % (viewW + 200)); ctx.beginPath(); ctx.moveTo(viewW - x, y); ctx.lineTo(viewW - x + 90, y); ctx.stroke(); } }
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash + ')'; ctx.fillRect(0, 0, viewW, viewH); flash = Math.max(0, flash - 0.03); }
    // hint
    if (Game.state === 'play' && run.tut) {
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4; ctx.font = '900 30px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center';
      const y = viewH * 0.78; ctx.strokeText(p.a ? 'RELEASE to fly!' : 'HOLD to swing!', viewW / 2, y); ctx.fillText(p.a ? 'RELEASE to fly!' : 'HOLD to swing!', viewW / 2, y);
    }
  }

  // ---------- loop ----------
  let last = 0, running = false, paused = false;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016); last = t;
    if (!cam) reset();
    if (!paused) {
      const s = Game.state;
      if (s === 'play') step(dt * slow);
      else if (s === 'dying') { hitStop -= dt; slow = Math.min(1, slow + dt * 0.8); time += dt * slow; }
      else if (s === 'menu') { time += dt; cam.x += 60 * dt; gen(); p.x = cam.x + viewW * 0.3; p.y = 520 + Math.sin(time * 2) * 20; p.vx = 300; p.vy = 0; p.maxX = Math.max(p.maxX || 0, 0); }
      else if (s === 'dead') time += dt;
      shake = Math.max(0, shake - dt * 40);
      for (const q of parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; }
      parts = parts.filter(q => q.life > 0);
      for (const t2 of texts) { t2.life -= dt; t2.y -= 40 * dt; }
      texts = texts.filter(t2 => t2.life > 0);
    }
    render();
  }
  Game.start = function () { reset(); Game.state = 'play'; SS.save.runs++; SS.persist(); SS.track('run_start'); };
  Game.toMenu = function () { reset(); Game.state = 'menu'; p.maxX = 0; };
  Game.pause = v => { if (Game.state !== 'play') return; paused = v; };
  Game.isPaused = () => paused;
  Game.revive = function () {
    p.dead = false; p.a = null; p.shield = 1; p.inv = 2.5; slow = 1; run.revived = true; run.chain = 0;
    p.x = Math.max(p.x, cam.x + viewW * 0.3); p.y = 430; p.vx = 300; p.vy = -120; cam.x = Math.max(cam.x, p.x - viewW * 0.3); p.air = 0;
    for (const h of hazards) if (Math.abs(h.x - p.x) < 380) h.dead = true;
    anchors.push({ x: p.x + 130, y: 250, id: ++aid, pulse: 0 });
    Game.state = 'play'; burst(p.x, p.y, 24, '#fff', 300);
  };
  Game.boot = function () { reset(); Game.state = 'menu'; requestAnimationFrame(frame); };
  Game.addBonusCoins = n => { run.coins += n; };
  Game.runInfo = () => run;
  Game._dbg = () => ({ a: !!p.a, ang: Math.atan2(-p.vy, p.vx) * 57.3, sp: Math.hypot(p.vx, p.vy) });
  Game._p = () => p; Game._cam = () => cam;
})();
