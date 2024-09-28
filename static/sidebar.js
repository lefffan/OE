// Todo0 - No sort icon for empty db
// Todo0 - predefined all classes: view0-100
// Todo0 - sorting
// Todo0 - wrapping
// Todo0 - comment
// Todo0 - footnote
// Todo0 - SIDEBARDELETE
// Todo0 - context menu
class SideBar extends Interface
{
 static style = {
                 ".sidebar": { "border": "none;", "background-color": "rgb(15,85,149);", "border-radius": "5px;", "color": "#9FBDDF;", "width": "13%;", "height": "90%;", "left": "4%;", "top": "5%;", "box-shadow": "4px 4px 5px #222;" },
                 ".changescount": { "vertical-align": "super;", "padding": "2px 3px 2px 3px;", "color": "rgb(232,187,174);", "font": "0.5em Lato, Helvetica;", "background-color": "rgb(125,77,94);", "border-radius": "35%"},
                 ".sidebar tr:hover": { "background-color": "#3568AF;", "cursor": "pointer;", "margin": "100px 100px;" },
                 ".sidebar_folder": { "color": "", "font": "1.8em Lato, Helvetica;", "padding": "8px 0;", "margin": "" },
                 ".sidebar_database": { "color": "", "font": "1.6em Lato, Helvetica;", "padding": "8px 0;", "margin": "" },
                 ".sidebar_view": { "color": "", "font": "1.1em Lato, Helvetica;", "padding": "4px 0;", "margin": "" },
                }

 destructor()
 {
  super.destructor();
 }

 // tree [ 
 //       { type:, sort:, wrapped:, name:, id:, odid:, DOMelement: },
 //       [ {...}, [] ],
 //       [ {...} ],
 //      ]
 // od[id] { subtree:, ov{id}: {footnote:, load:, status:} }
 SideBarAddTreeBranch(tree, type, name, odid, ovid)
 {
  switch (type)
         {
          case 'folder':
               for (const i in tree)
                   if (+i && tree[i][0].name === name && tree[i][0].type === type) return tree[i];
               tree.push([ { sort: '', type: 'folder', wrap: false, name: name, id: this.folderid++ } ]);
               break;
          case 'database':
               for (const i in tree)
                   if (+i && tree[i][0].name === name && tree[i][0].type === type && tree[i][0].id === odid && (tree[i][0].new = true)) return tree[i];
               tree.push([ { sort: '', type: 'database', wrap: true, name: name, id: odid, new: true } ]);
               this.od[odid] = { subtree: tree.at(-1), ov: {} };
               break;
          case 'view':
               for (const i in tree)
                   if (+i && tree[i][0].name === name && tree[i][0].type === type && tree[i][0].id === ovid && tree[i][0].odid === odid && (tree[i][0].new = true)) return tree[i];
               tree.push([ { type: 'view', name: name, id: ovid, odid: odid, new: true } ]);
               if (this.od[odid]['ov'][ovid] === undefined) this.od[odid]['ov'][ovid] = {};
               break;
         }

  return tree.at(-1);
 }

 SideBarAdd(path, odid, ovid)
 {
  let subtree = ovid === undefined ? this.tree : path[0] === '/' ? this.tree : this.od[odid].subtree;
  if (path[0] === '/') path = path.substring(1);
  path = path.split('/');
  for (const i in path)
      subtree = this.SideBarAddTreeBranch(subtree, +i === path.length - 1 ? (ovid === undefined ? 'database' : 'view') : 'folder', path[i], odid, ovid);
 }

 Handler(event)
 {
  switch (event.type)
	     {
           case 'New Database':
                this.connection.CallController(event);
                break;
	      case 'mouseup':
               if (event.which !== 3) break;
               const data = [['New Database'], '', ['Help'], ['Logout']];
               if (event.target.attributes['data-branch']?.value)
                  {
                   let subtree = this.tree;
                   for (const i of event.target.attributes['data-branch'].value.split('_')) subtree = subtree[i];
                   if (subtree[0].type === 'view') data.splice(1, 0, ['Open in a new view']);
                   if (subtree[0].type === 'database') data.splice(1, 0, ['Configure database']);
                  }
               new ContextMenu(data, this, event);
               break;
          case 'CONTEXTMENU':
               if (event.data[0] === 'New Database') this.parentchild.CallController({type: 'New Database'});
               break;
          case 'SIDEBARSET': // event = { type: 'SIDEBARSET', odid:, ov{ovid}{pathid}: }
               this.SideBarAdd(event.path, event.odid);
               for (const ovid in event.ov) 
                   for (const path in event.ov[ovid]) 
                       this.SideBarAdd(event.ov[ovid][path], event.odid, ovid);

               this.RemoveEmptySubtrees(this.tree, event.odid);
               this.RemoveEmptySubtrees(this.tree);

               this.inner = this.GetBranchInner(this.tree, 0);
               requestAnimationFrame(() => this.elementDOM.innerHTML = this.inner);
               //this.ShowSideBar();
               break;
          case 'SIDEBARDELETE': // event = { type: 'SIDEBARDELETE', odid: } 
               this.RemoveEmptySubtrees(this.tree, event.odid);
               this.RemoveEmptySubtrees(this.tree);
               break;
          case 'SIDEBARFOOTNOTE': // event = { type: 'SIDEBARFOOTNOTE', odid:, ovid:, value: }
               break;
          case 'SIDEBARLOAD': // event = { type: 'SIDEBARLOAD', odid:, ovid:, value: }
               break;
	     }
 }
 
 RemoveEmptySubtrees(tree, odid)
 {
  switch (tree[0].type)
         {
          case 'folder':
               if (tree === this.tree) break;
               if (odid === undefined && tree.length < 2) return true;
               break;
          case 'database':
               if (tree[0].new && !(tree[0].new = undefined)) break;
               if (tree[0].id === odid) return true;
               break;
          case 'view':
            if (tree[0].new && !(tree[0].new = undefined)) break;
               if (tree[0].odid === odid) return true;
               break;
         }
  for (const i in tree)
      if (+i && this.RemoveEmptySubtrees(tree[i], odid)) tree.splice(i, 1);
 }

 GetBranchInner(tree, depth, id)
 {
  let inner = '';
  for (const branch in tree)
   if (branch === '0')
      {
       if (!depth) continue;
       let attribute = ` data-branch="${id}"`;
       inner += `<table><tr">`;
       inner += `<td style="padding: 0 ${5 + ((depth - 1) * 7)}px;"${attribute}></td>`;                                // Depth margin
       switch (tree[branch].type)
              {
               case 'folder':
                    inner += `<td class="folder${tree[branch].wrap === false ? 'un' : ''}wrapped"${attribute}></td>`;   // Folder icon
                    break;
               case 'database':
                    inner += `<td class="database${tree[branch].wrap === false ? 'un' : ''}wrapped"${attribute}></td>`; // Database icon
                    break;
               case 'view':
                    inner += `<td class="view0"${attribute}></td>`;                                                     // View icon (od[branch.odid][branch.id]['status'])
                    break;
              }
       let footnote = tree[branch].type === 'view' ? '&nbsp<span class="changescount">987</span>' : '';
       inner += `<td class="sidebar_${tree[branch].type}"${attribute}>${tree[branch].name}${footnote}</td>`;            // Folder/database/view name
       if (tree[branch].type !== 'view') inner += `<td class="arrow0" style="padding-right: 15px; background-color: transparent;"${attribute}></td>`; // Sort order
       inner += `<td style="width: 100%;"${attribute}></td>`;                                                           // Estamated space
       inner += '</tr></table>';
      }
    else
      {
       inner += this.GetBranchInner(tree[branch], depth + 1, depth ? id + '_' + branch : branch);
      }
  return inner;
 }

 ShowSideBar()
 {
  this.elementDOM.innerHTML = this.GetBranchInner(this.tree, 0);
 }

 constructor(data, parentchild) // (data, parentchild, props, attributes)
 {
  super(data, parentchild, { }, {class: 'defaultbox sidebar selectnone' });
  this.elementDOM.style.left = '50px';
  this.elementDOM.style.top  = '50px';
  this.dragableElements.push(this.elementDOM);
  this.resizingElement = this.elementDOM;
  this.od = [];
  this.tree = [{ sort: '', type: 'folder', wrap: false, name: 'Root folder', id: 0 }];
  this.folderid = 0;
 }
}

SideBar.style['.view0'] = {
         "background-image": SVGUrlHeader() + SVGRect(2, 2, 18, 18, 3, 105, 'RGB(1,110,1)') + SVGRect(2, 2, 18, 18, 3, 65, 'RGB(1,150,1)') + SVGUrlFooter(),
         "background-repeat": `no-repeat !important;`,
         "background-position": `center;`,
         "background-color": `transparent;`,
         "padding": `0px 10px;`,
};
SideBar.style['.viewonline'] = {
     "background-image": SVGUrlHeader() + SVGRect(6, 6, 10, 10, 1, 105, 'RGB(185,122,87)', 'none', '2') + SVGUrlFooter(), //RGB(185,122,87) RGB(1,130,0)
     "background-repeat": `no-repeat !important;`,
     "background-position": `center;`,
     "background-color": `transparent;`,
     "padding": `0px 10px;`,
};

SideBar.style['.folderwrapped'] = {
     "background-image": SVGUrlHeader() + SVGRect(2, 2, 15, 15, 3, 105, 'RGB(77,129,7)', 'RGB(77,129,7)', '2') + SVGRect(6, 6, 15, 15, 2, 105, 'RGB(77,129,7)', 'none', '3') + SVGUrlFooter(),
     "background-repeat": `no-repeat !important;`,
     "background-position": `center;`,
     "background-color": `transparent;`,
     "padding": `0px 10px;`,
};
SideBar.style['.folderunwrapped'] = {
     "background-image": SVGUrlHeader() + SVGRect(0, 0, 18, 18, 2, 105, 'RGB(140,123,23)', 'none', '2') + SVGRect(4, 4, 18, 18, 2, '0 15 65', 'RGB(140,123,23)', 'none', '2') + SVGUrlFooter(),
     "background-repeat": `no-repeat !important;`,
     "background-position": `center;`,
     "background-color": `transparent;`,
     "padding": `0px 10px;`,
};

SideBar.style['.databaseunwrapped'] = {
     "background-image": SVGUrlHeader() +  SVGPath('M6 12L18 12', 'rgb(1,130,1)', '6') + SVGUrlFooter(),
     "background-repeat": `no-repeat !important;`,
     "background-position": `center;`,
     "background-color": `transparent;`,
     "padding": `0px 10px;`,
};

SideBar.style['.databasewrapped'] = {
     "background-image": SVGUrlHeader() +  SVGPath('M6 12L18 12M12 6L12 18', 'rgb(97,120,82)', 5) + SVGUrlFooter(),
     "background-repeat": `no-repeat !important;`,
     "background-position": `center;`,
     "background-color": `transparent;`,
     "padding": `0px 10px;`,
};

SideBar.style['.databasewrappedempty'] = {
     "background-image": SVGUrlHeader() +  SVGPath('M6 12L18 12M12 6L12 18', 'rgb(125,77,94)', 5) + SVGUrlFooter(),
     "background-repeat": `no-repeat !important;`,
     "background-position": `center;`,
     "background-color": `transparent;`,
     "padding": `0px 10px;`,
};

function SVGUrlHeader(viewwidth = 24, viewheight = 24)
{
 return `url("data:image/svg+xml,%3Csvg viewBox='0 0 ${viewwidth} ${viewheight}' xmlns='http://www.w3.org/2000/svg'%3E`;
}

function SVGUrlFooter()
{
 return `%3C/svg%3E");`;
}

function SVGRect(x, y, w, h, strength, dash, color, fill = 'none', rx = '4')
{
 const disp = Math.round(strength/2);
 x += disp;
 y += disp;
 h -= disp * 2;
 w -= disp * 2;
 return `%3Crect pathLength='99' stroke-width='${strength}' fill='${fill}' stroke='${color}' x='${x}' y='${y}' width='${w}' height='${h}' rx='${rx}' stroke-dasharray='${dash} 100' /%3E`;
}

function SVGPath(path, color, width)
{
 return `%3Cpath d='${path}' stroke='${color}' stroke-width='${width}' stroke-linecap='round' stroke-linejoin='round' /%3E`;
}