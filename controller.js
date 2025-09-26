// 2025 year:
// Todo1 - loading percent status animation and blue/green view icon
// Todo1 - Child interaction via msg exchange only (!) via parent child management. Go through all files and search Handler KILL CallController FromColtroller
// Todo0 - Queue manager 
//         Document controller-client message broker and build conception when call one view, then calling the second while 1st view os not yet loaded would cancel 1st view incoming data msg
//         Every user event has timeout the handler proccess it. The match of the user/event/odid/oid/eid record in event/message queue doesn't allow duplicated until the timeout exceeds.
//         The record in event/message queue is removed after the handler responce or timeout occur
//         Another more strict option is to consider only user/event/odid/oid combination for element id, so user double cliked on any object element is unable generate another double click event on other object element, 
//         so controller call is not perfomed until response or timeout
// Todo0 - Macroses
//         Macros name (act as a macros profile name), Macros value (text to submit macros name), Macros description (arbitrary text). Undefined macroses are empty strings. Macroses can be placed in OD/user dialog only. Mmacros strategy definition:
//		 Builtin macroses ${OD} ${OV} ${oid} ${eid} ${date} ${ODid} ${OVid} ${datetime} ${time} ${username} ${userid} ${RULEMSG} ${EVENT} ${MODIFIER} ${default element layout templates}
//		 Object element props retriving ${oid: 1, eid: 2: prop: 'value'} (for handler cmd line only)
//         Dialog defined (for OD conf (layout, selection...) and handler cmd line only). For OV settings add macros definition dialog: auto/custom/none
//		 Db conf macroses (for OD conf only)
//         User specific
//         Root user
// Todo0 - Auth user process
// Todo0 - User dialog settings:
//         Main: eid1 username, eid2 pass(empty pass diallows login, but allows cron execution)|groups|Login instances to login (undefined/incorrect/zero - no login, for all users except root)|timeout after the user is logged out|other custom text fields (tel, email, foto, other info). All props are json eid2 props
//               user can change only his own settings except permission_tab and groups (that is changeble for previlige users only), username is unchangable after creation?, all users can only read (address book), root - write
//         Macroses:
//         Customization: (Create system user read-only customization like github interface, for a example, so users can use it via 'force' option in user-customization dialog)
//         permissions (for all except root): od/ov, OD creating, Task manager restrict call (or/and call with no task delete option) for the user in his property settings and send only active handler list instead of their wrapeed dialog structure, 
//         Events (for root only): profile list

// Controller and event handlers
// Todo1 - process event 'Server has closed connection due to timeout', should this event be on client or server side (via any incoming msg)?
// Todo1 - Create a template from client event NEWOBJECTDATABASE to check dialog structure correctness
// Todo - How to set comments on rule msg textarea? 1st line is a rule msg, other lines are a comment
// Todo - Single/Multipile select interface element as a native controller-to-client call that allows to select predefined values (for a example company clients)
// Todo0 - Native handler that get user online/offline status with datetime stamp and current instances number logged in
// Todo - UPDATE handler command (in a addition to SET/RESET) creates new object version only in case of at least one user-defined element changed
//		Multiple SET system calls (SET1, SET2, ... for a example) in a addition to UPDATE to apply different rules depending on a SET system call number.
//        Or add aliases to SET system call (PUT/ADD/WRITE/PUSH) to add specific rules to
// Todo - Don't log message in case of previous msg match, but log 'last message repeated 3 times'
// Todo - Release CHANGE event subscribing feature to allow non-native object (another words - object subscribes for CHANGE event of other object in DB) elements react on
// Todo - Controller dialog message: how to escape divider char '/'? Via '\/'?
// Todo - event 'VIEWREFRESH' occurs at OV open/refresh, the hanlder for this event is called similar 'NEWOBJECT' event (handler commands as an answeers for 'VIEWREFRESH' events depends on a view type - SET|EDIT commands, for a example, are for table type only).
//		  This event 'VIEWREFRESH' is useful for some actions to be made at view OPEN, for a example, some objects elements data refresh (counters for a example) or execution of a script doing some external actions in 'ignore' mode
//        Should VEWREFRESH be called at new OV appear in a any window or in a new window only? SHould new event SYSTMESTART (that applied for every OD at system start) be made?
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
//         Every event may have 'none' action to explicitly set no call-handler, may be usefull to cancel through-profiles event seach with no action
//         Event profiles of themselves are defined is 'system' user settings pad 'Event profiles':
//         event profile: add/remove
//                  event name + modifier keys: KEYPRESS/DBLCLICK/KEYA (act as a profile name together with modifier keys, profile names are set automatically by controller)
//                        Step1 profile (profile names are set automatically by controller)
//                            handler type: command line/user defined plain text stdout/builtin node-native snmp/node sandbox js script/None
//                            handler data: command line text/user defined plain text stdout/builtin node-native snmp args/node sandbox js script text/None
//                            Handler stdout correct JSON: Apply/Message/Ignore/Redirect to next step/+Log
//                            Handler stdout incorrect JSON: Set/Message/Ignore/Redirect to next step/+Log
//                            Handler stderr: Set/Message/Ignore/Redirect to next step/+Log
//                            timeout in sec, retries
//         Event profile consists of user added events only (not all). After user adds new event - all its builtin handlers reset their handler data to default. Handler data for SCHEDULE event has crontab file syntax (for all except sandbox/none hanlder types)
//         Command line/user defined plain text are not single line, but multiple. Controller runs first line handler, may be used as a comments
//         Negative queue value (the scheduler sleep for) in msec on crontab line
// Todo0 - Study the doc:
//         Secure wss https://www.npmjs.com/package/ws#external-https-server
//         Study ws on Node https://github.com/websockets/ws?tab=readme-ov-file#how-to-detect-and-close-broken-connections
//         socket rate limit: https://javascript.info/websocket#rate-limiting
//         How to secure web socket connections: https://www.freecodecamp.org/news/how-to-secure-your-websocket-connections-d0be0996c556/
//         Node SNMP https://github.com/markabrahams/node-net-snmp old stuff: https://github.com/calmh/node-snmp-native


import { WSIP, WSPORT, GenerateRandomString, lg, qm, pool } from './main.js';
import { ReadAllDatabase, SendViewsToClients, EditDatabase } from './objectdatabase.js';

const UNKNOWNDBID        = 'Incorrect or nonexistent database id!';
const UNKNOWNLAYOUT      = 'Incorrect layout, no any object elements defined in JSON col/row with x/y properties!';
const UNAUTHORIZEDACCESS = 'Unauthorized access detected, please relogin!';

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
      client.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: UNAUTHORIZEDACCESS }));
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
                   client.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: UNAUTHORIZEDACCESS }));
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
