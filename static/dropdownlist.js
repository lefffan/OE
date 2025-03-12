import { app } from './application.js';
import { Interface } from './interface.js';
import { GetElementOption } from './dialogbox.js';

// Todo0 - how to release next method: up/down arrow keys navigate for last focused selectable element?

export class DropDownList extends Interface
{
 static style = {
				 // Expanded selection
				 ".expanded": { "display": "block;", "margin": "0 !important;", "padding": "0 !important;", "position": "absolute;", "overflow-y": "auto !important;", "overflow-x": "hidden !important;", "max-height": "500px !important;" },
 				}

 constructor(options, dialogbox, selectdiv)
 {
  // Create element 'e' drop-down option list
  super(options, dialogbox.parentchild, { overlay: 'NONSTICKY', effect: 'rise', control: { closeesc: {}, resize: {}, default: { releaseevent: 'mouseup|keydown' } } }, {class: 'select expanded', style: `left: ${selectdiv.offsetLeft + dialogbox.elementDOM.offsetLeft}px; top: ${selectdiv.offsetTop + dialogbox.elementDOM.offsetTop + selectdiv.offsetHeight - dialogbox.Nodes.contentwrapper.scrollTop}px;`}); // (data, parentchild, props, attributes)
  this.dialogbox = dialogbox;
  this.selectdiv = selectdiv;
  this.cursor = +(GetElementOption(options)?.id);

  // And fill it with element options
  this.Show();
 }

 // Display drop-down list content
 Show()
 {
  let content = '';
  for (const option of this.data) content += `<div value="${option.id}" class="selectnone${option.checked || (+option.id) === this.cursor ? ' selected' : ''}"${option.styleattribute}>${option.inner}</div>`;
  this.elementDOM.innerHTML = content;
 }

 // 'Hide' function fixes the global event the drop-down list is killed by. Needed for dialogbox to know (via comparing event counters) whether 'select' element click event or not removes drop-down list
 Hide()
 {
  this.hideeventid = app.eventcounter;
  super.Hide();
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
					   		this.dialogbox.Handler({ type: 'optionchange', target: this.selectdiv });	// Call dialog box handler to change selected option
					   		return { type: 'KILLME' };													// Return 'optionchange' event to change dialog box selectable element checked option
					   case 'ArrowUp':
					   		this.cursor --;																// Decrease cursor pos up or down from current option appearance id
							if (this.cursor < 0) this.cursor = this.data.length - 1;					// Out of range is adjusted to last option
							this.Show();
							break;
					   case 'ArrowDown':
					   		this.cursor ++;																// Increase cursor pos from current option appearance id
					   		if (this.cursor >= this.data.length) this.cursor = 0;						// Out of range is adjusted to 1st option
					   		this.Show();
							break;
					  }
			   break;
		  case 'mouseup':																				// Handle left btn mouse up event
		  	   if (event.button) break;																	// Break for non left btn
		  	   this.cursor = event.target.attributes?.value?.value;										// Set cursor to option appearance id
			   this.dialogbox.Handler({ type: 'optionchange', target: this.selectdiv });				// Call dialog box handler to change selected option
			   return { type: 'KILLME' };																// Return 'optionchange' event to change dialog box selectable element checked option
		 }
 }
}