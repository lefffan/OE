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

import { controller, CompareOptionInSelectElement, qm, pool, lg, GetDialogElement, CutString } from './main.js';

const INCORRECTDBCONFDIALOG   = 'Incorrect dialog structure!';
const INCORRECTDBCONFDBNAME   = 'Cannot create new database with empty name!\nIn order to remove Object Database please set empty db name and remove all elements, views and rules';
const UNKNOWNDBID             = 'Incorrect or nonexistent database id!';
const ELEMENTCOLUMNNAME       = 'eid';

export class Controller
{
 constructor()
 {
  this.clientauthcodes = {};
  this.clients = new Map();
  this.ods = {};
  this.ReadAllDatabase();
 }

 AddClinetAuthCode(string, userid)
 {
  this.clientauthcodes[string] = { userid: userid };
  // Todo0 - do Settimeout to remove expired auth codes
  return string;
 }

 GetOptionStringId(option)
 {
  [option] = option.split('~', 1);
  let id = option.lastIndexOf('id'); // Serach id string in non-cloned option names
  if (id === -1) return;
  id = option.slice(id + 2, -1); // Clip num after 'id' string and convert it to number
  return isNaN(+id) ? '' : id;
 }

 CheckDatabaseConfigurationDialogStructure(dialog)
 {
  let elements, views, rules;
  if (!(elements = GetDialogElement(dialog, 'padbar/Element/elements'))) throw new Error(INCORRECTDBCONFDIALOG);
  if (!(views = GetDialogElement(dialog, 'padbar/View/views'))) throw new Error(INCORRECTDBCONFDIALOG);
  if (!(rules = GetDialogElement(dialog, 'padbar/Rule/rules'))) throw new Error(INCORRECTDBCONFDIALOG);

  if (GetDialogElement(dialog, 'padbar/Database/settings/General/dbname')?.data) return true;
  if (typeof elements.data !== 'object' || typeof views.data !== 'object' || typeof rules.data !== 'object') throw new Error(INCORRECTDBCONFDIALOG);
  if (Object.keys(elements.data).length !== 1 || Object.keys(views.data).length !== 1 || Object.keys(rules.data).length !== 1) throw new Error(INCORRECTDBCONFDBNAME);
 }

 CorrectProfileIds(e, excludeoption, lastid, check)
 {
  const nonclonedids = [];
  const clonedids = [];
  const checkids = [];
  for (const option of Object.keys(e.data))
      {
       let name, flag, style;
       [name, flag, ...style] = option.split('~'); // Split option to its name and flag via '~'
       flag = `~${flag ? flag : ''}`; 
       style = style.length ? '~' + style.join(FIELDSDIVIDER) : ''; // Join back flag string
       if (excludeoption === name) continue; // Option is <excludeoption> (template)? Continue
       if (!e.data[option].uniq.flag.includes('!')) e.data[option].uniq.flag += '!';
       if (!flag.includes('*')) // Option is old (noncloned)?
          {
           nonclonedids.push(+this.GetOptionStringId(option)); // Add profile id to <nonclonedids> and continue
           continue;
          }
       name += ` (id${++lastid})`; // Add ' (id<num>)' to option name
       clonedids.push(lastid); // Add profile id to <clonedids>
       flag = flag.replaceAll('*', '').replaceAll('-', '').replaceAll('+', '') + '+-';
       e.data[name + flag + style] = e.data[option]; // and rename it in element selectable data
       delete e.data[option];
       if (typeof check !== 'string') continue;
       [, flag] = e.data[name + flag + style][check]?.data?.split('~', 2);
       if ((flag || '').includes('!')) checkids.push(lastid);
      }
  return [nonclonedids, clonedids, checkids];
 }

 AdjustDatabase(dialog, odid, lastelementid, lastviewid)
 {
  let elementnonclonedids, elementclonedids, elementcheckids, viewclonedids;
  dialog.create.data = 'SAVE';
  let dbname = GetDialogElement(dialog, 'padbar/Database/settings/General/dbname')?.data;
  if (typeof dbname !== 'string') dbname = '';
  dialog.title.data = `Database '${CutString(dbname.split('/').pop(), 10)}' configuration (id${odid})`;
  [elementnonclonedids, elementclonedids, elementcheckids] = this.CorrectProfileIds(GetDialogElement(dialog, 'padbar/Element/elements'), 'New element template', lastelementid, 'uniq');
  [, viewclonedids] = this.CorrectProfileIds(GetDialogElement(dialog, 'padbar/View/views'), 'New view template', lastviewid);
  delete dialog.create.expr;
  return [elementnonclonedids, elementclonedids, elementcheckids, viewclonedids];
 }
 
 CalcMacrosValue(name, value, collect = [])
 {
  collect.push(name);
 }

 GetTableNameId(name)
 {
  let pos = name.indexOf('_');
  if (pos === -1) return;
  name = name.substring(pos + 1);
  return isNaN(+name) ? undefined : name;
 }

 async ReadAllDatabase()
 {
  const showtables = await pool.query(...qm.Table().ShowTables().Make());
  const tables = [];

  for (const table of showtables.rows) tables.push(table.tablename);
  for (const table of tables)
      {
       const id = this.GetTableNameId(table);
       if (!tables.includes(`head_${id}`) || !tables.includes(`data_${id}`) || !tables.includes(`uniq_${id}`)) continue;
       if (!id || id in this.ods) continue; // Undefined id or OD with id <id> already sucked
       const dialog = await pool.query(...qm.Table(`head_${id}`).Method('SELECT').Fields('dialog').Order('id').Limit(1).Make());
       try { this.CheckDatabaseConfigurationDialogStructure(dialog?.rows?.[0]?.dialog); }
       catch { continue; }
       this.ods[id] = { dialog: dialog.rows[0].dialog };
      }
 }

 async EditDatabase(msg, wsclient)
 {
  if (!wsclient) return; // No valid web socket client in controller clients map? Return
  let lastelementid = 0, lastviewid = 0, oldids = [];
  try {
       if (!this.CheckDatabaseConfigurationDialogStructure(msg.data))
          {
           if (!msg.odid)
              {
               wsclient.socket.send(JSON.stringify({ type: 'DIALOG', data: INCORRECTDBCONFDBNAME, title: 'Error' }));
               return;
              }
           for (const table of ['head_', 'uniq_', 'data_']) await pool.query(...qm.Table(`${table}${msg.odid}`).Method('DROP').Make()); // DROP TABLES
           wsclient.socket.send(JSON.stringify({ type: 'SIDEBARDELETE', odid: msg.odid }));
           delete this.ods[msg.odid];
           wsclient.socket.send(JSON.stringify({ type: 'DIALOG', data: 'Object Database is successfully removed!', title: 'Info' }));
           return;
          }
       if (!msg.odid)
          {
           const tablelist = await pool.query(...qm.Table().ShowTables().Make()); // Todo0 - Dont forget to keep limited database versions, it is impossible to keep all database changes history from it creation
           msg.odid = 0;
           for (const row of tablelist.rows)
               {
                const id = this.GetTableNameId(row.tablename);
                if (id && +id > msg.odid) msg.odid = +id;
               }
           msg.odid++;
           await pool.query(...qm.Table('head_' + msg.odid).Method('CREATE').Make()); // Create new databases and write its structure
           await pool.query(...qm.Table('uniq_' + msg.odid).Method('CREATE').Make());
           await pool.query(...qm.Table('data_' + msg.odid).Method('CREATE').Make());
           await pool.query(...qm.Table('head_' + msg.odid).Method('CREATE').Fields({ id: {value: 'INTEGER', constraint: 'PRIMARY'},
                                                                                      timestamp: {value: 'TIMESTAMP', constraint: 'DEFAULT CURRENT_TIMESTAMP'},
                                                                                      userid: 'INTEGER',
                                                                                      //username: `CHAR(${USERNAMEMAXCHAR})`,
                                                                                      dialog: 'JSON',
                                                                                      lastelementid: 'INTEGER',
                                                                                      lastviewid: 'INTEGER',
                                                                                    }).Make());
          }
        else
          {
           const lastids = await pool.query(...qm.Table(`head_${msg.odid}`).Method('SELECT').Fields(['lastelementid', 'lastviewid']).Order('id').Limit(1).Make()); // Calculate max (last) element/view ids of current OD configuration to set new element/view ids properly for the new OD instance came from client. For creating OD last element/view ids are zero
           [lastelementid, lastviewid] = [lastids?.rows?.[0]?.lastelementid, lastids?.rows?.[0]?.lastviewid];
           const e = GetDialogElement(this.ods[msg.odid].dialog, 'padbar/Element/elements');
           if (e?.data && typeof e.data === 'object')
              for (const option in e.data)
                  if (!CompareOptionInSelectElement('New element template', option)) oldids.push(+this.GetOptionStringId(option));
         }
       const [elementnonclonedids, elementclonedids, elementuniqids, viewclonedids] = this.AdjustDatabase(msg.data, msg.odid, lastelementid, lastviewid); // Adjust database dialog structure and write it to 'head_<odid>' table below
       await pool.query(...qm.Table(`head_${msg.odid}`).Method('WRITE').Fields({ userid: wsclient.userid,
                                                                                 dialog: {value: JSON.stringify(msg.data), escape: true},
                                                                                 lastelementid: elementclonedids.length ? elementclonedids.at(-1) : lastelementid,
                                                                                 lastviewid: viewclonedids.length ? viewclonedids.at(-1) : lastviewid }).Make());
       for (const id of oldids) if (!elementnonclonedids.includes(id))
           {
            await pool.query(...qm.Table(`data_${msg.odid}`).Method('DROP').Fields(`${ELEMENTCOLUMNNAME}${id}`).Make());
            await pool.query(...qm.Table(`uniq_${msg.odid}`).Method('DROP').Fields(`${ELEMENTCOLUMNNAME}${id}`).Make());
           }
       for (const id of elementclonedids) await pool.query(...qm.Table(`data_${msg.odid}`).Method('CREATE').Fields({ [ELEMENTCOLUMNNAME + id]: 'JSON' }).Make());
       for (const id of elementuniqids) await pool.query(...qm.Table(`uniq_${msg.odid}`).Method('CREATE').Fields({ [ELEMENTCOLUMNNAME + id]: 'varchar(125)' }).Make());
       this.ods[msg.odid] = { dialog: msg.data };
       this.SendViewsToClients(msg.odid);
      }
  catch (error)
      {
       wsclient.socket.send(JSON.stringify({ type: 'DIALOG', data: error.message, title: 'Error' }));
       //console.e  rror(error);
       lg(error);
      }
 }

 SendODToClient(msg, wsclient)
 {
  if ((typeof msg.odid !== 'number' && typeof msg.odid !== 'string') || !this.ods[msg.odid]) wsclient.socket.send(JSON.stringify({ type: 'DIALOG', data: UNKNOWNDBID, title: 'Error', id: msg.id }));
   else wsclient.socket.send(JSON.stringify({ type: 'DIALOG', data: this.ods[msg.odid].dialog, id: msg.id }));
 }

 // { type: 'SIDEBARSET', odid: 13, path: 'hui/Система/Users', ov: { 1: ['zest/view1a', '/vvvvvvvvvvvvvvvvvvvvvvvvvie1b'], 2: ['/ahui1/View2c', 'test/view2d']}}
 SendViewsToClients(odid, clients)
 {
  if (typeof odid === 'number') odid += '';
  if (typeof odid !== 'string' && (!clients || typeof clients !== 'object')) return; // No views refresh for all clients and all dbs
  let e;
  clients = (clients && typeof clients === 'object') ? new Map().set(clients, this.clients.get(clients)) : this.clients;

  for (const id in this.ods) if (typeof odid !== 'string' || id === odid)
  for (const [, value] of clients)
      {
       if (!value.auth) continue;
       e = GetDialogElement(this.ods[id].dialog, 'padbar/Database/settings/General/dbname') 
       if (!e) throw new Error(INCORRECTDBCONFDIALOG);
       const msg = { type: 'SIDEBARSET', odid: id, path: e.data, ov: {} };
       e = GetDialogElement(this.ods[id].dialog, 'padbar/View/views');
       if (!e) throw new Error(INCORRECTDBCONFDIALOG);

       for (const option in e.data)
           {
            if (CompareOptionInSelectElement('New view template', option)) continue;
            const ovid = this.GetOptionStringId(option);
            const aliases = GetDialogElement(this.ods[id].dialog, `padbar/View/views/${option}/settings/General/name`);
            if (!aliases) throw new Error(INCORRECTDBCONFDIALOG);
            if (typeof aliases.data !== 'string' || typeof ovid !== 'string') throw new Error(INCORRECTDBCONFDIALOG);
            msg.ov[ovid] = [];
            for (let alias of aliases.data.split('\n'))
                if (alias = alias.trim()) msg.ov[ovid].push(alias);
           }

       value.socket.send(JSON.stringify(msg)); // Todo2 - should pause (via setTimeout(0, )) be between two socket msg sendings keep non blocking main thread?
      }
 }
}

// auth= '{ userid:, sessionid:, expire:, sign: }', where sign is a hash (HMAC-SHA256) with a password (wich is stored specifically in server internal memory) of client LOGIN data: ip, fingerprint (user-agent and other specific data), userid and expire.
// auth token may be store in LS (so page reload doesn't call relogin) or in client app memory (page reload calls relogin), auth token is no encrypted, but cannot be faked due to its sign compared on server side
// Should i send keepalive events (last client event generates setTimeout (60*1000) for keepalive event post) from client side to exclude session timeout and 
// +--------+                                               +------------+                                   +---------+                                     
// |        |  case No Auth Token:  		    		     |            |                               ... |         |                
// |        |  {type LOGIN, user, pass} (POST) -> 	     |            |                               ... |         |                
// |        |                      <- {type TOKEN, auth}    |            |                                   |         |                
// |        |                        <- {type WRONGPASS}    |            |                                   |         |                
// |        |                                     	     |            |                                   |         |                
// |        |  case Auth Token with no WS:        	     |            |                               ... |         |                
// |        |  {type GETWS, auth} (POST) ->			     |            |                               ... |         |                
// |        |                  <- {type SETWS, ip, port}    |            |                                   |         |                
// |        |        		 <- {type: 'UNAUTH|EXPIRED'}  |            |                                   |         |                
// |        |                                     	     |            |                                   |         |                
// |        |  case Auth Token with WS: 	       		|            |                               ... |         |                
// |        |  {type <any-event>, auth} (WS)			     |            |                               ... |         |                
// |        |        		 <- {type: 'UNAUTH|EXPIRED'}  |            |                                   |         |                
// |        |                                     		|            |                                   |         |                
// |        |  case Auth Token with/out WS:        		|            |                                   |         |                
// |        |  {type LOGOUT, auth}                		|            |                               ... |         |                
// |        |                                     		|            |                               ... |         |                
// |        | User events STEP1--->                         |            | User events STEP2--->             |         |                
// |        |   Context menu (INIT|DELETE)                  |            |   ---||---                        |         |                
// |        |   Confirmation (CONFIRM|CONFIRMDIALOG)        |            | Controller event:                 |         |                
// |        |   Mouse and keyboard	 	        		     |            |   SCHEDULE                        |         |                
// |        |   Sidebar (RELOAD, NEWOD)	        		     |            |                                   |         |                
// |        |                                     		|            |    <---STEP3 Handler system calls |         |                
// |        |                                     		|            |                               SET |         |                
// |        |                                     		|            |                             RESET |         |                
// |        |                                     		|            |                            UPDATE |         |                
// |        |                                     		|            |                               PUT |         |                
// |        |                                     		|            |                            DIALOG |         |                
// |        |                                     		|            |                              EDIT |         |                
// | Client |                                		     | Controller |                              CALL | Handler |                
// |        |                                     		|            |                             ALERT |         |                
// |        |                                     		|            |                                   |         |                
// |        |                                     		|            | Controller event STEP4--->        |         |                
// |        |                                     		|            |   ONCHANGE                        |         |                
// |        |                                     		|            |                                   |         |                
// |        |                                     		|            |    <---STEP5 Handler system calls |         |                
// |        |                                     		|            |                               ... |         |                
// |        |                                     		|            |                                   |         |                
// |        |              <---STEP6 Controller commands    |            |                                   |         |                
// |        |                                        SET    |            |                                   |         |                
// |        |                                     DIALOG    |            |                                   |         |                
// |        |                                       EDIT    |            |                                   |         |                
// |        |                                       VIEW    |            |                                   |         |                
// |        |                                  NEWOBJECT    |            |                                   |         |                
// |        |                               DELETEOBJECT    |            |                                   |         |                
// |        |                                     		|            |                                   |         |                
// +--------+                         		               +------------+                                   +---------+                                     
