import { recurso } from '../config'

/** Ícone em pixel art da temporada RPG (public/pixel), desenhado por scripts/gerar_icones_pixel.py. */
export type NomeIconePixel = 'treinar' | 'revisao' | 'desempenho' | 'ranking' | 'simulado' | 'liga' | 'turma' | 'relatorio' | 'planos'

export function IconePixel({ nome, tamanho = 40, className = '' }: { nome: NomeIconePixel; tamanho?: number; className?: string }) {
  return <img className={`icone-pixel ${className}`} src={recurso(`pixel/${nome}.png`)} width={tamanho} height={tamanho} alt="" draggable={false} />
}
