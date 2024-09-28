// Todo2 - Change cmnofullscreen and application icon
// Todo2 - Элементы с diaplay flex "наезжают" на margin нижестоящего элемента div
// Todo2 - Multuiple flag * creates rounded area arount GUI element. 
// Todo2 - Review all css props, its content props, some for builtin conf (index.html), some for configurable GUI via user customization
// Todo2 - add style prop (type, data head hint expr and style!) to style all element types
// Todo2 - make "cursor: not-allowed;" for disabled buttons like in VMWARE vcenter
// Todo2 - When two modal appears - lower box has grey filter and that filter doesn't go away after above box gone away
// Todo2 - Should clickable elements react to 'click' event instead of 'mousedown' (like 'button' element for a example)?

const DIALOGSELECTABLEELEMENTMAXOPTIONS	= 1024;
const BUTTONTIMERMAXSECONDS				= 60 * 60 * 24 * 7; // One week
const ELEMENTSERVICEPROPS				= ['id', 'options', 'selectionid', 'timer', 'timerstart', 'eventcounter', 'affect', 'prop'];
const ELEMENTUSERPROPFALLBACKVALUES		= ['', undefined, undefined, undefined, undefined, '', undefined];
const ELEMENTUSERPROPS					= ['path', 'type', 'head', 'hint', 'data', 'flag', 'expr'];
const ELEMENTSELECTABLETYPES			= ['select', 'multiple', 'checkbox', 'radio'];
const ELEMENTTEXTTYPES					= ['textarea', 'text', 'password'];
const ELEMENTALLTYPES					= ['title', ...ELEMENTSELECTABLETYPES, ...ELEMENTTEXTTYPES, 'table', 'button'];
const SELECTABLEOPTIONSDIVIDER			= '/';
const PROFILEFIELDSDIVIDER				= '|';
const CHECKEDOPTIONPREFIX				= '!';
const EMPTYOPTIONTEXT					= ' ';
const EXPRPROPDISALLOWEDCHARSREGEXP		= /[^&|( )!]/;
const EXPRISREGEXP						= /\/.*?[^\\]\//g;
const macros							= { SIDE_MARGIN: '10px', ELEMENT_MARGIN: '10px', HEADER_MARGIN: '5px', TITLE_PADDING: '5px', BUTTON_PADDING: '10px', FONT: 'Lato, Helvetica' };
 
// Todo2 - function 'CheckSyntaxForHelp' is unused for a while. Use it later to complete 'dialog' help section then remove it
function CheckSyntaxForHelp(e, prop)
{
 if (!e || typeof e !== 'object') return;		// Return for non-object element
 if (prop.indexOf(' ') !== -1) return;			// Check element prop name syntax for space chars and return if exist
 if (typeof e.flag !== 'string') e.flag = '';	// Flag string is mandatory
 if (typeof e.path !== 'string') e.path = '';	// Path string is mandatory

 // Dialog data is an object of interface elements list. Every element has its one mandatory property 'type': 'title|select|multiple|checkbox|radio|textarea|text|password|table|button'
 // Props 'path' and 'flag' are mandatory too, but created empty if not exist.
 // All interface elements are grouped by 'path' prop with next format: <profile1(pad) name>[/<profile2 name>/../<profileN name>]
 // Each <profile name> consists of its name itself, profile flag, header and hint divided by '|' char: name|flag|header|hint
 // Single option profile selection bar is hidden until the profile head (or hint) is set. Multiple options - selection bar is always displayed.
 // Note that root level profiles look like usual pads, others non root - like dropdown list with options to select.
 // Profile flags are optional and set some behaviour:
			  	// add-remove (+-): profile is clonable and may be used as a template to add new profiles (+), profile is removable (-)
			  	// Sort order (a^): ascending alphabetical order, - descending alphabetical order, +-|-+ descending default, absent value: ascending default sort order (default), 
			  	// 		Sorting is applied among current nested level the pad/profile is a memeber of. The flag value is collcted from all flag values for specified nested profile nested level
				// divider (*): any set value - divider is displayed.
				// selection id (!): profiles (not pads) may be grouped to a separate selections via number of '%' (see below), so profile names with one number of '%' - are in one selection, with other number - in other selection.
 // Profile header with its hint (for non root level only) are optional too and acts as a header inner html code for the selection bar. Last header/hint text set in any element path is displayed.
 // For all types except 'button' - at least one prop (head, hint, data or flag) should be defined.
 // For all types except 'title'/'button' - in case of incorrect/undefined data, interface element is frozen and its purpose is to display head/hint/divider only.
 switch (e.type)
        {
		 case 'title':
			  // data - dialog title inner html. This prop of any path first appearance sets the title as a default one. The title will be displayed until any other title appeared in an active profile bundle.
			  //        Empty title string (data='') makes whole title element interface invisible. To set emtpy title visible use space char title.
			  // head - title element style attribute
			  if (typeof e.data === 'string') return true;
			  break;

		 case 'textarea':
		 case 'text':
		 case 'password':
			  // head - interface element header inner html
			  // hint - interface element header text hint
			  // data - interface element text content.
			  // flag - divider(*), readonly(-), placeholder attribute (+)
			  // expr - `/regexp/prop && || ! ( )` - set of chars allowed for expr expreesion - in case of no readonly flag set and this expr expr true value - the element becomes readonly.
			  //		Undefined/incorrect props have negative value.
			  if (typeof e.head === 'string' || typeof e.hint === 'string' || typeof e.data === 'string' || /\*/.test(e.flag)) return true;
			  break;

	     case 'select':
		 case 'multiple':
		 case 'checkbox':
		 case 'radio':
			  // head - interface element header inner html
			  // hint - interface element header text hint
			  // data - interface element content of selectable options divided by '/'.
			  //        Option with char '!' before are considered as a selected/checked one.
			  // flag - divider(*), sort order(^a), readonly(-).
			  // expr - See text type description.
			  if (typeof e.head === 'string' || typeof e.hint === 'string' || typeof e.data === 'string' || /\*/.test(e.flag)) return true;
			  break;

		 case 'table':
			  // head - interface element header inner html
			  // hint - interface element header text hint
			  // data - interface element 2d dimension object content with properties as a table rows. Each row property is a table cells property list.
			  //        Each cell property, in turn, is a cell <td> tag inner html.
			  // flag - divider(*)
			  if (typeof e.head === 'string' || typeof e.hint === 'string' || typeof e.data === 'object' || /\*/.test(e.flag)) return true;
			  break;

		 case 'button':
			  // head - button element style attribute
			  // hint - Warning message to confirm controller call. Or just info message in case of 'no action' button.
			  // data - button inner html, undefined/empty/incorrect data makes button invisibe and usually used with auto apply feature (see below), as an example - disappearing info messages
			  // flag - interactive(!), no hide dialog after button apply which generates two cases:
			  //			1) Button property name with leading '_' char makes a controller call action with a property name (without '_') as a dialog event initiated the call.
			  //			2) Btn property name without leading '_' just makes no action, so no call-controller action btns with interactive flag make no sense cause no dialog kill even made.
			  //        Number of '+' (<=300) number of seconds, number '+' chars more than 300 are interpreted as a number of minutes: 299 chars - 299 seconds, 300 chars - 300 seconds (5 min), 301 chars - 6 minutes, 302 chars - 7 miuntes, etc..
			  //			Once the auto-apply button appeares in the profile bundle the auto-apply feature is turned on and does exist regardless of button current profile appearance.
			  //			Example: flag string '+-+' sets 121 second timer.
			  //        profile-specific(*) flag displays buttons for this profile only and hide all other buttons. Non-specific btns are displayed in case of no any profile-specific ones.
			  // expr - See text type description. In case of true expr expression the button becomes grey.
			  if ((typeof e.data === 'string' && e.data) || /\+|\-/.test(e.flag))	// Button is visible or auto-apply?
			  	 if (e.flag.indexOf('!') === -1 || prop[0] === '_') return true;	// Button is non interactive or controller-call? Return correct syntax
			break;
		}
}

// Check GUI element name ('name') and its props ('e[prop]')
function CheckGUIElement(e, name)
{
 if (!e || typeof e !== 'object') return;												// Return for non-object element
 if (name.indexOf(' ') !== -1) return;													// Check element name syntax for space chars and return if exist
 if (ELEMENTALLTYPES.indexOf(e.type) === -1) return;									// Check for existing element types

 for (const prop in e)
	 if (ELEMENTUSERPROPS.indexOf(prop) === -1) delete e[prop];							// Clear element from unnecessary props

 for (const i in ELEMENTUSERPROPS)														// Go through available element props
	if (typeof e[ELEMENTUSERPROPS[i]] !== 'string')										// Non string type prop? Check fall back value to modify the prop
	if (ELEMENTUSERPROPFALLBACKVALUES[i] === undefined) delete e[ELEMENTUSERPROPS[i]];	// Fallback value is undefined? Delete the prop
	 else e[ELEMENTUSERPROPS[i]] = ELEMENTUSERPROPFALLBACKVALUES[i];					// Otherwise set it to that fallback value

 return true;
}

// Function builds array by splitting (divided via '/') input arg data string to separate options and returns eponymous array. Element type 'type' defines checked options number: 'select' (single checked option only), 'radio' (none or single)
function ParseSelectableElementData(data)
{
 // First step - init data
 if (typeof data !== 'string') return [];	// Element with non string data is considered as element with one header/hint only. With empty data ('') - as element with one empty option. With single divider data='/' - as element with two empty option.
 const options = [];						// Array of selectable options. Each array element, in turn - is an array of option itself, checked status and order id (to keep default appearance): [option, ischecked, id] plus auto set fourth (profile index) and fifth (profile clonable/removable flag) array elements

 // Second step - generate sorted data array
 for (let option of data.split(SELECTABLEOPTIONSDIVIDER))
     {
      if (options.length > DIALOGSELECTABLEELEMENTMAXOPTIONS) break;																							// Options number exceeds max allowed? Break
	  options.push([option[0] === CHECKEDOPTIONPREFIX ? option.substring(1) : option, option[0] === CHECKEDOPTIONPREFIX ? true : false, options.length + '']);	// Push prepare option array data - option name without checked prefix, checked/selected status, apperance order id string 
     }

 // Return result array
 return options;
}

// Correct checked (selected) options number for 'select' element type (1 option) and 'radio' (0 or 1 option).
function CorrectCheckedOptions(options, type)
{
 // 'select' element type - should have at least one option selected, 1st option is forced otherwise
 // 'radio' - may have no options selected'
 // Both types should have no more than one selected option, last selected is used otherwise
 if (type !== 'select' && type !== 'radio') return;
 let checkedcount = 0;
 for (let i = options.length - 1; i >= 0; i--) if (options[i][1]) checkedcount ? options[i][1] = false : checkedcount++;
 if (!checkedcount && type === 'select') options[0][1] = true;
}

// Functions sorts options array based on flag value. 'options' is a parsed array (see above)
function SortSelectableElementData(options, flag)
{
 if (!Array.isArray(options)) return;
 if (typeof flag !== 'string') flag = '';

 if (flag.indexOf('a') === -1)																			// Default appearance sorting order in case of flag 'a' value, otherwise - alphabetical
	options.sort((a, b) => (flag.indexOf('^') === -1 ? 1 : -1) * ((+a[2]) - (+b[2])));					// Default appearance ascending/descending order
  else 
    options.sort((a, b) => (flag.indexOf('^') === -1 ? 1 : -1) * a[0].localeCompare(b[0]));				// Alphabetical ascending/descending order
}

// Function creates and returns selectable element data from option list 'options'
function CreateElementOptionsData(options)
{
 options = Array.from(options);																								// Create an array copy and sort it by default sort order (flag='') below
 SortSelectableElementData(options, '');
 if (!Array.isArray(options)) return '';																					// Return empty string for incorrect options
 let data = '';
 for (const option of options) data += `${SELECTABLEOPTIONSDIVIDER}${option[1] ? CHECKEDOPTIONPREFIX : ''}${option[0]}`;	// Collect data for each option
 delete options;																											// Delete array copy
 return data.substring(1);																									// And return result data without 1st divider char
}

// Function sets checked status in 'options' array for the specified appearance id 'id' option and unchecks previous checked. 
function ChangeElementOptionById(options, id)
{
 if (typeof id === 'number') id += '';							// Convert id number to string
 if (typeof id !== 'string' || !Array.isArray(options)) return;	// Return undefined in case of non string id and non array type

 for (let option of options) if (option[2] + '' === id)			// Search option for the given id
	 {
	  const oldchecked = GetElementOptionByChecked(options);	// Retrieve current checked option
	  if (option[1] || oldchecked === option) return;			// If current checked option matches found by 'id' one or found option is already checked - return 
	  option[1] = true;											// Set found option
	  if (oldchecked) oldchecked[1] = false;					// and uncheck old one
	  return option;											// Return processed option
	 }
}

// Function inverts/toggles checked status in 'options' array for the specified appearance id 'id' option. 
function ToggleElementOptionById(options, id)
{
 if (typeof id === 'number') id += '';							// Convert id number to string
 if (typeof id !== 'string' || !Array.isArray(options)) return;	// Return undefined in case of non string id and non array type

 for (let option of options) if (option[2] + '' === id)			// Search option of the matched value
	 {
	  option[1] = !option[1];									// Toggle matched option checked status
	  return option;											// Return matched option
	 }
}

// Function searches fisrt checked option, unchecks it and checks next/previuos option based on shift value. Arrows up/down option navigating.
function ShiftElementOption(options, shift, loop)
{
 if (!Array.isArray(options)) return;										// Return for options non array type
 if (typeof shift !== 'number') shift = 1;									// Next one for default

 for (let i in options) if (options[i][1])									// Search checked option
	 {
	  i = +i;																// Convert to number
	  shift = i + shift;													// Apply offset
	  if (shift < 0) shift = loop ? options.length - 1 : 0;					// Out of range 'shift' is adjusted to the start/end or to the end/start depending on 'loop'
	  if (shift > options.length - 1) shift = loop ? 0: options.length - 1;	// Out of range 'shift' is adjusted to the start/end or to the end/start depending on 'loop'
	  options[i][1] = false;												// Uncheck 'old' option
	  options[shift][1] = true;												// Check 'new' option
	  return shift !== i;													// Return whether option has been changed or not (true/false)
	 }
}

// Functions searches in options for the specfified option name and return corresponded option
function GetElementOptionByName(options, name)
{
 if (typeof name !== 'string' || !Array.isArray(options)) return;		// Return undefined in case of non string name or options non array type
 
 for (const option of options) if (option[0] === name) return option;	// Return matched option, undefined is returned otherwise
}

// Functions searches in options for the checked one and return corresponded option
function GetElementOptionByChecked(options)
{
 if (!Array.isArray(options)) return;									// Return undefined in case of non array type

 for (const option of options) if (option[1]) return option;			// Return matched option, undefined is returned otherwise
}

// Functions searches in options for the specified appearance id and return corresponded option
function GetElementOptionById(options, id)
{
 if (typeof id === 'number') id += '';									// Convert id number to string
 if (typeof id !== 'string' || !Array.isArray(options)) return;			// Return undefined in case of non string id and non array type

 for (const option of options) if (option[2] === id) return option;		// Return matched option, undefined is returned otherwise
}

function GetTimerString(e)
{
 if (typeof e.timer !== 'number') return '';

 let timer = e.timer - new Date().getTime() + e.timerstart;	// Calculate timer via initial timer minus past time from e.timerstart
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

class DialogBox extends Interface
{
 static style = {
	// dialog box global css props
	".dialogbox": { "background-color": "rgb(233,233,233);", "color": "#1166aa;", "border-radius": "5px;", "border": "solid 1px #dfdfdf;" },
	// dialog box title
	".title": { "background-color": "rgb(209,209,209);", "color": "#555;", "border": "#000000;", "border-radius": "5px 5px 0 0;", "font": `bold .9em ${macros.FONT};`, "padding": "5px;" },
	// dialog box pad
	".pad": { "background-color": "rgb(223,223,223);", "border-left": "none;", "border-right": "none;", "border-top": "none;", "border-bottom": "none;", "padding": "5px;", "margin": "0;", "font": `.9em ${macros.FONT};`, "color": "#57C;", "border-radius": "5px 5px 0 0;" },
	// dialog box active pad
	".activepad": { "background-color": "rgb(209,209,209);", "border-left": "none;", "border-right": "none;", "border-top": "none;", "border-bottom": "none;", "padding": "5px;", "margin": "0;", "font": `bold .9em ${macros.FONT};`, "color": "#57C;", "border-radius": "5px 5px 0 0;" },
	// dialog box pad bar
	".padbar": { "background-color": "transparent;", "border": "none;", "padding": "4px 4px 0 4px;", "margin": "10px 0 0 0;" },
	// dialog box divider
	".divider": { "background-color": "transparent;", "margin": "0px 10px 10px 10px;", "height": "0px;", "border-bottom": "1px solid #CCC;", "border-top-color": "transparent;", "border-left-color": "transparent;" , "border-right-color": "transparent;" },
	// dialog box button
	".button": { "background-color": "#13BB72;", "border": "none;", "padding": `${macros.BUTTON_PADDING};`, "margin": "10px;", "border-radius": "5px;", "font": `bold 12px ${macros.FONT};`, "color": "white;" },
	// dialog box button and pad hover
	".button:hover, .pad:hover, .itemadd:hover, .itemremove:hover": { "cursor": "pointer;", "border": "" },
	// dialog box element headers
	".element-headers": { "margin": `${macros.HEADER_MARGIN};`, "font": `.9em ${macros.FONT};`, "color": "#555;", "text-shadow": "none;" },
	// dialog box help icon
	".hint-icon": { "padding": "1px;", "font": `1em Arial Narrow, ${macros.FONT};`, "color": "#555;", "background-color": "#FF0;", "border-radius": "40%;" },
	// dialog box help icon hover
	".hint-icon:hover": { "padding": "1px;", "font": `bold 1em ${macros.FONT};`, "color": "black;", "background-color": "#E8E800;", "cursor": "help;", "border-radius": "40%;" },
	// dialog box table
	".boxtable": { "font": `.8em ${macros.FONT};`, "color": "black;", "background-color": "transparent;", "margin": "10px;", "table-layout": "fixed;", "width": "auto;", "box-sizing": "border-box;" },
	// dialog box table cell
	".boxtablecell": { "padding": "7px;", "border": "1px solid #999;", "text-align": "center" },
	// dialog box readonly elements css filter
	".readonlyfilter": { "filter": "opacity(50%);", "_filter": "Dialog box readonly elements css filter property to apply to, see appropriate css documentaion." },
	//------------------------------------------------------------
	// dialog box select
	".select": { "background-color": "rgb(243,243,243);", "color": "#57C;", "font": `.8em ${macros.FONT};`, "margin": `0px ${macros.SIDE_MARGIN} ${macros.ELEMENT_MARGIN} ${macros.SIDE_MARGIN};`, "outline": "none;", "border": "1px solid #777;", "padding": "0px 0px 0px 0px;", "overflow": "auto;", "max-height": "150px;", "min-width": "24em;", "width": "auto;", "display": "inline-block;", "effect": "rise", "_effect": "Select fall-down option list " + EFFECTSHINT },
	// dialog box select option
	".select > div": { "padding": "2px 20px 2px 5px;", "margin": "0px;" },
	// dialog box select option hover
	".select:not([class*=arrow]) > div:hover": { "background-color": "rgb(211, 222, 192);", "color": "" },
	// dialog box select option selected
	".selected": { "background-color": "rgb(211, 222, 192);", "color": "#fff;" },
	// Profile selection additional style
	".profileselectionstyle": { "font": `bold .8em ${macros.FONT};`, "border-radius": "4px;" },
	// Expanded selection
	".expanded": { "display": "block;", "margin": "0 !important;", "padding": "0 !important;", "position": "absolute;", "overflow-y": "auto !important;", "overflow-x": "hidden !important;", "max-height": "500px !important;" },
	//------------------------------------------------------------
	// dialog box radio
	"input[type=radio]": { "background-color": "transparent;", "border": "1px solid #777;", "font": ".8em/1 sans-serif;", "margin": `3px 5px 6px ${macros.ELEMENT_MARGIN};`, "border-radius": "20%;", "width": "1.2em;", "height": "1.2em;" },
	// dialog box radio checked
	"input[type=radio]:checked::after": { "content": "", "color": "white;" },
	// dialog box radio checked background
	"input[type=radio]:checked": { "background-color": "#00a0df;", "border": "1px solid #00a0df;" },
	// dialog box radio label
	"input[type=radio] + label": { "color": "#57C;", "font": ".8em Lato, Helvetica;", "margin": "0px 10px 0px 0px;" },
	//------------------------------------------------------------
	// dialog box checkbox
	"input[type=checkbox]": { "background-color": "#f3f3f3;", "border": "1px solid #777;", "font": ".8em/1 sans-serif;", "margin": `3px 5px 6px ${macros.ELEMENT_MARGIN};`, "border-radius": "50%;", "width": "1.2em;", "height": "1.2em;" },
	// dialog box checkbox checked
	"input[type=checkbox]:checked::after": { "content": "", "color": "white;" },
	// dialog box checkbox checked background
	"input[type=checkbox]:checked": { "background-color": "#00a0df;", "border": "1px solid #00a0df;" },
	// dialog box checkbox label
	"input[type=checkbox] + label": { "color": "#57C;", "font": `.8em ${macros.FONT};`, "margin": "0px 10px 0px 0px;" },
	//------------------------------------------------------------
	// dialog box input text
	"input[type=text]": { "margin": `0px ${macros.SIDE_MARGIN} ${macros.ELEMENT_MARGIN} ${macros.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "none;", "color": "#57C;", "border-radius": "5%;", "font": `.9em ${macros.FONT};`, "width": "90%;", "min-width": "300px;" },
	// dialog box input password
	"input[type=password]": { "margin": `0px ${macros.SIDE_MARGIN} ${macros.ELEMENT_MARGIN} ${macros.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "none", "color": "#57C;", "border-radius": "5%;", "font": `.9em ${macros.FONT};`, "width": "90%;", "min-width": "300px;" },
	// dialog box input textarea
	"textarea": { "margin": `0px ${macros.SIDE_MARGIN} ${macros.ELEMENT_MARGIN} ${macros.SIDE_MARGIN};`, "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "", "color": "#57C;", "border-radius": "5%;", "font": `.9em ${macros.FONT};`, "width": "90%;", "min-width": "300px;" },
 };

 InitDialogData()
 {
  // Set dialog profile all global elements array
  this.profile = [];
  this.allelements = [];
  // Set title id arrays 
  this.defaulttitleid = undefined;
  this.currenttitleid = undefined;
  // Set button id arrays
  this.defaultbuttonids = [];
  this.currentbuttonids = [];
  this.callbuttonids = [];
  // Set default prop index
  this.propmaxindex = 0;
  // No valid dialog structure? Let it be empty
  if (!this.data || typeof this.data !== 'object') this.data = {};
 }

 CreateDialogData(checksyntax)
 {
  // Iterate all dialog GUI interface elements one by one in initial dialog data
  for (const element in this.data) 
	  if (!checksyntax || CheckGUIElement(this.data[element], element))	// Check element object props and their types
	   	  this.PushInterfaceElement(this.data[element], element);		// Push interface element to the global elements array 'allelements' if successful
	   else
		  delete this.data[element];									// or delete element otherwise

  // Correct checked options number of all selectable elements, including service ones (profile selections). Do it here after all elements is pushed (PushInterfaceElement function modifies profile selections for every GUI element inserted)
  // and adjust  every element 'expr' property
  for (const e of this.allelements)
	  {
	   if (e.options) CorrectCheckedOptions(e.options, e.type);
	   this.AdjustExprProp(e);
	  }
 }

 destructor()
 {
  super.destructor();
  clearTimeout(this.autoapplybuttontimeoutid);
 }

 constructor(...args)
 {
  // Override 'data-element' attribute for dialog box DOM element to non-existent interface element id (-1), the search is terminated on. Call then parent constructor for the given args (data, parentchild, props, attributes)
  args[3] = (args[3] && typeof args[3] === 'object') ? args[3] : {};
  args[3]['data-element'] = '_-1';
  super(...args);

  // Set callback to pass dialog data
  this.DialogDataCallback = args[4];

  // Init dialog data
  this.InitDialogData();

  // Create dialog data
  this.CreateDialogData(true);

  // Show dialog data (dialog box:)
  this.ShowDialogBox();
 }

 // Function parses expression 'e.expr', checks its syntax and put parsed string back to the 'e.expr'
 AdjustExprProp(e)
 {
  if (e.expr === undefined) return;																					// Return for undefined expression
  
  if (['button', ...ELEMENTSELECTABLETYPES, ...ELEMENTTEXTTYPES].indexOf(e.type) === -1) return delete e.expr;		// Return and delete expression for non suitable types
  const matches = Array.from(e.expr.matchAll(EXPRISREGEXP));														// Search all regexp via pattern EXPRISREGEXP
  if (!matches.length) return delete e.expr;																		// and return with delete for no match found case

  let currentpos = 0, parsedexpr = '';
  const elementsinexpr = new Set();
  for (const match of matches)																						// Go through all matches
   	  {
	   if (currentpos < match.index)																				// If cursor current position lower than current regexp found
	   	  if (EXPRPROPDISALLOWEDCHARSREGEXP.test(e.expr.substring(currentpos, match.index))) return delete e.expr;	// then the appropriate substring should consist of these operators ('()&&||!') only, so test the substring
	   	   else parsedexpr += e.expr.substring(currentpos, match.index);											// Return with delete for no match or collect match string to the parsed expression 'parsedexpr'

	   const propendpos = e.expr.indexOf(' ', match.index + match[0].length);
	   const prop = e.expr.substring(match.index + match[0].length, propendpos === -1 ? e.expr.length : propendpos);
	   if (this.data[prop] === undefined || this.data[prop]['data'] === undefined) return delete e.expr;
	   this.data[prop]['affect'].add(e.id);
	   elementsinexpr.add(this.data[prop].id);
	   parsedexpr += match[0] + ".test(this.data['" + prop + "']['data'])";
	   if (propendpos === -1) break;
	   currentpos = propendpos;
	  }

  try	{
		 e.flag = eval(parsedexpr) ? e.flag + '-' : e.flag.replaceAll(/-/g, '');
		 e.expr = parsedexpr;
		}
  catch {
  	 	 delete e.expr;
		 for (const id of elementsinexpr) this.allelements[id].affect.delete(e.id);									// Pass through all touched elements in 'e.expr' and delete current id from that elements 'affect' set collection
		}
}

EvalElementExpression(e)
{
 if (!e.affect) return;
 const changedelements = new Set();
 for (const id of e.affect)
	 {
	  let result;
	  const affectede = this.allelements[id];
	  if (!affectede) continue;
	  try {	result = eval(affectede.expr); }
      catch { lg('Evaluation exception detected on element:', affectede); }
	  if (result === undefined) continue;
	  if (affectede.flag.indexOf('-') === -1)
		 {
		  if (!result) continue;
		  affectede.flag += '-';
		  changedelements.add(affectede.id);
		 }
	   else
		 {
		  if (result) continue;
		  affectede.flag = affectede.flag.replaceAll(/\-/g, '');
		  changedelements.add(affectede.id);
		 }
	 }

 for (const element of [...this.contentwrapper.querySelectorAll('input, textarea, .select'), ...this.footer.querySelectorAll('.button')])
	{
	 let id, target;
	 [id, target] = GetEventTargetInterfaceElement(element);
	 e = this.allelements[id];
	 if (!changedelements.has(e?.id)) continue;
	 e.flag.indexOf('-') === -1 ? target.classList.remove('readonlyfilter') : target.classList.add('readonlyfilter');
	 switch (e.type)
		    {
			 case 'text':
			 case 'password':
			 case 'textarea':
				  e.flag.indexOf('-') === -1 ? element.removeAttribute('readonly') : element.setAttribute('readonly', '');
				  break;
			 case 'radio':
			 case 'checkbox':
				  e.flag.indexOf('-') === -1 ? element.removeAttribute('disabled') : element.setAttribute('disabled', '');
				  break;
			 case 'select':
			 case 'multiple':
				  break;
			 case 'button':
				  if (e.flag.indexOf('-') === -1)
					 {
					  this.pushableElements.push([element, element].concat([...element.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]));	// Set btn element (with all childs in) pushable
					 }
				   else
					 {
					  for (const i in this.pushableElements)
						  if (this.pushableElements[i][0] === element) 
							 {
							  delete this.pushableElements[i];
							  break;
							 }
					 }
				  break;
		    }
	}
}

 /*******************************************************************************************************************
  Functions pushes interface element <e> to the global element list (allelements array) with creating treelike profile structure:
  profile [
	   0: <element id number> (user defined element type'title|button|select|multiple|checkbox|radio|textarea|text|password|table')
	   1: <element id number> (system defined profile selection element type 'select')
	   2: <profile array>
	   3: <profile array>
	  ]
 *******************************************************************************************************************/
 PushInterfaceElement(e, prop)
 {
  let currentpath, currentprofile = this.profile;

  // Parse element path first. Path' prop has next format: <profile1(pad) name>[/<profile2 name>\<flags>\<profile header>\<profile hint>/../<profileN name>]
  // Parse element <e> path first. Path' prop has next format: <profile1>[/../<profileN>]. First profile is root profile of selectable pads, other (non root) profiles are optional and present drop-daown list of selectable options.
  // Each profile consists of its name (with optional CHECKEDOPTIONPREFIX for the currently selected profile), flags, head and hint separated via PROFILEFIELDSDIVIDER. All are optional.
  for (const name of e.path.split(SELECTABLEOPTIONSDIVIDER))
      {
	   // Init some needed vars for splited path name
	   let nestedprofileindex, option, currente, profilename, profileflag, profilehead, profilehint;
	   [profilename, profileflag, profilehead, profilehint] = name.split(PROFILEFIELDSDIVIDER, 4);												// Split current profile splited path to its name, flag, head and hint
	   currentpath = currentpath === undefined ? `${profilename[0] === CHECKEDOPTIONPREFIX ? profilename.substring(1) : profilename}` : `${currentpath}${SELECTABLEOPTIONSDIVIDER}${profilename[0] === CHECKEDOPTIONPREFIX ? profilename.substring(1) : profilename}`;

	   if (profilehint !== undefined) profilehint = name.substring(profilename.length + profileflag.length + profilehead.length + 3);			// Hint is not undefined? Use the rest of a string as a hint regardless of PROFILEFIELDSDIVIDER char
       // Search profile selection elements (from current profile) matched its selection id
       for (const eid of currentprofile)
	   	   {
	    	if (Array.isArray(eid)) continue;																									// Item is profile (array)? Continnue. Type 'number' is needed
			currente = this.allelements[eid];																									// Simplify current profile interface element naming, pointing to the element id <eid> in global element list array
			if (currente.selectionid === undefined) continue;																					// Element is not profile selection element
			if (currente.selectionid !== (profileflag || '').split('!').length - 1) continue;													// Profile selection element selection id doesn't match current splited path selection id (number of '!' chars)
			option = GetElementOptionByName(currente.options, profilename[0] === CHECKEDOPTIONPREFIX ? profilename.substring(1) : profilename);	// Serch for the splited path name in found profile selection element
			nestedprofileindex = option === undefined ? currentprofile.push([]) - 1 : option[3];												// Calculate nested profile index the splited path points to. Option name is not found in <currente> profile selection? Add new profile or use index value in found option ([3])
			if (profileflag !== undefined) currente.flag = profileflag.replaceAll(/[\+\-]/g, '');												// Override profile selection flag if defined
			if (profilehead !== undefined) currente.head = profilehead;																			// Override profile selection head if defined
			if (profilehint !== undefined) currente.hint = profilehint;																			// Override profile selection hint if defined
			if (option === undefined)																											// Option name is not found in <currente> profile selection, so add it
			   {
				option = ParseSelectableElementData(profilename)[0];																			// Define new selection profile option with profilename as an input data,
				option[2] = currente.options.length;																							// change its appearance id
				currente.options.push([...option, nestedprofileindex, (profileflag || '').replaceAll(/[^\+\-]/g, '')]);							// Then add that new option to profile selection element 'currente' with additional nested profile index and profile specific flags (+|-) if exist
			   }
			break;																																// All job is done, break the cycle
	 	   }

       // Insert new profile selection element and its empty profile array
       if (nestedprofileindex === undefined)
		  {
		   profileflag = profileflag || '';
		   currente = { id: this.allelements.length, path: currentpath, type: 'select', flag: profileflag.replaceAll(/[\+\-]/g, '') };			// Define new profile selection element
		   if (profilehead !== undefined) currente.head = profilehead;																			// Override profile selection head if defined
		   if (profilehint !== undefined) currente.hint = profilehint;																			// Override profile selection hint if defined
		   currente.selectionid = currente.flag.split('!').length - 1;																			// Define its selection id
		   currente.options = ParseSelectableElementData(profilename);																			// And its parsed <options> array
		   currente.options[0].push(currentprofile.length + 1, profileflag.replaceAll(/[^\+\-]/g, ''));											// For the added <profilename> as a last option of profile selection element: add nested profile index and profile specific flags (+|-) if exist
		   this.allelements.push(currente);																										// Insert new profile selection element to the global element list
		   nestedprofileindex = currentprofile.push(currente.id, []) - 1;																		// Insert empty profile array the last added option points to, and assign nested profile index to point to that profile array
		   currente.profile = currentprofile;
		  }

	   // Go to parsed splited path profile
       currentprofile = currentprofile[nestedprofileindex];
      }

  e.id = this.allelements.length;
  if (e.type === 'title' && typeof e.data === 'string' && this.defaulttitleid === undefined) this.defaulttitleid = e.id;						// In case of no default dialog box title set - element is set as a default one, otherwise new title element is added to the current nested profile
  if (e.type === 'button' && e.flag.indexOf('*') === -1) this.defaultbuttonids.push(e.id);														// Add btn to default global btn array, in case of flag '+' set - the btn is used for a current pad/profile only with no default btns displayed
  if (e.type === 'button' && prop[0] === '_') this.callbuttonids.push(e.id);																	// Put all callable btns (with leading '_') to appropriate array
  if (ELEMENTSELECTABLETYPES.indexOf(e.type) !== -1) e.options = ParseSelectableElementData(e.data);											// Create parsed options array for selectable elements
  this.allelements.push(e); 																													// Insert user defined element to the 'allelements' global array
  currentprofile.push(e.id);																													// Insert user defined element id to the current profile based on calculated path above
  if ([...ELEMENTSELECTABLETYPES, ...ELEMENTTEXTTYPES].indexOf(e.type) !== -1) e.affect = new Set();											// Add empty set collection to all elements which data can affect to other elements readonly flag 

  // Calculating prop max number (digits at the end) to add some props name via incrementing that max number
  const match = prop.match(/\d+$/);
  if (Array.isArray(match) && +match[0] > this.propmaxindex) this.propmaxindex = +match[0];

  // Fix element prop name to delete specified elemnent via global data object
  e.prop = prop;
 }

 // Get interface element header+hint inner html for non title/button/padbar element types only
 GetElementHeaderHTML(e)
 {
  if (e.type === 'title' || e.type === 'button' || e === this.allelements[0]) return ''; 
  let header = '';
  if (e.head && typeof e.head === 'string') header += AdjustString(e.head, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS);
  if (e.hint && typeof e.hint === 'string') header += ` <span title="${AdjustString(e.hint, TAGATTRIBUTEENCODEMAP)}" class="hint-icon">?</span>&nbsp;`;
  return header ? `<div class="element-headers">${header}</div>` : '';
 }

 // Get interface element content inner html
 GetElementContentHTML(e)
 {
  if (!e) return '';																																// Return empty for undefined interface element
  const uniqeid = `${this.id + '_' + e.id}`;																										// Set element uniq identificator (in context of of all global boxes with its elements) based on its parent dialog box id and element id of itself
  const attribute = `data-element="${uniqeid}"`;																									// Set html attribute to access this uniq id
  let content = '';																																	// Element some content var
  let add = '';																																		// Active option additional items
  let placeholder = '';																																// Placeholder attribute for text elements
  let activeoption;																																	// Active option link
  let readonly = /\-/.test(e.flag) ? ' readonly' : '';																								// Read-only attribute for text elements
  let disabled = readonly ? ' disabled' : '';																										// Read-only attribute for input elements
  let readonlyclass = readonly ? ' readonlyfilter' : '';

  if (ELEMENTTEXTTYPES.indexOf(e.type) !== -1)
	 {
	  if (typeof e.data !== 'string') return '';																									// Text data is undefined (non string)? Return empty
	  if (e.flag.indexOf('+') !== -1) placeholder = ` placeholder="${AdjustString(e.flag.substr(e.flag.indexOf('+') + 1), TAGATTRIBUTEENCODEMAP)}"`;// Placholder attribute for text elements
	 }
  if (ELEMENTSELECTABLETYPES.indexOf(e.type) !== -1)
	 {
	  if (!e.options.length) return '';																												// No options for selectable element? Return empty
	  activeoption = GetElementOptionByChecked(e.options);																							// Search for element active option. Old realisation: for (const option of e.options) if (option[1] && ((activeoption = option) || true)) break;
	  if (e.selectionid !== undefined)																												// Profile selection detected
		 {
		  if (e.options.length === 1 && !e.head && !e.hint) return '';																				// One single profile and no head/hint? Profile selection is hidden
	  	  if (activeoption[4].indexOf('+') !== -1) add += '<div class="itemadd" title="Clone current profile">&nbsp&nbsp&nbsp&nbsp</div>';			// Define 'clone' icon for the active profile
	  	  if (activeoption[4].indexOf('-') !== -1) add += '<div class="itemremove" title="Remove current profile">&nbsp&nbsp&nbsp&nbsp</div>';		// Define 'remove' icon for the active profile
		 }
	  SortSelectableElementData(e.options, e.flag);																									// Sort element option for selectable types
	 }

  switch (e.type)
         {
          case 'title':
	    	   return e.data ? `<div class="title"${e.head ? ' style="' + e.head + '"' : ''}>${AdjustString(e.data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}</div>` : '';				// Empty title string? Whole title element is invisible
		  case 'select':
			   let arrowindex = 0;
			   if (e.flag.indexOf('a') !== -1) arrowindex += 2;																						// Calculate sort icon via arrow<index> class:
			   if (e.flag.indexOf('^') !== -1) arrowindex += 1;																						// arrow[01]: default appearance ascending/decending order, arrow[23]: alphabetical ascending/descending order
			   //let classlist = `select${readonlyclass} arrow${arrowindex}${e.selectionid === undefined ? '' : ' profileselectionstyle'}${add ? ' flexrow' : ''}`;	// Define corresponded class list string for 'select' element. Add specific style 'profileselectionstyle' for profile selection
			   let classlist = `select${readonlyclass} arrow${arrowindex}${e.selectionid === undefined ? '' : ' profileselectionstyle'}`;			// Define corresponded class list string for 'select' element. Add specific style 'profileselectionstyle' for profile selection
			   if (this.allelements[0] !== e)																										// For usual 'select' element return only active option content (expanded dorp-down list is hidden)
				  return `${add ? '<div class="flexrow" '+ attribute + '>' : ''}<div class="${classlist}"${add ? '' : ' ' + attribute}><div value="${activeoption[2]}">${AdjustString(activeoption[0] ? activeoption[0] : EMPTYOPTIONTEXT, HTMLINNERENCODEMAP)}</div></div>${add ? add + '</div>' : ''}`;
			   for (let option of e.options)																										// For pad selection element (pad bar) collect pad divs to 'content' var
				   content += `<div class="${option[1] ? 'activepad' : 'pad'}${option[1] && add ? ' flexrow' : ''}" value="${option[2]}">${add && option[1] ? '<div>' : ''}${AdjustString(option[0] ? option[0] : EMPTYOPTIONTEXT, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}${add && option[1] ? '</div>' + add : ''}</div>`;
			   return `<div class="padbar flexrow" ${attribute}>${content}</div>`;
		  case 'multiple':
			   for (const option of e.options) content += `<div value="${option[2]}"${option[1] ? ' class="selected"' : ''}>${AdjustString(option[0] ? option[0] : EMPTYOPTIONTEXT, HTMLINNERENCODEMAP)}</div>`;	// For multiple selection element collect option divs
			   return `<div class="select${readonlyclass}" ${attribute}>${content}</div>`;																																			// Return div wraped content
		  case 'checkbox':
		  case 'radio':
			   if (readonlyclass) readonlyclass = `class="${readonlyclass.substring(1)}" `;
			   for (const i in e.options)																																						// For checkbox/readio element types collect input and label tags
				   content += `<input type="${e.type}" class="${e.type}" ${e.options[i][1] ? ' checked' : ''}${disabled} name="${uniqeid}" id="${uniqeid + '_' + i}" value="${e.options[i][2]}"><label for="${uniqeid + '_' + i}" value="${e.options[i][2]}">${AdjustString(e.options[i][0], HTMLINNERENCODEMAP)}</label>`;
			   return `<div ${readonlyclass}${attribute}>${content}</div>`;
		  case 'textarea':
			   return `<textarea type="textarea" class="textarea${readonlyclass}" ${attribute}${readonly}${placeholder}>${AdjustString(e.data, HTMLINNERENCODEMAP)}</textarea>`;								// For textarea element type return textarea tag
		  case 'text':
		  case 'password':
			   return `<input type="${e.type}" class="${e.type}${readonlyclass}" ${attribute}${readonly} value="${AdjustString(e.data, TAGATTRIBUTEENCODEMAP)}"${placeholder}>`;								// For text/password element types return input tag with appropriate type
		  case 'table':
			   if (!e.data || typeof e.data !== 'object') return '';
			   for (const row in e.data)
				   {
					if (!e.data[row] || typeof e.data[row] !== 'object') continue;
					content += '<tr>';
					for (const cell in e.data[row]) content += `<td class="boxtablecell${cell[0] === '_' ? ' cursorpointer" data-id="' + AdjustString(cell, TAGATTRIBUTEENCODEMAP) + '"' : '"'}>${AdjustString(e.data[row][cell], HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}</td>`;
					content += '</tr>';
				   }
			   return content ? `<table class="boxtable" ${attribute}><tbody>${content}</tbody></table>` : '';
	 	  case 'button':
			   if (typeof e.data !== 'string' || !e.data) return '';																		// Button is hidden? Return empty
	      	   return `<div class="button${readonlyclass}" ${attribute}${e.head ? ' style="' + AdjustString(e.head, TAGATTRIBUTEENCODEMAP) + '"' : ''}>${AdjustString(e.data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}${GetTimerString(e)}</div>`;
		 }
 }
 
  // Get interface element divider line inner html for non title/button/padbar element types only. Depends on element flag '*' presence
 GetElementFooterHTML(e)
 {
  return (e.type === 'title' || e.type === 'button' || e === this.allelements[0]) ? '' : `<div${e.flag.indexOf('*') === -1 ? '' : ' class="divider"'}></div>`;
 }

 // Function calculates the timer, applies the button if needed and refreshes button text with the new timer in seconds
 ButtonTimer()
 {
  if (!this.autoapplybuttonelement)
	 {
	  clearTimeout(this.autoapplybuttontimeoutid);															// Clear timer function for unknown btn
	  return;																								// and return
	 }
  if (new Date().getTime() - this.autoapplybuttonelement.timerstart > this.autoapplybuttonelement.timer)	// Timer is up?
	 {
	  this.ButtonApply(this.autoapplybuttonelement);														// Apply the button
	  clearTimeout(this.autoapplybuttontimeoutid);															// and clear timer function
	 }
   else
     {
	  this.autoapplybuttontimeoutid = setTimeout(() => this.ButtonTimer(), 1000);	 						// Restart timer function otherwise
	 }
  if (this.autoapplybuttonDOMelement) this.autoapplybuttonDOMelement.innerHTML = `${AdjustString(this.autoapplybuttonelement.data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}${GetTimerString(this.autoapplybuttonelement)}`;
 }

 ShowDialogBox()
 {
  if (!this.profile.length) return (this.dragableElements = [this.elementDOM]);											// No valid dialog content? Adjusted dialog box size, set drag capability and return
  this.currenttitleid = undefined;																						// Init title id to store current active profile title
  this.currentbuttonids = [];																							// Init empty array to store all active profile bundle specific button ids
  let e;

  // Define dialog box content inner HTML code via root (pad) profile recursive passing through. Additionally calculate current title element and buttons list
  let content = `<div class="boxcontentwrapper">${this.GetCurrentProfileHTML(this.profile[GetElementOptionByChecked(this.allelements[0].options)[3]], true)}</div>`;

  // Define title inner HTML via current or default one
  let title = this.GetElementContentHTML(this.allelements[this.currenttitlei === undefined ? this.defaulttitleid : this.currenttitleid]);

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

  // Set some parent interface props for the title DOM element if exist, otherwise for dialog box DOM element
  if (title = this.elementDOM.querySelector('.title'))
     {
      this.dragableElements = [title].concat([...title.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]);		// Set title with all child elements dragable
      this.dblclickableElements = [title].concat([...title.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]);	// Set title with all child elements double clickable
      this.RefreshCMIcon(title);																					// Set child management icon to the title element
     }
   else
     {
      this.dragableElements = [this.elementDOM];																	// Set dialog box DOM element dragable
      this.dblclickableElements = [this.elementDOM];																// Set dialog box DOM element double clickable
      this.RefreshCMIcon(this.elementDOM);																			// Set child management icon to the dialog box DOM element
     }

  // Set dialog box contentwrapper var to simplify dialog content and footer btns management
  this.pushableElements = [];
  this.contentwrapper = this.elementDOM.querySelector('.boxcontentwrapper');
  this.footer = this.elementDOM.querySelector('.footer');
  this.padbar = this.elementDOM.querySelector('.padbar');
  for (let button of this.footer.querySelectorAll('.button'))
	  {
	   let id;
	   [id, button] = GetEventTargetInterfaceElement(button);																									// Define button id to retreive btn GUI element below
	   const e = this.allelements[id];
	   if (e.flag.indexOf('-') === -1) this.pushableElements.push([button, button].concat([...button.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]));	// Set queried btn element (with all childs in) pushable. For enabled btns only
	   if (this.autoapplybuttonelement !== undefined && +id === this.autoapplybuttonelement.id) this.autoapplybuttonDOMelement = button;						// The btn is auto apply? Set <autoapplybuttonDOMelement> to use it for timer refresh
	  }

  // Set dialog box of itself as a resizing element
  this.resizingElement = this.elementDOM;

  // Set focus to the first found text element
  setTimeout(this.SetFirstTextElementFocus.bind(this), 1);

  // Remove ald and add new event listeners for textable/selectable elements to save their data interactively
  if (this.InputNodeList) this.InputNodeList.forEach((node) => node.removeEventListener('input', this.Handler.bind(this)));
  this.InputNodeList = this.contentwrapper.querySelectorAll('input, textarea');
  this.InputNodeList.forEach((node) => node.addEventListener('input', this.Handler.bind(this)));

  // Modify all user element paths depending on active profile bundles
  this.ModifyElementPathActiveProfiles();
 }

 ModifyElementPathActiveProfiles()
 {
  for (const e of this.allelements) if (e.selectionid === undefined) e.splitpath = e.path.split(SELECTABLEOPTIONSDIVIDER);	// Split user elements path

  for (const e of this.allelements)
	  {
	   if (e.selectionid === undefined) continue;																			// Parse only service elements
	   const nestedindex = e.path.split(SELECTABLEOPTIONSDIVIDER).length - 1;												// Calc profile selection path depth
	   const activeoption = GetElementOptionByChecked(e.options)[0];														// Get active profile name
	   const selectionid = e.selectionid;																					// Fix profile selection id to identify element profile membership
	   for (const e of this.allelements)
		   {
			if (e.selectionid !== undefined) continue;																		// Parse only user elements
			if (e.splitpath[nestedindex] === undefined) continue;															// Current element path depth is lower than upper profile selection
			let pos = e.splitpath[nestedindex].indexOf(PROFILEFIELDSDIVIDER);												// Get PROFILEFIELDSDIVIDER first appearance
			let part1 = pos === -1 ? e.splitpath[nestedindex] : e.splitpath[nestedindex].substring(0, pos);					// Split element path string to part1 (before PROFILEFIELDSDIVIDER)
			let part2 = pos === -1 ? '' : e.splitpath[nestedindex].substring(pos);											// Split element path string to part1 (after PROFILEFIELDSDIVIDER including one)
			pos = part2.indexOf(PROFILEFIELDSDIVIDER);																		// Get part2 string PROFILEFIELDSDIVIDER first appearance (flag value part)
			if (selectionid !== part2.substring(0, pos === -1 ? part2.length : pos).split('!').length - 1) continue;		// Current element profile membership doesn't match profile selection id? Continue
			if (part1[0] === CHECKEDOPTIONPREFIX) part1 = part1.substring(1);												// Remove first char CHECKEDOPTIONPREFIX if exist
			e.splitpath[nestedindex] = `${activeoption === part1 ? CHECKEDOPTIONPREFIX : ''}${part1}${part2}`;				// Modify element path with depending on cirrent active profile
		   }
	  }

  for (const e of this.allelements)
	  {
	   if (e.selectionid !== undefined) continue;
	   e.path = e.splitpath.join(SELECTABLEOPTIONSDIVIDER);
	   delete e.splitpath;
	  }
 }

 // Get current profile all interface elements outer HTML
 /*******************************************************************************************************************
  Functions pushes interface element <e> to the global element list (allelements array) with creating treelike profile structure:
  profile [
	   0: <element id number> (user defined element type'title|button|select|multiple|checkbox|radio|textarea|text|password|table')
	   1: <element id number> (system defined profile selection element type 'select')
	   2: <profile array>
	   3: <profile array>
	  ]
 *******************************************************************************************************************/
 GetCurrentProfileHTML(profile, recursive)
 {
  if (!Array.isArray(profile)) return '';
  let e, inner = '';
  for (const element of profile) if (typeof element === 'number' && (e = this.allelements[element]))
      switch (e.type)
	      	 {
	       	  case 'title':
		    	   this.currenttitleid = e.id;
		    	   break;
	       	  case 'button':
		    	   if (/\*/.test(e.flag)) this.currentbuttonids.push(e.id);
		    	   break;
	       	  default:
		    	   inner += this.GetElementHeaderHTML(e) + this.GetElementContentHTML(e) + this.GetElementFooterHTML(e);
				   if (e.selectionid !== undefined && recursive) inner += this.GetCurrentProfileHTML(profile[GetElementOptionByChecked(e.options)[3]], true);	// 
	      	 }
  return inner;
 }

 // Set focus to the '1st found' in child non-readonly text element 
 SetFirstTextElementFocus()
 {
  if (!this.elementDOM) return;
  for (const element of this.elementDOM.querySelectorAll('input[type=password], input[type=text], textarea'))
		  if (!element.readOnly) return element.focus();
 }

 RemoveProfileCloneInput()
 {
  this.profilecloning.isDeleted = true;
  if (this.profilecloning.e.id !== 0) this.profilecloning.wrapdiv.parentNode.firstChild.style.display = 'block';
  this.profilecloning.input.removeEventListener('blur', this.Handler.bind(this)); 
  this.profilecloning.wrapdiv.remove();
  this.profilecloning.input.remove();
  if (this.profilecloning.e.id === 0)
  	 {
	  this.padbar.outerHTML = this.GetElementContentHTML(this.allelements[0]);											// Cloning dialog pad? Refresh pad bar
  	  this.padbar = this.elementDOM.querySelector('.padbar');
	 }
  delete this.profilecloning;
 }

 // Inheritance function that is called on mouse/keyboard events on dialog box
 Handler(event)
 {
  let e, id, target;
  [id, target] = GetEventTargetInterfaceElement(event.target);															// Define the clicked element 'id' and its wrapped target
  if (!(e = this.allelements[id])) return;																				// Return for nonexistent element

  switch (event.type)
         {
	  	  case 'blur':																									// 
			   if (this.profilecloning)
				  {
				   if (this.profilecloning.isDeleted) break;
				   this.ProcessCloneButton();
				   this.RemoveProfileCloneInput();
				   break;
				  }
			   break;
	  	  case 'keyup':																									// Enter key for btn-apply/profile-cloning or left/right arrow key with Alt+Ctrl hold for pad selection
	       	   if (event.keyCode === 27)
				  {
				   if (!this.profilecloning) break;
				   this.RemoveProfileCloneInput();
				   return { type: 'NONE' };
				  }
			   if (event.keyCode === 13)
		  		  {
				   if (this.profilecloning)
					  {
					   this.ProcessCloneButton();
						this.RemoveProfileCloneInput();
					   break;
					  }
				   if (e.type !== 'text' || e.flag.indexOf('-') !== -1) break;											// For 'text' type and no readonly elements only
				   for (id of this.callbuttonids)																		// Go through all callable btns and apply first non readonly one
					   if ((e = this.allelements[id]).flag.indexOf('-') === -1 && !this.ButtonApply(e)) break;
				   break;
		       	  }
	       	   if (event.keyCode === 37 || event.keyCode === 39)
		  		  {
				   if (!event.altKey || !event.shiftKey) break;															// No Alt/Ctrl hold? Break
				   if (!ShiftElementOption(this.allelements[0].options, event.keyCode === 37 ? -1 : 1, true)) break;	// Option hasn't been changed? Break;
				   this.ShowDialogBox();
				   break;
		       	  }
			   break;
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
		  case 'mouseupuncap':
			   if (ELEMENTSELECTABLETYPES.indexOf(e.type) === -1) break;												// Sort order change for selectable element types only
			   if (event.target.classList.contains('itemadd')) break;													// and for non profile clone icon click
			   if (event.target.classList.contains('itemremove')) break;												// and for non profile remove icon click
			   this.ChangeElementSortOrder(e, target);																	// Right with left btn held change sort order
		   	   break;
	  	  case 'mousedown':																								// Mouse any button down on element (event.which values: 1 - left mouse btn, 2 - middle btn, 3 - right btn)
			   if (event.which === 3) break;																			// Process right btn down event first, all code out of this 'if' case is left-btn event related
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
								this.profilecloning.input.setAttribute('placeholder', 'Enter profile name');
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

 // Sort order change, see element flag description
 ChangeElementSortOrder(e, target)
 {
  e.flag.indexOf('^') === -1 ? e.flag += '^' : e.flag = e.flag.indexOf('a') === -1 ? (e.flag + 'a').replaceAll(/\^/g, '') : e.flag.replaceAll(/a|\^/g, '');
  target.outerHTML = this.GetElementContentHTML(e);
  if (e.id === 0) this.padbar = this.elementDOM.querySelector('.padbar');
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
		 return new DialogBox(...MessageBox(this.parentchild, `Profile name '${newprofile.name}' already exists!`, 'Clone error'));							// Cloning profile name matches new profile name? Return
  newprofile.flag = (newprofile.flag || '').replaceAll(/!/g, '');																							// Remove selection-id '!' chars
  newprofile.flag = newprofile.flag.padStart(this.profilecloning.e.selectionid + newprofile.flag.length, '!');												// Add cloning profile selection id to the new profile flag to match cloning selection id
  if (newprofile.flag) newprofile.flag = '|' + newprofile.flag;
  newprofile.head = newprofile.head === undefined ? '' : `|${newprofile.head}`;
  newprofile.hint = newprofile.hint === undefined ? '' : `|${newprofile.hint}`;
  this.CloneCurrentProfileElements(this.profilecloning.e.profile[activeprofileoption[3]], newprofile.name + newprofile.flag + newprofile.head + newprofile.hint, this.profilecloning.e.path.split(SELECTABLEOPTIONSDIVIDER).length - 1);
  for (const e of this.allelements) if (e.options && e.selectionid !== undefined) CorrectCheckedOptions(e.options, e.type);									// New profile user selectable elements are all with corrected checked options (see last line of function CloneCurrentProfileElements). But not service selectable elements (such as profile selection) in just created profile. So correct their checked optoins.
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
		  if (id === this.autoapplybuttonelement.id)
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
  if (e.flag.indexOf('-') !== -1) return;													// Do nothing for 'readonly' (disabled) btns
  if (this.callbuttonids.indexOf(e.id) !== -1 && this.DialogDataCallback)					// Applied btn id is controller callable? Save all dialog data and call the controller
     {
	  this.ClearDialogDataFromServiceProps();												// Delete unnecessary element props
  	  this.ModifyElementPathActiveProfiles();												// Modify all user element paths depending on active profile bundles
	  this.DialogDataCallback(this.data);													// Call back function to process dialog data or lg('Calling controller with data', this.data);
     }
  if (this.allelements[e.id].flag.indexOf('!') !== -1) return;								// Button is interactive? Return
  if (this.dropdownlist && this.parentchild.childs[this.dropdownlist.id])
	 this.parentchild.KillChild(this.dropdownlist.id);										// Othewise kill drop-down list if exist
  this.parentchild.KillChild(this.id);														// and dialog box of itself
 }
}
