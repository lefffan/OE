// Todo1 - Some boxes may gravitate/stick to another one, example OV boxes may stick to sidebar box or to parent box edges
// Todo1 - Captured box is moving to out of range at the top/left parent child area. At releasing captured box - it should be at visible top/left area of parent with parent box changed to appropriate size
// Todo0 - Add minimize 'cm' icon (in minimize mode 'maximize' and 'close' cm-buttons are available) and scale 'cm' icon. Finish child controls (icons pos, dialog interaction)
// Todo0 - vertical and horizontal scrollbar intersection is white background, fix it. Set cursor at scrollbar priority to the child control. Set cursor child control priority to default child hanlder and div elements hover
// Todo2 - Dragging child with right btn hold moves neighbor childs
// Todo1 - Control hint at cursor navigating ('close', 'fullscreen'..)
// Todo2 - requestIdleCallback for idle tasks
// Todo0 - While resizing all animation is being applied and slowing GUI?
// Todo2 - Change box minimize icon from low line to upper line
// Todo2 - Check opera bug mouseup event at right mouse btn release while dragging while mouse guesters enabled in opera settings

import { SVGUrlHeader, SVGRect, SVGPath, SVGUrlFooter, lg, EFFECTS, NODOWNLINKNONSTICKYCHILDS } from './constant.js';
import { app } from './application.js';

const DOMELEMENTMINWIDTH			= 50;
const DOMELEMENTMINHEIGHT			= 50;
const DOMELEMENTCASCADEPOSITIONS	= [['7%', '7%'], ['14%', '14%'], ['21%', '21%'], ['28%', '28%'], ['35%', '35%'], ['42%', '42%'], ['49%', '49%'], ['56%', '56%'], ['63%', '63%'], ['70%', '70%']];
const ICONURLMINIMIZESCREEN 		= SVGUrlHeader() + SVGPath('M1 10L9 10', 'RGB(139,188,122)', '2') + ' ' + SVGUrlFooter();
const ICONURLFULLSCREENTURNON 		= SVGUrlHeader() + SVGRect(1, 1, 10, 10, 2, 105, 'RGB(139,188,122)', 'none', '1') + ' ' + SVGUrlFooter();
const ICONURLFULLSCREENTURNOFF		= SVGUrlHeader() + SVGRect(1, 1, 8, 8, 2, 105, 'RGB(139,188,122)', 'none', '1') + ' ' + SVGRect(3, 3, 9, 9, 1, '0 15 65', 'RGB(139,188,122)', 'none', '1') + ' ' + SVGUrlFooter();
const ICONURLCLOSE              	= SVGUrlHeader() + SVGPath('M3 3L9 9M9 3L3 9', 'RGB(227,125,87)', '3') + ' ' + SVGUrlFooter();
const ACTIVECHILDSHADOW				= '4px 4px 5px #111';
const REFRESHMININTERVAL			= 50;
const ELEMENTPUSHOFFSET				= 3;

// Function processes child response event. Nested event prop (event.event) is passed to the parent child handler
function ProcessChildEvent(child, event)
{
 if (!child || !event) return;															// Return for undefined child
 if (event.event && child.parentchild.Handler) child.parentchild.Handler(event.event);	// Pass nested event to the parent child handler

 switch (event.type)																	// Process event
		{
	 	 case 'KILLME':																	// Destroy child event
	      	  if (child !== app) child.parentchild.KillChild(child.id);					// Call parent child kill function with current child id. For non application childs only
	      	  break;
	 	 case 'BRINGTOTOP':																// Bring to top all childs bundle from current nested one until the root one (app)
			  child.ChangeActive(0);													// Set current child active among its childs
	      	  while (child.parentchild)													// Cycle until parent exists
		    	    {
		     		 child.parentchild.ChangeActive(child.id);							// Set current child active in parent child container
		     		 child = child.parentchild;											// and go to parent one
		    	    }
	      	  break;
		}
 return event;
}

// Function calculates pixels number the element is scrolled from the left
function ElementScrollX(element)
{
 return element === document.body ? element.scrollLeft || document.documentElement.scrollLeft || window.scrollX : element.scrollLeft;
}

// Function calculates pixels number the element is scrolled from the top
function ElementScrollY(element)
{
 return element === document.body ? element.scrollTop || document.documentElement.scrollTop || window.scrollY : element.scrollTop;
}

// Function returns 1st registered (with 'data-child' attr set) child DOM element
function GetFirstRegisteredDOMElement(element)
{
 while (element && element.attributes && element.attributes['data-child'] === undefined) element = element.parentNode;
 return element;
}

// Function searches for the child of the specified DOM element
function GetDOMElementChild(element)
{
 let child;
 const attr = element?.attributes?.['data-child']?.value;			// Get element attribute 'data-child'
 
 if (typeof attr === 'string') for (const id of attr.split('_'))	// Split element 'data-child' attribute to the array of child ids separated by '_'
    {
     child = id ? child.childs[id] : app;							// Get a child link from id splited chain
     if (!child) break;												// Break for undefined child
    }
 return child;														// For unregistered child with no 'data-child' attribute undefined child is returned
}

// Function checks specified element focus conflict with modal child element
function GetCapturedFocusModalChild(element, blink)
{
 if (typeof element?.attributes?.['data-child']?.value !== 'string') return;									// For registered elements (childs) only
 let layer;
 const ids = element.attributes['data-child'].value.split('_');													// Split attr to get the whole child chain from app child (root child) to the child specified by element

 for (let id = 0; id < ids.length; id ++)																		// Cycle downstream child chain from root (app) to the 'element' child to search MODAL child focus mismatch
     {
      layer = id ? layer.childs[+ids[id]] : app; 																// Define layer for current ids[id], use app (root layer) for zero id or current layer child (based on ids[id]) otherwise
      if (!layer || !layer.zindexes.at(-1)) break;																// Break for undefined layer or parent child click (layer.zindexes.at(-1) === 0)
      if (!layer.childs[layer.zindexes.at(-1)].IsModal() || layer.zindexes.at(-1) === +ids[id + 1])	continue;	// The upper child is not modal or its id does match current layer child from the chain
	  if (blink) layer.childs[layer.zindexes.at(-1)].ToggleActiveStatus();										// Focus is restricted otherwise. Blink corresponded modal child for truthy blink
	  return layer.childs[layer.zindexes.at(-1)];
     }
}

// Function removes all non-sticky childs (except current one in the bundle, because of its mouse/keyboard interaction that shouldn't result removal) in the current layer
function RemoveAllNonStickyChilds(child, callparent = true, excludeid)
{
 for (const id of child.zindexes)																				// Iterate all child indexes
	 if (id && id !== excludeid)																				// except zero id (the child of itself) and excluded one that interacts with the user
	 if (child.childs[id].IsNonsticky())																		// Remove non sticky child
	    {
		 child.KillChild(id);
	    }
	  else
	    {
		 if (child.props.flags & NODOWNLINKNONSTICKYCHILDS) RemoveAllNonStickyChilds(child.childs[id], false);	// Otherwise perform recursive call for all childs of current child
	    }
 if (callparent && child.parentchild) RemoveAllNonStickyChilds(child.parentchild, true, child.id);				// Recursively call parent child non sticky removal
}

// Function detects if mouse cursor is in child control area (x1, y1, x2, y2)
function ControlAreaMatchMouseCursor(control, userevent, phase, childclientrect)
{
 if (!control.area || !childclientrect) return;																			// Return undefined for undefined control area or non mouse events (undefined childrect)
 const absolutearea = { x1: childclientrect.x + control.area.x1 + (control.area.x1 < 0 ? childclientrect.width : 0),	// Area negative coordinates indicate right/bottom edge margins
						y1: childclientrect.y + control.area.y1 + (control.area.y1 < 0 ? childclientrect.height : 0),
						x2: childclientrect.x + control.area.x2 + (control.area.x2 < 0 ? childclientrect.width : 0),
						y2: childclientrect.y + control.area.y2 + (control.area.y2 < 0 ? childclientrect.height : 0),
  					  };
 if (absolutearea.x1 > absolutearea.x2) [absolutearea.x1, absolutearea.x2] = [absolutearea.x2, absolutearea.x1];		// Swap x1 and x2 if x2 lower than x1
 if (absolutearea.y1 > absolutearea.y2) [absolutearea.y1, absolutearea.y2] = [absolutearea.y2, absolutearea.y1];
 return userevent.clientX >= absolutearea.x1 && userevent.clientX <= absolutearea.x2 && userevent.clientY >= absolutearea.y1 && userevent.clientY <= absolutearea.y2 ? true : false;	// Return mouse cursor coordiantes inside specified area expression result
}

// Function checks control event matches user keyboard/maoiuse event
function ControlEventMatchUserEvent(control, userevent, phase)
{
 if (control[phase + 'event'] === undefined) return;																																	// Return undefined for absent phase event
 for (const event of control[phase + 'event'].split('|'))																																// Split all events to match user event.type
	 if (event && ((event[0] !== '!' && event === userevent.type) || (event[0] === '!' && event !== userevent.type)))																	// Positive event value matches user event.type or negative event doesn't match?
 	    return ((control.button === undefined || (['keydown', 'keyup'].indexOf(userevent.type) === -1 ? control.button === userevent.button : control.button === userevent.code)) &&	// Then mouse event button and keyboard event code match (if exist)
 	    		(control.buttons === undefined || (['keydown', 'keyup'].indexOf(userevent.type) === -1 && control.buttons === userevent.buttons)) &&									// and mouse event buttons match (if exist)
 		 	    (control.modifier === undefined || control.modifier === userevent.ctrlKey * 8 + userevent.altKey * 4 + userevent.shiftKey * 2 + userevent.metaKey * 1));				// and modifier keys at the end (if exist). Return true for all successfull matches
 return false;																																											// Return false for no any event match
}

// Function checks control DOM elements match event.target
function ControlElementsMatchEventTarget(control, userevent, phase)
{
 if (!Array.isArray(control.elements)) return;							// Return undefined for non array control elements. So all control matches return 3 values: true/false (match/no-match) and undefined (match is not needed)
 for (const element of control.elements)								// Iterate all DOM elements from control.elements
  if (Array.isArray(element))											// All array elements might be DOM elements directly or nested array of them. Second scenario is to keep zero element to apply some options to regardless of all other (next) ones
	 {
	  for (const e of element) if (e === userevent.target) return true; // Iterate nested array and return the match is successfull
	 }
   else
	 {
	  if (element === userevent.target) return true;					// Check single element for match otherwise
	 }
 return false;															// Return falsy match
}

// Function calls every function in control.callback array to handle init/capture/process/release control phases.
function CallControlHandler(control, userevent, phase)
{
 let successcounter = 0;
 for (const callback of control.callback)
	 if (typeof callback === 'function') phase === 'init' ? setTimeout(callback, 0, userevent, control, phase) : successcounter += Boolean(ProcessChildEvent(control.child, callback(userevent, control, phase)));
 return successcounter;
}

// Function changes mouse cursor depending control area hover and then DOM elements match
function ChangeMouseCursor(control, userevent, childclientrect)
{
 if (['keydown', 'keyup'].indexOf(userevent.type) !== -1 || typeof control.cursor !== 'string') return;
 const areamatch  = ControlAreaMatchMouseCursor(control, userevent, '', childclientrect);
 if (areamatch === false) return;
 if (areamatch === true || ControlElementsMatchEventTarget(control, userevent) === true) return document.body.style.cursor = control.cursor;
 document.body.style.cursor = 'auto';
}

// Check all controls mouse cursor hover match and modify cursor
function SetMouseCursorContolsHover(child, event, childclientrect)
{
 let isChanged;
 for (const prop in child.props.control)																									// Iterate all controls of a child to set cursor hover match
	 if (!child.props.control[prop].disabled && (isChanged = ChangeMouseCursor(child.props.control[prop], event, childclientrect))) break;	// Modify cursor for enabled controls
 if (!isChanged) document.body.style.cursor = 'auto';																						// Set default cursor for no any cursor changed
}

export class Interface
{
 destructor()
 {
  for (const i in this.timer) clearTimeout(this.timer[i]);
 }

 RefreshControlIcons()
 {
  let disp, elements = new Map();
  for (const name in this.props.control)														// Iterate all child controls to adjust overlapped areas
	  {
	   const control = this.props.control[name];
	   if (typeof control.area !== 'object' || typeof control.icon !== 'string') continue;		// For controls with icons only
	   let element = this.elementDOM;															// Current element is child main DOM element
	   if (Array.isArray(control.elements)) if (!(element = control.elements[0])) continue;		// or first DOM element in <element> control property
	   if (!elements.has(element)) elements.set(element, {iconimage: '', iconposition: ''});	// Add map element with DOM element as a key
	   const area = elements.get(element).area;													// Get previous control area if exist

 	   if (area && !(control.area.x2 < area.x1 || control.area.x1 > area.x2 || control.area.y2 < area.y1 || control.area.y1 > area.y2))						// Previous control area does exist and overlaps with current one
		  switch (this.props.controlicondirection)																											// Move area coordinates to <controlicondirection> side on calculated offset value (disp)
				 {
				  case 'right':  disp = area.x2 - control.area.x1; /**/ control.area.x1 += disp + this.props.controliconmargin; control.area.x2 += disp + this.props.controliconmargin; break;
				  case 'left':   disp = area.x1 - control.area.x2; /**/ control.area.x1 += disp - this.props.controliconmargin; control.area.x2 += disp - this.props.controliconmargin; break;
				  case 'bottom': disp = area.y2 - control.area.y1; /**/ control.area.y1 += disp + this.props.controliconmargin; control.area.y2 += disp + this.props.controliconmargin; break;
				  case 'top':    disp = area.y1 - control.area.y2; /**/ control.area.y1 += disp - this.props.controliconmargin; control.area.y2 += disp - this.props.controliconmargin; break;
				 }

	   elements.get(element).iconposition += `${control.area.x1 < 0 ? 'right ' + Math.abs(control.area.x2 + 1) : 'left ' + Math.abs(control.area.x1)}px `;	// Define horizontal icon position
	   elements.get(element).iconposition += `${control.area.y1 < 0 ? 'bottom ' + Math.abs(control.area.y2 + 1) : 'top ' + Math.abs(control.area.y1)}px, `;	// Define vertical icon position
	   elements.get(element).iconimage += `${control.icon}, `;																								// and its image url
	   elements.get(element).area = area ? { x1: Math.min(area.x1, control.area.x1), y1: Math.min(area.y1, control.area.y1), x2: Math.max(area.x2, control.area.x2), y2: Math.max(area.y2, control.area.y2) } : control.area; // Fix current control area to use it in next area overlap case
	  }
  for (const e of elements.keys())																// Define style props for every DOM element in <elements> map collection
	  {
	   e.style.backgroundPosition = elements.get(e).iconposition.substring(0, elements.get(e).iconposition.length - 2);
	   e.style.backgroundImage = elements.get(e).iconimage.substring(0, elements.get(e).iconimage.length - 2);
	   e.style.backgroundRepeat = 'no-repeat';
      }
 }

 AdjustInterfaceControls()
 {
  for (const name in this.props.control)												// Iterate all child controls to check its type first
	  if (!this.props.control[name] || typeof this.props.control !== 'object')
		 delete this.props.control[name];												// Incorrect control? Delete it

  for (const name in this.props.control)												// Iterate all child controls to adjust their props
  	  {
	   const control = this.props.control[name];																										// Fix child control
	   if (!Array.isArray(control.callback)) control.callback = [];																						// Empty callback array for non-array

	   if (name in CHILDCONTROLTEMPLATES) for (const prop in CHILDCONTROLTEMPLATES[name])																// Contol name is predefined control template? Iterate template control props
		  {
		   if (prop === 'callback' && (control.callback = control.callback.concat(CHILDCONTROLTEMPLATES[name][prop]))) continue;						// Add template control functions
		   if (prop in control) continue;
		   control[prop] = typeof CHILDCONTROLTEMPLATES[name][prop] === 'object' ? JSON.parse(JSON.stringify(CHILDCONTROLTEMPLATES[name][prop])) : CHILDCONTROLTEMPLATES[name][prop];	// and copy template control property if current control one doesn't exist
		  }
	   if (name === 'default') control.callback.push(this.Handler.bind(this));																			// Add specific child handler for 'default' template control

	   control.child = this;																															// Set control child
	   control.name = name;																																// and control name for diag
	   if ('initevent' in control) CallControlHandler(control, control['initevent'], 'init');															// and perform control <callback> function call for 'initevent'
	  }
 }

 constructor(...args) // (data, parentchild, props, attributes)
	    {
	     // Data
	     this.data = args[0];

	     // Parent child
	     this.parentchild = args[1];

	     // Props {tagName: 'DIV|BODY', overlay: 'ALWAYSONTOP|MODAL|NONSTICKY', effect: '', position: 'CASCADE|CENTER|RANDOM', control:{}, controlicondirection: 'left|right|top|bottom', controliconmargin: 1}
	     this.props = (args[2] && typeof args[2] === 'object') ? args[2] : {};
	     if (!this.props.tagName) this.props.tagName = 'DIV';
		 if (!this.props.control) this.props.control = {};
		 if (['right', 'bottom', 'top'].indexOf(this.props.controlicondirection) === -1) this.props.controlicondirection = 'left';	// Set icon offset direction in case of overlapped areas
		 if (this.props.controliconmargin !== 'number') this.props.controliconmargin = 4;											// and icon margin

	     // DOM element attributes
		 this.elementDOM = this.parentchild ? document.createElement(this.props.tagName) : document.body;	// Set DOM element to document.body in case of no parent child defined
	     this.attributes = (args[3] && typeof args[3] === 'object') ? args[3] : {};
	     this.attributes['data-child'] = '';																// Set default data child attribute, for non-root child (with no parent) this attribute will be changed after insertion
	     for (const name in this.attributes) this.elementDOM.setAttribute(name, this.attributes[name]);
		 this.AdjustInterfaceControls();
		 this.RefreshControlIcons();

	     // Other child settings
	     this.childs = {0: this};																			// list of child objects sorted by id
	     this.zindexes = [0];																				// list of child ids sorted by z-index
	     this.activeid = 0;																					// Active child id - 0 is current object used as a parent for its child, 1 - first child and etc..
	     this.maxchildid = 0;																				// Child max id ever been inserted

	     // Stop constructor for root child (app) that has no parent. Root element is always document.body
		 lg('Next child is inserted:', this);
	     if (!this.parentchild) return;

	     // Set scc filter for all childs with overlay 'MODAL' mode
	     if (this.props.overlay === 'MODAL') for (const id in this.parentchild.childs) if (+id) this.parentchild.childs[id].elementDOM.classList.add('modalfilter');

	     // Child display
	     this.parentchild.elementDOM.appendChild(this.elementDOM);
	     this.elementDOM.addEventListener('transitionend', () => this.TransitionEnd());
	     this.Show();

	     // Insert this child to parent child list
	     this.parentchild.maxchildid++;
	     this.id = this.parentchild.maxchildid;
	     this.ChangeZIndex(0, this.parentchild.zindexes.length);
	     this.elementDOM.setAttribute('data-child', this.attributes['data-child'] = this.parentchild.attributes['data-child'] + '_' + this.id);
	     this.parentchild.childs[this.id] = this;
	     this.parentchild.zindexes.push(this.id);
		 this.parentchild.ChangeActive(this.id);

		 // Position the child
		 switch (this.props.position)
				{
				 case 'CASCADE':
					  [this.elementDOM.style.left, this.elementDOM.style.top] = [DOMELEMENTCASCADEPOSITIONS[(this.parentchild.zindexes.length - 1) % DOMELEMENTCASCADEPOSITIONS.length][0],
																			     DOMELEMENTCASCADEPOSITIONS[(this.parentchild.zindexes.length - 1) % DOMELEMENTCASCADEPOSITIONS.length][1]];
					  break;
				 case 'RANDOM':
					  [this.elementDOM.style.left, this.elementDOM.style.top] = [`${Math.round(Math.random()*100)}%`, `${Math.round(Math.random()*100)}%`];
					  break;
				 case 'CENTER':
					  setTimeout(() => [this.elementDOM.style.left, this.elementDOM.style.top] = [`${Math.trunc(Math.max(0, this.parentchild.elementDOM.clientWidth - this.elementDOM.offsetWidth)*100/(2 * this.parentchild.elementDOM.clientWidth))}%`,
																								  `${Math.trunc(Math.max(0, this.parentchild.elementDOM.clientHeight - this.elementDOM.offsetHeight)*100/(2 * this.parentchild.elementDOM.clientHeight))}%`], 0);
					  break;
				}
	    }
 
 // Set child width/height
 AdjustElementDOMSize(width = DOMELEMENTMINWIDTH, height = DOMELEMENTMINHEIGHT)
 {
  const computed = window.getComputedStyle(this.elementDOM);
  if (parseInt(computed.getPropertyValue('width')) < DOMELEMENTMINWIDTH || parseInt(computed.getPropertyValue('height')) < DOMELEMENTMINHEIGHT) [this.elementDOM.style.width, this.elementDOM.style.height] = [width + 'px', height + 'px'];
 }

 // Call for 'transition end' event
 TransitionEnd()
 {
  this.elementDOM.classList.remove(this.props.effect + 'show', this.props.effect + 'hide', 'smooth');	// Remove child DOM element all animation classes
  if (this.removeonhide) this.elementDOM.remove();														// and DOM element of itself in case of <removeonhide> property is true
 }

 // Function changes child z-index property
 ChangeZIndex(relative, absolute)
 {
  if (absolute === undefined) this.zindex += relative; else this.zindex = absolute + relative;
  this.elementDOM.style.zIndex = this.zindex + '';
 }

 // Function styles active child via child DOM element shadow set
 StyleActiveChild(status = true)
 {
  this.elementDOM.style.boxShadow = status ? ACTIVECHILDSHADOW : 'none';
 }

 // Toggle child active status via disabling it and then enabling it back. For modal child focus recapture tries
 ToggleActiveStatus()
 {
  this.StyleActiveChild(false);
  setTimeout(this.StyleActiveChild.bind(this), 4 * REFRESHMININTERVAL);
 }

 // Function activates child
 ChangeActive(id)
 {
  if (this.activeid === id) return;											// Active child is being activated again - return
  if (this.activeid) this.childs[this.activeid].StyleActiveChild(false);	// If old active child is not me, remove the old child styling (div element shadow)
  this.preactiveid = this.activeid;											// Active child id is to be changing to id <id>, so set last active id to current active id <this.activeid>
  if (!(this.activeid = id)) return;										// If new active child is me - do nothing. Parent child will activate me in case
  this.childs[id].StyleActiveChild();										// Make new active child shadowed
  while (true)
	    {
	     const current = this.childs[id];																	// Fix current child
	     const zid = current.zindex;																		// and its zindexes array index
	     const upper = this.zindexes[zid + 1] ? this.childs[this.zindexes[zid + 1]] : null;					// and the upper child from the current
	     const lower = (zid > 1 && this.zindexes[zid - 1]) ? this.childs[this.zindexes[zid - 1]] : null;	// and lower one from the current
		 if (app.control && app.control.child !== current && current.IsModal())								// Current child is modal and existing captured child is not current? Release control
		 	{
			 document.body.style.cursor = 'auto';
			 CallControlHandler(app.control, null, 'release');
			 lg(`Control ${app.control.name} is released!`);
			 delete app.control;
			}
		 if (lower && !this.IsOnTopFlag(current) && this.IsOnTopFlag(lower))								// Lower child is 'top layer' and current is not? Swap it
		 	{
			 this.SwapChilds(lower, current);
			 continue;
			}
		 if (!upper || (this.IsOnTopFlag(upper) && !this.IsOnTopFlag(current))) break;						// Upper child is undefined or upper is 'top layer' with current is not? Finish
		 this.SwapChilds(upper, current);																	// Otherwise bring current child to upper layer via swapping current and upper
	    }
 }

 // Function kills specified child, rebuilds z-indexes and deletes its element from child array with 'removeonhide' flag seting to true (to remove element from the DOM)
 KillChild(id)
 {
  //if (typeof id === 'string') id = +id;																						// Pisec
  if (app.control?.child === this.childs[id])																					// Current captured control is on killing child? Release it
	 {
	  if (app.control.cursor) document.body.style.cursor = 'auto';
	  lg(`Control ${app.control.name} is released!`);
	  delete app.control;
	 }
  this.childs[id].removeonhide = true;																							// Set 'removeonhide' flag to kill the child on hide
  this.childs[id].Hide();																										// Hide and kill the child
  this.zindexes.splice(this.childs[id].zindex, 1);																				// Remove appropriate child z-index element
  for (let zid = this.childs[id].zindex; zid < this.zindexes.length; zid++) this.childs[this.zindexes[zid]].ChangeZIndex(-1);	// and decrement all z-index values
  if (this.preactiveid === id) this.preactiveid = 0;																										// If killing child is last active, set it to child container (zero child id)
  if (this.activeid === id) this.childs[this.activeid = this.preactiveid].StyleActiveChild();									// Activate last active child if killing child is active. Old code version activates top child: this.childs[this.activeid = this.zindexes.at(-1)].StyleActiveChild();
  this.childs[id].destructor();																									// Call child desctructir
  const ismodal = this.childs[id].props.overlay === 'MODAL';
  delete this.childs[id];	
  if (ismodal)																													// Killed child was modal overlay? Remove css 'modal' filter for some childs below
  if (this.childs[this.activeid].props.overlay === 'MODAL') 
	 {
	  this.childs[this.activeid].elementDOM.classList.remove('modalfilter');													// Current active child is modal overlay? Remove its DOM element css 'modal' filter. For current active only
	 }
   else
     {
  	  for (const i in this.childs) if (+i) this.childs[i].elementDOM.classList.remove('modalfilter');							// Otherwise remove css 'modal' filter for all childs 
	 }
 }

 // Hide the child with animation this.props.effect
 Hide()
	{
	 if (EFFECTS.indexOf(this.props.effect) === -1)														// No animation?
	    {
	     this.removeonhide ? this.elementDOM.remove() : this.elementDOM.style.visibility = 'hidden';	// Remove element from the DOM or just hide it via visibility property
	     return;
	    }
	 this.elementDOM.style.visibility = 'hidden';														// Animation does exist, so add corresponded class. DOM element child will be removed at 'transition-end' event
	 this.elementDOM.classList.add(this.props.effect + 'hide');
	}

 // Show child with animation
 Show()
	{
	 if (EFFECTS.indexOf(this.props.effect) === -1)														// No animation?
	    {
	     this.elementDOM.style.visibility = 'visible';													// Just style DOM element visibility and return
	     return;
	    }
	 this.elementDOM.classList.add(this.props.effect + 'hide');											// Otherwise animate the child via adding 'hide' class
	 setTimeout(() => { this.elementDOM.style.visibility = 'visible'; this.elementDOM.classList.add(this.props.effect + 'show'); }, REFRESHMININTERVAL);	// and then 'show' class via timeout to make transition from 'hide' to 'show' visible
	}
 
 // Check child 'top layer' overlay
 IsOnTopFlag(child)
 {
  return (child && (child.props.overlay === 'ALWAYSONTOP' || child.props.overlay === 'MODAL' || child.props.overlay === 'NONSTICKY'));
 }

 // Check child 'modal' overlay
 IsModal()
 {
  return this.props.overlay === 'MODAL';
 }

 // Check child 'nonsticky' overlay
 IsNonsticky()
 {
  return this.props.overlay === 'NONSTICKY';
 }

 // Function swaps two child layers
 SwapChilds(upper, lower)
 {
  if (!upper || !lower) return;				// Return for any child undefined
  const zid = upper.zindex;					// Fix upper child z-index
  upper.ChangeZIndex(0, lower.zindex);		// Set upper child z-index to lower child z-index
  lower.ChangeZIndex(0, zid);				// Set lower child z-index to upper child z-index
  this.zindexes[upper.zindex] = upper.id;	// Change zindexes array - assign upper child id to upper zindex element 
  this.zindexes[lower.zindex] = lower.id;	// and lower child id to lower zindex element 
 }
 
 // Child control properties:
 // initevent: any non undefined value calls <callbackfunction> 
 // captureevent: event the capture starts at. Since the capture is started - no other captures allowed, so any other childs mouse/keyboards events are ignored. The capture starts at this event, area match (if exists) and DOM elements array match
 // button: event.code ('Escape, 'KeyZ'..) for keyboard events and event.button (0 - left btn, 1 - middle btn, 2 - right btn, 3 - fourth btn, 4 - fifth btn) for mouse events
 // buttons: event.buttons (0 - no any btn, 1 - left btn, 2 - right btn, 4 - middle btn, 8 - 4th btn, 16 - 5th btn) for mouse events
 // modifier: key flag to match together with mouse/keyboard <captureevent> for next keys: CTRL (0b1), ALT (0b10), SHIFT (0b100) and META (0b1000)
 // processevent: event the current capture handles via <callbackfunction> call
 // releaseevent: event the capture is released on. Since the capture is released - any other childs mouse/keyboards events become available
 // area: child element DOM relative rectangle coordinates x1,y1,x2,y2 the mouse cursor in to start the capture
 // elements: array of DOM elements the capture starts at together with 'area' and 'capturestart'. Two-level nested array is allowed (for pushing elements with its childs DOM elements, for a example)
 // callback: for all defined control phases - <callback> array functions (if exist) call is perfomed.
 // icon: image url used as a background image with area coordinates
 // cursor: document cursor style on <area> hover
 // child: child object inited at child insert. Property is defined automatically at child insert.
 // name: control name
 // <any prop name>: some control specific data. Used for callback inner behaviour

 // Close child control
 static CloseControl(userevent, control, phase)
 {
  if (phase === 'release') return { type: 'KILLME' };
 }

 ToggleControlsStatus(include, exclude, disabled)
 {
  if (Array.isArray(include)) for (const controlname in this.props.control) if (include.includes(controlname)) this.props.control[controlname].disabled = disabled;
  if (Array.isArray(exclude)) for (const controlname in this.props.control) if (!exclude.includes(controlname)) this.props.control[controlname].disabled = disabled;
 }

 // Minimize screen child control
 static MinimizeScreenControl(userevent, control, phase)
 {
  if (phase !== 'init' && phase !== 'release') return;																							// No minimize screen toggle for 'capture' phase
  if (phase === 'release') control.child.elementDOM.classList.add('smooth');																	
  const style = control.child.elementDOM.style;

  if (control.data)																																// Minimized screen state toggles to initial size
	 {
	  [ style.top, style.left, style.width, style.height ] = [ control.data.top, control.data.left, control.data.width, control.data.height ];
	  delete control.data;
	  let fullscreen = control.child.props.control.fullscreenicon ? control.child.props.control.fullscreenicon : control.child.props.control.fullscreendblclick;
	  control.child.ToggleControlsStatus([], ['minimizescreen', 'closeicon', 'drag'].concat(fullscreen?.data ? ['resize', 'resizex', 'resizey'] : []));
	 }
   else																																			// Initial size state toggles to minimized screen
	 {
	  control.data = { top: style.top, left: style.left, width: style.width, height: style.height };
	  [ style.top, style.left, style.width, style.height ] = [ style.top, style.left, '3%', '3%'];												// Todo2 - place child to something like "taskbar" of parent child bottom area
	  control.child.ToggleControlsStatus([], ['minimizescreen', 'closeicon', 'drag'], true);
	 }
 }

 // Full screen child control
 static FullScreenControl(userevent, control, phase)
 {
  if (phase !== 'init' && phase !== 'release') return;																							// No full screen toggle for 'capture' phase
  if (phase === 'release') control.child.elementDOM.classList.add('smooth');																	// Animate full screen toggle for non-init phase (init phase initially displays child at 'full screen' state)
  const style = control.child.elementDOM.style;
  const iconrefresh = control.child.props.control.fullscreenicon ? true : false;

  if (iconrefresh) control = control.child.props.control.fullscreenicon;
  if (control.data)																																// Full screen state toggles to initial size
	 {
	  [ style.top, style.left, style.width, style.height ] = [ control.data.top, control.data.left, control.data.width, control.data.height ];
	  delete control.data;
	  if (iconrefresh) control.icon = ICONURLFULLSCREENTURNON;
	  control.child.ToggleControlsStatus(['resize', 'resizex', 'resizey', 'drag']);
	 }
   else																																			// Initial size state toggles to full screen
	 {
	  control.data = { top: style.top, left: style.left, width: style.width, height: style.height };
	  [ style.top, style.left, style.width, style.height ] = ['0%', '0%', '100%', '100%'];														// Full screen child DOM element size. Previous variant: [] = control.child.parentchild === app ? ['0%', '0%', '100%', '100%'] : ['1%', '1%', '98%', '98%'];
	  if (iconrefresh) control.icon = ICONURLFULLSCREENTURNOFF;
	  control.child.ToggleControlsStatus(['resize', 'resizex', 'resizey', 'drag'], null, true);
	 }
  if (iconrefresh) control.child.RefreshControlIcons();
 }
  
 // Rsizing child control
 static ResizeControl(userevent, control, phase)
 {
  if (!userevent) return;
  if (!control.data) control.data = { resizingElement: control.child.elementDOM };																				// DOM element to change its width and height
  if (phase === 'capture')
	 {
	  [ control.data.x, control.data.y, control.data.rect ] = [ userevent.clientX, userevent.clientY, control.data.resizingElement.getBoundingClientRect() ];	// For 'capture' phase fix only mouse cursor coordinates and resizing element rectangle to calculate width and height at mouse move ('process' phase)
	  return;
	 }
  if (control.cursor !== 'n-resize') control.data.resizingElement.style.width = (userevent.clientX - control.data.x + control.data.rect.width) + 'px';			// Otherwise change child DOM element width for non vertical resizng control
  if (control.cursor !== 'e-resize') control.data.resizingElement.style.height = (userevent.clientY - control.data.y + control.data.rect.height) + 'px';		// and child DOM element height for non horizontal resizng control
 }
 
 // Dragging child control
 static DragControl(userevent, control, phase)
 {
  if (!userevent) return;
  if (phase === 'capture')																															// For 'capture' phase fix only relative mouse cursor coordinate offsets to calculate its left/right position at mouse move ('process' phase)
	 {
	  control.data = {};
	  control.data.offsetx = userevent.clientX - control.child.elementDOM.offsetLeft + ElementScrollX(control.child.elementDOM.parentNode);
	  control.data.offsety = userevent.clientY - control.child.elementDOM.offsetTop + ElementScrollY(control.child.elementDOM.parentNode);
	  return;
	 }
  control.child.elementDOM.style.left = (userevent.clientX - control.data.offsetx + ElementScrollX(control.child.elementDOM.parentNode)) + 'px';	// Otherwise change element position relatively to changed cursor coordinates
  control.child.elementDOM.style.top = (userevent.clientY - control.data.offsety + ElementScrollY(control.child.elementDOM.parentNode)) + 'px';
 }
 
 // Pushing some child DOM elements control
 static PushControl(userevent, control, phase)
 {
  switch (phase)
		 {
		  case 'capture':
			   for (const element of control.elements)
				   {
					const elements = Array.isArray(element) ? element : [element];
					for (const id in elements) if (elements[id] === userevent.target) return (control.data = elements)[0].classList.add('buttonpush');	// At 'capture' phase calculate main element (to displace it at pushing) and 'push' it via adding corresponded class
				   }
			   break;
		  case 'process':																																// Calculate main element and its childs hover and 'push' main one at success
			   for (const id in control.data) if (control.data[id] === userevent.target) return control.data[0].classList.add('buttonpush');
		  default:
			   control.data[0].classList.remove('buttonpush');																							// release main element otherwise via removing corresponded class
		 }
 }
 
 static EventListener(event)
 {
  // First step - vars init, global event counter increment and preventDefault() call for all except keyboard and mouse 'down|click' (to keep native textarea[mousedown]/radio[click]/checkbox[click] elements working) events
  let child, childclientrect, modalchild;
  app.eventcounter++;
  if (['keydown', 'keyup', 'mousedown', 'click'].indexOf(event.type) === -1) event.preventDefault();

  // Second step - get event targeted child (and its rectangle) via event.target DOM element for mouse events. In case of keyboard events - lowest active child is used to pass them to
  if (['keydown', 'keyup'].indexOf(event.type) === -1)
	 {
	  child = GetDOMElementChild(GetFirstRegisteredDOMElement(event.target));
	  if (!child) return;																						// Some mouse events are duplicated (mouse up generates 'click' in addition), so duplicated events may points to non-existing childs when 1st event kills it (mouse up kills context menu, click points to killed context)
	  childclientrect = child.elementDOM.getBoundingClientRect();
	  modalchild = GetCapturedFocusModalChild(child.elementDOM, event.type === 'mousedown' ? true : false);		// Get captured focus modal child if exists
	  if (!modalchild && 'mousedown' === event.type)
		 {
		  RemoveAllNonStickyChilds(child);																		// Should non sticky removal be for mousedown event only? 
		  ProcessChildEvent(child, { type: 'BRINGTOTOP' });														// Bring clicked child to top for no modal child focus captured
		 }
	 }
   else
	 {
	  child = app;
	  while (child.activeid) child = child.childs[child.activeid];
	 }

  // Next step - check for any captured control and if true - check for 'release' event first and in case of no match - 'process' event then. Make return at the end
  if (app.control)
	 {
	  if (ControlEventMatchUserEvent(app.control, event, 'release') !== false)
		 {
		  lg(`Control ${app.control.name} is released!`);
		  SetMouseCursorContolsHover(app.control.child, event, childclientrect);		// Check all controls mouse cursor hover match and modify cursor for mouse moving	
		  if (ControlAreaMatchMouseCursor(app.control, event, 'release', childclientrect) !== false)
			 CallControlHandler(app.control, event, 'release');							// Call control handler
		  delete app.control;															// and release captured control
		  return;
		 }
	  if (ControlEventMatchUserEvent(app.control, event, 'process') === true)			// Captured control in 'process' phase?
		 {
		  CallControlHandler(app.control, event, 'process');							// Call control handler
		  return;
		 }
	  return;																			// Return anyway for captured control
	 }

  // Another step - return for modal child exist or check mouse cursor child controls hover
  if (event.type === 'mousemove') SetMouseCursorContolsHover(child, event, childclientrect);	// Check all controls mouse cursor hover match and modify cursor for mouse moving
  if (modalchild) return;

  // Last step - proccess all child controls for capture and release events for no modal child focus captured
  for (const prop in child.props.control)														// Iterate all controls of a current child to check capture/release phases
	  {
	   const control = child.props.control[prop];
	   if (control.disabled) continue;
	   if (ControlEventMatchUserEvent(control, event, 'capture') === true &&
	   	   ControlAreaMatchMouseCursor(control, event, 'capture', childclientrect) !== false &&	
		   ControlElementsMatchEventTarget(control, event) !== false)
		  {																						// Check control event, mouse cursor is in control area and clicked element match of control DOM elements for 'capture' phase. Control is considered captures in case of all cases match
		   lg(`Control ${prop} is captured!`);
		   app.control = control;																// Fix captured control
		   if ('cursor' in control) document.body.style.cursor = control.cursor;				// Set control cursor
		   CallControlHandler(control, event, 'capture');										// Call control handler
		   return;
		  }
	   if (ControlEventMatchUserEvent(control, event, 'capture') === undefined &&
		   ControlEventMatchUserEvent(control, event, 'release') !== false &&
		   ControlAreaMatchMouseCursor(control, event, 'release', childclientrect) !== false &&
		   ControlElementsMatchEventTarget(control, event) !== false)							// Check match case for 'release' phase only for non-existing 'capture' phase
	   	  {
		   lg(`Control ${control.name} is captured and released!`);
		   if (CallControlHandler(control, event, 'release')) return;							// Call control handler. For only these kind of controls (with no 'capture' phase) next control process is continued if no current control handler return event
		  }
	  }
 }
}

const CHILDCONTROLTEMPLATES = {
							   minimizescreen: { captureevent: 'mousedown', releaseevent: 'mouseup', area: {x1: -14, y1: 2, x2: -3, y2: 13}, cursor: 'pointer', icon: ICONURLMINIMIZESCREEN, callback: [Interface.MinimizeScreenControl] }, 
							   fullscreenicon: { captureevent: 'mousedown', releaseevent: 'mouseup', area: {x1: -14, y1: 2, x2: -3, y2: 13}, cursor: 'pointer', icon: ICONURLFULLSCREENTURNON, callback: [Interface.FullScreenControl] }, 
							   fullscreendblclick: { releaseevent: 'dblclick', callback: [Interface.FullScreenControl] }, 
							   closeicon: { captureevent: 'mousedown', releaseevent: 'mouseup', area: {x1: -14, y1: 2, x2: -3, y2: 13},  cursor: 'pointer', icon: ICONURLCLOSE, callback: [Interface.CloseControl] }, 
							   closeesc: { releaseevent: 'keyup', button: 'Escape', callback: [Interface.CloseControl] }, 
							   resize: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', area: {x1: -13, y1: -13, x2: -1, y2: -1}, cursor: 'nw-resize', callback: [Interface.ResizeControl] }, 
							   resizex: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', area: {x1: -13, y1: 0, x2: -1, y2: -1}, cursor: 'e-resize', callback: [Interface.ResizeControl] }, 
							   resizey: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', area: {x1: 0, y1: -13, x2: -1, y2: -1}, cursor: 'n-resize', callback: [Interface.ResizeControl] }, 
							   push: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', elements: [], cursor: 'pointer', callback: [Interface.PushControl] }, 
							   drag: { button: 0, captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', cursor: 'grabbing', callback: [Interface.DragControl] }, 
							   default: { callback: [] }, 
							  };
