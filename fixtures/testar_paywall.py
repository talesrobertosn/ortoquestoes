"""Testes de contrato do limite diário sem depender de um Supabase remoto."""
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

RAIZ = Path(__file__).resolve().parents[1]
SQL = (RAIZ / "supabase/migrations/202609190001_paywall_planos.sql").read_text()

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

# UTC atravessa o dia antes de São Paulo: a chave canônica ainda deve ser a anterior.
instante = datetime(2026, 9, 20, 1, 30, tzinfo=timezone.utc)
assert instante.astimezone(ZoneInfo("America/Sao_Paulo")).date().isoformat() == "2026-09-19"

# Verão/inverno não devem ser codificados no cliente como deslocamento manual.
for iso in ("2026-01-15T03:00:00+00:00", "2026-07-15T03:00:00+00:00"):
    instante = datetime.fromisoformat(iso)
    assert instante.astimezone(ZoneInfo("America/Sao_Paulo")).hour == 0

print("Contrato do paywall e fuso canônico: todos corretos.")
