import { useEffect, useState } from 'react'
import type { User } from '@supabase/auth-js'
import { chave, supabase, url, type ClienteSupabase } from './supabase'
import { dadosAceiteTermos, VERSAO_TERMOS } from './termos'
import { dadosOrigem } from './origem'
import { eventoMeta } from './consentimento'

/**
 * Entrar com o Google (OAuth pelo Supabase, fluxo PKCE).
 *
 * O botão só aparece quando o provedor Google está ligado no painel do
 * Supabase: a configuração pública do Auth (/auth/v1/settings) diz isso, então
 * ligar ou desligar o Google lá não pede nova publicação do site.
 *
 * A volta do Google chega em ?conta=google&code=...; o cliente troca o código
 * pela sessão sozinho (detectSessionInUrl) e ContextoConta leva a pessoa de
 * volta para onde estava antes de tocar no botão.
 */

const PEDIDO = 'ortoquestoes:google-pedido'

let disponivel: Promise<boolean> | null = null
function consultarDisponivel(): Promise<boolean> {
  if (!supabase) return Promise.resolve(false)
  disponivel ??= fetch(`${url.replace(/\/+$/, '')}/auth/v1/settings`, { headers: { apikey: chave } })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => Boolean(j?.external?.google))
    .catch(() => false)
  return disponivel
}

export function usarGoogleDisponivel(): boolean {
  const [ligado, definir] = useState(false)
  useEffect(() => {
    let ativo = true
    void consultarDisponivel().then((v) => { if (ativo) definir(v) })
    return () => { ativo = false }
  }, [])
  return ligado
}

export async function entrarComGoogle(): Promise<string | null> {
  if (!supabase) return 'Contas indisponíveis no momento.'
  const rota = window.location.hash.replace(/^#/, '') || '/'
  try {
    sessionStorage.setItem(PEDIDO, JSON.stringify({ voltarPara: rota.startsWith('/conta') ? '/' : rota, em: Date.now() }))
  } catch { /* armazenamento indisponível: volta para o início */ }
  const retorno = new URL(window.location.pathname, window.location.origin)
  retorno.searchParams.set('conta', 'google')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: retorno.href, queryParams: { prompt: 'select_account' } },
  })
  return error ? 'Não foi possível abrir o login do Google agora. Tente de novo em instantes.' : null
}

interface Pedido { voltarPara: string; em: number }
function lerPedido(): Pedido | null {
  try {
    const bruto = sessionStorage.getItem(PEDIDO)
    sessionStorage.removeItem(PEDIDO)
    const pedido = bruto ? (JSON.parse(bruto) as Pedido) : null
    // Pedido de mais de uma hora atrás não vale mais (aba esquecida aberta).
    return pedido && Date.now() - pedido.em < 3_600_000 ? pedido : null
  } catch { return null }
}

/**
 * Depois da volta do Google: grava o aceite dos Termos (o botão avisa que
 * continuar é concordar com eles) e aproveita o nome que o Google entrega para
 * o perfil, o ranking e os e-mails. Devolve a rota para onde levar a pessoa.
 */
export function concluirGoogle(cliente: ClienteSupabase, usuario: User | null): string {
  const pedido = lerPedido()
  if (usuario && pedido) void completarPerfil(cliente, usuario)
  return pedido?.voltarPara || '/'
}

async function completarPerfil(cliente: ClienteSupabase, usuario: User) {
  const m = (usuario.user_metadata ?? {}) as Record<string, unknown>
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const completo = texto(m.full_name) || texto(m.name)
  const partes = completo.split(/\s+/).filter(Boolean)
  const dados: Record<string, unknown> = {}
  if (!texto(m.nome)) {
    const nome = texto(m.given_name) || partes[0] || ''
    if (nome) dados.nome = nome
  }
  if (!texto(m.sobrenome)) {
    const sobrenome = texto(m.family_name) || partes.slice(1).join(' ')
    if (sobrenome) dados.sobrenome = sobrenome
  }
  if (m.termos_versao !== VERSAO_TERMOS) Object.assign(dados, dadosAceiteTermos())
  // Conta nova pelo Google (criada agora há pouco): registra a origem e conta o cadastro.
  // Contas antigas não ganham origem, para não parecerem vindas do anúncio de hoje.
  const nova = Date.now() - Date.parse(usuario.created_at ?? '') < 86_400_000
  if (nova && !m.origem) {
    Object.assign(dados, dadosOrigem())
    eventoMeta('CompleteRegistration', { content_name: 'google' })
  }
  if (!Object.keys(dados).length) return
  try { await cliente.auth.updateUser({ data: dados }) } catch { /* tenta de novo no próximo login */ }
}

export function textoErroGoogle(codigo: string): string {
  if (codigo === 'access_denied') return 'O login com o Google foi cancelado. Você pode tentar de novo ou entrar com e-mail e senha.'
  return 'Não foi possível entrar com o Google agora. Tente de novo ou entre com e-mail e senha.'
}
