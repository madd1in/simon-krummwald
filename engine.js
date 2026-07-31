/* ============================================================
   engine.js – Renderer, Eingabe, Verben, Inventar, Dialoge,
               Skalierung/Mobile, Audio-Anbindung, Hinweise
   ============================================================ */

var VW = 320, VH = 200, PANEL_Y = 142;
var world, g, cv, ctx;
var scale = 3;        /* Backing-Pixel pro virtuellem Pixel (inkl. DPR) */
var cssScale = 3;     /* CSS-Pixel pro virtuellem Pixel */
var rotated = false;  /* Hochformat auf Touchgeräten: Canvas um 90° gedreht */
var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

var T = 0;
var mode = 'title';              /* title | play | ending */
var busy = false;
var bubble = null, dialogChoices = null;
var fadeVal = 0, fadeAnim = null;
var mouse = { x: 160, y: 100 };
var hoverObj = null, hoverInv = -1, hoverVerb = -1, hoverChoice = -1, hoverBtn = -1;
var pending = null;
var invScroll = 0;
var stepDist = 0;
var hintLevel = 0, hintKey = '';

var state = {
  scene: 'lichtung',
  verb: 'gehe',
  inv: [],
  flags: {}
};

var actor = { x: 160, y: 126, tx: 160, ty: 126, face: 1, dist: 0, moving: false, res: null, visible: true };

var VERBS = [
  { id: 'gehe', label: 'Gehe zu' },
  { id: 'schau', label: 'Schau an' },
  { id: 'nimm', label: 'Nimm' },
  { id: 'benutze', label: 'Benutze' },
  { id: 'rede', label: 'Rede mit' },
  { id: 'gib', label: 'Gib' }
];

/* ---------------- Layout ---------------- */
var VB = [];
(function () {
  for (var i = 0; i < 6; i++) {
    var col = i < 3 ? 0 : 1, row = i % 3;
    VB.push({ x: 6 + col * 66, y: 152 + row * 16, w: 62, h: 15, v: VERBS[i] });
  }
})();
var INV = { x: 146, y: 152, cw: 34, ch: 22, cols: 4, rows: 2 };
var ARR = { x: 283, w: 14, h: 22, yUp: 152, yDn: 175 };
var BTN = [
  { id: 'musik',  x: 300, y: 152, w: 17, h: 11 },
  { id: 'stimme', x: 300, y: 164, w: 17, h: 11 },
  { id: 'hinweis',x: 300, y: 176, w: 17, h: 11 },
  { id: 'vollbild', x: 300, y: 188, w: 17, h: 11 }
];

/* ---------------- Setup ---------------- */

function startEngine() {
  world = document.createElement('canvas'); world.width = VW; world.height = VH;
  g = world.getContext('2d');
  cv = document.getElementById('cv');
  ctx = cv.getContext('2d');
  bakeAtlas();                       /* Sprites & Kacheln einmalig backen */
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

function resize() {
  var iw = window.innerWidth, ih = window.innerHeight - (isTouch ? 0 : 22);
  rotated = isTouch && ih > iw * 1.08;
  var availW = rotated ? ih : iw, availH = rotated ? iw : ih;
  var s = Math.min(availW / VW, availH / VH);
  s = Math.max(0.4, s);        /* darf auch schrumpfen, damit nichts überläuft */
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  cssScale = s;
  scale = s * dpr;
  cv.width = Math.round(VW * s * dpr);
  cv.height = Math.round(VH * s * dpr);
  cv.style.width = (VW * s) + 'px';
  cv.style.height = (VH * s) + 'px';
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
    if (bubble.skip || over) {
      var r = bubble.res; bubble = null; stopSpeech(); if (r) r();
    }
  }
  if (fadeAnim) {
    var p = Math.min(1, (nowMs - fadeAnim.t0) / fadeAnim.ms);
    fadeVal = fadeAnim.from + (fadeAnim.to - fadeAnim.from) * p;
    if (p >= 1) { var fr = fadeAnim.res; fadeAnim = null; if (fr) fr(); }
  }
  if (actor.moving) {
    var dx = actor.tx - actor.x, dy = actor.ty - actor.y;
    var d = Math.hypot(dx, dy);
    var sp = 66 * dt / 1000;
    if (d <= sp) {
      actor.x = actor.tx; actor.y = actor.ty; actor.moving = false;
      var res = actor.res; actor.res = null; if (res) res();
    } else {
      actor.x += dx / d * sp; actor.y += dy / d * sp;
      actor.dist += sp; stepDist += sp;
      if (stepDist > 10) { stepDist = 0; sfx('step'); }
      if (Math.abs(dx) > .6) actor.face = dx > 0 ? 1 : -1;
    }
  }
}

function actorScale() {
  var sc = SCENES[state.scene];
  var b = sc && sc.walk ? sc.walk : { y1: 100, y2: 138 };
  var mn = (sc && sc.scaleMin) || .62, mx = (sc && sc.scaleMax) || 1;
  var t = (actor.y - b.y1) / Math.max(1, b.y2 - b.y1);
  t = Math.max(0, Math.min(1, t));
  return mn + t * (mx - mn);
}

/* ---------------- Rendering ---------------- */

function render() {
  g.fillStyle = '#000'; g.fillRect(0, 0, VW, VH);

  if (mode === 'title') { drawTitleScreen(T); }
  else if (mode === 'ending') { drawEndingScreen(T); }
  else {
    var sc = SCENES[state.scene];
    g.save(); g.beginPath(); g.rect(0, 0, VW, PANEL_Y); g.clip();
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
    g.restore();
    drawPanel();
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(world, 0, 0, cv.width, cv.height);

  if (mode === 'title') drawTitleText();
  else if (mode === 'ending') drawEndingText();
  else drawUIText();

  if (bubble) drawBubble();
  postFX();

  if (fadeVal > 0) {
    ctx.fillStyle = 'rgba(0,0,0,' + fadeVal + ')';
    ctx.fillRect(0, 0, cv.width, cv.height);
  }
}

/* --- Atmosphäre-Partikel (deterministisch aus T) --- */
function drawFX(kind, t) {
  var i, x, y, p;
  if (kind === 'leaves') {
    for (i = 0; i < 14; i++) {
      p = ((t * .35 + i * 37) % 160) / 160;
      x = 20 + rnd(i) * 280 + Math.sin(t * .03 + i) * 9;
      y = -6 + p * 150;
      if (y > PANEL_Y) continue;
      R(x, y, 2, 2, i % 3 ? 'rgba(120,170,60,.55)' : 'rgba(180,150,50,.5)');
    }
  } else if (kind === 'fog') {
    for (i = 0; i < 6; i++) {
      x = ((t * .18 + i * 66) % 420) - 60;
      E(x, 96 + i * 8, 52, 6, 'rgba(190,205,190,.07)');
    }
    for (i = 0; i < 10; i++) {
      p = ((t * .012 + i * .1) % 1);
      E(30 + rnd(i) * 260, 138 - p * 42, 1.5, 1.5, 'rgba(200,230,190,' + (.30 - p * .30) + ')');
    }
  } else if (kind === 'dust') {
    for (i = 0; i < 22; i++) {
      p = ((t * .006 + i * .045) % 1);
      x = 14 + rnd(i * 3.1) * 292 + Math.sin(t * .02 + i) * 4;
      y = 138 - p * 128;
      R(x, y, 1, 1, 'rgba(255,235,190,' + (.34 * (1 - Math.abs(p - .5) * 2) + .04) + ')');
    }
  } else if (kind === 'ember') {
    for (i = 0; i < 18; i++) {
      p = ((t * .009 + i * .056) % 1);
      x = 180 + rnd(i * 2.7) * 130 + Math.sin(t * .04 + i * 2) * 6;
      y = 132 - p * 120;
      R(x, y, 1, 1, 'rgba(255,' + (130 + (i % 5) * 20) + ',60,' + (.7 - p * .7) + ')');
    }
  } else if (kind === 'fireflies') {
    for (i = 0; i < 16; i++) {
      var a = t * .012 + i * 1.7;
      x = 30 + rnd(i * 4.3) * 260 + Math.sin(a) * 16;
      y = 96 + rnd(i * 2.9) * 40 + Math.cos(a * .8) * 8;
      var gl = .25 + Math.abs(Math.sin(t * .06 + i * 2)) * .75;
      E(x, y, 1.4, 1.4, 'rgba(190,255,140,' + gl + ')');
      E(x, y, 3, 3, 'rgba(160,255,120,' + (gl * .16) + ')');
    }
  }
}

/* Fackelschein in der Höhle */
function torchLight(x, y) {
  var gr = g.createRadialGradient(x, y, 4, x, y, 96);
  gr.addColorStop(0, 'rgba(255,180,80,.30)');
  gr.addColorStop(.45, 'rgba(255,140,50,.11)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, VW, PANEL_Y);
}

/* Vignette + Scanlines auf dem sichtbaren Canvas */
function postFX() {
  var w = cv.width, h = Math.round(PANEL_Y * scale);
  var gr = ctx.createRadialGradient(w / 2, h / 2, h * .42, w / 2, h / 2, h * 1.15);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,.42)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
  if (cssScale >= 3) {
    ctx.fillStyle = 'rgba(0,0,0,.055)';
    for (var y = 0; y < h; y += Math.max(2, Math.round(scale / 2) * 2)) ctx.fillRect(0, y, w, 1);
  }
}

function drawPanel() {
  R(0, PANEL_Y, VW, VH - PANEL_Y, '#2b2338');
  R(0, PANEL_Y, VW, 1, '#6a5a86');
  R(0, PANEL_Y + 1, VW, 1, '#3c3150');
  R(0, VH - 1, VW, 1, '#171220');

  if (dialogChoices) {
    R(2, PANEL_Y + 3, VW - 4, VH - PANEL_Y - 6, '#231b2e');
    R(2, PANEL_Y + 3, VW - 4, 1, '#4a3d60');
    return;
  }

  for (var i = 0; i < VB.length; i++) {
    var b = VB[i], sel = state.verb === b.v.id, hov = hoverVerb === i;
    R(b.x, b.y, b.w, b.h, sel ? '#584479' : (hov ? '#3d3252' : '#332a45'));
    R(b.x, b.y, b.w, 1, sel ? '#8d74b8' : '#453a5c');
    R(b.x, b.y + b.h - 1, b.w, 1, '#211a2d');
  }

  R(INV.x - 2, INV.y - 2, INV.cols * INV.cw + 4, INV.rows * INV.ch + 5, '#211a2d');
  for (var s = 0; s < INV.cols * INV.rows; s++) {
    var cx = INV.x + (s % INV.cols) * INV.cw, cy = INV.y + Math.floor(s / INV.cols) * (INV.ch + 1);
    var idx = invScroll * INV.cols + s;
    var item = state.inv[idx];
    R(cx, cy, INV.cw - 1, INV.ch, hoverInv === idx && item ? '#4a3d60' : '#2e2640');
    if (item) {
      if (pending && pending.kind === 'item' && pending.id === item) R(cx, cy, INV.cw - 1, INV.ch, '#6b4f9a');
      g.save(); g.translate(cx + (INV.cw - 1) / 2 - 10, cy + INV.ch / 2 - 10);
      drawIcon(item, 0, 0); g.restore();
    }
  }

  var maxScroll = Math.max(0, Math.ceil(state.inv.length / INV.cols) - INV.rows);
  R(ARR.x, ARR.yUp, ARR.w, ARR.h, invScroll > 0 ? '#3d3252' : '#2a2338');
  R(ARR.x, ARR.yDn, ARR.w, ARR.h, invScroll < maxScroll ? '#3d3252' : '#2a2338');
  P([ARR.x + 7, ARR.yUp + 7, ARR.x + 11, ARR.yUp + 15, ARR.x + 3, ARR.yUp + 15], invScroll > 0 ? '#c9b8e6' : '#4a4258');
  P([ARR.x + 7, ARR.yDn + 15, ARR.x + 11, ARR.yDn + 7, ARR.x + 3, ARR.yDn + 7], invScroll < maxScroll ? '#c9b8e6' : '#4a4258');

  /* Schaltflächen: Musik / Stimme / Hinweis / Vollbild */
  for (var k = 0; k < BTN.length; k++) {
    var t = BTN[k], on = btnState(t.id);
    R(t.x, t.y, t.w, t.h, hoverBtn === k ? '#4a3d60' : '#332a45');
    R(t.x, t.y, t.w, 1, '#453a5c');
    var col = on ? '#ffe58a' : '#6b6280';
    var mx = t.x + t.w / 2, my = t.y + t.h / 2;
    if (t.id === 'musik') {
      R(mx + 1, my - 4, 1, 6, col); R(mx + 1, my - 4, 4, 1, col); R(mx + 4, my - 4, 1, 5, col);
      E(mx, my + 2, 2, 1.6, col); E(mx + 3.5, my + 1, 2, 1.6, col);
      if (!on) L(t.x + 3, t.y + 2, t.x + t.w - 3, t.y + t.h - 2, '#c05a5a', 1);
    } else if (t.id === 'stimme') {
      P([mx - 5, my - 4, mx + 4, my - 4, mx + 4, my + 1, mx - 1, my + 1, mx - 3, my + 4, mx - 3, my + 1, mx - 5, my + 1], col);
      if (!on) L(t.x + 3, t.y + 2, t.x + t.w - 3, t.y + t.h - 2, '#c05a5a', 1);
    } else if (t.id === 'vollbild') {
      R(mx - 5, my - 4, 4, 1, col); R(mx - 5, my - 4, 1, 3, col);
      R(mx + 1, my - 4, 4, 1, col); R(mx + 4, my - 4, 1, 3, col);
      R(mx - 5, my + 3, 4, 1, col); R(mx - 5, my + 1, 1, 3, col);
      R(mx + 1, my + 3, 4, 1, col); R(mx + 4, my + 1, 1, 3, col);
    }
  }
}

function btnState(id) {
  if (id === 'musik') return AU.musicOn;
  if (id === 'stimme') return AU.speechOn;
  return true;
}

/* ---------------- Text ---------------- */

function setFont(size, bold) {
  ctx.font = (bold === false ? '' : 'bold ') + Math.round(size * scale) + 'px "Segoe UI",Tahoma,Verdana,sans-serif';
}

function txt(x, y, s, col, align, size, outline) {
  setFont(size || 7);
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  if (outline !== false) {
    ctx.lineWidth = Math.max(2, scale * 1.1); ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.9)';
    ctx.strokeText(s, x * scale, y * scale);
  }
  ctx.fillStyle = col;
  ctx.fillText(s, x * scale, y * scale);
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

function drawUIText() {
  var line = statusLine();
  if (line) txt(160, 143.5, line, '#e8dcff', 'center', 7.5);

  if (dialogChoices) {
    for (var i = 0; i < dialogChoices.opts.length; i++) {
      var y = 145 + i * 10.5;
      txt(8, y, (hoverChoice === i ? '▸ ' : '  ') + dialogChoices.opts[i],
        hoverChoice === i ? '#ffe58a' : '#c9b8e6', 'left', 7.5);
    }
    return;
  }
  for (var v = 0; v < VB.length; v++) {
    var b = VB[v];
    txt(b.x + b.w / 2, b.y + 3.5, b.v.label, state.verb === b.v.id ? '#ffe58a' : '#cbbde6', 'center', 7.5);
  }
  txt(308.5, 178.5, '?', hoverBtn === 2 ? '#ffe58a' : '#cbbde6', 'center', 8);
}

function statusLine() {
  if (dialogChoices) return '';
  var vb = VERBS.find(function (v) { return v.id === state.verb; });
  var target = hoverObj ? hoverObj.name : (hoverInv >= 0 && state.inv[hoverInv] ? ITEMS[state.inv[hoverInv]].name : '');
  if (pending) return vb.label + ' ' + pending.name + (state.verb === 'gib' ? ' an ' : ' mit ') + (target || '...');
  return target ? vb.label + ' ' + target : '';
}

function drawBubble() {
  var pos = speakerPos(bubble.who);
  var col = (SPEAKERS[bubble.who] || {}).color || '#ffffff';
  var maxW = 210;
  var lines = wrap(bubble.text, maxW, 7.5);
  var lh = 9.5;
  var y0 = bubble.who === 'narrator' ? 8 : Math.max(3, pos.y - lines.length * lh - 4);
  var wMax = 0; for (var i = 0; i < lines.length; i++) wMax = Math.max(wMax, measure(lines[i], 7.5));
  var x = Math.max(4 + wMax / 2, Math.min(VW - 4 - wMax / 2, pos.x));
  if (bubble.who === 'narrator') {
    ctx.fillStyle = 'rgba(10,8,16,.72)';
    ctx.fillRect((x - wMax / 2 - 5) * scale, (y0 - 3) * scale, (wMax + 10) * scale, (lines.length * lh + 5) * scale);
  }
  for (var l = 0; l < lines.length; l++) txt(x, y0 + l * lh, lines[l], col, 'center', 7.5);
}

function speakerPos(who) {
  if (who === 'simon') return { x: actor.x, y: actor.y - 46 * actorScale() };
  if (who === 'narrator') return { x: 160, y: 10 };
  var sc = SCENES[state.scene];
  if (sc && sc.speakers && sc.speakers[who]) return { x: sc.speakers[who].x, y: sc.speakers[who].y };
  return { x: 160, y: 40 };
}

/* ---------------- Ablaufsteuerung ---------------- */

function say(who, text) {
  return new Promise(function (res) {
    var b = {
      who: who, text: text, start: performance.now(),
      dur: Math.max(1500, text.length * 62), res: res, skip: false, speechPending: false
    };
    bubble = b;
    if (AU.speechOn) {
      var started = speak(who, text, function () {
        if (bubble === b) { b.speechPending = false; b.dur = 0; b.start = 0; }
      });
      if (started) { b.speechPending = true; setTimeout(function () { b.speechPending = false; }, 1000 + text.length * 160); }
    }
  });
}

function choose(opts) {
  return new Promise(function (res) { dialogChoices = { opts: opts, res: res }; });
}

function fadeTo(v, ms) {
  return new Promise(function (res) { fadeAnim = { from: fadeVal, to: v, ms: ms, t0: performance.now(), res: res }; });
}

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
  await fadeTo(1, 200);
  state.scene = id;
  var sc = SCENES[id];
  actor.x = (x === undefined ? sc.start.x : x);
  actor.y = (y === undefined ? sc.start.y : y);
  actor.tx = actor.x; actor.ty = actor.y; actor.moving = false;
  if (face) actor.face = face;
  invScroll = 0; hoverObj = null; hintLevel = 0;
  playMusic(id);
  await fadeTo(0, 220);
  if (sc.onEnter) await sc.onEnter();
}

/* ---------------- Inventar ---------------- */

function has(id) { return state.inv.indexOf(id) >= 0; }
function add(id) { if (!has(id)) { state.inv.push(id); sfx('pick'); } }
function del(id) { var i = state.inv.indexOf(id); if (i >= 0) state.inv.splice(i, 1); }

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
  hoverObj = null; hoverInv = -1; hoverVerb = -1; hoverChoice = -1; hoverBtn = -1;
  if (mode !== 'play') return;
  if (dialogChoices) {
    if (p.y >= PANEL_Y) {
      var i = Math.floor((p.y - 144.5) / 10.5);
      if (i >= 0 && i < dialogChoices.opts.length) hoverChoice = i;
    }
    return;
  }
  if (p.y < PANEL_Y) { hoverObj = objAt(p.x, p.y); return; }
  for (var v = 0; v < VB.length; v++) {
    var b = VB[v];
    if (p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h) hoverVerb = v;
  }
  for (var k = 0; k < BTN.length; k++) {
    var t = BTN[k];
    if (p.x >= t.x && p.x < t.x + t.w && p.y >= t.y && p.y < t.y + t.h) hoverBtn = k;
  }
  var slot = slotAt(p.x, p.y);
  if (slot >= 0 && state.inv[slot]) hoverInv = slot;
}

function cancelLong() { if (longTimer) { clearTimeout(longTimer); longTimer = null; } }

function onPointerDown(e) {
  e.preventDefault();
  audioInit();
  var p = toV(e);
  downPos = p;
  if (e.pointerType === 'touch') {
    longFired = false;
    cancelLong();
    longTimer = setTimeout(function () {
      longTimer = null; longFired = true;
      handleClick(p, true);
    }, 460);
    return;
  }
  handleClick(p, e.button === 2);
}

function onPointerUp(e) {
  if (e.pointerType !== 'touch') { downPos = null; return; }
  cancelLong();
  downPos = null;
  if (longFired) { longFired = false; return; }
  handleClick(toV(e), false);
}

function handleClick(p, right) {
  if (mode === 'title') { startGame(); return; }
  if (mode === 'ending') { return; }

  if (bubble) { if (performance.now() - bubble.start > 180) bubble.skip = true; return; }

  updateHover(p);

  if (dialogChoices) {
    if (p.y >= PANEL_Y) {
      var i = Math.floor((p.y - 144.5) / 10.5);
      if (i >= 0 && i < dialogChoices.opts.length) {
        var r = dialogChoices.res; dialogChoices = null; hoverChoice = -1; sfx('click');
        r(i);
      }
    }
    return;
  }
  if (busy) return;

  if (p.y >= PANEL_Y) { panelClick(p, right); return; }

  var hs = objAt(p.x, p.y);
  var verb = right ? 'schau' : state.verb;

  if (!hs) {
    if (!right && !pending) walkTo(p.x, p.y);
    else pending = null;
    return;
  }
  sfx('click');
  if (right) { pending = null; run(doAction('schau', { kind: 'hs', hs: hs, name: hs.name })); return; }

  var ref = { kind: 'hs', hs: hs, name: hs.name };
  if (needsTwo(verb)) {
    if (pending) { var a = pending; pending = null; run(doAction(verb, a, ref)); }
    else if (verb === 'benutze') run(doAction('benutze', ref, null));
    else run(say('simon', 'Ich sollte zuerst auswählen, was ich hergeben will.'));
  } else {
    run(doAction(verb, ref, null));
  }
}

function slotAt(x, y) {
  for (var s = 0; s < INV.cols * INV.rows; s++) {
    var cx = INV.x + (s % INV.cols) * INV.cw, cy = INV.y + Math.floor(s / INV.cols) * (INV.ch + 1);
    if (x >= cx && x < cx + INV.cw - 1 && y >= cy && y < cy + INV.ch) return invScroll * INV.cols + s;
  }
  return -1;
}

function objAt(x, y) {
  var sc = SCENES[state.scene];
  for (var i = sc.hotspots.length - 1; i >= 0; i--) {
    var h = sc.hotspots[i];
    if (h.when && !h.when()) continue;
    var r = h.rect;
    if (x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]) return h;
  }
  return null;
}

function onKey(e) {
  audioInit();
  if (mode === 'title') { if (e.key === ' ' || e.key === 'Enter') startGame(); return; }
  if (bubble) { if (performance.now() - bubble.start > 200) bubble.skip = true; return; }
  var map = { '1': 'gehe', '2': 'schau', '3': 'nimm', '4': 'benutze', '5': 'rede', '6': 'gib' };
  if (map[e.key]) { state.verb = map[e.key]; pending = null; sfx('verb'); }
  if (e.key === 'Escape') pending = null;
  if (e.key === 'h' || e.key === 'H') giveHint();
  if (e.key === 'a' || e.key === 'A') exportAtlas();
  if (e.key === 'm' || e.key === 'M') setMusic(!AU.musicOn);
}

function panelClick(p, right) {
  for (var v = 0; v < VB.length; v++) {
    var b = VB[v];
    if (p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h) {
      state.verb = b.v.id; pending = null; sfx('verb'); return;
    }
  }
  for (var k = 0; k < BTN.length; k++) {
    var t = BTN[k];
    if (p.x >= t.x && p.x < t.x + t.w && p.y >= t.y && p.y < t.y + t.h) { btnAction(t.id); return; }
  }
  var maxScroll = Math.max(0, Math.ceil(state.inv.length / INV.cols) - INV.rows);
  if (p.x >= ARR.x && p.x < ARR.x + ARR.w) {
    if (p.y >= ARR.yUp && p.y < ARR.yUp + ARR.h) { invScroll = Math.max(0, invScroll - 1); sfx('verb'); return; }
    if (p.y >= ARR.yDn && p.y < ARR.yDn + ARR.h) { invScroll = Math.min(maxScroll, invScroll + 1); sfx('verb'); return; }
  }
  var slot = slotAt(p.x, p.y);
  if (slot < 0) return;
  var id = state.inv[slot];
  if (!id) { pending = null; return; }
  sfx('click');
  var ref = { kind: 'item', id: id, name: ITEMS[id].name };
  var verb = right ? 'schau' : state.verb;
  if (verb === 'schau') { run(doAction('schau', ref, null)); return; }
  if (needsTwo(verb)) {
    if (!pending) { pending = ref; return; }
    var a = pending; pending = null;
    run(doAction(verb, a, ref));
  } else {
    run(doAction(verb, ref, null));
  }
}

function btnAction(id) {
  sfx('verb');
  if (id === 'musik') { setMusic(!AU.musicOn); return; }
  if (id === 'stimme') {
    AU.speechOn = !AU.speechOn;
    if (!AU.speechOn) stopSpeech();
    return;
  }
  if (id === 'hinweis') { giveHint(); return; }
  if (id === 'vollbild') { toggleFullscreen(); return; }
}

function toggleFullscreen() {
  var d = document;
  if (!d.fullscreenElement && !d.webkitFullscreenElement) {
    var el = d.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
  } else {
    (d.exitFullscreen || d.webkitExitFullscreen || function () {}).call(d);
  }
  setTimeout(resize, 250);
}

function giveHint() {
  if (busy || bubble || dialogChoices || mode !== 'play') return;
  var h = getHint();
  if (!h) return;
  if (hintKey !== h.key) { hintKey = h.key; hintLevel = 0; }
  var texts = h.texts;
  var lvl = Math.min(hintLevel, texts.length - 1);
  hintLevel = Math.min(hintLevel + 1, texts.length - 1);
  run(say('narrator', texts[lvl]));
}

function needsTwo(v) { return v === 'benutze' || v === 'gib'; }

function run(promise) {
  busy = true;
  Promise.resolve(promise).catch(function (err) { console.error(err); }).then(function () { busy = false; });
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
    if (verb === 'gib') {
      if (hs.give) { await hs.give(item); return; }
      await say('simon', 'Das nimmt mir keiner ab.'); return;
    }
    if (hs.use) { var handled = await hs.use(item); if (handled !== false) return; }
    sfx('fail');
    await say('simon', defaultUse(item, hs));
    return;
  }

  if (a.kind === 'item') {
    var it = ITEMS[a.id];
    if (verb === 'gehe') { await say('simon', 'Dahin gehen? Das habe ich doch schon in der Tasche.'); return; }
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
