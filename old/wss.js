import { controller, lg } from './main.js';
 
function WSMessageProcess(msg)
{
 // msg - incoming message from the client side
 // this - ws connection object that is passed first at websocket init and stored in <clients> map object. To send data back to the client side use this.send('...'),
 msg = JSON.parse(msg);
 if (!msg || typeof msg !== 'object' || !msg['type']) return;
 if (msg['type'] !== 'LOGIN' && !controller.clients.get(this).auth)
    {
     this.send(JSON.stringify({ type: 'LOGINERROR', data: 'Unauthorized access attempt detected, please relogin!' }));
     this.terminate();
     return;
    }

 switch (msg['type'])
	    {
	     case 'SETDATABASE':
              controller.EditDatabase(msg, controller.clients.get(this));
	          break;
	     case 'GETDATABASE':
              controller.SendODToClient(msg, controller.clients.get(this));
	          break;
	     case 'SIDEBARGET':
              controller.SendViewsToClients(null, this);
	          break;
	     case 'LOGIN':
               if (controller.clientauthcodes[msg.authcode])
                  {
                   controller.clients.get(this).auth = true;
                   controller.clients.get(this).userid = controller.clientauthcodes[msg.authcode].userid;
                   delete controller.clientauthcodes[msg.authcode];
	               this.send(JSON.stringify({ type: 'AUTHWEBSOCKET' }));
                  }
                else
                  {
                   this.send(JSON.stringify({ type: 'LOGINERROR', data: 'Unauthorized access attempt detected, please relogin!' }));
                   this.terminate();
                  }
	          break;
	    }
}

function WSError(err)
{
 console.error(err);
}

export function WSNewConnection(client)
{
 controller.clients.set(client, { socket: client }); // { auth: true|false, userid:, }
 client.on('message', WSMessageProcess);
 client.on('error', WSError);
}