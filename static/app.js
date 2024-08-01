class App extends Interface
{
 captured = {};
 eventcounter = 0;
 static style = {
 				 "Appearance animation": { "dialog box": "slideleft", "expanded selection": "rise", "context menu": "rise", "new connection": "", "new view": "" },
 				 "_Appearance animation": "Select interface elements appearance animation"
				}

 constructor(...args)
	    {
	     super(...args);
	     document.addEventListener('keydown', Handler);
	     document.addEventListener('keyup', Handler);
	     document.addEventListener('mousedown', Handler);
	     document.addEventListener('dblclick', Handler);
	     document.addEventListener('mouseup', Handler);
	     document.addEventListener('mousemove', Handler);
	     document.addEventListener('click', Handler);
	     document.addEventListener('contextmenu', (event) => event.preventDefault());
	    }

 StyleActiveChild()
	    {
	    }

 Handler(event)
    {
     switch (event.type)
	    {
	     case 'mouseup':
		  if (event.which === 3) new ContextMenu([['New connection'], ['Help'], ['Test', 0]], this, event, this);
		  break;
	     case 'dblclick':
		  		break;
	     case 'New connection':
		  new Connection(null, this, {flags: CMCLOSE | CMFULLSCREEN, effect: 'slideright', cascade: true}, {class: 'defaultbox', style: `background-color: ${nicecolors[Math.round(Math.random()*(nicecolors.length - 1))]}`});
		  //if (event.data == 'New connection') new Connection(null, this, {flags: CMCLOSE | CMFULLSCREEN, effect: 'slideright', cascade: true, overlay: 'MODAL'}, {class: 'defaultbox', style: `background-color: ${nicecolors[Math.round(Math.random()*(nicecolors.length - 1))]}`});
		  break;
	    }
    }
}
