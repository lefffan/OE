// Todo0 in september (other src code):
// Todo0 - Sidebar
// Todo0 - Make new todo.txt that was done during EOS work
// Todo0 - Shemsetdinov justify src arch via require/import + remove windows.js code to index.js 
// Todo0 - Make code overview for all other sources, do it the way dialogbox.js is done
// Todo0 - Pass through all dialog.js to check syntax and test every dialog feature one by one code line (don't forget to check table element type with its string data JSON type to convert to object)

// Todo0 in october (OD structure in DB)
// Todo0 - Cursor scheme default, custom
// Todo0 - DB SQL handle for OD structure
// Todo1 - Scale dialog box somehow, cause it seems too compact, use some nice colors: orange RGB(243,131,96), 247,166,138; blue RGB(87,156,210), 50,124,86; bordovij RGB(136,74,87), 116,63,73; salatovij (174,213,129), 150,197,185; And make more nice interface somehow
// Todo0 - macros for interface elements margins/fonts to scale/form dialog box. Also use macroses in user css configuration profile! Make 3-level macro; 1 - global (system user), 2 - OD, 3 - Specific user.

class App extends Interface
{
 static style = {
 				 "Appearance animation": { "dialog box": "slideleft", "expanded selection": "rise", "context menu": "rise", "new connection": "", "new view": "" },
 				 "_Appearance animation": "Select interface elements appearance animation", 
				 ".modalfilter": { "filter": "opacity(50%);", "_filter": "Dialog box modal effect appearance via css filter property, see appropriate css documentaion." },
				}

 // Creating application! Add all mouse/keyboard event listeners here and init event counter
 constructor()
 {
  super({}, null, { tagName: 'BODY', control: { default: { releaseevent: 'mouseup', button: 2 } } }, { style: `background-color: ${nicecolors[7]};` });
  this.eventcounter = 0;
  document.addEventListener('keydown', Interface.EventListener);
  document.addEventListener('keyup', Interface.EventListener);
  document.addEventListener('mousedown', Interface.EventListener);
  document.addEventListener('dblclick', Interface.EventListener);
  document.addEventListener('mouseup', Interface.EventListener);
  document.addEventListener('mousemove', Interface.EventListener);
  document.addEventListener('click', Interface.EventListener);
  document.addEventListener('contextmenu', (event) => event.preventDefault());
 }

 // Override main application child activation styling to exclude any effects for document.body
 StyleActiveChild()
 {
 }

 // Main application own handler to context menu and new connection create 
 Handler(event)
 {
  switch (event.type)
	     {
	      case 'mouseup':
		  	   new ContextMenu([['New connection'], ['Help']], this, event);
		  	   break;
	      case 'CONTEXTMENU':
			   switch (event.data[0])	// Switch context item name (event data zero index)
			   		  {
					   case 'New connection':
			   				new Connection(null, this);	// Args: data, parent
							break;
					  }
		  	   break;
	     }
 }
}
