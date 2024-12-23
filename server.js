// Todo0 - NodeJS highload https://www.youtube.com/watch?v=77h-_SytDhM
// Todo0 - Multithread https://tproger.ru/translations/guide-to-threads-in-node-js see comments
// Todo0 - scrypt from openssl (passwords hashing)
// Todo0 - auth https://nodejsdev.ru/guides/webdraftt/jwt/ https://zalki-lab.ru/node-js-passport-jwt-auth/ https://habr.com/ru/companies/ruvds/articles/457700/ https://nodejsdev.ru/api/crypto/#_2

import {} from './http.js';
import {} from './wss.js';
import {DatabaseBroker} from './databasebroker.js';

// auth= '{ userid:, sessionid:, expire:, sign: }', where sign is a hash (HMAC-SHA256) with a password (wich is stored specifically in server internal memory) of client LOGIN data: ip, fingerprint (user-agent and other specific data), userid and expire.
// auth token may be store in LS (so page reload doesn't call relogin) or in client app memory (page reload calls relogin), auth token is no encrypted, but cannot be faked due to its sign compared on server side
// Should i send keepalive events (last client event generates setTimeout (60*1000) for keepalive event post) from client side to exclude session timeout and 
// +--------+                                            +------------+                                   +---------+                                     
// |        |  case No Auth Token:  		    		 |            |                               ... |         |                
// |        |  {type LOGIN, user, pass} (POST) -> 	 	 |            |                               ... |         |                
// |        |                      <- {type TOKEN, auth} |            |                                   |         |                
// |        |                        <- {type WRONGPASS} |            |                                   |         |                
// |        |                                     		 |            |                                   |         |                
// |        |  case Auth Token with no WS:        		 |            |                               ... |         |                
// |        |  {type GETWS, auth} (POST) ->				 |            |                               ... |         |                
// |        |                  <- {type SETWS, ip, port} |            |                                   |         |                
// |        |        		 <- {type: 'UNAUTH|EXPIRED'} |            |                                   |         |                
// |        |                                     		 |            |                                   |         |                
// |        |  case Auth Token with WS: 	       		 |            |                               ... |         |                
// |        |  {type <any-event>, auth} (WS)			 |            |                               ... |         |                
// |        |        		 <- {type: 'UNAUTH|EXPIRED'} |            |                                   |         |                
// |        |                                     		 |            |                                   |         |                
// |        |  case Auth Token with/out WS:        		 |            |                                   |         |                
// |        |  {type LOGOUT, auth}                		 |            |                               ... |         |                
// |        |                                     		 |            |                               ... |         |                
// |        | User events STEP1--->                      |            | User events STEP2--->             |         |                
// |        |   Context menu (INIT|DELETE)               |            |   ---||---                        |         |                
// |        |   Confirmation (CONFIRM|CONFIRMDIALOG)     |            | Controller event:                 |         |                
// |        |   Mouse and keyboard	 	        		 |            |   SCHEDULE                        |         |                
// |        |   Sidebar (RELOAD, NEWOD)	        		 |            |                                   |         |                
// |        |                                     		 |            |    <---STEP3 Handler system calls |         |                
// |        |                                     		 |            |                               SET |         |                
// |        |                                     		 |            |                             RESET |         |                
// |        |                                     		 |            |                            UPDATE |         |                
// |        |                                     		 |            |                               PUT |         |                
// |        |                                     		 |            |                            DIALOG |         |                
// |        |                                     		 |            |                              EDIT |         |                
// | Client |                                		     | Controller |                          	 CALL | Handler |                
// |        |                                     		 |            |                             ALERT |         |                
// |        |                                     		 |            |                                   |         |                
// |        |                                     		 |            | Controller event STEP4--->        |         |                
// |        |                                     		 |            |   ONCHANGE                        |         |                
// |        |                                     		 |            |                                   |         |                
// |        |                                     		 |            |    <---STEP5 Handler system calls |         |                
// |        |                                     		 |            |                               ... |         |                
// |        |                                     		 |            |                                   |         |                
// |        |              <---STEP6 Controller commands |            |                                   |         |                
// |        |                                        SET |            |                                   |         |                
// |        |                                     DIALOG |            |                                   |         |                
// |        |                                       EDIT |            |                                   |         |                
// |        |                                       VIEW |            |                                   |         |                
// |        |                                  NEWOBJECT |            |                                   |         |                
// |        |                               DELETEOBJECT |            |                                   |         |                
// |        |                                     		 |            |                                   |         |                
// +--------+                         		             +------------+                                   +---------+                                     

function lg(...data)
{
 console.log(...data);
}
