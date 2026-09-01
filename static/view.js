import { Interface } from './interface.js';
import { ContextMenu } from './contextmenu.js';
import { DialogBox } from './dialogbox.js';
import * as consts from './consts.js';
import * as funcs from './funcs.js';

const UNDEFINEDSELECTION   = 'Undefined database object selection!';
const EMPTYSELECTION       = 'Object View table is empty, no any data matched its object selection and/or element layout!';
const COLLAPSEDSELECTION   = 'Object View table is empty, all table cells are collapsed!';
const OUTOFRANGESELECTION  = 'Object View table is empty, all data has its x/y cell coordinates out of range!';
const CANCELEDVIEW         = 'Object View call was canceled by the user';
const MAXVIEWTABLEWIDTH    = 256 * 1024;
const MAXVIEWTABLEHEIGHT   = 256 * 1024;
const MAXVIEWCELLS         = 1024 * 1024;
const LEFTSIDE             = 0b1000; 
const TOPSIDE              = 0b0100; 
const RIGHTSIDE            = 0b0010; 
const BOTTOMSIDE           = 0b0001; 
const CURSOROFFSETS        = { ArrowUp: { y: -1 }, ArrowDown: { y: 1 }, ArrowLeft: { x: -1 }, ArrowRight: { x: 1 } };
const LAYOUTJSONPROPS      = ['exp', 'x', 'y', 'value', 'style', 'hint', 'collapsecol', 'collapserow', 'event'];

export class View extends Interface
{
 TransitionEnd()
 {
  super.TransitionEnd();
  this.Render();
 }

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
  this.ChangeHeader();
  this.range = document.createRange();   
  this.selection = window.getSelection();
}

 // Change view header
 ChangeHeader()
 {
  const od = `Database '${this.data.od ? this.data.od : ''}' (id${this.data.odid})`;
  const ov = `View '${this.data.ov ? this.data.ov : ''}' (id${this.data.ovid})`;
  const i = this.data.status === undefined ? -3 : this.data.status;
  const status = 'status: ' + ['undefined', 'client pending..', 'server pending..', `loaded ${i}%`][i + 3 > 3 ? 3 : i + 3];
  this.props.control.text.icon = funcs.SVGUrlHeader(768, 18) + funcs.SVGText(3, 14, `${od}, ${ov}, ${status}`) + funcs.SVGUrlFooter();
  this.RefreshControlIcons();
 }

 // Function makes OV table cell text content editable with 'data' as a initial text content if exist
 MakeCellContentEditable(cell, data, force)
 {
  this.HighlightClipboardAreas();
  if (this.contentEditableCell && !force) return; // No multiple cells with content editable feature turned on allowed, but <force> allows the feature at grid container redraw case when new cell html element should be editable
  const target = this.GetGridCoordinatesElement(cell?.x, cell?.y); // Get x,y coordinates table cell target
  if (!target) return;
  target.focus(); // and focus
  try { target.contentEditable = consts.EDITABLE; } // Set DOM element contentEditable property to 'plaintext' or 'true'
  catch { target.contentEditable = 'true'; } // Fucking FF doesn't support 'plaintext' contentEditable type on 2020 year
  target.textContent = typeof data === 'string' ? data : cell.value; // Set editable content substituting cell value or <data> if exist
  this.range.selectNodeContents(target); // Set cursor at the end of the content
  this.range.collapse(false);
  this.selection.removeAllRanges();
  this.selection.addRange(this.range);
  this.contentEditableCell = cell; // Turn on content editable feature to cancel it for other cell while it set for at least one cell
  target.classList.add('celleditmode');
 }

 // Set all object element instances cell inner
 SetCellInstancesInner(cell, inner)
 {
  const target = this.GetGridCoordinatesElement(cell.x, cell.y);
  if (target) target.innerHTML = inner;
  return true;
 }

 // Function makes OV table cell text content editable with 'data' as a initial text content if exist
 CancelCellEditableContent(cell)
 {
  if (!this.contentEditableCell) return; // No content editable cell, so no content to confirm
  const editablecell = this.contentEditableCell; // Fix editable cell
  const editabletarget = this.GetGridCoordinatesElement(editablecell.x, editablecell.y); // and its html element
  if (!editabletarget) return; // Element is unknown or removed? Do nothing and return
  editabletarget.contentEditable = consts.NOTEDITABLE; // Turn off target <contentEditable> attribute
  editabletarget.classList.remove('celleditmode');
  editabletarget.innerHTML = funcs.EscapeString(editablecell.value, true); // Roll back cell text content
  this.contentEditableCell = null; // Turn off content editable feature to allow other cells to have this feature turned on
 }

 // Function takes object <oid> element <eid> (in case of undefined <eid> all elements are taken), then iterates all their props placed in table. Then goes through all cells in table for specfied prop and calls <callback> with <args>
 SetCellInstances(oid, eid, excludedcell, callback, ...args)
 {
  if (!callback) return;
  const objects = this.objecttable[oid]; // Get object <oid>
  if (!objects) return;
  if (eid === undefined)
     {
      for (eid in objects) this.SetCellInstances(oid, eid, excludedcell, callback, ...args); // and make recurcive calls for all elements in object <oid>
      return;
     } 

  const jsonprops = objects[eid]; // Get map <jsonsprops> (note that <jsonprops> is a map due to hold any string jsin props with undefined one)
  if (jsonprops)
  for (const jsonprop of jsonprops.values()) // Iterate all json props
  for (const y in jsonprop) // Iterate 'y' prop in current <jsonprop>
  for (const x in jsonprop[y]) // and 'x' prop
      if (!excludedcell || excludedcell !== jsonprop[y][x]) // In case of defined <excludedcell> exclude it from iteration
      if (!callback(jsonprop[y][x], ...args)) return; // Call <callback> for these all shit and return for falsy result
 }

 // Function analyzes clicked/pressed cell and generate corresponded event to be passed to the controller
 ConfirmCellEditableContent(event, clickedcell)
 {
  if (!this.contentEditableCell) return; // No content editable cell, so no content to confirm
  const editablecell = this.contentEditableCell; // Fix editable cell
  const editabletarget = this.GetGridCoordinatesElement(editablecell.x, editablecell.y); // and its html element
  if (!editabletarget) return; // Element is unknown or removed? Do nothing and return
  const keyboardapply = event.key === 'Enter' && event.ctrlKey * 4 + event.altKey * 2 + event.shiftKey * 1 === 4 ? true : false; // Check if CTRL+ENTER is pressed 
  // Todo2 - refresh all element <editable.eid> instances interactively at any key pressed
  if (editablecell === clickedcell && !keyboardapply) return; // User clicked/pressed event is on editable cell, and event is not CTRL+ENTER? Return or apply cell content below

  this.contentEditableCell = null; // Turn off content editable feature to allow other cells to have this feature turned on
  editabletarget.contentEditable = consts.NOTEDITABLE; // Turn off target <contentEditable> var
  editabletarget.classList.remove('celleditmode'); // Remove 'edit mode' class
  editablecell.value = editabletarget.textContent; // Get text as it is to the cell value
  editabletarget.innerHTML = funcs.EscapeString(editablecell.value, true); // and set it pre-escaped to the innerHTML

  if (+editablecell.oid !== consts.NEWVIRTUALROWID) return { type: 'CONFIRMEDIT', destination: this.parentchild, data: this.GetCellMetaData({ value: editablecell.value }, editablecell) }; // Apply cell text content via CONFIRMEDIT client event to the controller
  this.SetCellInstances(editablecell.oid, editablecell.eid, editablecell, this.SetCellInstancesInner.bind(this), editabletarget.innerHTML); // Editable cell is a new object? Refresh element instances (innerHTML), going through all element jsonprops and then all json prop cells
  this.SetCellInstances(editablecell.oid, editablecell.eid, editablecell, (cell, editablecell) => (cell.value = editablecell.value) || true, editablecell); // Editable cell which content should be confirmed is a new object, so refresh this object specfified <eid> all cell instances
  return editablecell === clickedcell ? { type: 'ADDOBJECT', destination: this.parentchild, data: this.GetCellMetaData(this.GetNewObjectElementData(), null) } : undefined; // For mouse click out of editable cell no content confirm (so no new object apply, that is  for CTRL+ENTER or context menu), otherwise apply all NEWVIRTUALROWID object elements text content via ADDOBJECT client event to the controller
 }

 // Function returns 'new object' cells text content 
 GetNewObjectElementData()
 {
  const data = {};
  this.SetCellInstances(consts.NEWVIRTUALROWID, undefined, undefined, (cell, data) => cell.eid in consts.SYSTEMELEMENTNAMES ? false : (data[cell.eid] = cell.value) && false, data); 
  return data;
 }

 // Function create cell meta data object from optional <objs> list, all args except last are collected to one, last arg is a cell object to retrive oid/eid/eprop
 GetCellMetaData(...objs)
 {
  const resobj = {};
  for (let i = 0; i < objs.length; i++) if (objs[i]) Object.assign(resobj, i === objs.length - 1 ? { oid: objs[i].oid, eid: objs[i].eid, eprop: objs[i].eprop } : objs[i]);
  return Object.assign(resobj, { odid: this.data.odid, ovid: this.data.ovid });
 }

 DispatchMouseKeyboardEvent(event)
 {
  let eventpos;
  if (!this.cursor) return;
  if (event.type !== 'dblclick' && (eventpos = consts.NATIVEKEYBOARDEVENTS.indexOf(event.code)) === -1) return;
  const cell = this.valuetable?.[this.cursor.y]?.[this.cursor.x];
  if (!cell?.interactive) return;
  const modifier = String(event.ctrlKey * 4 + event.altKey * 2 + event.shiftKey * 1);
  if (event.type === 'dblclick') return { type: 'DOUBLECLICK', destination: this.parentchild, data: this.GetCellMetaData({ value: modifier }, cell) };
  const events = [{ type: consts.KEYBOARDEVENTS[eventpos], destination: this.parentchild, data: this.GetCellMetaData({ value: modifier }, cell) }];
  if (event.key && event.key.length === 1 && modifier === '0') events.push({ type: 'KEYPRESS', destination: this.parentchild, data: this.GetCellMetaData({ value: event.key }, cell) });
  return events;
 }

 ForEachCell(areas, handleUndfined, accumulator, callback, ...args)
 {
  for (let area of areas) if (area = this.OrderArea(area))
  for (let y = area.y1; y <= area.y2; y++) if (handleUndfined || this.valuetable[y])
  for (let x = area.x1; x <= area.x2; x++) if (handleUndfined || this.valuetable[y][x]) accumulator = callback(area, x, y, accumulator, ...args);
  return accumulator;
 }

 async CopyToClipboard(areas, plaintext)
 {
  this.HighlightClipboardAreas();
  const text = this.ForEachCell(areas, true, '', (area, x, y, accumulator, plaintext) => { const target = this.GetGridCoordinatesElement(x, y);
                                                                                           if (target && this.clipboardcell.push(target)) accumulator += plaintext ? target.innerText : target.innerHTML;
                                                                                           return x < area.x2 ? accumulator + ' ' : y < area.y2 ? accumulator + '\n' : accumulator; }, plaintext);
  try {
       await navigator.clipboard.writeText(text); // Todo0 - should oringinal text be copied to the clipboard?
       this.HighlightClipboardAreas(true);
      } 
  catch (error)
      {
       funcs.Log(`Copy to clipboard error: ${error}`);
      }
 }

 async GetFromClipboard(cell)
 {
  try {
       const text = await navigator.clipboard.readText();
       return this.EventManager({ type: 'PASTE', destination: this.parentchild, data: this.GetCellMetaData({ value: text }, cell) });
      }
  catch (error)
      {
       funcs.Log(`Get from clipboard error: ${error}`);
      }
 }

 Handler(event)
 {
  let cell, confirmevent, x, y, clickedelement;
  switch (event.type)
         {
          case 'DIALOG':
               const callback = { type: 'CONFIRMDIALOG', data: Object.assign({ odid: event.data.odid, ovid: event.data.ovid, oid: event.data.oid, eid: event.data.eid }, 'eprop' in event.data ? { eprop: event.data.eprop } : {}) };
               new DialogBox(event.data?.content, this, Object.assign(JSON.parse(consts.MODALBOXPROPS), { callback: callback }), event.data?.title, event.data?.ok, event.data?.cancel, event.data?.apply);
               return;
          case 'CONFIRMDIALOG':
               switch (event.source.props.callback.type)
                      {
                       case 'SETVIEW': // Macros definition dialog returned event SETVIEW
                            const { odid, ovid, od, ov, childid } = event.source.props.callback.data;
                            return { type: 'GETVIEW', destination: this.parentchild, data: { odid: odid, ovid: ovid, od: od, ov: ov, childid: childid, macros: funcs.GetDialogMacrosValues(event.source.data) } };
                       case 'CONFIRMDIALOG': // Object element handler dialog return CONFIRM calback
                            event.source.props.callback.destination = this.parentchild;
                            event.source.props.callback.content = event.source.data;
                            return event.source.props.callback;
                      }
               return;
	       case 'CANCELDIALOG':
               switch (event.source.props.callback.type)
                      {
                       case 'SETVIEW':
                            this.data.status = 100;
                            this.ChangeHeader();
                            return this.DisplayView(null, CANCELEDVIEW);
                      }
               return;
          case 'CONTEXTMENU':
               switch (event.data[0].substring(0, 6))
                      {
                       case 'Add ob':
                            return { type: 'ADDOBJECT', destination: this.parentchild, data: this.GetCellMetaData(this.GetNewObjectElementData(), null) };
                       case 'Delete':
                            return { type: 'DELETEOBJECT', destination: this.parentchild, data: this.GetCellMetaData(event.data[1], null) };
                       case 'Copy':
		                      this.CopyToClipboard(event.data[1], true); // Copy areas cell (1st arg) innerText/innerHTML (2nd arg) to clipboard
                            return;
                       case 'Paste':
                            this.GetFromClipboard(event.data[1]);
                            return;
                       case 'Help':
                            return { type: 'HELP', source: this.parentchild, destination: this.parentchild.parentchild };
                       case 'Logout':
                            return { type: 'LOGOUT', destination: this.parentchild };
                      }
               return;
          case 'KILL':
               return { type: 'SIDEBARVIEWSTATUS', data: { odid: this.data.odid, ovid: this.data.ovid, childid: undefined, status: undefined } };
          case 'mousedown':
               if (event.button === 1 || event.button > 2) return; // Do nothing for middle or non left-right mouse button click
               if (this.cursor)
                  {
                   [x, y, clickedelement] = this.GetElementGridCoordinates(event.target); // Get event target grid x/y coordinates
                   cell = this.valuetable[y]?.[x]; // and corresponded cell
                   confirmevent = this.ConfirmCellEditableContent(event, cell); // if cell editable content should be confirmed - return corresponded event or undefined
                  }
               if (event.button === 0) return event.buttons === 1 ? confirmevent : undefined; // For left single-button click return confirm event if exist, for left btn click together with any other - undefined
               const contextmenuitems = []; // Process right btn click
               if (this.cursor)
                  {
                   const areas = this.ItemInAreas(this.cursor.areas, x, y) ? this.cursor.areas : [{ x1: x, y1: y, x2: x, y2: y }];
                   const objectids = this.ForEachCell(areas, false, {}, (area, x, y, accumulator) => { const cell = this.valuetable[y][x]; if (cell?.interactive) accumulator[cell.oid] = ''; return accumulator; });
                   const length = Object.keys(objectids).length;
                   contextmenuitems.push(this.objecttable[consts.NEWVIRTUALROWID] ? ['Add object'] : 'Add object');
                   contextmenuitems.push([ 'Delete object', [`Delete object`, objectids], [`Delete ${length} objects`, objectids] ][length < 2 ? length : 2]);
                   contextmenuitems.push(x === undefined ? 'Copy' : ['Copy', areas]);
                   contextmenuitems.push(cell?.interactive ? ['Paste', cell] : 'Paste');
                   contextmenuitems.push(['Decription']);
                   if (x !== undefined && areas !== this.cursor.areas) this.MoveCursor({ x: x - this.cursor.x, y: y - this.cursor.y }, false, true);
                  }
               contextmenuitems.push(['Help']);
               contextmenuitems.push(['Logout ' + funcs.CutString(this.data.username)]);
               new ContextMenu(contextmenuitems, this, event);
               return confirmevent;
          case 'dblclick':
               return this.DispatchMouseKeyboardEvent(event);
          case 'keydown':
               if (!this.cursor) return;
               switch (event.code)
                      {
                       case 'Escape':
                            this.CancelCellEditableContent(); // Handle esc key down for editable cell
                            this.HighlightClipboardAreas();
                            break;
                       case 'Insert':
                            if (event.ctrlKey * 4 + event.altKey * 2 + event.shiftKey * 1 === 4) this.CopyToClipboard(this.cursor.areas); // Copy cursor areas (1st arg) innerText/innerHTML (2nd arg) to clipboard for CTRL+INSERT hold. Todo0 - should i use CTRL+C combination to do the same and should i return back INSERT key to the event list that was removed due 'copy-to-clipboard' event?
                            break;
                       default:
                            confirmevent = this.contentEditableCell ? this.ConfirmCellEditableContent(event, this.valuetable[this.cursor.y]?.[this.cursor.x]) : undefined;
                            if (!confirmevent && this.contentEditableCell) return;
                            confirmevent = confirmevent || this.DispatchMouseKeyboardEvent(event); // Retreive keyboard generated event, for 'eventable' keys only
                            if (confirmevent) return confirmevent; // and return it to dispatch it to the controller if true
                            if (event.getModifierState('ScrollLock') || !this.gridcontainer) break; // Handle cursor moving keys then, for no scroll-lock key on and existing grid
                            const page = Math.ceil((this.gridcontainer.clientHeight * this.layout.valuetableHeight) / (this.mtop + this.gridcontainer.scrollHeight + this.mbottom)); // Calculate page height in cells
                            Object.assign(CURSOROFFSETS, { Home: { y: -this.layout.valuetableHeight }, End: { y: this.layout.valuetableHeight }, PageUp: { y: -page }, PageDown: { y: page } }); // and store offsets for that kind of keys
                            if (CURSOROFFSETS[event.code]) event.preventDefault(); // Prevent event default for moving keys
                            this.MoveCursor(CURSOROFFSETS[event.code], event.shiftKey, true); // and move cursor to the specified offset
                      }
               return;
          case 'SETVIEW': // { type: 'SETVIEW', data: { error: } | { dialog: } | { selections: [ { rows: <[][]>, fields: <[]{ name:, eid:, eprop:, header:, description: }> },.. ], layout: { actual: [], virtual: [], incorrect: '', matches: [] }, query:, macros: {}, } }
               // Step 1 - init OV params and handle some errors, such as incoming event 'error' property or undefined selection (which is impossible cause undefined selection may be in a try-catch exception only and generates an 'error' in event)
               this.EventManager({ type: 'KILL', destination: null }); // Kill all view childs (dialogs)
               if (event.data.dialog) return this.DisplayView('', 'Pending..', event);
               if (event.data.error) return this.DisplayView(event.data.error);
               if (!event.data.selections || !event.data.selections.length) return this.DisplayView(UNDEFINEDSELECTION);
               this.clipboardcell = [];
               this.columnWidths = [];
               this.rowHeights = [];
               this.valuetable = [];
               this.objecttable = {};
               this.scrollingcontainer = null;
               this.gridcontainer = null;
               this.cursor = null;
               this.contentEditableCell = null;

               // Step 2 - Parse selection data
               this.layout = this.ParseLayout(event.data.layout);
               let i = 0, j = Math.min(consts.TITLEVIRTUALROWID, consts.NEWVIRTUALROWID);
               const q = event.data.selections.reduce((sum, selection) => sum + selection.rows.length, 0);
               if (this.layout.actual.length) for (let s = 0; s < event.data.selections.length; s++) // Go through all selections
                  {
                   const selection = event.data.selections[s].rows; // Select selection
                   const fields = event.data.selections[s].fields; // Select fields
                   const l = selection.length; // then its length
                   const w = selection[0].length; // and width
                   for (let r = s === 0 ? consts.TITLEVIRTUALROWID : 0; r < l; r++) // Go through all selection rows
                       {
                        const row = r >= 0 ? selection[r] : undefined; // Select current selection row or (in case of new/header object) undefined
                        for (let c = 0; c < w; c++) // Go through all columns
                            {
                             const newcell = {}; // Create new cell to suck in all matched props
                             const exps = [];
                             if (this.layout.cellscount >= MAXVIEWCELLS) break; // Total cell count exceeds <MAXVIEWCELLS>? Fuck break
                             for (let a = 0; a < this.layout.actual.length; a++) // Go through all <layout.actual> jsons to eval 'exp' string expressions, note - empty expression is a falsy case
                                 {
                                  const json = this.layout.actual[a];
                                  try { // Evaluate non empty 'exp' property string on true/false result , true rsult collects <json> props to <newcell> with additive 'style' prop
                                       if (!json.exp || !(new Function('selection', 'i', 'j', 'r', 'c', 'l', 'w', 'q', 's', `return ${json.exp}`)(selection, i, j, r, c, l, w, q, s))) continue;
                                       Object.assign(newcell, json, { style: (newcell.style || '') + (json.style || '') });
                                       exps.push(a); // Push matched json object index
                                       this.layout.actualmatched[a] = (this.layout.actualmatched[a] || 0) + 1;
                                      }
                                  catch {}
                                 }
                             if (!exps.length) continue; // No any matched json.exp? Continue
                             newcell.exp = exps; // Fixed matched json object indexes
                             // Process 'event' prop with default x,y zero values
                             if ('event' in newcell) this.layout.event = { event: newcell.event, x: 0, y: 0 };
                             // Process 'x,y' props
                             try {
                                  // Process 'x' prop
                                  newcell.x = newcell.x ? +(new Function('selection', 'i', 'j', 'r', 'c', 'l', 'w', 'q', 's', `return ${newcell.x}`)(selection, i, j, r, c, l, w, q, s)) : i; // Eval 'x' prop
                                  if (typeof newcell.x !== 'number' || isNaN(newcell.x)) continue; // Not a number type or NaN? Continue
                                  newcell.x = Math.round(newcell.x); // Fix it to nearest integer
                                  if ((newcell.x < 0 || newcell.x >= MAXVIEWTABLEWIDTH) && (this.layout.cellsoutofrange++)) continue; // Check 'x' prop out of range and increase <cellsoutofrange> in case
                                  // Process 'y' prop
                                  newcell.y = newcell.y ? +(new Function('selection', 'i', 'j', 'r', 'c', 'l', 'w', 'q', 's', `return ${newcell.y}`)(selection, i, j, r, c, l, w, q, s)) : j; // Eval 'y' prop
                                  if (typeof newcell.y !== 'number' || isNaN(newcell.y)) continue; // Not a number type or NaN? Continue
                                  newcell.y = Math.round(newcell.y); // Fix it to nearest integer
                                  if ((newcell.y < 0 || newcell.y >= MAXVIEWTABLEHEIGHT) && (this.layout.cellsoutofrange++)) continue; // Check 'y' prop out of range and increase <cellsoutofrange> in case
                                 }
                             catch { continue; }
                             // Process value prop
                             if (r === consts.TITLEVIRTUALROWID && !('value' in newcell) && fields?.[c]?.header) newcell.value = fields[c].header; // For title row and absent value suck in field header if exist
                             if (!('value' in newcell)) newcell.value = row?.[c]; // For still no 'value' prop suck it from selection
                             if (typeof newcell.value !== 'string') // For non-string 'value' prop do to-string conversion
                             if (newcell.value && typeof newcell.value === 'object') newcell.value = JSON.stringify(newcell.value); // Bring newcell.value to string type
                              else newcell.value = newcell.value === undefined ? '' : String(newcell.value);
                             // Process hint prop
                             if (!('hint' in newcell) && r !== consts.NEWVIRTUALROWID) // Procee hint absent cells for all rows except 'new'
                             if (r === consts.TITLEVIRTUALROWID) // For title rows suck hint from element description
                                {
                                 if (fields?.[c]?.description)
                                    newcell.hint = fields[c].description;
                                }
                              else // For selection rows - from row other element->hint extraction fields
                                {
                                 if (fields[c].eid) for (let fieldindex = 0; fieldindex < fields.length; fieldindex++)
                                    if (fields[c].eid === fields[fieldindex].eid && fields[fieldindex].eprop === 'hint' && ((newcell.hint = String(row[fieldindex])) || true)) break;
                                }
                             if (newcell.hint) newcell.hint = funcs.EscapeString(newcell.hint).trim();
                             // Process style prop
                             if (row) // For selection rows with absent 'style' prop - suck in from other element->style extraction fields
                                {
                                 if (fields[c].eid) for (let fieldindex = 0; fieldindex < fields.length; fieldindex++)
                                    if (fields[c].eid === fields[fieldindex].eid && fields[fieldindex].eprop === 'style' && ((newcell.style = String(row[fieldindex]) + (newcell.style || '')) || true)) break; // Todo0 - check every field on eid->hint/style data just to set it quickly for every element - first seach fields like eidN->hint/style, then search fields for found eidN and fix it
                                }
                             if (newcell.style) newcell.style = funcs.EscapeString(newcell.style).trim();
                             // Process 'event' prop once again with actual x,y values fixing last matched event
                             if ('event' in newcell) this.layout.event = newcell;
                             // Process cell meta data for an actual element. Cell is interactive in case of 'id(oid)/eid' does exist (actual element) and 'lastversion' is true. For 'new' virtual row 'eid' should exist only
                             // Todo0 - how db non string values are appeared in back-parsed-to object serialized db data - such as numbers, JSON, datetime. Check it
                             if (fields[c].eid)
                                {
                                 if (row)
                                 for (const name in consts.SYSTEMELEMENTNAMES)
                                 for (let fieldindex = 0; fieldindex < fields.length; fieldindex++)
                                     if (fields[fieldindex].name === name) newcell[name] = String(row[fieldindex]);
                                 newcell.eid = String(fields[c].eid);
                                 if ('eprop' in fields[c]) newcell.eprop = fields[c].eprop;
                                 if ('id' in newcell) newcell.oid = newcell.id;
                                 if (r < 0) newcell.oid = newcell.id = String(r); // Set virtual rows (title/new) object ids
                                }
                             newcell.name = fields[c].name; // Set <newcell> sql column name
                             // Process cell interactive prop - it is true in case of 'id(oid)/eid' does exist (actual element) and 'lastversion' is true. For 'new' virtual row - 'eid' should exist only
                             newcell.interactive = false;
                             if (newcell.eid && !(newcell.eid in consts.SYSTEMELEMENTNAMES))
                                if (+newcell.oid === consts.NEWVIRTUALROWID || ('id' in newcell && 'lastversion' in newcell && +newcell.id >= consts.PRIMARYKEYSTARTVALUE && newcell.lastversion[0] === 't'))
                                   newcell.interactive = true;
                             // Process class prop
                             newcell.class = ['titlecell', 'newobjectcell', 'interactivecell', 'noninteractivecell'].at(r < 0 ? r + 2 : newcell.interactive ? 2 : 3); 
                             // Process 'collapse' props
                             if ('collapserow' in newcell) this.layout.collapsedrows[newcell.y] = true; // Fix row number to collapse
                             if ('collapsecol' in newcell) this.layout.collapsedcols[newcell.x] = true; // Fix column number to collapse
                             delete newcell.collapserow;
                             delete newcell.collapsecol;
                             // Place <newcell> to the table array
                             this.TableCellPlace(newcell);
                             // Move cursor to the right
                             i++;
                            }
                        j++;
                        i = 0;
                       }
                  }

               // Step 3 - Parse virtual data
               for (let a = 0; a < this.layout.virtual.length; a++) // Go through all <layout.virtual> jsons to eval 'value' string expressions, note - empty expression is a falsy case
                   {
                    try {
                         if (this.layout.cellscount >= MAXVIEWCELLS) throw new Error();
                         const newcell = this.layout.virtual[a];
                         // Process 'x' prop
                         newcell.x = newcell.x ? +(new Function('i', 'j', 'q', `return ${newcell.x}`)(i, j, q)) : i; // Eval 'x' prop
                         if (typeof newcell.x !== 'number' || isNaN(newcell.x)) throw new Error(); // Not a number type or NaN? Continue
                         newcell.x = Math.round(newcell.x); // Fix it to nearest integer
                         if ((newcell.x < 0 || newcell.x >= MAXVIEWTABLEWIDTH) && (this.layout.cellsoutofrange++)) throw new Error(); // Check 'x' prop out of range and increase <cellsoutofrange> in case
                         // Process 'y' prop
                         newcell.y = newcell.y ? +(new Function('i', 'j', 'q', `return ${newcell.y}`)(i, j, q)) : j; // Eval 'y' prop
                         if (typeof newcell.y !== 'number' || isNaN(newcell.y)) throw new Error(); // Not a number type or NaN? Continue
                         newcell.y = Math.round(newcell.y); // Fix it to nearest integer
                         if ((newcell.y < 0 || newcell.y >= MAXVIEWTABLEHEIGHT) && (this.layout.cellsoutofrange++)) throw new Error(); // Check 'y' prop out of range and increase <cellsoutofrange> in case
                         if (newcell.hint) newcell.hint = funcs.EscapeString(newcell.hint).trim();
                         if (newcell.style) newcell.style = funcs.EscapeString(newcell.style).trim();
                         newcell.originalvalue = newcell.value; // Store original value to eval it at all next table data refresh 
                         newcell.originalhint = newcell.hint; // Store original hint to be able to restore it in case of a exception
                         newcell.class = 'virtualcell';
                         if (this.TableCellPlace(newcell, true)) a--; // If new cell replaces existing virtual cell, then increase virtual cell index, cause <this.TableCellPlace> function removed approppriate element in <this.layout.virtual> array
                        }
                    catch
                        {
                         this.layout.virtual.splice(a--, 1);
                         continue;
                        }
                   }
               this.EvalVirtualCells(this.valuetable); // Todo0 - add virtual cell values refresh at any OV data refresh

               // Step 4 - hanlde result table zero height or display OV table. Todo0 - add newcell attibutes 'x~y', 'class', 'style', 'title' to easily add them to cell div
               return this.DisplayView(null, this.valuetable.length ? null : this.layout.cellsoutofrange ? OUTOFRANGESELECTION : EMPTYSELECTION);
         }
 }

 // Vars in a layout jsons: s (zero based selection number), i,j (current cursor x,y zero based position), r,c (current selection row/column zero based position), selection (current selection data array), l,w,q (current selection length/width, all selection summary length), x/y (current cell table x/y coordianates), table (client side table array with cell of string/undefined data types)
 // +------------------------------------------------------------+
 // |  exp: boolean expression of all vars except table, x, y    | indicates a selection array element match expression, empty property is a falsy case, so no any selection data is matched. True expression places selection element string to x/y table coordinates. Jsons with no 'exp' property defines virtual cells
 // |  x, y: number expression of all vars except table, x, y    | table cell x/y coordinates to place selection/virtual data. For virtual data vars are - i,j,q. Empty/undefined x/y - cursor placement
 // |  value: string [expression of table, x, y]                 | Plain text for usual cells or [expression for virtual cells]
 // |  title, style: plain text                                  | Cell div html element title/style attributes
 // |  collapserow, collapsecol: any                             | These props any value does collapse whole table rows/columns for specified x/y table coordinates or undefined rows/columns for virtual cells with no value
 // |  event: event_name[event_data]                             | Event name (ADDOBJECT/DELETEOBJECT/CONFIRMEDIT/PASTE/DOUBLECLICK/keyboard_events) to emulate at OV open to the cursor cell. Event data is for CONFIRMEDIT/PASTE/KEYPRESS events only. Event is applied to the cursor cell. Unsupport event name or non interactive cell - no emulation, but cursor is set to the position specified by x/y (with x=0, y=0 values for default) coordinates anyway, so JSON '{"event":"", "x":"2", "y":"q-1"}' sets cursor to the last row third column
 // +------------------------------------------------------------+
 ParseLayout(jsons)
 {
  const layout = { actual: [], actualmatched: [], virtual: [], virtualmatched: [], incorrect: '', cellscount: 0, cellsoutofrange: 0, global: {}, event: { event: '', x: 0, y: 0 }, collapsedcols: {}, collapsedrows: {}, definedcols: {}, valuetableWidth: 0, valuetableHeight: 0 };

  for (let line of jsons.split('\n')) if (line = line.trim())
      {
       try {
            const json = JSON.parse(line); // Convert json to object, clear it from unnecessary props, trim them all except "value" and check json correctness
            for (const prop in json)
                if (!LAYOUTJSONPROPS.includes(prop) || typeof json[prop] !== 'string') delete json[prop];
                 else if (prop !== 'value') json[prop] =  json[prop].trim();
 
            if (!Object.keys(json).length) throw new Error(); // Throw an error for no any props
            if (!('exp' in json) && !('value' in json))
               {
                for (const prop of ['style', 'hint', 'collapserow', 'collapsecol']) if (prop in json) layout.global[prop] = json[prop];
                continue;
               }
            layout[`${'exp' in json ? 'actual' : 'virtual'}`].push(json);
           }
       catch
           {
            layout.incorrect += line + '\n';
           }
      }
 
  return layout;
 }
 
 // Function places cell data to <this.valuetable> array
 TableCellPlace(cell, isVirtual)
 {
  let oldcell;
  if (cell.x >= this.layout.valuetableWidth) this.layout.valuetableWidth = cell.x + 1; // Increase value table width if needed
  if (!this.valuetable[cell.y]) this.valuetable[cell.y] = []; // Create new table row number 'y' if needed
  this.layout.definedcols[cell.x] = true; // Fix column number 'x' as existed
  if (!this.valuetable[cell.y][cell.x]) this.layout.cellscount++; // Count new cells
  if (isVirtual) oldcell = this.valuetable[cell.y][cell.x]; // Fix table previous element
  this.valuetable[cell.y][cell.x] = cell; // Set table new element
  if (!isVirtual || !oldcell) return;
  const indextodelete = this.layout.virtual.indexOf(oldcell);
  if (indextodelete >= 0) return this.layout.virtual.splice(indextodelete, 1);
 }

 // Functions evaluates all virtual cells values
 EvalVirtualCells(table)
 {
  for (const cell of this.layout.virtual)
  {
   try { cell.hint = cell.originalhint; cell.value = new Function('table', 'x', 'y', 'return `' + cell.originalvalue + '`')(table, cell.x, cell.y); }
   catch { cell.hint = `The cell value "${cell.originalvalue}" expression evaluation threw an exception!`; cell.value = ''; }
  }
 }

 DisplayView(errormsg, warningmsg, dialogmsg)
 {
  // Step 1 - display some messages if needed and return
  this.data.status = dialogmsg ? -2 : 100; // Set 'pending' status for OV macros dialog or 100% loaded otherwise
  const event = { type: 'SIDEBARVIEWSTATUS', data: Object.assign(this.data, { childid: this.id }) }; // Fix refresh sidebar OV status event
  this.props.control.mouseareaselect.elements = [];
  if (errormsg || warningmsg || dialogmsg)
     {
      if (errormsg || warningmsg) this.elementDOM.innerHTML = `<div class="ovboxmessage" style="color: ${errormsg ? 'RGB(251,179,179)' : '#9FBDDF'};"><div  style="text-align: justify;"><h1>${errormsg ? errormsg : warningmsg}</h1></div></div>`;
      this.ChangeHeader();
      if (dialogmsg) new DialogBox(dialogmsg.data.dialog, this, Object.assign(JSON.parse(consts.MODALBOXPROPS), { flag: Interface.MODALBROTHERKILLSME, callback: dialogmsg }), undefined, undefined, undefined, null); // Create macros definition dialog with null as a last arg to remove interactive btns
      return event;
     }

  // Step 2 - init same tables vars
  let dispx, dispy = 0;
  let newtable = []; // Create new table to replace the <valuetable> to
  this.layout.valuetableHeight = this.valuetable.length; // Set table height
  for (let x = 0; x < this.layout.valuetableWidth; x++)
      if (!this.layout.collapsedcols[x] && !this.layout.definedcols[x] && 'collapsecol' in this.layout.global) this.layout.collapsedcols[x] = true; // Collapse column 'x' if it's not already collapsed and cell is undefined and 'collapsecol' is in this.layout.global

  // Step 3 - collapse main table
  for (let y = 0; y < this.layout.valuetableHeight; y++)
      {
       if (this.layout.collapsedrows[y] && (dispy = dispy + 1)) continue; // Collapse row 'y' with increasing <y> displacement
       if (!this.valuetable[y] && 'collapserow' in this.layout.global && (dispy = dispy + 1)) continue; // Collapse row 'y' also with increasing <y> displacement if the row is undefined
       if (!this.valuetable[y]) continue; // Skip undefined row
       newtable[y - dispy] = this.valuetable[y]; // Add existing table row to a new table shifted row <y - dsipy>
       dispx = 0; // Process current row all columns for 'collapsing' below
       for (let x = 0; x < this.layout.valuetableWidth - dispx; x++) // if (this.collapsedcols[x + dispx] && this.valuetable[y].splice(x--, 1)) dispx++;
        if (this.layout.collapsedcols[x + dispx]) // Collapse the column 'x' for row 'y'
	      {
            this.valuetable[y].splice(x, 1); // splicing all elements to the left
            x--; // decreasing current column number <x>
            dispx++; // and increasing <dispx>
           }
         else // Cell is not collapsed, so adjust its x,y and bind it to object table
	      {
            const cell = this.valuetable[y][x]; // Set value table element to <cell>
            if (!cell) continue;
            cell.x = x; // Rewrite cell x,y coordinates due to colapsing
            cell.y = y - dispy;
            if (!('oid' in cell) || !('eid' in cell)) continue;
            if (!this.objecttable[cell.oid]) this.objecttable[cell.oid] = {};
            if (!this.objecttable[cell.oid][cell.eid]) this.objecttable[cell.oid][cell.eid] = new Map();
            if (!this.objecttable[cell.oid][cell.eid].get(cell.eprop)) this.objecttable[cell.oid][cell.eid].set(cell.eprop, {});
            if (!this.objecttable[cell.oid][cell.eid].get(cell.eprop)[cell.y]) this.objecttable[cell.oid][cell.eid].get(cell.eprop)[cell.y] = {};
            this.objecttable[cell.oid][cell.eid].get(cell.eprop)[cell.y][cell.x] = cell; // Bind <cell> with its uniq x,y coordinates to object id element id (one object element may be placed in multiple table cells due to some layout configurations)
           }
      }
  this.valuetable = newtable; // Replace old value table by new value table
  newtable = null; // and delete <newtable> object link
  this.layout.valuetableHeight -= dispy; // Decrease height and width values to colapsed rows and columns
  this.layout.valuetableWidth  -= dispx;
  this.columnWidths.length = this.layout.valuetableWidth; // Limit row/columns sizes arrays to the table height/width
  this.rowHeights.length = this.layout.valuetableHeight;
  this.columnWidths.fill(consts.CELLMINWIDTH); // and fill these arrays by cell pixel min width/height
  this.rowHeights.fill(consts.CELLMINHEIGHT);
  if (!this.layout.valuetableWidth || !this.layout.valuetableHeight) return this.DisplayView(null, COLLAPSEDSELECTION); // Display warning for colapsed table

  // Step 4 - Assign table specific vars and set cursor to initial position
  this.elementDOM.innerHTML = `<div class="scrollingcontainer"${this.layout.global.style ? ' style="' + this.layout.global.style + '"' : ''}${this.layout.global.hint ? ' title="' + this.layout.global.hint + '"' : ''}></div>`;
  this.scrollingcontainer = this.elementDOM.querySelector('.scrollingcontainer');
  const x = Math.min(this.layout.valuetableWidth - 1, this.layout.event.x);
  const y = Math.min(this.layout.valuetableHeight - 1, this.layout.event.y);
  this.cursor = { x: x, y: y, areas: [{ x1: x, y1: y, x2: x, y2: y }] };

  this.scrollingcontainer.addEventListener('scroll', () => {
                                                            if (this.cursor.ticking) return; // Content render executed in a <requestAnimationFrame> line below is not complete, so another render process shouldn't be started yet
                                                            window.requestAnimationFrame(() => { this.Render(); this.cursor.ticking = false; }); // Render is complete, so may start another one
                                                            this.cursor.ticking = true; // Render is started in a line above, so is not complete
                                                           });
  this.Render();
  this.ChangeHeader();
  return event;
 }

 // Render itemArea (to grid area) object and place it to visible area. Function works in three modes:
 // 1. Grid area is scrolled, but still in visible area, so do nothing
 // 2. Grid area partly intersects visible area due to user scrolling. Calculate item area via grid area sides to expand to visible area and build new grid area inner html
 // 3. Grid area doesn't intersect visible area due to user scroll navigating or cursor position set. Calculate item area via scroll offset or cursor position
 Render()
 {
  if (!this.cursor) return;
  if (this.cursor.noscrollredraw) return (this.cursor.noscrollredraw = false);

  // Step 1 - Render item area based on alignment x,y coordinates, so no scrolling/resizing events are made and grid container area position are not taken into account
  const visiblearea = this.GetElementAreaRect(this.scrollingcontainer, true); // Get visible area from scrolling container getting its offsetLeft/Top (x/y) and clientWidth/Height (x + width/y + height)
  if (this.cursor.alignment)
     {
      this.cursor.alignment.visiblearea = visiblearea;
      if (this.cursor.alignment.sides & LEFTSIDE || this.cursor.alignment.sides & RIGHTSIDE)
         {
          this.itemArea.x1 = this.itemArea.x2 = this.cursor.alignment.x;
          const itemwidth = Math.ceil((visiblearea.x2 - visiblearea.x1 + 1) / consts.CELLMINWIDTH);
          if (this.cursor.alignment.sides & LEFTSIDE) { this.itemArea.x2 += itemwidth; this.itemArea.x1--; }
           else { this.itemArea.x1 -= itemwidth; this.itemArea.x2++; }
          if (this.itemArea.x1 < 0) { this.itemArea.x2 = Math.min(this.itemArea.x2 - this.itemArea.x1, this.layout.valuetableWidth - 1); this.itemArea.x1 = 0; }
          if (this.itemArea.x2 >= this.layout.valuetableWidth) { this.itemArea.x1 = Math.max(this.itemArea.x1 - this.itemArea.x2 + this.layout.valuetableWidth - 1, 0); this.itemArea.x2 = this.layout.valuetableWidth - 1; }
         }
      if (this.cursor.alignment.sides & TOPSIDE || this.cursor.alignment.sides & BOTTOMSIDE)
         {
          this.itemArea.y1 = this.itemArea.y2 = this.cursor.alignment.y;
          const itemheight = Math.ceil((visiblearea.y2 - visiblearea.y1 + 1) / consts.CELLMINHEIGHT);
          if (this.cursor.alignment.sides & TOPSIDE) { this.itemArea.y2 += itemheight; this.itemArea.y1--; }
           else { this.itemArea.y1 -= itemheight; this.itemArea.y2++; }
          if (this.itemArea.y1 < 0) { this.itemArea.y2 = Math.min(this.itemArea.y2 - this.itemArea.y1, this.layout.valuetableHeight - 1); this.itemArea.y1 = 0; }
          if (this.itemArea.y2 >= this.layout.valuetableHeight) { this.itemArea.y1 = Math.max(this.itemArea.y1 - this.itemArea.y2 + this.layout.valuetableHeight - 1, 0); this.itemArea.y2 = this.layout.valuetableHeight - 1; }
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
      this.itemArea =  { x1: Math.floor(this.scrollingcontainer.scrollLeft / consts.CELLMINWIDTH), // For visible area define item area due to default item pixel min width/height 
                         x2: Math.ceil((this.scrollingcontainer.scrollLeft + this.scrollingcontainer.clientWidth - 1) / consts.CELLMINWIDTH),
                         y1: Math.floor(this.scrollingcontainer.scrollTop / consts.CELLMINHEIGHT),
                         y2: Math.ceil((this.scrollingcontainer.scrollTop + this.scrollingcontainer.clientHeight - 1) / consts.CELLMINHEIGHT)
                       };
      this.DisplayGridContainer();
      return;
     }

  // Step 4 - any intersection does exist, so check boundary item area values for every expand side - for a exmaple: bottom expand side with item area y2 value equals table height or more - side expand makes no sense and will be deleted from expand array
  if (expandsides & LEFTSIDE && this.itemArea.x1 === 0) expandsides -= LEFTSIDE;
  if (expandsides & RIGHTSIDE && this.itemArea.x2 === this.layout.valuetableWidth - 1) expandsides -= RIGHTSIDE;
  if (expandsides & TOPSIDE && this.itemArea.y1 === 0) expandsides -= TOPSIDE;
  if (expandsides & BOTTOMSIDE && this.itemArea.y2 === this.layout.valuetableHeight - 1) expandsides -= BOTTOMSIDE;
  if (!expandsides) return; // No sides to expand for grid area to visible area? Just return with doing nothing (redraw is not needed)

  // Step 5 - Sides to expand do exist, so process them one by one for grid area to expand to visible area
  if (expandsides & LEFTSIDE) for (let i = this.itemArea.x2; i >= this.itemArea.x1; i--)
     {
      const item = this.GetGridCoordinatesElement(i, this.itemArea.y1);
      if (!item || item.offsetLeft > visiblearea.x2) continue;
      this.itemArea.x1 -= Math.ceil((gridcontainerarea.x1 - visiblearea.x1) / consts.CELLMINWIDTH); // Prefer max possible items to expand, so use CELLMINWIDTH/CELLMINHEIGHT instead of actual item widths/heights like in old version: this.itemArea.x1 -= this.GetItemNumber(this.columnWidths, i, 0, gridcontainerarea.x1 - visiblearea.x1);
      this.itemArea.x2 = i;
      break;
     } 
  if (expandsides & RIGHTSIDE) for (let i = this.itemArea.x1; i <= this.itemArea.x2; i++)
     {
      const item = this.GetGridCoordinatesElement(i, this.itemArea.y1);
      if (!item || item.offsetLeft + item.offsetWidth < visiblearea.x1) continue;
      this.itemArea.x1 = i;
      this.itemArea.x2 += Math.ceil((visiblearea.x2 - gridcontainerarea.x2) / consts.CELLMINWIDTH); // Old version: this.GetItemNumber(this.columnWidths, i, this.layout.valuetableWidth - 1, visiblearea.x2 - gridcontainerarea.x2);
      break;
     }
  if (expandsides & TOPSIDE) for (let i = this.itemArea.y2; i >= this.itemArea.y1; i--)
     {
      const item = this.GetGridCoordinatesElement(this.itemArea.x1, i);
      if (!item || item.offsetTop > visiblearea.y2) continue;
      this.itemArea.y1 -= Math.ceil((gridcontainerarea.y1 - visiblearea.y1) / consts.CELLMINHEIGHT); // Old version: this.GetItemNumber(this.columnHeights, i, 0, gridcontainerarea.y1 - visiblearea.y1);
      this.itemArea.y2 = i;
      break;
     } 
  if (expandsides & BOTTOMSIDE) for (let i = this.itemArea.y1; i <= this.itemArea.y2; i++)
     {
      const item = this.GetGridCoordinatesElement(this.itemArea.x1, i);
      if (!item || item.offsetTop + item.offsetHeight < visiblearea.y1) continue;
      this.itemArea.y1 = i;
      this.itemArea.y2 += Math.ceil((visiblearea.y2 - gridcontainerarea.y2) / consts.CELLMINHEIGHT); // Old version: this.GetItemNumber(this.columnHeights, i, this.layout.valuetableHeight - 1, visiblearea.y2 - gridcontainerarea.y2);
      break;
     }

  // Step 6 - calculate grid area all margins from scrolling area and call DisplayGridContainer function to finish
  this.DisplayGridContainer();
 }

 GetElementAreaRect(element, excludescrollarea)
 {
  if (element) return { x1: element.offsetLeft + (excludescrollarea ? element.scrollLeft : 0),
                        y1: element.offsetTop + (excludescrollarea ? element.scrollTop : 0),
                        x2: element.offsetLeft - 1 + (excludescrollarea ? element.scrollLeft + element.clientWidth : element.offsetWidth),
                        y2: element.offsetTop - 1 + (excludescrollarea ? element.scrollTop + element.clientHeight : element.offsetHeight)
                      };
 }

 DisplayGridContainer()
 {
  let item;
  this.CutItemCoordinates(this.itemArea);
  const mtop = this.GetPixelSum(this.rowHeights, 0, this.itemArea.y1 - 1);
  const mright = this.GetPixelSum(this.columnWidths, this.itemArea.x2 + 1, this.layout.valuetableWidth - 1);
  const mbottom = this.GetPixelSum(this.rowHeights, this.itemArea.y2 + 1, this.layout.valuetableHeight - 1);
  const mleft = this.GetPixelSum(this.columnWidths, 0, this.itemArea.x1 - 1);
  this.mtop = mtop;
  this.mbottom = mbottom;

  let inner = this.ForEachCell([this.itemArea], true, '', (area, x, y, accumulator) => { const id = `x${x}y${y}`;
                                                                                         const cell = this.valuetable[y]?.[x];
                                                                                         const addclass = (this.cursor?.x === x && this.cursor?.y === y) ? `${cell?.interactive ? ' interactivecursorcell' : ' noninteractivecursorcell'}` : `${this.ItemInAreas(this.cursor?.areas, x, y) ? ' selectedcell' : ''}`;
                                                                                         if (!cell) return accumulator + `<div class="undefinedcell defaultcell${addclass}" id="${id}"></div>`;
                                                                                         const title = cell.hint ? ` title="${cell.hint}"` : ``;
                                                                                         const style = cell.style ? ` style="${cell.style}"` : ``;
                                                                                         return accumulator + `<div class="${cell.class} defaultcell${addclass}" id="${id}"${style}${title}>${funcs.EscapeString(cell.value, true)}</div>`;
                                                                                       });
  const style = `grid-template-columns: repeat(${this.itemArea.x2 - this.itemArea.x1 + 1}, min-content); grid-template-rows: repeat(${this.itemArea.y2 - this.itemArea.y1 + 1}, min-content); margin: ${mtop}px ${mright}px ${mbottom}px ${mleft}px;`;
  this.scrollingcontainer.innerHTML = `<div class="gridcontainer" style="${style}">${inner}</div>`;
  this.gridcontainer = this.scrollingcontainer.querySelector('.gridcontainer');
  this.props.control.mouseareaselect.elements = [[this.gridcontainer]];
  
  if (this.cursor.alignment)
     { 
      this.cursor.noscrollredraw = true;
      item = this.GetGridCoordinatesElement(this.cursor.alignment.x, this.cursor.alignment.y);
      if (this.cursor.alignment.sides & RIGHTSIDE) this.scrollingcontainer.scrollLeft = item.offsetLeft + item.offsetWidth - (this.cursor.alignment.visiblearea.x2 - this.cursor.alignment.visiblearea.x1 + 1) - this.scrollingcontainer.offsetLeft + Math.floor(consts.CELLMINWIDTH / 2);
       else if (this.cursor.alignment.sides & LEFTSIDE) this.scrollingcontainer.scrollLeft = item.offsetLeft - this.scrollingcontainer.offsetLeft - Math.floor(consts.CELLMINWIDTH / 2);
      if (this.cursor.alignment.sides & BOTTOMSIDE) this.scrollingcontainer.scrollTop = item.offsetTop + item.offsetHeight - (this.cursor.alignment.visiblearea.y2 - this.cursor.alignment.visiblearea.y1 + 1) - this.scrollingcontainer.offsetTop + Math.floor(consts.CELLMINHEIGHT / 2);
       else if (this.cursor.alignment.sides & TOPSIDE) this.scrollingcontainer.scrollTop = item.offsetTop - this.scrollingcontainer.offsetTop - Math.floor(consts.CELLMINHEIGHT / 2);
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
  if (this.contentEditableCell) requestIdleCallback(() => this.MakeCellContentEditable(this.contentEditableCell, false, true));
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
  let [x, y] = control.child.GetElementGridCoordinates(userevent.target); // Get event target grid x/y coordinates
  const cell = control.child.valuetable?.[y]?.[x];
  let confirmevent;

  if (phase === 'capture')
     {
      if (control.child.contentEditableCell && (confirmevent = control.child.ConfirmCellEditableContent(userevent, cell))) control.child.EventManager(confirmevent);
      if (x !== undefined)
         {
          control.child.cursor.mousex = userevent.clientX;
          control.child.cursor.mousey = userevent.clientY;
          control.child.MoveCursor({ x: x - control.child.cursor.x, y: y - control.child.cursor.y }, null, !userevent.ctrlKey); // Selection phase 'capture' with no any editable cell - grid mouse 1st click - just set cursor to x,y position
         }
     }
  if (phase === 'process')
     {
      let sides = 0;
      if (Math.abs(userevent.clientX - control.child.cursor.mousex) > 5)
         {
          sides += userevent.clientX - control.child.cursor.mousex > 0 ? RIGHTSIDE : LEFTSIDE;
          control.child.cursor.mousex = userevent.clientX;
         } 
      if (Math.abs(userevent.clientY - control.child.cursor.mousey) > 5)
         {
          sides += userevent.clientX - control.child.cursor.mousey > 0 ? BOTTOMSIDE : TOPSIDE;
          control.child.cursor.mousey = userevent.clientY;
         }
      if (x !== undefined && !control.child.contentEditableCell) control.child.MoveCursor({ x: x - control.child.cursor.areas.at(-1).x2, y: y - control.child.cursor.areas.at(-1).y2 }, true, false, sides); // Selection phase 'process' with no any editable cell - grid mouse move - modify selection area to x,y position
     }
 }

 GetElementGridCoordinates(element)
 {
  while (element && !element.id && element !== this.elementDOM) element = element.parentNode;
  if (!element?.id) return [];
  const pos = element.id.indexOf('y');
  return [ element.id.substring(1, pos), element.id.substring(pos + 1), element ];
 }

 GetGridCoordinatesElement(x, y)
 {
  return this.gridcontainer.querySelector(`#x${x}y${y}`);
 }

 // Function highlight/dehighlight all targets (html elements in <this.clipboardcell> array) via adding/removing 'clipboardcell' class
 HighlightClipboardAreas(highlight)
 {
  for (const target of this.clipboardcell) if (target) target.classList[highlight ? 'add' : 'remove']('clipboardcell');
  if (!highlight) this.clipboardcell = [];
 }

 HighlightTableCells(cursor, highlight)
 {
  if (!cursor) return;
  this.ForEachCell(cursor.areas, true, null, (area, x, y, accumulator, cursor, highlight) => { const target = this.GetGridCoordinatesElement(x, y);
                                                                                               if (!target) return;
                                                                                               if (cursor.x !== x || cursor.y !== y) return target.classList[highlight ? 'add' : 'remove']('selectedcell'); // Current cell x,y doesn't equal cursor x,y
                                                                                               target.classList.remove('selectedcell'); // Current cell x,y equals cursor x,y
                                                                                               highlight ? target.classList.add(this.valuetable[y]?.[x]?.interactive ? 'interactivecursorcell' : 'noninteractivecursorcell') : target.classList.remove('noninteractivecursorcell', 'interactivecursorcell');
                                                                                             }, cursor, highlight);
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
             if (typeof prop === 'string' && (prop.includes('x') || prop.includes('y'))) obj[prop] = Math.min(Math.max(0, obj[prop]), prop.includes('x') ? this.layout.valuetableWidth - 1 : this.layout.valuetableHeight - 1);
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
 MoveCursor(offset, selection, resetareas, forcealignmentsides)
 {
  if (!this.cursor || !offset) return; // No any action for undefined cursor/offset (undefined cursor occurs on error messaged view or empty table)
  const newcursor = JSON.parse(JSON.stringify(this.cursor));
  let alignment = { sides: 0 };
  if (selection) // In case of selection area modify - move current area x2,y2 coordinates to specified offset. Arg <resetarea> has no sense - last area is modified anyway
     {
      newcursor.areas.at(-1).x2 += offset.x || 0;
      newcursor.areas.at(-1).y2 += offset.y || 0;
      this.CutItemCoordinates(newcursor.areas.at(-1));
      if (!forcealignmentsides && newcursor.areas.at(-1).x2 === this.cursor.areas.at(-1).x2 && newcursor.areas.at(-1).y2 === this.cursor.areas.at(-1).y2) return; // Return for cursor coordiantes no changes and no cursor cell alignment needed
     }
   else // Set cursor new position for no selection area action. For true <resetareas> flush all previous areas and create a new cursor cell area, for false - add cursor cell area
     {
      newcursor.x += offset.x || 0;
      newcursor.y += offset.y || 0;
      const area = { x1: newcursor.x, y1: newcursor.y, x2: newcursor.x, y2: newcursor.y };
      resetareas ? newcursor.areas = [area] : newcursor.areas.push(area);
      this.CutItemCoordinates(newcursor, newcursor.areas.at(-1));

      const cell = this.valuetable?.[newcursor.y]?.[newcursor.x];
      if (+cell?.oid === consts.NEWVIRTUALROWID && cell.interactive) this.MakeCellContentEditable(cell);

      if (newcursor.x === this.cursor.x && newcursor.y === this.cursor.y && newcursor.areas.length === this.cursor.areas.length)
      if (newcursor.areas.at(-1).x1 === this.cursor.areas.at(-1).x1 && newcursor.areas.at(-1).y1 === this.cursor.areas.at(-1).y1)
      if (newcursor.areas.at(-1).x2 === this.cursor.areas.at(-1).x2 && newcursor.areas.at(-1).y2 === this.cursor.areas.at(-1).y2) return; // Return for no changes
     }
  this.RemoveAreasOverlap(newcursor);

  // Calculate cursor position on grid container - out of grid, partly intersection, within grid
  // For retreived cell DOM element adjust scrolling container scrollLeft/Top to fit the cell to visible area adding the gap <CELLSETPOSITIONGAP>
  [ alignment.x, alignment.y ] = selection ? [newcursor.areas.at(-1).x2, newcursor.areas.at(-1).y2] : [newcursor.x, newcursor.y];
  alignment.sides = forcealignmentsides;
  let cell = this.GetGridCoordinatesElement(alignment.x, alignment.y);
  const visiblearea = this.GetElementAreaRect(this.scrollingcontainer, true);
  const cellarea = this.GetElementAreaRect(cell);
  alignment.sides = this.GetArea1SidesToExpandArea2(visiblearea, cellarea);
  if (forcealignmentsides !== undefined && alignment.sides) alignment.sides = forcealignmentsides; // In case of alignment is forced (var <forcealignmentsides> is not undefined and shows dragged mouse cursor pos is changed on discrete value) and current cell (alignment.x, alignment.y) is out of visible area - set alignment side due to mouse cursor moving direction 

  // Process visible area to cell area sides to expand. No sides to expand (cell is in visible area) - just renew cursor without grid scroll
  if (alignment.sides === 0)
     {
      this.HighlightTableCells(this.cursor); // Dehighlight old cursor and its areas and highlight new cursor with its areas not forgetiing to remove prefinal area overlay to other selected areas before
      this.cursor = newcursor; // Assign current cursor to new one
      this.HighlightTableCells(this.cursor, true);
      return;
     }

  // Align the side based on item with alignment.x, alignment.y coordinates with visible area intersection, but not based on offset direction. If alignment is one axis - another axis item area range should be untouched!
  // Process visible area to cellfit area sides to expand. Undefined alignment.sides - cell out of visible area, so handly define alignment sides
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

// Todo0 - Should the view be closed after its OD have been removed? No, but status 'removed' is displayed
// Todo2 - Text area color customization, example - query text - SELECT statement is blue color highlighted. Textarea doesn't allow to cusomize apparently one text and another, div with contenteditable=true should be used
// Todo0 - Emulate user client events binded on context menu. Events are defined in OV proflie settings
// Todo0 - Limit json.row and json.value expressions evaluated as a js code via JS future specification named SHADOW REALMS. Don't call eval function in case of constants x,y values also, check it on million cycles
// Todo0 - whole table selection (Ctrl a), per object selection (what key combination?), enter[+shift] moves cursor down[up] (in case of selection moves among selected cells), home/end [with ctrl/alt] moves cusor to start/end of a line [table/page] and shift selects cursor track. Ctrl with up[down] jumps to next[previous] object
// Todo0 - in context menu description: OV opened and OV refreshed seconds ago, quantity of valid/incorrect/total layout jsons, out of range cells number, max cells, current cell number, OD/OV description, table width/height, total objects, selected objects, current x,y, areas count, timing OV load, see old php version also
// Todo0 - in context menu help: application version, tel number and other contacts (something like 'please contact us support@tabels.app'), add in system description something like 'it has a 'game' style interface colors but offers a powerful functionality. Also helpdesk/jira/CRM example in Help context menu
// Todo0 - regexp search should be implemented to all types of view including tree and map. Should js range be used instead of span highlighting in regexp search? Not only regexp search but search on mask with only one asterisk as a special char or just plain text
// Todo0 - Emodzi symbols as an element text causes db sql error. Should it be fixed?
// Todo0 - Setka via css https://dbmast.ru/fon-v-vide-diagonalnoj-setki-na-css
//         View area specific style with background, border radius and so on
// Todo1 - keep input view parameters in a view history navigating, so open last viewed OV with input parameters used before. Access history of opened views via context menu or hot keys?
// Todo2 - scale OV content (table/tree/map) via child management icon +-
// Todo0 - OV icon in a sidebar depend on template, so displaay table/tree/map little icons inside rounded square icon
// Todo0 - Tree selection: SELECT <layout elements> FROM <actual data> WHERE <clause1 /n clause2>, other exoressions are unavailable. Clause2 points to the second point of the tree. No second point (clause2) - until the end of the tree. Point to point tree may be multipath.
// Todo0 - Tree element layout style:
//		         for example to see what nodes are down by seeing them via red background
//  	         Tree wire name (arrow name) to mark fiber cooper radio..
//		         Node color or wire type should depend on some current object element values to mark nodes and its links status (node down, line down, etc..)
// Todo0 - Tree view: every object has its content defined via table element layout, so you can output any object elements (including images) in a tree node, but be aware and place only nessesary data due to possible page overload. Also all tree nodes have its uplinked/downlinked elmenents displayed with specified wire between
// Todo0 - Tree view: context menu: expand/hide uplink and downlink subtrees, description for tree view (object number, object selection parameteres..)
// Todo0 - Tree view: loop element - show real looped object instead of read message
// Todo1 - Tree view: nested level input (nodes depth) to display may be defined. For example, nested level 2 diaplys main switch with its direct downlink nodes and no more deeper levels of nodes
// Todo0 - table cells selection should fade cell background color, not just shadow it. Also selected area rectangle should be highlighted via bold line
// Todo0 - Export OV data to xls(via csv), export to txt file should be via copy-paste
// Todo0 - Context menu Graph - table selection of this strings and values (dlink space, snr space, eltex space..) displays pie chart with dlink - 100%, and 0% for other values, is it right?
// Todo0 - Paste file or image to object element - PASTE user event; drag and drop file to the corresponded cell - DRAGANDDROP user event or PASTE to specific object element
//             One or multiple cell selecting - buffer copy as text or/and as image (like excel cells are copied into whatsup)
// Todo0 - Fetch progress indicator for uploading files https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload
// Todo0 - EDIT controller cmd limits text lines number to edit https://toster.ru/q/355711. Apply white list (allowed chars) and black list (disallowed chars). And autocomplete feature of predefined values (for a example company clients)
// Todo2 - Sort by header click for look like default element layout when header line at the top, bottom, left, right
// Todo1 - Always develop table functional to some needful excel functions!
