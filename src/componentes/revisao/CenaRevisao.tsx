import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { recurso } from "../../config";
import { usarPeriodo } from "../../estado/aparencia";
import { CENA_ESTUFA } from "../vila/cenas";
import { CorujaPixel } from "../../biblioteca/sala/CorujaPixel";
import { GatoPixel } from "../mascote/GatoPixel";
import {
  CONCEITOS_CORUJA,
  FALAS_GATO,
  proximaFala,
} from "../mascote/falasBichos";
const pos = (x: number, y: number, w: number, h: number) =>
  ({
    "--x": `${(x / 480) * 100}%`,
    "--xm": `${((x - 184) / 296) * 100}%`,
    "--y": `${(y / 160) * 100}%`,
    "--w": `${(w / 480) * 100}%`,
    "--wm": `${(w / 296) * 100}%`,
    "--h": `${(h / 160) * 100}%`,
  }) as CSSProperties;
export function CenaRevisao({ children }: { children: ReactNode }) {
  const periodo = usarPeriodo(),
    [fala, definirFala] = useState<{
      quem: "coruja" | "gato";
      texto: string;
    } | null>(null),
    [visivel, definirVisivel] = useState(true),
    ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!fala) return;
    const t = setTimeout(
      () => definirFala(null),
      fala.quem === "coruja" ? 11000 : 5500,
    );
    return () => clearTimeout(t);
  }, [fala]);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) =>
      definirVisivel(e.isIntersecting),
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const arte = (s = "") => recurso(`pixel/paginas/estufa-${periodo}${s}.webp`),
    coruja = CENA_ESTUFA.coruja,
    gato = CENA_ESTUFA.gato;
  return (
    <div className="rvp-topo__cena">
      <div
        ref={ref}
        className={`rvp-estufa${visivel ? "" : " rvp-estufa--parada"}`}
      >
        <picture aria-hidden="true">
          <source
            media="(max-width:40rem)"
            srcSet={arte("-movel")}
            width={888}
            height={480}
          />
          <img
            src={arte()}
            srcSet={`${arte("-960")} 960w, ${arte()} 1440w`}
            sizes="(max-width:64rem) 100vw, 58rem"
            width={1440}
            height={480}
            alt=""
            fetchPriority="high"
            draggable={false}
          />
        </picture>
        <button
          className="rvp-bicho rvp-bicho--coruja"
          aria-label="Falar com a coruja: conceito de prova"
          style={pos(coruja.x - 22, coruja.y - 31, 44, 32)}
          onClick={() =>
            definirFala({
              quem: "coruja",
              texto: proximaFala("coruja", CONCEITOS_CORUJA),
            })
          }
        >
          <CorujaPixel estado={fala?.quem === "coruja" ? "lendo" : "parada"} />
        </button>
        <button
          className="rvp-bicho rvp-bicho--gato"
          aria-label="Falar com o gato"
          style={pos(gato.x, gato.y, 34, 25.5)}
          onClick={() =>
            definirFala({
              quem: "gato",
              texto: proximaFala("gato", FALAS_GATO),
            })
          }
        >
          <GatoPixel estado={gato.estado} />
        </button>
        {fala && (
          <button
            className="rvp-fala"
            onClick={() => definirFala(null)}
            role="status"
            aria-label="Fechar fala do mascote"
          >
            {fala.texto}
          </button>
        )}
      </div>
      <div className="rvp-topo__titulo">{children}</div>
    </div>
  );
}
