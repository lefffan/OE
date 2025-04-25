// Todo  (undefined todo status) - deploy production via nginx reverse proxy (balancier) and other features in youtube channel YfD: https://www.youtube.com/watch?v=77h-_SytDhM
// Todo0 (necessary todo) - set secure server via https instead of http
// Todo1 (deffered todo)
// Todo2 (questionable todo) - correct server create due to https://ru.stackoverflow.com/questions/1144243/Как-написать-сервер-который-отдаёт-файлы-из-папки

import http from 'http';
import fs from 'fs';
import { lg, controller } from './main.js';

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
    '/view.js': '/static/view.js',
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
              let msg = '';
              req.on('data', (chunk) => { msg += chunk.toString(); }); 
              req.on('end', () => { controller.MessageIn(msg, res); }); 
              break;
        }
}