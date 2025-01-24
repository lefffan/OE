// Todo0 - Secure wss https://www.npmjs.com/package/ws#external-https-server
// Todo0 - Study ws on Node https://github.com/websockets/ws?tab=readme-ov-file#how-to-detect-and-close-broken-connections
// Todo - socket rate limit: https://javascript.info/websocket#rate-limiting
// Todo - How to secure web socket connections: https://www.freecodecamp.org/news/how-to-secure-your-websocket-connections-d0be0996c556/

import { WebSocketServer } from 'ws';
import { DatabaseBroker } from './databasebroker.js';
import { controller, lg } from './main.js';

const wss = new WebSocketServer({ port: 8002 });
wss.on('connection', WSNewConnection);
 
function WSMessageProcess(msg)
{
 // msg - incoming message from the client side
 // this - ws connection object that is passed first at websocket init and stored in <clients> map object. To send data back to the client side use this.send('...'),
 msg = JSON.parse(msg);
 //lg(msg)
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
              new DatabaseBroker().ShowTables().Then(controller.EditDatabase.bind(controller, msg));
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
                  delete controller.clientauthcodes[msg.authcode];
                  controller.clients.get(this).auth = true;
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
 controller.clients.set(client, { wsclient: client });
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

 AddClinetAuthCode(string)
 {
  this.clientauthcodes[string] = {};
  // Todo0 - do Settimeout to remove expired codes
  return string;
 }

 EditDatabase(event, query, err, res)
 {
  if (DatabaseBroker.CatchError(err, query)) return;
  let odid = 0;
  for (const row of res.rows)
      {
       let pos = row.tablename.indexOf('_');
       if (pos === -1) continue;
       pos = +(row.tablename.substring(pos + 1));
       if (pos > odid) odid = pos;
      }
  odid++;
  new DatabaseBroker('head_' + odid).Method('CREATE').Then();
  new DatabaseBroker('uniq_' + odid).Method('CREATE').Then();
  new DatabaseBroker('data_' + odid).Method('CREATE').Then();
  // Parse if it is a new od or not
  // If it is a new od - Pasre for correct new OD, save it to head_odid table with user, version=0, timestamp, ODJSON. And send SIDEBARSET to all WSS users with new OD view list (this.send(JSON.stringify({ type: 'DIALOG', data: testdata }));).
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
