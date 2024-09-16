class SideBar extends Interface
{
 static style = {
                 ".sidebar": { "border": "none;", "background-color": "rgb(16,91,160);", "border-radius": "5px;", "color": "#9FBDDF;", "width": "13%;", "height": "90%;", "left": "4%;", "top": "5%;", "box-shadow": "4px 4px 5px #222;" },
                 ".unwrap": { "font-size": "70%;", "padding": "3px 8px;", "content": "", "background-repeat": "no-repeat !important;", "background-position": "center;", "background-size": "70% 70%;", "background-image": `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 5L21 12M21 12L14 19M21 12L3 12' stroke='green' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A");` },
                 ".wrap": { "font-size": "70%;", "padding": "3px 8px;", "content": "", "background-repeat": "no-repeat !important;", "background-position": "center;", "background-size": "70% 70%;", "background-image": `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 14L12 21M12 21L19 14M12 21L12 3' stroke='green' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A");` },
                 ".nowrap": { "font-size": "70%;", "padding": "3px 8px;", "content": "", "background-repeat": "no-repeat !important;", "background-position": "center;", "background-size": "70% 70%;", "background-image": `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 5L21 12M21 12L14 19M21 12L3 12' stroke='coral' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A");` },
                 ".itemactive": { "background-color": "#4578BF;", "color": "#FFFFFF;", "font": "1.1em Lato, Helvetica;" },

                 ".sidebar_branchicon": { "font-size": "70%;", "padding": "3px 8px;", "content": "", "background-repeat": "no-repeat !important;", "background-position": "center;", "background-size": "70% 70%;" },
                 ".sidebar_branchstatus": { "font-size": "70%;", "padding": "3px 8px;", "content": "", "background-repeat": "no-repeat !important;", "background-position": "center;", "background-size": "70% 70%;" },
                 ".sidebar tr:hover": { "background-color": "#3568AF;", "cursor": "pointer;" },
                 ".sidebar_folder": { "padding": "3px 5px 3px 0px;", "margin": "0px;", "color": "", "font": "1.3em Lato, Helvetica;"  },
                 ".sidebar_database": { "padding": "3px 5px 3px 0px;", "margin": "0px;", "color": "", "font": "1.2em Lato, Helvetica;"  },
                 ".sidebar_view": { "padding": "2px 5px 2px 10px;", "margin": "0px;", "color": "", "font": "1.1em Lato, Helvetica;" },
                 ".changescount": { "vertical-align": "super;", "padding": "2px 3px 2px 3px;", "color": "rgb(232,187,174);", "font": "0.6em Lato, Helvetica;", "background-color": "rgb(251,11,22);", "border-radius": "35%"},
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
  event = { type: 'SIDEBARSET', odid: 13, path: '/OD13', ov: { 1: ['test/view1a', 'view1b'], 2:['/hui/view2c', 'test/view2d']}};
  switch (event.type)
	     {
	      case 'mouseup':
               break;
          case 'SIDEBARSET': // event = { type: 'SIDEBARSET', odid:, ov{ovid}{pathid}: }
               this.SideBarAdd(event.path, event.odid);
               for (const ovid in event.ov) 
                   for (const path in event.ov[ovid]) 
                       this.SideBarAdd(event.ov[ovid][path], event.odid, ovid);

               RemoveEmptySubtrees(this.tree, event.odid);
               RemoveEmptySubtrees(this.tree);

               this.inner = this.GetBranchInner(this.tree, 0);
               requestAnimationFrame(() => this.elementDOM.innerHTML = this.inner);
               //this.ShowSideBar();
               break;
          case 'SIDEBARDELETE': // event = { type: 'SIDEBARDELETE', odid: } 
               RemoveEmptySubtrees(this.tree, event.odid);
               RemoveEmptySubtrees(this.tree);
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
      if (+i && RemoveEmptySubtrees(tree[i], odid)) tree.splice[i, 1];
 }

 GetBranchInner(tree, depth, id)
 {
  let inner = '';
  for (const branch in tree)
   if (branch === '0')
      {
       if (!depth) continue;
       let attribute = ` data-branch="${id}"`;
       inner += `<table><tr class="sidebar_${tree[branch].type}">`;
       inner += `<td${attribute}>${'&nbsp'.repeat(depth)}</td>`;
       inner += `<td class="sidebar_branchstatus"${attribute}></td>`;
       inner += `<td class="sidebar_branchicon"${attribute}></td>`;
       inner += `<td style="width: 100%;"${attribute}>${tree[branch].name}</td>`;
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
