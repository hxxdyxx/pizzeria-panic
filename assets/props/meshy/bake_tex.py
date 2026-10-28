# blender -b -P bake_tex.py -- in.glb out.glb target_tris [tex_px]
# Meshy GLB -> one decimated mesh that keeps its UVs and only the base-color texture (downsized,
# JPEG). For flat props like the model pans, where large flat faces have too few vertices to hold
# a pattern as vertex colors (bake.py).
import bpy, sys

a = sys.argv[sys.argv.index('--') + 1:]
src, dst, target = a[0], a[1], int(a[2])
px = int(a[3]) if len(a) > 3 else 512

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in bpy.context.scene.objects: o.select_set(False)
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

img = None
for m in ob.data.materials:
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image and not img:
                bc = m.node_tree.nodes.get('Principled BSDF')
                if bc and any(l.to_node == bc and l.to_socket.name == 'Base Color' for l in n.outputs['Color'].links): img = n.image
if not img:
    img = next(i for i in bpy.data.images if i.size[0] > 0)
img.scale(px, px)

tris0 = sum(len(p.vertices) - 2 for p in ob.data.polygons)
if tris0 > target:
    d = ob.modifiers.new('dec', 'DECIMATE'); d.ratio = target / tris0
    bpy.ops.object.modifier_apply(modifier='dec')

mat = bpy.data.materials.new('prop'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.7
ob.data.materials.clear(); ob.data.materials.append(mat)
for o in list(bpy.data.objects):
    if o != ob: bpy.data.objects.remove(o)
bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=False, export_image_format='JPEG',
                          export_materials='EXPORT', export_draco_mesh_compression_enable=False)
print('BAKED_TEX', src, 'tris', tris0, '->', sum(len(p.vertices) - 2 for p in ob.data.polygons))
