/*
 * Service worker do OrtoQuestões: deixa o site abrir como aplicativo e
 * funcionar com a rede ruim, sem nunca prender ninguém numa versão velha.
 *
 * - Páginas (index.html e as páginas públicas): rede primeiro; o cache só
 *   entra quando não há conexão. Assim o app aberto é sempre o publicado, e
 *   os arquivos que ele pede (com hash no nome) são os dele.
 * - assets/ (nome com hash, nunca muda): cache primeiro.
 * - acervo/ (índice, questões e comentários): rede com prazo. Com a rede boa,
 *   vem sempre a versão publicada; se a rede demorar mais que PRAZO_ACERVO e
 *   houver cópia guardada, a cópia responde na hora e a resposta da rede, quando
 *   chegar, atualiza a cópia para a próxima vez (stale-while-revalidate só
 *   quando a rede está lenta). Sem rede, a cópia.
 * - Artes do site (imagens/, emblemas/, ranking/, pixel/, mascote/, marca/):
 *   stale-while-revalidate. Mudam raramente; a cópia guardada responde na hora
 *   e a rede a renova em segundo plano.
 * - Outros domínios (Supabase, Mercado Pago): não passam por aqui.
 */
const VERSAO = 'oq-v1'
const PRAZO_ACERVO = 2500
// Arquivos com hash que ninguém pede há tanto tempo são de versões antigas do site.
const VALIDADE_ASSETS = 45 * 24 * 3600 * 1000

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nome of await caches.keys()) if (nome !== VERSAO) await caches.delete(nome)
    await self.clients.claim()
    await podarAssetsAntigos().catch(() => undefined)
  })())
})

async function podarAssetsAntigos() {
  const cache = await caches.open(VERSAO)
  const agora = Date.now()
  for (const pedido of await cache.keys()) {
    if (!new URL(pedido.url).pathname.includes('/assets/')) continue
    const resposta = await cache.match(pedido)
    const data = Date.parse(resposta?.headers.get('date') ?? '')
    if (Number.isFinite(data) && agora - data > VALIDADE_ASSETS) await cache.delete(pedido)
  }
}

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

/** Guarda a cópia sem segurar a resposta (a página não espera a gravação). */
function guardar(evento, cache, pedido, resposta) {
  if (resposta.ok) evento.waitUntil(cache.put(pedido, resposta.clone()).catch(() => undefined))
  return resposta
}

/** Rede primeiro, mas sem esperar mais que `prazo` quando já existe cópia guardada. */
async function redeComPrazo(evento, prazo) {
  const pedido = evento.request
  const cache = await caches.open(VERSAO)
  const salva = await cache.match(pedido)
  const daRede = fetch(pedido).then((resposta) => guardar(evento, cache, pedido, resposta))
  if (!salva) return daRede
  // A cópia guardada responde se a rede falhar ou demorar; a rede continua e renova a cópia.
  evento.waitUntil(daRede.catch(() => undefined))
  let temporizador
  const espera = new Promise((resolver) => { temporizador = setTimeout(() => resolver(null), prazo) })
  const vencedora = await Promise.race([daRede.then((r) => (r.ok ? r : null), () => null), espera])
  clearTimeout(temporizador)
  return vencedora ?? salva
}

/** Responde com a cópia guardada, se houver, e renova em segundo plano. */
async function copiaEnquantoRenova(evento) {
  const pedido = evento.request
  const cache = await caches.open(VERSAO)
  const salva = await cache.match(pedido)
  const daRede = fetch(pedido).then((resposta) => guardar(evento, cache, pedido, resposta))
  if (!salva) return daRede
  evento.waitUntil(daRede.catch(() => undefined))
  return salva
}

const ARTES = ['imagens/', 'emblemas/', 'ranking/', 'pixel/', 'mascote/', 'marca/']

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  if (pedido.method !== 'GET') return
  const url = new URL(pedido.url)
  if (url.origin !== self.location.origin) return
  const caminho = url.pathname.slice(new URL(self.registration.scope).pathname.length)
  if (caminho.startsWith('assets/')) evento.respondWith(cachePrimeiro(pedido))
  else if (pedido.mode === 'navigate') evento.respondWith(redePrimeiro(pedido))
  else if (caminho.startsWith('acervo/')) evento.respondWith(redeComPrazo(evento, PRAZO_ACERVO))
  else if (ARTES.some((pasta) => caminho.startsWith(pasta)) && pedido.cache !== 'no-store' && pedido.cache !== 'reload') evento.respondWith(copiaEnquantoRenova(evento))
})
