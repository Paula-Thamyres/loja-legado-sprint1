#!/usr/bin/env bash
# Stop hook: decide se o agente pode encerrar o turno.
# "Pronto" é o comando de verificação do SPEC.md: npm test E npx tsc --noEmit.
# O stop-gate original só rodava npm test, então um erro de tipo (por exemplo, no registro
# do plugin em src/vendure-config.ts, que nenhum teste importa) passava como "pronto".
#
# exit 2 = o agente continua e recebe o motivo no stderr · exit 0 = pode encerrar.
# Freios:
#   1. plan mode: planejar não é implementar; sai 0 sem verificar.
#   2. circuit breaker: no máximo MAX_VOLTAS bloqueios seguidos; depois devolve para o humano.
#   3. stop_hook_active false = primeira tentativa de parar neste turno: o contador zera.
set -uo pipefail

MAX_VOLTAS="${MAX_VOLTAS:-3}"
COUNT_FILE=".claude/.loop-count"
FILTRO_ERROS='FAIL|×|✗|Error|error TS|expected|Received|Expected|Test Files|Tests '

read -r MODO ATIVO < <(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{let j={};try{j=JSON.parse(d)}catch{};process.stdout.write(`${j.permission_mode??"default"} ${j.stop_hook_active===true}\n`)})')

[ "$MODO" = "plan" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
mkdir -p .claude
[ "$ATIVO" != "true" ] && rm -f "$COUNT_FILE"

# Roda as duas verificações e guarda qual falhou.
FALHAS=()
SAIDA_TESTES="$(npm test --silent 2>&1)" || FALHAS+=("npm test")
SAIDA_TIPOS=""
if [ -f tsconfig.json ]; then
  SAIDA_TIPOS="$(npx --no-install tsc --noEmit 2>&1)" || FALHAS+=("npx tsc --noEmit")
fi

if [ "${#FALHAS[@]}" -eq 0 ]; then
  rm -f "$COUNT_FILE"
  exit 0
fi

N=$(( $(cat "$COUNT_FILE" 2>/dev/null || echo 0) + 1 ))
QUAIS="${FALHAS[0]}"
[ "${#FALHAS[@]}" -gt 1 ] && QUAIS="$QUAIS e ${FALHAS[1]}"

if [ "$N" -gt "$MAX_VOLTAS" ]; then
  rm -f "$COUNT_FILE"
  # Com exit 0 o stderr não aparece; o aviso vai em stdout como systemMessage, que o Claude Code mostra ao dev.
  printf '{"systemMessage":"stop-gate: circuit breaker depois de %s voltas; %s ainda vermelho, devolvendo para você."}\n' "$MAX_VOLTAS" "$QUAIS"
  exit 0
fi

echo "$N" > "$COUNT_FILE"
echo "stop-gate: volta $N/$MAX_VOLTAS. Falhou: $QUAIS. Não encerre: corrija e rode a verificação do SPEC.md (npm test && npx tsc --noEmit)." >&2
printf '%s\n%s\n' "$SAIDA_TESTES" "$SAIDA_TIPOS" | grep -E "$FILTRO_ERROS" | head -n 25 >&2
exit 2
