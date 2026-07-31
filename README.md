# Simon der Zauberer – Der Fluch von Krummwald

Ein komplett neues Point-&-Click-Adventure im Stil der klassischen 90er-Jahre-Adventures.
Eigene Geschichte, eigene Rätsel, sechs Schauplätze – alles in reinem JavaScript,
ohne Framework, ohne externe Bilder oder Audiodateien.

**[▶ Im Browser spielen](https://madd1in.github.io/simon-krummwald/)**

![Pixelart-Adventure](https://img.shields.io/badge/Engine-Canvas%202D-blue) ![Keine Abhängigkeiten](https://img.shields.io/badge/Dependencies-0-brightgreen)

---

## Die Geschichte

Simon landet durch ein unvorsichtiges Zauberwort in Krummwald – einer Welt mit
mürrischen Wirten, geldgierigen Trödlerinnen und einem Troll, der sein eigenes
Rätsel vergessen hat. Sein spitzer Hut hängt im Nest einer Elster.
Ohne Hut geht er nicht nach Hause. So einfach ist das.

## Steuerung

| Eingabe | Wirkung |
|---|---|
| Linksklick | Aktion mit dem gewählten Verb ausführen |
| Rechtsklick | Schnelles „Schau an" |
| Tasten 1–6 | Verb wechseln |
| H | Hinweis (dreistufig, von vage bis konkret) |
| M | Musik an/aus |
| A | Sprite-Atlas als PNG exportieren |
| F5 | Neustart |

**Mobil:** Tippen = Aktion, langes Drücken = Anschauen. Im Hochformat dreht sich
das Bild automatisch ins Querformat; über die Schaltfläche unten rechts geht es in den Vollbildmodus.

Gegenstände kombiniert man, indem man mit dem Verb **Benutze** erst einen
Gegenstand im Inventar und dann das Ziel anklickt.

## Features

- **Sechs Schauplätze:** Lichtung, Dorf Krummwald, Nebelsumpf, Zaubererhütte, Drachenhöhle, Steinkreis
- **Klassische Verbleiste** mit Inventar, wie es sich gehört
- **14 verzahnte Rätsel** ohne Sackgassen – man kann sich nicht aussperren
- **Dialogsystem** mit Antwortauswahl und fünf sprechenden Figuren
- **Sprachausgabe** über die Web Speech API – jede Figur hat ihre eigene Stimmlage
- **Prozedurale Musik & Soundeffekte** aus der Web Audio API, pro Schauplatz ein eigener Track
- **Hinweissystem**, das den Spielstand auswertet und den nächsten sinnvollen Schritt nennt
- **Sprite-Atlas & Tilemaps:** alle Figuren, Icons und Bodenkacheln werden beim Start
  in einen Atlas gebacken und danach als Sprites geblittet
- **Auflösungsunabhängig:** 320×200-Pixelbild, das sich stufenlos an jeden Bildschirm anpasst

## Technik

Kein Build, keine Abhängigkeiten. `index.html` öffnen genügt.

| Datei | Inhalt |
|---|---|
| `index.html` | Gerüst, Skript-Loader mit Versionsstempel |
| `audio.js` | Musiksequencer, Soundsynthese, Sprachausgabe |
| `art.js` | Zeichenprimitive, Figuren, Inventar-Icons |
| `assets.js` | Sprite-Atlas, Tileset, Tilemap-Renderer, PNG-Export |
| `scenes.js` | Die sechs Hintergründe und ihre Tilemaps |
| `engine.js` | Renderer, Eingabe (Maus/Touch), Verben, Inventar, Dialoge, Skalierung |
| `game.js` | Gegenstände, Schauplätze, Rätsellogik, Dialoge, Hinweise |

Die gesamte Grafik ist Code: Es gibt keine einzige Bilddatei. Beim Start rendert
`bakeAtlas()` alle Figuren, Animationsphasen, Icons und Bodenkacheln einmalig in
ein Offscreen-Canvas und ersetzt die Zeichenfunktionen durch Blits aus diesem Atlas.
Mit Taste **A** lässt sich der fertige Atlas als PNG herunterladen.

### Lokal entwickeln

Beim Ändern der Skripte entweder `BUILD` in `index.html` hochzählen oder die Seite
mit `?dev` aufrufen – dann wird der Browser-Cache umgangen.

## Lizenz

MIT – siehe [LICENSE](LICENSE).

Eigenständiges Werk, inspiriert vom Genre der klassischen Point-&-Click-Adventures.
Keine Verbindung zu bestehenden Marken oder Rechteinhabern.
