import { Module } from '@nestjs/common';
import { BannerModule } from './banner/banner.module';
import { BlogModule } from './blog/blog.module';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';

@Module({
  imports: [BannerModule, BlogModule, ContactModule, FaqModule],
})
export class ContentModule {}
