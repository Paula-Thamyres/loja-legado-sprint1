import { freeShipping, minimumOrderAmount } from '@vendure/core';
import { cupomUnico } from './promocoes';

export const FRETE_GRATIS_MINIMO_CENTAVOS = 10000;

/** Definição versionada do cupom; a Promotion em si é criada no dashboard ou pelo `createPromotion`. */
export const promocaoFreteGratis = {
    couponCode: 'FRETEGRATIS',
    enabled: true,
    conditions: [
        {
            code: minimumOrderAmount.code,
            arguments: [
                { name: 'amount', value: String(FRETE_GRATIS_MINIMO_CENTAVOS) },
                { name: 'taxInclusive', value: 'false' },
            ],
        },
        { code: cupomUnico.code, arguments: [] },
    ],
    actions: [{ code: freeShipping.code, arguments: [] }],
};
