import { NODOWNLINKNONSTICKYCHILDS, lg, CutString, MessageBox, NEWOBJECTDATABASE } from './constant.js';
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
  this.currenteventid = 0;
  this.eventqueue = {};
  this.Login();
 }

 Login(header)
 {
  // Clear all disconnected user data
  this.username = this.userid = '';
  this.eventqueue = {};
  // Kill all childs
  for (const id in this.childs) if (id !== '0') this.KillChild(+id);
  // Create login dialog from the template
  const dialog = JSON.parse(JSON.stringify(LOGINDIALOG));
  if (header) dialog.title.data = header;
  const control = { fullscreenicon: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, push: {}, default: {} };
  new DialogBox(dialog, this, { effect: 'rise', position: 'CENTER', overlay: 'MODAL', control: control, callback: this.CallController.bind(this, { type: 'LoginDialogCallback' }, null) }, { class: 'dialogbox selectnone' });
 }

 CreateWebSocket(url)
 {
  this.socket = new WebSocket(url);
  this.socket.onopen = () => this.OnOpenSocket();
  this.socket.onclose = () => this.OnCloseSocket();
  this.socket.onerror = () => this.OnCloseSocket();
  this.socket.onmessage = (event) => { this.FromController(JSON.parse(event.data)) };
 }

 OnOpenSocket()
 {
  this.CallController({ type: 'LOGIN', userid: this.userid, authcode: this.authcode});
 }

 OnCloseSocket()
 {
  // Todo0 - process next events 'Server has closed connection due to timeout', '... user delete', '...pass change', '...logout all instances'
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

 CallController(event, id, callbackdata, callbackevent)
 {
  lg('Controller is called with next args:', arguments);
  const queueid = id ? id : this.currenteventid++;

  switch (event.type)
	    {
	     case 'New Database': // Context menu event incoming from sidebar
               new DialogBox(JSON.parse(JSON.stringify(NEWOBJECTDATABASE)), this, { overlay: 'MODAL', effect: 'rise', position: 'CENTER', callback: this.CallController.bind(this, { type: 'DatabaseDialogCallback' }, null) }, { class: 'dialogbox selectnone' });
               return;
	     case 'Configure Database': // Context menu event incoming from sidebar
               event = { type: 'GETDATABASE', odid: event.data[1] };
               break;
          case 'DatabaseDialogCallback': // New event from configuring database 
               event = { type: 'SETDATABASE', data: callbackdata };
               if (id) event.odid = this.eventqueue[id].odid;
               break;
          case 'LoginDialogCallback': // New event from login dialog callback with dialog data as a third arg (argument[2]). Pass it to the controller via POST method
               LOGINDIALOG.username.data = callbackdata.username.data;
               this.Hujax("/", { method: 'POST', body: JSON.stringify({ type: 'LOGIN', username: callbackdata.username.data, password: callbackdata.password.data}), headers: { 'Content-Type': 'application/json; charset=UTF-8' } });
               return;
         }

  if (this.socket && this.socket.readyState !== WebSocket.OPEN) return;
  try { this.socket.send(JSON.stringify(this.eventqueue[queueid] = Object.assign(event, { id: queueid }))); } // + ODid, OVid, oid, eid // No user id and name - this is a server side info
  catch {}
 }

 // Check incoming event for queue existing. Return check failed for unexisting event
 CheckEventStatus(event)
 {
  return true;
 }

 FromController(event)
 {
  if (!this.CheckEventStatus(event)) return;
  switch (event.type)
	    {
	     case 'CREATEWEBSOCKET':
               this.username = event.username;
               this.userid = event.userid;
               this.authcode = event.authcode;
               this.CreateWebSocket(event.protocol + '://' + event.ip + ':' + event.port);
	          break;
	     case 'LOGINERROR':
               this.Login(event.data);
	          break;
	     case 'AUTHWEBSOCKET':
               this.sidebar = new Sidebar(null, this);
	          break;
	     case 'SIDEBARSET':
	     case 'SIDEBARDELETE':
	          this.sidebar.Handler(event);
	          break;
	     case 'DIALOG':
               if (typeof event.data === 'string') new DialogBox(...MessageBox(this, event.data, event.title));
                else new DialogBox(event.data, this, { overlay: 'MODAL', effect: 'rise', position: 'CENTER', callback: this.CallController.bind(this, { type: 'DatabaseDialogCallback' }, event.id) }, { class: 'dialogbox selectnone' });
	          break;
         }
  // Todo0 - delete here all event data if needed
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
}

// +--------+                                           +------------+                                   +---------+                                     
// |        |   LOGIN (POST user/pass) ->       		 |            |                                   |         |                
// |        |       <- CREATEWEBSOCKET|LOGINERROR (POST)|            |                                   |         |                
// |        |   LOGIN (WS with uid and authcode) ->     |            |                                   |         |                
// |        |                      <- AUTHWEBSOCKET (WS)|            |                                   |         |                
// | Client |   SIDEBARGET (WS) -> 		    		 | Controller |                                   | Handler |                
// |        |                         <- SIDEBARSET (WS)|            |                                   |         |                
// |        |                        		    		 |            |                                   |         |                
// |        |   CREATEDATABASE (WS) -> 		    		 |            |                                   |         |                
// |        |                 <- SIDEBARSET|WARNING (WS)|            |                                   |         |                
// |        |                        		    		 |            |                                   |         |                
// |        |                        		    		 |            |                                   |         |                
// +--------+                                           +------------+                                   +---------+                                     
