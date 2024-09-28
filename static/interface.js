// Todo0 - starting mouse capture on scrollbar with release on close btn - closes frame! That shouldn't be!!
// Todo1 - Some boxes may gravitate/stick to another one, example OV boxes may stick to sidebar box or to parent box edges
// Todo1 - Captured box is moving to out of range at the top/left parent child area. At releasing captured box - it should be at visible top/left area of parent with parent box changed to appropriate size
// Todo1 - Resizing cursor type during resizing process while mouse cursir is moving should have privelege to other cursor types. Otherwise other hover pseudo classes is activated on some elements (for example - cursor 'pointer' on sidebar view/db options)
// Todo1 - Resizing cursor problem above may be decided via custom cursor div with 'cursor: none;' for all elements
// Todo1 - all 'cm' icons (such as 'full screen toggle' or 'close') should have native or user defined behaviuour with user defined position x/y (negative x,y interpretated as a related right,bottom margins)
//			First - add minimize 'cm' icon (in minimize mode 'maximize' and 'close' cm-buttons are available). All 'cm' buttons are toggle and have 2 condition - on or off. User define 'cm' buttons are user handled.
const DOMELEMENTMINWIDTH			= 50;
const DOMELEMENTMINHEIGHT			= 50;
const DOMELEMENTCASCADEPOSITIONS	= [['7%', '7%'], ['14%', '14%'], ['21%', '21%'], ['28%', '28%'], ['35%', '35%'], ['42%', '42%'], ['49%', '49%'], ['56%', '56%'], ['63%', '63%'], ['70%', '70%']];

// Function defines whether child has its Handler function or inherits it
function HasOwnHandler(child)
{
 return child ? !(Object.getPrototypeOf(Object.getPrototypeOf(child)).Handler === child.Handler) : false; // or: return child ? !(child.__proto__.__proto__.Handler === child.Handler) : false;
}

// Function processes child response event. Nested event prop (event.event) is passed to the parent child handler
function ProcessChildEvent(child, event)
{
 if (!child || !event) return;															// Return for undefined child
 if (event.event && child.parentchild.Handler) child.parentchild.Handler(event.event);	// Pass nested event to the parent child handler

 switch (event.type)																	// Process event
		{
	 	 case 'KILLME':																		// Destroy child event
	      	  if (child === app) break;														// For non application childs only
	      	  child.parentchild.KillChild(child.id);										// Call parent child kill function with current child id
	      	  break;
	 	 case 'BRINGTOTOP':																	// Bring to top all childs bundle from current nested one until the root one (app)
	      	  if (child === app) app.ChangeActive(0);										// Make root child active, lower while cycle doesn't make it for app child
	      	  while (child.parentchild)														// Cycle until parent exists
		    	    {
		     		 child.parentchild.ChangeActive(child.id);								// Set current child state to actove 
		     		 child = child.parentchild;												// and go to parent one
		    	    }
	      	  break;
	 	 case 'NONE':																		// Empty event is used to stop propagation
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
function GetFirstRegisteredChild(element)
{
 while (element && element.attributes && element.attributes['data-child'] === undefined) element = element.parentNode;
 return element;
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
 const attr = element?.attributes?.['data-child']?.value;

 if (typeof attr === 'string') for (const id of attr.split('_'))	// Split element data-child attribute to the array of child ids separated by '_'
    {
     child = id ? child.childs[id] : app;							// Get a child link from id splited chain
     if (!child) break;												// Break for undefined child
    }

 return child;
}

// Check specified element modal child focus conflict
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

// Calculate child cursor position
// 0 - preventdefault
//1 - GetFirstRegisteredChild for mouse events and bring it to top
//2 - if child is captured check event process|release and break
//3 - Create chain with GetFirstRegisteredChild above for mouse events or upstream active childs chain
//4 - then check eventcapture or eventrelease in case of absent capture
//5- call child handler(event)
//{capture process - event capture, areacapture and element match (if not elementDOM), release process - eventrelease or arearelease (if true) match 
//  name1: {capturestart:, captureprocess:,capturerelease:, area: [x1,y1,x2,y2], outofarearelease: true|false, elements: [event.target list, elementDom if undefined], callbackfunction: <function>, callbackevent:, iconbackground: [state: ''], state: '' cursor:, child: <inited at child insert>},
//  name2: {...},
//}
function GetChildAreaMouseCursorPosition(child, event)
{
 if (!child) return;
 const rect = child.elementDOM.getBoundingClientRect();

 // 'x' area
 if (event.clientY - rect.y < CLOSEICONAREAHEIGHT && rect.x + rect.width - event.clientX < CLOSEICONAREAWIDTH)
    {
     if (!(child.props.flags & CMCLOSE) && !(child.props.flags & CMFULLSCREEN)) return;
     document.body.style.cursor = 'pointer';
     return  (child.props.flags & CMCLOSE) ? 'cmclose' : 'cmscreen';
    }

 // Left of 'x' area
 if (event.clientY - rect.y < CLOSEICONAREAHEIGHT && rect.x + rect.width - event.clientX < (CLOSEICONAREAWIDTH * 2))
    {
     if (!(child.props.flags & CMFULLSCREEN)) return;
     document.body.style.cursor = 'pointer';
     return 'cmscreen';
    }

 // Resizing area
 if (rect.x + rect.width - event.clientX < WIDTHOFAREAFORRESIZING && rect.y + rect.height - event.clientY < HEIGHTOFAREAFORRESIZING)
    {
     if (!child.resizingElement || child.props.screen) return;
     document.body.style.cursor = 'nw-resize';
     return 'cmresizing';
    }
}

function StyleActiveChild(child, status = true)
{
 child.StyleActiveChild(status);
}

// Function removes all non-sticky childs (except current one in the bundle, because of its mouse/keyboard interaction that shouldn't result removal) in the current layer
function RemoveAllNonStickyChilds(child, callparent = true, excludeid)
{
 for (const id of child.zindexes)
	 if (id && id !== excludeid)
	 if (child.childs[id].IsNonsticky())
	    {
		 child.KillChild(id);
	    }
	  else
	    {
		 if (child.props.flags & NODOWNLINKNONSTICKYCHILDS) RemoveAllNonStickyChilds(child.childs[id], false);
	    }
 if (callparent && child.parentchild) RemoveAllNonStickyChilds(child.parentchild, true, child.id);
}

// Function searches for the child of the specified DOM element
function GetTargetedChild(element)
{
 let child;
 const attr = element?.attributes?.['data-child']?.value;

 if (typeof attr === 'string') for (const id of attr.split('_'))	// Split element data-child attribute to the array of child ids separated by '_'
    {
     child = id ? child.childs[id] : app;							// Get a child link from id splited chain
     if (!child) break;												// Break for undefined child
    }

 return child;
}

// Funcction detects if mouse cursor in DOM element rectangle area (x1, y1, x2, y2). Negative coordinates indicates right/bottom edge margins
function MouseCursorMatchRectArea(cursorx, cursory, elementrect, matchrect)
{
 if (!matchrect) return;
 const absolutearea = { x1: elementrect.x + matchrect.x1 + (matchrect.x1 < 0 ? elementrect.width : 0),
					    y1: elementrect.y + matchrect.y1 + (matchrect.y1 < 0 ? elementrect.height : 0),
						x2: elementrect.x + matchrect.x2 + (matchrect.x2 < 0 ? elementrect.width : 0),
						y2: elementrect.y + matchrect.y2 + (matchrect.y2 < 0 ? elementrect.height : 0),
					  };
 if (absolutearea.x1 > absolutearea.x2) [absolutearea.x1, absolutearea.x2] = [absolutearea.x2, absolutearea.x1];
 if (absolutearea.y1 > absolutearea.y2) [absolutearea.y1, absolutearea.y2] = [absolutearea.y2, absolutearea.y1];
 if (cursorx >= absolutearea.x1 && cursorx <= absolutearea.x2 && cursory >= absolutearea.y1 && cursory <= absolutearea.y2) return true;
}

//
function ControlEventMatchUserEvent(control, userevent, phase)
{
 if (control[phase + 'event'] !== userevent.type) return;
 if (['keydown', 'keyup'].indexOf(userevent.type) === -1) return true;
 if (userevent.keyCode !== control.keycode) return;
 return control.modifier === userevent.ctrlKey * 8 + userevent.altKey * 4 + userevent.shiftKey * 2 + userevent.metaKey * 1;
}

class Interface
{
 dragableElements = [];
 pushableElements = [];
 dblclickableElements = [];

 destructor()
 {
 }

 constructor(...args) // (data, parentchild, props, attributes)
	    {
	     // Data
	     this.data = args[0];

	     // Parent child
	     this.parentchild = args[1];

	     // Props {tagName: 'DIV|BODY', flags: CMFULLSCREEN|CMCLOSE|CLOSEESC, screen: {full: <>}, overlay: 'ALWAYSONTOP|MODAL|NONSTICKY', effect: '', position: 'CASCADE|CENTER|RANDOM'}
	     this.props = (args[2] && typeof args[2] === 'object') ? args[2] : {};
	     if (!this.props.tagName) this.props.tagName = 'DIV';
	     this.elementDOM = this.parentchild ? document.createElement(this.props.tagName) : document.body;	// Set DOM element to document.body in case of no parent child defined
	     if (!this.props.flags) this.props.flags = 0;

	     // Attributes
	     this.attributes = (args[3] && typeof args[3] === 'object') ? args[3] : {};
	     this.attributes['data-child'] = '';																// Set default data child attribute, for non-root child (with no parent) this attribute will be changed after insertion
	     for (const name in this.attributes) this.elementDOM.setAttribute(name, this.attributes[name]);

	     // Other child settings
	     this.childs = {0: this};																			// list of child objects sorted by id
	     this.zindexes = [0];																				// list of child ids sorted by z-index
	     this.activeid = 0;																					// Active child id - 0 is current object used as a parent for its child, 1 - first child and etc..
	     this.maxchildid = 0;																				// Child max id ever been inserted

	     // Stop constructor for root child (app) that has no parent. Root element is always document.body.
	     if (!this.parentchild) return;

	     // Set scc filter for all childs with overlay 'MODAL' mode
	     if (this.props.overlay === 'MODAL') for (const i in this.parentchild.childs) if (+i) this.parentchild.childs[i].elementDOM.classList.add('modalfilter');

	     // Child display
	     this.cmtag = (this.props.flags & CMCLOSE) + (this.props.flags & CMFULLSCREEN);
	     this.RefreshCMIcon(this.elementDOM);
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

 AdjustElementDOMSize(width = DOMELEMENTMINWIDTH, height = DOMELEMENTMINHEIGHT)
 {
  const computed = window.getComputedStyle(this.elementDOM);
  if (parseInt(computed.getPropertyValue('width')) < DOMELEMENTMINWIDTH || parseInt(computed.getPropertyValue('height')) < DOMELEMENTMINHEIGHT) [this.elementDOM.style.width, this.elementDOM.style.height] = [width + 'px', height + 'px'];
 }

 FullScreenChildToggle()
 {
  if (this.props.flags & CMFULLSCREEN) // child cmtag (child window management tag) value: 1 (close), 2 (fullscreen), 3 (fullscreen&close), 4 (!fullscreen), 5 (!fullscreen&close)
     {
      this.elementCM.classList.remove('cmicon' + this.cmtag);
      this.cmtag += this.props.screen ? -2 : 2;
      this.elementCM.classList.add('cmicon' + this.cmtag);
     }
  this.elementDOM.classList.add('smooth');

  const style = this.elementDOM.style;
  if (this.props.screen) // Full screen initial state
     {
      [ style.top, style.left, style.width, style.height ] = [ this.props.screen.top, this.props.screen.left, this.props.screen.width, this.props.screen.height ];
      delete this.props.screen;
     }
  else
    {
     //const computed = window.getComputedStyle(this.elementDOM);
     //this.props.screen = { top: computed.getPropertyValue("top"), left: computed.getPropertyValue("left"), width: computed.getPropertyValue("width"), height: computed.getPropertyValue("height") };
     this.props.screen = { top: style.top, left: style.left, width: style.width, height: style.height };
     [ style.top, style.left, style.width, style.height] = this.parentchild === app ? ['0%', '0%', '100%', '100%'] : ['1%', '1%', '98%', '98%'];
    }
 }

 TransitionEnd()
 {
  this.elementDOM.classList.remove(this.props.effect + 'show', this.props.effect + 'hide', 'smooth');
  if (this.removeonhide) this.elementDOM.remove();
 }

 RefreshCMIcon(element) // Refresh child management icon for the specified element and set this element as a child-management-element (this.elementCM)
	{
	 if (this.cmtag && this.elementCM) this.elementCM.classList.remove('cmicon' + this.cmtag);
	 this.elementCM = element;
	 if (this.cmtag && this.elementCM) this.elementCM.classList.add('cmicon' + this.cmtag);
	}

 ChangeZIndex(relative, absolute)
	 {
	  if (absolute === undefined) this.zindex += relative; else this.zindex = absolute + relative;
	  this.elementDOM.style.zIndex = this.zindex + '';
	 }

 StyleActiveChild(status = true)
	    {
	     this.elementDOM.style.boxShadow = status ? ACTIVECHILDSHADOW : 'none';
	    }

 ToggleActiveStatus()
	    {
	     this.StyleActiveChild(false);
	     setTimeout(StyleActiveChild, 4 * REFRESHMININTERVAL, this);
	    }

 ChangeActive(id)
	     {
	      if (this.activeid === id) return;								// Active child is being activated again - return
	      if (this.activeid) StyleActiveChild(this.childs[this.activeid], false);			// If old active child is not me, remove the old active child shadow
	      if (!(this.activeid = id)) return;							// If new active child is me - return
	      StyleActiveChild(this.childs[id]);							// Make new active child shadowed
	      this.BringUpChild(id);										// and bring it up
	     }

 KillChild(id) // Kill specified via id child via z-indexes rebuild and child array element deletion with not forgetting to set 'removeonhide' flag to remove element from the DOM
	{
	 if (app.captured.child === this.childs[id] && (document.body.style.cursor = 'auto')) app.captured = {}; // Release capture in case of killing child match
	 clearTimeout(this.childs[id].buttontimeoutid);
	 this.childs[id].removeonhide = true;
	 this.childs[id].Hide();
	 this.zindexes.splice(this.childs[id].zindex, 1);
	 for (let zid = this.childs[id].zindex; zid < this.zindexes.length; zid++) this.childs[this.zindexes[zid]].ChangeZIndex(-1);
	 StyleActiveChild(this.childs[this.activeid = this.zindexes.at(-1)]);
	 this.childs[id].destructor();
	 delete this.childs[id];
	 if (this.childs[this.activeid].props.overlay !== 'MODAL') for (const i in this.childs) if (+i) this.childs[i].elementDOM.classList.remove('modalfilter');
	}

 Hide()
	{
	 if (EFFECTS.indexOf(this.props.effect) === -1)
	    {
	     this.removeonhide ? this.elementDOM.remove() : this.elementDOM.style.visibility = 'hidden'; // Remove element from the DOM or just hide it via visibility
	     return;
	    }
	 this.elementDOM.style.visibility = 'hidden';
	 this.elementDOM.classList.add(this.props.effect + 'hide');
	}

 Show()
	{
	 if (EFFECTS.indexOf(this.props.effect) === -1)
	    {
	     this.elementDOM.style.visibility = 'visible';
	     return;
	    }
	 this.elementDOM.classList.add(this.props.effect + 'hide');
	 setTimeout(() => { this.elementDOM.style.visibility = 'visible'; this.elementDOM.classList.add(this.props.effect + 'show'); }, REFRESHMININTERVAL);
	}

 BringUpChild(id)
    {
     while (true)
	   {
	    const current = this.childs[id];
	    const zid = current.zindex;
	    const upper = this.zindexes[zid + 1] ? this.childs[this.zindexes[zid + 1]] : null;
	    const lower = (zid > 1 && this.zindexes[zid - 1]) ? this.childs[this.zindexes[zid - 1]] : null;
	    if (this.IsOnTopFlag(current)) // Break if no upper child (the current is on top, so no need other process) or bring cuurent 'alwaysontop' child up via swapping with upper one
	       {
		if (!upper) break;
		this.SwapChilds(upper, current);
		continue;
	       }
	    if (upper && !this.IsOnTopFlag(upper)) // Then bring 'non-alwaysontop' child up via swapping with upper one and continue
	       {
		this.SwapChilds(upper, current);
		continue;
	       }
	    if (lower) // Bring cuurent child down
	       {
		if (!this.IsOnTopFlag(lower)) break;
		this.SwapChilds(current, lower);
		continue;
	       }
	    break;
	   }
    }

 IsOnTopFlag(child)
	{
	 if (child && (child.props.overlay === 'ALWAYSONTOP' || child.props.overlay === 'MODAL' || child.props.overlay === 'NONSTICKY')) return true;
	}

 IsModal()
	{
	 return this.props.overlay === 'MODAL';
	}

 IsNonsticky()
	{
	 return this.props.overlay === 'NONSTICKY';
	}

 IsPushable(target)
	{
	 for (const arr of this.pushableElements) // Child pushable elements is an array of arrays which 1st element is main element to be pushed (moved) and others - clickable elements under main one.
	 for (const eid in arr) if (eid && target === arr[eid]) return arr[0];
	}

 SwapChilds(upper, lower)
	{
	 if (!upper || !lower) return;
	 const zid = upper.zindex;
	 upper.ChangeZIndex(0, lower.zindex);
	 lower.ChangeZIndex(0, zid);
	 this.zindexes[upper.zindex] = upper.id;
	 this.zindexes[lower.zindex] = lower.id;
	}

 Handler(event)
    {
     const area = GetChildAreaMouseCursorPosition(this, event);
     switch (event.type)
	    {
	     case 'keyup':
		  switch (event.keyCode)
			 {
			  case 27: // ESC
			       if (this.props.flags & CLOSEESC) return { type: 'KILLME'};
			       break;
			 }
		  break;
	     case 'mousedown':
		  // Resizing child
		  if (event.which === 1 && area === 'cmresizing')
		     {
		      app.captured = { child: this, which: event.which, target: this.resizingElement, action: 'cmresizing', x: event.clientX, y: event.clientY, rect: this.resizingElement.getBoundingClientRect() };
		      this.ChangeActive(0);
		      return { type: 'BRINGTOTOP'};
		     }

		  // Child management - close btn
		  if (event.which === 1 && area === 'cmclose')
		     {
		      app.captured = { child: this, which: event.which, target: event.target, action: 'cmclose' };
		      this.ChangeActive(0);
		      return { type: 'BRINGTOTOP' };
		     }

		  // Child management - fullscreen toggle btn
		  if (event.which === 1 && area === 'cmscreen')
		     {
		      app.captured = { child: this, which: event.which, target: event.target, action: 'cmscreen' };
		      this.ChangeActive(0);
		      return { type: 'BRINGTOTOP' };
		     }

		  // Dragging child
		  if (this.dragableElements.indexOf(event.target) !== -1 && event.which === 1 && !this.props.screen)
		     {
		      app.captured = { child: this, which: event.which, target: event.target, action: 'cmdragging', offsetx: event.clientX - this.elementDOM.offsetLeft + ElementScrollX(this.elementDOM.parentNode), offsety: event.clientY - this.elementDOM.offsetTop + ElementScrollY(this.elementDOM.parentNode) };
		      this.ChangeActive(0);
		      return { type: 'BRINGTOTOP' };
		     }

		  // Pushing child DOM element
		  if (event.which === 1 && (app.captured.target = this.IsPushable(event.target)))
		     {
		      app.captured = { child: this, which: event.which, target: app.captured.target, action: 'cmpushing', pushed: true, left: app.captured.target.style.left, top: app.captured.target.style.top };
		      app.captured.target.classList.add('buttonpush');
		      this.ChangeActive(0);
		      return { type: 'BRINGTOTOP' };
		     }

		  // Any unhandled mouse button click makes the child active
		  if (true)
		     {
		      app.captured = { child: this, which: event.which, target: event.target };
		      this.ChangeActive(0);
		      return { type: 'BRINGTOTOP' };
		     }
	     case 'mouseup':
		  // Right mouse button release
		  if (event.which === 3) break;
		  // No child box regular actions? Break, otherwise return some events
		  if (['cmclose', 'cmscreen', 'cmdragging', 'cmresizing'].indexOf(app.captured.action) === -1) break;
		  if (area === 'cmclose') return { type: 'KILLME' };
		  if (area === 'cmscreen') this.FullScreenChildToggle();
		  return { type: '' };
	     case 'dblclick':
		  if (this.dblclickableElements.indexOf(event.target) === -1) break;
		  this.FullScreenChildToggle();
		  return { type: '' };
	    }
    }

 // initevent: any non undefined value calls <callbackfunction> 
 // captureevent: event the capture starts at. Since the capture is started - no other captures allowed, so any other childs mouse/keyboards events are ignored. The capture starts at this event, area match (if exists) and DOM elements array match
 // keycode: key code for keyboard <captureevent> and <releaseevent>
 // modifier: key flag to match together with mouse/keyboard <captureevent> for next keys: CTRL (0b1), ALT (0b10), SHIFT (0b100) and META (0b1000)
 // processevent: event the current capture handles via <callbackfunction> call
 // releaseevent: event the capture is released on. Since the capture is released - any other childs mouse/keyboards events become available. Capture is released at this event occur or <outofarearelease> true value (see below)
 // area: child element DOM relative rectangle coordinates x1,y1,x2,y2 the mouse cursor in to start the capture
 // outofarearelease: true value releases the cature in case of mouse coordinates out of defined area 
 // elements: array of DOM elements the capture starts at together with 'area' and 'capturestart'. For empty array child <elementDom> is used. Two-level nested array is allowed (for pushing elements with its childs DOM elements, for a example)
 // callbackfunction: for all defined capture stages <callbackfunction> call is perfomed - callbackfunction(event). For native control (fullscreen toggle, close, ecs btn..) predefined functions are used. String type prop generates appropriate event instead of call
 // data: current control specific data, used for callback inner behaviour and/or background icon (see below)
 // iconon|iconoff: url used as a background image with area coordinates, iconon/iconoff depends on <data> truthy/falsy vlaue and refreshed at capture/relese events automatically
 // cursor: document cursor style on <area> hover
 // child: child object inited at child insert. Property is defined automatically at child insert.
 // parentcontrol: control property name to retreive callback, state and icon props
 static NewHandler(event)
 {
  let child, childchain, rect;

  // First phase - preventDefault for all except keyboard and mouse 'click' (to keep native radio/checkbox elements working) events
  if (['keydown', 'keyup', 'click'].indexOf(event.type) === -1)	event.preventDefault();

  // Second phase is for mouse events - get event.target first restered DOM element child and bring the child to top for 'mousedown' event in case of no 'modal' focus. For recaptured focus by other modal child with current modal captured - release capture with no callback call
  if (['keydown', 'keyup'].indexOf(event.type) === -1 && (child = GetDOMElementChild(GetFirstRegisteredDOMElement(event.target))))
  if (['mousedown', 'click', 'dblclick'].indexOf(event.type) === -1 || !IsModalFocusMismatch(child, event.type === 'mousedown' ? true : false))
	 {
	  rect = child.elementDOM.getBoundingClientRect();
  	  if ('mousedown' === event.type) ProcessChildEvent(child, { type: 'BRINGTOTOP' });
	 }
   else
	 {
	  if (!app.control || app.control.child !== child) return;
	  document.body.style.cursor = 'auto';
	  delete app.control;
	  return;
	 }
	
  // Third phase - check for any captured control and if true - handle 'release' event first and in case of no match - 'process' event then. Make return at the end
  if (app.control)
	 {
	  if (ControlEventMatchUserEvent(app.control, event, 'release') || (app.control.outofarearelease && app.control.area && !MouseCursorMatchRectArea(event.clientX, event.clientY, rect, app.control.area)))
		 {
		  if (typeof app.control.callback === 'function') app.control.callback(event, 'release');
		  if (typeof app.control.callback === 'string' && app.control.child.props.control[app.control.callback] === 'function') app.control.child.props.control[app.control.callback](event, 'release');
		  document.body.style.cursor = 'auto';
		  delete app.control;
		  return;
		 }
	  if (app.control.processevent === event.type || (app.control.outofarearelease && app.control.area && MouseCursorMatchRectArea(event.clientX, event.clientY, rect, app.control.area)))
		 {
		  if (typeof app.control.callback === 'function') app.control.callback(event, 'release');
		  if (typeof app.control.callback === 'string' && app.control.child.props.control[app.control.callback] === 'function') app.control.child.props.control[app.control.callback](event, 'release');
		 }
	  return;
	 }
	 
  // Next phase - create child chain to pass incoming event
  if (['keydown', 'keyup'].indexOf(event.type) === -1)
	 {
	  childchain = child ? [child] : [];
	 }
   else
	 {
	  childchain = [child = app];														// Create array with the app as a 1st array element
	  while (child.activeid) childchain.unshift(child = child.childs[child.activeid]);	// Create downstrem active childs chain from app root child
	 }

  // Last phase - proccel all child chain to handle <captureevent>, <processevent> and <eventrelease> with calling <callbackfunction> for appropriate event match
  for (child of childchain)
  for (const prop in child.props.control)
	  {
	   const control = child.props.control[prop];
	   if (control.area && MouseCursorMatchRectArea(event.clientX, event.clientY, rect, app.control.area))
		  {
			//cursor;
		  }
	   if (control.captureevent === event.type && (!control.area || MouseCursorMatchRectArea(event.clientX, event.clientY, rect, app.control.area)) && (!control.elements || TargetMatchElements(event.target, control)))
		  {
		   app.control = control;
		   // set cursor if exist
		   // Callback
		  }
	  if (app.control.releaseevent === event.type || (app.control.outofarearelease && app.control.area && !MouseCursorMatchRectArea(event.clientX, event.clientY, rect, app.control.area)))
		 {
		  if (typeof app.control.callback === 'function') app.control.callback(event, 'release');
		  if (typeof app.control.callback === 'string' && app.control.child.props.control[app.control.callback] === 'function') app.control.child.props.control[app.control.callback](event, 'release');
		  document.body.style.cursor = 'auto';
		  return;
		 }
	   if (HasOwnHandler(child)) ProcessChildEvent(child, child.Handler(event)); // Then child specific in case of no child-management action
	  }
 }

static EventHandler(event)
	{
	 let target, child;
	 app.eventcounter ++;
	
	 switch (event.type)
		{
		 case 'keydown':
		 case 'keyup':
			  if (app.captured.child) break; // Disallow any key events while any child captured
			  child = [target = app]; // Create array with the app as a 1st array element and var 'target' linked to that 1st element (app)
			  while (target.activeid) child.push(target = target.childs[target.activeid]); // Create downstrem active childs chain from app root child
	
			  for (let id = child.length - 1; id >= 0; id--) // Dispatch key event to all childs in the chain from lowest acive to the root app and break in case of any child event
			  {
				   if ((target = child[id]?.Handler(event)) && !ProcessChildEvent(child[id], target)) break;
				   if (HasOwnHandler(child[id]) && (target = Object.getPrototypeOf(Object.getPrototypeOf(child[id])).Handler.call(child[id], event)) && !ProcessChildEvent(child[id], target)) break; 
				   // Handle keydown for childs with own handlers only, cause no keydown event default handle
			  }
			  break;
	
		 case 'mousedown': // event.which values: 0 - no mouse button pushed, 1 - left button, 2 - middle button, 3 - right (context) button
			  if (event.which !== 1 && event.which !== 3) return event.preventDefault(); // Break for non left/right mouse btn click
			  if (!(child = GetTargetedChild(target = GetFirstRegisteredChild(event.target)))) break; // Break in case of no targeted child
	
			  if (app.captured.child) // Simultaneous two mouse buttons click event occured (another mouse down event has been already registered on captured child)
				 {
				  if (app.captured.action) break; // Already registered event has some child-management action? Break
				  if (child !== app.captured.child) break; // Another mouse btn is down on other than captured child? Break
				  event = { type: 'mousedownuncap', target: event.target }; // Otherwise generate two-mouse-btns-click event
				 }
			   else
				 {
				  if (IsModalFocusMismatch(target, true)) return event.preventDefault(); // Does modal focus conflict exist? Break
				  RemoveAllNonStickyChilds(child); // Remove all childs with nonsticky overlay
				 }
	
			  ProcessChildEvent(child, Object.getPrototypeOf(Object.getPrototypeOf(child)).Handler.call(child, event)); // Process child-management behaviour first
			  if (!app.captured.action && HasOwnHandler(child)) ProcessChildEvent(child, child.Handler(event)); // Then child specific in case of no child-management action
			  break;
	
		 case 'mouseup':
			  event.preventDefault();
			  if (event.which !== 1 && event.which !== 3) return; // Break for non left/right mouse btn release
			  if (!app.captured.child) break; // No captured child? Break
			  if (!app.captured.child.elementDOM && (app.captured = {})) break; // Captured child element DOM doesn't exist? Break
	
			  // Any mouse btn is released on another child than captured one?
			  if ((child = GetTargetedChild(target = GetFirstRegisteredChild(event.target))) !== app.captured.child)
				 {
				  if (event.which === app.captured.which) app.captured = {}; // Mouse btn release event occurs on captured btn? Release captured object
				  break; // And then break anyway
				 }
	
			  // Mouse btn release event occurs on captured btn? If not - non captured btn is released while captured btn is stil down
			  if (event.which === app.captured.which)
				 {
				  if (app.captured.action === 'cmpushing' && app.captured.pushed) app.captured.target.classList.remove('buttonpush'); // Release captured-child pushed DOM element
				  if (IsModalFocusMismatch(child.elementDOM, true)) return event.preventDefault(); // Does modal focus conflict exist? Break
			  ProcessChildEvent(child, HasOwnHandler(child) ? Object.getPrototypeOf(Object.getPrototypeOf(child)).Handler.call(child, event) || child.Handler(event) : child.Handler(event)); // Process child-management behaviour first, then child specific in case of no child-management event
				  app.captured = {}; // Release captured object
				 }
			   else
				 {
				  if (app.captured.action) break; // Already registered event has some child-management action at another btn released? Break
				  if (IsModalFocusMismatch(child.elementDOM, true)) return event.preventDefault(); // Does modal focus conflict exist? Break
				  event = { type: 'mouseupuncap', target: event.target }; // Otherwise generate two-mouse-btns-release event
			  ProcessChildEvent(child, HasOwnHandler(child) ? Object.getPrototypeOf(Object.getPrototypeOf(child)).Handler.call(child, event) || child.Handler(event) : child.Handler(event)); // Process child-management behaviour first, then child specific in case of no child-management event
				 }
			  break;
	
		 case 'click':
		 case 'dblclick':
			  if (event.type === 'dblclick') event.preventDefault();	// No preventDefault for 'click' event to keep radio/checkbox elements working
			  if (app.captured.child) break; // Any child is captured (another btn double click)? Break
			  if (!(child = GetTargetedChild(target = GetFirstRegisteredChild(event.target)))) break; // Break in case of no targeted child
			  if (IsModalFocusMismatch(child.elementDOM)) break;
			  ProcessChildEvent(child, HasOwnHandler(child) ? Object.getPrototypeOf(Object.getPrototypeOf(child)).Handler.call(child, event) || child.Handler(event) : child.Handler(event)); // Process child-management behaviour first, then child specific in case of no child-management event
			  break;
	
		 case 'mousemove':
			  // Set default cursor first, then others if needed
			  document.body.style.cursor = 'auto';
	
			  // Modal child pops up at cursor moving on captured element? Break with returning pushed element released and free captured element
			  if (app.captured.child && IsModalFocusMismatch(app.captured.child.elementDOM))
				 {
				  if (app.captured.pushed) app.captured.target.classList.remove('buttonpush');
				  app.captured = {};
				  break;
				 }
	
			  // Process captured child action (default case - no capture/action)
			  switch (app.captured.action)
				 {
				  case 'cmresizing':
					   app.captured.target.style.width = (event.clientX - app.captured.x + app.captured.rect.width) + 'px';
					   app.captured.target.style.height = (event.clientY - app.captured.y + app.captured.rect.height) + 'px';
					   document.body.style.cursor = 'nw-resize';
					   break;
				  case 'cmdragging':
					//lg(app.captured.child.elementDOM.getBoundingClientRect(), window.scrollY);
					   app.captured.child.elementDOM.style.left = (event.clientX - app.captured.offsetx + ElementScrollX(app.captured.child.elementDOM.parentNode)) + 'px';
					   app.captured.child.elementDOM.style.top = (event.clientY - app.captured.offsety + ElementScrollY(app.captured.child.elementDOM.parentNode)) + 'px';
					   break;
				  case 'cmpushing':
					   if (app.captured.target === app.captured.child.IsPushable(event.target))
						  {
						   if (!app.captured.pushed && (app.captured.pushed = true)) app.captured.target.classList.add('buttonpush');
						  }
						else
						  {
						   if (app.captured.pushed && !(app.captured.pushed = false)) app.captured.target.classList.remove('buttonpush');
						  }
					   break;
				  default:
					   GetChildAreaMouseCursorPosition(child = GetTargetedChild(GetFirstRegisteredChild(event.target)), event);
				 }
			  break;
		}
	}
		
}
