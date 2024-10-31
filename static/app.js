// Todo2 - Change application icon
// Todo2 - Custom cursor div via css style * {cursor: none;}
// Todo0 - Sidebar
// Todo0 - Shemsetdinov justify src arch via require/import + move index.js to app.js 
// Todo0 - Pass through all dialog.js to check syntax and test every dialog feature one by one code line (don't forget to check table element type with its string data JSON type to convert to object)
// Todo0 - Make code overview for all other sources, do it the way dialogbox.js is done
// Todo0 - DB SQL handle for OD structure

// Todo0 - Make new todo.txt that was done during EOS work
// Todo0 - Флаги функция
// Todo0 - Configure text area as a dialog

class Application extends Interface
{
 static style = {
 				 "Appearance animation": { "dialog box": "slideleft", "expanded selection": "rise", "context menu": "rise", "new connection": "", "new view": "" },
 				 "_Appearance animation": "Select interface elements appearance animation", 
				 ".modalfilter": { "filter": "opacity(50%);", "_filter": "Dialog box modal effect appearance via css filter property, see appropriate css documentaion." },
				}

 // Creating application! Init global css style object and event counter, then add all mouse/keyboard event listeners and init event counter
 constructor()
 {
  style.innerHTML = GetStyleInnerHTML(Application.style, DialogBox.style, ContextMenu.style, SideBar.style, window.navigator.userAgent.indexOf('irefox') === -1 ? '' : { "*": { "scrollbar-width": "thin;", "scrollbar-color": "rgba(55, 119, 204, 0.3) rgba(255, 255, 255, 0);" } });
  document.head.appendChild(style);
  super({}, null, { tagName: 'BODY', control: { default: { releaseevent: 'mouseup', button: 2 } } }, { style: `background-color: ${nicecolors[7]};` });
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

window.onload = function () { app = new Application(); }

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

// Application architecture
// Todo - PARSE ALL FILES IN OLD STABLE APP VERSION
// Todo - all db operations via one function
// Todo - problems of deploying - can i use postgre db on commerisal base? 
// Todo - db readonly replicas?
// Todo - app containers via docker?
// Todo - Make logs and handlers manager accessable in 'System Manage' context menu
// Todo - Application global users allowed all. For a example - root user.
// Todo - Name application database tables: data_odid, uniq_odid and head_odid to ease transfering object databases with its structures! https://postgrespro.ru/docs/postgresql/14/reference
// Todo - Multiple user instance is allowed via checked option in user properties settings
// Todo - At the end of app stable version make new customization
// Todo - add in system description something like 'it has a 'game' style interface colors but offers a powerful functionality
// Todo - Use another user (instead of root) with priv granted to 'OEDB' database only and Unicode for MySQL https://mathiasbynens.be/notes/mysql-utf8mb4 http://phpfaq.ru/mysql/charset
// Todo - socket rate limit: https://javascript.info/websocket#rate-limiting
// Todo - How to secure web socket connections: https://www.freecodecamp.org/news/how-to-secure-your-websocket-connections-d0be0996c556/
// Todo - All db operations (except handlers and db config) should use the connection via user with read-only permissions
// Todo - index columns: alter table data_1 add index (`lastversion`);
// Todo - Use unbuffered queries just not to get all data as one whole XPathResult, but get it portion by portion
// Todo - helpdesk/jira/CRM example in Help context menu
// Todo - Favicon change to show unread msges presence
// Todo - Shortcut key calls OV to open at sidebar focus
// Todo - another native object element like 'datetime' is 'timestamp' to fix TSDB data changes
// Todo - Every user defined element (eid1, eid2..) has its external data like streams (cameras, streams), files (documents, audio, video, image) and TSDB (data is set via system call SET<TSDBID>])
//		  App data represents 3D model: 1st dimension - objects, 2nd - objects elements, 3rd - element JSON props, streams, filesm TSDB

// View
// Todo - all view changes comes to clint side with odid/ovid with object and its element ids. Controller passes all changes data to all clients that has this view opened.
//		  Initiator client apply all changes for this odid/ovid, non-initiator client for this odid/ovid also apply changes (if user has appropriate permissions),
//		  and for other ovids with this odid client side check matched object ids with their elements and add 'new notification' in a sidebar
// Todo - regexp search should be implemented to all types of view including tree and map. Should js range be used instead of span highlighting in regexp search? Not only regexp search but search on mask with only one asterisk as a special char
// Todo - In context menu description display Od and OV description from OV structure, application version, tel number for additional help tab 'Contacts' and mail functional - please contact us support@tabels.app
// Todo - Build view via adding its elements (objects) with limited count, continuing later via settimout(callback, 0) just to not freeze user interface
//		  Load/reload view process is divided into two stages - receving server data and parsing it to fit element layout. First stage displays loading circle at view item in a sidebar.
//		  Data parsing second stage displays circle progress indicator of loaded data portions. Both stages are allowed to be cancelled via clicking inside the view rectangle. Should Esc key stop OV open process also?
//		  Not fininshed 2nd stage data displays red rectangle. The view content are not touched until the 2nd stage starts.
//		  This mechanism allows to not only avoid page freeze, but immediate handle of any incoming CALL/TABLE/TREE message with a new data and droping (direct deleting via js) previous CALL message data from controller.
//		  Insufficient memory error at big amount of OV data coming quickly for client browser not having time to handle that OV big growing data is solved.
// Todo - Fix error while calling all hosts, then calling 'random 2 hosts' displays 'random 2 host' view, then 'all hosts' is displayed. Build incoming message broker.
// Todo - Voting view example
//		  layout: {"oid":"3", "eid":"element id number for every voting", "y":"0", "x":"0", "value":"Голосовать"}
//		  object selection: empty
//	  	  Rule reject:
//					  CHANGE select count(version) > 1 from :odtable where id=3 and owner=':user'
//					  INIT select 1 (add object first (only once))
//					  DELETE select 1
//		  Event DOUBLECLICK handler: php /usr/local/src/tabels/handlers/_.php SELECT 'Путин|Зюганов|Медведев'
//		  Event CONFIRMDIALOG handler:  php /usr/local/src/tabels/handlers/_.php <event> <data>
//		  Display selected cells sum for 'number' cell type
// Todo - Emodzi symbols as an element text causes db sql error. Should it be fixed?
// Todo - OV description as a hint on taskbar OV navigation
// Todo - Object selection input args dialog data defines macroses specified in object selection string. Undefined macroses are empty strings. Dialog data interface props are macros names. No macroses in object selection string - no dialog call at OV open.

// Tree view
// Todo - Point to point tree shouldn't be multipath? Second query in object selection (add it to the help/doc) should point to the second point of point-to-point tree. Another words: point to point scheme must be one way
// Todo - Tree element layout: style (for example to see what nodes are down by seeing them via red background)
// Todo - Tree wire name (arrow name) to mark fiber cooper radio..
// Todo - Object content have element list on per line and should looks like this: "element head: element text value". All unfited text should be displayed at its cursor navigation to show full values (so for elements that act as a links)
//		  How to display image instead element values with its headers rectangles as a tree nodes?
// Todo - context menu: expand/hide uplink and downlink subtrees, description for tree view (object number, object selection parameteres..)
// Todo - loop element - show real looped object instead of read message
// Todo - nested level input to be displayed. For example, nested level 2 diaplys main switch with its direct downlink nodes and no more deeper levels of nodes
// Todo - keep input view parameters in a view history navigating, so open last viewed OV with input parameters used before. Access history of opened views via context menu or hot keys?

// Table view
// Todo - any single text line with Enter and then Backspace pressed should be stored the way it is before pressing Enter with Backspace, but it is stored original line + '\n'. Correct it!
// Todo - all table cells have their allowed html tags including pseudo tags that allows to insert graphics. Add <img> tag to allowed ones to have opportunity use image links instead downloaded images
// Todo - to allow html table within table cells add <tr>, <td>, <tbody> and <table> tags to allowed ones
// Todo - multi cell selecting - copy (excel table), delete (removes all selected objects) with new user event 'DELETE' for every removing object
// Todo - view content refresh starts just right after parsed incoming data table width/height is calculated.
// Todo - Optimize x,y expressions: if x=n+1, then don't call eval, but plus 1 to n. Don't call eval function in case of constants x,y values also
// Todo - Always develop table functional to some needful excel functions!
// Todo - only this type of view allows new object creation. Release object creation via dialog to input all elements values
// Todo - Export OV data to xls(via csv) or txt file
// Todo - Fetch progress for uploading files https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload
// Todo - autocomplete feature at cell editing. Autocomplete data may be retrieved from other OD, for example, client list or street list.
// Todo - what about edit after edit command, for a example edited text is passed to controller (confirm event) and edit command occurs as a response to confirm event?
// Todo - GALLERY command shows all foto for default, otherwise - specified foto. Image properties (like resolution) should be displayed and left/right arrows control at the right top view block. Smooth image changing also?
// 		  GALLERY displays all external data including streams, images, audio, video, TSDB
//		  Make external source data settings via these kinds of systme calls UPLOAD, DOWNLOAD, UNLOAD for files, another cmd for TSDB (duration, unit of measurement) and another cmd for streams (timeshift, source, qulity)
//		  All these external data may be embedded via custom tags to table cell <td>
// Todo - macroses like in joe
// Todo - Context menu Graph
// Todo - Paste file or image to object element - PASTE user event; drag and drop file to the corresponded cell - DRAGANDDROP user event
// Todo - Downloading big files don't show progress indicator. Check it
// Todo - What if non table area selecting when dragging starts from 'no table area' and ends at 'table area'? One or multiple cell selecting - buffer copy as text or/and as image (like excel cells are copied into whatsup)
// Todo - Sort by header click for look like default element layout when header line at the top, bottom, left, right
// Todo - Autonavigate command for OV, for a example single mouse cell click edit the text in. Mouse single click emulate command (NONE|DBLCLICK|KEYPRESS) or new user event 'CLICK'? Usefull for chats
// Todo - Table selection of this strings and values (hui1 space, hui2 space, hui3 space..) displays pie chart with hui1 - 100%, and 0% for other values, is it right?
// Todo - element cell style based not only oid/eid combinations, but on element cell value (so empty style attr [style=""] hides the row or styles it by some color, for a example)
// Todo - EDIT controller cmd limits text lines number to edit https://toster.ru/q/355711
// Todo - Pagination is not implemented, should it be usable via OV dirs with page ranges per view in this dir or via next portion of objects displayed by reaching screen bottom at scrolling (object portion number should be set in user customization misc configuration)?
// Todo - Every element has its default event profile defined is 'system' user settings. Event profile is a list of user events and its executed handlers. All handlers for any event may have dialog data to pre-configure script input args. 
//		  These args can be changed either in 'system' user settings or element event handler section. 'Dialog' args in element event handler do not affect to predefined handler and are specific for this element event only. To reset this dialog args data change handler and then get it back - predefined handler with its args will be set
// 		  In case of default event profile specified the user event is handle by element event handler and in case of absent one - by default profile event handler
//		  Example: create 'chat' or 'excel' event profile and set 'excel' as a default one for needful elements. Then these element interaction will act as an excel manner with KEYPRESS and F2 editing cell, DEL deleting cell text and etc..
// Todo - Functions to be released: request ip/subnet list at OV open via input dialog and display 'setki.xls' for these ips/subnets

// Controller and event handlers
// Todo - Handler cmd line macroses (replacements) - <oid>, <eid>, <date>, <OD>, <OV>, <ODid>, <OVid>
// Todo - Single/Multipile select as a native handler that allows to select predefined values
// Todo - Negative queue value (the scheduler sleep for) in msec on crontab line
// Todo - Task manager restrict call (or/and call with no task delete option) for the user in his property settings and send only active handler list instead of their wrapeed dialog structure
// Todo - Every use event has timeout the handler proccess it. The match of the user/event/odid/oid/eid record in event/message queue doesn't allow duplicated until the timeout exceeds. The record in event/message queue is removed after the handler responce or timeout occur
//        Another more strict option is to consider only user/event/odid/oid combination for element id, so user double cliked on any object element is unable generate another double click event on other object element, so controller call is not perfomed until response or timeout
// Todo - Create system user read-only customization like github interface, for a example, so users can use it via 'force' option in user-customization dialog
// Todo - Single OV click: OV is already open ? bring OV to top or refresh if already on top : open in a current view or in a new view if no any view exist.
//		  Context menu 'open in a new view' opens OV in a new view anyway, action is grey/absent for already opened OV. Do not forget to limit max open views
// Todo - UPDATE handler command (in a addition to SET/RESET) creates new object version only in case of at least one user-defined element changed
// Todo - Don't log message in case of previous msg match, but log 'last message repeated 3 times'
// Todo - System call 'NEWOBJECT' (to create object by user handlers) and 'COPY' to copy data to the buffer
// Todo - Event command line are not single line, but multiple. Controller runs first line handler, gets its data, other lines handlers may run in detached mode or may be used as a comments
// Todo - Release CHANGE event subscribing feature to allow non-native object (another words - object subscribes for CHANGE event of other object in DB) elements react on
// Todo - Controller dialog message: how to escape divider char '/'? Via '\/'?
// Todo - event 'VIEWREFRESH' occurs at OV open/refresh, the hanlder for this event is called similar 'NEWOBJECT' event
// Todo - How to call dialog to add new object instead of retreiving element data from vitrual object (id=-1)
// Todo - Release system calls 'NEWOBJECT' and 'DELETEOBJECT' (don't mess with self-titled events), so the handlers can create/remove multiple objects
// Todo - Discover new object:
//		  Object selection: SELECT NONE
//		  Define handler for any one element for event SCHEDULE 
//		  In case of no any object selected in object selection process  the handler is executed once with object id 0 (or -1..3) as input arg (plus object list ip addresses, for a example).
//		 		The handler runs in detach mode or answers with two possible system calls 'DELETEOBJECT' and 'NEWOBJECT' (other cmds are ignored).
//		  So based on input args the handler can discover (create) new objects or destroy (delete) in range of user defined pool

// Element layout
// Todo - warning message (or just complete dialog?) and regexp search (emulates ctrl+shift+f at OV open) as a start event. Also emulate via start event 'select all objects and then delete them'
// hiderow/hidecolumn - regexp feature with flag i for all cells in rows/columns match successful case
// Todo - virt cell depends on oid,eid
// Todo - sql request in 'Element Layout' section in 'value' prop should select among its view object selection, but not from all objects! (see models piechart among switches with one or zero active clients)

// Rules
// Todo - when a rule is rejected for the event CHANGE - old element data is set. If element data is overwriten in element layout 'value' prop, the old element data is set anyway.
// Todo - add rule action 'do nothing' (for log only goal and some db sql actions)

// Object selection  
// Todo - second and all next queries (for non Tree view types only) do query in previous query results

// Front-end
// Todo - smooth scrolling for rows more than 500 - event preventdefault on scroll event plus settimeout (dispatch scrolling event, 100);
// Todo - Customize scrollbars via user customization and other non-css props (for a example 'animation appearance')
// Todo - Check opera bug mouseup event at right mouse btn release while dragging while mouse guesters enabled in opera settings

// Presentation
// Todo - Y-combinator
// Todo - big amount of data with faaster and quick perfomance
// Todo - data is native
// Todo - data constructor
// Todo - voting
// Todo - keep last twoversions
// Todo - don't add objects more than 100
// Todo - cell text is not writable in case of change from 'mark' to 'john', but not from 'john' to 'mark'
// Todo - to leave only last two versions create rule: delete from data_1 where id=:oid and version <= :postversion -2, odtable -> odid!
