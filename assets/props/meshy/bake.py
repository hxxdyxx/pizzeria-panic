# blender -b -P bake.py -- in.glb out.glb target_tris [preview.png]
# Meshy GLB -> one decimated mesh with the base-color texture sampled into a COLOR_0 corner attribute.
import bpy, sys, bmesh
from mathutils import Vector

a = sys.argv[sys.argv.index('--') + 1:]
src, dst, target = a[0], a[1], int(a[2])
prev = a[3] if len(a) > 3 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in bpy.context.scene.objects: o.select_set(False)
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# texture image of the first material
img = None
for m in ob.data.materials:
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image:
                img = n.image; break
    if img: break
W, H = img.size
px = list(img.pixels)  # flat RGBA float, linear for sRGB images? pixels are stored in image colorspace

def sample(u, v):
    if u != u or v != v: u = v = 0.0
    x = min(W - 1, max(0, int((u % 1.0) * W))); y = min(H - 1, max(0, int((v % 1.0) * H)))
    i = (y * W + x) * 4
    return px[i], px[i + 1], px[i + 2]

# weld the seam splits so decimation can't open cracks
bm = bmesh.new(); bm.from_mesh(ob.data)
dims = max(ob.dimensions)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dims * 1e-4)
bm.to_mesh(ob.data); bm.free()
# sample on the full-detail mesh (tiny faces, so no seam bleed), averaged per vertex
import numpy as np
me = ob.data
uvl = me.uv_layers.active.data
nv = len(me.vertices)
acc = np.zeros((nv, 3)); cnt = np.zeros(nv)
P = np.array(px, dtype=np.float32).reshape(H, W, 4)
for p in me.polygons:
    li = list(p.loop_indices)
    cu = sum(uvl[l].uv[0] for l in li) / len(li); cv = sum(uvl[l].uv[1] for l in li) / len(li)
    if cu != cu: continue
    for l in li:
        u = 0.6 * uvl[l].uv[0] + 0.4 * cu; v = 0.6 * uvl[l].uv[1] + 0.4 * cv
        x = min(W - 1, max(0, int((u % 1.0) * W))); y = min(H - 1, max(0, int((v % 1.0) * H)))
        r, g, bb, al = P[y, x]
        if al < 0.5: continue
        vi = me.loops[l].vertex_index
        acc[vi] += (r, g, bb); cnt[vi] += 1
col = acc / np.maximum(cnt, 1)[:, None]
E = np.array([e.vertices[:] for e in me.edges])
known = cnt > 0
for _ in range(30):
    if known.all(): break
    s_ = np.zeros((nv, 3)); n_ = np.zeros(nv)
    for a_, b_ in ((0, 1), (1, 0)):
        m_ = known[E[:, a_]]
        np.add.at(s_, E[m_, b_], col[E[m_, a_]]); np.add.at(n_, E[m_, b_], 1)
    fill = (~known) & (n_ > 0)
    col[fill] = s_[fill] / n_[fill][:, None]; known |= fill
ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
for i in range(nv): ca.data[i].color_srgb = (col[i, 0], col[i, 1], col[i, 2], 1)
me.color_attributes.active_color = ca
tris0 = sum(len(p.vertices) - 2 for p in me.polygons)
if tris0 > target:
    d = ob.modifiers.new('dec', 'DECIMATE'); d.ratio = target / tris0
    bpy.ops.object.modifier_apply(modifier='dec')
me = ob.data
ca = me.color_attributes['Col']
me.color_attributes.active_color = ca

# untextured material that uses the colors, so the exporter writes COLOR_0
mat = bpy.data.materials.new('prop'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.7
me.materials.clear(); me.materials.append(mat)
while me.uv_layers: me.uv_layers.remove(me.uv_layers[0])
for o in list(bpy.data.objects):
    if o != ob: bpy.data.objects.remove(o)
for i in list(bpy.data.images): bpy.data.images.remove(i)
bpy.ops.object.shade_smooth()

kw = dict(filepath=dst, export_format='GLB', use_selection=False, export_texcoords=False, export_materials='EXPORT', export_draco_mesh_compression_enable=False)
try:
    bpy.ops.export_scene.gltf(export_vertex_color='MATERIAL', **kw)
except TypeError:
    bpy.ops.export_scene.gltf(**kw)
print('BAKED', src, 'tris', tris0, '->', sum(len(p.vertices) - 2 for p in me.polygons))

if prev:
    sc = bpy.context.scene
    bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    ctr = sum(bb, Vector()) / 8; size = max((max(v[i] for v in bb) - min(v[i] for v in bb)) for i in range(3))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = size * 1.4
    cam.location = ctr + Vector((size, -size * 1.6, size * 1.1))
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler(); sc.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 3; sun.rotation_euler = (0.7, 0.2, 0.6)
    sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.6, 0.6, 0.6)
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 16; sc.cycles.device = 'CPU'
    sc.render.resolution_x = sc.render.resolution_y = 360; sc.render.filepath = prev
    bpy.ops.render.render(write_still=True)
