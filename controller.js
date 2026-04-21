import http from 'http';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { QueryMaker } from './querymaker.js';
import * as globals from './globals.js';

const { Pool, Client }   = pg;
const UNKNOWNDBID        = 'Incorrect or nonexistent database id!';
const INCORRECTLAYOUT    = 'Incorrect layout - no any object/virtual elements defined in OD configuration layout section!';
const UNAUTHORIZEDACCESS = 'Unauthorized access detected, please relogin!';
const TIMEOUTACCESS      = 'Server has closed connection due timeout, please relogin!';
const UNDEFINEDQUERYRES  = 'Database query returned udnefined result!'
const EMPTYODLIST        = 'OD list is empty!'
const qm                 = new QueryMaker();

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
  catch (error)
      {
       console.error('Error closing DB pool:', error);
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
  this.ods = {};
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
  catch (error)
      {
       console.log(error.message);
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
           }
       catch (error)
           {
            console.log(error.message);
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

 // Var <client> is a ws connection object that is passed first at websocket init and stored in <clients> map object
 WSNewConnection(client, req)
 {
  console.log(`Socket is opened with ip ${req.socket.remoteAddress}`);
  this.clients.set(client, { socket: client, ip: req.socket.remoteAddress }); // { auth: true|false, userid:, }
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

  // Todo0 - Compare here user/pass from corresponded pair in 'User' OD
 Authenticate(username, password)
 {
  if (!username || !password || username !== 'root' || password !== '1') return { type: 'LOGINERROR', data: 'Wrong username or password!' };
  return { type: 'LOGINACK', data: { username: username, userid: '0', protocol: 'ws', ip: this.WS.ip, port: this.WS.port, authcode: this.AddClientAuthCode(globals.GenerateRandomString(12), { userid: '0', username: username }/* Todo0 - set user id here */) } };
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

       switch (msg.type)
    	      {
	           case 'SETDATABASE':
                    this.SetNewODInstance(msg.data.dialog, msg.data.odid, client);
                    break;
               case 'GETDATABASE':
                    if ((typeof msg.data.odid !== 'number' && typeof msg.data.odid !== 'string') || !this.ods[msg.data.odid]) client.send(JSON.stringify({ type: 'DIALOG', data: { content: UNKNOWNDBID, title: 'Error' } }));
                     else client.send(JSON.stringify({ type: 'CONFIGUREDATABASE', data: { dialog: this.ods[msg.data.odid].dialog, odid: msg.data.odid } }));
                    break;
	           case 'SIDEBARGET':
                    this.SendViewsToClients(null, client);
                    break;
	           case 'LOGIN':
                    client.writeHeader(200, {'Content-Type': 'application/json; charset=UTF-8'});
                    msg = this.Authenticate(msg.data.username, msg.data.password);
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
                    // user permission check, view permission check, non disabled event existing check for the element, selection/layout check, rule check, event handler exec
                    // For element to be callable: explicit 'id'/'lastversion' mention for the object and column name ed1..N or eidN->>prop (for json/jsonb types only). In case of eidN->>prop extra style/hint props  may be added to the selection to customize cell element
                    console.log('Incoming msg:', msg);
                    await this.ElementHandlerExec(msg, session);
	          }
      }
  catch(error)
      {
       console.log(error.message);
      }
 }

 async SendView(client, msg)
 {
  if (!client?.send) return;
  const selections = [], fields = [], query = this.ods[msg.data.odid].query[msg.data.ovid], layout = this.ods[msg.data.odid].layout[msg.data.ovid];
  let transaction, ress;

  msg.type = 'SETVIEW';
  if (!this.ods[msg.data?.odid])
     {
      msg.data.error = UNKNOWNDBID;
      client.send(JSON.stringify(msg));
      return;
     }

  if (!Object.keys(layout.nondbdata).length && !Object.keys(layout.dbdata).length)
     {
      msg.data.error = INCORRECTLAYOUT;
      client.send(JSON.stringify(msg));
      return;
     }

  try {
       if (query)
          {
           transaction = await this.pool.connect();
           await transaction.query('BEGIN');
           await transaction.query(`SET LOCAL ROLE rouserodid${msg.data.odid}`);
           ress = await transaction.query(...qm.Make({ query: query }, { rowMode: 'array' }));
           if (!ress) throw new Error(UNDEFINEDQUERYRES);
           await transaction.query('COMMIT');
          }
      }
  catch (error)
      {
       msg.data.error = `Query: ${query}<br>Error message: ${error.message}`;
       client.send(JSON.stringify(msg));
       return;
      }
  finally
      {
       if (transaction) transaction.release();
      }

  if (!Array.isArray(ress)) ress = [ress];
  for (const res of ress)
      {
       selections.push(res.rows);
       fields.push(res.fields.map(item => { const [elementname, elementprop] = qm.GetColumnElementAndProp(item.name); return { original: item.name, elementname: elementname, elementprop: elementprop }; }));
      }
  [msg.data.layout, msg.data.selections, msg.data.fields] = [layout, selections, fields];
  client.send(JSON.stringify(msg));
 }

 // Function removes ro/wr OD roles from <roles> array. Empty/undefined/incorrect <roles> - all applcication roles are used (to delete them all on DB reset). Roles are for four sql read/write processes:
 // 1. OV display 'read' (own OD ro user for data/metr/meta tables only)
 // 2. Handler system calls 'write' (own OD rw user for data/metr tables only)
 // 3. Element data macroses 'read' (own OD ro user for data tables only, foreign OD OVs via permissions in OD conf, any OV - per user/OV restriction)
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
      catch (error)
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
  catch (error)
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
       if (drop) // Drop role and its priveleges
          {
           try { await client.query(...qm.Make({ method: 'DROP', database: this.DB.adminconfig.database, table: tables, role: role, priveleges: role.includes('ro') ? 'SELECT' : 'SELECT, INSERT, UPDATE, DELETE' })); }
           catch (error) { console.log(`Dropping role ${role} priveleges error: `, error.message); }

           try { await client.query(...qm.Make({ method: 'DROP', database: this.DB.adminconfig.database, table: tables, role: role })); }
           catch (error) { console.log(`Dropping role ${role} error: `, error.message); }
          }
       if (create) // Create role with its priveleges
          { 
           try { await client.query(...qm.Make({ method: 'CREATE', database: this.DB.adminconfig.database, table: tables, role: role })); }
           catch (error) { console.log(`Creating role ${role} error: `, error.message); }
           try { await client.query(...qm.Make({ method: 'CREATE', database: this.DB.adminconfig.database, table: tables, role: role, priveleges: role.includes('ro') ? 'SELECT' : 'SELECT, INSERT, UPDATE, DELETE' })); }
           // ended here
           catch (error) { console.log(`Creating role ${role} priveleges error: `, error.message); }
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
       await client.query(...qm.Table(null, null, this.DB.adminconfig.database).Method('DROP').Make());
       console.log(`Database ${this.DB.adminconfig.database} is dropped`);
       await client.query(...qm.Table(null, null, this.DB.adminconfig.database).Method('CREATE').Make());
       console.log(`Database ${this.DB.adminconfig.database} is created successfully`);
      }
  catch (error)
      {
       console.error(`Reset database '${this.DB.adminconfig.database}' error: `, error);
       return;
      }
  await client.end();

  // Creating extension
  try {
       client = new Client(this.DB.adminconfig);
       await client.connect();
       await client.query(...qm.Table('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE').Make());
       console.log(`TimescaleDB extension is activated successfully`);
      }
  catch (error)
      {
       console.log('Activation TimescaleDB extension error: ', error.message);
      }
  if (client) await client.end();

  // Creating new User OD
  this.clients.set(client = { send: function(){} }, { auth: true, userid: globals.PRIMARYKEYSTARTVALUE, username: globals.SUPERUSER, socket: client });
  await this.SetNewODInstance(globals.USEROBJECTDATABASE, undefined, client);
  await this.Start();
  await this.Handler(JSON.stringify({ type: 'ADDOBJECT', odid: '1', ovid: '1', data: { eid1: globals.SUPERUSER } }), client);
  await this.ClosePool();
 }

 // Function creates new OD sql tables
 async CreateOD(odid, transaction)
 {
  // Create new databases and write its structure. First - head_ table
  await transaction.query(...qm.Table(`head_${odid}`).Method('CREATE').Make());
  await transaction.query(...qm.Table(`head_${odid}`).Method('CREATE').Fields({ id: { value: 'INTEGER', constraint: `PRIMARY KEY GENERATED ALWAYS AS IDENTITY` },
                                                                                datetime: { value: 'TIMESTAMP', constraint: 'DEFAULT CURRENT_TIMESTAMP' },
                                                                                userid: 'INTEGER',
                                                                                dialog: 'JSON' }).Make());
  // Second - data_ table
  await transaction.query(...qm.Table(`data_${odid}`).Method('CREATE').Make());
  await transaction.query(...qm.Table(`data_${odid}`).Method('CREATE').Fields({ id: { value: 'INTEGER', constraint: `GENERATED BY DEFAULT AS IDENTITY (START WITH ${globals.PRIMARYKEYSTARTVALUE})` },
                                                                                version: { value: 'INTEGER', constraint: 'DEFAULT 1' },
                                                                                lastversion: { value: 'BOOLEAN', constraint: 'DEFAULT TRUE' },
                                                                                mask: 'TEXT',
                                                                                ownerid: 'INTEGER',
                                                                                owner: `VARCHAR(${globals.USERNAMEMAXCHAR})`,
                                                                                datetime: { value: 'TIMESTAMP', constraint: 'DEFAULT CURRENT_TIMESTAMP' },
                                                                                date: { value: 'DATE', constraint: 'DEFAULT CURRENT_DATE' },
                                                                                time: { value: 'TIME', constraint: 'DEFAULT CURRENT_TIME' },
                                                                                PRIMARY: 'KEY(id, version)' }).Make());
  // Third - timescale table metr_                                                                               
  await transaction.query(...qm.Table(`metr_${odid}`).Method('CREATE').Make());
  await transaction.query(...qm.Table(`metr_${odid}`).Method('CREATE').Fields({ id: 'INTEGER',
                                                                                datetime: { value: 'TIMESTAMPTZ', constraint: 'DEFAULT CURRENT_TIMESTAMP' },
                                                                                date: { value: 'DATE', constraint: 'DEFAULT CURRENT_DATE' },
                                                                                time: { value: 'TIME', constraint: 'DEFAULT CURRENT_TIME' },
                                                                                value: 'FLOAT' }).Make());
  await transaction.query(...qm.Table(`metr_${odid}`, 'datetime').Method('CREATE').Make());
  await transaction.query(...qm.Table(`metr_${odid}`, 'id').Method('WRITE').Make());
  // Create custom user data table <meta_N> in a addition to <data_N>/<metr_N> to insert any non application random data
  await transaction.query(...qm.Table(`meta_${odid}`).Method('CREATE').Make());
 }

 // Function adjust some parameteres of OD dialog structure to add/update. Todo1 - adjust all views layout text areas commenting error jsons as a error ones
 async AdjustOD(dialogold, dialognew, odid)
 {
  const elementids = {};
  let maxid;

  // Old OD does exist, so remove appropriate table columns if needed. Old OD does not exist otherwise
  if (odid)
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
   else
     {
      dialognew.ok.data = 'SAVE'; // Create btn is 'SAVE' btn after db conf dialog created
      delete dialognew.ok.expr; // No grey btn 'CREATE' for empty db name that is used to remove OD
     }

  // Correct OD dialog title
  const odname = globals.GetDialogElement(dialognew, 'padbar/Database/settings/General/dbname', true); // Get OD name
  dialognew.title.data = `Database '${globals.CutString(odname.split('/').pop())}' configuration (id${odid})`; // Change OD dialog title 

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

  return elementids; // elementids = { [id]: { method: 'CREATE|DROP', type: <columntype>, index: <columnindex> } }
 }

 // Function checks <dialog> 'correctness' and save it to DB (undefined OD id (<odid>) - new OD creation)
 async SetNewODInstance(dialognew, odid, client)
 {
  let dialogold, restrictedpads = [], transaction;
  client = this.clients.get(client);
  if (!client?.auth) return;
  const users = [client.username]; // Todo0 - create a function that returns a ws client username and its group names in a single arraya add group list to current user (<[client.username]>) check and release config OD restrinction at GETDATABASE

  try {
       transaction = await this.pool.connect(); // Old version: transaction = new Client(this.DB.adminconfig); await transaction.connect();
       await transaction.query('BEGIN');
       await transaction.query(...qm.Table().Lock(odid ? odid : 0).Method('CREATE').Make()); // Lock OD<odid> for change
       globals.CheckODConfigurationDialogSyntax(dialognew, odid); // Check new dialog syntax for true (OD does exist, so update operation is perfomed) or false (OD does not exist, so new OD creation is perfomed) odid
       // Check existing OD presence in <ods> array
       if (odid)
          {
           dialogold = this.ods[odid].dialog;
           if (!dialogold) throw new Error(UNKNOWNDBID);
           restrictedpads = globals.AcceptODConfigurationDialogChanges(dialogold, dialognew, users); // OD previous instance does exist, so get its non-changed pad names due to user restriction
           if (!globals.CheckODConfigurationDialogSyntax(dialognew, odid)) // Check changed above (due to restricted pads) new dialog syntax once again and remove OD for empty result (OD name is returned, so if it is empty - the OD should be removed)
              {
               for (const table of ['head_', 'data_', 'metr_', 'meta_']) await transaction.query(...qm.Table(`${table}${odid}`).Method('DROP').Make()); // Drop all OD related tables
               await transaction.query('COMMIT');
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
           const tablelist = await transaction.query(...qm.Table().ShowTables().Make()); // Todo0 - Dont forget to keep limited database versions, it is impossible to keep all database changes history from it creation
           for (const row of tablelist.rows) // Calculate current OD max id plus 1
               {
                const id = globals.GetTableNameId(row.tablename);
                if (id && +id >= odid) odid = +id + 1;
               }
           await this.CreateOD(odid, transaction);
          }
       const elementids = await this.AdjustOD(dialogold, dialognew, odid);
       await transaction.query(...qm.Table(`head_${odid}`).Method('WRITE').Fields({ userid: client.userid, dialog: { value: JSON.stringify(dialognew), escape: true } }).Make());
       console.log('------------------------------', elementids);
       for (const id in elementids) switch (elementids[id].method)
           {
            case 'CREATE':
                 if (elementids[id].type)
                    {
                     await transaction.query(...qm.Table(`data_${odid}`).Method('CREATE').Fields({ [`${globals.ELEMENTCOLUMNPREFIX}${id}`]: elementids[id].type }).Make()); // Create new element column
                     await transaction.query(...qm.Table(`metr_${odid}`).Method('CREATE').Fields({ [`${globals.ELEMENTCOLUMNPREFIX}${id}`]: `VARCHAR(${globals.USERNAMEMAXCHAR})` }).Make()); // New element for metr hypertable, so it results to next columns: id, datetime, date, time, value, eid1, eid2 - where 'id' is an object id; 'eid1..' is an object element property name (null or string) to retreive time 'value' by; 
                    }
                 if (elementids[id].index && elementids[id].index !== 'None')
                    {
                     await transaction.query(...qm.Table(`data_${odid}`).Method('CREATE').Index(elementids[id].index.includes('hash') ? 'hash' : 'btree').Fields({ [`${globals.ELEMENTCOLUMNPREFIX}${id}`]: elementids[id].index.includes('UNIQUE') ? 'UNIQUE' : '' }).Make()); // Create column index
                    }
                 break;
            case 'DROP':
                 if (elementids[id].index)
                    {
                     await transaction.query(...qm.Table(`data_${odid}`).Method('DROP').Index('btree').Fields(`${globals.ELEMENTCOLUMNPREFIX}${id}`).Make()); // Drop index
                    }
                  else
                    {
                     await transaction.query(...qm.Table(`data_${odid}`).Method('DROP').Fields(`${globals.ELEMENTCOLUMNPREFIX}${id}`).Make()); // Drop column
                     await transaction.query(...qm.Table(`metr_${odid}`).Method('DROP').Fields(`${globals.ELEMENTCOLUMNPREFIX}${id}`).Make());
                    }
                 break;
           }
       await this.SuckInODProps(dialognew, odid); // Refresh dialog data in memory
       this.SendViewsToClients(odid); // Refresh OD tree with its vews and folders to all wss clients
       await transaction.query('COMMIT');
      }
  catch (error)
      {
       if (transaction) await transaction.query('ROLLBACK');
       console.error(error.stack);
       client.socket.send(JSON.stringify({ type: 'WARNING', data: { content: error.message, title: 'Error' } }));
       return;
      }
  finally
      {
       if (transaction) transaction.release();
      }

  // Create readonly and read/write user roles for data, metr and meta tables in case of new OD creation (old Od instance <dialogold> doesn't exist)
  if (!dialogold)
     {
      await this.ManageRole(`rouserodid${odid}`, true, true);
      await this.ManageRole(`rwuserodid${odid}`, true, true);
     }
  const msg = restrictedpads.length ? { type: 'WARNING', data: { content: `Configuration section${restrictedpads.length > 1 ? 's' : ''} '${restrictedpads.join(', ')}' ${restrictedpads.length > 1 ? 'are' : 'is'} not modified due to user restrictions!` } } : { type: 'WARNING', data: { content: `Object Database (id '${odid}') new instance is successfully created!`, title: 'Info' } };
  client.socket.send(JSON.stringify(msg));
 }

 // Function parses OD dialog structure and store main OD params in memeory for a quick access
 async SuckInODProps(dialog, odid)
 {
  let id;
  this.ods[odid] = { dialog: dialog, name: globals.GetDialogElement(dialog, 'padbar/Database/settings/General/dbname', true), query: {}, layout: {}, elementprofiles: { /*eid1: { type:, name:, description: }*/} };

  const elements = globals.GetDialogElement(dialog, 'padbar/Element/elements', true) || {};
  for (const option in elements) if (id = globals.GetOptionNameId(option))
      this.ods[odid].elementprofiles[globals.ELEMENTCOLUMNPREFIX + id] = { type: elements[option].type.data.trim().toLowerCase(), name: elements[option].name.data, description: elements[option].description.data };

  const views = globals.GetDialogElement(dialog, 'padbar/View/views', true) || {};
  for (const option in views) if (id = globals.GetOptionNameId(option))
      {
       const layout = this.ParseViewLayout(globals.GetDialogElement(views[option], 'settings/Selection/layout', true), odid);
       const query = await this.ParseViewQuery(globals.GetDialogElement(views[option], 'settings/Selection/query', true), layout);
       this.ods[odid].query[id] = query;
       this.ods[odid].layout[id] = layout;
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
                if (alias = alias.trim()) msg.data.ov[ovid].push(alias);
           }
       if (value.socket) value.socket.send(JSON.stringify(msg));
      }
 }

 // +-------------------------------------------------+
 // |  row: boolean expression                        | vars <r>, <c>, <table> based expression (boolean result) to match the selection row ; empty property is a faulsy case, so no any row matched
 // |  col: id|owner|e1|e2..|count(*)|${e1_prop}||    | sql select statement operands (columns); empty col - any already defined col from previous jsons are used; 
 // |  x,y: number expression                         | vars <r>, <c>, <table> based expression (number result) to place the cell with x,y props table coordinates. Vars <r> and <c> are undefined for virtual cells
 // |  value: string [expression]                     | For virtual cells only - macros form vars <x>, <y>, <table> based expression (string result) to overwrite cell text content which is dinamycly refreshed at any table data refresh
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
  const layout = { dbdata: {}, nondbdata: {}, columns: [] }; // <columns> array has next fromat: { original:, elementname:, elementprop:, elementprofilename:, elementprofiledescription:, elementprofiletype: }, also 5 props added at client side: event, collapsedrows[], collapsedcols[], collapseundefinedrows, collapseundefinedcols

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

       // Next step - pasre column list in json.col splited via '|' then
       if (Object.keys(json).length < 3) continue; // Props count low than 3 means only row/col props defined which is incorrect
       const currentcolumns = json.col ? [] : layout.columns;
       for (let original of json.col.split('|'))
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
            if (!(json.row in layout.dbdata)) layout.dbdata[json.row] = {}; // Create json.row key empty object in a layout dbdata (if it doesn't exist)
            layout.dbdata[json.row][column] = Object.assign(layout.dbdata[json.row][column] || {}, json); // and copy all json props to it for specified column name
           }
      }

  return layout;
 }

 async ParseViewQuery(query, layout)
 {
  const select = [];
  for (const column of layout.columns) select.push(column.original);
  return await this.MacrosReplace(query.trim(), { COLUMNS: select.join(',') })
 }

 // Macros name (acts as a macros profile name) is replaced by macros value. Undefined macros names are replaced by empty strings. User defined empty macros name is correct
 // Macros types:
 //  General:  ${RANDOM} ${DATE} ${DATETIME} ${TIME} ${USERNAME} ${USERID} ${NULL}
 //  View:     ${OD} ${OV} ${ODID} ${OVID} ${OID} ${COLUMNS} ${LAYOUT1} ${LAYOUT2} ${LAYOUT3} ${LAYOUT4}
 //  Event:    ${EVENT} ${EID} ${EPROP} ${MODIFIER} ${DATA}
 //  Element:  ${"odid": "6", "oid": "id=7 AND lastversion=true", "ename": "edi2", "eprop": "value"}, all macros names in parentheses are interpreted as usual macros names, except ones in JSON format. Once the string inside is any correct JSON, it becomes 'element' type macros and defines object element to retreive the data from. All JSON props are optional except "username".
 //  Dialog:   OV args in OD settings
 //  Database: macroses in general OD settings
 //  User:     User settings
 //  Handler:  via system call 'SETMACROS' handler defined macroses
 // Application processes with macros types order to apply:
 //  OV call event parses view selection 'layout' and 'query' fields:                                    dialog, general, view, database, user
 //  Controller incoming events from client side and handlers parses rule 'message' and 'query' fields:  dialog, general, view, event, element, database, user
 //  User customization apply at user login:                                                             user, general
 //  Handler system call 'SETMACROS':                                                                    handler
 async MacrosReplace(string, replacements, chain = {})
 {
  let macrosvalue, newstring = '';
 
  while (true)
        {
         const pos1 = string.indexOf('${'); // Search start of macros
         const pos2 = string.indexOf('}'); // and the finish
         if (pos1 === -1 || pos2 === -1 || pos1 > pos2) return newstring + string; // No found? return previous result plus current
         const macrosname = string.substring(pos1 + 2, pos2); // Retrieve macros name
         // and substitute ${macrosname} to macros value via recursive function call, setting loop/undefined cases to empty string:
         macrosvalue = ''; // Set macros value default value
         if (macrosname in replacements)
            {
             if (!(macrosname in chain)) macrosvalue = this.MacrosReplace(replacements[macrosname], replacements, Object.assign(chain, { [macrosname]: true }));
            }
          else
            {
             try { macrosvalue = JSON.parse(`{${macrosname}}`); }
             catch {}
             let transaction, elementdata;
             if (macrosvalue)
                {
                 try {
                      transaction = await this.pool.connect();
                      await transaction.query('BEGIN');
                      await transaction.query(`SET LOCAL ROLE rouserodid${macrosvalue.odid}`);
                      if ('eprop' in macrosvalue) macrosvalue.ename = qm.ExtractJSONPropField(macrosvalue.ename, macrosvalue.eprop);
                      elementdata = await transaction.query(...qm.Table().Make(`SELECT ${macrosvalue.ename} FROM data_${macrosvalue.odid} WHERE ${macrosvalue.oid} LIMIT 1`));
                      await transaction.query('COMMIT');
                     }
                 catch (error)
                     {
                      await transaction.query('ROLLBACK');
                      elementdata = error.message;
                     }
                 finally
                     {
                      if (transaction) transaction.release();
                     }
                }
            }
         newstring += string.substring(0, pos1) + macrosvalue; // Collect newstring with macros value
         string = string.substring(pos2 + 1); // and redefine remaining part to pass it for next cycle
        }
 }
  
 async ElementHandlerExec(msg, session)
 {
  switch (msg.type)
         {
          case 'ADDOBJECT': //
               if (!msg.data) msg.data = {};
               qm.Table(`data_${msg.odid}`).Method('WRITE');
               for (const eid in this.ods[msg.odid].elementprofiles)
                   {
                    if (typeof this.modules?.system?.AddUser !== 'function') continue;
                    let json = await this.modules.system.AddUser(eid, msg.data[eid] ? msg.data[eid] : '', session.username); // Parse handler output for JSON/plaintext for the data to be set in a new object
                    try { json = JSON.parse(json); }
                    catch { continue; }
                    if (json.type !== 'SET') continue;
                    if (json.data && typeof json.data === 'object') json.data = JSON.stringify(json.data);
                    if (typeof json.data !== 'string') continue;
                    qm.Fields({ [eid]: { value: json.data, escape: true } });
                   }
               await this.pool.query(...qm.Make());
               break;
          case 'HUI':
               break;
         }
 }
}

// Todo0 - wsuser -> session, remake qm
// Todo2 - change '*', '!' to const var and others
// Todo0 - all DB dialog settings workable
// Todo0 - User dialog settings
//         Main: 
//               username [eid1] username is unchangable after creation
//               password [eid2] empty pass diallows login, but allows cron execution, changeble for own users only
//               custom text fields [eid3] name, tel, email, foto, other info, changeble for own users only
//         Policy: [eid4] (changeble for previlige users only)
//               groups
//               Login instances to login (undefined/incorrect/zero - no login/no cron, for all users except root)
//               timeout after the user is logged out
//               Restrict the user 'read' access to next OD/OV combinations ([!]od [!]ov)
//               Restrict the user 'write' access to next OD/OV combinations
//               Restrict the user to create OD
//               Restrict the user to run Task Manager (or/and call with no task delete option)
//         Macroses: [eid5] (changeble for own users only)
//         Customization: [eid6] (Create root user read-only classic customization, so users can use it via 'force' option in user-customization dialog) (changeble for own users only)
//         Event groups: [eid7] (changeble and viewable for root user only)

// Todo0 - Every object element has a list of event profile names one by line. No any profile - element is non interactive and cannot react on user events (such as keyboard/maouse/paste/schedule and others) to call its event handlers. 
//         At any client/server side element event occur - incoming event is checked on all profiles until the match. Once the match is found - the specified event handler is called to process event and its data. 
//         Every event may have 'none' action to explicitly set no call-handler, may be usefull to cancel through-profiles event search with no action
//         Event profiles of themselves are defined in 'root' user settings pad 'Event profiles':
//         event profile: add/remove
//                  event name + modifier keys: KEYPRESS/DBLCLICK/KEYA (act as a profile name together with modifier keys, event profile names are set automatically by controller)
//                        Step1 profile (step profile names are added/removed automatically by controller in case of 'Redirect to next step' set/unset)
//                            handler type(data): Command line(command line text area)/Custom stdout(custom stdout text area)/Modules(module function args text area)/None
//                            Handler stdout correct JSON/Handler stdout incorrect JSON/Handler stderr: Apply/Message/Ignore/Redirect to next step/+Log
//                            timeout in sec, retries
//         Event profile consists of user added events only (not all). After user adds new event - all its builtin handlers reset their handler data to default. Handler data for SCHEDULE event has crontab file syntax (for all except sandbox/none handler types)
//         Command line/user defined plain text are not single line, but multiple. Controller runs first line handler, may be used as a comments
//         Negative queue value (the scheduler sleep for) in msec on crontab line

// Controller and event handlers
// Todo0 - Auth user process
// Todo0 - release config OD restrinction at GETDATABASE for the users that are not allowed OD read access
// Todo0 - Restrict element handler call, so user double clicked on any object element is unable generate another double click event on other (or same) object element, 
// Todo1 - Create a template from client event NEWOBJECTDATABASE to check dialog structure correctness
// Todo0 - How to set comments on rule msg textarea? First nonempty line is a rule msg, other lines are a comment
// Todo0 - Dialog text interface element or cell editing mode autocompletes to predefined values (for a example company clients)
// Todo0 - Native handler that get user online/offline status with datetime timestamp and current instances number logged in
// Todo0 - UPDATE handler command (in a addition to SET/RESET) creates new object version only in case of at least one user-defined element changed
//         Plus some aliases to SET system call (PUT/WRITE/PUSH) to apply different rules depending on a SET alias
// Todo0 - Don't log message in case of previous msg match, but log 'last message repeated 3 times'
// Todo0 - Discover new object:
//		     Object selection: SELECT NONE
//		     Define handler for any one element for event SCHEDULE 
//		     In case of no any object selected in object selection process the handler is executed once with object id 0 (or -1..3) as input arg (plus object list ip addresses, for a example).
//		 	  The handler runs in detach mode or answers with two possible system calls 'DELETEOBJECT' and 'NEWOBJECT' (other cmds are ignored).
//		     So based on input args the handler can discover (create) new objects or destroy (delete) in range of user defined pool
// Todo0 - Release system calls 'NEWOBJECT' and 'DELETEOBJECT' (don't mess with self-titled events), so the handlers can create/remove multiple objects. And 'COPY' to copy data to the buffer
//		     May these system calls 'NEWOBJECT' and 'DELETEOBJECT' release will be similar to user self-titled events, for example - user creates a new object via context click with 'new object row' as an args,
//         so system call 'NEWOBJECT' does with 'data' property as an arg for all creating new object elements
