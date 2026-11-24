// Project the same Three.js meshes on browsers that cannot allocate a WebGL context.
import {Vector3} from "../vendor/three-0.170.0.module.min.js";

const referenceWidth=1060, referenceHeight=597;
const image = async name => {
  const img=new Image();
  img.src=new URL(name,import.meta.url).href;
  await img.decode();
  return img;
};
function makeBuffer(w,h) {
  const c=document.createElement("canvas");c.width=w;c.height=h;
  return c.getContext("2d");
}
function transform(source,target) {
  const [a,b,c]=source,[p,q,r]=target;
  const bx=b.x-a.x,by=b.y-a.y,cx=c.x-a.x,cy=c.y-a.y;
  const det=bx*cy-by*cx;
  if (Math.abs(det)<.00001) return null;
  const qx=q.x-p.x,qy=q.y-p.y,rx=r.x-p.x,ry=r.y-p.y;
  const m11=(qx*cy-rx*by)/det,m12=(qy*cy-ry*by)/det;
  const m21=(rx*bx-qx*cx)/det,m22=(ry*bx-qy*cx)/det;
  return [m11,m12,m21,m22,p.x-m11*a.x-m21*a.y,p.y-m12*a.x-m22*a.y];
}
function drawPatch(ctx,shape,matrix,picture) {
  if (!matrix) return;
  ctx.save();ctx.beginPath();
  ctx.moveTo(shape[0].x,shape[0].y);
  for(let i=1;i<shape.length;i++) ctx.lineTo(shape[i].x,shape[i].y);
  ctx.closePath();ctx.clip();
  ctx.transform(...matrix);
  ctx.drawImage(picture,0,0,referenceWidth,referenceHeight);
  ctx.restore();
}
function choosePins(points) {
  const a=points[0];
  const last=points.reduce((best,p,i) =>
    (p.x-a.x)**2+(p.y-a.y)**2 > (points[best].x-a.x)**2+(points[best].y-a.y)**2 ? i : best,1);
  const b=points[last],area=p=>Math.abs((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x));
  const third=points.reduce((best,p,i) => area(p)>area(points[best]) ? i : best,0);
  return [0,last,third];
}

export async function createCanvasRenderer(canvas,textures,scene) {
  const ctx=canvas.getContext("2d",{alpha:false});
  if (!ctx) throw Error("2D rendering is unavailable");
  const [windows,tips,fogMask,haze]=await Promise.all(["windows.png","tips.png","fog-mask.png","fog-tile.png"].map(image));
  const {plate,room,bay,skyMap,skyMask}=textures;
  const surface=makeBuffer(referenceWidth,referenceHeight);
  const sky=makeBuffer(553,197),fog=makeBuffer(530,299);
  const pattern=fog.createPattern(haze,"repeat");
  const drawables=scene.children.filter(node=>!node.name.startsWith("Atmosphere ")).map(node=>{
    const {boundary,landmarks}=node.userData;
    const reference=boundary.concat(landmarks).map(([x,y])=>({x,y}));
    const xyz=node.geometry.attributes.position;
    const world=reference.map((_,i)=>new Vector3().fromBufferAttribute(xyz,i));
    const pins=choosePins(reference.slice(0,boundary.length));
    const texture=node.name==="Room"||node.name==="Reflective floor" ? room.image :
      node.name==="Camera bay" ? bay.image : node.name==="Cinema camera" ? plate.image : surface.canvas;
    return {world,reference,pins,length:boundary.length,texture};
  });
  let ratio=1;
  return {
    setPixelRatio(value) { ratio=Math.min(value,1.25); },
    setSize(w,h) {
      const scale=Math.min(ratio,1280/w);
      canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
    },
    render(view,camera) {
      camera.updateMatrixWorld();
      const common=view.getObjectByName("RHINO skyline").material.uniforms;
      const t=common.time.value;
      surface.clearRect(0,0,referenceWidth,referenceHeight);
      surface.drawImage(plate.image,0,0,referenceWidth,referenceHeight);
      sky.clearRect(0,0,553,197);
      const shiftX=(.026*Math.sin(.176*t)+.009*Math.sin(.30*t+.7))*553;
      const shiftY=.009*Math.sin(.20*t+.5)*197;
      sky.drawImage(skyMap.image,shiftX,shiftY,553,197);
      sky.globalCompositeOperation="destination-in";
      sky.drawImage(skyMask.image,0,0,553,197);
      sky.globalCompositeOperation="source-over";
      surface.drawImage(sky.canvas,360,3);
      surface.globalCompositeOperation="lighter";
      for(let i=0;i<9;i++) {
        surface.globalAlpha=.10+.09*Math.sin(t*1.23+i*1.7)+.01*Math.sin(t*2.9+i);
        const start=Math.floor(i*windows.width/9),end=Math.floor((i+1)*windows.width/9);
        surface.drawImage(windows,start,0,end-start,windows.height,start/windows.width*referenceWidth,0,(end-start)/windows.width*referenceWidth,referenceHeight);
      }
      const half=tips.width/2;
      surface.globalAlpha=common.leftTip.value*.29;
      surface.drawImage(tips,0,0,half,tips.height,0,0,530,597);
      surface.globalAlpha=common.rightTip.value*.29;
      surface.drawImage(tips,half,0,half,tips.height,530,0,530,597);
      surface.globalAlpha=1; surface.globalCompositeOperation="source-over";
      ctx.fillStyle="#0c0909";ctx.fillRect(0,0,canvas.width,canvas.height);
      for(const item of drawables) {
        const projected=item.world.map(vertex=>{
          const p=vertex.clone().project(camera);
          return {x:(p.x+1)*canvas.width/2,y:(1-p.y)*canvas.height/2};
        });
        const matrix=transform(item.pins.map(i=>item.reference[i]),item.pins.map(i=>projected[i]));
        drawPatch(ctx,projected.slice(0,item.length),matrix,item.texture);
      }
      fog.clearRect(0,0,530,299);
      fog.save();fog.translate((-t*5)%haze.width,(t*1.8)%haze.height);
      fog.fillStyle=pattern;fog.fillRect(-haze.width,-haze.height,530+2*haze.width,299+2*haze.height);
      fog.restore();
      fog.globalCompositeOperation="destination-in";fog.drawImage(fogMask,0,0,530,299);fog.globalCompositeOperation="source-over";
      ctx.globalAlpha=.20;ctx.drawImage(fog.canvas,0,0,canvas.width,canvas.height);ctx.globalAlpha=1;
    }
  };
}
