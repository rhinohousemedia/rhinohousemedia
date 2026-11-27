// Lightweight entry for both a standalone page and a horizontal host panel.
// Explicit host navigation can keep a panel inactive even when stacked slides overlap.
const revisionQuery = new URL(import.meta.url).search;
const url = file => {
  const resolved = new URL(file, import.meta.url);
  resolved.search = revisionQuery;
  return resolved;
};
export function mountSoundstage(root) {
  const status=root.querySelector('.stage-status');
  let canvas=root.querySelector('canvas');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false,hostActive=true,engine=null,inflight=null,gone=false,failed=false,revision=0;
  let poster=null,notice=null,near=false;
  const panel=root.closest('.panel');
  function fail(message){
    if(gone||failed)return;
    failed=true;revision++;const old=engine;engine=null;old?.dispose();status.hidden=true;
    delete root.dataset.ready;root.dataset.state='fallback';
    poster=document.createElement('img');poster.alt='A still view of the Rhino House Media soundstage.';poster.className='stage-poster';poster.src=url('../assets/stage-poster.webp');root.append(poster);
    notice=document.createElement('div');notice.className='stage-fallback';notice.setAttribute('role','status');notice.textContent='Still view';
    const retry=document.createElement('button');retry.type='button';retry.textContent='Retry 3D';retry.onclick=()=>{
      failed=false;poster.remove();notice.remove();status.hidden=false;delete root.dataset.ready;
      // A lost WebGL context can require a new canvas even after resource disposal.
      const replacement=canvas.cloneNode(false);
      canvas.removeEventListener('stage-ready',onReady);
      canvas.replaceWith(replacement);
      canvas=replacement;
      canvas.addEventListener('stage-ready',onReady);
      sync();
    };
    notice.append(retry);root.append(notice);
    root.dispatchEvent(new CustomEvent('soundstage:error',{detail:String(message)}));
  }
  const initialize=()=>{
    if(inflight||engine||gone||failed)return inflight;
    const version=revision;root.dataset.state='loading';
    inflight=import(url('./stage.bundle.js').href).then(module=>module.createStage(canvas, detail=>{
      root.dispatchEvent(new CustomEvent('soundstage:metrics',{detail}));
    },fail)).then(value=>{
      if(gone||failed||version!==revision){value.dispose();return;}
      engine=value;sync();
    }).catch(e=>fail(e.message)).finally(()=>{inflight=null;if(revision!==version&&!failed)sync();});
    return inflight;
  };
  function sync(){
    if(gone||failed)return;
    const live=visible&&hostActive&&(!panel||panel.classList.contains('is-current'))&&!document.hidden;
    if(live&&!engine)initialize();
    if(engine){
      const reduced=panel&&typeof window.studioMotion?.enabled==='function'
        ? !window.studioMotion.enabled() : motion.matches;
      engine.setReduced(reduced);engine.setActive(live);
      root.dataset.state=live?(reduced?'stationary':'running'):'suspended';
    }
  }
  const onReady=()=>{root.dataset.ready='';status.hidden=true;root.dispatchEvent(new CustomEvent('soundstage:ready'));};
  canvas.addEventListener('stage-ready',onReady);
  const watch=new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;sync();},{threshold:[0,.01]});
  watch.observe(root);
  const preload=()=>{if(gone||near)return;near=true;import(url('./stage.bundle.js').href).catch(()=>{});};
  const hint=new IntersectionObserver(entries=>{if(entries.at(-1).isIntersecting){preload();hint.disconnect();}},{rootMargin:'0px 55% 0px 55%'});hint.observe(root);
  const panelState=new MutationObserver(sync);
  if(panel)panelState.observe(panel,{attributes:true,attributeFilter:['class','inert']});
  window.addEventListener('studio-motion-change',sync);
  const size=new ResizeObserver(()=>engine?.resize());size.observe(root);
  function changeMotion(){sync();}
  document.addEventListener('visibilitychange',sync);motion.addEventListener('change',changeMotion);
  function setActive(value){hostActive=!!value;sync();}
  function destroy(){if(gone)return;gone=true;revision++;engine?.dispose();engine=null;
    watch.disconnect();hint.disconnect();size.disconnect();panelState.disconnect();
    window.removeEventListener('studio-motion-change',sync);motion.removeEventListener('change',changeMotion);
    canvas.removeEventListener('stage-ready',onReady);document.removeEventListener('visibilitychange',sync);
    window.removeEventListener('message',onMessage);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);
  }
  function onMessage(e){
    if(e.source===window.parent&&e.origin===location.origin&&e.data?.type==='rhm:soundstage-active')setActive(e.data.active);
  }
  function hide(e){if(!e.persisted)destroy();else engine?.setActive(false);}
  function show(){sync();}
  window.addEventListener('message',onMessage);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
  const controller={setActive,preload,destroy};root.soundstage=controller;return controller;
}
for(const root of document.querySelectorAll('[data-soundstage]'))mountSoundstage(root);
