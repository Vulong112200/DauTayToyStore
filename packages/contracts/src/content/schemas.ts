import { z } from 'zod';

export const faqEntryViewSchema = z.object({
  id: z.string().uuid(),
  question: z.string(),
  answer: z.string(),
  category: z.string().nullable(),
});
export type FaqEntryView = z.infer<typeof faqEntryViewSchema>;

export const blogPostListItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  categoryName: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
});
export type BlogPostListItem = z.infer<typeof blogPostListItemSchema>;

export const blogPostDetailSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  content: z.string(),
  coverImageUrl: z.string().nullable(),
  categoryName: z.string().nullable(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
});
export type BlogPostDetail = z.infer<typeof blogPostDetailSchema>;

export const contactMessageInputSchema = z.object({
  name: z.string().min(2, 'Họ tên quá ngắn').max(100),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(10, 'Nội dung quá ngắn, vui lòng mô tả chi tiết hơn').max(2000),
});
export type ContactMessageInput = z.infer<typeof contactMessageInputSchema>;
