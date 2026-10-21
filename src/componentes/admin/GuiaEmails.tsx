/**
 * E-mails › Enviar e-mails (21/10/2026, pedido do Tales: juntar "Lembretes" e "Cartas pessoais",
 * que pareciam dois sistemas). O topo da página explica os dois jeitos de mandar, leva a cada
 * parte e diz as travas que valem para todos, para não virar spam.
 */
export function GuiaEmails() {
  return <section className="adm-secao empilha adm-guia-emails" aria-labelledby="adm-guia-emails">
    <div>
      <h2 id="adm-guia-emails">Enviar e-mails</h2>
      <p>Tudo o que sai por e-mail num lugar só. Há dois jeitos de mandar para um grupo:</p>
    </div>
    <ul className="adm-guia-emails__lista">
      <li><a href="#adm-titulo-lembretes"><strong>Lembretes</strong></a>: texto pronto por campanha (primeira missão, fogueira apagando, retomar a jornada e Pix), um botão por campanha.</li>
      <li><a href="#cl-titulo"><strong>Cartas pessoais</strong></a>: uma carta escrita para cada pessoa, por grupo de questões feitas, com prévia, edição e seleção de quem recebe.</li>
      <li>Também aqui: o <a href="#adm-titulo-relatorio">relatório do mês</a>, o resumo quinzenal e os <a href="#adm-titulo-emails">e-mails automáticos e os últimos envios</a>.</li>
    </ul>
    <p className="adm-nota"><strong>Contra o spam, valem para tudo:</strong> quem acabou de receber sai da lista na hora; o servidor segura quem recebeu qualquer e-mail nas últimas 48 horas ou 3 em 14 dias (menos os avisos de pagamento); e cada lembrete sai uma vez por ausência. Alguns grupos se cruzam: "Primeira missão" e a carta "Criou e não começou" falam com as mesmas pessoas, assim como "Retomar a jornada" e "Sumiu". Use um ou outro.</p>
  </section>
}
