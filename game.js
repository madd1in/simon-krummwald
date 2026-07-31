/* ============================================================
   game.js – Inhalt: Gegenstände, Schauplätze, Rätsel, Dialoge
   "Simon der Zauberer – Der Fluch von Krummwald"
   ============================================================ */

var SPEAKERS = {
  simon:     { name: 'Simon',    color: '#8ce8ff' },
  narrator:  { name: '',         color: '#f2e9d0' },
  elster:    { name: 'Elster',   color: '#e8e8f4' },
  bruno:     { name: 'Bruno',    color: '#ff9c7a' },
  mathilda:  { name: 'Mathilda', color: '#d0a8ff' },
  grombold:  { name: 'Grombold', color: '#a8d86a' },
  grete:     { name: 'Grete',    color: '#e0d8ff' },
  drache:    { name: 'Drache',   color: '#ff7a86' }
};

/* ---------------- Gegenstände ---------------- */

var ITEMS = {
  stock:       { name: 'Stock', desc: 'Ein krummer Ast. In jedem anständigen Abenteuer wird daraus früher oder später etwas Brennendes.' },
  lumpen:      { name: 'Lumpen', desc: 'Ein öliger Stofffetzen. Riecht nach Zauberer, der nie putzt.' },
  feuerstein:  { name: 'Feuerstein', desc: 'Zwei Steine, die Funken schlagen. Die Streichholz-Lobby war noch nicht erfunden.' },
  fackel:      { name: 'Fackel', desc: 'Ein Stock mit Lumpen drumherum. Fehlt nur noch das entscheidende Detail: Feuer.' },
  fackel_an:   { name: 'brennende Fackel', desc: 'Sie brennt! Ich versuche, nicht daran zu denken, wie lange noch.' },
  zahnrad:     { name: 'Zahnrad', desc: 'Ein messingfarbenes Zahnrad. Ziemlich sicher aus etwas ausgebaut, das es gebraucht hätte.' },
  eimer:       { name: 'Eimer', desc: 'Ein Holzeimer. Leer, aber voller Möglichkeiten.' },
  eimer_voll:  { name: 'Eimer mit Sumpfwasser', desc: 'Trübes grünes Wasser. Etwas darin bewegt sich. Ich frage lieber nicht.' },
  pilz:        { name: 'Fliegenpilz', desc: 'Rot mit weißen Punkten. Die Natur schreibt "NICHT ESSEN" selten so deutlich.' },
  schlafpulver:{ name: 'Schlaftrank', desc: 'Ein Fläschchen mit schimmerndem Pulver. Laut Buch legt das einen Ochsen um. Oder Größeres.' },
  buch:        { name: 'Zauberbuch', desc: 'Das Rezeptbuch des alten Zauberers. Zwischen den Sprüchen stehen erstaunlich viele Kochtipps.' },
  bierkrug:    { name: 'Bierkrug', desc: 'Ein schwerer Zinnkrug mit Brunos Initialen. Und einem Zahnabdruck von etwas sehr Großem.' },
  muenzen:     { name: 'Kupfermünzen', desc: 'Fünf Kupfermünzen. Mein gesamtes Vermögen in diesem Universum.' },
  knopf:       { name: 'glänzender Knopf', desc: 'Er glitzert absolut unverhältnismäßig für einen Knopf.' },
  kaesebrot:   { name: 'Käsebrot', desc: 'Käse auf Brot. Bruno nennt das "Spezialität des Hauses".' },
  kristall:    { name: 'Kristall', desc: 'Ein violetter Kristall, warm wie eine Teetasse und ungefähr so magisch wie alles hier zusammen.' },
  hut:         { name: 'Zaubererhut', desc: 'Mein Hut!' }
};

ITEMS.buch.use = async function () {
  await say('simon', 'Mal sehen, was der alte Knabe so aufgeschrieben hat...');
  await say('narrator', '"Rezept: Schlaftrank für sehr große Wesen. Man nehme Sumpfwasser, werfe einen Fliegenpilz hinein und gebe zuletzt ein Stück Käse dazu — in genau dieser Reihenfolge."');
  await say('narrator', '"Randnotiz: Der Troll an der Brücke stellt immer dasselbe Rätsel. Die Antwort ist ein HEMD. Er hat es selbst vergessen."');
  await say('simon', 'Ein Kochbuch mit Trollspickzettel. Der Mann war ein Genie.');
  state.flags.buchGelesen = true;
};

ITEMS.kaesebrot.use = async function () {
  if (state.flags.kesselKaese) { await say('simon', 'Aufgegessen. Und ja, es war jeden Bissen wert.'); return; }
  await say('simon', 'Ich hätte großen Appetit — aber irgendwas sagt mir, dieser Käse hat noch eine höhere Bestimmung.');
};

ITEMS.fackel.use = async function () {
  await say('simon', 'Eine unangezündete Fackel ist im Grunde nur ein sehr aufwendiger Stock.');
};

ITEMS.muenzen.use = async function () {
  await say('simon', 'Geld benutzt man am besten bei Leuten, die etwas verkaufen.');
};

/* Klick auf Simon selbst – kleiner Klassiker */
var SIMON_HS = {
  id: 'simon_self', name: 'Simon', rect: [-1, -1, 0, 0], def: 'schau',
  look: function () {
    if (state.flags.hut) return say('simon', 'Gut aussehender junger Zauberer mit Hut. Der Hut macht wirklich viel aus.');
    return say('simon', 'Ein Zauberer ohne Hut. Von hinten sehe ich aus wie jemand, der sich verlaufen hat. Von vorne auch.');
  },
  talk: function () { return say('simon', 'Ich rede mit mir selbst. In dieser Welt ist das vermutlich die beste Gesellschaft.'); },
  use: function () { return say('simon', 'Ich benutze mich selbst. Steht wahrscheinlich nichts Gutes darüber im Handbuch.'); }
};

/* ---------------- Kombinieren ---------------- */

async function combine(a, b) {
  var k = [a, b].sort().join('+');
  if (k === 'lumpen+stock') {
    del('stock'); del('lumpen'); add('fackel');
    state.flags.lumpenWeg = true;
    await say('simon', 'Lumpen um den Stock gewickelt. Wenn das keine Fackel ist, dann ist es zumindest fast eine.');
    return;
  }
  if (k === 'fackel+feuerstein') {
    del('fackel'); add('fackel_an'); sfx('fire');
    await say('simon', 'Funke, Rauch, Flamme — und alle zehn Finger noch dran. Ein guter Tag.');
    return;
  }
  if (k === 'feuerstein+stock') { await say('simon', 'Ich könnte den Stock anzünden. Er würde einfach nur verbrennen. Ich brauche etwas Saugfähiges drumherum.'); return; }
  if (k === 'eimer_voll+pilz') { await say('simon', 'Das muss in den Kessel, nicht in den Eimer. Ich bin Zauberer, kein Salatbar-Betreiber.'); return; }
  await say('simon', 'Nein. Das eine hat mit dem anderen nichts zu tun.');
}

/* ---------------- Kleine Helfer ---------------- */

function lit() { return has('fackel_an'); }

function dark(fn) {
  return async function (x) {
    if (!lit()) {
      await say('simon', 'Stockdunkel. Ich sehe die Hand vor Augen nicht — und das ist noch die gute Nachricht.');
      return;
    }
    return fn(x);
  };
}

/* ============================================================
   SCHAUPLÄTZE
   ============================================================ */

var SCENES = {};

/* ------------------------- LICHTUNG ------------------------- */
SCENES.lichtung = {
  name: 'Lichtung',
  walk: { x1: 10, x2: 310, y1: 106, y2: 136 },
  scaleMin: .62, scaleMax: 1,
  start: { x: 170, y: 124 },
  speakers: { elster: { x: 72, y: 12 } },
  draw: bgLichtung, fx: 'leaves',
  front: function (t) { frontFoliage(t, '#1b3a19', '#24491f'); },
  hotspots: [
    {
      id: 'himmel', name: 'Himmel', rect: [0, 0, 320, 56], go: [160, 150],
      look: function () { return say('simon', 'Blauer Himmel, weiße Wolken. Wenigstens hat diese Welt das Wichtigste richtig gemacht.'); }
    },
    {
      id: 'eiche', name: 'Eiche', rect: [28, 34, 50, 74], go: [86, 112],
      look: function () { return say('simon', 'Eine uralte Eiche. Knorrig, mächtig — und ganz oben trägt sie meinen Hut spazieren.'); },
      use: function () { return say('simon', 'Klettern? Mit meiner Kondition? Der Baum würde vor Lachen die Rinde verlieren.'); }
    },
    {
      id: 'nest', name: 'Nest', rect: [30, 12, 36, 22], go: [80, 110],
      look: function () {
        if (state.flags.hut) return say('simon', 'Ein leeres Nest. Die Elster hat jetzt einen Knopf und ich meinen Hut. Nennt man wohl eine Win-win-Situation.');
        return say('simon', 'Da oben klebt ein Nest. Und darin, zwischen Zweigen und gestohlenem Kleinkram: MEIN HUT.');
      },
      take: function () { return say('simon', 'Das Nest hängt sechs Meter über mir. Ich müsste die Elster überreden, herunterzukommen.'); }
    },
    {
      id: 'elster', name: 'Elster', rect: [56, 2, 30, 24], go: [84, 110],
      when: function () { return !state.flags.hut; },
      look: function () { return say('simon', 'Eine Elster. Schwarz, weiß, und mit dem moralischen Kompass eines Steuerberaters.'); },
      talk: talkElster,
      give: giveElster,
      use: function (item) { if (item) return giveElster(item); return say('simon', 'Ich könnte sie ansprechen. Elstern hören angeblich gern zu.'); },
      take: function () { return say('simon', 'Ich fange keine Vögel. Vögel fangen im Zweifel mich.'); }
    },
    {
      id: 'stock', name: 'Stock', rect: [140, 120, 30, 14], go: [156, 132],
      when: function () { return !state.flags.stockWeg; },
      look: function () { return say('simon', 'Ein krummer Ast. Der schreit förmlich danach, in ein Inventar zu wandern.'); },
      take: async function () {
        add('stock'); state.flags.stockWeg = true;
        await say('simon', 'Ein Stock. Der erste Gegenstand des Abenteuers. Ab hier wird alles besser.');
      }
    },
    {
      id: 'schild', name: 'Wegweiser', rect: [220, 84, 48, 40], go: [212, 122],
      look: async function () {
        await say('narrator', 'Oberes Schild: "KRUMMWALD — Dorf. Bier. Missgunst." Unteres Schild: "NEBELSUMPF — Bitte nicht."');
        await say('simon', 'Sehr einladend. Wie ein Reisebüro für Pessimisten.');
      }
    },
    {
      id: 'weg_dorf', name: 'Weg nach Krummwald', exitTo: 'Krummwald', rect: [294, 94, 26, 48], go: [300, 118],
      look: function () { return say('simon', 'Der Weg führt nach Osten zum Dorf. Ich höre von hier aus jemanden schimpfen.'); },
      exit: function () { return goScene('dorf', 26, 120, 1); }
    },
    {
      id: 'weg_sumpf', name: 'Pfad in den Sumpf', exitTo: 'Nebelsumpf', rect: [0, 104, 28, 38], go: [16, 126],
      look: function () { return say('simon', 'Ein matschiger Pfad. Der Nebel dahinter sieht aus, als hätte er Meinungen.'); },
      exit: function () { return goScene('sumpf', 166, 110, -1); }
    },
    {
      id: 'pfad_norden', name: 'Pfad zum Steinkreis', exitTo: 'Steinkreis', exitDir: 'up', rect: [134, 90, 54, 18], go: [160, 110],
      look: function () { return say('simon', 'Ein heller Pfad führt nach Norden zu den alten Steinen. Da kribbelt die Luft.'); },
      exit: function () { return goScene('steinkreis', 160, 134, 1); }
    }
  ]
};

async function talkElster() {
  await say('simon', 'Hey! Du da oben! Das ist mein Hut!');
  await say('elster', 'Schäck-schäck-schäck!');
  await say('simon', 'Das heißt auf Elstrisch vermutlich "Fundsache".');
  if (!state.flags.hut) {
    await say('simon', 'Sie starrt auf meine Gürtelschnalle. Diese Vogeldame hat eine Schwäche für Glitzer.');
  }
}

async function giveElster(item) {
  if (item === 'knopf') {
    del('knopf');
    state.flags.hut = true;
    await say('simon', 'Schau mal, was ich hier habe. Glänzend. Rund. Absolut unwiderstehlich.');
    sfx('bird');
    await say('elster', 'Schäck!');
    await say('narrator', 'Die Elster stürzt herab wie ein gefiederter Blitz, schnappt sich den Knopf — und lässt dabei einen spitzen violetten Hut fallen.');
    await say('simon', 'MEIN HUT! Endlich sehe ich wieder aus wie jemand, der weiß, was er tut.');
    return;
  }
  if (item === 'muenzen') { await say('simon', 'Kupfer glänzt ihr nicht genug. Diese Elster hat Geschmack.'); return; }
  await say('simon', 'Damit lockt man keine Elster. Die will etwas Glänzendes.');
}

/* --------------------------- DORF --------------------------- */
SCENES.dorf = {
  name: 'Krummwald',
  walk: { x1: 12, x2: 308, y1: 108, y2: 138 },
  scaleMin: .6, scaleMax: .98,
  start: { x: 40, y: 122 },
  speakers: { mathilda: { x: 232, y: 50 } },
  draw: bgDorf,
  front: function (t) {
    P([0, 200, 0, 176, 26, 184, 34, 200], '#2a241c');
    P([320, 200, 320, 172, 292, 182, 286, 200], '#2a241c');
  },
  hotspots: [
    {
      id: 'wirtshaus', name: 'Wirtshaus', rect: [4, 10, 116, 52], go: [56, 120],
      look: function () { return say('simon', 'Das Wirtshaus "Zum Krummen Krug". Aus dem Inneren riecht es nach Bier, Kohl und alten Streitigkeiten.'); }
    },
    {
      id: 'wirtshaustuer', name: 'Wirtshaustür', exitTo: 'Wirtshaus', exitDir: 'up', rect: [42, 60, 28, 44], go: [58, 122],
      look: function () { return say('simon', 'Die Tür steht offen. Drinnen flackert Feuerschein, und jemand schrubbt lustlos einen Tresen.'); },
      exit: function () { return goScene('wirtshaus', 30, 150, 1); }
    },
    {
      id: 'schild_wirt', name: 'Wirtshausschild', rect: [102, 38, 30, 22], go: [96, 116],
      look: function () { return say('narrator', 'Ein bemalter Krug auf verwittertem Holz. Darunter steht: "Heute wie gestern."'); }
    },
    {
      id: 'brunnen', name: 'Brunnen', rect: [120, 84, 58, 58], go: [112, 134], face: 1, def: 'schau',
      look: async function () {
        await say('simon', 'Ein alter Steinbrunnen. In den Rand hat jemand etwas eingeritzt...');
        await say('narrator', '"Wer eintreten will, spreche: KRIBBELKRABBEL." Darunter, in anderer Handschrift: "Ja, ich weiß. Ich war jung."');
        if (!state.flags.zauberwort) {
          state.flags.zauberwort = true;
          await say('simon', 'KRIBBELKRABBEL. Das merke ich mir. Nicht, weil es gut ist, sondern weil es schlimm ist.');
        }
      },
      use: async function (item) {
        if (item === 'zahnrad') {
          if (state.flags.brunnenRep) { await say('simon', 'Die Kurbel läuft schon wieder rund.'); return; }
          del('zahnrad'); state.flags.brunnenRep = true;
          await say('simon', 'Das Zahnrad passt genau. Aus einer Uhr in eine Brunnenkurbel — Recycling im Mittelalter.');
          return;
        }
        if (item) return false;
        if (!state.flags.brunnenRep) {
          await say('simon', 'Ich drehe an der Kurbel. Nichts passiert. Da fehlt ein Zahnrad — sehr auffällig sogar.');
          return;
        }
        if (!state.flags.eimerWeg) {
          await say('simon', 'Ich kurbele. Der Eimer kommt hoch. Ein voller Erfolg — abgesehen davon, dass er leer ist.');
          add('eimer'); state.flags.eimerWeg = true;
          await say('simon', 'Egal. Einen Eimer kann man immer brauchen.');
          return;
        }
        await say('simon', 'Der Eimer ist schon in meiner Tasche. Nochmal kurbeln wäre albern.');
      }
    },
    {
      id: 'eimer', name: 'Eimer', rect: [140, 104, 18, 14], go: [116, 134],
      when: function () { return !state.flags.eimerWeg; },
      look: function () { return say('simon', 'Ein Holzeimer an einem Seil. Er hängt tief unten im Schacht.'); },
      take: async function () {
        if (!state.flags.brunnenRep) { await say('simon', 'Der Eimer hängt viel zu tief. Ich müsste ihn hochkurbeln — wenn die Kurbel nicht kaputt wäre.'); return; }
        add('eimer'); state.flags.eimerWeg = true;
        await say('simon', 'Eimer erobert. Was für ein Abenteuer.');
      }
    },
    {
      id: 'stand', name: 'Marktstand', rect: [188, 52, 108, 50], go: [220, 122],
      look: function () { return say('simon', 'Ein Stand voller Dinge, die andere Leute weggeworfen haben. Hier nennt man das Sortiment.'); }
    },
    {
      id: 'knopf', name: 'glänzender Knopf', rect: [268, 74, 18, 14], go: [252, 122],
      when: function () { return !state.flags.knopfWeg; },
      look: function () { return say('simon', 'Ein silberner Knopf, der viel zu stark funkelt. Genau das Richtige für einen Vogel mit Hang zum Materialismus.'); },
      take: async function () {
        await say('simon', 'Ich nehme mal unauffällig den Knopf...');
        await say('mathilda', 'FINGER WEG! Fünf Kupfermünzen, oder du fasst gar nichts an!');
        await say('simon', 'Sie hat Augen wie ein Falke. Ein Falke mit Buchhaltung.');
      }
    },
    {
      id: 'mathilda', name: 'Mathilda', rect: [218, 48, 30, 46], go: [238, 122], face: 1,
      look: function () { return say('simon', 'Mathilda die Trödlerin. Sie verkauft Krempel zu Preisen, die sie selbst kaum ernst nehmen kann.'); },
      talk: talkMathilda,
      give: giveMathilda,
      use: function (item) { if (item) return giveMathilda(item); return say('simon', 'Reden wäre höflicher.'); }
    },
    {
      id: 'faesser', name: 'Fässer', rect: [108, 102, 22, 28], go: [104, 132],
      look: function () { return say('simon', 'Bierfässer. Leer. Man erkennt es am hoffnungslosen Klang, wenn man dagegen klopft.'); }
    },
    {
      id: 'weg_lichtung', name: 'Weg zur Lichtung', exitTo: 'Lichtung', rect: [0, 94, 22, 48], go: [16, 120],
      look: function () { return say('simon', 'Zurück in den Wald zur Lichtung.'); },
      exit: function () { return goScene('lichtung', 296, 118, -1); }
    }
  ]
};

async function talkBruno() {
  await say('bruno', 'Wir haben zu. Und wenn wir auf hätten, hätten wir für dich zu.');
  while (true) {
    var opts = ['Wer bist du denn?', 'Warum bist du so schlecht gelaunt?'];
    if (has('bierkrug')) opts.push('Ich habe deinen Bierkrug!');
    opts.push('Schon gut, ich gehe wieder.');
    var i = await choose(opts);
    if (opts[i] === 'Wer bist du denn?') {
      await say('bruno', 'Bruno. Wirt. Seit dreißig Jahren. Ich schenke aus, ich putze, ich schweige.');
      await say('simon', 'Beim letzten Punkt haben wir noch Luft nach oben.');
    } else if (opts[i] === 'Warum bist du so schlecht gelaunt?') {
      await say('bruno', 'Der Troll am Sumpf hat meinen Zinnkrug geklaut. Mein Glückskrug! Ohne den schmeckt mein Bier nach Regenwasser.');
      await say('bruno', 'Wer mir den Krug zurückbringt, kriegt Lohn. Und zwar anständigen.');
      await say('simon', 'Ein Troll. Natürlich ein Troll. Es ist nie ein netter alter Mann mit einem Krug.');
      state.flags.brunoQuest = true;
    } else if (opts[i] === 'Ich habe deinen Bierkrug!') {
      await giveBruno('bierkrug');
      return;
    } else {
      await say('bruno', 'Tu das.');
      return;
    }
  }
}

async function giveBruno(item) {
  if (item === 'bierkrug') {
    del('bierkrug');
    state.flags.krugAbgegeben = true;
    await say('narrator', 'Simon stellt den verbeulten Zinnkrug auf die Fensterbank. Brunos Gesicht macht etwas Ungewohntes: es lächelt.');
    await say('bruno', 'Mein Krug! Mit Trollzahnabdruck und allem! Junge, du kriegst deinen Lohn.');
    add('muenzen'); add('kaesebrot'); sfx('coins');
    await say('bruno', 'Fünf Kupfermünzen. Und ein Käsebrot, Spezialität des Hauses.');
    await say('simon', 'Ein Käsebrot. Meine Rettung des Dorfes war es wert.');
    return;
  }
  if (item === 'kaesebrot') { await say('bruno', 'Das war meins. Behalt es.'); return; }
  await say('bruno', 'Was soll ich damit? Ich bin Wirt, kein Museum.');
}

async function talkMathilda() {
  await say('mathilda', 'Anschauen kostet nichts. Anfassen schon.');
  while (true) {
    var opts = ['Was kostet der glänzende Knopf?', 'Was weißt du über die Hütte im Sumpf?', 'Erzähl mir vom Troll.', 'Danke, das reicht.'];
    if (state.flags.knopfWeg) opts[0] = 'Hast du noch mehr Glänzendes?';
    var i = await choose(opts);
    if (i === 0) {
      if (state.flags.knopfWeg) { await say('mathilda', 'Der letzte Knopf ist weg. Frag den Vogel.'); continue; }
      await say('mathilda', 'Fünf Kupfermünzen. Kein Handeln, kein Rabatt, keine Diskussion.');
      if (has('muenzen')) {
        var j = await choose(['Hier sind fünf Münzen.', 'Zu teuer. Vielleicht später.']);
        if (j === 0) { await giveMathilda('muenzen'); return; }
        await say('mathilda', 'Dachte ich mir.');
      } else {
        await say('simon', 'Fünf Münzen. Ich habe zurzeit exakt null Münzen. Das ist mathematisch ungünstig.');
      }
    } else if (i === 1) {
      await say('mathilda', 'Die Hütte gehörte dem alten Zauberer. Der ist eines Tages einfach verschwunden — puff.');
      await say('mathilda', 'Die Tür geht nur mit seinem Zauberwort auf. Er hat es überall hingekritzelt, der alte Angeber. Sogar an den Brunnen.');
      await say('simon', 'Ein Zauberer, der sein Passwort an öffentliche Bauwerke schreibt. Kollege, wirklich.');
    } else if (i === 2) {
      await say('mathilda', 'Grombold? Sitzt seit Jahren auf der Brücke und stellt jedem dasselbe Rätsel.');
      await say('mathilda', 'Das Dumme ist: Er hat die Lösung selbst vergessen. Steht angeblich im Buch des Zauberers.');
    } else {
      await say('mathilda', 'Und nichts anfassen.');
      return;
    }
  }
}

async function giveMathilda(item) {
  if (item === 'muenzen') {
    if (state.flags.knopfWeg) { await say('mathilda', 'Der Knopf ist weg. Behalt dein Geld.'); return; }
    del('muenzen'); add('knopf'); state.flags.knopfWeg = true; sfx('coins');
    await say('narrator', 'Mathilda lässt die Münzen in einer Schürzentasche verschwinden, so schnell, dass Simon kurz an Zauberei denkt.');
    await say('mathilda', 'Ein Knopf. Viel Vergnügen damit.');
    await say('simon', 'Fünf Münzen für einen Knopf. Aber er glänzt wie ein kleiner Skandal.');
    return;
  }
  if (item === 'kaesebrot') { await say('mathilda', 'Ich esse nichts, was ich nicht selbst verkauft habe.'); return; }
  await say('mathilda', 'Das kaufe ich nicht an. Ich bin wählerisch, nicht verzweifelt.');
}

/* --------------------- WIRTSHAUS (innen) --------------------- */
SCENES.wirtshaus = {
  name: 'Zum Krummen Krug',
  walk: { x1: 14, x2: 300, y1: 128, y2: 152 },
  scaleMin: .78, scaleMax: 1.05,
  start: { x: 30, y: 150 },
  speakers: { bruno: { x: 60, y: 74 }, grete: { x: 196, y: 128 } },
  draw: bgWirtshaus, fx: 'dust',
  tint: 'rgba(255,170,80,.07)',
  front: function (t) {
    /* angeschnittener Tisch im Vordergrund */
    R(0, 176, 78, 6, '#6b4f2a'); R(0, 176, 78, 1, '#8a6a3a');
    R(14, 182, 5, 18, '#5c4525'); R(62, 182, 5, 18, '#5c4525');
    prop('krug', 40, 176, 1.3);
    /* dunkler Deckenbalken */
    R(0, 0, VW, 6, 'rgba(20,14,8,.75)');
    P([0, 200, 0, 188, 24, 196, 30, 200], '#241a10');
    P([320, 200, 320, 186, 292, 194, 286, 200], '#241a10');
  },
  onEnter: async function () {
    if (!state.flags.wirtshausGesehen) {
      state.flags.wirtshausGesehen = true;
      await say('narrator', 'Drinnen ist es warm, dunkel und riecht nach Jahrzehnten. Im Kamin knackt ein Feuer, hinter dem Tresen poliert Bruno einen Krug, der schon sauber ist.');
      await say('simon', 'Endlich ein Ort mit Dach. Und mit Bier, das ich mir nicht leisten kann.');
    }
  },
  hotspots: [
    {
      id: 'wand', name: 'Wandbild', rect: [192, 26, 38, 32], go: [206, 132],
      look: function () { return say('simon', 'Ein gemalter Hügel mit einem gemalten Baum. Beide sehen aus, als hätten sie den Maler enttäuscht.'); }
    },
    {
      id: 'fenster', name: 'Fenster', rect: [134, 18, 46, 42], go: [156, 132],
      look: function () { return say('simon', 'Von hier sieht man den Marktplatz. Mathilda bewacht ihren Krempel wie ein Drache sein Gold. Nur mit mehr Ausdauer.'); }
    },
    {
      id: 'regal', name: 'Krugregal', rect: [4, 42, 100, 34], go: [56, 132],
      look: function () { return say('simon', 'Dreizehn Krüge, alle poliert. Einer fehlt — man sieht den Staubrand.'); },
      take: function () { return say('simon', 'Brunos Krüge fasse ich nicht an. Ich habe meine Hände noch gern.'); }
    },
    {
      id: 'tresen', name: 'Tresen', rect: [6, 116, 108, 32], go: [70, 136], face: -1,
      look: function () { return say('simon', 'Ein Tresen aus massivem Holz, blank gescheuert von Ellbogen, die hier älter wurden.'); },
      use: function (item) {
        if (item) return false;
        return say('simon', 'Ich klopfe auf den Tresen wie ein Mann von Welt. Es passiert nichts. Ich bin kein Mann von Welt.');
      }
    },
    {
      id: 'kamin', name: 'Kamin', rect: [248, 106, 44, 46], go: [240, 146], face: 1,
      look: function () { return say('simon', 'Ein ordentliches Feuer. Das erste wirklich Gemütliche, das mir in dieser Welt begegnet ist.'); },
      use: async function (item) {
        if (item === 'fackel') {
          del('fackel'); add('fackel_an'); sfx('fire');
          await say('simon', 'Ich halte die Fackel ins Feuer. Sie fängt sofort. Manchmal ist die einfachste Lösung die richtige.');
          return;
        }
        if (item === 'fackel_an') { await say('simon', 'Sie brennt bereits. Noch mehr Feuer wäre gierig.'); return; }
        if (item) return false;
        await say('simon', 'Ich wärme mir die Hände. Für einen Moment ist alles in Ordnung.');
      }
    },
    {
      id: 'tische', name: 'Tische', rect: [110, 146, 100, 34], go: [150, 150],
      look: function () { return say('simon', 'Schwere Holztische mit eingeritzten Initialen. "B. + M." steht da. Jemand hat es später wütend durchgestrichen.'); }
    },
    {
      id: 'grete', name: 'Grete', rect: [180, 122, 34, 40], go: [176, 150], face: 1,
      look: function () { return say('simon', 'Eine sehr alte Frau mit einem sehr leeren Krug. Sie sieht aus, als hätte sie hier schon gesessen, bevor das Haus gebaut wurde.'); },
      talk: talkGrete,
      give: function (item) {
        if (item === 'bierkrug') { return say('grete', 'Behalt ihn, Junge. Der gehört Bruno, und Bruno merkt sowas.'); }
        return say('grete', 'Ich nehme nichts an. In meinem Alter sammelt man nur noch Erinnerungen und Zipperlein.');
      }
    },
    {
      id: 'bruno', name: 'Wirt Bruno', rect: [44, 74, 32, 46], go: [66, 134], face: -1,
      look: function () { return say('simon', 'Bruno, der Wirt. Gebaut wie ein Fass und ungefähr genauso gesprächig — außer beim Thema Bier.'); },
      talk: talkBruno,
      give: giveBruno,
      use: function (item) { if (item) return giveBruno(item); return say('simon', 'Ich sollte mit ihm reden statt an ihm herumzufummeln.'); }
    },
    {
      id: 'tuer', name: 'Tür nach draußen', exitTo: 'Krummwald', rect: [0, 90, 26, 60], go: [22, 140],
      look: function () { return say('simon', 'Zurück auf den Marktplatz.'); },
      exit: function () { return goScene('dorf', 70, 128, 1); }
    }
  ]
};

async function talkGrete() {
  await say('grete', 'Setz dich nicht auf den Stuhl da. Da sitzt seit vierzig Jahren keiner mehr.');
  while (true) {
    var opts = ['Wer bist du?', 'Was weißt du über den Steinkreis?', 'Erzähl mir vom alten Zauberer.'];
    if (state.flags.hut) opts.push('Wie gefällt dir mein Hut?');
    opts.push('Ich muss weiter.');
    var i = await choose(opts);
    var pick = opts[i];
    if (pick === 'Wer bist du?') {
      await say('grete', 'Grete. Ich sitze hier. Das ist mein Beruf und mein Hobby.');
      await say('grete', 'Früher war ich Hebamme. Die halbe Straße da draußen hab ich auf die Welt geholt. Danken tut mir keiner.');
      await say('simon', 'Ich danke Ihnen. Vorsorglich, falls Sie irgendwann auch mich rausholen müssen.');
    } else if (pick === 'Was weißt du über den Steinkreis?') {
      await say('grete', 'Die Steine da oben sind älter als alles. Bei Vollmond summen sie. Meine Mutter sagte, sie warten auf etwas.');
      await say('grete', 'Und einmal, da war ich ein Kind, ist einer hindurchgegangen. Ein Fremder mit einem spitzen Hut.');
      await say('simon', 'Ein Fremder mit spitzem Hut. Das kommt mir bekannt vor.');
      await say('grete', 'Er kam nie zurück. Oder er kam zurück und niemand hat ihn erkannt. Bei Zauberern weiß man das nie.');
      state.flags.greteSteinkreis = true;
    } else if (pick === 'Erzähl mir vom alten Zauberer.') {
      await say('grete', 'Der aus dem Sumpf? Netter Kerl. Hat mir mal eine Warze weggezaubert und dafür drei Wochen lang Frösche geregnet.');
      await say('grete', 'Er hat sich alles aufgeschrieben. Alles. Sogar seine Einkaufszettel waren Zaubersprüche.');
      await say('simon', 'Das erklärt das Buch. Und den Brunnen. Und vermutlich noch einiges, was ich noch nicht gefunden habe.');
    } else if (pick === 'Wie gefällt dir mein Hut?') {
      await say('grete', 'Genau so einer war das damals. Genau so einer.');
      await say('grete', 'Geh nach Hause, Junge. Solange du noch weißt, wo das ist.');
      await say('simon', 'Genau das habe ich vor.');
    } else {
      await say('grete', 'Ja, ja. Geht ihr alle.');
      return;
    }
  }
}

/* -------------------------- SUMPF -------------------------- */
SCENES.sumpf = {
  name: 'Nebelsumpf',
  walk: { x1: 12, x2: 300, y1: 108, y2: 138 },
  scaleMin: .6, scaleMax: .98,
  start: { x: 166, y: 112 },
  speakers: { grombold: { x: 266, y: 52 } },
  draw: bgSumpf, fx: 'fog',
  front: function (t) { frontReeds(t); },
  hotspots: [
    {
      id: 'huette', name: 'Hütte', rect: [0, 8, 84, 98], go: [90, 118],
      look: function () { return say('simon', 'Eine schiefe Hütte mit einem Schornstein, der raucht, obwohl niemand da ist. Sehr beruhigend.'); }
    },
    {
      id: 'fenster', name: 'Fenster', rect: [12, 64, 24, 22], go: [50, 120],
      look: function () { return say('simon', 'Grünes Licht flackert hinter dem Glas. Entweder brennt da etwas, oder es kocht. Oder beides.'); }
    },
    {
      id: 'huettentuer', name: 'Hüttentür', exitTo: 'Zaubererhütte', exitDir: 'up', rect: [42, 68, 26, 38], go: [78, 120], face: -1,
      look: function () {
        if (state.flags.huetteOffen) return say('simon', 'Die Tür steht offen. Der Dunst dahinter riecht nach altem Kraut.');
        return say('simon', 'Verschlossen. Statt eines Schlüssellochs leuchtet da ein grünes Runenzeichen. Das will kein Schlüssel — das will ein Wort.');
      },
      talk: function () { return sagZauberwort(); },
      use: async function (item) {
        if (item) return false;
        return sagZauberwort();
      },
      exit: async function () {
        if (!state.flags.huetteOffen) { await sagZauberwort(); return; }
        await goScene('huette', 292, 120, -1);
      }
    },
    {
      id: 'tuempel', name: 'Sumpftümpel', rect: [100, 110, 80, 30], go: [140, 148], face: 1, def: 'schau',
      look: function () { return say('simon', 'Trübes, blubberndes Wasser. Es sieht giftig aus und riecht, als wäre es stolz darauf.'); },
      use: async function (item) {
        if (item === 'eimer') {
          del('eimer'); add('eimer_voll'); sfx('water');
          await say('simon', 'Ich schöpfe einen Eimer Sumpfwasser. Meine Mutter wäre so stolz.');
          return;
        }
        if (item === 'eimer_voll') { await say('simon', 'Der Eimer ist schon voll. Voller ginge nur mit einem größeren Eimer.'); return; }
        if (item) return false;
        await say('simon', 'Ich fasse da nicht mit der Hand hinein. Ich mag meine Hand.');
      },
      take: function () { return say('simon', 'Wasser trägt man nicht in den Händen. Dafür gibt es Eimer.'); }
    },
    {
      id: 'schilf', name: 'Schilf', rect: [176, 100, 44, 34], go: [190, 132],
      look: function () { return say('simon', 'Hohes Schilf, das raschelt, obwohl kein Wind geht. Ich gehe einfach weiter.'); },
      take: function () { return say('simon', 'Ich habe genug Halme im Leben gezogen.'); }
    },
    {
      id: 'pilz', name: 'Fliegenpilz', rect: [198, 114, 22, 20], go: [208, 134],
      when: function () { return !state.flags.pilzWeg; },
      look: function () { return say('simon', 'Ein prachtvoller Fliegenpilz. Leuchtend rot — die Farbe, mit der die Natur "sehr schlechte Idee" sagt.'); },
      take: async function () {
        add('pilz'); state.flags.pilzWeg = true;
        await say('simon', 'Eingesteckt. Nicht essen, Simon. NICHT essen.');
      }
    },
    {
      id: 'bruecke', name: 'Brücke', exitTo: 'Drachenhöhle', exitDir: 'right', rect: [228, 88, 92, 22], go: [232, 116],
      look: function () { return say('simon', 'Eine morsche Holzbrücke. Dahinter gähnt ein Höhleneingang, aus dem warme Luft weht.'); },
      exit: async function () {
        if (!state.flags.trollWeg) {
          await say('grombold', 'HALT! Keiner geht über meine Brücke!');
          await say('simon', 'Schon gut, schon gut. Ich rede erst mit ihm.');
          return;
        }
        await goScene('hoehle', 40, 122, 1);
      }
    },
    {
      id: 'grombold', name: 'Grombold', rect: [244, 54, 46, 52], go: [226, 120], face: 1,
      when: function () { return !state.flags.trollWeg; },
      look: function () { return say('simon', 'Ein Troll. Breit wie eine Scheunentür, grün wie alter Käse und ungefähr so schlau wie die Brücke, auf der er sitzt.'); },
      talk: talkTroll,
      give: async function (item) {
        if (item === 'kaesebrot') { await say('grombold', 'Grombold isst kein Brot. Grombold will Rätsel.'); return; }
        await say('grombold', 'Nix nehmen. Erst Rätsel!');
      },
      use: function (item) { if (item) return this.give(item); return talkTroll(); }
    },
    {
      id: 'pfad_lichtung', name: 'Pfad zur Lichtung', exitTo: 'Lichtung', exitDir: 'up', rect: [140, 88, 50, 18], go: [164, 110],
      look: function () { return say('simon', 'Der Pfad zurück zur Lichtung. Er sieht deutlich trockener aus.'); },
      exit: function () { return goScene('lichtung', 20, 122, 1); }
    }
  ]
};

async function sagZauberwort() {
  if (state.flags.huetteOffen) { await say('simon', 'Die Tür ist bereits offen.'); return; }
  if (!state.flags.zauberwort) {
    await say('simon', 'Ich klopfe. Nichts. Ich schiebe. Nichts. Diese Tür will offenbar ein Passwort — und ich kenne es nicht.');
    return;
  }
  await say('simon', 'Also gut. Räusper. KRIBBELKRABBEL!');
  sfx('magic');
  await say('narrator', 'Die Rune erlischt mit einem beleidigten Zischen. Der Riegel springt zurück.');
  sfx('door');
  state.flags.huetteOffen = true;
  await say('simon', 'Es hat funktioniert. Ich schäme mich trotzdem.');
}

async function talkTroll() {
  await say('grombold', 'HALT! Niemand geht über Grombolds Brücke ohne Grombolds Rätsel!');
  var first = !state.flags.raetselGehoert;
  state.flags.raetselGehoert = true;
  if (first) {
    var o = await choose(['Und wenn ich einfach vorbeigehe?', 'Na gut, her mit dem Rätsel.']);
    if (o === 0) {
      await say('grombold', 'Dann wirft Grombold dich in den Sumpf. Ist auch ein Weg. Kürzer.');
      await say('simon', 'Ich nehme das Rätsel.');
    }
  }
  await say('grombold', 'Was hat einen Hals, aber keinen Kopf — und zwei Arme, aber keine Hände?');
  var opts;
  if (state.flags.buchGelesen) {
    opts = ['Eine Flasche.', 'Ein Hemd.', 'Meine Tante Gertrud.', 'Moment, ich denke nach.'];
  } else {
    opts = ['Eine Flasche.', 'Ein Regenwurm mit Ehrgeiz.', 'Meine Tante Gertrud.', 'Moment, ich denke nach.'];
  }
  var i = await choose(opts);
  if (opts[i] === 'Ein Hemd.') {
    await say('grombold', '...');
    sfx('success');
    await say('grombold', 'Ein HEMD. Ja! Genau! Grombold hat es die ganze Zeit gewusst!');
    await say('narrator', 'Der Troll steht auf, klopft sich den Moos vom Hintern und drückt Simon einen verbeulten Zinnkrug in die Hand.');
    await say('grombold', 'Nimm mit. Schmeckt eh scheußlich daraus. Grombold macht jetzt Pause. Dreißig Jahre Pause.');
    add('bierkrug');
    state.flags.trollWeg = true;
    await say('simon', 'Ein gelöstes Rätsel und ein gebrauchter Bierkrug. Ich blühe richtig auf.');
    return;
  }
  if (opts[i] === 'Moment, ich denke nach.') {
    await say('grombold', 'Grombold wartet. Grombold ist gut im Warten.');
    if (!state.flags.buchGelesen) await say('simon', 'Ich sollte herausfinden, was die richtige Antwort ist. Irgendwo muss das aufgeschrieben sein.');
    return;
  }
  await say('grombold', 'FALSCH! Hähä! Grombold gewinnt wieder!');
  await say('simon', 'Er "gewinnt" seit dreißig Jahren gegen Leute, die einfach nur über eine Brücke wollen. Was für eine Karriere.');
}

/* ------------------- HÜTTE DES ZAUBERERS ------------------- */
SCENES.huette = {
  name: 'Hütte des Zauberers',
  walk: { x1: 14, x2: 300, y1: 114, y2: 138 },
  scaleMin: .72, scaleMax: 1,
  start: { x: 292, y: 120 },
  draw: bgHuette, fx: 'dust',
  hotspots: [
    {
      id: 'regal', name: 'Regal', rect: [62, 6, 92, 54], go: [110, 118],
      look: function () { return say('simon', 'Flaschen in allen Farben. Auf einer steht "Nicht öffnen", auf einer anderen "Wirklich nicht", auf der dritten nur ein trauriges Gesicht.'); },
      take: function () { return say('simon', 'Ich fasse keine Flaschen an, die vom Vorbesitzer gewarnt wurden.'); }
    },
    {
      id: 'fenster', name: 'Fenster', rect: [8, 12, 44, 44], go: [40, 118],
      look: function () { return say('simon', 'Durch das schmutzige Glas sieht man den Sumpf. Das Glas ist eindeutig die schönere Aussicht.'); }
    },
    {
      id: 'tisch', name: 'Tisch', rect: [20, 104, 76, 34], go: [58, 132],
      look: function () { return say('simon', 'Ein Arbeitstisch voller Brandflecken. Hier ist jemand seinem Hobby mit Begeisterung nachgegangen.'); }
    },
    {
      id: 'buch', name: 'Zauberbuch', rect: [32, 96, 34, 14], go: [56, 130],
      when: function () { return !state.flags.buchWeg; },
      look: function () { return say('simon', 'Ein dickes Buch mit einem goldenen Auge auf dem Einband. Es blinzelt. Nein. Doch. Nein.'); },
      take: async function () {
        add('buch'); state.flags.buchWeg = true;
        await say('simon', 'Das Zauberbuch des alten Meisters. Das nehme ich definitiv mit.');
      },
      use: function (item) { if (item) return false; return ITEMS.buch.use(); }
    },
    {
      id: 'feuerstein', name: 'Feuerstein', rect: [66, 96, 20, 14], go: [76, 130],
      when: function () { return !state.flags.feuersteinWeg; },
      look: function () { return say('simon', 'Zwei graue Steine. Unspektakulär, bis man sie aneinanderschlägt.'); },
      take: async function () {
        add('feuerstein'); state.flags.feuersteinWeg = true;
        await say('simon', 'Feuerstein. Das mittelalterliche Feuerzeug, nur mit mehr Fluchen.');
      }
    },
    {
      id: 'lumpen', name: 'Lumpen', rect: [200, 22, 32, 38], go: [212, 120],
      when: function () { return !state.flags.lumpenWeg; },
      look: function () { return say('simon', 'Ein öliger Lappen hängt an einem Haken. Er sieht sehr brennbar aus. Sehr.'); },
      take: async function () {
        add('lumpen'); state.flags.lumpenWeg = true;
        await say('simon', 'Ein Lumpen. Für einen Zauberer erstaunlich nützlich.');
      }
    },
    {
      id: 'uhr', name: 'Standuhr', rect: [254, 12, 44, 96], go: [246, 138], face: 1, def: 'benutze',
      look: function () {
        if (state.flags.zahnradWeg) return say('simon', 'Eine ausgeweidete Standuhr. Sie zeigt jetzt für immer die Uhrzeit "egal".');
        return say('simon', 'Eine Standuhr, die viel zu schnell tickt. Hinter dem Glas sehe ich Messingzahnräder.');
      },
      use: async function (item) {
        if (item) return false;
        if (state.flags.zahnradWeg) { await say('simon', 'Da ist nichts mehr drin, was ich brauchen könnte.'); return; }
        await say('narrator', 'Simon öffnet die Klappe. Drinnen klackert es aufgeregt. Er greift beherzt hinein.');
        add('zahnrad'); state.flags.zahnradWeg = true;
        await say('simon', 'Ein Zahnrad! Die Uhr ist jetzt kaputt. Aber ehrlich gesagt ging sie sowieso falsch.');
      },
      take: function () { return this.use(null); }
    },
    {
      id: 'kessel', name: 'Kessel', rect: [140, 92, 56, 36], go: [168, 136], face: 1,
      look: async function () {
        if (state.flags.kesselFertig) return say('simon', 'Im Kessel schimmert es violett. Genau wie im Rezept beschrieben.');
        if (state.flags.kesselKaese) return say('simon', 'Es brodelt. Da fehlt noch etwas.');
        if (state.flags.kesselPilz) return say('simon', 'Grünes Wasser mit einem Pilz darin. Fehlt noch die letzte Zutat.');
        if (state.flags.kesselWasser) return say('simon', 'Sumpfwasser köchelt vor sich hin. Nächste Zutat, bitte.');
        return say('simon', 'Ein großer schwarzer Kessel über einem Feuer, das nie ausgeht. Er ist leer und sieht enttäuscht aus.');
      },
      use: async function (item) {
        if (!item) {
          if (state.flags.kesselFertig) { await say('simon', 'Fertig gebraut. Ich sollte den Trank nicht noch weiter umrühren.'); return; }
          await say('simon', 'Ich rühre um. Es passiert nichts. Vermutlich, weil nichts drin ist.');
          return;
        }
        if (item === 'eimer_voll') {
          if (state.flags.kesselWasser) { await say('simon', 'Da ist schon Wasser drin.'); return; }
          del('eimer_voll'); add('eimer'); state.flags.kesselWasser = true; sfx('water');
          await say('simon', 'Sumpfwasser hinein. Das Feuer zischt beleidigt.');
          return;
        }
        if (item === 'pilz') {
          if (!state.flags.kesselWasser) { await say('simon', 'Ein Pilz in einem leeren Kessel wird ein trauriger gebratener Pilz. Erst Wasser.'); return; }
          if (state.flags.kesselPilz) { await say('simon', 'Ein Pilz reicht. Sagt das Rezept. Sagt auch der gesunde Menschenverstand.'); return; }
          del('pilz'); state.flags.kesselPilz = true; sfx('bubble');
          await say('simon', 'Fliegenpilz hinein. Das Wasser wird plötzlich sehr aufmerksam.');
          return;
        }
        if (item === 'kaesebrot') {
          if (!state.flags.kesselPilz) { await say('simon', 'Käse kommt laut Rezept zuletzt. Und ich halte mich ausnahmsweise an Anweisungen.'); return; }
          del('kaesebrot'); state.flags.kesselKaese = true; state.flags.kesselFertig = true; sfx('magic');
          await say('narrator', 'Der Kessel gluckert, schäumt violett auf und wirft eine kleine Flasche aus, die Simon reflexhaft fängt.');
          add('schlafpulver');
          await say('simon', 'Ein Schlaftrank. Aus Sumpfwasser, Giftpilz und Käse. Ich hoffe inständig, dass ich den nie trinken muss.');
          return;
        }
        if (item === 'eimer') { await say('simon', 'Ein leerer Eimer bringt nichts. Ich brauche das Wasser darin.'); return; }
        if (item === 'buch') { await say('simon', 'Das Buch gehört nicht in den Kessel. Das Buch sagt mir, was in den Kessel gehört.'); return; }
        return false;
      }
    },
    {
      id: 'tuer', name: 'Tür', exitTo: 'Nebelsumpf', rect: [296, 58, 24, 52], go: [286, 122],
      look: function () { return say('simon', 'Die Tür nach draußen. In den Sumpf. Juhu.'); },
      exit: function () { return goScene('sumpf', 84, 120, 1); }
    }
  ]
};

/* ------------------------- HÖHLE ------------------------- */
SCENES.hoehle = {
  name: 'Drachenhöhle',
  walk: { x1: 16, x2: 300, y1: 110, y2: 138 },
  scaleMin: .68, scaleMax: 1,
  start: { x: 40, y: 122 },
  speakers: { drache: { x: 196, y: 60 } },
  draw: function (t, F) { bgHoehle(t, F, lit()); },
  fx: 'ember',
  front: function (t) { if (lit()) frontRocks(t); },
  onEnter: async function () {
    if (!lit() && !state.flags.hoehleDunkelGesehen) {
      state.flags.hoehleDunkelGesehen = true;
      await say('simon', 'Es ist stockdunkel hier drin. Und da hinten sind zwei gelbe Augen, die mich anschauen.');
      await say('simon', 'Ich brauche Licht. Und vermutlich ein neues Hobby.');
    } else if (lit() && !state.flags.drachenGesehen) {
      state.flags.drachenGesehen = true;
      await say('narrator', 'Im Licht der Fackel wird sichtbar, wem die Augen gehören: ein Drache, groß wie ein Bauernhaus, zusammengerollt auf einem Berg aus Gold.');
      await say('simon', 'Ein Drache. Natürlich ein Drache. Und er schläft. Sehr leicht, wie ich vermute.');
    }
  },
  hotspots: [
    {
      id: 'ausgang', name: 'Ausgang', exitTo: 'Nebelsumpf', rect: [0, 84, 28, 58], go: [24, 122],
      look: function () { return say('simon', 'Der Weg zurück über die Brücke.'); },
      exit: function () { return goScene('sumpf', 240, 116, -1); }
    },
    {
      id: 'gold', name: 'Goldhaufen', rect: [150, 108, 150, 30], go: [170, 136],
      look: dark(function () { return say('simon', 'Gold, Münzen, Kelche. Und ein Drache, der genau darauf liegt. Der Zusammenhang ist mir nicht entgangen.'); }),
      take: dark(function () { return say('simon', 'Ich stehle einem schlafenden Drachen kein Gold. Ich bin faul, nicht lebensmüde.'); })
    },
    {
      id: 'drache', name: 'Drache', rect: [176, 66, 116, 62], go: [176, 150], face: 1, def: 'schau',
      look: dark(function () {
        if (state.flags.drachenSchlaf) return say('simon', 'Er schläft tief und fest und lächelt sogar ein bisschen. Vermutlich träumt er von Käse.');
        return say('simon', 'Er schläft. Aber es ist dieser dünne Schlaf, bei dem ein Niesen ausreicht, um zum Mittagessen zu werden.');
      }),
      talk: dark(async function () {
        if (state.flags.drachenSchlaf) { await say('simon', 'Ich rede nicht mit schlafenden Drachen. Das weckt sie meistens.'); return; }
        await say('simon', '(flüsternd) Hallo? Netter Drache?');
        await say('drache', 'Grrrrrmpf...');
        await say('simon', 'Wunderbares Gespräch. Sehr tiefgründig.');
      }),
      use: dark(async function (item) {
        if (item === 'schlafpulver') {
          if (state.flags.drachenSchlaf) { await say('simon', 'Er schläft schon so tief, dass es fast unhöflich wäre, nachzulegen.'); return; }
          del('schlafpulver'); state.flags.drachenSchlaf = true; sfx('snore');
          await say('narrator', 'Simon streut das schimmernde Pulver vor die riesigen Nüstern. Der Drache schnauft, seufzt — und beginnt zu schnarchen wie ein umkippender Schrank.');
          await say('simon', 'Und schon habe ich den friedlichsten Drachen der Welt. Sagen wir: für die nächste halbe Stunde.');
          return;
        }
        if (item === 'fackel_an') { await say('simon', 'Einen Drachen mit Feuer bedrohen. Denk mal kurz nach, Simon.'); return; }
        if (item) return false;
        await say('simon', 'Ich stupse keinen Drachen an. Nicht heute.');
      })
    },
    {
      id: 'kristall', name: 'Kristall', rect: [76, 94, 34, 38], go: [96, 136], face: -1,
      when: function () { return !state.flags.kristallWeg; },
      look: dark(function () { return say('simon', 'Auf einem Felssockel schwebt ein violetter Kristall. Er pulsiert im Takt meines Herzschlags. Etwas zu schnell.'); }),
      take: dark(async function () {
        if (!state.flags.drachenSchlaf) {
          sfx('roar');
          await say('narrator', 'Simon streckt die Hand aus. Ein Augenlid des Drachen hebt sich einen Spalt. Ein tiefes Grollen rollt durch die Höhle.');
          await say('simon', 'Nein. Nein nein nein. Erst der Drache, dann der Kristall.');
          return;
        }
        add('kristall'); state.flags.kristallWeg = true;
        await say('simon', 'Der Kristall gehört mir. Und der Drache schnarcht weiter, als wäre nichts gewesen.');
        await say('simon', 'Jetzt noch mein Hut — und dann nach Hause.');
      }),
      use: function (item) { if (item) return false; return this.take(); }
    }
  ]
};

/* ----------------------- STEINKREIS ----------------------- */
SCENES.steinkreis = {
  name: 'Steinkreis',
  walk: { x1: 14, x2: 306, y1: 110, y2: 138 },
  scaleMin: .66, scaleMax: 1,
  start: { x: 160, y: 134 },
  draw: bgSteinkreis, fx: 'fireflies',
  front: function (t) { frontStones(t); },
  onEnter: async function () {
    if (!state.flags.kreisGesehen) {
      state.flags.kreisGesehen = true;
      await say('narrator', 'Sechs uralte Steine stehen im Gras. In der Mitte ein flacher Altar mit einer einzelnen, kristallförmigen Vertiefung.');
      await say('simon', 'Hier bin ich in diese Welt gefallen. Und hier komme ich auch wieder raus — wenn ich die Vertiefung füllen kann.');
    }
  },
  hotspots: [
    {
      id: 'steine', name: 'Steinkreis', rect: [16, 60, 288, 52], go: [110, 118],
      look: function () { return say('simon', 'Sechs Menhire, in die jemand Runen gehauen hat. Sie sagen im Wesentlichen: "Zutritt nur für Zauberer mit Hut."'); }
    },
    {
      id: 'mond', name: 'Mond', rect: [248, 6, 42, 42],
      go: [200, 116],
      look: function () { return say('simon', 'Ein voller Mond. Zu Hause hängt der gleiche. Zumindest hoffe ich, dass es der gleiche ist.'); }
    },
    {
      id: 'altar', name: 'Altar', rect: [132, 96, 60, 34], go: [162, 136], face: 1,
      look: function () {
        if (state.flags.kristallPlatziert) return say('simon', 'Der Kristall sitzt in der Vertiefung und schickt eine Lichtsäule in den Himmel. Sehr dezent.');
        return say('simon', 'Ein Steinaltar mit einer kristallförmigen Mulde. Ich merke, worauf das hinausläuft.');
      },
      use: async function (item) {
        if (item === 'kristall') {
          del('kristall'); state.flags.kristallPlatziert = true; sfx('magic');
          await say('narrator', 'Simon legt den Kristall in die Mulde. Er rastet mit einem satten Klicken ein, und violettes Licht schießt zwischen den Steinen empor.');
          if (!state.flags.hut) await say('simon', 'Das Portal reagiert! Aber ohne Hut nimmt mich da drüben keiner ernst. Erst der Hut.');
          else await say('simon', 'Kristall drin, Hut auf dem Kopf. Jetzt fehlt nur noch das Zauberwort.');
          return;
        }
        if (item) return false;
        return altarAktivieren();
      },
      talk: function () { return altarAktivieren(); },
      take: function () { return say('simon', 'Einen Altar in die Tasche stecken. Klar.'); }
    },
    {
      id: 'pfad_sued', name: 'Pfad zur Lichtung', exitTo: 'Lichtung', exitDir: 'down', rect: [120, 120, 84, 22], go: [160, 137],
      look: function () { return say('simon', 'Der Pfad zurück in den Wald.'); },
      exit: function () { return goScene('lichtung', 160, 112, 1); }
    }
  ]
};

async function altarAktivieren() {
  if (!state.flags.kristallPlatziert) {
    await say('simon', 'Ich könnte hier stundenlang stehen und Zauberworte rufen. Ohne Kristall in der Mulde bleibt das reines Theater.');
    return;
  }
  if (!state.flags.hut) {
    await say('simon', 'Das Portal ist bereit. Aber ich gehe nicht ohne meinen Hut nach Hause. Ich habe schließlich einen Ruf.');
    return;
  }
  await say('simon', 'Also gut. Zum letzten Mal, und ich schwöre, ich erzähle das niemandem:');
  await say('simon', 'KRIBBELKRABBEL!');
  await ende();
}

/* ------------------------- FINALE ------------------------- */

async function ende() {
  sfx('portal');
  await say('narrator', 'Die Runen flammen auf. Das Licht zwischen den Steinen wird dicht wie Wasser, und ein Wind kommt auf, der nach Zuhause riecht.');
  await say('narrator', 'Aus dem Sumpf hört man einen Troll gähnen. Im Dorf schmeckt Brunos Bier zum ersten Mal seit Jahren wieder richtig. Und hoch in einer Eiche bewundert eine Elster ihren neuen Knopf.');
  await say('simon', 'Krummwald, es war... nun ja. Es war.');
  await fadeTo(1, 900);
  mode = 'ending';
  T = 0;
  clearSave();
  playMusic('ende');
  await fadeTo(0, 900);
}

/* ============================================================
   HINWEIS-SYSTEM
   Liefert je nach Spielstand den nächsten sinnvollen Schritt,
   gestaffelt von vage bis konkret.
   ============================================================ */

function questSteps() {
  var F = state.flags;
  return [
    { key: 'brunnen', title: 'Herausfinden, wie die Hütte im Sumpf aufgeht', done: function () { return F.zauberwort; }, texts: [
      'Im Dorf gibt es etwas zu lesen. Alte Steine sind gesprächiger, als man denkt.',
      'Schau dir den Brunnen in Krummwald genauer an. Jemand hat etwas in den Rand geritzt.',
      'Klicke den Brunnen im Dorf an (oder Rechtsklick zum Anschauen) — dort steht das Zauberwort für die Hüttentür.' ] },
    { key: 'huette', title: 'Die Hütte des Zauberers betreten', done: function () { return F.huetteOffen; }, texts: [
      'Die Hütte im Sumpf will begrüßt werden, nicht aufgebrochen.',
      'Das Wort vom Brunnenrand gehört an die Hüttentür.',
      'Klicke die Hüttentür im Sumpf an — Simon spricht dann das Zauberwort KRIBBELKRABBEL.' ] },
    { key: 'buch', title: 'Das Zauberbuch lesen', done: function () { return F.buchGelesen; }, texts: [
      'In der Hütte liegt Lesestoff. Ein Zauberer notiert alles.',
      'Nimm das Zauberbuch vom Tisch und lies es.',
      'Buch anklicken, dann unten im Inventar zweimal auf das Buch klicken — der zweite Klick liest es. Darin stehen Trollrätsel und Kesselrezept.' ] },
    { key: 'troll', title: 'Grombolds Rätsel lösen', done: function () { return F.trollWeg; }, texts: [
      'Der Troll auf der Brücke will nur eines: eine Antwort.',
      'Rede mit Grombold, sobald du das Zauberbuch gelesen hast.',
      'Die Lösung des Rätsels ist "Ein Hemd" — die Option erscheint, wenn du das Buch gelesen hast.' ] },
    { key: 'krug', title: 'Bruno seinen Bierkrug zurückbringen', done: function () { return F.krugAbgegeben; }, texts: [
      'Jemand im Dorf vermisst etwas, das jetzt in deiner Tasche steckt.',
      'Bruno steht im Wirtshaus hinter dem Tresen und will seinen Bierkrug zurück — er zahlt dafür.',
      'Bierkrug im Inventar anklicken, dann drinnen im Wirtshaus auf Bruno klicken. Es gibt Münzen und ein Käsebrot.' ] },
    { key: 'knopf', title: 'Etwas Glänzendes für die Elster besorgen', done: function () { return F.knopfWeg; }, texts: [
      'Für den Vogel brauchst du etwas, das viel zu sehr glänzt.',
      'Mathilda verkauft einen glänzenden Knopf — für genau fünf Kupfermünzen.',
      'Rede mit Mathilda am Marktstand und kaufe den Knopf.' ] },
    { key: 'zahnrad', title: 'Ein Zahnrad auftreiben', done: function () { return F.zahnradWeg; }, texts: [
      'Etwas in der Hütte tickt, obwohl es niemanden interessiert.',
      'Die Standuhr in der Hütte hat mehr Zahnräder, als sie braucht.',
      'Klicke die Standuhr in der Hütte an und nimm das Zahnrad heraus.' ] },
    { key: 'eimer', title: 'Den Brunnen reparieren und den Eimer holen', done: function () { return F.eimerWeg; }, texts: [
      'Der Brunnen kann mehr, wenn man ihn repariert.',
      'Die Brunnenkurbel fehlt ein Zahnrad.',
      'Zahnrad im Inventar anklicken, dann auf den Brunnen klicken. Danach den Brunnen nochmal anklicken — du bekommst den Eimer.' ] },
    { key: 'trank', title: 'Den Schlaftrank brauen', done: function () { return F.kesselFertig; }, texts: [
      'Der Kessel in der Hütte will gefüttert werden. Das Buch verrät die Reihenfolge.',
      'Sumpfwasser (mit dem Eimer schöpfen), dann Fliegenpilz, dann Käsebrot — in den Kessel.',
      'Eimer im Inventar anklicken und auf den Tümpel klicken. Dann nacheinander Sumpfwasser, Fliegenpilz und Käsebrot anklicken und jeweils auf den Kessel klicken.' ] },
    { key: 'fackel', title: 'Licht für die Höhle machen', done: function () { return has('fackel_an'); }, texts: [
      'In der Höhle ist es dunkel. Du hast alle Teile für eine Lösung dabei.',
      'Stock und Lumpen ergeben eine Fackel. Feuerstein macht daraus Licht.',
      'Im Inventar den Stock anklicken, dann die Lumpen — das ergibt die Fackel. Danach Feuerstein anklicken und auf die Fackel klicken.' ] },
    { key: 'drache', title: 'Den Drachen tief schlafen legen', done: function () { return F.drachenSchlaf; }, texts: [
      'Der Drache schläft zu leicht für deinen Geschmack.',
      'Der Schlaftrank aus dem Kessel ist genau dafür gemacht.',
      'Schlaftrank im Inventar anklicken, dann auf den Drachen klicken.' ] },
    { key: 'kristall', title: 'Den Kristall an sich nehmen', done: function () { return F.kristallWeg; }, texts: [
      'Jetzt kannst du dir nehmen, was auf dem Felssockel liegt.',
      'Nimm den violetten Kristall in der Höhle.',
      'Klicke den Kristall links in der Drachenhöhle an.' ] },
    { key: 'hut', title: 'Den Hut von der Elster zurückholen', done: function () { return F.hut; }, texts: [
      'Die Elster tauscht. Sie handelt nur nicht mit Geld.',
      'Gib der Elster den glänzenden Knopf.',
      'Knopf im Inventar anklicken, dann auf die Elster im Baum klicken — sie lässt den Hut fallen.' ] },
    { key: 'altar', title: 'Den Kristall auf den Altar legen', done: function () { return F.kristallPlatziert; }, texts: [
      'Der Steinkreis im Norden hat eine sehr passgenaue Mulde.',
      'Lege den Kristall auf den Altar im Steinkreis.',
      'Kristall im Inventar anklicken, dann auf den Altar klicken.' ] },
    { key: 'finale', title: 'Das Portal öffnen und nach Hause gehen', done: function () { return false; }, texts: [
      'Alles liegt bereit. Es fehlt nur noch das Wort.',
      'Benutze den Altar und sprich das Zauberwort.',
      'Klicke im Steinkreis den Altar an — das beendet das Spiel.' ] }
  ];
}

function getHint() {
  var steps = questSteps();
  for (var i = 0; i < steps.length; i++) if (!steps[i].done()) return steps[i];
  return null;
}

/* Für das Tagebuch: alle Ziele mit Status, künftige bleiben verborgen */
function journalSteps() {
  var steps = questSteps(), out = [], offen = 0;
  for (var i = 0; i < steps.length; i++) {
    var d = steps[i].done();
    if (!d) offen++;
    if (!d && offen > 2) break;          /* nicht die ganze Lösung verraten */
    out.push({ text: steps[i].title, done: d });
  }
  return out;
}

/* ============================================================
   TITEL- UND ENDBILDSCHIRM
   ============================================================ */

function drawTitleScreen(t) {
  band(0, 130, '#0d1230', '#3a2a52');
  for (var s = 0; s < 70; s++) {
    var sx = rnd(s * 5.3) * VW, sy = rnd(s * 2.1) * 110;
    R(sx, sy, 1, 1, 'rgba(255,255,255,' + (.3 + Math.abs(Math.sin(t * .03 + s)) * .7) + ')');
  }
  E(58, 34, 17, 17, '#f4eec8'); E(52, 30, 4, 4, '#ded8b4'); E(63, 39, 5, 4, '#ded8b4');
  E(58, 34, 26, 26, 'rgba(244,238,200,.09)');

  /* Waldsilhouette */
  for (var i = 0; i < 30; i++) {
    var x = i * 12 + rnd(i) * 6, h = 26 + rnd(i + 3) * 32;
    P([x - 9, 142, x + 9, 142, x, 142 - h], '#0b1410');
  }
  R(0, 132, VW, 68, '#0b1410');

  /* Steinkreis-Silhouette */
  var st = [[196, 132, 10, 24], [222, 132, 12, 30], [252, 132, 10, 26], [278, 132, 13, 34]];
  for (var k = 0; k < st.length; k++) P([st[k][0] - st[k][2] / 2, st[k][1], st[k][0] + st[k][2] / 2, st[k][1], st[k][0] + st[k][2] / 2 - 1, st[k][1] - st[k][3], st[k][0] - st[k][2] / 2 + 2, st[k][1] - st[k][3] + 2], '#161f22');
  var pu = .4 + Math.sin(t * .05) * .25;
  P([232, 108, 244, 108, 254, 132, 222, 132], 'rgba(155,93,229,' + (pu * .3) + ')');

  /* Simon im Vordergrund, links neben dem Menü */
  drawSimon(56, 192, 1.35, 0, 1, true);
  frontFoliage(t, '#060d08', '#0a140c');
}

/* ---- Titelmenü ---- */

function titleItems() {
  return hasSave()
    ? [{ id: 'continue', label: 'Fortsetzen' }, { id: 'new', label: 'Neues Spiel' }]
    : [{ id: 'new', label: 'Spiel starten' }];
}

function titleBox(i) { return { x: 105, y: 148 + i * 17, w: 110, h: 14 }; }

function titleHit(p) {
  var it = titleItems();
  for (var i = 0; i < it.length; i++) {
    var b = titleBox(i);
    if (p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h) return i;
  }
  return -1;
}

function titleClick(p) {
  var i = titleHit(p);
  var it = titleItems();
  if (i < 0) { if (it.length === 1) startGame(); return; }
  sfx('click');
  if (it[i].id === 'continue') continueGame();
  else { clearSave(); startGame(); }
}

function drawTitleText() {
  txt(160, 34, 'SIMON DER ZAUBERER', '#ffd94a', 'center', 18);
  txt(160, 60, 'Der Fluch von Krummwald', '#c9b8e6', 'center', 9);

  var it = titleItems();
  for (var i = 0; i < it.length; i++) {
    var b = titleBox(i), hov = hoverTitle === i;
    ctx.fillStyle = hov ? 'rgba(90,70,140,.85)' : 'rgba(24,18,40,.65)';
    ctx.fillRect(b.x * scale, b.y * scale, b.w * scale, b.h * scale);
    ctx.fillStyle = hov ? 'rgba(200,170,255,.9)' : 'rgba(140,116,184,.5)';
    ctx.fillRect(b.x * scale, b.y * scale, b.w * scale, Math.max(1, scale * .5));
    txt(160, b.y + 3, it[i].label, hov ? '#ffe58a' : '#d6cbec', 'center', 8.5);
  }
  txt(160, 192, 'Point-&-Click-Abenteuer · Linksklick handelt, Rechtsklick schaut an',
    'rgba(220,210,240,.5)', 'center', 6.5);
}

function drawEndingScreen(t) {
  band(0, 200, '#150d26', '#3d2358');
  for (var s = 0; s < 90; s++) {
    var sx = rnd(s * 7.7) * VW, sy = rnd(s * 3.3) * VH;
    R(sx, sy, 1, 1, 'rgba(255,255,255,' + (.2 + Math.abs(Math.sin(t * .04 + s)) * .6) + ')');
  }
  /* Portalwirbel */
  for (var i = 12; i > 0; i--) {
    var rr = i * 9 + Math.sin(t * .04 + i) * 3;
    E(160, 100, rr, rr * .8, 'rgba(' + (120 + i * 8) + ',' + (60 + i * 10) + ',' + (200 + i * 4) + ',' + (.05 + i * .012) + ')');
  }
  E(160, 100, 16 + Math.sin(t * .08) * 3, 13 + Math.sin(t * .08) * 3, 'rgba(240,225,255,.85)');
  for (var p = 0; p < 24; p++) {
    var a = p / 24 * 6.283 + t * .02, d = 20 + ((t * .6 + p * 14) % 110);
    E(160 + Math.cos(a) * d * 1.2, 100 + Math.sin(a) * d * .9, 1.5, 1.5, 'rgba(220,190,255,' + Math.max(0, .8 - d / 130) + ')');
  }
}

function drawEndingText() {
  txt(160, 30, 'ENDE', '#ffd94a', 'center', 20);
  txt(160, 150, 'Simon ist wieder zu Hause.', '#f2e9d0', 'center', 9);
  txt(160, 164, 'Der Hut sitzt. Der Tee ist noch warm.', '#c9b8e6', 'center', 7.5);
  txt(160, 182, 'Seite neu laden, wenn man es noch einmal wissen will.', 'rgba(220,210,240,.5)', 'center', 6.5);
}

/* ============================================================
   START
   ============================================================ */

async function startGame() {
  if (mode !== 'title') return;
  mode = 'play';
  state.scene = 'lichtung';
  state.inv = []; state.flags = {};
  actor.x = 170; actor.y = 150; actor.tx = actor.x; actor.ty = actor.y;
  sceneEnteredAt = performance.now();
  fadeVal = 1;
  audioInit();
  playMusic('lichtung');
  await fadeTo(0, 700);
  busy = true;
  await say('narrator', 'Es begann, wie diese Dinge immer beginnen: mit einem alten Buch, einem unvorsichtigen Wort und einem Loch in der Wirklichkeit.');
  await say('narrator', 'Simon landete in Krummwald. Sein Hut landete woanders.');
  await say('simon', 'Also. Zusammenfassung: fremde Welt, kein Rückweg, kein Hut.');
  await say('simon', 'Immerhin habe ich noch meine gute Laune. Die halte ich für ungefähr zehn Minuten.');
  busy = false;
}

startEngine();
