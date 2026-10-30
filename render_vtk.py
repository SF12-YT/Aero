import json, vtk, numpy as np
from PIL import Image, ImageDraw, ImageFont
from vtk.util.numpy_support import numpy_to_vtk, numpy_to_vtkIdTypeArray
J=json.load(open('/mnt/data/AeroLab25/geometry-export.json'))
# Two small vector decals used to visualise the RB21 livery in the offline preview.
font_b='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
side_im=Image.new('RGBA',(1024,128),(0,0,0,0));sd=ImageDraw.Draw(side_im)
sd.text((255,65),'ORACLE',font=ImageFont.truetype(font_b,96),fill=(243,244,245,255),anchor='mm')
sd.text((812,35),'POWERED BY',font=ImageFont.truetype(font_b,22),fill=(231,237,244,255),anchor='mm')
sd.rectangle((252,110,994,114),fill=(213,30,43,255))
cover_im=Image.new('RGBA',(512,256),(0,0,0,0));cd=ImageDraw.Draw(cover_im)
cd.ellipse((18,25,494,187),fill=(244,201,0,255))
cd.polygon([(120,130),(158,64),(215,87),(270,43),(315,88),(370,69),(390,125),(345,153),(288,132),(246,170),(190,143)],fill=(213,30,43,255))
cd.text((256,218),'Red Bull',font=ImageFont.truetype(font_b,58),fill=(213,30,43,255),anchor='mm')
def make_texture(image):
    arr=np.array(image)
    img=vtk.vtkImageData();img.SetDimensions(image.width,image.height,1);img.AllocateScalars(vtk.VTK_UNSIGNED_CHAR,4)
    flat=np.flipud(arr).reshape(-1,4);vtkarr=numpy_to_vtk(flat,deep=True,array_type=vtk.VTK_UNSIGNED_CHAR);vtkarr.SetNumberOfComponents(4);img.GetPointData().SetScalars(vtkarr)
    tex=vtk.vtkTexture();tex.SetInputData(img);tex.InterpolateOn();tex.RepeatOff();return tex
textures={'side':make_texture(side_im),'cover':make_texture(cover_im)}

def build_scene(camera):
 r=vtk.vtkRenderer();r.SetBackground(.025,.04,.065);r.SetBackground2(.06,.09,.13);r.GradientBackgroundOn()
 for group,meshes in J.items():
  for m in meshes:
   p=np.array(m['positions'],dtype=np.float32).reshape(-1,3);tri=np.array(m['indices'],dtype=np.int64).reshape(-1,3)
   pts=vtk.vtkPoints();pts.SetData(numpy_to_vtk(p,deep=True));cells=vtk.vtkCellArray();legacy=np.hstack([np.full((len(tri),1),3),tri]).astype(np.int64).ravel();cells.SetCells(len(tri),numpy_to_vtkIdTypeArray(legacy,deep=True))
   poly=vtk.vtkPolyData();poly.SetPoints(pts);poly.SetPolys(cells)
   if m.get('textured') and m.get('uv'):
    uv=np.array(m['uv'],dtype=np.float32).reshape(-1,2);tc=vtk.vtkFloatArray();tc.SetNumberOfComponents(2);tc.SetName('UV');
    for a,b in uv: tc.InsertNextTuple2(float(a),float(b))
    poly.GetPointData().SetTCoords(tc)
   norms=vtk.vtkPolyDataNormals();norms.SetInputData(poly);norms.ConsistencyOn();norms.AutoOrientNormalsOn();norms.SplittingOff();norms.ComputePointNormalsOn();norms.Update()
   mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(norms.GetOutputPort());a=vtk.vtkActor();a.SetMapper(mapper)
   h=m['color'].lstrip('#');col=[int(h[i:i+2],16)/255 for i in (0,2,4)];prop=a.GetProperty();prop.SetColor(*col);prop.SetInterpolationToPhong();prop.SetAmbient(.62);prop.SetDiffuse(.72);prop.SetSpecular(.12);prop.SetSpecularPower(24)
   if m.get('textured'):a.SetTexture(textures.get(m.get('textureKey','side'),textures['side']))
   r.AddActor(a)
 plane=vtk.vtkPlaneSource();plane.SetOrigin(-4,-.025,-4);plane.SetPoint1(4,-.025,-4);plane.SetPoint2(-4,-.025,4);plane.Update();pm=vtk.vtkPolyDataMapper();pm.SetInputConnection(plane.GetOutputPort());pa=vtk.vtkActor();pa.SetMapper(pm);pa.GetProperty().SetColor(.035,.05,.07);r.AddActor(pa)
 light=vtk.vtkLight();light.SetPosition(3,6,4);light.SetFocalPoint(0,.4,0);light.SetIntensity(1.1);r.AddLight(light)
 light2=vtk.vtkLight();light2.SetPosition(-4,2,-3);light2.SetFocalPoint(0,.5,0);light2.SetIntensity(.7);r.AddLight(light2)
 c=vtk.vtkCamera();c.SetPosition(*camera[0]);c.SetFocalPoint(*camera[1]);c.SetViewUp(0,1,0);c.SetViewAngle(37);r.SetActiveCamera(c);return r

def render(camera,path):
 r=build_scene(camera);w=vtk.vtkRenderWindow();w.SetOffScreenRendering(1);w.SetSize(1400,900);w.AddRenderer(r);w.Render();cap=vtk.vtkWindowToImageFilter();cap.SetInput(w);cap.SetInputBufferTypeToRGBA();cap.ReadFrontBufferOff();cap.Update();writer=vtk.vtkPNGWriter();writer.SetFileName(path);writer.SetInputConnection(cap.GetOutputPort());writer.Write();w.Finalize()
render(((4.9,3.2,5.8),(0,.48,0)),'/mnt/data/AeroLab25/rb21-vtk-iso.png')
render(((0,1.3,8),(0,.48,0)),'/mnt/data/AeroLab25/rb21-vtk-side.png')
render(((8,1.2,0),(0,.48,0)),'/mnt/data/AeroLab25/rb21-vtk-front.png')
