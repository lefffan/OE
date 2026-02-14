// Dialog data consists of some GUI elements with next format:
// { type: select, data: 
//  					option1: { element1: {}, element2: {type: data:  }, element3: {}, }
//  					option2: {..}
// }
// Dialog data consists of profiles and its options. Profiles consist of options only. Options consist of profiles and interface elements
// Root profile selection is an usual pad bar, non root - dropdown list option selection
// Single option profile selection is hidden until the profile head/hint)is set. Multiple options - selection list is always displayed.
// Each interface element is an object with some props:
// non mandatory 'head'|'hint'|'data'|'expr'
// andmandatory 'type': 'title|select|multiple|checkbox|radio|textarea|text|password|table|button'
// 'flag' is mandatory too, but created empty if absent.
// Option flags: checked, clonable, removable, cloned, style
// For all interface element types property 'style' is a css style attribute value applied to the dialog interface element DOM element
// For all types except 'button' - at least one prop (head, data or flag) should be defined.
// For all types except 'title'/'button' - in case of incorrect/undefined data, interface element is frozen and its purpose is to display head/divider only
// 										   For all these types: 'head' - interface element header inner html with optional divider '/' with text after set as a hint
// interface element type 'title': 'data' is a dialog title inner html. This prop of any path first appearance sets the title as a default one.
// 								First title element appeared acts as a default one, default title is used in case of no any other title in active profile bundle. Undefined title element 'data' sets it invisible
// text types 'textarea', 'text', 'password': 'data' is an interface element text content,
// 											  'flag - divider(*), readonly(!), placeholder attribute (+),
// 										      'expr' is a combination of strings like `/regexp/prop_name` via logical operators `&& || ! ( )` to manage element readonly status. 'expr' true value - the element becomes readonly and vice versa. Undefined/incorrect 'expr' has negative value. Strings <regexp> and <prop_name> cannot include slash char '/' cause it's used divider between regexp and property name the data to be tested on. String <prop_name> is optional, so absent one forces the regexp test to be done on its own element data. To force element to be always readonly use /^/ as an expr, for a example.
// selectable types 'select', 'multiple', 'checkbox', 'radio': 'data' is an interface element content of selectable options divided by '/'. Options with char '!' before are considered as a selected/checked one,
//															   'flag' - divider(*), sort order(a-), readonly(!),
// 															   'expr' - see text type description
// table type 'type': 'data' is an interface element 2d dimension object content with properties as a table rows. Each row property is a table cells property list. Each cell property, in turn, is a cell <td> tag inner html.
// 					  Cell props started with '_' are appliable and generate conroller call with a property name as a dialog event.
//				      'flag' - divider(*), readonly(!)
// button type 'button': 'head' - warning message to confirm controller call. Or just info message in case of non appliable button,
//			  			 'data' - button inner html, undefined/incorrect data - button is invalid, while empty data string sets button invisibe and usually used with auto apply feature (see below), as an example - disappearing info messages
//			  			 'flag' - appliable char (a) makes a controller call action on a button click with a property name as a dialog event initiated the call. No appliable flag set - the button click makes no action
//			  			 		  interactive char (*) means no hide dialog after button apply, for appliable buttons only - no controller call action made with interactive flag makes no sense cause no dialog kill even made.
//   							  timer in seconds the button will be applied on automatically. Number of chars '+' is number of timer minutes, chars '-' - seconds. In any order. For a example timer string '+-+' equals 121 seconds.
//										Once the auto-apply button appeares in the profile bundle the auto-apply feature is turned on and does exist regardless of button current profile appearance.
//								  grey style readonly button (!)
// 						 'expr' - See text type description. In case of true expr expression the button becomes grey.

// Todo2 - Элементы с diaplay flex "наезжают" на margin нижестоящего элемента div
// Todo2 - Multuiple flag * creates rounded area arount GUI element. 
// Todo0 - don't forget to pause button apply here to prevent user flood pushing apply btns. This functionality remove to queue manager to protect controller call flood
// Todo0 - Use adjusted dialog data (without service props like id, padarea, options..) at interactive (or for non interactive too?) mode just the pure dialog data to be passed to the controller
// Todo0 - table btn push should call the controller/callback with element 'table' data?

import { app } from './application.js';
import { Application } from './application.js';
import { Interface } from './interface.js';
import { DropDownList } from './dropdownlist.js';
import * as globals from './globals.js';

const EMPTYOPTIONTEXT					= ' ';
const DIALOGSELECTABLEELEMENTMAXOPTIONS	= 10240;
const BUTTONTIMERMAXSECONDS				= 60 * 60 * 24 * 7; // One week
const ELEMENTUSERPROPS					= { type: undefined, flag: '', head: undefined, data: undefined, style: undefined, expr: undefined };
const ELEMENTSELECTABLETYPES			= ['select', 'multiple', 'checkbox', 'radio'];
const ELEMENTTEXTTYPES					= ['textarea', 'text', 'password'];
const ELEMENTALLTYPES					= ['title', ...ELEMENTSELECTABLETYPES, ...ELEMENTTEXTTYPES, 'table', 'button'];
const OPTIONISCHECKED					= '!';
const OPTIONISCLONED					= '*';
const OPTIONISCLONABLE					= '+';
const OPTIONISREMOVABLE					= '-';
const OPTIONSDIVIDER					= '/';
const FIELDSDIVIDER						= '~';
const EXPRPROPDISALLOWEDCHARSREGEXP		= /[^&|( )!]/;
const EXPRISREGEXP						= /\/.*?[^\\]\//g;
const CHECKSYNTAX						= 0b10000; 
const SETSERVICEDATA					= 0b01000; 
const SHOWDIALOGDATA					= 0b00100; 
const RESTOREINITIALORDER				= 0b00010; 
const CLEARELEMENTFROMUNNECESSARYPROPS	= 0b00001; 

// Function sets flag <name> to <value> of element <e>. Or return element <e> current flag value in case of undefined <value> arg. For 'readonly' flag non-undefined <value> arg just set readonly status of html interface element of <e>
function SetFlag(e, name, value)
{
 let flag, placeholder = e.flag.indexOf('+');
 if ((ELEMENTTEXTTYPES.includes(e.type) || e.type === 'select') && placeholder !== -1)
	{
	 flag = e.flag.substring(0, placeholder);
	 placeholder = Application.AdjustString(e.flag.substring(placeholder), Application.TAGATTRIBUTEENCODEMAP);
	}
  else
	{
	 flag = e.flag;
	 placeholder = '';
	}

 switch (name)
		{
		 case 'readonly':
  			  let readonly, target;
  			  try   { 
		 			 readonly = eval(e.test); // Evaluate (test) element modified expression
					}
  			  catch { 
		 			 app.lg('Evaluation exception detected on element:', e.test);
		 			 delete e.expr;
		 			 delete e.test;
		 			 for (const element of this.elements) element.affect.delete(e.id);	// In case of error expression e.test - remove this element (<e>) id from all elements 'affect' property, so these elements can't affect to <e> readonly status due to incorrect e.test
					 value = true;														// Set value to true to refresh html element readonly status
		 			}
  			  if (value === undefined) return readonly ? true : false;					// For undefined value (no flag set) return readonly flag value (readonly variable) only
	   		  switch (e.type)															// Defined target (DOM element) for every element type and do some specific DOM element actions (readonly/disabled attributes for input elements and 'push' control element set for buttons)
			  		 {
			   		  case 'text':
			   		  case 'textarea':
			   		  case 'password':
						   if (!this.Nodes.textinputs[e.id]) return;
						   target = this.Nodes.textinputs[e.id];
						   readonly ? target.setAttribute('readonly', '') : target.removeAttribute('readonly', '');
						   break;
			   		  case 'select':
			   		  case 'multiple':
			   		  case 'radio':
			   		  case 'checkbox':
						   if (!this.Nodes.selects[e.id]) return;
						   target = this.Nodes.selects[e.id];
						   if (!['radio', 'checkbox'].includes(e.type)) break;
						   for (const inputtarget of [...target.querySelectorAll('input')]) readonly ? inputtarget.setAttribute('disabled', '') : inputtarget.removeAttribute('disabled', '');
						   break;
			   		  case 'table':
						   if (!this.Nodes.tables[e.id]) return;
						   target = this.Nodes.tables[e.id];
						   break;
			   		  case 'button':
						   if (!this.Nodes.buttons[e.id]) return;
						   target = this.Nodes.buttons[e.id];
						   if (!readonly) this.props.control.push.elements.push([target].concat([...target.querySelectorAll(Application.ELEMENTINNERALLOWEDTAGS.join(', '))])); // Set btn element (with all childs in) pushable for no readonly button
						    else for (const i in this.props.control.push.elements) if (this.props.control.push.elements[i][0] === target && delete this.props.control.push.elements[i]) break; // The button is readonly, so delete button pushable feature via removing btn DOM element from 'push' control.elements array
						   break;
			   		 }
	   		  readonly ? target.classList.add('readonlyfilter') : target.classList.remove('readonlyfilter'); // Add/remove readonly class (filter, cursor)
			  return;
		 case 'underline':
			  if (value === undefined) return flag.includes('*');
			  e.flag = value ? flag + '*' : flag.replaceAll('*', '');
			  e.flag += placeholder;
			  return;
		 case 'placeholder':
			  if (placeholder) return placeholder.substring(1);
			  return e.type === 'select' ? 'Enter new profile name' : '';
		 case 'sort':
			  if (value === undefined) return `${flag.includes('a') ? 'alphabetical' : ''}${flag.includes('-') ? 'descending' : ''}`;
			  if (!flag.includes('-')) e.flag = flag + '-';
			   else e.flag = flag.includes('a') ? flag.replaceAll(/a|\-/g, '') : (flag + 'a').replaceAll('-', '');
			  e.flag += placeholder;
			  return;
		 case 'interactive':
			  return flag.includes('*') && e.type === 'button';
		 case 'appliable':
			  return flag.includes('a') && e.type === 'button';
		 case 'autoapply':
			  return (flag.split('+').length - 1) * 60 + flag.split('-').length - 1;
		}
}
 
// Function builds array by splitting (divided via '/') input arg data string to separate options and returns eponymous array. Element type 'type' defines checked options number: 'select' (single checked option only), 'radio' (none or single)
function CreateSelectableElementOptions(e)
{
 // First step - init vars, for 'string'/'object' types only
 if (e.data === null || !['string', 'object'].includes(typeof e.data)) return e.options = [];	// Element with non string data is considered as element with one header/hint only. With empty data ('') - as element with one empty option. With single divider data='/' - as element with two empty option.
 if (typeof e.data ==='object' && e.type !== 'select') return e.options = [];					// Profile selection (data prop is 'object' type) is for 'select' type only
 const list = typeof e.data === 'string' ? e.data.split(OPTIONSDIVIDER) : e.data;
 const names = new Set();
 let name, flag, style;
 e.options = [];																	// Array of selectable options. Each array element, in turn - is an option object with origin profile name, checked status, order id (to keep default appearance), clonable/removable flag, etc..
 // Second step - push parsed options to the result array
 // Option structure: <name~flags~style>, where flags are: checked, clonable, removable, cloned
 for (let origin in list)
     {
	  origin = Array.isArray(list) ? list[origin] : origin;				// Get full option name with flags and style joined via divider
	  [name, flag, ...style] = origin.split(FIELDSDIVIDER);			// Split it to get option name without flags, flag and style
	  if (typeof e.data === 'object')
		 {
		  if (names.has(name)) delete e.data[origin];		// Option name (profile) without flags has already exist in e.data profile list? Delete it and continue
		  if (names.has(name)) continue;
	  	  names.add(name);
	  	 }
	  const option = { id: e.options.length + '',					// Push option object with all its values and flags
					   origin: origin,
					   name: name,
					   inner: Application.AdjustString(name ? name : EMPTYOPTIONTEXT, Application.HTMLINNERENCODEMAP),
					   checked: (flag || '').includes(OPTIONISCHECKED),
					   clonable: (flag || '').includes(OPTIONISCLONABLE) && typeof e.data === 'object',
					   removable: (flag || '').includes(OPTIONISREMOVABLE) && typeof e.data === 'object',
					   cloned: (flag || '').includes(OPTIONISCLONED) && typeof e.data === 'object',
					   style: style.length ? style.join(FIELDSDIVIDER) : '',
					   styleattribute: style.length ? ` style="${style.join(FIELDSDIVIDER)}"` : `` };
	  if (e.options.push(option) > DIALOGSELECTABLEELEMENTMAXOPTIONS) return;	// Options number exceeds max allowed? Return faulsy result to delete element as an error one
     }
 return true;
}

// Function creates and returns selectable element data from option list 'options'
function CreateSelectableElementData(e)
{
 if (typeof e.data === 'string') e.data = '';
 for (const i in e.options)
	 {
	  const option = e.options[i];
	  const origin = `${option.name}` + 						// Retreive option with all flags from options array
	  				 `${option.checked || option.clonable || option.removable || option.cloned || option.style ? FIELDSDIVIDER : '' }` + 
	  				 `${option.checked ? OPTIONISCHECKED : '' }` + 
	  				 `${option.clonable ? OPTIONISCLONABLE : '' }` + 
	  				 `${option.removable ? OPTIONISREMOVABLE : '' }` + 
	  				 `${option.cloned ? OPTIONISCLONED : '' }` + 
	  				 `${option.style ? FIELDSDIVIDER + option.style : '' }`;
      if (typeof e.data === 'object')
		 {
	  	  if (origin === option.origin) continue;				// Should option origin be changed in order to changed checked status? Continue if no
	  	  e.data[origin] = e.data[option.origin];				// Otherwise change e.data profile name due to changed flags
	  	  delete e.data[option.origin];
	  	  option.origin = origin;
		  continue;
		 }
	  e.data += i === '0' ? origin : OPTIONSDIVIDER + origin; 	// Collect data (/name~flags~style/) for each option for usual selectable element with e.data string type
	 } 
 return e;
}

// Correct checked (selected) options number for 'select' element type (1 option) and 'radio' (0 or 1 option):
// 'select' element type - should have at least one option selected, 1st option is forced otherwise
// 'radio' - may have no options selected.
// Both types should have no more than one selected option, last selected is used otherwise. Other selectable types 'checkbox' and 'multiple' may have any number of selected options, so unnecessary to correct
function CorrectCheckedOptions(e)
{
 if (!['select', 'radio'].includes(e.type)) return;
 let checkedcount = 0;
 for (let i = e.options.length - 1; i >= 0; i--)												// Go through all options begining with last one
	 {
   	  if (e.options[i].checked) checkedcount++;													// Fix checked options number
	  if (e.options[i].checked && checkedcount > 1) e.options[i].checked = false;					// Any option already checked? uncheck it
	 }
 if (!checkedcount && e.type === 'select' && e.options.length) e.options[0].checked = true;							// First option is forced checked for no any option checked (for 'select' type element only)
 if ((!checkedcount && e.type === 'select') || checkedcount > 1) CreateSelectableElementData(e);// Element checked options number is changed? Correct element data then
}

// Functions sorts options array based on flag sorting chars
function SortSelectableElementData(e)
{
 if (typeof e.flag !== 'string') flag = '';
 const order = SetFlag(e, 'sort').includes('descending') ? -1 : 1;	// Get sorting ascending/descending order

 if (SetFlag(e, 'sort').includes('alphabetical'))
 	e.options.sort((a, b) => (order * a.name.localeCompare(b.name)));	// Alphabetical sorting
  else 
 	e.options.sort((a, b) => (order * ((+a.id) - (+b.id))));			// Default appearance sorting
}

// Functions searches option in options array for the specfified <search> arg (type 'number' converted to string, 'string' is treated as an option id to search, shift for type 'boolean' with true=1 and false=-1 is used, and first checked option found for other types)
// Corresponded option is returned at the end
export function GetElementOption(e, search, loop)
{
 for (let i in e.options)
	 {
	  const option = e.options[i];
	  switch (typeof search)
			 {
			  case 'string':
			  case 'number':
				   if (option.id === search + '') return option;					// Return matched id option
				   break;
			  case 'boolean':
				   if (!option.checked) break;										// Break for non active option
				   i = +i + (search ? 1 : -1);										// or set iterator to a number with adding a shift value (true=1 and false=-1)
				   if (i >= e.options.length) i = loop ? 0 : e.options.length - 1;	// Loop iterator to zero 
				   if (i < 0) i = loop ? e.options.length - 1 : 0;					// or to last index
				   return e.options[i];												// Return shifted checked option
			  default:
				   if (option.checked) return option;								// Return current active option for other types of <search> arg
			 }
	 }
}

// Functions checks option in options array for the specfified <search> arg (see GetElementOption above) and unchecks previous checked option if exist. For 'multiple' selected options elements - searched option is toggled only
// True toggle converts <serch> option checked status and return
function SetElementOption(e, search)
{
 const searchoption = GetElementOption(e, search);	// Search for input arg <search> option
 if (!searchoption) return;							// No option found to set it checked? Return falsy result
 if (['multiple', 'checkbox'].includes(e.type)) return (searchoption.checked = !searchoption.checked) || true;	// For successful search toggle found option and return true for changes have been made. Otherwise (unsuccessful search) return false. For multiple option selection element types only
 
 const activeoption = GetElementOption(e);			// Get current active option 
 if (activeoption === searchoption) return;			// No changes made ('old' and 'new' options are the same)? Return falsy result
 if (activeoption) activeoption.checked = false;	// Set old active option checked status for false
 return searchoption.checked = true;				// and new searched option for true returning it
}

// Calculate estimated time in seconds and convert it to the string
function GetTimerString(e, autoapplybutton)
{
 if (!autoapplybutton) return '';
 let timer = autoapplybutton.timer - new Date().getTime() + autoapplybutton.timerstart;	// Calculate timer via initial timer minus past time from e.timerstart

 timer = timer < 0 ? 0 : Math.round(timer/1000);			// Round timer (converted ms to seconds) to the nearest positive integer.

 let hour = '' + Math.trunc(timer/3600) + ':';				// Get integral part of the hours number plus ':' char.
 if (hour.length === 2) hour = '0' + hour;					// One digit hour string - add '0' before.

 let min = '' + Math.trunc((timer%3600)/60) + ':';			// Get integral part of the minutes number plus ':' char.
 if (min.length === 2) min = '0' + min;						// One digit minute string - add '0' before.

 let sec = '' + Math.trunc((timer%3600)%60);				// Get integral part of the seconds number plus ':' char.
 if (sec.length === 1) sec = '0' + sec;						// One digit second string - add '0' before.

 return `(${hour}${min}${sec})`;
}

// Get interface element id with its wrapped html element from 'target' DOM element via 'data-element' attribute
function GetEventTargetInterfaceElement(target)
{
 let attribute;
 while (true)																		// Search for 'data-element' attribute until its true
	   {
		if (!target) break;															// Undefined target? Break it right now
		attribute = target.attributes?.['data-element']?.value;						// Retrieve 'data-element' attribute
		if (attribute) break;														// Retrieved attribute is valid? Break it
		target = target.parentNode;													// Go uplink node
	   }
 return attribute ? [attribute.substr(attribute.indexOf('_') + 1), target] : [];	// Return result array with interface element id (string after char '_') and element target (wrapped DOM element)
}

// Check element syntax
function CheckElementSyntax(e)
{
 if (!e || typeof e !== 'object' || !ELEMENTALLTYPES.includes(e.type)) return; // Return falsy value for incorrect element

 for (const prop in ELEMENTUSERPROPS) // Go through all props to check their values
	 {
	  if (prop === 'data' && ['select', 'table'].includes(e.type) && e.data && typeof e.data === 'object' && Object.keys(e.data).length) continue; // Skip 'object' type 'data' prop falling back to default, for select/table elements only
	  if (typeof e[prop] !== 'string') ELEMENTUSERPROPS[prop] === undefined ? delete e[prop] : e[prop] = ELEMENTUSERPROPS[prop]; // Fallback to the default value `ELEMENTUSERPROPS[prop]` in case of non string type
	 }

 for (const prop in e) if (!(prop in ELEMENTUSERPROPS)) delete e[prop]; // Clear element from unnecessary props
 
 if (e.type === 'button') return typeof e.data === 'string' || SetFlag(e, 'autoapply'); // Return true for visible button or autoapply
 if (e.type === 'title') return true; // Return true for any title. Titles with undefined data are invisible and last appearance in active profile bundle sets dialog title invisible
 return e.head || typeof e.data !== undefined || SetFlag(e, 'underline'); // Content element is correct for at least one defined header/data/footer property
}

export class DialogBox extends Interface
{
 // Init dialog specific data with overriding 'data-element' attribute for dialog box DOM element to non-existent interface element id (-1) for the search to be terminated on. Call then parent constructor for the given args (data, parentchild, props)
 constructor(...args)
 {
  // data
  if (typeof args[0] === 'string') args[0] = { message: { type: 'text', head: args[0].padEnd(60) } }; // Convrert string type data to object type
  if (!args[0] || typeof args[0] !== 'object') return; // Return for unknown dialog data
  // title
  if (typeof args[3] === 'string') args[0].title = { type: 'title', data: args[3] };
  if (args[3] && typeof args[3] === 'object') args[0].title = args[3];
  // ok
  if (typeof args[4] === 'string') args[0].ok = { type: 'button', data: args[4], flag: 'a' };
  if (args[4] && typeof args[4] === 'object') args[0].ok = args[4];
  // cancel
  if (typeof args[5] === 'string') args[0].cancel = { type: 'button', data: args[5], flag: '' };
  if (args[5] && typeof args[5] === 'object') args[0].cancel = args[5];
  // apply
  if (typeof args[6] === 'string') args[0].apply = { type: 'button', data: args[6], flag: 'a*' };
  if (args[6] && typeof args[6] === 'object') args[0].apply = args[6];

  if (!args[2]) args[2] = {}; // Props
  if (!args[2].control) args[2].control = { closeicon: {}, fullscreenicon: {}, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, push: {}, default: {}, closeesc: {} };
  if (!args[2].attributes) args[2].attributes = {};
  args[2]['attributes']['data-element'] = '_-1';

  super(...args);
  this.RefreshDialog(CHECKSYNTAX | SETSERVICEDATA | SHOWDIALOGDATA);
 }

 // Get interface element header+hint inner html for non title/button/padbar element types only
 GetElementHeaderHTML(e)
 {
  if (e.type === 'title' || e.type === 'button' || !e.head || e.padbar) return ''; // No header for title, button, empty head string and padbar

  let head, hint;
  [head, ...hint] = e.head.split(FIELDSDIVIDER);
  head = Application.AdjustString(head, Application.HTMLINNERENCODEMAP, Application.ELEMENTINNERALLOWEDTAGS);
  if (hint.length) head += `&nbsp<span title="${Application.AdjustString(hint.join(FIELDSDIVIDER), Application.TAGATTRIBUTEENCODEMAP)}" class="hint-icon">?</span>&nbsp;`;
  return head ? `<div class="element-headers">${head}</div>` : '';
 }

 // Get interface element divider line inner html for non title/button/padbar element types only. Depends on element flag '*' presence
 GetElementFooterHTML(e)
 {
  return (e.type === 'title' || e.type === 'button' || e.padbar) ? '' : `<div${SetFlag(e, 'underline') ? ' class="divider"' : ''}></div>`;
 }

 // Get interface element content outer html
 GetElementContentHTML(e, inner)
 {
  if (!e) return '';
  const readonly = this.SetFlag(e, 'readonly');
  const uniqeid = `${this.id + '_' + e.id}`;																										// Set element uniq identificator (in context of of all global boxes with its elements) based on its parent dialog box id and element id of itself
  const dataattribute = `data-element="${uniqeid}"`;																								// Set html attribute to access this uniq id
  const styleattribute = e.style ? ` style="${Application.AdjustString(e.style, Application.TAGATTRIBUTEENCODEMAP)}"` : ``;
  let classlist = readonly ? 'readonlyfilter' : '';
  let content = '';																																	// Element some content var

  switch (e.type)
         {
          case 'title':
			   if (typeof e.data !== 'string') return ''; // Text data is undefined (non string)? The title is hidden, so return empty
	    	   return `<div class="title" ${dataattribute}${styleattribute}>${Application.AdjustString(e.data, Application.HTMLINNERENCODEMAP, Application.ELEMENTINNERALLOWEDTAGS)}</div>`;// Empty title string? Whole title element is invisible

		  case 'select':
			   if (!e.options.length) return '';																										// No options for selectable element? Return empty
			   let optionicon = '';
			   let activeoption = GetElementOption(e);
			   if (activeoption.clonable) optionicon += '<div class="itemadd" title="Clone this dialog profile">&nbsp&nbsp&nbsp&nbsp</div>';		// Define 'clone' icon for the active profile
			   if (activeoption.removable) optionicon += '<div class="itemremove" title="Remove this dialog profile">&nbsp&nbsp&nbsp&nbsp</div>';	// Define 'remove' icon for the active profile
			   if (e.padbar) // Pad selection
				  {
				   classlist = optionicon ? 'activepad flexrow' : 'activepad';
				   for (const option of e.options)																										// For pad selection element (pad bar) collect pad divs to 'content' var
					   content += `<div class="${option.checked ? classlist : 'pad'}" value="${option.id}"${option.styleattribute}>${optionicon && option.checked ? '<div>' : ''}${option.inner}${optionicon && option.checked ? '</div>' + optionicon : ''}</div>`;
				   return inner ? content : `<div class="padbar flexrow" ${dataattribute}${styleattribute}>${content}</div>`;
				  }
				else // Usual selection
				  {
				   classlist += `${classlist ? ' ' : ''}` + 'select arrow' + `${SetFlag(e, 'sort').includes('descending') + SetFlag(e, 'sort').includes('alphabetical') * 2}` + `${typeof e.data === 'object' ? ' profileselectionstyle' : ''}`;
				   content = `<div value="${activeoption.id}"${activeoption.styleattribute}>${activeoption.inner}</div>`;
				   if (optionicon) content = `<div class="${classlist}">${content}</div>${optionicon}`;
				   if (optionicon) return inner ? content : `<div class="flexrow" ${dataattribute}>${content}</div>`;
				   return inner ? content : `<div class="${classlist}" ${dataattribute}>${content}</div>`;
				  }

		  case 'multiple':
			   if (!e.options.length) return '';																									// No options for selectable element? Return empty
			   for (const option of e.options)
				   content += `<div value="${option.id}"${option.checked ? ' class="selected"' : ''}${option.styleattribute}>${option.inner}</div>`;// For multiple selection element collect option divs
			   return inner ? content : `<div class="select ${classlist}" ${dataattribute}${styleattribute}>${content}</div>`;						// Return div wraped content

		  case 'checkbox':
		  case 'radio':
			   if (!e.options.length) return ''; // No options for selectable element? Return empty
			   for (const option of e.options) // For checkbox/readio element types collect input and label tags
				   content += `<input type="${e.type}" class="${e.type}" ${option.checked ? ' checked' : ''}${readonly ? ' disabled' : ''} name="${uniqeid}" id="${uniqeid + '_' + option.id}" value="${option.id}"><label for="${uniqeid + '_' + option.id}" value="${option.id}"${option.styleattribute}>${option.inner}</label>`;
			   return inner ? content : `<div ${classlist ? 'class="' + classlist + '"' : ''}${dataattribute}${styleattribute}>${content}</div>`;

		  case 'textarea':
		  case 'text':
		  case 'password':
			   if (typeof e.data !== 'string') return ''; // Text data is undefined (non string)? Return empty
			   let placeholder = SetFlag(e, 'placeholder'); // Get placeholder string
			   if (placeholder) placeholder = ` placeholder="${Application.AdjustString(placeholder, Application.TAGATTRIBUTEENCODEMAP)}"`;	// Placholder attribute for text elements
			   if (e.type === 'textarea') return `<textarea type="textarea" class="textarea ${classlist}" ${dataattribute}${readonly ? ' readonly' : ''}${placeholder}${styleattribute}>${Application.AdjustString(e.data/*, Application.HTMLINNERENCODEMAP*/)}</textarea>`;	// For textarea element type return textarea tag
			    else return `<input type="${e.type}" class="${e.type} ${classlist}" ${dataattribute}${readonly ? ' readonly' : ''} value="${Application.AdjustString(e.data, Application.TAGATTRIBUTEENCODEMAP)}"${placeholder}${styleattribute}>`; // For text/password element types return input tag with appropriate type

		  case 'table':
			   if (e.data && typeof e.data === 'object') for (const row in e.data)
				  {
				   if (!e.data[row] || typeof e.data[row] !== 'object') continue;
				   content += '<tr>';
				   for (const cell in e.data[row]) content += `<td class="boxtablecell${cell[0] === '_' ? ' cursorpointer" data-id="' + Application.AdjustString(cell, Application.TAGATTRIBUTEENCODEMAP) + '"' : '"'}>${Application.AdjustString(e.data[row][cell], Application.HTMLINNERENCODEMAP)}</td>`;
				   content += '</tr>';
				  }
			   return content ? `<table class="boxtable" ${dataattribute}${styleattribute}><tbody>${content}</tbody></table>` : '';

	 	  case 'button':
			   if (typeof e.data !== 'string') return '';																		// Button is hidden? Return empty
			   content = `${Application.AdjustString(e.data, Application.HTMLINNERENCODEMAP)} ${GetTimerString(e, this.Nodes.autoapplybuttons.get(e))}`;
	      	   return inner ? content : `<div class="button ${classlist}" ${dataattribute}${styleattribute}>${content}</div>`;
		 }
 }
 
 // Function calculates the timer, applies the button if needed and refreshes button text with the new timer in seconds
 ButtonTimer(e)
 {
  const button = this.Nodes.autoapplybuttons.get(e);
  clearTimeout(button.timeoutid);																				// Clear timer function
  if (this.Nodes.buttons[e.id]) this.Nodes.buttons[e.id].innerHTML = this.GetElementContentHTML(e, true);		// Refresh button
  if (new Date().getTime() - button.timerstart > button.timer) return this.EventManager(this.ButtonApply(e));	// Timer is up? Apply the button passing the result events
  button.timeoutid = setTimeout(() => this.ButtonTimer(e), 1000); 												// Restart timer function otherwise
 }

 GetDialogInner(inner, profile = this.data, padarea)
 {
  for (const name in profile)
	  {
	   const e = profile[name];
	   if (!e || typeof e !== 'object') continue;
	   const outer = this.GetElementHeaderHTML(e) + this.GetElementContentHTML(e) + this.GetElementFooterHTML(e); // Get element outer HTML including element header, element content and element footer
	   if (e.type === 'title') inner.title = outer;	// Fix dialog title, so last dialog title is used for multiple ones
	   if (e.type === 'button') inner.footer += outer; // Collect btns to dialog footer
	   if (e.type === 'button') this.Nodes.buttons[e.id] = false; // Fix btn id here but not from full dialog HTML query selector (for hidden auto apply btns not in HTML)
	   if (['title', 'button'].includes(e.type)) continue; // Continue for title/btn elements
	   (e.padbar || padarea) ? inner.padarea += outer : inner.mainarea += outer; // Collect non zero element id for pad or main area
	   if (e.type !== 'select' || typeof e.data !== 'object') continue;
	   const option = GetElementOption(e);
	   if (!option) continue;
	   this.GetDialogInner(inner, e.data[option.origin], e.padbar ? true : padarea); // Call <GetDialogInner> function recursively for any profile selection (pad or drop-down list)
	  }
 }

 // Refresh dialog drag, icon and push control elements not forgetting to refresh its icons via function 'RefreshControlIcons' direct call
 RefreshControlElements()
 {
  if (!this.props.control.fullscreendblclick && !this.props.control.fullscreenicon && !this.props.control.drag && !this.props.control.closeicon && !this.props.control.push) return;
  const elements = this.Nodes.title ? [this.Nodes.title].concat([...this.Nodes.title.querySelectorAll(Application.ELEMENTINNERALLOWEDTAGS.join(', '))]) : [this.elementDOM];// Calculate title (if exist) with all its children elements. Or child main DOM element
  if (this.props.control.fullscreenicon) this.props.control.fullscreenicon.elements = [elements[0]];															// and set 1st element for fullscreen icon,
  if (this.props.control.closeicon) this.props.control.closeicon.elements = [elements[0]];																		// set 1st element for close icon,
  if (this.props.control.fullscreendblclick) this.props.control.fullscreendblclick.elements = elements;															// set <elements> array clickable for 'full screen'	feature
  if (this.props.control.drag) this.props.control.drag.elements = elements;																						// and set them dragable
  if (this.props.control.push)
	 {
	  this.props.control.push.elements = [];
  	  for (const i in this.Nodes.buttons)
		  if (this.Nodes.buttons[i] && !this.SetFlag(this.elements[i], 'readonly')) this.props.control.push.elements.push([this.Nodes.buttons[i]].concat([...this.Nodes.buttons[i].querySelectorAll(Application.ELEMENTINNERALLOWEDTAGS.join(', '))])); 
	 }
  this.RefreshControlIcons();
 }

 // Set focus to the '1st found' in child non-readonly text element
 SetFirstTextElementFocus()
 {
  if (!this.elementDOM) return;
  for (const id in this.Nodes.textinputs)
	  if (!this.SetFlag(this.elements[id], 'readonly')) return this.Nodes.textinputs[id].focus();
 }

 RemoveTextInput()
 {
  if (!this.Nodes.CloneInput.e.padbar) this.Nodes.CloneInput.div.parentNode.firstChild.style.display = 'block';				// For non-pad prfile clone display block 'select' DOM element
  this.Nodes.CloneInput.input.removeEventListener('blur', this.Handler.bind(this));									// Remove event listener from 'input' DOM element
  this.Nodes.CloneInput.div.remove();																					// Remove input and its wrap div elements from DOM
  this.Nodes.CloneInput.input.remove();
  delete this.Nodes.CloneInput;																							
 }

 CloneNewProfile(e)
 {
  if (this.Nodes.CloneInput.esc) return; // Pressed Esc btn caused blur event, so profile cloning is not needed
  let name, flags, style;
  [name, flags, ...style] = this.Nodes.CloneInput.input.value.split(FIELDSDIVIDER); // Split new profile string to name and flags via divider
  for (const option of e.options) if (option.name === name)  return new DialogBox(`Profile name '${name}' already exists!`, this.parentchild, JSON.parse(globals.MODALBOXPROPS), 'Clone error'); // Check name exist in e.data profile list and return warning msg in success
  if (e.options.length >= DIALOGSELECTABLEELEMENTMAXOPTIONS) return new DialogBox(`The number of options exceeds the limit of ${DIALOGSELECTABLEELEMENTMAXOPTIONS}!`, this.parentchild, JSON.parse(globals.MODALBOXPROPS), 'Clone error'); // Check option number limit
  flags = FIELDSDIVIDER + (flags || '');
  if (!flags.includes(OPTIONISCLONED)) flags += OPTIONISCLONED; // and add 'option is cloned' flag
  style = style.length ? FIELDSDIVIDER + style.join(FIELDSDIVIDER) : ''; // Join back flag string
  
  e.data[name + flags + style] = JSON.parse(JSON.stringify( e.data[GetElementOption(e).origin] )); // Create new profile in e.data via cloning current active
  e.options.push({origin: name + flags + style});
  this.RefreshDialog(SETSERVICEDATA | RESTOREINITIALORDER | SHOWDIALOGDATA); // and refresh dialog with a new profile added
 }

 // Inheritance function that is called on mouse/keyboard events on dialog box
 Handler(event)
 {
  let e, id, target;
  [id, target] = GetEventTargetInterfaceElement(event.target);	// Define the clicked element 'id' and its wrapped target
  e = this.elements[id];

  switch (event.type)
         {
	  	  case 'blur':											// Blur event for the new profile input? Clone input profile name and remove input element
			   this.CloneNewProfile(this.Nodes.CloneInput.e);
			   this.RemoveTextInput();
			   break;

	  	  case 'keyup':
			   switch (event.code)
			   		  {
					   case 'Escape': // Esc btn closes 'profile-cloning' input element if exist
				   			if (!this.Nodes.CloneInput) return; // or return nothing to alloow next control to process ESC btn
				   			this.Nodes.CloneInput.esc = true;
				   			this.Nodes.CloneInput.input.blur();
							break;
					   case 'Enter': // Enter key for btn-apply/profile-cloning
					   case 'NumpadEnter':
				   			if (this.Nodes.CloneInput) this.Nodes.CloneInput.input.blur();
				   			else if ((e?.type === 'text' || e?.type === 'password') && !this.SetFlag(e, 'readonly'))	// For 'text' type and no readonly elements only
				   	  				{
					   				 for (id in this.Nodes.buttons)												// Go through all btns and apply first non readonly one
					   	   				if (event = this.ButtonApply(this.elements[id])) return event;
					  				}
							break;
					   case 'ArrowLeft': // Left arrow key with Alt+Ctrl hold for pad selection
				   			if (this.Nodes.CloneInput || !event.altKey || !event.shiftKey) break;
				   			if (this.Nodes.padbar) this.ActivateSelectedOption(this.elements[GetEventTargetInterfaceElement(this.Nodes.padbar)[0]], false);
							break;
					   case 'ArrowRight': // Right arrow key with Alt+Ctrl hold for pad selection
				   			if (this.Nodes.CloneInput || !event.altKey || !event.shiftKey) break;
				   			if (this.Nodes.padbar) this.ActivateSelectedOption(this.elements[GetEventTargetInterfaceElement(this.Nodes.padbar)[0]], true);
							break;
					  }
			   return { type: 'EMPTY', destination: this };

		  case 'input':
			   if (ELEMENTTEXTTYPES.includes(e.type))
				  {
				   e.data = target.value;														// Get text element data directly from its DOM element value
				   this.ChangeAllElementAffectIdsReadonlyStatus(e);
				   break;
				  }
			   if (['radio', 'checkbox'].includes(e.type))
				  {
				   this.ActivateSelectedOption(e, event.target.attributes?.value?.value);
				   break;
				  }
			   break;

		  case 'click':
			   if (e) return this.ButtonApply(e, event.target);									// Button-apply function will check whether the element is appliable button or table callable cell and make corresponded action then
	       	   break;

	  	  case 'mousedown':																		// Mouse any button down on element (event.which values: 1 - left mouse btn, 2 - middle btn, 3 - right btn)
			   if (!e || this.SetFlag(e, 'readonly')) break;									// Break for readonly element
			   if (event.button === 0 && event.buttons === 3)									// Left button down with right button hold? Do some element extra actions lower
				  {
			   	   if (['text', 'textarea'].includes(e.type)) 									// Bring on dialog of element text data json formatted data to change it
					  {
					   try { new DialogBox(JSON.parse(e.data), this, Object.assign(JSON.parse(globals.MODALBOXPROPS), { callback: { target: target, e: e } })); }
					   catch {} // Content example: { "title":{"type":"title", "data":"Title"}, "input":{"type":"textarea", "head":"Input text", "data":""}, "btn":{"type":"button", "data":"  OK  ", "flag":"a"} }
					   break;
					  }
				   if (ELEMENTSELECTABLETYPES.includes(e.type))									// or change sort order of selectable element
				      {
				   	   SetFlag(e, 'sort', true);
					   SortSelectableElementData(e);
				   	   target.outerHTML = this.GetElementContentHTML(e);
					  }
				   break;
				  }
			   if (event.button === 0 && event.buttons === 1)									// Left button down with no any other button hold?
				  {
				   if (e.type === 'multiple')
					  {
					   this.ActivateSelectedOption(e, event.target.attributes?.value?.value, event.target);
					   break;
					  }
				   if (e.type === 'select')
					  {
					   if (this.Nodes.CloneInput) break;												// No action at cloning profile process, element click will call blur event that will clone user defined profile
					   if (event.target.classList.contains('itemadd'))									// Mouse down on profile clone/remove icon? Do nothing, process it at mouse up event
						  {
						   this.Nodes.CloneInput = { e: e, div: document.createElement('div'), input: document.createElement('input') };
						   this.Nodes.CloneInput.div.appendChild(this.Nodes.CloneInput.input);
						   this.Nodes.CloneInput.input.addEventListener('blur', this.Handler.bind(this));
						   if (e.padbar)
						   	  {
							   this.Nodes.CloneInput.div.classList.add('pad');
							   this.Nodes.CloneInput.div.style.width = '100%';
							   target.appendChild(this.Nodes.CloneInput.div);
						   	  }
						    else
						   	  {
							   target.firstChild.firstChild.style.display = 'none';
							   target.firstChild.appendChild(this.Nodes.CloneInput.div);
							  }
						   this.Nodes.CloneInput.input.classList.add('newprofileinput');
						   this.Nodes.CloneInput.input.setAttribute('placeholder', SetFlag(e, 'placeholder'));
						   requestIdleCallback(() => this.Nodes.CloneInput.input.focus());
						   break;
						  }
					   if (event.target.classList.contains('itemremove'))								// Mouse down on profile clone/remove icon? Do nothing, process it at mouse up event
						  {
						   if (e.options.length === 1 && new DialogBox(`Profile cannot be removed, at least one must exist!`, this.parentchild, JSON.parse(globals.MODALBOXPROPS), 'Remove profile error')) break;
						   delete e.data[GetElementOption(e).origin];									// Removing current profile
						   this.RefreshDialog(SETSERVICEDATA | SHOWDIALOGDATA);
						   break;
						  }
					   if (e.padbar)																	// Pad selection?
						  {
						   this.ActivateSelectedOption(e, event.target.attributes?.value?.value, target);
						   break;
						  }
					   if (true) // Todo0 - CHECK DROPDOWN LIST POSITION AT DIALOG BOX CONTENT SCROLLING
						  {
						   if (e !== this.lastkilleddropdownlist?.e || event !== this.lastkilleddropdownlist?.event) new DropDownList(e, this, target.firstChild.offsetLeft + this.elementDOM.offsetLeft - this.Nodes.contentwrapper.scrollLeft, target.firstChild.offsetTop + this.elementDOM.offsetTop + target.firstChild.offsetHeight - this.Nodes.contentwrapper.scrollTop);
						   break;
						  }
					  }
				  }
			   break;

		  case 'CONFIRMDIALOG':
			   event.source.props.callback.e.data = event.source.props.callback.target.value = JSON.stringify(event.source.data); // Change element text area that was requested to change via dialog form (right btn hold with left btn click). Event source dialod <callback> is html element the innerHTML to change
			   break;

		  case 'OPTIONCHANGE':
			   this.ActivateSelectedOption(event.source.data.e, event.source.data.cursor, this.Nodes.selects[event.source.data.e.id].firstChild); // Drop-down list returned back selected option
			   break;

		  case 'KILL':
  			   for (const button of this.Nodes.autoapplybuttons.values()) clearTimeout(button.timeoutid);	
	       	   return { type: 'DYINGGASP' };

		  case 'DYINGGASP':
			   this.lastkilleddropdownlist = event.data; // event.data = { e: this.data.e, event: event.data} }
			   break;
		 }
 }

 ActivateSelectedOption(e, id, target)
 {
  if (!['boolean', 'number', 'string'].includes(typeof id)) return;
  if (!SetElementOption(e, id)) return;
  CreateSelectableElementData(e);
  if (e.type === 'multiple') target.classList.toggle("selected");	// Refresh 'multiple' element via option class toggle. For other types (radio and checkbox) make no action due to its native form
  if (e.type === 'select' && typeof e.data === 'object') return this.RefreshDialog(SHOWDIALOGDATA);
  if (e.type === 'select') target.innerHTML = this.GetElementContentHTML(e, true); // Show full dialog structure with new profile activate for profile selections or refresh element inner HTML otherwise
  this.ChangeAllElementAffectIdsReadonlyStatus(e);
 }
 
 ChangeAllElementAffectIdsReadonlyStatus(e)
 {
  for (const id of e.affect) this.SetFlag(this.elements[id], 'readonly', true);
 }

 SetFlag(...args)
 {
  const bindedFunction = SetFlag.bind(this, ...args);
  return bindedFunction();
 }

 ButtonApply(e, target)
 {
  let events = [];
  if (!['button', 'table'].includes(e.type) || this.SetFlag(e, 'readonly')) return;					// Return for disabled (or non button/table type) element
  if (e.type === 'button' && !SetFlag(e, 'appliable')) return { type: 'KILL', destination: this };	// Return dialog kill for non-appliable button
  if (e.type === 'table' && (!SetFlag(e, 'appliable') || !target.attributes['data-id'])) return;	// Return for non-appliable table element

  // Element is appliable
  if (SetFlag(e, 'appliable'))
	 {
	  events.push({ type: 'CONFIRMDIALOG', data: e.type === 'button' ? this.DialogProfileElementsAdjust(this.data, true, this.DialogProfileElementGetName, e.id) : target.attributes['data-id']?.value, destination: this.parentchild });
	  // Todo0 - dialog box is not killed for interactive flag, so all service data stays untouched, but should be removed in order to pass to the handler. Workaround - create a dialog data copy and remove all unnecessary stuff
	 }

  // Button is non interactive and element is not a table? Add KILL event
  if (!SetFlag(e, 'interactive') && e.type !== 'table')
	 {
	  events.push({ type: 'KILL', destination: this });
	  this.RefreshDialog(RESTOREINITIALORDER | CLEARELEMENTFROMUNNECESSARYPROPS);
	 }
  return events;
 }

 // Function goes through dialog <profile> elements calling <callback> function for each one. Root <profile> and true <recursive> args iterate all dialog elements
 DialogProfileElementsAdjust(profile, recursive, callback, ...args)
 {
  for (const ename in profile)
	  {
	   const e = profile[ename];
	   const result = callback(profile, ename, ...args);
	   if (result !== undefined) return result;
	   if (recursive && e?.type === 'select' && e.data && typeof e.data === 'object')
		  for (const profilename in e.data)
			  {
			   const result = this.DialogProfileElementsAdjust(e.data[profilename], true, callback, ...args);
			   if (result !== undefined) return result;
			  }
	  }
 }

 // Refresh specified dialog entities
 RefreshDialog(flag)
 {
  if (flag & CHECKSYNTAX) this.DialogProfileElementsAdjust(this.data, true, this.DialogProfileElementCheckSyntax);					// Check all elements syntax
  if (flag & RESTOREINITIALORDER) this.DialogProfileElementsAdjust(this.data, true, this.RestoreInitialOrder);						// Restore initial profile selection element options order at 'apply' dialog or option 'remove'
  if (flag & SETSERVICEDATA) this.InitDialogData();																					// Init dialog data for SETSERVICEDATA flag set
  if (flag & SETSERVICEDATA) this.DialogProfileElementsAdjust(this.data, true, this.DialogProfileElementSetServiceData.bind(this)); // Set every element service data (id, option array, padbar..)
  if (flag & SETSERVICEDATA) this.DialogProfileElementsAdjust(this.data, true, this.ParseElementExpression);						// Create element expression to pass to eval func from original 'expr' element property
  if (flag & SHOWDIALOGDATA) this.ShowDialogBox();																					// Show dialog box creating html from dialog data initial source (this.data)
  if (flag & CLEARELEMENTFROMUNNECESSARYPROPS) this.DialogProfileElementsAdjust(this.data, true, this.ClearElementUnnecessaryProps);// Clear element from unnecessary props
 }

 // Init <elements> (element list)
 InitDialogData()
 {
  this.elements = [];
 }

 // Function checks element syntax and clears element from unnecessary props
 DialogProfileElementCheckSyntax(profile, ename)
 {
  // Delete incorrect element
  if (!profile[ename] || typeof profile[ename] !== 'object' || !ELEMENTALLTYPES.includes(profile[ename].type)) 
	 {
	  delete profile[ename];
	  return;
	 }
  const e = profile[ename];

  // Go through all element available props to check their values
  for (const prop in ELEMENTUSERPROPS)
	  {
	   if (prop === 'data' && ['select', 'table'].includes(e.type) && e.data && typeof e.data === 'object' && Object.keys(e.data).length) continue; // Skip element property 'data' with real object type for select/table elements only
	   if (typeof e[prop] !== 'string') ELEMENTUSERPROPS[prop] === undefined ? delete e[prop] : e[prop] = ELEMENTUSERPROPS[prop]; // Fallback to the default value `ELEMENTUSERPROPS[prop]` in case of non string type
	  }

  // Element check depending on its type
  switch (e.type)
	  	 {
		  case 'title':
			   break; 																			 // All titles are correct. Title undefined data makes it invisible, so such title last appearance in active profile bundle draws dialog with no title
		  case 'button':
			   if (typeof e.data !== 'string' && !SetFlag(e, 'autoapply')) delete profile[ename];// Invisible non-autoapply btns are incorrect
			   break;
		  default:
			   if (!e.head && !('data' in e) && !SetFlag(e, 'underline')) delete profile[ename]; // Element is incorrect for a absent/empty head, no data prop and no underline flag
		 }
 }

 // Restore profile selection element initial options order. Profile clone/remove breaks default appearance initial sort order for already inited selections, so set it back below as it was at initial time 
 RestoreInitialOrder(profile, ename)
 {
  const e = ename === undefined ? profile : profile[ename]; // The function may be called with single arg only (e) or from wrapper above with two args (profile, ename)
  if (e?.type !== 'select' || typeof e.data !== 'object' || !Array.isArray(e.options)) return;
  const flag = e.flag;
  const newdata = {};
  e.flag = '';
  SortSelectableElementData(e);
  for (const option of e.options) newdata[option.origin] = e.data[option.origin];
  [e.data, e.flag] = [newdata, flag];
 }

 // Function clears element from unnecessary props
 ClearElementUnnecessaryProps(profile, ename)
 {
  const e = profile[ename];
  if (!e || typeof e !== 'object') return;
  for (const prop in e) if (!(prop in ELEMENTUSERPROPS)) delete e[prop];
 }

 DialogProfileElementSetServiceData(profile, ename)
 {
  // Clear element from unnecessary props
  const e = profile[ename];
  this.ClearElementUnnecessaryProps(e);
 
  // Create selectable element parsed options array and delete it in case of options number exceed
  if (ELEMENTSELECTABLETYPES.includes(e.type) && !CreateSelectableElementOptions(e))
	 {
	  delete profile[ename];
	  return;
	 }

  // Check option if no any checked, remove multiple checked, etc..
  if (ELEMENTSELECTABLETYPES.includes(e.type)) CorrectCheckedOptions(e);
  if (ELEMENTSELECTABLETYPES.includes(e.type)) SortSelectableElementData(e);

  // Insert user defined element to the 'allelements' global array and add empty set collection to all elements which data can affect to other elements readonly flag
  e.id = this.elements.length;
  this.elements.push(e);
  e.affect = new Set();

  // Set service prop 'padbar' for 1st appeared profile selection element of root profile forcing it to act as a pad bar at the top dialog box
  for (const name in profile)
	  {
	   if (profile === this.data && profile[name]?.type === 'select' && typeof profile[name].data === 'object') profile[name].padbar = true;
	   break;
	  }
 }

 // Function parses expression 'e.expr' checking restricted chars and prop existing
 ParseElementExpression(profile, ename)
 {
  // Return and delete expression for absent 'expr' or non suitable element types
  const e = profile[ename];
  if (!('expr' in e) || !['button', ...ELEMENTSELECTABLETYPES, ...ELEMENTTEXTTYPES].includes(e.type))
	 {
	  delete e.expr;
	  return;
	 }

  // Search all regexp via pattern EXPRISREGEXP, the result array has 'index' property the position of the matched regexp is found on and return with delete for no match found case
  const matches = Array.from(e.expr.matchAll(EXPRISREGEXP));
  if (!matches.length)
	 {
	  delete e.expr;
	  return;
	 }

  // Go through all matches and replace it them with object vars to be tested on change
  let currentpos = 0;
  let expression = '';
  for (const match of matches)
   	  {
	   if (currentpos < match.index)																				// If cursor current position lower than current regexp found
		  {
	   	   if (EXPRPROPDISALLOWEDCHARSREGEXP.test(e.expr.substring(currentpos, match.index)))						// then test non-regexp string (before the position the regexp is found) for allowed chars ['()&&||!'] and return for restricted chars found
	 		  {
	  		   delete e.expr;
	  		   return;
	 		  }
	   	   expression += e.expr.substring(currentpos, match.index);													// Collect to 'expression' var substring from current pos till match start index
		  }
	   currentpos = e.expr.indexOf(' ', match.index + match[0].length);												// Get position from the end of a regexp (match.index + match[0].length) for the 1st space found to parse the interface element property name
	   let name = e.expr.substring(match.index + match[0].length, currentpos === -1 ? e.expr.length : currentpos);	// Parse element property name as a substring from the end of a regexp till the calculated space char position above
	   if (!name) name = ename;																					// For empty parsed name use current element one

	   if (typeof profile[name]?.['data'] !== 'string')																// Non existing element or element with non-string (undefined/object type) 'data' property ? Return
	 	  {
	  	   delete e.expr;
	  	   return;
	 	  }

	   profile[name]['affect'].add(e.id);																			// Add parsing expression element id to the calculated element (via its property name above) affect list
	   expression += match[0] + ".test(this.elements['" + profile[name].id + "']['data'])";							// Collect new expression in js format to pass it to eval function
	   if (currentpos === -1) break;																				// The end of expression string is reached (index of space char to parse property name reached end of string), so break the cycle
	  }
  e.test = expression;
 }

 DialogProfileElementGetName(profile, ename, eid)
 {
  return profile[ename].id === eid ? ename : undefined;
 }

 ShowDialogBox()
 {
  let inner = { title: '', padarea: '', mainarea: '', footer: '' };
  this.Nodes = this.Nodes ? { autoapplybuttons: this.Nodes.autoapplybuttons, textinputs: {}, selects: {}, tables: {}, buttons: {}, CloneInput: this.Nodes.CloneInput } : { autoapplybuttons: new Map(), textinputs: {}, selects: {}, tables: {}, buttons: {} };
  this.GetDialogInner(inner); // Get dialog inner for each area

  if (inner.padarea || inner.mainarea) inner.mainarea = `<div class="boxcontentwrapper">${inner.padarea}${inner.mainarea}</div>`; // Wrap pad/main area to div
  if (inner.footer) inner.footer = `<div class="footer">${inner.footer}</div>`; // so do footer..
  inner.title += inner.mainarea + inner.footer; // Collect title, content and footer to title
  if (!inner.title) return;
  this.elementDOM.innerHTML = inner.title; // and set it to dialog root DOM element

  for (const [e, button] of this.Nodes.autoapplybuttons) // Go through all auto apply btns and delete with timer clear any btn not in all btn list (Nodes.buttons)
	  {
	   if (e.id in this.Nodes.buttons) continue;
	   clearTimeout(button.timeoutid);
	   this.Nodes.autoapplybuttons.delete(e);
	  }
  for (const id in this.Nodes.buttons) // Then all btns in <button> set object are checked on 'autoapply' feature and added to Nodes.autoapplybuttons object (if not exist) with new timers or left with old timers (if exist)
	  {
	   const e = this.elements[id];
	   if (this.Nodes.autoapplybuttons.has(e)) continue;
	   const timer = Math.min(SetFlag(e, 'autoapply'), BUTTONTIMERMAXSECONDS) * 1000;
	   if (timer) this.Nodes.autoapplybuttons.set(e, { timer: timer, timerstart: new Date().getTime(), timeoutid: setTimeout(() => this.ButtonTimer(e), 0) });
	  }

  for (let target of [...this.elementDOM.querySelectorAll('.boxcontentwrapper, .title, .padbar, input, textarea, .select, .boxtable, .button')]) // Go through all dialog DOM elements to set them to <Nodes> object in appropriate sub objects 
	  {
	   if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') target.addEventListener('input', this.Handler.bind(this)); // not forgetting to add listeners on native input elements to intercept its data keeping it in actual state at main dialog data object
	   if (target.classList.contains('boxcontentwrapper')) this.Nodes.contentwrapper = target;
	   let e, id;
  	   [id, target] = GetEventTargetInterfaceElement(target); // Define the clicked element 'id' and its wrapped target
  	   if (!(e = this.elements[id])) continue;
	   if (e.type === 'title') this.Nodes.title = target;
	   if (ELEMENTTEXTTYPES.includes(e.type)) this.Nodes.textinputs[e.id] = target;
	   if (ELEMENTSELECTABLETYPES.includes(e.type)) this.Nodes.selects[e.id] = target;
	   if (e.padbar) this.Nodes.padbar = target;
	   if (e.type === 'table') this.Nodes.tables[e.id] = target;
	   if (e.type === 'button') this.Nodes.buttons[e.id] = target;
	  }

  // Set 'fullscreendblclick' and 'drag' with 'push' controls <elements> property
  this.RefreshControlElements();

  // Set focus to the first found text element
  setTimeout(this.SetFirstTextElementFocus.bind(this), 401); // Old version is not suitable due to incomplete animation, so unknown element to focus: requestIdleCallback(this.SetFirstTextElementFocus.bind(this));
 }
}
