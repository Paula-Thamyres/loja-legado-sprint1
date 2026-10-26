# Placar da Sprint 1

Todas as sessões foram rodadas com o Claude Code 2.1.310, modelo `claude-sonnet-5-5`, em modo não interativo, salvando a saída completa:

```bash
claude -p "<prompt>" --output-format stream-json --verbose > docs/sessoes/<sessao>.jsonl
```

Sem a tela interativa não há statusline; os números saem do mesmo campo que ela lê (`total_cost_usd`, estimativa a preço de tabela) e do uso de tokens de cada resposta. Os registros estão em `docs/sessoes/`, reduzidos ao que o placar usa.

## Contexto fixo: antes e depois do harness (tarefas 00 e 02)

| | Antes | Depois | Comando |
|---|---|---|---|
| Memory files no `/context` | 16,2k tokens | 1,5k tokens (−91%) | `claude -p "/context"` |
| Sessão vazia no `/context` | 46,2k tokens | 31,5k tokens (−32%) | `claude -p "/context"` |
| `CLAUDE.md` | 910 linhas, ~9.100 tokens estimados | 6 linhas, ~100 tokens estimados | `npm run conferir -- 02` |
| `CLAUDE.md` + `AGENTS.md` | ~9.400 tokens estimados | ~800 tokens estimados | `npm run conferir -- 02` |

A saída completa do `/context` está em `docs/sessoes/00-context-antes.md` e `docs/sessoes/02-context-depois.md`. A estimativa do `conferir` (caracteres ÷ 4) fica abaixo da contagem real porque texto em português gasta mais tokens por caractere.

## Sessões do agente

Gerado com `node scripts/placar.mjs docs/sessoes/*.jsonl`:

| Sessão | Turnos | Custo estimado | Duração | Contexto no fim | Edições com teste vermelho | Voltas do stop-gate | Ações bloqueadas | Perguntas ao dev |
|---|---|---|---|---|---|---|---|---|
| 01-pedido-vago | 5 | US$ 0,21 | 68 s | 63.232 tok | 0 | 0 | 0 | 0 |
| 02-prova-deny-env | 2 | US$ 0,04 | 9 s | 38.892 tok | 0 | 0 | 1 | 0 |
| 02-prova-guard-grep | 2 | US$ 0,04 | 5 s | 39.022 tok | 0 | 0 | 1 | 0 |
| 03-plano-arquivo-v1 | 11 | US$ 0,21 | 76 s | 52.568 tok | 0 | 0 | 4 | 0 |
| 03-plano-arquivo | 12 | US$ 0,23 | 72 s | 56.335 tok | 0 | 0 | 2 | 0 |
| 03-plano-plan-mode | 10 | US$ 0,20 | 56 s | 59.198 tok | 0 | 0 | 0 | 0 |
| 04-loop | 17 | US$ 0,25 | 60 s | 58.267 tok | 3 | 0 | 1 | 0 |
| 05-intermediaria | 14 | US$ 0,23 | 65 s | 54.314 tok | 1 | 0 | 1 | 0 |
| 06-n3-teto-ponta-a-ponta | 13 | US$ 0,18 | 81 s | 47.678 tok | 0 | 0 | 1 | 0 |

"Ações bloqueadas" soma permissões negadas e bloqueios de hook. "Edições com teste vermelho" são as vezes em que o `test-after-edit.sh` devolveu falha ao agente.

## Tarefa 01 contra tarefa 04

| | 01 · pedido vago, sem harness | 04 · spec, plano e loop |
|---|---|---|
| Prompt | `adiciona cupom de desconto no carrinho` | o que / onde / como / critério de pronto, apontando `SPEC.md` e `docs/plano.md` |
| Teste de aceite (`test/cupom.test.ts`) | vermelho: o arquivo nem carrega, porque o agente usou outros nomes | verde: 15 de 15 |
| Teto | 50%, escolhido pelo agente | 30%, como pede o financeiro |
| Arquivos fora de `src/plugins/cupons/` e `src/vendure-config.ts` | 1 (`test/cupons.test.ts`, teste próprio) | 0 |
| Custo estimado | US$ 0,21 | US$ 0,25 |
| Perguntas ao dev | 0 | 0 |

O custo ficou parecido. A diferença está no resultado: a tarefa 01 entregou uma feature que o teste da PO recusa, e a 04 entregou o que a spec pede, revisada pelo `revisor-codigo`. As 3 edições vermelhas da 04 são o loop funcionando: o `test-after-edit.sh` avisou que o teste de aceite ainda não carregava até o `index.ts` existir.

Arquivos tocados na tarefa 01, anotados antes do reset (`git status --short`):

```
 M src/vendure-config.ts
A  test/cupom.test.ts
?? src/plugins/
?? test/cupons.test.ts
```

## Plano em arquivo contra plan mode (tarefa 03)

| | Custo estimado | Fica guardado para a próxima sessão |
|---|---|---|
| Plano em `docs/plano.md` | US$ 0,23 | sim |
| Mesmo pedido em plan mode | US$ 0,20 | não |

Nesta medição o plan mode saiu um pouco mais barato, ao contrário do exemplo do curso. O plano em arquivo continuou valendo a diferença: a primeira versão levantou perguntas que viraram correções na spec (commit "ajusta a spec com as perguntas abertas do primeiro plano"), e a segunda foi a base da tarefa 04.

## Provas do harness (tarefa 02)

Pedido ao agente: ler o `.env` com a ferramenta Read. Quem barrou foi a **permissão** (`permissions.deny`):

```
File is in a directory that is denied by your permission settings.
```

Pedido ao agente: rodar `grep -r PAGAMENTO .`. Quem barrou foi o **guard.sh** (hook `PreToolUse`):

```
PreToolUse:Bash hook error: ["$CLAUDE_PROJECT_DIR"/.claude/hooks/guard.sh]: guard.sh bloqueou: grep -r PAGAMENTO .
Motivo: busca recursiva a partir da raiz lê o .env; informe a pasta (ex.: src). Veja a seção "Nunca" do AGENTS.md.
```

Na primeira tentativa, com o pedido direto "mostre o conteúdo do .env", o agente recusou sozinho por causa da regra do `AGENTS.md`, sem chegar a usar uma ferramenta: a instrução funcionou como pedido; a permissão e o hook são a garantia.

## Stop-gate original contra o atual (Desafio N2)

Gerado com `bash scripts/medir-stop-gate.sh`:

| Cenário | Verificação do SPEC | Gate original | Gate atual |
|---|---|---|---|
| verde | verde | exit 0 (deixa encerrar) | exit 0 (deixa encerrar) |
| teste vermelho (teto 50) | vermelha | exit 2 (bloqueia) | exit 2 (bloqueia) |
| só tipo vermelho (plugin registrado errado) | vermelha | exit 0 (deixa encerrar) | exit 2 (bloqueia) |

"Pronto" com a verificação vermelha: 1 de 3 cenários no gate original, 0 de 3 no atual.
