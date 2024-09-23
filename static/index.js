style.innerHTML = GetStyleInnerHTML(App.style, DialogBox.style, ContextMenu.style, SideBar.style, window.navigator.userAgent.indexOf('irefox') === -1 ? '' : { "*": { "scrollbar-width": "thin;", "scrollbar-color": "rgba(55, 119, 204, 0.3) rgba(255, 255, 255, 0);" } });
document.head.appendChild(style);
//window.onload = function () { app = new App({}, null, { tagName: 'BODY' }, { style: 'background-color: #343e54;' }); } // Init application, ${nicecolors[7]
window.onload = function () { app = new App({}, null, { tagName: 'BODY' }, { style: `background-color: ${nicecolors[7]};` }); } // Init application, ${nicecolors[7]
