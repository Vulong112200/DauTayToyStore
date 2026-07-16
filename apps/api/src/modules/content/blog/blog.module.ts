import { Module } from '@nestjs/common';
import { AdminBlogCategoriesController } from './admin-blog-categories.controller';
import { AdminBlogCategoriesService } from './admin-blog-categories.service';
import { AdminBlogPostsController } from './admin-blog-posts.controller';
import { AdminBlogPostsService } from './admin-blog-posts.service';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';

@Module({
  controllers: [BlogController, AdminBlogCategoriesController, AdminBlogPostsController],
  providers: [BlogService, AdminBlogCategoriesService, AdminBlogPostsService],
})
export class BlogModule {}
