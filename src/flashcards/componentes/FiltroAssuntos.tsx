import { useId, useState } from 'react'
import { Icone } from '../../componentes/Icone'
import { buscarAssunto, caminhoDoFiltro, FILTRO_VAZIO, temGrupos, type FiltroAssunto, type NoAreaFc } from '../biblioteca/filtroAssunto'
import { tocar } from '../efeitos/sons'
import '../../estilos/paginas/FiltroFlashcards.css'

const n = (x: number) => x.toLocaleString('pt-BR')

/**
 * Estudar por assunto (27/10/2026): Área > Grupo > Assunto, com busca, as quantidades reais (já com os
 * filtros de tipo e dificuldade), os filtros ativos em chips removíveis e o botão que abre uma sessão
 * só com aquele recorte. No computador fica aberto; no celular, recolhido numa linha até tocar.
 */
export function FiltroAssuntos({ arvore, filtro, aoMudar, encontrados, naSessao, aoEstudar }: {
  arvore: readonly NoAreaFc[]
  filtro: FiltroAssunto
  aoMudar: (f: FiltroAssunto) => void
  /** flashcards no recorte (com os filtros de tipo, dificuldade e "só novos") */
  encontrados: number
  /** quantos entram na sessão (o tamanho escolhido; revisões e erros primeiro) */
  naSessao: number
  aoEstudar: () => void
}) {
  const [busca, definirBusca] = useState('')
  const [aberto, definirAberto] = useState(() => !!filtro.area || typeof matchMedia === 'undefined' || !matchMedia('(max-width: 640px)').matches)
  const idBusca = useId()
  const area = arvore.find((a) => a.id === filtro.area)
  const comGrupos = temGrupos(area)
  const grupo = area?.grupos.find((g) => g.id === filtro.grupo) ?? (area && !comGrupos ? area.grupos[0] : undefined)
  const caminho = caminhoDoFiltro(filtro, arvore)
  const resultados = buscarAssunto(arvore, busca)
  const mudar = (f: FiltroAssunto) => { tocar('hover'); aoMudar(f) }
  const alternar = (assunto: string) => mudar({ ...filtro, grupo: grupo?.id ?? filtro.grupo, assuntos: filtro.assuntos.includes(assunto) ? filtro.assuntos.filter((a) => a !== assunto) : [...filtro.assuntos, assunto] })

  return (
    <section className={`fa${aberto ? ' fa--aberto' : ''}${area ? ' fa--ativo' : ''}`} aria-labelledby="fa-titulo">
      <div className="fa__cabeca">
        <span className="fa__icone" aria-hidden="true"><Icone nome="filtro" tamanho={20} /></span>
        <div className="fa__titulo">
          <h3 id="fa-titulo">Estudar por assunto</h3>
          <p>{area ? caminho.join(' › ') : 'Da área inteira até uma patologia ou fratura específica.'}</p>
        </div>
        <button type="button" className="fc-botao-pequeno fa__abrir" aria-expanded={aberto} aria-controls="fa-corpo" onClick={() => definirAberto((v) => !v)}>
          {aberto ? 'Recolher' : area ? 'Trocar' : 'Escolher'}
        </button>
      </div>

      <div className="fa__corpo" id="fa-corpo">
        <label className="fa__busca" htmlFor={idBusca}>
          <Icone nome="busca" tamanho={17} />
          <input id={idBusca} type="search" value={busca} onChange={(e) => definirBusca(e.target.value)} placeholder="Buscar patologia, fratura ou assunto" autoComplete="off" enterKeyHint="search" />
          {busca && <button type="button" className="fa__limpar-busca" aria-label="Limpar a busca" onClick={() => definirBusca('')}><Icone nome="fechar" tamanho={15} /></button>}
        </label>

        {busca.trim().length >= 2 ? (
          resultados.length ? (
            <ul className="fa__resultados" aria-label="Resultados da busca">
              {resultados.map((r) => (
                <li key={`${r.nivel}:${r.filtro.area}:${r.filtro.grupo}:${r.nome}`}>
                  <button type="button" className={r.total ? '' : 'fa--zero'} onClick={() => { mudar(r.filtro); definirBusca('') }}>
                    <span><strong>{r.nome}</strong><small>{r.caminho}</small></span>
                    <b className="numerico">{n(r.total)}</b>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="fa__vazio">Nada encontrado para “{busca.trim()}”. Tente outra palavra, como o osso ou a doença.</p>
        ) : (
          <>
            <nav className="fa__trilha" aria-label="Caminho do assunto">
              <button type="button" onClick={() => mudar(FILTRO_VAZIO)} aria-current={!area ? 'step' : undefined}>Todas as áreas</button>
              {area && <><Icone nome="direita" tamanho={13} /><button type="button" onClick={() => mudar({ area: area.id, grupo: null, assuntos: [] })} aria-current={!filtro.grupo && !filtro.assuntos.length ? 'step' : undefined}>{area.nome}</button></>}
              {area && comGrupos && grupo && <><Icone nome="direita" tamanho={13} /><button type="button" onClick={() => mudar({ ...filtro, assuntos: [] })} aria-current={!filtro.assuntos.length ? 'step' : undefined}>{grupo.nome}</button></>}
            </nav>

            {!area && (
              <div className="fa__grade">
                {arvore.map((a) => (
                  <button key={a.id} type="button" className={`fa__opcao${a.total ? '' : ' fa--zero'}`} onClick={() => mudar({ area: a.id, grupo: null, assuntos: [] })}>
                    <strong>{a.nome}</strong><b className="numerico">{n(a.total)}</b>
                  </button>
                ))}
              </div>
            )}

            {area && comGrupos && !grupo && (
              <div className="fa__grade">
                {area.grupos.map((g) => (
                  <button key={g.id} type="button" className={`fa__opcao${g.total ? '' : ' fa--zero'}`} onClick={() => mudar({ area: area.id, grupo: g.id, assuntos: [] })}>
                    <strong>{g.nome}</strong><small>{g.assuntos.length} {g.assuntos.length === 1 ? 'assunto' : 'assuntos'}</small><b className="numerico">{n(g.total)}</b>
                  </button>
                ))}
              </div>
            )}

            {area && grupo && (
              <div className="fa__assuntos" role="group" aria-label={`Assuntos de ${grupo.nome}`}>
                <p className="fa__dica">{filtro.assuntos.length ? 'Toque de novo para desmarcar.' : `Sem marcar, entra ${comGrupos ? 'o grupo inteiro' : 'a área inteira'}. Marque um ou mais assuntos para restringir.`}</p>
                {grupo.assuntos.map((s) => (
                  <button key={s.nome} type="button" className={`fa__assunto${s.total ? '' : ' fa--zero'}`} aria-pressed={filtro.assuntos.includes(s.nome)} onClick={() => alternar(s.nome)}>
                    <span>{s.nome}</span><b className="numerico">{n(s.total)}</b>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {area && (
          <div className="fa__ativos" aria-label="Filtros ativos">
            <span className="fa__chip"><span>{area.nome}</span><button type="button" aria-label={`Tirar a área ${area.nome}`} onClick={() => mudar(FILTRO_VAZIO)}><Icone nome="fechar" tamanho={13} /></button></span>
            {comGrupos && grupo && <span className="fa__chip"><span>{grupo.nome}</span><button type="button" aria-label={`Tirar o grupo ${grupo.nome}`} onClick={() => mudar({ area: area.id, grupo: null, assuntos: [] })}><Icone nome="fechar" tamanho={13} /></button></span>}
            {filtro.assuntos.map((a) => <span key={a} className="fa__chip fa__chip--assunto"><span>{a}</span><button type="button" aria-label={`Tirar o assunto ${a}`} onClick={() => alternar(a)}><Icone nome="fechar" tamanho={13} /></button></span>)}
            <button type="button" className="fa__limpar" onClick={() => mudar(FILTRO_VAZIO)}>Limpar filtros</button>
          </div>
        )}

        {area && (
          <div className="fa__rodape">
            <p className="fa__total" aria-live="polite"><b className="numerico">{n(encontrados)}</b> {encontrados === 1 ? 'flashcard encontrado' : 'flashcards encontrados'}</p>
            {encontrados > 0
              ? <button type="button" className="fc-principal pronto fa__estudar" disabled={!naSessao} onClick={aoEstudar}>
                  <span className="fc-principal__texto"><span>Estudar {n(naSessao)}</span><small>{naSessao < encontrados ? `de ${n(encontrados)} · revisões e erros primeiro` : naSessao === 1 ? 'flashcard' : 'flashcards'}</small></span>
                </button>
              : <p className="fa__vazio">Ainda não há flashcards neste recorte. Eles saem das questões comentadas: tente o grupo inteiro ou tire os filtros de tipo e dificuldade.</p>}
          </div>
        )}
      </div>
    </section>
  )
}
