// Todo2 - change '*', '!' to const var and others
// let c; c++;      if (c%2) {               const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));                        await sleep(5000);              }

import { FIELDSDIVIDER, lg, loog, qm, pool, controller, CompareOptionInSelectElement, GetDialogElement, CutString, GetOptionInSelectElement, GetOptionNameInSelectElement } from './main.js';
import { ELEMENTCOLUMNPREFIX, SYSTEMELEMENTNAMES } from './querymaker.js';

const INCORRECTDBCONFDIALOG     = 'Incorrect dialog structure!';
const INCORRECTDBCONFDBNAME     = 'Cannot create new database with empty name!\nIn order to remove Object Database please set empty db name and remove all elements, views and rules';
const DISALLOWEDTOCONFIGURATE   = 'You are not allowed to configurate this Object Database!';
const SUPERUSER                 = 'root';
const LAYOUTCELLPROPS           = ['row', 'col', 'x', 'y', 'value', 'attributes', 'hint', 'collapsecol', 'collapserow'];
const LAYOUTTABLEPROPS          = ['attributes', 'collapserow', 'collapsecol'];
const LAYOUTEVENTPROPS          = ['event', 'x', 'y', 'row', 'col'];
const LAYOUTTRIMABLEPROPS       = ['row', 'col', 'x', 'y', 'event', 'collapserow', 'collapsecol', 'attributes'];
const NONEXPRESSIONCHARS        = /[^rcq\+\-\;\&\|\!\*\/0123456789\.\%\>\<\=\(\) ]/;

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

export function CorrectProfileIds(e, excludeoption, lastid)
{
 const nonclonedids = [];
 const clonedids = [];
 for (const option of Object.keys(e.data))
     {
      let [name, flag, ...style] = option.split(FIELDSDIVIDER);                         // Split option to its name and flag via FIELDSDIVIDER char '~'
      flag = `${FIELDSDIVIDER}${flag || ''}`;                                           // Convert flag to string with divider added
      style = style.length ? FIELDSDIVIDER + style.join(FIELDSDIVIDER) : '';            // Join back style string
      if (!flag.includes('*'))                                                          // Option is old (noncloned)?
         {
          const tempoption = e.data[option];                                            // Leave default options order (creation time) via property recreation
          delete e.data[option];
          e.data[option] = tempoption;
          if (excludeoption && excludeoption !== name)
             nonclonedids.push(+GetOptionStringId(option));                             // Add profile id to <nonclonedids> except <excludeoption> (template)
          continue;
         }
      if (lastid !== undefined) name += ` (id${++lastid})`;                             // Add ' (id<num>)' to option name
      if (lastid !== undefined) clonedids.push(lastid);                                 // Add profile id to <clonedids>
      flag = flag.replaceAll('*', '').replaceAll('-', '').replaceAll('+', '') + '+-';   // Remove clonable/removable/cloned flags and add clonable/removable ones only
      e.data[name + flag + style] = e.data[option];                                     // and rename it in element selectable data
      delete e.data[option];
      if ('type' in e.data[name + flag + style])
         e.data[name + flag + style].type.flag += '!';                                  // Make readonly element column type
     }
 return [nonclonedids, clonedids];
}

// Todo1 - adjust all views layout text areas commenting error jsons as a error ones
export function AdjustDatabase(dialog, odid, lastelementid, lastviewid)
{
 dialog.create.data = 'SAVE'; // Create btn is 'SAVE' btn after db conf dialog created
 let dbname = GetDialogElement(dialog, 'padbar/Database/settings/General/dbname')?.data; // Get db name
 if (typeof dbname !== 'string') dbname = '';
 dialog.title.data = `Database '${CutString(dbname.split('/').pop(), 10)}' configuration (id${odid})`; // Change dialog title 
 const [elementnonclonedids, elementclonedids] = CorrectProfileIds(GetDialogElement(dialog, 'padbar/Element/elements'), 'New element template', lastelementid);
 const [, viewclonedids] = CorrectProfileIds(GetDialogElement(dialog, 'padbar/View/views'), 'New view template', lastviewid);
 CorrectProfileIds(GetDialogElement(dialog, 'padbar/Rule/rules'));
 delete dialog.create.expr; // No grey btn 'CREATE' for empty db name that is used to remove OD
 return [elementnonclonedids, elementclonedids, viewclonedids];
}

export function CalcMacrosValue(name, value, collect = [])
{
 collect.push(name);
}

export async function EditDatabase(msg, client)
{
 if (!client) return; // No valid web socket client in controller clients map? Return
 let lastelementid = 0, lastviewid = 0, oldids = [];
 const transaction = await pool.connect();
 const restrictedsections = [];
 
 // Check user restriction to edit database first, for existing OD only. Todo0 - add group list to current user and release config OD restrinction at GETDATABASE
 if (msg.data.odid)
    {
     let e = GetDialogElement(controller.ods[msg.data.odid].dialog, 'padbar/Database/settings/Permissions/od');
     if (CheckUserMatch([client.username], e.data))
        {
         client.socket.send(JSON.stringify({ type: 'DIALOG', data: { dialog: DISALLOWEDTOCONFIGURATE, title: 'Error' } })); // Send error text to the client side
         return;
        }
     for (const name of ['Database', 'Element', 'View', 'Rule'])
         {
          e = GetDialogElement(controller.ods[msg.data.odid].dialog, `padbar/Database/settings/Permissions/${name}`);
          if (CheckUserMatch([client.username], e.data) && !DialogProfileCompare(GetOptionInSelectElement(controller.ods[msg.data.odid].dialog.padbar, name), GetOptionInSelectElement(msg.data.dialog.padbar, name)))
             {
              restrictedsections.push(name);
              msg.data.dialog.padbar.data[GetOptionNameInSelectElement(msg.data.dialog.padbar, name)] = controller.ods[msg.data.odid].dialog.padbar.data[GetOptionNameInSelectElement(controller.ods[msg.data.odid].dialog.padbar, name)];
             }
         }
    }

 try {
      await transaction.query('BEGIN');
      if (!CheckDatabaseConfigurationDialogStructure(msg.data.dialog)) // OD check is failed. Failed check is a faulsy result that means empty db name. For incorrect db structure exception is throwed and handled below
         {
          if (!msg.data.odid) // New OD creation
             {
              client.socket.send(JSON.stringify({ type: 'DIALOG', data: { dialog: INCORRECTDBCONFDBNAME, title: 'Error' } })); // Send error text to the client side for empty db name
              await transaction.query('ROLLBACK');
              return;
             }
          for (const table of ['head_', 'data_', 'metr_']) await transaction.query(...qm.Table(`${table}${msg.data.odid}`).Method('DROP').Make()); // Otherwise empty db name means OD removing, so drop corresponded tables
          for (const [, value] of controller.clients) value.socket.send(JSON.stringify({ type: 'SIDEBARDELETE', data: { odid: msg.data.odid } })); // and send OD remove msg to all wss clients
          delete controller.ods[msg.data.odid]; // Delete OD from app memory
          client.socket.send(JSON.stringify({ type: 'DIALOG', data: { dialog: 'Object Database is successfully removed!', title: 'Info' } })); // and send info mgs for client initiated removing
          await transaction.query('COMMIT');
          return;
         }
      if (!msg.data.odid) // OD check is passed, so process new OD creation (undefined msg.data.odid)
         {
          const tablelist = await transaction.query(...qm.Table().ShowTables().Make()); // Todo0 - Dont forget to keep limited database versions, it is impossible to keep all database changes history from it creation
          msg.data.odid = 0;
          for (const row of tablelist.rows) // Calculate current OD max index
              {
               const id = GetTableNameId(row.tablename);
               if (id && +id > msg.data.odid) msg.data.odid = +id;
              }
          msg.data.odid++; // and increment it
          await transaction.query(...qm.Table('head_' + msg.data.odid).Method('CREATE').Make()); // Create new databases and write its structure
          await transaction.query(...qm.Table('head_' + msg.data.odid).Method('CREATE').Fields({ id: { value: 'INTEGER', constraint: 'PRIMARY KEY GENERATED ALWAYS AS IDENTITY' },
                                                                                          datetime: { value: 'TIMESTAMP', constraint: 'DEFAULT CURRENT_TIMESTAMP' },
                                                                                          userid: 'INTEGER',
                                                                                          dialog: 'JSON',
                                                                                          lastelementid: 'INTEGER',
                                                                                          lastviewid: 'INTEGER',
                                                                                        }).Make());
          await transaction.query(...qm.Table('data_' + msg.data.odid).Method('CREATE').Make());
          await transaction.query(...qm.Table('data_' + msg.data.odid).Method('CREATE').Fields({ id: { value: 'INTEGER', constraint: 'GENERATED BY DEFAULT AS IDENTITY' },
                                                                                          version: { value: 'INTEGER', constraint: 'DEFAULT 1' },
                                                                                          lastversion: { value: 'BOOLEAN', constraint: 'DEFAULT TRUE' },
                                                                                          mask: 'TEXT',
                                                                                          ownerid: 'INTEGER',
                                                                                          owner: 'VARCHAR(125)',
                                                                                          datetime: { value: 'TIMESTAMP', constraint: 'DEFAULT CURRENT_TIMESTAMP' },
                                                                                          date: { value: 'DATE', constraint: 'DEFAULT CURRENT_DATE' },
                                                                                          time: { value: 'TIME', constraint: 'DEFAULT CURRENT_TIME' },
                                                                                          PRIMARY: 'KEY(id, version)',
                                                                                        }).Make());
          await transaction.query(...qm.Table('metr_' + msg.data.odid).Method('CREATE').Make());
          await transaction.query(...qm.Table('metr_' + msg.data.odid).Method('CREATE').Fields({ id: 'INTEGER',
                                                                                          datetime: { value: 'TIMESTAMPTZ', constraint: 'DEFAULT CURRENT_TIMESTAMP' },
                                                                                          date: { value: 'DATE', constraint: 'DEFAULT CURRENT_DATE' },
                                                                                          time: { value: 'TIME', constraint: 'DEFAULT CURRENT_TIME' },
                                                                                          value: 'FLOAT',
                                                                                        }).Make());
          await transaction.query(...qm.Table('metr_' + msg.data.odid, 'datetime').Method('CREATE').Make());
          await transaction.query(...qm.Table('metr_' + msg.data.odid, 'id').Method('WRITE').Make());
         }
       else // OD check is passed, so process existing OD change
         {
          const lastids = await transaction.query(...qm.Table(`head_${msg.data.odid}`).Method('SELECT').Fields(['lastelementid', 'lastviewid']).Order('id').Limit(1).Make()); // Calculate max (last) element/view ids of current OD configuration to set new element/view ids properly for the new OD instance came from client. For creating OD last element/view ids are zero
          [lastelementid, lastviewid] = [lastids?.rows?.[0]?.lastelementid, lastids?.rows?.[0]?.lastviewid];
          const e = GetDialogElement(controller.ods[msg.data.odid].dialog, 'padbar/Element/elements'); // Calculate OD existing elements id (into oldids array) to have opportunity compare them to new OD version, so delete OD new version unexisting ones
          if (e?.data && typeof e.data === 'object')
             for (const option in e.data)
                 if (!CompareOptionInSelectElement('New element template', option)) oldids.push(+GetOptionStringId(option));
         }
      const [elementnonclonedids, elementclonedids, viewclonedids] = AdjustDatabase(msg.data.dialog, msg.data.odid, lastelementid, lastviewid); // Adjust database dialog structure and write it to 'head_<odid>' table below
      await transaction.query(...qm.Table(`head_${msg.data.odid}`).Method('WRITE').Fields({ userid: client.userid,
                                                                                     dialog: {value: JSON.stringify(msg.data.dialog), escape: true},
                                                                                     lastelementid: elementclonedids.length ? elementclonedids.at(-1) : lastelementid,
                                                                                     lastviewid: viewclonedids.length ? viewclonedids.at(-1) : lastviewid }).Make());
      // Old OD version element ids (oldids) doesn't exist in new OD version noncloned elements? If so - element was removed by client, so corresponded column should be dropped                                                                                     
      for (const id of oldids)
          {
           if (elementnonclonedids.includes(id)) continue;
           await transaction.query(...qm.Table(`data_${msg.data.odid}`).Method('DROP').Fields(`${ELEMENTCOLUMNPREFIX}${id}`).Make());
           await transaction.query(...qm.Table(`metr_${msg.data.odid}`).Method('DROP').Fields(`${ELEMENTCOLUMNPREFIX}${id}`).Make());
          }
      // Go through all OD elements and create a new column for data/metr tables associated with a new elements got from cloned ids. Create/drop column indexes also
      const e = GetDialogElement(msg.data.dialog, 'padbar/Element/elements');
      if (e) for (const option in e.data)
         {
          const [name] = option.split(FIELDSDIVIDER, 1); // Split option to its name via FIELDSDIVIDER char '~'
          if (name === 'New element template') continue;
          const id = +GetOptionStringId(name);
          const index = GetDialogElement(msg.data.dialog, `padbar/Element/elements/${option}/index`, true);
          if (elementclonedids.indexOf(id) === -1) // Old element
             {
              if (index === GetDialogElement(controller.ods[msg.data.odid].dialog, `padbar/Element/elements/${option}/index`, true)) continue;
              if (index === 'None')
                 await transaction.query(...qm.Table(`data_${msg.data.odid}`).Method('DROP').Index().Fields(`${ELEMENTCOLUMNPREFIX}${id}`).Make()); // Drop index
               else
                 await transaction.query(...qm.Table(`data_${msg.data.odid}`).Method('CREATE').Index(index.includes('hash') ? 'hash' : 'btree').Fields({ [`${ELEMENTCOLUMNPREFIX}${id}`]: index.includes('UNIQUE') ? 'UNIQUE' : '' }).Make()); // Create index
              continue;
             }
          // New element
          await transaction.query(...qm.Table(`data_${msg.data.odid}`).Method('CREATE').Fields({ [`${ELEMENTCOLUMNPREFIX}${id}`]: e.data[option].type.data }).Make()); // Create new elements from cloned ids
          await transaction.query(...qm.Table(`metr_${msg.data.odid}`).Method('CREATE').Fields({ [`${ELEMENTCOLUMNPREFIX}${id}`]: 'VARCHAR(125)' }).Make()); // Create new elements from cloned ids
          if (index !== 'None') await transaction.query(...qm.Table(`data_${msg.data.odid}`).Method('CREATE').Index(index.includes('hash') ? 'hash' : 'btree').Fields({ [`${ELEMENTCOLUMNPREFIX}${id}`]: index.includes('UNIQUE') ? 'UNIQUE' : '' }).Make()); // Create index
         }
      await transaction.query('COMMIT');
     }
 catch (error)
     {
      await transaction.query('ROLLBACK');
      client.socket.send(JSON.stringify({ type: 'DIALOG', data: { dialog: error.message, title: 'Error' } }));
      lg(error);
      return;
     }
 finally
     {
      transaction.release();
     }
 if (restrictedsections.length) client.socket.send(JSON.stringify({ type: 'DIALOG', data: { dialog: `Configuration section${restrictedsections.length > 1 ? 's' : ''} '${restrictedsections.join('/')}' ${restrictedsections.length > 1 ? 'are' : 'is'} not modified due to user restrictions!`, title: 'Warning' } }));
 SuckLayoutAndQuery(msg.data.dialog, msg.data.odid); // Refresh dialog data in memory
 SendViewsToClients(msg.data.odid); // Refresh OD tree with its vews and folders to all wss clients
}

// { type: 'SIDEBARSET', odid: 13, path: 'System/Users', ov: { 1: ['test/view1a', '/vie1b'], 2: ['/folder/View2c', 'test/view2d'] } }
export function SendViewsToClients(odid, clients)
{
 if (typeof odid === 'number') odid += '';
 if (typeof odid !== 'string' && (!clients || typeof clients !== 'object')) return; // No views refresh both for all clients and all dbs
 let e;
 clients = (clients && typeof clients === 'object') ? new Map().set(clients, controller.clients.get(clients)) : controller.clients; // Create one single client to send views in case of its object type, otherwise - all clients array is used (controller.clients)

 for (const id in controller.ods) if (typeof odid !== 'string' || id === odid) // Go through all object databases for undefined odid or OD 'id' for exactly defined one
 for (const [, value] of clients) // Also go through all clients for selected OD above
     {
      if (!value.auth) continue;
      e = GetDialogElement(controller.ods[id].dialog, 'padbar/Database/settings/General/dbname');
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

// Function checks users/groups in <usersgroups> array (with username as a 1st element, and group names as other elements) agains input <list> and return match result or undefined for super user
function CheckUserMatch(usersgroups, list)
{
 if (!Array.isArray(usersgroups) || !usersgroups.length) return false;
 if (usersgroups[0] === SUPERUSER) return;

 for (let line of list.split('\n'))
     {
      if (!(line = line.trim())) continue;
      if (((line[0] === '!' && !usersgroups.includes(line.substring(1))) || (line[0] !== '!' && usersgroups.includes(line)))) return true;
     }
 return false;
}

// Function compares all elements data of profile1 with appropriate element data of profile2 and returns compare result
function DialogProfileCompare(profile1, profile2)
{
 for (const name in profile1)
     {
      const e1 = profile1[name];
      const e2 = profile2?.[name];
      if (!e1 || !e2) return;
      if (e1.type === 'select' && e1.data && typeof e1.data === 'object')
         {
          if (e2.type !== 'select' || !e2.data || typeof e2.data !== 'object' || Object.keys(e1.data).length !== Object.keys(e2.data).length) return;
          for (const option in e1.data)
              {
               const pos = option.indexOf('~');
               if (!DialogProfileCompare(e1.data[option], GetOptionInSelectElement(e2, pos === -1 ? option : option.substring(0, pos)))) return;
              }
          continue;
         }
      if (e1.data !== e2.data) return;
     }
 return true;
}

// Function is called at controller creation (constructor)
export async function ReadAllDatabase()
{
 let showtables, tables;
 try {
      showtables = await pool.query(...qm.Table().ShowTables().Make());
      tables = [];
     }
 catch
     {
      return;
     }

 for (const table of showtables.rows) tables.push(table.tablename);                                                              // Fill tables array to my DB sql tables
 for (const table of tables)
     {
      const odid = GetTableNameId(table);
      if (!tables.includes(`head_${odid}`) || !tables.includes(`data_${odid}`) || !tables.includes(`metr_${odid}`)) continue;    // OD is correct with all three tables exist
      if (!odid || odid in controller.ods) continue;        
      let dialog;                                                                                                                // Undefined odid or OD with id <odid> already sucked
      try {
           dialog = await pool.query(...qm.Table(`head_${odid}`).Method('SELECT').Fields('dialog').Order('id').Limit(1).Make()); // Get OD structure dialog last version from head_id table
           CheckDatabaseConfigurationDialogStructure(dialog?.rows?.[0]?.dialog);                                                 // and check it
          }
      catch
          {
           continue;
          }
      SuckLayoutAndQuery(dialog.rows[0].dialog, odid);
     }
}

function SuckLayoutAndQuery(dialog, odid)
{
 controller.ods[odid] = { dialog: dialog, query: {}, layout: {}, interactive: {}, elementprofiles: {} };

 const elements = GetDialogElement(dialog, 'padbar/Element/elements', true) || {};
 for (const option of Object.keys(elements))
     {
      const eid = GetOptionStringId(option);
      if (!eid) continue;
      controller.ods[odid].elementprofiles[ELEMENTCOLUMNPREFIX + eid] = {
                                            type: GetDialogElement(dialog, `padbar/Element/elements/${option}/type`, true).trim().toLowerCase(),
                                            name: GetDialogElement(dialog, `padbar/Element/elements/${option}/name`, true),
                                            description: GetDialogElement(dialog, `padbar/Element/elements/${option}/description`, true),
                                           };
     }

 const views = GetDialogElement(dialog, 'padbar/View/views', true) || {};
 for (const option of Object.keys(views))
     {
      const ovid = GetOptionStringId(option);
      if (!ovid) continue;
      const layout = ParseViewLayout(GetDialogElement(dialog, `padbar/View/views/${option}/settings/Layout/layout`, true), odid);
      const query = ParseViewQuery(dialog, layout, option, odid);
      controller.ods[odid].query[ovid] = query;
      controller.ods[odid].layout[ovid] = layout;
      controller.ods[odid].interactive[ovid] = IsViewInteractive(dialog, option);
     }
}

// +-----------------------------------------------------+
// |  [C] row: 0|1|2|3|4..||expression (r, c, q, o)      | 'digits' - zero based row number; 'expression' - r, c, q, o vars based expression; empty prop - any row; 
// |  [C] col: id|owner|e1|e2..|count(*)|${e1_prop}||    | sql select statement operands (columns); empty prop - any already defined col from jsons above; 
// |  [C] x,y (r, c, q, o)                               | r, c, q, o vars based expression
// |  [C] value PLAIN/SELECT/FUNCTION (x, y, r, c, q, o) | 
// |  [C] hint                                           | 
// |  [CT] event                                         | 
// |  [CT] collapserow, collapsecol                      | These props set to any values - collapses whole table rows/columns (for cell) and undefined rows/columns (for table)
// |  [CT] attributes                                    | Cell style property in attributes (in a addition to user defined cell ccs class in user style scheme) consists of mixed values of JSON type element style property, direct style definition in attributes
// +-----------------------------------------------------+
function CheckXYpropsCorrectness(object)
{
 return typeof object.x === 'string' && typeof object.y === 'string' && object.x && object.y && !NONEXPRESSIONCHARS.test(object.x) && !NONEXPRESSIONCHARS.test(object.y);
}

function TrimObjectProps(object, props)
{
 for (const prop of props)
     if (prop in object) 
        if (typeof object[prop] === 'string') object[prop] = object[prop].trim(); else delete object[prop];
}

function ParseViewLayout(jsons, odid)
{
 if (typeof jsons !== 'string') return;
 //const layout = { expressionrows: {}, undefinedrows: {}, table: {}, event: {}, originalcolumns: [], outputcolumns: [], stylecolumns: [], hintcolumns: [], elementnamecolumns: [], elementpropcolumns: [] };
 const layout = { expressionrows: {}, undefinedrows: {}, table: {}, event: {}, columns: [], systemelementnames: SYSTEMELEMENTNAMES }; // columns array has next fromat: { original:, output:, extra:, elementname:, elementprop:, elementprofilename:, elementprofiledescription: }

 for (let json of jsons.split('\n'))
     {
      // First step - convert json to object and trim some of its props
      try { json = JSON.parse(json); }
      catch { continue; }
      TrimObjectProps(json, LAYOUTTRIMABLEPROPS);

      // Second step - set cell/table specific 'event' property. Last event reference is always used
      if (typeof json.event === 'string') for (const prop of LAYOUTEVENTPROPS) if (typeof json[prop] === 'string') layout.event[prop] = json[prop];

      // Third steap - each layout json describes some props specific for table or cell. Since no x/y/row props set - json is table specific, other cases - cell specific. Copy table props first
      if (!('x' in json) && !('y' in json) && !('row' in json))
         {
          for (const prop of LAYOUTTABLEPROPS) if (typeof json[prop] === 'string') layout.table[prop] = json[prop];
          continue;
         }

      // Forth step - property list is cell specific (previous step didn't continue). So fisrt check undefined rows (custom data from non db selection). Props x/y should be defined properly in case. Use correct x/y combined property as a key in a layout.undefinedrows object
      if (!('row' in json))
         {
          if (!CheckXYpropsCorrectness(json)) continue;
          const xy = `${json.x}~${json.y}`;
          if (!(xy in layout.undefinedrows)) layout.undefinedrows[xy] = {};
          for (const prop of LAYOUTCELLPROPS) if (typeof json[prop] === 'string') layout.undefinedrows[xy][prop] = json[prop];
          continue;
         }

      // Next step - check row property syntax and pasre column list in json.col splited via '|' then
      if (NONEXPRESSIONCHARS.test(json.row)) continue; // Row does exist, but incorrect, consisting of illegal expression chars? Continue. Old version check also continues for empty json.row (which is correct), not considering defined columns for correct row syntax: if (!json.row || NONEXPRESSIONCHARS.test(json.row)) continue;
      const startcolumnindex = 'col' in json ? layout.columns.length : 0; // Fix column index to start with to defined wich columns should be processed. No prop 'col' defned - process all columns previously defined (start index = 0), otherwise start with new column index (start index = layout.columns array length)
      if ('col' in json) for (let original of json.col.split('|'))
         {
          if (!(original = original.trim())) continue;
          let newcolumn;
          for (const column of layout.columns) if (column.original === original && (newcolumn = column)) break; // Go through all previously defined columns and check match for current output column. Assign newcolumn to the matched column
          if (newcolumn) continue;

          layout.columns.push(newcolumn = { original: original }); // Otherwise create new column object
          [newcolumn.elementname, newcolumn.elementprop] = qm.GetColumnElementAndProp(original); // Function qm.GetColumnElementAndProp returns object element name (or null if original column is not an object element) with its prop (or null if object element has non-JSON type or JSON property unset)
          if (!newcolumn.elementname) continue; // New column is not an object element (id|date|time|user|eid1|eid2..)? Continue. Otherwise

          const elementprofile = controller.ods[odid].elementprofiles[newcolumn.elementname]; // New column is an object element, so get it profile props such as 'name' for header, 'description' for hint and 'type' for extra columns to query (for json/jsonb element types only)
          if (elementprofile) [newcolumn.elementprofilename, newcolumn.elementprofiledescription, newcolumn.elementprofiletype] = [elementprofile.name, elementprofile.description, elementprofile.type]; // Unknown profile in OD properties (for system elements probably)? Store element profile name/description/type
         }

      // Last step - assign cell props to layout.expressionrows[json.row] for every defined column in previous step (currentcolumns array)
      for (const cellprop of LAYOUTCELLPROPS) // Go through all cell specific string props
      if (typeof json[cellprop] === 'string') // and choose string type only
      for (let i = startcolumnindex; i < layout.columns.length; i++) // Via startcolumnindex set above - for undefined json.col use all perviously defined columns, for defined json.col use columns set in json.col.
          {
           const column = layout.columns[i].original;
           if (!(json.row in layout.expressionrows)) layout.expressionrows[json.row] = {};
           if (!(column in layout.expressionrows[json.row])) layout.expressionrows[json.row][column] = {};
           layout.expressionrows[json.row][column][cellprop] = json[cellprop]; // Set json cell props for every column 
          }
     }

 return layout;
}

function GetColumnIndex(columns, search)
{
 for (let i = 0; i < columns.length; i++) if (columns[i].original === search) return i;
}

// {"row":"", "col":"id|eid1|eid2||", "x":"0", "y":"0"}
// {"row":"", "col":"id|eid1|datetime::varchar(11)|", "x":"0", "y":"0"}
// if (['Actual data', 'Historical data'].includes(from) && !groupby && layout.cols.indexOf('id') === -1) query += query ? ',id' : 'id';
// if (['Actual data', 'Historical data'].includes(from) && !groupby && layout.cols.indexOf('lastversion') === -1) query += query ? ',lastversion' : 'lastversion';
function ParseViewQuery(dialog, layout, viewprofile, odid)
{
 // Initializate SELECT statement result query
 let select = [];
 for (const column of layout.columns) select.push(column.original);
 if (IsViewInteractive(dialog, viewprofile)) [layout.columnidindex, layout.columnlastversionindex] = [ GetColumnIndex(layout.columns, 'id') ?? select.push('id') - 1, GetColumnIndex(layout.columns, 'lastversion') ?? select.push('lastversion') - 1]; // Operator returns left operand if it's not nill or undefined, and returns right operand otherwise
 for (const column of layout.columns) if (['json', 'jsonb'].includes(column.elementprofiletype)) column.columnattributeindex = GetColumnIndex(layout.columns, qm.ExtractJSONPropField(column.elementname, 'attributes')) ?? select.push(qm.ExtractJSONPropField(column.elementname, 'attributes')) - 1;
 select = `SELECT ${select.join(',')}`; 

 // Initializate FROM statement result query
 let from = GetDialogElement(dialog, `padbar/View/views/${viewprofile}/settings/Selection/from`, true).trim();
 if (from === 'Time series data') from = ` FROM metr_${odid}`; else from = from === 'None' ? '' : ` FROM data_${odid}`;

 // Initializate WHERE statement result query
 let where = GetDialogElement(dialog, `padbar/View/views/${viewprofile}/settings/Selection/where`, true).trim();
 if (IsViewActual(dialog, viewprofile)) where = where ? `WHERE (${where.substring('WHERE '.length)}) AND lastversion = TRUE` : `WHERE lastversion = TRUE`;

 // Initializate GROUPBY statement result query
 const groupby = IsViewInteractive(dialog, viewprofile) ? '' : GetDialogElement(dialog, `padbar/View/views/${viewprofile}/settings/Selection/groupby`, true).trim(); // Old version: groupby = ['Interactive actual data', 'Interactive historical data'].includes(from) ? '' : groupby.trim();

 // Initializate LIMIT statement result query
 const limit = GetDialogElement(dialog, `padbar/View/views/${viewprofile}/settings/Selection/limit`, true).trim();

 return `${select} ${from} ${where} ${groupby} ${limit}`;
}

function IsViewInteractive(dialog, viewprofile)
{
 return ['Interactive actual data', 'Interactive historical data'].includes(GetDialogElement(dialog, `padbar/View/views/${viewprofile}/settings/Selection/from`, true));
}

function IsViewActual(dialog, viewprofile)
{
 return ['Interactive actual data', 'Actual data'].includes(GetDialogElement(dialog, `padbar/View/views/${viewprofile}/settings/Selection/from`, true));
}

function IsViewObjectable(dialog, viewprofile)
{
 return ['Interactive actual data', 'Actual data', 'Interactive historical data', 'Historical data'].includes(GetDialogElement(dialog, `padbar/View/views/${viewprofile}/settings/Selection/from`, true));
}
