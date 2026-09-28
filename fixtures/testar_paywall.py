"""Testes de contrato do limite diário sem depender de um Supabase remoto."""
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

RAIZ = Path(__file__).resolve().parents[1]
SQL = (RAIZ / "supabase/migrations/202609190001_paywall_planos.sql").read_text()
SUPABASE_CLIENTE = (RAIZ / "src/servicos/supabase.ts").read_text()
PAGINA_ENTRAR = (RAIZ / "src/paginas/Conta.tsx").read_text()
WORKFLOW_PUBLICACAO = (RAIZ / ".github/workflows/publicar.yml").read_text()
CRIAR_CHECKOUT = (RAIZ / "supabase/functions/criar-checkout/index.ts").read_text()
HTTP_COMPARTILHADO = (RAIZ / "supabase/functions/_shared/http.ts").read_text()
WEBHOOK_MERCADO_PAGO = (RAIZ / "supabase/functions/webhook-mercado-pago/index.ts").read_text()
COBRANCA_MERCADO_PAGO = (RAIZ / "supabase/functions/_shared/cobranca-mercado-pago.ts").read_text()
GERENCIAR_PLANO = (RAIZ / "supabase/functions/gerenciar-plano/index.ts").read_text()
RESUMO_ASSINATURA = (RAIZ / "src/componentes/ResumoAssinatura.tsx").read_text()
ROTEIRO_ROLLBACK = (RAIZ / "docs/ativacao-e-rollback-assinaturas.md").read_text()
ENV_EXEMPLO = (RAIZ / ".env.example").read_text()
MIGRACAO_ADMIN = (RAIZ / "supabase/migrations/202609231450_admin_assinaturas.sql").read_text()
MIGRACAO_ADMIN_EVENTOS = (RAIZ / "supabase/migrations/202609261540_admin_eventos.sql").read_text()
# O painel foi dividido em abas: a página e os componentes em componentes/admin.
PAGINA_ADMIN = (RAIZ / "src/paginas/AdminAssinaturas.tsx").read_text() + "".join(
    arquivo.read_text() for arquivo in sorted((RAIZ / "src/componentes/admin").glob("*.ts*")))
PAINEL_ADMIN = (RAIZ / "supabase/migrations/202609290100_painel_admin.sql").read_text()
PAGINA_ASSINATURA = (RAIZ / "src/paginas/Assinatura.tsx").read_text()
TERMOS = (RAIZ / "src/paginas/Termos.tsx").read_text()
CONDICOES_ASSINATURA = (RAIZ / "src/paginas/CondicoesAssinatura.tsx").read_text()
ACEITES_ASSINATURA = (RAIZ / "supabase/migrations/202609270900_aceites_assinatura.sql").read_text()
RANKING_MOVIMENTO = (RAIZ / "supabase/migrations/202609280001_ranking_movimento_diario.sql").read_text()
RANKING_RPG = (RAIZ / "supabase/migrations/202609280100_ranking_movimento_rpg.sql").read_text()
AVALIACOES_ADMIN = (RAIZ / "supabase/migrations/202609280200_avaliacoes_comentario_admin.sql").read_text()
PAGINA_RANKING = (RAIZ / "src/paginas/Ranking.tsx").read_text()
LIMITE_CLIENTE = (RAIZ / "src/estado/limiteDiario.ts").read_text()
AVISO_LIMITE = (RAIZ / "src/componentes/LimiteRespostas.tsx").read_text()
CABECALHO = (RAIZ / "src/componentes/Cabecalho.tsx").read_text()
CONTEXTO_CONTA = (RAIZ / "src/conta/ContextoConta.tsx").read_text()
VERSOES_TERMOS = (RAIZ / "src/conta/termos.ts").read_text()

# Retomar uma aba não equivale a fazer login novamente: preservar a rota e a
# sessão de questões. A navegação explícita fica restrita ao formulário.
assert "if (evento === 'SIGNED_IN'" not in CONTEXTO_CONTA
assert "signInWithPassword" in PAGINA_ENTRAR and "navegar('/')" in PAGINA_ENTRAR

# O bloqueio permanece visível em todas as rotas e após recarregar, mas some
# na liberação da cota ou quando uma assinatura vigente tira o limite.
for trecho in ("registrarBloqueioDiario(normalizado.liberaEm)", "lerBloqueioDiario", "limparBloqueioDiario"):
    assert trecho in LIMITE_CLIENTE, f"Persistência do limite ausente: {trecho}"
for trecho in ("AvisoBloqueioDiario", "EVENTO_DADOS", "setInterval", "obter_estado_conta", "formatarDuracao(faltam)"):
    assert trecho in AVISO_LIMITE, f"Aviso persistente ausente: {trecho}"
assert "<AvisoBloqueioDiario caminho={caminho} />" in CABECALHO

obrigatorios = [
    "paywall_ativo boolean not null default false",
    "limite_diario_gratis integer not null default 20",
    "pagamentos_ativos boolean not null default false",
    "primary key (id_usuario, chave_idempotencia)",
    "for update",
    "auth.uid()",
    "America/Sao_Paulo",
    "enable row level security",
]
for trecho in obrigatorios:
    assert trecho in SQL, f"Contrato ausente na migration: {trecho}"

# Planos e limite diário usam a sessão do cliente de conta; o login antigo,
# com cópia própria da sessão, senha enviada à mão e token no fragmento, saiu.
for trecho in ("from '../conta/supabase'", "onAuthStateChange", "resposta.status === 401", "buscarComPrazo"):
    assert trecho in SUPABASE_CLIENTE, f"Contrato de autenticação ausente: {trecho}"
for proibido in ("grant_type=password", "access_token=", "auth/v1/otp", "setSession"):
    assert proibido not in SUPABASE_CLIENTE, f"Resto do login antigo: {proibido}"

# A tela de entrada (/entrar e /conta) usa o cliente de conta do Supabase.
for trecho in ("'password'", "signInWithPassword", "Confirmar senha", "senha !== confirmacao", "resetPasswordForEmail"):
    assert trecho in PAGINA_ENTRAR, f"Interface de senha ausente: {trecho}"
for trecho in ("auth.updateUser({ password: novaSenha })", "Alterar senha", "auth.signOut({ scope: 'local' })"):
    assert trecho in PAGINA_ENTRAR, f"Gestão segura da sessão ausente: {trecho}"

assert "localStorage" not in PAGINA_ENTRAR
assert "console." not in PAGINA_ENTRAR
assert PAGINA_ENTRAR.count("acesso__enviar") == 1

for trecho in (
    "reason: planos[plano].reason",
    "frequency: planos[plano].frequency",
    "frequency_type: 'months'",
    "transaction_amount: planos[plano].transaction_amount",
    "currency_id: 'BRL'",
    "external_reference: usuario.id",
    "ambiente === 'teste' ? Deno.env.get('MERCADO_PAGO_PAYER_EMAIL_TESTE') : usuario.email",
    "X-Idempotency-Key",
    "checkout_requer_conta_teste",
    "MERCADO_PAGO_AMBIENTE",
    "MERCADO_PAGO_RESTRITO_CONTAS_TESTE",
    "aceite_confirmado !== true",
    "versoesCondicoesAceitas.includes(aceite_termos_versao)",
    "versao: aceite_termos_versao",
    "banco('aceites_assinatura'",
):
    assert trecho in CRIAR_CHECKOUT, f"Contrato de checkout ausente: {trecho}"

assert "MERCADO_PAGO_SANDBOX_PAYER_EMAIL" not in CRIAR_CHECKOUT
assert "console." not in CRIAR_CHECKOUT
assert "external_reference: usuario.id" in CRIAR_CHECKOUT
assert "!payerEmail" in CRIAR_CHECKOUT
# A versão das condições exibida no site é a vigente no servidor (primeira da lista).
import re as _re
_lista = _re.search(r"versoesCondicoesAceitas = \[([^\]]*)\]", CRIAR_CHECKOUT)
_site = _re.search(r"VERSAO_CONDICOES_ASSINATURA = '([^']+)'", VERSOES_TERMOS)
assert _lista and _site, "Versões das condições não encontradas"
_versoes = _re.findall(r"'([^']+)'", _lista.group(1))
assert _versoes[0] == _site.group(1), f"Site ({_site.group(1)}) e checkout ({_versoes[0]}) com versões diferentes"
_anterior = _re.search(r"VERSAO_CONDICOES_ANTERIOR = '([^']+)'", VERSOES_TERMOS)
assert not _anterior or _anterior.group(1) in _versoes, "Versão anterior do site precisa seguir aceita pelo checkout"
assert "create table if not exists public.aceites_assinatura" in ACEITES_ASSINATURA
assert "alter table public.aceites_assinatura enable row level security" in ACEITES_ASSINATURA
assert "revoke all on public.aceites_assinatura from anon, authenticated" in ACEITES_ASSINATURA
assert "create policy" not in ACEITES_ASSINATURA
assert "permitido: false, paywallAtivo: false" in LIMITE_CLIENTE
assert "Deno.env.get('MERCADO_PAGO_RESTRITO_CONTAS_TESTE') === 'true'" in HTTP_COMPARTILHADO
assert "&& origem && origensSandbox.has(origem)" in HTTP_COMPARTILHADO

for trecho in (
    "planoDaRecorrencia(preapproval.auto_recurring)",
    "recorrencia_desconhecida",
    "subscription_authorized_payment",
    "subscription_preapproval",
    "status === 'approved'",
    "statusMercadoPago === 'authorized'",
    "status === 'refunded' || status === 'charged_back'",
    "status === 'rejected'",
    "statusMercadoPago === 'pending' || statusMercadoPago === 'in_process'",
    "request-id:${requestId}",
):
    assert trecho in WEBHOOK_MERCADO_PAGO, f"Contrato de webhook ausente: {trecho}"

assert "IDs de plano no cliente" in ENV_EXEMPLO

for trecho in (
    "authorized_payments/${encodeURIComponent(id)}",
    "authorized_payments/search?preapproval_id=",
    "v1/payments/${encodeURIComponent(id)}",
    "fatura.preapproval_id === preapprovalId",
    "fatura.payment.status === 'approved'",
):
    assert trecho in COBRANCA_MERCADO_PAGO, f"Consulta oficial de cobrança ausente: {trecho}"

for trecho in (
    "const fatura = await consultarFatura(token, idRecurso)",
    "const pagamento = await consultarPagamento(token, String(fatura.payment.id))",
    "await aplicarCobranca(fatura.preapproval_id, pagamento, idEvento)",
    "if (!idAssinatura) return marcarEvento(idEvento, 'ignorado')",
    "ultima_cobranca_em: pagamento.date_approved",
    "statusAtual === 'cancelada'",
):
    assert trecho in WEBHOOK_MERCADO_PAGO, f"Conciliação de webhook ausente: {trecho}"

for trecho in (
    "acao === 'sincronizar_cobranca'",
    "assinatura.status !== 'ativa' && assinatura.status !== 'cancelada'",
    "!['approved', 'refunded'].includes(String(pagamento.status))",
    "assinatura.status !== 'cancelada'",
    "preapproval.status !== 'cancelled'",
    "Date.parse(pagamento.date_approved) !== Date.parse(assinatura.ultima_cobranca_em)",
    "status: 'reembolsada'",
    "'X-Idempotency-Key': `garantia-${assinatura.id}-${assinatura.ultima_cobranca_id}`",
    "'Content-Type': 'application/json'",
    "body: '{}'",
    "pagamentoAposReembolso.status !== 'refunded'",
    "mercado_pago_reembolso_recusado",
):
    assert trecho in GERENCIAR_PLANO, f"Garantia de cobrança ausente: {trecho}"

assert "statusAtual === 'cancelada'" in RESUMO_ASSINATURA
assert "{ acao: 'sincronizar_cobranca' }" in RESUMO_ASSINATURA
assert "!proximoEstado.ultima_cobranca_em" not in RESUMO_ASSINATURA
for trecho in ("Falha no pagamento", "Encerrada e reembolsada", "Pendente", "Renovação cancelada", "Em dia"):
    assert trecho in RESUMO_ASSINATURA, f"Mensagem de estado ausente: {trecho}"
for trecho in (
    "Desistir e solicitar reembolso integral",
    "Apenas impedir a próxima renovação",
    "Confirmar pedido de reembolso",
    "Confirmar fim das renovações",
    "gerenciar(acaoPendente)",
    "statusAtual === 'cancelada' && periodoPagoVigente",
):
    assert trecho in RESUMO_ASSINATURA, f"Escolha clara de cancelamento ausente: {trecho}"
assert "Cancelar plano" not in PAGINA_ASSINATURA, "Ação ambígua de cancelamento voltou à página de planos"
for trecho in ("paywall_ativo=false", "VITE_LIMITES_HABILITADOS=false", "WCS-52311", "atendimento manual", "sem confirmação do provedor"):
    assert trecho in ROTEIRO_ROLLBACK, f"Roteiro seguro incompleto: {trecho}"
for trecho in ("VITE_LIMITES_HABILITADOS", "acesso gratuito está sem limite diário nesta fase", "atendimento manual"):
    assert trecho in PAGINA_ASSINATURA, f"Informação pré-compra ausente: {trecho}"
assert "reembolso é integral e automático" not in PAGINA_ASSINATURA
for trecho in ("assinaturas opcionais", "R$ 39,90", "R$ 179,90", "R$ 239,90", "sete dias", "sem reembolso proporcional automático"):
    assert trecho in TERMOS, f"Termos de assinatura incompletos: {trecho}"
for trecho in ("R$ 39,90", "R$ 179,90", "R$ 239,90", "Mercado Pago", "não recebe nem armazena", "não há reembolso proporcional automático"):
    assert trecho in CONDICOES_ASSINATURA, f"Condições específicas incompletas: {trecho}"
for trecho in ("pedir(VERSAO_CONDICOES_ASSINATURA)", "aceite_termos_versao: versao", "aceite_confirmado: true", "Continuar para Mercado Pago"):
    assert trecho in PAGINA_ASSINATURA, f"Aceite pré-checkout ausente: {trecho}"

for trecho in (
    "create table if not exists public.administradores",
    "alter table public.administradores enable row level security",
    "revoke all on public.administradores from public, anon, authenticated",
    "security definer",
    "set search_path = ''",
    "where adm.id_usuario = auth.uid()",
    "raise exception 'acesso_negado'",
    "grant execute on function public.listar_assinaturas_admin() to authenticated",
):
    assert trecho in MIGRACAO_ADMIN, f"Proteção administrativa ausente: {trecho}"
assert "create policy" not in MIGRACAO_ADMIN
assert "listar_assinaturas_admin" in PAGINA_ADMIN
assert "Acesso negado" in PAGINA_ADMIN
for trecho in ("listar_eventos_pagamento_admin", "where adm.id_usuario = auth.uid()", "limit 200", "grant execute on function public.listar_eventos_pagamento_admin() to authenticated"):
    assert trecho in MIGRACAO_ADMIN_EVENTOS, f"Auditoria administrativa ausente: {trecho}"
assert "create policy" not in MIGRACAO_ADMIN_EVENTOS
for trecho in (
    "ranking_posicoes_diarias",
    "America/Sao_Paulo",
    "h.dia < hoje",
    "anterior.posicao - r.posicao",
    "enable row level security",
    "revoke all on public.ranking_posicoes_diarias from public, anon, authenticated",
    "grant execute on function public.obter_ranking_com_movimento(text) to authenticated",
):
    assert trecho in RANKING_MOVIMENTO, f"Histórico privado do ranking incompleto: {trecho}"
assert "usuario_id uuid" not in RANKING_MOVIMENTO.split("create function public.obter_ranking_com_movimento", 1)[1].split("language plpgsql", 1)[0]
assert "obter_ranking_com_movimento" in PAGINA_RANKING
assert "ranking:referencia:" not in PAGINA_RANKING
# Versão com subida na semana e selo de novato: segue privada, sem expor o
# identificador de ninguém, e aplicável sozinha (o retorno mudou, daí o drop).
for trecho in (
    "create table if not exists public.ranking_posicoes_diarias",
    "enable row level security",
    "revoke all on public.ranking_posicoes_diarias from public, anon, authenticated",
    "drop function if exists public.obter_ranking_com_movimento(text)",
    "variacao_semana",
    "h.dia >= hoje - 7",
    "r.posicao <= 50 or r.usuario_id = auth.uid()",
    "grant execute on function public.obter_ranking_com_movimento(text) to authenticated",
):
    assert trecho in RANKING_RPG, f"Ranking com movimento incompleto: {trecho}"
assert "usuario_id uuid" not in RANKING_RPG.split("create function public.obter_ranking_com_movimento", 1)[1].split("language plpgsql", 1)[0]
assert "linha.posicao <= 50" in PAGINA_RANKING, "A linha própria fora do top 50 não pode entrar na lista"
# As avaliações dos comentários só chegam ao painel de quem é administrador.
for trecho in (
    "security definer",
    "set search_path = ''",
    "where adm.id_usuario = auth.uid()",
    "raise exception 'acesso_negado'",
    "revoke all on function public.listar_avaliacoes_comentario_admin() from public, anon, authenticated",
    "for select to authenticated using (usuario_id = auth.uid())",
):
    assert trecho in AVALIACOES_ADMIN, f"Avaliações sem proteção administrativa: {trecho}"
# Painel novo: toda função administrativa passa por exigir_administrador, e
# a tabela de aparelhos só é acessível pelas funções (sem policy nem grant).
for funcao in ("resumo_admin", "listar_usuarios_admin", "listar_assinaturas_admin", "listar_eventos_pagamento_admin"):
    corpo = PAINEL_ADMIN.split(f"function public.{funcao}()", 1)[1].split("end $$;", 1)[0]
    assert "perform public.exigir_administrador();" in corpo, f"{funcao} sem checagem de administrador"
    assert f"revoke all on function public.{funcao}() from public, anon, authenticated;" in PAINEL_ADMIN
assert "revoke all on public.sessoes_aparelho from public, anon, authenticated;" in PAINEL_ADMIN
assert "create policy" not in PAINEL_ADMIN
for funcao in ("registrar_aparelho(text, text)", "sinal_aparelho(text)"):
    assert f"grant execute on function public.{funcao} to authenticated;" in PAINEL_ADMIN
for trecho in ("listar_eventos_pagamento_admin", "status_processamento === 'erro'", "webhook-mercado-pago?acao=reprocessar"):
    assert trecho in PAGINA_ADMIN, f"Reprocessamento administrativo ausente: {trecho}"
for trecho in ("usuarioDoPedido(req)", "administradores?id_usuario", "status_processamento=eq.erro", "EdgeRuntime.waitUntil(processar", "x-signature"):
    assert trecho in WEBHOOK_MERCADO_PAGO, f"Proteção do webhook ausente: {trecho}"

for fonte in (CRIAR_CHECKOUT, WEBHOOK_MERCADO_PAGO, ENV_EXEMPLO):
    assert "preapproval_plan_id" not in fonte

for trecho in (
    "VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}",
    "VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}",
):
    assert trecho in WORKFLOW_PUBLICACAO, f"Variável pública ausente no build: {trecho}"

# UTC atravessa o dia antes de São Paulo: a chave canônica ainda deve ser a anterior.
instante = datetime(2026, 9, 20, 1, 30, tzinfo=timezone.utc)
assert instante.astimezone(ZoneInfo("America/Sao_Paulo")).date().isoformat() == "2026-09-19"

# Verão/inverno não devem ser codificados no cliente como deslocamento manual.
for iso in ("2026-01-15T03:00:00+00:00", "2026-07-15T03:00:00+00:00"):
    instante = datetime.fromisoformat(iso)
    assert instante.astimezone(ZoneInfo("America/Sao_Paulo")).hour == 0

print("Contrato do paywall e fuso canônico: todos corretos.")
