// Todo0 - NodeJS highload https://www.youtube.com/watch?v=77h-_SytDhM
// Todo0 - Multithread https://tproger.ru/translations/guide-to-threads-in-node-js see comments
// Todo0 - scrypt from openssl (passwords hashing)
// Todo0 - auth https://nodejsdev.ru/guides/webdraftt/jwt/ https://zalki-lab.ru/node-js-passport-jwt-auth/ https://habr.com/ru/companies/ruvds/articles/457700/ https://nodejsdev.ru/api/crypto/#_2

import {} from './http.js';
import {} from './controller.js';
import { Controller } from './controller.js';

import pg from 'pg';
const { Pool, Client } = pg
const DBCONNECTION = { host: '127.0.0.1', port: 5433, database: 'oe', user: 'postgres', password: '123' };
export const pool = new Pool(DBCONNECTION);

const RANDOMSTRINGCHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const USERNAMEMAXCHAR  = 64;
export const controller = new Controller();
const PROFILEFIELDSDIVIDER = '|';

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

// Function returns array of js objects (dialog interface elements) matched input element props (path, type..)
// Retreive object database all views aliases example - GetDialogElementListByPath(/View//General) returns all view profiles (except template 'New view') with 'General' profile nested, for a exa prof' (empty folder matches all)
export function SearchDialogElements(dialog, search)
{
 let result = [];
 for (const i in dialog)
     {
      const e = dialog[i]; // Fix current diaog interface element
      let match = true; // Set true match for default
      for (const prop in search) // Go through all search object props
       if (prop === 'path') // Test 'path' prop first
          {
           const searchpath = search[prop].split('/'); // Split search path
           const elementpath = e.path.split('/'); // Split element path
           if (searchpath.length !== elementpath.length && !(match = false)) break; // Break for splited paths unmatching length
           for (const j in searchpath) // Go through all folders in search path
               {
                const pos = elementpath[j].indexOf(PROFILEFIELDSDIVIDER);
                if (pos !== -1) elementpath[j] = elementpath[j].substring(0, pos);
                if (j === '1' && ['New element', 'New view', 'New rule'].indexOf(elementpath[j]) !== -1 && !(match = false)) break; // No match for template dialog profiles
                if (!searchpath[j]) continue; // Empty folder in search path matches all
                //if (elementpath[j].indexOf(searchpath[j]) === -1 && !(match = false)) break;
                if (!(new RegExp(searchpath[j]).test(elementpath[j])) && !(match = false)) break;
               }
           if (!match) break; // Match is unsuccessful so other search is not needed - break it to continue with next dialog interface element
          }
        else
          {
           //if (!e[prop] || (e[prop].indexOf(search[prop]) === -1 && !(match = false))) break; // Simple match string test for non-path search props
           if (!e[prop] || (!(new RegExp(search[prop]).test(e[prop])) && !(match = false))) break; // Simple match string test for non-path search props
          }
      if (match) result.push(dialog[i]);
     }
 return result;
}
