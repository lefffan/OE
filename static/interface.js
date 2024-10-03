// Todo0 - starting mouse capture on scrollbar with release on close btn - closes frame! That shouldn't be!!
// Todo1 - Some boxes may gravitate/stick to another one, example OV boxes may stick to sidebar box or to parent box edges
// Todo1 - Captured box is moving to out of range at the top/left parent child area. At releasing captured box - it should be at visible top/left area of parent with parent box changed to appropriate size
// Todo1 - Resizing cursor type during resizing process while mouse cursir is moving should have privelege to other cursor types. Otherwise other hover pseudo classes is activated on some elements (for example - cursor 'pointer' on sidebar view/db options)
// Todo1 - Resizing cursor problem above may be decided via custom cursor div with 'cursor: none;' for all elements
// Todo1 - all 'cm' icons (such as 'full screen toggle' or 'close') should have native or user defined behaviuour with user defined position x/y (negative x,y interpretated as a related right,bottom margins)
//		   First - add minimize 'cm' icon (in minimize mode 'maximize' and 'close' cm-buttons are available). All 'cm' buttons are toggle and have 2 condition - on or off. User define 'cm' buttons are user handled.

const DOMELEMENTMINWIDTH			= 50;
const DOMELEMENTMINHEIGHT			= 50;
const DOMELEMENTCASCADEPOSITIONS	= [['7%', '7%'], ['14%', '14%'], ['21%', '21%'], ['28%', '28%'], ['35%', '35%'], ['42%', '42%'], ['49%', '49%'], ['56%', '56%'], ['63%', '63%'], ['70%', '70%']];

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
	      	  if (child === app) app.ChangeActive(0);									// Make root child active, lower while cycle doesn't make it for app child
	      	  while (child.parentchild)													// Cycle until parent exists
		    	    {
		     		 child.parentchild.ChangeActive(child.id);							// Set current child state to actove 
		     		 child = child.parentchild;											// and go to parent one
		    	    }
	      	  break;
		}
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

// Function checks specified element modal child focus conflict
function IsModalFocusMismatch(element, blink)
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
	  return true;
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
 if (!control.area || !childclientrect || (phase === 'release' && !control.outofarearelease)) return;					// Return undefined for undefined control area or non mouse events (undefined childrect) or 'release' phase falsy outofarearelease flag
 const absolutearea = { x1: childclientrect.x + control.area.x1 + (control.area.x1 < 0 ? childclientrect.width : 0),	// Area negative coordinates indicate right/bottom edge margins
						y1: childclientrect.y + control.area.y1 + (control.area.y1 < 0 ? childclientrect.height : 0),
						x2: childclientrect.x + control.area.x2 + (control.area.x2 < 0 ? childclientrect.width : 0),
						y2: childclientrect.y + control.area.y2 + (control.area.y2 < 0 ? childclientrect.height : 0),
  					  };
 if (absolutearea.x1 > absolutearea.x2) [absolutearea.x1, absolutearea.x2] = [absolutearea.x2, absolutearea.x1];		// Swap x1 and x2 if x2 lower than x1
 if (absolutearea.y1 > absolutearea.y2) [absolutearea.y1, absolutearea.y2] = [absolutearea.y2, absolutearea.y1];
 return userevent.clientX >= absolutearea.x1 && userevent.clientX <= absolutearea.x2 && userevent.clientY >= absolutearea.y1 && userevent.clientX <= absolutearea.y2 ? true : false;	// Return mouse cursor coordiantes inside specified area expression result
}

// Function checks control event matches user keyboard/maoiuse event
function ControlEventMatchUserEvent(control, userevent, phase)
{
 if (control[phase + 'event'] === undefined) return;																																	// Return undefined for absent phase event
 for (const event of control[phase + 'event'].split('|'))																																// Split all events to match user event.type
	 if (event && ((event[0] !== '!' && event === userevent.type) || (event[0] === '!' && event !== userevent.type)))																	// Positive event value matches user event.type or negative event doesn't match?
 	    return ((control.button === undefined || (['keydown', 'keyup'].indexOf(userevent.type) === -1 ? control.button === userevent.button : control.button === userevent.code)) &&	// Then mouse event button and keyboard event code match (if exist)
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

// Function calls control.childcall function to handle init/capture/process/release events. Then control.controlcall function
// In case of any callback string type call another child control (child.control[controlcall|childcall].controlcall|childcall) callback function is perfomed
// Usefull to perform one action for two or more controls, for a example full screen toggle icon click (one control) and double click (other)
function CallControlHandler(control, userevent, phase)
{
 let result;
 if (typeof control.controlcall === 'function') result = control.controlcall(userevent, control, phase);	// Call handler control.controlcall first
 if (typeof control.controlcall === 'string' && control.child.props.control[control.controlcall].controlcall === 'function') result = control.child.props.control[control.controlcall].controlcall(userevent, control.child.props.control[control.controlcall], phase);
 if (phase === 'init') return;
 ProcessChildEvent(control.child, result);

 result = undefined;
 if (typeof control.childcall === 'function') result = control.childcall(userevent, control, phase);	// Then handler control.childcall
 if (typeof control.childcall === 'string' && control.child.props.control[control.childcall].childcall === 'function') result = control.child.props.control[control.childcall].childcall(userevent, control.child.props.control[control.childcall], phase);
 ProcessChildEvent(control.child, result);
}

// Function changes mouse cursor depending control area hover and then DOM elements match
function ChangeMouseCursor(control, userevent, childclientrect, resetcursor)
{
 if (['keydown', 'keyup'].indexOf(userevent.type) !== -1 || typeof control.cursor !== 'string') return;
 switch (ControlAreaMatchMouseCursor(control, userevent, '', childclientrect))
		{
		 case true: 
			  return document.body.style.cursor = control.cursor;
		 case undefined:
 			  if (ControlElementsMatchEventTarget(control, userevent) === true) return document.body.style.cursor = control.cursor;
		 case false:
			  return resetcursor ? document.body.style.cursor = 'auto' : undefined;
		}
}

class Interface
{
 destructor()
 {
 }

 constructor(...args) // (data, parentchild, props, attributes)
	    {
	     // Data
	     this.data = args[0];

	     // Parent child
	     this.parentchild = args[1];

	     // Props {tagName: 'DIV|BODY', overlay: 'ALWAYSONTOP|MODAL|NONSTICKY', effect: '', position: 'CASCADE|CENTER|RANDOM', controlicondirection: 'left|right|top|bottom', controliconmargin: 1}
	     this.props = (args[2] && typeof args[2] === 'object') ? args[2] : {};
	     if (!this.props.tagName) this.props.tagName = 'DIV';
	     this.elementDOM = this.parentchild ? document.createElement(this.props.tagName) : document.body;	// Set DOM element to document.body in case of no parent child defined

	     // Attributes
	     this.attributes = (args[3] && typeof args[3] === 'object') ? args[3] : {};
	     this.attributes['data-child'] = '';																// Set default data child attribute, for non-root child (with no parent) this attribute will be changed after insertion
	     for (const name in this.attributes) this.elementDOM.setAttribute(name, this.attributes[name]);

	     // Other child settings
	     this.childs = {0: this};																			// list of child objects sorted by id
	     this.zindexes = [0];																				// list of child ids sorted by z-index
	     this.activeid = 0;																					// Active child id - 0 is current object used as a parent for its child, 1 - first child and etc..
	     this.maxchildid = 0;																				// Child max id ever been inserted

	     // Stop constructor for root child (app) that has no parent. Root element is always document.body
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

		 // Parse child controls
		 const iconcontrol = [];															// Control (with icons to display) names array
		 let iconimage = '', iconposition = '';												// CSS style collectable background-image and background-position props
		 for (const name in this.props.control)												// Iterate all child controls
		  if (!this.props.control[name] || typeof this.props.control !== 'object')			// Incorrect control?
			 {
			  delete this.props.control[name];												// Delete it
			 }
		   else
			 {
			  this.props.control[name] = Object.assign(name in CHILDCONTROLTEMPLATES ? JSON.parse(JSON.stringify(CHILDCONTROLTEMPLATES[name])) : {}, this.props.control[name]);	// Otherwise check control name for existing template and copy it if exist. Child control props overwrite template props
			  this.props.control[name].child = this;										// Set control child
			  if ('initevent' in this.props.control[name]) CallControlHandler(this.props.control[name], this.props.control[name]['initevent'], 'init');							// For control 'initevent' call control and if needed child callback. And then handle callback result
			  if ('area' in this.props.control[name] && (this.props.control[name].iconon || this.props.control[name].iconoff)) iconcontrol.push(name);							// Collect controls with icon urls and areas to display then as a background
			 }
		 if (['right', 'bottom', 'top', ].indexOf(child.props.controlicondirection) === -1) child.props.controlicondirection = 'left';											// Set icon offset direction in case of overlapped areas
		 if (child.props.controliconmargin !== 'number') child.props.controliconmargin = 0;																						// and icon margin
		 for (const id in iconcontrol)																																			// Iterate all 'icon' controls
			 {
			  const control = this.props.control[iconcontrol[id]];
			  if (+id)																																							// Check icon areas overlapping from 2nd control
				 {
				  const prevcontrol = this.props.control[iconcontrol[id - 1]];
				  let disp;
				  if (control.area.x2 < prevcontrol.area.x1 || control.area.x1 > prevcontrol.area.x2 || control.area.y2 < prevcontrol.area.y1 || control.area.y1 > prevcontrol.area.y2) continue;				// No overlap with previous control
				  switch (child.props.controlicondirection)
					 	 {
					      case 'right': disp = prevcontrol.area.x2 - control.area.x1; control.area.x1 += disp + child.props.controliconmargin; control.area.x2 += disp + child.props.controliconmargin; break;	// Move area coordinates to right side on offset (disp) value
						  case 'left': disp = prevcontrol.area.x1 - control.area.x2; control.area.x1 += disp - child.props.controliconmargin; control.area.x2 += disp - child.props.controliconmargin; break;	// etc..
					      case 'bottom': disp = prevcontrol.area.y2 - control.area.y1; control.area.y1 += disp + child.props.controliconmargin; control.area.y2 += disp + child.props.controliconmargin; break;
						  case 'top': disp = prevcontrol.area.y1 - control.area.y2; control.area.y1 += disp - child.props.controliconmargin; control.area.y2 += disp - child.props.controliconmargin; break;
						 }
				 }
			  iconposition += `${control.area.x1 < 0 ? 'right' : 'left'} ${Math.abs(control.area.x1)}px ${control.area.y1 < 0 ? 'bottom' : 'top'} ${Math.abs(control.area.y1)}px, `;							// Define icon position
			  iconimage += `${control.data ? control.iconon : control.iconoff}, `;																																// and its image url
			 }
		 if (iconposition)																																														// Any icon?
		 	{
			 this.elementDOM.style.backgroundPosition = iconposition.substring(0, iconposition.length - 2);																										// Define style props..
			 this.elementDOM.style.backgroundImage = iconimage.substring(0, iconimage.length - 2);
			 this.elementDOM.style.backgroundRepeat = 'no-repeat !important';
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
  setTimeout(() => this.StyleActiveChild, 4 * REFRESHMININTERVAL);
 }

 // Function activates child
 ChangeActive(id)
 {
  if (this.activeid === id) return;											// Active child is being activated again - return
  if (this.activeid) this.childs[this.activeid].StyleActiveChild(false);	// If old active child is not me, remove the old child activation (remove div element shadow)
  if (!(this.activeid = id)) return;										// If new active child is me - return. Parent child will activate me in case
  this.childs[id].StyleActiveChild();										// Make new active child shadowed
  this.BringUpChild(id);													// and bring it up
 }

 // Function kills specified child, rebuilds z-indexes and deletes its element from child array with 'removeonhide' flag set to remove element from the DOM
 KillChild(id)
 {
  if (app.control.child === this.childs[id])																												// Current captured control is on killing child? Release it
	 {
	  if (app.control.cursor) document.body.style.cursor = 'auto';
	  delete app.control;
	 }
  clearTimeout(this.childs[id].buttontimeoutid);																											// Clear child timeouts
  this.childs[id].removeonhide = true;																														// Set 'removeonhide' flag to kill the child on hide
  this.childs[id].Hide();																																	// Hide and kill the child
  this.zindexes.splice(this.childs[id].zindex, 1);																											// Remove appropriate child z-index element
  for (let zid = this.childs[id].zindex; zid < this.zindexes.length; zid++) this.childs[this.zindexes[zid]].ChangeZIndex(-1);								// and decrement all z-index values
  this.childs[this.activeid = this.zindexes.at(-1)].StyleActiveChild();																						// Activate upper child (last z-index array element)
  this.childs[id].destructor();																																// Call child desctructir
  delete this.childs[id];																																	// Delete child object
  if (this.childs[this.activeid].props.overlay !== 'MODAL') for (const i in this.childs) if (+i) this.childs[i].elementDOM.classList.remove('modalfilter');	// and reomve css style modal filter in case of killing child is 'MODAL' overlay
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

 // Function brings the child to top layer
 BringUpChild(id)
 {
  while (true)
	    {
	     const current = this.childs[id];																	// Fix current child
	     const zid = current.zindex;																		// and its z-index
	     const upper = this.zindexes[zid + 1] ? this.childs[this.zindexes[zid + 1]] : null;					// also the upper child from the current
	     const lower = (zid > 1 && this.zindexes[zid - 1]) ? this.childs[this.zindexes[zid - 1]] : null;	// and lower one from the curren
	     if (this.IsOnTopFlag(current))																		// Current child has 'top layer' overlay?
	        {
			 if (!upper) break;																				// Break if no upper one (current child is on top, so no need for other process)
			 this.SwapChilds(upper, current);																// Otherwise bring current 'alwaysontop' child up via swapping with upper one
			 continue;
	        }
	     if (upper && !this.IsOnTopFlag(upper))																// Upper child does exist and has no top layer flag
	        {
			 this.SwapChilds(upper, current);																// Bring 'non-alwaysontop' current child up via swapping with upper one and continue
			 continue;
	        }
	     if (lower)																							// Lower child exists?
	        {
			 if (!this.IsOnTopFlag(lower)) break;															// Lower child is not 'top layer'? Finish child swapping and break the loop
			 this.SwapChilds(current, lower);																// Lower child has 'top layer' overlay, bring lower to top via swapping current with lower
			 continue;
	        }
	     break;
	    }
 }

 // Function brings the child to top layer
 BringUpChildNew(id)
 {
  while (true)
	    {
	     const current = this.childs[id];																	// Fix current child
	     const zid = current.zindex;																		// and its z-index
	     const upper = this.zindexes[zid + 1] ? this.childs[this.zindexes[zid + 1]] : null;					// also the upper child from the current
	     const lower = (zid > 1 && this.zindexes[zid - 1]) ? this.childs[this.zindexes[zid - 1]] : null;	// and lower one from the curren
		 if (!upper || (this.IsOnTopFlag(upper) && !this.IsOnTopFlag(current))) break;						// Upper child is undefined or upper is 'top layer' with current is not? Finish
		 this.SwapChilds(upper, current);																	// Otherwise bring current child to upper layer via swapping curren and upper one
	    }
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
 // modifier: key flag to match together with mouse/keyboard <captureevent> for next keys: CTRL (0b1), ALT (0b10), SHIFT (0b100) and META (0b1000)
 // processevent: event the current capture handles via <callbackfunction> call
 // releaseevent: event the capture is released on. Since the capture is released - any other childs mouse/keyboards events become available. Capture is released at this event occur or <outofarearelease> true value (see below)
 // area: child element DOM relative rectangle coordinates x1,y1,x2,y2 the mouse cursor in to start the capture
 // outofarearelease: true value releases the cature in case of mouse coordinates out of defined area 
 // elements: array of DOM elements the capture starts at together with 'area' and 'capturestart'. Two-level nested array is allowed (for pushing elements with its childs DOM elements, for a example)
 // childcall: for all defined capture stages <childcall> function (if exist) call is perfomed. String type prop perfomes that string another control name function call
 // controlcall: in case of no 'childcall' function result for all defined capture stages <controlcall> function (if exist) call is perfomed. For native control (fullscreen toggle, close, ecs btn..) predefined functions are used. String type prop perfomes that string another control name function call
 // data: current control specific data, used for callback inner behaviour and/or background icon (see below)
 // iconon|iconoff: url used as a background image with area coordinates, iconon/iconoff depends on <data> truthy/falsy values and refreshed at capture/relese events automatically
 // cursor: document cursor style on <area> hover
 // child: child object inited at child insert. Property is defined automatically at child insert.

 // Full screen child control
 static FullScreenControl(userevent, control, phase)
 {
  if (phase === 'capture') return;																												// No full screen toggle for 'capture' phase
  if (phase !== 'init') control.child.elementDOM.classList.add('smooth');																		// Animate full screen toggle for non-init phase (init phase initially displays child at 'full screen' state)
  const style = control.child.elementDOM.style;
  if (control.data)																																// Full screen state toggles to initial size
	 {
	  [ style.top, style.left, style.width, style.height ] = [ control.data.top, control.data.left, control.data.width, control.data.height ];
	  delete control.data;
	 }
   else																																			// Initial size state toggles to full screen
	 {
	  control.data = { top: style.top, left: style.left, width: style.width, height: style.height };
	  [ style.top, style.left, style.width, style.height ] = ['0%', '0%', '100%', '100%'];														// Full screen child DOM element size. Previous variant: [] = control.child.parentchild === app ? ['0%', '0%', '100%', '100%'] : ['1%', '1%', '98%', '98%'];
	 }
 }
 
 // Rsizing child control
 static ResizeControl(userevent, control, phase)
 {
  if (!control.data) control.data = { resizingElement: control.child.elementDOM };																				// DOM element to change its width and height
  if (phase === 'capture')
	 {
	  [ control.data.x, control.data.y, control.data.rect ] = [ userevent.clientX, userevent.clientY, control.data.resizingElement.getBoundingClientRect() ];	// For 'capture' phase fix only mouse cursor coordinates and resizing element rectangle to calculate width and height at mouse move ('process' phase)
	  return;
	 }
  if (control.child.props.control['fullscreenicon'].data) return;																								// Block resizing for childs at 'full screen' state
  if (control.cursor !== 'n-resize') control.data.resizingElement.style.width = (userevent.clientX - control.data.x + control.data.rect.width) + 'px';			// Otherwise change child DOM element width for non vertical resizng control
  if (control.cursor !== 'e-resize') control.data.resizingElement.style.height = (userevent.clientY - control.data.y + control.data.rect.height) + 'px';		// and child DOM element height for non horizontal resizng control
 }
 
 // Dragging child control
 static DragControl(userevent, control, phase)
 {
  if (phase === 'capture')																															// For 'capture' phase fix only relative mouse cursor coordinate offsets to calculate its left/right position at mouse move ('process' phase)
	 {
	  control.data.offsetx = userevent.clientX - control.child.elementDOM.offsetLeft + ElementScrollX(control.child.elementDOM.parentNode);
	  control.data.offsety = userevent.clientY - control.child.elementDOM.offsetTop + ElementScrollY(control.child.elementDOM.parentNode);
	  return;
	 }
  if (control.child.props.control['fullscreenicon'].data) return;																					// Block dragging for childs at 'full screen' state
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
		  case 'release':
			   control.data[0].classList.remove('buttonpush');																							// release main element otherwise via removing corresponded class
		 }
 }
 
 static EventListener(event)
 {
  // First step - var init and event preventDefault call for all except keyboard and mouse 'click' (to keep native radio/checkbox elements working) events
  let child, childclientrect, resetcursor = true;
  if (['keydown', 'keyup', 'click'].indexOf(event.type) === -1)	event.preventDefault();

  // Second step is for mouse events - get event.target first registered DOM element child and bring it to top for 'mousedown' event in case of no other child 'modal' focus
  // For recaptured focus by other modal child with current modal captured (popup childs for a example) - release capture with no callback call
  if (['keydown', 'keyup'].indexOf(event.type) === -1)
	 {
	  child = GetDOMElementChild(GetFirstRegisteredDOMElement(event.target));
	  if (event.type !== 'mousemove')
	  if (IsModalFocusMismatch(child?.elementDOM, event.type === 'mousedown' ? true : false))	// Detect other modal child focus and blink modal in case of 'mousedown' event, so 'click' and 'dblclick' events are excluded
		 {
		  if (!app.control || app.control.child !== child) return;								// Any captured control?
		  document.body.style.cursor = 'auto';													// Reset cursor
		  delete app.control;																	// and release child control
		  return;
		 }
	  childclientrect = child?.elementDOM.getBoundingClientRect();								// No modal focus captured, so call child DOM element client rectangle
  	  if ('mousedown' === event.type) ProcessChildEvent(child, { type: 'BRINGTOTOP' });			// and bring clicked child to top
	 }
	
  // Third step - check for any captured control and if true - check for 'release' event first and in case of no match - 'process' event then. Make return at the end
  if (app.control)
	 {
	  ChangeMouseCursor(app.control, event, childclientrect, resetcursor);				// Change cursor
	  if (ControlEventMatchUserEvent(app.control, event, 'release') !== false || ControlAreaMatchMouseCursor(app.control, event, 'release', childclientrect) === false)
		 {
		  CallControlHandler(app.control, event, 'release');							// Call control and if needed child callback. And then handle callback result
		  delete app.control;															// and release captured control
		  return;
		 }
	  if (ControlEventMatchUserEvent(app.control, event, 'process') !== false)			// Captured control in 'process' phase?
		 {
		  CallControlHandler(app.control, event, 'process');							// Call control and if needed child callback. And then handle callback result
		  return;
		 }
	  return;																			// Return anyway for captured control
	 }

  // Next step - no any control captured, so define child for keyboard event (child for mouse events was defined above) to pass incoming event to
  if (['keydown', 'keyup'].indexOf(event.type) !== -1 && (child = app))
	 while (child.activeid) child = child.childs[child.activeid];

  // Last step - proccess all child controls for capture and release events. Child iteration from lower ones to upper is possible for keyboards events only.
  for (const prop in child.props.control)																															// Then iterate all controls of a current child
	  {
	   const control = child.props.control[prop];
	   ChangeMouseCursor(control, event, childclientrect, resetcursor);																								// Change cursor if changed
	   if (ControlEventMatchUserEvent(control, event, 'capture') !== false && ControlAreaMatchMouseCursor(control, event, 'capture', childclientrect) !== false && ControlElementsMatchEventTarget(control, event) !== false)
		  {																																							// Check control event, mouse cursor is in control area and clicked element match of control DOM elements for 'capture' phase. Control is considered captures in case of all cases match
		   app.control = control;																																	// Fix captured control
		   CallControlHandler(control, event, 'capture');																											// and call control and if needed child callback. And then handle callback result
		   return;
		  }
	   if (ControlEventMatchUserEvent(control, event, 'release') !== false || ControlAreaMatchMouseCursor(control, event, 'release', childclientrect) === false)	// Check match case for 'rlease' phase
	   	  {
		   CallControlHandler(control, event, 'release');																											// Call control and if needed child callback. And then handle callback result
		   return;
		  }
	   resetcursor = false;
	  }
 }
}
