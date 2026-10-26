import { PluginCommonModule, RuntimeVendureConfig, VendurePlugin } from '@vendure/core';
import { removerAcoesSemTeto } from './remover-acoes-sem-teto';
import { cupomUnico, descontoPercentualComTeto } from './promocoes';

export function configurarCupons(config: RuntimeVendureConfig): RuntimeVendureConfig {
    const opcoes = config.promotionOptions;
    opcoes.promotionActions = [...(opcoes.promotionActions ?? []), descontoPercentualComTeto];
    opcoes.promotionConditions = [...(opcoes.promotionConditions ?? []), cupomUnico];
    return config;
}

@VendurePlugin({
    imports: [PluginCommonModule],
    configuration: config => removerAcoesSemTeto(configurarCupons(config)),
})
export class CuponsPlugin {}
