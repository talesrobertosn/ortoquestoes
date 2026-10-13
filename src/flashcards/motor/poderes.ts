/**
 * Catálogo de recompensas da Batalha, como dados tipados (o efeito de cada uma
 * é aplicado em regras.ts, sempre pelos valores daqui; nada de número solto no
 * CSS ou nos componentes).
 *
 *  - Poderes: ocupam os 3 encaixes e se gastam (cargas). Os "ativos" são
 *    usados por toque; os outros disparam sozinhos no momento certo.
 *  - Relíquias: duram a partida toda. As únicas não repetem; as acumuláveis têm
 *    limite e, quando dito, retorno decrescente.
 *  - Eventos: efeito imediato na hora da escolha (fogueira, forja, treino).
 *
 * Depois de cada adversário, a pessoa escolhe 1 de 3 recompensas sorteadas com
 * semente, com peso pela raridade (raro é raro mesmo).
 *
 * Bênçãos dos mestres (inspiração: os deuses do Hades): parte das relíquias vem
 * de um dos cinco PATRONOS, cada um com um estilo. Ter bênçãos de dois patronos
 * abre as bênçãos em DUPLA (lendárias), que combinam os dois estilos.
 */

export type TipoPoder = 'escudo' | 'imortal' | 'pocao' | 'pista' | 'duplo' | 'vital' | 'devastador' | 'eco' | 'barreira' | 'foco' | 'ruptura' | 'ampulheta' | 'trocar'
export type TipoReliquia =
  | 'bisturi' | 'gesso' | 'amuleto' | 'lupa' | 'coracao' | 'vigor' | 'placas' | 'residente'
  | 'insignia' | 'selo' | 'mestre' | 'roubo' | 'livro' | 'marca' | 'preceptor' | 'ritual'
  // bênçãos dos patronos
  | 'brasa' | 'impacto' | 'sede' | 'execucao' | 'olhoaguia' | 'cadeia' | 'tempestade'
  | 'reflexo' | 'baluarte' | 'contra' | 'seiva' | 'colheita' | 'florescer'
  // bênçãos em dupla
  | 'supernova' | 'sentinela' | 'fenix' | 'tormenta' | 'cauterio'
export type TipoEvento = 'descanso' | 'forja' | 'treino' | 'bolsa'
export type Recompensa = TipoPoder | TipoReliquia | TipoEvento

export type Raridade = 'comum' | 'incomum' | 'rara' | 'epica' | 'lendaria'
export type Categoria = 'ataque' | 'defesa' | 'cura' | 'estrategia' | 'evento'

/** Os cinco mestres que concedem bênçãos (cada um com um estilo de jogo). */
export type Patrono = 'fratura' | 'mira' | 'placa' | 'calo' | 'raio'
export const PATRONOS: Record<Patrono, { nome: string; titulo: string; cor: string; icone: string; estilo: string }> = {
  fratura: { nome: 'Mestre da Fratura', titulo: 'Força bruta e queimadura', cor: '#ff6a3c', icone: 'martelo', estilo: 'Golpes mais pesados e brasas que queimam a cada rodada.' },
  mira: { nome: 'Mestra da Mira', titulo: 'Críticos e execução', cor: '#7fe08f', icone: 'olho', estilo: 'Chance de crítico e golpes de misericórdia em quem está fraco.' },
  placa: { nome: 'Guardiã da Placa', titulo: 'Defesa e reflexo', cor: '#ffd76a', icone: 'escudo-ouro', estilo: 'Escudos que voltam, contra-ataque e reflexo.' },
  calo: { nome: 'Senhora do Calo Ósseo', titulo: 'Cura e consolidação', cor: '#ff8ab0', icone: 'selo', estilo: 'Recupera vida a cada acerto e cresce a cada vitória.' },
  raio: { nome: 'Mestre do Raio', titulo: 'Raios em cadeia', cor: '#8fd0ff', icone: 'raio', estilo: 'Raios extras que ignoram armadura e barreira.' },
}

export interface Descricao {
  id: Recompensa
  nome: string
  /** Frase curta e exata do efeito, com os números. */
  texto: string
  /** Duração, acúmulo e interação: aparece na carta de recompensa e no detalhe. */
  detalhe: string
  icone: string
  cor: string
  tipo: 'poder' | 'reliquia' | 'evento'
  categoria: Categoria
  raridade: Raridade
  /** Cargas que entram ao pegar (poderes). */
  cargas?: number
  /** Máximo de cargas (poderes) ou de cópias (relíquias acumuláveis). */
  maximo?: number
  /** Usado por toque, na hora que a pessoa quiser. */
  ativo?: boolean
  /** Números do efeito (lidos por regras.ts). */
  v: Record<string, number>
  /** Só depois do primeiro chefe. */
  aposChefe?: boolean
  /** Bênção de um patrono. */
  patrono?: Patrono
  /** Bênção em dupla: só aparece com bênçãos dos dois patronos. */
  requer?: [Patrono, Patrono]
}

const d = (x: Descricao) => x

export const RECOMPENSAS: Record<Recompensa, Descricao> = {
  // ---------- Poderes de ataque
  duplo: d({ id: 'duplo', nome: 'Golpe duplo', texto: 'O próximo acerto causa o dobro de dano.', detalhe: 'Consumível · 1 carga por escolha, até 2 · dobra também os bônus.', icone: 'espada', cor: '#b07cff', tipo: 'poder', categoria: 'ataque', raridade: 'comum', cargas: 1, maximo: 2, v: { multiplicador: 2 } }),
  devastador: d({ id: 'devastador', nome: 'Golpe devastador', texto: 'O próximo acerto causa +25 de dano.', detalhe: 'Consumível · 1 carga, até 2 · soma antes da armadura.', icone: 'martelo', cor: '#ff8a3c', tipo: 'poder', categoria: 'ataque', raridade: 'incomum', cargas: 1, maximo: 2, v: { bonus: 25 } }),
  eco: d({ id: 'eco', nome: 'Eco da lâmina', texto: 'O próximo acerto bate de novo com metade do dano.', detalhe: 'Consumível · 1 carga, até 2 · o eco não repete outro eco.', icone: 'eco', cor: '#7fd8ff', tipo: 'poder', categoria: 'ataque', raridade: 'incomum', cargas: 1, maximo: 2, v: { fracao: 0.5 } }),
  ruptura: d({ id: 'ruptura', nome: 'Ruptura de armadura', texto: 'O próximo acerto ignora a armadura e tira 5 dela até o fim do confronto.', detalhe: 'Consumível · 1 carga, até 2 · forte contra chefes de placas.', icone: 'quebra', cor: '#ffd27a', tipo: 'poder', categoria: 'ataque', raridade: 'incomum', cargas: 1, maximo: 2, v: { reducao: 5 } }),
  // ---------- Poderes defensivos
  escudo: d({ id: 'escudo', nome: 'Escudo arcano', texto: 'Bloqueia por inteiro o próximo golpe que você levar.', detalhe: 'Consumível · 1 carga por escolha, até 3 · gasta antes da barreira e do foco.', icone: 'escudo', cor: '#5fa8ff', tipo: 'poder', categoria: 'defesa', raridade: 'comum', cargas: 1, maximo: 3, v: {} }),
  barreira: d({ id: 'barreira', nome: 'Barreira reativa', texto: 'Absorve até 15 de dano do próximo golpe.', detalhe: 'Consumível · 1 carga, até 3 · o que passar de 15 chega a você.', icone: 'barreira', cor: '#8fd0ff', tipo: 'poder', categoria: 'defesa', raridade: 'comum', cargas: 1, maximo: 3, v: { absorve: 15 } }),
  foco: d({ id: 'foco', nome: 'Foco absoluto', texto: 'O próximo golpe recebido perde metade do dano.', detalhe: 'Consumível · 1 carga, até 2 · dispara sozinho no próximo erro.', icone: 'olho', cor: '#c9b6ff', tipo: 'poder', categoria: 'defesa', raridade: 'comum', cargas: 1, maximo: 2, v: { fracao: 0.5 } }),
  imortal: d({ id: 'imortal', nome: 'Segunda chance', texto: 'Uma vez, não cai: fica com 1 de vida.', detalhe: 'Consumível · 1 só · não empilha.', icone: 'coroa', cor: '#ffcf5a', tipo: 'poder', categoria: 'defesa', raridade: 'rara', cargas: 1, maximo: 1, v: {} }),
  // ---------- Cura
  pocao: d({ id: 'pocao', nome: 'Poção do desafio', texto: 'Acerte os próximos 3 e ganhe +20 de vida. Um erro e ela se perde.', detalhe: 'Consumível · 1 só · a contagem aparece no encaixe.', icone: 'pocao', cor: '#ff7a5c', tipo: 'poder', categoria: 'cura', raridade: 'comum', cargas: 1, maximo: 1, v: { acertos: 3, cura: 20 } }),
  vital: d({ id: 'vital', nome: 'Poção de emergência', texto: 'Use quando quiser: recupera 25 de vida.', detalhe: 'Ativa · 1 carga, até 2 · toque no encaixe antes de responder.', icone: 'frasco', cor: '#5fdc7a', tipo: 'poder', categoria: 'cura', raridade: 'incomum', cargas: 1, maximo: 2, ativo: true, v: { cura: 25 } }),
  // ---------- Estratégia
  pista: d({ id: 'pista', nome: 'Pergaminho da pista', texto: 'Use quando quiser: elimina uma alternativa errada. O acerto conta como assistido.', detalhe: 'Ativa · 2 cargas por escolha, até 5 · sempre sobram duas alternativas.', icone: 'pergaminho', cor: '#e8d28a', tipo: 'poder', categoria: 'estrategia', raridade: 'comum', cargas: 2, maximo: 5, ativo: true, v: {} }),
  ampulheta: d({ id: 'ampulheta', nome: 'Ampulheta do plantão', texto: 'Use quando quiser: o adversário recomeça a contar a paciência (e perde a Fúria).', detalhe: 'Ativa · 1 carga, até 2 · boa contra adversários de muita vida.', icone: 'ampulheta', cor: '#e8c070', tipo: 'poder', categoria: 'estrategia', raridade: 'incomum', cargas: 1, maximo: 2, ativo: true, v: {} }),
  trocar: d({ id: 'trocar', nome: 'Carta na manga', texto: 'Use quando quiser: troca o flashcard da mesa por outro. Ele volta para o fim do baralho.', detalhe: 'Ativa · 1 carga, até 2 · não conta como resposta nem como erro.', icone: 'cartas', cor: '#c8a0ff', tipo: 'poder', categoria: 'estrategia', raridade: 'rara', cargas: 1, maximo: 2, ativo: true, v: {} }),
  // ---------- Relíquias
  bisturi: d({ id: 'bisturi', nome: 'Lâmina da precisão', texto: '+6 de dano nos acertos difíceis.', detalhe: 'Relíquia única · a partida toda.', icone: 'bisturi', cor: '#9fe0ff', tipo: 'reliquia', categoria: 'ataque', raridade: 'comum', v: { bonus: 6 } }),
  residente: d({ id: 'residente', nome: 'Fúria do residente', texto: 'A cada 3 acertos seguidos, o terceiro causa +10.', detalhe: 'Relíquia única · soma com o combo.', icone: 'chama', cor: '#ff9a3c', tipo: 'reliquia', categoria: 'ataque', raridade: 'incomum', v: { bonus: 10, a_cada: 3 } }),
  marca: d({ id: 'marca', nome: 'Marca do mestre', texto: 'O 5º acerto seguido sem ajuda é um crítico especial: +15.', detalhe: 'Relíquia única · repete a cada 5 da mesma sequência.', icone: 'estrela', cor: '#ffe08a', tipo: 'reliquia', categoria: 'ataque', raridade: 'rara', aposChefe: true, v: { bonus: 15, a_cada: 5 } }),
  gesso: d({ id: 'gesso', nome: 'Tala reforçada', texto: 'Todo golpe recebido perde 2 de dano.', detalhe: 'Relíquia única · aplica depois da armadura de placas.', icone: 'tala', cor: '#e6e0d0', tipo: 'reliquia', categoria: 'defesa', raridade: 'comum', v: { reducao: 2 } }),
  placas: d({ id: 'placas', nome: 'Armadura de placas', texto: 'Todo golpe recebido perde 10% do dano.', detalhe: 'Relíquia única · a partida toda.', icone: 'peitoral', cor: '#b9c6d8', tipo: 'reliquia', categoria: 'defesa', raridade: 'incomum', v: { fracao: 0.1 } }),
  mestre: d({ id: 'mestre', nome: 'Escudo do mestre', texto: 'Golpes de chefe perdem 15% do dano.', detalhe: 'Relíquia única · soma com a armadura de placas.', icone: 'escudo-ouro', cor: '#ffd76a', tipo: 'reliquia', categoria: 'defesa', raridade: 'rara', aposChefe: true, v: { fracao: 0.15 } }),
  preceptor: d({ id: 'preceptor', nome: 'Proteção do preceptor', texto: 'Em cada confronto, o primeiro golpe recebido perde metade.', detalhe: 'Relíquia única · renova a cada adversário.', icone: 'mao', cor: '#a8e6c0', tipo: 'reliquia', categoria: 'defesa', raridade: 'incomum', v: { fracao: 0.5 } }),
  coracao: d({ id: 'coracao', nome: 'Coração do viajante', texto: '+20 de vida máxima e recupera 20 agora.', detalhe: 'Relíquia acumulável · até 3.', icone: 'coracao2', cor: '#ff6a7a', tipo: 'reliquia', categoria: 'cura', raridade: 'incomum', maximo: 3, v: { vida: 20 } }),
  vigor: d({ id: 'vigor', nome: 'Vitalidade do veterano', texto: '+10% de vida máxima (a segunda cópia dá 7%, as seguintes 5%).', detalhe: 'Relíquia acumulável · até 4 · retorno decrescente.', icone: 'vigor', cor: '#ff9aa8', tipo: 'reliquia', categoria: 'cura', raridade: 'comum', maximo: 4, v: { primeira: 0.1, segunda: 0.07, demais: 0.05 } }),
  selo: d({ id: 'selo', nome: 'Selo da persistência', texto: 'A cada 5 acertos seguidos, recupera 4 de vida.', detalhe: 'Relíquia única · uma vez por marca de 5.', icone: 'selo', cor: '#8ff0a0', tipo: 'reliquia', categoria: 'cura', raridade: 'comum', v: { cura: 4, a_cada: 5 } }),
  roubo: d({ id: 'roubo', nome: 'Roubo de energia', texto: 'Acerto difícil sem ajuda recupera 3 de vida.', detalhe: 'Relíquia única · no máximo uma vez por flashcard.', icone: 'raio', cor: '#b0ff8a', tipo: 'reliquia', categoria: 'cura', raridade: 'incomum', v: { cura: 3 } }),
  insignia: d({ id: 'insignia', nome: 'Insígnia da reconstrução', texto: 'Recupera 8 de vida ao vencer cada adversário.', detalhe: 'Relíquia única · soma com o ritual.', icone: 'insignia', cor: '#ffcf8a', tipo: 'reliquia', categoria: 'cura', raridade: 'comum', v: { cura: 8 } }),
  ritual: d({ id: 'ritual', nome: 'Ritual da recuperação', texto: 'Ao vencer um chefe, recupera mais 25% da vida máxima.', detalhe: 'Relíquia única · além dos 15% de todo chefe vencido.', icone: 'vela', cor: '#ffb070', tipo: 'reliquia', categoria: 'cura', raridade: 'incomum', v: { fracao: 0.25 } }),
  amuleto: d({ id: 'amuleto', nome: 'Amuleto da incidência', texto: 'Acertar um flashcard lendário cura +6, em vez de +3.', detalhe: 'Relíquia única · lendário = assunto que mais cai.', icone: 'amuleto', cor: '#ffcf5a', tipo: 'reliquia', categoria: 'cura', raridade: 'rara', aposChefe: true, v: { cura: 6 } }),
  lupa: d({ id: 'lupa', nome: 'Lupa do preceptor', texto: 'No início de cada adversário, ganha 1 pergaminho da pista.', detalhe: 'Relíquia única · respeita o limite de 5 cargas.', icone: 'lupa', cor: '#7fe08f', tipo: 'reliquia', categoria: 'estrategia', raridade: 'rara', aposChefe: true, v: { cargas: 1 } }),
  livro: d({ id: 'livro', nome: 'Livro dos fundamentos', texto: 'Ganha 1 pergaminho agora, e cada pergaminho novo vem com +1 carga.', detalhe: 'Relíquia única · a pista continua contando como assistida.', icone: 'livro', cor: '#d8b878', tipo: 'reliquia', categoria: 'estrategia', raridade: 'comum', v: { cargas: 1 } }),
  // ---------- Bênçãos: Mestre da Fratura
  brasa: d({ id: 'brasa', nome: 'Golpe em brasa', texto: 'Cada acerto deixa 1 brasa no adversário (até 3). Cada brasa queima 3 por rodada.', detalhe: 'Bênção · Mestre da Fratura · a queimadura ignora armadura e barreira.', icone: 'chama', cor: '#ff6a3c', tipo: 'reliquia', categoria: 'ataque', raridade: 'incomum', patrono: 'fratura', v: { porBrasa: 3, maximo: 3 } }),
  impacto: d({ id: 'impacto', nome: 'Impacto cominutivo', texto: 'Acertos difíceis causam +25% de dano.', detalhe: 'Bênção · Mestre da Fratura · soma com a Lâmina da precisão.', icone: 'martelo', cor: '#ff8a3c', tipo: 'reliquia', categoria: 'ataque', raridade: 'comum', patrono: 'fratura', v: { fracao: 0.25 } }),
  sede: d({ id: 'sede', nome: 'Sede de batalha', texto: 'Cada acerto seguido soma +3 de dano (até +15). Um erro zera.', detalhe: 'Bênção épica · Mestre da Fratura.', icone: 'espada', cor: '#ff4a2a', tipo: 'reliquia', categoria: 'ataque', raridade: 'epica', patrono: 'fratura', aposChefe: true, v: { porAcerto: 3, maximo: 15 } }),
  // ---------- Bênçãos: Mestra da Mira
  olhoaguia: d({ id: 'olhoaguia', nome: 'Olho de águia', texto: '+10% de chance de crítico (dano ×1,5) em qualquer acerto.', detalhe: 'Bênção acumulável · Mestra da Mira · até 2 (20%).', icone: 'olho', cor: '#7fe08f', tipo: 'reliquia', categoria: 'ataque', raridade: 'comum', patrono: 'mira', maximo: 2, v: { chance: 0.1, multiplicador: 1.5 } }),
  execucao: d({ id: 'execucao', nome: 'Golpe de misericórdia', texto: 'Adversário abaixo de 30% da vida leva +50% de dano.', detalhe: 'Bênção · Mestra da Mira.', icone: 'alvo', cor: '#5fdc7a', tipo: 'reliquia', categoria: 'ataque', raridade: 'incomum', patrono: 'mira', v: { abaixoDe: 0.3, fracao: 0.5 } }),
  // ---------- Bênçãos: Mestre do Raio
  cadeia: d({ id: 'cadeia', nome: 'Raio em cadeia', texto: 'Cada acerto dispara um raio extra de 4 que ignora armadura e barreira.', detalhe: 'Bênção acumulável · Mestre do Raio · até 2 (8).', icone: 'raio', cor: '#8fd0ff', tipo: 'reliquia', categoria: 'ataque', raridade: 'comum', patrono: 'raio', maximo: 2, v: { dano: 4 } }),
  tempestade: d({ id: 'tempestade', nome: 'Tempestade', texto: 'A cada 4 acertos seguidos, um trovão de 18.', detalhe: 'Bênção rara · Mestre do Raio · ignora armadura e barreira.', icone: 'nuvem', cor: '#a8d8ff', tipo: 'reliquia', categoria: 'ataque', raridade: 'rara', patrono: 'raio', v: { a_cada: 4, dano: 18 } }),
  // ---------- Bênçãos: Guardiã da Placa
  reflexo: d({ id: 'reflexo', nome: 'Égide refletora', texto: 'Quando o escudo bloqueia, devolve 20 de dano ao adversário.', detalhe: 'Bênção · Guardiã da Placa.', icone: 'escudo-ouro', cor: '#ffd76a', tipo: 'reliquia', categoria: 'defesa', raridade: 'comum', patrono: 'placa', v: { dano: 20 } }),
  baluarte: d({ id: 'baluarte', nome: 'Baluarte', texto: 'Cada adversário novo começa com 1 Barreira reativa para você (absorve 15; respeita o limite).', detalhe: 'Bênção rara · Guardiã da Placa.', icone: 'muralha', cor: '#ffe08a', tipo: 'reliquia', categoria: 'defesa', raridade: 'rara', patrono: 'placa', aposChefe: true, v: { cargas: 1 } }),
  contra: d({ id: 'contra', nome: 'Contra-ataque', texto: 'Ao levar dano, devolve 25% dele ao adversário.', detalhe: 'Bênção · Guardiã da Placa · o contra-ataque pode derrubar.', icone: 'espadas', cor: '#f2c45a', tipo: 'reliquia', categoria: 'defesa', raridade: 'incomum', patrono: 'placa', v: { fracao: 0.25 } }),
  // ---------- Bênçãos: Senhora do Calo Ósseo
  seiva: d({ id: 'seiva', nome: 'Calo vivo', texto: 'Cada acerto recupera 2 de vida.', detalhe: 'Bênção · Senhora do Calo Ósseo.', icone: 'folha', cor: '#ff8ab0', tipo: 'reliquia', categoria: 'cura', raridade: 'comum', patrono: 'calo', v: { cura: 2 } }),
  colheita: d({ id: 'colheita', nome: 'Remodelação', texto: 'Ao vencer um adversário, recupera 20% da vida que falta.', detalhe: 'Bênção · Senhora do Calo Ósseo.', icone: 'vigor', cor: '#ff9ac0', tipo: 'reliquia', categoria: 'cura', raridade: 'incomum', patrono: 'calo', v: { fracao: 0.2 } }),
  florescer: d({ id: 'florescer', nome: 'Consolidação plena', texto: '+20 de vida máxima e recupera 20 agora.', detalhe: 'Bênção épica · Senhora do Calo Ósseo.', icone: 'coracao2', cor: '#ff6a9a', tipo: 'reliquia', categoria: 'cura', raridade: 'epica', patrono: 'calo', aposChefe: true, v: { vida: 20 } }),
  // ---------- Bênçãos em dupla (lendárias)
  supernova: d({ id: 'supernova', nome: 'Raio em brasa', texto: 'Seus raios também deixam 1 brasa no adversário.', detalhe: 'Dupla lendária · Fratura + Raio.', icone: 'chama', cor: '#ffb04a', tipo: 'reliquia', categoria: 'ataque', raridade: 'lendaria', requer: ['fratura', 'raio'], v: {} }),
  sentinela: d({ id: 'sentinela', nome: 'Sentinela', texto: 'Depois de cada bloqueio do escudo, o próximo acerto é crítico garantido.', detalhe: 'Dupla lendária · Mira + Placa.', icone: 'olho', cor: '#d8f07a', tipo: 'reliquia', categoria: 'ataque', raridade: 'lendaria', requer: ['mira', 'placa'], v: {} }),
  fenix: d({ id: 'fenix', nome: 'Fênix da consolidação', texto: 'Uma vez por partida, ao cair, renasce com 40% da vida.', detalhe: 'Dupla lendária · Calo + Placa · depois da Segunda chance.', icone: 'fenix', cor: '#ffa05a', tipo: 'reliquia', categoria: 'cura', raridade: 'lendaria', requer: ['calo', 'placa'], v: { fracao: 0.4 } }),
  tormenta: d({ id: 'tormenta', nome: 'Tormenta precisa', texto: 'Todo crítico dispara um raio de 15.', detalhe: 'Dupla lendária · Mira + Raio.', icone: 'nuvem', cor: '#9ff0d8', tipo: 'reliquia', categoria: 'ataque', raridade: 'lendaria', requer: ['mira', 'raio'], v: { dano: 15 } }),
  cauterio: d({ id: 'cauterio', nome: 'Cautério', texto: 'Cada brasa no adversário também cura você em 1 por rodada.', detalhe: 'Dupla lendária · Fratura + Calo.', icone: 'vela', cor: '#ff8a7a', tipo: 'reliquia', categoria: 'cura', raridade: 'lendaria', requer: ['fratura', 'calo'], v: { cura: 1 } }),
  // ---------- Eventos
  descanso: d({ id: 'descanso', nome: 'Fogueira de descanso', texto: 'Recupera 30% da vida máxima agora.', detalhe: 'Evento · efeito imediato.', icone: 'fogueira', cor: '#ff9a4a', tipo: 'evento', categoria: 'evento', raridade: 'comum', v: { fracao: 0.3 } }),
  forja: d({ id: 'forja', nome: 'Ferreiro da reconstrução', texto: '+1 carga em cada poder equipado (respeita os limites).', detalhe: 'Evento · efeito imediato.', icone: 'bigorna', cor: '#c8c8d8', tipo: 'evento', categoria: 'evento', raridade: 'incomum', v: { cargas: 1 } }),
  bolsa: d({ id: 'bolsa', nome: 'Bolsa de moedas', texto: '+40 moedas agora, para gastar com a Caixeira do Arsenal.', detalhe: 'Evento · efeito imediato.', icone: 'moeda', cor: '#ffd24a', tipo: 'evento', categoria: 'evento', raridade: 'comum', v: { ouro: 40 } }),
  treino: d({ id: 'treino', nome: 'Treino do residente', texto: '+10 de vida máxima (sem curar).', detalhe: 'Evento · efeito imediato.', icone: 'halter', cor: '#ffc2a0', tipo: 'evento', categoria: 'evento', raridade: 'comum', v: { vida: 10 } }),
}

export const PODERES = Object.values(RECOMPENSAS).filter((x) => x.tipo === 'poder').map((x) => x.id as TipoPoder)
export const RELIQUIAS = Object.values(RECOMPENSAS).filter((x) => x.tipo === 'reliquia').map((x) => x.id as TipoReliquia)
export const EVENTOS = Object.values(RECOMPENSAS).filter((x) => x.tipo === 'evento').map((x) => x.id as TipoEvento)
export const ENCAIXES = 3

/** Peso de sorteio por raridade: o raro é raro mesmo. */
export const PESO_RARIDADE_RECOMPENSA: Record<Raridade, number> = { comum: 10, incomum: 5, rara: 1.6, epica: 0.9, lendaria: 1.2 }
/** Preço na Caixeira do Arsenal, em moedas. */
export const PRECO: Record<Raridade, number> = { comum: 35, incomum: 55, rara: 85, epica: 120, lendaria: 160 }

/** Patronos de quem a pessoa já tem bênção (as duplas dependem disso). */
export function patronosDe(reliquias: readonly TipoReliquia[]): Set<Patrono> {
  return new Set(reliquias.map((r) => RECOMPENSAS[r].patrono).filter((x): x is Patrono => !!x))
}

export const ehPoder = (r: Recompensa): r is TipoPoder => RECOMPENSAS[r].tipo === 'poder'
export const ehReliquia = (r: Recompensa): r is TipoReliquia => RECOMPENSAS[r].tipo === 'reliquia'
export const ehEvento = (r: Recompensa): r is TipoEvento => RECOMPENSAS[r].tipo === 'evento'
