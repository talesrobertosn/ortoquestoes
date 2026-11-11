# Exporta do Startup.blend do Z-Anatomy as malhas que o Atlas 3D ainda não tem:
#   - "2: Muscular insertions": áreas de origem (.o*) e inserção (.e*) pintadas sobre o osso
#   - "9: Regions of human body": regiões topográficas da superfície
# Cada camada vira um GLB Draco (só posições, mm, Z para cima, sem transformação nos nós),
# no mesmo padrão dos GLB atuais do site, e um JSON com nome original, pai e caixa de cada nó.
# Uso: blender --background --factory-startup --disable-autoexec Startup.blend --python exportar_extras.py -- <pasta saída>
import bpy, json, os, sys, re
from mathutils import Matrix

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = argv[0] if argv else "."
os.makedirs(SAIDA, exist_ok=True)

def colecao_raiz(o):
    for c in o.users_collection:
        p = c
        # sobe até a coleção filha da cena
        while True:
            pais = [x for x in bpy.data.collections if p.name in x.children]
            if not pais:
                break
            p = pais[0]
        return p.name
    return ""

ESCALA = Matrix.Scale(1000.0, 4)
dg = bpy.context.evaluated_depsgraph_get()

def exportar(sistema, prefixo, arquivo, filtro):
    origem = [o for o in bpy.data.objects if o.type == "MESH" and colecao_raiz(o) == sistema and filtro(o)]
    origem.sort(key=lambda o: o.name)
    cena = bpy.data.scenes.new("exp_" + prefixo)
    meta = []
    for i, o in enumerate(origem):
        oe = o.evaluated_get(dg)
        me = bpy.data.meshes.new_from_object(oe, preserve_all_data_layers=False, depsgraph=dg)
        if len(me.vertices) < 3:
            bpy.data.meshes.remove(me)
            continue
        me.transform(ESCALA @ o.matrix_world)
        nome = f"{prefixo}{i:04d}"
        novo = bpy.data.objects.new(nome, me)
        cena.collection.objects.link(novo)
        xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
        meta.append({"id": nome, "nome": o.name, "pai": o.parent.name if o.parent else None,
                     "b": [round(min(xs), 1), round(min(ys), 1), round(min(zs), 1), round(max(xs), 1), round(max(ys), 1), round(max(zs), 1)],
                     "v": len(me.vertices)})
    janela = bpy.context.window
    if janela:
        janela.scene = cena
    ctx = bpy.context.copy()
    ctx["scene"] = cena
    with bpy.context.temp_override(scene=cena):
        bpy.ops.export_scene.gltf(
            filepath=os.path.join(SAIDA, arquivo), export_format="GLB", use_selection=False, use_visible=False,
            use_active_scene=True, export_yup=False, export_apply=False, export_normals=False, export_texcoords=False,
            export_materials="NONE", export_colors=False, export_attributes=False, export_extras=False,
            export_animations=False, export_skins=False, export_morph=False, export_cameras=False, export_lights=False,
            export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
            export_draco_position_quantization=14)
    with open(os.path.join(SAIDA, arquivo.replace(".glb", ".json")), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False)
    print("EXPORTADO", arquivo, len(meta))

exportar("2: Muscular insertions", "ins", "insercoes.glb", lambda o: re.search(r"\.(o|e)\d*[lr]$", o.name))
exportar("9: Regions of human body", "reg", "regioes.glb", lambda o: len(o.data.vertices) > 2)
print("FIM_EXPORT")
