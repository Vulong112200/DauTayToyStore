import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PublicFlashSale } from '@repo/contracts';
import { Public } from '../../../common/decorators/public.decorator';
import { FlashSalesService } from './flash-sales.service';

@ApiTags('flash-sales')
@Controller('flash-sales')
export class FlashSalesController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Các đợt flash sale đang diễn ra (công khai)' })
  findActive(): Promise<PublicFlashSale[]> {
    return this.flashSalesService.findActive();
  }
}
