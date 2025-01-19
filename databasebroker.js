// Todo0 - TimeScaleDB
//			           https://github.com/timescale/timescaledb/blob/main/tsl/README.md
//			           https://docs.timescale.com/self-hosted/latest/install/installation-windows/
//			           https://www.timescale.com
// Todo0 - Postgres https://postgrespro.ru/docs/postgresql/14/sql-createtableas
//                  https://postgrespro.ru/windows https://stackoverflow.com/questions/64439597/ways-to-speed-up-update-postgres-to-handle-high-load-update-on-large-table-is-i
//                  https://www.crunchydata.com/blog/tuning-your-postgres-database-for-high-write-loads
//                  https://serverfault.com/questions/117708/managing-high-load-of-a-postgresql-database
//                  https://node-postgres.com/features/types
// Todo0 - step1 (head_table: serial id, DIALOG JSON; uniq_table: serial id, value; data_table: serial id, date, user, version, eid1, eid1)
// CREATE DATABASE OE; DROP DATABASE [IF EXISTS] OE;
// SELECT current_database(); SELECT current_schema(); SELECT current_user;
// \l list databases
// \dt [*.*] list tables [of all schemas]

import pg from 'pg';
const { Pool, Client }     = pg
const PRIMARYKEYSTARTVALUE = 3;
const DBCONNECTION         = { host: '127.0.0.1', port: 5433, database: 'oe', user: 'postgres', password: '123' };

export class DatabaseBroker
{
 static pool = new Pool(DBCONNECTION);

 constructor(table)
 {
  this.table = table;
  this.fields = [];  // Column names array for 'SELECT', 'ADD COLUMN', 'CREATE INDEX' and 'WHERE' statements
  this.values = [];  // Values for corresponded fields above
  this.args = [];    // Real values for a above 'values' array to pass to the DB system
  this.signs = [];   // Comparing signs for 'where' fields and its values
 }

 // Base method of a query builder such as SELECT (view data), CREATE (table create, column add, index create), WRITE (data insert, data update), DROP (table, column)
 Method(method)
 {
  this.method = method;
  return this;
 }

 // Method makes result query to create index instead of column
 Index()
 {
  this.index = true;
  return this;
 }

 // Method sets format of result data output
 Mode(mode)
 {
  this.mode = mode;
  return this;
 }

 ShowTables()
 {
  this.table = 'pg_tables';
  this.Method('SELECT').Fields({ 'tablename': {}, 'schemaname': {} }).Fields({'schemaname': { sign: '=', value: 'public' } }).Mode('COLUMNS');
  return this;
 }

 // Each field of fields array represents a column object for 'SELECT', 'ADD COLUMN' and 'CREATE INDEX' statements with next props: <column name>: { value:, type:, constraint:, escape:, sign: }
 // Column types: bigserial (from 1 to 9223372036854775807), integer (from -2147483648 to +2147483647), bigint (from -9223372036854775808 to +9223372036854775807),  varchar(n) ('n' length string),
 //               timestamp (date and time), date (date), boolean (TRUE|FALSE), json. See https://metanit.com/sql/postgresql/2.3.php for other postgres types
 // Column constraint: PRIMARY <primary key options are inserted automatically>|UNIQUE|DEFAULT <user specified value>. See https://postgrespro.ru/docs/postgresql/14/sql-altertable for details.
 // Column escaping: truthy or falsy vlaue
 // Column sign: = <> > < 
 // Todo0 - make js types to DB types conversion in this.values array while using its elements directly in a query string
 Fields(fields)
 {
  for (const name in fields)
      {
       const field = fields[name];  // Fix the current field
       if (typeof field !== 'object') continue; // Continue for non object field
       if (typeof field.value !== 'string') field.value = '';
       const i = this.fields.push(name) - 1;
       if (field.escape) this.args[i] = field.value;
       this.values[i]  = field.escape ? `$${this.args.length}` : `'${field.value}'`;
       if (field.sign) this.signs[i] = field.sign;
       if (this.method !== 'CREATE') continue;
       if (typeof field.type !== 'string') field.type = 'json';
       this.values[i] += ' ' + field.type;
       if (field.constraint) this.values[i] += ' ' + field.constraint;
       if (field.constraint === 'PRIMARY') this.values[i] += ` KEY GENERATED ALWAYS AS IDENTITY (START ${PRIMARYKEYSTARTVALUE})`;
      }
  return this;
 }

 // Method joins fields and values: <outerseparator><field><innerseparator><value>
 Join(outerseparator, innerseparator)
 {
  let clause = '';
  if (typeof outerseparator !== 'string') outerseparator = '';
  const usewherefields = typeof innerseparator !== 'string';

  for (const i in this.fields)
      {
       if (!usewherefields && typeof this.signs[i] === 'string') continue;       // Continue for general/where fields mismatch
       if (usewherefields && typeof this.signs[i] !== 'string') continue;        // Continue for general/where fields mismatch
       if (typeof innerseparator !== 'string') innerseparator = this.signs[i];   // Use compare sign as an inner separator for 'WHERE' clause
       clause += clause ? outerseparator : '';
       clause += outerseparator ? this.fields[i] : '';
       clause += clause ? innerseparator : '';
       clause += innerseparator ? this.values[i] : '';
      }
  // Todo2 - Process ORDER here
  return clause;
 }
 
 Then(Callback, mode)
 {
  let query = '';

  switch (this.method)
         {
          case 'SELECT':
               // Select general fields from this.table with 'where' clause if exists
               query = this.Join(' AND ');
               if (query) query = ' WHERE ' + query;
               query = `SELECT ${this.Join(',', '')} FROM ${this.table}${query}`;
               break;
          case 'CREATE':
               // Add index for the column
               if (this.index)
                  {
                   query = `CREATE INDEX CONCURRENTLY ON ${this.table} (${this.Join(',', '')})`;
                   break;
                  }
               // Create table in case of no columns defined
               if (!this.fields.length)
                  {
                   query = `CREATE TABLE IF NOT EXISTS ${this.table}()`;
                   break;
                  }
               // Add columns at the end for default
               if (true)
                  {
                   for (const i in this.fields) if (!this.signs[i]) query += `ALTER TABLE ${this.table} ADD COLUMN ${this.fields[i]} ${this.values[i]};`;
                   break;
                  }
          case 'WRITE':
               // signs.length is more then zero, so WHERE clause is present, so updating existing row. Otherwise insert new table row (WHERE clause is not present for zero signs.length)
               if (this.signs.length)
                  {
                   query = `UPDATE ${this.table} SET ${this.Join(',', '=')} WHERE ${this.Join(' AND ')}`;
                  }
                else
                  {
                   query = `INSERT INTO ${this.table} (${this.Join(',', '')}) VALUES (${this.Join('', ',')})`;
                  }
                 break;
          case 'DROP':
               // Drop table in case of no columns defined
               if (!this.fields)
                  {
                   query = `DROP TABLE ${this.table}`;
                   break;
                  }
               // Delete columns at the end for default. Todo0 - Statement 'DROP COLUMN' doesn't remove column physically. Fix it. See https://postgrespro.ru/docs/postgresql/14/sql-altertable for details
               if (true)
                  {
                   for (const i in this.fields) if (!this.signs[i]) query += `ALTER TABLE ${this.table} DROP COLUMN IF EXISTS ${this.fields[i]};`;
                   break;
                  }
          default:
               if (typeof this.table !== 'string') return;
               query = this.table;
         }

  this.args.length ? DatabaseBroker.pool.query(query, this.args, (err, res) => this.GetResult(Callback, query, err, res)) : DatabaseBroker.pool.query(query, (err, res) => this.GetResult(Callback, query, err, res));
 }

 GetResult(Callback, query, err, res)
 {
  let fields;
  console.log(query);
  switch (this.mode)
         {
          case 'VALUE':
               fields = this.Join(',', '').split(',')[0];
               if (!fields || fields === '*') fields = res.fields[0].name;
               console.log(res.rows[0][fields]);
               break;
          case 'ROW':
               console.log(res.rows[0]);
               break;
          case 'COLUMN':
               fields = this.Join(',', '').split(',')[0];
               if (!fields || fields === '*') fields = res.fields[0].name;
               for (const row of res.rows) console.log(row[fields]);
               break;
          case 'COLUMNS':
               fields = this.Join(',', '').split(',');
               if (!fields || fields === '*') fields = res.fields;
               for (const row of res.rows)
                   {
                    for (const field of fields) console.log(row[field]);
                    console.log('___');
                   }
               break;
          default:
               console.log(res.rows);
               break;
         }
 }
}
