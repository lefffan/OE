// Todo  (undefined todo status) - deploy production via nginx reverse proxy (balancier) and other features in youtube channel YfD: https://www.youtube.com/watch?v=77h-_SytDhM
// Todo0 (necessary todo) - set secure server via https instead of http
// Todo1 (deffered todo)
// Todo2 (questionable todo) - correct server create due to https://ru.stackoverflow.com/questions/1144243/Как-написать-сервер-который-отдаёт-файлы-из-папки

import http from 'http';
import fs from 'fs';
import { GenerateRandomString, controller } from './main.js';
import { lg } from './main.js';

const staticdocs = {
    '/application.js': '/static/application.js',
    '/connection.js': '/static/connection.js',
    '/constant.js': '/static/constant.js',
    '/contextmenu.js': '/static/contextmenu.js',
    '/dialogbox.js': '/static/dialogbox.js',
    '/dropdownlist.js': '/static/dropdownlist.js',
    '/' : '/static/index.html',
    '/interface.js': '/static/interface.js',
    '/sidebar.js': '/static/sidebar.js',
   };

http.createServer(Connection).listen(8001);

function Connection(req, res)
{
 switch (req.method)
        {
         case 'GET':
              if (staticdocs[req.url])
                 {
                  res.writeHeader(200, req.url === '/' ? {'Content-Type': 'text/html'} : {'Content-Type': 'application/javascript'});
                  res.write(fs.readFileSync(import.meta.dirname + staticdocs[req.url], 'utf8'));
                 }
               else
                 {
                  res.writeHeader(400);
                 }
              res.end();  
              break;
         case 'POST':
              let postdata = '';
              req.on('data', (chunk) => { postdata += chunk.toString(); }); 
              req.on('end', () => { FromClient(postdata, res); }); 
              break;
        }
}

function FromClient(event, res)
{
 let response;
 event = JSON.parse(event);
 switch (event.type)
        {
         case 'LOGIN':
              res.writeHeader(200, {'Content-Type': 'application/json; charset=UTF-8'});
              // Todo0 - Compare here user/pass from event.username and event.password from corresponded ones in DB. If match, send back event 'WEBSOCKET' for the client connect wss or login error: response = { type: 'LOGINERROR' };
              if (!event.username || !event.password) response = { type: 'LOGINERROR', data: 'Wrong username or password!' };
               else response = { type: 'CREATEWEBSOCKET', username: event.username, userid: '0', protocol: 'ws', ip: '127.0.0.1', port: '8002', authcode: controller.AddClinetAuthCode(GenerateRandomString(12), 123) }; // Todo0 - set user id as a 2nd arg
              break;
        }
 res.write(JSON.stringify(response));
 res.end()
}