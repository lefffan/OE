// Todo2 - change '*', '!' to const var and others

import { FIELDSDIVIDER, lg, qm, pool, controller, CompareOptionInSelectElement, GetDialogElement, CutString } from './main.js';

const ODUNIQCOLUMNVALUEMAXCHAR = 125;
const INCORRECTDBCONFDIALOG   = 'Incorrect dialog structure!';
const INCORRECTDBCONFDBNAME   = 'Cannot create new database with empty name!\nIn order to remove Object Database please set empty db name and remove all elements, views and rules';
const ELEMENTCOLUMNNAME       = 'eid';

// Function is called at controller creation (constructor)
export async function ReadAllDatabase()
{
 const showtables = await pool.query(...qm.Table().ShowTables().Make());
 const tables = [];

 for (const table of showtables.rows) tables.push(table.tablename);                                                             // Fill tables array to my DB sql tables
 for (const table of tables)
     {
      const id = GetTableNameId(table);
      if (!tables.includes(`head_${id}`) || !tables.includes(`data_${id}`) || !tables.includes(`uniq_${id}`)) continue;         // OD is correct with all three tables exist
      if (!id || id in controller.ods) continue;                                                                                // Undefined id or OD with id <id> already sucked
      const dialog = await pool.query(...qm.Table(`head_${id}`).Method('SELECT').Fields('dialog').Order('id').Limit(1).Make()); // Get OD structure dialog last version from head_id table
      try { CheckDatabaseConfigurationDialogStructure(dialog?.rows?.[0]?.dialog); }                                             // and check it
      catch { continue; }
      controller.ods[id] = { dialog: dialog.rows[0].dialog };
     }
}

export function GetTableNameId(name)
{
 let pos = name.indexOf('_');
 if (pos === -1) return;
 name = name.substring(pos + 1);
 return isNaN(+name) ? undefined : name;
}

export function GetOptionStringId(option)
{
 [option] = option.split(FIELDSDIVIDER, 1); // Get option name without flags/style
 let id = option.lastIndexOf('id');         // Serach id string in non-cloned option names
 if (id === -1) return;                     // Return undefined for no 'id' string present
 id = option.slice(id + 2, -1);             // Clip num after 'id' string and convert it to number
 return isNaN(+id) ? '' : id;               // and return string containing 
}

// Function checkes OD dialog structure and returns true for correct structure, otherwise throws an error. In case of correct structure and empty db name with element/view/rules profiles number - function returns undefined to remove db
export function CheckDatabaseConfigurationDialogStructure(dialog)
{
 let elements, views, rules;
 if (!(elements = GetDialogElement(dialog, 'padbar/Element/elements'))) throw new Error(INCORRECTDBCONFDIALOG);
 if (!(views = GetDialogElement(dialog, 'padbar/View/views'))) throw new Error(INCORRECTDBCONFDIALOG);
 if (!(rules = GetDialogElement(dialog, 'padbar/Rule/rules'))) throw new Error(INCORRECTDBCONFDIALOG);

 if (GetDialogElement(dialog, 'padbar/Database/settings/General/dbname')?.data) return true;
 if (typeof elements.data !== 'object' || typeof views.data !== 'object' || typeof rules.data !== 'object') throw new Error(INCORRECTDBCONFDIALOG);
 if (Object.keys(elements.data).length !== 1 || Object.keys(views.data).length !== 1 || Object.keys(rules.data).length !== 1) throw new Error(INCORRECTDBCONFDBNAME);
}

export function CorrectProfileIds(e, excludeoption, lastid, check)
{
 const nonclonedids = [];
 const clonedids = [];
 const checkids = [];
 for (const option of Object.keys(e.data))
     {
      let [name, flag, ...style] = option.split(FIELDSDIVIDER);                         // Split option to its name and flag via FIELDSDIVIDER char '~'
      flag = `${FIELDSDIVIDER}${flag || ''}`;                                           // Convert flag to string with divider added
      style = style.length ? FIELDSDIVIDER + style.join(FIELDSDIVIDER) : '';            // Join back style string
      if (excludeoption === name) continue;                                             // Option is <excludeoption> (template)? Continue
      if (!flag.includes('*'))                                                          // Option is old (noncloned)?
         {
          nonclonedids.push(+GetOptionStringId(option));                                // Add profile id to <nonclonedids> and continue
          continue;
         }
      name += ` (id${++lastid})`;                                                       // Add ' (id<num>)' to option name
      clonedids.push(lastid);                                                           // Add profile id to <clonedids>
      flag = flag.replaceAll('*', '').replaceAll('-', '').replaceAll('+', '') + '+-';   // Remove clonable/removable/cloned flags and add clonable/removable ones only
      e.data[name + flag + style] = e.data[option];                                     // and rename it in element selectable data
      delete e.data[option];
      if (!check) continue;
      if (!e.data[name + flag + style].check.flag.includes('!'))
         e.data[name + flag + style].check.flag += '!';                                 // Make readonly 'check' element feature
      [, flag] = e.data[name + flag + style][check]?.data?.split(FIELDSDIVIDER, 2);     // Get 'check' element 1st option selected/non-selected flag value
      if ((flag || '').includes('!')) checkids.push(lastid);                            // and push to 'check' ids array if selected
     }
 return [nonclonedids, clonedids, checkids];
}

export function AdjustDatabase(dialog, odid, lastelementid, lastviewid)
{
 dialog.create.data = 'SAVE'; // Create btn is 'SAVE' btn after db conf dialog created
 let dbname = GetDialogElement(dialog, 'padbar/Database/settings/General/dbname')?.data; // Get db name
 if (typeof dbname !== 'string') dbname = '';
 dialog.title.data = `Database '${CutString(dbname.split('/').pop(), 10)}' configuration (id${odid})`; // Change dialog title 
 const [elementnonclonedids, elementclonedids, elementuniqids] = CorrectProfileIds(GetDialogElement(dialog, 'padbar/Element/elements'), 'New element template', lastelementid, 'uniq');
 const [, viewclonedids] = CorrectProfileIds(GetDialogElement(dialog, 'padbar/View/views'), 'New view template', lastviewid);
 delete dialog.create.expr; // No grey btn 'CREATE' for empty db name that is used to remove OD
 return [elementnonclonedids, elementclonedids, elementuniqids, viewclonedids];
}
 
export function CalcMacrosValue(name, value, collect = [])
{
 collect.push(name);
}

export async function EditDatabase(msg, client)
{
 if (!client) return; // No valid web socket client in controller clients map? Return
 let lastelementid = 0, lastviewid = 0, oldids = [];
 try {
      if (!CheckDatabaseConfigurationDialogStructure(msg.data.dialog)) // OD check is failed. Failed check is a faulsy result that means empty db name. For incorrect db structure exception is throwed and handled below
         {
          if (!msg.data.odid) // New OD creation
             {
              client.socket.send(JSON.stringify({ type: 'DIALOG', data: { dialog: INCORRECTDBCONFDBNAME, title: 'Error' } })); // Send error text to the client side for empty db name
              return;
             }
          for (const table of ['head_', 'uniq_', 'data_']) await pool.query(...qm.Table(`${table}${msg.data.odid}`).Method('DROP').Make()); // Otherwise empty db name means OD removing, so drop corresponded tables
          for (const [, value] of controller.clients) value.socket.send(JSON.stringify({ type: 'SIDEBARDELETE', data: msg.data.odid })); // and send OD remove msg to all wss clients
          delete controller.ods[msg.data.odid]; // Delete OD from app memory
          client.socket.send(JSON.stringify({ type: 'DIALOG', data: { dialog: 'Object Database is successfully removed!', title: 'Info' } })); // and send info mgs for client initiated removing
          return;
         }
      if (!msg.data.odid) // OD check is passed, so process new OD creation (undefined msg.data.odid)
         {
          const tablelist = await pool.query(...qm.Table().ShowTables().Make()); // Todo0 - Dont forget to keep limited database versions, it is impossible to keep all database changes history from it creation
          msg.data.odid = 0;
          for (const row of tablelist.rows) // Calculate current OD max index
              {
               const id = GetTableNameId(row.tablename);
               if (id && +id > msg.data.odid) msg.data.odid = +id;
              }
          msg.data.odid++; // and increment it
          await pool.query(...qm.Table('head_' + msg.data.odid).Method('CREATE').Make()); // Create new databases and write its structure
          await pool.query(...qm.Table('uniq_' + msg.data.odid).Method('CREATE').Make());
          await pool.query(...qm.Table('data_' + msg.data.odid).Method('CREATE').Make());
          await pool.query(...qm.Table('head_' + msg.data.odid).Method('CREATE').Fields({ id: {value: 'INTEGER', constraint: 'PRIMARY'},
                                                                                          timestamp: {value: 'TIMESTAMP', constraint: 'DEFAULT CURRENT_TIMESTAMP'},
                                                                                          userid: 'INTEGER',
                                                                                          //username: `CHAR(${USERNAMEMAXCHAR})`,
                                                                                          dialog: 'JSON',
                                                                                          lastelementid: 'INTEGER',
                                                                                          lastviewid: 'INTEGER',
                                                                                        }).Make());
         }
       else // OD check is passed, so process existing OD change
         {
          const lastids = await pool.query(...qm.Table(`head_${msg.data.odid}`).Method('SELECT').Fields(['lastelementid', 'lastviewid']).Order('id').Limit(1).Make()); // Calculate max (last) element/view ids of current OD configuration to set new element/view ids properly for the new OD instance came from client. For creating OD last element/view ids are zero
          [lastelementid, lastviewid] = [lastids?.rows?.[0]?.lastelementid, lastids?.rows?.[0]?.lastviewid];
          const e = GetDialogElement(controller.ods[msg.data.odid].dialog, 'padbar/Element/elements'); // Calculate OD existing elements id (into oldids array) to have opportunity compare them to new OD version, so delete OD new version unexisting ones
          if (e?.data && typeof e.data === 'object')
             for (const option in e.data)
                 if (!CompareOptionInSelectElement('New element template', option)) oldids.push(+GetOptionStringId(option));
         }
      const [elementnonclonedids, elementclonedids, elementuniqids, viewclonedids] = AdjustDatabase(msg.data.dialog, msg.data.odid, lastelementid, lastviewid); // Adjust database dialog structure and write it to 'head_<odid>' table below
      await pool.query(...qm.Table(`head_${msg.data.odid}`).Method('WRITE').Fields({ userid: client.userid,
                                                                                dialog: {value: JSON.stringify(msg.data.dialog), escape: true},
                                                                                lastelementid: elementclonedids.length ? elementclonedids.at(-1) : lastelementid,
                                                                                lastviewid: viewclonedids.length ? viewclonedids.at(-1) : lastviewid }).Make());
      for (const id of oldids) if (!elementnonclonedids.includes(id)) // Old OD version element ids (oldids) doesn't exist in new OD version noncloned elements? If so - element was removed by client, drop corresponded columns below
          {
           await pool.query(...qm.Table(`data_${msg.data.odid}`).Method('DROP').Fields(`${ELEMENTCOLUMNNAME}${id}`).Make());
           await pool.query(...qm.Table(`uniq_${msg.data.odid}`).Method('DROP').Fields(`${ELEMENTCOLUMNNAME}${id}`).Make());
          }
      for (const id of elementclonedids) await pool.query(...qm.Table(`data_${msg.data.odid}`).Method('CREATE').Fields({ [ELEMENTCOLUMNNAME + id]: 'JSON' }).Make()); // Create new elements from cloned ids
      for (const id of elementuniqids) await pool.query(...qm.Table(`uniq_${msg.data.odid}`).Method('CREATE').Fields({ [ELEMENTCOLUMNNAME + id]: `varchar(${ODUNIQCOLUMNVALUEMAXCHAR})` }).Make()); // Create new uniq elements from uniq ids
      controller.ods[msg.data.odid] = { dialog: msg.data.dialog }; // Refresh dialog data in memory
      SendViewsToClients(msg.data.odid); // Refresh OD tree with its vews and folders to all wss clients
     }
 catch (error)
     {
      client.socket.send(JSON.stringify({ type: 'DIALOG', data: { dialog: error.message, title: 'Error' } }));
      lg(error);
     }
}

 // { type: 'SIDEBARSET', odid: 13, path: 'System/Users', ov: { 1: ['test/view1a', '/vie1b'], 2: ['/folder/View2c', 'test/view2d'] } }
export function SendViewsToClients(odid, clients)
{
 if (typeof odid === 'number') odid += '';
 if (typeof odid !== 'string' && (!clients || typeof clients !== 'object')) return; // No views refresh for all clients and all dbs
 let e;
 clients = (clients && typeof clients === 'object') ? new Map().set(clients, controller.clients.get(clients)) : controller.clients; // Create one single client to send views in case of its object type, otherwise - all clients array is used (controller.clients)

 for (const id in controller.ods) if (typeof odid !== 'string' || id === odid) // Go through all object databases for undefined odid or OD 'id' for exactly defined one
 for (const [, value] of clients) // Also go through all clients for selected OD above
     {
      if (!value.auth) continue;
      e = GetDialogElement(controller.ods[id].dialog, 'padbar/Database/settings/General/dbname') 
      if (!e) throw new Error(INCORRECTDBCONFDIALOG);
      const msg = { type: 'SIDEBARSET', data: { odid: id, path: e.data, ov: {} } }; // Create message for OD 'id' with its path (e.data) and views defined below
      e = GetDialogElement(controller.ods[id].dialog, 'padbar/View/views');
      if (!e) throw new Error(INCORRECTDBCONFDIALOG);

      for (const option in e.data) // Go through all view profiles
          {
           if (CompareOptionInSelectElement('New view template', option)) continue; // except view template
           const ovid = GetOptionStringId(option); // Get view id from option name
           const aliases = GetDialogElement(controller.ods[id].dialog, `padbar/View/views/${option}/settings/General/name`); // and all view aliases
           if (!aliases || typeof aliases.data !== 'string' || typeof ovid !== 'string') throw new Error(INCORRECTDBCONFDIALOG); // Throw an error for incorrect view profile
           msg.data.ov[ovid] = []; // Create aliases array first
           for (let alias of aliases.data.split('\n')) // and split aliases data to one by line alias to add it to message 'ov' array
               if (alias = alias.trim()) msg.data.ov[ovid].push(alias);
          }

      value.socket.send(JSON.stringify(msg)); // Todo2 - should pause (via setTimeout(0, )) be between two socket msg sendings keep non blocking main thread?
     }
}
