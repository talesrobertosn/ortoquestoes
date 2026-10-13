import { useEffect, useMemo, useState } from 'react'
import { ler } from '../../estado/armazenamento'
import { navegar } from '../../util/rotas'
import { tocar } from '../efeitos/sons'
import { TORRE } from '../motor/bestiario'
import { CHAVE_RECORDES, CHAVE_REGISTROS, flashcardsUnicos, RECORDES_VAZIOS, type Recordes } from '../progresso'
import { lerRanking, RANKING_NO_SERVIDOR, type LinhaRanking, type TipoRanking } from '../servidor'
import { Cenario } from './Cenario'
import { ModalJogo } from './ModalJogo'
import { Sprite } from './Sprite'

/**
 * Ranking da Cripta do Residente (pronto, atrás da trava FLASHCARDS_RANKING):
 *  - aba Cripta: quem desceu mais fundo e, logo abaixo, quem respondeu mais
 *    flashcards únicos (repetição não conta);
 *  - aba Torre: quem subiu mais alto na Torre do Título (separado).
 * Os números vêm do servidor (corridas validadas); enquanto ele não estiver
 * ligado, a página mostra só os recordes deste aparelho.
 */
export function RankingCripta() {
  const [aba, definirAba] = useState<'cripta' | 'torre'>('cripta')
  const [dados, definirDados] = useState<Partial<Record<TipoRanking, LinhaRanking[] | null>>>({})
  const rec = useMemo(() => ({ ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }), [])
  const unicos = useMemo(() => flashcardsUnicos(ler<Record<string, unknown>>(CHAVE_REGISTROS, {})), [])
  useEffect(() => {
    const tipos: TipoRanking[] = aba === 'cripta' ? ['masmorra', 'unicos'] : ['torre']
    tipos.forEach((t) => { void lerRanking(t).then((l) => definirDados((d) => ({ ...d, [t]: l }))) })
  }, [aba])
  const tabela = (tipo: TipoRanking, titulo: string, unidade: (v: number) => string, meu: number) => {
    const linhas = dados[tipo]
    return (
      <section className="fc-ranking__bloco" aria-label={titulo}>
        <h3>{titulo}</h3>
        {!RANKING_NO_SERVIDOR || linhas === null ? (
          <p className="fc-janela__nota">O ranking abre em breve. Seu recorde neste aparelho: <b>{unidade(meu)}</b>.</p>
        ) : !linhas ? <p className="fc-janela__nota">Carregando…</p> : (
          <ol className="fc-ranking__lista">
            {linhas.map((l) => (
              <li key={l.posicao} className={`${l.ehVoce ? 'fc-ranking__voce' : ''}${l.posicao <= 3 ? ` fc-ranking__podio fc-ranking__podio--${l.posicao}` : ''}`}>
                <b>{l.posicao}</b><span>{l.apelido}{l.ehVoce ? ' (você)' : ''}</span><em>{unidade(l.valor)}</em>
              </li>
            ))}
          </ol>
        )}
      </section>
    )
  }
  return (
    <ModalJogo titulo="Ranking da Cripta" aoPedirFechar={() => navegar('/flashcards')}>
      <div className="fc-arena fc-entrada fc-ranking">
        <Cenario cena="salao" reduzido={false} clima="noite" />
        <div className="fc-entrada__miolo fc-ranking__miolo">
          <header className="fc-entrada__cabeca">
            <span className="fc-entrada__selo">Ranking</span>
            <h1>Os mais <em>fundos</em> e os mais <em>altos</em></h1>
          </header>
          <div className="fc-abas fc-abas--ranking" role="tablist" aria-label="Ranking">
            <button type="button" role="tab" aria-selected={aba === 'cripta'} onClick={() => { tocar('selecao'); definirAba('cripta') }}><Sprite nome="porta" className="fc-sprite--icone" /> Cripta</button>
            <button type="button" role="tab" aria-selected={aba === 'torre'} onClick={() => { tocar('selecao'); definirAba('torre') }}><Sprite nome="muralha" className="fc-sprite--icone" /> Torre</button>
          </div>
          <div className="fc-janela fc-janela--larga fc-ranking__painel">
            {aba === 'cripta' ? (
              <>
                {tabela('masmorra', 'Andar mais fundo da Cripta', (v) => `andar ${v}`, rec.andarMaximo)}
                {tabela('unicos', 'Flashcards únicos respondidos', (v) => `${v.toLocaleString('pt-BR')} flashcards`, unicos)}
              </>
            ) : tabela('torre', 'Andar mais alto da Torre do Título', (v) => `${v}/${TORRE.andares}`, rec.torreMaximo ?? 0)}
            <div className="fc-janela__botoes"><button type="button" className="fc-botao" onClick={() => navegar('/flashcards')}>Voltar à Entrada</button></div>
          </div>
        </div>
      </div>
    </ModalJogo>
  )
}
