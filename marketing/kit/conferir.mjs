// Confere um post da fila antes de gerar as imagens (o renderizar.mjs já chama sozinho).
// Uso: node marketing/kit/conferir.mjs marketing/kit/fila/post-07.json
//      node marketing/kit/conferir.mjs todos        (a fila inteira)
// Erro = não pode publicar assim. Aviso = olhe com atenção.
import { existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { ESTILOS, KIT, RAIZ, acervo, acharPost, dias, filaInteira, historico, ler, publicadas } from './lib/comum.mjs'

const semMarca = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\[\[|\]\]|\*\*|==|\*/g, '')
  .replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
const EMOJI = /\p{Extended_Pictographic}/u

function textos(obj, fora = []) {
  if (obj == null) return fora
  if (typeof obj === 'string') fora.push(obj)
  else if (Array.isArray(obj)) obj.forEach((x) => textos(x, fora))
  else if (typeof obj === 'object') Object.values(obj).forEach((x) => textos(x, fora))
  return fora
}

export function conferir(post) {
  const erros = [], avisos = []
  if (!post.post) erros.push('Falta o campo "post" (ex.: "post-07").')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.data ?? '')) erros.push('Falta a "data" no formato AAAA-MM-DD.')
  if (!Array.isArray(post.pecas) || !post.pecas.length) erros.push('Falta "pecas": a lista de estilos a gerar.')
  for (const p of post.pecas ?? []) {
    if (!ESTILOS[p.estilo]) erros.push(`Estilo sem modelo no kit: "${p.estilo}". Use: ${Object.keys(ESTILOS).join(', ')}.`)
    else if (!existsSync(join(KIT, 'modelos', p.estilo + '.html'))) erros.push(`Modelo não encontrado: modelos/${p.estilo}.html`)
  }

  // 1. A questão é a do acervo, sem mudança.
  const q = post.questao
  if (q) {
    const a = acervo().get(q.id)
    if (!a) erros.push(`Questão ${q.id} não existe no acervo.`)
    else {
      const o = a.q
      if (q.enunciado !== o.enunciado) erros.push(`${q.id}: o enunciado está diferente do acervo. Rode: node marketing/kit/questao.mjs ${q.id}`)
      const alts = JSON.stringify((q.alternativas ?? []).map((x) => [x.letra, x.texto]))
      if (alts !== JSON.stringify(o.alternativas.map((x) => [x.letra, x.texto]))) erros.push(`${q.id}: as alternativas estão diferentes do acervo.`)
      if (q.gabarito !== o.gabarito) erros.push(`${q.id}: gabarito ${q.gabarito} diferente do acervo (${o.gabarito}). Nunca mude o gabarito.`)
      if ((q.prova ?? null) !== (o.prova ?? null) || (q.ano ?? null) !== (o.ano ?? null)) erros.push(`${q.id}: prova ou ano diferente do acervo.`)
      if (o.anulada) erros.push(`${q.id}: questão anulada.`)
      const c = a.c ?? {}
      if (q.comentario) {
        if (q.comentario.correta !== (c.correta ?? null)) erros.push(`${q.id}: comentario.correta não é cópia do acervo.`)
        if (JSON.stringify(q.comentario.incorretas ?? {}) !== JSON.stringify(c.incorretas ?? {})) erros.push(`${q.id}: comentario.incorretas não é cópia do acervo.`)
        for (const tr of q.comentario.conceito_trechos ?? []) if (!(c.conceito ?? '').includes(tr)) erros.push(`${q.id}: um trecho de conceito_trechos não está no comentário do acervo.`)
        if (c.alerta) avisos.push(`${q.id}: o comentário tem um alerta. Leia antes de publicar: ${c.alerta.slice(0, 160)}...`)
        if (c.conferido === false) avisos.push(`${q.id}: comentário com conferido=false. A aprovação visual não é revisão médica.`)
      } else avisos.push(`${q.id}: sem o bloco "comentario" copiado. Rode: node marketing/kit/questao.mjs ${q.id}`)
      for (const im of q.imagens ?? []) if (!existsSync(join(RAIZ, im.arquivo ?? im))) erros.push(`Imagem da questão não existe: ${im.arquivo ?? im}`)
      if (!post.registrado) {
        const ja = publicadas().jaSaiu(q.id)
        if (ja.length) erros.push(`${q.id} já foi publicada (${ja.join(', ')}). Escolha outra questão.`)
      }
      // Textos formatados só podem mudar a marcação, nunca as palavras.
      for (const p of post.pecas ?? []) {
        const ct = p.conteudo ?? {}
        if (ct.enunciado_formatado && semMarca(ct.enunciado_formatado) !== semMarca(o.enunciado)) erros.push(`${p.estilo}: enunciado_formatado muda o texto do acervo.`)
        ;(ct.alternativas_formatadas ?? []).forEach((x, i) => {
          if (semMarca(x) !== semMarca(o.alternativas[i]?.texto)) erros.push(`${p.estilo}: alternativas_formatadas[${i}] muda o texto do acervo.`)
        })
        for (const img of [ct.imagem].filter(Boolean)) if (!existsSync(join(RAIZ, img))) erros.push(`Imagem não existe: ${img}`)
      }
    }
  }
  for (const p of post.pecas ?? []) {
    const faltam = ['tela_notebook', 'tela_celular'].map((k) => p.conteudo?.[k]).filter((img) => img && !existsSync(join(RAIZ, img)))
    for (const img of faltam) erros.push(`Tela não encontrada: ${img}`)
    if (faltam.length) erros.push(`Capture as telas antes (assets.md, "Telas do site"): ${p.conteudo.captura ?? ''}`)
  }

  // 2. Regras da marca em todos os textos.
  const todos = textos(post.pecas).concat(post.legenda ? [post.legenda] : [])
  for (const s of todos) {
    if (EMOJI.test(s)) erros.push(`Emoji não pode: "${s.slice(0, 50)}"`)
    if (/intelig[êe]ncia artificial/i.test(s) || (s === post.legenda && /\bIA\b/.test(s))) erros.push(`Não mencionar IA: "${s.slice(0, 50)}"`)
    if (/\bcripta\b|masmorra/i.test(s)) erros.push(`Fora do jogo é "Flashcards", nunca Cripta ou masmorra: "${s.slice(0, 50)}"`)
    if (/R\$\s?\d/.test(s) && !post.permite_preco) erros.push(`Preço só a pedido do Tales: "${s.slice(0, 50)}"`)
  }

  // 3. Legenda do feed.
  const temFeed = (post.pecas ?? []).some((p) => ESTILOS[p.estilo]?.formato.includes('feed') && !(p.estilo === 'var' && p.conteudo?.incluir === 'stories'))
  if (temFeed && !post.legenda) erros.push('Post de feed sem "legenda".')
  if (post.legenda) {
    const l = post.legenda
    if (/https?:|www\.|\.com\b|\.br\b/i.test(l)) erros.push('Legenda sem endereço do site (o Instagram entrega menos).')
    if (/\blink\b/i.test(l)) erros.push('Legenda sem a palavra "link": leve para o perfil.')
    if (!/perfil/i.test(l)) avisos.push('A legenda deve levar para o perfil (ex.: "o caminho está no nosso perfil, @ortoquestoes").')
    const tags = new Set([...(post.hashtags ?? []), ...(l.match(/#[\p{L}\d_]+/gu) ?? [])].map((x) => x.toLowerCase()))
    if (tags.size > 5) erros.push(`No máximo 5 hashtags (tem ${tags.size}).`)
  }

  // 4. Estilo: esperar pelo menos 2 dias para repetir (07/10 -> só a partir de 10/10).
  if (post.data) {
    const usos = historico().filter((h) => !String(h.post).startsWith(`kit-${post.post}`)).map((h) => ({ data: h.data, estilo: h.estilo, de: h.post }))
    for (const f of filaInteira()) if (f.post !== post.post) for (const p of f.pecas ?? []) usos.push({ data: f.data, estilo: p.estilo, de: f.post })
    for (const p of post.pecas ?? []) {
      const perto = usos.filter((u) => u.estilo === p.estilo && Math.abs(dias(u.data, post.data)) < 3)
      for (const u of perto) avisos.push(`Estilo ${p.estilo} também em ${u.data} (${u.de}): a regra é esperar 2 dias para repetir.`)
    }
    const feeds = filaInteira().filter((f) => f.data === post.data && f.post !== post.post && /feed/.test(f.formato ?? '')).length + (/feed/.test(post.formato ?? '') ? 1 : 0)
    if (feeds > 2) avisos.push(`${feeds} posts de feed em ${post.data}: o máximo é 2 por dia.`)
  }
  for (const p of post.pecas ?? []) if (p.estilo === 'treine-gratis' && !p.conteudo?.utm_campaign) avisos.push('Treine grátis: defina utm_campaign (troque a cada story).')
  return { erros, avisos }
}

export function imprimir(nome, { erros, avisos }) {
  for (const e of erros) console.log(`  ERRO   ${e}`)
  for (const a of avisos) console.log(`  aviso  ${a}`)
  if (!erros.length && !avisos.length) console.log('  tudo certo')
  return erros.length
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2]
  const lista = arg === 'todos' ? filaInteira().map((f) => f.arquivo) : [acharPost(arg)]
  if (!lista[0]) { console.error('Uso: node marketing/kit/conferir.mjs <post.json | todos>'); process.exit(1) }
  let falhas = 0
  for (const arq of lista) {
    const post = ler(arq)
    console.log(`${post.post ?? arq} · ${post.data ?? ''} · ${(post.pecas ?? []).map((p) => p.estilo).join(' + ')}`)
    falhas += imprimir(arq, conferir(post)) ? 1 : 0
  }
  process.exit(falhas ? 1 : 0)
}
