/*
 * Service worker do OrtoQuestões: deixa o site abrir como aplicativo e
 * funcionar com a rede ruim, sem nunca prender ninguém numa versão velha.
 *
 * - Páginas (index.html e as páginas públicas): rede primeiro; o cache só
 *   entra quando não há conexão.
 * - assets/ (nome com hash, nunca muda): cache primeiro.
 * - acervo/ e imagens/: rede primeiro, com cópia para uso offline.
 * - Outros domínios (Supabase, Mercado Pago): não passam por aqui.
 */
const VERSAO = 'oq-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nome of await caches.keys()) if (nome !== VERSAO) await caches.delete(nome)
    await self.clients.claim()
  })())
})

async function redePrimeiro(pedido) {
  const cache = await caches.open(VERSAO)
  try {
    const resposta = await fetch(pedido)
    if (resposta.ok) cache.put(pedido, resposta.clone())
    return resposta
  } catch (erro) {
    const salva = await cache.match(pedido, { ignoreSearch: pedido.mode === 'navigate' })
    if (salva) return salva
    if (pedido.mode === 'navigate') {
      const inicio = await cache.match('./')
      if (inicio) return inicio
    }
    throw erro
  }
}

async function cachePrimeiro(pedido) {
  const cache = await caches.open(VERSAO)
  const salva = await cache.match(pedido)
  if (salva) return salva
  const resposta = await fetch(pedido)
  if (resposta.ok) cache.put(pedido, resposta.clone())
  return resposta
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  if (pedido.method !== 'GET') return
  const url = new URL(pedido.url)
  if (url.origin !== self.location.origin) return
  const caminho = url.pathname.slice(new URL(self.registration.scope).pathname.length)
  if (caminho.startsWith('assets/')) evento.respondWith(cachePrimeiro(pedido))
  else if (pedido.mode === 'navigate' || caminho.startsWith('acervo/') || caminho.startsWith('imagens/')) evento.respondWith(redePrimeiro(pedido))
})
