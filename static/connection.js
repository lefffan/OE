import { Interface } from './interface.js';
import { DialogBox } from './dialogbox.js';
import { ContextMenu } from './contextmenu.js';
import { Sidebar } from './sidebar.js';
import * as consts from './consts.js';
import * as funcs from './funcs.js';

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

 // Function displays warning dialog for allowed event types
 DisplayWarning(event, parent)
 {
  let title, content;
  if (!event.warning) return;
  typeof event.warning === 'object' ? { title, content } = event.warning : content = event.warning;
  if (content) new DialogBox(content, parent || this, JSON.parse(consts.MODALBOXPROPS), title || 'Warning', undefined, '   OK   ');
 }

 Login()
 {
  this.EventManager({ type: 'KILL', destination: null }); // Kill all connection childs
  const dialog = JSON.parse(JSON.stringify(LOGINDIALOG)); // Create login dialog from the template
  new DialogBox(dialog, this, Object.assign(JSON.parse(consts.MODALBOXPROPS), { callback: { type: 'LOGIN' }, control: { fullscreenicon: {}, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, push: {}, default: {} } }), typeof this.logintitle === 'string' ? this.logintitle : 'Login', 'LOGIN'); // Create login dialog box with no-close option
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
  funcs.Log(event, { EVENTNAME: 'New controller message' }, consts.LOGTOSTDOUT);
  switch (event.type)
	    {
	     case 'KILL':
               this.Logout();
               break;
	     case 'BRINGTOTOP':
               break;
	     case 'LOGOUT':
	          this.Logout();
	          break;
	     case 'LOGINACK':
               if (typeof event.data === 'string')
                  {
                   this.logintitle = event.data;
                   this.Login();
                   break;
                  }
               this.username = event.data.username;
               this.userid = event.data.userid;
               this.authcode = event.data.authcode;
               this.CreateWebSocket(event.data.protocol + '://' + event.data.ip + ':' + event.data.port);
	          break;
	     case 'CREATEWEBSOCKET':
               this.WebsocketSend(event);
	          break;
	     case 'CREATEWEBSOCKETACK':
               if (typeof event.data === 'string')
                  {
                   this.logintitle = event.data;
                   break;
                  }
               new Sidebar(null, this);
               this.WebsocketSend({ type: 'SIDEBARGET' }); // Get OD/OV list
	          break;
	     case 'SIDEBARSET':
	     case 'SIDEBARDELETE':
               this.DisplayWarning(event);
               if (event.data) return { type: event.type, data: event.data, destination: null };
               break;

	     case 'mouseup':
	          new ContextMenu(this.username ? [['Help'], ['Logout ' + funcs.CutString(this.username)]] : [['Help']], this, event);
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
               new DialogBox(JSON.parse(JSON.stringify(consts.NEWOBJECTDATABASE)), this, Object.assign(JSON.parse(consts.MODALBOXPROPS), { callback: { type: 'SETDATABASE', data: {} } }));
               break;
	     case 'GETDATABASE': // Context menu event incoming from sidebar, dispatch it directly to the controller
               this.WebsocketSend(event);
               break;
	     case 'CONFIGUREDATABASE':
               this.DisplayWarning(event);
               if (event.data?.dialog) new DialogBox(event.data.dialog, this, Object.assign(JSON.parse(consts.MODALBOXPROPS), { flag: Interface.MODALBROTHERKILLSME, callback: { type: 'SETDATABASE', data: { odid: event.data.odid } } }));
               break;
	     case 'CONFIRMDIALOG':
               switch (event.source.props.callback?.type)
                      {
                       case 'SETDATABASE':
                            this.WebsocketSend({ type: 'SETDATABASE', data: { dialog: event.source.data, odid: event.source.props.callback?.data.odid } }); // Send new OD dialog data to controller via WS
                            break;
	                  case 'LOGIN':                                                         // Login dialog returned 'LOGIN' event with user/pass
                            LOGINDIALOG.username.data = event.source.data.username.data;     // Keep username in login dialog data to use it as a placeholder for next logins
                            this.HttpSend("/", { method: 'POST',                             // Pass login dialog user/pass to the controller via POST method
                            body: JSON.stringify({ type: 'LOGIN', data: { username: event.source.data.username.data, password: event.source.data.password.data } }),
                            headers: { 'Content-Type': 'application/json; charset=UTF-8' } });
                            break;
                      }
	          break;

	     case 'GETVIEW':
               this.WebsocketSend(event);
               return { type: 'SIDEBARVIEWSTATUS', data: { odid: event.data.odid, ovid: event.data.ovid, status: -1 }, destination: null };
          default:
               if (consts.CLIENTEVENTS.includes(event.type)) return this.WebsocketSend(event); // Dispatch all client (browser) events to the controller
               if (event.type === 'SETVIEW' || consts.CONTROLLEREVENTS.includes(event.type)) // Dispatch OV specific events to the child box with id <childid>
                  {
                   const view = event.destination = this.childs[event.data.childid];
                   if (!view || view.data.odid !== event.data.odid || view.data.ovid !== event.data.ovid) // The child with <childid>, the event is addressed to, doesn't exist, so ignore all events except 'SETVIEW' - set specified OV status to offline
                      return event.type === 'SETVIEW' ? { type: 'SIDEBARVIEWSTATUS', data: { odid: event.data.odid, ovid: event.data.ovid, status: undefined, childid: undefined }, destination: null } : undefined;
                   this.DisplayWarning(event, view); // Otherwise display warning msg if exist. Next contoller events may come with 'warning' property: 'EDIT', 'DIALOG', 'SET', 'WRITE', 'PUT', 'ADJUST', 'RESET', 'UPDATE', 'UPLOAD', 'DOWNLOAD', 'UNLOAD', 'GALLERY', 'NULL', 'COPY', 'NEWPAGE'
                   return event; // and dispatch <event> to the specified via <childid> one
                  }
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
  catch (error)
        {
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
  catch { funcs.Log(`Websocket error sending message '${msg}'`, {}, consts.LOGTOSTDOUT); }
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
   |        |                        <- LOGINACK:HTTP[username,userid,ip,port,protocol,authcode]|[title] |            |                                   |         |                
   |        | CREATEWEBSOCKET:WS[userid,authcode] ->                                                     | Controller |                                   | Handler |                
   |        |                                                           <- CREATEWEBSOCKETACK:WS[|title] |            |                                   |         |                
   | Client | SIDEBARGET:WS[] -> 			                                                            |            |                                   |         |                
   |        |                                                             <- SIDEBARSET:WS[odid,path,ov] |            |                                   |         |                
   +--------+                                                                                            +------------+                                   +---------+                                     
*/

/* Edit/create OD process
   +--------+                                                                                            +------------+                                   +---------+                                     
   |        | CREATEDATABASE:LOCAL[] -> SETDATABASE:WS[dialog] ->                     	     	     |            |                                   |         |                
   |        |                                                             <- SIDEBARSET:WS[odid,path,ov] |            |                                   |         |                
   | Client |                        		    		                                                  |            |                                   |         |                
   |        | GETDATABASE:LOCAL[odid] -> GETDATABASE:WS[odid] ->                                         | Controller |                                   | Handler |                
   |        |                   			                       <- CONFIGUREDATABASE:WS[dialog,odid] |            |                                   |         |                
   |        | SETDATABASE:WS[dialog,odid] ->                     		                              |            |                                   |         |                
   |        |                                      <- SIDEBARSET:WS[odid,path,ov]|SIDEBARDELETE:WS[odid] |            |                                   |         |                
   +--------+                                                                                            +------------+                                   +---------+                                     
*/

/* Open OV process (controller auto generated event SETVIEW is for OVs with 'scheduled open' feature enabled)
   +--------+                                                                                            +------------+                                   +---------+                                     
   |        | GETVIEW:LOCAL[odid,ovid,od,ov,childid[,macros]] -> GETVIEW:WS[ --||-- ] ->                 |            |                                   |         |                
   |        |             <- SETVIEW:WS[odid,ovid,childid,(selections,layout,query,macros|error|dialog)] | Controller |                                   | Handler |                
   | Client |                                					          					|            |                                   |         |                
   |        |                                                                    <- SETVIEW:WS[ --||-- ] |            |                                   |         |                
   +--------+                                                                                            +------------+                                   +---------+                                     
*/

/* OV ADDOBJECT|DELETEOBJECT events
   +--------+                                                                                            +------------+                                   +---------+                                     
   |        | ADDOBJECT:LOCAL[<cellmetadata>,eid1,eid2..] -> ADDOBJECT:WS[ --||-- ] ->                   |            |                                   |         |                
   |        | DELETEOBJECT:LOCAL[<cellmetadata>,oid1,oid2..] -> DELETEOBJECT:WS[ --||-- ] ->             |            |                                   |         |                
   | Client |                                											     | Controller |                                   | Handler |                
   |        |                        		    		                                                  |            |                                   |         |                
   |        |                        		    		                                                  |            |                                   |         |                
   +--------+                                                                                            +------------+                                   +---------+                                     
*/

/* OV keyboard|mouse|PASTE|CONFIRMEDIT|CONFIRMDIALOG events. Event data is <cellmetadata> (odid,ovid[,oid,eid,eprop]) plus 'value' property: for KEYPRESS - pressed key character, for PASTE|CONFIRMEDIT|CONFIRMDIALOG - event specific content, for other events - modifier keys value
   +--------+                                                                                            +------------+                                   +---------+                                     
   |        | KEYF2:LOCAL[<cellmetadata>,value] -> KEYF2:WS[<cellmetadata>,value] ->                     |            |                                   |         |                
   | Client |                                                     <- NULL:WS[content,title,odid,ovid]    | Controller |                                   | Handler |                
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

/* Handler events: EMULATE(ADDOBJECT,DELETEOBJECT,SETVIEW); EDIT; DIALOG; [MUTE]SET|[MUTE]WRITE|[MUTE]PUT|[MUTE]ADJUST; [MUTE]RESET(delete all and set); [MUTE]UPDATE(set if obj change); PUSH|COLLECT(tsdb); UPLOAD; DOWNLOAD; UNLOAD; GALLERY; NULL; COPY(buffer); NEWPAGE(url)
   +--------+       +------------+                                                                             +---------+                                     
   |        | 	     |            |                                                                             |         |                
   | Client |       | Controller |                                                                             | Handler |                
   |        |       |            |                                                                             |         |
   |        |       |            |                                                                             |         |                
   +--------+       +------------+                                                                             +---------+                                     
*/
