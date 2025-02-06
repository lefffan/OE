export const HTMLINNERENCODEMAP		= [['&', '<', '>', '\n', ' ', '"'], ['&amp;', '&lt;', '&gt;', '<br>', '&nbsp;', '&quot;']];	// Encoding map array of two arrays with symmetric values to encode/decode each other
export const TAGATTRIBUTEENCODEMAP		= [['<', '>', '\n', '"'], ['&lt;', '&gt;', '', '&quot;']];
export const ELEMENTINNERALLOWEDTAGS	= ['span', 'pre', 'br'];
export const EFFECTS					= ['hotnews', 'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall', 'rise'];
export const EFFECTSHINT				= "effect appearance. Possible values:<br>'hotnews', 'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall' and 'rise'.<br>All other values make no effect.";
export const NODOWNLINKNONSTICKYCHILDS	= 0b1;

export function lg(...data)
{
 console.log(...data);
}

export function dir(...data)
{
 data.forEach(value => console.dir(value));
}

// Function creates regexp to match tag names list 'tags'
export function HTMLTagsRegexp(tags)
{
 let regexp = '';
 if (Array.isArray(tags)) for (const tag of tags) regexp += `<${tag} .*?>|<${tag} *>|<\/${tag} *>|`;
 return new RegExp(regexp.substring(0, regexp.length - 1), 'g');
}

// Function encodes strong 
export function AdjustString(string, encodemap, excludehtmltags, trim)
{
 if (typeof string !== 'string' || !string || !Array.isArray(encodemap) || !Array.isArray(encodemap[0]) || !Array.isArray(encodemap[1])) return '';
 if (trim) string = string.trim();

 let result, newstring = '';
 if (Array.isArray(excludehtmltags)) while (result = HTMLTagsRegexp(excludehtmltags).exec(string))
    {
     newstring += EncodeString(string.substr(0, result.index), encodemap) + result[0];  // Convert special chars till the result.index and concatenate with the matched <tag> of itself
     string = string.substr(result.index + result[0].length);                           // Generate string after allowed <tag> for the next search
    }

 return newstring + EncodeString(string, encodemap);
}

export function EncodeString(string, encodemap)
{
 if (typeof string !== 'string' || !string || !Array.isArray(encodemap) || !Array.isArray(encodemap[0]) || !Array.isArray(encodemap[1])) return '';

 for (let i = 0; i < encodemap[0].length; i ++)
     string = string.replace(new RegExp(encodemap[0][i], 'g'), encodemap[1][i]);

 return string;
}

export function MessageBox(parentchild, message, title)
{
 if (typeof message !== 'string') return;
 const MESSAGEMINCHARS = 60;
 message = message.padEnd(MESSAGEMINCHARS);
 if (typeof title !== 'string') title = 'Warning';
 const dialogdata = {	title: { type: 'title', data: title },
 						message: { type: 'text', head: message },
						ok: { type: 'button', data: '  OK  ', head: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;` }
					};
 return [dialogdata, parentchild, { effect: 'rise', position: 'CENTER', overlay: 'MODAL' }, { class: 'dialogbox selectnone' }];
}

// Function searches 'string' in 'source' and return the source with excluded string or added string otherwise
export function ToggleString (source, string)
{
 if (typeof source !== 'string' || typeof string !== 'string') return '';
 return source.indexOf(string) === -1 ? source + string : source.replaceAll(string, '');
}

export function SearchProp(object, prop)
{
 if (typeof object === 'object')
    for (const i in object) if (i === prop) return i;
}

export function SearchPropValue(object, value)
{
 if (typeof object === 'object')
    for (const i in object) if (object[i] === value) return i;
}

export function CutString(string, termination = '..', limit = 13)
{
 if (typeof string !== 'string' || typeof termination !== 'string') return '';
 if (termination.length > limit) termination = termination.substring(0, limit);
 return string.length > limit ? string.substring(0, limit - termination.length) + termination : string;
}

export function GetStyleInnerHTML(...objects) //https://dev.to/karataev/set-css-styles-with-javascript-3nl5, https://professorweb.ru/my/javascript/js_theory/level2/2_4.php
{
 let inner = '';

 for (const object of objects)
 for (const selector in object)
     {
      if (selector[0] === ' ') continue; // CSS selectors with leading space are ignored
      inner += `${selector} {`;
      // Empty selector prop values are ignored. Props with leading space are ignored too, but its values are used as a hints for corresponded props
      // in UI dialog configuration. Also leading space props with no 'pair' are used for non-CSS configurable parameters in GUI dialog settings.
      for (const prop in object[selector])
          if (prop[0] !== ' ' && object[selector][prop]) inner += `${prop}: ${object[selector][prop]}`;
      inner += '}';
     }

 return inner;
}

export function SVGUrlHeader(viewwidth = '12', viewheight = '12')
{
 return `url("data:image/svg+xml,%3Csvg viewBox='0 0 ${viewwidth} ${viewheight}' width='${viewwidth}' height='${viewheight}' xmlns='http://www.w3.org/2000/svg'%3E`;
}

export function SVGUrlFooter()
{
 return `%3C/svg%3E")`;
}

export function SVGRect(x, y, w, h, strength, dash, color, fill = 'none', rx = '4')
{
 const disp = Math.round(strength/2);
 x += disp;
 y += disp;
 h -= disp * 2;
 w -= disp * 2;
 return `%3Crect pathLength='99' stroke-width='${strength}' fill='${fill}' stroke='${color}' x='${x}' y='${y}' width='${w}' height='${h}' rx='${rx}' stroke-dasharray='${dash} 100' stroke-linejoin='round' /%3E`;
}

export function SVGPath(path, color, width, elementtype = 'background')
{
 return elementtype === 'background' ? `%3Cpath d='${path}' stroke='${color}' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round' /%3E` : `<path d='${path}' stroke='${color}' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round' />`;
}

export function SVGCircle(x, y, r, strength, color, fill = 'none', dash)
{
 return `%3Ccircle cx='${x}' cy='${y}' r='${r}' fill='${fill}' stroke-width='${strength}' stroke='${color}' ${dash ? "stroke-dasharray='" + dash + "'" : ''} /%3E`;
}

const CLIENTEVENTS = ['INIT', 'DELETE', 'CONFIRM', 'CONFIRMDIALOG', 'ONCHANGE', 'PASTE', 'RELOAD', 'SCHEDULE', 'DOUBLECLICK', 'KEYPRESS', 'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ', 'Key0', 'Key1', 'Key2', 'Key3', 'Key4', 'Key5', 'Key6', 'Key7', 'Key8', 'Key9', 'KeyF1', 'KeyF2', 'KeyF3', 'KeyF4', 'KeyF5', 'KeyF6', 'KeyF7', 'KeyF8', 'KeyF9', 'KeyF10', 'KeyF11', 'KeyF12', 'KeySpace', 'KeyInsert', 'KeyDelete', 'KeyBracketLeft', 'KeyBracketRight'];
export const NEWOBJECTDATABASE = {
    11: { type: 'title', path: 'Database', data: 'New Database Configuration' },
    12: { type: 'text', path: 'Database', head: 'Database name', data: '', flag: '*%Enter new database name', hint: `Enter new database name full path in next format: folder1/../folderN/dbname. 
Folders are optional and created automatically in a sidebar db hierarchy. Leading slash is not necessary, last seprated name is always treated as a database name, others before - as a folders. Empty folders are ignored.` },
    13: { type: 'textarea', path: 'Database', data: '', head: `User/group list the 'Database' section is hidden for` },
    14: { type: 'textarea', path: 'Database', data: '', head: `Change 'Database' section restricted user/group list` },
    15: { type: 'textarea', path: 'Database', data: '', head: `Change 'Element' section restricted user/group list` },
    16: { type: 'textarea', path: 'Database', data: '', head: `Change 'View' section restricted user/group list` },
    17: { type: 'textarea', path: 'Database', data: '', head: `Change 'Rule' section restricted user/group list`, flag: '*' },
    18: { type: 'textarea', head: 'Macros value', hint: '', data: '', path: `Database/New macros|+%Enter new macros name|Macros list|Database macros list is an optional list of some text data associated with the specified macros. 
Each one may be used both for informative purposes and for any constant definition. You may use these constants in any database configuration settings via js style quoted expression \${<macros name>}. 
For a example, macros name 'Description' may have some text that describes some useful database info` },
    19: { type: 'textarea', path: 'Database/New macros', data: '', head: 'Macros description', flag: '*' },
    20: { type: 'textarea', path: 'Element/New element|+*|Element profile|Set element properties and clone this dialog profile to create new element in object database', head: 'Name', hint: `Element name, used as a default element title in object view display`, data: '', flag: '%Enter element name' },
    21: { type: 'textarea', path: 'Element/New element', head: 'Description', hint: `Element description is displayed as a hint on object view element header navigation for default. Describe here element usage and its possible values`, data: '', flag: '*%Enter element description' },
    22: { type: 'checkbox', path: 'Element/New element', head: 'Type', hint: `Unique element type forces specified element for all objects in database to contain uniq values (of element JSON "value" property) only, so duplicated values are excluded and cause an error. Element type cannot be changed after element creation`, data: 'unique' },
    23: { type: 'select', path: 'Element/New element', head: 'Default event profile', hint: `Specify handler profile to use it for this element all defined client events as a default one (in case of no appropriate event defined below)`, data: 'None/Content editable/Chat', flag: '*' },
    24: { type: 'select', path: 'Element/New element/New event|+-|Event', head: 'Select client event', hint: `Select client event and clone this dialog profile to create new event the handler below will be called on. 
For the mouse and keyboards events select modifier keys, but note that some events (Ctrl+KeyA, Ctrl+KeyC, KeyF1 and others) are reserved for service purposes and do not cancel default client side (browser) behaviour, so may never occur`, data: CLIENTEVENTS.join('/') },
    25: { type: 'checkbox', path: 'Element/New element/New event', data: 'Ctrl/Alt/Shift/Meta', flag: '*' },

    /**/26: { type: 'textarea', path: `Element/New element/New event/Custom handler||Select event hanlder|Select handler to be called on specified event above`, head: 'Command line', hint: `Set command line for the custom handler. Empty lines and with leading '#' are ignored. Fisrt cmd line is executed. Other lines two, but in 'ignore' mode, see handler output processing below`, data: '', flag: '*' },
    /**/27: { type: 'textarea', path: `Element/New element/New event/Vitrual handler`, head: 'Output data', hint: `Set plain text for the virtual handler fixed output. Actually no handler call is perfomed - specified output data is passed directly to the controller`, data: '', flag: '*' },
    /**/28: { type: 'textarea', path: `Element/New element/New event/Predefined handler 'curl'`, head: 'Predefined handler input args',  hint: `All predefined handler command lines are set in 'system' user properties. Change here handler input args only`, data: '', flag: '*' },
    /**/29: { type: 'textarea', path: `Element/New element/New event/Predefined handler 'snmpwalk'`, head: 'Predefined handler input args',  hint: `All predefined handler command lines are set in 'system' user properties. Change here handler input args only`, data: '', flag: '*' },

    34: { type: 'radio', path: `Element/New element/New event/Handler stdout (correct JSON)|!|Handler output processing|Select processing action for handler stdout and stderr output. For correct-JSON (with correct "cmd" property) 'Apply' option execute client side command "cmd". 
See appropriate help section for details. 'Ignore' option does nothing and ignores any output. 
'Set' option wraps handler output to the 'SET' system call: '{ "cmd": "SET", "data": "<handler output>"}'. 
'Message' option displays handler output on client side message box`, data: '!Apply/Message/Ignore', flag: '*' },
    //35: { type: 'checkbox', path: 'Element/New element/New event/Handler stdout (correct JSON)|!', data: 'Log', flag: '*' },
    36: { type: 'radio', path: `Element/New element/New event/Handler stdout (incorrect JSON)|!|Handler output processing`, data: 'Set/Message/!Ignore', flag: '*' },
    //37: { type: 'checkbox', path: 'Element/New element/New event/Handler stdout (incorrect JSON)|!', data: 'Log', flag: '*' },
    38: { type: 'radio', path: 'Element/New element/New event/Handler stderr|!|Handler output processing', data: 'Set/Message/!Ignore', flag: '*' },
    //39: { type: 'checkbox', path: 'Element/New element/New event/Handler stderr|!', data: 'Log', flag: '*' },

    40: { type: 'text', path: 'View/New view|+|View profile|Set view properties and clone this dialog profile to create new view/General', data: '', flag: '%Enter view name', head: 'Name', hint: `Enter here new view name to create or change existing one. 
First '_' character in a view name string keeps unnecessary views off sidebar, so they can be called from element handlers only. Views hiding doesn't affect to its access rights` },
    41: { type: 'textarea', path: 'View/New view/General||View settings', head: 'Description', hint: `Describe here view purpose and usage`, data: '' },
    42: { type: 'checkbox', path: 'View/New view/General|', head: 'Hide from sidebar', hint: `The option keeps unnecessary views off sidebar. Hidden views may be called from event handlers and via shortcut keys yet`, data: 'Hide', flag: '*' },
    43: { type: 'select', path: 'View/New view/General', head: 'Shortcut key', hint: `Select key combination to call the view`, data: 'None/ALT+SHIFT+KeyA/ALT+SHIFT+KeyB/ALT+SHIFT+KeyC/ALT+SHIFT+KeyD/ALT+SHIFT+KeyE/ALT+SHIFT+KeyF/ALT+SHIFT+KeyG/ALT+SHIFT+KeyH/ALT+SHIFT+KeyI/ALT+SHIFT+KeyJ/ALT+SHIFT+KeyK/ALT+SHIFT+KeyL/ALT+SHIFT+KeyM/ALT+SHIFT+KeyN/ALT+SHIFT+KeyO/ALT+SHIFT+KeyP/ALT+SHIFT+KeyQ/ALT+SHIFT+KeyR/ALT+SHIFT+KeyS/ALT+SHIFT+KeyT/ALT+SHIFT+KeyU/ALT+SHIFT+KeyV/ALT+SHIFT+KeyW/ALT+SHIFT+KeyX/ALT+SHIFT+KeyY/ALT+SHIFT+KeyZ' },

    43: { type: 'textarea', path: 'View/New view/Selection', head: 'Selection query', hint: 'Object selection is a part of the sql query string, that selects objects for the view. Empty string selection - all objects, error selection - no objects. See appropriate help section for details', data: '' },
    44: { type: 'text', path: 'View/New view/Selection', head: 'Object selection property name', hint: '', data: 'value', },
    45: { type: 'text', path: 'View/New view/Selection', head: 'Object selection property max chars', hint: '', data: '', },
    46: { type: 'text', path: 'View/New view/Selection', head: 'Object selection link', hint: '', data: '', },
    47: { type: 'textarea', path: 'View/New view/Selection', head: 'Object selection input args', hint: '', data: '', flag: '*' },

    47: { type: 'radio', path: 'View/New view/Layout', head: 'Template', hint: `Select object view template from 'Table' (this template displays objects with its elements in a form of a table, element JSON property 'value' is displayed by default), 
'Tree' (displays the tree of objects acting as a nodes connected with each other via 'link' element property) or 
'Map' (objects are placed on geographic map by 'geo' element property value)`, data: '!Table/Tree/Map' },
    48: { type: 'textarea', path: 'View/New view/Layout', head: 'Layout', hint: `Element layout defines what elements should be displayed and how for the selected template. Empty layout is a default behaviour, see appropriate help section for details.`, data: '', flag: '*' },

    50: { type: 'select', path: 'View/New view/Appearance', head: 'Start layout', data: 'sidebar fit/cascade/random/new pad', hint: 'Select view window position' },
    51: { type: 'radio', path: 'View/New view/Appearance', head: 'Size', data: '!Auto/Full screen/Fixed' },
    52: { type: 'text', path: 'View/New view/Appearance', head: 'Width and height in pixels via comma', data: '' },
    53: { type: 'checkbox', path: 'View/New view/Appearance', head: 'Behaviour', data: '!resize/!full screen/escape/!close icon/always on top' },
    54: { type: 'text', path: 'View/New view/Appearance', head: 'Auto refresh interval', data: '' },
    55: { type: 'checkbox', path: 'View/New view/Appearance', head: 'Bring to top on event', data: 'new data/data delete/data change' },
    56: { type: 'checkbox', path: 'View/New view/Appearance', head: `Auto open on event`, data: 'new data' },
    57: { type: 'text', path: 'View/New view/Appearance', head: 'Lifetime', data: '', flag: '*' },

    60: { type: 'textarea', path: 'View/New view/Permissions', head: `Read access restricted users/groups`, data: '' },
    61: { type: 'textarea', path: 'View/New view/Permissions', head: `Write access restricted users/groups`, data: '', flag: '*' },

    71: { path: 'Rule/New rule|+|Rule profile name|Add new rule profile name. Rule profiles are tested in alphabetical order until the query is successful', type: 'textarea', head: 'Rule message', data: '', hint: `Rule message is a match case message displayed at client side dialog box and optionally logged. For non-empty messages only. Macroses are allowed`, flag: '*' }, 
    72: { path: 'Rule/New rule', type: 'select', head: 'Rule action', data: '!Accept/Reject/Pass', hint: `'Accept' action permits incoming event passes it to the controller, 'Reject' action cancels it, 'Pass' action does nothing and doesn't terminate the search continuing from the next rule, useful for event logging and rule disabling without removing` }, 
    73: { path: 'Rule/New rule', type: 'textarea', head: 'Rule query', data: '', hint: `Every controller incoming event (such as user mouse/keyboard, system SCHEDULE/CHANGE or others) is passed through the rule analyzer to be tested on all rule profiles in alphabetical order one by one until the rule query is successful. 
Rule query is a list of one by line truncated SQL query strings without a SELECT statement that is added automatically. Empty or commented via '#' lines are ignored, but no any query specified causes successful result. 
Non-empty and non-zero result of all query strings - the match is successful; any empty, error or zero char '0' result - no match. When a match is found, the action corresponding to the matching rule profile is performed, no any rule profile match - no any action made. 
Query may contain any macroses such as user or system defined ones (${'${'}oid}, ${'${'}eid}, ${'${'}OD}, ${'${'}OV}, ${'${'}event}, ${'${'}modifier}, etc), so that rules may be applied to the specified events/objects/elements/views only, see 'macros' and 'Rules' help section for details. 
Be aware of using rules for unspecified events, it may cause CPU overload due to every event query call. Examples: ` }, 
    74: { path: 'Rule/New rule', type: 'checkbox', data: 'Log rule message', flag: '*' }, 

    _100: { type: 'button', path: 'Element', data: 'CREATE DATABASE' },
    z101: { head: 'background: rgb(227,125,87);', type: 'button', path: 'Element', data: 'CANCEL' }
   };
