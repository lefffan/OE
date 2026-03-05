// Todo0 - handle context key menu creation

import { Application } from './application.js';
import { Interface } from './interface.js';

export class ContextMenu extends Interface
{
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
  super(data, parentchild, { animation: 'rise', overlay: 'NONSTICKY', control: { closeesc: {}, default: { releaseevent: 'mouseup|keydown|keyup' } }, attributes: { class: 'contextmenu selectnone' } });    // Args: data, parentchild, props
  this.elementDOM.innerHTML = inner;

  // Context menu position 
  this.elementDOM.style.left = document.documentElement.clientWidth > this.elementDOM.offsetWidth + event.clientX ? event.clientX + 'px' : event.clientX - this.elementDOM.clientWidth + 'px';
  this.elementDOM.style.top  = document.documentElement.clientHeight > this.elementDOM.offsetHeight + event.clientY ? event.clientY + 'px' : event.clientY - this.elementDOM.clientHeight + 'px';
 }
}
