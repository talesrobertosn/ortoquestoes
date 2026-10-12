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

  if (erro) return <p className="aviso-formulario aviso-formulario--erro" role="alert">Não foi possível carregar o resumão. Confira a conexão e recarregue.</p>
  if (!dados) return <Carregando linhas={6} rotulo="Carregando o resumão" />

  const visiveis = premium ? dados.areas : dados.areas.slice(0, AREAS_AMOSTRA)
  const lidasValidas = lidas.filter((slug) => dados.areas.some((a) => a.slug === slug))
  const alternar = (slug: string) => definirLidas(lidasValidas.includes(slug) ? lidasValidas.filter((s) => s !== slug) : [...lidasValidas, slug])

  const area = (a: AreaResumao, i: number) => {
    const lida = lidasValidas.includes(a.slug)
    return (
      <details key={a.slug} className={'rz-area' + (lida ? ' rz-area--lida' : '')} open={i === 0 && !lida}>
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

      <div className="rz-areas">{visiveis.map(area)}</div>

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
