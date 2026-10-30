/* AeroLab 25 — RB21-inspired 2025 ground-effect exterior study.
 * All geometry is generated locally; no CDN, network request, or external runtime.
 * Coordinate convention: +X = front of car, +Y = up, +/-Z = left/right.
 */
(() => {
'use strict';
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl', { alpha:true, antialias:true, powerPreference:'high-performance' });
if (!gl) { document.querySelector('.viewer').innerHTML = '<div style="padding:30px;color:#eef">3D graphics are unavailable on this device.</div>'; return; }

const vertex = `attribute vec3 aPosition; attribute vec3 aNormal; uniform mat4 uVP; uniform vec3 uOffset; varying vec3 vNormal; varying vec3 vWorld; void main(){vec3 p=aPosition+uOffset;vWorld=p;vNormal=aNormal;gl_Position=uVP*vec4(p,1.0);}`;
const fragment = `precision mediump float; uniform vec3 uColor; uniform float uSelected; varying vec3 vNormal; varying vec3 vWorld; void main(){vec3 n=normalize(vNormal);vec3 l=normalize(vec3(.42,.84,.55));vec3 v=normalize(vec3(4.0,5.0,7.0)-vWorld);float ndl=max(dot(n,l),0.0);float spec=pow(max(dot(reflect(-l,n),v),0.0),34.0);float rim=pow(1.0-max(dot(n,v),0.0),2.8);vec3 base=uColor*(.26+.78*ndl)+vec3(.23)*spec+uColor*rim*.12;if(uSelected>.5)base=mix(base,vec3(1.0,.48,.10),.25);gl_FragColor=vec4(base,1.0);}`;
function compile(type, source) { const s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
const program=gl.createProgram(); gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex)); gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment)); gl.linkProgram(program);
if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
const loc={pos:gl.getAttribLocation(program,'aPosition'),normal:gl.getAttribLocation(program,'aNormal'),vp:gl.getUniformLocation(program,'uVP'),offset:gl.getUniformLocation(program,'uOffset'),color:gl.getUniformLocation(program,'uColor'),selected:gl.getUniformLocation(program,'uSelected')};
const C={navy:'#101a2b',navy2:'#1b2a41',navy3:'#293951',carbon:'#0b1018',carbon2:'#202a36',carbon3:'#354352',yellow:'#f2c319',yellowHi:'#ffe05b',red:'#d62828',red2:'#8d1721',rubber:'#101316',rubberHi:'#242b30',rim:'#a5adb5',rimDark:'#5c6874',steel:'#82909d',steelHi:'#c3cbd2',gold:'#e5a83d',cool:'#719eaa',white:'#e9edf0',black:'#05080d'};
function rgb(hex){const n=parseInt(hex.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
const groups={};
const defs=[
{id:'frontWing',name:'Front wing assembly',short:'Front wing',category:'AERO',label:'AERODYNAMICS',accuracy:'REFERENCE-BASED',desc:'Three sculpted front-wing elements, curved endplates, nose pylons and outboard flow-control details. Geometry is a visual reconstruction from public RB21 imagery and 2025 rules.' ,off:[0,.62,0]},
{id:'nose',name:'Nose & survival cell',short:'Nose / chassis',category:'CHASSIS',label:'PRIMARY STRUCTURE',accuracy:'REGULATION-LED',desc:'Tapered nose, forward impact-structure envelope, survival-cell shoulder, cockpit opening and central chassis spine. Internal laminate is not represented.',off:[.1,.32,0]},
{id:'sidepods',name:'Sidepod bodywork',short:'Sidepods',category:'AERO',label:'BODYWORK',accuracy:'REFERENCE-BASED',desc:'RB21-inspired inlet shoulders, deep lower undercut, rising rear deck, coke-bottle transition and cooling louvre details.',off:[0,.2,.52]},
{id:'floor',name:'Floor, tunnels & diffuser',short:'Floor / diffuser',category:'AERO',label:'UNDERFLOOR AERO',accuracy:'REGULATION-LED',desc:'Shaped floor perimeter, twin venturi tunnel volumes, floor-edge features, fences and a rising rear diffuser. Exact team internal geometry remains proprietary.',off:[0,-.5,0]},
{id:'rearWing',name:'Rear wing & beam wing',short:'Rear wing',category:'AERO',label:'AERODYNAMICS',accuracy:'REFERENCE-BASED',desc:'Sculpted upper rear-wing elements, endplates, supports and lower beam-wing profile, based on public 2025 RB21 views.',off:[-.12,.72,0]},
{id:'halo',name:'Halo & cockpit',short:'Halo / cockpit',category:'CHASSIS',label:'DRIVER SAFETY',accuracy:'REGULATION-LED',desc:'Curved titanium halo rails, centre pillar, cockpit opening, seat surround, mirrors and driver-protection envelope.',off:[0,.5,0]},
{id:'frontSusp',name:'Front suspension',short:'Front suspension',category:'SUSPENSION',label:'KINEMATICS',accuracy:'REFERENCE-BASED',desc:'Sculpted upper and lower wishbone members, steering link, pushrod and upright fairings. Exact pickup coordinates are estimated from photographs.',off:[0,.18,.36]},
{id:'rearSusp',name:'Rear suspension',short:'Rear suspension',category:'SUSPENSION',label:'KINEMATICS',accuracy:'REFERENCE-BASED',desc:'Rear wishbones, toe link, pushrod and gearbox-side mount representation. The exposed shape is more detailed; internal joints remain simplified.',off:[-.12,.18,.36]},
{id:'wheels',name:'Wheels, tyres & brakes',short:'Wheels / brakes',category:'MECHANICAL',label:'ROTATING ASSEMBLY',accuracy:'DIMENSIONAL STUDY',desc:'18-inch wheel-era slick tyres, wheel rims, hub detail, brake discs, calipers and brake-cooling hardware.',off:[0,0,.6]},
{id:'power',name:'Power-unit package',short:'Power unit',category:'MECHANICAL',label:'1.6L V6 HYBRID',accuracy:'LAYOUT STUDY',desc:'Simplified V6, plenum, turbocharger and exhaust package, shown only for exploratory assembly views; not manufacturer CAD.',off:[-.34,-.08,0]},
{id:'gearbox',name:'Gearbox & drivetrain',short:'Gearbox',category:'MECHANICAL',label:'TRANSMISSION',accuracy:'LAYOUT STUDY',desc:'Tapered gearbox casing, differential and driveshaft interface. Internal gearsets and exact casing dimensions are not publicly known.',off:[-.58,.06,0]},
{id:'cooling',name:'Cooling systems',short:'Cooling',category:'MECHANICAL',label:'THERMAL SYSTEMS',accuracy:'LAYOUT STUDY',desc:'Radiator cores, ducts and sidepod heat-exchanger layout represented beneath the outer bodywork.',off:[0,.05,.78]}
];
for(const d of defs) groups[d.id]={def:d,meshes:[],visible:true};
let exploded=false,selected='sidepods',isolated=false;

function addMesh(g,positions,indices,color){
  const normals=new Float32Array(positions.length);
  for(let i=0;i<indices.length;i+=3){const ia=indices[i]*3,ib=indices[i+1]*3,ic=indices[i+2]*3;const ax=positions[ib]-positions[ia],ay=positions[ib+1]-positions[ia+1],az=positions[ib+2]-positions[ia+2],bx=positions[ic]-positions[ia],by=positions[ic+1]-positions[ia+1],bz=positions[ic+2]-positions[ia+2];const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;for(const q of [ia,ib,ic]){normals[q]+=nx;normals[q+1]+=ny;normals[q+2]+=nz;}}
  for(let i=0;i<normals.length;i+=3){const l=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;normals[i]/=l;normals[i+1]/=l;normals[i+2]/=l;}
  const p=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(positions),gl.STATIC_DRAW);
  const n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,normals,gl.STATIC_DRAW);
  const ix=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ix);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  groups[g].meshes.push({p,n,ix,count:indices.length,color:rgb(color),hex:color,rawP:positions,rawI:indices});
}
function gridSurface(g,nu,nv,point,color){const P=[],I=[];for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++)P.push(...point(i/nu,j/nv));const stride=nv+1;for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*stride+j,b=a+1,c=a+stride+1,d=a+stride;I.push(a,b,c,a,c,d);}addMesh(g,P,I,color);}
function box(g,x,y,z,sx,sy,sz,color){const x0=x-sx/2,x1=x+sx/2,y0=y-sy/2,y1=y+sy/2,z0=z-sz/2,z1=z+sz/2,P=[],I=[];const q=(a,b,c,d)=>{const k=P.length/3;P.push(...a,...b,...c,...d);I.push(k,k+1,k+2,k,k+2,k+3);};q([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]);q([x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0]);q([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]);q([x0,y0,z1],[x0,y0,z0],[x1,y0,z0],[x1,y0,z1]);q([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]);q([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]);addMesh(g,P,I,color);}
function loft(g,sections,color,segments=40,shape=2.35){const P=[],I=[],pow=2/shape;for(const s of sections){const [x,cy,cz,w,h]=s;for(let j=0;j<segments;j++){const t=j/segments*Math.PI*2,co=Math.cos(t),si=Math.sin(t);const zz=Math.sign(co)*Math.pow(Math.abs(co),pow),yy=Math.sign(si)*Math.pow(Math.abs(si),pow);P.push(x,cy+yy*h,cz+zz*w);}}for(let r=0;r<sections.length-1;r++)for(let j=0;j<segments;j++){const a=r*segments+j,b=r*segments+(j+1)%segments,c=(r+1)*segments+(j+1)%segments,d=(r+1)*segments+j;I.push(a,b,c,a,c,d);}for(let j=1;j<segments-1;j++){I.push(0,j+1,j);const z=(sections.length-1)*segments;I.push(z,z+j,z+j+1);}addMesh(g,P,I,color);}
function cylinder(g,a,b,r1,r2,color,segments=18){const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],len=Math.hypot(...d)||1,axis=d.map(v=>v/len),seed=Math.abs(axis[1])<.88?[0,1,0]:[1,0,0];let u=[axis[1]*seed[2]-axis[2]*seed[1],axis[2]*seed[0]-axis[0]*seed[2],axis[0]*seed[1]-axis[1]*seed[0]],ul=Math.hypot(...u)||1;u=u.map(v=>v/ul);const v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]],P=[],I=[];for(let j=0;j<2;j++){const c=j?b:a,r=j?r2:r1;for(let i=0;i<segments;i++){const t=i/segments*Math.PI*2;P.push(c[0]+r*(u[0]*Math.cos(t)+v[0]*Math.sin(t)),c[1]+r*(u[1]*Math.cos(t)+v[1]*Math.sin(t)),c[2]+r*(u[2]*Math.cos(t)+v[2]*Math.sin(t)));}}for(let i=0;i<segments;i++){const n=(i+1)%segments;I.push(i,n,segments+n,i,segments+n,segments+i);}const base=P.length/3;P.push(...a,...b);for(let i=0;i<segments;i++){const n=(i+1)%segments;I.push(base,i,n,base+1,segments+n,segments+i);}addMesh(g,P,I,color);}
function tubePath(g,pts,r,color,segments=10,flatten=.72){const samples=[];for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1],steps=5;for(let j=0;j<steps;j++){const t=j/steps;samples.push(a.map((v,i)=>v+(b[i]-v)*t));}}samples.push(pts[pts.length-1]);const P=[],I=[];for(let i=0;i<samples.length;i++){const prev=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+1)],t=next.map((v,j)=>v-prev[j]);let l=Math.hypot(...t)||1;t.forEach((v,j)=>t[j]=v/l);let seed=Math.abs(t[1])<.88?[0,1,0]:[1,0,0];let u=[t[1]*seed[2]-t[2]*seed[1],t[2]*seed[0]-t[0]*seed[2],t[0]*seed[1]-t[1]*seed[0]];l=Math.hypot(...u)||1;u=u.map(v=>v/l);const v=[t[1]*u[2]-t[2]*u[1],t[2]*u[0]-t[0]*u[2],t[0]*u[1]-t[1]*u[0]];for(let j=0;j<segments;j++){const a=j/segments*Math.PI*2;P.push(samples[i][0]+r*(u[0]*Math.cos(a)+v[0]*Math.sin(a)*flatten),samples[i][1]+r*(u[1]*Math.cos(a)+v[1]*Math.sin(a)*flatten),samples[i][2]+r*(u[2]*Math.cos(a)+v[2]*Math.sin(a)*flatten));}}for(let i=0;i<samples.length-1;i++)for(let j=0;j<segments;j++){const a=i*segments+j,b=i*segments+(j+1)%segments,c=(i+1)*segments+(j+1)%segments,d=(i+1)*segments+j;I.push(a,b,c,a,c,d);}addMesh(g,P,I,color);}
function beam(g,a,b,r,color){cylinder(g,a,b,r,r*.92,color,14);}
function torus(g,c,R,r,color,radial=42,tubular=12){const P=[],I=[];for(let i=0;i<=radial;i++){const u=i/radial*Math.PI*2;for(let j=0;j<=tubular;j++){const v=j/tubular*Math.PI*2;P.push(c[0]+(R+r*Math.cos(v))*Math.cos(u),c[1]+(R+r*Math.cos(v))*Math.sin(u),c[2]+r*Math.sin(v));}}for(let i=0;i<radial;i++)for(let j=0;j<tubular;j++){const a=i*(tubular+1)+j,b=(i+1)*(tubular+1)+j;I.push(a,a+1,b,b,a+1,b+1);}addMesh(g,P,I,color);}
function sphere(g,c,r,color,scale=[1,1,1],segments=18,rings=12){const P=[],I=[];for(let y=0;y<=rings;y++){const v=y/rings,phi=v*Math.PI;for(let x=0;x<=segments;x++){const u=x/segments*2*Math.PI;P.push(c[0]+Math.sin(phi)*Math.cos(u)*r*scale[0],c[1]+Math.cos(phi)*r*scale[1],c[2]+Math.sin(phi)*Math.sin(u)*r*scale[2]);}}for(let y=0;y<rings;y++)for(let x=0;x<segments;x++){const a=y*(segments+1)+x,b=a+segments+1;I.push(a,a+1,b,b,a+1,b+1);}addMesh(g,P,I,color);}
function ellipseYZ(g,x,cy,cz,ry,rz,color,ring=false){const P=[],I=[],N=48;if(!ring){P.push(x,cy,cz);for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;P.push(x,cy+Math.sin(a)*ry,cz+Math.cos(a)*rz);}for(let i=1;i<=N;i++)I.push(0,i,i+1);}else{for(let j=0;j<2;j++){const r=j?1:.78;for(let i=0;i<N;i++){const a=i/N*Math.PI*2;P.push(x,cy+Math.sin(a)*ry*r,cz+Math.cos(a)*rz*r);}}for(let i=0;i<N;i++){const n=(i+1)%N;I.push(i,n,N+n,i,N+n,N+i);}}addMesh(g,P,I,color);}
function airfoil(g,lead,chord,y,span,thick,color,camber=.045,sweep=.14,dihedral=.035){const spanSteps=28,profileSteps=24,profile=[];for(let i=0;i<=profileSteps;i++){const t=i/profileSteps,yt=5*thick*(.2969*Math.sqrt(Math.max(t,.0001))-.1260*t-.3516*t*t+.2843*t*t*t-.1015*t*t*t*t);const yc=camber*4*t*(1-t);profile.push([lead-t*chord,y+yc+yt*chord]);}for(let i=profileSteps;i>=0;i--){const t=i/profileSteps,yt=5*thick*(.2969*Math.sqrt(Math.max(t,.0001))-.1260*t-.3516*t*t+.2843*t*t*t-.1015*t*t*t*t),yc=camber*4*t*(1-t);profile.push([lead-t*chord,y+yc-yt*chord]);}const m=profile.length,P=[],I=[];for(let s=0;s<=spanSteps;s++){const q=(s/spanSteps*2-1),aq=Math.abs(q),z=q*span/2,shift=sweep*aq*aq,baseY=y+dihedral*aq;for(const p of profile)P.push(p[0]-shift,p[1]+(baseY-y),z);}for(let s=0;s<spanSteps;s++)for(let j=0;j<m;j++){const a=s*m+j,b=s*m+(j+1)%m,c=(s+1)*m+(j+1)%m,d=(s+1)*m+j;I.push(a,b,c,a,c,d);}for(let j=1;j<m-1;j++){I.push(0,j+1,j);const z=spanSteps*m;I.push(z,z+j,z+j+1);}addMesh(g,P,I,color);}
function wheel(x,z){const y=.635;torus('wheels',[x,y,z],.477,.145,C.rubber,52,16);torus('wheels',[x,y,z+(z>0?.143:-.143)],.365,.018,C.rubberHi,44,8);cylinder('wheels',[x,y,z-.15],[x,y,z+.15],.337,.337,C.rim,36);cylinder('wheels',[x,y,z-.18],[x,y,z+.18],.282,.282,C.rimDark,30);cylinder('wheels',[x,y,z-.20],[x,y,z+.20],.092,.092,C.steelHi,18);cylinder('wheels',[x,y,z-.215],[x,y,z+.215],.048,.048,C.yellow,16);for(let k=0;k<12;k++){const a=k/12*Math.PI*2;beam('wheels',[x+Math.cos(a)*.11,y+Math.sin(a)*.11,z],[x+Math.cos(a+.12)*.29,y+Math.sin(a+.12)*.29,z],.012,C.steelHi);}cylinder('wheels',[x,y,z-.19],[x,y,z+.19],.265,.265,C.steel,32);box('wheels',x+.03,y+.12,z+(z>0?-.23:.23),.15,.22,.10,C.gold);torus('wheels',[x,y,z+(z>0?.152:-.152)],.55,.006,C.yellow,48,6);}

// --- Structural core and nose: long, tapered and softly shouldered rather than block-shaped. ---
loft('nose',[[-1.48,.71,0,.18,.16],[-1.18,.74,0,.27,.23],[-.82,.77,0,.35,.30],[-.36,.79,0,.39,.32],[.12,.79,0,.37,.30],[.52,.77,0,.30,.25]],C.navy,44,2.65);
loft('nose',[[.20,.83,0,.30,.23],[.62,.77,0,.245,.205],[1.12,.70,0,.18,.155],[1.70,.62,0,.12,.105],[2.30,.55,0,.075,.07],[2.82,.51,0,.042,.042],[3.03,.50,0,.018,.02]],C.navy2,48,2.3);
// Yellow centerline nose treatment, following the crown of the tapered shell.
gridSurface('nose',54,8,(u,v)=>{const x=.22+u*2.76;const top=(()=>{const t=u;return .83-(.83-.51)*Math.pow(t,.82);})();const half=.105*(1-.86*u)+.025;return [x,top+.008+.016*(1-Math.abs(v*2-1)),(v*2-1)*half];},C.yellow);
// Small red/yellow accent strokes on nose shoulders.
tubePath('nose',[[2.72,.555,-.045],[2.25,.63,-.078],[1.74,.70,-.115],[1.16,.77,-.145],[.68,.83,-.17]],.012,C.red,8,.5);
tubePath('nose',[[2.72,.555,.045],[2.25,.63,.078],[1.74,.70,.115],[1.16,.77,.145],[.68,.83,.17]],.012,C.red,8,.5);
// Cockpit aperture, tub rim, seat and steering binnacle.
loft('nose',[[-.68,.94,0,.23,.105],[-.34,.98,0,.29,.13],[-.02,.98,0,.28,.12],[.23,.93,0,.22,.09]],C.carbon,40,2.5);
// Dark cockpit opening and raised rim.
gridSurface('nose',24,20,(u,v)=>{const a=u*Math.PI*2;const rr=.205*v;return [-.23+Math.cos(a)*rr,1.075,Math.sin(a)*.285*v];},C.black);
tubePath('nose',[[-.44,1.08,0],[-.39,1.08,.19],[-.22,1.08,.27],[-.04,1.08,.23],[.0,1.08,0],[-.04,1.08,-.23],[-.22,1.08,-.27],[-.39,1.08,-.19],[-.44,1.08,0]],.019,C.navy3,10,.8);
box('nose',-.24,.99,0,.36,.14,.22,C.black);beam('nose',[-.08,1.01,0],[.17,1.08,0],.034,C.steelHi);
// Centre spine, antennae and camera pods.
tubePath('nose',[[.68,.96,0],[.50,1.01,0],[.32,1.04,0]],.018,C.carbon3,9,.7);
cylinder('nose',[.73,.96,0],[.82,1.17,0],.012,.008,C.black,10);
for(const s of [-1,1]){sphere('nose',[.68,1.00,s*.26],.055,C.black,[1,.55,1.3],14,8);}

// --- Sidepods: rounded shoulders, visible inlet lips, deep lower undercut and rear taper. ---
for(const s of [-1,1]){
  loft('sidepods',[[1.02,.69,s*.68,.16,.17],[.78,.73,s*.70,.265,.25],[.42,.72,s*.71,.35,.30],[.02,.69,s*.71,.385,.30],[-.48,.66,s*.69,.365,.265],[-.94,.63,s*.64,.31,.225],[-1.33,.60,s*.57,.205,.17],[-1.58,.58,s*.50,.10,.105]],C.navy2,44,2.45);
  // Inlet opening: oval mouth with a dark recess and a fine lip.
  ellipseYZ('sidepods',.895,.83,s*.70,.125,.205,C.black,false);
  tubePath('sidepods',[[.90,.95,s*.52],[.90,.99,s*.70],[.90,.91,s*.88],[.90,.75,s*.90],[.90,.68,s*.70],[.90,.73,s*.52],[.90,.95,s*.52]],.018,C.navy3,10,.8);
  // Undercut shadow and floor-edge junction.
  tubePath('sidepods',[[.50,.48,s*.89],[.18,.43,s*.91],[-.28,.42,s*.89],[-.78,.43,s*.82],[-1.26,.48,s*.70],[-1.52,.54,s*.60]],.035,C.carbon,10,.42);
  tubePath('sidepods',[[.46,.43,s*.85],[.05,.40,s*.86],[-.48,.39,s*.82],[-1.08,.43,s*.71],[-1.48,.50,s*.58]],.012,C.red,8,.45);
  // Upper sidepod shoulder highlight and decorative livery sweep.
  tubePath('sidepods',[[.68,.89,s*.57],[.24,.93,s*.61],[-.32,.89,s*.60],[-.84,.79,s*.55],[-1.34,.68,s*.46]],.012,C.navy3,9,.55);
  tubePath('sidepods',[[.28,.77,s*.99],[-.08,.79,s*.99],[-.46,.75,s*.96],[-.90,.66,s*.83],[-1.27,.58,s*.69]],.018,C.red,10,.45);
  // Cooling outlet louvres on upper aft bodywork.
  for(let i=0;i<6;i++){const x=-.66-i*.095;const y=.825-i*.018; tubePath('sidepods',[[x+.035,y,s*.79],[x-.035,y+.004,s*.78]],.012,C.carbon,7,.35);}
  // Small mirror stalk and mirror housing.
  tubePath('sidepods',[[.40,1.00,s*.43],[.46,1.04,s*.62],[.55,1.06,s*.87]],.018,C.carbon2,8,.7);
  loft('sidepods',[[.52,1.06,s*.83,.055,.045],[.59,1.065,s*.88,.075,.052],[.68,1.06,s*.88,.06,.04]],C.navy3,24,2.2);
}
// Internal radiator cores, visible when sidepods are hidden or isolated.
for(const s of [-1,1]){loft('cooling',[[.25,.67,s*.64,.17,.19],[-.20,.66,s*.64,.20,.21],[-.52,.63,s*.62,.16,.18]],C.rimDark,26,2.2);for(let i=0;i<9;i++){const z=s*(.50+i*.034);tubePath('cooling',[[.18,.50,z],[-.50,.50,z]],.012,C.steel,6,.32);}cylinder('cooling',[-.4,.69,s*.55],[-.75,.69,s*.49],.07,.055,C.cool,16);}

// --- Engine cover, airbox and rear body: high shoulder dropping into a narrow tail. ---
loft('sidepods',[[-.26,.91,0,.34,.28],[-.70,.98,0,.385,.36],[-1.10,.92,0,.36,.31],[-1.48,.82,0,.30,.25],[-1.86,.72,0,.23,.20],[-2.18,.66,0,.16,.14],[-2.42,.62,0,.09,.09]],C.navy,48,2.45);
loft('sidepods',[[-.78,1.20,0,.20,.22],[-.90,1.27,0,.245,.27],[-1.10,1.23,0,.215,.22],[-1.28,1.14,0,.16,.15]],C.navy2,36,2.4);
// Airbox mouth and shoulder rim.
loft('sidepods',[[-1.04,1.44,0,.165,.045],[-.98,1.47,0,.19,.055],[-.82,1.43,0,.16,.05]],C.carbon,32,2.5);
for(const s of [-1,1]){tubePath('sidepods',[[-.73,1.16,s*.30],[-.98,1.13,s*.31],[-1.35,.98,s*.28],[-1.80,.81,s*.20],[-2.18,.70,s*.13]],.014,C.red2,9,.55);}
// Engine-cover cooling panels and exhaust exit.
for(let i=0;i<8;i++){const x=-1.23-i*.085;const y=1.17-i*.052;for(const s of [-1,1])tubePath('sidepods',[[x+.03,y,s*.22],[x-.035,y+.004,s*.22]],.011,C.carbon3,7,.4);}
cylinder('power',[-2.17,.77,0],[-2.64,.77,0],.075,.065,C.steel,22);

// --- Floor assembly: continuous perimeter, venturi passages, edge wings and diffuser. ---
loft('floor',[[1.22,.27,0,.42,.045],[.82,.27,0,.72,.055],[.22,.26,0,.94,.060],[-.45,.245,0,.96,.058],[-1.12,.24,0,.88,.065],[-1.70,.26,0,.76,.085],[-2.18,.30,0,.58,.12],[-2.42,.33,0,.40,.11]],C.carbon,48,2.8);
for(const s of [-1,1]){
  // Venturi tunnel sidewalls trace the changing throat and diffuser expansion.
  tubePath('floor',[[.92,.25,s*.25],[.45,.20,s*.32],[-.22,.18,s*.34],[-.92,.19,s*.37],[-1.58,.25,s*.47],[-2.30,.43,s*.51]],.028,C.carbon3,10,.45);
  tubePath('floor',[[.82,.29,s*.60],[.28,.28,s*.76],[-.45,.27,s*.80],[-1.15,.28,s*.73],[-1.80,.35,s*.62],[-2.30,.48,s*.51]],.027,C.navy3,10,.5);
  // Floor edge wing with raised trailing section.
  loft('floor',[[.80,.34,s*.87,.07,.055],[.20,.34,s*.91,.09,.07],[-.55,.33,s*.88,.085,.07],[-1.25,.35,s*.77,.08,.08],[-1.92,.43,s*.66,.07,.11]],C.carbon2,28,2.5);
  // Fence blades (each deliberately separated in the component geometry).
  for(let i=0;i<4;i++){const x=.48-i*.43;const z=s*(.20+i*.11);tubePath('floor',[[x,.24,z],[x-.06,.38,z+s*.04],[x-.20,.38,z+s*.07]],.018,C.carbon3,7,.28);}
  // Rear diffuser strakes.
  for(let i=0;i<4;i++){const z=s*(.18+i*.115);tubePath('floor',[[-1.52,.29,z],[-1.86,.39,z],[-2.17,.53,z],[-2.42,.57,z]],.014,C.steel,7,.35);}
}
// Broad diffuser ramps represented by curved surfaces, not flat rectangular plates.
gridSurface('floor',28,18,(u,v)=>{const x=-1.42-u*1.03,z=(v*2-1)*(.65-.12*u);const rise=.02+.20*Math.pow(u,1.55)*(1-.25*Math.abs(v*2-1));return [x,.255+rise,z];},C.carbon2);
// Plank / central keel.
loft('floor',[[.85,.205,0,.18,.035],[.12,.20,0,.22,.035],[-.72,.20,0,.24,.04],[-1.54,.22,0,.21,.05],[-2.20,.28,0,.16,.06]],C.carbon,28,2.6);

// --- Front wing: three curved aerofoil elements with sculpted spanwise sweep. ---
airfoil('frontWing',3.42,.73,.285,2.25,.105,C.carbon2,.060,.23,.045);
airfoil('frontWing',3.18,.57,.395,2.08,.095,C.navy3,.055,.18,.035);
airfoil('frontWing',2.99,.43,.492,1.88,.085,C.carbon2,.050,.13,.025);
for(const s of [-1,1]){
  gridSurface('frontWing',18,12,(u,v)=>{const x=3.43-u*.76;const y=.15+v*.63+.035*Math.sin(u*Math.PI);return [x,y,s*(1.055+.05*u+.018*Math.sin(v*Math.PI))];},C.navy3);
  tubePath('frontWing',[[3.42,.15,s*1.06],[3.43,.40,s*1.08],[3.28,.66,s*1.10],[2.88,.78,s*1.10],[2.68,.47,s*1.10]],.014,C.yellow,8,.5);
  tubePath('frontWing',[[3.28,.34,s*.88],[3.17,.48,s*.78],[2.99,.54,s*.68]],.016,C.carbon,8,.42);
}
// Two curved nose pylons connecting nose to the front-wing mainplane.
for(const s of [-1,1])tubePath('frontWing',[[2.66,.51,s*.17],[2.86,.43,s*.16],[3.08,.34,s*.17],[3.21,.29,s*.18]],.042,C.carbon3,10,.55);

// --- Rear wing: deep multi-element profile, endplates and beam wing. ---
airfoil('rearWing',-2.76,.78,1.55,1.92,.115,C.carbon2,.065,.16,.015);
airfoil('rearWing',-2.96,.62,1.78,1.88,.105,C.navy3,.060,.12,.015);
airfoil('rearWing',-3.12,.38,1.96,1.72,.085,C.carbon2,.045,.10,.012);
airfoil('rearWing',-2.78,.48,1.08,1.72,.095,C.carbon3,.045,.10,.01);
for(const s of [-1,1]){
  gridSurface('rearWing',18,12,(u,v)=>{const x=-2.70-u*.80;const y=1.13+v*.94+.03*Math.sin(u*Math.PI);return [x,y,s*(.94+.035*u)];},C.navy3);
  tubePath('rearWing',[[-2.70,1.13,s*.95],[-2.72,1.52,s*.97],[-2.95,1.92,s*.98],[-3.34,2.02,s*.98],[-3.49,1.65,s*.98]],.014,C.red,8,.55);
  tubePath('rearWing',[[-2.40,1.05,s*.12],[-2.76,1.28,s*.13],[-3.05,1.43,s*.13]],.044,C.carbon3,10,.55);
}
// Rear-wing twin support pylons and rear rain light.
for(const s of [-1,1])tubePath('rearWing',[[-2.22,.85,s*.12],[-2.45,1.24,s*.12],[-2.66,1.60,s*.12],[-2.79,1.70,s*.12]],.045,C.carbon2,10,.62);
box('rearWing',-2.28,.39,0,.09,.12,.13,C.red);

// --- Halo, mirrors and safety details. ---
for(const s of [-1,1]){
  tubePath('halo',[[.28,1.00,s*.13],[.20,1.24,s*.24],[-.12,1.43,s*.34],[-.53,1.44,s*.34],[-.78,1.21,s*.26]],.037,C.steelHi,12,.68);
  tubePath('halo',[[-.78,1.21,s*.26],[-.70,1.12,s*.21],[-.54,1.05,s*.18]],.035,C.steelHi,10,.68);
}
tubePath('halo',[[.28,1.00,0],[.20,1.24,0],[-.12,1.43,0]],.044,C.steelHi,10,.7);
tubePath('halo',[[-.12,1.43,-.34],[-.12,1.43,.34]],.036,C.steelHi,10,.7);
// Side mirrors, camera pods, and cockpit edge details.
for(const s of [-1,1]){tubePath('halo',[[.30,1.06,s*.24],[.43,1.14,s*.38],[.58,1.16,s*.52]],.016,C.carbon3,8,.7);loft('halo',[[.48,1.17,s*.50,.045,.035],[.61,1.17,s*.56,.085,.04],[.72,1.16,s*.56,.07,.032]],C.navy3,24,2.1);}

// --- Suspension: separate aerodynamic links and upright fairings at all four corners. ---
for(const s of [-1,1]){
  // Front upper and lower wishbones, tie rod, pushrod and upright.
  tubePath('frontSusp',[[.64,1.00,s*.20],[.88,.95,s*.34],[1.18,.83,s*.70],[1.65,.72,s*.91]],.033,C.carbon2,10,.34);
  tubePath('frontSusp',[[.70,.53,s*.18],[.98,.51,s*.34],[1.28,.55,s*.68],[1.70,.62,s*.91]],.033,C.carbon2,10,.34);
  tubePath('frontSusp',[[.78,.68,s*.24],[1.18,.68,s*.46],[1.66,.71,s*.87]],.022,C.steelHi,9,.48);
  tubePath('frontSusp',[[1.08,.98,s*.26],[1.46,.78,s*.56],[1.77,.67,s*.88]],.022,C.gold,9,.4);
  tubePath('frontSusp',[[.98,.57,s*.24],[1.35,.81,s*.58],[1.82,1.05,s*.88]],.027,C.carbon3,10,.55);
  loft('frontSusp',[[1.58,.64,s*.87,.055,.17],[1.77,.66,s*.92,.075,.19],[1.91,.67,s*.93,.052,.14]],C.rimDark,24,2.4);
  // Rear upper/lower links and toe link.
  tubePath('rearSusp',[[-.74,1.00,s*.20],[-1.05,.96,s*.37],[-1.40,.83,s*.67],[-1.70,.72,s*.91]],.034,C.carbon2,10,.34);
  tubePath('rearSusp',[[-.82,.48,s*.18],[-1.16,.50,s*.40],[-1.50,.53,s*.70],[-1.76,.59,s*.91]],.034,C.carbon2,10,.34);
  tubePath('rearSusp',[[-.88,.66,s*.22],[-1.24,.69,s*.45],[-1.62,.69,s*.88]],.022,C.steelHi,9,.45);
  tubePath('rearSusp',[[-1.02,.93,s*.24],[-1.36,.77,s*.58],[-1.79,.67,s*.88]],.024,C.gold,9,.42);
  tubePath('rearSusp',[[-1.32,.53,s*.40],[-1.55,.78,s*.63],[-1.83,.96,s*.89]],.028,C.carbon3,10,.55);
  loft('rearSusp',[[-1.67,.62,s*.88,.055,.15],[-1.83,.65,s*.93,.075,.19],[-1.97,.66,s*.94,.05,.13]],C.rimDark,24,2.4);
}
// Wheels at reference axle positions.
for(const x of [1.82,-1.82])for(const s of [-1,1])wheel(x,s*1.00);

// --- Underbody-visible mechanical package for isolated/exploded inspection. ---
loft('power',[[-1.86,.70,0,.24,.19],[-1.55,.74,0,.32,.29],[-1.18,.78,0,.35,.34],[-.82,.79,0,.30,.28]],C.rimDark,36,2.4);
// Six cylinder-bank shapes in a V arrangement.
for(const s of [-1,1])for(let i=0;i<3;i++){const x=-.82-i*.20;beam('power',[x,.79,s*.10],[x-.10,1.04,s*.24],.075,C.steelHi);beam('power',[x,.79,s*.10],[x-.10,1.04,s*.24],.045,C.carbon3);}
loft('power',[[-1.12,1.13,0,.23,.10],[-.88,1.19,0,.28,.13],[-.66,1.13,0,.23,.08]],C.navy3,28,2.3);
for(const s of [-1,1]){tubePath('power',[[-1.25,.79,s*.27],[-1.52,.88,s*.33],[-1.78,.83,s*.27]],.045,C.steel,10,.6);tubePath('power',[[-1.78,.83,s*.27],[-1.96,.78,s*.21],[-2.08,.75,s*.14]],.035,C.gold,9,.65);}
// Gearbox and differential casing.
loft('gearbox',[[-2.55,.62,0,.18,.15],[-2.31,.68,0,.27,.22],[-1.98,.70,0,.32,.27],[-1.70,.69,0,.27,.22]],C.rimDark,34,2.4);
loft('gearbox',[[-2.39,.43,0,.20,.11],[-2.10,.46,0,.29,.14],[-1.88,.48,0,.25,.12]],C.carbon2,26,2.5);
cylinder('gearbox',[-2.22,.67,-.43],[-2.22,.67,.43],.10,.10,C.steelHi,22);

// Secondary visible exterior detail: halo brackets, fasteners, tow points and sensors.
for(const s of [-1,1]){
  for(let i=0;i<5;i++)sphere('sidepods',[-.10-i*.20,.45,s*(.93-i*.025)],.013,C.steelHi,[1,1,.7],8,6);
  sphere('frontWing',[2.75,.29,s*.93],.025,C.yellow,[1,.6,1],10,7);
  cylinder('frontSusp',[1.84,.64,s*.87],[1.84,.72,s*.87],.025,.025,C.steelHi,10);
}

// Merge by assembly/material to reduce draw calls on mobile GPUs.
function batchAssemblies(){for(const id of Object.keys(groups)){const old=groups[id].meshes,buckets=new Map();for(const m of old){let b=buckets.get(m.hex);if(!b){b={p:[],i:[],hex:m.hex};buckets.set(m.hex,b);}const base=b.p.length/3;if(base+m.rawP.length/3>65500){ // Keep a buffer below WebGL1's guaranteed 16-bit index range.
      const key=m.hex+'_'+buckets.size;b={p:[],i:[],hex:m.hex};buckets.set(key,b);
    }const start=b.p.length/3;for(const v of m.rawP)b.p.push(v);for(const v of m.rawI)b.i.push(v+start);if(gl.deleteBuffer){gl.deleteBuffer(m.p);gl.deleteBuffer(m.n);gl.deleteBuffer(m.ix);}}groups[id].meshes=[];for(const b of buckets.values())if(b.i.length)addMesh(id,b.p,b.i,b.hex);}}
batchAssemblies();

// Camera, matrices and responsive WebGL rendering.
const V=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,center,up){const z=norm(V(eye,center)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
let yaw=.82,pitch=.32,distance=8.65,target=[0,.83,0];
function resize(){const dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}
function offsetFor(id){if(!exploded)return [0,0,0];return groups[id].def.off.map(v=>v*1.25);}
function render(){resize();gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const cp=Math.cos(pitch),eye=[target[0]+distance*Math.sin(yaw)*cp,target[1]+distance*Math.sin(pitch),target[2]+distance*Math.cos(yaw)*cp],vp=mul(perspective(40*Math.PI/180,canvas.width/canvas.height,.1,90),lookAt(eye,target,[0,1,0]));gl.useProgram(program);gl.uniformMatrix4fv(loc.vp,false,vp);for(const id of Object.keys(groups)){const gr=groups[id];if(!gr.visible)continue;const off=offsetFor(id);gl.uniform3f(loc.offset,off[0],off[1],off[2]);gl.uniform1f(loc.selected,id===selected?1:0);for(const m of gr.meshes){gl.bindBuffer(gl.ARRAY_BUFFER,m.p);gl.enableVertexAttribArray(loc.pos);gl.vertexAttribPointer(loc.pos,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.enableVertexAttribArray(loc.normal);gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.ix);gl.uniform3f(loc.color,m.color[0],m.color[1],m.color[2]);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);}}requestAnimationFrame(render);}
requestAnimationFrame(render);

// Orbit + pinch interaction.
let pointers=new Map(),lastPinch=0;canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);});canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId),now=[e.clientX,e.clientY];pointers.set(e.pointerId,now);if(pointers.size===1){yaw-=(now[0]-prev[0])*.008;pitch=Math.max(-.12,Math.min(1.28,pitch+(now[1]-prev[1])*.006));}else if(pointers.size>=2){const pts=[...pointers.values()],d=Math.hypot(pts[0][0]-pts[1][0],pts[0][1]-pts[1][1]);if(lastPinch)distance=Math.max(5.2,Math.min(14,distance*lastPinch/d));lastPinch=d;}});const endPointer=e=>{pointers.delete(e.pointerId);lastPinch=0;};canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('wheel',e=>{distance=Math.max(5.2,Math.min(14,distance+e.deltaY*.008));e.preventDefault();},{passive:false});
function setView(v){document.querySelectorAll('.toolbtn').forEach(b=>b.classList.remove('active'));const b=document.getElementById(v==='iso'?'viewIso':v==='side'?'viewSide':'viewTop');if(b)b.classList.add('active');if(v==='iso'){yaw=.82;pitch=.32;distance=8.65;target=[0,.83,0];}if(v==='side'){yaw=0;pitch=.09;distance=9.45;target=[0,.80,0];}if(v==='top'){yaw=.82;pitch=1.38;distance=9.0;target=[0,.25,0];}}
document.getElementById('viewIso').onclick=()=>setView('iso');document.getElementById('viewSide').onclick=()=>setView('side');document.getElementById('viewTop').onclick=()=>setView('top');document.getElementById('viewReset').onclick=()=>setView('iso');

// Component inspector.
let filter='ALL';const partHost=document.getElementById('parts');
function renderParts(){partHost.innerHTML='';for(const d of defs.filter(d=>filter==='ALL'||d.category===filter)){const b=document.createElement('button');b.className='part'+(d.id===selected?' active':'');b.innerHTML=`<span class="num">${String(defs.indexOf(d)+1).padStart(2,'0')}</span><span class="pname">${d.short}</span>`;b.onclick=()=>select(d.id);partHost.appendChild(b);}}
function select(id){selected=id;const d=groups[id].def;document.getElementById('selCategory').textContent=d.label;document.getElementById('selAccuracy').textContent=d.accuracy;document.getElementById('selName').textContent=d.name;document.getElementById('selDesc').textContent=d.desc;document.getElementById('togglePart').textContent=groups[id].visible?'HIDE PART':'SHOW PART';document.getElementById('isolate').textContent=isolated?'RESTORE ALL':'ISOLATE';renderParts();}
function countHidden(){const n=Object.values(groups).filter(g=>!g.visible).length;document.getElementById('partCount').textContent=`12 SYSTEMS · ${n} HIDDEN`;}
document.getElementById('togglePart').onclick=()=>{if(isolated){for(const id of Object.keys(groups))groups[id].visible=true;isolated=false;}groups[selected].visible=!groups[selected].visible;select(selected);countHidden();};
document.getElementById('isolate').onclick=()=>{isolated=!isolated;for(const id of Object.keys(groups))groups[id].visible=!isolated||id===selected;select(selected);countHidden();};
document.getElementById('explode').onclick=()=>{exploded=!exploded;document.getElementById('explode').classList.toggle('active',exploded);document.getElementById('explode').textContent=exploded?'EXPLODED VIEW ✓':'EXPLODED VIEW ↗';};
document.getElementById('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));renderParts();});
renderParts();select(selected);countHidden();
})();
