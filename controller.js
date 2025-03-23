// Todo0 - Secure wss https://www.npmjs.com/package/ws#external-https-server
// Todo0 - Study ws on Node https://github.com/websockets/ws?tab=readme-ov-file#how-to-detect-and-close-broken-connections
// Todo - socket rate limit: https://javascript.info/websocket#rate-limiting
// Todo - How to secure web socket connections: https://www.freecodecamp.org/news/how-to-secure-your-websocket-connections-d0be0996c556/
// Todo - Node SNMP https://github.com/calmh/node-snmp-native
// https://node-postgres.com/apis/client
// https://github.com/brianc/node-postgres/wiki/FAQ#14-how-do-i-install-pg-on-windows
// Fix my project link https://github.com/lefffan/OE/blob/main/static/constant.js
// https://yoksel.github.io/url-encoder/
// ---------------------
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
// ---------------------
// Todo list:
// March
//    New dialog source
//    Comment and adjust other sourcse
//    Divide todo list for specific js sources
//    Object selection input arg dialog defines not only object selection but element layout
//    Define unspecified event default None or Nothing
//    permissions - check OD creating, check all pads of OD dialog read/change permissions, so no any readable pad - the user is not allowed OD dialog at all
//    Macroses - Macros name (act as a macros profile name), Macros value (text to submit macros name), Macros description (arbitrary text). Dont forget about dynamic macroses (${OD} $OV) and CalcMacrosValue function. Or split them into 2 objects - one is dinamic macroses list that claim to be calculated at its apply or static macroses
//    Create a template to check dialog structure correctness and check here database data structure with returning appropriate result (falsy value in case if incorrect database structure)
//    +Queue manager concept
//    +dialog data callback - return data with initial appearance order regardless of user current order set
//    Wrap EditDatabase into one transaction
//    process next events 'Server has closed connection due to timeout
// April
//    object view except graph and tree
// May
//    Auth process, user OD with its dialog and customization etc..

import { WSIP, WSPORT } from './main.js';
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

 AddClinetAuthCode(string, userid)
 {
  this.clientauthcodes[string] = { userid: userid };
  // Todo0 - do Settimeout to remove expired auth codes
  return string;
 }

  // Todo0 - Compare here user/pass from corresponded pair in 'User' OD
 Authenticate(username, password)
 {
  if (!username || !password || username !== 'root' || password !== '1') return { type: 'LOGINERROR', data: 'Wrong username or password!' };
  return { type: 'LOGINACK', data: { username: username, userid: '0', protocol: 'ws', ip: WSIP, port: WSPORT, authcode: this.AddClinetAuthCode(GenerateRandomString(12), 0/* Todo0 - set user id here */) } };
 }

 MessageIn(msg, client)
 {
  try { msg = JSON.parse(msg); }
  catch { return; }
  if (!msg || typeof msg !== 'object' || !msg.type) return;

  if (msg['type'] !== 'LOGIN' && !this.clients.get(client).auth)
     {
      client.send(JSON.stringify({ type: 'LOGINERROR', data: 'Unauthorized access attempt detected, please relogin!' }));
      client.terminate();
      return;
     }

  switch (msg.type)
	    {
	     case 'SETDATABASE':
               EditDatabase(msg, this.clients.get(this));
	          break;
	     case 'GETDATABASE':
               if ((typeof msg.odid !== 'number' && typeof msg.odid !== 'string') || !this.ods[msg.odid]) client.socket.send(JSON.stringify({ type: 'DIALOG', id: msg.id, data: { dialog: UNKNOWNDBID, title: 'Error' } }));
                else client.socket.send(JSON.stringify({ type: 'DIALOG', id: msg.id, data: this.ods[msg.odid].dialog }));
	          break;
	     case 'SIDEBARGET':
               SendViewsToClients(null, this);
	          break;
          case 'LOGIN':
               client.writeHeader(200, {'Content-Type': 'application/json; charset=UTF-8'});
               msg = this.Authenticate(msg.data.dialog.username.data, msg.data.dialog.password.data);
               client.write(JSON.stringify(msg));
               client.end()
               return;
	     case 'CREATEWEBSOCKET':
               if (this.clientauthcodes[msg.data.authcode] && this.clientauthcodes[msg.data.authcode].userid === msg.data.userid)
                  {
                   this.clients.get(this).auth = true;
                   this.clients.get(this).userid = this.clientauthcodes[msg.data.authcode].userid;
                   delete this.clientauthcodes[msg.authcode];
	              this.send(JSON.stringify({ type: 'CREATEWEBSOCKETACK' }));
                  }
                else
                  {
                   this.send(JSON.stringify({ type: 'LOGINERROR', data: 'Unauthorized access attempt detected, please relogin!' }));
                   this.terminate();
                  }
	          break;
          default:
               return; // Return for unknown msg type
	    }
 }
}
