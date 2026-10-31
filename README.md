# L20R Controller & Performance Mixer

A browser-based Bluetooth controller and performance mixer for the **Zoom LiveTrak L-20R**, with a German/English interface. No build step or cloud account is required for direct Bluetooth control.

**This project is vibe coded. It is experimental software, not an official Zoom product. Use entirely at your own risk.** It can change mixer levels, EQ, effects and recording/playback settings in real time. Test it with your own setup before using it in a live show or an important recording. There is no warranty that every function works on every firmware/browser combination.

## Origin and license

This is a modified and extended version of **[PimDoos/zoom-L20-control](https://github.com/PimDoos/zoom-L20-control)**. The original project provides the foundation for the web interface, Bluetooth MIDI communication and mixer controls. Thank you to the original author and contributors.

The project retains the **Apache License 2.0**. See [LICENSE](LICENSE). This version adds the performance workflow and UI changes described below and in [AENDERUNGEN.md](AENDERUNGEN.md). It is not affiliated with, endorsed by, or supported by Zoom Corporation.

## Features

### Mixer and channel controls

- Direct Bluetooth MIDI connection to the L-20R using a compatible Zoom Bluetooth adapter, such as the BTA-1.
- Master and monitor mix tabs A–F.
- Full-width layout to view the channel strips together.
- Longer, side-by-side level meters and volume faders.
- Channel mute, solo, recording/playback selection, panning, phase and channel EQ controls where supported by the protocol.
- Per-channel FX 1 and FX 2 sends and effect-return controls.
- Channel selection highlights the matching strip across the mix views.
- Clicking a channel opens its EQ/FX settings; clicking it again closes them.
- Channel names can be edited and sent to the mixer: up to eight ASCII characters.
- Level display uses playback/post-fader data for channels set to Play and input data otherwise.
- Bluetooth messages are serialized; pending continuous-control values are coalesced to reduce backlog.

### Recorder and track modes

- Play/pause and Stop transport controls.
- Rewind and fast-forward: click for a marker/end-point jump, hold to seek, release to stop seeking.
- Current project name, position and remaining recording time display.
- Smooth **estimated hundredths** between whole-second position reports. This is a visual estimate, not frame-accurate timecode.
- Rounded time display with a green background during playback and red during recording, plus explicit status text.
- Shared **Off / Play / Record** selection for unmuted input tracks. Record here means track arming, not starting recording.
- Track mode changes require the recorder to be stopped. The app reads the mixer state and cycles REC/PLAY as necessary.
- Stereo-master playback is cleared before switching individual tracks, because the mixer excludes their playback while the stereo-master track is selected.
- Muted channels are excluded from group mode changes. No channel number is hard-coded as defective or excluded.
- A dedicated track-mode diagnostic appears in Settings above the log.

### DJ EQ performance

- Independently expandable DJ Effects block next to the track oscillator block.
- Centered DJ slider that blends the saved original main EQ toward a treble or bass target.
- Click a target button to fade there automatically; configurable fade duration, default **one second**.
- Active target buttons are highlighted in different colors.
- Fully editable target curves for all 15 graphic-EQ bands, including boosts.
- Target editing does not send changes until the target is approached.
- Center/Reset returns the EQ to its original curve and original enable state.
- Default targets emphasize frequencies above roughly 800 Hz or below roughly 400 Hz; custom curves replace those defaults.
- Target curves can be saved in the browser and in a user file.
- Main-EQ faders can be expanded to see the moving curve.

**Important:** DJ filters are approximated using the hardware's graphic EQ. Each band is limited to its available gain range (approximately −15 to +15 dB). This is not a dedicated steep high-pass/low-pass filter or a complete frequency kill.

### Track oscillators / LFOs

- Six shared sources: **two sine, two sawtooth, two smoothly varying noise** oscillators.
- Speed slider for each source: **0.2–30 seconds per cycle**, with logarithmic adjustment and a numeric readout.
- Four independently routed destinations per input track: **volume, panning, FX Send 1, FX Send 2**.
- Independent source choice, strength (0–100%) and enabled state for every route.
- New routes default to **0% strength**.
- The same source can modulate multiple destinations in sync; each destination retains its own strength.
- Volume modulation reduces the starting level; panning and FX sends move around their starting values within the control's range.
- Stopping a route restores its starting value. Manually moving its fader ends that route.
- A global Stop All control is available inside the track oscillator block.
- Compact expandable **OSC** routing underneath each input channel strip.
- Source and strength selections remain synchronized between the channel strip and the main oscillator block.
- Clicking a channel also selects it in the oscillator track selector.

### User files and language

- German/English switch in the header; language preference is stored in the browser.
- Export/import a portable **JSON user file** with source speeds, per-track routing, strengths, enabled states, DJ target curves, fade duration and language.
- Saved enabled routes resume when loaded with a Bluetooth connection. If loaded offline, they wait until the mixer is connected and its state is read.
- Import validates the complete file before applying it. Older version-1 user files remain readable; they do not contain enabled states.
- The user file is a performance preset, **not** a full mixer/project/SD-card backup. It does not contain credentials or audio.

## Getting started

1. Download or clone this repository.
2. Use a Chrome/Chromium browser with Web Bluetooth support and a compatible Bluetooth adapter on the L-20R.
3. Open `index.html` locally, or use the HTTPS-hosted version if GitHub Pages has been enabled.
4. Disconnect other apps/devices that are holding the mixer Bluetooth connection.
5. Click **Bluetooth**, select the mixer and let the app read its state.
6. Use the master/monitor tabs for mixing. Stop transport before changing track modes.
7. Open **DJ Effects** or **Track oscillators** for the performance controls.
8. Use **Settings → User file** to download a JSON preset or restore one.

No package installation, bundler or server is needed for the direct Bluetooth workflow. A browser that does not implement Web Bluetooth cannot control the mixer directly.

## What is stored where?

- Saved DJ target curves, language and selected layout preferences use browser `localStorage`.
- Oscillator configuration and active modulation live in the current session unless exported to a user JSON file.
- Exported user files are ordinary downloads that you can keep, rename and transfer yourself.
- Mixer settings are sent to the actual device; browser presets are not a replacement for the device's own project backup.

## Limitations and validation

This version was developed against an L-20R workflow. Several functions were checked interactively on the user's mixer; others have software-level checks only. It has not had comprehensive automated hardware testing.

- Bluetooth latency and throughput limit timing precision, especially with many simultaneous modulations.
- LFOs run in the browser and are not sample-accurate or tempo/timecode-synchronized. Background-tab throttling may affect them.
- Meter resolution is limited by the values supplied by the mixer.
- Transport and REC/PLAY behavior depend on recorder state, available recordings and firmware.
- The recorder Record transport button has not been fully hardware-validated in this version.
- An arbitrary project/file browser is not implemented.
- WebSocket/network client code inherited from the original remains in the source, but its UI is hidden. This repository does not include the original WebSocket server. Direct Bluetooth is the supported workflow here.
- User presets containing enabled routes can immediately change levels/pan/effect sends after connection. Check the preset and output level before loading it.

## Files

- `index.html`, `style.css`: page and layout.
- `app.js`: connection, track workflows and application state.
- `controls.js`: mixer UI, controller definitions, recorder and DJ EQ.
- `midi.js`: Bluetooth MIDI encoding/decoding and send queue.
- `performance.js`: shared LFO sources and channel routing.
- `user-settings.js`: validated JSON preset import/export.
- `i18n.js`: German/English UI translations.

---

## Deutsch

**Experimenteller, vibe-gecodeter Browser-Controller für das Zoom LiveTrak L-20R. Nutzung ausschließlich auf eigenes Risiko, ohne Gewährleistung. Kein offizielles Zoom-Produkt.**

Basis ist **[PimDoos/zoom-L20-control](https://github.com/PimDoos/zoom-L20-control)** unter Apache-2.0; die ursprüngliche Lizenz bleibt erhalten.

Die App ergänzt den Mixer um eine kompakte Transportanzeige, Kanalnamen, gemeinsame Spurmodi, frei einstellbare DJ-EQ-Zielkurven, automatische Fades und sechs gemeinsame Oszillatoren. Pro Spur lassen sich Lautstärke, Panorama und beide FX-Sends einzeln zuordnen und dosieren. Einstellungen einschließlich Ein/Aus-Zuständen können als User-JSON gespeichert und geladen werden. Oben lässt sich die Bedienoberfläche auf Deutsch oder Englisch umstellen.

`index.html` in einem Browser mit Web Bluetooth öffnen, Bluetooth verbinden und den Pultstatus einlesen lassen. Vor dem Wechsel zwischen Aus/Play/Record den Recorder stoppen. Unter Einstellungen lassen sich User-Dateien speichern und laden.

Hundertstel der Zeitanzeige sind geschätzt. DJ-Filter sind eine Annäherung mit dem grafischen EQ, kein vollständiger Frequenz-Kill. Oszillatoren laufen im Browser und sind nicht samplegenau. Bitte alle benötigten Funktionen vor einem Live-Einsatz mit dem eigenen Pult und der eigenen Firmware prüfen.
