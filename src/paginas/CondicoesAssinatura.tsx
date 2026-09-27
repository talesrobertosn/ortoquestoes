import { SITE } from '../config'
import { VERSAO_CONDICOES_ASSINATURA } from '../conta/termos'
import { href } from '../util/rotas'

export function CondicoesAssinatura() {
  return <article className="limite-leitura empilha termos-pagina">
    <header>
      <p className="meta">CONDIÇÕES DA ASSINATURA</p>
      <h1>Condições para assinar o {SITE.nome}</h1>
      <p className="texto-2">Versão {VERSAO_CONDICOES_ASSINATURA}. Estas condições complementam os <a href={href('/termos')}>Termos de Uso</a> e são apresentadas novamente antes de cada checkout.</p>
    </header>

    <h2>1. Planos e cobrança</h2>
    <p>A assinatura é opcional. O plano mensal custa R$ 39,90 por mês; o semestral custa R$ 179,90 por período de seis meses; o anual custa R$ 239,90 por período de doze meses. Cada valor é cobrado integralmente no começo do respectivo período e renovado automaticamente na mesma periodicidade, até o cancelamento. Valores mensais equivalentes exibidos na página de planos servem apenas para comparação: os planos semestral e anual não são cobrados em parcelas mensais.</p>
    <p>O checkout hospedado pelo Mercado Pago mostra os dados finais da compra antes de você confirmar o pagamento. Não finalize se o preço, o período ou a próxima cobrança estiverem diferentes da oferta do {SITE.nome}.</p>

    <h2>2. Gratuito e acesso da assinatura</h2>
    <p>O cadastro não exige pagamento. Nesta fase, o acesso gratuito está sem limite diário de respostas, por decisão operacional do projeto. A assinatura assegura acesso sem limite diário durante o período pago caso o limite gratuito planejado de 20 novas respostas por dia venha a ser ativado. Uma futura alteração do gratuito será informada no site e não encurtará um período pago.</p>
    <p>O plano não oferece exclusividade de comentários, revisão, caderno de erros ou simulados nesta fase. Conteúdos da SBQ e de cirurgia do quadril permanecem acessíveis a todos, inclusive no gratuito. O {SITE.nome} não promete aprovação em provas.</p>

    <h2>3. Processamento do pagamento</h2>
    <p>O pagamento é processado pelo Mercado Pago, parceiro responsável pelo checkout. Os dados de cartão são informados diretamente no ambiente hospedado do Mercado Pago. O {SITE.nome} não recebe nem armazena o número completo do cartão ou o código de segurança. Para controlar o acesso e prestar atendimento, recebemos identificadores da assinatura e do pagamento, situação da cobrança e datas relacionadas à operação.</p>

    <h2>4. Cancelamento</h2>
    <p>Você pode cancelar futuras renovações em <a href={href('/conta/assinatura')}>Detalhes da assinatura</a>, sem justificativa. O cancelamento impede novas cobranças da assinatura cancelada. Fora do prazo de reembolso integral, o acesso pago permanece até o fim do período já cobrado. Assim, se você cancelar o semestral após três meses, continuará com acesso até o fim dos seis meses pagos; não há reembolso proporcional automático dos três meses restantes. A mesma regra vale para o anual.</p>

    <h2>5. Reembolso em sete dias</h2>
    <p>Em até sete dias após cada cobrança aprovada, você pode solicitar o reembolso integral pelo botão “Usar garantia de 7 dias” em <a href={href('/conta/assinatura')}>Detalhes da assinatura</a> ou pelo <a href={href('/contato')}>canal de contato</a>. Após a confirmação do Mercado Pago, o acesso pago termina e sua conta volta à modalidade gratuita; suas respostas, revisões e demais dados de estudo permanecem preservados. Se a solicitação automática não for confirmada, entre em contato para atendimento manual. Esta política não afasta outros direitos previstos em lei.</p>

    <h2>6. Atendimento e alterações</h2>
    <p>Você pode consultar o estado da assinatura em Minha conta e solicitar ajuda pelo <a href={href('/contato')}>canal de contato</a> ou por <a href={`mailto:${SITE.contato}`}>{SITE.contato}</a>. Alterações materiais destas condições serão publicadas em nova versão e não reduzirão retroativamente direitos referentes a períodos já pagos.</p>

    <p className="texto-2">Antes de abrir o checkout, mostramos novamente o plano, o valor integral por período, a renovação e um aceite separado destas condições. A aceitação não realiza cobrança; a compra só é concluída quando você confirma o pagamento no Mercado Pago.</p>
    <a className="botao botao--principal" href={href('/assinatura')}>Voltar aos planos</a>
  </article>
}
