import { SITE } from '../config'
import { href } from '../util/rotas'
import { VERSAO_TERMOS } from '../conta/termos'

export function Termos() {
  return (
    <article className="limite-leitura empilha termos-pagina">
      <header>
        <p className="meta">DOCUMENTO DE ACEITE OBRIGATÓRIO</p>
        <h1>Termos de Uso e Consentimento — {SITE.nome}</h1>
        <p className="texto-2">
          Última atualização: {new Date(VERSAO_TERMOS + 'T12:00:00').toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
          })}
          . Versão do documento: <span className="numerico">{VERSAO_TERMOS}</span>.
        </p>
      </header>

      <p>
        Este documento é um contrato entre você e o {SITE.nome} (a seguir, também chamado de
        &quot;site&quot;, &quot;plataforma&quot; ou &quot;nós&quot;), um projeto pessoal e independente mantido por{' '}
        {SITE.autor}, médico ortopedista. Ele se aplica a qualquer pessoa que acesse o site, crie uma
        conta, responda questões, leia comentários, escreva comentários da comunidade ou use qualquer
        outra funcionalidade disponível, esteja ela logada ou não. Leia com atenção antes de continuar.
        Se você não concorda com qualquer parte deste termo, não crie uma conta e não continue usando o
        site.
      </p>

      <h2>1. Aceite único e vinculante</h2>
      <p>
        Ao marcar a caixa de aceite exibida na tela de consentimento ou no cadastro de conta, você
        declara que leu, entendeu e concorda integralmente com todo o conteúdo deste Termo de Uso e
        Consentimento, sem ressalvas. Esse aceite é registrado uma única vez: se você tiver uma conta,
        ele fica associado a ela e vale em qualquer dispositivo em que você entrar; se você usa o site
        sem conta, ele fica registrado neste navegador. Você não precisará aceitar novamente, a não ser
        que o conteúdo deste documento seja alterado de forma relevante, hipótese em que uma nova tela
        de aceite poderá ser exibida antes de você continuar usando o site, referente apenas à nova
        versão. O uso continuado do site após eventual notificação de alteração relevante, quando essa
        notificação ocorrer por outros meios que não uma nova tela de aceite, também é considerado
        aceite tácito das mudanças.
      </p>
      <p>
        Se você é responsável por outra pessoa que usa este site (por exemplo, um preceptor que
        recomenda o uso a residentes), é sua responsabilidade avisá-la sobre a existência e o conteúdo
        deste termo. O aceite, porém, é sempre individual: cada pessoa que cria uma conta ou usa o site
        deve ler e aceitar este documento por si mesma.
      </p>

      <h2>2. Natureza do site: ferramenta de apoio ao estudo, não um curso, não uma fonte primária</h2>
      <p>
        O {SITE.nome} é um banco de questões de ortopedia e traumatologia voltado a médicos residentes,
        ortopedistas e demais profissionais e estudantes da área da saúde que estudam para provas de
        título de especialista (como TEOT e TARO), provas de acesso à residência médica (como o R4 do
        ENARE), provas de sociedades e de fellowships (como a prova da Sociedade Brasileira de Quadril),
        ou que simplesmente desejam revisar conteúdo de ortopedia por meio de questões objetivas.
      </p>
      <p>
        O site é uma ferramenta de apoio e treino, no formato de perguntas e respostas de múltipla
        escolha, com comentários explicativos. Ele <strong>não é um curso estruturado</strong>, não
        substitui a leitura de livros-texto, artigos científicos, diretrizes de sociedades médicas,
        aulas, preceptoria, estágios práticos ou qualquer outra forma de estudo e formação médica
        continuada. Ele também não é, e não pretende ser, um serviço de ensino formal, credenciado ou
        certificado por qualquer instituição de ensino, conselho profissional ou sociedade médica. Usar
        o {SITE.nome} não gera certificado de conclusão, carga horária, pontuação para títulos ou
        qualquer outro tipo de validação curricular ou profissional.
      </p>

      <h2>3. Cadastro de conta e elegibilidade</h2>
      <p>
        O uso das funcionalidades básicas do site (responder questões e ler comentários) não exige
        conta. Criar uma conta gratuita é opcional e serve para guardar seu progresso, suas revisões,
        suas questões favoritas, suas anotações pessoais e seu histórico de sessões, sincronizando esses
        dados entre diferentes dispositivos.
      </p>
      <p>
        Ao criar uma conta, você declara que: (a) tem capacidade civil plena para celebrar este
        contrato, ou, caso seja menor de idade, obteve autorização de seu responsável legal para usar o
        site e criar a conta; (b) as informações fornecidas no cadastro (nome, e-mail, data de
        nascimento, situação profissional, serviço onde atua ou faz residência, e demais campos
        preenchidos) são verdadeiras, completas e atualizadas; (c) é o único responsável por manter a
        confidencialidade da senha de sua conta e por toda atividade realizada nela; (d) manterá apenas
        uma conta pessoal, não compartilhada com terceiros, salvo autorização expressa e escrita
        do {SITE.nome}. O {SITE.nome} não valida ativamente a veracidade das informações de cadastro e
        não se responsabiliza por consequências decorrentes de dados falsos ou incorretos fornecidos
        pelo usuário.
      </p>

      <h2>4. Conteúdo produzido com apoio de Inteligência Artificial: leia com atenção</h2>
      <p>
        Parte relevante do conteúdo do {SITE.nome} — em especial os comentários explicativos que
        acompanham as questões (identificados como &quot;comentário de IA&quot;) — é produzida com o
        apoio de sistemas de inteligência artificial (modelos de linguagem), a partir de livros-texto de
        referência da ortopedia e traumatologia, indicados nas próprias referências de cada comentário
        quando disponíveis. Isso significa que você precisa entender e aceitar, de forma expressa, as
        limitações inerentes a esse tipo de conteúdo:
      </p>
      <ul className="lista">
        <li>
          Sistemas de inteligência artificial podem cometer erros, gerar afirmações incorretas,
          desatualizadas, incompletas, fora de contexto ou simplesmente inventadas (fenômeno
          conhecido como &quot;alucinação&quot;), mesmo quando o texto produzido parece coerente,
          seguro e bem fundamentado. A fluência e a segurança aparente de um texto gerado por IA
          <strong> não são garantia de que o conteúdo esteja correto</strong>.
        </li>
        <li>
          Mesmo quando um comentário de IA está correto, ele é <strong>orientado por livros-texto e
          por conhecimento geral da especialidade</strong>, não é uma fonte primária de conhecimento
          médico, não substitui a leitura direta da bibliografia de referência, de diretrizes
          atualizadas de sociedades médicas (como SBOT e suas subespecialidades) e de artigos
          científicos originais. Um comentário correto hoje pode também ficar desatualizado com o
          tempo, à medida que a literatura médica evolui, sem que o site tenha obrigação ou prazo
          para atualizá-lo.
        </li>
        <li>
          Os comentários podem citar classificações, valores numéricos, ângulos, percentuais,
          eponímias, condutas e algoritmos que exigem verificação cruzada com a literatura
          especializada antes de qualquer uso além do estudo para prova. Diferenças entre autores,
          edições de livros, sociedades e serviços são normais na literatura ortopédica, e um único
          comentário não esgota essas divergências.
        </li>
        <li>
          Quando há dúvida sobre o gabarito de uma questão ou sobre uma afirmação da banca
          examinadora, essa dúvida costuma ser sinalizada explicitamente no próprio comentário — mas a
          ausência dessa sinalização não é garantia de que não exista erro. O usuário deve manter
          sempre um espírito crítico diante de qualquer conteúdo do site, incluindo os comentários sem
          sinalização de dúvida.
        </li>
        <li>
          Comentários eventualmente revisados por profissional médico humano podem ser indicados como
          tal, quando essa revisão existir. A ausência dessa indicação significa que o comentário não
          passou por revisão médica humana específica, tendo sido gerado exclusivamente por sistema de
          inteligência artificial com supervisão editorial geral do projeto, não especializada em cada
          afirmação técnica individual.
        </li>
      </ul>
      <p>
        Ao usar o {SITE.nome}, você concorda que <strong>é sua responsabilidade exclusiva conferir,
        de forma independente, qualquer informação clinicamente relevante</strong> em fontes primárias e
        atualizadas antes de considerá-la válida para qualquer finalidade que não seja o treino para
        provas de múltipla escolha, incluindo, sem se limitar a isso, qualquer decisão relacionada à
        prática clínica, à conduta terapêutica ou ao cuidado de pacientes reais.
      </p>

      <h2>5. Este site não presta assistência médica nem substitui avaliação clínica</h2>
      <p>
        O {SITE.nome} é uma ferramenta de estudo teórico voltada à preparação para provas, e{' '}
        <strong>
          em nenhuma hipótese o conteúdo do site constitui aconselhamento médico, diagnóstico,
          prescrição, indicação de tratamento, opinião técnica sobre caso clínico real ou qualquer outra
          forma de assistência à saúde
        </strong>
        . Nada no site deve ser usado, direta ou indiretamente, como base para decisões sobre o
        diagnóstico, a investigação, o tratamento ou o acompanhamento de qualquer paciente real, seja
        esse paciente do próprio usuário, de terceiros, ou o próprio usuário quando na condição de
        paciente.
      </p>
      <p>
        A avaliação de qualquer paciente real deve sempre ser feita presencialmente (ou por telemedicina
        regulamentada, quando aplicável), por profissional médico habilitado, com exame físico,
        anamnese completa, exames complementares pertinentes e acesso ao histórico clínico do paciente
        — elementos que o {SITE.nome} nunca terá acesso e nunca substitui. Se você é paciente e chegou a
        este site por qualquer motivo, procure atendimento médico presencial para qualquer dúvida de
        saúde; não use o conteúdo deste site para se autodiagnosticar, se automedicar ou adiar a busca
        por atendimento médico adequado.
      </p>
      <p>
        Se você é profissional de saúde ou está em formação, o conteúdo deste site não substitui sua
        formação médica formal, sua residência, sua preceptoria, os protocolos e diretrizes do serviço
        onde você atua, nem o julgamento clínico exigido em cada caso real. Decisões clínicas envolvem
        variáveis que uma questão de múltipla escolha, por definição, simplifica ou não contempla.
      </p>

      <h2>6. Origem e natureza das questões do acervo</h2>
      <p>
        O acervo de questões do {SITE.nome} é heterogêneo quanto à origem, e cada questão indica, quando
        essa informação já estiver disponível, a prova e o ano de origem. De forma geral, o acervo é
        composto por:
      </p>
      <ul className="lista">
        <li>
          <strong>Questões de provas anteriores de TEOT e TARO</strong> (Título de Especialista em
          Ortopedia e Traumatologia e prova de Título de Área de Atuação, respectivamente, da SBOT),
          extraídas de edições anteriores dessas provas. Enquanto a identificação individual de qual
          prova e qual ano cada questão pertence ainda estiver em conferência, essas questões aparecem
          agrupadas de forma genérica como acervo de TEOT/TARO, sem prejuízo de, no futuro, essa
          identificação ser refinada à medida que provas de anos específicos forem incorporadas ao
          processo de conferência do site.
        </li>
        <li>
          <strong>Questões de outras provas de acesso à residência ou de título</strong>, como o R4 do
          ENARE de Ortopedia e Traumatologia, extraídas de edições oficiais dessas provas, com o
          respectivo gabarito oficial e ano de aplicação indicados.
        </li>
        <li>
          <strong>Questões originais elaboradas pelo próprio {SITE.nome}</strong>, inspiradas no padrão,
          no estilo e no grau de dificuldade de provas de sociedades e de fellowships que não têm suas
          questões oficiais disponíveis ao público em geral — por exemplo, a prova da Sociedade
          Brasileira de Quadril (SBQ) para o fellowship de cirurgia do quadril. Nesses casos, o
          enunciado e as alternativas são redigidos de forma própria e original pelo site, a partir de
          conteúdo de livros-texto de referência da subespecialidade (creditados nas referências do
          comentário, quando aplicável) e do conhecimento geral da área — <strong>não são transcrições,
          traduções nem reproduções de nenhuma prova oficial não pública</strong>. Questões com essa
          origem trazem um aviso específico, visível junto ao enunciado, esclarecendo que se trata de
          questão elaborada pelo site e não de uma questão oficial daquela prova.
        </li>
        <li>
          <strong>Simulados</strong>, montados a partir de combinações de questões do acervo (de
          qualquer uma das origens acima), conforme os filtros de assunto, prova, ano e dificuldade
          escolhidos pelo próprio usuário, sem que isso implique que tais combinações correspondam a
          qualquer prova real já aplicada.
        </li>
      </ul>
      <p>
        O site se empenha para que a extração de texto de provas originais (a partir de arquivos em PDF)
        seja fiel ao documento de origem, mas erros de digitalização, truncamento de enunciado, ausência
        de figuras citadas no enunciado, ou divergência de gabarito em relação ao gabarito oficial
        publicado pela banca podem ocorrer. Questões identificadas como anuladas pela própria banca são
        marcadas como tal e não entram no cálculo de desempenho do usuário, mas o site não garante que
        todas as anulações oficiais já tenham sido identificadas e sinalizadas a qualquer momento. Caso
        você identifique qualquer inconsistência, poderá relatá-la pelo canal de{' '}
        <a href={href('/contato')}>relato de erro</a>, mas a existência desse canal não gera qualquer
        obrigação de correção em prazo determinado, nem responsabilidade do site por eventual uso do
        conteúdo antes da correção.
      </p>

      <h2>7. Comentários da comunidade</h2>
      <p>
        Além dos comentários de IA, o site permite que outros usuários (ortopedistas e residentes)
        publiquem comentários próprios em cada questão (&quot;comentário da comunidade&quot;). Esses
        comentários são de inteira responsabilidade de quem os escreve, não passam necessariamente por
        qualquer revisão editorial ou médica do {SITE.nome} antes de ficarem visíveis, e podem conter
        opiniões pessoais, informações desatualizadas, imprecisas ou equivocadas. O {SITE.nome} não
        garante a veracidade, a precisão, a atualidade nem a adequação de nenhum comentário da
        comunidade, e não se responsabiliza por prejuízos decorrentes do uso dessas informações.
      </p>
      <p>
        O {SITE.nome} se reserva o direito de, a seu exclusivo critério e sem necessidade de aviso
        prévio, remover, ocultar, editar ou recusar a publicação de qualquer comentário da comunidade
        que julgue ofensivo, discriminatório, difamatório, ilegal, spam, publicitário indevido, em
        violação de direitos autorais de terceiros, ou de qualquer forma inadequado ao propósito
        educacional do site — sem que isso gere qualquer obrigação de justificativa ou direito a
        indenização para quem o publicou.
      </p>

      <h2>8. Gratuidade atual e possibilidade de cobrança futura</h2>
      <p>
        Nesta data, o {SITE.nome} é <strong>gratuito</strong> e não possui limite diário de uso do
        acervo. Isso é uma opção do momento atual do projeto, e não uma promessa de gratuidade
        permanente. O {SITE.nome} se reserva o direito de, no futuro, adotar modelos de cobrança total
        ou parcial pelo uso do site ou de funcionalidades específicas — por exemplo, uma assinatura paga
        para acesso a todo o acervo, mantendo, se assim decidir, algum nível de uso gratuito diário. Caso
        isso ocorra, o {SITE.nome} pretende comunicar a mudança com antecedência razoável através do
        próprio site, mas a ausência dessa comunicação prévia, por qualquer motivo, não gera direito a
        indenização, manutenção de gratuidade ou qualquer outra compensação ao usuário. Funcionalidades
        gratuitas hoje podem se tornar pagas, ser modificadas ou ser descontinuadas a qualquer momento, a
        critério exclusivo do {SITE.nome}, sem necessidade de justificativa.
      </p>
      <p>
        Você concorda que o uso gratuito atual do site não gera nenhuma expectativa legítima de
        gratuidade futura, nenhum direito adquirido sobre qualquer funcionalidade específica, e nenhuma
        obrigação, para o {SITE.nome}, de manter no plano gratuito qualquer questão, comentário,
        funcionalidade de sincronização, revisão espaçada ou qualquer outro recurso hoje disponível sem
        custo.
      </p>

      <h2>9. Propriedade intelectual</h2>
      <p>
        O código-fonte, o layout, a identidade visual, os textos originais (incluindo os comentários de
        IA e as questões originais descritas no item 6) e a organização do acervo do {SITE.nome} são de
        titularidade do projeto e/ou de seu autor, protegidos pela legislação brasileira de direitos
        autorais e de propriedade intelectual aplicável. Questões extraídas de provas de terceiros
        (TEOT, TARO, ENARE e outras) pertencem a seus respectivos titulares (bancas examinadoras,
        sociedades médicas, instituições organizadoras), e sua disponibilização neste site tem finalidade
        exclusivamente educacional e não comercial de referência a provas já divulgadas ou aplicadas.
      </p>
      <p>
        É concedida ao usuário uma licença pessoal, limitada, não exclusiva, não transferível e
        revogável para acessar e usar o conteúdo do site exclusivamente para fins de estudo pessoal. É
        vedado, sem autorização prévia e por escrito do {SITE.nome}: copiar, reproduzir, redistribuir,
        publicar, vender, sublicenciar ou de qualquer forma disponibilizar publicamente o acervo de
        questões e comentários (integral ou parcialmente, inclusive por meio de raspagem automatizada de
        dados, ou &quot;scraping&quot;), com finalidade comercial ou não; usar o conteúdo para treinar,
        ajustar (fine-tuning) ou alimentar outros sistemas de inteligência artificial; e remover ou
        alterar avisos de autoria, de origem ou de licença presentes no conteúdo.
      </p>

      <h2>10. Conduta do usuário e uso aceitável</h2>
      <p>Ao usar o {SITE.nome}, você se compromete a:</p>
      <ul className="lista">
        <li>Usar o site de boa-fé, com consciência e responsabilidade, para fins de estudo pessoal;</li>
        <li>
          Não tentar acessar, de forma não autorizada, dados de outros usuários, áreas restritas do
          sistema, ou a infraestrutura do site e de seus provedores (incluindo o banco de dados
          utilizado para autenticação e sincronização);
        </li>
        <li>
          Não utilizar bots, scripts automatizados, engenharia reversa ou qualquer outro meio técnico
          para extrair em massa o conteúdo do acervo, sobrecarregar a infraestrutura do site ou burlar
          eventuais limites de uso;
        </li>
        <li>
          Não publicar, no espaço de comentários da comunidade ou em qualquer canal de contato do site,
          conteúdo ilegal, ofensivo, discriminatório, difamatório, ou que viole direitos de terceiros;
        </li>
        <li>
          Não se passar por outra pessoa, instituição ou banca examinadora, nem atribuir falsamente a
          si mesmo qualificações profissionais que não possui;
        </li>
        <li>
          Não repassar as credenciais de acesso da sua conta a terceiros, nem usar a conta de outra
          pessoa sem autorização.
        </li>
      </ul>
      <p>
        O descumprimento de qualquer item deste tópico autoriza o {SITE.nome} a suspender ou encerrar o
        acesso do usuário à sua conta, nos termos do item 15 abaixo, sem prejuízo de outras medidas
        cabíveis previstas em lei.
      </p>

      <h2>11. Privacidade e proteção de dados pessoais</h2>
      <p>
        O tratamento de dados pessoais realizado pelo {SITE.nome} segue a Lei Geral de Proteção de
        Dados Pessoais (Lei nº 13.709/2018 — LGPD). Coletamos apenas os dados necessários para o
        funcionamento da conta e da sincronização de progresso: e-mail, senha (armazenada de forma
        criptografada pelo provedor de autenticação, nunca em texto simples e nunca acessível ao
        {SITE.nome}), nome, sobrenome, data de nascimento, situação profissional, serviço onde atua ou
        faz residência, e, quando informados voluntariamente, WhatsApp, cidade e UF. Também são
        armazenados, associados à conta, os dados de uso do próprio site necessários ao seu
        funcionamento: respostas dadas às questões, revisões programadas, questões favoritadas,
        anotações pessoais e histórico de sessões de estudo.
      </p>
      <p>
        Esses dados são usados exclusivamente para viabilizar o funcionamento do site (autenticação,
        sincronização entre dispositivos, cálculo de desempenho e de revisão espaçada) e, quando o
        usuário optar expressamente por receber novidades, para contato sobre atualizações do projeto.
        Não vendemos dados pessoais a terceiros. O armazenamento é realizado por meio do provedor de
        infraestrutura Supabase, com controle de acesso restrito ao titular de cada conta por meio de
        políticas de segurança em nível de linha (row level security).
      </p>
      <p>
        Você pode, a qualquer momento: exportar um backup dos seus dados de progresso, na página de{' '}
        <a href={href('/dados')}>dados locais</a>; solicitar a correção de dados de perfil incorretos,
        editando-os diretamente na página de <a href={href('/conta')}>conta</a>; solicitar a exclusão
        da sua conta e dos dados pessoais associados a ela, pelo canal de{' '}
        <a href={href('/contato?assunto=exclusao-conta')}>solicitação de exclusão</a>, observado o prazo
        técnico necessário para processar o pedido e eventuais obrigações legais de retenção de dados,
        quando aplicáveis.
      </p>

      <h2>12. Disponibilidade, alterações e interrupções do serviço</h2>
      <p>
        O {SITE.nome} é mantido como projeto pessoal e independente, sem qualquer garantia contratual de
        disponibilidade contínua, ininterrupta ou livre de erros. O site pode ficar temporariamente
        indisponível para manutenção, por falhas de infraestrutura própria ou de terceiros (incluindo o
        provedor de hospedagem e o provedor de autenticação e banco de dados), ou por qualquer outro
        motivo técnico, sem aviso prévio. O {SITE.nome} também se reserva o direito de modificar,
        suspender ou descontinuar, total ou parcialmente, o site ou qualquer de suas funcionalidades a
        qualquer momento, com ou sem aviso prévio, sem que isso gere direito a indenização.
      </p>

      <h2>13. Isenção e limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida pela legislação aplicável, o {SITE.nome}, seu autor e eventuais
        colaboradores <strong>não se responsabilizam</strong> por:
      </p>
      <ul className="lista">
        <li>
          Qualquer decisão, ação ou omissão tomada pelo usuário com base no conteúdo do site, incluindo
          decisões relacionadas a provas, concursos, avaliações profissionais ou à prática clínica;
        </li>
        <li>
          Reprovação em provas, concursos ou avaliações de qualquer natureza, ainda que o usuário tenha
          utilizado o site como ferramenta de estudo, uma vez que o desempenho em qualquer avaliação
          depende de inúmeros fatores fora do controle e da influência do site;
        </li>
        <li>
          Danos diretos, indiretos, incidentais, consequenciais, punitivos ou de qualquer outra
          natureza, incluindo lucros cessantes, perda de oportunidade, dano moral ou dano à imagem,
          decorrentes do uso ou da impossibilidade de uso do site, do conteúdo nele disponibilizado, ou
          de comentários de outros usuários;
        </li>
        <li>
          Erros, imprecisões, omissões ou desatualizações em qualquer conteúdo do site, incluindo
          questões, gabaritos, comentários de IA e comentários da comunidade;
        </li>
        <li>
          Indisponibilidade, interrupção, perda de dados ou mau funcionamento do site, ainda que
          decorrentes de falha do próprio {SITE.nome} ou de seus provedores de infraestrutura;
        </li>
        <li>
          Consequências do uso do conteúdo do site fora de seu propósito declarado de apoio ao estudo
          teórico para provas, incluindo, sem se limitar a isso, qualquer uso relacionado à assistência
          a pacientes reais.
        </li>
      </ul>
      <p>
        O site é fornecido &quot;no estado em que se encontra&quot; (&quot;as is&quot;) e &quot;conforme
        disponibilidade&quot; (&quot;as available&quot;), sem garantias de qualquer tipo, expressas ou
        implícitas, incluindo garantias de adequação a uma finalidade específica, de precisão, de
        completude ou de atualidade do conteúdo. Nada neste termo pretende excluir ou limitar
        responsabilidades que não possam ser validamente excluídas ou limitadas pela legislação
        brasileira aplicável, como os casos de dolo ou culpa grave comprovados; nesses limites em que a
        exclusão não for possível, a responsabilidade do {SITE.nome}, quando reconhecida, ficará
        limitada, no que a lei permitir, ao valor eventualmente pago pelo usuário ao site nos doze meses
        anteriores ao fato gerador — o que, no modelo gratuito atual, corresponde a zero.
      </p>

      <h2>14. Indenização</h2>
      <p>
        Você concorda em defender, indenizar e isentar de responsabilidade o {SITE.nome}, seu autor e
        eventuais colaboradores, de e contra qualquer reclamação, dano, obrigação, perda, prejuízo,
        custo ou despesa (incluindo honorários advocatícios razoáveis) decorrente de: (a) seu uso do
        site em desacordo com este termo; (b) sua violação de qualquer lei ou direito de terceiros; (c)
        conteúdo que você tenha publicado no espaço de comentários da comunidade; ou (d) qualquer decisão
        clínica ou profissional tomada com base no conteúdo do site, em desacordo com as ressalvas
        expressas neste documento.
      </p>

      <h2>15. Suspensão e encerramento de conta</h2>
      <p>
        O {SITE.nome} pode suspender ou encerrar, a qualquer momento e a seu critério, o acesso de
        qualquer usuário que descumpra este termo, sem necessidade de aviso prévio, sem prejuízo de
        outras medidas cabíveis. O usuário também pode solicitar o encerramento da própria conta a
        qualquer momento, pelo canal de <a href={href('/contato?assunto=exclusao-conta')}>solicitação de
        exclusão</a>. O encerramento da conta não desobriga o usuário de responsabilidades já
        constituídas antes do encerramento.
      </p>

      <h2>16. Alterações deste termo</h2>
      <p>
        Este Termo de Uso e Consentimento pode ser alterado a qualquer momento, para refletir mudanças
        no site, na legislação aplicável ou nas práticas do projeto. Alterações relevantes serão
        identificadas por uma nova versão (indicada no topo deste documento) e, quando isso ocorrer, uma
        nova tela de aceite poderá ser exibida antes de você continuar usando o site normalmente. O
        histórico de qual versão você aceitou e quando fica registrado, quando você possui conta, junto
        aos dados da sua conta.
      </p>

      <h2>17. Legislação aplicável e foro</h2>
      <p>
        Este termo é regido pelas leis da República Federativa do Brasil. Fica eleito o foro do
        domicílio do usuário, quando este for consumidor nos termos da legislação consumerista
        brasileira, para dirimir quaisquer controvérsias decorrentes deste termo, sem prejuízo de a
        parte interessada optar por outro foro em que a lei lhe garanta esse direito.
      </p>

      <h2>18. Disposições gerais</h2>
      <p>
        Se qualquer disposição deste termo for considerada inválida ou inexequível por autoridade
        competente, as demais disposições permanecerão em pleno vigor e efeito. A tolerância do{' '}
        {SITE.nome} quanto ao eventual descumprimento de qualquer cláusula deste termo não implica
        renúncia ao direito de exigi-la no futuro. Este termo constitui o entendimento integral entre
        você e o {SITE.nome} quanto ao seu objeto, substituindo entendimentos anteriores, orais ou
        escritos, sobre a mesma matéria.
      </p>

      <h2>19. Resumo em linguagem direta</h2>
      <p className="texto-2">
        Este resumo não substitui a leitura do termo completo acima, mas ajuda a fixar os pontos mais
        importantes: o site é gratuito hoje, mas pode ficar pago no futuro; os comentários de IA podem
        errar e são baseados em livros, não são a própria fonte; nada aqui substitui estudar pelos livros
        de verdade nem serve de orientação médica para pacientes reais; o acervo mistura questões
        antigas de prova (TEOT/TARO/ENARE), simulados e questões próprias inspiradas em provas
        fechadas ao público (como a da SBQ), sempre identificadas quando é o caso; use o site com
        consciência, senso crítico e responsabilidade.
      </p>

      <h2>20. Contato</h2>
      <p>
        Dúvidas sobre este termo, solicitações relacionadas a dados pessoais ou qualquer outra questão
        podem ser encaminhadas pelo canal de <a href={href('/contato')}>relato e contato</a> do site, ou
        diretamente para <a href={`mailto:${SITE.contato}`}>{SITE.contato}</a>.
      </p>

      <div className="linha linha--empilha-celular">
        <a className="botao botao--principal" href={href('/treinar')}>
          Voltar a estudar
        </a>
        <a className="botao" href={href('/conta')}>
          Minha conta
        </a>
      </div>
    </article>
  )
}
