# Pelve feminina do Atlas 3D a partir da Human Reference Atlas (HuBMAP CCF v1.2, CC BY 4.0):
# útero, colo do útero, ovários e tubas uterinas da Visible Human Female, encaixados no esqueleto do
# atlas pela pelve óssea (a pelve feminina da HuBMAP é alinhada à caixa do quadril + sacro do atlas:
# escala uniforme pela altura, centro na caixa). Saída: GLB Draco no padrão dos outros (mm, Z para cima).
# Uso: blender --background --factory-startup --python exportar_feminino.py -- <pasta hubmap> <saida.glb> "<caixa alvo mm: x0 y0 z0 x1 y1 z1>" "<ajuste mm: dx dy dz>"
import bpy, sys, os, json
from mathutils import Matrix, Vector

a = sys.argv[sys.argv.index("--") + 1:]
PASTA, SAIDA, ALVO = a[0], a[1], [float(x) for x in a[2].split()]
# ajuste fino (mm) depois do encaixe pela pelve: a bexiga do modelo masculino é grande; o útero em anteversão
# fica apoiado sobre ela e o colo, atrás dela
AJUSTE = Vector([float(x) for x in a[3].split()]) if len(a) > 3 else Vector((0, 0, 0))
bpy.ops.wm.read_factory_settings(use_empty=True)

def importar(nome):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(PASTA, nome))
    return [o for o in set(bpy.data.objects) - antes if o.type == "MESH"]

def caixa(objs):
    vs = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    return Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))), Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))

# referência: ossos da pelve feminina (sem o osso esponjoso, que fica por dentro do compacto)
pelve = [o for o in importar("VH_F_Pelvis.glb") if "spongy" not in o.name]
p0, p1 = caixa(pelve)
a0, a1 = Vector(ALVO[:3]), Vector(ALVO[3:])
escala = (a1.z - a0.z) / (p1.z - p0.z)
centro_p, centro_a = (p0 + p1) / 2, (a0 + a1) / 2
T = Matrix.Translation(centro_a + AJUSTE) @ Matrix.Scale(escala, 4) @ Matrix.Translation(-centro_p)
for o in pelve:
    bpy.data.objects.remove(o)

# peças: (id no atlas, arquivo, filtro de nomes das malhas a juntar)
PECAS = [
    ("fem_utero", "VH_F_Uterus.glb", ("anterior_wall", "posterior_wall", "fundus")),
    ("fem_colo_do_utero", "VH_F_Uterus.glb", ("cervix",)),
    ("fem_ovario_l", "VH_F_Ovary_L.glb", ("ovary",)),
    ("fem_ovario_r", "VH_F_Ovary_R.glb", ("ovary",)),
    ("fem_tuba_uterina_l", "VH_F_Fallopian_Tube_L.glb", ("ampulla", "isthmus", "infundibulum", "fibria")),
    ("fem_tuba_uterina_r", "VH_F_Fallopian_Tube_R.glb", ("ampulla", "isthmus", "infundibulum", "fibria")),
]
cena = bpy.data.scenes.new("feminino")
meta = []
for id_, arq, filtros in PECAS:
    objs = [o for o in importar(arq) if any(f in o.name for f in filtros)]
    dg = bpy.context.evaluated_depsgraph_get()
    import bmesh
    bm = bmesh.new()
    for o in objs:
        me = o.evaluated_get(dg).to_mesh()
        me.transform(T @ o.matrix_world)
        bm.from_mesh(me)
        o.evaluated_get(dg).to_mesh_clear()
    malha = bpy.data.meshes.new(id_)
    bm.to_mesh(malha); bm.free()
    novo = bpy.data.objects.new(id_, malha)
    cena.collection.objects.link(novo)
    xs = [v.co.x for v in malha.vertices]; ys = [v.co.y for v in malha.vertices]; zs = [v.co.z for v in malha.vertices]
    meta.append({"id": id_, "v": len(xs), "b": [round(min(xs), 1), round(min(ys), 1), round(min(zs), 1), round(max(xs), 1), round(max(ys), 1), round(max(zs), 1)]})
    for o in objs:
        bpy.data.objects.remove(o)

with bpy.context.temp_override(scene=cena):
    bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=False, use_visible=False, use_active_scene=True,
        export_yup=False, export_apply=False, export_normals=False, export_texcoords=False, export_materials="NONE",
        export_colors=False, export_attributes=False, export_extras=False, export_animations=False, export_skins=False,
        export_morph=False, export_cameras=False, export_lights=False, export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7, export_draco_position_quantization=14)
open(SAIDA.replace(".glb", ".json"), "w").write(json.dumps({"escala": escala, "pecas": meta}))
print("FEMININO_OK", escala, json.dumps(meta))
