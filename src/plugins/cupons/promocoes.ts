import { LanguageCode, PromotionCondition, PromotionOrderAction } from '@vendure/core';
import { calcularDesconto, temCupomUnico, temLinhas } from './regras';

export const descontoPercentualComTeto = new PromotionOrderAction({
    code: 'desconto_percentual_com_teto',
    args: {
        pct: {
            type: 'int',
            ui: {
                component: 'number-form-input',
                suffix: '%',
                min: 0,
            },
        },
    },
    execute(ctx, order, args) {
        const base = ctx.channel.pricesIncludeTax ? order.subTotalWithTax : order.subTotal;
        return calcularDesconto(base, args.pct);
    },
    description: [
        { languageCode: LanguageCode.pt_BR, value: 'Desconto de { pct }% no pedido, limitado a 30%' },
        { languageCode: LanguageCode.en, value: 'Discount order by { pct }%, capped at 30%' },
    ],
});

export const cupomUnico = new PromotionCondition({
    code: 'cupom_unico',
    args: {},
    check(ctx, order) {
        return temLinhas(order.lines) && temCupomUnico(order.couponCodes);
    },
    description: [
        { languageCode: LanguageCode.pt_BR, value: 'Pedido com no máximo um cupom' },
        { languageCode: LanguageCode.en, value: 'Order has at most one coupon' },
    ],
});
