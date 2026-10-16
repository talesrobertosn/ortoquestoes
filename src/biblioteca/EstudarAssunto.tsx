import { useEffect, useState } from 'react'
import { BIBLIOTECA_PUBLICA, recurso } from '../config'
import { ler } from '../estado/armazenamento'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'

/** Questão → trecho do resumo que a ensina (public/biblioteca/questoes.json, gerado pelo script da Biblioteca). */
interface Destino { c: string; b: string; s: string; t: string; p: 'central' | 'relacionada' | 'treino' }
let mapa: Promise<Record<string, Destino[]>> | null = null
const carregar = (): Promise<Record<string, Destino[]>> => (mapa ??= fetch(recurso('biblioteca/questoes.json')).then((r) => (r.ok ? r.json() as Promise<Record<string, Destino[]>> : {})).catch(() => { mapa = null; return {} }))

/**
 * "Estudar este assunto na Biblioteca": abre o resumo no parágrafo que explica a questão, destacado.
 * Enquanto a Biblioteca está em testes (sem menu), aparece só para quem já abriu #/resumos.
 */
export function EstudarAssunto({ questao }: { questao: string }) {
  const [destino, definir] = useState<Destino | null>(null)
  const ativo = BIBLIOTECA_PUBLICA || ler<boolean>('resumos:visto', false)
  useEffect(() => {
    if (!ativo) return
    let vivo = true
    carregar().then((m) => { if (vivo) definir(m[questao]?.[0] ?? null) })
    return () => { vivo = false }
  }, [questao, ativo])
  if (!destino) return null
  return (
    <a className="estudar-assunto" href={href(`/resumos/${destino.c}?bloco=${encodeURIComponent(destino.b)}`)}>
      <Icone nome="livro" tamanho={18} />
      <span><strong>Estudar este assunto na Biblioteca</strong><small>{destino.t} · {destino.s}</small></span>
      <Icone nome="direita" tamanho={16} />
    </a>
  )
}
