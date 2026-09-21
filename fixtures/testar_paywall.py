"""Testes de contrato do limite diário sem depender de um Supabase remoto."""
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

RAIZ = Path(__file__).resolve().parents[1]
SQL = (RAIZ / "supabase/migrations/202609190001_paywall_planos.sql").read_text()
SUPABASE_CLIENTE = (RAIZ / "src/servicos/supabase.ts").read_text()
PAGINA_ENTRAR = (RAIZ / "src/paginas/Entrar.tsx").read_text()
WORKFLOW_PUBLICACAO = (RAIZ / ".github/workflows/publicar.yml").read_text()
CRIAR_CHECKOUT = (RAIZ / "supabase/functions/criar-checkout/index.ts").read_text()
WEBHOOK_MERCADO_PAGO = (RAIZ / "supabase/functions/webhook-mercado-pago/index.ts").read_text()
ENV_EXEMPLO = (RAIZ / ".env.example").read_text()

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

for trecho in (
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "fragmento.indexOf('access_token=')",
    "base64.padEnd",
):
    assert trecho in SUPABASE_CLIENTE, f"Contrato de autenticação ausente: {trecho}"

for trecho in (
    "/auth/v1/token?grant_type=password",
    "body: JSON.stringify({ email, password: senha })",
    "clienteConta.auth.setSession",
    "evento === 'SIGNED_OUT'",
    "evento === 'TOKEN_REFRESHED'",
):
    assert trecho in SUPABASE_CLIENTE, f"Contrato de senha ausente: {trecho}"

for trecho in ("type=\"password\"", "Entrar com senha", "Enviar link mágico"):
    assert trecho in PAGINA_ENTRAR, f"Interface de senha ausente: {trecho}"

assert "localStorage" not in PAGINA_ENTRAR
assert "console." not in PAGINA_ENTRAR
assert PAGINA_ENTRAR.count('type="submit"') == 1

for trecho in (
    "MERCADO_PAGO_PLANO_MENSAL_ID",
    "MERCADO_PAGO_PLANO_SEMESTRAL_ID",
    "MERCADO_PAGO_PLANO_ANUAL_ID",
    "preapproval_plan_id: preapprovalPlanId",
    "external_reference: usuario.id",
    "payer_email: usuario.email",
    "X-Idempotency-Key",
    "checkout_sandbox_requer_conta_teste",
    "MERCADO_PAGO_AMBIENTE",
):
    assert trecho in CRIAR_CHECKOUT, f"Contrato de checkout ausente: {trecho}"

for trecho in (
    "preapproval_plan_desconhecido",
    "preapproval.preapproval_plan_id",
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

for trecho in ("MERCADO_PAGO_PLANO_MENSAL_ID", "MERCADO_PAGO_PLANO_SEMESTRAL_ID", "MERCADO_PAGO_PLANO_ANUAL_ID"):
    assert trecho in ENV_EXEMPLO, f"Variável privada de plano ausente: {trecho}"

for fonte in (CRIAR_CHECKOUT, WEBHOOK_MERCADO_PAGO, ENV_EXEMPLO):
    assert "preapproval_plan_id: '" not in fonte
    assert 'preapproval_plan_id: "' not in fonte

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
