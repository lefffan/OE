export const SYSTEMELEMENTNAMES     = { id : 'Object identificator', version: 'Object store version', lastversion: 'Flag indicates the object last instance', mask: 'Object modified elements bit mask', ownerid: 'User id the object was created by', owner: 'User name the object was created by', datetime: 'Date and time this object version was created at', date: 'The date this object version was created at', time: 'The time this object version was created at' };
export const LAYOUTJSONPROPS        = ['row', 'col', 'x', 'y', 'value', 'style', 'hint', 'collapsecol', 'collapserow', 'event'];
export const SUPERUSER              = 'root';
export const BUTTONOK               = JSON.stringify({ type: 'button', data: '  OK  ', style: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: bold 14px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;`, flag: 'a' });
export const BUTTONCANCEL           = JSON.stringify({ type: 'button', data: 'CANCEL', style: `border: 1px solid rgb(227,125,87); color: rgb(227,125,87); background-color: transparent; font: bold 14px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;` });
export const BUTTONAPPLY            = JSON.stringify({ type: 'button', data: 'APPLY',  style: `border: 1px solid rgb(0, 124, 187); color: rgb(0, 124, 187); background-color: transparent; font: bold 14px Metropolis, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;`, flag: 'a*' });
export const MODALBOXPROPS          = JSON.stringify({ animation: 'rise', position: 'CENTER', overlay: 'MODAL', attributes: { class: 'dialogbox selectnone' } });
export const RANDOMSTRINGCHARS      = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const CELLMINWIDTH           = 25;
export const CELLMINHEIGHT          = 25;
export const EDITABLE               = 'plaintext-only';
export const NOTEDITABLE            = 'false';
export const ANIMATIONS		          = ['hotnews', 'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall', 'rise'];
export const TITLEVIRTUALROWID      = -2;
export const NEWVIRTUALROWID        = -1;
export const PRIMARYKEYSTARTVALUE   = 1;
export const HTMLINNERENCODEMAP		  = [['&', '<', '>', '\n', ' ', '"'], ['&amp;', '&lt;', '&gt;', '<br>', '&nbsp;', '&quot;']];	// Encoding map array of two arrays with symmetric values to encode corresponded array elements from 1st one to second
export const HTMLINNERDECODEMAP		  = [['&amp;', '&lt;', '&gt;', '<br>', '&nbsp;', '&quot;'], ['&', '<', '>', '\n', ' ', '"']];
export const TAGATTRIBUTEENCODEMAP	= [['<', '>', '\n', '"'], ['&lt;', '&gt;', '', '&quot;']];
export const TAGHTMLCODEMAP		      = [['<', '>', '\n'], ['&lt;', '&gt;', '']];
export const ELEMENTINNERALLOWEDTAGS= ['span', 'pre', 'br', 'b'];
export const ELEMENTCOLUMNPREFIX    = 'eid';
export const ELEMENTCOLUMNREGEXP    = new RegExp(`^${ELEMENTCOLUMNPREFIX}\\d+`);
export const DIGITS                 = /^\d*$/;
export const FIELDSDIVIDER          = '~';
export const OPTIONISCHECKED				= '!';
export const OPTIONISCLONED					= '*';
export const OPTIONISCLONABLE			  = '+';
export const OPTIONISREMOVABLE			= '-';
export const USERNAMEMAXCHAR        = 255;
export const WARNINGDIALOG          = JSON.stringify({ title: { type: 'title', data: 'Warning' }, msg: { type: 'table' }, ok: JSON.parse(BUTTONOK) });

export function GetTableNameId(name)
{
 let pos = name.indexOf('_');
 if (pos === -1) return;
 name = name.substring(pos + 1);
 return isNaN(+name) ? undefined : name;
}

// Function checks incoming <users> (user names and group names together) array to match the <list> and return true for any match. Superuser no check shoud be implemented before this function call
// Logical AND is applied for all negative lines (with '!' as a first char), so item 'admin' doesn't match the list '!root\n!admin' (all except root and admin), but matches the list '!root\n!support'.
// Also empty list doesn't match any item, item 'admin' matches the list 'admin\n!admin' and list '!' matches any item.
export function CheckUsersToMatchTheList(users, list)
{
 let match;
 if (!Array.isArray(users) || !users.length) throw new Error('Object Database/View permissions check failed: unknown user!');
 list = list.split('\n');

 for (let line of list) if (line = line.trim()) // Iterate all list lines
     if (line[0] === '!') match = true; // Set <mactch> to true for any negative line in a list
      else if (users.includes(line)) return true; // Return true for any item matches any line in a list

 for (let line of list) if (line = line.trim()) // Iterate all list lines once again
     if (line[0] === '!' && users.includes(line.substring(1))) return; // Once line is negative and any item matches the line return no-match

 return match; // Return true match for any negative line or no-match for no any negative line
}

// Function checks input od/ov ids (the user interacts) on restriction list with od/ov ids space divided combinations on each line. Algoritm checks line by line until the match is found to return true match, no any combination match returns false.
// Omitted ov matches all ovs in od, negative ov (with '!' as a leading char) matches all ovs except specified ov, negative od matches all ods except specified and regardless of ov id value in a combination.
// Empty list - no match, single char '!' matches all
// Example - user is trying to open Object View (ov) id 2 of Object Database (od) id 1. Hera some restriction lists and their match result:
// '1 3 \n 1 2' - the list matches. Opening OV2 of OD1 matches the 2nd line in a list
// '1 !3' - the list matches. Opening OV2 of OD1 matches the 1st line in a list, !3 matches all OVs except 3
// '1 3' - Opening OV2 of OD1 doesn't match the list
// '1' - the list matches. Omitted OV id matches all OVs of OD1
// '!1' - no match, list matches all OD ids except id1
// '!2  !2\n1 !2' - the list matches. Second line - no match (all OV ids except id2), but 1st line matches all ODs except OD id2
export function CheckViewsToMatchTheList(od, ov, list)
{
 let negative_od, negative_ov, match;
 const checklist = [];

 for (let line of list.split('\n')) if ((line = line.trim()) && (line = line.split(' '))) // Iterate all list lines except empty ones
     {
      line = [line[0].trim(), line.slice(1).join('').trim()]; // All lines in a restriction list are [!]od/[!]ov space divided, empty ov - matches all ovs in od
      checklist.push(line);
      if (line[0][0] === '!' && (negative_od = true)) continue;
      if (line[0] === od && line[1][0] === '!') negative_ov = true;
     }

 for (let line of checklist) // Go through all lines in a checklist to check all od/ov combinations match
     if (od === line[0] && (ov === line[1] || !line[1])) return true; // All lines in a check list are [!]od/[!]ov space divided, empty ov - matches all ovs in od

 if (negative_ov && (match = true)) for (let line of checklist) // Go through all lines with negative ov only, od in a list should be positive (without '!') and match input od
    if (od === line[0] && line[1][0] === '!' && ov === line[1].substring(1) && !(match = false)) break; // For the matched od check check ov - if it is negative and is matched - then the list doesn't match input od/ov, breaking cycle with faulsy match
 if (negative_ov && match) return true;

 if (negative_od && (match = true)) for (let line of checklist) // Go through all lines with negative od (ov is ignored in case, cause it doesn't matter) in a checklist
    if (line[0][0] === '!' && od === line[0].substring(1) && !(match = false)) break; // If od 1st char is '!' and od matches - then the list doesn't match input od/ov, breaking cycle with faulsy match
 if (negative_od) return match;
}

// Function creates regexp to match tag names list 'tags'
export function HTMLTagsRegexp(tags)
{
 let regexp = '';
 if (Array.isArray(tags)) for (const tag of tags) regexp += `<${tag} .*?>|<${tag} *>|<\/${tag} *>|`;
 return new RegExp(regexp.substring(0, regexp.length - 1), 'g');
}

// Function replaces every char in array encodemap[0] to corresponded chars in encodemap[1] array
export function EncodeString(string, encodemap)
{
 if (typeof string !== 'string') return '';
 if (!Array.isArray(encodemap) || !Array.isArray(encodemap[0]) || !Array.isArray(encodemap[1])) return string;

 for (let i = 0; i < encodemap[0].length; i ++)
     string = string.replace(new RegExp(encodemap[0][i], 'g'), encodemap[1][i]);
 return string;
}

// Function encodes string based on <encodemap> array (see EncodeString function above) excluding html tags in <excludehtmltags> array
export function AdjustString(string, encodemap, excludehtmltags, trim)
{
 if (typeof string !== 'string') return '';
 if (trim) string = string.trim();

 let result, newstring = '';
 if (Array.isArray(excludehtmltags)) while (result = HTMLTagsRegexp(excludehtmltags).exec(string))
    {
     newstring += EncodeString(string.substr(0, result.index), encodemap) + result[0];  // Convert special chars till the result.index and concatenate with the matched <tag> of itself
     string = string.substr(result.index + result[0].length);                           // Generate string after allowed <tag> for the next search
    }
 return newstring + EncodeString(string, encodemap);
}

const DIALOGBOXMACROSSTYLE	= { SIDE_MARGIN: '10px', ELEMENT_MARGIN: '10px', HEADER_MARGIN: '5px', TITLE_PADDING: '5px', BUTTON_PADDING: '10px', FONT: 'Lato, Helvetica' };
export const CUSTOMIZATIONS =
{
       "Sidebar": {
                   ".sidebar": { "border": "none;", "background-color": "rgb(12,68,118);", "border-radius": "5px;", "color": "#9FBDDF;", "width": "13%;", "height": "90%;", "left": "4%;", "top": "5%;", "box-shadow": "4px 4px 5px #222;", "padding": "16px 0 0 0;" },
                   ".changescount": { "vertical-align": "super;", "padding": "2px 3px 2px 3px;", "color": "rgb(232,187,174);", "font": "0.5em Lato, Helvetica;", "background-color": "rgb(125,77,94);", "border-radius": "35%"},
                   ".sidebar tr:hover": { "background-color": "#25589F;", "cursor": "pointer;", "margin": "100px 100px;" },
                   ".sidebar_folder": { "color": "", "font": "1.8em Lato, Helvetica;", "padding": "8px 0;", "margin": "" },
	                 ".sidebar_database": { "color": "", "font": "1.6em Lato, Helvetica;", "padding": "8px 0;", "margin": "" },
	                 ".sidebar_view": { "color": "", "font": "1.1em Lato, Helvetica;", "padding": "4px 0;", "margin": "" },
                   ".searchbar": { "margin": "4px 17px 1px 17px;", "border-radius": "5px;", "background-color": "rgb(32,88,138);", },
                   ".searchinput": { "color": "", "font": "0.9em Lato, Helvetica;", "paddin": "0;", "margin": "4px;", "outline": "none;", "border": "none;", "background-color": "inherit;", "color": "inherit;", "width": "90%;" },
                  },
  "Context menu": {
	                 ".contextmenu": { "position": "fixed;", "overflow": "hidden;", "background-color": "#F3F3F3;", "border": "solid 1px #dfdfdf;", "padding": "10px 0;", "border-radius": "5px;", "min-width": "200px;", "white-space": "nowrap;" },
	                 ".contextmenuitem": { "background-color": "transparent;", "color": "#1166aa;", "margin-bottom": "0px;", "font-family": "sans-serif;", "font-size": "16px;", "font-weight": "300;", "line-height": "1.5;", "padding": "5px 15px;" },
	                 ".greycontextmenuitem": { "background-color": "transparent;", "color": "#CCC;", "margin-bottom": "0px;", "font-family": "sans-serif;", "font-size": "16px;", "font-weight": "300;", "line-height": "1.5;", "padding": "5px 15px;" },
	                 ".contextmenuitem:hover": { "color": "#1166aa;", "background-color": "#e7e7e7;", "cursor": "pointer;" },
	                 ".contextmenuitemdivider": { "background-color": "transparent;", "margin": "5px 10px 5px 10px;", "height": "0px;", "border-bottom": "1px solid #CCC;", "border-top-color": "transparent;", "border-left-color": "transparent;" , "border-right-color": "transparent;" },
                  },
    "Dialog box": {
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
                   ".element-headers": { "margin": `${DIALOGBOXMACROSSTYLE.HEADER_MARGIN};`, "font": `.9em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "#555;", "text-shadow": "none;", "user-select": "text;" },
	                 // dialog box help icon
	                 ".hint-icon": { "padding": "1px;", "font": `1em Arial Narrow, ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "#555;", "background-color": "#FF0;", "border-radius": "40%;" },
	                 // dialog box help icon hover
	                 ".hint-icon:hover": { "padding": "1px;", "font": `bold 1em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "black;", "background-color": "#E8E800;", "cursor": "help;", "border-radius": "40%;" },
	                 // dialog box table
	                 ".boxtable": { "font": `.8em ${DIALOGBOXMACROSSTYLE.FONT};`, "color": "black;", "background-color": "transparent;", "margin": "10px;", "table-layout": "fixed;", "width": "auto;", "box-sizing": "border-box;" },
	                 // dialog box table cell
	                 ".boxtablecell": { "padding": "7px;", "border": "1px solid #999;", "text-align": "center" },
	                 // dialog box readonly elements css filter
	                 ".readonlyfilter": { "filter": "opacity(50%);", " filter": "Dialog box readonly elements css filter property to apply to, see appropriate css documentaion.", "cursor": "not-allowed !important;" },
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
                  },
 "Dropdown list": {
			             // Expanded selection
	                 ".expanded": { "display": "block;", "margin": "0 !important;", "padding": "0 !important;", "position": "absolute;", "overflow-y": "auto !important;", "overflow-x": "hidden !important;", "max-height": "500px !important;" },
 				          },
   "Application": {
	                 ".modalfilter": { "filter": "opacity(50%);", " filter": "Dialog box modal effect appearance via css filter property (such as opacity, blur and others), see appropriate css documentaion." },
	                 "::-webkit-scrollbar": { "width": "8px;", "height": "8px;", "cursor": "pointer !important;" },
	                 "*": { "scrollbar-width": "thin;", " scrollbar-width": "Set scrollbar thickness, available options are 'auto;', 'thin;' and 'none;'. For FireFox browser only! See appropriate css documentation", "scrollbar-color": "rgba(55, 119, 204, 0.3) rgba(255, 255, 255, 0);", " scrollbar-color": "Set space divided scrollbar thumb and track colors. For FireFox browser only! See appropriate css documentation" },
	                 " Appearance animation": { "Dialog box": "slideleft", " Dialog box": `Select interface elements (dialog box, context menu and others below) appearance animation such as ${ANIMATIONS.join(', ')}. Any other values - no animation is applied`, "Drop down list": "rise", "Context menu": "rise", "New connection": "", "New view": "" },
	                  " Force to use other user customization settings": { "Username": "" }, 
	                 //" Key combination to apply cell text": {},
	                 //" Logon events": { "Log unsuccessful logons": "", },
	                },
    "Connection": {
	                 ".connection": { "background-color": "#343e54;" },
	                },
          "View": {
	                 ".ovbox":                      { "position": "absolute;", "overflow": "none;", "min-width": "10%;", "min-height": "3%;", "border-radius": "4px;", "width": "30%;", "height": "30%;", "background-color": "RGB(230,230,230);", "box-sizing": "border-box;", "padding": "25px 0px 0px 0px;" },
	                 ".ovboxmessage":               { "display": "flex;", "overflow": "auto;", "justify-content": "center;", "align-items": "center;", "width": "100%;", "height": "100%;", "padding": "0 10px 0 10px;", "box-sizing": "border-box;", "t ext-align": "justify;" },
	                 ".scrollingcontainer":         { "width": "100%;", "height": "100%;", "box-sizing": "border-box;", "overflow": "auto;", "border": "none;", "outline": "none;" },
	                 ".gridcontainer":              { "display": "grid;", "box-sizing": "border-box;", "overflow": "none;", "margin": "0;", "padding": "0;", "width": "fit-content;", "height": "fit-content;", "border-left": "1px solid #999;", "border-top": "1px solid #999;" },
	                 ".undefinedcell":              { "padding": "10px;", "background-color": "",                                                                              "border": "1px solid #999;" },
	                 ".titlecell":                  { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#CCC;", "font": "",                 "border": "1px solid #999;" },
	                 ".newobjectcell":              { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#EFE;", "font": "",                 "border": "1px solid #999;" },
		               ".interactivecell":            { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "",      "font": "12px/14px arial;", "border": "1px solid #999;" },
		               ".noninteractivecell":         { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#EEE;", "font": "12px/14px arial;", "border": "1px solid #999;" },
		               ".virtualcell":                { "padding": "10px;", "color": "black;", "text-align": "center;", "background-color": "#EEE;", "font": "12px/14px arial;", "border": "1px solid #999;" },
                   ".noninteractivecursorcell":   { "outline": "red solid 1px;", "outline-offset": "-2px;", "box-shadow": "", "border": "" }, 
                   ".interactivecursorcell":      { "outline": "green solid 1px;", "outline-offset": "-2px;", "box-shadow": "", "border": "" }, 
                   ".celleditmode":               { "box-shadow": "rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px, rgba(10, 37, 64, 0.35) 0px -2px 6px 0px inset; !important;", "outline": "#1b74e9 solid 1px;", "outline-offset": "-2px;" },
                   ".clipboardcell":              { "filter": "blur(1px);" }, 
		               ".selectedcell":               { "background-color": "rgb(189,200,203) !important;" },
                   ".defaultcell":                { "margin-top": "-1px;", "margin-left": "-1px;", "box-sizing": "border-box;", "min-width": `${CELLMINWIDTH}px;`, "min-height": `${CELLMINHEIGHT}px;` },
		               [`.gridcontainer div:not([contenteditable=${EDITABLE}])`]:   { "cursor": "cell;" },
                  },
};

export const CUSTOMIZATIONDIALOG = { section: { type: 'select', head: 'Select customization section', data: {} },
                                     title: { type: 'title', data: 'GUI customization' },
                                     ok: JSON.parse(BUTTONOK),
                                     cancel: JSON.parse(BUTTONCANCEL),
                                   }
for (const customization in CUSTOMIZATIONS)
    {
     const section = { type: 'select', head: 'Select interface element to customize', data: {} };
     let customizationindex = 0;
     CUSTOMIZATIONDIALOG.section.data[customization] = { [customizationindex++]: section }; // Customization name is a profile name
     for (let profilename in CUSTOMIZATIONS[customization])
         {
          section.data[profilename.trim()] = {}; // Customization object property name is a nested profile name too
          let propindex = 0;
          const cssetting = CUSTOMIZATIONS[customization][profilename];
          for (const propname in CUSTOMIZATIONS[customization][profilename])
              if (propname[0] !== ' ') section.data[profilename.trim()][propindex++] = { type: 'text', head: `${propname}${cssetting[' ' + propname] ? '~' + cssetting[' ' + propname] : ''}`, data: cssetting[propname] };
         }
    }

export const OPTIONSDIVIDER              = '/';
export const NATIVEKEYBOARDEVENTS        = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'F1',    'F2',    'F3',    'F4',    'F5',    'F6',    'F7',    'F8',    'F9',    'F10',    'F11',    'F12',    'Space',    'Delete',    'BracketLeft',    'BracketRight'];
export const KEYBOARDEVENTS              = ['KEYA', 'KEYB', 'KEYC', 'KEYD', 'KEYE', 'KEYF', 'KEYG', 'KEYH', 'KEYI', 'KEYJ', 'KEYK', 'KEYL', 'KEYM', 'KEYN', 'KEYO', 'KEYP', 'KEYQ', 'KEYR', 'KEYS', 'KEYT', 'KEYU', 'KEYV', 'KEYW', 'KEYX', 'KEYY', 'KEYZ', 'KEY0',   'KEY1',   'KEY2',   'KEY3',   'KEY4',   'KEY5',   'KEY6',   'KEY7',   'KEY8',   'KEY9',   'KEYF1', 'KEYF2', 'KEYF3', 'KEYF4', 'KEYF5', 'KEYF6', 'KEYF7', 'KEYF8', 'KEYF9', 'KEYF10', 'KEYF11', 'KEYF12', 'KEYSpace', 'KEYDelete', 'KEYBracketLeft', 'KEYBracketRight', 'KEYPRESS'];
export const MOUSEEVENTS                 = ['DOUBLECLICK'];
export const MISCEVENTS                  = ['ADDOBJECT', 'DELETEOBJECT', 'CONFIRMEDIT', 'CONFIRMDIALOG', 'PASTE'];
export const CALLBACKEVENTS              = ['ONEVENT', 'ONTIMER'];
export const CLIENTEVENTS                = [...KEYBOARDEVENTS, ...MOUSEEVENTS, ...MISCEVENTS, ...CALLBACKEVENTS];
export const CONTROLLEREVENTS            = ['EMULATE', 'EDIT', 'DIALOG', 'SET', 'WRITE', 'PUT', 'ADJUST', 'RESET', 'UPDATE', 'PUSH', 'COLLECT', 'UPLOAD', 'DOWNLOAD', 'UNLOAD', 'GALLERY', 'NULL', 'COPY', 'NEWPAGE'];

export function SVGUrlHeader(viewwidth = '12', viewheight = '12', url = true, extraattribute = '')
{
 if (url) return `url("data:image/svg+xml,%3Csvg viewBox='0 0 ${viewwidth} ${viewheight}' width='${viewwidth}' height='${viewheight}' xmlns='http://www.w3.org/2000/svg'%3E`;
 return `<svg viewBox='0 0 ${viewwidth} ${viewheight}' width='${viewwidth}' height='${viewheight}' xmlns='http://www.w3.org/2000/svg' ${extraattribute}>`;
}

export function SVGUrlFooter(url = true)
{
 if (url) return `%3C/svg%3E")`;
 return `</svg>`;
}

export function SVGRect(x, y, w, h, strength, dash, color, fill = 'none', rx = '4', url = true, dashoffset, animation)
{
 const disp = Math.round(strength/2);
 x += disp;
 y += disp;
 h -= disp * 2;
 w -= disp * 2;
 if (url) return `%3Crect pathLength='99' stroke-width='${strength}' fill='${fill}' stroke='${color}' x='${x}' y='${y}' width='${w}' height='${h}' rx='${rx}' stroke-dasharray='${dash} 100' stroke-linejoin='round' /%3E`;
 return `<rect pathLength='100' stroke-width='${strength}' fill='${fill}' stroke='${color}' x='${x}' y='${y}' width='${w}' height='${h}' rx='${rx}' stroke-dasharray='${dash} ${100 - dash}' stroke-linejoin='round'${dashoffset ? " stroke-dashoffset='" + dashoffset + "'" : ''}>${animation ? ' ' + animation : ''}</rect>`;
}

export function SVGPath(path, color, width, url = true)
{
 if (url) return `%3Cpath d='${path}' stroke='${color}' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round' /%3E`;
 return `<path d='${path}' stroke='${color}' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round' />`;
}

export function SVGCircle(x, y, r, strength, color, fill = 'none', dash, url = true)
{
 if (url) return `%3Ccircle cx='${x}' cy='${y}' r='${r}' fill='${fill}' stroke-width='${strength}' stroke='${color}' ${dash ? "stroke-dasharray='" + dash + "'" : ''} /%3E`;
 return `<circle cx='${x}' cy='${y}' r='${r}' fill='${fill}' stroke-width='${strength}' stroke='${color}' ${dash ? "stroke-dasharray='" + dash + "'" : ''} />`;
}

export function SVGText(x, y, text, color = 'grey', font = '.8em Lato, Helvetica;', url = true)
{ 
 if (url) return `%3Ctext x='${x}' y='${y}' style='fill: ${color}; font: ${font}' %3E${text}%3C/text%3E`;
 return `<text x="${x}" y="${y}" style="font: ${font}">${text}</text>`;
}
                                    
const branchclasses = {
                       '.view': SVGUrlHeader(24, 24) + SVGRect(2, 2, 18, 18, 3, 105, 'RGB(15,105,153)', 'none', '4') + SVGUrlFooter() + ';', 
                       '.folderwrapped': SVGUrlHeader(24, 24) + SVGRect(6, 6, 15, 15, 3, '0 15 65', 'RGB(76,95,72)', 'none', '1') + SVGRect(3, 3, 14, 14, 3, 105, 'RGB(97,120,82)', 'RGB(97,120,82)', '1') + SVGUrlFooter() + ';',
                       '.folderunwrapped': SVGUrlHeader(24, 24) + SVGRect(6, 6, 15, 15, 3, '0 15 65', 'RGB(76,95,72)', 'none', '1') + SVGRect(2, 2, 15, 15, 3, 105, 'RGB(97,120,82)', 'none', '1') + SVGUrlFooter() + ';',
                       '.databaseunwrapped': `${SVGUrlHeader(24, 24)}${SVGPath('M6 12L18 12', 'rgb(97,120,82)', '4')}${SVGUrlFooter()};`,
                       '.databasewrapped': SVGUrlHeader(24, 24) + SVGPath('M6 12L18 12M12 6L12 18', 'rgb(97,120,82)', 4) + SVGUrlFooter() + ';',
                       '.databasewrappedempty': SVGUrlHeader(24, 24) +  SVGPath('M6 12L18 12M12 6L12 18', 'rgb(125,77,94)', 4) + SVGUrlFooter() + ';',
                      };

for (const classname in branchclasses)
    {
     CUSTOMIZATIONS["Sidebar"][classname] = {};
     CUSTOMIZATIONS["Sidebar"][classname]['background-image'] = branchclasses[classname];
     CUSTOMIZATIONS["Sidebar"][classname]['background-repeat'] = 'no-repeat !important;';
     CUSTOMIZATIONS["Sidebar"][classname]['background-position'] = 'center;';
     CUSTOMIZATIONS["Sidebar"][classname]['background-color'] = 'transparent;';
     CUSTOMIZATIONS["Sidebar"][classname]['padding'] = '0px 10px;';
    }
    
export function CutString(string, limit = 12, termination = '..')
{
 if (typeof string !== 'string' || typeof termination !== 'string') return '';
 if (termination.length > limit) termination = termination.substring(0, limit);
 return string.length > limit ? string.substring(0, limit - termination.length) + termination : string;
}

 // Function searches 'string' in 'source' and return the source with excluded string or added string otherwise
export function ToggleString(source, string)
{
 if (typeof source !== 'string' || typeof string !== 'string') return '';
 return source.indexOf(string) === -1 ? source + string : source.replaceAll(string, '');
}

export function SearchPropValue(object, value)
{
 if (typeof object === 'object')
    for (const i in object) if (object[i] === value) return i;
}

export function GenerateRandomString(length)
{
 let randomstring = '';
 for (let i = 0; i < length; i++) randomstring += RANDOMSTRINGCHARS[Math.floor(Math.random() * RANDOMSTRINGCHARS.length)];
 return randomstring;
}

export function GetOptionInSelectElement(e, option)
{
 if (!e?.data || e.type !== 'select' || typeof e.data !== 'object') return;
 for (const name in e.data) if (CompareOptionInSelectElement(option, name)) return e.data[name];
}

export function CompareOptionInSelectElement(string, option)
{
 [string] = string.split('~', 1);
 [option] = option.split('~', 1);
 return string === option;
}

// Function deeply compares two objects woth all their props recurcively
export function ObjectCompare(obj1, obj2)
{
 if (!obj1 || !obj2 || typeof obj1 !== 'object' || typeof obj2 !== 'object') return;
 if (Object.keys(obj1).length !== Object.keys(obj2).length) return;
 for (const prop in obj1)
  if (obj1[prop] && obj2[prop] && typeof obj1[prop] === 'object' && typeof obj2[prop] === 'object') // Compare objects recurcively
     {
      if (!ObjectCompare(obj1[prop], obj2[prop])) return;
     }
   else
     {
      if (obj1[prop] !== obj2[prop]) return;
     }
 return true;
}

// Dialog data has next structure: root-profile -> element1, element2 -> profile1 -> element1 -> profile1, profile2 ->.., so path represents a slash divided string to point needed element or profile:
// element2/profile1/element1/profile2.. with <dialog> as a root-profile
// Function search specified element or profile for specified splited path depending on <value> type
export function GetDialogElement(dialog, path, value)
{
 if (!dialog || typeof dialog !== 'object') return;
 path = path ? path.split('/') : [];
 for (let i in path) // Go through all elements of splited path 
     {
      dialog = +i%2 ? GetOptionInSelectElement(dialog, path[i]) : dialog[path[i]]; // Go to next element or profile (element group)
      if (!dialog) return;
     }

 switch (typeof value) // Undefined <value> just return a found element (current <dialog> var) for a specified <path>, string type <value> set found element data to <value>, other <value> types - data prop of a found element is returned (for selectable elements with at least one checked option first checked option name is returned instead of whole data prop)
        {
          case 'string': // String type <value> - set element data
               dialog.data = value;
               return;
          case 'boolean': // Boolean type <value> - for non selectable elements and profile selections: return element data of itself. For selectable elements: checked option name (value === true) or object with option names as a key and checked status as their values (value === false)
               if (!('data' in dialog)) return '';
               if (!['select', 'multiple', 'checkbox', 'radio'].includes(dialog.type) || typeof dialog.data !== 'string') return dialog.data;
               const options = {};
               for (const option of dialog.data.split('/'))
                   {
                    const [name, flag] = option.split(FIELDSDIVIDER, 2);
                    if (value && (flag || '').includes('!')) return name;
                    if (!value) options[option] = (flag || '').includes('!');
                  }
               return value ? '' : options; // Return empty string for no any option checked (value === true) or <options> (value === false)
          default: // Other cases - return whole element
               return dialog;
        }
}

// Function goes through dialog <profile> elements calling <callback> function for each one. Root <profile> and true <recursive> args iterate all dialog elements
export function DialogProfileElementsAdjust(profile, recursive, callback, ...args)
{
 for (const ename in profile)
	   {
	    const e = profile[ename];
	    const result = callback(profile, ename, ...args);
	    if (result !== undefined) return result;
	    if (recursive && e?.type === 'select' && e.data && typeof e.data === 'object')
		   for (const profilename in e.data)
			     {
			      const result = DialogProfileElementsAdjust(e.data[profilename], true, callback, ...args);
			      if (result !== undefined) return result;
			     }
	   }
}

// Function goes through all dialog input elements and retrieves their values as macros
export function GetDialogMacrosValues(dialog)
{
 const replacements = {};
 DialogProfileElementsAdjust(dialog, true, (profile, ename) => { if (['text', 'password', 'textarea', 'select', 'radio', 'checkbox'].includes(profile[ename].type) && typeof profile[ename].data === 'string') replacements[ename] = GetDialogElement(profile[ename], '', true); });
 return replacements;
}

// Function sorts/unions ranges in a range string, example: '6-,4-5,1' => '1,4-' or '6-,4-5, 10-9, 1-' => '1-';
export function AdjustRangeString(string, max = '')
{
 ranges = new Set();
 if (typeof string !== 'string') string = '';
 for (let range of string.trim().split(',')) if (range = range.trim())
     {
      range = range.split('-');
      if (range.length > 2) continue; // Multiple '-' is incorrect
      let [start, end] = range;
      if (!DIGITS.test(start = start || '0') || !DIGITS.test(end = end === undefined ? start : end ? end : max)) continue; // Non digit chars is incorrect
      if (!end || +start <= +end) ranges.add(`${start}-${end}`); // Var <start> is not bigger than <end>? Add current range
     }

 ranges = [...ranges].map(range => range.split('-')).sort((a, b) => (+a[0]) - (+b[0])); // Split every range string and sort array on range start number
 for (let i = 0; i < ranges.length - 1; i++)
     {
      const [start, end] = ranges[i];
      const [nextstart, nextend] = ranges[i + 1];
      if (end && +end < +nextstart - 1) continue; // No intersection
      ranges[i][1] = !end || !nextend ? '' : Math.max(+end, +nextend) + ''; // Current element intersects next one, so union both elements to current
      ranges.splice(i + 1, 1); // and remove next
      i--; // Move current index to previous position to start work with current element at next iteration
     }

 return ranges.map(range => range.join('-')).join(',');
}


/*********************************************************************************************************/
/*************************************Object Database dialog template start*******************************/
/*********************************************************************************************************/
const MAINPAD = { settings: { type: 'select', head: 'Select object database settings', data: {
                      General: {
                                dbname: { type: 'text', data: '', flag: '+Enter new database name', head: `Database name~Enter database name full path in next format: folder1/../folderN/dbname. Folders are optional and created automatically in a sidebar db hierarchy. Leading slash is not necessary, last slash divided name is always treated as an object database name, others before - as a folders. Empty folders are ignored` }, 
                                description: { type: 'textarea', data: '', head: 'Database description', flag: '*' }, },
                      Permissions: {
                                od: { type: 'textarea', data: '', head: `Restrict this 'Object Database' configuraion read access for next user/group list~User/group list is a list of users (or groups) one by line (empty lines are ignored). Specified restriction (so all below) is applied for the user that matches the list. No match - no restriction applied. Prefix '!' inverts the value, so string '!support' matches all user names, except 'support'. For the list to match all users use '!' single char. Empty list matches no user. Note that user 'root' is a super user with no any restrictions applied regardless of any lists, so good practice is to use that super user account for recovery purposes only` },
                                Database: { type: 'textarea', data: '', head: `Restrict this dialog 'Database' section modify for next user/group list` },
                                Element: { type: 'textarea', data: '', head: `Restrict this dialog 'Element' section modify for next user/group list` },
                                View: { type: 'textarea', data: '', head: `Restrict this dialog 'View' section modify for next user/group list` },
                                Rule: { type: 'textarea', data: '', head: `Restrict this dialog 'Rule' section modify for next user/group list`}, },
                      Macros: {
                                 macros: { type: 'select', flag: '+Enter new macro name', head: `Macro list~Database macro list is an optional list of some text data associated with the specified macro names that can be replaced in some database or user properties text configuration settings via js style quoted expression \${<macro name>}. Macros may be nested, so one macro may contain another. Macro loops, when one macro contains another that contains first one, are ignored, so loop case calculation value is set to empty string - when one macro contains another that contains first, this another macro receives an empty string as a first macro value`, data: { 'New macro~+-': {
                                 value: { type: 'textarea', head: 'Macro value~Text to submit macro name', data: '' },
                                 description: { type: 'textarea', head: 'Macro description~Enter some text here to describe macro uasge', flag: '*', data: '' }, }, } }
    
                    },},},};
const ELEMENTPAD = {
                    elements: { type: 'select', head: 'Element profile~Set this template element properties and clone it to create new element in object database', data: { 'New element template~+': {
                    name: { type: 'textarea', head: 'Name~Element name, used as a default element title in object view display', data: '', flag: '+Enter element name' },
                    description: { type: 'textarea', head: 'Description~Element description is displayed as a hint on object view element header navigation for default. Describe here element usage and its possible values', data: '', flag: '*+Enter element description' },
                    type: { type: 'text', head: 'Element column type~', data: 'JSON' },
                    index: { type: 'radio', head: `Element column index~Unique element type defines specified element property 'value' as uniq among all object elements in database, so duplicated values are excluded and cause an error. This behaviour cannot be changed after element creation`, data: 'None~!/btree/UNIQUE btree/hash', flag: '*' },
                    event: { type: 'textarea', head: `Event group profile list~Specify event profiles one by line to process client side user events. Each client side incoming event is checked on every event profile one by one until the match. When a match is found the appropriaate handler scheme is applied to process event. See system settings help section`, data: '', flag: '*' },
                   },},},};
const VIEWPAD = {
                 views: { type: 'select', head: 'View profile~Set view properties and clone this template to create new view', data: { 'New view template~+': {
                 settings:  { type: 'select', head: 'Select view setting', flag: '*', data: {
                 General: {
                           name: { type: 'textarea', data: '', flag: '+Enter view name', head: `Name~Enter here view name list (one by line). All names will be sidebar displayed according their paths. Usually second and other ones are used as alias names to be placed in favorites. No view names specified - the view is sidebar hidden, but still can be called to open from event handlers or shortcut keys` },
                           description: { type: 'textarea', head: `Description~Describe here view purpose and its usage`, data: '' },
                           shortcut: { type: 'select', head: `Shortcut key~Select key combination to open the view in a new window. For sidebar focus only`, data: 'None/ALT+SHIFT+KeyA/ALT+SHIFT+KeyB/ALT+SHIFT+KeyC/ALT+SHIFT+KeyD/ALT+SHIFT+KeyE/ALT+SHIFT+KeyF/ALT+SHIFT+KeyG/ALT+SHIFT+KeyH/ALT+SHIFT+KeyI/ALT+SHIFT+KeyJ/ALT+SHIFT+KeyK/ALT+SHIFT+KeyL/ALT+SHIFT+KeyM/ALT+SHIFT+KeyN/ALT+SHIFT+KeyO/ALT+SHIFT+KeyP/ALT+SHIFT+KeyQ/ALT+SHIFT+KeyR/ALT+SHIFT+KeyS/ALT+SHIFT+KeyT/ALT+SHIFT+KeyU/ALT+SHIFT+KeyV/ALT+SHIFT+KeyW/ALT+SHIFT+KeyX/ALT+SHIFT+KeyY/ALT+SHIFT+KeyZ' }, },
                 Selection: {
                           template: { type: 'radio', head: `Template~Select object view template for the form the OV data is displayed. 'Table' template displays objects with its elements in a form of a table. Template 'Tree' displays the tree of objects acting as a nodes connected with each other via 'link' element property (for JSON type elements only). And 'Map' template places objects on geographic map based on their elements with 'geo' property (for JSON type elements only)`, data: 'Table~!/Tree/Map', flag: '*' },
                           layout: { type: 'textarea', head: `Layout~As template defines the form objects are displayed, layout defines what elements should be displayed and how for the selected template above. Element layout is a JSON list and should contain at least one valid JSON to display any data at all, see appropriate help section for details`, data: '' },
                           query: { type: 'textarea', head: 'Query~Columns/expressions to select from OD (see FROM statement below). Built automatically from element layout. See appropriate help section for details', data: '', flag: '+SELECT id,eid1,edi2 FROM <data_N> WHERE lastversion = 1' },
                           linkname: { type: 'text', head: 'Link~Object selection link name', data: '' }, }, 
                 Macros: {
                           call: { type: 'checkbox', data: 'Call dialog', head: `Macro definition dialog~This OV macros for 'Selection' layout/query and OD 'Rule' message/query fields may be (re)defined by the user manually via dialog that is called at client side before OV open. Checked 'Call dialog' option calls client side dialog, unchecked - doesn't, but all macro values in dialog structure below are applied anyway. Trimmed text area below is empty - dialog structure for all mentioned macros in 'View selection' and 'OD Rule' are created automatically. Dialog structure interface element property name is a macro name, input field content - macro value (for 'textarea', 'text', 'password', 'select', 'radio' and 'checkbox' interface element types only). Dialog structure defined macros are applied regardless of 'Call dialog' option. Dialog structure should contain input fields only, dialog title with 'OK'/'CANCEL' buttons are added automatically. Client side dialog call may be used not for macro definitions, but for info/warning message display before OV open. Macro 'SOMEMACROS' definition dialog example: { "SOMEMACROS": { "type": "text", "head": "Input macro SOMEMACROS value", "data": "" } }` },
                           dialog: { type: 'textarea', head: '', data: '', flag: '*' }, }, 
                 Appearance: {
                           init: { type: 'radio', head: 'Window init~OV opens in a current window, new window or in a browser new tab (read-only mode)', data: 'Current window~!/New window/Browser new tab' },
                           position: { type: 'radio', data: 'Sidebar fit/Cascade~!/Random', head: 'Initial window position~Select view window position at the opening' },
                           size: { type: 'radio', head: 'Initial window size', data: 'Auto~!/Full screen/Fixed', flag: '' },
                           width: { type: 'text', head: 'Comma separated width and height in pixels', data: '', expr: '/Auto~!|Full screen~!/c', flag: '*' },
                           control: { type: 'checkbox', head: 'Control', data: 'Resize~!/Full screen~!/Escape/Close icon\n~!/Always on top/Modal', flag: '*' },
                           bringtotop: { type: 'checkbox', head: 'Bring to top on event', data: 'New data/Data delete/Data change' },
                           autoopen: { type: 'checkbox', head: `Auto open in a new window on event`, data: 'New data/Data delete/Data change' },
                           refresh: { type: 'checkbox', head: `OV full refresh on event`, data: 'New data/Data delete/Timer' },
                           timer: { type: 'text', data: '', flag: '*', expr: '/^((?!Timer~!).)*$/h', flag: '*' },
                           lifetime: { type: 'text', head: 'Lifetime~OV window lifetime (in seconds) after which the window will be closed automatically. Zero/empty/error value - no action', data: '', flag: '' }, }, 
                 Permissions: {
                           read: { type: 'textarea', head: `Restrict read access for next users/groups`, data: '' },
                           write: { type: 'textarea', head: `Restrict write access for next users/groups`, data: '', flag: '*' },
                }, } } }, }, }, };
const RULEPAD = {
                 rules: { type: 'select', head: 'Rule profile~Set rule properties and clone this template to create new rule. Rules are tested in alphabetical order one by one until the rule query is successful, the rule action is applied then', data: { 'New rule template~+': {
                           message: { type: 'textarea', head: `Rule message~Non empty rule message is displayed as a warning at client side dialog box and logged if appropriate option below is set`, data: '', flag: '*' }, 
                           action: { type: 'radio', data: 'Accept/Reject~!/Pass', head: `Rule action~'Accept' action permits incoming event passing it to the controller, 'Reject' action cancels it, 'Pass' action does nothing with no search terminating and continuing from the next rule - useful for event logging and rule disabling without removing` }, 
                           query: { type: 'textarea', data: '', head: `Rule query~Every controller incoming event (such as user mouse/keyboard, system SCHEDULE/CHANGE or others) is passed through the controller to be tested on all rules in alphabetical order one by one until the rule query is successful. Rule query is a list of one by line truncated SQL query strings with no SELECT statement that is added automatically to the begining of the string. Empty or char '#' commented lines are ignored. Emtpy query - test is successful. Error queries are ignored. Non-empty and non-zero result of all query strings - test is successful; any empty, error or zero char '0' result - unsuccessful. The action corresponding to 'successful' rule is performed, no any successful rules - default action 'Accept' is made. Query may contain some macros (${'${'}OID}, ${'${'}EID}, ${'${'}OD}, ${'${'}OV}, ${'${'}EVENT}, ${'${'}MODIFIER}, etc..) to apply for specified events/objects/elements/views only. Be aware of using queries with no events specified, it may cause some overload due to every incoming event query test made` }, 
                           log: { type: 'checkbox', data: 'Log/Warning', flag: '*' },
                }, }, } };
export const NEWOBJECTDATABASE = {
                           padbar: { type: 'select', data: { Main: MAINPAD, Element: ELEMENTPAD, View: VIEWPAD, Rule: RULEPAD }  },
                           title: { type: 'title', data: 'New Database Configuration' },
                           ok: { type: 'button', data: 'CREATE DATABASE', flag: 'a', expr: '/^$/dbname' },
                           cancel: { style: 'background: rgb(227,125,87);', type: 'button', data: 'CANCEL' },
                          };
/*********************************************************************************************************/
/*************************************Object Database dialog template end*********************************/
/*********************************************************************************************************/

/*********************************************************************************************************/
/*****************************************User Database dialog start**************************************/
/*********************************************************************************************************/
export const USEROBJECTDATABASE = JSON.parse(JSON.stringify(NEWOBJECTDATABASE));
GetDialogElement(USEROBJECTDATABASE, 'padbar/Main/settings/General/dbname').data = 'Users';
const elementprofileTemplate = JSON.stringify(GetDialogElement(USEROBJECTDATABASE, 'padbar/Element/elements/New element template'));
const viewprofileTemplate = JSON.stringify(GetDialogElement(USEROBJECTDATABASE, 'padbar/View/views/New view template'));
const elements = GetDialogElement(USEROBJECTDATABASE, 'padbar/Element/elements', true);
const views = GetDialogElement(USEROBJECTDATABASE, 'padbar/View/views', true);
const USERODLAYOUT = `{"row":"1", "col":"id,ownerid,owner,datetime,${ELEMENTCOLUMNPREFIX}1,${ELEMENTCOLUMNPREFIX}2,${ELEMENTCOLUMNPREFIX}6", "x":"c", "y":"r+2"}
{"row":"r>=0", "col":"${ELEMENTCOLUMNPREFIX}2", "value":"Change password"}
{"row":"r>=0", "col":"${ELEMENTCOLUMNPREFIX}6", "value":"Configure event groups"}
`;
const enewprofiles = { 'username~*': { name: 'Username', description: 'Username', type: `VARCHAR(${USERNAMEMAXCHAR})`, index: 'None/btree/UNIQUE btree~!/hash' },
                    'password~*': { name: 'Password', description: 'Password', type: 'TEXT', index: 'None~!/btree/UNIQUE btree/hash' },
                    'custom~*': { name: 'Custom field', description: 'Custom field', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' },
                    'policy~*': { name: 'Policy', description: 'Policy', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' },
                    'customization~*': { name: 'Customization', description: 'Customization', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' },
                    'event groups~*': { name: 'Event groups', description: 'Event groups', type: 'JSON', index: 'None~!/btree/UNIQUE btree/hash' } };
const vnewprofiles = { 'All~*': { settings: { data: { General: { name: 'All users', description: 'All users list' }, 
                                                      Selection: { layout: USERODLAYOUT, query: `SELECT id,ownerid,owner,datetime,${ELEMENTCOLUMNPREFIX}1,${ELEMENTCOLUMNPREFIX}2,${ELEMENTCOLUMNPREFIX}6,lastversion\nFROM data_1` } } } } };
for (const profilename in enewprofiles)
    {
     elements[profilename] = JSON.parse(elementprofileTemplate);
     for (const e in enewprofiles[profilename]) elements[profilename][e].data = enewprofiles[profilename][e];
    }                                                     
for (const profilename in vnewprofiles)
    {
     views[profilename] = JSON.parse(viewprofileTemplate);
     for (const p in vnewprofiles[profilename].settings.data) 
     for (const e in vnewprofiles[profilename].settings.data[p]) 
         views[profilename].settings.data[p][e].data = vnewprofiles[profilename].settings.data[p][e];
    }                                                     
/*********************************************************************************************************/
/******************************************User Database dialog end***************************************/
/*********************************************************************************************************/

/*********************************************************************************************************/
/***************************************Super user event dialog start*************************************/
/*********************************************************************************************************/
const newevent = JSON.stringify({ events: { type: 'select', head: 'Select event type', data: CLIENTEVENTS.join(OPTIONSDIVIDER) },
                           modifier: { type: 'checkbox', head: 'Select event modifier keys~For mouse and keyboard (except KEYPRESS) events only. Note that some events (Ctrl+KeyA, Ctrl+KeyC, KeyF1 and others) are reserved by client app (browser) for its default behaviour, so may never occur', data: 'Ctrl/Alt/Shift/Meta', expr: `/${[...CALLBACKEVENTS, ...MISCEVENTS, 'KEYPRESS'].join('~\!|')}~!/events` },
                           attr: { type: 'text', head: 'Event attribute~For ONEVENT and ONTIMER events only', data: '', flag: '*', expr: '/^(?!.*(ONEVENT~\!|ONTIMER~\!)).*$/events' },
                           handlertype: { type: 'select', head: 'Handler type', data: 'Disabled~!/Fixed output/Command line/Shell command line/Module function' },
                           handlerdata: { type: 'textarea', head: 'Handler data', data: '', expr: '/Disabled~!/handlertype' },
                           timeout: { type: 'text', head: `Handler timeout~Timeout, in seconds, for the controller to wait the handler to response. For incorrect/undefined string a default value of 30 sec is used. The setting is applied for 'Command line' and 'Eval' handler types only`, data: '30', expr: '/^(?!.*Shell command line~\!)(?!.*Command line~\!)/handlertype' },
                           retry: { type: 'text', head: `Retries~Handler restart attempts on timeout. For incorrect/undefined string a zero value (0 retries) is used: the handler is not restarted after timeout. The setting is applied for 'Command line' or 'Eval' handler types only`, data: '0', flag: '', expr: '/^(?!.*Shell command line~\!)(?!.*Command line~\!)/handlertype' },
                           output: { type: 'checkbox', head: 'Handler result action', data: `Wrap/Debug/Ignore`, expr: '/Disabled~!/handlertype' }, // specfied action for handler any stdout or stderr is applied. Checked 'Ignore' option ignores handler output doing nothing regardless of other option checked. Checked 'Debug' displays clientside info msg with handler output data. No Ignore/Debug options set - handler output data of itself or converted to SET cmd output data for 'Wrap' checked - is applied
                         });
const neweventgroup = { evsel: { type: 'select', head: 'Select event profile for event group above', data: { 'New event~+': JSON.parse(newevent) }, flag: '*' } };
//////////////////////////////    
const CALLDIALOG = JSON.parse(newevent);
delete CALLDIALOG.events;
delete CALLDIALOG.modifier;
delete CALLDIALOG.attr;
CALLDIALOG.handlertype.data = 'Disabled/Fixed output~!/Command line/Shell command line/Module function';
CALLDIALOG.handlerdata.data = '{"type": "DIALOG", "data": { "content": "${}" } }';
const SETDATA = JSON.parse(newevent);
delete SETDATA.events;
delete SETDATA.modifier;
delete SETDATA.attr;
SETDATA.handlertype.data = 'Disabled/Fixed output/Command line/Shell command line/Module function~!';
SETDATA.handlerdata.data = 'modules.SetData\n${EVENTDATA}\n${EPROP}';
const EDIT = JSON.parse(newevent);
delete EDIT.events;
delete EDIT.modifier;
delete EDIT.attr;
EDIT.handlertype.data = 'Disabled/Fixed output~!/Command line/Shell command line/Module function';
EDIT.handlerdata.data = '{"type": "EDIT"}';
const SETNODATA = JSON.parse(newevent);
delete SETNODATA.events;
delete SETNODATA.modifier;
delete SETNODATA.attr;
SETNODATA.handlertype.data = 'Disabled/Fixed output/Command line/Shell command line/Module function~!';
SETNODATA.handlerdata.data = 'modules.SetData\n\n${EPROP}';
//////////////////////////////    
const system = { evsel: { type: 'select', head: 'Select event profile', data: { 'New event~+': JSON.parse(newevent), 'DOUBLECLICK~+': CALLDIALOG, 'CONFIRMEDIT~+': SETDATA, 'CONFIRMDIALOG~+': SETDATA }, flag: '*' } };
const general = { evsel: { type: 'select', head: 'Select event profile', data: { 'New event~+': JSON.parse(newevent), 'KEYF2~+': EDIT, 'DOUBLECLICK~+': EDIT, 'KEYDelete~+': SETNODATA, 'CONFIRMEDIT~+': SETDATA, 'CONFIRMDIALOG~+': SETDATA }, flag: '*' } };
export const EVENTGROUPDIALOG = {
                           title: { type: 'title', data: 'Event profiling' },
                           eventgroups: { type: 'select', head: 'Select event group profile', data: { 'New event group~+': neweventgroup, 'SYSTEM~+': system, 'GENERAL~+': general } },
                           ok: JSON.parse(BUTTONOK),
                           cancel: JSON.parse(BUTTONCANCEL),
                         };
/*********************************************************************************************************/
/****************************************Super user event dialog end**************************************/
/*********************************************************************************************************/

// Function parses dialog structure for OD params and return them to suck in to the memort for the quick access. Vars maxeid/maxovid need to add new elements/views with ids not overlapped with elements/view ids of previous OD version 
export function SuckInDatabaseProps(dialog, odid, neweid = 1, newovid = 1)
{
 let profile;
 const props = { dialog: dialog, od: {}, elements: {}, views: {}, rules: {} };

 try {
      // Adjust dialog buttons
      let btn = GetDialogElement(dialog, 'ok');
      btn.data = 'SAVE'; // Rename btn from 'CREATE' to 'SAVE' btn after db conf dialog is created
      delete btn.expr; // No grey btn 'CREATE' for empty db name that is used to remove OD
      btn = GetDialogElement(dialog, 'cancel');
      btn.flag = '++++++++++'; // Create cancel btn 10 minute timer

      // Suck in Main pad
      props.od.name = [...new Set(GetDialogElement(dialog, 'padbar/Main/settings/General/dbname', true).split('/').map(name => name.trim()).filter(name => name))].join('/');
      props.od.description = GetDialogElement(dialog, 'padbar/Main/settings/General/description', true);
      props.od.odreplacements = {};
      props.od.undefinedodreplacements = {};
      for (const permission of ['od', 'Database', 'Element', 'View', 'Rule']) // Get OD main permission text areas
          props.od[permission] = GetDialogElement(dialog, `padbar/Main/settings/Permissions/${permission}`, true);
      profile = GetDialogElement(dialog, 'padbar/Main/settings/Macros/macros', true); // Get OD macroses to <props.od.odreplacements> and process its values - in case of some other macroses in these values, store them in <props.od.undefinedodreplacements>
      const macroobject = {};
      for (const macroname in profile) // get od macros
          {
           if (CompareOptionInSelectElement('New macro', macroname)) continue;
           const macrovalue = GetDialogElement(profile, `${macroname}/value`, true);
           props.od.odreplacements[macroname.split('~', 1)] = macrovalue;
           macro.SearchMacrosNames(macroobject, macrovalue);
          }
      for (const name in macroobject) if (!props.od.odreplacements[name]) props.od.undefinedodreplacements[name] = '';

      // Adjust dialog title
      GetDialogElement(dialog, 'title').data = `Database '${CutString(props.od.name.split('/').pop())}' (id${odid}) configuration`; // Change OD dialog title    

      // Suck in Element pad
      profile = GetDialogElement(dialog, 'padbar/Element/elements', true);
      for (let option in profile) // Go through all elements profile
          {
           let id = AdjustProfileOption(profile, option, neweid); // Rename element adding id, add +- flags. For cloned profiles only
           if (id !== undefined) option = id;
           if (id !== undefined && neweid) neweid++; // Increase next free element id to use
           if (!(id = GetOptionNameId(option))) continue; // Only template profile has no id
           const element = props.elements[id] = {};
           for (const prop of ['name', 'description', 'type', 'index', 'event']) // Get element profile all props and trim/toLowerCase them if needed
               element[prop] = GetDialogElement(profile[option], prop, true);
           element.type = element.type.trim().toLowerCase();
           GetDialogElement(profile[option], 'type').expr = '/^/';                           // Make element type (column type in DB) readonly
          }

      // Suck in Rule pad
      const rulereplacements = {};
      profile = GetDialogElement(dialog, 'padbar/Rule/rules', true);
      for (let option in profile)
          if (!CompareOptionInSelectElement('New rule', option)) AdjustProfileOption(profile, option);
      props.rules = Object.keys(profile).sort((a, b) => a.localeCompare(b));	// Get all rule profile names to the array in alphabetical order
      for (let i = 0; i < props.rules.length; i++) // Then go through all of them
          {
           const option = props.rules[i];
           if (!CompareOptionInSelectElement('New rule', option) && props.rules.splice(i--, 1)) continue; // excluding template
           const rule = props.rules[i] = { key: option.split(FIELDSDIVIDER, 1)[0] }; // Store rule object with rule profile name as a key prop
           for (const prop of ['message', 'action', 'query']) props.rules[i][prop] = GetDialogElement(profile, `${option}/${prop}`, true).trim(); // Store some props
           props.rules[i].log = GetDialogElement(profile, `${option}/log`, false);
           // Exclude comments in query
           rule.query = rule.query.split('\n');
           for (let j = 0; j < rule.query.length; j++) if (rule.query[j].trim()[0] === '#') rule.query.splice(j--, 1);
           rule.query = rule.query.join('\n');
           // Rule replacements
           macro.SearchMacrosNames(rulereplacements, rule.query, props.rules[i].message);
          }

      // Suck in View pad
      profile = GetDialogElement(dialog, 'padbar/View/views', true);
      for (let option in profile)
          {
           let id = AdjustProfileOption(profile, option, newovid);
           if (id !== undefined) option = id;
           if (id !== undefined && newovid) newovid++; // Increase next free element id to use
           if (!(id = GetOptionNameId(option))) continue; // Only template profile has no id
           const view = props.views[id] = { general: {}, selection: {}, appearance: {}, macros: {}, permissions: {} };
           for (const prop of ['General/name', 'General/description', 'General/shortcut', 'Selection/template', 'Selection/layout', 'Selection/query', 'Selection/linkname', 'Appearance/init', 'Appearance/position', 'Appearance/size', 'Appearance/width', 'Appearance/timer', 'Appearance/lifetime', 'Macros/call', 'Macros/dialog', 'Permissions/read', 'Permissions/write'])
               view[prop.split('/')[0].toLowerCase()][prop.split('/')[1]] = GetDialogElement(profile[option], `settings/${prop}`, true).trim();
           for (const prop of ['Appearance/control', 'Appearance/bringtotop', 'Appearance/autoopen', 'Appearance/refresh'])
               view[prop.split('/')[0].toLowerCase()][prop.split('/')[1]] = GetDialogElement(profile[option], `settings/${prop}`, false);
           view.general.name = [...new Set(view.general.name.split('\n').map(alias => alias.trim()))].join('\n'); // Exclude duplicated aliases

           // Macro dialog field is empty and 'Call dialog' option is checked? Create macro dialog automatically
           if (!view.macros.dialog && view.macros.call)
              {
               view.replacements = Object.assign(macro.SearchMacrosNames({}, view.selection.layout, view.selection.query), rulereplacements); // Create view replacements - it is built from search in all rules message/query fields, plus view selection layout/query. Todo0 - go through all available handler data text areas to search other non JSON/dynamic macros to exclude
               view.macros.dialog = macro.BuildMacrosDialog(view.replacements, props.od.undefinedodreplacements); // Build dialog to define macros in 1st arg excluding 2nd arg
              }
           try { view.macros.dialog = JSON.parse(view.macros.dialog); } // Parse macro dialog to object
           catch { view.macros.dialog = JSON.parse(WARNINGDIALOG); view.macros.dialog.msg.head = 'Wrong macro dialog syntax!'; } // In case of wrong dialog syntax warning dialog is created with <view.replacements> untouched
           view.replacements = GetDialogMacrosValues(view.macros.dialog); // Retrieve all macro values from select/text interface elements
          }

      // Return props
      return props;
     }
 catch(error)
     {
      console.error(`Sucking in OD id ${odid} error: ${error.stack}`);
     }
}

// Function takes cloned options, removes 'cloned' flag, adds '+-' flags and creates new option with changed name (for true <addid>) and flag
export function AdjustProfileOption(profile, option, addid)
{
 let [name, flag, ...style] = option.split(FIELDSDIVIDER);          // Split option to its name and flag via FIELDSDIVIDER char '~'
 if (addid) name += ` (id${addid})`;                                // Add ' (id<num>)' to option name
 flag = flag || '';
 if (addid && !flag.includes(OPTIONISCLONED)) return;              // Var <addid> is added for cloned profiles only, so do not process non-cloned if <addid>
 flag = flag.replaceAll(OPTIONISCLONED, '');
 if (!flag.includes(OPTIONISCLONABLE)) flag += OPTIONISCLONABLE;
 if (!flag.includes(OPTIONISREMOVABLE)) flag += OPTIONISREMOVABLE;
 style = style.length ? style.join(FIELDSDIVIDER) : '';             // Join back style string

 const newoption = `${name}${flag || style ? FIELDSDIVIDER + flag : ''}${style ? FIELDSDIVIDER + style : ''}`;  // Build new option name
 profile[newoption] = profile[option];                                                  // and include it to profile instead of old <option>
 delete profile[option];
 return newoption;
}

export function GetOptionNameId(option)
{
 if (typeof option !== 'string') return '';
 [option] = option.split(FIELDSDIVIDER, 1); // Get option name without flags/style
 let id = option.lastIndexOf('id');                 // Serach id string in non-cloned option names
 if (id === -1) return;                             // Return undefined for no 'id' string present
 id = option.slice(id + 2, -1);                     // Clip num after 'id' string and convert it to number
 return isNaN(+id) ? '' : id;                       // and return string containing 
}

// Function sucks in every user permissions and customization, plus super user event group profiles. Todo0 - make this "suck" every time the super user or ordinary user record is changed
export function SuckInUserProps(userrow)
{
 try {
      // Parsing user policy from <userrow.eid4>. Todo0 - no policy for super user? One way is here to allow all for superuser, another way - exclude superuser on restriction check
      const policy = {};
      for (const prop of ['groups', 'instances', 'timeout', 'read', 'write', 'create', 'task'])
          {
           policy[prop] = GetDialogElement(userrow.eid4, prop, true);
           if (typeof policy[prop] !== 'string') throw new Error(`Couldn't suck in user policy '${prop}'!`);
          }
      // Parsing super user event groups <userrow.eid6>
      const egs = {};
      if (userrow.eid1 === SUPERUSER)  for (let eg in GetDialogElement(userrow.eid6, 'eventgroups', true)) if (!CompareOptionInSelectElement('New event group', eg))
         {
          eg = eg.split('~', 1)[0];
          egs[eg] = {};
          for (let e in GetDialogElement(userrow.eid6, `eventgroups/${eg}/evsel`, true)) if (!CompareOptionInSelectElement('New event', e))
              {
               e = e.split('~', 1)[0];
               egs[eg][e] = {};
               for (const prop of ['handlertype', 'handlerdata', 'timeout', 'retry'])
                   if (typeof (egs[eg][e][prop] = GetDialogElement(userrow.eid6, `eventgroups/${eg}/evsel/${e}/${prop}`, true)) !== 'string') throw new Error(`Couldn't suck in user event group '${eg}'!`);
               egs[eg][e].output = GetDialogElement(userrow.eid6, `eventgroups/${eg}/evsel/${e}/output`, false);
              }
         }
      // Returning user props
      return { name: userrow.eid1,
               tags: [...new Set(`${userrow.eid1}\n${policy.group}`.split('\n').map(tag => tag.trim()).filter(tag => tag))],
               policy: policy,
               customization: userrow.eid5,
               eventgroups: egs
             };
     }
 catch (error)
     {
      console.log(`Sucking in user '${userrow.eid1}' error: ${error.message}`);
     }
}

// Todo0 - change service char like delimiter '*', '!' (see dialog.js) to const var in globals to be used in frontend and backend
// Todo0 - remake all sucking functions and put them in suckin.js
// Todo0 - calc globals var/functions that intersects with front and back - this case may cause a backend disfunction via front
// Todo0 - all service data like odid/ovid/oid/eid should be in msg, not in msg.data
// Todo0 - Check  ${EID} in system macros - should be id! Not element name! So GetObjectElementData in macro.js should be changed in order to consider element id (JSONEXTRACT method)
