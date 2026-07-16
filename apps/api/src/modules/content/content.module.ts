import { Module } from '@nestjs/common';
import { BlogModule } from './blog/blog.module';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';

@Module({
  imports: [BlogModule, ContactModule, FaqModule],
})
export class ContentModule {}
