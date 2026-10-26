# Intermediária: cupom de frete grátis

Pedido da PO: "quero um cupom de frete grátis". Spec de 5 linhas:

```
Objetivo: cupom FRETEGRATIS que zera o frete do pedido sem mexer no subtotal, definido em src/plugins/cupons/frete-gratis.ts (promocaoFreteGratis e FRETE_GRATIS_MINIMO_CENTAVOS, exportados pelo index do plugin).
Regras: action nativa free_shipping; conditions nativa minimum_order_amount (10000 centavos, taxInclusive false) e cupom_unico do plugin cupons.
Restrições: nenhuma action ou condition nova; não alterar frete() em src/misc/preco.ts nem o teto de 30%; nenhuma entidade, migration ou escrita no banco.
Critério de aceite: test/frete-gratis.test.ts passa sem alteração (vermelho antes da feature) e os testes antigos continuam verdes.
Verificação: npm test && npx tsc --noEmit
```

## Perguntas de negócio

1. **R$ 100 ou R$ 200?** O `frete()` de `src/misc/preco.ts`, usado no relatório do financeiro, já dá frete grátis a partir de R$ 200. Com esta spec, um pedido de R$ 150 com o cupom sai sem frete na loja e com R$ 19,90 de frete na planilha. A spec não muda o `frete()`; quem decide se o relatório passa a considerar o cupom é o financeiro.
2. **Com ou sem imposto?** O mínimo vale sobre o subtotal sem imposto, igual ao canal padrão do seed (`pricesIncludeTax = false`).
3. **Acumula com outro cupom?** Não: `cupom_unico` recusa pedido com dois códigos.

## O que o teste não cobre

A promoção é uma definição versionada no plugin. Criá-la no banco continua sendo feito no dashboard (Marketing → Promotions) ou pelo `createPromotion` da Admin API, com estes valores.
