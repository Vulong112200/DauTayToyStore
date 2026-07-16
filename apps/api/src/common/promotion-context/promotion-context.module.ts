import { Global, Module } from '@nestjs/common';
import { PromotionContextService } from './promotion-context.service';

@Global()
@Module({
  providers: [PromotionContextService],
  exports: [PromotionContextService],
})
export class PromotionContextModule {}
