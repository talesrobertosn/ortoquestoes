import { useState } from "react";
import { usarLargura } from "../GraficosDesempenho";
export interface SerieRevisao {
  nome: string;
  valores: Array<number | null>;
  tipo?: "linha" | "barra";
  classe?: string;
}
/** Mesmos valores no desenho, na legenda de foco/toque e na tabela. Sem depender de hover ou cor. */
export function GraficoRevisao({
  datas,
  series,
  rotulo,
  porcentagem = false,
  meta,
}: {
  datas: string[];
  series: SerieRevisao[];
  rotulo: string;
  porcentagem?: boolean;
  meta?: number | null;
}) {
  const [ativo, definir] = useState<number | null>(null);
  const [ref, largura] = usarLargura<HTMLDivElement>(640);
  const max = porcentagem
    ? 100
    : Math.max(
        4,
        ...series.flatMap((s) => s.valores.map((v) => v ?? 0)),
        meta ?? 0,
      );
  const teto = porcentagem ? 100 : Math.ceil(max / 4) * 4,
    W = largura,
    H = 190,
    E = 42,
    D = 18,
    T = 14,
    B = 30;
  const x = (i: number) =>
      E + ((i + 0.5) * (W - E - D)) / Math.max(1, datas.length),
    y = (v: number) => T + (1 - v / teto) * (H - T - B);
  const mostrado =
    ativo === null || ativo >= datas.length ? datas.length - 1 : ativo;
  const barras = series.filter((s) => s.tipo !== "linha"),
    bw = Math.min(
      20,
      (W - E - D) / Math.max(1, datas.length) / (barras.length + 1),
    );
  return (
    <figure className="rvp-grafico">
      <div className="rvp-grafico__legenda">
        {series.map((s, i) => (
          <span key={s.nome}>
            <i className={`rvp-serie rvp-serie--${s.classe ?? i}`} />
            {s.nome}
          </span>
        ))}
        {meta != null && (
          <span>
            <i className="rvp-serie rvp-serie--meta" />
            Teto atual: {meta}
          </span>
        )}
      </div>
      <div
        ref={ref}
        role="group"
        aria-label={`${rotulo}. Setas percorrem os dias; tabela abaixo.`}
        tabIndex={0}
        className="rvp-grafico__area"
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            definir(
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? datas.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        datas.length - 1,
                        mostrado + (e.key === "ArrowLeft" ? -1 : 1),
                      ),
                    ),
            );
          }
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line
                x1={E}
                x2={W - D}
                y1={y(t * teto)}
                y2={y(t * teto)}
                className="rvp-gridline"
              />
              <text x={E - 7} y={y(t * teto) + 4} textAnchor="end">
                {Math.round(t * teto)}
                {porcentagem ? "%" : ""}
              </text>
            </g>
          ))}
          {meta != null && (
            <line
              x1={E}
              x2={W - D}
              y1={y(meta)}
              y2={y(meta)}
              className="rvp-meta-line"
            />
          )}
          {barras.map((s, j) => (
            <g
              key={s.nome}
              className={`rvp-traco rvp-traco--${s.classe ?? series.indexOf(s)}`}
            >
              {s.valores.map((v, i) =>
                v === null ? null : (
                  <rect
                    key={i}
                    x={x(i) + (j - barras.length / 2) * bw}
                    y={y(v)}
                    width={Math.max(1, bw - 1)}
                    height={y(0) - y(v)}
                    rx="2"
                  />
                ),
              )}
            </g>
          ))}
          {series
            .filter((s) => s.tipo === "linha")
            .map((s) => {
              let d = "";
              let anterior = false;
              s.valores.forEach((v, i) => {
                if (v === null) {
                  anterior = false;
                  return;
                }
                d += `${anterior ? "L" : "M"}${x(i)},${y(v)} `;
                anterior = true;
              });
              return (
                <g
                  key={s.nome}
                  className={`rvp-traco rvp-traco--${s.classe ?? series.indexOf(s)}`}
                >
                  <path
                    d={d}
                    fill="none"
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  {s.valores.map((v, i) =>
                    v === null ? null : (
                      <circle
                        key={i}
                        cx={x(i)}
                        cy={y(v)}
                        r={datas.length > 40 ? 1.5 : 3}
                      />
                    ),
                  )}
                </g>
              );
            })}
          {datas.map((dia, i) => (
            <g key={dia}>
              {(i === 0 ||
                i === datas.length - 1 ||
                i %
                  Math.max(
                    1,
                    Math.ceil(datas.length / (largura < 400 ? 3 : 6)),
                  ) ===
                  0) && (
                <text x={x(i)} y={H - 7} textAnchor="middle">
                  {dia.slice(8, 10)}/{dia.slice(5, 7)}
                </text>
              )}
              <rect
                x={E + (i * (W - E - D)) / datas.length}
                y={T}
                width={(W - E - D) / datas.length}
                height={H - T}
                fill="transparent"
                onMouseEnter={() => definir(i)}
                onClick={() => definir(i)}
              />
            </g>
          ))}
        </svg>
      </div>
      <figcaption aria-live="polite">
        {datas[mostrado]?.split("-").reverse().join("/")} ·{" "}
        {series
          .map(
            (s) =>
              `${s.nome}: ${s.valores[mostrado] ?? "sem dados"}${porcentagem && s.valores[mostrado] != null ? "%" : ""}`,
          )
          .join(" · ")}
      </figcaption>
      <details className="rvp-tabela-dados">
        <summary>Ver dados em tabela</summary>
        <div className="rolagem-x">
          <table>
            <caption className="so-leitor">{rotulo}</caption>
            <thead>
              <tr>
                <th>Dia</th>
                {series.map((s) => (
                  <th key={s.nome}>{s.nome}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datas.map((d, i) => (
                <tr key={d}>
                  <th scope="row">{d.split("-").reverse().join("/")}</th>
                  {series.map((s) => (
                    <td key={s.nome}>
                      {s.valores[i] ?? "–"}
                      {porcentagem && s.valores[i] != null ? "%" : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
