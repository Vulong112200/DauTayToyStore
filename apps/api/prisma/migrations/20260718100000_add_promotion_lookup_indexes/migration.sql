-- Promotion lookup indexes (perf): these tables are scanned on every cart read
-- (and, for flash sales, every wishlist read). See schema.prisma comments.

-- productId-IN lookup in PromotionContextService.loadFlashSaleItems — the existing
-- @@unique([flashSaleId, productId]) leads with flashSaleId so it can't serve this.
CREATE INDEX "flash_sale_items_productId_idx" ON "flash_sale_items"("productId");

-- isActive filters on the automatic-promotion tables.
CREATE INDEX "combo_deals_isActive_idx" ON "combo_deals"("isActive");
CREATE INDEX "buy_x_get_y_rules_isActive_idx" ON "buy_x_get_y_rules"("isActive");
CREATE INDEX "free_shipping_rules_isActive_idx" ON "free_shipping_rules"("isActive");
