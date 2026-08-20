export const SYSTEMELEMENTNAMES     = { id : 'Object identificator', version: 'Object store version', lastversion: 'Flag indicates the object last instance', mask: 'Object modified elements bit mask', ownerid: 'User id the object was created by', owner: 'User name the object was created by', datetime: 'Date and time this object version was created at', date: 'The date this object version was created at', time: 'The time this object version was created at' };
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
export const ELEMENTCOLUMNPREFIX    = 'eid';
export const ELEMENTCOLUMNREGEXP    = new RegExp(`^${ELEMENTCOLUMNPREFIX}\\d+$|^${ELEMENTCOLUMNPREFIX}\\d+_`);
export const DIGITS                 = /^\d*$/;
export const FIELDSDIVIDER          = '~';
export const OPTIONISCHECKED				= '!';
export const OPTIONISCLONED					= '*';
export const OPTIONISCLONABLE			  = '+';
export const OPTIONISREMOVABLE			= '-';
export const WARNINGDIALOG          = JSON.stringify({ title: { type: 'title', data: 'Warning' }, msg: { type: 'table' }, ok: JSON.parse(BUTTONOK) });
export const ALLOWEDINNERTAGSSTRING = 'span, pre, br, b';
export const OPTIONSDIVIDER         = '/';
export const SYSTEMSTATICMACROS     = { USERNAME: 'username', USERID: 'userid', OD: 'od', OV: 'ov', ODID: 'odid', OVID: 'ovid', OID: 'oid', EID: 'eid', EPROP: 'eprop', ELEMENT: null, EVENTNAME: 'type', EVENTDATA: 'data', RANDOM: null, DATE: null, TIME: null, DATETIME: null, NULL: null, DBDATATBLNAME: null, ELEMENTCOLUMNPREFIX: null };
export const SYSTEMDYNAMICMACROS    = { LAYOUT: null };
const ALLOWEDINNERTAGSREGEX         = new RegExp(`${ALLOWEDINNERTAGSSTRING.split(', ').map(tag => `<${tag} .*?>|<${tag} *>|<\/${tag} *>`).join('|')}`);
const INNERENCODEMAP                = [['&', '<', '>', "'", '"'], ['&amp;', '&lt;', '&gt;', '&#39;', '&quot;']];

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
    if (od === line[0] && line[1][0] === '!' && ov === line[1].substring(1) && !(match = false)) break; // For the matched od check check ov - if it is negative and is matched - then the list doesn't match input od/ov, breaking cycle with falsy match
 if (negative_ov && match) return true;

 if (negative_od && (match = true)) for (let line of checklist) // Go through all lines with negative od (ov is ignored in case, cause it doesn't matter) in a checklist
    if (line[0][0] === '!' && od === line[0].substring(1) && !(match = false)) break; // If od 1st char is '!' and od matches - then the list doesn't match input od/ov, breaking cycle with falsy match
 if (negative_od) return match;
}

// Escaping/replacing chars is divided on 3 processes:
// 1. tag attribute escaping chars '<', '>', "'", '"', '&' came from backend
// 2. html inner escaping same chars came from backend excluding ALLLOWEDINNERTAGS (FYI: one of these tags is 'pre' which uses mono-width font)
// 3. at start editing - set element textContent from the cell.value, confirm editing - read textContent to the cell.value with setting htmlinner (see process #2), note that element 'white-space' should be 'pre-wrap' ("white-space: pre;" - shows original text as it is, "white-space: pre-wrap;" - same as 'pre', but automatically wraps/breaks lines if needed)
// Todo0 - text data in element <textarea> and <input> is taken from server-side json, so should it be escaped? Cause at dialog html generation tag data may consist of </tag> which may break the marking. But string escaping modifies textarea data and this modified data will be saved to the server - so check this point! Workaround - all input and textarea tags should be searched via queryselector to modify their textContent property
export function EscapeString(string, excludehtmltags)
{
 let match, newstring = '';
 if (typeof string !== 'string') return '';

 if (excludehtmltags) while (match = ALLOWEDINNERTAGSREGEX.exec(string))
    {
     newstring += EscapeString(string.substring(0, match.index)) + match[0]; // Escape chars till the <match.index> (till the found allowed tag) and concatenate it with the found untouched <tag>
     string = string.substring(match.index + match[0].length); // Cut <string> till found tag position + tag length
    }

 for (let i = 0; i < INNERENCODEMAP[0].length; i++)
     string = string.replace(new RegExp(INNERENCODEMAP[0][i], 'g'), INNERENCODEMAP[1][i]);

 return newstring + string;
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

// Function sorts/unions ranges in a range string, example: '6-,4-5,1' => '1,4-' or '6-,4-5, 10-9, 1-' => '1-';
export function GetColumnIndexesRangeExp(string)
{
 let ranges = new Set();
 if (typeof string !== 'string') string = '';
 for (let range of string.trim().split(',')) if (range = range.trim())
     {
      range = range.split('-');
      if (range.length > 2) continue; // Multiple '-' is incorrect
      let [start, end] = range;
      if (!DIGITS.test(start = start || '0') || !DIGITS.test(end = end === undefined ? start : end)) continue; // Non digit chars is incorrect
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

 return ranges.map(range => {
                             if (!range[1]) return `(c>=${range[0]})`;
                             return range[0] === range[1] ? `(c===${range[0]})` : `(c>=${range[0]} && c<=${range[1]})`;
                            }).join(' || ');
}
