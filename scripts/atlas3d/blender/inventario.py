# Inventário completo do Startup.blend do Z-Anatomy (só leitura).
# Uso: blender --background Startup.blend --python inventario.py -- <saida.json>
import bpy, json, sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAIDA = argv[0] if argv else "inventario.json"

caminhos = {}
def andar(col, trilha):
    t = trilha + [col.name]
    for o in col.objects:
        caminhos.setdefault(o.name, []).append("/".join(t[1:]))
    for c in col.children:
        andar(c, t)
andar(bpy.context.scene.collection, [])

objs = []
for o in bpy.data.objects:
    r = {
        "nome": o.name,
        "tipo": o.type,
        "colecoes": caminhos.get(o.name, []),
        "pai": o.parent.name if o.parent else None,
        "oculto": bool(o.hide_viewport),
        "mods": [m.type for m in o.modifiers],
        "mats": [s.material.name for s in o.material_slots if s.material][:3],
    }
    if o.type == "MESH" and o.data:
        r["v"] = len(o.data.vertices)
        r["f"] = len(o.data.polygons)
        r["malha"] = o.data.name
    objs.append(r)

with open(SAIDA, "w", encoding="utf-8") as f:
    json.dump({"blender": bpy.app.version_string, "n": len(objs), "objetos": objs}, f, ensure_ascii=False)
print("INVENTARIO_OK", len(objs))
