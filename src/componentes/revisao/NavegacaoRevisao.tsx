import { useEffect, useState } from "react";
import { Icone, type NomeIcone } from "../Icone";
export interface SecaoRevisao {
  id: string;
  nome: string;
  icone: NomeIcone;
}
export function NavegacaoRevisao({ secoes }: { secoes: SecaoRevisao[] }) {
  const [ativa, definirAtiva] = useState("rvp-topo");
  useEffect(() => {
    const atualizar = () => {
      const linha = innerWidth < 1024 ? 150 : 100;
      let atual = secoes[0]?.id;
      for (const s of secoes) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= linha) atual = s.id;
      }
      if (atual) definirAtiva(atual);
    };
    window.addEventListener("scroll", atualizar, { passive: true });
    atualizar();
    return () => window.removeEventListener("scroll", atualizar);
  }, [secoes.map((s) => s.id).join(",")]);
  return (
    <nav className="rvp-nav" aria-label="Seções da revisão">
      <p className="rvp-selo">NESTA PÁGINA</p>
      <ol>
        {secoes.map((s) => (
          <li key={s.id}>
            <a
              href={"#" + s.id}
              aria-current={ativa === s.id ? "location" : undefined}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(s.id)
                  ?.scrollIntoView({
                    behavior: matchMedia("(prefers-reduced-motion: reduce)")
                      .matches
                      ? "auto"
                      : "smooth",
                    block: "start",
                  });
                definirAtiva(s.id);
              }}
            >
              <Icone nome={s.icone} tamanho={16} />
              <span>{s.nome}</span>
            </a>
          </li>
        ))}
      </ol>
      <p className="rvp-nav__nota">
        A meta de hoje é um passo.
        <br />O restante continua guardado.
      </p>
    </nav>
  );
}
