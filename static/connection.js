import { NODOWNLINKNONSTICKYCHILDS, lg, CutString, MessageBox, NEWOBJECTDATABASE, msgcontrol } from './constant.js';
import { Interface } from './interface.js';
import { DialogBox } from './dialogbox.js';
import { ContextMenu } from './contextmenu.js';
import { Sidebar } from './sidebar.js';

const LOGINDIALOG = { title: { type: 'title', data: 'Login' },
                      username: { type: 'text', head: 'Username', data: 'mau' },
                      password: { type: 'password', head: 'Password', data: 'rrrrrrr' },
                      ok: { type: 'button', data: ' LOGIN ', tyle: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;`, flag: 'a' }
                    };

export class Connection extends Interface
{
 destructor()
 {
  this.socket?.close();
  super.destructor();
 }

 constructor(...args)
 {
  const props = { flags: NODOWNLINKNONSTICKYCHILDS,
                  effect: 'slideright',
                  position: 'CASCADE',
                  control: { closeicon: {}, fullscreenicon: { initevent: '' }, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, default: { releaseevent: 'mouseup', button: 2 } }, 
                };
  const attributes = { class: 'connectionbox',
                       style: 'background-color: #343e54;'
                     };
  super(...args, props, attributes);
  this.Login();
 }

 Login(header)
 {
  // Clear all disconnected-user data
  delete this.username;
  delete this.userid;
  this.currentmsgid = 1;
  this.msgqueue = {};
  // Kill all childs
  for (const id in this.childs) if (id !== '0') this.KillChild(+id);
  // Create login dialog from the template
  const dialog = JSON.parse(JSON.stringify(LOGINDIALOG));
  if (header) dialog.title.data = header;
  const control = { fullscreenicon: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, push: {}, default: {} };
  new DialogBox(dialog, this, { effect: 'rise', position: 'CENTER', overlay: 'MODAL', control: control, callback: this.CallController.bind(this) }, { class: 'dialogbox selectnone' });
 }

 CreateWebSocket(url)
 {
  this.socket = new WebSocket(url);
  this.socket.onopen = () => this.OnOpenSocket();
  this.socket.onclose = () => this.OnCloseSocket();
  this.socket.onerror = () => this.OnCloseSocket();
  this.socket.onmessage = (message) => { this.FromController(JSON.parse(message.data)) };
 }

 OnOpenSocket()
 {
  this.CallController({ type: 'CREATEWEBSOCKET', data: { userid: this.userid, authcode: this.authcode } });
 }

 OnCloseSocket()
 {
  // Todo0 - Server has posted LOGOUT msg due timeout terminating WS with calling this func. So Login() is called twice - once here, another from TIMEOUT msg. Will it cause login-dialog duplicating and how to pass timeout dialog message at login
  this.Login();
 }

 Handler(event)
 {
  switch (event.type)
	    {
	     case 'mouseup':
               let menu = this.username ? [['Help'], ['Logout ' + CutString(this.username)]] : [['Help']];
	          new ContextMenu(menu, this, event);
	          break;
	     case 'CONTEXTMENU':
			switch (event.data[0])	// Switch context item name (event data zero index)
				  {
				   case 'Help':
					   break;
                       default:
                            if (event.data[0].substring(0, 'Logout '.length) === 'Logout ') this.socket.close();
				  }
	          break;
	    }
 }

 CallController(msg)
 {
  msg = this.EventControl(msg);
  switch (msg.type)
	    {
	     case 'CREATEDATABASE': // Context menu event incoming from sidebar
               new DialogBox(JSON.parse(JSON.stringify(NEWOBJECTDATABASE)), this, { overlay: 'MODAL', effect: 'rise', position: 'CENTER', id: msg.id, callback: this.CallController.bind(this) }, { class: 'dialogbox selectnone' });
               return;
	     case 'GETDATABASE': // Context menu event incoming from sidebar
               break;
          case 'DIALOGCALLBACK':
               if (!this.username) // No user loged in, so msg comes from login dialog
                  {
                   LOGINDIALOG.username.data = msg.data.dialog.username.data;
                   msg.type = 'LOGIN';
                   this.Hujax("/", { method: 'POST',
                                     body: JSON.stringify({ type: 'LOGIN', data: { username: msg.data.dialog.username.data, password: msg.data.dialog.password.data } }),
                                     headers: { 'Content-Type': 'application/json; charset=UTF-8' } }); // Pass login dialog user/pass to the controller via POST method below
                   return;
                  }
               if (this.msgqueue[msg.id]) switch (this.msgqueue[msg.id].initmsg.type) // Todo0 - no msg in the queue the dialog links to? Probably - msg has expired, display info for that case
                  {
                   case 'CREATEDATABASE':
                        msg = { type: 'SETDATABASE', data: { dialog: msg.data.dialog } };
                        break;
                   case 'GETDATABASE':
                        msg = { type: 'SETDATABASE', data: { odid: this.msgqueue[msg.id].initmsg.data.odid, dialog: msg.data.dialog } };
                        break;
                  }
               break;
          default:
               return; // Return for unknown msg type
         }

  if (this.socket && this.socket.readyState !== WebSocket.OPEN) return;
  try { this.socket.send(JSON.stringify(msg)); } // + ODid, OVid, oid, eid // No user id and name - this is a server side info
  catch {}
 }

 FromController(msg)
 {
  this.EventControl(msg);
  switch (msg.type)
	    {
	     case 'LOGINACK':
               this.username = msg.data.username;
               this.userid = msg.data.userid;
               this.authcode = msg.data.authcode;
               this.CreateWebSocket(msg.data.protocol + '://' + msg.data.ip + ':' + msg.data.port);
	          break;
	     case 'LOGINERROR':
               this.Login(msg.data);
	          break;
	     case 'CREATEWEBSOCKETACK':
               this.sidebar = new Sidebar(null, this);
	          break;
	     case 'SIDEBARSET':
	     case 'SIDEBARDELETE':
	          this.sidebar.Handler(msg);
	          break;
	     case 'DIALOG':
               if (typeof msg.data === 'string') new DialogBox(...MessageBox(this, msg.data.dialog, msg.data.title));
               if (msg.data && typeof msg.data === 'object') new DialogBox(msg.data, this, { overlay: 'MODAL', effect: 'rise', position: 'CENTER', callback: this.CallController.bind(this), id: msg.id }, { class: 'dialogbox selectnone' });
	          break;
         }
 }

 async Hujax(url, options)
 {
  try   {
         let response = await fetch(url, options);
         response = await response.json();
         this.FromController(response);
        }
  catch (err)
        {
         lg(err);
         setTimeout(this.Login.bind(this), 0, 'No server respond!');
        }
 }
 
// auth= '{ userid:, sessionid:, expire:, sign: }', where sign is a hash (HMAC-SHA256) with a password (wich is stored specifically in server internal memory) of client LOGIN data: ip, fingerprint (user-agent and other specific data), userid and expire.
// auth token may be store in LS (so page reload doesn't call relogin) or in client app memory (page reload calls relogin), auth token is no encrypted, but cannot be faked due to its sign compared on server side
// Should i send keepalive events (last client event generates setTimeout (60*1000) for keepalive event post) from client side to exclude session timeout and 

// +--------+                                                                                  +------------+                                   +---------+                                     
// |        | LOGIN[POST] (data->user/pass) ->       		                                   |            |                                   |         |                
// |        |            <- LOGINACK[POST] (data->ip/proto/authcode)|LOGINERROR[POST]          |            |                                   |         |                
// |        | CREATEWEBSOCKET[WS] (data->userid/authcode) ->                                   |            |                                   |         |                
// |        |              <- CREATEWEBSOCKETACK|LOGINERROR (WS)                               |            |                                   |         |                
// |        |                        		    		                                        |            |                                   |         |                
// | Client | SIDEBARGET[WS] -> 		      		                                        | Controller |                                   | Handler |                
// |        |                                           <- SIDEBARSET[WS] (data->odid/path/ov) |            |                                   |         |                
// |        |                        		                                        	     |            |                                   |         |                
// |        | GETDATABASE[WS] (id/data->odid) ->                                               |            |                                   |         |                
// |        |                                                          <- DIALOG[WS] (id,data) |            |                                   |         |                
// |        | SETDATABASE[WS] (data->odid/dialog) ->                                           |            |                                   |         |                
// |        | <- SIDEBARDELETE[WS] (data->odid)|SIDEBARSET[WS] (data->odid/path/ov)|DIALOG[WS] |            |                                   |         |                
// |        |                        		    		                                        |            |                                   |         |                
// |        |                        		    		                                        |            |                                   |         |                
// |        | CREATEDATABASE[LOCAL] -> SETDATABASE[WS] (data->dialog) ->                       |            |                                   |         |                
// |        |                                <- SIDEBARSET[WS] (data->odid/path/ov)|DIALOG[WS] |            |                                   |         |                
// |        |                        		    		                                        |            |                                   |         |                
// +--------+                                                                                  +------------+                                   +---------+                                     

 // Incoming dialog event with no OD/OV - modal with parent 'Connection', with OD/OV - modal with parent 'View' (with no dialog window overlapping view window). Also dialog callback is binded to next args: 'DialogCallback', qid, data.
 // If dialog is a warning/info release qid event immediately, otherwise at callback function call


 EventMatch(control, event)
 {
  let match = true;
  for (const prop in control) // every queuecontrol element is checked on its props,
      {
       if (!['type', 'user', 'odid', 'ovid', 'oid', 'eid'].includes(prop)) continue;
       match = false;
       if (!(prop in event)) break; // if prop does exist in control, so does in event (! - invert[any match is single char '!'], | - multiple).
       for (const option of control[prop].split('|'))
           if (((option[0] === '!' && option.substring(1) !== event[prop]) || (option[0] !== '!' && option === event[prop])) && (match = true)) break;
       if (!match) break;
      }
  return match;
 }

 // Check incoming event for eventcontrol props (no any restriction applied for default)
 // msgqueue  { [id]: { type:, username:, odid:, ovid:, oid:, eid:, id:, data:, initmsg: }, } 
 // msgcontrol [      { type:, username:, odid:, ovid:, oid:, eid:, callback: <any>, limit: <number>, timeout: <seconds> }, ]
 EventControl(msg)
 {
  if (!('username' in msg) && this.username) mag.username = this.username; // Add user name to current event

  for (const control of msgcontrol) // Go through all controls
      {
       if (!this.EventMatch(control, msg)) continue; // until the match for the current event found
       if ('callback' in control) // Prop 'callback' considers event as an answer for any event before
          {
           if (msg.id && !(msg.id in this.msgqueue)) return {}; // so find this 'any' event in connection event queue
          }
       if ('limit' in control) // Prop 'limit' limits event number in conection event queue, so out-of-limit event are rejected
          {
           let count = 0;
           for (const id in this.msgqueue) if (EventMatch(control, this.msgqueue[id]) && ++count  > +control['limit']) break; // Go through all queue to find current msg matched number <count>
           if (count > +control['limit']) return {}; // If <count> more than limit - reject the msg via returning empty msg object
          }
       if ('expire' in control)
          {
           setTimeout((id) => delete this.msgqueue[id], +control['expire'] * 1000, this.QueueMsgAdd(msg)); // Set the timer for expiring msg
           return msg;
          }
      }
  this.QueueMsgAdd(msg);
  return msg;
 }

 QueueMsgAdd(msg)
 {
  if (msg.id)
     {
      if (msg.id in this.msgqueue) msg.initmsg = this.msgqueue[msg.id]; // New msg id already in a queue, so save this initiated msg in 'initmsg' prop
     }
   else
     {
      msg.id = this.currentmsgid++; // No msg in a queue, so get next free queue id to add this msg as a new one
     }
  this.msgqueue[msg.id] = msg; // Put msg to the queue
  return msg.id; // and return its id
 }
}