import { useEffect, useState } from 'react'
import type { MinhaIndicacao } from '../../conta/indicacao'
import { CartaConvite, type PreviaCarta } from '../../componentes/convite/CartaConvite'
import type { Bicho } from '../../componentes/convite/regras'
import { GatoDormindo } from '../../componentes/CenasPixel'

/**
 * Prévia da carta de convite (só em desenvolvimento: #/dev/convite; fora do pacote publicado). Escolhe o bicho, a
 * situação da conta e o tema, e repete a chegada. Também lê a consulta, para os prints automáticos:
 * #/dev/convite?bicho=gato&situacao=indicar-3&tema=escuro
 */
const DADOS = (convidados: number, confirmados: number): MinhaIndicacao => ({
  codigo: 'TALES7', convidados, confirmados, dias_ganhos: confirmados * 7, limite: 12,
  cortesia_ate: null, fui_convidado: false, minha_confirmada: false,
})
const SITUACOES: Record<string, { nome: string; previa: PreviaCarta }> = {
  'visitante': { nome: 'Visitante (sem conta)', previa: { logado: false, carregado: true, dados: null, premium: false, novos: 0 } },
  'carregando': { nome: 'Com conta, link carregando', previa: { logado: true, carregado: false, dados: null, premium: false, novos: 0 } },
  'indicar-0': { nome: 'Com conta, nenhum amigo ainda', previa: { logado: true, carregado: true, dados: DADOS(0, 0), premium: false, novos: 0 } },
  'indicar-3': { nome: 'Com conta, 3 confirmados e 2 a caminho', previa: { logado: true, carregado: true, dados: DADOS(5, 3), premium: false, novos: 0 } },
  'assinante': { nome: 'Assinante, 1 confirmado', previa: { logado: true, carregado: true, dados: DADOS(1, 1), premium: true, novos: 0 } },
  'agradecer-1': { nome: 'Agradecimento: 1 colega novo', previa: { logado: true, carregado: true, dados: DADOS(4, 4), premium: false, novos: 1 } },
  'agradecer-2': { nome: 'Agradecimento: 2 colegas novos', previa: { logado: true, carregado: true, dados: DADOS(6, 6), premium: false, novos: 2 } },
  'completo': { nome: 'As 12 indicações completas', previa: { logado: true, carregado: true, dados: DADOS(12, 12), premium: false, novos: 0 } },
  'sem-link': { nome: 'Com conta, link não carregou', previa: { logado: true, carregado: true, dados: null, premium: false, novos: 0 } },
}

function consulta(): URLSearchParams {
  const i = window.location.hash.indexOf('?')
  return new URLSearchParams(i >= 0 ? window.location.hash.slice(i + 1) : '')
}

export default function PreviaConvite() {
  const q = consulta()
  const [bicho, definirBicho] = useState<Bicho>(q.get('bicho') === 'gato' ? 'gato' : 'coruja')
  const [sit, definirSit] = useState(SITUACOES[q.get('situacao') ?? ''] ? q.get('situacao')! : 'indicar-3')
  const [tema, definirTema] = useState(q.get('tema') === 'escuro' ? 'escuro' : 'claro')
  const [vez, definirVez] = useState(0)
  const [aberta, definirAberta] = useState(true)

  useEffect(() => {
    const raiz = document.documentElement
    const antes = raiz.dataset.tema
    raiz.dataset.tema = tema
    return () => { if (antes) raiz.dataset.tema = antes; else delete raiz.dataset.tema }
  }, [tema])

  const repetir = () => { definirAberta(true); definirVez((n) => n + 1) }
  return (
    <div style={{ display: 'grid', gap: 12, padding: 16, maxWidth: 720 }}>
      <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>Prévia da carta de convite <small>(desenvolvimento)</small></h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <select value={bicho} onChange={(e) => { definirBicho(e.target.value as Bicho); repetir() }}>
          <option value="coruja">Coruja</option><option value="gato">Gato</option>
        </select>
        <select value={sit} onChange={(e) => { definirSit(e.target.value); repetir() }}>
          {Object.entries(SITUACOES).map(([id, s]) => <option key={id} value={id}>{s.nome}</option>)}
        </select>
        <button onClick={() => definirTema(tema === 'claro' ? 'escuro' : 'claro')}>Tema: {tema}</button>
        <button onClick={repetir}>Repetir a chegada</button>
      </div>
      <p>A carta aparece no canto (no celular, embaixo). Os botões de compartilhar funcionam de verdade, mas nada é gravado.</p>
      {q.get('cenas') !== null && <GatoDormindo titulo="O gato está de folga" texto="Cena do Caderno de Erros vazio, para conferir." />}
      {aberta && <CartaConvite key={`${bicho}-${sit}-${vez}`} bicho={bicho} previa={SITUACOES[sit].previa}
        aoFechar={() => definirAberta(false)} aoCompartilhar={() => undefined} />}
    </div>
  )
}
