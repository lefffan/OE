import { GetStyleInnerHTML } from './constant.js';
import { Interface } from './interface.js';
import { Connection } from './connection.js';
import { DialogBox } from './dialogbox.js';
import { ContextMenu } from './contextmenu.js';
import { Sidebar } from './sidebar.js';
import { DropDownList } from './dropdownlist.js';

// Todo2 - Change application icon
// Todo2 - Custom cursor div via css style * {cursor: none;}
// Todo0 - Make module based system, see Shemsetdinov justify src arch via require/import
// Todo0 - Make code overview for all other sources, testing every feature (don't forget to check table element type with its string data JSON type to convert to object in dialogbox.js)
// Todo0 - DB SQL handle for OD structure, see Shemsetdinov query builder

export class Application extends Interface
{
 static style = {
 				 "Appearance animation": { "dialog box": "slideleft", "expanded selection": "rise", "context menu": "rise", "new connection": "", "new view": "" },
 				 "_Appearance animation": "Select interface elements appearance animation", 
				 ".modalfilter": { "ilter": "blur(1px);", "filter": "opacity(50%);", "_filter": "Dialog box modal effect appearance via css filter property, see appropriate css documentaion." },
				}

 // Creating application! Init global css style object and event counter, then add all mouse/keyboard event listeners and init event counter
 constructor()
 {
  const style = document.createElement('style');
  style.innerHTML = GetStyleInnerHTML(Application.style, DialogBox.style, DropDownList.style, ContextMenu.style, Sidebar.style, window.navigator.userAgent.indexOf('irefox') === -1 ? '' : { "*": { "scrollbar-width": "thin;", "scrollbar-color": "rgba(55, 119, 204, 0.3) rgba(255, 255, 255, 0);" } });
  document.head.appendChild(style);
  
  const NICECOLORS = [ 'RGB(243,131,96);', 'RGB(247,166,138);', 'RGB(87,156,210);', 'RGB(50,124,86);', 'RGB(136,74,87);', 'RGB(116,63,73);', 'RGB(174,213,129);', 'RGB(150,197,185);' ];
  super({}, null, { tagName: 'BODY', control: { default: { releaseevent: 'mouseup', button: 2 } } }, { style: `background-color: ${NICECOLORS[7]};` });
  this.eventcounter = 0;

  document.addEventListener('keydown', Interface.EventListener);
  document.addEventListener('keyup', Interface.EventListener);
  document.addEventListener('mousedown', Interface.EventListener);
  document.addEventListener('dblclick', Interface.EventListener);
  document.addEventListener('mouseup', Interface.EventListener);
  document.addEventListener('mousemove', Interface.EventListener);
  document.addEventListener('click', Interface.EventListener);
  document.addEventListener('contextmenu', (event) => event.preventDefault());
 }

 // Override main application child activation styling to exclude any effects for document.body
 StyleActiveChild()
 {
 }

 // Main application own handler to context menu and new connection create 
 Handler(event)
 {
  switch (event.type)
	     {
	      case 'mouseup':
		  	   new ContextMenu([['New connection'], ['Help']], this, event);
		  	   break;
	      case 'CONTEXTMENU':
			   switch (event.data[0])	// Switch context item name (event data zero index)
			   		  {
					   case 'New connection':
			   				new Connection(null, this);	// Args: data, parent
							break;
					  }
		  	   break;
	     }
 }
}

export let app;
window.onload = function () { new Connection(null, app = new Application()); }; // Connection args: data, parent

// Megacom appliance information systems
// Todo - discuss how will megacom nodes/switches will be edited by L1 support? Via template card (application dialog with node name, ip, address.. etc)?
// Todo - add startel nodes
// Todo - discuss wich tabs to create as they are in our current mrtg. Left/right/N-Z/Fiziki?
// Todo - Discuss megacom user/groups and their rights
// Todo - Megacon MRTG System
//		  Link names for usual uplink, mpls uplink, switchport/vlps uplink, rezerv uplink..
// 		  Create MRTG OD with at least one view that shows nodes with zero clients, one client, etc..
// 		  Host/node elements: 1-100 ports (type uplink,downlink,free,service,client), 101 hostname or/and description, 102 hardware, 103 location, 104 ip, 105 Status(up/down).
//		  Should hardware-mac, node-number and checked-by-soa element be added?
// 		  diagnostic (pings, grafiki, port config, port errors, asr speed, mac, mac-vendor, cable diag, checkhost, name from billing), in node tree create mac search function for every switch in a tree
//		  For client port type display client name from billing
//		  Button to destruct client conf,int et 1/0/2,shut, no fl c, no band c,  sw mode acc,  sw acc vl 666,  speed aut, end,wr
//		  ping <switch ip>, on port ping <client ip>
//		  Ctrl+F12 - uplink tree from current object (any element)
//		  Alt+F12 - downlink tree from current object (any element)
//		  Shift+Ctrl+F12 - Map tree up from current object (any element)
//		  Shift+Alt+F12 - Map tree down from current object (any element)
//		  ALT+S - point to point tree (any element)
//		  ALT+H - history (any element)
//		  ALT+L - downlink tree client list (any element)
//		  F2, KEYPRESS - edit value for L2 only (any element)
//		  DEL - delete content via confirmation (any element)
//		  DBLCLICK - edit card dialog box for tehuchet, info, contacts, names, loaction.. (location element)
//		  DBLCLICK with ctrl|alt|shift for UPLOAD, DOWNLOAD, UNLOAD and ctrl+alt for GALLERY (location element)
//		  F12 port diagnostic - client grafic in realtime, and mrtg grafics (port element)
//		  INS edit hint, style and snmpindex (port element)
//		  DBLCLICK - edit card dialog box (port type selection[free|client|service|uplink|downlink]: free[description becpmes empty], client[zayavka-ip-speed-licevoi-name-address], service[description only], up|down[description+link property]) (port element)
//		  F12 host diagnostic - switch with port list with their links up or down (non-port element)
//		  INS hint, style + snmpgroup, for hardware element only (non-port element)
// Todo - Create corp chat with source code pass, image pass and some popular messanges features to make comfortable user dialogs. Apply emodzi pass also and see new features of mattermost (or other corp chat) new version
// Todo - Create corp addrbook, stuff list with foto, tel, dolzhnost. Tabel. Stuff vacations (otpusk). Grafik raboty
// Todo - Setki.xls (ip, name from TABELS, name from BILLING, mac for buhgalters and FSB, comment), tech uchet, Wiki
// Todo - Union some request apps (like Helpdesk or CRM) where one zayavka for helpdesk, podkluchenie, otkl, expluataciya.
//	      Develop helpdesk - how does object selection should calculate expired orders/requests? Versions date difference is more than three days?
//		  Ask Slava for HD analitycs
//		  Group some orders to one parent to have opportunity to close/change(status) all childs orders via one parent order. Or one order may have multiple clients?
//		  Order/requests reassignment to one person/department(otdel)
//		  Client order/requests history
//		  Automatic preload client data (switch, port, ip, geo addr, contacts) at order/request creation
// Todo - Zabbix, Grafana, ACS, any accounting system (may be billing), any statistic/analitycs, Slavina adminka. See all these systems for new app functional
// Todo - Paraga mail functional  
// Todo - See analog: metabase/apache, superset, statsbot, looker, periscopedata

// Application architecture
// Todo - PARSE ALL FILES IN OLD STABLE APP VERSION
// Todo - app containers via docker?
// Todo - Make logs and handlers manager accessable in 'System Manage' context menu
// Todo - Application global users allowed all. For a example - root user.
// Todo - Name application database tables: data_odid, uniq_odid and head_odid to ease transfering object databases with its structures! https://postgrespro.ru/docs/postgresql/14/reference
// Todo - Multiple user instance is allowed via checked option in user properties settings
// Todo - At the end of app stable version make new customization
// Todo - add in system description something like 'it has a 'game' style interface colors but offers a powerful functionality
// Todo - helpdesk/jira/CRM example in Help context menu
// Todo - Favicon change to show unread msges presence
// Todo - Shortcut key calls OV to open at sidebar focus
// Todo - another native object element like 'datetime' is 'timestamp' to fix TSDB data changes. Timestamp not only for TSDB, but for any objects - usefull for compare object creating time with current changes to calculate how many seconds/minutes have passed
// Todo - Every user defined element (eid1, eid2..) has its external data like streams (cameras, streams), files (documents, audio, video, image) and TSDB (data is set via system call SET<TSDBID>])
//		  App data represents 3D model: 1st dimension - objects, 2nd - objects elements, 3rd - element JSON props, streams, files, TSDB
//		  Configurate element external data (streams, files) via handler commands for cameras (timeshift, source, qulity), for tsdb (duration, unit of measure[sec, mbits, ...]), for file upload/download
// Todo - output OD info (view number, element number.. etc) in OD configuration dialog
// Todo - Main goal is automize app configuration and fit that configuration to some template than can be easily set by the user
// Todo - Macroses in element layout, object selection and in some OD configuration fields:
//				Builtin macroses (user, OV date, default element layout templates)
//				User defined in a view open dialog
//				Db global 
//		  Arguments in сmd line:
//				Builtin macroses
//				Object element val 
//				Arg dialog
//				Db global
// Todo - removeEventListener func takes callback as a second arg. Is this arg correct when it looks like 'this.Handler.bind(this)'? Bind property creates a new link instance to the func with defined <this> every time, so removeEventListener doesn't know what to remove? Does it?
// Ctrl + Tab switches between childs in connection child
// Keep user last login in user db

// Controller and event handlers
// Todo - Handler cmd line macroses (replacements) - <oid>, <eid>, <date>, <OD>, <OV>, <ODid>, <OVid>
// Todo - Single/Multipile select as a native handler that allows to select predefined values
// Todo - Negative queue value (the scheduler sleep for) in msec on crontab line
// Todo - Task manager restrict call (or/and call with no task delete option) for the user in his property settings and send only active handler list instead of their wrapeed dialog structure
// Todo - Every user event has timeout the handler proccess it. The match of the user/event/odid/oid/eid record in event/message queue doesn't allow duplicated until the timeout exceeds. The record in event/message queue is removed after the handler responce or timeout occur
//        Another more strict option is to consider only user/event/odid/oid combination for element id, so user double cliked on any object element is unable generate another double click event on other object element, so controller call is not perfomed until response or timeout
// Todo - Create system user read-only customization like github interface, for a example, so users can use it via 'force' option in user-customization dialog
// Todo - Single OV click: OV is already open ? bring OV to top or refresh if already on top : open in a current view or in a new view if no any view exist.
//		  Context menu 'open in a new view' opens OV in a new view anyway, action is grey/absent for already opened OV. Do not forget to limit max open views
// Todo - UPDATE handler command (in a addition to SET/RESET) creates new object version only in case of at least one user-defined element changed
//		  Multiple SET system calls (SET1, SET2, ... for a example) in a addition to UPDATE to apply different rules depending on a SET system call number.
// Todo - Don't log message in case of previous msg match, but log 'last message repeated 3 times'
// Todo - Event command line are not single line, but multiple. Controller runs first line handler, gets its data, other lines handlers may run in detached mode or may be used as a comments
// Todo - Release CHANGE event subscribing feature to allow non-native object (another words - object subscribes for CHANGE event of other object in DB) elements react on
// Todo - Controller dialog message: how to escape divider char '/'? Via '\/'?
// Todo - event 'VIEWREFRESH' occurs at OV open/refresh, the hanlder for this event is called similar 'NEWOBJECT' event (handler commands as an answeers for 'VIEWREFRESH' events depends on a view type - SET|EDIT commands, for a example, are for table type only).
//		  This event 'VIEWREFRESH' is useful for some actions to be made at view OPEN, for a example, some objects elements data refresh (counters for a example) or execution of a script doing some external actions in 'ignore' mode
// Todo - How to call dialog to add new object instead of retreiving element data from vitrual object (id=-1)
// Todo - Release system calls 'NEWOBJECT' and 'DELETEOBJECT' (don't mess with self-titled events), so the handlers can create/remove multiple objects. And 'COPY' to copy data to the buffer
//			May these system calls 'NEWOBJECT' and 'DELETEOBJECT' release will be similar to user self-titled events, for example - user creates a new object via context click with 'new object row' as an args, so system call 'NEWOBJECT' does with 'data' property as an arg for all creating new object elements
// Todo - Discover new object:
//		  Object selection: SELECT NONE
//		  Define handler for any one element for event SCHEDULE 
//		  In case of no any object selected in object selection process the handler is executed once with object id 0 (or -1..3) as input arg (plus object list ip addresses, for a example).
//		 		The handler runs in detach mode or answers with two possible system calls 'DELETEOBJECT' and 'NEWOBJECT' (other cmds are ignored).
//		  So based on input args the handler can discover (create) new objects or destroy (delete) in range of user defined pool
// Todo0 - handlers: cmd line, user defined plain text stdout, builtin node-native handler, node js script. All these handlers are accessed via profiles in which the arg dialog may be defined.
//		   Each event has its handler profile (that is defined in system user customization). App has event profiles that consists of event list with defined handler profiles. Each element in OD may have default event profile (excel for a example, or chat)


// Element layout
// Todo - warning message (or just complete dialog?) and regexp search (emulates ctrl+shift+f at OV open) as a start event. Also emulate via start event 'select all objects and then delete them'
// hiderow/hidecolumn - regexp feature with flag i for all cells in rows/columns match successful case
// Todo - virt cell depends on oid,eid
// Todo - sql request in 'Element Layout' section in 'value' prop should select among its view object selection, but not from all objects! (see models piechart among switches with one or zero active clients)
// Todo - Any <td> style in element layout (colors, backgrounds, wires, etc..) for the tree/table view types may be customized depending on current object elements values 

// Rules
// Todo - when a rule is rejected for the event CHANGE - old element data is set. If element data is overwriten in element layout 'value' prop, the old element data is set anyway.
// Todo - add rule action 'do nothing' (for log only goal and some db sql actions), serch is continued
// Consider EVENTTYPE and EVENTDATA macroses in query rule SELECT statement
// Add CHANGE event new sence, so it applies at any object change. It seems it is unneseccasry, jusy imply rules checking both for events and handler system calls
// Add alias to SET system call (PUT ADD WRITE PUSH) to add specific rules to
// Add macros {RULEQUERY} to have opportunity to log it + ${EVENT} + ${EVENT<event_prop>}, for a example ${EVENTDATA} submit event['data']

// Object selection  
// Todo - second and all next queries (for non Tree view types only) do query in previous query results

// Front-end
// Todo - smooth scrolling for rows more than 500 - event preventdefault on scroll event plus settimeout (dispatch scrolling event, 100);
// Todo - Customize scrollbars via user customization and other non-css props (for a example 'animation appearance')
// Todo - Check opera bug mouseup event at right mouse btn release while dragging while mouse guesters enabled in opera settings

// Presentation
// Todo - Y-combinator practice:
//		  https://russol.info/kak-podat-zayavku-v-y-combinator-i-vyigrat
//		  https://vc.ru/life/96458-kak-my-pytalis-proiti-v-y-combinator-ot-zayavki-do-intervyu
//	      https://tass.ru/ekonomika/14542887
//		  https://rb.ru/longread/where-to-go-with-business-idea/
//		  https://vc.ru/flood/60006-kuda-startapu-poyti-za-nastavnikami-i-investorami-desyat-krupnyh-akseleratorov-rossii
// Todo - big amount of data with faster and quick perfomance
// Todo - data is native
// Todo - data constructor
// Todo - voting
// Todo - keep last twoversions
// Todo - don't add objects more than 100
// Todo - cell text is not writable in case of change from 'mark' to 'john', but not from 'john' to 'mark'
// Todo - to leave only last two versions create rule: delete from data_1 where id=:oid and version <= :postversion -2, odtable -> odid!