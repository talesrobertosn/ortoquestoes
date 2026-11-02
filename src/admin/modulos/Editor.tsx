import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { carregarQuestoes, recarregarAcervo } from '../../dados/acervo'
import { carregarComentario } from '../../dados/comentarios'
import { carregarEdicoes, esquecerEdicoes, foraDoSite, urlImagem, type EdicaoQuestao } from '../../dados/edicoes'
import type { ComentarioIA, Imagem, Letra, Questao } from '../../dados/tipos'
import { usarIndice } from '../../dados/usarIndice'
import { chamarRpc, enviarImagemQuestao } from '../../servicos/supabase'
import { href } from '../../util/rotas'
import { TextoEditorial } from '../../componentes/TextoEditorial'
import { erroDoPainel } from '../../componentes/admin/formatos'
import { usarNav } from '../nav'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { dataHora } from '../ui/formato'
import { Cabeca, Estado, Faixa, Interruptor, Selo } from '../ui/kit'
import { avisoRapido, confirmar } from '../ui/sobreposicoes'

const MIGRACAO = '202610050100_editor_questoes.sql'
const LETRAS: Letra[] = ['A', 'B', 'C', 'D', 'E']

interface Formulario {
  prova: string; ano: string; anulada: boolean; enunciado: string; imagens: Imagem[]
  dissertativa: boolean; respostaEsperada: string; alternativas: Array<{ letra: Letra; texto: string }>; gabarito: Letra | ''
  autor: string; temComentario: boolean; alerta: string; conceito: string; correta: string
  incorretas: Partial<Record<Letra, string>>; conferido: boolean; imagensComentario: Imagem[]
}

function paraFormulario(q: Questao, c: ComentarioIA | null): Formulario {
  return {
    prova: q.prova ?? '', ano: q.ano ? String(q.ano) : '', anulada: q.anulada, enunciado: q.enunciado, imagens: q.imagens ?? [],
    dissertativa: q.tipo === 'dissertativa', respostaEsperada: q.respostaEsperada ?? '',
    alternativas: q.alternativas.map(a => ({ letra: a.letra, texto: a.texto })),
    // A resposta pela bibliografia não é gabarito oficial: o formulário mostra o oficial (vazio).
    gabarito: q.gabaritoBibliografia ? '' : q.gabarito ?? '',
    autor: q.comentario ?? '', temComentario: !!c, alerta: c?.alerta ?? '', conceito: c?.conceito ?? '', correta: c?.correta ?? '',
    incorretas: { ...(c?.incorretas ?? {}) }, conferido: !!c?.conferido, imagensComentario: c?.imagens ?? [],
  }
}

function paraEdicao(f: Formulario, original: ComentarioIA | null): EdicaoQuestao {
  const incorretas: Partial<Record<Letra, string>> = {}
  for (const l of f.alternativas.map(a => a.letra)) if (l !== f.gabarito && f.incorretas[l]?.trim()) incorretas[l] = f.incorretas[l]!.trim()
  const comentarioIA: ComentarioIA | null = f.temComentario
    ? { ...(original ?? {}), alerta: f.alerta.trim() || null, conceito: f.conceito.trim() || null, correta: f.correta.trim(), incorretas, conferido: f.conferido, imagens: f.imagensComentario }
    : null
  return {
    prova: f.prova.trim() || null, ano: f.ano.trim() ? Number(f.ano) : null, anulada: f.anulada, enunciado: f.enunciado.trim(), imagens: f.imagens,
    tipo: f.dissertativa ? 'dissertativa' : null, respostaEsperada: f.dissertativa ? f.respostaEsperada.trim() || null : null,
    alternativas: f.dissertativa ? [] : f.alternativas.map(a => ({ letra: a.letra, texto: a.texto.trim() })),
    gabarito: f.dissertativa ? null : f.gabarito || null, comentario: f.autor.trim() || null, comentarioIA,
  }
}

/** Texto com negrito (**) e destaque (==), os mesmos marcadores do acervo. */
function CampoTexto({ rotulo, valor, aoMudar, linhas = 3, dica }: { rotulo: string; valor: string; aoMudar: (v: string) => void; linhas?: number; dica?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const marcar = (marca: string) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: ini, selectionEnd: fim } = el
    const trecho = valor.slice(ini, fim) || 'texto'
    aoMudar(valor.slice(0, ini) + marca + trecho + marca + valor.slice(fim))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(ini + marca.length, ini + marca.length + trecho.length) })
  }
  return <div className="a3-campo a3-texto-rico">
    <div className="a3-texto-rico__barra"><span>{rotulo}</span>
      <span className="a3-texto-rico__ferramentas">
        <button type="button" onClick={() => marcar('**')} title="Negrito (**texto**)" aria-label={`Negrito em ${rotulo}`}><b>N</b></button>
        <button type="button" onClick={() => marcar('==')} title="Destaque (==texto==)" aria-label={`Destaque em ${rotulo}`}><mark>D</mark></button>
      </span></div>
    <textarea ref={ref} className="a3-entrada" rows={linhas} value={valor} onChange={e => aoMudar(e.target.value)} aria-label={rotulo} />
    {dica && <small>{dica}</small>}
  </div>
}

const LADO_MAXIMO = 1800
/** Reduz e converte para WebP (ou JPEG) antes do envio; GIF segue como está. */
async function prepararImagem(arquivo: File): Promise<{ blob: Blob; extensao: string }> {
  if (arquivo.type === 'image/gif') return { blob: arquivo, extensao: 'gif' }
  const endereco = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = endereco
    await img.decode().catch(() => { throw new Error(`Não consegui abrir "${arquivo.name}". Tente salvar como JPG ou PNG.`) })
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight))
    const tela = document.createElement('canvas')
    tela.width = Math.max(1, Math.round(img.naturalWidth * escala)); tela.height = Math.max(1, Math.round(img.naturalHeight * escala))
    const ctx = tela.getContext('2d')
    if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, tela.width, tela.height); ctx.drawImage(img, 0, 0, tela.width, tela.height)
    const gerar = (tipo: string) => new Promise<Blob | null>(ok => tela.toBlob(ok, tipo, 0.86))
    const webp = await gerar('image/webp')
    if (webp && webp.type === 'image/webp') return { blob: webp, extensao: 'webp' }
    const jpeg = await gerar('image/jpeg')
    if (!jpeg) throw new Error('Seu navegador não conseguiu converter a imagem.')
    return { blob: jpeg, extensao: 'jpg' }
  } finally { URL.revokeObjectURL(endereco) }
}

function Imagens({ imagens, aoMudar, idQuestao, pasta }: { imagens: Imagem[]; aoMudar: (v: Imagem[]) => void; idQuestao: string; pasta: string }) {
  const [enviando, definirEnviando] = useState(false)
  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return
    definirEnviando(true)
    try {
      const novas: Imagem[] = []
      for (const arquivo of Array.from(arquivos)) {
        const { blob, extensao } = await prepararImagem(arquivo)
        if (blob.size > 5 * 1024 * 1024) throw new Error(`"${arquivo.name}" passa de 5 MB mesmo depois de reduzida.`)
        const base = arquivo.name.toLowerCase().normalize('NFKD').replace(/\.[^.]*$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'imagem'
        novas.push({ arquivo: await enviarImagemQuestao(`${idQuestao}/${pasta}/${Date.now()}-${base}.${extensao}`, blob), legenda: null })
      }
      aoMudar([...imagens, ...novas])
      avisoRapido(novas.length === 1 ? 'Imagem enviada. Salve a edição para valer no site.' : `${novas.length} imagens enviadas. Salve a edição para valer no site.`)
    } catch (f) { avisoRapido(f instanceof Error ? f.message : 'Não foi possível enviar a imagem.', 'erro') } finally { definirEnviando(false) }
  }
  return <div className="a3-galeria">
    {imagens.map((img, i) => <figure key={img.arquivo} className="a3-galeria__item">
      <img src={urlImagem(img.arquivo)} alt={img.legenda ?? ''} loading="lazy" />
      <input className="a3-entrada" placeholder="Legenda (opcional)" aria-label="Legenda" value={img.legenda ?? ''} onChange={e => aoMudar(imagens.map((x, j) => j === i ? { ...x, legenda: e.target.value || null } : x))} />
      <textarea className="a3-entrada" rows={2} placeholder="Fonte ou créditos, com o link (opcional)" aria-label="Fonte" value={img.fonte ?? ''} onChange={e => aoMudar(imagens.map((x, j) => j === i ? { ...x, fonte: e.target.value || null } : x))} />
      <div className="a3-acoes-linha">
        <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" disabled={i === 0} onClick={() => { const n = [...imagens]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; aoMudar(n) }}><Icone nome="cima" tamanho={14} />Subir</button>
        <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => aoMudar(imagens.filter((_, j) => j !== i))}><Icone nome="lixeira" tamanho={14} />Tirar</button>
      </div>
    </figure>)}
    <label className={'a3-galeria__enviar' + (enviando ? ' ocupado' : '')}>
      <Icone nome="mais" tamanho={20} /><span>{enviando ? 'Enviando…' : 'Enviar imagem'}</span><small>reduzida e convertida antes de subir</small>
      <input type="file" accept="image/*" multiple className="a3-so-leitor" disabled={enviando} onChange={e => { void enviar(e.target.files); e.target.value = '' }} />
    </label>
  </div>
}

/** Estudo › Editor de questões: abrir, corrigir, conferir na prévia ao lado e salvar por cima do acervo. */
export default function Editor() {
  const { indice } = usarIndice()
  const nav = usarNav()
  const id = nav.estado.id
  const parte = defParte('questoes')
  const [tema, definirTema] = useState('')
  const [numero, definirNumero] = useState('')
  const [questao, definirQuestao] = useState<Questao | null>(null)
  const [comentarioOriginal, definirComentarioOriginal] = useState<ComentarioIA | null>(null)
  const [form, definirForm] = useState<Formulario | null>(null)
  const [inicial, definirInicial] = useState('')
  const [editada, definirEditada] = useState(false)
  const [salva, definirSalva] = useState<EdicaoQuestao | null>(null)
  const [editadas, definirEditadas] = useState<string[]>([])
  const [fora, definirFora] = useState<Array<{ id: string; apagada: boolean }>>([])
  const [erro, definirErro] = useState('')
  const [salvoEm, definirSalvoEm] = useState<string | null>(null)
  const [salvando, definirSalvando] = useState(false)
  const [recarga, definirRecarga] = useState(0)
  const abrir = (novo: string) => nav.ajustar({ id: novo })
  useEffect(() => { if (indice && !tema && indice.temas[0]) definirTema(indice.temas[0].slug) }, [indice, tema])

  const atualizarLista = useCallback(async () => {
    esquecerEdicoes()
    const mapa = await carregarEdicoes()
    definirEditadas([...mapa.keys()].filter(k => !foraDoSite(mapa.get(k))).sort())
    definirFora([...mapa].filter(([, e]) => foraDoSite(e)).map(([k, e]) => ({ id: k, apagada: !!e.apagada })).sort((a, b) => a.id.localeCompare(b.id)))
    return mapa
  }, [])
  useEffect(() => { void atualizarLista().catch(() => undefined) }, [atualizarLista])

  useEffect(() => {
    if (!id || !indice) return
    let vivo = true
    definirErro(''); definirForm(null); definirQuestao(null); definirSalvoEm(null)
    ;(async () => {
      const mapa = await atualizarLista()
      recarregarAcervo()
      const [q] = await carregarQuestoes(indice, [id], { incluirOcultas: true })
      if (!vivo) return
      if (!q) { definirErro(`A questão ${id} não está no acervo. Confira o tema e o número.`); return }
      const slug = indice.temas.find(t => t.nome === q.tema)?.slug ?? id.replace(/-\d+$/, '')
      const c = mapa.get(id)?.comentarioIA !== undefined || q.comentarioIA ? q.comentarioIA ?? null : await carregarComentario(slug, id)
      if (!vivo) return
      const f = paraFormulario(q, c)
      definirQuestao(q); definirTema(slug); definirNumero(String(Number(id.match(/-(\d+)$/)?.[1] ?? '')) || '')
      definirComentarioOriginal(c); definirForm(f); definirInicial(JSON.stringify(f)); definirEditada(mapa.has(id)); definirSalva(mapa.get(id) ?? null)
    })().catch(() => vivo && definirErro('Não foi possível carregar a questão. Tente de novo em instantes.'))
    return () => { vivo = false }
  }, [id, indice, atualizarLista, recarga])

  const sujo = !!form && JSON.stringify(form) !== inicial
  // Sair com alteração não salva pede confirmação do navegador.
  useEffect(() => {
    if (!sujo) return
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [sujo])

  async function abrirPorNumero() {
    const n = Number(numero)
    if (!tema || !Number.isInteger(n) || n <= 0) return
    if (sujo && !(await confirmar({ titulo: 'Abrir outra questão sem salvar?', texto: 'As alterações desta questão se perdem.', sim: 'Abrir sem salvar', perigo: true }))) return
    abrir(`${tema}-${String(n).padStart(4, '0')}`)
  }
  async function trocarPara(novo: string) {
    if (sujo && !(await confirmar({ titulo: 'Abrir outra questão sem salvar?', texto: 'As alterações desta questão se perdem.', sim: 'Abrir sem salvar', perigo: true }))) return
    abrir(novo)
  }
  const mudar = <K extends keyof Formulario>(chave: K, valor: Formulario[K]) => definirForm(f => f ? { ...f, [chave]: valor } : f)

  const problemas = useMemo(() => {
    if (!form) return []
    const p: string[] = []
    if (!form.enunciado.trim()) p.push('O enunciado não pode ficar vazio.')
    if (!form.dissertativa && form.alternativas.some(a => !a.texto.trim())) p.push('Preencha o texto de todas as alternativas (ou remova a que sobrou).')
    if (form.ano && !/^\d{4}$/.test(form.ano.trim())) p.push('Ano com 4 dígitos, ou deixe em branco.')
    return p
  }, [form])

  async function salvar() {
    if (!form || !id || problemas.length) return
    definirSalvando(true); definirErro('')
    try {
      const dados = { ...paraEdicao(form, comentarioOriginal), ...(salva?.oculta ? { oculta: true } : {}), ...(salva?.apagada ? { apagada: true } : {}) }
      const quando = await chamarRpc<string>('salvar_edicao_questao', { p_id: id, p_dados: dados })
      definirSalva(dados); await atualizarLista(); recarregarAcervo(); definirEditada(true); definirInicial(JSON.stringify(form)); definirSalvoEm(quando)
      avisoRapido(`Salvo às ${dataHora(quando).slice(-5)}. Já vale no site para quem abrir a questão.`)
    } catch (f) { avisoRapido(erroDoPainel(f, MIGRACAO), 'erro') } finally { definirSalvando(false) }
  }
  async function desfazer() {
    if (!id || !(await confirmar({ titulo: 'Desfazer todas as edições desta questão?', texto: 'Ela volta a ser exatamente a do acervo.', sim: 'Desfazer edições', perigo: true }))) return
    try { await chamarRpc('remover_edicao_questao', { p_id: id }); await atualizarLista(); recarregarAcervo(); definirRecarga(n => n + 1); avisoRapido('Edições desfeitas: a questão voltou a ser a do acervo.') }
    catch (f) { avisoRapido(erroDoPainel(f, MIGRACAO), 'erro') }
  }
  /** Esconder, apagar ou devolver ao site; a marcação vai junto da edição gravada. */
  async function mudarPresenca(acao: 'esconder' | 'apagar' | 'mostrar') {
    if (!id) return
    if (acao === 'esconder' && !(await confirmar({ titulo: `Esconder ${id} do site?`, texto: 'Ela sai do treino, dos simulados e das contagens, e o link deixa de abrir. Dá para mostrar de novo depois.', sim: 'Esconder' }))) return
    if (acao === 'apagar' && !(await confirmar({ titulo: `Apagar ${id}?`, texto: 'Ela some do site agora e sai dos arquivos do acervo na próxima limpeza. Até lá, ainda dá para desfazer aqui.', sim: 'Apagar', perigo: true }))) return
    const { oculta: _o, apagada: _a, ...resto } = salva ?? {}
    const dados: EdicaoQuestao = acao === 'mostrar' ? resto : { ...resto, oculta: true, ...(acao === 'apagar' ? { apagada: true } : {}) }
    definirSalvando(true)
    try {
      if (Object.keys(dados).length) { await chamarRpc<string>('salvar_edicao_questao', { p_id: id, p_dados: dados }); definirSalva(dados) }
      else { await chamarRpc('remover_edicao_questao', { p_id: id }); definirSalva(null); definirEditada(false) }
      await atualizarLista(); recarregarAcervo()
      avisoRapido(acao === 'mostrar' ? 'A questão voltou ao site.' : acao === 'apagar' ? 'Questão apagada: já não aparece no site.' : 'Questão escondida: já não aparece no site.')
    } catch (f) { avisoRapido(erroDoPainel(f, MIGRACAO), 'erro') } finally { definirSalvando(false) }
  }

  const letrasUsadas = form && !form.dissertativa ? form.alternativas.map(a => a.letra) : []
  const temaAtual = indice?.temas.find(t => t.slug === tema)

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Conteúdo" titulo={parte.rotulo} pergunta={`${parte.pergunta} A edição vale na hora no site, por cima do acervo, e pode ser desfeita.`} />
    <div className="a3-editor">
      <aside className="a3-editor__lado" aria-label="Escolher questão">
        <form className="a3-painel a3-editor__abrir" onSubmit={e => { e.preventDefault(); void abrirPorNumero() }}>
          <label className="a3-campo"><span>Tema</span>
            <select className="a3-entrada" value={tema} onChange={e => definirTema(e.target.value)}>{indice?.temas.map(t => <option key={t.slug} value={t.slug}>{t.nome}</option>)}</select></label>
          <div className="a3-editor__numero">
            <label className="a3-campo"><span>Número</span><input className="a3-entrada num" inputMode="numeric" value={numero} onChange={e => definirNumero(e.target.value.replace(/\D/g, ''))} placeholder="44" /></label>
            <button type="submit" className="a3-botao">Abrir</button>
          </div>
          {temaAtual && <small className="a3-mudo">{tema}-{numero ? String(Number(numero)).padStart(4, '0') : '0000'}</small>}
        </form>
        {editadas.length > 0 && <details className="a3-painel a3-editor__lista" open={!id}>
          <summary>Já editadas <Selo>{editadas.length}</Selo></summary>
          <ul>{editadas.map(e => <li key={e}><button type="button" aria-current={e === id ? 'true' : undefined} onClick={() => void trocarPara(e)}>{e}</button></li>)}</ul>
        </details>}
        {fora.length > 0 && <details className="a3-painel a3-editor__lista">
          <summary>Fora do site <Selo tom="erro">{fora.length}</Selo></summary>
          <ul>{fora.map(f => <li key={f.id}><button type="button" aria-current={f.id === id ? 'true' : undefined} onClick={() => void trocarPara(f.id)}>{f.id}<small>{f.apagada ? 'apagada' : 'escondida'}</small></button></li>)}</ul>
        </details>}
      </aside>

      <div className="a3-editor__centro">
        {erro && <Faixa tom="erro" titulo="Não deu para abrir">{erro}</Faixa>}
        {!id && !erro && <div className="a3-painel" style={{ padding: 32 }}><Estado icone="lapis" titulo="Escolha uma questão" texto="Pelo tema e o número, pela lista das já editadas, ou pelo botão Editar na Qualidade do acervo e na busca (Ctrl K)." /></div>}
        {id && !form && !erro && <div className="a3-painel" style={{ padding: 32 }}><Estado icone="relogio" titulo={`Abrindo ${id}…`} /></div>}
        {form && questao && id && <>
          <section className="a3-painel a3-editor__topo">
            <div style={{ minWidth: 0 }}>
              <span className="a3-rotulo">{questao.tema}</span>
              <h2 className="a3-titulo-2">{id}</h2>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {editada && <Selo contorno>editada</Selo>}{salva?.apagada ? <Selo tom="erro">apagada</Selo> : salva?.oculta ? <Selo tom="erro">escondida</Selo> : null}{form.anulada && <Selo tom="aviso">anulada</Selo>}
              </div>
            </div>
            <a className="a3-botao a3-botao--contorno" href={href(`/questao/${id}`)} target="_blank" rel="noopener noreferrer"><Icone nome="externo" tamanho={15} />Ver no site</a>
          </section>

          <section className="a3-painel a3-editor__bloco" aria-labelledby="ed-prova">
            <h3 id="ed-prova" className="a3-editor__titulo"><span>1</span>Prova</h3>
            <div className="a3-editor__linha">
              <label className="a3-campo"><span>Prova</span><input className="a3-entrada" list="a3-provas" value={form.prova} onChange={e => mudar('prova', e.target.value)} placeholder="TEOT, TARO…" />
                <datalist id="a3-provas">{indice?.provas.map(p => <option key={p} value={p} />)}</datalist></label>
              <label className="a3-campo"><span>Ano</span><input className="a3-entrada num" inputMode="numeric" value={form.ano} onChange={e => mudar('ano', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="2024" /></label>
            </div>
            <Interruptor marcado={form.anulada} aoMudar={v => mudar('anulada', v)} titulo="Questão anulada" descricao="Continua no site com o aviso de anulada." />
          </section>

          <section className="a3-painel a3-editor__bloco" aria-labelledby="ed-enunciado">
            <h3 id="ed-enunciado" className="a3-editor__titulo"><span>2</span>Enunciado</h3>
            <CampoTexto rotulo="Enunciado" linhas={6} valor={form.enunciado} aoMudar={v => mudar('enunciado', v)} />
            <div className="a3-campo"><span>Imagens do enunciado</span><Imagens imagens={form.imagens} aoMudar={v => mudar('imagens', v)} idQuestao={id} pasta="enunciado" /></div>
          </section>

          <section className="a3-painel a3-editor__bloco" aria-labelledby="ed-resposta">
            <h3 id="ed-resposta" className="a3-editor__titulo"><span>3</span>{form.dissertativa ? 'Resposta esperada' : 'Alternativas e gabarito'}</h3>
            <Interruptor marcado={form.dissertativa} aoMudar={v => mudar('dissertativa', v)} titulo="Questão dissertativa" descricao="Sem alternativas: a pessoa escreve e se autoavalia." />
            {form.dissertativa ? <CampoTexto rotulo="Resposta esperada (espelho da banca)" linhas={5} valor={form.respostaEsperada} aoMudar={v => mudar('respostaEsperada', v)} dica="Aparece depois que a pessoa escreve a resposta dela." /> : <>
              <div className="a3-alternativas" role="radiogroup" aria-label="Gabarito oficial">
                {form.alternativas.map((a, i) => <div key={a.letra} className={'a3-alternativa' + (form.gabarito === a.letra ? ' correta' : '')}>
                  <label className="a3-alternativa__letra" title="Marcar como correta"><input type="radio" name="a3-gabarito" checked={form.gabarito === a.letra} onChange={() => mudar('gabarito', a.letra)} /><span>{a.letra}</span></label>
                  <textarea className="a3-entrada" rows={2} aria-label={`Texto da alternativa ${a.letra}`} value={a.texto} onChange={e => mudar('alternativas', form.alternativas.map((x, j) => j === i ? { ...x, texto: e.target.value } : x))} />
                </div>)}
              </div>
              <div className="a3-acoes-linha">
                {form.alternativas.length < 5 && <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => mudar('alternativas', [...form.alternativas, { letra: LETRAS[form.alternativas.length], texto: '' }])}><Icone nome="mais" tamanho={14} />Alternativa {LETRAS[form.alternativas.length]}</button>}
                {form.alternativas.length > 2 && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => { const ultima = form.alternativas[form.alternativas.length - 1].letra; definirForm({ ...form, alternativas: form.alternativas.slice(0, -1), gabarito: form.gabarito === ultima ? '' : form.gabarito }) }}>Remover a {form.alternativas[form.alternativas.length - 1].letra}</button>}
                <label className="a3-filtro"><input type="radio" name="a3-gabarito" checked={form.gabarito === ''} onChange={() => mudar('gabarito', '')} />Sem gabarito oficial</label>
              </div>
            </>}
          </section>

          <section className="a3-painel a3-editor__bloco" aria-labelledby="ed-comentario">
            <h3 id="ed-comentario" className="a3-editor__titulo"><span>4</span>Comentário</h3>
            <Interruptor marcado={form.temComentario} aoMudar={v => mudar('temComentario', v)} titulo="Esta questão tem comentário" />
            {form.temComentario && <>
              <CampoTexto rotulo="Alerta sobre o gabarito (opcional)" linhas={2} valor={form.alerta} aoMudar={v => mudar('alerta', v)} dica="Aparece em destaque antes de tudo. Deixe vazio se o gabarito está certo." />
              <CampoTexto rotulo="Conceito-chave" linhas={8} valor={form.conceito} aoMudar={v => mudar('conceito', v)} dica="**negrito**, ==destaque==, linha começando com '- ' vira lista, linha em branco separa parágrafos." />
              <div className="a3-campo"><span>Imagens do comentário</span><Imagens imagens={form.imagensComentario} aoMudar={v => mudar('imagensComentario', v)} idQuestao={id} pasta="comentario" /></div>
              <CampoTexto rotulo={form.dissertativa ? 'Resposta comentada' : `Por que a correta${form.gabarito ? ` (${form.gabarito})` : ''} está certa`} linhas={3} valor={form.correta} aoMudar={v => mudar('correta', v)} />
              {letrasUsadas.filter(l => l !== form.gabarito).map(l => <CampoTexto key={l} rotulo={`Por que a ${l} está errada`} linhas={2} valor={form.incorretas[l] ?? ''} aoMudar={v => mudar('incorretas', { ...form.incorretas, [l]: v })} />)}
              <Interruptor marcado={form.conferido} aoMudar={v => mudar('conferido', v)} titulo="Comentário conferido por médico" />
            </>}
            <CampoTexto rotulo="Comentário do autor (opcional, aparece à parte)" linhas={3} valor={form.autor} aoMudar={v => mudar('autor', v)} />
          </section>

          <section className="a3-painel a3-editor__bloco a3-editor__perigo" aria-labelledby="ed-presenca">
            <h3 id="ed-presenca" className="a3-editor__titulo"><span>5</span>Presença no site</h3>
            {foraDoSite(salva ?? undefined) ? <>
              <p className="a3-mudo">{salva?.apagada ? 'Apagada: não aparece no site e sai dos arquivos do acervo na próxima limpeza.' : 'Escondida: não aparece no site, nem no treino, nem nas contagens.'}</p>
              <div className="a3-acoes-linha"><button type="button" className="a3-botao a3-botao--contorno" disabled={salvando} onClick={() => void mudarPresenca('mostrar')}><Icone nome="olho" tamanho={15} />Mostrar de novo no site</button></div>
            </> : <>
              <p className="a3-mudo">Esconder é reversível. Apagar também some na hora e marca a questão para sair do acervo.</p>
              <div className="a3-acoes-linha">
                <button type="button" className="a3-botao a3-botao--contorno" disabled={salvando} onClick={() => void mudarPresenca('esconder')}>Esconder do site</button>
                <button type="button" className="a3-botao a3-botao--perigo" disabled={salvando} onClick={() => void mudarPresenca('apagar')}><Icone nome="lixeira" tamanho={15} />Apagar questão</button>
              </div>
            </>}
          </section>

          <div className="a3-editor__salvar" role="region" aria-label="Salvar">
            <span className="a3-editor__estado" aria-live="polite">{problemas[0] ? <><i className="a3-ponto a3-ponto--erro" />{problemas[0]}</> : sujo ? <><i className="a3-ponto a3-ponto--aviso" />Alterações não salvas</> : salvoEm ? <><i className="a3-ponto a3-ponto--ok" />Salvo em {dataHora(salvoEm)}</> : <><i className="a3-ponto" />Sem alterações</>}</span>
            <span className="a3-acoes-linha">
              {editada && <button type="button" className="a3-botao a3-botao--fantasma" onClick={() => void desfazer()}>Desfazer edições</button>}
              {sujo && <button type="button" className="a3-botao a3-botao--contorno" onClick={() => definirForm(JSON.parse(inicial) as Formulario)}>Descartar</button>}
              <button type="button" className="a3-botao" disabled={salvando || !sujo || problemas.length > 0} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Salvar edição'}</button>
            </span>
          </div>
        </>}
      </div>

      {form && questao && <aside className="a3-editor__previa" aria-label="Prévia como a pessoa vê">
        <div className="a3-painel">
          <div className="a3-painel__cabeca"><h3 className="a3-titulo-3">Prévia</h3><span className="a3-mudo a3-pequeno">atualiza enquanto você digita</span></div>
          <div className="a3-previa-questao">
            <span className="a3-rotulo">{[form.prova, form.ano].filter(Boolean).join(' ') || 'Sem prova'}{form.anulada ? ' · anulada' : ''}</span>
            <TextoEditorial texto={form.enunciado || '(enunciado vazio)'} />
            {form.imagens.map(img => <img key={img.arquivo} src={urlImagem(img.arquivo)} alt={img.legenda ?? ''} />)}
            {!form.dissertativa && <ol className="a3-previa-questao__alts">{form.alternativas.map(a => <li key={a.letra} className={a.letra === form.gabarito ? 'correta' : undefined}><b>{a.letra}</b><span>{a.texto || '(vazia)'}</span></li>)}</ol>}
            {form.temComentario && <div className="a3-previa-questao__comentario">
              {form.alerta && <p className="a3-faixa a3-faixa--aviso">{form.alerta}</p>}
              {form.conceito && <TextoEditorial texto={form.conceito} />}
              {form.correta && <TextoEditorial texto={form.correta} />}
            </div>}
          </div>
        </div>
      </aside>}
    </div>
  </div>
}
