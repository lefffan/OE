import { DBNAME, qm, pool, controller } from './main.js';
import * as globals from './globals.js';

const DISALLOWEDTOCONFIGURATE   = 'You are not allowed to configurate this Object Database!';

// Todo1 - adjust all views layout text areas commenting error jsons as a error ones
export function AdjustDatabase(dialog, odid, lastelementid, lastviewid)
{
 dialog.ok.data = 'SAVE'; // Create btn is 'SAVE' btn after db conf dialog created
 let dbname = globals.GetDialogElement(dialog, 'padbar/Database/settings/General/dbname', true); // Get db name
 if (typeof dbname !== 'string') dbname = '';
 dialog.title.data = `Database '${globals.CutString(dbname.split('/').pop())}' configuration (id${odid})`; // Change dialog title 
 const [elementnonclonedids, elementclonedids] = globals.CorrectProfileIds(globals.GetDialogElement(dialog, 'padbar/Element/elements'), 'New element template', lastelementid);
 const [, viewclonedids] = globals.CorrectProfileIds(globals.GetDialogElement(dialog, 'padbar/View/views'), 'New view template', lastviewid);
 globals.CorrectProfileIds(globals.GetDialogElement(dialog, 'padbar/Rule/rules'));
 delete dialog.ok.expr; // No grey btn 'CREATE' for empty db name that is used to remove OD
 return [elementnonclonedids, elementclonedids, viewclonedids];
}

// Function creates new or edit existing OD received in msg and send a dialog msg to client socket in case of a error. Var <init> indicates the initial OD 'Users' creating by the main script
export async function EditDatabase(msg, client, init)
{
 if (!client && !init) return; // No valid web socket client in controller clients map? Return
 let lastelementid = 0, lastviewid = 0, oldids = [];
 const transaction = await pool.connect();
 if (!transaction) throw new Error(globals.TRANSACTIONERROR);
 const restrictedsections = [];

 if (msg.data.odid && !controller.ods?.[msg.data.odid]?.dialog) return; // Specified OD in <msg.data.odid> doesn't exist in controller memory? Return
 
 // Check user restriction to edit database first, for existing OD only. Todo0 - add group list to current user check and release config OD restrinction at GETDATABASE
 if (msg.data.odid)
    {
     let e = globals.GetDialogElement(controller.ods[msg.data.odid].dialog, 'padbar/Database/settings/Permissions/od');
     if (globals.CheckItemsToMatchTheList([client.username], e.data))
        {
         client.socket.send(JSON.stringify({ type: 'WARNING', data: { content: DISALLOWEDTOCONFIGURATE, title: 'Error' } })); // Send error text to the client side
         return;
        }
     for (const name of ['Database', 'Element', 'View', 'Rule'])
         {
          e = globals.GetDialogElement(controller.ods[msg.data.odid].dialog, `padbar/Database/settings/Permissions/${name}`);
          if (globals.CheckItemsToMatchTheList([client.username], e.data) && !globals.DialogProfileCompare(globals.GetOptionInSelectElement(controller.ods[msg.data.odid].dialog.padbar, name), globals.GetOptionInSelectElement(msg.data.dialog.padbar, name)))
             {
              restrictedsections.push(name);
              msg.data.dialog.padbar.data[globals.GetOptionNameInSelectElement(msg.data.dialog.padbar, name)] = controller.ods[msg.data.odid].dialog.padbar.data[globals.GetOptionNameInSelectElement(controller.ods[msg.data.odid].dialog.padbar, name)];
             }
         }
    }

 try {
      await transaction.query('BEGIN');

      // OD check is failed. Failed check is a faulsy result that means empty db name. For incorrect db structure exception is throwed and handled below
      if (!globals.CheckDatabaseConfigurationDialogStructure(msg.data.dialog, msg.data.odid ? 'edit' : 'create')) // Remove OD below for a faulsy result (empty od name)
         {
          for (const table of ['head_', 'data_', 'metr_']) await transaction.query(...qm.Table(`${table}${msg.data.odid}`).Method('DROP').Make()); // Drop all OD related tables
          for (const [, value] of controller.clients) value.socket.send(JSON.stringify({ type: 'SIDEBARDELETE', data: { odid: msg.data.odid } })); // and send OD remove msg to all wss clients
          delete controller.ods[msg.data.odid]; // Delete OD from app memory
          client.socket.send(JSON.stringify({ type: 'WARNING', data: { content: 'Object Database is successfully removed!', title: 'Info' } })); // and send info mgs for client initiated removing
          await transaction.query('COMMIT');
          return;
         }

      // OD check is passed, so process new OD creation (undefined msg.data.odid)  
      if (!msg.data.odid)
         {
          const tablelist = await transaction.query(...qm.Table().ShowTables().Make()); // Todo0 - Dont forget to keep limited database versions, it is impossible to keep all database changes history from it creation
          msg.data.odid = 0;
          for (const row of tablelist.rows) // Calculate current OD max index
              {
               const id = globals.GetTableNameId(row.tablename);
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
                                                                                          owner: `VARCHAR(${globals.USERNAMEMAXCHAR})`,
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
          // Create custom user data table <rand_N> in a addition to <data_N>/<metr_N> to insert any non application data
          await transaction.query(...qm.Table('rand_' + msg.data.odid).Method('CREATE').Make());
          // Create readonly and read/write user roles for data, metr and rand tables
          await transaction.query(...qm.Table(`data_${msg.data.odid},metr_${msg.data.odid},rand_${msg.data.odid}`, null, DBNAME).Method('CREATE').Role(`rouserodid${msg.data.odid}`, 'SELECT').Make());
          await transaction.query(...qm.Table(`data_${msg.data.odid},metr_${msg.data.odid},rand_${msg.data.odid}`, null, DBNAME).Method('CREATE').Role(`rwuserodid${msg.data.odid}`, 'SELECT, INSERT, UPDATE, DELETE').Make());
         }
       else // OD check is passed, so process existing OD change
         {
          const lastids = await transaction.query(...qm.Table(`head_${msg.data.odid}`).Method('SELECT').Fields(['lastelementid', 'lastviewid']).Order('id').Limit(1).Make()); // Calculate max (last) element/view ids of current OD configuration to set new element/view ids properly for the new OD instance came from client. For creating OD last element/view ids are zero
          [lastelementid, lastviewid] = [lastids?.rows?.[0]?.lastelementid, lastids?.rows?.[0]?.lastviewid];
          const e = globals.GetDialogElement(controller.ods[msg.data.odid].dialog, 'padbar/Element/elements'); // Calculate OD existing elements id (into oldids array) to have opportunity compare them to new OD version, so delete OD new version unexisting ones
          if (e?.data && typeof e.data === 'object')
             for (const option in e.data)
                 if (!globals.CompareOptionInSelectElement('New element template', option)) oldids.push(+globals.GetOptionNameId(option));
         }
      const [elementnonclonedids, elementclonedids, viewclonedids] = AdjustDatabase(msg.data.dialog, msg.data.odid, lastelementid, lastviewid); // Adjust database dialog structure and write it to 'head_<odid>' table below
      await transaction.query(...qm.Table(`head_${msg.data.odid}`).Method('WRITE').Fields({ userid: init ? globals.PRIMARYKEYSTARTVALUE : client.userid,
                                                                                     dialog: {value: JSON.stringify(msg.data.dialog), escape: true},
                                                                                     lastelementid: elementclonedids.length ? elementclonedids.at(-1) : lastelementid,
                                                                                     lastviewid: viewclonedids.length ? viewclonedids.at(-1) : lastviewid }).Make());

      // Old OD version element ids (oldids) doesn't exist in new OD version noncloned elements? If so - element was removed by client, so corresponded column should be dropped. For non initial db creating only
      if (!init)
      for (const id of oldids)
          {
           if (elementnonclonedids.includes(id)) continue;
           await transaction.query(...qm.Table(`data_${msg.data.odid}`).Method('DROP').Fields(`${globals.ELEMENTCOLUMNPREFIX}${id}`).Make());
           await transaction.query(...qm.Table(`metr_${msg.data.odid}`).Method('DROP').Fields(`${globals.ELEMENTCOLUMNPREFIX}${id}`).Make());
          }

      // Go through all OD elements and create a new column for data/metr tables associated with a new elements got from cloned ids. Create/drop column indexes also
      const e = globals.GetDialogElement(msg.data.dialog, 'padbar/Element/elements');

      if (e) for (const option in e.data)
         {
          const [name] = option.split(globals.FIELDSDIVIDER, 1); // Split option to its name via FIELDSDIVIDER char '~'
          if (name === 'New element template') continue;
          const id = +globals.GetOptionNameId(name);
          const index = globals.GetDialogElement(msg.data.dialog, `padbar/Element/elements/${option}/index`, true);
          if (!init && elementclonedids.indexOf(id) === -1) // Old element
             {
              if (index === globals.GetDialogElement(controller.ods[msg.data.odid].dialog, `padbar/Element/elements/${option}/index`, true)) continue;
              if (index === 'None')
                 await transaction.query(...qm.Table(`data_${msg.data.odid}`).Method('DROP').Index().Fields(`${globals.ELEMENTCOLUMNPREFIX}${id}`).Make()); // Drop index
               else
                 await transaction.query(...qm.Table(`data_${msg.data.odid}`).Method('CREATE').Index(index.includes('hash') ? 'hash' : 'btree').Fields({ [`${globals.ELEMENTCOLUMNPREFIX}${id}`]: index.includes('UNIQUE') ? 'UNIQUE' : '' }).Make()); // Create index
              continue;
             }
          // New element for data table
          await transaction.query(...qm.Table(`data_${msg.data.odid}`).Method('CREATE').Fields({ [`${globals.ELEMENTCOLUMNPREFIX}${id}`]: e.data[option].type.data }).Make()); // Create new elements from cloned ids
          // New element for metr hypertable, so it results to next columns: id, datetime, date, time, value, eid1, eid2 - where 'id' is an object id; 'eid1..' is an object element property name (null or string) to retreive time 'value' by; 
          await transaction.query(...qm.Table(`metr_${msg.data.odid}`).Method('CREATE').Fields({ [`${globals.ELEMENTCOLUMNPREFIX}${id}`]: `VARCHAR(${globals.USERNAMEMAXCHAR})` }).Make()); // Create new elements from cloned ids
          if (index !== 'None') await transaction.query(...qm.Table(`data_${msg.data.odid}`).Method('CREATE').Index(index.includes('hash') ? 'hash' : 'btree').Fields({ [`${globals.ELEMENTCOLUMNPREFIX}${id}`]: index.includes('UNIQUE') ? 'UNIQUE' : '' }).Make()); // Create index
         }
      await transaction.query('COMMIT');
     }
 catch (error)
     {
      await transaction.query('ROLLBACK');
      console.log(error);
      if (!init) client.socket.send(JSON.stringify({ type: 'WARNING', data: { content: error.message, title: 'Error' } }));
      return;
     }
 finally
     {
      if (!transaction) transaction.release();
     }

 if (init) return; // Return for initial db creating, otherwise check some restrictions and suck OD structure in memory below
 if (restrictedsections.length) client.socket.send(JSON.stringify({ type: 'WARNING', data: { content: `Configuration section${restrictedsections.length > 1 ? 's' : ''} '${restrictedsections.join('/')}' ${restrictedsections.length > 1 ? 'are' : 'is'} not modified due to user restrictions!` } }));
 SuckInODProps(msg.data.dialog, msg.data.odid); // Refresh dialog data in memory
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
      e = globals.GetDialogElement(controller.ods[id].dialog, 'padbar/Database/settings/General/dbname');
      if (!e) throw new Error(INCORRECTDBCONFDIALOG);
      const msg = { type: 'SIDEBARSET', data: { odid: id, path: e.data, ov: {} } }; // Create message for OD 'id' with its path (e.data) and views defined below
      e = globals.GetDialogElement(controller.ods[id].dialog, 'padbar/View/views');
      if (!e) throw new Error(INCORRECTDBCONFDIALOG);

      for (const option in e.data) // Go through all view profiles
          {
           if (globals.CompareOptionInSelectElement('New view template', option)) continue; // except view template
           const ovid = globals.GetOptionNameId(option); // Get view id from option name
           const aliases = globals.GetDialogElement(controller.ods[id].dialog, `padbar/View/views/${option}/settings/General/name`); // and all view aliases
           if (!aliases || typeof aliases.data !== 'string' || typeof ovid !== 'string') throw new Error(INCORRECTDBCONFDIALOG); // Throw an error for incorrect view profile
           msg.data.ov[ovid] = []; // Create aliases array first
           for (let alias of aliases.data.split('\n')) // and split aliases data to one by line alias to add it to message 'ov' array
               if (alias = alias.trim()) msg.data.ov[ovid].push(alias);
          }

      value.socket.send(JSON.stringify(msg)); // Todo2 - should pause (via setTimeout(0, )) be between two socket msg sendings keep non blocking main thread?
     }
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

 for (const table of showtables.rows) tables.push(table.tablename);                                                                     // Fill tables array to my DB sql tables
 console.log(`Database ${DBNAME} table list:`, tables);

 for (const table of tables)
     {
      const odid = globals.GetTableNameId(table);                                                                                               // Get table idm table name format: <head|data|metr>_id
      if (!odid || !tables.includes(`head_${odid}`) || !tables.includes(`data_${odid}`) || !tables.includes(`metr_${odid}`))
         {
          console.log('Undefined id in table name or necessary tables absent! All three tables for any OD should be in next format: <head|data|metr>_id');
          continue;
         }
      if (odid in controller.ods) continue;                                                                                             // OD with id <odid> already sucked in

      try {
           const dialog = await pool.query(...qm.Table(`head_${odid}`).Method('SELECT').Fields('dialog').Order('id').Limit(1).Make());  // Get OD structure dialog last version from head_id table
           globals.CheckDatabaseConfigurationDialogStructure(dialog?.rows?.[0]?.dialog, 'read');                                                // and check it
           SuckInODProps(dialog.rows[0].dialog, odid);
          }
      catch (error)
          {
           console.log(error);
          }
     }
}

function SuckInODProps(dialog, odid)
{
 controller.ods[odid] = { dialog: dialog, query: {}, layout: {}, elementprofiles: {} };

 const elements = globals.GetDialogElement(dialog, 'padbar/Element/elements', true) || {};
 for (const option of Object.keys(elements))
     {
      const eid = globals.GetOptionNameId(option);
      if (!eid) continue;
      controller.ods[odid].elementprofiles[globals.ELEMENTCOLUMNPREFIX + eid] = {
                                            type: globals.GetDialogElement(dialog, `padbar/Element/elements/${option}/type`, true).trim().toLowerCase(),
                                            name: globals.GetDialogElement(dialog, `padbar/Element/elements/${option}/name`, true),
                                            description: globals.GetDialogElement(dialog, `padbar/Element/elements/${option}/description`, true),
                                           };
     }

 const views = globals.GetDialogElement(dialog, 'padbar/View/views', true) || {};
 for (const option of Object.keys(views))
     {
      const ovid = globals.GetOptionNameId(option);
      if (!ovid) continue;
      const layout = ParseViewLayout(globals.GetDialogElement(dialog, `padbar/View/views/${option}/settings/Selection/layout`, true), odid);
      const query = ParseViewQuery(globals.GetDialogElement(dialog, `padbar/View/views/${option}/settings/Selection/query`, true), layout);
      controller.ods[odid].query[ovid] = query;
      controller.ods[odid].layout[ovid] = layout;
     }
}
 
// +-------------------------------------------------+
// |  row: boolean expression                        | vars <r>, <c>, <table> based expression (boolean result) to match the selection row ; empty property is a faulsy case, so no any row matched
// |  col: id|owner|e1|e2..|count(*)|${e1_prop}||    | sql select statement operands (columns); empty col - any already defined col from previous jsons are used; 
// |  x,y: number expression                         | vars <r>, <c>, <table> based expression (number result) to place the cell with x,y props table coordinates. Vars <r> and <c> are undefined for virtual cells
// |  value: string [expression]                     | For virtual cells only - macros form vars <x>, <y>, <table> based expression (string result) to overwrite cell text content which is dinamycly refreshed at any table data refresh
// |  hint: clear text                               | Cell hint text
// |  style: clear text                              | Cell html element style attribute value
// |  collapserow, collapsecol: clear text           | These prop any value does collapse whole table rows/columns (for cell) and undefined rows/columns (for table)
// |  event: clear text                              | Event ('ADDOBJECT', 'DELETEOBJECT', 'CONFIRMEDIT/PASTE', and all mouse/keyboards ones) to emulate at OV open. The property is a string begining with event name and with event data (for CONFIRMEDIT/PASTE events only) then.
// |                                                 | The event is applied to the cursor cell. Unsupport event name or non interactive cell - no emulation, but cursor is set to the position specified by <x>, <y> (with x=0, y=0 values for default) coordinates anyway, so JSON '{"event":"", "x":"q-1", "y":"2"}' sets cursor to the last row third column. As it was mentioned below - tell about no data for KEYPRESS
// +-------------------------------------------------+
// Todo0 - Limitations for code in all expressions in json string props should be released in a JS future specification named SHADOW REALMS
function ParseViewLayout(jsons, odid)
{
 if (typeof jsons !== 'string') return;
 const layout = { dbdata: {}, nondbdata: {}, columns: [] }; // <columns> array has next fromat: { original:, elementname:, elementprop:, elementprofilename:, elementprofiledescription:, elementprofiletype: }, also 5 props added at client side: event, collapsedrows[], collapsedcols[], collapseundefinedrows, collapseundefinedcols

 for (let json of jsons.split('\n'))
     {
      // First step - convert json to object, clear it from unnecessary props, trim them all except "value" and check json correctness (valid json doesn't have row/col props at all or has them both)
      try { json = JSON.parse(json); }
      catch { continue; }
      for (const prop in json)
          if (!globals.LAYOUTJSONPROPS.includes(prop) || typeof json[prop] !== 'string') delete json[prop];
           else if (prop !== 'value') json[prop] =  json[prop].trim();
      if (!('row' in json) && 'col' in json) continue;
      if (!('col' in json) && 'row' in json) continue;

      // Second step - since no "row" and "col" props defined the json describes custom data pulling it from not db selection, but from "value" property and placing to the table cell with x/y coordinates. Use correct x/y combined property as a key in a layout.undefinedrows object
      if (!('row' in json))
         {
          if (!Object.keys(json).length) continue; // No any props at all? Continue
          const xy = `${json.x || ''}~${json.y || ''}`; // Define unique x~y combined propery to store json
          layout.nondbdata[xy] = Object.assign(layout.nondbdata[xy] || {}, json); // Copy json props to layout.nondbdata[xy]
          continue;
         }

      // Next step - pasre column list in json.col splited via '|' then
      if (Object.keys(json).length < 3) continue; // Props count low than 3 means only row/col props defined which is incorrect
      const currentcolumns = json.col ? [] : layout.columns;
      for (let original of json.col.split('|'))
          {
           if (!(original = original.trim())) continue; // No action for empty column
           let newcolumn;
           for (const column of layout.columns) if (column.original === original && (newcolumn = column)) break; // Go through all previously defined columns and check match for current splited column name (original). Assign newcolumn to the found column
           if (newcolumn && currentcolumns.push(newcolumn)) continue; // Previously defined column matches current, so fix it in current columns array and continue
           layout.columns.push(newcolumn = { original: original }); // Otherwise create new column object and store it in a layout
           currentcolumns.push(newcolumn); // Fix it in current columns array also
           [newcolumn.elementname, newcolumn.elementprop] = qm.GetColumnElementAndProp(original); // Function qm.GetColumnElementAndProp returns object element name (or null if original column is not an object element) with its prop (or null if object element has non-JSON type or JSON property unset)
           if (!newcolumn.elementname) continue; // New column is not an object element (id|date|time|user|eid1|eid2..)? Continue
           const elementprofile = controller.ods[odid].elementprofiles[newcolumn.elementname]; // New column is an object element, so get its profile props such as 'name' for header, 'description' for hint and 'type' (json/jsonb element types causes extra args in SELECT statements, such as style/hint)
           if (!elementprofile) continue;
           [newcolumn.elementprofilename, newcolumn.elementprofiledescription, newcolumn.elementprofiletype] = [elementprofile.name, elementprofile.description, elementprofile.type]; // Unknown profile in OD properties (for system elements probably)? Store element profile name/description/type
          }

      // Last step - assign cell props to layout.dbdata[json.row] for every defined column in previous step (currentcolumns array)
      for (let column of currentcolumns) // For undefined json.col use all perviously defined columns, for defined json.col use columns set in json.col.
          {
           column = column.original; // Pull column original name to use it as a key in a layout dbdata
           if (!(json.row in layout.dbdata)) layout.dbdata[json.row] = {}; // Create json.row key empty object in a layout dbdata (if it doesn't exist)
           layout.dbdata[json.row][column] = Object.assign(layout.dbdata[json.row][column] || {}, json); // and copy all json props to it for specified column name
          }
     }

 return layout;
}

function ParseViewQuery(query, layout)
{
 const select = [];
 for (const column of layout.columns) select.push(column.original);
 return globals.MacrosReplace(query.trim(), { COLUMNS: select.join(',') })
}

// Todo2 - change '*', '!' to const var and others
// Todo0 - all DB dialog settings workable