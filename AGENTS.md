# loja-legado

Loja em Vendure 3.7 (TypeScript, NestJS, GraphQL, TypeORM), com SQLite em dev. Este arquivo vale para qualquer agente; o `CLAUDE.md` importa este e acrescenta só o que é do Claude Code.

## Comandos

```bash
npm test          # Vitest, ~1 s. Obrigatório antes de dizer que terminou
npx tsc --noEmit  # checa os tipos de src/, inclusive o registro dos plugins
npm run dev       # server :3000 + worker + dashboard (/dashboard, superadmin/superadmin)
npm run setup     # cria .env e vendure.sqlite a partir do seed, se não existirem
npm run build     # build de produção; lento, só antes de release
```

Depois de mudar `src/` ou `test/`: `npm test` e `npx tsc --noEmit`. Não rode `npm run build` a cada mudança.

## Onde as coisas ficam

```
src/vendure-config.ts    configuração; plugins são registrados no array plugins
src/plugins/<dominio>/   código novo: um plugin Vendure por domínio
src/misc/preco.ts        helpers do relatório do financeiro; NÃO alterar
src/stuff/, src/utils/   legado da migração; não criar nada aqui
test/                    Vitest, um arquivo por feature; ctx e order são objetos falsos, sem banco
SPEC.md                  spec da tarefa atual; implementar só o que está lá
docs/plano.md            plano da tarefa atual
```

Exemplos oficiais de promoção, para ler antes de escrever uma:
`node_modules/@vendure/core/dist/config/promotion/actions/order-percentage-discount-action.js` e
`node_modules/@vendure/core/dist/config/promotion/conditions/min-order-amount-condition.js`.

## Regras do projeto

- Dinheiro é sempre inteiro em centavos (R$ 100,00 = `10000`). Arredondar uma vez, com `Math.round`, no fim da conta.
- Promoção: não reimplementar o que a `Promotion` nativa já faz (código do cupom, `startsAt`/`endsAt`, `usageLimit`, `perCustomerUsageLimit`). Regra nova é `PromotionCondition` ou `PromotionAction` registrada pelo plugin em `config.promotionOptions`, somando às nativas.
- `PromotionOrderAction` devolve o desconto negativo em centavos (`-1500`).
- Base do desconto: `order.subTotalWithTax` quando `ctx.channel.pricesIncludeTax` é true; `order.subTotal` quando é false. O canal do seed está com false.
- `code` de action e condition em snake_case; `description` em `pt_BR` e `en`.
- Variáveis de ambiente são lidas em `vendure-config.ts` e passadas ao plugin por `Plugin.init()`.

## Nunca

- Ler, colar ou commitar o `.env`.
- Instalar dependências sem confirmar com o dev.
- Apagar ou recriar o `vendure.sqlite`, rodar migrations ou ligar `dbConnectionOptions.synchronize`.
- Criar entidade, resolver ou endpoint quando a tarefa é só promoção.
- Alterar um teste de aceite para ele passar.
- Dizer que terminou sem `npm test` verde.
