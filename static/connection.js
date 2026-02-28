// Todo0: 
// auth= '{ userid:, sessionid:, expire:, sign: }', where sign is a hash (HMAC-SHA256) with a password (wich is stored specifically in server internal memory) of client LOGIN data: ip, fingerprint (user-agent and other specific data), userid and expire.
// auth token may be store in LS (so page reload doesn't call relogin) or in client app memory (page reload calls relogin), auth token is no encrypted, but cannot be faked due to its sign compared on server side
// Should i send keepalive events (last client event generates setTimeout (60*1000) for keepalive event post) from client side to exclude session timeout and 

import { app } from './application.js';
import { Application } from './application.js';
import { Interface } from './interface.js';
import { DialogBox } from './dialogbox.js';
import { ContextMenu } from './contextmenu.js';
import { Sidebar } from './sidebar.js';
import * as globals from './globals.js';

const LOGINDIALOG = { username: { type: 'text', head: 'Username', data: 'root' },
                      password: { type: 'password', head: 'Password', data: '1' },
                    };

export class Connection extends Interface
{
 constructor(...args)
 {
  const props = { animation: 'slideright',
                  position: 'CASCADE',
                  control: { closeicon: {}, fullscreenicon: { initevent: '' }, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, default: { releaseevent: 'mouseup', button: 2 } }, 
                  attributes: { class: 'connectionbox connection' }
                };
  super(...args, props);
  this.Login();
 }

 Login()
 {
  this.EventManager({ type: 'KILL', destination: null }); // Kill all connection childs
  const dialog = JSON.parse(JSON.stringify(LOGINDIALOG)); // Create login dialog from the template
  new DialogBox(dialog, this, Object.assign(JSON.parse(globals.MODALBOXPROPS), { callback: { cmd: 'LOGIN' }, control: { fullscreenicon: {}, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, push: {}, default: {} } }), { type: 'title', data: typeof this.logintitle === 'string' ? this.logintitle : 'Login' }, 'LOGIN'); // Create login dialog box with no-close option
  delete this.logintitle; // Clear all disconnected-user data
  delete this.username; // Clear all disconnected-user data
  delete this.userid; // Clear all disconnected-user data
 }

 CreateWebSocket(url)
 {
  this.socket = new WebSocket(url);
  this.socket.onopen = this.Handler.bind(this, { type: 'CREATEWEBSOCKET', data: { userid: this.userid, authcode: this.authcode } });
  this.socket.onclose = () => this.Login();
  this.socket.onerror = () => this.Login();
  this.socket.onmessage = (message) => { this.EventManager(Object.assign(JSON.parse(message.data), { destination: this })) };
 }

 Handler(event)
 {
  switch (event.type)
	    {
	     case 'LOGOUT':
	          this.Logout();
	          break;
	     case 'LOGINACK':
               this.username = event.data.username;
               this.userid = event.data.userid;
               this.authcode = event.data.authcode;
               this.CreateWebSocket(event.data.protocol + '://' + event.data.ip + ':' + event.data.port);
	          break;
	     case 'LOGINERROR':
               this.logintitle = event.data;
               this.Login();
	          break;
	     case 'CREATEWEBSOCKET':
               this.WebsocketSend(event);
	          break;
	     case 'DROPWEBSOCKET':
               this.logintitle = event.data;
	          break;
	     case 'CREATEWEBSOCKETACK':
               new Sidebar(null, this);
               this.WebsocketSend({ type: 'SIDEBARGET' }); // Get OD/OV list
	          break;
	     case 'SIDEBARSET':
	     case 'SIDEBARDELETE':
	          return { type: event.type, data: event.data, destination: null };

	     case 'mouseup':
	          new ContextMenu(this.username ? [['Help'], ['Logout ' + globals.CutString(this.username)]] : [['Help']], this, event);
               break;
	     case 'CONTEXTMENU':
			switch (event.data[0])	// Switch context item name (event data zero index)
				  {
				   case 'Help':
					   break;
                       default:
                            if (event.data[0].substring(0, 'Logout '.length) === 'Logout ') this.Logout();
				  }
	          break;

	     case 'CREATEDATABASE': // Context menu event incoming from sidebar
               new DialogBox(JSON.parse(JSON.stringify(globals.NEWOBJECTDATABASE)), this, Object.assign(JSON.parse(globals.MODALBOXPROPS), { callback: { cmd: 'SETDATABASE' } }));
               break;

	     case 'INFO':
	     case 'WARNING':
               new DialogBox(event.data?.content, this, JSON.parse(globals.MODALBOXPROPS), event.data?.title ?? 'Warning', undefined, '   OK   ');
	          break;
	     case 'DIALOG':
               new DialogBox(event.data?.content, this, Object.assign(JSON.parse(globals.MODALBOXPROPS), { callback: { cmd: 'CONFIRMDIALOG', odid: '', ovid: '', oid: '', eid: '', eprop: '' } }), event.data?.title, event.data?.ok, event.data?.cancel, event.data?.apply);
	          break;
	     case 'CONFIRMDIALOG':
               switch (event.source.props.callback?.cmd)
                      {
                       case 'SETDATABASE':
                            this.WebsocketSend({ type: 'SETDATABASE', data: { dialog: event.source.data, odid: event.source.props.callback?.odid } }); // Send new OD dialog data to controller via WS
                            break;
	                  case 'LOGIN':                                                         // Login dialog returned 'LOGIN' event with user/pass
                            LOGINDIALOG.username.data = event.source.data.username.data;     // Keep username in login dialog data to use it as a placeholder for next logins
                            this.HttpSend("/", { method: 'POST',                             // Pass login dialog user/pass to the controller via POST method
                            body: JSON.stringify({ type: 'LOGIN', data: { username: event.source.data.username.data, password: event.source.data.password.data } }),
                            headers: { 'Content-Type': 'application/json; charset=UTF-8' } });
                            break;
                       case 'CONFIRMDIALOG':
                            break;
                      }
	          break;

	     case 'GETDATABASE': // Context menu event incoming from sidebar, dispatch it directly to the controller
               this.WebsocketSend(event);
               break;
	     case 'CONFIGUREDATABASE':
               new DialogBox(event.data.dialog, this, Object.assign(JSON.parse(globals.MODALBOXPROPS), { flag: Application.MODALBROTHERKILLSME, callback: { cmd: 'SETDATABASE', odid: event.data.odid } }));
               break;

	     case 'GETVIEW':
               this.WebsocketSend(event);
               break;
	     case 'SETVIEW':
               const view = this.childs[event.data.childid];
               if (!view || view.odid !== event.data.odid || view.ovid !== event.data.ovid) return { type: 'SIDEBARVIEWSTATUS', data: { odid: event.data.odid, ovid: event.data.ovid, status: undefined, childid: undefined }, destination: null };
               event.destination = view;
               return event;

	     case 'KILL':
               this.Logout();
               break;
          default:
               //if (globals.CLIENTEVENTS.indexOf(event.type) > -1) this.WebsocketSend(event);
	    }
 }

 Logout()
 {
  this.socket?.close();
 }

 // Send msg (options.body) via HTTP method (options.method)
 async HttpSend(url, options)
 {
  try   {
         let response = await fetch(url, options);
         response = await response.json();
         this.Handler(response);
        }
  catch (err)
        {
         app.lg(err);
         setTimeout(this.Login.bind(this), 0, this.logintitle = 'No server respond!');
        }
 }

 // Send msg via WS
 WebsocketSend(msg)
 {
  for (const prop in msg) if (prop !== 'type' && prop !== 'data') delete msg[prop]; // Delete all props except type/data
  if (this.socket && this.socket.readyState !== WebSocket.OPEN) return;
  try { this.socket.send(JSON.stringify(msg)); }
  catch {}
 }
}

// Client-server message interaction format: MESSAGENAME[PROTOCOL:SOURCE:MESSAGEDATA,..]

/* Login process
   +--------+                                                                                        +------------+                                   +---------+                                     
   |        | LOGIN[HTTP:Connection:username,password] ->		                                    |            |                                   |         |                
   |        |  <- LOGINACK[HTTP:Controller:ip,port,proto,authcode]|LOGINERROR[HTTP:Controller:title] |            |                                   |         |                
   |        | CREATEWEBSOCKET[WS:Connection:userid,authcode) ->                                      |            |                                   |         |                
   |        |                      <- CREATEWEBSOCKETACK[WS:Controller]|DROPWEBSOCKET[WS:Controller] |            |                                   |         |                
   | Client | SIDEBARGET[WS:Connection] -> 			                                              | Controller |                                   | Handler |                
   |        |                                              <- SIDEBARSET[WS:Controller:odid,path,ov] |            |                                   |         |                
   +--------+                                                                                        +------------+                                   +---------+                                     
*/

/* Edit/create object database process
   +--------+                                                                                        +------------+                                   +---------+                                     
   |        | CREATEDATABASE[LOCAL:Sidebar] -> SETDATABASE[WS:Connection:dialogdata) ->			 |            |                                   |         |                
   |        |             <- SIDEBARSET[WS:Controller:odid,path,ov]|DIALOG[WS:Controller:dialogdata] |            |                                   |         |                
   | Client |                        		    		                                              |            |                                   |         |                
   |        | GETDATABASE[WS:Sidebar|Connection:odid] ->                                             |            |                                   |         |                
   |        |                   			<- CONFIGUREDATABASE[WS:controller:dialog,odid] 	      | Controller |                                   | Handler |                
   |        | SETDATABASE[WS:Connection:dialogdata,odid) ->           			                |            |                                   |         |                
   |        | <- SIDEBARSET[WS:Controller:odid,path,ov]|SIDEBARDELETE[WS:Controller:odid]|DIALOG[WS] |            |                                   |         |                
   +--------+                                                                                        +------------+                                   +---------+                                     
*/

/* Open object view process
   +--------+                                                                                        +------------+                                   +---------+                                     
   |        | GETVIEW[WS:Sidebar|Connection:ovid,odid,childid,newwindow) -> 			           |            |                                   |         |                
   |        |                              			  <- SETVIEW[WS:Connection:odid/ovid/childid) |            |                                   |         |                
   | Client |                                											 | Controller |                                   | Handler |                
   |        |                            				     <- SETVIEW[WS:Connection:odid/ovid) |            |                                   |         |                
   +--------+                                                                                        +------------+                                   +---------+                                     
*/

/* View data interaction
   +--------+                                                                                        +------------+                                   +---------+                                     
   |        | INIT [WS:View:'{"<eid1>":"${DATA}".."<eidN>":"${DATA}"}'] -> 			           |            |                                   |         |                
   |        | DELETE [WS:View:'{"<oid1>":"".."<oidN>":""}'] -> 	          		                |            |                                   |         |                
   |        | CONFIRMEDIT|CONFIRMDIALOG|ONCHANGE [WS:View:'${DATA}'] -> 			                |            |                                   |         |                
   |        | PASTE [WS:View:'${DATA}'] ->                            			                |            |                                   |         |                
   |        | KEYPRESS [WS:View:'${DATA}':'${MODIFIER}'] ->                            			 |            |                                   |         |                
   |        | KeyA|..|KeyZ[WS:View:'${MODIFIER}'] ->                                   			 |            |                                   |         |                
   |        | Key0|..|Key9[WS:View:'${MODIFIER}'] ->                                   			 |            |                                   |         |                
   |        | KeyF1|..|KeyF12[WS:View:'${MODIFIER}'] ->                                 			 |            |                                   |         |                
   |        | KeySpace|KeyInsert|KeyDelete|KeyBracketLeft|KeyBracketRight[WS:View:'${MODIFIER}'] ->  |            |                                   |         |                
   |        | DBLCLICK[WS:View:'${MODIFIER}'] ->                                     			 |            |                                   |         |                
   |        | SCHEDULE[WS:View] ->                                     			                |            |                                   |         |                
   |        | RELOAD[WS:View] ->                                      			                |            |                                   |         |                
   | Client |                                											 | Controller |                                   | Handler |                
   |        |                        		    		                                              |            |                                   |         |                
   |        |                        		    		                                              |            |                                   |         |                
   |        |                        		    		                                              |            |                                   |         |                
   |        |                        		    		                                              |            |                                   |         |                
   |        |                        		    		                                              |            |                                   |         |                
   |        |                        		    		                                              |            |                                   |         |                
   |        |                        		    		                                              |            |                                   |         |                
   |        |                        		    		                                              |            |                                   |         |                
   |        |                        		    		                                              |            |                                   |         |                
   |        |                        		    		                                              |            |                                   |         |                
   +--------+                                                                                        +------------+                                   +---------+                                     
*/
// user permission check, view permission check, non disabled event existing check for the element, selection/layout check, rule check, event existing check