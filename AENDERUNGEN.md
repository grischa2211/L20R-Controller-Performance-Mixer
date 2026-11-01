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


## Version 2026.11.01 — 2026-11-01

- **REC korrigiert:** Der Transport-Record-Button sendet MIDI CC 87, Kanal 10, Wert 3 statt an den reinen Statuskanal 9. Der Firmware-Empfänger entspricht der physischen REC-Taste. REC bereitet die Aufnahme vor, Play startet sie.
- **Masterspur wieder sichtbar:** Aus/Play/Record direkt unter dem Master-Fader. Für reine Summenaufnahme Einzelspuren auf Aus und Master auf Record stellen.
- **Bestätigte Spurmodi:** Auch die Master-Auswahl nutzt Rücklesen und zyklische Tastendrücke; explizite Master-Play-Auswahl wird nicht durch die Einzelspur-Logik aufgehoben.
- **Prüfung:** JavaScript-Syntax und simulierte REC-Befehlsfolge (BLE `80 80 B9 57 03`) sowie Master-Play-Rückmeldung geprüft. Aufnahme am echten Gerät noch nicht bestätigt.

### English

- Fixed transport REC: MIDI CC 87, channel 10, value 3 now reaches the firmware's physical REC handler instead of writing to status channel 9. REC prepares recording; Play starts it.
- Restored Off/Play/Record below the master fader. For stereo-only recording, set input tracks to Off and master to Record.
- Master selection uses device feedback and cycling; explicit master playback is exempt from the individual-track playback clearing logic.
- Validated JavaScript syntax, simulated REC packet and master-play feedback. Actual hardware recording remains unverified.
