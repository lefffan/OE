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
	       return event.target.classList.contains('contextmenuitem') ? { type: 'KILLME', event: { type: 'CONTEXTMENU', data: this.data[event.target.attributes['data-item'].value] } } : undefined;
	 }
 }

 constructor(data, parentchild, event)
 {
  let inner = '';
  if (Array.isArray(data)) for (const item in data)
     switch (typeof data[item])
            {
             case 'object':
                  if (!Array.isArray(data[item])) break;
                  inner += `<div class="contextmenuitem" data-item="${item}">${data[item] ? data[item] : '&nbsp'}</div>`;
                  break;
             case 'string':
                  inner += data[item] ? `<div class="greycontextmenuitem">${data[item]}</div>` : '<div class="contextmenuitemdivider"></div>';
                  break;
            }

  super(inner ? data : undefined, parentchild, { flags: CLOSEESC, effect: 'rise', overlay: 'NONSTICKY'}, {class: 'contextmenu selectnone' }); // (data, parentchild, props, attributes)
  this.elementDOM.innerHTML = inner;

  if (!event) return;
  this.elementDOM.style.left = document.documentElement.clientWidth > this.elementDOM.offsetWidth + event.clientX ? event.clientX + 'px' : event.clientX - this.elementDOM.clientWidth + 'px';
  this.elementDOM.style.top  = document.documentElement.clientHeight > this.elementDOM.offsetHeight + event.clientY ? event.clientY + 'px' : event.clientY - this.elementDOM.clientHeight + 'px';
 }
}
