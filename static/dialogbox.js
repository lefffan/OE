const DIALOGSELECTABLEELEMENTMAXOPTIONS	= 4096;
const BUTTONTIMERMAXSECONDS				= 60 * 60 * 24 * 7; // One week

// Todo0 - Make pad/profiles +- btns and make interface element accl work
// Todo0 - Justify src arch via require/import
// Todo0 - Comment all sources, order and understand them
// Todo0 - Make sidebar from the virtual data - look for 16 april in diary book
// Todo0 - DB SQL handle for OD structure
// Todo1 - selection bar incorrect appearance for scrolled up content wrapper block
// Todo1 - Make interface btns and background like in VCSA
// Todo1 - make grey btns via html visual effects
// Todo2 - Somehow use some nice colors: orange RGB(243,131,96), 247,166,138; blue RGB(87,156,210), 50,124,86; bordovij RGB(136,74,87), 116,63,73; salatovij (174,213,129), 150,197,185;

function CheckSyntax(e)
{
 if (!e || typeof e !== 'object') return;		// Return for non-object element
 delete e.listid;								// Delete element listid prop cause it is used for system purpose
 if (typeof e.flag !== 'string') e.flag = '';	// Flag string is mandatory
 if (typeof e.path !== 'string') e.path = '';	// Path is a nested profiles list divided by '/', so it must be a string and should start from root profile name (pad)
 e.path = e.path.replace(/^\/+/, '');			// Remove slash chars from the start of a path, cause it should start from root profile name (pad)
 e.path = e.path.replace(/\/+$/, '');			// Remove slash chars from the end of a path
 if (!e.path) e.path = ' ';						// Path cannot be empty and must contain at least one root profile (pad) name, using space as root pad for default

 // Check every intreface element on next types: 'title|select|multiple|checkbox|radio|textarea|text|password|table|button'
 // Prop 'type' is mandatory for all elements, so 'path' is. Dialog box interface elements are grouped by 'path' prop with next format: pad1[/profile1/../profileN]
 // Path should start with pad name and then with nested profiles (optionally) divided by single or multiple slash chars.
 // Each pad/profile consists of some interface elements and/or other nested profiles in.
 // Pad/profile names shouldn't be empty, so slash chars from both ends of a path are truncated.
 // Empty/undefined path property automatically converted to space char root profile (pad).
 // Profiles (not pads) may be grouped to a separate selections via consecutive slashes, so profile names with one number of slashes before - are in one selection, with other number of slashes - in other selection.
 switch (e.type)
        {
         case 'profile':
			  // 1. Clone/remove profile 2. Profile head/hint 3. Active flag 4. Profile selection id
			  // /Element\+-!!!_\\/eid1 /Element/eid2 /Element/eid3
		 case 'title':
			  // head - profile list header inner html
			  // hint - profile list header text hint
			  //        In case of a single member in a list (one pad/profile) appropriate pad bar or profile selection is hidden until head (or hint) prop is set.
			  //        Multiple pads or profiles are always displayed in a pad bar or profile selection.
			  // data - dialog title inner html. This prop of any path first appearance sets the title as a default one. The title will be displayed until any other title appeared in an active profile bundle.
			  //        Empty title string (data='') makes whole title element interface invisible. To set emtpy title visible use space char title.
			  // flag - divider(_)
			  //        sort order (|+-|+|-): + ascending alphabetical order, - descending alphabetical order, +-|-+ descending default, absent: ascending default sort order (default behaviour), 
			  //        	Sorting method is applied among current nested level the pad/profile is a memeber of.
			  //        active(!) Set pad/profile as an active (selected) one
			  // accl - profile is clonable and may be used as a template to add new profiles (+)
			  //        profile is removable (-)
			  // For all types except 'button' - at least one prop (head, hint, data or flag) should be defined.
			  // For all types except 'title'/'button' - in case of incorrect/undefined data, interface element is frozen and its purpose is to display head/hint/divider only.
			  if (typeof e.head === 'string' || typeof e.hint === 'string' || typeof e.data === 'string' || /_|\+|\-|\!/.test(e.flag)) return true;
			  break;

		 case 'textarea':
		 case 'text':
		 case 'password':
			  // head - interface element header inner html
			  // hint - interface element header text hint
			  // data - interface element text content.
			  // flag - divider(_), readonly(!), placeholder attribute (+)
			  // accl - `/regexp/prop && || ! ( )` - set of chars allowed for accl expreesion - in case of no readonly flag set and this accl expr true value - the element becomes readonly.
			  //		Undefined/incorrect props have negative value.
			  if (typeof e.head === 'string' || typeof e.hint === 'string' || typeof e.data === 'string' || /_/.test(e.flag)) return true;
			  break;

	     case 'select':
		 case 'multiple':
		 case 'checkbox':
		 case 'radio':
			  // head - interface element header inner html
			  // hint - interface element header text hint
			  // data - interface element content of selectable options divided by '/'.
			  //        Option with multiple slashes before are considered as a selected/checked one, so empty option cannot be set.
			  // flag - divider(_), sort order(|+-|+|-), readonly(!).
			  // accl - See text type description. For checkbox and radio types only.
			  if (typeof e.head === 'string' || typeof e.hint === 'string' || typeof e.data === 'string' || /_/.test(e.flag)) return true;
			  break;

		 case 'table':
			  // head - interface element header inner html
			  // hint - interface element header text hint
			  // data - interface element 2d dimension object content with properties as a table rows. Each row property is a table cells property list.
			  //        Each cell property, in turn, is a cell <td> tag inner html.
			  // flag - divider(_)
			  if (typeof e.head === 'string' || typeof e.hint === 'string' || typeof e.data === 'object' || /_/.test(e.flag)) return true;
			  break;

		 case 'button':
			  // head - button element style attribute
			  // hint - Warning message to confirm controller call. Or just info message in case of 'no action' button.
			  // data - button inner html, undefined/empty/incorrect data makes button invisibe and usually used with auto apply feature (see below), as an example - disappearing info messages
			  // flag - interactive(!), no hide dialog after button apply which generates two cases:
			  //		1) Button property name with leading '_' char makes a controller call action with a property name (without '_') as a dialog event initiated the call.
			  //		2) Btn property name without leading '_' just makes no action, so no call-controller action btns with interactive flag make no sense cause no dialog kill even made.
			  //        Number of '-' (minutes) and '_' (seconds) chars in any order do set the timer value (max one week) for the button to be applied automatically.
			  //               Once the auto-apply button appeares in the profile bundle the auto-apply feature is turned on and does exist regardless of button current profile appearance.
			  //               Example: flag string '-_-' sets 121 second timer.
			  //        profile-specific(+) flag displays buttons for this profile only and hide all other buttons. Non-specific btns are displayed in case of no any profile-specific ones.
			  // accl - See text type description. In case of true accl expression the button becomes grey.
			  if ((typeof e.data === 'string' && e.data) || (/_|\-/.test(e.flag) && e.flag.indexOf('!') === -1)) return true;
			  break;
		}
}

function SortSelectDataArray(arr, flag)
{
 if (!Array.isArray(arr) || typeof flag !== 'string') return;

 if (/\+.*\-|\-.*\+/.test(flag)) return arr.sort((a, b) => b[2] - a[2]);
 if (/\+/.test(flag)) return arr.sort((a, b) => a[0].localeCompare(b[0]));
 if (/\-/.test(flag)) return arr.sort((a, b) => -1 * a[0].localeCompare(b[0]));
 return arr.sort((a, b) => a[2] - b[2]);
}

function PrepareSelectableData(e)
{
 // Check if sorted data already exist
 if (e.sortdata) return SortSelectDataArray(e.sortdata, e.flag);

 // Init data
 e.sortdata = [];
 if (typeof e.data !== 'string' || !e.data) return; // Element with no/empty data is considered as element with one header only
 let ischecked = 0, checkedcount = 0;

 // Adjust data
 e.data = e.data.replace(/\/+$/, ''); // Trailing slashes for 'selectable' elements data are unnecessary
 e.data = e.data.replace(/^\//, ''); // Remove leading slash for 'selectable' elements data

 // Generate sorted data array
 for (const option of e.data.split('/'))
  if (option)
     {
      if (e.sortdata.length > DIALOGSELECTABLEELEMENTMAXOPTIONS) break;
      ischecked = (e.listid === undefined || e.profileids[e.activeprofileid] !== option) ? ischecked : true; // For usual 'select' element checked option is calculated via consecutive slashes (ischecked count > 0), for pad/profile selection (listid prop is not undefined) - via active profile id name in $profileids and $option match
      e.sortdata.push([option, ischecked, String(e.sortdata.length)]); // Insert new element with 2 values - option and selected/checked flag (non zero flag value - the option is checked)
      if (ischecked) checkedcount ++;
      ischecked = 0; // Reset ischecked flag
     }
   else
     {
      ischecked ++; // The option is selected, so set the flag
     }

 // Sort data array
 SortSelectDataArray(e.sortdata, e.flag);

 // Correct checked options number for 'select' and 'radio' element types
 if (e.type === 'select' || e.type === 'radio')
    {
     if (!checkedcount && e.type === 'select') // Element with 'select' type should have at least one option selected, so in case of no one - set 1st option selected
	{
         e.sortdata[0][1] = true;
         checkedcount = 1;
        }
     for (let i = e.sortdata.length - 1; i >= 0; i --) // Element with 'select'/'radio' types should have one option selected only, so remove all except one/none
         {
          if (checkedcount < 2) break;
          checkedcount --;
          e.sortdata[i][1] = 0;
         }
    }
}

function SelectElementOption(arr, value, toggle)
{
 let res;
 if (typeof value == 'number') value += '';
 if (typeof value !== 'string') return;

 for (let option of arr)
     if (option[2] === value)
	{
	 if (!toggle && option[1]) return;
	 res = option[0];
	 option[1] = toggle ? !option[1] : true;
	}
      else
	{
	 option[1] = toggle ? option[1] : false;
	}
 return res;
}

function GetTimerString(timer)
{
 if (typeof timer !== 'number') return '';
 timer = Math.round(timer);

 let hour = '' + Math.trunc(timer/3600) + ':';
 if (hour.length === 2) hour = '0' + hour;

 let min = '' + Math.trunc((timer%3600)/60) + ':';
 if (min.length === 2) min = '0' + min;

 let sec = '' + Math.trunc((timer%3600)%60);
 if (sec.length === 1) sec = '0' + sec;

 return ` (${hour}${min}${sec})`;
}

class DialogBox extends Interface
{
 profile = [];
 elementlinks = [];
 autoapplybuttontimeoutid = undefined;
 autoapplybuttonid = undefined;
 autoapplybuttonelement = undefined;

 defaulttitleindex = undefined;
 defaultbuttonsindexes = [];
 callbuttonsindexes = [];

 currenttitleindex = undefined;
 currentbuttonsindexes = [];

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
  // Call parent constructor with the given args (data, parentchild, props, attributes)
  super(...args);

  // No valid dialog structure, so let it be empty
  if (!this.data || typeof this.data !== 'object') this.data = {};

  // Iterate all dialog interface elements one by one and exclude space consisted prop names and elements with incorrect syntax by deleting them from the source dialog data
  for (const prop in this.data)
	  {
	   (prop.indexOf(' ') === -1 && CheckSyntax(this.data[prop])) ? this.PushInterfaceElement(this.data[prop], prop) : delete this.data[prop];
	  }
  
  // Process all correct dialog interface element 'accl' properties for true/false state
  /*for (const prop in this.data)
	{
	 if (prop.indexOf(' ') === -1 && CheckSyntax(this.data[prop])) ? this.PushInterfaceElement(this.data[prop], prop) : delete this.data[prop];
	}*/

// Show dialog box:) 
  this.ShowDialogBox();
 }

 PushInterfaceElement(e, prop) // Push interface element to global list (elementlinks array)
 {
  let nestedprofileindex, id, listid = 0, current = this.profile;

  // Parse element path first
  for (const name of e.path.split('/'))
      {
       listid ++; // Increment list id (slash count before the name)
       if (!name) continue; // Do nothing in case of empty path
       nestedprofileindex = undefined;

       // Search from current profile items for both path splited name and list id match
       for (id of current)
	   {
	    if (typeof id !== 'number' || this.elementlinks[id].listid !== listid) continue;
	    if ((nestedprofileindex = SearchPropValue(this.elementlinks[id].profileids, name)) !== undefined) break;
	    this.elementlinks[id].data += '/' + name;
	    nestedprofileindex = current.push([]) - 1;
	    this.elementlinks[id].profileids[nestedprofileindex] = name;
	    break;
	   }

       // In case of no match create new nested profile
       if (nestedprofileindex === undefined)
	  {
	   id = this.elementlinks.push({ id: this.elementlinks.length, type: current === this.profile ? 'padbar' : 'select', listid: listid, activeprofileid: current.length + 1, data: name, flag: '', profileids: {[current.length + 1]: name} }) - 1;
	   nestedprofileindex = current.push(id, []) - 1;
	  }

       current = current[nestedprofileindex]; // Go to nested profile
       listid = 0; // Reset list id
      }

  // Add element interface to the current nested profile, not forgetting of default title and btns. Also title element doesn't only set dialob box title, but profile selection header/hint/divider
  switch (e.type)
	 {
	  case 'title':
	       // Copy props for profile selection virtual interface element
	       // In case of no default dialog box title set - element is set as a default one, otherwise new title element is added to the current nested profile
	       if (typeof e.head === 'string') this.elementlinks[id]['head'] = e.head;
	       if (typeof e.hint === 'string') this.elementlinks[id]['hint'] = e.hint;
	       if (typeof e.data === 'string')
		  {
		   current.push(e.id = this.elementlinks.push(e) - 1);
		   if (this.defaulttitleindex === undefined) this.defaulttitleindex = e.id;
		  }
	       if (!e.flag) break;
	       this.elementlinks[id]['flag'] += e.flag; // Collect flag values to the specified pad/profile
	       if (/\!/.test(e.flag)) this.elementlinks[id]['activeprofileid'] = nestedprofileindex; // Set current profile active in case of flag '!' set
	       break;
	  case 'button':
	       current.push(e.id = this.elementlinks.push(e) - 1);
	       if (!(/\+/.test(e.flag))) this.defaultbuttonsindexes.push(e.id); // Add btn to default global btn array, in case of flag '+' set - the btn is used for a current pad/profile only with no default btns displayed
	       if (prop[0] === '_') this.callbuttonsindexes.push(e.id); // Put all callable btns (with leading '_') to appropriate array
	       break;
	  default:
	       current.push(e.id = this.elementlinks.push(e) - 1);
	 }
 }

 GetElementHeaderHTML(e)
 {
  let header = '';

  if (['title', 'padbar', 'button'].indexOf(e.type) === -1) // For non title/padbar/btn elements only
	 {
  	  if (e.head && typeof e.head === 'string') header += AdjustString(e.head, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS);
  	  if (e.hint && typeof e.hint === 'string') header += ` <span title="${AdjustString(e.hint, TAGATTRIBUTEENCODEMAP)}" class="hint-icon">?</span>&nbsp;`;
  	  if (header) header = `<div class="element-headers">${header}</div>`;
	 }

  return header;
 }

 GetElementContentHTML(e)
 {
  const uniqeid = `${this.id + '_' + e.id}`;
  const attribute = `data-element="${uniqeid}"`;
  let content = '';
  let readonly = /\!/.test(e.flag) ? ' readonly' : '';
  let disabled = readonly ? ' disabled' : '';
  let placeholder = (e.flag.indexOf('+') === -1 || ['textarea', 'text', 'password'].indexOf(e.type) === -1) ? '' : ` placeholder="${AdjustString(e.flag.substr(e.flag.indexOf('+') + 1), TAGATTRIBUTEENCODEMAP)}"`;

  switch(e.type)
        {
         case 'title':
	    	  if (!e.data) return ''; // Empty title string? Whole title element is invisible
	    	  return `<div class="title">${AdjustString(e.data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}</div>`;

	 	 case 'padbar':
	    	  PrepareSelectableData(e);
	    	  if (!e.sortdata.length) return ''; // No any pad, no pad bar. Actually 'no pad' means no dialog at all.
	    	  if (e.sortdata.length === 1 && !e.head && !e.hint) return ''; // One single pad and no head/hint? Pad bar is hidden
	    	  //for (let i in e.sortdata) content += `<div class="${e.sortdata[i][1] ? 'activepad' : 'pad'}" ${attribute} value="${i}">${AdjustString(e.sortdata[i][0], HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}</div>`;
			  let clss;
	      	  for (let i in e.sortdata)
				  {
					let classes = `${e.sortdata[i][1] ? 'active' : ''}pad${/\+|\-/.test(e.flag) ? ' flexrow' : ''}`;
					let add = `${/\+/.test(e.accl) && e.sortdata[i][1] ? '<div class="itemadd" ${attribute}>&nbsp&nbsp&nbsp&nbsp</div>' : ''}${/\-/.test(e.flag) && e.sortdata[i][1] ? '<div class="itemremove" ${attribute}>&nbsp&nbsp&nbsp&nbsp</div>' : ''}`;
					content += `<div class="${classes}" ${attribute} value="${i}">${add ? '<div>' : ''}${AdjustString(e.sortdata[i][0], HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}${add ? '</div>' : ''}${add}</div>`;
				  }
				  /*if (e.sortdata[i][1])
					 {
					  content += `<div class="activepad flexrow" ${attribute} value="${i}"><div>${AdjustString(e.sortdata[i][0], HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}</div><div class="itemadd" ${attribute}>&nbsp&nbsp&nbsp&nbsp</div><div class="itemremove" ${attribute}>&nbsp&nbsp&nbsp</div></div>`;
					 }
				   else
				   	 {
					  content += `<div class="pad" ${attribute} value="${i}">${AdjustString(e.sortdata[i][0], HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}</div>`;
					 }*/
			  //`<div ${flexstyle} class="${e.sortdata[i][1] ? 'activepad' : 'pad'}" ${attribute} value="${i}"><div>${AdjustString(e.sortdata[i][0], HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}</div>${e.sortdata[i][1] ? '<div class="itemadd">&nbsp&nbsp&nbsp&nbsp</div><div class="itemremove">&nbsp&nbsp&nbsp</div>' : ''}</div>`;
	    	  return `<div class="padbar flexrow" ${attribute}>${content}</div>`;

		 case 'select':
			  PrepareSelectableData(e);
			  if (!e.sortdata.length) return '';
			  if (e.listid !== undefined && e.sortdata.length === 1 && !e.head && !e.hint) return ''; // One single profile and no head/hint? Profile selection is hidden
			  for (let i in e.sortdata)
			  	  if (e.sortdata[i][1]) return `<div class="select arrow${/\+.*\-|\-.*\+/.test(e.flag) ? '1' : /\+/.test(e.flag) ? '2' : /\-/.test(e.flag) ? '3' : '0'}${e.listid === undefined ? '' : ' profileselectionstyle'}" ${attribute}><div ${attribute} value="${e.sortdata[i][2]}">${AdjustString(e.sortdata[i][0], HTMLINNERENCODEMAP)}</div></div>`;
			  return '';

		 case 'multiple':
			PrepareSelectableData(e);
			if (!e.sortdata.length) return '';
			for (let i in e.sortdata) content += `<div ${attribute} value="${e.sortdata[i][2]}"${e.sortdata[i][1] ? ' class="selected"' : ''}>${AdjustString(e.sortdata[i][0], HTMLINNERENCODEMAP)}</div>`;
			if (content) content = `<div class="select" ${attribute}>${content}</div>`;
			return content;
		case 'checkbox':
		case 'radio':
			PrepareSelectableData(e);
			if (!e.sortdata.length) return '';
			for (let i in e.sortdata)
			content += `<input type="${e.type}" class="${e.type}" ${attribute}${e.sortdata[i][1] ? ' checked' : ''}${disabled} name="${uniqeid}" id="${uniqeid + '_' + i}"><label for="${uniqeid + '_' + i}">${AdjustString(e.sortdata[i][0], HTMLINNERENCODEMAP)}</label>`;
			return content;
		case 'textarea':
			return `<textarea type="textarea" class="textarea" ${attribute}${readonly}${placeholder}>${AdjustString(e.data, HTMLINNERENCODEMAP)}</textarea>`;
		case 'text':
		case 'password':
			return `<input type="${e.type}" class="${e.type}" ${attribute}${readonly} value="${AdjustString(e.data, TAGATTRIBUTEENCODEMAP)}"${placeholder}>`;
			case 'table':
			if (!e.data || typeof e.data !== 'object') return '';
			for (const row in e.data)
			{
			if (!e.data[row] || typeof e.data[row] !== 'object') continue;
			content += '<tr>';
			for (const cell in e.data[row]) content += `<td class="boxtablecell${cell[0] === '_' ? ' cursorpointer" data-id="' + AdjustString(cell, TAGATTRIBUTEENCODEMAP) + '"' : '"'}>${AdjustString(e.data[row][cell], HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}</td>`;
			content += '</tr>';
			}
			if (content) content = `<table class="boxtable" ${attribute}><tbody>${content}</tbody></table>`;
			return content;
	 case 'button':
	      if (this.autoapplybuttonid === undefined && /_|\-/.test(e.flag))
		 {
		  e.gap = e.timer = Math.min(e.flag.split('_').length - 1 + (e.flag.split('-').length - 1) * 60, BUTTONTIMERMAXSECONDS); // Calculate button auto-apply timer in sec
		  e.timerstart = new Date().getTime();
		  this.autoapplybuttontimeoutid = setTimeout(() => this.ButtonTimer(), 1000);
		  this.autoapplybuttonid = e.id;
		 }
	      return (typeof e.data === 'string' && e.data) ? `<div class="button" ${attribute}${e.head ? ' style="' + AdjustString(e.head, TAGATTRIBUTEENCODEMAP) + '"' : ''}>${AdjustString(e.data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}${GetTimerString(e.gap)}</div>` : '';
	}
 }

 ButtonTimer()
 {
  const e = this.elementlinks[this.autoapplybuttonid];
  e.gap = e.timer - (new Date().getTime() - e.timerstart)/1000;
  e.gap < 0 ? this.ButtonApply(this.autoapplybuttonid) : this.autoapplybuttontimeoutid = setTimeout(() => this.ButtonTimer(), 1000);
  //if (typeof e.data === 'string' && e.data) this.autoapplybuttonelement.innerHTML = `${AdjustString(this.elementlinks[this.autoapplybuttonid].data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}${GetTimerString(e.gap)}`;
  if (this.autoapplybuttonelement) this.autoapplybuttonelement.innerHTML = `${AdjustString(this.elementlinks[this.autoapplybuttonid].data, HTMLINNERENCODEMAP, ELEMENTINNERALLOWEDTAGS)}${GetTimerString(e.gap)}`;
 }

 GetElementFooterHTML(e)
 {
  if (e.type === 'title' || e.type === 'padbar' || e.type === 'button') return ''; // Return element divider line for non title/btn/padbar elements only
  return e.flag.indexOf('_') === -1 ? '<div></div>' : '<div class="divider"></div>'; // Return footer depended on divider flag set
 }

 ShowDialogBox()
 {
  if (!this.profile.length) return this.AdjustElementDOMSize() || (this.dragableElements = [this.elementDOM]); // No valid dialog content? Return empty innerHTML with adjusted size and drag capability

  this.currenttitleindex = undefined;
  this.currentbuttonsindexes = [];

  let padbar = this.elementlinks[0];
  let content = `<div class="boxcontentwrapper">${this.GetCurrentProfileHTML(this.profile[padbar.activeprofileid])}</div>`;
  padbar = this.GetElementContentHTML(padbar);

  if (this.currenttitleindex === undefined) this.currenttitleindex = this.defaulttitleindex;
  let title = this.currenttitleindex === undefined ? '' : this.GetElementContentHTML(this.elementlinks[this.currenttitleindex]);

  if (!this.currentbuttonsindexes.length) this.currentbuttonsindexes = this.defaultbuttonsindexes;
  let footer = '<div class="footer">';
  if (this.autoapplybuttonid !== undefined && this.currentbuttonsindexes.indexOf(this.autoapplybuttonid) === -1) footer += this.GetElementContentHTML(this.elementlinks[this.autoapplybuttonid]);
  for (const i of this.currentbuttonsindexes) footer += this.GetElementContentHTML(this.elementlinks[i]);
  footer += '</div>';

  this.elementDOM.innerHTML = title + padbar + content + footer;

  if (title = this.elementDOM.querySelector('.title'))
     {
      this.dragableElements = [title].concat([...title.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]);
      this.dblclickableElements = [title].concat([...title.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]);
      this.RefreshCMIcon(title);
     }
   else
     {
      this.dragableElements = [this.elementDOM];
      this.dblclickableElements = [this.elementDOM];
      this.RefreshCMIcon(this.elementDOM);
     }

  this.pushableElements = [];
  for (const button of this.elementDOM.querySelectorAll('.button'))
      {
       this.pushableElements.push([button, button].concat([...button.querySelectorAll(ELEMENTINNERALLOWEDTAGS.join(', '))]));
       if (this.autoapplybuttonid !== undefined && this.GetInterfaceElement(button).id === this.autoapplybuttonid) this.autoapplybuttonelement = button;
      }
  this.contentwrapper = this.elementDOM.querySelector('.boxcontentwrapper');
  this.resizingElement = this.elementDOM;
  setTimeout(this.SetFirstTextElementFocus, 1, this);
  this.AdjustElementDOMSize();
 }

 SetFirstTextElementFocus(child)
 {
  if (!child.elementDOM) return;
  for (let element of child.elementDOM.querySelectorAll('input[type=password], input[type=text], textarea'))
      if (!element.readOnly) return element.focus();
 }

 GetCurrentProfileHTML(profile)
 {
  /*******************************************************************************************************************
  profile [
	   0: <elemntid> (user defined element 'title|button|select|multiple|checkbox|radio|textarea|text|password|table')
	   1: <elemntid> (system defined profile selection '{listid, activeprofileid=3, flag, data, profileids{2: <name>, 3: <name>}, profileflags{2: <flag>, 3: <flag>}}')
	   2: profile []
	   3: profile []
	  ]
  *******************************************************************************************************************/
  let inner = '';

  for (let id in profile)
      {
       if (typeof profile[id] !== 'number') continue;
       const e = this.elementlinks[profile[id]];
       switch (e.type)
	      {
	       case 'title':
		    this.currenttitleindex = e.id;
		    break;
	       case 'button':
		    if (/\+/.test(e.flag)) this.currentbuttonsindexes.push(e.id);
		    break;
	       case 'select':
		    inner += this.GetElementHeaderHTML(e) + this.GetElementContentHTML(e) + this.GetElementFooterHTML(e);
		    if (e.listid !== undefined) inner += this.GetCurrentProfileHTML(profile[e.activeprofileid]);
		    break;
	       default:
		    inner += this.GetElementHeaderHTML(e) + this.GetElementContentHTML(e) + this.GetElementFooterHTML(e);
	      }
      }
  return inner;
 }

 GetInterfaceElement(target)
 {
  const attr = target.attributes?.['data-element']?.value;
  if (attr) return this.elementlinks[attr.substr(attr.indexOf('_') + 1)];
 }

 Handler(event)
 {
  let e = this.GetInterfaceElement(event.target);
  switch (event.type)
         {
	  case 'keyup':
	       if ((event.keyCode === 37 || event.keyCode === 39) && event.altKey && event.shiftKey)
		  {
		   e = [];
		   for (let i in this.elementlinks[0].profileids) e.push(+i);
		   for (let i in e) if (e[i] === +this.elementlinks[0].activeprofileid)
		       {
			if ((e = e[+i + (event.keyCode === 37 ? -1 : 1)]) === undefined) break;
			SelectElementOption(this.elementlinks[0].sortdata, +i + (event.keyCode === 37 ? -1 : 1));
			this.elementlinks[0].activeprofileid = e;
			this.SaveDialogProfile();
			this.ShowDialogBox();
			break;
		       }
		  }
	       break;
	  case 'mousedown':
	       switch (e?.type)
		      {
		       case 'select':
			    if (event.which === 3)
			       {
				e.flag = /\+.*\-|\-.*\+/.test(e.flag) ? '+' + e.flag.replace(/\+|\-/g, '') : /\+/.test(e.flag) ? '-' + e.flag.replace(/\+|\-/g, '') : /\-/.test(e.flag) ? e.flag.replace(/\+|\-/g, '') : '+-' + e.flag.replace(/\+|\-/g, '');
				event.target.parentNode.outerHTML = this.GetElementContentHTML(e);
				break;
			       }
			    if (e.eventcounter !== app.eventcounter) new ExpandedSelect(e, this, event.target);
			    break;
		       case 'multiple':
			    if (event.which === 3)
			       {
				e.flag = /\+.*\-|\-.*\+/.test(e.flag) ? '+' + e.flag.replace(/\+|\-/g, '') : /\+/.test(e.flag) ? '-' + e.flag.replace(/\+|\-/g, '') : /\-/.test(e.flag) ? e.flag.replace(/\+|\-/g, '') : '+-' + e.flag.replace(/\+|\-/g, '');
				event.target.parentNode.outerHTML = this.GetElementContentHTML(e);
				break;
			       }
			    if (SelectElementOption(e.sortdata, event.target.attributes?.value?.value, true) === undefined) break;
			    event.target.classList.toggle("selected");
			    break;
		       case 'padbar':
			    if (this.ProcessProfileAddRemove(event.target, e)) break;
			    e.activeprofileid = SearchPropValue(e.profileids, SelectElementOption(e.sortdata, event.target.attributes?.value?.value)) ?? e.activeprofileid;
			    this.SaveDialogProfile();
			    this.ShowDialogBox();
			    break;
		       case 'button':
			    if (this.currentbuttonsindexes[e.id]) this.ButtonApply(e.id);
			    break;
		      }
	       break;
	  case 'mouseup':
	       switch (e?.type)
		      {
		       case 'button':
			    if (this.currentbuttonsindexes.indexOf(e.id) !== -1) this.ButtonApply(e.id);
			    break;
		      }
	       break;
	 }
 }

 ProcessProfileAddRemove(target, e)
 {
lg (target)
  if (!target.classList.contains('itemadd') && !target.classList.contains('itemremove')) return;
  this.SaveDialogProfile();
lg(e)
  return true;
 }

 SaveDialogProfile()
 {
  this.contentwrapper.querySelectorAll('input, textarea, .select').forEach(element =>
  {
   const e = this.GetInterfaceElement(element);
   if (!e) return;
   switch (element.attributes?.type?.value)
	  {
	   case 'checkbox':
	   case 'radio':
		if (e.sortdata && !(e.data = '')) delete e.sortdata;
		e.data += `${element.checked ? '/' : ''}/${element.nextSibling.innerHTML}`;
                break;
	   case 'text':
	   case 'textarea':
	   case 'password':
                e.data = element.value;
                break;
	   default:
		if (e.type !== 'select' || e.listid !== undefined) break;
		e.data = '';
		SortSelectDataArray(e.sortdata, '');
                for (let option of e.sortdata) e.data += `${option[1] ? '/' : ''}/${option[0]}`;
		delete e.sortdata;
                break;
	  }
  });
 }

 ButtonApply(eid)
 {
  if (this.autoapplybuttonid === eid) clearTimeout(this.autoapplybuttontimeoutid); // Dialog pushed btn id is auto-apply? Cancel timeout

  if (this.callbuttonsindexes.indexOf(eid) !== -1) // Dialog pushed btn should call the controller? Save all dialog data and call the controller
     {
      this.SaveDialogProfile();
      for (const i in this.data) for (const prop of ['sortdata', 'id', 'eventcounter', 'timer', 'timerstart']) delete this.data[i].prop;
      lg(this.data);
     }

  const e = this.elementlinks[eid];
  if (!(/\!/.test(e.flag))) this.parentchild.KillChild(this.id); // Kill the child for non-interactive btn
 }
}

class ExpandedSelect extends Interface
{
 constructor(e, initialchild, target)
 {
  super(e, initialchild.parentchild, {overlay: 'NONSTICKY', effect: 'rise', flags: CLOSEESC}, {class: 'select expanded', style: `left: ${target.offsetLeft + initialchild.elementDOM.offsetLeft}px; top: ${target.offsetTop + initialchild.elementDOM.offsetTop + target.offsetHeight}px;`}); // (data, parentchild, props, attributes)
  this.initialchild = initialchild;

  let content = '';
  for (let i in e.sortdata) content += `<div value="${e.sortdata[i][2]}" class="selectnone${e.sortdata[i][1] ? ' selected' : ''}">${AdjustString(e.sortdata[i][0], HTMLINNERENCODEMAP)}</div>`;
  this.elementDOM.innerHTML = content;
  this.resizingElement = this.elementDOM;
 }

 Hide()
 {
  this.data.eventcounter = app.eventcounter;
  super.Hide();
 }

 Handler(event)
 {
  switch (event.type)
         {
	  case 'mouseup':
	       let option = event.target.attributes?.value?.value;
	       if (event.which === 3 || typeof option !== 'string') break;
	       option = SelectElementOption(this.data.sortdata, option);
	       if (option === undefined) return { type: 'KILLME' };
	       if (this.data.listid !== undefined) this.data.activeprofileid = SearchPropValue(this.data.profileids, option) ?? this.data.activeprofileid;
	       this.initialchild.SaveDialogProfile()
	       this.initialchild.ShowDialogBox();
	       return { type: 'KILLME' };
	 }
 }
}
