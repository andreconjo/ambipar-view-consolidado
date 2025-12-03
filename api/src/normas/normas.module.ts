import { Module } from '@nestjs/common';
import { NormasService } from './normas.service';
import { NormasController } from './normas.controller';
import { DatabaseModule } from '../database/database.module';
import { AprovacoesModule } from '../aprovacoes/aprovacoes.module';

@Module({
  imports: [DatabaseModule, AprovacoesModule],
  controllers: [NormasController],
  providers: [NormasService],
  exports: [NormasService],
})
export class NormasModule {}
