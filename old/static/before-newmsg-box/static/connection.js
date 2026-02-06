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
import * as globalnames from './globalnames.js';

const LOGINDIALOG = { title: { type: 'title', data: 'Login' },
                      username: { type: 'text', head: 'Username', data: 'root' },
                      password: { type: 'password', head: 'Password', data: '1' },
                      LOGIN: { type: 'button', data: ' LOGIN ', tyle: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;`, flag: 'a' }
                    };

export class Connection extends Interface
{
 static name = 'Connection box';
 static style = {
			  ".connection": { "background-color": "#343e54;" },
 			 }

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
  // Clear all disconnected-user data
  delete this.username;
  delete this.userid;
  // Kill all connection childs
  this.EventManager({ type: 'KILL', destination: null });
  // Create login dialog from the template
  const dialog = JSON.parse(JSON.stringify(LOGINDIALOG));
  if (this.logintitle && (dialog.title.data = this.logintitle)) delete this.logintitle;
  const control = { fullscreenicon: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, push: {}, default: {} };
  new DialogBox(dialog, this, { animation: 'rise', position: 'CENTER', overlay: 'MODAL', control: control, attributes: { class: 'dialogbox selectnone' } }); // Todo0 - create a flag that kills all brothers, so ligin dialog appearance kills all connection childs
 }

 CreateWebSocket(url)
 {
  this.socket = new WebSocket(url);
  this.socket.onopen = this.Handler.bind(this, { type: 'CREATEWEBSOCKET', data: { userid: this.userid, authcode: this.authcode } });
  this.socket.onclose = () => this.Login();
  this.socket.onerror = () => this.Login();
  //this.socket.onmessage = (message) => { this.Handler(JSON.parse(message.data)) };
  this.socket.onmessage = (message) => { this.EventManager(Object.assign(JSON.parse(message.data), { destination: this })) };
 }

 Handler(event)
 {
  switch (event.type)
	    {
	     case 'LOGIN':                                                         // Login dialog returned 'LOGIN' event with user/pass
               LOGINDIALOG.username.data = event.source.data.username.data;     // Keep username in login dialog data to use it as a placeholder for next logins
               this.HttpSend("/", { method: 'POST',                             // Pass login dialog user/pass to the controller via POST method
                                    body: JSON.stringify({ type: 'LOGIN', data: { username: event.source.data.username.data, password: event.source.data.password.data } }),
                                    headers: { 'Content-Type': 'application/json; charset=UTF-8' } });
               break;
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
	          new ContextMenu(this.username ? [['Help'], ['Logout ' + Application.CutString(this.username)]] : [['Help']], this, event);
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
               new DialogBox(JSON.parse(JSON.stringify(globalnames.NEWOBJECTDATABASE)), this, { overlay: 'MODAL', animation: 'rise', position: 'CENTER', attributes: { class: 'dialogbox selectnone' } });
               break;
	     case 'SETDATABASE': 
               this.WebsocketSend({ type: 'SETDATABASE', data: { dialog: event.source.data, odid: event.source.props.id } }); // Send new OD dialog data to controller via WS
               break;
	     case 'DIALOG':
               app.MessageBox(this, event.data?.content, event.data?.title);
	          break;

	     case 'GETDATABASE': // Context menu event incoming from sidebar, dispatch it directly to the controller
               this.WebsocketSend(event);
               break;
	     case 'CONFIGUREDATABASE':
               new DialogBox(event.data.dialog, this, { flag: Application.MODALBROTHERKILLSME, overlay: 'MODAL', animation: 'rise', position: 'CENTER', id: event.data.odid, attributes: { class: 'dialogbox selectnone' } });
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