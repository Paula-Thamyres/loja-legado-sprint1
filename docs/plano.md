> Plano gerado pelo Claude Code numa sessão nova, fora do plan mode, a partir deste prompt:
>
> O que: um plano de implementação do SPEC.md (cupom com teto de 30%). Onde: escreva só o arquivo docs/plano.md; não crie nem altere nada em src/ ou test/. Como: leia o SPEC.md, o AGENTS.md, os exemplos oficiais de promoção citados no AGENTS.md e o teste de aceite na branch gabarito (git show gabarito:test/cupom.test.ts, só leitura). No plano: arquivos a criar ou alterar, a ordem dos passos, qual regra do SPEC cada passo cobre (tabela), como verificar cada passo e as perguntas abertas. Inclua um diagrama simples em texto. Critério de pronto: docs/plano.md existe e git status mostra só esse arquivo novo.

# Plano: cupom com teto de 30% (plugin `cupons`)

Spec: `SPEC.md`. Teste de aceite: `test/cupom.test.ts` na branch `gabarito` (só leitura, não existe em `main` ainda).
Este documento é só o plano. Nada em `src/` ou `test/` foi alterado.

## O que existe hoje

- `src/plugins/` não existe; `docs/` também não existia.
- `src/vendure-config.ts` tem o array `plugins` (Graphiql, AssetServer, Scheduler, JobQueue, Search, Email, Dashboard) e um `TODO(Fulano, 2025): cupons`. O TODO fica como está (fora do escopo da spec).
- Em `main` só há `test/preco.test.ts` e `test/utils.test.ts`.

## O que os exemplos oficiais e o teste mostram

- `orderPercentageDiscount` é um `PromotionOrderAction` com `code`, `args`, `execute(ctx, order, args)` e `description`. A base é `ctx.channel.pricesIncludeTax ? order.subTotalWithTax : order.subTotal`. Ele devolve `-total * pct/100`, sem arredondar e sem teto. É isso que a nossa action corrige.
- `minimumOrderAmount` é um `PromotionCondition` com `code`, `args`, `check(ctx, order, args)`, `priorityValue` e `description`.
- Os wrappers convertem `args` de array `[{name, value}]` para objeto (`argsArrayToHash`). Então o `execute`/`check` que escrevemos recebe `args.pct` já como número (arg `type: 'int'`). O teste chama `descontoPercentualComTeto.execute(ctx, order, [{name:'pct', value:'50'}], estado, promo)`.
- O teste usa `configurarCupons(config)` com um `config` parcial e lê o **retorno** (`resultado.promotionOptions...`). Então a função precisa devolver o config e não pode assumir que `promotionActions`/`promotionConditions` existem.
- O teste importa de `'../src/plugins/cupons'`, ou seja, do `index.ts`.

## Diagrama

```
                Promotion nativa (código, datas, limites de uso)   <- não mexer
                                   |
                usa actions/conditions de config.promotionOptions
                                   |
 vendure-config.ts --plugins--> CuponsPlugin --configuration--> configurarCupons(config)
                                                                   |
                       acrescenta (sem substituir) às listas nativas
                                   |                          |
                 descontoPercentualComTeto             cupomUnico
                 (PromotionOrderAction)                (PromotionCondition)
                                   |                          |
                                   +---- usam ---- regras.ts (funções puras, sem Vendure)
                                                   TETO_PERCENTUAL = 30
```

## Arquivos

| Ação | Arquivo | Conteúdo |
|---|---|---|
| criar | `src/plugins/cupons/regras.ts` | `TETO_PERCENTUAL = 30`; `calcularDesconto(base, pct)`; `temCupomUnico(couponCodes)`; `temLinhas(lines)`. Só números e arrays, sem import do Vendure. |
| criar | `src/plugins/cupons/promocoes.ts` | `descontoPercentualComTeto` (`PromotionOrderAction`, arg `pct` int) e `cupomUnico` (`PromotionCondition`, sem args). Escolhe a base pelo canal e delega a conta a `regras.ts`. |
| criar | `src/plugins/cupons/cupons.plugin.ts` | `configurarCupons(config)` e `CuponsPlugin` (`@VendurePlugin` com `imports: [PluginCommonModule]` e `configuration: configurarCupons`). |
| criar | `src/plugins/cupons/index.ts` | `export *` dos três arquivos. |
| alterar | `src/vendure-config.ts` | Import de `CuponsPlugin` e uma linha no array `plugins`. Nada mais. |
| trazer | `test/cupom.test.ts` | `git checkout gabarito -- test/cupom.test.ts`, sem editar (feito pelo dev, conforme a spec). |

Não tocar: `src/misc/`, `src/stuff/`, `src/utils/`, testes existentes, `.env`, `vendure.sqlite`, migrations, `synchronize`, `package.json`. Sem entidade, resolver ou endpoint. Sem testes novos.

## Passos, em ordem

| # | Passo | Regras | Como verificar |
|---|---|---|---|
| 0 | Trazer o teste de aceite: `git checkout gabarito -- test/cupom.test.ts`. | critério de aceite | `npm test`: falha esperada só em `cupom.test.ts` (import inexistente); `preco` e `utils` verdes. |
| 1 | `regras.ts`: `TETO_PERCENTUAL = 30`. `calcularDesconto(base, pct)`: `efetivo = Math.min(Math.max(pct, 0), TETO_PERCENTUAL)`; `valor = Math.round(base * efetivo / 100)`; retorna `valor === 0 ? 0 : -valor` (evita `-0`). `temCupomUnico(codes)`: `codes.length <= 1`. `temLinhas(lines)`: `lines.length > 0`. Um único `Math.round`, no fim. | R1, R2, R3, R5, R6 | À mão: (10000, 50) -> -3000; (3333, 10) -> -333; (10000, -5) e (10000, 0) -> `0` com `Object.is(x, 0)`. `npx tsc --noEmit`. |
| 2 | `promocoes.ts`: `descontoPercentualComTeto = new PromotionOrderAction({ code: 'desconto_percentual_com_teto', args: { pct: { type: 'int', ui: { component: 'number-form-input', suffix: '%', min: 0 } } }, execute, description: [pt_BR, en] })`. `execute`: `base = ctx.channel.pricesIncludeTax ? order.subTotalWithTax : order.subTotal`; retorna `calcularDesconto(base, args.pct)`. `cupomUnico = new PromotionCondition({ code: 'cupom_unico', args: {}, check, description: [pt_BR, en] })`; `check`: `temLinhas(order.lines) && temCupomUnico(order.couponCodes)`. | R1 a R6 (R4 aqui) | `npx tsc --noEmit` (tipos de `args` inferidos). |
| 3 | `cupons.plugin.ts`: `configurarCupons(config)` faz `config.promotionOptions.promotionActions = [...(config.promotionOptions.promotionActions ?? []), descontoPercentualComTeto]` e o análogo para conditions; retorna `config`. `CuponsPlugin` liga isso em `configuration`. Ordem exigida pelo teste: nativas primeiro, nova por último. | R7 | `npx tsc --noEmit`. |
| 4 | `index.ts` reexportando `regras`, `promocoes` e `cupons.plugin`. | R7 (import do teste) | `npm test`: `cupom.test.ts` passa a resolver o import. |
| 5 | `vendure-config.ts`: import de `CuponsPlugin` (de `./plugins/cupons`) e `CuponsPlugin,` no array `plugins`. Sem `init()` e sem variável de ambiente (a spec não pede configuração). | R7 (registro) | `npx tsc --noEmit` com o plugin registrado; `git diff src/vendure-config.ts` com 2 linhas a mais. |
| 6 | Verificação final: `npm test && npx tsc --noEmit`. | critério de aceite | Tudo verde; `git diff gabarito -- test/cupom.test.ts` vazio; `git status` só com `src/plugins/cupons/*`, `src/vendure-config.ts` e `test/cupom.test.ts`. |
| 7 | Pedir ao subagente `revisor-codigo` a revisão do diff contra o `SPEC.md`, antes de dizer pronto. | todas | Relatório sem pendência. |

Obs.: o hook `test-after-edit.sh` roda `npm test` a cada Edit/Write em `src/` ou `test/`, então os passos 1 a 3 podem mostrar vermelho até o `index.ts` existir. É esperado; o que vale é o verde do passo 6. O `stop-gate.sh` não deixa encerrar com teste vermelho, então não encerrar antes do passo 6.

## Cobertura das regras

| Regra | Passo | Teste do gabarito que a cobre |
|---|---|---|
| R1 teto 30% (`TETO_PERCENTUAL`) | 1, 2 | "percentual simples", "teto de 30%" |
| R2 centavos com `Math.round` | 1 | "centavos inteiros" (-333) |
| R3 sinal negativo, `pct` negativo = 0, sem `-0` | 1 | "nunca devolve positivo" (não cobre `pct` negativo nem `-0`; ver pergunta 1) |
| R4 base conforme `pricesIncludeTax` | 2 | os dois testes de R4 |
| R5 cupom único | 1, 2 | "aceita um cupom e recusa dois" |
| R6 pedido vazio | 1, 2 | "recusa pedido sem linhas" |
| R7 registro sem substituir, snake_case, descrições | 2, 3, 5 | bloco "registro no config" |

## Perguntas abertas

1. **R3 sem teste**: o aceite só passa `pct` de 0 a 99 e compara com `<= 0` (que aceita `-0`). `pct` negativo e `-0` ficam sem cobertura, e a spec proíbe teste novo. Proposta: conferir à mão no passo 1 e registrar no relatório. Pode ser?
2. **`pct` fora do normal** (`NaN`, não inteiro): o arg é `int`, então o Vendure valida na entrada. Proposta: confiar no tipo, já que a spec só fala de negativo.
3. **`cupomUnico` sem cupom**: com `couponCodes` vazio (promoção automática) a condition devolve `true`, porque 0 códigos não é "mais de um". É o que a R5 diz; confirmar que é a intenção.
4. **`configurarCupons` muta ou copia**: o teste só lê o retorno. Proposta: mutar `config.promotionOptions` e devolver o mesmo objeto, que é o padrão do `configuration` do Vendure.
5. **`priorityValue` da condition**: a spec não define. Proposta: omitir (padrão 0).
6. **Brechas conhecidas, fora do escopo**: as actions nativas seguem sem teto e duas promoções de 30% somam 60%. Fica para outra spec, com e2e (`@vendure/testing`). Alguém precisa avisar o financeiro de que o teto só vale para a action nova.
7. **TODO do Fulano** em `vendure-config.ts` (cupons): manter. Só o dev decide se remove depois.
