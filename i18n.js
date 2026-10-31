// Modified/extended from PimDoos/zoom-L20-control; see AENDERUNGEN.md and LICENSE.
// UI-only translations; MIDI identifiers and user-defined channel/project names stay unchanged.
var i18n = {
    language:'de',
    pairs:[
        ['User-Datei geladen. Gespeicherte Aktivierungen wiederhergestellt.','User file loaded. Saved activations restored.'],
        ['User-Datei geladen. Aktivierungen warten auf Bluetooth-Verbindung.','User file loaded. Activations are waiting for Bluetooth.'],
        ['User-Datei','User file'],['User-Datei speichern','Save user file'],['User-Datei laden','Load user file'],
        ['Oszillatoren, DJ-Zielkurven, Fade-Dauer und Sprache.','Oscillators, DJ target curves, fade duration and language.'],
        ['User-Datei gespeichert (Download).','User file saved (download).'],['User-Datei geladen. Oszillatoren bleiben ausgeschaltet.','User file loaded. Oscillators remain off.'],
        ['Datei konnte nicht geladen werden.','Could not load file.'],['Ungültige User-Datei.','Invalid user file.'],
        ['Aus','Off'],['Play','Play'],['Record','Record'],['Ungemutete Spuren','Unmuted tracks'],
        ['Record stellt die Spuren nur auf Aufnahmebereitschaft.','Record only arms the tracks for recording.'],
        ['Einstellungen','Settings'],['Mischer-Einstellungen','Mixer Settings'],['Raum','Room'],['Raum-ID','Room ID'],
        ['Pegelanzeigen aktivieren','Enable Peaks'],['Pultstatus abrufen','Fetch Patch'],['Protokoll','Log'],
        ['Volle Breite (alle Kanäle ohne Scrollen)','Full width (show all channels without scrolling)'],
        ['Layout','Layout'],['Name','Name'],['Deine Farbe','Your color'],
        ['Kanal-Einstellungen · EQ & FX','Channel settings · EQ & FX'],['Kanalname','Channel name'],
        ['Kanalname (maximal 8 Zeichen)','Channel name (up to 8 characters)'],['Übertragen','Send to mixer'],
        ['Höhenpegel','high gain'],['Mittenpegel','mid gain'],['Mittenfrequenz','mid frequency'],['Basspegel','low gain'],['Hochpass','low cut'],['EQ AUS','EQ OFF'],['Typ','Type'],['Panorama','Pan'],
        ['Invert Phase','Invert Phase'],['Polarität','Polarity'],['Hochpass','Low cut'],
        ['DJ Effekte','DJ Effects'],['Höhen-Ziel','Treble target'],['Bass-Ziel','Bass target'],['Mitte / Reset','Center / Reset'],
        ['Neutral','Neutral'],['Fade (s)','Fade (s)'],['DJ-Fade-Dauer in Sekunden','DJ fade duration in seconds'],
        ['Mitte: ursprünglicher EQ · Links/rechts: frei gespeicherte Zielkurven.','Center: original EQ · Left/right: saved target curves.'],
        ['Zielkurven selbst einstellen','Customize target curves'],['DJ-Zielkurve bearbeiten','Edit DJ target curve'],
        ['Höhen-Ziel (links)','Treble target (left)'],['Bass-Ziel (rechts)','Bass target (right)'],
        ['Bearbeitet nur die Zielkurve. 0 % = −15 dB, 50 % = 0 dB, 100 % = +15 dB. Übertragung erst beim Anfahren.','Edits the target only. 0% = −15 dB, 50% = 0 dB, 100% = +15 dB. Sent when the fade runs.'],
        ['Zielkurve speichern','Save target curve'],['Zielkurve im Browser gespeichert.','Target curve saved in this browser.'],
        ['Zielkurve für diese Sitzung gespeichert.','Target curve saved for this session.'],['EQ-Fader anzeigen','Show EQ faders'],
        ['Oszillatoren für Lautstärke, Panorama und FX-Sends','Oscillators for volume, panning and FX sends'],
        ['Spur-Oszillatoren','Track oscillators'],['Lautstärke','Volume'],['Panorama','Panning'],
        ['Sinus 1','Sine 1'],['Sinus 2','Sine 2'],['Sägezahn 1','Sawtooth 1'],['Sägezahn 2','Sawtooth 2'],
        ['Noise 1','Noise 1'],['Noise 2','Noise 2'],['FX-Send 1','FX Send 1'],['FX-Send 2','FX Send 2'],
        ['s / Zyklus','s / cycle'],['Spur für Oszillatoren','Oscillator track'],['Alle Oszillatoren stoppen','Stop all oscillators'],
        ['Pro Regler separat. Lautstärke wird nur abgesenkt; Panorama und FX-Sends bewegen sich um den Ausgangswert. Stoppen stellt ihn wieder her.','Independent per control. Volume only decreases; panning and FX sends move around the starting value. Stop restores it.'],
        ['Zum Ändern des Spurmodus zuerst stoppen.','Stop playback before changing track mode.'],
        ['Spurmodus benötigt die direkte Bluetooth-Verbindung.','Track mode requires a direct Bluetooth connection.'],
        ['Keine ungemuteten Spuren ausgewählt.','No unmuted tracks selected.'],
        ['Zuerst direkt per Bluetooth verbinden.','Connect directly via Bluetooth first.'],
        ['Name wird übertragen …','Sending channel name …'],['Warte auf Übernahme des Namens …','Waiting for the mixer to accept the name …'],
        ['Vom Pult bestätigt.','Confirmed by the mixer.'],['Übernahme nicht bestätigt: keine Namensrückmeldung vom Pult.','Not confirmed: no channel-name response from the mixer.'],
        ['Bitte 1–8 Zeichen ohne Umlaute oder Emoji verwenden.','Use 1–8 ASCII characters, without accented letters or emoji.'],
        ['Ungültiger Kanal','Invalid channel'],['Bluetooth-Verbindung fehlt.','Bluetooth connection unavailable.'],
        ['▶ Läuft','▶ Playing'],['● Aufnahme','● Recording'],['Ⅱ Pause','Ⅱ Paused'],['● Aufnahmebereit','● Armed'],['■ Stopp','■ Stopped'],['Nicht verbunden','Disconnected'],
        ['▶ Läuft · Positionssignal fehlt','▶ Playing · Position signal missing'],['● Aufnahme · Positionssignal fehlt','● Recording · Position signal missing'],
        ['Hundertstel sind geschätzt; die Sekunden werden vom L-20R synchronisiert.','Hundredths are estimated; seconds are synchronized from the L-20R.'],
        ['Klicken: vorherige Marke / Anfang · Gedrückt halten: zurückspulen','Click: previous marker / beginning · Hold: rewind'],
        ['Klicken: nächste Marke / Ende · Gedrückt halten: vorspulen','Click: next marker / end · Hold: fast forward'],
        ['Zurückspulen (REW)','Rewind (REW)'],['Vorspulen (FF)','Fast forward (FF)'],
        ['DJ-Filter: links gespeichertes Höhen-Ziel, Mitte ursprünglicher EQ, rechts gespeichertes Bass-Ziel','DJ filter: left saved treble target, center original EQ, right saved bass target'],
        ['Spurmodus: noch kein Umschaltversuch.','Track mode: no request yet.'],
        ['ON','ON'],['Mute','Mute'],['Solo','Solo'],['off','Off'],['play','Play'],['record','Record']
    ],
    text(value){
        let trimmed=value.trim();if(!trimmed)return value;
        const aliases={off:'Aus',play:'Play',record:'Record'};
        if(aliases[trimmed])trimmed=aliases[trimmed];
        for(const [de,en] of this.pairs){if(trimmed===de||trimmed===en)return value.replace(value.trim(),this.language==='de'?de:en)}
        let m;
        if(this.language==='en'){
            if((m=trimmed.match(/^Aktive Modulationen: (\d+)$/)))return `Active modulations: ${m[1]}`;
            if((m=trimmed.match(/^(\d+) Aus · (\d+) Play · (\d+) aufnahmebereit$/)))return `${m[1]} Off · ${m[2]} Play · ${m[3]} armed`;
            if((m=trimmed.match(/^(Aus|Play|Record) wird angefordert …$/)))return `${m[1]==='Aus'?'Off':m[1]} requested …`;
            if((m=trimmed.match(/^(Höhen-Ziel|Bass-Ziel) · (\d+) %$/)))return `${m[1]==='Höhen-Ziel'?'Treble target':'Bass target'} · ${m[2]} %`;
            if((m=trimmed.match(/^Nicht übernommen: Pult meldet weiterhin „(.*)“\.$/)))return `Not applied: the mixer still reports “${m[1]}”.`;
            if((m=trimmed.match(/^Zielpegel (\d+) Hz$/)))return `Target level ${m[1]} Hz`;
            if((m=trimmed.match(/^(.*): Zyklus in Sekunden$/)))return this.text(m[1])+': Cycle in seconds';
            if((m=trimmed.match(/^(.*): Stärke$/)))return this.text(m[1])+': Depth';
            if((m=trimmed.match(/^(.*): Oszillator$/)))return this.text(m[1])+': Oscillator';
        }else{
            if((m=trimmed.match(/^Active modulations: (\d+)$/)))return `Aktive Modulationen: ${m[1]}`;
            if((m=trimmed.match(/^(\d+) Off · (\d+) Play · (\d+) armed$/)))return `${m[1]} Aus · ${m[2]} Play · ${m[3]} aufnahmebereit`;
            if((m=trimmed.match(/^(Off|Play|Record) requested …$/)))return `${m[1]==='Off'?'Aus':m[1]} wird angefordert …`;
            if((m=trimmed.match(/^(Treble target|Bass target) · (\d+) %$/)))return `${m[1]==='Treble target'?'Höhen-Ziel':'Bass-Ziel'} · ${m[2]} %`;
            if((m=trimmed.match(/^Not applied: the mixer still reports “(.*)”\.$/)))return `Nicht übernommen: Pult meldet weiterhin „${m[1]}“.`;
            if((m=trimmed.match(/^Target level (\d+) Hz$/)))return `Zielpegel ${m[1]} Hz`;
            if((m=trimmed.match(/^(.*): Cycle in seconds$/)))return this.text(m[1])+': Zyklus in Sekunden';
            if((m=trimmed.match(/^(.*): Depth$/)))return this.text(m[1])+': Stärke';
            if((m=trimmed.match(/^(.*): Oscillator$/)))return this.text(m[1])+': Oszillator';
        }
        return value;
    },
    protected(element){return element&&element.closest('script,style,textarea,.lfo-track-select,.channel-strip > .label,.recorder > .title,.inspector .controls > .label')},
    apply(node){
        if(!node)return;
        if(node.nodeType===3){if(!this.protected(node.parentElement)){const translated=this.text(node.nodeValue);if(translated!==node.nodeValue)node.nodeValue=translated}return}
        if(node.nodeType!==1||this.protected(node))return;
        for(const attr of ['title','placeholder','aria-label']){const value=node.getAttribute(attr);if(value){const translated=this.text(value);if(value!==translated)node.setAttribute(attr,translated)}}
        for(const child of node.childNodes)this.apply(child);
    },
    setLanguage(language){
        this.language=language==='en'?'en':'de';document.documentElement.lang=this.language;
        try{localStorage.setItem('l20.language',this.language)}catch(error){}
        document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===this.language)));
        this.apply(document.body);
    }
};
try{i18n.language=localStorage.getItem('l20.language')==='en'?'en':'de'}catch(error){}
document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>i18n.setLanguage(button.dataset.language)));
i18n.setLanguage(i18n.language);
const languageObserver=new MutationObserver(records=>{
    for(const record of records){
        if(record.type==='characterData')i18n.apply(record.target);
        else if(record.type==='attributes')i18n.apply(record.target);
        else for(const node of record.addedNodes)i18n.apply(node);
    }
});
languageObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']});
