const { Pool } = require('pg');

const pool = new Pool({
  user: 'lego_owner',
  host: 'ep-empty-paper-a84bf7t0-pooler.eastus2.azure.neon.tech',
  database: 'lego',
  password: 'npg_Q13VaTNXSrPI',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;