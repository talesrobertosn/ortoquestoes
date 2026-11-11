import { useEffect, useState, type CSSProperties } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { fraseGratis, recurso } from '../config'
import { LIMITES_HABILITADOS, conviteLimiteJaVisto, lerBloqueioDiario, limiteGratisConhecido, marcarConviteLimiteVisto, type EstadoLimite } from '../estado/limiteDiario'
import { href } from '../util/rotas'
import { Painel } from './Painel'
import { JanelaCentral, usarTelaLarga } from './JanelaCentral'
import { Icone } from './Icone'
import { MENSAL } from '../dados/planos'
import { usarPeriodo } from '../estado/aparencia'
import { IconePixel, type NomeIconePixel } from './IconePixel'
export { AvisoBloqueioDiario } from './AvisoBloqueioDiario'
import '../estilos/componentes/Cristal.css'
import '../estilos/componentes/Paywall.css'
import { PizzaPixel } from './vendas/PizzaPixel'
import { usarAssinante } from '../conta/plano'
import { RelogioPixel } from './RelogioPixel'

/** "as 20 questões grátis" quando o número é conhecido (o painel pode mudá-lo); "as questões grátis" quando não é. */
function suasQuestoesGratis(limite: number | null | undefined): string {
  return limite ? `Suas ${limite} questões grátis` : 'Suas questões grátis'
}
function asQuestoesGratis(limite: number | null | undefined): string {
  return limite ? `as ${limite} questões grátis` : 'as questões grátis'
}

export function AvisoLimite({ estado }: { estado: EstadoLimite | null }) {
  if (!estado?.permitido || estado.ilimitado || estado.restantes === null || estado.restantes > 3) return null
  return <p className="aviso-limite" role="status">{estado.restantes === 0
    ? 'Rodada grátis completa. Bom trabalho!'
    : <>Falta{estado.restantes === 1 ? '' : 'm'} {estado.restantes} para completar a rodada grátis.</>}</p>
}


export function PainelLimite({ estado, aberto, aoFechar }: { estado: EstadoLimite | null; aberto: boolean; aoFechar: () => void }) {
  const telaLarga = usarTelaLarga()
  const [agora, definirAgora] = useState(Date.now())
  useEffect(() => {
    if (!aberto) return
    const intervalo = window.setInterval(() => definirAgora(Date.now()), 1000)
    return () => window.clearInterval(intervalo)
  }, [aberto])
  const libera = estado?.liberaEm ? new Date(estado.liberaEm) : null
  const faltam = libera ? Math.max(0, Math.ceil((libera.getTime() - agora) / 1000)) : null
  if (estado?.falhaValidacao) {
    return (
      <Painel titulo="Não foi possível registrar a resposta" aberto={aberto} aoFechar={aoFechar}>
        <div className="empilha">
          <p>{estado.motivo}</p>
          <p className="texto-2">Verifique a conexão e tente de novo. Se continuar, saia da conta e entre novamente.</p>
          <div className="linha linha--empilha-celular">
            <button className="botao botao--principal" type="button" onClick={aoFechar}>Tentar de novo</button>
          </div>
        </div>
      </Painel>
    )
  }
  const limite = estado?.limite || limiteGratisConhecido()
  const consumidas = estado?.consumidas ?? limite ?? 0
  const tempo = libera && faltam !== null ? { faltam, libera } : null
  const titulo = `${suasQuestoesGratis(limite)} acabaram`
  if (telaLarga) {
    return (
      <JanelaCentral aberta={aberto} aoFechar={aoFechar} rotulo={titulo} className="pw">
        <OfertaLimite consumidas={consumidas} limite={limite} sequencia={estado?.sequencia ?? 0} tempo={tempo} aoFechar={aoFechar} larga />
      </JanelaCentral>
    )
  }
  return (
    <Painel titulo={titulo} aberto={aberto} aoFechar={aoFechar}>
      <OfertaLimite consumidas={consumidas} limite={limite} sequencia={estado?.sequencia ?? 0} tempo={tempo} aoFechar={aoFechar} />
    </Painel>
  )
}

/**
 * O convite do limite grátis (redesenho de 03/11/2026, no jeito da página inicial): a cena pintada da hora do dia
 * com um recado gentil e o relógio, depois a assinatura vendendo tempo (o cronograma decide o dia; a pessoa só
 * segue) e só os recursos que são mesmo do assinante. Abre por cima da sessão de questões, então nada de mascote
 * nem animação (a sessão é a área séria do site): a cena é a do acampamento vazio, parada.
 */
const VANTAGENS: Array<{ icone: NomeIconePixel; titulo: string; texto: string }> = [
  { icone: 'revisao', titulo: 'Cronograma até a prova', texto: 'Cada dia já vem pronto, do que mais cai para o resto.' },
  { icone: 'turma', titulo: 'Como a turma respondeu', texto: 'Quantos por cento marcaram cada alternativa.' },
  { icone: 'simulado', titulo: 'Simulado Nacional todo mês', texto: 'Sua nota e sua posição entre os residentes.' },
  { icone: 'desempenho', titulo: 'Temas que mais caem', texto: 'O que a prova mais cobra, área por área.' },
]

function OfertaLimite({ consumidas, limite, sequencia, tempo, aoFechar, larga = false }: {
  consumidas: number; limite: number | null; sequencia: number; tempo: { faltam: number; libera: Date } | null; aoFechar: () => void; larga?: boolean
}) {
  const periodo = usarPeriodo()
  const cena = { '--pw-cena': `url("${recurso(`pixel/inicio/cena-${periodo}-960.webp`)}")` } as CSSProperties
  return (
    <div className={'pw-conteudo' + (larga ? ' pw-conteudo--larga' : '')}>
      <section className={`pw-cena pw-cena--${periodo}`} style={cena} aria-label="Plano gratuito">
        <div className="pw-cena__texto-bloco">
          <p className="pw-rotulo">Plano gratuito · {consumidas}{limite ? ` de ${limite}` : ''} hoje</p>
          <h2 className="pw-cena__titulo">Você fez {asQuestoesGratis(limite)} de hoje. Que dedicação!</h2>
          <p className="pw-cena__texto">
            {sequencia > 1 ? <>São <b>{sequencia} dias seguidos</b> de estudo, que constância bonita! </> : 'Que bom ter você estudando por aqui! '}
            As grátis voltam em 24 horas. Se quiser seguir agora, a assinatura libera tudo.
          </p>
        </div>
        {tempo && <div className="pw-cena__relogio"><RelogioPixel liberaEm={tempo.libera.toISOString()} compacto={!larga} legivel /></div>}
      </section>

      <div className="pw-corpo">
        <section className="pw-plano" aria-labelledby="pw-plano-titulo">
          <p className="pw-rotulo pw-rotulo--claro">Com a assinatura</p>
          <h3 id="pw-plano-titulo" className="pw-plano__titulo">Você só abre e segue. O plano cuida do resto.</h3>
          <p className="pw-plano__texto">Diga a data da prova e quanto tempo tem por dia. O cronograma monta cada dia pelo que mais cai, deixa os plantões mais leves e reserva a reta final. Sem perder tempo decidindo o que estudar: é abrir, fazer e seguir até a véspera.</p>
          <ul className="pw-vantagens">
            {VANTAGENS.map((v) => (
              <li key={v.titulo} className="pw-vantagem">
                <span className="pw-vantagem__icone" aria-hidden="true"><IconePixel nome={v.icone} tamanho={40} /></span>
                <span><b>{v.titulo}</b><small>{v.texto}</small></span>
              </li>
            ))}
          </ul>
        </section>

        <section className="pw-oferta" aria-label="Assinatura mensal">
          <p className="pw-oferta__preco"><small>R$</small><b>{MENSAL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b><small>/mês</small></p>
          <p className="pw-oferta__sub">Sem fidelidade · questões sem limite</p>
          <p className="pw-oferta__pizza"><PizzaPixel className="pw-oferta__fatia" />Prepare-se para o TEOT por menos que uma pizza por mês.</p>
          <a className="cristal pw-oferta__cta" href={href('/assinatura?plano=mensal')}>Assinar o mensal</a>
          <p className="pw-oferta__garantia"><Icone nome="certo" tamanho={14} /> Mudou de ideia? Em até 7 dias, o reembolso é um só clique.</p>
          <a className="pw-oferta__planos" href={href('/assinatura')}>Ver também o semestral e o anual <Icone nome="direita" tamanho={14} /></a>
          <button className="pw-oferta__depois" type="button" onClick={aoFechar}>Prefiro esperar o relógio</button>
          <p className="pw-oferta__projeto">{fraseGratis('projeto')}</p>
        </section>
      </div>
    </div>
  )
}

/**
 * No resumo da sessão, quando a rodada grátis acabou: fecha a rodada com
 * reconhecimento e deixa a assinatura como uma linha discreta.
 */
export function DiaCumprido({ erradas = 0 }: { erradas?: number }) {
  const { sessao } = usarConta()
  const assinante = usarAssinante(sessao)
  const [liberaEm] = useState(() => (LIMITES_HABILITADOS ? lerBloqueioDiario() : null))
  const [agora, definirAgora] = useState(Date.now())
  useEffect(() => {
    if (!liberaEm) return
    const intervalo = window.setInterval(() => definirAgora(Date.now()), 30_000)
    return () => window.clearInterval(intervalo)
  }, [liberaEm])
  if (!sessao || assinante || !liberaEm) return null
  const faltam = Math.max(0, Math.ceil((Date.parse(liberaEm) - agora) / 1000))
  if (faltam === 0) return null
  return <section className="dia-cumprido" aria-label="Rodada grátis completa">
    <span className="dia-cumprido__anel" aria-hidden="true"><Icone nome="certo" tamanho={26} espesso={2.4} /></span>
    <div className="dia-cumprido__texto">
      <p className="dia-cumprido__selo">Rodada grátis completa</p>
      <h2>Missão cumprida. Bom trabalho!</h2>
      <p>Você completou {asQuestoesGratis(limiteGratisConhecido())}, e a cota volta 24 horas depois da primeira questão da rodada. Enquanto isso, comentários, revisões e desempenho seguem abertos{erradas > 0 ? ': vale reler os comentários das que você errou.' : '. E nesta sessão você não errou nenhuma.'}</p>
      <p className="dia-cumprido__rodape">
        <a href={href('/assinatura')}>Prefere continuar agora? Conheça a assinatura</a>
      </p>
      <RelogioPixel liberaEm={liberaEm} compacto />
    </div>
  </section>
}

/**
 * Abre o convite do limite uma vez por janela, sozinho, quando as questões grátis da
 * janela já acabaram e a pessoa ainda não o viu (por exemplo, ao voltar para a
 * página inicial ou ao chegar no resumo).
 */
export function ConviteLimiteDoDia() {
  const { sessao } = usarConta()
  const assinante = usarAssinante(sessao)
  const [liberaEm] = useState(() => (LIMITES_HABILITADOS ? lerBloqueioDiario() : null))
  const [aberto, definirAberto] = useState(false)
  useEffect(() => {
    if (!sessao || assinante || !liberaEm || conviteLimiteJaVisto(liberaEm)) return
    const t = window.setTimeout(() => { marcarConviteLimiteVisto(liberaEm); definirAberto(true) }, 700)
    return () => window.clearTimeout(t)
  }, [sessao, assinante, liberaEm])
  if (!liberaEm) return null
  const limite = limiteGratisConhecido() ?? 0
  const estado: EstadoLimite = { permitido: false, paywallAtivo: true, ilimitado: false, consumidas: limite, limite, restantes: 0, liberaEm, sequencia: 0 }
  return <PainelLimite estado={estado} aberto={aberto} aoFechar={() => definirAberto(false)} />
}
