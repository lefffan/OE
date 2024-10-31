// Todo0 - TimeScaleDB
//			https://github.com/timescale/timescaledb/blob/main/tsl/README.md
//			https://docs.timescale.com/self-hosted/latest/install/installation-windows/
//			https://www.timescale.com
// Todo2 - setTimeout for inactive pad: https://stackoverflow.com/questions/6032429/chrome-timeouts-interval-suspended-in-background-tabs
// Todo2 - JS tutorial

/*
            'element3' => ['type' => 'radio', 'head' => 'Template', 'data' => '+Table|Tree|Map|', 'help' => "Select object view type from 'table' (displays objects in a form of a table),<br>'scheme' (displays object hierarchy built on object selection link name),<br>'map' (displays objects on the geographic map)"],

            'element4' => ['type' => 'textarea', 'head' => 'Object selection', 'help' => 'Object selection is a part of the sql query string, that selects objects for the view.<br>Empty string selection - all objects, error selection - no objects.<br>See appropriate help section for details.', 'data' => ''],
            'element5' => ['type' => 'text', 'label' => 'Link name', 'data' => '', 'line' => ''],

            'element6' => ['type' => 'textarea', 'head' => 'Element layout', 'data' => '', 'line' => '', 'help' => 'Element layout defines what elements should be displayed and how for the selected template.<br>Empty layout is a default behaviour, see appropriate help section for details.'],

            'element8' => ['type' => 'radio', 'data' => "User/group list allowed to read this view|+Disallowed list (allowed for others)|"],
            'element9' => ['type' => 'textarea', 'data' => ''],
            'element10' => ['type' => 'radio', 'data' => "User/group list allowed to change this view objects|+Disallowed list (allowed for others)|"],
            'element11' => ['type' => 'textarea', 'data' => '']
           ];

 $newRule        = ['element1' => ['type' => 'text', 'head' => 'Name', 'data' => '', 'help' => "Rule profile name. It may be changed, but if a new profile name already exists, changes are not applied.<br>So name 'New rule' cannot be set as it is used as an option to create new rules.<br>Empty profile name of existing rule removes it after dialog apply."],
            'element2' => ['type' => 'textarea', 'head' => 'Rule message', 'data' => '', 'line' => '', 'help' => "Rule message is a match case message displayed at client side dialog box and optionally saved in 'Logs' OD.<br>For non-empty messages only."],
            'element3' => ['type' => 'select-one', 'head' => 'Rule action', 'data' => '+Accept|Reject|', 'line' => '', 'help' => "'Accept' action agrees matched event below, 'Reject' action cancels it"],
            'element4' => ['type' => 'textarea', 'head' => 'Rule event list', 'data' => '', 'help' => "Event list, each on a new line and at the start.<br>Keyboard and mouse events may be combined with modifier keys CTRL, ALT, SHIFT and META separated by spaces.<br>Event line example 'KeyG CTRL' matches keyboard event for the key 'g' down together with CTRL."],
            'element5' => ['type' => 'textarea', 'head' => 'Rule query', 'data' => '', 'help' => "Every controller inbound event is passed to the rule analyzer to test on all rule profiles in alphabetical order<br>until the match for both event and query is found. Rule query is a list of SQL query strings (one by line).<br>Non-empty and non-zero result of all query strings - match case; any empty, error or zero char '0' result - no match.<br>When a match is found, the action corresponding to the matching rule profile is performed, no any match -<br>default action 'accept' is applied."],
            'element6' => ['type' => 'checkbox', 'data' => 'Log rule message|', 'line' => '', 'help' => '']
*/


const DBCONFDIALOGHINTELEMENTHANDLERMODE = `JSON handler output is treated depending on its "cmd" property. 
In case of non JSON output - the data is automatically wraped (default mode) to the JSON "SET" handler command: 
{"cmd": "SET", "value": "<non JSON handler output>"}. 
Handler output handle in dialog mode has the same behaviour, but non JSON output is displayed as a text at client side alert box, 
while debug mode displays all output data (JSON and non JSON) plus event info and command line string 
as a client side alert text only. Note that handler output for "DELETE" event is ignored in any mode.`;

const DBCONFDIALOGHINTELEMENTHANDLEREVENT = `Choose event the handler is called on (via command line below). 
For the mouse and keyboards events select Ctrl|Alt|Shift|Meta modifier keys. 
Note that some events (Ctrl+KeyA, Ctrl+KeyC, KeyF1 and others) are reserved for service purposes 
and do not cancel default client side (browser) behaviour, so may never occur.`;

const DBCONFDIALOGHINTELEMENTHANDLERCMD = `Input handler command line to add specified above event processing. 
Set command line text area empty at needed event to remove it.`;

DBCONFDIALOGHINTVIEWNAME = `View name can be changed, but if renamed view name already exists, changes are not applied. 
So name 'New view' cannot be set as it is used as an option to create new views. 
Empty view name removes the view. 
In addition, symbol '_' as a first character in a view name string keeps unnecessary views off sidebar, 
so they can be called from element handlers only. It doesn't affect to the view access rights.`;

const DBCONFDIALOGHINTVIEWDESCRIPTION = `Describe here view purpose and usage.`;

const DBCONFDIALOGHINTVIEWTEMPLATE = `Select view template 
'Table' (table with object and its elements in), 
'Tree' (tree chart with objects as a nodes connected with each other via 'link' element property) 
or 'Map' (objects are placed on the map via 'geo' element property)`;

const CLIENTEVENTS = ['INIT', 'DELETE', 'CONFIRM', 'CONFIRMDIALOG', 'CHANGE', 'PASTE', 'RELOAD', 'SCHEDULE', 'DOUBLECLICK', 'KEYPRESS', 'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ', 'Key0', 'Key1', 'Key2', 'Key3', 'Key4', 'Key5', 'Key6', 'Key7', 'Key8', 'Key9', 'KeyF1', 'KeyF2', 'KeyF3', 'KeyF4', 'KeyF5', 'KeyF6', 'KeyF7', 'KeyF8', 'KeyF9', 'KeyF10', 'KeyF11', 'KeyF12', 'KeySpace', 'KeyInsert', 'KeyDelete', 'KeyBracketLeft', 'KeyBracketRight'];
const pizda = `Specified handler profile will be used for any database element
(see 'Element pad' pad) for all defined client events as a default one (in case of no any other hanlder exist)`;

const testdata = {
		  10: { type: 'title', path: 'Database', data: 'New Database Configuration' },
		  11: { type: 'text', path: 'Database', head: 'Database name', data: '', flag: '%Enter new database name', hint: `Enter new database name full path in next format: folder1/../folderN/dbname. 
Folders are optional and created automatically in a sidebar db hierarchy. Leading slash is not necessary, last seprated name is always treated as a database name, others before - as a folders. Empty folders are ignored.` },
/**/		  12: { type: 'select', path: 'Database', head: 'Default event profile for all database elements', data: 'None/Content editable/Chat', flag: '*', hint: `Specified event profile will be applied to any database 
element for all defined client events as a default one` },

		  13: { type: 'textarea', head: 'Macros value', hint: '', data: '', path: `Database/New macros|+%Enter new macros name|Macros list|Database macros list is an optional list of some text data associated with the specified macros. 
Each one may be used both for informative purposes and for any constant definition. You may use these constants in any database configuration settings via js style quoted expression \${<macros name>}. 
For a example, macros name 'Description' may have some text that describes some useful database info` },
		  14: { type: 'textarea', path: 'Database/New macros', data: '', head: 'Macros description', flag: '*' },

		  16: { type: 'text', path: 'Database/New path|!+%Enter new path name|Path list', head: 'Database configuration structure profile path', hint: `Each application dialog has its JSON format structure, 
so this database configuration dialog JSON can be splited to interface elements	(each json property represents dialog interface element, see 'Dialog' help section) 
to apply some restrictions to (via interface element profile path). Example: path </Element> with 'readonly' restriction type for the user '!root' denies any changes in 'Element' pad for all users except root`, data: '' },
		  17: { type: 'radio', path: 'Database/New path|!%Enter new path name', head: 'Restriction type', data: 'hidden/readonly/!writable', flag: '' },
		  18: { type: 'textarea', path: 'Database/New path|!%Enter new path name', head: 'User/group list', hint: `User/group list (one by line) to apply the restriction to. 
Char '!' reverses the result of match, so line '!root' matches all users (or groups) except root. 
Thus to match absolutely all users use '!!' - this record matches all users except user '!', 
but username (or group) '!' is not allowed, so the list match is true for all. 
The list is looked up for the users/groups one by one and when a match is found, 
the restriction type corresponding to the specified path is performed. 
No match - all dialog interface elements of the pad/profile path are writable`, data: '' },

		  20: { type: 'textarea', path: 'Element/id1|+%|Element profile', head: 'Name', hint: `Element name, used as a default element title in object view display`, data: '', flag: '%Enter element name' },
		  21: { type: 'textarea', path: 'Element/id1', head: 'Description', hint: `Element description is displayed as a hint on object view element header navigation for default. Describe here element usage and its possible values`, data: '', flag: '*%Enter element description' },
		  22: { type: 'checkbox', path: 'Element/id1', head: 'Element type', hint: `Unique element type set implies unique 'value' property among all object in database, so duplacated values are exluded. Element type cannot be changed after element creation`, data: 'unique', flag: '*' },
		  23: { type: 'select', path: 'Element/id1', head: 'Element default handler profile', hint: `Specified handler profile is used for all defined client events as a default one in case of no appropriate event defined in custom hanlder profile)`, data: 'None/Content editable/Chat', flag: '' },
		  24: { type: 'select', path: 'Element/id1', head: 'Element custom handler profile', hint: `Specified handler profile is used for all defined client events`, data: 'None/Content editable/Chat', flag: '*' },

		  30: { type: 'select', path: 'Event/New event profile|+-|Event profile list', head: 'Client event', hint: DBCONFDIALOGHINTELEMENTHANDLEREVENT, data: CLIENTEVENTS.join('/') },
		  31: { type: 'checkbox', path: 'Event/New event profile', head: 'Modifier keys', data: 'Ctrl/Alt/Shift/Meta' },
		  32: { type: 'select', path: 'Event/New event profile', head: 'Select event hanlder', hint: DBCONFDIALOGHINTELEMENTHANDLERCMD, data: 'Custom command line/Custom JSON/Predefined handler - Curl/System handler - SNMP', flag: '' },
		  33: { type: 'textarea', path: 'Event/New event profile', data: '', flag: '*' },

		  34: { type: 'radio', path: 'Event/New event profile', head: 'Handler stderr output', data: 'Set/Message/!Ignore' },
		  35: { type: 'checkbox', path: 'Event/New event profile', data: 'Log' },
		  36: { type: 'radio', path: 'Event/New event profile', head: 'Handler stdout output (incorrect JSON cmd)', data: 'Set/Message/!Ignore' },
		  37: { type: 'checkbox', path: 'Event/New event profile', data: 'Log' },
		  38: { type: 'radio', path: 'Event/New event profile', head: 'Handler stdout output (correct JSON cmd)', data: '!Apply/Ignore' },
		  39: { type: 'checkbox', path: 'Event/New event profile', data: 'Log', flag: '*' },

		  40: { type: 'text', path: '!View/id1', head: 'Name', hint: DBCONFDIALOGHINTVIEWNAME, data: '', flag: '+Enter view name' },
		  41: { type: 'textarea', path: 'View/id1', head: 'Description', hint: DBCONFDIALOGHINTVIEWDESCRIPTION, data: '', flag: '*' },
		  42: { type: 'textarea', path: 'View/id1', head: 'Object selection query', hint: '', data: '' },
		  43: { type: 'text', path: 'View/id1', head: 'Object selection prop name', hint: '', data: 'value', },
		  44: { type: 'text', path: 'View/id1', head: 'Object selection prop limit', hint: '', data: 'value', },
		  45: { type: 'text', path: 'View/id1', head: 'Object selection link', hint: '', data: '', },
		  46: { type: 'textarea', path: 'View/id1', head: 'Object selection input args', hint: '', data: '', flag: '*' },
		  47: { type: 'radio', path: 'View/id1', head: 'Template', hint: DBCONFDIALOGHINTVIEWTEMPLATE, data: 'Table/Tree/Map' },
		  48: { type: 'textarea', path: 'View/id1', head: 'Layout', hint: DBCONFDIALOGHINTVIEWTEMPLATE, data: '', flag: '*' },
		  _50: { type: 'button', path: 'Element', data: 'CREATE DATABASE', expr: '/sdd/14', flag: '-+++++++++' }
		 };

// View pad:
//		Name, descrpition
//    	Object selection - query
//					   prop (wich will act instead a default 'value' prop to be displayed in a cell)
//					   chars limit (cut 'value' prop to chars number (incorrect or out of range - 10000 is used))
//					   link name
//					   options dialog (json prop names act as an args to sql query object selection)
//    	Layout - Element layout (don't forget built-in dinamyc macroses [user, *, **..)
//		 	 	 Template type (table tree map)
//	    Appearance profile (in system user props) -	Position (fit sidebar, cascade, random, always on top)
//     											Window size (full screen, fit the view, fix width height; NEW BROWSER PAD for new view in a new pad in read only mode)
//     											Window props (sizeable, fullsceenable, movable, closable, escable)
//     											Behaviour (auto refresh interval) 0/incorrect/undefined - never
//     											Bring to top on event (new data, delete data, change data, every N sec)
//     											Auto open on event (new data, every N sec)
//												Lifetime in sec
//		Permissions

// Element pad 
//		Error output: wrap to set cmd to display error output (or custom text), ignore, dialog +log
//  	JSON with unknown cmd or non JSON plain text (empty or non-empty): wrap to set cmd to display that JSON (or custom text), ignore, dialog +log
//		JSON text with known cmd: Default (execute output), Debug (show output in dialog), ignore (no any action on output) +log


// Const array of super users [root, system] wich are not checked on any permissions

const http = require(`http`);
const fs = require(`fs`);
const ws = require('ws');

const wsclients = {};
let wsclientindex = 0;
const msgtypes= ['newod'];

function lg(...data)
{
 console.log(...data);
}

// Todo  (undefined todo status) - deploy production via nginx reverse proxy (balancier) and other features in youtube channel YfD: https://www.youtube.com/watch?v=77h-_SytDhM
// Todo0 (necessary todo) - responce for necessary js files only!
// Todo0 (necessary todo) - set secure server via https instead of http
// Todo1 (deffered todo)
// Todo2 (questionable todo) - correct server create due to https://ru.stackoverflow.com/questions/1144243/Как-написать-сервер-который-отдаёт-файлы-из-папки

staticdocs = { '/app.js': '/static/app.js', '/connection.js': '/static/connection.js', '/contextmenu.js': '/static/contextmenu.js', '/dialogbox.js': '/static/dialogbox.js', '/' : '/static/index.html', '/interface.js': '/static/interface.js', '/window.js': '/static/window.js' };

http.createServer((req, res) => {
if (req.method === 'GET' && staticdocs[req.url])
   {
 res.writeHeader(200, req.url === '/' ? {'Content-Type': 'text/html'} : {'Content-Type': 'application/javascript'});
 res.write(fs.readFileSync(__dirname + staticdocs[req.url], 'utf8'));
//    res.end(404);
//    return;
   }
 res.end();
}).listen(8001);

const server = http.createServer();
const wss = new ws.Server({ server });
wss.on('connection', WSNewConnection);
server.listen(8002);

function WSMessageProcess(msg)
{
 // msg - incoming message from the client side
 // this - ws connection object for the client the msg comes from, to send data back to client use this.send('...'),
 // this['__index'] is an index in wsclients object that consists of all client data such as username, auth status, login timestamp and etc..

 msg = JSON.parse(msg);
 if (!msg || typeof msg !== 'object' || !msg['type']) return;
 switch (msg['type'])
	{
	 case 'Test Dialog':
	      this.send(JSON.stringify({ type: 'DIALOG', data: testdata }));
	      break;
	 case 'New Database':
	      this.send(JSON.stringify({ type: 'SIDEBARSET', odid: 13, path: '/Система/Users', ov: { 1: ['test/view1a', 'view1b'], 2:['/hui/view2c', 'test/view2d']}}));
	      break;
	}
}

function WSError(err)
{
 console.error(err);
}

function WSNewConnection(client)
{
 client['__index'] = wsclientindex;
 wsclients[wsclientindex] = client;
 wsclientindex++;
 client.on('message', WSMessageProcess);
 client.on('error', WSError);
}
