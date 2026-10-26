import { InitialData, LanguageCode } from '@vendure/core';

// Loja mínima para os testes e2e: um país, imposto zero (para a conta ficar só no desconto) e um frete.
export const dadosIniciais: InitialData = {
  defaultLanguage: LanguageCode.pt_BR,
  defaultZone: 'Americas',
  countries: [{ name: 'Brasil', code: 'BR', zone: 'Americas' }],
  taxRates: [{ name: 'Standard', percentage: 0 }],
  shippingMethods: [{ name: 'Padrão', price: 1990 }],
  paymentMethods: [],
  collections: [],
};
