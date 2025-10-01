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
//			  			 		  interactive char (*) means no hide dialog after button apply, for appliable buttons only - no controller call action made with interactive flag makes no sense cause no dialog kill even made.
//   							  timer in seconds the button will be applied on automatically. Number of chars '+' is number of timer minutes, chars '-' - seconds. In any order. For a example timer string '+-+' equals 121 seconds.
//										Once the auto-apply button appeares in the profile bundle the auto-apply feature is turned on and does exist regardless of button current profile appearance.
//								  grey style readonly button (!)
// 						 'expr' - See text type description. In case of true expr expression the button becomes grey.

// Todo2 - Элементы с diaplay flex "наезжают" на margin нижестоящего элемента div
// Todo2 - Multuiple flag * creates rounded area arount GUI element. 
// Todo2 - Review all css props, its content props, some for builtin conf (index.html), some for configurable GUI via user customization
// Todo2 - make "cursor: not-allowed;" for disabled buttons like in VMWARE vcenter
// Todo1 - icon control for pad area sort order
// Todo0 - don't forget to pause button apply here to prevent user flood pushing apply btns. This functionality remove to queue manager to protect controller call flood
// Todo0 - what if regexp in 'expr' contains '/' char? May be ignore regexp string end at these two chars: '\/' ?

import { AdjustString, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS, TAGATTRIBUTEENCODEMAP, lg, MessageBox } from './constant.js';
import { app } from './application.js';
import { Interface } from './interface.js';
import { DropDownList } from './dropdownlist.js';

const EMPTYOPTIONTEXT					= ' ';
const DIALOGSELECTABLEELEMENTMAXOPTIONS	= 1024;
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
const DIALOGBOXMACROSSTYLE				= { SIDE_MARGIN: '10px', ELEMENT_MARGIN: '10px', HEADER_MARGIN: '5px', TITLE_PADDING: '5px', BUTTON_PADDING: '10px', FONT: 'Lato, Helvetica' };
const INITSERVICEDATA					= 0b10000; 
const CHECKDIALOGDATA					= 0b01000; 
const PARSEDIALOGDATA					= 0b00100; 
const SHOWDIALOGDATA					= 0b00010; 
const PARSEEXPRESSIONS					= 0b00001; 

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
      if (e.options.length >= DIALOGSELECTABLEELEMENTMAXOPTIONS) break;	// Options number exceeds max allowed? Break
	  origin = Array.isArray(list) ? list[origin] : origin;				// Get full option name with flags and style joined via divider
	  [name, flag, ...style] = origin.split(FIELDSDIVIDER);			// Split it to get option name without flags, flag and style
	  if (typeof e.data === 'object')
		 {
		  if (names.has(name) && delete e.data[origin]) continue;		// Option name (profile) without flags has already exist in e.data profile list? Delete it and continue
	  	  names.add(name);
	  	 }
	  e.options.push({	id: e.options.length + '',					// Push option object with all its values and flags
						origin: origin,
					   	name: name,
					   	inner: AdjustString(name ? name : EMPTYOPTIONTEXT, HTMLINNERENCODEMAP),
					   	checked: (flag || '').includes(OPTIONISCHECKED),
					   	clonable: (flag || '').includes(OPTIONISCLONABLE) && typeof e.data === 'object',
					   	removable: (flag || '').includes(OPTIONISREMOVABLE) && typeof e.data === 'object',
					   	cloned: (flag || '').includes(OPTIONISCLONED) && typeof e.data === 'object',
					   	style: style.length ? style.join(FIELDSDIVIDER) : '',
					   	styleattribute: style.length ? ` style="${style.join(FIELDSDIVIDER)}"` : `` });
     }
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

// Function sets flag <name> to <value> of element <e>. Or return element <e> current flag value in case of undefined <value> arg
function SetFlag(e, name, value)
{
 let flag, placeholder = e.flag.indexOf('+');
 if ((ELEMENTTEXTTYPES.includes(e.type) || e.type === 'select') && placeholder !== -1)
	{
	 flag = e.flag.substring(0, placeholder);
	 placeholder = AdjustString(e.flag.substring(placeholder), TAGATTRIBUTEENCODEMAP);
	}
  else
	{
	 flag = e.flag;
	 placeholder = '';
	}

 switch (name)
		{
		 case 'readonly':
			  if (value === undefined) return flag.includes('!');
			  e.flag = value ? flag + '!' : flag.replaceAll('!', '');
			  e.flag += placeholder;
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
	".padbar": { "background-color": "transparent;", "border": "none;", "padding": "4px 4px 0 4px;", "margin": "10px 0 20px 0;" },
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
	".readonlyfilter": { "filter": "opacity(50%);", "_filter": "Dialog box readonly elements css filter property to apply to, see appropriate css documentaion.", "cursor": "not-allowed !important;" },
	//------------------------------------------------------------
	// dialog box select
	".select": { "background-color": "rgb(243,243,243);", "color": "#57C;", "font": `.8em ${DIALOGBOXMACROSSTYLE.FONT};`, "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "outline": "none;", "border": "1px solid #777;", "padding": "0px 0px 0px 0px;", "overflow": "auto;", "max-height": "150px;", "min-width": "24em;", "width": "auto;", "display": "inline-block;" },
	// dialog box select option
	".select > div": { "padding": "2px 20px 2px 5px;", "margin": "0px;" },
	// dialog box select option hover
	".select:not([class*=arrow]) > div:hover": { "background-color": "rgb(211, 222, 192);", "color": "" },
	// dialog box select option selected
	".selected": { "background-color": "rgb(211, 222, 192);", "color": "#fff;" },
	// Profile selection additional style
	".profileselectionstyle": { "font": `bold .8em ${DIALOGBOXMACROSSTYLE.FONT};`, "border-radius": "4px;" },
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
	"input[type=text]": { "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "none;", "color": "#57C;", "border-radius": "3px;", "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "width": "90%;", "min-width": "300px;" },
	// dialog box input password
	"input[type=password]": { "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "none", "color": "#57C;", "border-radius": "3px;", "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "width": "90%;", "min-width": "300px;" },
	// dialog box input textarea
	"textarea": { "margin": `0px ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN} ${DIALOGBOXMACROSSTYLE.ELEMENT_MARGIN} ${DIALOGBOXMACROSSTYLE.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "", "color": "#57C;", "border-radius": "3px;", "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "width": "90%;", "min-width": "300px;" },
 };

 // Init <elements> (element list), elementnames (element ids list via names) and <Nodes> keeping autoapply buttons alive to retreive its timer data after dialog refresh
 InitDialogServiceData()
 {
  this.elements = [];
  this.elementnames = {};
 }

 // Check all dialog interface elements and clear them from unnecessary props
 // Dialog data consists of some GUI elements with next types:
 // Gui elements can be set in any order, but first title appeard is default title.
 // { type: select, data: 
 //  					option1: { element1: {}, element2: {type: data:  }, element3: {}, }
 //  					option2: {..}
 // }
 ParseDialogData(profile, syntax, service = true)
 {
  let elementcount = 0;
  if (typeof profile === 'object') for (const elementname in profile)
  	 {
	  const e = profile[elementname];
	  if (e.type === 'select' && typeof e.data === 'object' && Array.isArray(e.options)) // Profile clone/remove breaks default appearance initial sort order for already inited selections, so set it back as it was at initial time
		 {
		  const flag = e.flag;
		  const newdata = {};
		  e.flag = '';
		  SortSelectableElementData(e);
		  for (const option of e.options) newdata[option.origin] = e.data[option.origin];
		  [e.data, e.flag] = [newdata, flag];
		}
	  if (syntax && !CheckElementSyntax(e) && delete profile[elementname]) continue;
	  if (e.type === 'select' && typeof e.data === 'object')
		 {
		  let optioncount = 0;
		  for (const i in e.data) optioncount < DIALOGSELECTABLEELEMENTMAXOPTIONS && this.ParseDialogData(e.data[i], syntax, service) ? optioncount++ : delete e.data[i]; // Options number exceeds max allowed or dialog parse returns no elements? Delete option
		  if (!optioncount && delete e.data) if (syntax && !CheckElementSyntax(e) && delete profile[elementname]) continue; // For zero option count delete 'data' prop and check element syntax again. So delete element of itself for no pass syntax check and continue
		 }
	  elementcount++;
	  if (!service) continue;
	  if (ELEMENTSELECTABLETYPES.includes(e.type)) CreateSelectableElementOptions(e);
	  if (ELEMENTSELECTABLETYPES.includes(e.type)) CorrectCheckedOptions(e);
	  if (ELEMENTSELECTABLETYPES.includes(e.type)) SortSelectableElementData(e); // Create parsed options array for selectable elements
	  this.elementnames[elementname] = e.id = this.elements.length;
	  e.name = elementname;
	  this.elements.push(e); // Insert user defined element to the 'allelements' global array
	  e.affect = new Set();	// Add empty set collection to all elements which data can affect to other elements readonly flag. Old version: if ([...ELEMENTSELECTABLETYPES, ...ELEMENTTEXTTYPES].includes(e.type)) e.affect = new Set();
	  if (elementcount === 1 && e.type === 'select' && typeof e.data === 'object' && profile === this.data) e.padbar = true;
	 }
  if (profile === this.data && !elementcount) this.data = {}; // No valid dialog structure? Set it empty
  return elementcount;
 }
 
 // Init dialog specific data with overriding 'data-element' attribute for dialog box DOM element to non-existent interface element id (-1) for the search to be terminated on. Call then parent constructor for the given args (data, parentchild, props, attributes)
 constructor(...args)
 {
  if (!args[2]?.control) args[2].control = { closeicon: {}, fullscreenicon: {}, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, push: {}, default: {}, closeesc: {} };
  args[3] = (args[3] && typeof args[3] === 'object') ? args[3] : {};
  args[3]['data-element'] = '_-1';
  super(...args);
  this.RefreshDialog(INITSERVICEDATA | CHECKDIALOGDATA | PARSEDIALOGDATA | SHOWDIALOGDATA | PARSEEXPRESSIONS);
 }

 // Refresh all dialog entities
 RefreshDialog(flag)
 {
  if (flag & INITSERVICEDATA) this.InitDialogServiceData();										// Init dialog data
  if (flag & PARSEDIALOGDATA) this.ParseDialogData(this.data, flag & CHECKDIALOGDATA);			// Parse dialog data :)
  if (flag & SHOWDIALOGDATA) this.ShowDialogBox();												// Show dialog data (dialog box:)
  if (flag & PARSEEXPRESSIONS) for (const e of this.elements) this.ParseElementExpression(e);	// Adjust all elements 'expr' property
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
	   if (!(name in this.elementnames) || typeof this.elements[this.elementnames[name]]['data'] !== 'string') return delete e.expr;	// Non existing element or element with undefined data? Return
	   this.elements[this.elementnames[name]]['affect'].add(e.id);													// Add parsing expression element id to the calculated element (via its property name above) affect list
	   elementids.add(this.elementnames[name]);																		// so add to the 'elementids' var too - just to clear its 'affect' in case of error expression
	   expression += match[0] + ".test(this.elements[this.elementnames['" + name + "']]['data'])";					// Collect new expression in js format to pass it to eval function
	   if (currentpos === -1) break;																				// The end of expression string is reached (index of space char to parse property name reached end of string), so break the cycle
	  }
  e.test = expression;
  this.EvaluateElementExpression([e.id]);
 }

 EvaluateElementExpression(expressionids)
 {
  if (!expressionids) return; // Return for unknown element with expression array
  const refreshelementids = new Set(); // Element ids to refresh (change readonly status)
  let e;
  for (const id of expressionids)
	  {
	   let result;
	   if (!(e = this.elements[id])) continue;
	   try { result = eval(e.test); }
	   catch { lg('Evaluation exception detected on element:', e); }
	   if (result === undefined) // Result is undefined in case of eval exception
		  {
		   delete e.expr; // Delete 'expr' property and this element id from all other elements which data prop affects to
		   delete e.test;
		   for (const element of this.elements) element.affect.delete(e.id);
		   continue;
		  }
	   if ([0, 2].includes(+SetFlag(e, 'readonly') + +result)) continue; // Continue for no readonly and falsy result (0 + 0) or readonly and true result (1 + 1)
	   SetFlag(e, 'readonly', result); // Otherwise set 'result' readonly status
	   refreshelementids.add(e.id); // and add this element id 'refresh' set
	  }
  this.RefreshElementReadonlyAttribute(refreshelementids); // Change element readonly status for 'refresh' set
 }

 RefreshElementReadonlyAttribute(refreshelementids)
 {
  if (!refreshelementids?.size) return;
  for (const id of refreshelementids)
	  {
	   let target;
	   const e = this.elements[id];
	   const readonly = SetFlag(e, 'readonly');
	   switch (e.type) // Defined target (DOM element) for every element type and do some specific DOM element actions (readonly/disabled attributes for input elements and 'push' control element set for buttons)
			  {
			   case 'text':
			   case 'textarea':
			   case 'password':
					if (!this.Nodes.textinputs[id]) continue;
					target = this.Nodes.textinputs[id];
					readonly ? target.setAttribute('readonly', '') : target.removeAttribute('readonly', '');
					break;
			   case 'select':
			   case 'multiple':
			   case 'radio':
			   case 'checkbox':
					if (!this.Nodes.selects[id]) continue;
					target = this.Nodes.selects[id];
					if (['radio', 'checkbox'].includes()) readonly ? target.setAttribute('disabled') : target.removeAttribute('disabled', '');
					break;
			   case 'table':
					if (!this.Nodes.tables[id]) continue;
					target = this.Nodes.tables[id];
					break;
			   case 'button':
					if (!this.Nodes.buttons[id]) continue;
					target = this.Nodes.buttons[id];
	   				if (!readonly) this.props.control.push.elements.push([target].concat([...target.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))])); // Set btn element (with all childs in) pushable for no readonly button
					 else for (const i in this.props.control.push.elements) if (this.props.control.push.elements[i][0] === target && delete this.props.control.push.elements[i]) break; // The button is readonly, so delete button pushable feature via removing btn DOM element from 'push' control.elements array
					break;
			  }
	   readonly ? target.classList.add('readonlyfilter') : target.classList.remove('readonlyfilter'); // Add/remove readonly class (filter, cursor)
	  }
 }

 // Get interface element header+hint inner html for non title/button/padbar element types only
 GetElementHeaderHTML(e)
 {
  if (e.type === 'title' || e.type === 'button' || !e.head || e.padbar) return ''; // No header for title, button, empty head string and padbar

  let head, hint;
  [head, ...hint] = e.head.split(FIELDSDIVIDER);
  head = AdjustString(head, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS);
  if (hint.length) head += `&nbsp<span title="${AdjustString(hint.join(FIELDSDIVIDER), TAGATTRIBUTEENCODEMAP)}" class="hint-icon">?</span>&nbsp;`;
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
  const readonly = SetFlag(e, 'readonly');
  const uniqeid = `${this.id + '_' + e.id}`;																										// Set element uniq identificator (in context of of all global boxes with its elements) based on its parent dialog box id and element id of itself
  const dataattribute = `data-element="${uniqeid}"`;																								// Set html attribute to access this uniq id
  const styleattribute = e.style ? ` style="${AdjustString(e.style, TAGATTRIBUTEENCODEMAP)}"` : ``;
  let classlist = readonly ? 'readonlyfilter' : '';
  let content = '';																																	// Element some content var

  switch (e.type)
         {
          case 'title':
			   if (typeof e.data !== 'string') return ''; // Text data is undefined (non string)? The title is hidden, so return empty
	    	   return `<div class="title" ${dataattribute}${styleattribute}>${AdjustString(e.data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}</div>`;// Empty title string? Whole title element is invisible

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
			   if (placeholder) placeholder = ` placeholder="${AdjustString(placeholder, TAGATTRIBUTEENCODEMAP)}"`;	// Placholder attribute for text elements
			   if (e.type === 'textarea') return `<textarea type="textarea" class="textarea ${classlist}" ${dataattribute}${readonly ? ' readonly' : ''}${placeholder}${styleattribute}>${AdjustString(e.data/*, HTMLINNERENCODEMAP*/)}</textarea>`;	// For textarea element type return textarea tag
			    else return `<input type="${e.type}" class="${e.type} ${classlist}" ${dataattribute}${readonly ? ' readonly' : ''} value="${AdjustString(e.data/*, TAGATTRIBUTEENCODEMAP*/)}"${placeholder}${styleattribute}>`; // For text/password element types return input tag with appropriate type

		  case 'table':
			   if (e.data && typeof e.data === 'object') for (const row in e.data)
				  {
				   if (!e.data[row] || typeof e.data[row] !== 'object') continue;
				   content += '<tr>';
				   for (const cell in e.data[row]) content += `<td class="boxtablecell${cell[0] === '_' ? ' cursorpointer" data-id="' + AdjustString(cell, TAGATTRIBUTEENCODEMAP) + '"' : '"'}>${AdjustString(e.data[row][cell], HTMLINNERENCODEMAP)}</td>`;
				   content += '</tr>';
				  }
			   return content ? `<table class="boxtable" ${dataattribute}${styleattribute}><tbody>${content}</tbody></table>` : '';

	 	  case 'button':
			   if (typeof e.data !== 'string') return '';																		// Button is hidden? Return empty
			   content = `${AdjustString(e.data, HTMLINNERENCODEMAP)} ${GetTimerString(e, this.Nodes.autoapplybuttons.get(e))}`;
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

 // Refresh dialog drag, icon and push control elements not forgetting to refresh its icons via function 'RefreshControlIcons' direct call
 RefreshControlElements()
 {
  if (!this.props.control.fullscreendblclick && !this.props.control.fullscreenicon && !this.props.control.drag && !this.props.control.closeicon && !this.props.control.push) return;
  const elements = this.Nodes.title ? [this.Nodes.title].concat([...this.Nodes.title.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]) : [this.elementDOM];// Calculate title (if exist) with all its children elements. Or child main DOM element
  if (this.props.control.fullscreenicon) this.props.control.fullscreenicon.elements = [elements[0]];															// and set 1st element for fullscreen icon,
  if (this.props.control.closeicon) this.props.control.closeicon.elements = [elements[0]];																		// set 1st element for close icon,
  if (this.props.control.fullscreendblclick) this.props.control.fullscreendblclick.elements = elements;															// set <elements> array clickable for 'full screen'	feature
  if (this.props.control.drag) this.props.control.drag.elements = elements;																						// and set them dragable
  if (this.props.control.push)
	 {
	  this.props.control.push.elements = [];
  	  for (const i in this.Nodes.buttons)
		  if (this.Nodes.buttons[i] && !SetFlag(this.elements[i], 'readonly')) this.props.control.push.elements.push([this.Nodes.buttons[i]].concat([...this.Nodes.buttons[i].querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))])); 
	 }
  this.RefreshControlIcons();
 }

 // Set focus to the '1st found' in child non-readonly text element
 SetFirstTextElementFocus()
 {
  if (!this.elementDOM) return;
  for (const id in this.Nodes.textinputs)
	  if (!SetFlag(this.elements[id], 'readonly')) return this.Nodes.textinputs[id].focus();
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
  for (const option of e.options) if (option.name === name) return new DialogBox(...MessageBox(this.parentchild, `Profile name '${name}' already exists!`, 'Clone error')); // Check name exist in e.data profile list and return warning msg in success
  flags = FIELDSDIVIDER + (flags || '');
  if (!flags.includes(OPTIONISCLONED)) flags += OPTIONISCLONED; // and add 'option is cloned' flag
  style = style.length ? FIELDSDIVIDER + style.join(FIELDSDIVIDER) : ''; // Join back flag string
  e.data[name + flags + style] = JSON.parse(JSON.stringify( e.data[GetElementOption(e).origin] )); // Create new profile in e.data via cloning current active
  e.options.push({origin: name + flags + style});
  this.RefreshDialog(INITSERVICEDATA | PARSEDIALOGDATA | SHOWDIALOGDATA | PARSEEXPRESSIONS); // and refresh dialogwith a new profile added
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
				   			else if ((e?.type === 'text' || e?.type === 'password') && !SetFlag(e, 'readonly'))	// For 'text' type and no readonly elements only
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
				   this.EvaluateElementExpression(e.affect);
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
			   if (!e || SetFlag(e, 'readonly')) break;											// Break for readonly element
			   if (event.button === 0 && event.buttons === 3)									// Left button down with right button hold? Do some element extra actions lower
				  {
			   	   if (['text', 'textarea'].includes(e.type)) 									// Bring on dialog of element text data json formatted data to change it
					  {
					   try { new DialogBox(JSON.parse(e.data), this.parentchild, { animation: 'rise', position: 'CENTER', overlay: 'MODAL', event: { type: 'TEXTAREACHANGE', destination: this, data: event.target } }, { class: 'dialogbox selectnone' }); }
					   catch { return; }
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
						   if (e.options.length === 1 && new DialogBox(...MessageBox(this.parentchild, `Profile cannot be removed, at least one must exist!`, 'Remove profile error'))) break;
						   delete e.data[GetElementOption(e).origin];									// Removing current profile
						   this.RefreshDialog(INITSERVICEDATA | PARSEDIALOGDATA | SHOWDIALOGDATA | PARSEEXPRESSIONS);
						   break;
						  }
					   if (e.padbar)																	// Pad selection?
						  {
						   this.ActivateSelectedOption(e, event.target.attributes?.value?.value, target);
						   break;
						  }
					   if (true) // Todo0 - Here must be dropdown list appearance check, PLUS CHECK DROPDOWN LIST POSITION AT DIALOG BOX CONTENT SCROLLING
						  {
						   new DropDownList(e, { type: 'OPTIONCHANGE', destination: this }, target.firstChild.offsetLeft + this.elementDOM.offsetLeft, target.firstChild.offsetTop + this.elementDOM.offsetTop + target.firstChild.offsetHeight - this.Nodes.contentwrapper.scrollTop);
						   break;
						  }
					  }
				  }
			   break;

		  case 'TEXTAREACHANGE':
			   event.data.value = JSON.stringify(event.source.data); // Event data is text area target element (was set at dialog creation as a props event) wich value was requested to change, event source is a source dialog wich has its own data (dialog conetnt data)
			   break;

		  case 'OPTIONCHANGE':
			   if (e) this.ActivateSelectedOption(event.data.e, event.data.cursor, this.Nodes.selects[event.data.e.id].firstChild);	// Drop-down list returned back selected option
			   break;

		  case 'KILL':
  			   for (const button of this.Nodes.autoapplybuttons.values()) clearTimeout(button.timeoutid);	
	       	   break;
		 }
 }

 ActivateSelectedOption(e, id, target)
 {
  if (!['boolean', 'number', 'string'].includes(typeof id)) return;
  if (!SetElementOption(e, id)) return;
  CreateSelectableElementData(e);
  this.EvaluateElementExpression(e.affect);
  if (e.type === 'select')
	 {
	  if (typeof e.data === 'object') this.RefreshDialog(SHOWDIALOGDATA);
	   else target.innerHTML = this.GetElementContentHTML(e, true); // Show full dialog structure with new profile activate for profile selections or refresh element inner HTML otherwise
	  return;
	 }
  if (e.type === 'multiple') target.classList.toggle("selected");	// Refresh 'multiple' element via option class toggle. For other types (radio and checkbox) make no action due to its native form
 }
 
 ButtonApply(e, target)
 {
  let events;
  if (!['button', 'table'].includes(e.type) || SetFlag(e, 'readonly')) return;			// Return for disabled (or non button/table type) element
  if (!SetFlag(e, 'appliable') && (e.type !== 'table' || !target.attributes['data-id'])) return;	// Return for non-appliable button/tablecell

  if (this.props.event) // Dialog event does exist in props? Add it
	 {
  	  this.ParseDialogData(this.data, true, false);
	  this.props.event.data = e.type === 'button' ? e.name : target.attributes['data-id'].value; // Set event data to the dialog button applied (<element name> for button element and <cell name starting with _> for table element) 
  	  events = [ this.props.event ];
	 }

  if (!SetFlag(e, 'interactive') && e.type !== 'table') // Button is non interactive and element is not a table? Add KILL event
 	 {
 	  if (!events) events = [];
 	  events.push({ type: 'KILL', destination: this });
	 }

  return events;
 }
}
