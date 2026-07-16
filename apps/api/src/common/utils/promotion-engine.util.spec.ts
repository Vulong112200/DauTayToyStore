import { resolveFreeShipping, runPromotionEngine } from './promotion-engine.util';

describe('runPromotionEngine', () => {
  it('uses the normal price when there is no active flash sale', () => {
    const result = runPromotionEngine(
      [{ productId: 'p1', variantId: null, quantity: 2, basePrice: 100_000 }],
      [],
      [],
      [],
    );

    expect(result.lines[0]).toMatchObject({ unitPrice: 100_000, lineTotal: 200_000 });
    expect(result.subtotal).toBe(200_000);
  });

  it('overrides the unit price with the flash sale price when active', () => {
    const result = runPromotionEngine(
      [{ productId: 'p1', variantId: null, quantity: 2, basePrice: 100_000 }],
      [{ productId: 'p1', salePrice: 70_000, remainingStock: null }],
      [],
      [],
    );

    expect(result.lines[0]).toMatchObject({ unitPrice: 70_000, lineTotal: 140_000 });
  });

  it('does not apply the flash price once remaining stock is exhausted', () => {
    const result = runPromotionEngine(
      [{ productId: 'p1', variantId: null, quantity: 2, basePrice: 100_000 }],
      [{ productId: 'p1', salePrice: 70_000, remainingStock: 0 }],
      [],
      [],
    );

    expect(result.lines[0]?.unitPrice).toBe(100_000);
  });

  it('never applies a flash sale to a variant line', () => {
    const result = runPromotionEngine(
      [{ productId: 'p1', variantId: 'v1', quantity: 1, basePrice: 100_000 }],
      [{ productId: 'p1', salePrice: 70_000, remainingStock: null }],
      [],
      [],
    );

    expect(result.lines[0]?.unitPrice).toBe(100_000);
  });

  describe('combo deals', () => {
    const combo = {
      id: 'combo-1',
      name: 'Combo A+B',
      comboPrice: 150_000,
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
      ],
    };

    it('applies the combo once when exactly enough items are present', () => {
      const result = runPromotionEngine(
        [
          { productId: 'p1', variantId: null, quantity: 1, basePrice: 100_000 },
          { productId: 'p2', variantId: null, quantity: 1, basePrice: 80_000 },
        ],
        [],
        [combo],
        [],
      );

      // list price 180_000 - combo price 150_000 = 30_000 discount
      expect(result.promotionDiscountTotal).toBe(30_000);
      expect(result.appliedPromotions).toEqual([
        { type: 'COMBO', id: 'combo-1', label: 'Combo A+B', discountAmount: 30_000, timesApplied: 1 },
      ]);
      expect(result.netSubtotal).toBe(150_000);
    });

    it('applies the combo multiple times when enough sets are present', () => {
      const result = runPromotionEngine(
        [
          { productId: 'p1', variantId: null, quantity: 2, basePrice: 100_000 },
          { productId: 'p2', variantId: null, quantity: 2, basePrice: 80_000 },
        ],
        [],
        [combo],
        [],
      );

      expect(result.appliedPromotions[0]?.timesApplied).toBe(2);
      expect(result.promotionDiscountTotal).toBe(60_000);
    });

    it('does not apply the combo when a required item is missing', () => {
      const result = runPromotionEngine(
        [{ productId: 'p1', variantId: null, quantity: 1, basePrice: 100_000 }],
        [],
        [combo],
        [],
      );

      expect(result.promotionDiscountTotal).toBe(0);
      expect(result.appliedPromotions).toEqual([]);
    });

    it('does not apply the combo when the combo price is not actually cheaper', () => {
      const expensiveCombo = { ...combo, comboPrice: 500_000 };
      const result = runPromotionEngine(
        [
          { productId: 'p1', variantId: null, quantity: 1, basePrice: 100_000 },
          { productId: 'p2', variantId: null, quantity: 1, basePrice: 80_000 },
        ],
        [],
        [expensiveCombo],
        [],
      );

      expect(result.promotionDiscountTotal).toBe(0);
    });

    it('uses the flash-adjusted price when computing combo savings', () => {
      const result = runPromotionEngine(
        [
          { productId: 'p1', variantId: null, quantity: 1, basePrice: 100_000 },
          { productId: 'p2', variantId: null, quantity: 1, basePrice: 80_000 },
        ],
        [{ productId: 'p1', salePrice: 60_000, remainingStock: null }],
        [combo],
        [],
      );

      // list price now 60_000 + 80_000 = 140_000, combo 150_000 → not worth it
      expect(result.promotionDiscountTotal).toBe(0);
    });
  });

  describe('buy-X-get-Y rules', () => {
    it('discounts the get-product when there is enough of the buy-product (different products)', () => {
      const rule = {
        id: 'r1',
        name: 'Mua 2 tặng 1',
        buyProductId: 'p1',
        buyQuantity: 2,
        getProductId: 'p2',
        getQuantity: 1,
        discountPercent: 100,
      };
      const result = runPromotionEngine(
        [
          { productId: 'p1', variantId: null, quantity: 2, basePrice: 100_000 },
          { productId: 'p2', variantId: null, quantity: 1, basePrice: 50_000 },
        ],
        [],
        [],
        [rule],
      );

      expect(result.promotionDiscountTotal).toBe(50_000);
      expect(result.appliedPromotions[0]).toMatchObject({ type: 'BUY_X_GET_Y', timesApplied: 1 });
    });

    it('caps the discounted quantity at how much of the get-product is actually in the cart', () => {
      const rule = {
        id: 'r1',
        name: 'Mua 1 tặng 2',
        buyProductId: 'p1',
        buyQuantity: 1,
        getProductId: 'p2',
        getQuantity: 2,
        discountPercent: 100,
      };
      const result = runPromotionEngine(
        [
          { productId: 'p1', variantId: null, quantity: 1, basePrice: 100_000 },
          { productId: 'p2', variantId: null, quantity: 1, basePrice: 50_000 },
        ],
        [],
        [],
        [rule],
      );

      // wants to discount 2 units of p2 but only 1 is in the cart
      expect(result.promotionDiscountTotal).toBe(50_000);
    });

    it('handles buy-product === get-product (classic BOGO)', () => {
      const rule = {
        id: 'r1',
        name: 'Mua 3 tặng 1',
        buyProductId: 'p1',
        buyQuantity: 3,
        getProductId: 'p1',
        getQuantity: 1,
        discountPercent: 100,
      };
      const result = runPromotionEngine(
        [{ productId: 'p1', variantId: null, quantity: 3, basePrice: 90_000 }],
        [],
        [],
        [rule],
      );

      expect(result.promotionDiscountTotal).toBe(90_000);
    });

    it('does not apply when there is not enough of the buy-product', () => {
      const rule = {
        id: 'r1',
        name: 'Mua 5 tặng 1',
        buyProductId: 'p1',
        buyQuantity: 5,
        getProductId: 'p2',
        getQuantity: 1,
        discountPercent: 100,
      };
      const result = runPromotionEngine(
        [
          { productId: 'p1', variantId: null, quantity: 2, basePrice: 100_000 },
          { productId: 'p2', variantId: null, quantity: 1, basePrice: 50_000 },
        ],
        [],
        [],
        [rule],
      );

      expect(result.promotionDiscountTotal).toBe(0);
    });
  });

  it('applies combos before buy-X-get-Y so units are not double-claimed', () => {
    const combo = {
      id: 'combo-1',
      name: 'Combo A+B',
      comboPrice: 100_000,
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
      ],
    };
    const rule = {
      id: 'r1',
      name: 'Mua 1 A tặng 1 B',
      buyProductId: 'p1',
      buyQuantity: 1,
      getProductId: 'p2',
      getQuantity: 1,
      discountPercent: 100,
    };
    // Exactly 1 of each product — the combo claims both units, so the BOGO rule has nothing left.
    const result = runPromotionEngine(
      [
        { productId: 'p1', variantId: null, quantity: 1, basePrice: 100_000 },
        { productId: 'p2', variantId: null, quantity: 1, basePrice: 50_000 },
      ],
      [],
      [combo],
      [rule],
    );

    expect(result.appliedPromotions).toHaveLength(1);
    expect(result.appliedPromotions[0]?.type).toBe('COMBO');
  });
});

describe('resolveFreeShipping', () => {
  it('is free when the subtotal meets the site-wide settings threshold', () => {
    expect(resolveFreeShipping(600_000, 'TP.HCM', 500_000, [])).toBe(true);
  });

  it('is not free when below both the settings threshold and any rule', () => {
    expect(resolveFreeShipping(100_000, 'TP.HCM', 500_000, [])).toBe(false);
  });

  it('is free when a province-restricted rule matches', () => {
    const rule = { id: 'r1', minOrderAmount: 200_000, applicableProvinces: ['TP.HCM'] };
    expect(resolveFreeShipping(250_000, 'TP.HCM', 500_000, [rule])).toBe(true);
  });

  it('is not free when the rule matches on amount but not on province', () => {
    const rule = { id: 'r1', minOrderAmount: 200_000, applicableProvinces: ['Hà Nội'] };
    expect(resolveFreeShipping(250_000, 'TP.HCM', 500_000, [rule])).toBe(false);
  });

  it('is free for a nationwide rule (no province restriction) regardless of the given province', () => {
    const rule = { id: 'r1', minOrderAmount: 200_000, applicableProvinces: null };
    expect(resolveFreeShipping(250_000, undefined, 500_000, [rule])).toBe(true);
  });
});
