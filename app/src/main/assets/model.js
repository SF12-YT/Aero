/* AeroLab 25 — lightweight, local WebGL assembly viewer. No network or third-party runtime. */
(() => {
'use strict';
const canvas=document.getElementById('gl');
const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'high-performance'});
if(!gl){document.querySelector('.viewer').innerHTML='<div style="padding:30px;color:#eef">3D graphics are unavailable on this device.</div>';return;}
const vertex=`attribute vec3 aPosition; attribute vec3 aNormal; uniform mat4 uVP; uniform vec3 uOffset; varying vec3 vNormal; varying vec3 vWorld; void main(){vec3 p=aPosition+uOffset;vWorld=p;vNormal=aNormal;gl_Position=uVP*vec4(p,1.0);}`;
const fragment=`precision mediump float; uniform vec3 uColor; uniform float uSelected; varying vec3 vNormal; varying vec3 vWorld; void main(){vec3 n=normalize(vNormal);vec3 l=normalize(vec3(0.48,0.84,0.62));vec3 v=normalize(vec3(4.0,5.5,7.0)-vWorld);float d=max(dot(n,l),0.0);float s=pow(max(dot(reflect(-l,n),v),0.0),26.0);float rim=pow(1.0-max(dot(n,v),0.0),3.0);vec3 c=uColor*(0.34+0.72*d)+vec3(0.22)*s+uColor*rim*0.08;if(uSelected>0.5)c=mix(c,vec3(1.0,0.48,0.13),0.23);gl_FragColor=vec4(c,1.0);}`;
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const loc={pos:gl.getAttribLocation(program,'aPosition'),normal:gl.getAttribLocation(program,'aNormal'),vp:gl.getUniformLocation(program,'uVP'),offset:gl.getUniformLocation(program,'uOffset'),color:gl.getUniformLocation(program,'uColor'),selected:gl.getUniformLocation(program,'uSelected')};
const C={carbon:'#171f29',carbon2:'#26313c',body:'#aebbc5',bodyHi:'#d5dce1',bodyDark:'#596a78',wing:'#252f3b',tyre:'#111519',tyre2:'#252b31',rim:'#8796a3',rimDark:'#394754',steel:'#8498a8',steelHi:'#b5c1c9',gold:'#e9a64d',cyan:'#67b9c8',black:'#080d13',red:'#b64b3c'};
function rgb(hex){const n=parseInt(hex.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
const groups={};
const defs=[
{id:'frontWing',name:'Front wing assembly',short:'Front wing',category:'AERO',label:'AERODYNAMICS',accuracy:'RECONSTRUCTED',desc:'Multi-element front wing with endplates. Generates front aerodynamic load and conditions airflow around the front tyres.',off:[0,.68,0]},
{id:'nose',name:'Nose & monocoque',short:'Nose / chassis',category:'CHASSIS',label:'STRUCTURE',accuracy:'REGULATION-LED',desc:'The forward nose structure and carbon-fibre survival cell form the central structural spine of the car.',off:[0,.35,0]},
{id:'sidepods',name:'Sidepod bodywork',short:'Sidepods',category:'AERO',label:'AERODYNAMICS',accuracy:'RECONSTRUCTED',desc:'Shaped sidepod surfaces package cooling hardware while managing the flow directed towards the floor and rear of the car.',off:[0,.24,.5]},
{id:'floor',name:'Floor & diffuser',short:'Floor / diffuser',category:'AERO',label:'UNDERFLOOR AERO',accuracy:'REGULATION-LED',desc:'The floor, tunnels and rear diffuser accelerate underfloor flow to create a large share of the car’s aerodynamic load.',off:[0,-.52,0]},
{id:'rearWing',name:'Rear wing assembly',short:'Rear wing',category:'AERO',label:'AERODYNAMICS',accuracy:'RECONSTRUCTED',desc:'The rear wing and beam wing generate rear aerodynamic load. The upper flap is represented as a separate visual element.',off:[-.12,.72,0]},
{id:'halo',name:'Halo & cockpit',short:'Halo / cockpit',category:'CHASSIS',label:'DRIVER SAFETY',accuracy:'REGULATION-LED',desc:'The titanium halo protects the driver’s survival space; the cockpit contains the seat, steering wheel and restraint zone.',off:[0,.52,0]},
{id:'frontSusp',name:'Front suspension',short:'Front suspension',category:'SUSPENSION',label:'KINEMATICS',accuracy:'RECONSTRUCTED',desc:'Upper and lower wishbones, steering link and pushrod connect the chassis to the front uprights. Geometry is illustrative.',off:[0,.22,.36]},
{id:'rearSusp',name:'Rear suspension',short:'Rear suspension',category:'SUSPENSION',label:'KINEMATICS',accuracy:'RECONSTRUCTED',desc:'Rear links locate the upright and transmit tyre loads into the gearbox-mounted suspension structure.',off:[-.15,.2,.36]},
{id:'wheels',name:'Wheels & braking',short:'Wheels / brakes',category:'MECHANICAL',label:'ROTATING ASSEMBLY',accuracy:'LAYOUT STUDY',desc:'18-inch-era wheel package with slick tyre, rim, hub, brake disc and caliper. Dimensions are scaled for visual study.',off:[0,0,.58]},
{id:'power',name:'Power unit',short:'Power unit',category:'MECHANICAL',label:'1.6L V6 HYBRID',accuracy:'LAYOUT STUDY',desc:'A simplified 1.6-litre turbocharged V6 hybrid power-unit package, including intake plenum, turbo hardware and exhaust routing.',off:[-.35,-.08,0]},
{id:'gearbox',name:'Gearbox & drivetrain',short:'Gearbox',category:'MECHANICAL',label:'TRANSMISSION',accuracy:'LAYOUT STUDY',desc:'The rear transmission casing and differential connect the power unit to the driven rear wheels.',off:[-.6,.08,0]},
{id:'cooling',name:'Cooling systems',short:'Cooling',category:'MECHANICAL',label:'THERMAL SYSTEMS',accuracy:'LAYOUT STUDY',desc:'Radiator cores and ducting are placed inside the sidepod envelope to illustrate the cooling package.',off:[0,.06,.78]}
];
for(const d of defs)groups[d.id]={def:d,meshes:[],visible:true};
let exploded=false,selected='frontWing',isolated=false;
function addMesh(g,positions,indices,color){const normals=new Float32Array(positions.length);for(let i=0;i<indices.length;i+=3){const ia=indices[i]*3,ib=indices[i+1]*3,ic=indices[i+2]*3;const ax=positions[ib]-positions[ia],ay=positions[ib+1]-positions[ia+1],az=positions[ib+2]-positions[ia+2],bx=positions[ic]-positions[ia],by=positions[ic+1]-positions[ia+1],bz=positions[ic+2]-positions[ia+2];const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;for(const q of [ia,ib,ic]){normals[q]+=nx;normals[q+1]+=ny;normals[q+2]+=nz;}}
for(let i=0;i<normals.length;i+=3){let l=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;normals[i]/=l;normals[i+1]/=l;normals[i+2]/=l;}
const p=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(positions),gl.STATIC_DRAW);const n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,normals,gl.STATIC_DRAW);const ix=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ix);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);groups[g].meshes.push({p,n,ix,count:indices.length,color:rgb(color),hex:color,rawP:positions,rawI:indices});}
function quad(P,I,a,b,c,d){const k=P.length/3;P.push(...a,...b,...c,...d);I.push(k,k+1,k+2,k,k+2,k+3);}
function box(g,x,y,z,sx,sy,sz,color){const x0=x-sx/2,x1=x+sx/2,y0=y-sy/2,y1=y+sy/2,z0=z-sz/2,z1=z+sz/2,P=[],I=[];quad(P,I,[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]);quad(P,I,[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0]);quad(P,I,[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]);quad(P,I,[x0,y0,z1],[x0,y0,z0],[x1,y0,z0],[x1,y0,z1]);quad(P,I,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]);quad(P,I,[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]);addMesh(g,P,I,color);}
function cylinder(g,a,b,r1,r2,color,segments=16){const A=a,B=b,dx=B[0]-A[0],dy=B[1]-A[1],dz=B[2]-A[2],len=Math.hypot(dx,dy,dz)||1,axis=[dx/len,dy/len,dz/len];let seed=Math.abs(axis[1])<.88?[0,1,0]:[1,0,0];let u=[axis[1]*seed[2]-axis[2]*seed[1],axis[2]*seed[0]-axis[0]*seed[2],axis[0]*seed[1]-axis[1]*seed[0]];let ul=Math.hypot(...u)||1;u=u.map(v=>v/ul);let v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]];const P=[],I=[];for(let j=0;j<2;j++){const center=j?B:A,r=j?r2:r1;for(let i=0;i<segments;i++){const t=i/segments*Math.PI*2;P.push(center[0]+r*(u[0]*Math.cos(t)+v[0]*Math.sin(t)),center[1]+r*(u[1]*Math.cos(t)+v[1]*Math.sin(t)),center[2]+r*(u[2]*Math.cos(t)+v[2]*Math.sin(t)));}}for(let i=0;i<segments;i++){const n=(i+1)%segments;I.push(i,n,segments+n,i,segments+n,segments+i);I.push(2*segments, n, i);I.push(2*segments+1,segments+i,segments+n);}P.push(...A,...B);addMesh(g,P,I,color);}
function sphere(g,c,r,color,scale=[1,1,1],segments=18,rings=12){const P=[],I=[];for(let y=0;y<=rings;y++){const v=y/rings,phi=v*Math.PI;for(let x=0;x<=segments;x++){const u=x/segments*2*Math.PI;P.push(c[0]+Math.sin(phi)*Math.cos(u)*r*scale[0],c[1]+Math.cos(phi)*r*scale[1],c[2]+Math.sin(phi)*Math.sin(u)*r*scale[2]);}}for(let y=0;y<rings;y++)for(let x=0;x<segments;x++){const a=y*(segments+1)+x,b=a+segments+1;I.push(a,a+1,b,b,a+1,b+1);}addMesh(g,P,I,color);}
function loft(g,sections,color,segments=24){const P=[],I=[];for(const s of sections){const [x,cy,cz,w,h]=s;for(let j=0;j<segments;j++){const t=j/segments*Math.PI*2;P.push(x,cy+Math.sin(t)*h,cz+Math.cos(t)*w);}}for(let r=0;r<sections.length-1;r++)for(let j=0;j<segments;j++){const a=r*segments+j,b=r*segments+(j+1)%segments,c=(r+1)*segments+(j+1)%segments,d=(r+1)*segments+j;if(sections[sections.length-1][0]>sections[0][0])I.push(a,c,b,a,d,c);else I.push(a,b,c,a,c,d);}for(let j=1;j<segments-1;j++){I.push(0,j+1,j);const z=(sections.length-1)*segments;I.push(z,z+j,z+j+1);}addMesh(g,P,I,color);}
function torus(g,c,R,r,color,radial=36,tubular=10){const P=[],I=[];for(let i=0;i<=radial;i++){const u=i/radial*Math.PI*2;for(let j=0;j<=tubular;j++){const v=j/tubular*Math.PI*2;P.push(c[0]+(R+r*Math.cos(v))*Math.cos(u),c[1]+(R+r*Math.cos(v))*Math.sin(u),c[2]+r*Math.sin(v));}}for(let i=0;i<radial;i++)for(let j=0;j<tubular;j++){const a=i*(tubular+1)+j,b=(i+1)*(tubular+1)+j;I.push(a,a+1,b,b,a+1,b+1);}addMesh(g,P,I,color);}
function beam(g,a,b,r,color){cylinder(g,a,b,r,r*.91,color,10);}
function wheel(x,z,group='wheels'){const y=.64;torus(group,[x,y,z],.475,.145,C.tyre,44,14);torus(group,[x,y,z+(z>0?.14:-.14)],.355,.028,C.tyre2,36,8);cylinder(group,[x,y,z-.13],[x,y,z+.13],.345,.345,C.rim,32);cylinder(group,[x,y,z-.155],[x,y,z+.155],.29,.29,C.rimDark,24);cylinder(group,[x,y,z-.19],[x,y,z+.19],.105,.105,C.steelHi,16);cylinder(group,[x,y,z-.205],[x,y,z+.205],.052,.052,C.gold,14);
for(let k=0;k<10;k++){const a=k/10*Math.PI*2;const p1=[x+Math.cos(a)*.12,y+Math.sin(a)*.12,z];const p2=[x+Math.cos(a+.22)*.31,y+Math.sin(a+.22)*.31,z];beam(group,p1,p2,.018,C.steelHi);}
// Perforated-looking brake rotor and caliper, set just inboard of the rim.
cylinder(group,[x,y,z-(z>0?.19:-.19)],[x,y,z+(z>0?.19:-.19)],.275,.275,C.steel,30);
box(group,x+.03,y+.13,z+(z>0?-.23:.23),.18,.24,.10,C.gold);
}
// Chassis / forward structure.
loft('nose',[[-1.28,.78,0,.34,.25],[-.72,.82,0,.40,.34],[.05,.82,0,.40,.36],[.62,.78,0,.28,.22]],C.body,28);
loft('nose',[[.5,.69,0,.25,.19],[1.25,.65,0,.205,.16],[2.05,.62,0,.14,.12],[2.72,.59,0,.085,.075],[3.05,.57,0,.025,.03]],C.bodyHi,24);
// Cockpit top fairing and seat.
loft('nose',[[-.2,1.03,0,.28,.09],[-.7,1.00,0,.30,.08],[-1.05,.91,0,.24,.07]],C.bodyDark,20);
box('nose',-.25,.92,0,.68,.16,.36,C.black);
// Sidepods, left and right with sculpted shoulder and dark inlet.
for(const s of [-1,1]){
 loft('sidepods',[[.72,.59,s*.67,.22,.20],[.30,.58,s*.69,.35,.28],[-.35,.57,s*.68,.38,.27],[-.88,.55,s*.65,.30,.22],[-1.12,.52,s*.61,.20,.16]],C.body,24);
 box('sidepods',.60,.72,s*.68,.13,.16,.30,C.carbon);
 box('sidepods',.61,.75,s*.68,.07,.07,.23,C.black);
 box('sidepods',-.55,.47,s*.72,.55,.025,.40,C.bodyDark);
}
// Cooling pack behind the outer bodywork.
for(const s of [-1,1]){
 box('cooling',-.13,.62,s*.65,.72,.29,.40,C.rimDark);
 for(let i=0;i<7;i++)box('cooling',-.42+i*.09,.62,s*.65,.025,.25,.41,C.steel);
 box('cooling',.38,.61,s*.67,.20,.18,.32,C.carbon);
 cylinder('cooling',[.43,.56,s*.66],[.68,.68,s*.68],.055,.055,C.cyan,12);
}
// Floor, edge fences, tunnels and diffuser.
box('floor',-.24,.28,0,2.85,.075,1.52,C.carbon);
box('floor',-.35,.225,-.48,2.45,.04,.34,C.bodyDark);box('floor',-.35,.225,.48,2.45,.04,.34,C.bodyDark);
for(const s of [-1,1]){for(let i=0;i<3;i++)box('floor',-.28+i*.52,.34,s*(.56+i*.025),.075,.17,.035,C.steel);box('floor',-1.73,.40,s*.47,.50,.34,.07,C.carbon2);}
box('floor',-2.0,.36,0,.55,.20,1.05,C.carbon2);
box('floor',-2.2,.30,0,.30,.13,1.12,C.carbon);
// Front wing main plane, flaps and end plates.
box('frontWing',2.93,.25,0,.67,.095,2.26,C.wing);
box('frontWing',2.72,.355,0,.48,.075,2.05,C.carbon2);
box('frontWing',2.54,.43,0,.35,.055,1.78,C.steel);
for(const s of [-1,1]){box('frontWing',2.86,.38,s*1.12,.48,.34,.045,C.carbon);box('frontWing',2.86,.40,s*1.15,.36,.025,.05,C.gold);for(let i=0;i<3;i++)box('frontWing',2.64+i*.07,.31,s*(.82+i*.12),.025,.18,.025,C.steel);}
// Rear wing mainplane, flap, beam wing, endplates and supports.
box('rearWing',-3.02,1.60,0,.42,.10,1.98,C.wing);
box('rearWing',-3.22,1.86,0,.40,.075,1.90,C.carbon2);
box('rearWing',-2.76,1.34,0,.38,.06,1.56,C.carbon);
for(const s of [-1,1]){box('rearWing',-3.03,1.73,s*.99,.46,.64,.045,C.bodyDark);box('rearWing',-3.02,1.91,s*.99,.38,.035,.05,C.gold);}
beam('rearWing',[-2.38,.91,-.13],[-2.98,1.61,-.13],.045,C.carbon2);beam('rearWing',[-2.38,.91,.13],[-2.98,1.61,.13],.045,C.carbon2);
// Halo / cockpit protection with centre support and curved side rails.
for(const s of [-1,1]){beam('halo',[.47,1.03,s*.13],[.32,1.40,s*.33],.035,C.steelHi);beam('halo',[.32,1.40,s*.33],[-.60,1.40,s*.33],.035,C.steelHi);beam('halo',[-.60,1.40,s*.33],[-.78,1.13,s*.28],.035,C.steelHi);}
beam('halo',[.47,1.03,0],[.32,1.40,0],.045,C.steelHi);beam('halo',[.32,1.40,-.33],[.32,1.40,.33],.035,C.steelHi);
box('halo',-.12,.89,0,.48,.32,.28,C.black);sphere('halo',[-.25,1.02,0],.15,C.gold,[.8,1,.8],16,10);
// Suspension: upper/lower wishbones, pushrods, steering links and uprights.
for(const s of [-1,1]){
 const fW=[1.82,.64,s*.98], fU=[1.55,.94,s*.36],fL=[1.46,.43,s*.35],fB=[1.72,.66,s*.70];
 beam('frontSusp',[1.18,.99,s*.24],[...fW.slice(0,2),s*.89],.026,C.carbon2);beam('frontSusp',[1.22,.92,s*.20],[...fU.slice(0,2),s*.35],.028,C.steel);
 beam('frontSusp',[1.05,.43,s*.25],[...fW.slice(0,2),s*.90],.026,C.carbon2);beam('frontSusp',[1.12,.48,s*.20],[...fL.slice(0,2),s*.36],.028,C.steel);
 beam('frontSusp',[1.45,.60,s*.18],[1.80,.66,s*.87],.022,C.gold);beam('frontSusp',[1.35,.62,s*.31],[1.78,.72,s*.84],.018,C.carbon);
 beam('frontSusp',[1.70,.45,s*.90],[1.88,.86,s*.91],.055,C.rimDark);
 // rear links.
 const rW=[-1.82,.64,s*.98];beam('rearSusp',[-1.12,1.00,s*.25],[-1.79,.83,s*.89],.027,C.carbon2);beam('rearSusp',[-1.24,.93,s*.20],[-1.80,.68,s*.87],.028,C.steel);
 beam('rearSusp',[-1.18,.43,s*.23],[-1.80,.43,s*.88],.027,C.carbon2);beam('rearSusp',[-1.08,.48,s*.18],[-1.78,.61,s*.86],.028,C.steel);
 beam('rearSusp',[-1.40,.62,s*.2],[-1.79,.65,s*.88],.023,C.gold);beam('rearSusp',[-1.68,.42,s*.89],[-1.86,.86,s*.91],.055,C.rimDark);
}
// Wheels, rims, hubs, brake discs and calipers.
for(const x of [1.82,-1.82])for(const s of [-1,1])wheel(x,s*.99);
// Power unit: engine block, V-bank forms, intake plenum, turbo and exhaust.
box('power',-1.14,.68,0,.98,.48,.60,C.rimDark);
for(const s of [-1,1]){for(let i=0;i<3;i++){const xx=-.75-i*.22;beam('power',[xx,.79,s*.06],[xx-.10,1.03,s*.20],.085,C.steel);beam('power',[xx,.79,s*.06],[xx-.10,1.03,s*.20],.055,C.bodyDark);}}
box('power',-.92,1.13,0,.70,.18,.42,C.bodyDark);box('power',-.92,1.24,0,.54,.10,.31,C.cyan);
cylinder('power',[-.82,.92,-.32],[-.95,.92,-.55],.12,.10,C.gold,18);cylinder('power',[-.82,.92,.32],[-.95,.92,.55],.12,.10,C.gold,18);
for(const s of [-1,1]){beam('power',[-1.18,.75,s*.28],[-1.62,.87,s*.30],.045,C.steelHi);beam('power',[-1.62,.87,s*.30],[-1.82,.82,s*.25],.045,C.gold);}
// Gearbox casing and differential.
loft('gearbox',[[-2.48,.65,0,.24,.20],[-2.18,.70,0,.34,.30],[-1.82,.70,0,.31,.28]],C.rimDark,22);
box('gearbox',-2.13,.43,0,.58,.15,.48,C.carbon2);cylinder('gearbox',[-2.25,.64,-.42],[-2.25,.64,.42],.11,.11,C.steel,16);
for(const s of [-1,1]){beam('gearbox',[-2.04,.67,s*.23],[-1.83,.64,s*.62],.055,C.steelHi);}
// Small fasteners on serviceable visible interfaces for visual scale cues.
for(const s of [-1,1]){for(let i=0;i<5;i++){sphere('sidepods',[.35-i*.25,.39,s*.94],.018,C.gold,[1,1,.7],8,6);}}
// Batch each assembly by material so the phone draws a small number of meshes per frame.
function batchAssemblies(){for(const id of Object.keys(groups)){const old=groups[id].meshes,buckets=new Map();for(const m of old){let b=buckets.get(m.hex);if(!b){b={p:[],i:[],hex:m.hex};buckets.set(m.hex,b);}const base=b.p.length/3;for(const v of m.rawP)b.p.push(v);for(const v of m.rawI)b.i.push(v+base);if(gl.deleteBuffer){gl.deleteBuffer(m.p);gl.deleteBuffer(m.n);gl.deleteBuffer(m.ix);}}groups[id].meshes=[];for(const b of buckets.values())addMesh(id,b.p,b.i,b.hex);}}
batchAssemblies();

// Floor grid lines as very subtle world geometry.
const P=[],I=[];for(let x=-5;x<=5;x+=.5){const k=P.length/3;P.push(x,.015,-3.5,x,.015,3.5);I.push(k,k+1);}for(let z=-3;z<=3;z+=.5){const k=P.length/3;P.push(-5,.015,z,5,.015,z);I.push(k,k+1);} // rendered with a faint unlit tint is intentionally omitted from the solid model.

// Camera / matrix math.
const V=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,center,up){const z=norm(V(eye,center)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
let yaw=.82,pitch=.34,distance=8.6,target=[0,.74,0],lastTime=0;
function resize(){const dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}
function offsetFor(id){if(!exploded)return [0,0,0];const o=groups[id].def.off;return o.map(v=>v*1.35);}
function render(t){resize();gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const cp=Math.cos(pitch),eye=[target[0]+distance*Math.sin(yaw)*cp,target[1]+distance*Math.sin(pitch),target[2]+distance*Math.cos(yaw)*cp];const vp=mul(perspective(42*Math.PI/180,canvas.width/canvas.height,.1,80),lookAt(eye,target,[0,1,0]));gl.useProgram(program);gl.uniformMatrix4fv(loc.vp,false,vp);for(const id of Object.keys(groups)){const gr=groups[id];if(!gr.visible)continue;const off=offsetFor(id);gl.uniform3f(loc.offset,off[0],off[1],off[2]);gl.uniform1f(loc.selected,id===selected?1:0);for(const m of gr.meshes){gl.bindBuffer(gl.ARRAY_BUFFER,m.p);gl.enableVertexAttribArray(loc.pos);gl.vertexAttribPointer(loc.pos,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.enableVertexAttribArray(loc.normal);gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.ix);gl.uniform3f(loc.color,m.color[0],m.color[1],m.color[2]);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);}}requestAnimationFrame(render);}
requestAnimationFrame(render);

// Native-feeling touch orbit controls, including pinch zoom.
let pointers=new Map(),lastPoint=null,lastPinch=0;canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);lastPoint=[e.clientX,e.clientY];});canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId),now=[e.clientX,e.clientY];pointers.set(e.pointerId,now);if(pointers.size===1){yaw-=(now[0]-prev[0])*.008;pitch=Math.max(-.12,Math.min(1.22,pitch+(now[1]-prev[1])*.006));}else if(pointers.size>=2){const pts=[...pointers.values()],d=Math.hypot(pts[0][0]-pts[1][0],pts[0][1]-pts[1][1]);if(lastPinch)distance=Math.max(5.4,Math.min(14,distance*lastPinch/d));lastPinch=d;}});const endPointer=e=>{pointers.delete(e.pointerId);lastPinch=0;};canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('wheel',e=>{distance=Math.max(5.3,Math.min(14,distance+e.deltaY*.008));e.preventDefault();},{passive:false});
function setView(v){document.querySelectorAll('.toolbtn').forEach(b=>b.classList.remove('active'));const b=document.getElementById(v==='iso'?'viewIso':v==='side'?'viewSide':'viewTop');if(b)b.classList.add('active');if(v==='iso'){yaw=.82;pitch=.34;distance=8.6;target=[0,.74,0];}if(v==='side'){yaw=0;pitch=.10;distance=9.8;target=[0,.75,0];}if(v==='top'){yaw=.82;pitch=1.34;distance=9.4;target=[0,.2,0];}}
document.getElementById('viewIso').onclick=()=>setView('iso');document.getElementById('viewSide').onclick=()=>setView('side');document.getElementById('viewTop').onclick=()=>setView('top');document.getElementById('viewReset').onclick=()=>setView('iso');

// Inspector UI.
let filter='ALL';const partHost=document.getElementById('parts');
function renderParts(){partHost.innerHTML='';const filtered=defs.filter(d=>filter==='ALL'||d.category===filter);for(const d of filtered){const b=document.createElement('button');b.className='part'+(d.id===selected?' active':'');b.innerHTML=`<span class="num">${String(defs.indexOf(d)+1).padStart(2,'0')}</span><span class="pname">${d.short}</span>`;b.onclick=()=>select(d.id);partHost.appendChild(b);}}
function select(id){selected=id;const d=groups[id].def;document.getElementById('selCategory').textContent=d.label;document.getElementById('selAccuracy').textContent=d.accuracy;document.getElementById('selName').textContent=d.name;document.getElementById('selDesc').textContent=d.desc;document.getElementById('togglePart').textContent=groups[id].visible?'HIDE PART':'SHOW PART';document.getElementById('isolate').textContent=isolated?'RESTORE ALL':'ISOLATE';renderParts();}
function countHidden(){const n=Object.values(groups).filter(g=>!g.visible).length;document.getElementById('partCount').textContent=`12 SYSTEMS · ${n} HIDDEN`;}
document.getElementById('togglePart').onclick=()=>{if(isolated){for(const id of Object.keys(groups))groups[id].visible=true;isolated=false;}groups[selected].visible=!groups[selected].visible;select(selected);countHidden();};
document.getElementById('isolate').onclick=()=>{isolated=!isolated;for(const id of Object.keys(groups))groups[id].visible=!isolated||id===selected;select(selected);countHidden();};
document.getElementById('explode').onclick=()=>{exploded=!exploded;document.getElementById('explode').classList.toggle('active',exploded);document.getElementById('explode').textContent=exploded?'EXPLODED VIEW ✓':'EXPLODED VIEW ↗';};
document.getElementById('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));renderParts();});
renderParts();select(selected);countHidden();
})();
