// Modified/extended from PimDoos/zoom-L20-control; see AENDERUNGEN.md and LICENSE.
// Portable performance settings, including enabled routes; no mixer patch or credentials.
var userProfiles = {
    pendingRoutes: new Map(),
    activatePendingRoutes(){
        if(!app.connectivity.bleConnected) return;
        for(const [id, settings] of this.pendingRoutes){
            if(modulation.start(controls.map[id], settings)) this.pendingRoutes.delete(id);
        }
        modulation.updateStatus();
        const status = document.getElementById("user_profile_status");
        if(status && !this.pendingRoutes.size) status.textContent = "User-Datei geladen. Gespeicherte Aktivierungen wiederhergestellt.";
    },
    export(){
        graphic_eq.loadDJTargets();
        return {
            format:'l20-controller-performance',version:2,
            oscillators:modulation.sources.map(source=>({id:source.id,period:source.period})),
            routes:[...modulation.settings].map(([controlId,settings])=>({controlId,sourceId:settings.sourceId,depth:settings.depth,enabled:modulation.active.has(controlId)||this.pendingRoutes.has(controlId)})),
            djTargets:{high:graphic_eq.djTargets.high.slice(),low:graphic_eq.djTargets.low.slice()},
            fadeSeconds:Math.max(.2,Math.min(20,Number(graphic_eq.djDuration.value)||1)),language:i18n.language
        };
    },
    validate(data){
        const fail=()=>{throw new Error('Ungültige User-Datei.')};
        if(!data||data.format!=='l20-controller-performance'||![1,2].includes(data.version))fail();
        if(!Array.isArray(data.oscillators)||data.oscillators.length!==6)fail();
        const sourceIds=new Set(modulation.sources.map(source=>source.id));
        const periods=new Map();
        for(const item of data.oscillators){
            if(!item||!sourceIds.has(item.id)||periods.has(item.id)||!Number.isFinite(item.period)||item.period<.2||item.period>30)fail();
            periods.set(item.id,item.period);
        }
        const allowed=new Map();
        for(const strip of Object.values(buses.master.strips)){
            if(Number.isInteger(strip.channel))for(const route of modulation.targets(strip))allowed.set(route.control.id,route.kind);
        }
        if(!Array.isArray(data.routes)||data.routes.length>allowed.size)fail();
        const routes=new Map();
        for(const item of data.routes){
            if(!item||!allowed.has(item.controlId)||routes.has(item.controlId)||!sourceIds.has(item.sourceId)||
                !Number.isFinite(item.depth)||item.depth<0||item.depth>100||
                (item.enabled!==undefined&&typeof item.enabled!=='boolean'))fail();
            routes.set(item.controlId,{sourceId:item.sourceId,depth:item.depth,kind:allowed.get(item.controlId),enabled:item.enabled===true});
        }
        const curves={};
        for(const key of ['high','low']){
            const values=data.djTargets&&data.djTargets[key];
            if(!Array.isArray(values)||values.length!==graphic_eq.bandGainControllers.length||!values.every(value=>Number.isInteger(value)&&value>=0&&value<=60))fail();
            curves[key]=values.slice();
        }
        if(!Number.isFinite(data.fadeSeconds)||data.fadeSeconds<.2||data.fadeSeconds>20||!['de','en'].includes(data.language))fail();
        return {periods,routes,curves,fade:data.fadeSeconds,language:data.language};
    },
    apply(data){
        const settings=this.validate(data); // Validate everything before changing anything.
        modulation.stopAll();graphic_eq.stopDJFade();graphic_eq.setDJFilter(0);graphic_eq.djSlider.value=0;
        for(const [id,period]of settings.periods)modulation.setPeriod(id,period);
        modulation.settings=settings.routes;
        graphic_eq.djTargets=settings.curves;
        graphic_eq.djDuration.value=settings.fade;
        try{localStorage.setItem('l20.djTargets.v1',JSON.stringify(settings.curves))}catch(error){}
        document.querySelectorAll('[data-source-period]').forEach(input=>{
            const period=settings.periods.get(input.dataset.sourcePeriod);
            input.value=Math.round(Math.log(period/.2)/Math.log(30/.2)*1000);
            input.setAttribute('aria-valuetext',period.toFixed(period<1?2:1)+' s');
        });
        document.querySelectorAll('[data-source-period-output]').forEach(output=>{
            const period=settings.periods.get(output.dataset.sourcePeriodOutput);
            output.textContent=period.toFixed(period<1?2:1)+' s';
        });
        modulation.updateStatus();
        // Refresh the offline editor without rebuilding mixer controls.
        if(graphic_eq.refreshDJTargetEditor)graphic_eq.refreshDJTargetEditor();
        i18n.setLanguage(settings.language);
        this.pendingRoutes = new Map([...settings.routes].filter(([id, route]) => route.enabled));
        if(app.connectivity.bleConnected) this.activatePendingRoutes();
    },
    download(){
        const blob=new Blob([JSON.stringify(this.export(),null,2)],{type:'application/json'});
        const url=URL.createObjectURL(blob),link=document.createElement('a');
        link.href=url;link.download='L20-User-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
        document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
};
const profileStatus=document.getElementById('user_profile_status');
const profileFile=document.getElementById('user_profile_file');
document.getElementById('user_profile_save').addEventListener('click',()=>{
    userProfiles.download();profileStatus.textContent='User-Datei gespeichert (Download).';
});
document.getElementById('user_profile_load').addEventListener('click',()=>profileFile.click());
profileFile.addEventListener('change',async()=>{
    const file=profileFile.files[0];if(!file)return;
    try{
        if(file.size>1024*1024)throw new Error('Ungültige User-Datei.');
        const parsed=JSON.parse(await file.text());
        userProfiles.apply(parsed);profileStatus.textContent=userProfiles.pendingRoutes.size ? 'User-Datei geladen. Aktivierungen warten auf Bluetooth-Verbindung.' : 'User-Datei geladen. Gespeicherte Aktivierungen wiederhergestellt.';
    }catch(error){profileStatus.textContent=error.message==='Ungültige User-Datei.'?error.message:'Datei konnte nicht geladen werden.'}
    finally{profileFile.value=''}
});
