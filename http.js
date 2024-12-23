// Todo  (undefined todo status) - deploy production via nginx reverse proxy (balancier) and other features in youtube channel YfD: https://www.youtube.com/watch?v=77h-_SytDhM
// Todo0 (necessary todo) - responce for necessary js files only!
// Todo0 (necessary todo) - set secure server via https instead of http
// Todo1 (deffered todo)
// Todo2 (questionable todo) - correct server create due to https://ru.stackoverflow.com/questions/1144243/Как-написать-сервер-который-отдаёт-файлы-из-папки

import http from 'http';
import fs from 'fs';

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

http.createServer((req, res) =>
{
switch (req.method)
{
case 'GET':
   if (!staticdocs[req.url]) break;
     res.writeHeader(200, req.url === '/' ? {'Content-Type': 'text/html'} : {'Content-Type': 'application/javascript'});
     res.write(fs.readFileSync(__dirname + staticdocs[req.url], 'utf8'));
   res.end();
   return;
case 'POST':
   if (req.url !== '/') break;
     res.writeHeader(200, {'Content-Type': 'text/html'});
     res.write('huimya');
   res.end();
   return;
}
res.writeHeader(400);
res.end();
}).listen(8001);
