import * as THREE from "../vendor/three-0.170.0.module.min.js";

const stage = document.querySelector(".set");
const home = document.querySelector("#studio");
const canvas = stage.querySelector(".live-stage");
const artworkAspect = 1671 / 941;
const cameraDistance = 4.8;
const asset = name => new URL(name, import.meta.url).href;

const vertexShader = `
  varying vec3 originalProjection;
  void main() {
    float distanceToEye = 4.8 - position.z;
    originalProjection = vec3(0.5 * (vec2(position.x / 1.77577046, position.y) * 4.8
      + distanceToEye), distanceToEye);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const surfaceShader = `
  uniform sampler2D plate, skyMap, skyMask, lightMask;
  uniform float time, skySurface, luminous, leftTip, rightTip;
  varying vec3 originalProjection;
  void main() {
    vec2 uv = originalProjection.xy / originalProjection.z;
    vec3 color = texture2D(plate, uv).rgb;
    if (skySurface > 0.5) {
      vec2 local = (uv - vec2(568.0 / 1671.0, 626.0 / 941.0)) / vec2(871.0 / 1671.0,310.0 / 941.0);
      if (all(greaterThanEqual(local,vec2(0.0))) && all(lessThanEqual(local,vec2(1.0)))) {
        float mask = texture2D(skyMask,local).a;
        float height = smoothstep(0.0, 1.0, local.y);
        vec2 wind = vec2(.026*sin(.176*time) + .009*sin(.30*time+local.y*1.7),
                         .009*sin(.20*time+.7*local.x) + .002*sin(.45*time+local.x*3.));
        color = mix(color, texture2D(skyMap,local-wind*(.62+.38*height)).rgb,mask);
      }
    }
    if (luminous > 0.5) {
      vec3 effects = texture2D(lightMask,uv).rgb;
      vec2 cell = floor(uv*vec2(118.0,74.0));
      float phase = fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453)*6.283;
      float flicker = .54*sin(time*1.22 + phase) + .27*sin(time*2.23 + phase*1.7)
                      + .19*sin(time*.71 - phase*2.7);
      color += vec3(1.,.66,.31)*effects.r*flicker*.21;
      float pulse = mix(leftTip, rightTip, step(.5, uv.x));
      color += effects.b*pulse*vec3(.33,.21,.10);
    }
    gl_FragColor = vec4(color,1.);
  }
`;

const fogShader = `
  uniform sampler2D haze, lightMask;
  uniform float time, bank;
  varying vec3 originalProjection;
  void main() {
    vec2 uv = originalProjection.xy/originalProjection.z;
    float mask = texture2D(lightMask,uv).g;
    vec2 flow = uv*vec2(1.55,2.35) + vec2(-.017*time+.21*bank,.009*time+.36*bank);
    float field = texture2D(haze,flow).r*.69 +
      texture2D(haze,flow*1.77+vec2(.011*time,.18)).r*.31;
    float density = smoothstep(.30,.77,field)*mask;
    float warm = smoothstep(.45,.98,uv.x) + .66*(1.-smoothstep(.0,.3,uv.x));
    vec3 tint = mix(vec3(.41,.36,.34),vec3(.70,.40,.31),clamp(warm,0.,1.));
    gl_FragColor = vec4(tint,density*mix(.18,.095,bank));
  }
`;

function positionFor(x, y, z) {
  const lens = 1-z/cameraDistance;
  return new THREE.Vector3((2*x/1060-1)*artworkAspect*lens, (1-2*y/597)*lens, z);
}

// Photograph-projected solids. Back faces and connecting side walls are real geometry.
function makeGeometry(outline, thickness = 0, landmarks = []) {
  const contour = outline.map(([x,y]) => new THREE.Vector2(x,y));
  const points = [...outline];
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
  for (const point of landmarks) {
    const p = new THREE.Vector3(point[0],point[1],0);
    const index = triangles.findIndex(tri => {
      const vs = tri.map(i => new THREE.Vector3(points[i][0],points[i][1],0));
      return THREE.Triangle.containsPoint(p,...vs);
    });
    if (index < 0) continue;
    const [a,b,c] = triangles[index], n = points.push(point) - 1;
    triangles.splice(index,1,[a,b,n],[b,c,n],[c,a,n]);
  }
  const front = points.map(point => positionFor(...point));
  const vertices = front.flatMap(p => p.toArray());
  const indices = triangles.flat();
  if (thickness) {
    const offset=front.length;
    for (const p of front) vertices.push(p.x,p.y,p.z-thickness);
    for (const [a,b,c] of triangles) indices.push(offset+c,offset+b,offset+a);
    for (let i=0;i<outline.length;i++) {
      const j=(i+1)%outline.length;
      indices.push(i,j,offset+j,i,offset+j,offset+i);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  return geometry;
}

async function start() {
  const gsap = window.gsap;
  if (!gsap) return;
  let renderer;
  let rendererMode="webgl";
  try {
    const settings={antialias:true,alpha:false,powerPreference:"low-power"};
    const context=canvas.getContext("webgl2",settings);
    if (!context) throw Error("WebGL2 unavailable");
    renderer = new THREE.WebGLRenderer({canvas,context,...settings});
  } catch {
    rendererMode="canvas";
  }

  const loader = new THREE.TextureLoader();
  const getTexture = url => loader.loadAsync(asset(url));
  const [model, plate, room, bay, skyMap, skyMask, lightMask, haze] = await Promise.all([
    fetch(asset("model.json")).then(r => { if (!r.ok) throw Error("Stage geometry unavailable"); return r.json(); }),
    getTexture("../assets/studio.webp"),getTexture("room.webp"),getTexture("camera-bay.webp"),
    getTexture("../assets/clouds.webp"),getTexture("../assets/sky-mask.png"),getTexture("lighting.png"),getTexture("haze.png")
  ]);
  haze.wrapS = haze.wrapT = THREE.RepeatWrapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(2*Math.atan(1/cameraDistance)*180/Math.PI,artworkAspect,.1,15);
  camera.position.z = cameraDistance;
  // A small overscan protects the edges of the set during the camera's lateral travel.
  camera.zoom = 1.005;
  camera.updateProjectionMatrix();
  const time = {value:0}, leftTip = {value:.15}, rightTip = {value:.18};
  const surface = (image, skySurface=0, luminous=0) => new THREE.ShaderMaterial({
    uniforms:{plate:{value:image},skyMap:{value:skyMap},skyMask:{value:skyMask},lightMask:{value:lightMask},
      time,skySurface:{value:skySurface},luminous:{value:luminous},leftTip,rightTip},
    vertexShader,fragmentShader:surfaceShader,side:THREE.DoubleSide
  });
  function mesh(name,points,material,thickness=0,landmarks=[]) {
    const node = new THREE.Mesh(makeGeometry(points,thickness,landmarks),material);
    node.name=name;
    node.userData={boundary:points,landmarks};
    scene.add(node);
    return node;
  }
  mesh("Room", [[-18,-12,-1.35],[1078,-12,-1.35],[1078,609,-1.35],[-18,609,-1.35]],surface(room));
  mesh("Reflective floor",[[-18,510,-.72],[1078,510,-.72],[1078,610,.43],[-18,610,.43]],surface(room));
  const board = surface(plate,0,1);
  for (const face of model.faces) {
    const material = face.name === "Camera bay" ? surface(bay) :
      face.name === "RHINO skyline" ? surface(plate,1,1) : board;
    mesh(face.name,face.points,material,.095);
  }
  const gearOutline = model.cameraOutline.map(([x,y]) => [x,y,.57+(x-140)*.0013]);
  mesh("Cinema camera",gearOutline,surface(plate),.11,[
    [165,146,1.04],[193,115,1.07],[198,163,1.06],[211,136,1.02],[256,143,.94],
    [290,139,.83],[300,47,.82],[247,54,.86],[234,199,.82],[273,185,.83]
  ]);
  for (const bank of [0,1]) {
    const z = bank ? 1.10 : -.20;
    const material = new THREE.ShaderMaterial({
      uniforms:{haze:{value:haze},lightMask:{value:lightMask},time,bank:{value:bank}},
      vertexShader,fragmentShader:fogShader,transparent:true,depthWrite:false,side:THREE.DoubleSide
    });
    mesh("Atmosphere "+bank,[[-8,-8,z],[1068,-8,z],[1068,605,z],[-8,605,z]],material).renderOrder=bank+2;
  }

  if (rendererMode==="canvas") {
    const {createCanvasRenderer}=await import("./canvas-scene.js");
    renderer=await createCanvasRenderer(canvas,{plate,room,bay,skyMap,skyMask},scene);
  }
  const lit = gsap.timeline({repeat:-1,paused:true});
  lit.to(rightTip,{value:1.10,duration:1.5,ease:"sine.inOut"},0)
    .to(rightTip,{value:.12,duration:2.1,ease:"sine.inOut"},1.5)
    .to(leftTip,{value:.98,duration:1.6,ease:"sine.inOut"},.68)
    .to(leftTip,{value:.15,duration:1.40,ease:"sine.inOut"},2.28);
  const cursor = {x:0,y:0};
  const trackX = gsap.quickTo(cursor,"x",{duration:1.2,ease:"power2.out"});
  const trackY = gsap.quickTo(cursor,"y",{duration:1.2,ease:"power2.out"});
  const pointer = event => {
    if (!home.classList.contains("is-current") || !window.studioMotion.enabled()) return;
    trackX(2*event.clientX/window.innerWidth-1);
    trackY(1-2*event.clientY/window.innerHeight);
  };
  window.addEventListener("pointermove",pointer,{passive:true});
  document.addEventListener("pointerleave",() => { trackX(0); trackY(0); });

  let lost = false, running = false, lastDraw = 0, ready = false;
  const observeSize = () => {
    if (!stage.clientWidth || !stage.clientHeight || lost) return;
    const dpr=Math.min(devicePixelRatio || 1,1.75,2048/stage.clientWidth);
    renderer.setPixelRatio(dpr);
    renderer.setSize(stage.clientWidth,stage.clientHeight,false);
    render();
  };
  function render() {
    if (lost || !stage.clientWidth) return;
    const t=time.value, move=window.studioMotion.enabled();
    camera.position.x = move ? .045*Math.sin(.21*t)+.017*Math.sin(.39*t)+cursor.x*.085 : 0;
    camera.position.y = move ? .021*Math.sin(.19*t)+cursor.y*.052 : 0;
    camera.position.z = cameraDistance - (move ? .018*(1-Math.cos(.16*t)) : 0);
    camera.lookAt(0,0,.21);
    renderer.render(scene,camera);
    if (!ready) {
      ready=true;
      home.dataset.renderer=rendererMode;
    }
  }
  function tick(now) {
    const elapsed=now-lastDraw;
    if (lastDraw && elapsed < (rendererMode==="canvas" ? 1/24 : 1/36)) return;
    time.value+=lastDraw ? Math.min(elapsed,.35) : 0;
    lastDraw=now;
    render();
  }
  function sync() {
    const visible = !document.hidden && (home.classList.contains("is-current") || home.classList.contains("in-transition"));
    const shouldRun = visible && !lost && window.studioMotion.enabled();
    if (shouldRun && !running) {
      lastDraw=0;lit.play();gsap.ticker.add(tick);running=true;
    } else if (!shouldRun && running) {
      lit.pause();gsap.ticker.remove(tick);running=false;
    }
    if (visible && !lost) render();
  }
  canvas.addEventListener("webglcontextlost",event => {
    event.preventDefault();lost=true;ready=false;delete home.dataset.renderer;sync();
  });
  canvas.addEventListener("webglcontextrestored",() => {lost=false;observeSize();sync();});
  new ResizeObserver(observeSize).observe(stage);
  new MutationObserver(sync).observe(home,{attributes:true,attributeFilter:["class"]});
  document.addEventListener("visibilitychange",sync);
  window.addEventListener("studio-motion-change",sync);
  observeSize();
  sync();
}
start().catch(error => { console.warn("Studio is using its animated fallback.",error.message); });
