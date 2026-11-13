import { useEffect, useRef, useState } from "react";
import type { Indice } from "../../dados/tipos";
import {
  motivoRevisao,
  type RegistrosRevisao,
} from "../../dados/revisoesPainel";
import { Icone } from "../Icone";
export function PreviaRevisao({
  ids,
  titulo,
  indice,
  registros,
  minutos,
  lembrar,
  aoLembrar,
  aoFechar,
  aoComecar,
  restantes,
}: {
  ids: string[];
  titulo: string;
  indice: Indice;
  registros: RegistrosRevisao;
  minutos: number;
  lembrar: boolean;
  aoLembrar: (v: boolean) => void;
  aoFechar: () => void;
  aoComecar: () => Promise<void>;
  restantes: number;
}) {
  const dialogo = useRef<HTMLDialogElement>(null),
    [iniciando, definirIniciando] = useState(false),
    [erro, definirErro] = useState(false);
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    dialogo.current?.showModal();
    return () => {
      dialogo.current?.close();
      anterior?.focus();
    };
  }, []);
  const areas = new Map<string, number>();
  for (const id of ids) {
    const q = indice.questoes.find((q) => q.id === id),
      nome = q ? indice.temas[q.t].nome : "Sem classificação";
    areas.set(nome, (areas.get(nome) ?? 0) + 1);
  }
  return (
    <dialog
      ref={dialogo}
      className="rvp-dialogo"
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
      aria-labelledby="rvp-previa-titulo"
    >
      <header>
        <div>
          <p className="rvp-selo">ANTES DE COMEÇAR</p>
          <h2 id="rvp-previa-titulo">{titulo}</h2>
        </div>
        <button
          className="rvp-fechar"
          aria-label="Fechar prévia"
          onClick={aoFechar}
        >
          <Icone nome="fechar" tamanho={20} />
        </button>
      </header>
      <p className="rvp-dialogo__numero">
        {ids.length}
        <span>questões · cerca de {minutos} min</span>
      </p>
      <ul className="rvp-dialogo__areas">
        {[...areas].map(([nome, n]) => (
          <li key={nome}>
            <span>{nome}</span>
            <b>{n}</b>
          </li>
        ))}
      </ul>
      <details>
        <summary>Por que estas questões?</summary>
        <ul className="rvp-dialogo__motivos">
          {ids.slice(0, 30).map((id) => (
            <li key={id}>
              <strong>{id}</strong>
              <span>{motivoRevisao(id, registros[id], indice)}</span>
            </li>
          ))}
        </ul>
        {ids.length > 30 && <p>Mais {ids.length - 30} questões na sessão.</p>}
      </details>
      <label className="rvp-recuperacao">
        <input
          type="checkbox"
          checked={lembrar}
          onChange={(e) => aoLembrar(e.target.checked)}
        />
        <span>
          <strong>Tentar lembrar antes das alternativas</strong>
          <small>
            Leia o enunciado, tente responder mentalmente e então revele as
            opções.
          </small>
        </span>
      </label>
      <p className="rvp-nota">
        {restantes
          ? `${restantes.toLocaleString("pt-BR")} pendências continuam guardadas. Você pode encerrar depois deste passo.`
          : "Esta sessão cobre as pendências do recorte."}{" "}
        A ordem das alternativas segue sua preferência na sessão.
      </p>
      {erro && (
        <p role="alert">Não foi possível abrir a sessão. Tente novamente.</p>
      )}
      <footer>
        <button className="rvp-secundario" onClick={aoFechar}>
          Voltar
        </button>
        <button
          className="rvp-primario"
          disabled={iniciando}
          onClick={async () => {
            definirIniciando(true);
            try {
              await aoComecar();
            } catch {
              definirErro(true);
            } finally {
              definirIniciando(false);
            }
          }}
        >
          {iniciando ? "Preparando…" : "Começar este passo"}
          <Icone nome="direita" tamanho={16} />
        </button>
      </footer>
    </dialog>
  );
}
