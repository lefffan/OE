import { app } from './application.js';
import { SVGUrlHeader, SVGRect, SVGPath, SVGText, SVGUrlFooter, AdjustString, TAGHTMLCODEMAP, lg } from './constant.js';
import { Interface } from './interface.js';

const TITLEVIRTUALROWID     = -2;
const NEWVIRTUALROWID       = -1;
const UNDEFINEDSELECTION    = 'Undefined database object selection!';
const MAXVIEWTABLEWIDTH     = 131072;
const MAXVIEWTABLEHEIGHT    = 131072;
const ELEMENTCOLUMNPREFIX   = 'eid';
const EDITABLE              = 'plaintext-only';
const NOTEDITABLE           = 'false';

function CheckXYpropsCorrectness(object)
{
 return typeof object.x === 'string' && typeof object.y === 'string' && object.x && object.y && !NONEXPRESSIONCHARS.test(object.x) && !NONEXPRESSIONCHARS.test(object.y);
}

export class View extends Interface
{
 static style = {
	               // dialog box title
                 ".ovbox":              { "position": "absolute;", "overflow": "auto;", "min-width": "10%;", "min-height": "3%;", "border-radius": "4px;", "width": "30%;", "height": "30%;", "background-color": "RGB(230,230,230);" }, // Old stable version values: "background-color": "#EEE;", "scrollbar-color": "#CCCCCC #FFFFFF;"
	             ".ovbox h1":           { "width": "100%;", "margin": "0;", "text-align": "center;", "position": "absolute;", "top": "50%;", "transform": "translateY(-50%);" },
		         ".ovbox table":        { "margin": "20px 0 0 0;" },
		         ".undefinedcell":      { "padding": "10px;", "border": "1px solid #999;", "background-color": "" },
		         ".titlecell":          { "padding": "10px;", "border": "1px solid #999;", "color": "black;", "text-align": "center;", "background-color": "#CCC;", "font": "" },
		         ".newobjectcell":      { "padding": "10px;", "border": "1px solid #999;", "color": "black;", "text-align": "center;", "background-color": "#EFE;", "font": "" },
		         ".interactivecell":    { "padding": "10px;", "border": "1px solid #999;", "color": "black;", "text-align": "center;", "background-color": "",      "font": "12px/14px arial;" },
		         ".noninteractivecell": { "padding": "10px;", "border": "1px solid #999;", "color": "black;", "text-align": "center;", "background-color": "#EEE;", "font": "12px/14px arial;" },
		         ".virtualcell":        { "padding": "10px;", "border": "1px solid #999;", "color": "black;", "text-align": "center;", "background-color": "#EEE;", "font": "12px/14px arial;" },
                 ".cursorcell":         { "outline": "red solid 1px;" }, 
                 ".clipboardcell":      { "outline": "red dashed 2px;" }, 
		         ".selectedcell":       { "background-color": "rgb(189,200,203) !important;" },
		         [`.ovbox table tbody tr td:not([contenteditable=${EDITABLE}])`]: { "cursor": "cell;" },
                };

 constructor(...args)
 {
  if (!args[2]?.control) args[2].control = { text: {}, closeicon: {}, fullscreenicon: {}, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, default: {}, closeesc: {} };
  args[3] = { class: 'ovbox selectnone', style: 'left: 300px; top: 300px; background-color: RGB(230,230,230);' };
  super(...args);
 }

 // Init OV params
 InitView(msg)
 {
  lg(msg);
  this.odid = msg.data.odid;
  this.ovid = msg.data.ovid;
  this.props.control.text.icon = SVGUrlHeader(250, 18) + SVGText(3, 14, `database id ${msg.data.odid}, view id ${msg.data.ovid}, sequence ${msg.id}`) + SVGUrlFooter();
  this.RefreshControlIcons();
  this.sidebarview = this.parentchild.sidebar.od[this.odid]['ov'][this.ovid];
  this.sidebarview.status = 0;
  this.sidebarview.childid = this.id;
  this.valuetableWidth = this.valuetableHeight = 0;
  this.collapsedrows = {};
  this.collapsedcols = {};
  this.definedcols = {};
  this.valuetable = [];
  this.objecttable = {};
  this.interactive = msg.data.interactive;
  this.layout = msg.data.layout;
 }

 // Function evaluates row expression and returns incoming cell for successful result or undefined
 TestRowExpression(row, r, c, q)
 {
  let result;
  try { result = eval(row); }
  catch {}
  return result ? true : false;
 }

 // Function binds incoming cell to main table array and object table
 // valuetable[y][x] = objecttable[o][e] = { row:, col:, x:, y:, value:, hint:, attributes:, collapserow:, collapsecol:, o:, e:, prop: }
 SetCell(cell, r, c, q)
 {
  if (!('x' in cell) || !('y' in cell) || !('value' in cell)) return; // No x or y or value cel props defined? Cell is incorrect. return
  let x, y;
  try {
       x = eval(cell.x); // Evaluate cell x cooredinate
       y = eval(cell.y); // Evaluate cell y cooredinate
      }
  catch {}
  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) return; // Cell is incorrect for non numberd x/y values
  cell.x = x = Math.round(x); // Fix it to nearest integer
  cell.y = y = Math.round(y);
  if (x < 0 || y < 0 || x >= MAXVIEWTABLEWIDTH || y >= MAXVIEWTABLEHEIGHT) return; // Check out of range
  if (x >= this.valuetableWidth) this.valuetableWidth = x + 1;
  if (!this.valuetable[y]) this.valuetable[y] = []; // Bind cell object to main table
  if ('collapserow' in cell) this.collapsedrows[y] = true;
  if ('collapsecol' in cell) this.collapsedcols[x] = true;
  delete cell.collapserow;
  delete cell.collapsecol;
  this.definedcols[x] = true;
  this.valuetable[y][x] = cell;
  if (!cell.lastversion || !cell.o || !cell.e || cell.e.indexOf(ELEMENTCOLUMNPREFIX) !== 0) return;
  if (!this.objecttable[cell.o]) this.objecttable[cell.o] = {};
  if (!this.objecttable[cell.o][cell.e]) this.objecttable[cell.o][cell.e] = [];
  this.objecttable[cell.o][cell.e].push(cell); // and object table
 }

 // Function joins cells via overwriting their attributes one by one
 JoinCells(...cells)
 {
  let result;
  for (const cell of cells)
      {
       if (!cell || typeof cell !== 'object') continue; // Continue for incorrect cell
       if (!result && (result = cell)) continue; // Assign first correct cell to the result object and continue
       for (const prop of ['x', 'y', 'value', 'hint', 'collapserow', 'collapsecol']) if (typeof cell[prop] === 'string') result[prop] = cell[prop]; // Copy this string props
       if (cell.attributes && typeof cell.attributes === 'object') // Property 'attributes' instead of direct copy is parsed to its own props (html attributes) which in turn will be overwritten by next cell props below
          {
           if (!result.attributes) result.attributes = {}; // Result cell contains no attributes at all, so create it empty
           for (const attribute in cell.attributes) // Go through all attributes
               {
                if (typeof cell.attributes[attribute] === 'string') result.attributes[attribute] = cell.attributes[attribute]; // and overwrite all string attributes from cell.attributes to result.attributes object
                if (attribute !== 'style') continue; // Handle object type 'style' attribue specifically, see below
                if (!result.attributes.style) result.attributes.style = {}; // Result cell attribute 'style' doesn't contain attribute 'style'
                for (const style in cell.attributes.style) if (typeof cell.attributes.style[style] === 'string') result.attributes.style[style] = cell.attributes.style[style]; // Copy all style string props to result.attributes.style object
               }
          }
      }
  return result; // Return result cell combined all props from cell list
 }

 // Function converts all input args to objects and union them via Object.assign (with style object apparently). Target object is converted to HTML attribute string then
 ConvertHTMLAttributeObjetsToStrings(...objects)
 {
  const result = {};
  const style = {};
  for (let object of objects)
      {
       object = this.ConvertHTMLAttributeStringToObject(object);
       if ('style' in object) Object.assign(style, object.style);
       Object.assign(result, object);
      }

  result.style = '';
  for (const prop in style) result.style += `${prop}: ${style[prop]}; `;
  if (!result.style) delete result.style;

  let string = '';
  for (const prop in result) string += `${prop}="${result[prop]}" `;
  return string.substring(0, string.length - 1);
 }

 // Function converts HTML attributes string to object with attribute names as a property names and its values
 // Remark - objects are untouched, strings are converted, other types are converted to empty objects
 ConvertHTMLAttributeStringToObject(string)
 {
  if (typeof string === 'string') string = string.trim();
  const attributes = typeof string === 'object' && string ? string : {};
  const array = typeof string === 'string' && string ? string.split('"') : []; // Split attributes string
  for (let i = 0; i < array.length; i = i + 2)
      {
       let name = array[i].trim(), value = array[i + 1]; // where 1st part is a name, second is a value
       if (name[name.length - 1] !== '=' || name.length < 2) continue; // Attribute name last char is not '=' or length < 2? Continue
       if (value === undefined) continue; // Attribute value is undefined? Continue
       name = name.substring(0, length - 1).toLowerCase(); // Cut attribute name last char '=' and bring it to lower case
       if (name === 'style') // HTML attribute 'style' should be processed specifically
          {
           const styles = value.split(';'); // Split style to its props
           value = {}; // and store to value object
           for (const style of styles)
               {
                const pos = style.indexOf(':'); // with syle name before ':' and style value after ':'
                if (pos !== -1 || !style.substring(0, pos).trim()) value[style.substring(0, pos).trim()] = style.substring(pos); // No ':' char found or empty style name - no store
               }
          }
       attributes[name] = value; // Collect all props to 'attributes' object
      }
  return attributes;
 }

 Handler(msg)
 {
  switch (msg.type)
         {
          case 'SETVIEW':
               // Step 1 - init OV params and handle some errors, such as incoming msg 'error' property or undefined selection (which is impossible cause undefined selection may be in a try-catch exception only and generates an 'error' in msg)
               this.InitView(msg);
               if (msg.data.error || !msg.data.selection) return this.DisplayView(msg.data.error ? `<h1 style="color: RGB(251,179,179);">${msg.data.error}</h1>` : `<h1 style="color: RGB(251,179,179);">${UNDEFINEDSELECTION}</h1>`);
               const layout = this.layout;
               const q = this.q = msg.data.selection.length;

               // Step 2 - adjust convert layout all cell attributes from string type to object type to simplificate cell html attributes override, in a addition set cell for udnefined rows (virtual) which have row/column/oid undefined, so cell content needs to be retreived from the cell.value only
               for (const xy in layout.undefinedrows)
                   {
                    const cell = layout.undefinedrows[xy];
                    cell.attributes = this.ConvertHTMLAttributeObjetsToStrings({ class: 'virtualcell' }, this.ConvertHTMLAttributeStringToObject(cell.attributes)); // Cell HTML attributes priority: combine GUI customization and then layout attributes
                    this.SetCell(cell, undefined, undefined, q);
                   }
               for (const row in layout.expressionrows) for (const column of layout.columns)
                   {
                    const cell = layout.expressionrows[row][column.original];
                    cell.attributes = this.ConvertHTMLAttributeStringToObject(cell.attributes);
                   }

               // Step 3 - handle db selection rows with two virtual rows ('title' and 'new') before
               for (let r = TITLEVIRTUALROWID; r < q; r++)
                   {
                    if (r === NEWVIRTUALROWID && !this.interactive) continue; // No lookup for new object input in case of non-interactive mode
                    const row = r >= 0 ? msg.data.selection[r] : undefined; // Redefine selection row
                    const o = r < 0 ? r : this.interactive ? row[layout.columnidindex] : undefined; // Assign object id to TITLEVIRTUALROWID (-2), NEWVIRTUALROWID (-1) or row[id] (>=0) for interactive and undefined for noninteractive
                    const attributes = {};
                    if (r === TITLEVIRTUALROWID) attributes.class = 'titlecell';
                    if (r === NEWVIRTUALROWID) attributes.class = 'newobjectcell';
                    for (const c in layout.columns)
                        {
                         const column = layout.columns[c]; // Fix layout column  
                         const cell = {};
                         for (const i in layout.expressionrows) if (this.TestRowExpression(layout.expressionrows[i][column.original].row, r, +c, q)) this.JoinCells(cell, layout.expressionrows[i][column.original]);
                         [cell.o, cell.e, cell.prop, cell.lastversion] = [o, column.elementname, column.elementprop, row?.[layout.columnlastversionindex]];
                         if (typeof cell.value !== 'string')
                            {
                             let value = row?.[c];
                             if (r === TITLEVIRTUALROWID && cell.e) value = layout.systemelementnames[cell.e] ? cell.e : column.elementprofilename;
                             if (value && typeof value === 'object') cell.value = JSON.stringify(value); // Bring cell.value to appropriate value depending on its type. Todo0 - fix in help: use columns with data type explicitly set via :: with alias via ' as ', cause "eid1::json->'valu'" becomes "eid1"
                              else if (typeof value === 'number') cell.value = value + '';
                               else cell.value = typeof value === 'string' ? value : '';
                            }
                         if (r >= 0) attributes.class = cell.e && !layout.systemelementnames[cell.e] && cell.lastversion && this.interactive ? 'interactivecell' : 'noninteractivecell';
                         if (r === TITLEVIRTUALROWID && cell.e) attributes.title = layout.systemelementnames[cell.e] ? layout.systemelementnames[cell.e] : column.elementprofiledescription;
                         cell.attributes = this.ConvertHTMLAttributeObjetsToStrings(attributes, this.ConvertHTMLAttributeStringToObject(cell.attributes), row?.[column.columnattributeindex] ? this.ConvertHTMLAttributeStringToObject(row[column.columnattributeindex]) : {}); // Cell HTML attributes priority: combine GUI customization first, second - then layout attributes, third - element json data retreived from db selection (for json type elements only)
                         this.SetCell(cell, r, +c, q);
                        }
                   }

               // Step 4 - hanlde result table zero height or display OV table
               this.DisplayView(this.valuetable.length ? undefined : `<h1 style="color: #9FBDDF;">Object View has no any data matched its object selection or element layout!</h1>`); // Todo0 - check all columns on first row props
               break;
         }
 }

 DisplayView(errormsg)
 {
  // Step 1 - display error message and return setting view percent loading status to 100
  lg(this.valuetable);
  if (typeof errormsg === 'string')
     {
      this.elementDOM.innerHTML = errormsg;
      this.sidebarview.status = 100;
      return;
     }

  // Step 2 - init same tables vars
  this.sidebarview.status = 100;
  let disp = 0;
  const undefinedcell = `<td class="undefinedcell"></td>`;
  let undefinedrow = '<tr>';
  for (let x = 0; x < this.valuetableWidth; x++) if (!this.collapsedcols[x] && (this.definedcols[x] || !this.layout.table.collapsecol)) undefinedrow += undefinedcell;
  undefinedrow += '</tr>';
  const newtable = [];
  let inner = '';
  this.valuetableHeight = this.valuetable.length;

  // Step 3 - make result innerHTML of table cells
  for (let y = 0; y < this.valuetableHeight; y++)
      {
       if (this.collapsedrows[y] && (disp = disp + 1)) continue;
       if (!this.valuetable[y] && 'collapsedrow' in this.layout.table && (disp = disp + 1)) continue;
       if (!this.valuetable[y])
          {
           inner += undefinedrow;
           continue;
          }
       newtable[y - disp] = this.valuetable[y];
       inner += '<tr>';
       for (let x = 0; x < this.valuetableWidth; x++)
	       {
            const cell = this.valuetable[y][x];
	        if (this.collapsedcols[x] || (!cell && 'collapsedcol' in this.layout.table && !this.definedcols[x]))
               {
                this.valuetable[y].splice(x, 1);
                this.valuetableWidth--;
                x--;
                continue;
               }
	        if (!cell && (inner = inner + undefinedcell)) continue;
	        inner += `<td ${cell.attributes}>${cell.value}</td>`;
            cell.y -= disp;
	       }
       inner += '</tr>';
      }
  this.valuetable = newtable;
  this.valuetableHeight = this.valuetable.length; // Old version: this.valuetableHeight -= disp;
  this.elementDOM.innerHTML = `<table${typeof this.layout.table.attributes === 'string' ? ' ' + this.layout.table.attributes : ''}><tbody>${inner}</tbody></table>`;

  // 1st week:
  // Todo0 - relaese row[0-..] as a column value and row[c] - as a current cell value in a row expression
  // Todo0 - cell.hint for <td> and other cell attributes to <td> (cell.style for a example)
  // Todo0 - adjust cell attributes and cell innerHTML (cell.value)
  // Todo0 - handle errors - zero length table, zero db selection, x/y out of range, no any valid layout json VIA context menu description
  // 2nd week:
  // Todo0 - cursor/event release - this is a big and comlicated handler section
  // Todo1 - scale ovbox content via child management icon +-
  // Todo1 - loading percent status animation and blue/green view icon
 }
}

// View
// Todo - all view changes comes to client side with odid/ovid with object and its element ids. Controller passes all changes data to all clients that has this view opened.
//		  Initiator client apply all changes for this odid/ovid, non-initiator client for this odid/ovid also apply changes (if user has appropriate permissions, but if OV is opened, the user have ),
//		  and for other ovids with this odid client side check matched object ids with their elements and add 'new notification' in a sidebar
//        Combinations - opened|notopened, initiator|notinitiator, random-select|notrandom-select, source-view|notsource-view-but-has-its-oideid-combination
// Todo - regexp search should be implemented to all types of view including tree and map. Should js range be used instead of span highlighting in regexp search? Not only regexp search but search on mask with only one asterisk as a special char or just plain text
// Todo - In context menu description display Od and OV description from OV structure,
// Todo - application version, tel number and other contacts (something like 'please contact us support@tabels.app') in a extra tab on help context menu. Help contex menu is the for all modes (connection/view/sidebar)
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
// Todo - Setka via css https://dbmast.ru/fon-v-vide-diagonalnoj-setki-na-css
// Todo - View area specific style with background, radius and so on
// Todo - smooth scrolling for rows more than 500 - event preventdefault on scroll event plus settimeout (dispatch scrolling event, 100);

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
// Todo - SVG animation: https://habr.com/ru/articles/450924/ https://habr.com/ru/articles/667116/ https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/animateTransform https://developer.mozilla.org/ru/docs/Web/SVG/Reference/Element/animate

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
// Todo - Autonavigate command for OV, for a example single mouse cell click edit the text in. Mouse single click emulate command (NONE|DBLCLICK|KEYPRESS) or new user event 'CLICK'? Usefull for chats
// Todo - Table selection of this strings and values (hui1 space, hui2 space, hui3 space..) displays pie chart with hui1 - 100%, and 0% for other values, is it right?
// Todo - element cell style based not only oid/eid combinations, but on element cell value (so empty style attr [style=""] hides the row or styles it by some color, for a example)
// Todo - EDIT controller cmd limits text lines number to edit https://toster.ru/q/355711

// Todo - View examples to be released: request ip/subnet list at OV open via input dialog and display 'setki.xls' for these ips/subnets
//										arp table history for one ip/mac
// Todo - Background svg for a cell
// Todo - Reports of OD data via native postgres functional, ask Slava what reports he does to Megacom Bosses
// Todo - chars №№ being in 'td' tag are wraped for default. Why is it? Will it be at view table type? Fix it

// Element layout and Object Selection
// Todo - warning message (or just complete dialog?) and regexp search (emulates ctrl+shift+f at OV open) as a start event. Also emulate via start event 'select all objects and then delete them'
// Todo - sql request in 'Element Layout' section in 'value' prop should select among its view object selection, but not from all objects! (see models piechart among switches with one or zero active clients)
// Todo - Sort by header click for look like default element layout when header line at the top, bottom, left, right
// Todo - second and all next queries (for non Tree view types only) do query in previous query results

