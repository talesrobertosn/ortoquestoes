import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { chamarFuncao } from '../../servicos/supabase'
import { usarConsulta } from '../../componentes/admin/usarRpc'
import { TIPOS } from '../../componentes/admin/modelosEmail'
import {
  CENARIOS_HUB,
  diaSP,
  selecionarHub,
  type CenarioHub,
  type MensagemHub,
} from '../../../supabase/functions/_shared/hub-regras'
import { usarPainel } from '../dados/painel'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { combina, dataHora, diaDaSerie, haQuanto, iniciais, normalizar } from '../ui/formato'
import { Cabeca, Carregando, Estado, Faixa } from '../ui/kit'
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
  automaticos: Array<{ id: number; assunto: string; status: string; enviado_em: string }>
}
interface Preparo {
  dia: string
  prontas?: MensagemHub[]
  adiadas?: MensagemHub[]
  opcoes?: MensagemHub[]
  avisos: string[]
  consultadas: number
}
const pedir = <T,>(acao: string, extra: Record<string, unknown> = {}, sinal?: AbortSignal) =>
  chamarFuncao<T>('hub-emails', { acao, versao: 2, ...extra }, { prazoMs: 120_000, sinal })
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
const GRUPOS = [...new Set(CENARIOS_HUB.map((c) => c.grupo))]

export default function HubEmails() {
  const nav = usarNav()
  const { conta } = usarPainel()
  const dia = diaSP()
  const preparoQ = usarConsulta<Preparo>(conta ? `${conta}:hub:preparo:${dia}` : null,
    sinal => pedir<Preparo>('preparar', { compacto: true }, sinal))
  const { dados: preparo, recarregar: relerPreparo } = preparoQ
  const [estado, setEstado] = useState<EstadoHub | null>(null)
  const [erroAcao, setErro] = useState(''),
    [ocupado, setOcupado] = useState('')
  const [busca, setBusca] = useState(''),
    [filtro, setFiltro] = useState<CenarioHub | 'todos'>('todos')
  const [puladas, setPuladas] = useState<Set<string>>(new Set())
  const [edicoes, setEdicoes] = useState<Record<string, { assunto: string; corpo: string }>>({})
  const [aberta, setAberta] = useState<MensagemHub | null>(null)
  const [mostrarAdiadas, setMostrarAdiadas] = useState(false)
  const [mostrarSemLiberados, setMostrarSemLiberados] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null),
    montado = useRef(true),
    leituraEstado = useRef<{ promessa: Promise<void>; sinal?: AbortSignal } | null>(null)
  const listaRef = useRef<HTMLElement>(null)
  const carregarEstado = useCallback((sinal?: AbortSignal) => {
    const atual = leituraEstado.current
    if (atual && !atual.sinal?.aborted) return atual.promessa
    const promessa = pedir<EstadoHub>('estado', { compacto: true }, sinal)
      .then(e => {
        if (montado.current && !sinal?.aborted) setEstado(e)
      })
      .catch(e => {
        if (montado.current && !sinal?.aborted) setErro(erroDe(e))
      })
      .finally(() => {
        if (leituraEstado.current?.promessa === promessa) leituraEstado.current = null
      })
    leituraEstado.current = { promessa, sinal }
    return promessa
  }, [])
  const carregar = useCallback(async () => {
    setErro('')
    await Promise.all([carregarEstado(), relerPreparo()])
  }, [carregarEstado, relerPreparo])
  useEffect(() => {
    const controle = new AbortController()
    montado.current = true
    void carregarEstado(controle.signal)
    return () => {
      montado.current = false
      controle.abort()
    }
  }, [carregarEstado, dia])
  useEffect(() => {
    const atualizar = () => void carregar()
    window.addEventListener('oq:hub:atualizar', atualizar)
    return () => window.removeEventListener('oq:hub:atualizar', atualizar)
  }, [carregar])
  useEffect(() => {
    if (!estado?.rodada || estado.rodada.status === 'concluida' || ocupado) return
    const controle = new AbortController()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void carregarEstado(controle.signal)
    }, 5000)
    return () => {
      clearInterval(id)
      controle.abort()
    }
  }, [estado?.rodada?.id, estado?.rodada?.status, ocupado, carregarEstado])
  useEffect(() => {
    try {
      const chaves = JSON.parse(localStorage.getItem(`oq:hub:puladas:${dia}`) ?? '[]') as string[]
      setPuladas(new Set(chaves.map(chave => chave.split(':')[0])))
    } catch {
      setPuladas(new Set())
    }
  }, [dia])
  useEffect(() => {
    if (aberta && !dialog.current?.open) dialog.current?.showModal()
    if (!aberta && dialog.current?.open) dialog.current?.close()
  }, [aberta])

  const incluidosHoje = useMemo(
    () => new Set(estado?.fila.map((x) => x.mensagem.id_usuario) ?? []),
    [estado?.fila],
  )
  const { geral, selecoes } = useMemo(() => {
    const opcoes = (preparo?.opcoes ?? [...(preparo?.prontas ?? []), ...(preparo?.adiadas ?? [])])
      .filter(m => !incluidosHoje.has(m.id_usuario))
    return {
      geral: selecionarHub(opcoes),
      selecoes: new Map(CENARIOS_HUB.map(c => [c.id, selecionarHub(opcoes, c.id)])),
    }
  }, [preparo, incluidosHoje])
  const selecao = filtro === 'todos' ? geral : selecoes.get(filtro)!
  const prontas = selecao.prontas
  const lista = useMemo(() => {
    const termo = normalizar(busca)
    return termo ? prontas.filter(m =>
      combina([m.nome, m.email, m.motivo, TIPOS[m.tipo]?.rotulo ?? 'Acompanhamento', m.assunto], termo),
    ) : prontas
  }, [prontas, busca])
  const total = geral.prontas.filter((m) => !puladas.has(m.id_usuario)).length
  const totalSelecionado = prontas.filter((m) => !puladas.has(m.id_usuario)).length
  const rodada = estado?.rodada
  const enviados = estado?.fila.filter((x) => x.status === 'enviado').length ?? 0
  const pendentes = estado?.fila.filter((x) => ['pendente', 'processando'].includes(x.status)).length ?? 0
  const falhas = estado?.fila.filter((x) => ['falhou', 'incerto'].includes(x.status)).length ?? 0
  const texto = (m: MensagemHub) => edicoes[m.chave] ?? { assunto: m.assunto, corpo: m.corpo }
  const enviadaParaFila = (m: MensagemHub) => estado?.fila.some((x) => x.mensagem.chave === m.chave) ?? false
  const erro = erroAcao || (preparoQ.erro ? erroDe(preparoQ.erro) : '')
  const preparando = preparoQ.carregando
  const podeEnviar = preparo?.dia === dia && estado?.dia === dia && estado.worker_ativo && !preparando && !ocupado && !erro
  const tituloSelecao =
    filtro === 'todos' ? 'Todos os cenários' : CENARIOS_HUB.find((c) => c.id === filtro)!.titulo
  function pular(m: MensagemHub) {
    setPuladas((atual) => {
      const p = new Set(atual)
      p.has(m.id_usuario) ? p.delete(m.id_usuario) : p.add(m.id_usuario)
      try {
        localStorage.setItem(`oq:hub:puladas:${preparo?.dia}`, JSON.stringify([...p]))
      } catch {
        /* sem armazenamento */
      }
      return p
    })
  }
  function verCenario(id: CenarioHub | 'todos') {
    setFiltro(id)
    setBusca('')
    setMostrarAdiadas(false)
    listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  async function atualizarSelecao() {
    setOcupado('atualizar')
    try {
      await carregar()
    } finally {
      setOcupado('')
    }
  }
  async function iniciar(cenario?: CenarioHub) {
    if (!podeEnviar || !preparo) return
    const selecionadas = (cenario ? selecoes.get(cenario)!.prontas : geral.prontas).filter(
      (m) => !puladas.has(m.id_usuario),
    )
    if (!selecionadas.length) return
    setOcupado('iniciar')
    setErro('')
    try {
      setEstado(
        await pedir<EstadoHub>('iniciar', {
          ...(cenario ? { cenario } : {}),
          itens: selecionadas.map((m) => ({ chave: m.chave, ...texto(m) })),
        }),
      )
      setAberta(null)
      await carregar()
    } catch (e) {
      setErro(erroDe(e))
    } finally {
      setOcupado('')
    }
  }
  async function filaAcao(acao: string) {
    if (!rodada || ocupado) return
    setOcupado(acao)
    try {
      setEstado(await pedir<EstadoHub>(acao, { id: rodada.id }))
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
      const p = await pedir<Preparo>('preparar', {
        chave: aberta.chave,
        semente: Math.floor(Math.random() * 2 ** 31),
      })
      const m = (p.opcoes ?? p.prontas ?? []).find((x) => x.chave === aberta.chave)
      if (!m || m.bloqueio) throw new Error('A situação mudou. Atualize a seleção.')
      setEdicoes((e) => ({ ...e, [m.chave]: { assunto: m.assunto, corpo: m.corpo } }))
      setAberta(m)
    } catch (e) {
      setErro(erroDe(e))
    } finally {
      setOcupado('')
    }
  }
  return (
    <div className="a3-pilha a3-pilha--larga hub">
      <Cabeca
        area="E-mails"
        titulo="Quem precisa de um e-mail hoje?"
        pergunta="Escolha o motivo, confira as mensagens e envie. Ou cuide de todos os cenários de uma vez."
      />
      {erro && (
        <Faixa tom="erro" titulo="Não foi possível concluir">
          {erro}
          <p>Atualize a seleção antes de enviar.</p>
        </Faixa>
      )}
      {estado?.worker_ativo === false && (
        <Faixa tom="aviso" titulo="Processador indisponível">
          Os envios ficam indisponíveis até o processador voltar.
        </Faixa>
      )}
      {rodada?.status === 'pausada' && (
        <Faixa tom="aviso" titulo="A fila está pausada">
          {estado?.fila.some(x => /envio_recusado_(429|401|403)/.test(x.motivo ?? '')) ? 'O provedor recusou por limite de envio ou acesso à conta. As próximas mensagens foram preservadas; confira a liberação antes de retomar.' : 'Novos cenários entram na fila, mas aguardam você retomar.'}
          <p>
            <button
              className="a3-botao a3-botao--contorno"
              disabled={!!ocupado}
              onClick={() => void filaAcao('retomar')}
            >
              Retomar fila
            </button>
          </p>
        </Faixa>
      )}
      <section className="hub-dia" aria-labelledby="hub-titulo">
        <div className="hub-dia__texto">
          <span className="a3-rotulo">
            {preparo?.dia ? diaDaSerie(preparo.dia, true) : 'Preparando o dia'}
          </span>
          <h2 id="hub-titulo">
            {preparo
              ? `${total} ${total === 1 ? 'pessoa liberada' : 'pessoas liberadas'}`
              : 'Conferindo os cenários…'}
          </h2>
          <p>
            Envie todos os cenários ou escolha só um abaixo. Uma mensagem por pessoa, com as regras conferidas
            antes de cada envio.
          </p>
          <div className="hub-garantias">
            <span>48 h entre contatos*</span>
            <span>Até 3 em 14 dias*</span>
            <span>Uma mensagem por pessoa/dia</span>
          </div>
        </div>
        <div className="hub-dia__acao">
          <button className="a3-botao" disabled={!podeEnviar || !total} onClick={() => void iniciar()}>
            <Icone nome="enviar" tamanho={18} />
            {ocupado === 'iniciar' ? 'Preparando envio…' : `Enviar todos os cenários · ${total}`}
          </button>
          <button
            className="a3-botao a3-botao--contorno"
            disabled={!!ocupado || preparando}
            onClick={() => void atualizarSelecao()}
          >
            {preparando || ocupado === 'atualizar' ? 'Atualizando…' : 'Atualizar pessoas e regras'}
          </button>
          <small>Envia apenas para quem está liberado. Quem foi pulado fica de fora.</small>
        </div>
      </section>
      <section className={`hub-numeros${rodada ? '' : ' hub-numeros--dois'}`} aria-label="Resumo de e-mails">
        <div>
          <span>Liberados agora</span>
          <strong>{preparo ? total : '—'}</strong>
          <small>pessoas, sem duplicar</small>
        </div>
        <div>
          <span>Aguardando as regras</span>
          <strong>{preparo ? geral.adiadas.length : '—'}</strong>
          <small>motivo disponível na revisão</small>
        </div>
        {rodada && (
          <>
            <div>
              <span>Na fila de hoje</span>
              <strong>{pendentes}</strong>
              <small>aguardando ou processando</small>
            </div>
            <div>
              <span>Enviados pela central</span>
              <strong>{enviados}</strong>
              <small>aceitos pelo provedor hoje</small>
            </div>
          </>
        )}
      </section>
      {!!preparo?.avisos.length && (
        <Faixa tom="aviso" titulo="Cobertura da seleção">
          {preparo.avisos.map((x) => (
            <p key={x}>{x}</p>
          ))}
        </Faixa>
      )}
      <section className="hub-cenarios" aria-labelledby="hub-cenarios-titulo">
        <div className="hub-lista__cabeca">
          <div>
            <span className="a3-rotulo">Enviar por motivo</span>
            <h2 id="hub-cenarios-titulo">Um cenário, uma ação clara.</h2>
            <p>
              Os números mostram quem pode receber agora. A mesma pessoa pode aparecer em mais de um cenário;
              depois do primeiro envio, sai dos demais.
            </p>
          </div>
        </div>
        <label className="hub-cenarios__controle">
          <input
            type="checkbox"
            checked={mostrarSemLiberados}
            onChange={(e) => setMostrarSemLiberados(e.target.checked)}
          />
          Mostrar também cenários sem pessoas liberadas
        </label>
        {preparo &&
          !CENARIOS_HUB.some((c) => selecoes.get(c.id)!.prontas.some((m) => !puladas.has(m.id_usuario))) &&
          !mostrarSemLiberados && (
            <Estado
              icone="carta"
              titulo="Nenhum cenário liberado agora"
              texto="Você pode mostrar todos os cenários para conferir as condições e os bloqueios."
            />
          )}
        {GRUPOS.filter(
          (grupo) =>
            mostrarSemLiberados ||
            !preparo ||
            CENARIOS_HUB.some(
              (c) => c.grupo === grupo && selecoes.get(c.id)!.prontas.some((m) => !puladas.has(m.id_usuario)),
            ),
        ).map((grupo) => (
          <div className="hub-grupo" key={grupo}>
            <h3>{grupo}</h3>
            <div className="hub-cenarios__grade">
              {CENARIOS_HUB.filter(
                (c) =>
                  c.grupo === grupo &&
                  (mostrarSemLiberados ||
                    !preparo ||
                    selecoes.get(c.id)!.prontas.some((m) => !puladas.has(m.id_usuario))),
              ).map((c) => {
                const s = selecoes.get(c.id)!,
                  n = s.prontas.filter((m) => !puladas.has(m.id_usuario)).length
                return (
                  <article
                    className={`hub-cenario${filtro === c.id ? ' hub-cenario--ativo' : ''}`}
                    key={c.id}
                  >
                    <div className="hub-cenario__topo">
                      <h4>{c.titulo}</h4>
                      <strong aria-label={`${n} pessoas liberadas`}>{preparo ? n : '—'}</strong>
                    </div>
                    <p>{c.descricao}</p>
                    <small>
                      {!preparo
                        ? 'Conferindo…'
                        : n
                          ? `${n} ${n === 1 ? 'pessoa liberada' : 'pessoas liberadas'}`
                          : 'Ninguém liberado agora'}
                      {s.adiadas.length ? ` · ${s.adiadas.length} aguardando regras` : ''}
                    </small>
                    <div className="hub-cenario__acoes">
                      <button className="a3-botao a3-botao--contorno" onClick={() => verCenario(c.id)}>
                        Ver pessoas e mensagens
                      </button>
                      <button
                        className="a3-botao"
                        disabled={!podeEnviar || !n}
                        onClick={() => void iniciar(c.id)}
                      >
                        Enviar cenário · {n}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        ))}
      </section>
      <section className="a3-painel hub-lista" ref={listaRef} aria-labelledby="hub-revisar-titulo">
        <div className="hub-lista__cabeca">
          <div>
            <span className="a3-rotulo">Revisar antes de enviar</span>
            <h2 id="hub-revisar-titulo">{tituloSelecao}</h2>
            <p>Leia o motivo real e a mensagem completa. Você pode ajustar o texto ou pular alguém hoje.</p>
          </div>
          <button
            className="a3-botao"
            disabled={!podeEnviar || !totalSelecionado}
            onClick={() => void iniciar(filtro === 'todos' ? undefined : filtro)}
          >
            Enviar {filtro === 'todos' ? 'todos' : 'este cenário'} · {totalSelecionado}
          </button>
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
          <select
            aria-label="Filtrar cenário"
            value={filtro}
            onChange={(e) => {
              setFiltro(e.target.value as CenarioHub | 'todos')
              setMostrarAdiadas(false)
            }}
          >
            <option value="todos">Todos os cenários</option>
            {CENARIOS_HUB.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titulo}
              </option>
            ))}
          </select>
        </div>
        {busca && (
          <p className="hub-busca__nota">
            A busca só muda a lista exibida. O botão envia o cenário inteiro; use “Pular” para excluir alguém
            hoje.
          </p>
        )}
        {!preparo && !erro ? (
          <div className="hub-vazio">
            <Carregando linhas={4} />
          </div>
        ) : !lista.length ? (
          <div className="hub-vazio">
            <Estado
              icone="carta"
              titulo="Nenhuma pessoa liberada neste recorte"
              texto={
                busca
                  ? 'Tente outro nome ou retire a busca.'
                  : 'Quando o cenário acontecer e as regras permitirem, a pessoa aparecerá aqui.'
              }
            />
          </div>
        ) : (
          <div role="list" className="hub-pessoas">
            {lista.map((m) => (
              <div
                role="listitem"
                className={`hub-pessoa${puladas.has(m.id_usuario) ? ' hub-pessoa--pulada' : ''}`}
                key={m.chave}
              >
                <span className="hub-avatar" aria-hidden="true">
                  {iniciais(m.nome)}
                </span>
                <div className="hub-pessoa__nome">
                  <strong>{m.nome}</strong>
                  <span>{m.email}</span>
                </div>
                <div className="hub-pessoa__motivo">
                  <span>{(TIPOS[m.tipo]?.rotulo ?? 'Acompanhamento')}</span>
                  <small>{m.motivo}</small>
                </div>
                <span className="hub-status">{puladas.has(m.id_usuario) ? 'Pulado hoje' : 'Liberado'}</span>
                <div className="hub-pessoa__acoes">
                  <button className="a3-botao a3-botao--contorno" onClick={() => setAberta(m)}>
                    Ver mensagem
                  </button>
                  <button
                    className="hub-pular"
                    onClick={() => pular(m)}
                    aria-label={`${puladas.has(m.id_usuario) ? 'Incluir' : 'Pular'} ${m.nome}`}
                  >
                    {puladas.has(m.id_usuario) ? 'Incluir' : 'Pular'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!!selecao.adiadas.length && (
          <div className="hub-adiadas">
            <button
              className="hub-abrir"
              aria-expanded={mostrarAdiadas}
              onClick={() => setMostrarAdiadas((x) => !x)}
            >
              <span>
                <b>{selecao.adiadas.length} pessoas aguardando</b>
                <small>Veja a regra que impede o contato agora.</small>
              </span>
              <span>{mostrarAdiadas ? 'Fechar' : 'Ver motivos'}</span>
            </button>
            {mostrarAdiadas && (
              <ul>
                {selecao.adiadas.map((m) => (
                  <li key={m.chave}>
                    <strong>{m.nome}</strong>
                    <span>{(TIPOS[m.tipo]?.rotulo ?? 'Acompanhamento')}</span>
                    <small>{m.bloqueio}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
      {rodada && (
        <section className="a3-painel hub-lista" aria-labelledby="hub-envios-titulo">
          <div className="hub-lista__cabeca">
            <div>
              <span className="a3-rotulo">Acompanhar</span>
              <h2 id="hub-envios-titulo">Envios de hoje</h2>
              <p>
                {rodada.status === 'pausada'
                  ? 'Fila pausada. Novos cenários também aguardam você retomar.'
                  : rodada.status === 'concluida'
                    ? 'Fila concluída. Você ainda pode enviar outros cenários liberados.'
                    : 'A fila continua mesmo se você fechar esta página.'}
              </p>
            </div>
            <div className="hub-cenario__acoes">
              {rodada.status !== 'concluida' && (
                <button
                  className="a3-botao a3-botao--contorno"
                  disabled={!!ocupado}
                  onClick={() => void filaAcao(rodada.status === 'pausada' ? 'retomar' : 'pausar')}
                >
                  {rodada.status === 'pausada' ? 'Retomar fila' : 'Pausar próximos envios'}
                </button>
              )}
              {estado?.fila.some((x) => x.status === 'falhou') && (
                <button
                  className="a3-botao a3-botao--contorno"
                  disabled={!!ocupado}
                  onClick={() => void filaAcao('repetir')}
                >
                  Tentar falhas confirmadas
                </button>
              )}
            </div>
          </div>
          {falhas > 0 && (
            <p className="a3-mudo">
              {falhas} envios precisam de atenção. Entrega incerta exige conferência no provedor antes de
              qualquer reenvio.
            </p>
          )}
          <div role="list" className="hub-pessoas">
            {estado?.fila.map((x) => (
              <div role="listitem" className="hub-pessoa hub-pessoa--fila" key={x.id}>
                <span className="hub-avatar" aria-hidden="true">
                  {iniciais(x.mensagem.nome)}
                </span>
                <div className="hub-pessoa__nome">
                  <strong>{x.mensagem.nome}</strong>
                  <span>{x.mensagem.email}</span>
                </div>
                <div className="hub-pessoa__motivo">
                  <span>{(TIPOS[x.mensagem.tipo]?.rotulo ?? 'Acompanhamento')}</span>
                  <small>{x.motivo ?? x.mensagem.motivo}</small>
                </div>
                <span
                  className={`hub-status${['falhou', 'incerto'].includes(x.status) ? ' hub-status--erro' : ''}`}
                >
                  {NOMES[x.status]}
                </span>
                <div className="hub-pessoa__acoes">
                  <button className="a3-botao a3-botao--contorno" onClick={() => setAberta(x.mensagem)}>
                    Ver mensagem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="a3-painel hub-auto">
        <div>
          <span className="a3-rotulo">Já automáticos</span>
          <h2>O sistema já cuida dos acontecimentos.</h2>
          <p>
            Confirmação da conta, pagamento aprovado e outros eventos seguem seus próprios gatilhos. Montar
            cronograma é opcional; não gera cobrança por e-mail.
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
        * Relatórios e avisos operacionais têm exceções de frequência. As preferências de cada pessoa são
        sempre conferidas.{' '}
        <a
          href={nav.link('todas')}
          onClick={(e) => {
            e.preventDefault()
            nav.ir('todas')
          }}
        >
          Ver modelos e regras.
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
                <span className="a3-rotulo">{(TIPOS[aberta.tipo]?.rotulo ?? 'Acompanhamento')}</span>
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
                {aberta.concorrentes.length > 0 && (
                  <p>Outros motivos para esta pessoa: {aberta.concorrentes.join(', ')}.</p>
                )}
                <p>Personalizada com: {aberta.personalizacao.join(', ') || 'o momento da pessoa'}.</p>
                <small>
                  Último contato: {aberta.ultimo_envio ? dataHora(aberta.ultimo_envio) : 'nenhum registrado'}.
                </small>
              </div>
              <PreviaCarta {...texto(aberta)} descadastro />
              {!enviadaParaFila(aberta) && (
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
                          setEdicoes((x) => ({
                            ...x,
                            [aberta.chave]: { ...texto(aberta), assunto: e.target.value },
                          }))
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
                          setEdicoes((x) => ({
                            ...x,
                            [aberta.chave]: { ...texto(aberta), corpo: e.target.value },
                          }))
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
                      {puladas.has(aberta.id_usuario) ? 'Incluir na seleção' : 'Pular hoje'}
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
