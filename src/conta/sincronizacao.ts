import type { ClienteSupabase } from './supabase'
import { EVENTO_DADOS, gravar, ler, limparTudo, usuarioLocal, type MudancaDados } from '../estado/armazenamento'
import { deItens, ehTipoSync, estadoVazio, identificador, itens, receberDocumento, registrarAlteracoes, resolverConflito, TIPOS_SYNC, type Alteracao, type Documento, type EstadoSync, type TipoSync } from './modeloSync'
import { gerarId } from '../util/id'

/** A função `sincronizar_progresso` não existe neste banco (migração ainda não colada). */
function rpcAusente(erro: { code?: string; message?: string } | null, status?: number): boolean {
  if (!erro) return false
  return status === 404 || erro.code === 'PGRST202' || erro.code === '42883' || /could not find the function/i.test(erro.message ?? '')
}

/** Linhas por página na leitura (igual ao limite que a função aceita sem cortar). */
const PAGINA = 500
/** Com a leitura incremental, a conferência completa vira rede de segurança rara. */
const RECONCILIAR_A_CADA = 30 * 60_000
/** Intervalo com a aba visível. Trocar de aba ou de aparelho já sincroniza na hora. */
const INTERVALO = 30_000

export interface StatusSync { estado: 'sincronizando' | 'salvo' | 'offline' | 'erro' | 'conflito'; pendentes: number; conflitos: Documento[]; pronto: boolean; detalhe?: string; rejeitados: { id: string; tipo: TipoSync; item: string; erro: string; em: number }[] }
/** Somente uma fila por conta/aba. Operações são idempotentes e conflitos nunca sobrescrevem dados silenciosamente. */
export function iniciarSincronizacao(cliente: ClienteSupabase, idUsuario: string, notificar: (s: StatusSync) => void) {
  let estado = ler<EstadoSync>('sincronia:v1', estadoVazio())
  let ativo = true, executando = false, pronto = false
  const conhecidos = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  // Leitura incremental (parte 24 do SQL): só as linhas com versão acima do
  // cursor. A primeira leitura de cada sessão, a volta do offline e uma vez a
  // cada RECONCILIAR_A_CADA releem tudo, como antes.
  let leituraIncremental = true
  let reconciliar = true
  let ultimaCompleta = 0
  const valido = () => ativo && usuarioLocal() === idUsuario
  const salvar = () => { if (valido()) gravar('sincronia:v1', estado, 'nuvem') }
  let detalhe: string | undefined
  const anunciar = (s: StatusSync['estado']) => {
    if (valido()) notificar({ estado: s, pendentes: Object.keys(estado.pendentes).length, conflitos: Object.values(estado.conflitos), pronto, detalhe: s === 'erro' ? detalhe : undefined, rejeitados: Object.entries(estado.rejeitados ?? {}).map(([id, r]) => ({ id, tipo: r.tipo, item: r.item, erro: r.erro, em: r.em })) })
  }
  const descrever = (erro: unknown) => {
    const e = erro as { message?: string; code?: string; details?: string; hint?: string; name?: string } | null
    return [e?.code, e?.message ?? (erro instanceof Error ? erro.message : String(erro)), e?.details, e?.hint].filter(Boolean).join(' · ').slice(0, 300)
  }
  const prefixar = (p: Alteracao) => ({ ...p, item: estado.reinicio ? `r${estado.reinicio}:${p.item}` : p.item })
  /** Envia um lote; o caminho direto (RLS) fica só para banco sem a função. */
  async function enviar(lote: Alteracao[]): Promise<{ docs: Documento[] } | { erro: unknown; transitorio?: boolean }> {
    const remotas = lote.map(prefixar)
    const { data, error, status } = await cliente.rpc('sincronizar_progresso', { alteracoes: remotas })
    if (!error) return { docs: (data ?? []) as Documento[] }
    // A gravação direta não confere a versão e apagaria o que outro aparelho
    // salvou. Ela só serve para bancos que ainda não têm a função instalada.
    if (!rpcAusente(error, status)) return { erro: error, transitorio: status === 0 || status === 408 || status === 429 || status >= 500 }
    const linhas = remotas.map(p => ({ usuario_id: idUsuario, tipo: p.tipo, item: p.item, valor: p.valor, operacao: p.operacao }))
    const direto = await cliente.from('progresso_usuario').upsert(linhas, { onConflict: 'usuario_id,tipo,item' }).select('tipo,item,valor,versao,operacao')
    if (!direto.error) return { docs: (direto.data ?? []) as Documento[] }
    return { erro: direto.error ?? error }
  }
  function aplicar(documentos: Documento[], enviadas: Alteracao[] = []) {
    // O marcador é a fonte de verdade para o comando de zerar a conta.
    // Ele permite que dispositivos que estavam offline também descartem o cache antigo.
    const marcador = documentos.filter(d => d.tipo === 'historico' && (d.item === '__reinicio__' || d.item.startsWith('reinicio.v2.'))).sort((a, b) => b.versao - a.versao)[0]
    if (marcador && marcador.versao > estado.reinicio) {
      limparTudo('nuvem')
      estado = { ...estadoVazio(), cursor: estado.cursor, reinicio: marcador.versao }
      salvar()
    }
    if (marcador && marcador.versao === estado.reinicio) {
      // Guarda quando foi o reinício: gráficos que leem o histórico de cada
      // questão ignoram o que veio antes dele.
      const bruto = Number((marcador.valor as { concluidaEm?: number } | null)?.concluidaEm ?? 0)
      const em = bruto > 0 && bruto < 1e12 ? bruto * 1000 : bruto
      if (em && ler<number>('reinicio:em', 0) !== em) gravar('reinicio:em', em, 'nuvem')
    }
    const mapas = new Map<TipoSync, Record<string, unknown>>()
    for (const remoto of documentos) {
      if (remoto.tipo === 'historico' && (remoto.item === '__reinicio__' || remoto.item.startsWith('reinicio.v2.'))) continue
      const prefixo = `r${estado.reinicio}:`
      // Cada reinício tem seu próprio conjunto de linhas. Dispositivos com
      // cache antigo não conseguem reativar documentos de outra geração.
      if (estado.reinicio && !remoto.item.startsWith(prefixo)) continue
      const doc = estado.reinicio ? { ...remoto, item: remoto.item.slice(prefixo.length) } : remoto
      conhecidos.add(identificador(doc.tipo, doc.item))
      const enviada = enviadas.find(e => e.tipo === doc.tipo && e.item === doc.item)
      if (!receberDocumento(estado, doc, enviada)) continue
      const mapa = mapas.get(doc.tipo) ?? itens(doc.tipo, ler(doc.tipo, null))
      mapa[doc.item] = doc.valor
      mapas.set(doc.tipo, mapa)
    }
    for (const [tipo, mapa] of mapas) gravar(tipo, deItens(tipo, mapa), 'nuvem')
  }
  function semearLocais() {
    // Uma pessoa pode ter estudado antes de criar a conta. Esses itens não
    // aparecem como eventos retroativos, então entram na fila no primeiro sync.
    for (const tipo of TIPOS_SYNC) {
      const locais = itens(tipo, ler(tipo, null))
      for (const [item, valor] of Object.entries(locais)) {
        const id = identificador(tipo, item)
        if (!conhecidos.has(id) && !estado.versoes[id] && !estado.pendentes[id]) {
          estado.pendentes[id] = { tipo, item, valor, base: 0, operacao: gerarId() }
        }
      }
    }
  }
  /**
   * Lê o progresso da conta. Com a função `ler_progresso_desde` (parte 24),
   * pede só o que mudou desde o cursor; a função espera as gravações em
   * andamento da conta, então nenhuma versão menor aparece depois. Sem ela
   * (SQL ainda não colado), lê todas as linhas como sempre fez, e as próximas
   * leituras desta página também serão completas.
   */
  async function receber(completa: boolean): Promise<{ docs: Documento[]; cursor: number } | undefined> {
    const docs: Documento[] = []
    if (leituraIncremental) {
      let cursor = completa ? 0 : estado.cursor
      for (;;) {
        const { data, error, status } = await cliente.rpc('ler_progresso_desde', { p_cursor: cursor, p_limite: PAGINA })
        if (!valido()) return undefined
        if (error) {
          if (!rpcAusente(error, status)) throw error
          // Banco sem a parte 24: volta à leitura completa até recarregar a página.
          leituraIncremental = false
          docs.length = 0
          break
        }
        const pagina = (data ?? []) as Documento[]
        docs.push(...pagina)
        for (const d of pagina) if (d.versao > cursor) cursor = d.versao
        if (pagina.length < PAGINA) return { docs, cursor }
      }
    }
    let pagina = 0
    while (valido()) {
      const { data, error } = await cliente.from('progresso_usuario').select('tipo,item,valor,versao,operacao').eq('usuario_id', idUsuario).order('versao').range(pagina, pagina + PAGINA - 1)
      if (!valido()) return undefined
      if (error) throw error
      const documentos = (data ?? []) as Documento[]
      docs.push(...documentos)
      if (documentos.length < PAGINA) break
      pagina += PAGINA
    }
    if (!valido()) return undefined
    return { docs, cursor: docs.reduce((m, d) => Math.max(m, d.versao), 0) }
  }
  function agendar() {
    if (!valido()) return
    clearTimeout(timer)
    timer = setTimeout(() => { void sincronizar() }, 1200)
  }
  /**
   * Com várias abas abertas, uma sincroniza por vez (Web Locks). A outra tenta
   * de novo logo depois e, como lê do cursor, só recebe o que ainda falta.
   * Navegadores sem Web Locks seguem como antes.
   */
  async function sincronizar(): Promise<void> {
    if (!valido() || executando) return
    const travas = (navigator as Navigator & { locks?: LockManager }).locks
    if (!navigator.onLine || typeof travas?.request !== 'function') return ciclo()
    await travas.request(`ortoquestoes:sincronia:${idUsuario}`, { ifAvailable: true }, async trava => {
      if (!trava) { agendar(); return }
      await ciclo()
    })
  }
  async function ciclo() {
    if (!valido() || executando) return
    if (!navigator.onLine) { anunciar('offline'); return }
    executando = true; anunciar('sincronizando')
    try {
      // Um reinício local pendente impede a importação do histórico anterior.
      // O token persistido torna a repetição segura depois de falha ou F5.
      const reinicio = ler<string | null>('reinicio:pendente', null)
      if (reinicio) {
        const itemReinicio = `reinicio.v2.${reinicio}`
        const consulta = await cliente.from('progresso_usuario').select('tipo,item,valor,versao,operacao').eq('usuario_id', idUsuario).eq('tipo', 'historico').eq('item', itemReinicio)
        if (!valido()) return
        if (consulta.error) throw consulta.error
        let marcador = (consulta.data ?? [])[0] as Documento | undefined
        if (marcador?.operacao !== reinicio) {
          const alteracao = { tipo: 'historico', item: itemReinicio, valor: { id: itemReinicio, descricao: 'Reinício do progresso', concluidaEm: Date.now() }, base: marcador?.versao ?? 0, operacao: reinicio }
          const resposta = await cliente.rpc('sincronizar_progresso', { alteracoes: [alteracao] })
          if (!valido()) return
          if (resposta.error && !rpcAusente(resposta.error, resposta.status)) throw resposta.error
          if (resposta.error) {
            const direto = await cliente.from('progresso_usuario').upsert({ usuario_id: idUsuario, tipo: alteracao.tipo, item: alteracao.item, valor: alteracao.valor, operacao: reinicio }, { onConflict: 'usuario_id,tipo,item' }).select('tipo,item,valor,versao,operacao')
            if (!valido()) return
            if (direto.error) throw direto.error
            marcador = (direto.data ?? [])[0] as Documento | undefined
          } else marcador = (resposta.data ?? [])[0] as Documento | undefined
        }
        if (!marcador || marcador.operacao !== reinicio) throw new Error('Reinício ainda não confirmado')
        // As respostas dadas depois do clique em zerar devem ser preservadas.
        estado.reinicio = marcador.versao
        salvar()
        gravar('reinicio:pendente', null, 'nuvem')
      }
      // Primeiro recebe, depois envia: as alterações locais saem já com a base
      // da versão que o servidor tem.
      // Conflitos guardados de versões anteriores: resolve e deixa o recebimento abaixo aplicar.
      for (const [id, doc] of Object.entries(estado.conflitos)) resolverConflito(estado, id, doc)
      const completa = reconciliar || Date.now() - ultimaCompleta > RECONCILIAR_A_CADA
      const referencia = estado
      const recebidos = await receber(completa)
      if (!recebidos || !valido()) return
      aplicar(recebidos.docs)
      // O cursor só avança junto com as versões aplicadas, no mesmo salvar():
      // se outra aba regravar um estado mais antigo, cursor e versões voltam
      // juntos e a próxima leitura relê o que faltou. Se o estado foi trocado
      // durante uma leitura parcial (outra aba, reinício), o cursor fica como
      // está e a próxima leitura repete as linhas, o que não tem efeito.
      if (completa || estado === referencia) estado.cursor = recebidos.cursor
      if (completa) { reconciliar = false; ultimaCompleta = Date.now() }
      semearLocais()
      salvar()
      pronto = true
      const fila = Object.values(estado.pendentes).filter(p => !estado.conflitos[identificador(p.tipo, p.item)]).slice(0, 100)
      if (fila.length) {
        const resultado = await enviar(fila)
        if (!valido()) return
        if ('docs' in resultado) {
          aplicar(resultado.docs, fila)
        } else {
          // Um único item recusado (formato antigo, dado corrompido) não pode
          // prender a fila inteira: reenvia um por um e separa só o que falhar.
          // Rede ou servidor fora do ar não é culpa de nenhum item: a fila
          // fica intacta e tenta de novo no próximo ciclo.
          if (resultado.transitorio) throw resultado.erro
          detalhe = descrever(resultado.erro)
          for (const alteracao of fila) {
            const individual = await enviar([alteracao])
            if (!valido()) return
            if ('docs' in individual) { aplicar(individual.docs, [alteracao]); salvar(); continue }
            if (individual.transitorio) throw individual.erro
            const id = identificador(alteracao.tipo, alteracao.item)
            estado.rejeitados = { ...(estado.rejeitados ?? {}), [id]: { tipo: alteracao.tipo, item: alteracao.item, valor: alteracao.valor, erro: descrever(individual.erro), em: Date.now() } }
            delete estado.pendentes[id]
          }
        }
        salvar()
      }
      const conflitos = Object.keys(estado.conflitos).length
      const pendentes = Object.keys(estado.pendentes).length
      anunciar(conflitos ? 'conflito' : pendentes ? 'sincronizando' : 'salvo')
      if (Object.values(estado.pendentes).some(p => !estado.conflitos[identificador(p.tipo, p.item)])) agendar()
      detalhe = undefined
    } catch (erro) { detalhe = descrever(erro); anunciar(navigator.onLine ? 'erro' : 'offline') }
    finally { executando = false }
  }
  function aoGravar(evento: Event) {
    const m = (evento as CustomEvent<MudancaDados>).detail
    if (!valido() || m.usuario !== idUsuario || m.origem !== 'local' || !ehTipoSync(m.chave)) return
    registrarAlteracoes(estado, m.chave, m.antes, m.valor); salvar(); anunciar(navigator.onLine ? 'sincronizando' : 'offline')
    // Envia enquanto a aba ainda está em primeiro plano. O Chrome móvel pode
    // congelar timers quando o usuário troca de aplicativo ou de aba.
    void sincronizar(); agendar()
  }
  // Outra aba pode ter enfileirado operações: recarrega o estado persistido antes de sincronizar.
  function outraAba(evento: StorageEvent) {
    if (!valido() || evento.key !== `ortoquestoes:conta:${idUsuario}:sincronia:v1`) return
    estado = ler<EstadoSync>('sincronia:v1', estadoVazio()); agendar()
  }
  const aoVoltar = () => { if (document.visibilityState === 'visible') void sincronizar() }
  // Voltando do offline, relê tudo uma vez: é a rede de segurança da leitura incremental.
  const aoReconectar = () => { reconciliar = true; aoVoltar() }
  window.addEventListener(EVENTO_DADOS, aoGravar)
  window.addEventListener('storage', outraAba)
  window.addEventListener('online', aoReconectar)
  document.addEventListener('visibilitychange', aoVoltar)
  // Mantém os dispositivos próximos mesmo quando a aba fica aberta sem trocar de
  // visibilidade. Cada volta só lê o que mudou desde o cursor; trocar de aba,
  // de aplicativo ou de aparelho sincroniza na hora pelo visibilitychange.
  const intervalo = setInterval(aoVoltar, INTERVALO)
  void sincronizar()
  return {
    sincronizar,
    /** Devolve à fila os itens recusados (por exemplo, depois de uma correção no servidor). */
    reenviarRejeitados() {
      if (!valido() || !estado.rejeitados) return
      for (const [id, r] of Object.entries(estado.rejeitados)) {
        estado.pendentes[id] = { tipo: r.tipo, item: r.item, valor: r.valor, base: estado.versoes[id] ?? 0, operacao: gerarId() }
      }
      estado.rejeitados = {}
      salvar(); void sincronizar()
    },
    descartarRejeitados() {
      if (!valido()) return
      estado.rejeitados = {}
      salvar(); anunciar('salvo')
    },
    resolver(doc: Documento, manterLocal: boolean) {
      const key = identificador(doc.tipo, doc.item)
      if (!valido() || !estado.conflitos[key]) return
      if (manterLocal && estado.pendentes[key]) {
        estado.pendentes[key].base = doc.versao
        estado.pendentes[key].operacao = gerarId()
      } else {
        delete estado.pendentes[key]
        aplicar([doc])
      }
      delete estado.conflitos[key]; salvar(); void sincronizar()
    },
    parar() {
      ativo = false; clearTimeout(timer); clearInterval(intervalo)
      window.removeEventListener(EVENTO_DADOS, aoGravar); window.removeEventListener('storage', outraAba)
      window.removeEventListener('online', aoReconectar); document.removeEventListener('visibilitychange', aoVoltar)
    },
  }
}
