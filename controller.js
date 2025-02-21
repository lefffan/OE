// Todo0 - Secure wss https://www.npmjs.com/package/ws#external-https-server
// Todo0 - Study ws on Node https://github.com/websockets/ws?tab=readme-ov-file#how-to-detect-and-close-broken-connections
// Todo - socket rate limit: https://javascript.info/websocket#rate-limiting
// Todo - How to secure web socket connections: https://www.freecodecamp.org/news/how-to-secure-your-websocket-connections-d0be0996c556/
// Todo - Node SNMP https://github.com/calmh/node-snmp-native

import { WebSocketServer } from 'ws';
import { QueryMaker } from './querymaker.js';
import { controller, pool } from './main.js';
import { lg } from './main.js';

const wss = new WebSocketServer({ port: 8002 });
wss.on('connection', WSNewConnection);
const qm = new QueryMaker();
 
function WSMessageProcess(msg)
{
 // msg - incoming message from the client side
 // this - ws connection object that is passed first at websocket init and stored in <clients> map object. To send data back to the client side use this.send('...'),
 msg = JSON.parse(msg);
 if (!msg || typeof msg !== 'object' || !msg['type']) return;
 if (msg['type'] !== 'LOGIN' && !controller.clients.get(this).auth)
    {
     this.send(JSON.stringify({ type: 'LOGINERROR', data: 'Unauthorized access attempt detected, please relogin!' }));
     this.terminate();
     return;
    }

 switch (msg['type'])
	    {
	     case 'EDITDATABASE':
              controller.EditDatabase(msg, controller.clients.get(this));
	          break;
	     case 'GETDATABASE':
	          break;
	     case 'SIDEBARGET':
	          this.send(JSON.stringify({ type: 'SIDEBARSET', odid: 13, path: 'hui/Система/Users', ov: { 1: ['zest/view1a', '/vvvvvvvvvvvvvvvvvvvvvvvvvie1b'], 2: ['/ahui1/View2c', 'test/view2d']}}));
              this.send(JSON.stringify({ type: 'SIDEBARSET', odid: 12, path: 'Logs', ov: {1:['1/2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq/3/4/5333333333333333333333333333333333333']} }));
	          break;
	     case 'LOGIN':
              if (controller.clientauthcodes[msg.authcode])
                 {
                  controller.clients.get(this).auth = true;
                  controller.clients.get(this).userid = controller.clientauthcodes[msg.authcode].userid;
                  delete controller.clientauthcodes[msg.authcode];
	              this.send(JSON.stringify({ type: 'AUTHWEBSOCKET' }));
                 }
               else
                 {
                  this.send(JSON.stringify({ type: 'LOGINERROR', data: 'Unauthorized access attempt detected, please relogin!' }));
                  this.terminate();
                 }
	          break;
	    }
}

function WSError(err)
{
 console.error(err);
}

function WSNewConnection(client)
{
 controller.clients.set(client, { socket: client }); // { auth: true|false, userid:, }
 client.on('message', WSMessageProcess);
 client.on('error', WSError);
}

export class Controller
{
 constructor()
 {
  this.clientauthcodes = {};
  this.clients = new Map();
 }

 AddClinetAuthCode(string, userid)
 {
  this.clientauthcodes[string] = { userid: userid };
  // Todo0 - do Settimeout to remove expired auth codes
  return string;
 }

 AdjustDatabase(dialog)
 {
  for (const entity of ['Element', 'View'])
      {
       const path = entity === 'Element' ? 'Element/' : 'View//General';
       let id = 1;
       //for (const e of SearchDialogElements(dialog, { path: path, head: 'Description', flag: '^[^~]' }))
          // {
            //let profilename = e.path;
          // }
      }
  // February:
  //    New dialog source
  //    Comment and adjust other sourcse
  //    Divide todo list for specific js sources
  // March:
  //    rename New view -> Template to create new view
  //    Don't create OD (and delete OD) in case of empty OD name and no any view/element profiles
  //    Change title to 'Database Configuration' and 'ok' btn to 'Save'
  //    Display odid in dialog
  //    adjust view and element profiles name + (id1)
  //        Renew element and view props in memory (depending on macroses too)
  //        Renew uniq data tables with adding/removing columns
  //    permissions - check OD creating, check all pads of OD dialog read/change permissions, so no any readable pad - the user is not allowed OD dialog at all
  //    OD structure, example - 'view name' change to 'aliases list'
  //    Macroses - Macros name (act as a macros profile name), Macros value (text to submit macros name), Macros description (arbitrary text). Dont forget about dynamic macroses (${OD} $OV) and CalcMacrosValue function. Or split them into 2 objects - one is dinamic macroses list that claim to be calculated at its apply or static macroses
  //    Create a template to check dialog structure correctness and check here database data structure with returning appropriate result (falsy value in case if incorrect database structure)
  // April
  //    object view except graph and tree
  // May
  //    Auth process, user OD with its dialog and customization etc..
  return (dialog && typeof dialog === 'object') ? dialog : null;
 }
 
 CalcMacrosValue(name, value, collect = [])
 {
  collect.push(name);
 }

 async EditDatabase(msg, wsclient)
 {
  if (!wsclient) return; // No valid web socket client in controller clients map? Return
  let result;

  // Todo0 - Parse here if it is a new od creation or existing one editing. And dont forget to keep limited database versions, it is impossible to keep all database changes history from it creation
  try {
       result = await pool.query(...qm.Table().ShowTables().Make()); // Todo2 - Should <qm> be global var or controller class specific?
      }
  catch (error) { lg(error); } // Todo0 - catch all error that occur in whole database creation process, send 'Cannot create DB ' to the client side 

  // Calculate next free database index (id)
  let odid = 0;
  for (const row of result.rows)
      {
       let pos = row.tablename.indexOf('_');
       if (pos === -1) continue;
       pos = +(row.tablename.substring(pos + 1));
       if (pos > odid) odid = pos;
      }
  odid++;

  // Create new databases and write its structure
  try {
       await pool.query(...qm.Table('head_' + odid).Method('CREATE').Make());
       await pool.query(...qm.Table('uniq_' + odid).Method('CREATE').Make());
       await pool.query(...qm.Table('data_' + odid).Method('CREATE').Make());
       await pool.query(...qm.Table('head_' + odid).Method('CREATE').Fields({ id: {value: 'INTEGER', constraint: 'PRIMARY'}, timestamp: {value: 'TIMESTAMP', constraint: 'DEFAULT CURRENT_TIMESTAMP'}, userid: 'INTEGER', /*username: `CHAR(${USERNAMEMAXCHAR})`,*/ dialog: 'JSON' }).Make());
      }
  catch (error) { lg(error); }

  // Adjust database dialog structure and write it to 'head_<odid>' table
  const dialog = this.AdjustDatabase(msg.data);
  if (!dialog) return; // Todo0 - send 'Incorrect database dialog structure' to the client?
  try {
       await pool.query(...qm.Table('head_' + odid).Method('WRITE').Fields({ userid: wsclient.userid, dialog: {value: JSON.stringify(dialog), escape: true} }).Make());
      }
  catch (error) { lg(error); }

  // Todo0 - for (const client of this.clients) client.socket.send(JSON.stringify({ type: 'SIDEBARSET', odid: 13, path: 'hui/Система/Users', ov: { 1: ['zest/view1a', '/vvvvvvvvvvvvvvvvvvvvvvvvvie1b'], 2: ['/ahui1/View2c', 'test/view2d']}}));
 }
}

// auth= '{ userid:, sessionid:, expire:, sign: }', where sign is a hash (HMAC-SHA256) with a password (wich is stored specifically in server internal memory) of client LOGIN data: ip, fingerprint (user-agent and other specific data), userid and expire.
// auth token may be store in LS (so page reload doesn't call relogin) or in client app memory (page reload calls relogin), auth token is no encrypted, but cannot be faked due to its sign compared on server side
// Should i send keepalive events (last client event generates setTimeout (60*1000) for keepalive event post) from client side to exclude session timeout and 
// +--------+                                            +------------+                                   +---------+                                     
// |        |  case No Auth Token:  		    		 |            |                               ... |         |                
// |        |  {type LOGIN, user, pass} (POST) -> 	 	 |            |                               ... |         |                
// |        |                      <- {type TOKEN, auth} |            |                                   |         |                
// |        |                        <- {type WRONGPASS} |            |                                   |         |                
// |        |                                     		 |            |                                   |         |                
// |        |  case Auth Token with no WS:        		 |            |                               ... |         |                
// |        |  {type GETWS, auth} (POST) ->				 |            |                               ... |         |                
// |        |                  <- {type SETWS, ip, port} |            |                                   |         |                
// |        |        		 <- {type: 'UNAUTH|EXPIRED'} |            |                                   |         |                
// |        |                                     		 |            |                                   |         |                
// |        |  case Auth Token with WS: 	       		 |            |                               ... |         |                
// |        |  {type <any-event>, auth} (WS)			 |            |                               ... |         |                
// |        |        		 <- {type: 'UNAUTH|EXPIRED'} |            |                                   |         |                
// |        |                                     		 |            |                                   |         |                
// |        |  case Auth Token with/out WS:        		 |            |                                   |         |                
// |        |  {type LOGOUT, auth}                		 |            |                               ... |         |                
// |        |                                     		 |            |                               ... |         |                
// |        | User events STEP1--->                      |            | User events STEP2--->             |         |                
// |        |   Context menu (INIT|DELETE)               |            |   ---||---                        |         |                
// |        |   Confirmation (CONFIRM|CONFIRMDIALOG)     |            | Controller event:                 |         |                
// |        |   Mouse and keyboard	 	        		 |            |   SCHEDULE                        |         |                
// |        |   Sidebar (RELOAD, NEWOD)	        		 |            |                                   |         |                
// |        |                                     		 |            |    <---STEP3 Handler system calls |         |                
// |        |                                     		 |            |                               SET |         |                
// |        |                                     		 |            |                             RESET |         |                
// |        |                                     		 |            |                            UPDATE |         |                
// |        |                                     		 |            |                               PUT |         |                
// |        |                                     		 |            |                            DIALOG |         |                
// |        |                                     		 |            |                              EDIT |         |                
// | Client |                                		     | Controller |                          	 CALL | Handler |                
// |        |                                     		 |            |                             ALERT |         |                
// |        |                                     		 |            |                                   |         |                
// |        |                                     		 |            | Controller event STEP4--->        |         |                
// |        |                                     		 |            |   ONCHANGE                        |         |                
// |        |                                     		 |            |                                   |         |                
// |        |                                     		 |            |    <---STEP5 Handler system calls |         |                
// |        |                                     		 |            |                               ... |         |                
// |        |                                     		 |            |                                   |         |                
// |        |              <---STEP6 Controller commands |            |                                   |         |                
// |        |                                        SET |            |                                   |         |                
// |        |                                     DIALOG |            |                                   |         |                
// |        |                                       EDIT |            |                                   |         |                
// |        |                                       VIEW |            |                                   |         |                
// |        |                                  NEWOBJECT |            |                                   |         |                
// |        |                               DELETEOBJECT |            |                                   |         |                
// |        |                                     		 |            |                                   |         |                
// +--------+                         		             +------------+                                   +---------+                                     
