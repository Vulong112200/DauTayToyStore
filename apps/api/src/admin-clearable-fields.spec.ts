import {
  adminUpdateUserInputSchema,
  updateGiftVoucherInputSchema,
  updateSiteSettingsSchema,
} from '@repo/contracts';

/**
 * The `clearableOptional` contract helper is the shared source of truth that lets
 * admin edit forms actually clear an optional field. These tests pin the three
 * cases every clearable field must satisfy:
 *   - an empty string (a blank form input)  -> `null`  (request to clear)
 *   - an absent field (`undefined`)          -> absent  (leave untouched)
 *   - a valid value                          -> the value (still validated)
 */
describe('clearable optional admin fields', () => {
  describe('adminUpdateUserInputSchema.phone', () => {
    it('normalizes an empty string to null (clear)', () => {
      const parsed = adminUpdateUserInputSchema.parse({ phone: '' });
      expect(parsed.phone).toBeNull();
    });

    it('keeps the field absent when not provided', () => {
      const parsed = adminUpdateUserInputSchema.parse({ fullName: 'Someone' });
      expect(parsed).not.toHaveProperty('phone');
    });

    it('accepts a valid phone number', () => {
      const parsed = adminUpdateUserInputSchema.parse({ phone: '0912345678' });
      expect(parsed.phone).toBe('0912345678');
    });

    it('still rejects a malformed non-empty phone number', () => {
      expect(() => adminUpdateUserInputSchema.parse({ phone: 'abc' })).toThrow();
    });
  });

  describe('updateGiftVoucherInputSchema', () => {
    it('normalizes empty recipientEmail and expiresAt to null', () => {
      const parsed = updateGiftVoucherInputSchema.parse({ recipientEmail: '', expiresAt: '' });
      expect(parsed.recipientEmail).toBeNull();
      expect(parsed.expiresAt).toBeNull();
    });

    it('accepts an explicit null (what the form sends on clear)', () => {
      const parsed = updateGiftVoucherInputSchema.parse({ expiresAt: null });
      expect(parsed.expiresAt).toBeNull();
    });

    it('still validates a non-empty email', () => {
      expect(() => updateGiftVoucherInputSchema.parse({ recipientEmail: 'not-an-email' })).toThrow();
    });
  });

  describe('updateSiteSettingsSchema', () => {
    it('normalizes empty contact fields to null', () => {
      const parsed = updateSiteSettingsSchema.parse({
        contactEmail: '',
        contactPhone: '',
        facebookUrl: '',
      });
      expect(parsed.contactEmail).toBeNull();
      expect(parsed.contactPhone).toBeNull();
      expect(parsed.facebookUrl).toBeNull();
    });

    it('leaves an unprovided contact field absent', () => {
      const parsed = updateSiteSettingsSchema.parse({ siteName: 'Shop' });
      expect(parsed).not.toHaveProperty('contactEmail');
    });

    it('still validates a non-empty facebookUrl', () => {
      expect(() => updateSiteSettingsSchema.parse({ facebookUrl: 'not a url' })).toThrow();
    });
  });
});
