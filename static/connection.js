const SOCKETADDR = 'ws://127.0.0.1:8002';

class Connection extends Interface
{
 destructor()
 {
  super.destructor();
 }

 constructor(...args)
 {
  super(...args);
  this.dragableElements.push(this.elementDOM);
  this.dblclickableElements.push(this.elementDOM);
  this.resizingElement = this.elementDOM;
  this.eventid = 0;
  this.eventqueue = {};
  this.CreateWebSocket();
 }

 CreateWebSocket()
 {
  this.socket = new WebSocket(SOCKETADDR);
  this.socket.onopen = () => this.OnOpenSocket();
  this.socket.onclose = () => this.OnCloseSocket();
  this.socket.onerror = () => this.OnCloseSocket();
  this.socket.onmessage = (event) => this.Handler(JSON.parse(event.data));
 }

 OnOpenSocket()
 {
  this.sidebar = new SideBar(undefined, this);
 }

 OnCloseSocket()
 {
  lg('Socket is closed');
  for (const i = 1; i < this.childs.length - 1; i ++) this.childs[i].Handler({ type: 'SOCKETCLOSE' });
 }

 Handler(event)
 {
  switch (event.type)
	 {
	  case 'mouseup':
	       if (event.which === 3) new ContextMenu([['Test Dialog'], ['Help']], this, event);
	       break;
	  case 'CONTEXTMENU':
	       this.CallController({type: 'Test Dialog'});
	       break;
	  case 'SIDEBARSET':
	       this.sidebar.Handler(event);
	       break;
	  case 'DIALOG':
	       new DialogBox(event.data, this, {flags: CMCLOSE | CMFULLSCREEN | CLOSEESC, effect: 'rise', position: 'CENTER'}, {class: 'dialogbox selectnone'});
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
