import { useMemo, useState } from 'react'
import { recurso } from '../../config'
import { quadroDoDia, type Numero } from '../../componentes/admin/agora'
import { vigentesPorPessoa } from '../../componentes/admin/receita'
import { rotuloPagina } from '../../componentes/admin/formatos'
import { ROTULO_GRUPO, ROTULO_SEVERIDADE, cortarPeriodos, filaDeAtencao, fraseDoEstado, numerosDoPeriodo, receitaDoPeriodo, type GrupoAtencao, type ItemAtencao, type Severidade } from '../dados/metricas'
import { usarFunil, usarSerie, serieLimpa } from '../dados/consultas'
import { usarPainel } from '../dados/painel'
import { nomeDe, novoParado } from '../dados/pessoas'
import { usarNav } from '../nav'
import { defParte, PERIODOS, type Parte, type FiltroPessoas, type VistaTriagem } from '../rotas'
import { Icone } from '../ui/Icone'
import { diaDaSerie, haQuanto, iniciais, inteiro, reais } from '../ui/formato'
import { Funil, Legenda, Quadro, SerieTempo, Composicao } from '../ui/graficos'
import { Cabeca, Carregando, Estado, Metrica, Painel, Segmento, SeloQualidade, Situacao, VariacaoTexto } from '../ui/kit'

const TOM: Record<Severidade, 'erro' | 'aviso' | 'neutro' | 'ok'> = { critica: 'erro', alta: 'aviso', media: 'neutro', oportunidade: 'ok' }

/** Comando › Visão geral e Comando › Pendências. */
export default function Comando() {
  const { estado } = usarNav()
  return estado.parte === 'pendencias' ? <Pendencias /> : <VisaoGeral />
}

function usarFila() {
  const p = usarPainel()
  const fontes = [
    ...(p.eventosQ.erro && !p.eventos ? ['avisos do processador'] : []),
    ...(p.usuariosQ.erro && !p.usuariosQ.dados ? ['lista de pessoas'] : []),
    ...(p.resumoQ.erro && !p.resumoQ.dados ? ['resumo do painel'] : []),
  ]
  const parados = useMemo(() => p.usuarios ? p.usuarios.filter(u => novoParado(u)) : null, [p.usuarios])
  return useMemo(() => filaDeAtencao({ eventos: p.eventos, lidosPagamento: p.lidosPagamento.lidos, assinaturas: p.reais, pendenciasConteudo: p.pendenciasConteudo, novosParados: parados, fontesIndisponiveis: fontes }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.eventos, p.lidosPagamento.lidos, p.reais, p.pendenciasConteudo, parados, fontes.join('|')])
}

function useIrDestino() {
  const { ir } = usarNav()
  const p = usarPainel()
  return (item: ItemAtencao) => item.acao === 'Tentar de novo' ? void p.atualizar() : ir(item.destino.aba as Parte, { ...(item.destino.filtro ? { filtro: item.destino.filtro as FiltroPessoas } : {}), ...(item.destino.vista ? { vista: item.destino.vista as VistaTriagem } : {}) })
}

function VisaoGeral() {
  const p = usarPainel()
  const nav = usarNav()
  const periodo = nav.estado.periodo
  const serieQ = usarSerie(periodo * 2, true)
  const { funil, carregando: carregandoFunil } = usarFunil()
  const fila = usarFila()
  const irDestino = useIrDestino()
  const serie = serieLimpa(serieQ.dados)
  const cortes = useMemo(() => cortarPeriodos(serie, periodo), [serie, periodo])
  const num = cortes ? numerosDoPeriodo(cortes) : null
  const receita = useMemo(() => p.reais && !p.cobrancasCarregando && !p.avisoCobrancas ? receitaDoPeriodo(p.reais, p.cobrancas, periodo) : null, [p.reais, p.cobrancas, p.cobrancasCarregando, p.avisoCobrancas, periodo])
  const quadro = useMemo(() => quadroDoDia({ usuarios: p.usuarios, sinais: Array.isArray(p.sinaisQ.dados) ? p.sinaisQ.dados : null, serie: Array.isArray(serieQ.dados) ? serieQ.dados : null, resumo: p.resumo, funil, assinaturas: p.reais, cobrancas: p.cobrancas }),
    [p.usuarios, p.sinaisQ.dados, serieQ.dados, p.resumo, funil, p.reais, p.cobrancas])
  const criticos = fila.filter(i => i.severidade === 'critica').length
  const frase = fraseDoEstado({ online: p.online, estudaramHoje: quadro.numeros.estudaram.hoje, questoes: num?.questoes ?? null, dias: periodo, criticos, pendentes: fila.length })
  const online = p.usuarios?.filter(u => u.online).sort((a, b) => (b.visto_em ?? '').localeCompare(a.visto_em ?? '')) ?? null
  const rotulos = (cortes?.atual ?? []).map(d => ({ longo: diaDaSerie(d.dia, true), curto: diaDaSerie(d.dia) }))
  const assinantes = p.reais ? vigentesPorPessoa(p.reais).length : null
  const carregandoSerie = serieQ.carregando && !serieQ.dados
  const saude = criticos ? 'erro' : fila.some(i => i.severidade === 'alta') ? 'aviso' : 'ok'

  return <div className="a3-pilha a3-pilha--larga">
    <header className="a3-comando-topo">
      <div className="a3-comando-topo__texto">
        <span className="a3-rotulo">Comando · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' })}</span>
        <h1 className="a3-titulo-1">Estado do Orto Questões</h1>
        <p className="a3-comando-frase"><Situacao tom={saude === 'erro' ? 'erro' : saude === 'aviso' ? 'aviso' : 'ok'}><span>{frase}</span></Situacao></p>
        <div className="a3-comando-topo__controles">
          <Segmento rotulo="Período, comparado com o período anterior de mesmo tamanho" opcoes={PERIODOS.map(d => [d, `${d} dias`] as [typeof d, string])} valor={periodo} aoMudar={d => nav.ajustar({ periodo: d })} />
          <span className="a3-mudo a3-pequeno">comparado com os {periodo} dias anteriores</span>
        </div>
      </div>
      <figure className="a3-cena a3-comando-cena" aria-hidden="true">
        <picture>
          <source media="(max-width: 899px)" srcSet={recurso('pixel/admin/observatorio-movel.webp')} />
          <img src={recurso('pixel/admin/observatorio-960.webp')} alt="" width={960} height={320} decoding="async" />
        </picture>
      </figure>
    </header>

    <section className="a3-painel" aria-label={`Indicadores dos últimos ${periodo} dias`}>
      <div className="a3-faixa-metricas" style={{ '--colunas': 5 } as React.CSSProperties}>
        <Metrica metrica="estudaramDia" grande valor={num ? inteiro(num.estudaramDia.atual) : carregandoSerie ? '…' : null} unidade="por dia" variacao={num?.estudaramDia}
          tendencia={cortes?.atual.map(d => d.ativos)} aoInvestigar={() => nav.ir('agora')} />
        <Metrica metrica="questoes" valor={num ? inteiro(num.questoes.atual) : carregandoSerie ? '…' : null} variacao={num?.questoes} tendencia={cortes?.atual.map(d => d.respostas)} aoInvestigar={() => nav.ir('retencao')} />
        <Metrica metrica="cadastros" valor={num ? inteiro(num.cadastros.atual) : carregandoSerie ? '…' : null} variacao={num?.cadastros} tendencia={cortes?.atual.map(d => d.cadastros)} aoInvestigar={() => nav.ir('usuarios', { filtro: 'novos' })} />
        <Metrica metrica="receitaConfirmada" valor={receita ? reais(receita.confirmada.atual) : p.cobrancasCarregando ? '…' : null} variacao={receita?.confirmada} formato={reais}
          nota={receita ? (receita.reconstruida > 0 ? <>+ {reais(receita.reconstruida)} reconstruído, à parte</> : 'nada reconstruído') : p.avisoCobrancas ? 'cobranças gravadas indisponíveis' : undefined}
          tendencia={receita?.porDia.map(d => d.confirmada)} aoInvestigar={() => nav.ir('financeiro')} />
        <Metrica metrica="assinantes" valor={assinantes === null ? null : inteiro(assinantes)} unidade="pessoas"
          nota={receita ? `${receita.novas.atual} ${receita.novas.atual === 1 ? 'nova' : 'novas'} no período` : undefined} aoInvestigar={() => nav.ir('assinaturas')} />
      </div>
    </section>

    <div className="a3-grade a3-grade--12">
      <div style={{ gridColumn: 'span 8' }}>
        <Quadro titulo="Questões respondidas por dia" descricao={`Últimos ${periodo} dias; a linha tracejada é o período anterior, alinhada dia a dia. Hoje ainda está em andamento.`}
          fonte="serie_diaria_admin · dia de São Paulo" qualidade="confirmado"
          legenda={<Legenda itens={[{ nome: `Últimos ${periodo} dias`, chave: 'linha' }, ...(cortes?.anterior ? [{ nome: `${periodo} dias anteriores`, chave: 'tracejada' as const }] : [])]} />}
          estado={carregandoSerie ? <Carregando linhas={5} /> : !cortes ? <Estado tipo="erro" compacto titulo="Série diária indisponível" texto="Nada foi trocado por zero." acao={<button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => void serieQ.recarregar()}>Tentar de novo</button>} /> : undefined}
          tabela={cortes ? { cabecalho: ['Dia', 'Questões', 'Pessoas', 'Cadastros', ...(cortes.anterior ? ['Questões antes'] : [])], linhas: cortes.atual.map((d, i) => [diaDaSerie(d.dia, true), inteiro(d.respostas), inteiro(d.ativos), inteiro(d.cadastros), ...(cortes.anterior ? [inteiro(cortes.anterior[i].respostas)] : [])]) } : null}>
          {cortes && <SerieTempo descricao={`Questões respondidas por dia nos últimos ${periodo} dias. Use as setas para ler dia a dia.`} rotulos={rotulos} altura={240}
            series={[{ nome: 'Questões', tipo: 'area', valores: cortes.atual.map(d => d.respostas) }, ...(cortes.anterior ? [{ nome: 'Período anterior', tipo: 'linha' as const, estilo: 'tracejada' as const, valores: cortes.anterior.map(d => d.respostas) }] : [])]} />}
        </Quadro>
      </div>
      <div style={{ gridColumn: 'span 4' }}>
        <Painel titulo={fila.length ? 'Pede ação agora' : 'Nada pedindo ação'} descricao={fila.length ? `${fila.length} ${fila.length === 1 ? 'item' : 'itens'} na fila, do mais grave ao menos grave` : 'Sem falhas de pagamento, pendências de conteúdo ou fontes fora do ar.'}
          acoes={fila.length > 3 ? <a className="a3-botao a3-botao--fantasma a3-botao--pequeno" href={nav.link('pendencias')} onClick={e => { e.preventDefault(); nav.ir('pendencias') }}>Ver todas <Icone nome="seta" tamanho={14} /></a> : undefined}
          justo className="a3-altura-cheia">
          {fila.length ? <ol className="a3-fila">{fila.slice(0, 4).map(i => <LinhaFila key={i.id} item={i} aoAgir={irDestino} />)}</ol>
            : <div style={{ padding: '0 20px 20px' }}><Estado compacto icone="certo" titulo="Tudo em dia" texto="A fila se atualiza sozinha a cada minuto." /></div>}
        </Painel>
      </div>
    </div>

    <div className="a3-grade a3-grade--3">
      <Painel titulo={<><i className="a3-ponto a3-ponto--vivo" style={{ marginRight: 8 }} aria-hidden="true" />Acontecendo agora</>} descricao="Sinal do aparelho nos últimos 5 minutos"
        acoes={<a className="a3-botao a3-botao--fantasma a3-botao--pequeno" href={nav.link('agora')} onClick={e => { e.preventDefault(); nav.ir('agora') }}>Atividade <Icone nome="seta" tamanho={14} /></a>}>
        <div className="a3-agora-numero"><span className="num">{p.online ?? '—'}</span><span className="a3-mudo">{p.online === 1 ? 'pessoa online' : 'pessoas online'}</span></div>
        {online === null ? <SeloQualidade q="indisponivel" /> : online.length === 0 ? <p className="a3-mudo">Ninguém com o site aberto agora.</p> :
          <ul className="a3-vivos">{online.slice(0, 5).map(u => <li key={u.id_usuario}>
            <button type="button" onClick={() => nav.abrirPessoa(u.id_usuario)}><span className="a3-avatar">{iniciais(u.nome ?? u.email)}<i className="a3-ponto a3-ponto--vivo" /></span>
              <span><b>{nomeDe(u)}</b><small>{u.pagina ? rotuloPagina(u.pagina) : 'página ainda não registrada'}</small></span></button>
          </li>)}</ul>}
        {online && online.length > 5 && <a className="a3-link" href={nav.link('usuarios', { filtro: 'online' })} onClick={e => { e.preventDefault(); nav.ir('usuarios', { filtro: 'online' }) }}>Mais {online.length - 5} online</a>}
      </Painel>

      <Painel titulo="Estudo de hoje" descricao="Hoje (em andamento) contra ontem inteiro">
        <dl className="a3-pares">
          <ParHoje rotulo="Pessoas que estudaram" n={quadro.numeros.estudaram} />
          <ParHoje rotulo="Fizeram questões" n={quadro.numeros.pessoasQuestoes} />
          <ParHoje rotulo="Questões respondidas" n={quadro.numeros.questoes} />
          <ParHoje rotulo="Usaram flashcards" n={quadro.numeros.flashcards} />
          <ParHoje rotulo="Resumos abertos" n={quadro.numeros.resumosAbertos} />
          <ParHoje rotulo="Cadastros" n={quadro.numeros.cadastros} />
        </dl>
      </Painel>

      <Painel titulo="Ativação" descricao="Todas as contas desde o começo; a maior queda fica em vermelho"
        acoes={<a className="a3-botao a3-botao--fantasma a3-botao--pequeno" href={nav.link('crescimento')} onClick={e => { e.preventDefault(); nav.ir('crescimento') }}>Funil <Icone nome="seta" tamanho={14} /></a>}>
        {carregandoFunil && !funil ? <Carregando linhas={5} /> : !funil ? <Estado compacto tipo="erro" titulo="Funil indisponível" /> :
          <Funil etapas={[{ nome: 'Cadastraram', valor: funil.cadastrados }, { nome: 'Confirmaram o e-mail', valor: funil.confirmaram }, { nome: '1ª questão', valor: funil.responderam },
            { nome: '50 questões', valor: funil.passaram_50 }, { nome: 'Assinaram', valor: funil.assinaram, base: 'quem fez a 1ª questão', sobre: 2 }]} />}
      </Painel>
    </div>

    <div className="a3-grade a3-grade--2">
      <Painel titulo={`Receita dos últimos ${periodo} dias`} descricao="Confirmado e reconstruído lado a lado, nunca somados"
        acoes={<a className="a3-botao a3-botao--fantasma a3-botao--pequeno" href={nav.link('cobrancas')} onClick={e => { e.preventDefault(); nav.ir('cobrancas') }}>Cobranças <Icone nome="seta" tamanho={14} /></a>}>
        {!receita ? (p.avisoCobrancas ? <Estado compacto tipo="erro" titulo="Cobranças gravadas indisponíveis" texto="A receita do período não aparece para não misturar estimativa com o que entrou." /> : <Carregando linhas={4} />) : <div className="a3-pilha">
          <dl className="a3-pares">
            <div><dt>Confirmado</dt><dd>{reais(receita.confirmada.atual)} <VariacaoTexto v={receita.confirmada} formato={reais} curto /></dd></div>
            <div><dt>Reconstruído (fora do confirmado)</dt><dd>{reais(receita.reconstruida)}</dd></div>
            <div><dt>Primeiras assinaturas · renovações</dt><dd>{receita.novas.atual} · {receita.renovacoes}</dd></div>
          </dl>
          <Composicao formato={reais} partes={[{ nome: 'Pix', valor: receita.porMeio.pix }, { nome: 'Cartão', valor: receita.porMeio.cartao }]} />
        </div>}
      </Painel>
      <Painel titulo="Qualidade do acervo" descricao="Relatos de erro e comentários marcados como “não ajudou”"
        acoes={<a className="a3-botao a3-botao--fantasma a3-botao--pequeno" href={nav.link('conteudo', { vista: 'relatos' })} onClick={e => { e.preventDefault(); nav.ir('conteudo', { vista: 'relatos' }) }}>Triagem <Icone nome="seta" tamanho={14} /></a>}>
        <div className="a3-agora-numero"><span className="num">{p.pendenciasConteudo ?? '—'}</span><span className="a3-mudo">esperando revisão</span></div>
        <ul className="a3-atalhos-lista">
          {([['suspeitas', 'Questões suspeitas', 'acerto abaixo do esperado'], ['faceis', 'Fáceis demais', 'quase todos acertam'], ['temas', 'Temas com acerto baixo', 'por subtema'], ['relatos', 'Relatos de erro', 'enviados pelas pessoas'], ['avaliacoes', 'Comentários que não ajudaram', 'com observação']] as Array<[VistaTriagem, string, string]>).map(([v, r, d]) =>
            <li key={v}><a href={nav.link('conteudo', { vista: v })} onClick={e => { e.preventDefault(); nav.ir('conteudo', { vista: v }) }}><span>{r}<small>{d}</small></span><Icone nome="direita" tamanho={15} /></a></li>)}
        </ul>
      </Painel>
    </div>
  </div>
}

function ParHoje({ rotulo, n }: { rotulo: string; n: Numero }) {
  const delta = n.hoje !== null && n.ontem !== null ? n.hoje - n.ontem : null
  return <div><dt>{rotulo}</dt><dd>
    {n.hoje === null ? <SeloQualidade q="indisponivel" /> : inteiro(n.hoje)}
    <span className="a3-mudo a3-pequeno" style={{ marginLeft: 8, fontWeight: 400 }}>{n.ontem === null ? 'ontem não medido' : <>ontem {inteiro(n.ontem)}{delta !== null && delta !== 0 && <span className={delta > 0 ? 'a3-variacao--bom' : 'a3-variacao--ruim'}> {delta > 0 ? '↑' : '↓'}</span>}</>}</span>
  </dd></div>
}

function LinhaFila({ item, aoAgir, detalhado = false }: { item: ItemAtencao; aoAgir: (i: ItemAtencao) => void; detalhado?: boolean }) {
  return <li className={`a3-fila__item a3-fila__item--${item.severidade}`}>
    <span className="a3-fila__marca" aria-hidden="true" />
    <div className="a3-fila__texto">
      <span className="a3-fila__titulo"><b className="num">{inteiro(item.contagem)}</b> {item.titulo}</span>
      {detalhado && <span className="a3-fila__causa">{item.causa}</span>}
      <span className="a3-fila__meta"><Situacao tom={TOM[item.severidade]}>{ROTULO_SEVERIDADE[item.severidade]}</Situacao>{item.ultimoEm && <span>· último {haQuanto(item.ultimoEm)}</span>}</span>
    </div>
    <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => aoAgir(item)}>{item.acao}</button>
  </li>
}

function Pendencias() {
  const fila = usarFila()
  const irDestino = useIrDestino()
  const [grupo, definirGrupo] = useState<GrupoAtencao | 'todos'>('todos')
  const grupos = (['tecnico', 'receita', 'conteudo', 'acompanhamento'] as GrupoAtencao[])
  const visiveis = grupo === 'todos' ? fila : fila.filter(i => i.grupo === grupo)
  const parte = defParte('pendencias')
  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Comando" titulo={parte.rotulo} pergunta={parte.pergunta} />
    <div className="a3-grade a3-grade--4">
      {grupos.map(g => {
        const itens = fila.filter(i => i.grupo === g)
        const pior = itens[0]?.severidade
        return <button key={g} type="button" className="a3-painel a3-cartao-grupo" aria-pressed={grupo === g} onClick={() => definirGrupo(grupo === g ? 'todos' : g)}>
          <span className="a3-rotulo">{ROTULO_GRUPO[g]}</span>
          <span className="a3-cartao-grupo__n num">{itens.reduce((s, i) => s + i.contagem, 0)}</span>
          <span className="a3-mudo a3-pequeno">{itens.length ? <Situacao tom={TOM[pior!]}>{itens.length} {itens.length === 1 ? 'tipo de pendência' : 'tipos de pendência'}</Situacao> : 'nada pendente'}</span>
        </button>
      })}
    </div>
    <Painel titulo={grupo === 'todos' ? 'Toda a fila' : ROTULO_GRUPO[grupo]} descricao="Cada item leva ao registro que o gerou; nada aqui é decorativo e nada some sem ser resolvido na origem."
      acoes={grupo !== 'todos' ? <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definirGrupo('todos')}>Mostrar tudo</button> : undefined} justo>
      {visiveis.length ? <ol className="a3-fila a3-fila--larga">{visiveis.map(i => <LinhaFila key={i.id} item={i} aoAgir={irDestino} detalhado />)}</ol>
        : <div style={{ padding: '0 20px 20px' }}><Estado icone="certo" titulo="Nada pendente aqui" texto="Quando surgir uma falha de pagamento, um relato ou uma fonte fora do ar, ela aparece nesta fila." /></div>}
    </Painel>
  </div>
}
