import { Interface } from './interface.js';
import { DialogBox } from './dialogbox.js';
import { ContextMenu } from './contextmenu.js';
import { Sidebar } from './sidebar.js';
import * as globals from './globals.js';

const LOGINDIALOG = { username: { type: 'text', head: 'Username', data: 'root' },
                      password: { type: 'password', head: 'Password', data: 'root' },
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
  new DialogBox(dialog, this, Object.assign(JSON.parse(globals.MODALBOXPROPS), { callback: { type: 'LOGIN' }, control: { fullscreenicon: {}, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, push: {}, default: {} } }), typeof this.logintitle === 'string' ? this.logintitle : 'Login', 'LOGIN'); // Create login dialog box with no-close option
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
  console.log(`Connection child new event detected:`, event);
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
					   return { type: 'HELP', source: this, destination: this.parentchild };
                       default:
                            if (event.data[0].substring(0, 'Logout '.length) === 'Logout ') return { type: 'LOGOUT', destination: this };
				  }
	          break;

	     case 'CREATEDATABASE': // Context menu event incoming from sidebar
               new DialogBox(JSON.parse(JSON.stringify(globals.NEWOBJECTDATABASE)), this, Object.assign(JSON.parse(globals.MODALBOXPROPS), { callback: { type: 'SETDATABASE' } }));
               break;

	     case 'INFO':
	     case 'WARNING':
               if (event.data.odid || event.data.ovid) this.EventManager(Object.assign(event, { destination: null }));
                else new DialogBox(event.data?.content, this, JSON.parse(globals.MODALBOXPROPS), event.data?.title ?? 'Warning', undefined, '   OK   ');
	          break;
	     case 'DIALOG':
               const callback = Object.assign({ type: 'CONFIRMDIALOG', odid: event.odid, ovid: event.ovid, oid: event.oid, eid: event.eid }, 'eprop' in event ? { eprop: event.eprop } : {});
               new DialogBox(event.data?.content, this, Object.assign(JSON.parse(globals.MODALBOXPROPS), { callback: callback }), event.data?.title, event.data?.ok, event.data?.cancel, event.data?.apply);
	          break;
	     case 'CONFIRMDIALOG':
               switch (event.source.props.callback?.type)
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
               new DialogBox(event.data.dialog, this, Object.assign(JSON.parse(globals.MODALBOXPROPS), { flag: Interface.MODALBROTHERKILLSME, callback: { type: 'SETDATABASE', odid: event.data.odid } }));
               break;

	     case 'GETVIEW':
               this.WebsocketSend(event);
               return { type: 'SIDEBARVIEWSTATUS', data: { odid: event.data.odid, ovid: event.data.ovid, status: -1 }, destination: null };
	     case 'SETVIEW':
               const view = this.childs[event.data.childid];
               if (!view || view.data.odid !== event.data.odid || view.data.ovid !== event.data.ovid) return { type: 'SIDEBARVIEWSTATUS', data: { odid: event.data.odid, ovid: event.data.ovid, status: undefined, childid: undefined }, destination: null };
               event.destination = view;
               return event;

	     case 'KILL':
               this.Logout();
               break;
	     case 'BRINGTOTOP':
               break;
          default:
               if (globals.CLIENTEVENTS.includes(event.type)) this.WebsocketSend(event);
               //if (globals.CONTROLLEREVENTS.includes(event.type)) return Object
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
         console.log(err);
         setTimeout(this.Login.bind(this), 0, this.logintitle = 'No server respond!');
        }
 }

 // Send msg via WS
 WebsocketSend(msg)
 {
  delete msg.source;
  delete msg.destination;
  if (this.socket && this.socket.readyState !== WebSocket.OPEN) return;
  try { this.socket.send(JSON.stringify(msg)); }
  catch { console.log(`Websocket error sending message "${msg}"`); }
 }
}

// Todo2 - Token concept: auth= '{ userid:, sessionid:, expire:, sign: }', where sign is a hash (HMAC-SHA256) with a password (wich is stored specifically in server internal memory) of client LOGIN data: ip, fingerprint (user-agent and other specific data), userid and expire. Auth token may be store in LS (so page reload doesn't call relogin) or in client app memory (page reload calls relogin), auth token is no encrypted, but cannot be faked due to its sign compared on server side
// Todo0 - Make logs and handlers (task) manager accessable in context menu before menu 'Help'. And controller should send only active handler list instead of their wraped dialog structure, so dialog of itself should be built on a client side code
// Todo0 - Ctrl + Tab switches between childs in a connection child

// All three components (Client, Controller and Handler) interact each other via JSON messages ('{ "type": "<MESSAGENAME>", "data": "<MESSAGEDATA>" }'), see scheme interaction ("MESSAGENAME:PROTOCOL[MESSAGEDATA..]") below.
// Messages from 'Client'/'Handler' components to the 'Controller' are called "client/handler events". Messages from 'Controller' to 'Client'/'Handler' components are called "controller calls".

/* Login process
   +--------+                                                                                            +------------+                                   +---------+                                     
   |        | LOGIN:HTTP[username,password] ->		                                                  |            |                                   |         |                
   |        |                         <- LOGINACK:HTTP[ip,port,protocol,authcode]|LOGINERROR:HTTP[title] |            |                                   |         |                
   |        | CREATEWEBSOCKET:WS[userid,authcode] ->                                                     | Controller |                                   | Handler |                
   |        |                                         <- CREATEWEBSOCKETACK:WS[]|DROPWEBSOCKET:WS[title] |            |                                   |         |                
   | Client | SIDEBARGET:WS[] -> 			                                                            |            |                                   |         |                
   |        |                                                             <- SIDEBARSET:WS[odid,path,ov] |            |                                   |         |                
   +--------+                                                                                            +------------+                                   +---------+                                     
*/

/* Edit/create OD process
   +--------+                                                                                            +------------+                                   +---------+                                     
   |        | CREATEDATABASE:LOCAL[] -> SETDATABASE:WS[dialog] ->                     	     	     |            |                                   |         |                
   |        |                                   <- SIDEBARSET:WS[odid,path,ov]|WARNING:WS[content,title] |            |                                   |         |                
   | Client |                        		    		                                                  |            |                                   |         |                
   |        | GETDATABASE:LOCAL[odid] -> GETDATABASE:WS[odid] ->                                         | Controller |                                   | Handler |                
   |        |                   			                       <- CONFIGUREDATABASE:WS[dialog,odid] |            |                                   |         |                
   |        | SETDATABASE:WS[dialog,odid] ->                     		                              |            |                                   |         |                
   |        |            <- SIDEBARSET:WS[odid,path,ov]|SIDEBARDELETE:WS[odid]|WARNING:WS[content,title] |            |                                   |         |                
   +--------+                                                                                            +------------+                                   +---------+                                     
*/

/* Open OV process (controller auto generated event SETVIEW is for OVs with 'scheduled open' feature enabled)
   +--------+                                                                                            +------------+                                   +---------+                                     
   |        | GETVIEW:LOCAL[ovid,odid,childid] -> GETVIEW:WS[odid,od,ovid,ov,childid[,macros]] ->        |            |                                   |         |                
   |        |                   <- SETVIEW:WS[odid,ovid,childid,(layout,selections,fields|error|dialog)] | Controller |                                   | Handler |                
   | Client |                                					          					|            |                                   |         |                
   |        |                           <- SETVIEW:WS[odid,ovid,(layout,selections,fields|error|dialog)] |            |                                   |         |                
   +--------+                                                                                            +------------+                                   +---------+                                     
*/

/* OV ADDOBJECT|DELETEOBJECT events
   +--------+                                                                                            +------------+                                   +---------+                                     
   |        | ADDOBJECT:LOCAL[odid,ovid,eid1,eid2..] - > ADDOBJECT:WS[odid,ovid,eid1,eid2..] -> 	     |            |                                   |         |                
   | Client |                                											     | Controller |                                   | Handler |                
   |        |                        		    		                                                  |            |                                   |         |                
   |        |                        		    		                                                  |            |                                   |         |                
   +--------+                                                                                            +------------+                                   +---------+                                     
*/

/* OV keyboard|mouse|PASTE|CONFIRMEDIT|CONFIRMDIALOG events. Event data for KEYPRESS - pressed key character, for PASTE|CONFIRMEDIT|CONFIRMDIALOG - event specific content, for other events - modifier keys value
   +--------+                                                                                            +------------+                                   +---------+                                     
   |        | KEYF2:LOCAL[odid,ovid,oid,eid,eprop,data] - > KEYF2:WS[odid,ovid,oid,eid,eprop,data] -> 	|            |                                   |         |                
   | Client |                                      <- WARNING:WS[content,title, odid, ovid] | Controller |                                   | Handler |                
   |        |                        		    		                                                  |            |                                   |         |                
   |        |                        		    		                                                  |            |                                   |         |                
   +--------+                                                                                            +------------+                                   +---------+                                     
*/

/* Controller initiated ONEVENT|ONTIMER events, ONEVENT args: eventname, ovid[empty - current object, otherwise - all ovid objects]; ONTIMER args: cron_line, user[filled automatically], ovid, queue['<0' ms handler delay; '0' onlyonce; '>0' simultaneous handler number]
   +--------+       +------------+                                                                             +---------+                                     
   |        | 	     |            | ONEVENT:LOCAL[odid,ovid,oid,eid,data] - >                                   |         |                
   | Client |       | Controller |                                                                             | Handler |                
   |        |       |            |                                                                             |         |
   |        |       |            |                                                                             |         |                
   +--------+       +------------+                                                                             +---------+                                     
*/

/* Handler EMULATE(ADDOBJECT,DELETEOBJECT,SETVIEW),EDIT,DIALOG,SET|WRITE|PUT|ADJUST,RESET,UPDATE(set if obj change),PUSH|COLLECT(tsdb),UPLOAD,DOWNLOAD,UNLOAD,GALLERY,NULL,COPY(buffer),NEWPAGE(url) events
   +--------+       +------------+                                                                             +---------+                                     
   |        | 	     |            |                                                                             |         |                
   | Client |       | Controller |                                                                             | Handler |                
   |        |       |            |                                                                             |         |
   |        |       |            |                                                                             |         |                
   +--------+       +------------+                                                                             +---------+                                     
*/
