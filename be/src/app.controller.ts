import { Controller, Get, Redirect } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  @Redirect('/home', 301)
  redirectToHome() {}

  @Get('/api/readiness')
  getReadiness(): string {
    return 'ok';
  }
}
