import { NODOWNLINKNONSTICKYCHILDS, lg, CutString, MessageBox, NEWOBJECTDATABASE, msgcontrol } from './constant.js';
import { Interface } from './interface.js';
import { DialogBox } from './dialogbox.js';
import { ContextMenu } from './contextmenu.js';
import { Sidebar } from './sidebar.js';

const DIALOGTIMEOUTERROR = 'Dialog timeout, please try it again';
const LOGINDIALOG = { title: { type: 'title', data: 'Login' },
                      username: { type: 'text', head: 'Username', data: 'root' },
                      password: { type: 'password', head: 'Password', data: '1' },
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

 Login(logintitle)
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
  if (logintitle) dialog.title.data = logintitle;
  if (this.logintitle) dialog.title.data = this.logintitle;
  delete this.logintitle;
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
          case 'SIDEBARGET':
          case 'CREATEWEBSOCKET':
	     case 'GETDATABASE': // Context menu event incoming from sidebar
               break;
          case 'DIALOGCALLBACK':
               if (!msg.data.dialog) return; // Dialog is cancelled
               if (!this.username) // No user loged in, so msg comes from login dialog
                  {
                   LOGINDIALOG.username.data = msg.data.dialog.username.data;
                   this.Hujax("/", { method: 'POST',
                                     body: JSON.stringify({ type: 'LOGIN', data: { username: msg.data.dialog.username.data, password: msg.data.dialog.password.data } }),
                                     headers: { 'Content-Type': 'application/json; charset=UTF-8' } }); // Pass login dialog user/pass to the controller via POST method below
                   return;
                  }
               switch (this.msgqueue[msg.id]?.[0]?.type)
                      {
                       case 'CREATEDATABASE':
                            msg = { type: 'SETDATABASE', data: { dialog: msg.data.dialog } };
                            break;
                       case 'GETDATABASE':
                            msg = { type: 'SETDATABASE', data: { odid: this.msgqueue[msg.id][0].data.odid, dialog: msg.data.dialog } };
                            break;
                       default:
                            new DialogBox(...MessageBox(this, DIALOGTIMEOUTERROR, 'Error')); // Dialog data is apliable, but no initiated msg - display an error. This is a code error, so check a source code first - initiated msg absence is an expire case that is handled at Queue control functionality
                            return;
                      }
               break;
          default:
               return; // Return for unknown msg type
         }

  lg('Sending msg to websocket: ', msg);
  if (this.socket && this.socket.readyState !== WebSocket.OPEN) return;
  try { this.socket.send(JSON.stringify(msg)); }
  catch {}
 }

 FromController(msg)
 {
  msg = this.EventControl(msg);
  lg('Receving msg from websocket: ', msg);
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
	     case 'DROPWEBSOCKET':
               this.logintitle = msg.data;
	          break;
	     case 'CREATEWEBSOCKETACK':
               this.sidebar = new Sidebar(null, this);
	          break;
	     case 'SIDEBARSET':
	     case 'SIDEBARDELETE':
	          this.sidebar.Handler(msg);
	          break;
	     case 'DIALOG':
               if (typeof msg.data?.dialog === 'string') new DialogBox(...MessageBox(this, msg.data.dialog, msg.data.title));
               if (typeof msg.data?.dialog === 'string') delete this.msgqueue[msg.id];
               if (msg.data?.dialog && typeof msg.data.dialog === 'object') new DialogBox(msg.data.dialog, this, { overlay: 'MODAL', effect: 'rise', position: 'CENTER', callback: this.CallController.bind(this), id: msg.id }, { class: 'dialogbox selectnone' });
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

// +--------+                                                                                       +------------+                                   +---------+                                     
// |        | LOGIN[POST] (data->username/password) ->		                                        |            |                                   |         |                
// |        |            <- LOGINACK[POST] (data->ip/proto/authcode)|LOGINERROR[POST]               |            |                                   |         |                
// |        | CREATEWEBSOCKET[WS] (data->userid/authcode) ->                                        |            |                                   |         |                
// |        |              <- CREATEWEBSOCKETACK|DROPWEBSOCKET (WS)                                 |            |                                   |         |                
// |        |                        		    		                                             |            |                                   |         |                
// | Client | SIDEBARGET[WS] -> 		      		                                             | Controller |                                   | Handler |                
// |        |                                           <- SIDEBARSET[WS] (data->odid/path/ov)      |            |                                   |         |                
// |        |                        		                                        	          |            |                                   |         |                
// |        | GETDATABASE[WS] (id/data->odid) ->                                                    |            |                                   |         |                
// |        |                                                          <- DIALOG[WS] (id,data)      |            |                                   |         |                
// |        | DIALOGCALLBACK[LOCAL] -> SETDATABASE[WS] (data->odid/dialog) ->                       |            |                                   |         |                
// |        | <- SIDEBARDELETE[WS] (data->odid)|SIDEBARSET[WS] (data->odid/path/ov)|DIALOG[WS]      |            |                                   |         |                
// |        |                        		    		                                             |            |                                   |         |                
// |        |                        		    		                                             |            |                                   |         |                
// |        | CREATEDATABASE[LOCAL] -> DIALOGCALLBACK[LOCAL] -> SETDATABASE[WS] (data->dialog) ->   |            |                                   |         |                
// |        |                                <- SIDEBARSET[WS] (data->odid/path/ov)|DIALOG[WS]      |            |                                   |         |                
// |        |                        		    		                                             |            |                                   |         |                
// +--------+                                                                                       +------------+                                   +---------+                                     

 EventMatch(control, msg)
 {
  let match = true;
  for (const prop in control) // every queuecontrol element is checked on its props,
      {
       if (!['type', 'username', 'odid', 'ovid', 'oid', 'eid', 'id'].includes(prop)) continue; // No props to compare? Continue
       match = false; // Falsy match result for default
       if (!(prop in msg)) break; // if control prop does not exist in the msg, so msg doesn't match
       for (const option of control[prop].split('|')) // Control prop does exist in the msg, so compare it. Char '!' inverts the result, so for any match use a single char '!'; char '|' is logical OR multiple compare
           if (((option[0] === '!' && option.substring(1) !== msg[prop]) || (option[0] !== '!' && option === msg[prop])) && (match = true)) break;
       if (!match) break;
      }
  return match;
 }

 // Check incoming event for eventcontrol props (no any restriction applied for default)
 // Note that DIALOG event with no OD/OV defined - modal with 'Connection' as a parent child, with OD/OV - modal with parent 'View' (with no dialog window overlapping view window)
 // msgqueue  { [id]: [ { type:, username:, odid:, ovid:, oid:, eid:, id:, data: }, ...], } 
 // msgcontrol [        { type:, username:, odid:, ovid:, oid:, eid:, id:, limit: <number>, expire: <seconds>, limitreport:, expirereport: } ]
 EventControl(msg)
 {
  if (!('username' in msg) && this.username) msg.username = this.username; // Add user name to current event

  for (const control of msgcontrol) // Go through all controls
      {
       if (!this.EventMatch(control, msg)) continue; // until the match for the current event found
       if ('limit' in control) // Prop 'limit' limits event number in conection event queue, so out-of-limit event are rejected
          {
           let [start, end] = control.limit.split('-');
           start = start === '' ? 0 : +start;
           end = end === '' ? -1 : +end;
           let count = 0;
           for (const id in this.msgqueue) // Go through all queue to find current msg matched control limit
               {
                for (const message of this.msgqueue[id])
                    if (this.EventMatch(control, message) && ++count) break; // Todo0 - for odid/ovid/oid/eid comparing: control value '!' means any, control value '' means compare odid/ovid/oid/eid prop not from control but from from incoming msg
                if ((count >= start && end === -1) || (count > end && end !== -1)) break;
               }
           if ((count < start) || (count > end && end !== -1))
              {
               if (control.limitreport) new DialogBox(...MessageBox(this, control.limitreport, 'Warning')); // Todo0 - set parent view box for views initiated msgs
               return {}; // msg count is out of range, so reject it via returning empty msg object
              }
          }
       this.QueueMsgAdd(msg);
       if ('expire' in control) setTimeout(this.QueueMsgDelete.bind(this), +control['expire'] * 1000, msg.id, control.expirereport); // Set the timer for expiring msg and display error at expire not forgetting to set parent view box for views initiated msgs
       return msg;
      }
  this.QueueMsgAdd(msg);
  return msg;
 }

 QueueMsgAdd(msg)
 {
  if (!('id' in msg)) msg.id = this.currentmsgid++;                        // Msg doesn't have queuue id, so get next free queue id to add this msg as a new one
  if (!Array.isArray(this.msgqueue[msg.id])) this.msgqueue[msg.id] = [];   // No msg in a queue, so create initial empty array for specified queue id
  this.msgqueue[msg.id].push(msg);                                         // Add msg to the queue
 }

 QueueMsgDelete(id, report)
 {
  if (!this.msgqueue[id]) return;
  delete this.msgqueue[id];
  if (report) new DialogBox(...MessageBox(this, report, 'Warning'));
 }
}