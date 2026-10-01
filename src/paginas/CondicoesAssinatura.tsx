import { SITE } from '../config'
import { VERSAO_CONDICOES_ASSINATURA } from '../conta/termos'
import { href } from '../util/rotas'
import { LIMITES_HABILITADOS } from '../estado/limiteDiario'

export function CondicoesAssinatura() {
  return <article className="limite-leitura empilha termos-pagina">
    <header>
      <p className="meta">CONDIÇÕES DA ASSINATURA</p>
      <h1>Condições para assinar o {SITE.nome}</h1>
      <p className="texto-2">Versão {VERSAO_CONDICOES_ASSINATURA}. Estas condições complementam os <a href={href('/termos')}>Termos de Uso</a>, que continuam valendo integralmente, e são apresentadas novamente para aceite antes de cada checkout. Em caso de dúvida entre os dois documentos, prevalece o que for mais favorável a você.</p>
    </header>

    <h2>1. O que você está contratando</h2>
    <p>O {SITE.nome} é um projeto independente de estudo para provas de ortopedia e traumatologia. A assinatura tem duas funções ao mesmo tempo: <strong>apoia a manutenção do projeto</strong> (estrutura do site, inclusão de provas e revisão de comentários) e <strong>libera, durante o período pago, as funcionalidades anunciadas para o plano</strong>, como o uso sem limite diário de respostas e os recursos exclusivos do assinante descritos no item 3.</p>
    <p>A assinatura não é a compra de um curso, de material didático, de licença perpétua ou de acesso vitalício. Ela não transfere a você direitos sobre as questões ou os comentários e não garante aprovação em nenhuma prova, concurso ou processo seletivo.</p>

    <h2>2. Planos e cobrança</h2>
    <p>A assinatura é opcional. O plano mensal custa R$ 39,90 por mês; o semestral custa R$ 179,90 por período de seis meses; o anual custa R$ 239,90 por período de doze meses. Cada valor é cobrado integralmente no começo do respectivo período e renovado automaticamente na mesma periodicidade, até o cancelamento. Valores mensais ou diários equivalentes exibidos no site servem apenas para comparação: os planos semestral e anual não são cobrados em parcelas mensais.</p>
    <p>O checkout hospedado pelo Mercado Pago mostra os dados finais da compra antes de você confirmar o pagamento. Não finalize se o preço, o período ou a próxima cobrança estiverem diferentes da oferta do {SITE.nome}.</p>
    <p><strong>Reajuste.</strong> Se o preço mudar, você será avisado com pelo menos 30 dias de antecedência, pelo e-mail cadastrado e no site. O novo valor vale só para renovações posteriores ao aviso, e você pode cancelar antes da nova cobrança, sem qualquer custo.</p>

    <h2>3. Gratuito e acesso da assinatura</h2>
    <p>O cadastro não exige pagamento. {LIMITES_HABILITADOS ? 'O acesso gratuito permite registrar até 20 novas respostas por dia, com renovação na virada do dia em São Paulo. A assinatura oferece respostas novas sem esse limite durante o período pago.' : 'Nesta fase, o acesso gratuito está sem limite diário de respostas, por decisão operacional do projeto. A assinatura assegura acesso sem limite diário durante o período pago caso o limite gratuito planejado de 20 novas respostas por dia venha a ser ativado.'} Uma futura alteração do gratuito será informada no site e não encurtará um período pago.</p>
    <p>Durante o período pago, o assinante tem também: o <strong>Simulado Nacional OrtoQuestões</strong> (edição mensal, com posição e relatório de prontidão por tema), o <strong>plano até a prova</strong>, <strong>como a turma respondeu</strong> cada questão (com os filtros de sessão baseados nisso), a <strong>liga da residência</strong> e o <strong>relatório mensal por e-mail</strong>. Comentários, revisão, calendário, caderno de erros, desempenho, ranking geral e os OrtoQuestões Simulados continuam disponíveis a todos. Conteúdos de Fellowship Quadril e de cirurgia do quadril permanecem acessíveis a todos, inclusive no gratuito.</p>
    <p>Posição, percentil, relatório de prontidão e plano até a prova são ferramentas de estudo calculadas a partir das respostas feitas no site; não são avaliação oficial nem previsão de resultado em prova. Qualquer redução dos recursos do plano será informada antes e não vale para um período já pago.</p>

    <h2>4. O conteúdo e os seus limites</h2>
    <p><strong>Finalidade de estudo.</strong> As questões e os comentários servem exclusivamente para estudo e treino para provas. Não são orientação médica, não substituem a formação, a preceptoria nem a conduta do seu serviço e não devem ser usados para decidir o cuidado de pacientes reais.</p>
    <p><strong>Questões de provas anteriores.</strong> TEOT, TARO, ENARE e outras provas já aplicadas aparecem com indicação de origem e gabarito da banca, com finalidade educacional. O {SITE.nome} não tem vínculo com a SBOT, o ENARE, a SBCOC nem com qualquer banca, e nenhuma dessas entidades elaborou, revisou ou endossa o site.</p>
    <p><strong>OrtoQuestões Simulados.</strong> São questões autorais do site, elaboradas a partir da bibliografia de referência e fortemente inspiradas no padrão das provas, inclusive a de Fellowship Quadril. <strong>Não são questões oficiais</strong> dessas provas ou sociedades e não reproduzem material sigiloso. Cada uma traz esse aviso junto ao enunciado.</p>
    <p><strong>Confira na fonte.</strong> Os comentários partem da bibliografia de referência, mas podem conter imprecisões. Confira na bibliografia indicada o que for levar para a prova ou para a prática, e use o relato de erro quando algo parecer estranho. Os <a href={href('/termos')}>Termos de Uso</a> detalham como o conteúdo é produzido.</p>
    <p><strong>Acervo dinâmico.</strong> Questões, gabaritos e comentários podem ser incluídos, corrigidos, reclassificados ou removidos a qualquer tempo, inclusive para corrigir erros ou atender a solicitações de titulares de direitos. A assinatura não garante a permanência de uma questão específica, de determinada quantidade de questões ou do conteúdo de determinada prova.</p>

    <h2>5. Processamento do pagamento</h2>
    <p>O pagamento é processado pelo Mercado Pago, parceiro responsável pelo checkout. Os dados de cartão são informados diretamente no ambiente hospedado do Mercado Pago. O {SITE.nome} não recebe nem armazena o número completo do cartão ou o código de segurança. Para controlar o acesso e prestar atendimento, recebemos identificadores da assinatura e do pagamento, situação da cobrança e datas relacionadas à operação.</p>

    <h2>6. Cancelamento</h2>
    <p>Você pode cancelar futuras renovações em <a href={href('/conta/assinatura')}>Detalhes da assinatura</a>, a qualquer momento e sem justificativa. O cancelamento impede novas cobranças da assinatura cancelada. Fora do prazo de reembolso integral, o acesso pago permanece até o fim do período já cobrado. Assim, se você cancelar o semestral após três meses, continuará com acesso até o fim dos seis meses pagos; não há reembolso proporcional automático dos três meses restantes. A mesma regra vale para o anual. Cancelar não apaga suas respostas, revisões nem seu histórico de estudo.</p>

    <h2>7. Reembolso em sete dias</h2>
    <p>Em até sete dias após cada cobrança aprovada, você pode solicitar o reembolso integral pelo botão “Usar garantia de 7 dias” em <a href={href('/conta/assinatura')}>Detalhes da assinatura</a> ou pelo <a href={href('/contato')}>canal de contato</a>. Após a confirmação do Mercado Pago, o acesso pago termina e sua conta volta à modalidade gratuita; suas respostas, revisões e demais dados de estudo permanecem preservados. Se a solicitação automática não for confirmada, entre em contato para atendimento manual. Esta política não afasta outros direitos previstos em lei.</p>

    <h2>8. Continuidade do serviço</h2>
    <p><strong>Indisponibilidades temporárias.</strong> Manutenções e falhas técnicas, do site ou dos serviços que o sustentam, podem deixar o {SITE.nome} fora do ar por algum tempo. Isso não gera, por si só, reembolso ou indenização; indisponibilidades prolongadas são tratadas caso a caso pelo canal de contato, sem prejuízo dos seus direitos legais.</p>
    <p><strong>Mudanças no site.</strong> Funcionalidades podem ser criadas, alteradas ou retiradas para melhorar o projeto. Mudanças não reduzem, retroativamente, o acesso de um período já pago.</p>
    <p><strong>Se o site for encerrado.</strong> Não há intenção de encerrar o {SITE.nome}. Se isso um dia acontecer de forma definitiva, você será avisado com pelo menos 30 dias de antecedência, pelo e-mail cadastrado e no site; as cobranças e renovações serão interrompidas; o valor proporcional ao período já pago e não usufruído, a partir da data do encerramento, será devolvido; e a exportação dos seus dados de estudo ficará disponível durante o aviso.</p>

    <h2>9. Uso pessoal da conta</h2>
    <p>A assinatura é pessoal e intransferível. Compartilhar a conta, revender o acesso ou extrair o conteúdo em massa, por robôs ou cópia sistemática, viola os <a href={href('/termos')}>Termos de Uso</a> e pode levar à suspensão da conta, observados os direitos referentes ao período pago.</p>

    <h2>10. Atendimento e alterações</h2>
    <p>Você pode consultar o estado da assinatura em Minha conta e solicitar ajuda pelo <a href={href('/contato')}>canal de contato</a> ou por <a href={`mailto:${SITE.contato}`}>{SITE.contato}</a>. Alterações materiais destas condições serão publicadas em nova versão, identificada no topo desta página, e não reduzirão retroativamente direitos referentes a períodos já pagos.</p>

    <h2>11. Ao aceitar, você declara que</h2>
    <p>Leu estas condições e os Termos de Uso; entende que a assinatura apoia um projeto independente e libera as funcionalidades do plano durante o período pago, sem garantia de aprovação; sabe que as questões dos simulados não são oficiais e que o conteúdo deve ser conferido na bibliografia de referência; e concorda com o valor, a periodicidade e a renovação automática do plano escolhido.</p>

    <p className="texto-2">Antes de abrir o checkout, mostramos novamente o plano, o valor integral por período, a renovação e um aceite separado destas condições. A aceitação não realiza cobrança; a compra só é concluída quando você confirma o pagamento no Mercado Pago. Nada nestas condições afasta os direitos garantidos pelo Código de Defesa do Consumidor.</p>
    <a className="botao botao--principal" href={href('/assinatura')}>Voltar aos planos</a>
  </article>
}
