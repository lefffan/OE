<?php

require_once 'core.php';

// Init vars
$span = '<span style="color: RGB(114,132,201);">';
$bgcolor = 'rgb(172,189,172);';
$bgcolorkill = 'rgb(217,174,174);';
$font = 'bold';
$now = strtotime("now");
$output  = [];
$table  = [];
$table['line0']   = [
	      'PID' => ['value' => 'PID', 'style' => "background-color: $bgcolor font-weight: $font", 'call' => ''], 
	      'Handler' => ['value' => 'Handler', 'style' => "background-color: $bgcolor font-weight: $font", 'call' => ''],
	      'Exe time' => ['value' => 'Exe time', 'style' => "background-color: $bgcolor font-weight: $font", 'call' => ''],
	      'Initiator' => ['value' => 'Initiator', 'style' => "background-color: $bgcolor font-weight: $font", 'call' => ''],
	      'Ip' => ['value' => 'Ip', 'style' => "background-color: $bgcolor font-weight: $font", 'call' => ''],
	      'Event' => ['value' => 'Event', 'style' => "background-color: $bgcolor font-weight: $font", 'call' => ''],
	      'Database' => ['value' => 'Database', 'style' => "background-color: $bgcolor font-weight: $font", 'call' => ''],
	      'View' => ['value' => 'View', 'style' => "background-color: $bgcolor font-weight: $font", 'call' => ''],
	      'OId' => ['value' => 'OId', 'style' => "background-color: $bgcolor font-weight: $font", 'call' => ''],
	      'EId' => ['value' => 'EId', 'style' => "background-color: $bgcolor font-weight: $font", 'call' => ''],
	      'Kill' => ['value' => 'Kill', 'style' => "background-color: $bgcolorkill font-weight: $font"],
	     ];

// Parse client data
$client  = json_decode($_SERVER['argv'][1], true);

// Parse pid number to kill appropriate process id
if (isset($client['data']['flags']['event']) && intval($pid = $client['data']['flags']['event']) > 0) exec(KILLPROCESSCMD.' '.strval($pid));

// Get current sort column from dialog data, otherwise use deault value
$sort = 'PID*'; // Default
$cmd = 'DIALOG';
if (isset($client['data']['dialog']['pad']['profile']['element2']['data'])) // Incoming dialog data does exist (non first task manager call)?
   {
    foreach ($client['data']['dialog']['pad']['profile']['element2']['data']['line0'] as $value) // Get table header ('line0' row) to parse column to sort on
	    if (!(strpos($value['value'], '*') === false))
	       {
		$sort = $value['value']; // Sort on column with char '*' present
		break;
	       }
   }

// Process sort column event if exist
if (isset($pid) && array_search($pid, ['PID', 'Handler', 'Exe time', 'Initiator', 'Ip', 'Event', 'Database', 'View', 'OId', 'EId']) !== false)
if (str_replace('*', '', $sort) === $pid) $sort[0] === '*' ? $sort = substr($sort.'*', 1) : $sort = substr('*'.$sort, 0, -1);
 else $sort = $pid.'*';

// Mark sort column value by '*' char
$table['line0'][str_replace('*', '', $sort)]['value'] = $sort;
$sort[0] === '*' ? $desc = true : $desc = false;
$sort = str_replace('*', '', $sort);

// Get wrapper proceesses with next args: <PID> <wrapper> <ODid> <OVid> <eid> <cmdline> <oid> <event> <uid> <ip> <start time> <client json>
exec(SEARCHPROCESSCMD.' '.WRAPPERCMD, $output);

$i = 0;
foreach ($output as $value)
	{
	 // Split process line retrived by ps
	 $process = explode(' ', trim($value));

	 // and find wrapper process
	 if (($start = array_search(APPDIR.WRAPPERCMD, $process)) === false) continue;
	 $i++;

	 // Split process line retrived by ps with json arg as an array last index
	 $process = explode(' ', trim($value), $start + 11);

	 try {
	      // Get OD props to calc OD/OV name and handler cmd
	      $query = $db->prepare("SELECT odname as name, JSON_EXTRACT(odprops, '$.dialog.View') as views, JSON_EXTRACT(odprops, '$.dialog.Element') as elements FROM $ WHERE id=:id");
	      $query->execute(['id' => $process[$start + 1]]);
	      if (count($od = $query->fetchAll(PDO::FETCH_ASSOC)) == 0)
		 throw new Exception("Task manager: incorrect OD id ".$process[$start + 1]."!");

	      // Decode retrieved views and elements
	      $od = $od[0];
	      if (gettype($od['views'] = json_decode($od['views'], true)) !== 'array' || gettype($od['elements'] = json_decode($od['elements'], true)) !== 'array')
		 throw new Exception("Task manager: incorrect OD id ".$process[$start + 1]." structure!");

	      // Calc OV
	      foreach ($od['views'] as $view)
	           if ($view['element1']['id'] === $process[$start + 2] && ($od['view'] = $view['element1']['data'])) break;

	      // Calc handler cmd line and matched event, fisrt groupt events then others
	      if ($process[$start + 6] === 'INIT' || $process[$start + 6] === 'DELETE')
		 {
		  $_client['handlerevent'] = $process[$start + 6];
		  $_client['handlercmdline'] = "handler command line obtain for '$_client[handlerevent]' event is not supported";
		  $process[$start + 3] = 'all';
		  if ($_client['handlerevent'] === 'INIT') $process[$start + 5] = 'new object id';
		 }
	       else if (isset($process[$start + 10]) && gettype($_client = json_decode($process[$start + 10], true)) === 'array' && isset($_client['eId']))
		 {
		  foreach ($od['elements'] as $element)
			  if ($element['element1']['id'] === $process[$start + 3] && ($_client['allelements'][$_client['eId']] = $element)) break;
		  if (isset($_client['allelements'][$_client['eId']])) GetCMD(NULL, $_client);
		 }

	      // Set them unknown in case of incorrect json in a wrapper process arg
	      if (!isset($_client['handlerevent'], $_client['handlercmdline'])) $_client['handlerevent'] = $_client['handlercmdline'] = 'unknown';
	     }

	 catch (PDOException $e)
	     {
	      lg($e->getMessage());
	      $od['name'] = $od['view'] = 'unknown';
	     }

	 $table["line$i"]  = [
	      		      "PID" => ['value' => $process[0]],
	      		      "Handler" => ['value' => $_client['handlercmdline']],
	      		      "Exe time" => ['value' => strval($now - intval($process[$start + 9]))],
	      		      "Initiator" => ['value' => getUserName($db, $process[$start + 7])],
	      		      "Ip" => ['value' => $process[$start + 8]],
	      		      "Event" => ['value' => $_client['handlerevent']],
	      		      "Database" => ['value' => $od['name']],
	      		      "View" => ['value' => $od['view']],
	      		      "OId" => ['value' => $process[$start + 5]],
	      		      "EId" => ['value' => $process[$start + 3]],
			      " $process[0]" => ['value' => 'X', 'call' => ''], //"Kill$i" => ['value' => 'X'],
			     ];
	 foreach ($table["line$i"] as $key => $header) if (strlen($header['value']) > OVSTRINGMAXCHAR) $table["line$i"][$key]['value'] = substr($header['value'], 0, OVSTRINGMAXCHAR).'..';

	 // Sort table by putting new line to the previous position if needed
	 for($key = $i; $key > 1; $key --)
	    if (($table["line".strval($key)][$sort]['value'] > $table["line".strval($key - 1)][$sort]['value'] && $desc) ||
		($table["line".strval($key)][$sort]['value'] < $table["line".strval($key - 1)][$sort]['value'] && !$desc))
		Swap($table["line".strval($key)], $table["line".strval($key - 1)]);
	     else break;
	}

// Task manager title
$taskcount = max(0, count($table) - 1);
$title = "Task Manager: $span".strval($taskcount).' task'.($taskcount === 1 ? '' : 's').'</span>';
// Datetime title
$datetime = new DateTime();
$title .= "               Server date time: $span".$datetime->format('Y-m-d H:i:s').'</span>';
// Load average title
$output = [];
exec(AVERAGELOADCMD, $output);
$output = trim($output[0]);
if (($start = array_search('average:', explode(' ', $output))) !== false) $title .= "               Server load average: $span".explode(' ', $output, $start + 2)[$start + 1].'</span>';

$dialog  = ['title'  => $title,
	    'dialog' => ['pad' => ['profile' =>
			['element1' => ['head'=>' '],
			 'element2' => ['type' => 'table', 'head' => '', 'data' => $table]]]],
	    'buttons'=> ['REFRESH' => ['value' => '', 'call' => 'Task Manager', 'interactive' => '', 'timer' => '1000'], 'EXIT' => ['value' => 'EXIT', 'style' => 'background-color: red;']],
	    'flags'  => ['style' => 'width: 1200px; height: 500px; padding: 5px;', 'esc' => '']];

// No active tasks
if (!$taskcount) $dialog['dialog']['pad']['profile']['element3'] = ['head' => 'No active tasks found..'];

// Incoming dialog data does exist (non first task manager call)?
if (isset($client['data']['dialog']['pad']['profile']['element2']['data'])) $dialog['flags']['updateonly'] = '';

// Put dialog data to the `$$` table to display task manager dialog box at client side
try {
     $query = $db->prepare("INSERT INTO `$$` (client) VALUES (:client)");
     $query->execute([':client' => json_encode(['cmd' => $cmd, 'data' => $dialog] + CopyKeys($client, ['cid', 'uid', 'ODid', 'OVid', 'params']), JSON_HEX_APOS | JSON_HEX_QUOT)]);
    }
catch (PDOException $e)
    {
     lg($e->getMessage());
    }
