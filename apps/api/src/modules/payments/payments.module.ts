import { Module } from '@nestjs/common';
import { MomoService } from './momo.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { VnpayService } from './vnpay.service';

@Module({
  controllers: [PaymentsController],
  providers: [VnpayService, MomoService, PaymentsService],
  exports: [VnpayService, MomoService],
})
export class PaymentsModule {}
