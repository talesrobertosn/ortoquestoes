import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { usarIndiceBiblioteca } from '../../biblioteca/recomendar'
import { usarBiblioteca } from '../../biblioteca/usarBiblioteca'
import { apelidoLivro, livrosDaEstante } from '../../biblioteca/estante'
import type { ResumoCapitulo } from '../../biblioteca/tipos'
import { corDaArea } from '../../dados/coresAreas'
import { ler, gravar } from '../../estado/armazenamento'
import { href, navegar } from '../../util/rotas'
import { Icone } from '../Icone'
import '../../estilos/componentes/EstanteResumos.css'

/** O exemplo do Rockwood (pedido do Tales, 30/10/2026): o ponto mais cobrado do resumo do colo do fêmur. */
const EXEMPLO = {
  id: 'rockwood10-53-colo-femur',
  bloco: 'fratura-desviada-no-jovem-38a46d78',
  livro: 'Rockwood adulto',
  capitulo: 'Cap. 53',
  titulo: 'Fratura do colo do fêmur',
  trecho: <>O <b>índice de alinhamento de Garden</b> compara as trabéculas compressivas da cabeça com a cortical medial da diáfise: <b>cerca de 160° no AP</b> e <b>180° no perfil</b>.</>,
  // trauma-0064, trauma-0242, quadril-0331, quadril-0328 e quadril-0235 (bloco central do resumo).
  vezes: 5,
  provas: 'TARO 2013, 2021, 2022 e 2026 · ENARE R4 2024',
  armadilha: 'Inverter AP e perfil (180° e 160°).',
}

/** Ids da estante já vistos nesta capa: o que chegou depois brilha em dourado ("novo desde a última visita"). */
const CHAVE_VISTOS = 'resumos:vistos-capa'
const ABRIR_MS = 420
const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Altura estável por resumo (as lombadas não ficam todas iguais, e não mudam a cada visita). */
function altura(id: string): number {
  let h = 2166136261
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return 64 + ((h >>> 0) % 26)
}
/** Capítulo mais longo, lombada mais grossa. */
const largura = (c: ResumoCapitulo) => 10 + Math.round(Math.min(c.minutos, 70) / 70 * 8)

/** Divide a estante em duas prateleiras de largura parecida; um livro (obra) pode continuar na de baixo. */
function prateleiras(capitulos: ResumoCapitulo[]): ResumoCapitulo[][][] {
  const grupos = livrosDaEstante(capitulos).map((l) => l.capitulos)
  const total = capitulos.reduce((t, c) => t + largura(c) + 2, 0)
  const linhas: ResumoCapitulo[][][] = [[], []]
  let usado = 0
  for (const g of grupos) {
    let atual: ResumoCapitulo[] = []
    let linha = usado < total / 2 ? 0 : 1
    for (const c of g) {
      const agora = usado < total / 2 ? 0 : 1
      if (agora !== linha) { if (atual.length) linhas[linha].push(atual); atual = []; linha = agora }
      atual.push(c)
      usado += largura(c) + 2
    }
    if (atual.length) linhas[linha].push(atual)
  }
  return linhas.filter((l) => l.length)
}

/**
 * Biblioteca de resumos na capa (pedido do Tales, 30/10/2026): um quadro do tamanho do Atlas 3D, logo abaixo dele.
 * A estante em pixel tem uma lombada por resumo publicado (cor da área, grossura pelo tempo de leitura);
 * passar o mouse puxa o livro e mostra o título na plaquinha, clicar tira o livro da prateleira e abre o resumo.
 * Ao lado, o "continue de onde parou" de quem está lendo; para os outros, um trecho real do Rockwood.
 */
export function EstanteResumos() {
  const biblioteca = usarIndiceBiblioteca()
  const { leituras } = usarBiblioteca()
  const [foco, definirFoco] = useState<ResumoCapitulo | null>(null)
  const [saindo, definirSaindo] = useState<string | null>(null)
  const [longe, definirLonge] = useState(false)
  const raiz = useRef<HTMLElement>(null)
  const relogio = useRef<number | undefined>(undefined)
  // Lido uma vez: o brilho vale para esta visita inteira, mesmo depois de gravar os ids novos.
  const [vistos] = useState(() => ler<string[] | null>(CHAVE_VISTOS, null))

  const capitulos = useMemo(() => biblioteca?.capitulos ?? [], [biblioteca])
  const novos = useMemo(() => new Set(vistos ? capitulos.filter((c) => !vistos.includes(c.id)).map((c) => c.id) : []), [capitulos, vistos])
  const linhas = useMemo(() => prateleiras(capitulos), [capitulos])
  const livros = useMemo(() => [...new Set(livrosDaEstante(capitulos).map((l) => apelidoLivro(l.capitulos[0].livro)))], [capitulos])
  const lendo = useMemo(() => capitulos
    .filter((c) => (leituras[c.id]?.progresso ?? 0) > 2 && !leituras[c.id]?.concluidoEm && (leituras[c.id]?.progresso ?? 0) < 95)
    .sort((a, b) => (leituras[b.id]?.em ?? 0) - (leituras[a.id]?.em ?? 0))[0] ?? null, [capitulos, leituras])

  useEffect(() => {
    const ids = capitulos.map((c) => c.id)
    if (ids.length && (!vistos || ids.some((id) => !vistos.includes(id)))) gravar(CHAVE_VISTOS, ids)
  }, [capitulos, vistos])
  // Fora da tela, as lombadas param de espiar (bateria do celular).
  useEffect(() => {
    const el = raiz.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => definirLonge(!e.isIntersecting), { rootMargin: '80px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [capitulos.length])
  useEffect(() => () => window.clearTimeout(relogio.current), [])

  if (!capitulos.length) return null

  const abrir = (destino: string, id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || semMovimento()) return
    e.preventDefault()
    if (saindo) return
    definirSaindo(id)
    relogio.current = window.setTimeout(() => navegar(destino), ABRIR_MS)
  }
  const exemplo = capitulos.find((c) => c.id === EXEMPLO.id)
  const destinoExemplo = `/resumos/${EXEMPLO.id}?bloco=${EXEMPLO.bloco}`
  const progresso = lendo ? leituras[lendo.id]!.progresso : 0

  return (
    <section ref={raiz} className={'er ip-entra' + (longe ? ' er--longe' : '')} aria-labelledby="er-titulo">
      <div className="er__texto">
        <span className="er__selo"><Icone nome="livro" tamanho={14} /> Biblioteca de resumos</span>
        <a className="er__capa" href={href('/resumos')}><strong id="er-titulo">O livro de referência, na ordem em que a prova cobra.</strong></a>
        <span className="er__desc">
          <b className="numerico">{capitulos.length} resumos</b> dos capítulos do {livros.slice(0, -1).join(', ')}{livros.length > 1 ? ` e ${livros[livros.length - 1]}` : livros[0]}, escritos a partir das questões que já caíram. Cada ponto cobrado traz a prova, o ano e a armadilha.
        </span>

        <div className="er__estante" onMouseLeave={() => definirFoco(null)}>
          {linhas.map((grupos, i) => (
            <div className="er__prateleira" key={i}>
              <ul className="er__livros" aria-label={i === 0 ? 'Resumos publicados' : 'Mais resumos'}>
                {grupos.map((g, j) => [
                  j > 0 && <li key={`apoio-${g[0].id}`} className="er__apoio" aria-hidden="true" />,
                  ...g.map((c) => (
                    <li key={c.id}>
                      <a
                        className={'er__lombada' + (novos.has(c.id) ? ' er__lombada--nova' : '') + (saindo === c.id ? ' er__lombada--saindo' : '') + (foco?.id === c.id ? ' er__lombada--foco' : '')}
                        href={href(`/resumos/${c.id}`)}
                        style={{ '--cor': corDaArea(c.especialidade), '--alt': `${altura(c.id)}px`, '--larg': `${largura(c)}px` } as CSSProperties}
                        onMouseEnter={() => definirFoco(c)}
                        onFocus={() => definirFoco(c)}
                        onBlur={() => definirFoco(null)}
                        onClick={abrir(`/resumos/${c.id}`, c.id)}
                      >
                        <span className="so-leitor">{c.titulo}, {apelidoLivro(c.livro)}, cerca de {c.minutos} minutos{novos.has(c.id) ? ', novo' : ''}</span>
                      </a>
                    </li>
                  )),
                ])}
              </ul>
            </div>
          ))}
          <p className="er__placa" aria-hidden="true">
            {foco
              ? <><b>{foco.titulo}</b><span>{apelidoLivro(foco.livro)} · ~{foco.minutos} min{novos.has(foco.id) ? ' · novo' : ''}</span></>
              : novos.size
                ? <><b className="er__placa-nova">{novos.size === 1 ? '1 resumo novo' : `${novos.size} resumos novos`} desde a sua última visita</b><span>Os livros com brilho dourado.</span></>
                : <><b><span className="er__so-mouse">Passe o mouse num livro</span><span className="er__so-toque">Toque num livro para abrir</span></b><span>Cada lombada é um resumo, na cor da área.</span></>}
          </p>
        </div>

        <span className="er__botoes">
          <a className="botao botao--ouro er__botao" href={href('/resumos')}><Icone nome="livro" tamanho={16} /> Abrir a Biblioteca</a>
          <a className="botao er__botao er__botao--contorno" href={href('/resumos/frases')}><Icone nome="raio" tamanho={16} /> Frases que caem</a>
        </span>
      </div>

      {lendo ? (
        <a className="er__ficha er__ficha--lendo" href={href(`/resumos/${lendo.id}`)} style={{ '--cor': corDaArea(lendo.especialidade) } as CSSProperties} onClick={abrir(`/resumos/${lendo.id}`, lendo.id)}>
          <span className="er__ficha-selo"><Icone nome="relogio" tamanho={13} /> Continue de onde parou</span>
          <span className="er__ficha-livro">{apelidoLivro(lendo.livro)} · {lendo.capitulo.split('·')[0].trim()}</span>
          <strong className="er__ficha-titulo">{lendo.titulo}</strong>
          <span className="er__barra" aria-hidden="true"><span style={{ width: `${progresso}%` }} /></span>
          <span className="er__ficha-rodape"><span className="numerico">{progresso}% lido · faltam ~{Math.max(1, Math.round(lendo.minutos * (1 - progresso / 100)))} min</span><b>Continuar <Icone nome="direita" tamanho={14} /></b></span>
        </a>
      ) : (
        <a className="er__ficha" href={href(destinoExemplo)} onClick={abrir(destinoExemplo, EXEMPLO.id)}>
          <span className="er__ficha-selo"><Icone nome="estrela" tamanho={13} /> Um trecho de exemplo</span>
          <span className="er__ficha-livro">{EXEMPLO.livro} · {EXEMPLO.capitulo}</span>
          <strong className="er__ficha-titulo">{EXEMPLO.titulo}</strong>
          <span className="er__ficha-trecho">{EXEMPLO.trecho}</span>
          <span className="er__ficha-questao">
            <span className="er__ficha-caiu">Já caiu {EXEMPLO.vezes} vezes</span>
            <span className="er__ficha-provas">{EXEMPLO.provas}</span>
            <span><b>Armadilha:</b> {EXEMPLO.armadilha}</span>
          </span>
          <span className="er__ficha-rodape"><span>~{exemplo?.minutos ?? 34} min de leitura</span><b>Ler este trecho <Icone nome="direita" tamanho={14} /></b></span>
        </a>
      )}
    </section>
  )
}
