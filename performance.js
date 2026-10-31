// Modified/extended from PimDoos/zoom-L20-control; see AENDERUNGEN.md and LICENSE.
// Six shared LFOs; each route addresses exactly one channel control.
var modulation = {
    active: new Map(), settings: new Map(), timer: null,
    sources: [
        {id:'sine1',name:'Sinus 1',wave:'sine',period:2,seed:11},
        {id:'sine2',name:'Sinus 2',wave:'sine',period:3,seed:29},
        {id:'saw1',name:'Sägezahn 1',wave:'saw',period:2,seed:37},
        {id:'saw2',name:'Sägezahn 2',wave:'saw',period:4,seed:47},
        {id:'noise1',name:'Noise 1',wave:'noise',period:2,seed:53},
        {id:'noise2',name:'Noise 2',wave:'noise',period:3,seed:71}
    ].map(source=>({...source,anchor:performance.now(),offset:0})),
    sourceTime(source,now){return source.offset+(now-source.anchor)/(source.period*1000)},
    setPeriod(id,period){
        const source=this.sources.find(s=>s.id===id);period=Number(period);
        if(!source || !Number.isFinite(period) || period<.2 || period>30)return false;
        const now=performance.now();source.offset=this.sourceTime(source,now);source.anchor=now;source.period=period;return true;
    },
    sample(source,now){
        const t=this.sourceTime(source,now),phase=t-Math.floor(t);
        if(source.wave==='saw')return phase;
        if(source.wave==='noise'){
            const hash=n=>{const x=Math.sin((n+source.seed)*127.1)*43758.5453;return x-Math.floor(x)};
            const k=Math.floor(t),blend=phase*phase*(3-2*phase);
            return hash(k)+(hash(k+1)-hash(k))*blend;
        }
        return (1-Math.cos(phase*2*Math.PI))/2;
    },
    start(control,config){
        if(!app.connectivity.bleConnected || !this.sources.some(s=>s.id===config.sourceId))return false;
        const depth=Number(config.depth);if(!Number.isFinite(depth)||depth<0||depth>100)return false;
        const prior=this.active.get(control.id);
        const item={control,...config,depth,base:prior?prior.base:Number(control.value),last:null};
        this.settings.set(control.id,{sourceId:config.sourceId,depth,kind:config.kind});this.active.set(control.id,item);
        if(!this.timer)this.timer=setInterval(()=>this.tick(),80);
        this.updateStatus();return true;
    },
    tick(){
        if(!app.connectivity.bleConnected){this.stopAll(false);return}
        const now=performance.now(),samples=new Map(this.sources.map(s=>[s.id,this.sample(s,now)]));
        for(const item of this.active.values()){
            const wave=samples.get(item.sourceId),depth=item.depth/100,max=item.control.value_range[1];
            let value;
            if(item.kind==='level')value=item.base*(1-depth*wave);
            else value=item.base+(wave*2-1)*depth*(item.kind==='pan'?max/2:max);
            value=Math.round(Math.max(item.control.value_range[0],Math.min(max,value)));
            if(value!==item.last){item.control.writeValue(value,'local');item.last=value}
        }
    },
    stop(id,restore=true){
        const item=this.active.get(id);if(!item)return;
        this.active.delete(id);
        if(restore&&app.connectivity.bleConnected)item.control.writeValue(item.base,'local',true);
        if(!this.active.size){clearInterval(this.timer);this.timer=null}
        this.updateStatus();
    },
    stopAll(restore=true){
        if(typeof userProfiles !== 'undefined') userProfiles.pendingRoutes.clear();
        for(const id of [...this.active.keys()])this.stop(id,restore);
    },
    updateStatus(){
        const count=document.getElementById('dj-lfo-count');if(count)count.textContent=`Aktive Modulationen: ${this.active.size}`;
        document.querySelectorAll('[data-route-toggle]').forEach(input=>{input.checked=this.active.has(input.dataset.routeToggle);input.disabled=!app.connectivity.bleConnected});
        document.querySelectorAll('[data-route-source]').forEach(select=>{const config=this.settings.get(select.dataset.routeSource);select.value=config?config.sourceId:'sine1'});
        document.querySelectorAll('[data-route-depth]').forEach(input=>{const config=this.settings.get(input.dataset.routeDepth);input.value=config?config.depth:0});
        document.querySelectorAll('[data-route-output]').forEach(output=>{const config=this.settings.get(output.dataset.routeOutput);output.textContent=(config?config.depth:0)+' %'});
    },
    targets(strip){return [
        {kind:'level',name:'Lautstärke',control:strip.levelController},
        {kind:'pan',name:'Panorama',control:strip.panController},
        {kind:'fx1',name:'FX-Send 1',control:strip.fxControllers[0]},
        {kind:'fx2',name:'FX-Send 2',control:strip.fxControllers[1]}
    ].filter(route=>route.control)},
    createRouteControls(strip,compact=false){
        const rows=document.createElement('div');rows.classList.add('lfo-routes');
        if(compact)rows.classList.add('lfo-routes-compact');
        for(const route of this.targets(strip)){
            const config=this.settings.get(route.control.id)||{sourceId:'sine1',depth:0,kind:route.kind};
            const row=document.createElement('div');row.classList.add('lfo-route');
            const label=document.createElement('label');const enabled=document.createElement('input');enabled.type='checkbox';enabled.dataset.routeToggle=route.control.id;enabled.checked=this.active.has(route.control.id);enabled.disabled=!app.connectivity.bleConnected;
            label.appendChild(enabled);const name=document.createElement('span');name.textContent=compact?({level:'Vol',pan:'Pan',fx1:'FX1',fx2:'FX2'})[route.kind]:route.name;label.appendChild(name);row.appendChild(label);
            const select=document.createElement('select');select.dataset.routeSource=route.control.id;select.setAttribute('aria-label',route.name+': Oszillator');
            for(const [index,source]of this.sources.entries()){
                const option=document.createElement('option');option.value=source.id;
                option.textContent=compact?['S1','S2','Z1','Z2','N1','N2'][index]:source.name;option.title=source.name;select.appendChild(option);
            }
            select.value=config.sourceId;row.appendChild(select);
            const strength=document.createElement('input');strength.type='range';strength.min=0;strength.max=100;strength.step=1;strength.value=config.depth;strength.dataset.routeDepth=route.control.id;strength.setAttribute('aria-label',route.name+': Stärke');row.appendChild(strength);
            const output=document.createElement('output');output.dataset.routeOutput=route.control.id;output.textContent=config.depth+' %';row.appendChild(output);
            const options=()=>({sourceId:select.value,depth:Number(strength.value),kind:route.kind});
            enabled.addEventListener('change',()=>{if(enabled.checked){if(!this.start(route.control,options()))enabled.checked=false}else this.stop(route.control.id)});
            const change=()=>{
                this.settings.set(route.control.id,options());
                if(this.active.has(route.control.id))this.start(route.control,options());else this.updateStatus();
            };
            select.addEventListener('change',change);strength.addEventListener('input',change);rows.appendChild(row);
        }
        return rows;
    },
    createMixerUI(){
        const panel=document.createElement('section');panel.classList.add('dj-lfo-panel');
        const heading=document.createElement('div');heading.classList.add('lfo-heading');panel.appendChild(heading);
        const title=document.createElement('h3');title.textContent='Spur-Oszillatoren';heading.appendChild(title);
        const columns=document.createElement('div');columns.classList.add('lfo-columns');panel.appendChild(columns);
        const sources=document.createElement('div');sources.classList.add('lfo-sources');columns.appendChild(sources);
        for(const source of this.sources){
            const label=document.createElement('label');const name=document.createElement('span');name.textContent=source.name;label.appendChild(name);
            const speed=document.createElement('input');speed.type='range';speed.min=0;speed.max=1000;speed.step=1;
            const toPosition=period=>Math.round(Math.log(period/.2)/Math.log(30/.2)*1000);
            const toPeriod=position=>Math.round(.2*Math.pow(30/.2,Number(position)/1000)*100)/100;
            speed.value=toPosition(source.period);speed.dataset.sourcePeriod=source.id;
            speed.setAttribute('aria-label',`${source.name}: Zyklus in Sekunden`);
            const unit=document.createElement('output');unit.dataset.sourcePeriodOutput=source.id;
            const renderSpeed=()=>{
                unit.textContent=source.period.toFixed(source.period<1?2:1)+' s';
                speed.setAttribute('aria-valuetext',unit.textContent);
            };
            speed.addEventListener('input',()=>{this.setPeriod(source.id,toPeriod(speed.value));renderSpeed()});
            renderSpeed();label.appendChild(speed);label.appendChild(unit);sources.appendChild(label);
        }
        const track=document.createElement('select');track.classList.add('lfo-track-select');track.setAttribute('aria-label','Spur für Oszillatoren');
        const stripsList=Object.values(buses.master.strips).filter(strip=>Number.isInteger(strip.channel));
        for(const strip of stripsList){const option=document.createElement('option');option.value=strip.id;option.textContent=`${strip.stereo?strip.channel+'/'+(strip.channel+1):strip.channel} · ${strip.displayName}`;track.appendChild(option)}
        const channelBlock=document.createElement('div');channelBlock.classList.add('lfo-channel-block');columns.appendChild(channelBlock);
        track.value=stripsList[0].id;heading.appendChild(track);
        const rows=document.createElement('div');rows.classList.add('lfo-route-groups');channelBlock.appendChild(rows);
        const note=document.createElement('small');note.textContent='Pro Regler separat. Lautstärke wird nur abgesenkt; Panorama und FX-Sends bewegen sich um den Ausgangswert. Stoppen stellt ihn wieder her.';panel.appendChild(note);
        const render=()=>{
            rows.innerHTML='';
            rows.appendChild(this.createRouteControls(strips[track.value]));
            this.updateStatus();
        };
        track.addEventListener('change',render);
        panel.selectChannel = channel => {
            const strip = stripsList.find(item => Number(item.channel) === Number(channel));
            if(!strip) return;
            track.value = strip.id;
            render();
        };
        const stop=document.createElement('button');stop.type='button';stop.classList.add('btn');stop.textContent='Alle Oszillatoren stoppen';stop.addEventListener('click',()=>this.stopAll());panel.appendChild(stop);
        const count=document.createElement('span');count.id='dj-lfo-count';panel.appendChild(count);
        panel.refreshTracks=()=>{for(const option of track.options||[]){const strip=strips[option.value];if(strip)option.textContent=`${strip.channel} · ${strip.displayName}`}};
        render();return panel;
    }
};
const djLfoContainer=document.getElementById('track-oscillators-panel');
if(djLfoContainer){modulation.panel=modulation.createMixerUI();djLfoContainer.appendChild(modulation.panel)}
for(const strip of Object.values(buses.master.strips)){
    if(!Number.isInteger(strip.channel) || !strip.containerElement)continue;
    const details=document.createElement('details');details.classList.add('channel-lfo');
    const summary=document.createElement('summary');summary.textContent='OSC';summary.title='Oszillatoren für Lautstärke, Panorama und FX-Sends';details.appendChild(summary);
    details.appendChild(modulation.createRouteControls(strip,true));strip.containerElement.appendChild(details);
}
window.addEventListener('pagehide',()=>modulation.stopAll());
