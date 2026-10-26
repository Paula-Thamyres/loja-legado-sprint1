// A regra do financeiro, verificada numa loja de verdade (servidor Vendure + banco), e não só na função:
// "ninguém consegue configurar desconto percentual acima de 30%".
// O teste unitário (test/cupom.test.ts) prova a conta da action nova; não prova o que o admin consegue fazer.
import path from 'node:path';
import { createTestEnvironment, registerInitializer, SqljsInitializer, testConfig } from '@vendure/testing';
import { mergeConfig } from '@vendure/core';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CuponsPlugin } from '../src/plugins/cupons';
import { dadosIniciais } from './fixtures/dados-iniciais';

registerInitializer('sqljs', new SqljsInitializer(path.join(__dirname, '__data__')));

const PORTA_E2E = 3051;
const PRECO_CANECA = 10000; // R$ 100,00 no CSV
const ACTIONS_PERCENTUAIS_NATIVAS = ['order_percentage_discount', 'products_percentage_discount', 'facet_based_discount'];

const CRIAR_PROMOCAO = gql`
  mutation CriarPromocao($input: CreatePromotionInput!) {
    createPromotion(input: $input) {
      ... on Promotion { id couponCode }
      ... on ErrorResult { errorCode message }
    }
  }
`;
const ACTIONS_DISPONIVEIS = gql`
  query { promotionActions { code } }
`;
const ADICIONAR_ITEM = gql`
  mutation { addItemToOrder(productVariantId: "T_1", quantity: 1) { ... on Order { id } ... on ErrorResult { errorCode message } } }
`;
const APLICAR_CUPOM = gql`
  mutation Aplicar($codigo: String!) {
    applyCouponCode(couponCode: $codigo) {
      ... on Order { discounts { amount } }
      ... on ErrorResult { errorCode message }
    }
  }
`;

const promocao = (couponCode: string, action: string, pct: number) => ({
  enabled: true,
  couponCode,
  conditions: [],
  actions: [{ code: action, arguments: [{ name: action === 'desconto_percentual_com_teto' ? 'pct' : 'discount', value: String(pct) }] }],
  translations: [{ languageCode: 'pt_BR', name: `Cupom ${couponCode}` }],
});

describe('teto de 30% numa loja de verdade', () => {
  const { server, adminClient, shopClient } = createTestEnvironment(
    mergeConfig(testConfig, { apiOptions: { port: PORTA_E2E }, plugins: [CuponsPlugin] }),
  );

  beforeAll(async () => {
    await server.init({
      initialData: dadosIniciais,
      productsCsvPath: path.join(__dirname, 'fixtures/produtos.csv'),
      customerCount: 1,
    });
    await adminClient.asSuperAdmin();
  });

  afterAll(async () => {
    await server.destroy();
  });

  it('cupom de 50% com a action do plugin desconta só 30% no pedido', async () => {
    const { createPromotion } = await adminClient.query(CRIAR_PROMOCAO, {
      input: promocao('TETO50', 'desconto_percentual_com_teto', 50),
    });
    expect(createPromotion.couponCode).toBe('TETO50');

    await shopClient.asAnonymousUser();
    await shopClient.query(ADICIONAR_ITEM);
    const { applyCouponCode } = await shopClient.query(APLICAR_CUPOM, { codigo: 'TETO50' });

    const desconto = applyCouponCode.discounts.reduce((soma: number, d: { amount: number }) => soma + d.amount, 0);
    expect(desconto).toBe(-PRECO_CANECA * 0.3);
  });

  it('o admin não tem nenhuma action de desconto percentual sem teto', async () => {
    const { promotionActions } = await adminClient.query(ACTIONS_DISPONIVEIS);
    const codigos = promotionActions.map((a: { code: string }) => a.code);

    expect(codigos).toContain('desconto_percentual_com_teto');
    for (const nativa of ACTIONS_PERCENTUAIS_NATIVAS) expect(codigos).not.toContain(nativa);
  });

  it('criar promoção de 50% com a action nativa é recusado', async () => {
    await expect(
      adminClient.query(CRIAR_PROMOCAO, { input: promocao('NATIVA50', 'order_percentage_discount', 50) }),
    ).rejects.toThrow();
  });
});
