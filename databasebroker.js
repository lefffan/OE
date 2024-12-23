// Todo0 - TimeScaleDB
//			https://github.com/timescale/timescaledb/blob/main/tsl/README.md
//			https://docs.timescale.com/self-hosted/latest/install/installation-windows/
//			https://www.timescale.com
// Todo0 - Postgres https://postgrespro.ru/docs/postgresql/14/sql-createtableas https://postgrespro.ru/windows https://stackoverflow.com/questions/64439597/ways-to-speed-up-update-postgres-to-handle-high-load-update-on-large-table-is-i https://www.crunchydata.com/blog/tuning-your-postgres-database-for-high-write-loads
//			https://serverfault.com/questions/117708/managing-high-load-of-a-postgresql-database
// Todo0 - step1 (head_table: serial id, DIALOG JSON; uniq_table: serial id, value; data_table: serial id, date, user, version, eid1, eid1)
// npm install pg
// CREATE DATABASE OE; DROP DATABASE [IF EXISTS] OE;
// SELECT current_database(); SELECT current_schema(); SELECT current_user;
// \l list databases
// \dt [*.*] list tables [of all schemas]
// CREATE TABLE IF NOT EXISTS uniq_1(); DROP TABLE uniq_1;
// ALTER TABLE uniq_1 ADD COLUMN id2 INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START ${PRIMARYKEYSTARTVALUE});
// ALTER TABLE uniq_1 ADD COLUMN edi1 VARCHAR(50) UNIQUE;
// CREATE INDEX CONCURRENTLY ON uniq_1 (eid1);

import pg from 'pg';
const { Pool }             = pg;
const PRIMARYKEYSTARTVALUE = 3;
const DBCONNECTION         = { host: '127.0.0.1', port: 5433, database: 'OE', user: 'postgres', password: '123' };

export class DatabaseBroker
{
 static pool = new Pool(DBCONNECTION);

 constructor(table)
 {
  this.table = table;
 }

 // Base method of a query builder such as SELECT (view data), ADD (table create, column add, index create, data insert), DROP (...)
 Method(method)
 {
  this.method = method;
  return this;
 }

 // Each arg is a column. Each coulmn is an array consisting of column name, type and optionally constraint with default value [ <col1 name>, <col1 type>, <col1 constraint>, <col1 default value> ], [ <col2 name>, <col2 type>, <col2 constraint>, <col2 default value> ]..
 // Column types: bigserial (from 1 to 9223372036854775807), integer (from -2147483648 to +2147483647), bigint (from -9223372036854775808 to +9223372036854775807),  varchar(n) ('n' length string), timestamp (date and time), date (date), boolean (TRUE|FALSE), json. See https://metanit.com/sql/postgresql/2.3.php for details
 // Constraint values: PRIMARY (the column becomes a primary key), UNIQUE. See https://postgrespro.ru/docs/postgresql/14/sql-altertable for details
 Column(...columns)
 {
  if (!Array.isArray(this.columns)) this.columns = [];
  this.columns = this.columns.concat(columns);
  this.columnlist = '';
  for (const column of this.columns) this.columnlist += column[0] + ',';
  this.columnlist = this.columnlist.slice(0, -1);
  return this;
 }

 Index()
 {
  this.index = true;
  return this;
 }

 Query()
 {
  let query = '';

  switch (this.method)
         {
          case 'SELECT':
               query = `SELECT ${this.columnlist} FROM ${this.table} `;
               // Process WHERE here
               // Process ORDER here
               break;
          case 'ADD':
               if (this.index)
                  {
                   query = `CREATE INDEX CONCURRENTLY ON ${this.table} (${this.columnlist})`;
                   break;
                  }
               if (this.columns === undefined)
                  {
                   query = `CREATE TABLE IF NOT EXISTS ${this.table}()`;
                   break;
                  }
               if (true)
                  {
                   for (const column of this.columns) query += this.GetAddColumnQuery(column);
                   break;
                  }
          case 'DROP':
               break;
         }
 }

 GetAddColumnQuery(column)
 {
  let query = `ALTER TABLE ${this.table} ADD COLUMN ${column[0]} ${column[1]}`; // Column name and type
  if (typeof column[2] === 'string' && column[2])                               // Column constraint
     {
      query += ' ' + column[2];
      if (column[2] === 'PRIMARY') query += ` KEY GENERATED ALWAYS AS IDENTITY (START ${PRIMARYKEYSTARTVALUE})`;
     }
  if (typeof column[3] === 'string') query += ' DEFAULT ' + column[3];          // Column default value
  return query + ';';
 }
}
