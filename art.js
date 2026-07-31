/* ============================================================
   Simon der Zauberer – Der Fluch von Krummwald
   art.js  –  Zeichen-Primitive, Figuren und Inventar-Icons
   Alles wird prozedural in einen 320x200-Puffer gemalt.
   ============================================================ */

/* ---------- Primitive (arbeiten auf dem globalen Kontext g) ---------- */

function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)); }

function E(cx, cy, rx, ry, c) {
  g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 7); g.fill();
}

function P(pts, c) {
  g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath(); g.fill();
}

function L(x1, y1, x2, y2, c, lw) {
  g.strokeStyle = c; g.lineWidth = lw || 1;
  g.beginPath(); g.moveTo(x1 + .5, y1 + .5); g.lineTo(x2 + .5, y2 + .5); g.stroke();
}

/* deterministischer Pseudo-Zufall, damit Grasbüschel & Co. nicht flackern */
function rnd(seed) { var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* Farbverlauf in horizontalen Bändern (pixelig, aber hübsch) */
function band(y0, y1, cTop, cBot) {
  var a = hex2rgb(cTop), b = hex2rgb(cBot), n = Math.max(1, y1 - y0);
  for (var i = 0; i < n; i++) {
    var t = i / n;
    R(0, y0 + i, VW, 1, 'rgb(' + ((a[0] + (b[0] - a[0]) * t) | 0) + ',' +
      ((a[1] + (b[1] - a[1]) * t) | 0) + ',' + ((a[2] + (b[2] - a[2]) * t) | 0) + ')');
  }
}

function hex2rgb(h) {
  h = h.replace('#', '');
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
}

function shade(h, f) {
  var c = hex2rgb(h);
  return 'rgb(' + Math.min(255, c[0] * f | 0) + ',' + Math.min(255, c[1] * f | 0) + ',' + Math.min(255, c[2] * f | 0) + ')';
}

/* ---------- Landschafts-Bausteine ---------- */

function grassTufts(x0, x1, y0, y1, seed, c1, c2) {
  for (var i = 0; i < 70; i++) {
    var s = seed + i * 3.3;
    var x = x0 + rnd(s) * (x1 - x0), y = y0 + rnd(s + 1) * (y1 - y0);
    var h = 2 + (rnd(s + 2) * 3 | 0);
    R(x, y, 1, h, rnd(s + 3) > .5 ? c1 : c2);
  }
}

/* Blattkrone aus vielen Büscheln – ersetzt glatte Ellipsen */
function leafCanopy(cx, cy, rx, ry, seed, dark, mid, light) {
  E(cx, cy, rx, ry, dark);
  var i, a, r, x, y, s;
  for (i = 0; i < 46; i++) {
    a = rnd(seed + i * 1.7) * 6.283;
    r = 0.35 + Math.sqrt(rnd(seed + i * 3.1)) * 0.72;
    x = cx + Math.cos(a) * rx * r;
    y = cy + Math.sin(a) * ry * r;
    s = 2.5 + rnd(seed + i * 5.3) * 3.5;
    var up = (y - cy) / ry;
    E(x, y, s, s * .78, up < -0.15 ? light : (up < 0.3 ? mid : dark));
  }
  /* Lichtkante oben links */
  for (i = 0; i < 12; i++) {
    a = 3.4 + rnd(seed + i * 2.3) * 1.9;
    x = cx + Math.cos(a) * rx * .82;
    y = cy + Math.sin(a) * ry * .82;
    E(x, y, 2 + rnd(seed + i) * 1.6, 1.6, light);
  }
  /* einzelne Blattlöcher für Struktur */
  for (i = 0; i < 7; i++) {
    a = rnd(seed + i * 7.7) * 6.283;
    r = Math.sqrt(rnd(seed + i * 2.9)) * .6;
    E(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, 1.6, 1.2, dark);
  }
}

/* Wolkenschatten, die über den Boden ziehen */
function cloudShadows(t, y0, y1, strength) {
  for (var i = 0; i < 3; i++) {
    var x = ((t * .09 + i * 130) % 460) - 70;
    var w = 60 + i * 22;
    g.save();
    g.beginPath();
    g.ellipse(x, y0 + (y1 - y0) * (.3 + i * .22), w, (y1 - y0) * .3, 0, 0, 7);
    g.fillStyle = 'rgba(20,30,20,' + (strength || .10) + ')';
    g.fill();
    g.restore();
  }
}

/* Lichtstrahlen aus einer Richtung */
function godRays(x0, y0, t, n, len, col) {
  for (var i = 0; i < n; i++) {
    var a = 0.55 + i * 0.11 + Math.sin(t * .01 + i) * .012;
    var w = 5 + (i % 3) * 4;
    P([x0 + i * 5, y0,
       x0 + i * 5 + w, y0,
       x0 + i * 5 + w + Math.cos(a) * len, y0 + Math.sin(a) * len,
       x0 + i * 5 + Math.cos(a) * len, y0 + Math.sin(a) * len], col);
  }
}

function bush(cx, cy, r, c) {
  E(cx, cy, r, r * .72, shade(c, .78));
  E(cx - r * .4, cy - r * .25, r * .6, r * .5, c);
  E(cx + r * .45, cy - r * .15, r * .55, r * .45, shade(c, 1.12));
}

function tree(x, baseY, h, cTrunk, cLeaf) {
  var tw = Math.max(3, h * .11);
  R(x - tw / 2, baseY - h * .62, tw, h * .62, cTrunk);
  R(x - tw / 2, baseY - h * .62, 1, h * .62, shade(cTrunk, 1.3));
  var cy = baseY - h * .78;
  E(cx_(x), cy, h * .34, h * .27, shade(cLeaf, .74));
  E(x - h * .18, cy - h * .1, h * .24, h * .2, cLeaf);
  E(x + h * .2, cy - h * .05, h * .22, h * .18, shade(cLeaf, 1.15));
  E(x, cy - h * .2, h * .2, h * .17, shade(cLeaf, 1.05));
  function cx_(v) { return v; }
}

function deadTree(x, baseY, h, c) {
  var lean = (rnd(x) - .5) * h * .22;
  P([x - 2, baseY, x + 2, baseY, x + lean + 1, baseY - h, x + lean - 1, baseY - h], c);
  L(x + lean * .7, baseY - h * .7, x + lean - h * .32, baseY - h * .92, c, 1);
  L(x + lean * .5, baseY - h * .5, x + lean + h * .3, baseY - h * .78, c, 1);
  L(x + lean - h * .2, baseY - h * .8, x + lean - h * .36, baseY - h * .72, c, 1);
  L(x + lean + h * .22, baseY - h * .7, x + lean + h * .34, baseY - h * .56, c, 1);
  L(x + lean * .3, baseY - h * .34, x + lean - h * .26, baseY - h * .5, c, 1);
  E(x, baseY, 4, 1.6, 'rgba(28,36,26,.45)');
}

function cloud(x, y, s, c) {
  E(x, y, 9 * s, 4 * s, c); E(x - 7 * s, y + 1.5 * s, 6 * s, 3 * s, c);
  E(x + 7 * s, y + 1.5 * s, 6.5 * s, 3.2 * s, c); E(x + 1 * s, y - 2.5 * s, 5.5 * s, 3.4 * s, c);
}

/* Tiefenschattierung über eine Kachelfläche: oben dunkel, vorne hell.
   Nimmt der Tilemap die Flachheit, ohne die Kacheln zu verstecken. */
function groundShade(y0, y1, topA, botA) {
  var n = Math.max(1, y1 - y0);
  for (var i = 0; i < n; i++) {
    var t = i / n, a = topA + (botA - topA) * t;
    if (a > 0) R(0, y0 + i, VW, 1, 'rgba(12,18,10,' + a.toFixed(3) + ')');
    else if (a < 0) R(0, y0 + i, VW, 1, 'rgba(255,245,210,' + (-a).toFixed(3) + ')');
  }
}

function cobbles(y0, y1, seed) {
  for (var i = 0; i < 120; i++) {
    var s = seed + i * 7.7;
    var y = y0 + rnd(s) * (y1 - y0);
    var x = rnd(s + 1) * VW;
    var w = 3 + rnd(s + 2) * 4, h = 2 + rnd(s + 3) * 2;
    R(x, y, w, h, rnd(s + 4) > .5 ? '#7d7566' : '#6a6357');
  }
}

/* ---------- Feuer / Funken ---------- */

function flame(x, y, s, t, warm) {
  var f = Math.sin(t * .25) * .5 + Math.sin(t * .41 + 1.3) * .3;
  var h = s * (1 + f * .16);
  E(x, y - h * .35, s * .55, h * .55, warm ? '#ff8a1e' : '#ff7a12');
  E(x + f, y - h * .6, s * .36, h * .45, '#ffc63c');
  E(x - f * .6, y - h * .8, s * .2, h * .3, '#fff3a8');
  E(x, y, s * .7, s * .28, 'rgba(255,120,20,.45)');
}

/* ============================================================
   SIMON
   Ursprung: Füße auf (x,y). Einheiten ~ 16 breit, 42 hoch.
   ============================================================ */

function drawSimon(x, y, s, frame, face, hat, blink) {
  function Q(dx, dy, dw, dh, c) { R(x + dx * face * s, y + dy * s, dw * s, dh * s, c); }
  function Qc(dx, dy, dw, dh, c) { R(x + (dx * face - (face < 0 ? dw : 0)) * s, y + dy * s, dw * s, dh * s, c); }

  var SKIN = '#e9b083', SKIN2 = '#cf9066', ROBE = '#3b57b4', ROBE2 = '#2c4290',
      TROU = '#26305c', BOOT = '#5a3a20', HAIR = '#7a4a1e', HATC = '#5e2f8e', HATC2 = '#472270';

  /* Beinbewegung */
  var legA = 0, legB = 0, armA = 0;
  if (frame === 1) { legA = -2; legB = 2; armA = 1.6; }
  else if (frame === 3) { legA = 2; legB = -2; armA = -1.6; }

  /* Schatten */
  E(x, y, 8 * s, 2.4 * s, 'rgba(0,0,0,.28)');

  /* Stiefel + Beine */
  Qc(-6 + legA, -5, 6, 5, BOOT);
  Qc(1 + legB, -5, 6, 5, BOOT);
  Qc(-5 + legA * .6, -14, 4, 9, TROU);
  Qc(1 + legB * .6, -14, 4, 9, TROU);

  /* Robe */
  P([x + (-8 * face) * s, y - 12 * s, x + (8 * face) * s, y - 12 * s,
     x + (6 * face) * s, y - 30 * s, x + (-6 * face) * s, y - 30 * s], ROBE);
  Qc(-8, -18, 16, 6, ROBE2);
  R(x - 7 * s, y - 21 * s, 14 * s, 2 * s, '#8c6a2a');           /* Gürtel */
  R(x - 1.5 * s, y - 21.5 * s, 3 * s, 3 * s, '#e6c05a');        /* Schnalle */

  /* Arme */
  Qc(-9, -29 + armA, 3, 11, ROBE);
  Qc(6, -29 - armA, 3, 11, ROBE);
  Qc(-9, -19 + armA, 3, 3, SKIN);
  Qc(6, -19 - armA, 3, 3, SKIN);

  /* Kragen + Hals */
  Qc(-4, -32, 8, 2, ROBE2);
  Qc(-2, -34, 4, 3, SKIN2);

  /* Kopf */
  Qc(-5, -43, 10, 10, SKIN);
  Qc(-5, -43, 10, 2, SKIN2);

  /* Haare */
  Qc(-6, -45, 12, 4, HAIR);
  Qc(-6, -41, 2, 4, HAIR);
  Qc(4, -41, 2, 3, HAIR);
  R(x + (face > 0 ? -6 : 4) * s, y - 46 * s, 3 * s, 2 * s, HAIR);

  /* Gesicht */
  if (blink) {
    Q(-3.2, -38.4, 1.8, 1, '#8a6242');
    Q(1.4, -38.4, 1.8, 1, '#8a6242');
  } else {
    Q(-3, -39, 1.4, 1.6, '#1a1414');
    Q(1.6, -39, 1.4, 1.6, '#1a1414');
  }
  Q(-.4, -37, 1.6, 1.4, SKIN2);
  Q(-2, -35.4, 4, 1, '#8c4a3a');

  /* Zipfelmütze */
  if (hat) {
    P([x + (-7 * face) * s, y - 44 * s, x + (7 * face) * s, y - 44 * s,
       x + (2 * face) * s, y - 58 * s], HATC);
    P([x + (-7 * face) * s, y - 44 * s, x + (0 * face) * s, y - 44 * s,
       x + (0.5 * face) * s, y - 52 * s], HATC2);
    R(x - 7.5 * s, y - 45 * s, 15 * s, 2.5 * s, '#7b3fb5');
    E(x + 2 * face * s, y - 58 * s, 1.6 * s, 1.6 * s, '#ffd94a');
  }
}

/* ============================================================
   NPCs
   ============================================================ */

/* Elster im Baum */
function drawElster(x, y, t, s) {
  s = s || 1;
  var bob = Math.sin(t * .08) * 1;
  E(x, y + bob, 5 * s, 3.4 * s, '#15161c');           /* Körper */
  E(x + 3 * s, y - 2 * s + bob, 2.6 * s, 2.4 * s, '#15161c'); /* Kopf */
  E(x - 1 * s, y + 1 * s + bob, 3 * s, 2 * s, '#f2f2f2');     /* weiße Flanke */
  P([x - 4 * s, y + bob, x - 11 * s, y + 3 * s + bob, x - 3 * s, y + 2 * s + bob], '#20222c'); /* Schwanz */
  R(x + 5 * s, y - 2 * s + bob, 3 * s, 1 * s, '#e0b03a');     /* Schnabel */
  R(x + 3.4 * s, y - 3 * s + bob, 1 * s, 1 * s, '#fff');      /* Auge */
}

/* Wirt Bruno – rundlich, Schürze, Schnauzbart */
function drawBruno(x, y, t) {
  var b = Math.sin(t * .04) * .4;
  E(x, y, 9, 2.5, 'rgba(0,0,0,.25)');
  R(x - 7, y - 6, 6, 6, '#4a3524'); R(x + 1, y - 6, 6, 6, '#4a3524');
  R(x - 8, y - 24 + b, 16, 18, '#8d3b32');                 /* Wams */
  R(x - 8, y - 16 + b, 16, 10, '#d8cdb4');                 /* Schürze */
  R(x - 8, y - 16 + b, 16, 1, '#b0a488');
  R(x - 11, y - 23 + b, 4, 13, '#8d3b32'); R(x + 7, y - 23 + b, 4, 13, '#8d3b32');
  R(x - 11, y - 12 + b, 4, 3, '#e9b083'); R(x + 7, y - 12 + b, 4, 3, '#e9b083');
  R(x - 5, y - 27 + b, 10, 4, '#e9b083');                  /* Hals */
  R(x - 6, y - 37 + b, 12, 11, '#e9b083');                 /* Kopf */
  R(x - 7, y - 39 + b, 14, 3, '#3d3128');                  /* Haare */
  R(x - 7, y - 36 + b, 2, 4, '#3d3128'); R(x + 5, y - 36 + b, 2, 4, '#3d3128');
  R(x - 4, y - 33 + b, 2, 2, '#1a1414'); R(x + 2, y - 33 + b, 2, 2, '#1a1414');
  R(x - 4, y - 29 + b, 8, 2, '#4a3a2a');                   /* Schnauzer */
  R(x - 1, y - 31 + b, 2, 2, '#cf9066');
}

/* Trödlerin Mathilda – dünn, Kopftuch, spitze Nase */
function drawMathilda(x, y, t) {
  var b = Math.sin(t * .05 + 2) * .5;
  E(x, y, 8, 2.4, 'rgba(0,0,0,.25)');
  P([x - 9, y, x + 9, y, x + 6, y - 22 + b, x - 6, y - 22 + b], '#5c4a86');  /* Rock */
  R(x - 6, y - 32 + b, 12, 11, '#7a63aa');                                    /* Oberteil */
  R(x - 9, y - 31 + b, 3, 12, '#7a63aa'); R(x + 6, y - 31 + b, 3, 12, '#7a63aa');
  R(x - 9, y - 20 + b, 3, 3, '#e0a785'); R(x + 6, y - 20 + b, 3, 3, '#e0a785');
  R(x - 4, y - 35 + b, 8, 4, '#e0a785');
  R(x - 5, y - 44 + b, 10, 10, '#e0a785');                                    /* Kopf */
  P([x - 7, y - 44 + b, x + 7, y - 44 + b, x + 5, y - 49 + b, x - 5, y - 49 + b], '#c8482f'); /* Kopftuch */
  R(x - 7, y - 45 + b, 14, 2, '#c8482f');
  P([x - 7, y - 43 + b, x - 3, y - 43 + b, x - 8, y - 33 + b], '#c8482f');
  R(x - 3, y - 41 + b, 2, 2, '#1a1414'); R(x + 2, y - 41 + b, 2, 2, '#1a1414');
  P([x + 4, y - 40 + b, x + 8, y - 38 + b, x + 4, y - 37 + b], '#e0a785');    /* Nase */
  R(x - 2, y - 36 + b, 4, 1, '#8c4a3a');
}

/* Troll Grombold – breit, moosgrün, Hauer */
function drawTroll(x, y, t) {
  var b = Math.sin(t * .035) * .8;
  var GR = '#5e7a3e', GR2 = '#48602f', GR3 = '#748f4c';
  E(x, y, 15, 3.5, 'rgba(0,0,0,.3)');
  R(x - 12, y - 7, 10, 7, GR2); R(x + 2, y - 7, 10, 7, GR2);      /* Füße */
  R(x - 13, y - 34 + b, 26, 28, GR);                              /* Rumpf */
  R(x - 13, y - 34 + b, 26, 6, GR3);
  R(x - 10, y - 22 + b, 20, 9, '#6b4a2c');                        /* Lendenschurz */
  R(x - 19, y - 33 + b, 7, 20, GR); R(x + 12, y - 33 + b, 7, 20, GR);
  R(x - 20, y - 15 + b, 8, 6, GR3); R(x + 12, y - 15 + b, 8, 6, GR3);
  R(x - 9, y - 47 + b, 18, 14, GR3);                              /* Kopf */
  R(x - 11, y - 44 + b, 3, 6, GR); R(x + 8, y - 44 + b, 3, 6, GR);/* Ohren */
  R(x - 6, y - 43 + b, 4, 3, '#ffee9a'); R(x + 2, y - 43 + b, 4, 3, '#ffee9a');
  R(x - 5, y - 42 + b, 2, 2, '#1a1414'); R(x + 3, y - 42 + b, 2, 2, '#1a1414');
  R(x - 8, y - 46 + b, 16, 2, GR2);                               /* Braue */
  R(x - 6, y - 37 + b, 12, 2, '#3a2a22');                         /* Mund */
  R(x - 5, y - 36 + b, 2, 3, '#fff'); R(x + 3, y - 36 + b, 2, 3, '#fff'); /* Hauer */
  R(x - 2, y - 40 + b, 4, 2, GR2);
}

/* Grete – uralte Stammkundin, sitzt gebeugt am Tisch */
function drawGrete(x, y, t) {
  var b = Math.sin(t * .028) * .4;
  E(x, y, 8, 2.4, 'rgba(0,0,0,.25)');
  P([x - 9, y, x + 9, y, x + 7, y - 16 + b, x - 7, y - 16 + b], '#4a4450');   /* Rock */
  R(x - 7, y - 25 + b, 14, 10, '#5e5866');                                     /* Rücken, gebeugt */
  R(x - 10, y - 24 + b, 3, 9, '#5e5866'); R(x + 7, y - 24 + b, 3, 9, '#5e5866');
  R(x - 10, y - 16 + b, 3, 3, '#d8b79a'); R(x + 7, y - 16 + b, 3, 3, '#d8b79a');
  R(x - 4, y - 28 + b, 8, 4, '#d8b79a');                                       /* Hals */
  R(x - 5, y - 36 + b, 10, 9, '#d8b79a');                                      /* Kopf */
  P([x - 7, y - 36 + b, x + 7, y - 36 + b, x + 5, y - 41 + b, x - 5, y - 41 + b], '#8e8a96'); /* Haube */
  R(x - 7, y - 37 + b, 14, 2, '#8e8a96');
  R(x - 6, y - 34 + b, 2, 5, '#c8c4ce'); R(x + 4, y - 34 + b, 2, 5, '#c8c4ce'); /* Haarsträhnen */
  R(x - 3, y - 33 + b, 2, 1, '#2a2620'); R(x + 1, y - 33 + b, 2, 1, '#2a2620'); /* zusammengekniffene Augen */
  P([x + 3, y - 32 + b, x + 6, y - 31 + b, x + 3, y - 30 + b], '#c9a68a');
  R(x - 2, y - 29 + b, 4, 1, '#8c6a5a');
}

/* Drache – schlafend, zusammengerollt */
function drawDrache(x, y, t, sleeping) {
  var br = Math.sin(t * .03) * 1.2;
  var D = '#8e2f3c', D2 = '#6b1f2b', D3 = '#b5464f', BEL = '#e0b566';
  E(x, y, 40, 7, 'rgba(0,0,0,.35)');
  /* Schwanz */
  P([x + 22, y - 6, x + 48, y - 2, x + 52, y - 10, x + 26, y - 12], D2);
  P([x + 46, y - 4, x + 58, y - 12, x + 48, y - 14], D3);
  /* Körper */
  E(x, y - 16 + br * .3, 30, 15 + br * .3, D);
  E(x - 2, y - 11, 24, 9, BEL);
  /* Rückenzacken */
  for (var i = -4; i <= 4; i++) {
    P([x + i * 6 - 3, y - 28 + br * .3, x + i * 6 + 3, y - 28 + br * .3, x + i * 6, y - 35 + br * .3], D3);
  }
  /* Flügel */
  P([x - 4, y - 26 + br, x - 34, y - 42 + br, x - 12, y - 20 + br], D2);
  P([x - 6, y - 27 + br, x - 24, y - 36 + br, x - 10, y - 24 + br], D3);
  /* Hals + Kopf */
  P([x - 22, y - 22, x - 30, y - 34, x - 22, y - 36, x - 14, y - 24], D);
  E(x - 34, y - 36, 12, 8, D);
  P([x - 44, y - 36, x - 30, y - 40, x - 30, y - 31], D3);           /* Schnauze */
  P([x - 30, y - 42, x - 24, y - 50, x - 22, y - 40], D2);           /* Horn */
  if (sleeping) {
    R(x - 38, y - 38, 7, 1.5, '#3a1218');                            /* geschlossenes Auge */
    R(x - 43, y - 34, 3, 1, '#3a1218');
  } else {
    R(x - 38, y - 39, 4, 3, '#ffd23c'); R(x - 37, y - 38, 2, 2, '#1a1414');
  }
  /* Vorderbein */
  P([x - 14, y - 8, x - 8, y - 20, x - 2, y - 8], D2);
  R(x - 16, y - 5, 12, 5, D2);
  R(x - 16, y - 3, 3, 3, '#e8e2cf'); R(x - 11, y - 3, 3, 3, '#e8e2cf'); R(x - 6, y - 3, 3, 3, '#e8e2cf');
  /* Schnarch-Bläschen */
  if (sleeping) {
    var p = (t * .02) % 1;
    E(x - 48 - p * 10, y - 40 - p * 12, 1.5 + p * 3, 1.5 + p * 3, 'rgba(255,255,255,' + (.4 - p * .4) + ')');
  }
}

/* ============================================================
   DEKO-PROPS
   Tabelle aus Objekten, die assets.js automatisch in den
   Sprite-Atlas backt. Ursprung ist jeweils unten mittig (ox,oy),
   gezeichnet wird relativ dazu.
   ============================================================ */

var PROPS = {

  /* --- Pflanzen --- */
  busch1: { w: 30, h: 22, ox: 15, oy: 21, draw: function (x, y) {
    E(x, y - 5, 13, 7, '#2b5a22'); E(x - 6, y - 9, 8, 6, '#356f2b');
    E(x + 6, y - 8, 7, 5, '#3d7b30'); E(x, y - 13, 7, 5, '#428533');
    R(x - 2, y - 3, 1, 3, '#2a4a1c');
  } },
  busch2: { w: 24, h: 18, ox: 12, oy: 17, draw: function (x, y) {
    E(x, y - 4, 10, 5, '#25501e'); E(x - 4, y - 8, 6, 5, '#2f6626');
    E(x + 5, y - 7, 6, 4, '#38762c'); E(x, y - 11, 5, 4, '#3d7b30');
  } },
  farn: { w: 26, h: 20, ox: 13, oy: 19, draw: function (x, y) {
    for (var i = -3; i <= 3; i++) {
      var a = i * 0.28, len = 13 - Math.abs(i) * 1.6;
      L(x, y, x + Math.sin(a) * len, y - Math.cos(a) * len, '#2f6b26', 1);
      for (var j = 1; j < 5; j++) {
        var px = x + Math.sin(a) * len * j / 5, py = y - Math.cos(a) * len * j / 5;
        R(px - 1, py, 3, 1, i % 2 ? '#3a7d2e' : '#336f28');
      }
    }
  } },
  blumen: { w: 22, h: 14, ox: 11, oy: 13, draw: function (x, y) {
    var cols = ['#e8d24a', '#e07ab0', '#f2f2f2', '#e8d24a'];
    for (var i = 0; i < 5; i++) {
      var bx = x - 8 + i * 4 + (i % 2) * 1.5, bh = 5 + (i % 3) * 2;
      L(bx, y, bx, y - bh, '#3d7b30', 1);
      E(bx, y - bh - 1, 1.8, 1.6, cols[i % cols.length]);
      R(bx - .5, y - bh - 1.5, 1, 1, '#fff8c8');
    }
  } },
  schilfbusch: { w: 22, h: 26, ox: 11, oy: 25, draw: function (x, y) {
    for (var i = 0; i < 7; i++) {
      var sx = x - 7 + i * 2.4, h = 14 + (i % 4) * 4;
      L(sx, y, sx + (i - 3) * .8, y - h, '#7d8a4a', 1);
      E(sx + (i - 3) * .8, y - h - 1, 1.2, 3, '#6b5a2e');
    }
  } },
  seerose: { w: 18, h: 8, ox: 9, oy: 7, draw: function (x, y) {
    E(x, y - 2, 8, 3.4, '#3f7a34'); E(x - 2, y - 2.6, 5, 2.2, '#4d9040');
    P([x + 2, y - 4, x + 8, y - 1, x + 3, y - 1], '#2f5f28');
    E(x + 3, y - 4, 2, 1.6, '#f0e6f5');
  } },

  /* --- Holz & Stein --- */
  stumpf: { w: 26, h: 18, ox: 13, oy: 17, draw: function (x, y) {
    R(x - 9, y - 12, 18, 12, '#5b3d20'); R(x - 9, y - 12, 4, 12, '#6d4a27');
    E(x, y - 12, 9, 3.4, '#7d5a2e'); E(x, y - 12, 6, 2.2, '#8f6a36');
    E(x, y - 12, 2.4, 1, '#6b4a26');
    P([x + 8, y - 4, x + 13, y, x + 8, y], '#4a3119');
  } },
  stein1: { w: 20, h: 14, ox: 10, oy: 13, draw: function (x, y) {
    P([x - 8, y, x + 8, y, x + 6, y - 7, x - 2, y - 10, x - 7, y - 6], '#6d6a63');
    P([x - 7, y - 6, x - 2, y - 10, x, y - 5], '#83807a');
    E(x, y, 8, 2, 'rgba(0,0,0,.22)');
  } },
  stein2: { w: 13, h: 9, ox: 6, oy: 8, draw: function (x, y) {
    P([x - 5, y, x + 5, y, x + 3, y - 5, x - 3, y - 5], '#7a766e');
    R(x - 3, y - 5, 3, 2, '#918d85');
  } },
  fels: { w: 40, h: 28, ox: 20, oy: 27, draw: function (x, y) {
    P([x - 17, y, x + 17, y, x + 13, y - 14, x + 2, y - 21, x - 11, y - 15], '#5e5b56');
    P([x - 11, y - 15, x + 2, y - 21, x + 4, y - 11, x - 6, y - 8], '#75716a');
    P([x + 8, y - 12, x + 13, y - 14, x + 15, y], '#4a4742');
    E(x, y, 17, 3.4, 'rgba(0,0,0,.25)');
  } },
  fass: { w: 20, h: 26, ox: 10, oy: 25, draw: function (x, y) {
    P([x - 7, y, x + 7, y, x + 8, y - 18, x - 8, y - 18], '#7d5a2e');
    R(x - 8, y - 15, 16, 2, '#4a3a28'); R(x - 8, y - 6, 16, 2, '#4a3a28');
    E(x, y - 18, 8, 3, '#8f6a36'); E(x, y - 18, 6, 2, '#6b4f2a');
    R(x - 7, y - 17, 2, 16, '#8f6a36');
  } },
  kiste: { w: 22, h: 20, ox: 11, oy: 19, draw: function (x, y) {
    R(x - 9, y - 14, 18, 14, '#6b4f2a');
    R(x - 9, y - 14, 18, 2, '#8a6a3a'); R(x - 9, y - 8, 18, 2, '#54401f');
    L(x - 9, y - 14, x + 9, y, '#54401f', 1); L(x + 9, y - 14, x - 9, y, '#54401f', 1);
  } },
  sack: { w: 18, h: 20, ox: 9, oy: 19, draw: function (x, y) {
    P([x - 7, y, x + 7, y, x + 6, y - 11, x - 6, y - 11], '#b9ac8e');
    E(x, y - 12, 6, 3, '#c9bc9e');
    R(x - 2, y - 16, 4, 4, '#a89b7d'); R(x - 3, y - 14, 6, 1, '#7d7460');
  } },
  zaun: { w: 34, h: 20, ox: 17, oy: 19, draw: function (x, y) {
    for (var i = -1; i <= 1; i++) { R(x + i * 12 - 1.5, y - 15, 3, 15, '#7d5a2e'); P([x + i * 12 - 1.5, y - 15, x + i * 12 + 1.5, y - 15, x + i * 12, y - 18], '#8f6a36'); }
    R(x - 15, y - 12, 30, 2, '#6b4f2a'); R(x - 15, y - 6, 30, 2, '#6b4f2a');
  } },
  laterne: { w: 16, h: 40, ox: 8, oy: 39, draw: function (x, y) {
    R(x - 1.5, y - 30, 3, 30, '#3a3830'); E(x, y, 5, 2, '#2e2c26');
    R(x - 5, y - 40, 10, 10, '#4a4740');
    R(x - 4, y - 39, 8, 8, 'rgba(255,210,110,.85)');
    P([x - 6, y - 40, x + 6, y - 40, x, y - 45], '#3a3830');
    E(x, y - 35, 9, 9, 'rgba(255,200,90,.14)');
  } },
  besen: { w: 12, h: 34, ox: 6, oy: 33, draw: function (x, y) {
    L(x + 2, y - 33, x - 1, y - 9, '#8a5a2b', 2);
    P([x - 4, y - 10, x + 3, y - 10, x + 4, y, x - 5, y], '#c9a24a');
    for (var i = 0; i < 5; i++) L(x - 4 + i * 2, y - 9, x - 5 + i * 2.2, y, '#a8842f', 1);
  } },
  buecher: { w: 20, h: 14, ox: 10, oy: 13, draw: function (x, y) {
    var c = ['#6b2f7a', '#2f5a7a', '#7a3a2f'];
    for (var i = 0; i < 3; i++) { R(x - 8 + i, y - 4 - i * 4, 16 - i * 2, 4, c[i]); R(x - 8 + i, y - 4 - i * 4, 16 - i * 2, 1, 'rgba(255,255,255,.18)'); }
  } },
  kerze: { w: 10, h: 16, ox: 5, oy: 15, draw: function (x, y) {
    R(x - 2, y - 9, 4, 9, '#e8e0cb'); E(x, y, 4, 1.6, '#c9c0a8');
    R(x - .5, y - 11, 1, 2, '#8a8272');
    E(x, y - 12, 1.6, 2.6, '#ffb43c'); E(x, y - 12.6, .9, 1.5, '#fff3a8');
    E(x, y - 11, 6, 6, 'rgba(255,190,80,.13)');
  } },
  truhe: { w: 28, h: 22, ox: 14, oy: 21, draw: function (x, y) {
    R(x - 11, y - 12, 22, 12, '#6b4f2a');
    P([x - 11, y - 12, x + 11, y - 12, x + 11, y - 17, x - 11, y - 17], '#7d5a2e');
    E(x, y - 17, 11, 4, '#7d5a2e');
    R(x - 11, y - 13, 22, 2, '#c8a44a'); R(x - 2, y - 10, 4, 5, '#c8a44a');
    R(x - 1, y - 8, 2, 2, '#3a2c1e');
  } },

  /* --- Höhle --- */
  knochen: { w: 20, h: 8, ox: 10, oy: 7, draw: function (x, y) {
    R(x - 7, y - 3, 14, 2, '#d8d2c0');
    E(x - 7, y - 3.5, 2, 2, '#e8e2cf'); E(x - 7, y - 1.5, 2, 2, '#e8e2cf');
    E(x + 7, y - 3.5, 2, 2, '#e8e2cf'); E(x + 7, y - 1.5, 2, 2, '#e8e2cf');
  } },
  schaedel: { w: 16, h: 14, ox: 8, oy: 13, draw: function (x, y) {
    E(x, y - 6, 6, 5.5, '#ddd7c4'); R(x - 4, y - 4, 8, 5, '#ddd7c4');
    R(x - 3, y - 1, 6, 2, '#c9c2ae');
    E(x - 2.4, y - 6, 1.8, 2, '#2a2620'); E(x + 2.4, y - 6, 1.8, 2, '#2a2620');
    R(x - .8, y - 3.6, 1.6, 2, '#2a2620');
    for (var i = 0; i < 4; i++) R(x - 3 + i * 2, y - 1, 1, 2, '#8f8a78');
  } },
  stalagmit: { w: 16, h: 26, ox: 8, oy: 25, draw: function (x, y) {
    P([x - 5, y, x + 5, y, x + 1, y - 24], '#4a4152');
    P([x - 2, y, x + 2, y, x + .5, y - 20], '#5c5266');
    E(x, y, 5, 1.8, 'rgba(0,0,0,.3)');
  } },
  kristallader: { w: 18, h: 20, ox: 9, oy: 19, draw: function (x, y) {
    P([x - 6, y, x - 2, y - 12, x + 1, y], '#7a4cc0');
    P([x - 4, y, x - 2, y - 12, x - 1, y], '#a877f0');
    P([x + 1, y, x + 4, y - 8, x + 6, y], '#7a4cc0');
    E(x - 2, y - 12, 2.4, 2.4, 'rgba(200,160,255,.4)');
  } },
  goldhaufen: { w: 30, h: 12, ox: 15, oy: 11, draw: function (x, y) {
    for (var i = 0; i < 16; i++) {
      var gx = x - 12 + rnd(i * 3.1) * 24, gy = y - rnd(i * 1.7) * 7;
      E(gx, gy, 2.4, 1.7, rnd(i + 5) > .5 ? '#e9b54a' : '#c98a30');
    }
    E(x - 4, y - 6, 2.4, 1.7, '#f4d888');
  } },

  /* --- Wirtshaus --- */
  tisch: { w: 40, h: 22, ox: 20, oy: 21, draw: function (x, y) {
    R(x - 17, y - 14, 34, 4, '#7d5a2e');
    R(x - 17, y - 14, 34, 1, '#96703c');
    R(x - 14, y - 10, 4, 10, '#5c4525'); R(x + 10, y - 10, 4, 10, '#5c4525');
    R(x - 12, y - 6, 24, 2, '#6b4f2a');
    E(x, y, 17, 3, 'rgba(0,0,0,.25)');
  } },
  stuhl: { w: 16, h: 24, ox: 8, oy: 23, draw: function (x, y) {
    R(x - 6, y - 10, 12, 3, '#6b4f2a');
    R(x - 6, y - 22, 3, 13, '#5c4525'); R(x + 3, y - 22, 3, 13, '#5c4525');
    R(x - 6, y - 20, 12, 2, '#7d5a2e'); R(x - 6, y - 16, 12, 2, '#7d5a2e');
    R(x - 5, y - 7, 2, 7, '#4a3a1e'); R(x + 3, y - 7, 2, 7, '#4a3a1e');
    E(x, y, 7, 2, 'rgba(0,0,0,.22)');
  } },
  krug: { w: 10, h: 12, ox: 5, oy: 11, draw: function (x, y) {
    R(x - 3, y - 8, 6, 8, '#c9c4b4'); R(x - 3, y - 8, 6, 2, '#e6e2d3');
    R(x - 2, y - 10, 4, 2, '#f4f1e6');
    L(x + 4, y - 6, x + 6, y - 4, '#c9c4b4', 1);
  } },
  kaminfeuer: { w: 40, h: 44, ox: 20, oy: 43, draw: function (x, y) {
    R(x - 18, y - 40, 36, 40, '#4a4038');
    R(x - 14, y - 32, 28, 32, '#1c1712');
    for (var i = 0; i < 10; i++) {
      var bx = x - 18 + (i % 5) * 8, by = y - 40 + Math.floor(i / 5) * 5;
      R(bx, by, 7, 4, i % 2 ? '#5d5148' : '#6b5e53');
    }
    R(x - 20, y - 44, 40, 5, '#6b5e53'); R(x - 20, y - 44, 40, 1, '#82746a');
    L(x - 10, y - 6, x + 10, y - 10, '#4a3119', 2);
    L(x - 8, y - 10, x + 9, y - 5, '#5b3d20', 2);
  } },

  /* --- Himmel --- */
  vogel: { w: 14, h: 8, ox: 7, oy: 4, draw: function (x, y) {
    L(x - 6, y, x - 2, y - 3, '#2a2a32', 1); L(x - 2, y - 3, x + 2, y, '#2a2a32', 1);
    L(x + 2, y, x + 6, y - 3, '#2a2a32', 1);
  } }
};

/* ============================================================
   INVENTAR-ICONS  (20x20 Feld, Ursprung links oben)
   ============================================================ */

function drawIcon(id, x, y) {
  switch (id) {
    case 'stock':
      L(x + 3, y + 17, x + 16, y + 3, '#8a5a2b', 3);
      L(x + 10, y + 10, x + 15, y + 11, '#8a5a2b', 2);
      L(x + 4, y + 16, x + 14, y + 5, '#a3703c', 1);
      break;
    case 'lumpen':
      P([x + 3, y + 8, x + 9, y + 4, x + 17, y + 8, x + 15, y + 16, x + 5, y + 15], '#b9ac8e');
      P([x + 6, y + 9, x + 12, y + 7, x + 14, y + 13, x + 7, y + 13], '#d2c6a8');
      R(x + 9, y + 12, 2, 2, '#8d8267');
      break;
    case 'feuerstein':
      P([x + 4, y + 12, x + 8, y + 5, x + 15, y + 7, x + 16, y + 14, x + 8, y + 16], '#7d8390');
      P([x + 7, y + 10, x + 12, y + 8, x + 13, y + 12], '#a9b0bb');
      R(x + 15, y + 4, 2, 2, '#ffe9a0'); R(x + 17, y + 6, 1, 1, '#ffd23c');
      break;
    case 'fackel':
      L(x + 6, y + 17, x + 12, y + 5, '#7a4d24', 3);
      R(x + 9, y + 3, 5, 5, '#c9bb96');
      break;
    case 'fackel_an':
      L(x + 6, y + 17, x + 12, y + 6, '#7a4d24', 3);
      R(x + 9, y + 4, 5, 4, '#c9bb96');
      E(x + 12, y + 2, 4, 5, '#ff8a1e'); E(x + 12, y + 1, 2.4, 3.4, '#ffd23c'); E(x + 12, y, 1.2, 1.8, '#fff6c8');
      break;
    case 'zahnrad':
      E(x + 10, y + 10, 7, 7, '#8b8f99');
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        R(x + 10 + Math.cos(a) * 8 - 1.5, y + 10 + Math.sin(a) * 8 - 1.5, 3, 3, '#8b8f99');
      }
      E(x + 10, y + 10, 3, 3, '#3a3d45'); E(x + 8, y + 8, 2, 2, '#c2c7d0');
      break;
    case 'eimer':
      P([x + 4, y + 6, x + 16, y + 6, x + 14, y + 17, x + 6, y + 17], '#8a7a5e');
      R(x + 4, y + 6, 12, 2, '#a3937a');
      L(x + 5, y + 6, x + 10, y + 1, '#6b6252', 1); L(x + 15, y + 6, x + 10, y + 1, '#6b6252', 1);
      break;
    case 'eimer_voll':
      P([x + 4, y + 6, x + 16, y + 6, x + 14, y + 17, x + 6, y + 17], '#8a7a5e');
      R(x + 5, y + 8, 10, 3, '#4d6b3a'); R(x + 6, y + 9, 3, 1, '#6f8f4e');
      R(x + 4, y + 6, 12, 2, '#a3937a');
      L(x + 5, y + 6, x + 10, y + 1, '#6b6252', 1); L(x + 15, y + 6, x + 10, y + 1, '#6b6252', 1);
      break;
    case 'pilz':
      R(x + 8, y + 10, 4, 8, '#e8e0cb');
      E(x + 10, y + 9, 8, 5, '#c8342f');
      R(x + 6, y + 7, 2, 2, '#fff'); R(x + 11, y + 6, 3, 2, '#fff'); R(x + 14, y + 9, 2, 2, '#fff');
      break;
    case 'schlafpulver':
      P([x + 6, y + 8, x + 14, y + 8, x + 16, y + 18, x + 4, y + 18], '#6d5c8e');
      R(x + 7, y + 4, 6, 5, '#8f7cb5'); R(x + 6, y + 7, 8, 2, '#c8b96f');
      R(x + 8, y + 12, 2, 2, '#d9cff2'); R(x + 11, y + 14, 2, 2, '#d9cff2'); R(x + 7, y + 15, 2, 2, '#d9cff2');
      break;
    case 'buch':
      P([x + 3, y + 4, x + 17, y + 4, x + 17, y + 17, x + 3, y + 17], '#6b2f7a');
      R(x + 3, y + 4, 3, 13, '#4a1f57');
      R(x + 7, y + 7, 8, 1, '#e8d78e'); R(x + 7, y + 10, 8, 1, '#e8d78e'); R(x + 7, y + 13, 5, 1, '#e8d78e');
      E(x + 11, y + 10, 2.5, 2.5, '#ffd23c');
      break;
    case 'bierkrug':
      R(x + 4, y + 6, 10, 12, '#c9c4b4'); R(x + 4, y + 6, 10, 3, '#e6e2d3');
      R(x + 5, y + 4, 8, 3, '#f4f1e6');
      L(x + 15, y + 8, x + 18, y + 12, '#c9c4b4', 2); L(x + 18, y + 12, x + 14, y + 15, '#c9c4b4', 2);
      R(x + 6, y + 10, 2, 6, '#a8a294');
      break;
    case 'muenzen':
      E(x + 7, y + 13, 5, 4, '#c98a30'); E(x + 7, y + 12, 5, 4, '#e9b54a');
      E(x + 13, y + 11, 5, 4, '#c98a30'); E(x + 13, y + 10, 5, 4, '#e9b54a');
      E(x + 10, y + 7, 5, 4, '#c98a30'); E(x + 10, y + 6, 5, 4, '#f0c96a');
      R(x + 9, y + 5, 2, 2, '#fff2b8');
      break;
    case 'knopf':
      E(x + 10, y + 10, 7, 7, '#b8bfcc'); E(x + 10, y + 10, 5.5, 5.5, '#e6ecf7');
      R(x + 8, y + 9, 2, 2, '#3a4152'); R(x + 11, y + 11, 2, 2, '#3a4152');
      R(x + 6, y + 6, 3, 2, '#fff');
      break;
    case 'kaesebrot':
      P([x + 3, y + 12, x + 17, y + 8, x + 17, y + 14, x + 3, y + 17], '#c99a52');
      P([x + 4, y + 11, x + 16, y + 7, x + 16, y + 9, x + 4, y + 13], '#e8c98a');
      P([x + 5, y + 9, x + 15, y + 5, x + 16, y + 7, x + 5, y + 11], '#f2d24a');
      R(x + 8, y + 8, 2, 1, '#d9b62c'); R(x + 12, y + 7, 2, 1, '#d9b62c');
      break;
    case 'kristall':
      P([x + 10, y + 2, x + 16, y + 9, x + 10, y + 18, x + 4, y + 9], '#9b5de5');
      P([x + 10, y + 2, x + 10, y + 18, x + 4, y + 9], '#c48bff');
      P([x + 10, y + 2, x + 13, y + 9, x + 10, y + 12], '#e6d0ff');
      break;
    case 'hut':
      P([x + 2, y + 15, x + 18, y + 15, x + 12, y + 2], '#5e2f8e');
      P([x + 2, y + 15, x + 10, y + 15, x + 11, y + 5], '#472270');
      R(x + 1, y + 14, 18, 3, '#7b3fb5');
      E(x + 12, y + 2, 1.6, 1.6, '#ffd94a');
      break;
    default:
      R(x + 4, y + 4, 12, 12, '#d33');
  }
}
