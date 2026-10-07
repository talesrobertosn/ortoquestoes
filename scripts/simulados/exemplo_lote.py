# Modelo de lote para scripts/simulados/aplicar_lote.py (copie para a pasta de trabalho do capítulo).
# Uma questão por dict; gabarito equilibrado no lote; nada de travessão, itálico com asterisco simples ou ==.
CAP = 32
REF = "Rockwood and Green's Fractures in Adults, 10ª ed., capítulo 32 (Acromioclavicular and Sternoclavicular Joint Injuries; Hebert-Davies, Sniderman e Nauth)"
ARQ = "Rockwood_10e_cap32_Acromioclavicular_and_Sternoclavicular.pdf"
AC = "Luxação acromioclavicular"   # subtema: precisa existir no tema escolhido (src/dados/taxonomia.json)

QUESTOES = [
dict(sub=[AC], pag=19, gab="A",
     # img=("ac-p21-1", "figura 32-22E", (0, 0, 400, 300)),  # opcional: arquivo em <pasta>/img, figura, recorte
     # Sem lacunas (______): pergunta direta ou par com "respectivamente".
     enun="Na luxação acromioclavicular completa com distância coracoclavicular igual à do lado normal, a lesão associada suspeita e a melhor incidência para confirmá-la são, respectivamente,",
     alts=["fratura da base do processo coracoide; STRYKER", "fratura da base do processo coracoide; WEST POINT",
           "fratura da clavícula distal; STRYKER", "fratura da clavícula distal; WEST POINT"],
     conceito="""**Título do primeiro bloco.** Aula do trecho do capítulo: definição, mecanismo, números com contexto,
tabela só quando compara de fato, ligação com a banca ("A banca já cobrou ... (TARO 2018)").

> **Na prova:** a frase que fica.""",
     correta="""**A: fratura da base do processo coracoide; STRYKER.** Por que está certa, com o dado do livro e onde ele aparece.""",
     inc={
         "B": """**O primeiro está certo, o segundo não.** O que a alternativa diz, de onde vem o distrator no livro e como diferenciar.""",
         "C": """**...**""",
         "D": """**...**""",
     }),
]
