export const HTMLINNERENCODEMAP		= [['&', '<', '>', '\n', ' ', '"'], ['&amp;', '&lt;', '&gt;', '<br>', '&nbsp;', '&quot;']];	// Encoding map array of two arrays with symmetric values to encode/decode each other
export const TAGATTRIBUTEENCODEMAP		= [['<', '>', '\n', '"'], ['&lt;', '&gt;', '', '&quot;']];
export const ELEMENTINNERALLOWEDTAGS	= ['span', 'pre', 'br'];
export const EFFECTS					= ['hotnews', 'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall', 'rise'];
export const EFFECTSHINT				= "effect appearance. Possible values:<br>'hotnews', 'fade', 'grow', 'slideleft', 'slideright', 'slideup', 'slidedown', 'fall' and 'rise'.<br>All other values make no effect.";
export const NODOWNLINKNONSTICKYCHILDS	= 0b1;

export function lg(...data)
{
 console.log(...data);
}

export function dir(...data)
{
 data.forEach(value => console.dir(value));
}

// Function creates regexp to match tag names list 'tags'
export function HTMLTagsRegexp(tags)
{
 let regexp = '';
 if (Array.isArray(tags)) for (const tag of tags) regexp += `<${tag} .*?>|<${tag} *>|<\/${tag} *>|`;
 return new RegExp(regexp.substring(0, regexp.length - 1), 'g');
}

// Function encodes strong 
export function AdjustString(string, encodemap, excludehtmltags, trim)
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

export function EncodeString(string, encodemap)
{
 if (typeof string !== 'string' || !string || !Array.isArray(encodemap) || !Array.isArray(encodemap[0]) || !Array.isArray(encodemap[1])) return '';

 for (let i = 0; i < encodemap[0].length; i ++)
     string = string.replace(new RegExp(encodemap[0][i], 'g'), encodemap[1][i]);

 return string;
}

export function MessageBox(parentchild, message, title)
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
export function ToggleString (source, string)
{
 if (typeof source !== 'string' || typeof string !== 'string') return '';
 return source.indexOf(string) === -1 ? source + string : source.replaceAll(string, '');
}

export function SearchProp(object, prop)
{
 if (typeof object === 'object')
    for (const i in object) if (i === prop) return i;
}

export function SearchPropValue(object, value)
{
 if (typeof object === 'object')
    for (const i in object) if (object[i] === value) return i;
}

export function GetStyleInnerHTML(...objects) //https://dev.to/karataev/set-css-styles-with-javascript-3nl5, https://professorweb.ru/my/javascript/js_theory/level2/2_4.php
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

export function SVGUrlHeader(viewwidth = '12', viewheight = '12')
{
 return `url("data:image/svg+xml,%3Csvg viewBox='0 0 ${viewwidth} ${viewheight}' width='${viewwidth}' height='${viewheight}' xmlns='http://www.w3.org/2000/svg'%3E`;
}

export function SVGUrlFooter()
{
 return `%3C/svg%3E")`;
}

export function SVGRect(x, y, w, h, strength, dash, color, fill = 'none', rx = '4')
{
 const disp = Math.round(strength/2);
 x += disp;
 y += disp;
 h -= disp * 2;
 w -= disp * 2;
 return `%3Crect pathLength='99' stroke-width='${strength}' fill='${fill}' stroke='${color}' x='${x}' y='${y}' width='${w}' height='${h}' rx='${rx}' stroke-dasharray='${dash} 100' stroke-linejoin='round' /%3E`;
}

export function SVGPath(path, color, width, elementtype = 'background')
{
 return elementtype === 'background' ? `%3Cpath d='${path}' stroke='${color}' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round' /%3E` : `<path d='${path}' stroke='${color}' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round' />`;
}
