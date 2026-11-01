import { href } from '../../util/rotas'
import { Icone } from '../Icone'
import { MINIMO_RANKING } from '../../util/nomeRanking'
import { MovimentoSelo } from './Movimento'
import { nQuestoes, progressoMeta, proximaMeta, type LinhaRanking, type MinhaPosicao, type Periodo } from './regras'

/** Uma frase gentil sobre o lugar da pessoa na arena, sem cobrança. */
function fraseDaPosicao(posicao: number, semana: boolean): string {
  if (posicao === 1) return semana ? 'Ninguém estudou mais do que você nesta semana.' : 'Você lidera o ranking. O seu esforço está à vista de todo mundo.'
  if (posicao <= 3) return 'Você está no Top 3. Isso é de quem senta e faz, mesmo com sono.'
  if (posicao <= 10) return semana ? 'Você está entre os dez que mais estudaram nesta semana.' : 'Você está entre os dez que mais estudam aqui.'
  if (posicao <= 50) return 'O seu nome já está no Top 50. Cada dia de estudo aparece aqui.'
  if (posicao <= 100) return 'Você está entre os cem. Cada questão de hoje aproxima o Top 50.'
  return 'Cada questão de hoje aproxima você do Salão dos Cem.'
}

/** O caminho até a próxima posição: a sua bandeira, a trilha já feita e a bandeira da meta. */
function Trilha({ meu, alvo, abaixo, de, para }: { meu: number; alvo: number; abaixo: number | null; de: string; para: string }) {
  const p = progressoMeta(meu, alvo, abaixo)
  return <div className="cem-trilha" aria-hidden="true">
    <span className="cem-trilha__marco cem-trilha__marco--eu">{de}</span>
    <span className="cem-trilha__caminho"><span className="cem-trilha__feito" style={{ width: `${p * 100}%` }}><i className="cem-trilha__passo" /></span></span>
    <span className="cem-trilha__marco cem-trilha__marco--meta"><span className="cem-trilha__bandeira" />{para}</span>
  </div>
}

const Treinar = ({ texto = 'Treinar agora' }: { texto?: string }) =>
  <a className="botao botao--principal cem-jornada__botao" href={href('/treinar')}><Icone nome="raio" tamanho={16} /> {texto}</a>

/**
 * "Sua jornada": a posição, o total, o movimento e a próxima meta como uma pequena missão. Todos os números são os
 * do servidor (posição e total de minha_posicao_ranking; a meta, da lista mandada). Seis estados: visitante,
 * menos de 5 questões, quem saiu do ranking, participante, líder e quem está fora da lista.
 */
export function Jornada({ sessao, participa, perfilCarregado, nome, nomeExibido, minhaPosicao, eu, linhas, periodo, meuTotal, aoEncontrar }: {
  sessao: boolean; participa: boolean; perfilCarregado: boolean; nome: string; nomeExibido: string
  minhaPosicao: MinhaPosicao; eu: LinhaRanking | null; linhas: LinhaRanking[] | null; periodo: Periodo; meuTotal: number
  aoEncontrar: () => void
}) {
  const semana = periodo === 'semana'
  const chamar = (s: string) => (nome ? `${nome}, ${s.charAt(0).toLocaleLowerCase('pt-BR')}${s.slice(1)}` : s)

  if (!sessao) return <section className="cem-jornada cem-jornada--convite" aria-labelledby="cem-jornada-t">
    <p className="cem-rotulo" id="cem-jornada-t">Sua jornada</p>
    <strong className="cem-jornada__grande">Sua vez</strong>
    <p className="cem-jornada__frase">Responda {nQuestoes(MINIMO_RANKING)} e o seu nome entra no ranking. Com a conta, você vê os nomes, a sua posição e a próxima meta.</p>
    <a className="botao botao--principal cem-jornada__botao" href={href('/conta?modo=criar&voltar=%2Franking')}>Criar conta grátis</a>
  </section>

  if (perfilCarregado && !participa) return <section className="cem-jornada" aria-labelledby="cem-jornada-t">
    <p className="cem-rotulo" id="cem-jornada-t">Sua jornada</p>
    <strong className="cem-jornada__grande cem-jornada__grande--texto">Fora do ranking</strong>
    <p className="cem-jornada__frase">{chamar('Você escolheu não aparecer no ranking.')} A escolha é sua e continua valendo; se quiser voltar, é só ligar de novo.</p>
    <a className="botao cem-jornada__botao" href={href('/conta?secao=ranking')}><Icone nome="ajustes" tamanho={16} /> Abrir as configurações do ranking</a>
  </section>

  if (!minhaPosicao) {
    if (meuTotal < MINIMO_RANKING) {
      const faltam = MINIMO_RANKING - meuTotal
      return <section className="cem-jornada" aria-labelledby="cem-jornada-t">
        <p className="cem-rotulo" id="cem-jornada-t">Sua jornada</p>
        <strong className="cem-jornada__grande cem-jornada__grande--texto">Quase lá</strong>
        <p className="cem-jornada__frase">{chamar(`Faltam ${nQuestoes(faltam)} para o seu nome entrar no ranking`)} como <b>{nomeExibido}</b>.</p>
        <div className="cem-trilha" aria-hidden="true">
          <span className="cem-trilha__marco cem-trilha__marco--eu">{meuTotal}</span>
          <span className="cem-trilha__caminho"><span className="cem-trilha__feito" style={{ width: `${Math.max(4, (meuTotal / MINIMO_RANKING) * 100)}%` }}><i className="cem-trilha__passo" /></span></span>
          <span className="cem-trilha__marco cem-trilha__marco--meta"><span className="cem-trilha__bandeira" />{MINIMO_RANKING}</span>
        </div>
        <Treinar texto="Responder questões" />
      </section>
    }
    return <section className="cem-jornada" aria-labelledby="cem-jornada-t">
      <p className="cem-rotulo" id="cem-jornada-t">Sua jornada</p>
      <strong className="cem-jornada__grande cem-jornada__grande--texto">Chegando</strong>
      <p className="cem-jornada__frase">A sua posição aparece assim que o seu progresso sincronizar e a próxima rodada do ranking (a cada 10 minutos) passar.</p>
      <Treinar />
    </section>
  }

  const meta = linhas ? proximaMeta(linhas, minhaPosicao) : { tipo: 'nenhuma' as const }
  return <section className="cem-jornada" aria-labelledby="cem-jornada-t">
    <p className="cem-rotulo" id="cem-jornada-t">{chamar(`Sua posição ${semana ? 'na semana' : 'geral'}`)}</p>
    <div className="cem-jornada__linha">
      <strong className="cem-jornada__grande"><span aria-hidden="true">#</span><span className="so-leitor">posição </span>{minhaPosicao.posicao}</strong>
      {eu && <MovimentoSelo linha={eu} />}
      <span className="cem-jornada__total"><b className="numerico">{minhaPosicao.total.toLocaleString('pt-BR')}</b> {semana ? 'questões nos últimos 7 dias' : 'questões respondidas'}</span>
    </div>
    <p className="cem-jornada__frase">{fraseDaPosicao(minhaPosicao.posicao, semana)}</p>
    {meta.tipo === 'passar' && <div className="cem-missao">
      <p className="cem-missao__texto"><span className="cem-missao__selo">Próxima meta</span> Mais <b className="numerico">{nQuestoes(meta.faltam)}</b> e você passa <b>{meta.nome}</b> e sobe para <b>#{meta.posicao}</b>.</p>
      <Trilha meu={minhaPosicao.total} alvo={meta.alvo} abaixo={meta.abaixo} de={`#${minhaPosicao.posicao}`} para={`#${meta.posicao}`} />
    </div>}
    {meta.tipo === 'entrar' && <div className="cem-missao">
      <p className="cem-missao__texto"><span className="cem-missao__selo">Próxima meta</span> Mais <b className="numerico">{nQuestoes(meta.faltam)}</b> e você entra no <b>Top {meta.top}</b>.</p>
      <Trilha meu={minhaPosicao.total} alvo={meta.alvo} abaixo={null} de={`#${minhaPosicao.posicao}`} para={`Top ${meta.top}`} />
    </div>}
    {meta.tipo === 'lider' && <div className="cem-missao cem-missao--lider">
      <p className="cem-missao__texto"><span className="cem-missao__selo cem-missao__selo--ouro">Liderança</span>{meta.vantagem !== null && meta.segundo
        ? meta.vantagem > 0 ? <> Você está <b className="numerico">{nQuestoes(meta.vantagem)}</b> à frente de <b>{meta.segundo}</b>.</> : <> Você divide a pontuação com <b>{meta.segundo}</b> e fica à frente pelo desempate.</>
        : ' O primeiro lugar é seu.'}</p>
    </div>}
    <div className="cem-jornada__acoes">
      <Treinar />
      {eu && <button type="button" className="botao cem-jornada__botao" onClick={aoEncontrar}><Icone nome="alvo" tamanho={16} /> Encontrar minha posição</button>}
    </div>
  </section>
}
