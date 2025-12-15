// Todo0: 
// auth= '{ userid:, sessionid:, expire:, sign: }', where sign is a hash (HMAC-SHA256) with a password (wich is stored specifically in server internal memory) of client LOGIN data: ip, fingerprint (user-agent and other specific data), userid and expire.
// auth token may be store in LS (so page reload doesn't call relogin) or in client app memory (page reload calls relogin), auth token is no encrypted, but cannot be faked due to its sign compared on server side
// Should i send keepalive events (last client event generates setTimeout (60*1000) for keepalive event post) from client side to exclude session timeout and 

import { app } from './application.js';
import { Application } from './application.js';
import { Interface } from './interface.js';
import { DialogBox } from './dialogbox.js';
import { ContextMenu } from './contextmenu.js';
import { Sidebar } from './sidebar.js';
import * as globalnames from './globalnames.js';

const LOGINDIALOG = { title: { type: 'title', data: 'Login' },
                      username: { type: 'text', head: 'Username', data: 'root' },
                      password: { type: 'password', head: 'Password', data: '1' },
                      LOGIN: { type: 'button', data: ' LOGIN ', tyle: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;`, flag: 'a' }
                    };

export class Connection extends Interface
{
 static name = 'Connection box';
 static style = {
			  ".connection": { "background-color": "#343e54;" },
 			 }

 constructor(...args)
 {
  const props = { animation: 'slideright',
                  position: 'CASCADE',
                  control: { closeicon: {}, fullscreenicon: { initevent: '' }, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, default: { releaseevent: 'mouseup', button: 2 } }, 
                  attributes: { class: 'connectionbox connection' }
                };
  super(...args, props);
  this.Login();
 }

 Login()
 {
  // Clear all disconnected-user data
  delete this.username;
  delete this.userid;
  // Kill all connection childs
  this.EventManager({ type: 'KILL', destination: null });
  // Create login dialog from the template
  const dialog = JSON.parse(JSON.stringify(LOGINDIALOG));
  if (this.logintitle && (dialog.title.data = this.logintitle)) delete this.logintitle;
  const control = { fullscreenicon: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, push: {}, default: {} };
  new DialogBox(dialog, this, { animation: 'rise', position: 'CENTER', overlay: 'MODAL', control: control, attributes: { class: 'dialogbox selectnone' } }); // Todo0 - create a flag that kills all brothers, so ligin dialog appearance kills all connection childs
 }

 CreateWebSocket(url)
 {
  this.socket = new WebSocket(url);
  this.socket.onopen = this.Handler.bind(this, { type: 'CREATEWEBSOCKET', data: { userid: this.userid, authcode: this.authcode } });
  this.socket.onclose = () => this.Login();
  this.socket.onerror = () => this.Login();
  //this.socket.onmessage = (message) => { this.Handler(JSON.parse(message.data)) };
  this.socket.onmessage = (message) => { this.EventManager(Object.assign(JSON.parse(message.data), { destination: this })) };
 }

 Handler(event)
 {
  switch (event.type)
	    {
	     case 'LOGIN':                                                         // Login dialog returned 'LOGIN' event with user/pass
               LOGINDIALOG.username.data = event.source.data.username.data;     // Keep username in login dialog data to use it as a placeholder for next logins
               this.HttpSend("/", { method: 'POST',                             // Pass login dialog user/pass to the controller via POST method
                                    body: JSON.stringify({ type: 'LOGIN', data: { username: event.source.data.username.data, password: event.source.data.password.data } }),
                                    headers: { 'Content-Type': 'application/json; charset=UTF-8' } });
               break;
	     case 'LOGOUT':
	          this.Logout();
	          break;
	     case 'LOGINACK':
               this.username = event.data.username;
               this.userid = event.data.userid;
               this.authcode = event.data.authcode;
               this.CreateWebSocket(event.data.protocol + '://' + event.data.ip + ':' + event.data.port);
	          break;
	     case 'LOGINERROR':
               this.logintitle = event.data;
               this.Login();
	          break;
	     case 'CREATEWEBSOCKET':
               this.WebsocketSend(event);
	          break;
	     case 'DROPWEBSOCKET':
               this.logintitle = event.data;
	          break;
	     case 'CREATEWEBSOCKETACK':
               new Sidebar(null, this);
               this.WebsocketSend({ type: 'SIDEBARGET' }); // Get OD/OV list
	          break;
	     case 'SIDEBARSET':
	     case 'SIDEBARDELETE':
	          return { type: event.type, data: event.data, destination: null };

	     case 'mouseup':
	          new ContextMenu(this.username ? [['Help'], ['Logout ' + Application.CutString(this.username)]] : [['Help']], this, event);
               break;
	     case 'CONTEXTMENU':
			switch (event.data[0])	// Switch context item name (event data zero index)
				  {
				   case 'Help':
					   break;
                       default:
                            if (event.data[0].substring(0, 'Logout '.length) === 'Logout ') this.Logout();
				  }
	          break;

	     case 'CREATEDATABASE': // Context menu event incoming from sidebar
               new DialogBox(JSON.parse(JSON.stringify(globalnames.NEWOBJECTDATABASE)), this, { overlay: 'MODAL', animation: 'rise', position: 'CENTER', attributes: { class: 'dialogbox selectnone' } });
               break;
	     case 'SETDATABASE': 
               this.WebsocketSend({ type: 'SETDATABASE', data: { dialog: event.source.data, odid: event.source.props.id } }); // Send new OD dialog data to controller via WS
               break;
	     case 'DIALOG':
               app.MessageBox(this, event.data?.content, event.data?.title);
	          break;

	     case 'GETDATABASE': // Context menu event incoming from sidebar, dispatch it directly to the controller
               this.WebsocketSend(event);
               break;
	     case 'CONFIGUREDATABASE':
               new DialogBox(event.data.dialog, this, { flag: Application.MODALBROTHERKILLSME, overlay: 'MODAL', animation: 'rise', position: 'CENTER', id: event.data.odid, attributes: { class: 'dialogbox selectnone' } });
               break;

	     case 'GETVIEW':
               this.WebsocketSend(event);
               break;
	     case 'SETVIEW':
               const view = this.childs[event.data.childid];
               if (!view || view.odid !== event.data.odid || view.ovid !== event.data.ovid) return { type: 'SIDEBARVIEWSTATUS', data: { odid: event.data.odid, ovid: event.data.ovid, status: undefined, childid: undefined }, destination: null };
               event.destination = view;
               return event;

	     case 'KILL':
               this.Logout();
               break;
	    }
 }

 Logout()
 {
  this.socket?.close();
 }

 // Send msg (options.body) via HTTP method (options.method)
 async HttpSend(url, options)
 {
  try   {
         let response = await fetch(url, options);
         response = await response.json();
         this.Handler(response);
        }
  catch (err)
        {
         app.lg(err);
         setTimeout(this.Login.bind(this), 0, this.logintitle = 'No server respond!');
        }
 }

 // Send msg via WS
 WebsocketSend(msg)
 {
  for (const prop in msg) if (prop !== 'type' && prop !== 'data') delete msg[prop]; // Delete all props except type/data
  if (this.socket && this.socket.readyState !== WebSocket.OPEN) return;
  try { this.socket.send(JSON.stringify(msg)); }
  catch {}
 }
}

/*
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

const NEWOBJECTDATABASE = {
                           padbar: { type: 'select', data: { Database: DATABASEPAD, Element: ELEMENTPAD, View: VIEWPAD, Rule: RULEPAD }  },
                           title: { type: 'title', data: 'New Database Configuration' },
                           SETDATABASE: { type: 'button', data: 'CREATE DATABASE', flag: 'a', expr: '/^$/dbname' },
                           cancel: { style: 'background: rgb(227,125,87);', type: 'button', data: 'CANCEL', flag: '++++++++++' },
                          };
*/

/*							  
   +--------+                                                                                       +------------+                                   +---------+                                     
   |        | LOGIN[HTTP:Connection:username,password] ->		                                   |            |                                   |         |                
   |        |     <- LOGINACK[HTTP:Controller:ip,proto,authcode]|LOGINERROR[HTTP:Controller:error]  |            |                                   |         |                
   |        | CREATEWEBSOCKET[WS:Connection:userid,authcode) ->                                     |            |                                   |         |                
   |        |              <- CREATEWEBSOCKETACK[WS:Controller]|DROPWEBSOCKET[WS:Controller]        |            |                                   |         |                
   |        |                        		    		                                             |            |                                   |         |                
   | Client | SIDEBARGET[WS:Controller] -> 			                                             | Controller |                                   | Handler |                
   |        |                               <- SIDEBARSET[WS:Controller:odid,path,ov]               |            |                                   |         |                
   |        |                        		                                        	          |            |                                   |         |                
   |        | CREATEDATABASE[LOCAL:Sidebar] -> SETDATABASE[WS:Connection:dialogdata) ->			|            |                                   |         |                
   |        |                                <- SIDEBARSET[...]|DIALOG[WS:Controller:dialogdata]    |            |                                   |         |                
   |        |                        		    		                                             |            |                                   |         |                
   |        | GETDATABASE[WS:Sidebar|Connection:odid] ->                                            |            |                                   |         |                
   |        |                   			<- CONFIGUREDATABASE[WS:controller:dialog,odid] 	     |            |                                   |         |                
   |        | SETDATABASE[WS:Connection:dialogdata,odid) ->           			               |            |                                   |         |                
   |        | <- SIDEBARSET[WS:Controller:odid,path,ov]|SIDEBARDELETE[WS:Controller:odid]|DIALOG[WS]|            |                                   |         |                
   |        |                        		    		                                             |            |                                   |         |                
   |        |                        		    		                                             |            |                                   |         |                
   |        | GETVIEW[WS:Sidebar|Connection:ovid,odid,childid,newwindow) -> 			          |            |                                   |         |                
   |        |                              			  <- SETVIEW[WS:Connection:odid/ovid/childid)|            |                                   |         |                
   |        |                                											|            |                                   |         |                
   |        |                            				     <- SETVIEW[WS:Connection:odid/ovid)|            |                                   |         |                
   |        |                        		    		                                             |            |                                   |         |                
   +--------+                                                                                       +------------+                                   +---------+                                     
*/