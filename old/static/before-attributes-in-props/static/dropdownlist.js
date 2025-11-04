// Todo0 - how to release next method: up/down arrow keys navigate for last focused selectable element?

import { app } from './application.js';
import { Interface } from './interface.js';
import { GetElementOption } from './dialogbox.js';

export class DropDownList extends Interface
{
 static name = 'Drop down list';
 static style = {
				 // Expanded selection
				 ".expanded": { "display": "block;", "margin": "0 !important;", "padding": "0 !important;", "position": "absolute;", "overflow-y": "auto !important;", "overflow-x": "hidden !important;", "max-height": "500px !important;" },
 				}

 //
 constructor(e, dialog, left, top)
 {
  super({ e: e, cursor: +(GetElementOption(e.options)?.id) }, dialog.parentchild, { overlay: 'NONSTICKY', animation: 'rise', control: { closeesc: {}, resize: {}, default: { releaseevent: 'mouseup|keydown' } } }, { class: 'select expanded', style: `left: ${left}px; top: ${top}px;` }); // (data, parentchild, props, attributes)
  this.dialog = dialog;
  this.Display();
 }

 // Display drop-down list content
 Display()
 {
  let content = '';
  for (const option of this.data.e.options) content += `<div value="${option.id}" class="selectnone${option.checked || (+option.id) === this.cursor ? ' selected' : ''}"${option.styleattribute}>${option.inner}</div>`;
  this.elementDOM.innerHTML = content;
 }

 // Handle interface events
 Handler(event)
 {
  switch (event.type)
		 {
		  case 'keydown':
			   switch (event.code)
			   		  {
					   case 'Enter':
					   		return [ { type: 'OPTIONCHANGE', destination: this.dialog }, { type: 'KILL', destination: this } ];	// Return callback event together with KILL
					   case 'ArrowUp':
					   		this.data.cursor --;																				// Decrease cursor pos up or down from current option appearance id
							if (this.data.cursor < 0) this.data.cursor = this.data.e.options.length - 1;						// Out of range is adjusted to last option
							this.Display();
							break;
					   case 'ArrowDown':
					   		this.data.cursor ++;																				// Increase cursor pos from current option appearance id
					   		if (this.data.cursor >= this.data.e.options.length) this.data.cursor = 0;							// Out of range is adjusted to 1st option
					   		this.Display();
							break;
					  }
			   break;
		  case 'mouseup':																										// Handle left btn mouse up event
		  	   if (event.button) break;																							// Break for non left btn
		  	   this.data.cursor = event.target.attributes?.value?.value;														// Set cursor to option appearance id
		   	   return [ { type: 'OPTIONCHANGE', destination: this.dialog }, { type: 'KILL', destination: this } ];				// Return callback event together with KILL
		  case 'DYINGGASP':
			   if (event.source === this.dialog) return { type: 'KILL', destination: this };
			   break;
		  case 'KILL':
			   return { type: 'DYINGGASP', destination: this.dialog, data: { e: this.data.e, event: event.data} };
		 }
 }
}