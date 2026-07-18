-- Add a nullable soft-reference from an order line to the flash-sale item it was charged
-- against, so cancelling an order can reverse the soldCount increment made at checkout.
ALTER TABLE "order_items" ADD COLUMN "flashSaleItemId" TEXT;
