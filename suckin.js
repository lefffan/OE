import { ELEMENTCOLUMNPREFIX, OPTIONSDIVIDER, BUTTONOK, BUTTONCANCEL, CutString, FIELDSDIVIDER, OPTIONISCLONED, OPTIONISCLONABLE, OPTIONISREMOVABLE, WARNINGDIALOG, SUPERUSER } from './globals.js';

const MOUSEEVENTS                   = ['DOUBLECLICK'];
const MISCEVENTS                    = ['ADDOBJECT', 'DELETEOBJECT', 'CONFIRMEDIT', 'CONFIRMDIALOG', 'PASTE'];
const CALLBACKEVENTS                = ['ONEVENT', 'ONTIMER'];
export const USERNAMEMAXCHAR        = 255;
export const NATIVEKEYBOARDEVENTS   = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'F1',    'F2',    'F3',    'F4',    'F5',    'F6',    'F7',    'F8',    'F9',    'F10',    'F11',    'F12',    'Space',    'Delete',    'BracketLeft',    'BracketRight'];
export const KEYBOARDEVENTS         = ['KEYA', 'KEYB', 'KEYC', 'KEYD', 'KEYE', 'KEYF', 'KEYG', 'KEYH', 'KEYI', 'KEYJ', 'KEYK', 'KEYL', 'KEYM', 'KEYN', 'KEYO', 'KEYP', 'KEYQ', 'KEYR', 'KEYS', 'KEYT', 'KEYU', 'KEYV', 'KEYW', 'KEYX', 'KEYY', 'KEYZ', 'KEY0',   'KEY1',   'KEY2',   'KEY3',   'KEY4',   'KEY5',   'KEY6',   'KEY7',   'KEY8',   'KEY9',   'KEYF1', 'KEYF2', 'KEYF3', 'KEYF4', 'KEYF5', 'KEYF6', 'KEYF7', 'KEYF8', 'KEYF9', 'KEYF10', 'KEYF11', 'KEYF12', 'KEYSpace', 'KEYDelete', 'KEYBracketLeft', 'KEYBracketRight', 'KEYPRESS'];
export const CONTROLLEREVENTS       = ['EMULATE', 'EDIT', 'DIALOG', 'SET', 'WRITE', 'PUT', 'ADJUST', 'RESET', 'UPDATE', 'PUSH', 'COLLECT', 'UPLOAD', 'DOWNLOAD', 'UNLOAD', 'GALLERY', 'NULL', 'COPY', 'NEWPAGE'];
export const CLIENTEVENTS           = [...KEYBOARDEVENTS, ...MOUSEEVENTS, ...MISCEVENTS, ...CALLBACKEVENTS];

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
function GetDialogElement(dialog, path, value)
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
                    const [name, flag] = option.split(FIELDSDIVIDER, 2);
                    if (value && (flag || '').includes('!')) return name;
                    if (!value) options[option] = (flag || '').includes('!');
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

function CompareOptionInSelectElement(string, option)
{
 [string] = string.split('~', 1);
 [option] = option.split('~', 1);
 return string === option;
}

/*********************************************************************************************************/
/*************************************Object Database dialog template start*******************************/
/*********************************************************************************************************/
const MAINPAD = { settings: { type: 'select', head: 'Select object database settings', data: {
                      General: {
                                dbname: { type: 'text', data: '', flag: '+Enter new database name', head: `Database name~Enter database name full path in next format: folder1/../folderN/dbname. Folders are optional and created automatically in a sidebar db hierarchy. Leading slash is not necessary, last slash divided name is always treated as an object database name, others before - as a folders. Empty folders are ignored` }, 
                                description: { type: 'textarea', data: '', head: 'Database description', flag: '*' }, },
                      Permissions: {
                                od: { type: 'textarea', data: '', head: `Restrict this 'Object Database' configuraion read access for next user/group list~User/group list is a list of users (or groups) one by line (empty lines are ignored). Specified restriction (so all below) is applied for the user that matches the list. No match - no restriction applied. Prefix '!' inverts the value, so string '!support' matches all user names, except 'support'. For the list to match all users use '!' single char. Empty list matches no user. Note that user 'root' is a super user with no any restrictions applied regardless of any lists, so good practice is to use that super user account for recovery purposes only` },
                                Database: { type: 'textarea', data: '', head: `Restrict this dialog 'Database' section modify for next user/group list` },
                                Element: { type: 'textarea', data: '', head: `Restrict this dialog 'Element' section modify for next user/group list` },
                                View: { type: 'textarea', data: '', head: `Restrict this dialog 'View' section modify for next user/group list` },
                                Rule: { type: 'textarea', data: '', head: `Restrict this dialog 'Rule' section modify for next user/group list`}, },
                      Macros: {
                                 macros: { type: 'select', flag: '+Enter new macro name', head: `Macro list~Database macro list is an optional list of some text data associated with the specified macro names that can be replaced in some database or user properties text configuration settings via js style quoted expression \${<macro name>}. Macros may be nested, so one macro may contain another. Macro loops, when one macro contains another that contains first one, are ignored, so loop case calculation value is set to empty string - when one macro contains another that contains first, this another macro receives an empty string as a first macro value`, data: { 'New macro~+-': {
                                 value: { type: 'textarea', head: 'Macro value~Text to submit macro name', data: '' },
                                 description: { type: 'textarea', head: 'Macro description~Enter some text here to describe macro uasge', flag: '*', data: '' }, }, } }
    
                    },},},};
const ELEMENTPAD = {
                    elements: { type: 'select', head: 'Element profile~Set this template element properties and clone it to create new element in object database', data: { 'New element template~+': {
                    name: { type: 'textarea', head: 'Name~Element name, used as a default element title in object view display', data: '', flag: '+Enter element name' },
                    description: { type: 'textarea', head: 'Description~Element description is displayed as a hint on object view element header navigation for default. Describe here element usage and its possible values', data: '', flag: '*+Enter element description' },
                    type: { type: 'text', head: 'Element column type~', data: 'JSON' },
                    index: { type: 'radio', head: `Element column index~Unique element type defines specified element property 'value' as uniq among all object elements in database, so duplicated values are excluded and cause an error. This behaviour cannot be changed after element creation`, data: 'None~!/btree/UNIQUE btree/hash', flag: '*' },
                    event: { type: 'textarea', head: `Event group profile list~Specify event profiles one by line to process client side user events. Each client side incoming event is checked on every event profile one by one until the match. When a match is found the appropriaate handler scheme is applied to process event. See system settings help section`, data: '', flag: '*' },
                   },},},};
const VIEWPAD = {
                 views: { type: 'select', head: 'View profile~Set view properties and clone this template to create new view', data: { 'New view template~+': {
                 settings:  { type: 'select', head: 'Select view setting', flag: '*', data: {
                 General: {
                           name: { type: 'textarea', data: '', flag: '+Enter view name', head: `Name~Enter here view name list (one by line). All names will be sidebar displayed according their paths. Usually second and other ones are used as alias names to be placed in favorites. No view names specified - the view is sidebar hidden, but still can be called to open from event handlers or shortcut keys` },
                           description: { type: 'textarea', head: `Description~Describe here view purpose and its usage`, data: '' },
                           shortcut: { type: 'select', head: `Shortcut key~Select key combination to open the view in a new window. For sidebar focus only`, data: 'None/ALT+SHIFT+KeyA/ALT+SHIFT+KeyB/ALT+SHIFT+KeyC/ALT+SHIFT+KeyD/ALT+SHIFT+KeyE/ALT+SHIFT+KeyF/ALT+SHIFT+KeyG/ALT+SHIFT+KeyH/ALT+SHIFT+KeyI/ALT+SHIFT+KeyJ/ALT+SHIFT+KeyK/ALT+SHIFT+KeyL/ALT+SHIFT+KeyM/ALT+SHIFT+KeyN/ALT+SHIFT+KeyO/ALT+SHIFT+KeyP/ALT+SHIFT+KeyQ/ALT+SHIFT+KeyR/ALT+SHIFT+KeyS/ALT+SHIFT+KeyT/ALT+SHIFT+KeyU/ALT+SHIFT+KeyV/ALT+SHIFT+KeyW/ALT+SHIFT+KeyX/ALT+SHIFT+KeyY/ALT+SHIFT+KeyZ' }, },
                 Selection: {
                           template: { type: 'radio', head: `Template~Select object view template for the form the OV data is displayed. 'Table' template displays objects with its elements in a form of a table. Template 'Tree' displays the tree of objects acting as a nodes connected with each other via 'link' element property (for JSON type elements only). And 'Map' template places objects on geographic map based on their elements with 'geo' property (for JSON type elements only)`, data: 'Table~!/Tree/Map', flag: '*' },
                           layout: { type: 'textarea', head: `Layout~As template defines the form objects are displayed, layout defines what elements should be displayed and how for the selected template above. Element layout is a JSON list and should contain at least one valid JSON to display any data at all, see appropriate help section for details`, data: '' },
                           query: { type: 'textarea', head: 'Query~Columns/expressions to select from OD (see FROM statement below). Built automatically from element layout. See appropriate help section for details', data: '', flag: '+SELECT id,eid1,edi2 FROM <data_N> WHERE lastversion = 1' },
                           linkname: { type: 'text', head: 'Link~Object selection link name', data: '' }, }, 
                 Macros: {
                           call: { type: 'checkbox', data: 'Call dialog', head: `Macro definition dialog~This OV macros for 'Selection' layout/query and OD 'Rule' message/query fields may be (re)defined by the user manually via dialog that is called at client side before OV open. Checked 'Call dialog' option calls client side dialog, unchecked - doesn't, but all macro values in dialog structure below are applied anyway. Trimmed text area below is empty - dialog structure for all mentioned macros in 'View selection' and 'OD Rule' are created automatically. Dialog structure interface element property name is a macro name, input field content - macro value (for 'textarea', 'text', 'password', 'select', 'radio' and 'checkbox' interface element types only). Dialog structure defined macros are applied regardless of 'Call dialog' option. Dialog structure should contain input fields only, dialog title with 'OK'/'CANCEL' buttons are added automatically. Client side dialog call may be used not for macro definitions, but for info/warning message display before OV open. Macro 'SOMEMACROS' definition dialog example: { "SOMEMACROS": { "type": "text", "head": "Input macro SOMEMACROS value", "data": "" } }` },
                           dialog: { type: 'textarea', head: '', data: '', flag: '*' }, }, 
                 Appearance: {
                           init: { type: 'radio', head: 'Window init~OV opens in a current window, new window or in a browser new tab (read-only mode)', data: 'Current window~!/New window/Browser new tab' },
                           position: { type: 'radio', data: 'Sidebar fit/Cascade~!/Random', head: 'Initial window position~Select view window position at the opening' },
                           size: { type: 'radio', head: 'Initial window size', data: 'Auto~!/Full screen/Fixed', flag: '' },
                           width: { type: 'text', head: 'Comma separated width and height in pixels', data: '', expr: '/Auto~!|Full screen~!/c', flag: '*' },
                           control: { type: 'checkbox', head: 'Control', data: 'Resize~!/Full screen~!/Escape/Close icon\n~!/Always on top/Modal', flag: '*' },
                           bringtotop: { type: 'checkbox', head: 'Bring to top on event', data: 'New data/Data delete/Data change' },
                           autoopen: { type: 'checkbox', head: `Auto open in a new window on event`, data: 'New data/Data delete/Data change' },
                           refresh: { type: 'checkbox', head: `OV full refresh on event`, data: 'New data/Data delete/Timer' },
                           timer: { type: 'text', data: '', flag: '*', expr: '/^((?!Timer~!).)*$/h', flag: '*' },
                           lifetime: { type: 'text', head: 'Lifetime~OV window lifetime (in seconds) after which the window will be closed automatically. Zero/empty/error value - no action', data: '', flag: '' }, }, 
                 Permissions: {
                           read: { type: 'textarea', head: `Restrict read access for next users/groups`, data: '' },
                           write: { type: 'textarea', head: `Restrict write access for next users/groups`, data: '', flag: '*' },
                }, } } }, }, }, };
const RULEPAD = {
                 rules: { type: 'select', head: 'Rule profile~Set rule properties and clone this template to create new rule. Rules are tested in alphabetical order one by one until the rule query is successful, the rule action is applied then', data: { 'New rule template~+': {
                           message: { type: 'textarea', head: `Rule message~Non empty rule message is displayed as a warning at client side dialog box and logged if appropriate option below is set`, data: '', flag: '*' }, 
                           action: { type: 'radio', data: 'Accept/Reject~!/Pass', head: `Rule action~'Accept' action permits incoming event passing it to the controller, 'Reject' action cancels it, 'Pass' action does nothing with no search terminating and continuing from the next rule - useful for event logging and rule disabling without removing` }, 
                           query: { type: 'textarea', data: '', head: `Rule query~Every controller incoming event (such as user mouse/keyboard, system SCHEDULE/CHANGE or others) is passed through the controller to be tested on all rules in alphabetical order one by one until the rule query is successful. Rule query is a list of one by line truncated SQL query strings with no SELECT statement that is added automatically to the begining of the string. Empty or char '#' commented lines are ignored. Emtpy query - test is successful. Error queries are ignored. Non-empty and non-zero result of all query strings - test is successful; any empty, error or zero char '0' result - unsuccessful. The action corresponding to 'successful' rule is performed, no any successful rules - default action 'Accept' is made. Query may contain some macros (${'${'}OID}, ${'${'}EID}, ${'${'}OD}, ${'${'}OV}, ${'${'}EVENT}, ${'${'}MODIFIER}, etc..) to apply for specified events/objects/elements/views only. Be aware of using queries with no events specified, it may cause some overload due to every incoming event query test made` }, 
                           log: { type: 'checkbox', data: 'Log/Warning', flag: '*' },
                }, }, } };
export const NEWOBJECTDATABASE = {
                           padbar: { type: 'select', data: { Main: MAINPAD, Element: ELEMENTPAD, View: VIEWPAD, Rule: RULEPAD }  },
                           title: { type: 'title', data: 'New Database Configuration' },
                           ok: { type: 'button', data: 'CREATE DATABASE', flag: 'a', expr: '/^$/dbname' },
                           cancel: { style: 'background: rgb(227,125,87);', type: 'button', data: 'CANCEL' },
                          };
/*********************************************************************************************************/
/*************************************Object Database dialog template end*********************************/
/*********************************************************************************************************/

/*********************************************************************************************************/
/*****************************************User Database dialog start**************************************/
/*********************************************************************************************************/
export const USEROBJECTDATABASE = JSON.parse(JSON.stringify(NEWOBJECTDATABASE));
GetDialogElement(USEROBJECTDATABASE, 'padbar/Main/settings/General/dbname').data = 'Users';
const elementprofileTemplate = JSON.stringify(GetDialogElement(USEROBJECTDATABASE, 'padbar/Element/elements/New element template'));
const viewprofileTemplate = JSON.stringify(GetDialogElement(USEROBJECTDATABASE, 'padbar/View/views/New view template'));
const elements = GetDialogElement(USEROBJECTDATABASE, 'padbar/Element/elements', true);
const views = GetDialogElement(USEROBJECTDATABASE, 'padbar/View/views', true);
const USERODLAYOUT = '${LAYOUT h,n,-}' + `
{"exp":"r>=0 && c===6", "value":"Change password"}
{"exp":"r>=0 && c===7", "value":"Configure event groups"}
`;
const enewprofiles = { 'username~*': { name: 'Username', description: 'Username', type: `VARCHAR(${USERNAMEMAXCHAR})`, index: 'None/btree/UNIQUE btree~!/hash' },
                    'password~*': { name: 'Password', description: 'Password', type: 'TEXT', index: 'None~!/btree/UNIQUE btree/hash' },
                    'custom~*': { name: 'Custom field', description: 'Custom field', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' },
                    'policy~*': { name: 'Policy', description: 'Policy', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' },
                    'customization~*': { name: 'Customization', description: 'Customization', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' },
                    'event groups~*': { name: 'Event groups', description: 'Event groups', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' } };
const vnewprofiles = { 'All~*': { settings: { data: { General: { name: 'All users', description: 'All users list' }, 
                                                      Selection: { layout: USERODLAYOUT, query: `SELECT id,ownerid,owner,datetime,lastversion,${ELEMENTCOLUMNPREFIX}1,${ELEMENTCOLUMNPREFIX}2,${ELEMENTCOLUMNPREFIX}6\nFROM data_1` } } } } };
for (const profilename in enewprofiles)
    {
     elements[profilename] = JSON.parse(elementprofileTemplate);
     for (const e in enewprofiles[profilename])
         {
          elements[profilename][e].data = enewprofiles[profilename][e];
          if (e === 'type') elements[profilename][e].expr = '/^/'; // Make element type (column type in DB) readonly
         }
    }                                                     
for (const profilename in vnewprofiles)
    {
     views[profilename] = JSON.parse(viewprofileTemplate);
     for (const p in vnewprofiles[profilename].settings.data) 
     for (const e in vnewprofiles[profilename].settings.data[p]) 
         views[profilename].settings.data[p][e].data = vnewprofiles[profilename].settings.data[p][e];
    }                                                     
/*********************************************************************************************************/
/******************************************User Database dialog end***************************************/
/*********************************************************************************************************/

/*********************************************************************************************************/
/***************************************Super user event dialog start*************************************/
/*********************************************************************************************************/
const newevent = JSON.stringify({ events: { type: 'select', head: 'Select event type', data: CLIENTEVENTS.join(OPTIONSDIVIDER) },
                           modifier: { type: 'checkbox', head: 'Select event modifier keys~For mouse and keyboard (except KEYPRESS) events only. Note that some events (Ctrl+KeyA, Ctrl+KeyC, KeyF1 and others) are reserved by client app (browser) for its default behaviour, so may never occur', data: 'Ctrl/Alt/Shift/Meta', expr: `/${[...CALLBACKEVENTS, ...MISCEVENTS, 'KEYPRESS'].join('~\!|')}~!/events` },
                           attr: { type: 'text', head: 'Event attribute~For ONEVENT and ONTIMER events only', data: '', flag: '*', expr: '/^(?!.*(ONEVENT~\!|ONTIMER~\!)).*$/events' },
                           handlertype: { type: 'select', head: 'Handler type', data: 'Disabled~!/Fixed output/Command line/Shell command line/Module function' },
                           handlerdata: { type: 'textarea', head: 'Handler data', data: '', expr: '/Disabled~!/handlertype' },
                           timeout: { type: 'text', head: `Handler timeout~Timeout, in seconds, for the controller to wait the handler to response. For incorrect/undefined string a default value of 30 sec is used. The setting is applied for 'Command line' and 'Eval' handler types only`, data: '30', expr: '/^(?!.*Shell command line~\!)(?!.*Command line~\!)/handlertype' },
                           retry: { type: 'text', head: `Retries~Handler restart attempts on timeout. For incorrect/undefined string a zero value (0 retries) is used: the handler is not restarted after timeout. The setting is applied for 'Command line' or 'Eval' handler types only`, data: '0', flag: '', expr: '/^(?!.*Shell command line~\!)(?!.*Command line~\!)/handlertype' },
                           output: { type: 'checkbox', head: 'Handler result action', data: `Wrap/Debug/Ignore`, expr: '/Disabled~!/handlertype' }, // specfied action for handler any stdout or stderr is applied. Checked 'Ignore' option ignores handler output doing nothing regardless of other option checked. Checked 'Debug' displays clientside info msg with handler output data. No Ignore/Debug options set - handler output data of itself or converted to SET cmd output data for 'Wrap' checked - is applied
                         });
const neweventgroup = { evsel: { type: 'select', head: 'Select event profile for event group above', data: { 'New event~+': JSON.parse(newevent) }, flag: '*' } };
//////////////////////////////    
const CALLDIALOG = JSON.parse(newevent);
delete CALLDIALOG.events;
delete CALLDIALOG.modifier;
delete CALLDIALOG.attr;
CALLDIALOG.handlertype.data = 'Disabled/Fixed output~!/Command line/Shell command line/Module function';
CALLDIALOG.handlerdata.data = '{"type": "DIALOG", "data": { "content": "${}" } }';
const SETDATA = JSON.parse(newevent);
delete SETDATA.events;
delete SETDATA.modifier;
delete SETDATA.attr;
SETDATA.handlertype.data = 'Disabled/Fixed output/Command line/Shell command line/Module function~!';
SETDATA.handlerdata.data = 'modules.SetData\n${EVENTDATA}\n${EPROP}';
const EDIT = JSON.parse(newevent);
delete EDIT.events;
delete EDIT.modifier;
delete EDIT.attr;
EDIT.handlertype.data = 'Disabled/Fixed output~!/Command line/Shell command line/Module function';
EDIT.handlerdata.data = '{"type": "EDIT"}';
const SETNODATA = JSON.parse(newevent);
delete SETNODATA.events;
delete SETNODATA.modifier;
delete SETNODATA.attr;
SETNODATA.handlertype.data = 'Disabled/Fixed output/Command line/Shell command line/Module function~!';
SETNODATA.handlerdata.data = 'modules.SetData\n\n${EPROP}';
//////////////////////////////    
const system = { evsel: { type: 'select', head: 'Select event profile', data: { 'New event~+': JSON.parse(newevent), 'DOUBLECLICK~+': CALLDIALOG, 'CONFIRMEDIT~+': SETDATA, 'CONFIRMDIALOG~+': SETDATA }, flag: '*' } };
const general = { evsel: { type: 'select', head: 'Select event profile', data: { 'New event~+': JSON.parse(newevent), 'KEYF2~+': EDIT, 'DOUBLECLICK~+': EDIT, 'KEYDelete~+': SETNODATA, 'CONFIRMEDIT~+': SETDATA, 'CONFIRMDIALOG~+': SETDATA }, flag: '*' } };
export const EVENTGROUPDIALOG = {
                           title: { type: 'title', data: 'Event profiling' },
                           eventgroups: { type: 'select', head: 'Select event group profile', data: { 'New event group~+': neweventgroup, 'SYSTEM~+': system, 'GENERAL~+': general } },
                           ok: JSON.parse(BUTTONOK),
                           cancel: JSON.parse(BUTTONCANCEL),
                         };
/*********************************************************************************************************/
/****************************************Super user event dialog end**************************************/
/*********************************************************************************************************/

// Function parses dialog structure for OD params and return them to suck in to the memort for the quick access. Vars maxeid/maxovid need to add new elements/views with ids not overlapped with elements/view ids of previous OD version 
export function SuckInDatabaseProps(dialog, odid, neweid = 1, newovid = 1)
{
 let profile;
 const props = { dialog: dialog, od: {}, elements: {}, views: {}, rules: {} };

 try {
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
           props.od.odreplacements[macroname.split('~', 1)] = macrovalue;
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
      for (let option in profile)
          if (!CompareOptionInSelectElement('New rule', option)) AdjustProfileOption(profile, option);
      props.rules = Object.keys(profile).sort((a, b) => a.localeCompare(b));	// Get all rule profile names to the array in alphabetical order
      for (let i = 0; i < props.rules.length; i++) // Then go through all of them
          {
           const option = props.rules[i];
           if (!CompareOptionInSelectElement('New rule', option) && props.rules.splice(i--, 1)) continue; // excluding template
           const rule = props.rules[i] = { key: option.split(FIELDSDIVIDER, 1)[0] }; // Store rule object with rule profile name as a key prop
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
           for (const prop of ['General/name', 'General/description', 'General/shortcut', 'Selection/template', 'Selection/layout', 'Selection/query', 'Selection/linkname', 'Appearance/init', 'Appearance/position', 'Appearance/size', 'Appearance/width', 'Appearance/timer', 'Appearance/lifetime', 'Macros/call', 'Macros/dialog', 'Permissions/read', 'Permissions/write'])
               view[prop.split('/')[0].toLowerCase()][prop.split('/')[1]] = GetDialogElement(profile[option], `settings/${prop}`, true).trim();
           for (const prop of ['Appearance/control', 'Appearance/bringtotop', 'Appearance/autoopen', 'Appearance/refresh'])
               view[prop.split('/')[0].toLowerCase()][prop.split('/')[1]] = GetDialogElement(profile[option], `settings/${prop}`, false);
           view.general.name = [...new Set(view.general.name.split('\n').map(alias => alias.trim()))].join('\n'); // Exclude duplicated aliases

           // Macro dialog field is empty and 'Call dialog' option is checked? Create macro dialog automatically
           if (!view.macros.dialog && view.macros.call)
              {
               view.replacements = Object.assign(SearchMacrosNames({}, view.selection.layout, view.selection.query), rulereplacements); // Create view replacements - it is built from search in all rules message/query fields, plus view selection layout/query. Todo0 - go through all available handler data text areas to search other non JSON/dynamic macros to exclude
               view.macros.dialog = BuildMacrosDialog(view.replacements, props.od.undefinedodreplacements); // Build dialog to define macros in 1st arg excluding 2nd arg
              }
           try { view.macros.dialog = JSON.parse(view.macros.dialog); } // Parse macro dialog to object
           catch { view.macros.dialog = JSON.parse(WARNINGDIALOG); view.macros.dialog.msg.head = 'Wrong macro dialog syntax!'; } // In case of wrong dialog syntax warning dialog is created with <view.replacements> untouched
           view.replacements = GetDialogMacrosValues(view.macros.dialog); // Retrieve all macro values from select/text interface elements
          }

      // Return props
      return props;
     }
 catch(error)
     {
      console.error(`Sucking in OD id ${odid} error: ${error.stack}`);
     }
}

// Function takes cloned options, removes 'cloned' flag, adds '+-' flags and creates new option with changed name (for true <addid>) and flag
function AdjustProfileOption(profile, option, addid)
{
 let [name, flag, ...style] = option.split(FIELDSDIVIDER);          // Split option to its name and flag via FIELDSDIVIDER char '~'
 if (addid) name += ` (id${addid})`;                                // Add ' (id<num>)' to option name
 flag = flag || '';
 if (addid && !flag.includes(OPTIONISCLONED)) return;              // Var <addid> is added for cloned profiles only, so do not process non-cloned if <addid>
 flag = flag.replaceAll(OPTIONISCLONED, '');
 if (!flag.includes(OPTIONISCLONABLE)) flag += OPTIONISCLONABLE;
 if (!flag.includes(OPTIONISREMOVABLE)) flag += OPTIONISREMOVABLE;
 style = style.length ? style.join(FIELDSDIVIDER) : '';             // Join back style string

 const newoption = `${name}${flag || style ? FIELDSDIVIDER + flag : ''}${style ? FIELDSDIVIDER + style : ''}`;  // Build new option name
 profile[newoption] = profile[option];                                                  // and include it to profile instead of old <option>
 delete profile[option];
 return newoption;
}

function GetOptionNameId(option)
{
 if (typeof option !== 'string') return '';
 [option] = option.split(FIELDSDIVIDER, 1); // Get option name without flags/style
 let id = option.lastIndexOf('id');                 // Serach id string in non-cloned option names
 if (id === -1) return;                             // Return undefined for no 'id' string present
 id = option.slice(id + 2, -1);                     // Clip num after 'id' string and convert it to number
 return isNaN(+id) ? '' : id;                       // and return string containing 
}

// Function sucks in every user permissions and customization, plus super user event group profiles. Todo0 - make this "suck" every time the super user or ordinary user record is changed
export function SuckInUserProps(userrow)
{
 try {
      // Parsing user policy from <userrow.eid4>. Todo0 - no policy for super user? One way is here to allow all for superuser, another way - exclude superuser on restriction check
      const policy = {};
      for (const prop of ['groups', 'instances', 'timeout', 'read', 'write', 'create', 'task'])
          {
           policy[prop] = GetDialogElement(userrow.eid4, prop, true);
           if (typeof policy[prop] !== 'string') throw new Error(`Couldn't suck in user policy '${prop}'!`);
          }
      // Parsing super user event groups <userrow.eid6>
      const egs = {};
      if (userrow.eid1 === SUPERUSER)  for (let eg in GetDialogElement(userrow.eid6, 'eventgroups', true)) if (!CompareOptionInSelectElement('New event group', eg))
         {
          eg = eg.split('~', 1)[0];
          egs[eg] = {};
          for (let e in GetDialogElement(userrow.eid6, `eventgroups/${eg}/evsel`, true)) if (!CompareOptionInSelectElement('New event', e))
              {
               e = e.split('~', 1)[0];
               egs[eg][e] = {};
               for (const prop of ['handlertype', 'handlerdata', 'timeout', 'retry'])
                   if (typeof (egs[eg][e][prop] = GetDialogElement(userrow.eid6, `eventgroups/${eg}/evsel/${e}/${prop}`, true)) !== 'string') throw new Error(`Couldn't suck in user event group '${eg}'!`);
               egs[eg][e].output = GetDialogElement(userrow.eid6, `eventgroups/${eg}/evsel/${e}/output`, false);
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
 catch (error)
     {
      console.log(`Sucking in user '${userrow.eid1}' error: ${error.message}`);
     }
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
 const freenames = Object.keys(SYSTEMSTATICMACROS); // Get some names (for dialog props used as a macro names) that is surely not used as a user defined macro names

 // Go through all <includereplacements> excluding <excludereplacements> (plus system and dynamic macros) and create dialog text input fields for all of them
 for (const macroname in includereplacements)
     if (!(macroname in SYSTEMSTATICMACROS) && !IsSystemDynamicMacro(macroname) && !(macroname in excludereplacements))
        dialog += `${dialog ? ', ' : ''}"${macroname}": { "type": "textarea", "head": "Enter macro '<b>${macroname}</b>' value", "data": "" }`;

 // For non-empty dialog add title and two btns
 if (dialog) dialog = `{ "${freenames[0]}": { "type": "title", "data": "Macros definition dialog" }, "${freenames[1]}": ${BUTTONOK}, "${freenames[2]}": ${BUTTONCANCEL}, ${dialog} }`;
 return dialog;
}

// Todo0 - change service char like delimiter '*', '!' (see dialog.js) to const var in globals to be used in frontend and backend
// Todo0 - remake all sucking functions and put them in suckin.js
// Todo0 - calc globals var/functions that intersects with front and back - this case may cause a backend disfunction via front
// Todo0 - all service data like odid/ovid/oid/eid should be in msg, not in msg.data
