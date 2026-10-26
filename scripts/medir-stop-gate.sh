#!/usr/bin/env bash
# Mede o stop-gate: em três estados do código, compara a decisão do stop-gate original
# (branch gabarito) com a do stop-gate atual (.claude/hooks/stop-gate.sh).
# "Pronto falso" = o gate deixa o agente encerrar (exit 0) com a verificação do SPEC vermelha.
# Uso: bash scripts/medir-stop-gate.sh    (não altera o repositório: trabalha numa cópia temporária)
set -uo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git -C "$RAIZ" show gabarito:.claude/hooks/stop-gate.sh > "$TMP/gate-original.sh"
cp "$RAIZ/.claude/hooks/stop-gate.sh" "$TMP/gate-atual.sh"

preparar() { # $1 = nome do cenário; cria uma cópia limpa do projeto
  local dir="$TMP/$1"
  mkdir -p "$dir"
  git -C "$RAIZ" archive HEAD | tar -x -C "$dir"
  ln -s "$RAIZ/node_modules" "$dir/node_modules"
  echo "$dir"
}

verificacao() { # resultado real do comando de verificação do SPEC
  (cd "$1" && npm test --silent >/dev/null 2>&1 && npx --no-install tsc --noEmit >/dev/null 2>&1) && echo "verde" || echo "vermelha"
}

decisao() { # $1 = script do gate, $2 = diretório; imprime o exit code
  printf '{"hook_event_name":"Stop","permission_mode":"default","stop_hook_active":false}' \
    | CLAUDE_PROJECT_DIR="$2" bash "$1" >/dev/null 2>&1
  echo $?
}

VERDE="$(preparar verde)"

TESTE="$(preparar teste-vermelho)"
sed -i.bak 's/TETO_PERCENTUAL = 30/TETO_PERCENTUAL = 50/' "$TESTE/src/plugins/cupons/regras.ts"

TIPO="$(preparar so-tipo-vermelho)"
sed -i.bak 's/^        CuponsPlugin,$/        CuponsPlugin.init({ teto: 30 }),/' "$TIPO/src/vendure-config.ts"

echo "| Cenário | Verificação do SPEC | Gate original | Gate atual |"
echo "|---|---|---|---|"
for cenario in "verde:$VERDE" "teste vermelho (teto 50):$TESTE" "só tipo vermelho (plugin registrado errado):$TIPO"; do
  nome="${cenario%%:*}"; dir="${cenario#*:}"
  v="$(verificacao "$dir")"
  o="$(decisao "$TMP/gate-original.sh" "$dir")"
  a="$(decisao "$TMP/gate-atual.sh" "$dir")"
  rotulo() { [ "$1" = 0 ] && echo "exit 0 (deixa encerrar)" || echo "exit $1 (bloqueia)"; }
  echo "| $nome | $v | $(rotulo "$o") | $(rotulo "$a") |"
done
