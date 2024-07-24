class ContextMenu extends Interface
{
 static style = {
		 ".contextmenu": { "background-color": "#F3F3F3;", "border": "solid 1px #dfdfdf;", "padding": "10px 0;", "border-radius": "2px;", "min-width": "200px;", "white-space": "nowrap;" },
		 ".contextmenuitem": { "background-color": "transparent;", "color": "#1166aa;", "margin-bottom": "0px;", "font-family": "sans-serif;", "font-size": "16px;", "font-weight": "300;", "line-height": "1.5;", "padding": "5px 15px;" },
		 ".greycontextmenuitem": { "background-color": "transparent;", "color": "#CCC;", "margin-bottom": "0px;", "font-family": "sans-serif;", "font-size": "16px;", "font-weight": "300;", "line-height": "1.5;", "padding": "5px 15px;" },
		 ".contextmenuitem:hover": { "color": "#1166aa;", "background-color": "#e7e7e7;", "cursor": "pointer;" },
		 ".contextmenuitemdivider": { "background-color": "transparent;", "margin": "5px 10px 5px 10px;", "height": "0px;", "border-bottom": "1px solid #CCC;", "border-top-color": "transparent;", "border-left-color": "transparent;" , "border-right-color": "transparent;" },
                }

 destructor()
 {
  super.destructor();
 }

 Handler(event)
 {
  switch (event.type)
	 {
	  case 'mouseup':
	       return event.target.classList.contains('contextmenuitem') ? { type: 'KILLME', destination: this.destination, data: event.target.innerHTML } : undefined;
	 }
 }

 constructor(data, parentchild, event, destination) // (data, parentchild, props, attributes)
 {
  let inner = '', count = 0;
  if (Array.isArray(data)) for (let item of data)
     {
      inner += (!Array.isArray(item) || typeof item[0] !== 'string' || !item[0]) ? '<div class="contextmenuitemdivider"></div>' : `<div class="${item[1] ? 'grey' : ''}contextmenuitem">${item[0]}</div>`;
      count++;
     }

  super(count ? data : undefined, parentchild, { flags: CLOSEESC, effect: 'rise', overlay: 'NONSTICKY'}, {class: 'contextmenu selectnone' });
  this.elementDOM.innerHTML = inner;
  this.destination = destination;

  if (!event) return;
  this.elementDOM.style.left = document.documentElement.clientWidth > this.elementDOM.offsetWidth + event.clientX ? event.clientX + 'px' : event.clientX - this.elementDOM.clientWidth + 'px';
  this.elementDOM.style.top  = document.documentElement.clientHeight > this.elementDOM.offsetHeight + event.clientY ? event.clientY + 'px' : event.clientY - this.elementDOM.clientHeight + 'px';

  //this.elementDOM.style.left = this.parentchild.elementDOM.offsetWidth + this.parentchild.elementDOM.offsetLeft > this.elementDOM.offsetWidth + event.clientX ? event.clientX + 'px' : event.clientX - this.elementDOM.clientWidth + 'px';
  //this.elementDOM.style.top  = this.parentchild.elementDOM.offsetHeight + this.parentchild.elementDOM.offsetTop > this.elementDOM.offsetHeight + event.clientY ? event.clientY + 'px' : event.clientY - this.elementDOM.clientHeight + 'px';
 }
}
