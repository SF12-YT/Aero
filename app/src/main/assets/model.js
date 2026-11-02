/* AeroLab 25 — RB21 exterior reconstruction study, revision 0.9.0.
 * Coordinate convention: +X = nose, +Y = up, +/-Z = left/right.
 * Geometry is built from smooth section lofts, swept aerofoils and shaped struts.
 * It is a photo/reference reconstruction, not Red Bull CAD or a certified replica.
 */
(() => {
'use strict';
const canvas=document.getElementById('gl');
const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'high-performance'});
if(!gl){document.querySelector('.viewer').innerHTML='<div style="padding:30px;color:#eef">3D graphics are unavailable on this device.</div>';return;}

const vertex=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;uniform mat4 uVP;uniform vec3 uOffset;varying vec3 vNormal;varying vec3 vWorld;varying vec2 vUV;void main(){vec3 p=aPosition+uOffset;vWorld=p;vNormal=aNormal;vUV=aUV;gl_Position=uVP*vec4(p,1.0);}`;
const fragment=`precision mediump float;uniform vec3 uColor;uniform float uSelected;uniform float uUseTex;uniform sampler2D uTex;varying vec3 vNormal;varying vec3 vWorld;varying vec2 vUV;void main(){vec3 n=normalize(gl_FrontFacing?vNormal:-vNormal);vec3 l1=normalize(vec3(.48,.82,.46));vec3 l2=normalize(vec3(-.65,.32,-.58));vec3 v=normalize(vec3(4.0,4.5,6.0)-vWorld);float d1=max(dot(n,l1),0.0);float d2=max(dot(n,l2),0.0);float spec=pow(max(dot(reflect(-l1,n),v),0.0),42.0);float fres=pow(1.0-max(dot(n,v),0.0),3.0);vec3 base=uColor*(.52+.58*d1+.22*d2)+vec3(.24)*spec+uColor*fres*.12;if(uUseTex>.5){vec4 decal=texture2D(uTex,vUV);if(decal.a<.10)discard;base=mix(base,decal.rgb,decal.a);}if(uSelected>.5)base=mix(base,vec3(1.0,.49,.11),.20);gl_FragColor=vec4(base,1.0);}`;
function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
const loc={p:gl.getAttribLocation(program,'aPosition'),n:gl.getAttribLocation(program,'aNormal'),uv:gl.getAttribLocation(program,'aUV'),vp:gl.getUniformLocation(program,'uVP'),off:gl.getUniformLocation(program,'uOffset'),color:gl.getUniformLocation(program,'uColor'),sel:gl.getUniformLocation(program,'uSelected'),useTex:gl.getUniformLocation(program,'uUseTex'),tex:gl.getUniformLocation(program,'uTex')};
const C={navy:'#080f1c',navy2:'#0c1929',navy3:'#14263a',carbon:'#05080d',carbon2:'#101720',carbon3:'#26313e',yellow:'#f4c900',yellow2:'#ffdf28',red:'#d51e2b',red2:'#9d1724',rubber:'#171b20',rubber2:'#252a30',rim:'#495663',rimDark:'#202a35',steel:'#586674',steelHi:'#8996a3',gold:'#c69a30',cool:'#6e9eaf',white:'#eef1f4',black:'#03070c',brake:'#343c45'};
function rgb(h){const n=parseInt(h.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
const defs=[
{id:'frontWing',name:'Front wing assembly',short:'Front wing',category:'AERO',label:'AERODYNAMICS',accuracy:'PHOTO-RECONSTRUCTED',desc:'Curved mainplane, multi-element flaps, endplates, outwash details and nose pylons. Chord, span and mounting position have been revised against RB21 frontal and oblique photographs.' ,off:[0,.15,0]},
{id:'nose',name:'Nose & survival cell',short:'Nose / chassis',category:'CHASSIS',label:'PRIMARY STRUCTURE',accuracy:'PHOTO-RECONSTRUCTED',desc:'Narrow tapered nose, broad survival-cell shoulder, cockpit opening and driver-protection envelope. Structural internals remain simplified.',off:[.1,.12,0]},
{id:'sidepods',name:'Sidepods & engine cover',short:'Sidepods',category:'AERO',label:'BODYWORK',accuracy:'PHOTO-RECONSTRUCTED',desc:'High, narrow radiator inlets, pronounced lower undercut, downward outer body surface, cooling outlets and tightly tapered engine cover.',off:[0,.12,.42]},
{id:'floor',name:'Floor, tunnels & diffuser',short:'Floor / diffuser',category:'AERO',label:'UNDERFLOOR AERO',accuracy:'REGULATION + PHOTO',desc:'Thin floor perimeter, twin venturi channels, fences, floor-edge surfaces and a rising rear diffuser. Team-specific internal profiles are approximated from public imagery.',off:[0,-.18,0]},
{id:'rearWing',name:'Rear wing & beam wing',short:'Rear wing',category:'AERO',label:'AERODYNAMICS',accuracy:'PHOTO-RECONSTRUCTED',desc:'Multi-element rear wing, curved endplates, twin support pylons and lower beam wing with a compact 2025-style package.',off:[-.12,.2,0]},
{id:'halo',name:'Halo & cockpit',short:'Halo / cockpit',category:'CHASSIS',label:'DRIVER SAFETY',accuracy:'REGULATION-LED',desc:'Dark-finished halo rails, centre pillar, cockpit rim, mirrors, camera housings and driver-protection envelope.',off:[0,.22,0]},
{id:'frontSusp',name:'Front suspension',short:'Front suspension',category:'SUSPENSION',label:'KINEMATICS',accuracy:'PHOTO-RECONSTRUCTED',desc:'Upper and lower wishbones, steering link, pushrod, upright and brake duct fairing. Pickup points are estimated from visible photographs.',off:[0,.05,.3]},
{id:'rearSusp',name:'Rear suspension',short:'Rear suspension',category:'SUSPENSION',label:'KINEMATICS',accuracy:'PHOTO-RECONSTRUCTED',desc:'Rear wishbones, toe link, pushrod and upright fairings arranged around the exposed gearbox region.',off:[-.1,.05,.3]},
{id:'wheels',name:'Wheels, tyres & brakes',short:'Wheels / brakes',category:'MECHANICAL',label:'ROTATING ASSEMBLY',accuracy:'DIMENSIONAL STUDY',desc:'18-inch wheel-generation slicks with realistic front/rear tyre widths, wheel barrels, spokes, hubs, brake discs and calipers.',off:[0,0,.48]},
{id:'power',name:'Power-unit package',short:'Power unit',category:'MECHANICAL',label:'1.6L V6 HYBRID',accuracy:'LAYOUT STUDY',desc:'Illustrative V6, plenum, turbocharger and exhaust arrangement for future internal inspection; not manufacturer CAD.',off:[-.28,-.04,0]},
{id:'gearbox',name:'Gearbox & drivetrain',short:'Gearbox',category:'MECHANICAL',label:'TRANSMISSION',accuracy:'LAYOUT STUDY',desc:'Tapered gearbox, differential and driveshaft interface, simplified for assembly-view exploration.',off:[-.42,.04,0]},
{id:'cooling',name:'Cooling systems',short:'Cooling',category:'MECHANICAL',label:'THERMAL SYSTEMS',accuracy:'LAYOUT STUDY',desc:'Radiator cores and ducting tucked inside the sidepod envelope; visible when outer bodywork is hidden.',off:[0,.02,.62]}
];
const groups={};for(const d of defs)groups[d.id]={def:d,meshes:[],visible:true};
let selected='sidepods',exploded=false,isolated=false;

function addMesh(g,P,I,color,UV=null,textured=false,textureKey='side'){
 if(!P.length||!I.length)return;
 const N=new Float32Array(P.length);
 for(let k=0;k<I.length;k+=3){const a=I[k]*3,b=I[k+1]*3,c=I[k+2]*3;const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const q of [a,b,c]){N[q]+=nx;N[q+1]+=ny;N[q+2]+=nz;}}
 for(let i=0;i<N.length;i+=3){const l=Math.hypot(N[i],N[i+1],N[i+2])||1;N[i]/=l;N[i+1]/=l;N[i+2]/=l;}
 const pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(P),gl.STATIC_DRAW);
 const nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,N,gl.STATIC_DRAW);
 const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(I),gl.STATIC_DRAW);
 let ub=null;if(UV){ub=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ub);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(UV),gl.STATIC_DRAW);}groups[g].meshes.push({pb,nb,ib,ub,count:I.length,color:rgb(color),hex:color,rawP:P,rawI:I,rawUV:UV,textured,textureKey});
}
function cat(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
function loft(g,sections,color,segments=48,shape=2.55,undercut=0){
 const rows=[];const steps=8;for(let r=0;r<sections.length-1;r++){const a=sections[Math.max(0,r-1)],b=sections[r],c=sections[r+1],d=sections[Math.min(sections.length-1,r+2)];for(let q=0;q<steps;q++){const t=q/steps;rows.push(b.map((v,i)=>cat(a[i],v,c[i],d[i],t)));}}rows.push(sections[sections.length-1]);
 const P=[],I=[],pow=2/shape;for(const s of rows){const[x,cy,cz,w,h]=s;for(let j=0;j<segments;j++){const t=j/segments*Math.PI*2,co=Math.cos(t),si=Math.sin(t);const z=Math.sign(co)*Math.pow(Math.abs(co),pow),y=Math.sign(si)*Math.pow(Math.abs(si),pow),pinch=1-undercut*Math.pow(Math.max(0,-y),2);P.push(x,cy+y*h,cz+z*w*pinch);}}
 for(let r=0;r<rows.length-1;r++)for(let j=0;j<segments;j++){const a=r*segments+j,b=r*segments+(j+1)%segments,c=(r+1)*segments+(j+1)%segments,d=(r+1)*segments+j;I.push(a,b,c,a,c,d);}
 const ca=P.length/3;P.push(rows[0][0],rows[0][1],rows[0][2]);for(let j=0;j<segments;j++){const n=(j+1)%segments;I.push(ca,n,j);}const cb=P.length/3,last=(rows.length-1)*segments;P.push(rows[rows.length-1][0],rows[rows.length-1][1],rows[rows.length-1][2]);for(let j=0;j<segments;j++){const n=(j+1)%segments;I.push(cb,last+j,last+n);}addMesh(g,P,I,color);
}
function shellLoft(g,sections,color,segments=72,shapeY=3.0,shapeZ=3.0,lowerPinch=0,upperShoulder=0){
 const rows=[],steps=10;
 for(let r=0;r<sections.length-1;r++){
  const a=sections[Math.max(0,r-1)],b=sections[r],c=sections[r+1],d=sections[Math.min(sections.length-1,r+2)];
  for(let q=0;q<steps;q++){const t=q/steps;rows.push(b.map((v,i)=>cat(a[i],v,c[i],d[i],t)));}
 }
 rows.push(sections[sections.length-1]);
 const P=[],I=[];
 for(const section of rows){
  const[x,cy,cz,w,h]=section;
  for(let j=0;j<segments;j++){
   const angle=j/segments*Math.PI*2,sy=Math.sin(angle),sz=Math.cos(angle);
   const py=Math.sign(sy)*Math.pow(Math.abs(sy),2/shapeY);
   const pz=Math.sign(sz)*Math.pow(Math.abs(sz),2/shapeZ);
   const lower=1-lowerPinch*Math.pow(Math.max(0,-py),2);
   const shoulder=1+upperShoulder*Math.pow(Math.max(0,py),2.4);
   P.push(x,cy+py*h,cz+pz*w*lower*shoulder);
  }
 }
 for(let r=0;r<rows.length-1;r++)for(let j=0;j<segments;j++){
  const a=r*segments+j,b=r*segments+(j+1)%segments,c=(r+1)*segments+(j+1)%segments,d=(r+1)*segments+j;
  I.push(a,b,c,a,c,d);
 }
 const ca=P.length/3;P.push(rows[0][0],rows[0][1],rows[0][2]);
 for(let j=0;j<segments;j++)I.push(ca,(j+1)%segments,j);
 const last=(rows.length-1)*segments,cb=P.length/3;P.push(rows[rows.length-1][0],rows[rows.length-1][1],rows[rows.length-1][2]);
 for(let j=0;j<segments;j++)I.push(cb,last+j,last+(j+1)%segments);
 addMesh(g,P,I,color);
}
function grid(g,nu,nv,fn,color){const P=[],I=[];for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++)P.push(...fn(i/nu,j/nv));const s=nv+1;for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*s+j,b=a+1,c=a+s+1,d=a+s;I.push(a,b,c,a,c,d);}addMesh(g,P,I,color);}
function roundedRectYZ(g,x,cy,cz,ry,rz,corner,color){const P=[[x,cy,cz]],I=[],N=12;const cs=[[cy+ry-corner,cz+rz-corner,0],[cy-ry+corner,cz+rz-corner,90],[cy-ry+corner,cz-rz+corner,180],[cy+ry-corner,cz-rz+corner,270]];for(const [yy,zz,start] of cs)for(let k=0;k<=N;k++){const a=(start+k*90/N)*Math.PI/180;P.push([x,yy+corner*Math.sin(a),zz+corner*Math.cos(a)]);}for(let i=1;i<P.length-1;i++)I.push(0,i,i+1);addMesh(g,P.flat(),I,color);}
function decalQuad(g,points,flip=false){const P=points.flat(),I=[0,1,2,0,2,3],UV=flip?[1,1,0,1,0,0,1,0]:[0,1,1,1,1,0,0,0];addMesh(g,P,I,C.white,UV,true);}
function decalSurface(g,s,x0,x1,yTop0,yTop1,yBot0,yBot1,zFn,uvRect=[0,0,1,1],textureKey='side'){const nu=50,nv=12,P=[],I=[],UV=[];for(let i=0;i<=nu;i++){const u=i/nu,x=x0+(x1-x0)*u,top=yTop0+(yTop1-yTop0)*u,bot=yBot0+(yBot1-yBot0)*u;for(let j=0;j<=nv;j++){const v=j/nv,y=top+(bot-top)*v;P.push(x,y,zFn(x,y,s));const uu=s>0?1-u:u;UV.push(uvRect[0]+uu*(uvRect[2]-uvRect[0]),uvRect[1]+(1-v)*(uvRect[3]-uvRect[1]));}}for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*(nv+1)+j,b=a+1,c=a+nv+2,d=a+nv+1;I.push(a,b,c,a,c,d);}addMesh(g,P,I,C.white,UV,true,textureKey);}
function makeDecalTexture(){const c=document.createElement('canvas');c.width=1024;c.height=128;const x=c.getContext('2d');x.clearRect(0,0,1024,128);x.textBaseline='middle';x.font='900 98px Arial, sans-serif';x.fillStyle='#f3f4f5';x.fillText('ORACLE',255,66);x.font='800 22px Arial, sans-serif';x.fillStyle='#e7edf4';x.fillText('POWERED BY',806,34);x.fillStyle='#d51e2b';x.fillRect(252,111,742,4);return textureFromCanvas(c);}
function makeCoverTexture(){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.clearRect(0,0,512,256);x.textAlign='center';x.textBaseline='middle';x.fillStyle='#f4c900';x.beginPath();x.ellipse(256,105,235,80,0,0,Math.PI*2);x.fill();x.fillStyle='#d51e2b';x.beginPath();x.moveTo(120,130);x.lineTo(158,64);x.lineTo(215,87);x.lineTo(270,43);x.lineTo(315,88);x.lineTo(370,69);x.lineTo(390,125);x.lineTo(345,153);x.lineTo(288,132);x.lineTo(246,170);x.lineTo(190,143);x.closePath();x.fill();x.font='900 58px Arial, sans-serif';x.fillStyle='#d51e2b';x.fillText('Red Bull',256,218);return textureFromCanvas(c);}
function makeTyreTexture(){
 const c=document.createElement('canvas');c.width=1024;c.height=256;
 const x=c.getContext('2d');
 // Opaque rubber base keeps the shader's decal discard path from cutting holes in the tyre.
 x.fillStyle='#171b20';x.fillRect(0,0,1024,256);
 x.textAlign='center';x.textBaseline='middle';
 x.font='900 64px Arial, sans-serif';x.fillStyle='#e7c328';
 x.fillText('PIRELLI',512,38);x.fillText('PIRELLI',512,218);
 x.font='700 30px Arial, sans-serif';x.fillStyle='#d5d9de';
 x.fillText('P ZERO',512,88);x.fillText('P ZERO',512,168);
 x.fillStyle='#343b43';x.fillRect(180,124,664,2);
 return textureFromCanvas(c);
}
function textureFromCanvas(c){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
const decalTexture=makeDecalTexture(),coverTexture=makeCoverTexture(),tyreTexture=makeTyreTexture();
function interpSection(sections,x){let i=0;while(i<sections.length-2&&x<sections[i+1][0])i++;const a=sections[i],b=sections[i+1],t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));return a.map((v,k)=>v+(b[k]-v)*t);}
const POD_SHAPE_Y=4.2,POD_SHAPE_Z=3.25,POD_LOWER_PINCH=.76,POD_UPPER_SHOULDER=.075;
function podOuterZ(x,y,s,sections){
 const q=interpSection(sections,x),cy=q[1],cz=q[2],w=q[3],h=q[4];
 const py=Math.max(-.999,Math.min(.999,(y-cy)/(h||1)));
 const pz=Math.pow(Math.max(0,1-Math.pow(Math.abs(py),POD_SHAPE_Y)),1/POD_SHAPE_Z);
 const lower=1-POD_LOWER_PINCH*Math.pow(Math.max(0,-py),2);
 const shoulder=1+POD_UPPER_SHOULDER*Math.pow(Math.max(0,py),2.4);
 return s*(cz+w*pz*lower*shoulder+.009);
}
function tubePath(g,points,r,color,radial=10,flat=.68){const samples=[],steps=5;for(let k=0;k<points.length-1;k++){const a=points[Math.max(0,k-1)],b=points[k],c=points[k+1],d=points[Math.min(points.length-1,k+2)];for(let q=0;q<steps;q++){const t=q/steps;samples.push([0,1,2].map(i=>cat(a[i],b[i],c[i],d[i],t)));}}samples.push(points[points.length-1]);const P=[],I=[];
 for(let k=0;k<samples.length;k++){const prev=samples[Math.max(0,k-1)],next=samples[Math.min(samples.length-1,k+1)],t=unit(next.map((v,i)=>v-prev[i]));let seed=Math.abs(t[1])<.9?[0,1,0]:[1,0,0],u=unit(cross(t,seed)),v=cross(t,u);for(let j=0;j<radial;j++){const a=j/radial*Math.PI*2;P.push(samples[k][0]+r*(u[0]*Math.cos(a)+v[0]*Math.sin(a)*flat),samples[k][1]+r*(u[1]*Math.cos(a)+v[1]*Math.sin(a)*flat),samples[k][2]+r*(u[2]*Math.cos(a)+v[2]*Math.sin(a)*flat));}}
 for(let k=0;k<samples.length-1;k++)for(let j=0;j<radial;j++){const a=k*radial+j,b=k*radial+(j+1)%radial,c=(k+1)*radial+(j+1)%radial,d=(k+1)*radial+j;I.push(a,b,c,a,c,d);}addMesh(g,P,I,color);}
function unit(v){const l=Math.hypot(...v)||1;return v.map(x=>x/l);}function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function cylinder(g,a,b,r1,r2,color,n=20){const d=unit(b.map((v,i)=>v-a[i])),seed=Math.abs(d[1])<.9?[0,1,0]:[1,0,0],u=unit(cross(d,seed)),v=cross(d,u),P=[],I=[];for(let k=0;k<2;k++){const c=k?b:a,r=k?r2:r1;for(let j=0;j<n;j++){const t=j/n*Math.PI*2;P.push(c[0]+r*(u[0]*Math.cos(t)+v[0]*Math.sin(t)),c[1]+r*(u[1]*Math.cos(t)+v[1]*Math.sin(t)),c[2]+r*(u[2]*Math.cos(t)+v[2]*Math.sin(t)));}}for(let j=0;j<n;j++){const q=(j+1)%n;I.push(j,q,n+q,j,n+q,n+j);}const ca=P.length/3;P.push(...a,...b);for(let j=0;j<n;j++){const q=(j+1)%n;I.push(ca,j,q,ca+1,n+q,n+j);}addMesh(g,P,I,color);}
function beam(g,a,b,r,color){cylinder(g,a,b,r,r*.88,color,14);}
function box(g,x,y,z,sx,sy,sz,color){const x0=x-sx/2,x1=x+sx/2,y0=y-sy/2,y1=y+sy/2,z0=z-sz/2,z1=z+sz/2,P=[],I=[];const face=(a,b,c,d)=>{const k=P.length/3;P.push(...a,...b,...c,...d);I.push(k,k+1,k+2,k,k+2,k+3);};face([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]);face([x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0]);face([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]);face([x0,y0,z1],[x0,y0,z0],[x1,y0,z0],[x1,y0,z1]);face([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]);face([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]);addMesh(g,P,I,color);}
function sphere(g,c,r,color,scale=[1,1,1],segments=16,rings=10){const P=[],I=[];for(let j=0;j<=rings;j++){const v=j/rings,ph=v*Math.PI;for(let i=0;i<=segments;i++){const u=i/segments*Math.PI*2;P.push(c[0]+Math.sin(ph)*Math.cos(u)*r*scale[0],c[1]+Math.cos(ph)*r*scale[1],c[2]+Math.sin(ph)*Math.sin(u)*r*scale[2]);}}for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;I.push(a,a+1,b,b,a+1,b+1);}addMesh(g,P,I,color);}
function ringXY(g,x,y,z,R,r,color,N=48,T=10){const P=[],I=[];for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;for(let j=0;j<=T;j++){const b=j/T*Math.PI*2,rr=R+r*Math.cos(b);P.push(x+rr*Math.cos(a),y+rr*Math.sin(a),z+r*Math.sin(b));}}for(let i=0;i<N;i++)for(let j=0;j<T;j++){const a=i*(T+1)+j,b=(i+1)*(T+1)+j;I.push(a,a+1,b,a+1,b+1,b);}addMesh(g,P,I,color);}
function airfoil(g,lead,chord,y,span,thick,color,camber=.045,sweep=.08,opts={}){const dir=opts.dir||-1,ss=32,cs=28,prof=[];for(let i=0;i<=cs;i++){const t=i/cs,yt=5*thick*(.2969*Math.sqrt(Math.max(t,.0001))-.1260*t-.3516*t*t+.2843*t*t*t-.1015*t*t*t*t),yc=camber*4*t*(1-t);prof.push([t,yc+yt]);}for(let i=cs;i>=0;i--){const t=i/cs,yt=5*thick*(.2969*Math.sqrt(Math.max(t,.0001))-.1260*t-.3516*t*t+.2843*t*t*t-.1015*t*t*t*t),yc=camber*4*t*(1-t);prof.push([t,yc-yt]);}const m=prof.length,P=[],I=[];
 for(let k=0;k<=ss;k++){const q=k/ss*2-1,aq=Math.abs(q),z=q*span/2,c=chord*(1-.16*aq*aq),le=lead+dir*sweep*aq*aq,baseY=y+.025*aq*aq;for(const[t,yy]of prof)P.push(le+dir*t*c,baseY+yy*c,z);}
 for(let k=0;k<ss;k++)for(let j=0;j<m;j++){const a=k*m+j,b=k*m+(j+1)%m,c=(k+1)*m+(j+1)%m,d=(k+1)*m+j;I.push(a,b,c,a,c,d);}addMesh(g,P,I,color);}
function wheel(x,s,rear){
 const y=.365,z=s*.785,w=rear?.405:.305;
 // Slick carcass: rounded shoulders, defined sidewall and a broad continuous contact crown.
 const profile=[[-.50,.272],[-.475,.296],[-.43,.326],[-.35,.348],[-.22,.359],[0,.362],[.22,.359],[.35,.348],[.43,.326],[.475,.296],[.50,.272]];
 const P=[],I=[],UV=[],N=96,stride=N+1;
 for(let k=0;k<profile.length;k++){
  const[p,r]=profile[k];
  for(let j=0;j<=N;j++){
   const a=j/N*Math.PI*2;
   P.push(x+r*Math.cos(a),y+r*Math.sin(a),z+p*w);
   UV.push(j/N,k/(profile.length-1));
  }
 }
 for(let k=0;k<profile.length-1;k++)for(let j=0;j<N;j++){
  const a=k*stride+j,b=a+1,c=(k+1)*stride+j+1,d=(k+1)*stride+j;
  I.push(a,b,c,a,c,d);
 }
 addMesh('wheels',P,I,C.rubber,UV,true,'tyre');
 // Subtle moulded sidewall beads and shoulder witness lines on both faces.
 for(const side of [-1,1]){
  ringXY('wheels',x,y,z+side*w*.462,.302,.0035,C.rubber2,72,6);
  ringXY('wheels',x,y,z+side*w*.475,.282,.0025,C.rubber2,72,6);
 }
 // 18-inch wheel barrel, face dish and outer retaining rim.
 const face=z+s*(w*.5-.012);
 cylinder('wheels',[x,y,z+s*(w*.5-.090)],[x,y,z+s*(w*.5-.018)],.235,.235,C.rimDark,48);
 cylinder('wheels',[x,y,z+s*(w*.5-.098)],[x,y,z+s*(w*.5-.086)],.205,.205,C.carbon2,48);
 ringXY('wheels',x,y,z+s*(w*.5-.008),.255,.006,C.rimDark,64,8);
 ringXY('wheels',x,y,z+s*(w*.5-.094),.208,.004,C.steel,56,7);
 // Five broad spokes and a recessed centre-lock boss.
 for(let j=0;j<5;j++){
  const a=j/5*Math.PI*2,aa=a+.19;
  const p1=[x+Math.cos(a)*.078,y+Math.sin(a)*.078,face];
  const p2=[x+Math.cos(aa)*.222,y+Math.sin(aa)*.222,face];
  beam('wheels',p1,p2,.024,C.rimDark,12);
 }
 cylinder('wheels',[x,y,z+s*(w*.5-.115)],[x,y,z+s*(w*.5-.098)],.096,.096,C.steel,28);
 cylinder('wheels',[x,y,z+s*(w*.5-.122)],[x,y,z+s*(w*.5-.113)],.060,.060,C.gold,24);
 cylinder('wheels',[x,y,z+s*(w*.5-.127)],[x,y,z+s*(w*.5-.120)],.035,.035,C.yellow,24);
 for(let j=0;j<5;j++){
  const a=j/5*Math.PI*2;
  sphere('wheels',[x+Math.cos(a)*.073,y+Math.sin(a)*.073,z+s*(w*.5-.115)],.008,C.steelHi,[1,1,.55],8,6);
 }
 // Ventilated carbon brake disc and its drilled cooling holes.
 cylinder('wheels',[x,y,z-s*w*.30],[x,y,z+s*w*.30],.224,.224,C.brake,44);
 for(let j=0;j<18;j++){
  const a=j/18*Math.PI*2;
  sphere('wheels',[x+Math.cos(a)*.174,y+Math.sin(a)*.174,z+s*(w*.30+.003)],.006,C.black,[1,1,.35],8,6);
 }
 // Compact calliper sits at the upper-rear quadrant of each disc.
 const calx=x+.12,caly=y+.10;
 cylinder('wheels',[calx-.07,caly,z+s*(w*.30)],[calx+.07,caly,z+s*(w*.30)],.062,.062,C.gold,18);
}

// 9. Simplified PU and gearbox, kept behind the exterior so isolation remains useful.
loft('power',[[-1.96,.46,0,.10,.10],[-1.62,.52,0,.22,.18],[-1.25,.56,0,.27,.22],[-.91,.58,0,.25,.20]],C.rimDark,40,2.4);
for(const s of [-1,1])for(let i=0;i<3;i++){const x=-.94-i*.16;beam('power',[x,.55,s*.08],[x-.10,.70,s*.20],.042,C.steelHi);beam('power',[x,.55,s*.08],[x-.10,.70,s*.20],.025,C.carbon3);}
loft('power',[[-1.20,.77,0,.16,.075],[-.99,.82,0,.22,.10],[-.78,.77,0,.18,.065]],C.navy3,32,2.35);
for(const s of [-1,1])tubePath('power',[[-1.16,.51,s*.20],[-1.46,.59,s*.25],[-1.76,.54,s*.18],[-1.98,.49,s*.12]],.027,C.steel,9,.6);
loft('gearbox',[[-2.48,.39,0,.12,.10],[-2.22,.43,0,.21,.16],[-1.96,.45,0,.23,.18],[-1.70,.46,0,.20,.15]],C.rimDark,36,2.4);
for(const s of [-1,1])beam('gearbox',[-2.22,.37,s*.12],[-1.84,.36,s*.78],.026,C.steel,12);

// Hidden radiator banks; bodywork can be switched off in the inspector.
for(const s of [-1,1]){loft('cooling',[[.35,.45,s*.43,.17,.16],[.02,.45,s*.43,.17,.16],[-.35,.43,s*.42,.18,.16],[-.65,.40,s*.38,.13,.12]],C.rimDark,32,2.3);for(let i=0;i<12;i++){const z=s*(.30+i*.018);beam('cooling',[.22,.30,z],[-.55,.30,z],.006,C.steel);}}

// Small visible seams, fixings and sensors.
for(const s of [-1,1]){for(let i=0;i<5;i++)sphere('sidepods',[-.18-i*.19,.48,s*(.70-i*.035)],.008,C.steelHi,[1,1,.8],8,6);sphere('frontWing',[2.70,.15,s*.95],.018,C.yellow,[1,.6,1],10,7);}

// Merge by material without exceeding WebGL 1's guaranteed 16-bit index range.
function batch(){for(const id of Object.keys(groups)){const old=groups[id].meshes,buckets=[];for(const m of old){let b=buckets.find(x=>x.hex===m.hex&&x.textured===m.textured&&x.textureKey===m.textureKey&&x.p.length/3+m.rawP.length/3<64000);if(!b){b={p:[],i:[],uv:[],hex:m.hex,textured:m.textured,textureKey:m.textureKey};buckets.push(b);}const base=b.p.length/3;b.p.push(...m.rawP);for(const q of m.rawI)b.i.push(q+base);if(m.textured&&m.rawUV)b.uv.push(...m.rawUV);gl.deleteBuffer(m.pb);gl.deleteBuffer(m.nb);gl.deleteBuffer(m.ib);if(m.ub)gl.deleteBuffer(m.ub);}groups[id].meshes=[];for(const b of buckets)addMesh(id,b.p,b.i,b.hex,b.textured?b.uv:null,b.textured,b.textureKey);}}
batch();

// Orbit camera and rendering.
const V=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function perspective(f,a,n,f2){const t=1/Math.tan(f/2),nf=1/(n-f2);return new Float32Array([t/a,0,0,0,0,t,0,0,0,0,(f2+n)*nf,-1,0,0,2*f2*n*nf,0]);}
function lookAt(e,c,u){const z=unit(V(e,c)),x=unit(cross(u,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1]);}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
let yaw=.78,pitch=.28,distance=5.85,target=[0,.49,0];
function resize(){const d=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.floor(canvas.clientWidth*d)),h=Math.max(1,Math.floor(canvas.clientHeight*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}
function offsetFor(id){return exploded?groups[id].def.off.map(v=>v*1.05):[0,0,0];}
function render(){resize();gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const cp=Math.cos(pitch),eye=[target[0]+distance*Math.sin(yaw)*cp,target[1]+distance*Math.sin(pitch),target[2]+distance*Math.cos(yaw)*cp],vp=mul(perspective(38*Math.PI/180,canvas.width/canvas.height,.08,80),lookAt(eye,target,[0,1,0]));gl.useProgram(program);gl.uniformMatrix4fv(loc.vp,false,vp);for(const id of Object.keys(groups)){const g=groups[id];if(!g.visible)continue;const o=offsetFor(id);gl.uniform3f(loc.off,o[0],o[1],o[2]);gl.uniform1f(loc.sel,id===selected?1:0);for(const m of g.meshes){gl.bindBuffer(gl.ARRAY_BUFFER,m.pb);gl.enableVertexAttribArray(loc.p);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.nb);gl.enableVertexAttribArray(loc.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.ib);gl.uniform3f(loc.color,m.color[0],m.color[1],m.color[2]);gl.uniform1f(loc.useTex,m.textured?1:0);if(m.ub){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,m.textureKey==='cover'?coverTexture:(m.textureKey==='tyre'?tyreTexture:decalTexture));gl.uniform1i(loc.tex,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.ub);gl.enableVertexAttribArray(loc.uv);gl.vertexAttribPointer(loc.uv,2,gl.FLOAT,false,0,0);}else{gl.disableVertexAttribArray(loc.uv);gl.vertexAttrib2f(loc.uv,0,0);}gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);}}requestAnimationFrame(render);}requestAnimationFrame(render);

let pointers=new Map(),pinch=0;canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);});canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId),now=[e.clientX,e.clientY];pointers.set(e.pointerId,now);if(pointers.size===1){yaw-=(now[0]-prev[0])*.008;pitch=Math.max(-.12,Math.min(1.28,pitch+(now[1]-prev[1])*.006));}else if(pointers.size>=2){const a=[...pointers.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(pinch)distance=Math.max(4.2,Math.min(11,distance*pinch/d));pinch=d;}});const end=e=>{pointers.delete(e.pointerId);pinch=0;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('wheel',e=>{distance=Math.max(4.2,Math.min(11,distance+e.deltaY*.008));e.preventDefault();},{passive:false});
function view(v){document.querySelectorAll('.toolbtn').forEach(b=>b.classList.remove('active'));const b=document.getElementById(v==='iso'?'viewIso':v==='side'?'viewSide':'viewTop');if(b)b.classList.add('active');if(v==='iso'){yaw=.78;pitch=.28;distance=5.85;target=[0,.49,0];}if(v==='side'){yaw=0;pitch=.04;distance=6.7;target=[0,.46,0];}if(v==='top'){yaw=.78;pitch=1.42;distance=7.1;target=[0,.24,0];}}
document.getElementById('viewIso').onclick=()=>view('iso');document.getElementById('viewSide').onclick=()=>view('side');document.getElementById('viewTop').onclick=()=>view('top');document.getElementById('viewReset').onclick=()=>view('iso');
let filter='ALL';const host=document.getElementById('parts');function renderParts(){host.innerHTML='';for(const d of defs.filter(d=>filter==='ALL'||d.category===filter)){const b=document.createElement('button');b.className='part'+(d.id===selected?' active':'');b.innerHTML=`<span class="num">${String(defs.indexOf(d)+1).padStart(2,'0')}</span><span class="pname">${d.short}</span>`;b.onclick=()=>select(d.id);host.appendChild(b);}}
function select(id){selected=id;const d=groups[id].def;document.getElementById('selCategory').textContent=d.label;document.getElementById('selAccuracy').textContent=d.accuracy;document.getElementById('selName').textContent=d.name;document.getElementById('selDesc').textContent=d.desc;document.getElementById('togglePart').textContent=groups[id].visible?'HIDE PART':'SHOW PART';document.getElementById('isolate').textContent=isolated?'RESTORE ALL':'ISOLATE';renderParts();}
function hiddenCount(){const n=Object.values(groups).filter(g=>!g.visible).length;document.getElementById('partCount').textContent=`12 SYSTEMS · ${n} HIDDEN`;}
document.getElementById('togglePart').onclick=()=>{if(isolated){for(const id of Object.keys(groups))groups[id].visible=true;isolated=false;}groups[selected].visible=!groups[selected].visible;select(selected);hiddenCount();};
document.getElementById('isolate').onclick=()=>{isolated=!isolated;for(const id of Object.keys(groups))groups[id].visible=!isolated||id===selected;select(selected);hiddenCount();};
document.getElementById('explode').onclick=()=>{exploded=!exploded;document.getElementById('explode').classList.toggle('active',exploded);document.getElementById('explode').textContent=exploded?'EXPLODED VIEW ✓':'EXPLODED VIEW ↗';};
document.getElementById('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));renderParts();});
renderParts();select(selected);hiddenCount();
})();
