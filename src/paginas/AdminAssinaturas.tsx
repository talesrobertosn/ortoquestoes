/**
 * Painel do administrador (rota #/admin). Desde 01/11/2026 é o painel 3.0, "Mesa de Comando do Atlas",
 * em src/admin/ (casca, rotas, dados, biblioteca de componentes e módulos). Este arquivo mantém o nome e
 * o export que App.tsx, util/preCarga.ts e os testes usam. A lista de assinaturas sai de
 * listar_assinaturas_admin (src/admin/dados/painel.tsx); sem permissão, o painel mostra "Acesso negado".
 */
export { PainelAdmin as AdminAssinaturas } from '../admin/Painel'
