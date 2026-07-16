import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type ContactMessageInput, contactMessageInputSchema } from '@repo/contracts';
import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ContactService } from './contact.service';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Gửi liên hệ' })
  async submit(
    @Body(new ZodValidationPipe(contactMessageInputSchema)) body: ContactMessageInput,
  ): Promise<{ success: true }> {
    await this.contactService.submit(body);
    return { success: true };
  }
}
