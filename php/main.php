<?php

require_once 'core.php';	// Include core functions
error_reporting(E_ALL);		// Report all errors
set_time_limit(0);		// set script execution time to unlimited value
ob_implicit_flush();		// Turn implicit system buffer flushing on 

// Flush all queue tables
$query = $db->prepare("DELETE FROM `$$`");
$query->execute();
$query = $db->prepare("DELETE FROM `$$$`");
$query->execute();

$context = stream_context_create();
stream_context_set_option($context, 'ssl', 'local_cert', '/etc/letsencrypt/live/mng.gcom.ru/cert.pem');
stream_context_set_option($context, 'ssl', 'local_pk', '/etc/letsencrypt/live/mng.gcom.ru/privkey.pem');
stream_context_set_option($context, 'ssl', 'passphrase', '');
stream_context_set_option($context, 'ssl', 'verify_peer', false);
stream_context_set_option($context, 'ssl', 'verify_peer_name', false);
#stream_context_set_option($context, 'ssl', 'allow_self_signed', true);
$mainsocket = stream_socket_server('ssl://'.IP.':'.strval(PORT), $errno, $errstr, STREAM_SERVER_BIND|STREAM_SERVER_LISTEN, $context);
$socketarray = [$mainsocket];
$clientsarray = [[]];
$null = NULL;
$stream = false;

//echo "Starting server..		OK\n";
//exec(PHPBINARY.' '.APPDIR.SCHEDULERBINARY.' >/dev/null &');
//echo "Starting scheduler..	OK\n";

while (true)
{
 $read = $socketarray; // Make copy of array of sockets
 // Waiting for the sockets accessable for reading without timeout
 if (stream_select($read, $null, $null, 0, SOCKETTIMEOUTUSEC) === false && !lg('Socket wait status error: '.socket_strerror(socket_last_error()))) exit;

 // Client array:
 // 'auth':		client username 
 // 'authtime':		user login time stamp
 // 'uid':		user id
 // 'ip':		client ip address
 // 'port':		client tcp/udp port
 // 'User-Agent':	Client user agent name
 // 'ODid'/'OVid':	Client OD/OV identificators
 // 'OD'/'OV':		Client OD/OV names
 // 'params':		object selection args array
 // 'oId'/'eId':	Object/element ids client event inited by
 // 'cid':		Socket array index, used as a client identificator
 if (in_array($mainsocket, $read)) // New socket event
    {
     if (($newsocket = stream_socket_accept($mainsocket)) && ($info = handshake($newsocket)))
	{
	 //lg('New web socket connection from '.$info['ip'].':'.$info['port']." accepted.\nUser Agent: ".$info['User-Agent']);
	 stream_set_blocking($newsocket, false); // Set stream to non-blocking mode to make some functions (like fgets) immediately return data (otherwise function waits data to be accessible on the stream)
	 $socketarray[] = $newsocket;
	 $clientsarray[] = ['ip' => $info['ip'], 'port' => $info['port'], 'User-Agent' => $info['User-Agent'], 'ODid' => '', 'OVid' => '', 'OD' => '', 'OV' => '', 'streamdata' => '', 'payload' => ''];
	}
     unset($read[array_search($mainsocket, $read)]);
    }

 $now = strtotime("now");
 foreach($read as $cid => $socket)
	{
	 start:
	 if ($stream === true)
	    {
	     $decoded = decode($clientsarray[$cid]['streamdata']);
	     $stream = NULL;
	    }
	  else
	    {
	     if (gettype($stream = stream_get_contents($socket)) !== 'string' || !strlen($stream)) continue; // Continue for incorrect or zero socket stream data
	     $decoded = decode($clientsarray[$cid]['streamdata'] .= $stream);
	    }
	 // Client close socket connection frame
	 if ($decoded === NULL)
	    {
	     lg('Client close socket connection event or incorrect data type/payload from '.$clientsarray[$cid]['ip'].':'.$clientsarray[$cid]['port']);
	     fclose($socket);
	     unset($socketarray[$cid]);
	     unset($clientsarray[$cid]);
	     continue;
	    }
	 // Control frame
	 if ($decoded === false)
	    {
	     $clientsarray[$cid]['streamdata'] = '';
	     continue;
	    }
	 // Frame defragmentation
	 if ($decoded['datalength'] < $decoded['framelength']) continue;
	 $clientsarray[$cid]['payload'] .= $decoded['payload'];
	 // Frame data less than stream data
	 if ($decoded['datalength'] > $decoded['framelength'])
	    {
	     $clientsarray[$cid]['streamdata'] = substr($clientsarray[$cid]['streamdata'], $decoded['framelength']);
	     $stream = true;
	     goto start;
	    }
	 $clientsarray[$cid]['streamdata'] = '';
	 // Message defragmentaion
	 if (!$decoded['fin']) continue;
	 // Message finish
	 $input = json_decode($clientsarray[$cid]['payload'], true);
	 $clientsarray[$cid]['payload'] = '';
	 // Incorrect client message!
	 if (!isset($input['cmd'])) continue;
	 // Init input args
	 $client = &$clientsarray[$cid];
	 $client['cid'] = $cid;
	 $output = ['cmd' => ''];
	 CopyArrayElements($input, $client, ['ODid', 'OVid', 'OD', 'OV', 'cmd', 'data', 'oId', 'eId', 'cmdline']);
	 unset($input);
	 // Non login unauth client event or session timeout? Emulate logout event!
	 if ($client['cmd'] != 'LOGIN' && (!isset($client['auth']) || $now - $client['authtime'] > SESSIONLIFETIME)) $client['cmd'] = 'LOGOUT';

	 try {
	      switch ($client['cmd'])
	    	 {
		  case 'LOGIN': // Client context menu login dialog event. Check if user/pass are correct and not empty
		       if (($user = $client['data']['dialog']['pad']['profile']['element1']['data']) != '' &&  ($pass = $client['data']['dialog']['pad']['profile']['element2']['data']) != '' && ($hui = password_verify($pass, $hash = getUserPass($db, $uid = getUserId($db, $user)))))
			  {
			   $client['uid'] = NULL;
			   LogoutUser($socketarray, $clientsarray, $uid, "\nUser other session detected!\n\nUsername");
			   $client['auth'] = $user;
			   $client['uid'] = $uid;
			   $client['authtime'] = $now;
			   $client['ODid'] = $client['OVid'] = $client['OD'] = $client['OV'] = '';
			   Check($db, CHECK_OD_OV, $client, $output);
			   $output['log'] = "Logged in from $client[ip] with user agent: ".$client['User-Agent']."!";
			   $output['customization'] = getUserCustomization($db, $uid);
			  }
			else
			  {
			   $output = LogoutUser($null, $null, NULL, "\nWrong password or username, please try again!\n\nUsername");
			   $output['log'] = $user ? "Wrong passowrd or username '$user' from $client[ip]" : "Empty username login attempt from $client[ip]";
			  }
		       break;
		  case 'LOGOUT': // Client context menu logout event or any other event from unauthorized client. Also wrong pass, pass change, timeout
		       $output = LogoutUser($null, $null, NULL, $title = (isset($client['auth']) && $now - $client['authtime'] > SESSIONLIFETIME) ? "\nSession timeout, please log in!\n\nUsername" : '');
		       if (isset($client['auth'])) $output['log'] = $title ? 'User '.$client['auth'].' session timeout!' : 'User '.$client['auth'].' has logged out!';
		       break;
		  case 'CALL': // OV display event
		       // Calculate view input params (if exist) first
		       $client['params'] = [];
		       if (isset($client['data']['dialog']['pad']['profile']))
			  {
			   foreach ($client['data']['dialog']['pad']['profile'] as $key => $value) $client['params'][$key] = $value['data'];
			  }
			else if (gettype($client['data']) === 'string' && $client['data'] && Check($db, GET_VIEWS, $client, $output) && gettype($client['elementselection']['call']) === 'array')
			  {
			   foreach ($client['elementselection']['call'] as $key => $eid)
				   if ($key[0] === ':') $client['params'][$key] = getElementProp($db, $client['ODid'], $client['data'], $eid, 'value');
			   if (isset($client['elementselection']['call']['ODid']) || isset($client['elementselection']['call']['OD']))
			      {
			       if (isset($client['elementselection']['call']['ODid'])) $client['ODid'] = $client['elementselection']['call']['ODid']; else unset($client['ODid']);
			       if (isset($client['elementselection']['call']['OD'])) $client['OD'] = $client['elementselection']['call']['OD']; else unset($client['OD']);
			      }
			   if (isset($client['elementselection']['call']['OVid']) || isset($client['elementselection']['call']['OV']))
			      {
			       if (isset($client['elementselection']['call']['OVid'])) $client['OVid'] = $client['elementselection']['call']['OVid']; else unset($client['OVid']);
			       if (isset($client['elementselection']['call']['OV'])) $client['OV'] = $client['elementselection']['call']['OV']; else unset($client['OV']);
			      }
			   unset($client['elementselection']);
			  }
		  case 'SIDEBAR': // Client sidebar items wrap/unwrap event
		  case 'New Database':
		  case 'Database Configuration':
		       $output['cmd'] = $client['cmd'];
		       $message = json_encode($client);
		       QueueCall($db, NULL, $output['data'] = GenerateRandomString(), $message);
		       break;
		  case 'INIT':
		       Check($db, CHECK_OID, $client, $output);
		  case 'DELETE':
		       Check($db, CHECK_EID, $client, $output);
		  case 'DOUBLECLICK':
		  case 'PASTE':
		  case 'CONFIRM':
		  case 'CONFIRMDIALOG':
		       ExecWrapper($client);
		       break;
		  case 'Task Manager':
		       exec(PHPBINARY." taskmanager.php '".json_encode($client, JSON_HEX_APOS | JSON_HEX_QUOT)."' >/dev/null &");
		       break;
		  default:
		       if (ctype_digit($client['cmd'])) ExecWrapper($client);
			else $output['log'] = $output['alert'] = "Controller report: unknown event '$client[cmd]' from client $client[ip] and user '$client[auth]'!";
		 }
	     }
	 catch (PDOException $e)
	     {
	      if (preg_match("/SQL server has gone away/", $msg = $e->getMessage()) === 1)
	         {
		  foreach ($clientsarray as $key => $value) if (isset($value['auth'])) cutKeys($clientsarray[$key], ['ip', 'port', 'User-Agent']);
		  include 'connect.php';
		 }
	      $output['log'] = $output['alert'] = "Controller error: $msg!";
	     }
	
	 // Write output result to the client socket
	 if ($output != ['cmd' => ''] && isset($socketarray[$cid]))
	    {
	     if (isset($output['log'])) LogMessage($db, $client, $output['log']);
	     if (isset($output['error'])) $client['ODid'] = $client['OVid'] = $client['OD'] = $client['OV'] = '';
	     if (isset($client['auth'])) $output['auth'] = $client['auth'];
	     fwrite($socket, encode(json_encode($output)));
	    }
	}

 try {
      $query = $db->prepare("SELECT * FROM `$$`"); // Process handler events from table `$$`
      $query->execute();
      foreach ($query->fetchAll(PDO::FETCH_ASSOC) as $value)
	      {
	       $handler = json_decode($value['client'], true); // Decode client array
	       isset($handler['cid']) ? $hid = $handler['cid'] : $hid = -1; // Set handler id, in case of absent (scheduler event) set it to -1
	       if (isset($handler['passchange'])) // Pass change event? Search all sockets for user id the pass was changed for
		  {
		   LogoutUser($socketarray, $clientsarray, $handler['passchange'], "\nUser password has been changed!\n\nUsername");
		   unset($handler['passchange']);
		  }
	       $count = ['cmd' => '', 'count' => ['odid' => isset($handler['ODid']) ? $handler['ODid'] : '', 'ovid' => isset($handler['OVid']) ? $handler['OVid'] : '']];
	       $countmessage = encode(json_encode($count));

	       switch ($handler['cmd'])
	              {
		       // For dialog, edit or empty (warning box message) commands search appropriate socket (the handler was called from) to write the command.
		       case '':
		       case 'EDIT':
		       case 'NEWPAGE':
		       case 'DIALOG':
			    if (isset($socketarray[$hid]) && $clientsarray[$hid]['ODid'] === $handler['ODid'] && $clientsarray[$hid]['OVid'] === $handler['OVid'] && ($handler['ODid'] === '' || $clientsarray[$hid]['params'] === $handler['params']))
			       fwrite($socketarray[$hid], encode(json_encode($handler)));
			    break;
		       case 'SET':
			    $encodedmessage = encode(json_encode($handler)); // Encode message for the client called the handler
			    unset($handler['alert']);
			    $encodedmessageany = encode(json_encode($handler + $count)); // Encode message for other clients with the same OD/OV without alert message
			    // Search all auth clients with the OD/OV the 'SET' command was called for and write object element data change
			    foreach ($socketarray as $cid => $socket) if (isset($clientsarray[$cid]['auth']))
				 if ($clientsarray[$cid]['ODid'] === $handler['ODid'] && $clientsarray[$cid]['OVid'] === $handler['OVid'])
				    {
				     if ($clientsarray[$cid]['params'] !== $handler['params']) continue;
				     $cid === $hid ? fwrite($socket, $encodedmessage) : fwrite($socket, $encodedmessageany);
				    }
				  else
				    {
				     fwrite($socket, $countmessage);
				    }
			    break;
		       case 'INIT':
		       case 'DELETE':
			    // Remember alert message if exist
			    isset($handler['alert']) ? $alert = ['alert' => $handler['alert']] : $alert = [];
			    unset($handler['alert']);
			    // Cycle all sockets which client OD/OV the INIT/DELETE commands was called for
			    foreach ($socketarray as $cid => $socket) if (isset($clientsarray[$cid]['auth']))
				 if ($clientsarray[$cid]['ODid'] === $handler['ODid'] && $clientsarray[$cid]['OVid'] === $handler['OVid'])
				    {
				     if ($clientsarray[$cid]['params'] !== $handler['params']) continue;
				     CopyArrayElements($clientsarray[$cid], $handler, ['auth', 'uid']);
				     $handler['cmd'] = 'CALL';
				     $handler['data'] = GenerateRandomString();
				     $cid === $hid ? $message = json_encode($handler + $alert) : $message = json_encode($handler + $count);
				     QueueCall($db, $socket, $handler['data'], $message);
				    }
				  else
				    {
				     fwrite($socket, $countmessage);
				    }
			    break;
		       case 'CALL':
		       case 'UPLOADDIALOG':
		       case 'DOWNLOADDIALOG':
		       case 'UNLOADDIALOG':
		       case 'GALLERY':
			    Check($db, CHECK_OD_OV, $handler, $output);
			    CopyArrayElements($clientsarray[$hid], $handler, ['auth', 'uid']);
			    $handler['data'] = GenerateRandomString();
			    $message = json_encode($handler); // Var $handler['cmd'] already has appropriate command ('CALL', 'UPLOAD'..)
			    QueueCall($db, $socketarray[$hid], $handler['data'], $message);
			    break;
		      }
	  $query = $db->prepare("DELETE FROM `$$` WHERE id=$value[id]");
	  $query->execute();
	 }
 }
 catch (PDOException $e)
 {
  if (preg_match("/SQL server has gone away/", $msg = $e->getMessage()) === 1)
     {
      foreach ($clientsarray as $key => $value) if (isset($clientsarray[$key]['auth'])) cutKeys($clientsarray[$key], ['ip', 'port', 'User-Agent']);
      include 'connect.php';
     }
  $client = [];
  LogMessage($db, $client, $msg);
 }
}

function LogoutUser(&$socketarray, &$clientsarray, $uid, $title = '')
{
 $output = ['cmd' => 'DIALOG', 'data' => getLoginDialogData($title), 'sidebar' => [], 'auth' => '', 'error' => ''];
 if (!$socketarray) return $output;

 foreach ($socketarray as $cid => $socket)
      if (isset($clientsarray[$cid]['uid']) && $clientsarray[$cid]['uid'] === $uid)
	 {
	  fwrite($socket, encode(json_encode($output)));
	  cutKeys($clientsarray[$cid], ['ip', 'port', 'User-Agent']);
	  $clientsarray[$cid]['streamdata'] = $clientsarray[$cid]['payload'] = '';
	  break;
	 }
}
