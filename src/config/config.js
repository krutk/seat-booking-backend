const config = {
  db: {
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:t1YSwofpUda4@ep-sparkling-shape-a8nbu17d.eastus2.azure.neon.tech/neondb?sslmode=require'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'qazxsw'
  },
  server: {
    port: process.env.PORT || 3001
  }
};

module.exports = config; 