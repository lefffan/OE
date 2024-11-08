const HTMLINNERENCODEMAP		= [['&', '<', '>', '\n', ' ', '"'], ['&amp;', '&lt;', '&gt;', '<br>', '&nbsp;', '&quot;']];	// Encoding map array of two arrays with symmetric values to encode/decode each other
const TAGATTRIBUTEENCODEMAP		= [['<', '>', '\n', '"'], ['&lt;', '&gt;', '', '&quot;']];
const ELEMENTINNERALLOWEDTAGS	= ['span', 'pre', 'br'];

const EFFECTS					= ['hotnews', 'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall', 'rise'];
const EFFECTSHINT				= "effect appearance. Possible values:<br>'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall' and 'rise'.<br>All other values makes no effect.";

const NODOWNLINKNONSTICKYCHILDS	= 0b1;

const REFRESHMININTERVAL		= 50;
const ELEMENTPUSHOFFSET			= 3;
const ACTIVECHILDSHADOW			= '4px 4px 5px #111';

const nicecolors				= [ 'RGB(243,131,96);', 'RGB(247,166,138);', 'RGB(87,156,210);', 'RGB(50,124,86);', 'RGB(136,74,87);', 'RGB(116,63,73);', 'RGB(174,213,129);', 'RGB(150,197,185);' ];
const style 					= document.createElement('style'); // Style default user GUI and append style DOM element to the document head

const ICONURLFULLSCREENTURNON   = SVGUrlHeader() + SVGRect(1, 1, 10, 10, 2, 105, 'RGB(139,188,122)', 'none', '1') + ' ' + SVGUrlFooter();
const ICONURLFULLSCREENTURNOFF  = SVGUrlHeader() + SVGRect(1, 1, 8, 8, 2, 105, 'RGB(139,188,122)', 'none', '1') + ' ' + SVGRect(3, 3, 9, 9, 1, '0 15 65', 'RGB(139,188,122)', 'none', '1') + ' ' + SVGUrlFooter();
const ICONURLCLOSE              = SVGUrlHeader() + SVGPath('M3 3L9 9M9 3L3 9', 'RGB(227,125,87)', '3') + ' ' + SVGUrlFooter();
const CHILDCONTROLTEMPLATES     = {
                                   fullscreenicon: { captureevent: 'mousedown', releaseevent: 'mouseup', area: {x1: -14, y1: 2, x2: -3, y2: 13}, cursor: 'pointer', icon: ICONURLFULLSCREENTURNON, callback: [Interface.FullScreenControl] }, 
                                   fullscreendblclick: { releaseevent: 'dblclick', callback: [Interface.FullScreenControl] }, 
                                   closeicon: { captureevent: 'mousedown', releaseevent: 'mouseup', area: {x1: -14, y1: 2, x2: -3, y2: 13},  cursor: 'pointer', icon: ICONURLCLOSE, callback: [Interface.CloseControl] }, 
                                   closeesc: { captureevent: 'keydown', releaseevent: 'keyup', button: 'Escape', callback: [Interface.CloseControl] }, 
                                   resize: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', area: {x1: -13, y1: -13, x2: -1, y2: -1}, cursor: 'nw-resize', callback: [Interface.ResizeControl] }, 
                                   resizex: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', area: {x1: -13, y1: 0, x2: -1, y2: -1}, cursor: 'e-resize', callback: [Interface.ResizeControl] }, 
                                   resizey: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', area: {x1: 0, y1: -13, x2: -1, y2: -1}, cursor: 'n-resize', callback: [Interface.ResizeControl] }, 
                                   push: { captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', elements: [], cursor: 'pointer', callback: [Interface.PushControl] }, 
                                   drag: { button: 0, captureevent: 'mousedown', processevent: 'mousemove', releaseevent: 'mouseup', cursor: 'grabbing', callback: [Interface.DragControl] }, 
                                   default: { callback: [] }, 
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
 return [dialogdata, parentchild, { effect: 'rise', position: 'CENTER', overlay: 'MODAL' }, { class: 'dialogbox selectnone' }];
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

function SVGUrlHeader(viewwidth = '12', viewheight = '12')
{
 return `url("data:image/svg+xml,%3Csvg viewBox='0 0 ${viewwidth} ${viewheight}' width='${viewwidth}' height='${viewheight}' xmlns='http://www.w3.org/2000/svg'%3E`;
}

function SVGUrlFooter()
{
 return `%3C/svg%3E")`;
}

function SVGRect(x, y, w, h, strength, dash, color, fill = 'none', rx = '4')
{
 const disp = Math.round(strength/2);
 x += disp;
 y += disp;
 h -= disp * 2;
 w -= disp * 2;
 return `%3Crect pathLength='99' stroke-width='${strength}' fill='${fill}' stroke='${color}' x='${x}' y='${y}' width='${w}' height='${h}' rx='${rx}' stroke-dasharray='${dash} 100' stroke-linejoin='round' /%3E`;
}

function SVGPath(path, color, width)
{
 return `%3Cpath d='${path}' stroke='${color}' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round' /%3E`;
}
