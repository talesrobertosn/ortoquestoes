import type { EstadoSessao } from "../../dados/tipos";
import type { RegistroQuestao } from "../../estado/revisao";
import { dominada } from "../../estado/revisao";
import { href } from "../../util/rotas";
import { FUSO_DIA } from "../../util/dia";
import "./ResultadoRevisao.css";
export function ResultadoRevisao({
  sessao,
  registros,
}: {
  sessao: EstadoSessao;
  registros: Record<string, RegistroQuestao>;
}) {
  if (!sessao.revisao) return null;
  const es = Object.entries(sessao.respostas).filter(
    ([, r]) => !r.outroAparelho,
  );
  const recuperadas = es.filter(
    ([id, r]) => r.correta && sessao.revisao!.antes[id]?.c === false,
  ).length;
  const avancaram = es.filter(
    ([id, r]) =>
      r.correta &&
      (registros[id]?.sequencia ?? 0) >
        (sessao.revisao!.antes[id]?.sequencia ?? 0),
  ).length;
  const completas = es.filter(
    ([id, r]) => r.correta && dominada(registros[id]),
  ).length;
  const errosSeguros = es.filter(
    ([, r]) => r.correta === false && r.confianca === "seguro",
  ).length;
  const proximas = es.filter(([id]) => registros[id]?.proximaRevisao != null);
  const reaprendizado = es.filter(
    ([id]) => sessao.criadaEm - (sessao.revisao!.antes[id]?.q ?? 0) < 86400000,
  ).length;
  return (
    <section className="rrv" aria-labelledby="rrv-titulo">
      <p className="rrv__selo">SEU PASSO ESTÁ REGISTRADO</p>
      <h2 id="rrv-titulo">O que mudou com esta revisão</h2>
      <dl>
        {[
          [es.length, "Questões revisadas"],
          [recuperadas, "Erros acertados agora"],
          [avancaram, "Avançaram de etapa"],
          [completas, "Ciclos completos"],
        ].map(([v, t]) => (
          <div key={t}>
            <dt>{t}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p>
        {reaprendizado > 0
          ? `${reaprendizado} questões foram reencontradas em menos de um dia: isso é reaprendizado. Uma revisão posterior ajuda a confirmar a retenção.`
          : "O resultado foi guardado e os próximos intervalos foram atualizados."}{" "}
        {errosSeguros > 0
          ? `${errosSeguros} ${errosSeguros === 1 ? "erro foi marcado" : "erros foram marcados"} com certeza; vale conferir ${errosSeguros === 1 ? "esse raciocínio" : "esses raciocínios"}.`
          : ""}
      </p>
      {proximas.length > 0 && (
        <details>
          <summary>Ver os próximos agendamentos</summary>
          <ul>
            {proximas.map(([id, r]) => (
              <li key={id}>
                <a href={href("/questao/" + id)}>{id}</a>
                <span>
                  {r.correta === false
                    ? "Elegível hoje · reservado conforme seu ritmo"
                    : new Date(
                        registros[id].proximaRevisao!,
                      ).toLocaleDateString("pt-BR", { timeZone: FUSO_DIA })}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <a className="botao" href={href("/revisao")}>
        Voltar à revisão · você pode encerrar por hoje
      </a>
    </section>
  );
}
