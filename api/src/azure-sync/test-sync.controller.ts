import { Controller, Get, Post } from '@nestjs/common';
import { AzureSyncService } from './azure-sync.service';
import { DatabaseService } from '../database/database.service';

@Controller('test-sync')
export class TestSyncController {
  constructor(
    private azureSyncService: AzureSyncService,
    private databaseService: DatabaseService,
  ) {}

  @Get('databricks-connection')
  async testDatabricksConnection() {
    const { DBSQLClient } = await import('@databricks/sql');
    const { ConfigService } = await import('@nestjs/config');
    const configService = new ConfigService();

    const serverHostname = process.env.DATABRICKS_SERVER_HOSTNAME;
    const httpPath = process.env.DATABRICKS_HTTP_PATH;
    const accessToken = process.env.DATABRICKS_ACCESS_TOKEN;

    if (!serverHostname || !httpPath || !accessToken) {
      return {
        success: false,
        error: 'Databricks credentials not configured in .env',
        credentials: {
          DATABRICKS_SERVER_HOSTNAME: !!serverHostname,
          DATABRICKS_HTTP_PATH: !!httpPath,
          DATABRICKS_ACCESS_TOKEN: !!accessToken,
        },
      };
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

      // Teste simples: SELECT 1
      const queryOperation = await session.executeStatement('SELECT 1 as test');
      const result = await queryOperation.fetchAll();
      await queryOperation.close();

      return {
        success: true,
        message: 'Connected to Databricks successfully',
        testQuery: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    } finally {
      if (session) await session.close();
      if (connection) await connection.close();
      await client.close();
    }
  }

  @Get('databricks-tables')
  async testDatabricksTables() {
    const { DBSQLClient } = await import('@databricks/sql');

    const serverHostname = process.env.DATABRICKS_SERVER_HOSTNAME;
    const httpPath = process.env.DATABRICKS_HTTP_PATH;
    const accessToken = process.env.DATABRICKS_ACCESS_TOKEN;

    if (!serverHostname || !httpPath || !accessToken) {
      return {
        success: false,
        error: 'Databricks credentials not configured',
      };
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

      // Contar normas
      const normasQuery = await session.executeStatement(
        'SELECT COUNT(*)::INTEGER as total FROM data_workspace.unificado.tb_normas_consolidadas',
      );
      const normasResult = await normasQuery.fetchAll();
      await normasQuery.close();

      // Contar classifications
      const classificationsQuery = await session.executeStatement(
        'SELECT COUNT(*)::INTEGER as total FROM data_workspace.models.management_systems_classifications WHERE classification = true',
      );
      const classificationsResult = await classificationsQuery.fetchAll();
      await classificationsQuery.close();

      // Sample de 5 normas
      const sampleQuery = await session.executeStatement(
        'SELECT id, numero_norma, tipo_norma, ementa FROM data_workspace.unificado.tb_normas_consolidadas LIMIT 5',
      );
      const sampleResult = await sampleQuery.fetchAll();
      await sampleQuery.close();

      return {
        success: true,
        databricks: {
          normas: normasResult[0],
          classifications: classificationsResult[0],
          sample: sampleResult,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    } finally {
      if (session) await session.close();
      if (connection) await connection.close();
      await client.close();
    }
  }

  @Get('duckdb-status')
  async testDuckDBStatus() {
    try {
      // Contar normas no DuckDB local
      const normasResult = await this.databaseService.queryNormas(
        'SELECT COUNT(*)::INTEGER as total FROM tb_normas_consolidadas',
      );

      // Contar classifications no DuckDB local
      const classificationsResult =
        await this.databaseService.queryManagement(
          'SELECT COUNT(*)::INTEGER as total FROM tb_management_systems_classifications',
        );

      // Sample de 5 normas
      const sampleResult = await this.databaseService.queryDatabricks(
        'SELECT id, numero_norma, tipo_norma, ementa FROM tb_normas_consolidadas LIMIT 5',
      );

      return {
        success: true,
        duckdb: {
          normas: normasResult[0],
          classifications: classificationsResult[0],
          sample: sampleResult,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Post('sync-sample')
  async syncSampleData() {
    const { DBSQLClient } = await import('@databricks/sql');

    const serverHostname = process.env.DATABRICKS_SERVER_HOSTNAME;
    const httpPath = process.env.DATABRICKS_HTTP_PATH;
    const accessToken = process.env.DATABRICKS_ACCESS_TOKEN;

    if (!serverHostname || !httpPath || !accessToken) {
      return {
        success: false,
        error: 'Databricks credentials not configured',
      };
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

      // Buscar apenas 10 normas como teste
      const queryOperation = await session.executeStatement(
        'SELECT * FROM data_workspace.unificado.tb_normas_consolidadas LIMIT 10',
      );

      const result = await queryOperation.fetchAll();
      await queryOperation.close();

      let synced = 0;

      for (const norma of result as any[]) {
        // Mapear colunas do Databricks para DuckDB, tratando valores undefined
        await this.databaseService.executeManagement(
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
            norma.id ?? null,
            norma.tipo_norma ?? null,
            norma.numero_norma ?? null,
            norma.ano_publicacao ?? null,
            norma.ementa ?? null,
            norma.situacao ?? null,
            norma.status_vigencia ?? null,
            norma.divisao_politica ?? null,
            norma.origem_publicacao ?? null,
            norma.origem_dado ?? null,
            norma.link_norma ?? null,
            norma.data_publicacao ?? null,
            norma.aplicavel ?? null,
            norma.sistema_gestao ?? null,
          ],
        );
        synced++;
      }

      return {
        success: true,
        message: 'Sample sync completed',
        synced,
        sample: result.slice(0, 2), // Mostrar 2 exemplos
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    } finally {
      if (session) await session.close();
      if (connection) await connection.close();
      await client.close();
    }
  }

  @Get('compare')
  async compareData() {
    try {
      const [databricks, duckdb] = await Promise.all([
        this.testDatabricksTables(),
        this.testDuckDBStatus(),
      ]);

      return {
        databricks,
        duckdb,
        comparison: {
          normasDiff:
            (databricks as any).databricks?.normas?.total -
            (duckdb as any).duckdb?.normas?.total,
          classificationsDiff:
            (databricks as any).databricks?.classifications?.total -
            (duckdb as any).duckdb?.classifications?.total,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
