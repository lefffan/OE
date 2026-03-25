export const SYSTEMELEMENTNAMES     = { id : 'Object identificator', version: 'Object store version', lastversion: 'Flag indicates the object last instance', mask: 'Object modified elements bit mask', ownerid: 'User id the object was created by', owner: 'User name the object was created by', datetime: 'Date and time this object version was created at', date: 'The date this object version was created at', time: 'The time this object version was created at' };
export const LAYOUTJSONPROPS        = ['row', 'col', 'x', 'y', 'value', 'style', 'hint', 'collapsecol', 'collapserow', 'event'];
export const SUPERUSER              = 'root';
export const BUTTONOK               = JSON.stringify({ type: 'button', data: '  OK  ', style: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;`, flag: 'a' });
export const BUTTONCANCEL           = JSON.stringify({ type: 'button', data: 'CANCEL', style: `border: 1px solid rgb(227,125,87); color: rgb(227,125,87); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;` });
export const BUTTONAPPLY            = JSON.stringify({ type: 'button', data: 'APPLY',  style: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;`, flag: 'a*' });
export const MODALBOXPROPS          = JSON.stringify({ animation: 'rise', position: 'CENTER', overlay: 'MODAL', attributes: { class: 'dialogbox selectnone' } });
export const RANDOMSTRINGCHARS      = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const CELLMINWIDTH           = 25;
export const CELLMINHEIGHT          = 25;
export const EDITABLE               = 'plaintext-only';
export const NOTEDITABLE            = 'false';
export const ANIMATIONS		          = ['hotnews', 'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall', 'rise'];
export const TITLEVIRTUALROWID      = -2;
export const NEWVIRTUALROWID        = -1;
export const PRIMARYKEYSTARTVALUE   = 3;
export const HTMLINNERENCODEMAP		  = [['&', '<', '>', '\n', ' ', '"'], ['&amp;', '&lt;', '&gt;', '<br>', '&nbsp;', '&quot;']];	// Encoding map array of two arrays with symmetric values to encode corresponded array elements from 1st one to second
export const HTMLINNERDECODEMAP		  = [['&amp;', '&lt;', '&gt;', '<br>', '&nbsp;', '&quot;'], ['&', '<', '>', '\n', ' ', '"']];
export const TAGATTRIBUTEENCODEMAP	= [['<', '>', '\n', '"'], ['&lt;', '&gt;', '', '&quot;']];
export const TAGHTMLCODEMAP		      = [['<', '>', '\n'], ['&lt;', '&gt;', '']];
export const ELEMENTINNERALLOWEDTAGS= ['span', 'pre', 'br'];
export const ELEMENTCOLUMNPREFIX    = 'eid';
export const TRANSACTIONERROR       = 'Transaction init error!'
export const FIELDSDIVIDER          = '~';
export const USERNAMEMAXCHAR        = 125;
const INCORRECTDBCONFDIALOG     = 'Incorrect dialog structure!';
const INCORRECTDBCONFDBNAME     = 'In order to remove Object Database via setting empty database name please remove all elements, views and rules first!';
const EMPTYDBCONFDBNAME         = 'Cannot create new database with empty name!';

export function GetTableNameId(name)
{
 let pos = name.indexOf('_');
 if (pos === -1) return;
 name = name.substring(pos + 1);
 return isNaN(+name) ? undefined : name;
}

export function GetOptionNameId(option)
{
 [option] = option.split(FIELDSDIVIDER, 1); // Get option name without flags/style
 let id = option.lastIndexOf('id');                 // Serach id string in non-cloned option names
 if (id === -1) return;                             // Return undefined for no 'id' string present
 id = option.slice(id + 2, -1);                     // Clip num after 'id' string and convert it to number
 return isNaN(+id) ? '' : id;                       // and return string containing 
}

// Function checkes OD dialog structure and returns true for correct structure, otherwise throws an error. In case of correct structure and empty db name with element/view/rules profiles number - function returns undefined to remove db
export function CheckDatabaseConfigurationDialogStructure(dialog, action)
{
 let elements, views, rules, odname;
 if (!(elements = GetDialogElement(dialog, 'padbar/Element/elements'))) throw new Error(INCORRECTDBCONFDIALOG);
 if (!(views = GetDialogElement(dialog, 'padbar/View/views'))) throw new Error(INCORRECTDBCONFDIALOG);
 if (!(rules = GetDialogElement(dialog, 'padbar/Rule/rules'))) throw new Error(INCORRECTDBCONFDIALOG);
 if (typeof elements.data !== 'object' || typeof views.data !== 'object' || typeof rules.data !== 'object') throw new Error(INCORRECTDBCONFDIALOG);

 odname = GetDialogElement(dialog, 'padbar/Database/settings/General/dbname', true);
 if (typeof odname !== 'string') throw new Error(INCORRECTDBCONFDIALOG);

 if (!odname && ['create', 'read'].includes(action)) throw new Error(EMPTYDBCONFDBNAME); // Empty od name for new OD creating or old OD reading
 if (!odname && action === 'edit' && (Object.keys(elements.data).length > 1 || Object.keys(views.data).length > 1 || Object.keys(rules.data).length > 1)) throw new Error(INCORRECTDBCONFDBNAME); // Empty od name with non empty elements, views or rules
 return odname;
}

export function CorrectProfileIds(e, excludeoption, lastid)
{
 const nonclonedids = [];
 const clonedids = [];
 for (const option of Object.keys(e.data))
     {
      let [name, flag, ...style] = option.split(FIELDSDIVIDER);                       // Split option to its name and flag via FIELDSDIVIDER char '~'
      flag = `${FIELDSDIVIDER}${flag || ''}`;                                         // Convert flag to string with divider added
      style = style.length ? FIELDSDIVIDER + style.join(FIELDSDIVIDER) : '';          // Join back style string
      if (!flag.includes('*'))                                                        // Option is old (noncloned)?
         {
          const tempoption = e.data[option];                                          // Leave default options order (creation time) via property recreation
          delete e.data[option];
          e.data[option] = tempoption;
          if (excludeoption && excludeoption !== name)
             nonclonedids.push(+GetOptionNameId(option));                             // Add profile id to <nonclonedids> except <excludeoption> (template)
          continue;
         }
      if (lastid !== undefined) name += ` (id${++lastid})`;                           // Add ' (id<num>)' to option name
      if (lastid !== undefined) clonedids.push(lastid);                               // Add profile id to <clonedids>
      flag = flag.replaceAll('*', '').replaceAll('-', '').replaceAll('+', '') + '+-'; // Remove clonable/removable/cloned flags and add clonable/removable ones only
      e.data[name + flag + style] = e.data[option];                                   // and rename it in element selectable data
      delete e.data[option];
      if ('type' in e.data[name + flag + style])
         e.data[name + flag + style].type.expr = '/^/';                               // Make readonly element column type
     }
 return [nonclonedids, clonedids];
}

// Specified ms value to sleep by function
export const freeze = ms => new Promise(resolve => setTimeout(resolve, ms)); // await freeze(0);

// Function creates regexp to match tag names list 'tags'
export function HTMLTagsRegexp(tags)
{
 let regexp = '';
 if (Array.isArray(tags)) for (const tag of tags) regexp += `<${tag} .*?>|<${tag} *>|<\/${tag} *>|`;
 return new RegExp(regexp.substring(0, regexp.length - 1), 'g');
}

// Function replaces every char in array encodemap[0] to corresponded chars in encodemap[1] array
export function EncodeString(string, encodemap)
{
 if (typeof string !== 'string') return '';
 if (!Array.isArray(encodemap) || !Array.isArray(encodemap[0]) || !Array.isArray(encodemap[1])) return string;

 for (let i = 0; i < encodemap[0].length; i ++)
     string = string.replace(new RegExp(encodemap[0][i], 'g'), encodemap[1][i]);
 return string;
}

// Function encodes string based on <encodemap> array (see EncodeString function above) excluding html tags in <excludehtmltags> array
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

// There are four sql tables read/write process - OV display (read, only native tables via rouserodid)
// handler system calls (write, data/metr table only)
// element data macroses (read, native OD tables via rouserodid, foreign OD tables permission should be allowed in OD conf)
// rules (read/write only native tables via rwuserodid)
const DATABASEPAD = { settings: { type: 'select', head: 'Select object database settings', data: {
                      General: {
                                dbname: { type: 'text', data: '', flag: '+Enter new database name', head: `Database name~Enter database name full path in next format: folder1/../folderN/dbname. Folders are optional and created automatically in a sidebar db hierarchy. Leading slash is not necessary, last slash divided name is always treated as an object database name, others before - as a folders. Empty folders are ignored` }, 
                                description: { type: 'textarea', data: '', head: 'Database description', flag: '*' }, },
                      Permissions: {
                                od: { type: 'textarea', data: '', head: `Restrict this 'Object Database' configuraion read access for next user/group list~User/group list is a list of users (or groups) one by line (empty lines are ignored). Specified restriction (so all below) is applied for the user that matches the list. No match - no restriction applied. Prefix '!' inverts the value, so string '!support' matches all user names, except 'support'. For the list to match all users use '!' single char. Empty list matches no user. Note that user 'root' is a super user with no any restrictions applied regardless of any lists, so good practice is to use that super user account for recovery purposes only` },
                                Database: { type: 'textarea', data: '', head: `Restrict this dialog 'Database' section modify for next user/group list` },
                                Element: { type: 'textarea', data: '', head: `Restrict this dialog 'Element' section modify for next user/group list` },
                                View: { type: 'textarea', data: '', head: `Restrict this dialog 'View' section modify for next user/group list` },
                                Rule: { type: 'textarea', data: '', head: `Restrict this dialog 'Rule' section modify for next user/group list`},
                                Macros: { type: 'textarea', data: '', head: `Permit this 'Object Database' data read access for next OD id list`, flag: '*' }, },
                      Macroses: {
                                 80: { type: 'select', flag: '+Enter new macros name', head: `Macros list~Database macros list is an optional list of some text data associated with the specified macros names that can be replaced in some database or user properties text configuration settings via js style quoted expression \${<macros name>}. Macroses may be nested, so one macros may contain another. Macros loops, when one macros contains another that contains first one, are ignored, so loop case calculation value is set to empty string - when one macros contains another that contains first, this another macros receives an empty string as a first macros value`, data: { 'New macros~+-': {
                                            10: { type: 'textarea', head: 'Macros value', data: '' },
                                            20: { type: 'textarea', head: 'Macros description~Enter some text here to describe macros uasge', flag: '*', data: '' }, }, } }
    
                    },},},};
    
const ELEMENTPAD = {
                    elements: { type: 'select', head: 'Element profile~Set this template element properties and clone it to create new element in object database', data: { 'New element template~+': {
                    name: { type: 'textarea', head: 'Name~Element name, used as a default element title in object view display', data: '', flag: '+Enter element name' },
                    description: { type: 'textarea', head: 'Description~Element description is displayed as a hint on object view element header navigation for default. Describe here element usage and its possible values', data: '', flag: '*+Enter element description' },
                    type: { type: 'text', head: 'Element column type~', data: 'JSON' },
                    index: { type: 'radio', head: `Element column index~Unique element type defines specified element property 'value' as uniq among all object elements in database, so duplicated values are excluded and cause an error. This behaviour cannot be changed after element creation`, data: 'None~!/btree/UNIQUE btree/hash', flag: '*' },
                    event: { type: 'textarea', head: `Event profile list~Specify event profiles one by line to process client side user events. Each client side incoming event is checked on every event profile one by one until the match. When a match is found the appropriaate handler scheme is applied to process event. See system settings help section`, data: '', flag: '*' },
                   },},},};

const VIEWPAD = {
                 views: { type: 'select', head: 'View profile~Set view properties and clone this template to create new view', data: { 'New view template~+': {
                 settings:  { type: 'select', head: 'Select view settings', flag: '*', data: {
                 General: {
                           name: { type: 'textarea', data: '', flag: '+Enter view name', head: `Name~Enter here view name list (one by line). All names will be sidebar displayed according their paths. Usually second and other ones are used as alias names to be placed in favorites. No view names specified - the view is sidebar hidden, but still can be called to open from event handlers or shortcut keys` },
                           description: { type: 'textarea', head: `Description~Describe here view purpose and its usage`, data: '' },
                           shortcut: { type: 'select', head: `Shortcut key~Select key combination to open the view in a new window. For sidebar focus only`, data: 'None/ALT+SHIFT+KeyA/ALT+SHIFT+KeyB/ALT+SHIFT+KeyC/ALT+SHIFT+KeyD/ALT+SHIFT+KeyE/ALT+SHIFT+KeyF/ALT+SHIFT+KeyG/ALT+SHIFT+KeyH/ALT+SHIFT+KeyI/ALT+SHIFT+KeyJ/ALT+SHIFT+KeyK/ALT+SHIFT+KeyL/ALT+SHIFT+KeyM/ALT+SHIFT+KeyN/ALT+SHIFT+KeyO/ALT+SHIFT+KeyP/ALT+SHIFT+KeyQ/ALT+SHIFT+KeyR/ALT+SHIFT+KeyS/ALT+SHIFT+KeyT/ALT+SHIFT+KeyU/ALT+SHIFT+KeyV/ALT+SHIFT+KeyW/ALT+SHIFT+KeyX/ALT+SHIFT+KeyY/ALT+SHIFT+KeyZ' },
                           refresh: { type: 'text', head: 'Auto refresh interval', data: '', flag: '*' }, }, 
                 Selection: {
                           template: { type: 'radio', head: `Template~Select object view template for the form the OV data is displayed. 'Table' template displays objects with its elements in a form of a table. Template 'Tree' displays the tree of objects acting as a nodes connected with each other via 'link' element property (for JSON type elements only). And 'Map' template places objects on geographic map based on their elements with 'geo' property (for JSON type elements only)`, data: 'Table~!/Tree/Map', flag: '*' },
                           layout: { type: 'textarea', head: `Layout~As template defines the form objects are displayed, layout defines what elements should be displayed and how for the selected template above. Element layout is a JSON list and should contain at least one valid JSON to display any data at all, see appropriate help section for details`, data: '' },
                           query: { type: 'textarea', head: 'Query~Columns/expressions to select from OD (see FROM statement below). Built automatically from element layout. See appropriate help section for details', data: '', flag: '+SELECT id,eid1,edi2 FROM <data_N> WHERE lastversion = 1' },
                           linkname: { type: 'text', head: 'Link~Object selection link name', data: '' }, }, 
                 Macroses: {
                           autoset: { type: 'checkbox', data: 'Call dialog/Auto structure~!', head: `Macros definition dialog~Macroses in this OV 'Selection' layout/query and OD 'Rule' message/query fields may be (re)defined by the user via dialog that is called at client side, allowing the user to define macros values manually before OV open. Checked 'Call dialog' option calls client side dialog, unchecked - doesn't. Checked 'Auto structure' option automatically creates dialog structure to call. Dialog structure property name is a macros name, input field content - macros value (for 'textarea', 'text' and 'password' interface element types only). Dialog structure defined macroses are applied regardless of 'Call dialog' option. Dialog structure may contain input fields only, 'OK'/'CANCEL' dialog buttons are added automatically if absent. Client side dialog call may be used not for macros definitions, but for info/warning message display before OV open. Macros 'SOMEMACROS' definition dialog example: { "SOMEMACROS": { "type": "text", "head": "Input macros SOMEMACROS value", "data": "" } }` },
                           dialog: { type: 'textarea', head: '', data: '', flag: '*', expr: '/Auto structure~!/autoset' }, }, 
                 Appearance: {
                           a: { type: 'radio', head: 'Window init~OV opens in a current window, new window or in a browser new tab (read-only mode)', data: 'Current window~!/New window/Browser new tab' },
                           b: { type: 'radio', data: 'Sidebar fit/Cascade~!/Random', head: 'Initial window position~Select view window position at the opening' },
                           c: { type: 'radio', head: 'Initial window size', data: 'Auto~!/Full screen/Fixed', flag: '' },
                           d: { type: 'text', head: 'Width and height in pixels via comma', data: '', expr: '/Auto~!|Full screen~!/c', flag: '*' },
                           e: { type: 'checkbox', head: 'Control', data: 'Resize~!/Full screen~!/Escape/Close icon\n~!/Always on top/Modal', flag: '*' },
                           f: { type: 'checkbox', head: 'Bring to top on event', data: 'New data/Data delete/Data change' },
                           g: { type: 'checkbox', head: `Auto open in a new window on event`, data: 'New data/Data delete/Data change', flag: '*' },
                           h: { type: 'text', head: 'Lifetime~OV window lifetime (in seconds) after which the window will be closed automatically. Zero/empty/error value - no action', data: '', flag: '' }, }, 
                 Permissions: {
                           10: { type: 'textarea', head: `Restrict read access for next users/groups`, data: '' },
                           20: { type: 'textarea', head: `Restrict write access for next users/groups`, data: '', flag: '*' },
                }, } } }, }, }, };

const RULEPAD = {
                 rules: { type: 'select', head: 'Rule profile~Set rule properties and clone this template to create new rule. Rules are tested in alphabetical order one by one until the rule query is successful, the rule action is applied then', data: { 'New rule template~+': {
                           10: { type: 'textarea', head: `Rule message~Non empty rule message is displayed as a warning at client side dialog box and logged if appropriate option below is set`, data: '', flag: '*' }, 
                           20: { type: 'radio', data: 'Accept/Reject~!/Pass', head: `Rule action~'Accept' action permits incoming event passing it to the controller, 'Reject' action cancels it, 'Pass' action does nothing with no search terminating and continuing from the next rule - useful for event logging and rule disabling without removing` }, 
                           30: { type: 'textarea', data: '', head: `Rule query~Every controller incoming event (such as user mouse/keyboard, system SCHEDULE/CHANGE or others) is passed through the controller to be tested on all rules in alphabetical order one by one until the rule query is successful. Rule query is a list of one by line truncated SQL query strings with no SELECT statement that is added automatically to the begining of the string. Empty or char '#' commented lines are ignored. Emtpy query - test is successful. Error queries are ignored. Non-empty and non-zero result of all query strings - test is successful; any empty, error or zero char '0' result - unsuccessful. The action corresponding to 'successful' rule is performed, no any successful rules - default action 'Accept' is made. Query may contain some macroses (${'${'}OID}, ${'${'}EID}, ${'${'}OD}, ${'${'}OV}, ${'${'}EVENT}, ${'${'}MODIFIER}, etc..) to apply for specified events/objects/elements/views only. Be aware of using queries with no events specified, it may cause some overload due to every incoming event query test made` }, 
                           40: { type: 'checkbox', data: 'Log rule message/Client side warning', flag: '*' },
                }, }, } };

export const NEWOBJECTDATABASE = {
                           padbar: { type: 'select', data: { Database: DATABASEPAD, Element: ELEMENTPAD, View: VIEWPAD, Rule: RULEPAD }  },
                           title: { type: 'title', data: 'New Database Configuration' },
                           ok: { type: 'button', data: 'CREATE DATABASE', flag: 'a', expr: '/^$/dbname' },
                           cancel: { style: 'background: rgb(227,125,87);', type: 'button', data: 'CANCEL', flag: '++++++++++' },
                          };

const DIALOGBOXMACROSSTYLE	= { SIDE_MARGIN: '10px', ELEMENT_MARGIN: '10px', HEADER_MARGIN: '5px', TITLE_PADDING: '5px', BUTTON_PADDING: '10px', FONT: 'Lato, Helvetica' };
export const CUSTOMIZATIONS =
{
        "Sidebar": {
                    ".sidebar": { "border": "none;", "background-color": "rgb(12,68,118);", "border-radius": "5px;", "color": "#9FBDDF;", "width": "13%;", "height": "90%;", "left": "4%;", "top": "5%;", "box-shadow": "4px 4px 5px #222;", "padding": "16px 0 0 0;" },
                    ".changescount": { "vertical-align": "super;", "padding": "2px 3px 2px 3px;", "color": "rgb(232,187,174);", "font": "0.5em Lato, Helvetica;", "background-color": "rgb(125,77,94);", "border-radius": "35%"},
                    ".sidebar tr:hover": { "background-color": "#25589F;", "cursor": "pointer;", "margin": "100px 100px;" },
                    ".sidebar_folder": { "color": "", "font": "1.8em Lato, Helvetica;", "padding": "8px 0;", "margin": "" },
                    ".sidebar_database": { "color": "", "font": "1.6em Lato, Helvetica;", "padding": "8px 0;", "margin": "" },
                    ".sidebar_view": { "color": "", "font": "1.1em Lato, Helvetica;", "padding": "4px 0;", "margin": "" },
                    ".searchbar": { "margin": "4px 17px 1px 17px;", "border-radius": "5px;", "background-color": "rgb(32,88,138);", },
                    ".searchinput": { "color": "", "font": "0.9em Lato, Helvetica;", "paddin": "0;", "margin": "4px;", "outline": "none;", "border": "none;", "background-color": "inherit;", "color": "inherit;", "width": "90%;" },
                   },
   "Context menu": {
		            ".contextmenu": { "position": "fixed;", "overflow": "hidden;", "background-color": "#F3F3F3;", "border": "solid 1px #dfdfdf;", "padding": "10px 0;", "border-radius": "5px;", "min-width": "200px;", "white-space": "nowrap;" },
		            ".contextmenuitem": { "background-color": "transparent;", "color": "#1166aa;", "margin-bottom": "0px;", "font-family": "sans-serif;", "font-size": "16px;", "font-weight": "300;", "line-height": "1.5;", "padding": "5px 15px;" },
		            ".greycontextmenuitem": { "background-color": "transparent;", "color": "#CCC;", "margin-bottom": "0px;", "font-family": "sans-serif;", "font-size": "16px;", "font-weight": "300;", "line-height": "1.5;", "padding": "5px 15px;" },
		            ".contextmenuitem:hover": { "color": "#1166aa;", "background-color": "#e7e7e7;", "cursor": "pointer;" },
		            ".contextmenuitemdivider": { "background-color": "transparent;", "margin": "5px 10px 5px 10px;", "height": "0px;", "border-bottom": "1px solid #CCC;", "border-top-color": "transparent;", "border-left-color": "transparent;" , "border-right-color": "transparent;" },
                   },
     "Dialog box": {
	                // dialog box global css props
	                ".dialogbox": { "background-color": "rgb(233,233,233);", "color": "#1166aa;", "border-radius": "5px;", "border": "solid 1px #dfdfdf;" },
	                // dialog box title
	                ".title": { "background-color": "rgb(209,209,209);", "color": "#555;", "border": "#000000;", "border-radius": "5px 5px 0 0;", "font": `bold .9em ${DIALOGBOXMACROSSTYLE.FONT};`, "padding": "5px;" },
	                // dialog box pad
	                ".pad": { "background-color": "rgb(223,223,223);", "border-left": "none;", "border-right": "none;", "border-top": "none;", "border-bottom": "none;", "padding": "5px;", "margin": "0;", "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "#57C;", "border-radius": "5px 5px 0 0;" },
	                // dialog box active pad
	                ".activepad": { "background-color": "rgb(209,209,209);", "border-left": "none;", "border-right": "none;", "border-top": "none;", "border-bottom": "none;", "padding": "5px;", "margin": "0;", "font": `bold .9em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "#57C;", "border-radius": "5px 5px 0 0;" },
                	// dialog box pad bar
	                ".padbar": { "background-color": "transparent;", "border": "none;", "padding": "4px 4px 0 4px;", "margin": "10px 0 20px 0;" },
	                // dialog box divider
	                ".divider": { "background-color": "transparent;", "margin": "0px 10px 10px 10px;", "height": "0px;", "border-bottom": "1px solid #CCC;", "border-top-color": "transparent;", "border-left-color": "transparent;" , "border-right-color": "transparent;" },
	                // dialog box button
	                ".button": { "background-color": "#13BB72;", "border": "none;", "padding": `${DIALOGBOXMACROSSTYLE.BUTTON_PADDING};`, "margin": "10px 10px 13px 10px;", "border-radius": "5px;", "font": `bold 12px ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "white;" },
	                // dialog box button and pad hover
	                ".button:hover, .pad:hover, .itemadd:hover, .itemremove:hover": { "cursor": "pointer;", "border": "" },
	                // dialog box element headers
                    ".element-headers": { "margin": `${DIALOGBOXMACROSSTYLE.HEADER_MARGIN};`, "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "#555;", "text-shadow": "none;", "user-select": "text;" },
	                // dialog box help icon
	                ".hint-icon": { "padding": "1px;", "font": `1em Arial Narrow, ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "#555;", "background-color": "#FF0;", "border-radius": "40%;" },
	                // dialog box help icon hover
	                ".hint-icon:hover": { "padding": "1px;", "font": `bold 1em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "black;", "background-color": "#E8E800;", "cursor": "help;", "border-radius": "40%;" },
	                // dialog box table
	                ".boxtable": { "font": `.8em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "black;", "background-color": "transparent;", "margin": "10px;", "table-layout": "fixed;", "width": "auto;", "box-sizing": "border-box;" },
	                // dialog box table cell
                	".boxtablecell": { "padding": "7px;", "border": "1px solid #999;", "text-align": "center" },
	                // dialog box readonly elements css filter
	                ".readonlyfilter": { "filter": "opacity(50%);", " filter": "Dialog box readonly elements css filter property to apply to, see appropriate css documentaion.", "cursor": "not-allowed !important;" },
	                //------------------------------------------------------------
	                // dialog box select
	                ".select": { "background-color": "rgb(243,243,243);", "color": "#57C;", "font": `.8em ${DIALOGBOXMACROSSTYLE.FONT};`, "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "outline": "none;", "border": "1px solid #777;", "padding": "0px 0px 0px 0px;", "overflow": "auto;", "max-height": "150px;", "min-width": "24em;", "width": "auto;", "display": "inline-block;" },
	                // dialog box select option
	                ".select > div": { "padding": "2px 20px 2px 5px;", "margin": "0px;" },
	                // dialog box select option hover
	                ".select:not([class*=arrow]) > div:hover": { "background-color": "rgb(211, 222, 192);", "color": "" },
	                // dialog box select option selected
	                ".selected": { "background-color": "rgb(211, 222, 192);", "color": "#fff;" },
	                // Profile selection additional style
	                ".profileselectionstyle": { "font": `bold .8em ${DIALOGBOXMACROSSTYLE.FONT};`, "border-radius": "4px;" },
	                //------------------------------------------------------------
	                // dialog box radio
	                "input[type=radio]": { "background-color": "transparent;", "border": "1px solid #777;", "font": ".8em/1 sans-serif;", "margin": `3px 5px 6px ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN};`, "border-radius": "20%;", "width": "1.2em;", "height": "1.2em;" },
	                // dialog box radio checked
	                "input[type=radio]:checked::after": { "content": "", "color": "white;" },
	                // dialog box radio checked background
                	"input[type=radio]:checked": { "background-color": "#00a0df;", "border": "1px solid #00a0df;" },
	                // dialog box radio label
	                "input[type=radio] + label": { "color": "#57C;", "font": ".8em Lato, Helvetica;", "margin": "0px 10px 0px 0px;" },
	                //------------------------------------------------------------
	                // dialog box checkbox
	                "input[type=checkbox]": { "background-color": "#f3f3f3;", "border": "1px solid #777;", "font": ".8em/1 sans-serif;", "margin": `3px 5px 6px ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN};`, "border-radius": "50%;", "width": "1.2em;", "height": "1.2em;" },
                	// dialog box checkbox checked
	                "input[type=checkbox]:checked::after": { "content": "", "color": "white;" },
	                // dialog box checkbox checked background
	                "input[type=checkbox]:checked": { "background-color": "#00a0df;", "border": "1px solid #00a0df;" },
	                // dialog box checkbox label
	                "input[type=checkbox] + label": { "color": "#57C;", "font": `.8em ${DIALOGBOXMACROSSTYLE.FONT};`, "margin": "0px 10px 0px 0px;" },
	                //------------------------------------------------------------
                    // dialog box input text
	                "input[type=text]": { "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "none;", "color": "#57C;", "border-radius": "3px;", "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "width": "90%;", "min-width": "300px;" },
	                // dialog box input password
	                "input[type=password]": { "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "none", "color": "#57C;", "border-radius": "3px;", "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "width": "90%;", "min-width": "300px;" },
	                // dialog box input textarea
	                "textarea": { "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "", "color": "#57C;", "border-radius": "3px;", "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "width": "90%;", "min-width": "300px;" },
                   },
 "Dropdown list": {
			        // Expanded selection
				    ".expanded": { "display": "block;", "margin": "0 !important;", "padding": "0 !important;", "position": "absolute;", "overflow-y": "auto !important;", "overflow-x": "hidden !important;", "max-height": "500px !important;" },
 				   },
    "Application": {
				    ".modalfilter": { "filter": "opacity(50%);", " filter": "Dialog box modal effect appearance via css filter property (such as opacity, blur and others), see appropriate css documentaion." },
				    "::-webkit-scrollbar": { "width": "8px;", "height": "8px;", "cursor": "pointer !important;" },
                    "*": { "scrollbar-width": "thin;", " scrollbar-width": "Set scrollbar thickness, available options are 'auto;', 'thin;' and 'none;'. For FireFox browser only! See appropriate css documentation", "scrollbar-color": "rgba(55, 119, 204, 0.3) rgba(255, 255, 255, 0);", " scrollbar-color": "Set space divided scrollbar thumb and track colors. For FireFox browser only! See appropriate css documentation" },
 				    " Appearance animation": { "Dialog box": "slideleft", " Dialog box": `Select interface elements (dialog box, context menu and others below) appearance animation such as ${ANIMATIONS.join(', ')}. Any other values - no animation is applied`, "Drop down list": "rise", "Context menu": "rise", "New connection": "", "New view": "" },
                    " Force to use other user customization settings": { "Username": "" }, 
				    //" Key combination to apply cell text": {},
				    //" Logon events": { "Log unsuccessful logons": "", },
				   },
     "Connection": {
			        ".connection": { "background-color": "#343e54;" },
 			       },
           "View": {
                    ".ovbox":                      { "position": "absolute;", "overflow": "none;", "min-width": "10%;", "min-height": "3%;", "border-radius": "4px;", "width": "30%;", "height": "30%;", "background-color": "RGB(230,230,230);", "box-sizing": "border-box;", "padding": "25px 0px 0px 0px;" },
                    ".ovboxmessage":               { "display": "flex;", "overflow": "auto;", "justify-content": "center;", "align-items": "center;", "width": "100%;", "height": "100%;", "padding": "0 10px 0 10px;", "box-sizing": "border-box;", "t ext-align": "justify;" },
		                ".scrollingcontainer":         { "width": "100%;", "height": "100%;", "box-sizing": "border-box;", "overflow": "auto;", "border": "none;", "outline": "none;" },
		                ".gridcontainer":              { "display": "grid;", "box-sizing": "border-box;", "overflow": "none;", "margin": "0;", "padding": "0;", "width": "fit-content;", "height": "fit-content;", "border-left": "1px solid #999;", "border-top": "1px solid #999;" },
		                ".undefinedcell":              { "padding": "10px;", "background-color": "",                                                                              "border": "1px solid #999;" },
		                ".titlecell":                  { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#CCC;", "font": "",                 "border": "1px solid #999;" },
		                ".newobjectcell":              { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#EFE;", "font": "",                 "border": "1px solid #999;" },
		                ".interactivecell":            { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "",      "font": "12px/14px arial;", "border": "1px solid #999;" },
		                ".noninteractivecell":         { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#EEE;", "font": "12px/14px arial;", "border": "1px solid #999;" },
		                ".virtualcell":                { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#EEE;", "font": "12px/14px arial;", "border": "1px solid #999;" },
                    ".noninteractivecursorcell":   { "outline": "red solid 1px;", "outline-offset": "-2px;", "box-shadow": "", "border": "" }, 
                    ".interactivecursorcell":      { "outline": "green solid 1px;", "outline-offset": "-2px;", "box-shadow": "", "border": "" }, 
                    ".celleditmode":               { "box-shadow": "rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset; !important;", "outline": "#1b74e9 solid 1px;", "outline-offset": "-2px;" },
                    ".clipboardcell":              { "filter": "blur(1px);" }, 
		                ".selectedcell":               { "background-color": "rgb(189,200,203) !important;" },
                    ".defaultcell":                { "margin-top": "-1px;", "margin-left": "-1px;", "box-sizing": "border-box;", "min-width": `${CELLMINWIDTH}px;`, "min-height": `${CELLMINHEIGHT}px;` },
		                [`.gridcontainer div:not([contenteditable=${EDITABLE}])`]:   { "cursor": "cell;" },
                   }
};

export const CUSTOMIZATIONDIALOG = { section: { type: 'select', head: 'Select customization section', data: {} },
                                     title: { type: 'title', data: 'Customization' },
                                     ok: JSON.parse(BUTTONOK),
                                     cancel: JSON.parse(BUTTONCANCEL),
                                   }
for (const customization in CUSTOMIZATIONS)
    {
     const section = { type: 'select', head: 'Select interface element to customize', data: {} };
     let customizationindex = 0;
     CUSTOMIZATIONDIALOG.section.data[customization] = { [customizationindex++]: section }; // Customization name is a profile name
     for (let profilename in CUSTOMIZATIONS[customization])
         {
          section.data[profilename.trim()] = {}; // Customization object property name is a nested profile name too
          let propindex = 0;
          const cssetting = CUSTOMIZATIONS[customization][profilename];
          for (const propname in CUSTOMIZATIONS[customization][profilename])
              if (propname[0] !== ' ') section.data[profilename.trim()][propindex++] = { type: 'text', head: `${propname}${cssetting[' ' + propname] ? '~' + cssetting[' ' + propname] : ''}`, data: cssetting[propname] };
         }
    }

export const OPTIONSDIVIDER              = '/';
export const KEYBOARDEVENTS              = ['KEYA', 'KEYB', 'KEYC', 'KEYD', 'KEYE', 'KEYF', 'KEYG', 'KEYH', 'KEYI', 'KEYJ', 'KEYK', 'KEYL', 'KEYM', 'KEYN', 'KEYO', 'KEYP', 'KEYQ', 'KEYR', 'KEYS', 'KEYT', 'KEYU', 'KEYV', 'KEYW', 'KEYX', 'KEYY', 'KEYZ', 'KEY0',   'KEY1',   'KEY2',   'KEY3',   'KEY4',   'KEY5',   'KEY6',   'KEY7',   'KEY8',   'KEY9',   'KEYF1', 'KEYF2', 'KEYF3', 'KEYF4', 'KEYF5', 'KEYF6', 'KEYF7', 'KEYF8', 'KEYF9', 'KEYF10', 'KEYF11', 'KEYF12', 'KEYSpace', 'KEYDelete', 'KEYBracketLeft', 'KEYBracketRight', 'KEYPRESS'];
export const NATIVEKEYBOARDEVENTS        = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'F1',    'F2',    'F3',    'F4',    'F5',    'F6',    'F7',    'F8',    'F9',    'F10',    'F11',    'F12',    'Space',    'Delete',    'BracketLeft',    'BracketRight'];
export const CLIENTEVENTS                = ['ADDOBJECT', 'DELETEOBJECT', 'ONOBJECTCHANGE', 'ONMACROSCHANGE', 'CONFIRMEDIT', 'CONFIRMDIALOG', 'PASTE', 'SCHEDULE', 'DOUBLECLICK', ...KEYBOARDEVENTS];

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
                                    
const branchclasses = {
                       '.view': SVGUrlHeader(24, 24) + SVGRect(2, 2, 18, 18, 3, 105, 'RGB(15,105,153)', 'none', '4') + SVGUrlFooter() + ';', 
                       '.folderwrapped': SVGUrlHeader(24, 24) + SVGRect(6, 6, 15, 15, 3, '0 15 65', 'RGB(76,95,72)', 'none', '1') + SVGRect(3, 3, 14, 14, 3, 105, 'RGB(97,120,82)', 'RGB(97,120,82)', '1') + SVGUrlFooter() + ';',
                       '.folderunwrapped': SVGUrlHeader(24, 24) + SVGRect(6, 6, 15, 15, 3, '0 15 65', 'RGB(76,95,72)', 'none', '1') + SVGRect(2, 2, 15, 15, 3, 105, 'RGB(97,120,82)', 'none', '1') + SVGUrlFooter() + ';',
                       '.databaseunwrapped': `${SVGUrlHeader(24, 24)}${SVGPath('M6 12L18 12', 'rgb(97,120,82)', '4')}${SVGUrlFooter()};`,
                       '.databasewrapped': SVGUrlHeader(24, 24) + SVGPath('M6 12L18 12M12 6L12 18', 'rgb(97,120,82)', 4) + SVGUrlFooter() + ';',
                       '.databasewrappedempty': SVGUrlHeader(24, 24) +  SVGPath('M6 12L18 12M12 6L12 18', 'rgb(125,77,94)', 4) + SVGUrlFooter() + ';',
                      };

for (const classname in branchclasses)
    {
     CUSTOMIZATIONS["Sidebar"][classname] = {};
     CUSTOMIZATIONS["Sidebar"][classname]['background-image'] = branchclasses[classname];
     CUSTOMIZATIONS["Sidebar"][classname]['background-repeat'] = 'no-repeat !important;';
     CUSTOMIZATIONS["Sidebar"][classname]['background-position'] = 'center;';
     CUSTOMIZATIONS["Sidebar"][classname]['background-color'] = 'transparent;';
     CUSTOMIZATIONS["Sidebar"][classname]['padding'] = '0px 10px;';
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

export function MacrosReplace(string, replacements, chain)
{
 let newstring = '';

 while (true)
       {
        const pos1 = string.indexOf('${'); // Search start of macros
        const pos2 = string.indexOf('}'); // and the finish
        if (pos1 === -1 || pos2 === -1 || pos1 > pos2) return newstring + string; // No found? return previous result plus current
        const macrosname = string.substring(pos1 + 2, pos2); // Retrieve macros name
         // and substitue ${macrosname} to macros value via recursive function call, setting loop/undefined cases to empty string:
        const macrosvalue = macrosname in replacements && (chain === undefined || !(macrosname in chain)) ? MacrosReplace(replacements[macrosname], replacements, Object.assign(chain || {}, { [macrosname]: true })) : '';
        newstring += string.substring(0, pos1) + macrosvalue; // Collect newstring with macros value
        string = string.substring(pos2 + 1); // and redefine remaining part to pass it for next cycle
       }
}

export function GenerateRandomString(length)
{
 let randomstring = '';
 for (let i = 0; i < length; i++) randomstring += RANDOMSTRINGCHARS[Math.floor(Math.random() * RANDOMSTRINGCHARS.length)];
 return randomstring;
}

// Dialog data has next structure: root-profile -> element1, element2 -> profile1 -> element1 -> profile1, profile2.., so path represents a slash divided string to point needed element or profile:
// element2/profile1/element1/profile2.. with <dialog> as a root-profile
// Function search specified element or profile for specified splited path.
// Undefined <value> just return a found element for a specified <path>, string type <value> set found element data to <value>, other <value> types - data prop of a found element is returned
export function GetDialogElement(dialog, path, value)
{
 if (!dialog || typeof dialog !== 'object') return;
 path = path.split('/')
 for (let i in path) // Go through all elements of splited path 
     {
      dialog = +i%2 ? GetOptionInSelectElement(dialog, path[i]) : dialog[path[i]]; // Go to next element or profile (element group)
      if (!dialog) return;
     }

 switch (typeof value) // Undefined <value> just return a found element (current <dialog> var) for a specified <path>, string type <value> set found element data to <value>, other <value> types - data prop of a found element is returned (for selectable elements with at least one checked option first checked option name is returned instead of whole data prop)
        {
          case 'undefined':
               return dialog;
          case 'string':
               dialog.data = value;
               break;
          default:
               if (['select', 'multiple', 'checkbox', 'radio'].includes(dialog.type) && typeof dialog.data === 'string')
               for (const option of dialog.data.split('/'))
                   {
                    const [name, flag] = option.split(FIELDSDIVIDER, 2);
                    if (flag && flag.includes('!')) return name;
                  }
               return dialog.data;
        }
}

export function GetOptionInSelectElement(e, option)
{
 if (!e?.data || e.type !== 'select' || typeof e.data !== 'object') return;
 for (const name in e.data) if (CompareOptionInSelectElement(option, name)) return e.data[name];
}

export function GetOptionNameInSelectElement(e, option)
{
 if (!e?.data || e.type !== 'select' || typeof e.data !== 'object') return;
 for (const name in e.data) if (CompareOptionInSelectElement(option, name)) return name;
}

export function CompareOptionInSelectElement(string, option)
{
 [string] = string.split('~', 1);
 [option] = option.split('~', 1);
 return string === option;
}

export const HELPDIALOG = { pad: { type: 'select', data: {
"System description": { sys: { type: 'text', head:
`Tabels application is a new generation system to display, store and manage its data by lots of ways. Application data
is a set of custom data tables, each table consists of identical objects, which, in turn, are set of service and user
defined elements.

Data tables of itself is called Object Database (OD) and its structure can be changed or created by appropriate sidebar
context menu. OD contains Object Views (OV). Views define what objects (via 'object selection') and elements
(via 'element layout') should be displayed and how. See appropriate help sections.

As it was mentioned above - each object is a set of service and user defined elements. Five built-in service elements
(id, owner, datetime, version, lastversion) represent service data, which is set automatically while object is changed
or created. Each custom user defined element is numbered (with eid1, eid2.. as a column names in database structure)
and may have some handlers (any script or binary) to create/manage element data, see 'Handler' help section. User-defined
element data is a JSON, that may consist of any defined properties. Some of them are reserved for the special assingment:
- 'value' is displayed in a table cell as a main element text (max 10K chars)
- 'hint' is displayed as element hint text on mouse cursor cell navigation
- 'style' is a css style attribute value applied to html table <td> tag (table cell) the element is placed in.
- 'link' is element connection list one by line, each connection is a link name, remote object selection and its element
  selection, all three divided by '|'.
- 'alert' property is reserved by the controller to send alert messages to the client side
- 'cmd' property is reserved by the controller to identify handler command
Other element properties are custom and used to store additional element data, see example below.

Lets have a look to the simple OD example with only two elements - Name and Phone number.
OD name will be 'Clients', OV name - 'Address book', OV template - 'table', OV object selection - empty (selects all objects for
default), OV element layout - empty (displays all elements as a standart table for default). See OD configuration help section.
Additionally, first object element (Name) stores user password in a 'pass' JSON property.

OV default element layout will look like:
+------+--------------+
| Name | Phone number |
+------+--------------+
| Mary | +1 555 11111 |
+------+--------------+
| John | +1 555 22222 |
+------+--------------+

Internal object database structure will be:
+----+-------+---------------------+---------+-------------+----------------------------------------+---------------------------+
| id | owner | datetime            | version | lastversion | eid1                                   | eid2                      |
+----+-------+---------------------+---------+-------------+----------------------------------------+---------------------------+
| 3  | root  | 1970-07-26 17:48:01 | 1       | 1           | '{"value": "Mary", "pass": "$6$WF.."}' | '{"value": "+1 555 111"}' |
+----+-------+---------------------+---------+-------------+----------------------------------------+---------------------------+
| 4  | root  | 1970-07-26 17:49:33 | 1       | 1           | '{"value": "John", "pass": "$6$GH.."}' | '{"value": "+1 555 222"}' |
+----+-------+---------------------+---------+-------------+----------------------------------------+---------------------------+

After the 1st object (Mary) phone number change and the 2nd (John) delete - the structure will be:
+----+-------+---------------------+---------+-------------+----------------------------------------+---------------------------+
| id | owner | datetime            | version | lastversion | eid1                                   | eid2                      |
+----+-------+---------------------+---------+-------------+----------------------------------------+---------------------------+
| 3  | root  | 1970-07-26 17:48:01 | 1       | 0           | '{"value": "Mary", "pass": "$6$WF.."}' | '{"value": "+1 555 111"}' |
+----+-------+---------------------+---------+-------------+----------------------------------------+---------------------------+
| 3  | root  | 1970-07-26 17:49:42 | 2       | 1           | '{"value": "Mary", "pass": "$6$WF.."}' | '{"value": "+1 555 333"}' |
+----+-------+---------------------+---------+-------------+----------------------------------------+---------------------------+
| 4  | root  | 1970-07-26 17:48:33 | 1       | 0           | '{"value": "John", "pass": "$6$GH.."}' | '{"value": "+1 555 222"}' |
+----+-------+---------------------+---------+-------------+----------------------------------------+---------------------------+
| 4  | root  | 1970-07-26 17:49:54 | 0       | 1           | ''                                     | ''                        |
+----+-------+---------------------+---------+-------------+----------------------------------------+---------------------------+

Client Mary record after phone number change by user 'root' has version 2 value and lastversion flag set, while object previous
version 1 has unset lastversion flag. Note that previous object version values for non-changed user-defined elements are set to
NULL, so Mary phone number next change creates object version 3 with previous object version 2 element 'eid1' set to NULL.
In other words - just to save some disk space object versions history consists of modified elements only.
As object versions are object data instnces - deleted objects are not removed actually, but marked by zero version only.
All previous versions object data is available in that case, but cannot be changed at all. Considering all of this, all object
history is transparent and available and all data is native. This is a global application conception - all functionality is
documented and clear. The system offers array of benefits and solutions and acts as a kind of platform the users can develop
their projects with custom data behaviour and layout.

Go on. Application authentication is password based. Usernames and their passwords are stored in 'Users' OD. This is initial
database to manage all users properties from passwords and groups to user specific intreface customization.
Initial username/password: root/root. Only one user instance can be logged in, so logged in instance automatically logs out
another client instance from other host or browser. Session lifetime is 10 hours (36000 sec).
To add new user - open built-in database 'Users' view 'All users' and click context menu 'Add Object' - user record will be added.
Double click just-added 'user' element to call user properties (such as password, OD add permission, group membership..) dialog
box. User 'name' cannot be changed after creation and user password must be min 8 chars length and contain at least one digit,
capital and lowercase latin letter. Also user cannot change his properties (except the password)  to avoid all priveleges
granting by himself to himself. Note that users and groups must be all uniq, so users and groups with the same names are not
recomended. Groups cannot be directly created, so any group name in a user properties group membership list is considered as an
existing group and all permission lists user/group records in a Database configuration (see appropriate help section) are treated
as an user names, in case of non-existent username - the name is treated as a name of a group.`
}},

"Database Configuration": { dat: { type: 'text', head:
`To create Object Database (OD) just enter its name (max 64 chars) in the dialog box called via 'New Database' sidebar context
menu. Other database configuration can be continued here or later via 'Database Configuration' sidebar context menu call.
Let's have a look at database configuration dialog box and its features.

First is 'Database' tab. This configuration section sets up database name, description and permissions. Database name can be
changed after creation or removed (via empty name and description). Database permissions represent itself five user/group
(one by line) list input text areas, first list for the object database visibility restriction, other four lists are for each
configuraion section (tab). Lists can be of two types - 'allowed' type allowes changes for specified users and groups in the
list and disallowed for others, thereby 'disallowed' type disallows changes for specified users and groups and allows for others.
Be aware of empty 'allowed' lists - the setting restricts all users, e.g. 'Database' section tab empty 'allowed' list blocks any
changes (such as name, description, permissions) for any user forever.

Second configuration section is 'Element'. Each object consists of builtin service elements and custom user defined elements.
To add any custom element select 'New element' profile and fill at least one field - name, description or any event handler
command line. So all of them in an element profile should be set empty in order to remove element. Element name is used  as a
default element header text and specified description text is displayed as a hint on object view element header navigation.
See 'Element layout' help section for details. Other element options are element type and event handlers. Unique element
type sets element JSON property 'value' uniqueness among all objects in OD - for a example, first element (username) of builtin
OD 'Users' defined as an uniq type, so duplicated names are excluded.
Next - event handlers. Handler is a command line script or binary called on specified event occur. Handlers are optional
and defined for necessary events only. Events are occured on object processes ('INIT' event at object creation, 'CHANGE'
at object element data change), keyboard/mouse element push/click ('DOUBLECLICK', 'KEYPRESS'..), event feedback ('CONFIRM',
'CONFIRMDIALOG'), scheduler events (SCHEDULE) and others. Keyboard and mouse events are combined with modifier keys CTRL, ALT,
SHIFT and META, so you can bind different handlers for one event, but with various modifier keys. For all events (except
SCHEDULE) handler command line is a first non-empty srting, for SCHEDULE - *nix like scheduler service (cron) crontab file
format text area, wich represents an instructions list (one by line) of the general form:
'run this command at this time on this date for all objects of this view for the current element'.
Blank lines and leading spaces, tabs and error lines are ignored. Instruction is a separated by spaces entry list with next
format:
<minute 0-59> <hour 0-23> <day of month 1-31> <month 1-12> <day of week 0-7> <queue> <view id> <command line>
First five entries are datetime parameters, sixth - queue parameter setting for number of simultaneous executed commands
in range 1-1024, seventh - view identificator to identify objects to run the command for. The rest of the line is treated as
a command line to run. Datetime parameters may be set to asterisk (*), which always stands for 'first-last'. Ranges of numbers
are allowed. Ranges are two numbers separated with a hyphen. The specified range is inclusive. For example, 8-11 for an 'hours'
entry specifies execution at hours 8, 9, 10 and 11. Lists are allowed. A list is a set of numbers (or ranges) separated by
commas. Examples: '1,2,5,9', '0-4,8-12'. Step values can be used in conjunction with ranges. Following a range with '/<number>'
specifies skips of the number's value through the range. For example, '0-3/2' can be used in the hours field to specify 0,2
hours execution. Zero or 7 day of week values are Sunday.
So scheduler service tries to check all SCHEDULE events of all databases and its elements each minute. In case of datetime
parameters match - the specified command line (handler) for current element id is exexcuted for every object of the specified
view. Running instruction job is not checked until the previous one finished. Next example clears (by setting empty value)
element value every day at 3:00 (see 'Handlers' help section for args of _.php regular handler):
0 3 * * * 1 2 php _.php SET
Commands run one by one (queue=1) for the current element of all objects selected by OV id2.

Third configuration section - 'View'. The same way for add/delete operations is used - empty name removes the view, 'New view'
option with any name specified - creates it. View name is 64 chars max, first char '_' hides unnecessary views from user
sidebar, so the view can be called from element handlers only (see 'Handler' help section for details).
The object view (OV) of itself is a mechanism to output selective object data on specified template. Objects for the view are
obtained from the selection process (see 'Object Selection' for details), their elements - from 'Element layout' (see
appropriate help section for details). Two text areas at the bottom are view permissions for read/write
operations. 'Disallowed list' restricts specified users/groups and allows others, while 'Allowed list' allows specified and
restricts others.

Last configuration section is 'Rule'. Every controller inbound event is passed to the rule analyzer to test on all rule profiles
in alphabetical order until the match for both event and query is found. Events (each on a new line and at the start) may be
combined with modifier keys CTRL, ALT, SHIFT and META (for keyboard and mouse events only) separated by spaces.
Event line example 'KeyG CTRL' matches keyboard event for the key 'g' down together with CTRL. Rule query is a list of SQL query
strings (one by line), so non-empty and non-zero result of all query strings - match case; any empty, error or zero char '0'
result - no match. When a match is found, the action corresponding to the matching rule profile is performed, no any match -
default action 'accept' is applied. Accept action agrees specified event, while reject action cancels it. Empty rule event or
query list - rule profile is ignored.
Query strings may have some :keys (started with the colon) which are replaced with next values:
:user		- the user initiated event
:preversion	- object instance version number before the rule event is applied, senseless for 'INIT' (equals :postversion),
		  cause the object does not exist before the 'add object' operation ('INIT event') is done
:postversion	- object instance version number after the rule event is applied, used for INIT, DELETE and CHANGE events
		  only, for other events :postversion is senseless and equals :preversion
:oid		- object id number event is initiated on
:odtable	- application object database sql table name

Here are some query examples:
1. SELECT 'root'=':user'
2. SELECT 1 FROM :odtable WHERE id=:oid and version=:preversion and JSON_UNQUOTE(JSON_EXTRACT(eid2, '$.value'))='John'
   SELECT 1 FROM :odtable WHERE id=:oid and version=:postversion and JSON_UNQUOTE(JSON_EXTRACT(eid2, '$.value'))='Mary'
3. SELECT COUNT(version)>2 FROM data_1 WHERE id=:oid
4. SELECT owner!=':user' from :odtable where id=:oid and version=1
5. DELETE FROM :odtable WHERE id=:oid and version <= :postversion-2

First example query with reject action for 'KeyF2' event is called when the user presses F2 key and is true for the user root
(who has initiated event by pressing F2) only. Therefore the rule cancels specified event handler call.
Second example with reject action for the 'CHANGE' event disallows element #2 value change from John to Mary, any other changes,
for a example, from Mary to John are applied.
Third example with reject action for the 'CHANGE' event allows to change object only once. New object has one version
(instance), after object is changed at the 1st time - it has two versions, so second change will have three versions and will
be blocked, because of a true expression 'COUNT(version)>2' (3>2).
Next example with reject action for the 'DELETE' event allows to remove self-created objects only via comparing created object
(version=1) owner with the user the object is being deleted by.
Last example removes older object versions and leave only last two. So for the CHANGE event this rule keeps only last two
versions of any object allowing not to store unnecessary data and saving some disk space.

When a match is found the rule message for the reject actions is displayed on the client side dialog box, for 'accept' actions -
messages are displayed for INIT, DELETE, CHANGE events only. To remove the rule - set its name empty.
Set 'Log rule message' to save it to 'Logs' OD, so you may create 'Logs' database special view, which selects rule uniq message
to monitor specific user activity.`
}},

"Object Selection": { profile: { type: 'text', head:
`Object selection is a part of the sql query string that selects objects for the specified view. Let's have a look to the
object structure stored in database to select required objects effectively. Each object consists of next SQL table columns:
- id. Object identificator.
- lastversion. Boolean value 0 or 1 indicates whether it is last object version or not. See 'version' field.
- version. Indicates object version number started from '1', that is assinged to just created new objects.
  After object any change, controller creates a new database record with the changed object copy, increments its version
  and set lastversion flag to 1. This mechanism allows to store every object instance, so user can trace object data changing
  and find out when, how and who object was changed by. Deleted objects are marked by zero version and lastversion flag set.
- owner. The user this object version (object instance) was created by.
- datetime. Date and time this object version was created at.
- eid<element id>. JSON type element data. The element is custom (user defined).

Error object selection string selects no objects, empty string - all actual objects.
Controller selects objects via database query with next format:
'SELECT <element layout selection> FROM data_<OD id> <object selection>'
Default object selection (empty string) selects all relevant (lastversion=1) and non deleted objects (version!=0), so
selection string 'WHERE lastversion=1 AND version!=0' is applied and result query is:
'SELECT .. FROM data_<OD id> WHERE lastversion=1 AND version!=0'

This format together with object structure provides native and effective selection of object sets via powerful SQL
capabilities! To make object selection process more flexible some parameters may be used in object selection string. These
parameters should start from colon char ':' and finish with space, single or double qoutes, backslash or another ':'. Parsed
parameter name is set as a question (with chars '_' replaced with spaces) on client side dialog box at the object view call.
Parameter name :user is reserved and replaced with the username the specified view is called by.

Object selection string example for built-in 'Logs' object database:
WHERE lastversion=1 AND version!=0 AND JSON_UNQUOTE(JSON_EXTRACT(eid1, '$.value')) regexp ':Select_log_string_to_search'
The selection example displays dialog with input question 'Select log string to search'.
Parameter ':Select_log_string_to_search' is replaced by input string to build result query, so the controller
selects objects (log messages) which match specified input string regular expression. Note that JSON_EXTRACT function
extracts quoted value, so to unquote the result JSON_UNQUOTE function is used.

Another object selection option is a link name. The option of itself represents one or multiple names divided
by '|' or '/'. With that option specified the selection process takes only first selected/found object (others are
ignored) and builds the tree (based on object elements 'link' property matched link-names) from that head object. Result
selection is that tree object list. The tree for link names divided by '|' is built on all specified names, while for
names divided by '/' - only for the first matched per object. Only one delimiter can be used for the view, so name list
'name1|name2/name3' will be divided into two names: name1 and 'name2/name3'.
See 'Element layout' help section for the tree template.`
}},

"Element layout": { profile: { type: 'text', head:
`Element layout is applied to the view (see 'View' of Database Configuration' help section) and defines what elements
should be displayed and how for the selected template. Element layout is a following one by line JSON strings list.
JSON format depends on the selected template.
Let's first consider 'Table' template - it is the main way to output and manage OD data. Table emplate element layout
allows to format data many different ways - from classic tables to public chats, see examples below and 'Examples' help
section. Each layout JSON for a table template defines elements and their behaviour - such as table cell position, style
attribute, event and etc, for a example - '{"oid": "..", "eid": "..", "x": "..", "y": ".."}'. JSON possible properties are:

- 'oid'. Property 'oid' defines object id and can take next values:
	exact object id number (starts from 1, where ${TITLEVIRTUALROWID} - title object, ${TITLEVIRTUALROWID} - new object, 3.. - database objects)
	asterisk * (all objects except title and new object input)
	expression (with four possible vars: o, e, n, q)
  HTML style (style), position (x, y) and other attributes are applied to the specified object element defined by oid/eid combination,
  see oid/eid table below. All actual objects in database have their unique identificators (starts from ${PRIMARYKEYSTARTVALUE}). Every database has
  two service objects: header (title) object with id ${TITLEVIRTUALROWID} and new object (object to input text data to add new objects) with id ${NEWVIRTUALROWID}.
  In case of exact object id number in 'oid' - attributes (x, y, style..) are applied to that specified object id with the highest
  priority as more specific. Attributes of JSON with asterisk (*) 'oid' are applied to all objects of the selection (see 'Object
  Selection' help section) with lower priority. All other 'oid' values are treated as a javascript expressions. True expressions match
  the object, false expressions - doesn't. JSONs properties with 'oid' as an expression are applied with the lowest priority.
  Expression example: "o%2===1" matches objects with odd identificators, so JSON
  '{"eid":"*", "style":"background-color: green;", "oid":"o%2===1 && o>2"}' will paint all odd (o%2===1) and actual (o>2) objects with
  the green background color. Expressions may contain next vars:
	'o' - object id number in the selection
	'e' - element order number in element layout (for the first element e=0, for the second e=1 and so on)
	'n' - object order number in the selection (for the first object n=0, for the second n=1 and so on)
	'q' - total object count.
  Empty 'oid' property ("oid": "") defines 'style' and 'hiderow' attributes for undefined cell that has no object element placed in.
  Property 'eid' is ignored.
  Unset 'oid' property defines virtual element or html tag <table> attribute list. Property 'eid' is also ignored.
  Virtual elements are not stored in object database and have its own value stored in JSON 'value' property that is treated as a
  clear text except the cases started from 'SELECT ' string. In that case 'value' text is an SQL statement that is executed to retreive
  the data to be used as a virtual element value. In case of a error 'value' property remains unchanged. Virtual elements are useful to
  output some total/summary data ('SELECT SUM|COUNT|AVG.. FROM data_<OD id>..') to build related graphs and charts.
  Well, JSON with unset 'oid' is treated as a virtual element, but with unset x, y or value all JSON properties are treated as HTML
  table tag attributes, see some layouts in 'Examples' help section. Besides table attributes - 'rotate' word can be used as a property
  to set table rotation. Possible values: 90, 180 and 270. These are the angles the HTML table should be rotate at. Unknown 'rotate'
  value makes no effect.
- 'eid'. Property 'eid' is an element id and can take next values:
	exact element id number (starts from 1)
	service element names (id, version, owner, datetime, lastversion)
	asterisk * (all user defined elements 1, 2, 3..)
  Similar to 'oid' property 'eid' defines exact element (via its identificator or name) or all elements (*) of the specified object
  with x, y, style and other properties should be applied to.
- 'x','y'. Object element position on HTML table is defined by table cell x,y coordinates. These properties are arithmetic expressions
  that may include four variables (see 'oid' property description). For a example, "y": "n+1" will place first object (n=0) in the
  selection to the second row (y=1), second object (n=1) - to the third row (y=2) and so on. Note that column/row numeration starts
  from 0. See layout examples below.
- 'event'. Mouse (DOUBLECLICK), keyboard (only KeyF1..KeyF12, KeyInsert, KeyDelete), clipboard paste (PASTE) or chart (CHART) events
  to emulate at OV open. Mouse and keyboard events may be combined with modifier keys CTRL, ALT, SHIFT and META separated by spaces.
  Event property example {.."event": "KeyF2 CTRL"..} emulates key 'F2' press together with CTRL just right after the view open.
  'PASTE' event pastes clipboard text data specified after event name via single space: {.."event": "PASTE <pasting text>"..}
  Chart event emulates context menu 'Chart' call of the table seleceted cells. It is useful to display the chart automatically after
  the view call. Chart event may have four args - "event": "CHART(0,0,3,5)". Arguments (x1,y1,x2,y2) define table selected area from
  top left (x1,y1) to right lower (x2,y2) corner. No args ("event": "CHART") - whole table as a selected area is used.
  Incorrect event value - no emulation, but cursor is set to the position specified by 'x','y' coordinates anyway.
  Note that only one event is generated, so last specified is used.
- 'hidecol'/'hiderow'. These properties collapse (hide) table columns/rows containing at least one cell with 'hidecol'/'hiderow'
  value. Strict comparison is used. For example, JSON '{"eid": "1", "oid": "*", "hiderow": ""}' will hide all table rows
  containing empty cell ("") of any object element id#1.
  For undefined cell (see 'oid' empty case above) property 'hidecol' is not supported, while 'hiderow' with any value collapses
  the row only in case of all undefined cells in a row.
- 'style'. HTML css style attribute for <td> tag the specified object element (or virtual element) is placed in. See appropriate
  css documentation.
- 'value'. Table cell element main text instead of database retrieved value.
- 'hint'. Table cell element hint displayed as a hint on a table cell mouse cursor navigation.

As it was mentioned above element layout is a JSON list. But for the configuration convenience it is possible to use comma separated
element list instead of JSON. Element list is extracted to the JSONs anyway and places elements one by one with the first row as a
title and second row (in case of a line leading space) as a new object input. Also empty or all-spaces layout is treated as an
asterisk '*' (all user-defined elements).
Example: layout 'id,datetime,1,2' formats the table with the 1st row as a title and database objects then, where 1st column is
object id, 2nd column - object version creation timestamp, 3rd column - object elements id1 and 4th column - object elements id2.
Another example: layout ' *' is a simple table with the title at the 1st row, new object input (leading space) at the 2nd row and all
objects of the selection (starting from the 3rd row) with all (asterisk *) user-defined elements followed one by one starting from
the first column.

  Properties 'oid'/'eid' combinations description, optional ones are in square brackets:
  +-----------+-------------------------+------------------+----------------------------+
  |   \\       |                         |                  |                            |
  |    \\ oid  | 1|2|3|4..|*|            |      empty       |          unset             |
  |     \\     | expression (o, e, n, q) | (eid is ignored) |      (eid is ignored)      |
  |  eid \\    |                         |                  |                            |
  +-----------+-------------------------+------------------+----------------------------+
  |           |                         |                  |                            |
  |id         |  x (o, e, n, q),        |                  | table attributes           |
  |owner      |  y (o, e, n, q),        | [style, hiderow] | and rotate                 |
  |datetime   |  [value,                |                  | or                         |
  |version    |  style,                 | (for undefined   | virtual elements:          |
  |lastversion|  hint,                  | cell that has    | x (n),                     |
  |1,2..      |  event,                 | no any object    | y (n),                     |
  |*          |  hidecol, hiderow]      | element in)      | value,                     |
  |           |                         |                  | [style, hint]              |
  |           |                         |                  |                            |
  +-----------+-------------------------+------------------+----------------------------+

Let's parse next element layout (OV 'All logs', OD 'Logs'): id,datetime,1.
First element in the list is 'id', it is extracted to next two JSONs:
{"eid":"id", "oid":"${TITLEVIRTUALROWID}", "x":"0", "y":"0"}
{"eid":"id", "oid":"*", "x":"0", "y":"n+1"}
These JSONs describes 'id' service element layout:
 - title object (oid=${TITLEVIRTUALROWID}) for 'id' element will be on the top left corner of the table (x=0, y=0).
 - each object of the selection (oid=*) is placed to the first table column (x=0) and to the row 'n+1' (y=n+1),
   where 'n' is object serial number in the selection: first object in the selection (n=0) goes to the second
   row (y=0+1=1), second object in the selection goes to the 3rd row (y=1+1=2) and so on.

Similarly for two next elements datetime and log message (eid=1). They are extracted to:
{"eid":"datetime", "oid":"${TITLEVIRTUALROWID}", "x":"1", "y":"0"}
{"eid":"datetime", "oid":"*", "x":"1", "y":"n+1"}
{"eid":"1", "oid":"${TITLEVIRTUALROWID}", "x":"2", "y":"0"}
{"eid":"1", "oid":"*", "x":"2", "y":"n+1"}
Column ('x' coordinate) position for datetime is x=1 (second column) and for log message is x=2 (third column).

**************************************************

Next - 'Tree' template, it builds the tree from head object ('object selection' first found) to other objects based
on their element link properties. Each link property is one or multiple (one by line) connections. Each connection
has its link name, remote 'element' and remote object (tree node) 'selection' the connection links to.
All three values are divided by '|'. Connection format: <link name>|<remote element>|<remote object selection>
Remote object selection is a part of a query that calculates next object/node on the tree.
Query format: SELECT id FROM <OD> WHERE lastversion=1 AND version!=0 AND <remote object selection> LIMIT 1

Example: five objects are linked with each other via next connections:

      +-----------------------------------+
      |            object  id7            |
      |                                   |
      |             element10             |
      +-----------------------------------+
                        ^
                        |
                        |l1
                        |
      +-----------------------------------+
      |             element9              |
      |            object id6             |
      | element7                element8  |
      +-----------------------------------+
            ^                       ^
            |                       |
            |l1                     |l1
            |                       |
    +---------------+       +---------------+
    |   element4    |       |   element6    |
    |  object id4   |       |  object id5   |
    |   element3    |       |   element5    |
    +---------------+       +---------------+
            ^                       ^
            |                       |
            |l1                     |l2
            |                       |
      +-----------------------------------+
      | element1                element2  |
      |         head object id3           |
      |                                   |
      +-----------------------------------+

Head object3 has two routes to object7, first route - via object4, second - via object5.
Let's create some views to display first route, second route and both routes.
First view properties:
- 'Name' = 'Main route'
- 'Template' = 'Tree'
- 'Object selection' = 'WHERE id=3' (head object #3 selection)
- 'Link name' = 'l1'
Second view properties:
- 'Name' = 'Alternative route'
- 'Template' = 'Tree'
- 'Object selection' = 'WHERE id=3' (head object #3 selection)
- 'Link name' = 'l2/l1'
Third view properties:
- 'Name' = 'Main and alternative routes'
- 'Template' = 'Tree'
- 'Object selection' = 'WHERE id=3' (head object #3 selection)
- 'Link name' = 'l1|l2'

First view 'Link name' is 'l1', so the tree is built on object elements links property containing connections with link name
'l1', so object list will be routed via "object3 -> object4 -> object6 -> object7". Similarly for the second view, but link
names 'l2/l1' will route via object5 instead of object4 (for the whole object3 first found 'l2' is used as one possible link
name only), so result route will be "object3 -> object5 -> object6 -> object7".
The third view link name list is 'l1|l2', so both names ('l1' and 'l2') are considered in a tree building process and the
view will be displayed as on the scheme above, but object6 will be shown as a looped tree node with the red color highlighted
content background.

Also object elements for our example must have next link property values:
object3, element1: 'l1|3|id=4'  (link name 'l1', remote element id 3, remote object_selection 'id=4' selects object id 4)
object3, element2: 'l2|5|id=5'  (link name 'l2', remote element id 5, remote object_selection 'id=5' selects object id 5)
object4, element4: 'l1|7|id=6'  (..)
object5, element6: 'l1|8|id=6'  (..)
object6, element9: 'l1|10|id=7' (..)

In addition to the tree template settings - 'Element layout' defines tree node content (element titles and values list),
tree scheme direction and call parameters via JSON format. The first found correct JSON is used. Element layout JSON should
contain element identificators (id, datetime, owner.. 1, 2..) as a JSON property names (property values are ignored) plus
'rotate' and 'call' optional properties. Property 'rotate' defines scheme direction - the '180' value (other values are
ignored and make no effect) flips the tree scheme. Property 'call' represents nested JSON to call the specififed view at
object tree node mouse double click. Have a look to the next layout example:
{ "datetime": "", "1": "", "rotate": "180", "call": {"ODid": "1", "OVid": "2", ":ip": "3"} }

Layout JSON above displays the flipped tree (rotated at 180 degrees) with tree nodes of two elements (datetime and element
id1) in. Node mouse double click calls the view id2 of database id1 with clicked object element id3 value passed as an ':ip'
parameter to the view object selection. In case of database/view identificators ("ODid"/"OVid") omitted - current
database/view is used. All 'call' JSON properties are optional, so empty 'call' JSON ("call": {}) just reopens current
view (tree).

Empty element layout field is treated as a default one and displays all defined elements plus 'id' as a node content.
Layout empty JSON '{}' is treated as a correct one and displays no node content, while layout all error JSONs - only 'id'
element.`
}},

"Handlers": { profile: { type: 'text', head:
`Element handler is any executable script or binary called by the contoller when specified event occurs. Events occur on
user interaction with actual objects (mouse double click or keypress), new objects add, object data change and other object
or database processes. Client-server interaction model represents next scheme: client (browser) generates event which is
passed to the server (controller). Controller accepts the event and processes it either by itself (new database, for a 
example) or by calling/executing appropriate handler, which output result is parsed by the controller and then passed to
the client:

+--------------+                                   +--------------+                                   +--------------+
|              |                                   |              |                                   |              |
|              |            USER EVENT             |              |            HANDLER CALL           |              |
|              |      ---------------------->      |              |      ---------------------->      |              |
|   Client     |                                   |    Server    |                                   |   Handler    |
|  (browser)   |                                   | (controller) |                                   |              |
|              |        CONTROLLER COMMAND         |              |          HANDLER COMMAND          |              |
|              |      <----------------------      |              |      <----------------------      |              |
|              |                                   |              |                                   |              |
+--------------+                                   +--------------+                                   +--------------+
                                                          ^
                                                          |
                                                          | CRUD operations
                                                          |
                                                          тИи
                                              +------------------------+
                                              |                        |
                                              |                        |
                                              |        Database        |
                                              |                        |
                                              |                        |
                                              +------------------------+

					    <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">USER EVENT</span>
As it was mentioned above user events are generated after database object manipulations, so they are:

 - DOUBLECLICK:
    left mouse button double click
 - KeyA..KeyZ, Key0..Key9, KeyF1..KeyF12, KeySpace, KeyInsert, KeyDelete, KeyBracketLeft, KeyBracketRight:
    specified key press in any keyboard layout
 - KEYPRESS:
    event is fired when a key that produces a character value (alphabetic, numeric, punctuation and others) is pressed down
    and pressed key event above is unregistered, so, for a example, key 'a' press will fire KEYPRESS event only in case of no
    event 'KeyA' registered. Also note that all keyboard (including KEYPRESS) and mouse events may be set up with modifier keys
    CTRL, ALT, SHIFT and META, so events 'KeyA' and 'KeyA+CTRL' are different and may have their own handlers.
 - CONFIRM:
    editable content after edit finish returns back to the controller and then to the handler to be processed
 - CONFIRMDIALOG:
    dialog box data after apply returns back to the controller and then to the handler to be processed
 - PASTE:
    event is passed to the controller on element pasting data (CTRL+V, SHIFT+INS)
 - INIT:
    adding new object via context menu or new object input. Context menu 'Add Object' creates new object with parameters in a
    new object input table cells, while 'Clone Object' takes parameters from specified object table cells.
    These parameters are used as a <data> args (see hadler call section below) for the handlers called at the new object
    creation event via add/clone context menu.
 - DELETE:
    object deletion via context menu. Controller 'removes' the object from DB by creating new object empty instance with zero
    version and lastversion flag set

Also there are some events generated by the controller only, they are:
 - CHANGE:
    after any element data is changed (via SET/RESET handler commands, see below) the event 'CHANGE' occurs for other elements
    of the object, so these other elements can react on any object change - one element handler changes its element data,
    others receives 'CHANGE' event. In context of database rules (see 'Rule' section of Database configuration) 'CHANGE' event
    is treated as an any object data changed.
 - SCHEDULE
    event is generated by system scheduler on, see 'Element' section of Database configuration

					    <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">HANDLER CALL</span>
User events above are received from the client side by the controller and passed to the handler for the initiated element
(or all elements) via executing specified handler command line configured in a 'Element' section of Database configuration.
Events 'INIT', 'DELETE' and 'CHANGE' are passed to all elements of the object ('CHANGE' is passed for all except initiated
element), while others events - to initiated element only. Handler command line is executed as it is specified, but with
one moment - angle brackets quoted arguments are parsed to be replaced by the next values:
 - <user> is replaced by user name the specified event was initiated by. 'SCHEDULE' event is initiated by built-in 'system' user.
 - <event> is replaced by event name (DOUBLECLICK, KEYPRESS..) the handler is called on.
 - <title> is replaced by element title (element name in Database configuration) the event was initiated on.
 - <datetime> is replaced by date and time in format 'Y-m-d H:i:s'.
 - <data> is replaced by event data.
    For KEYPRESS: event data is a symbol key char depending on keyboard layout.
    For PASTE: event data is text data the user have pasted from clipboard.
    For INIT: event data argument text content in 'new object' or 'cloned object' element table cells if exist, otherwise <data>
	      argument is an empty string ''.
    For CONFIRM: after html element <td> editable content apply  - <data> argument is that content text data.
    For CONFIRMDIALOG: after dialog box apply - <data> argument is a JSON that represents dialog structure*
    For other events <data> argument is undefined.
 - <JSON> is a special argument that is replaced by retrieved element data. JSON format:
    { "ODid":, "OD":, "OVid":, "OV":, "object":, "element":, "prop":, "regex":, "regexp":, "limit":, ":..": }
    Data is retrieved from element(s) "element" property "prop" of object(s) "object" of the database "ODid"/"OD" and view
    "OVid"/"OV" and then tested on "regex"/"regexp" regular expressions. Successful cases are saved (each on a new line) to the
    result string that replaces the <JSON> arg in a result handler command line.
    -----
    First four properties identify database view. In case of database/view identificators ("ODid"/"OVid") omitted -
    database/view names ("OD"/"OV") are used. Both identificator and name omitted - current database/view are used.
    -----
    Property "object" identifies database objects via SQL query, that selects only necessary objects (among all view objects)
    the element data to retrieve/search from. Result query fromat:
    SELECT .. FROM (SELECT * FROM <ODid> <vew object selection>) _ WHERE <property "object" selection>
    Omitted "object" property in case of the current database view specified - current object (to retrieve/search element data)
    is used, in case of another database view specified - all view objects are used. Empty "object" property - all view objects
    are used too.
    -----
    Properties "element" and "prop" identify element (of the selected objects above) and its JSON property name ("prop") to be
    retrieved/searched. Omitted "element" - current element (the event was initiated on) is used. Empty "element" - all elements
    (excluding service ones) are used, otherwise "element" is an element (user element id number [1,2..] or service element name
    [id,owner,datetime..]) list separated by comma. Omitted "prop" - property "value" of element JSON data is used.
    -----
    Properties "regex" and "regexp" identifies regular expression strings (in format '/regexp/flags') to search on. Specified
    object element data is tested on "regex" and then matched pattern is tested on "regexp" (if exist). Omitted "regex" - search
    process is considered to be successful. Don't forget to escape backslash '\\' to use special characters in a regular
    expression strings and beaware of too long search result strings as they inserted as a handler arguments in a command line
    executed. Max result strings number is specified in a "limit" property. Omitted or incorrect "limit" - number is set to 1
    (min value), max allowed number is 256.
    -----
    Also <JSON> may consist of some additional (nested) JSONs (with property names starting from ':'), which values are
    retrieved the same way. These retrieved values then are used as a replacements in current JSON "object" and "regex/regexp"
    properties, here is an example:
    <{ "object": ":arg1",  "regex/regexp": ":arg2", ":arg1": {..}, ":arg2": {..} }>
    Max 'nesting' levels number is 3, see 'Examples' help section for extra info.
    -----
    All properties of <JSON> argument are optional, so any JSON (even empty <{}>) is treated as a correct one. Thus, empty
    (or with unknown properties) JSON will be replaced by the current object element value.
 - <oid> is replaced by the object id the event was initiated on. The same as JSON arg  <{"element":"id"}>.
 - <modificators> is replaced by the logical-OR result of pressed Ctrl(8), Alt(4), Shift(2) and Meta(1) modificator key values
   from keyboard/mouse user events. No modificator key pressed - zero value is used.
 - <dir> is replaced by the current element directory the handler can read/write saved files.
 - <od>, <ov>, <odid>, <ovid> are replaced by the database name, view name, database id and view id respectively.
Not listed above argument cases (<user>, <event>, <title>..) remain untouched and qouted to be treated as a single command
line argument. Non-paired angle brackets are truncated in a result command line to avoid stdin/stdout redirections.

					    <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">HANDLER COMMAND</span>
To make database changes or some client side actions - user handlers may return (output to stdout) some commands in JSON
format:
{"cmd": "<command>", "<prop1>": "<value1>",.., "<propN>": "<valueN>"}
Empty output or unknown commands (see available command list below) are ignored and make no actions. Output in non-JSON
format is automatically converted to the 'SET' command to be set as an element value (see 'SET' command description below):
{"cmd": "SET", "value": "<non-JSON handler output>"}. This is a default handler output mode behaviour. In dialog mode
handler output is displayed only as a text at client side alert box, while in debug mode all JSON and non JSON output data
(plus event info and command line string) is displayed as a client side alert text only with one exception - for INIT,
CHANGE and SCHEDULE - output is saved to "Logs" Database instead. Detach mode ignores handler output data, therefore
controller just runs the handler and doesn't wait its data to process.
Also handler output for "DELETE" event is ignored and not logged in any mode.

Available handler commands are:
 - 'EDIT'. Format: '{"cmd": "EDIT", "data": "<some text>"}'. The command makes the client side table cell content be editable.
   Property 'data' is optional and set as an editable content. No 'data' property - current table cell content (element value)
   is used as an editable content. For example, 'mouse double click' calls the handler, which response is 'EDIT' command - 
   just like in Excel :)
 - 'ALERT'. Format: '{"cmd": "ALERT", "data": "<some text>"}'. The command displays client side warning dialog box with
   <some text> as a warning/info text and 'OK' button. No 'data' property - the command is ignored.
 - 'DIALOG'. Format: '{"cmd": "DIALOG", "data": {<JSON dialog>}}'. The command displays client side dialog box based on
   <JSON dialog> format*, which allows to generate 'powerful' dialog boxes with any combination of text input, text areas,
   multiple/single selects, radio-buttons, check-boxes, interface buttons.. No 'data' property - the command is ignored.
   Dialog box in general consists of title area, pad content and footer. Each pad has one or more profiles and each profile
   has its uniq content with specified interface elements (check-boxed, radio-buttons, text areas, inputs and etc..).
   Footer is a button area to apply or cancel content changed data, see JSON dialog format below*
 - 'CALL'. Format: '{"cmd": "CALL", "ODid": "<database id>", "OVid": "<view id>", "params": {<JSON params>}}'. The command
   calls specified by OD/OV identificators database view as if the user clicks specified view on the sidebar. It is useful
   for some views to be called from a handler as a responce on some user events (mouse or keyboard, for a example) and
   according to the specific handler behaviour. <JSON params> is a JSON formatted object selection parameters,
   see 'Object Selection' help section for details. For a example, some object element mouse double click displays the view,
   which displays objects matched the clicked element value, that is passed in a "params" property.
 - 'SET'/'RESET'. Object element data set. Format: '{"cmd": "SET/RESET", "<prop1>": "<value1>", .., "<propN>": "<valueN>"}'.
   'SET' command updates all specified element JSON properties only. 'RESET' command does the same, but additionally removes
   all not specified properties. In fact, 'RESET' replaces element data with the handler output JSON.
   Note that element data property 'value' is displayed as a main element table cell text, property 'hint' is displayed as a
   footnote on element table cell mouse cursor navigation, upward triangle pictogram at the cell top right corner indicates
   elements with the hint. Also downward triangle pictogram at the cell top right corner indicates elements with the 'link'
   property and square pictogram indicates elements with files attached.
 - 'UPLOADDIALOG'. Format: '{"cmd": "UPLOADDIALOG"}'. The command makes the controller to call client side for the dialog box
   to upload/attach files to the object element.
 - 'DOWNLOADDIALOG'. Format: '{"cmd": "DOWNLOADDIALOG"}'. The command makes the controller to call client side for the dialog
   box to download files from the object element to the client.
 - 'UNLOADDIALOG'. Format: '{"cmd": "UNLOADDIALOG"}'. Similar to the 'DOWNLOADDIALOG', but with the option to delete attached
   files.
 - 'GALLERY'. Format: '{"cmd": "GALLERY"}'. The command makes the controller to call client side for the gallery mode to view
   images (.jpg .png .gif .bmp) among element attached files. Use left/right keys for image navigating and double click for
   image size toggling from 'fit the screen' to auto.
 - 'NEWPAGE'. Format: '{"cmd":"NEWPAGE", "data":"<url>"}'. The command makes client side to open new browser tab with
   property "data" as an url. Omitted protocol in url - https is used for default.

All handler commands except 'SET/RESET' are ignored for 'CHANGE', 'INIT' and 'SCHEDULE' events.
Some handlers may take long time for a execution, so to avoid any script/binary freezing or everlasting runtime - user
can manage handler processes via 'Task Manager' (context menu). Its table columns are PID (process identificator), Handler
(handler command line), Exe time (handler running time in sec), Initiator (user name initiated event for the handler call),
Ip (client ip address), Event (user event name), Database/view (database/view names), OId/Eid (object and element
identificators) and Kill (column with buttons 'X' to kill appropriate handler process). Task manager info is refreshed
automatically every second. Any column header mouse click (except 'Kill') sorts handler process list in ascending or
descending order.

					    <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">CONTROLLER COMMAND</span>
All Handler commands except 'SET'/'RESET' are passed from the handler by the controller directly to the client without
modification. These commands are client side specific and execute client (browser) actions such as edit content, alert
message, dialog box, specified view open/call and others.
'SET' and 'RESET' commands make controller to do some database operations (new object instance version create or new object
create), process 'CHANGE' event and then check result object version on database rules.
Processed by the controller by calling all element handlers 'INIT' and 'DELETE' commands force client side to refresh the
current view.

Application has some regular php handlers to manage user database, customization and element data.
Fisrt - user.php, see element #1 of 'User' database. The script creates users, changes their passwords, group membership and
user permissions via dialog box on element #1 double click. Group membership is a list of the groups (one per line) the user
is a member of. LINE FEED char is inserted at the end of the list automatically (if necessary) for the last line (last group
name in the list) to be correct.
User permissions represent two lists (for the read and write permission). Each list is a colon divided combination
(one by line) of database:view identificators. Omitted view id - restriction is applied for all views of specified database.
Non digit chars at the end of the line are ignored and can be used as a comment for the specified id combination.
For a example - combination '1:2' will restrict view id2 of database id1 for the user, '1' or '1:' will restrict database id1
all views. So hidden list of '1:2' will hide the specified view from the user with no read/write access, while visible list of
'1:2' will hide all databases and views for the user, except database id1 view id2. Empty visible list for the user disable
visibility of all views absolutely, so user can do nothing except reading this help:)
Per user restrictions are applied together with view specific restrictions listed in database view configuration.

Second - customization.php in 'User' database for the element #6. The script customizes user interface via css
properties for css selectors shown as dialog box profiles. All users (except system account) are created with default
customization, default user 'root' preferably may not be used or changed in order to apply his customization (via
'force-user' option in customization dialog) and restore some other users props.

Another one is a _.php that is a kind of excel cell behaviour: F2 or double click makes cell content editable, DEL clears
cell text, CTRL|ALT|SHIFT + Enter combination (see described above user customization, 'Application' profile) applies content
changes, ESC exits editable mode with no changes and others. Handler supports next commands followed as a first argument:
- 'SET' sets all input args concatenated to one string as an element main text (element 'value' property).
  For a example, handler command line 'php _.php SET Alex is 20 years old' will set next cell content/text of
  concatenated args: 'Alexis20yearsold', while 'php _.php SET "Alex is 20 years old"' will set 'Alex is 20 years old'.
- 'EDIT' makes controller to call client side to edit element main text (element 'value' property). Format:
  php _.php EDIT arg1 arg2..
  Cell content (element main text) of all concatenated args becomes editable, omitted args - current cell content becomes
  editable. To apply changed content after edit - set next handler for the CONFIRM event: php _.php SET <data>
- 'SETPROP' allows to edit any element property via dialog box, command line format:
  php _.php SETPROP prop1 <{"prop":"prop1"}> prop2 <{"prop":"prop2"}>..
  where 2nd arg prop1 is a first property name to edit, 3rd arg is JSON to retrieve prop1 property value, similarly for
  the prop2 (4th and 5th args) and others.
  To save dialog data with the new property values - set next handler for the CONFIRMDIALOG event:
  php _.php CONFIRMDIALOG <data>
  Good practice for most elements is interface to edit some service props ('link', 'hint' and 'style')
  via dialog on KeyInsert event (for a example), so command line for that key press will be:
  php _.php SETPROP link <{"prop":"link"}> hint <{"prop":"hint"}> style <{"prop":"style"}>
- 'SELECT' allows to select one element value among predefined values separated via '|' in one arg passed to handler :
  php _.php SELECT 'value1|value2|value3..'
  Handler will call dialog box with select interface element with specified options value1, value, value3..
  To save dialog data - set next handler for the CONFIRMDIALOG event: php _.php CONFIRMDIALOG <data>
- 'UPLOADDIALOG', 'DOWNLOADDIALOG', 'UNLOADDIALOG', 'GALLERY' args call appropriate user event actions on client side with
  attached files and images, see 'user event' section.
- 'CALL' arg calls current database view name (2nd arg) with id parameter for the object selection string in the 3rd arg.
  For a example, to display all versions of the current object on F12 key press - first register handler command line
  '_.php CALL _history <oid>' on 'KeyF12' event, then create hidden database view '_history' with object selection
  'WHERE id=:id' and element layout 'version,datetime,user,*'.

*JSON dialog is a nested JSONs which describe dialog box structure and its interface elements:

{ "title": "dialog box title",
  "dialog": { "pad1": { "profile1": { "element1": { "type":	"select|multiple|checkbox|radio|textarea|text|password|table",
						    "head":	"<element title>",
						    "data":	"<element data>",
						    "help":	"<hint>",
						    "line":	"",
						    "readonly": ""
						  }
				      "element2": {..}
				    },
			"profile2": {..}
		      },
	      "pad2": {..}
	    },
  "buttons": { "button1": {"call": "", "value": "", "timer": "", "interactive": "", "error": "", "warning": "", "enterkey": "" },
	       "button2": {..}
	     },
  "flags": { "style": "dialog box content html style attribute",
	     "pad": "active (current selected) dialog box pad if exist",
	     "profile": "active (current selected) dialog box profile if exist",
	     "showpad": "",
	     "profilehead": { "pad-name1": "header1", "pad-name2": "header2", ..},
	     "updateonly": ""
	   }
}

- "title" is a dialog box text title, empty or undefined title - no box title area drawn.

- "dialog" property is a dialog content of itself with pads, profiles for every pad and some interface elements for each
  profile. Pads, profiles and elements are arbitrary. See 'Database configuration' dialog with pads and its profiles as
  an example. Each interface element must have at least 'type' property to be identified, so elements with unknown type
  are ignored. Interface element format:
    type: select. Dropdown list with one possible option to select
	  multiple. Dropdown list with more than one possible options to select
	  radio|checkbox. HTML input tag with radio or checkbox type. Selects one or multiple options respectively.
	  textarea. Multiple lines text input.
	  text. Single line text input.
	  password. Single line hidden text input.
	  table. Classic table with some text data, see "data" property.
    head: title/header text that is displayed as an interface element header.
    help: hint text that is displayed on a question mark button click at the end of a header text.
    data: initial data for interface element at dialog box initialization or changed dialog data after apply to return
	  to the handler.
	  For text-input element types "data" is an arbitrary text,
	  for 'select' types - options separated by '|' with selected option marked by '+' ("option1|+option2|option3|"),
	  for 'table' element type 'data' property is a JSON with properties as table rows. Each row property is a JSON
	       with properties as table cells. Each cell, in turn,  is a JSON with three properties:
		    value (cell text),
		    style (css style for the current html <td> tag) and
		    call (this property set calls initiated handler with changed dialog data and flags.event set to JSON
			 cell property name). See 'simple calculator' php code in a 'Examples' help section.
    line: this property set draws dividing shadowed line at the bootom of interface element area.
    readonly: this property set makes element to be read only.

- "buttons" is a JSON that describes box content apply/cancel actions via button list: one property - one button.
  Button property name is button id that is passed in a flags.event property (see flags description below) from client
  side to the handler to identify pushed button.
  Button property value is a JSON that describes button behaviour with next properties (all are optional):
    value: button text in dialog interface.
    call: this property set makes the controller to call the handler with changed dialog data on a button click event.
	  So the handler can process changed dialog data - controller command 'CONFIRMDIALOG' is sent to the initiated
	  handler. Buttons with non-existent 'call'/'timer' properties just remove dialog with no actions,
	  cancel button for a example.
    timer: box content apply timer in msec, min value is 500 msec, max - 36000000 msec (10 hours).
	   Controller command 'CONFIRMDIALOG' is sent to the initiated handler automatically after the timer has been
	   exceeded. Useful for automatic refresh (ie handler call) of the dialog box content.
    enterkey: this property set makes any one-line input interface element ('text' or 'password' type) emulate
	      button click on enter key push. In other words: enter key push on any one-line input element "clicks" the
	      button with 'enterkey' property set. Only one button can have 'enterkey' property set.
    interactive: this property set keeps dialog box active after button click event. For buttons with 'call' property only.
		 No 'call' buttons click event removes dialog anyway.
    error: message to be displayed as an error text in a 'View' main field area. For buttons with no 'call' property only.
    warning: message in warning dialog box. For buttons with no 'call' property only.

- "flags" is a JSON with some properties to style dialog box (all are optional):
    style: dialog box content html style attribute for the content wrapper div.
    pad: active (current selected) dialog box pad name that is set at the dialog box open.
    profile: active (current selected) dialog box profile name that is set at the dialog box open.
    showpad: pad navigation bar (for one single pad exist) is hidden for default, to display it - just set this
	     "showpad" property.
    profilehead: JSON with pad names as a property names which values are set as a header text (title) for specified pad
		 profile selection. Header text is displayed at the top of the pad content area above profile selection.
		 Used to describe pad and/or its profiles and allows to display profile selection interface element with
		 one single option (profile). In case of two or more profiles - it is displayed anyway.
    event: dialog apply event (clicked button or table cell identificator) to pass back to the handler to process changed
	   dialog content data. Property is set automatically.
    updateonly: dialog box update flag. Set it to indicate client side to only update existing dialog and don't create if
		it doesn't exist. Useful for autorefresh dialogs (see 'timer' button property) to exit properly - after
		dialog box exit (for a example via ESC button) client side ignores dialog box updating that was requested
		(via timer button) before exit.`
}},

"Examples": { profile: { type: 'text', head:
`Example 1 - simple corporate chat.
First step - create database with two elements (eid1 for chat message text and eid2 for channel/chat id, see below) with
'Table' templated view.

Second - in context of our example the database view is a channel that should be accessible for its subscribers only,
so channel (view) should select objects (chat messages) based on view id of eid2 element via next object selection:
WHERE lastversion=1 AND version!=0 AND JSON_UNQUOTE(JSON_EXTRACT(eid2, '$.value'))='<current view id>'

Third - 'Element layout' should display messages in descending order with old messages on the top and new object (new message input)
on the bottom, plus some cell spacing and cell highlighting. Input next JSONs in element layout field:
{"style":"width: 96%; table-layout: fixed; margin: 10px; border-collapse: separate;", "cellspacing":"15"}
{"eid":"1", "oid":"*", "x":"0", "y":"n", "style":"text-align: left; border: none; border-radius: 5px; background-color: #DDD;"}
{"eid":"1", "oid":"${NEWVIRTUALROWID}", "x":"0", "y":"q", "event":"", "style":"width: 100%; text-align: left; border-radius: 7px;"}
{"eid":"1", "oid":"${NEWVIRTUALROWID}", "style": "background-color: transparent; border: 2px solid #d1d8df;"}

First JSON describes HTML tag <table> attributes (unset 'oid' case, see 'Element layout' help section): table-layout attribue is a
necessary condition to allow table cells fixed width. Border-collapse separate value set allows cell spacing of 15 pixels between
chat messages.
Second JSON describes all chat messages (all objects in object selection [oid=0] for element id 1 [eid=1]). All these cells are
styled via 'style' property with left text align, rounded border (5px) and light grey background color (#DDD). Object element
horizontal position is 'x=0' (first column) and vertical is 'n' - sequence number in a selection - first object (first message)
is placed in a fist row (n=0), second object in a second row (n=1) and so on. Variable 'q' is an object selection count number,
so 'input' object (third JSON for a new message input [oid=1]) goes to row number 'q'. For example - ten chat messages layout
is first 10 rows (0-9) for messages and next row number 10 (eleventh row) for new message input (3rd and 4th JSONs). To highlight
new message input field you may input last JSON to set transparent background color and 2px width grey border (2px solid #d1d8df).

Next step - chat database consists of eid1 element for chat messages, so create it in a 'Element' tab of 'Database configuration'
dialog - just enter next handler command line for INIT event to process new chat messages (some input args are moved to a new
line to fit the page):
php _.php SET
<span><</span>span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">
<user>@
<{"ODid":"1", "OVid":"1", "object":"lastversion=1 and version!=0 and JSON_EXTRACT(eid1, '$.value')=':user'", "element":"2"}>
<span><</span>/span>
' '
<span><</span>span style="color: #999;"><datetime><span><</span>/span><br>
<data>

Script '_.php' is a regular application handler for text and other operations, its behaviour and input args are described in
a 'Handlers' help section. First input arg (SET) is for setting element text data of all remaining input args concatenated
to one string. As it was mentioned in a 'Handler' help section - every angle brackets quoted string is parsed for JSON or service
strings such as <user>, <datetime>, <data> and others. String <user> is replaced by the username the handler is called from,
in our chat context - the user the message is posted by. Next arg is user first/last name as it is in OD 'Users' (ODid=1)
and OV 'All users' (OVid=1). This arg is retrieved via JSON that searches user object ("object" property) and takes its second 
element ("element" property) - first/last name. Retrieved construction (user@firstname) is styled by span tag: deep blue color
(RGB(44,72,131) and bold font. After user@firstname - single space (' ') and light grey color styled datetime (<datetime>).
Then - user chat message text of itself (<data>) on the next line (<br>).

Next element eid2 identifies channel id via view id that is set at 'INIT' event by next handler command line:
php _.php SET <ovid>
Therefore OV selects (displays) only channel messages via eid2 element value, but it's not enough - the view should be accessible
for channel subscribers only, so view restrictions for read/write operations must be set for private memebers (users) only.

Last step - some chat restrictions for message removal and empty messages. See 'Database Configuration' rule section help.
Create rule profile for 'DELETE' event with 'reject' action and query rule 'SELECT 1' to match any object delete, so any message
delete operation will be blocked due to 'reject' action. To allow user to delete only his own messages input next
query: SELECT id FROM :odtable WHERE owner!=':user' AND id=':oid'
Second rule profile is a little bit more complicated - 'Add operation' with 'reject' action and next query rule:
SELECT id FROM :odtable WHERE id=:oid AND JSON_UNQUOTE(JSON_EXTRACT(eid1, '$.value')) NOT REGEXP '\\\\n.'
Empty message in our chat is 'user@name datetime\\\\n' (due to <br>), minimal non empty message - 'user@name datetime\\\\n.',
where '.' matches any char. To identify empty messages - match all except '\\\\n.', in other words, message text shouldn't match
regular expression (NOT REGEXP) string '\\\\n.'. Since the chat message (JSON_UNQUOTE(JSON_EXTRACT(eid1, '$.value'))) matches
empty message - the rule profile blocks (rejects) the operation (new message post in our case).

That's all. As a result we have a nice chat with no much efforts for customization!

**************************************************

Example 2 - host alive diagnostic.
Create database with two elements - one for host names or ip addresses, second for ping result of appropriate hosts in 1st
element. To input element id 1 text data (host/ip) add some handlers for 'DOUBLECLICK' event to edit content: php _.php EDIT,
for 'CONFIRM' event to confirm content after edit fininshed: php _.php SET <data>, and may be for 'KeyDelete' event to clear
text: php _.php SET.

To check continuously element id 1 hosts via ping utility create SCHEDULE event with one command instruction:
*/10 * * * * 1 1 ping -c 1 <{"element":"1"}> | grep loss
First field (*/10) and next four asterisks makes scheduler execute specified handler (ping .. grep loss)
for the current element every ten minutes for the view id 1 and queue=1 (one by one pings run). Ping utiltiy sends one icmp
request packet (-c 1) to retrieved hostname/ip (JSON <{"element":"1"}>) and output 'loss' result to stdout. Non JSON handler
output result is automatically converted to be set as an element value, so ping loss results will be displayed in a table
every 10 minutes.
To check hosts on demand - set handler 'ping -c 1 <{"element":"1"}>' for 'CHANGE' event for element id2. The handler will be
called every time element id 1 data (host/ip) is changed.

**************************************************

Example 3 - Group users list. Each user group-membership is stored in system 'Users' database (ODid=1, OVid=1) in property
'groups' of 1st element 'User' (eid1). The property consists of group names (one per line), so we have to search specified
group name among all users and output the result.

Use qouted JSON argument in a handler command line (see 'Handlers' help section for details) for element to retrieve users
of the group specified, for a example, in the current element value (":group": {}) or explicitly (":group": "wheel"):
php _.php SET <{"ODid":"1", "OVid":"1","object":"lastversion=1 and version!=0 and (JSON_UNQUOTE(JSON_EXTRACT(eid1, '$.groups'))
regexp '^:group\\\\n' OR JSON_UNQUOTE(JSON_EXTRACT(eid1, '$.groups')) regexp '\\\\n:group\\\\n')", "limit": "100","element":"1",":group": {}}>

Property "object" is a SQL 'WHERE' operator expression to select 1st element ("element":"1") 'value' property (username).
First condition (regexp '^:group\\\\n') matches first line group names, second condition (regexp '\\\\n:group\\\\n')) -
all other group names from the second line with the symbol LINE FEED (\\n) before. Double slash escapes single slash for the correct
line feed char. Request result is limited to 100 records.

**************************************************

Example 4 - style element cell. Set next event handler to paint cell by red color (for *nix OS only):
echo '{"cmd":"SET", "style":"background-color:red;"}'

**************************************************

Example 5 - dialog box simple calculator. First create database and any view with default properties.
Then create one element with the handler (without args) for DOUBLECLICK event: 'php calc.php', and for CONFIRMDIALOG event:
'php calc.php <event> <data>' - 1st arg is event name ('CONFIRMDIALOG'), 2nd is dialog data structure called back on
calculator table click.

Here is calc.php code:

1 <?php
2
3 $calc = ['1' => ['11' => ['value'=>'7', 'call'=>''], '12' => ['value'=>'8', 'call'=>''], '13' => ['value'=>'9', 'call'=>''],
4	   	   '14' => ['value'=>'/', 'call'=>''], '15' => ['value'=>'C', 'call'=>'']
5		  ],
6	   '2' => ['21' => ['value'=>'4', 'call'=>''], '22' => ['value'=>'5', 'call'=>''], '23' => ['value'=>'6', 'call'=>''],
7		   '24' => ['value'=>'*', 'call'=>''], '25' => ['value'=>'<', 'call'=>'']
8		  ],
9	   '3' => ['31' => ['value'=>'1', 'call'=>''], '32' => ['value'=>'2', 'call'=>''], '33' => ['value'=>'3', 'call'=>''],
10		   '34' => ['value'=>'-', 'call'=>''], '35' => ['value'=>'']
11		  ],
12	   '4' => ['41' => ['value'=>''], '42' => ['value'=>'0', 'call'=>''], '43' => ['value'=>'.', 'call'=>''],
13		   '44' => ['value'=>'+', 'call'=>''], '45' => ['value'=>'=', 'call'=>'']
14		  ],
15	  ];
16 $dialog = ['title' => 'Calculator',
17	      'dialog' => ['pad' => ['profile' => ['element' => ['head' => ' ', 'type' => 'table', 'data' => $calc]]]],
18	      'buttons' => [ 'EXIT' => ['value' => 'EXIT', 'style' => 'background-color: red;']],
19	      'flags'  => ['style' => 'width: 250px; height: 200px; margin: 20px;']
20	     ];
21
22 if (!isset($_SERVER['argv'][1]) || $_SERVER['argv'][1] !== 'CONFIRMDIALOG')
23    {
24     echo json_encode(['cmd' => 'DIALOG', 'data' => $dialog]);
25     exit;
26    }
27 if (!isset($_SERVER['argv'][2])) exit;
28 if (gettype($dialog = json_decode($_SERVER['argv'][2], true)) != 'array') exit;
29 if (!isset($dialog['flags']['event'])) exit;
30
31 $key = $dialog['flags']['event'];
32 $value = $calc[$key[0]][$key]['value'];
33 switch ($value)
34 {
35  case '<':
36	 $dialog['dialog']['pad']['profile']['element']['head'] = substr($dialog['dialog']['pad']['profile']['element']['head'], 0, -1);
37	 break;
38  case 'C':
39	 $dialog['dialog']['pad']['profile']['element']['head'] = '';
40	 break;
41  case '=':
42	 $result = $dialog['dialog']['pad']['profile']['element']['head'];
43	 $dialog['dialog']['pad']['profile']['element']['head'] = strval(eval('return '.$result.';'));
44	 break;
45  default:
46	 $dialog['dialog']['pad']['profile']['element']['head'] .= $value;
47 }
48
49 if ($dialog['dialog']['pad']['profile']['element']['head'] === '') $dialog['dialog']['pad']['profile']['element']['head'] = ' ';
50 echo json_encode(['cmd' => 'DIALOG', 'data' => $dialog]);


Lines 3-15. Create calculator table via 5x4 array in $calc var:
	     --- --- --- --- ---
	    | 7 | 8 | 9 | / | C |
	     --- --- --- --- ---
	    | 4 | 5 | 6 | * | < |
	     --- --- --- --- ---
	    | 1 | 2 | 3 | - |   |
	     --- --- --- --- ---
	    |   | 0 | , | + | = |
	     --- --- --- --- ---
	    Each array key is a table event that is passed in a dialog data flags.
	    Array elements without 'call' key are empty and do not initiate handler call.

Lines 16-20. Initial dialog structure array to pass to the controller via 'DIALOG' command (line 50).
	     See 'Handlers' help section for dialog fromat.

Lines 22-26. No script args exist or arg is not 'CONFIRMDIALOG'? Pass initial dialog.

Lines 27-29. First arg is 'CONFIRMDIALOG', so decode the arg to the dialog array and check correctness.

Line 31. Store table user click (table array $calc key) in $key var.

Line 32. Store clicked value in $value var.

Lines 33-47. Parse table array key value.  For backspace ('<') cut last expression char. For clear button ('C') empty the
	     expression. For calculation (=) evaluate expession strored in a table header. For other chars ('1', '2'..) -
	     concatenation with current expression is made.

Line 49. Empty headers ('') are not displayed before interface element, so set one space char for empty expression to be
	 displayed before calculator table.

Line 50. Pass dialog to the controller.`
}},

"Keyboard/Mouse": { profile: { type: 'text', head:
`  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Home</span> moves cursor to the top of a table
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">End</span> moves cursor to the bottom
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">PageUp</span> moves cursor one page down
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">PageDown</span> moves cursor one page up
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;"><, >, ^, v</span> arrow keys move cursor to appropriate direction
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Enter + [Shift]</span> moves cursor down [up]
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Enter + [Shift|Ctrl|Alt]</span> applies content changes in content-editable mode. Key combination depends on user
    cusomization 'application' property. New-object input content 'apply' creates new object
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">ScrollLock on</span> scrolls the entire table instead of cursor moving
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Alt + ^|v</span> previous|next object cursor navigation
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Ctrl + Shift + <|></span> previous|next view navigation
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Ctrl + C|INS</span> copies element formatted text to the clipboard
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Ctrl + V or Shift + INS</span> generates 'PASTE' event on table cell element, see 'Handlers' help section for details
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Ctrl + Shift + F</span> regular expression search, see search dialog hint for the brief regexp syntax
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Ctrl + right button single click</span> on any http page DOM element opens new browser tab with element inner text as an url
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Ctrl + A</span> selects entire table area
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Shift + <|>|^|v|Home|End|PageUp|PageDown</span> selects appropriate table area
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">ESC</span> cancels all changes and exits content editable mode or dialog box with no changes
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">INS, DEL, F1-F12, symbol chars or space</span> generate cursor element appropriate keyboard events
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Left button mouse double click</span> generates cursor element DOUBLECLICK event
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Mouse right button click</span> calls sidebar, main field or table area appropriate context menu
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Mouse 'Copy' context menu</span> copies element clear text to the clipboard
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Mouse over</span> event on any element for some time (default 1 sec) displays appropriate hint message if exist
  - <span style="color: RGB(44,72,131); font-weight: bolder; font-size: larger;">Mouse drag</span> operation on table cell selects and highlight table area. Selected area then can be processed to draw
    the chart via appropriate context menu. Two or more columns width area draws a piechart with an area top row as a
    pie names and its per-column summarized values as a percent of a total amount. To use selected area column for the
    pie names - area should be one column width, for the pie persentage - per row values of the next (non-selected)
    column are used.

Note that usual do/undo actions (Ctrl+y|z) are not implemented, cause of impossible multiuser database actions rollback.
To see user object database changes use object versions (instances) history via appropriate 'object selection' mechanism.
Row/column resizing operation like in 'excel' are not implemented also, use element layout (see appropriate help section)
properties to set initial table column width. By default, table column width are adjusted to fit the content.`
}}
}}};
