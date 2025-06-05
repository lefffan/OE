import { SVGUrlHeader, SVGRect, SVGPath, SVGUrlFooter, SVGCircle, lg, CutString } from './constant.js';
import { Interface } from './interface.js';
import { ContextMenu } from './contextmenu.js';

// Todo0 - OV description as a hint on taskbar OV navigation
// Todo0 - new sidebar control to hint folder/vew/db number or user and hints for every sidebar control
// Todo0 - Global func to return background svg for up/down arrows with user defined color
// Todo0 - Do not place global css style props starting with space/underline char to user customization dialog, so dialog arrows classes from index.html will be replaced to dialogbox.js module
// Todo0 - Make sidebar icon twice bigger and lupa icon is painted with the color while searching
// Todo1 - Make universal 'flag' function to manage flags in one place and implement it to sidebar

const WEIGHTS  = { 'view': 1, 'database': 2, 'folder': 3 };
const ARROW    = [ SVGUrlHeader(12, 12) + SVGPath('M3 7L6 10 M6 10L9 7 M6 3L6 10', 'RGB(96,125,103)', '3') + ' ' + SVGUrlFooter(), // bright green 139,188,122
                   SVGUrlHeader(12, 12) + SVGPath('M3 6L6 3  M6 3L9 6  M6 3L6 10', 'RGB(96,125,103)', '3') + ' ' + SVGUrlFooter(),
                   SVGUrlHeader(12, 12) + SVGPath('M3 7L6 10 M6 10L9 7 M6 3L6 10', 'RGB(125,96,107)', '3') + ' ' + SVGUrlFooter(),
                   SVGUrlHeader(12, 12) + SVGPath('M3 6L6 3  M6 3L9 6  M6 3L6 11', 'RGB(125,96,107)', '3') + ' ' + SVGUrlFooter() ];
const LUPA     = SVGUrlHeader(12, 12) + SVGCircle(5, 5, 3, '2', 'RGB(128, 128, 0)') + ' ' + SVGPath('M8 8L10 10', 'RGB(128, 128, 0)', '2') + ' ' + SVGUrlFooter();

function OnDraw(func)
{
 requestAnimationFrame(function() { requestAnimationFrame(function() { func(); }); });
}

export class Sidebar extends Interface
{
 static style = {
                 ".sidebar": { "border": "none;", "background-color": "rgb(12,68,118);", "border-radius": "5px;", "color": "#9FBDDF;", "width": "13%;", "height": "90%;", "left": "4%;", "top": "5%;", "box-shadow": "4px 4px 5px #222;", "padding": "16px 0 0 0;" },
                 ".changescount": { "vertical-align": "super;", "padding": "2px 3px 2px 3px;", "color": "rgb(232,187,174);", "font": "0.5em Lato, Helvetica;", "background-color": "rgb(125,77,94);", "border-radius": "35%"},
                 ".sidebar tr:hover": { "background-color": "#25589F;", "cursor": "pointer;", "margin": "100px 100px;" },
                 ".sidebar_folder": { "color": "", "font": "1.8em Lato, Helvetica;", "padding": "8px 0;", "margin": "" },
                 ".sidebar_database": { "color": "", "font": "1.6em Lato, Helvetica;", "padding": "8px 0;", "margin": "" },
                 ".sidebar_view": { "color": "", "font": "1.1em Lato, Helvetica;", "padding": "4px 0;", "margin": "" },
                 ".searchbar": { "margin": "4px 17px 1px 17px;", "border-radius": "5px;", "background-color": "rgb(32,88,138);", },
                 ".searchinput": { "color": "", "font": "0.9em Lato, Helvetica;", "paddin": "0;", "margin": "4px;", "outline": "none;", "border": "none;", "background-color": "inherit;", "color": "inherit;", "width": "90%;" },
                }

 static LupaControl(userevent, control, phase)
 {
  if (phase !== 'release') return;     // For 'release' phase only at left mouse btn released
  control.data = !control.data;        // Invert search bar appearance
  if (control.data) // Search bar was hidden, so show it
     {
      ///control.child.searchbar.style.display = 'block'; // Triple slash is an old non-animated version of sidebar display, to return it hust uncomment it and remove some lines below
      ///requestIdleCallback(() => control.child.searchinput.focus()); // or setTimeout(() => control.child.searchbar.input.focus(), 0);
      control.child.searchbar.classList.remove('growhide', 'is-collapsed');
      control.child.searchbar.classList.add('growshow');
      control.child.searchbar.style.visibility = 'visible';
      control.child.searchinput.addEventListener('input', control.child.Handler.bind(control.child));
      control.child.UpdateSearchString();
     }
   else // Search bar was on, so remove it
     {
      control.child.searchinput.removeEventListener('input', control.child.Handler.bind(control.child));
      ///control.child.searchbar.style.display = 'none';
      control.child.searchbar.style.visibility = 'hidden';
      control.child.searchbar.classList.remove('growshow');
      control.child.searchbar.classList.add('growhide', 'is-collapsed');
      control.child.root.searchstring = '';
     }
  control.child.SearchBranch();
  control.child.SidebarShow();
 }

 static SortControl(userevent, control, phase)
 {
  if (phase !== 'release') return;
  let arrowindex = 0;
  control.child.root.sort.indexOf('^') === -1 ? control.child.root.sort += '^' : control.child.root.sort = control.child.root.sort.indexOf('a') === -1 ? (control.child.root.sort + 'a').replaceAll(/\^/g, '') : control.child.root.sort.replaceAll(/a|\^/g, ''); // Change sort order

  if (control.child.root.sort.indexOf('a') !== -1) arrowindex += 2; // Calculate sort icon index in ARROW array
  if (control.child.root.sort.indexOf('^') !== -1) arrowindex += 1;
  control.child.props.control.sorticon.icon = ARROW[arrowindex];    // Set control icon to calculated above
  control.child.RefreshControlIcons();                              // and display it

  control.child.SidebarSort();
  control.child.SidebarShow();
 }

 UpdateSearchString()
 {
  this.root.searchstring = this.searchinput.value; // Fix search string from input bar to root folder 'searchstring' prop - just for proper work of SidebarShow function
  const secondslash = this.root.searchstring.lastIndexOf('/');  // Get last slash position
  try {
       if (secondslash > 0 && this.root.searchstring[0] === '/') this.root.searchstring = new RegExp(this.root.searchstring.substring(1, secondslash), this.root.searchstring.substring(secondslash + 1)); // First slash at first char and second slash position more than zero? Create regular expression
      }
  catch
      {
      }
 }

 constructor(data, parentchild) // (data, parentchild, props, attributes)
 {
  const sortcontrol = { captureevent: 'mousedown', releaseevent: 'mouseup', area: {x1: -14, y1: 2, x2: -3, y2: 13}, cursor: 'pointer', icon: ARROW[0], data: '', callback: [Sidebar.SortControl] };
  const lupacontrol = { captureevent: 'mousedown', releaseevent: 'mouseup', area: {x1: -14, y1: 2, x2: -3, y2: 13}, cursor: 'pointer', icon: LUPA, callback: [Sidebar.LupaControl] };
  const control = { fullscreenicon: {}, minimizescreen: {}, sorticon: sortcontrol, lupaicon: lupacontrol, resize: {}, resizex: {}, resizey: {}, drag: {}, default: { releaseevent: 'mouseup|mousedown|keyup' } };
  super(data, parentchild, { overlay: 'ALWAYSONTOP', control: control }, { class: 'defaultbox sidebar selectnone' });
  // Set some props
  this.username = parentchild.username;
  this.elementDOM.style.left = '50px';
  this.elementDOM.style.top  = '50px';
  // this.root = { type: folder/database/view, wrapped: true/false, name: , id: , odid: for the view type only, target: , new: , match: , content: [] } + sort: , searchstring: , folderlastid: 0, activeodid: , activeovid: 
  this.root = { type: 'folder', wrap: false, name: 'Root folder', id: 0, content: [], sort: '', folderlastid: 0, sort: '', searchstring: '' };
  // this.od{id} = { branch: , ov{id}: { footnote: 0-.., status: -2||undefined (not open); -1 (server data pending); 0-100(view data loaded in %), childid: , targets: [] } }
  this.od = {};
  this.props.control.drag.elements = [this.elementDOM];
  // Get database/view list
  parentchild.CallController({ type: 'SIDEBARGET' });
  // Create sidebar two elements - search bar at the top and content bar (db structure) lower
  this.searchbar = document.createElement('div')
  this.searchbar.classList.add('searchbar', 'is-collapsed', 'growhide', 'smooth');
  this.searchinput = document.createElement('input');
  this.searchinput.classList.add('searchinput');
  this.searchinput.setAttribute('placeholder', 'Type here to search the view');
  this.contentbar = document.createElement('div')
  this.searchbar.appendChild(this.searchinput);
  this.elementDOM.appendChild(this.searchbar);
  this.elementDOM.appendChild(this.contentbar);
  ///this.searchbar.style.display = 'none';
  this.searchbar.addEventListener('transitionend', () => { this.searchbar.classList.remove(this.props.control.lupaicon.data ? 'growhide' : 'growshow'); this.searchinput.focus(); if (this.props.control.lupaicon.data) this.searchbar.style.height = ''; });
  this.searchbar.style.visibility = 'hidden';
 }

 destructor()
 {
  super.destructor();
 }

 // Function creates new od (if ovid is undefined) or ov in a sidebar folders hierarchy for specified path
 SidebarAdd(path, odid, ovid)
 {
  let branch = ovid === undefined ? this.root : path[0] === '/' ? this.root : this.od[odid].branch;             // Database is added first, so all its views with relative paths have its database folder as a root folder. Var <tree> (actually root folder) for OD or OV with leading slash is this.tree, for OV without leading slash - database folder
  if (path[0] === '/') path = path.substring(1);                                                                // Root folder is defined, so make all paths relative via removing leading slash if exist
  path = path.split('/');                                                                                       // Split path string

  for (const i in path)
      {
       const type = +i === path.length - 1 ? (ovid === undefined ? 'database' : 'view') : 'folder';             // Get subpath type - database, view, folder
       let subbranch, match;

       for (subbranch of branch.content)
           if (subbranch.type === type) // Go through all subpath type matched subbranches in content. For folder match case is a name match, for a database - odid match, for a view - odid and ovid
           if (((type === 'folder' && subbranch.name === path[i]) || (type === 'database' && subbranch.id === odid)) && (match = true)) break; // We should not check duplicated view names

       if (match)
          {
           branch = subbranch;
           branch.new = true;
           branch.name = path[i];
           continue;
          }

       branch.content.push({ type: type, wrap: true, name: path[i], id: type === 'folder' ? this.root.folderlastid++ : type === 'view' ? ovid : odid, odid: odid, new: true, content: [] }); // The cycle didn't result any subpath matched branches, so add new branch
       branch = branch.content.at(-1); // Set current branch to just created new one above
       if (type === 'database') this.od[odid] = { branch: branch, ov: {}, oldov: this.od[odid]?.ov }; // Overwrite OD list with current OD id with empty view list (OD is always added first) and old ov link to keep every view footnote and status
       if (type === 'view') this.od[odid]['ov'][ovid] = { footnote: this.od[odid]['oldov']?.[ovid]?.footnote, status: this.od[odid]['oldov']?.[ovid]?.status, childid: this.od[odid]['oldov']?.[ovid]?.childid, targets: [] }; // Refresh ov in od list retrieving prev ov version of footnote, status and child id
      }
 }

 // Function removes empty folders or/and databases (if odid exists). True function result signals upstream recursive call to slice current branch
 SidebarDelete(branch = this.root, odid)
 {
  for (let i = 0; i < branch.content.length; i++)
      if (this.SidebarDelete(branch.content[i], odid)) branch.content.splice(i--, 1); // Remove folder/database content for recursive call true result via array.splice(start, deleteCount)

  if (branch.new) return (branch.new = undefined);                   // Database or view are just created? Unset 'new' prop and return
  if (branch.type === 'folder') return !branch.content.length;       // Return true for empty folder (content.length = 0)
  if (branch.type === 'database' && branch.id === odid) return true; // Remove matched OD via true return
  if (branch.type === 'view' && branch.odid === odid) return true;   // Remove OV of matched OD via true return
 }
 
 SidebarSort(branch = this.root)
 {
  if (!branch.content.length) return;

  branch.content.sort((a, b) => {
                         if (WEIGHTS[a.type] - WEIGHTS[b.type]) return WEIGHTS[b.type] - WEIGHTS[a.type];                       // First of all compare element types depending on their weights. Elements compared weights are non zero? Return it
                         const compare = this.root.sort.indexOf('a') === -1 ? (+a.id) - (+b.id) : a.name.localeCompare(b.name); // Appearance/alphabetical order
                         return compare * (this.root.sort.indexOf('^') === -1 ? 1 : -1);                                        // Ascending/descending order
                        });

  for (const subbranch of branch.content) this.SidebarSort(subbranch);
 }

 Handler(event)
 {
  switch (event.type)
	    {
          case 'keyup':
               if (event.code === 'Escape' && this.props.control.lupaicon.data) Sidebar.LupaControl(null, this.props.control.lupaicon, 'release');
               break;
          case 'input':
               clearTimeout(this.searchtimer);
               this.searchtimer = setTimeout(() => { this.UpdateSearchString(); this.SearchBranch(); this.SidebarShow(); }, 300); 
               break;
          case 'mousedown':							
               if (event.button === 0 && event.buttons === 3){} // Left button down with right button hold?
               break;
	     case 'mouseup':
               const branch = this.GetDOMElementBranch(event.target);
               if (event.button === 0)
                  {
                   if (event.target.attributes['data-ovid'] !== undefined)
                      {
                       this.parentchild.CallController({ type: 'GETVIEW', data: { odid: event.target.attributes['data-odid'].value, ovid: event.target.attributes['data-ovid'].value } });
                       break;
                      }
                   if (branch?.content.length)
                      {
                       this.ToggleBranchWrap(branch);
                       break;
                      }
                   break;
                  }
               if (event.button === 2)
                  {
                   const contextmenuoptions = [['New Database'], , '', ['Help'], ['Logout ' + CutString(this.username)]];
                   if (event.target.attributes['data-odid'] !== undefined) contextmenuoptions[1] = ['Configure Database', event.target.attributes['data-odid'].value];
                   if (event.target.attributes['data-ovid'] !== undefined) contextmenuoptions[1] = ['Open in a new window', event.target.attributes['data-odid'].value, event.target.attributes['data-ovid'].value];
                   new ContextMenu(contextmenuoptions, this, event);
                   break;
                  }
               break;
          case 'CONTEXTMENU':
   			switch (event.data[0])	// Switch context item name (event data zero index)
				  {
				   case 'New Database':
                            this.parentchild.CallController({ type: 'CREATEDATABASE' });
					   break;
				   case 'Configure Database':
                            this.parentchild.CallController({ type: 'GETDATABASE', data: { odid: event.data[1] } });
					   break;
				   case 'Open in a new window':
                            this.parentchild.CallController({ type: 'GETVIEW', data: { odid: event.data[1], ovid: event.data[2], newwindow: true } });
					   break;
                       default:
                            if (event.data[0].substring(0, 'Logout '.length) === 'Logout ') this.parentchild.Handler({ type: 'LOGOUT' });
				  }
	          break;
          case 'SIDEBARSET': // { type: 'SIDEBARSET', data: { odid:, path:, ov: { 1: [path1, path2..], 2: [..] } } }
               this.SidebarAdd(event.data.path, event.data.odid);
               for (const ovid in event.data.ov) 
                   for (const path in event.data.ov[ovid]) 
                       this.SidebarAdd(event.data.ov[ovid][path], event.data.odid, ovid);
               this.SidebarDelete(this.tree, event.data.odid);
               this.SidebarSort();
               if (this.props.control.lupaicon.data) this.SearchBranch();
               this.SidebarShow();
               break;
          case 'SIDEBARDELETE': // { type: 'SIDEBARDELETE', data: { odid: } } 
               this.SidebarDelete(this.tree, event.data.odid);
               this.SidebarShow();
               break;
          case 'SIDEBARFOOTNOTE': // { type: 'SIDEBARFOOTNOTE', odid:, ovid:, value: }
               break;
          case 'SIDEBARLOAD': // { type: 'SIDEBARLOAD', odid:, ovid:, value: }
               break;
	    }
 }

 ToggleBranchWrap(branch)
 {
  const element = branch.target;
  branch.wrap = !branch.wrap;

  if (element.previousSibling?.rows) // Parent branch does exist? Renew its branch icon
     {
      const remove = branch.wrap ? 'unwrapped' : 'wrapped'; // Get class name to remove, see below
      const add = branch.wrap ? 'wrapped' : 'unwrapped'; // Get class name to add, see below
      element.previousSibling.rows[0].cells[1].classList.remove(branch.type + remove);
      element.previousSibling.rows[0].cells[1].classList.add(branch.type + add);
     }

  const wrappingfunction = function () { // Source - https://habr.com/ru/articles/475520/
                                        branch.wrap ? element.classList.add('is-collapsed') : element.classList.remove('is-collapsed'); // Toggle 'is-collapsed' class
                                        if (branch.wrap) element.style.height = '';
                                        element.addEventListener('transitionend', function onTransitionEnd() {
                                                                                                              element.removeEventListener('transitionend', onTransitionEnd);
                                                                                                              if (!branch.wrap) element.style.height = '';
                                                                                                             });
                                       };
  element.style.height = `${element.scrollHeight}px`;
  OnDraw(wrappingfunction);
 }

 GetDOMElementBranch(element)
 {
  if (element.attributes['data-branch'] === undefined) return;
  let branch = this.root;
  if (element.attributes['data-branch'].value) for (const i of element.attributes['data-branch'].value.split('_')) branch = branch.content[i];
  return branch;
 }

 SidebarShow()
 {
  this.inner = this.GetBranchInner();
  requestAnimationFrame(() => { 
                               this.contentbar.innerHTML = this.inner;
                               for (const element of this.contentbar.querySelectorAll('div'))
                                   {
                                    const branch = this.GetDOMElementBranch(element, true);
                                    branch.target = element;
                                    if (branch.type === 'view') this.od[branch.odid].ov[branch.id].targets.push(element);
                                   }
                              });
 }

 SearchBranch(branch = this.root)
 {
  if (branch === this.root) branch.match = 0;

  if (branch !== this.root) branch.match = ((typeof this.root.searchstring === 'string' && branch.name.indexOf(this.root.searchstring) !== -1) || (typeof this.root.searchstring === 'object' && this.root.searchstring.test(branch.name))) ? 1 : 0;

  for (const subbranch of branch.content) branch.match += this.SearchBranch(subbranch);

  return branch.match;
 }

 GetBranchInner(branch = this.root, depth = 0, id = '')
 {
  let inner = '';
  let nestedinner = '';
  let attribute = ` data-branch="${id}"`; // Fix tag attribute

  if (depth && (!this.props.control.lupaicon.data || branch.match)) inner += this.GetRowInner(branch, attribute, depth);
  if (!this.props.control.lupaicon.data || branch.match) for (const i in branch.content) nestedinner += this.GetBranchInner(branch.content[i], depth + 1, depth ? id + '_' + i : i);
  /*if (nestedinner)*/ nestedinner = `<div${attribute} style="overflow: hidden; transition: height 200ms ease;"${branch.wrap ? ' class="is-collapsed"' : ''}>${nestedinner}</div>`;

  return inner + nestedinner;
 }

 GetRowInner(branch, attribute, depth)
 {
  if (branch.type === 'database') attribute += ` data-odid="${branch.id}"`;
  if (branch.type === 'view') attribute += ` data-odid="${branch.odid}" data-ovid="${branch.id}"`;
  let inner = `<table><tbody><tr>`;                                                                                                                      // Collect inner with <table> tag
  inner += `<td style="padding: 0 ${5 + ((depth - 1) * 7)}px;"${attribute}></td>`;                                                                       // Collect inner with 'margin' <td> tag via right-left padding 5, 12, 19..
  let name = branch.name.trim();
  if (!name) name = '&nbsp';
  name = name.toWellFormed();

  switch (branch.type)
         {
          case 'folder': 
               inner += `<td class="folder${branch.wrap === false ? 'un' : ''}wrapped"${attribute}>&nbsp</td>`;                                          // Folder icon
               inner += `<td class="sidebar_${branch.type}"${attribute} nowrap>${name}</td>`;                                                            // Folder name
               break;
          case 'database':
               inner += `<td class="database${branch.wrap === false ? 'un' : ''}wrapped${branch.content.length ? '' : 'empty'}"${attribute}>&nbsp</td>`; // Database icon
               inner += `<td class="sidebar_${branch.type}"${attribute} nowrap>${name}</td>`;                                                            // Database name
               break;
          case 'view':
               inner += `<td class="view"${attribute}>&nbsp</td>`;                                                                                        // View icon (od[branch.odid][branch.id]['status'])
               let footnote = this.od[branch.odid]['ov'][branch.id].footnote;
               footnote = footnote ? `&nbsp<span class="changescount">${footnote}</span>` : ``;
               inner += `<td class="sidebar_${branch.type}"${attribute} nowrap>${name}${footnote}</td>`;                                                  // View name
               break;
         }
  inner += `<td style="width: 100%;"${attribute}></td>`;                                                                                                  // Estamated space
  return inner + '</tr></tbody></table>';                                                                                                                 // Close inner with <table> tag
 }
}

const branchclasses = {
                       '.view': SVGUrlHeader(24, 24) + SVGRect(2, 2, 18, 18, 3, 105, 'RGB(15,105,153)', 'none', '4') + SVGUrlFooter() + ';', 
                       '.folderwrapped': SVGUrlHeader(24, 24) + SVGRect(6, 6, 15, 15, 3, '0 15 65', 'RGB(76,95,72)', 'none', '1') + SVGRect(3, 3, 14, 14, 3, 105, 'RGB(97,120,82)', 'RGB(97,120,82)', '1') + SVGUrlFooter() + ';',
                       '.folderunwrapped': SVGUrlHeader(24, 24) + SVGRect(6, 6, 15, 15, 3, '0 15 65', 'RGB(76,95,72)', 'none', '1') + SVGRect(2, 2, 15, 15, 3, 105, 'RGB(97,120,82)', 'none', '1') + SVGUrlFooter() + ';',
                       '.databaseunwrapped': `${SVGUrlHeader(24, 24)}${SVGPath('M6 12L18 12', 'rgb(97,120,82)', '4')}${SVGUrlFooter()};`,
                       '.databasewrapped': SVGUrlHeader(24, 24) + SVGPath('M6 12L18 12M12 6L12 18', 'rgb(97,120,82)', 4) + SVGUrlFooter() + ';',
                       '.databasewrappedempty': SVGUrlHeader(24, 24) +  SVGPath('M6 12L18 12M12 6L12 18', 'rgb(125,77,94)', 4) + SVGUrlFooter() + ';',
};

// function SVGRect(x, y, w, h, strength, dash, color, fill = 'none', rx = '4') // RGB(185,122,87) RGB(1,130,0) RGB(77,129,7) RGB(140,123,23) // dasharray='89% 105' https://yoksel.github.io/url-encoder/
for (const classname in branchclasses)
    {
     Sidebar.style[classname] = {};
     Sidebar.style[classname]['background-image'] = branchclasses[classname];
     Sidebar.style[classname]['background-repeat'] = 'no-repeat !important;';
     Sidebar.style[classname]['background-position'] = 'center;';
     Sidebar.style[classname]['background-color'] = 'transparent;';
     Sidebar.style[classname]['padding'] = '0px 10px;';
    }
