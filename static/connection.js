import { NODOWNLINKNONSTICKYCHILDS } from './constant.js';
import { Interface } from './interface.js';
import { DialogBox } from './dialogbox.js';
import { ContextMenu } from './contextmenu.js';
import { Sidebar } from './sidebar.js';

const SOCKETADDRES = 'ws://127.0.0.1:8002';

export class Connection extends Interface
{
 destructor()
 {
  super.destructor();
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
  this.CreateWebSocket();
 }

 CreateWebSocket()
 {
  this.socket = new WebSocket(SOCKETADDRES);
  this.socket.onopen = () => this.OnOpenSocket();
  this.socket.onclose = () => this.OnCloseSocket();
  this.socket.onerror = () => this.OnCloseSocket();
  this.socket.onmessage = (event) => this.Handler(JSON.parse(event.data));
 }

 OnOpenSocket()
 {
  this.sidebar = new Sidebar(null, this);
 }

 OnCloseSocket()
 {
  for (const child of this.childs) if (child !== this && child.Handler) ProcessChildEvent(child, child.Handler({ type: 'SOCKETCLOSE' }));
 }

 Handler(event)
 {
  switch (event.type)
	    {
	     case 'mouseup':
	          new ContextMenu([['Test Dialog'], ['Help']], this, event);
	          break;
	     case 'CONTEXTMENU':
			switch (event.data[0])	// Switch context item name (event data zero index)
				  {
				   case 'Test Dialog':
                            this.CallController({type: 'Test Dialog'});
					   break;
				  }
	          break;
	     case 'SIDEBARSET':
	          this.sidebar.Handler(event);
	          break;
	     case 'DIALOG':
	          new DialogBox(event.data, this, { effect: 'rise', position: 'CENTER' }, { class: 'dialogbox selectnone' });
	          break;
	    }
 }

 CallController(event)
 {
  try { this.socket.send(JSON.stringify(this.eventqueue[this.eventid++] = { connectionid: this.id, eventid: this.eventid, type: event.type, data: event.data })); }
  catch {}
  //if (this.socket.readyState === 3) this.CreateWebSocket();
 }
}
