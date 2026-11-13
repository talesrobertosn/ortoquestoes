import { useMemo } from "react";
import { usarArmazenado } from "../../estado/usarArmazenado";
import { revisarHoje } from "../../estado/revisao";
import { FLASHCARDS_LIBERADO } from "../../config";
import {
  CHAVE_REGISTROS,
  type RegistroFlashcard,
} from "../../flashcards/progresso";
import { minutosPara } from "../../estado/metasRevisao";
import { href } from "../../util/rotas";
import { Icone } from "../Icone";
import { Medalha } from "../Medalha";
import { usarConquistas } from "../../estado/usarConquistas";
import {
  EMBLEMAS,
  desbloqueado,
  valorDe,
  type FamiliaId,
} from "../../estado/conquistas";
export function FlashcardsDeHoje() {
  const [registros] = usarArmazenado<
    Record<string, Partial<RegistroFlashcard>>
  >(CHAVE_REGISTROS, {});
  const [escondido, definirEscondido] = usarArmazenado<boolean>(
    "revisao:esconder-flashcards",
    false,
  );
  const hoje = useMemo(
    () => Object.values(registros ?? {}).filter((r) => revisarHoje(r)).length,
    [registros],
  );
  if (!FLASHCARDS_LIBERADO) return null;
  if (escondido)
    return (
      <p className="rvp-fc-oculto">
        <button
          type="button"
          className="rvp-secundario"
          onClick={() => definirEscondido(false)}
        >
          <Icone nome="raio" tamanho={14} /> Mostrar os flashcards de hoje
        </button>
      </p>
    );
  const destino = hoje
    ? "/flashcards/biblioteca?categoria=pendentes&n=" + Math.min(hoje, 50)
    : "/flashcards";
  return (
    <section className="rvp-fc" aria-label="Flashcards de hoje">
      <span className="rvp-fc__icone">
        <Icone nome="raio" tamanho={22} />
      </span>
      <div className="rvp-fc__texto">
        <p className="rvp-fc__titulo">
          Flashcards de hoje <span className="selo-beta">Beta</span>
        </p>
        <p>
          {hoje ? (
            <>
              <b className="numerico">{hoje}</b>{" "}
              {hoje === 1 ? "flashcard vence" : "flashcards vencem"} hoje · ~
              {minutosPara(Math.ceil(hoje / 2))} min. A fila deles é separada da
              das questões.
            </>
          ) : (
            "Nenhum flashcard vence hoje. A fila deles é separada da das questões."
          )}
        </p>
      </div>
      <div className="rvp-fc__acoes">
        <a className="rvp-secundario" href={href(destino)}>
          {hoje ? "Revisar flashcards" : "Abrir Flashcards"}
        </a>
        <button
          type="button"
          className="rvp-secundario rvp-pequeno"
          onClick={() => definirEscondido(true)}
          aria-label="Esconder os flashcards desta página"
          title="Esconder"
        >
          <Icone nome="fechar" tamanho={16} />
        </button>
      </div>
    </section>
  );
}

export function ConquistasRevisao() {
  const { metricas } = usarConquistas();
  const familias: Array<{ familia: FamiliaId; titulo: string }> = [
    { familia: "constancia", titulo: "Constância" },
    { familia: "revisoes", titulo: "Revisões feitas" },
    { familia: "resgate", titulo: "Resgate de atrasadas" },
    { familia: "filaZerada", titulo: "Fila zerada" },
  ];
  return (
    <div className="rvp-folha rvp-conquistas">
      <header>
        <p className="rvp-selo">
          <Icone nome="trofeu" tamanho={14} /> CONQUISTAS
        </p>
        <h2>Cada revisão conta</h2>
        <p>Pequenos passos também constroem uma história.</p>
      </header>
      <ul className="rvp-conquistas__lista">
        {familias.map(({ familia, titulo }) => {
          const lista = EMBLEMAS.filter((e) => e.familia === familia),
            proxima = lista.find((e) => !desbloqueado(e, metricas)),
            alvo = proxima ?? lista[lista.length - 1];
          if (!alvo) return null;
          const valor = Math.min(valorDe(alvo, metricas), alvo.minimo);
          return (
            <li key={familia}>
              <Medalha conquista={alvo} tamanho={52} />
              <div>
                <small>{titulo}</small>
                <strong>{alvo.rotulo}</strong>
                <span>{alvo.descricao}</span>
                {!proxima && <b>Família completa</b>}
                <progress
                  value={valor}
                  max={alvo.minimo}
                  aria-label={alvo.rotulo}
                />
                <small>
                  {valor.toLocaleString("pt-BR")} /{" "}
                  {alvo.minimo.toLocaleString("pt-BR")}
                </small>
              </div>
            </li>
          );
        })}
      </ul>
      <a className="rvp-secundario" href={href("/conquistas")}>
        Ver todas as conquistas
      </a>
    </div>
  );
}
