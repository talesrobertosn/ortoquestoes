import type { ReactNode } from 'react'
import { Icone } from '../Icone'
import { PLANOS, corDe, iniciais } from './formatos'
import { categoriaPessoa, textoPlanos, viuPlanos, type SinalUsuario } from './sinais'

type Pessoa = { id_usuario: string; nome?: string | null; email?: string | null; plano_vigente?: string | null; administrador?: boolean | null; online?: boolean }

/** Selos pequenos da pessoa: Administrador, Assinante (plano), Não assinante, Viu os planos. */
export function SelosPessoa({ u, sinal, extras }: { u: Pessoa; sinal?: SinalUsuario | null; extras?: ReactNode }) {
  return <span className="adm-pessoa__selos">
    {u.administrador && <span className="adm-selo adm-selo--admin">Administrador</span>}
    {u.plano_vigente ? <span className="adm-selo adm-selo--ok">Assinante{PLANOS[u.plano_vigente] ? ` · ${PLANOS[u.plano_vigente].toLowerCase()}` : ''}</span>
      : !u.administrador && <span className="adm-selo adm-selo--neutro">Não assinante</span>}
    {sinal && viuPlanos(sinal) && <span className="adm-selo adm-selo--planos" title={`Abriu a página de planos ${sinal.planos_vezes}× nos últimos 30 dias${sinal.condicoes_ultima ? '; também abriu as Condições da Assinatura' : ''}`}><Icone nome="estrela" tamanho={12} />{textoPlanos(sinal)}</span>}
    {extras}
  </span>
}

/**
 * Uma linha por pessoa nas listas de Agora (17/10/2026): avatar, nome completo (ou e-mail) e selos;
 * o que a pessoa fez ou está fazendo, em frase inteira; números à direita; ações. Nada aqui corta
 * texto: em tela larga é uma linha de quatro colunas, em tela estreita vira níveis (quem; o que faz;
 * números e ações), sempre com quebra de linha.
 */
export function LinhaPessoa({ u, sinal, selos, faz, tempos, numeros, acoes, classe = '', recente = false, online = false }: {
  u: Pessoa; sinal?: SinalUsuario | null; selos?: ReactNode
  /** O que faz/fez (frase completa). */
  faz?: ReactNode
  /** Linha pequena de tempos e detalhes, abaixo do que faz. */
  tempos?: ReactNode
  numeros?: Array<{ valor: ReactNode; rotulo: string; destaque?: boolean }>
  acoes?: ReactNode
  classe?: string; recente?: boolean; online?: boolean
}) {
  const cat = categoriaPessoa(u, sinal)
  return <li className={`adm-pessoa adm-pessoa--${cat}${recente ? ' adm-pessoa--recente' : ''}${online ? ' adm-pessoa--online' : ''} ${classe}`.trim()}>
    <div className="adm-pessoa__quem">
      <span className="adm-avatar" style={{ background: corDe(u.id_usuario) }} aria-hidden="true">{iniciais(u)}{online && <span className="adm-online" />}</span>
      <div className="adm-pessoa__nome-selos">
        <strong className="adm-pessoa__nome">{u.nome ?? u.email ?? 'Conta sem nome'}</strong>
        <SelosPessoa u={u} sinal={sinal} extras={selos} />
      </div>
    </div>
    {(faz || tempos) && <div className="adm-pessoa__faz">
      {faz && <span className="adm-pessoa__atividade">{faz}</span>}
      {tempos && <small className="adm-pessoa__tempos">{tempos}</small>}
    </div>}
    {numeros && numeros.length > 0 && <dl className="adm-pessoa__numeros">
      {numeros.map(x => <div key={x.rotulo} className={x.destaque ? 'adm-pessoa__numero--destaque' : ''}><dd className="numerico">{x.valor}</dd><dt>{x.rotulo}</dt></div>)}
    </dl>}
    {acoes && <div className="adm-pessoa__acoes">{acoes}</div>}
  </li>
}
