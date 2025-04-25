<?php

require_once 'core.php';

function MySleep($usec)
{
 while ($usec >= 1000000)
       {
	sleep(1);
	$usec -= 1000000;
       }
 usleep($usec);
}

function QueueWrapper(&$client, $queue, $timer)
{
 $needle = PHPBINARY.' '.APPDIR.WRAPPERCMD." $client[ODid] $client[OVid] $client[eId] $client[cmdline] ";

 while (true)
       {
        $output = [];
        exec(SEARCHPROCESSCMD.' "'.$needle.'"', $output);
        if (count($output) >= $queue)
	   {
	    MySleep($timer);
	    $timer = min(MAXUSECONDSINTERVAL, $timer + MINUSECONDSINTERVAL);
	   }
	 else
	   {
	    $timer = max(MINUSECONDSINTERVAL, $timer - MINUSECONDSINTERVAL);
	    break;
	   }
       }

 return $timer;
}

if (!isset($_SERVER['argv'][2], $_SERVER['argv'][3], $_SERVER['argv'][4], $_SERVER['argv'][5])) exit;
$ODid = $_SERVER['argv'][2];
$OVid = $_SERVER['argv'][3];
$eid = $_SERVER['argv'][4];
$line = intval($_SERVER['argv'][5]);
$queue = intval($_SERVER['argv'][6]);

$query = $db->prepare("SELECT JSON_EXTRACT(odprops, '$.dialog.View') as views,odname,JSON_EXTRACT(odprops, '$.dialog.Element') as elements,id FROM $ WHERE id='$ODid'");
$query->execute();
$od = $query->fetchAll(PDO::FETCH_ASSOC);
if (!isset($od[0])) exit;
$od = $od[0];

$views = json_decode($od['views'], true);
if (gettype($views) !== 'array') exit;
foreach ($views as $key => $value)
	if ($value['element1']['id'] === $OVid)
	   {
	    $view = $views[$key];
	    break;
	   }
if (!isset($view)) exit;

// Init client array properties
$client = ['auth' => 'system',
	   'uid' => getUserId($db, 'system'),
	   'ODid' => $ODid,
	   'OVid' => $OVid,
	   'OD' => $od['odname'],
	   'OV' => $view['element1']['data'],
	   'eId' => $eid,
	   'cmd' => 'SCHEDULE',
	   'params' => [],
	   'cmdline' => $line,
	   'ip' => IP
	  ];

// Exit in case of object selection consisting of incomplete params, otherwise execute a query to fetch view all object ids
if (gettype($client['objectselection'] = GetObjectSelection(trim($view['element4']['data']), $client['params'], $client['auth'])) === 'array') exit;

// Init vars, MINUSECONDSINTERVAL, MAXSECONDSINTERVAL
$count = 0;
$timer = MINUSECONDSINTERVAL;
$wait = $queue === 1 ? true : false;

// Execute wrapper for every object in an object selection
if (($client['linknames'] = LinkNamesStringToArray(trim($view['element5']['data']))) === [])
   {
    // Get object ids list
    $query = $db->prepare("SELECT id,version,lastversion FROM `data_$ODid` $client[objectselection]");
    $query->execute();
    $objects = $query->fetchAll(PDO::FETCH_ASSOC);
    $query->CloseCursor();

    // Go through all objects
    foreach ($objects as $id => $row) if ($row['version'] !== '0' && $row['lastversion'] === '1')
	    {
	     $client['oId'] = $row['id'];
	     ExecWrapper($client, $wait);
	     $count ++;
	     if (!$wait && $count >= $queue) $timer = QueueWrapper($client, $queue, $timer);
	    }
   }
 else
   {
    // Get object ids list
    $output = $tree = [];
    if (!Check($db, GET_ELEMENTS, $client, $output)) exit;
    CreateTree($db, $client, 0, $tree, '');

    // Go through all objects
    foreach ($client['objects'] as $id => $nothing)
	    {
	     $client['oId'] = $id;
	     ExecWrapper($client, $wait);
	     $count ++;
	     if (!$wait && $count >= $queue) $timer = QueueWrapper($client, $queue, $timer);
	    }
   }

// Wait last handler to finish to complete the scheduler task
$queue = 1;
QueueWrapper($client, $queue, $timer);
