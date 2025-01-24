// Todo0 - NodeJS highload https://www.youtube.com/watch?v=77h-_SytDhM
// Todo0 - Multithread https://tproger.ru/translations/guide-to-threads-in-node-js see comments
// Todo0 - scrypt from openssl (passwords hashing)
// Todo0 - auth https://nodejsdev.ru/guides/webdraftt/jwt/ https://zalki-lab.ru/node-js-passport-jwt-auth/ https://habr.com/ru/companies/ruvds/articles/457700/ https://nodejsdev.ru/api/crypto/#_2

import {} from './http.js';
import {} from './controller.js';
import { DatabaseBroker } from './databasebroker.js';
import { Controller } from './controller.js';

const RANDOMSTRINGCHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const controller = new Controller();

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
