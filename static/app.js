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


// Some mrtg and other database features for Megacom appliance
// Todo - discuss how will megacom nodes/switches will be edited by L1 support? Via template card (application dialog with node name, ip, address.. etc)?
// Todo - add startel nodes
// Todo - discuss wich tabs to create as they are in our current mrtg. Left/right/N-Z/Fiziki?
// Todo - Discuss megacom user/groups and their rights
// Todo - Link names for usual uplink, mpls uplink, switchport/vlps uplink, rezerv uplink..
// Todo - Chats like in mattermost?
// Todo - Host/node elements: 1-100 ports, 101 hostname, 102 hardware, 103 location, 104 ip, 105 Status. Should hardware-mac, node-number and checked-by-soa element be added?
// Todo - Ctrl+F12 - uplink tree from current object (any element)
// Todo - Alt+F12 - downlink tree from current object (any element)
// Todo - Shift+Ctrl+F12 - Map tree up from current object (any element)
// Todo - Shift+Alt+F12 - Map tree down from current object (any element)
// Todo - ALT+S - point to point tree (any element)
// Todo - ALT+H - history (any element)
// Todo - ALT+L - downlink tree client list (any element)
// Todo - F2, KEYPRESS - edit value for L2 only (any element)
// Todo - DEL - delete content via confirmation (any element)
// Todo - DBLCLICK - edit card dialog box for tehuchet, info, contacts, names, loaction.. (location element)
// Todo - DBLCLICK with ctrl|alt|shift for UPLOAD, DOWNLOAD, UNLOAD and ctrl+alt for GALLERY (location element)
// Todo - F12 port diagnostic - client grafic in realtime, and mrtg grafics (port element)
// Todo - INS edit hint, style and snmpindex (port element)
// Todo - DBLCLICK - edit card dialog box (port type selection[free|client|service|uplink|downlink]: free[description becpmes empty], client[zayavka-ip-speed-licevoi-name-address], service[description only], up|down[description+link property]) (port element)
// Todo - F12 host diagnostic - switch with port list with their links up or down (non-port element)
// Todo - INS hint, style + snmpgroup, for hardware element only (non-port element)
// Todo - Create corp chat with source code pass, image pass and some popular messanges features to make comfortable user dialogs. Apply emodzi pass also and see new features of mattermost (or other corp chat) new version
// Todo - Create orp addrbook, stuff list with foto, tel, dolzhnost. Tabel. Stuff vacations (otpusk). Grafik raboty
// Todo - Union some request apps (like Helpdesk or CRM) where one zayavka for helpdesk, podkluchenie, otkl, expluataciya.
//	      Develop helpdesk - how does object selection should calculate expired orders/requests? Versions date difference is more than three days?
// Todo - . MRTG
// Todo - . Zabbix (See how zabbix is install to have point of view of that kind of applications)
// Todo - . ACS
// Todo - . Any accounting system (may be billing)
// Todo - 0. Voting
// Todo - . Any statistic/analitycs
// Todo - . Setki.xls
// Todo - . Tech uchet
// Todo - . Wiki
// Todo - . Operation Journal:
    Switch ip, switch description, switch location,
    60 ports (description), for every port: type (uplink,downlink,free,service,client),
    diagnostic (pings, grafiki, port config, port errors, asr speed, mac, mac-vendor, checkhost, name from billing) and convert all this info to pdf in a new tab, if port type is 'client', then display client name from billing
    In INFO scheme find mac on every switch in OV
    In setki - ip, name from TABELS, name from BILLING, mac (for buhgalters and FSB)
    Button to destruct client conf,int et 1/0/2,shut, no fl c, no band c,  sw mode acc,  sw acc vl 666,  speed aut, end,wr
    see client mac, cable length, errors and all other data the switch allows to monitor
    ping <switch ip>, on port ping <client ip>
16. Paraga mail functional
17. Ask Hramcova analitiku po helpdesku
18. See functions on Slava's management system
19. First stage: oper+slavina, setki, tech uchet, HD, adrbook
20. Second stage: zabbix, CRM, corp chat, wiki

// Application architecture
// Todo - all db operations via one function
// Todo - db readonly replicas?
// Todo - app containers via docker?
// Todo - Make logs and handlers manager accessable in 'System Manage' context menu
// Todo - Application global users allowed all. For a example - root user.
// Todo - 
// Todo - 

// View
// Todo - all view changes comes to clint side with odid/ovid with object and its element ids. Controller passes all changes data to all clients that has this view opened.
//		  Initiator client apply all changes for this odid/ovid, non-initiator client for this odid/ovid also apply changes (if user has appropriate permissions),
//		  and for other ovids with this odid client side check matched object ids with their elements and add 'new notification' in a sidebar
// Todo - regexp search should be implemented to all types of view including tree and map
// Todo - In context menu description display Od and OV description from OV structure
// Todo - Build view via adding its elements (objects) with limited count, continuing later via settimout(callback, 0) just to not freeze user interface
//		  Load/reload view process is divided into two stages - receving server data and parsing it to fit element layout. First stage displays loading circle at view item in a sidebar.
//		  Data parsing second stage displays circle progress indicator of loaded data portions. Both stages are allowed to be cancelled via clicking inside the view rectangle. Should Esc key stop OV open process also?
//		  Not fininshed 2nd stage data displays red rectangle. The view content are not touched until the 2nd stage starts.
//		  This mechanism allows to not only avoid page freeze, but immediate handle of any incoming CALL/TABLE/TREE message with a new data and droping (direct deleting via js) previous CALL message data from controller.
//		  Insufficient memory error at big amount of OV data coming quickly for client browser not having time to handle that OV big growing data is solved.
// Todo - Fix error while calling all hosts, then calling 'random 2 hosts' displays 'random 2 host' view, then 'all hosts' is displayed. Build incoming message broker.
// Todo - warning as a start event at element layout
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

// Controller and event handlers
// Todo - Handler cmd line macroses (replacements) - <oid>, <eid>, <date>, <OD>, <OV>, <ODid>, <OVid>
// Todo - Single/Multipile select as a native handler that allows to select predefined values
// Todo - Negative queue value (the scheduler sleep for) in msec on crontab line

IV-----------------------------------------------Application concept:
###########  when a rule is rejected for the event CHANGE - old element data is set rewriting the case that data is overwriten in element layout 'value' prop
###########  deprecate view.php via pcntl_fork
###########  data_id, uniq_id and head_id! (to easy the way to transfer object databases wuth its structures!
  regexp search as start event emulates ctrl+shift+f at OV open
  hiderow/hidecolumn - regexp feature with flag i for all cells in rows/columns match successful case
###########  add rule action 'do nothing' (for log only goal and some db sql actions)
###########  Second and all next queries for non Tree view types are queries in previous query tables
  regexp search - range js instead of span highlighting
  Paste file or image to object element (or drag and drop to the corresponded cell)
###########  Release 'view in a new tab' via call cmd, for example to show user object versions apparently main view in a new tab      https://question-it.com/questions/1384714/otkryt-novuju-vkladku-okno-i-napisat-v-nee-chto-nibud
  Downloading big files don't show progress bar downloading process, so how to show it?
  Fetch progress for uploading files https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload
  Application version in System description, tel number for additional help tab 'Contacts' and mail functional - please contact us support@tabels.app
  Export OV data to xls/txt file
  autocomplete feature after handler edit command. Autocomplete data may be retrieved from other OD, for example, client list or street list.
  what about edit after edit command, for a example wrong text to confirm and edit command called once again?
###########  GALLERY shows all foto for default, otherwise - specified foto
    Show image properties (like resolution) in GALLERY mode
  not only regexp search but search on mask with only one asterisk as a special char
  macroses like in joe
  one/multiple user instance
###########  virt cell depends on oid,eid
  Context menu Graph
###########  Task manager: restrict call (and call with no task delete option) of task manager for some users in user props, and use ps ax with client side handling instead of dialog generation by taskmanager.php for more quicker processing!
  At the end of app stable version make new customization
  Any cell has attached files. Cell text is displayed for default, but:
    if image prop is set - display image with text below
    if audio prop is set - display player like in whatsup
    if stream(video) prop is set - display stream from camera (like forpost) or video file playing
  sql request in 'Element Layout' section in 'value' prop should select among its view object selection but not from all objects! (see models piechart among switches with one or zero active clients)
  add in system description something like 'it has a 'game' style interace color but offers a powerful functionality'
V-----------------------------------------------Back-end:
  Optimize mysql to highload app:
    use one function to operate sql commands in order to migrate to another database type - not related, for a example, or mysql instead of maria db
    index columns: alter table data_1 add index (`lastversion`);
    unbuffered queries and partial OV output mysql_unbuffered_query()
    https://www.sqlstyle.guide/ru/
  Problems of deploying - can i use maria db on commerisal base? 
  Use another user (instead of root) with priv granted to 'OEDB' database only and Unicode for MySQL https://mathiasbynens.be/notes/mysql-utf8mb4 http://phpfaq.ru/mysql/charset
  secure php.ini and can socket number be more than 1024?
  What time and bytes limit should be set to php script execution
  Secure database and sources to avoid assignment of my intellectual property. Incuded php files should be on unaccessable for user and not application dir. Restrict function dir from observing at the browser.
  socket rate limit https://javascript.info/websocket#rate-limiting
  To prevent user DDOS by user pressing F2 (for a example) user handler should be executed as a apparent apps and only once by one user?
  Secure: check origin header to be http or https to 192.168.9.39,
	The point here is, you have to check your websocket activity and determine rate limit: https://www.freecodecamp.org/news/how-to-secure-your-websocket-connections-d0be0996c556/
###########  divide core.php to make separate php file to be included in wrapper.php to make wrapper execution more faster
  See how zabbix is installed to have a point of view of serious application
###########  Big amount of users generates apparent DB records in queueviewcall function while user INIT or DELETE,
###########    so add/delete objects in a view with 10000 users attached will generate 10000 records (record pre user) to call the view to be refreshed, its too slowly
###########  All db operations (except handlers in wrapper.php, db config) should use the connection via user with read-only permissions to OE9. Or use rollBack at the end of read-only operation?
###########  Use pcntl_fork in schedulerwrapper.php in order to share var scope end exlude per handler db connection in wrapper.php
###########  All internal database structure should be stored in RAM SQL tuning
###########  backend files: const, connect, func, main

VI-----------------------------------------------Front-end:
###########  exlude blinking while refreshing sidebar (dont refresh in case of no changes) and smooth OD expanded to the view list
  non table area selecting - compare event mouse coordinate from drag x1,y1 and increase/decrease drag x2,y2 coordinate so
  smooth scrolling for rows more than 500 - event preventdefault on scroll event plus settimeout (dispatch scrolling event, 100);
  effects at navigating images in GALLERY just like in drive.ru
  Sort by header click for look like default element layout when header line at the top, bottom, left, right
  One or multiple cell selecting - buffer copy as text or/and as image (like excelc cells are copied into whatsup)
  Autonavigate command for OV, for a example single mouse click on a cell edit the element. Mouse single click command: NONE|DBLCLICK|KEYPRESS. Usefull for chats
  helpdesk/jira/CRM example in Help context menu
  Create system user read-only customization like github interface, for a example, so users can use it via 'force' option in user-customization dialog
  Chart for the next selection:
    hui1 space
    hui2 space
    hui3 space
    hui4 space
    displays hui1 - 100%, and 0% for others, is it right?
  element cell style based not only oid/eid combinations, but on element cell value (so empty style attr [style=""] hides the row or styles it by some color, for a example)
  At new OD creation use apply button CREATE DATABASE instead of CREATE
  Favicon change with number unread msges inside the rectangle
  OD Dialog Box - OD icon, OV icon (or ov type  icons for table, tree and so on), OV shortcut key
  Customize scrollbars via user customization and other non-css props (for a example 'animation appearance')
  OV open:
    Non opened OV - just OV click: open OV in a current child or in a new child (if no any child)
    Non opened OV - context menu 'OPEN IN A NEW WINDOW': open OV in a new child (do not forget to limit max open views). Action is grey/absent for already opend OV
    Opened OV - bring up the child and refresh OV (bad variant 2 - bring up the child for nonactive view and refresh for active view)
  Opera bug with mouseup event at right mouse btn release while dragging while mouse guesters enabled.
  Dialog box confirm flag on closeesc and close krestik, confirm close via misc prop for dialog btns
  Save current view (OV) to pdf and xls (via csv)

VII-----------------------------------------------Controller:
###########  prevent multiple call controller on one element from one user, example: multiple key press while server didn't respond the previous event
###########  If last log message equals previous - don't log it, just increment previous log message counter
###########  UPDATE handler command (in a addition to SET/RESET) that creates object version only in case of at least one user-defined element change
  EDIT controller cmd limits text lines number to edit https://toster.ru/q/355711     https://toster.ru/q/518758   http://qaru.site/questions/190792/limiting-number-of-characters-in-a-contenteditable-div
  Non local server (cloud) implemented handlers
  handler command to copy data to the buffer
  handler commands are not single line, but multiple. Controller runs first line handler, gets its data, other lines handlers may run in detached mode or may be used as a comments
  System call 'NEWOBJECT' (to create object by user handlers)
  CHANGE event subscribing feature to allow non-native object (another words -  object subscribes for CHANGE event of other object) elements react on
  Put all events to text log file in /var/log
  Controller dialog message - how to escape divider char /? May be: \/
VIII-----------------------------------------------Presentation:
Y-combinator
big amount of data with faaster and quick perfomance
data is native
data constructor
voting
keep last twoversions
don't add objects more than 100
readonly from mark to john, but not from john to mark
to leave only last two versions create rule: delete from data_1 where id=:oid and version <= :postversion -2, odtable -> odid!
Pagination is not implemented, use OV dirs with page ranges per view in this dir. Should i use it or app concept is to out whole selection and manage object number by its object selection? should i use page output when next portion of objects are displayed by reaching screen bottom at scrolling? So implemet object-per-page (and other features around) in user customization misc configuration
