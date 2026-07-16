import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const issues = this.formatIssues(result.error);
      throw new BadRequestException({
        message: issues,
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    return result.data;
  }

  private formatIssues(error: ZodError): string[] {
    return error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    });
  }
}
