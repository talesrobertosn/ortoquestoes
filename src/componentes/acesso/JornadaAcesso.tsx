import { useState } from 'react'
import { EMBLEMAS } from '../../estado/conquistas'
import { Medalha } from '../Medalha'
import { Icone, type NomeIcone } from '../Icone'

/*
 * O que a conta guarda, na tela de entrar (01/11/2026): três capítulos da jornada (o que você estuda, o que fica
 * registrado, como você evolui), a vitrine com emblemas reais do catálogo (toque ou foco mostra o nome e como
 * conquistar, sem depender de passar o mouse) e a faixa das provas que existem no acervo, agrupadas por tipo.
 * Só promete o que existe: o cronograma, que é do plano, aparece com o selo dele.
 */
const CAPITULOS: { titulo: string; texto: string; itens: { icone: NomeIcone; texto: string; plano?: boolean }[] }[] = [
  { titulo: 'O que você estuda', texto: 'Tudo comentado como uma aula.', itens: [
    { icone: 'livro', texto: 'Questões oficiais com o porquê de cada alternativa' },
    { icone: 'raio', texto: 'Flashcards e resumos dos capítulos que mais caem' },
  ] },
  { titulo: 'O que fica guardado', texto: 'Em qualquer aparelho, de onde parou.', itens: [
    { icone: 'grafico', texto: 'Desempenho por tema e por prova' },
    { icone: 'errado', texto: 'Caderno de erros e questões favoritas' },
    { icone: 'calendario', texto: 'Cronograma até a data da sua prova', plano: true },
  ] },
  { titulo: 'Como você evolui', texto: 'O hábito vira progresso.', itens: [
    { icone: 'reiniciar', texto: 'Revisão espaçada: o que você errou volta no dia certo' },
    { icone: 'fogo', texto: 'Sequência de dias, ranking e emblemas' },
  ] },
]

const VITRINE = ['questoes-500', 'sequencia-14', 'precisao-25', 'aproveitamento-70', 'revisoes-250', 'especialista-teot', 'mestre-trauma', 'mestre-mao', 'bib-concluidos-3', 'dias-30']

/** As provas do acervo, pelo nome real cadastrado, agrupadas pelo que a pessoa está buscando. */
const PROVAS: { grupo: string; provas: string[] }[] = [
  { grupo: 'Título de especialista', provas: ['TEOT', 'TARO'] },
  { grupo: 'Residência e R4', provas: ['ENARE R4 Ortopedia', 'USP-SP', 'FMRP-USP', 'UFG', 'PUC-SP', 'UERJ', 'INTO', 'Einstein', 'IAUPE', 'CET-PR', 'SBOT-SP'] },
  { grupo: 'Subespecialidades', provas: ['ENARE Cirurgia da Mão', 'Título de cirurgia da mão (SBCM)', 'SIMÃO (simulado do título)', 'TECOC/SBCOC Ombro e Cotovelo', 'TEPOP', 'R4 Coluna SES-DF', 'R4 Coluna Joinville', 'Fellowship Quadril'] },
]

export function JornadaAcesso() {
  const emblemas = VITRINE.map((id) => EMBLEMAS.find((e) => e.id === id)).filter((e) => e && !e.secreta) as (typeof EMBLEMAS)[number][]
  const [aberto, definirAberto] = useState(emblemas[0]?.id ?? '')
  const atual = emblemas.find((e) => e.id === aberto)
  return <>
    <section className="pj" aria-labelledby="pj-titulo">
      <header className="pj-cabeca">
        <p className="pj-selo">Sua jornada</p>
        <h2 id="pj-titulo">A conta guarda o caminho, não só a senha</h2>
      </header>
      <ol className="pj-capitulos">
        {CAPITULOS.map((c, i) => (
          <li key={c.titulo} className="pj-capitulo">
            <span className="pj-capitulo__numero" aria-hidden="true">{i + 1}</span>
            <h3>{c.titulo}</h3>
            <p>{c.texto}</p>
            <ul>{c.itens.map((item) => <li key={item.texto}><Icone nome={item.icone} tamanho={16} /><span>{item.texto}{item.plano && <small className="pj-plano">no plano</small>}</span></li>)}</ul>
          </li>
        ))}
      </ol>
      {/* A vitrine: os emblemas numa prateleira; o escolhido mostra o nome e o que é preciso fazer. */}
      <div className="pj-vitrine">
        <div className="pj-vitrine__prateleira" role="group" aria-label="Alguns emblemas para conquistar">
          {emblemas.map((e) => (
            <button key={e.id} type="button" className="pj-emblema" aria-pressed={aberto === e.id} aria-label={`${e.rotulo}: ${e.descricao}`}
              onClick={() => definirAberto(e.id)} onFocus={() => definirAberto(e.id)} onMouseEnter={() => definirAberto(e.id)}>
              <Medalha conquista={e} tamanho={48} />
            </button>
          ))}
        </div>
        {atual && <p className="pj-vitrine__legenda" aria-live="polite"><strong>{atual.rotulo}</strong> {atual.descricao}</p>}
      </div>
    </section>
    <section className="pp" aria-labelledby="pp-titulo">
      <h2 id="pp-titulo" className="pp-titulo">As provas do acervo</h2>
      <div className="pp-grupos">
        {PROVAS.map((g) => (
          <div key={g.grupo} className="pp-grupo">
            <h3>{g.grupo}</h3>
            <ul>{g.provas.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        ))}
      </div>
      <p className="pp-nota">Além dos OrtoQuestões Simulados, feitos por engenharia reversa das bancas.</p>
    </section>
  </>
}
