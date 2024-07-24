let app; // Create application
const style = document.createElement('style'); // Style default user GUI and append style DOM element to the document head
style.innerHTML = GetStyleInnerHTML(DialogBox.style, ContextMenu.style, window.navigator.userAgent.indexOf('irefox') === -1 ? '' : { "*": { "scrollbar-width": "thin;", "scrollbar-color": "rgba(55, 119, 204, 0.3) rgba(255, 255, 255, 0);" } });
document.head.appendChild(style);
window.onload = function() { app = new App({}, null, {tagName: 'BODY'}, {style: 'background-color: #343e54;'}); } // Init application