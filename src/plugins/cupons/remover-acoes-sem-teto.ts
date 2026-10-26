import { RuntimeVendureConfig } from '@vendure/core';

/** Actions percentuais nativas, que aceitam qualquer percentual e furam o teto de 30%. */
export const ACOES_PERCENTUAIS_SEM_TETO = [
    'order_percentage_discount',
    'products_percentage_discount',
    'facet_based_discount',
];

export function removerAcoesSemTeto(config: RuntimeVendureConfig): RuntimeVendureConfig {
    const opcoes = config.promotionOptions;
    opcoes.promotionActions = (opcoes.promotionActions ?? []).filter(
        acao => !ACOES_PERCENTUAIS_SEM_TETO.includes(acao.code),
    );
    return config;
}
