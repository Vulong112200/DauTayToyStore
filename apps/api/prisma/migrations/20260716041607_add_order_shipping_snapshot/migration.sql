/*
  Warnings:

  - Added the required column `shippingLine1` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingProvince` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "shippingDistrict" TEXT,
ADD COLUMN     "shippingLine1" TEXT NOT NULL,
ADD COLUMN     "shippingLine2" TEXT,
ADD COLUMN     "shippingPostalCode" TEXT,
ADD COLUMN     "shippingProvince" TEXT NOT NULL,
ADD COLUMN     "shippingWard" TEXT;
