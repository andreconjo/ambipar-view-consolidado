import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NormasModule } from './normas/normas.module';
import { AprovacoesModule } from './aprovacoes/aprovacoes.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ManagementSystemsModule } from './management-systems/management-systems.module';
import { AzureSyncModule } from './azure-sync/azure-sync.module';
import { ScrapersModule } from './scrapers/scrapers.module';
import { CrawlersModule } from './crawlers/crawlers.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    NormasModule,
    AprovacoesModule,
    AnalyticsModule,
    ManagementSystemsModule,
    AzureSyncModule,
    ScrapersModule,
    CrawlersModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
