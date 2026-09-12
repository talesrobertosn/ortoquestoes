import type { SupabaseClient } from '@supabase/supabase-js'
import { EVENTO_DADOS, gravar, ler, usuarioLocal, type MudancaDados } from '../estado/armazenamento'
import { deItens, ehTipoSync, estadoVazio, identificador, itens, receberDocumento, registrarAlteracoes, type Alteracao, type Documento, type EstadoSync, type TipoSync } from './modeloSync'

export interface StatusSync { estado: 'sincronizando' | 'salvo' | 'offline' | 'erro' | 'conflito'; pendentes: number; conflitos: Documento[]; pronto: boolean }
/** Somente uma fila por conta/aba. Operações são idempotentes e conflitos nunca sobrescrevem dados silenciosamente. */
export function iniciarSincronizacao(cliente: SupabaseClient, idUsuario: string, notificar: (s: StatusSync) => void) {
  let estado = ler<EstadoSync>('sincronia:v1', estadoVazio())
  let ativo = true, executando = false, pronto = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const valido = () => ativo && usuarioLocal() === idUsuario
  const salvar = () => { if (valido()) gravar('sincronia:v1', estado, 'nuvem') }
  const anunciar = (s: StatusSync['estado']) => {
    if (valido()) notificar({ estado: s, pendentes: Object.keys(estado.pendentes).length, conflitos: Object.values(estado.conflitos), pronto })
  }
  function aplicar(documentos: Documento[], enviadas: Alteracao[] = []) {
    const mapas = new Map<TipoSync, Record<string, unknown>>()
    for (const doc of documentos) {
      const enviada = enviadas.find(e => e.tipo === doc.tipo && e.item === doc.item)
      if (!receberDocumento(estado, doc, enviada)) continue
      const mapa = mapas.get(doc.tipo) ?? itens(doc.tipo, ler(doc.tipo, null))
      mapa[doc.item] = doc.valor
      mapas.set(doc.tipo, mapa)
    }
    for (const [tipo, mapa] of mapas) gravar(tipo, deItens(tipo, mapa), 'nuvem')
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
      // Primeiro recebe: detecta conflitos antes de enviar alterações feitas offline.
      while (valido()) {
        const { data, error } = await cliente.from('progresso_usuario').select('tipo,item,valor,versao,operacao').eq('usuario_id', idUsuario).gt('versao', estado.cursor).order('versao').limit(500)
        if (!valido()) return
        if (error) throw error
        const documentos = (data ?? []) as Documento[]
        aplicar(documentos)
        if (documentos.length) estado.cursor = Math.max(estado.cursor, ...documentos.map(d => d.versao))
        salvar()
        if (documentos.length < 500) break
      }
      pronto = true
      const fila = Object.values(estado.pendentes).filter(p => !estado.conflitos[identificador(p.tipo, p.item)]).slice(0, 100)
      if (fila.length) {
        const { data, error } = await cliente.rpc('sincronizar_progresso', { alteracoes: fila })
        if (!valido()) return
        if (error) throw error
        aplicar((data ?? []) as Documento[], fila)
        salvar()
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
    registrarAlteracoes(estado, m.chave, m.antes, m.valor); salvar(); anunciar(navigator.onLine ? 'sincronizando' : 'offline'); agendar()
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
  const intervalo = setInterval(aoVoltar, 30000)
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
