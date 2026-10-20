import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usarSemCopia } from '../biblioteca/semCopia'
import { recurso } from '../config'
import { usarPremium } from '../conta/premium'
import { ROTULO_NIVEL } from '../dados/incidencia'
import {
  consultaTreinoArea, consultaTreinoAssunto, contarFrases, filtrarResumao, minutosDeLeitura, normalizarBusca, proximaNaoLida, termosDaBusca,
  type AreaResumao, type DadosResumao,
} from '../dados/resumao'
import { usarArmazenado } from '../estado/usarArmazenado'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { IconePixel } from '../componentes/IconePixel'
import { Degustacao, SeloAssinante } from '../componentes/Premium'
import { href } from '../util/rotas'
import '../estilos/paginas/Resumao.css'
import { irParaSecao, VoltarAoTopo } from '../componentes/IndicePagina'
import { usarRota } from '../util/rotas'
import { CHAVE_RESUMAO_HOJE, comAreaLida, RESUMAO_HOJE_VAZIO, SEGUNDOS_LEITURA, type ResumaoHoje } from '../estado/resumaoLido'
import { enviarMarcas } from '../conta/cronograma'
import { hojeBR } from '../util/dia'

/** Áreas que quem não assina vê inteiras, como amostra. */
const AREAS_AMOSTRA = 1
/** Tamanhos de letra da leitura (o do meio é o padrão). */
const FONTES = ['menor', 'normal', 'maior', 'enorme'] as const
type Fonte = typeof FONTES[number]

/** Posições (no texto sem acento) onde cada termo aparece, para marcar na frase. */
function destacar(texto: string, termos: string[]): ReactNode {
  if (!termos.length) return texto
  const alvo = normalizarBusca(texto)
  // normalizarBusca só remove acentos combinantes: com o texto já composto (NFC), as posições batem.
  if (alvo.length !== texto.length) return texto
  const marcas: Array<[number, number]> = []
  for (const t of termos) {
    let i = alvo.indexOf(t)
    while (i >= 0) { marcas.push([i, i + t.length]); i = alvo.indexOf(t, i + t.length) }
  }
  if (!marcas.length) return texto
  marcas.sort((a, b) => a[0] - b[0])
  const partes: ReactNode[] = []
  let pos = 0
  for (const [ini, fim] of marcas) {
    if (fim <= pos) continue
    const de = Math.max(ini, pos)
    if (de > pos) partes.push(texto.slice(pos, de))
    partes.push(<mark key={de}>{texto.slice(de, fim)}</mark>)
    pos = fim
  }
  partes.push(texto.slice(pos))
  return partes
}

/** Negrito do comentário (**assim**) vira <b>; o resto é texto puro (com a busca marcada). */
function comNegrito(texto: string, termos: string[] = []): ReactNode {
  return texto.normalize('NFC').split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') ? <b key={i}>{destacar(parte.slice(2, -2), termos)}</b> : <Fragment key={i}>{destacar(parte, termos)}</Fragment>)
}

/**
 * Frases que caem (adendo da Biblioteca em #/resumos/frases; até 16/10/2026 era o Resumão, em #/resumao): a frase "Na prova" dos comentários, só dos assuntos de
 * prioridade alta e máxima, área por área. Para ler em minutos na reta final,
 * sem fazer questão. Cada frase leva à questão de onde saiu; cada assunto e
 * cada área levam ao treino. Busca, filtro de prioridade, tamanho da letra e
 * "próxima área" deixam a leitura corrida no celular (otimização de 15/10/2026).
 */
export function Resumao() {
  const { premium } = usarPremium()
  const texto = useRef<HTMLDivElement>(null)
  usarSemCopia(texto)
  const [dados, definirDados] = useState<DadosResumao | null>(null)
  const [erro, definirErro] = useState(false)
  const [tentativa, definirTentativa] = useState(0)
  const [lidas, definirLidas] = usarArmazenado<string[]>('resumao:lidas', [])
  const [fonte, definirFonte] = usarArmazenado<Fonte>('resumao:fonte', 'normal')
  const [soMaxima, definirSoMaxima] = usarArmazenado<boolean>('resumao:so-maxima', false)
  const [ultima, definirUltima] = usarArmazenado<string>('resumao:ultima', '')
  const [busca, definirBusca] = useState('')
  const buscaAdiada = useDeferredValue(busca)
  const [abertas, definirAbertas] = useState<string[] | null>(null)

  useEffect(() => {
    let vivo = true
    definirErro(false)
    fetch(recurso('acervo/resumao.json')).then((r) => (r.ok ? r.json() : Promise.reject())).then((d: DadosResumao) => { if (vivo) definirDados(d) }).catch(() => { if (vivo) definirErro(true) })
    return () => { vivo = false }
  }, [tentativa])

  const [, definirLidoHoje] = usarArmazenado<ResumaoHoje>(CHAVE_RESUMAO_HOJE, RESUMAO_HOJE_VAZIO)
  const marcarLidaHoje = (slug: string) => {
    definirLidoHoje((atual) => comAreaLida(atual, slug))
    // Vai também para o plano no servidor: o cronograma dos outros aparelhos mostra o resumão como lido.
    if (premium) enviarMarcas({ em: hojeBR(), resumao: [slug] }).catch(() => undefined)
  }

  // Vindo do cronograma (#/resumos/frases?tema=joelho): abre e rola até a área do dia. O roteador
  // é por hash, então nada de âncora "#rz-joelho": a área é aberta e rolada pelo código.
  // Lê a rota viva, para reagir quando só a consulta muda (de ?tema=joelho para ?tema=mao).
  const temaPedido = usarRota().consulta.get('tema')
  const visiveis = useMemo(() => (dados ? (premium ? dados.areas : dados.areas.slice(0, AREAS_AMOSTRA)) : []), [dados, premium])
  const lidasValidas = useMemo(() => (dados ? lidas.filter((slug) => dados.areas.some((a) => a.slug === slug)) : []), [dados, lidas])

  // Primeira abertura: a área pedida pelo cronograma; senão, a primeira ainda não lida.
  useEffect(() => {
    if (!dados || abertas !== null) return
    const inicial = temaPedido && visiveis.some((a) => a.slug === temaPedido) ? temaPedido : proximaNaoLida(visiveis, lidasValidas)?.slug
    definirAbertas(inicial ? [inicial] : [])
  }, [dados, abertas, temaPedido, visiveis, lidasValidas])

  const abrir = (slug: string, rolar = true) => {
    definirAbertas((atual) => (atual?.includes(slug) ? atual : [...(atual ?? []), slug]))
    definirUltima(slug)
    if (rolar) window.requestAnimationFrame(() => irParaSecao(document.getElementById(`rz-${slug}`)))
  }
  const alternarAberta = (slug: string, aberta: boolean) => {
    definirAbertas((atual) => {
      const lista = atual ?? []
      if (aberta === lista.includes(slug)) return atual
      return aberta ? [...lista, slug] : lista.filter((s) => s !== slug)
    })
    if (aberta) definirUltima(slug)
  }

  // Pedido de tema trocado na mesma página (?tema=joelho → ?tema=mao): abre e rola até ele.
  const [temaAtendido, definirTemaAtendido] = useState<string | null>(null)
  useEffect(() => {
    if (!temaPedido) { if (temaAtendido) definirTemaAtendido(null); return }
    if (!dados || abertas === null || temaAtendido === temaPedido) return
    if (!document.getElementById(`rz-${temaPedido}`)) return
    abrir(temaPedido)
    definirTemaAtendido(temaPedido)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, temaPedido, premium, abertas, temaAtendido])

  // Leitura de verdade: um minuto com a área pedida aberta e a aba à vista conta como lida hoje
  // (o item "Resumão do tema" do cronograma fica feito). Abrir e sair na hora não conta.
  useEffect(() => {
    if (!temaAtendido) return
    let segundos = 0
    const t = window.setInterval(() => {
      const el = document.getElementById(`rz-${temaAtendido}`) as HTMLDetailsElement | null
      if (document.visibilityState !== 'visible' || !el?.open) return
      segundos += 5
      if (segundos >= SEGUNDOS_LEITURA) { marcarLidaHoje(temaAtendido); window.clearInterval(t) }
    }, 5000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaAtendido])

  const termos = useMemo(() => termosDaBusca(buscaAdiada), [buscaAdiada])
  const buscando = termos.length > 0
  const filtradas = useMemo(() => filtrarResumao(visiveis, { busca: buscaAdiada, soMaxima }), [visiveis, buscaAdiada, soMaxima])

  if (erro) return (
    <div className="aviso-formulario aviso-formulario--erro rz-erro" role="alert">
      <span>Não foi possível carregar as frases. Confira a conexão.</span>
      <button type="button" className="botao" onClick={() => definirTentativa((n) => n + 1)}>Tentar de novo</button>
    </div>
  )
  if (!dados) return <Carregando linhas={6} rotulo="Carregando as frases" />

  const alternarLida = (slug: string) => {
    const lendo = !lidasValidas.includes(slug)
    definirLidas(lendo ? [...lidasValidas, slug] : lidasValidas.filter((s) => s !== slug))
    if (lendo) marcarLidaHoje(slug)
  }
  /** "Li esta área" já fecha a área lida e abre a próxima, para a leitura seguir sem procurar. */
  const concluirESeguir = (slug: string) => {
    if (!lidasValidas.includes(slug)) { definirLidas([...lidasValidas, slug]); marcarLidaHoje(slug) }
    const proxima = proximaNaoLida(visiveis, [...lidasValidas, slug], slug)
    definirAbertas((atual) => (atual ?? []).filter((s) => s !== slug))
    if (proxima) abrir(proxima.slug)
    else window.requestAnimationFrame(() => irParaSecao(document.getElementById('rz-fim')))
  }

  const totalVisivel = contarFrases(visiveis)
  const progresso = visiveis.length ? Math.round((lidasValidas.filter((s) => visiveis.some((a) => a.slug === s)).length / visiveis.length) * 100) : 0
  const continuar = proximaNaoLida(visiveis, lidasValidas, lidasValidas.includes(ultima) ? ultima : undefined)
  const retomar = ultima && !lidasValidas.includes(ultima) && visiveis.some((a) => a.slug === ultima) ? visiveis.find((a) => a.slug === ultima)! : continuar
  const todasAbertas = !!abertas && visiveis.every((a) => abertas.includes(a.slug))
  const iFonte = Math.max(0, FONTES.indexOf(fonte))

  const corpoArea = (a: AreaResumao, completa: AreaResumao | undefined) => (
    <>
      {a.focos.map((f) => (
        <section key={f.nome} className="rz-foco">
          <header className="rz-foco__cabeca">
            <h3>{f.nome}</h3>
            <span className={`rz-nivel rz-nivel--${f.nivel}`}>{ROTULO_NIVEL[f.nivel]}</span>
            {!!f.n && <span className="rz-foco__n">{f.n} {f.n === 1 ? 'questão' : 'questões'} de prova</span>}
            <a className="rz-foco__treinar" href={href(consultaTreinoAssunto(f.nome))}>Treinar <Icone nome="direita" tamanho={13} /></a>
          </header>
          <ul>
            {f.frases.map((fr) => (
              <li key={fr.id}>
                <span className="rz-frase">{comNegrito(fr.texto, termos)}</span>
                <a className="rz-frase__origem" href={href(`/questao/${fr.id}`)} aria-label={`Ver a questão de onde saiu${fr.origem ? ` (${fr.origem})` : ''}`}>
                  {fr.origem && <span>{fr.origem}</span>}ver questão <Icone nome="direita" tamanho={12} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {completa && !buscando && (
        <footer className="rz-area__fim">
          <div className="rz-area__treino">
            <a className="botao" href={href(consultaTreinoArea(a.slug))}><Icone nome="alvo" tamanho={15} /> Treinar {a.nome.toLowerCase()}</a>
            <a className="botao" href={href('/flashcards')}><Icone nome="raio" tamanho={15} /> Flashcards</a>
          </div>
          {lidasValidas.includes(a.slug)
            ? <button type="button" className="botao" onClick={() => alternarLida(a.slug)}>Marcar como não lida</button>
            : <button type="button" className="botao botao--principal" onClick={() => concluirESeguir(a.slug)}><Icone nome="certo" tamanho={15} /> Li esta área{proximaNaoLida(visiveis, [...lidasValidas, a.slug], a.slug) ? ', próxima' : ''}</button>}
        </footer>
      )}
    </>
  )

  const area = (a: AreaResumao) => {
    const i = visiveis.findIndex((v) => v.slug === a.slug)
    const completa = visiveis[i]
    const lida = lidasValidas.includes(a.slug)
    const frases = a.focos.reduce((s, f) => s + f.frases.length, 0)
    const aberta = buscando || !!abertas?.includes(a.slug)
    return (
      <details key={a.slug} id={`rz-${a.slug}`} className={'rz-area' + (lida ? ' rz-area--lida' : '')} open={aberta}
        onToggle={(e) => { if (!buscando) alternarAberta(a.slug, (e.currentTarget as HTMLDetailsElement).open) }}>
        <summary>
          <span className="rz-area__num numerico">{lida ? <Icone nome="certo" tamanho={16} /> : i + 1}</span>
          <span className="rz-area__nome"><strong>{a.nome}</strong><small>{a.focos.length} {a.focos.length === 1 ? 'assunto' : 'assuntos'} · {frases} {frases === 1 ? 'frase' : 'frases'}{!buscando && ` · cerca de ${minutosDeLeitura(a)} min`}</small></span>
          {lida && <span className="rz-area__lida">lida</span>}
          <Icone nome="baixo" tamanho={16} />
        </summary>
        <div className="rz-area__corpo">{aberta && corpoArea(a, completa)}</div>
      </details>
    )
  }

  return (
    <div ref={texto} className={`empilha-2 rz rz--fonte-${FONTES[iFonte]}`}>
      <section className="rz-heroi">
        <span className="rz-heroi__icone" aria-hidden="true"><IconePixel nome="revisao" tamanho={56} /></span>
        <div>
          <p className="rz-heroi__selo"><a href={href('/resumos')}><Icone nome="esquerda" tamanho={14} /> Biblioteca</a> · Adendo dos resumos</p>
          <h1>Frases que caem</h1>
          <p>A frase <b>"Na prova"</b> dos comentários, só dos assuntos que <b>mais caem</b>, da área com mais questões para a com menos. São {dados.total.toLocaleString('pt-BR')} frases curtas para reler em minutos antes das questões e na véspera. Cada frase leva à questão de onde saiu; cada assunto, ao treino dele. Para entender o porquê, abra o <a href={href('/resumos')}>resumo do capítulo</a>.</p>
          {premium && (
            <div className="rz-heroi__progresso">
              <span className="rz-heroi__barra" aria-hidden="true"><span style={{ width: `${progresso}%` }} /></span>
              <span><b className="numerico">{lidasValidas.length}</b> de {dados.areas.length} áreas lidas</span>
              {retomar && <button type="button" className="botao botao--claro rz-heroi__continuar" onClick={() => abrir(retomar.slug)}>{lidasValidas.length || ultima ? 'Continuar' : 'Começar'}: {retomar.nome} <Icone nome="direita" tamanho={15} /></button>}
            </div>
          )}
        </div>
      </section>

      <div className="rz-ferramentas" role="search">
        <label className="rz-busca">
          <Icone nome="busca" tamanho={17} />
          <span className="so-leitor">Buscar nas frases</span>
          <input type="search" value={busca} onChange={(e) => definirBusca(e.target.value)} placeholder={premium ? 'Buscar: escafoide, Bado, Salter…' : 'Buscar na área de amostra'} enterKeyHint="search" />
          {busca && <button type="button" className="rz-busca__limpar" onClick={() => definirBusca('')} aria-label="Limpar a busca"><Icone nome="fechar" tamanho={15} /></button>}
        </label>
        <div className="rz-ferramentas__opcoes">
          <button type="button" className={'rz-chip' + (soMaxima ? ' rz-chip--ativo' : '')} aria-pressed={soMaxima} onClick={() => definirSoMaxima(!soMaxima)}>
            <Icone nome="fogo" tamanho={14} /> Só prioridade máxima
          </button>
          {!buscando && visiveis.length > 1 && (
            <button type="button" className="rz-chip" onClick={() => definirAbertas(todasAbertas ? [] : visiveis.map((a) => a.slug))}>
              {todasAbertas ? 'Fechar todas' : 'Abrir todas'}
            </button>
          )}
          <span className="rz-fonte" role="group" aria-label="Tamanho da letra">
            <button type="button" onClick={() => definirFonte(FONTES[Math.max(0, iFonte - 1)])} disabled={iFonte === 0} aria-label="Diminuir a letra">A−</button>
            <button type="button" onClick={() => definirFonte(FONTES[Math.min(FONTES.length - 1, iFonte + 1)])} disabled={iFonte === FONTES.length - 1} aria-label="Aumentar a letra">A+</button>
          </span>
        </div>
        {(buscando || soMaxima) && (
          <p className="rz-ferramentas__contagem" role="status">
            {contarFrases(filtradas) ? <><b className="numerico">{contarFrases(filtradas)}</b> de {totalVisivel} frases{buscando ? ` com "${buscaAdiada.trim()}"` : ''}{soMaxima ? ' · só prioridade máxima' : ''}</> : 'Nenhuma frase encontrada. Tente outra palavra ou tire o filtro.'}
          </p>
        )}
      </div>

      {!buscando && visiveis.length > 3 && <nav className="rz-indice" aria-label="Ir para a área">
        {filtradas.map((a) => <button type="button" key={a.slug} className={'rz-indice__item' + (lidasValidas.includes(a.slug) ? ' rz-indice__item--lida' : '')} onClick={() => abrir(a.slug)}>{lidasValidas.includes(a.slug) && <Icone nome="certo" tamanho={13} />}{a.nome}</button>)}
      </nav>}

      <div className="rz-areas">{filtradas.map(area)}</div>
      <span id="rz-fim" />
      {premium && !buscando && progresso === 100 && (
        <section className="rz-concluido">
          <Icone nome="trofeu" tamanho={22} />
          <div><strong>Frases lidas de ponta a ponta.</strong><span>Agora teste a memória: um simulado mostra o que ficou.</span></div>
          <a className="botao botao--principal" href={href('/simulado-nacional')}>Simulado Nacional</a>
        </section>
      )}
      <VoltarAoTopo />

      {!premium && dados.areas.length > AREAS_AMOSTRA && (
        <Degustacao titulo={`Mais ${dados.areas.length - AREAS_AMOSTRA} áreas nas frases que caem`} texto={<p>As frases completas fazem parte do cronograma do assinante: todas as áreas, com os assuntos que mais caem, busca e marcação de leitura.</p>} acao="Liberar todas as frases">
          <div className="rz-areas">{dados.areas.slice(AREAS_AMOSTRA, AREAS_AMOSTRA + 3).map((a, i) => <div key={a.slug} className="rz-area rz-area--guardada"><span className="rz-area__num numerico">{i + 1 + AREAS_AMOSTRA}</span><strong>{a.nome}</strong></div>)}</div>
        </Degustacao>
      )}

      <p className="rz-rodape">
        <SeloAssinante /> As frases vêm dos comentários das questões e são atualizadas a cada publicação do site. Para treinar, use os <a href={href('/cronograma')}>erros que importam</a> no cronograma.
      </p>
    </div>
  )
}
