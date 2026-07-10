import argon2 from 'argon2';
import http from 'http';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { QueryMaker } from './querymaker.js';
import * as globals from './globals.js';
import { table } from 'console';

const { Pool, Client }      = pg;
const UNKNOWNDBID           = 'Incorrect or nonexistent database id!';
const INCORRECTLAYOUT       = 'Incorrect layout - no any object/virtual elements defined in OD configuration layout section!';
const UNAUTHORIZEDACCESS    = 'Unauthorized access detected, please relogin!';
const TIMEOUTACCESS         = 'Server has closed connection due timeout, please relogin!';
const UNDEFINEDQUERYRES     = 'Database query returned udnefined result!';
const EMPTYQUERY            = 'OV query is empty!';
const EMPTYODLIST           = 'OD list is empty!';
const SYSTEMSTATICMACROS    = { USERNAME: 'username', USERID: 'userid', OD: 'od', OV: 'ov', ODID: 'odid', OVID: 'ovid', FIELDS: 'fields', OID: 'oid', EID: 'eid', EPROP: 'eprop', ELEMENT: null, EVENTNAME: 'type', EVENTDATA: 'data', RANDOM: null, DATE: null, TIME: null, DATETIME: null, NULL: null, DBDATATBLNAME: null, TASK: null };
const SYSTEMDYNAMICMACROS   = { LAYOUT: null };
const qm                    = new QueryMaker();

export class Controller
{
 async ClosePool()
 {
  if (!this.pool) return;
  await this.pool.end();
  console.log('DB pool is closed successfully!');
 }

 async GracefulShutdown(signal)
 {
  console.log(`\nReceived '${signal}' signal. Closing connections...`);
  try {
       await this.ClosePool();
       process.exit(0); // Closing process with no errors
      }
  catch(error)
      {
       console.error('Error closing DB pool:', error.stack);
       process.exit(1); // Closing process with some errors
      }
 }

 constructor(HTTP, WS, DB)
 {
  if (this.HTTP = HTTP) http.createServer(this.HTTPNewConnection.bind(this)).listen(HTTP.port, HTTP.ip); // Todo0 - set secure server via https instead of http
  if (this.WS = WS) new WebSocketServer({ host: WS.ip, port: WS.port }).on('connection', this.WSNewConnection.bind(this));
  if (this.DB = DB) this.pool = new Pool(DB.adminconfig);
  this.clientauthcodes = {};
  this.clients = new Map();
  this.ods = {}; // Object databases
  this.ups = {}; // User profiles
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
       console.log(`Loading module '${modulename}' from file://${fulldir}...`);
       this.modules[modulename] = await import(`file://${fulldir}`);
       console.log('done');
      }
 }

 // Function is called at controller creation (constructor)
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
       console.error(error.stack);
       return;
      }
 
  for (const table of tables)
      {
       const odid = globals.GetTableNameId(table);                                                                                      // Get table id
       if (!odid || !tables.includes(`head_${odid}`) || !tables.includes(`data_${odid}`) || !tables.includes(`metr_${odid}`))
          {
           console.log(`Undefined id '${odid}' in table name or required SQL tables (head_${odid}, data_${odid} or metr_${odid}) are missing!`);
           continue;
          }
       if (odid in this.ods) continue;                                                                                                  // OD with id <odid> already sucked in
 
       try {
            const dialog = await this.pool.query(...qm.Make({ method: 'SELECT', table: `head_${odid}`, orderdesc: 'id', limit: '1', fields: ['dialog'] })); // Get OD structure dialog last version from head_id table
            globals.CheckODConfigurationDialogSyntax(dialog?.rows?.[0]?.dialog);                                                        // check its syntax
            await this.SuckInODProps(dialog.rows[0].dialog, odid);                                                                      // and suck it to the memory
            if (odid === '1') await this.SuckInUserProps();
           }
       catch(error)
           {
            console.error(error.stack);
           }
      }
 }
 // hui here:
 // - decomposite macros: draw macros roadmap form globals.js/controller.js function 
 // - SuckInODProps get all OD props to object and move this func to global.js, remove checkODsyntax, check all SuckInODProps calls
 // - suck user props for all, but not for root "if (odid === '1') await this.SuckInUserProps();", check all SuckInUserProps calls

 // Function sucks in every user permissions and customization, plus super user event group profiles. Todo0 - make this "suck" every time the super user or ordinary user record is changed
 async SuckInUserProps()
 {
  try {
       const userrows = await this.pool.query(...qm.Make({ method: 'SELECT', table: `data_1`, fields: ['id', 'eid1', 'eid4', 'eid5', 'eid6', { name: 'lastversion', sign: '=', value: 'true' }] }));
       if (!Array.isArray(userrows?.rows)) return;
       for (const userrow of userrows.rows)
           {
            this.ups[userrow.id] = { name: userrow.eid1,
                                     tags: [userrow.eid1],
                                     policy: globals.SuckInUserPolicy(userrow.eid4), // Todo0 - no policy for super user - policy: userrow.eid1 === globals.SUPERUSER ? {} : globals.SuckInUserPolicy(userrow.eid4),
                                     customization: userrow.eid5,
                                     eventgroups: userrow.eid1 === globals.SUPERUSER ? globals.SuckInEventGroups(userrow.eid6) : {},
                                   };
            for (const group of this.ups[userrow.id].policy.groups.split('\n')) if (group.trim()) this.ups[userrow.id].tags.push(group.trim());
           }
      }
  catch (error)
      {
       if (this.ups[userrow.id]) delete this.ups[userrow.id];
       console.error(error.stack); // Todo0 - user suck-in process exception should crash the app at the start with the msg: 'User database is corrupted!' 
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

 // Var <client> is a ws connection object that is passed first at websocket init and stored in <clients> map object
 WSNewConnection(client, req)
 {
  console.log(`Socket is opened with ip ${req.socket.remoteAddress}`);
  this.clients.set(client, { socket: client, ip: req.socket.remoteAddress, ods: {} }); // { auth: true|false, userid:, username:, idle: }
  client.on('message', msg => { this.Handler(msg, client); });
  client.on('error', error => console.log(error));
  client.on('close', code => console.log(`${this.clients.delete(client) ? 'Client' : 'Undefined client'} socket was closed with code ${code}!`));
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
  const macroobject = { odid: "1", ovid:"1", ename: `${globals.ELEMENTCOLUMNPREFIX}2`, oid: `${globals.ELEMENTCOLUMNPREFIX}1='${username}'` };
  if (typeof username !== 'string' || !username) return { type: 'LOGINERROR', data: "User name couldn't be empty!" };
  if (typeof password !== 'string' || !password) return { type: 'LOGINERROR', data: "Password couldn't be empty!" };

  try {
       hash = await this.GetObjectElementData(macroobject); // First get username hash from OD 'Users'
       if (!hash || !await argon2.verify(hash, password)) return { type: 'LOGINERROR', data: 'Wrong username or password!' }; // then compare it from input password
      }
  catch (error)
      {
       console.error(`Argon2 exception occurs for hash '${hash}': `, error.stack);
       return { type: 'LOGINERROR', data: 'Argon2 error: ' + error.message };
      }

  const userid = await this.GetObjectElementData(Object.assign(macroobject, { ename: 'id' })); // Change retrieving element name to 'id' and get element data (user id)
  const authcode = this.AddClientAuthCode(globals.GenerateRandomString(12), { userid: userid, username: username });
  return { type: 'LOGINACK', data: { username: username, userid: userid, protocol: 'ws', ip: this.WS.ip, port: this.WS.port, authcode: authcode } };
 }

 async Handler(msg, client)
 {
  try {
       if (!client) { console.log(`Unknown web socket client with next event: ${msg}`); return; }  
       msg = JSON.parse(msg);
       if (!msg || typeof msg !== 'object' || !msg.type) return;
  
       const session = msg.type === 'LOGIN' ? null : this.clients.get(client); // Client for 'LOGIN' event is HTTP client, for other events - WS client
       if (!['LOGIN', 'CREATEWEBSOCKET'].includes(msg.type) && !session?.auth)
          {
           client.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: UNAUTHORIZEDACCESS })); // Todo0 - process event 'Server has closed connection due to timeout' here, see const var TIMEOUTACCESS
           client.terminate();
           return;
          }
       if (session) session.idle = Date.now();

       console.log('Incoming msg:', msg);
       switch (msg.type)
    	      {
	           case 'SETDATABASE':
                    this.SetNewODInstance(msg.data.dialog, msg.data.odid, client);
                    break;
               case 'GETDATABASE':
                    if ((typeof msg.data.odid !== 'number' && typeof msg.data.odid !== 'string') || !this.ods[msg.data.odid]) client.send(JSON.stringify({ type: 'INFO', data: { content: UNKNOWNDBID, title: 'Error' } }));
                     else client.send(JSON.stringify({ type: 'CONFIGUREDATABASE', data: { dialog: this.ods[msg.data.odid].dialog, odid: msg.data.odid } }));
                    break;
	           case 'SIDEBARGET':
                    this.SendViewsToClients(null, client);
                    break;
	           case 'LOGIN':
                    client.writeHeader(200, {'Content-Type': 'application/json; charset=UTF-8'});
                    msg = await this.Authenticate(msg.data.username, msg.data.password);
                    client.write(JSON.stringify(msg));
                    client.end()
                    break;
	           case 'CREATEWEBSOCKET':
                    if (this.clientauthcodes[msg.data?.authcode] && this.clientauthcodes[msg.data.authcode].userid === msg.data.userid)
                       {
                        session.auth = true;
                        session.userid = this.clientauthcodes[msg.data.authcode].userid;
                        session.username = this.clientauthcodes[msg.data.authcode].username;
                        delete this.clientauthcodes[msg.data.authcode];
	                    client.send(JSON.stringify({ type: 'CREATEWEBSOCKETACK' }));
                       }
                     else
                       {
                        client.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: UNAUTHORIZEDACCESS }));
                        client.terminate();
                       }
                    break;
	           case 'GETVIEW':
                    this.SendView(client, msg);
                    break;
	           default:
                    await this.ElementHandlerExec(client, msg, session);
	          }
      }
  catch(error)
      {
       console.error(error.stack);
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
           console.log('DB user list:', roles);
          }
      catch(error)
          {
           console.error('Getting all roles error: ', error.stack);
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
       console.error('Connect to application database for managing roles error: ', error.stack);
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
           catch(error) { console.log(`Dropping role ${role} privileges error: `, error.stack); }

           try { await client.query(...qm.Make({ method: 'DROP', database: this.DB.adminconfig.database, table: tables, role: role })); }
           catch(error) { console.log(`Dropping role ${role} error: `, error.stack); }
          }
       if (create) // Create role with its privileges
          { 
           try { await client.query(...qm.Make({ method: 'CREATE', database: this.DB.adminconfig.database, table: tables, role: role })); }
           catch(error) { console.log(`Creating role ${role} error: `, error.stack); }
           try { await client.query(...qm.Make({ method: 'CREATE', database: this.DB.adminconfig.database, table: tables, role: role, privileges: role.includes('ro') ? 'SELECT' : 'SELECT, INSERT, UPDATE, DELETE' })); }
           catch(error) { console.log(`Creating role ${role} privileges error: `, error.stack); }
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
       console.log(`Database ${this.DB.adminconfig.database} is dropped`);
       await client.query(...qm.Make({ method: 'CREATE', database: this.DB.adminconfig.database }));
       console.log(`Database ${this.DB.adminconfig.database} is created successfully`);
      }
  catch(error)
      {
       console.error(`Reset database '${this.DB.adminconfig.database}' error: `, error.stack);
       return;
      }
  await client.end();

  // Creating extension
  try {
       client = new Client(this.DB.adminconfig);
       await client.connect();
       await client.query(...qm.Make({ method: 'CREATETMDBEXTENSION' }));
       console.log(`TimescaleDB extension is activated successfully`);
      }
  catch(error)
      {
       console.log('Activation TimescaleDB extension error: ', error.stack);
      }
  if (client) await client.end();

  // Creating new User OD with emulating user session and user profile (this.ups)
  this.clients.set(client = { send: function(){} }, { auth: true, userid: globals.PRIMARYKEYSTARTVALUE, username: globals.SUPERUSER, socket: client, ods: { '1': { ovs: { '1': { tblname: 'data_1' } } } } });
  this.ups[globals.PRIMARYKEYSTARTVALUE] = true;

  await this.SetNewODInstance(globals.USEROBJECTDATABASE, undefined, client);
  await this.Start();
  await this.Handler(JSON.stringify({ type: 'ADDOBJECT', odid: '1', ovid: '1', data: { [globals.ELEMENTCOLUMNPREFIX + '1']: globals.SUPERUSER, [globals.ELEMENTCOLUMNPREFIX + '2']: globals.SUPERUSER } }), client);
  await this.ClosePool();
 }

 // Function creates new OD sql tables
 async CreateOD(odid, transaction)
 {
  // Create new databases and write its structure. First - head_ table
  await transaction.query(...qm.Make({ method: 'CREATE', table: `head_${odid}` }));
  await transaction.query(...qm.Make({ method: 'CREATE', table: `head_${odid}`, fields: [{ name: 'id', value: 'INTEGER', constraint: `PRIMARY KEY GENERATED ALWAYS AS IDENTITY` },
                                                                                         { name: 'datetime', value: 'TIMESTAMPTZ', constraint: 'DEFAULT CURRENT_TIMESTAMP' },
                                                                                         { name: 'userid', value: 'INTEGER' },
                                                                                         { name: 'dialog', value: 'JSON' }] }));
  // Second - data_ table
  await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}` }));
  await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}`, fields:[{ name: 'id', value: 'INTEGER', constraint: `GENERATED BY DEFAULT AS IDENTITY (START WITH ${globals.PRIMARYKEYSTARTVALUE})` },
                                                                                        { name: 'version', value: 'INTEGER', constraint: 'DEFAULT 1' },
                                                                                        { name: 'lastversion', value: 'BOOLEAN', constraint: 'DEFAULT TRUE' },
                                                                                        { name: 'mask', value: 'TEXT' },
                                                                                        { name: 'ownerid', value: 'INTEGER' },
                                                                                        { name: 'owner', value: `VARCHAR(${globals.USERNAMEMAXCHAR})` },
                                                                                        { name: 'datetime', value: 'TIMESTAMP', constraint: 'DEFAULT CURRENT_TIMESTAMP' },
                                                                                        { name: 'date', value: 'DATE', constraint: 'DEFAULT CURRENT_DATE' },
                                                                                        { name: 'time', value: 'TIME', constraint: 'DEFAULT CURRENT_TIME' },
                                                                                        { name: 'PRIMARY', value: 'KEY(id, version)' }] }));
  // Third - timescale table metr_                                                                               
  await transaction.query(...qm.Make({ method: 'CREATE', table: `metr_${odid}` }));
  await transaction.query(...qm.Make({ method: 'CREATE', table: `metr_${odid}`, fields: [{ name: 'id', value: 'INTEGER' },
                                                                                         { name: 'datetime', value: 'TIMESTAMPTZ', constraint: 'DEFAULT CURRENT_TIMESTAMP' },
                                                                                         { name: 'date', value: 'DATE', constraint: 'DEFAULT CURRENT_DATE' },
                                                                                         { name: 'time', value: 'TIME', constraint: 'DEFAULT CURRENT_TIME' },
                                                                                         { name: 'value', value: 'FLOAT' }] }));
  await transaction.query(...qm.Make({ method: 'CREATE', table: `metr_${odid}`, hypertable: 'datetime' })); // Create hyper table with dimension 'datetime'
  await transaction.query(...qm.Make({ method: 'WRITE', table: `metr_${odid}`, hypertable: 'id' })); // Add hyper table dimension 'id'
  // Create custom user data table <meta_N> in a addition to <data_N>/<metr_N> to insert any non application random data
  await transaction.query(...qm.Make({ method: 'CREATE', table: `meta_${odid}` }));
 }

 // Function adjust some parameteres of OD dialog structure to add/update. Todo1 - adjust all views layout text areas commenting error jsons as a error ones
 async AdjustOD(dialogold, dialognew, odid)
 {
  const elementids = {};
  let maxid;

  dialognew.ok.data = 'SAVE'; // Create btn is 'SAVE' btn after db conf dialog created
  delete dialognew.ok.expr; // No grey btn 'CREATE' for empty db name that is used to remove OD
  // Old OD does exist, so remove appropriate table columns if needed
  if (dialogold)
     {
      const remainingeids = {}; // Remaining element id list
      globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/Element/elements', true), false, 'New element template', (data, option, name) => { const id = globals.GetOptionNameId(name); if (id) remainingeids[id] = ''; });
      globals.ProcessDialogProfiles(globals.GetDialogElement(dialogold, 'padbar/Element/elements', true), false, 'New element template', (data, option, name) =>
      {
       const id = globals.GetOptionNameId(name);
       id in remainingeids ? remainingeids[id] = globals.GetDialogElement(data[option], 'index', true) : elementids[id] = { method: 'DROP' };
      });
      globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/Element/elements', true), false, 'New element template', (data, option, name) =>
      {
       const id = globals.GetOptionNameId(name);
       if (!(id in remainingeids)) return;
       const newindex = globals.GetDialogElement(data[option], 'index', true);
       if (newindex !== remainingeids[id]) elementids[id] = { method: newindex === 'None' ? 'DROP' : 'CREATE', index: newindex }; // New column index has changed?
      });
     }

  // Correct OD dialog title
  const odname = globals.GetDialogElement(dialognew, 'padbar/Database/settings/General/dbname', true); // Get OD name
  globals.GetDialogElement(dialognew, 'title').data = `Database '${globals.CutString(odname.split('/').pop())}' configuration (id${odid})`; // Change OD dialog title 

  // Correct OD dialog 'Element' profile names (id, clone flag remove, +- flags add, column type readonly set)
  maxid = 0;
  globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/Element/elements', true), false, 'New element template', (data, option, name) => { const id = +globals.GetOptionNameId(name); if (id && id > maxid) maxid = id; });
  globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/Element/elements', true), true, null, (data, option, name, flag, style) => { elementids[++maxid] = { method: 'CREATE', type: data[option].type.data, index: globals.GetDialogElement(data[option], 'index', true) };
                                                                                                                                                         globals.AdjustDialogProfileFlags(data, option, name, flag, style, maxid, 'type'); });

  // Correct OD dialog 'Element' profile names (id, clone flag remove, +- flags add)
  maxid = 0;
  globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/View/views', true), false, 'New view template', (data, option, name) => { const id = +globals.GetOptionNameId(name); if (id && id > maxid) maxid = id; });
  globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/View/views', true), true, null, (data, option, name, flag, style) => globals.AdjustDialogProfileFlags(data, option, name, flag, style, ++maxid));

  // Correct OD dialog 'Rule' profile names (clone flag remove, +- flags add)
  globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/Rule/rules', true), true, null, (data, option, name, flag, style) => globals.AdjustDialogProfileFlags(data, option, name, flag, style));

  // Correct OD dialog 'Macros' profile names (clone flag remove, +- flags add)
  globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/Database/settings/Macros/macros', true), null, 'New macro', (data, option, name, flag, style) => globals.AdjustDialogProfileFlags(data, option, name, flag, style));

  return elementids; // elementids = { [id]: { method: 'CREATE|DROP', type: <columntype>, index: <columnindex> } }
 }

 // Function checks <dialog> 'correctness' and save it to DB (undefined OD id (<odid>) - new OD creation)
 async SetNewODInstance(dialognew, odid, client)
 {
  let dialogold, restrictedpads = [], transaction;
  client = this.clients.get(client);
  if (!client?.auth) return;
  const users = [client.username]; // Todo0 - create a function that returns a ws client username and its group names in a single array and add group list to current user

  try {
       transaction = await this.pool.connect(); // Old version: transaction = new Client(this.DB.adminconfig); await transaction.connect();
       await transaction.query(...qm.Make({ method: 'BEGIN' }));
       await transaction.query(...qm.Make({ method: 'SELECT', lock: odid ? odid : 0 })); // Lock OD<odid> for change
       globals.CheckODConfigurationDialogSyntax(dialognew, odid); // Check new dialog syntax for true (OD does exist, so update operation is perfomed) or false (OD does not exist, so new OD creation is perfomed) odid
       // Check existing OD presence in <ods> array
       if (odid)
          {
           dialogold = this.ods[odid].dialog;
           if (!dialogold) throw new Error(UNKNOWNDBID);
           restrictedpads = globals.AcceptODConfigurationDialogChanges(dialogold, dialognew, users); // OD previous instance does exist, so get its non-changed pad names due to user restriction
           if (!globals.CheckODConfigurationDialogSyntax(dialognew, odid)) // Check changed above (due to restricted pads) new dialog syntax once again and remove OD for empty result (OD name is returned, so if it is empty - the OD should be removed)
              {
               for (const table of ['head_', 'data_', 'metr_', 'meta_']) await transaction.query(...qm.Make({method: 'DROP', table: `${table}${odid}` })); // Drop all OD related tables
               await transaction.query(...qm.Make({ method: 'COMMIT' }));
               for (const [, value] of this.clients)
                   {
                    if (!value.auth) continue;
                    value.socket.send(JSON.stringify({ type: 'SIDEBARDELETE', data: { odid: odid } })); // and send OD remove msg to all wss clients
                    if (value === client) client.socket.send(JSON.stringify({ type: 'WARNING', data: { content: `Object Database (id '${odid}') is successfully removed!`, title: 'Info' } })); // and send OD remove msg to all wss clients
                   }
               delete this.ods?.[odid]; // Delete OD from app memory
               return;
              }
          }
       if (!odid)
          {
           odid = 1;
           const tablelist = await transaction.query(...qm.Make({ method: 'SHOWTABLES' })); // Todo0 - Dont forget to keep limited database versions, it is impossible to keep all database changes history from it creation
           for (const row of tablelist.rows) // Calculate current OD max id plus 1
               {
                const id = globals.GetTableNameId(row.tablename);
                if (id && +id >= odid) odid = +id + 1;
               }
           await this.CreateOD(odid, transaction);
          }
       const elementids = await this.AdjustOD(dialogold, dialognew, odid);
       await transaction.query(...qm.Make({ method: 'WRITE', table: `head_${odid}`, fields: [{ name: 'userid', value: client.userid }, { name: 'dialog', value: JSON.stringify(dialognew), escape: true }] }));
       for (const id in elementids) switch (elementids[id].method)
           {
            case 'CREATE':
                 if (elementids[id].type)
                    {
                     await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}`, fields: { name: `${globals.ELEMENTCOLUMNPREFIX}${id}`, value: elementids[id].type } })); // Create new element column
                     await transaction.query(...qm.Make({ method: 'CREATE', table: `metr_${odid}`, fields: { name: `${globals.ELEMENTCOLUMNPREFIX}${id}`, value: `VARCHAR(${globals.USERNAMEMAXCHAR})` } })); // New element for metr hypertable, so it results to next columns: id, datetime, date, time, value, eid1, eid2 - where 'id' is an object id; 'eid1..' is an object element property name (null or string) to retreive time 'value' by; 
                    }
                 if (elementids[id].index && elementids[id].index !== 'None')
                    {
                     await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}`, index: elementids[id].index.includes('hash') ? 'hash' : 'btree', fields: { name: `${globals.ELEMENTCOLUMNPREFIX}${id}`, value: elementids[id].index.includes('UNIQUE') ? 'UNIQUE' : '' } })); // Create column index
                    }
                 break;
            case 'DROP':
                 if (elementids[id].index)
                    {
                     await transaction.query(...qm.Make({ method: 'DROP', table: `data_${odid}`, index: '', fields: `${globals.ELEMENTCOLUMNPREFIX}${id}` })); // Drop index
                    }
                  else
                    {
                     await transaction.query(...qm.Make({ method: 'DROP', table: `data_${odid}`, fields: `${globals.ELEMENTCOLUMNPREFIX}${id}` })); // Drop column
                     await transaction.query(...qm.Make({ method: 'DROP', table: `metr_${odid}`, fields: `${globals.ELEMENTCOLUMNPREFIX}${id}` })); // Drop column
                    }
                 break;
           }
       await transaction.query(...qm.Make({ method: 'COMMIT' }));
      }
  catch(error)
      {
       if (transaction) await transaction.query(...qm.Make({ method: 'ROLLBACK' }));
       console.error(error.stack);
       client.socket.send(JSON.stringify({ type: 'WARNING', data: { content: error.message, title: 'Error' } }));
       return;
      }
  finally
      {
       if (transaction) transaction.release();
      }

  await this.SuckInODProps(dialognew, odid); // The transaction is completed successfully, so suck in to the memory new OD settings and send new OD/OV names to client for sidebar refresh, first - OD settings
  this.SendViewsToClients(odid); // Refresh OD tree with its vews and folders to all wss clients
  if (!dialogold) // Create readonly and read/write user roles for data, metr and meta tables in case of new OD creation (old Od instance <dialogold> doesn't exist)
     {
      await this.ManageRole(`rouserodid${odid}`, true, true);
      await this.ManageRole(`rwuserodid${odid}`, true, true);
     }
  const msg = restrictedpads.length ? { type: 'WARNING', data: { content: `Configuration section${restrictedpads.length > 1 ? 's' : ''} '${restrictedpads.join(', ')}' ${restrictedpads.length > 1 ? 'are' : 'is'} not modified due to user restrictions!` } } : { type: 'WARNING', data: { content: `Object Database (id '${odid}') new instance is successfully created!`, title: 'Info' } };
  client.socket.send(JSON.stringify(msg));
 }

 // Function parses OD dialog structure and store main OD params in memeory for a quick access. Todo0 - wrap this function body to try/catch to throw errors at wrong syntax, so function <globals.CheckODConfigurationDialogSyntax> will no longer be needed
 async SuckInODProps(dialog, odid)
 {
  let id;
  this.ods[odid] = {
                    dialog: dialog,
                    name: globals.GetDialogElement(dialog, 'padbar/Database/settings/General/dbname', true),
                    replacements: {},
                    elementprofiles: { /*eid1: { type:, name:, description:, event:,*/},
                    viewprofiles: { /*layout:, query:, replacements:, dialog:, read:, write:,*/ },
                    ruleprofiles: { /*[profilename]:,*/ },
                   };

  // Get OD macros
  const macros = globals.GetDialogElement(dialog, 'padbar/Database/settings/Macros/macros', true) || {};      
  for (const macro in macros)
      if (!globals.CompareOptionInSelectElement('New macro', macro)) this.ods[odid].replacements[macro.split('~', 1)] = macros[macro].value.data;

  // Go through all 'Element' elements to get its type, name and description
  const elements = globals.GetDialogElement(dialog, 'padbar/Element/elements', true) || {};
  for (const option in elements) if (id = globals.GetOptionNameId(option))
      this.ods[odid].elementprofiles[globals.ELEMENTCOLUMNPREFIX + id] = { type: elements[option].type.data.trim().toLowerCase(), name: elements[option].name.data, description: elements[option].description.data, event: elements[option].event.data };

  // Go through all 'Rule' rules
  const rulereplacements = {};
  this.ods[odid].rulereplacements = rulereplacements;
  const ruleprofiles = globals.GetDialogElement(dialog, 'padbar/Rule/rules', true) || {};
  const ruleprofilekeys = Object.keys(ruleprofiles);
  ruleprofilekeys.sort((a, b) => a.localeCompare(b));	// Alphabetical sorting
  for (const key of ruleprofilekeys)
      {
       if (globals.CompareOptionInSelectElement('New rule template', key)) continue;
       globals.SearchMacrosNames(rulereplacements, globals.GetDialogElement(ruleprofiles[key], 'message', true), globals.GetDialogElement(ruleprofiles[key], 'query', true));
       const rule = this.ods[odid].ruleprofiles[key] = { key: key.split(globals.FIELDSDIVIDER)[0] };
       for (const prop of ['message', 'action', 'query', 'log']) rule[prop] = globals.GetDialogElement(ruleprofiles[key], prop, prop === 'log' ? undefined : true);
       rule.message = rule.message.trim();

       rule.query = rule.query.trim().split('\n');
       for (let i = 0; i < rule.query.length; i++)
           {
            rule.query[i] = rule.query[i].trim();
            if (rule.query[i][0] === '#') rule.query.splice(i--, 1);
           }
       rule.query = rule.query.join('\n');

       [rule.log, rule.warning] = rule.log.data.split('/');
       rule.log = (rule.log.split(globals.FIELDSDIVIDER)[1] || '').includes(globals.OPTIONISCHECKED);
       rule.warning = (rule.warning.split(globals.FIELDSDIVIDER)[1] || '').includes(globals.OPTIONISCHECKED);
      }

  // Go through all 'View' views to get its layout and query
  const views = globals.GetDialogElement(dialog, 'padbar/View/views', true) || {}; // Get view profile list
  for (const option in views) if (id = globals.GetOptionNameId(option))
      {
       const view = this.ods[odid].viewprofiles[id] = {};
       view.read = globals.GetDialogElement(views[option], 'settings/Permissions/read', true).trim(); // Get read restrictions
       view.write = globals.GetDialogElement(views[option], 'settings/Permissions/write', true).trim(); // Get write restrictions
       view.layout = globals.GetDialogElement(views[option], 'settings/Selection/layout', true).trim(); // Get view layout
       view.query = globals.GetDialogElement(views[option], 'settings/Selection/query', true).trim(); // Get view query
       view.calldialog = globals.GetDialogElement(views[option], 'settings/Macros/call', true); // Call or not dialog box before OV open
       view.dialog = globals.GetDialogElement(views[option], 'settings/Macros/dialog', true).trim(); // Macros dialog text area field
       if (!view.dialog && view.calldialog) // Macro dialog field is empty and 'Call dialog' option is checked? Create dialog structure from 'View selection' and 'OD rule' fields
          {
           const replacements = Object.assign(globals.SearchMacrosNames({}, view.layout, view.query), rulereplacements); // Search for macros in view layout/query and rule message/query
           for (const macro in macros) if (!globals.CompareOptionInSelectElement('New macro', macro)) globals.SearchMacrosNames(replacements, macros[macro].value.data); // Search for nested macros in db macro values, collecting them to <replacements>
           for (const name in replacements)
               if (!(name in SYSTEMSTATICMACROS) && !this.IsSystemDynamicMacro(name) && !(name in this.ods[odid].replacements)) view.dialog += `${view.dialog ? ', ' : ''}"${name}": { "type": "text", "head": "Enter macro '<b>${name}</b>' value", "data": "" }`;
           if (view.dialog) view.dialog = `{ "${SYSTEMSTATICMACROS[Object.keys(SYSTEMSTATICMACROS)[0]]}": { "type": "title", "data": "Macros definition dialog" }, "${SYSTEMSTATICMACROS[Object.keys(SYSTEMSTATICMACROS)[1]]}": ${globals.BUTTONOK}, "${SYSTEMSTATICMACROS[Object.keys(SYSTEMSTATICMACROS)[2]]}": ${globals.BUTTONCANCEL}, ${view.dialog} }`; // and create macros dialog JSON. Todo0 - appliable flag manual set violates app conception and go through all available handler data text areas to search all macros (except JSON, system and dynamic)
          }
       try { view.dialog = JSON.parse(view.dialog); } // Parse macro dialog to object and retrieve all macro values from text interface elements below
       catch { view.dialog = view.dialog ? { a: { type: "title", data: 'Info' }, b: { type: "text", head: view.dialog }, c: JSON.parse(globals.BUTTONOK) } : {}; }
       view.replacements = globals.GetDialogMacrosValues(view.dialog);
      }
 }
 
 // { type: 'SIDEBARSET', odid: 13, path: 'System/Users', ov: { 1: ['test/view1a', '/vie1b'], 2: ['/folder/View2c', 'test/view2d'] } }
 SendViewsToClients(odid, clients)
 {
  if (typeof odid === 'number') odid += '';
  if (typeof odid !== 'string' && (!clients || typeof clients !== 'object')) return; // No views refresh both for all clients and all dbs
  clients = (clients && typeof clients === 'object') ? new Map().set(clients, this.clients.get(clients)) : this.clients; // Create one single client to send views in case of its object type, otherwise - all clients array is used (controller.clients)
 
  for (const id in this.ods) if (typeof odid !== 'string' || id === odid) // Go through all object databases for undefined odid or OD 'id' for exactly defined one
  for (const [, value] of clients) if (value.auth) // Also go through all clients for selected OD above
      {
       const msg = { type: 'SIDEBARSET', data: { odid: id, path: this.ods[id].name, ov: {} } }; // Create message for OD 'id' with its path (e.data) and views defined below
       const views = globals.GetDialogElement(this.ods[id].dialog, 'padbar/View/views', true);
       for (const option in views) // Go through all view profiles
           {
            if (globals.CompareOptionInSelectElement('New view template', option)) continue; // except view template
            const ovid = globals.GetOptionNameId(option); // Get view id from option name
            const aliases = globals.GetDialogElement(views[option], `settings/General/name`, true); // and all view aliases
            if (typeof aliases !== 'string' || typeof ovid !== 'string') throw new Error(INCORRECTDBCONFDIALOG); // Throw an error for incorrect view profile
            msg.data.ov[ovid] = []; // Create aliases array first
            for (let alias of aliases.split('\n')) // and split aliases data to one by line alias to add it to message 'ov' array
                if ((alias = alias.trim()) && !msg.data.ov[ovid].includes(alias)) msg.data.ov[ovid].push(alias);
           }
       if (value.socket) value.socket.send(JSON.stringify(msg));
      }
 }

 // +-------------------------------------------------+
 // |  row: boolean expression                        | vars <r>, <c>, <table> based expression (boolean result) to match the selection row ; empty property is a faulsy case, so no any row matched
 // |  col: id|owner|e1|e2..|count(*)|${e1_prop}||    | sql select statement operands (columns); empty col - any already defined col from previous jsons are used; 
 // |  x,y: number expression                         | vars <r>, <c>, <table> based expression (number result) to place the cell with x,y props table coordinates. Vars <r> and <c> are undefined for virtual cells
 // |  value: string [expression]                     | For virtual cells only - macro form vars <x>, <y>, <table> based expression (string result) to overwrite cell text content which is dinamycly refreshed at any table data refresh
 // |  hint: clear text                               | Cell hint text
 // |  style: clear text                              | Cell html element style attribute value
 // |  collapserow, collapsecol: clear text           | These prop any value does collapse whole table rows/columns (for cell) and undefined rows/columns (for table)
 // |  event: clear text                              | Event ('ADDOBJECT', 'DELETEOBJECT', 'CONFIRMEDIT/PASTE', and all mouse/keyboards ones) to emulate at OV open. The property is a string begining with event name and with event data (for CONFIRMEDIT/PASTE events only) then.
 // |                                                 | The event is applied to the cursor cell. Unsupport event name or non interactive cell - no emulation, but cursor is set to the position specified by <x>, <y> (with x=0, y=0 values for default) coordinates anyway, so JSON '{"event":"", "x":"q-1", "y":"2"}' sets cursor to the last row third column. As it was mentioned below - tell about no data for KEYPRESS
 // +-------------------------------------------------+
 // Todo0 - Limitations for code in all expressions in json string props should be released in a JS future specification named SHADOW REALMS
 ParseViewLayout(jsons, odid)
 {
  if (typeof jsons !== 'string') return;
  const layout = { dbdata: {}, nondbdata: {}, columns: [], fields: [] }; // <columns> array has next fromat: { original:, elementname:, elementprop:, elementprofilename:, elementprofiledescription:, elementprofiletype: }, also 5 props added at client side: event, collapsedrows[], collapsedcols[], collapseundefinedrows, collapseundefinedcols

  for (let json of jsons.split('\n'))
      {
       // First step - convert json to object, clear it from unnecessary props, trim them all except "value" and check json correctness (valid json doesn't have row/col props at all or has them both)
       try { json = JSON.parse(json); }
       catch { continue; }
       for (const prop in json)
           if (!globals.LAYOUTJSONPROPS.includes(prop) || typeof json[prop] !== 'string') delete json[prop];
            else if (prop !== 'value') json[prop] =  json[prop].trim();
       if (!('row' in json) && 'col' in json) continue;
       if (!('col' in json) && 'row' in json) continue;

       // Second step - since no "row" and "col" props defined the json describes custom data pulling it from not db selection, but from "value" property and placing to the table cell with x/y coordinates. Use correct x/y combined property as a key in a layout.undefinedrows object
       if (!('row' in json))
          {
           if (!Object.keys(json).length) continue; // No any props at all? Continue
           const xy = `${json.x || ''}~${json.y || ''}`; // Define unique x~y combined propery to store json
           layout.nondbdata[xy] = Object.assign(layout.nondbdata[xy] || {}, json); // Copy json props to layout.nondbdata[xy]
           continue;
          }

       // Next step - pasre column list in json.col splited via ',' then
       if (Object.keys(json).length < 3) continue; // Props count low than 3 means only row/col props defined which is incorrect
       const currentcolumns = json.col ? [] : layout.columns;
       for (let original of json.col.split(','))
           {
            if (!(original = original.trim())) continue; // No action for empty column
            let newcolumn;
            for (const column of layout.columns) if (column.original === original && (newcolumn = column)) break; // Go through all previously defined columns and check match for current splited column name (original). Assign newcolumn to the found column
            if (newcolumn && currentcolumns.push(newcolumn)) continue; // Previously defined column matches current, so fix it in current columns array and continue
            layout.columns.push(newcolumn = { original: original }); // Otherwise create new column object and store it in a layout
            currentcolumns.push(newcolumn); // Fix it in current columns array also
            [newcolumn.elementname, newcolumn.elementprop] = qm.GetColumnElementAndProp(original); // Function qm.GetColumnElementAndProp returns object element name (or null if original column is not an object element) with its prop (or null if object element has non-JSON type or JSON property unset)
            if (!newcolumn.elementname) continue; // New column is not an object element (id|date|time|user|eid1|eid2..)? Continue
            const elementprofile = this.ods[odid].elementprofiles[newcolumn.elementname]; // New column is an object element, so get its profile props such as 'name' for header, 'description' for hint and 'type' (json/jsonb element types causes extra args in SELECT statements, such as style/hint)
            if (!elementprofile) continue;
            [newcolumn.elementprofilename, newcolumn.elementprofiledescription, newcolumn.elementprofiletype] = [elementprofile.name, elementprofile.description, elementprofile.type]; // Unknown profile in OD properties (for system elements probably)? Store element profile name/description/type
           }

       // Last step - assign cell props to layout.dbdata[json.row] for every defined column in previous step (currentcolumns array)
       for (let column of currentcolumns) // For undefined json.col use all perviously defined columns, for defined json.col use columns set in json.col.
           {
            column = column.original; // Pull column original name to use it as a key in a layout dbdata
            if (!layout.fields.includes(column)) layout.fields.push(column); // Collect columns for 'FIELDS' macro
            if (!(json.row in layout.dbdata)) layout.dbdata[json.row] = {}; // Create json.row key empty object in a layout dbdata (if it doesn't exist)
            layout.dbdata[json.row][column] = Object.assign(layout.dbdata[json.row][column] || {}, json); // and copy all json props to it for specified column name
           }
      }
      
  return layout;
 }

 async SendView(client, msg)
 {
  if (!client?.send) return;

  msg.type = 'SETVIEW';
  if (!this.ods[msg.data?.odid]?.viewprofiles[msg.data?.ovid])
     {
      msg.data.error = UNKNOWNDBID;
      client.send(JSON.stringify(msg));
      return;
     }

  const view = this.ods[msg.data.odid].viewprofiles[msg.data.ovid];
  const session = this.clients.get(client);
  if (Object.keys(view.dialog).length && view.calldialog && !msg.data.macros) // if macro dialog (<view.dialog>) is not empty and 'call' option (<view.calldialog>) is set - send macro definition dialog to the client side. Note that in case of client side responce with macros already defined (<msg.data.dialog> is set) client-side sending dialog is not needed
     {
      msg.data.dialog = view.dialog;
      client.send(JSON.stringify(msg));
      return;
     }
  /*1 macro group*/ view.actualreplacements = msg.data.macros || view.replacements; // Fix actual replacements to one of version: from client side input dialog (<msg.data.macros>) or from origin dialog JSON in OV settings
  /*2 macro group*/ //this.ods[msg.data.odid].replacements
  /*3 macro group*/ const systemmacros = this.DefineSystemMacros(session, msg.data, { TASK: 'View' });

  const selections = [], fields = [], replacements = {};
  let transaction, ress;
  let query = view.query;
  let layout = view.layout;
  if (/\$\{.*\}/.test(query + layout) || Object.keys(this.ods[msg.data.odid].rulereplacements).length) // Layout, query or rule profiles do contain any macro? Do replacing below
     {
      Object.assign(replacements, systemmacros, this.ods[msg.data.odid].replacements, view.actualreplacements); // Collect all macro groups for 'GETVIEW' client event (except FIELDS macro)
      layout = await this.MacrosReplace(layout, replacements); // Replace macro in layout
      layout = this.ParseViewLayout(layout, msg.data.odid); // and get layout object
      Object.assign(replacements, { FIELDS: layout.fields.join(',') }); // Get FIELD macro (sql request all columns) from layout object
      query = await this.MacrosReplace(query, replacements); // and replace macros in query
     }
   else // Layout and query do not contain any macro, so just parse 'layout' json and leave 'query' untouched
     {
      layout = this.ParseViewLayout(layout, msg.data.odid);
     }

  if (!Object.keys(layout.nondbdata).length && !Object.keys(layout.dbdata).length)
     {
      msg.data.error = INCORRECTLAYOUT;
      client.send(JSON.stringify(msg));
      return;
     }

  try {
       if (!query) throw new Error(EMPTYQUERY);
       if (!session.ods[msg.data.odid]) session.ods[msg.data.odid] = { ovs: {} };
       session.ods[msg.data.odid].ovs[msg.data.ovid] = { query: query, tblname: '' };
       transaction = await this.pool.connect();
       await transaction.query(...qm.Make({ method: 'BEGIN', role: `rouserodid${msg.data.odid}` }));
       ress = await transaction.query(...qm.Make({ query: query }, { rowMode: 'array' }));
       if (!ress) throw new Error(UNDEFINEDQUERYRES);
       /**/let tblname = ress.fields[0]?.tableID;
       /**/if (tblname) tblname = await transaction.query(...qm.Make({ method: 'GETQUERYTABLENAME', table: tblname }));
       /**/if (tblname?.rows[0]?.tblname) session.ods[msg.data.odid].ovs[msg.data.ovid].tblname = tblname.rows[0].tblname;
       await transaction.query(...qm.Make({ method: 'COMMIT' }));
      }
  catch(error)
      {
       if (transaction) await transaction.query(...qm.Make({ method: 'ROLLBACK' }));
       msg.data.error = `Query: '${query}'<br>Error message: ${error.message}`;
       client.send(JSON.stringify(msg));
       console.error(error.stack);
       return;
      }
  finally
      {
       if (transaction) transaction.release();
      }

  if (!Array.isArray(ress)) ress = [ress];
  for (const res of ress)
      {
       if (!res?.rows || !res.fields) continue;
       selections.push(res.rows);
       fields.push(res.fields.map(item => { const [elementname, elementprop] = qm.GetColumnElementAndProp(item.name); return { original: item.name, elementname: elementname, elementprop: elementprop }; }));
      }
  [msg.data.layout, msg.data.selections, msg.data.fields] = [layout, selections, fields];
  client.send(JSON.stringify(msg));
 }

 // Macros names is replaced by appropriate macros values. Undefined macros names are replaced by empty strings. User defined empty macros name is correct, but is not recomended
 // Macros types:
 //     System (General): ${RANDOM} ${DATE} ${DATETIME} ${TIME} ${NULL} ${USERNAME} ${USERID} ${TASK}
 //     System (View):    ${OD} ${OV} ${ODID} ${OVID} ${FIELDS} ${LAYOUT H,N,id,1,2,3} ${DBDATATBLNAME}
 //     System (Event):   ${EVENTNAME} ${OID} ${EID} ${EPROP} ${EVENTDATA} ${ELEMENT}
 //     Element:          ${"odid": "6", "ovid": "6", "oid": "id=7 AND lastversion=true", "ename": "edi2", "eprop": "value", "limit": "1" }, all macros names in parentheses are interpreted as usual macros names, except ones in JSON format. Once the string inside is any correct JSON, it becomes 'element' type macros and defines object element to retreive the data from
 //     Dialog:           OV args in OD settings
 //     Database:         macros in general OD settings
 // Application processes with macros types order to apply:
 //     Selection 'layout'/'query' fields at OV calls:             dialog, database, system (view-general)
 //     Rule 'message'/'query' fields at client/handler events:    dialog, database, system (view-general-event)
 //     Handler data at client/controller events:                  dialog, database, system (view-general-event), element (element is last for dialog macroses can overwrite element ones for debug purpoese)
 //     User customization apply at user login:                    system(general)
 //
 // The function determines whether the macro name is dynamic or not. And returns macro name if it is
 IsSystemDynamicMacro(macroname)
 {
  for (const name in SYSTEMDYNAMICMACROS)
      if (name === macroname.substring(0, name.length)) return name;
 }

 // Incoming <args> is an array of macro objects with macro names as a keys for corresponded macro values
 DefineSystemMacros(...args)
 {
  const now = new Date();
  const systemmacros = {};

  // First add macro object wich macros should be defined just right at initialization
  args.push({ RANDOM: Math.round(Math.random() * 100), DATE: now.toLocaleDateString(), TIME: now.toLocaleTimeString(), DATETIME: now.toLocaleString(), NULL: '', DBDATATBLNAME: 'data_${ODID}' });

  // Then go through all macro objects to get all macros in SYSTEMSTATICMACROS
  for (let macroname in SYSTEMSTATICMACROS)
      {
       if (SYSTEMSTATICMACROS[macroname] !== null) macroname = SYSTEMSTATICMACROS[macroname];
       for (const macroobject of args)
           {
            if (typeof macroobject[macroname] !== 'string' && (!macroobject[macroname] || typeof macroobject[macroname] !== 'object')) continue;
            try { systemmacros[macroname] = typeof macroobject[macroname] === 'string' ? macroobject[macroname] : JSON.stringify(macroobject[macroname]); }
            catch {}
           }
      }

  // And return inited system macros adding 'ELEMENT' macro that is used to represent element id and its prop. Key feature is to define whether element prop exists or just empty
  return Object.assign(systemmacros, { ELEMENT: JSON.stringify(Object.assign('EID' in systemmacros ? { id: systemmacros.EID } : {}, 'EPROP' in systemmacros ? { prop: systemmacros.EPROP } : {})) });
 }

 // Function list (DefineMacro${DYNAMICMACRONAME}()) that defines dynamic macro values. Dynamic macro is a macro that starts with macro name of itself and then some user defined comma separated args. Dynamic macro 'LAYOUT' example: ${LAYOUT H,N}
 DefineMacroLAYOUT(macro)
 {
  let layout = '';
  const cols = [];
  const objects = {};
  const rows = { headerobject: 'r===-2', newobject: 'r===-1', userobject: '1' };
  const disps = { headerobject: '+1', newobject: '+1', userobject: '+selection.length' };
  macro = macro.substring('LAYOUT'.length).trim().split(',');

  for (let i = 0; i < macro.length; i++)
      {
       if (!(macro[i] = macro[i].trim()) && macro.splice(i--, 1)) continue; // Remove empty elements and trim them all
       if (!objects.headerobject && (macro[i] === 'H' || macro[i] === 'h')) // Header object
          {
           objects.headerobject = `0${'newobject' in objects ? disps.newobject : ''}${'userobject' in objects ? disps.userobject : ''}`;
           continue;
          }
       if (!objects.newobject && (macro[i] === 'N' || macro[i] === 'n')) // New object
          {
           objects.newobject = `0${'headerobject' in objects ? disps.headerobject : ''}${'userobject' in objects ? disps.userobject : ''}`;
           continue;
          }
       if (!objects.userobject) objects.userobject = `0${'headerobject' in objects ? disps.headerobject : ''}${'newobject' in objects ? disps.newobject : ''}`;
       cols.push(/^\d+$/.test(macro[i]) ? globals.ELEMENTCOLUMNPREFIX + macro[i] : macro[i]); // Get all defined columns to <cols> array. Todo0: add [digit]-[digit] construction and apply only existing element ids
      }

  for (const col in objects) layout += `{ "row": "${rows[col]}", "col": "${cols.join(',')}", "x": "c", "y": "${objects[col]}" }\n`;
  return layout;
 }

 async MacrosReplace(string, replacements, chain = {})
 {
  let macrovalue, newstring = '';
  chain = Object.assign({}, chain);

  while (true)
        {
         const pos1 = string.indexOf('${'); // Search start of macro
         if (pos1 === -1) return newstring + string; // No found? return previous result plus current
         const pos2 = string.indexOf('}', pos1); // Search end of macro
         if (pos2 === -1 ) return newstring + string; // No found? return previous result plus current
         const macroname = string.substring(pos1 + 2, pos2); // Retrieve macro name
         macrovalue = ''; // Set macro value default value, so loop/undefined macros cause an error and remains empty
         if (macroname in replacements) // Macro does exist, so get its value via recursive function call
            {
             if (!(macroname in chain)) macrovalue = await this.MacrosReplace(replacements[macroname], replacements, Object.assign({ [macroname]: true }, chain));
            }
          else // Macro doesn't exist, so check it for JSON format
            {
             try { if (replacements.TASK === 'Element') macrovalue = JSON.parse(`{${macroname}}`); } // JSON macros are parsed for client/controller events only
             catch {}
             if (macrovalue) macrovalue = await this.GetObjectElementData(macrovalue); // Macro name is a JSON, so try to retrieve OD/OV JSON specified object element data
              else if (this.IsSystemDynamicMacro(macroname)) macrovalue = this[`DefineMacro${this.IsSystemDynamicMacro(macroname)}`](macroname);// Macro name is not JSON, so check if it is dynamic and call appropriate function in case
            }
         newstring += string.substring(0, pos1) + macrovalue; // Collect newstring with macro value
         string = string.substring(pos2 + 1); // and redefine remaining part to pass it for next cycle
        }
 }
  
 // Function gets object element data. Object id and element id are retrieved from macro object
 async GetObjectElementData(macroobject)
 {
  let transaction, elementdata;
  try {
       transaction = await this.pool.connect();
       await transaction.query(...qm.Make({ method: 'BEGIN', role: `rouserodid${macroobject.odid}` }));
       macroobject.ename = qm.ExtractJSONPropField(macroobject.ename, macroobject.eprop);
       elementdata = await transaction.query(...qm.Make({ method: 'SELECT', fields: macroobject.ename, table: `data_${macroobject.odid}`, where: macroobject.oid, limit: macroobject.limit ? macroobject.limit : '' }, { rowMode: 'array' }));
       await transaction.query(...qm.Make({ method: 'COMMIT' }));
       if (Array.isArray(elementdata)) elementdata = elementdata[0]; // In case of multiple queries - get first one only!
       elementdata = elementdata?.rows?.[0]?.[0]; // In case of row mode, the result is returned in 2d array with rows and columns. Get 1st column of a 1st row
      }
  catch(error)
      {
       await transaction.query(...qm.Make({ method: 'ROLLBACK' }));
       console.error(error.stack);
       elementdata = ''; // or elementdata = error.message;
      }
  finally
      {
       if (transaction) transaction.release();
      }

  if (['boolean', 'number'].includes(typeof elementdata)) elementdata += ''; // Convert boolean/number types to string
  return typeof elementdata === 'string' ? elementdata : ''; // Return empty string for all non string types
 }

 // Function returns true result rule object or undefined
 async CheckRules(msg, session, replacements)
 {
  let result, transaction, query;
  try {
       for (const key in this.ods[msg.odid].ruleprofiles) // Go through all rule profiles
           {
            const rule = this.ods[msg.odid].ruleprofiles[key]; // and fix current one
            if (!(query = rule.query)) continue; // Skip empty rule query
            if (!transaction) // Create transaction for the first non empty query
               {
                transaction = await this.pool.connect();
                await transaction.query(...qm.Make({ method: 'BEGIN', role: `rwuserodid${msg.odid}` }));
               }
            try {
                 if (/\$\{.*\}/.test(query))
                    {
                     if (!Object.keys(replacements).length) replacements = Object.assign(replacements, this.ods[msg.odid].viewprofiles[msg.ovid].actualreplacements, this.ods[msg.odid].replacements, this.DefineSystemMacros(session, msg, { TASK: 'Rule' }));
                     query = await this.MacrosReplace(query, replacements); 
                    }
                 query = await transaction.query(...qm.Make({ query: query }, { rowMode: 'array' })); // Execute rule query
                 if (rule.action === 'Pass') continue; // Todo0 - log message for 'Pass' action if log is set. Client message for 'Pass' action is ignored
                 if (query?.rows?.[0]?.[0] && (result = rule)) break; // Break cycle fixing result to return
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
  return result;
 }

 // Function searchs incoming event name <msg.type> among element event groups with events in
 GetEventProfile(msg)
 {
  const eventgrouplist = this.ods[msg.odid].elementprofiles[msg.eid].event; // Get event group name list for specified OD and eid
  for (let eventgroup in eventgrouplist.split('\n'))
      {
       if (!(eventgroup = this.ups[globals.PRIMARYKEYSTARTVALUE].eventgroups[eventgroup.trim()])) continue; // Check if element event-group name does exits in SUPERUSER (id <globals.PRIMARYKEYSTARTVALUE>) event groups
       let event = msg.type; // Fix event name and add modifier string '+CTRL+ALT+SHIFT+META' for mouse/keyboard events below if needed
       if (globals.KEYBOARDEVENTS.includes(event) || globals.MOUSEEVENTS.includes(event)) event += `${msg.data & 0b1000 ? '+CTRL' : ''}${msg.data & 0b0100 ? '+ALT' : ''}${msg.data & 0b0010 ? '+SHIFT' : ''}${msg.data & 0b0001 ? '+META' : ''}`;
       if (!(event = eventgroup[event])) continue; // Continue for no event in a current event group
       if (event.handlertype !== 'Disabled' && (event.handlertype !== 'Fixed output' || event.action !== 'Ignore')) return event; // Return matched and enebled event profile, except fixed result handler with 'ignore' action
      }
 }

 // Input args: msg.odid, msg.ovid, msg.oid, msg.eid, msg.prop, session.userid, session.username, session.ods
 async ElementHandlerExec(client, msg, session)
 {
  let transaction;
  try {
       // Phase 1 - check user auth and client event name correctness. And OD id with OV id exist and interactive
       if (!session.auth || !this.ups[session.userid]) throw new Error(`Authentication required, please log in!`);
       if (!globals.CLIENTEVENTS.includes(msg.type)) throw new Error(`Unknown client event '${msg.type}'!`);
       if (!this.ods[msg.odid]) throw new Error(`Unknown Object Database id ${msg.odid})!`);
       if (!this.ods[msg.odid].viewprofiles[msg.ovid]) throw new Error(`Unknown Object View id ${msg.ovid})!`);
       const tblname = session.ods[msg.odid]?.ovs[msg.ovid]?.tblname;
       if (!tblname || tblname !== `data_${msg.odid}`) return; // Todo0 - multiple queries may generate multiple table data retreives, so these views are not interactive, fix it in help doc

       // Phase 2 - user permission check
       if (session.username !== globals.SUPERUSER)
          {
           if (globals.CheckViewsToMatchTheList(msg.odid, msg.ovid, this.ups[session.userid].policy.read)) throw new Error(`This 'Object View' read access denied by user restrictions!`);
           if (globals.CheckViewsToMatchTheList(msg.odid, msg.ovid, this.ups[session.userid].policy.write)) throw new Error(`This 'Object View' write access denied by user restrictions!`);
          }
       
       // Phase 3 - OV permission check
       if (session.username !== globals.SUPERUSER)
          {
           if (globals.CheckUsersToMatchTheList(this.ups[session.userid].tags, this.ods[msg.odid].viewprofiles[msg.ovid].read)) throw new Error(`This 'Object View' read access denied by view restrictions!`);
           if (globals.CheckUsersToMatchTheList(this.ups[session.userid].tags, this.ods[msg.odid].viewprofiles[msg.ovid].write)) throw new Error(`This 'Object View' write access denied by view restrictions!`);
          }
      
       // Phase 4 - Check if the element event exists and is enabled (for all client events except 'ADDOBJECT' and 'DELETEOBJECT')
       let eventprofile;
       if (msg.type !== 'ADDOBJECT' && msg.type !== 'DELETEOBJECT' && !(eventprofile = GetEventProfile(msg))) return;

       // Phase 5 - Check if object id, the event is on, does exist (for all client events except 'ADDOBJECT'). Check actual object existence after handler exec also
       if (msg.type !== 'ADDOBJECT')
          {
           let res = await this.pool.query(...qm.Make({ method: 'EXISTS', query: session.ods[msg.odid].ovs[msg.ovid].query, fields: [ { name: 'id', sign: '=', value: msg.oid }, { name: 'lastversion', sign: '=', value: 'true' } ] }));
           if (!res?.rows[0]?.exists) throw new Error(`Actual object (id '${msg.oid}') doesn't exist in the current OV!`);
          }

       // Phase 6 - Rule check. Every rule has message, query, action and log props. Check every rule query on successful result to apply rule action with message logged
       const replacements = {};
       let rule = await this.CheckRules(msg, session, replacements);
       if (rule) // The rule <rule> result is true, so perform rule action
          {
           if (/\$\{.*\}/.test(rule.message)) rule.message = await this.MacrosReplace(rule.message, replacements);
           if (rule.action === 'Reject')
              if (rule.warning) throw new Error(`Rule '${rule.key}' reject: ` + rule.message);
                 else return;
          }
          
       switch (msg.type)
         {
          case 'ADDOBJECT': //
               if (!msg.data) msg.data = {}; // Zero msg data if not exist
               const fields = [];
               for (const eid in this.ods[msg.odid].elementprofiles)
                   {
                    if (typeof this.modules?.system?.AddUser !== 'function') continue;
                    let json = await this.modules.system.AddUser(eid, msg.data[eid] ? msg.data[eid] : '', session.username); // Parse handler output for JSON/plaintext for the data to be set in a new object
                    try { json = JSON.parse(json); }
                    catch { continue; }
                    if (json.type !== 'SET') continue;
                    if (json.data && typeof json.data === 'object') json.data = JSON.stringify(json.data);
                    if (typeof json.data !== 'string') continue;
                    fields.push({ name: eid, value: json.data, escape: true });
                   }
               console.log({ method: 'WRITE', table: `data_${msg.odid}`, fields: fields });
               await this.pool.query(...qm.Make({ method: 'WRITE', table: `data_${msg.odid}`, fields: fields }));
               break;
          case 'KEYF2':
            if (msg.eid === 'eid7' && msg.data.modifier === '0')
               break;
         }
      }
  catch (error)
      {
       console.error(error.stack);
       session.socket.send(JSON.stringify({ type: 'WARNING', data: { content: error.message, title: 'Error', msg: msg.odid, msg: msg.ovid } }));
       return;
      }
 }
}

// Controller functions roadmap:
// Start() -> ReadAllDatabase() -> CheckODConfigurationDialogSyntax()
//                              -> SuckInODProps() [odid] -> { dialog: <dialog>, name: <dbname>, replacements: {}, elementprofiles: { 'eid1': { type:, name:, description:, event: } }, viewprofiles: { '1': { layout:, query:, replacements:, dialog:, read:, write: } }, ruleprofiles: { [profilename]: }, rulereplacements: {} }
//                              -> SuckInUserProps() -> [userid] = { name: <username>, tags: <username + group list>, policy: <user policy dialog data>, customization: <customization>, eventgroups: { [eventgroup]: { [event]: {} } },
// SetNewODInstance() -> SuckInODProps()
 
// Todo0 - Incoming client/handler events check:
//      1. User permissions check
//      2. View permissions check
//      3. Non disabled event existing check for the element
//      4. Selection/layout check, here object id existence check:
//           SELECT EXISTS (
//               SELECT 1 
//               FROM (
//                     -- Вставьте сюда ВЕСЬ ваш сложный запрос БЕЗ изменений
//                     SELECT * FROM data1 WHERE <ваши_условия>
//                    ) AS subquery WHERE id = 1 and lastversion=true);
//      5. Rule check
//      6. Event handler exec (for element to be callable (interactive): explicit 'id'/'lastversion' columns should be queried). In case of eidN->>prop extra style/hint props may be added to the selection to customize cell element
//         Every object element has a list of event profile names one by line. No any profile - element is non interactive and cannot react on user events (such as keyboard/maouse/paste/schedule and others) to call its event handlers. 
//         At any client/server side element event occur - incoming event is checked on all event groups until the match. Once the match is found - the specified event with its handler is called to process event and its data. 
//         Every event may have 'disabled' handler type to explicitly set no call-handler, may be usefull to cancel through-profiles event search with no action
//         Command line handler data are not single line, but multiple. Controller runs first line handler, may be used as a comments
//         Negative queue value (the scheduler sleep for) in msec on crontab line
// Todo0 - all DB dialog settings workable
// Todo0 - all user dialog settings workable (GUI customization and event profiler)
// Todo0 - Handler-call element policy on backend - user double clicked on any object element is unable generate another double click event on other (or same) object element
// Todo0 - System MACROS that get user online/offline status with datetime timestamp and current instances number logged in, RULEQUERY macro to use in a rule message
// Todo0 - Don't log message in case of previous msg match, but log 'last message repeated 3 times'. Log format: datetime, user, process, log message
// Todo0 - Remove cancel btn timer for a new OD creation
// Todo0 - Change pass or user delete - force user logout, and natively restrict root user delete
// Todo0 - shoud OD/OV versions should be stored and where
// Todo0 - check function is async: async function Test(){} console.log(Test?.constructor?.name === 'AsyncFunction');
