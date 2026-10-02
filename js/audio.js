// Procedural WebAudio sound + tiny generative music. No asset files needed.
(function () {
  let ctx, master, musicBus, timer, step = 0;
  const S = SS.save.settings;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
    if (S.music) startMusic();
  }
  function tone(f, d, type, vol, slide, delay, bus) {
    if (!ctx) return; const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(bus || master); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, vol, hp) {
    if (!ctx) return; const n = ctx.sampleRate * d, b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800;
    const g = ctx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start();
  }
  const P = [0, 2, 4, 7, 9, 12, 14, 16]; // major pentatonic-ish
  const note = n => 261.63 * Math.pow(2, n / 12);
  function startMusic() {
    if (timer || !ctx) return;
    timer = setInterval(() => {
      if (!S.music || document.hidden) return;
      const bar = Math.floor(step / 8) % 4, root = [0, -3, -5, -2][bar];
      const n = root + P[(step * 3 + (step >> 2)) % P.length] - 12 + (step % 8 === 0 ? 0 : 12);
      tone(note(n), 0.28, 'triangle', 0.5, 0, 0, musicBus);
      if (step % 4 === 0) tone(note(root - 24), 0.5, 'sine', 0.9, 0, 0, musicBus);
      step++;
    }, 210);
  }
  function stopMusic() { clearInterval(timer); timer = null; }
  const on = () => S.sound && ctx;
  SS.Sfx = {
    init, startMusic, stopMusic,
    attach() { if (on()) { tone(520, 0.08, 'square', 0.18, 300); noise(0.05, 0.12, 3000); } },
    release() { if (on()) noise(0.16, 0.14, 1200); },
    fizzle() { if (on()) tone(200, 0.12, 'sawtooth', 0.12, -90); },
    gem(chain) { if (on()) tone(700 + Math.min(chain, 20) * 40, 0.12, 'sine', 0.28, 500); },
    perfect() { if (on()) [0, 4, 7, 12].forEach((n, i) => tone(note(n + 12), 0.16, 'triangle', 0.3, 0, i * 0.05)); },
    power() { if (on()) [0, 5, 9, 14].forEach((n, i) => tone(note(n + 12), 0.14, 'square', 0.16, 0, i * 0.05)); },
    near() { if (on()) tone(900, 0.1, 'sine', 0.2, 600); },
    shield() { if (on()) { tone(300, 0.3, 'sawtooth', 0.2, -200); noise(0.2, 0.2, 600); } },
    hit() { if (on()) { tone(160, 0.5, 'sawtooth', 0.35, -120); noise(0.4, 0.35, 300); } },
    click() { if (on()) tone(640, 0.06, 'square', 0.12, 120); },
    coin() { if (on()) [0, 7, 12, 16].forEach((n, i) => tone(note(n + 12), 0.12, 'sine', 0.25, 0, i * 0.06)); },
    win() { if (on()) [0, 4, 7, 12, 16].forEach((n, i) => tone(note(n + 12), 0.2, 'triangle', 0.3, 0, i * 0.08)); },
    setMusic(v) { S.music = v; SS.persist(); if (v) { init(); startMusic(); } else stopMusic(); },
  };
  SS.haptic = ms => { if (S.haptic && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} };
})();
