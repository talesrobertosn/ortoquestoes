import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { JanelaCentral } from '../componentes/JanelaCentral'
import { urlCss } from '../config'
import { ler } from '../estado/armazenamento'
import { usarConta } from '../conta/ContextoConta'
import { revisarHoje } from '../estado/revisao'
import { href, navegar, usarRota } from '../util/rotas'
import { ehRotaDoJogo } from '../flashcards/fundo'
import { calcularEstatisticas, chaveDoDia, type DiaResumido } from '../flashcards/aprendizagem'
import { corDaArea } from '../dados/coresAreas'
import { CartaoCronograma, PaginaCronogramaFlashcards, linkSessaoCronograma, resumoDeHoje, usarCronograma } from './CronogramaFlashcards'
import { acervoFalhou, carregarAcervo, indiceDoAcervo } from '../flashcards/dados/acervo'
import { CenaArquivo } from '../componentes/flashcards/CenaArquivo'
import { VisitaCronograma } from '../componentes/cronograma/VisitaCronograma'
import {
  CATEGORIAS_OPINIAO, deveConvidar, dispensarConvite, enviarOpiniao, mensagemDeErro,
  type CategoriaOpiniao, type OrigemOpiniao,
} from '../flashcards/opiniao'
import { CHAVE_RECORDES, RECORDES_VAZIOS, type Recordes } from '../flashcards/progresso'
import type { Flashcard } from '../flashcards/tipos'
import '../estilos/paginas/CentralFlashcards.css'
import '../estilos/paginas/CentralFlashcardsArquivo.css'

export const AVISO_BETA = 'O Torneio de Flashcards está em beta. Estamos aprimorando o visual, o áudio e as mecânicas. Teste e conte o que funcionou — ou o que precisa melhorar.'

function usarAcervo() {
  const [cartas, definirCartas] = useState<Flashcard[] | null>(null)
  useEffect(() => { let vivo = true; void carregarAcervo().then((c) => { if (vivo) definirCartas(c) }); return () => { vivo = false } }, [])
  const nomes = useMemo(() => {
    const n: Record<string, string> = {}
    const ind = cartas ? indiceDoAcervo() : null
    if (ind) for (const [id, a] of Object.entries(ind.areas)) n[id] = a.nome
    return n
  }, [cartas])
  return { cartas, nomes }
}

/**
 * Atrás do jogo (pop-up aberto direto em #/flashcards/...), a página é só fundo coberto:
 * as artes (capa e cartões, ~340 kB) esperam o jogo fechar, para não disputar a rede
 * com a abertura do jogo. Depois de liberadas, ficam.
 */
function usarArtesLiberadas() {
  const atras = ehRotaDoJogo(usarRota().segmentos)
  const [liberadas, definir] = useState(!atras)
  useEffect(() => { if (!atras) definir(true) }, [atras])
  return liberadas
}

const estudar = (categoria: string, n?: number, areas: string[] = []) => {
  const q = new URLSearchParams({ categoria })
  for (const a of areas) q.append('area', a)
  if (n) q.set('n', String(n))
  return `/flashcards/biblioteca?${q}`
}
/** Biblioteca já num assunto (pontos fracos do desempenho). */
const estudarAssunto = (area: string, assunto: string) => `/flashcards/biblioteca?${new URLSearchParams({ categoria: 'area:' + area, area, assunto, n: '20' })}`

function Abas({ atual }: { atual: 'central' | 'desempenho' | 'cronograma' }) {
  const abas: Array<{ id: typeof atual; rotulo: string; curto?: string; destino: string; icone: NomeIcone }> = [
    { id: 'central', rotulo: 'Central', destino: '/flashcards', icone: 'mapa' },
    { id: 'desempenho', rotulo: 'Meu desempenho', curto: 'Desempenho', destino: '/flashcards/desempenho', icone: 'grafico' },
    { id: 'cronograma', rotulo: 'Meu cronograma', curto: 'Cronograma', destino: '/flashcards/cronograma', icone: 'calendario' },
  ]
  return (
    <nav className="cf-abas" aria-label="Seções dos flashcards">
      {abas.map((a) => (
        <a key={a.id} href={href(a.destino)} aria-current={a.id === atual ? 'page' : undefined} aria-label={a.curto ? a.rotulo : undefined}>
          <Icone nome={a.icone} tamanho={16} />
          {a.curto ? <><span className="cf-abas__longo">{a.rotulo}</span><span className="cf-abas__curto">{a.curto}</span></> : <span>{a.rotulo}</span>}
        </a>
      ))}
    </nav>
  )
}

/* ------------------------------------------------------------------ Central */

/**
 * Central dos flashcards no Arquivo da Vila (01/11/2026, refeita por inteiro a pedido do Tales: "é pra mudar tudo").
 * Antes eram uns 15 botões para poucos destinos; agora a página responde, nesta ordem:
 * 1. o topo com a cena e UMA ação, a certa para hoje (revisar o que venceu, seguir o cronograma, começar pelo que
 *    mais cai ou abrir a Biblioteca), com a Biblioteca e o Torneio como caminhos discretos;
 * 2. "Hoje": um painel só, dividido por linhas finas como o progresso da página inicial, com as filas para revisar
 *    (Revisões de hoje, Errei, Hesitei, Nunca estudados), o cronograma do dia e o estudo por assunto;
 * 3. "Por onde seguir": a Biblioteca, o Torneio e o desempenho, cada um com o seu objeto pixel animado;
 * 4. "Como funciona" recolhido (aberto na primeira visita) e um bloco de opinião só.
 * Todos os destinos de antes continuam aqui ou a um toque (a Cripta direto pela Entrada do Torneio).
 */
export function CentralFlashcards() {
  const { cartas, nomes, crono, salvo, registros } = usarCronograma()
  const rec = useMemo(() => ({ ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }), [])
  // #/flashcards?opiniao=fim_sessao (fim da sessão de estudo ou da partida) já abre a janela
  const [opiniao, definirOpiniao] = useState<OrigemOpiniao | null>(() => {
    const o = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('opiniao')
    return o === 'fim_sessao' || o === 'fim_partida' ? o : null
  })
  const [convite, definirConvite] = useState(() => deveConvidar())
  const artes = usarArtesLiberadas()

  const contagem = useMemo(() => {
    const v = Object.values(registros)
    return {
      hoje: v.filter((r) => revisarHoje(r)).length,
      errei: v.filter((r) => r.c === false).length,
      hesitei: v.filter((r) => r.c === true && r.confianca === 'duvida').length,
      estudados: v.length,
    }
  }, [registros])
  const novos = cartas ? cartas.filter((c) => !registros[c.id]).length : null
  const areas = useMemo(() => Object.entries(nomes).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')), [nomes])
  const total = cartas?.length ?? 0
  const { sessao } = usarConta()
  const nome = String(sessao?.user.user_metadata?.nome ?? '').trim().split(/\s+/)[0] ?? ''
  const pessoal = mensagemPessoal(nome, contagem.hoje, contagem.estudados, rec.andarMaximo)
  const plano = crono && !crono.concluido ? resumoDeHoje(crono) : null
  const acao = acaoDeHoje(contagem.hoje, contagem.estudados, plano?.total ?? 0, plano?.texto ?? '')

  return (
    <article className="cf cfh cf--arquivo">
      <Abas atual="central" />
      {/* O Arquivo da Vila: o fichário de fichas ao lado da praça da torre; a escada do fundo desce para a Cripta
          (o Torneio). O texto fica num vidro escuro do lado calmo da pintura, sem cobrir o fichário. */}
      <section className="cfh-heroi cfh-heroi--arquivo" aria-labelledby="cfh-titulo">
        <div className="cfh-palco">
        <div className="cfh-janela">{artes && <CenaArquivo />}</div>
        <div className="cfh-heroi__texto cfh-vidro-arquivo">
          <p className="cfh-selo">Flashcards</p>
          <h1 id="cfh-titulo">Treine flashcards de Ortopedia.</h1>
          <p className="cfh-heroi__pessoal"><strong>{pessoal.abertura}</strong> {pessoal.dados}</p>
          <a className="botao cfh-heroi__estudar" href={href(acao.destino)}>
            <Icone nome={acao.icone} tamanho={20} />
            <span><strong>{acao.rotulo}</strong><small>{acao.detalhe}</small></span>
          </a>
          <div className="cfh-heroi__atalhos">
            {acao.destino !== '/flashcards/biblioteca' && <a className="cfh-vidro" href={href('/flashcards/biblioteca')}><Icone nome="livro" tamanho={16} /> Abrir a Biblioteca</a>}
            <a className="tr-heroi__link" href={href('/flashcards/entrada')}><Icone nome="raio" tamanho={15} /> Torneio de Flashcards</a>
          </div>
        </div>
        </div>
        {/* O chão do Arquivo, logo abaixo da cena: o que são os flashcards (a pintura fica inteira no topo). */}
        <p className="cfh-chao">Por área, tirados das questões comentadas das provas reais e dos OrtoQuestões Simulados. Revisão espaçada: o que você erra volta antes, o que você sabe espaça. E, se quiser, os mesmos flashcards em modo jogo.</p>
      </section>

      {cartas && acervoFalhou() && (
        <aside className="cf-rede" role="alert">
          <Icone nome="alerta" tamanho={20} />
          <p><strong>Não conseguimos carregar todos os flashcards agora.</strong> A conexão falhou no meio do caminho; os números abaixo podem estar incompletos. Pedimos desculpas pelo transtorno.</p>
          <button type="button" className="botao botao--principal" onClick={() => window.location.reload()}>Tentar de novo</button>
        </aside>
      )}

      {convite && (
        <aside className="cf-convite" role="note">
          <p><strong>Você já terminou algumas sessões.</strong> Leva um minuto contar como está sendo.</p>
          <div className="cf-convite__botoes">
            <button type="button" className="botao botao--principal" onClick={() => { definirConvite(false); definirOpiniao('convite') }}>Dar opinião</button>
            <button type="button" className="botao botao--fantasma" onClick={() => { dispensarConvite(); definirConvite(false) }}>Agora não</button>
          </div>
        </aside>
      )}

      <section className="cfa-painel" aria-labelledby="cfa-hoje">
        <header className="cfa-painel__cabeca">
          <h2 id="cfa-hoje">Hoje</h2>
          <p>{contagem.hoje
            ? contagem.hoje >= 10 ? `${contagem.hoje.toLocaleString('pt-BR')} flashcards venceram hoje pela repetição espaçada.` : 'Alguns flashcards venceram hoje pela repetição espaçada. Poucos minutos dão conta.'
            : contagem.estudados ? 'Nada vence hoje. Bom momento para flashcards novos.' : 'Responda os primeiros flashcards e as revisões se montam sozinhas.'}</p>
        </header>
        <div className="cfa-celula">
          <h3 className="cfa-titulo">Para revisar</h3>
          <ul className="cfa-filas">
            <Fila destino={estudar('pendentes', Math.min(contagem.hoje || 20, 50))} rotulo="Revisões de hoje" texto="Venceram pela repetição espaçada" numero={contagem.hoje} icone="calendario" destaque />
            <Fila destino={estudar('errados', 20)} rotulo="Errei" texto="Voltam até você acertar" numero={contagem.errei} icone="alerta" />
            <Fila destino={estudar('hesitei', 20)} rotulo="Hesitei" texto="Firmar o que ficou na dúvida" numero={contagem.hesitei} icone="olho" />
            <Fila destino={estudar('novos', 20)} rotulo="Nunca estudados" texto="Os que você ainda não viu" numero={novos} icone="estrela" />
          </ul>
        </div>
        <div className="cfa-celula cfa-celula--crono">
          <CartaoCronograma c={crono} sugerido={!salvo} />
        </div>
        {areas.length > 0 && <div className="cfa-celula cfa-celula--assunto"><PorAssunto areas={areas} /></div>}
      </section>

      <section className="cfa-secao" aria-labelledby="cfa-caminhos">
        <h2 id="cfa-caminhos">Por onde seguir</h2>
        <div className="cfa-caminhos">
          <Caminho objeto="fichario" titulo="Biblioteca" texto="Estudo calmo, sem combate: por assunto, pelas revisões do dia ou pelos que você errou." destino="/flashcards/biblioteca" acao="Abrir a Biblioteca" />
          <Caminho objeto="cripta" titulo="Torneio de Flashcards" texto={`Os mesmos flashcards em forma de jogo: cada acerto é um golpe, a cada três andares um chefe.${rec.andarMaximo ? ` Seu recorde: andar ${rec.andarMaximo}.` : ''}`} destino="/flashcards/entrada" acao="Entrar no Torneio" />
          <Caminho objeto="medidor" titulo="Meu desempenho" texto={contagem.estudados >= 10 ? `${contagem.estudados.toLocaleString('pt-BR')} flashcards únicos estudados, por área e por assunto.` : 'O que você estudar aparece aqui, por área e por assunto, neste aparelho e na sua conta.'} destino="/flashcards/desempenho" acao="Ver desempenho"
            medidor={total > 0 ? { feitos: Math.min(contagem.estudados, total), total } : undefined} />
        </div>
        <a className="cfa-ranking" href={href('/ranking?aba=flashcards')}><Icone nome="trofeu" tamanho={18} /><span><strong>Ranking dos flashcards</strong><small>Quem desceu mais fundo no Torneio</small></span><Icone nome="direita" tamanho={16} /></a>
      </section>

      <details className="cfa-como" open={!contagem.estudados}>
        <summary><span>Como funciona</span><Icone nome="baixo" tamanho={16} /></summary>
        <ol className="cf-passos">
          <li><span className="px-numero" aria-hidden="true">1</span><div><strong>Escolha um assunto</strong><span>Por área, pelas revisões de hoje, pelos que você errou ou pelos que nunca viu.</span></div></li>
          <li><span className="px-numero" aria-hidden="true">2</span><div><strong>Responda e revise o flashcard</strong><span>Escolha a alternativa, veja o verso e diga se errou, hesitou ou sabia. A data da próxima revisão sai disso.</span></div></li>
          <li><span className="px-numero" aria-hidden="true">3</span><div><strong>Acompanhe seu aprendizado e sua progressão</strong><span>Desempenho por assunto, cronograma até a data da prova e o seu recorde no Torneio.</span></div></li>
        </ol>
      </details>

      {!convite && <aside className="cf-aviso" role="note">
        <Icone nome="correio" tamanho={22} />
        <p><strong>Estamos construindo os próximos flashcards com você.</strong><br />Conte o que gostou e o que podemos melhorar: a sua opinião chega direto ao painel da equipe.</p>
        <button type="button" className="botao botao--principal" onClick={() => definirOpiniao('central')}>Enviar opinião</button>
      </aside>}

      {opiniao && <JanelaOpiniao origem={opiniao} aoFechar={() => definirOpiniao(null)} />}
      {/* A coruja do Arquivo ou o gato, de vez em quando, sentados num botão (easter egg). */}
      <VisitaCronograma poleiros={POLEIROS_FLASHCARDS} />
    </article>
  )
}

/** A única ação do topo, a certa para hoje: o que venceu primeiro, depois o cronograma, depois começar ou estudar. */
function acaoDeHoje(hoje: number, estudados: number, plano: number, textoPlano: string): { destino: string; rotulo: string; detalhe: string; icone: NomeIcone } {
  const min = (n: number) => `~${Math.max(5, Math.round((n * 0.5) / 5) * 5)} min`
  if (hoje > 0) return { destino: estudar('pendentes', Math.min(hoje, 50)), rotulo: 'Revisar agora', detalhe: hoje >= 10 ? `${hoje.toLocaleString('pt-BR')} revisões vencem hoje · ${min(Math.min(hoje, 50))}` : `Suas revisões de hoje · ${min(hoje)}`, icone: 'calendario' }
  if (plano > 0) return { destino: linkSessaoCronograma(), rotulo: estudados ? `Seguir cronograma · faltam ${plano.toLocaleString('pt-BR')}` : 'Começar pelos que mais caem', detalhe: `${textoPlano} · ${min(plano)}`, icone: 'rota' }
  return { destino: '/flashcards/biblioteca', rotulo: 'Estudar flashcards', detalhe: 'Biblioteca · estudo calmo', icone: 'livro' }
}

/** Onde a coruja ou o gato podem sentar nos Flashcards, em ordem de preferência. */
const POLEIROS_FLASHCARDS = ['.cf-crono__botoes .botao', '.cf-assunto button', '.cfa-ranking', '.cf-aviso .botao', '.cfa-caminho']

/**
 * A frase pessoal do topo (adendo do dono, 18/10/2026): o primeiro nome e até duas observações com
 * os dados que a página já tem, no tom das cartas (docs/emails/TOM.md): nada abaixo de 10 em número,
 * sem cobrança, sem gênero presumido. Sem nome, a frase funciona sozinha.
 */
function mensagemPessoal(nome: string, hoje: number, estudados: number, andar: number) {
  const abertura = nome ? `${nome}, que bom ter você por aqui.` : 'Que bom ter você por aqui.'
  const obs: string[] = []
  if (hoje >= 10) obs.push(`Hoje ${hoje.toLocaleString('pt-BR')} revisões esperam por você, já separadas na Biblioteca.`)
  else if (hoje > 0) obs.push('Algumas revisões venceram hoje e já estão separadas na Biblioteca.')
  if (estudados >= 10) obs.push(`Você já estudou ${estudados.toLocaleString('pt-BR')} flashcards diferentes: isso é de quem senta e faz.`)
  else if (estudados > 0) obs.push('Você já deu os primeiros passos. Dez minutos hoje já contam.')
  else obs.push('Dez minutos já dão para os primeiros flashcards, no intervalo ou antes de dormir.')
  if (obs.length < 2 && andar > 0) obs.push(`Seu recorde no Torneio é o andar ${andar}.`)
  return { abertura, dados: obs.slice(0, 2).join(' ') }
}

/** Uma fila do painel Hoje: ícone, nome, para que serve, o número em fonte pixel e a seta. Vazia, fica apagada. */
function Fila({ destino, rotulo, texto, numero, icone, destaque }: { destino: string; rotulo: string; texto: string; numero: number | null; icone: NomeIcone; destaque?: boolean }) {
  const vazia = !numero
  const corpo = <>
    <span className="cfa-fila__icone" aria-hidden="true"><Icone nome={icone} tamanho={18} /></span>
    <span className="cfa-fila__texto"><strong>{rotulo}</strong><small>{numero === null ? 'Carregando…' : vazia ? 'Nada por aqui' : texto}</small></span>
    <b className="cfa-fila__numero numerico">{numero === null ? '…' : numero.toLocaleString('pt-BR')}</b>
    {!vazia && <Icone nome="direita" tamanho={16} />}
  </>
  return <li>{vazia
    ? <span className="cfa-fila cfa-fila--vazia" aria-disabled="true">{corpo}</span>
    : <a className={'cfa-fila' + (destaque ? ' cfa-fila--destaque' : '')} href={href(destino)} aria-label={`${rotulo}: ${numero!.toLocaleString('pt-BR')}. Estudar`}>{corpo}</a>}</li>
}

function PorAssunto({ areas }: { areas: Array<[string, string]> }) {
  const [area, definirArea] = useState('')
  return (
    <form className="cf-assunto" onSubmit={(e) => { e.preventDefault(); if (area) navegar(estudar('area:' + area, 20, [area])) }}>
      <label htmlFor="cf-area">Por assunto</label>
      <select id="cf-area" value={area} onChange={(e) => definirArea(e.target.value)}>
        <option value="">Escolha a área</option>
        {areas.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
      </select>
      <button type="submit" className="botao botao--principal" disabled={!area}>Estudar 20</button>
      {/* Área > grupo > assunto, com busca: abre a Biblioteca já na área escolhida (27/10/2026) */}
      <a className="cf-assunto__mais" href={href(area ? `/flashcards/biblioteca?area=${encodeURIComponent(area)}` : '/flashcards/biblioteca')}>Escolher um assunto específico</a>
    </form>
  )
}

/** Um caminho com o seu objeto pixel animado (o fichário abre a gaveta; a escada da Cripta acende; o medidor enche). */
function Caminho({ objeto, titulo, texto, destino, acao, medidor }: { objeto: 'fichario' | 'cripta' | 'medidor'; titulo: string; texto: string; destino: string; acao: string; medidor?: { feitos: number; total: number } }) {
  const pctFeito = medidor ? Math.min(100, Math.max(medidor.feitos ? 2 : 0, (100 * medidor.feitos) / medidor.total)) : 0
  return (
    <a className={`cfa-caminho cfa-caminho--${objeto}`} href={href(destino)}>
      {objeto === 'medidor'
        ? <span className="cfa-objeto cfa-objeto--medidor" aria-hidden="true"><i style={{ ['--feito-n' as string]: pctFeito / 100 }} /></span>
        : <span className={`cfa-objeto cfa-objeto--${objeto}`} aria-hidden="true" style={OBJETOS} />}
      <span className="cfa-caminho__corpo">
        <strong>{titulo}</strong>
        <span>{texto}</span>
        {medidor && <span className="cfa-caminho__meta" role="meter" aria-label="Flashcards do acervo já estudados" aria-valuemin={0} aria-valuemax={medidor.total} aria-valuenow={medidor.feitos}>
          {medidor.feitos >= 10 ? `${medidor.feitos.toLocaleString('pt-BR')} de ${medidor.total.toLocaleString('pt-BR')} do acervo` : 'A barra começa no primeiro flashcard'}</span>}
        <em>{acao} <Icone nome="direita" tamanho={14} /></em>
      </span>
    </a>
  )
}
const OBJETOS = { '--ca-objetos': urlCss('pixel/flashcards/objetos.png') } as CSSProperties

/* -------------------------------------------------------------- Desempenho */

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—')
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/**
 * Meu desempenho (visual refeito em 15/10/2026): números principais, evolução por dia com
 * as autoavaliações empilhadas, cada área com a sua cor e os pontos fracos com botão para treinar.
 */
export function DesempenhoFlashcards() {
  const { cartas, nomes } = usarAcervo()
  const [dias, definirDias] = useState(30)
  const est = useMemo(() => (cartas ? calcularEstatisticas(cartas, nomes, dias) : null), [cartas, nomes, dias])
  if (!est) return <article className="cf empilha-2 cf--arquivo"><Abas atual="desempenho" /><p role="status" className="cf-sobre-piso">Carregando o acervo…</p></article>
  const p = est.periodo
  const avaliacoes = p.errei + p.hesitei + p.sabia
  const fracos = est.porAssunto.filter((a) => a.acertos < a.tentativas).slice(0, 6)
  const estudadas = est.porArea.filter((a) => a.estudados > 0)
  const naoEstudadas = est.porArea.filter((a) => !a.estudados)
  return (
    <article className="cf empilha-2 cf--arquivo">
      <Abas atual="desempenho" />
      <header className="cf-cabeca cf-cabeca--arquivo">
        <CenaArquivo />
        <p className="cf-selo">Flashcards</p>
        <h1>Meu desempenho nos flashcards</h1>
        <p>O aprendizado conta junto o que você responde na Biblioteca e no Torneio. Andares, ouro e chefes do jogo ficam de fora destes números.</p>
      </header>

      <section className="cf-numeros" aria-label="Totais desde o começo">
        <Numero rotulo="Flashcards únicos estudados" valor={est.unicos} nota={cartas ? `de ${cartas.length.toLocaleString('pt-BR')} no acervo` : 'Cada flashcard conta uma vez.'} barra={cartas?.length ? est.unicos / cartas.length : undefined} />
        <Numero rotulo="Respostas no total" valor={est.revisoes} nota="Todas as vezes que você respondeu, contando as repetições." />
        <Numero rotulo="Revisões pendentes hoje" valor={est.pendentes} nota="Venceram pela repetição espaçada." destino={est.pendentes ? estudar('pendentes', Math.min(est.pendentes, 50)) : undefined} />
        <Numero rotulo="Dominados" valor={est.dominados} nota="Acertou todas as voltas da escada de revisão." barra={est.unicos ? est.dominados / est.unicos : undefined} />
      </section>

      <section className="cf-bloco" aria-labelledby="cf-periodo">
        <div className="cf-bloco__cabeca">
          <h2 id="cf-periodo">Evolução nos últimos {dias} dias</h2>
          <div className="cf-chips" role="radiogroup" aria-label="Período">
            {[7, 30, 90].map((d) => <button key={d} type="button" role="radio" aria-checked={dias === d} onClick={() => definirDias(d)}>{d} dias</button>)}
          </div>
        </div>
        <div className="cf-numeros cf-numeros--miudo">
          <Numero rotulo="Respostas" valor={p.revisoes} nota={`${p.diasAtivos} ${p.diasAtivos === 1 ? 'dia' : 'dias'} com estudo`} />
          <Numero rotulo="Flashcards novos" valor={p.novos} nota="Vistos pela primeira vez no período" />
          <Numero rotulo="Acerto na primeira resposta" valor={pct(p.primeirasCertas, p.primeiras)} nota={`${p.primeirasCertas} de ${p.primeiras} na primeira vez com alternativas`} />
          <Numero rotulo="Acerto nas alternativas" valor={pct(p.objetivasCertas, p.objetivas)} nota={`${p.objetivasCertas} de ${p.objetivas} respostas com alternativa`} />
        </div>
        <GraficoDias porDia={p.porDia} />
        <h3 className="cf-sub">Como você se avaliou</h3>
        {avaliacoes ? (
          <div className="cf-barra" role="img" aria-label={`Errei ${p.errei}, hesitei ${p.hesitei}, sabia ${p.sabia}`}>
            {(['errei', 'hesitei', 'sabia'] as const).map((k) => p[k] ? <span key={k} className={`cf-barra__${k}`} style={{ flexGrow: p[k] }}>{rotuloAvaliacao[k]} {p[k]}</span> : null)}
          </div>
        ) : <p className="cf-nota">Ainda sem autoavaliações no período. Elas vêm da Biblioteca (Errei, Hesitei, Sabia); no Torneio conta só o acerto da alternativa.</p>}
        <p className="cf-nota">“Sabia” é a sua impressão, não um acerto conferido: o acerto objetivo é o da alternativa escolhida.{est.desde ? ` Registro diário desde ${formatarData(est.desde)}; nada é estimado para trás.` : ''}</p>
      </section>

      <section className="cf-bloco" aria-labelledby="cf-fracos">
        <h2 id="cf-fracos">Pontos fracos</h2>
        {fracos.length ? (
          <ul className="cfd-fracos">
            {fracos.map((a) => (
              <li key={a.area + a.assunto} style={{ ['--area' as string]: corDaArea(a.area) }}>
                <span className="cfd-fracos__nome"><strong>{a.assunto}</strong><small>{a.nome} · {a.acertos} de {a.tentativas} respostas certas{a.pendentes ? ` · ${a.pendentes} para revisar` : ''}</small></span>
                <span className="cfd-fracos__pct numerico" aria-hidden="true" data-faixa={a.acertos / a.tentativas >= 0.75 ? 'bom' : a.acertos / a.tentativas >= 0.5 ? 'medio' : 'baixo'}>{pct(a.acertos, a.tentativas)}</span>
                <a className="botao botao--principal" href={href(estudarAssunto(a.area, a.assunto))}>Treinar</a>
              </li>
            ))}
          </ul>
        ) : <p className="cf-nota">Os assuntos com menor acerto aparecem aqui depois de três respostas em cada um. Por enquanto, nada para destacar.</p>}
      </section>

      <section className="cf-bloco" aria-labelledby="cf-areas">
        <h2 id="cf-areas">Por área</h2>
        <ul className="cfd-areas">
          {[...estudadas, ...naoEstudadas].map((a) => {
            const prog = a.total ? a.estudados / a.total : 0
            const acerto = a.tentativas ? a.acertos / a.tentativas : null
            return (
              <li key={a.area} style={{ ['--area' as string]: corDaArea(a.area) }}>
                <span className="cfd-areas__nome"><i aria-hidden="true" /><strong>{a.nome}</strong></span>
                <span className="cfd-areas__barra" role="meter" aria-label={`${a.nome}: ${a.estudados} de ${a.total} estudados`} aria-valuemin={0} aria-valuemax={a.total} aria-valuenow={a.estudados} title={`${a.estudados} de ${a.total} estudados`}>
                  <i style={{ width: `${Math.max(prog ? 1.5 : 0, prog * 100)}%` }} />
                </span>
                <span className="cfd-areas__num numerico">{a.estudados}<small>/{a.total}</small></span>
                <span className="cfd-areas__acerto numerico" data-faixa={acerto === null ? 'vazio' : acerto >= 0.75 ? 'bom' : acerto >= 0.5 ? 'medio' : 'baixo'}>{acerto === null ? '—' : pct(a.acertos, a.tentativas)}<small>acerto</small></span>
                <a className="cfd-areas__acao" href={href(estudar(a.pendentes ? 'pendentes' : 'area:' + a.area, 20, [a.area]))}>{a.pendentes ? `Revisar ${a.pendentes}` : 'Estudar'}</a>
              </li>
            )
          })}
        </ul>
        <p className="cf-nota">Barra: flashcards da área já estudados. Acerto: respostas certas sobre todas as respostas daquela área, desde o começo.</p>
      </section>
    </article>
  )
}

/** Respostas por dia, empilhadas por autoavaliação (a Cripta e as respostas sem avaliação ficam em cinza). */
function GraficoDias({ porDia }: { porDia: DiaResumido[] }) {
  const max = Math.max(1, ...porDia.map((d) => d.revisoes))
  const topo = max <= 5 ? max : Math.ceil(max / 5) * 5
  const hoje = chaveDoDia(Date.now())
  const total = porDia.reduce((s, d) => s + d.revisoes, 0)
  const rotulo = (d: DiaResumido) => { const [, m, dd] = d.dia.split('-'); return `${Number(dd)}/${Number(m)}` }
  const marcas = porDia.length <= 7 ? porDia.map((_, i) => i) : [0, Math.floor(porDia.length / 2), porDia.length - 1]
  return (
    <figure className="cfd-grafico">
      <figcaption>
        <strong>Respostas por dia</strong>
        <span className="cfd-legenda" aria-hidden="true"><i className="cfd-c--sabia" /> Sabia <i className="cfd-c--hesitei" /> Hesitei <i className="cfd-c--errei" /> Errei <i className="cfd-c--outras" /> Torneio e sem avaliação</span>
      </figcaption>
      {total ? (
        <div className="cfd-grafico__area">
          <span className="cfd-grafico__eixo" aria-hidden="true"><b>{topo}</b><b>0</b></span>
          <ol className="cfd-grafico__barras" aria-label={`Respostas por dia nos últimos ${porDia.length} dias`}>
            {porDia.map((d) => {
              const outras = Math.max(0, d.revisoes - d.sabia - d.hesitei - d.errei)
              const ds = new Date(d.dia + 'T12:00:00')
              const texto = `${DIAS_CURTOS[ds.getDay()]}, ${rotulo(d)}: ${d.revisoes} ${d.revisoes === 1 ? 'resposta' : 'respostas'}${d.revisoes ? ` (sabia ${d.sabia}, hesitei ${d.hesitei}, errei ${d.errei}, outras ${outras})` : ''}`
              return (
                <li key={d.dia} data-hoje={d.dia === hoje || undefined} title={texto} aria-label={texto} tabIndex={d.revisoes ? 0 : -1}>
                  <span className="cfd-pilha" style={{ height: `${(100 * d.revisoes) / topo}%` }}>
                    {outras > 0 && <i className="cfd-c--outras" style={{ flexGrow: outras }} />}
                    {d.errei > 0 && <i className="cfd-c--errei" style={{ flexGrow: d.errei }} />}
                    {d.hesitei > 0 && <i className="cfd-c--hesitei" style={{ flexGrow: d.hesitei }} />}
                    {d.sabia > 0 && <i className="cfd-c--sabia" style={{ flexGrow: d.sabia }} />}
                  </span>
                </li>
              )
            })}
          </ol>
          <span className="cfd-grafico__datas" aria-hidden="true">{marcas.map((i) => <b key={i} style={{ left: `${((i + 0.5) * 100) / porDia.length}%` }}>{porDia[i].dia === hoje ? 'hoje' : rotulo(porDia[i])}</b>)}</span>
        </div>
      ) : <p className="cf-nota cfd-grafico__vazio">Nenhuma resposta no período. Os dias de estudo aparecem aqui como barras.</p>}
    </figure>
  )
}

const rotuloAvaliacao = { errei: 'Errei', hesitei: 'Hesitei', sabia: 'Sabia' }

function Numero({ rotulo, valor, nota, destino, barra }: { rotulo: string; valor: number | string; nota: string; destino?: string; barra?: number }) {
  return (
    <div className="cf-numero">
      <span>{rotulo}</span>
      <b className="numerico">{typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor}</b>
      {barra !== undefined && <i className="cfd-mini" aria-hidden="true"><em style={{ width: `${Math.min(100, Math.max(barra > 0 ? 2 : 0, barra * 100))}%` }} /></i>}
      <small>{nota}</small>
      {destino && <a href={href(destino)}>Revisar agora</a>}
    </div>
  )
}

function formatarData(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* -------------------------------------------------------------- Cronograma */

export function CronogramaFlashcards() {
  return <PaginaCronogramaFlashcards abas={<Abas atual="cronograma" />} />
}

/* ---------------------------------------------------------------- Opinião */

export function JanelaOpiniao({ origem, aoFechar }: { origem: OrigemOpiniao; aoFechar: () => void }) {
  const [categoria, definirCategoria] = useState<CategoriaOpiniao>('outro')
  const [facil, definirFacil] = useState<number | null>(null)
  const [visual, definirVisual] = useState<number | null>(null)
  const [som, definirSom] = useState<'sim' | 'nao' | 'nao_testei' | null>(null)
  const [problema, definirProblema] = useState('')
  const [melhorar, definirMelhorar] = useState('')
  const [estado, definirEstado] = useState<'editando' | 'enviando' | 'enviada'>('editando')
  const [erro, definirErro] = useState('')
  const vazio = !facil && !visual && !som && !problema.trim() && !melhorar.trim()
  const enviar = async () => {
    definirEstado('enviando'); definirErro('')
    try {
      await enviarOpiniao({ categoria, facil, visual, som, problema, melhorar, origem })
      definirEstado('enviada')
    } catch (falha) {
      definirErro(mensagemDeErro(falha)); definirEstado('editando')
    }
  }
  return (
    <JanelaCentral aberta rotulo="Enviar opinião sobre os flashcards" aoFechar={aoFechar} className="cf-opiniao">
      {estado === 'enviada' ? (
        <div className="cf-opiniao__feito" role="status">
          <Icone nome="certo" tamanho={28} />
          <h2>Opinião recebida. Obrigado!</h2>
          <p>Ela chegou ao painel do Tales e entra na próxima rodada de ajustes.</p>
          <button type="button" className="botao botao--principal" onClick={aoFechar}>Fechar</button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (!vazio) void enviar() }}>
          <header className="cf-opiniao__cabeca"><span className="cf-opiniao__icone"><Icone nome="correio" tamanho={24} /></span><div><p className="cf-opiniao__selo">Sua experiência importa</p><h2>O que podemos melhorar?</h2><p>Um minuto da sua opinião ajuda a construir os próximos flashcards.</p></div></header>

          <fieldset className="cf-campo">
            <legend>Sobre o quê?</legend>
            <div className="cf-chips" role="radiogroup">
              {CATEGORIAS_OPINIAO.map((c) => <button key={c.id} type="button" role="radio" aria-checked={categoria === c.id} onClick={() => definirCategoria(c.id)}>{c.nome}</button>)}
            </div>
          </fieldset>
          <div className="cf-opiniao__notas"><Nota rotulo="Foi fácil estudar?" valor={facil} aoMudar={definirFacil} /><Nota rotulo="E o visual?" valor={visual} aoMudar={definirVisual} /></div>
          <fieldset className="cf-campo">
            <legend>O som funcionou no seu celular?</legend>
            <div className="cf-chips" role="radiogroup">
              {([['sim', 'Sim'], ['nao', 'Não'], ['nao_testei', 'Não testei']] as const).map(([v, n]) => <button key={v} type="button" role="radio" aria-checked={som === v} onClick={() => definirSom(som === v ? null : v)}>{n}</button>)}
            </div>
          </fieldset>
          <label className="cf-campo"><span>Algo não funcionou?</span><textarea aria-label="Algo não funcionou?" rows={3} maxLength={1500} value={problema} onChange={(e) => definirProblema(e.target.value)} placeholder="Ex.: a tela cortou no celular deitado" /></label>
          <label className="cf-campo"><span>Qual seria sua próxima melhoria?</span><textarea aria-label="Qual seria sua próxima melhoria?" rows={3} maxLength={1500} value={melhorar} onChange={(e) => definirMelhorar(e.target.value)} /></label>
          {erro && <p className="cf-alerta" role="alert">{erro}</p>}
          <p className="cf-opiniao__privacidade">Conte apenas sobre a experiência, sem dados pessoais. Para corrigir conteúdo médico, use “Relatar erro” na questão.</p>
          <div className="cf-form__botoes">
            <button type="submit" className="botao botao--principal" disabled={vazio || estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Enviar opinião'}</button>
            <button type="button" className="botao botao--fantasma" onClick={aoFechar}>Cancelar</button>
          </div>
        </form>
      )}
    </JanelaCentral>
  )
}

function Nota({ rotulo, valor, aoMudar }: { rotulo: string; valor: number | null; aoMudar: (n: number | null) => void }) {
  return (
    <fieldset className="cf-campo">
      <legend>{rotulo}</legend>
      <div className="cf-chips cf-chips--nota" role="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={valor === n} aria-label={`${n} de 5`} onClick={() => aoMudar(valor === n ? null : n)}>{n}</button>)}
      </div>
      <small className="cf-nota">1 = ruim · 5 = ótimo</small>
    </fieldset>
  )
}
