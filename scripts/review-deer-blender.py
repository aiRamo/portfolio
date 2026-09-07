"""Import the exact Three.js deer geometry into an editable Blender study.

The source export is a development artifact produced from src/deer.mjs.
Preserves the cabin scene by saving a separate native study before review.
"""
import bpy, json
from mathutils import Matrix, Vector
ROOT = 'O:/resume_curate_skill/portfolio'
data = json.load(open(ROOT+'/outputs/deer-review.json'))
# Hide the existing cabin for this alternate scene without deleting its geometry.
original = bpy.context.scene
study = bpy.data.scenes.new('Deer anatomy study')
bpy.context.window.scene = study
mat = bpy.data.materials.new('Deer facet colors');mat.use_nodes = True
nodes = mat.node_tree.nodes;bsdf = nodes.get('Principled BSDF')
vertex = nodes.new('ShaderNodeVertexColor');vertex.layer_name='Coat'
mat.node_tree.links.new(vertex.outputs['Color'],bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value=.93
conversion=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
for i,item in enumerate(data['meshes']):
    p=item['positions'];colors=item['colors']
    mesh=bpy.data.meshes.new(item['name'])
    mesh.from_pydata([tuple(p[j:j+3]) for j in range(0,len(p),3)],[],[tuple(range(j,j+3)) for j in range(0,len(p)//3,3)])
    mesh.materials.append(mat)
    attr=mesh.color_attributes.new(name='Coat',type='FLOAT_COLOR',domain='POINT')
    for j,element in enumerate(attr.data):element.color=(*colors[j*3:j*3+3],1)
    obj=bpy.data.objects.new(item['name'],mesh);study.collection.objects.link(obj)
    m=item['matrixWorld'];three=Matrix([m[j::4] for j in range(4)])
    # Bring the habitat into the study without changing relative poses or height.
    three.translation+=Vector((-10,0,34))
    obj.matrix_world=conversion@three
world=bpy.data.worlds.new('Deer studio');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.20,.18,.15,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.65;study.world=world
for name,pos,power,size in [('Key',(-6,-8,12),1900,8),('Fill',(7,0,8),1400,7)]:
    light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size
    obj=bpy.data.objects.new(name,light);study.collection.objects.link(obj);obj.location=pos
    obj.rotation_euler=(Vector((0,0,2))-obj.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('Herd review');cam=bpy.data.objects.new('Herd review',camdata);study.collection.objects.link(cam)
cam.location=(12,-17,11);cam.rotation_euler=(Vector((0,0,2.7))-cam.location).to_track_quat('-Z','Y').to_euler()
camdata.type='ORTHO';camdata.ortho_scale=12;study.camera=cam
study.render.engine='CYCLES';study.cycles.samples=16
study.render.resolution_x=1100;study.render.resolution_y=850;study.render.resolution_percentage=100
study.render.filepath=ROOT+'/../outputs/deer-blender-review.png'
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/../outputs/valley-models.blend')
print('Saved cabin and editable eight-deer study in valley-models.blend')
