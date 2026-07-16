import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FaqEntryView } from '@repo/contracts';
import { Public } from '../../../common/decorators/public.decorator';
import { FaqService } from './faq.service';

@ApiTags('faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách câu hỏi thường gặp' })
  list(): Promise<FaqEntryView[]> {
    return this.faqService.list();
  }
}
