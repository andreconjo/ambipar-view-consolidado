import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as duckdb from 'duckdb';
import { DBSQLClient } from '@databricks/sql';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private db: duckdb.Database;
  private managementDb: duckdb.Database;
  private databricksClient: DBSQLClient;
  private databricksConnection: any;
  private databricksSession: any;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const dbPath = this.configService.get<string>('database.path') || './data/tb_normas_consolidadas.db';
    const managementPath = this.configService.get<string>(
      'database.managementPath',
    ) || './data/management_systems_classifications.db';

    // Initialize databases with promises to ensure connection
    await new Promise<void>((resolve, reject) => {
      this.db = new duckdb.Database(dbPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      this.managementDb = new duckdb.Database(managementPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    this.logger.log(`Connected to main database: ${dbPath}`);
    this.logger.log(`Connected to management database: ${managementPath}`);

    // Initialize Azure Databricks connection
    await this.initializeDatabricks();

    await this.initializeTables();
  }

  private async initializeDatabricks(): Promise<void> {
    try {
      this.databricksClient = new DBSQLClient();
      
      const connectionOptions = {
        host: this.configService.get<string>('databricks.host'),
        path: this.configService.get<string>('databricks.path'),
        token: this.configService.get<string>('databricks.token'),
      };

      this.databricksConnection = await this.databricksClient.connect(connectionOptions);
      this.databricksSession = await this.databricksConnection.openSession();
      
      this.logger.log('Connected to Azure Databricks');
    } catch (error) {
      this.logger.error('Failed to connect to Azure Databricks', error);
      throw error;
    }
  }

  private async initializeTables(): Promise<void> {
    try {
      // Criar tabela principal de normas
      await this.execute(`
        CREATE TABLE IF NOT EXISTS tb_normas_consolidadas (
          id INTEGER PRIMARY KEY,
          tipo_norma VARCHAR,
          numero_norma VARCHAR,
          ano_publicacao INTEGER,
          ementa TEXT,
          situacao VARCHAR,
          status_vigencia VARCHAR,
          divisao_politica VARCHAR,
          origem_publicacao VARCHAR,
          origem_dado VARCHAR,
          link_norma VARCHAR,
          data_publicacao DATE,
          aplicavel BOOLEAN,
          sistema_gestao VARCHAR
        )
      `);

      // tb_usuarios e tb_normas_aprovacoes agora estão no Azure Databricks
      this.logger.log('Skipping tb_usuarios and tb_normas_aprovacoes creation (managed in Azure Databricks)');

      // Criar tabela de classifications no banco management (estrutura igual ao Flask)
      await this.executeManagement(`
        CREATE TABLE IF NOT EXISTS management_systems_classifications (
          norm_id BIGINT,
          mngm_sys VARCHAR,
          classification BOOLEAN,
          dst DOUBLE,
          hst DOUBLE,
          classification_injection TIMESTAMP
        )
      `);
      
      this.logger.log('Database tables initialized');
    } catch (err) {
      this.logger.error('Error initializing tables', err);
      throw err;
    }
  }

  getConnection(): duckdb.Database {
    return this.db;
  }

  getManagementConnection(): duckdb.Database {
    return this.managementDb;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, ...params, (err: Error | null, rows: any) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
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

  async execute(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, ...params, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
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

  // Métodos para queries no Azure Databricks (usuários e aprovações)
  async queryDatabricks<T = any>(sql: string): Promise<T[]> {
    this.logger.debug(`Query Databricks: ${sql}`);
    try {
      const operation = await this.databricksSession.executeStatement(sql);
      const result = await operation.fetchAll();
      return result as T[];
    } catch (error) {
      this.logger.error(`Databricks query error: ${error.message}`);
      throw error;
    }
  }

  async executeDatabricks(sql: string): Promise<void> {
    this.logger.debug(`Execute Databricks: ${sql}`);
    try {
      await this.databricksSession.executeStatement(sql);
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
    
    // Garantir que usa o schema correto: default
    databricksSql = databricksSql.replace(/FROM\s+tb_health_scrappers/gi, 'FROM default.tb_health_scrappers');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_health_scrappers/gi, 'INSERT INTO default.tb_health_scrappers');
    databricksSql = databricksSql.replace(/UPDATE\s+tb_health_scrappers/gi, 'UPDATE default.tb_health_scrappers');
    
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
    
    // Garantir que usa o schema correto: default
    databricksSql = databricksSql.replace(/FROM\s+tb_health_scrappers/gi, 'FROM default.tb_health_scrappers');
    databricksSql = databricksSql.replace(/INSERT\s+INTO\s+tb_health_scrappers/gi, 'INSERT INTO default.tb_health_scrappers');
    databricksSql = databricksSql.replace(/UPDATE\s+tb_health_scrappers/gi, 'UPDATE default.tb_health_scrappers');
    
    return this.executeDatabricks(databricksSql);
  }
}
