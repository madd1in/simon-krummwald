/* ============================================================
   engine.js – Renderer, Eingabe, minimales HUD, Dialoge,
               Skalierung/Mobile, Audio, Hinweise, Spielstand

   Das Bild nutzt die volle Fläche 320x200. Es gibt keine
   Verbleiste mehr: Linksklick führt die sinnvolle Aktion aus,
   Rechtsklick schaut an, das Inventar blendet sich ein.
   ============================================================ */

var VW = 320, VH = 200;
var world, g, cv, ctx;
var scale = 3, cssScale = 3;
var rotated = false;
var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

var T = 0;
var mode = 'title';              /* title | play | ending */
var busy = false;
var bubble = null, dialogChoices = null;
var fadeVal = 0, fadeAnim = null;
var wipe = null;                 /* weiche Wischblende beim Ortswechsel */
var mouse = { x: 160, y: 100 };
var hoverObj = null, hoverInv = -1, hoverBtn = -1, hoverChoice = -1, hoverTitle = -1;
var pending = null;
var invOpen = false, invPinned = false, invScroll = 0;
var journalOpen = false;
var stepDist = 0;
var hintLevel = 0, hintKey = '';
var toast = null;

var state = { scene: 'lichtung', verb: 'gehe', inv: [], flags: {} };

var actor = { x: 160, y: 150, tx: 160, ty: 150, face: 1, dist: 0, moving: false, res: null, visible: true };

var VERBS = [
  { id: 'gehe', label: 'Gehe zu' }, { id: 'schau', label: 'Schau an' },
  { id: 'nimm', label: 'Nimm' }, { id: 'benutze', label: 'Benutze' },
  { id: 'rede', label: 'Rede mit' }, { id: 'gib', label: 'Gib' }
];

/* ---------------- HUD-Maße ---------------- */
var INVBAR = { h: 26, slot: 24, max: 11 };
var BTN = [
  { id: 'hinweis' }, { id: 'tagebuch' }, { id: 'musik' }, { id: 'stimme' }, { id: 'vollbild' }
];
(function () {
  for (var i = 0; i < BTN.length; i++) { BTN[i].x = 296 - i * 15; BTN[i].y = 4; BTN[i].w = 13; BTN[i].h = 12; }
})();

/* ---------------- Setup ---------------- */

function startEngine() {
  world = document.createElement('canvas'); world.width = VW; world.height = VH;
  g = world.getContext('2d');
  cv = document.getElementById('cv');
  ctx = cv.getContext('2d');
  bakeAtlas();
  expandScenes();
  if (isTouch) document.body.classList.add('mobile');
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  cv.addEventListener('pointermove', onPointerMove);
  cv.addEventListener('pointerdown', onPointerDown);
  cv.addEventListener('pointerup', onPointerUp);
  cv.addEventListener('pointercancel', cancelLong);
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('keydown', onKey);
  requestAnimationFrame(loop);
}

/* Laufflächen auf die volle Bildhöhe erweitern (Vordergrund gewinnt Platz) */
function expandScenes() {
  for (var k in SCENES) {
    var sc = SCENES[k];
    if (!sc.walk) continue;
    var y1 = sc.walk.y1, y2old = sc.walk.y2, y2new = sc.walk.y2 + 48;
    var mn = sc.scaleMin || .62, mxOld = sc.scaleMax || 1;
    /* scaleMax so nachziehen, dass die alte Größe an der alten Grundlinie erhalten bleibt */
    var t = (y2old - y1) / (y2new - y1);
    sc.walk.y2 = y2new;
    sc.scaleMax = mn + (mxOld - mn) / t;
  }
}

function resize() {
  var iw = window.innerWidth, ih = window.innerHeight - (isTouch ? 0 : 18);
  rotated = isTouch && ih > iw * 1.08;
  var availW = rotated ? ih : iw, availH = rotated ? iw : ih;
  var s = Math.max(0.4, Math.min(availW / VW, availH / VH));
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  cssScale = s; scale = s * dpr;
  cv.width = Math.round(VW * s * dpr); cv.height = Math.round(VH * s * dpr);
  cv.style.width = (VW * s) + 'px'; cv.style.height = (VH * s) + 'px';
  cv.style.transform = rotated ? 'rotate(90deg)' : 'none';
  ctx.imageSmoothingEnabled = false;
}

function toV(e) {
  var r = cv.getBoundingClientRect();
  var px = e.clientX - r.left, py = e.clientY - r.top;
  if (rotated) return { x: py / cssScale, y: (r.width - px) / cssScale };
  return { x: px / cssScale, y: py / cssScale };
}

/* ---------------- Hauptschleife ---------------- */

var last = 0;
function loop(nowMs) {
  var dt = Math.min(50, nowMs - (last || nowMs)); last = nowMs;
  T++;
  update(dt, nowMs);
  render();
  requestAnimationFrame(loop);
}

function update(dt, nowMs) {
  if (bubble) {
    var over = bubble.speechPending ? false : (nowMs - bubble.start > bubble.dur);
    if (bubble.skip || over) { var r = bubble.res; bubble = null; stopSpeech(); if (r) r(); }
  }
  if (fadeAnim) {
    var p = Math.min(1, (nowMs - fadeAnim.t0) / fadeAnim.ms);
    fadeVal = fadeAnim.from + (fadeAnim.to - fadeAnim.from) * p;
    if (p >= 1) { var fr = fadeAnim.res; fadeAnim = null; if (fr) fr(); }
  }
  if (wipe) { wipe.p += dt / wipe.ms; if (wipe.p >= 1) wipe = null; }
  if (toast && nowMs > toast.until) toast = null;

  if (actor.moving) {
    var dx = actor.tx - actor.x, dy = actor.ty - actor.y;
    var d = Math.hypot(dx, dy);
    var sp = 72 * dt / 1000;
    if (d <= sp) {
      actor.x = actor.tx; actor.y = actor.ty; actor.moving = false;
      var res = actor.res; actor.res = null; if (res) res();
    } else {
      actor.x += dx / d * sp; actor.y += dy / d * sp;
      actor.dist += sp; stepDist += sp;
      if (stepDist > 11) { stepDist = 0; sfx('step'); }
      if (Math.abs(dx) > .6) actor.face = dx > 0 ? 1 : -1;
    }
  }
  /* Inventarleiste ein-/ausblenden */
  var want = invPinned || pending || (!isTouch && mouse.y > VH - INVBAR.h - 6) || (isTouch && state.inv.length > 0);
  invOpen = !!want;
}

function actorScale() {
  var sc = SCENES[state.scene];
  var b = sc && sc.walk ? sc.walk : { y1: 100, y2: 186 };
  var mn = (sc && sc.scaleMin) || .62, mx = (sc && sc.scaleMax) || 1.5;
  var t = Math.max(0, Math.min(1, (actor.y - b.y1) / Math.max(1, b.y2 - b.y1)));
  return mn + t * (mx - mn);
}

/* ---------------- Rendering ---------------- */

function render() {
  g.fillStyle = '#000'; g.fillRect(0, 0, VW, VH);

  if (mode === 'title') { drawTitleScreen(T); }
  else if (mode === 'ending') { drawEndingScreen(T); }
  else {
    var sc = SCENES[state.scene];
    sc.draw(T, state.flags);
    if (actor.visible) {
      var f = 0, bob = 0, blink = false;
      if (actor.moving) f = [0, 1, 0, 3][Math.floor(actor.dist / 5) % 4];
      else { bob = Math.sin(T * .04) * .5; blink = (T % 190) < 7; }
      drawSimon(actor.x, actor.y + bob, actorScale(), f, actor.face, !!state.flags.hut, blink);
    }
    if (sc.front) sc.front(T, state.flags);
    if (sc.fx) drawFX(sc.fx, T);
    if (state.scene === 'hoehle' && has('fackel_an')) torchLight(actor.x, actor.y - 26 * actorScale());
    if (sc.tint) { g.fillStyle = sc.tint; g.fillRect(0, 0, VW, VH); }
    if (!journalOpen && invOpen && state.inv.length) drawInvBarWorld();
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(world, 0, 0, cv.width, cv.height);

  if (mode === 'title') drawTitleText();
  else if (mode === 'ending') drawEndingText();
  else drawHUD();

  if (bubble) drawBubble();
  postFX();

  if (wipe) {
    var wp = wipe.p, w = cv.width, h = cv.height;
    ctx.fillStyle = '#000';
    if (wipe.dir === 'out') ctx.fillRect(0, 0, w * wp, h);
    else ctx.fillRect(w * wp, 0, w * (1 - wp), h);
  }
  if (fadeVal > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fadeVal + ')'; ctx.fillRect(0, 0, cv.width, cv.height); }
}

/* --- Atmosphäre-Partikel --- */
function drawFX(kind, t) {
  var i, x, y, p;
  if (kind === 'leaves') {
    for (i = 0; i < 16; i++) {
      p = ((t * .3 + i * 37) % 210) / 210;
      x = 20 + rnd(i) * 280 + Math.sin(t * .03 + i) * 10;
      y = -6 + p * 214;
      R(x, y, 2, 2, i % 3 ? 'rgba(120,170,60,.5)' : 'rgba(180,150,50,.45)');
    }
  } else if (kind === 'fog') {
    for (i = 0; i < 7; i++) {
      x = ((t * .18 + i * 60) % 440) - 60;
      E(x, 96 + i * 13, 54, 7, 'rgba(190,205,190,.07)');
    }
    for (i = 0; i < 12; i++) {
      p = ((t * .012 + i * .085) % 1);
      E(24 + rnd(i) * 272, 196 - p * 70, 1.5, 1.5, 'rgba(200,230,190,' + (.3 - p * .3) + ')');
    }
    /* Nieselregen */
    for (i = 0; i < 40; i++) {
      p = ((t * .05 + i * .17) % 1);
      x = (rnd(i * 5.1) * 340 - 10) + p * 8;
      y = p * 210;
      R(x, y, 1, 3, 'rgba(180,200,190,.18)');
    }
  } else if (kind === 'dust') {
    for (i = 0; i < 26; i++) {
      p = ((t * .006 + i * .038) % 1);
      x = 14 + rnd(i * 3.1) * 292 + Math.sin(t * .02 + i) * 4;
      y = 196 - p * 190;
      R(x, y, 1, 1, 'rgba(255,235,190,' + (.32 * (1 - Math.abs(p - .5) * 2) + .04) + ')');
    }
  } else if (kind === 'ember') {
    for (i = 0; i < 22; i++) {
      p = ((t * .009 + i * .045) % 1);
      x = 170 + rnd(i * 2.7) * 145 + Math.sin(t * .04 + i * 2) * 7;
      y = 190 - p * 175;
      R(x, y, 1, 1, 'rgba(255,' + (130 + (i % 5) * 20) + ',60,' + (.7 - p * .7) + ')');
    }
  } else if (kind === 'fireflies') {
    for (i = 0; i < 20; i++) {
      var a = t * .012 + i * 1.7;
      x = 24 + rnd(i * 4.3) * 272 + Math.sin(a) * 18;
      y = 96 + rnd(i * 2.9) * 86 + Math.cos(a * .8) * 9;
      var gl = .25 + Math.abs(Math.sin(t * .06 + i * 2)) * .75;
      E(x, y, 1.4, 1.4, 'rgba(190,255,140,' + gl + ')');
      E(x, y, 3.4, 3.4, 'rgba(160,255,120,' + (gl * .15) + ')');
    }
  }
}

function torchLight(x, y) {
  var gr = g.createRadialGradient(x, y, 4, x, y, 110);
  gr.addColorStop(0, 'rgba(255,180,80,.30)');
  gr.addColorStop(.45, 'rgba(255,140,50,.11)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
}

function postFX() {
  var w = cv.width, h = cv.height;
  var gr = ctx.createRadialGradient(w / 2, h / 2, h * .5, w / 2, h / 2, h * 1.1);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
  if (cssScale >= 3) {
    ctx.fillStyle = 'rgba(0,0,0,.05)';
    for (var y = 0; y < h; y += Math.max(2, Math.round(scale / 2) * 2)) ctx.fillRect(0, y, w, 1);
  }
}

/* ---------------- Text ---------------- */

function setFont(size, bold) {
  ctx.font = (bold === false ? '' : 'bold ') + Math.round(size * scale) + 'px "Segoe UI",Tahoma,Verdana,sans-serif';
}
function txt(x, y, s, col, align, size, outline) {
  setFont(size || 7);
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'top';
  if (outline !== false) {
    ctx.lineWidth = Math.max(2, scale * 1.15); ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.92)';
    ctx.strokeText(s, x * scale, y * scale);
  }
  ctx.fillStyle = col; ctx.fillText(s, x * scale, y * scale);
}
function measure(s, size) { setFont(size || 7); return ctx.measureText(s).width / scale; }
function wrap(s, maxW, size) {
  var words = s.split(' '), lines = [], cur = '';
  for (var i = 0; i < words.length; i++) {
    var test = cur ? cur + ' ' + words[i] : words[i];
    if (measure(test, size) > maxW && cur) { lines.push(cur); cur = words[i]; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ---------------- Minimales HUD ---------------- */

function drawHUD() {
  if (journalOpen) { drawJournal(); return; }

  /* Dialogauswahl */
  if (dialogChoices) {
    var n = dialogChoices.opts.length, y0 = VH - 8 - n * 11;
    ctx.fillStyle = 'rgba(8,6,14,.55)';
    ctx.fillRect(0, (y0 - 6) * scale, cv.width, (VH - y0 + 6) * scale);
    for (var i = 0; i < n; i++) {
      txt(12, y0 + i * 11, (hoverChoice === i ? '▸ ' : '  ') + dialogChoices.opts[i],
        hoverChoice === i ? '#ffe58a' : '#d6cbec', 'left', 8);
    }
    return;
  }

  /* Objektbezeichnung am Zeiger */
  var label = cursorLabel();
  if (label) {
    var ly = Math.max(10, mouse.y - 12);
    txt(Math.max(30, Math.min(VW - 30, mouse.x)), ly, label, '#ffeeb8', 'center', 7.5);
  }

  /* Werkzeugleiste oben rechts */
  for (var b = 0; b < BTN.length; b++) {
    var t = BTN[b], hov = hoverBtn === b, on = btnOn(t.id);
    ctx.fillStyle = hov ? 'rgba(60,48,84,.85)' : 'rgba(20,16,30,.42)';
    ctx.fillRect(t.x * scale, t.y * scale, t.w * scale, t.h * scale);
    var col = on ? (hov ? '#ffe58a' : '#cbbde6') : '#6b6280';
    var sym = { hinweis: '?', tagebuch: '≡', musik: '♪', stimme: '☺', vollbild: '⛶' }[t.id];
    txt(t.x + t.w / 2, t.y + 1.5, sym, col, 'center', 8);
  }

  if (toast) txt(160, 12, toast.text, '#ffe58a', 'center', 7.5);
}

/* Die Leiste gehört in den Weltpuffer, weil die Item-Icons dort gezeichnet werden. */
function drawInvBarWorld() {
  var n = Math.min(INVBAR.max, state.inv.length);
  var w = n * INVBAR.slot, x0 = (VW - w) / 2, y0 = VH - INVBAR.h;
  g.fillStyle = 'rgba(10,8,18,.62)'; g.fillRect(0, y0, VW, INVBAR.h);
  g.fillStyle = 'rgba(140,116,184,.30)'; g.fillRect(0, y0, VW, 1);
  for (var i = 0; i < n; i++) {
    var id = state.inv[invScroll + i];
    if (!id) continue;
    var x = x0 + i * INVBAR.slot;
    var sel = pending && pending.kind === 'item' && pending.id === id;
    if (sel || hoverInv === invScroll + i) {
      g.fillStyle = sel ? 'rgba(150,95,235,.55)' : 'rgba(95,78,130,.45)';
      g.fillRect(x, y0 + 2, INVBAR.slot - 2, INVBAR.h - 4);
    }
    g.save(); g.translate(x + 2, y0 + 3); drawIcon(id, 0, 0); g.restore();
  }
}

function cursorLabel() {
  if (pending) {
    var vb = pending.kind === 'item' ? 'Benutze ' : '';
    return vb + pending.name + ' mit ' + (hoverObj ? hoverObj.name : (hoverInv >= 0 && state.inv[hoverInv] ? ITEMS[state.inv[hoverInv]].name : '…'));
  }
  if (hoverObj) return hoverObj.name;
  if (hoverInv >= 0 && state.inv[hoverInv]) return ITEMS[state.inv[hoverInv]].name;
  return '';
}

function btnOn(id) {
  if (id === 'musik') return AU.musicOn;
  if (id === 'stimme') return AU.speechOn;
  return true;
}

function drawJournal() {
  ctx.fillStyle = 'rgba(8,6,14,.86)';
  ctx.fillRect(0, 0, cv.width, cv.height);
  txt(160, 12, 'TAGEBUCH', '#ffd94a', 'center', 12);
  var steps = journalSteps(), y = 32;
  for (var i = 0; i < steps.length; i++) {
    var s = steps[i];
    txt(30, y, (s.done ? '✓ ' : '·  ') + s.text, s.done ? '#7fb96a' : '#d6cbec', 'left', 7.5);
    y += 10.5;
  }
  txt(160, VH - 14, 'Taste J oder Klick zum Schließen', 'rgba(220,210,240,.5)', 'center', 7);
}

function drawBubble() {
  var pos = speakerPos(bubble.who);
  var col = (SPEAKERS[bubble.who] || {}).color || '#ffffff';
  var lines = wrap(bubble.text, 216, 8);
  var lh = 10;
  var y0 = bubble.who === 'narrator' ? 12 : Math.max(4, pos.y - lines.length * lh - 4);
  var wMax = 0; for (var i = 0; i < lines.length; i++) wMax = Math.max(wMax, measure(lines[i], 8));
  var x = Math.max(4 + wMax / 2, Math.min(VW - 4 - wMax / 2, pos.x));
  if (bubble.who === 'narrator') {
    ctx.fillStyle = 'rgba(8,6,14,.66)';
    ctx.fillRect((x - wMax / 2 - 6) * scale, (y0 - 4) * scale, (wMax + 12) * scale, (lines.length * lh + 6) * scale);
  }
  for (var l = 0; l < lines.length; l++) txt(x, y0 + l * lh, lines[l], col, 'center', 8);
}

function speakerPos(who) {
  if (who === 'simon') return { x: actor.x, y: actor.y - 46 * actorScale() };
  if (who === 'narrator') return { x: 160, y: 14 };
  var sc = SCENES[state.scene];
  if (sc && sc.speakers && sc.speakers[who]) return { x: sc.speakers[who].x, y: sc.speakers[who].y };
  return { x: 160, y: 40 };
}

/* ---------------- Ablauf ---------------- */

function say(who, text) {
  return new Promise(function (res) {
    var b = { who: who, text: text, start: performance.now(), dur: Math.max(1500, text.length * 62), res: res, skip: false, speechPending: false };
    bubble = b;
    if (AU.speechOn) {
      var started = speak(who, text, function () { if (bubble === b) { b.speechPending = false; b.dur = 0; b.start = 0; } });
      if (started) { b.speechPending = true; setTimeout(function () { b.speechPending = false; }, 1000 + text.length * 160); }
    }
  });
}

function choose(opts) { return new Promise(function (res) { dialogChoices = { opts: opts, res: res }; }); }
function fadeTo(v, ms) { return new Promise(function (res) { fadeAnim = { from: fadeVal, to: v, ms: ms, t0: performance.now(), res: res }; }); }

function walkTo(x, y) {
  var b = SCENES[state.scene].walk;
  x = Math.max(b.x1, Math.min(b.x2, x));
  y = Math.max(b.y1, Math.min(b.y2, y));
  if (Math.hypot(x - actor.x, y - actor.y) < 2) return Promise.resolve();
  return new Promise(function (res) {
    if (actor.res) { var old = actor.res; actor.res = null; old(); }
    actor.tx = x; actor.ty = y; actor.moving = true; actor.res = res;
  });
}

async function goScene(id, x, y, face) {
  wipe = { p: 0, ms: 260, dir: 'out' };
  await fadeTo(1, 190);
  state.scene = id;
  var sc = SCENES[id];
  actor.x = (x === undefined ? sc.start.x : x);
  actor.y = (y === undefined ? sc.start.y : y);
  actor.tx = actor.x; actor.ty = actor.y; actor.moving = false;
  if (face) actor.face = face;
  invScroll = 0; hoverObj = null; hintLevel = 0;
  playMusic(id);
  saveGame();
  wipe = { p: 0, ms: 260, dir: 'in' };
  await fadeTo(0, 210);
  if (sc.onEnter) await sc.onEnter();
}

/* ---------------- Inventar ---------------- */

function has(id) { return state.inv.indexOf(id) >= 0; }
function add(id) { if (!has(id)) { state.inv.push(id); sfx('pick'); showToast(ITEMS[id].name + ' erhalten'); saveGame(); } }
function del(id) { var i = state.inv.indexOf(id); if (i >= 0) state.inv.splice(i, 1); saveGame(); }
function showToast(t) { toast = { text: t, until: performance.now() + 1800 }; }

/* ---------------- Spielstand ---------------- */

var SAVEKEY = 'krummwald.save.v1';
function saveGame() {
  if (mode !== 'play') return;
  try {
    localStorage.setItem(SAVEKEY, JSON.stringify({
      scene: state.scene, inv: state.inv, flags: state.flags,
      x: actor.x, y: actor.y, t: Date.now()
    }));
  } catch (e) {}
}
function loadGame() {
  try {
    var raw = localStorage.getItem(SAVEKEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
function hasSave() { return !!loadGame(); }
function clearSave() { try { localStorage.removeItem(SAVEKEY); } catch (e) {} }

async function continueGame() {
  var s = loadGame();
  if (!s) { startGame(); return; }
  mode = 'play';
  state.scene = s.scene; state.inv = s.inv || []; state.flags = s.flags || {};
  actor.x = s.x || 160; actor.y = s.y || 150; actor.tx = actor.x; actor.ty = actor.y;
  fadeVal = 1;
  audioInit(); playMusic(state.scene);
  await fadeTo(0, 600);
  showToast('Spielstand geladen');
}

/* ---------------- Eingabe ---------------- */

var longTimer = null, longFired = false, downPos = null;

function onPointerMove(e) {
  var p = toV(e);
  mouse.x = p.x; mouse.y = p.y;
  if (downPos && Math.hypot(p.x - downPos.x, p.y - downPos.y) > 6) cancelLong();
  if (e.pointerType === 'touch') return;
  updateHover(p);
}

function updateHover(p) {
  hoverObj = null; hoverInv = -1; hoverBtn = -1; hoverChoice = -1; hoverTitle = -1;
  if (mode === 'title') { hoverTitle = titleHit(p); return; }
  if (mode !== 'play' || journalOpen) return;

  for (var b = 0; b < BTN.length; b++) {
    var t = BTN[b];
    if (p.x >= t.x && p.x < t.x + t.w && p.y >= t.y && p.y < t.y + t.h) { hoverBtn = b; return; }
  }
  if (dialogChoices) {
    var n = dialogChoices.opts.length, y0 = VH - 8 - n * 11;
    var i = Math.floor((p.y - y0) / 11);
    if (i >= 0 && i < n) hoverChoice = i;
    return;
  }
  var slot = slotAt(p.x, p.y);
  if (slot >= 0) { hoverInv = slot; return; }
  hoverObj = objAt(p.x, p.y);
}

function slotAt(x, y) {
  if (!invOpen || !state.inv.length) return -1;
  var n = Math.min(INVBAR.max, state.inv.length);
  var w = n * INVBAR.slot, x0 = (VW - w) / 2, y0 = VH - INVBAR.h;
  if (y < y0) return -1;
  var i = Math.floor((x - x0) / INVBAR.slot);
  if (i < 0 || i >= n) return -1;
  return invScroll + i;
}

function objAt(x, y) {
  var sc = SCENES[state.scene];
  for (var i = sc.hotspots.length - 1; i >= 0; i--) {
    var h = sc.hotspots[i];
    if (h.when && !h.when()) continue;
    var r = h.rect;
    if (x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]) return h;
  }
  if (typeof SIMON_HS !== 'undefined' && insideActor(x, y)) return SIMON_HS;
  return null;
}

function insideActor(x, y) {
  var s = actorScale();
  return x > actor.x - 10 * s && x < actor.x + 10 * s && y > actor.y - 48 * s && y < actor.y + 2;
}

/* Welche Aktion ein Linksklick auslöst */
function defaultVerb(hs) {
  if (hs.def) return hs.def;
  if (hs.exit) return 'gehe';
  if (hs.talk) return 'rede';
  if (hs.take) return 'nimm';
  if (hs.use) return 'benutze';
  return 'schau';
}

function cancelLong() { if (longTimer) { clearTimeout(longTimer); longTimer = null; } }

function onPointerDown(e) {
  e.preventDefault(); audioInit();
  var p = toV(e); downPos = p;
  if (e.pointerType === 'touch') {
    longFired = false; cancelLong();
    longTimer = setTimeout(function () { longTimer = null; longFired = true; handleClick(p, true); }, 460);
    return;
  }
  handleClick(p, e.button === 2);
}

function onPointerUp(e) {
  if (e.pointerType !== 'touch') { downPos = null; return; }
  cancelLong(); downPos = null;
  if (longFired) { longFired = false; return; }
  handleClick(toV(e), false);
}

function handleClick(p, right) {
  if (mode === 'title') { titleClick(p); return; }
  if (mode === 'ending') { return; }
  if (journalOpen) { journalOpen = false; return; }
  if (bubble) { if (performance.now() - bubble.start > 180) bubble.skip = true; return; }

  updateHover(p);

  if (hoverBtn >= 0) { btnAction(BTN[hoverBtn].id); return; }

  if (dialogChoices) {
    if (hoverChoice >= 0) {
      var r = dialogChoices.res, i = hoverChoice;
      dialogChoices = null; hoverChoice = -1; sfx('click'); r(i);
    }
    return;
  }
  if (busy) return;

  /* Inventar */
  var slot = slotAt(p.x, p.y);
  if (slot >= 0 && state.inv[slot]) {
    var id = state.inv[slot];
    var ref = { kind: 'item', id: id, name: ITEMS[id].name };
    sfx('click');
    if (right) { run(doAction('schau', ref, null)); return; }
    if (pending) {
      if (pending.kind === 'item' && pending.id === id) { pending = null; return; }
      var a = pending; pending = null; run(doAction('benutze', a, ref)); return;
    }
    pending = ref;
    return;
  }
  if (slot >= 0) return;

  var hs = objAt(p.x, p.y);

  if (!hs) {
    if (pending) { pending = null; return; }
    if (!right) walkTo(p.x, p.y);
    return;
  }
  sfx('click');
  var hsRef = { kind: 'hs', hs: hs, name: hs.name };

  if (right) { pending = null; run(doAction('schau', hsRef, null)); return; }

  if (pending) {
    var pa = pending; pending = null;
    var verb = hs.give && ITEMS[pa.id] && hs.talk ? 'gib' : 'benutze';
    run(doAction(verb, pa, hsRef));
    return;
  }
  run(doAction(defaultVerb(hs), hsRef, null));
}

function onKey(e) {
  audioInit();
  if (mode === 'title') {
    if (e.key === ' ' || e.key === 'Enter') { hasSave() ? continueGame() : startGame(); }
    return;
  }
  if (journalOpen) { if (e.key === 'j' || e.key === 'J' || e.key === 'Escape') journalOpen = false; return; }
  if (bubble) { if (performance.now() - bubble.start > 200) bubble.skip = true; return; }
  var map = { '1': 'gehe', '2': 'schau', '3': 'nimm', '4': 'benutze', '5': 'rede', '6': 'gib' };
  if (map[e.key] && hoverObj) { run(doAction(map[e.key], { kind: 'hs', hs: hoverObj, name: hoverObj.name }, null)); return; }
  if (e.key === 'Escape') pending = null;
  if (e.key === 'i' || e.key === 'I' || e.key === 'Tab') { invPinned = !invPinned; e.preventDefault(); }
  if (e.key === 'j' || e.key === 'J') journalOpen = !journalOpen;
  if (e.key === 'h' || e.key === 'H') giveHint();
  if (e.key === 'm' || e.key === 'M') setMusic(!AU.musicOn);
  if (e.key === 'a' || e.key === 'A') exportAtlas();
}

function btnAction(id) {
  sfx('verb');
  if (id === 'musik') { setMusic(!AU.musicOn); showToast('Musik ' + (AU.musicOn ? 'an' : 'aus')); return; }
  if (id === 'stimme') { AU.speechOn = !AU.speechOn; if (!AU.speechOn) stopSpeech(); showToast('Sprachausgabe ' + (AU.speechOn ? 'an' : 'aus')); return; }
  if (id === 'hinweis') { giveHint(); return; }
  if (id === 'tagebuch') { journalOpen = !journalOpen; return; }
  if (id === 'vollbild') { toggleFullscreen(); return; }
}

function toggleFullscreen() {
  var d = document;
  if (!d.fullscreenElement && !d.webkitFullscreenElement) {
    var el = d.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
  } else { (d.exitFullscreen || d.webkitExitFullscreen || function () {}).call(d); }
  setTimeout(resize, 250);
}

function giveHint() {
  if (busy || bubble || dialogChoices || mode !== 'play') return;
  var h = getHint();
  if (!h) return;
  if (hintKey !== h.key) { hintKey = h.key; hintLevel = 0; }
  var lvl = Math.min(hintLevel, h.texts.length - 1);
  hintLevel = Math.min(hintLevel + 1, h.texts.length - 1);
  run(say('narrator', h.texts[lvl]));
}

function needsTwo(v) { return v === 'benutze' || v === 'gib'; }
function run(promise) {
  busy = true;
  Promise.resolve(promise).catch(function (err) { console.error(err); }).then(function () { busy = false; saveGame(); });
}

/* ---------------- Aktionsauflösung ---------------- */

async function doAction(verb, a, b) {
  if (needsTwo(verb) && b) {
    if (a.kind === 'item' && b.kind === 'item') {
      if (verb === 'gib') { await say('simon', 'Das eine dem anderen geben? Sehr philosophisch.'); return; }
      await combine(a.id, b.id); return;
    }
    var item = a.kind === 'item' ? a.id : (b.kind === 'item' ? b.id : null);
    var hs = a.kind === 'hs' ? a.hs : (b.kind === 'hs' ? b.hs : null);
    if (!item || !hs) { await say('simon', 'Das ergibt keinen Sinn.'); return; }
    await approach(hs);
    if (verb === 'gib' && hs.give) { await hs.give(item); return; }
    if (hs.use) { var handled = await hs.use(item); if (handled !== false) return; }
    if (hs.give) { await hs.give(item); return; }
    sfx('fail');
    await say('simon', defaultUse(item, hs));
    return;
  }

  if (a.kind === 'item') {
    var it = ITEMS[a.id];
    if (verb === 'schau') { await say('simon', it.desc); return; }
    if (verb === 'nimm') { await say('simon', 'Hab ich doch schon.'); return; }
    if (verb === 'rede') { await say('simon', 'Ich rede nicht mit meinem Gepäck. Noch nicht.'); return; }
    if (verb === 'benutze') {
      if (it.use) { await it.use(); return; }
      await say('simon', 'Nicht so einfach. Womit denn?'); return;
    }
    return;
  }

  var h = a.hs;
  if (verb === 'gehe') {
    if (h.exit) { await approach(h); await h.exit(); return; }
    await approach(h); return;
  }
  await approach(h);
  if (verb === 'schau') { await (h.look ? h.look() : say('simon', 'Nichts Besonderes.')); return; }
  if (verb === 'nimm') { await (h.take ? h.take() : say('simon', 'Das kann ich nicht mitnehmen.')); return; }
  if (verb === 'rede') { await (h.talk ? h.talk() : say('simon', 'Das antwortet mir nicht. Zum Glück.')); return; }
  if (verb === 'benutze') {
    if (h.use) { var r = await h.use(null); if (r !== false) return; }
    if (h.exit) { await h.exit(); return; }
    await say('simon', 'Damit kann ich so nichts anfangen.'); return;
  }
}

async function approach(h) {
  if (h.go) await walkTo(h.go[0], h.go[1]);
  if (h.face) actor.face = h.face;
}

function defaultUse(item, hs) {
  var msgs = [
    'Nein. ' + ITEMS[item].name + ' und ' + hs.name + ' – das passt nicht zusammen.',
    'Ich sehe nicht, wie mir das helfen sollte.',
    'Netter Versuch. Funktioniert aber nicht.',
    'Ich bin Zauberer, kein Bastler. Das klappt nicht.'
  ];
  return msgs[(item.length + hs.name.length) % msgs.length];
}
