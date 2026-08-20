import * as globals from './globals.js';
import * as qm from './querymaker.js';

// The function determines whether the macro name is dynamic or not. And returns macro name if it is
function IsSystemDynamicMacro(macroname)
{
 for (const name in globals.SYSTEMDYNAMICMACROS)
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
 for (const macroname in globals.SYSTEMSTATICMACROS)
     {
      const searchmacroname = globals.SYSTEMSTATICMACROS[macroname] === null ? macroname : globals.SYSTEMSTATICMACROS[macroname]; // and define macro name to search in macro objects - macro name is untouched for null or is <SYSTEMSTATICMACROS[macroname]> for not null
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
export function DefineMacroLAYOUT(macro)
{
 let colexp = globals.GetColumnIndexesRangeExp(macro.substring('LAYOUT'.length)); // Adjust range, all unnecessary string (just like 'LAYOUT', 'N' or 'H') will be cut off
 if (!colexp) return ''; // Return empty layout for no columns defined
 let layout = '', y = {};
 colexp = ` && (${colexp})`; // Adjust column expression with prefix AND to add it to row expression, see below

 for (let e of macro.substring('LAYOUT'.length).trim().split(',')) if (e = e.trim()) // For header/new/data(selection) rows set 'y' props
     {
      if (e === 'H' || e === 'h')
         {
          if (!y.header) y.header = `0${'new' in y ? '+1' : ''}${'data' in y ? '+q' : ''}`; // Header object
         }
       else if (e === 'N' || e === 'n')
         {
          if (!y.new) y.new = `0${'header' in y ? '+1' : ''}${'data' in y ? '+q' : ''}`; // New object
         }
       else if (colexp && !y.data) y.data = `j${'header' in y ? '+1' : ''}${'new' in y ? '+1' : ''}`; // Add 'data' object for no header/new object; j-2 -> j
     }

 for (const prop in y) // Add layout jsons in a creating-time order for every header/new/data objects, 'y' props are defined, 'x' is undefined as it points to cursor 'x' coordinate
     if (prop === 'header') layout += `{ "exp": "r===${globals.TITLEVIRTUALROWID}${colexp}", "y": "${y[prop]}" }\n`;
      else if (prop === 'new') layout += `{ "exp": "r===${globals.NEWVIRTUALROWID}${colexp}", "y": "${y[prop]}" }\n`;
      else if (prop === 'data') layout += `{ "exp": "r > ${Math.max(globals.TITLEVIRTUALROWID, globals.NEWVIRTUALROWID)}${colexp}", "y": "${y[prop]}" }\n`;

 return layout;
}

// Function gets object element data from <macroobject> - odid, oid, eid, eprop, limit, <controller> is a var to get db connection from and the var that signals to treat a JSON formatted macro names as an element macros
export async function GetObjectElementData(macroobject, controller, replacements)
{
 let transaction, elementdata;
 if (!('odid' in macroobject)) macroobject.odid = replacements.ODID;
 if (!('oid' in macroobject)) macroobject.oid = `id={replacements.OID}`;
 if (!('eid' in macroobject)) macroobject.eid = replacements.EID;
 if (!('eprop' in macroobject) && 'EPROP' in replacements) macroobject.eprop = replacements.EPROP;
 if (macroobject.eid in globals.SYSTEMELEMENTNAMES) delete macroobject.eprop;
  else macroobject.eid = globals.ELEMENTCOLUMNPREFIX + macroobject.eid;

 try {
      transaction = await controller.pool.connect();
      await transaction.query(...qm.Make({ method: 'BEGIN', role: `rouserodid${macroobject.odid}` }));
      elementdata = await transaction.query(...qm.Make({ method: 'SELECT', fields: Object.assign({ name: macroobject.eid }, 'eprop' in macroobject ? { prop: macroobject.eprop } : {}), table: `data_${macroobject.odid}`, where: macroobject.oid, limit: macroobject.limit }, { rowMode: 'array' }));
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

// Todo2 - remember macro scheme below:
// Macros names is replaced by appropriate macros values. Undefined macros names are replaced by empty strings. User defined empty macros name is correct, but is not recomended
// Macros types:
//     System (General): ${RANDOM} ${DATE} ${DATETIME} ${TIME} ${NULL} ${USERNAME} ${USERID} ${ELEMENTCOLUMNPREFIX}
//     System (View):    ${OD} ${OV} ${ODID} ${OVID} ${LAYOUT H,N,id,1,2,3} ${DBDATATBLNAME}
//     System (Event):   ${EVENTNAME} ${OID} ${EID} ${EPROP} ${EVENTDATA} ${ELEMENT}
//     Element:          ${"odid": "6", "ovid": "6", "oid": "id=7 AND lastversion=true", "eid": "1,2,3,id,ownerid,lastversion..", "eprop": "value", "limit": "1" }, all macros names in parentheses are interpreted as usual macros names, except ones in JSON format. Once the string inside is any correct JSON, it becomes 'element' type macros and defines object element to retreive the data from
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