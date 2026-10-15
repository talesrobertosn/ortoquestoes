import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { recurso } from '../config'
import { usarPremium } from '../conta/premium'
import { ROTULO_NIVEL, type Nivel } from '../dados/incidencia'
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

interface Frase { texto: string; id: string }
interface FocoResumao { nome: string; nivel: Nivel; frases: Frase[] }
interface AreaResumao { nome: string; slug: string; focos: FocoResumao[] }
interface DadosResumao { geradoEm: string; total: number; areas: AreaResumao[] }

/** Áreas que quem não assina vê inteiras, como amostra. */
const AREAS_AMOSTRA = 1

/** Negrito do comentário (**assim**) vira <b>; o resto é texto puro. */
function comNegrito(texto: string): ReactNode {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') ? <b key={i}>{parte.slice(2, -2)}</b> : <Fragment key={i}>{parte}</Fragment>)
}

/**
 * Resumão da véspera: a frase "Na prova" dos comentários, só dos assuntos de
 * prioridade alta e máxima, área por área. Para ler em minutos na reta final,
 * sem fazer questão. Cada frase leva à questão de onde saiu.
 */
export function Resumao() {
  const { premium } = usarPremium()
  const [dados, definirDados] = useState<DadosResumao | null>(null)
  const [erro, definirErro] = useState(false)
  const [lidas, definirLidas] = usarArmazenado<string[]>('resumao:lidas', [])

  useEffect(() => {
    let vivo = true
    fetch(recurso('acervo/resumao.json')).then((r) => (r.ok ? r.json() : Promise.reject())).then((d: DadosResumao) => { if (vivo) definirDados(d) }).catch(() => { if (vivo) definirErro(true) })
    return () => { vivo = false }
  }, [])

  const [, definirLidoHoje] = usarArmazenado<ResumaoHoje>(CHAVE_RESUMAO_HOJE, RESUMAO_HOJE_VAZIO)
  const marcarLidaHoje = (slug: string) => definirLidoHoje((atual) => comAreaLida(atual, slug))

  // Vindo do cronograma (#/resumao?tema=joelho): abre e rola até a área do dia. O roteador
  // é por hash, então nada de âncora "#rz-joelho": a área é aberta e rolada pelo código.
  // Lê a rota viva, para reagir quando só a consulta muda (de ?tema=joelho para ?tema=mao).
  const temaPedido = usarRota().consulta.get('tema')
  // Depende também de premium: sem o acesso em cache, as áreas além da amostra só
  // aparecem quando a consulta de assinatura responde, depois dos dados.
  const [temaAberto, definirTemaAberto] = useState<string | null>(null)
  useEffect(() => {
    // Sem tema na consulta (ou trocado): esquece o anterior, para o mesmo tema pedido de novo abrir outra vez.
    if (!temaPedido) { if (temaAberto) definirTemaAberto(null); return }
    if (!dados || temaAberto === temaPedido) return
    const el = document.getElementById(`rz-${temaPedido}`) as HTMLDetailsElement | null
    if (!el) return
    el.open = true
    irParaSecao(el)
    definirTemaAberto(temaPedido)
  }, [dados, temaPedido, premium, temaAberto])

  // Leitura de verdade: um minuto com a área pedida aberta e a aba à vista conta como lida hoje
  // (o item "Resumão do tema" do cronograma fica feito). Abrir e sair na hora não conta.
  useEffect(() => {
    if (!temaAberto) return
    let segundos = 0
    const t = window.setInterval(() => {
      const el = document.getElementById(`rz-${temaAberto}`) as HTMLDetailsElement | null
      if (document.visibilityState !== 'visible' || !el?.open) return
      segundos += 5
      if (segundos >= SEGUNDOS_LEITURA) { marcarLidaHoje(temaAberto); window.clearInterval(t) }
    }, 5000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaAberto])

  const irPara = (slug: string) => {
    const el = document.getElementById(`rz-${slug}`) as HTMLDetailsElement | null
    if (!el) return
    el.open = true
    irParaSecao(el)
  }

  if (erro) return <p className="aviso-formulario aviso-formulario--erro" role="alert">Não foi possível carregar o resumão. Confira a conexão e recarregue.</p>
  if (!dados) return <Carregando linhas={6} rotulo="Carregando o resumão" />

  const visiveis = premium ? dados.areas : dados.areas.slice(0, AREAS_AMOSTRA)
  const lidasValidas = lidas.filter((slug) => dados.areas.some((a) => a.slug === slug))
  const alternar = (slug: string) => {
    const lendo = !lidasValidas.includes(slug)
    definirLidas(lendo ? [...lidasValidas, slug] : lidasValidas.filter((s) => s !== slug))
    if (lendo) marcarLidaHoje(slug)
  }

  const area = (a: AreaResumao, i: number) => {
    const lida = lidasValidas.includes(a.slug)
    return (
      <details key={a.slug} id={`rz-${a.slug}`} className={'rz-area' + (lida ? ' rz-area--lida' : '')} open={temaPedido ? a.slug === temaPedido : i === 0 && !lida}>
        <summary>
          <span className="rz-area__num numerico">{i + 1}</span>
          <span className="rz-area__nome"><strong>{a.nome}</strong><small>{a.focos.length} assuntos · {a.focos.reduce((s, f) => s + f.frases.length, 0)} frases</small></span>
          {lida && <span className="rz-area__lida"><Icone nome="certo" tamanho={14} /> lida</span>}
          <Icone nome="baixo" tamanho={16} />
        </summary>
        <div className="rz-area__corpo">
          {a.focos.map((f) => (
            <section key={f.nome} className="rz-foco">
              <h3>{f.nome}<span className={`rz-nivel rz-nivel--${f.nivel}`}>{ROTULO_NIVEL[f.nivel]}</span></h3>
              <ul>
                {f.frases.map((fr) => <li key={fr.id}><span>{comNegrito(fr.texto)}</span><a href={href(`/questao/${fr.id}`)} aria-label="Ver a questão de onde saiu">ver questão</a></li>)}
              </ul>
            </section>
          ))}
          <button type="button" className={'botao ' + (lida ? '' : 'botao--principal')} onClick={() => alternar(a.slug)}>{lida ? 'Marcar como não lida' : <><Icone nome="certo" tamanho={15} /> Li esta área</>}</button>
        </div>
      </details>
    )
  }

  return (
    <div className="empilha-2 rz">
      <section className="rz-heroi">
        <span className="rz-heroi__icone" aria-hidden="true"><IconePixel nome="revisao" tamanho={56} /></span>
        <div>
          <p className="rz-heroi__selo"><Icone nome="livro" tamanho={15} /> Reta final</p>
          <h1>Resumão</h1>
          <p>A frase <b>"Na prova"</b> dos comentários, só dos assuntos que <b>mais caem</b>, da área com mais questões para a com menos. São {dados.total.toLocaleString('pt-BR')} frases curtas para ler em minutos na semana da prova e na véspera. Toque em "ver questão" para abrir a questão de onde a frase saiu.</p>
          {premium && <p className="rz-heroi__progresso"><b className="numerico">{lidasValidas.length}</b> de {dados.areas.length} áreas lidas</p>}
        </div>
      </section>

      {visiveis.length > 3 && <nav className="rz-indice" aria-label="Ir para a área">
        {visiveis.map((a) => <button type="button" key={a.slug} className={'rz-indice__item' + (lidasValidas.includes(a.slug) ? ' rz-indice__item--lida' : '')} onClick={() => irPara(a.slug)}>{a.nome}</button>)}
      </nav>}

      <div className="rz-areas">{visiveis.map(area)}</div>
      <VoltarAoTopo />

      {!premium && dados.areas.length > AREAS_AMOSTRA && (
        <Degustacao titulo={`Mais ${dados.areas.length - AREAS_AMOSTRA} áreas no resumão`} texto={<p>O resumão completo faz parte da reta final do cronograma do assinante: todas as áreas, com as frases dos assuntos que mais caem.</p>} acao="Liberar o resumão completo">
          <div className="rz-areas">{dados.areas.slice(AREAS_AMOSTRA, AREAS_AMOSTRA + 3).map((a, i) => <div key={a.slug} className="rz-area rz-area--guardada"><span className="rz-area__num numerico">{i + 1 + AREAS_AMOSTRA}</span><strong>{a.nome}</strong></div>)}</div>
        </Degustacao>
      )}

      <p className="rz-rodape">
        <SeloAssinante /> As frases vêm dos comentários das questões e são atualizadas a cada publicação do site. Para treinar, use os <a href={href('/cronograma')}>erros que importam</a> no cronograma.
      </p>
    </div>
  )
}
