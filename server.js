// Todo  (undefined todo status) - deploy production via nginx reverse proxy (balancier) and other features in youtube channel YfD: https://www.youtube.com/watch?v=77h-_SytDhM
// Todo0 (necessary todo) - responce for necessary js files only!
// Todo0 (necessary todo) - set secure server via https instead of http
// Todo1 (deffered todo)
// Todo2 (questionable todo) - correct server create due to https://ru.stackoverflow.com/questions/1144243/Как-написать-сервер-который-отдаёт-файлы-из-папки
// Todo0 - TimeScaleDB
//			https://github.com/timescale/timescaledb/blob/main/tsl/README.md
//			https://docs.timescale.com/self-hosted/latest/install/installation-windows/
//			https://www.timescale.com
// Todo2 - setTimeout for inactive pad: https://stackoverflow.com/questions/6032429/chrome-timeouts-interval-suspended-in-background-tabs
// Todo2 - JS tutorial
// Todo0 - auth https://nodejsdev.ru/guides/webdraftt/jwt/ https://zalki-lab.ru/node-js-passport-jwt-auth/ https://habr.com/ru/companies/ruvds/articles/457700/ https://nodejsdev.ru/api/crypto/#_2
// Todo0 - Postgres https://postgrespro.ru/docs/postgresql/14/sql-createtableas https://postgrespro.ru/windows https://stackoverflow.com/questions/64439597/ways-to-speed-up-update-postgres-to-handle-high-load-update-on-large-table-is-i https://www.crunchydata.com/blog/tuning-your-postgres-database-for-high-write-loads
//			https://serverfault.com/questions/117708/managing-high-load-of-a-postgresql-database
// Multithread https://tproger.ru/translations/guide-to-threads-in-node-js see comments


// +--------+                                            +------------+                                   +---------+                                     
// |        | User events STEP1--->                      |            | User events STEP2--->             |         |                
// |        |   Context menu (INIT|DELETE)               |            |   ---||---                        |         |                
// |        |   Confirmation (CONFIRM|CONFIRMDIALOG)     |            | Controller event:                 |         |                
// |        |   Mouse and keyboard	 	        		 |            |   SCHEDULE                        |         |                
// |        |   Sidebar (RELOAD)		        		 |            |                                   |         |                
// |        |                                     		 |            |    <---STEP3 Handler system calls |         |                
// |        |                                     		 |            |                               SET |         |                
// |        |                                     		 |            |                             RESET |         |                
// |        |                                     		 |            |                            UPDATE |         |                
// |        |                                     		 |            |                               PUT |         |                
// |        |                                     		 |            |                            DIALOG |         |                
// |        |                                     		 |            |                              EDIT |         |                
// | Client |                                		     | Controller |                          	 CALL | Handler |                
// |        |                                     		 |            |                             ALERT |         |                
// |        |                                     		 |            |                                   |         |                
// |        |                                     		 |            | Controller event STEP4--->        |         |                
// |        |                                     		 |            |   ONCHANGE                        |         |                
// |        |                                     		 |            |                                   |         |                
// |        |                                     		 |            |    <---STEP5 Handler system calls |         |                
// |        |                                     		 |            |                               ... |         |                
// |        |                                     		 |            |                                   |         |                
// |        |              <---STEP6 Controller commands |            |                                   |         |                
// |        |                                        SET |            |                                   |         |                
// |        |                                     DIALOG |            |                                   |         |                
// |        |                                       EDIT |            |                                   |         |                
// |        |                                       VIEW |            |                                   |         |                
// |        |                                  NEWOBJECT |            |                                   |         |                
// |        |                               DELETEOBJECT |            |                                   |         |                
// |        |                                     		 |            |                                   |         |                
// +--------+                         		             +------------+                                   +---------+                                     


const CLIENTEVENTS = ['INIT', 'DELETE', 'CONFIRM', 'CONFIRMDIALOG', 'ONCHANGE', 'PASTE', 'RELOAD', 'SCHEDULE', 'DOUBLECLICK', 'KEYPRESS', 'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ', 'Key0', 'Key1', 'Key2', 'Key3', 'Key4', 'Key5', 'Key6', 'Key7', 'Key8', 'Key9', 'KeyF1', 'KeyF2', 'KeyF3', 'KeyF4', 'KeyF5', 'KeyF6', 'KeyF7', 'KeyF8', 'KeyF9', 'KeyF10', 'KeyF11', 'KeyF12', 'KeySpace', 'KeyInsert', 'KeyDelete', 'KeyBracketLeft', 'KeyBracketRight'];

const testdata = {
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
		  /*16: { type: 'text', path: 'Database/New path|!+%Enter new path name|Path list', head: 'Database configuration structure profile path', hint: `Each application dialog has its JSON format structure, 
so this database configuration dialog JSON can be splited to interface elements (each json property represents dialog interface element, see 'Dialog' help section) 
to apply some restrictions to (via interface element profile path). Example: path </Element> with 'readonly' restriction type for the user '!root' denies any changes in 'Element' pad for all users except root`, data: '' },
		  17: { type: 'radio', path: 'Database/New path|!%Enter new path name', head: 'Restriction type', data: 'hidden/readonly/!writable', flag: '' },
		  18: { type: 'textarea', path: 'Database/New path|!%Enter new path name', head: 'User/group list', hint: `User/group list (one by line) to apply the restriction to. 
Char '!' reverses the result of match, so line '!root' matches all users (or groups) except root. 
Thus to match absolutely all users use '!!' - this record matches all users except user '!', 
but username (or group) '!' is not allowed, so the list match is true for all. 
The list is looked up for the users/groups one by one and when a match is found, 
the restriction type corresponding to the specified path is performed. 
No match - all dialog interface elements of the pad/profile path are writable`, data: '' },*/

		  20: { type: 'textarea', path: 'Element/New element|+|Element profile|Set element properties and clone this dialog profile to create new element in object database', head: 'Name', hint: `Element name, used as a default element title in object view display`, data: '', flag: '%Enter element name' },
		  21: { type: 'textarea', path: 'Element/New element', head: 'Description', hint: `Element description is displayed as a hint on object view element header navigation for default. Describe here element usage and its possible values`, data: '', flag: '*%Enter element description' },
		  22: { type: 'checkbox', path: 'Element/New element', head: 'Type', hint: `Unique element type set implies unique 'value' property among all objects in database, so duplacated values are exluded. Element type cannot be changed after element creation`, data: 'unique' },
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
'Message' option displays handler output on client side message box`, data: '!Apply/Message/Ignore' },
		  //35: { type: 'checkbox', path: 'Element/New element/New event/Handler stdout (correct JSON)|!', data: 'Log', flag: '*' },
		  36: { type: 'radio', path: `Element/New element/New event/Handler stdout (incorrect JSON)|!|Handler output processing`, data: 'Set/Message/!Ignore' },
		  //37: { type: 'checkbox', path: 'Element/New element/New event/Handler stdout (incorrect JSON)|!', data: 'Log', flag: '*' },
		  38: { type: 'radio', path: 'Element/New element/New event/Handler stderr|!|Handler output processing', data: 'Set/Message/!Ignore' },
		  //39: { type: 'checkbox', path: 'Element/New element/New event/Handler stderr|!', data: 'Log', flag: '*' },

		  40: { type: 'text', path: 'View/New view|+|View profile|Set view properties and clone this dialog profile to create new view/General', data: '', flag: '%Enter view name', head: 'Name', hint: `Enter here new view name to create or change existing one. 
First '_' character in a view name string keeps unnecessary views off sidebar, so they can be called from element handlers only. Views hiding doesn't affect to its access rights` },
		  41: { type: 'textarea', path: 'View/New view/General||View settings', head: 'Description', hint: `Describe here view purpose and usage`, data: '' },
		  42: { type: 'select', path: 'View/New view/General', head: 'Shortcut key', hint: `Select key combination to call the view`, data: 'None/ALT+SHIFT+KeyA/ALT+SHIFT+KeyB/ALT+SHIFT+KeyC/ALT+SHIFT+KeyD/ALT+SHIFT+KeyE/ALT+SHIFT+KeyF/ALT+SHIFT+KeyG/ALT+SHIFT+KeyH/ALT+SHIFT+KeyI/ALT+SHIFT+KeyJ/ALT+SHIFT+KeyK/ALT+SHIFT+KeyL/ALT+SHIFT+KeyM/ALT+SHIFT+KeyN/ALT+SHIFT+KeyO/ALT+SHIFT+KeyP/ALT+SHIFT+KeyQ/ALT+SHIFT+KeyR/ALT+SHIFT+KeyS/ALT+SHIFT+KeyT/ALT+SHIFT+KeyU/ALT+SHIFT+KeyV/ALT+SHIFT+KeyW/ALT+SHIFT+KeyX/ALT+SHIFT+KeyY/ALT+SHIFT+KeyZ' },

		  43: { type: 'textarea', path: 'View/New view/Selection', head: 'Selection query', hint: 'Object selection is a part of the sql query string, that selects objects for the view. Empty string selection - all objects, error selection - no objects. See appropriate help section for details', data: '' },
		  44: { type: 'text', path: 'View/New view/Selection', head: 'Object selection property name', hint: '', data: 'value', },
		  45: { type: 'text', path: 'View/New view/Selection', head: 'Object selection property max chars', hint: '', data: '', },
		  46: { type: 'text', path: 'View/New view/Selection', head: 'Object selection link', hint: '', data: '', },
		  47: { type: 'textarea', path: 'View/New view/Selection', head: 'Object selection input args', hint: '', data: '' },

		  47: { type: 'radio', path: 'View/New view/Layout', head: 'Template', hint: `Select object view template from 'Table' (this template displays objects with its elements in a form of a table, element JSON property 'value' is displayed by default), 
'Tree' (displays the tree of objects acting as a nodes connected with each other via 'link' element property) or 
'Map' (objects are placed on geographic map by 'geo' element property value)`, data: '!Table/Tree/Map' },
		  48: { type: 'textarea', path: 'View/New view/Layout', head: 'Layout', hint: `Element layout defines what elements should be displayed and how for the selected template. Empty layout is a default behaviour, see appropriate help section for details.`, data: '' },

		  50: { type: 'select', path: 'View/New view/Appearance', head: 'Start layout', data: 'sidebar fit/cascade/random/new pad', hint: 'Select view window position' },
		  51: { type: 'radio', path: 'View/New view/Appearance', head: 'Size', data: '!Auto/Full screen/Fixed' },
		  52: { type: 'text', path: 'View/New view/Appearance', head: 'Width and height in pixels via comma', data: '' },
		  53: { type: 'checkbox', path: 'View/New view/Appearance', head: 'Behaviour', data: '!resize/!full screen/escape/!close icon/always on top' },
		  54: { type: 'text', path: 'View/New view/Appearance', head: 'Auto refresh interval', data: '' },
		  55: { type: 'checkbox', path: 'View/New view/Appearance', head: 'Bring to top on event', data: 'new data/data delete/data change' },
		  56: { type: 'checkbox', path: 'View/New view/Appearance', head: `Auto open on event`, data: 'new data' },
		  57: { type: 'text', path: 'View/New view/Appearance', head: 'Lifetime', data: '' },

		  60: { type: 'textarea', path: 'View/New view/Permissions', head: `Read access restricted users/groups`, data: '' },
		  61: { type: 'textarea', path: 'View/New view/Permissions', head: `Write access restricted users/groups`, data: '' },

		  71: { path: 'Rule/New rule|+|Rule profile name|Add new rule profile name. Rule profiles are tested in alphabetical order until the query is successful', type: 'textarea', head: 'Rule message', data: '', hint: `Rule message is a match case message displayed at client side dialog box and optionally logged. For non-empty messages only. Macroses are allowed`, flag: '*' }, 
		  72: { path: 'Rule/New rule', type: 'select', head: 'Rule action', data: '!Accept/Reject/Pass', hint: `'Accept' action permits incoming event passes it to the controller, 'Reject' action cancels it, 'Pass' action does nothing and doesn't terminate the search continuing from the next rule, useful for event logging and rule disabling without removing` }, 
		  73: { path: 'Rule/New rule', type: 'textarea', head: 'Rule query', data: '', hint: `Every controller incoming event (such as user mouse/keyboard, system SCHEDULE/CHANGE or others) is passed through the rule analyzer to be tested on all rule profiles in alphabetical order one by one until the rule query is successful. 
Rule query is a list of one by line truncated SQL query strings without a SELECT statement that is added automatically. Empty or commented via '#' lines are ignored, but no any query specified causes successful result. 
Non-empty and non-zero result of all query strings - the match is successful; any empty, error or zero char '0' result - no match. When a match is found, the action corresponding to the matching rule profile is performed, no any rule profile match - no any action made. 
Query may contain any macroses such as user or system defined ones (${'${'}oid}, ${'${'}eid}, ${'${'}OD}, ${'${'}OV}, ${'${'}event}, ${'${'}modifier}, etc), so that rules may be applied to the specified events/objects/elements/views only, see 'macros' and 'Rules' help section for details. 
Be aware of using rules for unspecified events, it may cause CPU overload due to every event query call. Examples: ` }, 
		  74: { path: 'Rule/New rule', type: 'checkbox', data: 'Log rule message' }, 

		  _100: { type: 'button', path: 'Element', data: 'CREATE DATABASE' },
		  z101: { head: 'background: rgb(227,125,87);', type: 'button', path: 'Element', data: 'CANCEL' }
		 };

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
