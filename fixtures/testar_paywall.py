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
ENV_EXEMPLO = (RAIZ / ".env.example").read_text()
MIGRACAO_ADMIN = (RAIZ / "supabase/migrations/202609231450_admin_assinaturas.sql").read_text()
PAGINA_ADMIN = (RAIZ / "src/paginas/AdminAssinaturas.tsx").read_text()

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
):
    assert trecho in CRIAR_CHECKOUT, f"Contrato de checkout ausente: {trecho}"

assert "MERCADO_PAGO_SANDBOX_PAYER_EMAIL" not in CRIAR_CHECKOUT
assert "console." not in CRIAR_CHECKOUT
assert "external_reference: usuario.id" in CRIAR_CHECKOUT
assert "!payerEmail" in CRIAR_CHECKOUT
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

assert "estado?.status_assinatura === 'cancelada'" in RESUMO_ASSINATURA
assert "{ acao: 'sincronizar_cobranca' }" in RESUMO_ASSINATURA
assert "!proximoEstado.ultima_cobranca_em" not in RESUMO_ASSINATURA

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
