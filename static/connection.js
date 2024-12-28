import { NODOWNLINKNONSTICKYCHILDS, lg } from './constant.js';
import { Interface } from './interface.js';
import { DialogBox } from './dialogbox.js';
import { ContextMenu } from './contextmenu.js';
import { Sidebar } from './sidebar.js';

const LOGINDIALOG = { title: { type: 'title', data: 'Login' },
                      username: { type: 'text', head: 'Username', data: '' },
                      password: { type: 'password', head: 'Password', data: '' },
                      _ok: { type: 'button', data: ' LOGIN ', head: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;` }
                    };

export class Connection extends Interface
{
 destructor()
 {
  super.destructor();
  // Todo - close web socket
 }

 constructor(...args)
 {
  const props = { flags: NODOWNLINKNONSTICKYCHILDS,
                  effect: 'slideright',
                  position: 'CASCADE',
                  control: { closeicon: {}, fullscreenicon: { initevent: '' }, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, default: { releaseevent: 'mouseup', button: 2 } }, 
                };
  const attributes = { class: 'defaultbox',
                       style: 'background-color: #343e54;'
                     };
  super(...args, props, attributes);
  this.eventid = 0;
  this.eventqueue = {};
  this.Login();
 }

 Login(header)
 {
  const dialog = JSON.parse(JSON.stringify(LOGINDIALOG));
  if (header) dialog.title.data = header;
  new DialogBox(dialog, this, { effect: 'rise', position: 'CENTER', overlay: 'MODAL' }, { class: 'dialogbox selectnone' }, this.LoginCallback.bind(this));
 }

 LoginCallback(dialogdata)
 {
  this.Hujax("/", { method: 'POST', body: JSON.stringify({ type: 'LOGIN', username: dialogdata.username.data, password: dialogdata.password.data}), headers: { 'Content-Type': 'application/json; charset=UTF-8' } }); 
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
  // Todo0 - I think there is no need to pass 'SOCKETCLOSE': for (const child of this.childs) if (child !== this && child.Handler) ProcessChildEvent(child, child.Handler({ type: 'SOCKETCLOSE' }));
  // Todo0 - Kill all childs here
  // Todo0 - Process all events (may be POST events waiting big file or media to transfer), cancel them and clear all queue via this.eventqueue = {};
  // Todo0 - process next events 'Server has closed connection due to timeout', '... user delete', '...pass change', '...logout all instances'
  this.Login();
 }

 Handler(event)
 {
  switch (event.type)
	    {
	     case 'mouseup':
	          new ContextMenu([['Logout'], ['Help']], this, event);
	          break;
	     case 'CONTEXTMENU':
			switch (event.data[0])	// Switch context item name (event data zero index)
				  {
				   case '':
					   break;
				  }
	          break;
	     case 'DIALOG':
	          new DialogBox(event.data, this, { effect: 'rise', position: 'CENTER' }, { class: 'dialogbox selectnone' });
	          break;
	    }
 }

 CallController(event)
 {
  lg('Controller is called');
  if (this.socket.readyState !== WebSocket.OPEN) return;
  const template = { connectionid: this.id, eventid: this.eventid }; // + ODid, OVid, oid, eid
  try { this.socket.send(JSON.stringify(this.eventqueue[this.eventid++] = Object.assign(event, template))); }
  catch {}
 }

 FromController(event)
 {
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
	     case 'SIDEBARREFRESH':
	          this.sidebar.Handler(event);
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
        }
 }
}



// +--------+                                           +------------+                                   +---------+                                     
// |        |   LOGIN (POST) ->                  		 |            |                                   |         |                
// |        |       <- CREATEWEBSOCKET|LOGINERROR (POST)|            |                                   |         |                
// |        |   LOGIN (WS) ->          		    		 |            |                                   |         |                
// |        |                      <- AUTHWEBSOCKET (WS)|            |                                   |         |                
// | Client |   SIDEBARREFRESH (WS) -> 		    		 | Controller |                                   | Handler |                
// |        |                     <- SIDEBARREFRESH (WS)|            |                                   |         |                
// |        |                        		    		 |            |                                   |         |                
// |        |                        		    		 |            |                                   |         |                
// |        |                        		    		 |            |                                   |         |                
// +--------+                                           +------------+                                   +---------+                                     
