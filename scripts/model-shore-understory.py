"""Original closed-mesh willow shrubs and sedge patches for the valley shore."""
import bpy, math, random, os, bmesh
from mathutils import Vector

ROOT = 'O:/resume_curate_skill/portfolio'

def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4

class Sculpture:
    def __init__(self):
        self.vertices, self.faces, self.colors = [], [], []

    def add(self, vertices, faces, color):
        for face in faces:
            for j in range(1, len(face) - 1):
                start = len(self.vertices)
                self.vertices.extend([tuple(vertices[i]) for i in [face[0], face[j], face[j + 1]]])
                self.faces.append((start, start + 1, start + 2))
                shade = random.uniform(.93, 1.06)
                self.colors.extend([(*(linear(v) * shade for v in color), 1)] * 3)

    def stem(self, points, radii, color, sides=5):
        vertices = []
        for i, p in enumerate(points):
            axis = (points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]).normalized()
            side = axis.cross(Vector((0, 1, 0))).normalized()
            up = axis.cross(side).normalized()
            for j in range(sides):
                a = j * math.tau / sides
                vertices.append(p + radii[i] * (side * math.cos(a) + up * math.sin(a)))
        faces = [tuple(reversed(range(sides))), tuple(range(len(vertices) - sides, len(vertices)))]
        for i in range(len(points) - 1):
            for j in range(sides):
                faces.append((i * sides + j, i * sides + (j + 1) % sides,
                              (i + 1) * sides + (j + 1) % sides, (i + 1) * sides + j))
        self.add(vertices, faces, color)

    def leaf(self, root, direction, length, width, color):
        direction.normalize()
        side = direction.cross(Vector((0, 0, 1)))
        if side.length < .01:
            side = direction.cross(Vector((0, 1, 0)))
        side.normalize()
        up = side.cross(direction).normalized()
        center = root + direction * length * .46
        vertices = [root, center + side * width, root + direction * length,
                    center - side * width, center + up * width * .27, center - up * width * .16]
        faces = [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4),
                 (1, 0, 5), (2, 1, 5), (3, 2, 5), (0, 3, 5)]
        self.add(vertices, faces, color)

    def object(self, name):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.vertices, [], self.faces)
        mesh.update()
        colors = mesh.color_attributes.new(name='UnderstoryColor', type='FLOAT_COLOR', domain='POINT')
        for i, color in enumerate(self.colors):
            colors.data[i].color = color
        bm = bmesh.new(); bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(mesh); bm.free()
        mesh.materials.append(material)
        obj = bpy.data.objects.new(name, mesh)
        scene.collection.objects.link(obj)
        return obj

def create_shrub():
    random.seed(537)
    model = Sculpture()
    palette = [(.32, .40, .26), (.38, .46, .31), (.43, .49, .34), (.34, .43, .31), (.46, .51, .36)]
    # Multiple arching woody stems keep the silhouette broad, open and irregular.
    for i in range(9):
        angle = i * 2.39996
        radial = Vector((math.cos(angle), math.sin(angle), 0))
        height = random.uniform(.84, 1.32)
        spread = random.uniform(.40, .77)
        base = radial * .10; base.z = -.06
        points = [base, radial * spread * .20 + Vector((0, 0, height * .38)),
                  radial * spread * .62 + Vector((0, 0, height * .78)),
                  radial * spread + Vector((0, 0, height))]
        model.stem(points, [.035, .022, .013, .003], (.38, .29, .19))
        for j in range(8):
            t = .25 + j * .092
            seg = min(2, int(t * 3)); root = points[seg].lerp(points[seg + 1], t * 3 - seg)
            side = -1 if j % 2 else 1
            a = angle + side * random.uniform(.65, 1.4)
            direction = Vector((math.cos(a), math.sin(a), random.uniform(.34, .9))).normalized()
            length = random.uniform(.23, .42) * (1 - t * .25)
            tip = root + direction * length
            model.stem([root, root.lerp(tip, .6), tip], [.009, .005, .001], (.43, .34, .23))
            tangent = Vector((-math.sin(a), math.cos(a), .25))
            for pair in range(3):
                origin = root.lerp(tip, .25 + pair * .29)
                for sign in [-1, 1]:
                    leaf_direction = direction * .50 + tangent * sign * .84 + Vector((0, 0, .3))
                    size = random.uniform(.15, .23) * (1 - pair * .055)
                    model.leaf(origin, leaf_direction, size, size * .36, random.choice(palette))
            model.leaf(tip, direction + Vector((0, 0, .22)), .19, .068, palette[2])
    return model.object('Willow shrub / arching stems and closed leaves')

def create_grass():
    random.seed(914)
    model = Sculpture()
    palette = [(.49, .52, .32), (.60, .58, .38), (.43, .48, .30), (.65, .60, .41)]
    for tuft in range(7):
        a = tuft * 2.39996; r = .36 * math.sqrt(tuft / 7)
        root = Vector((math.cos(a) * r, math.sin(a) * r, -.07))
        for j in range(9):
            angle = j * 2.39996 + tuft
            radial = Vector((math.cos(angle), math.sin(angle), 0))
            tangent = Vector((-math.sin(angle), math.cos(angle), 0))
            height = random.uniform(.37, .66)
            lean = random.uniform(.16, .35)
            width = random.uniform(.018, .032)
            vertices = []
            # Triangular blade sections have volume and remain visible from behind.
            for t, taper in [(0, .65), (.34, 1), (.70, .64), (1, .015)]:
                p = root + radial * lean * t * t + Vector((0, 0, height * t))
                vertices.extend([p + tangent * width * taper, p - tangent * width * taper,
                                 p + radial * width * .34 * taper])
            faces = [(2, 1, 0), (9, 10, 11)]
            for k in range(3):
                for side in range(3):
                    faces.append((k * 3 + side, k * 3 + (side + 1) % 3,
                                  (k + 1) * 3 + (side + 1) % 3, (k + 1) * 3 + side))
            model.add(vertices, faces, random.choice(palette))
        if tuft % 2 == 0:
            height = random.uniform(.64, .80)
            tip = root + Vector((.06, -.02, height))
            model.stem([root, root.lerp(tip, .6), tip], [.008, .006, .003], (.63, .56, .36), 4)
            for j in range(4):
                origin = tip - Vector((0, 0, j * .032))
                model.leaf(origin, Vector((.6 * (-1)**j, .2, .7)), .072, .022, (.62, .53, .33))
    return model.object('Sedge patch / arching blades and seed heads')

def author():
    global scene, material
    scene = bpy.data.scenes.new('Shore understory studies')
    bpy.context.window.scene = scene
    material = bpy.data.materials.new('Shore understory vertex colors')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    bsdf = nodes.get('Principled BSDF'); bsdf.inputs['Roughness'].default_value = .92
    colors = nodes.new('ShaderNodeVertexColor'); colors.layer_name = 'UnderstoryColor'
    material.node_tree.links.new(colors.outputs['Color'], bsdf.inputs['Base Color'])
    material.diffuse_color = (.16, .21, .11, 1)
    shrub, grass = create_shrub(), create_grass()
    for kind, obj in [('shrub', shrub), ('grass', grass)]:
        bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        path = ROOT + '/public/models/shore-' + kind + '.glb'
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                                  use_active_scene=True, export_yup=True)
        print(kind, len(obj.data.polygons), 'triangles', os.path.getsize(path), 'bytes')
    grass.location.x = 1.75
    world = bpy.data.worlds.new('Understory studio'); world.use_nodes = True; scene.world = world
    world.node_tree.nodes['Background'].inputs[0].default_value = (.25, .28, .23, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .7
    for name, pos, energy in [('Soft foliage key', (-3, -4, 6), 550), ('Leaf rim', (4, 3, 4), 400)]:
        data = bpy.data.lights.new(name, 'AREA'); data.energy = energy; data.shape = 'DISK'; data.size = 5
        obj = bpy.data.objects.new(name, data); scene.collection.objects.link(obj); obj.location = pos
        obj.rotation_euler = (Vector((.6, 0, .5)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    data = bpy.data.cameras.new('Understory study camera'); camera = bpy.data.objects.new('Understory study camera', data)
    scene.collection.objects.link(camera); camera.location = (3.4, -6, 3.1)
    camera.rotation_euler = (Vector((.7, 0, .60)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'; data.ortho_scale = 3.9; scene.camera = camera
    scene.render.engine = 'CYCLES'; scene.cycles.samples = 24
    scene.render.resolution_x = 1100; scene.render.resolution_y = 750; scene.render.resolution_percentage = 100
    scene.render.filepath = ROOT + '/../outputs/shore-understory-review.png'
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_perspective = 'CAMERA'
                area.spaces.active.shading.type = 'MATERIAL'
    bpy.ops.wm.save_as_mainfile(filepath=ROOT + '/../outputs/shore-understory.blend')
    print('Shore understory authored and exported.')

if __name__ == '__main__':
    author()
