-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "voucherId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "giftVoucherAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "giftVoucherId" TEXT;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "gift_vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_giftVoucherId_fkey" FOREIGN KEY ("giftVoucherId") REFERENCES "gift_vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
