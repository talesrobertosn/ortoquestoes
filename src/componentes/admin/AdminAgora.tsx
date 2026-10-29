import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Icone } from '../Icone'
import { novoParado, type FiltroUsuarios, type LinhaUsuario } from './AdminUsuarios'
import { AdminFichaUsuario, type AbaFicha } from './AdminFichaUsuario'
import { AoVivo, Atividade } from './AoVivo'
import { LinhaPessoa } from './LinhaPessoa'
import { Comparacao } from './Comparacao'
import { diaSP, type DiaSerie } from './estudoHoje'
import { acertoAposRevisao, acertoReal, corresponde, data, haQuanto, haQuantoTempo, hora, normalizar, registrarTitulosResumos, rotuloOrigem, tituloResumo } from './formatos'
import { carregarIndiceBiblioteca } from '../../biblioteca/conteudo'
import { indexarSinais, type SinalUsuario } from './sinais'
import { CINCO_MIN, usarRpc } from './usarRpc'
import type { Aba } from './secoes'
import { BLOCOS_AGORA, quadroDoDia, type FunilServidor, type MovimentoDinheiro, type Numero, type QuadroDoDia } from './agora'
import type { AssinaturaBase, CobrancaReal } from './receita'
import { rotuloMeio, rotuloPlano } from './rotulos'
import { real } from '../../dados/planos'

/** O que resumo_admin devolve (contagens do servidor). */
export interface ResumoAdmin {
  online_agora: number
  usuarios: number; novos_7d: number
  ativos_hoje: number; ativos_7d: number; ativos_30d: number
  respondidas_hoje: number; respondidas_7d: number
  assinantes_vigentes: number
}

const n = (v: number | null | undefined) => v === null || v === undefined ? '—' : v.toLocaleString('pt-BR')
const dataCurta = (dia: string) => dia.split('-').reverse().slice(0, 2).join('/')
const NAO_MEDIDO = 'ainda não medido'

/**
 * Agora: a torre de controle do painel (pedido do Tales, 17/10/2026: "tenho que saber tudo o que está
 * acontecendo a todo tempo, detalhadamente"). Página longa, em blocos com título e um sumário fixo no
 * topo para pular entre eles; em TUDO o texto é completo (nome, página, atividade, título de resumo),
 * sem reticências: o layout quebra linha. Blocos:
 * 1. Online agora (AoVivo): quem está com o site aberto e o que está fazendo, uma linha por pessoa.
 * 2. Números do dia: contas, cadastros, e-mails confirmados, quem entrou, estudou, 5+ questões,
 *    questões, flashcards, resumos, assinantes, pagamentos, novas assinaturas, cancelamentos e Pix
 *    pendentes, cada um com o "de ontem" quando alguma consulta dá (senão, "ainda não medido").
 * 3. Pede atenção: pagamentos com problema, conteúdo para revisar, novos que pararam.
 * 4. Estudaram hoje (lista completa, com busca e ordenação), 5. Entraram hoje sem estudar,
 * 6. Recém-cadastrados, 7. Mais ativos na semana, 8. Dinheiro hoje (com nomes), 9. Biblioteca hoje.
 * Atualiza sozinho a cada 5 minutos (CINCO_MIN) ou na hora pelo botão Atualizar.
 */
export function AdminAgora({ conta, resumo, usuarios, atualizadoEm, assinaturas, cobrancas, avisoCobrancas, errosPagamento, pendenciasConteudo, irPara, verUsuarios }: {
  conta: string | undefined; resumo: ResumoAdmin | null; usuarios: LinhaUsuario[] | null; atualizadoEm: number | null
  assinaturas: AssinaturaBase[] | null; cobrancas: CobrancaReal[] | null; avisoCobrancas: string | null
  errosPagamento: number; pendenciasConteudo: number | null; irPara: (aba: Aba) => void; verUsuarios: (filtro: FiltroUsuarios) => void
}) {
  // Consultas leves que já existem: série diária (hoje x ontem), sinais (planos, flashcards) e funil (e-mails confirmados).
  const serieQ = usarRpc<DiaSerie[]>(conta, 'serie_diaria_admin', { p_dias: 7 }, { atualizarCada: CINCO_MIN })
  const sinaisQ = usarRpc<SinalUsuario[]>(conta, 'sinais_usuarios_admin', {}, { atualizarCada: CINCO_MIN })
  const funilQ = usarRpc<FunilServidor[]>(conta, 'funil_admin', {}, { atualizarCada: 300_000 })
  const sinaisLista = Array.isArray(sinaisQ.dados) ? sinaisQ.dados : null
  const sinais = useMemo(() => indexarSinais(sinaisLista), [sinaisLista])
  const quadro = useMemo(() => quadroDoDia({
    usuarios, sinais: sinaisLista, serie: Array.isArray(serieQ.dados) ? serieQ.dados : null, resumo, funil: funilQ.dados?.[0] ?? null, assinaturas, cobrancas,
  }), [usuarios, sinaisLista, serieQ.dados, resumo, funilQ.dados, assinaturas, cobrancas])
  const parados = useMemo(() => (usuarios ?? []).filter(novoParado).length, [usuarios])
  const [ficha, definirFicha] = useState<{ u: LinhaUsuario; aba: AbaFicha } | null>(null)
  const abrirFicha = (u: LinhaUsuario, aba: AbaFicha = 'resumo') => definirFicha({ u, aba })
  // Títulos dos resumos, para "Lendo o resumo: Fratura do colo do fêmur" em vez do id.
  const [, definirTitulos] = useState(0)
  useEffect(() => { carregarIndiceBiblioteca().then((i) => { registrarTitulosResumos(i.capitulos); definirTitulos((k) => k + 1) }).catch(() => undefined) }, [])
  const tudoCerto = !errosPagamento && !pendenciasConteudo && !parados
  const semLista = !usuarios
  const nm = quadro.numeros

  return <div className="empilha-2 adm-agora">
    <nav className="adm-sumario" aria-label="Blocos desta página">
      {BLOCOS_AGORA.map(([id, rotulo]) => <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{rotulo}</a>)}
    </nav>

    {usuarios ? <AoVivo usuarios={usuarios} sinais={sinais} atualizadoEm={atualizadoEm} abrirFicha={abrirFicha} />
      : <section className="adm-vivo adm-bloco" id="agora-online"><header className="adm-bloco__cabeca"><h2><span className="adm-online" aria-hidden="true" />Online agora <span className="adm-vivo__total numerico">{n(resumo?.online_agora)}</span></h2><small>a lista de quem está online aparece depois da migração nova</small></header></section>}

    <section className="adm-bloco adm-numeros" id="agora-numeros" aria-labelledby="adm-numeros-titulo">
      <header className="adm-bloco__cabeca">
        <h2 id="adm-numeros-titulo">Números do dia</h2>
        <small>{dataCurta(quadro.hoje)}, horário de São Paulo · "ontem" é o dia inteiro de {dataCurta(quadro.ontem)}{serieQ.carregando && !serieQ.dados ? ' · carregando a comparação…' : ''}</small>
      </header>
      <h3 className="adm-numeros__grupo">Contas</h3>
      <div className="adm-numeros__grade">
        <Tile rotulo="Contas no total" numero={nm.contas} aoClicar={() => verUsuarios('todos')} />
        <Tile rotulo="Cadastros hoje" numero={nm.cadastros} nota={nm.cadastros7d !== null ? `${n(nm.cadastros7d)} nos últimos 7 dias` : undefined} aoClicar={() => verUsuarios('novos')} />
        <Tile rotulo="Confirmaram o e-mail" numero={{ hoje: nm.confirmaramEmail, ontem: null }} nota={nm.confirmaramEmail !== null ? `de ${n(nm.contas.hoje)} contas, desde o começo · hoje: ${NAO_MEDIDO}` : 'precisa do funil (parte 2)'} />
        <Tile rotulo="Assinantes com acesso" numero={nm.assinantes} nota="pessoas: renovar não soma" aoClicar={() => verUsuarios('assinantes')} />
      </div>
      <h3 className="adm-numeros__grupo">Estudo</h3>
      <div className="adm-numeros__grade">
        <Tile rotulo="Entraram hoje" numero={nm.entraram} nota="abriram o site, estudando ou não" semLista={semLista} />
        <Tile rotulo="Pessoas que estudaram" numero={nm.estudaram} nota="questões, flashcards ou resumo" destaque semLista={semLista} aoClicar={() => verUsuarios('hoje')} />
        <Tile rotulo="Fizeram questões" numero={nm.pessoasQuestoes} semLista={semLista} />
        <Tile rotulo="Fizeram 5 ou mais questões" numero={nm.cincoOuMais} semLista={semLista} />
        <Tile rotulo="Questões respondidas" numero={nm.questoes} nota={resumo ? `${n(resumo.respondidas_7d)} na semana` : undefined} />
        <Tile rotulo="Usaram flashcards" numero={nm.flashcards} nota={nm.flashcards.hoje === null ? 'cole a parte 25 para ver' : 'o painel guarda só o último uso de cada pessoa'} />
        <Tile rotulo="Resumos abertos hoje" numero={nm.resumosAbertos} nota="resumos diferentes, pela última página de cada pessoa" semLista={semLista} />
        <Tile rotulo="Ativos na semana" numero={{ hoje: resumo?.ativos_7d ?? null, ontem: null }} nota={resumo ? `${n(resumo.ativos_30d)} nos últimos 30 dias` : undefined} aoClicar={() => verUsuarios('ativos')} />
      </div>
      <h3 className="adm-numeros__grupo">Dinheiro</h3>
      <div className="adm-numeros__grade">
        <Tile rotulo="Pagaram hoje" numero={nm.pagaram} nota={nm.valorPago.hoje !== null ? real(nm.valorPago.hoje) + (nm.valorPago.ontem !== null ? ` · ontem ${real(nm.valorPago.ontem)}` : '') : avisoCobrancas ? 'precisa das cobranças gravadas (parte 23)' : undefined} destaque aoClicar={() => irPara('cobrancas')} />
        <Tile rotulo="Novas assinaturas hoje" numero={nm.novasAssinaturas} nota={nm.voltaram.hoje ? `primeira compra · +${nm.voltaram.hoje} voltaram a assinar` : 'primeira compra de cada pessoa'} aoClicar={() => irPara('cobrancas')} />
        <Tile rotulo="Renovações hoje" numero={nm.renovacoes} nota="já eram assinantes (Pix ou cartão)" aoClicar={() => irPara('cobrancas')} />
        <Tile rotulo="Desligaram a renovação hoje" numero={nm.cancelamentos} nota="seguem com acesso até o fim do período pago" bom="desce" aoClicar={() => irPara('assinaturas')} />
        <Tile rotulo="Pix pendentes" numero={nm.pixPendentes} nota="aguardando o primeiro pagamento" aoClicar={() => irPara('assinaturas')} />
      </div>
    </section>

    <section className="adm-bloco adm-atencao" id="agora-atencao" aria-labelledby="adm-atencao-titulo">
      <h2 id="adm-atencao-titulo" className="adm-atencao__titulo">{tudoCerto ? <><Icone nome="certo" tamanho={16} /> Nada pedindo atenção</> : 'Pede atenção'}</h2>
      <div className="adm-atencao__itens">
        <button type="button" className={'adm-atencao__item' + (errosPagamento ? ' adm-atencao__item--alerta' : '')} onClick={() => irPara('pagamentos')}>
          <strong className="numerico">{errosPagamento}</strong><span>avisos de pagamento com problema</span>
        </button>
        <button type="button" className={'adm-atencao__item' + (pendenciasConteudo ? ' adm-atencao__item--alerta' : '')} onClick={() => irPara('conteudo')}>
          <strong className="numerico">{pendenciasConteudo ?? '—'}</strong><span>relatos e "não ajudou" para revisar</span>
        </button>
        <button type="button" className={'adm-atencao__item' + (parados ? ' adm-atencao__item--aviso' : '')} onClick={() => verUsuarios('novos_parados')}>
          <strong className="numerico">{usuarios ? parados : '—'}</strong><span>novos que pararam (um recado traz de volta)</span>
        </button>
      </div>
    </section>

    <EstudaramHoje quadro={quadro} sinais={sinais} semLista={semLista} abrirFicha={abrirFicha} />

    <Bloco id="agora-entraram" titulo="Entraram hoje sem estudar" total={quadro.entraram.length} nota="abriram o site hoje (login ou página vista), mas não responderam questão, nem usaram flashcards, nem abriram um resumo" semLista={semLista}
      vazio="Ninguém entrou hoje sem estudar: quem abriu o site está em Estudaram hoje.">
      {quadro.entraram.map(({ pessoa: u, em }) => <LinhaPessoa key={u.id_usuario} u={u} sinal={sinais.get(u.id_usuario)} online={u.online}
        faz={u.pagina ? <><span className="adm-pessoa__rotulo">{u.online ? 'Agora' : 'Última página'}:</span> <Atividade u={u} /></> : <span className="adm-pessoa__rotulo">Página ainda não registrada</span>}
        tempos={<>{em && <span>visto às {hora(em)} ({haQuantoTempo(em)})</span>}<span>cadastro {haQuanto(u.criado_em)}</span>{u.servico && <span>{u.servico}</span>}</>}
        numeros={[{ valor: u.respondidas.toLocaleString('pt-BR'), rotulo: 'questões no total' }, { valor: u.respondidas_7d, rotulo: 'na semana' }]}
        acoes={<Acoes u={u} abrirFicha={abrirFicha} />} />)}
    </Bloco>

    <Bloco id="agora-cadastros" titulo="Recém-cadastrados" total={quadro.recemCadastrados.length} nota="contas criadas nos últimos 14 dias, da mais nova para a mais antiga" semLista={semLista} vazio="Ninguém se cadastrou nas últimas duas semanas." aoVerTodos={() => verUsuarios('novos')}>
      {quadro.recemCadastrados.map(u => {
        const comecou = u.respondidas > 0
        return <LinhaPessoa key={u.id_usuario} u={u} sinal={sinais.get(u.id_usuario)} online={u.online}
          selos={<span className={'adm-selo ' + (comecou ? 'adm-selo--ok' : novoParado(u) ? 'adm-selo--ruim' : 'adm-selo--neutro')}>{comecou ? `já fez ${u.respondidas.toLocaleString('pt-BR')} ${u.respondidas === 1 ? 'questão' : 'questões'}` : novoParado(u) ? 'não começou e parou' : 'ainda não começou'}</span>}
          faz={<><span className="adm-pessoa__rotulo">Chegou</span> {diaSP(u.criado_em) === quadro.hoje ? `hoje às ${hora(u.criado_em)}` : diaSP(u.criado_em) === quadro.ontem ? `ontem às ${hora(u.criado_em)}` : `${haQuanto(u.criado_em)} (${data(u.criado_em)})`}{u.origem ? <> · veio de {rotuloOrigem(u.origem)}</> : ''}{u.servico ? <> · {u.servico}</> : ''}</>}
          tempos={<>{u.ultima_atividade ? <span>última resposta {haQuantoTempo(u.ultima_atividade)}</span> : <span>nenhuma resposta ainda</span>}{u.pagina && <span>última página: <Atividade u={u} /></span>}</>}
          numeros={[{ valor: u.respondidas_hoje ?? '—', rotulo: 'questões hoje', destaque: !!u.respondidas_hoje }, { valor: u.respondidas_7d, rotulo: 'na semana' }]}
          acoes={<Acoes u={u} abrirFicha={abrirFicha} />} />
      })}
    </Bloco>

    <Bloco id="agora-semana" titulo="Mais ativos na semana" total={quadro.maisAtivosSemana.length} nota="todas as pessoas com ao menos uma questão nos últimos 7 dias, da que mais respondeu para a que menos" semLista={semLista} vazio="Ninguém respondeu questões nos últimos 7 dias." aoVerTodos={() => verUsuarios('ativos')}>
      {quadro.maisAtivosSemana.map((u, i) => {
        const acerto = acertoReal(u) ?? acertoAposRevisao(u)
        return <LinhaPessoa key={u.id_usuario} u={u} sinal={sinais.get(u.id_usuario)} online={u.online} classe={i < 3 ? 'adm-pessoa--podio' : ''}
          faz={<><span className="adm-pessoa__rotulo">{i + 1}º</span> {u.respondidas_7d.toLocaleString('pt-BR')} {u.respondidas_7d === 1 ? 'questão' : 'questões'} na semana{u.respondidas_hoje ? `, ${u.respondidas_hoje} hoje` : ''}{sinais.get(u.id_usuario)?.flashcards_7d ? ` · ${sinais.get(u.id_usuario)!.flashcards_7d} flashcards na semana` : ''}</>}
          tempos={<>{u.ultima_atividade && <span>última resposta {haQuantoTempo(u.ultima_atividade)}</span>}{u.servico && <span>{u.servico}</span>}</>}
          numeros={[{ valor: u.respondidas_7d.toLocaleString('pt-BR'), rotulo: 'na semana', destaque: true }, { valor: acerto === null ? '—' : `${acerto}%`, rotulo: acertoReal(u) !== null ? 'acerto real' : 'acerto' }, { valor: u.respondidas.toLocaleString('pt-BR'), rotulo: 'no total' }]}
          acoes={<Acoes u={u} abrirFicha={abrirFicha} />} />
      })}
    </Bloco>

    <section className="adm-bloco" id="agora-dinheiro" aria-labelledby="adm-dinheiro-titulo">
      <header className="adm-bloco__cabeca">
        <h2 id="adm-dinheiro-titulo">Dinheiro hoje</h2>
        <small>o resumo do dia com nomes; o detalhe completo continua em Financeiro</small>
      </header>
      {avisoCobrancas && <p className="adm-nota">{avisoCobrancas}</p>}
      <div className="adm-dinheiro">
        <Movimentos titulo="Pagaram hoje" lista={quadro.pagaram} total={nm.valorPago.hoje} ontem={nm.pagaram.ontem} semDados={!cobrancas} vazio="Nenhum pagamento recebido hoje ainda." usuarios={usuarios} abrirFicha={abrirFicha} />
        <Movimentos titulo="Novas assinaturas hoje" lista={quadro.novasAssinaturas} ontem={nm.novasAssinaturas.ontem} semDados={!assinaturas} vazio="Nenhuma assinatura nova hoje ainda." usuarios={usuarios} abrirFicha={abrirFicha} />
        <Movimentos titulo="Renovações hoje" lista={quadro.renovacoes} ontem={nm.renovacoes.ontem} semDados={!assinaturas} vazio="Nenhuma renovação hoje ainda." usuarios={usuarios} abrirFicha={abrirFicha} />
        {quadro.voltaram.length > 0 && <Movimentos titulo="Voltaram a assinar hoje" lista={quadro.voltaram} ontem={nm.voltaram.ontem} semDados={!assinaturas} vazio="" usuarios={usuarios} abrirFicha={abrirFicha} />}
        <Movimentos titulo="Desligaram a renovação hoje" lista={quadro.cancelamentos} ontem={nm.cancelamentos.ontem} semDados={!assinaturas} vazio="Ninguém desligou a renovação hoje." usuarios={usuarios} abrirFicha={abrirFicha} tom="ruim" />
        <Movimentos titulo="Pix pendentes" lista={quadro.pixPendentes} semDados={!assinaturas} vazio="Nenhum Pix aguardando pagamento." usuarios={usuarios} abrirFicha={abrirFicha} tom="aviso" quando="pedido" />
      </div>
    </section>

    <NaBiblioteca usuarios={usuarios} sinais={sinais} abrirFicha={abrirFicha} />
    {ficha && <AdminFichaUsuario usuario={ficha.u} abaInicial={ficha.aba} aoFechar={() => definirFicha(null)} />}
  </div>
}

/** Um número do dia, com o "de ontem" quando existe; "ainda não medido" quando nenhuma consulta dá. */
function Tile({ rotulo, numero, nota, destaque, bom = 'sobe', aoClicar, semLista }: { rotulo: string; numero: Numero; nota?: string; destaque?: boolean; bom?: 'sobe' | 'desce'; aoClicar?: () => void; semLista?: boolean }) {
  const corpo = <>
    <span>{rotulo}</span><strong>{numero.hoje === null ? '—' : n(numero.hoje)}</strong>
    {numero.hoje !== null && numero.ontem !== null ? <Comparacao atual={numero.hoje} anterior={numero.ontem} base="ontem" bom={bom} /> : <small>{numero.hoje === null ? (semLista ? 'disponível depois da migração nova' : NAO_MEDIDO) : `ontem: ${NAO_MEDIDO}`}</small>}
    {nota && <small>{nota}</small>}
  </>
  const classe = 'adm-estudo__item' + (destaque ? ' adm-estudo__item--destaque' : '')
  return aoClicar ? <button type="button" className={classe} onClick={aoClicar}>{corpo}</button> : <div className={classe}>{corpo}</div>
}

function Acoes({ u, abrirFicha }: { u: LinhaUsuario; abrirFicha: (u: LinhaUsuario, aba?: AbaFicha) => void }) {
  return <>
    <button type="button" className="adm-link" onClick={() => abrirFicha(u, 'resumo')}><Icone nome="usuario" tamanho={15} /> Ver ficha</button>
    {!u.administrador && <button type="button" className="adm-link" onClick={() => abrirFicha(u, 'acoes')}><Icone nome="correio" tamanho={15} /> Enviar carta</button>}
  </>
}

/** Um bloco da página: título com contagem, nota, lista completa (sem "ver todos" com 7 itens). */
function Bloco({ id, titulo, total, nota, semLista, vazio, aoVerTodos, controles, children }: {
  id: string; titulo: string; total: number; nota?: string; semLista?: boolean; vazio: string; aoVerTodos?: () => void; controles?: ReactNode; children: ReactNode
}) {
  return <section className="adm-bloco" id={id} aria-labelledby={`${id}-titulo`}>
    <header className="adm-bloco__cabeca">
      <h2 id={`${id}-titulo`}>{titulo} <span className="adm-contagem">{semLista ? '—' : total}</span></h2>
      {nota && <small>{nota}</small>}
      {aoVerTodos && <button type="button" className="adm-link adm-bloco__ir" onClick={aoVerTodos}>Abrir em Pessoas <Icone nome="direita" tamanho={14} /></button>}
    </header>
    {controles}
    {semLista ? <p className="adm-vazio">Disponível depois da migração nova.</p> : total === 0 ? <p className="adm-vazio">{vazio}</p> : <ol className="adm-pessoas">{children}</ol>}
  </section>
}

type OrdemHoje = 'recente' | 'questoes' | 'nome'
/** Estudaram hoje: todas as pessoas do dia, com o que cada uma fez, busca e ordenação. */
function EstudaramHoje({ quadro, sinais, semLista, abrirFicha }: { quadro: QuadroDoDia<LinhaUsuario>; sinais: Map<string, SinalUsuario>; semLista: boolean; abrirFicha: (u: LinhaUsuario, aba?: AbaFicha) => void }) {
  const [busca, definirBusca] = useState('')
  const [ordem, definirOrdem] = useState<OrdemHoje>('recente')
  const termo = normalizar(busca.trim())
  const lista = useMemo(() => {
    const filtrada = quadro.estudaram.filter(f => corresponde([f.pessoa.nome, f.pessoa.email], termo))
    if (ordem === 'questoes') return [...filtrada].sort((a, b) => b.questoes - a.questoes || b.tentativas - a.tentativas)
    if (ordem === 'nome') return [...filtrada].sort((a, b) => (a.pessoa.nome ?? a.pessoa.email ?? '').localeCompare(b.pessoa.nome ?? b.pessoa.email ?? '', 'pt-BR'))
    return filtrada
  }, [quadro.estudaram, termo, ordem])
  const total = quadro.estudaram.length
  return <Bloco id="agora-estudaram" titulo="Estudaram hoje" total={total} nota="todas as pessoas que responderam questões, usaram flashcards ou abriram um resumo hoje · acerto do dia: ainda não medido (a lista traz só o total de questões e tentativas de hoje)" semLista={semLista} vazio="Ninguém estudou hoje ainda."
    controles={total > 0 && <div className="adm-bloco__controles">
      <label className="adm-bloco__busca"><Icone nome="busca" tamanho={16} /><span className="so-leitor">Buscar por nome</span><input className="entrada" type="search" placeholder="Buscar por nome" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
      <div className="adm-filtros" role="group" aria-label="Ordenar">
        {([['recente', 'Atividade mais recente'], ['questoes', 'Mais questões'], ['nome', 'Nome']] as Array<[OrdemHoje, string]>).map(([v, r]) => <button key={v} type="button" className="adm-chip" aria-pressed={ordem === v} onClick={() => definirOrdem(v)}>{r}</button>)}
      </div>
      {termo && <p className="adm-nota" role="status">{lista.length} de {total} com "{busca.trim()}" no nome</p>}
    </div>}>
    {lista.map(f => {
      const u = f.pessoa
      const s = sinais.get(u.id_usuario)
      const partes: ReactNode[] = []
      if (f.questoes > 0) partes.push(<span key="q"><b>{f.questoes}</b> {f.questoes === 1 ? 'questão' : 'questões'}{f.tentativas > f.questoes ? ` (${f.tentativas} tentativas, com revisão)` : ''}</span>)
      else if (u.ultima_atividade && diaSP(u.ultima_atividade) === quadro.hoje) partes.push(<span key="q">respondeu hoje (a sincronização ainda não trouxe o total)</span>)
      if (f.flashcards) partes.push(<span key="f">flashcards hoje{s?.flashcards_7d ? ` (${s.flashcards_7d} na semana)` : ''}{s?.cripta_andar ? ` · andar ${s.cripta_andar} no Torneio` : ''}</span>)
      if (f.resumo) partes.push(<span key="r">leu o resumo <em>{tituloResumo(f.resumo.capitulo)}</em>{f.resumo.extra ? ` (${f.resumo.extra})` : ''}</span>)
      const acerto = acertoReal(u) ?? acertoAposRevisao(u)
      return <LinhaPessoa key={u.id_usuario} u={u} sinal={s} online={u.online}
        faz={<span className="adm-pessoa__lista">{partes.flatMap((p, i) => i ? [<span key={`s${i}`} className="adm-pessoa__sep"> · </span>, p] : [p])}</span>}
        tempos={<>{f.em && <span>última atividade às {hora(f.em)} ({haQuantoTempo(f.em)})</span>}{u.online && u.pagina && <span>agora: <Atividade u={u} /></span>}{u.servico && <span>{u.servico}</span>}</>}
        numeros={[{ valor: f.questoes, rotulo: f.questoes === 1 ? 'questão hoje' : 'questões hoje', destaque: f.questoes > 0 }, { valor: u.respondidas_7d, rotulo: 'na semana' }, { valor: acerto === null ? '—' : `${acerto}%`, rotulo: acertoReal(u) !== null ? 'acerto real (geral)' : 'acerto (geral)' }]}
        acoes={<Acoes u={u} abrirFicha={abrirFicha} />} />
    })}
  </Bloco>
}

/** Pagamentos, assinaturas novas, cancelamentos ou Pix pendentes do dia, com nome, plano, meio, valor e hora. */
function Movimentos({ titulo, lista, total, ontem, semDados, vazio, usuarios, abrirFicha, tom = 'ok', quando = 'às' }: {
  titulo: string; lista: MovimentoDinheiro[]; total?: number | null; ontem?: number | null; semDados: boolean; vazio: string
  usuarios: LinhaUsuario[] | null; abrirFicha: (u: LinhaUsuario, aba?: AbaFicha) => void; tom?: 'ok' | 'ruim' | 'aviso'; quando?: 'às' | 'pedido'
}) {
  return <section className={`adm-dinheiro__bloco adm-dinheiro__bloco--${tom}`} aria-label={titulo}>
    <h3>{titulo} <span className="adm-contagem">{semDados ? '—' : lista.length}</span>{total !== undefined && total !== null && total > 0 && <small> · {real(total)}</small>}{ontem !== undefined && ontem !== null && <small> · ontem: {ontem}</small>}</h3>
    {semDados ? <p className="adm-vazio">Sem a consulta de cobranças, este bloco fica vazio.</p> : lista.length === 0 ? <p className="adm-vazio">{vazio}</p> : <ul className="adm-movimentos">
      {lista.map((m, i) => {
        const u = usuarios?.find(x => x.id_usuario === m.id_usuario) ?? null
        return <li key={`${m.id_usuario}-${m.em ?? i}`}>
          <span className="adm-movimentos__quem"><strong>{m.nome ?? m.email ?? 'Conta sem nome'}</strong>{m.nome && m.email && <small>{m.email}</small>}</span>
          <span className="adm-movimentos__o-que">{rotuloPlano(m.plano)} · {rotuloMeio(m.meio)}{m.valor !== null && <> · <b>{real(m.valor)}</b></>}{m.tipo && <> · <span className={'adm-selo ' + (m.tipo === 'nova' ? 'adm-selo--ok' : 'adm-selo--neutro')}>{m.tipo === 'nova' ? 'nova' : m.tipo === 'volta' ? 'voltou' : 'renovação'}</span></>}</span>
          <span className="adm-movimentos__quando">{m.em ? quando === 'pedido' ? `pedido ${haQuantoTempo(m.em)} (${data(m.em)})` : `às ${hora(m.em)}` : '—'}</span>
          {u && <button type="button" className="adm-link" onClick={() => abrirFicha(u, 'pagamentos')}><Icone nome="usuario" tamanho={15} /> Ver ficha</button>}
        </li>
      })}
    </ul>}
  </section>
}

/**
 * Biblioteca de resumos hoje: o quadro por tema e quem passou por um resumo hoje (lista completa,
 * com o título inteiro e quanto leu). Vem do sinal do aparelho, sem SQL novo.
 */
function NaBiblioteca({ usuarios, sinais, abrirFicha }: { usuarios: LinhaUsuario[] | null; sinais: Map<string, SinalUsuario>; abrirFicha: (u: LinhaUsuario, aba?: AbaFicha) => void }) {
  const { lista, porTema } = useMemo(() => {
    const hoje = diaSP(Date.now())
    const lista = (usuarios ?? []).filter(u => (u.pagina ?? '').startsWith('/resumos') && (u.online || (u.pagina_em && diaSP(u.pagina_em) === hoje)))
      .sort((a, b) => Number(b.online) - Number(a.online) || (b.pagina_em ?? '').localeCompare(a.pagina_em ?? ''))
    const porTema = new Map<string, number>()
    for (const u of lista) { const c = (u.pagina ?? '').split(' · ')[0].match(/^\/resumos\/([a-z0-9-]{3,80})$/)?.[1]; if (c && c !== 'caderno' && c !== 'frases') porTema.set(c, (porTema.get(c) ?? 0) + 1) }
    return { lista, porTema: [...porTema].sort((a, b) => b[1] - a[1]) }
  }, [usuarios])
  return <Bloco id="agora-biblioteca" titulo="Biblioteca de resumos hoje" total={lista.length} nota="quem está lendo agora e quem passou por um resumo hoje, com o título inteiro e quanto já leu" semLista={!usuarios} vazio="Ninguém passou por um resumo hoje ainda."
    controles={porTema.length > 0 ? <p className="adm-nota">{porTema.map(([c, k]) => `${tituloResumo(c)}: ${k}`).join(' · ')}</p> : undefined}>
    {lista.map(u => <LinhaPessoa key={u.id_usuario} u={u} sinal={sinais.get(u.id_usuario)} online={u.online}
      faz={<Atividade u={u} />}
      tempos={<>{u.pagina_em && <span>{u.online ? 'lendo agora, nesta página' : 'esteve lá'} {haQuantoTempo(u.pagina_em)} ({hora(u.pagina_em)})</span>}</>}
      acoes={<Acoes u={u} abrirFicha={abrirFicha} />} />)}
  </Bloco>
}
