import { useRef, type ReactNode } from 'react'
import { ROTULO_SIMULADOS, SITE, fraseGratis } from '../config'
import { dataDaVersao, MUDANCAS_CONDICOES, VERSAO_CONDICOES_ASSINATURA } from '../conta/termos'
import { href } from '../util/rotas'
import { IndicePagina, VoltarAoTopo } from '../componentes/IndicePagina'

/** Um item numerado de cláusula: o número em negrito e o texto logo depois. */
function I({ n, children }: { n: string; children: ReactNode }) {
  return <p><strong>{n}.</strong> {children}</p>
}

/**
 * Condições da Assinatura (termos de venda), versão de 16/10/2026, reescrita do
 * zero. Preços, periodicidades, garantia e limites são os mesmos de antes
 * (dados/planos.ts e config.ts). Mudar o texto de forma relevante exige nova
 * VERSAO_CONDICOES_ASSINATURA e a mesma versão aceita nas Edge Functions
 * criar-checkout e criar-pix (ver conta/termos.ts).
 * Evitar "processo", "processar" e derivadas no texto (pedido do Tales).
 */
export function CondicoesAssinatura() {
  const pagina = useRef<HTMLElement>(null)
  const nome = SITE.nome
  const contato = <a href={`mailto:${SITE.contato}`}>{SITE.contato}</a>
  const detalhes = <a href={href('/conta/assinatura')}>Detalhes da assinatura</a>
  return <article className="limite-leitura empilha termos-pagina" ref={pagina}>
    <header>
      <p className="meta">CONDIÇÕES DA ASSINATURA · TERMOS DE VENDA</p>
      <h1>Condições da Assinatura do {nome}</h1>
      <ul className="juridico-vigencia">
        <li>Vigentes a partir de <strong>{dataDaVersao(VERSAO_CONDICOES_ASSINATURA)}</strong></li>
        <li>Versão <strong className="numerico">{VERSAO_CONDICOES_ASSINATURA}</strong></li>
      </ul>
      <p className="texto-2">
        Estas Condições regem a compra dos planos pagos do {nome} e complementam os <a href={href('/termos')}>Termos de Uso e
        Privacidade</a>, que continuam valendo. Elas são apresentadas para aceite separado antes de cada pagamento, e a versão
        aceita fica registrada. Nada aqui afasta os direitos garantidos pelo Código de Defesa do Consumidor.
      </p>
    </header>

    <section className="juridico-resumo" aria-labelledby="resumo-simples-condicoes">
      <h2 id="resumo-simples-condicoes">Resumo em linguagem simples</h2>
      <p>
        Este resumo existe só para facilitar a leitura. <strong>Ele não tem valor jurídico próprio e não substitui o texto
        completo</strong>: o que vale são as cláusulas numeradas abaixo.
      </p>
      <ul>
        <li><strong>Planos:</strong> mensal R$ 39,90 por mês, semestral R$ 209,40 a cada 6 meses e anual R$ 358,80 por ano, cobrados de uma vez no início de cada período (não é parcelamento). Quem já assinava antes de 7 de novembro de 2026 mantém o valor de antes (semestral R$ 179,90 e anual R$ 239,90).</li>
        <li><strong>Cartão renova sozinho; Pix não.</strong> No cartão, você desliga a renovação com um botão. No Pix, o acesso termina no fim do período, e nos 7 dias finais dá para renovar sem perder dias.</li>
        <li><strong>Garantia de 7 dias:</strong> até 7 dias depois de cada cobrança aprovada, inclusive renovações, você pede o reembolso integral por um botão, sem justificar.</li>
        <li><strong>Depois dos 7 dias:</strong> cancelar impede a próxima cobrança e mantém o acesso até o fim do período pago, sem devolução proporcional, salvo nos casos destas Condições e da lei.</li>
        <li><strong>Se o site fechar, deixar de vender planos, ficar gratuito para todos ou perder um recurso essencial do plano:</strong> você recebe de volta o valor proporcional aos dias que faltam, em até 30 dias.</li>
        <li><strong>Preço novo só na renovação</strong> e com aviso de pelo menos 30 dias. Cobrança recusada não gera multa nem juros: a conta só volta ao gratuito.</li>
        <li><strong>A assinatura é pessoal.</strong> Compartilhar a conta ou revender o acesso pode levar à suspensão.</li>
      </ul>
    </section>

    <details className="juridico-mudancas">
      <summary>O que mudou nesta versão</summary>
      <ul>{MUDANCAS_CONDICOES.map((m) => <li key={m}>{m}</li>)}</ul>
    </details>

    <IndicePagina alvo={pagina} titulo="Sumário das cláusulas" />
    <VoltarAoTopo />

    <h2>1. Fornecedor e objeto</h2>
    <I n="1.1">O fornecedor é o responsável pelo {nome} indicado na Cláusula 1 dos <a href={href('/termos')}>Termos de Uso</a>: Tales Roberto Siqueira Nascimento, pessoa física, CPF 027.298.132-09, com endereço na Rua Alderico Bandeira de Lima, nº 1302, Edifício Zacarias, CEP 83430-000, e contato pelo e-mail {contato} e pelo canal de <a href={href('/contato')}>contato</a> do site (Decreto nº 7.962/2013, art. 2º).</I>
    <I n="1.2">A assinatura dá ao assinante, durante o período pago, acesso aos recursos anunciados para o plano no momento da contratação (Cláusula 3). Ela também ajuda a manter um projeto independente: estrutura do site, inclusão de provas e revisão de comentários.</I>
    <I n="1.3">A assinatura não é compra de curso, de material didático, de licença perpétua nem de acesso vitalício. Não transfere direitos sobre o Acervo e não garante aprovação em nenhuma prova, concurso ou seleção.</I>

    <h2>2. Planos, preços e meios de pagamento</h2>
    <div className="juridico-tabela-rolagem">
      <table className="juridico-tabela">
        <thead><tr><th scope="col">Plano</th><th scope="col">Valor por período</th><th scope="col">Período</th><th scope="col">Cartão de crédito</th><th scope="col">Pix</th></tr></thead>
        <tbody>
          <tr><td>Mensal</td><td>R$ 39,90</td><td>1 mês</td><td rowSpan={3}>Renovação automática na mesma periodicidade, até o cancelamento</td><td rowSpan={3}>Pagamento único do período, sem renovação automática</td></tr>
          <tr><td>Semestral</td><td>R$ 209,40</td><td>6 meses</td></tr>
          <tr><td>Anual</td><td>R$ 358,80</td><td>12 meses</td></tr>
        </tbody>
      </table>
    </div>
    <I n="2.1">Cada valor é cobrado integralmente no início do respectivo período. Valores mensais ou diários equivalentes exibidos no site servem só para comparação: os planos semestral e anual não são parcelados pelo {nome}.</I>
    <I n="2.2">Os pagamentos são feitos no ambiente do Mercado Pago, responsável pelo checkout. Os dados do cartão são informados diretamente ao Mercado Pago; o {nome} não recebe nem guarda o número completo nem o código de segurança. No Pix, o CPF do pagador e o e-mail da Conta são enviados ao Mercado Pago para gerar a cobrança; o CPF não é salvo no perfil nem nos pedidos, podendo constar nas notificações do provedor guardadas para conciliação e atendimento.</I>

    <h2>3. O que a assinatura inclui</h2>
    <I n="3.1">O acesso gratuito não exige pagamento. {fraseGratis('condicoes')}</I>
    <I n="3.2">Durante o período pago, o assinante também tem, nas condições anunciadas na página de <a href={href('/assinatura')}>Planos</a>: o Simulado Nacional OrtoQuestões (edição mensal, com posição e relatório de prontidão por tema); o Cronograma (plano de estudo até a prova); a página Temas que mais caem; as Frases que caem completas (adendo da Biblioteca de resumos); como a turma respondeu cada questão, com os filtros de sessão baseados nisso; a liga da residência; o relatório mensal por e-mail; e, enquanto houver limite diário no gratuito, respostas e flashcards sem esse limite (os Flashcards são recurso em teste, conforme a Cláusula 12 dos Termos).</I>
    <I n="3.3">Comentários, revisão, calendário, caderno de erros, desempenho, ranking geral e os {ROTULO_SIMULADOS} continuam disponíveis a todos. Conteúdos de Fellowship Quadril e de cirurgia do quadril permanecem acessíveis a todos, inclusive no gratuito.</I>
    <I n="3.4">Posição, percentil, relatório de prontidão, Cronograma e incidência de temas são ferramentas de estudo calculadas a partir das respostas feitas no site; não são avaliação oficial nem previsão de resultado.</I>

    <h2>4. Como a contratação acontece</h2>
    <I n="4.1">Antes de abrir o pagamento, o site mostra o plano, o valor integral do período, o meio de pagamento, se haverá renovação automática e um aceite separado destas Condições e dos Termos de Uso, dado por caixa de seleção não pré-marcada. O aceite fica registrado com a versão, o plano, o valor, a periodicidade e a data.</I>
    <I n="4.2">O aceite não gera cobrança. A compra só se conclui quando o assinante confirma o pagamento no Mercado Pago, que mostra os dados finais antes da confirmação. Se o preço, o período ou a próxima cobrança exibidos lá forem diferentes da oferta do {nome}, o assinante não deve finalizar e pode avisar o suporte.</I>
    <I n="4.3">No Pix, o código vale por 24 horas; se não for pago nesse prazo, expira sem cobrança. O acesso começa quando o Mercado Pago confirma o pagamento. No cartão, o acesso começa com a aprovação da cobrança.</I>
    <I n="4.4">Com um período pago vigente, não é possível comprar outro, exceto a renovação antecipada do Pix (Cláusula 5.3).</I>

    <h2>5. Renovação</h2>
    <I n="5.1"><strong>Cartão.</strong> A assinatura renova automaticamente ao fim de cada período, pelo mesmo plano e pelo preço vigente, até que o assinante desligue a renovação em {detalhes}. Cada renovação é uma nova cobrança, coberta pela garantia da Cláusula 7.</I>
    <I n="5.2"><strong>Pix.</strong> Não há renovação automática nem cobrança futura. O acesso termina sozinho ao fim do período pago, e o assinante pode receber um e-mail de aviso alguns dias antes.</I>
    <I n="5.3"><strong>Renovação antecipada no Pix.</strong> Nos 7 dias finais de um período pago no Pix, o assinante pode pagar o próximo período. Os dias restantes continuam valendo e o novo período começa quando o atual termina, sem perda de nenhum dia.</I>

    <h2>6. Reajuste de preço</h2>
    <I n="6.1">O preço pode ser reajustado para novas contratações e renovações futuras. Para quem já assina no cartão, o novo valor será informado com antecedência mínima de 30 dias, pelo e-mail cadastrado e no site, e só valerá para renovações que ocorrerem depois desse prazo. Quem não concordar pode desligar a renovação antes da nova cobrança, sem qualquer custo.</I>
    <I n="6.2">O reajuste nunca altera o valor de um período já pago. No Pix, vale o preço exibido no momento da compra.</I>
    <I n="6.3"><strong>Reajuste de 7 de novembro de 2026.</strong> Os valores da Cláusula 2 valem para novas contratações a partir dessa data. Quem tem pagamento aprovado antes dela, no cartão ou no Pix, mantém o valor de antes (semestral R$ 179,90 e anual R$ 239,90), inclusive nas renovações e em uma nova contratação depois de cancelar. Quem recebeu o reembolso de todos os pagamentos é tratado como nova contratação.</I>

    <h2>7. Arrependimento e garantia de 7 dias</h2>
    <I n="7.1"><strong>Direito de arrependimento.</strong> Como a contratação é feita pela internet, o assinante pode desistir em até 7 dias da contratação, nos termos do artigo 49 do Código de Defesa do Consumidor, com devolução integral do valor pago.</I>
    <I n="7.2"><strong>Garantia do {nome}.</strong> Além do mínimo legal, o {nome} oferece a mesma devolução integral em até 7 dias depois de <strong>cada</strong> cobrança aprovada, inclusive as renovações automáticas no cartão e as compras e renovações por Pix, sem necessidade de justificativa.</I>
    <I n="7.3"><strong>Como pedir.</strong> Pelo botão “Usar garantia de 7 dias” em {detalhes} ou pelo canal de <a href={href('/contato')}>contato</a>. Se a solicitação automática não for confirmada pelo Mercado Pago, o pedido é atendido manualmente pelo suporte, valendo a data em que foi feito.</I>
    <I n="7.4"><strong>Devolução.</strong> O pedido de reembolso é enviado ao Mercado Pago sem demora. No cartão, o valor é estornado na fatura, conforme os prazos do emissor; no Pix, é devolvido pelo Mercado Pago à conta de origem do pagamento. Após a confirmação do reembolso, o acesso pago termina e a Conta volta ao gratuito, com respostas, revisões e dados de estudo preservados.</I>

    <h2>8. Cancelamento</h2>
    <I n="8.1">O assinante pode desligar a renovação a qualquer momento, sem justificativa e sem multa, em {detalhes}. O cancelamento impede novas cobranças daquela assinatura.</I>
    <I n="8.2">Fora do prazo de 7 dias da Cláusula 7, o acesso pago continua até o fim do período já cobrado e não há devolução proporcional dos meses restantes, ressalvadas as hipóteses das Cláusulas 12, 13 e 15 e os direitos previstos em lei. Por exemplo, quem cancela o semestral depois de três meses mantém o acesso até o fim dos seis meses pagos.</I>
    <I n="8.3">Cancelar ou encerrar a assinatura não apaga respostas, revisões nem o histórico de estudo.</I>

    <h2>9. Cobrança recusada e inadimplência</h2>
    <I n="9.1">Se a cobrança de renovação no cartão for recusada, o Mercado Pago pode tentar novamente conforme as regras dele. Se o pagamento não for aprovado, a assinatura deixa de estar ativa e a Conta volta ao gratuito, com os dados preservados.</I>
    <I n="9.2">O {nome} não cobra multa, juros nem valores retroativos por cobrança recusada e não inclui o nome do assinante em cadastros de inadimplentes por esse motivo. Para voltar a ter acesso pago, basta assinar novamente.</I>

    <h2>10. Contestação de pagamento</h2>
    <I n="10.1">O caminho gratuito e mais rápido para desistir da compra é a garantia de 7 dias ou o suporte. Se o assinante contestar a cobrança diretamente no emissor do cartão ou no Mercado Pago, o acesso pago correspondente pode ficar suspenso até a conclusão da contestação; se ela for acolhida, a Conta volta ao gratuito, com os dados preservados.</I>
    <I n="10.2">Contestações reiteradas de cobranças efetivamente usufruídas, feitas de má-fé, podem levar às medidas da Cláusula 15 dos Termos, sem prejuízo do direito do assinante de reclamar pelos meios legais.</I>

    <h2>11. Cortesias e indicações</h2>
    <I n="11.1">Cada Conta tem um link de convite pessoal. Quando uma pessoa cria a Conta por esse link e responde 20 questões, a indicação é confirmada e as duas Contas ganham 7 dias de acesso ao plano completo, como cortesia. Quem indica recebe a cortesia por até 12 indicações confirmadas.</I>
    <I n="11.2">Os dias de cortesia começam a contar depois do fim de um período pago ativo, não são convertidos em dinheiro, não geram reembolso e não são transferíveis. Indicar a si mesmo, criar Contas para obter cortesia ou burlar a regra de outra forma permite cancelar as cortesias obtidas assim.</I>
    <I n="11.3">As regras do programa podem mudar, ou o programa pode ser encerrado, com aviso no site, preservadas as cortesias já confirmadas. Liberações temporárias de recursos a todas as Contas e promoções seguem a Cláusula 7.3 dos Termos.</I>

    <h2>12. Mudanças nos recursos do plano</h2>
    <I n="12.1">Recursos podem ser acrescentados ao plano sem custo adicional para quem já assina. Alterações de aparência, nome, organização ou funcionamento que preservem a utilidade do recurso não são redução.</I>
    <I n="12.2">A retirada ou redução de recurso do plano será informada com antecedência razoável, pelo e-mail cadastrado e no site. Se for substancial, aplica-se a Cláusula 13, com direito de optar pela restituição proporcional.</I>

    <section className="clausula-destaque" aria-labelledby="clausula-descontinuidade">
      <h2 id="clausula-descontinuidade">13. Descontinuidade do serviço ou da oferta paga</h2>
      <I n="13.1"><strong>Hipóteses.</strong> Esta cláusula se aplica se o {nome}, por decisão própria ou em razão de fatores externos, sejam eles técnicos, regulatórios, de fornecedores ou parceiros, de caso fortuito ou força maior ou de qualquer outra natureza: (a) encerrar definitivamente a Plataforma; (b) encerrar definitivamente a oferta de planos pagos; (c) tornar gratuito para todos os usuários, de forma permanente, o conteúdo e os recursos que integram o plano pago; ou (d) suprimir de forma permanente funcionalidade essencial do plano contratado, ou reduzir substancialmente o conjunto de recursos pagos, sem oferecer substituto equivalente.</I>
      <I n="13.2"><strong>O que não é descontinuidade.</strong> Não se enquadram nesta cláusula: (a) indisponibilidades temporárias, tratadas na Cláusula 14; (b) liberações temporárias, promoções, degustações e cortesias, ou a ampliação do acesso gratuito que mantenha a oferta paga e recursos exclusivos do plano; (c) inclusão, correção, reorganização ou retirada pontual de questões, comentários ou provas do Acervo; (d) mudanças de aparência, nome ou funcionamento que preservem a utilidade do recurso; e (e) ajustes em funcionalidades em teste, salvo se o recurso tiver sido anunciado como parte do plano pago no momento da contratação.</I>
      <I n="13.3"><strong>Aviso prévio.</strong> O {nome} avisará os assinantes pelo e-mail cadastrado e no site, sempre que possível com antecedência mínima de 30 dias, informando a data em que a mudança passa a valer (“Data de Efeito”) e como será feita a restituição. Se um fator externo impedir esse prazo, o aviso será dado assim que possível.</I>
      <I n="13.4"><strong>Acesso até a Data de Efeito.</strong> O acesso contratado é mantido até a Data de Efeito. Nas hipóteses (a), (b) e (c), novas cobranças e renovações automáticas são interrompidas a partir do aviso, e a exportação dos dados de estudo fica disponível durante todo o período de aviso.</I>
      <I n="13.5"><strong>Direito à restituição proporcional.</strong> Nas hipóteses (a), (b) e (c), o assinante com período pago em vigor na Data de Efeito recebe, independentemente de pedido, a restituição do valor proporcional ao período não usufruído. Na hipótese (d), o assinante afetado pode optar, em até 30 dias contados do aviso, entre manter a assinatura com os recursos remanescentes até o fim do período ou cancelá-la e receber a restituição proporcional ao período não usufruído contado da data da opção.</I>
      <I n="13.6"><strong>Cálculo.</strong> A restituição é calculada pro rata, dia a dia: valor efetivamente pago pelo período em curso × (dias que faltam até o fim do período pago ÷ total de dias desse período). Exemplo: no plano anual de R$ 239,90, faltando 146 de 365 dias, a restituição é de R$ 95,96. Um período já pago e ainda não iniciado, como o da renovação antecipada no Pix, é restituído integralmente. Dias de cortesia não geram restituição.</I>
      <I n="13.7"><strong>Prazo e meio.</strong> A restituição será feita em até 30 dias contados da Data de Efeito, ou da opção do assinante na hipótese (d), pelo mesmo meio de pagamento (estorno no cartão ou devolução do Pix pelo Mercado Pago). Se isso não for possível, será feita por Pix para conta de titularidade do assinante, que ele informar, e o prazo de 30 dias passa a contar dessa informação. No cartão, o crédito aparece na fatura conforme os prazos do emissor.</I>
      <I n="13.8"><strong>Sucessão.</strong> Estas obrigações valem também se a Plataforma for transferida a outro responsável que não mantenha o serviço ou se a descontinuidade decorrer de impossibilidade do responsável, inclusive por morte ou incapacidade. Nesses casos, serão cumpridas por quem o suceder ou representar, e as cobranças automáticas serão interrompidas no Mercado Pago.</I>
      <I n="13.9"><strong>Alcance.</strong> O aviso prévio, a manutenção do acesso até a Data de Efeito e a restituição proporcional prevista nesta cláusula são a compensação contratada para as hipóteses aqui descritas, sem prejuízo dos direitos que a lei assegure ao consumidor e que não possam ser afastados por contrato.</I>
    </section>

    <h2>14. Indisponibilidade temporária</h2>
    <I n="14.1">Manutenções e falhas técnicas, do site ou dos serviços que o sustentam, podem deixar o {nome} fora do ar por algum tempo, sem gerar, por si só, reembolso ou indenização. Se a Plataforma ficar inteiramente indisponível por mais de 3 dias seguidos por falha do {nome} ou de seus fornecedores de infraestrutura, o período pago do assinante é prorrogado pelo mesmo número de dias, mediante pedido pelo canal de contato. Indisponibilidades mais longas ou repetidas serão tratadas caso a caso, sem prejuízo dos direitos previstos em lei.</I>

    <h2>15. Uso pessoal e suspensão por violação</h2>
    <I n="15.1">A assinatura é pessoal e intransferível. Compartilhar a Conta, revender ou ceder o acesso e extrair o Acervo em massa, por robôs ou cópia sistemática, violam os <a href={href('/termos')}>Termos de Uso</a> (Cláusula 9).</I>
    <I n="15.2">Nesses casos, aplicam-se as medidas da Cláusula 15 dos Termos, com comunicação prévia salvo urgência de segurança ou fraude. Se a Conta de um assinante for encerrada por violação, a renovação é cancelada e o valor proporcional ao período não usufruído é restituído na forma da Cláusula 13.6 e 13.7, sem prejuízo da reparação dos danos comprovadamente causados pela conduta, na forma da lei.</I>

    <h2>16. Atendimento e solução amigável</h2>
    <I n="16.1">O estado da assinatura, as cobranças e as datas podem ser consultados em {detalhes}. Dúvidas, reclamações e pedidos podem ser enviados pelo canal de <a href={href('/contato')}>contato</a> ou pelo e-mail {contato}, com resposta em até 5 dias, conforme o Decreto nº 7.962/2013.</I>
    <I n="16.2">As partes se comprometem a buscar primeiro, de boa-fé, uma solução amigável pelo suporte. Isso não impede o assinante de procurar, a qualquer tempo, os órgãos de defesa do consumidor, como o Procon, e a plataforma pública consumidor.gov.br, quando disponível para o {nome}. Lei aplicável e foro seguem a Cláusula 21 dos Termos de Uso, observado o foro do domicílio do consumidor.</I>

    <h2>17. Alterações destas Condições</h2>
    <I n="17.1">Alterações destas Condições são publicadas em nova versão, identificada no topo desta página, e comunicadas com antecedência razoável. Mudanças que reduzam direitos do assinante não se aplicam a período já pago e só valem a partir da renovação seguinte, salvo concordância expressa ou exigência legal. Cada compra fica vinculada à versão aceita no momento do pagamento.</I>

    <h2>18. Ao aceitar, você declara que</h2>
    <I n="18.1">Leu estas Condições e os Termos de Uso; entende que a assinatura libera os recursos do plano durante o período pago, apoia um projeto independente e não garante aprovação; sabe que as questões dos simulados não são oficiais e que o conteúdo deve ser conferido na bibliografia de referência; e concorda com o valor e o período escolhidos, com renovação automática no cartão ou pagamento único sem renovação automática no Pix.</I>

    <div className="linha linha--empilha-celular">
      <a className="botao botao--principal" href={href('/assinatura')}>Voltar aos planos</a>
      <a className="botao" href={href('/termos')}>Termos de Uso e Privacidade</a>
    </div>
  </article>
}
