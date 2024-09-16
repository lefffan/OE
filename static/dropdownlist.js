// Todo0 - how to release next method: up/down arrow keys navigate for last focused selectable element?
class DropDownList extends Interface
{
 constructor(options, dialogbox, selectdiv)
 {
  // Create element 'e' drop-down option list
  super(options, dialogbox.parentchild, {overlay: 'NONSTICKY', effect: 'rise', flags: CLOSEESC}, {class: 'select expanded', style: `left: ${selectdiv.offsetLeft + dialogbox.elementDOM.offsetLeft}px; top: ${selectdiv.offsetTop + dialogbox.elementDOM.offsetTop + selectdiv.offsetHeight - dialogbox.contentwrapper.scrollTop}px;`}); // (data, parentchild, props, attributes)
  this.dialogbox = dialogbox;
  this.selectdiv = selectdiv;
  this.cursor = +(GetElementOptionByChecked(options)?.[2]);

  // And fill it with element options
  this.Show();
  this.resizingElement = this.elementDOM;
 }

 // Display drop-down list content
 Show()
 {
  let content = '';
  for (const option of this.data) content += `<div value="${option[2]}" class="selectnone${option[1] || (+option[2]) === this.cursor ? ' selected' : ''}">${AdjustString(option[0] ? option[0] : EMPTYOPTIONTEXT, HTMLINNERENCODEMAP)}</div>`;
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
			   switch (event.keyCode)
			   		  {
					   case 13:																													// Enter key
					   		return { type: 'KILLME', destination: this.dialogbox, subevent: { type: 'optionchange', target: this.selectdiv } };	// Return 'optionchange' event to change dialog box selectable element checked option
					   case 38:																													// Up arrow key
					   		this.cursor --;																										// Decrease cursor pos up or down from current option appearance id
							if (this.cursor < 0) this.cursor = this.data.length - 1;															// Out of range is adjusted to last option
							this.Show();
							break;
					   case 40:																													// Down arrow key
					   		this.cursor ++;																										// Increase cursor pos from current option appearance id
					   		if (this.cursor >= this.data.length) this.cursor = 0;																// Out of range is adjusted to 1st option
					   		this.Show();
							break;
					  }
			   break;
		  case 'mouseup':																														// Handle left btn mouse up event
		  	   if (event.which !== 1) break;																									// Break for non left btn
		  	   this.cursor = event.target.attributes?.value?.value;																				// Set cursor to option appearance id
			   return { type: 'KILLME', destination: this.dialogbox, subevent: { type: 'optionchange', target: this.selectdiv } };				// Return 'optionchange' event to change dialog box selectable element checked option
		 }
 }
}