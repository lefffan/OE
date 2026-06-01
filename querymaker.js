import * as globals from './globals.js';

const REGEXPCUTOFFCOLUMNTYPE              = new RegExp(`::\\S+`);
const REGEXPISUSERELEMENTCOLUMN           = new RegExp(`^${globals.ELEMENTCOLUMNPREFIX}[1-9][0-9]*\\s*->>?\\s*['][^']*[']$|^${globals.ELEMENTCOLUMNPREFIX}[1-9][0-9]*$`, `i`);
const REGEXPSEARCHUSERELEMENTCOLUMNNAME   = new RegExp(`^${globals.ELEMENTCOLUMNPREFIX}[1-9][0-9]*`, `i`);

export class QueryMaker
{
 // Function parsed select operand (column) and returns array of element name (id, version, edi1..) and element property name (in case of json type)
 GetColumnElementAndProp(column)
 {
  column = column.trim();
  const match = column.match(REGEXPCUTOFFCOLUMNTYPE);
  if (match) column = column.substring(0, match.index) + column.substring(match.index + match[0].length);
  if (column in globals.SYSTEMELEMENTNAMES) return [column, null];
  if (!REGEXPISUSERELEMENTCOLUMN.test(column)) return [null, null];
  const pos = column.indexOf("'");
  return [column.match(REGEXPSEARCHUSERELEMENTCOLUMNNAME)[0].toLowerCase(), pos === -1 ? null : column.substring(pos + 1, column.length - 1)];
 }

 // Function returns <column> property (in <prop>) extract for SELECT operand
 ExtractJSONPropField(column, prop)
 {
  return typeof prop === 'string' ? `${column}->'${prop}'` : column;
 }

 // Method joins field names and values (if exist) via specified separators: <outerseparator><fieldname1><innerseparator><fieldvalue1><outerseparator><fieldname2><innerseparator><fieldvalue2>..
 Join(props, outerseparator, innerseparator)
 {
  let clause = '';
  if (typeof outerseparator !== 'string') outerseparator = '';
  const usewherefields = typeof innerseparator !== 'string';

  for (const field of props.fields)
      {
       if (!usewherefields && typeof field.sign === 'string') continue; // Continue for general/where fields mismatch
       if (usewherefields && typeof field.sign !== 'string') continue;  // Continue for general/where fields mismatch
       if (usewherefields) innerseparator = field.sign;                 // Use compare sign as an inner separator for 'WHERE' clause
       clause += clause ? outerseparator : '';                          // Insert outerseparator for non empty clause
       clause += outerseparator ? field.name : '';                      // Insert field name in case of true outerseparator
       clause += clause ? innerseparator : '';                          // Insert innerseparator for non empty clause
       clause += innerseparator ? field.value : '';                     // Insert field value in case of true innerseparator
      }

  if (clause && usewherefields) clause = ' WHERE ' + clause;
  return clause;
 }

 // Function adjusts fields, builds query string based on <props> and returns args array for the pg driver depending on <config>
 Make(props, config)
 {
  // Each field of fields array represents a column object for 'SELECT', 'ADD COLUMN' and 'CREATE INDEX' statements with next props: <column name>:
  //    {
  //     name:,         /**/ Column name
  //     value:,        /**/ Column value
  //     type:,         /**/ Column type: bigserial (from 1 to 9223372036854775807), integer (from -2147483648 to +2147483647), bigint (from -9223372036854775808 to +9223372036854775807), varchar(n) ('n' length string), timestamp (date and time), boolean (TRUE|FALSE), json. See https://metanit.com/sql/postgresql/2.3.php for other types
  //     constraint:,   /**/ Column constraint: PRIMARY <primary key options are inserted automatically>|UNIQUE|DEFAULT <user specified value>. See https://postgrespro.ru/docs/postgresql/14/sql-altertable for details
  //     escape:,       /**/ Column true or false value escaping
  //     sign:,         /**/ Column comapre signs =|<>|>|< for WHERE clause
  //    }
  const args = [];

  if (!props.fields) props.fields = [];
  if (!Array.isArray(props.fields)) props.fields = [props.fields];
  for (const i in props.fields) // Adjust 'fields' props
      {
       let field = props.fields[i];                                                                         // Fix current field
       if (typeof field === 'string') { props.fields[i] = { name: field }; field = props.fields[i]; }       // Bring string type field to object
       if ((!field || typeof field !== 'object') && props.fields.splice(i, 1)) continue;                    // Continue for non-object field with it removing
       if (!('value' in field)) continue;                                                                   // Adjust field value below
       if (['boolean', 'number'].includes(typeof field.value)) field.value += '';                           // Bring boolean/number field value to string type
       if (typeof field.constraint === 'string' && field.constraint) field.value += ` ${field.constraint}`; // Field constraint does exist? Add it to the field value
       if (field.escape) field.value = `$${args.push(field.value)}`;                                        // In case of escaped field value - push field value to <args> array and set field value to its array index as an arg number
       if (!field.escape && props.method !== 'CREATE') field.value = `'${field.value}'`;                    // In case of nonescaped field value and nonCREATE method - quote field value (for WHERE/INSERT clause)
      }
  if ('orderasc' in props) props.orderasc = ` ORDER BY ${props.orderasc} ASC`; // Adjust 'order' props
  if ('orderdesc' in props) props.orderdesc = ` ORDER BY ${props.orderdesc} DESC`; // Adjust 'order' props

  const query = this.BuildQuery(props);
  console.log(`Making a query: ${query}`);
  if (config) return [Object.assign(config, { text: query, values: args })];
  return args.length ? [query, args] : [query];
 }

 // Function builds query string based on <props>
 BuildQuery(props)
 {
  let query = '';
  switch (props.method)
         {
          case 'SELECT':
               if ('lock' in props) return `SELECT pg_advisory_xact_lock(${props.lock})`; // Lock <props.lock> id
               if ('where' in props) return `SELECT ${this.Join(props, ',', '')} FROM ${props.table} WHERE ${props.where}${props.orderasc || props.orderdesc ? (props.orderasc || props.orderdesc) : ''}${props.limit ? ' LIMIT ' + props.limit : ''}`;
               return `SELECT ${this.Join(props, ',', '')} FROM ${props.table}${this.Join(props, ' AND ')}${props.orderasc || props.orderdesc ? (props.orderasc || props.orderdesc) : ''}${props.limit ? ' LIMIT ' + props.limit : ''}`;
          case 'CREATE':
               if ('privileges' in props) return `GRANT ${props.privileges} ON TABLE ${props.table} TO ${props.role}`; // GRANT SELECT|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|ALL ON TABLE <table> TO <role>;
               if ('role' in props) return `CREATE ROLE ${props.role}; GRANT CONNECT ON DATABASE ${props.database} TO ${props.role}; GRANT USAGE ON SCHEMA public TO ${props.role}`; // CREATE ROLE <props.role>
               if ('database' in props) return `CREATE DATABASE ${props.database}`; // Create database
               if ('hypertable' in props) return `SELECT create_hypertable('${props.table}', by_range('${props.hypertable}'))`; // Create hyper table
               if ('index' in props) return `CREATE ${props.fields[0].value === 'UNIQUE' ? 'UNIQUE ' : ''}INDEX ${props.table}_${props.fields[0].name}_index ON ${props.table} USING ${props.index} (${props.fields[0].name})`; // Create index for 1st field only
               for (const field of props.fields) if (!('sign' in field)) query += `ALTER TABLE ${props.table} ADD ${field.name} ${field.value};`; // Add non-where clause (no sign prop) columns at the end for default
               return query ? query : `CREATE TABLE ${props.table}()`; // Add non-where clause (no sign prop) columns for any field exist or create table (should `IF NOT EXIST` be used?) in case of no fields defined otherwise
          case 'WRITE':
               if ('hypertable' in props) return `SELECT add_dimension('${props.table}', by_range('${props.hypertable}', 1000))`; // Write hyper table dimension
               query = this.Join(props, ' AND '); // Get WHERE clause in case of any field with sign does exist
               return query ? `UPDATE ${props.table} SET ${this.Join(props, ',', '=')}${query}` : `INSERT INTO ${props.table} (${this.Join(props, ',', '')}) VALUES (${this.Join(props, '', ',')})`; // Update matched rows or insert new row otherwise
          case 'DROP':
               if ('privileges' in props) return `REVOKE ${props.privileges} ON TABLE ${props.table} FROM ${props.role}`; // DROP role privileges
               if ('role' in props) return `REVOKE CONNECT ON DATABASE ${props.database} FROM ${props.role}; REVOKE USAGE ON SCHEMA public FROM ${props.role}; DROP ROLE ${props.role}`; // DROP role
               if ('database' in props) return `DROP DATABASE IF EXISTS ${props.database}`; // Drop database
               if (!props.fields.length) return `DROP TABLE IF EXISTS ${props.table}`; // Drop table for no any fields defined
               if ('index' in props) return `DROP INDEX IF EXISTS ${props.table}_${props.fields[0].name}_index`; // Drop index for 1st field. Should 'DROP INDEX CONCURRENTLY IF EXISTS' be used?
               if (query = this.Join(props, ' AND ')) return `DELETE FROM TABLE ${props.table}${query}`; // Drop rows matched WHERE clause
               for (const field of props.fields) query += `ALTER TABLE ${props.table} DROP COLUMN IF EXISTS ${field.name};`; // Drop columns at the end for default. Todo0 - Statement 'DROP COLUMN' doesn't remove column physically. Fix it. See https://postgrespro.ru/docs/postgresql/14/sql-altertable for details
               return query;
          case 'SHOWTABLES':
               return this.BuildQuery({ method: 'SELECT', table: 'pg_tables', fields: [{ name: 'tablename' }, { name: 'schemaname', sign: '=', value: `'public'` }] }); // Props for BuildQuery() function should be passed already prepared, cause preparing is done at Make() function
          case 'CREATETMDBEXTENSION':
               return 'CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE';
          case 'BEGIN':
               return 'role' in props ? `BEGIN; SET LOCAL ROLE ${props.role}` : 'BEGIN';
          case 'COMMIT':
               return 'COMMIT';
          case 'ROLLBACK':
               return 'ROLLBACK';
          default:
               return props.query;
         }
 }
}

// Todo0 - index columns: alter table data_1 add index (`lastversion`);
// Todo0 - problems of deploying - can postgreSQL be used on commercial base? 
// Todo0 - db readonly replicas?
// Todo0 - 19/03/2026: Process no PGSQL running error, in this case no error in concole and client side shows just no any OD in sidebar without any warnings. What if new OD is created? What error will it be?
// Todo0 - Study psql syntax:
//         SELECT current_database(); SELECT current_schema(); SELECT current_user;
//         \c oe postgres - connect to oe db via user postgres (https://www.postgresql.org/docs/9.1/app-psql.html)
//         \l list databases
//         \dt [*.*] list tables [of all schemas]
//         \c postgres postgres; 
//         \d <table> - DESCRIBE TABLE
//         set client_encoding='win1251'; chcp 1251 SHOW SERVER_ENCODING; SHOW CLIENT_ENCODING;
//         JSON functions and operators https://postgrespro.ru/docs/postgresql/14/functions-json
//         SELECT operator https://postgrespro.ru/docs/postgresql/14/sql-select