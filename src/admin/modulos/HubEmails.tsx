import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { chamarFuncao } from '../../servicos/supabase'
import { TIPOS } from '../../componentes/admin/modelosEmail'
import type { MensagemHub } from '../../../supabase/functions/_shared/hub-regras'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { combina, dataHora, diaDaSerie, haQuanto, iniciais, normalizar } from '../ui/formato'
import { Cabeca, Carregando, Estado, Faixa, Selo } from '../ui/kit'
import { PreviaCarta, AvisosTexto } from './cartas-comum'
import './hub-emails.css'

interface Rodada {
  id: string
  dia: string
  status: 'ativa' | 'pausada' | 'concluida'
  criado_em: string
}
interface Item {
  id: string
  status: string
  mensagem: MensagemHub
  motivo: string | null
}
interface EstadoHub {
  worker_ativo: boolean
  dia: string
  rodada: Rodada | null
  fila: Item[]
  rodadas: Rodada[]
  automaticos: Array<{ id: number; assunto: string; status: string; enviado_em: string }>
}
interface Preparo {
  dia: string
  prontas: MensagemHub[]
  adiadas: MensagemHub[]
  avisos: string[]
  consultadas: number
}
const pedir = <T,>(acao: string, extra: Record<string, unknown> = {}) =>
  chamarFuncao<T>('hub-emails', { acao, ...extra }, { prazoMs: 120_000 })
const NOMES: Record<string, string> = {
  pendente: 'Na fila',
  processando: 'Processando',
  enviado: 'Aceito pelo provedor',
  adiado: 'Adiado',
  falhou: 'Falhou',
  incerto: 'Entrega a conferir',
  pulado: 'Pulado',
}
const erroDe = (e: unknown) => String(e).replace(/^Error: /, '')

export default function HubEmails() {
  const nav = usarNav()
  const [estado, setEstado] = useState<EstadoHub | null>(null),
    [preparo, setPreparo] = useState<Preparo | null>(null)
  const [erro, setErro] = useState(''),
    [ocupado, setOcupado] = useState(''),
    [busca, setBusca] = useState(''),
    [filtro, setFiltro] = useState('todos')
  const [puladas, setPuladas] = useState<Set<string>>(new Set()),
    [edicoes, setEdicoes] = useState<Record<string, { assunto: string; corpo: string }>>({})
  const [aberta, setAberta] = useState<MensagemHub | null>(null),
    [mostrarAdiadas, setMostrarAdiadas] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null),
    montado = useRef(true),
    carregando = useRef(false)
  const carregar = useCallback(async () => {
    if (carregando.current) return
    carregando.current = true
    setOcupado('preparar')
    try {
      const e = await pedir<EstadoHub>('estado')
      if (!montado.current) return
      setEstado(e)
      if (!e.rodada) {
        const p = await pedir<Preparo>('preparar')
        if (!montado.current) return
        setPreparo(p)
        try {
          setPuladas(new Set(JSON.parse(localStorage.getItem(`oq:hub:puladas:${p.dia}`) ?? '[]')))
        } catch {
          /* armazenamento indisponível */
        }
      }
      setErro('')
    } catch (e) {
      if (montado.current) setErro(erroDe(e))
    } finally {
      carregando.current = false
      if (montado.current) setOcupado('')
    }
  }, [])
  useEffect(() => {
    montado.current = true
    void carregar()
    return () => {
      montado.current = false
    }
  }, [carregar])
  useEffect(() => {
    const atualizar = () => void carregar()
    window.addEventListener('oq:hub:atualizar', atualizar)
    return () => window.removeEventListener('oq:hub:atualizar', atualizar)
  }, [carregar])
  useEffect(() => {
    if (!estado?.rodada || estado.rodada.status === 'concluida') return
    const id = setInterval(() => {
      void pedir<EstadoHub>('estado')
        .then((e) => {
          if (montado.current) {
            setEstado(e)
            setErro('')
          }
        })
        .catch((e) => {
          if (montado.current) setErro(erroDe(e))
        })
    }, 5000)
    return () => clearInterval(id)
  }, [estado?.rodada?.id, estado?.rodada?.status])
  useEffect(() => {
    if (aberta && !dialog.current?.open) dialog.current?.showModal()
    if (!aberta && dialog.current?.open) dialog.current?.close()
  }, [aberta])
  const rodada = estado?.rodada
  const mensagens = rodada ? estado!.fila.map((x) => x.mensagem) : (preparo?.prontas ?? [])
  const lista = useMemo(
    () =>
      mensagens.filter(
        (m) =>
          (filtro === 'todos' || m.tipo === filtro) &&
          combina([m.nome, m.email, m.motivo, TIPOS[m.tipo].rotulo], normalizar(busca)),
      ),
    [mensagens, filtro, busca],
  )
  const tipos = [...new Set(mensagens.map((m) => m.tipo))]
  const total = preparo?.prontas.filter((m) => !puladas.has(m.chave)).length ?? 0
  const enviados = estado?.fila.filter((x) => x.status === 'enviado').length ?? 0
  const pendentes = estado?.fila.filter((x) => ['pendente', 'processando'].includes(x.status)).length ?? 0
  const falhas = estado?.fila.filter((x) => ['falhou', 'incerto'].includes(x.status)).length ?? 0
  const texto = (m: MensagemHub) => edicoes[m.chave] ?? { assunto: m.assunto, corpo: m.corpo }
  function pular(m: MensagemHub) {
    setPuladas((atual) => {
      const p = new Set(atual)
      p.has(m.chave) ? p.delete(m.chave) : p.add(m.chave)
      try {
        localStorage.setItem(`oq:hub:puladas:${preparo?.dia}`, JSON.stringify([...p]))
      } catch {
        /* sem armazenamento */
      }
      return p
    })
  }
  async function iniciar() {
    if (ocupado || !total || !preparo) return
    setOcupado('iniciar')
    setErro('')
    try {
      setEstado(
        await pedir<EstadoHub>('iniciar', {
          itens: preparo.prontas.filter((m) => !puladas.has(m.chave)).map((m) => ({ chave: m.chave, ...texto(m) })),
        }),
      )
      setAberta(null)
    } catch (e) {
      setErro(erroDe(e))
    } finally {
      setOcupado('')
    }
  }
  async function pausar() {
    if (!rodada || ocupado) return
    setOcupado('pausar')
    try {
      setEstado(await pedir<EstadoHub>(rodada.status === 'pausada' ? 'retomar' : 'pausar', { id: rodada.id }))
      setErro('')
    } catch (e) {
      setErro(erroDe(e))
    } finally {
      setOcupado('')
    }
  }
  async function repetir() {
    if (!rodada || ocupado) return
    setOcupado('repetir')
    try {
      setEstado(await pedir<EstadoHub>('repetir', { id: rodada.id }))
      setErro('')
    } catch (e) {
      setErro(erroDe(e))
    } finally {
      setOcupado('')
    }
  }
  async function variar() {
    if (!aberta || ocupado) return
    setOcupado('versao')
    try {
      const p = await pedir<Preparo>('preparar', { chave: aberta.chave, semente: Math.floor(Math.random() * 2 ** 31) })
      const m = p.prontas.find((x) => x.chave === aberta.chave)
      if (!m) throw new Error('A situação mudou. Feche a prévia e atualize a seleção.')
      setEdicoes((e) => ({ ...e, [m.chave]: { assunto: m.assunto, corpo: m.corpo } }))
      setAberta(m)
      setErro('')
    } catch (e) {
      setErro(erroDe(e))
    } finally {
      setOcupado('')
    }
  }
  const momento = estado?.dia ?? preparo?.dia
  return (
    <div className="a3-pilha a3-pilha--larga hub">
      <Cabeca
        area="E-mails"
        titulo="Central de e-mails"
        pergunta="Uma rodada por dia. Uma mensagem por pessoa, escolhida pelo momento dela."
      />
      {erro && (
        <Faixa tom="erro" titulo="Não foi possível concluir">
          {erro}
          <br />A seleção não é enviada enquanto a preparação não termina.
        </Faixa>
      )}
      {estado?.worker_ativo === false && (
        <Faixa tom="aviso" titulo="Processador da fila indisponível">
          Ative o processador antes de iniciar a rodada. Nenhuma mensagem será enviada por esta central enquanto ele
          estiver indisponível.
        </Faixa>
      )}
      <section className="hub-dia" aria-labelledby="hub-titulo">
        <div className="hub-dia__texto">
          <span className="a3-rotulo">{momento ? diaDaSerie(momento, true) : 'Sua comunicação, organizada'}</span>
          <h2 id="hub-titulo">
            {rodada
              ? rodada.status === 'concluida'
                ? 'Rodada concluída.'
                : rodada.status === 'pausada'
                  ? 'Sua rodada está pausada.'
                  : 'Sua rodada está em andamento.'
              : preparo
                ? total
                  ? 'O contato certo, no momento certo.'
                  : 'Tudo em dia por aqui.'
                : 'Preparando a rodada de hoje…'}
          </h2>
          <p>
            {rodada
              ? 'O progresso fica salvo. Você pode fechar esta página.'
              : preparo
                ? `${total} ${total === 1 ? 'pessoa pode' : 'pessoas podem'} receber uma mensagem hoje. As regras são conferidas novamente antes de cada envio.`
                : 'Reunindo os motivos de contato e conferindo as preferências de cada pessoa.'}
          </p>
          <div className="hub-garantias">
            <span>48 h entre contatos</span>
            <span>Até 3 em 14 dias</span>
            <span>Preferências respeitadas</span>
          </div>
        </div>
        <div className="hub-dia__acao">
          {!rodada ? (
            <button
              className="a3-botao"
              disabled={!preparo || !total || !!ocupado || !!erro || estado?.worker_ativo === false}
              onClick={() => void iniciar()}
            >
              <Icone nome="enviar" tamanho={18} />
              {ocupado === 'iniciar' ? 'Iniciando rodada…' : `Enviar rodada de hoje${total ? ` · ${total}` : ''}`}
            </button>
          ) : rodada.status !== 'concluida' ? (
            <button className="a3-botao" disabled={!!ocupado} onClick={() => void pausar()}>
              {rodada.status === 'pausada' ? 'Retomar rodada' : 'Pausar próximos envios'}
            </button>
          ) : (
            <Selo tom="ok">Progresso salvo</Selo>
          )}
          <small>
            {rodada
              ? 'Um envio já iniciado pode terminar após a pausa.'
              : 'Confira as mensagens abaixo antes de iniciar.'}
          </small>
        </div>
      </section>
      <section className="hub-numeros" aria-label="Resumo do dia">
        <div>
          <span>{rodada ? 'Na fila' : 'Na rodada'}</span>
          <strong>{rodada ? pendentes : preparo ? total : '—'}</strong>
          <small>{rodada ? 'aguardando ou processando' : 'mensagens selecionadas'}</small>
        </div>
        <div>
          <span>{rodada ? 'Aceitos pelo provedor' : 'Adiadas pelas regras'}</span>
          <strong>{rodada ? enviados : (preparo?.adiadas.length ?? '—')}</strong>
          <small>{rodada ? 'entrega não confirmada aqui' : 'com o motivo disponível'}</small>
        </div>
        <div>
          <span>Automáticos hoje</span>
          <strong>{estado?.automaticos.filter((x) => x.status === 'enviado').length ?? '—'}</strong>
          <small>já cuidam dos acontecimentos</small>
        </div>
        <div>
          <span>{rodada ? 'Precisam de atenção' : 'Puladas por você'}</span>
          <strong>{rodada ? falhas : puladas.size}</strong>
          <small>{rodada ? 'falhas ou entrega a conferir' : 'ficam fora desta rodada'}</small>
        </div>
      </section>
      {preparo?.avisos.length && !rodada ? (
        <Faixa tom="aviso" titulo="Vale conferir">
          {preparo.avisos.map((x) => (
            <p key={x}>{x}</p>
          ))}
        </Faixa>
      ) : null}
      {rodada && falhas > 0 && (
        <Faixa tom="aviso" titulo="Alguns envios precisam de atenção">
          Mensagens com entrega incerta não serão reenviadas automaticamente. Confira o provedor antes de qualquer novo
          contato.
          {estado!.fila.some((x) => x.status === 'falhou') && (
            <p>
              <button className="a3-botao a3-botao--contorno" disabled={!!ocupado} onClick={() => void repetir()}>
                Tentar novamente as falhas confirmadas
              </button>
            </p>
          )}
        </Faixa>
      )}
      <section className="a3-painel hub-lista">
        <div className="hub-lista__cabeca">
          <div>
            <h2>A rodada de hoje</h2>
            <p>
              {rodada
                ? 'As mensagens autorizadas e o resultado de cada envio.'
                : 'Cada pessoa aparece uma vez. Abra a mensagem para conferir ou ajustar.'}
            </p>
          </div>
          <span className="a3-mudo a3-pequeno">
            {lista.length} {lista.length === 1 ? 'pessoa' : 'pessoas'}
          </span>
        </div>
        <div className="hub-filtros">
          <label className="hub-busca">
            <Icone nome="busca" tamanho={17} />
            <input
              aria-label="Buscar pessoa ou assunto"
              placeholder="Buscar pessoa, assunto ou motivo"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
          <select aria-label="Filtrar motivo" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todos os motivos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {TIPOS[t].rotulo}
              </option>
            ))}
          </select>
        </div>
        {!preparo && !rodada && !erro ? (
          <div className="hub-vazio">
            <Carregando linhas={5} />
          </div>
        ) : !lista.length ? (
          <div className="hub-vazio">
            <Estado
              icone="carta"
              titulo={busca || filtro !== 'todos' ? 'Nenhuma pessoa neste filtro' : 'Nenhuma mensagem pendente'}
              texto="Os contatos entram quando existe um motivo e as regras permitem."
            />
          </div>
        ) : (
          <div role="list" className="hub-pessoas">
            {lista.map((m) => {
              const item = estado?.fila.find((x) => x.mensagem.chave === m.chave),
                pulada = puladas.has(m.chave) && !rodada
              return (
                <div role="listitem" className={`hub-pessoa${pulada ? ' hub-pessoa--pulada' : ''}`} key={m.chave}>
                  <span className="hub-avatar" aria-hidden="true">
                    {iniciais(m.nome)}
                  </span>
                  <div className="hub-pessoa__nome">
                    <strong>{m.nome}</strong>
                    <span>{m.email}</span>
                  </div>
                  <div className="hub-pessoa__motivo">
                    <span>{TIPOS[m.tipo].rotulo}</span>
                    <small>
                      {m.ultimo_envio ? `Último contato ${haQuanto(m.ultimo_envio)}` : 'Primeiro contato registrado'}
                    </small>
                  </div>
                  <span
                    className={`hub-status${item?.status === 'falhou' || item?.status === 'incerto' ? ' hub-status--erro' : ''}`}
                  >
                    {item ? NOMES[item.status] : pulada ? 'Pulado hoje' : 'Pronto'}
                  </span>
                  <div className="hub-pessoa__acoes">
                    <button className="a3-botao a3-botao--contorno" onClick={() => setAberta(m)}>
                      Ver mensagem
                    </button>
                    {!rodada && (
                      <button
                        className="hub-pular"
                        onClick={() => pular(m)}
                        aria-label={`${pulada ? 'Incluir' : 'Pular'} ${m.nome}`}
                      >
                        {pulada ? 'Incluir' : 'Pular'}
                      </button>
                    )}
                  </div>
                  {item?.motivo && <p className="hub-pessoa__nota">{item.motivo}</p>}
                </div>
              )
            })}
          </div>
        )}
      </section>
      {!rodada && !!preparo?.adiadas.length && (
        <section className="a3-painel hub-adiadas">
          <button aria-expanded={mostrarAdiadas} className="hub-abrir" onClick={() => setMostrarAdiadas((x) => !x)}>
            <span>
              <b>{preparo.adiadas.length} contatos aguardam o momento certo</b>
              <small>Veja quem ficou de fora e o motivo. Não entram no botão de envio.</small>
            </span>
            <span>{mostrarAdiadas ? 'Fechar' : 'Ver motivos'}</span>
          </button>
          {mostrarAdiadas && (
            <ul>
              {preparo.adiadas.map((m) => (
                <li key={m.chave}>
                  <strong>{m.nome}</strong>
                  <span>{TIPOS[m.tipo].rotulo}</span>
                  <small>{m.bloqueio}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section className="a3-painel hub-auto">
        <div>
          <span className="a3-rotulo">O sistema já cuida disso</span>
          <h2>Automáticos, sem trabalho extra.</h2>
          <p>
            Agradecimento no pagamento, confirmação do cronograma e outros acontecimentos continuam no seu tempo. Eles
            aparecem no histórico.
          </p>
          <a
            href={nav.link('envios')}
            onClick={(e) => {
              e.preventDefault()
              nav.ir('envios')
            }}
          >
            Ver histórico de e-mails →
          </a>
        </div>
        <div className="hub-auto__exemplos">
          {estado?.automaticos.slice(0, 3).map((m) => (
            <div key={m.id}>
              <span className="hub-auto__ponto" />
              <div>
                <strong>{m.assunto}</strong>
                <small>
                  {NOMES[m.status] ?? m.status} · {haQuanto(m.enviado_em)}
                </small>
              </div>
            </div>
          ))}
          {!estado?.automaticos.length && <p>Nenhum envio automático registrado hoje.</p>}
        </div>
      </section>
      <p className="a3-mudo a3-pequeno">
        Relatórios periódicos e avisos operacionais têm exceções de frequência.{' '}
        <a
          href={nav.link('todas')}
          onClick={(e) => {
            e.preventDefault()
            nav.ir('todas')
          }}
        >
          Entenda os modelos e as regras.
        </a>
      </p>
      <dialog
        aria-labelledby="hub-previa-titulo"
        className="hub-dialog"
        ref={dialog}
        onCancel={() => setAberta(null)}
        onClose={() => setAberta(null)}
      >
        {aberta && (
          <>
            <div className="hub-dialog__cabeca">
              <div>
                <span className="a3-rotulo">{TIPOS[aberta.tipo].rotulo}</span>
                <h2 id="hub-previa-titulo">{aberta.nome}</h2>
              </div>
              <button
                className="a3-botao a3-botao--contorno"
                autoFocus
                onClick={() => setAberta(null)}
                aria-label="Fechar prévia"
              >
                Fechar
              </button>
            </div>
            <div className="hub-dialog__corpo">
              <div className="hub-contexto">
                <strong>Por que esta mensagem?</strong>
                <p>{aberta.motivo}</p>
                {aberta.concorrentes.length > 0 && <p>Tem prioridade sobre: {aberta.concorrentes.join(', ')}.</p>}
                <p>Personalizada com: {aberta.personalizacao.join(', ') || 'o momento da pessoa'}.</p>
                <small>
                  Último contato: {aberta.ultimo_envio ? dataHora(aberta.ultimo_envio) : 'nenhum registrado'}.
                </small>
              </div>
              <PreviaCarta {...texto(aberta)} descadastro />
              {!rodada && (
                <>
                  <details className="hub-editar">
                    <summary>Ajustar esta mensagem</summary>
                    <label className="a3-campo">
                      <span>Assunto</span>
                      <input
                        className="a3-entrada"
                        value={texto(aberta).assunto}
                        maxLength={120}
                        onChange={(e) =>
                          setEdicoes((x) => ({ ...x, [aberta.chave]: { ...texto(aberta), assunto: e.target.value } }))
                        }
                      />
                    </label>
                    <label className="a3-campo">
                      <span>Mensagem</span>
                      <textarea
                        className="a3-entrada"
                        rows={14}
                        maxLength={6000}
                        value={texto(aberta).corpo}
                        onChange={(e) =>
                          setEdicoes((x) => ({ ...x, [aberta.chave]: { ...texto(aberta), corpo: e.target.value } }))
                        }
                      />
                    </label>
                    <AvisosTexto {...texto(aberta)} />
                  </details>
                  <div className="hub-dialog__acoes">
                    {aberta.fonte === 'pessoal' && (
                      <button
                        className="a3-botao a3-botao--contorno"
                        disabled={!!ocupado}
                        onClick={() => void variar()}
                      >
                        Outra versão
                      </button>
                    )}
                    <button className="a3-botao a3-botao--fantasma" onClick={() => pular(aberta)}>
                      {puladas.has(aberta.chave) ? 'Incluir na rodada' : 'Pular hoje'}
                    </button>
                    <button className="a3-botao" onClick={() => setAberta(null)}>
                      Concluir revisão
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </dialog>
    </div>
  )
}
