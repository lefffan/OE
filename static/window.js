const HTMLINNERENCODEMAP		= [['&', '<', '>', '\n', ' ', '"'], ['&amp;', '&lt;', '&gt;', '<br>', '&nbsp;', '&quot;']];	// Encoding map array of two arrays with symmetric values to encode/decode each other
const TAGATTRIBUTEENCODEMAP		= [['<', '>', '\n', '"'], ['&lt;', '&gt;', '', '&quot;']];
const ELEMENTINNERALLOWEDTAGS	= ['span', 'pre', 'br'];

const EFFECTS					= ['hotnews', 'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall', 'rise'];
const EFFECTSHINT				= "effect appearance. Possible values:<br>'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall' and 'rise'.<br>All other values makes no effect.";

const CMCLOSE					= 0b1;
const CMFULLSCREEN				= 0b10;
const CLOSEESC					= 0b100;

const REFRESHMININTERVAL		= 50;
const ELEMENTPUSHOFFSET			= 3;
const ACTIVECHILDSHADOW			= '4px 4px 5px #111';

const WIDTHOFAREAFORRESIZING	= 13;
const HEIGHTOFAREAFORRESIZING	= 13;
const CLOSEICONAREAWIDTH		= 32;
const CLOSEICONAREAHEIGHT		= 32;

const nicecolors				= [ 'RGB(243,131,96);', 'RGB(247,166,138);', 'RGB(87,156,210);', 'RGB(50,124,86);', 'RGB(136,74,87);', 'RGB(116,63,73);', 'RGB(174,213,129);', 'RGB(150,197,185);' ];

function lg(...data)
{
 console.log(...data);
}

function dir(...data)
{
 data.forEach(value => console.dir(value));
}

// Function creates regexp to match tag names list 'tags'
function HTMLTagsRegexp(tags)
{
 let regexp = '';
 if (Array.isArray(tags)) for (const tag of tags) regexp += `<${tag} .*?>|<${tag} *>|<\/${tag} *>|`;
 return new RegExp(regexp.substring(0, regexp.length - 1), 'g');
}

// Function encodes strong 
function AdjustString(string, encodemap, excludehtmltags, trim)
{
 if (typeof string !== 'string' || !string || !Array.isArray(encodemap) || !Array.isArray(encodemap[0]) || !Array.isArray(encodemap[1])) return '';
 if (trim) string = string.trim();

 let result, newstring = '';
 if (Array.isArray(excludehtmltags)) while (result = HTMLTagsRegexp(excludehtmltags).exec(string))
    {
     newstring += EncodeString(string.substr(0, result.index), encodemap) + result[0];  // Convert special chars till the result.index and concatenate with the matched <tag> of itself
     string = string.substr(result.index + result[0].length);                           // Generate string after allowed <tag> for the next search
    }

 return newstring + EncodeString(string, encodemap);
}

function EncodeString(string, encodemap)
{
 if (typeof string !== 'string' || !string || !Array.isArray(encodemap) || !Array.isArray(encodemap[0]) || !Array.isArray(encodemap[1])) return '';

 for (let i = 0; i < encodemap[0].length; i ++)
     string = string.replace(new RegExp(encodemap[0][i], 'g'), encodemap[1][i]);

 return string;
}

function MessageBox(parentchild, message, title)
{
 if (typeof message !== 'string') return;
 const MESSAGEMINCHARS = 60;
 message = message.padEnd(MESSAGEMINCHARS);
 if (typeof title !== 'string') title = 'Warning';
 const dialogdata = {	title: { type: 'title', data: title },
 						message: { type: 'text', head: message },
						ok: { type: 'button', data: '  OK  ', head: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;` }
					};
 new DialogBox(dialogdata, parentchild, {flags: CMCLOSE | CLOSEESC, effect: 'rise', position: 'CENTER', overlay: 'MODAL'}, {class: 'dialogbox selectnone'});
}

// Function searches 'string' in 'source' and return the source with excluded string or added string otherwise
function ToggleString (source, string)
{
 if (typeof source !== 'string' || typeof string !== 'string') return '';
 return source.indexOf(string) === -1 ? source + string : source.replaceAll(string, '');
}

function SearchProp(object, prop)
{
 if (typeof object === 'object')
    for (const i in object) if (i === prop) return i;
}

function SearchPropValue(object, value)
{
 if (typeof object === 'object')
    for (const i in object) if (object[i] === value) return i;
}

function GetStyleInnerHTML(...objects) //https://dev.to/karataev/set-css-styles-with-javascript-3nl5, https://professorweb.ru/my/javascript/js_theory/level2/2_4.php
{
 let inner = '';

 for (const object of objects)
 for (const selector in object)
     {
      if (selector[0] === ' ') continue; // CSS selectors with leading space are ignored
      inner += `${selector} {`;
      // Empty selector prop values are ignored. Props with leading space are ignored too, but its values are used as a hints for corresponded props
      // in UI dialog configuration. Also leading space props with no 'pair' are used for non-CSS configurable parameters in GUI dialog settings.
      for (const prop in object[selector])
          if (prop[0] !== ' ' && object[selector][prop]) inner += `${prop}: ${object[selector][prop]}`;
      inner += '}';
     }

 return inner;
}

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
		           //window.requestAnimationFrame(() => { app.captured.child.elementDOM.style.width = (event.clientX - app.captured.x + app.captured.width) + 'px'; app.captured.child.elementDOM.style.height = (event.clientY - app.captured.y + app.captured.height) + 'px'; });
		           app.captured.target.style.width = (event.clientX - app.captured.x + app.captured.rect.width) + 'px';
		           app.captured.target.style.height = (event.clientY - app.captured.y + app.captured.rect.height) + 'px';
		           document.body.style.cursor = 'nw-resize';
		           break;
		      case 'cmdragging':
		           //window.requestAnimationFrame(() => { app.captured.child.elementDOM.style.left = (event.clientX - app.captured.offsetx + ElementScrollX(app.captured.child.elementDOM.parentNode)) + 'px'; app.captured.child.elementDOM.style.top = (event.clientY - app.captured.offsety + ElementScrollY(app.captured.child.elementDOM.parentNode)) + 'px'; });
		           app.captured.child.elementDOM.style.left = (event.clientX - app.captured.offsetx + ElementScrollX(app.captured.child.elementDOM.parentNode)) + 'px'; app.captured.child.elementDOM.style.top = (event.clientY - app.captured.offsety + ElementScrollY(app.captured.child.elementDOM.parentNode)) + 'px';
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
