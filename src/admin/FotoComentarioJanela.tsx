import { useEffect, useMemo, useRef, useState } from 'react'
import { JanelaCentral } from '../componentes/JanelaCentral'
import { Icone } from '../componentes/Icone'
import { carregarComentario, slugDoTema } from '../dados/comentarios'
import { esquecerEdicoes, urlImagem, type EdicaoQuestao } from '../dados/edicoes'
import { recarregarAcervo } from '../dados/acervo'
import type { ComentarioIA, Imagem, Questao } from '../dados/tipos'
import { usarIndice } from '../dados/usarIndice'
import { chamarRpc, chamarRpcPublica } from '../servicos/supabase'
import { href } from '../util/rotas'
import { enviarImagens, imagensDaTransferencia, type ImagemLocal } from './imagensQuestao'
import './FotoComentarioJanela.css'

interface Nova extends ImagemLocal { chave: string; previa: string; legenda: string; fonte: string }

/**
 * Atalho do administrador, direto na questão: põe fotos no comentário sem
 * abrir o editor completo. Cola (Ctrl+V), arrasta ou escolhe; a imagem é
 * reduzida, enviada e gravada por cima do comentário, junto das que já havia.
 */
export default function FotoComentarioJanela({ questao, aoFechar, aoSalvar }: { questao: Questao; aoFechar: () => void; aoSalvar: (c: ComentarioIA) => void }) {
  const { indice } = usarIndice()
  const [edicao, definirEdicao] = useState<EdicaoQuestao | null>(null)
  const [comentario, definirComentario] = useState<ComentarioIA | null | undefined>(undefined)
  const [atuais, definirAtuais] = useState<Imagem[]>([])
  const [novas, definirNovas] = useState<Nova[]>([])
  const [erro, definirErro] = useState('')
  const [lendo, definirLendo] = useState(false)
  const [salvando, definirSalvando] = useState(false)
  const [sobre, definirSobre] = useState(false)
  const seletor = useRef<HTMLInputElement>(null)
  const id = questao.id

  // A edição gravada e o comentário de partida: a edição vale mais que o acervo.
  useEffect(() => {
    if (!indice) return
    let vivo = true
    ;(async () => {
      const linhas = await chamarRpcPublica<Array<{ id_questao: string; dados: EdicaoQuestao }>>('edicoes_questoes')
      const e = linhas.find(l => l.id_questao === id)?.dados ?? {}
      const slug = slugDoTema(indice, questao)
      const c = e.comentarioIA !== undefined ? e.comentarioIA : questao.comentarioIA ?? (slug ? await carregarComentario(slug, id) : null)
      if (!vivo) return
      definirEdicao(e); definirComentario(c ?? null); definirAtuais(c?.imagens ?? [])
    })().catch(() => vivo && definirErro('Não consegui ler a questão agora. Confira a conexão e abra de novo.'))
    return () => { vivo = false }
  }, [id, indice, questao])

  const adicionar = (lista: ImagemLocal[]) => definirNovas(atual => [...atual, ...lista.map((l, i) => ({
    ...l, chave: `${Date.now()}-${i}-${l.arquivo.name}`, previa: URL.createObjectURL(l.arquivo), legenda: '', fonte: l.fonte ?? '',
  }))])
  async function receber(dados: DataTransfer | null) {
    definirErro(''); definirLendo(true)
    try {
      const lista = await imagensDaTransferencia(dados)
      if (!lista.length) definirErro('Não achei imagem aqui. Copie a própria imagem (botão direito → "Copiar imagem") e cole de novo.')
      adicionar(lista)
    } catch (f) { definirErro(f instanceof Error ? f.message : 'Não consegui ler essa imagem.') } finally { definirLendo(false) }
  }

  // Ctrl+V em qualquer lugar com a janela aberta, menos dentro de um campo de texto.
  const receberRef = useRef(receber)
  receberRef.current = receber
  useEffect(() => {
    const colar = (e: ClipboardEvent) => {
      const alvo = e.target instanceof Element ? e.target : null
      const temImagem = e.clipboardData && (e.clipboardData.files.length > 0 || [...e.clipboardData.items].some(i => i.type.startsWith('image/')))
      if (alvo?.closest('input, textarea') && !temImagem) return
      e.preventDefault()
      void receberRef.current(e.clipboardData)
    }
    document.addEventListener('paste', colar)
    return () => document.removeEventListener('paste', colar)
  }, [])
  // As prévias locais ocupam memória até a janela fechar.
  const previas = useRef<string[]>([])
  previas.current = novas.map(n => n.previa)
  useEffect(() => () => previas.current.forEach(u => URL.revokeObjectURL(u)), [])

  const tirouAlguma = useMemo(() => atuais.length !== (comentario?.imagens?.length ?? 0), [atuais, comentario])
  const mudou = novas.length > 0 || tirouAlguma

  async function salvar() {
    if (!comentario || !edicao || !mudou) return
    definirSalvando(true); definirErro('')
    try {
      const enviadas = await enviarImagens(novas, id, 'comentario')
      const imagens = [...atuais, ...enviadas.map((img, i) => ({ ...img, legenda: novas[i].legenda.trim() || null, fonte: novas[i].fonte.trim() || null }))]
      const novo: ComentarioIA = { ...comentario, imagens }
      await chamarRpc<string>('salvar_edicao_questao', { p_id: id, p_dados: { ...edicao, comentarioIA: novo } })
      esquecerEdicoes(); recarregarAcervo()
      aoSalvar(novo)
      aoFechar()
    } catch (f) { definirErro(f instanceof Error ? f.message : 'Não consegui salvar. Tente de novo.') } finally { definirSalvando(false) }
  }

  const carregado = comentario !== undefined && edicao !== null
  const editarCompleto = href(`/admin?aba=questoes&id=${encodeURIComponent(id)}`)

  return <JanelaCentral aberta aoFechar={() => { if (!salvando) aoFechar() }} rotulo={`Foto no comentário da questão ${id}`} className="fc">
    <div className="fc__corpo">
      <header className="fc__cabeca">
        <p className="fc__rotulo">Só administradores · {id}</p>
        <h2>Foto no comentário</h2>
        <p className="fc__dica">Cole com <kbd>Ctrl</kbd>+<kbd>V</kbd>, arraste a imagem para cá ou escolha um arquivo. Ela é reduzida antes de subir e aparece logo abaixo do conceito-chave.</p>
      </header>

      {!carregado && !erro && <p className="fc__estado" role="status">Abrindo o comentário…</p>}
      {carregado && !comentario && <div className="fc__aviso" role="alert">
        <p>Esta questão ainda não tem comentário. Escreva o comentário no editor completo; depois as fotos entram por aqui.</p>
        <a className="fc__botao fc__botao--contorno" href={editarCompleto} target="_blank" rel="noopener noreferrer"><Icone nome="lapis" tamanho={16} /> Editar questão</a>
      </div>}

      {carregado && comentario && <>
        <button type="button" className={'fc__zona' + (sobre ? ' fc__zona--sobre' : '') + (lendo ? ' fc__zona--lendo' : '')}
          onClick={() => seletor.current?.click()}
          onDragOver={e => { e.preventDefault(); definirSobre(true) }} onDragLeave={() => definirSobre(false)}
          onDrop={e => { e.preventDefault(); definirSobre(false); void receber(e.dataTransfer) }}>
          <Icone nome="imagem" tamanho={30} />
          <strong>{lendo ? 'Lendo a imagem…' : sobre ? 'Solte para adicionar' : 'Cole, arraste ou clique para escolher'}</strong>
          <small>JPG, PNG, WebP ou GIF · pode ser mais de uma</small>
        </button>
        <input ref={seletor} type="file" accept="image/*" multiple hidden onChange={e => { adicionar(Array.from(e.target.files ?? []).map(arquivo => ({ arquivo }))); e.target.value = '' }} />

        {(atuais.length > 0 || novas.length > 0) && <ul className="fc__grade" aria-label="Fotos do comentário">
          {atuais.map(img => <li key={img.arquivo} className="fc__item">
            <img src={urlImagem(img.arquivo)} alt={img.legenda ?? ''} loading="lazy" />
            <span className="fc__selo">no comentário</span>
            {img.legenda && <p className="fc__legenda">{img.legenda}</p>}
            <button type="button" className="fc__tirar" onClick={() => definirAtuais(a => a.filter(x => x !== img))} aria-label="Tirar esta foto do comentário"><Icone nome="lixeira" tamanho={15} /> Tirar</button>
          </li>)}
          {novas.map(n => <li key={n.chave} className="fc__item fc__item--nova">
            <img src={n.previa} alt="" />
            <span className="fc__selo fc__selo--nova">nova</span>
            <input className="fc__campo" placeholder="Legenda (opcional)" aria-label="Legenda" value={n.legenda} onChange={e => definirNovas(l => l.map(x => x.chave === n.chave ? { ...x, legenda: e.target.value } : x))} />
            <input className="fc__campo" placeholder="Fonte ou link (opcional)" aria-label="Fonte" value={n.fonte} onChange={e => definirNovas(l => l.map(x => x.chave === n.chave ? { ...x, fonte: e.target.value } : x))} />
            <button type="button" className="fc__tirar" onClick={() => { URL.revokeObjectURL(n.previa); definirNovas(l => l.filter(x => x.chave !== n.chave)) }} aria-label="Descartar esta foto"><Icone nome="fechar" tamanho={15} /> Descartar</button>
          </li>)}
        </ul>}
      </>}

      {erro && <p className="fc__erro" role="alert"><Icone nome="alerta" tamanho={16} /> {erro}</p>}

      <footer className="fc__rodape">
        <a className="fc__link" href={editarCompleto} target="_blank" rel="noopener noreferrer"><Icone nome="lapis" tamanho={15} /> Editar a questão completa</a>
        <span className="fc__acoes">
          <button type="button" className="fc__botao fc__botao--contorno" onClick={aoFechar} disabled={salvando}>Cancelar</button>
          {comentario && <button type="button" className="fc__botao" onClick={() => void salvar()} disabled={!mudou || salvando || lendo}>
            {salvando ? 'Salvando…' : novas.length ? `Salvar ${novas.length === 1 ? 'foto' : `${novas.length} fotos`}` : 'Salvar'}
          </button>}
        </span>
      </footer>
    </div>
  </JanelaCentral>
}
