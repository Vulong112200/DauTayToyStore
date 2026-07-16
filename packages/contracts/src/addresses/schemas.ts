import { z } from 'zod';

export const addressTypeSchema = z.enum(['SHIPPING', 'BILLING']);
export type AddressType = z.infer<typeof addressTypeSchema>;

export const addressInputSchema = z.object({
  type: addressTypeSchema.default('SHIPPING'),
  recipient: z.string().min(2, 'Tên người nhận quá ngắn').max(100),
  phone: z.string().regex(/^(0|\+84)(\d{9,10})$/, 'Số điện thoại không hợp lệ'),
  line1: z.string().min(3, 'Vui lòng nhập địa chỉ chi tiết'),
  line2: z.string().optional(),
  ward: z.string().optional(),
  district: z.string().optional(),
  province: z.string().min(2, 'Vui lòng chọn tỉnh/thành phố'),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressInputSchema>;

export const addressViewSchema = z.object({
  id: z.string().uuid(),
  type: addressTypeSchema,
  recipient: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  ward: z.string().nullable(),
  district: z.string().nullable(),
  province: z.string(),
  postalCode: z.string().nullable(),
  isDefault: z.boolean(),
});
export type AddressView = z.infer<typeof addressViewSchema>;
