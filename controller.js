// Todo0 - create elemtns in new DB Users
// Todo0 - create one view in new DB Users

// Todo0 - Macroses
//         Macros name (act as a macros profile name), Macros value (text to submit macros name), Macros description (some text to describe macros assignment and implementation). Undefined macroses are replaced by empty strings. User defined empty macros name is correct, but should be avoided due system defined one duplicate
//         Macros types:
//		            General:    ${RANDOM} ${DATE} ${DATETIME} ${TIME} ${USERNAME} ${USERID} ${NULL}
//                View:       ${OD} ${OV} ${ODID} ${OVID} ${OID} ${LAYOUT1} ${LAYOUT2} ${LAYOUT3} ${LAYOUT4}
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
// Todo2 - Release CHANGE event subscribing feature to allow non-native object (another words - object subscribes for CHANGE event of other object in DB) elements react on
// Todo0 - client event 'VIEWREFRESH' (or RELOAD??) occurs at OV open/refresh, the hanlder for this event is called similar 'NEWOBJECT' event (handler system calls as an answers for 'VIEWREFRESH' events depends on a view type - SET|EDIT commands, for a example, are for table type only).
//		     This event 'VIEWREFRESH' is useful for some actions to be made at view OPEN, for a example, some objects elements data refresh (counters for a example) or execution of a script doing some external actions in 'ignore' mode
// Todo0 - release client event 'ONMACROSCHANGE'
// Todo0 - Ctrl+N creates a new object generating new element values based on table cells. In case of no 'new object' cell call dialog to add new object with elements defined in a view layout
// Todo0 - Discover new object:
//		     Object selection: SELECT NONE
//		     Define handler for any one element for event SCHEDULE 
//		     In case of no any object selected in object selection process the handler is executed once with object id 0 (or -1..3) as input arg (plus object list ip addresses, for a example).
//		 	  The handler runs in detach mode or answers with two possible system calls 'DELETEOBJECT' and 'NEWOBJECT' (other cmds are ignored).
//		     So based on input args the handler can discover (create) new objects or destroy (delete) in range of user defined pool
// Todo0 - Release system calls 'NEWOBJECT' and 'DELETEOBJECT' (don't mess with self-titled events), so the handlers can create/remove multiple objects. And 'COPY' to copy data to the buffer
//		     May these system calls 'NEWOBJECT' and 'DELETEOBJECT' release will be similar to user self-titled events, for example - user creates a new object via context click with 'new object row' as an args,
//         so system call 'NEWOBJECT' does with 'data' property as an arg for all creating new object elements
// Todo0 - Study the doc:
//         Secure wss https://www.npmjs.com/package/ws#external-https-server
//         Study ws on Node https://github.com/websockets/ws?tab=readme-ov-file#how-to-detect-and-close-broken-connections
//         socket rate limit: https://javascript.info/websocket#rate-limiting
//         How to secure web socket connections: https://www.freecodecamp.org/news/how-to-secure-your-websocket-connections-d0be0996c556/
//         Node SNMP https://github.com/markabrahams/node-net-snmp old stuff: https://github.com/calmh/node-snmp-native
//         Node module import/export syntax https://www.w3schools.com/nodejs/nodejs_modules_esm.asp https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Statements/import

import { WSIP, WSPORT, GenerateRandomString, lg, qm, pool } from './main.js';
import { ReadAllDatabase, SendViewsToClients, EditDatabase } from './objectdatabase.js';

const UNKNOWNDBID        = 'Incorrect or nonexistent database id!';
const UNKNOWNLAYOUT      = 'Incorrect layout, no any object elements defined in JSON col/row with x/y properties!';
const UNAUTHORIZEDACCESS = 'Unauthorized access detected, please relogin!';
const TIMEOUTACCESS      = 'Server has closed connection due to timeout, please relogin!';

export class Controller
{
 constructor()
 {
  this.clientauthcodes = {};
  this.clients = new Map();
  this.ods = {};
  ReadAllDatabase();
 }

 AddClientAuthCode(string, data)
 {
  this.clientauthcodes[string] = data;
  // Todo0 - do Settimeout to remove expired auth codes
  return string;
 }

  // Todo0 - Compare here user/pass from corresponded pair in 'User' OD
 Authenticate(username, password)
 {
  if (!username || !password || username !== 'root' || password !== '1') return { type: 'LOGINERROR', data: 'Wrong username or password!' };
  return { type: 'LOGINACK', data: { username: username, userid: '0', protocol: 'ws', ip: WSIP, port: WSPORT, authcode: this.AddClientAuthCode(GenerateRandomString(12), { userid: '0', username: username }/* Todo0 - set user id here */) } };
 }

 Handler(msg, client)
 {
  try { msg = JSON.parse(msg); }
  catch { return; }
  lg('Incoming msg:', msg);
  if (!msg || typeof msg !== 'object' || !msg.type) return;

  if (!['LOGIN', 'CREATEWEBSOCKET'].includes(msg.type) && !this.clients.get(client).auth)
     {
      client.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: UNAUTHORIZEDACCESS }));
      client.terminate();
      return;
     }

  if (false)
     {
      // Todo0 - process event 'Server has closed connection due to timeout' here
      client.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: TIMEOUTACCESS }));
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
               if (this.clientauthcodes[msg.data.authcode] && this.clientauthcodes[msg.data.authcode].userid === msg.data.userid)
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
               //console.log(msg);
	    }
  //this.clients.get(client).lasttimestamp = Date.now();
 }

 // For element to be callable:
 // - table should be 'Actual data' or 'Historical data'
 // - columns id in result query (Interactive checkbox set in OD dialog configure is wrong way, cause explicit 'id' column mention should be defined in order exclude incorrect queries with aggr functions)
 // - element column name ed1..N or eidN->>prop (for json/jsonb types only). In case of eidN->>prop add extra info of style/hint prop values
 // Create layout.interactivecols array with boolean elements (whole element interactive) and strings elements (element json property interactive)
 async SendView(client, msg)
 {
  msg.type = 'SETVIEW';
  if (!this.ods[msg.data?.odid])
     {
      msg.data.error = UNKNOWNDBID;
      client.send(JSON.stringify(msg));
      return;
     }

  let selection, query = this.ods[msg.data.odid].query[msg.data.ovid];
  if (!query)
     {
      msg.data.error = UNKNOWNLAYOUT;
      client.send(JSON.stringify(msg));
      return;
     }

  try {
       selection = await pool.query(...qm.Table(query).Make(true));
      }
  catch (error)
      {
       msg.data.error = `Query: ${query}<br>Error message: ${error.message}`;
       client.send(JSON.stringify(msg));
       return;
      }
  [msg.data.layout, msg.data.selection, msg.data.interactive] = [this.ods[msg.data.odid].layout[msg.data.ovid], selection.rows, this.ods[msg.data.odid].interactive[msg.data.ovid]];
  client.send(JSON.stringify(msg));
 }
}
