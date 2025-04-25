<?php

require_once 'core.php';

function CheckODString($odname)
{
 return substr(str_replace("'", '', str_replace('"', '', trim(str_replace("\\", '', $odname)))), 0, ODSTRINGMAXCHAR);
}

function NewOD($db, &$client, &$output)
{
 // Get dialog OD name, cut it and check
 $odname = CheckODString($client['data']['dialog']['Database']['Properties']['element1']['data']);
 if ($odname === '' && ($output = ['cmd' => '', 'alert' => 'Object Database name cannot be empty!'])) return;
 $client['data']['dialog']['Database']['Properties']['element1']['data'] = $odname;

 // Inserting new OD name with empty database configuration
 $query = $db->prepare("INSERT INTO `$` (odname) VALUES (:odname)");
 $query->execute([':odname' => $odname]);

 // Getting created properties id
 $query = $db->prepare("SELECT LAST_INSERT_ID()");
 $query->execute();
 $client['newODid'] = $id = $query->fetchAll(PDO::FETCH_NUM)[0][0];

 // Creating 'uniq' OD instance for json "value" element properties (for 'uniq' object elements only)
 $query = $db->prepare("create table `uniq_$id` (id MEDIUMINT NOT NULL AUTO_INCREMENT, PRIMARY KEY (id)) AUTO_INCREMENT=".strval(STARTOBJECTID)." ENGINE InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
 $query->execute();

 // Creating 'Object Database' (OD), consists of actual multiple object versions and its elements json data
 $query = $db->prepare("create table `data_$id` (id MEDIUMINT NOT NULL, mask TEXT, lastversion BOOL DEFAULT 1, version MEDIUMINT NOT NULL, owner CHAR(64), datetime DATETIME DEFAULT NOW(), PRIMARY KEY (id, version)) ENGINE InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
 $query->execute();
 $query = $db->prepare("ALTER TABLE `data_$id` ADD INDEX (`lastversion`)");
 $query->execute();

 // Insert new OD properties
 $query = $db->prepare("UPDATE `$` SET odprops=:odprops WHERE id=$id");
 $query->execute([':odprops' => json_encode(adjustODProperties($db, $client['data'], $id), JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_IGNORE)]);

 return true;
}

function EditOD($db, &$client, &$output)
{
 // Get dialog old and new OD name
 $newodname = CheckODString($client['data']['dialog']['Database']['Properties']['element1']['data']);
 $client['data']['dialog']['Database']['Properties']['element1']['data'] = $newodname;
 $id = intval($client['data']['flags']['callback']);

 // Getting old OD name in `$`
 $query = $db->prepare("SELECT odname,odprops FROM `$` WHERE id=:id");
 $query->execute([':id' => $id]);
 $oldodname = $query->fetchAll(PDO::FETCH_NUM);

 if (!isset($oldodname[0][0], $oldodname[0][1]) && ($output = ['cmd' => '', 'alert' => "Object Database has already been removed!"])) return;
 $odprops = $oldodname[0][1];
 $oldodname = $oldodname[0][0];

 // In case of empty OD name string try to remove current OD from the system
 if ($newodname === '')
    {
     if (($client['data']['dialog']['Database']['Properties']['element2']['data'] != '' || count($client['data']['dialog']['View']) != 1) && ($output = ['cmd' => '', 'alert' => "To remove Object Database (OD) - remove all views first, then empty 'name' and 'description' OD fields!"])) return;
     $query = $db->prepare("DELETE FROM `$` WHERE id=:id");
     $query->execute([':id' => $id]);
     $query = $db->prepare("DROP TABLE IF EXISTS `uniq_$id`");
     $query->execute();
     $query = $db->prepare("DROP TABLE IF EXISTS `data_$id`");
     $query->execute();
     $dir = UPLOADDIR."$client[ODid]";
     if (is_dir($dir)) removeDir($dir);
     return true;
    }

 // Decode current OD props
 $odprops = json_decode($odprops, true);
 if (!isset($odprops['dialog']['Database']['Properties']) && ($output = ['cmd' => '', 'alert' => "Failed to get Object Database '$oldodname' properties!"])) return;
 $section = $odprops['dialog']['Database']['Properties'];

 // Check current OD permissions to fetch new OD data from dialog box - $client['data']['dialog']['Database']['Permissions'])..
 $groups = getUserGroups($db, $client['uid']); // Get current user group list
 $groups[] = $client['auth']; // and add username at the end of array
 $alertstring = '';

 // Check 'Database' pad change permissions
 if ($client['data']['dialog']['Database'] != $odprops['dialog']['Database'])
    {
     $count = count(array_uintersect($groups, UnsetEmptyArrayElements(explode("\n", $section['element7']['data'])), "strcmp"));
     $pos = strpos($section['element6']['data'], '+');
     if (($count && $pos) || (!$count && !$pos))
	{
	 $alertstring .= "'Database', ";
	 $client['data']['dialog']['Database'] = $odprops['dialog']['Database'];
	 $newodname = $oldodname;
	}
    }

 // Check 'Element' pad change permissions
 if ($client['data']['dialog']['Element'] != $odprops['dialog']['Element'])
    {
     $count = count(array_uintersect($groups, UnsetEmptyArrayElements(explode("\n", $section['element9']['data'])), "strcmp"));
     $pos = strpos($section['element8']['data'], '+');
     if (($count && $pos) || (!$count && !$pos))
	{
	 $alertstring .= "'Element', ";
	 $client['data']['dialog']['Element'] = $odprops['dialog']['Element'];
	}
    }

 // Check 'View' pad change permissions
 if ($client['data']['dialog']['View'] != $odprops['dialog']['View'])
    {
     $count = count(array_uintersect($groups, UnsetEmptyArrayElements(explode("\n", $section['element11']['data'])), "strcmp"));
     $pos = strpos($section['element10']['data'], '+');
     if (($count && $pos) || (!$count && !$pos))
	{
	 $alertstring .= "'View', ";
	 $client['data']['dialog']['View'] = $odprops['dialog']['View'];
	}
    }

 // Check 'Rule' pad change permissions
 if ($client['data']['dialog']['Rule'] != $odprops['dialog']['Rule'])
    {
     $count = count(array_uintersect($groups, UnsetEmptyArrayElements(explode("\n", $section['element13']['data'])), "strcmp"));
     $pos = strpos($section['element12']['data'], '+');
     if (($count && $pos) || (!$count && !$pos))
	{
	 $alertstring .= "'Rule', ";
	 $client['data']['dialog']['Rule'] = $odprops['dialog']['Rule'];
	}
    }

 // If alert string is not empty copy it to output result
 if ($alertstring) $output['alert'] = "You're not allowed to change ".substr($alertstring, 0, -2)." properties!";
 // Writing new properties

 $ODProperties = json_encode(adjustODProperties($db, $client['data'], $id), JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_IGNORE);
 if (!$ODProperties && ($output = ['cmd' => '', 'alert' => "Failed to save Database configuration!"])) return;

 $query = $db->prepare("UPDATE `$` SET odname=:odname,odprops=:odprops WHERE id=:id");
 //$query->execute([':odname' => $newodname, ':odprops' => json_encode(adjustODProperties($db, $client['data'], $id), JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE), ':id' => $id]);
 $query->execute([':odname' => $newodname, ':odprops' => $ODProperties, ':id' => $id]);

 return true;
}

try {
     $output = ['cmd' => ''];
     $input = json_decode(file_get_contents("php://input"), true);
     $query = $db->prepare("SELECT now()-time,client FROM `$$$` WHERE id='$input'");
     $query->execute();
     $client = $query->fetchAll(PDO::FETCH_NUM)[0];
     $query = $db->prepare("DELETE FROM `$$$` WHERE id='$input'");
     $query->execute();
    }
catch (PDOException $e)
    {
     lg($e, 'View.php PDO exception');
     echo json_encode(['cmd' => '', 'error' => 'PDO driver exception error!']);
     exit;
    }

if (intval($client[0]) > CALLTIMEOUT)
   {
    echo json_encode(['cmd' => '', 'error' => "Server call request timeout with $client[0]sec, please try again!"]);
    exit;
   }
$client = json_decode($client[1], true);

try {
     switch ($client['cmd'])
	    {
	     case 'SIDEBAR': // Client sidebar items wrap/unwrap event
		  Check($db, CHECK_OD_OV, $client, $output);
		  break;
	     case 'CALL':
		  // Check input data correctness
		  if (!isset($client['allelements'], $client['elementselection'], $client['objectselection'], $client['viewtype'], $client['linknames']) && !Check($db, CHECK_OD_OV | GET_ELEMENTS | GET_VIEWS | CHECK_ACCESS, $client, $output)) break;

		  // Get OV data for a 'Tree' view template
		  if ($client['viewtype'] === 'Tree')
		     {
		      // Break with error in case of no link name specified
		      if ($client['linknames'] === [] && ($output['error'] = "Specified view '".$client['OV']."' has no link names defined!")) break;

		      // Get object selection query string, array result is treated as dialog content to define view params
		      $client['objectselection'] = GetObjectSelection($client['objectselection'], $client['params'], $client['auth']);
		      if (gettype($client['objectselection']) === 'array' && ($output = ['cmd' => 'DIALOG', 'data' => $client['objectselection'], 'ODid' => $client['ODid'], 'ODid' => $client['OVid']] + $output)) break;

		      // Build the tree
		      $data = [];
		      CreateTree($db, $client, 0, $data, 'TREE');
		      if (!isset($data['link']) && ($output['error'] = "Specified view '".$client['OV']."' has no objects matched current selection!")) break;
		      $output = ['cmd' => 'Tree', 'data' => $data, 'params' => $client['params']] + $output;
		      if (isset($client['elementselection']['rotate'])) $output['rotate'] = $client['elementselection']['rotate'];
		      break;
		     }

		  // Get OV data for a 'Table' view template
		  if ($client['viewtype'] === 'Table')
		     {
		      // Get object selection query string, array result is treated as dialog content to define view params
		      $client['objectselection'] = GetObjectSelection($client['objectselection'], $client['params'], $client['auth']);
		      if (gettype($client['objectselection']) === 'array' && ($output = ['cmd' => 'DIALOG', 'data' => $client['objectselection'], 'ODid' => $client['ODid'], 'ODid' => $client['OVid']] + $output)) break;

		      // Get element selection query string, in case of empty result return no element message as an error
		      $ElementQuery = '';
		      SetLayoutProperties($client, $db);
		      foreach ($client['layout']['elements'] as $key => $value) if (intval($key) > 0) $ElementQuery .= ",JSON_UNQUOTE(JSON_EXTRACT(eid$key, '$.value')) as eid$key"."value,JSON_UNQUOTE(JSON_EXTRACT(eid$key, '$.style')) as eid$key"."style,JSON_UNQUOTE(JSON_EXTRACT(eid$key, '$.hint')) as eid$key"."hint,JSON_UNQUOTE(JSON_EXTRACT(eid$key, '$.link')) as eid$key"."link";
		      if ($ElementQuery === '' && !count($client['layout']['virtual']) && ($output['error'] = "Database '$client[OD]' Object View '$client[OV]' layout has no elements defined!")) break;
		      $client['elementquery'] = "id,version,owner,datetime,lastversion$ElementQuery";

		      // Return OV refresh command to the client with object selection sql query result as a main field data
		      if ($client['linknames'] === [])
			 {
			  $query = $db->prepare("SELECT $client[elementquery] FROM `data_$client[ODid]` $client[objectselection]");
			  $query->execute();
			  $output = ['cmd' => 'Table', 'data' => $query->fetchAll(PDO::FETCH_ASSOC), 'layout' => $client['layout'], 'params' => $client['params']] + $output;
			 }
		       else
			 {
			  $data = [];
			  CreateTree($db, $client, 0, $data, 'TABLE');
			  if (!count($client['tree']) && !count($client['layout']['virtual']) && ($output['error'] = "Specified view '".$client['OV']."' has no objects matched current selection!")) break;
			  $output = ['cmd' => 'Table', 'data' => $client['tree'], 'layout' => $client['layout'], 'params' => $client['params']] + $output;
			 }
		      $output['attached'] = [];
		      if (is_dir($dir = UPLOADDIR."$client[ODid]")) foreach (scandir($dir) as $oid) if ($oid !== '.' && $oid !== '..')
			 {
			  $output['attached'][$oid] = [];
			  if (is_dir("$dir/$oid"))
			     foreach (scandir("$dir/$oid") as $eid) if ($eid !== '.' && $eid !== '..')
				     if (IsDirNotEmpty("$dir/$oid/$eid")) $output['attached'][$oid][$eid] = true;
			 }
		      break;
		     }

		  // Incorrect template
		  $output = ['cmd' => '', 'error' => "Template '$client[viewtype]' is not supported!"];
		  break;
	     case 'New Database':
	          if (!Check($db, CHECK_ACCESS, $client, $output)) break;
		  if ($client['data'] === '')
		     {
		      initNewODDialogElements();
		      $output = ['cmd' => 'DIALOG',
		      'data' => ['title'  => 'New Database',
				 'dialog' => ['Database' => ['Properties' => $newProperties],
					      'Element' => ['New element' => $newElement],
					      'View' => ['New view' => $newView],
					      'Rule' => ['New rule' => $newRule]],
				 'buttons' => CREATECANCEL,
				 'flags'  => ['style' => 'width: 860px; height: 720px;', 'esc' => '', 'profilehead' => ['Element' => "Select element", 'View' => "Select view", 'Rule' => "Select rule"]]]];
		      $output['data']['buttons']['CREATE']['call'] = 'New Database';
		      break;
		     }
		  if (!NewOD($db, $client, $output) || !Check($db, CHECK_OD_OV, $client, $output)) break;
	          break;
	     case 'Database Configuration':
	          if (gettype($client['data']) === 'string') // Input data is a string (OD name), so get OD props
		     {
		      $query = $db->prepare("SELECT odname,odprops FROM `$` WHERE id=:id");
		      $query->execute([':id' => $client['data']]);
		      $odprops = $query->fetch(PDO::FETCH_NUM);
		      $odname = $odprops[0];
		      if (!($odprops = json_decode($odprops[1], true)) && ($output['alert'] = "Object Database doesn't exist!")) break; // Incorrect/absent OD props

		      $odprops['flags']['callback'] = $client['data'];		// Put OD name in a callback property
		      $odprops['title'] .= " '$odname' (id $client[data])";	// Set dialog title
		      ksort($odprops['dialog'], SORT_STRING);			// Sort dialog pads
		      $output = ['cmd' => 'DIALOG', 'data' => $odprops];	// Build output dialog
		      break;
		     }
		  if (!EditOD($db, $client, $output) || !Check($db, CHECK_OD_OV, $client, $output)) break;
		  break;
	    }
    }
catch (PDOException $e)
    {
     lg($e);
     $msg = $e->getMessage();
     switch ($client['cmd'])
	    {
	     case 'CALL':
	          $output = ['cmd' => '', 'error' => "Failed to get Object View: $msg"];
		  break;
	     case 'New Database':
		  if (isset($client['newODid']))
		     {
		      $query = $db->prepare("DELETE FROM `$` WHERE id=$client[newODid]");
		      $query->execute();
		      $query = $db->prepare("DROP TABLE IF EXISTS `data_$client[newODid]`");
		      $query->execute();
		      $query = $db->prepare("DROP TABLE IF EXISTS `uniq_$client[newODid]`");
		      $query->execute();
		     }
		  $output = ['cmd' => '', 'alert' => 'Failed to add new Object Database: '];
		  $output['alert'] .= preg_match("/Duplicate entry/", $msg) === 1 ? 'OD name already exists!' : $msg;
		  break;
	     case 'Database Configuration':
	          $output = ['cmd' => '', 'alert' => "Failed to write Object Database properties: $msg"];
		  break;
	    }
    }

// Echo output result
echo json_encode($output);
