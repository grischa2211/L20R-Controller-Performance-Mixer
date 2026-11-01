// Modified/extended from PimDoos/zoom-L20-control; see AENDERUNGEN.md and LICENSE.
var controls = {};
var buses = {};
var strips = {};

controls.map = {};

const BUS_NAMES = {
    0: "Master",
    1: "Monitor A",
    2: "Monitor B",
    3: "Monitor C",
    4: "Monitor D",
    5: "Monitor E",
    6: "Monitor F"
};
class MixerBus {
    constructor(id, displayName, label, bus_number){
        this.id = id;
        this.displayName = displayName;
        this.label = label;
        this.bus_number = bus_number;
        this.strips = {};

        this.busElement = null;
        this.stripsContainer = null;
    }
    createElement(){
        this.busElement = document.createElement("div");
        this.busElement.id = this.id + "_bus";
        this.busElement.classList.add("bus");

        this.stripsContainer = document.createElement("div");
        this.stripsContainer.classList.add("strips");
        this.stripsContainer.id = this.id + "_strips";
        this.busElement.appendChild(this.stripsContainer);

        return this.busElement;
    }
    updateMeters(channelPeak, channelSignal, channelClip){
        for(let i = 1; i <= 20; i++){
            let strip = this.strips[`${this.id}_channel_${i}`];
            if(!strip) continue;
            
            // Input meters can stay silent during SD playback. For channels in
            // PLAY mode use their post-fader meters (packet offsets 24..43).
            const sourceStrip = strips[`master_channel_${i}`];
            const isPlayback = sourceStrip && sourceStrip.recordController &&
                Number(sourceStrip.recordController.value) === 1;
            const meterOffset = isPlayback ? 24 : 0;
            let meterElement = strip.meterElements[0];
            if(meterElement){
                meterElement.value = channelPeak[meterOffset + i - 1];
                meterElement.dataset["signal"] = channelSignal[meterOffset + i - 1] > 0;
                meterElement.dataset["clip"] = channelClip[meterOffset + i - 1] > 0;
            }

            if(strip.stereo){
                i++;
                let meterElementR = strip.meterElements[1];
                if(meterElementR){
                    meterElementR.value = channelPeak[meterOffset + i - 1];
                    meterElementR.dataset["signal"] = channelSignal[meterOffset + i - 1] > 0;
                    meterElementR.dataset["clip"] = channelClip[meterOffset + i - 1] > 0;
                }
            }
        }
        for(let i = 21; i <= 24; i++){
            let efx_num = Math.round((i - 20) / 2);
            let strip = this.strips[`${this.id}_efx_${efx_num}`];
            if(!strip) continue;

            let meterElement = strip.meterElements[(i - 21) % 2];
            if(meterElement){
                meterElement.value = channelPeak[i - 1];
                meterElement.dataset["signal"] = channelSignal[i - 1] > 0;
                meterElement.dataset["clip"] = channelClip[i - 1] > 0;
            }
        }
        if(this.id == "master"){
            for(let i = 49; i <= 50; i++){
                let meterElement = this.strips.master.meterElements[i - 49];
                if(meterElement){
                    meterElement.value = channelPeak[i - 1];
                    meterElement.dataset["signal"] = channelSignal[i - 1] > 0;
                    meterElement.dataset["clip"] = channelClip[i - 1] > 0;
                }
            }
        }
    }
}
class MixerStrip {
    constructor(id, bus, channel, stereo = false) {
        this.id = id;
        this.bus = bus;
        this.bus.strips[this.id] = this;

        this.channel = channel;
        this.stereo = stereo;

        this.color = 0;
        this.displayName = `CH ${channel}`;
        this.levelController = null;
        this.muteController = null;
        this.soloController = null;
        this.recordController = null;
        this.panController = null;
        this.phaseController = null;
        this.eqControllers = {};
        this.fxControllers = [];

        this.containerElement = null;
        this.meterElements = [];
        this.labelElement = null;
        this.valueLabelElement = null;
        strips[this.id] = this;
    }
    createElement(){
        this.containerElement = document.createElement("div");
        this.containerElement.classList.add("channel-strip");
        this.containerElement.dataset.colorId = this.color;
        this.containerElement.dataset.stripId = this.id;
        this.containerElement.dataset.channelKey = String(this.channel);
        let openInspector = (e) => {
            selectStrip(this);
        }

        this.channelNumberElement = document.createElement("span");
        this.channelNumberElement.classList.add("channel-number");
        this.channelNumberElement.dataset.stripId = this.id;
        this.channelNumberElement.addEventListener("click", openInspector);
        if(Number.isInteger(this.channel)){
            this.channelNumberElement.textContent = this.stereo ? `${this.channel}/${this.channel + 1}` : this.channel;
        } else if(this.channel == "master"){
            this.channelNumberElement.textContent = "M";
        } else if(String(this.channel).startsWith("efx")){
            this.channelNumberElement.textContent = "FX" + String(this.channel).split("_")[1];
        }
        this.containerElement.appendChild(this.channelNumberElement);

        this.labelElement = document.createElement("span");
        this.labelElement.classList.add("label");
        this.labelElement.textContent = this.displayName;
        this.labelElement.dataset.stripId = this.id;
        this.labelElement.addEventListener("click", openInspector);
        this.containerElement.appendChild(this.labelElement);

        // Input channel peak levels are pre-fader (shared across buses), so
        // show meters for channel strips on every bus tab, not just Master.
        let showsMeter = this.bus.id == "master" || Number.isInteger(this.channel) || this.channel.toString().startsWith("efx");
        let meterRow = null;
        if(showsMeter){
            meterRow = document.createElement("div");
            meterRow.classList.add("meter-row");

            
            let meter = document.createElement("meter");
            if(Number.isInteger(this.channel)){
                meter.id = `${this.id}_meter`;
            } else {
                meter.id = `${this.id}_l_meter`;
            }
            meter.classList.add("peak");
            meter.min = 0;
            meter.max = 0x0C;
            meter.high = 8;
            meter.value = 0;
            this.meterElements.push(meter);
            meterRow.appendChild(meter);

            if(this.stereo){
                let meterR = document.createElement("meter");
                if(Number.isInteger(this.channel)){
                    meterR.id = `${this.id.replace(this.channel, this.channel + 1)}_meter`;
                } else {
                    meterR.id = `${this.id}_r_meter`;
                }
                meterR.classList.add("peak");
                meterR.min = 0;
                meterR.max = 0x0C;
                meterR.high = 8;
                meterR.value = 0;
                this.meterElements.push(meterR);
                meterRow.appendChild(meterR);
            }

            this.containerElement.appendChild(meterRow);
        }

        let stripFader = this.levelController.createElement("fader");
        const faderRow = document.createElement("div");
        faderRow.classList.add("fader-row");
        if(meterRow) faderRow.appendChild(meterRow);
        faderRow.appendChild(stripFader);
        this.containerElement.appendChild(faderRow);

        this.valueLabelElement = document.createElement("label");
        this.valueLabelElement.textContent = this.levelController.formatted_value;
        this.valueLabelElement.htmlFor = stripFader.id;
        this.levelController.label = this.valueLabelElement;
        this.containerElement.appendChild(this.valueLabelElement);

        if(this.bus.id == "master"){
            if(this.muteController){
                let muteButton = this.muteController.createElement("toggle");
                muteButton.classList.add("mute");
                muteButton.innerText = "Mute";
                this.containerElement.appendChild(muteButton);
            }
            
            if(this.soloController){
                let soloButton = this.soloController.createElement("toggle");
                soloButton.classList.add("solo");
                soloButton.innerText = "Solo";
                this.containerElement.appendChild(soloButton);
            }
            if(this.recordController && this.channel !== "master"){
                let recordSelect = this.recordController.createElement("select");
                recordSelect.classList.add("record");
                this.containerElement.appendChild(recordSelect);
            }
            
            
        }
        return this.containerElement;
        
    }
    createInspector(){
        this.inspectorElement = document.createElement("div");
        this.inspectorElement.classList.add("controls");

        let titleElement = document.createElement("span");
        titleElement.innerText = this.displayName;
        titleElement.classList.add("label");
        this.inspectorElement.appendChild(titleElement);

        if(Number.isInteger(this.channel)){
            const nameForm = document.createElement("form");
            nameForm.classList.add("channel-name-form");
            const nameLabel = document.createElement("label");
            nameLabel.textContent = "Kanalname";
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.maxLength = 8;
            nameInput.value = this.displayName;
            nameInput.setAttribute("aria-label", "Kanalname (maximal 8 Zeichen)");
            nameLabel.appendChild(nameInput);
            const saveName = document.createElement("button");
            saveName.type = "submit";
            saveName.classList.add("btn");
            saveName.textContent = "Übertragen";
            const nameStatus = document.createElement("span");
            nameStatus.classList.add("channel-name-status");
            nameStatus.setAttribute("role", "status");
            nameForm.appendChild(nameLabel);
            nameForm.appendChild(saveName);
            nameForm.appendChild(nameStatus);
            nameForm.addEventListener("submit", event => {
                event.preventDefault();
                app.renameChannel(this.channel, nameInput.value, nameStatus);
            });
            this.inspectorElement.appendChild(nameForm);
        }

        function createInspectorRow(controller, label, elementType, extraClass){
            let row = document.createElement("div");
            row.classList.add("row");

            let controllerLabel = document.createElement("span");
            controllerLabel.innerText = label;
            row.appendChild(controllerLabel);

            let controllerValueLabel = document.createElement("span");
            controller.label = controllerValueLabel;
            controllerValueLabel.innerText = controller.formatted_value;
            row.appendChild(controllerValueLabel);
            
            let controllerElement = controller.createElement(elementType);
            if(extraClass) controllerElement.classList.add(extraClass);
            row.appendChild(controllerElement);

            

            return row;
        }
       
        if(this.fxControllers){
            for(let i in this.fxControllers){
                this.inspectorElement.appendChild(
                    createInspectorRow(
                        this.fxControllers[i],
                        `EFX Send ${parseInt(i) + 1}`,
                        "fxsend"
                    )
                );
            }
        }
        if(this.panController){
            this.inspectorElement.appendChild(
                createInspectorRow(
                    this.panController,
                    "Pan",
                    "fader",
                    "pan"
                )
            );
        }
        if(this.eqControllers["off"]){
            let eqOffButton = this.eqControllers["off"].createElement("toggle");
            eqOffButton.innerText = "EQ OFF";
            eqOffButton.classList.add("off");
            eqOffButton.type = "button";
            const nameForm = this.inspectorElement.querySelector(".channel-name-form");
            if(nameForm){
                nameForm.insertBefore(eqOffButton, nameForm.querySelector(".channel-name-status"));
            } else {
                this.inspectorElement.appendChild(eqOffButton);
            }

            for(let i in this.eqControllers){
                let eqController = this.eqControllers[i];

                if(i != "off"){
                    this.inspectorElement.appendChild(
                        createInspectorRow(
                            eqController,
                            i.replace("_"," "),
                            "fader"
                        )
                    );
                }

                
            }
        }

        if(this.fxSlot){
            let efx_num = this.channel.split("_")[1];
            let efx_type = this.fxSlot.typeController;
            this.inspectorElement.appendChild(
                createInspectorRow(
                    efx_type,
                    "Type",
                    "select"
                )
            );
            for(let i in this.fxSlot.parameterControllers){
                let param = this.fxSlot.parameterControllers[i];
                this.inspectorElement.appendChild(
                    createInspectorRow(
                        param,
                        `Parameter ${parseInt(i) + 1}`,
                        "fader"
                    )
                )
            }
        }
        return this.inspectorElement;
    }

    updateDisplayName(newDisplayName){
        this.displayName = newDisplayName;
        this.labelElement.innerText = newDisplayName;
    }
    updateColor(newColor){
        this.color = newColor;
        this.containerElement.dataset.colorId = newColor;
    }
    updateMeter(newPeak, newSignal = false, newClip = false, index = 0){
        let meter = this.meterElements[index];
        if(meter){
            meter.value = newPeak;
            meter.dataset.signal = newSignal;
            meter.dataset.clip = newClip;
        }
    }

}
class Controller {
    constructor(id, displayName, controller_number, channel, value_range, mapping = null, unit = null, default_value = 0){
        this.id = id; // Controller unique ID
        this.displayName = displayName; // Controller display name
        this.controller_number = controller_number; // MIDI CC number
        this.channel = channel; // MIDI channel
        this.value_range = value_range;
        this.mapping = mapping;
        this.unit = unit;
        this.value = default_value; // MIDI value (0-127)
        this.mapped_value = this.mapValue(default_value); // Value mapped to unit
        this.formatted_value = this.formatValue(this.mappedValue);
        this.labelValue = "formatted";
        controls.map[this.id] = this;
    }
    mapValue(value){
        let in_min = this.value_range[0];
        let in_max = this.value_range[1];
        let out_min = 0;
        let out_max = 100;
        if(this.mapping == null) return value;


        if(typeof this.mapping == "string"){
            switch(this.mapping){
                case "fader":
                    return 0x2C * Math.log10(value / 0x52);
                case "fxsend":
                    return 0x50 * Math.log10(value / 0x2D);
                case "eq_gain":
                    out_min = -15;
                    out_max = 15;
                    break;
                case "eq_midfreq":
                    out_min = 100;
                    out_max = 8000;
                    break;
                case "eq_lowcut":
                    out_min = 0;
                    out_max = 600;
                    break;
                case "bool":
                    return value > 0;
                case "pan":
                    return value - 50;
                case "plus1":
                    return value + 1;
            }
            value = parseInt(value);
            return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
        } else {
            return this.mapping[value];
        }
        
    }
    formatValue(value){
        if(typeof this.mapped_value == "number"){
            return `${this.mapped_value.toFixed(0).replace("Infinity","∞")}${this.unit ? " " + this.unit : ""}`
        } else {
            return this.mapped_value;
        }
    }
    updateValue(value, source){
        this.value = value;
        this.mapped_value = this.mapValue(value);
        if(this.element){
            switch(this.element.nodeName){
                case "BUTTON":
                    this.element.dataset.value = value;
                    break;
                case "DIV":
                    if(this.element.classList.contains("recorder-transport")){
                        this.element.dataset.value = value;
                    }
                default:
                    if(this.element != document.activeElement) this.element.value = value;
                    break;
            }

        }
        
        this.formatted_value = this.formatValue(this.mapped_value);
        app.log(`[${source}] ${this.displayName}: ${this.formatted_value}`);
        if((/^master_channel_\d+_(record|mute)$/.test(this.id) || this.id === "recorder_playing" || this.id === "master_record") && app.updateRecordingArmSwitch){
            app.updateRecordingArmSwitch(this.id, source);
        }
        if((source === "midi" || source === "ws") && typeof recorder !== "undefined"){
            if(this.id === "recorder_position_seconds") recorder.receivePosition();
            if(this.id === "recorder_playing") recorder.receiveTransport(Number(value));
        }
        if(this.label){
            if(this.labelValue == "formatted") this.label.innerText = this.formatted_value;
            else if(this.labelValue == "mapped") this.label.innerText = this.mapped_value;
            else this.label.innerText = this.value;
        } 
    }
    writeValue(value, source = "local", force = false){
        this.updateValue(value, source);
        if(app.connectivity.wsConnected && source != "ws"){
            const now = Date.now();
            if(force || (now - (this._lastWsSend || 0) >= 200)){
                this._lastWsSend = now;
                app.wsSend({type:'control', id: this.id, value: Number(this.value)});
            }
        }
        // Write to BLE if connected
        if(app.connectivity.bleConnected && source != "midi"){
            let midiData = midi.createControlChangeMessage(this.channel, this.controller_number, value);
            midi.sendMessage(midiData);
        }
    }
    createElement(type){
        let element;
        switch(type){
            case "fader":
            case "fxsend":
                element = document.createElement("input");
                element.type = "range";
                element.classList.add(type);
                element.min = this.value_range[0];
                element.max = this.value_range[1];
                element.dataset.controlId = this.id;
                element.id = `${type}-${this.id}`;
                element.value = this.value;
                element.addEventListener("input", function(e){
                    let control = controls.map[this.dataset.controlId];
                    if(typeof modulation !== "undefined") modulation.stop(control.id, false);
                    if(/^geq_band_/.test(control.id)) graphic_eq.stopDJFade();
                    control.writeValue(e.target.value);
                });
                element.addEventListener("change", function(e){
                    let control = controls.map[this.dataset.controlId];
                    control._lastWsSend = 0;
                    control.writeValue(e.target.value, "local", true);
                });
                break;
            case "toggle":
                element = document.createElement("button");
                element.classList.add("toggle");
                element.dataset.controlId = this.id;
                element.id = `${type}-${this.id}`;
                element.dataset.value = this.value;
                element.addEventListener("click", function(e){
                    let control = controls.map[this.dataset.controlId];
                    let newValue = (parseInt(this.dataset.value) + 1) % (control.value_range[1] + 1);
                    control.writeValue(newValue)
                });

                break
            case "select":
                element = document.createElement("select");
                element.dataset.controlId = this.id;
                element.id = `${type}-${this.id}`;
                
                for(const i in this.mapping){
                    let optionElement = document.createElement("option");
                    optionElement.value = i;
                    optionElement.innerText = this.mapping[i];
                    element.appendChild(optionElement);
                }
                element.value = this.value;

                element.addEventListener("change", function(e){
                    let control = controls.map[this.dataset.controlId];
                    if(/^master_channel_\d+_record$/.test(control.id)){
                        const requested = Number(e.target.value);
                        e.target.value = control.value;
                        app.setUnmutedTrackMode(requested, [control.id]);
                    } else control.writeValue(parseInt(e.target.value));
                });
                break;
            case "transport":
                element = document.createElement("div");
                element.classList.add("recorder-transport");

                // REW is a separate firmware button, not a repeated Stop.
                let rewindButton = document.createElement("button");
                rewindButton.classList.add("rewind");
                rewindButton.title = "Klicken: vorherige Marke / Anfang · Gedrückt halten: zurückspulen";
                rewindButton.setAttribute("aria-label", "Zurückspulen (REW)");
                rewindButton.dataset.controlId = "recorder_rewind_button";
                bindHoldTransportButton(rewindButton, "recorder_rewind_button");
                element.appendChild(rewindButton);

                let forwardButton = document.createElement("button");
                forwardButton.classList.add("forward");
                forwardButton.title = "Klicken: nächste Marke / Ende · Gedrückt halten: vorspulen";
                forwardButton.setAttribute("aria-label", "Vorspulen (FF)");
                forwardButton.dataset.controlId = "recorder_forward_button";
                bindHoldTransportButton(forwardButton, "recorder_forward_button");
                element.appendChild(forwardButton);

                let stopButton = document.createElement("button");
                stopButton.classList.add("stop");
                stopButton.dataset.controlId = this.id;
                stopButton.addEventListener("click", function(e){
                    let control = controls.map[this.dataset.controlId];
                    controls.map.recorder_stop_button.writeValue(3, "local", true);
                });
                element.appendChild(stopButton);

                let playButton = document.createElement("button");
                playButton.classList.add("play");
                playButton.dataset.controlId = this.id;
                playButton.addEventListener("click", function(e){
                    let control = controls.map[this.dataset.controlId];
                    controls.map.recorder_play_button.writeValue(3, "local", true);
                });
                element.appendChild(playButton);

                let recordButton = document.createElement("button");
                recordButton.classList.add("record");
                recordButton.dataset.controlId = this.id;
                recordButton.addEventListener("click", function(e){
                    let control = controls.map[this.dataset.controlId];
                    if(control.value == 0) control.writeValue(3);
                });
                element.appendChild(recordButton);

        }
        this.element = element;
        return element;
    }
}

class Recorder {
    constructor(){
        this.transportControl = null;
        this.statusControl = null;
        this.positionControl = {};
        this.remainingControl = {};

        this.fileNameElement = null;
        this.fileName = "--------_------";
    }
    createElement(){
        this.container = document.createElement("div");
        this.container.classList.add("recorder");

        this.fileNameElement = document.createElement("div");
        this.fileNameElement.innerText = this.fileName;
        this.fileNameElement.classList.add("title");
        this.container.appendChild(this.fileNameElement);

        this.positionElement = document.createElement("div");
        this.positionElement.classList.add("position", "smooth-position");
        this.positionElement.title = "Hundertstel sind geschätzt; die Sekunden werden vom L-20R synchronisiert.";
        this.container.appendChild(this.positionElement);
        this.playbackStatusElement = document.createElement("div");
        this.playbackStatusElement.classList.add("playback-status");
        this.container.appendChild(this.playbackStatusElement);
        this.clockMode = 0;
        this.clockBase = 0;
        this.clockAnchor = performance.now();
        this.clockLastSeconds = null;
        this.clockReceivedAt = null;
        this.renderClock();
        this.clockTimer = setInterval(() => this.renderClock(), 50);

        let remainingElement = document.createElement("div");
        remainingElement.classList.add("remaining","timestamp");
        for(let time_unit in this.remainingControl){
            let controller = this.remainingControl[time_unit];
            let element = document.createElement("span");
            controller.label = element;
            controller.labelValue = "mapped";
            element.innerText = controller.mapped_value;
            remainingElement.appendChild(element);
        }
        this.container.appendChild(remainingElement);
        
        let recorderTransportElement = this.transportControl.createElement("transport");
        this.container.appendChild(recorderTransportElement);

        return this.container;
    }
    clockMilliseconds(now = performance.now()){
        const running = this.clockMode === 1 || this.clockMode === 5;
        const connected = app.connectivity.bleConnected || app.connectivity.wsConnected;
        const fresh = this.clockReceivedAt !== null && now - this.clockReceivedAt < 2500;
        const elapsed = running && connected ? Math.max(0, now - this.clockAnchor) : 0;
        // Stop at the end of the latest reported second if updates are lost.
        const limit = ((this.clockLastSeconds === null ? 0 : this.clockLastSeconds) * 1000) + 990;
        return Math.min((this.clockBase || 0) + elapsed, limit);
    }
    receivePosition(){
        if(!this.positionElement) return;
        const get = key => Number(this.positionControl[key].value) || 0;
        const seconds = get("days") * 86400 + get("hours") * 3600 + get("minutes") * 60 + get("seconds");
        const now = performance.now();
        this.clockReceivedAt = now;
        if(seconds !== this.clockLastSeconds){
            this.clockBase = seconds * 1000;
            this.clockLastSeconds = seconds;
            this.clockAnchor = now;
        }
        this.renderClock();
    }
    receiveTransport(mode){
        if(!this.positionElement) return;
        if(mode !== this.clockMode){
            this.clockBase = this.clockMilliseconds();
            this.clockAnchor = performance.now();
            this.clockMode = mode;
        }
        this.renderClock();
    }
    renderClock(){
        if(!this.positionElement) return;
        const now = performance.now();
        const connected = app.connectivity.bleConnected || app.connectivity.wsConnected;
        const running = connected && (this.clockMode === 1 || this.clockMode === 5);
        const fresh = this.clockReceivedAt !== null && now - this.clockReceivedAt < 2500;
        const total = Math.floor(this.clockMilliseconds(now) / 10);
        const h = Math.floor(total / 360000);
        const m = Math.floor(total / 6000) % 60;
        const sec = Math.floor(total / 100) % 60;
        const fraction = total % 100;
        const pad = n => String(n).padStart(2, "0");
        this.positionElement.textContent = `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(fraction)}`;
        const state = !connected ? "disconnected" : this.clockMode === 5 ? "recording" :
            this.clockMode === 1 ? "playing" : this.clockMode === 2 || this.clockMode === 4 ? "paused" :
            this.clockMode === 3 ? "armed" : "stopped";
        this.container.dataset.playbackState = state;
        const labels = {playing:"▶ Läuft", recording:"● Aufnahme", paused:"Ⅱ Pause", armed:"● Aufnahmebereit", stopped:"■ Stopp", disconnected:"Nicht verbunden"};
        this.playbackStatusElement.textContent = labels[state] + (running && !fresh ? " · Positionssignal fehlt" : "");
    }
    updateFileName(newFileName){
        this.fileName = newFileName;
        this.fileNameElement.innerText = this.fileName;
    }
}

class GraphicEqualizer {
    constructor(){
        this.bandGainControllers = [];
        this.enabledController = null;
        this.container = null;
    }
    loadDJTargets(){
        if(this.djTargets) return;
        this.djTargets = {
            high: this.bandGainControllers.map(control => control.band >= 800 ? 30 : 0),
            low: this.bandGainControllers.map(control => control.band <= 400 ? 30 : 0)
        };
        try {
            const saved = JSON.parse(localStorage.getItem("l20.djTargets.v1"));
            for(const mode of ["high", "low"]){
                if(saved && Array.isArray(saved[mode]) && saved[mode].length === this.bandGainControllers.length &&
                    saved[mode].every(value => Number.isInteger(value) && value >= 0 && value <= 60)){
                    this.djTargets[mode] = saved[mode].slice();
                }
            }
        } catch(error){}
    }
    createDJTargetEditor(){
        this.loadDJTargets();
        const editor = document.createElement("details");
        editor.classList.add("dj-target-editor");
        const summary = document.createElement("summary"); summary.textContent = "Zielkurven selbst einstellen"; editor.appendChild(summary);
        const mode = document.createElement("select"); mode.setAttribute("aria-label", "DJ-Zielkurve bearbeiten");
        for(const [value, label] of [["high", "Höhen-Ziel (links)"], ["low", "Bass-Ziel (rechts)"]]){
            const option = document.createElement("option"); option.value = value; option.textContent = label; mode.appendChild(option);
        }
        mode.value = "high"; editor.appendChild(mode);
        const hint = document.createElement("small");
        hint.textContent = "Bearbeitet nur die Zielkurve. 0 % = −15 dB, 50 % = 0 dB, 100 % = +15 dB. Übertragung erst beim Anfahren.";
        editor.appendChild(hint);
        const grid = document.createElement("div"); grid.classList.add("dj-target-bands"); editor.appendChild(grid);
        const inputs = [];
        for(const control of this.bandGainControllers){
            const band = document.createElement("label");
            const frequency = document.createElement("span"); frequency.textContent = formatNumber(control.band); band.appendChild(frequency);
            const slider = document.createElement("input"); slider.type = "range"; slider.min = 0; slider.max = 60; slider.step = 1;
            slider.setAttribute("aria-label", `Zielpegel ${control.band} Hz`);
            const output = document.createElement("span");
            const render = () => output.textContent = `${Math.round(Number(slider.value) / 60 * 100)} %`;
            slider.addEventListener("input", render);
            band.appendChild(slider); band.appendChild(output); grid.appendChild(band);
            inputs.push({slider, render});
        }
        const status = document.createElement("small"); status.setAttribute("role", "status");
        const load = () => { inputs.forEach((item, i) => { item.slider.value = this.djTargets[mode.value][i]; item.render(); }); status.textContent = ""; };
        this.refreshDJTargetEditor = load;
        mode.addEventListener("change", load);
        const save = document.createElement("button"); save.type = "button"; save.classList.add("btn"); save.textContent = "Zielkurve speichern";
        save.addEventListener("click", () => {
            this.djTargets[mode.value] = inputs.map(item => Number(item.slider.value));
            try { localStorage.setItem("l20.djTargets.v1", JSON.stringify(this.djTargets)); status.textContent = "Zielkurve im Browser gespeichert."; }
            catch(error){ status.textContent = "Zielkurve für diese Sitzung gespeichert."; }
        });
        editor.appendChild(save); editor.appendChild(status); load(); return editor;
    }
    createDJControls(){
        this.djState = null;
        const panel = document.createElement("div");
        panel.classList.add("dj-eq-panel");
        panel.id = "dj-effects-panel";
        panel.hidden = true;
        const toolbar = document.createElement("div");
        toolbar.classList.add("dj-filter-control");
        const left = document.createElement("button");
        left.type = "button"; left.classList.add("btn"); left.dataset.controlId = "dj_auto_high";
        left.textContent = "Höhen-Ziel";
        left.classList.add("dj-target-button");left.dataset.djTarget = "-100";left.setAttribute("aria-pressed", "false");
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = -100;
        slider.max = 100;
        slider.step = 1;
        slider.value = 0;
        slider.dataset.controlId = "dj_filter";
        slider.setAttribute("aria-label", "DJ-Filter: links gespeichertes Höhen-Ziel, Mitte ursprünglicher EQ, rechts gespeichertes Bass-Ziel");
        this.djSlider = slider;
        slider.addEventListener("input", () => { this.stopDJFade(); this.setDJFilter(Number(slider.value)); });
        const duration = document.createElement("input");
        duration.type = "number"; duration.min = .2; duration.max = 20; duration.step = .1; duration.value = 1;
        duration.setAttribute("aria-label", "DJ-Fade-Dauer in Sekunden");
        this.djDuration = duration;
        left.addEventListener("click", () => this.startDJFade(-100));
        const right = document.createElement("button");
        right.type = "button"; right.classList.add("btn"); right.dataset.controlId = "dj_auto_low";
        right.textContent = "Bass-Ziel";
        right.classList.add("dj-target-button");right.dataset.djTarget = "100";right.setAttribute("aria-pressed", "false");
        right.addEventListener("click", () => this.startDJFade(100));
        const reset = document.createElement("button");
        reset.type = "button";
        reset.classList.add("btn");
        reset.textContent = "Mitte / Reset";
        reset.classList.add("dj-target-button");reset.dataset.djTarget = "0";reset.setAttribute("aria-pressed", "true");
        this.djTargetButtons = [left, right, reset];
        reset.dataset.controlId = "dj_filter_reset";
        reset.addEventListener("click", () => this.startDJFade(0));
        this.djReadout = document.createElement("span");
        this.djReadout.classList.add("dj-filter-readout");
        this.djReadout.textContent = "Neutral";
        toolbar.appendChild(left);
        toolbar.appendChild(slider);
        toolbar.appendChild(right);
        toolbar.appendChild(reset);
        const durationLabel = document.createElement("label"); durationLabel.textContent = "Fade (s)"; durationLabel.appendChild(duration);
        toolbar.appendChild(durationLabel);
        toolbar.appendChild(this.djReadout);
        panel.appendChild(toolbar);
        const hint = document.createElement("small");
        hint.textContent = "Mitte: ursprünglicher EQ · Links/rechts: frei gespeicherte Zielkurven.";
        panel.appendChild(hint);
        panel.appendChild(this.createDJTargetEditor());
        const faders = document.createElement("details");
        const summary = document.createElement("summary"); summary.textContent = "EQ-Fader anzeigen";
        faders.appendChild(summary); faders.appendChild(this.createElement()); panel.appendChild(faders);
        return panel;
    }
    highlightDJTarget(target){
        if(this.djTargetButtons)this.djTargetButtons.forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.djTarget) === target)));
    }
    stopDJFade(){ clearInterval(this.djFadeTimer); this.djFadeTimer = null; }
    startDJFade(target){
        this.stopDJFade();
        if(!app.connectivity.bleConnected) return;
        this.highlightDJTarget(target);
        const duration = Math.max(.2, Math.min(20, Number(this.djDuration.value) || 1)) * 1000;
        const start = performance.now(); const from = Number(this.djSlider.value);
        this.djFadeTimer = setInterval(() => {
            if(!app.connectivity.bleConnected){ this.stopDJFade(); return; }
            const progress = Math.min(1, (performance.now() - start) / duration);
            const eased = (1 - Math.cos(progress * Math.PI)) / 2;
            const value = Math.round(from + (target - from) * eased);
            this.djSlider.value = value; this.setDJFilter(value);
            if(progress === 1) this.stopDJFade();
        }, 80);
    }
    setDJFilter(position){
        position = Math.max(-100, Math.min(100, Number(position) || 0));
        if(!this.djFadeTimer)this.highlightDJTarget(position === 0 ? 0 : position < 0 ? -100 : 100);
        if(position === 0){
            if(this.djState){
                for(const control of this.bandGainControllers){
                    control.writeValue(this.djState.saved.get(control.id), "local", true);
                }
                this.enabledController.writeValue(this.djState.previousEnabled, "local", true);
                this.djState = null;
            }
            if(this.djReadout) this.djReadout.textContent = "Neutral";
            return;
        }
        if(!this.djState){
            this.djState = {
                saved: new Map(this.bandGainControllers.map(control => [control.id, Number(control.value)])),
                previousEnabled: Number(this.enabledController.value)
            };
            this.enabledController.writeValue(1, "local", true);
        }
        this.loadDJTargets();
        const amount = Math.abs(position) / 100;
        for(const [index, control] of this.bandGainControllers.entries()){
            const target = this.djTargets[position < 0 ? "high" : "low"][index];
            const baseline = this.djState.saved.get(control.id);
            const value = Math.round(baseline + (target - baseline) * amount);
            if(value !== Number(control.value)) control.writeValue(value, "local");
        }
        if(this.djReadout) this.djReadout.textContent = `${position < 0 ? "Höhen-Ziel" : "Bass-Ziel"} · ${Math.round(amount * 100)} %`;

    }
    createElement(){
        this.container = document.createElement("div");
        this.container.classList.add("graphic-eq");

        let enableButton = this.enabledController.createElement("toggle");
        enableButton.innerText = "ON";
        enableButton.classList.add("on");
        this.container.appendChild(enableButton);

        for(let i in this.bandGainControllers){
            let bandContainer = document.createElement("span");
            bandContainer.classList.add("band");

            let controller = this.bandGainControllers[i];
            let fader = controller.createElement("fader");
            bandContainer.appendChild(fader);

            let bandLabel = document.createElement("span");
            bandLabel.innerText = formatNumber(controller.band);
            bandContainer.appendChild(bandLabel);

            this.container.appendChild(bandContainer);
        }
        return this.container;
    }
}

class Inspector {
    constructor(){
        this.strip = null;
        this.container = null;
    }
    createElement(){
        this.container = document.createElement("div");
        this.container.classList.add("inspector");
        return this.container;
    }
    setStrip(strip){
        let lastStrip = this.strip;
        if(lastStrip){
            // Maybe remove the previous control elements
            this.container.innerHTML = "";
        }
        this.strip = strip;
        let stripInspector = this.strip.createInspector();

        this.container.appendChild(stripInspector);
    }
}
var inspector = new Inspector();

// Selected channel: highlights the channel number on every bus tab and shows it in the inspector.
var selectedChannelKey = null;
function selectStrip(strip){
    if(!strip) return;
    if(Number.isInteger(strip.channel) && typeof modulation !== "undefined" && modulation.panel){
        modulation.panel.selectChannel(strip.channel);
    }
    const panel = document.querySelector(".channel-settings");
    const same = selectedChannelKey === String(strip.channel);
    document.querySelectorAll("div.channel-strip.selected").forEach(el => el.classList.remove("selected"));
    if(same && panel && panel.open){
        selectedChannelKey = null;
        panel.open = false;
        return;
    }
    selectedChannelKey = String(strip.channel);
    document.querySelectorAll(`div.channel-strip[data-channel-key="${selectedChannelKey}"]`).forEach(el => el.classList.add("selected"));
    inspector.setStrip(strip);
    if(panel) panel.open = true;
}

class EffectSlot {
    constructor(id, displayName){
        this.id = id;
        this.displayName = displayName;
        this.typeController = null;
        this.parameterControllers = [];
    }
}

// Returns the first matching control (keeps previous behavior) or null.
function getControlByCC(controller_number, channel){
    const key = `${channel}:${controller_number}`;
    const list = CONTROL_INDEX.get(key);
    return (list && list.length) ? list[0] : null;
}

function getControlElementById(control_id){
    return document.querySelector(`[data-control-id="${control_id}"]`);
}

function writeSystemMessage(bytes){
    midiMessageData = new Uint8Array([0x80,0x80, ...bytes])
    app.midi.characteristic.writeValue(midiMessageData);
    app.log(`Sent system message: ${bytes.join(" ")}`);
}
function formatNumber(number){
    const SUFFIXES = ["","k","M","G","T"];
    for(let i = 0; i < SUFFIXES.length; i++){
        let multiplier = Math.pow(10, i * 3);
        let newNumber = number / multiplier;
        if(newNumber < 1000) return newNumber + SUFFIXES[i];
    }
}
function updateMeters(channelPeak, channelSignal, channelClip){
    for(let bus_id in buses){
        let bus = buses[bus_id];
        bus.updateMeters(channelPeak, channelSignal, channelClip);
    }
}


//  --- Controller definitions ---

// Effects
var effects = {};
const EFFECTS_NAMES = [
    ["hall_1","hall_2","room_1","plate","church","drumamb","gaterev","vocal_1","vocal_2","vocal_3"],
    ["hall_3","room_2","spring","delay","analog","pp_dly","vocal_4","chorus_1","chorus_2","cho_dly"],
]
// EFX Slots
for(let efx = 1; efx <= 2; efx++){
    let efx_id = `efx_${efx}`;
    let effectSlot = new EffectSlot(efx_id, `EFX ${efx}`);
    effects[efx_id] = effectSlot;
    
    effectSlot.typeController = new Controller(
        id = `efx_${efx}_type`,
        displayName = `EFX ${efx} Type`,
        controller_number = 78,
        channel = efx,
        value_range = [0,9],
        mapping = EFFECTS_NAMES[efx - 1],
        unit = null,
        default_value = 0,
    );
    effectSlot.parameterControllers.push(new Controller(
        id = `efx_${efx}_parameter_1`,
        displayName = `EFX ${efx} Parameter 1`,
        controller_number = 78,
        channel = 4 + (efx * 2),
        value_range = [0,100],
        mapping = null,
        unit = null,
        default_value = 0,
    ));
    effectSlot.parameterControllers.push(new Controller(
        id = `efx_${efx}_parameter_2`,
        displayName = `EFX ${efx} Parameter 2`,
        controller_number = 78,
        channel = 12 + (efx * 2),
        value_range = [0,100],
        mapping = null,
        unit = null,
        default_value = 0,
    ));
}


// Buses and strips
for(let bus_num = 0; bus_num < Object.entries(BUS_NAMES).length; bus_num++){
    // Bus level
    let bus_cc = 83;
    let bus_ch = bus_num;
    let bus_id = BUS_NAMES[bus_num].toLowerCase().replace(" ", "_");
    let bus = new MixerBus(bus_id, BUS_NAMES[bus_num], (bus_num == 0) ? "Master" : BUS_NAMES[bus_num].slice(-1), bus_num);
    buses[bus_id] = bus;

    // Master strip
    let masterStrip = new MixerStrip(
        id = bus_id,
        bus = bus,
        channel = "master",
        stereo = true
    );
    masterStrip.displayName = bus.displayName;

    if (bus_num == 0){
        bus_cc = 84;
        bus_ch = 11;
    }
    masterStrip.levelController = new Controller(
        id = `${bus_id}_level`,
        displayName = `${bus.displayName} Level`,
        controller_number = bus_cc,
        channel = bus_ch,
        value_range = [0, 120],
        mapping = "fader",
        unit = "dB",
        default_value = 0x2D
    );
    if(bus_num == 0){
        masterStrip.recordController = new Controller(
            id = `${bus_id}_record`,
            displayName = `${bus.displayName} Record`,
            controller_number = bus_cc,
            channel = 9,
            value_range = [0, 2],
            mapping = ["off","play","record"],
            unit = null,
            default_value = 0
        );
        masterStrip.muteController = new Controller(
            id = `${bus_id}_mute`,
            displayName = `${bus.displayName} Mute`,
            controller_number = bus_cc,
            channel = 10,
            value_range = [0, 1],
            mapping = "bool",
            unit = null,
            default_value = 0
        );
    }

    // EFX Returns
    for(let efx = 1; efx <= 2; efx++){
        let strip = new MixerStrip(
            id = `${bus_id}_efx_${efx}`,
            bus = bus,
            channel = "efx_" + efx,
            stereo = true
        );
        strip.displayName = "EFX " + efx;
        strips[strip.id] = strip;

        let cc, ch;
        if(bus_num == 0){
            cc = 80
            ch = 12 + efx;
        } else if(bus_num <= 4){
            cc = 81;
            ch = efx + ((bus_num - 1) * 4);
        
        } else if(bus_num <= 6){
            cc = 82;
            ch = efx + ((bus_num - 5) * 4);
        }
        strip.levelController = new Controller(
            id = `${bus_id}_efx_${efx}_level`,
            displayName = `${bus.displayName} EFX ${efx} Level`,
            controller_number = cc,
            channel = ch,
            value_range = [0, 120],
            mapping = "fader",
            unit = "dB",
            default_value = 0x2D
        );
        strip.fxSlot = effects[`efx_${efx}`];

        if(bus.id == "master"){
            strip.muteController = new Controller(
                id = `${bus_id}_efx_${efx}_mute`,
                displayName = `${bus.displayName} EFX ${efx} Mute`,
                controller_number = cc,
                channel = 4 + efx,
                value_range = [0, 1],
                mapping = "bool",
                unit = null,
                default_value = 0
            );
            strip.soloController = new Controller(
                id = `${bus_id}_efx_${efx}_solo`,
                displayName = `${bus.displayName} EFX ${efx} Solo`,
                controller_number = cc,
                channel = 8 + efx,
                value_range = [0, 1],
                mapping = "bool",
                unit = null,
                default_value = 0
            );
        }
    }

    // Input channel strips
    for(let ch = 1; ch <= 19; ch++){
        if(ch == 18) continue;
        let strip = new MixerStrip(
            id = `${bus_id}_channel_${ch}`,
            bus = bus,
            channel = ch,
            stereo = ch > 16
        );

        strip.levelController = new Controller(
            id = `${bus_id}_channel_${ch}_level`,
            displayName = `${bus.displayName} Channel ${ch} Level`,
            controller_number = 60 + (bus_num * 2) + (ch > 16),
            channel = (ch <= 16) ? ch : ch - 16,
            value_range = [0, 120],
            mapping = "fader",
            unit = "dB",
            default_value = 0x3f
        );

        if(bus.id == "master"){
            strip.muteController = new Controller(
                id = `${bus_id}_channel_${ch}_mute`,
                displayName = `${bus.displayName} Channel ${ch} Mute`,
                controller_number = 48 + (ch > 16),
                channel = (ch <= 16) ? ch : ch - 16,
                value_range = [0, 1],
                mapping = "bool",
                unit = null,
                default_value = 0
            );

             strip.soloController = new Controller(
                id = `${bus_id}_channel_${ch}_solo`,
                displayName = `${bus.displayName} Channel ${ch} Solo`,
                controller_number = 50 + (ch > 16),
                channel = (ch <= 16) ? ch : ch - 16,
                value_range = [0, 1],
                mapping = "bool",
                unit = null,
                default_value = 0
            );

            strip.recordController = new Controller(
                id = `${bus_id}_channel_${ch}_record`,
                displayName = `${bus.displayName} Channel ${ch} Record`,
                controller_number = 8 + (ch > 16),
                channel = (ch <= 16) ? ch : ch - 16,
                value_range = [0, 2],
                mapping = ["off","play","record"],
                unit = null,
                default_value = 0,
            );

            strip.panController = new Controller(
                id = `${bus_id}_channel_${ch}_pan`,
                displayName = `${bus.displayName} Channel ${ch} Pan`,
                controller_number = 12 + (ch > 16),
                channel = (ch <= 16) ? ch : ch - 16,
                value_range = [0, 100],
                mapping = "pan",
                unit = null,
                default_value = 50,
            );
            strip.phaseController = new Controller(
                id = `${bus_id}_channel_${ch}_phase`,
                displayName = `${bus.displayName} Channel ${ch} Invert Phase`,
                controller_number = 10 + (ch > 16),
                channel = (ch <= 16) ? ch : ch - 16,
                value_range = [0,1],
                mapping = "bool",
                unit = null,
                default_value = 0,
            )

            // EQ
            strip.eqControllers["off"] = new Controller(
                id = `${bus_id}_channel_${ch}_eq_off`,
                displayName = `${bus.displayName} Channel ${ch} EQ Off`,
                controller_number = 14 + (ch > 16),
                channel = (ch <= 16) ? ch : ch - 16,
                value_range = [0,1],
                mapping = "bool",
                unit = null,
                default_value = 0,
            )

            strip.eqControllers["high_gain"] = new Controller(
                id = `${bus_id}_channel_${ch}_eq_high_gain`,
                displayName = `${bus.displayName} Channel ${ch} EQ High Gain`,
                controller_number = 20 + (ch > 16),
                channel = (ch <= 16) ? ch : ch - 16,
                value_range = [0,60],
                mapping = "eq_gain",
                unit = "dB",
                default_value = 30,
            )
            strip.eqControllers["high_gain"].band = "high";

            strip.eqControllers["mid_frequency"] = new Controller(
                id = `${bus_id}_channel_${ch}_eq_mid_frequency`,
                displayName = `${bus.displayName} Channel ${ch} EQ Mid Frequency`,
                controller_number = 24 + (ch > 16),
                channel = (ch <= 16) ? ch : ch - 16,
                value_range = [0,96],
                mapping = "eq_midfreq",
                unit = "Hz",
                default_value = 0,
            )
            strip.eqControllers["mid_frequency"].band = "mid";
            
            strip.eqControllers["mid_gain"] = new Controller(
                id = `${bus_id}_channel_${ch}_eq_mid_gain`,
                displayName = `${bus.displayName} Channel ${ch} EQ Mid Gain`,
                controller_number = 26 + (ch > 16),
                channel = (ch <= 16) ? ch : ch - 16,
                value_range = [0,60],
                mapping = "eq_gain",
                unit = "dB",
                default_value = 30,
            )
            strip.eqControllers["mid_gain"].band = "mid";

            strip.eqControllers["low_cut"] = new Controller(
                id = `${bus_id}_channel_${ch}_eq_low_cut`,
                displayName = `${bus.displayName} Channel ${ch} EQ Low Cut`,
                controller_number = 46 + (ch > 16),
                channel = (ch <= 16) ? ch : ch - 16,
                value_range = [0,56],
                mapping = "eq_lowcut",
                unit = "Hz",
                default_value = 0,
            )
            strip.eqControllers["low_cut"].band = "low";

            strip.eqControllers["low_gain"] = new Controller(
                id = `${bus_id}_channel_${ch}_eq_low_gain`,
                displayName = `${bus.displayName} Channel ${ch} EQ Low Gain`,
                controller_number = 44 + (ch > 16),
                channel = (ch <= 16) ? ch : ch - 16,
                value_range = [0,60],
                mapping = "eq_gain",
                unit = "dB",
                default_value = 30,
            )
            strip.eqControllers["low_gain"].band = "low";
            

            for(let efx = 1; efx <=2; efx++){
                strip.fxControllers.push(new Controller(
                    id = `${bus_id}_channel_${ch}_efx_${efx}`,
                    displayName = `${bus.displayName} Channel ${ch} EFX ${efx}`,
                    controller_number = 52 + ((efx > 1) * 2) + (ch > 16),
                    channel = (ch <= 16) ? ch : ch - 16,
                    value_range = [0, 60],
                    mapping = "fxsend",
                    unit = "dB",
                    default_value = 0x00
                ));
            }
            
        }
    }

}
// Recorder

var recorder = new Recorder();

recorder.transportControl = new Controller(
    id = `recorder_playing`,
    displayName = `Recorder Playing`,
    controller_number = 87,
    channel = 9,
    value_range = [0, 1],
    mapping = ["stop","play","paused","armed","recording_paused","recording"],
    default_value = 0
);
// Button commands are separate from CC87/channel9 recorder status feedback.
// L20R v1.13 receive table: Play CH11, Stop CH12; short press value 3.
recorder.playButtonControl = new Controller("recorder_play_button", "Recorder Play/Pause Button", 87, 11, [0, 3]);
recorder.rewindButtonControl = new Controller("recorder_rewind_button", "Recorder Rewind Button", 87, 13, [0, 5]);
recorder.forwardButtonControl = new Controller("recorder_forward_button", "Recorder Forward Button", 87, 14, [0, 5]);
recorder.stopButtonControl = new Controller("recorder_stop_button", "Recorder Stop Button", 87, 12, [0, 3]);

recorder.statusControl = new Controller(
    id = `recorder_status`,
    displayName = `Recorder Status`,
    controller_number = 89,
    channel = 10,
    value_range = [0, 16],
    mapping = [,,,,,,,,,"no_channels"],
    unit = null,
    default_value = 0
);
for(let i = 0; i < 4; i++){
    let time_label;
    switch(i){
        case 0:
            time_label = "days";
            break;
        case 1:
            time_label = "hours";
            break;
        case 2:
            time_label = "minutes";
            break;
        case 3:
            time_label = "seconds";
            break;
    }

    recorder.positionControl[time_label] = new Controller(
        id = `recorder_position_${time_label}`,
        displayName = `Recorder Position ${time_label}`,
        controller_number = 88,
        channel = 9 + i,
        value_range = [0, 60],
        mapping = null,
        unit = time_label,
        default_value = 0,
    );

    recorder.remainingControl[time_label] = new Controller(
        id = `recorder_remaining_${time_label}`,
        displayName = `Storage Remaining ${time_label}`,
        controller_number = 88,
        channel = 13 + i,
        value_range = [0, 60],
        mapping = null,
        unit = time_label,
        default_value = 0,
    );
}

// Presets
let preset_select_control = new Controller(
    id = `preset_select`,
    displayName = `Preset Select`,
    label = `Preset`,
    bus = buses["master"],
    controller_number = 86,
    channel = 11,
    value_range = [0, 8],
    mapping = "plus1"
);

// Graphic Equalizer
let graphic_eq = new GraphicEqualizer();

const GEQ_BANDS = [25,40,63,100,160,250,400,630,1000,1600,2500,4000,6300,10000,16000];
for(let i = 0; i < GEQ_BANDS.length; i++){
    let controller = new Controller(
        id = `geq_band_${i + 1}_gain`,
        displayName = `G-EQ Band ${i + 1} Gain`,
        controller_number = 85,
        channel = i + 1,
        value_range = [0,60],
        mapping = "eq_gain",
        unit = "dB",
        default_value = 30,
    );
    controller.band = GEQ_BANDS[i];
    graphic_eq.bandGainControllers.push(controller);
}
graphic_eq.enabledController = new Controller(
    id = `geq_on`,
    displayName = `G-EQ On`,
    controller_number = 85,
    channel = 16,
    value_range = [0,1],
    mapping = "bool",
    unit = null,
    default_value = 0,
)



// Fast lookup index: key = "ch:cc" -> array of controls (preserves duplicates)
const CONTROL_INDEX = new Map();

function buildControlIndex(){
    CONTROL_INDEX.clear();
    for(let control_id in controls.map){
        let control = controls.map[control_id];
        let key = `${control.channel}:${control.controller_number}`;
        if(!CONTROL_INDEX.has(key)) CONTROL_INDEX.set(key, []);
        CONTROL_INDEX.get(key).push(control);
    }
}

// Build index at load time
buildControlIndex();

function setControlsEnabled(enabled){
    let controlElements = document.querySelectorAll("[data-control-id]");
    controlElements.forEach(element => {
        element.disabled = !enabled;
    });
}
// Remember the multitrack playback selection while listening to the stereo master.
// Only local user changes trigger restoration; MIDI feedback must never send commands.
const masterPlaybackControl = controls.map.master_record;
const writeMasterPlaybackValue = masterPlaybackControl.writeValue;
let savedPlaybackSelection = null;
masterPlaybackControl.writeValue = function(value, source = "local", force = false){
    const next = Number(value);
    const previous = Number(this.value);
    if(source === "local" && next === 1 && previous !== 1){
        savedPlaybackSelection = {
            project: recorder.fileName,
            controls: Object.values(strips)
                .filter(strip => strip.bus.id === "master" && Number.isInteger(strip.channel) &&
                    strip.recordController && Number(strip.recordController.value) === 1)
                .map(strip => strip.recordController.id)
        };
    }
    writeMasterPlaybackValue.call(this, value, source, force);
    if(source === "local" && next === 0 && savedPlaybackSelection){
        const saved = savedPlaybackSelection;
        savedPlaybackSelection = null;
        if(saved.project !== recorder.fileName) return;
        for(const id of saved.controls){
            const control = controls.map[id];
            // Do not replace a channel deliberately put in record mode.
            if(control && Number(control.value) !== 2){
                control.writeValue(1, "local", true);
            }
        }
    }
};

// Firmware transport values: 3 = press, 5 = repeat/seek, 4 = release.
function bindHoldTransportButton(button, controlId){
    let held = false;
    let seeking = false;
    let delay = null;
    let repeat = null;
    let pulseEnd = null;
    let lastInteraction = -Infinity;
    let holdStarted = 0;
    const send = value => controls.map[controlId].writeValue(value, "local", true);
    // Release between short seek pulses so firmware cannot accelerate a
    // continuous hold. Never send the marker-jump press before a long hold.
    const pulse = () => {
        if(!held) return;
        send(5);
        pulseEnd = setTimeout(() => {
            pulseEnd = null;
            send(4);
            // After five seconds, increase from roughly 3 to 10 seek
            // pulses per second, still releasing each pulse to avoid runaway.
            if(held) repeat = setTimeout(pulse, Date.now() - holdStarted >= 5000 ? 40 : 240);
        }, 60);
    };
    const start = () => {
        if(held || button.disabled) return;
        held = true;
        seeking = false;
        lastInteraction = Date.now();
        holdStarted = lastInteraction;
        delay = setTimeout(() => {
            if(!held) return;
            seeking = true;
            pulse();
        }, 350);
    };
    const stop = (cancel = false) => {
        if(!held) return;
        held = false;
        lastInteraction = Date.now();
        clearTimeout(delay);
        clearTimeout(repeat);
        clearTimeout(pulseEnd);
        if(!seeking && !cancel) send(3);
        send(4);
    };
    button.addEventListener("pointerdown", event => {
        if(event.button !== 0) return;
        button.setPointerCapture(event.pointerId);
        start();
    });
    button.addEventListener("pointerup", () => stop());
    button.addEventListener("pointercancel", () => stop(true));
    button.addEventListener("lostpointercapture", () => stop(true));
    button.addEventListener("keydown", event => {
        if(event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        start();
    });
    button.addEventListener("keyup", event => {
        if(event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        stop();
    });
    button.addEventListener("blur", () => stop(true));
    // Assistive technology can activate a button without pointer/key events.
    button.addEventListener("click", event => {
        if(event.detail === 0 && !held && !button.disabled && Date.now() - lastInteraction > 500){ send(3); send(4); }
    });
    window.addEventListener("blur", () => stop(true));
    window.addEventListener("pagehide", () => stop(true));
}
