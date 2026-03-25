import pg from 'pg';
import { Controller } from './controller.js';
import { QueryMaker } from './querymaker.js';
import { EditDatabase } from './objectdatabase.js';
import * as globals from './globals.js';

const { Pool, Client }          = pg;
export const DBNAME             = 'oe';
const DBDEFAULTCONFIG           = { host: '127.0.0.1', port: '5433', user: 'postgres', password: '123', database: 'postgres' };
const DBADMINCONFIG             = Object.assign(JSON.parse(JSON.stringify(DBDEFAULTCONFIG)), { database: DBNAME });
export const pool               = new Pool(DBADMINCONFIG); // https://node-postgres.com/apis/pool
export const qm                 = new QueryMaker();
export let controller;

switch (process.argv[2])
       {
        case 'start':
             controller = new Controller();
             break;
        case 'reset':
             await Reset();
             process.exit(0);
        default:
             console.log(`Usage: ${process.argv[1]} start|reset`);
             process.exit(0);
       }

async function Reset()
{
 let client;
 try {
      client = new Client(DBDEFAULTCONFIG);
      await client.connect();
      const rousers = await client.query(...qm.Table(null, null, DBNAME).Table('pg_roles').Method('SELECT').Fields('rolname').Fields({ rolname: { value: 'rouserodid%', sign: ' LIKE ' } }).Make());
      const rwusers = await client.query(...qm.Table(null, null, DBNAME).Table('pg_roles').Method('SELECT').Fields('rolname').Fields({ rolname: { value: 'rwuserodid%', sign: ' LIKE ' } }).Make());
      await client.end();

      client = new Client(DBADMINCONFIG);
      await client.connect();
      if (Array.isArray(rousers?.rows)) for (const row of rousers.rows)
         {
          const odid = row.rolname?.match(/\d+$/)?.[0]; 
          if (odid) await client.query(...qm.Table(`data_${odid},metr_${odid},rand_${odid}`, null, DBNAME).Method('DROP').Role(row.rolname, 'SELECT').Make());
          console.log(`Dropping role '${row.rolname}'.. dropped!`);
         }
      if (Array.isArray(rwusers?.rows)) for (const row of rwusers.rows)
         {
          const odid = row.rolname?.match(/\d+$/)?.[0]; 
          if (odid) await client.query(...qm.Table(`data_${odid},metr_${odid},rand_${odid}`, null, DBNAME).Method('DROP').Role(row.rolname, 'SELECT, INSERT, UPDATE, DELETE').Make());
          console.log(`Dropping role '${row.rolname}'.. dropped!`);
         }
      await client.end();

      client = new Client(DBDEFAULTCONFIG);
      await client.connect();
      await client.query(...qm.Table(null, null, DBNAME).Method('DROP').Make());
      console.log(`Database ${DBNAME} is dropped`);
      await client.query(...qm.Table(null, null, DBNAME).Method('CREATE').Make());
      console.log(`Database ${DBNAME} is created successfully`);
      await client.end();

      client = new Client(DBADMINCONFIG);
      await client.connect();
      await client.query(...qm.Table('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE').Make());
      console.log(`TimescaleDB extension is activated successfully`);
      await client.end();
     }
catch (err)
     {
      console.error('Resetting database error: ', err.stack);
     }

 const userdb = JSON.parse(JSON.stringify(globals.NEWOBJECTDATABASE));
 globals.GetDialogElement(userdb, `padbar/Database/settings/General/dbname`, 'Users');
 
 let elements = globals.GetDialogElement(userdb, 'padbar/Element/elements', true);
 let elementtoclone = globals.GetDialogElement(userdb, 'padbar/Element/elements/New element template');
 let profiles = { 'username~*': { name: 'Username', description: 'Username', type: `VARCHAR(${globals.USERNAMEMAXCHAR})`, index: 'None/btree/UNIQUE btree~!/hash' },
                  'password~*': { name: 'Password', description: 'Password', type: 'TEXT', index: 'None~!/btree/UNIQUE btree/hash' },
                  'custom~*': { name: 'Custom field', description: 'Custom field', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' },
                  'policy~*': { name: 'Policy', description: 'Policy', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' },
                  'macroses~*': { name: 'Macroses', description: 'Macroses', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' },
                  'customization~*': { name: 'Customization', description: 'Customization', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' },
                  'event groups~*': { name: 'Event groups', description: 'Event groups', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' } };
 for (const profile in profiles)
     {
      elements[profile] = JSON.parse(JSON.stringify(elementtoclone));
      for (const prop in profiles[profile]) elements[profile][prop].data = profiles[profile][prop];
     }

 elements = globals.GetDialogElement(userdb, 'padbar/View/views', true);
 elementtoclone = globals.GetDialogElement(userdb, 'padbar/View/views/New view template');
 const layout = `{"row":"r < 10", "col":"id|eid1|datetime::varchar(171)|eid1::json->>'valu'|eid1::json->'value'", "x":"c", "y":"1*(r+2)+3", "s tyle": "color: red;"}
{"row":"r < 9", "col":"id|eid1|datetime::varchar(171)|eid1::json->>'valu'|eid1::json->'value'", "x":"c", "y":"1*(r+2)+4", "s tyle": "color: red;"}

"row":"r%2===1 || r%2===-1", "col":"id", "attributes": "title=\"@@@@@@@@@\" style=\"background-color: green;\"", "value":"HUIIII"}

{"r ow":"r%2===1 || r%2===-1", "row":"1", "col":"", "s tyle": "color: red;", "v alue":"HUIIII", "hint":"@@@@@@@@#%^&*("}
{"event":"", "x":"0", "y":"13311"}

{"ow":"r === -1", "col":"", "x":"c", "y":"19", "s tyle": "color: red;"}`;
 profiles = { 'All~*': { 'General/name': 'All users', 'General/description': 'All users list', 'Selection/layout': layout, 'Selection/query': 'SELECT *\nFROM data_1' }, };
 for (const profile in profiles)
     {
      elements[profile] = JSON.parse(JSON.stringify(elementtoclone));
      for (const prop in profiles[profile]) elements[profile]['settings']['data'][prop.split('/')[0]][prop.split('/')[1]].data = profiles[profile][prop];
     }

 await EditDatabase({ type: 'SETDATABASE', data: { dialog: userdb } }, null, true);
}
