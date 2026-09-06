import { useCallback, useEffect, useState } from 'react'
import { FILTROS_VAZIOS, type Dificuldade, type Filtros, type Situacao } from '../dados/tipos'

/**
 * Roteamento por hash. Escolha deliberada: funciona igual em
 * usuario.github.io/ortoquestoes e em ortoquestoes.com.br, sem redirecionamento
 * de 404 e sem configuração de servidor. Todo link é direto e compartilhável.
 */

export interface Rota {
  caminho: string
  segmentos: string[]
  consulta: URLSearchParams
}

function lerHash(): Rota {
  const bruto = window.location.hash.replace(/^#/, '') || '/'
  const [caminho, consulta = ''] = bruto.split('?')
  const limpo = caminho.replace(/\/+$/, '') || '/'
  return {
    caminho: limpo,
    segmentos: limpo.split('/').filter(Boolean).map(decodeURIComponent),
    consulta: new URLSearchParams(consulta),
  }
}

export function usarRota(): Rota {
  const [rota, definir] = useState<Rota>(lerHash)
  useEffect(() => {
    const aoMudar = () => definir(lerHash())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])
  return rota
}

export function navegar(destino: string, substituir = false): void {
  const alvo = '#' + (destino.startsWith('/') ? destino : '/' + destino)
  if (substituir) {
    const url = window.location.href.split('#')[0] + alvo
    window.history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else if (window.location.hash !== alvo) {
    window.location.hash = alvo
  }
}

export function usarNavegar() {
  return useCallback((destino: string, substituir = false) => navegar(destino, substituir), [])
}

/** href pronto para <a>, sempre relativo ao endereço atual. */
export function href(destino: string): string {
  return '#' + (destino.startsWith('/') ? destino : '/' + destino)
}

/* ---------- Filtros na URL --------------------------------------------- */

const DIFICULDADES: Dificuldade[] = ['facil', 'medio', 'dificil']
const SITUACOES: Situacao[] = [
  'todas',
  'naoRespondidas',
  'erradas',
  'acertadas',
  'favoritas',
]

export function filtrosParaConsulta(filtros: Filtros): string {
  const p = new URLSearchParams()
  if (filtros.temas.length) p.set('temas', filtros.temas.join(','))
  if (filtros.subtemas.length) p.set('subtemas', filtros.subtemas.join('|'))
  if (filtros.provas.length) p.set('provas', filtros.provas.join(','))
  if (filtros.anos.length) p.set('anos', filtros.anos.join(','))
  if (filtros.dificuldades.length) p.set('dif', filtros.dificuldades.join(','))
  if (filtros.comImagem) p.set('imagem', '1')
  if (filtros.comComentario) p.set('comentario', '1')
  if (filtros.incluirAnuladas) p.set('anuladas', '1')
  if (!filtros.embaralhar) p.set('ordem', 'prova')
  if (filtros.limite) p.set('limite', String(filtros.limite))
  if (filtros.situacao !== 'todas') p.set('situacao', filtros.situacao)
  if (filtros.busca.trim()) p.set('busca', filtros.busca.trim())
  const texto = p.toString()
  return texto ? '?' + texto : ''
}

export function consultaParaFiltros(consulta: URLSearchParams): Filtros {
  const lista = (chave: string, separador = ',') => {
    const bruto = consulta.get(chave)
    if (!bruto) return []
    return bruto
      .split(separador)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  const limite = Number(consulta.get('limite'))
  return {
    ...FILTROS_VAZIOS,
    temas: lista('temas'),
    subtemas: lista('subtemas', '|'),
    provas: lista('provas'),
    anos: lista('anos')
      .map(Number)
      .filter((n) => Number.isFinite(n)),
    dificuldades: lista('dif').filter((d): d is Dificuldade =>
      DIFICULDADES.includes(d as Dificuldade),
    ),
    comImagem: consulta.get('imagem') === '1',
    comComentario: consulta.get('comentario') === '1',
    incluirAnuladas: consulta.get('anuladas') === '1',
    embaralhar: consulta.get('ordem') !== 'prova',
    limite: Number.isFinite(limite) && limite > 0 ? limite : null,
    situacao: SITUACOES.includes(consulta.get('situacao') as Situacao)
      ? (consulta.get('situacao') as Situacao)
      : 'todas',
    busca: consulta.get('busca') ?? '',
  }
}
