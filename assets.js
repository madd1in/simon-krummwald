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
                  'moospflaster', 'sumpfschlamm', 'asche', 'sternengras'];
var atlasReady = false;

/* ---------- kleiner Zeilen-Packer ---------- */
var packX = 0, packY = 0, packRow = 0;
function packAlloc(w, h) {
  if (packX + w > ATLAS.width) { packX = 0; packY += packRow + 1; packRow = 0; }
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
  AX.translate(cell.x, cell.y);
  fn(ox, oy);
  AX.restore();
  g = save;
  FRAMES[name] = { x: cell.x, y: cell.y, w: w, h: h, ox: ox, oy: oy };
}

/* ---------- Blit ---------- */

function sprite(name, x, y, s, flip) {
  var f = FRAMES[name];
  if (!f) return;
  s = s || 1;
  g.save();
  g.translate(x, y);
  if (s !== 1 || flip) g.scale(flip ? -s : s, s);
  g.drawImage(ATLAS, f.x, f.y, f.w, f.h, -f.ox, -f.oy, f.w, f.h);
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
  moospflaster: '#67685a', sumpfschlamm: '#4b4934', asche: '#39343c', sternengras: '#293b31'
};

/* Eine echte Tilemap: Zeilen aus Zeichen, Legende ordnet Kachelnamen zu */
function drawTilemap(map, legend, x0, y0) {
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
}

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
  for (var p = 0; p < 3; p++) {
    (function (ph) {
      var t = ph * 40;
      bake('bruno_' + ph, 30, 48, 15, 46, function (ox, oy) { _rawBruno(ox, oy, t); });
      bake('mathilda_' + ph, 26, 56, 13, 54, function (ox, oy) { _rawMathilda(ox, oy, t); });
      bake('grombold_' + ph, 46, 56, 23, 54, function (ox, oy) { _rawTroll(ox, oy, t); });
      bake('grete_' + ph, 26, 46, 13, 44, function (ox, oy) { _rawGrete(ox, oy, t); });
      bake('elster_' + ph, 26, 18, 13, 9, function (ox, oy) { _rawElster(ox, oy, t, 1); });
    })(p);
  }
  for (var d = 0; d < 2; d++) {
    (function (ph) {
      bake('drache_' + ph, 120, 60, 62, 58, function (ox, oy) { _rawDrache(ox, oy, ph * 52, true); });
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

/* Deko blitten – Ursprung unten mittig */
function prop(name, x, y, s, flip) { sprite('prop_' + name, x, y, s || 1, !!flip); }

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
  ATLAS.width = 1024; ATLAS.height = 768;
  AX = ATLAS.getContext('2d');
  AX.imageSmoothingEnabled = false;
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
    else if (frame === 1) pose = 'walk1';
    else if (frame === 3) pose = 'walk4';
    sprite('simonpose_' + (hat ? 1 : 0) + '_' + (blink ? 1 : 0) + '_' + pose, x, y, s, face < 0);
  };
  drawIcon = function (id, x, y) { sprite('item_' + id, x, y, 1, false); };
  drawBruno = function (x, y, t) { sprite('bruno_' + (Math.floor(t / 40) % 3), x, y, 1, false); };
  drawMathilda = function (x, y, t) { sprite('mathilda_' + (Math.floor(t / 45) % 3), x, y, 1, false); };
  drawTroll = function (x, y, t) { sprite('grombold_' + (Math.floor(t / 55) % 3), x, y, 1, false); };
  drawElster = function (x, y, t) { sprite('elster_' + (Math.floor(t / 12) % 3), x, y, 1, false); };
  drawDrache = function (x, y, t, sleeping) { sprite('drache_' + (Math.floor(t / 60) % 2), x, y, 1, false); };
  drawGrete = function (x, y, t) { sprite('grete_' + (Math.floor(t / 70) % 3), x, y, 1, false); };

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
