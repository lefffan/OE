import { app } from './application.js';
import { Interface } from './interface.js';

export class View extends Interface
{
 static style = {};
}

// View
// Todo - all view changes comes to clint side with odid/ovid with object and its element ids. Controller passes all changes data to all clients that has this view opened.
//		  Initiator client apply all changes for this odid/ovid, non-initiator client for this odid/ovid also apply changes (if user has appropriate permissions),
//		  and for other ovids with this odid client side check matched object ids with their elements and add 'new notification' in a sidebar
//        Combinations - opened|notopened, initiator|notinitiator, random-select|notrandom-select, source-view|notsource-view-but-has-its-oideid-combination
// Todo - regexp search should be implemented to all types of view including tree and map. Should js range be used instead of span highlighting in regexp search? Not only regexp search but search on mask with only one asterisk as a special char or just plain text
// Todo - In context menu description display Od and OV description from OV structure, application version, tel number for additional help tab 'Contacts' and mail functional - please contact us support@tabels.app
// Todo - Build view via adding its elements (objects) with limited count, continuing later via settimout(callback, 0) just to not freeze user interface
//		  Load/reload view process is divided into two stages - receving server data and parsing it to fit element layout. First stage displays loading circle at view item in a sidebar.
//		  Data parsing second stage displays circle progress indicator of loaded data portions. Both stages are allowed to be cancelled via clicking inside the view rectangle. Should Esc key stop OV open process also?
//		  Not fininshed 2nd stage data displays red rectangle. The view content are not touched until the 2nd stage starts.
//		  This mechanism allows to not only avoid page freeze, but immediate handle of any incoming CALL/TABLE/TREE message with a new data and droping (direct deleting via js) previous CALL message data from controller.
//        But think behaviour of inactive tab via  if (!document.hidden){ //OV load code here } or may be release all OV rows adding via RequestAnimationFrame
//		  Insufficient memory error at big amount of OV data coming quickly for client browser not having time to handle that OV big growing data is solved.
//              In case you need run setTimeout(callback, 0) (i.e. create an immediate macrotask) in background, you can use MessageChannel. Chrome doesn't throttle it like setTimeout.
//                  const channel = new MessageChannel();
//                  channel.port1.onmessage = callback;
//                  channel.port2.postMessage(null);
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
// Todo - Object selection input args dialog data defines macroses specified in object selection string. Undefined macroses are empty strings. Dialog data interface props are macros names. No macroses in object selection string - no dialog call at OV open.
//          make object selection macroses defining via two ways - auto (all macroses in object selection are retreived automatically via dialog) or static (via user defined dialog). Empty static dialog calls no dialog and all macro in selection are retrieves in macroses list if exist
// Todo - Setka via css https://dbmast.ru/fon-v-vide-diagonalnoj-setki-na-css

// Tree view
// Todo - Second query in object selection (add it to the help/doc) should point to the second point of the tree. No second point - until the end of the tree. Point to point tree may be multipath
// Todo - Tree element layout style:
//		  for example to see what nodes are down by seeing them via red background
//  	  Tree wire name (arrow name) to mark fiber cooper radio..
//		  Node color or wire type should depend on some current object element values to mark nodes and its links status (node down, line down, etc..)
// Todo - Object content have element list on per line and should looks like this: "element head: element text value". All unfited text should be displayed at its cursor navigation to show full values (so for elements that act as a links)
//		  How to display image instead element values with its headers rectangles as a tree nodes?
// Todo - context menu: expand/hide uplink and downlink subtrees, description for tree view (object number, object selection parameteres..)
// Todo - loop element - show real looped object instead of read message
// Todo - nested level input to be displayed. For example, nested level 2 diaplys main switch with its direct downlink nodes and no more deeper levels of nodes
// Todo - keep input view parameters in a view history navigating, so open last viewed OV with input parameters used before. Access history of opened views via context menu or hot keys?
// Todo - SVG animation: https://habr.com/ru/articles/450924/ https://habr.com/ru/articles/667116/

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
// Todo - View examples to be released: request ip/subnet list at OV open via input dialog and display 'setki.xls' for these ips/subnets
//										arp table history for one ip/mac
// Todo - Border svg for a cell
// Todo - Reports of OD data via native postgres functional, ask Slava what reports he does to Megacom Bosses
// Todo - chars №№ being in 'td' tag are wraped for default. Why is it? Will it be at view table type? Fix it
