/* AFTERBURN — photographic layered flight animation, offline and buildless. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }, mix = (a, b, t) => a + (b - a) * t;
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { alpha: false }); $('scene').appendChild(canvas);
  let W = 1, H = 1, DPR = 1, state = 'loading', time = 0, visual = 0, crashTime = 0, paused = false, multiplier = 1, speed = 0, altitude = 0, lastPhase = '', lastNow = performance.now(), lastHUD = 0, roadScroll = 0;
  const DURATION = 28, assets = {}, particles = []; let currentJet = { x: 0, y: 0, w: 0, h: 0, angle: 0 }, impact = { x: 0, y: 0 };
  function resize() { W = $('scene').clientWidth || innerWidth; H = $('scene').clientHeight || innerHeight; DPR = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  new ResizeObserver(resize).observe($('scene')); addEventListener('resize', resize); resize();
  function load(name, path) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => { assets[name] = img; resolve(img) }; img.onerror = () => reject(new Error(path)); img.src = path; }); }
  const phases = { idle: ['01 / PREFLIGHT', '蓄势，待发。', '跑道 27 · 双发待命 · 等待起飞指令'], roll: ['02 / AFTERBURNER', '全速，破风。', '加力燃烧室启动 · 沿跑道加速'], rotate: ['03 / LIFT OFF', '挣脱，地心引力。', '抬起机头 · 收起起落架'], climb: ['04 / ABOVE THE CLOUDS', '向上，没有极限。', '云层之上 · 倍率持续攀升'], crash: ['05 / SIGNAL LOST', '极限，一瞬之间。', '信号中断 · 本轮飞行结束'] };
  function setPhase(name) { if (name === lastPhase) return; lastPhase = name; const p = phases[name]; $('phase-code').textContent = p[0]; $('phase-title').textContent = p[1]; $('phase-description').textContent = p[2]; document.querySelectorAll('[data-phase]').forEach(e => e.classList.toggle('active', e.dataset.phase === name)); document.body.dataset.phase = name; }
  function toast(text) { $('toast').textContent = text; $('toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').classList.remove('visible'), 2200); }
  function hud() { $('speed').textContent = Math.round(speed).toString().padStart(3, '0'); $('altitude').textContent = Math.round(altitude).toString().padStart(3, '0'); $('elapsed').textContent = time.toFixed(1).padStart(4, '0'); $('multiplier').textContent = multiplier.toFixed(2); $('progress-fill').style.width = clamp(time / DURATION) * 100 + '%'; $('status-text').textContent = state === 'idle' ? '准备就绪 · 等待你的起飞指令' : state === 'crash' ? '信号中断 · 可重新起飞' : paused ? '飞行已暂停' : time < 7 ? '全油门加速 · 正在抵达起飞速度' : '持续爬升 · 穿越云层'; }
  function start() { if (state === 'loading') return; state = 'flight'; time = 0; crashTime = 0; multiplier = 1; speed = 0; altitude = 0; paused = false; particles.length = 0; roadScroll = 0; $('end-panel').hidden = true; $('end-panel').classList.add('hidden'); $('launch-btn').innerHTML = '<span>重新起飞</span><span aria-hidden="true">↗</span>'; $('pause-btn').disabled = false; $('pause-btn').classList.remove('paused'); $('pause-btn').setAttribute('aria-pressed', 'false'); $('pause-btn').setAttribute('aria-label', '暂停动画'); $('crash-btn').disabled = false; document.body.classList.remove('has-crashed'); setPhase('roll'); hud(); audioStart(); }
  function crash() { if (state !== 'flight') return; state = 'crash'; paused = false; crashTime = 0; impact = { x: currentJet.x, y: currentJet.y }; for (let i = 0; i < 95; i++)particles.push({ x: impact.x, y: impact.y, vx: (Math.random() - .55) * W * .4, vy: (Math.random() - .55) * H * .45, r: Math.random() * 2.5 + 1, life: .7 + Math.random() * 2.5 }); $('pause-btn').disabled = true; $('crash-btn').disabled = true; setPhase('crash'); document.body.classList.add('has-crashed'); boom(); hud(); }
  function pause() { if (state !== 'flight') return; paused = !paused; $('pause-btn').classList.toggle('paused', paused); $('pause-btn').setAttribute('aria-pressed', String(paused)); $('pause-btn').setAttribute('aria-label', paused ? '继续动画' : '暂停动画'); hud(); }
  function road(img, pan, y, s, alpha) { const tw = img.width * s, th = img.height * s; let x = -(((pan % tw) + tw) % tw); ctx.globalAlpha = alpha; for (; x < W; x += tw) ctx.drawImage(img, x, y, tw + 1, th); ctx.globalAlpha = 1; }
  function background() {
    const bd = assets.backdrop, rw = assets.runway;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // 天空、云层、远景、跑道共用同一缩放比例：同一个镜头，画面连续
    const s = Math.max(W / bd.width, H / 941) * 1.2, bw = bd.width * s, bh = bd.height * s, th = rw.height * s, groundY = H - th;
    // 镜头上升：地平线先下沉离开画面，随后继续爬升，穿过云层进入高空
    const cam = (bh - groundY) * (.7 * smooth(6.5, 13, time) + .3 * smooth(13, 26, time)), ry = groundY + cam;
    ctx.drawImage(bd, (W - bw) / 2, ry - bh, bw, bh);
    if (ry < H) {
      const fly = clamp(speed / 790);
      road(rw, roadScroll, ry, s, 1);
      // 运动拖影：叠在主跑道之上
      if (speed > 50) for (let b = 1; b <= 3; b++) road(rw, roadScroll - b * (8 + speed * .06), ry, s, .16 * fly);
      const g = ctx.createLinearGradient(0, ry + th * .55, 0, ry + th);
      g.addColorStop(0, 'rgba(9,15,24,0)'); g.addColorStop(1, 'rgba(9,15,24,.32)');
      ctx.fillStyle = g; ctx.fillRect(0, ry + th * .55, W, th * .45);
      if (speed > 30) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, ry, W, th); ctx.clip(); ctx.globalCompositeOperation = 'screen';
        const rows = 10;
        for (let r = 0; r < rows; r++) {
          const d = r / (rows - 1), yy = ry + d * th, k = .4 + d * 2.2, len = (14 + d * d * W * .5) * (.35 + fly * 1.4), spacing = W * (.5 + d * .9), off = (roadScroll * k) % spacing;
          ctx.globalAlpha = (.06 + fly * .32) * (.2 + d * .8); ctx.fillStyle = d > .55 ? 'rgba(255,242,214,1)' : 'rgba(214,232,255,1)';
          const h = 1 + d * 2.2; for (let x = -off - len; x < W + len; x += spacing) ctx.fillRect(x, yy - h / 2, len, h);
        }
        ctx.restore();
      }
    }
    const glow = ctx.createRadialGradient(W * .99, H * .14, 0, W * .99, H * .14, W * .45);
    glow.addColorStop(0, 'rgba(255,217,169,.14)'); glow.addColorStop(1, 'rgba(255,208,150,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  }
  function jetTransform() {
    const width = Math.min(W * (W / H < 1 ? .85 : .58), 1100) * (1 - smooth(16, 28, time) * .12),
          h = width / 3,
          lift = smooth(6.2, 10.5, time);
    return {
      x: W * (.53 + smooth(0, 7, time) * .035),
      y: mix(H * .81 - h * .37, H * .38, lift) + Math.sin(visual * 2.6) * smooth(9, 13, time) * H * .0015,
      w: width, h,
      angle: -smooth(5.8, 9.5, time) * .105 - smooth(9.5, 24, time) * .145
    };
  }
  function thermal(j, throttle) { if (throttle < .2) return; const length = j.w * .34 * throttle, ex = j.x - j.w * .44, ey = j.y + j.h * .05; ctx.save(); ctx.globalAlpha = .18 * throttle; for (let i = 0; i < 20; i++) { const x = ex - length + i * length / 20, y = ey - j.h * .12, d = Math.sin(visual * 25 - i * .9) * 2.2 * throttle; ctx.drawImage(canvas, Math.max(0, x * DPR), Math.max(0, y * DPR), Math.max(1, length / 20 * DPR), j.h * .27 * DPR, x, y + d, length / 20, j.h * .27); } ctx.restore(); }
  function exhaust(j, throttle) {
    const x = -j.w * .445, y = j.h * .075, len = j.w * (.04 + throttle * .19), r = j.w * (.002 + throttle * .011); ctx.save(); ctx.globalCompositeOperation = 'screen'; const glow = ctx.createRadialGradient(x - len * .2, y, 0, x - len * .2, y, len * .7); glow.addColorStop(0, `rgba(255,132,57,${.14 * throttle})`); glow.addColorStop(1, 'rgba(255,130,40,0)'); ctx.fillStyle = glow; ctx.fillRect(x - len * 1.2, y - len * .7, len * 1.8, len * 1.4);
    for (let layer = 0; layer < 3; layer++) { const rr = r * (1.3 - layer * .3), ll = len * (1 - layer * .17), g = ctx.createLinearGradient(x, y, x - ll, y); g.addColorStop(0, layer === 2 ? 'rgba(191,222,255,.8)' : 'rgba(87,138,255,.42)'); g.addColorStop(.13, 'rgba(255,224,147,.64)'); g.addColorStop(.4, 'rgba(255,140,57,.4)'); g.addColorStop(.8, 'rgba(255,99,31,.14)'); g.addColorStop(1, 'rgba(255,88,22,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y - rr * .5); for (let s = 0; s <= 32; s++) { const t = s / 32, wave = 1 + Math.sin(t * 19 - visual * 35) * .13 + Math.sin(t * 47 + visual * 21) * .08; ctx.lineTo(x - t * ll, y - rr * Math.sin((t * .84 + .16) * Math.PI) * wave); } for (let s = 32; s >= 0; s--) { const t = s / 32; ctx.lineTo(x - t * ll, y + rr * Math.sin((t * .84 + .16) * Math.PI) * (1 + Math.sin(t * 22 + visual * 33) * .12)); } ctx.closePath(); ctx.filter = `blur(${layer === 0 ? 3 : 1}px)`; ctx.fill(); }
    ctx.filter = 'none'; for (let i = 0; i < 5; i++) { const xx = x - len * (.12 + i * .125), ry = r * (.6 - i * .085), g = ctx.createRadialGradient(xx, y, 0, xx, y, ry * 2.5); g.addColorStop(0, 'rgba(255,231,194,.65)'); g.addColorStop(.25, 'rgba(167,196,255,.25)'); g.addColorStop(1, 'rgba(139,175,255,0)'); ctx.fillStyle = g; ctx.fillRect(xx - ry * 3, y - ry * 3, ry * 6, ry * 6); } ctx.restore();
  }
  function airplane() {
    const j = jetTransform(); currentJet = j; const throttle = state === 'idle' ? .04 : .15 + .85 * smooth(0, 2.5, time), rise = smooth(6.5, 12, time);
    if (rise < 1) { ctx.save(); ctx.globalAlpha = (1 - rise) * .45; ctx.filter = 'blur(7px)'; ctx.fillStyle = '#12191c'; ctx.beginPath(); ctx.ellipse(j.x, H * .81 + 4, j.w * .44, j.h * .035, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    thermal(j, throttle); ctx.save(); ctx.translate(j.x, j.y); ctx.rotate(j.angle); exhaust(j, throttle); const retract = smooth(9, 11, time); ctx.globalAlpha = 1; ctx.drawImage(assets.air, -j.w * .5, -j.h * .57, j.w, j.h); if (retract < 1) { ctx.globalAlpha = 1 - retract; ctx.drawImage(assets.gear, -j.w * .5, -j.h * .57, j.w, j.h); } ctx.globalAlpha = 1;
    if (Math.sin(visual * 5.5) > .92) { const x = -j.w * .09, y = j.h * .035, nav = ctx.createRadialGradient(x, y, 0, x, y, 4); nav.addColorStop(0, 'rgba(255,110,90,.85)'); nav.addColorStop(1, 'rgba(255,40,20,0)'); ctx.fillStyle = nav; ctx.fillRect(x - 4, y - 4, 8, 8); } ctx.restore();
    if (time > 11) { ctx.save(); ctx.globalAlpha = smooth(11, 15, time) * .2; const g = ctx.createLinearGradient(j.x - j.w * .8, j.y + j.h * .1, j.x - j.w * .1, j.y); g.addColorStop(0, 'rgba(240,248,255,0)'); g.addColorStop(1, 'rgba(248,251,255,.7)'); ctx.strokeStyle = g; ctx.lineWidth = 2; for (let s = 0; s < 2; s++) { ctx.beginPath(); ctx.moveTo(j.x - j.w * .12, j.y + s * 9); ctx.quadraticCurveTo(j.x - j.w * .5, j.y + 40, j.x - j.w * .95, j.y + 70 + s * 13); ctx.stroke(); } ctx.restore(); }
  }
  function explosion(dt) { const t = crashTime, fade = 1 - smooth(1.3, 3.7, t), size = Math.min(W * .7, H * .9) * (.28 + smooth(0, .7, t) * .92); ctx.save(); ctx.globalAlpha = fade; ctx.drawImage(assets.explosion, impact.x - size * .5, impact.y - size * .34, size, size * assets.explosion.height / assets.explosion.width); ctx.restore(); ctx.save(); ctx.globalCompositeOperation = 'screen'; for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += H * .12 * dt; const a = clamp(1 - t / p.life); if (a <= 0) continue; ctx.globalAlpha = a; ctx.strokeStyle = '#ffbe70'; ctx.lineWidth = p.r; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .027, p.y - p.vy * .027); ctx.stroke(); } ctx.restore(); if (t < .22) { ctx.fillStyle = `rgba(255,235,198,${(1 - t / .22) * .6})`; ctx.fillRect(0, 0, W, H); } }
  let soundEnabled = false, audioCtx, engineGain, noiseGain, osc1, osc2;
  function audioStart() { if (!soundEnabled) return; try { if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); engineGain = audioCtx.createGain(); engineGain.gain.value = 0; engineGain.connect(audioCtx.destination); osc1 = audioCtx.createOscillator(); osc1.type = 'sawtooth'; const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 240; osc1.connect(filter); filter.connect(engineGain); osc1.start(); osc2 = audioCtx.createOscillator(); const gain = audioCtx.createGain(); gain.gain.value = .23; osc2.connect(gain); gain.connect(engineGain); osc2.start(); const b = audioCtx.createBuffer(1, audioCtx.sampleRate * 3, audioCtx.sampleRate), d = b.getChannelData(0); let p = 0; for (let i = 0; i < d.length; i++) { p = (p + (Math.random() * 2 - 1) * .025) / 1.025; d[i] = p * 4; } const source = audioCtx.createBufferSource(); source.buffer = b; source.loop = true; noiseGain = audioCtx.createGain(); noiseGain.gain.value = 0; source.connect(noiseGain); noiseGain.connect(audioCtx.destination); source.start(); } audioCtx.resume(); } catch (e) { soundEnabled = false; toast('当前浏览器暂不支持音效'); } }
  function audioUpdate() { if (!audioCtx) return; const active = soundEnabled && !paused && state !== 'crash', power = state === 'idle' ? .03 : smooth(0, 3, time), t = audioCtx.currentTime; engineGain.gain.setTargetAtTime(active ? .02 + power * .04 : 0, t, .13); noiseGain.gain.setTargetAtTime(active ? .03 + power * .2 : 0, t, .15); osc1.frequency.setTargetAtTime(30 + power * 87, t, .15); osc2.frequency.setTargetAtTime(65 + power * 150, t, .15); }
  function boom() { if (!soundEnabled || !audioCtx) return; const n = audioCtx.sampleRate * 2, b = audioCtx.createBuffer(1, n, audioCtx.sampleRate), d = b.getChannelData(0); let p = 0; for (let i = 0; i < n; i++) { p = (p + Math.random() * 2 - 1) * .65; d[i] = p * (1 - i / n) ** 2; } const s = audioCtx.createBufferSource(), g = audioCtx.createGain(); s.buffer = b; g.gain.value = .48; s.connect(g); g.connect(audioCtx.destination); s.start(); }
  $('launch-btn').addEventListener('click', start); $('replay-btn').addEventListener('click', start); $('crash-btn').addEventListener('click', crash); $('pause-btn').addEventListener('click', pause);
  $('sound-btn').addEventListener('click', () => { soundEnabled = !soundEnabled; $('sound-btn').setAttribute('aria-pressed', String(soundEnabled)); $('sound-btn').setAttribute('aria-label', soundEnabled ? '关闭声音' : '开启声音'); $('sound-btn').classList.toggle('enabled', soundEnabled); audioStart(); toast(soundEnabled ? '引擎音效已开启' : '音效已关闭'); });
  $('fullscreen-btn').addEventListener('click', async () => { try { document.fullscreenElement ? await document.exitFullscreen() : await document.documentElement.requestFullscreen(); } catch (e) { toast('可按 F11 进入浏览器全屏'); } });
  $('cinema-btn').addEventListener('click', () => { const on = document.body.classList.toggle('cinema-mode'); $('cinema-btn').textContent = on ? '退出影院  ↙' : '影院模式  ↗'; $('cinema-btn').setAttribute('aria-pressed', String(on)); resize(); });
  document.addEventListener('keydown', e => { if (e.target.closest('input,textarea')) return; if (e.code === 'Escape') { document.body.classList.remove('cinema-mode'); $('cinema-btn').textContent = '影院模式  ↗'; $('cinema-btn').setAttribute('aria-pressed', 'false'); resize(); } if (e.code === 'KeyR') { e.preventDefault(); start(); } if (e.code === 'Space') { e.preventDefault(); state === 'flight' ? pause() : start(); } });
  document.addEventListener('visibilitychange', () => { lastNow = performance.now(); if (document.hidden && audioCtx) audioCtx.suspend(); else if (audioCtx && soundEnabled) audioCtx.resume(); });
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min((now - lastNow) / 1000, .06); lastNow = now; if (document.hidden || state === 'loading') return; if (!paused) visual += dt;
    if (state === 'flight' && !paused) { time = Math.min(DURATION, time + dt); speed = time < 7 ? 315 * (time / 7) ** 0.75 : Math.min(790, 315 + (time - 7) * 27); altitude = 1.6 * Math.max(0, time - 7) ** 2; multiplier = Math.exp(Math.max(0, time - 1) * .102); roadScroll += speed * dt * 2.6; setPhase(time < 6 ? 'roll' : time < 12 ? 'rotate' : 'climb'); if (time >= DURATION) crash(); }
    if (state === 'crash') { crashTime += dt; if (crashTime > 2.1 && $('end-panel').hidden) { $('end-panel').hidden = false; $('end-panel').classList.remove('hidden'); $('end-title').textContent = '飞行终止'; $('end-multiplier').textContent = multiplier.toFixed(2) + '×'; $('end-copy').textContent = `本轮飞行 ${time.toFixed(1)} 秒。再来一次，冲向更高处。`; } }
    ctx.save(); if (state === 'crash' && crashTime < .7) { const shake = (1 - crashTime / .7) * 6; ctx.translate(Math.sin(crashTime * 120) * shake, Math.cos(crashTime * 137) * shake); } background(); if (state !== 'crash') airplane(); else explosion(dt); ctx.restore(); audioUpdate(); if (now - lastHUD > 65) { lastHUD = now; hud(); }
  }
  $('launch-btn').disabled = true; $('pause-btn').disabled = true; $('crash-btn').disabled = true;
  Promise.all([
    load('backdrop', 'assets/backdrop.png'),
    load('runway', 'assets/runway-tile.png'),
    load('gear', 'assets/fighter-gear.png'),
    load('air', 'assets/fighter-air.png'),
    load('explosion', 'assets/explosion.png')
  ]).then(() => { state = 'idle'; $('loading').classList.add('hidden'); $('launch-btn').disabled = false; setPhase('idle'); hud(); }).catch(e => { $('loading').textContent = '素材加载失败，请保留完整 assets 文件夹后重新打开。'; console.error('Asset load failed:', e.message); });
  window.afterburn = { get state() { return state }, get time() { return time }, get multiplier() { return multiplier }, get paused() { return paused }, start, crash }; requestAnimationFrame(frame);
})();