# SPEC: cupom com teto de desconto (plugin `cupons`)

## Contexto

A `Promotion` nativa do Vendure já cuida do código do cupom, das datas (`startsAt`/`endsAt`) e dos limites de uso (`usageLimit`, `perCustomerUsageLimit`). Falta a regra do financeiro: em 2022 um cupom de 100% fez a loja perder R$ 40 mil num fim de semana. O desconto percentual precisa ter teto de 30%, e um pedido só pode ter um cupom.

## Objetivo

Criar o plugin `CuponsPlugin` em `src/plugins/cupons/` e registrá-lo no array `plugins` de `src/vendure-config.ts`. O plugin acrescenta a `config.promotionOptions`:

- a action de pedido `desconto_percentual_com_teto`, com o argumento `pct` (int);
- a condition `cupom_unico`, sem argumentos.

Arquivos:

```
src/plugins/cupons/regras.ts          funções puras, só com números, sem importar o Vendure
src/plugins/cupons/promocoes.ts       descontoPercentualComTeto e cupomUnico
src/plugins/cupons/cupons.plugin.ts   CuponsPlugin e configurarCupons(config)
src/plugins/cupons/index.ts           reexporta os três arquivos acima
```

## Regras

1. Teto: o percentual aplicado é `min(pct, 30)`. `pct = 50` em R$ 100,00 desconta R$ 30,00. O 30 fica numa constante `TETO_PERCENTUAL` em `regras.ts`; torná-lo configurável não faz parte desta tarefa.
2. Centavos: o desconto é inteiro, arredondado com `Math.round`. 10% de R$ 33,33 (`3333`) = `333`.
3. Sinal: `execute` devolve o desconto negativo (`-3000`). Nunca positivo: `pct` negativo conta como 0, e sem desconto o retorno é `0` (não `-0`).
4. Imposto: a base é `order.subTotalWithTax` quando `ctx.channel.pricesIncludeTax` é true e `order.subTotal` quando é false.
5. Cupom único: `cupomUnico.check` devolve `false` quando `order.couponCodes` tem mais de um código.
6. Pedido vazio: `cupomUnico.check` devolve `false` quando `order.lines` está vazio.
7. Registro: `configurarCupons(config)` acrescenta a action e a condition às nativas, sem substituir as listas. `code` em snake_case; `description` em `pt_BR` e `en`.

## Restrições (o que NÃO fazer)

- Não reimplementar código, validade ou limites de uso do cupom: isso é da `Promotion` nativa.
- Não alterar `src/misc/`, `src/stuff/`, `src/utils/` nem os testes existentes, inclusive `test/cupom.test.ts`.
- Mudar só `src/plugins/cupons/` e a linha do plugin em `src/vendure-config.ts`.
- Não instalar dependências. Não tocar em `vendure.sqlite`, migrations ou `synchronize`.
- Não criar entidade, resolver GraphQL nem endpoint.
- Não criar testes novos nesta tarefa: o teste de aceite é o critério.

## Critério de aceite

`test/cupom.test.ts`, trazido pelo dev da branch `gabarito` (`git checkout gabarito -- test/cupom.test.ts`) antes da implementação, passa sem alteração, os testes antigos continuam verdes e `npx tsc --noEmit` passa com o plugin registrado.

## Verificação

```bash
npm test && npx tsc --noEmit
```

## O que o verde não prova

Os testes provam que a action nova respeita o teto, não que "ninguém consegue configurar desconto acima de 30%". As actions nativas (`order_percentage_discount`, por exemplo) continuam disponíveis sem teto, e duas promoções de 30% podem somar 60% no mesmo pedido. Fechar essas brechas é outra spec, com teste e2e (`@vendure/testing`).
