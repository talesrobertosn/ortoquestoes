import '@fontsource/cinzel/latin-700.css'
import '@fontsource/alegreya/latin-400.css'
import { useEffect, useMemo, useState } from 'react'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { JanelaCentral } from '../componentes/JanelaCentral'
import { recurso } from '../config'
import { gravar, ler } from '../estado/armazenamento'
import { LIMITES_HABILITADOS } from '../estado/limiteDiario'
import { revisarHoje } from '../estado/revisao'
import { href, navegar } from '../util/rotas'
import {
  calcularEstatisticas, calcularPlano, CHAVE_PLANO, chaveDoDia, type PlanoFlashcards,
} from '../flashcards/aprendizagem'
import { carregarAcervo, indiceDoAcervo } from '../flashcards/dados/acervo'
import {
  CATEGORIAS_OPINIAO, deveConvidar, dispensarConvite, enviarOpiniao, mensagemDeErro,
  type CategoriaOpiniao, type OrigemOpiniao,
} from '../flashcards/opiniao'
import { CHAVE_RECORDES, CHAVE_REGISTROS, RECORDES_VAZIOS, type RegistroFlashcard, type Recordes } from '../flashcards/progresso'
import type { Flashcard } from '../flashcards/tipos'
import '../estilos/paginas/CentralFlashcards.css'

export const AVISO_BETA = 'O Torneio de Flashcards está em beta. Estamos aprimorando o visual, o áudio e as mecânicas. Teste e conte o que funcionou — ou o que precisa melhorar.'

/** Data da prova usada no cronograma de questões quando a pessoa não tem plano (PlanoEstudo.tsx). */
const DATA_TEOT = '2027-01-10'
const DIA = 86400000

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

const estudar = (categoria: string, n?: number, areas: string[] = []) => {
  const q = new URLSearchParams({ categoria })
  for (const a of areas) q.append('area', a)
  if (n) q.set('n', String(n))
  return `/flashcards/biblioteca?${q}`
}

function Abas({ atual }: { atual: 'central' | 'desempenho' | 'cronograma' }) {
  const abas: Array<{ id: typeof atual; rotulo: string; destino: string; icone: NomeIcone }> = [
    { id: 'central', rotulo: 'Central', destino: '/flashcards', icone: 'mapa' },
    { id: 'desempenho', rotulo: 'Meu desempenho', destino: '/flashcards/desempenho', icone: 'grafico' },
    { id: 'cronograma', rotulo: 'Meu cronograma', destino: '/flashcards/cronograma', icone: 'calendario' },
  ]
  return (
    <nav className="cf-abas" aria-label="Seções dos flashcards">
      {abas.map((a) => (
        <a key={a.id} href={href(a.destino)} aria-current={a.id === atual ? 'page' : undefined}><Icone nome={a.icone} tamanho={16} /> {a.rotulo}</a>
      ))}
    </nav>
  )
}

/* ------------------------------------------------------------------ Central */

export function CentralFlashcards() {
  const { cartas, nomes } = usarAcervo()
  const registros = useMemo(() => ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {}), [])
  const rec = useMemo(() => ({ ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }), [])
  const plano = useMemo(() => ler<PlanoFlashcards | null>(CHAVE_PLANO, null), [])
  // #/flashcards?opiniao=fim_sessao (fim da sessão de estudo ou da partida) já abre a janela
  const [opiniao, definirOpiniao] = useState<OrigemOpiniao | null>(() => {
    const o = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('opiniao')
    return o === 'fim_sessao' || o === 'fim_partida' ? o : null
  })
  const [convite, definirConvite] = useState(() => deveConvidar())

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
  const calc = useMemo(() => (cartas && plano ? calcularPlano(plano, cartas) : null), [cartas, plano])
  const areas = useMemo(() => Object.entries(nomes).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')), [nomes])

  return (
    <article className="cf empilha-2">
      <Abas atual="central" />
      <section className="cf-heroi">
        <picture className="cf-heroi__arte">
          <img src={recurso('flashcards/promo/capa-larga.png')} alt="" width={520} height={330} decoding="async" />
        </picture>
        <div className="cf-heroi__texto">
          <p className="cf-selo"><span className="cf-beta">Beta público</span> Flashcards</p>
          <h1>Treine flashcards<br />de Ortopedia.</h1>
          <p>Por área, tirados das questões comentadas das provas reais. Revisão espaçada: o que você erra volta antes, o que você sabe espaça. E, se quiser, os mesmos flashcards em modo jogo.</p>
          <div className="cf-heroi__botoes">
            <a className="botao botao--ouro botao--grande" href={href('/flashcards/biblioteca')}><Icone nome="livro" tamanho={18} /> Treinar flashcards</a>
            <a className="botao botao--principal" href={href('/flashcards/entrada')}><Icone nome="raio" tamanho={18} /> Jogar a Cripta</a>
          </div>
          {LIMITES_HABILITADOS && <p className="cf-nota">Conta grátis: a cada 24 horas, 10 flashcards na Biblioteca ou uma vida na Cripta. Assinante: sem limite.</p>}
        </div>
      </section>

      {convite && (
        <aside className="cf-convite" role="note">
          <p><strong>Você já terminou algumas sessões.</strong> Leva um minuto contar como está sendo.</p>
          <div className="cf-convite__botoes">
            <button type="button" className="botao botao--principal" onClick={() => { definirConvite(false); definirOpiniao('convite') }}>Dar opinião</button>
            <button type="button" className="botao botao--fantasma" onClick={() => { dispensarConvite(); definirConvite(false) }}>Agora não</button>
          </div>
        </aside>
      )}

      <div className="cf-painel">
      <section className="cf-hoje" aria-labelledby="cf-hoje-titulo">
        <div className="cf-hoje__cabeca">
          <h2 id="cf-hoje-titulo"><Icone nome="reiniciar" tamanho={20} /> Revisões de hoje</h2>
          <p>{contagem.hoje
            ? `${contagem.hoje} ${contagem.hoje === 1 ? 'flashcard venceu' : 'flashcards venceram'} hoje pela repetição espaçada.`
            : contagem.estudados ? 'Nada vence hoje. Bom momento para flashcards novos.' : 'Responda os primeiros flashcards e as revisões se montam sozinhas.'}</p>
        </div>
        <div className="cf-hoje__grade">
          <AtalhoEstudo destino={estudar('pendentes', Math.min(contagem.hoje || 20, 50))} rotulo="Revisões de hoje" numero={contagem.hoje} icone="calendario" desligado={!contagem.hoje} />
          <AtalhoEstudo destino={estudar('errados', 20)} rotulo="Errei" numero={contagem.errei} icone="alerta" desligado={!contagem.errei} />
          <AtalhoEstudo destino={estudar('hesitei', 20)} rotulo="Hesitei" numero={contagem.hesitei} icone="olho" desligado={!contagem.hesitei} />
          <AtalhoEstudo destino={estudar('novos', 20)} rotulo="Nunca estudados" numero={novos} icone="estrela" desligado={novos === 0} />
        </div>
        {areas.length > 0 && <PorAssunto areas={areas} />}
      </section>
      <CartaoCronograma plano={plano} calc={calc} />
      </div>

      <section aria-labelledby="cf-passos-titulo">
        <h2 id="cf-passos-titulo" className="cf-titulo">Como funciona</h2>
        <ol className="cf-passos">
          <li><b>1</b><strong>Escolha um assunto</strong><span>Por área, pelas revisões de hoje, pelos que você errou ou pelos que nunca viu.</span></li>
          <li><b>2</b><strong>Responda e revise o flashcard</strong><span>Escolha a alternativa, veja o verso e diga se errou, hesitou ou sabia. A data da próxima revisão sai disso.</span></li>
          <li><b>3</b><strong>Acompanhe seu aprendizado e sua progressão</strong><span>Desempenho por assunto, cronograma até a data da prova e o seu recorde no Torneio.</span></li>
        </ol>
      </section>

      <section aria-labelledby="cf-modos-titulo">
        <h2 id="cf-modos-titulo" className="cf-titulo">Por onde seguir</h2>
        <div className="cf-modos">
          <CartaoModo arte="biblioteca" titulo="Revisar flashcards" texto="Estudo calmo, sem combate, por assunto ou pelas revisões do dia." destino="/flashcards/biblioteca" acao="Abrir a Biblioteca" />
          <CartaoModo arte="cripta" titulo="Torneio de Flashcards" texto={`Os mesmos flashcards em forma de jogo: cada acerto é um golpe. Uma jornada que começa pelo que é mais familiar e avança para seus desafios.${rec.andarMaximo ? ` Seu recorde: andar ${rec.andarMaximo}.` : ''}`} destino="/flashcards/entrada" acao="Entrar no Torneio" />
          <CartaoModo arte="progresso" titulo="Meu desempenho" texto={`${contagem.estudados.toLocaleString('pt-BR')} flashcards únicos estudados neste aparelho e na sua conta.`} destino="/flashcards/desempenho" acao="Ver desempenho" />
        </div>
        <ul className="cf-links">
          <li><a href={href('/ranking?aba=flashcards')}><Icone nome="trofeu" tamanho={18} /><span><strong>Ranking dos flashcards</strong><small>Uma jornada · um ranking</small></span></a></li>
        </ul>
      </section>

      <aside className="cf-aviso" role="note">
        <Icone nome="correio" tamanho={22} />
        <p><strong>Estamos construindo os próximos flashcards com você.</strong><br />O beta está aberto. Conte o que gostou e o que podemos melhorar: a sua opinião chega direto ao painel da equipe.</p>
        <button type="button" className="botao botao--principal" onClick={() => definirOpiniao('central')}>Enviar opinião</button>
      </aside>

      {opiniao && <JanelaOpiniao origem={opiniao} aoFechar={() => definirOpiniao(null)} />}
    </article>
  )
}

/** Cronograma em destaque na central (pedido do Tales, 14/10/2026: "que a pessoa consiga ver o cronograma com mais facilidade"). */
function CartaoCronograma({ plano, calc }: { plano: PlanoFlashcards | null; calc: ReturnType<typeof calcularPlano> | null }) {
  if (!plano) return (
    <section className="cf-crono cf-crono--vazio" aria-labelledby="cf-crono-titulo">
      <h2 id="cf-crono-titulo"><Icone nome="calendario" tamanho={20} /> Meu cronograma</h2>
      <p>Diga a data da prova, os assuntos e quantos flashcards por dia. A meta de cada dia junta as revisões que venceram e os flashcards novos.</p>
      <a className="botao botao--principal" href={href('/flashcards/cronograma')}>Montar meu cronograma</a>
    </section>
  )
  const feito = calc ? Math.min(calc.feitosHoje, calc.metaHoje || calc.feitosHoje) : 0
  const meta = calc?.metaHoje ?? 0
  return (
    <section className="cf-crono" aria-labelledby="cf-crono-titulo">
      <h2 id="cf-crono-titulo"><Icone nome="calendario" tamanho={20} /> Meu cronograma</h2>
      <p className="cf-crono__data">Até <b>{formatarData(plano.data)}</b>{calc && calc.diasRestantes > 0 ? ` · faltam ${calc.diasRestantes} ${calc.diasRestantes === 1 ? 'dia' : 'dias'}` : ''}</p>
      {calc && calc.situacao === 'concluido' ? <p>Tudo em dia: nada novo nem revisão pendente nos assuntos do cronograma.</p>
        : calc && calc.situacao === 'data-passada' ? <p>A data-alvo já passou. Escolha uma nova data no cronograma.</p>
        : calc && !calc.ehDiaDeEstudo && !meta ? <p>Hoje não é dia de estudo no seu cronograma.</p>
        : (
          <>
            <div className="cf-crono__meta" role="meter" aria-label="Meta de hoje" aria-valuemin={0} aria-valuemax={Math.max(meta, 1)} aria-valuenow={feito}>
              <span>Meta de hoje</span><b className="numerico">{feito}/{meta}</b>
              <i><em style={{ width: `${meta ? Math.round((100 * feito) / meta) : 0}%` }} /></i>
            </div>
            {calc && <p className="cf-nota">{calc.revisoesHoje} {calc.revisoesHoje === 1 ? 'revisão' : 'revisões'} + {calc.novosPorDia} {calc.novosPorDia === 1 ? 'novo' : 'novos'} por dia{calc.situacao === 'acima-do-ritmo' ? ' · acima do seu ritmo: considere aumentar o ritmo diário' : ''}</p>}
          </>
        )}
      <div className="cf-crono__botoes">
        {calc && meta > feito && <a className="botao botao--principal" href={href(estudar('plano', meta - feito, plano.areas))}>Fazer a sessão de hoje ({meta - feito})</a>}
        <a className="botao botao--fantasma" href={href('/flashcards/cronograma')}>Ajustar cronograma</a>
      </div>
    </section>
  )
}

function AtalhoEstudo({ destino, rotulo, numero, icone, desligado }: { destino: string; rotulo: string; numero: number | null; icone: NomeIcone; desligado: boolean }) {
  const conteudo = <><Icone nome={icone} tamanho={18} /><span>{rotulo}</span><b className="numerico">{numero === null ? '…' : numero.toLocaleString('pt-BR')}</b></>
  return desligado
    ? <span className="cf-atalho cf-atalho--vazio" aria-disabled="true">{conteudo}</span>
    : <a className="cf-atalho" href={href(destino)}>{conteudo}</a>
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
      <button type="submit" className="botao" disabled={!area}>Estudar 20</button>
    </form>
  )
}

function CartaoModo({ arte, titulo, texto, destino, acao }: { arte: string; titulo: string; texto: string; destino: string; acao: string }) {
  return (
    <a className={`cf-modo cf-modo--${arte}`} href={href(destino)}>
      <img src={recurso(`flashcards/promo/cartao-${arte}.png`)} alt="" width={260} height={150} loading="lazy" decoding="async" />
      <strong>{titulo}</strong>
      <span>{texto}</span>
      <em>{acao} <Icone nome="direita" tamanho={14} /></em>
    </a>
  )
}

/* -------------------------------------------------------------- Desempenho */

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—')

export function DesempenhoFlashcards() {
  const { cartas, nomes } = usarAcervo()
  const [dias, definirDias] = useState(30)
  const est = useMemo(() => (cartas ? calcularEstatisticas(cartas, nomes, dias) : null), [cartas, nomes, dias])
  if (!est) return <article className="cf empilha-2"><Abas atual="desempenho" /><p role="status">Carregando o acervo…</p></article>
  const p = est.periodo
  const avaliacoes = p.errei + p.hesitei + p.sabia
  const maxDia = Math.max(1, ...p.porDia.map((d) => d.revisoes))
  return (
    <article className="cf empilha-2">
      <Abas atual="desempenho" />
      <header className="cf-cabeca">
        <p className="cf-selo"><span className="cf-beta">Beta</span> Flashcards</p>
        <h1>Meu desempenho nos flashcards</h1>
        <p>O aprendizado conta junto o que você responde na Biblioteca e no Torneio. Andares, ouro e chefes do jogo ficam de fora destes números.</p>
      </header>

      <section className="cf-numeros" aria-label="Totais desde o começo">
        <Numero rotulo="Flashcards únicos estudados" valor={est.unicos} nota="Cada flashcard conta uma vez, por mais que você repita." />
        <Numero rotulo="Respostas no total" valor={est.revisoes} nota="Todas as vezes que você respondeu, contando as repetições." />
        <Numero rotulo="Revisões pendentes hoje" valor={est.pendentes} nota="Venceram pela repetição espaçada." destino={est.pendentes ? estudar('pendentes', Math.min(est.pendentes, 50)) : undefined} />
        <Numero rotulo="Dominados" valor={est.dominados} nota="Acertou todas as voltas da escada de revisão e saiu da fila." />
      </section>

      <section className="cf-bloco" aria-labelledby="cf-periodo">
        <div className="cf-bloco__cabeca">
          <h2 id="cf-periodo">Nos últimos {dias} dias</h2>
          <div className="cf-chips" role="radiogroup" aria-label="Período">
            {[7, 30, 90].map((d) => <button key={d} type="button" role="radio" aria-checked={dias === d} onClick={() => definirDias(d)}>{d} dias</button>)}
          </div>
        </div>
        {est.desde && <p className="cf-nota">Registro diário desde {formatarData(est.desde)}. Respostas anteriores à versão beta entram nos totais acima, mas não aqui: nada é estimado para trás.</p>}
        <div className="cf-numeros cf-numeros--miudo">
          <Numero rotulo="Respostas" valor={p.revisoes} nota={`${p.diasAtivos} ${p.diasAtivos === 1 ? 'dia' : 'dias'} com estudo`} />
          <Numero rotulo="Flashcards novos" valor={p.novos} nota="Vistos pela primeira vez no período" />
          <Numero rotulo="Acerto na primeira resposta" valor={pct(p.primeirasCertas, p.primeiras)} nota={`${p.primeirasCertas} de ${p.primeiras} flashcards respondidos pela primeira vez com alternativas`} />
          <Numero rotulo="Acerto nas alternativas" valor={pct(p.objetivasCertas, p.objetivas)} nota={`${p.objetivasCertas} de ${p.objetivas} respostas com alternativa`} />
        </div>
        <h3 className="cf-sub">Como você se avaliou</h3>
        {avaliacoes ? (
          <div className="cf-barra" role="img" aria-label={`Errei ${p.errei}, hesitei ${p.hesitei}, sabia ${p.sabia}`}>
            {(['errei', 'hesitei', 'sabia'] as const).map((k) => p[k] ? <span key={k} className={`cf-barra__${k}`} style={{ flexGrow: p[k] }}>{rotuloAvaliacao[k]} {p[k]}</span> : null)}
          </div>
        ) : <p className="cf-nota">Ainda sem autoavaliações no período. Elas vêm da Biblioteca (Errei, Hesitei, Sabia); no Torneio conta só o acerto da alternativa.</p>}
        <p className="cf-nota">“Sabia” é a sua impressão, não um acerto conferido: o acerto objetivo é o da alternativa escolhida.</p>
        <h3 className="cf-sub">Respostas por dia</h3>
        <div className="cf-dias" role="img" aria-label={`Respostas por dia nos últimos ${dias} dias`}>
          {p.porDia.map((d) => <i key={d.dia} title={`${formatarData(d.dia)}: ${d.revisoes}`} style={{ height: `${(100 * d.revisoes) / maxDia}%` }} data-hoje={d.dia === chaveDoDia(Date.now()) || undefined} />)}
        </div>
      </section>

      <section className="cf-bloco" aria-labelledby="cf-areas">
        <h2 id="cf-areas">Por assunto</h2>
        <div className="cf-tabela">
          <table>
            <thead><tr><th scope="col">Área</th><th scope="col">Estudados</th><th scope="col">Acerto</th><th scope="col">Pendentes</th><th scope="col"><span className="so-leitor">Ação</span></th></tr></thead>
            <tbody>
              {est.porArea.map((a) => (
                <tr key={a.area}>
                  <th scope="row">{a.nome}</th>
                  <td className="numerico">{a.estudados}/{a.total}</td>
                  <td className="numerico">{pct(a.acertos, a.tentativas)}</td>
                  <td className="numerico">{a.pendentes}</td>
                  <td><a href={href(estudar(a.pendentes ? 'pendentes' : 'area:' + a.area, 20, [a.area]))}>{a.pendentes ? 'Revisar' : 'Estudar'}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cf-nota">Acerto por assunto: respostas certas sobre todas as respostas daquela área, desde o começo.</p>
      </section>
    </article>
  )
}

const rotuloAvaliacao = { errei: 'Errei', hesitei: 'Hesitei', sabia: 'Sabia' }

function Numero({ rotulo, valor, nota, destino }: { rotulo: string; valor: number | string; nota: string; destino?: string }) {
  return (
    <div className="cf-numero">
      <span>{rotulo}</span>
      <b className="numerico">{typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor}</b>
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

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const RITMOS = [10, 20, 30, 50, 80]

export function CronogramaFlashcards() {
  const { cartas, nomes } = usarAcervo()
  const [plano, definirPlano] = useState<PlanoFlashcards | null>(() => ler<PlanoFlashcards | null>(CHAVE_PLANO, null))
  const [editando, definirEditando] = useState(!plano)
  const calc = useMemo(() => (cartas && plano ? calcularPlano(plano, cartas) : null), [cartas, plano])
  const salvar = (p: PlanoFlashcards) => { gravar(CHAVE_PLANO, p); definirPlano(p); definirEditando(false) }
  return (
    <article className="cf empilha-2">
      <Abas atual="cronograma" />
      <header className="cf-cabeca">
        <p className="cf-selo"><span className="cf-beta">Beta</span> Flashcards</p>
        <h1>Meu cronograma de flashcards</h1>
        <p>Escolha a data-alvo, os assuntos e os dias em que você estuda. A meta de cada dia junta as revisões que venceram e os flashcards novos que faltam. É separado do cronograma de questões.</p>
      </header>
      {!cartas ? <p role="status">Carregando o acervo…</p> : editando || !plano
        ? <FormularioPlano atual={plano} nomes={nomes} aoSalvar={salvar} aoCancelar={plano ? () => definirEditando(false) : undefined} />
        : calc && <ResumoPlano plano={plano} calc={calc} nomes={nomes} aoEditar={() => definirEditando(true)} />}
    </article>
  )
}

function ResumoPlano({ plano, calc, nomes, aoEditar }: { plano: PlanoFlashcards; calc: ReturnType<typeof calcularPlano>; nomes: Record<string, string>; aoEditar: () => void }) {
  const assuntos = plano.areas.length ? plano.areas.map((a) => nomes[a] ?? a).join(', ') : 'Todas as áreas'
  const aviso: Record<string, string> = {
    'data-passada': 'A data-alvo já passou. Escolha uma nova data para continuar com metas diárias; as revisões vencidas seguem abaixo.',
    'sem-flashcards': 'Os assuntos escolhidos não têm flashcards no acervo. Edite o plano e escolha outras áreas.',
    concluido: 'Tudo em dia: você já viu todos os flashcards do plano e nenhuma revisão venceu hoje.',
    'acima-do-ritmo': `Para terminar até a data, a carga estimada é de ${calc.cargaPorDia} por dia, acima do seu ritmo de ${plano.ritmo}. Aumente o ritmo, inclua mais dias ou adie a data.`,
  }
  const acumuladas = calc.revisoesHoje > plano.ritmo
  return (
    <section className="cf-bloco cf-plano" aria-label="Plano atual">
      <div className="cf-plano__topo">
        <div>
          <h2>{calc.situacao === 'data-passada' ? 'A data-alvo passou' : `${calc.diasRestantes} ${calc.diasRestantes === 1 ? 'dia de estudo' : 'dias de estudo'} até ${formatarData(plano.data)}`}</h2>
          <p className="cf-nota">{assuntos} · {plano.diasSemana.length === 7 || !plano.diasSemana.length ? 'todos os dias' : plano.diasSemana.map((d) => DIAS_SEMANA[d]).join(', ')} · ritmo de {plano.ritmo} por dia</p>
        </div>
        <button type="button" className="botao botao--fantasma" onClick={aoEditar}><Icone nome="lapis" tamanho={16} /> Editar</button>
      </div>
      {aviso[calc.situacao] && <p className={`cf-alerta cf-alerta--${calc.situacao}`} role="status">{aviso[calc.situacao]}</p>}
      {acumuladas && <p className="cf-alerta" role="status">Acumularam {calc.revisoesHoje} revisões, mais que o seu ritmo. A sessão de hoje começa por elas; os novos esperam até a fila baixar.</p>}
      <div className="cf-numeros cf-numeros--miudo">
        <Numero rotulo="Meta de hoje" valor={calc.ehDiaDeEstudo ? calc.metaHoje : 0} nota={calc.ehDiaDeEstudo ? 'Revisões vencidas + novos do dia' : 'Hoje não é dia de estudo no seu plano'} />
        <Numero rotulo="Revisões vencidas" valor={calc.revisoesHoje} nota="Nos assuntos do plano" />
        <Numero rotulo="Novos por dia" valor={calc.novosPorDia} nota={`Faltam ${calc.novosRestantes.toLocaleString('pt-BR')} nunca estudados`} />
        <Numero rotulo="Feitos hoje" valor={calc.feitosHoje} nota="Flashcards do plano respondidos hoje" />
      </div>
      {calc.metaHoje > 0 && (
        <a className="botao botao--principal botao--grande" href={href(estudar('plano', Math.max(1, calc.metaHoje - calc.feitosHoje) || calc.metaHoje, plano.areas))}>Começar a sessão de hoje</a>
      )}
    </section>
  )
}

function FormularioPlano({ atual, nomes, aoSalvar, aoCancelar }: { atual: PlanoFlashcards | null; nomes: Record<string, string>; aoSalvar: (p: PlanoFlashcards) => void; aoCancelar?: () => void }) {
  const hoje = chaveDoDia(Date.now())
  const [data, definirData] = useState(atual?.data ?? (DATA_TEOT > hoje ? DATA_TEOT : chaveDoDia(Date.now() + 60 * DIA)))
  const [areas, definirAreas] = useState<string[]>(atual?.areas ?? [])
  const [diasSemana, definirDias] = useState<number[]>(atual?.diasSemana ?? [1, 2, 3, 4, 5, 6])
  const [ritmo, definirRitmo] = useState(atual?.ritmo ?? 20)
  const lista = Object.entries(nomes).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
  const alterna = <T,>(v: T[], x: T) => (v.includes(x) ? v.filter((y) => y !== x) : [...v, x])
  const invalido = !data || data <= hoje ? 'Escolha uma data a partir de amanhã.' : !diasSemana.length ? 'Escolha ao menos um dia da semana.' : ''
  return (
    <form className="cf-bloco cf-form" onSubmit={(e) => { e.preventDefault(); if (!invalido) aoSalvar({ data, areas, diasSemana: [...diasSemana].sort(), ritmo, criadoEm: atual?.criadoEm ?? Date.now() }) }}>
      <label className="cf-campo">
        <span>Data-alvo</span>
        <input type="date" value={data} min={chaveDoDia(Date.now() + DIA)} onChange={(e) => definirData(e.target.value)} required />
        <small>Sugestão: a data do TEOT usada no cronograma de questões ({formatarData(DATA_TEOT)}).</small>
      </label>
      <fieldset className="cf-campo">
        <legend>Assuntos</legend>
        <div className="cf-chips">
          <button type="button" aria-pressed={!areas.length} onClick={() => definirAreas([])}>Todos</button>
          {lista.map(([id, nome]) => <button key={id} type="button" aria-pressed={areas.includes(id)} onClick={() => definirAreas(alterna(areas, id))}>{nome}</button>)}
        </div>
      </fieldset>
      <fieldset className="cf-campo">
        <legend>Dias disponíveis</legend>
        <div className="cf-chips">
          {DIAS_SEMANA.map((n, i) => <button key={n} type="button" aria-pressed={diasSemana.includes(i)} onClick={() => definirDias(alterna(diasSemana, i))}>{n}</button>)}
        </div>
      </fieldset>
      <fieldset className="cf-campo">
        <legend>Ritmo diário (flashcards por dia)</legend>
        <div className="cf-chips" role="radiogroup">
          {RITMOS.map((r) => <button key={r} type="button" role="radio" aria-checked={ritmo === r} onClick={() => definirRitmo(r)}>{r}</button>)}
        </div>
      </fieldset>
      {invalido && <p className="cf-alerta" role="status">{invalido}</p>}
      <div className="cf-form__botoes">
        <button type="submit" className="botao botao--principal" disabled={!!invalido}>Salvar cronograma</button>
        {aoCancelar && <button type="button" className="botao botao--fantasma" onClick={aoCancelar}>Cancelar</button>}
      </div>
      <p className="cf-nota">O cronograma de flashcards fica salvo neste aparelho.</p>
    </form>
  )
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
          <p>Ela chegou ao painel do Tales e entra na próxima rodada de ajustes do beta.</p>
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
