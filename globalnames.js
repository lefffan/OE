const DATABASEPAD = { settings: { type: 'select', head: 'Select object database settings', data: {
                      General: {
                                dbname: { type: 'text', data: '', flag: '+Enter new database name', head: `Database name~Enter database name full path in next format: folder1/../folderN/dbname. Folders are optional and created automatically in a sidebar db hierarchy. Leading slash is not necessary, last slash divided name is always treated as an object database name, others before - as a folders. Empty folders are ignored` }, 
                                description: { type: 'textarea', data: '', head: 'Database description' },
                                history: { type: 'checkbox', data: 'Keep object versions~!', head: 'Database object history', flag: '*' }, }, 
                      Permissions: {
                                od: { type: 'textarea', data: '', head: `Restrict this 'Object Database' read configuraion for next user/group list~User/group list is a list of users (or groups) one by line (empty lines are ignored). Specified restriction (so all below) is applied for the user that matches the list. No match - no restriction applied. Prefix '!' inverts the value, so string '!support' matches all user names, except 'support'. For the list to match all users use '!' single char. Empty list matches no user. Note that user 'root' is a super user with no any restrictions applied regardless of any lists, so good practice is to use that super user account for recovery purposes only` },
                                Database: { type: 'textarea', data: '', head: `Restrict this dialog 'Database' section modify for next user/group list` },
                                Element: { type: 'textarea', data: '', head: `Restrict this dialog 'Element' section modify for next user/group list` },
                                View: { type: 'textarea', data: '', head: `Restrict this dialog 'View' section modify for next user/group list` },
                                Rule: { type: 'textarea', data: '', head: `Restrict this dialog 'Rule' section modify for next user/group list`, flag: '*' }, },
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
                           description: { type: 'textarea', head: `Description~Describe here view purpose and its usage`, data: '', flag: '*' },
                           hide: { type: 'checkbox', head: `Hide from sidebar~The option keeps unnecessary views off sidebar. Hidden views may be called to open from event handlers or shortcut keys yet`, data: 'Hide' },
                           shortcut: { type: 'select', head: `Shortcut key~Select key combination to open the view in a new window. For sidebar focus only`, data: 'None/ALT+SHIFT+KeyA/ALT+SHIFT+KeyB/ALT+SHIFT+KeyC/ALT+SHIFT+KeyD/ALT+SHIFT+KeyE/ALT+SHIFT+KeyF/ALT+SHIFT+KeyG/ALT+SHIFT+KeyH/ALT+SHIFT+KeyI/ALT+SHIFT+KeyJ/ALT+SHIFT+KeyK/ALT+SHIFT+KeyL/ALT+SHIFT+KeyM/ALT+SHIFT+KeyN/ALT+SHIFT+KeyO/ALT+SHIFT+KeyP/ALT+SHIFT+KeyQ/ALT+SHIFT+KeyR/ALT+SHIFT+KeyS/ALT+SHIFT+KeyT/ALT+SHIFT+KeyU/ALT+SHIFT+KeyV/ALT+SHIFT+KeyW/ALT+SHIFT+KeyX/ALT+SHIFT+KeyY/ALT+SHIFT+KeyZ' },
                           refresh: { type: 'text', head: 'Auto refresh interval', data: '', flag: '*' }, }, 
                 Selection: {
                           select: { type: 'text', head: 'SELECT~Columns/expressions to select from OD (see FROM statement below). Built automatically from element layout. See appropriate help section for details', data: '', flag: '!' },
                           from: { type: 'select', head: 'FROM', data: 'Interactive actual data~!/Actual data/Interactive historical data/Historical data/Time series data/None' },
                           where: { type: 'textarea', head: 'WHERE', data: '' }, 
                           groupby: { type: 'textarea', head: 'GROUP BY, HAVING', data: '', e_xpr: '/Interactive actual data~!|Interactive historical data~!/from' },
                           limit: { type: 'textarea', head: 'ORDER BY, LIMIT, OFFSET, FETCH', data: '', flag: '*' },
                           linkname: { type: 'text', head: 'Object selection link name', data: '' }, }, 
                 Argumnets: {
                           autoset: { type: 'checkbox', data: 'Auto', head: `Macros definition dialog~This 'View' layout/selection and rule message/query text settings containing macroses may be (re)defined by the user via dialog that is called at client side, allowing the user to define macros values manually before 'View' opening. Manually define dialog structure JSON in text area below or set it to 'Auto' for the dialog to be created automatically with input fields for all undefined macroses. Empty/error dialog structure with no 'Auto' option set (or no any macroses with 'Auto' set) - no dialog is called. Any valid dialog structure with no 'Auto' set is called anyway regardless of macroses in text settings and may be used as an info/warning message for the user before 'View' opening` },
                           dialog: { type: 'textarea', head: ``, data: '', flag: '*' }, }, 
                 Layout: {
                           template: { type: 'radio', head: `Template~Select object view template for the form the OV data is displayed. 'Table' template displays objects with its elements in a form of a table. Template 'Tree' displays the tree of objects acting as a nodes connected with each other via 'link' element property (for JSON type elements only). And 'Map' template places objects on geographic map based on their elements with 'geo' property (for JSON type elements only)`, data: 'Table~!/Tree/Map' },
                           layout: { type: 'textarea', head: `Layout~As template defines the form objects are displayed, layout defines what elements should be displayed and how for the selected template above. Element layout is a JSON list and should contain at least one valid JSON to display any data at all, see appropriate help section for details`, data: '', flag: '*' }, },
                 Appearance: {
                           a: { type: 'checkbox', data: 'Open in a new window~Option forces OV to be displayed in a new window' },
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
                           SETDATABASE: { type: 'button', data: 'CREATE DATABASE', flag: 'a', expr: '/^$/dbname' },
                           cancel: { style: 'background: rgb(227,125,87);', type: 'button', data: 'CANCEL', flag: '++++++++++' },
                          };

const EDITABLE              = 'plaintext-only';
const NOTEDITABLE           = 'false';
const CELLMINWIDTH          = 25;
const CELLMINHEIGHT         = 25;
const DIALOGBOXMACROSSTYLE	= { SIDE_MARGIN: '10px', ELEMENT_MARGIN: '10px', HEADER_MARGIN: '5px', TITLE_PADDING: '5px', BUTTON_PADDING: '10px', FONT: 'Lato, Helvetica' };
const ANIMATIONS			= ['hotnews', 'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall', 'rise'];
const CUSTOMIZATIONS        =
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
                    ".element-headers": { "margin": `${DIALOGBOXMACROSSTYLE.HEADER_MARGIN};`, "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "#555;", "text-shadow": "none;" },
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
 "Drop down list": {
			        // Expanded selection
				    ".expanded": { "display": "block;", "margin": "0 !important;", "padding": "0 !important;", "position": "absolute;", "overflow-y": "auto !important;", "overflow-x": "hidden !important;", "max-height": "500px !important;" },
 				   },
    "Application": {
 				    " Appearance animation": { "Dialog box": "slideleft", " Dialog box": `Select interface elements (dialog box, context menu and others below) appearance animation such as ${ANIMATIONS.join(', ')}. Any other values - no animation is applied`, "Drop down list": "rise", "Context menu": "rise", "New connection": "", "New view": "" },
				    ".modalfilter": { "filter": "opacity(50%);", " filter": "Dialog box modal effect appearance via css filter property (such as opacity, blur and others), see appropriate css documentaion." },
				    "::-webkit-scrollbar": { "width": "8px;", "height": "8px;", "cursor": "pointer !important;" },
                    "Force to use other user customization settings": { "Username": "" }, 
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
                    ".interactivecursorcell":      { "outline": "#1b74e9 solid 1px;", "outline-offset": "-2px;", "box-shadow": "", "border": "" }, 
                    ".clipboardcell":              { "outline-style": "dashed;" }, 
		            ".selectedcell":               { "background-color": "rgb(189,200,203) !important;" },
                    ".defaultcell":                { "margin-top": "-1px;", "margin-left": "-1px;", "box-sizing": "border-box;", "min-width": `${CELLMINWIDTH}px;`, "min-height": `${CELLMINHEIGHT}px;` },
		            [`.ovbox table tbody tr td:not([contenteditable=${EDITABLE}])`]:   { "cursor": "cell;" },
                }
};

export const CUSTOMIZATIONDIALOG = { section: { type: 'select', head: 'Select customization section', data: {} },
                                     title: { type: 'title', data: 'Customization' },
                                     ok: { type: 'button', data: '  OK  ', style: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;`, flag: 'a' },
                                     cancel: { type: 'button', data: 'CANCEL', style: `border: 1px solid rgb(227,125,87); color: rgb(227,125,87); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;` }
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

const OPTIONSDIVIDER              = '/';
const CLIENTEVENTS                = ['INIT', 'DELETE', 'CONFIRMEDIT', 'CONFIRMDIALOG', 'ONCHANGE', 'PASTE', 'RELOAD', 'SCHEDULE', 'DOUBLECLICK', 'KEYPRESS', 'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ', 'Key0', 'Key1', 'Key2', 'Key3', 'Key4', 'Key5', 'Key6', 'Key7', 'Key8', 'Key9', 'KeyF1', 'KeyF2', 'KeyF3', 'KeyF4', 'KeyF5', 'KeyF6', 'KeyF7', 'KeyF8', 'KeyF9', 'KeyF10', 'KeyF11', 'KeyF12', 'KeySpace', 'KeyInsert', 'KeyDelete', 'KeyBracketLeft', 'KeyBracketRight'];
const handlerprofile              = {
                                     type: { type: 'radio', head: 'Select handler type', data: 'Command line/Custom stdout/Module/None~!', expr: '//' },
                                     data: { type: 'textarea', head: 'Enter data for specified handler type above', data: '', expr: '/None~!/type' },
                                     output: { type: 'checkbox', head: 'Process next handler output only', data: 'correct JSON (stdout)~!/any output (stdout)/stderr/undefined', expr: '/None~!/type', flag: '!' },
                                     action: { type: 'radio', head: 'Handler output action', data: 'Apply~!/Message/Ignore/Redirect to next step', flag: '*', expr: '/None~!/type' },
                                     timeout: { type: 'text', head: `Handler timeout~Timeout, in seconds, for the controller to wait the handler to response. For incorrect/undefined string a default value of 30 sec is used. The setting is applied for 'Command line' or 'Module' handler types only`, data: '30', expr: '/None~!/type' },
                                     retry: { type: 'text', head: `Retries~Handler restart attempts on timeout. For incorrect/undefined string a zero value (0 retries) is used: the handler is not restarted after timeout. The setting is applied for 'Command line' or 'Module' handler types only`, data: '0', expr: '/None~!/type' },
                                    };
const eventtemplate               = {
                                     events: { type: 'select', head: 'Select event', data: `NONE${OPTIONSDIVIDER}` + CLIENTEVENTS.join(OPTIONSDIVIDER) },
                                     modifier: { type: 'checkbox', head: 'Select modifier keys~For mouse and keyboard events only. Note that some events (Ctrl+KeyA, Ctrl+KeyC, KeyF1 and others) are reserved by client app (browser) for its default behaviour, so may never occur', data: 'Ctrl/Alt/Shift/Meta', flag: '*' },
                                     step1: { type: 'select', head: 'Select a handler output data redirection step', data: { 'Step1': handlerprofile } } 
                                    };
const eventlistprofiletemplate    = { 10: { type: 'select', head: 'Select event profile', data: { 'New event profile template~+': eventtemplate }, flag: '*' } };
export const EVENTPROFILINGDIALOG = { title: { type: 'title', data: 'Event profiling' },
                                      eventprofiles: { type: 'select', head: 'Select event list profile', data: { 'New event list profile template~+': eventlistprofiletemplate } },
                                      ok: { type: 'button', data: '  OK  ', style: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;`, flag: 'a' },
                                      cancel: { type: 'button', data: 'CANCEL', style: `border: 1px solid rgb(227,125,87); color: rgb(227,125,87); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;` }
                                    };
