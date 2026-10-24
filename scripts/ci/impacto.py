#!/usr/bin/env python3
"""True se a diferença exige a suíte/build. Incerteza sempre executa tudo."""
import subprocess
import sys


def apenas_documentacao(caminhos):
    # Este documento é lido por testar_paywall.py: continua exigindo a suíte.
    entrada_de_teste = 'docs/ativacao-e-rollback-assinaturas.md'
    return all(
        p != entrada_de_teste and (
            (p.startswith('docs/') and p.endswith('.md'))
            or p in {'AGENTS.md', 'CLAUDE.md', 'README.md', 'LICENSE'}
        ) for p in caminhos
    )


def exige_execucao(base, head):
    try:
        diff = subprocess.check_output(
            ['git', 'diff', '--no-renames', '--name-only', '-z', base, head, '--'],
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        return True
    return not apenas_documentacao(diff.decode('utf-8', errors='replace').split('\0')[:-1])


if __name__ == '__main__':
    print(str(exige_execucao(*sys.argv[1:])).lower())
