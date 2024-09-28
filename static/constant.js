const HTMLINNERENCODEMAP		= [['&', '<', '>', '\n', ' ', '"'], ['&amp;', '&lt;', '&gt;', '<br>', '&nbsp;', '&quot;']];	// Encoding map array of two arrays with symmetric values to encode/decode each other
const TAGATTRIBUTEENCODEMAP		= [['<', '>', '\n', '"'], ['&lt;', '&gt;', '', '&quot;']];
const ELEMENTINNERALLOWEDTAGS	= ['span', 'pre', 'br'];

const EFFECTS					= ['hotnews', 'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall', 'rise'];
const EFFECTSHINT				= "effect appearance. Possible values:<br>'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall' and 'rise'.<br>All other values makes no effect.";

const CMCLOSE					= 0b1;
const CMFULLSCREEN				= 0b10;
const CLOSEESC					= 0b100;
const NODOWNLINKNONSTICKYCHILDS	= 0b1000;

const REFRESHMININTERVAL		= 50;
const ELEMENTPUSHOFFSET			= 3;
const ACTIVECHILDSHADOW			= '4px 4px 5px #111';

const WIDTHOFAREAFORRESIZING	= 13;
const HEIGHTOFAREAFORRESIZING	= 13;
const CLOSEICONAREAWIDTH		= 12;
const CLOSEICONAREAHEIGHT		= 12;

const nicecolors				= [ 'RGB(243,131,96);', 'RGB(247,166,138);', 'RGB(87,156,210);', 'RGB(50,124,86);', 'RGB(136,74,87);', 'RGB(116,63,73);', 'RGB(174,213,129);', 'RGB(150,197,185);' ];
const style 					= document.createElement('style'); // Style default user GUI and append style DOM element to the document head
let app; // Create application

// initevent: any non undefined value calls <callbackfunction> 
// captureevent: event the capture starts at. Since the capture is started - no other captures allowed, so any other childs mouse/keyboards events are ignored. The capture starts at this event, area match (if exists) and DOM elements array match
// keycode: key code for keyboard <captureevent> and <releaseevent>
// modifier: key flag to match together with mouse/keyboard <captureevent> for next keys: CTRL (0b1), ALT (0b10), SHIFT (0b100) and META (0b1000)
// processevent: event the current capture handles via <callbackfunction> call
// releaseevent: event the capture is released on. Since the capture is released - any other childs mouse/keyboards events become available. Capture is released at this event occur or <outofarearelease> true value (see below)
// area: child element DOM relative rectangle coordinates x1,y1,x2,y2 the mouse cursor in to start the capture
// outofarearelease: true value releases the cature in case of mouse coordinates out of defined area 
// elements: array of DOM elements the capture starts at together with 'area' and 'capturestart'. For empty array child <elementDom> is used. Two-level nested array is allowed (for pushing elements with its childs DOM elements, for a example)
// callbackfunction: for all defined capture stages <callbackfunction> call is perfomed - callbackfunction(event). For native control (fullscreen toggle, close, ecs btn..) predefined functions are used. String type prop generates appropriate event instead of call
// data: current control specific data, used for callback inner behaviour and/or background icon (see below)
// iconon|iconoff: url used as a background image with area coordinates, iconon/iconoff depends on <data> truthy/falsy vlaue and refreshed at capture/relese events automatically
// cursor: document cursor style on <area> hover
// child: child object inited at child insert. Property is defined automatically at child insert.
// parentcontrol: control property name to retreive callback, state and icon props
CHILDCONTROLTEMPLATES           = {
                                   fullscreenicon: { captureevent: 'mousedown', releaseevent: 'mouseup', area: {x1: -12, y1: 0, x2: -1, y2: 11}, iconon: '', iconoff: '', cursor: 'pointer' }, 
                                   fullscreendblclick: { releaseevent: 'dblclick', parentcontrol: 'fullscreenicon' }, 
                                   closeicon: { captureevent: 'mousedown', releaseevent: 'mouseup', area: {x1: -12, y1: 0, x2: -1, y2: 11}, iconoff: '', callback: 'KILLME', cursor: 'pointer' }, 
                                   closeesc: { captureevent: 'keydown', releaseevent: 'keyup', keycode: 13, parentcontrol: 'closeicon' }, 
                                   drag: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', elements: [], cursor: 'grabbing' }, 
                                   resize: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', area: {x1: -13, y1: -13, x2: -1, y2: -1}, cursor: 'nw-resize' }, 
                                   resizex: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', area: {x1: -13, y1: 0, x2: -1, y2: -1}, cursor: 'e-resize', parentcontrol: 'resize' }, 
                                   resizey: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', area: {x1: 0, y1: -13, x2: -1, y2: -1}, cursor: 'n-resize', parentcontrol: 'resize' }, 
                                   push: { captureevent: 'mousedown', releaseevent: 'mouseup', cursor: 'pointer' }, 
                                  }

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
 //new DialogBox(dialogdata, parentchild, {flags: CMCLOSE | CLOSEESC, effect: 'rise', position: 'CENTER', overlay: 'MODAL'}, {class: 'dialogbox selectnone'});
 return [dialogdata, parentchild, {flags: CMCLOSE | CLOSEESC, effect: 'rise', position: 'CENTER', overlay: 'MODAL'}, {class: 'dialogbox selectnone'}];
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
