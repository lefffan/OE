import * as consts from './consts.js';

export function GetTableNameId(name)
{
 let pos = name.indexOf('_');
 if (pos === -1) return;
 name = name.substring(pos + 1);
 return isNaN(+name) ? undefined : name;
}

// Function checks incoming <users> (user names and group names together) array to match the <list> and return true for any match. Superuser no check shoud be implemented before this function call
// Logical AND is applied for all negative lines (with '!' as a first char), so item 'admin' doesn't match the list '!root\n!admin' (all except root and admin), but matches the list '!root\n!support'.
// Also empty list doesn't match any item, item 'admin' matches the list 'admin\n!admin' and list '!' matches any item.
export function CheckUsersToMatchTheList(users, list)
{
 let match;
 if (!Array.isArray(users) || !users.length) throw new Error('Object Database/View permissions check failed: unknown user!');
 list = list.split('\n');

 for (let line of list) if (line = line.trim()) // Iterate all list lines
     if (line[0] === '!') match = true; // Set <mactch> to true for any negative line in a list
      else if (users.includes(line)) return true; // Return true for any item matches any line in a list

 for (let line of list) if (line = line.trim()) // Iterate all list lines once again
     if (line[0] === '!' && users.includes(line.substring(1))) return; // Once line is negative and any item matches the line return no-match

 return match; // Return true match for any negative line or no-match for no any negative line
}

// Function checks input od/ov ids (the user interacts) on restriction list with od/ov ids space divided combinations on each line. Algoritm checks line by line until the match is found to return true match, no any combination match returns false.
// Omitted ov matches all ovs in od, negative ov (with '!' as a leading char) matches all ovs except specified ov, negative od matches all ods except specified and regardless of ov id value in a combination.
// Empty list - no match, single char '!' matches all
// Example - user is trying to open Object View (ov) id 2 of Object Database (od) id 1. Hera some restriction lists and their match result:
// '1 3 \n 1 2' - the list matches. Opening OV2 of OD1 matches the 2nd line in a list
// '1 !3' - the list matches. Opening OV2 of OD1 matches the 1st line in a list, !3 matches all OVs except 3
// '1 3' - Opening OV2 of OD1 doesn't match the list
// '1' - the list matches. Omitted OV id matches all OVs of OD1
// '!1' - no match, list matches all OD ids except id1
// '!2  !2\n1 !2' - the list matches. Second line - no match (all OV ids except id2), but 1st line matches all ODs except OD id2
export function CheckViewsToMatchTheList(od, ov, list)
{
 let negative_od, negative_ov, match;
 const checklist = [];

 for (let line of list.split('\n')) if ((line = line.trim()) && (line = line.split(' '))) // Iterate all list lines except empty ones
     {
      line = [line[0].trim(), line.slice(1).join('').trim()]; // All lines in a restriction list are [!]od/[!]ov space divided, empty ov - matches all ovs in od
      checklist.push(line);
      if (line[0][0] === '!' && (negative_od = true)) continue;
      if (line[0] === od && line[1][0] === '!') negative_ov = true;
     }

 for (let line of checklist) // Go through all lines in a checklist to check all od/ov combinations match
     if (od === line[0] && (ov === line[1] || !line[1])) return true; // All lines in a check list are [!]od/[!]ov space divided, empty ov - matches all ovs in od

 if (negative_ov && (match = true)) for (let line of checklist) // Go through all lines with negative ov only, od in a list should be positive (without '!') and match input od
    if (od === line[0] && line[1][0] === '!' && ov === line[1].substring(1) && !(match = false)) break; // For the matched od check check ov - if it is negative and is matched - then the list doesn't match input od/ov, breaking cycle with falsy match
 if (negative_ov && match) return true;

 if (negative_od && (match = true)) for (let line of checklist) // Go through all lines with negative od (ov is ignored in case, cause it doesn't matter) in a checklist
    if (line[0][0] === '!' && od === line[0].substring(1) && !(match = false)) break; // If od 1st char is '!' and od matches - then the list doesn't match input od/ov, breaking cycle with falsy match
 if (negative_od) return match;
}

// Escaping/replacing chars is divided on 3 processes:
// 1. tag attribute escaping chars '<', '>', "'", '"', '&' came from backend
// 2. html inner escaping same chars came from backend excluding ALLLOWEDINNERTAGS (FYI: one of these tags is 'pre' which uses mono-width font)
// 3. at start editing - set element textContent from the cell.value, confirm editing - read textContent to the cell.value with setting htmlinner (see process #2), note that element 'white-space' should be 'pre-wrap' ("white-space: pre;" - shows original text as it is, "white-space: pre-wrap;" - same as 'pre', but automatically wraps/breaks lines if needed)
// Todo0 - text data in element <textarea> and <input> is taken from server-side json, so should it be escaped? Cause at dialog html generation tag data may consist of </tag> which may break the marking. But string escaping modifies textarea data and this modified data will be saved to the server - so check this point! Workaround - all input and textarea tags should be searched via queryselector to modify their textContent property
export function EscapeString(string, excludehtmltags)
{
 let match, newstring = '';
 if (typeof string !== 'string') return '';

 if (excludehtmltags) while (match = consts.ALLOWEDINNERTAGSREGEX.exec(string))
    {
     newstring += EscapeString(string.substring(0, match.index)) + match[0]; // Escape chars till the <match.index> (till the found allowed tag) and concatenate it with the found untouched <tag>
     string = string.substring(match.index + match[0].length); // Cut <string> till found tag position + tag length
    }

 for (let i = 0; i < consts.INNERENCODEMAP[0].length; i++)
     string = string.replace(new RegExp(consts.INNERENCODEMAP[0][i], 'g'), consts.INNERENCODEMAP[1][i]);

 return newstring + string;
}

export function SVGUrlHeader(viewwidth = '12', viewheight = '12', url = true, extraattribute = '')
{
 if (url) return `url("data:image/svg+xml,%3Csvg viewBox='0 0 ${viewwidth} ${viewheight}' width='${viewwidth}' height='${viewheight}' xmlns='http://www.w3.org/2000/svg'%3E`;
 return `<svg viewBox='0 0 ${viewwidth} ${viewheight}' width='${viewwidth}' height='${viewheight}' xmlns='http://www.w3.org/2000/svg' ${extraattribute}>`;
}

export function SVGUrlFooter(url = true)
{
 if (url) return `%3C/svg%3E")`;
 return `</svg>`;
}

export function SVGRect(x, y, w, h, strength, dash, color, fill = 'none', rx = '4', url = true, dashoffset, animation)
{
 const disp = Math.round(strength/2);
 x += disp;
 y += disp;
 h -= disp * 2;
 w -= disp * 2;
 if (url) return `%3Crect pathLength='99' stroke-width='${strength}' fill='${fill}' stroke='${color}' x='${x}' y='${y}' width='${w}' height='${h}' rx='${rx}' stroke-dasharray='${dash} 100' stroke-linejoin='round' /%3E`;
 return `<rect pathLength='100' stroke-width='${strength}' fill='${fill}' stroke='${color}' x='${x}' y='${y}' width='${w}' height='${h}' rx='${rx}' stroke-dasharray='${dash} ${100 - dash}' stroke-linejoin='round'${dashoffset ? " stroke-dashoffset='" + dashoffset + "'" : ''}>${animation ? ' ' + animation : ''}</rect>`;
}

export function SVGPath(path, color, width, url = true)
{
 if (url) return `%3Cpath d='${path}' stroke='${color}' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round' /%3E`;
 return `<path d='${path}' stroke='${color}' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round' />`;
}

export function SVGCircle(x, y, r, strength, color, fill = 'none', dash, url = true)
{
 if (url) return `%3Ccircle cx='${x}' cy='${y}' r='${r}' fill='${fill}' stroke-width='${strength}' stroke='${color}' ${dash ? "stroke-dasharray='" + dash + "'" : ''} /%3E`;
 return `<circle cx='${x}' cy='${y}' r='${r}' fill='${fill}' stroke-width='${strength}' stroke='${color}' ${dash ? "stroke-dasharray='" + dash + "'" : ''} />`;
}

export function SVGText(x, y, text, color = 'grey', font = '.8em Lato, Helvetica;', url = true)
{ 
 if (url) return `%3Ctext x='${x}' y='${y}' style='fill: ${color}; font: ${font}' %3E${text}%3C/text%3E`;
 return `<text x="${x}" y="${y}" style="font: ${font}">${text}</text>`;
}
                                    
export function CutString(string, limit = 12, termination = '..')
{
 if (typeof string !== 'string' || typeof termination !== 'string') return '';
 if (termination.length > limit) termination = termination.substring(0, limit);
 return string.length > limit ? string.substring(0, limit - termination.length) + termination : string;
}

 // Function searches 'string' in 'source' and return the source with excluded string or added string otherwise
export function ToggleString(source, string)
{
 if (typeof source !== 'string' || typeof string !== 'string') return '';
 return source.indexOf(string) === -1 ? source + string : source.replaceAll(string, '');
}

export function SearchPropValue(object, value)
{
 if (typeof object === 'object')
    for (const i in object) if (object[i] === value) return i;
}

export function GenerateRandomString(length)
{
 let randomstring = '';
 for (let i = 0; i < length; i++) randomstring += consts.RANDOMSTRINGCHARS[Math.floor(Math.random() * consts.RANDOMSTRINGCHARS.length)];
 return randomstring;
}

// Function deeply compares two objects woth all their props recurcively
export function ObjectCompare(obj1, obj2)
{
 if (!obj1 || !obj2 || typeof obj1 !== 'object' || typeof obj2 !== 'object') return;
 if (Object.keys(obj1).length !== Object.keys(obj2).length) return;
 for (const prop in obj1)
  if (obj1[prop] && obj2[prop] && typeof obj1[prop] === 'object' && typeof obj2[prop] === 'object') // Compare objects recurcively
     {
      if (!ObjectCompare(obj1[prop], obj2[prop])) return;
     }
   else
     {
      if (obj1[prop] !== obj2[prop]) return;
     }
 return true;
}

// Function goes through all dialog input elements and retrieves their values as macros
export function GetDialogMacrosValues(dialog)
{
 const replacements = {};
 DialogProfileElementsAdjust(dialog, true, (profile, ename) => { if (['text', 'password', 'textarea', 'select', 'radio', 'checkbox'].includes(profile[ename].type) && typeof profile[ename].data === 'string') replacements[ename] = GetDialogElement(profile[ename], '', true); });
 return replacements;
}

// Function goes through dialog <profile> elements calling <callback> function for each one. Root <profile> and true <recursive> args iterate all dialog elements
export function DialogProfileElementsAdjust(profile, recursive, callback, ...args)
{
 for (const ename in profile)
     {
      const e = profile[ename];
      const result = callback(profile, ename, ...args);
      if (result !== undefined) return result;
      if (recursive && e?.type === 'select' && e.data && typeof e.data === 'object')
         for (const profilename in e.data)
             {
              const result = DialogProfileElementsAdjust(e.data[profilename], true, callback, ...args);
              if (result !== undefined) return result;
             }
     }
}

// Dialog data has next structure: root-profile -> element1, element2 -> profile1 -> element1 -> profile1, profile2 ->.., so path represents a slash divided string to point needed element or profile:
// element2/profile1/element1/profile2.. with <dialog> as a root-profile
// Function search specified element or profile for specified splited path depending on <value> type
export function GetDialogElement(dialog, path, value)
{
 if (!dialog || typeof dialog !== 'object') return;
 path = path ? path.split('/') : [];
 for (let i in path) // Go through all elements of splited path 
     {
      dialog = +i%2 ? GetOptionInSelectElement(dialog, path[i]) : dialog[path[i]]; // Go to next element or profile (element group)
      if (!dialog) return;
     }

 switch (typeof value) // Undefined <value> just return a found element (current <dialog> var) for a specified <path>, string type <value> set found element data to <value>, other <value> types - data prop of a found element is returned (for selectable elements with at least one checked option first checked option name is returned instead of whole data prop)
        {
          case 'string': // String type <value> - set element data
               dialog.data = value;
               return;
          case 'boolean': // Boolean type <value> - for non selectable elements and profile selections: return element data of itself. For selectable elements: checked option name (value === true) or object with option names as a key and checked status as their values (value === false)
               if (!('data' in dialog)) return '';
               if (!['select', 'multiple', 'checkbox', 'radio'].includes(dialog.type) || typeof dialog.data !== 'string') return dialog.data;
               const options = {};
               for (const option of dialog.data.split('/'))
                   {
                    const [name, flag] = option.split(consts.FIELDSDIVIDER, 2);
                    if (value && (flag || '').includes('!')) return name;
                    if (!value) options[name] = (flag || '').includes('!');
                  }
               return value ? '' : options; // Return empty string for no any option checked (value === true) or <options> (value === false)
          default: // Other cases - return whole element
               return dialog;
        }
}

function GetOptionInSelectElement(e, option)
{
 if (!e?.data || e.type !== 'select' || typeof e.data !== 'object') return;
 for (const name in e.data) if (CompareOptionInSelectElement(option, name)) return e.data[name];
}

export function CompareOptionInSelectElement(string, option)
{
 [string] = string.split(consts.FIELDSDIVIDER, 1);
 [option] = option.split(consts.FIELDSDIVIDER, 1);
 return string === option;
}

// Function parses dialog structure for OD params and return them to suck in to the memort for the quick access. Vars maxeid/maxovid need to add new elements/views with ids not overlapped with elements/view ids of previous OD version 
export function SuckInDatabaseProps(dialog, odid, neweid = 1, newovid = 1)
{
 let profile;
 const props = { dialog: dialog, od: {}, elements: {}, views: {}, rules: {} };

 // Adjust dialog buttons
 let btn = GetDialogElement(dialog, 'ok');
 btn.data = 'SAVE'; // Rename btn from 'CREATE' to 'SAVE' btn after db conf dialog is created
 delete btn.expr; // No grey btn 'CREATE' for empty db name that is used to remove OD
 btn = GetDialogElement(dialog, 'cancel');
 btn.flag = '++++++++++'; // Create cancel btn 10 minute timer

 // Suck in Main pad
 props.od.name = [...new Set(GetDialogElement(dialog, 'padbar/Main/settings/General/dbname', true).split('/').map(name => name.trim()).filter(name => name))].join('/');
 props.od.description = GetDialogElement(dialog, 'padbar/Main/settings/General/description', true);
 props.od.odreplacements = {};
 props.od.undefinedodreplacements = {};
 for (const permission of ['od', 'Database', 'Element', 'View', 'Rule']) // Get OD main permission text areas
     props.od[permission] = GetDialogElement(dialog, `padbar/Main/settings/Permissions/${permission}`, true);
 profile = GetDialogElement(dialog, 'padbar/Main/settings/Macros/macros', true); // Get OD macroses to <props.od.odreplacements> and process its values - in case of some other macroses in these values, store them in <props.od.undefinedodreplacements>
 const macroobject = {};
 for (const macroname in profile) // get od macros
     {
      if (CompareOptionInSelectElement('New macro', macroname)) continue;
      const macrovalue = GetDialogElement(profile, `${macroname}/value`, true);
      props.od.odreplacements[macroname.split(consts.FIELDSDIVIDER, 1)] = macrovalue;
      SearchMacrosNames(macroobject, macrovalue);
     }
 for (const name in macroobject) if (!props.od.odreplacements[name]) props.od.undefinedodreplacements[name] = '';

 // Adjust dialog title
 GetDialogElement(dialog, 'title').data = `Database '${CutString(props.od.name.split('/').pop())}' (id${odid}) configuration`; // Change OD dialog title    

 // Suck in Element pad
 profile = GetDialogElement(dialog, 'padbar/Element/elements', true);
 for (let option in profile) // Go through all elements profile
     {
      let id = AdjustProfileOption(profile, option, neweid); // Rename element adding id, add +- flags. For cloned profiles only
      if (id !== undefined) option = id;
      if (id !== undefined && neweid) neweid++; // Increase next free element id to use
      if (!(id = GetOptionNameId(option))) continue; // Only template profile has no id
      const element = props.elements[id] = {};
      for (const prop of ['name', 'description', 'type', 'index', 'event']) // Get element profile all props and trim/toLowerCase them if needed
          element[prop] = GetDialogElement(profile[option], prop, true);
      element.type = element.type.trim().toLowerCase();
      GetDialogElement(profile[option], 'type').expr = '/^/';                           // Make element type (column type in DB) readonly
     }

 // Suck in Rule pad
 const rulereplacements = {};
 profile = GetDialogElement(dialog, 'padbar/Rule/rules', true);
 for (let option in profile) AdjustProfileOption(profile, option);
 props.rules = Object.keys(profile).sort((a, b) => a.localeCompare(b));	// Get all rule profile names to the array in alphabetical order
 for (let i = 0; i < props.rules.length; i++) // Then go through all of them
     {
      const option = props.rules[i];
      if (CompareOptionInSelectElement('New rule template', option) && props.rules.splice(i--, 1)) continue; // excluding template
      const rule = props.rules[i] = { key: option.split(consts.FIELDSDIVIDER, 1)[0] }; // Store rule object with rule profile name as a key prop
      for (const prop of ['message', 'action', 'query']) props.rules[i][prop] = GetDialogElement(profile, `${option}/${prop}`, true).trim(); // Store some props
      props.rules[i].log = GetDialogElement(profile, `${option}/log`, false);
      // Exclude comments in query
      rule.query = rule.query.split('\n');
      for (let j = 0; j < rule.query.length; j++) if (rule.query[j].trim()[0] === '#') rule.query.splice(j--, 1);
      rule.query = rule.query.join('\n');
      // Rule replacements
      SearchMacrosNames(rulereplacements, rule.query, props.rules[i].message);
     }

      // Suck in View pad
 profile = GetDialogElement(dialog, 'padbar/View/views', true);
 for (let option in profile)
     {
      let id = AdjustProfileOption(profile, option, newovid);
      if (id !== undefined) option = id;
      if (id !== undefined && newovid) newovid++; // Increase next free element id to use
      if (!(id = GetOptionNameId(option))) continue; // Only template profile has no id
      const view = props.views[id] = { general: {}, selection: {}, appearance: {}, macros: {}, permissions: {} };
      //for (const prop of ['General/name', 'General/description', 'General/shortcut', 'Selection/template', 'Selection/layout', 'Selection/query', 'Selection/linkname', 'Appearance/init', 'Appearance/position', 'Appearance/size', 'Appearance/control', 'Appearance/bringtotop', 'Appearance/autoopen', 'Appearance/refresh', 'Appearance/timer1', 'Appearance/close', 'Appearance/timer2', 'Macros/call', 'Macros/dialog', 'Permissions/read', 'Permissions/write'])
      for (const prop of ['General/name', 'General/description', 'General/shortcut', 'Selection/template', 'Selection/layout', 'Selection/query', 'Selection/linkname', 'Appearance/init', 'Appearance/position', 'Appearance/size', 'Appearance/control', 'Appearance/action/Bring to top/bringtotop', 'Appearance/action/Open in a new window/autoopen', 'Appearance/action/Refresh/refresh', 'Appearance/action/Refresh/timer', 'Appearance/action/Close/close', 'Appearance/action/Close/timer', 'Macros/call', 'Macros/dialog', 'Permissions/read', 'Permissions/write'])
          view[prop.split('/')[0].toLowerCase()][prop.split('/')[1]] = GetDialogElement(profile[option], `settings/${prop}`, true).trim();
      //for (const prop of ['Appearance/control', 'Appearance/bringtotop', 'Appearance/autoopen', 'Appearance/refresh'])
          //view[prop.split('/')[0].toLowerCase()][prop.split('/')[1]] = GetDialogElement(profile[option], `settings/${prop}`, false);
      // Todo0 - set escape prop to true for this case: No 'close btn' and 'escape key' options checked - escape key is used anyway to avoid dead lock
      view.general.name = [...new Set(view.general.name.split('\n').map(alias => alias.trim()).map(alias => alias.at(-1) === '/' ? alias.slice(0, -1) : alias).map(alias => alias.trim()).filter(alias => alias))].join('\n'); // Exclude duplicated aliases, trim and slice last '/'

      // Macro dialog field is empty and 'Call dialog' option is checked? Create macro dialog automatically
      if (!view.macros.dialog && view.macros.call)
         {
          view.replacements = Object.assign(SearchMacrosNames({}, view.selection.layout, view.selection.query), rulereplacements); // Create view replacements - it is built from search in all rules message/query fields, plus view selection layout/query. Todo0 - go through all available handler data text areas to search other non JSON/dynamic macros to exclude
          view.macros.dialog = BuildMacrosDialog(view.replacements, props.od.undefinedodreplacements); // Build dialog to define macros in 1st arg excluding 2nd arg
         }
      try { view.macros.dialog = JSON.parse(view.macros.dialog); } // Parse macro dialog to object
      catch { view.macros.dialog = JSON.parse(consts.WARNINGDIALOG); view.macros.dialog.msg.head = 'Wrong macro dialog syntax!'; } // In case of wrong dialog syntax warning dialog is created with <view.replacements> untouched
      view.replacements = GetDialogMacrosValues(view.macros.dialog); // Retrieve all macro values from select/text interface elements
     }

 // Return props
 return props;
}

// Function iterates cloned options, removes 'cloned' flag, adds '+-' flags and creates new option with changed name (for true <addid>) and flag
export function AdjustProfileOption(profile, option, addid)
{
 let [name, flag, ...style] = option.split(consts.FIELDSDIVIDER);               // Split option to its name and flag via FIELDSDIVIDER char '~'
 if (addid) name += ` (id${addid})`;                                            // Add ' (id<num>)' to option name if <addid> is defined
 flag = flag || '';                                                             // Set <flag> to string type if needed
 if (!flag.includes(consts.OPTIONISCLONED)) return;                             // Var <addid> is added for cloned profiles only, so do not process non-cloned if <addid>
 flag = flag.replaceAll(consts.OPTIONISCLONED, '');
 if (!flag.includes(consts.OPTIONISCLONABLE)) flag += consts.OPTIONISCLONABLE;
 if (!flag.includes(consts.OPTIONISREMOVABLE)) flag += consts.OPTIONISREMOVABLE;
 style = style.length ? style.join(consts.FIELDSDIVIDER) : '';                  // Join back style string

 const newoption = `${name}${flag || style ? consts.FIELDSDIVIDER + flag : ''}${style ? consts.FIELDSDIVIDER + style : ''}`;    // Build new option name
 profile[newoption] = profile[option];                                                                                          // and include it to profile instead of old <option>
 delete profile[option];
 return newoption;
}

function GetOptionNameId(option)
{
 if (typeof option !== 'string') return '';
 [option] = option.split(consts.FIELDSDIVIDER, 1); // Get option name without flags/style
 let id = option.lastIndexOf('id');                 // Serach id string in non-cloned option names
 if (id === -1) return;                             // Return undefined for no 'id' string present
 id = option.slice(id + 2, -1);                     // Clip num after 'id' string and convert it to number
 return isNaN(+id) ? '' : id;                       // and return string containing 
}

// Function sucks in every user permissions and customization, plus super user event group profiles. Todo0 - make this "suck" every time the super user or ordinary user record is changed
export function SuckInUserProps(userrow)
{
 // Parsing user policy from <userrow.eid4>. Todo0 - no policy for super user? One way is here to allow all for superuser, another way - exclude superuser on restriction check
 const policy = {};
 for (const prop of ['groups', 'instances', 'timeout', 'read', 'write', 'create', 'task'])
     {
      policy[prop] = userrow.eid1 === consts.SUPERUSER ? '' : GetDialogElement(userrow.eid4, prop, true);
      if (typeof policy[prop] !== 'string') throw new Error(`Couldn't suck in user policy '${prop}'!`);
     }

 // Parsing super user event groups <userrow.eid6>
 const egs = {};
 if (userrow.eid1 === consts.SUPERUSER)  for (let eg in GetDialogElement(userrow.eid6, 'eventgroups', true)) if (!CompareOptionInSelectElement('New event group', eg))
    {
     eg = eg.split(consts.FIELDSDIVIDER, 1)[0];
     egs[eg] = {};
     for (let e in GetDialogElement(userrow.eid6, `eventgroups/${eg}/evsel`, true)) if (!CompareOptionInSelectElement('New event', e))
         {
          e = e.split(consts.FIELDSDIVIDER, 1)[0];
          egs[eg][e] = {};
          for (const prop of ['handlertype', 'handlerdata', 'timeout', 'retry'])
              if (typeof (egs[eg][e][prop] = GetDialogElement(userrow.eid6, `eventgroups/${eg}/evsel/${e}/${prop}`, true)) !== 'string') throw new Error(`Couldn't suck in user event group '${eg}'!`);
          egs[eg][e].output = GetDialogElement(userrow.eid6, `eventgroups/${eg}/evsel/${e}/output`, false);
          if (['Disabled', 'Fixed output'].includes(egs[eg][e].handlertype)) continue; // Continue for hadnler disabled/fixed types, for others (module funcs and cmd) remove leading comments below
          let handlerdata = egs[eg][e].handlerdata.split('\n'); // Todo0 - how event dialog handler data with function and its args below is interpreted? Spaces are rpelaced with &nbsp? Get textContent instead of innerHTML in case
          for (let i = 0; i < handlerdata.length; i++) if (!handlerdata[i].trim() || handlerdata[i].trim()[0] === '#') handlerdata.splice(i--, 1); else break;
          egs[eg][e].handlerdata = handlerdata.join('\n');
         }
    }

 // Returning user props
 return { name: userrow.eid1,
          tags: [...new Set(`${userrow.eid1}\n${policy.group}`.split('\n').map(tag => tag.trim()).filter(tag => tag))],
          policy: policy,
          customization: userrow.eid5,
          eventgroups: egs
        };
}

function SearchMacrosNames(macroobject, ...strings)
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
function BuildMacrosDialog(includereplacements, excludereplacements)
{
 let dialog = '';
 const freenames = Object.keys(consts.SYSTEMSTATICMACROS); // Get some names (for dialog props used as a macro names) that is surely not used as a user defined macro names

 // Go through all <includereplacements> excluding <excludereplacements> (plus system and dynamic macros) and create dialog text input fields for all of them
 for (const macroname in includereplacements)
     if (!(macroname in consts.SYSTEMSTATICMACROS) && !IsSystemDynamicMacro(macroname) && !(macroname in excludereplacements))
        dialog += `${dialog ? ', ' : ''}"${macroname}": { "type": "textarea", "head": "Enter macro '<b>${macroname}</b>' value", "data": "" }`;

 // For non-empty dialog add title and two btns
 if (dialog) dialog = `{ "${freenames[0]}": { "type": "title", "data": "Macros definition dialog" }, "${freenames[1]}": ${consts.BUTTONOK}, "${freenames[2]}": ${consts.BUTTONCANCEL}, ${dialog} }`;
 return dialog;
}

// Log msg of header (service info), error msg of itself and footer (mcaro values) to specified <destination>
export function Log(error, sub, destination)
{
 let header = '', footer = '';
 if (!sub) sub = {};
 if (typeof destination !== 'number' || isNaN(destination)) destination = consts.LOGTOSTDERR
 
 try {
      // Msg header
      header += `Timestamp: ${new Date().toLocaleString()}\n`; // 
      header += `${'USERNAME' in sub && 'USERID' in sub ? `Account: ${sub.USERNAME} (${sub.USERID})\n`: ''}`;
      header += `${'EVENTNAME' in sub ? `Event: ${sub.EVENTNAME}\n`: ''}`;
      header += `${'OD' in sub && 'ODID' in sub ? `Object Database: ${sub.OD} (${sub.ODID})\n`: ''}`;
      header += `${'OV' in sub && 'OVID' in sub ? `Object View: ${sub.OV} (${sub.OVID})\n`: ''}`;
      header += `${'OID' in sub ? `Object id: ${sub.OID}\n`: ''}`;
      header += `${'EID' in sub ? `Element id: ${sub.EID}\n`: ''}`;

      // Msg footer
      for (const name in sub) if (name !== 'EVENTDATA' && name !== 'EVENTNAME') footer += `${name}: ${sub[name]}\n`;

      // Msg log to destination
      if (destination & consts.LOGTOSTDOUT) console.log(error);
      if (destination & consts.LOGTOSTDERR) console.error(header, error)
      if ((destination & consts.LOGTOFILE) && typeof global?.[consts.WRITETOFILEFUNC] === 'function') global[consts.WRITETOFILEFUNC](header, typeof error === 'srting' ? error : JSON.stringify(error));
     }
 catch(error)
     {
      console.error('Failed to execute log function: ', error.stack);
     }

 if (!(destination & consts.LOGTOSTDOUT) && !(destination & consts.LOGTOSTDERR) && !(destination & consts.LOGTOFILE)) return `${header}\n${typeof error === 'srting' ? error : JSON.stringify(error)}\n\n${footer}`;
}