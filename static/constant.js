export const HTMLINNERENCODEMAP		    = [['&', '<', '>', '\n', ' ', '"'], ['&amp;', '&lt;', '&gt;', '<br>', '&nbsp;', '&quot;']];	// Encoding map array of two arrays with symmetric values to encode/decode each other
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
 if (typeof string !== 'string') return '';
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
 if (typeof string !== 'string') return '';
 if (!Array.isArray(encodemap) || !Array.isArray(encodemap[0]) || !Array.isArray(encodemap[1])) return string;

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

const DATABASEPAD = { settings: { type: 'select', head: 'Select object database settings', data: { General: {
    dbname: { type: 'text', data: '', flag: '+Enter new database name', head: `Database name~Enter database name full path in next format: folder1/../folderN/dbname. 
    Folders are optional and created automatically in a sidebar db hierarchy. Leading slash is not necessary, last slash divided name is always treated as a database name, others before - as a folders. Empty folders are ignored` }, 
    description: { type: 'textarea', data: '', head: 'Database description', flag: '*' }, }, 
                                                                                                  Permissions: {
    od: { type: 'textarea', data: '', head: `Restrict this 'Object Database' configuraion for next user/group list~User/group list is a list of users (or groups) one by line (empty lines are ignored), so the restriction is applied for the user that matches the list.
Prefix '!' inverts the value, so string '!support' matches all user names, except 'support'. For the list to match all users use '!' single char. Empty list matches none.
Note that user 'root' is a super user with no any restrictions applied regardless of any lists, so good practice is to use that super user account for recovery purposes only` },
    Database: { type: 'textarea', data: '', head: `Restrict this dialog 'Database' section modify for next user/group list` },
    Element: { type: 'textarea', data: '', head: `Restrict this dialog 'Element' section modify for next user/group list` },
    View: { type: 'textarea', data: '', head: `Restrict this dialog 'View' section modify for next user/group list` },
    Rule: { type: 'textarea', data: '', head: `Restrict this dialog 'Rule' section modify for next user/group list`, flag: '*' }, },
                                                                                                  Macroses: {
    80: { type: 'select', flag: '+Enter new macros name', head: `Macros list~Database macros list is an optional list of some text data associated with the specified macros. 
Each one may be used both for informative purposes and for any constant definitions, which may be used in any database configuration settings via js style quoted expression \${<macros name>}.
Macroses may be nested, so one macros may contain another. Macros loops (when one macros contains another that contains first one) are ignored, so loop case calculation value is set to empty string - when one macros contains another that contains first, this another macros receives an empty string as a first macros value`,
    data: { 'New macros~+-': { 10: { type: 'textarea', head: 'Macros value', data: '' },
                            20: { type: 'textarea', head: 'Macros description', flag: '*', data: '' }, }, } }
    
    },},},};
    
const ELEMENTPAD = {
elements: { type: 'select', head: 'Element profile~Set this template element properties and clone it to create new element in object database', data: { 'New element template~+': {
name: { type: 'textarea', head: 'Name~Element name, used as a default element title in object view display', data: '', flag: '+Enter element name' },
description: { type: 'textarea', head: 'Description~Element description is displayed as a hint on object view element header navigation for default. Describe here element usage and its possible values', data: '', flag: '*+Enter element description' },
//30: { type: 'select', head: 'Хуета', data: '!1!/2~!/3/Test~!~color: red;/A/Zest/q/w/e/r/t/' }, 
//40: { type: 'table', head: 'Table', data: {a: {1:'hui', 2:'piz'}, b:{1:'hui2', _2:'piz2'}} }, 
uniq: { type: 'checkbox', head: `Type~Unique element type defines specified element property 'value' as uniq among all object elements in database, so duplicated values are excluded and cause an error. This behaviour cannot be changed after element creation`, data: 'unique' },
//40: { type: 'select', head: `Default event profile~Specify handler profile to use it for this element all defined client events as a default one (in case of no appropriate event defined below)`, data: 'None/Content editable/Chat', flag: '*' },
event: { type: 'textarea', head: `Event profile list~Specify event profiles one by line to process client side user events. Each client side incoming event is checked on every event profile one by one until the match. When a match is found the appropriaate handler scheme is applied to process event. See system settings help section`, data: '', flag: '*' },
// Event profile -> Event -> Name, Modifiers, Step1 -> Handler(customm, virtual, NodeJS source, predefined1, predefined2..), input args definition (${} - auto dialog arg definition, empty - no dialog, non empty - dialog), Stderr/Stdout/ControllerCall processing (!Apply/Message/Ignore/), Redirect to Next step, Log, timeout in sec, retries
//44: { type: 'select', head: 'Event list~Event list is a list client events, each event has its name, modifier keys and other settings. To create new event (the handler below will be called on) just clone "New event template"', data: { 'New event template': {
    //50: { type: 'select', head: 'Select event', data: CLIENTEVENTS.join(OPTIONSDIVIDER) },
    //60: { type: 'checkbox', head: 'Select modifier key~For the mouse and keyboards events only. Also note that some events (Ctrl+KeyA, Ctrl+KeyC, KeyF1 and others) are reserved by client app (browser), so may not cancel client side default behaviour and may never occur', data: 'Ctrl/Alt/Shift/Meta', flag: '*' },
//} } },
},},},};

const VIEWPAD = {
views: { type: 'select', head: 'View profile~Set view properties and clone this template to create new view', data: { 'New view template~+': {
settings:  { type: 'select', head: 'Select view settings', flag: '*', data: {
    General: {
        name: { type: 'textarea', data: '', flag: '+Enter view name', head: `Name~Enter here view name list (one by line). All names will be sidebar displayed according their paths. Usually second and other ones are used as alias names to be placed in favorites` },
        description: { type: 'textarea', head: `Description~Describe here view purpose and its usage`, data: '', flag: '*' },
        hide: { type: 'checkbox', head: `Hide from sidebar~The option keeps unnecessary views off sidebar. Hidden views may be called from event handlers and via shortcut keys yet`, data: 'Hide' },
        shortcut: { type: 'select', head: `Shortcut key~Select key combination to open the view in a new window`, data: 'None/ALT+SHIFT+KeyA/ALT+SHIFT+KeyB/ALT+SHIFT+KeyC/ALT+SHIFT+KeyD/ALT+SHIFT+KeyE/ALT+SHIFT+KeyF/ALT+SHIFT+KeyG/ALT+SHIFT+KeyH/ALT+SHIFT+KeyI/ALT+SHIFT+KeyJ/ALT+SHIFT+KeyK/ALT+SHIFT+KeyL/ALT+SHIFT+KeyM/ALT+SHIFT+KeyN/ALT+SHIFT+KeyO/ALT+SHIFT+KeyP/ALT+SHIFT+KeyQ/ALT+SHIFT+KeyR/ALT+SHIFT+KeyS/ALT+SHIFT+KeyT/ALT+SHIFT+KeyU/ALT+SHIFT+KeyV/ALT+SHIFT+KeyW/ALT+SHIFT+KeyX/ALT+SHIFT+KeyY/ALT+SHIFT+KeyZ' },
        refresh: { type: 'text', head: 'Auto refresh interval', data: '', flag: '*' },
    }, 
    Selection: {
        10: { type: 'textarea', head: 'Selection query~Object selection is a part of the sql query string, that selects objects for the view. Empty string selection - all objects, error selection - no objects. See appropriate help section for details', data: '' },
        20: { type: 'textarea', head: 'Object selection input args', data: '', flag: '*' },
        30: { type: 'text', head: 'Object selection property name', data: 'value', },
        40: { type: 'text', head: 'Object selection property max chars', data: '', },
        50: { type: 'text', head: 'Object selection link name', data: '', },
    }, 
    Layout: {
        10: { type: 'radio', head: `Template~Select object view template from 'Table' (this template displays objects with its elements in a form of a table, element JSON property 'value' is displayed by default), 
'Tree' (displays the tree of objects acting as a nodes connected with each other via 'link' element property) or 'Map' (objects are placed on geographic map by 'geo' element property value)`, data: 'Table/Tree/Map' },
        48: { type: 'textarea', path: 'View/New view/Layout', head: `Layout~Element layout defines what elements should be displayed and how for the selected template. Empty layout is a default behaviour, see appropriate help section for details.`, data: '', flag: '*' },
        
    },
    Appearance: {
        a: { type: 'radio', data: 'Sidebar fit/Cascade~!/Random/New window', head: 'Window position~Select view window position at the opening', flag: '*' },
        b: { type: 'radio', head: 'Window size', data: 'Auto~!/Full screen/Fixed', flag: '' },
        c: { type: 'text', head: 'Width and height in pixels via comma', data: '', expr: '/Auto~!|Full screen~!/b', flag: '*' },
        d: { type: 'checkbox', head: 'Control', data: 'Resize~!/Full screen~!/Escape/Close icon\n~!/Always on top/Modal', flag: '*' },
        e: { type: 'checkbox', head: 'Bring to top on event', data: 'New data/Data delete/Data change' },
        f: { type: 'checkbox', head: `Auto open in a new window on event`, data: 'New data/Data delete/Data change', flag: '*' },
        g: { type: 'text', head: 'Lifetime', data: '', flag: '' },
    }, 
    Permissions: {
        10: { type: 'textarea', head: `Restrict read access for next users/groups`, data: '' },
        20: { type: 'textarea', head: `Restrict write access for next users/groups`, data: '', flag: '*' },
    }, 
} } }, }, }, };

const RULEPAD = {
    rules: { type: 'select', head: 'Rule profile~Set rule properties and clone this template to create new rule. Rules are tested in alphabetical order one by one until the rule query is successful, the rule action is applied then', data: { 'New rule template~+': {
        10: { type: 'textarea', head: `Rule message~Non empty rule message is displayed at client side dialog box and logged (if set, see 'Log rule message' checkbox below)`, data: '', flag: '*' }, 
        20: { type: 'radio', data: 'Accept/Reject~!/Pass', head: `Rule action~'Accept' action permits incoming event passing it to the controller, 'Reject' action cancels it, 'Pass' action does nothing with no search terminating and continuing from the next rule - useful for event logging and rule disabling without removing` }, 
        30: { type: 'textarea', data: '', head: `Rule query~Every controller incoming event (such as user mouse/keyboard, system SCHEDULE/CHANGE or others) is passed through the controller to be tested on all rules in alphabetical order one by one until the rule query is successful. 
Rule query is a list of one by line truncated SQL query strings with no SELECT statement that is added automatically to the begining of the string. Empty or commented via '#' lines are ignored. Emtpy query - test is successful. Error queries are ignored. 
Non-empty and non-zero result of all query strings - test is successful; any empty, error or zero char '0' result - unsuccessful. The action corresponding to 'successful' rule is performed, no any successful rules - default action 'Accept' is made. 
Query may contain some macroses (${'${'}oid}, ${'${'}eid}, ${'${'}OD}, ${'${'}OV}, ${'${'}event}, ${'${'}modifier}, etc) to apply for specified events/objects/elements/views only. 
Be aware of using queries with no events specified, it may cause some overload due to every incoming event query test` }, 
        40: { type: 'checkbox', data: 'Log rule message', flag: '*' }, }, }, }
};

export const NEWOBJECTDATABASE = {
    padbar: { type: 'select', data: { Database: DATABASEPAD, Element: ELEMENTPAD, View: VIEWPAD, Rule: RULEPAD }  },
    title: { type: 'title', data: 'New Database Configuration' },
    create: { type: 'button', data: 'CREATE DATABASE', flag: 'a', expr: '/^$/dbname' },
    cancel: { style: 'background: rgb(227,125,87);', type: 'button', data: 'CANCEL', flag: '++++++++++' },
};

export const msgcontrol = [ //{ type: 'GETDATABASE', expire: 610, limit: 1, limitreport: 'Wait for previous Object Database configuring request or try again later after request timeout!', e_xpirereport: 'Object Database request server timeout! Please try it again' },
                            //{ type: 'SETDATABASE', expire: '0' },
                            { type: 'DIALOG', limit: '0-0' },
                            { type: 'DIALOGCALLBACK', expire: '0' },
                          ];

/*
    //20: { type: 'textarea', path: 'Element/New element|+*|Element profile|Set element properties and clone this dialog profile to create new element in object database', head: 'Name', hint: `Element name, used as a default element title in object view display`, data: '', flag: '%Enter element name' },
    //21: { type: 'textarea', path: 'Element/New element', head: 'Description', hint: `Element description is displayed as a hint on object view element header navigation for default. Describe here element usage and its possible values`, data: '', flag: '*%Enter element description' },
    //22: { type: 'checkbox', path: 'Element/New element', head: 'Type', hint: `Unique element type forces specified element for all objects in database to contain uniq values (of element JSON "value" property) only, so duplicated values are excluded and cause an error. Element type cannot be changed after element creation`, data: 'unique' },
    //23: { type: 'select', path: 'Element/New element', head: 'Default event profile', hint: `Specify handler profile to use it for this element all defined client events as a default one (in case of no appropriate event defined below)`, data: 'None/Content editable/Chat', flag: '*' },
    //24: { type: 'select', path: 'Element/New element/New event|+-|Event', head: 'Select client event', hint: `Select client event and clone this dialog profile to create new event the handler below will be called on. 
For the mouse and keyboards events select modifier keys, but note that some events (Ctrl+KeyA, Ctrl+KeyC, KeyF1 and others) are reserved for service purposes and do not cancel default client side (browser) behaviour, so may never occur`, data: CLIENTEVENTS.join('/') },
    //25: { type: 'checkbox', path: 'Element/New element/New event', data: 'Ctrl/Alt/Shift/Meta', flag: '*' },

    //26: { type: 'textarea', path: `Element/New element/New event/Custom handler||Select event hanlder|Select handler to be called on specified event above`, head: 'Command line', hint: `Set command line for the custom handler. Empty lines and with leading '#' are ignored. Fisrt cmd line is executed. Other lines two, but in 'ignore' mode, see handler output processing below`, data: '', flag: '*' },
    //27: { type: 'textarea', path: `Element/New element/New event/Vitrual handler`, head: 'Output data', hint: `Set plain text for the virtual handler fixed output. Actually no handler call is perfomed - specified output data is passed directly to the controller`, data: '', flag: '*' },
    //28: { type: 'textarea', path: `Element/New element/New event/Predefined handler 'curl'`, head: 'Predefined handler input args',  hint: `All predefined handler command lines are set in 'system' user properties. Change here handler input args only`, data: '', flag: '*' },
    //29: { type: 'textarea', path: `Element/New element/New event/Predefined handler 'snmpwalk'`, head: 'Predefined handler input args',  hint: `All predefined handler command lines are set in 'system' user properties. Change here handler input args only`, data: '', flag: '*' },

    34: { type: 'radio', path: `Element/New element/New event/Handler stdout (correct JSON)|!|Handler output processing|Select processing action for handler stdout and stderr output. For correct-JSON (with correct "cmd" property) 'Apply' option execute client side command "cmd". 
See appropriate help section for details. 'Ignore' option does nothing and ignores any output. 
'Set' option wraps handler output to the 'SET' system call: '{ "cmd": "SET", "data": "<handler output>"}'. 
'Message' option displays handler output on client side message box`, data: '!Apply/Message/Ignore', flag: '*' },

    //35: { type: 'checkbox', path: 'Element/New element/New event/Handler stdout (correct JSON)|!', data: 'Log', flag: '*' },
    36: { type: 'radio', path: `Element/New element/New event/Handler stdout (incorrect JSON)|!|Handler output processing`, data: 'Set/Message/!Ignore', flag: '*' },
    //37: { type: 'checkbox', path: 'Element/New element/New event/Handler stdout (incorrect JSON)|!', data: 'Log', flag: '*' },
    38: { type: 'radio', path: 'Element/New element/New event/Handler stderr|!|Handler output processing', data: 'Set/Message/!Ignore', flag: '*' },
    //39: { type: 'checkbox', path: 'Element/New element/New event/Handler stderr|!', data: 'Log', flag: '*' },
//----------------------------
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

   };
*/