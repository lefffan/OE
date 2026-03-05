import { Application } from './application.js';
import { Interface } from './interface.js';
import { ContextMenu } from './contextmenu.js';
import * as globals from './globals.js';

const TITLEVIRTUALROWID     = -2;
const NEWVIRTUALROWID       = -1;
const UNDEFINEDSELECTION    = 'Undefined database object selection!';
const EMPTYSELECTION        = 'Object View table is empty, no any data matched its object selection and/or element layout!';
const COLLAPSEDSELECTION    = 'Object View table is empty, all table cells are collapsed!';
const OUTOFRANGESELECTION   = 'Object View table is empty, all data has its x/y cell coordinates out of range!';
const MAXVIEWTABLEWIDTH     = 256 * 1024;
const MAXVIEWTABLEHEIGHT    = 256 * 1024;
const MAXVIEWCELLS          = 1024 * 1024;
const LEFTSIDE	   			 = 0b1000; 
const TOPSIDE					 = 0b0100; 
const RIGHTSIDE				 = 0b0010; 
const BOTTOMSIDE	   		 = 0b0001; 
const CURSOROFFSETS         = { ArrowUp: { y: -1 }, ArrowDown: { y: 1 }, ArrowLeft: { x: -1 }, ArrowRight: { x: 1 } };


function CheckXYpropsCorrectness(object)
{
 return typeof object.x === 'string' && typeof object.y === 'string' && object.x && object.y && !NONEXPRESSIONCHARS.test(object.x) && !NONEXPRESSIONCHARS.test(object.y);
}

export class View extends Interface
{
 constructor(...args)
 {
  if (!args[2]) args[2] = {};

  const mouseareaselect = { elements: [], button: 0, captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', callback: [View.MouseAreaSelectControl] };
  if (!args[2].control) args[2].control = { text: {}, closeicon: {}, fullscreenicon: {}, resize: {}, resizex: {}, resizey: {}, mouseareaselect: mouseareaselect, default: {}, drag: {}, fullscreendblclick: {} };

  args[2].animation = 'slideleft';
  if (!args[2].attributes) args[2].attributes = { class: 'ovbox selectnone', style: 'left: 300px; top: 300px; background-color: RGB(230,230,230);' };

  super(...args);
  this.props.control.drag.elements = this.props.control.fullscreendblclick.elements = [this.elementDOM];
  for (const controlname of ['resize', 'resizex', 'resizey', 'fullscreenicon', 'fullscreendblclick']) this.props.control[controlname].callback.push(this.Render.bind(this));
  this.ChangeHeader(this.data);
  this.range = document.createRange();   
  this.selection = window.getSelection();
 }

 // Change view header
 ChangeHeader(data)
 {
  this.odid = data.odid;
  this.ovid = data.ovid;
  this.status = data.status;
  const statusstring = this.status === -1 ? 'server pending..' : `loaded ${this.status}%`;
  this.props.control.text.icon = globals.SVGUrlHeader(350, 18) + globals.SVGText(3, 14, `database id: ${this.odid}, view id: ${this.ovid}, status: ${statusstring}`) + globals.SVGUrlFooter();
  this.RefreshControlIcons();
 }

 // Init OV params based on incoming message
 InitView(event)
 {
  this.cellscount = this.cellsoutofrange = 0;
  this.valuetableWidth = this.valuetableHeight = 0;
  this.columnWidths = [];
  this.rowHeights = [];
  this.valuetable = [];
  this.objecttable = {};
  this.interactive = event.data.interactive;
  if (this.layout = event.data.layout)
     {
      this.layout.collapsedrows = {};
      this.layout.collapsedcols = {};
      this.layout.definedcols = {};
      this.layout.virtualcells = {};
      this.layout.event = { event: '', x: 0, y: 0 };
     }
  this.scrollingcontainer = null;
  this.gridcontainer = null;
  this.cursor = null;
  this.contentEditable = null;
 }

 // Function makes OV table cell text content editable with 'data' as a initial text content if exist
 MakeCellContentEditable(cell, data, force)
 {
  if (this.contentEditable && !force) return; // No multiple cells with content editable feature turned on allowed.
  const target = this.GetGridCoordinatesElement(cell.x, cell.y); // Get x,y coordinates table cell target
  if (!target) return;
  target.focus(); // and focus
  try { target.contentEditable = globals.EDITABLE; } // Set DOM element contentEditable property to 'plaintext' or 'true'
  catch { target.contentEditable = 'true'; } // Fucking FF doesn't support 'plaintext' contentEditable type on 2020 year
  target.innerHTML = Application.AdjustString(typeof data === 'string' ? data : cell.value, Application.HTMLINNERENCODEMAP); // Adjust the content substituting cell value or <data> if exist
  this.range.selectNodeContents(target); // Set cursor at the end of the content
  this.range.collapse(false);
  this.selection.removeAllRanges();
  this.selection.addRange(this.range);
  this.contentEditable = cell; // Turn on content editable feature to cancel it for other cell while it set for at least one cell
  target.classList.add('celleditmode');
 }

 // Function makes OV table cell text content editable with 'data' as a initial text content if exist
 CancelCellEditableContent(cell)
 {
  if (!this.contentEditable) return;
  const target = this.GetGridCoordinatesElement(cell.x, cell.y); // Get x,y coordinates table cell target
  if (!target) return;
  target.contentEditable = globals.NOTEDITABLE; // Turn off target <contentEditable> var
  target.classList.remove('celleditmode');
  target.innerHTML = Application.AdjustString(cell.value, Application.HTMLINNERENCODEMAP, Application.ELEMENTINNERALLOWEDTAGS); // Roll back cell text content
  this.contentEditable = null; // Turn off content editable feature to allow other cells to have this feature turned on
 }

 ConfirmCellEditableContent(addnewobject)
 {
  if (!this.contentEditable) return;
  const cell = this.contentEditable;
  const target = this.GetGridCoordinatesElement(cell.x, cell.y); // Get x,y coordinates table cell target
  if (!target) return;
  target.contentEditable = globals.NOTEDITABLE; // Turn off target <contentEditable> var
  target.classList.remove('celleditmode');
  cell.value = Application.AdjustString(target.innerHTML, Application.HTMLINNERDECODEMAP); // Apply cell inner encoding back all special chars
  target.innerHTML = Application.AdjustString(cell.value, Application.HTMLINNERENCODEMAP, Application.ELEMENTINNERALLOWEDTAGS); // Roll back cell text content
  this.contentEditable = null; // Turn off content editable feature to allow other cells to have this feature turned on

  if (cell.oid === NEWVIRTUALROWID && !addnewobject) return; // Shouldn't add new object for NEWVIRTUALROWID object with no <addnewobject> var set, so do nothing and return
  if (!addnewobject) return { type: 'CONFIRMEDIT', data: cell.value }; // Apply cell text content via CONFIRMEDIT client event to the controller

  const data = {};
  if (this.objecttable[NEWVIRTUALROWID]) for (const e in this.objecttable[NEWVIRTUALROWID]) data[e] = this.objecttable[NEWVIRTUALROWID][e][0].value;
  return { type: 'INIT', data: data }; // Apply all NEWVIRTUALROWID object elements text content via INIT client event to the controller
}

 DispatchMouseKeyboardEvent(event)
 {
  if (!this.interactive) return;
  let eventpos;
  if (event.type !== 'dblclick' && (eventpos = globals.NATIVEKEYBOARDEVENTS.indexOf(event.code)) === -1) return;
  const [x, y] = event.type === 'dblclick' ? this.GetElementGridCoordinates(event.target) : [this.cursor.x, this.cursor.y];
  const cell = this.valuetable?.[y]?.[x];
  if (!cell?.interactive) return;
  const addon = { odid: this.odid, ovid: this.ovid, oid: cell.oid, eid: cell.ename, prop: cell.eprop };
  const modifier = String(event.ctrlKey * 8 + event.altKey * 4 + event.shiftKey * 2 + event.metaKey * 1);
  if (event.type === 'dblclick') return Object.assign({ type: 'DOUBLECLICK', destination: this.parentchild, data: { modifier: modifier } }, addon);
  const events = [Object.assign({ type: globals.KEYBOARDEVENTS[eventpos], destination: this.parentchild, data: { modifier: modifier } }, addon)];
  if (event.key && event.key.length === 1) events.push(Object.assign({ type: 'KEYPRESS', destination: this.parentchild, data: { key: event.key, modifier: modifier } }, addon));
  return events;
 }

 Handler(event)
 {
  let cell;

  switch (event.type)
         {
          case 'KILL':
               return { type: 'SIDEBARVIEWSTATUS', data: { odid: this.odid, ovid: this.ovid, childid: undefined, status: undefined } };
          case 'mousedown':
               const [x, y] = this.GetElementGridCoordinates(event.target); // Get event target grid x/y coordinates
               cell = this.valuetable[y]?.[x];
               if (!cell) this.ConfirmCellEditableContent();
               if (event.button === 0 || (cell && this.contentEditable === cell)) return;
               if (event.button !== 2 || event.buttons !== 2) return;
               this.ConfirmCellEditableContent();
               let clickedarea = [{ x1: x, y1: y, x2: x, y2: y }];
               for (const area of this.cursor.areas) if (this.GetArea1SidesToExpandArea2(clickedarea[0], area) && (clickedarea = this.cursor.areas)) break;
               const objectids = [];
               for (const area of clickedarea)
               for (let y = area.y1; y <= area.y2; y++) if (this.valuetable[y])
               for (let x = area.x1; x <= area.x2; x++)
                   {
                    cell = this.valuetable[y][x];
                    if (cell.oid >= 0) objectids.push(cell.oid);
                   }
               const deleteoption = objectids.length < 2 ? 'Delete object' : `Delete ${objectids.length} objects`;
               new ContextMenu([this.interactive ? ['Add object'] : 'Add object', !this.interactive || !objectids.length ? deleteoption : [deleteoption, objectids], '', ['Help'], ['Logout ' + globals.CutString(this.data.username)]], this, event);
               if (x !== undefined) this.MoveCursor({ x: x - this.cursor.x, y: y - this.cursor.y }, false, true);
               // Ended here - handle logout and help events on connection child only one way
               return;
          case 'dblclick':
               return this.DispatchMouseKeyboardEvent(event);
          case 'keydown':
               switch (event.code)
                      {
                       case 'Escape':
                            if (this.contentEditable) this.CancelCellEditableContent(this.valuetable[this.cursor.y][this.cursor.x]); // Handle esc key down for editable cell
                            return;
                       default:
                            if (this.contentEditable) break; // Handle all other key down cases strictly for no currently content editable cell
                            cell = this.DispatchMouseKeyboardEvent(event); // Retreive keyboard generated event, for 'eventable' keys only
                            if (cell) return cell; // and return it to dispatch it to the controller
                            if (event.getModifierState('ScrollLock') || !this.gridcontainer) break; // Handle cursor moving keys then, for no scroll-lock key on and existing grid
                            const page = Math.ceil((this.gridcontainer.clientHeight * this.valuetableHeight) / (this.mtop + this.gridcontainer.scrollHeight + this.mbottom)); // Calculate page height in cells
                            Object.assign(CURSOROFFSETS, { Home: { y: -this.valuetableHeight }, End: { y: this.valuetableHeight }, PageUp: { y: -page }, PageDown: { y: page } }); // and store offsets for that kind of keys
                            if (CURSOROFFSETS[event.code]) event.preventDefault(); // Prevent event default for moving keys
                            this.MoveCursor(CURSOROFFSETS[event.code], event.shiftKey, true); // and move cursor to the specified offset
                      }
               return;
          case 'SETVIEW':
               // Step 1 - init OV params and handle some errors, such as incoming event 'error' property or undefined selection (which is impossible cause undefined selection may be in a try-catch exception only and generates an 'error' in event)
               this.InitView(event);
               if (event.data.error) return this.DisplayView(event.data.error);
               if (!event.data.selection) return this.DisplayView(UNDEFINEDSELECTION);
               const layout = event.data.layout;

               // Step 2 - handle db selection rows with two virtual rows ('title' and 'new') before
               let table = event.data.selection;
               for (let r = TITLEVIRTUALROWID; r < table.length; r++)
                   {
                    if (this.cellscount >= MAXVIEWCELLS) break;
                    const row = event.data.selection[r]; // Fix selection row, for TITLEVIRTUALROWID (id=-2) and NEWVIRTUALROWID (id=-1) row is undefined
                    const o = r < 0 ? r : row[layout.columnidindex]; // Assign object id to TITLEVIRTUALROWID (-2), NEWVIRTUALROWID (-1) or row[id]
                    for (let c in layout.columns)
                        {
                         const column = layout.columns[c = +c]; // Fix layout column  
                         cell = { style: '' };
                         for (const prop in layout.dbdata)
                             {
                              let evalresult;
                              try { evalresult = new Function('r', 'c', 'table', 'return ' + (layout.dbdata[prop][column.original]?.row || ''))(r, c, table); }
                              catch {}
                              if (!evalresult) continue;
                              const style = cell.style;
                              Object.assign(cell, { style: '' }, layout.dbdata[prop][column.original] || {});
                              cell.style = style + cell.style;
                             }
                         [cell.oid, cell.ename, cell.eprop, cell.lastversion] = [o, column.elementname, column.elementprop, row?.[layout.columnlastversionindex]];
                         if (typeof cell.value !== 'string')
                            {
                             let value = row?.[c];
                             if (r === TITLEVIRTUALROWID && cell.ename) value = globals.SYSTEMELEMENTNAMES[cell.ename] ? cell.ename : column.elementprofilename;
                             if (value && typeof value === 'object') cell.value = JSON.stringify(value); // Bring cell.value to appropriate value depending on its type. Todo0 - fix in help: use columns with data type explicitly set via :: with alias via ' as ', cause "eid1::json->'valu'" becomes "eid1"
                              else if (typeof value === 'number') cell.value = value + '';
                               else cell.value = typeof value === 'string' ? value : '';
                            }
                         cell.interactive = this.interactive && cell.oid !== undefined && cell.oid !== TITLEVIRTUALROWID && cell.ename && !globals.SYSTEMELEMENTNAMES[cell.ename] ? true : false;
                         // Todo0 - context menu on cells
                         // Todo0 - All client events should be documented and console.log() at connection handler() to confirm that they are dispatched to the controller
                         // Todo0 - Help from old php sources
                         // Todo0 - Paste client event
                         // Todo0 - Copy to buffer
                         if (!this.ApplyCell(cell, table, r, c)) continue;
                         // Define cell some props (class, style and hint) below
                         cell.class = ['titlecell', 'newobjectcell', 'interactivecell', 'noninteractivecell'].at(r < 0 ? r + 2 : cell.interactive ? 2 : 3); 
                         if (r === TITLEVIRTUALROWID && cell.ename) cell.hint = globals.SYSTEMELEMENTNAMES[cell.ename] ? globals.SYSTEMELEMENTNAMES[cell.ename] : column.elementprofiledescription;
                         if (row?.[column.columnstyleindex]) cell.style += row[column.columnstyleindex];
                         if (row?.[column.columnhintindex]) cell.hint = row[column.columnhintindex];
                         cell.style = Application.AdjustString(cell.style, Application.TAGATTRIBUTEENCODEMAP, null, true);
                         cell.hint = Application.AdjustString(cell.hint, Application.TAGATTRIBUTEENCODEMAP, null, true);
                        }
                   }

               // Step 3 - set cell for udnefined rows (virtual) which have row/col undefined, so cell tex content needs to be retreived from the cell.value only
               table = this.valuetable;
               for (const xy in layout.nondbdata)
                   {
                    if (this.cellscount >= MAXVIEWCELLS) break;
                    cell = layout.nondbdata[xy];
                    cell.class = 'virtualcell';
                    this.ApplyCell(cell, table);
                   }
               this.EvalVirtualCells(table); // Todo0 - add virtual cell values refresh at any OV data refresh

               // Step 4 - hanlde result table zero height or display OV table
               return this.DisplayView(null, this.valuetable.length ? null : this.cellsoutofrange ? OUTOFRANGESELECTION : EMPTYSELECTION); // Todo0 - check all columns on first row props - what is it?
         }
 }

 // Functions evaluates all virtual cells values
 EvalVirtualCells(table)
 {
  for (const xy in this.layout.virtualcells)
      {
       const pos = xy.indexOf('~');
       const x = +(xy.substring(0, pos));
       const y = +(xy.substring(pos + 1));
       cell = this.valuetable[y][x];
       try { cell.hint = cell.originalhint; cell.value = new Function('x', 'y', 'table', 'return `' + cell.originalvalue + '`')(x, y, table); }
       catch { cell.hint = `The cell value "${cell.originalvalue}" expression evaluation threw an exception!`; cell.value = ''; }
      }
 }

 // Function binds incoming cell to value table 'array' and object table 'object'
 // valuetable[y][x] = objecttable[o][e][..] = { row:, col:, x:, y:, value:, hint:, style:, collapserow:, collapsecol:, o:, e:, prop: }
 ApplyCell(cell, table, r, c)
 {
  let x, y;
  try { 
       x = new Function('r', 'c', 'table', 'return ' + (cell.x || ''))(r, c, table);
       y = new Function('r', 'c', 'table', 'return ' + (cell.y || ''))(r, c, table);
      }
  catch {}
  
  if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y))
     {
      cell.x = x = Math.round(x); // Fix it to nearest integer
      cell.y = y = Math.round(y);
      if ((x < 0 || y < 0 || x >= MAXVIEWTABLEWIDTH || y >= MAXVIEWTABLEHEIGHT) && (this.cellsoutofrange++)) return; // Check x,y out of range and increase <cellsoutofrange> in case. Return faulsy result then
      if ('collapserow' in cell) r === undefined ? this.layout.collapseundefinedrows = true : this.layout.collapsedrows[y] = true; // Fix row number to collapse
      if ('collapsecol' in cell) r === undefined ? this.layout.collapseundefinedcols = true : this.layout.collapsedcols[x] = true; // Fix column number to collapse
      if ('event' in cell) this.layout.event = { event: cell.event, x: x, y: y };
      delete cell.collapserow;
      delete cell.collapsecol;
      delete cell.event;
      if (!('value' in cell)) return; // Cells is non "data" cell (just for collapse/event props to define only, see above)
      if (x >= this.valuetableWidth) this.valuetableWidth = x + 1; // Increase value table width if needed
      if (!this.valuetable[y]) this.valuetable[y] = []; // Create new table row number 'y' if needed
      this.layout.definedcols[x] = true; // Fix column number 'x' as existed
      if (this.objecttable[cell.oid]?.[cell.ename]) delete this.objecttable[cell.oid][cell.ename][`${x}~${y}`]; // Delete corresponded object id (cell.oid) element id (cell.ename) placed in x,y html table coordinates
      if (!this.valuetable[y][x]) this.cellscount++; // Count new cells
      this.valuetable[y][x] = cell; // Set <cell> to value table
      if (r === undefined) // Virtual cells (in case of undefined <r>) are detected
         {
          cell.originalvalue = cell.originalvalue; // Store original value to eval it at all next table data refresh 
          cell.originalhint = cell.originalhint; // Store original hint to be able to restore it in case of a exception
          this.layout.virtualcells[`${x}~${y}`] = true; // Store x,y coordinates in <virtualcells> object with <x> with <y> via '~' as an uniq key
          return true;
         }
      if (!this.objecttable[cell.oid]) this.objecttable[cell.oid] = {}; // 
      if (!this.objecttable[cell.oid][cell.ename]) this.objecttable[cell.oid][cell.ename] = [];
      this.objecttable[cell.oid][cell.ename][`${x}~${y}`] = cell; // Bind <cell> with its uniq x,y coordinates to object id element id (one object element may be placed in multiple table cells due to some layout configurations)
      return true;
     }
 }

 DisplayView(errormsg, warningmsg)
 {
  // Step 1 - display error message and return setting view percent loading status to 100
  const event = { type: 'SIDEBARVIEWSTATUS', data: { odid: this.odid, ovid: this.ovid, status: 100, childid: this.id } };
  this.props.control.mouseareaselect.elements = [];
  if (errormsg || warningmsg)
     {
      this.elementDOM.innerHTML = `<div class="ovboxmessage" style="color: ${errormsg ? 'RGB(251,179,179)' : '#9FBDDF'};"><div  style="text-align: justify;"><h1>${errormsg ? errormsg : warningmsg}</h1></div></div>`;
      this.ChangeHeader(event.data);
      return event;
     }

  // Step 2 - init same tables vars
  let dispx, dispy = 0;
  let newtable = [];
  this.valuetableHeight = this.valuetable.length;
  for (let x = 0; x < this.valuetableWidth; x++) if (!this.layout.collapsedcols[x] && !this.layout.definedcols[x] && 'collapseundefinedcols' in this.layout) this.layout.collapsedcols[x] = true; // Collapse column 'x' if it's not already collapsed and undefined (prop 'collapseundefinedcols' is in this.layout)

  // Step 3 - collapse main table
  for (let y = 0; y < this.valuetableHeight; y++)
      {
       if (this.layout.collapsedrows[y] && (dispy = dispy + 1)) continue; // Collapse row 'y' with increasing <y> displacement
       if (!this.valuetable[y] && 'collapseundefinedrows' in this.layout && (dispy = dispy + 1)) {console.log('hui');continue; }// Collapse row 'y' also with increasing <y> displacement if the row is undefined
       if (!this.valuetable[y]) continue; // Skip undefined row
       newtable[y - dispy] = this.valuetable[y]; // Add existing table row to a new table shifted row <y - dsipy>
       dispx = 0; // Process current row all columns for 'collapsing' below
       for (let x = 0; x < this.valuetableWidth - dispx; x++) // if (this.collapsedcols[x + dispx] && this.valuetable[y].splice(x--, 1)) dispx++;
	        {
	         if (!this.layout.collapsedcols[x + dispx]) continue; // Continue for non-collapsed (previously defined) columns
            this.valuetable[y].splice(x, 1); // or collapse the column otherwise splicing all elements to the left
            x--; // decreasing current column number <x>
            dispx++; // and increasing <dispx>
           }
      }
  this.valuetable = newtable;
  newtable = null;
  this.valuetableHeight -= dispy;
  this.valuetableWidth  -= dispx;
  this.columnWidths.length = this.valuetableWidth;
  this.rowHeights.length = this.valuetableHeight;
  this.columnWidths.fill(globals.CELLMINWIDTH);
  this.rowHeights.fill(globals.CELLMINHEIGHT);
  if (!this.valuetableWidth || !this.valuetableHeight) return this.DisplayView(null, COLLAPSEDSELECTION); 

  // Step 4 - Assign table specific vars and set cursor to initial position
  this.elementDOM.innerHTML = `<div class="scrollingcontainer"></div>`;
  this.scrollingcontainer = this.elementDOM.querySelector('.scrollingcontainer');
  const x = Math.min(this.valuetableWidth - 1, this.layout.event.x);
  const y = Math.min(this.valuetableHeight - 1, this.layout.event.y);
  this.cursor = { x: x, y: y, areas: [{ x1: x, y1: y, x2: x, y2: y }] };

  this.scrollingcontainer.addEventListener('scroll', () => {
                                                            if (this.cursor.ticking) return;
                                                            window.requestAnimationFrame(() => { this.Render(); this.cursor.ticking = false; });
                                                            this.cursor.ticking = true;
                                                           });
  this.Render();
  this.ChangeHeader(event.data);
  return event;
 }

 GetElementAreaRect(element, excludescrollarea)
 {
  if (!element) return;
  return { x1: element.offsetLeft + (excludescrollarea ? element.scrollLeft : 0),
           y1: element.offsetTop + (excludescrollarea ? element.scrollTop : 0),
           x2: element.offsetLeft - 1 + (excludescrollarea ? element.scrollLeft + element.clientWidth : element.offsetWidth),
           y2: element.offsetTop - 1 + (excludescrollarea ? element.scrollTop + element.clientHeight : element.offsetHeight)
         };
 }

 TransitionEnd()
 {
  super.TransitionEnd();
  this.Render();
 }

 // Render itemArea (to grid area) object and place it to visible area. Function works in three modes:
 // 1. Grid area is scrolled, but still in visible area, so do nothing
 // 2. Grid area partly intersects visible area due to user scrolling. Calculate item area via grid area sides to expand to visible area and build new grid area inner html
 // 3. Grid area doesn't intersect visible area due to user scroll navigating or cursor position set. Calculate item area via scroll offset or cursor position
 Render()
 {
  if (!this.cursor) return;
  if (this.cursor.noscrollredraw) return (this.cursor.noscrollredraw = false);

  // Step 1 - Render item area based alignment x,y coordinates, so no scrolling/resizing events are made and grid container area position are not taken into account
  const visiblearea = this.GetElementAreaRect(this.scrollingcontainer, true); // Get visible area from scrolling container getting its offsetLeft/Top (x/y) and clientWidth/Height (x + width/y + height)
  if (this.cursor.alignment)
     {
      this.cursor.alignment.visiblearea = visiblearea;
      if (this.cursor.alignment.sides & LEFTSIDE || this.cursor.alignment.sides & RIGHTSIDE)
         {
          this.itemArea.x1 = this.itemArea.x2 = this.cursor.alignment.x;
          const itemwidth = Math.ceil((visiblearea.x2 - visiblearea.x1 + 1) / globals.CELLMINWIDTH);
          if (this.cursor.alignment.sides & LEFTSIDE) { this.itemArea.x2 += itemwidth; this.itemArea.x1--; }
           else { this.itemArea.x1 -= itemwidth; this.itemArea.x2++; }
          if (this.itemArea.x1 < 0) { this.itemArea.x2 = Math.min(this.itemArea.x2 - this.itemArea.x1, this.valuetableWidth - 1); this.itemArea.x1 = 0; }
          if (this.itemArea.x2 >= this.valuetableWidth) { this.itemArea.x1 = Math.max(this.itemArea.x1 - this.itemArea.x2 + this.valuetableWidth - 1, 0); this.itemArea.x2 = this.valuetableWidth - 1; }
         }
      if (this.cursor.alignment.sides & TOPSIDE || this.cursor.alignment.sides & BOTTOMSIDE)
         {
          this.itemArea.y1 = this.itemArea.y2 = this.cursor.alignment.y;
          const itemheight = Math.ceil((visiblearea.y2 - visiblearea.y1 + 1) / globals.CELLMINHEIGHT);
          if (this.cursor.alignment.sides & TOPSIDE) { this.itemArea.y2 += itemheight; this.itemArea.y1--; }
           else { this.itemArea.y1 -= itemheight; this.itemArea.y2++; }
          if (this.itemArea.y1 < 0) { this.itemArea.y2 = Math.min(this.itemArea.y2 - this.itemArea.y1, this.valuetableHeight - 1); this.itemArea.y1 = 0; }
          if (this.itemArea.y2 >= this.valuetableHeight) { this.itemArea.y1 = Math.max(this.itemArea.y1 - this.itemArea.y2 + this.valuetableHeight - 1, 0); this.itemArea.y2 = this.valuetableHeight - 1; }
         }
      this.DisplayGridContainer();
      return;
     }

  // Step 2 - no cursor x,y coordinates alignment, so define grid area and calculates its visible area intersection due to scroll, resize or full screen events
  const gridcontainerarea = this.GetElementAreaRect(this.gridcontainer); // Get grid area from grid container getting its offsetLeft/Top (x/y) and clientWidth/Height (x + width/y + height)
  let expandsides = this.GetArea1SidesToExpandArea2(gridcontainerarea, visiblearea); // Get gridcontainerarea sides to expand visible area. Undefined this.gridcontainer (so current item area) returns undefined

  // Step 3 - grid container doesn't intersects (or doesn't exist) visible area, so calculate item area based on scrolling offset values
  if (expandsides === undefined)
     {
      this.itemArea =  { x1: Math.floor(this.scrollingcontainer.scrollLeft / globals.CELLMINWIDTH), // For visible area define item area due to default item pixel min width/height 
                         x2: Math.ceil((this.scrollingcontainer.scrollLeft + this.scrollingcontainer.clientWidth - 1) / globals.CELLMINWIDTH),
                         y1: Math.floor(this.scrollingcontainer.scrollTop / globals.CELLMINHEIGHT),
                         y2: Math.ceil((this.scrollingcontainer.scrollTop + this.scrollingcontainer.clientHeight - 1) / globals.CELLMINHEIGHT)
                       };
      this.DisplayGridContainer();
      return;
     }

  // Step 4 - any intersection does exist, so check boundary item area values for every expand side - for a exmaple bottom expand side with item area y2 value equals table height or more - side expand makes no sense and will be deleted from expand array
  if (expandsides & LEFTSIDE && this.itemArea.x1 === 0) expandsides -= LEFTSIDE;
  if (expandsides & RIGHTSIDE && this.itemArea.x2 === this.valuetableWidth - 1) expandsides -= RIGHTSIDE;
  if (expandsides & TOPSIDE && this.itemArea.y1 === 0) expandsides -= TOPSIDE;
  if (expandsides & BOTTOMSIDE && this.itemArea.y2 === this.valuetableHeight - 1) expandsides -= BOTTOMSIDE;
  if (!expandsides) return; // No sides to expand for grid area to visible area? Just return with doing nothing (redraw is not needed)

  // Step 5 - Sides to expand do exist, so process them one by one for grid area to expand to visible area
  if (expandsides & LEFTSIDE) for (let i = this.itemArea.x2; i >= this.itemArea.x1; i--)
     {
      const item = this.GetGridCoordinatesElement(i, this.itemArea.y1);
      if (!item || item.offsetLeft > visiblearea.x2) continue;
      this.itemArea.x1 -= Math.ceil((gridcontainerarea.x1 - visiblearea.x1) / globals.CELLMINWIDTH); // Prefer max possible items to expand, so use CELLMINWIDTH/CELLMINHEIGHT instead of actual item widths/heights like in old version: this.itemArea.x1 -= this.GetItemNumber(this.columnWidths, i, 0, gridcontainerarea.x1 - visiblearea.x1);
      this.itemArea.x2 = i;
      break;
     } 
  if (expandsides & RIGHTSIDE) for (let i = this.itemArea.x1; i <= this.itemArea.x2; i++)
     {
      const item = this.GetGridCoordinatesElement(i, this.itemArea.y1);
      if (!item || item.offsetLeft + item.offsetWidth < visiblearea.x1) continue;
      this.itemArea.x1 = i;
      this.itemArea.x2 += Math.ceil((visiblearea.x2 - gridcontainerarea.x2) / globals.CELLMINWIDTH); // Old version: this.GetItemNumber(this.columnWidths, i, this.valuetableWidth - 1, visiblearea.x2 - gridcontainerarea.x2);
      break;
     }
  if (expandsides & TOPSIDE) for (let i = this.itemArea.y2; i >= this.itemArea.y1; i--)
     {
      const item = this.GetGridCoordinatesElement(this.itemArea.x1, i);
      if (!item || item.offsetTop > visiblearea.y2) continue;
      this.itemArea.y1 -= Math.ceil((gridcontainerarea.y1 - visiblearea.y1) / globals.CELLMINHEIGHT); // Old version: this.GetItemNumber(this.columnHeights, i, 0, gridcontainerarea.y1 - visiblearea.y1);
      this.itemArea.y2 = i;
      break;
     } 
  if (expandsides & BOTTOMSIDE) for (let i = this.itemArea.y1; i <= this.itemArea.y2; i++)
     {
      const item = this.GetGridCoordinatesElement(this.itemArea.x1, i);
      if (!item || item.offsetTop + item.offsetHeight < visiblearea.y1) continue;
      this.itemArea.y1 = i;
      this.itemArea.y2 += Math.ceil((visiblearea.y2 - gridcontainerarea.y2) / globals.CELLMINHEIGHT); // Old version: this.GetItemNumber(this.columnHeights, i, this.valuetableHeight - 1, visiblearea.y2 - gridcontainerarea.y2);
      break;
     }

  // Step 6 - calculate grid area all margins from scrolling area and call DisplayGridContainer function to finish
  this.DisplayGridContainer();
 }

 DisplayGridContainer()
 {
  let item;
  this.CutItemCoordinates(this.itemArea);
  const mtop = this.GetPixelSum(this.rowHeights, 0, this.itemArea.y1 - 1);
  const mright = this.GetPixelSum(this.columnWidths, this.itemArea.x2 + 1, this.valuetableWidth - 1);
  const mbottom = this.GetPixelSum(this.rowHeights, this.itemArea.y2 + 1, this.valuetableHeight - 1);
  const mleft = this.GetPixelSum(this.columnWidths, 0, this.itemArea.x1 - 1);
  this.mtop = mtop;
  this.mbottom = mbottom;

  // Todo0 - are global table attributes style/hint needed? 
  // const style = `${this.layout.table.style} grid-template-columns: repeat(${this.itemArea.x2 - this.itemArea.x1 + 1}, min-content); grid-template-rows: repeat(${this.itemArea.y2 - this.itemArea.y1 + 1}, min-content); margin: ${mtop}px ${mright}px ${mbottom}px ${mleft}px;`;
  const style = ` grid-template-columns: repeat(${this.itemArea.x2 - this.itemArea.x1 + 1}, min-content); grid-template-rows: repeat(${this.itemArea.y2 - this.itemArea.y1 + 1}, min-content); margin: ${mtop}px ${mright}px ${mbottom}px ${mleft}px;`;
  // const title = this.layout.table.hint ? ` title="${this.layout.table.hint}"` : ``;
  const title = ``;
  let inner = '';
  for (let y = this.itemArea.y1; y <= this.itemArea.y2; y++)
  for (let x = this.itemArea.x1; x <= this.itemArea.x2; x++)
      {
       const id = `x${x}y${y}`;
       const cell = this.valuetable[y]?.[x];
       const addclass = (this.cursor?.x === x && this.cursor?.y === y) ? `${cell?.interactive ? ' interactivecursorcell' : ' noninteractivecursorcell'}` : `${this.ItemInAreas(this.cursor?.areas, x, y) ? ' selectedcell' : ''}`;
       if (!cell && (inner = inner + `<div class="undefinedcell defaultcell${addclass}" id="${id}"></div>`)) continue;
       const title = cell.hint ? ` title="${cell.hint}"` : ``;
       inner += `<div class="${cell.class} defaultcell${addclass}" id="${id}" style="${cell.style}"${title}>${Application.AdjustString(cell.value, Application.HTMLINNERENCODEMAP, Application.ELEMENTINNERALLOWEDTAGS)}</div>`;
      }

  this.scrollingcontainer.innerHTML = `<div class="gridcontainer" style="${style}"${title}>${inner}</div>`;
  this.gridcontainer = this.scrollingcontainer.querySelector('.gridcontainer');
  this.props.control.mouseareaselect.elements = [[this.gridcontainer]];
  
  if (this.cursor.alignment)
     { 
      this.cursor.noscrollredraw = true;
      item = this.GetGridCoordinatesElement(this.cursor.alignment.x, this.cursor.alignment.y);
      if (this.cursor.alignment.sides & RIGHTSIDE) this.scrollingcontainer.scrollLeft = item.offsetLeft + item.offsetWidth - (this.cursor.alignment.visiblearea.x2 - this.cursor.alignment.visiblearea.x1 + 1) - this.scrollingcontainer.offsetLeft + Math.floor(globals.CELLMINWIDTH / 2);
       else if (this.cursor.alignment.sides & LEFTSIDE) this.scrollingcontainer.scrollLeft = item.offsetLeft - this.scrollingcontainer.offsetLeft - Math.floor(CELLMINWIDTH / 2);
      if (this.cursor.alignment.sides & BOTTOMSIDE) this.scrollingcontainer.scrollTop = item.offsetTop + item.offsetHeight - (this.cursor.alignment.visiblearea.y2 - this.cursor.alignment.visiblearea.y1 + 1) - this.scrollingcontainer.offsetTop + Math.floor(globals.CELLMINHEIGHT / 2);
       else if (this.cursor.alignment.sides & TOPSIDE) this.scrollingcontainer.scrollTop = item.offsetTop - this.scrollingcontainer.offsetTop - Math.floor(globals.CELLMINHEIGHT / 2);
      delete this.cursor.alignment;
     }
  // Todo0 - set min width/height style props for every item of first row/column of virtual grid to max width/height item values (of whole grid):
  // - if current item row height < this.maxRowHeights[i] then exegurate style.minHeight
  // - if current item row height > this.maxRowHeights[i] then exegurate this.maxRowHeights
  // - if current item height becomes more than max value (in this.maxRowHeights) then exegurate this.rowHeights, for equal vlaues do nothing
  // - otherwise if current item height becomes less than max - what should i do?
  // for (let i = this.itemArea.y1; i <= this.itemArea.y2; i++) if (item = this.GetGridCoordinatesElement(this.itemArea.x1, i)) item.offsetHeight < this.rowHeights[i] ? item.style.minHeight = `${this.rowHeights[i]}px` : this.rowHeights[i] = item.offsetHeight;
  // for (let i = this.itemArea.x1; i <= this.itemArea.x2; i++) if (item = this.GetGridCoordinatesElement(i, this.itemArea.y1)) item.offsetWidth < this.columnWidths[i] ? item.style.minWidth = `${this.columnWidths[i]}px` : this.columnWidths[i] = item.offsetWidth;
  for (let i = this.itemArea.y1; i <= this.itemArea.y2; i++) if (item = this.GetGridCoordinatesElement(this.itemArea.x1, i)) this.rowHeights[i] = item.offsetHeight;
  for (let i = this.itemArea.x1; i <= this.itemArea.x2; i++) if (item = this.GetGridCoordinatesElement(i, this.itemArea.y1)) this.columnWidths[i] = item.offsetWidth;
  if (this.contentEditable) requestIdleCallback(() => this.MakeCellContentEditable(this.contentEditable, false, true));
 }

 //
 GetPixelSum(array, start, end)
 {
  let sum = 0;
  for (let i = start; i <= end; i++) sum += array[i];
  return sum;
 }

 // Function returns how area1 overlaps/intersects area2
 GetArea1SidesToExpandArea2(area1, area2)
 {
  if (!area1 || !area2) return; // Any unassigned area - return udnefined
  area1 = this.OrderArea(area1);
  area2 = this.OrderArea(area2);
  if (area1.x2 < area2.x1 || area1.x1 > area2.x2 || area1.y2 < area2.y1 || area1.y1 > area2.y2) return; // Also return undefined for two areas no intersection

  let expandsides = 0; // Proceed with partly or full intersection calculating sides for area1 to expand to area2. For area1 overlapping area2 - no expand sides will be set
  if (area1.x1 > area2.x1) expandsides += LEFTSIDE;
  if (area1.x2 < area2.x2) expandsides += RIGHTSIDE;
  if (area1.y1 > area2.y1) expandsides += TOPSIDE;
  if (area1.y2 < area2.y2) expandsides += BOTTOMSIDE;
  return expandsides;
 }

 ItemInAreas(areas, x, y)
 {
  if (areas) for (let area of areas) if ((area = this.OrderArea(area)) && x <= area.x2 && x >= area.x1 && y <= area.y2 && y >= area.y1) return true;
 }

 static MouseAreaSelectControl(userevent, control, phase)
 {
  const [x, y] = control.child.GetElementGridCoordinates(userevent.target); // Get event target grid x/y coordinates
  if (phase === 'capture')
     {
      if (control.child.contentEditable)
         if (control.child.contentEditable === control.child.valuetable?.[y]?.[x]) return;
          else control.child.ConfirmCellEditableContent();  // Selection phase 'capture' with any editable cell, but out of it - confirm editable content
      if (x !== undefined) control.child.MoveCursor({ x: x - control.child.cursor.x, y: y - control.child.cursor.y }, null, !userevent.ctrlKey) && undefined; // Selection phase 'capture' with no any editable cell - grid mouse 1st click - just set cursor to x,y position
     }
  if (x !== undefined && phase === 'process' && !control.child.contentEditable) control.child.MoveCursor({ x: x - control.child.cursor.areas.at(-1).x2, y: y - control.child.cursor.areas.at(-1).y2 }, true); // Selection phase 'process' with no any editable cell - grid mouse move - modify selection area to x,y position
 }

 GetElementGridCoordinates(element)
 {
  while (element && !element.id && element !== this.elementDOM) element = element.parentNode;
  if (!element?.id) return [];
  const pos = element.id.indexOf('y');
  return [ element.id.substring(1, pos), element.id.substring(pos + 1) ];
 }

 GetGridCoordinatesElement(x, y)
 {
  return this.gridcontainer.querySelector(`#x${x}y${y}`);
 }

 HighlightTableCells(cursor, highlight)
 {
  if (!cursor) return;
  let cell;
  for (let area of cursor.areas)
      {
       area = this.OrderArea(area);
       for (let y = area.y1; y <= area.y2; y++)
       for (let x = area.x1; x <= area.x2; x++)
           if (cell = this.GetGridCoordinatesElement(x, y))
           if (cursor.x === x && cursor.y === y) // Is it cursor within area?
              {
               cell.classList.remove('selectedcell');
               highlight ? cell.classList.add(this.valuetable[y]?.[x]?.interactive ? 'interactivecursorcell' : 'noninteractivecursorcell') : cell.classList.remove('noninteractivecursorcell', 'interactivecursorcell');
              }
            else
              {
               highlight ? cell.classList.add('selectedcell') : cell.classList.remove('selectedcell');
              }
      }
 }

 // Order area coordinates putting x1 before x2, so y1
 OrderArea(area)
 {
  return { x1: Math.min(area.x1, area.x2), y1: Math.min(area.y1, area.y2), x2: Math.max(area.x1, area.x2), y2: Math.max(area.y1, area.y2) };
 }

 // Array of cursor/areas ({ object:, property:, maxvalue: }) to be cut to fit the range 0..maxvalue
 CutItemCoordinates(...objects)
 {
  for (const obj of objects)
      if (obj)
         for (const prop in obj)
             if (typeof prop === 'string' && (prop.includes('x') || prop.includes('y'))) obj[prop] = Math.min(Math.max(0, obj[prop]), prop.includes('x') ? this.valuetableWidth - 1 : this.valuetableHeight - 1);
 }

 // Function removes cursor prefinal area overlaps other selected areas before
 RemoveAreasOverlap(cursor)
 {
  for (let i = 0 ; i < cursor.areas.length - 2; i++) // Overlap for two areas and less is not needed, cause last area may be changed, so first area is not needed to compare to the second that may be changed
      {
       let expand = this.GetArea1SidesToExpandArea2(cursor.areas.at(-2), cursor.areas[i]); // Get prefinal area sides to expand to current area
       if (expand === undefined) continue; // No intersection at all? Continue
       if (!expand && cursor.areas.splice(i--, 1)) continue; // No sides to expand (prefinal area overlaps current)? Remove current area and continue
       if (this.GetArea1SidesToExpandArea2(cursor.areas[i], cursor.areas.at(-2)) === 0) // Current area fully overlaps prefinal?
          {
           cursor.areas[cursor.areas.length - 2] = cursor.areas[i]; // Then current area becomes prefinal. Interesting - firefox causes an error for the next line: cursor.areas.at(-2) = cursor.areas[i];
           cursor.areas.splice(i--, 1); // And old current is removed
          }
      }
 }

 // Cursor object format: { x:, y: areas: [{ x1:, y1:, x2:, y2:}, {}..] }. Prop 'areas' consists of area list of objcets with initial cell position (x1, y1) and final cell position (x2, y2). Return true for no cursor/area position change
 // Var <visibleareaalignment> indicates an axis (true for horizontal, false for vertical, other values for both) to align visible area to fit the cursor, for a example arrow down event aligns only vertical axis of visible area while horizontal one may stay out of cursor
 // 
 MoveCursor(offset, selection, resetareas)
 {
  if (!this.cursor || !offset) return; // No any action for undefined cursor/offset (undefined cursor occurs on error messaged view or empty table)
  const newcursor = JSON.parse(JSON.stringify(this.cursor));
  let alignment = { sides: 0 };
  if (selection) // In case of selection area modify - move current area x2,y2 coordinates to specified offset. Arg <resetarea> has no sense - last area is modified anyway
     {
      newcursor.areas.at(-1).x2 += offset.x || 0;
      newcursor.areas.at(-1).y2 += offset.y || 0;
      this.CutItemCoordinates(newcursor.areas.at(-1));
      if (newcursor.areas.at(-1).x2 === this.cursor.areas.at(-1).x2 && newcursor.areas.at(-1).y2 === this.cursor.areas.at(-1).y2) return; // Return for no changes
     }
   else // Set cursor new position for no selection area action. For true <resetareas> flush all previous areas and create a new cursor cell area, for false - add cursor cell area
     {
      newcursor.x += offset.x || 0;
      newcursor.y += offset.y || 0;
      const area = { x1: newcursor.x, y1: newcursor.y, x2: newcursor.x, y2: newcursor.y };
      resetareas ? newcursor.areas = [area] : newcursor.areas.push(area);
      this.CutItemCoordinates(newcursor, newcursor.areas.at(-1));

      const cell = this.valuetable?.[newcursor.y]?.[newcursor.x];
      if (cell?.interactive && cell.oid === NEWVIRTUALROWID) this.MakeCellContentEditable(cell);

      if (newcursor.x === this.cursor.x && newcursor.y === this.cursor.y && newcursor.areas.length === this.cursor.areas.length)
      if (newcursor.areas.at(-1).x1 === this.cursor.areas.at(-1).x1 && newcursor.areas.at(-1).y1 === this.cursor.areas.at(-1).y1)
      if (newcursor.areas.at(-1).x2 === this.cursor.areas.at(-1).x2 && newcursor.areas.at(-1).y2 === this.cursor.areas.at(-1).y2) return; // Return for no changes
     }
  this.RemoveAreasOverlap(newcursor);

  // Calculate cursor position on grid container - out of grid, partly intersection, within grid
  // For retreived cell DOM element adjust scrolling container scrollLeft/Top to fit the cell to visible area adding the gap <CELLSETPOSITIONGAP>
  [ alignment.x, alignment.y ] = selection ? [newcursor.areas.at(-1).x2, newcursor.areas.at(-1).y2] : [newcursor.x, newcursor.y];
  let cell = this.GetGridCoordinatesElement(alignment.x, alignment.y);
  const visiblearea = this.GetElementAreaRect(this.scrollingcontainer, true);
  const cellarea = this.GetElementAreaRect(cell);
  alignment.sides = this.GetArea1SidesToExpandArea2(visiblearea, cellarea);

  // Process visible area to cellfit area sides to expand. No sides to expand (cusrsor cell/selection is in visible area) - just renew cursor without grid scroll
  if (alignment.sides === 0)
     {
      this.HighlightTableCells(this.cursor); // Dehighlight old cursor and its areas and highlight new cursor with its areas not forgetiing to remove prefinal area overlay to other selected areas before
      this.cursor = newcursor; // Assign current cursor to new one
      this.HighlightTableCells(this.cursor, true);
      return;
     }

  // Align the side based on item with alignment.x, alignment.y coordinates with visible area intersection, but not based on offset direction. If alignment is one axis - another axis item area range should be untouched!
  // Process visible area to cellfit area sides to expand. Any other expand results - cusrsor cell/selection is not fully in visible area, so partly intersetcs or out of visible area
  if (!alignment.sides)
     {
      alignment.sides = 0;
      if ('x' in offset) alignment.sides = alignment.sides + (offset.x > 0 ? RIGHTSIDE : LEFTSIDE);
      if ('y' in offset) alignment.sides = alignment.sides + (offset.x > 0 ? BOTTOMSIDE : TOPSIDE);
      if (!alignment.sides) alignment.sides = LEFTSIDE + TOPSIDE
     }
  newcursor.alignment = alignment;
  this.cursor = newcursor; // Assign current cursor to new one
  this.Render();
 }
}

// View
// Todo0 - Should the view be closed after its OD have been removed?
// Todo0 - Limit json.row and json.value expressions evaluated as a js code via JS future specification named SHADOW REALMS.
//         json.row has access to vars (r, c, q, selection) only, where selection is a data array came from backend and r/c are current row/column values that can be use in a selection[r][c]
//         json.value is interpreted as an expression (with access to vars x, y, table) in case of key word "EXPRESSION " starts the value
// Todo0 - whole table selection (Ctrl a), per object selection (what key combination?), enter[+shift] moves cursor down[up] (in case of selection moves among selected cells), home/end [with ctrl/alt] moves cusor to start/end of a line [table/page] and shift selects cursor track. Ctrl with up[down] jumps to next[previous] object
// Todo0 - in context menu description: quantity of valid layout jsons, query string, out of range cells number, cells count max exceed, Od and OV description from OV structure, what else?
//         application version, tel number and other contacts (something like 'please contact us support@tabels.app') in a extra tab on help context menu. Help contex menu is the for all modes (connection/view/sidebar)
//         No description menu! all its info put in help context menu!
//         add in system description something like 'it has a 'game' style interface colors but offers a powerful functionality
//         helpdesk/jira/CRM example in Help context menu
// Todo0 - all view changes comes to client side with odid/ovid with object id and its element id.
//         Controller passes all changed data to all clients that has this view opened, so that clients apply all changes right now (not forgetting to check oid presense, cause of possible random or non-actual selection).
//         To other clients controller just sends modification notifications for all oid/eid changed, so client side may display 'new notification' in a sidebar
// Todo0 - regexp search should be implemented to all types of view including tree and map. Should js range be used instead of span highlighting in regexp search? Not only regexp search but search on mask with only one asterisk as a special char or just plain text
// Todo0 - Voting view example
//		     layout: {"oid":"3", "eid":"element id number for every voting", "y":"0", "x":"0", "value":"Голосовать"}
//		     object selection: empty
//	  	     Rule reject:
//					  CHANGE select count(version) > 1 from :odtable where id=3 and owner=':user'
//					  INIT select 1 (add object first (only once))
//					  DELETE select 1
//		     Event DOUBLECLICK handler: php /usr/local/src/tabels/handlers/_.php SELECT 'Путин|Зюганов|Медведев'
//		     Event CONFIRMDIALOG handler:  php /usr/local/src/tabels/handlers/_.php <event> <data>
//		     Display selected cells sum for 'number' cell type
// Todo0 - Emodzi symbols as an element text causes db sql error. Should it be fixed?
// Todo0 - Setka via css https://dbmast.ru/fon-v-vide-diagonalnoj-setki-na-css
//         View area specific style with background, border radius and so on
// Todo2 - scale ovbox content via child management icon +-
// Todo1 - keep input view parameters in a view history navigating, so open last viewed OV with input parameters used before. Access history of opened views via context menu or hot keys?

// Tree view
// Todo0 - Tree selection: SELECT <layout elements> FROM <actual data> WHERE <clause1 /n clause2>, other exoressions are unavailable. Clause2 points to the second point of the tree. No second point (clause2) - until the end of the tree. Point to point tree may be multipath.
// Todo0 - Tree element layout style:
//		     for example to see what nodes are down by seeing them via red background
//  	     Tree wire name (arrow name) to mark fiber cooper radio..
//		     Node color or wire type should depend on some current object element values to mark nodes and its links status (node down, line down, etc..)
// Todo0 - Every object has its content defined via table element layout, so you can output any object elements (including images) in a tree node, but be aware and place only nessesary data due to possible page overload. Also all tree nodes have its uplinked/downlinked elmenents displayed with specified wire between
// Todo0 - context menu: expand/hide uplink and downlink subtrees, description for tree view (object number, object selection parameteres..)
// Todo0 - loop element - show real looped object instead of read message
// Todo1 - nested level input (nodes depth) to display may be defined. For example, nested level 2 diaplys main switch with its direct downlink nodes and no more deeper levels of nodes

// Table view
// Todo - Tags within table item!!
//        all table cells have their allowed html tags including pseudo tags that allows to insert graphics. Add <img> tag to allowed ones to have opportunity use image links instead downloaded images
//        to allow html table within table cells add <tr>, <td>, <tbody> and <table> tags to allowed ones
//        Every user defined element (eid1, eid2..) has its external data like streams (cameras, streams), files (documents, audio, video, image) and TSDB (data is set via system call SET<TSDBID>])
//		      App data represents 3D model: 1st dimension - objects, 2nd - objects elements, 3rd - element JSON props, streams, files, TSDB
//		      Configurate element external data (streams, files) via handler commands for cameras (timeshift, source, qulity), for tsdb (duration, unit of measure[sec, mbits, ...]), for file upload/download
// 		   - value is user defined cell value (starting with SELECT is an sql query, or a FUNCTION that works at client side calculating cell range sum, for example, like in excel)
// 		   - cell text has three custom tags (audio, img, video and chart to draw graph from tsdb)
// Todo - any single text line with Enter and then Backspace pressed should be stored the way it is before pressing Enter with Backspace, but it is stored original line + '\n'. Correct it!
// Todo - table cells selection should fade cell background color, not just fade it. Also selected area rectangle should be highlighted via bold line
// Todo - Don't call eval function in case of constants x,y values also, check it on million cycles
// Todo - only this type of view allows new object creation. Release object creation via dialog to input all elements values
// Todo - Export OV data to xls(via csv) or txt file
// Todo - autocomplete feature at cell editing. Autocomplete data may be retrieved from other OD, for example, client list or street list.
// Todo - what about edit after edit command, for a example edited text is passed to controller (confirm event) and edit command occurs as a response to confirm event?
// Todo - GALLERY command shows all foto for default, otherwise - specified foto. Image properties (like resolution) should be displayed and left/right arrows control at the right top view block. Smooth image changing also?
// 		  GALLERY displays all external data including streams, images, audio, video, TSDB
//		  Make external source data settings via these kinds of systme calls UPLOAD, DOWNLOAD, UNLOAD for files, another cmd for TSDB (duration, unit of measurement) and another cmd for streams (timeshift, source, qulity)
//		  All these external data may be embedded via custom tags to table cell <td>
// Todo - macroses like in joe
// Todo - Context menu Graph
//        Table selection of this strings and values (hui1 space, hui2 space, hui3 space..) displays pie chart with hui1 - 100%, and 0% for other values, is it right?
// Todo - Paste file or image to object element - PASTE user event; drag and drop file to the corresponded cell - DRAGANDDROP user event
//        One or multiple cell selecting - buffer copy as text or/and as image (like excel cells are copied into whatsup)
//        multi cell selecting - copy (excel table), delete (removes all selected objects) with new user event 'DELETE' for every removing object
// Todo - Downloading big files don't show progress indicator. Check it. Bleat browser file download should display progress indicator anyway!
//        But uploading should display - fetch progress for uploading files https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload
// Todo - Autonavigate command for OV, for a example single mouse cell click edit the text in. Mouse single click emulate command (NONE|DBLCLICK|KEYPRESS) or create a new user event 'CLICK'? Usefull for chats.
//        Event CLICK shouldn't be used as a regular event with passing to the controller due to overload, it should be used as an alias to other events, for a example DBLCLICK
// Todo - EDIT controller cmd limits text lines number to edit https://toster.ru/q/355711
// Todo - View examples to be released: request ip/subnet list at OV open via input dialog and display 'setki.xls' for these ips/subnets
//										arp table history for one ip/mac
//                                      release also FSB request about our system ips perimetr, so every ip should have next types: client, service (web site, mail), system (ups, switch ip), net number, broadcast, free (if net number and broadcast are set correctly we can calc free nets)
//                                      every ip - comment, name from billing, name from mrtg, type, arp history[for FSB and buhgalters], ping) vendor, iz_zokii (ЗОКИИ - это значимый объект критической информационной инфраструктуры)
// Todo2 - Sort by header click for look like default element layout when header line at the top, bottom, left, right
// Todo1 - Always develop table functional to some needful excel functions!
// Todo0 - warning message (or just complete dialog?) and regexp search (emulates ctrl+shift+f at OV open) as a start event. Also emulate via start event 'select all objects and then delete them'
// 	   - Chart as a start OV event to display graphic instead of a table
// Todo0 - sql request in 'Element Layout' section in 'value' prop should select among its view object selection, but not from all objects! (see models piechart among switches with one or zero active clients)
