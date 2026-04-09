import { Controller } from './controller.js';

const STATICDOCS    = { '/application.js': '/static/application.js', '/connection.js': '/static/connection.js', '/contextmenu.js': '/static/contextmenu.js', '/dialogbox.js': '/static/dialogbox.js', '/dropdownlist.js': '/static/dropdownlist.js', '/' : '/static/index.html', '/interface.js': '/static/interface.js', '/sidebar.js': '/static/sidebar.js', '/view.js': '/static/view.js', '/globals.js': '/globals.js' };
const HTTP          = { ip: '127.0.0.1', port: '8001', staticdocs: STATICDOCS };
const WS            = { ip: '127.0.0.1', port: '8002' };
const DB            = { defaultconfig: { host: '127.0.0.1', port: '5433', user: 'postgres', password: '123', database: 'postgres' }, adminconfig: { host: '127.0.0.1', port: '5433', user: 'postgres', password: '123', database: 'oe' } };

switch (process.argv[2])
       {
        case 'start':
             new Controller(HTTP, WS, DB);
             break;
        case 'reset':
             await new Controller(null, null, DB).Reset();
             process.exit(0);
        default:
             console.log(`Usage: ${process.argv[1]} start|reset`);
             process.exit(0);
       }