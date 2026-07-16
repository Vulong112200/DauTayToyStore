import { Module } from '@nestjs/common';
import { AdminBrandsController } from './admin-brands.controller';
import { AdminBrandsService } from './admin-brands.service';

@Module({
  controllers: [AdminBrandsController],
  providers: [AdminBrandsService],
  exports: [AdminBrandsService],
})
export class BrandsModule {}
