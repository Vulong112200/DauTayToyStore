import { z } from 'zod';
import { RoleName } from '../common/enums.js';

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  phone: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  roles: z.array(z.nativeEnum(RoleName)),
  isEmailVerified: z.boolean(),
  createdAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Họ tên quá ngắn').max(100).optional(),
  phone: z
    .string()
    .regex(/^(0|\+84)(\d{9,10})$/, 'Số điện thoại không hợp lệ')
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const authResponseSchema = z.object({
  user: userProfileSchema,
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number().int(),
  }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
