import { DBNAME, qm, pool, controller } from './main.js';
import * as globals from './globals.js';



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