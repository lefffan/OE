// Todo0 - Study the doc:
//         NodeJS highload https://www.youtube.com/watch?v=77h-_SytDhM
//         Multithread https://tproger.ru/translations/guide-to-threads-in-node-js see comments
//         scrypt from openssl (passwords hashing)
//         auth https://nodejsdev.ru/guides/webdraftt/jwt/ https://zalki-lab.ru/node-js-passport-jwt-auth/ https://habr.com/ru/companies/ruvds/articles/457700/ https://nodejsdev.ru/api/crypto/#_2

import pg from 'pg';
import { WebSocketServer } from 'ws';
import {} from './http.js';
import { Controller } from './controller.js';
import { QueryMaker } from './querymaker.js';
import * as globalnames from './globalnames.js';

const RANDOMSTRINGCHARS         = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const { Pool, Client }          = pg;
export const pool               = new Pool({ host: '127.0.0.1', port: 5433, database: 'oe', user: 'postgres', password: '123' }); // https://node-postgres.com/apis/pool
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
             console.log('Dropping all existing and creating initial user database..');
             const userdb = JSON.parse(JSON.stringify(globalnames.NEWOBJECTDATABASE));
             
             process.exit(0);
             // ended here - make sitch/case for app start/reset, then edit new db template to userdb and create a root user
        default:
             console.log(`Usage: ${process.argv[1]} start|reset`);
             process.exit(0);
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

export function lg(...data)
{
 console.log(...data);
}

export function loog(...data)
{
 for (const object of data) console.dir(object);
}

export function GenerateRandomString(length)
{
 let randomstring = '';
 for (let i = 0; i < length; i++) randomstring += RANDOMSTRINGCHARS[Math.floor(Math.random() * RANDOMSTRINGCHARS.length)];
 return randomstring;
}

export function CutString(string, length = RANDOMSTRINGCHARS.length)
{
 if (typeof string !== 'string') string = '';
 return string.length > length ? string.substring(0, length - 2) + '..' : string;
}

// Function search specified element in splited path, zero based array has elements for non odd indexed and 'select' element option for odd indexes
export function GetDialogElement(dialog, path, getdata)
{
 if (!dialog || typeof dialog !== 'object') return;
 path = path.split('/')
 for (let i in path)
     {
      dialog = +i%2 ? GetOptionInSelectElement(dialog, path[i]) : dialog[path[i]];
      if (!dialog) return;
     }

 if (!getdata) return dialog;

 if (dialog.type === 'select' && typeof dialog.data === 'object') return dialog.data;

 if (['select', 'multiple', 'checkbox', 'radio'].includes(dialog.type) && typeof dialog.data === 'string')
    for (const option of dialog.data.split('/'))
        {
         const [name, flag] = option.split(FIELDSDIVIDER, 2);
         if (flag && flag.includes('!')) return name;
        }

 if (['textarea', 'text', 'password'].includes(dialog.type) && typeof dialog.data === 'string') return dialog.data;

 return;
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
