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

export const authResponseSchema = z.object({
  user: userProfileSchema,
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number().int(),
  }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
