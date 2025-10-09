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
                  animation: 'slideright',
                  position: 'CASCADE',
                  control: { closeicon: {}, fullscreenicon: { initevent: '' }, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, default: { releaseevent: 'mouseup', button: 2 } }, 
                };
  const attributes = { class: 'connectionbox',
                       style: 'background-color: #343e54;'
                     };
  super(...args, props, attributes);
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
  new DialogBox(dialog, this, { animation: 'rise', position: 'CENTER', overlay: 'MODAL', control: control, event: { type: 'LOGIN', destination: this } }, { class: 'dialogbox selectnone' });
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
     lg(event);
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
	          this.EventManager({ type: 'SIDEBARSET', data: event.data, destination: null }); // Call EventManager() to dispatch event 'SIDEBARSET' to all this 'Connection' childs, so sidebar child will accept the event
	          break;

	     case 'mouseup':
	          new ContextMenu(this.username ? [['Help'], ['Logout ' + CutString(this.username)]] : [['Help']], this, event);
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
               new DialogBox(JSON.parse(JSON.stringify(NEWOBJECTDATABASE)), this, { overlay: 'MODAL', animation: 'rise', position: 'CENTER', event: { type: 'SETDATABASE', destination: this } }, { class: 'dialogbox selectnone' });
               break;
	     case 'SETDATABASE': 
               this.WebsocketSend({ type: 'SETDATABASE', data: { dialog: event.source.data, odid: event.data } }); // Send new OD dialog data to controller via WS
               break;
	     case 'DIALOG':
               if (typeof event.data?.dialog === 'string') new DialogBox(...MessageBox(this, event.data.dialog, event.data.title));
	          break;

	     case 'GETDATABASE': // Context menu event incoming from sidebar, dispatch it directly to the controller
               this.WebsocketSend(event);
               break;
	     case 'CONFIGUREDATABASE': // Todo0 - release check for existing dialog while 'configdatabase' dialog is got from controller. Or leave connection multiple MODAL dialogs? Old version: new DialogBox(...MessageBox(this, DIALOGTIMEOUTERROR, 'Error')); // Dialog data is apliable, but no initiated msg - display an error. This is a code error, so check a source code first - initiated msg absence is an expire case that is handled at Queue control functionality
               new DialogBox(event.data.dialog, this, { overlay: 'MODAL', animation: 'rise', position: 'CENTER', event: { type: 'SETDATABASE', data: event.data.odid, destination: this } }, { class: 'dialogbox selectnone' });
               break;

	     case 'GETVIEW':
               // Single OV click: OV is already open ? set OV active or refresh if already active : open in a current active view or in a new view if no any view exist
               // Context menu 'open in a new view' opens OV in a new view anyway, action is grey/absent for already opened OV. Do not forget to limit max open views
               // OV click: OV status (-2...100), last active window, force new window (boolean, automatically set to true in case of no last active window)
               const lastactiveviewchildid = this.GetLastActiveViewChildId(); // Get last active child with OV opened
               if (event.data.status === undefined || event.data.status === -2) // Negative status -2 (or undefined) means OV is not opened
                  {
                   if (!event.data.newwindow && lastactiveviewchildid) this.ChangeActive(event.data.childid = lastactiveviewchildid); // No context menu 'open in a new window' clicked and any view is opened? Fix child id to open new OV in current view child and activate (bring to top) this child
                   this.WebsocketSend(event); // Get requested OV from controller
                   return { type: 'SIDEBARVIEWSTATUS', data: { odid: event.data.odid, ovid: event.data.ovid, footnote: 0, status: -1 }, destination: null }; // Set requested OV footnote to zero (absent footnote actually) and status to -1 (OV server pending)
                  }
               this.ChangeActive(event.data.childid); // Bring it to top already pending/opened view
               if (event.data.status === -1) return; // Negative status -1 means OV is server pending, so do nothing. Todo0 - how to cancel server pending?
               if (this.childs[lastactiveviewchildid].odid !== event.data.odid || this.childs[lastactiveviewchildid].ovid !== event.data.ovid) return; // Status is 0 or more (opened and loading its data or has already loaded). Current active view doesn't match clicked view? Return with only bringing to top (see above) the OV child box
               event.data.childid = lastactiveviewchildid;
               this.WebsocketSend(event); // Current active view is the view that was clicked via sidebar? Force refresh!
               return { type: 'SIDEBARVIEWSTATUS', data: { odid: event.data.odid, ovid: event.data.ovid, footnote: 0, status: -1 }, destination: null }; // Set requested OV footnote to zero (absent footnote actually) and status to -1 (OV server pending)
	     case 'SETVIEW':
               const view = event.data.childid ? this.childs[event.data.childid] : new View(null, this);
               if (!view) return;
               event.destination = view;
               return [ event, { type: 'SIDEBARVIEWSTATUS', data: { odid: event.data.odid, ovid: event.data.ovid, childid: view.id }, destination: null } ]; // Set requested OV footnote to zero (absent footnote actually) and status to -1 (OV server pending)

	     case 'KILL':
               this.Logout();
               break;
	    }
 }

 Logout()
 {
  this.socket?.close();
 }

 GetLastActiveViewChildId()
 {
  for (let i = this.aindexes.length - 1; i > 0; i--)
      if (this.childs[this.aindexes[i]].odid) return this.aindexes[i];
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
         lg(err);
         setTimeout(this.Login.bind(this), 0, 'No server respond!');
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
