import { useState } from 'react'
import { SITE } from '../config'
import { VERSAO_TERMOS } from '../estado/termos'
import { href } from '../util/rotas'

export function Termos({ obrigatorio = false, aoAceitar }: { obrigatorio?: boolean; aoAceitar?: () => void }) {
  const [confirmouLeitura, definirConfirmouLeitura] = useState(false)
  const [confirmouResponsabilidade, definirConfirmouResponsabilidade] = useState(false)

  return (
    <article className="termos limite-leitura">
      <header className="termos__cabecalho">
        <p className="sobretitulo">VERSÃO {VERSAO_TERMOS}</p>
        <h1>Termos de Uso, Consentimento e Aviso Educacional</h1>
        <p className="termos__resumo">
          Leia antes de usar o OrtoQuestões. Este é um recurso educacional, não um serviço de
          assistência médica, diagnóstico, prescrição ou orientação para casos reais.
        </p>
      </header>

      {obrigatorio && (
        <div className="termos__destaque" role="note">
          <strong>Antes da primeira sessão</strong>
          <p>Precisamos registrar neste navegador que você leu e aceitou estes termos.</p>
        </div>
      )}

      <nav className="termos__indice" aria-label="Nesta página">
        <strong>Nesta página</strong>
        <a href="#finalidade">Finalidade</a>
        <a href="#conteudo">Origem e IA</a>
        <a href="#saude">Saúde e vida real</a>
        <a href="#responsabilidade">Responsabilidades</a>
        <a href="#gratuidade">Gratuidade e mudanças</a>
        <a href="#dados">Dados e privacidade</a>
        <a href="#direitos">Direitos e contato</a>
      </nav>

      <section id="finalidade">
        <h2>1. Aceitação e finalidade do serviço</h2>
        <p>
          Ao marcar as confirmações e selecionar “Aceitar e continuar”, você declara que leu,
          compreendeu e concorda com estes Termos. Uma eventual criação de conta também exigirá
          concordância expressa com a versão então vigente. Apenas visitar esta página não registra
          aceite. Se não concordar, não inicie sessões nem utilize o conteúdo educacional.
        </p>
        <p>
          O OrtoQuestões é uma ferramenta complementar de estudo de ortopedia e traumatologia.
          Seu objetivo é auxiliar revisão, treinamento para provas e discussão acadêmica. O site
          não é curso oficial, instituição de ensino, banca examinadora, sociedade médica,
          prontuário, telemedicina, consulta, segunda opinião ou serviço de urgência.
        </p>
        <p>
          O uso é destinado a pessoas capazes de avaliar criticamente material técnico. Menores de
          18 anos somente devem utilizar o serviço com ciência e autorização de responsável legal.
        </p>
      </section>

      <section id="conteudo">
        <h2>2. Origem, classificação e autoria do conteúdo</h2>
        <p>
          O acervo reúne transcrições e adaptações de questões antigas atribuídas a provas como
          TEOT, TARO, concursos e outras avaliações da especialidade, além de simulados, questões
          autorais e questões elaboradas ou transformadas com apoio de inteligência artificial.
          Nem toda questão tem prova, ano ou autoria individual identificados e conferidos.
        </p>
        <p>
          Nomes de provas, instituições, sociedades, livros e autores são usados apenas para
          identificação, referência ou contextualização. O OrtoQuestões não declara vínculo,
          patrocínio, endosso ou aprovação por essas entidades. Gabaritos podem refletir a resposta
          divulgada na fonte histórica, inclusive quando práticas ou evidências posteriores mudaram.
        </p>
        <p>
          Enunciados podem conter erros presentes na fonte e também falhas de digitalização,
          transcrição, classificação, imagem, legenda, gabarito ou referência. Questões podem ser
          corrigidas, substituídas, reclassificadas ou removidas quando uma inconsistência for
          identificada.
        </p>

        <h3>Conteúdo produzido com apoio de inteligência artificial</h3>
        <p>
          Parte das questões, comentários, explicações, resumos, classificações ou referências pode
          ter sido produzida, revisada ou organizada com apoio de IA. Sistemas de IA podem inventar
          informações, confundir recomendações, citar referências inadequadas, omitir exceções e
          produzir textos convincentes mesmo quando estão incorretos.
        </p>
        <p>
          Os comentários são produzidos com apoio de IA e publicados com referências quando elas
          estão disponíveis. Quando houver revisão médica, ela será indicada explicitamente. A
          ausência dessa indicação significa que você deve considerar o conteúdo não revisado por
          médico. Mesmo um conteúdo marcado como revisado pode conter erro, ficar desatualizado ou
          não se aplicar a uma prova, serviço, paciente ou circunstância específica.
        </p>
      </section>

      <section id="saude">
        <h2>3. Não substitui livros, formação ou avaliação médica</h2>
        <p>
          O conteúdo deve ser usado como auxílio de estudo e ponto de partida para conferência.
          Ele não substitui livros-texto, artigos científicos, protocolos oficiais, aulas,
          treinamento supervisionado, discussão com preceptores, julgamento clínico ou educação
          médica continuada. Mesmo quando a explicação parecer correta, recomenda-se confirmá-la em
          fontes primárias e atualizadas.
        </p>
        <p>
          Nada no site deve ser interpretado como diagnóstico, prescrição, definição de conduta,
          indicação ou contraindicação cirúrgica, cálculo de dose, orientação de reabilitação,
          previsão de prognóstico ou recomendação para um paciente real. Casos reais dependem de
          história, exame físico, imagens, exames complementares, contexto, recursos disponíveis,
          preferências do paciente e avaliação por profissional legalmente habilitado.
        </p>
        <p>
          Não use o OrtoQuestões para decidir atendimento de urgência ou emergência. Diante de
          sintomas, trauma, risco imediato ou dúvida assistencial, procure o serviço de saúde
          apropriado. Pacientes não devem iniciar, interromper ou alterar tratamento com base neste
          site e devem consultar seu médico ou outro profissional habilitado.
        </p>
      </section>

      <section id="responsabilidade">
        <h2>4. Uso consciente e responsabilidade do usuário</h2>
        <p>Ao utilizar o serviço, você se compromete a:</p>
        <ul className="lista">
          <li>avaliar criticamente toda resposta e conferir informações relevantes em fontes confiáveis;</li>
          <li>não aplicar o conteúdo automaticamente a pacientes, provas atuais ou decisões profissionais;</li>
          <li>não inserir nomes, imagens identificáveis, prontuários ou outros dados de pacientes nas anotações ou contribuições;</li>
          <li>não usar o site para fraude acadêmica, violação de sigilo, atividade ilegal ou violação de direitos de terceiros;</li>
          <li>relatar erros de boa-fé e não apresentar conteúdo do site como orientação oficial de banca ou entidade médica;</li>
          <li>manter cópia própria dos dados que considere importantes e proteger o acesso ao seu aparelho.</li>
        </ul>
        <p>
          Seu desempenho, classificação de domínio, fila de revisão, cronômetro e estatísticas são
          estimativas educacionais. Eles não certificam competência, aprovação, especialidade ou
          aptidão para exercer qualquer procedimento.
        </p>

        <h3>Disponibilidade e limitações</h3>
        <p>
          O serviço é fornecido no estado em que se encontra e pode sofrer interrupções, perda de
          dados locais, incompatibilidades, erros ou mudanças. Não há promessa de disponibilidade
          contínua, cobertura integral do conteúdo programático, atualização imediata ou aprovação
          em prova. Na máxima extensão permitida pela legislação aplicável, o responsável pelo site
          não responde por decisões tomadas exclusivamente com base no conteúdo, perda de progresso
          local ou danos decorrentes de uso contrário a estes avisos.
        </p>
        <p>
          Esta cláusula não elimina direitos ou responsabilidades que a lei não permita excluir e
          não limita responsabilidade em hipóteses de dolo, fraude ou outras situações legalmente
          irrenunciáveis.
        </p>
      </section>

      <section id="gratuidade">
        <h2>5. Gratuidade atual, recursos pagos e alterações futuras</h2>
        <p>
          Na presente versão, o acesso disponibilizado pelo site é gratuito. Gratuidade atual não
          constitui promessa de gratuidade permanente. No futuro, parte do serviço poderá exigir
          cadastro, assinatura, pagamento único, limite diário ou plano específico para custear
          hospedagem, revisão, desenvolvimento e manutenção.
        </p>
        <p>
          Uma futura cobrança será informada antes da contratação, com preço, periodicidade,
          recursos incluídos, forma de cancelamento e demais condições aplicáveis. Nenhuma cobrança
          será criada apenas por você ter aceitado estes termos ou utilizado a versão gratuita.
          Recursos adquiridos futuramente poderão ter termos comerciais próprios.
        </p>
        <p>
          Os planos previstos são mensal por R$ 39,90, semestral por R$ 179,90 e anual por
          R$ 239,90, todos com renovação automática na periodicidade escolhida. Antes da confirmação,
          o checkout deverá informar valor, periodicidade e próxima cobrança. O cancelamento poderá
          ser solicitado por botão, sem justificativa: fora da garantia, interrompe cobranças futuras
          e preserva o acesso até o fim do período pago.
        </p>
        <p>
          Há garantia de reembolso integral até sete dias após cada cobrança. O reembolso também
          cancela cobranças futuras e devolve imediatamente a conta ao limite gratuito. Depois de
          sete dias, o cancelamento não gera reembolso proporcional. Falha de pagamento, vencimento
          ou término do acesso pago não apagam histórico, favoritas, revisões ou anotações.
        </p>
        <p>
          Funcionalidades, limites, acervo e estes Termos podem mudar. Alterações relevantes serão
          apresentadas para nova concordância. A versão e a data ficam registradas no início desta
          página.
        </p>
      </section>

      <section id="dados">
        <h2>6. Dados locais, privacidade e serviços de terceiros</h2>
        <p>
          Atualmente, respostas, favoritas, notas, histórico e aceite são guardados principalmente
          no armazenamento local do navegador. Quem tiver acesso ao seu navegador ou ao arquivo de
          backup poderá visualizar esses dados. Limpar dados, trocar de aparelho, usar modo privado
          ou falhas do navegador pode apagá-los.
        </p>
        <p>
          Não escreva dados pessoais sensíveis de pacientes nas notas. Caso envie comentário ou
          relato por e-mail ou rede social, os dados fornecidos serão tratados para analisar a
          mensagem, responder e, mediante contexto e autorização apropriados, creditar uma
          contribuição. Serviços de hospedagem, e-mail, redes sociais e links externos têm suas
          próprias políticas e podem registrar dados técnicos como endereço IP e horários de acesso.
        </p>
        <p>
          Se contas e sincronização forem oferecidas futuramente, uma política de privacidade
          específica informará os dados coletados, finalidades, bases legais, retenção, operadores e
          direitos antes do cadastro. Não haverá cobrança ou criação automática de conta por causa
          deste aceite local.
        </p>
      </section>

      <section id="direitos">
        <h2>7. Propriedade intelectual, relatos, legislação e contato</h2>
        <p>
          A marca, o código, a organização editorial e os textos próprios são protegidos conforme a
          legislação aplicável. Questões e materiais de terceiros permanecem sujeitos aos direitos
          de seus respectivos titulares. O acesso ao site não concede autorização para republicar,
          vender, extrair em massa ou criar outro banco comercial a partir do acervo.
        </p>
        <p>
          Ao enviar uma contribuição, você declara ter direito de compartilhá-la e autoriza sua
          reprodução, adaptação editorial e publicação gratuita no OrtoQuestões com os créditos
          combinados. Não envie material sigiloso, imagem identificável de paciente ou cópia extensa
          de obra protegida sem autorização.
        </p>
        <p>
          Dúvidas, solicitações relativas a dados, alegações de direito autoral e relatos de erro
          podem ser enviados para <a href={`mailto:${SITE.contato}`}>{SITE.contato}</a>. Estes Termos
          são interpretados segundo a legislação brasileira, preservados os direitos e foros
          obrigatórios previstos em lei.
        </p>
      </section>

      {obrigatorio ? (
        <section className="termos__aceite" aria-labelledby="titulo-aceite">
          <h2 id="titulo-aceite">Confirme para continuar</h2>
          <label className="caixa">
            <input type="checkbox" checked={confirmouLeitura} onChange={(e) => definirConfirmouLeitura(e.target.checked)} />
            <span>Li e concordo com os Termos de Uso, Consentimento e Aviso Educacional.</span>
          </label>
          <label className="caixa">
            <input type="checkbox" checked={confirmouResponsabilidade} onChange={(e) => definirConfirmouResponsabilidade(e.target.checked)} />
            <span>Entendo que o conteúdo, inclusive o produzido com IA, pode conter erros e não substitui livros, formação, julgamento profissional ou avaliação médica.</span>
          </label>
          <button className="botao botao--principal botao--grande" type="button" disabled={!confirmouLeitura || !confirmouResponsabilidade} onClick={aoAceitar}>
            Aceitar e continuar
          </button>
        </section>
      ) : (
        <div className="linha">
          <a className="botao botao--principal" href={href('/treinar')}>Voltar a estudar</a>
        </div>
      )}
    </article>
  )
}
