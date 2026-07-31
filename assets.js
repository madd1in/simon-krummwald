/* ============================================================
   assets.js – Asset-Pipeline: Sprite-Atlas und Tileset

   Alle Grafiken werden beim Start EINMAL in einen Atlas
   gebacken (ein einziges Offscreen-Canvas). Danach zeichnet
   das Spiel nur noch Blits daraus – echte Sprites, echte
   Kacheln, echte Tilemaps.

   bakeAtlas() ersetzt anschließend drawSimon/drawIcon/NPC-
   Funktionen durch Atlas-Blits, damit der restliche Code
   unverändert weiterläuft.

   Der fertige Atlas lässt sich mit exportAtlas() als PNG
   herunterladen (Taste A im Spiel).
   ============================================================ */

var ATLAS = null, AX = null;
var FRAMES = {};          /* name -> {x,y,w,h,ox,oy} */
var TILE = 16;            /* Kachelgröße */
var TILES = {};           /* name -> Index im Tileset */
var TILE_LIST = [];
var TILE_KINDS = ['gras', 'gras_dunkel', 'pfad', 'kopfstein', 'holzboden', 'fels', 'moor', 'nachtgras',
                  'erde', 'kies', 'blumenwiese', 'moorwasser', 'laub', 'dielen', 'kristallfels', 'runengras',
                  'moospflaster', 'sumpfschlamm', 'asche', 'sternengras',
                  'wurzelboden', 'ziegel', 'magmastein', 'mondpfad',
                  'pilzmoos', 'schiefer', 'teppich', 'portalboden'];
var atlasReady = false;
var NPC_PHASES = 4;   /* Animationsphasen je NPC */

/* ---------- kleiner Zeilen-Packer ---------- */
var packX = 0, packY = 0, packRow = 0;
function packAlloc(w, h) {
  if (packX + w > ATLAS.width / RES) { packX = 0; packY += packRow + 1; packRow = 0; }
  var r = { x: packX, y: packY, w: w, h: h };
  packX += w + 1;
  if (h > packRow) packRow = h;
  return r;
}

/* Zeichnet fn() in eine frisch reservierte Atlas-Zelle.
   fn bekommt einen verschobenen Ursprung (ox,oy = Ankerpunkt). */
function bake(name, w, h, ox, oy, fn) {
  var cell = packAlloc(w, h);
  var save = g;
  g = AX;
  AX.save();
  AX.scale(RES, RES);
  AX.translate(cell.x, cell.y);
  fn(ox, oy);
  AX.restore();
  g = save;
  FRAMES[name] = { x: cell.x, y: cell.y, w: w, h: h, ox: ox, oy: oy };
}

/* ---------- Ebenen-Cache ----------
   Unbewegte Bildteile werden einmal in ein eigenes Canvas
   gezeichnet und danach nur noch geblittet. Das spart pro Frame
   tausende Zeichenbefehle. */

var LAYERCACHE = {}, layerCount = 0;

function cachedLayer(key, fn) {
  var c = LAYERCACHE[key];
  if (!c) {
    if (layerCount > 24) { LAYERCACHE = {}; layerCount = 0; }   /* Notbremse */
    c = document.createElement('canvas');
    c.width = VW * RES; c.height = VH * RES;
    var cx = c.getContext('2d');
    cx.imageSmoothingEnabled = true;
    cx.scale(RES, RES);
    var save = g;
    g = cx;
    fn();
    g = save;
    LAYERCACHE[key] = c;
    layerCount++;
  }
  g.drawImage(c, 0, 0, VW, VH);
}

function clearLayerCache() { LAYERCACHE = {}; layerCount = 0; }

/* ---------- Blit ---------- */

function sprite(name, x, y, s, flip) {
  var f = FRAMES[name];
  if (!f) return;
  s = s || 1;
  g.save();
  g.translate(x, y);
  if (s !== 1 || flip) g.scale(flip ? -s : s, s);
  g.drawImage(ATLAS, f.x * RES, f.y * RES, f.w * RES, f.h * RES, -f.ox, -f.oy, f.w, f.h);
  g.restore();
}

/* Figur mit Szenenlicht: Grundfarbe leicht einfärben und einen
   Lichtsaum aus der Richtung der Lichtquelle darüberlegen.
   Läuft über ein kleines Zwischencanvas, damit nur die Figur
   betroffen ist und nicht der Hintergrund. */
var litBuf = null, litCtx = null;

function tintedSprite(name, x, y, s, flip, light) {
  var f = FRAMES[name];
  if (!f) return;
  if (!light) { sprite(name, x, y, s, flip); return; }

  if (!litBuf) {
    litBuf = document.createElement('canvas');
    litBuf.width = 96 * RES; litBuf.height = 96 * RES;
    litCtx = litBuf.getContext('2d');
    litCtx.imageSmoothingEnabled = true;
    litCtx.scale(RES, RES);
  }
  if (f.w > 96 || f.h > 96) { sprite(name, x, y, s, flip); return; }

  litCtx.clearRect(0, 0, f.w, f.h);

  /* 1. Lichtsaum: versetzte Silhouette, zur Lichtfarbe umgefärbt */
  if (light.rim) {
    litCtx.globalCompositeOperation = 'source-over';
    litCtx.drawImage(ATLAS, f.x * RES, f.y * RES, f.w * RES, f.h * RES, light.dx || -1, light.dy || -1, f.w, f.h);
    litCtx.globalCompositeOperation = 'source-in';
    litCtx.fillStyle = light.rim;
    litCtx.fillRect(0, 0, f.w, f.h);
  }
  /* 2. die Figur selbst darüber */
  litCtx.globalCompositeOperation = 'source-over';
  litCtx.drawImage(ATLAS, f.x * RES, f.y * RES, f.w * RES, f.h * RES, 0, 0, f.w, f.h);

  /* 3. Grundton der Szene über alles, was zur Figur gehört */
  if (light.tint) {
    litCtx.globalCompositeOperation = 'source-atop';
    litCtx.fillStyle = light.tint;
    litCtx.fillRect(0, 0, f.w, f.h);
  }
  litCtx.globalCompositeOperation = 'source-over';

  g.save();
  g.translate(x, y);
  if (s !== 1 || flip) g.scale(flip ? -s : s, s);
  g.drawImage(litBuf, 0, 0, f.w * RES, f.h * RES, -f.ox, -f.oy, f.w, f.h);
  g.restore();
}

/* ---------- Tileset ---------- */

function tilePixels(kind, seed) {
  /* malt eine 16x16-Kachel; g zeigt bereits auf die Atlas-Zelle */
  var i, x, y, r;
  switch (kind) {
    case 'gras':
      R(0, 0, TILE, TILE, '#4a8531');
      for (i = 0; i < 20; i++) {
        r = rnd(seed + i * 3.7); x = r * TILE; y = rnd(seed + i * 1.3) * TILE;
        R(x, y, 1, 1, r > .5 ? '#457c2d' : '#508d36');
      }
      for (i = 0; i < 3; i++) { x = rnd(seed + i * 9.1) * TILE; y = rnd(seed + i * 5.5) * TILE; R(x, y, 1, 2, '#57953b'); }
      break;
    case 'gras_dunkel':
      R(0, 0, TILE, TILE, '#3f7129');
      for (i = 0; i < 18; i++) { x = rnd(seed + i * 2.9) * TILE; y = rnd(seed + i * 4.1) * TILE; R(x, y, 1, 1, rnd(seed + i) > .5 ? '#396827' : '#457c2d'); }
      break;
    case 'pfad':
      R(0, 0, TILE, TILE, '#ac9463');
      for (i = 0; i < 22; i++) { x = rnd(seed + i * 2.3) * TILE; y = rnd(seed + i * 3.9) * TILE; R(x, y, 1 + (i % 2), 1, rnd(seed + i * 5) > .5 ? '#a48c5c' : '#b59d6b'); }
      for (i = 0; i < 3; i++) { x = rnd(seed + i * 7.3) * TILE; y = rnd(seed + i * 8.1) * TILE; E(x, y, 1.4, 1, '#9a8354'); }
      break;
    case 'kopfstein':
      R(0, 0, TILE, TILE, '#6f6a5d');
      for (i = 0; i < 8; i++) {
        x = (i % 3) * 5 + (Math.floor(i / 3) % 2) * 2, y = Math.floor(i / 3) * 5;
        R(x + 1, y + 1, 4, 4, rnd(seed + i * 3.3) > .5 ? '#7a7365' : '#6d675b');
        R(x + 1, y + 1, 4, 1, '#847d6e');
      }
      break;
    case 'holzboden':
      R(0, 0, TILE, TILE, '#6e5637');
      R(0, 5, TILE, 1, '#4d3a24'); R(0, 11, TILE, 1, '#4d3a24');
      for (i = 0; i < 14; i++) { x = rnd(seed + i * 4.7) * TILE; y = rnd(seed + i * 2.1) * TILE; R(x, y, 2, 1, rnd(seed + i) > .5 ? '#7d6340' : '#5f4a2f'); }
      break;
    case 'fels':
      R(0, 0, TILE, TILE, '#4a4152');
      for (i = 0; i < 18; i++) { x = rnd(seed + i * 3.1) * TILE; y = rnd(seed + i * 5.7) * TILE; E(x, y, 1 + rnd(seed + i) * 2, 1, rnd(seed + i * 2) > .5 ? '#5c5266' : '#3a3244'); }
      break;
    case 'moor':
      R(0, 0, TILE, TILE, '#4b5439');
      for (i = 0; i < 20; i++) { x = rnd(seed + i * 2.7) * TILE; y = rnd(seed + i * 6.3) * TILE; R(x, y, 2, 1, rnd(seed + i) > .5 ? '#3d4630' : '#5b6644'); }
      for (i = 0; i < 3; i++) { x = rnd(seed + i * 9.7) * TILE; y = rnd(seed + i * 4.3) * TILE; E(x, y, 2, 1, '#2f3a28'); }
      break;
    case 'nachtgras':
      R(0, 0, TILE, TILE, '#33452f');
      for (i = 0; i < 20; i++) { x = rnd(seed + i * 3.3) * TILE; y = rnd(seed + i * 2.7) * TILE; R(x, y, 1, 2, rnd(seed + i) > .5 ? '#2a3a26' : '#40593a'); }
      break;
    case 'erde':
      R(0, 0, TILE, TILE, '#6b5334');
      for (i = 0; i < 24; i++) { x = rnd(seed + i * 2.7) * TILE; y = rnd(seed + i * 4.3) * TILE; R(x, y, 1 + (i % 2), 1, rnd(seed + i * 3) > .5 ? '#5f4a2e' : '#775c3c'); }
      break;
    case 'kies':
      R(0, 0, TILE, TILE, '#7d786c');
      for (i = 0; i < 22; i++) { x = rnd(seed + i * 3.9) * TILE; y = rnd(seed + i * 2.1) * TILE; E(x, y, 1 + rnd(seed + i) * 1.4, 1, rnd(seed + i * 2) > .5 ? '#6d685e' : '#8d887c'); }
      break;
    case 'blumenwiese':
      R(0, 0, TILE, TILE, '#4a8531');
      for (i = 0; i < 16; i++) { x = rnd(seed + i * 3.7) * TILE; y = rnd(seed + i * 1.3) * TILE; R(x, y, 1, 1, rnd(seed + i) > .5 ? '#457c2d' : '#508d36'); }
      for (i = 0; i < 4; i++) {
        x = 2 + rnd(seed + i * 9.3) * 12; y = 2 + rnd(seed + i * 4.1) * 12;
        R(x, y, 1, 1, ['#e8d24a', '#e07ab0', '#f2f2f2', '#e8d24a'][i % 4]);
      }
      break;
    case 'moorwasser':
      R(0, 0, TILE, TILE, '#4b5439');
      E(8, 9, 6, 4, '#22362b'); E(7, 8, 4.4, 2.6, '#2c4436');
      R(4, 7, 3, 1, 'rgba(150,190,150,.2)');
      for (i = 0; i < 8; i++) { x = rnd(seed + i * 2.3) * TILE; y = rnd(seed + i * 5.1) * TILE; R(x, y, 1, 1, '#3d4630'); }
      break;
    case 'laub':
      R(0, 0, TILE, TILE, '#416c2d');
      for (i = 0; i < 13; i++) {
        x = rnd(seed + i * 3.9) * TILE; y = rnd(seed + i * 6.7) * TILE;
        P([x - 1, y, x + 2, y - 1, x + 1, y + 2], i % 3 ? '#8a6630' : '#b17a33');
      }
      for (i = 0; i < 7; i++) { x = rnd(seed + i * 8.1) * TILE; y = rnd(seed + i * 2.7) * TILE; R(x, y, 1, 2, '#315b27'); }
      break;
    case 'dielen':
      R(0, 0, TILE, TILE, '#4e3926');
      R(0, 4, TILE, 1, '#2e2219'); R(0, 9, TILE, 1, '#2e2219'); R(0, 14, TILE, 1, '#2e2219');
      R(5, 0, 1, 4, '#695038'); R(12, 5, 1, 4, '#695038'); R(3, 10, 1, 4, '#695038');
      for (i = 0; i < 8; i++) { x = rnd(seed + i * 3.2) * TILE; y = rnd(seed + i * 7.1) * TILE; R(x, y, 2, 1, '#78583a'); }
      break;
    case 'kristallfels':
      R(0, 0, TILE, TILE, '#3b3347');
      for (i = 0; i < 15; i++) { x = rnd(seed + i * 3.1) * TILE; y = rnd(seed + i * 5.7) * TILE; E(x, y, 1 + rnd(seed + i) * 2, 1, i % 3 ? '#4c4258' : '#2e2838'); }
      P([3, 13, 5, 7, 7, 13], '#6f45a9'); R(5, 8, 1, 4, '#b18ae8');
      R(12, 3, 1, 2, '#9362cf');
      break;
    case 'runengras':
      R(0, 0, TILE, TILE, '#2e3e2b');
      for (i = 0; i < 14; i++) { x = rnd(seed + i * 3.3) * TILE; y = rnd(seed + i * 2.7) * TILE; R(x, y, 1, 2, '#263523'); }
      L(5, 11, 8, 5, '#6f62a5', 1); L(8, 5, 11, 11, '#6f62a5', 1); L(6, 9, 10, 9, '#9b83d2', 1);
      break;
    case 'moospflaster':
      R(0, 0, TILE, TILE, '#67685a');
      for (i = 0; i < 8; i++) {
        x = (i % 3) * 5 + (Math.floor(i / 3) % 2) * 2; y = Math.floor(i / 3) * 5;
        R(x + 1, y + 1, 4, 4, i % 2 ? '#737468' : '#5d6054');
        R(x + 1, y + 1, 4, 1, '#838579');
      }
      R(0, 5, 5, 1, '#3f6738'); R(10, 10, 6, 1, '#4a7440');
      R(4, 6, 1, 3, '#558348'); R(12, 11, 1, 2, '#558348');
      break;
    case 'sumpfschlamm':
      R(0, 0, TILE, TILE, '#4b4934');
      for (i = 0; i < 16; i++) { x = rnd(seed + i * 4.2) * TILE; y = rnd(seed + i * 1.9) * TILE; E(x, y, 2 + rnd(seed + i) * 3, 1, i % 3 ? '#56543b' : '#393b2c'); }
      E(5, 6, 3, 1.5, '#252e27'); E(12, 12, 2.5, 1.2, '#30382d');
      break;
    case 'asche':
      R(0, 0, TILE, TILE, '#39343c');
      for (i = 0; i < 22; i++) { x = rnd(seed + i * 2.4) * TILE; y = rnd(seed + i * 5.6) * TILE; R(x, y, 1 + (i % 2), 1, i % 4 ? '#443e47' : '#5d4a43'); }
      R(3, 10, 5, 1, '#2b282f'); R(11, 4, 3, 1, '#6a5046');
      break;
    case 'sternengras':
      R(0, 0, TILE, TILE, '#293b31');
      for (i = 0; i < 14; i++) { x = rnd(seed + i * 3.8) * TILE; y = rnd(seed + i * 2.4) * TILE; R(x, y, 1, 2, '#355043'); }
      for (i = 0; i < 3; i++) {
        x = 3 + rnd(seed + i * 7.7) * 10; y = 3 + rnd(seed + i * 9.1) * 10;
        R(x - 1, y, 3, 1, '#8d79c6'); R(x, y - 1, 1, 3, '#b29be8');
      }
      break;
    case 'wurzelboden':
      R(0, 0, TILE, TILE, '#51472f');
      for (i = 0; i < 14; i++) { x = rnd(seed + i * 2.8) * TILE; y = rnd(seed + i * 6.1) * TILE; R(x, y, 1, 1, i % 2 ? '#66563a' : '#3d3828'); }
      L(-2, 12, 7, 7, '#76583a', 2); L(7, 7, 17, 10, '#5f452f', 2);
      L(5, 8, 3, 3, '#8b6742', 1); L(10, 8, 13, 4, '#8b6742', 1);
      break;
    case 'ziegel':
      R(0, 0, TILE, TILE, '#745044');
      for (i = 0; i < 4; i++) {
        y = i * 4; R(0, y, TILE, 1, '#3f3533');
        var off = (i % 2) * 4;
        for (x = off; x < TILE; x += 8) R(x, y, 1, 4, '#493a36');
      }
      R(1, 1, 6, 1, '#8a6050'); R(9, 9, 5, 1, '#8a6050');
      break;
    case 'magmastein':
      R(0, 0, TILE, TILE, '#2d2930');
      for (i = 0; i < 14; i++) { x = rnd(seed + i * 4.1) * TILE; y = rnd(seed + i * 2.9) * TILE; E(x, y, 1 + rnd(seed + i) * 2, 1, '#403942'); }
      L(2, 4, 7, 8, '#9c3e2c', 1); L(7, 8, 13, 5, '#da6736', 1);
      L(7, 8, 10, 14, '#7d3027', 1); R(7, 7, 2, 2, '#f0a04b');
      break;
    case 'mondpfad':
      R(0, 0, TILE, TILE, '#555267');
      for (i = 0; i < 13; i++) { x = rnd(seed + i * 3.6) * TILE; y = rnd(seed + i * 5.4) * TILE; E(x, y, 1 + rnd(seed + i) * 2.2, 1, i % 2 ? '#666279' : '#484657'); }
      E(6, 7, 3, 2, '#81789c'); R(11, 11, 3, 1, '#aaa0c2');
      R(3, 3, 1, 1, '#d4c8e8');
      break;
    case 'pilzmoos':
      R(0, 0, TILE, TILE, '#38523a');
      for (i = 0; i < 18; i++) { x = rnd(seed + i * 3.1) * TILE; y = rnd(seed + i * 6.4) * TILE; E(x, y, 1.8, 1, i % 2 ? '#476746' : '#2d4432'); }
      for (i = 0; i < 3; i++) {
        x = 3 + rnd(seed + i * 7.2) * 10; y = 5 + rnd(seed + i * 4.8) * 8;
        R(x, y, 1, 3, '#c9c2b5'); E(x, y - 1, 2, 1.3, i % 2 ? '#b45357' : '#a883cf');
      }
      break;
    case 'schiefer':
      R(0, 0, TILE, TILE, '#484d54');
      for (i = 0; i < 7; i++) {
        x = (i % 3) * 6 - 1; y = Math.floor(i / 3) * 6;
        P([x, y + 1, x + 6, y, x + 5, y + 5, x - 1, y + 6], i % 2 ? '#535961' : '#3d4248');
        L(x, y + 1, x + 6, y, '#697079', 1);
      }
      break;
    case 'teppich':
      R(0, 0, TILE, TILE, '#61344b');
      R(1, 1, 14, 14, '#7c405d'); R(2, 2, 12, 12, '#4c2940');
      P([8, 3, 13, 8, 8, 13, 3, 8], '#b7874d');
      P([8, 5, 11, 8, 8, 11, 5, 8], '#d0a968');
      R(0, 0, TILE, 1, '#c7a56d'); R(0, 15, TILE, 1, '#c7a56d');
      break;
    case 'portalboden':
      R(0, 0, TILE, TILE, '#34314a');
      for (i = 0; i < 11; i++) { x = rnd(seed + i * 4.4) * TILE; y = rnd(seed + i * 2.2) * TILE; R(x, y, 1, 1, '#494466'); }
      E(8, 8, 6, 6, '#4a416c'); E(8, 8, 4, 4, '#5b4d83'); E(8, 8, 2, 2, '#7560aa');
      R(7, 2, 2, 3, '#a58bd8'); R(7, 11, 2, 3, '#a58bd8');
      R(2, 7, 3, 2, '#a58bd8'); R(11, 7, 3, 2, '#a58bd8');
      break;
  }
}

function bakeTiles() {
  for (var k = 0; k < TILE_KINDS.length; k++) {
    /* mehrere Varianten, damit die Böden nicht sichtbar kacheln */
    for (var v = 0; v < 4; v++) {
      (function (kind, variant) {
        bake('tile_' + kind + '_' + variant, TILE, TILE, 0, 0, function () {
          tilePixels(kind, kind.length * 13.7 + variant * 41.3);
        });
      })(TILE_KINDS[k], v);
    }
    TILES[TILE_KINDS[k]] = TILE_KINDS[k];
  }
}

/* Zeichnet eine Kachelfläche mit variierenden Varianten */
function tileFill(kind, x0, y0, x1, y1) {
  for (var y = y0; y < y1; y += TILE) {
    for (var x = x0; x < x1; x += TILE) {
      var v = Math.floor(rnd(x * 0.37 + y * 1.71) * 4);
      sprite('tile_' + kind + '_' + v, x, y, 1, false);
    }
  }
}

/* Leitfarbe je Kachelart – für die Kantenverzahnung */
var TILE_COL = {
  gras: '#4a8531', gras_dunkel: '#3f7129', pfad: '#ac9463', kopfstein: '#6f6a5d',
  holzboden: '#6e5637', fels: '#4a4152', moor: '#4b5439', nachtgras: '#33452f',
  erde: '#6b5334', kies: '#7d786c', blumenwiese: '#4a8531', moorwasser: '#4b5439',
  laub: '#416c2d', dielen: '#4e3926', kristallfels: '#3b3347', runengras: '#2e3e2b',
  moospflaster: '#67685a', sumpfschlamm: '#4b4934', asche: '#39343c', sternengras: '#293b31',
  wurzelboden: '#51472f', ziegel: '#745044', magmastein: '#2d2930', mondpfad: '#555267',
  pilzmoos: '#38523a', schiefer: '#484d54', teppich: '#61344b', portalboden: '#34314a'
};

/* Eine echte Tilemap: Zeilen aus Zeichen, Legende ordnet Kachelnamen zu */
function drawTilemap(map, legend, x0, y0) {
  /* Böden ändern sich nie – einmal backen, danach nur blitten */
  if (!map.__id) map.__id = 'tm' + (++tilemapIds);
  cachedLayer(map.__id + '_' + x0 + '_' + y0, function () {
    var r, c, row, kind, v;
    for (r = 0; r < map.length; r++) {
      row = map[r];
      for (c = 0; c < row.length; c++) {
        kind = legend[row[c]];
        if (!kind) continue;
        v = Math.floor(rnd(c * 3.3 + r * 7.1) * 4);
        sprite('tile_' + kind + '_' + v, x0 + c * TILE, y0 + r * TILE, 1, false);
      }
    }
    tilemapEdges(map, legend, x0, y0);
  });
}
var tilemapIds = 0;

/* Verzahnt benachbarte Kachelarten, damit keine Rechtecke stehen bleiben */
function tilemapEdges(map, legend, x0, y0) {
  var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (var r = 0; r < map.length; r++) {
    for (var c = 0; c < map[r].length; c++) {
      var here = legend[map[r][c]];
      if (!here) continue;
      for (var d = 0; d < dirs.length; d++) {
        var nc = c + dirs[d][0], nr = r + dirs[d][1];
        if (nr < 0 || nr >= map.length || nc < 0 || nc >= map[r].length) continue;
        var there = legend[map[nr][nc]];
        if (!there || there === here) continue;
        var col = TILE_COL[there];
        if (!col) continue;
        var bx = x0 + c * TILE, by = y0 + r * TILE;
        /* Flecken der Nachbarart über die Grenze streuen */
        for (var i = 0; i < 9; i++) {
          var s = c * 17.3 + r * 5.9 + d * 3.1 + i * 1.7;
          var t = rnd(s), u = rnd(s + 0.5) * 0.42;
          var px, py;
          if (dirs[d][0] === 1) { px = bx + TILE - u * TILE; py = by + t * TILE; }
          else if (dirs[d][0] === -1) { px = bx + u * TILE - 2; py = by + t * TILE; }
          else if (dirs[d][1] === 1) { px = bx + t * TILE; py = by + TILE - u * TILE; }
          else { px = bx + t * TILE; py = by + u * TILE - 2; }
          var w = 1 + rnd(s + 2) * 1.8, h = 1 + rnd(s + 3) * 1.4;
          R(px, py, w, h, col);
        }
      }
    }
  }
}

/* ---------- Figuren & Icons backen ---------- */

function bakeCharacters() {
  var poses = (typeof SIMON_POSE_IDS !== 'undefined' && SIMON_POSE_IDS.length)
    ? SIMON_POSE_IDS : ['idle0', 'walk1', 'walk4'];
  for (var h = 0; h < 2; h++) {
    for (var b = 0; b < 2; b++) {
      for (var f = 0; f < poses.length; f++) {
        (function (hat, blink, pose) {
          bake('simonpose_' + hat + '_' + blink + '_' + pose, 30, 66, 15, 64, function (ox, oy) {
            if (_rawSimonPose) _rawSimonPose(ox, oy, 1, pose, 1, !!hat, !!blink);
            else _rawSimon(ox, oy, 1, pose === 'walk1' ? 1 : (pose === 'walk4' ? 3 : 0), 1, !!hat, !!blink);
          });
        })(h, b, poses[f]);
      }
    }
  }
  /* vier Phasen ergeben einen runden Bewegungszyklus (Periode t=160) */
  for (var p = 0; p < NPC_PHASES; p++) {
    (function (ph) {
      var t = ph * 40;
      bake('bruno_' + ph, 34, 48, 15, 46, function (ox, oy) { _rawBruno(ox, oy, t); });
      bake('mathilda_' + ph, 28, 56, 13, 54, function (ox, oy) { _rawMathilda(ox, oy, t); });
      bake('grombold_' + ph, 46, 56, 23, 54, function (ox, oy) { _rawTroll(ox, oy, t); });
      bake('grete_' + ph, 28, 46, 13, 44, function (ox, oy) { _rawGrete(ox, oy, t); });
      bake('elster_' + ph, 26, 18, 13, 9, function (ox, oy) { _rawElster(ox, oy, t, 1); });
    })(p);
  }
  for (var d = 0; d < NPC_PHASES; d++) {
    (function (ph) {
      bake('drache_' + ph, 120, 60, 62, 58, function (ox, oy) { _rawDrache(ox, oy, ph * 40, true); });
    })(d);
  }
}

/* Alle Deko-Objekte aus der PROPS-Tabelle backen */
function bakeProps() {
  for (var name in PROPS) {
    (function (n) {
      var p = PROPS[n];
      bake('prop_' + n, p.w, p.h, p.ox, p.oy, function (ox, oy) { p.draw(ox, oy); });
    })(name);
  }
}

/* Deko blitten – Ursprung unten mittig. Bodenobjekte bekommen einen
   sehr weichen Kontaktschatten; schwebende und hängende Sprites nicht. */
var FLOATING_PROPS = {
  vogel: 1, fledermaus: 1, schmetterling: 1, libelle: 1, motte: 1,
  lichtkugel: 1, seerose: 1, spinnennetz: 1, kraeuter: 1,
  banner: 1, kette: 1, ranken: 1
};
function prop(name, x, y, s, flip) {
  s = s || 1;
  var f = FRAMES['prop_' + name];
  if (f && !FLOATING_PROPS[name]) {
    E(x, y - .5 * s, Math.max(2.5, f.w * .24 * s), Math.max(.8, 1.5 * s), 'rgba(0,0,0,.11)');
  }
  sprite('prop_' + name, x, y, s, !!flip);
}

/* Sehr kleine Pendelbewegung für bereits vorhandene Fahnen.
   Die Amplitude bleibt absichtlich unter zwei Grad. */
function propSway(name, x, y, s, t, amount, flip) {
  s = s || 1;
  amount = amount || .02;
  var f = FRAMES['prop_' + name];
  if (f && !FLOATING_PROPS[name]) {
    E(x, y - .5 * s, Math.max(2.5, f.w * .24 * s), Math.max(.8, 1.5 * s), 'rgba(0,0,0,.11)');
  }
  g.save();
  g.translate(x, y);
  g.rotate(Math.sin(t) * amount);
  sprite('prop_' + name, 0, 0, s, !!flip);
  g.restore();
}

function bakeIcons() {
  var ids = Object.keys(ITEMS);
  for (var i = 0; i < ids.length; i++) {
    (function (id) {
      bake('item_' + id, 20, 20, 0, 0, function () { _rawIcon(id, 0, 0); });
    })(ids[i]);
  }
}

/* ---------- Hauptaufruf ---------- */

function bakeAtlas() {
  ATLAS = document.createElement('canvas');
  ATLAS.width = 1024 * RES; ATLAS.height = 768 * RES;
  AX = ATLAS.getContext('2d');
  AX.imageSmoothingEnabled = true;
  packX = 0; packY = 0; packRow = 0;

  /* Originalfunktionen sichern, bevor sie ersetzt werden */
  _rawSimon = drawSimon; _rawIcon = drawIcon;
  _rawSimonPose = (typeof drawSimonPose === 'function') ? drawSimonPose : null;
  _rawBruno = drawBruno; _rawMathilda = drawMathilda;
  _rawTroll = drawTroll; _rawElster = drawElster; _rawDrache = drawDrache;
  _rawGrete = drawGrete;

  bakeTiles();
  bakeCharacters();
  bakeProps();
  bakeIcons();

  /* ---- ab jetzt: Blits statt Neuzeichnen ---- */
  drawSimon = function (x, y, s, frame, face, hat, blink) {
    var pose = 'idle' + (Math.abs(frame || 0) % 3);
    if (frame >= 10 && frame <= 15) pose = 'walk' + (frame - 10);
    else if (frame === 30 || frame === 31) pose = 'talk' + (frame - 30);
    else if (frame === 40) pose = 'bueck';
    else if (frame === 1) pose = 'walk1';
    else if (frame === 3) pose = 'walk4';
    var nm = 'simonpose_' + (hat ? 1 : 0) + '_' + (blink ? 1 : 0) + '_' + pose;
    var sc = (typeof SCENES !== 'undefined' && SCENES[state.scene]) ? SCENES[state.scene] : null;
    if (sc && sc.light) tintedSprite(nm, x, y, s, face < 0, sc.light);
    else sprite(nm, x, y, s, face < 0);
  };
  drawIcon = function (id, x, y) { sprite('item_' + id, x, y, 1, false); };
  drawBruno = function (x, y, t) { sprite('bruno_' + (Math.floor(t / 40) % NPC_PHASES), x, y, 1, false); };
  drawMathilda = function (x, y, t) { sprite('mathilda_' + (Math.floor(t / 45) % NPC_PHASES), x, y, 1, false); };
  drawTroll = function (x, y, t) { sprite('grombold_' + (Math.floor(t / 55) % NPC_PHASES), x, y, 1, false); };
  drawElster = function (x, y, t) { sprite('elster_' + (Math.floor(t / 12) % NPC_PHASES), x, y, 1, false); };
  drawDrache = function (x, y, t, sleeping) { sprite('drache_' + (Math.floor(t / 40) % NPC_PHASES), x, y, 1, false); };
  drawGrete = function (x, y, t) { sprite('grete_' + (Math.floor(t / 70) % NPC_PHASES), x, y, 1, false); };

  atlasReady = true;
}

var _rawSimon, _rawSimonPose, _rawIcon, _rawBruno, _rawMathilda, _rawTroll, _rawElster, _rawDrache, _rawGrete;

/* ---------- Atlas als PNG exportieren ---------- */
function exportAtlas() {
  if (!ATLAS) return;
  var a = document.createElement('a');
  a.download = 'krummwald-atlas.png';
  a.href = ATLAS.toDataURL('image/png');
  a.click();
}

/* Nur die Kacheln als übersichtliches 4-Spalten-Tileset exportieren. */
function exportTileset() {
  if (!ATLAS) return;
  var out = document.createElement('canvas');
  out.width = TILE * 4;
  out.height = TILE * TILE_KINDS.length;
  var og = out.getContext('2d');
  og.imageSmoothingEnabled = false;
  for (var k = 0; k < TILE_KINDS.length; k++) {
    for (var v = 0; v < 4; v++) {
      var f = FRAMES['tile_' + TILE_KINDS[k] + '_' + v];
      if (f) og.drawImage(ATLAS, f.x, f.y, f.w, f.h, v * TILE, k * TILE, TILE, TILE);
    }
  }
  var a = document.createElement('a');
  a.download = 'krummwald-tileset.png';
  a.href = out.toDataURL('image/png');
  a.click();
}
