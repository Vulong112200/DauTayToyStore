import { Module } from '@nestjs/common';
import { R2Module } from '../../infra/r2/r2.module';
import { AdminMediaController } from './admin-media.controller';
import { AdminMediaService } from './admin-media.service';

@Module({
  imports: [R2Module],
  controllers: [AdminMediaController],
  providers: [AdminMediaService],
})
export class MediaModule {}
