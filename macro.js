// Macros names is replaced by appropriate macros values. Undefined macros names are replaced by empty strings. User defined empty macros name is correct, but is not recomended
// Macros types:
//     System (General): ${RANDOM} ${DATE} ${DATETIME} ${TIME} ${NULL} ${USERNAME} ${USERID} ${ELEMENTCOLUMNPREFIX}
//     System (View):    ${OD} ${OV} ${ODID} ${OVID} ${LAYOUT H,N,id,1,2,3} ${DBDATATBLNAME}
//     System (Event):   ${EVENTNAME} ${OID} ${EID} ${EPROP} ${EVENTDATA} ${ELEMENT}
//     Element:          ${"odid": "6", "ovid": "6", "oid": "id=7 AND lastversion=true", "ename": "edi2", "eprop": "value", "limit": "1" }, all macros names in parentheses are interpreted as usual macros names, except ones in JSON format. Once the string inside is any correct JSON, it becomes 'element' type macros and defines object element to retreive the data from
//     Dialog:           OV args in OD settings
//     Database:         macros in general OD settings
// Application processes with macro types order to apply:
//     Selection layout/query fields at OV calls:               dialog, database, system (view-general)
//          Function call trace:
//              SendView() -> DefineSystemMacros(), MacrosReplace() for layout/query
//     Rule 'message'/'query' fields at client/handler events:  dialog, database, system (view-general-event)
//          Function call trace:
//              CheckRules() -> DefineSystemMacros(), MacrosReplace() for rule query; MacrosReplace() for rule message
//     Handler data at client/controller events:                dialog, database, system (view-general-event), element (element is last for dialog macroses can overwrite element ones for debug purposes)
//     User customization apply at login:                       system(general)

import * as globals from './globals.js';
import * as qm from './querymaker.js';

const SYSTEMSTATICMACROS    = { USERNAME: 'username', USERID: 'userid', OD: 'od', OV: 'ov', ODID: 'odid', OVID: 'ovid', OID: 'oid', EID: 'eid', EPROP: 'eprop', ELEMENT: null, EVENTNAME: 'type', EVENTDATA: 'data', RANDOM: null, DATE: null, TIME: null, DATETIME: null, NULL: null, DBDATATBLNAME: null, ELEMENTCOLUMNPREFIX: null };
const SYSTEMDYNAMICMACROS   = { LAYOUT: null };
const DIGITS                = /^\d*$/;

// The function determines whether the macro name is dynamic or not. And returns macro name if it is
function IsSystemDynamicMacro(macroname)
{
 for (const name in SYSTEMDYNAMICMACROS)
     if (name === macroname.substring(0, name.length)) return name;
}

// Incoming <args> is an array of macro objects with macro names as a keys for corresponded macro values
export function DefineSystemMacros(...macroobjects)
{
 const now = new Date();
 const systemmacros = {};

 // First add macro object wich macros should be defined just right at initialization
 macroobjects.push({ RANDOM: Math.round(Math.random() * 100), DATE: now.toLocaleDateString(), TIME: now.toLocaleTimeString(), DATETIME: now.toLocaleString(), NULL: '', DBDATATBLNAME: 'data_${ODID}', ELEMENTCOLUMNPREFIX: globals.ELEMENTCOLUMNPREFIX });

 // Then go through all macro names in SYSTEMSTATICMACROS
 for (const macroname in SYSTEMSTATICMACROS)
     {
      const searchmacroname = SYSTEMSTATICMACROS[macroname] === null ? macroname : SYSTEMSTATICMACROS[macroname]; // and define macro name to search in macro objects - macro name is untouched for null or is <SYSTEMSTATICMACROS[macroname]> for not null
      for (const macroobject of macroobjects) //  Macro name is defined, so go through all macro objects to search it
          {
           if (typeof macroobject[searchmacroname] !== 'string' && (!macroobject[searchmacroname] || typeof macroobject[searchmacroname] !== 'object')) continue; // Continue for non string/object types
           try { systemmacros[macroname] = typeof macroobject[searchmacroname] === 'string' ? macroobject[searchmacroname] : JSON.stringify(macroobject[searchmacroname]); } // or defined macro as a string or as an serialized object
           catch {}
          }
     }

 // And return inited system macros adding 'ELEMENT' macro that is used to represent element id and its prop. Key feature is to define whether element prop exists or just empty
 return Object.assign(systemmacros, { ELEMENT: JSON.stringify(Object.assign('EID' in systemmacros ? { id: systemmacros.EID } : {}, 'EPROP' in systemmacros ? { prop: systemmacros.EPROP } : {})) });
}

// Dynamic function names <DefineMacro${DYNAMICMACRONAME}()> define dynamic macro values for appropriate dynamic macros
// Dynamic macro is a macro that starts with macro name of itself and then some user defined comma separated args
// Dynamic macro 'LAYOUT' example: ${LAYOUT H,N,1-,2-2,3,-4,-}, where H/h and N/n are header and new objects, and numbers are column position (1st column is 0, second column is 1..), char '-' indicates range, missed number ina range is zero (left side) or last column position (right side)
export function DefineMacroLAYOUT(macro, replacements)
{
 let layout = '', y = {}, ranges = globals.AdjustRangeString(macro); // Adjust range, all unnecessary string (just like 'LAYOUT', 'N' or 'H') will be cut off
 for (let e of macro.substring('LAYOUT'.length).trim().split(',')) if (e = e.trim())
     {
      if (!y.header && (e === 'H' || e === 'h')) y.header = `0${'new' in y ? '+1' : ''}${'data' in y ? '+q' : ''}`; // Header object
      if (!y.new && (e === 'N' || e === 'n')) y.new = `0${'header' in y ? '+1' : ''}${'data' in y ? '+q' : ''}`; // New object
      if (!y.data && ranges) y.data = `i${'header' in y ? '+1' : ''}${'new' in y ? '+1' : ''}`; // Add 'data' object for no header/new object
     }

 for (const prop in y)
     if (prop === 'header') layout += `{ "row": "r===-2", "col": "${ranges || '0-'}", "x": "", "y": "${y.prop}" }\n`; // For empty range string (no any index column specified) - select all column indexes
      else if (prop === 'new') layout += `{ "row": "r===-1", "col": "${ranges || '0-'}", "x": "", "y": "${y.prop}" }\n`; // For empty range string (no any index column specified) - select all column indexes
       else layout += `{ "row": "1", "col": "${ranges}", "x": "", "y": "${y.prop}" }\n`;

 return layout;
}

// Function gets object element data from <macroobject> - odid, oid, ename, eprop, limit, <controller> is a var to get db connection from and the var that signals to treat a JSON formatted macro names as an element macros
export async function GetObjectElementData(macroobject, controller, replacements)
{
 let transaction, elementdata;
 if (!macroobject.odid) macroobject.odid = replacements.ODID;
 if (!macroobject.oid) macroobject.oid = `id={replacements.OID}`;
 if (!macroobject.eprop && !macroobject.ename) macroobject.eprop = replacements.EPROP; // For absent element property define its default value: for absent element name element property is retrieved from current client event, otherwise element prop is untouched forcing to use whole element instead of its JSON property
 macroobject.ename = qm.BuildQuery({ method: 'JSONEXTRACT', fields: { name: macroobject.ename || replacements.EID, value: macroobject.eprop } }); // Get element name considering element property

 try {
      transaction = await controller.pool.connect();
      await transaction.query(...qm.Make({ method: 'BEGIN', role: `rouserodid${macroobject.odid}` }));
      elementdata = await transaction.query(...qm.Make({ method: 'SELECT', fields: macroobject.ename, table: `data_${macroobject.odid}`, where: macroobject.oid, limit: macroobject.limit }, { rowMode: 'array' }));
      await transaction.query(...qm.Make({ method: 'COMMIT' }));
      if (Array.isArray(elementdata)) elementdata = elementdata[0]; // In case of multiple queries - get first one only!
      elementdata = elementdata?.rows?.[0]?.[0]; // In case of row mode, the result is returned in 2d array with rows and columns. Get 1st column of a 1st row
     }
 catch(error)
     {
      await transaction.query(...qm.Make({ method: 'ROLLBACK' }));
      console.error(error.stack);
      elementdata = ''; // or elementdata = error.message;
     }
 finally
     {
      if (transaction) transaction.release();
     }

 if (['boolean', 'number'].includes(typeof elementdata)) elementdata += ''; // Convert boolean/number types to string
 return typeof elementdata === 'string' ? elementdata : ''; // Return empty string for all non string types
}

// Main function that replaces incoming <string> by <replacements>, arg <chain> collect nested macro names to exclude loops, <controller> is a var to get db connection from and the var that signals to treat a JSON formatted macro names as an element macros
export async function MacrosReplace(string, replacements, controller, chain = {})
{
 let macrovalue, newstring = '';
 chain = Object.assign({}, chain); // Clone chain

 while (true)
       {
        const pos1 = string.indexOf('${'); // Search start of macro
        if (pos1 === -1) return newstring + string; // No found? return previous result plus current
        const pos2 = string.indexOf('}', pos1); // Search end of macro
        if (pos2 === -1 ) return newstring + string; // No found? return previous result plus current
        const macroname = string.substring(pos1 + 2, pos2); // Retrieve macro name
        macrovalue = ''; // Set macro value default value, so loop/undefined macros cause an error and remains empty
        if (macroname in replacements) // Macro does exist, so get its value via recursive function call
           {
            if (!(macroname in chain)) macrovalue = await MacrosReplace(replacements[macroname], replacements, controller, Object.assign({ [macroname]: true }, chain));
           }
         else // Macro doesn't exist, so check it for dynamic/JSON format
           {
            const dynamicmacroname = IsSystemDynamicMacro(macroname);
            if (dynamicmacroname) // Dynamic macro check
               {
                macrovalue = this[`DefineMacro${dynamicmacroname}`](macroname, replacements); // Macro name is not JSON, so check if it is dynamic and call appropriate function in case
               }
             else // JSON macro check
               {
                try { if (controller) macrovalue = JSON.parse(`{${macroname}}`); } // JSON macros are parsed for client/controller events only
                catch {}
                if (macrovalue) macrovalue = await GetObjectElementData(macrovalue, controller, replacements); // Macro name is a JSON, so try to retrieve OD/OV JSON specified object element data
               }
           }
        newstring += string.substring(0, pos1) + macrovalue; // Collect newstring with macro value
        string = string.substring(pos2 + 1); // and redefine remaining part to pass it for next cycle
       }
}

export function SearchMacrosNames(macroobject, ...strings)
{
 for (let string of strings)
     if (typeof string === 'string') while (true)
        {
         const pos1 = string.indexOf('${'); // Search start of macro
         if (pos1 === -1) break;
         const pos2 = string.indexOf('}', pos1); // and the finish
         if (pos2 === -1) break;
         macroobject[string.substring(pos1 + 2, pos2)] = ''; // Add new macro name
         string = string.substring(pos2 + 1); // and redefine remaining part to pass it for next cycle
        }
 return macroobject;
}

// Function creates dialog JSON to define <includereplacements> excluding <excludereplacements>
export function BuildMacrosDialog(includereplacements, excludereplacements)
{
 let dialog = '';
 const freenames = Object.keys(SYSTEMSTATICMACROS); // Get some names (for dialog props used as a macro names) that is surely not used as a user defined macro names

 // Go through all <includereplacements> excluding <excludereplacements> (plus system and dynamic macros) and create dialog text input fields for all of them
 for (const macroname in includereplacements)
     if (!(macroname in SYSTEMSTATICMACROS) && !IsSystemDynamicMacro(macroname) && !(macroname in excludereplacements))
        dialog += `${dialog ? ', ' : ''}"${macroname}": { "type": "textarea", "head": "Enter macro '<b>${macroname}</b>' value", "data": "" }`;

 // For non-empty dialog add title and two btns
 if (dialog) dialog = `{ "${freenames[0]}": { "type": "title", "data": "Macros definition dialog" }, "${freenames[1]}": ${globals.BUTTONOK}, "${freenames[2]}": ${globals.BUTTONCANCEL}, ${dialog} }`;
 return dialog;
}
