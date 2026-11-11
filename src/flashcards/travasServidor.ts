import { LIMITES_HABILITADOS } from '../estado/limiteDiario'

// As travas do servidor dos flashcards ficam num arquivo só delas (11/11/2026): a página inicial lê
// RANKING_NO_SERVIDOR (pelas conquistas, flashcards/emblemas.ts), e importar a constante de servidor.ts
// trazia junto o código do jogo inteiro (uns 22 KB a mais no celular antes de a página aparecer).
/**
 * Beta público (13/10/2026, parte 18 do SQL aplicada): os flashcards consultam o servidor sempre que
 * VITE_FLASHCARDS_LIMITE=true. Quem decide se há limite é o próprio servidor, pela mesma chave das
 * questões (configuracao_comercial.paywall_ativo): com o paywall desligado, todos seguem sem limite;
 * ligado, o grátis tem 10 por 24 h e assinante, cortesia e administrador não têm limite.
 * O progresso e as corridas do ranking passam a ir para a conta.
 */
export const FLASHCARDS_NO_SERVIDOR = import.meta.env?.VITE_FLASHCARDS_LIMITE === 'true'
/** O cliente mostra o aviso do limite só quando o limite das questões também está ligado no build. */
export const AVISO_LIMITE_FLASHCARDS = LIMITES_HABILITADOS && FLASHCARDS_NO_SERVIDOR
/** Ranking no servidor (migration 202610130200_flashcards_ranking.sql): só com a outra trava e VITE_FLASHCARDS_RANKING=1. */
export const RANKING_NO_SERVIDOR = FLASHCARDS_NO_SERVIDOR && import.meta.env?.VITE_FLASHCARDS_RANKING === '1'
