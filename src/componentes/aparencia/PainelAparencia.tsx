import type { CSSProperties } from 'react'
import { recurso } from '../../config'
import { periodoAgora, periodoDoCenario, usarCenario, type Cenario, type Periodo } from '../../estado/aparencia'
import { usarTema, type Tema } from '../../estado/tema'
import { Icone } from '../Icone'
import { Mascote } from '../mascote/Mascote'
import './PainelAparencia.css'

/**
 * Aparência (Minha conta, 30/10/2026): duas escolhas separadas, cada uma com miniaturas. O cenário pintado das
 * páginas (segue o horário ou fica fixo) e a cor da interface (clara, escura, do horário ou do aparelho). Em cima,
 * uma prévia ao vivo: o cenário escolhido com um cartão da interface escolhida por cima.
 */
const NOME_PERIODO: Record<Periodo, string> = { manha: 'Manhã', tarde: 'Pôr do sol', noite: 'Noite' }

const CENARIOS: { id: Cenario; rotulo: string; texto: string }[] = [
  { id: 'horario', rotulo: 'Segue o horário', texto: 'Manhã, pôr do sol e noite, conforme a hora' },
  { id: 'manha', rotulo: 'Sempre manhã', texto: 'Luz clara e fresca' },
  { id: 'tarde', rotulo: 'Sempre pôr do sol', texto: 'Dourado e aconchegante' },
  { id: 'noite', rotulo: 'Sempre noite', texto: 'Lua, velas e vaga-lumes' },
]

const TEMAS: { id: Tema; rotulo: string; texto: string; icone: 'sol' | 'lua' | 'relogio' | 'celular' }[] = [
  { id: 'claro', rotulo: 'Clara', texto: 'Fundo claro o dia todo', icone: 'sol' },
  { id: 'escuro', rotulo: 'Escura', texto: 'Fundo escuro o dia todo', icone: 'lua' },
  { id: 'horario', rotulo: 'Segue o horário', texto: 'Clara de dia, escura das 18h às 5h', icone: 'relogio' },
  { id: 'sistema', rotulo: 'Do aparelho', texto: 'Igual ao celular ou computador', icone: 'celular' },
]

const cena = (p: Periodo) => recurso(`pixel/inicio/cena-${p}-960.webp`)

export function PainelAparencia() {
  const [cenario, trocarCenario] = usarCenario()
  const { tema, trocar } = usarTema()
  const periodo = periodoDoCenario(cenario)
  const agora = periodoAgora()
  const interfaceEscura = tema === 'escuro' || (tema === 'horario' && agora === 'noite')
    || (tema === 'sistema' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <div className="apa">
      <figure className={`apa-previa apa-previa--${periodo}`} aria-label={`Prévia: cenário ${NOME_PERIODO[periodo].toLowerCase()} com a interface ${interfaceEscura ? 'escura' : 'clara'}`}>
        <img className="apa-previa__cena" src={cena(periodo)} alt="" width={960} height={400} decoding="async" />
        <span className="apa-previa__ceu" aria-hidden="true" />
        <Mascote className="apa-previa__mascote" comportamento="acenar" falar={false} interativo={false} />
        <span className={`apa-previa__cartao${interfaceEscura ? ' apa-previa__cartao--escuro' : ''}`} aria-hidden="true">
          <b>Treinar por tema</b>
          <i style={{ '--w': '78%' } as CSSProperties} /><i style={{ '--w': '56%' } as CSSProperties} />
          <span>Começar</span>
        </span>
        <figcaption>
          <strong>{NOME_PERIODO[periodo]}</strong> · interface {interfaceEscura ? 'escura' : 'clara'}
          {cenario === 'horario' && <small>muda sozinho com a hora</small>}
        </figcaption>
      </figure>

      <fieldset className="apa-grupo">
        <legend><Icone nome="mapa" tamanho={16} /> Cenário das páginas</legend>
        <p className="apa-ajuda">A arte pintada no topo das páginas: a luz da manhã, o pôr do sol ou a noite.</p>
        <div className="apa-opcoes apa-opcoes--cena">
          {CENARIOS.map((c) => {
            const p = c.id === 'horario' ? agora : c.id
            return (
              <button key={c.id} type="button" className="apa-opcao" aria-pressed={cenario === c.id} onClick={() => trocarCenario(c.id)}>
                <span className={`apa-mini apa-mini--${c.id}`} aria-hidden="true">
                  {c.id === 'horario'
                    ? (['manha', 'tarde', 'noite'] as const).map((q) => <img key={q} src={cena(q)} alt="" loading="lazy" decoding="async" />)
                    : <img src={cena(p)} alt="" loading="lazy" decoding="async" />}
                </span>
                <span className="apa-opcao__texto"><strong>{c.rotulo}</strong><small>{c.texto}</small></span>
                <span className="apa-opcao__marca" aria-hidden="true"><Icone nome="certo" tamanho={14} /></span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="apa-grupo">
        <legend><Icone nome="sol" tamanho={16} /> Cor da interface</legend>
        <p className="apa-ajuda">Os textos, cartões e botões. Vale neste aparelho, e o botão de sol e lua do topo troca na hora.</p>
        <div className="apa-opcoes apa-opcoes--tema">
          {TEMAS.map((t) => (
            <button key={t.id} type="button" className="apa-opcao" aria-pressed={tema === t.id} onClick={() => trocar(t.id)}>
              <span className={`apa-tela apa-tela--${t.id}`} aria-hidden="true"><i /><i /><i /></span>
              <span className="apa-opcao__texto"><strong><Icone nome={t.icone} tamanho={14} /> {t.rotulo}</strong><small>{t.texto}</small></span>
              <span className="apa-opcao__marca" aria-hidden="true"><Icone nome="certo" tamanho={14} /></span>
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
