export const QUEUE_NAMES = {
  EMAIL: 'email',
  MEDIA: 'media',
  AI: 'ai',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
