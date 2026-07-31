/* ============================================================
   scenes.js – die sechs Schauplätze von Krummwald
   Jede Funktion malt einen kompletten Hintergrund in den
   320x200-Puffer (Spielfläche: y 0..142).
   t = Frame-Zähler, F = Flags-Objekt des Spielstands
   ============================================================ */

/* ------------------------------------------------------------
   TILEMAPS  (20 Spalten x 3 Reihen à 16px, ab y=96)
   G Gras · D dunkles Gras · P Pfad · K Kopfstein
   M Moor  · H Holzboden   · F Fels  · N Nachtgras
   ------------------------------------------------------------ */
var LEG = { G: 'gras', D: 'gras_dunkel', P: 'pfad', K: 'kopfstein',
            M: 'moor', H: 'holzboden', F: 'fels', N: 'nachtgras',
            B: 'blumenwiese', W: 'moorwasser', E: 'erde', I: 'kies',
            L: 'laub', X: 'dielen', C: 'kristallfels', R: 'runengras',
            O: 'moospflaster', S: 'sumpfschlamm', A: 'asche', T: 'sternengras',
            U: 'wurzelboden', Z: 'ziegel', Q: 'magmastein', Y: 'mondpfad',
            j: 'pilzmoos', v: 'schiefer', q: 'teppich', y: 'portalboden' };

var MAP_LICHTUNG = [
  'GGGGBGGGPPGGGjGGGGGG',
  'GGGGGGGGPPPGGGBGGGGP',
  'PGGGUGGGPPPGGGGGGGPP',
  'PGGGBGGGPPPPGGGGLGGP',
  'GGGGGGGGPPPPGGGBDGGG',
  'GGUGGGGGGPPPGBGGGGGG',
  'GGGGBGGGGPPPGGGGLGGG'
];
var MAP_DORF = [
  'GKKKOKKKKKKKZKKKKKKG',
  'GKKKKKKIKKKKKKKIKKKK',
  'KKIKKKKKKKOKKKKKKKKK',
  'KKKKKZKKKKKKKIKKKKKK',
  'OKKKKKKKIKKKKKKKKKIK',
  'KKKIKKKKKKKKIKKKKKKK',
  'KKKKKKZKKKKKKKIKKKKK'
];
var MAP_SUMPF = [
  'MjWMMMMPPPMMMMWMMMMM',
  'MMMMWMMMPPMMMMMMMWMM',
  'MWMMMMMSMMMMWMMMMMMM',
  'MMMMMMWMMMMMMMMWMMMM',
  'MSWMMMMMMMMWMMMMMMWM',
  'MMMMWMMMMMMMMMMWMMMM',
  'WMMMMMMWMMMMWMMMMMMM'
];
var MAP_HUETTE = [
  'HHHHXHHHHHHXHHHHHHHX',
  'XHHHHHHXHHHHHHHXHHHH',
  'HHXHHHHqHHHXHHHHHHHH',
  'HHHHHXHHHHHHHHXHHHHH',
  'XHHHHHHHHXHHHHHHHHXH',
  'HHHXHHHHHHHHHXHHHHHH'
];
var MAP_WIRTSHAUS = [
  'HXHHqHHHXHHHHHHHXHHH',
  'HHHHXHHHHHHHXHHHHHHH',
  'XHHHHZHHXHHHHHHHHXHH',
  'HHHXHHHHHHHHXHHHHHHH',
  'HHHHHHXHHHHqHHHXHHHH',
  'HXHHHHHHHHXHHHHHHHHX'
];
var MAP_HOEHLE = [
  'AFFFCFFFFQFFCFFFFFFF',
  'FFFFvFCFFFFFFFFCFFFF',
  'FFCFFFAFFFFCFFFFFFFF',
  'FFFFQFFCFFFFFFFFCFFF',
  'ACFFFFQFFFFFCFFFFFFF',
  'FFFFFCFFFFFFFFFFCFFF',
  'CFFFFFFFFCFFFFFFFFFF'
];
var MAP_STEINKREIS = [
  'NYNRNNNNNNNNRNNNNNNN',
  'NNNNYNNNNPPNNNNRNNNN',
  'NNRNNNTNPPPPNNNNNNNN',
  'NNNNNNNNPPPPNNRNNNNN',
  'RNNNNNNPPPPPNNNNNTNN',
  'NNNNRNNPPPPPNNNNNNNN',
  'NNNNNNPPPPPPyNNNNNNN'
];

/* ------------------------------------------------------------
   Vordergrund-Ebenen: werden NACH den Figuren gezeichnet und
   geben dem Bild Tiefe.
   ------------------------------------------------------------ */
function frontFoliage(t, c1, c2) {
  for (var i = 0; i < 34; i++) {
    var x = rnd(i * 3.7) * 340 - 10;
    var h = 10 + rnd(i * 1.9) * 22;
    var sw = Math.sin(t * .02 + i) * 1.5;
    P([x - 5, 200, x + 5, 200, x + sw, 200 - h], i % 2 ? c1 : c2);
    P([x - 2, 200, x + 2, 200, x + sw * .6, 200 - h * .7], c2);
  }
}
function frontReeds(t) {
  for (var i = 0; i < 26; i++) {
    var x = rnd(i * 5.3) * 340 - 10;
    var h = 16 + rnd(i * 2.3) * 30;
    var sw = Math.sin(t * .035 + i * .8) * 3;
    L(x, 200, x + sw, 200 - h, '#1c2a1e', 1);
    E(x + sw, 200 - h - 1, 1.4, 3.4, '#22301d');
  }
}
function frontRocks(t) {
  P([0, 200, 0, 168, 22, 178, 40, 200], '#191320');
  P([320, 200, 320, 160, 292, 174, 274, 200], '#191320');
  for (var i = 0; i < 5; i++) {
    var x = 60 + i * 52 + rnd(i) * 20;
    P([x - 14, 200, x + 14, 200, x + 4, 188 - rnd(i + 2) * 8], '#1d1626');
  }
}
function frontStones(t) {
  P([0, 200, 0, 150, 30, 164, 46, 200], '#0d140f');
  P([320, 200, 320, 146, 288, 160, 272, 200], '#0d140f');
  frontFoliage(t, '#101a12', '#16241a');
}

/* ------------------------------------------------------------
   1. LICHTUNG
   ------------------------------------------------------------ */
function bgLichtung(t, F) {
  band(0, 92, '#4f9fd8', '#b8e2f5');
  cloud(58, 16, 1.1, 'rgba(255,255,255,.85)');
  cloud(210, 12, .85, 'rgba(255,255,255,.7)');
  cloud(268, 30, .6, 'rgba(255,255,255,.55)');

  /* ferner Waldrand – zwei Tiefenebenen */
  for (var i = 0; i < 22; i++) {
    var x = i * 15.5 + rnd(i) * 8;
    leafCanopy(x, 74 + rnd(i + 9) * 5, 12, 11 + rnd(i + 3) * 5, i * 3.3, '#16300f', '#1d3f16', '#25501c');
  }
  for (var i2 = 0; i2 < 20; i2++) {
    var x2 = i2 * 17 + rnd(i2 + 40) * 9;
    R(x2 - 1.5, 84, 3, 12, '#2e2416');
    leafCanopy(x2, 84 + rnd(i2 + 19) * 4, 14, 12 + rnd(i2 + 13) * 5, i2 * 5.1 + 7, '#1d4318', '#2a5c22', '#356f2b');
  }
  R(0, 92, VW, 5, '#25491f');

  /* Wiese als Tilemap */
  drawTilemap(MAP_LICHTUNG, LEG, 0, 96);
  groundShade(96, 200, .32, -.06);
  grassTufts(0, VW, 96, 196, 4.2, '#2f6323', '#6ba43c');

  /* Wolkenschatten und Lichtstrahlen durch die Krone */
  cloudShadows(t, 96, 200, .09);
  godRays(52, 40, t, 5, 150, 'rgba(255,246,200,.055)');

  /* Vögel am Himmel */
  for (var v = 0; v < 3; v++) {
    var vx = ((t * .25 + v * 90) % 400) - 40;
    prop('vogel', vx, 22 + v * 9 + Math.sin(t * .04 + v) * 2, .7 + v * .12);
  }

  /* Deko im Mittel- und Vordergrund */
  prop('busch1', 292, 118, .8);
  prop('blumen', 104, 116, .8);
  prop('stein2', 196, 112, .9);
  prop('stumpf', 36, 152);
  prop('blumen', 232, 150);
  prop('stein1', 268, 142, .9);
  prop('farn', 88, 162);
  prop('wurzel', 74, 146, .85);
  prop('pilzring', 120, 168, .85);
  prop('wegstein', 198, 144, .8);
  prop('ranken', 18, 108, .72);
  for (var bf = 0; bf < 3; bf++) {
    prop('schmetterling', 118 + bf * 54 + Math.sin(t * .025 + bf) * 12,
      92 + bf * 13 + Math.cos(t * .035 + bf * 2) * 7, .65 + bf * .08,
      (Math.floor(t / 7) + bf) % 2);
  }
  prop('busch1', 300, 158);
  prop('blumen', 150, 176);
  prop('stein2', 58, 184);

  /* Büsche */
  bush(292, 104, 13, '#2f6b28');
  bush(18, 100, 11, '#356f2b');
  bush(112, 100, 8, '#2e6626');

  /* Große Eiche links */
  var bx = 52;
  R(bx - 9, 40, 18, 66, '#5b3d20');
  R(bx - 9, 40, 3, 66, '#6f4c28');
  R(bx + 6, 40, 3, 66, '#442d17');
  /* senkrechte Rindenmaserung */
  for (var k = 0; k < 7; k++) {
    var kx = bx - 7 + k * 2.4;
    R(kx, 42 + rnd(k) * 8, 1, 40 + rnd(k + 3) * 22, k % 2 ? '#4e341b' : '#664425');
  }
  R(bx - 4, 62, 1, 10, '#3d2915'); R(bx + 2, 84, 1, 8, '#3d2915');
  P([bx - 20, 106, bx + 20, 106, bx + 9, 96, bx - 9, 96], '#5b3d20');   /* Wurzeln */
  L(bx + 6, 58, bx + 26, 46, '#5b3d20', 3);
  L(bx - 6, 50, bx - 24, 40, '#5b3d20', 3);
  leafCanopy(bx, 30, 42, 25, 3.7, '#1b4218', '#2a5c22', '#3d7b30');
  leafCanopy(bx - 24, 34, 20, 15, 11.3, '#1b4218', '#2a5c22', '#3d7b30');
  leafCanopy(bx + 25, 31, 19, 14, 19.1, '#1b4218', '#2a5c22', '#3d7b30');
  leafCanopy(bx - 4, 15, 25, 15, 27.5, '#22521d', '#316827', '#478a36');

  /* Nest mit Hut */
  var nx = 46, ny = 26;
  E(nx, ny, 11, 6, '#6b4a26');
  E(nx, ny - 2, 9, 4, '#7d5a2e');
  for (var q = 0; q < 12; q++) L(nx - 10 + q * 1.8, ny - 3 + rnd(q) * 5, nx - 6 + q * 1.6, ny - 1 + rnd(q + 5) * 4, '#54381c', 1);
  if (!F.hut) {
    P([nx - 7, ny - 3, nx + 6, ny - 3, nx - 1, ny - 15], '#5e2f8e');
    R(nx - 8, ny - 4, 15, 2, '#7b3fb5');
    E(nx - 1, ny - 15, 1.4, 1.4, '#ffd94a');
  }
  if (!F.hut) drawElster(nx + 14, ny - 4, t, 1);

  /* Wegweiser */
  R(238, 96, 4, 26, '#7d5a2e');
  P([224, 88, 262, 88, 262, 97, 224, 97], '#a3763a');
  P([226, 99, 256, 99, 256, 107, 226, 107], '#a3763a');
  R(224, 88, 38, 2, '#c49355');

  /* Stock am Boden */
  if (!F.stockWeg) {
    L(146, 130, 162, 126, '#8a5a2b', 3);
    L(158, 127, 164, 130, '#8a5a2b', 2);
  }
}

/* ------------------------------------------------------------
   2. DORF KRUMMWALD
   ------------------------------------------------------------ */
function bgDorf(t, F) {
  band(0, 98, '#5aa8dd', '#cfe9f6');
  cloud(120, 14, .9, 'rgba(255,255,255,.8)');
  cloud(250, 22, .7, 'rgba(255,255,255,.6)');

  /* Hügel hinten */
  E(60, 96, 90, 26, '#4a7f33');
  E(250, 98, 100, 24, '#437730');

  /* Boden als Tilemap */
  drawTilemap(MAP_DORF, LEG, 0, 96);
  groundShade(96, 200, .28, -.05);

  /* Dorfleben im Vordergrund */
  prop('zaun', 60, 150, .9);
  prop('laterne', 196, 158, .9);
  prop('fass', 300, 152);
  prop('kiste', 24, 168);
  prop('sack', 44, 174);
  prop('fass', 276, 182, 1.1);
  prop('kiste', 122, 190, 1.1);
  prop('blumen', 232, 172);
  prop('stein2', 168, 166, .8);
  propSway('wegfahne', 306, 146, .75, t * .018, .016);
  propSway('banner', 184, 104, .72, t * .014 + 1, .018);

  /* --- Wirtshaus links --- */
  R(6, 34, 96, 68, '#d8cdb0');                       /* Fachwerkwand */
  for (var i = 0; i < 5; i++) R(6, 40 + i * 14, 96, 3, '#5e4429');
  R(28, 34, 3, 68, '#5e4429'); R(64, 34, 3, 68, '#5e4429');
  P([0, 36, 108, 36, 96, 12, 12, 12], '#7d3c2c');     /* Dach */
  for (var r = 0; r < 6; r++) P([2 + r * 2, 36 - r * 4, 106 - r * 2, 36 - r * 4, 104 - r * 2, 33 - r * 4, 4 + r * 2, 33 - r * 4], '#6a3225');
  R(74, 4, 12, 16, '#6a6258'); R(72, 2, 16, 4, '#807868');  /* Schornstein */
  for (var sm = 0; sm < 4; sm++) {
    var sp = (t * .03 + sm * .25) % 1;
    E(80 + Math.sin(sp * 6 + sm) * 6, 2 - sp * 14, 2 + sp * 4, 2 + sp * 4, 'rgba(210,210,215,' + (.5 - sp * .5) + ')');
  }
  R(20, 52, 20, 18, '#3a4a5c'); R(20, 52, 20, 18, '#4a6076');  /* Fenster */
  L(30, 52, 30, 70, '#5e4429', 2); L(20, 61, 40, 61, '#5e4429', 2);
  R(70, 50, 20, 18, '#4a6076'); L(80, 50, 80, 68, '#5e4429', 2); L(70, 59, 90, 59, '#5e4429', 2);
  /* offene Tür ins Wirtshaus */
  R(44, 62, 22, 40, '#3a2a1c');
  R(46, 64, 18, 38, '#231a10');
  var warm = .45 + Math.sin(t * .05) * .12;
  R(48, 78, 14, 24, 'rgba(255,170,70,' + (warm * .35) + ')');
  P([46, 102, 64, 102, 70, 112, 40, 112], 'rgba(255,180,90,' + (warm * .16) + ')');
  R(66, 64, 3, 38, '#54402a');
  /* Wirtshausschild */
  L(102, 40, 118, 40, '#4a3a28', 2);
  R(106, 41, 22, 16, '#7d5a2e'); R(107, 42, 20, 14, '#a3763a');
  R(112, 45, 4, 8, '#e8e2cf'); R(116, 47, 3, 4, '#e8e2cf');

  /* --- Haus hinten mitte --- */
  R(120, 56, 52, 44, '#c9bfa4');
  P([116, 58, 176, 58, 168, 38, 124, 38], '#5c6a7d');
  R(130, 66, 14, 14, '#4a6076'); R(150, 66, 14, 14, '#4a6076');
  R(120, 56, 52, 2, '#5e4429');

  /* --- Marktstand rechts --- */
  R(196, 62, 4, 40, '#7d5a2e'); R(286, 62, 4, 40, '#7d5a2e');
  for (var st = 0; st < 9; st++) R(194 + st * 10, 54, 10, 10, st % 2 ? '#c8483a' : '#f0e6cf');
  P([190, 64, 294, 64, 294, 68, 190, 68], '#8a6a3a');
  drawMathilda(236, 108, t);                          /* Trödlerin hinter dem Tisch */
  R(196, 86, 94, 6, '#8a6a3a');                       /* Tischplatte */
  R(196, 92, 94, 10, '#6b4f2a');
  /* Krimskrams auf dem Tisch */
  E(210, 83, 5, 4, '#8b8f99');
  R(224, 78, 8, 8, '#7a63aa'); R(225, 79, 6, 3, '#9c86cc');
  E(246, 82, 6, 5, '#a3763a');
  R(262, 79, 10, 7, '#5c4a86');
  if (!F.knopfWeg) { E(276, 82, 4, 3.5, '#b8bfcc'); E(276, 81.5, 3, 2.6, '#e6ecf7'); R(275, 80, 2, 1, '#fff'); }

  /* --- Brunnen vorne mitte --- */
  var wx = 148, wy = 128;
  E(wx, wy, 26, 11, '#6a6258');
  E(wx, wy - 3, 24, 10, '#8b8172');
  E(wx, wy - 4, 18, 7, '#3a3830');
  for (var b = 0; b < 14; b++) {
    var a = b / 14 * 6.283;
    R(wx + Math.cos(a) * 21 - 2, wy - 4 + Math.sin(a) * 8, 5, 4, b % 2 ? '#9b9182' : '#7d7466');
  }
  R(wx - 20, wy - 30, 4, 27, '#6b4a26'); R(wx + 16, wy - 30, 4, 27, '#6b4a26');
  P([wx - 26, wy - 30, wx + 26, wy - 30, wx + 14, wy - 42, wx - 14, wy - 42], '#7d3c2c');
  L(wx - 18, wy - 28, wx + 18, wy - 28, '#4a3a28', 2);
  if (F.brunnenRep) {
    /* reparierte Kurbel */
    R(wx + 12, wy - 30, 3, 3, '#8b8f99');
    L(wx + 13, wy - 29, wx + 19, wy - 25, '#8b8f99', 2);
  } else {
    R(wx + 12, wy - 30, 3, 3, '#5a5f68');
  }
  if (!F.eimerWeg) {
    L(wx - 1, wy - 28, wx - 1, wy - 20, '#6b6252', 1);
    P([wx - 5, wy - 20, wx + 5, wy - 20, wx + 4, wy - 12, wx - 4, wy - 12], '#8a7a5e');
    R(wx - 5, wy - 20, 10, 2, '#a3937a');
  }
  /* Inschrift */
  R(wx - 14, wy - 2, 12, 1, '#5a5348'); R(wx - 12, wy + 1, 8, 1, '#5a5348');

  /* Fässer + Kiste */
  R(112, 106, 14, 20, '#7d5a2e'); R(112, 110, 14, 2, '#4a3a28'); R(112, 120, 14, 2, '#4a3a28');
  E(119, 106, 7, 3, '#8f6a36');
  R(300, 100, 18, 16, '#6b4f2a'); R(300, 100, 18, 2, '#8a6a3a');

  grassTufts(0, 30, 116, 140, 9.1, '#3f6a26', '#5f8f38');
}

/* ------------------------------------------------------------
   3. NEBELSUMPF
   ------------------------------------------------------------ */
function bgSumpf(t, F) {
  band(0, 96, '#5d6b62', '#9aa892');
  /* Nebelschwaden */
  for (var n = 0; n < 5; n++) {
    var nx = ((t * .12 + n * 70) % 400) - 40;
    E(nx, 70 + n * 5, 46, 7, 'rgba(200,210,195,.16)');
  }

  /* toter Wald hinten */
  for (var i = 0; i < 9; i++) {
    var dx = 96 + i * 26 + rnd(i) * 10;
    deadTree(dx, 94 + rnd(i + 6) * 6, 24 + rnd(i + 2) * 26, i % 2 ? '#39402f' : '#454b3a');
  }

  /* Boden als Tilemap */
  drawTilemap(MAP_SUMPF, LEG, 0, 92);
  groundShade(92, 200, .36, .02);

  /* Moorfunde */
  prop('fels', 26, 150, .9);
  prop('knochen', 74, 158);
  prop('stein1', 202, 148, .9);
  prop('schilfbusch', 108, 174);
  prop('schaedel', 244, 168);
  prop('knochen', 168, 186, 1.1);
  prop('stein2', 292, 160);
  prop('schilfbusch', 286, 194, 1.15);
  prop('seerose', 118, 128, .9);
  prop('seerose', 152, 132);
  prop('gluehpilz', 188, 166, .75);
  prop('gluehpilz', 216, 188, .55);
  prop('spinnennetz', 22, 94, .75);
  prop('lichtkugel', 92 + Math.sin(t * .025) * 5, 126 + Math.cos(t * .03) * 3, .65);
  prop('pilzlampe', 270, 158, .62);
  prop('wurzel', 228, 146, .7);
  prop('ranken', 72, 110, .65);
  for (var df = 0; df < 2; df++) {
    prop('libelle', 116 + df * 82 + Math.sin(t * .045 + df) * 22,
      108 + df * 14 + Math.cos(t * .055 + df) * 6, .72,
      (Math.floor(t / 5) + df) % 2);
  }

  /* Sumpftümpel vorne */
  E(134, 126, 66, 15, '#2a3128');
  E(134, 125, 62, 13, '#17251f');
  E(134, 124, 58, 11, '#20342a');
  for (var w = 0; w < 8; w++) {
    var ww = Math.sin(t * .05 + w * 1.7) * 4;
    R(104 + w * 9 + ww, 119 + (w % 4) * 3, 9, 1, 'rgba(140,180,150,.22)');
  }
  E(110, 128, 6, 2.5, '#3d5a34'); E(160, 121, 5, 2, '#3d5a34');  /* Algen */
  for (var bb = 0; bb < 4; bb++) {
    var bp = ((t * .02 + bb * .3) % 1);
    E(116 + bb * 15, 127 - bp * 5, 1 + bp, 1 + bp, 'rgba(160,200,140,' + (.5 - bp * .5) + ')');
  }

  /* Schilf */
  for (var s = 0; s < 22; s++) {
    var sx = 80 + rnd(s * 1.7) * 110, sy = 118 + rnd(s + 4) * 14;
    var sw = Math.sin(t * .04 + s) * 2;
    L(sx, sy, sx + sw, sy - 12 - rnd(s + 8) * 8, '#7d8a4a', 1);
    E(sx + sw, sy - 13 - rnd(s + 8) * 8, 1.2, 3, '#6b5a2e');
  }

  /* Fliegenpilz */
  if (!F.pilzWeg) {
    R(206, 124, 4, 8, '#e8e0cb');
    E(208, 123, 8, 5, '#c8342f');
    R(204, 121, 2, 2, '#fff'); R(209, 120, 3, 2, '#fff'); R(212, 123, 2, 2, '#fff');
  }

  /* --- Hütte des Zauberers links --- */
  R(8, 58, 66, 46, '#6b543a');
  for (var pl = 0; pl < 9; pl++) R(8, 58 + pl * 5, 66, 1, '#54432e');
  P([2, 60, 80, 60, 70, 34, 12, 34], '#4a3a52');
  for (var rr = 0; rr < 5; rr++) P([4 + rr * 2, 60 - rr * 5, 78 - rr * 2, 60 - rr * 5, 76 - rr * 2, 57 - rr * 5, 6 + rr * 2, 57 - rr * 5], '#3d3045');
  R(52, 18, 9, 18, '#5a5348'); R(50, 16, 13, 4, '#6e675a');
  P([50, 16, 63, 16, 66, 10, 47, 10], '#6e675a');
  for (var sm2 = 0; sm2 < 3; sm2++) {
    var sp2 = (t * .022 + sm2 * .33) % 1;
    E(56 + Math.sin(sp2 * 7 + sm2) * 7, 10 - sp2 * 12, 2 + sp2 * 4, 2 + sp2 * 4, 'rgba(140,180,140,' + (.45 - sp2 * .45) + ')');
  }
  /* Fenster mit grünem Licht */
  R(16, 68, 16, 14, '#22301f');
  R(17, 69, 14, 12, 'rgb(' + (60 + Math.sin(t * .06) * 20 | 0) + ',' + (140 + Math.sin(t * .06) * 30 | 0) + ',70)');
  L(24, 68, 24, 82, '#3d3028', 2); L(16, 75, 32, 75, '#3d3028', 2);
  /* Tür */
  R(44, 70, 22, 34, '#3a2c1e');
  R(46, 72, 18, 30, F.huetteOffen ? '#20180f' : '#54402a');
  if (!F.huetteOffen) {
    E(62, 88, 2.5, 2.5, '#c8a44a');
    /* magisches Schlosssymbol */
    var gl = .5 + Math.sin(t * .08) * .35;
    E(55, 84, 5, 5, 'rgba(120,220,160,' + (gl * .35) + ')');
    R(53, 82, 4, 1, 'rgba(180,255,200,' + gl + ')');
    R(54, 84, 2, 4, 'rgba(180,255,200,' + gl + ')');
    R(52, 87, 6, 1, 'rgba(180,255,200,' + gl + ')');
  }
  E(38, 104, 40, 6, '#3f4a30');

  /* Felswand mit Höhleneingang hinter der Brücke */
  P([288, 104, 320, 104, 320, 40, 300, 52], '#3f4440');
  P([296, 104, 320, 104, 320, 48, 304, 58], '#4a5049');
  E(313, 92, 15, 20, '#12120f');
  E(313, 92, 11, 16, '#08080a');

  /* --- Brücke rechts --- */
  R(232, 100, 88, 6, '#6b4f2a');
  R(232, 106, 88, 3, '#54401f');
  for (var pk = 0; pk < 9; pk++) R(234 + pk * 10, 100, 2, 6, '#8a6a3a');
  R(238, 106, 4, 22, '#5c4525'); R(300, 106, 4, 22, '#5c4525');
  L(238, 94, 238, 106, '#6b4f2a', 2); L(268, 92, 268, 106, '#6b4f2a', 2); L(300, 94, 300, 106, '#6b4f2a', 2);
  L(238, 94, 300, 94, '#6b4f2a', 2);

  /* Pfad nach Norden zur Lichtung */
  P([150, 92, 178, 92, 186, 104, 142, 104], '#6b7a4a');

  grassTufts(0, VW, 100, 140, 6.6, '#333d24', '#5e6b34');

  /* Troll auf der Brücke */
  if (!F.trollWeg) drawTroll(266, 100, t);
}

/* ------------------------------------------------------------
   4. HÜTTE DES ZAUBERERS (innen)
   ------------------------------------------------------------ */
function bgHuette(t, F) {
  /* Bretterwand */
  band(0, 108, '#4a3826', '#3a2c1e');
  for (var i = 0; i < 16; i++) { R(i * 20, 0, 1, 108, '#2e2318'); R(i * 20 + 1, 0, 18, 1, 'rgba(255,220,180,.05)'); }
  /* Dielenboden als Tilemap */
  drawTilemap(MAP_HUETTE, LEG, 0, 104);
  groundShade(104, 200, .36, .04);

  /* Hausrat */
  prop('besen', 296, 148, .9);
  prop('kiste', 18, 156);
  prop('fass', 250, 160, .9);
  prop('buecher', 108, 150);
  prop('kerze', 138, 146);
  prop('truhe', 42, 190);
  prop('buecher', 292, 192, 1.2);
  prop('kerze', 214, 176, 1.1);
  prop('kraeuter', 230, 78, .8);
  prop('spinnennetz', 168, 52, .9);
  prop('lichtkugel', 178 + Math.sin(t * .03) * 8, 84 + Math.cos(t * .025) * 4, .8);
  prop('flaschen', 116, 84, .8);
  prop('pilzlampe', 156, 122, .55);
  prop('alchemieglas', 184, 105, .72);
  for (var mt = 0; mt < 3; mt++) {
    prop('motte', 168 + Math.sin(t * .04 + mt * 2) * (16 + mt * 5),
      80 + Math.cos(t * .05 + mt) * (8 + mt * 3), .55 + mt * .08,
      (Math.floor(t / 8) + mt) % 2);
  }

  /* Fenster links mit Sumpflicht */
  R(12, 20, 34, 30, '#2e2318');
  R(14, 22, 30, 26, '#5d7a55');
  R(14, 22, 30, 8, '#7d9a6f');
  L(29, 22, 29, 48, '#2e2318', 2); L(14, 35, 44, 35, '#2e2318', 2);
  P([10, 18, 48, 18, 44, 14, 14, 14], '#5c4525');

  /* Regal mit Flaschen */
  R(66, 26, 82, 4, '#6b4f2a'); R(66, 52, 82, 4, '#6b4f2a');
  var cols = ['#4fa3d8', '#c8483a', '#8fd14f', '#e0b13a', '#9b5de5', '#3ad1c0'];
  for (var b = 0; b < 7; b++) {
    var bx = 72 + b * 11, cc = cols[b % 6];
    R(bx, 14, 6, 12, shade(cc, .8)); R(bx + 1, 16, 4, 9, cc);
    R(bx + 2, 10, 2, 5, '#8f8578'); R(bx + 1, 9, 4, 2, '#6b6252');
    R(bx + 1, 17, 1, 4, 'rgba(255,255,255,.4)');
  }
  for (var b2 = 0; b2 < 5; b2++) {
    var bx2 = 78 + b2 * 13;
    R(bx2, 40, 8, 12, '#5c6a4a'); R(bx2 + 1, 42, 6, 9, cols[(b2 + 2) % 6]);
    R(bx2 + 2, 36, 3, 5, '#8f8578');
  }

  /* Standuhr rechts */
  R(258, 24, 34, 82, '#4a2f18');
  R(262, 28, 26, 78, '#6b4526');
  R(264, 32, 22, 22, '#2a1e12');
  E(275, 43, 10, 10, '#e8dcc0'); E(275, 43, 8.5, 8.5, '#f4ecd8');
  for (var h = 0; h < 12; h++) { var a = h / 12 * 6.283; R(275 + Math.sin(a) * 7 - .5, 43 - Math.cos(a) * 7 - .5, 1, 1, '#3a2c1e'); }
  if (F.zahnradWeg) {
    R(275, 43, 1, 1, '#8c1d1d');
  } else {
    L(275, 43, 275 + Math.sin(t * .02) * 5, 43 - Math.cos(t * .02) * 5, '#3a2c1e', 1);
    L(275, 43, 275 + Math.sin(t * .006) * 4, 43 - Math.cos(t * .006) * 4, '#3a2c1e', 2);
  }
  R(264, 60, 22, 40, F.zahnradWeg ? '#1a120a' : '#3a2c1e');
  if (F.zahnradWeg) {
    /* offene Uhr, Innenleben sichtbar */
    E(275, 74, 6, 6, '#5a5f68'); E(281, 84, 4, 4, '#5a5f68');
  } else {
    L(275, 62, 275 + Math.sin(t * .07) * 7, 92, '#8a7a4a', 2);
    E(275 + Math.sin(t * .07) * 7, 94, 5, 5, '#c8a44a');
  }
  P([254, 24, 296, 24, 290, 14, 260, 14], '#4a2f18');

  /* Kessel in der Mitte über dem Feuer */
  var kx = 168, ky = 118;
  R(kx - 22, ky + 4, 44, 3, '#3a3128');
  for (var lg = 0; lg < 3; lg++) L(kx - 14 + lg * 14, ky + 4, kx - 8 + lg * 10, ky - 4, '#5c4525', 2);
  flame(kx - 8, ky + 3, 9, t, true);
  flame(kx + 6, ky + 3, 7, t * 1.3 + 5, true);
  E(kx, ky - 12, 24, 16, '#2e3138');
  E(kx, ky - 18, 24, 8, '#3d4149');
  E(kx, ky - 18, 20, 6, F.kesselFertig ? '#b48ce8' : (F.kesselWasser ? '#4d7a3a' : '#1b1d22'));
  if (F.kesselWasser || F.kesselFertig) {
    for (var bl = 0; bl < 5; bl++) {
      var bp = ((t * .03 + bl * .2) % 1);
      E(kx - 14 + bl * 7, ky - 19 - bp * 6, 1 + bp * 2, 1 + bp * 2,
        (F.kesselFertig ? 'rgba(220,190,255,' : 'rgba(160,210,120,') + (.6 - bp * .6) + ')');
    }
  }
  L(kx - 24, ky - 20, kx + 24, ky - 20, '#4a4f58', 2);

  /* Tisch links vorne mit Buch, Lumpen, Feuerstein */
  R(24, 108, 68, 5, '#7d5a2e');
  R(28, 113, 5, 22, '#5c4525'); R(84, 113, 5, 22, '#5c4525');
  if (!F.buchWeg) {
    P([36, 100, 62, 100, 62, 108, 36, 108], '#6b2f7a');
    R(36, 100, 4, 8, '#4a1f57');
    R(42, 102, 16, 1, '#e8d78e'); R(42, 104, 16, 1, '#e8d78e'); R(42, 106, 10, 1, '#e8d78e');
    E(52, 104, 2.5, 2.5, 'rgba(255,210,60,' + (.5 + Math.sin(t * .09) * .4) + ')');
  }
  if (!F.feuersteinWeg) {
    P([70, 103, 76, 100, 82, 103, 80, 108, 72, 108], '#7d8390');
    R(73, 103, 4, 2, '#a9b0bb');
  }
  /* Lumpen am Haken */
  if (!F.lumpenWeg) {
    R(214, 24, 2, 6, '#5a5f68');
    P([206, 30, 224, 30, 226, 48, 216, 56, 204, 46], '#b9ac8e');
    P([210, 34, 220, 33, 222, 44, 214, 50], '#d2c6a8');
  }

  /* Tür rechts unten */
  R(300, 62, 20, 46, '#3a2c1e');
  R(302, 64, 16, 42, '#5a4028');
  E(305, 86, 2, 2, '#c8a44a');

  /* Spinnweben */
  L(0, 0, 26, 22, 'rgba(220,220,220,.25)', 1);
  L(0, 12, 20, 22, 'rgba(220,220,220,.18)', 1);
  L(12, 0, 24, 16, 'rgba(220,220,220,.18)', 1);
}

/* ------------------------------------------------------------
   4b. WIRTSHAUS "ZUM KRUMMEN KRUG" (innen)
   ------------------------------------------------------------ */
function bgWirtshaus(t, F) {
  /* Wand mit Fachwerk */
  band(0, 116, '#7d6b4e', '#5f5138');
  for (var i = 0; i < 5; i++) R(0, 14 + i * 22, VW, 4, '#4a3a24');
  for (var b = 0; b < 7; b++) R(b * 48, 0, 5, 116, '#4a3a24');
  /* Deckenbalken */
  R(0, 0, VW, 10, '#3d3020');
  for (var db = 0; db < 6; db++) R(db * 56 + 10, 0, 8, 14, '#4a3a24');

  /* Boden */
  drawTilemap(MAP_WIRTSHAUS, LEG, 0, 112);
  groundShade(112, 200, .34, .05);

  /* Kamin rechts */
  prop('kaminfeuer', 268, 150);
  flame(258, 146, 10, t, true);
  flame(272, 147, 12, t * 1.2 + 3, true);
  flame(284, 146, 9, t * .9 + 7, true);
  var fl = .45 + Math.sin(t * .12) * .12;
  E(268, 140, 60, 46, 'rgba(255,150,50,' + (fl * .12) + ')');

  /* Tresen links */
  R(8, 118, 104, 8, '#6b4f2a');
  R(8, 118, 104, 2, '#8a6a3a');
  R(8, 126, 104, 22, '#54401f');
  for (var p = 0; p < 6; p++) R(14 + p * 18, 128, 3, 18, '#42320f');
  /* Fässer hinter dem Tresen */
  prop('fass', 26, 116, .9);
  prop('fass', 52, 114, .8);
  /* Regal mit Krügen */
  R(6, 46, 96, 4, '#5c4525'); R(6, 70, 96, 4, '#5c4525');
  for (var k = 0; k < 7; k++) prop('krug', 16 + k * 13, 46, .9);
  for (var k2 = 0; k2 < 6; k2++) prop('krug', 22 + k2 * 14, 70, .8);

  /* Fenster hinten */
  R(140, 26, 34, 30, '#3a3226');
  R(143, 29, 28, 24, '#5d7a8f');
  R(143, 29, 28, 9, '#7d9aaf');
  L(157, 29, 157, 53, '#3a3226', 2); L(143, 41, 171, 41, '#3a3226', 2);
  P([136, 24, 178, 24, 174, 19, 140, 19], '#5c4525');

  /* Wandbild */
  R(196, 30, 30, 24, '#4a3a24'); R(199, 33, 24, 18, '#6b7a5a');
  E(211, 44, 8, 5, '#8a9a6a'); P([203, 44, 211, 34, 219, 44], '#5a6a4a');

  /* Tür links unten (Ausgang) */
  R(0, 92, 22, 56, '#3a2c1e');
  R(2, 95, 18, 50, '#5a4028');
  E(17, 120, 2.5, 2.5, '#c8a44a');

  /* Kerzen an der Wand */
  prop('kerze', 122, 60, 1.1);
  prop('kerze', 244, 58, 1.1);

  /* Tische und Stühle */
  prop('tisch', 150, 168);
  prop('stuhl', 118, 172, 1);
  prop('stuhl', 186, 170, 1);
  prop('tisch', 62, 196, 1.15);
  prop('stuhl', 24, 198, 1.1);
  prop('krug', 146, 148, 1.1);
  prop('krug', 158, 149, 1);
  prop('krug', 56, 176, 1.2);
  propSway('banner', 214, 88, .78, t * .012 + 2, .014);
  prop('flaschen', 300, 112, .72);
  prop('ranken', 314, 82, .55);

  /* Figuren */
  drawBruno(60, 118, t);
  drawGrete(196, 170, t);

  /* Rauch und Funkenflug vom Kamin */
  for (var s = 0; s < 6; s++) {
    var sp = ((t * .014 + s * .17) % 1);
    E(266 + Math.sin(sp * 6 + s) * 8, 132 - sp * 40, 1 + sp * 2.4, 1 + sp * 2.4, 'rgba(255,170,80,' + (.45 - sp * .45) + ')');
  }
}

/* ------------------------------------------------------------
   5. DRACHENHÖHLE
   ------------------------------------------------------------ */
function bgHoehle(t, F, lit) {
  if (!lit) {
    R(0, 0, VW, 142, '#07070a');
    /* zwei glimmende Augen */
    var gl = .55 + Math.sin(t * .05) * .25;
    E(196, 70, 5, 3, 'rgba(255,190,40,' + gl + ')');
    E(214, 70, 5, 3, 'rgba(255,190,40,' + gl + ')');
    E(196, 70, 2, 1.4, '#1a1414'); E(214, 70, 2, 1.4, '#1a1414');
    /* Lichtschein vom Eingang */
    P([0, 40, 30, 60, 30, 120, 0, 132], 'rgba(120,140,120,.10)');
    return;
  }

  band(0, 100, '#2a2430', '#3b3340');
  /* Felswände */
  for (var i = 0; i < 22; i++) {
    var x = i * 16, hh = 14 + rnd(i) * 22;
    P([x, 0, x + 18, 0, x + 14, hh, x + 4, hh - 6], '#241f2b');
  }
  /* Stalaktiten */
  for (var s = 0; s < 9; s++) {
    var sx = 14 + s * 36 + rnd(s) * 10, sh = 12 + rnd(s + 3) * 20;
    P([sx - 5, 0, sx + 5, 0, sx, sh], '#4a4152');
    P([sx - 2, 0, sx + 2, 0, sx, sh * .7], '#5c5266');
  }
  /* Höhlenboden als Tilemap */
  drawTilemap(MAP_HOEHLE, LEG, 0, 96);
  groundShade(96, 200, .42, .10);

  /* Höhlenfunde */
  prop('kristallader', 22, 132, .9);
  prop('gluehpilz', 62, 144, .55);
  prop('stalagmit', 46, 156);
  prop('knochen', 132, 150);
  prop('goldhaufen', 262, 150);
  prop('schaedel', 96, 176);
  prop('stalagmit', 304, 182, 1.2);
  prop('truhe', 176, 194, 1.1);
  prop('knochen', 232, 188, 1.2);
  prop('kette', 146, 78, .9);
  prop('pilzlampe', 118, 154, .48);
  for (var bat = 0; bat < 3; bat++) {
    var bx = ((t * (.34 + bat * .05) + bat * 117) % 380) - 30;
    prop('fledermaus', bx, 34 + bat * 15 + Math.sin(t * .06 + bat) * 7, .7 + bat * .08, bat % 2);
  }
  for (var r = 0; r < 40; r++) {
    var rx = rnd(r * 3.1) * VW, ry = 100 + rnd(r + 7) * 40;
    E(rx, ry, 2 + rnd(r + 1) * 4, 1.5 + rnd(r + 2) * 2, rnd(r + 5) > .5 ? '#5c5266' : '#382f42');
  }

  /* Ausgang links */
  E(6, 108, 24, 34, '#0d0d12');
  P([0, 78, 26, 92, 26, 130, 0, 140], 'rgba(150,170,150,.12)');

  /* Goldhaufen */
  for (var gd = 0; gd < 46; gd++) {
    var gx = 150 + rnd(gd * 2.7) * 150, gy = 116 + rnd(gd + 3) * 20;
    E(gx, gy, 2.5, 1.8, rnd(gd + 9) > .5 ? '#e9b54a' : '#c98a30');
  }
  E(240, 126, 8, 4, '#c4c9d4'); E(268, 132, 7, 3.5, '#e9b54a');

  /* Kristall auf Felssockel vorne links */
  if (!F.kristallWeg) {
    var cx = 92, cy = 122;
    E(cx, cy + 6, 16, 6, '#3d3546');
    P([cx - 12, cy + 6, cx + 12, cy + 6, cx + 8, cy - 4, cx - 8, cy - 4], '#4a4152');
    var pu = .55 + Math.sin(t * .06) * .3;
    E(cx, cy - 12, 18, 14, 'rgba(155,93,229,' + (pu * .22) + ')');
    P([cx, cy - 26, cx + 9, cy - 12, cx, cy - 2, cx - 9, cy - 12], '#9b5de5');
    P([cx, cy - 26, cx, cy - 2, cx - 9, cy - 12], '#c48bff');
    P([cx, cy - 26, cx + 4, cy - 14, cx, cy - 8], '#e6d0ff');
    E(cx - 3, cy - 18, 1.6, 2.4, 'rgba(255,255,255,' + pu + ')');
  }

  /* Drache */
  drawDrache(228, 118, t, true);
}

/* ------------------------------------------------------------
   6. STEINKREIS
   ------------------------------------------------------------ */
function bgSteinkreis(t, F) {
  band(0, 100, '#141a34', '#3d3358');
  /* Sterne */
  for (var s = 0; s < 60; s++) {
    var sx = rnd(s * 5.3) * VW, sy = rnd(s * 2.1) * 80;
    var tw = .35 + Math.abs(Math.sin(t * .04 + s)) * .65;
    R(sx, sy, 1, 1, 'rgba(255,255,255,' + tw + ')');
  }
  /* Mond */
  E(268, 26, 15, 15, '#f4eec8'); E(263, 22, 3, 3, '#ded8b4'); E(272, 30, 4, 3, '#ded8b4');
  E(268, 26, 22, 22, 'rgba(244,238,200,.10)');

  /* Hügelsilhouette */
  E(60, 104, 100, 26, '#1e2a24');
  E(230, 106, 110, 24, '#1a2620');

  /* Boden als Tilemap */
  drawTilemap(MAP_STEINKREIS, LEG, 0, 94);
  groundShade(94, 200, .44, .10);
  grassTufts(0, VW, 98, 196, 12.3, '#22331f', '#40592f');

  /* Opfergaben und Gestein */
  prop('stein1', 62, 148, .9);
  prop('runenstein', 82, 160, .75);
  prop('kerze', 132, 142);
  prop('kerze', 192, 144);
  prop('stein2', 248, 152);
  prop('busch2', 296, 168);
  prop('farn', 26, 178);
  prop('kerze', 104, 186, 1.2);
  prop('kerze', 220, 190, 1.2);
  prop('stein1', 286, 196, 1.1);
  prop('runenstein', 270, 188, .6);
  propSway('wegfahne', 156, 118, .62, t * .013, .012);
  prop('lichtkugel', 112 + Math.sin(t * .025) * 8, 92 + Math.cos(t * .031) * 5, .75);
  prop('lichtkugel', 212 + Math.cos(t * .022) * 10, 78 + Math.sin(t * .027) * 6, .55);
  propSway('banner', 44, 126, .62, t * .011 + 1.6, .013);
  for (var pm = 0; pm < 2; pm++) {
    prop('motte', 160 + Math.sin(t * .028 + pm * 3) * (48 + pm * 20),
      78 + Math.cos(t * .035 + pm) * 12, .6 + pm * .1,
      (Math.floor(t / 8) + pm) % 2);
  }

  /* Steinkreis (hinten kleiner) */
  var stones = [[36, 108, 16, 44], [78, 102, 13, 36], [126, 98, 11, 30],
                [196, 98, 11, 30], [246, 102, 13, 36], [288, 108, 16, 44]];
  for (var i = 0; i < stones.length; i++) {
    var st = stones[i], x = st[0], y = st[1], ww = st[2], hh = st[3];
    P([x - ww / 2, y, x + ww / 2, y, x + ww / 2 - 1, y - hh, x - ww / 2 + 2, y - hh + 2], '#5a5a64');
    P([x - ww / 2, y, x - ww / 2 + 4, y, x - ww / 2 + 5, y - hh + 2, x - ww / 2 + 2, y - hh + 2], '#71717c');
    P([x + ww / 2 - 3, y, x + ww / 2, y, x + ww / 2 - 1, y - hh], '#43434d');
    E(x, y, ww * .7, 3, '#20281e');
    /* Runen */
    if (F.kristallPlatziert) {
      var ru = .4 + Math.sin(t * .07 + i) * .35;
      R(x - 2, y - hh * .6, 4, 1, 'rgba(180,140,255,' + ru + ')');
      R(x - 1, y - hh * .5, 2, 3, 'rgba(180,140,255,' + ru + ')');
      R(x - 3, y - hh * .35, 6, 1, 'rgba(180,140,255,' + ru + ')');
    }
  }

  /* Altar in der Mitte */
  var ax = 162, ay = 118;
  E(ax, ay + 4, 30, 7, '#20281e');
  P([ax - 24, ay + 4, ax + 24, ay + 4, ax + 20, ay - 8, ax - 20, ay - 8], '#5a5a64');
  P([ax - 20, ay - 8, ax + 20, ay - 8, ax + 22, ay - 12, ax - 22, ay - 12], '#7a7a86');
  P([ax - 24, ay + 4, ax - 18, ay + 4, ax - 15, ay - 8, ax - 20, ay - 8], '#6c6c78');
  R(ax - 16, ay - 4, 32, 1, '#43434d');

  if (F.kristallPlatziert) {
    var pu = .5 + Math.sin(t * .07) * .35;
    E(ax, ay - 20, 24, 20, 'rgba(155,93,229,' + (pu * .2) + ')');
    P([ax, ay - 32, ax + 8, ay - 20, ax, ay - 11, ax - 8, ay - 20], '#9b5de5');
    P([ax, ay - 32, ax, ay - 11, ax - 8, ay - 20], '#c48bff');
    P([ax, ay - 32, ax + 4, ay - 22, ax, ay - 16], '#e6d0ff');
    /* Lichtstrahl */
    P([ax - 5, ay - 30, ax + 5, ay - 30, ax + 16, 0, ax - 16, 0], 'rgba(180,140,255,' + (pu * .16) + ')');
    for (var p = 0; p < 10; p++) {
      var pp = ((t * .02 + p * .1) % 1);
      E(ax + Math.sin(t * .05 + p * 2) * 14, ay - 20 - pp * 60, 1.2, 1.2, 'rgba(220,190,255,' + (.7 - pp * .7) + ')');
    }
  }

}
