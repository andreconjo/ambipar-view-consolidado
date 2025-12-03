import { Module } from '@nestjs/common';
import { AprovacoesService } from './aprovacoes.service';
import { AprovacoesController } from './aprovacoes.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AprovacoesController],
  providers: [AprovacoesService],
  exports: [AprovacoesService],
})
export class AprovacoesModule {}
