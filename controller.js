import http from 'http';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { QueryMaker } from './querymaker.js';
import * as globals from './globals.js';
import pg from 'pg';

const { Pool, Client }   = pg; // Todo0 - change to import { Pool, Client } from 'pg' ?
const UNKNOWNDBID        = 'Incorrect or nonexistent database id!';
const INCORRECTLAYOUT    = 'Incorrect layout - no any object/virtual elements defined in OD configuration layout section!';
const UNAUTHORIZEDACCESS = 'Unauthorized access detected, please relogin!';
const TIMEOUTACCESS      = 'Server has closed connection due to timeout, please relogin!';
const UNDEFINEDQUERYRES  = 'Database query returned udnefined result!'
const qm                 = new QueryMaker();

export class Controller
{
 constructor(HTTP, WS, DB)
 {
  if (HTTP) http.createServer(this.HTTPNewConnection.bind(this)).listen(HTTP.port, HTTP.ip); // Todo0 - set secure server via https instead of http
  if (this.WS = WS) new WebSocketServer({ host: WS.ip, port: WS.port }).on('connection', this.WSNewConnection.bind(this));
  if (!HTTP || !WS || !DB) return;
  this.DB = DB;
  this.pool = new Pool(DB.adminconfig);
  this.clientauthcodes = {};
  this.clients = new Map();
  this.ods = {};
  this.ReadAllDatabase();
 }

 HTTPNewConnection(req, res)
 {
  switch(req.method)
        {
         case 'GET':
              if (STATICDOCS[req.url])
                 {
                  res.writeHeader(200, req.url === '/' ? {'Content-Type': 'text/html'} : {'Content-Type': 'application/javascript'});
                  res.write(fs.readFileSync(import.meta.dirname + STATICDOCS[req.url], 'utf8'));
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
  return { type: 'LOGINACK', data: { username: username, userid: '0', protocol: 'ws', ip: this.WS.ip, port: WSPORT, authcode: this.AddClientAuthCode(globals.GenerateRandomString(12), { userid: '0', username: username }/* Todo0 - set user id here */) } };
 }

 Handler(msg, client)
 {
  if (!client) { console.log(`Unknown web socket client with next event: ${msg}`); return; }  
  try { msg = JSON.parse(msg); }
  catch { console.log(`Client side incorrect incoming JSON: ${msg}`); return; }
  console.log('Incoming msg:', msg);
  if (!msg || typeof msg !== 'object' || !msg.type) return;

  if (!['LOGIN', 'CREATEWEBSOCKET'].includes(msg.type) && !this.clients.get(client).auth)
     {
      client.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: UNAUTHORIZEDACCESS })); // Todo0 - process event 'Server has closed connection due to timeout' here, see const var TIMEOUTACCESS
      client.terminate();
      return;
     }

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
               SendViewsToClients(null, client);
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
                   this.clients.get(client).auth = true;
                   this.clients.get(client).userid = this.clientauthcodes[msg.data.authcode].userid;
                   this.clients.get(client).username = this.clientauthcodes[msg.data.authcode].username;
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
               // For element to be callable:
               // - table should be 'Actual data' or 'Historical data'
               // - columns id in result query (Interactive checkbox set in OD dialog configure is wrong way, cause explicit 'id' column mention should be defined in order exclude incorrect queries with aggr functions)
               // - element column name ed1..N or eidN->>prop (for json/jsonb types only). In case of eidN->>prop add extra info of style/hint prop values
               // Create layout.interactivecols array with boolean elements (whole element interactive) and strings elements (element json property interactive)
	    }
  //this.clients.get(client).lasttimestamp = Date.now();
 }

 async SendView(client, msg)
 {
  const selections = [], fields = [], query = this.ods[msg.data.odid].query[msg.data.ovid], layout = this.ods[msg.data.odid].layout[msg.data.ovid];

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

  let transaction;
  try {
       if (query)
          {
           transaction = await pool.connect();
           if (!transaction) throw new Error(globalThis.TRANSACTIONERROR);
           await transaction.query('BEGIN');
           await transaction.query(`SET LOCAL ROLE rouserodid${msg.data.odid}`);
           let ress = await pool.query(...qm.Table(query).Make(true));
           await transaction.query('COMMIT');
           transaction.release();

           if (!ress) throw new Error(UNDEFINEDQUERYRES);
           if (!Array.isArray(ress)) ress = [ress];
           for (const res of ress)
               {
                selections.push(res.rows);
                fields.push(res.fields.map(item => { const [elementname, elementprop] = qm.GetColumnElementAndProp(item.name); return { original: item.name, elementname: elementname, elementprop: elementprop }; }));
               }
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
       if (!transaction) transaction.release();
      }

  [msg.data.layout, msg.data.selections, msg.data.fields] = [layout, selections, fields];
  console.log(msg);
  client.send(JSON.stringify(msg));
 }

 // Function gets application database ro/wr all roles
 async GetAllDatabaseRoles()
 {
  let client;
  const users = [];

  try {
       client = new Client(this.DB.defaultconfig); // Get all ro/rw users to delete
       await client.connect();
       const rousers = await client.query(...qm.Table(null, null, this.DB.adminconfig.database).Table('pg_roles').Method('SELECT').Fields('rolname').Fields({ rolname: { value: 'rouserodid%', sign: ' LIKE ' } }).Make());
       const rwusers = await client.query(...qm.Table(null, null, this.DB.adminconfig.database).Table('pg_roles').Method('SELECT').Fields('rolname').Fields({ rolname: { value: 'rwuserodid%', sign: ' LIKE ' } }).Make());
       if (Array.isArray(rousers?.rows)) rousers.rows.map(row => { if (row.rolname?.match(/\d+$/)?.[0]) users.push(row.rolname); });
       if (Array.isArray(rwusers?.rows)) rwusers.rows.map(row => { if (row.rolname?.match(/\d+$/)?.[0]) users.push(row.rolname); });
      }
  catch (error)
        {
         console.error('Getting Database roles error: ', error.stack);
        }

  if (client) await client.end();
  return users;
 }

 // Function removes ro/wr OD roles from <users> array. There are four sql read/write processes:
 // 1. OV display 'read' (own ro user per OD)
 // 2. Handler system calls 'write' (rw user for data/metr tables only)
 // 3. Element data macroses 'read' (own OD ro user, foreign OD views via permissions in OD conf)
 // 4. Rules 'read/write' (own rw user per OD)
 async DeleteODUsers(users)
 {
  let client;
  try {
       client = new Client(this.DB.adminconfig);
       await client.connect();
      }
  catch (error)
      {
       console.error(`Connecting database '${this.DB.adminconfig.database}' error: `, error.stack);
       return;
      }

  for (const role of users)
      {
       const odid = role?.match(/\d+$/)?.[0]; // Role name string end digit check
       if (!odid) continue;
       try {
            await client.query(...qm.Table(`data_${odid},metr_${odid},meta_${odid}`, null, this.DB.adminconfig.database).Method('DROP').Role(role, role.includes('ro') ? 'SELECT' : 'SELECT, INSERT, UPDATE, DELETE').Make());
            console.log(`Dropping role '${role}'.. dropped!`);
           }
       catch (error)
           {
            console.error(`Removing role ${role} error: `, error.stack);
           }
      }

  client.end();
 }

 async Reset()
 {
  // Getting all ro/rw users and deleting them     
  let client;
  await this.DeleteODUsers(await this.GetAllDatabaseRoles());
  
  // Connecting to database
  try {
       client = new Client(this.DB.adminconfig);
       await client.connect();
      }
  catch (error)
      {
       console.error(`Connecting database '${this.DB.adminconfig.database}' error: `, error.stack);
       return;
      }

  // Dropping database
  try {
       await client.query(...qm.Table(null, null, this.DB.adminconfig.database).Method('DROP').Make());
       console.log(`Database ${this.DB.adminconfig.database} is dropped`);
      }
  catch (error)
      {
       console.error(`Error dropping database '${this.DB.adminconfig.database}': `, error.stack);
      }

  // Creating database
  try {
       await client.query(...qm.Table(null, null, this.DB.adminconfig.database).Method('CREATE').Make());
       console.log(`Database ${this.DB.adminconfig.database} is created successfully`);
      }
  catch (error)
      {
       console.error(`Error creating database '${this.DB.adminconfig.database}': `, error.stack);
       return;
      }

  // Creating extension
  try {
       await client.query(...qm.Table(null, null, this.DB.adminconfig.database).Method('CREATE').Make());
       await client.query(...qm.Table('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE').Make());
       console.log(`TimescaleDB extension is activated successfully`);
      }
  catch (error)
      {
       console.error('Activation TimescaleDB extension error: ', error.stack);
      }
  await client.end();

  // Creating new User OD
  this.clients.set(client = {}, { username: globals.SUPERUSER });
  await SetNewODInstance(globals.USEROBJECTDATABASE, undefined, client);
 }

 // Function removes specified OD sql tables
 async RemoveOD(odid, client)
 {
  for (const table of ['head_', 'data_', 'metr_', 'meta_']) await transaction.query(...qm.Table(`${table}${odid}`).Method('DROP').Make()); // Drop all OD related tables
  for (const [, value] of this.clients) value.socket.send(JSON.stringify({ type: 'SIDEBARDELETE', data: { odid: odid } })); // and send OD remove msg to all wss clients
  delete this.ods?.[odid]; // Delete OD from app memory
  if (client?.send) client.send(JSON.stringify({ type: 'WARNING', data: { content: 'Object Database is successfully removed!', title: 'Info' } })); // and send info mgs for client initiated removing
 }

 // Function creates new OD sql tables
 async CreateOD(odid, client)
 {
  // Create new databases and write its structure
  await transaction.query(...qm.Table(`head_${odid}`).Method('CREATE').Make());
  await transaction.query(...qm.Table(`head_${odid}`).Method('CREATE').Fields({ id: { value: 'INTEGER', constraint: 'PRIMARY KEY GENERATED ALWAYS AS IDENTITY' },
                                                                                datetime: { value: 'TIMESTAMP', constraint: 'DEFAULT CURRENT_TIMESTAMP' },
                                                                                userid: 'INTEGER',
                                                                                dialog: 'JSON' }).Make());
  //                                                                                
  await transaction.query(...qm.Table(`data_${odid}`).Method('CREATE').Make());
  await transaction.query(...qm.Table(`data_${odid}`).Method('CREATE').Fields({ id: { value: 'INTEGER', constraint: 'GENERATED BY DEFAULT AS IDENTITY' },
                                                                                version: { value: 'INTEGER', constraint: 'DEFAULT 1' },
                                                                                lastversion: { value: 'BOOLEAN', constraint: 'DEFAULT TRUE' },
                                                                                mask: 'TEXT',
                                                                                ownerid: 'INTEGER',
                                                                                owner: `VARCHAR(${globals.USERNAMEMAXCHAR})`,
                                                                                datetime: { value: 'TIMESTAMP', constraint: 'DEFAULT CURRENT_TIMESTAMP' },
                                                                                date: { value: 'DATE', constraint: 'DEFAULT CURRENT_DATE' },
                                                                                time: { value: 'TIME', constraint: 'DEFAULT CURRENT_TIME' },
                                                                                PRIMARY: 'KEY(id, version)' }).Make());
  //                                                                                
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
  // Create readonly and read/write user roles for data, metr and meta tables
  await transaction.query(...qm.Table(`data_${msg.data.odid},metr_${msg.data.odid},meta_${msg.data.odid}`, null, DBNAME).Method('CREATE').Role(`rouserodid${msg.data.odid}`, 'SELECT').Make());
  await transaction.query(...qm.Table(`data_${msg.data.odid},metr_${msg.data.odid},meta_${msg.data.odid}`, null, DBNAME).Method('CREATE').Role(`rwuserodid${msg.data.odid}`, 'SELECT, INSERT, UPDATE, DELETE').Make());
  if (client?.send) client.send(JSON.stringify({ type: 'WARNING', data: { content: 'Object Database is successfully created!', title: 'Info' } }));
 }

 // Function adjust some parameteres of OD dialog structure to add/update. Todo1 - adjust all views layout text areas commenting error jsons as a error ones
 async AdjustOD(dialogold, dialognew, odid)
 {
  const newelementids = {};
  let maxid;

  // Old OD does exist, so remove appropriate table columns if needed. Old OD does not exist otherwise
  if (odid)
     {
      const remainingeids = {}; // Remaining element id list
      globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/Element/elements', true), false, 'New element template', (data, option, name) => { const id = globals.GetOptionNameId(name); if (id) remainingeids[id] = ''; });
      globals.ProcessDialogProfiles(globals.GetDialogElement(dialogold, 'padbar/Element/elements', true), false, 'New element template', (data, option, name) =>
      {
       const id = globals.GetOptionNameId(name);
       if (id in remainingeids) return remainingeids[id] = globals.GetDialogElement(data[option], 'index', true);
       transaction.query(...qm.Table(`data_${odid}`).Method('DROP').Fields(`${globals.ELEMENTCOLUMNPREFIX}${id}`).Make());
       transaction.query(...qm.Table(`metr_${odid}`).Method('DROP').Fields(`${globals.ELEMENTCOLUMNPREFIX}${id}`).Make());
      });
      globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/Element/elements', true), false, 'New element template', (data, option, name) =>
      {
       const id = globals.GetOptionNameId(name);
       if (!(id in remainingeids)) return;
       const newindex = globals.GetDialogElement(data[option], 'index', true);
       if (newindex === remainingeids[id]) return; // Old column index doesn't change? Return
       if (newindex === 'None') return transaction.query(...qm.Table(`data_${odid}`).Method('DROP').Index().Fields(`${globals.ELEMENTCOLUMNPREFIX}${id}`).Make()); // Drop index
       transaction.query(...qm.Table(`data_${odid}`).Method('CREATE').Index(index.includes('hash') ? 'hash' : 'btree').Fields({ [`${globals.ELEMENTCOLUMNPREFIX}${id}`]: index.includes('UNIQUE') ? 'UNIQUE' : '' }).Make()); // Create index. Todo0 - should column index be deleted apparently at column destroy?
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
  globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/Element/elements', true), true, null, (data, option, name, flag, style) => { newelementids[++maxid] = { type: data[option].type.data, index: data[option].index.data }; globals.AdjustDialogProfileFlags(data, option, name, flag, style, maxid, 'type'); });

  // Correct OD dialog 'Element' profile names (id, clone flag remove, +- flags add)
  maxid = 0;
  globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/View/views', true), false, 'New view template', (data, option, name) => { const id = +globals.GetOptionNameId(name); if (id && id > maxid) maxid = id; });
  globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/View/views', true), true, null, (data, option, name, flag, style) => globals.AdjustDialogProfileFlags(data, option, name, flag, style, ++maxid));

  // Correct OD dialog 'Rule' profile names (clone flag remove, +- flags add)
  globals.ProcessDialogProfiles(globals.GetDialogElement(dialognew, 'padbar/Rule/rules', true), true, null, (data, option, name, flag, style) => globals.AdjustDialogProfileFlags(data, option, name, flag, style));

  return newelementids;
 }

 // Function checks <dialog> 'correctness' and save it to DB (undefined OD id (<odid>) - new OD creation)
 async SetNewODInstance(dialognew, odid, client)
 {
  let dialogold, restrictedpads, transaction;
  if (!this.clients.get(client)) return;
  const users = [this.clients.get(client).username]; // Todo0 - create a function that returns a ws client username and its group names in a single arraya add group list to current user (<[client.username]>) check and release config OD restrinction at GETDATABASE

  try {
       transaction = await this.pool.connect();
       await transaction.query('BEGIN');
       await transaction.query(...qm.Table().Lock(odid ? odid : 0).Method('CREATE').Make()); // Lock OD<odid> for change
       globals.CheckODConfigurationDialogSyntax(dialognew, odid); // Check new dialog syntax for true (OD does exist, so update operation is perfomed) or false (OD does not exist, so new OD creation is perfomed) odid
       // Check existing OD presence in <ods> array
       if (odid)
          {
           dialogold = this.ods[odid].dialog;
           if (!dialogold) throw new Error(UNKNOWNDBID);
           restrictedpads = globals.AcceptODConfigurationDialogChanges(dialogold, dialognew, users); // OD previous instance does exist, so get its non-changed pad names due to user restriction
           if (!globals.CheckODConfigurationDialogSyntax(dialognew, odid)) return await this.RemoveOD(); // Check changed above (due to restricted pads) new dialog syntax once again and remove OD for empty result (OD name is returned, so if it is empty - the OD should be removed)
          }
       const newelementids = this.AdjustOD(dialogold, dialognew, odid);
       if (!odid)
          {
           odid = 1;
           const tablelist = await transaction.query(...qm.Table().ShowTables().Make()); // Todo0 - Dont forget to keep limited database versions, it is impossible to keep all database changes history from it creation
           for (const row of tablelist.rows) // Calculate current OD max id plus 1
               {
                const id = globals.GetTableNameId(row.tablename);
                if (id && +id >= odid) odid = +id + 1;
               }
           this.CreateOD(odid, client);
          }
       await transaction.query(...qm.Table(`head_${odid}`).Method('WRITE').Fields({ userid: client.userid, dialog: { value: JSON.stringify(dialognew), escape: true } }).Make());
       for (const id in newelementids)
           {
            await transaction.query(...qm.Table(`data_${odid}`).Method('CREATE').Fields({ [`${globals.ELEMENTCOLUMNPREFIX}${id}`]: newelementids[id].type }).Make()); // Create new element
            await transaction.query(...qm.Table(`data_${odid}`).Method('CREATE').Index(newelementids[id].index.includes('hash') ? 'hash' : 'btree').Fields({ [`${globals.ELEMENTCOLUMNPREFIX}${id}`]: newelementids[id].index.includes('UNIQUE') ? 'UNIQUE' : '' }).Make()); // Create index
            await transaction.query(...qm.Table(`metr_${odid}`).Method('CREATE').Fields({ [`${globals.ELEMENTCOLUMNPREFIX}${id}`]: `VARCHAR(${globals.USERNAMEMAXCHAR})` }).Make()); // New element for metr hypertable, so it results to next columns: id, datetime, date, time, value, eid1, eid2 - where 'id' is an object id; 'eid1..' is an object element property name (null or string) to retreive time 'value' by; 
           }
       if (restrictedpads.length && client?.send) client.send(JSON.stringify({ type: 'WARNING', data: { content: `Configuration section${restrictedpads.length > 1 ? 's' : ''} '${restrictedpads.join(', ')}' ${restrictedpads.length > 1 ? 'are' : 'is'} not modified due to user restrictions!` } }));
       SuckInODProps(msg.data.dialog, msg.data.odid); // Refresh dialog data in memory
       this.SendViewsToClients(odid); // Refresh OD tree with its vews and folders to all wss clients
      }
  catch (error)
      {
       if (transaction) await transaction.query('ROLLBACK');
       console.log(error.message);
       if (client?.send) client.send(JSON.stringify({ type: 'WARNING', data: { content: error.message, title: 'Error' } }));
      }
  finally
      {
       if (transaction) transaction.release();
      }
 }

 // { type: 'SIDEBARSET', odid: 13, path: 'System/Users', ov: { 1: ['test/view1a', '/vie1b'], 2: ['/folder/View2c', 'test/view2d'] } }
 SendViewsToClients(odid, clients)
 {
  if (typeof odid === 'number') odid += '';
  if (typeof odid !== 'string' && (!clients || typeof clients !== 'object')) return; // No views refresh both for all clients and all dbs
  let e;
  clients = (clients && typeof clients === 'object') ? new Map().set(clients, this.clients.get(clients)) : this.clients; // Create one single client to send views in case of its object type, otherwise - all clients array is used (controller.clients)
 
  for (const id in this.ods) if (typeof odid !== 'string' || id === odid) // Go through all object databases for undefined odid or OD 'id' for exactly defined one
  for (const [, value] of clients) // Also go through all clients for selected OD above
      {
       if (!value.auth) continue;
       e = globals.GetDialogElement(controller.ods[id].dialog, 'padbar/Database/settings/General/dbname');
       if (!e) throw new Error(INCORRECTDBCONFDIALOG);
       const msg = { type: 'SIDEBARSET', data: { odid: id, path: e.data, ov: {} } }; // Create message for OD 'id' with its path (e.data) and views defined below
       e = globals.GetDialogElement(controller.ods[id].dialog, 'padbar/View/views');
       if (!e) throw new Error(INCORRECTDBCONFDIALOG);
 
       for (const option in e.data) // Go through all view profiles
           {
            if (globals.CompareOptionInSelectElement('New view template', option)) continue; // except view template
            const ovid = globals.GetOptionNameId(option); // Get view id from option name
            const aliases = globals.GetDialogElement(controller.ods[id].dialog, `padbar/View/views/${option}/settings/General/name`); // and all view aliases
            if (!aliases || typeof aliases.data !== 'string' || typeof ovid !== 'string') throw new Error(INCORRECTDBCONFDIALOG); // Throw an error for incorrect view profile
            msg.data.ov[ovid] = []; // Create aliases array first
            for (let alias of aliases.data.split('\n')) // and split aliases data to one by line alias to add it to message 'ov' array
                if (alias = alias.trim()) msg.data.ov[ovid].push(alias);
           }
 
       value.socket.send(JSON.stringify(msg)); // Todo2 - should pause (via setTimeout(0, )) be between two socket msg sendings keep non blocking main thread?
      }
 }
}

// Todo0 - create elemtns in new DB Users
// Todo0 - create one view in new DB Users

// Todo0 - Macroses
//         Macros name (act as a macros profile name), Macros value (text to submit macros name), Macros description (some text to describe macros assignment and implementation). Undefined macroses are replaced by empty strings. User defined empty macros name is correct, but should be avoided due system defined one duplicate
//         Macros types:
//		            General:    ${RANDOM} ${DATE} ${DATETIME} ${TIME} ${USERNAME} ${USERID} ${NULL}
//                View:       ${OD} ${OV} ${ODID} ${OVID} ${OID} ${COLUMNS} ${LAYOUT1} ${LAYOUT2} ${LAYOUT3} ${LAYOUT4}
//                Event:      ${EVENT} ${EID} ${EPROP} ${MODIFIER} ${DATA}
//		            Element:    ${odid: 6, oid: 7, eid: 8: eprop: 'value'}, all macros names in parentheses are interpreted as usual constant strings, except this one - it acts as a JSON to define object element to retreive the data from.
//                Dialog:     OV args in OD settings
//		            Database:   macroses in general OD settings
//                User:       User settings
//                Handler:    via system call 'SETMACROS' handler defined macroses
//         Macros apply:
//                View call event parses view layout and selection fields and uses next type of macroses in priority order:                                                                           dialog, general, view, database, user
//                Controller incoming commands (events from client side and system calls from handlers) parses rule message and rule query fields and uses next types of macroses in priority order:  dialog, general, view, event, element, database, user
//                User customization is applied on user relogin:                                                                                                                                      user, general
//                Handler system call 'SETMACROS':                                                                                                                                                    handler
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
//         Event profile consists of user added events only (not all). After user adds new event - all its builtin handlers reset their handler data to default. Handler data for SCHEDULE event has crontab file syntax (for all except sandbox/none hanlder types)
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
