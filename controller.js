import argon2 from 'argon2';
import http from 'http';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import * as globals from './globals.js';
import * as macro from './macro.js';
import * as qm from './querymaker.js';
import * as suckin from './suckin.js';

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
  this.sessions = new Map();
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
            const databaseprops = suckin.SuckInDatabaseProps(dialog.rows[0].dialog, odid); // and suck it to the memory
            if (!databaseprops) throw new Error(INCORRECTDBCONFDIALOG + ` in table head_${odid}`);
            this.ods[odid] = databaseprops;
            if (odid === '1')
               {
                const userrows = await this.pool.query(...qm.Make({ method: 'SELECT', table: `data_1`, fields: ['id', 'eid1', 'eid4', 'eid5', 'eid6', { name: 'lastversion', sign: '=', value: 'true' }] }));
                if (!Array.isArray(userrows?.rows)) throw new Error(INCORRECTUSERSOD);
                for (const userrow of userrows.rows)
                    {
                     const userprops = suckin.SuckInUserProps(userrow);
                     if (!userprops) throw new Error(`Incorrect user id ${userrow?.id} data!`);
                     this.ups[userrow.id] = userprops;
                    }
               }
           }
       catch(error)
           {
            console.error(error.stack);
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
  console.log(`Client web socket is opened with ip ${req.socket.remoteAddress}`);
  const session = { socket: wsclient, ip: req.socket.remoteAddress, ods: {}, auth: false, userid: undefined, username: undefined, idle: Date.now() };
  this.sessions.set(wsclient, session);
  wsclient.on('message', msg => { this.Handler(msg, session); });
  wsclient.on('error', error => console.log(error));
  wsclient.on('close', code => console.log(`${this.sessions.delete(wsclient) ? 'Client' : 'Undefined client'} web socket was closed with code ${code}!`));
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
  const macroobject = { odid: "1", eid: `2`, oid: `${globals.ELEMENTCOLUMNPREFIX}1='${username}'` };
  if (typeof username !== 'string' || !username) return { type: 'LOGINERROR', data: "User name couldn't be empty!" };
  if (typeof password !== 'string' || !password) return { type: 'LOGINERROR', data: "Password couldn't be empty!" };

  try {
       hash = await macro.GetObjectElementData(macroobject, this, {}); // First get username hash from OD 'Users'
       if (!hash || !await argon2.verify(hash, password)) return { type: 'LOGINERROR', data: 'Wrong username or password!' }; // then compare it from input password
      }
  catch (error)
      {
       console.error(`Argon2 exception occurs for hash '${hash}': `, error.stack);
       return { type: 'LOGINERROR', data: 'Argon2 error: ' + error.message };
      }

  const userid = await macro.GetObjectElementData(Object.assign(macroobject, { eid: 'id' }), this, {}); // Change retrieving element name to 'id' and get element data (user id)
  const authcode = this.AddClientAuthCode(globals.GenerateRandomString(12), { userid: userid, username: username });
  return { type: 'LOGINACK', data: { username: username, userid: userid, protocol: 'ws', ip: this.WS.ip, port: this.WS.port, authcode: authcode } };
 }

 // Session for 'LOGIN' event is HTTP client, for other events - WS client
 async Handler(msg, session)
 {
  try {
       try { msg = JSON.parse(msg); }
       catch {}
       if (!msg || typeof msg !== 'object' || !msg.type) return;
       console.log('Incoming msg:', msg);
  
       if (msg.type !== 'LOGIN') session.idle = Date.now();
       if (!['LOGIN', 'CREATEWEBSOCKET'].includes(msg.type) && !session?.auth)
          {
           session.socket.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: UNAUTHORIZEDACCESS })); // Todo0 - process event 'Server has closed connection due to timeout' here, see const var TIMEOUTACCESS
           session.socket.terminate();
           return;
          }

       switch (msg.type)
    	      {
	           case 'SETDATABASE':
                    this.SetNewODInstance(msg.data.dialog, msg.data.odid, session);
                    break;
               case 'GETDATABASE':
                    if ((typeof msg.data.odid !== 'number' && typeof msg.data.odid !== 'string') || !this.ods[msg.data.odid]) session.socket.send(JSON.stringify({ type: 'INFO', data: { content: UNKNOWNDBID, title: 'Error' } }));
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
                        session.socket.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: UNAUTHORIZEDACCESS }));
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
  const session = { socket: { send: function(){} }, auth: true, userid: globals.PRIMARYKEYSTARTVALUE, username: globals.SUPERUSER, ods: { '1': { ovs: { '1': { tblname: 'data_1', replacements: {} } } } } };
  this.sessions.set(session.socket, session);
  this.ups[globals.PRIMARYKEYSTARTVALUE] = { tags: [globals.SUPERUSER] };

  await this.SetNewODInstance(suckin.USEROBJECTDATABASE, undefined, session);
  await this.Start();
  await this.Handler(JSON.stringify({ type: 'ADDOBJECT', odid: '1', ovid: '1', data: { '1': globals.SUPERUSER, '2': globals.SUPERUSER } }), session);
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
                                                                                        { name: 'owner', value: `VARCHAR(${suckin.USERNAMEMAXCHAR})` },
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
                const id = globals.GetTableNameId(row.tablename);
                if (id && +id >= odid) odid = +id + 1;
               }
           await this.CreateOD(odid, transaction);
          }
       newodprops = suckin.SuckInDatabaseProps(dialog, odid, neweid, newovid);
       if (!newodprops) throw new Error(INCORRECTDBCONFDIALOG);

       // Check new OD instance for restricted pads change. Todo0 - exclude superuser
       if (oldodprops)
          {
           if (globals.CheckUsersToMatchTheList(tags, oldodprops.od.od)) throw new Error(CONFIGURATENOTALLOWED); // Tags (array of user and its tags/groups) match OD read restrictions
           for (const pad of ['Database', 'Element', 'View', 'Rule']) 
                if (globals.CheckUsersToMatchTheList(tags, oldodprops.od[pad]) && !globals.ObjectCompare(oldodprops.od[pad], newodprops.od[pad])) throw new Error(`Database configuration section '${pad}' is not allowed to change for the user '${session.username}'!`);
          }

       // Check new OD instance for empty name case
       if (!newodprops.od.name)
          {
           if (!oldodprops) throw new Error(EMPTYDBCONFDBNAME); // New OD name shouldn't be empty
           if (Object.keys(newpodrops.od.odreplacements).length || Object.keys(newodprops.od.elements).length || Object.keys(newodprops.od.views).length || Object.keys(newodprops.od.rules).length) throw new Error(INCORRECTDBCONFDBNAME); // New OD instance empty name is for removong-od case and should be with empty content only
           for (const table of ['head_', 'data_', 'metr_', 'meta_']) await transaction.query(...qm.Make({method: 'DROP', table: `${table}${odid}` })); // Drop all OD related tables
           await transaction.query(...qm.Make({ method: 'COMMIT' }));
           delete this.ods[odid]; // Delete OD from app memory
           this.SendODOVListToClients(odid, undefined, session);
           return;
          }

       // Create/change element appropriate data_N table columns
       for (const eid in newodprops.elements)
        if (!oldodprops || !(eid in oldodprops.elements)) await this.ManageColumns(odid, eid, newodprops.elements[eid].type, newodprops.elements[eid].index === 'None' ? undefined : newodprops.elements[eid].index, transaction); // Element is in new instance only, so create its column and index if needed
         else if (oldodprops?.elements[eid] && oldodprops.elements[eid].index !== newodprops.elements[eid].index) await this.ManageColumns(odid, eid, undefined, newodprops.elements[id].index, transaction); // Element does exist in both instances, so just check index change

       // Drop element appropriate data_N table columns
       if (oldodprops) for (const eid in oldodprops.elements)
          if (!(eid in newodprops.elements)) this.ManageColumns(odid, eid, 'DROP', oldodprops.elements[id].index === 'None' ? undefined : 'None', transaction); // Element is not in new instance, so need to drop its column/index

       // Save new OD instance configuration dialog to head table
       await transaction.query(...qm.Make({ method: 'WRITE', table: `head_${odid}`, fields: [{ name: 'userid', value: session.userid }, { name: 'dialog', value: JSON.stringify(dialog), escape: true }] }));
       await transaction.query(...qm.Make({ method: 'COMMIT' }));
       this.ods[odid] = newodprops;
       this.SendODOVListToClients(odid); // Refresh OD tree with its vews and folders to all wss clients
       session.socket.send(JSON.stringify({ type: 'WARNING', data: { content: `Object Database (id '${odid}') new instance is successfully created!`, title: 'Info' } }));
      }
  catch(error)
      {
       if (transaction) await transaction.query(...qm.Make({ method: 'ROLLBACK' }));
       console.error(error.stack);
       session.socket.send(JSON.stringify({ type: 'WARNING', data: { content: error.message, title: 'Error' } }));
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
      await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}`, fields: { name: `${globals.ELEMENTCOLUMNPREFIX}${eid}`, value: columnaction } })); // Create new element column
      await transaction.query(...qm.Make({ method: 'CREATE', table: `metr_${odid}`, fields: { name: `${globals.ELEMENTCOLUMNPREFIX}${eid}`, value: `VARCHAR(${suckin.USERNAMEMAXCHAR})` } })); // New element for metr hypertable, so it results to next columns: id, datetime, date, time, value, eid1, eid2 - where 'id' is an object id; 'eid1..' is an object element property name (null or string) to retreive time 'value' by; 
     }

  if (indexaction)
     {
      if (indexaction === 'None') await transaction.query(...qm.Make({ method: 'DROP', table: `data_${odid}`, index: '', fields: `${globals.ELEMENTCOLUMNPREFIX}${eid}` }));
       else await transaction.query(...qm.Make({ method: 'CREATE', table: `data_${odid}`, index: indexaction.includes('hash') ? 'hash' : 'btree', fields: { name: `${globals.ELEMENTCOLUMNPREFIX}${eid}`, value: indexaction.includes('UNIQUE') ? 'UNIQUE' : '' } }));
     }

  if (columnaction === 'DROP')
     {
      await transaction.query(...qm.Make({ method: 'DROP', table: `data_${odid}`, fields: `${globals.ELEMENTCOLUMNPREFIX}${eid}` })); // Drop column
      await transaction.query(...qm.Make({ method: 'DROP', table: `metr_${odid}`, fields: `${globals.ELEMENTCOLUMNPREFIX}${eid}` })); // Drop column
     }
 }
 
 // Function sends ws clients new od/ov/list. Absent <odid> - all app ods are used, absent <sessions> all app ws clients are used
 // { type: 'SIDEBARSET', odid: 13, path: 'System/Users', ov: { 1: ['test/view1a', '/vie1b'], 2: ['/folder/View2c', 'test/view2d'] } }
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
      if (!sessionremoving) for (const ovid in odprops.views) msg.data.ov[ovid] = odprops.views[ovid].general.name.split('\n'); 
      console.log('hui2', msg);
      session.socket.send(JSON.stringify(msg));
      if (session === sessionremoving) session.socket.send(JSON.stringify({ type: 'WARNING', data: { content: `Object Database (id '${id}') is successfully removed!`, title: 'Info' } }));
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
           const systemmacros = macro.DefineSystemMacros(session, msg.data);
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
                                                             if (field.name in globals.SYSTEMELEMENTNAMES) return { name: field.name, eid: field.name, header: field.name, description: globals.SYSTEMELEMENTNAMES[field.name] };
                                                             const newfield = { name: field.name }, eid = parseInt(field.name.substring(globals.ELEMENTCOLUMNPREFIX.length)); // Parse numeric id after 'eid' string followed;
                                                             if (!globals.ELEMENTCOLUMNREGEXP.test(field.name) || !database.elements[eid]) return newfield; // Field name is eid<1|2|3..[_<prop>]> and id does exist?
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
       console.error(error.stack);
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
 async CheckRules(msg, session, replacements)
 {
  let transaction, query;
  const odid = msg.odid;
  const database = this.ods[odid];
  const ovid = msg.ovid;

  try {
       for (const key in database.rules) // Go through all rule profiles
           {
            const rule = database.rules[key]; // and fix current one
            if (!(query = rule.query)) continue; // Skip empty rule query
            if (!transaction) // Create transaction for the first non empty query
               {
                transaction = await this.pool.connect();
                await transaction.query(...qm.Make({ method: 'BEGIN', role: `rwuserodid${msg.odid}` }));
               }
            try {
                 if (/\$\{.*\}/.test(query)) // Does rule query contain any macro&
                    {
                     if (!Object.keys(replacements).length) // Current macros contain none?
                        {
                         const systemmacros = macro.DefineSystemMacros(session, msg); // For empty <replacements> define system macros (just once)
                         Object.assign(replacements, systemmacros, database.od.odreplacements, session.ods[odid].ovs[ovid].replacements); // Also for empty <replacements> collect all other OV/OD macros (just once also)
                        }
                     query = await macro.MacrosReplace(query, replacements); // and do replacements for <query>
                    }
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
  const eventgrouplist = this.ods[msg.odid]?.elements[msg.eid]?.event; // Get event group name list for specified OD and eid
  if (!eventgrouplist) return;
  for (let eventgroup in eventgrouplist.split('\n'))
      {
       if (!(eventgroup = this.ups[globals.PRIMARYKEYSTARTVALUE].eventgroups[eventgroup.trim()])) continue; // Check if element event-group name does exits in SUPERUSER (id <globals.PRIMARYKEYSTARTVALUE>) event groups
       let event = msg.type; // Fix event name and add modifier string '+CTRL+ALT+SHIFT+META' for mouse/keyboard events below if needed
       if (suckin.KEYBOARDEVENTS.includes(event) || suckin.MOUSEEVENTS.includes(event)) event += `${msg.data & 0b1000 ? '+CTRL' : ''}${msg.data & 0b0100 ? '+ALT' : ''}${msg.data & 0b0010 ? '+SHIFT' : ''}${msg.data & 0b0001 ? '+META' : ''}`;
       if (!(event = eventgroup[event])) continue; // Continue for no event in a current event group
       if (event.handlertype !== 'Disabled' && (event.handlertype !== 'Fixed output' || event.action !== 'Ignore')) return event; // Return matched and enebled event profile, except fixed result handler with 'ignore' action
      }
 }

 // Input args: msg.odid, msg.ovid, msg.oid, msg.eid, msg.prop, session.userid, session.username, session.ods
 async ElementHandlerExec(msg, session)
 {
  let transaction;
  try {
       // Phase 1 - check user auth and client event name correctness. And OD id with OV id exist and interactive
       if (!session.auth || !this.ups[session.userid]) throw new Error(`Authentication required, please log in!`);
       if (!suckin.CLIENTEVENTS.includes(msg.type)) throw new Error(`Unknown client event '${msg.type}'!`);
       if (!this.ods[msg.odid]) throw new Error(`Unknown Object Database id ${msg.odid})!`);
       if (!this.ods[msg.odid].views[msg.ovid]) throw new Error(`Unknown Object View id ${msg.ovid})!`);
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
           if (globals.CheckUsersToMatchTheList(this.ups[session.userid].tags, this.ods[msg.odid].views[msg.ovid].permission.read)) throw new Error(`This 'Object View' read access denied by view restrictions!`);
           if (globals.CheckUsersToMatchTheList(this.ups[session.userid].tags, this.ods[msg.odid].views[msg.ovid].permission.write)) throw new Error(`This 'Object View' write access denied by view restrictions!`);
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
           if (/\$\{.*\}/.test(rule.message)) rule.message = await macro.MacrosReplace(rule.message, replacements);
           if (rule.action === 'Reject')
              if (rule.warning) throw new Error(`Rule '${rule.key}' reject: ` + rule.message);
                 else return;
          }
          
       switch (msg.type)
         {
          case 'ADDOBJECT': //
               if (!msg.data) msg.data = {}; // Zero msg data if not exist
               const fields = [];
               for (const eid in this.ods[msg.odid].elements)
                   {
                    if (typeof this.modules?.system?.AddUser !== 'function') continue;
                    let json = await this.modules.system.AddUser(eid, msg.data[eid] ? msg.data[eid] : '', session.username); // Parse handler output for JSON/plaintext for the data to be set in a new object
                    console.log('json', json);
                    try { json = JSON.parse(json); }
                    catch { continue; }
                    if (json.type !== 'SET') continue;
                    if (json.data && typeof json.data === 'object') json.data = JSON.stringify(json.data);
                    if (typeof json.data !== 'string') continue;
                    fields.push({ name: globals.ELEMENTCOLUMNPREFIX + eid, value: json.data, escape: true });
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
// Reset()|SETDATABASE -> SetNewODInstance() -> SuckInODProps()
 
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
// Todo0 - Should console.error/log be duplicated to app logfile?
// Todo0 - Change pass or user delete - force user logout, and natively restrict root user delete
// Todo0 - shoud OD/OV versions should be stored and where
// Todo0 - check function is async: async function Test(){} console.log(Test?.constructor?.name === 'AsyncFunction');
