style.innerHTML = GetStyleInnerHTML(App.style, DialogBox.style, ContextMenu.style, SideBar.style, window.navigator.userAgent.indexOf('irefox') === -1 ? '' : { "*": { "scrollbar-width": "thin;", "scrollbar-color": "rgba(55, 119, 204, 0.3) rgba(255, 255, 255, 0);" } });
document.head.appendChild(style);
window.onload = function () { app = new App(); }
