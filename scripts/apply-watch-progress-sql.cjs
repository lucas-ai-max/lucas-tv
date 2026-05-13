const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const requiredEnv = [
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "PGPASSWORD",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const sqlPath = path.join(process.cwd(), "database", "watch_progress.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const client = new Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

async function main() {
  await client.connect();
  await client.query(sql);

  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('app_users', 'watch_progress')
    order by table_name
  `);

  const views = await client.query(`
    select table_name
    from information_schema.views
    where table_schema = 'public'
      and table_name in ('continue_watching', 'watched_items')
    order by table_name
  `);

  console.log(`TABLES|${tables.rows.map((row) => row.table_name).join(",")}`);
  console.log(`VIEWS|${views.rows.map((row) => row.table_name).join(",")}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
