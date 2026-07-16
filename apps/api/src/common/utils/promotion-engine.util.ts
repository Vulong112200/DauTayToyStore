export interface PromotionCartLine {
  productId: string;
  variantId: string | null;
  quantity: number;
  /** Base unit price before any promotion is applied (variant override already resolved). */
  basePrice: number;
}

export interface ActiveFlashSaleItem {
  productId: string;
  salePrice: number;
  /** null = no stock cap on the flash price itself (still bounded by real inventory elsewhere). */
  remainingStock: number | null;
}

export interface ActiveComboDeal {
  id: string;
  name: string;
  comboPrice: number;
  items: { productId: string; quantity: number }[];
}

export interface ActiveBuyXGetYRule {
  id: string;
  name: string;
  buyProductId: string;
  buyQuantity: number;
  getProductId: string;
  getQuantity: number;
  discountPercent: number;
}

export interface ActiveFreeShippingRule {
  id: string;
  minOrderAmount: number;
  applicableProvinces: string[] | null;
}

export interface AppliedPromotion {
  type: 'COMBO' | 'BUY_X_GET_Y';
  id: string;
  label: string;
  discountAmount: number;
  timesApplied: number;
}

export interface PromotionEngineLineResult {
  productId: string;
  variantId: string | null;
  quantity: number;
  /** Flash-sale-adjusted unit price — this is what the customer is actually charged per unit. */
  unitPrice: number;
  lineTotal: number;
  /** True iff this line's price came from an active flash sale (distinct from `flashRemainingStock`
   * being null, which can also mean "flash applied but unlimited stock"). */
  flashApplied: boolean;
  /** Flash sale's own remaining stock, factored into the line's purchasable cap (separate from
   * warehouse inventory — the caller should take the min of the two). Null when either no flash
   * applied, or the flash sale has no stock limit. */
  flashRemainingStock: number | null;
}

export interface PromotionEngineResult {
  lines: PromotionEngineLineResult[];
  /** Sum of lines[].lineTotal — i.e. subtotal after flash-sale unit price overrides only. */
  subtotal: number;
  /** Combined discount from ComboDeal + BuyXGetYRule matches (not flash sale, which is already
   * folded into each line's unitPrice, and not Coupon, which is applied on top separately). */
  promotionDiscountTotal: number;
  appliedPromotions: AppliedPromotion[];
  /** subtotal - promotionDiscountTotal — the amount a Coupon or free-shipping check should use. */
  netSubtotal: number;
}

/**
 * Applies flash-sale unit pricing, then greedily matches ComboDeals, then BuyXGetYRules, against
 * a cart's product-level lines (variant lines are left untouched — none of these promotion types
 * are variant-aware in the schema). Combos are matched before BuyXGetY so a unit already "spent"
 * on a combo can't also be claimed as a free/discounted BOGO unit — order matters and is fixed.
 */
export function runPromotionEngine(
  cartLines: PromotionCartLine[],
  flashSaleItems: ActiveFlashSaleItem[],
  comboDeals: ActiveComboDeal[],
  buyXGetYRules: ActiveBuyXGetYRule[],
): PromotionEngineResult {
  const flashByProduct = new Map(flashSaleItems.map((item) => [item.productId, item]));

  const lines: PromotionEngineLineResult[] = cartLines.map((line) => {
    const flash = line.variantId ? undefined : flashByProduct.get(line.productId);
    const canUseFlash = flash && (flash.remainingStock === null || flash.remainingStock > 0);
    const unitPrice = canUseFlash ? flash!.salePrice : line.basePrice;

    return {
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      unitPrice,
      lineTotal: unitPrice * line.quantity,
      flashApplied: !!canUseFlash,
      flashRemainingStock: canUseFlash ? flash!.remainingStock : null,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  // Pool of not-yet-claimed quantity per product, priced at each line's (possibly flash-adjusted)
  // unit price — combos/BOGO only ever consume from product-level lines (variantId === null).
  const unitPriceByProduct = new Map(
    lines.filter((line) => !line.variantId).map((line) => [line.productId, line.unitPrice]),
  );
  const pooledQuantity = new Map<string, number>();
  for (const line of lines) {
    if (line.variantId) continue;
    pooledQuantity.set(line.productId, (pooledQuantity.get(line.productId) ?? 0) + line.quantity);
  }

  const appliedPromotions: AppliedPromotion[] = [];
  let promotionDiscountTotal = 0;

  for (const combo of comboDeals) {
    const timesApplicable = Math.min(
      ...combo.items.map((item) =>
        Math.floor((pooledQuantity.get(item.productId) ?? 0) / item.quantity),
      ),
    );
    if (!Number.isFinite(timesApplicable) || timesApplicable <= 0) continue;

    const listPricePerSet = combo.items.reduce(
      (sum, item) => sum + (unitPriceByProduct.get(item.productId) ?? 0) * item.quantity,
      0,
    );
    const discountPerSet = listPricePerSet - combo.comboPrice;
    if (discountPerSet <= 0) continue;

    for (const item of combo.items) {
      pooledQuantity.set(
        item.productId,
        (pooledQuantity.get(item.productId) ?? 0) - item.quantity * timesApplicable,
      );
    }

    const discountAmount = discountPerSet * timesApplicable;
    promotionDiscountTotal += discountAmount;
    appliedPromotions.push({
      type: 'COMBO',
      id: combo.id,
      label: combo.name,
      discountAmount,
      timesApplied: timesApplicable,
    });
  }

  for (const rule of buyXGetYRules) {
    const sameProduct = rule.buyProductId === rule.getProductId;
    const getUnitPrice = unitPriceByProduct.get(rule.getProductId);
    if (getUnitPrice === undefined) continue;

    if (sameProduct) {
      const available = pooledQuantity.get(rule.buyProductId) ?? 0;
      const timesApplicable = Math.floor(available / rule.buyQuantity);
      if (timesApplicable <= 0) continue;

      const discountedUnits = timesApplicable * rule.getQuantity;
      const discountAmount = discountedUnits * getUnitPrice * (rule.discountPercent / 100);
      if (discountAmount <= 0) continue;

      pooledQuantity.set(rule.buyProductId, available - timesApplicable * rule.buyQuantity);
      promotionDiscountTotal += discountAmount;
      appliedPromotions.push({
        type: 'BUY_X_GET_Y',
        id: rule.id,
        label: rule.name,
        discountAmount,
        timesApplied: timesApplicable,
      });
      continue;
    }

    const availableBuy = pooledQuantity.get(rule.buyProductId) ?? 0;
    const availableGet = pooledQuantity.get(rule.getProductId) ?? 0;
    const timesApplicable = Math.floor(availableBuy / rule.buyQuantity);
    if (timesApplicable <= 0) continue;

    const discountedUnits = Math.min(timesApplicable * rule.getQuantity, availableGet);
    if (discountedUnits <= 0) continue;

    const discountAmount = discountedUnits * getUnitPrice * (rule.discountPercent / 100);
    if (discountAmount <= 0) continue;

    pooledQuantity.set(rule.getProductId, availableGet - discountedUnits);
    promotionDiscountTotal += discountAmount;
    appliedPromotions.push({
      type: 'BUY_X_GET_Y',
      id: rule.id,
      label: rule.name,
      discountAmount,
      timesApplied: timesApplicable,
    });
  }

  return {
    lines,
    subtotal,
    promotionDiscountTotal,
    appliedPromotions,
    netSubtotal: subtotal - promotionDiscountTotal,
  };
}

export function resolveFreeShipping(
  netSubtotal: number,
  province: string | undefined,
  settingsThreshold: number,
  freeShippingRules: ActiveFreeShippingRule[],
): boolean {
  if (netSubtotal >= settingsThreshold) return true;

  return freeShippingRules.some((rule) => {
    if (netSubtotal < rule.minOrderAmount) return false;
    if (!rule.applicableProvinces || rule.applicableProvinces.length === 0) return true;
    return !!province && rule.applicableProvinces.includes(province);
  });
}
