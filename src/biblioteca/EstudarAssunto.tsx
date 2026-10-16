import { useEffect, useState } from 'react'
import { recurso } from '../config'
import { usarPremium } from '../conta/premium'
import { Icone } from '../componentes/Icone'
import { corDaArea } from '../dados/coresAreas'
import { href } from '../util/rotas'
import { bibliotecaVisivel, resumosDosSubtemas, usarIndiceBiblioteca } from './recomendar'
import '../estilos/componentes/Biblioteca.css'

/** Questão → trecho do resumo que a ensina (public/biblioteca/questoes.json, gerado pelo script da Biblioteca). */
interface Destino { c: string; b: string; s: string; t: string; p: 'central' | 'relacionada' | 'treino' }
let mapa: Promise<Record<string, Destino[]>> | null = null
const carregar = (): Promise<Record<string, Destino[]>> => (mapa ??= fetch(recurso('biblioteca/questoes.json')).then((r) => (r.ok ? r.json() as Promise<Record<string, Destino[]>> : {})).catch(() => { mapa = null; return {} }))

/**
 * Convite para a Biblioteca no fim da questão (pedido do Tales, 16/10/2026: "bem bonito mesmo").
 * Se a questão é citada num resumo, abre o parágrafo que a explica, destacado; se não é citada mas o
 * subtema dela é ensinado por um resumo, convida para o resumo do tema. Sem relação, não aparece.
 */
export function EstudarAssunto({ questao, subtemas = [] }: { questao: string; subtemas?: string[] }) {
  const [destino, definir] = useState<Destino | null | undefined>(undefined)
  const biblioteca = usarIndiceBiblioteca()
  const { premium } = usarPremium()
  const ativo = bibliotecaVisivel()
  useEffect(() => {
    if (!ativo) return
    let vivo = true
    definir(undefined)
    carregar().then((m) => { if (vivo) definir(m[questao]?.[0] ?? null) })
    return () => { vivo = false }
  }, [questao, ativo])
  if (!ativo || destino === undefined || !biblioteca) return null
  const capitulo = destino ? biblioteca.capitulos.find((c) => c.id === destino.c) : resumosDosSubtemas(biblioteca, subtemas)[0]
  if (!capitulo) return null
  const citada = !!destino && destino.c === capitulo.id
  const fechado = capitulo.acesso !== 'gratis' && !premium
  const destinoHref = citada ? `/resumos/${capitulo.id}?bloco=${encodeURIComponent(destino!.b)}` : `/resumos/${capitulo.id}`
  const numero = capitulo.capitulo.match(/\d+/)?.[0]
  const livroCurto = capitulo.livro.replace(/ in Adults$/, '').replace(/ and Green's/, ' & Green’s')

  return (
    <aside className="bib-convite" style={{ ['--bib-area' as string]: corDaArea(capitulo.especialidade) }} aria-label="Resumo deste tema na Biblioteca">
      <a className="bib-convite__capa" href={href(destinoHref)} tabIndex={-1} aria-hidden="true">
        <span className="bib-convite__capa-lombada" />
        <span className="bib-convite__capa-frente">
          <span className="bib-convite__capa-livro">{livroCurto}</span>
          <span className="bib-convite__capa-filete" />
          <span className="bib-convite__capa-titulo">{capitulo.titulo}</span>
          {numero && <span className="bib-convite__capa-numero">Cap. {numero}</span>}
        </span>
      </a>
      <div className="bib-convite__texto">
        <span className="bib-convite__selo"><Icone nome="livro" tamanho={14} /> Biblioteca<span className="bib-convite__selo-marca"> OrtoQuestões</span> <b>Beta</b></span>
        <h3 className="bib-convite__titulo">{citada ? 'Esta questão está explicada num resumo' : 'Tem um resumo sobre este tema'}</h3>
        <p className="bib-convite__frase">{citada
          ? <>O raciocínio dela está em <strong>“{destino!.s}”</strong>, no resumo de <strong>{capitulo.titulo.toLowerCase()}</strong>. Vale ler: você vê o que a banca cobra do assunto e as armadilhas que se repetem.</>
          : <>O resumo de <strong>{capitulo.titulo.toLowerCase()}</strong> segue a ordem em que as provas cobram o tema, com as questões que já caíram no meio do texto. Vale a leitura.</>}</p>
        <div className="bib-convite__acoes">
          <a className="botao botao--principal bib-convite__botao" href={href(destinoHref)}>
            {fechado ? <Icone nome="cadeado" tamanho={15} /> : <Icone nome="livro" tamanho={15} />}
            {citada ? 'Ler o trecho que explica' : 'Ler o resumo'}
          </a>
          <small>~{capitulo.minutos} min · {capitulo.capitulo.split('·')[0].trim()} do {livroCurto}{fechado ? ' · para assinantes' : ''}</small>
        </div>
      </div>
    </aside>
  )
}
