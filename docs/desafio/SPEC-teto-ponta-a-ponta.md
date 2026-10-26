# SPEC (Desafio N3): teto de 30% verificado ponta a ponta

## Contexto

O `SPEC.md` do cupom termina com "o que o verde não prova": os testes de `test/cupom.test.ts` provam a conta da action `desconto_percentual_com_teto` com objetos falsos, mas não a regra do financeiro, "ninguém consegue configurar desconto percentual acima de 30%". As actions percentuais nativas do Vendure continuam registradas e aceitam qualquer percentual.

O teste `test-e2e/teto-desconto.e2e-spec.ts` sobe uma loja de verdade com `@vendure/testing` (servidor Vendure, banco SQLite via sql.js, Admin API e Shop API) e mostra a brecha: 1 caso verde e 2 vermelhos antes desta spec.

## Objetivo

Tirar da loja as actions de desconto percentual sem teto, mantendo a action do plugin, para que o admin não consiga criar uma promoção percentual acima de 30%.

## Regras

1. As actions `order_percentage_discount`, `products_percentage_discount` e `facet_based_discount` não aparecem em `promotionActions` da Admin API.
2. `createPromotion` com qualquer uma delas é recusado pelo servidor.
3. A action `desconto_percentual_com_teto` continua disponível e, num pedido real de R$ 100,00 com cupom de 50%, desconta R$ 30,00.
4. A lista de códigos removidos fica numa constante com nome, num arquivo próprio de `src/plugins/cupons/`, aplicada pela `configuration` do `CuponsPlugin`.

## Restrições (o que NÃO fazer)

- Não alterar `configurarCupons`: o teste de aceite R7 exige que ela some às nativas sem remover nada. A remoção é um passo separado.
- Não alterar nenhum teste, inclusive o e2e.
- Não remover `free_shipping` (usada pelo cupom de frete grátis), `order_fixed_discount`, `order_line_fixed_discount` nem `buy_x_get_y_free`.
- Não criar entidade, resolver, endpoint, migration nem dependência nova.

## Critério de aceite

`npm run test:e2e` com os 3 casos verdes, e `npm test` e `npx tsc --noEmit` continuando verdes.

## Verificação

```bash
npm test && npx tsc --noEmit && npm run test:e2e
```

## Decisão e fontes

Duas formas de verificar a regra foram comparadas:

| | Teste unitário (`test/cupom.test.ts`) | Teste e2e (`test-e2e/`) |
|---|---|---|
| O que roda | A função `execute` com `ctx` e `order` falsos | Servidor Vendure, banco, Admin API e Shop API |
| O que prova | A conta da action nova | O que o admin consegue configurar e o desconto que o cliente recebe |
| Tempo medido | ~1 s | ~8 s |
| Custo | Nenhuma dependência | `@vendure/testing`, `sql.js`, `@swc/core` e `unplugin-swc` como devDependencies |

Decisão: manter os dois. O unitário continua no `npm test`, rápido, a cada edição (hook `test-after-edit.sh`). O e2e fica em `npm run test:e2e`, para rodar antes de entregar.

Para fechar a brecha, as actions percentuais nativas saem da configuração, porque o próprio Vendure registra promoções pela lista `promotionOptions.promotionActions`: o que não está na lista não pode ser configurado.

Fontes:

- Vendure, guia de testes (e2e com `@vendure/testing`, `SqljsInitializer`, SWC): https://docs.vendure.io/current/core/developer-guide/testing
- Vendure, referência `TestServer`: https://docs.vendure.io/current/core/reference/typescript-api/testing/test-server
- Vendure, conceito de promoções (actions registradas em `promotionOptions`): https://docs.vendure.io/current/core/core-concepts/promotions
- Vendure, referência `PromotionOptions`: https://docs.vendure.io/current/core/reference/typescript-api/promotions/promotion-options

## O que continua aberto

- Descontos de valor fixo (`order_fixed_discount`) e "leve X, ganhe Y" podem passar de 30% do pedido. Ficam porque não são percentuais; se valem para a regra é decisão do financeiro.
- Duas promoções sem cupom ainda podem somar descontos no mesmo pedido. Um teto por pedido pede outra spec.
