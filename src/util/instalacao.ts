import { useEffect, useState } from 'react'

/**
 * Instalar como aplicativo. O Chrome (Android e computador) dispara
 * `beforeinstallprompt` e deixa o site abrir o convite na hora certa; o
 * Safari do iPhone não tem convite, só "Compartilhar → Adicionar à Tela de
 * Início", então ali a gente mostra o caminho.
 *
 * O evento pode chegar antes de qualquer componente montar, por isso é
 * capturado aqui, no carregamento do módulo.
 */
interface ConviteInstalacao extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let convite: ConviteInstalacao | null = null
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault()
    convite = evento as ConviteInstalacao
    avisar()
  })
  window.addEventListener('appinstalled', () => { convite = null; avisar() })
}

export function rodandoComoApp(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** iPhone/iPad no Safari (no iOS, Chrome e outros também podem adicionar à tela, mas pelo mesmo menu). */
export function ehIos(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

export type ModoInstalacao = 'convite' | 'ios' | null

export function usarInstalacao() {
  const [, atualizar] = useState(0)
  useEffect(() => {
    const f = () => atualizar((n) => n + 1)
    ouvintes.add(f)
    return () => { ouvintes.delete(f) }
  }, [])
  const modo: ModoInstalacao = rodandoComoApp() ? null : convite ? 'convite' : ehIos() ? 'ios' : null
  const instalar = async () => {
    if (!convite) return false
    const atual = convite
    await atual.prompt()
    const { outcome } = await atual.userChoice
    convite = null
    avisar()
    return outcome === 'accepted'
  }
  return { modo, instalar }
}

/** Registra o service worker. Só no site publicado: no desenvolvimento ele atrapalharia o recarregamento. */
export function registrarServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => { /* sem app offline, o site segue normal */ })
  })
}
