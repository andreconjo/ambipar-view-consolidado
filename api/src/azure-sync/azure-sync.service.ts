import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { DBSQLClient } from '@databricks/sql';

@Injectable()
export class AzureSyncService {
  private readonly logger = new Logger(AzureSyncService.name);

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {}

  async onModuleInit() {
    const serverHostname = this.configService.get<string>(
      'databricks.serverHostname',
    );
    const httpPath = this.configService.get<string>('databricks.httpPath');
    const accessToken = this.configService.get<string>(
      'databricks.accessToken',
    );

    if (serverHostname && httpPath && accessToken) {
      this.logger.log('Databricks credentials configured');
    } else {
      this.logger.warn('Databricks connection settings not configured');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySyncNormas() {
    this.logger.log('Starting daily sync of normas from Databricks');
    await this.syncNormas();
  }

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklySyncClassifications() {
    this.logger.log(
      'Starting weekly sync of management systems classifications from Databricks',
    );
    await this.syncManagementClassifications();
  }

  async syncNormas(): Promise<{ message: string; synced: number }> {
    const serverHostname = this.configService.get<string>(
      'databricks.serverHostname',
    );
    const httpPath = this.configService.get<string>('databricks.httpPath');
    const accessToken = this.configService.get<string>(
      'databricks.accessToken',
    );

    if (!serverHostname || !httpPath || !accessToken) {
      throw new Error('Databricks credentials not configured');
    }

    const client = new DBSQLClient();
    let connection;
    let session;
    
    try {
      connection = await client.connect({
        host: serverHostname,
        path: httpPath,
        token: accessToken,
      });

      session = await connection.openSession();

      const queryOperation = await session.executeStatement(
        'SELECT * FROM data_workspace.unificado.tb_normas_consolidadas',
      );

      const result = await queryOperation.fetchAll();
      await queryOperation.close();

      let synced = 0;

      for (const norma of result as any[]) {
        await this.databaseService.execute(
          `INSERT INTO tb_normas_consolidadas 
           (id, tipo_norma, numero_norma, ano_publicacao, ementa, situacao, 
            status_vigencia, divisao_politica, origem_publicacao, origem_dado, 
            link_norma, data_publicacao, aplicavel, sistema_gestao)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             tipo_norma = EXCLUDED.tipo_norma,
             numero_norma = EXCLUDED.numero_norma,
             ano_publicacao = EXCLUDED.ano_publicacao,
             ementa = EXCLUDED.ementa,
             situacao = EXCLUDED.situacao,
             status_vigencia = EXCLUDED.status_vigencia,
             divisao_politica = EXCLUDED.divisao_politica,
             origem_publicacao = EXCLUDED.origem_publicacao,
             origem_dado = EXCLUDED.origem_dado,
             link_norma = EXCLUDED.link_norma,
             data_publicacao = EXCLUDED.data_publicacao,
             aplicavel = EXCLUDED.aplicavel,
             sistema_gestao = EXCLUDED.sistema_gestao`,
          [
            norma.id,
            norma.tipo_norma,
            norma.numero_norma,
            norma.ano_publicacao,
            norma.ementa,
            norma.situacao,
            norma.status_vigencia,
            norma.divisao_politica,
            norma.origem_publicacao,
            norma.origem_dado,
            norma.link_norma,
            norma.data_publicacao,
            norma.aplicavel,
            norma.sistema_gestao,
          ],
        );
        synced++;
      }

      this.logger.log(`Synced ${synced} normas from Databricks`);
      return { message: 'Sync completed successfully', synced };
    } catch (error) {
      this.logger.error('Error syncing normas from Databricks', error);
      throw error;
    } finally {
      if (session) {
        await session.close();
      }
      if (connection) {
        await connection.close();
      }
      await client.close();
    }
  }

  async syncManagementClassifications(): Promise<{
    message: string;
    synced: number;
  }> {
    const serverHostname = this.configService.get<string>(
      'databricks.serverHostname',
    );
    const httpPath = this.configService.get<string>('databricks.httpPath');
    const accessToken = this.configService.get<string>(
      'databricks.accessToken',
    );

    if (!serverHostname || !httpPath || !accessToken) {
      throw new Error('Databricks credentials not configured');
    }

    const client = new DBSQLClient();
    let connection;
    let session;

    try {
      connection = await client.connect({
        host: serverHostname,
        path: httpPath,
        token: accessToken,
      });

      session = await connection.openSession();

      const queryOperation = await session.executeStatement(
        'SELECT * FROM data_workspace.models.management_systems_classifications WHERE classification = true',
      );

      const result = await queryOperation.fetchAll();
      await queryOperation.close();

      let synced = 0;

      for (const classification of result as any[]) {
        await this.databaseService.executeManagement(
          `INSERT INTO tb_management_systems_classifications 
           (numero_norma, sistema_gestao, classification, data_classificacao)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (numero_norma, sistema_gestao) DO UPDATE SET
             classification = EXCLUDED.classification,
             data_classificacao = EXCLUDED.data_classificacao`,
          [
            classification.numero_norma,
            classification.sistema_gestao,
            classification.classification,
            classification.data_classificacao,
          ],
        );
        synced++;
      }

      this.logger.log(
        `Synced ${synced} management classifications from Databricks`,
      );
      return { message: 'Sync completed successfully', synced };
    } catch (error) {
      this.logger.error(
        'Error syncing management classifications from Databricks',
        error,
      );
      throw error;
    } finally {
      if (session) {
        await session.close();
      }
      if (connection) {
        await connection.close();
      }
      await client.close();
    }
  }

  async manualSyncAll(): Promise<{
    normas: number;
    classifications: number;
  }> {
    this.logger.log('Starting manual sync of all data from Databricks');

    const [normasResult, classificationsResult] = await Promise.all([
      this.syncNormas(),
      this.syncManagementClassifications(),
    ]);

    return {
      normas: normasResult.synced,
      classifications: classificationsResult.synced,
    };
  }
}
