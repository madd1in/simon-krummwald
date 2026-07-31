# Simon der Zauberer – Der Fluch von Krummwald

Ein komplett neues Point-&-Click-Adventure im Stil der klassischen 90er-Jahre-Adventures.
Eigene Geschichte, eigene Rätsel, sieben Schauplätze – alles in reinem JavaScript,
ohne Framework und ohne externe Bilddateien.

**[▶ Im Browser spielen](https://madd1in.github.io/simon-krummwald/)**

![Pixelart-Adventure](https://img.shields.io/badge/Engine-Canvas%202D-blue) ![Keine Abhängigkeiten](https://img.shields.io/badge/Dependencies-0-brightgreen)

---

## Die Geschichte

Simon landet durch ein unvorsichtiges Zauberwort in Krummwald – einer Welt mit
mürrischen Wirten, geldgierigen Trödlerinnen und einem Troll, der sein eigenes
Rätsel vergessen hat. Sein spitzer Hut hängt im Nest einer Elster.
Ohne Hut geht er nicht nach Hause. So einfach ist das.

## Steuerung

Es gibt keine Verbleiste. Ein Linksklick tut das, was an dieser Stelle sinnvoll ist:
Wege werden gegangen, Leute angesprochen, Dinge aufgehoben oder bedient.

| Eingabe | Wirkung |
|---|---|
| Linksklick | Handeln (gehen, nehmen, reden, bedienen) |
| Rechtsklick | Anschauen |
| Klick während des Laufens | Weg abkürzen |
| I oder Tab | Inventarleiste festpinnen |
| J | Tagebuch mit den offenen Zielen |
| H | Hinweis (dreistufig, von vage bis konkret) |
| V | Magiesicht: interaktive Stellen kurz hervorheben |
| P | Aktuelle Szene als Pixel-Postkarte speichern |
| M | Musik an/aus |
| A | Sprite-Atlas als PNG exportieren |
| T | Tileset als PNG exportieren |

**Gegenstände benutzen:** Ein Klick auf ein Stück im Inventar nimmt es in die Hand.
Ein zweiter Klick darauf benutzt es (Buch lesen, Fackel anzünden). Klickt man
stattdessen auf etwas in der Welt, wird es damit kombiniert.

**Mobil:** Tippen = handeln, langes Drücken = anschauen. Im Hochformat dreht sich
das Bild automatisch ins Querformat; über die Schaltfläche oben rechts geht es in den Vollbildmodus.
Die Werkzeugtasten besitzen auf Touch-Geräten größere Trefferflächen. Ein violetter
Fortschrittsring zeigt an, wann ein Langdruck als „Anschauen“ erkannt wird.

Der Spielstand wird automatisch gespeichert — beim nächsten Aufruf steht
„Fortsetzen" im Titelmenü.

## Features

- **Sieben Schauplätze:** Lichtung, Dorf Krummwald, Wirtshaus, Nebelsumpf,
  Zaubererhütte, Drachenhöhle und Steinkreis
- **Minimales HUD:** kein Verbkasten, der die Hälfte des Bildes frisst – die Szene nutzt die volle Fläche
- **14 verzahnte Rätsel** ohne Sackgassen – man kann sich nicht aussperren
- **Dialogsystem** mit Antwortauswahl und fünf sprechenden Figuren
- **Sprachausgabe** über die Web Speech API – jede Figur hat ihre eigene Stimmlage
- **MP3-Soundtrack plus prozedurales Fallback:** „Mosswing Path“ läuft als Musikbett;
  wenn die Datei nicht geladen werden kann, übernimmt automatisch die Web-Audio-Musik
- **Prozedurale Soundeffekte** aus der Web Audio API
- **Hinweissystem und Tagebuch**, die den Spielstand auswerten und den nächsten Schritt nennen
- **Automatischer Spielstand** in localStorage
- **Sprite-Atlas & Tilemaps:** Figuren mit sechsphasigem Laufzyklus, 48 Deko-Objekte,
  Icons und 28 Bodenkachelarten
  werden beim Start in einen Atlas gebacken und danach als Sprites geblittet;
  benachbarte Kachelarten werden an den Kanten verzahnt
- **Atmosphäre:** Regen im Sumpf, Glühwürmchen am Steinkreis, Staub in der Hütte,
  Funken und Fledermäuse in der Höhle, Fackelschein, Vordergrund-Ebenen,
  animierte Laufspuren und Vignette
- **Magiesicht:** Taste **V** oder das Sternsymbol markiert kurz alle interaktiven
  Stellen, ohne die minimalistische Oberfläche dauerhaft zu überladen
- **Mobile Touch-Politur:** größere Werkzeugtasten, Tap-Echos, Langdruck-Fortschritt
  und kurzes haptisches Feedback auf unterstützten Geräten
- **Lebendige Kleintierwelt:** Schmetterlinge auf der Lichtung, Libellen im Sumpf
  und Motten rund um magische Lichtquellen
- **Pixel-Postkarte:** Taste **P** oder das quadratische Kamerasymbol exportiert
  die aktuelle Szene ohne HUD als 640×400-PNG
- **Auflösungsunabhängig:** 320×200-Pixelbild, das sich stufenlos an jeden Bildschirm anpasst

## Technik

Kein Build, keine Abhängigkeiten. `index.html` öffnen genügt.

| Datei | Inhalt |
|---|---|
| `index.html` | Gerüst, Skript-Loader mit Versionsstempel |
| `audio.js` | MP3-Soundtrack, Musik-Fallback, Soundsynthese, Sprachausgabe |
| `art.js` | Zeichenprimitive, Figuren, Inventar-Icons |
| `assets.js` | Sprite-Atlas, Tileset, Tilemap-Renderer, PNG-Export |
| `scenes.js` | Die sieben Hintergründe und ihre Tilemaps |
| `engine.js` | Renderer, Eingabe (Maus/Touch), Verben, Inventar, Dialoge, Skalierung |
| `game.js` | Gegenstände, Schauplätze, Rätsellogik, Dialoge, Hinweise |

Die gesamte Grafik ist Code: Es gibt keine einzige Bilddatei. Beim Start rendert
`bakeAtlas()` alle Figuren, Animationsphasen, Icons und Bodenkacheln einmalig in
ein Offscreen-Canvas und ersetzt die Zeichenfunktionen durch Blits aus diesem Atlas.
Mit Taste **A** lässt sich der fertige Atlas als PNG herunterladen; Taste **T**
exportiert zusätzlich ein sauberes Tileset mit vier Varianten pro Bodentyp.

Der Soundtrack liegt unter `assets/mosswing-path.mp3` und startet nach der ersten
Eingabe im Browser. Der Musikschalter bzw. die Taste **M** steuert MP3 und Fallback gemeinsam.

### Lokal entwickeln

Beim Ändern der Skripte entweder `BUILD` in `index.html` hochzählen oder die Seite
mit `?dev` aufrufen – dann wird der Browser-Cache umgangen.

## Lizenz

MIT – siehe [LICENSE](LICENSE).

Eigenständiges Werk, inspiriert vom Genre der klassischen Point-&-Click-Adventures.
Keine Verbindung zu bestehenden Marken oder Rechteinhabern.
