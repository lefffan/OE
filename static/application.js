import { Interface } from './interface.js';
import { Connection } from './connection.js';
import { DialogBox } from './dialogbox.js';
import { ContextMenu } from './contextmenu.js';
import * as globals from './globals.js';

function GetStyleInnerHTML(customizations) //https://dev.to/karataev/set-css-styles-with-javascript-3nl5, https://professorweb.ru/my/javascript/js_theory/level2/2_4.php
{
 let inner = '';

 for (const customization in customizations)
 for (const selectorname in customizations[customization])
     {
      if (selectorname === '*' && !window.navigator.userAgent.includes('irefox')) continue; // Don't apply selector '*' with scrollbar props for non FireFox browsers. Specified scrolbar props in '*' break scrollbar settings for non FF browsers, so should be applied for fucking FF only
      if (selectorname[0] === ' ') continue; // CSS selectors with leading space are ignored and used as non css customization element
      const selector = customizations[customization][selectorname];
      inner += `${selectorname} {`;
      for (const prop in selector)
          if (prop[0] !== ' ' && selector[prop]) inner += `${prop}: ${selector[prop]}`; // Empty selector prop values are ignored. Props with leading space are ignored too, but its values are used as a hints for corresponded props in UI dialog configuration
      inner += '}';
     }

 return inner;
}

export class Application extends Interface
{
 // Creating application! Init global css style object and event counter, then add all mouse/keyboard event listeners and init event counter
 constructor()
 {
  const style = document.createElement('style');
  style.innerHTML = GetStyleInnerHTML(globals.CUSTOMIZATIONS);

  document.head.appendChild(style);
  const NICECOLORS = [ 'RGB(243,131,96);', 'RGB(247,166,138);', 'RGB(87,156,210);', 'RGB(50,124,86);', 'RGB(136,74,87);', 'RGB(116,63,73);', 'RGB(174,213,129);', 'RGB(150,197,185);' ];
  super({}, null, { tagName: 'BODY', control: { default: { releaseevent: 'mouseup', button: 2 } }, attributes: { style: `background-color: ${NICECOLORS[7]};` } });

  document.addEventListener('keydown', Interface.EventListener);
  document.addEventListener('keyup', Interface.EventListener);
  document.addEventListener('mousedown', Interface.EventListener);
  document.addEventListener('dblclick', Interface.EventListener);
  document.addEventListener('mouseup', Interface.EventListener);
  document.addEventListener('mousemove', Interface.EventListener);
  document.addEventListener('click', Interface.EventListener);
  document.addEventListener('contextmenu', (event) => event.preventDefault());
 }

 // Override main application child activation styling to exclude any effects for document.body as an 'Application' class DOM element
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
	      case 'HELP':
		  	   new DialogBox(globals.HELPDIALOG, event.source, JSON.parse(globals.MODALBOXPROPS), 'Help', undefined, '   OK   ');
			   break;
	      case 'CONTEXTMENU':
			   switch (event.data[0])	// Switch context item name (event data zero index)
			   		  {
					   case 'New connection':
			   				new Connection(null, this);	// Args: data, parent
							break;
					   case 'Help':
			   				//new DialogBox(globals.CUSTOMIZATIONDIALOG, this, JSON.parse(globals.MODALBOXPROPS));
			   				//new DialogBox(globals.EVENTPROFILINGDIALOG, this, JSON.parse(globals.MODALBOXPROPS));
                            return { type: 'HELP', destination: this };
					  }
		  	   break;
	     }
 }
}

export let app;
window.onload = function () { new Connection(null, app = new Application()); }; // Connection args: data, parent

// Application architecture:
// Todo1 - Make browser favicon more brighter and change it dinamycly to show unread msges presence
// Todo2 - Custom cursor div via css style * {cursor: none;}
// Todo0 - Make module based system, see Shemsetdinov justify src arch via require/import
// Todo0 - Parse all files from old app version in php
// Todo0 - app deploy (docker, zabbix-like) 
// Todo0 - Main goal is automize app configuration and fit that configuration to some template than can be easily set by the user
// Todo0 - removeEventListener func takes callback as a second arg. Is this arg correct when it looks like 'this.Handler.bind(this)'? Bind property creates a new link instance to the func with defined <this> every time, so removeEventListener doesn't know what to remove? Does it?
// Todo0 - Reports of OD data via native postgres functional, ask Slava what reports he does to Megacom Bosses and ask Rozbah what we do need for FSB and others
// 
// Presentation:
// Todo - Y-combinator practice:
//		  https://russol.info/kak-podat-zayavku-v-y-combinator-i-vyigrat
//		  https://vc.ru/life/96458-kak-my-pytalis-proiti-v-y-combinator-ot-zayavki-do-intervyu
//	      https://tass.ru/ekonomika/14542887
//		  https://rb.ru/longread/where-to-go-with-business-idea/
//		  https://vc.ru/flood/60006-kuda-startapu-poyti-za-nastavnikami-i-investorami-desyat-krupnyh-akseleratorov-rossii
// Todo - big amount of data with faster and quick perfomance
// Todo - data is native
// Todo - data constructor
// Todo - voting
// Todo - keep last twoversions
// Todo - don't add objects more than 100
// Todo - cell text is not writable in case of change from 'mark' to 'john', but not from 'john' to 'mark'
// Todo - to leave only last two versions create rule: delete from data_1 where id=:oid and version <= :postversion -2, odtable -> odid!

// Todo - Links and study:
//  https://node-postgres.com/apis/client
//  https://github.com/brianc/node-postgres/wiki/FAQ#14-how-do-i-install-pg-on-windows
//  Fix my project link https://github.com/lefffan/OE/blob/main/static/constant.js
//  https://yoksel.github.io/url-encoder/
//  https://postgrespro.ru/docs/postgresql/14/sql-commands
//  https://postgrespro.ru/docs/postgresql/14/datatype-datetime  https://postgrespro.ru/docs/postgrespro/9.5/functions-datetime
//  https://docs.timescale.com/use-timescale/latest/write-data/
//  https://eax.me/timescaledb/
//  https://eax.me/postgresql-triggers/
//  https://eax.me/timescaledb-caggs-implementation/
//  https://eax.me/tag/postgresql/page/2/
//  https://eax.me/postgresql-window-functions/
//  https://www.postgresql.org/docs/current/rules-materializedviews.html
//  https://docs.timescale.com/getting-started/latest/queries/
//  https://docs-timescale-com.translate.goog/getting-started/latest/queries/?_x_tr_sl=en&_x_tr_tl=ru&_x_tr_hl=ru&_x_tr_pto=rq&_x_tr_hist=true
//  https://docs.timescale.com/api/latest/hyperfunctions/histogram/
//  https://github.com/timescale/timescaledb/blob/main/tsl/README.md
//  https://docs.timescale.com/self-hosted/latest/install/installation-windows/
//  https://www.timescale.com
//  https://postgrespro.ru/docs/postgresql/14/sql-createtableas
//  https://postgrespro.ru/windows https://stackoverflow.com/questions/64439597/ways-to-speed-up-update-postgres-to-handle-high-load-update-on-large-table-is-i
//  https://www.crunchydata.com/blog/tuning-your-postgres-database-for-high-write-loads
//  https://serverfault.com/questions/117708/managing-high-load-of-a-postgresql-database
//  https://node-postgres.com/features/types
//  https://ru.stackoverflow.com/questions/1087780/javascriptcanvas-Построить-график-функции
//  https://ru.stackoverflow.com/questions/1431512/Построить-график-используя-json-данные-js
//  https://htmlacademy.ru/blog/js/canvas-chart
//  SVG animation: https://habr.com/ru/articles/450924/ https://habr.com/ru/articles/667116/ https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/animateTransform https://developer.mozilla.org/ru/docs/Web/SVG/Reference/Element/animate
//  Secure wss https://www.npmjs.com/package/ws#external-https-server
//  Study ws on Node https://github.com/websockets/ws?tab=readme-ov-file#how-to-detect-and-close-broken-connections
//  socket rate limit: https://javascript.info/websocket#rate-limiting
//  How to secure web socket connections: https://www.freecodecamp.org/news/how-to-secure-your-websocket-connections-d0be0996c556/
//  Node SNMP https://github.com/markabrahams/node-net-snmp old stuff: https://github.com/calmh/node-snmp-native
//  Node module import/export syntax https://www.w3schools.com/nodejs/nodejs_modules_esm.asp https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Statements/import
//  NodeJS highload https://www.youtube.com/watch?v=77h-_SytDhM
//  NodeJS multithread https://tproger.ru/translations/guide-to-threads-in-node-js
//  Multithread https://tproger.ru/translations/guide-to-threads-in-node-js see comments
//  scrypt from openssl (passwords hashing)
//  auth https://nodejsdev.ru/guides/webdraftt/jwt/ https://zalki-lab.ru/node-js-passport-jwt-auth/ https://habr.com/ru/companies/ruvds/articles/457700/ https://nodejsdev.ru/api/crypto/#_2


// Megacom appliance information systems:
// Todo - discuss how will megacom nodes/switches will be edited by L1 support? Via template card (application dialog with node name, ip, address.. etc)?
// Todo - add startel nodes
// Todo - discuss wich tabs to create as they are in our current mrtg. Left/right/N-Z/Fiziki?
// Todo - Discuss megacom user/groups and their rights
// Todo - Megacon MRTG System
//		  Link names for usual uplink, mpls uplink, switchport/vlps uplink, rezerv uplink..
// 		  Create MRTG OD with at least one view that shows nodes with zero clients, one client, etc..
// 		  Host/node elements: 1-100 ports (type uplink,downlink,free,service,client), 101 hostname or/and description, 102 hardware, 103 location, 104 ip, 105 Status(up/down).
//		  Should hardware-mac, node-number and checked-by-soa element be added?
// 		  diagnostic (pings, grafiki, port config, port errors, asr speed, mac, mac-vendor, cable diag, checkhost, name from billing), in node tree create mac search function for every switch in a tree
//		  For client port type display client name from billing
//		  Button to destruct client conf,int et 1/0/2,shut, no fl c, no band c,  sw mode acc,  sw acc vl 666,  speed aut, end,wr
//		  ping <switch ip>, on port ping <client ip>
//		  Ctrl+F12 - uplink tree from current object (any element)
//		  Alt+F12 - downlink tree from current object (any element)
//		  Shift+Ctrl+F12 - Map tree up from current object (any element)
//		  Shift+Alt+F12 - Map tree down from current object (any element)
//		  ALT+S - point to point tree (any element)
//		  ALT+H - history (any element)
//		  ALT+L - downlink tree client list (any element)
//		  F2, KEYPRESS - edit value for L2 only (any element)
//		  DEL - delete content via confirmation (any element)
//		  DBLCLICK - edit card dialog box for tehuchet, info, contacts, names, loaction.. (location element)
//		  DBLCLICK with ctrl|alt|shift for UPLOAD, DOWNLOAD, UNLOAD and ctrl+alt for GALLERY (location element)
//		  F12 port diagnostic - client grafic in realtime, and mrtg grafics (port element)
//		  INS edit hint, style and snmpindex (port element)
//		  DBLCLICK - edit card dialog box (port type selection[free|client|service|uplink|downlink]: free[description becpmes empty], client[zayavka-ip-speed-licevoi-name-address], service[description only], up|down[description+link property]) (port element)
//		  F12 host diagnostic - switch with port list with their links up or down (non-port element)
//		  INS hint, style + snmpgroup, for hardware element only (non-port element)
// Todo - Create corp chat with source code pass, image pass and some popular messanges features to make comfortable user dialogs. Apply emodzi pass also and see new features of mattermost (or other corp chat) new version
// Todo - Create corp addrbook, stuff list with foto, tel, dolzhnost. Tabel. Stuff vacations (otpusk). Grafik raboty
// Todo - Setki.xls (ip, name from TABELS, name from BILLING, mac for buhgalters and FSB, comment), every ip - comment, name from billing, name from mrtg, type, arp history[for FSB and buhgalters], ping) vendor, iz_zokii (ЗОКИИ - это значимый объект критической информационной инфраструктуры)
// Todo - tech uchet, Wiki
// Todo - Union some request apps (like Helpdesk or CRM) where one zayavka for helpdesk, podkluchenie, otkl, expluataciya.
//	      Develop helpdesk - how does object selection should calculate expired orders/requests? Versions date difference is more than three days?
//		  Ask Slava for HD analitycs
//		  Group some orders to one parent to have opportunity to close/change(status) all childs orders via one parent order. Or one order may have multiple clients?
//		  Order/requests reassignment to one person/department(otdel)
//		  Client order/requests history
//		  Automatic preload client data (switch, port, ip, geo addr, contacts) at order/request creation
// Todo - Alse some view examples to be released: request ip/subnet list at OV open via input dialog and display 'setki.xls' for these ips/subnets
//										          arp table history for one ip/mac
//                                                FSB request about our system ips perimetr, so every ip should have next types: client, service (web site, mail), system (ups, switch ip), net number, broadcast, free (if net number and broadcast are set correctly we can calc free nets)
//                                                BTV asked to parse all wifi-sms clients, or all Sberbank (or all clients) активные подключения
// Todo - Zabbix, Grafana, ACS, any accounting system (may be billing), any statistic/analitycs, Slavina adminka. See all these systems for new app functional
// Todo - Paraga mail functional  
// Todo - See analog: metabase/apache, superset, statsbot, looker, periscopedata