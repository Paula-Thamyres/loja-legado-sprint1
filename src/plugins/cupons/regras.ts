export const TETO_PERCENTUAL = 30;

/** Desconto em centavos, sempre <= 0. `base` em centavos, `pct` em pontos percentuais. */
export function calcularDesconto(base: number, pct: number): number {
    const efetivo = Math.min(Math.max(pct, 0), TETO_PERCENTUAL);
    const valor = Math.round((base * efetivo) / 100);
    return valor === 0 ? 0 : -valor;
}

export function temCupomUnico(couponCodes: readonly string[]): boolean {
    return couponCodes.length <= 1;
}

export function temLinhas(lines: readonly unknown[]): boolean {
    return lines.length > 0;
}
