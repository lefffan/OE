const DOMELEMENTMINWIDTH	= 20;
const DOMELEMENTMINHEIGHT	= 20;

function ElementScrollX(element)
{
 if (element === document.body) return element.scrollLeft || document.documentElement.scrollLeft || window.pageXOffset; // Calculate pixels number the element is scrolled from the left
 return element.scrollLeft;
}

function ElementScrollY(element)
{
 if (element === document.body) return element.scrollTop || document.documentElement.scrollTop || window.pageYOffset; // Calculate pixels number the element is scrolled from the top
 return element.scrollTop;
}

function GetFirstRegisteredChild(element)
{
 while (element && element.attributes && element.attributes['data-child'] === undefined) element = element.parentNode; // Find 1st registered child DOM element (with 'data-child' attr set)
 return element;
}

function IsModalFocusMismatch(element, blink) // Check specified element modal child focus conflict
{
 if (typeof element?.attributes?.['data-child']?.value !== 'string') return;
 let layer;
 const ids = element.attributes['data-child'].value.split('i'); // Split attr to get the whole child chain from app child (root child) to the child specified by element

 // Checking upstream trace from the 'element' for any MODAL child focus mismatch
 for (let id = 0; id < ids.length; id ++)
     {
      layer = id ? layer.childs[+ids[id]] : app; // Use app (root layer) for current layer, otherwise - previous layer child id is used as a layer
      if (!layer || !layer.zindexes.at(-1)) break; // Break for undefined layer or parent child click (layer.zindexes.at(-1) === 0)
      if (layer.childs[layer.zindexes.at(-1)].IsModal() && layer.zindexes.at(-1) !== +ids[id + 1]) // The upper child is modal and its id doesn't match current layer child from the chain
	 {
	  if (blink) layer.childs[layer.zindexes.at(-1)].ToggleActiveStatus(); // Blink it if needed
	  return true;
	 }
     }
}

function GetChildAreaMouseCursorPosition(child, event) // Calculate child cursor position
{
 if (!child) return;
 const rect = child.elementDOM.getBoundingClientRect();

 // 'x' area
 if (event.clientY - rect.y < 12 && rect.x + rect.width - event.clientX < 12)
    {
     if (!(child.props.flags & CMCLOSE) && !(child.props.flags & CMFULLSCREEN)) return;
     document.body.style.cursor = 'pointer';
     return  (child.props.flags & CMCLOSE) ? 'cmclose' : 'cmscreen';
    }

 // Left of 'x' area
 if (event.clientY - rect.y < 12 && rect.x + rect.width - event.clientX < 24)
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

function MoveElement(element, offsetx, offsety, abs) // Function is deprecated
{
 if (abs)
    {
     element.style.left = offsetx;
     element.style.top = offsety;
    }
  else
    {
     element.style.left = (element.offsetLeft + offsetx) + 'px';
     element.style.top = (element.offsetTop + offsety) + 'px';
    }
}

function StyleActiveChild(child, status = true)
{
 child.StyleActiveChild(status);
}

function RemoveAllNonStickyChilds(child)
{
 let excludeid;
 while (child) // Remove all non-sticky childs (except current one in the bundle, because of its interaction [mouse/keyboard] shouldn't result removal) in the current layer
       {
	for (const id of child.zindexes) if (id && id !== excludeid && child.childs[id].IsNonsticky()) child.KillChild(id);
	excludeid = child.id;
	child = child.parentchild; // Go to next layer of nested childs
       }
}

function GetTargetedChild(element) // Search for the child of the specified element
{
 let child;
 const attr = element?.attributes?.['data-child']?.value;

 if (typeof attr === 'string')
 for (let id of attr.split('i')) // Split element data-child attribute to the array of child ids separated by 'i'
     {
      child = id ? child.childs[id] : app; // Get a child link from ids chain
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
	     if (args[0] === undefined) return;
	     this.data = args[0];

	     // Parent child
	     this.parentchild = args[1];

	     // Props {tagName: 'DIV|BODY', flags: CMFULLSCREEN|CMCLOSE|CLOSEESC, screen: {full: <>}, overlay: 'ALWAYSONTOP|MODAL|NONSTICKY', effect: '', cascade: true/false}
	     this.props = (args[2] && typeof args[2] === 'object') ? args[2] : {};
	     if (!this.props.tagName) this.props.tagName = 'DIV';
	     this.elementDOM = this.parentchild ? document.createElement(this.props.tagName) : document.body; // Set DOM element to document.body in case of no parent child defined
	     if (!this.props.flags) this.props.flags = 0;
	     if (this.props.cascade && !Array.isArray(this.props.cascade)) this.props.cascade = [['7%', '7%'], ['14%', '14%'], ['21%', '21%'], ['28%', '28%'], ['35%', '35%'], ['42%', '42%'], ['49%', '49%'], ['56%', '56%'], ['63%', '63%'], ['70%', '70%']];

	     // Attributes
	     this.attributes = (args[3] && typeof args[3] === 'object') ? args[3] : {};
	     this.attributes['data-child'] = ''; // Set default data child attribute, for non-root child (with no parent) this attribute will be changed after insertion
	     for (const name in this.attributes) this.elementDOM.setAttribute(name, this.attributes[name]);

	     // Other child settings
	     this.childs = {0: this};	// list of child objects sorted by id
	     this.zindexes = [0];	// list of child ids sorted by z-index
	     this.activeid = 0;		// Active child id - 0 is current object used as a parent for its child, 1 - first child and etc..
	     this.maxchildid = 0;	// Child max id ever been inserted
	     this.classid = '';		// Class identificator

	     // Stop constructor for root child (app) that has no parent. Root element is always document.body.
	     if (!this.parentchild) return;

	     // Filter all childs in case of this child overlay 'MODAL' mode
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
	     if (Array.isArray(this.props.cascade) && this.props.cascade.length) [this.elementDOM.style.left, this.elementDOM.style.top] = [this.props.cascade[(this.id - 1) % this.props.cascade.length][0], this.props.cascade[(this.id - 1) % this.props.cascade.length][1]];
	    }

 AdjustElementDOMSize(width = 100, height = 100)
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
	      this.BringUpChild(id);									// and bring it up
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
