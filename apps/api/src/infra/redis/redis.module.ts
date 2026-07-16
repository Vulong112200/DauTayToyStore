import { Global, Module } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: REDIS_CLIENT,
      useFactory: (redisService: RedisService) => redisService.client,
      inject: [RedisService],
    },
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
