import { useCallback, useEffect, useRef, useState } from 'react'
import { usarIndice } from '../../dados/usarIndice'
import { carregarQuestoes, recarregarAcervo } from '../../dados/acervo'
import { carregarComentario } from '../../dados/comentarios'
import { carregarEdicoes, esquecerEdicoes, urlImagem, type EdicaoQuestao } from '../../dados/edicoes'
import type { ComentarioIA, Imagem, Letra, Questao } from '../../dados/tipos'
import { chamarRpc, enviarImagemQuestao } from '../../servicos/supabase'
import { TextoEditorial } from '../TextoEditorial'
import { href } from '../../util/rotas'
import { dataHora, erroDoPainel } from './formatos'

const MIGRACAO = '202610050100_editor_questoes.sql'
const LETRAS: Letra[] = ['A', 'B', 'C', 'D', 'E']

interface Formulario {
  prova: string
  ano: string
  anulada: boolean
  enunciado: string
  imagens: Imagem[]
  alternativas: Array<{ letra: Letra; texto: string }>
  gabarito: Letra | ''
  autor: string
  temComentario: boolean
  alerta: string
  conceito: string
  correta: string
  incorretas: Partial<Record<Letra, string>>
  conferido: boolean
  imagensComentario: Imagem[]
}

function paraFormulario(q: Questao, c: ComentarioIA | null): Formulario {
  return {
    prova: q.prova ?? '',
    ano: q.ano ? String(q.ano) : '',
    anulada: q.anulada,
    enunciado: q.enunciado,
    imagens: q.imagens ?? [],
    alternativas: q.alternativas.map((a) => ({ letra: a.letra, texto: a.texto })),
    gabarito: q.gabarito ?? '',
    autor: q.comentario ?? '',
    temComentario: !!c,
    alerta: c?.alerta ?? '',
    conceito: c?.conceito ?? '',
    correta: c?.correta ?? '',
    incorretas: { ...(c?.incorretas ?? {}) },
    conferido: !!c?.conferido,
    imagensComentario: c?.imagens ?? [],
  }
}

function paraEdicao(f: Formulario, original: ComentarioIA | null): EdicaoQuestao {
  const letras = f.alternativas.map((a) => a.letra)
  const incorretas: Partial<Record<Letra, string>> = {}
  for (const l of letras) if (l !== f.gabarito && f.incorretas[l]?.trim()) incorretas[l] = f.incorretas[l]!.trim()
  const comentarioIA: ComentarioIA | null = f.temComentario
    ? {
        ...(original ?? {}),
        alerta: f.alerta.trim() || null,
        conceito: f.conceito.trim() || null,
        correta: f.correta.trim(),
        incorretas,
        conferido: f.conferido,
        imagens: f.imagensComentario,
      }
    : null
  return {
    prova: f.prova.trim() || null,
    ano: f.ano.trim() ? Number(f.ano) : null,
    anulada: f.anulada,
    enunciado: f.enunciado.trim(),
    imagens: f.imagens,
    alternativas: f.alternativas.map((a) => ({ letra: a.letra, texto: a.texto.trim() })),
    gabarito: f.gabarito || null,
    comentario: f.autor.trim() || null,
    comentarioIA,
  }
}

/**
 * Campo de texto com botões de negrito e destaque. Os marcadores são os mesmos
 * do resto do acervo: **negrito** e ==destaque==; linha com "- " vira lista e
 * linha em branco separa parágrafos.
 */
function CampoTexto({ rotulo, valor, aoMudar, linhas = 3, dica }: { rotulo: string; valor: string; aoMudar: (v: string) => void; linhas?: number; dica?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const marcar = (marca: string) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: ini, selectionEnd: fim } = el
    const trecho = valor.slice(ini, fim) || 'texto'
    const novo = valor.slice(0, ini) + marca + trecho + marca + valor.slice(fim)
    aoMudar(novo)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(ini + marca.length, ini + marca.length + trecho.length) })
  }
  return (
    <div className="campo adm-editor__campo">
      <div className="adm-editor__rotulo">
        <span>{rotulo}</span>
        <span className="adm-editor__ferramentas">
          <button type="button" className="adm-chip" onClick={() => marcar('**')} title="Negrito"><strong>N</strong></button>
          <button type="button" className="adm-chip" onClick={() => marcar('==')} title="Destaque (marca-texto)"><mark>Destaque</mark></button>
        </span>
      </div>
      <textarea ref={ref} className="entrada" rows={linhas} value={valor} onChange={(e) => aoMudar(e.target.value)} />
      {dica && <small className="meta">{dica}</small>}
    </div>
  )
}

/** Maior lado da imagem enviada: nítida na tela e leve para baixar. */
const LADO_MAXIMO = 1800

/**
 * Prepara a foto antes do envio: reduz o tamanho e converte para WebP (ou JPEG).
 * Assim foto de celular (muitas vezes acima de 5 MB, ou em HEIC no iPhone)
 * entra no bucket, que só aceita JPEG, PNG, WebP e GIF de até 5 MB. GIF segue
 * como está para não perder a animação.
 */
async function prepararImagem(arquivo: File): Promise<{ blob: Blob; extensao: string }> {
  if (arquivo.type === 'image/gif') return { blob: arquivo, extensao: 'gif' }
  const endereco = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = endereco
    await img.decode().catch(() => { throw new Error(`Não consegui abrir "${arquivo.name}". Tente salvar como JPG ou PNG.`) })
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight))
    const tela = document.createElement('canvas')
    tela.width = Math.max(1, Math.round(img.naturalWidth * escala))
    tela.height = Math.max(1, Math.round(img.naturalHeight * escala))
    const ctx = tela.getContext('2d')
    if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, tela.width, tela.height)
    ctx.drawImage(img, 0, 0, tela.width, tela.height)
    const gerar = (tipo: string) => new Promise<Blob | null>((ok) => tela.toBlob(ok, tipo, 0.86))
    const webp = await gerar('image/webp')
    if (webp && webp.type === 'image/webp') return { blob: webp, extensao: 'webp' }
    const jpeg = await gerar('image/jpeg')
    if (!jpeg) throw new Error('Seu navegador não conseguiu converter a imagem.')
    return { blob: jpeg, extensao: 'jpg' }
  } finally {
    URL.revokeObjectURL(endereco)
  }
}

function ListaImagens({ imagens, aoMudar, idQuestao, pasta }: { imagens: Imagem[]; aoMudar: (v: Imagem[]) => void; idQuestao: string; pasta: string }) {
  const [enviando, definirEnviando] = useState(false)
  const [erro, definirErro] = useState('')
  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return
    definirEnviando(true); definirErro('')
    try {
      const novas: Imagem[] = []
      for (const arquivo of Array.from(arquivos)) {
        const { blob, extensao } = await prepararImagem(arquivo)
        if (blob.size > 5 * 1024 * 1024) throw new Error(`"${arquivo.name}" passa de 5 MB mesmo depois de reduzida.`)
        const base = arquivo.name.toLowerCase().normalize('NFKD').replace(/\.[^.]*$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'imagem'
        const url = await enviarImagemQuestao(`${idQuestao}/${pasta}/${Date.now()}-${base}.${extensao}`, blob)
        novas.push({ arquivo: url, legenda: null })
      }
      aoMudar([...imagens, ...novas])
    } catch (f) {
      definirErro(f instanceof Error ? f.message : 'Não foi possível enviar a imagem.')
    } finally {
      definirEnviando(false)
    }
  }
  return (
    <div className="adm-editor__imagens">
      {imagens.map((img, i) => (
        <figure key={img.arquivo} className="adm-editor__imagem">
          <img src={urlImagem(img.arquivo)} alt="" />
          <input className="entrada" placeholder="Legenda (opcional)" value={img.legenda ?? ''} onChange={(e) => aoMudar(imagens.map((x, j) => (j === i ? { ...x, legenda: e.target.value || null } : x)))} />
          <div className="linha">
            <button type="button" className="botao botao--fantasma" disabled={i === 0} onClick={() => { const n = [...imagens]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; aoMudar(n) }}>Subir</button>
            <button type="button" className="botao botao--fantasma" onClick={() => aoMudar(imagens.filter((_, j) => j !== i))}>Remover</button>
          </div>
        </figure>
      ))}
      <label className="botao botao--fantasma adm-editor__enviar">
        {enviando ? 'Enviando…' : 'Enviar imagem'}
        <input type="file" accept="image/*" multiple hidden disabled={enviando} onChange={(e) => { void enviar(e.target.files); e.target.value = '' }} />
      </label>
      {erro && <p role="alert" className="adm-alerta">{erro}</p>}
    </div>
  )
}

export function AdminQuestoes({ idInicial }: { idInicial?: string | null }) {
  const { indice } = usarIndice()
  const [tema, definirTema] = useState('')
  const [numero, definirNumero] = useState('')
  const [id, definirId] = useState<string | null>(idInicial ?? null)
  const [questao, definirQuestao] = useState<Questao | null>(null)
  const [comentarioOriginal, definirComentarioOriginal] = useState<ComentarioIA | null>(null)
  const [form, definirForm] = useState<Formulario | null>(null)
  const [editada, definirEditada] = useState(false)
  const [editadas, definirEditadas] = useState<string[]>([])
  const [estado, definirEstado] = useState('')
  const [erro, definirErro] = useState('')
  const [salvando, definirSalvando] = useState(false)
  const [previa, definirPrevia] = useState(false)

  useEffect(() => { if (idInicial) definirId(idInicial) }, [idInicial])
  useEffect(() => { if (indice && !tema && indice.temas[0]) definirTema(indice.temas[0].slug) }, [indice, tema])

  const atualizarListaEditadas = useCallback(async () => {
    esquecerEdicoes()
    const mapa = await carregarEdicoes()
    definirEditadas([...mapa.keys()].sort())
    return mapa
  }, [])
  useEffect(() => { void atualizarListaEditadas() }, [atualizarListaEditadas])

  useEffect(() => {
    if (!id || !indice) return
    let vivo = true
    definirErro(''); definirEstado(''); definirForm(null); definirQuestao(null)
    ;(async () => {
      const mapa = await atualizarListaEditadas()
      recarregarAcervo()
      const [q] = await carregarQuestoes(indice, [id])
      if (!vivo) return
      if (!q) { definirErro(`Questão ${id} não encontrada no acervo.`); return }
      const slug = indice.temas.find((t) => t.nome === q.tema)?.slug ?? id.replace(/-\d+$/, '')
      const c = mapa.get(id)?.comentarioIA !== undefined || q.comentarioIA ? q.comentarioIA ?? null : await carregarComentario(slug, id)
      if (!vivo) return
      definirQuestao(q)
      definirTema(slug)
      definirNumero(String(Number(id.match(/-(\d+)$/)?.[1] ?? '')) || '')
      definirComentarioOriginal(c)
      definirForm(paraFormulario(q, c))
      definirEditada(mapa.has(id))
    })().catch(() => vivo && definirErro('Não foi possível carregar a questão.'))
    return () => { vivo = false }
  }, [id, indice, atualizarListaEditadas])

  function abrirPorNumero() {
    const n = Number(numero)
    if (!tema || !Number.isInteger(n) || n <= 0) return
    definirId(`${tema}-${String(n).padStart(4, '0')}`)
  }

  const mudar = <K extends keyof Formulario>(chave: K, valor: Formulario[K]) => definirForm((f) => (f ? { ...f, [chave]: valor } : f))

  async function salvar() {
    if (!form || !id) return
    if (!form.enunciado.trim()) { definirErro('O enunciado não pode ficar vazio.'); return }
    if (form.alternativas.some((a) => !a.texto.trim())) { definirErro('Preencha o texto de todas as alternativas (ou remova a que sobrou).'); return }
    if (form.ano && !/^\d{4}$/.test(form.ano.trim())) { definirErro('Ano com 4 dígitos, ou deixe em branco.'); return }
    definirSalvando(true); definirErro('')
    try {
      const quando = await chamarRpc<string>('salvar_edicao_questao', { p_id: id, p_dados: paraEdicao(form, comentarioOriginal) })
      await atualizarListaEditadas()
      recarregarAcervo()
      definirEditada(true)
      definirEstado(`Salvo em ${dataHora(quando)}. Já vale no site para quem abrir a questão.`)
    } catch (f) {
      definirErro(erroDoPainel(f, MIGRACAO))
    } finally {
      definirSalvando(false)
    }
  }

  async function desfazer() {
    if (!id || !window.confirm('Desfazer todas as edições desta questão? Ela volta a ser exatamente a do acervo.')) return
    try {
      await chamarRpc('remover_edicao_questao', { p_id: id })
      await atualizarListaEditadas()
      recarregarAcervo()
      const atual = id
      definirId(null)
      setTimeout(() => definirId(atual), 0)
    } catch (f) {
      definirErro(erroDoPainel(f, MIGRACAO))
    }
  }

  const letrasUsadas = form?.alternativas.map((a) => a.letra) ?? []

  return (
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-questoes">
      <div className="adm-secao__cabeca"><div>
        <h2 id="adm-titulo-questoes">Editar questões</h2>
        <p>Corrija enunciado, alternativas, gabarito, prova, imagens e comentário. A edição vale na hora no site, por cima do acervo, e pode ser desfeita.</p>
      </div></div>

      <div className="adm-editor__busca">
        <label className="campo">Tema
          <select className="entrada" value={tema} onChange={(e) => definirTema(e.target.value)}>
            {indice?.temas.map((t) => <option key={t.slug} value={t.slug}>{t.nome}</option>)}
          </select>
        </label>
        <label className="campo">Número da questão
          <input className="entrada" inputMode="numeric" value={numero} onChange={(e) => definirNumero(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') abrirPorNumero() }} placeholder="Ex.: 44" />
        </label>
        <button type="button" className="botao botao--principal" onClick={abrirPorNumero}>Abrir</button>
      </div>

      {editadas.length > 0 && (
        <details className="adm-editor__editadas">
          <summary>{editadas.length} questão(ões) já editada(s)</summary>
          <div className="linha">{editadas.map((e) => <button key={e} type="button" className="adm-chip" onClick={() => definirId(e)}>{e}</button>)}</div>
        </details>
      )}

      {erro && <p role="alert" className="adm-alerta">{erro}</p>}
      {id && !form && !erro && <p role="status">Carregando {id}…</p>}

      {form && questao && id && (
        <div className="empilha adm-editor">
          <div className="adm-editor__cabeca">
            <div>
              <strong>{questao.tema} · {id}</strong>
              {editada && <span className="adm-selo adm-selo--neutro">editada</span>}
            </div>
            <a className="botao botao--fantasma" href={href(`/questao/${id}`)} target="_blank" rel="noopener noreferrer">Ver no site</a>
          </div>

          <div className="adm-editor__linha">
            <label className="campo">Prova
              <input className="entrada" list="adm-provas" value={form.prova} onChange={(e) => mudar('prova', e.target.value)} placeholder="TEOT, TARO…" />
              <datalist id="adm-provas">{indice?.provas.map((p) => <option key={p} value={p} />)}</datalist>
            </label>
            <label className="campo">Ano
              <input className="entrada" inputMode="numeric" value={form.ano} onChange={(e) => mudar('ano', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="2024" />
            </label>
            <label className="campo campo--checkbox"><input type="checkbox" checked={form.anulada} onChange={(e) => mudar('anulada', e.target.checked)} /> Questão anulada</label>
          </div>

          <CampoTexto rotulo="Enunciado" linhas={5} valor={form.enunciado} aoMudar={(v) => mudar('enunciado', v)} />
          <div className="campo"><span>Imagens do enunciado</span>
            <ListaImagens imagens={form.imagens} aoMudar={(v) => mudar('imagens', v)} idQuestao={id} pasta="enunciado" />
          </div>

          <fieldset className="adm-editor__grupo">
            <legend>Alternativas e gabarito</legend>
            {form.alternativas.map((a, i) => (
              <div key={a.letra} className="adm-editor__alternativa">
                <label className="adm-editor__gabarito" title="Marcar como correta">
                  <input type="radio" name="gabarito" checked={form.gabarito === a.letra} onChange={() => mudar('gabarito', a.letra)} /> {a.letra}
                </label>
                <textarea className="entrada" rows={2} value={a.texto} onChange={(e) => mudar('alternativas', form.alternativas.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))} />
              </div>
            ))}
            <div className="linha">
              {form.alternativas.length < 5 && <button type="button" className="botao botao--fantasma" onClick={() => mudar('alternativas', [...form.alternativas, { letra: LETRAS[form.alternativas.length], texto: '' }])}>Adicionar alternativa {LETRAS[form.alternativas.length]}</button>}
              {form.alternativas.length > 2 && <button type="button" className="botao botao--fantasma" onClick={() => { const ultima = form.alternativas[form.alternativas.length - 1].letra; definirForm({ ...form, alternativas: form.alternativas.slice(0, -1), gabarito: form.gabarito === ultima ? '' : form.gabarito }) }}>Remover a última</button>}
              <label className="campo campo--checkbox"><input type="radio" name="gabarito" checked={form.gabarito === ''} onChange={() => mudar('gabarito', '')} /> Sem gabarito oficial</label>
            </div>
          </fieldset>

          <fieldset className="adm-editor__grupo">
            <legend>Comentário</legend>
            <label className="campo campo--checkbox"><input type="checkbox" checked={form.temComentario} onChange={(e) => mudar('temComentario', e.target.checked)} /> Esta questão tem comentário</label>
            {form.temComentario && <>
              <CampoTexto rotulo="Alerta sobre o gabarito (opcional)" linhas={2} valor={form.alerta} aoMudar={(v) => mudar('alerta', v)} dica="Aparece em destaque antes de tudo. Deixe vazio se o gabarito está certo." />
              <CampoTexto rotulo="Conceito-chave" linhas={8} valor={form.conceito} aoMudar={(v) => mudar('conceito', v)} dica="**negrito**, ==destaque==, linha começando com '- ' vira lista, linha em branco separa parágrafos." />
              <div className="campo"><span>Imagens do comentário</span>
                <ListaImagens imagens={form.imagensComentario} aoMudar={(v) => mudar('imagensComentario', v)} idQuestao={id} pasta="comentario" />
              </div>
              <CampoTexto rotulo={`Por que a correta${form.gabarito ? ` (${form.gabarito})` : ''} está certa`} linhas={3} valor={form.correta} aoMudar={(v) => mudar('correta', v)} />
              {letrasUsadas.filter((l) => l !== form.gabarito).map((l) => (
                <CampoTexto key={l} rotulo={`Por que a ${l} está errada`} linhas={2} valor={form.incorretas[l] ?? ''} aoMudar={(v) => mudar('incorretas', { ...form.incorretas, [l]: v })} />
              ))}
              <label className="campo campo--checkbox"><input type="checkbox" checked={form.conferido} onChange={(e) => mudar('conferido', e.target.checked)} /> Comentário conferido por médico</label>
            </>}
            <CampoTexto rotulo="Comentário do autor (opcional, aparece à parte)" linhas={3} valor={form.autor} aoMudar={(v) => mudar('autor', v)} />
          </fieldset>

          <div className="linha adm-editor__acoes">
            <button type="button" className="botao botao--principal" disabled={salvando} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Salvar edição'}</button>
            <button type="button" className="botao botao--fantasma" onClick={() => definirPrevia(!previa)}>{previa ? 'Esconder prévia' : 'Prévia do texto'}</button>
            {editada && <button type="button" className="botao botao--fantasma" onClick={() => void desfazer()}>Desfazer edições</button>}
          </div>
          {estado && <p role="status" className="adm-nota">{estado}</p>}

          {previa && (
            <div className="adm-editor__previa">
              <TextoEditorial texto={form.enunciado} />
              <ol type="A">{form.alternativas.map((a) => <li key={a.letra}><strong>{a.letra === form.gabarito ? `${a.texto} (correta)` : a.texto}</strong></li>)}</ol>
              {form.temComentario && <>
                {form.alerta && <p className="aviso-ia aviso-ia--gabarito">{form.alerta}</p>}
                {form.conceito && <TextoEditorial texto={form.conceito} />}
                {form.correta && <TextoEditorial texto={form.correta} />}
              </>}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
