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
var sceneEnteredAt = 0;
var revealUntil = 0;
var touchHoldStart = 0, tapPulse = null;

var state = { scene: 'lichtung', verb: 'gehe', inv: [], flags: {} };

var actor = { x: 160, y: 150, tx: 160, ty: 150, face: 1, dist: 0, moving: false, res: null, visible: true, bendUntil: 0 };

var VERBS = [
  { id: 'gehe', label: 'Gehe zu' }, { id: 'schau', label: 'Schau an' },
  { id: 'nimm', label: 'Nimm' }, { id: 'benutze', label: 'Benutze' },
  { id: 'rede', label: 'Rede mit' }, { id: 'gib', label: 'Gib' }
];

/* ---------------- HUD-Maße ---------------- */
var INVBAR = { h: 26, slot: 24, max: 11, y: VH - 26 };
var SAFE = { x0: 0, y0: 0, x1: VW, y1: VH };   /* sichtbarer Ausschnitt */
var fillMode = true;                            /* Bildschirm ausfüllen */
var BTN = [
  { id: 'hinweis' }, { id: 'magie' }, { id: 'tagebuch' }, { id: 'musik' }, { id: 'stimme' }, { id: 'vollbild' }
];
(function () {
  var w = isTouch ? 24 : 13, h = isTouch ? 22 : 12, gap = isTouch ? 3 : 2;
  for (var i = 0; i < BTN.length; i++) {
    BTN[i].x = VW - 4 - w - i * (w + gap);
    BTN[i].y = 4;
    BTN[i].w = w;
    BTN[i].h = h;
  }
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
  document.addEventListener('fullscreenchange', function () { setTimeout(resize, 60); });
  document.addEventListener('webkitfullscreenchange', function () { setTimeout(resize, 60); });
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
  var full = isFullscreen();
  var iw = window.innerWidth, ih = window.innerHeight - ((isTouch || full) ? 0 : 18);
  rotated = isTouch && ih > iw * 1.08;
  var availW = rotated ? ih : iw, availH = rotated ? iw : ih;

  var sContain = Math.min(availW / VW, availH / VH);
  var sCover = Math.max(availW / VW, availH / VH);
  /* Bildschirm füllen. Die Obergrenze greift nur bei extremen
     Seitenverhältnissen; übliche Bildschirme (16:9, 16:10, 4:3)
     werden dadurch vollständig ausgefüllt. */
  var s = fillMode ? Math.min(sCover, sContain * 1.75) : sContain;
  s = Math.max(0.4, s);

  var dpr = Math.min(2, window.devicePixelRatio || 1);
  cssScale = s; scale = s * dpr;
  cv.width = Math.round(VW * s * dpr); cv.height = Math.round(VH * s * dpr);
  cv.style.width = (VW * s) + 'px'; cv.style.height = (VH * s) + 'px';
  cv.style.transform = rotated ? 'rotate(90deg)' : 'none';
  ctx.imageSmoothingEnabled = false;

  /* Sichtbarer Ausschnitt in Spielkoordinaten: was beim Füllen über
     den Rand ragt, darf kein HUD enthalten. */
  var visW = Math.min(VW, availW / s), visH = Math.min(VH, availH / s);
  var cx = (VW - visW) / 2, cy = (VH - visH) / 2;
  SAFE.x0 = Math.round(cx); SAFE.y0 = Math.round(cy);
  SAFE.x1 = Math.round(VW - cx); SAFE.y1 = Math.round(VH - cy);
  layoutHUD();
  fxCache = null;
}

function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

/* HUD an den sichtbaren Bereich heften */
function layoutHUD() {
  var w = isTouch ? 24 : 13, h = isTouch ? 22 : 12, gap = isTouch ? 3 : 2;
  for (var i = 0; i < BTN.length; i++) {
    BTN[i].w = w; BTN[i].h = h;
    BTN[i].x = SAFE.x1 - 4 - w - i * (w + gap);
    BTN[i].y = SAFE.y0 + 4;
  }
  INVBAR.y = SAFE.y1 - INVBAR.h;
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
      if (stepDist > 11) {
        stepDist = 0;
        var sc0 = SCENES[state.scene];
        sfx('step_' + ((sc0 && sc0.ground) || 'gras'));
      }
      if (Math.abs(dx) > .6) actor.face = dx > 0 ? 1 : -1;
    }
  }
  /* Inventarleiste ein-/ausblenden */
  var want = invPinned || pending || (!isTouch && mouse.y > INVBAR.y - 6) || (isTouch && state.inv.length > 0);
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
    drawSceneAccents(T);
    if (actor.moving) drawActorTrail();
    if (actor.visible) {
      var f = 0, bob = 0, blink = false;
      if (actor.bendUntil > performance.now()) {
        f = 40;                                            /* bückt sich */
      } else if (actor.moving) {
        f = 10 + (Math.floor(actor.dist / 4.2) % 6);
      } else if (bubble && bubble.who === 'simon') {
        f = 30 + (Math.floor(T / 8) % 2);                  /* redet */
      } else {
        f = 20 + (Math.floor(T / 44) % 3);
        bob = Math.sin(T * .04) * .5;
        blink = (T % 190) < 7;
      }
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

/* Subtile, rein visuelle Szenenakzente. Sie ergänzen vorhandene Motive,
   ohne neue Zustände, Hotspots oder Bedienelemente einzuführen. */
function softSceneGlow(x, y, rx, ry, col) {
  g.save();
  g.translate(x, y);
  g.scale(1, ry / rx);
  var gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, col);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(-rx, -rx, rx * 2, rx * 2);
  g.restore();
}

function drawSceneAccents(t) {
  var i, p, a;
  if (state.scene === 'lichtung') {
    for (i = 0; i < 5; i++) {
      p = .35 + Math.sin(t * .018 + i * 1.7) * .18;
      E(118 + i * 34 + Math.sin(t * .009 + i) * 3, 104 + (i % 2) * 20, 1.2, 1.2, 'rgba(255,239,166,' + p + ')');
    }
  } else if (state.scene === 'dorf') {
    softSceneGlow(196, 123, 24 + Math.sin(t * .045) * 2, 15, 'rgba(255,190,92,.11)');
  } else if (state.scene === 'sumpf') {
    g.lineWidth = 1;
    for (i = 0; i < 3; i++) {
      p = ((t * .009 + i * .34) % 1);
      g.beginPath();
      g.ellipse(140 + i * 13, 128 + i * 3, 3 + p * 12, 1 + p * 3, 0, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(155,195,165,' + (.18 * (1 - p)) + ')';
      g.stroke();
    }
    softSceneGlow(270, 139, 16 + Math.sin(t * .03), 9, 'rgba(120,225,170,.055)');
  } else if (state.scene === 'huette') {
    for (i = 0; i < 4; i++) {
      p = ((t * .008 + i * .26) % 1);
      E(168 + Math.sin(t * .02 + i) * (2 + p * 5), 106 - p * 30, 2 + p * 3, 1 + p * 2,
        'rgba(205,220,202,' + (.13 * (1 - p)) + ')');
    }
    softSceneGlow(178, 104, 24 + Math.sin(t * .025) * 2, 12, 'rgba(163,132,230,.065)');
  } else if (state.scene === 'wirtshaus') {
    softSceneGlow(268, 118, 36 + Math.sin(t * .055) * 3, 24, 'rgba(255,150,70,.13)');
  } else if (state.scene === 'hoehle' && has('fackel_an')) {
    a = .10 + Math.sin(t * .04) * .025;
    softSceneGlow(96, 108, 27, 20, 'rgba(174,116,255,' + a + ')');
    for (i = 0; i < 4; i++) {
      p = Math.max(0, Math.sin(t * .035 + i * 1.9));
      R(82 + i * 9, 91 + (i % 2) * 10, 1, 1, 'rgba(225,201,255,' + (p * .48) + ')');
    }
  } else if (state.scene === 'steinkreis') {
    a = .07 + Math.sin(t * .035) * .025;
    softSceneGlow(162, 116, 42, 18, 'rgba(151,112,225,' + a + ')');
    L(142, 124, 150, 118, 'rgba(189,158,235,' + a + ')', 1);
    L(174, 118, 182, 124, 'rgba(189,158,235,' + a + ')', 1);
  }
}

/* Kleine Bodenreaktion beim Laufen: Staub, Asche oder Sumpfringe. */
function drawActorTrail() {
  var p = (actor.dist % 12) / 12, y = actor.y - 1;
  if (state.scene === 'sumpf') {
    E(actor.x, y, 3 + p * 8, 1 + p * 2.2, 'rgba(150,190,150,' + (.22 * (1 - p)) + ')');
  } else if (state.scene === 'hoehle') {
    for (var i = 0; i < 3; i++) E(actor.x - actor.face * (4 + i * 3), y - p * (5 + i), 1.2, 1.2, 'rgba(150,130,130,' + (.24 * (1 - p)) + ')');
  } else {
    for (var d = 0; d < 3; d++) E(actor.x - actor.face * (4 + d * 3), y - p * (3 + d), 1.2 + p, .7 + p, 'rgba(205,185,140,' + (.18 * (1 - p)) + ')');
  }
}

/* Vignette und Scanlines werden einmal pro Bildgröße vorbereitet,
   statt jeden Frame neu erzeugt zu werden. */
var fxCache = null;

function buildPostFX() {
  var w = cv.width, h = cv.height;
  var gr = ctx.createRadialGradient(w / 2, h / 2, h * .5, w / 2, h / 2, h * 1.1);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,.45)');

  var pattern = null;
  if (cssScale >= 3) {
    var step = Math.max(2, Math.round(scale / 2) * 2);
    var lc = document.createElement('canvas');
    lc.width = 1; lc.height = step;
    var lx = lc.getContext('2d');
    lx.fillStyle = 'rgba(0,0,0,.05)';
    lx.fillRect(0, 0, 1, 1);
    pattern = ctx.createPattern(lc, 'repeat');
  }
  fxCache = { w: w, h: h, grad: gr, lines: pattern };
}

function postFX() {
  if (!fxCache || fxCache.w !== cv.width || fxCache.h !== cv.height) buildPostFX();
  ctx.fillStyle = fxCache.grad;
  ctx.fillRect(0, 0, fxCache.w, fxCache.h);
  if (fxCache.lines) {
    ctx.fillStyle = fxCache.lines;
    ctx.fillRect(0, 0, fxCache.w, fxCache.h);
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

/* Vier Eckwinkel um das Objekt unter dem Zeiger – zeigt an, was
   anklickbar ist, ohne das Bild mit einem Kasten zuzustellen. */
function drawHoverFrame() {
  if (!hoverObj || bubble || dialogChoices || journalOpen) return;
  var r = hoverObj.rect;
  if (!r || r[2] <= 0 || r[3] <= 0) return;
  if (r[2] > 150 && r[3] > 90) return;          /* Himmel & Co. nicht einrahmen */

  var pad = 2;
  var x0 = Math.max(1, r[0] - pad), y0 = Math.max(1, r[1] - pad);
  var x1 = Math.min(VW - 1, r[0] + r[2] + pad), y1 = Math.min(VH - 1, r[1] + r[3] + pad);
  var len = Math.max(3, Math.min(7, Math.min(x1 - x0, y1 - y0) / 3));
  var a = .45 + Math.sin(T * .12) * .18;

  ctx.strokeStyle = 'rgba(255,228,140,' + a.toFixed(2) + ')';
  ctx.lineWidth = Math.max(1, scale * .9);
  ctx.lineCap = 'round';
  ctx.beginPath();
  /* links oben */
  ctx.moveTo(x0 * scale, (y0 + len) * scale); ctx.lineTo(x0 * scale, y0 * scale); ctx.lineTo((x0 + len) * scale, y0 * scale);
  /* rechts oben */
  ctx.moveTo((x1 - len) * scale, y0 * scale); ctx.lineTo(x1 * scale, y0 * scale); ctx.lineTo(x1 * scale, (y0 + len) * scale);
  /* links unten */
  ctx.moveTo(x0 * scale, (y1 - len) * scale); ctx.lineTo(x0 * scale, y1 * scale); ctx.lineTo((x0 + len) * scale, y1 * scale);
  /* rechts unten */
  ctx.moveTo((x1 - len) * scale, y1 * scale); ctx.lineTo(x1 * scale, y1 * scale); ctx.lineTo(x1 * scale, (y1 - len) * scale);
  ctx.stroke();
}

/* Unterkante der Werkzeugleiste */
function toolbarBottom() { return BTN[0].y + BTN[0].h; }

/* Liegt ein Punkt im Bereich der Werkzeugleiste? */
function underToolbar(x, y) {
  if (y > toolbarBottom() + 4) return false;
  for (var b = 0; b < BTN.length; b++) {
    var t = BTN[b];
    if (x >= t.x - 2 && x < t.x + t.w + 2) return true;
  }
  return false;
}

/* Dialogmaße – auf Touchgeräten deutlich größer, damit man trifft und liest */
function dlgMetrics() {
  return isTouch ? { lh: 16, size: 11.5, pad: 10 } : { lh: 11, size: 8, pad: 8 };
}

function drawHUD() {
  if (journalOpen) { drawJournal(); return; }

  /* Dialogauswahl */
  if (dialogChoices) {
    var dm = dlgMetrics();
    var n = dialogChoices.opts.length, y0 = SAFE.y1 - dm.pad - n * dm.lh;
    ctx.fillStyle = 'rgba(8,6,14,.62)';
    ctx.fillRect(0, (y0 - 6) * scale, cv.width, (VH - y0 + 6) * scale);
    ctx.fillStyle = 'rgba(150,124,196,.30)';
    ctx.fillRect(0, (y0 - 6) * scale, cv.width, Math.max(1, scale * .5));
    for (var i = 0; i < n; i++) {
      var sel = hoverChoice === i;
      if (sel) {
        ctx.fillStyle = 'rgba(120,92,180,.35)';
        ctx.fillRect(6 * scale, (y0 + i * dm.lh - 1.5) * scale, (VW - 12) * scale, dm.lh * scale);
      }
      txt(12, y0 + i * dm.lh, (sel ? '▸ ' : '  ') + dialogChoices.opts[i],
        sel ? '#ffe58a' : '#e2d9f4', 'left', dm.size);
    }
    return;
  }

  drawHoverFrame();
  drawExitGuides();
  drawHotspotFocus();
  drawTouchFeedback();

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
    var sym = { hinweis: '?', magie: '✦', tagebuch: '≡', musik: '♪', stimme: '☺', vollbild: '⛶' }[t.id];
    txt(t.x + t.w / 2, t.y + (isTouch ? 4.5 : 1.5), sym, col, 'center', isTouch ? 11 : 8);
  }

  if (toast) txt(160, isTouch ? 30 : 12, toast.text, '#ffe58a', 'center', 7.5);
}

/* Sichtbare, aber ruhige Wegmarken: Pfeil immer, Zielname beim Betreten
   einer Szene, auf Touch-Geräten und beim Darüberfahren. */
function drawExitGuides() {
  if (busy || bubble || pending || dialogChoices || mode !== 'play') return;
  var sc = SCENES[state.scene], age = performance.now() - sceneEnteredAt;
  if (!sc || !sc.hotspots) return;

  if (age < 3000) {
    var la = Math.max(0, Math.min(1, (3000 - age) / 500));
    ctx.fillStyle = 'rgba(10,8,18,' + (0.52 * la) + ')';
    ctx.fillRect(8 * scale, 7 * scale, Math.min(116, 18 + sc.name.length * 5.2) * scale, 13 * scale);
    txt(14, 9, sc.name, 'rgba(255,238,184,' + la + ')', 'left', 7.5);
  }

  for (var i = 0; i < sc.hotspots.length; i++) {
    var h = sc.hotspots[i];
    if (!h.exit || (h.when && !h.when())) continue;
    var r = h.rect, cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
    var dir = h.exitDir || (cx < 42 ? 'left' : (cx > 278 ? 'right' : (cy < 116 ? 'up' : 'down')));
    var x = cx, y = cy;
    if (dir === 'left') x = Math.max(7, r[0] + 7);
    if (dir === 'right') x = Math.min(VW - 7, r[0] + r[2] - 7);
    if (dir === 'up') y = Math.max(20, r[1] + 7);
    if (dir === 'down') y = Math.min(SAFE.y1 - 30, r[1] + r[3] - 7);
    /* nie unter der Werkzeugleiste oder hinter der Inventarleiste verstecken */
    if (underToolbar(x, y)) y = toolbarBottom() + 12;
    if (invOpen && state.inv.length && y > INVBAR.y - 6) y = INVBAR.y - 10;

    var hot = hoverObj === h, pulse = .72 + Math.sin(T * .08 + i) * .16;
    ctx.fillStyle = hot ? 'rgba(89,57,132,.92)' : 'rgba(8,7,14,.66)';
    ctx.fillRect((x - 6) * scale, (y - 6) * scale, 12 * scale, 12 * scale);
    ctx.strokeStyle = 'rgba(255,222,112,' + (hot ? 1 : pulse) + ')';
    ctx.lineWidth = Math.max(1, scale);
    ctx.strokeRect((x - 5.5) * scale, (y - 5.5) * scale, 11 * scale, 11 * scale);

    ctx.beginPath();
    if (dir === 'left') { ctx.moveTo((x - 3) * scale, y * scale); ctx.lineTo((x + 2) * scale, (y - 3) * scale); ctx.lineTo((x + 2) * scale, (y + 3) * scale); }
    else if (dir === 'right') { ctx.moveTo((x + 3) * scale, y * scale); ctx.lineTo((x - 2) * scale, (y - 3) * scale); ctx.lineTo((x - 2) * scale, (y + 3) * scale); }
    else if (dir === 'up') { ctx.moveTo(x * scale, (y - 3) * scale); ctx.lineTo((x - 3) * scale, (y + 2) * scale); ctx.lineTo((x + 3) * scale, (y + 2) * scale); }
    else { ctx.moveTo(x * scale, (y + 3) * scale); ctx.lineTo((x - 3) * scale, (y - 2) * scale); ctx.lineTo((x + 3) * scale, (y - 2) * scale); }
    ctx.closePath();
    ctx.fillStyle = '#ffe58a'; ctx.fill();

    if (isTouch || hot || age < 4200) {
      var label = h.exitTo || h.name, tw = measure(label, 6.5) + 8;
      var lx = Math.max(tw / 2 + 2, Math.min(VW - tw / 2 - 2, x));
      var ly = dir === 'down' ? y - 16 : y + 9;
      ctx.fillStyle = 'rgba(8,7,14,.78)';
      ctx.fillRect((lx - tw / 2) * scale, (ly - 1) * scale, tw * scale, 9 * scale);
      txt(lx, ly, label, hot ? '#fff2b8' : '#d9c9ee', 'center', 6.5);
    }
  }
}

/* "Magiesicht": interaktive Stellen leuchten kurz auf; der aktuelle
   Hoverpunkt bekommt dieselben Eckmarken dauerhaft und stärker. */
function drawHotspotFocus() {
  if (mode !== 'play' || busy || bubble || dialogChoices || pending) return;
  var reveal = performance.now() < revealUntil, sc = SCENES[state.scene];
  if (!reveal && !hoverObj) return;
  for (var i = 0; i < sc.hotspots.length; i++) {
    var h = sc.hotspots[i], hot = hoverObj === h;
    if (h.exit || (!hot && !reveal) || (h.when && !h.when())) continue;
    var r = h.rect;
    if (!r || r[2] * r[3] > 22000) continue;
    var a = hot ? .95 : (.35 + Math.sin(T * .07 + i) * .12);
    var x1 = r[0], y1 = r[1], x2 = r[0] + r[2], y2 = r[1] + r[3], c = Math.min(5, r[2] / 3, r[3] / 3);
    ctx.strokeStyle = 'rgba(224,193,255,' + a + ')';
    ctx.lineWidth = Math.max(1, scale * .7);
    ctx.beginPath();
    ctx.moveTo((x1 + c) * scale, y1 * scale); ctx.lineTo(x1 * scale, y1 * scale); ctx.lineTo(x1 * scale, (y1 + c) * scale);
    ctx.moveTo((x2 - c) * scale, y1 * scale); ctx.lineTo(x2 * scale, y1 * scale); ctx.lineTo(x2 * scale, (y1 + c) * scale);
    ctx.moveTo(x1 * scale, (y2 - c) * scale); ctx.lineTo(x1 * scale, y2 * scale); ctx.lineTo((x1 + c) * scale, y2 * scale);
    ctx.moveTo((x2 - c) * scale, y2 * scale); ctx.lineTo(x2 * scale, y2 * scale); ctx.lineTo(x2 * scale, (y2 - c) * scale);
    ctx.stroke();
    if (hot || (reveal && i % 2 === 0)) {
      var sx = x2 - 2, sy = y1 + 2 + Math.sin(T * .09 + i) * 2;
      ctx.fillStyle = 'rgba(255,238,184,' + a + ')';
      ctx.fillRect((sx - 2) * scale, sy * scale, 5 * scale, Math.max(1, scale));
      ctx.fillRect(sx * scale, (sy - 2) * scale, Math.max(1, scale), 5 * scale);
    }
  }
}

/* Mobile Rückmeldung: kurzer Tapp-Kreis und ein Fortschrittsring
   während des langen Drückens für "Anschauen". */
function drawTouchFeedback() {
  if (!isTouch || mode !== 'play') return;
  var nowMs = performance.now();
  if (tapPulse) {
    var p = (nowMs - tapPulse.t0) / 380;
    if (p >= 1) tapPulse = null;
    else {
      ctx.beginPath();
      ctx.arc(tapPulse.x * scale, tapPulse.y * scale, (4 + p * 10) * scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,232,150,' + (.55 * (1 - p)) + ')';
      ctx.lineWidth = Math.max(1, scale);
      ctx.stroke();
    }
  }
  if (downPos && touchHoldStart) {
    var hold = Math.max(0, Math.min(1, (nowMs - touchHoldStart) / 460));
    ctx.beginPath();
    ctx.arc(downPos.x * scale, downPos.y * scale, 12 * scale, -Math.PI / 2, -Math.PI / 2 + hold * Math.PI * 2);
    ctx.strokeStyle = 'rgba(207,171,255,.92)';
    ctx.lineWidth = Math.max(2, scale * 1.6);
    ctx.stroke();
  }
}

/* Die Leiste gehört in den Weltpuffer, weil die Item-Icons dort gezeichnet werden. */
function drawInvBarWorld() {
  var n = Math.min(INVBAR.max, state.inv.length);
  var w = n * INVBAR.slot, x0 = (VW - w) / 2, y0 = INVBAR.y;
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
  txt(160, SAFE.y1 - 14, 'Taste J oder Klick zum Schließen', 'rgba(220,210,240,.5)', 'center', 7);
}

function drawBubble() {
  var pos = speakerPos(bubble.who);
  var col = (SPEAKERS[bubble.who] || {}).color || '#ffffff';
  var size = isTouch ? 9.5 : 8;
  /* Umbruch und Breite nur einmal je Satz berechnen, nicht pro Bild –
     das Messen von Text ist teuer und lief bisher 60-mal pro Sekunde. */
  if (!bubble.lay || bubble.lay.scale !== scale || bubble.lay.size !== size) {
    var ls = wrap(bubble.text, isTouch ? 236 : 216, size);
    var wm = 0;
    for (var m = 0; m < ls.length; m++) wm = Math.max(wm, measure(ls[m], size));
    bubble.lay = { lines: ls, wMax: wm, scale: scale, size: size };
  }
  var lines = bubble.lay.lines, wMax = bubble.lay.wMax;
  var lh = size + 2;
  /* sanft einblenden statt hart aufpoppen */
  var fadeIn = Math.min(1, (performance.now() - bubble.start) / 140);
  ctx.globalAlpha = fadeIn;
  var y0 = bubble.who === 'narrator' ? 12 : Math.max(4, pos.y - lines.length * lh - 4);
  var x = Math.max(4 + wMax / 2, Math.min(VW - 4 - wMax / 2, pos.x));
  if (bubble.who === 'narrator') {
    ctx.fillStyle = 'rgba(8,6,14,.66)';
    ctx.fillRect((x - wMax / 2 - 6) * scale, (y0 - 4) * scale, (wMax + 12) * scale, (lines.length * lh + 6) * scale);
  }
  for (var l = 0; l < lines.length; l++) txt(x, y0 + l * lh, lines[l], col, 'center', size);
  ctx.globalAlpha = 1;
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
  sceneEnteredAt = performance.now();
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
  audioInit(); enterFullscreen(); playMusic(state.scene);
  sceneEnteredAt = performance.now();
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

  /* Die Werkzeugleiste fängt nur in ihrer eigenen Zone – darunter
     liegende Ausgänge und Objekte bleiben anklickbar. */
  if (p.y < toolbarBottom() + 4) {
    for (var b = 0; b < BTN.length; b++) {
      var t = BTN[b];
      if (p.x >= t.x - 1 && p.x < t.x + t.w + 1 && p.y >= t.y - 3 && p.y < t.y + t.h + 3) { hoverBtn = b; return; }
    }
  }
  if (dialogChoices) {
    var dm = dlgMetrics();
    var n = dialogChoices.opts.length, y0 = SAFE.y1 - dm.pad - n * dm.lh;
    var i = Math.floor((p.y - y0) / dm.lh);
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
  var w = n * INVBAR.slot, x0 = (VW - w) / 2, y0 = INVBAR.y;
  if (y < y0) return -1;
  var i = Math.floor((x - x0) / INVBAR.slot);
  if (i < 0 || i >= n) return -1;
  return invScroll + i;
}

function objAt(x, y) {
  var sc = SCENES[state.scene];
  var i, h, r;
  /* exakter Treffer zuerst */
  for (i = sc.hotspots.length - 1; i >= 0; i--) {
    h = sc.hotspots[i];
    if (h.when && !h.when()) continue;
    r = h.rect;
    if (x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]) return h;
  }
  /* Fingerkuppen sind ungenau: kleine Ziele bekommen einen Fangbereich */
  if (isTouch) {
    var best = null, bestD = 1e9;
    for (i = sc.hotspots.length - 1; i >= 0; i--) {
      h = sc.hotspots[i];
      if (h.when && !h.when()) continue;
      r = h.rect;
      /* je kleiner das Ziel, desto großzügiger der Rand (max 11px) */
      var pad = Math.max(0, Math.min(11, 20 - Math.min(r[2], r[3])));
      if (pad <= 0) continue;
      var cx = Math.max(r[0], Math.min(r[0] + r[2], x));
      var cy = Math.max(r[1], Math.min(r[1] + r[3], y));
      var d = Math.hypot(x - cx, y - cy);
      if (d <= pad && d < bestD) { bestD = d; best = h; }
    }
    if (best) return best;
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

function cancelLong() {
  if (longTimer) { clearTimeout(longTimer); longTimer = null; }
  touchHoldStart = 0;
}

function onPointerDown(e) {
  e.preventDefault(); audioInit();
  var p = toV(e); downPos = p;
  if (e.pointerType === 'touch') {
    longFired = false; cancelLong();
    touchHoldStart = performance.now();
    tapPulse = { x: p.x, y: p.y, t0: touchHoldStart };
    longTimer = setTimeout(function () {
      longTimer = null; longFired = true; touchHoldStart = 0;
      if (navigator.vibrate) navigator.vibrate(18);
      handleClick(p, true);
    }, 460);
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
  /* Klick während des Laufens kürzt den Weg ab */
  if (busy) {
    if (actor.moving) { actor.x = actor.tx; actor.y = actor.ty; }
    return;
  }

  /* Inventar */
  var slot = slotAt(p.x, p.y);
  if (slot >= 0 && state.inv[slot]) {
    var id = state.inv[slot];
    var ref = { kind: 'item', id: id, name: ITEMS[id].name };
    sfx('click');
    if (right) { run(doAction('schau', ref, null)); return; }
    if (pending) {
      /* Erneuter Klick auf dasselbe Stück: benutzen (lesen, anzünden, …) */
      if (pending.kind === 'item' && pending.id === id) {
        pending = null;
        if (ITEMS[id].use) run(doAction('benutze', ref, null));
        return;
      }
      var a = pending; pending = null; run(doAction('benutze', a, ref)); return;
    }
    pending = ref;
    if (ITEMS[id].use) showToast('Nochmal klicken zum Benutzen');
    return;
  }
  if (slot >= 0) return;

  var hs = objAt(p.x, p.y);

  if (!hs) {
    if (pending) { pending = null; return; }
    if (!right) {
      /* Zielpunkt kurz markieren, damit der Klick quittiert wird */
      var b0 = SCENES[state.scene].walk;
      tapPulse = {
        x: Math.max(b0.x1, Math.min(b0.x2, p.x)),
        y: Math.max(b0.y1, Math.min(b0.y2, p.y)),
        t0: performance.now()
      };
      walkTo(p.x, p.y);
    }
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
  if (e.key === 'v' || e.key === 'V') revealHotspots();
  if (e.key === 'm' || e.key === 'M') setMusic(!AU.musicOn);
  if (e.key === 'a' || e.key === 'A') exportAtlas();
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  if (e.key === 'z' || e.key === 'Z') {
    fillMode = !fillMode; resize();
    showToast(fillMode ? 'Bildschirm füllen' : 'Ganzes Bild zeigen');
  }
  if (e.key === 't' || e.key === 'T') exportTileset();
}

function btnAction(id) {
  sfx('verb');
  if (id === 'musik') { setMusic(!AU.musicOn); showToast('Musik ' + (AU.musicOn ? 'an' : 'aus')); return; }
  if (id === 'stimme') { AU.speechOn = !AU.speechOn; if (!AU.speechOn) stopSpeech(); showToast('Sprachausgabe ' + (AU.speechOn ? 'an' : 'aus')); return; }
  if (id === 'hinweis') { giveHint(); return; }
  if (id === 'magie') { revealHotspots(); return; }
  if (id === 'tagebuch') { journalOpen = !journalOpen; return; }
  if (id === 'vollbild') { toggleFullscreen(); return; }
}

function revealHotspots() {
  if (mode !== 'play' || busy || bubble) return;
  revealUntil = performance.now() + 2600;
  showToast('Magiesicht zeigt interaktive Stellen');
  sfx('magic');
}

/* Beim Spielstart ins Vollbild – der Startklick ist die nötige
   Nutzergeste. Schlägt es fehl (Browser verweigert), läuft das
   Spiel einfach im Fenster weiter. */
function enterFullscreen() {
  if (isFullscreen()) { setTimeout(resize, 60); return; }
  var el = document.documentElement;
  var req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  try {
    var r = req.call(el);
    if (r && r.catch) r.catch(function () {});
  } catch (e) {}
  setTimeout(resize, 220);
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
  if (verb === 'nimm') {
    if (h.take && h.rect && h.rect[1] > 100) await bendDown();   /* nur nach unten greifen */
    await (h.take ? h.take() : say('simon', 'Das kann ich nicht mitnehmen.'));
    return;
  }
  if (verb === 'rede') { await (h.talk ? h.talk() : say('simon', 'Das antwortet mir nicht. Zum Glück.')); return; }
  if (verb === 'benutze') {
    if (h.use) { var r = await h.use(null); if (r !== false) return; }
    if (h.exit) { await h.exit(); return; }
    await say('simon', 'Damit kann ich so nichts anfangen.'); return;
  }
}

/* kurze Bückbewegung, bevor etwas vom Boden aufgehoben wird */
function bendDown(ms) {
  var d = ms || 300;
  actor.bendUntil = performance.now() + d;
  return new Promise(function (res) { setTimeout(res, d - 60); });
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
