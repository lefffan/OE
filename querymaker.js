// Todo - Use another user (instead of root) with priv granted to 'OEDB' database only and Unicode for MySQL https://mathiasbynens.be/notes/mysql-utf8mb4 http://phpfaq.ru/mysql/charset
// Todo - All db operations (except handlers and db config) should use the connection via user with read-only permissions
// Todo - index columns: alter table data_1 add index (`lastversion`);
// Todo - Use unbuffered queries just not to get all data as one whole XPathResult, but get it portion by portion
// Todo - problems of deploying - can i use postgre db on commerisal base? 
// Todo - db readonly replicas?
// Todo0 - Study psql syntax:
//         CREATE DATABASE OE; DROP DATABASE [IF EXISTS] OE;
//         SELECT current_database(); SELECT current_schema(); SELECT current_user;
//         \c oe postgres - connect to oe db via user postgres (https://www.postgresql.org/docs/9.1/app-psql.html)
//         \l list databases
//         \dt [*.*] list tables [of all schemas]
//         \c postgres postgres; 
//         DROP DATABASE oe; CREATE DATABASE oe; \c oe postgres;
//         \d <table> - DESCRIBE TABLE
//         CREATE TABLE metr(); alter table metr add time TIMESTAMPTZ; SELECT create_hypertable('metr', by_range('time')); SELECT add_dimension('metr', by_range('id'));
//         set client_encoding='win1251'; chcp 1251 SHOW SERVER_ENCODING; SHOW CLIENT_ENCODING;


import { lg } from './main.js';

export const ELEMENTCOLUMNPREFIX          = 'eid';
export const SYSTEMELEMENTNAMES           = { id : 'Object identificator', version: 'Object store version', lastversion: 'Flag indicates the object last instance', mask: 'Object modified elements bit mask', ownerid: 'User id the object was created by', owner: 'User name the object was created by', datetime: 'Date and time this object version was created at', date: 'The date this object version was created at', time: 'The time this object version was created at' };
const REGEXPCUTOFFCOLUMNTYPE              = new RegExp(`::\\S+`);
const REGEXPISUSERELEMENTCOLUMN           = new RegExp(`^${ELEMENTCOLUMNPREFIX}[1-9][0-9]*\\s*->>?\\s*['][^']*[']$|^${ELEMENTCOLUMNPREFIX}[1-9][0-9]*$`, `i`);
const REGEXPSEARCHUSERELEMENTCOLUMNNAME   = new RegExp(`^${ELEMENTCOLUMNPREFIX}[1-9][0-9]*`, `i`);
const PRIMARYKEYSTARTVALUE                = 3;

export class QueryMaker
{
 constructor()
 {
  lg('New Query Maker!');
 }

 // Function parsed select operand (column) and returns array of element name (id, version, edi1..) and element property name (in case of json type)
 GetColumnElementAndProp(column)
 {
  column = column.trim();
  const match = column.match(REGEXPCUTOFFCOLUMNTYPE);
  if (match) column = column.substring(0, match.index) + column.substring(match.index + match[0].length);
  if (column in SYSTEMELEMENTNAMES) return [column, null];
  if (!REGEXPISUSERELEMENTCOLUMN.test(column)) return [null, null];
  const pos = column.indexOf("'");
  return [column.match(REGEXPSEARCHUSERELEMENTCOLUMNNAME)[0].toLowerCase(), pos === -1 ? null : column.substring(pos + 1, column.length - 1)];
 }

 ExtractJSONPropField(column, prop)
 {
  return `${column}->'${prop}'`;
 }

 Table(table = '', hypertable)
 {
  this.table = table;
  this.hypertable = hypertable;
  delete this.method;
  delete this.index;
  delete this.mode;
  delete this.limit;
  this.fields = [];  // Column names array for 'SELECT', 'ADD COLUMN', 'CREATE INDEX' and 'WHERE' statements
  this.values = [];  // Values for corresponded fields above
  this.args = [];    // Real values for a above 'values' array to pass to the DB system
  this.signs = [];   // Comparing signs for 'where' fields and its values
  this.orderasc = [];
  this.orderdesc = [];
  return this;
 }

 // Base method of a query builder such as SELECT (view data), CREATE (table create, column add, index create), WRITE (data insert, data update), DROP (table, column)
 Method(method)
 {
  this.method = method;
  return this;
 }

 // CREATE/DROP method makes result query to create/drop index instead of create/drop column
 Index(indexmethod = 'btree')
 {
  this.index = indexmethod;
  return this;
 }

 // Method sets format of result data output
 Mode(mode)
 {
  this.mode = mode;
  return this;
  switch (this.mode) // Log result depending on mode
         {
          case 'VALUE':
               fields = this.Join(',', '').split(',')[0];
               if (!fields || fields === '*') fields = res.fields[0].name;
               lg(res.rows[0][fields]);
               break;
          case 'ROW':
               lg(res.rows[0]);
               break;
          case 'COLUMN':
               fields = this.Join(',', '').split(',')[0];
               if (!fields || fields === '*') fields = res.fields[0].name;
               for (const row of res.rows) lg(row[fields]);
               break;
          case 'COLUMNS':
               fields = this.Join(',', '').split(',');
               if (!fields || fields === '*') fields = res.fields;
               for (const row of res.rows)
                   {
                    for (const field of fields) lg(row[field]);
                    lg('___');
                   }
               break;
          default:
               lg(res.rows);
               break;
         }
 }

 ShowTables()
 {
  this.table = 'pg_tables';
  this.Method('SELECT').Fields('tablename').Fields({'schemaname': { sign: '=', value: 'public' } }).Mode('COLUMN');
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
  if (typeof fields === 'string')
     {
      this.fields.push(fields);
      return this;
     }

  if (Array.isArray(fields))
     {
      for (const field of fields) if (typeof field === 'string') this.fields.push(field);
      return this;
     }

  for (const name in fields)
      {
       let field = fields[name];                                                                                                    // Fix current field of object <fields>
       if (field === null || ['boolean', 'number', 'string', 'object'].indexOf(typeof field) === -1) continue;                      // Continue for disallowed field types
       if (typeof field !== 'object') field += '';                                                                                  // Bring field to string type, for non object types only
       if (typeof field === 'string') field = { value: field };                                                                     // Bring string type field to object type
       if (['boolean', 'number'].indexOf(typeof field.value) !== -1) field += '';                                                   // Bring field value to string
       const i = this.fields.push(name) - 1;                                                                                        // Return last pos of field array
       if (typeof field.value !== 'string') continue;                                                                               // Field value does exist?
       if (field.escape) this.args.push(field.value);                                                                               // Set arg array value to escapable for a true escape flag
       this.values[i] = field.escape ? `$${this.args.length}` : this.method === 'CREATE' ? field.value : `'${field.value}'`;        // Set <values> array element to direct value string or 'escaped' one ($i+1)
       if (typeof field.sign === 'string' && field.sign) this.signs[i] = field.sign;                                                // Set compare sign for where expressions
       if (typeof field.constraint === 'string' && field.constraint) this.values[i] += ' ' + field.constraint;                      // Field constraint does exist? Add it to the <value> array
      }
  return this;
 }

 // Method joins fields and values: <outerseparator><field1><innerseparator><value1><outerseparator><field2><innerseparator><value2>..
 Join(outerseparator, innerseparator)
 {
  let clause = '';
  if (typeof outerseparator !== 'string') outerseparator = '';
  const usewherefields = typeof innerseparator !== 'string';

  for (const i in this.fields)
      {
       if (!usewherefields && typeof this.signs[i] === 'string') continue;       // Continue for general/where fields mismatch
       if (usewherefields && typeof this.signs[i] !== 'string') continue;        // Continue for general/where fields mismatch
       if (usewherefields) innerseparator = this.signs[i];                       // Use compare sign as an inner separator for 'WHERE' clause
       clause += clause ? outerseparator : '';                                   // Insert outerseparator for non empty clause
       clause += outerseparator ? this.fields[i] : '';                           // Insert field in case of true outerseparator
       clause += clause ? innerseparator : '';                                   // Insert innerseparator for non empty clause
       clause += innerseparator ? this.values[i] : '';                           // Insert field value in case of true innerseparator
      }
  return clause;
 }
 
 Order(fields, type)
 {
  if (typeof fields === 'string') fields = [fields];
  if (!Array.isArray(fields)) return;
  for (const field of fields) type ? this.orderasc.push(field) : this.orderdesc.push(field);
  return this;
 }

 GetOrderClause()
 {
  let clause = '';
  for (const field of this.orderasc) clause += `${clause ? ', ' : ''}${field} ASC`;
  for (const field of this.orderdesc) clause += `${clause ? ', ' : ''}${field} DESC`;
  return clause ? ' ORDER BY ' + clause : '';
 }
 
 Limit(limit)
 {
  this.limit = limit + '';
  return this;
 }

 GetLimitClause()
 {
  return this.limit ? ` LIMIT ${this.limit}` : ``;
 }
 
 GetWhereClause()
 {
  // Select general fields from this.table with 'where' clause if exists
  const clause = this.Join(' AND ');
  return clause ? ' WHERE ' + clause : '';
 }

 BuildQuery()
 {
  this.query = '';
  switch (this.method)
         {
          case 'SELECT':
               this.query = `SELECT ${this.Join(',', '')} FROM ${this.table}${this.GetWhereClause()}${this.GetOrderClause()}${this.GetLimitClause()}`;
               break;
          case 'CREATE':
               // Add index for the column
               if (this.hypertable)
                  {
                   this.query = `SELECT create_hypertable('${this.table}', by_range('${this.hypertable}'))`;
                   break;
                  }
               if (this.index)
                  {
                   //this.query = `CREATE ${this.fields[field] === 'UNIQUE' ? 'UNIQUE ' : ''}INDEX CONCURRENTLY IF NOT EXISTS ${this.table}_${field}_index ON ${this.table} USING ${this.index} ('${field}')`; // Join 1st field name only
                   this.query = `CREATE ${this.values[0] === 'UNIQUE' ? 'UNIQUE ' : ''}INDEX ${this.table}_${this.fields[0]}_index ON ${this.table} USING ${this.index} (${this.fields[0]})`; // Join 1st field name only
                   break;
                  }
               // Create table in case of no columns defined
               if (!this.fields.length)
                  {
                   this.query = `CREATE TABLE ${this.table}()`; // Or should be like that: this.query = `CREATE TABLE IF NOT EXISTS ${this.table}()`;
                   break;
                  }
               // Add columns (or table constraint) at the end for default
               if (true)
                  {
                   for (const i in this.fields) if (!this.signs[i]) this.query += `ALTER TABLE ${this.table} ADD ${this.fields[i]} ${this.values[i]};`; // Insert non where clause (undefined signs[i]) fields only
                   break;
                  }
          case 'WRITE':
               if (this.hypertable)
                  {
                   this.query = `SELECT add_dimension('${this.table}', by_range('${this.hypertable}', 1000));`;
                   break;
                  }
               // signs.length is more then zero, so WHERE clause is present, so updating existing row. Otherwise insert new table row (WHERE clause is not present for zero signs.length)
               if (this.signs.length)
                  {
                   this.query = `UPDATE ${this.table} SET ${this.Join(',', '=')} WHERE ${this.Join(' AND ')}`;
                  }
                else
                  {
                   this.query = `INSERT INTO ${this.table} (${this.Join(',', '')}) VALUES (${this.Join('', ',')})`;
                  }
               break;
          case 'DROP':
               // Drop table in case of no columns defined
               if (!this.fields.length)
                  {
                   this.query = `DROP TABLE IF EXISTS ${this.table}`;
                   break;
                  }
               // At least one column is defined, so drop correpsponded index for this.index true value
               if (this.index)
                  {
                   //this.query = `DROP INDEX CONCURRENTLY IF EXISTS ${this.table}_${field}_index`;
                   this.query = `DROP INDEX IF EXISTS ${this.table}_${this.fields[0]}_index`;
                   break;
                  }
               // Delete rows
               if (this.query = this.GetWhereClause())
                  {
                   this.query = `DELETE FROM TABLE ${this.table}${this.query}`;
                   break;
                  }
               // Delete columns at the end for default. Todo0 - Statement 'DROP COLUMN' doesn't remove column physically. Fix it. See https://postgrespro.ru/docs/postgresql/14/sql-altertable for details
               if (true)
                  {
                   for (const i in this.fields) if (!this.signs[i]) this.query += `ALTER TABLE ${this.table} DROP COLUMN IF EXISTS ${this.fields[i]}`;
                   break;
                  }
          default:
               if (typeof this.table !== 'string') return;
               this.query = this.table;
         }
  return this;
 }

 Make(queryconfig)
 {
  this.BuildQuery();
  lg(`query: ${this.query}`);
  if (queryconfig) return [{ text: this.query, values: this.args, rowMode: 'array' }];
  return this.args.length ? [this.query, this.args] : [this.query];
 }
}
