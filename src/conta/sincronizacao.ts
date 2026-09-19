import type { SupabaseClient } from '@supabase/supabase-js'
import { EVENTO_DADOS, gravar, ler, limparTudo, usuarioLocal, type MudancaDados } from '../estado/armazenamento'
import { deItens, ehTipoSync, estadoVazio, identificador, itens, receberDocumento, registrarAlteracoes, TIPOS_SYNC, type Alteracao, type Documento, type EstadoSync, type TipoSync } from './modeloSync'

export interface StatusSync { estado: 'sincronizando' | 'salvo' | 'offline' | 'erro' | 'conflito'; pendentes: number; conflitos: Documento[]; pronto: boolean }
/** Somente uma fila por conta/aba. Operações são idempotentes e conflitos nunca sobrescrevem dados silenciosamente. */
export function iniciarSincronizacao(cliente: SupabaseClient, idUsuario: string, notificar: (s: StatusSync) => void) {
  let estado = ler<EstadoSync>('sincronia:v1', estadoVazio())
  let ativo = true, executando = false, pronto = false
  const conhecidos = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  const valido = () => ativo && usuarioLocal() === idUsuario
  const salvar = () => { if (valido()) gravar('sincronia:v1', estado, 'nuvem') }
  const anunciar = (s: StatusSync['estado']) => {
    if (valido()) notificar({ estado: s, pendentes: Object.keys(estado.pendentes).length, conflitos: Object.values(estado.conflitos), pronto })
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
          estado.pendentes[id] = { tipo, item, valor, base: 0, operacao: crypto.randomUUID() }
        }
      }
    }
  }
  function agendar() {
    if (!valido()) return
    clearTimeout(timer)
    timer = setTimeout(() => { void sincronizar() }, 1200)
  }
  async function sincronizar() {
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
      // Primeiro recebe: reconcilia todas as linhas antes de enviar alterações
      // locais. O número da versão é global entre tipos; usar apenas `gt(cursor)`
      // pode deixar respostas para trás quando favoritos e respostas chegam em
      // ordens diferentes nos dispositivos.
      let pagina = 0
      const recebidos: Documento[] = []
      while (valido()) {
        const { data, error } = await cliente.from('progresso_usuario').select('tipo,item,valor,versao,operacao').eq('usuario_id', idUsuario).order('versao').range(pagina, pagina + 499)
        if (!valido()) return
        if (error) throw error
        const documentos = (data ?? []) as Documento[]
        recebidos.push(...documentos)
        if (documentos.length) estado.cursor = Math.max(estado.cursor, ...documentos.map(d => d.versao))
        salvar()
        if (documentos.length < 500) break
        pagina += 500
      }
      aplicar(recebidos)
      semearLocais()
      salvar()
      pronto = true
      const fila = Object.values(estado.pendentes).filter(p => !estado.conflitos[identificador(p.tipo, p.item)]).slice(0, 100)
      if (fila.length) {
        const remotas = fila.map(p => ({ ...p, item: estado.reinicio ? `r${estado.reinicio}:${p.item}` : p.item }))
        const { data, error } = await cliente.rpc('sincronizar_progresso', { alteracoes: remotas })
        if (!valido()) return
        if (error) {
          // Compatibilidade com projetos que ainda não aplicaram a função RPC:
          // as políticas RLS continuam limitando cada linha ao titular.
          const linhas = remotas.map(p => ({ usuario_id: idUsuario, tipo: p.tipo, item: p.item, valor: p.valor, operacao: p.operacao }))
          const direto = await cliente.from('progresso_usuario').upsert(linhas, { onConflict: 'usuario_id,tipo,item' }).select('tipo,item,valor,versao,operacao')
          if (!valido()) return
          if (direto.error) throw error
          aplicar((direto.data ?? []) as Documento[], fila)
          salvar()
        } else {
          aplicar((data ?? []) as Documento[], fila)
          salvar()
        }
      }
      const conflitos = Object.keys(estado.conflitos).length
      const pendentes = Object.keys(estado.pendentes).length
      anunciar(conflitos ? 'conflito' : pendentes ? 'sincronizando' : 'salvo')
      if (Object.values(estado.pendentes).some(p => !estado.conflitos[identificador(p.tipo, p.item)])) agendar()
    } catch { anunciar(navigator.onLine ? 'erro' : 'offline') }
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
  window.addEventListener(EVENTO_DADOS, aoGravar)
  window.addEventListener('storage', outraAba)
  window.addEventListener('online', aoVoltar)
  document.addEventListener('visibilitychange', aoVoltar)
  // Mantém os dispositivos próximos em poucos segundos mesmo quando a aba fica aberta
  // sem trocar de visibilidade. A sincronização continua leve: só lê as linhas da própria conta.
  const intervalo = setInterval(aoVoltar, 5000)
  void sincronizar()
  return {
    sincronizar,
    resolver(doc: Documento, manterLocal: boolean) {
      const key = identificador(doc.tipo, doc.item)
      if (!valido() || !estado.conflitos[key]) return
      if (manterLocal && estado.pendentes[key]) {
        estado.pendentes[key].base = doc.versao
        estado.pendentes[key].operacao = crypto.randomUUID()
      } else {
        delete estado.pendentes[key]
        aplicar([doc])
      }
      delete estado.conflitos[key]; salvar(); void sincronizar()
    },
    parar() {
      ativo = false; clearTimeout(timer); clearInterval(intervalo)
      window.removeEventListener(EVENTO_DADOS, aoGravar); window.removeEventListener('storage', outraAba)
      window.removeEventListener('online', aoVoltar); document.removeEventListener('visibilitychange', aoVoltar)
    },
  }
}
