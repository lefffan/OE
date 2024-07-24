const DIALOGSELECTABLEELEMENTMAXOPTIONS	= 1024;
const BUTTONTIMERMAXSECONDS				= 60 * 60 * 24 * 7; // One week
const ELEMENTUSERPROPS					= ['path', 'type', 'head', 'hint', 'data', 'flag', 'accl'];
const ELEMENTSERVICEPROPS				= ['id', 'options', 'selectionid', 'timer', 'timerstart', 'eventcounter'];
const ELEMENTSELECTABLETYPES			= ['select', 'multiple', 'checkbox', 'radio'];
const ELEMENTTEXTTYPES					= ['textarea', 'text', 'password'];
const SELECTABLEOPTIONSDIVIDER			= '/';
const PROFILEFIELDSDIVIDER				= '|';
const CHECKEDOPTIONPREFIX				= '!';
const EMPTYOPTIONTEXT					= ' ';

// Todo0 in october (OD structure in DB)
// Todo0 - Cursor scheme default, custom
// Todo0 - DB SQL handle for OD structure
// Todo1 - Make interface btns and background like in VCSA and dialog box scale (cause it seems too compact)
// Todo2 - Somehow use some nice colors: orange RGB(243,131,96), 247,166,138; blue RGB(87,156,210), 50,124,86; bordovij RGB(136,74,87), 116,63,73; salatovij (174,213,129), 150,197,185;
// Todo0 - macros for interface elements margins/fonts to scale/form dialog box. Also use macroses in user css configuration profile! Make 3-level macro; 1 - global (system user), 2 - OD, 3 - Specific user.

// Todo0 in september (all for sidebar):
// Todo0 - Make sidebar from the virtual data - look for 16 april in diary book

// Todo0 in august (other src code):
// Todo0 - Make new todo.txt that was done during EOS work
// Todo0 - Shemsetdinov justify src arch via require/import + remove windows.js code to index.js 
// Todo0 - Figure out another way instead of app.eventcounter for dropdown list
// Todo0 - Make code overview for all other sources, do it like dialogbox.js done

// Todo0 in july (dialogbox.js):
// Todo0 - Pass through all dialog.js to check syntax and test every dialog feature one by one code line
	// Todo2 - make grey btns via html visual effects
	// Todo2 - Multuiple flag * creates rounded area arount GUI element
	// Todo2 - macros for interface elements margins/fonts to scale/form dialog box.
	// Todo2 - Bold font for headders?
	// Todo1 - selection bar incorrect appearance for scrolled up content wrapper block
	// Todo0 - Make pad/profiles +- btns; and make them pushable
// Todo0 - make interface element accl work
// Todo0 - arrows up/down selects prev/next option at focused 'select' element?
// Todo0 - Interface elements with type and path prop only - are correct and used to fix profile flag and head/hint
// Todo0 - Save flag '!' for last active profile
// Todo0 - split dialog box and drop down list class to different files

function CheckSyntax(e, prop)
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
			  	// Sort order (a^): + ascending alphabetical order, - descending alphabetical order, +-|-+ descending default, absent value: ascending default sort order (default), 
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
			  if (typeof e.data === 'string') return true;
			  break;

		 case 'textarea':
		 case 'text':
		 case 'password':
			  // head - interface element header inner html
			  // hint - interface element header text hint
			  // data - interface element text content.
			  // flag - divider(*), readonly(-), placeholder attribute (+)
			  // accl - `/regexp/prop && || ! ( )` - set of chars allowed for accl expreesion - in case of no readonly flag set and this accl expr true value - the element becomes readonly.
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
			  // accl - See text type description.
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
			  //        Number of '+' (minutes) and '-' (seconds) chars in any order do set the timer value (max one week) for the button to be applied automatically.
			  //			Once the auto-apply button appeares in the profile bundle the auto-apply feature is turned on and does exist regardless of button current profile appearance.
			  //			Example: flag string '+-+' sets 121 second timer.
			  //        profile-specific(*) flag displays buttons for this profile only and hide all other buttons. Non-specific btns are displayed in case of no any profile-specific ones.
			  // accl - See text type description. In case of true accl expression the button becomes grey.
			  if ((typeof e.data === 'string' && e.data) || /\+|\-/.test(e.flag))	// Button is visible or auto-apply?
			  	 if (e.flag.indexOf('!') === -1 || prop[0] === '_') return true;	// Button is non interactive or controller-call? Return correct syntax
			break;
		}
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
 // 'radio' - may have no options selected
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
	return options.sort((a, b) => (flag.indexOf('^') === -1 ? 1 : -1) * a[2] - b[2]);					// Default appearance ascending/descending order
  else 
    return options.sort((a, b) => (flag.indexOf('^') === -1 ? 1 : -1) * a[0].localeCompare(b[0]));		// Alphabetical ascending/descending order
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
	  oldchecked[1] = false;									// and uncheck old one
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

function GetTimerString(timer)
{
 if (typeof timer !== 'number') return '';
 timer = Math.round(timer/1000);					// Round timer (converted ms to seconds) to the nearest integer.

 let hour = '' + Math.trunc(timer/3600) + ':';		// Get integral part of the hours number plus ':' char.
 if (hour.length === 2) hour = '0' + hour;			// One digit hour string - add '0' before.

 let min = '' + Math.trunc((timer%3600)/60) + ':';	// Get integral part of the minutes number plus ':' char.
 if (min.length === 2) min = '0' + min;				// One digit minute string - add '0' before.

 let sec = '' + Math.trunc((timer%3600)%60);		// Get integral part of the seconds number plus ':' char.
 if (sec.length === 1) sec = '0' + sec;				// One digit second string - add '0' before.

 return ` (${hour}${min}${sec})`;
}

class DialogBox extends Interface
{
 profile = [];
 allelements = [];

 defaulttitleid = undefined;
 currenttitleid = undefined;

 defaultbuttonids = [];
 currentbuttonids = [];
 callbuttonids = [];

 autoapplybuttontimeoutid = undefined;
 autoapplybuttonid = undefined;
 autoapplybuttonelement = undefined;

 static style = {
		   // dialog box global css props
		   ".dialogbox": { "background-color": "rgb(233,233,233);", "color": "#1166aa;", "border-radius": "5px;", "border": "solid 1px #dfdfdf;" },
		   // dialog box title
		   ".title": { "background-color": "rgb(209,209,209);", "color": "#555;", "border": "#000000;", "border-radius": "5px 5px 0 0;", "font": "bold .9em Lato, Helvetica;", "padding": "5px;" },
		   // dialog box pad
		   ".pad": { "background-color": "rgb(223,223,223);", "border-left": "none;", "border-right": "none;", "border-top": "none;", "border-bottom": "none;", "padding": "5px;", "margin": "0;", "font": ".9em Lato, Helvetica;", "color": "#57C;", "border-radius": "5px 5px 0 0;" },
		   // dialog box active pad
		   ".activepad": { "background-color": "rgb(209,209,209);", "border-left": "none;", "border-right": "none;", "border-top": "none;", "border-bottom": "none;", "padding": "5px;", "margin": "0;", "font": "bold .9em Lato, Helvetica;", "color": "#57C;", "border-radius": "5px 5px 0 0;" },
		   // dialog box pad bar
		   ".padbar": { "background-color": "transparent;", "border": "none;", "padding": "4px 4px 0 4px;", "margin": "10px 0 0 0;" },
		   // dialog box divider
		   ".divider": { "background-color": "transparent;", "margin": "5px 10px 5px 10px;", "height": "0px;", "border-bottom": "1px solid #CCC;", "border-top-color": "transparent;", "border-left-color": "transparent;" , "border-right-color": "transparent;" },
		   // dialog box button
		   ".button": { "background-color": "#13BB72;", "border": "none;", "padding": "10px;", "margin": "10px;", "border-radius": "5px;", "font": "bold 12px Lato, Helvetica;", "color": "white;" },
		   // dialog box button push
		   ".buttonpush": { "transform": "translate(3%, 3%);" },
		   // dialog box button and pad hover
		   ".button:hover, .pad:hover, .itemadd:hover, .itemremove:hover": { "cursor": "pointer;", "border": "" },
		   // dialog box element headers
		   ".element-headers": { "margin": "5px 5px 5px 5px;", "font": ".9em Lato, Helvetica;", "color": "#555;", "text-shadow": "none;" },
		   // dialog box help icon
		   ".hint-icon": { "padding": "1px;", "font": ".9em Lato, Helvetica;", "color": "#555;", "background-color": "#FF0;", "border-radius": "40%;" },
		   // dialog box help icon hover
		   ".hint-icon:hover": { "padding": "1px;", "font": "bold 1em Lato, Helvetica;", "color": "black;", "background-color": "#E8E800;", "cursor": "help;", "border-radius": "40%;" },
		   // dialog box table
		   ".boxtable": { "font": ".8em Lato, Helvetica;", "color": "black;", "background-color": "transparent;", "margin": "10px;", "table-layout": "fixed;", "width": "auto;", "box-sizing": "border-box;" },
		   // dialog box table cell
		   ".boxtablecell": { "padding": "7px;", "border": "1px solid #999;", "text-align": "center" },
		   // dialog box modal effect
		   ".modalfilter": { "filter": "blur(1px) grayscale(0.2);", "_filter": "Dialog box modal effect appearance via css filter property, see appropriate css documentaion." },
		   //------------------------------------------------------------
		   // dialog box select
		   ".select": { "background-color": "rgb(243,243,243);", "color": "#57C;", "font": ".8em Lato, Helvetica;", "margin": "0px 10px 5px 10px;", "outline": "none;", "border": "1px solid #777;", "padding": "0px 0px 0px 0px;", "overflow": "auto;", "max-height": "150px;", "min-width": "20em;", "width": "auto;", "display": "inline-block;", "effect": "rise", "_effect": "Select fall-down option list " + EFFECTSHINT },
		   // dialog box select option
		   ".select > div": { "padding": "2px 20px 2px 5px;", "margin": "0px;" },
		   // dialog box select option hover
		   ".select:not([class*=arrow]) > div:hover": { "background-color": "rgb(211, 222, 192);", "color": "" },
		   // dialog box select option selected
		   ".selected": { "background-color": "rgb(211, 222, 192);", "color": "#fff;" },
		   // Profile selection additional style
		   ".profileselectionstyle": { "border-radius": "4px;" },
		   // Expanded selection
		   ".expanded": { "display": "block;", "margin": "0 !important;", "padding": "0 !important;", "position": "absolute;", "overflow-y": "auto !important;", "overflow-x": "hidden !important;", "max-height": "500px !important;" },
		   //------------------------------------------------------------
		   // dialog box radio
		   "input[type=radio]": { "background-color": "transparent;", "border": "1px solid #777;", "font": ".8em/1 sans-serif;", "margin": "3px 5px 6px 10px;", "border-radius": "20%;", "width": "1.2em;", "height": "1.2em;" },
		   // dialog box radio checked
		   "input[type=radio]:checked::after": { "content": "", "color": "white;" },
		   // dialog box radio checked background
		   "input[type=radio]:checked": { "background-color": "#00a0df;", "border": "1px solid #00a0df;" },
		   // dialog box radio label
		   "input[type=radio] + label": { "color": "#57C;", "font": ".8em Lato, Helvetica;", "margin": "0px 10px 0px 0px;" },
		   //------------------------------------------------------------
		   // dialog box checkbox
		   "input[type=checkbox]": { "background-color": "#f3f3f3;", "border": "1px solid #777;", "font": ".8em/1 sans-serif;", "margin": "3px 5px 6px 10px;", "border-radius": "50%;", "width": "1.2em;", "height": "1.2em;" },
		   // dialog box checkbox checked
		   "input[type=checkbox]:checked::after": { "content": "", "color": "white;" },
		   // dialog box checkbox checked background
		   "input[type=checkbox]:checked": { "background-color": "#00a0df;", "border": "1px solid #00a0df;" },
		   // dialog box checkbox label
		   "input[type=checkbox] + label": { "color": "#57C;", "font": ".8em Lato, Helvetica;", "margin": "0px 10px 0px 0px;" },
		   //------------------------------------------------------------
		   // dialog box input text
		   "input[type=text]": { "margin": "0px 10px 5px 10px;", "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "none;", "color": "#57C;", "border-radius": "5%;", "font": ".9em Lato, Helvetica;", "width": "90%;", "min-width": "300px;" },
		   // dialog box input password
		   "input[type=password]": { "margin": "0px 10px 5px 10px;", "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "none", "color": "#57C;", "border-radius": "5%;", "font": ".9em Lato, Helvetica;", "width": "90%;", "min-width": "300px;" },
		   // dialog box input textarea
		   "textarea": { "margin": "0px 10px 5px 10px;", "padding": "2px 5px;", "background-color": "#f3f3f3;", "border": "1px solid #777;", "outline": "", "color": "#57C;", "border-radius": "5%;", "font": ".9em Lato, Helvetica;", "width": "90%;", "min-width": "300px;" },
		};

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

  // No valid dialog structure, so let it be empty
  if (!this.data || typeof this.data !== 'object') this.data = {};

  // Iterate all dialog interface elements one by one in initial dialog data
  for (const element in this.data)
	  {
	   if (!CheckSyntax(this.data[element], element)) { delete this.data[element]; continue; }								// Check element content syntax, incorrect? Delete prop and continue
	   for (const prop in this.data[element]) if (ELEMENTUSERPROPS.indexOf(prop) === -1) delete this.data[element][prop];	// Clear interface element from unnecessary props
	   this.PushInterfaceElement(this.data[element], element);																// Push interface element to the global elements array 'allelements'
	  }

  // Process all selectable elements, including service ones (profile selections) to correct their checked options number
  for (const e of this.allelements) if (e.options) CorrectCheckedOptions(e.options, e.type);

  // Process all correct dialog interface element 'accl' properties for true/false state
  // Insert code here

  // Show dialog box:) 
  this.ShowDialogBox();
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
  let currentprofile = this.profile;

  // Parse element path first. Path' prop has next format: <profile1(pad) name>[/<profile2 name>\<flags>\<profile header>\<profile hint>/../<profileN name>]
  // Parse element <e> path first. Path' prop has next format: <profile1>[/../<profileN>]. First profile is root profile of selectable pads, other (non root) profiles are optional and present drop-daown list of selectable options.
  // Each profile consists of its name (with optional CHECKEDOPTIONPREFIX for the currently selected profile), flags, head and hint separated via PROFILEFIELDSDIVIDER. All are optional.
  for (const name of e.path.split(SELECTABLEOPTIONSDIVIDER))
      {
	   // Init some needed vars for splited path name
	   let nestedprofileindex, option, currente, profilename, profileflag, profilehead, profilehint;
	   [profilename, profileflag, profilehead, profilehint] = name.split(PROFILEFIELDSDIVIDER, 4);												// Split current profile splited path to its name, flag, head and hint
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
			if (profileflag !== undefined) currente.flag = profileflag;																			// Override profile selection flag if defined
			if (profilehead !== undefined) currente.head = profilehead;																			// Override profile selection head if defined
			if (profilehint !== undefined) currente.hint = profilehint;																			// Override profile selection hint if defined
			if (option !== undefined) break;																									// Option name is found in <currente> profile selection? Break
			option = ParseSelectableElementData(profilename)[0];																				// Define new selection profile option with profilename as an input data,
			option[2] = currente.options.length;																								// change its appearance id
			currente.options.push([...option, nestedprofileindex, currente.flag.replaceAll(/[^\+\-]/g, '')]);									// Then add that new option to profile selection element 'currente' with additional nested profile index and profile specific flags (+|-) if exist
			break;																																// All job is done, break the cycle
	 	   }

       // Insert new profile selection element and its empty profile array
       if (nestedprofileindex === undefined)
		  {
		   currente = { id: this.allelements.length, type: 'select', head: profilehead, hint: profilehint, flag: profileflag || '' };			// Define new profile selection element
		   currente.selectionid = currente.flag.split('!').length - 1;																			// Define its selection id
		   currente.options = ParseSelectableElementData(profilename);																			// And its parsed <options> array
		   currente.options[0].push(currentprofile.length + 1, currente.flag.replaceAll(/[^\+\-]/g, ''));										// For the added <profilename> as a last option of profile selection element: add nested profile index and profile specific flags (+|-) if exist
		   this.allelements.push(currente);																										// Insert new profile selection element to the global element list
		   nestedprofileindex = currentprofile.push(currente.id, []) - 1;																		// Insert empty profile array the last added option points to, and assign nested profile index to point to that profile array
		  }

	   // Go to parsed splited path profile
       currentprofile = currentprofile[nestedprofileindex];
      }

  e.id = this.allelements.length;
  if (e.type === 'title' && typeof e.data === 'string' && this.defaulttitleid === undefined) this.defaulttitleid = e.id;						// In case of no default dialog box title set - element is set as a default one, otherwise new title element is added to the current nested profile
  if (e.type === 'button' && !(/\+/.test(e.flag))) this.defaultbuttonids.push(e.id);															// Add btn to default global btn array, in case of flag '+' set - the btn is used for a current pad/profile only with no default btns displayed
  if (e.type === 'button' && prop[0] === '_') this.callbuttonids.push(e.id);																	// Put all callable btns (with leading '_') to appropriate array
  if (ELEMENTSELECTABLETYPES.indexOf(e.type) !== -1) e.options = ParseSelectableElementData(e.data);											// Create parsed options array for selectable elements
  this.allelements.push(e); 																													// Insert user defined element to the 'allelements' global array
  currentprofile.push(e.id);																													// Insert user defined element id to the current profile based on calculated path above
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

  if (ELEMENTTEXTTYPES.indexOf(e.type) !== -1)
	 {
	  if (e.flag.indexOf('+') !== -1) placeholder = ` placeholder="${AdjustString(e.flag.substr(e.flag.indexOf('+') + 1), TAGATTRIBUTEENCODEMAP)}"`;// Placholder attribute for text elements
	 }
  if (ELEMENTSELECTABLETYPES.indexOf(e.type) !== -1)
	 {
	  if (!e.options.length) return '';																												// No options for selectable element? Return empty
	  for (const option of e.options) if (option[1] && ((activeoption = option) || true)) break;													// Search for element active option
	  if (e.selectionid !== undefined)																												// Profile selection detected
		 {
		  if (e.options.length === 1 && !e.head && !e.hint) return '';																				// One single profile and no head/hint? Profile selection is hidden
	  	  if (activeoption[4].indexOf('+') !== -1) add += '<div class="itemadd">&nbsp&nbsp&nbsp&nbsp</div>';										// Define 'clone' icon for the active profile
	  	  if (activeoption[4].indexOf('-') !== -1) add += '<div class="itemremove">&nbsp&nbsp&nbsp&nbsp</div>';										// Define 'remove' icon for the active profile
		 }
	  SortSelectableElementData(e.options, e.flag);																									// Sort element option for selectable types
	}

  switch (e.type)
         {
          case 'title':
	    	   return e.data ? `<div class="title">${AdjustString(e.data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}</div>` : '';				// Empty title string? Whole title element is invisible
		  case 'select':
			   let arrowindex = 0;
			   if (e.flag.indexOf('a') !== -1) arrowindex += 2;																						// Calculate sort icon via arrow<index> class:
			   if (e.flag.indexOf('^') !== -1) arrowindex += 1;																						// arrow[01]: default appearance ascending/decending order, arrow[23]: alphabetical ascending/descending order
			   let classlist = `select arrow${arrowindex}${e.selectionid === undefined ? '' : ' profileselectionstyle'}${add ? ' flexrow' : ''}`;	// Define corresponded class list string for 'select' element. Add specific style 'profileselectionstyle' for profile selection
			   if (this.allelements[0] !== e)																										// For usual 'select' element return only active option content (expanded dorp-down list is hidden)
				  return `${add ? '<div class="flexrow" '+ attribute + '>' : ''}<div class="${classlist}"${add ? '' : ' ' + attribute}><div value="${activeoption[2]}">${AdjustString(activeoption[0] ? activeoption[0] : EMPTYOPTIONTEXT, HTMLINNERENCODEMAP)}</div></div>${add ? add + '</div>' : ''}`;
			   for (let option of e.options)																										// For pad selection element (pad bar) collect pad divs to 'content' var
				   content += `<div class="${option[1] ? 'activepad' : 'pad'}${option[1] && add ? ' flexrow' : ''}" value="${option[2]}">${add && option[1] ? '<div>' : ''}${AdjustString(option[0] ? option[0] : EMPTYOPTIONTEXT, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}${add && option[1] ? '</div>' + add : ''}</div>`;
			   return `<div class="padbar flexrow" ${attribute}>${content}</div>`;
		  case 'multiple':
			   for (const option of e.options) content += `<div value="${option[2]}"${option[1] ? ' class="selected"' : ''}>${AdjustString(option[0] ? option[0] : EMPTYOPTIONTEXT, HTMLINNERENCODEMAP)}</div>`;	// For multiple selection element collect option divs
			   return `<div class="select" ${attribute}>${content}</div>`;																																			// Return div wraped content
		  case 'checkbox':
		  case 'radio':
			   for (const i in e.options)																																						// For checkbox/readio element types collect input and label tags
				   content += `<input type="${e.type}" class="${e.type}" ${e.options[i][1] ? ' checked' : ''}${disabled} name="${uniqeid}" id="${uniqeid + '_' + i}" value="${e.options[i][2]}"><label for="${uniqeid + '_' + i}" value="${e.options[i][2]}">${AdjustString(e.options[i][0], HTMLINNERENCODEMAP)}</label>`;
			   return `<div ${attribute}>${content}</div>`;
		  case 'textarea':
			   return `<textarea type="textarea" class="textarea" ${attribute}${readonly}${placeholder}>${AdjustString(e.data, HTMLINNERENCODEMAP)}</textarea>`;								// For textarea element type return textarea tag
		  case 'text':
		  case 'password':
			   return `<input type="${e.type}" class="${e.type}" ${attribute}${readonly} value="${AdjustString(e.data, TAGATTRIBUTEENCODEMAP)}"${placeholder}>`;								// For text/password element types return input tag with appropriate type
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
	      	   return `<div class="button" ${attribute}${e.head ? ' style="' + AdjustString(e.head, TAGATTRIBUTEENCODEMAP) + '"' : ''}>${AdjustString(e.data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}${GetTimerString(e.timer)}</div>`;
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
  const e = this.allelements[this.autoapplybuttonid];																					// Retrieve button element
  e.timer -= new Date().getTime() - e.timerstart;																						// Calculate estimated timer in milliseconds
  e.timer < 0 ? this.ButtonApply(this.autoapplybuttonid) : this.autoapplybuttontimeoutid = setTimeout(() => this.ButtonTimer(), 1000);	// Timer is up? Apply the button or restart the timer function
  if (!this.autoapplybuttonelement) return;																								// Btn is visible? Refresh its timer string below
  this.autoapplybuttonelement.innerHTML = `${AdjustString(this.allelements[this.autoapplybuttonid].data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}${GetTimerString(e.timer)}`;
 }

 ShowDialogBox()
 {
  if (!this.profile.length) return this.AdjustElementDOMSize() || (this.dragableElements = [this.elementDOM]);			// No valid dialog content? Adjusted dialog box size, set drag capability and return
  this.currenttitleid = undefined;																						// Init title id to store current active profile title
  this.currentbuttonids = [];																							// Init empty array to store all active profile bundle specific button ids

  // Define dialog box content inner HTML code via root (pad) profile recursive passing through. Additionally calculate current title element and buttons list
  let content = `<div class="boxcontentwrapper">${this.GetCurrentProfileHTML(this.profile[GetElementOptionByChecked(this.allelements[0].options)[3]], true)}</div>`;

  // Define title inner HTML via current or default one
  let title = this.GetElementContentHTML(this.allelements[this.currenttitlei === undefined ? this.defaulttitleid : this.currenttitleid]);

  // Define padbar inner HTML
  let padbar = this.GetElementContentHTML(this.allelements[0]);

  // Define footer inner HTML
  if (!this.currentbuttonids.length) this.currentbuttonids = this.defaultbuttonids;									// No active profile bundle specific buttons? Use default button list with non specific ones
  if (this.autoapplybuttonid === undefined) for (const id of this.currentbuttonids)									// No auto apply button ever defined? Parse all current buttons on their auto apply feature (flags +|-)
	 {
	  const e = this.allelements[id];																						// Fix current button element
	  if (!(/\+|\-/.test(e.flag))) continue;																				// The button has no auto apply feature? Continue or calculate the timer and execute auto apply otherwise
	  e.timer = 1000 * Math.min(e.flag.split('+').length - 1 + (e.flag.split('-').length - 1) * 60, BUTTONTIMERMAXSECONDS);	// Calculate button auto-apply timer in milliseconds
	  e.timerstart = new Date().getTime();																					// Store current time value in milliseconds since midnight, January 1, 1970
	  this.autoapplybuttontimeoutid = setTimeout(() => this.ButtonTimer(), 1000);											// Execute button timer in one second
	  this.autoapplybuttonid = e.id;																						// Store this btn id to exclude all other auto apply btns if exist
    }
  if (this.autoapplybuttonid !== undefined && this.currentbuttonids.indexOf(this.autoapplybuttonid) === -1)					// Auto apply button doesn't exist in current btns array? Add it
	 this.currentbuttonids.push(this.autoapplybuttonid);
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

  // Pass through all button DOM elements to set some props
  this.pushableElements = [];
  for (const button of this.elementDOM.querySelectorAll('.button'))
      {
       this.pushableElements.push([button, button].concat([...button.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]));											// Set queried btn element (with all childs in) pushable
       if (this.autoapplybuttonid !== undefined && this.GetEventTargetInterfaceElement(button)[0]?.id === this.autoapplybuttonid) this.autoapplybuttonelement = button;	// The btn is auto apply? Set <autoapplybuttonelement> to use it for timer refresh
      }

  // Set dialog box contentwrapper var to simplify dialog content saving
  this.contentwrapper = this.elementDOM.querySelector('.boxcontentwrapper');

  // Set dialog box of itself as a resizing element
  this.resizingElement = this.elementDOM;

  // Set focus to the first found text element
  setTimeout(this.SetFirstTextElementFocus, 1, this);

  // Set dialog box size to 100x100 (function args default values) if it is less than DOMELEMENTMINWIDTH/DOMELEMENTMINHEIGHT
  this.AdjustElementDOMSize();
 }

 // Get current profile all interface elements outer HTML
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
 SetFirstTextElementFocus(child)
 {
  if (!child.elementDOM) return;
  for (const element of child.elementDOM.querySelectorAll('input[type=password], input[type=text], textarea'))
      if (!element.readOnly) return element.focus();
 }

 // Get interface element link with its wrapped html element from 'target' DOM element via 'data-element' attribute
 GetEventTargetInterfaceElement(target)
 {
  let attribute;
  while (true)																						// Search for 'data-element' attribute until its true
		{
		 if (!target) break;																		// Undefined target? Break it right now
		 attribute = target.attributes?.['data-element']?.value;									// Retrieve 'data-element' attribute
		 if (attribute) break;																		// Retrieved attribute is valid? Break it
		 target = target.parentNode;																// Go uplink node
		}
  if (!attribute) return [];																		// No valid attribute found? Return empty array

  const element = this.allelements[attribute.substr(attribute.indexOf('_') + 1)];					// Get interafce element link via its id (after char '_') parsed from found attribute
  return element ? [element, target] : [];															// Return result array with onterface element and its target (wrapped DOM element)
 }

 // Inheritance function that is called on mouse/keyboard events on dialog box
 Handler(event)
 {
  let e, target;
  switch (event.type)
         {
	  	  case 'keyup':																									// left/right arrow key with Alt and Ctrl hold for pad selection
	       	   if (event.keyCode === 37 || event.keyCode === 39)
		  		  {
				   if (!event.altKey || !event.shiftKey) break;															// No Alt/Ctrl hold? Break
				   if (!ShiftElementOption(this.allelements[0].options, event.keyCode === 37 ? -1 : 1, true)) break;	// Option hasn't been changed? Break;
				   this.SaveDialogCurrentProfile();
				   this.ShowDialogBox();
		       	  }
			   break;
	  	  case 'mousedown':																								// Mouse any button down on element (event.which values: 1 - left mouse btn, 2 - middle btn, 3 - right btn)
			   [e, target] = this.GetEventTargetInterfaceElement(event.target);											// Define the clicked element 'e' and its wrapped target
			   if (!e) break;																							// Break for undefined element 'e'
			   if (event.which === 3)																					// Process right btn down event first, all code out of this 'if' case is left-btn event related
				  {
				   if (ELEMENTSELECTABLETYPES.indexOf(e.type) !== -1) this.ChangeElementSortOrder(e, target);			// Right btn down changes sort order
				   break;
				  }
		       switch (e.type)
				  	  {
					   case 'radio':
							if (ChangeElementOptionById(e.options, event.target.attributes?.value?.value)) {};			// Change element data and restart 'accl' expr
				   			break;
					   case 'checkbox':
							if (ToggleElementOptionById(e.options, event.target.attributes?.value?.value)) {};			// Change element data and restart 'accl' expr
							break;
					   case 'multiple':
							if (!ToggleElementOptionById(e.options, event.target.attributes?.value?.value)) break;		// Toggle clicked option and break in case of no change
							event.target.classList.toggle("selected");													// Refresh 'multiple' element via option class toggle
							break;
					   case 'select':
							if (this.IsProfileCloneRemoveEvent(event.target)) break;									// Mouse down on profile clone/remove icon? Do nothing, process it at mouse up event
							if (e === this.allelements[0])
						   	   {
								if (!ChangeElementOptionById(e.options, event.target.attributes?.value?.value)) break;	// Set clicked pad and break in case of no change
								this.SaveDialogCurrentProfile();														// Save dialog and refresh otherwise
								this.ShowDialogBox();
								break;
						   	   }
							if (e.eventcounter !== app.eventcounter) new DropDownList(e, this, event.target);			// Drop-down option list hide/occur. Any event occur increases global applcication class 'app' counter, so drop-down list (expand select class) 'hide event' refreshes its parent select element counter, so its value mismatch of app counter means hidden drop-down list. Create and display new list in case
							break;
					  }
			   break;
		  case 'mouseup':
			   [e, target] = this.GetEventTargetInterfaceElement(event.target);											// Define the clicked element 'e' and its wrapped target
			   if (!e) break;																							// Break for undefined element 'e'
			   if (e.type === 'button')
		      	  {
			       if (this.currentbuttonids.indexOf(e.id) !== -1) this.ButtonApply(e.id);								// Button id does exist in current profile bundle? Call button apply for the button id in case
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
 }

 // Target DOM element is on clone/remove icon?
 IsProfileCloneRemoveEvent(target)
 {
  return target.classList.contains('itemadd') || target.classList.contains('itemremove');
 }

 // Clone/remove profile
 ProcessProfileCloneRemove(e)
 {
  //this.SaveDialogCurrentProfile();
 }

 // Save dialog profile :)
 SaveDialogCurrentProfile()
 {
  let e;
  const radioids = new Set();																														// Create new set collection to store radio/checkbox ids to detect appropriate DOM element 1st appearance
  const elements = this.contentwrapper.querySelectorAll('input, textarea, .select');																// Get contnet wrapper all textable/selectable elements
  for (const element of elements)																													// Pass through all DOM elements of dialog box content (html element 'contentwrapper')
	  {
	   if (!(e = this.GetEventTargetInterfaceElement(element)[0])) continue;																		// Retrieve GUI element object
	   if (ELEMENTTEXTTYPES.indexOf(e.type) !== -1)
		  {
		   e.data = element.value;																													// Get text element data from its DOM element value
           continue;
		  }
	   if (ELEMENTSELECTABLETYPES.indexOf(e.type) === -1 || e.selectionid !== undefined) continue;													// Exclude non 'select' elements or profile selections (for user defined 'select' only)
	   if (radioids.has(e.id)) continue;																												// Element repeat appearance? Break
	   radioids.add(e.id);																															// Add element id
	   e.data = '';																																	// Init element data
	   for (const i in e.options) e.data += `${i ? SELECTABLEOPTIONSDIVIDER : ''}${e.options[i][1] ? CHECKEDOPTIONPREFIX : ''}${e.options[i][0]}`;	// Collect element data from from DOM element directly
	  }
 }

 ButtonApply(eid)
 {
  if (this.autoapplybuttonid === eid) clearTimeout(this.autoapplybuttontimeoutid);			// Applied btn id is auto-apply? Cancel timeout
  if (this.callbuttonids.indexOf(eid) !== -1)												// Applied btn id is controller callable? Save all dialog data and call the controller
     {
      this.SaveDialogCurrentProfile();
      for (const i in this.data)
		  for (const prop of ELEMENTSERVICEPROPS) delete this.data[i].prop;					// Delete unnecessary element props
	  lg('Calling controller with data', data);												// Call controller 
     }
  if (this.allelements[eid].flag.indexOf('!') === -1) this.parentchild.KillChild(this.id);	// Kill dialog box for non-interactive btn
 }
}

class DropDownList extends Interface
{
 constructor(e, dialogbox, target)
 {
  // Create element 'e' drop-down option list
  super(e, dialogbox.parentchild, {overlay: 'NONSTICKY', effect: 'rise', flags: CLOSEESC}, {class: 'select expanded', style: `left: ${target.offsetLeft + dialogbox.elementDOM.offsetLeft}px; top: ${target.offsetTop + dialogbox.elementDOM.offsetTop + target.offsetHeight}px;`}); // (data, parentchild, props, attributes)
  this.dialogbox = dialogbox;

  // And fill it with element options
  let content = '';
  for (const option of e.options) content += `<div value="${option[2]}" class="selectnone${option[1] ? ' selected' : ''}">${AdjustString(option[0] ? option[0] : EMPTYOPTIONTEXT, HTMLINNERENCODEMAP)}</div>`;
  this.elementDOM.innerHTML = content;
  this.resizingElement = this.elementDOM;
 }

 // Drop-down option list 'hide event' sets its parent select element prop 'eventcounter' to the current one to indicate whether it's hidden or not
 Hide()
 {
  this.data.eventcounter = app.eventcounter;
  super.Hide();
 }

 // Handle interface events
 Handler(event)
 {
  if (event.which === 3 || event.type !== 'mouseup') return;								// Handle only one left btn mouse up event
  if (ChangeElementOptionById(this.data.options, event.target.attributes?.value?.value))	// Drop-down options list click selects another option? Kill myself
  	 {
	  this.dialogbox.SaveDialogCurrentProfile()												// Save dialog content data
	  this.dialogbox.ShowDialogBox();														// and refresh it
	 }
  return { type: 'KILLME' };
 }
}
