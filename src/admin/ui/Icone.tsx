/**
 * Ícones do painel 3.0: traço fino (1,6 px), cantos redondos, 24 × 24, herdando currentColor.
 * Desenho próprio, geométrico, no espírito dos ícones de ferramenta (nada copiado de biblioteca).
 * Decorativos por padrão (aria-hidden); quem precisa de nome usa `rotulo`.
 */
const P: Record<string, string> = {
  comando: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7v1.5M7 12h1.5M15.5 12H17M12 12l3.5-3.5M12 12a.6.6 0 1 0 0 .01',
  pessoas: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c1.9.7 3.2 2.5 3.5 5.2',
  estudo: 'M12 6.5C10 5 7.2 4.5 3.5 4.8v13.5c3.7-.3 6.5.2 8.5 1.7 2-1.5 4.8-2 8.5-1.7V4.8C16.8 4.5 14 5 12 6.5ZM12 6.5V20',
  receita: 'M3.5 7.5h17v11a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-11ZM3.5 7.5 5.5 4h13l2 3.5M16 13.5h2',
  carta: 'M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7',
  ajustes: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  busca: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 20 20',
  fechar: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  direita: 'M9.5 6l6 6-6 6',
  esquerda: 'M14.5 6l-6 6 6 6',
  baixo: 'M6 9.5l6 6 6-6',
  cima: 'M6 14.5l6-6 6 6',
  seta: 'M5 12h14M13 6l6 6-6 6',
  voltar: 'M19 12H5M11 6l-6 6 6 6',
  sobe: 'M7 17 17 7M9 7h8v8',
  desce: 'M7 7l10 10M17 9v8H9',
  alerta: 'M12 4.5 3 19.5h18L12 4.5ZM12 10v4M12 16.8v.2',
  info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 11v5.5M12 7.8v.2',
  certo: 'M5 12.5l4.5 4.5L19 7.5',
  erro: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM9 9l6 6M15 9l-6 6',
  relogio: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7.5V12l3 2',
  calendario: 'M4 6.5h16v13H4zM4 10.5h16M8.5 4v4.5M15.5 4v4.5',
  filtro: 'M4 6h16M7 12h10M10 18h4',
  ordenar: 'M8 5v14M4.5 15.5 8 19l3.5-3.5M16 19V5M12.5 8.5 16 5l3.5 3.5',
  baixar: 'M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15',
  atualizar: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4',
  mais: 'M12 5v14M5 12h14',
  olho: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12ZM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  externo: 'M13.5 4.5h6v6M19.5 4.5l-8 8M17 13.5v5.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5.5',
  usuario: 'M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c.8-3.9 3.7-6 7.5-6s6.7 2.1 7.5 6',
  sol: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  lua: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  lapis: 'M14.5 5.5l4 4L8.5 19.5H4.5v-4l10-10ZM12.5 7.5l4 4',
  copiar: 'M8.5 8.5h11v11h-11zM15.5 8.5V4.5h-11v11h4',
  enviar: 'M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4 17-6.5Z',
  raio: 'M13 3 5 13.5h6.5L11 21l8-10.5h-6.5L13 3Z',
  cartao: 'M3.5 6.5h17v11h-17zM3.5 10h17M7 14.5h4',
  pix: 'M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5ZM8.5 12l3.5-3.5 3.5 3.5-3.5 3.5L8.5 12Z',
  grafico: 'M4.5 4.5v15h15M8.5 15v-3.5M12.5 15V8M16.5 15v-5',
  funil: 'M4 5h16l-6 7.5V19l-4 1.5v-8L4 5Z',
  grade: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  mapa: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM3.5 12h17M12 3.5c2.3 2.4 3.3 5.2 3.3 8.5s-1 6.1-3.3 8.5c-2.3-2.4-3.3-5.2-3.3-8.5s1-6.1 3.3-8.5Z',
  pendencia: 'M5.5 4.5h13v15h-13zM8.5 9h7M8.5 12.5h7M8.5 16h4',
  pausar: 'M8.5 5.5v13M15.5 5.5v13',
  tocar: 'M7.5 5v14l11.5-7L7.5 5Z',
  trava: 'M6.5 10.5h11v9.5h-11zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3',
  lixeira: 'M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14',
  estrela: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L12 3.5Z',
  ponto: 'M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  livro: 'M5.5 4.5h11a2 2 0 0 1 2 2v13h-11a2 2 0 0 1-2-2v-13ZM5.5 17.5a2 2 0 0 1 2-2h11',
  teclado: 'M3.5 6.5h17v11h-17zM7 10h.01M10.5 10h.01M14 10h.01M17 10h.01M7.5 14h9',
  sair: 'M14.5 4.5h4a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h9.5',
}

export type NomeIconeAdmin = keyof typeof P

export function Icone({ nome, tamanho = 18, rotulo }: { nome: NomeIconeAdmin; tamanho?: number; rotulo?: string }) {
  return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden={rotulo ? undefined : true} role={rotulo ? 'img' : undefined} aria-label={rotulo}
    focusable="false" className="a3-icone"><path d={P[nome]} /></svg>
}
