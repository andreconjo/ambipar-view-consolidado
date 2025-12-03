export default () => ({
  port: parseInt(process.env.PORT || '3333', 10),
  database: {
    path: process.env.DB_PATH || './data/tb_normas_consolidadas.db',
    managementPath:
      process.env.DB_MANAGEMENT_PATH ||
      './data/management_systems_classifications.db',
    usuariosPath: process.env.DB_USUARIOS_PATH || './data/usuarios.db',
  },
  databricks: {
    serverHostname: process.env.DATABRICKS_SERVER_HOSTNAME || '',
    httpPath: process.env.DATABRICKS_HTTP_PATH || '',
    accessToken: process.env.DATABRICKS_ACCESS_TOKEN || '',
  },
  jwt: {
    secret: process.env.SECRET_KEY || 'ambipar-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  },
  nodeEnv: process.env.NODE_ENV || 'development',
});
