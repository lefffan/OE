function HasOwnHandler(child)
{
 //return child ? !(child.__proto__.__proto__.Handler === child.Handler) : false;
 return child ? !(Object.getPrototypeOf(Object.getPrototypeOf(child)).Handler === child.Handler) : false;
}

function ProcessChildEvent(child, event) // Process child response
{
 if (!child || !event) return;

 if (event.destination?.Handler) event.destination.Handler(event.subevent);

 switch (event.type) // { type: , source: , destination: , data: , }
	{
	 case 'KILLME':
	      if (child === app) break;
	      child.parentchild.KillChild(child.id);
	      break;
	 case 'BRINGTOTOP': // Bring to top all childs bundle from current nested one until the root one (app)
	      if (child === app) app.ChangeActive(0);
	      while (child.parentchild)
		    {
		     child.parentchild.ChangeActive(child.id);
		     child = child.parentchild;
		    }
	      break;
	 case 'NONE':
		  break;
	}
}

function Handler(event)
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
	          event = { type: 'mousedownuncap' }; // Otherwise generate two-mouse-btns-click event
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
	          event = { type: 'mouseupuncap' }; // Otherwise generate two-mouse-btns-release event
		  ProcessChildEvent(child, HasOwnHandler(child) ? Object.getPrototypeOf(Object.getPrototypeOf(child)).Handler.call(child, event) || child.Handler(event) : child.Handler(event)); // Process child-management behaviour first, then child specific in case of no child-management event
	         }
	      break;

	 case 'c lick':
	      if (IsModalFocusMismatch(GetFirstRegisteredChild(event.target))) event.preventDefault();
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

class App extends Interface
{
 captured = {};
 eventcounter = 0;
 static style = {
 				 "Appearance animation": { "dialog box": "slideleft", "expanded selection": "rise", "context menu": "rise", "new connection": "", "new view": "" },
 				 "_Appearance animation": "Select interface elements appearance animation", 
				 ".modalfilter": { "filter": "opacity(50%);", "_filter": "Dialog box modal effect appearance via css filter property, see appropriate css documentaion." },
				}

 constructor(...args)
	    {
	     super(...args);
	     document.addEventListener('keydown', Handler);
	     document.addEventListener('keyup', Handler);
	     document.addEventListener('mousedown', Handler);
	     document.addEventListener('dblclick', Handler);
	     document.addEventListener('mouseup', Handler);
	     document.addEventListener('mousemove', Handler);
	     document.addEventListener('click', Handler);
	     document.addEventListener('contextmenu', (event) => event.preventDefault());
	    }

 StyleActiveChild()
	    {
	    }

 Handler(event)
    {
     switch (event.type)
	    {
	     case 'mouseup':
		  if (event.which === 3) new ContextMenu([['New connection'], ['Help'], ['Test', 0]], this, event, this);
		  break;
	     case 'dblclick':
		  		break;
	     case 'New connection':
		  new Connection(null, this, {flags: CMCLOSE | CMFULLSCREEN, effect: 'slideright', position: 'CASCADE' }, {class: 'defaultbox', style: `background-color: ${nicecolors[7]}`});
		  break;
	    }
    }
}
