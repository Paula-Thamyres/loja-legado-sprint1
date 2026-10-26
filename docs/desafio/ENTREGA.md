# Desafio da Sprint 1 · trilha dev

Os três níveis foram feitos no próprio `loja-legado`. Os números estão no [placar](../placar.md), cada um com o comando que o gera.

## N1 · Harness Builder

- `CLAUDE.md` de 910 linhas para 6, importando o `AGENTS.md` com o que é único deste projeto: comandos, onde as coisas ficam, regras de dinheiro, imposto e promoção, e a lista "Nunca".
- Memória no `/context`: 16,2k → 1,5k tokens (−91%). Sessão vazia: 46,2k → 31,5k tokens.
- `.env` negado em `permissions.deny`; `guard.sh` bloqueando o que o deny não pega (o `.env` citado num comando e busca recursiva a partir da raiz).
- Provas com o agente: a leitura do `.env` foi barrada pela permissão e o `grep -r PAGAMENTO .` pelo `guard.sh`. As mensagens estão no placar.

## N2 · Loop Closer

O que construí:

1. **Stop-gate que verifica o "pronto" inteiro.** O `stop-gate.sh` que veio pronto só rodava `npm test`. A spec define pronto como `npm test && npx tsc --noEmit`, e o registro do plugin em `src/vendure-config.ts` não é importado por nenhum teste. Um erro de tipo ali passava como pronto. O gate novo roda as duas verificações e diz qual falhou.
2. **`scripts/placar.mjs`**, que lê a saída `stream-json` de uma sessão e calcula turnos, custo estimado, contexto, edições com teste vermelho, voltas do stop-gate, ações bloqueadas e perguntas ao dev.

Comando que mede: `bash scripts/medir-stop-gate.sh`, que compara o gate original e o atual em três estados do código, numa cópia temporária.

Antes → depois:

- "Pronto" com a verificação vermelha: 1 de 3 cenários no gate original → 0 de 3 no atual.
- Tarefa 01 (sem harness) → tarefa 04 (com spec, plano e loop): teste de aceite vermelho → verde (15 de 15); 1 arquivo fora do escopo → 0; teto de 50% inventado pelo agente → 30%; custo estimado US$ 0,21 → US$ 0,25; 0 intervenções nas duas.

## N3 · Spec Verifier

Pergunta: o teste verde prova a regra "ninguém consegue configurar desconto percentual acima de 30%"? Não. `test/cupom.test.ts` prova a conta da action nova com objetos falsos; as actions percentuais nativas do Vendure continuavam registradas e aceitavam 50%.

- Spec: [`docs/desafio/SPEC-teto-ponta-a-ponta.md`](SPEC-teto-ponta-a-ponta.md), com as duas formas de verificar comparadas (unitário ~1 s, e2e ~8 s com quatro devDependencies).
- Teste: `test-e2e/teto-desconto.e2e-spec.ts`, com `@vendure/testing`, servidor Vendure e banco SQLite via sql.js, Admin API e Shop API.
- Vermelho antes: 1 caso verde (o cupom de 50% com a action do plugin desconta só 30% num pedido real) e 2 vermelhos (as actions nativas apareciam no admin, e criar uma promoção de 50% com `order_percentage_discount` funcionava).
- Decisão: tirar da configuração as actions `order_percentage_discount`, `products_percentage_discount` e `facet_based_discount`, num passo separado de `configurarCupons`, para não quebrar o teste de aceite R7.
- Verde depois: `npm run test:e2e` com 3 de 3.
- O que este teste prova e o anterior não provava: que a regra vale na loja de verdade. O plugin está registrado, o admin não consegue configurar desconto percentual acima de 30% e o cliente recebe exatamente 30% no pedido.
- Fontes:
  - https://docs.vendure.io/current/core/developer-guide/testing
  - https://docs.vendure.io/current/core/reference/typescript-api/testing/test-server
  - https://docs.vendure.io/current/core/core-concepts/promotions
  - https://docs.vendure.io/current/core/reference/typescript-api/promotions/promotion-options

## Post para o Discord

```
[Desafio S1] Paula Femina · loja-legado (fork: https://github.com/Paula-Thamyres/loja-legado-sprint1) · Trilha dev
🧱 N1 Harness Builder: memória no /context 16,2k → 1,5k tokens (−91%); CLAUDE.md 910 → 6 linhas · AGENTS.md: https://github.com/Paula-Thamyres/loja-legado-sprint1/blob/main/AGENTS.md · spec: https://github.com/Paula-Thamyres/loja-legado-sprint1/blob/main/SPEC.md · hook bloqueando: https://github.com/Paula-Thamyres/loja-legado-sprint1/blob/main/docs/placar.md#provas-do-harness-tarefa-02
🔁 N2 Loop Closer: stop-gate que verifica npm test e tsc (o original só rodava npm test) e um placar das sessões · bash scripts/medir-stop-gate.sh e node scripts/placar.mjs docs/sessoes/*.jsonl · "pronto" com verificação vermelha 1/3 → 0/3; tarefa 01 → 04: teste de aceite vermelho → verde, 1 arquivo fora do escopo → 0, US$ 0,21 → US$ 0,25, 0 intervenções
📐 N3 Spec Verifier: docs.vendure.io (testing, TestServer, promotions, PromotionOptions) · tirar as actions percentuais nativas da config · e2e com @vendure/testing: 1 ✓ 2 × antes → 3 ✓ depois
Uma coisa que eu faria diferente: escreveria o teste e2e já na tarefa 03. O teste unitário verde deixou passar que o admin ainda conseguia criar um desconto de 50% com as actions nativas.
```

## Autoavaliação

- [x] O `CLAUDE.md` não tem frase que serviria para qualquer outro projeto, e os tokens foram medidos antes e depois (`/context` e `npm run conferir -- 02`).
- [x] A linha que decide "bloquear": `.claude/hooks/guard.sh`, linhas 49 e 50. A que decide "pode parar": `.claude/hooks/stop-gate.sh`, linha 34.
- [x] A spec tem restrições do tipo "não fazer X" (seção "Restrições" do `SPEC.md`).
- [x] O critério de pronto é um comando: `npm test && npx tsc --noEmit` (e `npm run test:e2e` no N3).
- [x] O agente não alterou teste: `npm run conferir -- 04` mostra "test/cupom.test.ts igual ao do gabarito".
- [x] Todo número citado vem com o comando que o gerou (placar).
- [x] No N3, as fontes têm URL, e está escrito o que o teste e2e prova que o unitário não provava.
- [x] Nada de empresa real: a loja e as pessoas citadas são do exercício.
