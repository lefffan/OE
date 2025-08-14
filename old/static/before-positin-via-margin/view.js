import { app } from './application.js';
import { SVGUrlHeader, SVGRect, SVGPath, SVGText, SVGUrlFooter, AdjustString, TAGHTMLCODEMAP, lg, dir } from './constant.js';
import { Interface } from './interface.js';

const TITLEVIRTUALROWID     = -2;
const NEWVIRTUALROWID       = -1;
const UNDEFINEDSELECTION    = 'Undefined database object selection!';
const MAXVIEWTABLEWIDTH     = 131072;
const MAXVIEWTABLEHEIGHT    = 131072;
const ELEMENTCOLUMNPREFIX   = 'eid';
const EDITABLE              = 'plaintext-only';
const NOTEDITABLE           = 'false';
const FOCUS_VERTICAL        = 0b001;
const FOCUS_HORIZONTAL      = 0b010;
const FOCUS_EDGE            = 0b100;
const PIXELSCROLLINGGAP     = 11;
const CELLMINWIDTH          = 25;
const CELLMINHEIGHT         = 25;

function CheckXYpropsCorrectness(object)
{
 return typeof object.x === 'string' && typeof object.y === 'string' && object.x && object.y && !NONEXPRESSIONCHARS.test(object.x) && !NONEXPRESSIONCHARS.test(object.y);
}

export class View extends Interface
{
 static style = { // Todo0 - Make new class .cellmarginoffset: { "margin-top": "-1px;", "margin-left": "-1px;" }
                 ".ovbox":                      { "position": "absolute;", "overflow": "none;", "min-width": "10%;", "min-height": "3%;", "border-radius": "4px;", "width": "30%;", "height": "30%;", "background-color": "RGB(230,230,230);", "box-sizing": "border-box;", "padding": "25px 0px 0px 0px;" },
	             ".ovbox h1":                   { "width": "100%;", "margin": "0;", "text-align": "center;", "position": "absolute;", "top": "50%;", "transform": "translateY(-50%);", "box-sizing": "border-box;" },
		         ".scrollingcontainer":         { "width": "100%;", "height": "100%;", "box-sizing": "border-box;", "overflow": "auto;", "scrollbar-gutter": "stable;", "border": "none;", "outline": "none;" },
		         ".viewcontainer":              { "width": "800px;", "height": "800px;", "box-sizing": "border-box;", "overflow": "none;", "border": "none;", "outline": "none;" },
		         ".gridcontainer":              { "position": "relative;", "display": "grid;", "box-sizing": "border-box;", "overflow": "none;", "margin": "0;", "padding": "0;", "width": "fit-content;", "height": "fit-content;", "border-left": "1px solid #999;", "border-top": "1px solid #999;" },
		         ".undefinedcell":              { "padding": "10px;", "background-color": "", "border-right": "1px solid #999;", "border-bottom": "1px solid #999;" },
		         ".titlecell":                  { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#CCC;", "font": "", "border-right": "1px solid #999;", "border-bottom": "1px solid #999;" },
		         ".newobjectcell":              { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#EFE;", "font": "", "border-right": "1px solid #999;", "border-bottom": "1px solid #999;" },
		         ".interactivecell":            { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "",      "font": "12px/14px arial;", "border-right": "1px solid #999;", "border-bottom": "1px solid #999;" },
		         ".noninteractivecell":         { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#EEE;", "font": "12px/14px arial;", "border-right": "1px solid #999;", "border-bottom": "1px solid #999;" },
		         ".virtualcell":                { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#EEE;", "font": "12px/14px arial;", "border-right": "1px solid #999;", "border-bottom": "1px solid #999;" },
                 ".noninteractivecursorcell":   { "outline": "red solid 1px;", "outline-offset": "-2px;", "box-shadow": "", "border": "" }, 
                 ".interactivecursorcell":      { "outline": "#1b74e9 solid 1px;", "outline-offset": "-2px;", "box-shadow": "", "border": "" }, 
                 ".clipboardcell":              { "outline-style": "dashed;" }, 
		         ".selectedcell":               { "background-color": "rgb(189,200,203) !important;" },
		         [`.ovbox table tbody tr td:not([contenteditable=${EDITABLE}])`]:   { "cursor": "cell;" },
                };

 constructor(...args)
 {
  const mouseareaselect = { elements: [], button: 0, captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', callback: [View.MouseAreaSelectControl] };
  if (!args[2]?.control) args[2].control = { text: {}, closeicon: {}, fullscreenicon: {}, resize: {}, resizex: {}, resizey: {}, mouseareaselect: mouseareaselect, default: {}, drag: {}, fullscreendblclick: {}, closeesc: {} };
  args[3] = { class: 'ovbox selectnone', style: 'left: 300px; top: 300px; background-color: RGB(230,230,230);' };
  super(...args);
  this.props.control.drag.elements = this.props.control.fullscreendblclick.elements = [this.elementDOM];
 }

 // Init OV params based on incoming message
 InitView(msg)
 {
  this.odid = msg.data.odid;
  this.ovid = msg.data.ovid;
  this.props.control.text.icon = SVGUrlHeader(250, 18) + SVGText(3, 14, `database id ${msg.data.odid}, view id ${msg.data.ovid}, sequence ${msg.id}`) + SVGUrlFooter();
  this.RefreshControlIcons();
  this.sidebarview = this.parentchild.sidebar.od[this.odid]['ov'][this.ovid];
  this.sidebarview.status = 0;
  this.sidebarview.childid = this.id;
  this.valuetableWidth = this.valuetableHeight = 0;
  this.columnWidths = [];
  this.rowHeights = [];
  this.collapsedrows = {};
  this.collapsedcols = {};
  this.definedcols = {};
  this.valuetable = [];
  this.objecttable = {};
  this.interactive = msg.data.interactive;
  this.layout = msg.data.layout;
  this.scrollingcontainer = null;
  this.viewcontainer = null;
  this.gridcontainer = null;
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
 // valuetable[y][x] = objecttable[o][e] = { row:, col:, x:, y:, value:, hint:, style:, collapserow:, collapsecol:, o:, e:, prop: }
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

 // Function joins cells via overwriting their props one by one
 JoinCells(...cells)
 {
  let result;
  for (const cell of cells)
      {
       if (!cell || typeof cell !== 'object') continue; // Continue for incorrect cell
       if (!result && (result = cell)) continue; // Assign first correct cell to the result object and continue
       for (const prop of ['style', 'x', 'y', 'value', 'hint', 'collapserow', 'collapsecol']) if (typeof cell[prop] === 'string') prop === 'style' ? result[prop] += cell[prop] : result[prop] = cell[prop]; // Overwrite all string props, except 'style' prop - it's accumulative
      }
  return result; // Return result cell combined all props from cell list
 }
 
 Handler(msg)
 {
  switch (msg.type)
         {
          case 'keydown':
               if (msg.getModifierState('ScrollLock') || !this.gridcontainer) break; // Scroll lock key or no griddoes exist? Break
               const offsets = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, Home: { x: 0, y: -MAXVIEWTABLEHEIGHT }, End: { x: 0, y: MAXVIEWTABLEHEIGHT }, PageUp: { x: 0 }, PageDown: { x: 0 } }; // Calc x/y offset (while moving cursor or selecting cells area) per key name
               if (!offsets[msg.code]) break; // No key moving cursor? break;
               if (['PageUp', 'PageDown'].includes(msg.code)) offsets[msg.code].y = Math.trunc(this.gridcontainer.clientHeight * this.valuetableHeight / this.gridcontainer.scrollHeight) * (msg.code === 'PageUp' ? -1 : 1); // Calc grid rows per page
               const offset = offsets[msg.code];
               let newcursor;
               if (msg.shiftKey)
                  {
                   newcursor = { x: this.cursor.x, y: this.cursor.y, areas: structuredClone(this.cursor.areas) };
                   if (!newcursor.areas.length) newcursor.areas.push({ x1: this.cursor.x, y1: this.cursor.y, x2: this.cursor.x, y2: this.cursor.y });
                   const area = newcursor.areas.at(-1);
                   area.x2 += offset.x;
                   area.y2 += offset.y;
                  }
                else
                  {
                   newcursor = { x: this.cursor.x + offset.x, y: this.cursor.y + offset.y };
                   newcursor.areas = [{ x1: newcursor.x, y1: newcursor.y, x2: newcursor.x, y2: newcursor.y }];
                  }
               if (!this.MoveCursor(this.cursor, newcursor)) msg.preventDefault();
               break;
          case 'SETVIEW':
               // Step 1 - init OV params and handle some errors, such as incoming msg 'error' property or undefined selection (which is impossible cause undefined selection may be in a try-catch exception only and generates an 'error' in msg)
               lg(msg);
               this.InitView(msg);
               if (msg.data.error || !msg.data.selection) return this.DisplayView(msg.data.error ? `<h1 style="color: RGB(251,179,179);">${msg.data.error}</h1>` : `<h1 style="color: RGB(251,179,179);">${UNDEFINEDSELECTION}</h1>`);
               const layout = this.layout;
               const q = this.q = msg.data.selection.length;

               // Step 2 - set cell for udnefined rows (virtual) which have row/column/oid undefined, so cell content needs to be retreived from the cell.value only
               for (const xy in layout.undefinedrows)
                   {
                    const cell = layout.undefinedrows[xy];
                    cell.class = 'virtualcell';
                    this.SetCell(cell, undefined, undefined, q);
                   }

               // Step 3 - handle db selection rows with two virtual rows ('title' and 'new') before
               for (let r = TITLEVIRTUALROWID; r < q; r++)
                   {
                    if (r === NEWVIRTUALROWID && !this.interactive) continue; // No lookup for new object input in case of non-interactive mode
                    const row = r >= 0 ? msg.data.selection[r] : undefined; // Redefine selection row
                    const o = r < 0 ? r : this.interactive ? row[layout.columnidindex] : undefined; // Assign object id to TITLEVIRTUALROWID (-2), NEWVIRTUALROWID (-1) or row[id] (>=0) for interactive and undefined for noninteractive
                    for (const c in layout.columns)
                        {
                         const column = layout.columns[c]; // Fix layout column  
                         const cell = { style: '' };
                         for (const i in layout.expressionrows) if (this.TestRowExpression(layout.expressionrows[i][column.original]?.row, r, +c, q)) this.JoinCells(cell, layout.expressionrows[i][column.original]);
                         [cell.o, cell.e, cell.prop, cell.lastversion] = [o, column.elementname, column.elementprop, row?.[layout.columnlastversionindex]];
                         if (typeof cell.value !== 'string')
                            {
                             let value = row?.[c];
                             if (r === TITLEVIRTUALROWID && cell.e) value = layout.systemelementnames[cell.e] ? cell.e : column.elementprofilename;
                             if (value && typeof value === 'object') cell.value = JSON.stringify(value); // Bring cell.value to appropriate value depending on its type. Todo0 - fix in help: use columns with data type explicitly set via :: with alias via ' as ', cause "eid1::json->'valu'" becomes "eid1"
                              else if (typeof value === 'number') cell.value = value + '';
                               else cell.value = typeof value === 'string' ? value : '';
                            }
                         if (r === TITLEVIRTUALROWID) cell.class = 'titlecell';
                         if (r === NEWVIRTUALROWID) cell.class = 'newobjectcell';
                         if (r >= 0) cell.class = cell.e && !layout.systemelementnames[cell.e] && cell.lastversion && this.interactive ? 'interactivecell' : 'noninteractivecell';
                         cell.interactive = (r === NEWVIRTUALROWID && cell.e && !layout.systemelementnames[cell.e]) || cell.class === 'interactivecell' ? true : false;
                         if (r === TITLEVIRTUALROWID && cell.e) cell.hint = layout.systemelementnames[cell.e] ? layout.systemelementnames[cell.e] : column.elementprofiledescription;
                         if (row?.[column.columnstyleindex]) cell.style += row[column.columnstyleindex];
                         if (row?.[column.columnhintindex]) cell.hint = row[column.columnhintindex];
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
  this.props.control.mouseareaselect.elements = [];
  if (typeof errormsg === 'string')
     {
      this.elementDOM.innerHTML = errormsg;
      this.sidebarview.status = 100;
      return;
     }

  // Step 2 - init same tables vars
  this.sidebarview.status = 100;
  let dispx, dispy = 0;
  let newtable = [];
  this.valuetableHeight = this.valuetable.length;
  for (let x = 0; x < this.valuetableWidth; x++) if (!this.collapsedcols[x] && !this.definedcols[x] && 'collapsecol' in this.layout.table) this.collapsedcols[x] = true;

  // Step 3 - collapse main table
  for (let y = 0; y < this.valuetableHeight; y++)
      {
       if (this.collapsedrows[y] && (dispy = dispy + 1)) continue;
       if (!this.valuetable[y] && 'collapserow' in this.layout.table && (dispy = dispy + 1)) continue;
       if (!this.valuetable[y]) continue;
       newtable[y - dispy] = this.valuetable[y];
       dispx = 0;
       for (let x = 0; x < this.valuetableWidth - dispx; x++) //if (this.collapsedcols[x + dispx] && this.valuetable[y].splice(x--, 1)) dispx++;
	       {
	        if (!this.collapsedcols[x + dispx]) continue;
            this.valuetable[y].splice(x, 1);
            x--;
            dispx++;
           }
      }
  this.valuetable = newtable;
  newtable = null;
  this.valuetableHeight -= dispy;
  this.valuetableWidth  -= dispx;
  this.columnWidths.length = this.valuetableWidth;
  this.rowHeights.length = this.valuetableHeight;
  this.columnWidths.fill(CELLMINWIDTH);
  this.rowHeights.fill(CELLMINHEIGHT);

  // Step 4 - Assign table specific vars and set cursor to initial position
  let style = this.layout.table.style ? this.layout.table.style + ' ' : '';
  style += `grid-template-columns: repeat(${this.valuetableWidth}, auto); grid-template-rows: repeat(${this.valuetableHeight}, auto);`;
  const title = this.layout.table.hint ? ` title="${this.layout.table.hint}"` : ``;
  this.elementDOM.innerHTML = `<div class="scrollingcontainer"><div class="viewcontainer"><div class="gridcontainer" style="${style}"${title}>${this.GetAreaInner({ x1: 0, y1: 0, x2: this.valuetableWidth - 1, y2: this.valuetableHeight - 1 })}</div></div></div>`;

  this.scrollingcontainer = this.elementDOM.querySelector('.scrollingcontainer');
  this.viewcontainer = this.elementDOM.querySelector('.viewcontainer');
  this.gridcontainer = this.elementDOM.querySelector('.gridcontainer');
  this.gridcontainer.style.top = '300px';

  this.props.control.mouseareaselect.elements.push([this.gridcontainer]);
  //this.MoveCursor(null, { x: 0, y: 0, areas: [{ x1: 0, y1: 0, x2: 0, y2: 0 }] });
 }

 // 
 GetAreaInner(area, table = this.valuetable)
 {
  let inner = '';
  for (let y = area.y1; y <= area.y2; y++)
  for (let x = area.x1; x <= area.x2; x++)
      {
       const id = `x${x}y${y}`;
       const cell = table[y]?.[x];
	   if (!cell && (inner = inner + `<div class="undefinedcell" id="${id}"></div>`)) continue;
       const title = cell.hint ? ` title="${cell.hint}"` : ``;
       const style = cell.style ? ` title="${cell.style}"` : ``;
       inner += `<div class="${cell.class}" id="${id}"${style}${title}>${cell.value}</div>`;
      }
  return inner;
 }
 
 // Todo0 - relaese row[0-..] as a column value and row[c] - as a current cell value in a row expression
 // Todo0 - adjust cell attributes and cell innerHTML (cell.value)
 // Todo0 - handle errors - zero length table, zero db selection, x/y out of range, no any valid layout json VIA context menu description
 // Todo2 - add additional wrapper for the view content to not overlap view header at scrolling
 // Todo0 - check table size at the end of table build - it may be zero length due to row/col collapse
 // Todo0 - Ctrl a, multiple selection, per object select, cursor next object jump, enter[+shift] moves cursor down[up] (in case of selection moves among selected cells)
 // Todo1 - scale ovbox content via child management icon +-
 // Todo1 - loading percent status animation and blue/green view icon
 // Todo1 - Child interaction via msg exchange only (!) via parent child management
 // Todo0 - Document controller-client message broker and build conception when call one view, then calling the second while 1st view os not yet loaded would cancel 1st view incoming data msg
 // Todo0 - ovbox h1 is out of view box
 // Todo0 - what if not prefinal overlaps previuous but previous overlap prefinal selected area? And dont forget rename overlay to overlap

 static MouseAreaSelectControl(userevent, control, phase)
 {
  if (!['capture', 'process'].includes(phase)) return; // Handle 'capture' and 'process' phase only
  const [x, y] = control.child.GetElementGridCoordinates(userevent.target); // Get event target grid x/y coordinates
  if (x === undefined) return; // Event is out of grid? Return
  let newcursor;
  if (phase === 'capture')
     {
      newcursor = { x: x, y: y, areas: userevent.ctrlKey ? structuredClone(control.child.cursor.areas) : [{ x1: x, y1: y, x2: x, y2: y }] }; // Clone old cursor for ctrl hold or create new cursor with new coordinates and empty area
      if (userevent.ctrlKey) newcursor.areas.push({ x1: x, y1: y, x2: x, y2: y }); // Add new empty area for start selecting with CTRL
     }
   else
     {
      newcursor = structuredClone(control.child.cursor); // Clone deeply old cursor 
      [newcursor.areas.at(-1).x2, newcursor.areas.at(-1).y2] = [x, y]; // and change its last area x2/y2 coordinates
     }
  control.child.MoveCursor(control.child.cursor, newcursor); // Move cursor :)
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
  for (let area of cursor.areas)
      {
       area = this.OrderArea(area);
       for (let y = area.y1; y <= area.y2; y++)
       for (let x = area.x1; x <= area.x2; x++)
           if (cell = this.GetGridCoordinatesElement(x, y))
           if (cursor.x === x && cursor.y === y) // Is it cursor within area?
              {
               cell.classList.remove('selectedcell');
               const cursorclass = `${this.valuetable[y]?.[x].interactive ? '' : 'non'}interactivecursorcell`;
               highlight ? cell.classList.add(cursorclass) : cell.classList.remove(cursorclass);
              }
            else
              {
               highlight ? cell.classList.add('selectedcell') : cell.classList.remove('selectedcell');
              }
      }
 }

 // Function checks whether table cell (grid item DOM element) left/right/top/bottom sides are out of visible scrolling container area due to overflow and adjusts scrolling container scrollLeft/scrollTop props
 AdjustContainerScrollingToFitTheTableCell(cell, scrollingcontainer, side)
 {
  switch (side)
         {
          case 'right':
               if (cell.offsetLeft + cell.offsetWidth >= scrollingcontainer.scrollLeft + scrollingcontainer.clientWidth) scrollingcontainer.scrollLeft = cell.offsetLeft + cell.offsetWidth - scrollingcontainer.clientWidth + PIXELSCROLLINGGAP;
          case 'left':
               if (cell.offsetLeft < scrollingcontainer.scrollLeft) scrollingcontainer.scrollLeft = cell.offsetLeft - PIXELSCROLLINGGAP;
               break;
          case 'bottom':
               if (cell.offsetTop + cell.offsetHeight >= scrollingcontainer.scrollTop + scrollingcontainer.clientHeight) scrollingcontainer.scrollTop = cell.offsetTop +cell.offsetHeight - scrollingcontainer.clientHeight + PIXELSCROLLINGGAP;
          case 'top':
               if (cell.offsetTop < scrollingcontainer.scrollTop) scrollingcontainer.scrollTop = cell.offsetTop - PIXELSCROLLINGGAP;
               break;
          default:
               this.AdjustContainerScrollingToFitTheTableCell(cell, scrollingcontainer, 'right');
               this.AdjustContainerScrollingToFitTheTableCell(cell, scrollingcontainer, 'bottom');
         }
 }

 // Order area coordinates putting x1 before x2, so y1
 OrderArea(area)
 {
  return { x1: Math.min(area.x1, area.x2), y1: Math.min(area.y1, area.y2), x2: Math.max(area.x1, area.x2), y2: Math.max(area.y1, area.y2) };
 }

 // Array of cursor/areas ({ object:, property:, maxvalue: }) to be cut to fit the range 0..maxvalue
 CutCursorCoordinatesToFitTheGrid(cursor)
 {
  cursor.x = Math.min(Math.max(0, cursor.x), this.valuetableWidth - 1); // Cut cursor coordinates
  cursor.y = Math.min(Math.max(0, cursor.y), this.valuetableHeight - 1); // Cut cursor coordinates

  const area = cursor.areas.at(-1);
  area.x1 = Math.min(Math.max(0, area.x1), this.valuetableWidth - 1); // Cut area
  area.x2 = Math.min(Math.max(0, area.x2), this.valuetableWidth - 1); // Cut area
  area.y1 = Math.min(Math.max(0, area.y1), this.valuetableHeight - 1); // Cut area
  area.y2 = Math.min(Math.max(0, area.y2), this.valuetableHeight - 1); // Cut area
 }

 // Function removes cursor prefinal area overlaps other selected areas before
 RemoveAreasOverlap(cursor)
 {
  for (let i = 0 ; i < cursor.areas.length - 2; i++) // Overlap for two areas and less is not needed, cause last area may be changed, so first area is not needed to compare to the second that may be changed
      {
       if (this.DoesAreaOneOverlapsAreaTwo(cursor.areas.at(-2), cursor.areas[i]) && cursor.areas.splice(i--, 1)) continue; // Prefinal area overlaps every area before? Delete that areas and continue
       if (!this.DoesAreaOneOverlapsAreaTwo(cursor.areas[i], cursor.areas.at(-2))) continue; // Current area doesn't overlap prefinal? Continue
       cursor.areas[cursor.areas.length - 2] = cursor.areas[i]; // Otherwise current area becomes prefinal. Interesting - firefox causes an error for the next line: cursor.areas.at(-2) = cursor.areas[i];
       cursor.areas.splice(i--, 1); // and current is removed
      }
 }

 // Function returns 'true' for area1 completely overlaps area2, 'false' for partly overlaping and 'undefined' for no intersection at all
 DoesAreaOneOverlapsAreaTwo(area1, area2)
 {
  area1 = this.OrderArea(area1);
  area2 = this.OrderArea(area2);
  if (area1.x1 <= area2.x1 && area1.x2 >= area2.x2 && area1.y1 <= area2.y1 && area1.y2 >= area2.y2) return true; // Full intersection
  if (area1.x2 < area2.x1 || area1.x1 > area2.x2 || area1.y2 < area2.y1 || area1.y1 > area2.y2) return; // No intersection at all
  return false; // Partly intersection
 }

 // Cursor object format: { x:, y: areas: [{ x1:, y1:, x2:, y2:}, {}..] }. Prop 'areas' consists of initial cell position (x1, y1) final cell position (x2, y2). Return true for no cursor/area position change
 MoveCursor(oldcursor, newcursor)
 {
  // Cut new cursor to fit the grid range and check old and new cursor positions (x, y and last selected area rectangle). No changes? Return
  this.grid.focus();
  this.CutCursorCoordinatesToFitTheGrid(newcursor);
  if (oldcursor)
  if (oldcursor.x === newcursor.x && oldcursor.y === newcursor.y)
  if (oldcursor.areas.length === newcursor.areas.length)
  if (!oldcursor.areas.length || (oldcursor.areas.at(-1).x1 === newcursor.areas.at(-1).x1 && oldcursor.areas.at(-1).x2 === newcursor.areas.at(-1).x2 && oldcursor.areas.at(-1).y1 === newcursor.areas.at(-1).y1 && oldcursor.areas.at(-1).y2 === newcursor.areas.at(-1).y2))
     return true;
  
  // Dehighlight old cursor and its areas and highlight new cursor with its areas not forgetiing to remove prefinal area overlay to other selected areas before
  this.HighlightTableCells(oldcursor);
  this.RemoveAreasOverlap(newcursor);
  this.HighlightTableCells(newcursor, true);
  this.cursor = newcursor;

  // Cursor x/y coordinates change or undefined old cursor (initial state) forces grid container to adjust its moving side via changing scrolling offset to fit the cursor. No cursor position change (area selection change) - adjust scrolling offset for all container sides passing undefined 3rd arg to 'AdjustContainerScrollingToFitTheTableCell' function
  const cell = !oldcursor || oldcursor.x !== newcursor.x || oldcursor.y !== newcursor.y ? this.GetGridCoordinatesElement(newcursor.x, newcursor.y) : this.GetGridCoordinatesElement(newcursor.areas.at(-1).x2, newcursor.areas.at(-1).y2);

  if ((!oldcursor) || (oldcursor.x !== newcursor.x && oldcursor.y !== newcursor.y)) return this.AdjustContainerScrollingToFitTheTableCell(cell, this.gridcontainer);
  if (oldcursor.x !== newcursor.x) return this.AdjustContainerScrollingToFitTheTableCell(cell, this.gridcontainer, oldcursor.x < newcursor.x ? 'right' : 'left');
  if (oldcursor.y !== newcursor.y) return this.AdjustContainerScrollingToFitTheTableCell(cell, this.gridcontainer, oldcursor.x < newcursor.x ? 'bottom' : 'top');
  //this.AdjustContainerScrollingToFitTheTableCell(cell, this.gridcontainer);
 }

 // 0. Calc grid container overlapping visible area - true result return, false - goto next, undefined - execute p.1 and p.4
 // 1. Calc full visible area render - new render area
 // 2. Then calc part of old render that is left visible and get item x,y (coordiantes in px and position in grid)
 // 3. Union two this areas and build union area inner
 // 4. Adjust scrolling container scrollLeft/scrollTop to move item from p.2 to old position, not edge render area values
 // 5. Call CalculateRenderArea() via rAF, so the function will be called until grid container will completely overlaps visible area
 CalculateRenderArea()
 {
  // Get visible area from scrolling container getting its offsetLeft/Top (x/y) and clientWidth/Height (x + width/y + height)
  const visiblearea = { x1: this.scrollingcontainer.offsetLeft + this.scrollingcontainer.scrollLeft,
                        y1: this.scrollingcontainer.offsetTop + this.scrollingcontainer.scrollTop,
                        x2: this.scrollingcontainer.offsetLeft + this.scrollingcontainer.scrollLeft + this.scrollingcontainer.clientWidth - 1,
                        y2: this.scrollingcontainer.offsetTop + this.scrollingcontainer.scrollTop + this.scrollingcontainer.clientHeight - 1 };

  // Get grid area from grid container getting its offsetLeft/Top (x/y) and clientWidth/Height (x + width/y + height)
  const gridcontainerarea = { x1: this.gridcontainer.offsetLeft,
                              y1: this.gridcontainer.offsetTop,
                              x2: this.gridcontainer.offsetLeft + this.gridcontainer.offsetWidth - 1,
                              y2: this.gridcontainer.offsetTop + this.gridcontainer.offsetHeight - 1 };
                    
  const overlap = this.DoesAreaOneOverlapsAreaTwo(gridarea, visiblearea);
  if (overlap) return;

  const renderarea = {};
  let offset;
  [ offset, renderarea.x1, renderarea.x2 ] = this.GetItemsRange(this.columnWidths, visiblearea.x1, visiblearea.x2);
  this.gridcontainer.style.left = `${offset}px`;
  [ offset, renderarea.y1, renderarea.y2 ] = this.GetItemsRange(this.columnWidths, visiblearea.y1, visiblearea.y2);
  this.gridcontainer.style.top = `${offset}px`;
  ReCalculateSize
 }

 GetItemsRange(sizes, from, to)
 {
  let offset, itemstart, itemend, sum = 0;
  for (let i = 0; i < sizes.length; i++)
      {
       if (itemstart === undefined && from >= sum && from < sum + sizes[i])
          {
           offset = sum;
           itemstart = i;
          }
       if (itemstart !== undefined && to >= sum && to < sum + sizes[i])
          {
           itemend = i;
           break;
          }
       sum += sizes[i];
      }
  return [ offset ?? sum - sizes.at(-1), itemstart ?? sizes.length - 1, itemend ?? sizes.length - 1 ];
 }
}

// View
// Todo - all view changes comes to client side with odid/ovid with object id and its element id. Controller passes all changes data to all clients that has this view opened.
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
//        smooth scrolling for rows more than 500 - event preventdefault on scroll event plus settimeout (dispatch scrolling event, 100);
//        check stepable table building via adding new rows via settimeout
//        --------------
//        calc number rows/cols based on their min height/width and container clientHeight/Width, scrollTop/Left and 

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
// Todo - View area specific style with background, border radius and so on

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
// Todo - Autonavigate command for OV, for a example single mouse cell click edit the text in. Mouse single click emulate command (NONE|DBLCLICK|KEYPRESS) or create a new user event 'CLICK'? Usefull for chats. Event CLICK shouldn't be used as a regular event with passing to the controller due to overload, it should be used as an alias to other events, for a example DBLCLICK
// Todo - EDIT controller cmd limits text lines number to edit https://toster.ru/q/355711
// Todo - View examples to be released: request ip/subnet list at OV open via input dialog and display 'setki.xls' for these ips/subnets
//										arp table history for one ip/mac
//                                      release also FSB request about our system ips perimetr, so every ip should have next types: client, service (web site, mail), system (ups, switch ip), net number, broadcast, free (if net number and broadcast are set correctly we can calc free nets)
//                                      every ip - comment, name from billing, name from mrtg, type, arp history[for FSB and buhgalters], ping) vendor, iz_zokii (ЗОКИИ - это значимый объект критической информационной инфраструктуры)

// Element layout and Object Selection
// Todo - warning message (or just complete dialog?) and regexp search (emulates ctrl+shift+f at OV open) as a start event. Also emulate via start event 'select all objects and then delete them'
// Todo - sql request in 'Element Layout' section in 'value' prop should select among its view object selection, but not from all objects! (see models piechart among switches with one or zero active clients)
//        Always develop table functional to some needful excel functions!
// Todo - Sort by header click for look like default element layout when header line at the top, bottom, left, right
// Todo - second and all next queries (for non Tree view types only) do query in previous query results