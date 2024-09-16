// Todo0 - starting mouse capture on scrollbar with release on close btn - closes frame! That shouldn't be!!
// Todo1 - Some boxes may gravitate/stick to another one, example OV boxes may stick to sidebar box or to parent box edges
// Captured box is moving to out of range at the top/left parent child area. At releasing captured box - it should be at visible top/left area of parent with parent box changed to appropriate size

const DOMELEMENTMINWIDTH			= 50;
const DOMELEMENTMINHEIGHT			= 50;
const DOMELEMENTCASCADEPOSITIONS	= [['7%', '7%'], ['14%', '14%'], ['21%', '21%'], ['28%', '28%'], ['35%', '35%'], ['42%', '42%'], ['49%', '49%'], ['56%', '56%'], ['63%', '63%'], ['70%', '70%']];

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

// Check specified element modal child focus conflict
function IsModalFocusMismatch(element, blink)
{
 if (typeof element?.attributes?.['data-child']?.value !== 'string') return;
 let layer;
 const ids = element.attributes['data-child'].value.split('i');													// Split attr to get the whole child chain from app child (root child) to the child specified by element

 for (let id = 0; id < ids.length; id ++)																		// Checking upstream trace from the 'element' for any MODAL child focus mismatch
     {
      layer = id ? layer.childs[+ids[id]] : app; 																// Use app (root layer) for current layer, otherwise - previous layer child id is used as a layer
      if (!layer || !layer.zindexes.at(-1)) break;																// Break for undefined layer or parent child click (layer.zindexes.at(-1) === 0)
      if (!layer.childs[layer.zindexes.at(-1)].IsModal() || layer.zindexes.at(-1) === +ids[id + 1])	continue;	// The upper child is not modal or its id does match current layer child from the chain
	  if (blink) layer.childs[layer.zindexes.at(-1)].ToggleActiveStatus();										// Focus is restricted otherwise. Blink corresponded modal child if needed
	  return true;
     }
}

// Calculate child cursor position
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
function RemoveAllNonStickyChilds(child)
{
 let excludeid;
 while (child)
       {
		for (const id of child.zindexes) if (id && id !== excludeid && child.childs[id].IsNonsticky()) child.KillChild(id); // For non-zero ids (zero child id is a parent child of itself), for non-active and for non-sticky (context menu for a example)
		excludeid = child.id;																								// Fix current active child to exclude it
		child = child.parentchild;																							// Go to next upper layer of nested childs
       }
}
// Function searches for the child of the specified DOM element
function GetTargetedChild(element)
{
 let child;
 const attr = element?.attributes?.['data-child']?.value;

 // Split element data-child attribute to the array of child ids separated by 'i'
 if (typeof attr === 'string') for (let id of attr.split('i'))
    {
     child = id ? child.childs[id] : app;	// Get a child link from ids chain
     if (!child) break;
    }

 return child;
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
	     this.classid = '';																					// Class identificator

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
	     this.elementDOM.setAttribute('data-child', this.classid = this.parentchild.classid + 'i' + this.id);
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
}
