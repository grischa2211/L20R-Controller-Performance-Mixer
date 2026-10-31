# Änderungen gegenüber zoom-L20-control

Basis: https://github.com/PimDoos/zoom-L20-control — Apache-2.0, siehe LICENSE.

Diese Version wurde mit KI-Unterstützung („vibe coded“) iterativ erweitert. Nutzung auf eigenes Risiko. Die vollständige Funktionsübersicht und Grenzen stehen in README.md.

- Neuer Name: L20R Controller & Performance Mixer; Deutsch/English-Umschaltung.
- Kompakte Kopfzeile mit Recorder, großer farbiger Positionsanzeige und gemeinsamen Spurmodi.
- Längere Fader und Pegelanzeigen nebeneinander; vollständige Kanalübersicht.
- Aufklappbare Kanal-EQ-/FX-Einstellungen, Kanalnamen-Übertragung und verknüpfte Auswahl.
- Recorder-Play/Stop und echte REW/FF-Befehle mit Halten/Wiederholen/Loslassen. Der frühere experimentelle doppelte Stopp wurde entfernt.
- Spurmodi mit Rücklesen und Berücksichtigung der gegenseitigen Sperre von Stereo-Master- und Einzelspurwiedergabe.
- Bluetooth-Sendewarteschlange und Zusammenfassung ausstehender kontinuierlicher Werte.
- Frei speicherbare DJ-EQ-Zielkurven und zeitgesteuerte Fades.
- Sechs gemeinsame LFOs mit unabhängigen Routen für Lautstärke, Panorama und beide FX-Sends je Spur, auch direkt unter den Fadern.
- User-JSON-Dateien einschließlich Aktivierungszuständen; ältere Dateien bleiben lesbar.
- Netzwerk-/Sharing-UI ausgeblendet, kein automatischer WebSocket-Aufbau ohne explizite Server-Konfiguration.

Firmware-Binärdateien, persönliche User-Presets und lokale Analyseartefakte gehören nicht zum veröffentlichten Repository.
