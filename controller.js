import argon2 from 'argon2';
import http from 'http';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import * as macro from './macro.js';
import * as qm from './querymaker.js';
import * as consts from './static/consts.js';
import * as funcs from './static/funcs.js';
import { escape } from 'querystring';

const { Pool, Client }      = pg;
const UNKNOWNDBID           = 'Incorrect or nonexistent database id!';
const INCORRECTDBCONFDIALOG = 'Incorrect database configuration dialog';
const INCORRECTUSERSOD      = `Incorrect 'Users' OD (id 1) data!`;
const INCORRECTLAYOUT       = 'Incorrect layout - no any object/virtual elements defined in OD configuration layout section!';
const UNAUTHORIZEDACCESS    = 'Unauthorized access detected, please relogin!';
const TIMEOUTACCESS         = 'Server has closed connection due timeout, please relogin!';
const UNDEFINEDQUERYRES     = 'Database query returned udnefined result!';
const EMPTYQUERY            = 'OV query is empty!';
const EMPTYODLIST           = 'OD list is empty!';
const INCORRECTDBCONFDBNAME = 'In order to remove Object Database via setting empty database name please remove all elements, views and rules first!';
const EMPTYDBCONFDBNAME     = 'Cannot create new database with empty name!';
const CONFIGURATENOTALLOWED = 'You are not allowed to configurate this Object Database!';

let   LASTLOGMSG            = '';
let   LASTLOGCOUNTER        = 0;

export class Controller
{
 async ClosePool()
 {
  if (!this.pool) return;
  await this.pool.end();
  funcs.Log('DB pool is closed successfully!', {}, consts.LOGTOSTDOUT);
 }

 async GracefulShutdown(signal)
 {
  funcs.Log(`Received '${signal}' signal. Closing connections...`, {}, consts.LOGTOSTDOUT);
  try {
       await this.ClosePool();
       process.exit(0); // Closing process with no errors
      }
  catch(error)
      {
       funcs.Log(`Error closing DB pool: ${error.stack}`);
       process.exit(1); // Closing process with some errors
      }
 }

 // Arrow function example (specified ms value to sleep by): export const freeze = ms => new Promise(resolve => setTimeout(resolve, ms)); // await freeze(0);
 constructor(HTTP, WS, DB)
 {
  pg.types.setTypeParser(1114, str => str); // Redefine type parsers (just return a string instead of JS conversion): 1114 — TIMESTAMP inner ID in Postgres
  pg.types.setTypeParser(1082, str => str); // Redefine type parsers (just return a string instead of JS conversion): 1082 — DATE inner ID in Postgres
  pg.types.setTypeParser(1184, str => str); // Redefine type parsers (just return a string instead of JS conversion): 1184 — TIMESTAMPTZ inner ID in Postgres

  global[consts.WRITETOFILEFUNC] = (header, msg) => // Bind 'write-to-logfile' function to global object uniq property (Symbol). Needed for 'Log' function in func.js that is used as an external module in both NodeJS and browser js virtual machine
  {
   if (LASTLOGMSG === msg) return LASTLOGCOUNTER++;
   if (LASTLOGCOUNTER) fs.appendFile(consts.LOGFILENAME, `Last message repeated ${LASTLOGCOUNTER} time(s)\n\n`, 'utf8', (err) => err ? console.error(`Failed writing log file '${consts.LOGFILENAME}': ${err}`) : undefined);
   LASTLOGCOUNTER = 0;
   LASTLOGMSG = msg;
   fs.appendFile(consts.LOGFILENAME, `${header}${msg}\n${consts.MSGDELIMITER}`, 'utf8', (err) => err ? console.error(`Failed writing log file '${consts.LOGFILENAME}': ${err}`) : undefined);
  } 

  if (this.HTTP = HTTP) http.createServer(this.HTTPNewConnection.bind(this)).listen(HTTP.port, HTTP.ip); // Todo0 - set secure server via https instead of http
  if (this.WS = WS) new WebSocketServer({ host: WS.ip, port: WS.port }).on('connection', this.WSNewConnection.bind(this));
  if (this.DB = DB) this.pool = new Pool(DB.adminconfig);
  // Client auth codes object [authcode]: { userid:, username: }
  this.clientauthcodes = {};
  // Session object [socket]: { socket:, ip:, ods: { [odid]: { ovs: { [ovid]: { query:, replacements: } } } }, auth:, userid:, username:, idle: }
  this.sessions = new Map();
  // App OD object [odid]: { dialog:, od: {}, elements: {}, views: {}, rules: {} }
  this.ods = {};
  // User profile object [userid]: { name:, tags: [username, usergroup1, usergroup2..], policy: {}, customization: {}, eventgroups: {} }
  this.ups = {};
  // App module object [module name]: module
  this.modules = {};
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => this.GracefulShutdown(signal)); // Todo1 - should  signal 'uncaughtException' be added for a final app version?
 }

 async Start()
 {
  this.module = await this.LoadModules();
  await this.ReadAllDatabase();
 }

 // Function load all modules to be used as a handlers
 async LoadModules()
 {
  const __dirname = path.dirname(fileURLToPath(import.meta.url)); // Current file dir name
  const absolutedir = path.join(__dirname, 'modules'); // Plus './modules' folder
  const files = fs.readdirSync(absolutedir); // Get modules folder all files

  for (const file of files)
      {
       if (!file.endsWith('.js')) continue;
       const modulename = path.parse(file).name;
       const fulldir = path.join(absolutedir, file);
       funcs.Log(`Loading module '${modulename}' from file://${fulldir}...`, {}, consts.LOGTOSTDOUT);
       this.modules[modulename] = await import(`file://${fulldir}`);
       funcs.Log('done', {}, consts.LOGTOSTDOUT);
      }
 }

 // Function is called at controller creation (constructor) to suck all app databases in
 async ReadAllDatabase()
 {
  const tables = [];

  try {
       const showtables = await this.pool.query(...qm.Make({ method: 'SHOWTABLES' })); // Get all sql tables
       for (const table of showtables.rows) tables.push(table.tablename); // and store them
       if (!tables.length) throw new Error(EMPTYODLIST); // Cause an error for empty table list
      }
  catch(error)
      {
       funcs.Log(error.stack, { EVENTNAME: 'Application start or DB reset' });
       return;
      }
 
  for (const table of tables)
      {
       const odid = funcs.GetTableNameId(table);                                                                                      // Get table id
       if (!odid || !tables.includes(`head_${odid}`) || !tables.includes(`data_${odid}`) || !tables.includes(`metr_${odid}`))
          {
           funcs.Log(`Undefined id '${odid}' in table name or required SQL tables (head_${odid}, data_${odid} or metr_${odid}) are missing!`);
           continue;
          }
       if (odid in this.ods) continue;                                                                                                  // OD with id <odid> already sucked in
 
       try {
            const dialog = await this.pool.query(...qm.Make({ method: 'SELECT', table: `head_${odid}`, orderdesc: 'id', limit: '1', fields: ['dialog'] })); // Get OD structure dialog last version from head_id table
            const databaseprops = funcs.SuckInDatabaseProps(dialog.rows[0].dialog, odid); // and suck it to the memory
            if (!databaseprops) throw new Error(INCORRECTDBCONFDIALOG + ` in table head_${odid}`);
            this.ods[odid] = databaseprops;
            if (odid === '1')
               {
                const userrows = await this.pool.query(...qm.Make({ method: 'SELECT', table: `data_1`, fields: ['id', 'eid1', 'eid4', 'eid5', 'eid6', { name: 'lastversion', sign: '=', value: 'true' }] }));
                if (!Array.isArray(userrows?.rows)) throw new Error(INCORRECTUSERSOD);
                for (const userrow of userrows.rows)
                    {
                     const userprops = funcs.SuckInUserProps(userrow);
                     if (!userprops) throw new Error(`Incorrect user id ${userrow?.id} data!`);
                     this.ups[userrow.id] = userprops;
                    }
               }
           }
       catch(error)
           {
            funcs.Log(`Sucking in OD id ${odid} error: ${error.stack}`);
           }
      }
 }

 HTTPNewConnection(req, res)
 {
  switch(req.method)
        {
         case 'GET':
              if (this.HTTP.staticdocs[req.url])
                 {
                  res.writeHeader(200, req.url === '/' ? {'Content-Type': 'text/html'} : {'Content-Type': 'application/javascript'});
                  res.write(fs.readFileSync(import.meta.dirname + this.HTTP.staticdocs[req.url], 'utf8'));
                 }
               else
                 {
                  res.writeHeader(400);
                 }
              res.end();  
              break;
         case 'POST':
              let msg = '';
              req.on('data', chunk => { msg += chunk.toString(); }); 
              req.on('end', () => { this.Handler(msg, res); });
              break;
        }
 }

 // Var <wsclient> is a ws connection object that is passed first at websocket init and stored in <sessions> map object
 WSNewConnection(wsclient, req)
 {
  funcs.Log(`Client web socket is opened with ip ${req.socket.remoteAddress}`, {}, consts.LOGTOSTDOUT);
  const session = { socket: wsclient, ip: req.socket.remoteAddress, ods: {}, auth: false, userid: undefined, username: undefined, idle: Date.now() };
  this.sessions.set(wsclient, session);
  wsclient.on('message', msg => { this.Handler(msg, session); });
  wsclient.on('error', error => funcs.Log(error));
  wsclient.on('close', code => funcs.Log(`${this.sessions.delete(wsclient) ? 'Client' : 'Undefined client'} web socket was closed with code ${code}!`, {}, consts.LOGTOSTDOUT));
 }

 // Todo0 - do Settimeout to remove expired auth codes
 AddClientAuthCode(string, data)
 {
  this.clientauthcodes[string] = data;
  return string;
 }

 async Authenticate(username, password)
 {
  let hash;
  const macroobject = { odid: "1", ename: `${consts.ELEMENTCOLUMNPREFIX}2`, oid: `${consts.ELEMENTCOLUMNPREFIX}1='${username}' AND lastversion = TRUE` };
  if (typeof username !== 'string' || !username) return { type: 'LOGINACK', data: "User name couldn't be empty!" };
  if (typeof password !== 'string' || !password) return { type: 'LOGINACK', data: "Password couldn't be empty!" };

  try {
       hash = await macro.GetObjectElementData(macroobject, this, {}); // First get username hash from OD 'Users'
       if (!hash || !await argon2.verify(hash, password)) return { type: 'LOGINACK', data: 'Wrong username or password!' }; // then compare it from input password
      }
  catch (error)
      {
       funcs.Log(`Argon2 exception occurs for hash '${hash}': `, error.stack);
       return { type: 'LOGINACK', data: 'Argon2 error: ' + error.message };
      }

  const userid = await macro.GetObjectElementData(Object.assign(macroobject, { ename: 'id' }), this, {}); // Change retrieving element name to 'id' and get element data (user id)
  const authcode = this.AddClientAuthCode(funcs.GenerateRandomString(12), { userid: userid, username: username });
  return { type: 'LOGINACK', data: { username: username, userid: userid, protocol: 'ws', ip: this.WS.ip, port: this.WS.port, authcode: authcode } };
 }

 // Session for 'LOGIN' event is HTTP client, for other events - WS client
 async Handler(msg, session)
 {
  funcs.Log(`Client incoming event: ${msg}`, {}, consts.LOGTOSTDOUT);
  try {
       try { msg = JSON.parse(msg); }
       catch {}
       if (!msg || typeof msg !== 'object' || !msg.type) return;
  
       if (msg.type !== 'LOGIN') session.idle = Date.now();
       if (!['LOGIN', 'CREATEWEBSOCKET'].includes(msg.type) && !session?.auth)
          {
           session.socket.send(JSON.stringify({ type: 'CREATEWEBSOCKETACK', data: UNAUTHORIZEDACCESS })); // Todo0 - process event 'Server has closed connection due to timeout' here, see const var TIMEOUTACCESS
           session.socket.terminate();
           return;
          }

       switch (msg.type)
    	      {
	           case 'SETDATABASE':
                    this.SetNewODInstance(msg.data.dialog, msg.data.odid, session);
                    break;
               case 'GETDATABASE':
                    if ((typeof msg.data.odid !== 'number' && typeof msg.data.odid !== 'string') || !this.ods[msg.data.odid]) session.socket.send(JSON.stringify({ type: 'CONFIGUREDATABASE', warning: { content: UNKNOWNDBID, title: 'Error' } }));
                     else session.socket.send(JSON.stringify({ type: 'CONFIGUREDATABASE', data: { dialog: this.ods[msg.data.odid].dialog, odid: msg.data.odid } }));
                    break;
	           case 'SIDEBARGET':
                    this.SendODOVListToClients(null, session);
                    break;
	           case 'LOGIN':
                    session.writeHeader(200, {'Content-Type': 'application/json; charset=UTF-8'});
                    msg = await this.Authenticate(msg.data.username, msg.data.password);
                    session.write(JSON.stringify(msg));
                    session.end()
                    break;
	           case 'CREATEWEBSOCKET':
                    if (this.clientauthcodes[msg.data?.authcode] && this.clientauthcodes[msg.data.authcode].userid === msg.data.userid)
                       {
                        session.auth = true;
                        session.userid = this.clientauthcodes[msg.data.authcode].userid;
                        session.username = this.clientauthcodes[msg.data.authcode].username;
                        delete this.clientauthcodes[msg.data.authcode];
	                    session.socket.send(JSON.stringify({ type: 'CREATEWEBSOCKETACK' }));
                       }
                     else
                       {
                        session.socket.send(JSON.stringify({ type: 'CREATEWEBSOCKETACK', data: UNAUTHORIZEDACCESS }));
                        session.socket.terminate();
                       }
                    break;
	           case 'GETVIEW':
                    this.SendView(msg, session);
                    break;
	           default:
                    await this.ElementHandlerExec(msg, session);
	          }
      }
  catch(error)
      {
       funcs.Log(`Controller error: ${error.stack}`);
      }
 }

 // Function removes ro/wr OD roles from <roles> array. Empty/undefined/incorrect <roles> - all applcication roles are used (to delete them all on DB reset). Roles are for four sql read/write processes:
 // 1. OV display 'read' (own OD ro user for data/metr/meta tables only)
 // 2. Handler system calls 'write' (own OD rw user for data/metr tables only)
 // 3. Element data macros 'read' (own OD ro user for data tables only, foreign OD OVs via permissions in OD conf, any OV - per user/OV restriction)
 // 4. Rules 'read/write' (own rw user per OD)
 async ManageRole(roles, drop, create)
 {
  let client;

  // First step - define roles if needed
  if (typeof roles === 'string') roles = [roles];
  if (!Array.isArray(roles)) // Delete all found roles in case of non-array, so first get all needed roles
     {
      roles = [];
      try {
           client = new Client(this.DB.defaultconfig); // Get all ro/rw users to delete
           await client.connect();
           const rousers = await client.query(...qm.Make({ method: 'SELECT', database: this.DB.adminconfig.database, table: 'pg_roles', fields: ['rolname', { name: 'rolname', value: 'rouserodid%', sign: ' LIKE ' }] }));
           const rwusers = await client.query(...qm.Make({ method: 'SELECT', database: this.DB.adminconfig.database, table: 'pg_roles', fields: ['rolname', { name: 'rolname', value: 'rwuserodid%', sign: ' LIKE ' }] }));
           if (Array.isArray(rousers?.rows)) rousers.rows.map(row => { if (row.rolname?.match(/\d+$/)?.[0]) roles.push(row.rolname); });
           if (Array.isArray(rwusers?.rows)) rwusers.rows.map(row => { if (row.rolname?.match(/\d+$/)?.[0]) roles.push(row.rolname); });
          }
      catch(error)
          {
           funcs.Log('Getting all roles error: ', error.stack);
          }
      if (client) await client.end();
     }

  // Second step - connect to application database
  try {
       client = new Client(this.DB.adminconfig);
       await client.connect();
      }
  catch(error)
      {
       funcs.Log('Connect to application database for managing roles error: ', error.stack);
       return;
      }

  // Next step - drop or create <roles> array each role name
  for (const role of roles)
      {
       const odid = role?.match(/\d+$/)?.[0]; // Role name string end digit check
       if (!odid) continue;
       const tables = `data_${odid},metr_${odid},meta_${odid}`;
       if (drop) // Drop role and its privileges
          {
           try { await client.query(...qm.Make({ method: 'DROP', database: this.DB.adminconfig.database, table: tables, role: role, privileges: role.includes('ro') ? 'SELECT' : 'SELECT, INSERT, UPDATE, DELETE' })); }
           catch(error) {} // Old version: catch(error) { funcs.Log(`Dropping role ${role} privileges error: ${error.stack}`); }

           try { await client.query(...qm.Make({ method: 'DROP', database: this.DB.adminconfig.database, table: tables, role: role })); }
           catch(error) {} // Old version: catch(error) { funcs.Log(`Dropping role ${role} error: ${error.stack}`); }
          }
       if (create) // Create role with its privileges
          { 
           try { await client.query(...qm.Make({ method: 'CREATE', database: this.DB.adminconfig.database, table: tables, role: role })); }
           catch(error) { funcs.Log(`Creating role ${role} error: ${error.stack}`); }
           try { await client.query(...qm.Make({ method: 'CREATE', database: this.DB.adminconfig.database, table: tables, role: role, privileges: role.includes('ro') ? 'SELECT' : 'SELECT, INSERT, UPDATE, DELETE' })); }
           catch(error) { funcs.Log(`Creating role ${role} privileges error: ${error.stack}`); }
          }
      }

  // Last step - end db connection
  await client.end();
 }

 async Reset()
 {
  // Getting all ro/rw users and deleting them     
  let client;
  await this.ManageRole(null, true);
  
  // Connecting to default database, dropping and then creating application database
  try {
       client = new Client(this.DB.defaultconfig);
       await client.connect();
       await client.query(...qm.Make({ method: 'DROP', database: this.DB.adminconfig.database }));
       funcs.Log(`Database ${this.DB.adminconfig.database} is dropped`, {}, consts.LOGTOSTDOUT);
       await client.query(...qm.Make({ method: 'CREATE', database: this.DB.adminconfig.database }));
       funcs.Log(`Database ${this.DB.adminconfig.database} is created successfully`, {}, consts.LOGTOSTDOUT);
      }
  catch(error)
      {
       funcs.Log(`Reset database '${this.DB.adminconfig.database}' error: ${error.stack}`);
       return;
      }
  await client.end();

  // Creating extension
  try {
       client = new Client(this.DB.adminconfig);
       await client.connect();
       await client.query(...qm.Make({ method: 'CREATETMDBEXTENSION' }));
       funcs.Log(`TimescaleDB extension is activated successfully`, {}, consts.LOGTOSTDOUT);
      }
  catch(error)
      {
       funcs.Log(`Activation TimescaleDB extension error: ${error.stack}`);
      }
  if (client) await client.end();

  // Creating new User OD with emulating user session and user profile (this.ups)
  const session = { socket: { send: function(){} }, auth: true, userid: consts.PRIMARYKEYSTARTVALUE, username: consts.SUPERUSER, ods: { '1': { ovs: { '1': { tblname: 'data_1', replacements: {} } } } } };

  this.sessions.set(session.socket, session);
  this.ups[consts.PRIMARYKEYSTARTVALUE] = { tags: [consts.SUPERUSER],
                                            eventgroups: { SYSTEM: { ADDOBJECT: { handlertype: 'Module function',
                                                                                  handlerdata: 'system.Userset\n${EVENTNAME}\n${EID}\n${EVENTDATA}\n${USERNAME}\n${"ename":"' + consts.ELEMENTCOLUMNPREFIX + '1"}',
                                                                                  output: { Wrap: false, Debug: false, Ignore: false } } } } };

  await this.SetNewODInstance(consts.USEROBJECTDATABASE, undefined, session);
  await this.Start();
  await this.Handler(JSON.stringify({ type: 'ADDOBJECT', data: { odid: '1', ovid: '1', '1': consts.SUPERUSER, '2': consts.SUPERUSER, '3': 'Super user', '4': consts.RANDOMSTRINGID, '6': consts.RANDOMSTRINGID } }), session);
  await this.ClosePool();
 }

 // Function creates new OD sql tables
 async CreateOD(odid, transaction)
 {
  // Create new databases and write its structure. First - head_ table
  await transaction.query(...qm.Make({ method: 'CREATE', table: `head_${odid}` }));
  await transaction.query(...qm.Make({ method: 'CREATE', table: `head_${odid}`, fields: [{ name: 'id', value: 'INTEGER', constraint: `PRIMARY KEY GENERATED ALWAYS AS IDENTITY` },
                                                                                         { name: 'datetime', value: 'TIMESTAMPTZ', constraint: 'DEFAULT CURRENT_TIMESTAMP(0)' },
                                                                                         { name: 'userid', value: 'INTEGER' },
                                                                                         { name: 'dialog', value: 'JSON' }] }));
  // Second - data_ table
  await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}` }));
  await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}`, fields:[{ name: 'id', value: 'INTEGER', constraint: `GENERATED BY DEFAULT AS IDENTITY (START WITH ${consts.PRIMARYKEYSTARTVALUE})` },
                                                                                        { name: 'version', value: 'INTEGER', constraint: 'DEFAULT 1' },
                                                                                        { name: 'lastversion', value: 'BOOLEAN', constraint: 'DEFAULT TRUE' },
                                                                                        { name: 'mask', value: 'TEXT' },
                                                                                        { name: 'ownerid', value: 'INTEGER' },
                                                                                        { name: 'ownername', value: `VARCHAR(${consts.USERNAMEMAXCHAR})` },
                                                                                        { name: 'datetime', value: 'TIMESTAMPTZ', constraint: 'DEFAULT CURRENT_TIMESTAMP(0)' },
                                                                                        { name: 'date', value: 'DATE', constraint: 'DEFAULT CURRENT_DATE' },
                                                                                        { name: 'time', value: 'TIME', constraint: 'DEFAULT CURRENT_TIME(0)' },
                                                                                        { name: 'PRIMARY', value: 'KEY(id, version)' }] }));
  await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}`, index: 'btree', fields:[ 'id', { name: 'lastversion', sign: '=', value: 'TRUE' } ] }));

  // Third - timescale table metr_                                                                               
  await transaction.query(...qm.Make({ method: 'CREATE', table: `metr_${odid}` }));
  await transaction.query(...qm.Make({ method: 'CREATE', table: `metr_${odid}`, fields: [{ name: 'id', value: 'INTEGER' },
                                                                                         { name: 'datetime', value: 'TIMESTAMPTZ', constraint: 'DEFAULT CURRENT_TIMESTAMP(0)' },
                                                                                         { name: 'date', value: 'DATE', constraint: 'DEFAULT CURRENT_DATE' },
                                                                                         { name: 'time', value: 'TIME', constraint: 'DEFAULT CURRENT_TIME(0)' },
                                                                                         { name: 'value', value: 'FLOAT' }] }));
  await transaction.query(...qm.Make({ method: 'CREATE', table: `metr_${odid}`, hypertable: 'datetime' })); // Create hyper table with dimension 'datetime'
  await transaction.query(...qm.Make({ method: 'SELECT', table: `metr_${odid}`, hypertable: 'id' })); // Add hyper table dimension 'id'
  // Create custom user data table <meta_N> in a addition to <data_N>/<metr_N> to insert any non application random data
  await transaction.query(...qm.Make({ method: 'CREATE', table: `meta_${odid}` }));
 }

 // Function checks <dialog> correctness and save it to DB (undefined OD id (<odid>) - new OD creation)
 async SetNewODInstance(dialog, odid, session)
 {
  if (!session?.auth) return;
  const tags = this.ups[session.userid].tags;
  if (!tags) return;
  let transaction, oldodprops, newodprops, neweid = 1, newovid = 1;

  try {
       transaction = await this.pool.connect();
       await transaction.query(...qm.Make({ method: 'BEGIN' }));
       await transaction.query(...qm.Make({ method: 'SELECT', lock: odid ? odid : 0 })); // Lock OD<odid> for change

       // Check old and new OD configurations presence
       if (odid)
          {
           if (!(oldodprops = this.ods[odid])) throw new Error(UNKNOWNDBID);
           neweid = Math.max(...Object.keys(oldodprops.elements).map(id => +id), 0) + 1;
           newovid = Math.max(...Object.keys(oldodprops.views).map(id => +id), 0) + 1;
          }
        else
          {
           odid = 1;
           const tablelist = await transaction.query(...qm.Make({ method: 'SHOWTABLES' })); // Todo0 - Dont forget to keep limited database versions, it is impossible to keep all database changes history from it creation
           for (const row of tablelist.rows) // Calculate current OD max id plus 1
               {
                const id = funcs.GetTableNameId(row.tablename);
                if (id && +id >= odid) odid = +id + 1;
               }
           await this.CreateOD(odid, transaction);
          }
       newodprops = funcs.SuckInDatabaseProps(dialog, odid, neweid, newovid);
       if (!newodprops) throw new Error(INCORRECTDBCONFDIALOG);

       // Check new OD instance for restricted pads change. Todo0 - exclude superuser
       if (oldodprops)
          {
           if (funcs.CheckUsersToMatchTheList(tags, oldodprops.od.od)) throw new Error(CONFIGURATENOTALLOWED); // Tags (array of user and its tags/groups) match OD read restrictions
           for (const pad of ['Database', 'Element', 'View', 'Rule']) 
                if (funcs.CheckUsersToMatchTheList(tags, oldodprops.od[pad]) && !funcs.ObjectCompare(oldodprops.od[pad], newodprops.od[pad])) throw new Error(`Database configuration section '${pad}' is not allowed to change for the user '${session.username}'!`);
          }

       // Check new OD instance for empty name case
       if (!newodprops.od.name)
          {
           if (!oldodprops) throw new Error(EMPTYDBCONFDBNAME); // New OD name shouldn't be empty
           if (Object.keys(newodprops.od.odreplacements).length || Object.keys(newodprops.elements).length || Object.keys(newodprops.views).length || newodprops.rules.length) throw new Error(INCORRECTDBCONFDBNAME); // New OD instance empty name is for removong-od case and should be with empty content only
           for (const table of ['head_', 'data_', 'metr_', 'meta_']) await transaction.query(...qm.Make({method: 'DROP', table: `${table}${odid}` })); // Drop all OD related tables
           await transaction.query(...qm.Make({ method: 'COMMIT' }));
           this.SendODOVListToClients(odid, undefined, session);
           delete this.ods[odid]; // Delete OD from app memory
           return;
          }

       // Create/change element appropriate data_N table columns
       for (const eid in newodprops.elements)
        if (!oldodprops || !(eid in oldodprops.elements)) await this.ManageColumns(odid, eid, newodprops.elements[eid].type, newodprops.elements[eid].index === 'None' ? undefined : newodprops.elements[eid].index, transaction); // Element is in new instance only, so create its column and index if needed
         else if (oldodprops?.elements[eid] && oldodprops.elements[eid].index !== newodprops.elements[eid].index) await this.ManageColumns(odid, eid, undefined, newodprops.elements[eid].index, transaction); // Element does exist in both instances, so just check index change

       // Drop element appropriate data_N table columns
       if (oldodprops) for (const eid in oldodprops.elements)
          if (!(eid in newodprops.elements)) this.ManageColumns(odid, eid, 'DROP', oldodprops.elements[id].index === 'None' ? undefined : 'None', transaction); // Element is not in new instance, so need to drop its column/index

       // Save new OD instance configuration dialog to head table
       await transaction.query(...qm.Make({ method: 'INSERT', table: `head_${odid}`, fields: [{ name: 'userid', value: session.userid }, { name: 'dialog', value: JSON.stringify(dialog), escape: true }] }));
       await transaction.query(...qm.Make({ method: 'COMMIT' }));
       this.ods[odid] = newodprops;
       this.SendODOVListToClients(odid); // Refresh OD tree with its vews and folders to all wss clients
       session.socket.send(JSON.stringify({ type: 'SIDEBARSET', warning: { content: `Object Database (id '${odid}') new instance is successfully created!`, title: 'Info' } }));
      }
  catch(error)
      {
       if (transaction) await transaction.query(...qm.Make({ method: 'ROLLBACK' }));
       funcs.Log(`Setting new OD instance error: ${error.stack}`);
       session.socket.send(JSON.stringify({ type: 'SIDEBARSET', warning: { content: error.message, title: 'Error' } }));
      }
  finally
      {
       if (transaction) transaction.release();
      }

  // Create readonly and read/write user roles for data, metr and meta tables for a new OD creation (oldodprops is undefined)
  if (oldodprops) return;
  await this.ManageRole(`rouserodid${odid}`, true, true);
  await this.ManageRole(`rwuserodid${odid}`, true, true);
}

 // Function creates/drops columns/indexes. Vars <columnaction> (DROP or column type for CREATE) and <indexaction> (None for DROP or index for CREATE) defines actions, undefined values do nothing
 async ManageColumns(odid, eid, columnaction, indexaction, transaction)
 {
  if (columnaction && columnaction !== 'DROP')
     {
      await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}`, fields: { name: `${consts.ELEMENTCOLUMNPREFIX}${eid}`, value: columnaction } })); // Create new element column
      await transaction.query(...qm.Make({ method: 'CREATE', table: `metr_${odid}`, fields: { name: `${consts.ELEMENTCOLUMNPREFIX}${eid}`, value: `VARCHAR(${consts.USERNAMEMAXCHAR})` } })); // New element for metr hypertable, so it results to next columns: id, datetime, date, time, value, eid1, eid2 - where 'id' is an object id; 'eid1..' is an object element property name (null or string) to retreive time 'value' by; 
     }

  if (indexaction)
     {
      if (indexaction === 'None') await transaction.query(...qm.Make({ method: 'DROP', table: `data_${odid}`, index: '', fields: `${consts.ELEMENTCOLUMNPREFIX}${eid}` }));
       else await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}`, index: indexaction.includes('hash') ? 'hash' : 'btree', fields: [{ name: `${consts.ELEMENTCOLUMNPREFIX}${eid}`, value: indexaction.includes('UNIQUE') ? 'UNIQUE' : '' }, ...(indexaction.includes('UNIQUE') ? [{ name: 'lastversion', sign: '=', value: 'true' }] : [])] }));
       // Old version: else await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}`, index: indexaction.includes('hash') ? 'hash' : 'btree', fields: { name: `${consts.ELEMENTCOLUMNPREFIX}${eid}`, value: indexaction.includes('UNIQUE') ? 'UNIQUE' : '' } }));
     }

  if (columnaction === 'DROP')
     {
      await transaction.query(...qm.Make({ method: 'DROP', table: `data_${odid}`, fields: `${consts.ELEMENTCOLUMNPREFIX}${eid}` })); // Drop column
      await transaction.query(...qm.Make({ method: 'DROP', table: `metr_${odid}`, fields: `${consts.ELEMENTCOLUMNPREFIX}${eid}` })); // Drop column
     }
 }
 
 // Function sends ws clients new od/ov/list. Absent <odid> - all app ods are used, absent <sessions> all app ws clients are used
 // { type: 'SIDEBARSET', data: { odid: 13, path: 'System/Users', ov: { 1: ['test/view1a', '/vie1b'], 2: ['/folder/View2c', 'test/view2d'] } } }
 SendODOVListToClients(odid, sessions, sessionremoving)
 {
  let odprops;
  if (typeof odid === 'number') odid += '';
  if (typeof odid !== 'string' && (!sessions || typeof sessions !== 'object')) return; // No views refresh both for all clients and all dbs
  
  for (const id in odid ? { [odid]: '' } : this.ods)
  if (odprops = this.ods[id])
  for (const session of sessions ? [sessions] : this.sessions.values())
  if (session.auth) // Also go through all clients for selected OD above
     {
      const msg = { type: sessionremoving ? 'SIDEBARDELETE' : 'SIDEBARSET', data: { odid: id, path: odprops.od.name, ov: {} } }; // Create message for OD 'id' with its path (e.data) and views defined below
      if (!sessionremoving) for (const ovid in odprops.views) if (odprops.views[ovid].general.name) msg.data.ov[ovid] = odprops.views[ovid].general.name.split('\n');
      if (session === sessionremoving) msg.warning = { content: `Object Database (id '${id}') is successfully removed!`, title: 'Info' };
      session.socket.send(JSON.stringify(msg));
     }
 }

 // Function result: { type: 'SETVIEW', data: { selections: [ { rows:, fields: }, { rows:, fields: }, ], layout:, query:, macros: {}, } }
 // Each client OV request performs an OV specific data stored in a user session: { socket:, ip:, ods: { [odid]: { ovs: { [ovid]: { query:, replacements: } } } }, auth:, userid:, username:, idle: }
 async SendView(msg, session)
 {
  let transaction;
  if (!session?.auth) return;

  try {
       // Client message correctness
       if (!msg?.data) throw new Error(`Undefined client data!`);
       msg.type = 'SETVIEW';

       // Check OD existence
       const odid = msg.data.odid;
       const database = this.ods[odid];
       if (!database) throw new Error(`Object Database id '${odid}' doesn't exist!`);

       // Check OV existence
       const ovid = msg.data.ovid;
       const view = database.views[ovid];
       if (!view) throw new Error(`Object View id '${ovid}' doesn't exist!`);

       // Returm macros dialog for 'Call dialog' checked option and no already defined macro values from client side back with dialog <view.dialog> to complete
       if (view.macros.call && !msg.data.macros) return (msg.data.dialog = view.dialog);

       // Todo0 - compare client side incoming macros with ones defined in OD conf to avoid client arbitrary data injection
       if (msg.data.macros)
          {
          }

       // Redefine OV layout and query for macros included cases
       let query = view.selection.query, layout = view.selection.layout;
       if (/\$\{.*\}/.test(query + layout)) // Layout or query do contain any macro? Do replacing below
          {
           const systemmacros = macro.DefineSystemMacros(session, msg.data, { type: msg.type });
           const replacements = Object.assign({}, systemmacros, database.od.odreplacements, msg.data.macros || view.replacements); // Collect all macro groups for 'GETVIEW' client event
           layout = await macro.MacrosReplace(layout, replacements); // Replace macros in <layout>
           query = await macro.MacrosReplace(query, replacements); // so do for <query>
          }
       if (!(layout = layout.trim())) throw new Error(INCORRECTLAYOUT);
       if (!(query = query.trim())) throw new Error(EMPTYQUERY);

       // Perform OV query
       transaction = await this.pool.connect();
       await transaction.query(...qm.Make({ method: 'BEGIN', role: `rouserodid${odid}` }));
       let selections = await transaction.query(...qm.Make({ query: query }, { rowMode: 'array' }));
       if (!selections) throw new Error(UNDEFINEDQUERYRES);
       if (!Array.isArray(selections)) selections = [selections];

       // Parse element ids from all fields for each selection
       for (const selection of selections)
           selection.fields = selection.fields.map(field => {
                                                             if (field.name in consts.SYSTEMELEMENTNAMES) return { name: field.name, eid: field.name, header: field.name, description: consts.SYSTEMELEMENTNAMES[field.name] };
                                                             const newfield = { name: field.name }, eid = parseInt(field.name.substring(consts.ELEMENTCOLUMNPREFIX.length)); // Parse numeric id after 'eid' string followed;
                                                             if (!consts.ELEMENTCOLUMNREGEXP.test(field.name) || !database.elements[eid]) return newfield; // Field name is eid<1|2|3..[_<prop>]> and id does exist?
                                                             [newfield.eid, newfield.header, newfield.description] = [eid, database.elements[eid].name, database.elements[eid].description];
                                                             const pos = field.name.indexOf('_');
                                                             if (pos > 0) newfield.eprop = field.name.substring(pos + 1);
                                                             return newfield; // return adjusted field ({ name:, eid:, eprop:, header:, description: }) for every field of <selection.fields> array
                                                            });

       // Exlude selections with no rows and put selection rows together with each selection fields to client message data. Plus query, layout and replacements. Todo0 - let macros prop should be named 'replacements' (instead of 'macros') at both client/server side
       msg.data.selections = selections.filter(selection => selection?.rows && selection.fields).map(selection => ({ rows: selection.rows, fields: selection.fields }));
       msg.data.layout = layout;
       msg.data.query = query;
       msg.data.macros = msg.data.macros || view.replacements;

       // Fix OV query and macro replacements (from client side input dialog <msg.data.macros> or origin dialog JSON in OV settings) for the user session
       if (!session.ods[odid]) session.ods[odid] = { ovs: {} };
       session.ods[odid].ovs[ovid] = { query: query, replacements: msg.data.macros };
                                                                                
       // Commit all changes at the end                                        
       await transaction.query(...qm.Make({ method: 'COMMIT' }));
      }
  catch(error)
      {
       if (transaction) await transaction.query(...qm.Make({ method: 'ROLLBACK' }));
       msg.data.error = `OV error:<br>${error.message}`;
       funcs.Log(`Getting OV content error: ${error.stack}`);
      }
  finally
      {
       if (transaction) transaction.release();
       session.socket.send(JSON.stringify(msg));
      }
 }

 // Function gets selection sql table name
 async GetSQLTableName(selection)
 {
  const tableid = selection.fields[0]?.tableID; // Get selection query table id
  if (!tableid) return;
  const tablename = await this.pool.query(...qm.Make({ method: 'GETQUERYTABLENAME', table: tableid }, { rowMode: 'array' })); // Query table name 
  return tablename?.rows[0]?.[0]; // and then table name string of itself
 }
  
 // Function returns true rule object or undefined
 async CheckRules(msg, replacements)
 {
  let transaction, query;
  const database = this.ods[msg.data.odid];

  try {
       for (const key in database.rules) // Go through all rule profiles
           {
            const rule = database.rules[key]; // and fix current one
            if (!(query = rule.query)) continue; // Skip empty rule query
            if (!transaction) // Create transaction for the first non empty query
               {
                transaction = await this.pool.connect();
                await transaction.query(...qm.Make({ method: 'BEGIN', role: `rwuserodid${msg.data.odid}` }));
               }
            try {
                 query = await macro.MacrosReplace(query, replacements); // and do replacements for <query>
                 query = await transaction.query(...qm.Make({ query: query }, { rowMode: 'array' })); // Execute rule query
                 if (rule.action === 'Pass') continue; // Todo0 - log message for 'Pass' action if log is set. Client message for 'Pass' action is ignored
                 if (query?.rows?.[0]?.[0]) return rule; // Return rule for true query
                }
            catch {}
           }
       if (transaction) await transaction.query(...qm.Make({ method: 'COMMIT' }));
      }
  catch (error)
      {
       if (transaction) await transaction.query(...qm.Make({ method: 'ROLLBACK' }));
      }
  finally
      {
       if (transaction) transaction.release();
      }
 }

 // Function searchs incoming event name <msg.type> among element event groups with events in
 GetEventProfile(msg)
 {
  if (!this.ods[msg.data?.odid]?.elements) return;
  if (msg.type === 'DELETEOBJECT' && !msg.data.eid)
     {
      let eventprofile;
      for (const eid in this.ods[msg.data.odid].elements)
          if ((msg.data.eid = eid) && (eventprofile = this.GetEventProfile(msg))) return eventprofile;
      return;
     }

  const eventgrouplist = this.ods[msg.data.odid].elements[msg.data.eid]?.event; // Get event group name list for specified OD and eid
  if (!eventgrouplist) return;
  for (const line of eventgrouplist.split('\n'))
      {
       let [eventgroup, eventname] = line.split('/', 2); // Split line specified in OD element profile 'event' textarea
       if (!(eventgroup = this.ups[consts.PRIMARYKEYSTARTVALUE].eventgroups[eventgroup.trim()])) continue; // Check if element event-group name does exist in SUPERUSER event group list
       let event = msg.type; // Fix event name and add modifier string '+CTRL+ALT+SHIFT' for mouse/keyboard events below if needed
       if (consts.KEYBOARDEVENTS.includes(event) || consts.MOUSEEVENTS.includes(event)) event += `${msg.data.value & 0b100 ? '+CTRL' : ''}${msg.data.value & 0b010 ? '+ALT' : ''}${msg.data.value & 0b001 ? '+SHIFT' : ''}`;
       if (eventname && eventname !== event) continue; // With event-group name specified in element OD profile event name (<eventname>) via slash '/' is specified also (so the search specified not for all events in event group, but specified only). Then check if <eventname> matches client event <event|msg.type>. If not - stop searching and go to next event group to search
       if (event = eventgroup[event]) return event.handlertype === 'Disabled' ? undefined : event; // Return matched event profile or undefined for 'disabled' one
      }
 }

 // Input args: msg.data.odid, msg.data.ovid, msg.data.oid, msg.data.eid, msg.data.eprop, session.userid, session.username, session.ods
 async ElementHandlerExec(msg, session)
 {
  let result, transaction, odid = msg.data.odid, ovid = msg.data.ovid;
  const database = this.ods[odid];
  if (!database) return;
  const view = database.views[ovid];
  if (!view) return;

  try {
       // Phase 1 - check user auth and client event name correctness. And OD id with OV id exist and interactive
       if (!session.auth || !this.ups[session.userid]) throw new Error(`Authentication required, please log in!`);
       if (!consts.CLIENTEVENTS.includes(msg.type)) throw new Error(`Unknown client event '${msg.type}'!`);
       if (!this.ods[odid]) throw new Error(`Unknown Object Database id ${odid})!`);
       if (!this.ods[odid].views[ovid]) throw new Error(`Unknown Object View id ${ovid})!`);
       // Todo0 - Should every session for every OV and every multiple queries in selection store queries? And then be checked to define whether OV is interactive (all query tables are 'data_N') or not? Old code release for that feature: const tblname = session.ods[odid]?.ovs[ovid]?.tblname; if (!tblname || tblname !== `data_${odid}`) return; 

       // Phase 2 - user permission check
       if (session.username !== consts.SUPERUSER)
          {
           if (funcs.CheckViewsToMatchTheList(odid, ovid, this.ups[session.userid].policy.read)) throw new Error(`This 'Object View' read access denied by user restrictions!`);
           if (funcs.CheckViewsToMatchTheList(odid, ovid, this.ups[session.userid].policy.write)) throw new Error(`This 'Object View' write access denied by user restrictions!`);
          }
       
       // Phase 3 - OV permission check
       if (session.username !== consts.SUPERUSER)
          {
           if (funcs.CheckUsersToMatchTheList(this.ups[session.userid].tags, this.ods[odid].views[ovid].permission.read)) throw new Error(`This 'Object View' read access denied by view restrictions!`);
           if (funcs.CheckUsersToMatchTheList(this.ups[session.userid].tags, this.ods[odid].views[ovid].permission.write)) throw new Error(`This 'Object View' write access denied by view restrictions!`);
          }
      
       // Phase 4 - Check if the element event exists and is enabled (for all client events except 'ADDOBJECT' and 'DELETEOBJECT')
       let eventprofile;
       if (msg.type !== 'ADDOBJECT' && msg.type !== 'DELETEOBJECT' && !(eventprofile = this.GetEventProfile(msg))) return;

       // Phase 5 - Check if object id, the event is on, does exist (for all client events except 'ADDOBJECT'). Check actual object existence after handler exec also
       const replacements = macro.DefineSystemMacros(session, msg.data, { type: msg.type }); // Define actual macros, first system ones
       Object.assign(replacements, database.od.odreplacements, session.ods[odid].ovs[ovid].replacements); // then other
       if (msg.type !== 'ADDOBJECT' && msg.type !== 'DELETEOBJECT')
          {
           result = await this.pool.query(...qm.Make({ method: 'EXISTS', query: await macro.MacrosReplace(view.selection.query, replacements), fields: [ { name: 'id', sign: '=', value: msg.data.oid }, { name: 'lastversion', sign: '=', value: 'true' } ] }));
           if (!result?.rows[0]?.exists) throw new Error(`Actual object (id '${msg.data.oid}') doesn't exist in the current OV!`);
          }

       // Phase 6 - Rule check. Every rule has message, query, action and log props. Check every rule query on successful result to apply rule action with message logged
       let rule = await this.CheckRules(msg, replacements);
       if (rule && rule.action === 'Reject') // The rule <rule> result is true, so perform rule action
          if (rule.warning) throw new Error(`Rule '${rule.key}' reject: ` + await macro.MacrosReplace(rule.message, replacements)); else return; // Todo0 - do macro replacement with ${RULEKEY} and ${RULEQUERY}, so prefix `Rule '${rule.key}' reject: ` is not needed

       // Phase 7 - Handler exec
       const eids = [];
       switch (msg.type)
              {
               case 'ADDOBJECT':
                    for (const eid in this.ods[odid].elements) // Go through all eids to call ADDOBJECT handler for
                        {
                         try {
                              msg.data.eid = eid; // Set msg data 'eid' for an actual macros
                              if (!(eventprofile = this.GetEventProfile(msg)) || eventprofile.output.Ignore || eventprofile.output.Debug) continue; // For ADDOBJECT event exist and not checked Ignore/Debug handler actions
                              replacements.EVENTDATA = msg.data[eid] ? msg.data[eid] : '';
                              replacements.EID = eid;
                              replacements.ELEMENT = macro.DefineComplexMacro(replacements, ['EID']);
                              result = await this.GetHandlerResult(eventprofile, replacements); // Exec appropriate event handler
                              if (result !== undefined) eids.push(Object.assign(result, { id: eid, name: consts.ELEMENTCOLUMNPREFIX + eid, escape: true })); // Old version: if (result !== undefined) eids[eid] = result;
                             }
                         catch(error)
                             {
                              funcs.Log(`Event '${msg.type}' handler execution error: ${error.stack}`);
                             }
                        }
                    result = await this.NewObjectInstance(eids, replacements, view)
                    if (result) throw new Error(`Creating new object error: ${result}`);
                    break;
               case 'DELETEOBJECT':
                    const objectstodelete = Object.keys(msg.data).filter(key => /^\d+$/.test(key) && key[0] !== '0'); // Create object ids to delete
                    if (consts.MAXOBJECTSTODELETE && objectstodelete.length > consts.MAXOBJECTSTODELETE) throw new Error(`Deleting of more than ${consts.MAXOBJECTSTODELETE} objects per operation is restricted!`);
                    replacements.OID = JSON.stringify(objectstodelete);
                    this.GetHandlerResult(this.GetEventProfile(msg), replacements); // Search event profile for DELETEOBJECT event (1st found element with that event defined is used) and exec appropriate event handler
                    result = await this.NewObjectInstance(objectstodelete, replacements, view)
                    if (result) throw new Error(`Deleting object error: ${result}`);
                    break;
               case 'ONTIMER':
                    break;
               default:
                    result = await this.GetHandlerResult(eventprofile, replacements); // Exec appropriate event handler
                    if (result === undefined) break; // Ignore undefined result

                    // SET events
                    if (consts.HANDLERSETEVENTS.includes(result.type))
                       {
                        if (['MUTERESET', 'RESET'].includes(result.type)) // Compare new element data with old element data for RESET event
                           {
                            let elementdata = await transaction.query(...qm.Make({ method: 'SELECT', table: replacements.DBDATATBLNAME, fields: [ consts.ELEMENTCOLUMNPREFIX + replacements.EID, { name: 'id', sign: '=', value: replacements.OID }, { name: 'lastversion', sign: '=', value: 'true' } ] }, { rowMode: 'array' })); // Get old element data to compare
                            if (result.value === elementdata?.rows[0]?.[0]) break; // and do nothing for no data change (RESET event create object new version for changed element data only)
                           } 
                        eids.push(Object.assign(result, { id: replacements.EID, name: consts.ELEMENTCOLUMNPREFIX + replacements.EID, escape: ['SUBSET', 'MUTESUBSET'].includes(result.type) ? 'OR' : true }));
                        const originatedeid = replacements.EID;
                        msg.type = replacements.EVENTNAME = 'ONCHANGE';
                        replacements.EVENTDATA = macro.DefineComplexMacro(replacements, ['EID', 'EPROP', 'EVENTDATA']);
                        delete replacements.EPROP;
                        for (const eid in this.ods[odid].elements) if (eid !== originatedeid) // Go through all eids (exept originated) to call handler for ONCHANGE event
                            {
                             try {
                                  replacements.EID = msg.data.eid = eid; // Set msg data 'eid' for an actual macros
                                  if (!(eventprofile = this.GetEventProfile(msg))) continue; // For ONCHANGE event exist check rule below for every element
                                  rule = await this.CheckRules(msg, replacements);
                                  if (rule && rule.action === 'Reject') continue; // The rule <rule> result is true, so perform rule action
                                  result = await this.GetHandlerResult(eventprofile, replacements); // Exec appropriate event handler
                                  if (result !== undefined) eids.push(Object.assign(result, { id: replacements.EID, name: consts.ELEMENTCOLUMNPREFIX + eid, escape: ['SUBSET', 'MUTESUBSET'].includes(result.type) ? 'OR' : true }));
                                 }
                             catch(error)
                                 {
                                  funcs.Log(`Event '${msg.type}' handler execution error: ${error.stack}`);
                                 }
                            }
                        result = await this.NewObjectInstance(eids, replacements, view)
                        if (result) throw new Error(`Changing object error: ${result}`);
                        break;
                       }
              }
      }
  catch (error)
      {
       if (transaction) await transaction.query(...qm.Make({ method: 'ROLLBACK' }));
       funcs.Log(`Handler execution error: ${error.stack}`);
       if (session) session.socket.send(JSON.stringify({ type: 'NULL', data: { odid: odid, ovid: ovid, childid: msg.data.childid }, warning: { content: error.message, title: 'Error' } }));
       return;
      }
  finally
      {
       if (transaction) transaction.release();
      }
 }

 // Function creates new object instance for object create/delete/change with <ids> as a fields ({ type:, id: eid, name: consts.ELEMENTCOLUMNPREFIX + eid, escape: true, value: }) for create/change object and as object ids for delete object
 async NewObjectInstance(ids, replacements, view)
 {
  let result, transaction;
  if (replacements.EVENTNAME !== 'ADDOBJECT' && !ids.length) return; // Object change/delete operation has no data? return;

  try {
       // Create transaction for non-ADDOBJECT event
       if (replacements.EVENTNAME !== 'ADDOBJECT') transaction = await this.pool.connect();
       if (replacements.EVENTNAME !== 'ADDOBJECT') await transaction.query(...qm.Make({ method: 'BEGIN' }));

       // Lock rows specified by event
       if (replacements.EVENTNAME === 'DELETEOBJECT') result = await transaction.query(...qm.Make({ method: 'SELECT', query: await macro.MacrosReplace(view.selection.query, replacements), lock: 'UPDATE', fields: [ 'id',              { name: 'id', sign: '=', escape: 'ANY', value: ids }, { name: 'lastversion', sign: '=', value: 'true' } ] }));
       if (replacements.EVENTNAME === 'ONCHANGE')     result = await transaction.query(...qm.Make({ method: 'SELECT', table: replacements.DBDATATBLNAME,                                    lock: 'UPDATE', fields: [ 'version', 'mask', { name: 'id', sign: '=', value: replacements.OID },   { name: 'lastversion', sign: '=', value: 'true' } ] }));
       if (replacements.EVENTNAME !== 'ADDOBJECT' && !result?.rows?.[0]) throw new Error(`Failed to lock some rows on object ${replacements.EVENTNAME === 'ONCHANGE' ? 'change' : 'delete'} operation!`); // Row lock failed

       // 
       if (replacements.EVENTNAME === 'ADDOBJECT')
          {
           for (const column of ids) if (typeof column.value !== 'string') column.value = typeof column.value === 'object' && column.value ? JSON.stringify(column.value) : String(column.value); // Modify column value for non string type
           ids.push({ name: 'mask', value: Object.keys(this.ods[replacements.ODID].elements).join(',') }, { name: 'ownerid', value: replacements.USERID }, { name: 'ownername', value: replacements.USERNAME, escape: true });
           await this.pool.query(...qm.Make({ method: 'INSERT', table: replacements.DBDATATBLNAME, fields: ids }));
          }

       //
       if (replacements.EVENTNAME === 'ONCHANGE')
          {
           let { version, mask } = result.rows[0]; // The 'mask' column is a comma-separated list of element IDs that were modified in this version of the object. For the first version of the object, this column contains all IDs separated by commas.
           const newmask = [], modifiedeids = ids, unmodifiedeids = [], modifiedeidsprevversion = mask.split(','), unmodifiedeidsprevversion = []; // Define current (new) and previous version modified/unmodified element IDS below
           for (const column of modifiedeids) newmask.push(column.id); // Generate new object version comma-separated modified ids called 'mask' (it will be joined with comma char to be stored in db)
           for (const id of Object.keys(this.ods[replacements.ODID].elements))
               {
                if (!newmask.includes(id)) unmodifiedeids.push({ name: consts.ELEMENTCOLUMNPREFIX + id, value: consts.ELEMENTCOLUMNPREFIX + id }); // Generate fields to extract from prev object version at INSERT operation for query maker
                if (!modifiedeidsprevversion.includes(id)) unmodifiedeidsprevversion.push({ name: consts.ELEMENTCOLUMNPREFIX + id, value: null }); // Generate fields to be set to NULL in prev object version at UPDATE operation for query maker
               }
           for (const column of modifiedeids) if (typeof column.value !== 'string') column.value = typeof column.value === 'object' && column.value ? JSON.stringify(column.value) : String(column.value); // Modify column value for non string type

           // Set last object version column 'lastversion' to false
           await transaction.query(...qm.Make({ method: 'UPDATE', table: `data_${odid}`, fields: [{ name: 'lastversion', value: 'false' }, { name: 'id', sign: '=', value: replacements.OID }, { name: 'lastversion', sign: '=', value: 'true' }] }));
           // Set current (new) version
           modifiedeids.push({ name: 'id', value: replacements.OID }, { name: 'version', value: version + 1 }, { name: 'lastversion', value: 'true' }, { name: 'mask', value: newmask.join(',') }, { name: 'ownerid', value: replacements.USERID }, { name: 'ownername', value: replacements.USERNAME, escape: true }); // Add service element column values to modified ones
           modifiedeids.push(...unmodifiedeids, { name: 'id', sign: '=', value: replacements.OID }, { name: 'version', sign: '=', value: version }); // Unmodified columns is copied from previous object version
           await transaction.query(...qm.Make({ method: 'INSERT', table: `data_${odid}`, fields: modifiedeids }));
           // Set last object version unmodified columns to NULL
           unmodifiedeidsprevversion.push({ name: 'id', sign: '=', value: replacements.OID }, { name: 'version', sign: '=', value: version });
           await transaction.query(...qm.Make({ method: 'UPDATE', table: `data_${odid}`, fields: unmodifiedeidsprevversion }));
          }

       //
       if (replacements.EVENTNAME === 'DELETEOBJECT') for (const {id} of result.rows) // get locked objectids
          {
           await transaction.query(...qm.Make({ method: 'UPDATE', table: `data_${odid}`, fields: [{ name: 'lastversion', value: 'false' }, { name: 'id', sign: '=', value: id }, { name: 'lastversion', sign: '=', value: 'true' }] }));
           await transaction.query(...qm.Make({ method: 'INSERT', table: `data_${odid}`, fields: [{ name: 'id', value: id }, { name: 'version', value: 0 }, { name: 'lastversion', value: 'false' }, { name: 'mask', value: '' }, { name: 'ownerid', value: replacements.USERID }, { name: 'ownername', value: replacements.USERNAME, escape: true }] }));
          }

       // Commit
       if (transaction) return await transaction.query(...qm.Make({ method: 'COMMIT' })) || true;
      }  
  catch (error)
      {
       if (transaction) await transaction.query(...qm.Make({ method: 'ROLLBACK' }));
       funcs.Log(`Handler execution error: ${error.message}`);
       return error.message;
      }
  finally
      {
       if (transaction) transaction.release();
      }
 }

 // Function executes event profile handler only and returns the result of execution
 async GetHandlerResult(eventprofile, replacements)
 {
  if (!eventprofile) return;
  let result;
  if (replacements.EVENTNAME === 'DELETEOBJECT') eventprofile.output.Ignore = true;

  switch (eventprofile.handlertype)
         {
          case 'Fixed output': // Expected types: string only
               if (eventprofile.output.Ignore) return; // Ignore action for fixed output makes no sence, so just return
               result = await macro.MacrosReplace(eventprofile.handlerdata, replacements, this); // Do replacements for handler data
               return this.CheckHandlerResult(result, replacements, eventprofile);
          case 'Command line': // Expected types: string or undefined
          case 'Shell command line':
               // Todo0 - later 
               return;
          default: // 'Module function' handler, expected types: undefined, string or not null object (other types are allowed also, but correct for 'wrap' action only)
               let callback = this.modules, cmd = await macro.MacrosReplace(eventprofile.handlerdata, replacements, this), args = []; // Parse handler data to module name and empty args list
               if (cmd.includes('\n')) // For multiple-line module name treat 2nd line and all others as an arguments (one by line)
                  {
                   args = cmd.split('\n').slice(1);
                   cmd = cmd.substring(0, cmd.indexOf('\n'));
                  }
               for (let name of cmd.split('.')) if (!(name = name.trim()) || !(callback = callback[name])) throw new Error(`Unknown module function '${cmd}'!`); // Go to module function name (shouldn't be empty)
               if (typeof callback !== 'function') throw new Error(`Unknown module function '${cmd}'!`); // Retrieved function is not a function?
               if (callback.constructor?.name !== 'AsyncFunction') throw new Error(`Expected an async, but received a synchronous module function '${cmd}'!`); // or retrieved function is not async one?
               if (eventprofile.output.Ignore && callback(...args)) return;
               result = await callback(...args); // No ignore option, so wait handler result. This function goal is to return native module function result. All JS types: number (NaN), bigint, string, boolean, object (null, {}, [], function), undefined, symbol, function
               return this.CheckHandlerResult(result, replacements, eventprofile);
         } 
 }

 // Function checks handler result
 CheckHandlerResult(result, replacements, eventprofile)
 {
  if (result === undefined && !eventprofile.output.Wrap) return; // Return undefined result as it is for 'no-wrap' option
  if (typeof result === 'object' && result) // For 'object' type result leave untouched or wrap it
     {
      if (eventprofile.output.Wrap) result = { type: 'SET', data: result }; // Todo0 - add wrap event to event profiler with all handler events plus 'None'
     }
   else // Otherwise - wrap it converting to the string or parse it to object
     {
      if (eventprofile.output.Wrap) result = { type: 'SET', data: String(result) };
       else result = JSON.parse(result);
     }
 
  if (typeof result !== 'object' || !result) throw new Error(`Event '${replacements.EVENTNAME}' handler returned unacceptable type of data '${result === null ? 'null' : typeof result}'!`); // Throw an exception for result that can't be parsed
  if (!('type' in result)) throw new Error(`Handler incorrect result: 'type' property is undefined!`);
  const allowedevents = consts.CLIENTEVENTSSETONLY.includes(replacements.EVENTNAME) ? consts.HANDLERSETEVENTS : consts.HANDLEREVENTS;
  if (!allowedevents.includes(result.type)) throw new Error(`Handler incorrect result: unknown type property '${result.type}'! Expected values: ${allowedevents.join(', ')}`);
  if (!('data' in result) && consts.HANDLEREVENTSWITHDATA.includes(result.type)) throw new Error(`Handler incorrect result: 'data' property is absent!`);
  if ('data' in result && typeof result.data !== 'string') if (typeof result.data !== 'object' || !result.data) result.data = String(result.data);
  return 'data' in result ? { type: result.type, value: result.data } : { type: result.type };
 }
}

// Todo0 - look to all php code for todo
// Todo0 - all OD, user, GUI customization and event profiler dialog settings workable
// Todo0 - Change pass or user delete - force user logout, and natively restrict root user delete
// Todo0 - Start event in OV layout is any client event whth no event data (that is no where to place). Emulataion of 'select all objects and then delete them', 'charts', 'regexp search' (emulates ctrl+shift+f at OV open) is deprecated
// Todo0 - object elements values, set in layout, shouldn't be changed/refreshed at controller SET and other events
// Todo0 - any single text line with Enter and then Backspace pressed should be stored the way it is before pressing Enter with Backspace, but it is stored original line + '\n'. Correct it!
// Todo0 - OV with 1 sec lifetime and macro dialog just warning msg - this case OV becomes an info notification, so after macro dialog close ov is closed also due to estimated timer
// Todo0 - For SHCEDULER event warning msg goes to the log

// Todo0 - any object change/add/delete generates OBJECTCHANGE msg with data prop of eventid-query-layout-odid-ovid-[oid-eid-prop] to all clients
//         client side originated OV id and OD id:      for not open OV increase hint, otherwise for existed oid/eid and query/layout match - send OBJECTGET msg to the controller to get OBJECTSET message of eventid-odid-ovid-oid-eid/prop row changed data (not forgetting of controller-side check of query/layout match and readable OV), no data in OBJECTSET - increase hint, data is in OBJECTSET - decrease hint
//         client side not-originated OV id but OD id:  for open OV and eid/oid existence - increase hint
//         Handler-call element policy on backend - user double clicked on any object element is unable generate another double click event on other (or same) object element: { sessionid-odid-oid-eid-eprop:, ovid:, timestamp:, ttl: }

// Todo0 - all table cells have their allowed real html tags, plus custom tags <stream> (to display video streams) and <tsdb> (to draw graphs from tsdb). How should tag <tsdb> be refreshed? Via scheduled OV refresh or another way?
//         Every user defined element (eid1, eid2..) has its external data - files (documents, audio, video, image..), so app data represents 3D model: 1st dimension - objects, 2nd - objects elements, 3rd - element JSON props and files
//		   Configurate element external data (files) via handler commands for cameras (timeshift, source, qulity), for tsdb (duration, unit of measure[sec, mbits, ...]), for file upload/download (for example GALLERY handler event shows all object element files for default, otherwise - foto/audio/video. Image properties (like resolution) should be displayed and left/right arrows control at the right top view block. Smooth image changing also?)
