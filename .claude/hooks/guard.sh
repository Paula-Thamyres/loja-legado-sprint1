#!/usr/bin/env bash
# PreToolUse (matcher: Bash): bloqueia o que o permissions.deny não pega.
# exit 2 = bloqueia e devolve o motivo (stderr) ao agente · exit 0 = deixa passar.
# Casa o .env como caminho, não como trecho de texto: process.env e .env.example passam.
set -uo pipefail

# stdin: {"tool_name":"Bash","tool_input":{"command":"..."}, ...}. Node no lugar do jq.
CMD="$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).tool_input?.command??"")}catch{}})')"

bloquear() {
  echo "guard.sh bloqueou: $CMD" >&2
  echo "Motivo: $1. Veja a seção \"Nunca\" do AGENTS.md." >&2
  exit 2
}

# .env precedido de início, espaço, / ou aspas, e seguido de fim, espaço, separador, aspas ou glob.
RE_ENV="(^|[[:space:]/=<>\"'])\\.env(\$|[[:space:];&|)\"'*])"

# grep -r / rg sem caminho, ou a partir da raiz, atravessa o .env.
busca_recursiva_na_raiz() {
  local palavras recursivo=0 argumentos=() p
  read -ra palavras <<< "$CMD"
  case "${palavras[0]:-}" in
    grep | egrep) ;;
    rg) recursivo=1 ;;
    *) return 1 ;;
  esac

  for p in "${palavras[@]:1}"; do
    case "$p" in
      --recursive) recursivo=1 ;;
      --*) ;;
      -*) [[ $p =~ ^-[[:alpha:]]*[rR] ]] && recursivo=1 ;;
      *) argumentos+=("$p") ;;
    esac
  done

  [ "$recursivo" -eq 1 ] || return 1
  # argumentos[0] é o padrão buscado; os demais são caminhos. Sem caminho = diretório atual.
  [ "${#argumentos[@]}" -le 1 ] && return 0
  for p in "${argumentos[@]:1}"; do
    case "$p" in
      . | ./ | ./\* | \* | .. | ../ | / | \~ | \~/) return 0 ;;
    esac
  done
  return 1
}

[[ $CMD =~ $RE_ENV ]] && bloquear "acesso ao .env (segredos)"
busca_recursiva_na_raiz && bloquear "busca recursiva a partir da raiz lê o .env; informe a pasta (ex.: src)"

exit 0
