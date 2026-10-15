import { ROTULO_SIMULADOS, SITE, fraseGratis } from '../config'
import { href } from '../util/rotas'
import { dataDaVersao, MUDANCAS_TERMOS, VERSAO_TERMOS } from '../conta/termos'
import { useRef, type ReactNode } from 'react'
import { IndicePagina, VoltarAoTopo } from '../componentes/IndicePagina'

/** Um item numerado de cláusula: o número em negrito e o texto logo depois. */
function I({ n, children }: { n: string; children: ReactNode }) {
  return <p><strong>{n}.</strong> {children}</p>
}

/**
 * Termos de Uso e Privacidade (versão de 16/10/2026, reescrita do zero).
 * Mudar o texto de forma relevante exige nova VERSAO_TERMOS (conta/termos.ts),
 * a lista MUDANCAS_TERMOS e um registro em docs/termos-e-assinatura-AAAAMMDD.md.
 * Evitar nos textos as palavras "processo", "processar" e derivadas (pedido do
 * Tales, 15/10/2026): usar "tratamento" (dados), "realizado" (pagamento) etc.
 */
export function Termos() {
  // Página longa no celular: o índice leva direto à cláusula e o "Topo" traz de volta.
  const pagina = useRef<HTMLElement>(null)
  const nome = SITE.nome
  const contato = <a href={`mailto:${SITE.contato}`}>{SITE.contato}</a>
  return (
    <article className="limite-leitura empilha termos-pagina" ref={pagina}>
      <header>
        <p className="meta">TERMOS DE USO E POLÍTICA DE PRIVACIDADE</p>
        <h1>Termos de Uso e Privacidade do {nome}</h1>
        <ul className="juridico-vigencia">
          <li>Vigente a partir de <strong>{dataDaVersao(VERSAO_TERMOS)}</strong></li>
          <li>Versão <strong className="numerico">{VERSAO_TERMOS}</strong></li>
          <li>Site: <strong>{SITE.url}</strong></li>
        </ul>
        <p className="texto-2">
          Estes Termos regem o acesso, o cadastro e o uso do {nome} e explicam como os seus dados pessoais são tratados.
          A contratação de planos pagos segue também as <a href={href('/condicoes-assinatura')}>Condições da Assinatura</a>,
          que integram estes Termos.
        </p>
      </header>

      <section className="juridico-resumo" aria-labelledby="resumo-simples">
        <h2 id="resumo-simples">Resumo em linguagem simples</h2>
        <p>
          Este resumo existe só para facilitar a leitura. <strong>Ele não tem valor jurídico próprio e não substitui o texto
          completo</strong>: o que vale são as cláusulas numeradas abaixo.
        </p>
        <ul>
          <li><strong>O que é:</strong> uma ferramenta de apoio ao estudo para provas de ortopedia e traumatologia. Não é curso, não dá certificado, não tem vínculo com a SBOT ou com bancas e não garante aprovação.</li>
          <li><strong>O conteúdo pode ter erros:</strong> parte dele é escrita com apoio de inteligência artificial a partir da bibliografia. Confira na fonte o que for levar para a prova e nunca use o site para decidir a conduta de um paciente real. Se achar um erro, use o relato de erro.</li>
          <li><strong>A conta é sua e de mais ninguém:</strong> não compartilhe, não revenda o acesso e não copie nem extraia o acervo. Isso pode levar à suspensão da conta.</li>
          <li><strong>Gratuito e planos:</strong> {fraseGratis('termosResumo')}. Os planos são opcionais, com garantia de 7 dias e cancelamento por botão. As regras de compra estão nas Condições da Assinatura.</li>
          <li><strong>Se o site fechar, deixar de vender planos ou ficar gratuito para todos:</strong> quem tem período pago recebe de volta o valor proporcional aos dias que faltam.</li>
          <li><strong>Seus dados:</strong> usamos o que é preciso para a conta, o estudo e a assinatura. Também olhamos as páginas que você visita (guardadas por 30 dias) para dar suporte, melhorar o site, entender o interesse nos planos e personalizar mensagens. Não vendemos dados. Os cookies do Meta só entram com o seu aceite.</li>
          <li><strong>E-mails:</strong> os de serviço (conta, pagamento, segurança) sempre chegam; os demais (lembretes, conquistas, relatório, mensagens pessoais e novidades) podem ser desligados em Minha conta ou pelo link de cada e-mail.</li>
          <li><strong>Ranking:</strong> depois de 5 questões você aparece com o apelido que escolher (ou nome e inicial do sobrenome). Dá para sair quando quiser.</li>
          <li><strong>Algum problema?</strong> Fale com o suporte primeiro: respondemos em até 5 dias. Seus direitos de consumidor continuam garantidos.</li>
        </ul>
      </section>

      <details className="juridico-mudancas">
        <summary>O que mudou nesta versão</summary>
        <ul>{MUDANCAS_TERMOS.map((m) => <li key={m}>{m}</li>)}</ul>
      </details>

      <IndicePagina alvo={pagina} titulo="Sumário das cláusulas" />
      <VoltarAoTopo />

      <h2>1. Quem somos e como estes Termos se aplicam</h2>
      <I n="1.1">O {nome} (“Plataforma”, “site” ou “nós”), acessível em {SITE.url}, é um projeto independente mantido por {SITE.autor}, pessoa física, médico residente em Ortopedia e Traumatologia, que é o responsável pela Plataforma e, para fins da legislação de proteção de dados, o controlador dos dados pessoais tratados nela. O contato oficial do responsável é {contato}.</I>
      <I n="1.2">Estes Termos formam um contrato entre o {nome} e cada pessoa que acessa a Plataforma (“Usuário” ou “você”). Para quem cria uma Conta, eles passam a valer com o aceite expresso no cadastro, dado por caixa de seleção não pré-marcada ou, no cadastro pelo Google, pelo botão que informa que continuar significa concordar com estes Termos. Para quem apenas visita páginas públicas, valem as regras de uso, de propriedade intelectual e de privacidade aqui previstas.</I>
      <I n="1.3">Integram estes Termos: (a) as <a href={href('/condicoes-assinatura')}>Condições da Assinatura</a>, que regem a compra de planos pagos e prevalecem sobre estes Termos nos assuntos comerciais; e (b) os avisos específicos exibidos na própria Plataforma, como o aviso de cookies e os avisos junto às questões. Em caso de dúvida de interpretação entre esses documentos, prevalece a interpretação mais favorável ao Usuário consumidor.</I>
      <I n="1.4">O aceite é registrado na Conta com a versão destes Termos e a data e hora em que foi dado. O texto vigente fica sempre disponível, sem necessidade de login, pelo link “Termos de uso” no rodapé de todas as páginas.</I>
      <I n="1.5">Se você não concordar com estes Termos, não crie uma Conta. Quem já tem Conta e deixar de concordar pode encerrá-la a qualquer momento, na forma da Cláusula 15.</I>

      <h2>2. Definições</h2>
      <p>Os termos abaixo, quando iniciados em maiúscula, têm o seguinte significado, no singular ou no plural:</p>
      <I n="2.1">“Conta”: o cadastro individual e pessoal do Usuário, vinculado a um e-mail ou a uma conta Google, que permite registrar e sincronizar o estudo.</I>
      <I n="2.2">“Acervo”: o conjunto de questões, enunciados, alternativas, gabaritos, imagens, comentários, resumos, flashcards e demais materiais de estudo disponíveis na Plataforma.</I>
      <I n="2.3">“Provas”: exames de título de especialista, provas de residência médica, de sociedades de especialidade e de fellowships citados no Acervo, como TEOT, TARO, R4 do ENARE, TECOC e Fellowship Quadril.</I>
      <I n="2.4">“Conteúdo com apoio de IA”: textos do Acervo, como comentários, resumos e, nas questões autorais, enunciados e alternativas, redigidos no todo ou em parte com apoio de sistemas de inteligência artificial generativa e submetidos à curadoria editorial do projeto.</I>
      <I n="2.5">“Conteúdo do Usuário”: tudo o que o Usuário envia ou registra na Plataforma, como respostas, anotações, relatos de erro, avaliações, opiniões, apelido, nome de liga e comentários enviados para publicação.</I>
      <I n="2.6">“Plano pago” ou “assinatura”: a contratação opcional de acesso, por período determinado, aos recursos anunciados para o plano, na forma das Condições da Assinatura.</I>
      <I n="2.7">“Funcionalidade em teste” ou “beta”: recurso identificado na Plataforma como Beta, em fase de avaliação, como os Flashcards.</I>
      <I n="2.8">“Fornecedores de infraestrutura”: empresas contratadas para o funcionamento técnico da Plataforma, como a Supabase (banco de dados e autenticação), o serviço de hospedagem do site, o Mercado Pago (pagamentos) e o serviço de envio de e-mails.</I>

      <h2>3. O que é o {nome}</h2>
      <I n="3.1">O {nome} é uma ferramenta de apoio ao estudo teórico, baseada em questões de múltipla escolha, comentários, revisão espaçada, flashcards, simulados, cronograma e estatísticas de desempenho, destinada a médicos residentes, ortopedistas, outros profissionais de saúde e estudantes da área.</I>
      <I n="3.2">A Plataforma não é curso, programa de ensino, instituição de ensino, mentoria ou preceptoria. O uso não gera certificado, carga horária, pontuação para título de especialista nem qualquer validação acadêmica ou profissional.</I>
      <I n="3.3">O {nome} não tem vínculo institucional, comercial ou de afiliação com a Sociedade Brasileira de Ortopedia e Traumatologia (SBOT), o ENARE, a Sociedade Brasileira de Cirurgia do Ombro e Cotovelo (SBCOC), bancas examinadoras, serviços de residência ou instituições de ensino. Nenhuma dessas entidades elaborou, revisou, aprovou, patrocina ou endossa a Plataforma. Os nomes, siglas e marcas delas são citados apenas para indicar a qual Prova ou área um conteúdo se refere.</I>
      <I n="3.4">Resultados exibidos pela Plataforma, como percentual de acerto, posição em ranking ou no Simulado Nacional, relatório de prontidão, cronograma e incidência de temas, são ferramentas de estudo calculadas a partir das respostas registradas no site. Não são avaliação oficial nem previsão de resultado em qualquer Prova.</I>

      <h2>4. Limites do conteúdo e uso clínico</h2>
      <I n="4.1"><strong>Sem garantia de aprovação.</strong> O desempenho em Provas depende de muitos fatores fora do alcance do {nome}. A Plataforma não promete aprovação, nota mínima ou classificação, nem afirma que o Acervo basta, sozinho, para a preparação.</I>
      <I n="4.2"><strong>Apoio, não substituto.</strong> O conteúdo não substitui a bibliografia oficial de cada Prova, os editais e comunicados das bancas, a formação médica formal, a residência, a preceptoria, os protocolos do serviço do Usuário nem o julgamento clínico. Para regras de inscrição, conteúdo programático, datas e critérios de correção, valem sempre os editais e as informações oficiais das bancas.</I>
      <I n="4.3"><strong>Inteligência artificial e possibilidade de erro.</strong> Parte do Acervo é Conteúdo com apoio de IA, produzido a partir de obras de referência indicadas, quando disponível, nas referências de cada comentário. Esses sistemas podem gerar afirmações incorretas, desatualizadas, incompletas ou sem respaldo na fonte, ainda que escritas com aparência de rigor. A menção a uma obra indica a base consultada, e não que cada frase esteja literalmente nela. Há divergências legítimas entre autores, edições e serviços sobre classificações, condutas e valores, e um comentário não esgota essas divergências.</I>
      <I n="4.4"><strong>Revisão contínua e canal de relato.</strong> O Acervo é revisado continuamente. O Usuário pode sinalizar erro, imprecisão ou dúvida pelo botão de relato de erro de cada questão, pela avaliação dos comentários ou pelo canal de <a href={href('/contato')}>contato</a>. As sinalizações são analisadas de boa-fé e orientam as correções, em prazo compatível com a complexidade de cada caso. A indicação de que um comentário passou por revisão técnica individual só aparece quando essa revisão existiu.</I>
      <I n="4.5"><strong>Sem relação médico-paciente.</strong> A Plataforma não presta assistência médica, teleconsulta, diagnóstico, prescrição ou aconselhamento clínico, e seu uso não cria relação médico-paciente. Nenhum conteúdo deve ser usado como fundamento para decisões sobre pacientes reais, inclusive o próprio Usuário. Quem tiver dúvida sobre a própria saúde deve procurar atendimento médico.</I>
      <I n="4.6"><strong>Confira na fonte.</strong> Cabe ao Usuário conferir em fontes primárias e atualizadas qualquer informação que pretenda levar para a Prova ou para a prática profissional, e exercer senso crítico ao estudar.</I>

      <h2>5. Origem do Acervo, provas públicas e citação de fontes</h2>
      <I n="5.1"><strong>Questões de Provas já aplicadas.</strong> O Acervo reúne questões de edições anteriores de Provas já aplicadas e divulgadas, como TEOT, TARO, R4 do ENARE e TECOC, reproduzidas com indicação da Prova e, quando conhecido, do ano de origem e do gabarito da banca, com finalidade exclusivamente educacional, de estudo e de crítica. Os cadernos do TARO são divulgados publicamente pela própria SBOT, na página da Comissão de Ensino e Treinamento (<a href="https://sbot.org.br/comissoes/sobre-a-sbot-comissao-ensino-treinamento/taro/" target="_blank" rel="noopener noreferrer">sbot.org.br</a>). Questões ainda em conferência de prova e ano podem aparecer agrupadas como “TEOT/TARO”. A titularidade desse material continua com as respectivas bancas e instituições; o {nome} não reivindica direitos sobre ele, e a existência de planos pagos não altera essa titularidade.</I>
      <I n="5.2"><strong>Questões autorais ({ROTULO_SIMULADOS}).</strong> São questões elaboradas pelo próprio {nome}, a partir da bibliografia de referência e do padrão publicamente conhecido de cada Prova, por engenharia reversa de provas anteriores. Não são questões oficiais, não foram elaboradas, revisadas ou endossadas por nenhuma banca e não reproduzem, traduzem nem parafraseiam material sigiloso ou não divulgado. Cada uma traz esse aviso junto ao enunciado. Isso vale, em especial, para as questões no padrão da prova de Fellowship Quadril.</I>
      <I n="5.3"><strong>Fidelidade e gabaritos.</strong> A extração de texto das Provas busca fidelidade ao documento de origem, mas pode haver erros de digitalização, figuras ausentes ou diferença entre o gabarito exibido e o gabarito definitivo da banca, inclusive por anulações posteriores. Questões identificadas como anuladas são marcadas e deixam de contar no desempenho. Quando o comentário diverge do gabarito oficial, a Plataforma preserva a letra da banca e explica a divergência.</I>
      <I n="5.4"><strong>Citação de fontes.</strong> Obras de referência são citadas nos comentários para orientar o estudo e permitir a conferência. Trechos eventualmente reproduzidos são curtos, com indicação da fonte e na medida justificada pela finalidade de estudo, crítica ou explicação, nos termos do artigo 46 da Lei nº 9.610/1998.</I>
      <I n="5.5"><strong>Pedido de titular de direitos.</strong> Quem se considerar titular de direitos sobre qualquer conteúdo pode pedir sua correção ou retirada pelo e-mail {contato}, identificando o conteúdo e o direito alegado. O pedido é analisado de boa-fé e em prazo razoável, e o conteúdo pode ser retirado preventivamente durante a análise.</I>
      <I n="5.6"><strong>Acervo dinâmico.</strong> Questões, gabaritos, classificações, comentários e demais materiais podem ser incluídos, corrigidos, reclassificados, reescritos ou retirados, para corrigir erros, atender a titulares de direitos, cumprir a lei ou melhorar o estudo. Nem o uso gratuito nem a assinatura asseguram a permanência de uma questão específica, de uma quantidade de questões ou do conteúdo de uma Prova determinada, ressalvado o disposto na Cláusula 14.</I>
      <I n="5.7"><strong>Simulados.</strong> Os simulados montados pelo Usuário e o Simulado Nacional combinam questões do Acervo e não correspondem a nenhuma prova real aplicada por qualquer instituição.</I>

      <h2>6. Conta de usuário</h2>
      <I n="6.1">A criação de Conta é gratuita. Ver questões e registrar o estudo exige Conta; as páginas informativas, estes Termos e as Condições da Assinatura podem ser lidos sem ela.</I>
      <I n="6.2">Ao se cadastrar, o Usuário declara que: (a) tem capacidade civil para contratar ou, se for menor de 18 anos, está assistido ou representado por seu responsável legal, que também aceita estes Termos e responde pela contratação de planos; (b) as informações fornecidas são verdadeiras e serão mantidas atualizadas; e (c) manterá uma única Conta, pessoal e intransferível.</I>
      <I n="6.3">O Usuário é responsável por guardar sua senha e o acesso à conta Google usada no cadastro, e pelos atos praticados em sua Conta, salvo se comprovar que decorreram de falha de segurança da Plataforma. Uso não autorizado deve ser comunicado imediatamente pelo canal de contato.</I>
      <I n="6.4">Para proteger a Conta e coibir o compartilhamento, a Conta fica aberta em um aparelho por vez. Ao entrar em outro aparelho ou navegador, a sessão anterior é encerrada, sem perda do progresso registrado.</I>
      <I n="6.5">O {nome} não verifica ativamente os dados cadastrais e não responde por consequências de informações falsas, incompletas ou desatualizadas fornecidas pelo Usuário.</I>

      <h2>7. Acesso gratuito e assinatura</h2>
      <I n="7.1">A Conta gratuita não exige cartão nem pagamento. {fraseGratis('termos')} Nenhuma alteração do acesso gratuito encurta ou reduz um período de acesso já contratado e pago.</I>
      <I n="7.2">A assinatura é opcional. Hoje há três planos: mensal (R$ 39,90 a cada mês), semestral (R$ 179,90 a cada seis meses) e anual (R$ 239,90 a cada doze meses), pagos por cartão de crédito, com renovação automática, ou por Pix, como pagamento único do período, sem renovação automática. Preços, recursos, renovação, garantia de 7 dias, cancelamento, reembolsos, reajustes e as demais regras de compra estão nas <a href={href('/condicoes-assinatura')}>Condições da Assinatura</a>, apresentadas para aceite separado antes de cada pagamento.</I>
      <I n="7.3">O {nome} pode liberar temporariamente recursos do plano pago a todas as Contas, fazer promoções e conceder cortesias, como as do programa de indicação. Essas liberações não criam direito permanente ao recurso para quem não assina e não reduzem o que foi contratado por quem assina.</I>

      <h2>8. Propriedade intelectual e licença de uso</h2>
      <I n="8.1">O código, o layout, a identidade visual, a marca “{nome}”, os textos originais, incluindo comentários, resumos, flashcards, questões autorais e o Conteúdo com apoio de IA na medida em que for protegido, e a seleção, organização e curadoria do Acervo pertencem ao {nome} ou a seu responsável e são protegidos pela Lei nº 9.610/1998 (direitos autorais), pela Lei nº 9.279/1996 (propriedade industrial) e pela proteção legal das bases de dados, no que couber.</I>
      <I n="8.2">Enquanto estes Termos forem cumpridos, o {nome} concede ao Usuário uma licença pessoal, limitada, não exclusiva, intransferível e não sublicenciável para acessar e usar a Plataforma e o Acervo exclusivamente para estudo próprio, sem finalidade comercial. Para o assinante, a licença abrange os recursos do plano pelo período contratado.</I>
      <I n="8.3">A licença não transfere ao Usuário nenhum direito de propriedade sobre a Plataforma ou o Acervo e pode ser suspensa ou encerrada nos casos da Cláusula 15.</I>
      <I n="8.4">É permitido ao Usuário citar uma questão ou trecho curto em conversa de estudo, com indicação da fonte, desde que isso não sirva para reproduzir ou substituir o Acervo.</I>

      <h2>9. Regras de conduta e usos proibidos</h2>
      <I n="9.1">O Usuário se compromete a usar a Plataforma de boa-fé, para estudo próprio, respeitando a lei, estes Termos e os demais usuários.</I>
      <I n="9.2">Sem autorização prévia e por escrito do {nome}, é proibido: (a) compartilhar a Conta ou as credenciais, permitir o uso por terceiros ou usar Conta alheia; (b) revender, alugar, ceder ou disponibilizar o acesso, inclusive em grupos de estudo, cursos ou serviços; (c) copiar, reproduzir, publicar, distribuir ou vender, no todo ou em parte relevante, o Acervo, inclusive por prints sistemáticos, exportação ou transcrição; (d) usar robôs, scripts, raspagem (scraping), extração automatizada, engenharia reversa ou qualquer meio para coletar o Acervo em massa ou contornar limites técnicos e de uso; (e) usar o Acervo para criar base de dados, banco de questões, curso ou produto concorrente ou destinado a terceiros; (f) usar o conteúdo para treinar, ajustar ou avaliar sistemas de inteligência artificial; (g) tentar acessar dados de outros usuários, áreas restritas ou a infraestrutura técnica, ou sobrecarregá-la; (h) manipular rankings, simulados, indicações ou cortesias, inclusive com contas falsas ou múltiplas; (i) enviar conteúdo ilícito, ofensivo, discriminatório, difamatório, que viole direitos de terceiros ou que seja publicidade não solicitada; (j) passar-se por outra pessoa, instituição ou banca, ou atribuir-se qualificação falsa; e (k) remover avisos de autoria, origem ou titularidade.</I>
      <I n="9.3">Descumprimentos podem levar às medidas da Cláusula 15, sem prejuízo da reparação dos danos causados, na forma da lei.</I>

      <h2>10. Ranking, apelidos, ligas e áreas compartilhadas</h2>
      <I n="10.1"><strong>Ranking geral.</strong> A Plataforma mantém um ranking de participação que ordena as Contas pela quantidade de questões diferentes respondidas, no acumulado e nos últimos 7 dias. Toda Conta com pelo menos 5 questões respondidas entra no ranking por padrão, e o Usuário pode sair dele e voltar quando quiser, em <a href={href('/conta')}>Minha conta</a>.</I>
      <I n="10.2"><strong>O que aparece.</strong> No ranking aparecem apenas: (a) o apelido escolhido ou, sem apelido, o nome e a inicial do sobrenome; (b) a posição e a quantidade de questões; (c) os emblemas escolhidos e a sequência de dias de estudo; e (d) o serviço de residência, só se o Usuário ligar essa opção. Nome e apelido só são vistos por quem tem Conta; visitantes veem as iniciais. Nunca aparecem e-mail, WhatsApp, cidade, UF, data de nascimento, situação profissional, respostas dadas ou percentual de acerto. Os rankings dos Flashcards seguem as mesmas regras de nome.</I>
      <I n="10.3"><strong>Apelidos.</strong> O apelido é de responsabilidade do Usuário e não pode ser ofensivo, discriminatório, obsceno, enganoso, conter dados de terceiros ou se passar por outra pessoa ou instituição. O {nome} pode recusar, substituir ou remover apelidos e nomes de liga que violem esta regra e retirar Contas do ranking em caso de manipulação, informando o Usuário quando possível.</I>
      <I n="10.4"><strong>Simulado Nacional e ligas.</strong> Posição e percentil no Simulado Nacional são mostrados só ao próprio Usuário; a lista dos 10 primeiros de cada edição, visível aos participantes, usa o nome do ranking, a quantidade de acertos e o tempo, e não inclui quem saiu do ranking. Quem entra em uma liga da residência concorda que os demais membros vejam seu nome do ranking e a quantidade de questões respondidas. Quem cria a liga pode renomeá-la, remover membros e encerrá-la; qualquer membro pode sair.</I>
      <I n="10.5"><strong>Como a turma respondeu.</strong> Estatísticas de como as Contas responderam cada questão são exibidas apenas de forma agregada, a partir de 3 respostas, sem identificar ninguém.</I>

      <h2>11. Conteúdo enviado pelo Usuário</h2>
      <I n="11.1">O Usuário continua titular do Conteúdo do Usuário e responde por ele. Ao enviá-lo, declara que tem o direito de fazê-lo e que ele não viola a lei nem direitos de terceiros.</I>
      <I n="11.2"><strong>Conteúdo privado.</strong> Respostas, anotações, favoritas, cronograma e progresso são privados: ficam associados à Conta e não são exibidos a outros usuários, exceto nas formas agregadas ou de ranking descritas na Cláusula 10.</I>
      <I n="11.3"><strong>Relatos, avaliações e opiniões.</strong> Relatos de erro, avaliações de comentários e opiniões sobre funcionalidades, inclusive as do beta dos Flashcards, são usados para revisar o Acervo e melhorar a Plataforma, sem exibição pública. O Usuário autoriza o {nome} a usar gratuitamente as sugestões enviadas para corrigir e melhorar o serviço, sem que isso gere remuneração ou obrigação de implementá-las.</I>
      <I n="11.4"><strong>Comentários enviados para publicação.</strong> Quem envia um comentário ou contribuição para publicação no Acervo concede ao {nome} licença gratuita, não exclusiva e por prazo indeterminado para armazenar, editar para fins de clareza e correção, reproduzir e exibir esse conteúdo na Plataforma e em suas divulgações, com a identificação que o próprio autor informar. O autor pode pedir a retirada a qualquer momento, pelo canal de contato.</I>
      <I n="11.5"><strong>Moderação.</strong> O {nome} pode deixar de publicar, ocultar ou retirar Conteúdo do Usuário que viole estes Termos ou a lei, ou que seja incompatível com a finalidade educacional da Plataforma, informando o motivo quando solicitado.</I>

      <h2>12. Funcionalidades em teste (beta)</h2>
      <I n="12.1">Recursos identificados como Beta, como os Flashcards e o Torneio de Flashcards, estão em fase de avaliação. Podem conter falhas, ter regras, aparência, pontuações e rankings ajustados, ter progresso reiniciado por necessidade técnica, ser suspensos ou deixar de existir.</I>
      <I n="12.2">A inclusão de um recurso em teste não altera os preços nem as regras de acesso e limites vigentes. Quando um recurso beta for anunciado como parte do plano pago no momento da contratação, sua retirada definitiva segue as regras de mudanças de recursos das Condições da Assinatura.</I>
      <I n="12.3">Opiniões sobre o beta são voluntárias e tratadas como descrito na Cláusula 11.3.</I>

      <h2>13. Disponibilidade, manutenção e mudanças no serviço</h2>
      <I n="13.1">O {nome} se empenha em manter a Plataforma disponível e funcionando bem, mas, como todo serviço on-line, ela pode ficar indisponível por manutenção, atualização, falha própria ou de Fornecedores de infraestrutura, ataques, falhas da internet ou determinação de autoridade. Não há garantia de funcionamento ininterrupto ou livre de erros.</I>
      <I n="13.2">Manutenções programadas serão feitas, sempre que possível, em horários de menor uso. Indisponibilidades temporárias não geram, por si só, reembolso ou indenização. Para o assinante, se a Plataforma ficar inteiramente indisponível por mais de 3 dias seguidos por falha do {nome} ou de seus Fornecedores de infraestrutura, o período pago é prorrogado pelo mesmo número de dias, mediante pedido pelo canal de contato, sem prejuízo dos direitos previstos em lei.</I>
      <I n="13.3">O {nome} pode criar, alterar, reorganizar ou retirar funcionalidades para melhorar o projeto, corrigir problemas, cumprir a lei ou por razões técnicas. Mudanças que afetem o plano pago seguem as Condições da Assinatura e a Cláusula 14.</I>
      <I n="13.4">O Usuário pode exportar seus dados de progresso a qualquer momento pela página <a href={href('/dados')}>Seu desempenho</a>. Recomendamos guardar uma cópia periodicamente.</I>

      <h2>14. Encerramento do serviço ou da oferta paga</h2>
      <I n="14.1">O {nome} pode, por decisão própria ou em razão de fatores externos, encerrar definitivamente a Plataforma, encerrar a oferta de planos pagos, tornar todo o seu conteúdo gratuito para todos ou suprimir funcionalidade essencial do plano pago.</I>
      <I n="14.2">Nesses casos, os Usuários serão avisados com antecedência razoável, de no mínimo 30 dias sempre que possível, pelo e-mail cadastrado e no site, e a exportação dos dados de estudo ficará disponível durante o aviso.</I>
      <I n="14.3">O assinante afetado com período pago em vigor tem direito à restituição do valor proporcional ao período não usufruído, calculada dia a dia, no prazo e pelo meio previstos na cláusula de descontinuidade das <a href={href('/condicoes-assinatura')}>Condições da Assinatura</a> (Cláusula 13), que regula integralmente as hipóteses, o cálculo e a forma dessa restituição.</I>

      <h2>15. Suspensão e encerramento de Conta</h2>
      <I n="15.1"><strong>Pelo Usuário.</strong> O Usuário pode encerrar sua Conta a qualquer momento pelo canal de <a href={href('/contato?assunto=exclusao-conta')}>solicitação de exclusão</a>. O encerramento não cancela sozinho uma assinatura no cartão: a renovação deve ser desligada em Detalhes da assinatura, ou o Usuário pode pedir que o suporte o faça junto com a exclusão.</I>
      <I n="15.2"><strong>Pelo {nome}.</strong> O {nome} pode advertir, suspender ou encerrar uma Conta em caso de fraude, risco à segurança, dados cadastrais falsos ou descumprimento destes Termos, em especial das Cláusulas 9 e 10. A medida será proporcional à gravidade do fato e, salvo urgência de segurança ou fraude, precedida de comunicação pelo e-mail cadastrado, com prazo de pelo menos 5 dias para o Usuário apresentar explicações ou corrigir a conduta.</I>
      <I n="15.3"><strong>Efeitos para o assinante.</strong> A suspensão interrompe o acesso enquanto durar. Se a Conta de um assinante for encerrada por descumprimento, a renovação será cancelada e o valor proporcional ao período pago não usufruído será restituído na forma das Condições da Assinatura, sem prejuízo da reparação dos danos comprovadamente causados pela conduta, na forma da lei.</I>
      <I n="15.4">O encerramento não afeta obrigações já constituídas nem as cláusulas que, por sua natureza, continuam valendo, como as de propriedade intelectual, responsabilidade, guarda de dados e foro.</I>

      <h2>16. Responsabilidades e seus limites</h2>
      <I n="16.1">O {nome} responde, nos termos da lei, pelos danos que causar ao Usuário. Nada nestes Termos exclui ou reduz direitos que o Código de Defesa do Consumidor (Lei nº 8.078/1990) ou outra lei assegurem e que não possam ser afastados por contrato.</I>
      <I n="16.2">Considerando a natureza educacional da Plataforma e as ressalvas das Cláusulas 3 e 4, o {nome} não responde por: (a) decisões clínicas, acadêmicas ou profissionais tomadas pelo Usuário com base no conteúdo, contra as ressalvas destes Termos; (b) resultado em Provas, concursos ou seleções; (c) danos decorrentes de culpa exclusiva do Usuário ou de terceiros, como compartilhamento de senha, uso de aparelho inseguro ou Conteúdo de outros usuários; (d) indisponibilidades e falhas de serviços de terceiros que não integram a Plataforma, como a internet, o aparelho do Usuário ou o banco emissor do cartão; e (e) danos indiretos ou lucros cessantes que não decorram diretamente de falha do serviço do {nome}.</I>
      <I n="16.3">Quando o Usuário contratar como pessoa jurídica, ou fora de relação de consumo, a responsabilidade total do {nome} fica limitada ao valor efetivamente pago por esse Usuário nos 12 meses anteriores ao fato, ressalvados os casos de dolo.</I>
      <I n="16.4">O Usuário responde, na forma da lei, pelos danos que causar ao {nome} ou a terceiros por violação destes Termos, da lei ou de direitos de terceiros, inclusive pelo Conteúdo do Usuário.</I>
      <I n="16.5">Nenhuma das partes responde por descumprimento causado por caso fortuito ou força maior, nos termos do artigo 393 do Código Civil, ressalvado o direito de restituição proporcional previsto na Cláusula 14 e nas Condições da Assinatura, que se mantém mesmo nessas hipóteses.</I>

      <h2>17. Privacidade e proteção de dados pessoais</h2>
      <p>Esta cláusula é a Política de Privacidade do {nome} e segue a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018, “LGPD”).</p>

      <h3>17.1. Controlador e encarregado</h3>
      <I n="17.1.1">O controlador é o responsável indicado na Cláusula 1.1. Por ser um projeto de pequeno porte, o próprio responsável atua como canal de comunicação com os titulares e com a Autoridade Nacional de Proteção de Dados (encarregado), pelo e-mail {contato} ou pelo canal de <a href={href('/contato')}>contato</a>.</I>

      <h3>17.2. Dados tratados</h3>
      <div className="juridico-tabela-rolagem">
        <table className="juridico-tabela">
          <thead><tr><th scope="col">Categoria</th><th scope="col">Dados</th></tr></thead>
          <tbody>
            <tr><td>Cadastro e perfil</td><td>E-mail; senha (guardada apenas de forma criptografada pelo serviço de autenticação, nunca em texto); nome e sobrenome; data de nascimento; etapa ou situação profissional e ano da residência; provas de interesse; serviço de residência ou de atuação e outros locais de trabalho; WhatsApp, cidade e UF (opcionais); apelido; escolha sobre receber novidades; versão e data do aceite destes Termos. No cadastro pelo Google, recebemos o nome e o e-mail dessa conta.</td></tr>
            <tr><td>Estudo</td><td>Respostas, revisões programadas, favoritas, anotações, sessões, desempenho, emblemas, sequência de dias, cronograma e seus ajustes, participação no Simulado Nacional e em ligas, progresso e recordes nos Flashcards e indicações.</td></tr>
            <tr><td>Navegação e aparelho</td><td>Páginas do site e questões abertas enquanto a Conta está conectada, com data e hora (guardadas por 30 dias); identificador aleatório do aparelho e descrição genérica do navegador e do sistema (apenas o tipo de navegador e de sistema, sem modelo ou número de série); horário do último acesso. Não coletamos localização nem número de telefone do aparelho.</td></tr>
            <tr><td>Origem do cadastro</td><td>De onde veio o primeiro acesso (marcação do link, como a de um anúncio ou de uma rede social, ou o endereço do site de origem) e a primeira página aberta, guardados no aparelho por até 30 dias e registrados na Conta quando ela é criada.</td></tr>
            <tr><td>Assinatura e pagamento</td><td>Plano, valor, periodicidade, meio de pagamento, aceite das Condições da Assinatura com versão e data, identificadores e situação das cobranças e datas do período. No Pix, o CPF do pagador é enviado ao Mercado Pago para gerar a cobrança e não é salvo no perfil nem nos pedidos, podendo constar nas notificações do Mercado Pago guardadas para conciliação. Não recebemos número completo nem código de segurança do cartão.</td></tr>
            <tr><td>Comunicações</td><td>Preferências de e-mail e histórico dos e-mails enviados (tipo, modelo, data e se foi automático ou manual), mensagens trocadas com o suporte, relatos de erro, avaliações e opiniões.</td></tr>
          </tbody>
        </table>
      </div>

      <h3>17.3. Finalidades e bases legais</h3>
      <div className="juridico-tabela-rolagem">
        <table className="juridico-tabela">
          <thead><tr><th scope="col">Para quê</th><th scope="col">Base legal (LGPD, art. 7º)</th></tr></thead>
          <tbody>
            <tr><td>Criar e manter a Conta, autenticar, sincronizar o estudo, calcular desempenho, revisão, cronograma, simulados e flashcards</td><td>Execução do contrato (inciso V)</td></tr>
            <tr><td>Contratar, cobrar, renovar, cancelar e reembolsar assinaturas; atender pedidos de garantia</td><td>Execução do contrato (inciso V)</td></tr>
            <tr><td>Guardar registros de aceite, pagamentos, reembolsos e comunicações</td><td>Cumprimento de obrigação legal (inciso II) e exercício regular de direitos (inciso VI)</td></tr>
            <tr><td>Segurança, prevenção de fraude e de compartilhamento de Conta, suporte</td><td>Legítimo interesse (inciso IX) e execução do contrato (inciso V)</td></tr>
            <tr><td>Ranking, ligas e estatísticas agregadas</td><td>Legítimo interesse (inciso IX), com opção de sair do ranking</td></tr>
            <tr><td>Entender o uso, melhorar o Acervo e a Plataforma, medir de onde vêm os cadastros</td><td>Legítimo interesse (inciso IX)</td></tr>
            <tr><td>Entender o interesse nos planos e personalizar comunicações a partir das páginas visitadas e do uso (item 17.4)</td><td>Legítimo interesse (inciso IX), com opção de recusa</td></tr>
            <tr><td>Lembretes de estudo, e-mails de conquistas, relatório mensal e mensagens pessoais do responsável</td><td>Legítimo interesse (inciso IX), com descadastro a qualquer momento</td></tr>
            <tr><td>Novidades e convites para assinar enviados em lote</td><td>Consentimento (inciso I), pela opção “Quero receber novidades”</td></tr>
            <tr><td>Pixel do Meta para medir e direcionar anúncios</td><td>Consentimento (inciso I), pelo aviso de cookies</td></tr>
          </tbody>
        </table>
      </div>

      <h3>17.4. Páginas visitadas, interesse nos planos e personalização</h3>
      <I n="17.4.1">Enquanto a Conta está conectada, registramos as páginas do site e as questões abertas, com data e hora, por 30 dias, e depois esses registros são apagados automaticamente. Com eles e com os dados de estudo (como quantidade de questões, acerto, áreas estudadas, horários e sequência), o responsável pode: (a) dar suporte e investigar falhas; (b) entender como o site é usado e melhorar o Acervo; (c) saber se a pessoa visitou a página de planos e quantas vezes, para entender o interesse nos planos; e (d) personalizar as mensagens que envia, como lembretes e cartas pessoais, por exemplo citando o progresso da pessoa ou respondendo a uma dúvida sobre os planos.</I>
      <I n="17.4.2">Esses dados são vistos apenas pela administração, não são compartilhados nem vendidos a terceiros e não são usados para decisões automatizadas que afetem direitos do Usuário, como preço, acesso ou cobrança. Mensagens com convite para assinar só são enviadas em lote a quem marcou “Quero receber novidades”; fora disso, apenas quando o Usuário pediu informação ou já está em conversa com o suporte.</I>
      <I n="17.4.3">O Usuário pode se opor a esse uso a qualquer momento, pelo canal de contato, e desligar as mensagens como descrito no item 17.5. A oposição não impede o registro necessário à segurança e ao suporte.</I>

      <h3>17.5. Comunicações por e-mail</h3>
      <I n="17.5.1"><strong>E-mails de serviço</strong>, como confirmação de cadastro, recuperação de senha, avisos sobre pagamento, garantia, renovação, fim do período do Pix, alterações destes Termos, segurança e respostas a relatos e pedidos, são necessários à prestação do serviço e não dependem de preferência.</I>
      <I n="17.5.2"><strong>Comunicações pessoais e de relacionamento</strong>, como lembretes de estudo, e-mails de conquistas, relatório mensal do assinante e cartas pessoais do responsável, são enviadas com espaçamento e podem ser desligadas, por tipo, em <a href={href('/conta')}>Minha conta</a> ou pelo link de descadastro presente em cada mensagem.</I>
      <I n="17.5.3"><strong>Novidades</strong> sobre o {nome}, inclusive ofertas e convites para assinar enviados em lote, só vão a quem marcou “Quero receber novidades”, opção que pode ser desmarcada a qualquer momento em Minha conta.</I>
      <I n="17.5.4">Os e-mails são enviados por um serviço contratado de envio de e-mails, que recebe apenas o endereço e o conteúdo da mensagem. Mensagens do Mercado Pago sobre pagamentos seguem as regras desse provedor.</I>

      <h3>17.6. Compartilhamento</h3>
      <I n="17.6.1">O {nome} não vende dados pessoais. Os dados são compartilhados apenas com: (a) Fornecedores de infraestrutura, na medida necessária ao serviço (Supabase, hospedagem do site, Mercado Pago e serviço de envio de e-mails), que atuam conforme as instruções do {nome} ou suas próprias políticas, quando atuam como controladores, como o Mercado Pago nos pagamentos; (b) o Meta, somente com o consentimento do item 17.11, sem envio de e-mail, nome ou dados de estudo; e (c) autoridades, quando houver obrigação legal ou ordem de autoridade competente.</I>
      <I n="17.6.2">Os dados ficam no banco de dados da Supabase, com regras de acesso que restringem cada Conta ao próprio titular, ressalvadas as exibições da Cláusula 10 e o acesso administrativo do responsável, limitado ao necessário para suporte, segurança, prevenção de fraude, estatísticas, melhoria do conteúdo e comunicações descritas nesta cláusula.</I>

      <h3>17.7. Transferência internacional</h3>
      <I n="17.7.1">Alguns Fornecedores de infraestrutura e o Meta podem armazenar ou tratar dados fora do Brasil. Nesses casos, a transferência ocorre nas hipóteses do artigo 33 da LGPD, conforme o caso para a execução do contrato com o Usuário (inciso IX) ou com o seu consentimento específico (inciso VIII), como no pixel do item 17.11, e com as garantias previstas na regulamentação da Autoridade Nacional de Proteção de Dados.</I>

      <h3>17.8. Por quanto tempo guardamos</h3>
      <I n="17.8.1">Dados de cadastro, estudo, preferências e histórico de e-mails: enquanto a Conta existir. Páginas visitadas: 30 dias. Origem do acesso no aparelho: até 30 dias. Após o encerramento da Conta, os dados são eliminados ou anonimizados em prazo técnico razoável, exceto os registros que a lei obriga ou autoriza a guardar, como os de pagamento, reembolso e aceite destes Termos e das Condições da Assinatura, mantidos pelo prazo das obrigações legais e prescricionais aplicáveis, em regra de até 5 anos após o fim da relação, e o que for necessário ao exercício regular de direitos.</I>

      <h3>17.9. Seus direitos</h3>
      <I n="17.9.1">Nos termos do artigo 18 da LGPD, o titular pode pedir: confirmação do tratamento; acesso aos dados; correção de dados incompletos, inexatos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei; portabilidade; eliminação dos dados tratados com consentimento; informação sobre compartilhamentos; informação sobre a possibilidade de não consentir e suas consequências; revogação do consentimento; e oposição a tratamento baseado em legítimo interesse.</I>
      <I n="17.9.2">Muitos desses direitos podem ser exercidos diretamente em <a href={href('/conta')}>Minha conta</a> (corrigir perfil, apelido, ranking e preferências de e-mail) e em <a href={href('/dados')}>Seu desempenho</a> (exportar o progresso). Os demais, inclusive a exclusão da Conta, pelo canal de <a href={href('/contato?assunto=exclusao-conta')}>solicitação de exclusão</a> ou pelo e-mail {contato}. Os pedidos são respondidos em até 15 dias, podendo ser solicitada confirmação de identidade. O titular também pode peticionar à Autoridade Nacional de Proteção de Dados.</I>

      <h3>17.10. Segurança e incidentes</h3>
      <I n="17.10.1">O {nome} adota medidas técnicas e administrativas razoáveis para proteger os dados, como conexão criptografada, acesso restrito por Conta, senhas guardadas só pelo serviço de autenticação e acesso administrativo autenticado. Nenhum sistema é totalmente imune a falhas. Se ocorrer incidente de segurança que possa acarretar risco ou dano relevante, os titulares afetados e a Autoridade Nacional de Proteção de Dados serão comunicados, na forma do artigo 48 da LGPD.</I>

      <h3>17.11. Cookies e armazenamento local</h3>
      <I n="17.11.1"><strong>Necessários.</strong> A Plataforma usa o armazenamento local do navegador e cookies estritamente necessários para manter a sessão, as preferências de leitura, o progresso ainda não sincronizado, a origem do acesso (por até 30 dias) e a escolha sobre cookies. Eles não dependem de consentimento, e sem eles o site não funciona corretamente.</I>
      <I n="17.11.2"><strong>Medição de anúncios.</strong> Só com o consentimento dado no aviso de cookies, a Plataforma carrega o pixel de medição de anúncios do Meta (empresa responsável pelas redes sociais em que o site anuncia), que registra páginas visitadas e eventos como a criação de Conta e o início da compra de um plano, para medir os anúncios e escolher para quem são exibidos. Esses dados são tratados pelo Meta conforme a política dele. Sem o consentimento, nada do Meta é carregado, e o site funciona da mesma forma. A escolha pode ser mudada a qualquer momento pelo link “Cookies” no rodapé.</I>

      <h3>17.12. Crianças e adolescentes</h3>
      <I n="17.12.1">A Plataforma é dirigida a profissionais e estudantes da área da saúde e não é destinada a crianças. Dados de adolescentes só devem ser fornecidos com a participação do responsável legal, conforme o item 6.2 e o artigo 14 da LGPD.</I>

      <h2>18. Comunicações e avisos</h2>
      <I n="18.1">As comunicações do {nome} ao Usuário são feitas pelo e-mail cadastrado ou por avisos no site. O Usuário deve manter o e-mail atualizado e conferir também a caixa de spam. Comunicações do Usuário ao {nome} devem ser feitas pelo canal de <a href={href('/contato')}>contato</a> ou pelo e-mail {contato}.</I>

      <h2>19. Alterações destes Termos</h2>
      <I n="19.1">Estes Termos podem ser atualizados para refletir mudanças na Plataforma, na lei ou nas práticas do projeto. Cada versão traz data de vigência e número próprios, e as anteriores ficam registradas.</I>
      <I n="19.2">Alterações relevantes serão comunicadas com antecedência razoável, por e-mail ou aviso no site, com um resumo do que mudou, e poderá ser pedida a concordância expressa com a nova versão. A Conta continua funcionando enquanto o Usuário lê a nova versão.</I>
      <I n="19.3">Alterações que reduzam direitos do assinante ou aumentem seus deveres não se aplicam ao período já pago: para ele, valem a partir da renovação seguinte, salvo concordância expressa antes disso ou quando a mudança for exigida por lei ou ordem de autoridade.</I>
      <I n="19.4">Quem não concordar com a nova versão pode encerrar a Conta e desligar a renovação, sem qualquer ônus, mantidas as regras de reembolso das Condições da Assinatura.</I>

      <h2>20. Atendimento e solução amigável</h2>
      <I n="20.1">Dúvidas, reclamações e pedidos devem ser enviados preferencialmente pelo canal de <a href={href('/contato')}>contato</a> ou pelo e-mail {contato}. O {nome} responderá em até 5 dias, como prevê o Decreto nº 7.962/2013, e buscará resolver a questão de forma rápida e amigável.</I>
      <I n="20.2">As partes se comprometem a tentar, de boa-fé, uma solução amigável pelo suporte antes de recorrer a outros meios. Essa tentativa não é condição para o exercício de qualquer direito: o Usuário pode, a qualquer tempo, procurar os órgãos de defesa do consumidor, como o Procon, e a plataforma pública consumidor.gov.br, quando disponível para o {nome}.</I>

      <h2>21. Lei aplicável e foro</h2>
      <I n="21.1">Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial o Código de Defesa do Consumidor, o Código Civil, o Marco Civil da Internet (Lei nº 12.965/2014), a LGPD e o Decreto nº 7.962/2013.</I>
      <I n="21.2">Para o Usuário consumidor, fica eleito o foro do seu domicílio, sem prejuízo de outro que a lei lhe faculte. Nas relações que não sejam de consumo, fica eleito o foro da comarca do domicílio do responsável pelo {nome}.</I>

      <h2>22. Disposições gerais</h2>
      <I n="22.1"><strong>Tolerância.</strong> A tolerância com o descumprimento de qualquer cláusula não significa renúncia ao direito de exigi-la nem altera estes Termos.</I>
      <I n="22.2"><strong>Independência das cláusulas.</strong> Se alguma disposição for considerada inválida, as demais continuam valendo, e a disposição afetada deve ser interpretada, na maior medida possível, de modo a preservar sua finalidade dentro da lei.</I>
      <I n="22.3"><strong>Integralidade.</strong> Estes Termos, com as Condições da Assinatura e os avisos específicos da Plataforma, formam o acordo completo entre as partes sobre seu objeto e substituem versões e entendimentos anteriores, ressalvado o item 19.3.</I>
      <I n="22.4"><strong>Cessão.</strong> O Usuário não pode ceder sua Conta ou os direitos destes Termos. O {nome} pode transferir a Plataforma e estes Termos a outro responsável, mediante aviso prévio aos Usuários, que assumirá todas as obrigações perante eles, inclusive as da Cláusula 14.</I>
      <I n="22.5"><strong>Idioma e títulos.</strong> Estes Termos são redigidos em português. Os títulos e o resumo em linguagem simples servem só para facilitar a leitura.</I>

      <h2>23. Contato</h2>
      <I n="23.1">Responsável: {SITE.autor}. E-mail: {contato}. Canal de suporte, relatos e pedidos sobre dados: <a href={href('/contato')}>página de contato</a>.</I>

      <div className="linha linha--empilha-celular">
        <a className="botao botao--principal" href={href('/treinar')}>Voltar a estudar</a>
        <a className="botao" href={href('/condicoes-assinatura')}>Condições da Assinatura</a>
        <a className="botao" href={href('/conta')}>Minha conta</a>
      </div>
    </article>
  )
}
