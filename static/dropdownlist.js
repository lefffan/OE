// Todo0 - how to release next method: up/down arrow keys navigate for last focused selectable element?

import { Interface } from './interface.js';
import { GetElementOption } from './dialogbox.js';

export class DropDownList extends Interface
{
 static style = {
				 // Expanded selection
				 ".expanded": { "display": "block;", "margin": "0 !important;", "padding": "0 !important;", "position": "absolute;", "overflow-y": "auto !important;", "overflow-x": "hidden !important;", "max-height": "500px !important;" },
 				}

 //
 constructor(e, event, left, top)
 {
  super({ e: e, cursor: +(GetElementOption(e.options)?.id) }, event.destination.parentchild, { overlay: 'NONSTICKY', effect: 'rise', control: { closeesc: {}, resize: {}, default: { releaseevent: 'mouseup|keydown' } }, event: event }, { class: 'select expanded', style: `left: ${left}px; top: ${top}px;` }); // (data, parentchild, props, attributes)
  this.Show();
 }

 // Display drop-down list content
 Show()
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
							this.props.event.data = this.data;
					   		return [ this.props.event, { type: 'KILL', destination: this } ];				// Return callback event together with KILL
					   case 'ArrowUp':
					   		this.data.cursor --;															// Decrease cursor pos up or down from current option appearance id
							if (this.data.cursor < 0) this.data.cursor = this.data.e.options.length - 1;	// Out of range is adjusted to last option
							this.Show();
							break;
					   case 'ArrowDown':
					   		this.data.cursor ++;															// Increase cursor pos from current option appearance id
					   		if (this.data.cursor >= this.data.e.options.length) this.data.cursor = 0;		// Out of range is adjusted to 1st option
					   		this.Show();
							break;
					  }
			   break;
		  case 'mouseup':																					// Handle left btn mouse up event
		  	   if (event.button) break;																		// Break for non left btn
		  	   this.data.cursor = event.target.attributes?.value?.value;									// Set cursor to option appearance id
			   this.props.event.data = this.data;
		   	   return [ this.props.event, { type: 'KILL', destination: this } ];							// Return callback event together with KILL
		 }
 }
}