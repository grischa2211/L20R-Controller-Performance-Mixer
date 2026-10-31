// Modified/extended from PimDoos/zoom-L20-control; see AENDERUNGEN.md and LICENSE.
const MIDI_SERVICE_UID            = '03B80E5A-EDE8-4B33-A751-6CE34EC4C700'.toLowerCase();
const MIDI_IO_CHARACTERISTIC_UID  = '7772E5DB-3868-4112-A1A9-F2669D106BF3'.toLowerCase();

var app = {
    elements:{
        bleConnectButton: document.getElementById("ble_connect"),
        wsConnectButton: document.getElementById("ws_connect"),
        shareButton: document.getElementById("share_link"),

        log: document.getElementById("log"),
        roomId: document.getElementById("room_id"),
        nick: document.getElementById("nick"),
        color: document.getElementById("color"),
        enablePeaks: document.getElementById('peaks_enabled'),
        peers: document.getElementById("peers"),
    },
    bleMidi: {},
    map: {},
    connectivity: {
        bleConnected: false,
        wsConnected: false,
    }
};

app.log = function(message){
    var log = app.elements.log;
    var lines = log.value ? log.value.split("\n") : [];
    lines.push(message);
    if(lines.length > 100){
        lines = lines.slice(lines.length - 100);
    }
    log.value = lines.join("\n");
    log.scrollTop = log.scrollHeight;
}

app.setStatus = function(kind, status){
    if(kind === 'ws' && app.elements.wsConnectButton){    
        app.elements.wsConnectButton.dataset["status"] = status;
        app.connectivity.wsConnected = status == "connected";
    } 
    if(kind === 'ble' && app.elements.bleConnectButton){
        if(status == 'connected') app.setRole('host');
        else app.setRole('client');
        app.elements.bleConnectButton.dataset["status"] = status;
        app.connectivity.bleConnected = status == "connected";
    }
    if(app.connectivity.bleConnected || app.connectivity.wsConnected){
        setControlsEnabled(true);
    } else {
        setControlsEnabled(false);
    }
    if(typeof modulation !== "undefined") modulation.updateStatus();
}
app.recordArmPending = null;
app.recordArmReported = new Map();
app.recordArmChannels = () => Object.values(buses.master ? buses.master.strips : {}).filter(strip =>
    Number.isInteger(strip.channel) && strip.recordController && strip.muteController &&
    Number(strip.muteController.value) === 0);
app.updateRecordingArmSwitch = function(controlId, source){
    if((source === "midi" || source === "ws") && controlId && controls.map[controlId]){
        app.recordArmReported.set(controlId, Number(controls.map[controlId].value));
    }
    const channels = app.recordArmChannels();
    const counts = [0, 0, 0];
    for(const strip of channels){
        const state = app.recordArmReported.get(strip.recordController.id);
        if(state >= 0 && state <= 2) counts[state]++;
    }
    const pending = app.recordArmPending;
    const mode = pending ? pending.mode : counts.findIndex(n => channels.length > 0 && n === channels.length);
    document.querySelectorAll("[data-track-mode]").forEach(button => {
        button.disabled = !app.connectivity.bleConnected || Number(recorder.transportControl.value) !== 0;
        button.setAttribute("aria-pressed", String(Number(button.dataset.trackMode) === mode));
    });
    const label = document.getElementById("track_mode_status");
    if(label){
        label.textContent = pending ? `${["Aus", "Play", "Record"][pending.mode]} wird angefordert …` :
            `${counts[0]} Aus · ${counts[1]} Play · ${counts[2]} aufnahmebereit`;
    }
}
app.trackModeDiagnostic = function(message){
    app.log("[Spurmodus] " + message);
    const diagnostic = document.getElementById("track_mode_diagnostic");
    if(diagnostic) diagnostic.textContent = message;
}
app.finishRecordingArmRefresh = function(){
    const pending = app.recordArmPending;
    if(!pending || !pending.awaitingPatch) return;
    clearTimeout(pending.timeout);
    pending.awaitingPatch = false;
    // MASTER REC/PLAY=Play excludes all individual channel playback, even
    // when transport is stopped. Resolve that hidden state before the group.
    const masterMode = Number(controls.map.master_record.value);
    if(masterMode === 1 || pending.clearingMaster){
        if(masterMode !== 0){
            pending.clearingMaster = true;
            pending.masterRounds = (pending.masterRounds || 0) + 1;
            if(pending.masterRounds > 3){
                app.recordArmPending = null;
                app.updateRecordingArmSwitch();
                app.trackModeDiagnostic("Stereo-Masterwiedergabe konnte nicht ausgeschaltet werden; Einzelspuren bleiben unverändert.");
                return;
            }
            const master = controls.map.master_record;
            midi.sendMessage(midi.createControlChangeMessage(master.channel, master.controller_number, 2));
            app.trackModeDiagnostic("Stereo-Masterwiedergabe ausschalten; anschließend Einzelspuren umstellen.");
            pending.poll = setTimeout(() => app.requestTrackModeState(pending), 350);
            return;
        }
        pending.clearingMaster = false;
        pending.round = 0;
    }
    const missing = [...pending.targets].filter(([id, value]) => app.recordArmReported.get(id) !== value);
    if(!missing.length){
        app.recordArmPending = null; app.updateRecordingArmSwitch();
        app.trackModeDiagnostic(`Bestätigt: ${["Aus", "Play", "Record"][pending.mode]} für ${pending.targets.size} Spuren.`);
        return;
    }
    if(pending.round >= 3){
        app.recordArmPending = null;
        app.updateRecordingArmSwitch();
        document.getElementById("track_mode_status").textContent += " · Zielmodus nicht für alle Spuren verfügbar";
        app.trackModeDiagnostic("Nicht übernommen: " + missing.map(([id, expected]) => `${id}: Soll ${expected}, Ist ${app.recordArmReported.get(id)}`).join("; "));
        return;
    }
    app.sendTrackModeRound(pending, missing);
}
app.requestTrackModeState = function(pending){
    if(app.recordArmPending !== pending) return;
    // Queue the read behind the preceding commands. Waiting for an empty
    // queue can starve forever while an oscillator continuously sends faders.
    pending.awaitingPatch = true;
    midi.commands.patch_request();
    pending.timeout = setTimeout(() => {
        if(app.recordArmPending !== pending) return;
        app.recordArmPending = null;
        app.updateRecordingArmSwitch();
        document.getElementById("track_mode_status").textContent += " · Keine vollständige Pult-Rückmeldung";
        app.trackModeDiagnostic("Zeitüberschreitung: keine vollständige Pult-Rückmeldung.");
    }, 4000);
}
app.sendTrackModeRound = function(pending, missing){
    if(app.recordArmPending !== pending) return;
    if(Number(recorder.transportControl.value) !== 0){
        app.recordArmPending = null;
        app.updateRecordingArmSwitch();
        return;
    }
    pending.round++;
    app.trackModeDiagnostic(`${["Aus", "Play", "Record"][pending.mode]}: Tastendruck ${pending.round}/3 für ${missing.length} Spuren; Pultstatus ${Number(recorder.transportControl.value)}.`);
    for(const [id] of missing){
        const control = controls.map[id];
        // CC8/9 triggers REC/PLAY cycling. Never pretend this is a direct setter.
        midi.sendMessage(midi.createControlChangeMessage(control.channel, control.controller_number, 2));
    }
    pending.poll = setTimeout(() => app.requestTrackModeState(pending), 350);
}
app.setUnmutedTrackMode = function(mode, ids = null){
    mode = Number(mode);
    if(![0, 1, 2].includes(mode)) return;
    const label = document.getElementById("track_mode_status");
    if(Number(recorder.transportControl.value) !== 0){
        app.updateRecordingArmSwitch();
        if(label) label.textContent = "Zum Ändern des Spurmodus zuerst stoppen.";
        app.trackModeDiagnostic(`Blockiert: Recorder meldet Status ${recorder.transportControl.value} (${recorder.transportControl.mapping[Number(recorder.transportControl.value)] || "unbekannt"}).`);
        return;
    }
    if(!app.connectivity.bleConnected){
        if(label) label.textContent = "Spurmodus benötigt die direkte Bluetooth-Verbindung.";
        app.trackModeDiagnostic("Blockiert: keine direkte Bluetooth-Verbindung.");
        return;
    }
    const previous = app.recordArmPending;
    if(previous){ clearTimeout(previous.poll); clearTimeout(previous.timeout); }
    const selected = ids || app.recordArmChannels().map(strip => strip.recordController.id);
    const targets = new Map(selected.map(id => [id, mode]));
    if(!targets.size){
        app.recordArmPending = null;
        app.updateRecordingArmSwitch();
        if(label) label.textContent = "Keine ungemuteten Spuren ausgewählt.";
        app.trackModeDiagnostic("Blockiert: keine ungemuteten Spuren ausgewählt.");
        return;
    }
    // Always read before the first pulse, including after a rapid change of target.
    const pending = {mode, targets, round: 0, awaitingPatch: false};
    app.recordArmPending = pending;
    app.trackModeDiagnostic(`Anforderung ${["Aus", "Play", "Record"][mode]} für ${targets.size} Spuren. Pultstatus ${recorder.transportControl.value}; lese Ist-Zustand.`);
    app.updateRecordingArmSwitch();
    app.requestTrackModeState(pending);
}


app.channelNamePending = new Map();
app.renameChannel = function(channel, name, status){
    if(!app.connectivity.bleConnected){ status.textContent = "Zuerst direkt per Bluetooth verbinden."; return; }
    name = name.trim();
    try {
        if(!midi.commands.rename_channel(channel, name)) throw new Error("Bluetooth-Verbindung fehlt.");
        const previous = app.channelNamePending.get(channel);
        if(previous){ clearTimeout(previous.poll); clearTimeout(previous.timeout); }
        const pending = {name, status};
        app.channelNamePending.set(channel, pending);
        status.textContent = "Name wird übertragen …";
        const refresh = () => {
            if(app.channelNamePending.get(channel) !== pending) return;
            if(midi.sending || midi.sendQueue.length){ pending.poll = setTimeout(refresh, 50); return; }
            midi.commands.patch_request();
            pending.poll = setTimeout(refresh, 400);
        };
        pending.poll = setTimeout(refresh, 100);
        pending.timeout = setTimeout(() => {
            if(app.channelNamePending.get(channel) !== pending) return;
            clearTimeout(pending.poll);
            app.channelNamePending.delete(channel);
            status.textContent = pending.lastName !== undefined ?
                `Nicht übernommen: Pult meldet weiterhin „${pending.lastName}“.` :
                "Übernahme nicht bestätigt: keine Namensrückmeldung vom Pult.";
        }, 4000);
    } catch(error){ status.textContent = error.message; }
}
app.confirmChannelName = function(channel, name){
    const pending = app.channelNamePending.get(channel);
    if(!pending) return;
    pending.lastName = name;
    if(name !== pending.name){
        pending.status.textContent = "Warte auf Übernahme des Namens …";
        return;
    }
    clearTimeout(pending.poll);
    clearTimeout(pending.timeout);
    app.channelNamePending.delete(channel);
    pending.status.textContent = "Vom Pult bestätigt.";
}

app.setRole = function(role){
    app.role = role;
    if(app.ws){
        app.wsSend({type:'role', role: app.role, nick: app.nick, color: app.color});
        if(app.role == 'host'){
            app.wsSendFullState();
        }
    }
}

// WebSocket networking helpers
app.ws = null;
app.role = 'client';
app.roomId = self.crypto.randomUUID();
if(location.host && location.hostname !== 'localhost'){
    app.wsBaseUrl = `wss://${location.host}/ws`;
} else {
    app.wsBaseUrl = 'ws://127.0.0.1:8081/ws';
}

app.nick = '';
app.color = '#00aaff';

app.wsSend = function(obj){
    if(!app.ws || app.ws.readyState !== WebSocket.OPEN) return;
    try{
        app.ws.send(JSON.stringify(obj));
    } catch(e){
        app.log('WS send error: ' + e);
    }
}
app.wsSendFullState = function(){
    let message = {
        type: "full_state",
        state: {},
        strips: {}
    }
    for(let control_id in controls.map){
        message.state[control_id] = controls.map[control_id].value;
    }
    for(let strip_id in strips){
        message.strips[strip_id] = {
            displayName: strips[strip_id].displayName,
            color: strips[strip_id].color,
        }
    }
    app.wsSend(message);
}
app.wsSendMeter = function(channelPeak, channelSignal, channelClip){
    // Rate limit to 2 Hz
    if(!app.lastMeterSendTime) app.lastMeterSendTime = 0;
    let now = Date.now();
    if(now - app.lastMeterSendTime < 500) return;
    app.lastMeterSendTime = now;

    let message = {
        type: "meter",
        peaks: channelPeak,
        signal: channelSignal,
        clip: channelClip,
    }
    app.wsSend(message);
}

app.handleWsMessage = function(event){
    try{
        let message = JSON.parse(event.data);
        if(message.type === 'control'){
            let control = controls.map[message.id];
            if(control){
                // Write to control
                control.writeValue(message.value, "ws");
            }
        } else if(message.type == "request_state"){
            app.wsSendFullState();
        } else if(message.type == 'full_state'){
            // apply full state
            for(let control_id in message.state){
                let value = message.state[control_id];
                let control = controls.map[control_id];
                control.updateValue(value, "ws");
            }
            for(let strip_id in message.strips){
                let strip = strips[strip_id];
                strip.updateDisplayName(message.strips[strip_id].displayName);
                strip.updateColor(message.strips[strip_id].color);
            }
        } else if(message.type === 'peers'){
            if(Array.isArray(message.peers)){
                app.updatePeersUI(message.peers);
            }
        } else if(message.type == 'meter'){
            updateMeters(message.peaks, message.signal, message.clip);
        }
    } catch(e){
        app.log('WS message parse error: ' + e);
    }
}

app.wsConnect = function(){
    app.setStatus('ws', 'connecting');

    try {
        app.wsUrl = app.wsBaseUrl + '/' + app.roomId;
    } catch(e){
        app.setStatus('ws','error');
        app.log('WebSocket URL build failed: ' + e);
        return;
    }
    try {
        app.ws = new WebSocket(app.wsUrl);
        app.ws.addEventListener('open', () => {
            app.setStatus('ws', 'connected');
            app.log('WebSocket connected to ' + app.wsUrl + ' as ' + app.role);
            app.wsSend({type:'role', role: app.role, nick: app.nick, color: app.color});
            // If client, request state
            if(app.role === 'client'){
                app.wsSend({type:'request_state'});
            } else if (app.role == 'host'){
                app.wsSendFullState();
            }
        });
        app.wsRetryCount = 0;
        app.ws.addEventListener('message', app.handleWsMessage);
        app.ws.addEventListener('close', () => { 
            app.setStatus('ws','disconnected'); app.log('WebSocket closed'); 
            app.updatePeersUI([]);
        });
        app.ws.addEventListener('error', (e) => { 
            app.setStatus('ws','error'); app.log('WebSocket error'); 
            app.updatePeersUI([]);
            if(app.wsAuto && app.wsRetryCount < 5){
                setTimeout(app.wsConnect, 1000 * Math.pow(2, app.wsRetryCount));
                app.wsRetryCount++;
            }
        });
    } catch(e){
        app.setStatus('ws','error');
        app.log('WebSocket connect error: ' + e);
    }
}
app.wsDisconnect = function(){
    if(app.ws){
        app.ws.close();
        app.elements.peers.innerHTML = '';
    }
    app.ws = null;
}
app.elements.wsConnectButton.addEventListener('click', function(){
    if(!app.connectivity.wsConnected){
        app.wsConnect();
    } else {
        app.wsDisconnect();
    }
});

app.bleConnect = function(){
    app.log("Connecting...");
    app.setStatus('ble','connecting');

    // Connect to BLE Midi device (with MIDI service UUID)
    navigator.bluetooth.requestDevice({
        filters: [{ services: [
            MIDI_SERVICE_UID
        ] }]
    })
    .then(device => {
        app.log("Device found: " + device.name);
        app.bleMidi.device = device;
        device.addEventListener('gattserverdisconnected', app.bleHandleDisconnected);
        return device.gatt.connect();
    })
    .then(server => {
        app.log("Connected to GATT server");
        return server.getPrimaryService(MIDI_SERVICE_UID);
    })
    .then(service => {
        app.log("MIDI service found");
        return service.getCharacteristic(MIDI_IO_CHARACTERISTIC_UID);
    })
    .then(characteristic => {
        app.log("MIDI characteristic found");
        app.bleMidi.characteristic = characteristic;
        return characteristic.startNotifications();
    })
    .then(() => {
        app.log("Notifications started");
        app.bleMidi.characteristic.addEventListener('characteristicvaluechanged', midi.handleData);
        app.setStatus('ble','connected');
        midi.commands.patch_request();
    })
    .then(() => {
        if(app.peaksEnabled){
            midi.commands.peaks_start();
        }
    })
    .catch(error => {
        app.log("Error: " + error);
        app.setStatus('ble','error');
    });
}

app.bleHandleDisconnected = function(){
    const characteristic = app.bleMidi && app.bleMidi.characteristic;
    if(characteristic){
        characteristic.removeEventListener('characteristicvaluechanged', midi.handleData);
    }
    if(typeof modulation !== "undefined") modulation.stopAll(false);
    app.bleMidi.characteristic = null;
    if(app.recordArmPending){ clearTimeout(app.recordArmPending.poll); app.recordArmPending = null; }
    app.updateRecordingArmSwitch();
    midi.sendQueue = [];
    app.setStatus('ble', 'disconnected');
}
app.bleDisconnect = function(){
    if(typeof modulation !== "undefined") modulation.stopAll();
    const characteristic = app.bleMidi && app.bleMidi.characteristic;
    const device = app.bleMidi.device ||
        (characteristic && characteristic.service && characteristic.service.device);
    try {
        if(device && device.gatt) device.gatt.disconnect();
        if(device && device.gatt && device.gatt.connected){
            throw new Error("Bluetooth connection is still active");
        }
        app.bleHandleDisconnected();
        app.log("Bluetooth disconnected");
    } catch(error){
        app.log("Bluetooth disconnect failed: " + error.message);
        app.setStatus('ble', 'error');
    }
}
app.elements.bleConnectButton.addEventListener('click', function(){
    if(!app.connectivity.bleConnected){
        app.bleConnect();
    } else {
        app.bleDisconnect();
    }
});

// Read parameters from location.hash (format: #foo=bar&foo2=bar2)
app.readHashParams = function(){
    let params = {};
    try{
        let raw = (location.hash || '').replace(/^#\/?/, '');
        if(!raw) return params;
        raw.split('&').forEach(pair => {
            if(!pair) return;
            let parts = pair.split('=');
            let key = decodeURIComponent(parts[0] || '');
            let value = decodeURIComponent(parts.slice(1).join('=') || '');
            if(key) params[key] = value;
        });
        // Supported params: room
        if(params.room){
            app.roomId = params.room;
        }
    } catch(e){
        app.log('Error parsing hash params: ' + e);
    }
    return params;
}

app.load = function(){
    app.setStatus("ble","disconnected");
    app.setStatus("ws","disconnected");

    
    if(app.elements.shareButton){
        let shareData = {
            title: 'Zoom L20 Control',
            text: 'Join my Zoom L20 Control room: ' + app.roomId,
            url: location.origin + location.pathname + '#room=' + encodeURIComponent(app.roomId),
        };
        
        if(navigator.canShare && navigator.canShare(shareData)){
            app.elements.shareButton.dataset["canshare"] = true;
            app.elements.shareButton.addEventListener('click', function(){
                // Re-create shareData in case roomId has changed
                let shareData = {
                    title: 'Zoom L20 Control',
                    text: 'Join my Zoom L20 Control room: ' + app.roomId,
                    url: location.origin + location.pathname + '#room=' + encodeURIComponent(app.roomId),
                };
                navigator.share(shareData).catch(e => {
                    app.log('Error sharing: ' + e);
                });
            });
        } else {
            app.elements.shareButton.dataset["canshare"] = false;
        }
    }
    
    let main = document.querySelector("main");

    /* Recorder */
    let recorderContainer = recorder.createElement();
    const topbar = document.querySelector(".topbar");
    topbar.insertBefore(recorderContainer, document.querySelector(".track-mode-panel"));
    
    /* Channel settings and EQ stay collapsed until explicitly opened. */
    const channelSettings = document.createElement("details");
    channelSettings.classList.add("channel-settings");
    const channelSettingsSummary = document.createElement("summary");
    channelSettingsSummary.textContent = "Kanal-Einstellungen · EQ & FX";
    channelSettings.appendChild(channelSettingsSummary);
    const channelSettingsContent = document.createElement("div");
    channelSettingsContent.classList.add("channel-settings-content");
    let inspectorElement = inspector.createElement();
    channelSettingsContent.appendChild(inspectorElement);
    channelSettings.appendChild(channelSettingsContent);
    main.appendChild(channelSettings);


    /* Buses / Channel strips */
    let busTabsContainer = document.createElement("div");
    busTabsContainer.id = "bus-tabs";

    let busTabBar = document.createElement("div");
    busTabBar.id = "bus-tab-bar";
    busTabsContainer.appendChild(busTabBar);
    const performancePanels = document.createElement("div");
    performancePanels.id = "performance-panels";
    const djEffectsPanel = graphic_eq.createDJControls();
    const trackOscillatorsPanel = document.createElement("div");
    trackOscillatorsPanel.id = "track-oscillators-panel";
    trackOscillatorsPanel.hidden = true;
    performancePanels.appendChild(djEffectsPanel);
    performancePanels.appendChild(trackOscillatorsPanel);
    busTabsContainer.appendChild(performancePanels);

    let isFirst = true;
    for(const bus_id in buses){

        let bus = buses[bus_id];
        let busElement = bus.createElement();
        busElement.classList.add("bus-tab-panel");
        
        busTabsContainer.appendChild(busElement);

        let stripContainer = bus.stripsContainer;
        for(const strip_id in bus.strips){
            let strip = bus.strips[strip_id];
            let stripElement = strip.createElement();
            if(strip.id == bus.id) stripElement.classList.add("master");
            else if(strip.id.indexOf("efx") != -1) stripElement.classList.add("effect");
            stripContainer.appendChild(stripElement);
        }

        let tabButton = document.createElement("button");
        tabButton.classList.add("bus-tab-btn");
        tabButton.dataset.busId = bus_id;
        tabButton.textContent = bus.displayName;
        tabButton.addEventListener("click", function(){
            document.querySelectorAll("#bus-tabs .bus-tab-panel").forEach(p => delete p.dataset.active);
            document.querySelectorAll("#bus-tab-bar .bus-tab-btn").forEach(b => b.classList.remove("active"));
            busElement.dataset.active = "true";
            tabButton.classList.add("active");
        });

        if(isFirst){
            busElement.dataset.active = "true";
            tabButton.classList.add("active");
            isFirst = false;
        }
        busTabBar.appendChild(tabButton);
        if(bus_id === "master"){
            const djButton = document.createElement("button");
            djButton.classList.add("bus-tab-btn", "dj-effects-toggle");
            djButton.textContent = "DJ Effekte";
            djButton.setAttribute("aria-expanded", "false");
            djButton.setAttribute("aria-controls", "dj-effects-panel");
            djButton.addEventListener("click", () => {
                djEffectsPanel.hidden = !djEffectsPanel.hidden;
                djButton.setAttribute("aria-expanded", String(!djEffectsPanel.hidden));
            });
            busTabBar.appendChild(djButton);
            const lfoButton = document.createElement("button");
            lfoButton.classList.add("bus-tab-btn", "dj-effects-toggle");
            lfoButton.textContent = "Spur-Oszillatoren";
            lfoButton.setAttribute("aria-expanded", "false");
            lfoButton.setAttribute("aria-controls", "track-oscillators-panel");
            lfoButton.addEventListener("click", () => {
                trackOscillatorsPanel.hidden = !trackOscillatorsPanel.hidden;
                lfoButton.setAttribute("aria-expanded", String(!trackOscillatorsPanel.hidden));
            });
            busTabBar.appendChild(lfoButton);
        }
    }

    main.appendChild(busTabsContainer);

    // Channel settings stay collapsed until a channel is selected.

    document.getElementById("initial-load").remove();
    setControlsEnabled(false);

    // Load persistent settings from localStorage and wire identity change events
    try{
        const savedNick = localStorage.getItem('nick');
        const savedColor = localStorage.getItem('color');
        const savedRoom = localStorage.getItem('room');
        const savedPeaksEnabled = localStorage.getItem('peaksEnabled');
        if(app.elements.enablePeaks && savedPeaksEnabled){
            app.peaksEnabled = savedPeaksEnabled === 'true';
        }
        if(app.elements.roomId && savedRoom){
            app.roomId = savedRoom;
        }
        if(app.elements.nick && savedNick){ 
            app.nick = savedNick;
        }
        if(app.elements.color && savedColor){ 
            app.color = savedColor;
        }
        
    }catch(e){ }

    // Read any supported parameters from the location hash (overrides saved settings)
    try{
        let hashParams = app.readHashParams();
        if(!hashParams.room){
            const newHash = '#room=' + encodeURIComponent(app.roomId);
            history.replaceState(null, '', newHash);
        }
    } catch(e){}
    
    // Re-read when the hash changes
    window.addEventListener('hashchange', app.readHashParams);

    if(app.elements.roomId){
        app.elements.roomId.value = app.roomId;
        app.elements.roomId.addEventListener('change', (e)=>{ 
            app.roomId = e.target.value;
            try{ localStorage.setItem('room', e.target.value); }catch(_){} 
        });
        
    }
    if(app.elements.nick){
        app.elements.nick.value = app.nick;
        app.elements.nick.addEventListener('change', (e)=>{
            app.nick = e.target.value;
            try{ localStorage.setItem('nick', app.nick); }catch(_){}
            if(app.ws && app.ws.readyState === WebSocket.OPEN) app.wsSend({type:'identity', nick: app.nick, color: app.color});
        });
    }
    if(app.elements.color){
        app.elements.color.value = app.color;
        app.elements.color.addEventListener('change', (e)=>{
            app.color = e.target.value;
            try{ localStorage.setItem('color', app.color); }catch(_){}
            if(app.ws && app.ws.readyState === WebSocket.OPEN) app.wsSend({type:'identity', nick: app.nick, color: app.color});
        });
    }

    if(app.elements.enablePeaks){
        app.elements.enablePeaks.checked = app.peaksEnabled;
        app.elements.enablePeaks.addEventListener('change', (e)=>{
            app.peaksEnabled = e.target.checked;
            try{ localStorage.setItem('peaksEnabled', app.peaksEnabled); }catch(_){}
            if(!app.peaksEnabled){
                midi.commands.peaks_stop();
            } else {
                midi.commands.peaks_start();
            }
        });
    }

    let patchRequestButton = document.getElementById("patch_request");
    if(patchRequestButton){
        patchRequestButton.addEventListener("click", (e)=>{
            midi.commands.patch_request();
        });
    }

    document.querySelectorAll("[data-track-mode]").forEach(button => {
        button.addEventListener("click", () => app.setUnmutedTrackMode(button.dataset.trackMode));
    });
    app.updateRecordingArmSwitch();

    let fullWidthCheckbox = document.getElementById('full_width');
    if(fullWidthCheckbox){
        try{
            // Default: all channels visible at once (unless the user turned it off)
            fullWidthCheckbox.checked = localStorage.getItem('fullWidth') !== 'false';
        } catch(e){}
        fullWidthCheckbox.addEventListener('change', (e)=>{
            try{ localStorage.setItem('fullWidth', e.target.checked); }catch(_){}
        });
    }

    // Helper to update peers list UI
    app.updatePeersUI = function(peers){
        if(!app.elements.peers) return;
        app.elements.peers.innerHTML = '';
        peers.forEach(p => {
            const item = document.createElement('div');
            item.className = 'peer-badge';
            const dot = document.createElement('span');
            dot.className = 'peer-dot';
            dot.style.background = p.color || '#999';
            item.appendChild(dot);
            const text = document.createElement('span');
            text.className = 'peer-name';
            text.textContent = (p.nick || 'unnamed')
            if(p.role == 'host') text.textContent += ' (host)';
            text.style.color = p.color || '#999';
            item.appendChild(text);
            app.elements.peers.appendChild(item);
        });
    }

    // Auto-connect to the WebSocket server only when the app is served from a web server.
    // Opened as a local file (index.html), there is no server, so we skip it.
    // The Websocket button still works manually.
    app.wsAuto = false; // Static/local app: direct BLE; no WebSocket server is bundled.
    if(app.wsAuto){
        app.wsConnect();
    }

    // Reconnect WS when page becomes visible again (mostly for mobile)
    document.addEventListener('visibilitychange', function(){
        if(app.wsAuto && document.visibilityState === 'visible' && !app.connectivity.wsConnected){
            app.wsConnect();
        }
    });

    app.log("App loaded");
}

app.load();