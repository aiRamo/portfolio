"""Author original closed, faceted shore pines in a separate Blender scene."""
import bpy, math, random, os, bmesh
from mathutils import Vector
ROOT='O:/resume_curate_skill/portfolio'
scene=bpy.data.scenes.new('Shore pine studies')
bpy.context.window.scene=scene
random.seed(8301)

def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
def tint(rgb,brightness=1):return tuple(linear(v)*brightness for v in rgb)
class Sculpt:
    def __init__(self):self.v=[];self.f=[];self.c=[]
    def add(self,vs,fs,rgb):
        for face in fs:
            for j in range(1,len(face)-1):
                off=len(self.v);self.v.extend([vs[face[0]],vs[face[j]],vs[face[j+1]]]);self.f.append((off,off+1,off+2))
                shade=random.uniform(.88,1.12);self.c.extend([(*tint(rgb,shade),1)]*3)
    def branch(self,path,rgb,sides=7):
        vs=[]
        for i,(p,r) in enumerate(path):
            p=Vector(p);axis=(Vector(path[min(i+1,len(path)-1)][0])-Vector(path[max(i-1,0)][0])).normalized()
            right=axis.cross(Vector((0,0,1)))
            if right.length<.01:right=axis.cross(Vector((0,1,0)))
            right.normalize();up=axis.cross(right).normalized()
            for j in range(sides):
                a=j*math.tau/sides;vs.append(tuple(p+r*(right*math.cos(a)+up*math.sin(a))))
        fs=[tuple(reversed(range(sides))),tuple(range(len(vs)-sides,len(vs)))]
        for i in range(len(path)-1):
            for j in range(sides):fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
        self.add(vs,fs,rgb)
    def tuft(self,origin,angle,length,width,height,rgb,pitch=0,hang=.28,roll=0,bend=0):
        # Reuse the same four rings, but sweep them into a hanging needle fan.
        # A twisted shoulder and pendant tip replace the old flat foliage shelf.
        vs=[];o=Vector(origin)
        for t,w,h in [(0,.20,.14),(.26,1,.62),(.62,.76,.51),(1,.025,.02)]:
            center=Vector((t*length,bend*length*math.sin(t*math.pi),
                           length*(pitch*t+.10*math.sin(t*math.pi)-hang*t*t)))
            for j in range(7):
                a=j*math.tau/7
                lateral=math.cos(a)*width*w;vertical=math.sin(a)*height*h
                twist=roll*(.35+.65*t)
                v=center+Vector((0,lateral*math.cos(twist)-vertical*math.sin(twist),
                                lateral*math.sin(twist)+vertical*math.cos(twist)))
                vs.append(tuple(o+Vector((v.x*math.cos(angle)-v.y*math.sin(angle),v.x*math.sin(angle)+v.y*math.cos(angle),v.z))))
        fs=[tuple(reversed(range(7))),tuple(range(21,28))]
        for k in range(3):
            for j in range(7):fs.append((k*7+j,k*7+(j+1)%7,(k+1)*7+(j+1)%7,(k+1)*7+j))
        self.add(vs,fs,rgb)
    def mesh(self,name):
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(self.v,[],self.f);mesh.update()
        color=mesh.color_attributes.new(name='PineColor',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(self.c):color.data[i].color=c
        bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
        mesh.materials.append(mat)
        obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);return obj

mat=bpy.data.materials.get('Shore pine vertex colors') or bpy.data.materials.new('Shore pine vertex colors')
mat.use_nodes=True;nodes=mat.node_tree.nodes;bsdf=nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value=.97
color=nodes.new('ShaderNodeVertexColor');color.layer_name='PineColor'
mat.node_tree.links.new(color.outputs['Color'],bsdf.inputs['Base Color'])
mat.diffuse_color=(*tint((.24,.34,.27)),1)

def pine(kind,height,rows,seed):
    random.seed(seed);wood=Sculpt();leaf=Sculpt();young=kind=='juvenile'
    trunk=.09 if young else .25
    path=[]
    for i in range(9):
        t=i/8;path.append(((.07*math.sin(t*5)*t,.05*math.sin(t*8)*t,t*height),max(.009,trunk*(1-t)**1.2)))
    wood.branch(path,(.34,.25,.17),9)
    # Roots fade into the bank; bare lower stems stay legible between the boughs.
    for j in range(5):
        a=j*math.tau/5;wood.branch([((0,0,.25),trunk*.55),((math.cos(a)*trunk*2,math.sin(a)*trunk*2,.02),trunk*.26)],(.30,.23,.16))
    base=.44 if young else 1.35
    step=(height-base)/rows
    shape=random.Random(seed+9041)
    for row in range(rows):
        t=row/rows
        spread=(.89 if young else 2.22)*(1-t)**.83
        count=5+row%2
        for b in range(count):
            # Offset each attachment around the trunk through most of a whorl's
            # height. No complete level of boughs shares one horizontal plane.
            z=base+(height-base)*t+step*((b/count-.5)*.95+shape.uniform(-.22,.22))
            a=b*math.tau/count+row*1.93+shape.uniform(-.28,.28)
            sector=1+.11*math.sin(a*2+seed)*math.sin(t*math.pi)
            reach=spread*shape.uniform(.69,1.17)*sector
            rise=reach*shape.uniform(.08,.23)
            droop=min(z*.29,reach*shape.uniform(.16,.37))
            tip_lift=reach*shape.uniform(.015,.09)
            sweep=shape.uniform(-.13,.13)
            def point(r,lift=0):
                u=r/reach;angle=a+sweep*u
                return (math.cos(angle)*r,math.sin(angle)*r,
                        z+rise*math.sin(u*math.pi)-droop*u+tip_lift*u**3+lift)
            wood.branch([((0,0,z+.04),trunk*.20*(1-t)),(point(reach*.51),trunk*.12*(1-t)),(point(reach),.007)],(.35,.27,.19),6)
            shade=(.20+row*.003,.31+row*.003,.235+row*.002)
            for q in range(3):
                root=reach*(.13+q*.24);twist=shape.uniform(-.24,.24)
                pitch=shape.uniform(-.12,.10)-q*.035
                leaf.tuft(point(root,.03),a+sweep*root/reach+twist,
                          reach*(.73-q*.12),reach*(.26-q*.025),
                          height*(.070 if young else .057)*(1-t*.64),shade,
                          pitch=pitch,hang=shape.uniform(.24,.45),
                          roll=shape.uniform(-.55,.55),bend=shape.uniform(-.12,.12))
            # Smaller lateral sprays produce an irregular branch outline from above, too.
            for side in [-1,1]:
                root=reach*shape.uniform(.36,.64)
                leaf.tuft(point(root,.015),a+side*shape.uniform(.44,.84),
                          reach*shape.uniform(.42,.60),reach*.15,height*.043*(1-t*.55),
                          (.23,.34,.25),pitch=shape.uniform(-.25,.02),
                          hang=shape.uniform(.36,.62),roll=side*shape.uniform(.35,.75),bend=side*.1)
    # Small overlapping sprays carry the crown into a slender leader, without
    # a bare oversized cone projecting between the upper branch tiers.
    for row,ratio in enumerate([.895,.945,.975]):
        radius=height*(1-ratio)*.35+.012
        for j in range(5):
            leaf.tuft((0,0,height*ratio+radius*shape.uniform(-.3,.3)),
                      j*math.tau/5+row*1.2,radius*shape.uniform(1.5,2.1),radius*.58,radius*.6,
                      (.23,.35,.26),pitch=.12,hang=.27,roll=shape.uniform(-.5,.5))
    leaf.branch([((0,0,height*.88),height*.010),((.012,0,height*.965),height*.006),((0,0,height),.002)],(.23,.35,.26),7)
    objs=[wood.mesh(kind+'_trunk'),leaf.mesh(kind+'_foliage')]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    out=ROOT+'/public/models/shore-pine-'+kind+'.glb'
    bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True)
    print(kind,sum(len(o.data.polygons) for o in objs),'triangles',os.path.getsize(out),'bytes')
    return objs

mature=pine('mature',8.6,10,381)
juvenile=pine('juvenile',3.05,7,193)
for o in juvenile:o.location.x=4.0
world=bpy.data.worlds.new('Pine studio');world.use_nodes=True;scene.world=world
world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.23,.22,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.6
for name,pos,energy in [('Soft key',(-6,-9,14),2200),('Bough rim',(5,7,12),1800)]:
    light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.shape='DISK';light.size=8
    o=bpy.data.objects.new(name,light);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((1,0,3.8))-o.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('Pine study camera');cam=bpy.data.objects.new('Pine study camera',camdata);scene.collection.objects.link(cam)
cam.location=(12,-19,12);cam.rotation_euler=(Vector((1,0,4))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=11.5;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.filepath=ROOT+'/../outputs/shore-pines-review.png'
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/../outputs/shore-pines.blend')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
print('Shore pines authored, exported and rendered.')
