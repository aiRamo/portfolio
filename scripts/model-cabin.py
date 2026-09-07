"""Original portfolio cabin, authored in Blender. Run with Blender Python.

Z-up authoring, front faces -Y. glTF converts to the site's Y-up coordinates.
All meshes are grouped by surface, keeping the complete model to few draw calls.
"""
import bpy, math, random, os
from mathutils import Vector
random.seed(712)
ROOT = 'O:/resume_curate_skill/portfolio'
OUT = ROOT + '/public/models'
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
parts = {}
materials = {}

def material(name, color, roughness=.85, glow=0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    if glow:
        bsdf.inputs['Emission Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Strength'].default_value = glow
    materials[name] = mat
    return name

woods = [material('Cedar_%d'%i, c) for i,c in enumerate([( .24,.105,.038),(.31,.143,.055),(.38,.18,.071),(.285,.121,.038)])]
end = material('End_grain',(.43,.245,.106))
dark = material('Iron_and_charcoal',(.028,.035,.037),.67)
trim = material('Heartwood_trim',(.20,.073,.021))
stone = [material('Granite_%d'%i,c) for i,c in enumerate([(.24,.26,.255),(.33,.34,.31),(.40,.38,.325)])]
slate = [material('Slate_%d'%i,c,.82) for i,c in enumerate([(.055,.088,.113),(.075,.117,.14),(.10,.14,.16)])]
glass = material('Cabin_Glass',(.95,.42,.075),.36,1.8)

def poly(name, vs, fs):
    data = parts.setdefault(name,[[],[]])
    off = len(data[0]); data[0].extend(vs)
    data[1].extend([tuple(off+j for j in f) for f in fs])

def box(c,s,m,rotate=0):
    vs=[]
    for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
        px=x*s[0]/2;py=y*s[1]/2
        vs.append((c[0]+px*math.cos(rotate)-py*math.sin(rotate),c[1]+px*math.sin(rotate)+py*math.cos(rotate),c[2]+z*s[2]/2))
    poly(m,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])

def log(a,b,r,m,ends=False,n=12):
    a=Vector(a);b=Vector(b);axis=(b-a).normalized()
    side=axis.cross(Vector((0,0,1)))
    if side.length<.01: side=axis.cross(Vector((0,1,0)))
    side.normalize();up=axis.cross(side).normalized()
    vs=[]
    for t in [0,.5,1]:
        for j in range(n):
            ang=2*math.pi*j/n
            radius=r*(1+.025*math.sin(j*4.7+t*3))
            vs.append(tuple(a.lerp(b,t)+radius*(side*math.cos(ang)+up*math.sin(ang))))
    fs=[]
    for row in range(2):
        for j in range(n): fs.append((row*n+j,row*n+(j+1)%n,(row+1)*n+(j+1)%n,(row+1)*n+j))
    poly(m,vs,fs)
    poly(end if ends else m,vs,[tuple(reversed(range(n))),tuple(range(2*n,3*n))])
    if ends:
        # Small inset concentric end-grain rings on the visible log ends.
        for p,sign in [(a,-1),(b,1)]:
            for rr in [.50,.76]:
                rings=[]
                for rad in [r*rr,r*rr+r*.018]:
                    for j in range(n):
                        ang=2*math.pi*j/n
                        rings.append(tuple(p+axis*.0015*sign+rad*(side*math.cos(ang)+up*math.sin(ang))))
                poly(trim,rings,[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)])

def rock(c,s,m):
    # Beveled irregular octagonal cobble with solid top and bottom.
    vs=[]
    for z,fac in [(-.5,.73),(-.25,1),(.25,.97),(.5,.67)]:
        for j in range(8):
            a=j*math.pi/4;rr=1+random.uniform(-.075,.075)
            vs.append((c[0]+math.cos(a)*s[0]*.5*fac*rr,c[1]+math.sin(a)*s[1]*.5*fac*rr,c[2]+z*s[2]))
    fs=[tuple(reversed(range(8))),tuple(range(24,32))]
    for k in range(3):
        for j in range(8):fs.append((k*8+j,k*8+(j+1)%8,(k+1)*8+(j+1)%8,(k+1)*8+j))
    poly(m,vs,fs)

# Stone footing, floor joists, and individual deck planks.
box((0,0,.15),(6.3,4.9,.85),stone[0])
for row in range(3):
    for x in range(10):
        for y in [-2.43,2.43]:rock((-2.95+x*.66+(row%2)*.20,y,-.19+row*.29),(.75,.40,.35),random.choice(stone))
    for y in range(7):
        for x in [-3.11,3.11]:rock((x,-2.04+y*.68,-.19+row*.29),(.40,.78,.35),random.choice(stone))
for x in [-3,0,3]:log((x,-4,.46),(x,2.45,.46),.16,trim)
for i in range(24):box((-3.10+i*.27,-.73,.65),(.254,6.40,.15),random.choice(woods))

# True stacked round log walls with openings, including both sides and rear.
for row in range(12):
    h=.91+row*.255
    for y in [-2.35,2.35]:
        cuts=[(-3.36,3.36)]
        openings=[]
        if y<0:
            if h<2.62:openings.append((-.63,.63))
            if 1.45<h<2.64:openings.extend([(-2.54,-1.27),(1.27,2.54)])
        elif 1.45<h<2.64:openings.append((-.68,.68))
        for lo,hi in openings:
            cuts=[seg for a,b in cuts for seg in ([(a,min(lo,b))] if a<lo else [])+([(max(hi,a),b)] if b>hi else []) if seg[1]-seg[0]>.01]
        for a,b in cuts:log((a,y,h),(b,y,h),.146,woods[row%4],True)
    for x in [-3.10,3.10]:
        cuts=[(-2.62,2.62)] if not 1.45<h<2.64 else [(-2.62,-.74),(.74,2.62)]
        for a,b in cuts:log((x,a,h+.03),(x,b,h+.03),.146,woods[(row+1)%4],True)

def window(c,side=False,width=1.27):
    x,y,z=c
    def panel(px,pz,w,h,m,depth=.10):
        box((x+(0 if side else px),y+(px if side else 0),z+pz),(depth if side else w,w if side else depth,h),m)
    panel(0,0,width,1.14,glass,.065)
    for px in [-width/2-.07,width/2+.07]:panel(px,0,.12,1.45,trim,.19)
    for pz in [-.65,.65]:panel(0,pz,width+.30,.14,end,.21)
    panel(0,0,.055,1.16,trim,.16)
    panel(0,0,width,.055,trim,.16)
    # Deep projecting sills keep the glass seated in a visible recess.
    box((x,y,z-.73),(.42 if side else width+.45,width+.45 if side else .42,.10),woods[2])

for x in [-1.9,1.9]:window((x,-2.50,2.06))
window((0,2.50,2.06))
for x in [-3.24,3.24]:window((x,0,2.06),True,1.48)

# Planked front door, inset glazed panel, hinges and a turned brass handle.
for i in range(6):box((-.50+i*.20,-2.39,1.65),(.19,.12,1.92),woods[(i+1)%4])
for x in [-.67,.67]:box((x,-2.54,1.65),(.14,.19,2.12),trim)
box((0,-2.52,2.73),(1.48,.20,.14),trim)
box((0,-2.47,2.23),(.80,.04,.57),glass)
for x in [-.29,0,.29]:box((x,-2.51,2.23),(.045,.06,.64),trim)
for z in [1.02,1.89]:box((-.48,-2.49,z),(.23,.055,.06),dark)
log((.42,-2.48,1.64),(.42,-2.61,1.64),.047,end)

# Front and rear gables are filled with shortened logs, capped by a real roof.
for y in [-2.32,2.32]:
    poly(trim,[(-3.14,y-.065,3.72),(3.14,y-.065,3.72),(0,y-.065,5.93),
               (-3.14,y+.065,3.72),(3.14,y+.065,3.72),(0,y+.065,5.93)],
         [(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)])
for i in range(8):
    h=4.0+i*.25;half=min(3.10,(5.83-h)/(2.21/3.73))
    if half>0:
        for y in [-2.35,2.35]:log((-half,y,h),(half,y,h),.135,woods[i%4],True)
ridge=6.0;eave=3.79;span=3.73
for side in [-1,1]:
    # Thickness at eaves and closed roof ends; no single-sided planes.
    vs=[(0,-4.28,ridge),(side*span,-4.28,eave),(side*span,2.97,eave),(0,2.97,ridge),
        (0,-4.28,ridge-.12),(side*span,-4.28,eave-.12),(side*span,2.97,eave-.12),(0,2.97,ridge-.12)]
    poly(slate[0],vs,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)])
    for row in range(11):
        for col in range(16):
            x0=side*(row*span/11);x1=side*((row+1.09)*span/11)
            y0=-4.25+col*.451+(row%2)*.17;y1=min(2.94,y0+.433)
            if y0>=2.94:continue
            z0=ridge-abs(x0)/span*(ridge-eave)+.037;z1=ridge-abs(x1)/span*(ridge-eave)+.065
            poly(slate[(row+col+random.randrange(3))%3],[(x0,y0,z0),(x1,y0,z1),(x1,y1,z1),(x0,y1,z0),
                (x0,y0,z0-.03),(x1,y0,z1-.03),(x1,y1,z1-.03),(x0,y1,z0-.03)],[(0,1,2,3),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0),(7,6,5,4)])
    for y in [-4.31,3.0]:log((0,y,6.04),(side*3.82,y,3.72),.115,trim,True)
    log((side*3.78,-4.36,3.75),(side*3.78,3.04,3.75),.105,trim,True)
log((0,-4.4,6.06),(0,3.07,6.06),.10,dark)

# Covered porch: structural posts, gable truss, rails and a centered staircase.
for x in [-2.91,2.91]:
    log((x,-3.86,.58),(x,-3.86,4.10),.14,woods[2],True)
    log((x,-3.86,3.03),(x*.72,-3.86,3.83),.08,trim,True)
log((-3.34,-3.86,3.80),(3.34,-3.86,3.80),.17,woods[2],True)
log((0,-3.88,3.80),(0,-3.88,5.92),.105,trim,True)
for s in [-1,1]:log((0,-3.88,3.86),(s*1.62,-3.88,4.93),.10,woods[2],True)
for side in [-1,1]:
    a,b=(.96,2.90) if side>0 else (-2.90,-.96)
    for z in [.90,1.58]:log((a,-3.82,z),(b,-3.82,z),.073,woods[2],True)
    for j in range(7):log((a+(b-a)*j/6,-3.82,.89),(a+(b-a)*j/6,-3.82,1.57),.035,trim)
    for z in [.90,1.58]:log((side*2.91,-3.82,z),(side*2.91,-2.50,z),.073,woods[2],True)
    for j in range(5):log((side*2.91,-3.74+j*.28,.89),(side*2.91,-3.74+j*.28,1.57),.035,trim)
for i in range(4):
    box((0,-4.08-i*.31,.52-i*.16),(1.85,.43,.16),woods[2])
    for s in [-1,1]:box((s*.75,-4.08-i*.31,.12-i*.08),(.12,.34,.66-i*.16),trim)

# Chimney masonry wraps all four sides and extends beneath the roof.
box((2.14,1.27,4.62),(.97,.95,3.75),stone[0])
for row in range(13):
    for side in [-1,1]:
        for col in range(2):
            q=(col-.5)*.47+(row%2-.5)*.08
            rock((2.14+q,1.27+side*.47,2.89+row*.285),(.49,.18,.29),random.choice(stone))
            rock((2.14+side*.47,1.27+q,2.89+row*.285),(.18,.49,.29),random.choice(stone))
box((2.14,1.27,6.61),(1.18,1.17,.14),stone[1])
box((2.14,1.27,6.70),(.75,.74,.06),dark)
for x in [1.73,2.55]:
    for y in [.88,1.66]:box((x,y,6.86),(.038,.038,.39),dark)
box((2.14,1.27,7.07),(1.19,1.17,.10),dark)

# Lantern cages on both sides of the front door.
for x in [-.93,.93]:
    box((x,-2.61,2.30),(.10,.10,.60),dark)
    box((x,-2.78,2.35),(.22,.20,.30),glass)
    for z in [2.16,2.55]:box((x,-2.78,z),(.31,.29,.065),dark)
    for xx in [-.13,.13]:
        for y in [-2.89,-2.67]:box((x+xx,y,2.35),(.022,.022,.39),dark)

# Split firewood and porch bench add readable human-scale detail.
for row in range(4):
    for i in range(5-row):log((1.44+i*.24+row*.12,-2.72,.88+row*.20),(1.44+i*.24+row*.12,-3.13,.88+row*.20),.12,woods[i%4],True)
for y in [-2.85,-3.41]:
    for x in [-2.55,-1.36]:box((x,y,.94),(.10,.10,.55),trim)
for i in range(3):box((-1.96,-3.39+i*.23,1.20),(1.49,.21,.10),woods[2])
for x in [-2.61,-1.30]:box((x,-2.78,1.45),(.085,.09,1.02),trim)
for z in [1.58,1.81]:box((-1.96,-2.78,z),(1.43,.085,.15),woods[1])

for name,(vs,fs) in parts.items():
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.materials.append(materials[name]);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    # Authoring primitives intentionally accept either roof slope direction.
    # Recalculate every closed surface to guarantee correct exterior normals.
    import bmesh
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()

assets=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for obj in assets:obj.select_set(True)
bpy.context.view_layer.objects.active=assets[0]
bpy.ops.export_scene.gltf(filepath=OUT+'/lakeside-cabin.glb',export_format='GLB',use_selection=True,export_yup=True,export_extras=True)

# Retain editable native geometry and a composed studio view in Blender.
bpy.context.scene.world.color=(.22,.22,.22)
def area(name,pos,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=pos
    obj.rotation_euler=(Vector((0,0,2.6))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Warm studio key',(1,-8,12),1800,8)
area('Cool studio fill',(-8,-1,7),1300,7)
area('Roof rim',(4,7,10),2000,6)
camdata=bpy.data.cameras.new('Cabin orbit review');cam=bpy.data.objects.new('Cabin orbit review',camdata);bpy.context.collection.objects.link(cam)
cam.location=(11,-15,10);cam.rotation_euler=(Vector((0,-.5,2.7))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=14
bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1100;scene.render.resolution_y=900;scene.render.resolution_percentage=100
for screen in bpy.data.screens:
    for area_ in screen.areas:
        if area_.type=='VIEW_3D':
            area_.spaces.active.region_3d.view_distance=16
            area_.spaces.active.region_3d.view_location=Vector((0,-.5,2.7))
            area_.spaces.active.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
            area_.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/../outputs/lakeside-cabin.blend')
print('CABIN_EXPORTED',len(assets),os.path.getsize(OUT+'/lakeside-cabin.glb'))
