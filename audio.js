/* ============================================================
   audio.js – MP3-Soundtrack, prozedurale Musik, Soundeffekte
   und Sprachausgabe. Die Synth-Musik bleibt als Fallback aktiv.
   ============================================================ */

var AU = {
  ctx: null,
  master: null, musicBus: null, sfxBus: null,
  musicOn: true, sfxOn: true, speechOn: true,
  track: null, nextNote: 0, step: 0, timer: null,
  voice: null, utter: null, ready: false,
  song: null, songPlaying: false, songUnavailable: false, songMix: 0.26
};

/* ---------------- Initialisierung (nach erster Geste) ---------------- */

function audioInit() {
  if (AU.ctx) {
    if (AU.ctx.state === 'suspended') AU.ctx.resume();
    startExternalMusic();
    return;
  }
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  AU.ctx = new AC();

  AU.master = AU.ctx.createGain();
  AU.master.gain.value = 0.9;
  AU.master.connect(AU.ctx.destination);

  AU.musicBus = AU.ctx.createGain();
  AU.musicBus.gain.value = 0.30;
  AU.musicBus.connect(AU.master);

  AU.sfxBus = AU.ctx.createGain();
  AU.sfxBus.gain.value = 0.55;
  AU.sfxBus.connect(AU.master);

  /* dezentes Echo für Atmosphäre */
  AU.delay = AU.ctx.createDelay(1.0);
  AU.delay.delayTime.value = 0.28;
  AU.delayFb = AU.ctx.createGain();
  AU.delayFb.gain.value = 0.22;
  AU.delayMix = AU.ctx.createGain();
  AU.delayMix.gain.value = 0.0;
  AU.delay.connect(AU.delayFb); AU.delayFb.connect(AU.delay);
  AU.delay.connect(AU.delayMix); AU.delayMix.connect(AU.master);

  AU.ready = true;
  startExternalMusic();
  pickVoice();
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = pickVoice;
}

function now() { return AU.ctx ? AU.ctx.currentTime : 0; }
function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

/* ---------------- MP3-Soundtrack ---------------- */

function startExternalMusic() {
  if (AU.songUnavailable || !AU.musicOn) return;
  if (!AU.song) {
    AU.song = new Audio('assets/mosswing-path.mp3');
    AU.song.loop = true;
    AU.song.preload = 'auto';
    AU.song.volume = AU.songMix;
    AU.song.addEventListener('error', function () {
      AU.songUnavailable = true;
      AU.songPlaying = false;
    });
  }
  AU.song.volume = AU.musicOn ? AU.songMix : 0;
  var p = AU.song.play();
  if (p && p.then) {
    p.then(function () { AU.songPlaying = true; })
      .catch(function () { AU.songPlaying = false; });
  }
}

function songMixForScene(id) {
  if (id === 'hoehle') return 0.17;
  if (id === 'sumpf' || id === 'steinkreis') return 0.22;
  if (id === 'wirtshaus') return 0.28;
  if (id === 'ende') return 0.32;
  return 0.26;
}

/* ---------------- Ton-Bausteine ---------------- */

function tone(freq, t0, dur, type, vol, bus, glide) {
  if (!AU.ctx) return;
  var o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t0);
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.min(0.03, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(bus || AU.sfxBus);
  if (bus === AU.musicBus) g.connect(AU.delay);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise(t0, dur, vol, freq, q, bus) {
  if (!AU.ctx) return;
  var len = Math.max(1, Math.floor(AU.ctx.sampleRate * dur));
  var buf = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate);
  var d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  var src = AU.ctx.createBufferSource(); src.buffer = buf;
  var f = AU.ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq || 900; f.Q.value = q || 1;
  var g = AU.ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(bus || AU.sfxBus);
  src.start(t0);
}

/* ---------------- Soundeffekte ---------------- */

function sfx(name) {
  if (!AU.ctx || !AU.sfxOn) return;
  var t = now() + 0.01;
  switch (name) {
    case 'click':   tone(660, t, 0.05, 'square', 0.10); break;
    case 'verb':    tone(520, t, 0.04, 'square', 0.08); break;
    case 'pick':    tone(700, t, 0.07, 'square', 0.14, null, 1250);
                    tone(1050, t + 0.06, 0.10, 'triangle', 0.12); break;
    case 'success': [0, 4, 7, 12].forEach(function (n, i) { tone(hz(69 + n), t + i * 0.075, 0.20, 'square', 0.11); }); break;
    case 'fail':    tone(180, t, 0.16, 'sawtooth', 0.12, null, 120); break;
    case 'door':    noise(t, 0.5, 0.10, 260, 0.7); tone(90, t, 0.5, 'sawtooth', 0.09, null, 60); break;
    case 'magic':   tone(320, t, 0.7, 'sine', 0.13, null, 2100);
                    noise(t + 0.05, 0.6, 0.05, 2400, 0.8); break;
    case 'water':   noise(t, 0.45, 0.10, 500, 0.6); noise(t + 0.15, 0.4, 0.07, 300, 0.5); break;
    case 'bubble':  tone(300, t, 0.14, 'sine', 0.09, null, 620); break;
    case 'fire':    noise(t, 0.35, 0.09, 700, 0.5); tone(140, t, 0.3, 'sawtooth', 0.07, null, 90); break;
    case 'coins':   [0, 1, 2].forEach(function (i) { tone(1400 + i * 220, t + i * 0.05, 0.07, 'triangle', 0.09); }); break;
    case 'snore':   tone(70, t, 0.9, 'sawtooth', 0.10, null, 45); noise(t, 0.9, 0.05, 200, 0.4); break;
    case 'roar':    tone(60, t, 1.1, 'sawtooth', 0.16, null, 38); noise(t, 1.0, 0.14, 320, 0.4); break;
    case 'bird':    tone(1800, t, 0.06, 'square', 0.08, null, 2600);
                    tone(2200, t + 0.09, 0.05, 'square', 0.07, null, 1500); break;
    case 'portal':  tone(140, t, 2.2, 'sine', 0.18, null, 1400);
                    noise(t, 2.2, 0.10, 1200, 0.4);
                    [0, 3, 7, 10, 12].forEach(function (n, i) { tone(hz(60 + n), t + i * 0.18, 1.2, 'triangle', 0.09, AU.musicBus); }); break;
    case 'step':    noise(t, 0.05, 0.045, 380, 0.9); break;
  }
}

/* ---------------- Musik ---------------- */

var TRACKS = {
  lichtung:   { bpm: 104, root: 57, mode: [0, 2, 4, 7, 9], chords: [0, 5, 7, 5], lead: 'square',  bass: 'triangle', echo: 0.10, dens: .70 },
  dorf:       { bpm: 124, root: 60, mode: [0, 2, 4, 5, 7, 9], chords: [0, 0, 5, 7], lead: 'square', bass: 'triangle', echo: 0.06, dens: .85 },
  sumpf:      { bpm: 76,  root: 50, mode: [0, 2, 3, 5, 7, 10], chords: [0, 3, 0, 8], lead: 'triangle', bass: 'sine', echo: 0.30, dens: .45 },
  huette:     { bpm: 92,  root: 55, mode: [0, 3, 5, 7, 10], chords: [0, 7, 3, 5], lead: 'triangle', bass: 'sine', echo: 0.22, dens: .55 },
  wirtshaus:  { bpm: 132, root: 57, mode: [0, 2, 4, 5, 7, 9], chords: [0, 5, 0, 7], lead: 'square', bass: 'triangle', echo: 0.10, dens: .90 },
  hoehle:     { bpm: 66,  root: 45, mode: [0, 1, 5, 7, 8], chords: [0, 0, 6, 5], lead: 'sine', bass: 'sine', echo: 0.42, dens: .38 },
  steinkreis: { bpm: 84,  root: 52, mode: [0, 2, 4, 7, 11], chords: [0, 9, 5, 7], lead: 'triangle', bass: 'sine', echo: 0.36, dens: .60 },
  titel:      { bpm: 92,  root: 52, mode: [0, 2, 4, 7, 9], chords: [0, 9, 5, 7], lead: 'square', bass: 'triangle', echo: 0.24, dens: .65 },
  ende:       { bpm: 96,  root: 60, mode: [0, 2, 4, 7, 9], chords: [0, 5, 9, 7], lead: 'triangle', bass: 'sine', echo: 0.30, dens: .75 }
};

function playMusic(id) {
  if (!AU.ctx) return;
  AU.songMix = songMixForScene(id);
  if (AU.song) AU.song.volume = AU.musicOn ? AU.songMix : 0;
  startExternalMusic();
  if (AU.trackId === id) return;
  AU.trackId = id;
  AU.track = TRACKS[id] || TRACKS.lichtung;
  AU.step = 0;
  AU.nextNote = now() + 0.1;
  AU.delayMix.gain.setTargetAtTime(AU.track.echo, now(), 0.6);
  if (!AU.timer) AU.timer = setInterval(schedule, 60);
}

function schedule() {
  if (!AU.ctx || !AU.track) return;
  if (AU.songPlaying && !AU.songUnavailable) {
    AU.nextNote = Math.max(AU.nextNote, now() + 0.1);
    return;
  }
  if (!AU.musicOn) { AU.nextNote = Math.max(AU.nextNote, now()); return; }
  var spb = 60 / AU.track.bpm / 2;      /* Achtelnoten */
  while (AU.nextNote < now() + 0.45) {
    playStep(AU.step, AU.nextNote, spb);
    AU.step++;
    AU.nextNote += spb;
  }
}

function playStep(s, t, spb) {
  var tr = AU.track;
  var bar = Math.floor(s / 8) % tr.chords.length;
  var root = tr.root + tr.chords[bar];
  var beat = s % 8;

  /* Bass auf 1 und 5 */
  if (beat === 0 || beat === 4) {
    tone(hz(root - 12), t, spb * 1.8, tr.bass, 0.16, AU.musicBus);
  }
  /* Akkordton dazwischen */
  if (beat === 2 || beat === 6) {
    tone(hz(root - 5), t, spb * 0.9, tr.bass, 0.07, AU.musicBus);
  }
  /* Melodie aus der Tonleiter, deterministisch pseudozufällig */
  var seed = Math.sin(s * 12.9898 + tr.root) * 43758.5453;
  var r = seed - Math.floor(seed);
  if (r < tr.dens) {
    var deg = tr.mode[Math.floor((r * 7919) % tr.mode.length)];
    var oct = r > 0.72 ? 12 : 0;
    tone(hz(root + deg + oct), t, spb * (r > 0.5 ? 1.5 : 0.85), tr.lead, 0.085, AU.musicBus);
  }
  /* leises Perkussions-Tick */
  if (beat % 4 === 0 && AU.track.bpm > 90) noise(t, 0.04, 0.02, 3200, 1.5, AU.musicBus);
}

function setMusic(on) {
  AU.musicOn = on;
  if (AU.musicBus) AU.musicBus.gain.setTargetAtTime(on ? 0.30 : 0.0, now(), 0.1);
  if (AU.song) AU.song.volume = on ? AU.songMix : 0;
  if (on) startExternalMusic();
}

/* ---------------- Sprachausgabe ---------------- */

var VOICEPROFILE = {
  simon:    { pitch: 1.10, rate: 1.05 },
  narrator: { pitch: 0.85, rate: 0.98 },
  bruno:    { pitch: 0.62, rate: 0.95 },
  mathilda: { pitch: 1.45, rate: 1.10 },
  grombold: { pitch: 0.40, rate: 0.80 },
  elster:   { pitch: 2.00, rate: 1.45 },
  drache:   { pitch: 0.30, rate: 0.72 }
};

function pickVoice() {
  if (!window.speechSynthesis) return;
  var vs = speechSynthesis.getVoices();
  if (!vs || !vs.length) return;
  var de = vs.filter(function (v) { return /^de/i.test(v.lang); });
  AU.voice = de.length ? de[0] : null;
}

function speak(who, text, onEnd) {
  if (!AU.speechOn || !window.speechSynthesis) { if (onEnd) onEnd(); return false; }
  try {
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    var p = VOICEPROFILE[who] || VOICEPROFILE.simon;
    if (AU.voice) u.voice = AU.voice;
    u.lang = 'de-DE';
    u.pitch = p.pitch; u.rate = p.rate; u.volume = 1;
    u.onend = function () { AU.utter = null; if (onEnd) onEnd(); };
    u.onerror = function () { AU.utter = null; if (onEnd) onEnd(); };
    AU.utter = u;
    speechSynthesis.speak(u);
    return true;
  } catch (e) { if (onEnd) onEnd(); return false; }
}

function stopSpeech() {
  if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) {} }
  AU.utter = null;
}
