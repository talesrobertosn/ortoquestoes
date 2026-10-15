import { dataHora, haQuanto, motivoFalhaEmail } from './formatos'
import { ROTULO_ORIGEM, nivelExcesso, resumoHistorico, rotuloEnvio, type EnvioHistorico } from './modelosEmail'

const diaMes = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })

/** "3 e-mails nos últimos 7 dias": o aviso que aparece sempre que alguém recebeu muito. */
export function AvisoExcesso({ n7, n30 }: { n7: number; n30: number }) {
  const nivel = nivelExcesso(n7)
  if (nivel === 'ok') return null
  return <p className={`ce-excesso ce-excesso--${nivel}`} role="status">
    <strong>{n7} e-mails nos últimos 7 dias</strong>{n30 > n7 ? ` · ${n30} em 30 dias` : ''}.{nivel === 'muito' ? ' Talvez seja melhor esperar.' : ' Veja se vale mandar mais um agora.'}
  </p>
}

/**
 * Histórico de e-mails de uma pessoa, para decidir antes de mandar outro: o último
 * envio, quantos na semana e no mês e a lista (data, tipo, assunto, automático ou
 * enviado por você, falhas).
 */
export function HistoricoEmails({ lista, carregando, aviso, titulo = 'E-mails que esta pessoa recebeu' }: {
  lista: readonly EnvioHistorico[] | null
  carregando?: boolean
  /** Nota sobre a fonte (ex.: sem a parte 27, só os 20 últimos e sem o tipo de carta). */
  aviso?: string
  titulo?: string
}) {
  if (!lista) return <aside className="ce-hist"><h3 className="ce-hist__titulo">{titulo}</h3><p className="adm-nota" role="status">{carregando ? 'Carregando o histórico…' : 'Histórico indisponível.'}</p></aside>
  const r = resumoHistorico(lista)
  return <aside className="ce-hist" aria-label={titulo}>
    <h3 className="ce-hist__titulo">{titulo}</h3>
    <AvisoExcesso n7={r.n7} n30={r.n30} />
    {r.ultimo
      ? <p className="ce-hist__ultimo">Último: <strong>{haQuanto(r.ultimo.em)}</strong> <small>({dataHora(r.ultimo.em)})</small><br />{rotuloEnvio(r.ultimo)}</p>
      : <p className="ce-hist__ultimo"><strong>Nunca recebeu e-mail do site.</strong></p>}
    <p className="ce-hist__contagem">{r.n7} nos últimos 7 dias · {r.n30} em 30 dias{r.falhas ? ` · ${r.falhas} não ${r.falhas === 1 ? 'saiu' : 'saíram'}` : ''}</p>
    {lista.length > 0 && <ol className="ce-hist__lista">
      {lista.slice(0, 12).map((e, i) => <li key={i} className={e.status === 'falhou' ? 'ce-hist__item--falhou' : undefined}>
        <time dateTime={e.em}>{diaMes(e.em)}</time>
        <span>
          <b>{rotuloEnvio(e)}</b>
          {e.assunto && <small>“{e.assunto}”</small>}
          <small>{ROTULO_ORIGEM[e.origem ?? ''] ?? (e.tipo === 'marco' || e.tipo === 'relatorio' ? 'automático' : 'enviado por você')}
            {e.status === 'falhou' ? ` · não saiu: ${motivoFalhaEmail(e.erro)}` : e.status === 'enviando' ? ' · enviando' : ''}</small>
        </span>
      </li>)}
    </ol>}
    {aviso && <p className="adm-nota">{aviso}</p>}
  </aside>
}

/** Versão de uma linha, para a lista da seção Cartas: último envio e o aviso de excesso; abre a lista. */
export function HistoricoMini({ lista }: { lista: readonly EnvioHistorico[] }) {
  const r = resumoHistorico(lista)
  const nivel = nivelExcesso(r.n7)
  if (!lista.length) return <span className="ce-mini ce-mini--vazio">Nenhum ainda</span>
  return <details className="ce-mini">
    <summary>
      {r.ultimo ? haQuanto(r.ultimo.em) : 'só falhas'}
      {nivel !== 'ok' && <b className={`ce-mini__alerta ce-mini__alerta--${nivel}`}>{r.n7} em 7 dias</b>}
      {r.ultimo && <small>{rotuloEnvio(r.ultimo)}</small>}
    </summary>
    <ol>{lista.slice(0, 6).map((e, i) => <li key={i}><time dateTime={e.em}>{diaMes(e.em)}</time> {rotuloEnvio(e)}{e.status === 'falhou' ? ' (não saiu)' : ''}<small>{ROTULO_ORIGEM[e.origem ?? ''] ?? ''}</small></li>)}</ol>
  </details>
}
