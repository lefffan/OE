import http from 'http';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { qm, pool } from './main.js';
import { ReadAllDatabase, SendViewsToClients, EditDatabase } from './objectdatabase.js';
import * as globals from './globals.js';

const UNKNOWNDBID        = 'Incorrect or nonexistent database id!';
const INCORRECTLAYOUT    = 'Incorrect layout - no any object/virtual elements defined in OD configuration layout section!';
const UNAUTHORIZEDACCESS = 'Unauthorized access detected, please relogin!';
const TIMEOUTACCESS      = 'Server has closed connection due to timeout, please relogin!';
const UNDEFINEDQUERYRES  = 'Database query returned udnefined result!'
const STATICDOCS         = {
                            '/application.js': '/static/application.js',
                            '/connection.js': '/static/connection.js',
                            '/constant.js': '/static/constant.js',
                            '/contextmenu.js': '/static/contextmenu.js',
                            '/dialogbox.js': '/static/dialogbox.js',
                            '/dropdownlist.js': '/static/dropdownlist.js',
                            '/' : '/static/index.html',
                            '/interface.js': '/static/interface.js',
                            '/sidebar.js': '/static/sidebar.js',
                            '/view.js': '/static/view.js',
                            '/globals.js': '/globals.js',
                           };
const HTTPIP             = '127.0.0.1';
const HTTPPORT           = '8003';
const WSIP               = '127.0.0.1';
const WSPORT             = '8002';

export class Controller
{
 constructor()
 {
  this.clientauthcodes = {};
  this.clients = new Map();
  this.ods = {};
  http.createServer(this.HTTPNewConnection.bind(this)).listen(HTTPPORT, HTTPIP); // Todo0 - set secure server via https instead of http
  ReadAllDatabase();
  new WebSocketServer({ port: WSPORT }).on('connection', this.WSNewConnection.bind(this));
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
  return { type: 'LOGINACK', data: { username: username, userid: '0', protocol: 'ws', ip: WSIP, port: WSPORT, authcode: this.AddClientAuthCode(globals.GenerateRandomString(12), { userid: '0', username: username }/* Todo0 - set user id here */) } };
 }

 Handler(msg, client)
 {
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
               EditDatabase(msg, this.clients.get(client));
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
