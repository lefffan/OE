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
// 								The title will be displayed until any other title appeared in an active profile bundle. Undefined 'data' sets title invisible
// text types 'textarea', 'text', 'password': 'data' is an interface element text content,
// 											  'flag - divider(*), readonly(!), placeholder attribute (+),
// 										      'expr' is a combination of `/regexp/prop_name` via logical operators `&& || ! ( )`. In case of no readonly flag set and this 'expr' true value - the element becomes readonly. Undefined/incorrect 'expr' has negative value
// selectable types 'select', 'multiple', 'checkbox', 'radio': 'data' is an interface element content of selectable options divided by '/'. Options with char '!' before are considered as a selected/checked one,
//															   'flag' - divider(*), sort order(a-), readonly(!),
// 															   'expr' - see text type description
// table type 'type': 'data' is an interface element 2d dimension object content with properties as a table rows. Each row property is a table cells property list. Each cell property, in turn, is a cell <td> tag inner html.
// 					  Cell props started with '_' are appliable and generate conroller call with a property name as a dialog event.
//				      'flag' - divider(*), readonly(!)
// button type 'button': 'head' - warning message to confirm controller call. Or just info message in case of non appliable button,
//			  			 'data' - button inner html, undefined/incorrect data - button is invalid, while empty data string sets button invisibe and usually used with auto apply feature (see below), as an example - disappearing info messages
//			  			 'flag' - appliable char (a) makes a controller call action on a button click with a property name as a dialog event initiated the call. No appliable flag set - the button click makes no action
//			  			 		  interactive char (+) means no hide dialog after button apply, for appliable buttons only - no controller call action made with interactive flag makes no sense cause no dialog kill even made.
//   							  timer in milliseconds the button will be applied on, so the btn becomes auto-apply. Number of milliseconds is a power of 2, where the power is a number of chars '-'
//										Once the auto-apply button appeares in the profile bundle the auto-apply feature is turned on and does exist regardless of button current profile appearance.
//								  grey style readonly button (!)
// 						 'expr' - See text type description. In case of true expr expression the button becomes grey.
// Todo2 - Элементы с diaplay flex "наезжают" на margin нижестоящего элемента div
// Todo2 - Multuiple flag * creates rounded area arount GUI element. 
// Todo2 - Review all css props, its content props, some for builtin conf (index.html), some for configurable GUI via user customization
// Todo2 - add style prop (type, data head hint expr and style!) to style all element types
// Todo2 - make "cursor: not-allowed;" for disabled buttons like in VMWARE vcenter
// Todo2 - When two modal appears - lower box has grey filter and that filter doesn't go away after above box gone away
// Todo2 - Should clickable elements react to 'click' event instead of 'mousedown' (like 'button' element for a example)?
// Todo1 - Make universal 'flag' function to manage flags in one place and implement it to sidebar
// Todo0 - indexod -> includes, elementids -> elements

import { AdjustString, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS, TAGATTRIBUTEENCODEMAP, EFFECTSHINT, lg, MessageBox } from './constant.js';
import { app } from './application.js';
import { Interface } from './interface.js';
import { DropDownList } from './dropdownlist.js';

export const EMPTYOPTIONTEXT			= ' ';
const DIALOGSELECTABLEELEMENTMAXOPTIONS	= 1024;
const BUTTONTIMERMAXSECONDS				= 60 * 60 * 24 * 7; // One week
const ELEMENTSERVICEPROPS				= ['id', 'options', 'eventcounter', 'affect', 'prop'];	// Todo0 - prop need?
const ELEMENTUSERPROPS					= { type: undefined, flag: '', head: undefined, data: undefined, style: undefined, expr: undefined };
const ELEMENTSELECTABLETYPES			= ['select', 'multiple', 'checkbox', 'radio'];
const ELEMENTTEXTTYPES					= ['textarea', 'text', 'password'];
const ELEMENTALLTYPES					= ['title', ...ELEMENTSELECTABLETYPES, ...ELEMENTTEXTTYPES, 'table', 'button'];
const FIELDSDIVIDER						= '~';
const OPTIONSDIVIDER					= '/';
const OPTIONISCHECKED					= '!';
const OPTIONISCLONED					= '*';
const OPTIONISCLONABLE					= '+';
const OPTIONISREMOVABLE					= '-';
const EXPRPROPDISALLOWEDCHARSREGEXP		= /[^&|( )!]/;
const EXPRISREGEXP						= /\/.*?[^\\]\//g;
const DIALOGBOXMACROSSTYLE				= { SIDE_MARGIN: '10px', ELEMENT_MARGIN: '10px', HEADER_MARGIN: '5px', TITLE_PADDING: '5px', BUTTON_PADDING: '10px', FONT: 'Lato, Helvetica' };
 
// Check and clear element from unnecessary props
function CheckElementSyntax(e)
{
 if (!e || typeof e !== 'object') return;												// Return for non-object element

 for (const prop in e) 																	// Go through all element props to check its values and fall back to the default value or delete the prop in case of incorrect type
	 if (prop in ELEMENTUSERPROPS)														// Property 'prop' in ELEMENTUSERPROPS?
		{
		 if (prop === 'data' && ['select', 'table'].(e.type) !== -1 && e.data && typeof e.data === 'object' && Object.keys(e.data).length) continue;
		 if (typeof e[prop] !== 'string') ELEMENTUSERPROPS[prop] === undefined ? delete e[prop] : e[prop] = ELEMENTUSERPROPS[prop]; // Fallback to the default value `ELEMENTUSERPROPS[prop]` in case of non string type
		}
	  else
	    {
		 delete e[prop];																// otherwise clear element from unnecessary props
		}

 return ELEMENTALLTYPES.indexOf(e.type) !== -1;											// Return check for known element types
}

// Function builds array by splitting (divided via '/') input arg data string to separate options and returns eponymous array. Element type 'type' defines checked options number: 'select' (single checked option only), 'radio' (none or single)
function CreateSelectableElementOptions(data, type)
{
 // First step - init vars, for 'string'/'object' types only
 if (!data || !['string', 'object'].includes(typeof data)) return [];	// Element with non string data is considered as element with one header/hint only. With empty data ('') - as element with one empty option. With single divider data='/' - as element with two empty option.
 if (typeof data ==='object' && type !== 'select') return [];			// Profile selection (data prop is 'object' type) is for 'select' type only

 const list = typeof data ==='srting' ? data.split(OPTIONSDIVIDER) : data;
 const options = [];						// Array of selectable options. Each array element, in turn - is an array of option itself, checked status and order id (to keep default appearance): [option, ischecked, id] plus auto set fourth (profile index) and fifth (profile clonable/removable flag) array elements
 let option, flag, style;

 // Second step - push parsed options to the result array
 // Option structure: <name~flags~style>, where flags are: checked, clonable, removable, cloned
 for (option in list)
     {
      if (options.length >= DIALOGSELECTABLEELEMENTMAXOPTIONS) break;																							// Options number exceeds max allowed? Break
	  option = Array.isArray(list) ? list[option] : option;
	  [option, flag, ...style] = option.split(FIELDSDIVIDER);
	  if (!flag) flag = '';
	  if (style) style = style.join(FIELDSDIVIDER);
	  options.push({ id: options.length + '',
					 name: option,
					 inner: AdjustString(option ? option : EMPTYOPTIONTEXT, HTMLINNERENCODEMAP);
					 checked: flag.includes(OPTIONISCHECKED),
					 clonable: flag.includes(OPTIONISCLONABLE) && typeof data === 'object',
					 removable: flag.includes(OPTIONISREMOVABLE) && typeof data === 'object',
					 cloned: flag.includes(OPTIONISCLONED) && typeof data === 'object',
					 style: style });
     }

 // Return result array
 return options;
}

// Function creates and returns selectable element data from option list 'options'
function CreateSelectableElementData(options)
{
 // options = Array.from(options);																							// Create an array copy
 // SortSelectableElementData(options);																						// and sort it by default sort order (flag='') below. Should we need it to do?
 if (!Array.isArray(options)) return '';																					// Return empty string for incorrect options
 let data = '';

 for (const i in options) data += `${i ? OPTIONSDIVIDER : ''}` +																	// Collect data for each option: /name~flags~style/..
 								  `${options[i].name}` + 
 								  `${options[i].checked || options[i].clonable || options[i].removable || options[i].cloned || options[i].style ? OPTIONSDIVIDER : '' }` + 
 								  `${options[i].checked ? OPTIONISCHECKED : '' }` + 
 								  `${options[i].clonable ? OPTIONISCLONABLE : '' }` + 
 								  `${options[i].removable ? OPTIONISREMOVABLE : '' }` + 
 								  `${options[i].cloned ? OPTIONISCLONED : '' }` + 
 								  `${options[i].style ? OPTIONSDIVIDER + options[i].style : '' }`;
								  
 return data;																												// And return result data
}

// Correct checked (selected) options number for 'select' element type (1 option) and 'radio' (0 or 1 option):
// 'select' element type - should have at least one option selected, 1st option is forced otherwise
// 'radio' - may have no options selected.
// Both types should have no more than one selected option, last selected is used otherwise. Other selectable types 'checkbox' and 'multiple' may have any number of selected options, so unnecessary to correct
function CorrectCheckedOptions(options, type)
{
 if (type !== 'select' && type !== 'radio') return;
 let checkedcount = 0;
 for (let i = options.length - 1; i >= 0; i--) if (options[i].checked) checkedcount ? options[i].checked = false : checkedcount++;	// Any option already checked? uncheck option or increase checked count
 if (!checkedcount && type === 'select') options[0].checked = true;															 		// First option is forced checked for no any option checked (for 'select' type element only)
 return options;
}

// Functions sorts options array based on flag sorting chars
function SortSelectableElementData(options, flag)
{
 if (!Array.isArray(options)) return;
 if (typeof flag !== 'string') flag = '';
 const order = SetFlag({ flag: flag }, 'sort').includes('descending') ? -1 : 1;	// Get sorting ascending/descending order

 if (SetFlag({ flag: flag }, 'sort').includes('alphabetical'))
 	options.sort((a, b) => (order * a.name.localeCompare(b.name));				// Alphabetical sorting
  else 
 	options.sort((a, b) => (order * ((+a.id) - (+b.id)));						// Default appearance sorting

 return options;
}

// Function sets flag <name> to <value> of element <e>. Or return element <e> current flag value in case of undefined <value> arg
function SetFlag(e, name, value)
{
 switch (name)
		{
		 case 'readonly':
			  if (value === undefined) return e.flag.includes('!');
			  e.flag = value ? e.flag + '!' : e.flag.replaceAll(/!/g, '');
			  break;
		 case 'underline':
			  if (value === undefined) return e.flag.includes('*');
			  e.flag = value ? e.flag + '*' : e.flag.replaceAll(/\*/g, '');
			  break;
		 case 'placeholder':
			  let position = e.flag.indexOf('+');
			  return position === -1 ? '' : e.flag.substring(position + 1);
		 case 'sort':
			  if (value === undefined) return `${e.flag.includes('a') ? 'alphabetical' : ''}${e.flag.includes('-') ? 'descending' : ''}`;
			  if (!e.flag.includes('-')) e.flag += '-';
			   else e.flag = e.flag.includes('a') ? e.flag.replaceAll(/a|\-/g, '') : (e.flag + 'a').replaceAll(/\-/g, '');
			  break;
		 case 'interactive':
			  return e.flag.includes('a') && e.type === 'button';
		 case 'autoapply':
			  if (!e.flag.includes('-') || e.type !== 'button') return;
			  return Math.pow(2, e.flag.split('-').length - 1);
		}
}
 
// Functions searches option in options array for the specfified <search> arg (id for type 'number', name for type 'string', shift for type 'boolean' with true=1 and false=-1, first checked found for other types) and return corresponded option
function GetElementOption(options, search, loop)
{
 if (!Array.isArray(options)) return;
 
 for (const i in options)
	 {
	  if (typeof search === 'number' && +options[i].id === search) return options[i];	// Return matched option id
	  if (typeof search === 'string' && options[i].name === search) return options[i];	// Return matched option id
	  if (!options[i].checked) continue;
	  let j = typeof search === 'boolean' ? +i + (search ? 1 : -1) : +i;
	  if (j >= options.length) j = loop ? 0 : options.length - 1;
	  if (j < 0) j = loop ? options.length - 1 : 0;
	  return options[j];															// Return optionally shifted checked option
	 }
}

// Functions checks option in options array for the specfified <search> arg (id for type 'number', name for type 'string', shift for type 'boolean' with true=1 and false=-1, first checked found for other types) and unchecks previous checked option if exist.
// True toggle converts <serch> option checked status and return
function SetElementOption(options, search, toggle)
{
 if (!Array.isArray(options)) return;
 const oldchecked = GetElementOption(options, toggle ? search : undefined);	// Retrieve current checked option or <search> option if toggle is set
 if (toggle) return oldchecked ? ((oldchecked.checked = !oldchecked.checked) || true) : false;
 const newchecked = GetElementOption(options, search);	// Retrieve current checked option or <search> option if toggle is set
 if (oldchecked) oldchecked.checked = false;
 if (newchecked) newchecked.checked = true;
 return !(oldchecked === newchecked);
}

// Calculate estimated time in seconds and convert it to the string
function GetTimerString(e)
{
 if (!this.NodeList.autoapplybutton) return '';
 let timer = this.NodeList.autoapplybutton.timer - new Date().getTime() + this.NodeList.autoapplybutton.timerstart;	// Calculate timer via initial timer minus past time from e.timerstart

 timer = timer < 0 ? 0 : Math.round(timer/1000);			// Round timer (converted ms to seconds) to the nearest positive integer.

 let hour = '' + Math.trunc(timer/3600) + ':';				// Get integral part of the hours number plus ':' char.
 if (hour.length === 2) hour = '0' + hour;					// One digit hour string - add '0' before.

 let min = '' + Math.trunc((timer%3600)/60) + ':';			// Get integral part of the minutes number plus ':' char.
 if (min.length === 2) min = '0' + min;						// One digit minute string - add '0' before.

 let sec = '' + Math.trunc((timer%3600)%60);				// Get integral part of the seconds number plus ':' char.
 if (sec.length === 1) sec = '0' + sec;						// One digit second string - add '0' before.

 return ` (${hour}${min}${sec})`;
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

export class DialogBox extends Interface
{
 static style = {
	// dialog box global css props
	".dialogbox": { "background-color": "rgb(233,233,233);", "color": "#1166aa;", "border-radius": "5px;", "border": "solid 1px #dfdfdf;" },
	// dialog box title
	".title": { "background-color": "rgb(209,209,209);", "color": "#555;", "border": "#000000;", "border-radius": "5px 5px 0 0;", "font": `bold .9em ${DIALOGBOXMACROSSTYLE.FONT};`, "padding": "5px;" },
	// dialog box pad
	".pad": { "background-color": "rgb(223,223,223);", "border-left": "none;", "border-right": "none;", "border-top": "none;", "border-bottom": "none;", "padding": "5px;", "margin": "0;", "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "#57C;", "border-radius": "5px 5px 0 0;" },
	// dialog box active pad
	".activepad": { "background-color": "rgb(209,209,209);", "border-left": "none;", "border-right": "none;", "border-top": "none;", "border-bottom": "none;", "padding": "5px;", "margin": "0;", "font": `bold .9em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "#57C;", "border-radius": "5px 5px 0 0;" },
	// dialog box pad bar
	".padbar": { "background-color": "transparent;", "border": "none;", "padding": "4px 4px 0 4px;", "margin": "10px 0 0 0;" },
	// dialog box divider
	".divider": { "background-color": "transparent;", "margin": "0px 10px 10px 10px;", "height": "0px;", "border-bottom": "1px solid #CCC;", "border-top-color": "transparent;", "border-left-color": "transparent;" , "border-right-color": "transparent;" },
	// dialog box button
	".button": { "background-color": "#13BB72;", "border": "none;", "padding": `${DIALOGBOXMACROSSTYLE.BUTTON_PADDING};`, "margin": "10px 10px 13px 10px;", "border-radius": "5px;", "font": `bold 12px ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "white;" },
	// dialog box button and pad hover
	".button:hover, .pad:hover, .itemadd:hover, .itemremove:hover": { "cursor": "pointer;", "border": "" },
	// dialog box element headers
	".element-headers": { "margin": `${DIALOGBOXMACROSSTYLE.HEADER_MARGIN};`, "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "#555;", "text-shadow": "none;" },
	// dialog box help icon
	".hint-icon": { "padding": "1px;", "font": `1em Arial Narrow, ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "#555;", "background-color": "#FF0;", "border-radius": "40%;" },
	// dialog box help icon hover
	".hint-icon:hover": { "padding": "1px;", "font": `bold 1em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "black;", "background-color": "#E8E800;", "cursor": "help;", "border-radius": "40%;" },
	// dialog box table
	".boxtable": { "font": `.8em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "black;", "background-color": "transparent;", "margin": "10px;", "table-layout": "fixed;", "width": "auto;", "box-sizing": "border-box;" },
	// dialog box table cell
	".boxtablecell": { "padding": "7px;", "border": "1px solid #999;", "text-align": "center" },
	// dialog box readonly elements css filter
	".readonlyfilter": { "filter": "opacity(50%);", "_filter": "Dialog box readonly elements css filter property to apply to, see appropriate css documentaion." },
	//------------------------------------------------------------
	// dialog box select
	".select": { "background-color": "rgb(243,243,243);", "color": "#57C;", "font": `.8em ${DIALOGBOXMACROSSTYLE.FONT};`, "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "outline": "none;", "border": "1px solid #777;", "padding": "0px 0px 0px 0px;", "overflow": "auto;", "max-height": "150px;", "min-width": "24em;", "width": "auto;", "display": "inline-block;", "effect": "rise", "_effect": "Select fall-down option list " + EFFECTSHINT },
	// dialog box select option
	".select > div": { "padding": "2px 20px 2px 5px;", "margin": "0px;" },
	// dialog box select option hover
	".select:not([class*=arrow]) > div:hover": { "background-color": "rgb(211, 222, 192);", "color": "" },
	// dialog box select option selected
	".selected": { "background-color": "rgb(211, 222, 192);", "color": "#fff;" },
	// Profile selection additional style
	".profileselectionstyle": { "font": `bold .8em ${DIALOGBOXMACROSSTYLE.FONT};`, "border-radius": "4px;" },
	// Expanded selection
	".expanded": { "display": "block;", "margin": "0 !important;", "padding": "0 !important;", "position": "absolute;", "overflow-y": "auto !important;", "overflow-x": "hidden !important;", "max-height": "500px !important;" },
	//------------------------------------------------------------
	// dialog box radio
	"input[type=radio]": { "background-color": "transparent;", "border": "1px solid #777;", "font": ".8em/1 sans-serif;", "margin": `3px 5px 6px ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN};`, "border-radius": "20%;", "width": "1.2em;", "height": "1.2em;" },
	// dialog box radio checked
	"input[type=radio]:checked::after": { "content": "", "color": "white;" },
	// dialog box radio checked background
	"input[type=radio]:checked": { "background-color": "#00a0df;", "border": "1px solid #00a0df;" },
	// dialog box radio label
	"input[type=radio] + label": { "color": "#57C;", "font": ".8em Lato, Helvetica;", "margin": "0px 10px 0px 0px;" },
	//------------------------------------------------------------
	// dialog box checkbox
	"input[type=checkbox]": { "background-color": "#f3f3f3;", "border": "1px solid #777;", "font": ".8em/1 sans-serif;", "margin": `3px 5px 6px ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN};`, "border-radius": "50%;", "width": "1.2em;", "height": "1.2em;" },
	// dialog box checkbox checked
	"input[type=checkbox]:checked::after": { "content": "", "color": "white;" },
	// dialog box checkbox checked background
	"input[type=checkbox]:checked": { "background-color": "#00a0df;", "border": "1px solid #00a0df;" },
	// dialog box checkbox label
	"input[type=checkbox] + label": { "color": "#57C;", "font": `.8em ${DIALOGBOXMACROSSTYLE.FONT};`, "margin": "0px 10px 0px 0px;" },
	//------------------------------------------------------------
	// dialog box input text
	"input[type=text]": { "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "none;", "color": "#57C;", "border-radius": "5%;", "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "width": "90%;", "min-width": "300px;" },
	// dialog box input password
	"input[type=password]": { "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "none", "color": "#57C;", "border-radius": "5%;", "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "width": "90%;", "min-width": "300px;" },
	// dialog box input textarea
	"textarea": { "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "", "color": "#57C;", "border-radius": "5%;", "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "width": "90%;", "min-width": "300px;" },
 };

 InitDialogData()
 {
  // Set element ids and names
  this.elementids = [];
  this.elementnames = {};
  // No valid dialog structure? Fill it by default values
  if (!this.data || typeof this.data !== 'object') this.data = {};
 }

 // Dialog data consists of some GUI elements with next types:
 // Gui elements can be set in any order, but first title appeard is default title.
 // { type: select, data: 
 //  					option1: { elemnt1: {}, element2: {type: data:  }, elemnt3: {}, }
 //  					option2: {..}
 // }
 ParseDialogData(checksyntax = true, profile = this.data)
 {
  let count = 0;
  for (const name in profile)
	  {
	   if (count >= DIALOGSELECTABLEELEMENTMAXOPTIONS) break;																							// Options number exceeds max allowed? Break
	   const e = profile[name];
	   if (checksyntax && CheckElementSyntax(e))
		  {
		   delete profile[name];
		   continue;
		  }
  	   if (e.type === 'select' && typeof e.data === 'object')
		  {
		   let count = 0;
		   for (const option in e.data)
			   {
				if (count >= DIALOGSELECTABLEELEMENTMAXOPTIONS) break;							// Options number exceeds max allowed? Break
				ParseDialogData(checksyntax, e.data[option]) ? count++ : delete e.data[option];
			   }
		  }
  	   if (ELEMENTSELECTABLETYPES.includes(e.type))
		  {
		   e.options = CreateSelectableElementOptions(e.data, e.type);
		   SortSelectableElementData(CorrectCheckedOptions(e.options, e.type), e.flag);			// Create parsed options array for selectable elements
		  }
  	   if (['button'].includes(e.type))
		  {
		   if (typeof e.data !== 'string' && !SetFlag(e, 'interactive'))
		   	  {
			   delete profile[name];
			   continue;
		      }
		  }
  	   this.elementnames[name] = e.id = this.elementids.length;
  	   this.elementids.push(e); 																// Insert user defined element to the 'allelements' global array
  	   e.affect = new Set();																	// Add empty set collection to all elements which data can affect to other elements readonly flag. Old version: if ([...ELEMENTSELECTABLETYPES, ...ELEMENTTEXTTYPES].includes(e.type)) e.affect = new Set();
	   count++;
	  }
  return count;
 }
 
 destructor()
 {
  clearTimeout(this.autoapplybuttontimeoutid);
  super.destructor();
 }

 constructor(...args)
 {
  // Override 'data-element' attribute for dialog box DOM element to non-existent interface element id (-1), the search is terminated on. Call then parent constructor for the given args (data, parentchild, props, attributes)
  if (!args[2]?.control) args[2].control = { closeicon: {}, fullscreenicon: {}, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, push: {}, default: {}, closeesc: {} };
  args[3] = (args[3] && typeof args[3] === 'object') ? args[3] : {};
  args[3]['data-element'] = '_-1';
  super(...args);

  // Init dialog data
  this.InitDialogData();

  // Parse dialog data :)
  this.ParseDialogData();

  // Adjust all elements 'expr' property
  for (const e of this.elementids) this.ParseElementExpression(e);

  // Show dialog data (dialog box:)
  this.ShowDialogBox();
 }

 // Function parses expression 'e.expr', checks its syntax (restricted chars, evaluating) and put parsed string back to the 'e.expr'
 ParseElementExpression(e)
 {
  if (e.expr === undefined) return;																					// Return for undefined expression
  if (!['button', ...ELEMENTSELECTABLETYPES, ...ELEMENTTEXTTYPES].includes(e.type)) return delete e.expr;			// Return and delete expression for non suitable types
  const matches = Array.from(e.expr.matchAll(EXPRISREGEXP));														// Search all regexp via pattern EXPRISREGEXP, the result array has .index property the position of the matched regexp is found on
  if (!matches.length) return delete e.expr;																		// and return with delete for no match found case

  let currentpos = 0;
  let expression = '';
  const elementids = new Set();

  for (const match of matches)																						// Go through all matches
   	  {
	   if (currentpos < match.index)																				// If cursor current position lower than current regexp found
		  {
	   	   if (EXPRPROPDISALLOWEDCHARSREGEXP.test(e.expr.substring(currentpos, match.index))) return delete e.expr;	// then test non-regexp string (before the position the regexp is found) for allowed chars ['()&&||!'] and return restricted chars found
	   	   expression += e.expr.substring(currentpos, match.index);													// Collect match string to 'expression' var
		  }
	   currentpos = e.expr.indexOf(' ', match.index + match[0].length);												// Get position from the end of a regexp (match.index + match[0].length) for the 1st space found to parse the interface element property name
	   const name = e.expr.substring(match.index + match[0].length, currentpos === -1 ? e.expr.length : currentpos);// Parse element property name as a substring from the end of a regexp till the calculated space char position above
	   if (!this.elementnames[name] || this.elementnames[name]['data'] === undefined) return delete e.expr;			// Non existing element or element with undefined data? Return
	   this.elementnames[name]['affect'].add(e.id);																	// Add parsing expression element id to the calculated element (via its property name above) affect list
	   elementids.add(this.elementnames[name].id);																	// so add to the 'elementids' var too - just to clear its 'affect' in case of error expression
	   expression += match[0] + ".test(this.elementnames['" + name + "']['data'])";									// Collect new expression in js format to pass it to eval function
	   if (currentpos === -1) break;																				// The end of expression string is reached (index of space char to parse property name reached end of string), so break the cycle
	  }
  e.expr = expression;
  EvaluateElementExpression([e.id]);
 }

 EvaluateElementExpression(expressionEids)
 {
  const refreshelementids = new Set();
  let e;
  for (const id of expressionEids)
	  {
	   let result;
	   if (!(e = this.elementids[id])) continue;
	   try {	result = eval(e.expr); }
	   catch { lg('Evaluation exception detected on element:', e); }
	   if (result === undefined)
		  {
		   delete e.expr;
		   for (const element of this.elementids) element.affect.delete(e.id);
		   continue;
		  }
	   if ([0, 2].includes(+this.SetFlag(e, 'readonly') + +result)) continue;
	   this.SetFlag(e, 'readonly', result);
	   refreshelementids.add(e.id);
	  }
  return refreshelementids;
 }

 RefreshElementReadonlyAttribute(refreshelementids)
 {
  if (!refreshelementids?.size) return;
  for (const element of [...this.contentwrapper.querySelectorAll('input, textarea, .select'), ...this.footer.querySelectorAll('.button')])
	  {
	   let e, id, target;
	   [id, target] = GetEventTargetInterfaceElement(element);
	   e = this.elementids[id];
	   if (!refreshelementids.has(e?.id)) continue;
	   this.SetFlag(e, 'readonly') ? target.classList.add('readonlyfilter') : target.classList.remove('readonlyfilter');
	   if (ELEMENTTEXTTYPES.includes(e.type)) this.SetFlag(e, 'readonly') ? element.setAttribute('readonly') : element.removeAttribute('readonly', '');
	   if (['readio', 'checkbox'].includes(e.type)) this.SetFlag(e, 'readonly') ? element.setAttribute('disabled') : element.removeAttribute('disabled', '');
	   if (e.type !== 'button') continue;
	   if (!this.SetFlag(e, 'readonly') && this.props.control.push.elements.push([element].concat([...element.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]))) continue; // Set btn element (with all childs in) pushable for no readonly button
	   for (const i in this.props.control.push.elements)	// The button is readonly, so delete button pushable feature via removing btn DOM element from 'push' control.elements array
	       {
		    if (this.props.control.push.elements[i][0] !== element) continue;
		    delete this.props.control.push.elements[i];
		    break;
		   }
	  }
 }

 // Get interface element header+hint inner html for non title/button/padbar element types only
 GetElementHeaderHTML(e)
 {
  if (e.type === 'title' || e.type === 'button' || !e.id || !e.head) return ''; // No header for title, button, pad bar (select element with zero id) and empty head string
  let head, hint;
  [head, ...hint] = e.head.split(FIELDSDIVIDER);
  head = AdjustString(head, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS);
  if (hint) head += ` <span title="${AdjustString(hint.join(FIELDSDIVIDER), TAGATTRIBUTEENCODEMAP)}" class="hint-icon">?</span>&nbsp;`;
  return head ? `<div class="element-headers">${head}</div>` : '';
 }

 // Get interface element divider line inner html for non title/button/padbar element types only. Depends on element flag '*' presence
 GetElementFooterHTML(e)
 {
  return (e.type === 'title' || e.type === 'button' || !e.id) ? '' : `<div${this.SetFlag(e, 'underline') ? ' class="divider"' : ''}></div>`;
 }

 // Get interface element content outer html
 GetElementContentHTML(e, inner)
 {
  if (!e) return '';																																// Return empty for undefined interface element
  const readonly = SetFlag(e, 'readonly');
  const uniqeid = `${this.id + '_' + e.id}`;																										// Set element uniq identificator (in context of of all global boxes with its elements) based on its parent dialog box id and element id of itself
  const dataattribute = `data-element="${uniqeid}"`;																									// Set html attribute to access this uniq id
  const styleattribute = e.style ? ` style="${AdjustString(e.style, TAGATTRIBUTEENCODEMAP)}"` : ``;
  const classlist = readonly ? 'readonlyfilter' : '';
  let content = '';																																	// Element some content var

  switch (e.type)
         {
          case 'title':
			   if (typeof e.data !== 'string') return ''; // Text data is undefined (non string)? The title is hidden, so return empty
	    	   return `<div class="title"${styleattribute}>${AdjustString(e.data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}</div>`;				// Empty title string? Whole title element is invisible

		  case 'select':
			   if (!e.options.length) return '';																									// No options for selectable element? Return empty
			   let optionicon = '';
			   let activeoption = GetElementOption(e.options);
			   if (activeoption.clonable) optionicon += '<div class="itemadd" title="Clone this dialog profile">&nbsp&nbsp&nbsp&nbsp</div>';			// Define 'clone' icon for the active profile
			   if (activeoption.removable) optionicon += '<div class="itemremove" title="Remove this dialog profile">&nbsp&nbsp&nbsp&nbsp</div>';		// Define 'remove' icon for the active profile
			   if (e.id) // No pad selection (id > 0)
				  {
				   classlist += `${classlist ? ' ' : ''}` + 'select arrow' + `${SetFlag(e, 'sort').includes('descending') + SetFlag(e, 'sort').includes('alphabetical') * 2}` + `${typeof e.data === 'object' ? ' profileselectionstyle' : ''}`;
				   if (optionicon) return `<div class="flexrow" ${dataattribute}><div class="${classlist}"><div value="${activeoption.id}"${style}>${activeoption.inner}</div></div>${optionicon}</div>`;
				    else return `<div class="${classlist}" ${dataattribute}><div value="${activeoption.id}"${style}>${activeoption.inner}</div></div>`;
				  }
				else // Pad selection (id = 0)
				  {
				   classlist = optionicon ? 'activepad flexrow' : 'activepad';
				   for (const option of e.options)																										// For pad selection element (pad bar) collect pad divs to 'content' var
					   content += `<div class="${option.checked ? classlist : 'pad'}" value="${option.id}">${optionicon && option.checked ? '<div>' : ''}${option.inner}${optionicon && option.checked ? '</div>' + optionicon : ''}</div>`;
				   return inner ? content : `<div class="padbar flexrow" ${attribute}${style}>${content}</div>`;
				  }

		  case 'multiple':
			   if (!e.options.length) return '';																									// No options for selectable element? Return empty
			   for (const option of e.options)
				   content += `<div value="${option.id}"${option.checked ? ' class="selected"' : ''}>${option.inner}</div>`;	// For multiple selection element collect option divs
			   return `<div class="select ${classlist}" ${dataattribute}${style}>${content}</div>`;																																			// Return div wraped content

		  case 'checkbox':
		  case 'radio':
			   if (!e.options.length) return ''; // No options for selectable element? Return empty
			   for (const option of e.options) // For checkbox/readio element types collect input and label tags
				   content += `<input type="${e.type}" class="${e.type}" ${option.checked ? ' checked' : ''}${readonly ? ' disabled' : ''} name="${uniqeid}" id="${uniqeid + '_' + option.id}" value="${option.id}"><label for="${uniqeid + '_' + option.id}" value="${option.id}">${option.inner}</label>`;
			   return `<div ${classlist ? 'class="' + classlist + '"' : ''}${attribute}${style}>${content}</div>`;

		  case 'textarea':
		  case 'text':
		  case 'password':
			   if (typeof e.data !== 'string') return ''; // Text data is undefined (non string)? Return empty
			   let placeholder = this.SetFlag(e, 'placeholder'); // Get placeholder string
			   if (placeholder) placeholder = ` placeholder="${AdjustString(placeholder, TAGATTRIBUTEENCODEMAP)}"`;	// Placholder attribute for text elements
			   if (e.type === 'textarea') return `<textarea type="textarea" class="textarea ${classlist}" ${dataattribute}${readonly ? ' readonly' : ''}${placeholder}${style}>${AdjustString(e.data, HTMLINNERENCODEMAP)}</textarea>`;	// For textarea element type return textarea tag
			    else return `<input type="${e.type}" class="${e.type} ${classlist}" ${dataattribute}${readonly ? ' readonly' : ''} value="${AdjustString(e.data, TAGATTRIBUTEENCODEMAP)}"${placeholder}${style}>`; // For text/password element types return input tag with appropriate type

		  case 'table':
			   if (e.data && typeof e.data === 'object') for (const row in e.data)
				  {
				   if (!e.data[row] || typeof e.data[row] !== 'object') continue;
				   content += '<tr>';
				   for (const cell in e.data[row]) content += `<td class="boxtablecell${cell[0] === '_' ? ' cursorpointer" data-id="' + AdjustString(cell, TAGATTRIBUTEENCODEMAP) + '"' : '"'}>${AdjustString(e.data[row][cell], HTMLINNERENCODEMAP)}</td>`;
				   content += '</tr>';
				  }
			   return content ? `<table class="boxtable" ${dataattribute}${style}><tbody>${content}</tbody></table>` : '';

	 	  case 'button':
			   if (typeof e.data !== 'string') return '';																		// Button is hidden? Return empty
			   content = ${AdjustString(e.data, HTMLINNERENCODEMAP)}${GetTimerString(e)};
	      	   return inner ? content : `<div class="button ${classlist}" ${attribute}${style}>${content}</div>`;
		 }
 }
 
 // Function calculates the timer, applies the button if needed and refreshes button text with the new timer in seconds
 ButtonTimer()
 {
  clearTimeout(this.NodeList.autoapplybutton.timeoutid); // Clear timer function
  if (new Date().getTime() - this.NodeList.autoapplybutton.timerstart > this.NodeList.autoapplybutton.timer) this.ButtonApply(this.NodeList.autoapplybutton.e);	// Timer is up? Apply the button
   else this.NodeList.autoapplybutton.timeoutid = setTimeout(() => this.ButtonTimer(), 1000); 							// Restart timer function otherwise
  if (this.NodeList.autoapplybutton.target) this.NodeList.autoapplybutton.target.innerHTML = GetElementContentHTML(this.NodeList.autoapplybutton.e, true); // Refresh button
 }

 GetDialogInner(inner, profile = this.data, padarea)
 {
  for (const name in profile)
	  {
	   const e = profile[name];
	   const outer = this.GetElementHeaderHTML(e) + this.GetElementContentHTML(e) + this.GetElementFooterHTML(e);
	   if (e.type === 'title') inner.title = outer;
	   if (e.type === 'button') inner.footer += outer;
	   if (['title', 'button'].includes(e.type)) continue
	   if (e.id) padarea ? inner.padarea += outer : inner.mainarea += outer;
		else (e.type === 'select' && typeof e.data === 'object') ? inner.padbar += outer : inner.mainarea += outer;
	   if (e.type !== 'select' || typeof e.data !== 'object') continue;
	   for (const option in e.data) GetDialogInner(e.data[option], inner, e.id ? padarea : true);
	  }
 }

 ShowDialogBox()
 {
  let inner = { title: '', padbar: '', padarea: '', mainarea: '', footer: '' };
  this.GetDialogInner(inner);
  if (inner.padarea || inner.mainarea) inner.padbar += `<div class="boxcontentwrapper">${inner.padarea}${inner.mainarea}</div>`;
  if (inner.footer) inner.footer = `<div class="footer">${inner.footer}</div>`;
  inner.title += inner.padbar + inner.footer;
  if (!inner.title) return;
  this.elementDOM.innerHTML = inner.title;

  if (!this.NodeList) this.NodeList = {};
  for (const prop in this.NodeList)
	  if (prop === 'autoapplybutton') delete this.NodeList.autoapplybutton.target; else delete this.NodeList[prop];

  for (const target of [...this.elementDOM.querySelectorAll('.title, .padbar, input, textarea, .select, .boxtable, .button')])
	  {
	   if (target.tagName === 'INPUT') target.addEventListener('input', this.Handler.bind(this));
	   let e, id;
  	   [id, target] = GetEventTargetInterfaceElement(target);															// Define the clicked element 'id' and its wrapped target
  	   if (!(e = this.elementids[id])) continue;
	   if (e.type === 'title') this.NodeList.title = target;
	   if (!e.id) this.NodeList.padbar = target;
	   if (SetFlag(e, 'autoapply'))
	   if (this.NodeList.autoapplybutton)
		  {
		   if (this.NodeList.autoapplybutton.e.id === e.id) this.NodeList.autoapplybutton.target = target;
		  }
		else
		  {
		   this.NodeList.autoapplybutton = { target: target, timer: Math.min(SetFlag(e, 'autoapply'), BUTTONTIMERMAXSECONDS * 1000), timerstart: new Date().getTime(), timeoutid: setTimeout(() => this.ButtonTimer(), 1000), e: e  };
		  }
	  }
 }

 ShowDialogBox1()
 {
  delete this.currenttitleid;																								// Init title id to store current active profile title
  this.currentbuttonids = [];																								// Init empty array to store all active profile bundle specific button ids
  if (!this.profile.length) return delete this.props.control.drag.elements;													// No valid dialog content? Delete box draggable elements (title) and return
  let e;

  // Define dialog box content inner HTML code via root (pad) profile recursive passing through. Additionally calculate current title element and buttons list
  let content = `<div class="boxcontentwrapper">${this.GetCurrentProfileHTML(this.profile[GetElementOptionByChecked(this.allelements[0].options)[3]], true)}</div>`;

  // Define title inner HTML via current or default one
  let title = this.GetElementContentHTML(this.allelements[this.currenttitleid === undefined ? this.defaulttitleid : this.currenttitleid]);

  // Define padbar inner HTML
  let padbar = this.GetElementContentHTML(this.allelements[0]);

  // Define footer inner HTML
  if (!this.currentbuttonids.length) this.currentbuttonids = this.defaultbuttonids;											// No active profile bundle specific buttons? Use default button list with non specific ones
  if (this.autoapplybuttonelement === undefined) for (const id of this.currentbuttonids)									// No auto apply button ever defined? Parse all current buttons on their auto apply feature (flags +|-)
	 {
	  e = this.allelements[id];																								// Fix current button element
	  if (e.flag.indexOf('+') === -1) continue;																				// The button has no auto apply feature? Continue or calculate the timer and execute auto apply otherwise
	  e.timer = e.flag.split('+').length - 1;																				// Calculating timer seconds number
	  if (e.timer > 300) e.timer = (e.timer - 295) * 60;																	// Timer is more than 300? Interpret timer value as a minutes and convert it to seconds
	  e.timer = 1000 * Math.min(e.timer, BUTTONTIMERMAXSECONDS);															// Convert button auto-apply timer to milliseconds for 'setTimeout'
	  e.timerstart = new Date().getTime();																					// Store current time value in milliseconds since midnight, January 1, 1970
	  this.autoapplybuttontimeoutid = setTimeout(() => this.ButtonTimer(), 1000);											// Execute button timer in one second
	  this.autoapplybuttonelement = e;																						// Store this btn id to exclude all other auto apply btns if exist
	  break;
    }
  if (this.autoapplybuttonelement !== undefined && this.currentbuttonids.indexOf(this.autoapplybuttonelement.id) === -1)	// Auto apply button doesn't exist in current btns array? Add it
	 this.currentbuttonids.push(this.autoapplybuttonelement.id);
  let footer = '<div class="footer">';																						// Fill dialog box footer with current btns html content wraped in div tag
  for (const id of this.currentbuttonids) footer += this.GetElementContentHTML(this.allelements[id]);
  footer += '</div>';

  //  Set dialog box DOM element inner html
  this.elementDOM.innerHTML = title + padbar + content + footer;

  // Fix dialog box sections
  this.title = this.elementDOM.querySelector('.title')
  this.padbar = this.elementDOM.querySelector('.padbar');
  this.contentwrapper = this.elementDOM.querySelector('.boxcontentwrapper');
  this.footer = this.elementDOM.querySelector('.footer');

  // Set 'fullscreendblclick' and 'drag' controls <elements> property
  if (this.props.control.fullscreendblclick || this.props.control.fullscreenicon || this.props.control.drag || this.props.control.closeicon)
	 {
	  const elements = this.title ? [this.title].concat([...this.title.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]) : [this.elementDOM];					// Calculate title (if exist) with all its children elements. Or child main DOM element
	  if (this.props.control.fullscreenicon) this.props.control.fullscreenicon.elements = [elements[0]];															// and set 1st element for fullscreen icon,
	  if (this.props.control.closeicon) this.props.control.closeicon.elements = [elements[0]];																		// set 1st element for close icon,
	  if (this.props.control.fullscreendblclick) this.props.control.fullscreendblclick.elements = elements;															// set <elements> array clickable for 'full screen'	feature
	  if (this.props.control.drag) this.props.control.drag.elements = elements;																						// and set them dragable
	  this.RefreshControlIcons();
	 }

  // Select all dialog btns for 'push' control and get 'autoapply' one
  for (let button of this.footer.querySelectorAll('.button'))
	  {
	   let id;
	   [id, button] = GetEventTargetInterfaceElement(button);																										// Define button id to retreive btn GUI element below
	   const e = this.allelements[id];
	   if (e.flag.indexOf('-') === -1) this.props.control.push.elements.push([button].concat([...button.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]));	// Set queried btn element (with all childs in) pushable. For enabled btns only
	   if (this.autoapplybuttonelement !== undefined && +id === this.autoapplybuttonelement.id) this.autoapplybuttonDOMelement = button;							// The btn is auto apply? Set <autoapplybuttonDOMelement> to use it for timer refresh
	  }

  // Set focus to the first found text element
  setTimeout(this.SetFirstTextElementFocus.bind(this), 1);

  // Remove ald and add new event listeners for textable/selectable elements to save their data interactively
  if (this.InputNodeList) this.InputNodeList.forEach((node) => node.removeEventListener('input', this.Handler.bind(this)));
  this.InputNodeList = this.contentwrapper.querySelectorAll('input, textarea');
  this.InputNodeList.forEach((node) => node.addEventListener('input', this.Handler.bind(this)));

  // Modify all user element paths depending on active profile bundles
  this.ModifyElementPathActiveProfiles();
 }



 // Set focus to the '1st found' in child non-readonly text element 
 SetFirstTextElementFocus()
 {
  if (!this.elementDOM) return;
  for (const element of this.elementDOM.querySelectorAll('input[type=password], input[type=text], textarea'))
	  if (!element.readOnly) return element.focus();
 }

 // Clone all input profile GUI elements except 'title' and 'button' types
 CloneCurrentProfileElements(profile, newprofilename, pathnestedindex)
 {
  if (!Array.isArray(profile)) return;
  for (const id of profile) 
	  {
	   if (Array.isArray(id) && !this.CloneCurrentProfileElements(id, newprofilename, pathnestedindex)) continue;
	   let e = this.allelements[id];
	   if (!e || e.type === 'title' || e.type === 'button' || e.selectionid !== undefined) continue;
	   this.propmaxindex++;
	   const path = e.path.split(SELECTABLEOPTIONSDIVIDER);
	   path[pathnestedindex] = newprofilename;
	   const re = new RegExp(`^!|\\${PROFILEFIELDSDIVIDER}.*`, 'g');
	   for (const i in path) if (i < pathnestedindex) path[i] = path[i].replace(re, '');
	   e = Object.assign({}, e, { path: path.join(SELECTABLEOPTIONSDIVIDER) });
	   for (const prop in e)
		   if (ELEMENTUSERPROPS.indexOf(prop) === -1) delete e[prop];							// Clear element from unnecessary props
	   e.flag = typeof e.flag === 'string' ? '~' + e.flag : '~';								// Add 'cloned element' mark to the flag property
	   this.PushInterfaceElement(this.data[this.propmaxindex] = e, this.propmaxindex + '');
	   delete e.expr;
	   delete e.affect;
	   if (e.options) CorrectCheckedOptions(e.options, e.type);
	  }
 }

 // Handle 'clone' button
 ProcessCloneButton()
 {
  const activeprofileoption = GetElementOptionByChecked(this.profilecloning.e.options);																		// Get active profile option in selectable element
  const cloningprofilename = activeprofileoption[0];																										// Get profile name to clone. To compare with input name below
  const newprofile = {};																																	// Init new profile object
  const re = new RegExp(`\\${SELECTABLEOPTIONSDIVIDER}`, 'g');
  [newprofile.name, newprofile.flag, newprofile.head, newprofile.hint] = this.profilecloning.input.value.replaceAll(re, '').split(PROFILEFIELDSDIVIDER, 4);	// Parse input element to get new profile name/flag/head/hint
  if (newprofile.name[0] === CHECKEDOPTIONPREFIX) newprofile.name = newprofile.name.substring(1);															// Check profile name 1st char to get prfile active status
  for (const option of this.profilecloning.e.options)
  	  if (option[0] === newprofile.name)
		 {
		  new DialogBox(...MessageBox(this.parentchild, `Profile name '${newprofile.name}' already exists!`, 'Clone error'));								// Cloning profile name matches new profile name? Return
		  return;
		 }
  newprofile.flag = (newprofile.flag || '').replaceAll(/!/g, '');																							// Remove selection-id '!' chars
  newprofile.flag = newprofile.flag.padStart(this.profilecloning.e.selectionid + newprofile.flag.length, '!');												// Add cloning profile selection id to the new profile flag to match cloning selection id
  if (newprofile.flag) newprofile.flag = '|' + newprofile.flag;
  newprofile.head = newprofile.head === undefined ? '' : `|${newprofile.head}`;
  newprofile.hint = newprofile.hint === undefined ? '' : `|${newprofile.hint}`;
  this.CloneCurrentProfileElements(this.profilecloning.e.profile[activeprofileoption[3]], newprofile.name + newprofile.flag + newprofile.head + newprofile.hint, this.profilecloning.e.path.split(SELECTABLEOPTIONSDIVIDER).length - 1);
  for (const e of this.allelements) if (e.options && e.selectionid !== undefined) CorrectCheckedOptions(e.options, e.type);									// New profile user selectable elements are all with corrected checked options (see last line of function CloneCurrentProfileElements). But not service selectable elements (such as profile selection) in just created profile. So correct their checked optoins.
  return this.profilecloning.e.id;
 }

 RemoveProfileCloneInput()
 {
  this.profilecloning.isDeleted = true;																					// Set profilecloning object 'isDeleted' flag to true
  if (this.profilecloning.e.id !== 0) this.profilecloning.wrapdiv.parentNode.firstChild.style.display = 'block';		// For non-pad prfile clone display back 'select' DOM element
  this.profilecloning.input.removeEventListener('blur', this.Handler.bind(this));										// Remove event listener from 'input' DOM element
  this.profilecloning.wrapdiv.remove();																					// Remove input string DOM elements
  this.profilecloning.input.remove();
  if (this.profilecloning.e.id === 0)
  	 {
	  this.padbar.outerHTML = this.GetElementContentHTML(this.allelements[0]);											// Cloning dialog pad? Refresh pad bar
  	  this.padbar = this.elementDOM.querySelector('.padbar');
	 }
  delete this.profilecloning;																							// Delete profilecloning object
 }

 // Inheritance function that is called on mouse/keyboard events on dialog box
 Handler(event)
 {
  let e, id, target;
  [id, target] = GetEventTargetInterfaceElement(event.target);															// Define the clicked element 'id' and its wrapped target
  if (!(e = this.allelements[id])) return;																				// Return for nonexistent element

  switch (event.type)
         {
	  	  case 'blur':
			   if (this.profilecloning && !this.profilecloning.isDeleted)
				  {
				   const profileelement = this.allelements[this.ProcessCloneButton()];
				   this.RemoveProfileCloneInput();
				   if (profileelement && ChangeElementOptionById(profileelement.options, profileelement.options.length - 1)) this.ShowDialogBox();
				  }
			   return {};
	  	  case 'keydown':																									// Enter key for btn-apply/profile-cloning or left/right arrow key with Alt+Ctrl hold for pad selection
	       	   if (event.code === 'Escape' && this.profilecloning)
				  {
				   this.RemoveProfileCloneInput();
				   return {};
				  }
			   break;
	  	  case 'keyup':																									// Enter key for btn-apply/profile-cloning or left/right arrow key with Alt+Ctrl hold for pad selection
			   if (event.code === 'Enter' || event.code === 'NumpadEnter')
		  		  {
				   if (this.profilecloning)
					  {
					   const profileelement = this.allelements[this.ProcessCloneButton()];
					   this.RemoveProfileCloneInput();
					   if (ChangeElementOptionById(profileelement.options, profileelement.options.length - 1)) this.ShowDialogBox();
					   return {};
					  }
				   if ((e.type === 'text' || e.type === 'password') && e.flag.indexOf('-') === -1)						// For 'text' type and no readonly elements only
				   	  {
					   for (id of this.callbuttonids)																	// Go through all callable btns and apply first non readonly one
					   	   if (this.ButtonApply(this.allelements[id])) return {};
					  }
		       	  }
	       	   if (event.code === 'ArrowLeft' && event.altKey && event.shiftKey)
		  		  {
				   if (!ShiftElementOption(this.allelements[0].options, -1, true)) this.ShowDialogBox();				// Option has been changed? Refresh dialog content with a new active profile
				   return {};
		       	  }
			   if (event.code === 'ArrowRight' && event.altKey && event.shiftKey)
				  {
				   if (!ShiftElementOption(this.allelements[0].options, 1, true)) this.ShowDialogBox();					// Option has been changed? Refresh dialog content with a new active profile
				   return {};
				  }
		  case 'input':
			   if (ELEMENTTEXTTYPES.indexOf(e.type) !== -1)
				  {
				   e.data = target.value;																				// Get text element data directly from its DOM element value
				   this.EvalElementExpression(e);
				   break;
				  }
			   if (ELEMENTSELECTABLETYPES.indexOf(e.type) !== -1)
				  {
				   switch (e.type)
						  {
						   case 'radio':
								if (!ChangeElementOptionById(e.options, event.target.attributes?.value?.value)) break;
								e.data = CreateElementOptionsData(e.options);
								this.EvalElementExpression(e);
								break;
						   case 'checkbox':
								if (!ToggleElementOptionById(e.options, event.target.attributes?.value?.value)) break;
								e.data = CreateElementOptionsData(e.options);
								this.EvalElementExpression(e);
								break;
						  }
				   break;
				  }
			   break;
		  case 'textchange':
			   target.value = JSON.stringify(arguments[1]);
			   break;
	  	  case 'mousedown':																								// Mouse any button down on element (event.which values: 1 - left mouse btn, 2 - middle btn, 3 - right btn)
			   if (event.button === 0 && event.buttons === 3)															// Left button down with right button hold?
				  {
			   	   if (e.type === 'text' || e.type === 'textarea') 
					  {
					   let dialogdata;
					   try { dialogdata = JSON.parse(e.data); }
					   catch { return; }
					   new DialogBox(dialogdata, this.parentchild, { effect: 'rise', position: 'CENTER', overlay: 'MODAL', callback: this.Handler.bind(this, { type: 'textchange', target: event.target }) }, { class: 'dialogbox selectnone' });
					   break;
					  }
				   if (ELEMENTSELECTABLETYPES.indexOf(e.type) === -1) break;											// Sort order change for selectable element types only
			   	   if (event.target.classList.contains('itemadd')) break;												// and for non profile clone icon click
			   	   if (event.target.classList.contains('itemremove')) break;											// and for non profile remove icon click
			   	   // Right with left btn held change sort order:
				   //e.flag.indexOf('^') === -1 ? e.flag += '^' : e.flag = e.flag.indexOf('a') === -1 ? (e.flag + 'a').replaceAll(/\^/g, '') : e.flag.replaceAll(/a|\^/g, '');
				   this.SetFlag(e, 'sort', true);
				   target.outerHTML = this.GetElementContentHTML(e);
				   if (e.id === 0) this.padbar = this.elementDOM.querySelector('.padbar');
				   break;
				  }
			   if (event.button === 0 && event.buttons === 1)															// Left button down with no any other button hold?
		       switch (e.type)
				  	  {
					   case 'multiple':
							if (e.flag.indexOf('-') !== -1) break;														// Break for readonly element
							if (!ToggleElementOptionById(e.options, event.target.attributes?.value?.value)) break;		// Toggle clicked option and break in case of no change
							event.target.classList.toggle("selected");													// Refresh 'multiple' element via option class toggle
							e.data = CreateElementOptionsData(e.options);
							this.EvalElementExpression(e);
							break;
					   case 'select':
							if (e.flag.indexOf('-') !== -1) break;														// Break for readonly element
							if (this.profilecloning) break;
							if (event.target.classList.contains('itemadd'))												// Mouse down on profile clone/remove icon? Do nothing, process it at mouse up event
							   {
								//new DialogBox({ prop: { type: 'checkbox', data: 'clonable' + SELECTABLEOPTIONSDIVIDER + '!removable', head: 'Select new profile clone/remove capability', flag: '*'}, name: { type: 'text', data: '', head: 'Enter cloning profile new name', hint: `All content elements from the cloning profile (except 'button' and 'title') will be copied to the new profile name wich should be uniq, otherwise the cloning procedure will be failed. Press 'Enter' to clone or 'Esc' to cancel`, flag: '' }, _ok: { type: 'button', data: '  OK  ', head: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;` }, cancel: { type: 'button', data: 'CANCEL', head: `border: 1px solid rgb(254,153,128); color: rgb(254,153,128); background-color: transparent; font: 12px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;` }, title: { type: 'title', data: 'Clone profile ', head: `background-color: rgb(240,240,240); font: 14px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;`}, }, this.parentchild, {flags: CMCLOSE | CMFULLSCREEN | CLOSEESC, effect: 'rise', position: 'CENTER', overlay: 'MODAL'}, {class: 'dialogbox selectnone', style: 'background-color: rgb(255,255,255);'}, this.ProcessProfileClone.bind(this));
								//break;
								this.profilecloning = { e: e, wrapdiv: document.createElement('div'), input: document.createElement('input') };
								this.profilecloning.wrapdiv.appendChild(this.profilecloning.input);
								this.profilecloning.input.addEventListener('blur', this.Handler.bind(this));
								if (e === this.allelements[0])
								   {
									this.profilecloning.wrapdiv.classList.add('pad');
									this.profilecloning.wrapdiv.style.width = '100%';
									target.appendChild(this.profilecloning.wrapdiv);
								   }
								 else
								   {
									target.firstChild.firstChild.style.display = 'none';
									target.firstChild.appendChild(this.profilecloning.wrapdiv);
								   }
								this.profilecloning.input.classList.add('newprofileinput');
								this.profilecloning.input.setAttribute('placeholder', e.flag.indexOf('%') === -1 ? 'Enter profile name' : AdjustString(e.flag.substr(e.flag.indexOf('%') + 1), TAGATTRIBUTEENCODEMAP));
								setTimeout(() => this.profilecloning.input.focus(), 0);
								break;
							   }
							if (event.target.classList.contains('itemremove'))											// Mouse down on profile clone/remove icon? Do nothing, process it at mouse up event
							   {
								this.ProcessRemoveButton(e);
								break;
							   }
							if (e === this.allelements[0])
						   	   {
								if (!ChangeElementOptionById(e.options, event.target.attributes?.value?.value)) break;	// Set clicked pad and break in case of no change
								this.ShowDialogBox();
								break;
						   	   }
							if (this.dropdownlist?.hideeventid !== app.eventcounter)									// Drop-down list is hidden via current 'select' element click (this.dropdownlisthide_eventcounter === app.eventcounter)?
							   this.dropdownlist = new DropDownList(e.options, this, target.firstChild);				// Do nothing or create new option list box again otherwise.
							break;
					  }
			   break;
		  case 'optionchange':
			   if (!ChangeElementOptionById(e.options, this.dropdownlist.cursor)) break;
			   if (e.selectionid === undefined)
				  {
				   target.outerHTML = this.GetElementContentHTML(e);
				   e.data = CreateElementOptionsData(e.options);
				   this.EvalElementExpression(e);
				   break;
				  }
			   this.ShowDialogBox();
			   break;
		  case 'click':
			   if (e.type === 'button')
		      	  {
			       if (this.currentbuttonids.indexOf(e.id) !== -1) this.ButtonApply(e);									// Button id does exist in current profile bundle? Call button apply for the button id in case
			       break;
		      	  }
	       	   break;
		 }
 }
 
 // Remove all input profile GUI elements
 RemoveCurrentProfileElements(profile)
 {
  if (!Array.isArray(profile)) return;
  //for (const id of profile) 
	  //Array.isArray(id) ? this.RemoveCurrentProfileElements(id) : delete this.data[this.allelements[id]['prop']];
  for (const id of profile) 
	  if (Array.isArray(id)) 
		 {
		  this.RemoveCurrentProfileElements(id);
		 }
	   else
	     {
		  if (id === this.autoapplybuttonelement?.id)
			 {
			  delete this.autoapplybuttonelement;
			  clearTimeout(this.autoapplybuttontimeoutid);
			 }
		  delete this.data[this.allelements[id]['prop']];
		 }
 }

 // Handle 'remove' button
 ProcessRemoveButton(e)
 {
  const activeprofileoption = GetElementOptionByChecked(e.options);	
  this.RemoveCurrentProfileElements(e.profile[activeprofileoption[3]]);
  
  this.InitDialogData();					// Init dialog data
  this.ClearDialogDataFromServiceProps();	// Delete unnecessary element props
  this.CreateDialogData();					// Create dialog data
  this.ShowDialogBox();						// Show dialog data (dialog box:)
 }
 
 // Delete service element props
 ClearDialogDataFromServiceProps()
 {
  for (const i in this.data)
	  for (const prop of ELEMENTSERVICEPROPS)
		  delete this.data[i].prop;
 }

 ButtonApply(e)
 {
  if (e?.flag.indexOf('-') !== -1) return;													// Do nothing for 'readonly' (disabled) btns
  if (this.callbuttonids.indexOf(e.id) !== -1 && this.props.callback)						// Applied btn id is controller callable? Save all dialog data and call the controller
     {
	  this.ClearDialogDataFromServiceProps();												// Delete unnecessary element props
  	  this.ModifyElementPathActiveProfiles();												// Modify all user element paths depending on active profile bundles
	  this.props.callback(this.data);														// Call back function to process dialog data or lg('Calling controller with data', this.data);
     }
  if (this.allelements[e.id].flag.indexOf('!') === -1)										// Button is not interactive? Kill drop-down list if exist and dialog box of itself
  	 {
	  if (this.dropdownlist && this.parentchild.childs[this.dropdownlist.id]) this.parentchild.KillChild(this.dropdownlist.id);
  	  this.parentchild.KillChild(this.id);
 	 }
  return true;
 }
}