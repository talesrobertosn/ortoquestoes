/** Cor numérica do three (0xrrggbb) em texto CSS. */
export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`
