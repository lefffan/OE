// Todo0 - Secure wss https://www.npmjs.com/package/ws#external-https-server
// Todo0 - Study ws on Node https://github.com/websockets/ws?tab=readme-ov-file#how-to-detect-and-close-broken-connections
// Todo0 - socket rate limit: https://javascript.info/websocket#rate-limiting
// Todo0 - How to secure web socket connections: https://www.freecodecamp.org/news/how-to-secure-your-websocket-connections-d0be0996c556/
// Todo0 - Node SNMP https://github.com/calmh/node-snmp-native
// Todo1 - process event 'Server has closed connection due to timeout', should this event be on client or server side (via any incoming msg)?
// Todo1 - Create a template from frontend NEWOBJECTDATABASE to check dialog structure correctness

// Todo list:
// April and first half of May
//    Comment and adjust other sourcse
//    Divide todo list for specific js sources
//    Object selection input arg dialog defines not only object selection but element layout
//    Define unspecified event default None or Nothing
//    Macroses - Macros name (act as a macros profile name), Macros value (text to submit macros name), Macros description (arbitrary text).
//        Dont forget about dynamic macroses (${OD} $OV) and CalcMacrosValue function. Or split them into 2 objects - one is dinamic macroses list that claim to be calculated at its apply or static macroses
//    permissions - check OD creating, check all pads of OD dialog read/change permissions, so no any readable pad - the user is not allowed OD dialog at all
//    object view except graph and tree
// May (second half)
//    Auth process, user OD with its dialog and customization etc..
// Links:
// https://node-postgres.com/apis/client
// https://github.com/brianc/node-postgres/wiki/FAQ#14-how-do-i-install-pg-on-windows
// Fix my project link https://github.com/lefffan/OE/blob/main/static/constant.js
// https://yoksel.github.io/url-encoder/
// PGSQL cmd docs!
// https://postgrespro.ru/docs/postgresql/14/sql-commands
// https://postgrespro.ru/docs/postgresql/14/datatype-datetime  https://postgrespro.ru/docs/postgrespro/9.5/functions-datetime
// https://docs.timescale.com/use-timescale/latest/write-data/
// https://eax.me/timescaledb/
// https://eax.me/postgresql-triggers/
// https://eax.me/timescaledb-caggs-implementation/
// https://eax.me/tag/postgresql/page/2/
// https://eax.me/postgresql-window-functions/
// https://www.postgresql.org/docs/current/rules-materializedviews.html
// https://docs.timescale.com/getting-started/latest/queries/
// https://docs-timescale-com.translate.goog/getting-started/latest/queries/?_x_tr_sl=en&_x_tr_tl=ru&_x_tr_hl=ru&_x_tr_pto=rq&_x_tr_hist=true
// https://docs.timescale.com/api/latest/hyperfunctions/histogram/

import { WSIP, WSPORT, GenerateRandomString, lg } from './main.js';
import { ReadAllDatabase, SendViewsToClients, EditDatabase } from './objectdatabase.js';

const UNKNOWNDBID = 'Incorrect or nonexistent database id!';

export class Controller
{
 constructor()
 {
  this.clientauthcodes = {};
  this.clients = new Map();
  this.ods = {};
  ReadAllDatabase();
 }

 AddClientAuthCode(string, data)
 {
  this.clientauthcodes[string] = data;
  // Todo0 - do Settimeout to remove expired auth codes
  return string;
 }

  // Todo0 - Compare here user/pass from corresponded pair in 'User' OD
 Authenticate(username, password)
 {
  if (!username || !password || username !== 'root' || password !== '1') return { type: 'LOGINERROR', data: 'Wrong username or password!' };
  return { type: 'LOGINACK', data: { username: username, userid: '0', protocol: 'ws', ip: WSIP, port: WSPORT, authcode: this.AddClientAuthCode(GenerateRandomString(12), { userid: '0', username: username }/* Todo0 - set user id here */) } };
 }

 MessageIn(msg, client)
 {
  try { msg = JSON.parse(msg); }
  catch { return; }
  //lg('Incoming msg:', msg);
  if (!msg || typeof msg !== 'object' || !msg.type) return;

  if (!['LOGIN', 'CREATEWEBSOCKET'].includes(msg.type) && !this.clients.get(client).auth)
     {
      client.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: 'Unauthorized access detected, please relogin!' }));
      client.terminate();
      return;
     }

  switch (msg.type)
	    {
	     case 'SETDATABASE':
               EditDatabase(msg, this.clients.get(client));
	          break;
	     case 'GETDATABASE':
               if ((typeof msg.data.odid !== 'number' && typeof msg.data.odid !== 'string') || !this.ods[msg.data.odid]) client.send(JSON.stringify({ type: 'DIALOG', id: msg.id, data: { dialog: UNKNOWNDBID, title: 'Error' } }));
                else client.send(JSON.stringify({ type: 'DIALOG', id: msg.id, data: { dialog: this.ods[msg.data.odid].dialog } }));
	          break;
	     case 'SIDEBARGET':
               SendViewsToClients(null, client);
	          break;
          case 'LOGIN':
               client.writeHeader(200, {'Content-Type': 'application/json; charset=UTF-8'});
               msg = this.Authenticate(msg.data.username, msg.data.password);
               client.write(JSON.stringify(msg));
               client.end()
               return;
	     case 'CREATEWEBSOCKET':
               if (this.clientauthcodes[msg.data.authcode] && this.clientauthcodes[msg.data.authcode].userid === msg.data.userid)
                  {
                   this.clients.get(client).auth = true;
                   this.clients.get(client).userid = this.clientauthcodes[msg.data.authcode].userid;
                   this.clients.get(client).username = this.clientauthcodes[msg.data.authcode].username;
                   delete this.clientauthcodes[msg.data.authcode];
	              client.send(JSON.stringify({ type: 'CREATEWEBSOCKETACK' }));
                  }
                else
                  {
                   client.send(JSON.stringify({ type: 'DROPWEBSOCKET', data: 'Unauthorized access detected, please relogin!' }));
                   client.terminate();
                  }
	          break;
          default:
               return; // Return for unknown msg type
	    }
  //this.clients.get(client).lasttimestamp = Date.now();
 }
}
