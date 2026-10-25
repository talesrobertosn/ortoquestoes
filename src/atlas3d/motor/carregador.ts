import { BufferGeometry } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { BASE_ASSETS, VERSAO_ASSETS } from '../config'
import type { Camada, Catalogo, Ponto } from '../tipos'

/**
 * Carregamento das camadas. Cada GLB é baixado uma vez e guardado no Cache Storage do
 * navegador (nome versionado: trocar a versão dos assets troca o cache); a geometria
 * decodificada fica na memória do módulo, então sair e voltar ao atlas na mesma visita
 * não decodifica de novo. Só a GPU é liberada ao sair (geometry.dispose()).
 */
const NOME_CACHE = `atlas3d-${VERSAO_ASSETS}`
let draco: DRACOLoader | null = null
let loader: GLTFLoader | null = null
const geometrias = new Map<Camada, Promise<Map<string, BufferGeometry>>>()

function obterLoader() {
  if (!loader) {
    draco = new DRACOLoader()
    draco.setDecoderPath(`${BASE_ASSETS}draco/`)
    draco.setWorkerLimit(Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 2) - 1)))
    loader = new GLTFLoader()
    loader.setDRACOLoader(draco)
  }
  return loader
}

/** Baixa com progresso, servindo do Cache Storage quando já existe. */
async function baixar(url: string, aoProgresso?: (fracao: number) => void): Promise<ArrayBuffer> {
  let cache: Cache | null = null
  try { cache = 'caches' in window ? await caches.open(NOME_CACHE) : null } catch { cache = null }
  const guardado = cache ? await cache.match(url).catch(() => undefined) : undefined
  if (guardado) { aoProgresso?.(1); return guardado.arrayBuffer() }
  const resposta = await fetch(url)
  if (!resposta.ok || !resposta.body) throw new Error(`Falha ao baixar ${url} (${resposta.status})`)
  const total = Number(resposta.headers.get('content-length')) || 0
  const leitor = resposta.body.getReader()
  const partes: Uint8Array[] = []
  let recebido = 0
  for (;;) {
    const { done, value } = await leitor.read()
    if (done) break
    partes.push(value)
    recebido += value.length
    if (total) aoProgresso?.(Math.min(0.99, recebido / total))
  }
  const dados = new Uint8Array(recebido)
  let pos = 0
  for (const p of partes) { dados.set(p, pos); pos += p.length }
  if (cache) cache.put(url, new Response(dados, { headers: { 'content-type': 'model/gltf-binary' } })).catch(() => {})
  aoProgresso?.(1)
  return dados.buffer
}

/** Geometrias de uma camada, por id da estrutura (normais calculadas: o GLB só traz posições). */
export function carregarCamada(camada: Camada, arquivo: string, aoProgresso?: (fracao: number) => void) {
  let p = geometrias.get(camada)
  if (!p) {
    p = (async () => {
      const dados = await baixar(`${BASE_ASSETS}modelos/${arquivo}`, aoProgresso)
      const gltf = await obterLoader().parseAsync(dados, '')
      const mapa = new Map<string, BufferGeometry>()
      gltf.scene.traverse((no) => {
        const malha = no as unknown as { isMesh?: boolean; name: string; geometry: BufferGeometry }
        if (!malha.isMesh || !malha.name) return
        const g = malha.geometry
        g.computeVertexNormals()
        g.computeBoundingSphere()
        g.computeBoundingBox()
        mapa.set(malha.name, g)
      })
      return mapa
    })()
    geometrias.set(camada, p)
    p.catch(() => geometrias.delete(camada))
  } else aoProgresso?.(1)
  return p
}

let catalogo: Promise<Catalogo> | null = null
export function carregarCatalogo() {
  catalogo ??= fetch(`${BASE_ASSETS}estruturas.json`).then((r) => { if (!r.ok) throw new Error('catálogo indisponível'); return r.json() })
  catalogo.catch(() => { catalogo = null })
  return catalogo
}

let pontos: Promise<Ponto[]> | null = null
export function carregarPontos() {
  pontos ??= fetch(`${BASE_ASSETS}pontos.json`).then((r) => r.json())
  pontos.catch(() => { pontos = null })
  return pontos
}
