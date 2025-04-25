import { SVGUrlHeader, SVGRect, SVGPath, SVGUrlFooter, SVGCircle, lg, CutString } from './constant.js';
import { Interface } from './interface.js';
import { ContextMenu } from './contextmenu.js';

// Todo - OV description as a hint on taskbar OV navigation
// Todo0 - Highlight clicked result, hint every branch in search result with its full path
// Todo0 - insert comments for all code
// Todo0 - new sidebar control to hint folder/vew/db number or user and hints for every sidebar control
// Todo0 - Escape chars '<>' (or may be others) in OV/OD names
// Todo0 - Global func to return background svg for up/down arrows with user defined color
// Todo0 - Do not place global css style props starting with space/underline char to user customization dialog, so dialog arrows classes from index.html will be replaced to dialogbox.js module
// Todo0 - Make sidebar icon twice bigger and lupa icon is painted with the color while searching
// Todo1 - Make universal 'flag' function to manage flags in one place and implement it to sidebar
// Todo0 - Search bar display/remove via lupa push should be without sidebar redraw blinking

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
                }

 SearchSort()
 {
  this.search.tree.sort((a, b) => {
                                   if (WEIGHTS[a[0].type] - WEIGHTS[b[0].type]) return WEIGHTS[b[0].type] - WEIGHTS[a[0].type]; // First of all compare element types depending on their weights. Elements compared weights are non zero? Return it
                                   const sortstring = this.search.sort;
                                   const compare = sortstring.indexOf('a') === -1 ? (+a[0].id) - (+b[0].id) : a[0].name.localeCompare(b[0].name); // Appearance/alphabetical order
                                   return compare * (sortstring.indexOf('^') === -1 ? 1 : -1);                                                    // Ascending/descending order
                                  });
 }

 SearchShow()
 {
  let inner = '';
  for (const tree of this.search.tree) inner += this.GetRowInner(tree);
  requestAnimationFrame(() => { this.search.result.innerHTML = inner; });
 }

 SidebarSort(sortstring, tree = this.tree)
 {
  if (tree[0].type === 'view' || tree.length < 2) return;

  tree.sort((a, b) => {
            if (!Array.isArray(a)) return -1;                                                            // First compared element is uplink database/folder? Return no place change
            if (!Array.isArray(b)) return 1;                                                             // Second compared element is uplink database/folder? Return place change
            if (WEIGHTS[a[0].type] - WEIGHTS[b[0].type]) return WEIGHTS[b[0].type] - WEIGHTS[a[0].type]; // First of all compare element types depending on their weights. Elements compared weights are non zero? Return it
            const compare = sortstring.indexOf('a') === -1 ? (+a[0].id) - (+b[0].id) : a[0].name.localeCompare(b[0].name); // Appearance/alphabetical order
            return compare * (sortstring.indexOf('^') === -1 ? 1 : -1);                                                    // Ascending/descending order
  });

  for (const i in tree) if (+i) this.SidebarSort(sortstring, tree[i]);
 }

 SetSortIcon(sortsting)
 {
  let arrowindex = 0;
  if (sortsting.indexOf('a') !== -1) arrowindex += 2;
  if (sortsting.indexOf('^') !== -1) arrowindex += 1;
  this.props.control.sorticon.icon = ARROW[arrowindex];
  this.RefreshControlIcons();
 }

 static Sort(userevent, control, phase)
 {
  if (phase !== 'release') return;
  const sortobject = control.child.tree[0].wrap ? control.child.search : control.child.tree[0];
  sortobject.sort.indexOf('^') === -1 ? sortobject.sort += '^' : sortobject.sort = sortobject.sort.indexOf('a') === -1 ? (sortobject.sort + 'a').replaceAll(/\^/g, '') : sortobject.sort.replaceAll(/a|\^/g, '');

  control.child.SetSortIcon(sortobject.sort);
  if (control.child.tree[0].wrap)
     {
      control.child.SearchSort();
      control.child.SearchShow();
     }
   else
     {
      control.child.SidebarSort(sortobject.sort);
      control.child.SidebarShow();
     }
 }

 SearchTree(search, regexp, tree = this.tree)
 {
  let result = [];
  for (const branch in tree)
      {
       if (branch === '0') if (tree !== this.tree) if ((regexp && regexp.test(tree[branch].name)) || (!regexp && tree[branch].name.indexOf(search) !== -1)) result.push(tree);
       if (branch !== '0') result = result.concat(this.SearchTree(search, regexp, tree[branch]));
      }
  return result;
 }

 static Lupa(userevent, control, phase)
 {
  if (phase === 'search')
     {
      const searchstring = control.child.search.input.value;
      if (!searchstring && !(control.child.search.result.innerHTML = '')) return;              // Empty result for empty search string
      let regexp;
      const secondslash = searchstring.lastIndexOf('/');                                       // Get second slash position
      try {
           if (searchstring[0] === '/' && secondslash > 0) regexp = new RegExp(searchstring.substring(1, secondslash), searchstring.substring(secondslash + 1));     // First slash at first char and second slash position more than zero? Create regular expression
          }
      catch
          {
          }
      control.child.search.tree = control.child.SearchTree(searchstring, regexp);
      control.child.SearchSort();
      control.child.SearchShow();
      return;
     }
  if (phase !== 'release') return;     // For 'release' phase only at left mouse btn released
  control.data = !control.data;        // Invert search bar appearance
  if (control.child.tree[0].wrap = control.data) // Search bar is hidden, so show it
     {
      control.child.elementDOM.appendChild(control.child.search.container);
      control.child.elementDOM.appendChild(control.child.search.result);
      control.child.search.container.appendChild(control.child.search.input);
      control.child.search.input.addEventListener('input', control.child.Handler.bind(control.child));
      control.child.SetSortIcon(control.child.search.sort);
      Sidebar.Lupa(null, control, 'search');
      setTimeout(() => control.child.search.input.focus(), 0);
     }
   else // Search bar is on, so remove it
     {
      control.child.search.input.removeEventListener('input', control.child.Handler.bind(control.child));
      control.child.search.container.remove();
      control.child.search.result.remove();
      control.child.SetSortIcon(control.child.tree[0].sort);
     }
  control.child.ToggleSubtreeWrap();
 }

 constructor(data, parentchild) // (data, parentchild, props, attributes)
 {
  const sortcontrol = { captureevent: 'mousedown', releaseevent: 'mouseup', area: {x1: -14, y1: 2, x2: -3, y2: 13}, cursor: 'pointer', icon: ARROW[0], data: '', callback: [Sidebar.Sort] };
  const lupacontrol = { captureevent: 'mousedown', releaseevent: 'mouseup', area: {x1: -14, y1: 2, x2: -3, y2: 13}, cursor: 'pointer', icon: LUPA, callback: [Sidebar.Lupa] };
  const control = { fullscreenicon: {}, minimizescreen: {}, sorticon: sortcontrol, lupaicon: lupacontrol, resize: {}, resizex: {}, resizey: {}, drag: {}, default: { releaseevent: 'mouseup|mousedown|keyup' } };
  super(data, parentchild, { overlay: 'ALWAYSONTOP', control: control }, { class: 'defaultbox sidebar selectnone' });
  // Set some props
  this.username = parentchild.username;
  this.elementDOM.style.left = '50px';
  this.elementDOM.style.top  = '50px';
  this.od = [];
  this.tree = [{ sort: '', type: 'folder', wrap: false, name: 'Root folder', id: 0 }];
  this.folderid = 0;
  this.props.control.drag.elements = [this.elementDOM];
  // Get database/view list
  parentchild.CallController({ type: 'SIDEBARGET' });
  // Create search object
  this.search = { sort: '', container: document.createElement('div'), input: document.createElement('input'), result: document.createElement('div') };
  this.search.container.style.padding = '0 5px';
  this.search.input.classList.add('newprofileinput');
  this.search.input.setAttribute('placeholder', 'Type here to search the view');
 }

 destructor()
 {
  super.destructor();
 }

 // tree [ 
 //       { type:, sort:, wrapped:, name:, id:, odid:, DOMElement},
 //       [ {...}, [] ],
 //       [ {...} ],
 //      ]
 // this.od[id] { subtree:, ov{id}: {footnote:, load:, status:} }
 // Add database (OD) or view (OV). View id (ovid) is undefined for OD
 SidebarAdd(path, odid, ovid)
 {
  let tree = ovid === undefined ? this.tree : path[0] === '/' ? this.tree : this.od[odid].subtree;              // Database is added first, so all its views with relative paths have its database folder as a root folder. Var <tree> (actually root folder) for OD or OV with leading slash is this.tree, for OV without leading slash - database folder
  if (path[0] === '/') path = path.substring(1);                                                                // Root folder is defined, so make all paths relative via removing leading slash if exist
  path = path.split('/');                                                                                       // Split path string

  for (const i in path)
      {
       const type = +i === path.length - 1 ? (ovid === undefined ? 'database' : 'view') : 'folder';             // Calculate splited path element type - database, view, folder
       let match;
       for (const j in tree)
           if (+j && tree[j][0].type === type) // Go through all non zero tree elements for the type <type> and search match case. For folder match case is a name match, for a database - odid match, for a view - odid and ovid
           //if ((type === 'folder' && tree[j][0].name === path[i]) || (type === 'database' && tree[j][0].id === odid) || (type === 'view' && tree[j][0].id === ovid && tree[j][0].odid === odid))
           if ((type === 'folder' && tree[j][0].name === path[i]) || (type === 'database' && tree[j][0].id === odid)) // Should not check duplicated view names by line above
              if ((match = true) && (tree = tree[j])) break; // Set match case to true and current tree to matched one. Then break the cycle
       if (match)
          {
           tree[0].new = true;
           tree[0].name = path[i];
           continue;
          }
       // The cycle didn't result any matched subtrees, so add new folder subtree with the folder id to sort them on
       tree.push([ { new: true, type: type, wrap: type === 'database' ? true : true, name: path[i], id: type === 'folder' ? this.folderid++ : type === 'view' ? ovid : odid, odid: odid } ]);
       if (type === 'database') this.od[odid] = { subtree: tree.at(-1), ov: {} }; // Overwrite OD list with current OD id with empty view list (OD is always added first)
       if (type === 'view' && this.od[odid]['ov'][ovid] === undefined) this.od[odid]['ov'][ovid] = { footnote: '' }; // The view doesn't exist. Add it to OD list
       tree = tree.at(-1); // Go to just created folder (next nested) subtree
      }
 }

 // Function removes empty subtrees - folders or databases (if odid exists). True function result signals upstream recursive call to slice current subtree
 // tree [ 
 //       { type:, sort:, wrapped:, name:, id:, odid:, DOMElement},
 //       [ {...}, [] ],
 //       [ {...} ],
 //      ]
 RemoveEmptyFolders(tree, odid)
 {
  for (let i = 0; i < tree.length; i++)
      if (+i && this.RemoveEmptyFolders(tree[i], odid)) tree.splice(i--, 1); // Remove folder/database content for recursive call true result

  if (tree[0].new) return (tree[0].new = undefined);                   // Database, view or folder are just created? Unset 'new' prop and return
  if (tree[0].type === 'folder') return tree.length < 2;               // Return true for empty folder (length < 2) and false for non empty
  if (tree[0].type === 'database' && tree[0].id === odid) return true; // Remove matched OD via true return
  if (tree[0].type === 'view' && tree[0].odid === odid) return true;   // Remove OV of matched OD via true return
 }

 SidebarShow()
 {
  if (this.tree[0].wrap) return;                  // Sidebar structure is wrapped (search input is activated), so do not display it
  this.inner = this.GetBranchInner(this.tree, 0);
  requestAnimationFrame(() => { 
                               this.elementDOM.innerHTML = this.inner;
                               for (const element of this.elementDOM.querySelectorAll('div')) this.GetDOMElementSubtree(element, 'DOMElement');
                              });
 }

 GetDOMElementSubtree(element, setelement)
 {
  if (element.attributes['data-branch'] === undefined) return;
  let subtree = this.tree;
  if (element.attributes['data-branch'].value) for (const i of element.attributes['data-branch'].value.split('_')) subtree = subtree[i];
  if (setelement) subtree[0][setelement] = element;
  return subtree;
 }

 ToggleSubtreeWrap(tree = this.tree)
 {
  const element = tree[0]['DOMElement'];
  const wrappingfunction = function () { // Source - https://habr.com/ru/articles/475520/
                                        tree[0].wrap ? element.classList.add('is-collapsed') : element.classList.remove('is-collapsed');
                                        if (tree[0].wrap) element.style.height = '';
                                        element.addEventListener('transitionend', function onTransitionEnd() {
                                                                                                              element.removeEventListener('transitionend', onTransitionEnd);
                                                                                                              if (!tree[0].wrap) element.style.height = '';
                                                                                                              if (!element.previousSibling?.rows) return;
                                                                                                              const remove = tree[0].wrap ? 'unwrapped' : 'wrapped';
                                                                                                              const add = tree[0].wrap ? 'wrapped' : 'unwrapped';
                                                                                                              element.previousSibling.rows[0].cells[1].classList.remove(tree[0].type + remove);
                                                                                                              element.previousSibling.rows[0].cells[1].classList.add(tree[0].type + add);
                                                                                                             });
                                       };
  element.style.height = `${element.scrollHeight}px`;
  OnDraw(wrappingfunction);
 }

 Handler(event)
 {
  switch (event.type)
	    {
          case 'keyup':
               if (event.code === 'Escape' && this.props.control.lupaicon.data) Sidebar.Lupa(null, this.props.control.lupaicon, 'release');
               break;
          case 'input':
               clearTimeout(this.search.timer);
               this.search.timer = setTimeout(Sidebar.Lupa, 300, null, this.props.control.lupaicon, 'search'); 
               break;
          case 'mousedown':							
               if (event.button === 0 && event.buttons === 3){} // Left button down with right button hold?
               break;
	     case 'mouseup':
               const subtree = this.GetDOMElementSubtree(event.target);
               if (event.button === 0)
                  {
                   if (!subtree?.[0]) break;
                   if (subtree[0].type === 'view')
                      {
                       this.parentchild.CallController({ type: 'GETVIEW', data: { odid: subtree[0].odid, ovid: subtree[0].id } });
                       break;
                      }
                   if (subtree.length < 2) break;
                   subtree[0].wrap = !subtree[0].wrap;
                   this.ToggleSubtreeWrap(subtree);
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
               this.RemoveEmptyFolders(this.tree, event.data.odid);
               this.SidebarSort(this.tree[0].sort);
               this.SidebarShow();
               break;
          case 'SIDEBARDELETE': // { type: 'SIDEBARDELETE', data: { odid: } } 
               this.RemoveEmptyFolders(this.tree, event.data.odid);
               this.SidebarSort(this.tree[0].sort);
               this.SidebarShow();
               break;
          case 'SIDEBARFOOTNOTE': // { type: 'SIDEBARFOOTNOTE', odid:, ovid:, value: }
               break;
          case 'SIDEBARLOAD': // { type: 'SIDEBARLOAD', odid:, ovid:, value: }
               break;
	    }
 }
 
 GetRowInner(tree, attribute = '', depth = 1)
 {
  if (tree[0].type === 'database') attribute += ` data-odid="${tree[0].id}"`;
  if (tree[0].type === 'view') attribute += ` data-odid="${tree[0].odid}" data-ovid="${tree[0].id}"`;
  let inner = `<table><tbody><tr>`;                                                                                                                   // Collect inner with <table> tag
  inner += `<td style="padding: 0 ${5 + ((depth - 1) * 7)}px;"${attribute}></td>`;                                                                    // Collect inner with 'margin' <td> tag via right-left padding 5, 12, 19..
  let name = tree[0].name.trim();
  if (!name) name = '&nbsp';
  name = name.toWellFormed();

  switch (tree[0].type)
         {
          case 'folder': 
               inner += `<td class="folder${tree[0].wrap === false ? 'un' : ''}wrapped"${attribute}>&nbsp</td>`;                                      // Folder icon
               inner += `<td class="sidebar_${tree[0].type}"${attribute} nowrap>${name}</td>`;                                                        // Folder name
               break;
          case 'database':
               inner += `<td class="database${tree[0].wrap === false ? 'un' : ''}wrapped${tree.length < 2 ? 'empty' : ''}"${attribute}>&nbsp</td>`;   // Database icon
               inner += `<td class="sidebar_${tree[0].type}"${attribute} nowrap>${name}</td>`;                                                        // Database name
               break;
          case 'view':
               inner += `<td class="view"${attribute}>&nbsp</td>`;                                                                                    // View icon (od[branch.odid][branch.id]['status'])
               let footnote = this.od[tree[0].odid]['ov'][tree[0].id].footnote;
               footnote = footnote ? `&nbsp<span class="changescount">${footnote}</span>` : ``;
               inner += `<td class="sidebar_${tree[0].type}"${attribute} nowrap>${name}${footnote}</td>`;                                             // View name
               break;
         }
  inner += `<td style="width: 100%;"${attribute}></td>`;                                                                                              // Estamated space
  return inner + '</tr></tbody></table>';                                                                                                             // Close inner with <table> tag
 }

 GetBranchInner(tree, depth, id = '')
 {
  let inner = '';
  let nestedinner = '';
  let attribute = ` data-branch="${id}"`; // Fix tag attribute

  for (const branch in tree)
      {
       if (branch === '0') if (depth) inner += this.GetRowInner(tree, attribute, depth);
       // Every non zero tree element is an array with its zero element (folder, database, view) to display as an independent table row, so recursive function call (args: increased depth, char '_' divided tree branch index) to get its inner
       if (branch !== '0') nestedinner += this.GetBranchInner(tree[branch], depth + 1, depth ? id + '_' + branch : branch);
      }
  if (nestedinner) nestedinner = `<div${attribute} style="overflow: hidden; transition: height 200ms ease;"${tree[0].wrap ? ' class="is-collapsed"' : ''}>${nestedinner}</div>`;
  return inner + nestedinner;
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
