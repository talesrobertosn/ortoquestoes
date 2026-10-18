import { useMemo, useState } from 'react'
import { Icone } from '../Icone'
import type { AbaFicha } from './AdminFichaUsuario'
import { LinhaPessoa } from './LinhaPessoa'
import { acertoAposRevisao, acertoReal, corresponde, haQuantoTempo, hora, normalizar, pedacosAtividade } from './formatos'
import { href } from '../../util/rotas'
import { viuPlanos, type SinalUsuario } from './sinais'
import type { LinhaUsuario } from './AdminUsuarios'

type FiltroVivo = 'todos' | 'assinantes' | 'nao_assinantes' | 'planos'
const FILTROS: Array<[FiltroVivo, string]> = [['todos', 'Todos'], ['assinantes', 'Assinantes'], ['nao_assinantes', 'Não assinantes'], ['planos', 'Viu os planos']]
/** Quem mudou de página ou respondeu há menos de 60 s ganha o pulso verde. */
const RECENTE_MS = 60_000

const tempo = (v: string | null | undefined) => v ? new Date(v).getTime() : 0
/**
 * Desde quando cada pessoa está online, medido pelo painel: a primeira vez em que este painel a viu
 * online (fica guardado enquanto a página do painel está aberta). O sinal do aparelho não traz a hora
 * de entrada, então é um piso: "online há pelo menos X". Quem sai e volta começa de novo.
 */
const onlineDesde = new Map<string, number>()
function lembrarOnline(lista: LinhaUsuario[], agora: number) {
  const ids = new Set(lista.map(u => u.id_usuario))
  for (const id of [...onlineDesde.keys()]) if (!ids.has(id)) onlineDesde.delete(id)
  for (const u of lista) {
    // A troca de página já prova que a pessoa estava online naquela hora.
    const piso = Math.min(agora, tempo(u.pagina_em) || agora)
    const antes = onlineDesde.get(u.id_usuario)
    onlineDesde.set(u.id_usuario, antes === undefined ? piso : Math.min(antes, piso))
  }
}

const passaFiltro = (u: LinhaUsuario, f: FiltroVivo, sinal: SinalUsuario | undefined) =>
  f === 'todos' || (f === 'assinantes' && !!u.plano_vigente) || (f === 'nao_assinantes' && !u.plano_vigente && !u.administrador) || (f === 'planos' && viuPlanos(sinal))

/** A frase inteira do que a pessoa está fazendo, com a área e o link da questão. */
export function Atividade({ u }: { u: Pick<LinhaUsuario, 'pagina' | 'questao'> }) {
  const faz = pedacosAtividade(u)
  return <><Icone nome="olho" tamanho={15} /><span>
    {faz.nome}
    {faz.area && <> · {faz.area}</>}
    {faz.questao && <> · <a href={href(`/questao/${faz.questao}`)} target="_blank" rel="noopener noreferrer">{faz.questao}</a></>}
    {faz.extra && <> · {faz.extra}</>}
  </span></>
}

/**
 * Online agora (refeito do zero a pedido do Tales, 17/10/2026): um monitor ao vivo com uma linha
 * por pessoa, nunca cartão apertado. Em cada linha, sem cortar texto: nome completo, selos
 * (assinante, não assinante, viu os planos, administrador), o que a pessoa está fazendo agora em
 * frase inteira (página, área e id da questão, resumo e quanto leu, andar do Torneio), há quanto
 * tempo está nessa página e desde quando está online, as questões de hoje e da semana, e os atalhos
 * "Ver ficha" e "Enviar carta". Quem mudou de página há menos tempo vem primeiro; quem fez algo nos
 * últimos 60 s ganha um pulso verde. Em tela estreita a linha vira níveis, sem reticências.
 * As regras continuam as do painel: online = sinal há menos de 100 s, lista a cada 15 s, online a cada 10 s.
 */
export function AoVivo({ usuarios, sinais, atualizadoEm, abrirFicha }: {
  usuarios: LinhaUsuario[]; sinais: Map<string, SinalUsuario>; atualizadoEm: number | null; abrirFicha: (u: LinhaUsuario, aba?: AbaFicha) => void
}) {
  const [filtro, definirFiltro] = useState<FiltroVivo>('todos')
  const [busca, definirBusca] = useState('')

  // `usuarios` chega renovado a cada 10 s (online refeito no painel), então os tempos abaixo acompanham.
  const agora = Date.now()
  const online = useMemo(() => {
    const lista = usuarios.filter(u => u.online).sort((a, b) => tempo(b.pagina_em) - tempo(a.pagina_em) || tempo(b.visto_em) - tempo(a.visto_em))
    lembrarOnline(lista, Date.now())
    return lista
  }, [usuarios])
  const contagem = useMemo(() => Object.fromEntries(FILTROS.map(([f]) => [f, online.filter(u => passaFiltro(u, f, sinais.get(u.id_usuario))).length])) as Record<FiltroVivo, number>, [online, sinais])
  const termo = normalizar(busca.trim())
  const visiveis = online.filter(u => passaFiltro(u, filtro, sinais.get(u.id_usuario)) && corresponde([u.nome, u.email], termo))
  const horaLeitura = new Date(atualizadoEm ?? agora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return <section className="adm-vivo adm-bloco" id="agora-online" aria-labelledby="adm-vivo-titulo">
    <header className="adm-bloco__cabeca">
      <h2 id="adm-vivo-titulo"><span className="adm-online" aria-hidden="true" />Online agora <span className="adm-vivo__total numerico">{online.length}</span></h2>
      <small>com o site aberto e à vista (sinal há menos de 100 s) · a lista atualiza sozinha a cada 15 s · última leitura às {horaLeitura}</small>
    </header>

    {online.length > 0 && <div className="adm-bloco__controles">
      <div className="adm-filtros" role="group" aria-label="Filtrar quem está online">
        {FILTROS.map(([valor, rotulo]) => <button key={valor} type="button" className="adm-chip" aria-pressed={filtro === valor} onClick={() => definirFiltro(valor)}>{rotulo}<span>{contagem[valor]}</span></button>)}
      </div>
      <label className="adm-bloco__busca"><Icone nome="busca" tamanho={16} /><span className="so-leitor">Buscar por nome</span><input className="entrada" type="search" placeholder="Buscar por nome" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
    </div>}

    {online.length === 0 ? <p className="adm-vazio"><strong>Ninguém online agora.</strong> Última leitura às {horaLeitura}; a próxima vem em até 15 s. Quem abrir o site aparece aqui, com a página, a questão ou o resumo.</p>
      : visiveis.length === 0 ? <p className="adm-vazio">Ninguém neste filtro{termo ? ` com "${busca.trim()}" no nome` : ''}. {online.length} online no total.</p>
        : <ol className="adm-pessoas">
          {visiveis.map(u => {
            const recente = agora - Math.max(tempo(u.pagina_em), tempo(u.ultima_atividade)) < RECENTE_MS
            const naPagina = u.pagina_em ? haQuantoTempo(u.pagina_em) : null
            const desde = onlineDesde.get(u.id_usuario)
            const onlineHa = desde === undefined ? null : haQuantoTempo(new Date(desde).toISOString())
            const acerto = acertoReal(u) ?? acertoAposRevisao(u)
            return <LinhaPessoa key={u.id_usuario} u={u} sinal={sinais.get(u.id_usuario)} online recente={recente} classe="adm-vivo__linha"
              faz={<Atividade u={u} />}
              tempos={<>
                {naPagina && <span>{naPagina === 'agora' ? 'chegou nesta página agora' : `nesta página ${naPagina}`}{u.pagina_em ? ` (desde ${hora(u.pagina_em)})` : ''}</span>}
                {onlineHa && <span title="Medido pelo painel: desde a primeira vez que a viu online (ou desde a troca de página), portanto pelo menos isso">{onlineHa === 'agora' ? 'entrou agora' : `online ${onlineHa}`}</span>}
                {u.aparelho && <span>{u.aparelho}</span>}
              </>}
              numeros={[
                { valor: u.respondidas_hoje ?? '—', rotulo: u.respondidas_hoje === 1 ? 'questão hoje' : 'questões hoje', destaque: !!u.respondidas_hoje },
                { valor: u.respondidas_7d.toLocaleString('pt-BR'), rotulo: 'na semana' },
                { valor: acerto === null ? '—' : `${acerto}%`, rotulo: acertoReal(u) !== null ? 'acerto real' : 'acerto' },
              ]}
              acoes={<>
                <button type="button" className="adm-link" onClick={() => abrirFicha(u, 'resumo')}><Icone nome="usuario" tamanho={15} /> Ver ficha</button>
                {!u.administrador && <button type="button" className="adm-link" onClick={() => abrirFicha(u, 'acoes')}><Icone nome="correio" tamanho={15} /> Enviar carta</button>}
              </>} />
          })}
        </ol>}
  </section>
}
