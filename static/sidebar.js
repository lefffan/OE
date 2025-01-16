import { SVGUrlHeader, SVGRect, SVGPath, SVGUrlFooter, lg } from './constant.js';
import { Interface } from './interface.js';
import { ContextMenu } from './contextmenu.js';

// Todo0 - predefined all classes: view0-100
// Todo0 - sorting (create time, alphabetical)
// Todo0 - insert comments for all code
// Todo0 - search among folders, views and dbs - [sorting root sidebar folder, minimize, fullscreen, lupa, some info (folder vews and db num, user)], hint for info icon
// Todo0 - Escape chars '<>' (or may be others) in OV/OD names

const WEIGHTS = { 'view': 1, 'database': 2, 'folder': 3 };
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

 constructor(data, parentchild) // (data, parentchild, props, attributes)
 {
  super(data, parentchild, { overlay: 'ALWAYSONTOP', control: { fullscreenicon: {}, minimizescreen: {}, fullscreendblclick: {}, resize: {}, resizex: {}, resizey: {}, drag: {}, default: { releaseevent: 'mouseup|mousedown' } } }, { class: 'defaultbox sidebar selectnone' });
  this.elementDOM.style.left = '50px';
  this.elementDOM.style.top  = '50px';
  this.od = [];
  this.tree = [{ sort: '', type: 'folder', wrap: false, name: 'Root folder', id: 0 }];
  this.folderid = 0;
  this.props.control.drag.elements = [this.elementDOM];
  this.props.control.fullscreendblclick.elements = [this.elementDOM];
  parentchild.CallController({ type: 'SIDEBARGET' });
 }

 destructor()
 {
  super.destructor();
 }

 SidebarSort(tree = this.tree, recursive = true)
 {
  if (tree[0].type === 'view' || tree.length < 2) return;

  tree.sort((a, b) => {
            if (!Array.isArray(a)) return -1;                                                            // First compared element is uplink database/folder? Return no place change
            if (!Array.isArray(b)) return 1;                                                             // Second compared element is uplink database/folder? Return place change
            if (WEIGHTS[a[0].type] - WEIGHTS[b[0].type]) return WEIGHTS[b[0].type] - WEIGHTS[a[0].type]; // First of all compare element types depending on their weights. Elements compared weights are non zero? Return it
            const compare = tree[0].sort.indexOf('a') === -1 ? (+a[0].id) - (+b[0].id) : a[0].name.localeCompare(b[0].name); // Appearance/alphabetical order
            return compare * (tree[0].sort.indexOf('^') === -1 ? 1 : -1);                                                    // Ascending/descending order
  });

  if (recursive) for (const i in tree) if (+i) this.SidebarSort(tree[i]);
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
           if ((type === 'folder' && tree[j][0].name === path[i]) || (type === 'database' && tree[j][0].id === odid) || (type === 'view' && tree[j][0].id === ovid && tree[j][0].odid === odid))
           if ((match = true) && (tree = tree[j])) break; // Set match case to true and current tree to matched one. Then break the cycle
       if (match)
          {
           tree[0].new = true;
           tree[0].name = path[i];
           continue;
          }
       // The cycle didn't result any matched subtrees, so add new folder subtree with the folder id to sort them on
       tree.push([ { new: true, sort: '', type: type, wrap: type === 'database' ? true : true, name: path[i], id: type === 'folder' ? this.folderid++ : type === 'view' ? ovid : odid, odid: odid } ]);
       if (type === 'database') this.od[odid] = { subtree: tree.at(-1), ov: {} }; // Overwrite OD list with current OD id with empty view list (OD is always added first)
       if (type === 'view' && this.od[odid]['ov'][ovid] === undefined) this.od[odid]['ov'][ovid] = { footnote: '' }; // The view doesn't exist. Add it to OD list
       tree = tree.at(-1); // Go to just created folder (next nested) subtree
      }
 }

 // Function removes empty subtrees - folders or databases (if odid exists). True function result signals upstream recursive call to slice current subtree
 RemoveEmptyFolders(tree, odid)
 {
  for (const i in tree)
      if (+i && this.RemoveEmptyFolders(tree[i], odid)) tree.splice(i, 1); // Remove folder/database content for recursive call true result

  if (tree[0].new) return (tree[0].new = undefined);                   // Database, view or folder are just created? Unset 'new' prop and return
  if (tree[0].type === 'folder') return tree.length < 2;               // Return true for empty folder (length < 2) and false for non empty
  if (tree[0].type === 'database' && tree[0].id === odid) return true; // Remove matched OD via true return
  if (tree[0].type === 'view' && tree[0].odid === odid) return true;   // Remove OV of matched OD via true return
 }

 SidebarShow()
 {
  this.inner = this.GetBranchInner(this.tree, 0);
  requestAnimationFrame(() => { 
                               this.elementDOM.innerHTML = this.inner;
                               for (const element of this.elementDOM.querySelectorAll('div')) this.GetDOMElementSubtree(element, 'DOMElement');
                              });
 }

 GetDOMElementSubtree(element, setelement)
 {
  let subtree;
  if (element.attributes['data-branch']?.value)
     {
      subtree = this.tree;
      for (const i of element.attributes['data-branch'].value.split('_')) subtree = subtree[i];
      if (setelement) subtree[0][setelement] = element;
     }
  return subtree;
 }

 Handler(event)
 {
  switch (event.type)
	    {
          case 'mousedown':							
               if (event.button === 0 && event.buttons === 3){} // Left button down with right button hold?
               break;
	     case 'mouseup':
               const subtree = this.GetDOMElementSubtree(event.target);
               if (event.button === 0)
                  {
                   if (!subtree?.[0] || subtree[0].type === 'view' || subtree.length < 2) break;
                   subtree[0].wrap = !subtree[0].wrap;
                   const element = subtree[0]['DOMElement'];
                   //this.isAnimating = true;
                   const wrappingfunction = function () {
                                                         subtree[0].wrap ? element.classList.add('is-collapsed') : element.classList.remove('is-collapsed');
                                                         if (subtree[0].wrap) element.style.height = '';
                                                         element.addEventListener('transitionend', function onTransitionEnd() {
                                                                                                                               element.removeEventListener('transitionend', onTransitionEnd);
                                                                                                                               if (!subtree[0].wrap) element.style.height = '';
                                                                                                                               const remove = subtree[0].wrap ? 'unwrapped' : 'wrapped';
                                                                                                                               const add = subtree[0].wrap ? 'wrapped' : 'unwrapped';
                                                                                                                               element.previousSibling.rows[0].cells[1].classList.remove(subtree[0].type + remove);
                                                                                                                               element.previousSibling.rows[0].cells[1].classList.add(subtree[0].type + add);
                                                                                                                               //this.isAnimating = false;
                                                                                                                              });
                                                        };
                   element.style.height = `${element.scrollHeight}px`;
                   OnDraw(wrappingfunction);
                   break;
                  }
               if (event.button === 2)
                  {
                   const contextmenuoptions = [['New Database'], , '', ['Help'], ['Logout']];
                   if (subtree?.[0].type === 'view') contextmenuoptions[1] = ['Open in a new view'];
                   if (subtree?.[0].type === 'database') contextmenuoptions[1] = ['Configure database'];
                   new ContextMenu(contextmenuoptions, this, event);
                   break;
                  }
               break;
          case 'CONTEXTMENU':
               if (event.data[0] === 'New Database') this.parentchild.CallController({type: 'New Database'});
               break;
          case 'SIDEBARSET': // { type: 'SIDEBARSET', odid:, path:, ov: { 1: [path1, path2..], 2: [..] } }
               this.SidebarAdd(event.path, event.odid);
               for (const ovid in event.ov) 
                   for (const path in event.ov[ovid]) 
                       this.SidebarAdd(event.ov[ovid][path], event.odid, ovid);
               this.RemoveEmptyFolders(this.tree, event.odid);
               this.SidebarSort();
               this.SidebarShow();
               break;
          case 'SIDEBARDELETE': // { type: 'SIDEBARDELETE', odid: } 
               this.RemoveEmptyFolders(this.tree, event.odid);
               this.SidebarSort();
               this.SidebarShow();
               break;
          case 'SIDEBARFOOTNOTE': // { type: 'SIDEBARFOOTNOTE', odid:, ovid:, value: }
               break;
          case 'SIDEBARLOAD': // { type: 'SIDEBARLOAD', odid:, ovid:, value: }
               break;
	    }
 }
 
 GetBranchInner(tree, depth, id = '')
 {
  let inner = '';
  let nestedinner = '';
  let attribute = ` data-branch="${id}"`;                                                                          // Fix tag attribute

  for (const branch in tree)
   if (branch === '0')
      {
       if (!depth) continue;                                                                                            // Do not display sidebar main root folder
       inner += `<table><tbody><tr>`;                                                                                         // Collect inner with <table> tag
       inner += `<td style="padding: 0 ${5 + ((depth - 1) * 7)}px;"${attribute}></td>`;                                 // Collect inner with 'margin' <td> tag via right-left padding 5, 12, 19..
       switch (tree[branch].type)
              {
               case 'folder': 
                    inner += `<td class="folder${tree[branch].wrap === false ? 'un' : ''}wrapped"${attribute}>&nbsp</td>`;   // Folder icon
                    inner += `<td class="sidebar_${tree[branch].type}"${attribute}>${tree[branch].name}</td>`; // Folder name
                    //inner += `<td class="arrow2" style="padding-right: 15px; background-color: transparent;"${attribute}></td>`; // Sort order
                    break;
               case 'database':
                    inner += `<td class="database${tree[branch].wrap === false ? 'un' : ''}wrapped${tree.length < 2 ? 'empty' : ''}"${attribute}>&nbsp</td>`; // Database icon
                    inner += `<td class="sidebar_${tree[branch].type}"${attribute}>${tree[branch].name}</td>`; // Database name
                    //inner += `<td class="rrow0" style="padding-left: 5px; background-color: transparent;"${attribute}></td>`; // Sort order
                    break;
               case 'view':
                    inner += `<td class="view100"${attribute}>&nbsp</td>`;                                                   // View icon (od[branch.odid][branch.id]['status'])
                    let footnote = this.od[tree[branch].odid]['ov'][tree[branch].id].footnote;
                    footnote = footnote ? `&nbsp<span class="changescount">${footnote}</span>` : ``;
                    inner += `<td class="sidebar_${tree[branch].type}"${attribute}>${tree[branch].name}${footnote}</td>`; // View name
                    break;
              }
       inner += `<td style="width: 100%;"${attribute}></td>`;                                                           // Estamated space
       inner += '</tr></tbody></table>';                                                                                        // Close inner with <table> tag
      }
    else
      {
       // Every non zero tree element is an array with its zero element (folder, database, view) to display as an independent table row, so recursive function call (args: increased depth, char '_' divided tree branch index) to get its inner
       nestedinner += this.GetBranchInner(tree[branch], depth + 1, depth ? id + '_' + branch : branch);
      }
  if (nestedinner) nestedinner = `<div${attribute} style="overflow: hidden; transition: height 300ms ease;"${tree[0].wrap ? ' class="is-collapsed"' : ''}>${nestedinner}</div>`;
  return inner + nestedinner;
 }
}

Sidebar.style['.view100'] = {
         "background-image": SVGUrlHeader(24, 24) + SVGRect(2, 2, 18, 18, 3, 105, 'RGB(15,105,153)', 'none', '4') + SVGUrlFooter() + ';',
         "background-repeat": `no-repeat !important;`,
         "background-position": `center;`,
         "background-color": `transparent;`,
         "padding": `0px 10px;`,
};

// function SVGRect(x, y, w, h, strength, dash, color, fill = 'none', rx = '4') // RGB(185,122,87) RGB(1,130,0) RGB(77,129,7) RGB(140,123,23) // dasharray='89% 105' https://yoksel.github.io/url-encoder/
Sidebar.style['.folderwrapped'] = {
     "background-image": SVGUrlHeader(24, 24) + SVGRect(6, 6, 15, 15, 3, '0 15 65', 'RGB(76,95,72)', 'none', '1') + SVGRect(3, 3, 14, 14, 3, 105, 'RGB(97,120,82)', 'RGB(97,120,82)', '1') + SVGUrlFooter() + ';',
     "background-repeat": `no-repeat !important;`,
     "background-position": `center;`,
     "background-color": `transparent;`,
     "padding": `0px 10px;`,
};
Sidebar.style['.folderunwrapped'] = {
     "background-image": SVGUrlHeader(24, 24) + SVGRect(6, 6, 15, 15, 3, '0 15 65', 'RGB(76,95,72)', 'none', '1') + SVGRect(2, 2, 15, 15, 3, 105, 'RGB(97,120,82)', 'none', '1') + SVGUrlFooter() + ';',
     "background-repeat": `no-repeat !important;`,
     "background-position": `center;`,
     "background-color": `transparent;`,
     "padding": `0px 10px;`,
};

Sidebar.style['.databaseunwrapped'] = {
     "background-image": `${SVGUrlHeader(24, 24)}${SVGPath('M6 12L18 12', 'rgb(97,120,82)', '4')}${SVGUrlFooter()};`,
     "background-repeat": `no-repeat !important;`,
     "background-position": `center;`,
     "background-color": `transparent;`,
     "padding": `0px 10px;`,
};

Sidebar.style['.databasewrapped'] = {
     "background-image": SVGUrlHeader(24, 24) + SVGPath('M6 12L18 12M12 6L12 18', 'rgb(97,120,82)', 4) + SVGUrlFooter() + ';',
     "background-repeat": `no-repeat !important;`,
     "background-position": `right;`,
     "background-color": `transparent;`,
     "padding": `0px 10px;`,
};

Sidebar.style['.databasewrappedempty'] = {
     "background-image": SVGUrlHeader(24, 24) +  SVGPath('M6 12L18 12M12 6L12 18', 'rgb(125,77,94)', 4) + SVGUrlFooter() + ';',
     "background-repeat": `no-repeat !important;`,
     "background-position": `center;`,
     "background-color": `transparent;`,
     "padding": `0px 10px;`,
};

