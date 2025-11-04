// Todo0 - handle context key menu creation

import { app } from './application.js';
import { Interface } from './interface.js';

export class ContextMenu extends Interface
{
 static name = 'Context menu';
 static style = {
		         ".contextmenu": { "position": "fixed;", "overflow": "hidden;", "background-color": "#F3F3F3;", "border": "solid 1px #dfdfdf;", "padding": "10px 0;", "border-radius": "5px;", "min-width": "200px;", "white-space": "nowrap;" },
		         ".contextmenuitem": { "background-color": "transparent;", "color": "#1166aa;", "margin-bottom": "0px;", "font-family": "sans-serif;", "font-size": "16px;", "font-weight": "300;", "line-height": "1.5;", "padding": "5px 15px;" },
		         ".greycontextmenuitem": { "background-color": "transparent;", "color": "#CCC;", "margin-bottom": "0px;", "font-family": "sans-serif;", "font-size": "16px;", "font-weight": "300;", "line-height": "1.5;", "padding": "5px 15px;" },
		         ".contextmenuitem:hover": { "color": "#1166aa;", "background-color": "#e7e7e7;", "cursor": "pointer;" },
		         ".contextmenuitemdivider": { "background-color": "transparent;", "margin": "5px 10px 5px 10px;", "height": "0px;", "border-bottom": "1px solid #CCC;", "border-top-color": "transparent;", "border-left-color": "transparent;" , "border-right-color": "transparent;" },
                }

 Handler(event)
 {
  switch (event.type)
	    {
	     case 'mouseup':     // Handle only 'mouseup' event, child outside 'mousedown' event will never be dispathced to this nonsticky context menu
              if (event.target.classList.contains('contextmenuitem')) return [ { type: 'CONTEXTMENU', data: this.data[event.target.attributes['data-item'].value], destination: this.parentchild }, { type: 'KILL', destination: this } ];
              break;
	    }
 }

 constructor(data, parentchild, event)
 {
  if (!Array.isArray(data)) return;                                                                                                                                       // Return for non array data
  let inner = '';                                                                                                                                                         // Create empty context menu inner html
  for (const item in data)
      {
       if (Array.isArray(data[item])) inner += `<div class="contextmenuitem" data-item="${item}">${data[item][0] ? data[item][0] : '&nbsp'}</div>`;                       // Create active context menu item
       if (typeof data[item] === 'string') inner += data[item] ? `<div class="greycontextmenuitem">${data[item]}</div>` : '<div class="contextmenuitemdivider"></div>';   // Create inactive context menu item. Empty item is considered as a context menu divider line also
      }
  if (!inner || !event) return;                                                                                                                                           // Context menu inner html is empty or undefined event? Return
  super(data, parentchild, { animation: 'rise', overlay: 'NONSTICKY', control: { closeesc: {}, default: { releaseevent: 'mouseup|keydown|keyup' } } }, { class: 'contextmenu selectnone' });    // Args: data, parentchild, props, attributes
  this.elementDOM.innerHTML = inner;

  // Context menu position 
  this.elementDOM.style.left = document.documentElement.clientWidth > this.elementDOM.offsetWidth + event.clientX ? event.clientX + 'px' : event.clientX - this.elementDOM.clientWidth + 'px';
  this.elementDOM.style.top  = document.documentElement.clientHeight > this.elementDOM.offsetHeight + event.clientY ? event.clientY + 'px' : event.clientY - this.elementDOM.clientHeight + 'px';
 }
}
