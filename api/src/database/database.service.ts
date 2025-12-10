import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DBSQLClient } from '@databricks/sql';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private databricksClient: DBSQLClient;
  private databricksConnection: any;
  private databricksSession: any;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Initialize Azure Databricks connection
    await this.initializeDatabricks();
    await this.initializeTables();
  }

  private async initializeDatabricks(): Promise<void> {
    try {
      const host = this.configService.get<string>('databricks.serverHostname');
      const path = this.configService.get<string>('databricks.httpPath');
      const token = this.configService.get<string>('databricks.accessToken');

      if (!host || !path || !token) {
        this.logger.warn('Databricks connection parameters not configured - running in local mode');
        return;
      }

      this.databricksClient = new DBSQLClient();
      
      const connectionOptions = {
        host,
        path,
        token,
      };

      this.databricksConnection = await this.databricksClient.connect(connectionOptions);
      this.databricksSession = await this.databricksConnection.openSession();
      
      this.logger.log('Connected to Azure Databricks');
    } catch (error) {
      this.logger.error('Failed to connect to Azure Databricks - falling back to local mode', error);
      // Não lançar erro, apenas avisar
    }
  }

  private async initializeTables(): Promise<void> {
    try {
      // Criar tabela de crawlers manual no Databricks
      try {
        await this.executeDatabricks(`
          CREATE TABLE IF NOT EXISTS default.tb_crawlers_manual (
            id BIGINT GENERATED ALWAYS AS IDENTITY,
            fonte VARCHAR(500) NOT NULL,
            periodicidade VARCHAR(100),
            pais VARCHAR(100),
            estado VARCHAR(100),
            cidade VARCHAR(200),
            prioridade INT,
            usuario_id INT,
            data_criacao TIMESTAMP,
            data_atualizacao TIMESTAMP,
            ativo BOOLEAN
          )
        `);
        this.logger.log('Crawlers manual table initialized');
      } catch (error) {
        this.logger.warn('Could not create crawlers manual table (may already exist or Databricks not connected)');
      }
      
      this.logger.log('Database tables initialized');
    } catch (err) {
      this.logger.error('Error initializing tables', err);
      throw err;
    }
  }

  async queryManagement<T = any>(
    sql: string,
    params: any[] = [],
  ): Promise<T[]> {
    this.logger.debug(`Query management: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa data_workspace.models.management_systems_classifications
    databricksSql = databricksSql.replace(/FROM\s+management_systems_classifications/gi, 'FROM data_workspace.models.management_systems_classifications');
    databricksSql = databricksSql.replace(/FROM\s+tb_management_systems_classifications/gi, 'FROM data_workspace.models.management_systems_classifications');
    
    return this.queryDatabricks<T>(databricksSql);
  }

  async executeManagement(sql: string, params: any[] = []): Promise<void> {
    this.logger.debug(`Execute management: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa data_workspace.models.management_systems_classifications
    databricksSql = databricksSql.replace(/FROM\s+management_systems_classifications/gi, 'FROM data_workspace.models.management_systems_classifications');
    databricksSql = databricksSql.replace(/FROM\s+tb_management_systems_classifications/gi, 'FROM data_workspace.models.management_systems_classifications');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+management_systems_classifications/gi, 'INSERT INTO data_workspace.models.management_systems_classifications');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_management_systems_classifications/gi, 'INSERT INTO data_workspace.models.management_systems_classifications');
    databricksSql = databricksSql.replace(/UPDATE\s+management_systems_classifications/gi, 'UPDATE data_workspace.models.management_systems_classifications');
    databricksSql = databricksSql.replace(/UPDATE\s+tb_management_systems_classifications/gi, 'UPDATE data_workspace.models.management_systems_classifications');
    
    return this.executeDatabricks(databricksSql);
  }

  // Métodos para queries no Azure Databricks
  async queryDatabricks<T = any>(sql: string): Promise<T[]> {
    this.logger.debug(`Query Databricks: ${sql}`);
    
    if (!this.databricksSession) {
      throw new Error('Databricks not connected - cannot execute query');
    }
    
    try {
      const operation = await this.databricksSession.executeStatement(sql);
      const result = await operation.fetchAll();
      this.logger.debug(`Databricks result rows: ${result.length}`);
      if (result.length > 0 && result.length <= 3) {
        this.logger.debug(`Sample data: ${JSON.stringify(result[0])}`);
      }
      return result as T[];
    } catch (error) {
      this.logger.error(`Databricks query error: ${error.message}`);
      throw error;
    }
  }

  async executeDatabricks(sql: string): Promise<void> {
    this.logger.debug(`Execute Databricks: ${sql}`);
    
    if (!this.databricksSession) {
      throw new Error('Databricks not connected - cannot execute statement');
    }
    
    try {
      const operation = await this.databricksSession.executeStatement(sql);
      await operation.fetchAll(); // Garantir que a operação foi executada
      this.logger.debug(`Execute Databricks completed successfully`);
    } catch (error) {
      this.logger.error(`Databricks execute error: ${error.message}`);
      throw error;
    }
  }

  // Métodos para queries de usuários (usa Azure Databricks)
  async queryUsuarios<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.logger.debug(`Query usuarios: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa o schema default
    databricksSql = databricksSql.replace(/FROM\s+tb_usuarios/gi, 'FROM default.tb_usuarios');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_usuarios/gi, 'INSERT INTO default.tb_usuarios');
    databricksSql = databricksSql.replace(/UPDATE\s+tb_usuarios/gi, 'UPDATE default.tb_usuarios');
    
    return this.queryDatabricks<T>(databricksSql);
  }

  async executeUsuarios(sql: string, params: any[] = []): Promise<void> {
    this.logger.debug(`Execute usuarios: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa o schema default
    databricksSql = databricksSql.replace(/FROM\s+tb_usuarios/gi, 'FROM default.tb_usuarios');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_usuarios/gi, 'INSERT INTO default.tb_usuarios');
    databricksSql = databricksSql.replace(/UPDATE\s+tb_usuarios/gi, 'UPDATE default.tb_usuarios');
    
    return this.executeDatabricks(databricksSql);
  }

  // Métodos para queries de normas (usa Azure Databricks)
  async queryNormas<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.logger.debug(`Query normas: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa o schema correto: data_workspace.unificado
    databricksSql = databricksSql.replace(/FROM\s+tb_normas_consolidadas/gi, 'FROM data_workspace.unificado.tb_normas_consolidadas');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_normas_consolidadas/gi, 'INSERT INTO data_workspace.unificado.tb_normas_consolidadas');
    databricksSql = databricksSql.replace(/UPDATE\s+tb_normas_consolidadas/gi, 'UPDATE data_workspace.unificado.tb_normas_consolidadas');
    
    return this.queryDatabricks<T>(databricksSql);
  }

  async executeNormas(sql: string, params: any[] = []): Promise<void> {
    this.logger.debug(`Execute normas: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa o schema correto: data_workspace.unificado
    databricksSql = databricksSql.replace(/FROM\s+tb_normas_consolidadas/gi, 'FROM data_workspace.unificado.tb_normas_consolidadas');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_normas_consolidadas/gi, 'INSERT INTO data_workspace.unificado.tb_normas_consolidadas');
    databricksSql = databricksSql.replace(/UPDATE\s+tb_normas_consolidadas/gi, 'UPDATE data_workspace.unificado.tb_normas_consolidadas');
    
    return this.executeDatabricks(databricksSql);
  }

  // Métodos para queries de aprovações (usa Azure Databricks)
  async queryAprovacoes<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.logger.debug(`Query aprovacoes: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa o schema default
    databricksSql = databricksSql.replace(/FROM\s+tb_normas_aprovacoes/gi, 'FROM default.tb_normas_aprovacoes');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_normas_aprovacoes/gi, 'INSERT INTO default.tb_normas_aprovacoes');
    
    return this.queryDatabricks<T>(databricksSql);
  }

  async executeAprovacoes(sql: string, params: any[] = []): Promise<void> {
    this.logger.debug(`Execute aprovacoes: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa o schema default
    databricksSql = databricksSql.replace(/FROM\s+tb_normas_aprovacoes/gi, 'FROM default.tb_normas_aprovacoes');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_normas_aprovacoes/gi, 'INSERT INTO default.tb_normas_aprovacoes');
    
    return this.executeDatabricks(databricksSql);
  }

  // Métodos para queries de scrapers health (usa Azure Databricks)
  async queryScrapers<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.logger.debug(`Query scrapers: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa o caminho completo: data_workspace.default.tb_health_scrappers
    databricksSql = databricksSql.replace(/FROM\s+tb_health_scrappers/gi, 'FROM data_workspace.default.tb_health_scrappers');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_health_scrappers/gi, 'INSERT INTO data_workspace.default.tb_health_scrappers');
    databricksSql = databricksSql.replace(/UPDATE\s+tb_health_scrappers/gi, 'UPDATE data_workspace.default.tb_health_scrappers');
    
    return this.queryDatabricks<T>(databricksSql);
  }

  async executeScrapers(sql: string, params: any[] = []): Promise<void> {
    this.logger.debug(`Execute scrapers: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa o caminho completo: data_workspace.default.tb_health_scrappers
    databricksSql = databricksSql.replace(/FROM\s+tb_health_scrappers/gi, 'FROM data_workspace.default.tb_health_scrappers');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_health_scrappers/gi, 'INSERT INTO data_workspace.default.tb_health_scrappers');
    databricksSql = databricksSql.replace(/UPDATE\s+tb_health_scrappers/gi, 'UPDATE data_workspace.default.tb_health_scrappers');
    
    return this.executeDatabricks(databricksSql);
  }

  // Métodos para queries de crawlers manual (usa Azure Databricks)
  async queryCrawlersManual<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.logger.debug(`Query crawlers manual: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa o schema correto: default
    databricksSql = databricksSql.replace(/FROM\s+tb_crawlers_manual/gi, 'FROM default.tb_crawlers_manual');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_crawlers_manual/gi, 'INSERT INTO default.tb_crawlers_manual');
    databricksSql = databricksSql.replace(/UPDATE\s+tb_crawlers_manual/gi, 'UPDATE default.tb_crawlers_manual');
    
    return this.queryDatabricks<T>(databricksSql);
  }

  async executeCrawlersManual(sql: string, params: any[] = []): Promise<void> {
    this.logger.debug(`Execute crawlers manual: ${sql} with params: ${JSON.stringify(params)}`);
    
    // Substituir placeholders ? por valores reais para Databricks
    let databricksSql = sql;
    params.forEach((param) => {
      const value = typeof param === 'string' ? `'${param}'` : param;
      databricksSql = databricksSql.replace('?', String(value));
    });
    
    // Garantir que usa o schema correto: default
    databricksSql = databricksSql.replace(/FROM\s+tb_crawlers_manual/gi, 'FROM default.tb_crawlers_manual');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_crawlers_manual/gi, 'INSERT INTO default.tb_crawlers_manual');
    databricksSql = databricksSql.replace(/UPDATE\s+tb_crawlers_manual/gi, 'UPDATE default.tb_crawlers_manual');
    
    return this.executeDatabricks(databricksSql);
  }
}
