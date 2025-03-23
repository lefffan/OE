// Todo0 - NodeJS highload https://www.youtube.com/watch?v=77h-_SytDhM
// Todo0 - Multithread https://tproger.ru/translations/guide-to-threads-in-node-js see comments
// Todo0 - scrypt from openssl (passwords hashing)
// Todo0 - auth https://nodejsdev.ru/guides/webdraftt/jwt/ https://zalki-lab.ru/node-js-passport-jwt-auth/ https://habr.com/ru/companies/ruvds/articles/457700/ https://nodejsdev.ru/api/crypto/#_2

import pg from 'pg';
import { WebSocketServer } from 'ws';
import {} from './http.js';
import { Controller } from './controller.js';
import { QueryMaker } from './querymaker.js';

const RANDOMSTRINGCHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const { Pool, Client } = pg
export const pool = new Pool({ host: '127.0.0.1', port: 5433, database: 'oe', user: 'postgres', password: '123' });
export const qm = new QueryMaker();
export const USERNAMEMAXCHAR  = 64;
export const WSIP = '127.0.0.1';
export const WSPORT = '8002';
export const FIELDSDIVIDER = '~';
export const controller = new Controller();

new WebSocketServer({ port: WSPORT }).on('connection', WSNewConnection);

function WSMessage(msg)
{
 controller.MessageIn(msg, this);
}

function WSError(err)
{
 console.error(err);
}

// Var <client>/<this> is a ws connection object that is passed first at websocket init and stored in <clients> map object
function WSNewConnection(client)
{
 controller.clients.set(client, { socket: client }); // { auth: true|false, userid:, }
 client.on('message', WSMessage);
 client.on('error', WSError);
}

export function lg(...data)
{
 console.log(...data);
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
export function GetDialogElement(dialog, path)
{
 if (!dialog || typeof dialog !== 'object') return;
 path = path.split('/')
 for (let i in path)
     {
      dialog = +i%2 ? GetOptionInSelectElement(dialog, path[i]) : dialog[path[i]];
      if (!dialog) return;
     }
 return dialog;
}

function GetOptionInSelectElement(e, option)
{
 if (!e?.data || e.type !== 'select' || typeof e.data !== 'object') return;
 for (const name in e.data) if (CompareOptionInSelectElement(option, name)) return e.data[name];
}

export function CompareOptionInSelectElement(string, option)
{
 [string] = string.split('~', 1);
 [option] = option.split('~', 1);
 return string === option;
}