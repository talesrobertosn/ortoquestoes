import { useMemo, useState } from 'react'
import { meioDe, vigentesPorPessoa } from '../../componentes/admin/receita'
import { avaliarRisco, PESOS_PADRAO, type Nivel, type Pesos, type Risco } from '../dados/risco'
import { usarPainel } from '../dados/painel'
import type { LinhaUsuario } from '../dados/pessoas'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { iniciais, inteiro } from '../ui/formato'

const CHAVE = 'oq:admin:pesos-risco'
function lerPesos(): Pesos {
  try { const s = localStorage.getItem(CHAVE); if (s) return { ...PESOS_PADRAO, ...JSON.parse(s) } } catch { /* sem armazenamento */ }
  return PESOS_PADRAO
}
const NIVEIS: Array<[Nivel, string]> = [['alto', 'Risco alto'], ['moderado', 'Risco moderado'], ['baixo', 'Risco baixo']]

interface Linha { u: LinhaUsuario; r: Risco }

/**
 * Assinantes › Risco de abandono. Pontuação simples e aberta (os pesos ficam à vista e podem ser ajustados);
 * serve para escolher a quem escrever, não para prever cancelamento. Nada é enviado daqui.
 */
export function RiscoAbandono() {
  const p = usarPainel()
  const nav = usarNav()
  const [pesos, definirPesos] = useState<Pesos>(lerPesos)
  const [nivel, definirNivel] = useState<Nivel>('alto')
  const [ajustar, definirAjustar] = useState(false)

  const linhas = useMemo<Linha[] | null>(() => {
    if (!p.usuariosReais || !p.reais) return null
    const porId = new Map(p.usuariosReais.map(u => [u.id_usuario, u]))
    const agora = Date.now()
    return vigentesPorPessoa(p.reais, agora).flatMap(a => {
      const u = porId.get(a.id_usuario)
      if (!u) return []
      const naoRenova = meioDe(a) === 'pix' || a.cancelar_ao_fim
      const r = avaliarRisco({ ultimaAtividade: u.ultima_atividade, criadoEm: u.criado_em, respondidas: u.respondidas, respondidas7d: u.respondidas_7d, fimSemRenovar: naoRenova ? a.fim_periodo : null }, pesos, agora)
      return [{ u, r }]
    }).sort((x, y) => y.r.pontos - x.r.pontos)
  }, [p.usuariosReais, p.reais, pesos])

  if (!linhas) return null
  const conta = (n: Nivel) => linhas.filter(l => l.r.nivel === n).length
  const lista = linhas.filter(l => l.r.nivel === nivel)
  const salvar = (novo: Pesos) => { definirPesos(novo); try { localStorage.setItem(CHAVE, JSON.stringify(novo)) } catch { /* sem armazenamento */ } }
  const campo = (rotulo: string, valor: number, aoMudar: (v: number) => void) => <label className="rk-peso">
    <span>{rotulo}</span><input type="number" min={0} max={20} value={valor} onChange={e => aoMudar(Math.max(0, Number(e.target.value) || 0))} />
  </label>

  return <section className="a3-painel rk" aria-labelledby="rk-titulo">
    <header className="rk__cabeca">
      <div>
        <h2 id="rk-titulo" className="rk__titulo">Quem pode precisar de uma mão</h2>
        <p className="a3-mudo a3-pequeno">Assinantes com acesso, pontuados por dias sem estudar, queda de ritmo e vencimento sem renovação automática. É um ponto de partida para você escolher a quem escrever, não uma previsão de cancelamento. Nada é enviado sozinho.</p>
      </div>
      <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" aria-expanded={ajustar} onClick={() => definirAjustar(!ajustar)}><Icone nome="filtro" tamanho={14} />Ajustar pontuação</button>
    </header>

    <div className="rk__niveis" role="tablist" aria-label="Nível de risco">
      {NIVEIS.map(([n, rotulo]) => <button key={n} type="button" role="tab" aria-selected={nivel === n} className={`rk__nivel rk__nivel--${n}`} onClick={() => definirNivel(n)}>
        <strong>{inteiro(conta(n))}</strong><span>{rotulo}</span>
      </button>)}
    </div>

    {ajustar && <div className="rk__ajuste">
      <p className="a3-pequeno">Pontos somados por motivo. Moderado a partir de <b>{pesos.moderado}</b>, alto a partir de <b>{pesos.alto}</b>. Fica salvo só neste navegador.</p>
      <div className="rk__pesos">
        {pesos.parado.map((x, i) => campo(`${x.dias}+ dias sem estudar`, x.pontos, v => salvar({ ...pesos, parado: pesos.parado.map((y, j) => j === i ? { ...y, pontos: v } : y) })))}
        {pesos.queda.map((x, i) => campo(`semana abaixo de ${Math.round(x.fracao * 100)}% do ritmo`, x.pontos, v => salvar({ ...pesos, queda: pesos.queda.map((y, j) => j === i ? { ...y, pontos: v } : y) })))}
        {campo('nenhuma questão em 7 dias', pesos.semSessaoNaSemana, v => salvar({ ...pesos, semSessaoNaSemana: v }))}
        {pesos.vencimento.map((x, i) => campo(`vence em até ${x.dias} dias sem renovar`, x.pontos, v => salvar({ ...pesos, vencimento: pesos.vencimento.map((y, j) => j === i ? { ...y, pontos: v } : y) })))}
        {campo('limite do moderado', pesos.moderado, v => salvar({ ...pesos, moderado: v }))}
        {campo('limite do alto', pesos.alto, v => salvar({ ...pesos, alto: Math.max(v, pesos.moderado) }))}
      </div>
      <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => salvar(PESOS_PADRAO)}>Voltar ao padrão</button>
    </div>}

    {lista.length === 0
      ? <p className="rk__vazio">{nivel === 'baixo' ? 'Ninguém aqui ainda.' : 'Ninguém neste nível agora. Boa notícia.'}</p>
      : <ol className="rk__lista">
        {lista.slice(0, 40).map(({ u, r }) => <li key={u.id_usuario} className="rk__item">
          <span className="a3-avatar">{iniciais(u.nome ?? u.email)}</span>
          <div className="rk__corpo">
            <div className="rk__nome"><strong>{u.nome || u.email}</strong><span className={`rk__pontos rk__pontos--${r.nivel}`}>{r.pontos} {r.pontos === 1 ? 'ponto' : 'pontos'}</span></div>
            {r.motivos.length > 0 && <ul className="rk__motivos">{r.motivos.map(m => <li key={m}>{m}</li>)}</ul>}
            <p className="rk__acao"><Icone nome="carta" tamanho={13} />{r.acao}</p>
          </div>
          <div className="rk__botoes">
            <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => nav.abrirPessoa(u.id_usuario)}><Icone nome="usuario" tamanho={14} />Ficha</button>
            {r.nivel !== 'baixo' && <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => nav.abrirPessoa(u.id_usuario, 'carta')}><Icone nome="carta" tamanho={14} />Escrever</button>}
          </div>
        </li>)}
      </ol>}
    {lista.length > 40 && <p className="a3-mudo a3-pequeno" style={{ padding: '0 20px 14px' }}>Mostrando os 40 com mais pontos de {inteiro(lista.length)}.</p>}
  </section>
}
