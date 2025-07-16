// Todo0 - Secure wss https://www.npmjs.com/package/ws#external-https-server
// Todo0 - Study ws on Node https://github.com/websockets/ws?tab=readme-ov-file#how-to-detect-and-close-broken-connections
// Todo0 - socket rate limit: https://javascript.info/websocket#rate-limiting
// Todo0 - How to secure web socket connections: https://www.freecodecamp.org/news/how-to-secure-your-websocket-connections-d0be0996c556/
// Todo0 - Node SNMP https://github.com/markabrahams/node-net-snmp old stuff: https://github.com/calmh/node-snmp-native
// Todo1 - process event 'Server has closed connection due to timeout', should this event be on client or server side (via any incoming msg)?
// Todo1 - Create a template from frontend NEWOBJECTDATABASE to check dialog structure correctness
//    Comment and adjust other sourcse
//    Divide todo list for specific js sources
//    Object selection input arg dialog defines not only object selection but element layout
//    Define unspecified event default None or Nothing
//    Auth process, user OD with its dialog and customization etc, permissions - check OD creating
//    object view except graph and tree
//    Add 'client side warning message' near with 'log rule msg'. How to set comments on rule msg?
//    Macroses - Macros name (act as a macros profile name), Macros value (text to submit macros name), Macros description (arbitrary text). Undefined macroses are empty strings. Mmacros strategy definition:
//		Builtin macroses ${OD} ${OV} ${oid>} ${eid>} ${date} ${ODid} ${OVid} ${datetime} ${time} ${username} ${RULEMSG} ${EVENT} ${MODIFIER} ${default element layout templates}
//		Object element props retriving ${oid: 1, eid: 2: prop: 'value'} (for handler cmd line only)
//        Dialog defined (for OD conf and handler cmd line only)
//		Db conf macroses (for OD conf only)
//        User specific
//        Global system user

// Controller and event handlers
// Todo - Single/Multipile select as a native handler that allows to select predefined values (for a example company clients)
// Todo - Task manager restrict call (or/and call with no task delete option) for the user in his property settings and send only active handler list instead of their wrapeed dialog structure
// Todo - Every user event has timeout the handler proccess it. The match of the user/event/odid/oid/eid record in event/message queue doesn't allow duplicated until the timeout exceeds.
//        The record in event/message queue is removed after the handler responce or timeout occur
//        Another more strict option is to consider only user/event/odid/oid combination for element id, so user double cliked on any object element is unable generate another double click event on other object element, 
//        so controller call is not perfomed until response or timeout
// Todo - Create system user read-only customization like github interface, for a example, so users can use it via 'force' option in user-customization dialog
// Todo - UPDATE handler command (in a addition to SET/RESET) creates new object version only in case of at least one user-defined element changed
//		Multiple SET system calls (SET1, SET2, ... for a example) in a addition to UPDATE to apply different rules depending on a SET system call number.
//        Or add aliases to SET system call (PUT/ADD/WRITE/PUSH) to add specific rules to
// Todo - Don't log message in case of previous msg match, but log 'last message repeated 3 times'
// Todo - Release CHANGE event subscribing feature to allow non-native object (another words - object subscribes for CHANGE event of other object in DB) elements react on
// Todo - Controller dialog message: how to escape divider char '/'? Via '\/'?
// Todo - event 'VIEWREFRESH' occurs at OV open/refresh, the hanlder for this event is called similar 'NEWOBJECT' event (handler commands as an answeers for 'VIEWREFRESH' events depends on a view type - SET|EDIT commands, for a example, are for table type only).
//		  This event 'VIEWREFRESH' is useful for some actions to be made at view OPEN, for a example, some objects elements data refresh (counters for a example) or execution of a script doing some external actions in 'ignore' mode
// Todo - How to call dialog to add new object instead of retreiving element data from vitrual object (id=-1)
// Todo - Release system calls 'NEWOBJECT' and 'DELETEOBJECT' (don't mess with self-titled events), so the handlers can create/remove multiple objects. And 'COPY' to copy data to the buffer
//		May these system calls 'NEWOBJECT' and 'DELETEOBJECT' release will be similar to user self-titled events, for example - user creates a new object via context click with 'new object row' as an args,
//        so system call 'NEWOBJECT' does with 'data' property as an arg for all creating new object elements
// Todo0 - Discover new object:
//		 Object selection: SELECT NONE
//		 Define handler for any one element for event SCHEDULE 
//		 In case of no any object selected in object selection process the handler is executed once with object id 0 (or -1..3) as input arg (plus object list ip addresses, for a example).
//		 		The handler runs in detach mode or answers with two possible system calls 'DELETEOBJECT' and 'NEWOBJECT' (other cmds are ignored).
//		 So based on input args the handler can discover (create) new objects or destroy (delete) in range of user defined pool
// Todo0 - Every object element has a list of event profile names one by line. No any profile - element is non interactive and cannot react on user events (such as keyboard/maouse/paste/schedule and others) to call element event handlers. 
//         At any client/server side element event occur - incoming event is checked on all profiles until the match. Once the match is found - the specified event handler is called to process event and its data. 
//         Event profiles of themselves are defined is 'system' user settings pad 'Event profiles':
//         event profile: add/remove
//                  event name: KEYPRESS/DBLCLICK/KEYA (act as a profile name together with modifier keys)         
//                       Modifier keys
//                            Step1 profile
//                                 handler type: command line/user defined plain text stdout/builtin node-native snmp/node sandbox js script/None
//                                 handler data: command line text/user defined plain text stdout/builtin node-native snmp args/node sandbox js script text/None
//                                 macros definition dialog: 
//                                 Handler stdout (correct JSON): Apply/Message/Ignore/Redirect/+Log
//                                 Handler stdout (incorrect JSON): Set/Message/Ignore/Redirect/+Log
//                                 Handler stderr: Set/Message/Ignore/Redirect/+Log
//                                 timeout in sec, retries
//         Event profile consists of user added events only (not all). After user adds new event - all its builtin handlers reset their dialog args data. Handler data for SCHEDULE event has crontab file syntax (for all except sandbox/none hanlder types)
//         Event command line are not single line, but multiple. Controller runs first line handler, gets its data, other lines handlers may run in detached mode or may be used as a comments
//         Negative queue value (the scheduler sleep for) in msec on crontab line

import { WSIP, WSPORT, GenerateRandomString, lg, qm, pool } from './main.js';
import { ReadAllDatabase, SendViewsToClients, EditDatabase } from './objectdatabase.js';

const UNKNOWNDBID = 'Incorrect or nonexistent database id!';

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

 MessageIn(msg, client)
 {
  try { msg = JSON.parse(msg); }
  catch { return; }
  //lg('Incoming msg:', msg);
  if (!msg || typeof msg !== 'object' || !msg.type) return;

  if (!['LOGIN', 'CREATEWEBSOCKET'].includes(msg.type) && !this.clients.get(client).auth)
     {
      client.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: 'Unauthorized access detected, please relogin!' }));
      client.terminate();
      return;
     }

  switch (msg.type)
	    {
	     case 'SETDATABASE':
               EditDatabase(msg, this.clients.get(client));
	          break;
	     case 'GETDATABASE':
               if ((typeof msg.data.odid !== 'number' && typeof msg.data.odid !== 'string') || !this.ods[msg.data.odid]) client.send(JSON.stringify({ type: 'DIALOG', id: msg.id, data: { dialog: UNKNOWNDBID, title: 'Error' } }));
                else client.send(JSON.stringify({ type: 'DIALOG', id: msg.id, data: { dialog: this.ods[msg.data.odid].dialog } }));
	          break;
	     case 'SIDEBARGET':
               SendViewsToClients(null, client);
	          break;
          case 'LOGIN':
               client.writeHeader(200, {'Content-Type': 'application/json; charset=UTF-8'});
               msg = this.Authenticate(msg.data.username, msg.data.password);
               client.write(JSON.stringify(msg));
               client.end()
               return;
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
                   client.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: 'Unauthorized access detected, please relogin!' }));
                   client.terminate();
                  }
	          break;
          case 'GETVIEW':
               this.SendView(client, msg);
               break;
          default:
               return; // Return for unknown msg type
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
  try {
       //selection = await pool.query(...qm.Table(query).Make());
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
