"""Three original closed-mesh shore plants: cattail, wild rose and heather."""
import bpy, math, random, importlib.util, os
from mathutils import Vector

ROOT = 'O:/resume_curate_skill/portfolio'
spec = importlib.util.spec_from_file_location('understory_author', ROOT + '/scripts/model-shore-understory.py')
base = importlib.util.module_from_spec(spec); spec.loader.exec_module(base)
Sculpture = base.Sculpture

def blade(model, root, angle, height, lean, width, color):
    radial = Vector((math.cos(angle), math.sin(angle), 0))
    side = Vector((-math.sin(angle), math.cos(angle), 0))
    vertices = []
    for t, taper in [(0, .55), (.3, 1), (.7, .7), (1, .015)]:
        p = root + radial * lean * t * t + Vector((0, 0, height * (t - .16 * t**3)))
        vertices.extend([p + side * width * taper, p - side * width * taper,
                         p + radial * width * .3 * taper])
    faces = [(2, 1, 0), (9, 10, 11)]
    for k in range(3):
        for j in range(3):
            faces.append((k*3+j, k*3+(j+1)%3, (k+1)*3+(j+1)%3, (k+1)*3+j))
    model.add(vertices, faces, color)

def cattails():
    random.seed(2304); model = Sculpture()
    for i in range(9):
        a = i * 2.39996; radius = .40 * math.sqrt(i / 9)
        root = Vector((math.cos(a)*radius, math.sin(a)*radius, -.075))
        height = random.uniform(1.12, 1.68)
        tip = root + Vector((random.uniform(-.08,.08), random.uniform(-.07,.07), height))
        model.stem([root, root.lerp(tip,.60), tip + Vector((0,0,.065))], [.014,.011,.003], (.40,.46,.25), 5)
        # The familiar brown cylindrical seed head, with beveled closed ends.
        bottom = tip - Vector((0,0,.27))
        model.stem([bottom, bottom + Vector((0,0,.035)), tip - Vector((0,0,.025)), tip],
                   [.025,.057,.057,.025], (.32 + i*.005,.20 + i*.004,.12), 8)
        for j in range(5):
            blade(model, root, a+j*2.39996, random.uniform(.75,1.22), random.uniform(.22,.48),
                  random.uniform(.025,.042), random.choice([(.37,.45,.26),(.46,.52,.30),(.54,.55,.33)]))
    return model.object('Cattails / brown seed heads and arching sword leaves')

def blossom(model, center, size, pink=False):
    # Five thick petals around a small golden center; the undersides are modeled.
    normal = Vector((random.uniform(-.55,.55),random.uniform(-.55,.55),1)).normalized()
    tangent = normal.cross(Vector((0,1,0))).normalized(); across = normal.cross(tangent)
    for j in range(5):
        a = j * math.tau/5
        direction = tangent*math.cos(a) + across*math.sin(a) + normal*.18
        model.leaf(center, direction, size, size*.57,
                   random.choice([(.85,.61,.66),(.94,.73,.74),(.91,.68,.70)] if pink else
                                 [(.94,.88,.72),(.96,.92,.81),(.90,.84,.68)]))
    model.stem([center-normal*.012,center+normal*.029],[size*.24,size*.18],(.79,.56,.20),7)

def flowering_bush():
    random.seed(5913); model = Sculpture()
    greens = [(.31,.42,.25),(.38,.48,.28),(.42,.50,.32)]
    for i in range(13):
        a = i*2.39996; radius = random.uniform(.32,.70)
        height = random.uniform(.50,.94)
        radial = Vector((math.cos(a),math.sin(a),0))
        root = radial*.08 + Vector((0,0,-.065))
        tip = radial*radius + Vector((0,0,height))
        middle = radial*radius*.38 + Vector((0,0,height*.68))
        model.stem([root,middle,tip],[.024,.012,.003],(.36,.29,.19))
        for j in range(7):
            t = .14+j*.125
            origin = root.lerp(middle,t/.55) if t<.55 else middle.lerp(tip,(t-.55)/.45)
            side = Vector((-math.sin(a),math.cos(a),.25)) * (-1 if j%2 else 1)
            end = origin + side*.22 + Vector((0,0,.03))
            model.stem([origin,end],[.007,.002],(.40,.35,.22))
            for sign in [-1,1]:
                model.leaf(end,radial*.4+side*sign+Vector((0,0,.25)),.21,.082,random.choice(greens))
            if j in [3,5]: blossom(model,end+Vector((0,0,.035)),random.uniform(.082,.12),i%4==0)
        blossom(model,tip,.12,i%4==0)
    return model.object('Wild rose bush / ivory and blush flowers with gold centers')

def heather():
    random.seed(874); model = Sculpture()
    for i in range(25):
        a = i*2.39996; radius = .67*math.sqrt(i/25)
        height = .68 - radius*.39 + random.uniform(-.07,.08)
        radial = Vector((math.cos(a),math.sin(a),0))
        root = radial*.10 + Vector((0,0,-.065))
        tip = radial*radius + Vector((0,0,height))
        middle = root.lerp(tip,.60) + Vector((0,0,.06))
        model.stem([root,middle,tip],[.018,.009,.002],(.32,.28,.21),5)
        for j in range(6):
            origin = root.lerp(tip,.22+j*.125)
            for side in range(3):
                b = a + side*math.tau/3 + j*.5
                direction = Vector((math.cos(b),math.sin(b),.45))
                model.leaf(origin,direction,.14,.035,random.choice([(.34,.39,.29),(.42,.46,.34),(.48,.49,.36)]))
        # Compact mauve flower spikes create a low, rounded silhouette.
        for j in range(4):
            origin = tip + Vector((0,0,j*.024))
            for side in range(3):
                b = a+side*math.tau/3+j*.7
                model.leaf(origin,Vector((math.cos(b),math.sin(b),.8)),.048,.027,
                           random.choice([(.65,.44,.57),(.73,.53,.65),(.80,.63,.70)]))
    return model.object('Heather / low evergreen cushion and mauve flower spikes')

def author():
    scene = bpy.data.scenes.new('Shrub variant studies'); bpy.context.window.scene = scene
    material = bpy.data.materials.new('Shrub variant vertex colors'); material.use_nodes = True
    nodes = material.node_tree.nodes; shader = nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = .94
    color = nodes.new('ShaderNodeVertexColor'); color.layer_name = 'UnderstoryColor'
    material.node_tree.links.new(color.outputs['Color'],shader.inputs['Base Color'])
    base.scene, base.material = scene, material
    objects = [('cattail',cattails()),('flower',flowering_bush()),('heather',heather())]
    for i,(kind,obj) in enumerate(objects):
        bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
        path = ROOT+'/public/models/shore-'+kind+'.glb'
        bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True)
        print(kind,len(obj.data.polygons),'triangles',os.path.getsize(path),'bytes')
        obj.location.x = i*2.0
    world=bpy.data.worlds.new('Variant studio');world.use_nodes=True;scene.world=world
    world.node_tree.nodes['Background'].inputs[0].default_value=(.23,.25,.23,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.7
    for name,pos,power in [('Foliage key',(-2,-4,6),750),('Petal rim',(6,4,5),600)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=6
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=pos
        obj.rotation_euler=(Vector((2,0,.65))-obj.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('Variants camera');camera=bpy.data.objects.new('Variants camera',data);scene.collection.objects.link(camera)
    camera.location=(4.2,-9,4.1);camera.rotation_euler=(Vector((2,0,.68))-camera.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO';data.ortho_scale=6.4;scene.camera=camera
    scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=1400;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.render.filepath=ROOT+'/../outputs/shrub-variants-review.png'
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL'
    bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/../outputs/shrub-variants.blend')

if __name__=='__main__': author()
