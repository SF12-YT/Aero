/* AeroLab 25 — RB21 exterior reconstruction study, revision 0.4.0.
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
function grid(g,nu,nv,fn,color){const P=[],I=[];for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++)P.push(...fn(i/nu,j/nv));const s=nv+1;for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*s+j,b=a+1,c=a+s+1,d=a+s;I.push(a,b,c,a,c,d);}addMesh(g,P,I,color);}
function roundedRectYZ(g,x,cy,cz,ry,rz,corner,color){const P=[[x,cy,cz]],I=[],N=12;const cs=[[cy+ry-corner,cz+rz-corner,0],[cy-ry+corner,cz+rz-corner,90],[cy-ry+corner,cz-rz+corner,180],[cy+ry-corner,cz-rz+corner,270]];for(const [yy,zz,start] of cs)for(let k=0;k<=N;k++){const a=(start+k*90/N)*Math.PI/180;P.push([x,yy+corner*Math.sin(a),zz+corner*Math.cos(a)]);}for(let i=1;i<P.length-1;i++)I.push(0,i,i+1);addMesh(g,P.flat(),I,color);}
function decalQuad(g,points,flip=false){const P=points.flat(),I=[0,1,2,0,2,3],UV=flip?[1,1,0,1,0,0,1,0]:[0,1,1,1,1,0,0,0];addMesh(g,P,I,C.white,UV,true);}
function decalSurface(g,s,x0,x1,yTop0,yTop1,yBot0,yBot1,zFn,uvRect=[0,0,1,1],textureKey='side'){const nu=50,nv=12,P=[],I=[],UV=[];for(let i=0;i<=nu;i++){const u=i/nu,x=x0+(x1-x0)*u,top=yTop0+(yTop1-yTop0)*u,bot=yBot0+(yBot1-yBot0)*u;for(let j=0;j<=nv;j++){const v=j/nv,y=top+(bot-top)*v;P.push(x,y,zFn(x,y,s));const uu=s>0?1-u:u;UV.push(uvRect[0]+uu*(uvRect[2]-uvRect[0]),uvRect[1]+(1-v)*(uvRect[3]-uvRect[1]));}}for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*(nv+1)+j,b=a+1,c=a+nv+2,d=a+nv+1;I.push(a,b,c,a,c,d);}addMesh(g,P,I,C.white,UV,true,textureKey);}
function makeDecalTexture(){const c=document.createElement('canvas');c.width=1024;c.height=128;const x=c.getContext('2d');x.clearRect(0,0,1024,128);x.textBaseline='middle';x.font='900 98px Arial, sans-serif';x.fillStyle='#f3f4f5';x.fillText('ORACLE',255,66);x.font='800 22px Arial, sans-serif';x.fillStyle='#e7edf4';x.fillText('POWERED BY',806,34);x.fillStyle='#d51e2b';x.fillRect(252,111,742,4);return textureFromCanvas(c);}
function makeCoverTexture(){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.clearRect(0,0,512,256);x.textAlign='center';x.textBaseline='middle';x.fillStyle='#f4c900';x.beginPath();x.ellipse(256,105,235,80,0,0,Math.PI*2);x.fill();x.fillStyle='#d51e2b';x.beginPath();x.moveTo(120,130);x.lineTo(158,64);x.lineTo(215,87);x.lineTo(270,43);x.lineTo(315,88);x.lineTo(370,69);x.lineTo(390,125);x.lineTo(345,153);x.lineTo(288,132);x.lineTo(246,170);x.lineTo(190,143);x.closePath();x.fill();x.font='900 58px Arial, sans-serif';x.fillStyle='#d51e2b';x.fillText('Red Bull',256,218);return textureFromCanvas(c);}
function textureFromCanvas(c){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
const decalTexture=makeDecalTexture(),coverTexture=makeCoverTexture();
function interpSection(sections,x){let i=0;while(i<sections.length-2&&x<sections[i+1][0])i++;const a=sections[i],b=sections[i+1],t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));return a.map((v,k)=>v+(b[k]-v)*t);}
function podOuterZ(x,y,s,sections){const q=interpSection(sections,x),cy=q[1],cz=q[2]*s,w=q[3],h=q[4],shape=3.35,ny=Math.max(-1,Math.min(1,(y-cy)/(h||1))),n=Math.pow(Math.max(0,1-Math.pow(Math.abs(ny),shape)),1/shape),pinch=ny<0?1-.58*ny*ny:1;return cz+s*(w*n*pinch+.012); }
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
function wheel(x,s,rear){const y=.365,z=s*.785,w=rear?.405:.305,profile=[[-.5,.275],[-.43,.325],[-.30,.35],[0,.36],[.30,.35],[.43,.325],[.5,.275]],P=[],I=[],N=56;for(const[p,r]of profile)for(let j=0;j<N;j++){const a=j/N*Math.PI*2;P.push(x+r*Math.cos(a),y+r*Math.sin(a),z+p*w);}for(let k=0;k<profile.length-1;k++)for(let j=0;j<N;j++){const a=k*N+j,b=k*N+(j+1)%N,c=(k+1)*N+(j+1)%N,d=(k+1)*N+j;I.push(a,b,c,a,c,d);}addMesh('wheels',P,I,C.rubber);
 const side=s*(w*.5-.012);cylinder('wheels',[x,y,z+s*(w*.5-.085)],[x,y,z+s*(w*.5-.012)],.235,.235,C.rimDark,40);cylinder('wheels',[x,y,z+s*(w*.5-.095)],[x,y,z+s*(w*.5-.082)],.205,.205,C.rimDark,40);ringXY('wheels',x,y,z+s*(w*.5-.008),.258,.009,C.rim,48,8);cylinder('wheels',[x,y,z+s*(w*.5-.105)],[x,y,z+s*(w*.5-.094)],.095,.095,C.steelHi,24);cylinder('wheels',[x,y,z+s*(w*.5-.11)],[x,y,z+s*(w*.5-.102)],.052,.052,C.yellow,20);
 for(let j=0;j<5;j++){const a=j/5*Math.PI*2,aa=a+.16;const p1=[x+Math.cos(a)*.09,y+Math.sin(a)*.09,z+side],p2=[x+Math.cos(aa)*.23,y+Math.sin(aa)*.23,z+side];beam('wheels',p1,p2,.019,C.rimDark,10);}
 cylinder('wheels',[x,y,z-s*w*.30],[x,y,z+s*w*.30],.225,.225,C.brake,40);const calx=x+.12,caly=y+.10;cylinder('wheels',[calx-.07,caly,z+s*(w*.30)],[calx+.07,caly,z+s*(w*.30)],.062,.062,C.gold,16);
}

// 1. Monocoque and long, shallow RB21-style nose.
loft('nose',[[.78,.54,0,.30,.19],[.42,.55,0,.33,.205],[-.02,.55,0,.34,.205],[-.48,.54,0,.32,.19],[-.92,.52,0,.27,.16],[-1.30,.49,0,.19,.12]],C.navy,56,2.65);
loft('nose',[[2.56,.335,0,.022,.024],[2.40,.355,0,.052,.048],[2.16,.395,0,.095,.083],[1.88,.435,0,.135,.115],[1.52,.475,0,.19,.145],[1.14,.515,0,.245,.17],[.78,.54,0,.30,.19]],C.navy2,56,2.25);
// Yellow upper nose panel with narrow shoulders and a slightly broader base.
grid('nose',48,10,(u,v)=>{const x=.92+u*1.48,half=.155*(1-u)+.045,y=.715-.30*Math.pow(u,.84)+.024+.006*(1-Math.abs(v*2-1));return[x,y,(v*2-1)*half];},C.yellow);
// Red upper nose flash and thin side pinstripes.
tubePath('nose',[[2.38,.39,-.018],[2.16,.43,-.045],[1.88,.49,-.075],[1.54,.55,-.105],[1.18,.60,-.12]],.009,C.red,8,.55);
tubePath('nose',[[2.38,.39,.018],[2.16,.43,.045],[1.88,.49,.075],[1.54,.55,.105],[1.18,.60,.12]],.009,C.red,8,.55);
// Cockpit tub, dark aperture and raised rim.
loft('nose',[[.25,.69,0,.27,.13],[-.12,.70,0,.30,.135],[-.48,.66,0,.26,.12]],C.carbon2,48,2.3);
grid('nose',36,18,(u,v)=>{const a=u*Math.PI*2,r=.245*v;return[-.13+Math.cos(a)*r,.795,Math.sin(a)*.195*v];},C.black);
tubePath('nose',[[.17,.80,0],[.13,.80,.17],[-.10,.80,.225],[-.40,.79,.18],[-.48,.79,0],[-.40,.79,-.18],[-.10,.80,-.225],[.13,.80,-.17],[.17,.80,0]],.018,C.navy3,10,.75);
box('nose',-.16,.735,0,.32,.11,.19,C.black);
// Camera pods, antenna and front chassis shoulders.
for(const s of [-1,1]){beam('nose',[-.48,.68,s*.23],[-.59,.77,s*.28],.017,C.carbon3);sphere('nose',[-.59,.78,s*.28],.035,C.black,[1,.7,1.2],12,8);}
beam('nose', [.66,.70,0],[.72,.84,0],.009,C.black,);

// 2. RB21 sidepod shells, built to the high inlet / deep undercut / steep rear taper seen in 2025 reference views.
const podSections=[[.88,.485,.405,.205,.155],[.66,.505,.415,.275,.205],[.35,.495,.415,.315,.205],[.02,.465,.398,.305,.178],[-.34,.435,.375,.270,.150],[-.68,.405,.345,.225,.123],[-1.00,.380,.305,.178,.098],[-1.28,.355,.260,.125,.072],[-1.48,.345,.210,.062,.043]];
for(const s of [-1,1]){
 const z=s*.405;
 loft('sidepods',podSections.map(([x,cy,cz,w,h])=>[x,cy,s*cz,w,h]),C.navy,72,3.35,.58);
 // The sidepod inlet is a wide, vertically flattened rounded rectangle, rather than a circular hole.
 roundedRectYZ('sidepods',.892,.555,s*.414,.104,.235,.055,C.black);
 tubePath('sidepods',[[.904,.657,s*.235],[.904,.679,s*.345],[.904,.665,s*.53],[.904,.615,s*.625],[.904,.535,s*.654],[.904,.455,s*.615],[.904,.405,s*.51],[.904,.405,s*.335],[.904,.455,s*.235]],.018,C.navy3,12,.78);
 // A dark, genuinely open-looking lower channel and the outer floor-edge shoulder.
 tubePath('sidepods',[[.58,.335,s*.675],[.30,.295,s*.69],[-.08,.270,s*.66],[-.48,.272,s*.60],[-.86,.296,s*.52],[-1.20,.325,s*.43],[-1.43,.34,s*.31]],.033,C.carbon,12,.35);
 tubePath('sidepods',[[.56,.345,s*.688],[.25,.312,s*.70],[-.14,.291,s*.655],[-.54,.298,s*.585],[-.94,.322,s*.49],[-1.30,.345,s*.36]],.011,C.red,8,.38);
 // Upper shoulder edge and the RB21's fine red / yellow livery sweep.
 tubePath('sidepods',[[.58,.655,s*.51],[.34,.682,s*.60],[.02,.655,s*.61],[-.34,.59,s*.56],[-.72,.515,s*.47],[-1.10,.438,s*.36]],.012,C.navy3,9,.52);
 tubePath('sidepods',[[.48,.602,s*.704],[.20,.625,s*.707],[-.12,.592,s*.672],[-.47,.535,s*.603],[-.82,.475,s*.518],[-1.10,.421,s*.402]],.014,C.red,10,.42);
 tubePath('sidepods',[[.39,.66,s*.635],[.08,.653,s*.618],[-.24,.606,s*.56],[-.57,.535,s*.476],[-.86,.471,s*.39]],.009,C.yellow,8,.42);
 // Cooling louvre slots on the aft shoulder.
 for(let i=0;i<6;i++){const x=-.48-i*.105,y=.545-i*.027,zl=s*(.48-i*.035);tubePath('sidepods',[[x+.035,y,zl],[x-.045,y+.006,zl-.004*s]],.009,C.carbon3,7,.34);}
 // Mirror stalk and compact sculpted mirror casing.
 tubePath('sidepods',[[.43,.69,s*.33],[.49,.755,s*.48],[.55,.775,s*.63]],.013,C.carbon,8,.55);
 loft('sidepods',[[.48,.78,s*.60,.035,.024],[.58,.79,s*.665,.075,.042],[.71,.775,s*.65,.046,.03]],C.navy3,32,2.55);
 // Curved decal surface hugs the sidepod side; UV coordinates follow the actual loft contour.
 decalSurface('sidepods',s,.46,-.92,.565,.455,.405,.345,(x,y,side)=>podOuterZ(x,y,side,podSections),[0,0,1,1],'side');
}
// Raised engine-cover spine and tail: smooth centreline taper to gearbox.
const coverSections=[[.22,.62,0,.285,.15],[-.18,.69,0,.315,.205],[-.55,.70,0,.285,.205],[-.92,.65,0,.235,.17],[-1.30,.58,0,.18,.13],[-1.68,.51,0,.125,.09],[-2.02,.47,0,.075,.06]];
loft('sidepods',coverSections,C.navy2,64,2.9,.12);
for(const s of [-1,1])decalSurface('sidepods',s,-.28,-1.16,.795,.635,.675,.535,(x,y,side)=>{const q=interpSection(coverSections,x),ny=Math.max(-1,Math.min(1,(y-q[1])/(q[4]||1))),norm=Math.pow(Math.max(0,1-Math.pow(Math.abs(ny),2.9)),1/2.9);return side*(q[2]+q[3]*norm+.012);},[0,0,1,1],'cover');
// Airbox and roll-hoop fairing, with yellow upper surround.
loft('sidepods',[[-.42,.81,0,.14,.10],[-.68,.875,0,.19,.13],[-.91,.85,0,.155,.11],[-1.08,.77,0,.105,.075]],C.navy,48,2.45);
loft('sidepods',[[-.59,.965,0,.14,.035],[-.74,.99,0,.17,.045],[-.88,.965,0,.14,.04]],C.yellow,40,2.5);

// Intake aperture on top of the airbox.
grid('sidepods',26,14,(u,v)=>{const a=u*Math.PI*2,r=.12*v;return[-.74+Math.cos(a)*r,.999,Math.sin(a)*r*.72];},C.black);
for(const s of [-1,1]){
 tubePath('sidepods',[[-.38,.70,s*.26],[-.72,.68,s*.25],[-1.12,.59,s*.19],[-1.60,.50,s*.12],[-1.92,.47,s*.07]],.011,C.red2,8,.5);
 for(let i=0;i<7;i++){const x=-1.02-i*.075,y=.72-i*.022; tubePath('sidepods',[[x+.035,y,s*.14],[x-.035,y+.002,s*.14]],.009,C.carbon3,7,.32);}
}
// Exhaust outlet.
cylinder('power',[-1.95,.535,0],[-2.28,.535,0],.052,.047,C.steel,24);

// 3. Floor, twin tunnel outer walls and expanded diffuser.
loft('floor',[[1.02,.145,0,.68,.038],[.64,.135,0,.89,.042],[.16,.13,0,.95,.045],[-.46,.125,0,.94,.045],[-1.06,.13,0,.88,.05],[-1.58,.16,0,.76,.065],[-1.98,.22,0,.53,.08]],C.carbon,56,3.2);
for(const s of [-1,1]){
 tubePath('floor',[[.78,.12,s*.28],[.34,.105,s*.34],[-.24,.105,s*.36],[-.86,.12,s*.39],[-1.43,.19,s*.47],[-1.97,.30,s*.48]],.019,C.carbon3,9,.42);
 tubePath('floor',[[.72,.16,s*.72],[.22,.15,s*.83],[-.42,.15,s*.84],[-1.05,.17,s*.78],[-1.62,.24,s*.65],[-1.95,.34,s*.51]],.022,C.navy3,9,.45);
 // Floor-edge wing and rearward upsweep.
 loft('floor',[[.63,.185,s*.865,.048,.028],[.10,.185,s*.89,.06,.035],[-.58,.19,s*.84,.065,.04],[-1.22,.22,s*.74,.06,.05],[-1.83,.30,s*.58,.045,.065]],C.carbon2,28,2.5);
 // Four thin, separate floor fences.
 for(let i=0;i<4;i++){const x=.40-i*.39,zf=s*(.28+i*.105);tubePath('floor',[[x,.13,zf],[x-.05,.23,zf+s*.025],[x-.18,.23,zf+s*.055]],.012,C.carbon3,7,.25);}
 // Diffuser strakes.
 for(let i=0;i<4;i++){const zf=s*(.12+i*.13);tubePath('floor',[[-1.30,.17,zf],[-1.58,.245,zf],[-1.83,.34,zf],[-2.02,.385,zf]],.010,C.steel,7,.28);}
}
grid('floor',32,20,(u,v)=>{const x=-1.13-u*.90,z=(v*2-1)*(.54+.23*u),rise=.02+.17*Math.pow(u,1.45)*(1-.22*Math.abs(v*2-1));return[x,.145+rise,z];},C.carbon2);
loft('floor',[[.78,.09,0,.14,.018],[.10,.09,0,.17,.02],[-.68,.09,0,.18,.02],[-1.42,.12,0,.16,.025],[-1.92,.18,0,.12,.03]],C.black,32,2.5);

// 4. Front wing: three distinct swept elements with controlled 2 m span.
airfoil('frontWing',2.80,.62,.145,1.96,.105,C.carbon2,.065,.16);
airfoil('frontWing',2.64,.43,.225,1.91,.085,C.navy3,.06,.12);
airfoil('frontWing',2.48,.29,.300,1.78,.070,C.carbon2,.05,.09);
for(const s of [-1,1]){
 grid('frontWing',24,18,(u,v)=>{const y=.115+v*(.385-.075*u),x=2.84-u*(.275-.105*v)+.045*Math.sin(v*Math.PI)-.025*v*v;return[x,y,s*(.946+.012*u)];},C.carbon2);
 tubePath('frontWing',[[2.82,.115,s*.958],[2.84,.23,s*.96],[2.78,.37,s*.96],[2.63,.49,s*.958],[2.48,.46,s*.958],[2.37,.30,s*.958]],.012,C.carbon3,9,.50);
 tubePath('frontWing',[[2.57,.24,s*.78],[2.44,.34,s*.68],[2.27,.37,s*.59]],.012,C.carbon3,8,.42);
 // Carbon mounting pylon from nose to mainplane.
 tubePath('frontWing',[[1.92,.43,s*.12],[2.18,.32,s*.12],[2.43,.19,s*.13],[2.62,.145,s*.14]],.026,C.carbon3,10,.46);
}

// 5. Rear wing and beam wing; narrow, high and supported by the rear structure.
airfoil('rearWing',-2.78,.58,.855,1.90,.105,C.carbon2,.065,.13,{dir:1});
airfoil('rearWing',-2.70,.39,.955,1.84,.078,C.navy3,.055,.10,{dir:1});
airfoil('rearWing',-2.18,.42,.535,1.70,.072,C.carbon3,.045,.07,{dir:1});
for(const s of [-1,1]){
 grid('rearWing',24,18,(u,v)=>{const y=.535+v*(.415-.035*u),x=-2.80+u*(.245+.07*v)+.04*Math.sin(v*Math.PI)-.018*v*v;return[x,y,s*(.925+.012*u)];},C.carbon2);
 tubePath('rearWing',[[-2.79,.535,s*.944],[-2.78,.70,s*.945],[-2.70,.89,s*.945],[-2.57,.985,s*.945],[-2.37,.99,s*.945],[-2.28,.91,s*.945]],.010,C.red,8,.5);
 tubePath('rearWing',[[-2.05,.48,s*.12],[-2.26,.66,s*.12],[-2.47,.84,s*.12],[-2.66,.90,s*.12]],.032,C.carbon3,10,.48);
}
for(const s of [-1,1])tubePath('rearWing',[[-1.78,.58,s*.11],[-2.02,.70,s*.11],[-2.28,.86,s*.11],[-2.47,.90,s*.11]],.035,C.carbon2,10,.55);
box('rearWing',-2.08,.39,0,.075,.10,.10,C.red);

// 6. Halo, cockpit braces and mirrors.
for(const s of [-1,1]){
 tubePath('halo',[[.34,.76,s*.12],[.29,.91,s*.20],[.04,1.015,s*.29],[-.35,1.02,s*.30],[-.60,.87,s*.22],[-.49,.79,s*.16]],.026,C.carbon3,12,.72);
 tubePath('halo',[[-.60,.87,s*.22],[-.48,.79,s*.16],[-.30,.75,s*.12]],.025,C.carbon3,10,.7);
}
tubePath('halo',[[.34,.76,0],[.27,.92,0],[.03,1.015,0]],.032,C.carbon2,10,.7);
tubePath('halo',[[-.35,1.02,-.30],[-.35,1.02,.30]],.028,C.carbon2,10,.7);
for(const s of [-1,1]){tubePath('halo',[[.28,.79,s*.22],[.44,.88,s*.36],[.56,.90,s*.50]],.012,C.carbon,8,.6);loft('halo',[[.46,.91,s*.48,.04,.025],[.58,.92,s*.53,.075,.04],[.68,.90,s*.53,.05,.03]],C.navy3,24,2.3);}

// 7. Suspension: swept, flattened wishbone members and compact uprights.
for(const s of [-1,1]){
 // Front, visible double wishbone plus steering and pushrod.
 tubePath('frontSusp',[[.47,.60,s*.15],[.77,.55,s*.25],[1.20,.49,s*.53],[1.66,.39,s*.72]],.023,C.carbon2,10,.30);
 tubePath('frontSusp',[[.50,.35,s*.16],[.86,.34,s*.29],[1.26,.35,s*.56],[1.67,.36,s*.72]],.024,C.carbon2,10,.30);
 tubePath('frontSusp',[[.55,.47,s*.19],[.96,.46,s*.36],[1.48,.42,s*.65]],.015,C.steel,9,.36);
 tubePath('frontSusp',[[.95,.63,s*.19],[1.29,.49,s*.45],[1.69,.37,s*.70]],.016,C.carbon3,9,.34);
 loft('frontSusp',[[1.55,.35,s*.70,.045,.12],[1.75,.365,s*.785,.055,.15],[1.91,.36,s*.79,.04,.11]],C.rimDark,26,2.5);
 // Rear links, toe link and upright fairing.
 tubePath('rearSusp',[[-.63,.61,s*.15],[-.96,.56,s*.27],[-1.32,.48,s*.52],[-1.67,.39,s*.70]],.024,C.carbon2,10,.30);
 tubePath('rearSusp',[[-.72,.33,s*.15],[-1.04,.33,s*.30],[-1.38,.35,s*.54],[-1.68,.36,s*.70]],.025,C.carbon2,10,.30);
 tubePath('rearSusp',[[-.80,.46,s*.18],[-1.17,.45,s*.38],[-1.55,.42,s*.67]],.015,C.steel,9,.36);
 tubePath('rearSusp',[[-1.04,.59,s*.22],[-1.37,.48,s*.46],[-1.69,.37,s*.69]],.017,C.carbon3,9,.34);
 loft('rearSusp',[[-1.55,.36,s*.69,.045,.12],[-1.75,.37,s*.785,.055,.15],[-1.92,.36,s*.79,.04,.11]],C.rimDark,26,2.5);
}

// 8. Wheels, tyres and brakes — 18-inch generation with realistic tyre envelopes.
for(const x of [1.80,-1.80])for(const s of [-1,1])wheel(x,s,x<0);

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
function render(){resize();gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const cp=Math.cos(pitch),eye=[target[0]+distance*Math.sin(yaw)*cp,target[1]+distance*Math.sin(pitch),target[2]+distance*Math.cos(yaw)*cp],vp=mul(perspective(38*Math.PI/180,canvas.width/canvas.height,.08,80),lookAt(eye,target,[0,1,0]));gl.useProgram(program);gl.uniformMatrix4fv(loc.vp,false,vp);for(const id of Object.keys(groups)){const g=groups[id];if(!g.visible)continue;const o=offsetFor(id);gl.uniform3f(loc.off,o[0],o[1],o[2]);gl.uniform1f(loc.sel,id===selected?1:0);for(const m of g.meshes){gl.bindBuffer(gl.ARRAY_BUFFER,m.pb);gl.enableVertexAttribArray(loc.p);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.nb);gl.enableVertexAttribArray(loc.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.ib);gl.uniform3f(loc.color,m.color[0],m.color[1],m.color[2]);gl.uniform1f(loc.useTex,m.textured?1:0);if(m.ub){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,m.textureKey==='cover'?coverTexture:decalTexture);gl.uniform1i(loc.tex,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.ub);gl.enableVertexAttribArray(loc.uv);gl.vertexAttribPointer(loc.uv,2,gl.FLOAT,false,0,0);}else{gl.disableVertexAttribArray(loc.uv);gl.vertexAttrib2f(loc.uv,0,0);}gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);}}requestAnimationFrame(render);}requestAnimationFrame(render);

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
