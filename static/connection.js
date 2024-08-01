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
  this.resizingElement = this.elementDOM;
  this.eventid = 0;
  this.eventqueue = {};
  this.CreateWebSocket();
 }

 CreateWebSocket()
 {
  this.socket = new WebSocket(SOCKETADDR);
  this.socket.onmessage = (event) => this.Handler(JSON.parse(event.data));
  this.socket.onopen = () => this.CallController1();
  this.socket.onclose = () => this.OnCloseSocket();
  this.socket.onerror = () => this.OnCloseSocket();
 }

 OnCloseSocket()
 {
  lg('close-s');
  for (const i = 1; i < this.childs.length - 1; i ++) this.childs[i].Handler({ type: 'SOCKETCLOSE' });
 }

 CallController1(){}

 CallController()
 {
  try { this.socket.send(JSON.stringify(this.eventqueue[this.eventid] = { connectionid: this.id, eventid: this.eventid, type: 'newod' })); }
  catch {}
  //if (this.socket.readyState === 3) this.CreateWebSocket();
  this.eventid ++;
 }

 Handler(event)
 {
  switch (event.type)
	 {
	  case 'mouseup':
	       if (event.which === 3) new ContextMenu([['New database'], ['Database configuration'], ['Help']], this, event, this);
	       break;
	  case 'New database':
	       this.CallController();
	       break;
	  case 'DIALOG':
	       new DialogBox(event.data, this, {flags: CMCLOSE | CMFULLSCREEN | CLOSEESC, effect: 'rise', cascade: true}, {class: 'dialogbox selectnone', style: `left: ${Math.round(Math.random()*100)}%; top: ${Math.round(Math.random()*100)}%;`});
            //new DialogBox(undefined, this, {flags: CMCLOSE | CMFULLSCREEN | CLOSEESC, effect: 'rise', cascade: true}, {class: 'dialogbox selectnone', style: `left: ${Math.round(Math.random()*100)}%; top: ${Math.round(Math.random()*100)}%;`});
	       break;
	 }
    }
}
