// Todo0 - Study the doc:
//         NodeJS highload https://www.youtube.com/watch?v=77h-_SytDhM
//         NodeJS multithread https://tproger.ru/translations/guide-to-threads-in-node-js
//         Multithread https://tproger.ru/translations/guide-to-threads-in-node-js see comments
//         scrypt from openssl (passwords hashing)
//         auth https://nodejsdev.ru/guides/webdraftt/jwt/ https://zalki-lab.ru/node-js-passport-jwt-auth/ https://habr.com/ru/companies/ruvds/articles/457700/ https://nodejsdev.ru/api/crypto/#_2

import pg from 'pg';
import { WebSocketServer } from 'ws';
import {} from './http.js';
import { Controller } from './controller.js';
import { QueryMaker } from './querymaker.js';
import { EditDatabase } from './objectdatabase.js';
import * as globals from './globals.js';

const { Pool, Client }          = pg;
const DBNAME                    = 'oe';
const DBDEFAULTCONFIG           = { host: '127.0.0.1', port: '5433', user: 'postgres', password: '123', database: 'postgres' };
const DBADMINCONFIG             = Object.assign(JSON.parse(JSON.stringify(DBDEFAULTCONFIG)), { database: DBNAME });
export const pool               = new Pool(DBADMINCONFIG); // https://node-postgres.com/apis/pool
export const qm                 = new QueryMaker();
export const USERNAMEMAXCHAR    = 64;
export const WSIP               = '127.0.0.1';
export const WSPORT             = '8002';
export const FIELDSDIVIDER      = '~';
export let controller;

switch (process.argv[2])
       {
        case 'start':
             controller = new Controller();
             new WebSocketServer({ port: WSPORT }).on('connection', WSNewConnection);
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
 try {
      const client = new Client(DBDEFAULTCONFIG);
      await client.connect();
      await client.query(...qm.Table(null, null, DBNAME).Method('DROP').Make());
      console.log(`Database ${DBNAME} is dropped`);
      await client.query(...qm.Table(null, null, DBNAME).Method('CREATE').Make());
      console.log(`Database ${DBNAME} is created successfully`);
      await client.end();

      const dbclient = new Client(DBADMINCONFIG);
      await dbclient.connect();
      await dbclient.query(...qm.Table('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE').Make());
      console.log(`TimescaleDB extension is activated successfully`);
      await dbclient.end();
     }
catch (err)
     {
      console.error('Resetting database error: ', err.stack);
     }

 const userdb = JSON.parse(JSON.stringify(globals.NEWOBJECTDATABASE));
 GetDialogElement(userdb, `padbar/Database/settings/General/dbname`, 'Users');
 //for (const type of [])
 await EditDatabase({ type: 'SETDATABASE', data: { dialog: userdb } }, null, true);
}

function WSMessage(msg)
{
 controller.Handler(msg, this);
}

function WSError(err)
{
 console.log(err);
}

function WSClose(code)
{
 console.log(`Sockect was closed with code ${code}`);
 controller.clients.delete(this);
}

// Var <client>/<this> is a ws connection object that is passed first at websocket init and stored in <clients> map object
function WSNewConnection(client, req)
{
 console.log('Sockect is opened');
 controller.clients.set(client, { socket: client, ip: req.socket.remoteAddress }); // { auth: true|false, userid:, }
 client.on('message', WSMessage);
 client.on('error', WSError);
 client.on('close', WSClose);
}

export function GenerateRandomString(length)
{
 let randomstring = '';
 for (let i = 0; i < length; i++) randomstring += globals.RANDOMSTRINGCHARS[Math.floor(Math.random() * globals.RANDOMSTRINGCHARS.length)];
 return randomstring;
}

// Dialog data has next structure: profile -> element -> profile -> element -> profile.., so path represents a slash divided string to point needed element or profile: element1/profile1/element2/profile2..
// Function search specified element or profile for specified splited path. Undefined <value> just return a found element for a specified <path>, string type <value> set found element data to <value>, other <value> types - data prop of a found element is returned
export function GetDialogElement(dialog, path, value)
{
 if (!dialog || typeof dialog !== 'object') return;
 path = path.split('/')
 for (let i in path) // Go through all elements of splited path 
     {
      dialog = +i%2 ? GetOptionInSelectElement(dialog, path[i]) : dialog[path[i]]; // Go to next element or profile (element group)
      if (!dialog) return;
     }

 switch (typeof value) // Undefined <value> just return a found element (current <dialog> var) for a specified <path>, string type <value> set found element data to <value>, other <value> types - data prop of a found element is returned (for selectable elements with at least one checked option first checked option name is returned instead of whole data prop)
        {
          case 'undefined':
               return dialog;
          case 'string':
               dialog.data = value;
               break;
          default:
               if (['select', 'multiple', 'checkbox', 'radio'].includes(dialog.type) && typeof dialog.data === 'string')
               for (const option of dialog.data.split('/'))
                   {
                    const [name, flag] = option.split(FIELDSDIVIDER, 2);
                    if (flag && flag.includes('!')) return name;
                  }
               return dialog.data;
        }
}

export function GetOptionInSelectElement(e, option)
{
 if (!e?.data || e.type !== 'select' || typeof e.data !== 'object') return;
 for (const name in e.data) if (CompareOptionInSelectElement(option, name)) return e.data[name];
}

export function GetOptionNameInSelectElement(e, option)
{
 if (!e?.data || e.type !== 'select' || typeof e.data !== 'object') return;
 for (const name in e.data) if (CompareOptionInSelectElement(option, name)) return name;
}

export function CompareOptionInSelectElement(string, option)
{
 [string] = string.split('~', 1);
 [option] = option.split('~', 1);
 return string === option;
}
