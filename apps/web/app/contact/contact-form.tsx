'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type ContactMessageInput, contactMessageInputSchema } from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';
import { contactApi } from '@/lib/api/contact';

export function ContactForm() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSent, setIsSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactMessageInput>({ resolver: zodResolver(contactMessageInputSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await contactApi.submit(values);
      setIsSent(true);
      reset();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Không thể gửi liên hệ');
    } finally {
      setIsSubmitting(false);
    }
  });

  if (isSent) {
    return (
      <p className="rounded-lg bg-pastel-mint px-4 py-3 text-sm">
        Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={serverError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Họ và tên</Label>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Số điện thoại (tuỳ chọn)</Label>
        <Input id="phone" {...register('phone')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subject">Chủ đề (tuỳ chọn)</Label>
        <Input id="subject" {...register('subject')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Nội dung</Label>
        <textarea
          id="message"
          rows={5}
          aria-invalid={!!errors.message}
          className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register('message')}
        />
        {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Đang gửi...' : 'Gửi liên hệ'}
      </Button>
    </form>
  );
}
