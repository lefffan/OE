// Todo0: 
// auth= '{ userid:, sessionid:, expire:, sign: }', where sign is a hash (HMAC-SHA256) with a password (wich is stored specifically in server internal memory) of client LOGIN data: ip, fingerprint (user-agent and other specific data), userid and expire.
// auth token may be store in LS (so page reload doesn't call relogin) or in client app memory (page reload calls relogin), auth token is no encrypted, but cannot be faked due to its sign compared on server side
// Should i send keepalive events (last client event generates setTimeout (60*1000) for keepalive event post) from client side to exclude session timeout and 

import { NODOWNLINKNONSTICKYCHILDS, lg, CutString, MessageBox, NEWOBJECTDATABASE } from './constant.js';
import { Interface } from './interface.js';
import { DialogBox } from './dialogbox.js';
import { ContextMenu } from './contextmenu.js';
import { Sidebar } from './sidebar.js';
import { View } from './view.js';

const DIALOGTIMEOUTERROR = 'Dialog timeout, please try it again';
const LOGINDIALOG = { title: { type: 'title', data: 'Login' },
                      username: { type: 'text', head: 'Username', data: 'root' },
                      password: { type: 'password', head: 'Password', data: '1' },
                      ok: { type: 'button', data: ' LOGIN ', tyle: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;`, flag: 'a' }
                    };

export class Connection extends Interface
{
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

 ReleaseViewFromSidebar(id)
 {
  const view = this.childs[id];
  if (!view.odid) return;
  delete this.sidebar.od[view.odid]['ov'][view.ovid].childid;
  delete this.sidebar.od[view.odid]['ov'][view.ovid].status;
 }

 KillChild(id)
 {
  this.ReleaseViewFromSidebar(id);
  super.KillChild(id);
 }   

 Handler(event)
 {
  switch (event.type)
	    {
	     case 'LOGOUT':
	          this.Logout();
	          break;
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
                            if (event.data[0].substring(0, 'Logout '.length) === 'Logout ') this.Logout();
				  }
	          break;
	     case 'CREATEDATABASE': // Context menu event incoming from sidebar
               new DialogBox(JSON.parse(JSON.stringify(NEWOBJECTDATABASE)), this, { overlay: 'MODAL', effect: 'rise', position: 'CENTER', id: msg.id, callback: this.CallController.bind(this) }, { class: 'dialogbox selectnone' });
               break;
          case 'SIDEBARGET':
	     case 'GETDATABASE': // Context menu event incoming from sidebar
               this.CallController(event);
               break;
	     case 'GETVIEW':
               // Single OV click: OV is already open ? set OV active or refresh if already active : open in a current active view or in a new view if no any view exist
               // Context menu 'open in a new view' opens OV in a new view anyway, action is grey/absent for already opened OV. Do not forget to limit max open views
               // OV click: OV status (-2...100), last active window, force new window (boolean, automatically set to true in case of no last active window)
               const currentviewid = this.GetLastActiveViewId();
               const view = this.sidebar.od[event.data.odid]['ov'][event.data.ovid];
               if (view.status === undefined || view.status === -2) // Negative status -2 (or undefined) means OV is not opened
                  {
                   if (!event.data.newwindow && currentviewid) event.data.childid = currentviewid; // No context menu 'open in a new window' clicked and any view is opened? Fix child id to open new view in
                   this.ChangeActive(event.data.childid);
                   [view.footnote, view.status] = [0, -1];
                  }
                else
                  {
                   this.ChangeActive(view.childid); // Bring it to top already pending/opened view
                   if (view.status === -1) return; // Negative status -1 means OV is server pending, so do nothing. Todo0 - how to cancel server pending?
                   if (this.childs[currentviewid].odid !== event.data.odid || this.childs[currentviewid].ovid !== event.data.ovid) return; // Status is 0 or more (opened and loading its data or has already loaded). Current active view doesn't match clicked view? Return with only bringing to top (see above) the OV child box
                   [view.footnote, view.status, event.data.childid] = [0, -1, currentviewid]; // Current active view is the view that was clicked via sidebar? Force refresh!
                  }
               this.CallController(event);
               break;
	     case 'KILL':
               this.socket?.close();
               break;
	    }
 }

 Logout()
 {
  this.socket.close();
 }

 GetLastActiveViewId()
 {
  for (let i = this.aindexes.length - 1; i > 0; i--)
      if (this.childs[this.aindexes[i]].odid) return this.aindexes[i];
 }

 CallController(msg)
 {
  msg = this.EventControl(msg);
  switch (msg.type)
	    {
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

  //lg('Sending msg to websocket: ', msg);
  if (this.socket && this.socket.readyState !== WebSocket.OPEN) return;
  try { this.socket.send(JSON.stringify(msg)); }
  catch {}
 }

 FromController(msg)
 {
  msg = this.EventControl(msg);
  //lg('Receving msg from websocket: ', msg);
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
               this.CallController({ type: 'SIDEBARGET' }); // Get database/view list
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
	     case 'SETVIEW':
               if (msg.data.childid) this.ReleaseViewFromSidebar(msg.data.childid);
                else msg.data.childid = new View(null, this, {}).id;
               this.childs[msg.data.childid].Handler(msg);
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
}
