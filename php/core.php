<?php

require_once 'const.php';
require_once 'connect.php';


function CalculateElementPropQuery($element, $prop = 'value')
{
 if (array_search($element, SERVICEELEMENTS) !== false) return $element; // Service element match? Return its name
 if (!$prop) $prop = 'value';
 return 'JSON_UNQUOTE(JSON_EXTRACT(eid'.strval($element).", '$.".$prop."'))"; // Otherwise return unqouted eidid->>'$.prop'
}

function getElementProp($db, $ODid, $oid, $eid, $prop, $version = NULL)
{
 // Check input
 if (!isset($ODid) || !isset($oid) || !isset($eid)) return NULL;

 // Calculate query parts of element column name and version selection
 $eid = CalculateElementPropQuery($eid, $prop);
 isset($version) ? $version = "version='".strval($version)."'" : $version = 'lastversion=1 AND version!=0';

 $query = $db->prepare("SELECT $eid FROM `data_$ODid` WHERE id=$oid AND $version");
 $query->execute();

 $result = $query->fetchAll(PDO::FETCH_NUM);

 if (!isset($result[0][0])) return NULL;
 $result = $result[0][0];
 $result = str_replace("\\n", "\n", $result);
 $result = str_replace('\\"', '"', $result);
 $result = str_replace('\\/', '/', $result);
 return str_replace("\\\\", "\\", $result);
}

function getElementArray($db, $ODid, $oid, $eid, $version = NULL)
{
 return json_decode(getElementJSON($db, $ODid, $oid, $eid, $version), true);
}

function getElementJSON($db, $ODid, $oid, $eid, $version = NULL)
{
 if (isset($version)) $query = $db->prepare("SELECT eid".strval($eid)." FROM `data_$ODid` WHERE id=$oid AND version='".strval($version)."'");
  else $query = $db->prepare("SELECT eid".strval($eid)." FROM `data_$ODid` WHERE id=$oid AND lastversion=1 AND version!=0");
 $query->execute();
 $result = $query->fetchAll(PDO::FETCH_NUM);

 if (!isset($result[0][0])) return NULL;
 return $result[0][0];
}

function AddObject($db, &$client, &$output)
{
 $query = $values = '';
 $params = [];

 // Prepare uniq elements query
 foreach ($client['uniqelements'] as $eid => $value)
	 {
	  $query .= ",eid$eid";
	  $values .= ",:eid$eid";
	  isset($output[$eid]['value']) ? $params[":eid$eid"] = $output[$eid]['value'] : $params[":eid$eid"] = '';
	 }
 if ($query != '') { $query = substr($query, 1); $values = substr($values, 1); }

 try {
      // Start transaction, insert uniq elements, calculate inserted object id and insert actual object to data_<ODid> sql table
      $db->beginTransaction();
      $query = $db->prepare("INSERT INTO `uniq_$client[ODid]` ($query) VALUES ($values)");
      $query->execute($params);

      // Get last inserted object id
      $query = $db->prepare("SELECT LAST_INSERT_ID()");
      $query->execute();
      $newId = $query->fetchAll(PDO::FETCH_NUM)[0][0];

      // Prepare actual elements query
      $query  = "id,version,owner";
      $params = [':id' => $newId, ':version' => '1', ':owner' => $client['auth']];
      $values = ':id,:version,:owner';
      foreach ($client['allelements'] as $eid => $profile) if (isset($output[$eid]) && ($json = json_encode($output[$eid], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_IGNORE)) !== false)
	      {
	       $query .= ',eid'.strval($eid);
	       $params[':eid'.strval($eid)] = $json;
	       $values .= ",:eid".strval($eid);
	      }
      $query = $db->prepare("INSERT INTO `data_$client[ODid]` ($query) VALUES ($values)");
      $query->execute($params);

      $client['oId'] = $newId;
      $ruleresult = ProcessRules($db, $client, '1', '1');
      if ($ruleresult['action'] === 'Accept')
         {
          $db->commit();
	  if (isset($ruleresult['log'])) LogMessage($db, $client, $ruleresult['log']);
	  $output = ['cmd' => 'INIT'];
	  if (isset($ruleresult['message']) && $ruleresult['message']) $output['alert'] = $ruleresult['message'];
	  return;
	 }
     }
 catch (PDOException $e)
     {
      preg_match("/Duplicate entry/", $msg = $e->getMessage()) === 1 ? $ruleresult = ['message' => 'Failed to add new object: unique elements duplicate entry!'] : $ruleresult = ['message' => "Failed to add new object: $msg"];
      $ruleresult['log'] = $ruleresult['message'];
     }

 $db->rollBack();
 if ($client['ODid'] != '2' && isset($ruleresult['log'])) LogMessage($db, $client, $ruleresult['log']);
 $output = ['cmd' => '', 'alert' => $ruleresult['message']];
}

function removeDir($dir)
{
 if ($files = glob($dir.'/*')) foreach($files as $file) is_dir($file) ? removeDir($file) : unlink($file);
 rmdir($dir);
}

function DeleteObject($db, &$client, &$output)
{
 try {
      $db->beginTransaction();
      $query = $db->prepare("SELECT version FROM `data_$client[ODid]` WHERE id=$client[oId] AND lastversion=1 AND version!=0 FOR UPDATE");
      $query->execute();
      $version = $query->fetchAll(PDO::FETCH_NUM);
      if (!isset($version[0][0])) { $db->rollBack(); return []; }
      $version = $version[0][0];

      $query = $db->prepare("UPDATE `data_$client[ODid]` SET lastversion=0 WHERE id=$client[oId] AND lastversion=1");
      $query->execute();
      $query = $db->prepare("INSERT INTO `data_$client[ODid]` (id,version,lastversion,owner) VALUES ($client[oId],0,1,:owner)");
      $query->execute([':owner' => $client['auth']]);
      $query = $db->prepare("DELETE FROM `uniq_$client[ODid]` WHERE id=$client[oId]");
      $query->execute();

      $ruleresult = ProcessRules($db, $client, $version, '0');
      if ($ruleresult['action'] === 'Accept')
         {
	  $db->commit();
	  if (isset($ruleresult['log'])) LogMessage($db, $client, $ruleresult['log']);
	  $output = ['cmd' => 'DELETE'];
	  if (isset($ruleresult['message']) && $ruleresult['message']) $output['alert'] = $ruleresult['message'];
	  $dir = UPLOADDIR."$client[ODid]/$client[oId]";
	  if (is_dir($dir)) removeDir($dir);
	  if ($client['ODid'] === '1') $output['passchange'] = strval($client['oId']);
	  return;
	 }
     }
 catch (PDOException $e)
     {
      $ruleresult = ['message' => 'Failed to delete object: '.$e->getMessage()];
      $ruleresult['log'] = $ruleresult['message'];
     }

 $db->rollBack();
 if ($client['ODid'] != '2' && isset($ruleresult['log'])) LogMessage($db, $client, $ruleresult['log']);
 $output = ['cmd' => '', 'alert' => $ruleresult['message']];
}

function ParseRuleMsgElementId(&$client, $msg)
{
 if (preg_match_all('|\{\d+\}|', $msg, $matches)) foreach($matches[0] as $value)
    {
     $id = substr($value, 1, -1);
     if (isset($client[$id]['element1']['data'])) $msg = str_replace($value, $client[$id]['element1']['data'], $msg);
    }
 return $msg;
}

function ProcessRules($db, &$client, $preversion, $postversion)
{
 // Get rule profile json data
 $query = $db->prepare("SELECT JSON_EXTRACT(odprops, '$.dialog.Rule') FROM $ WHERE id='$client[ODid]'");
 $query->execute();
 $Rules = $query->fetchAll(PDO::FETCH_NUM);

 // Move on. Return default action in case of empty rule profiles or decoding error
 if (!isset($Rules[0][0]) || gettype($Rules = json_decode($Rules[0][0], true)) != 'array') return ['action' => 'Accept', 'message' => ''];
//lg($Rules);
 unset($Rules['New rule']); // Exlude service 'New rule' profile

 // Process non empty expression rules one by one
 foreach ($Rules as $rulename => $rule)
	 {
	  // Check event matching
	  $eventmatch = false;
	  foreach (preg_split("/\n/", $rule['element4']['data']) as $value)
		  {
		   $event = trim($value);
		   if (($pos = strpos($event, ' ')) === false) $pos = strlen($event);
		   $event = substr($event, 0, $pos);
		   if ($event !== $client['handlerevent']) continue;
		   $modificators = 0;
		   foreach (['Meta', 'Shift', 'Alt', 'Ctrl'] as $key => $modificator) if (stripos($value, $modificator) !== false) $modificators += pow(2, $key);
		   if (array_search($event, NOMOUSEKEYBOARDEVENTS) === false && isset($client['handlereventmodificators']) && strval($modificators) !== $client['handlereventmodificators']) continue;
		   $eventmatch = true;
		   break;
		  }
	  if (!$eventmatch) continue;

	  // Get accept/reject action
	  $action = strpos($rule['element3']['data'], '+Accept') === false ? 'Reject' : 'Accept'; // Set accept/reject action

	  // Go on. Parse rule query for predefined values
	  if (($querytext = trim($rule['element5']['data'])) === '') continue; // Query is empty? Continue
	  $querytext = str_replace(':user', $client['auth'], $querytext); // Replace with actual username inited the operation
	  $querytext = str_replace(':preversion', $preversion, $querytext); // Replace with object version before operation
	  $querytext = str_replace(':postversion', $postversion, $querytext); // Replace with object version after operation
	  $querytext = str_replace(':oid', $client['oId'], $querytext); // Replace with object id
	  $querytext = str_replace(':odtable', "`data_$client[ODid]`", $querytext); // Replace with sql table

	  // Perform a rule query
	  foreach (preg_split("/\n/", $querytext) as $querystring)
		  {
		   try { $query = $db->prepare($querystring); $query->execute(); }
		   catch (PDOException $e) { return ['action' => 'Accept', 'message' => 'Rule error: '.$e->getMessage()]; }
		   $result = $query->fetch(PDO::FETCH_NUM);
		   $query->closeCursor();
		   if (!isset($result[0]) || !$result[0] || $result[0] === '0') continue 2;
		  }

	  // Rule match occured. Return its action
	  $output = ['action' => $action, 'message' => trim($rule['element2']['data'])];

	  // Log rule message in case of approprate checkbox is set
	  if (substr($rule['element6']['data'], 0, 1) === '+') $output['log'] = "Database rule '$rulename' matches '$event' event with action '$action': '$output[message]'";
	  return $output;
	 }

 // Return default action
 return ['action' => 'Accept', 'message' => ''];
}

function SetLayoutProperties(&$client, $db = NULL)
{
 $client['layout'] = ['elements' => [], 'virtual' => [], 'undefined' => [], 'table' => []];
 $layout = &$client['layout'];
 $order = [];
 $e = 0;

 foreach (preg_split("/\n/", $client['elementselection']) as $json)
      if (($arr = json_decode($json, true, 3)) && gettype($arr) === 'array')
	 {
	  // Check object id (oid) for unset value and unset at least one of three virtual props to assume JSON as a table attributes
	  if (!isset($arr['oid']))
	  if (isset($arr['x'], $arr['y'], $arr['value']))
	     {
	      foreach ($arr as $key => $value)
		   if (gettype($value) !== 'string' || array_search($key, ['x', 'y', 'style', 'value', 'hint', 'event']) === false) unset($arr[$key]);
	      if (isset($db, $arr['x'], $arr['y'], $arr['value']))
		 {
		  if (stripos(trim($arr['value']), 'SELECT ') === 0)
		     {
		      try {
			   $query = $db->prepare($value);
			   $query->execute();
			   $value = $query->fetchAll(PDO::FETCH_NUM);
			   if (isset($value[0][0])) $arr['value'] = $value[0][0];
			  }
		      catch (PDOException $e) {}
		     }
		  $layout['virtual'][] = $arr;
		 }
	      continue;
	     }
	   else
	     {
	      unset($arr['eid']);
	      foreach ($arr as $key => $value) if (gettype($value) !== 'string') unset($arr[$key]);
	      $layout['table'] = $arr + $layout['table'];
	      continue;
	     }

	  // Retrieve correct values only
	  foreach ($arr as $key => $value)
		  if (gettype($value) !== 'string' || array_search($key, ['eid', 'oid', 'x', 'y', 'style', 'value', 'hint', 'event', 'hiderow', 'hidecol']) === false)
		     {
		      unset($arr[$key]);
		     }
		   else
		     {
		      if ($key === 'eid' || $key === 'oid' || $key === 'x' || $key === 'y' || $key === 'style') $arr[$key] = trim($value);
		     }
	  if (!count($arr)) continue;

	  // Check oid for empty value treated as underfined (style for cell with no any object element placed in)
	  if (($oid = $arr['oid']) === '')
	     {
	      if (isset($arr['style'])) $layout['undefined']['style'] = $arr['style'];
	      if (isset($arr['hiderow'])) $layout['undefined']['hiderow'] = $arr['hiderow'];
	      continue;
	     }

	  // Parse element list in eid property if set (with '*' for all elements), otherwise continue
	  if (!isset($arr['eid'])) continue;
	  $eids = [];
	  foreach (preg_split("/,/", $arr['eid']) as $value) if ($eid = trim($value))
		  if (array_search($eid, SERVICEELEMENTS) !== false || isset($client['allelements'][$eid]))
		     {
		      $eids[$eid] = true;
		      if (!isset($order[$eid])) { $order[$eid] = $e; $e++; }
		     }
		   else if ($eid === '*') foreach ($client['allelements'] as $id => $valeu)
		     {
		      $eids[$id] = true;
		      if (!isset($order[$id])) { $order[$id] = $e; $e++; }
		     }
	  if (!count($eids)) continue;

	  // If oid is a number - check the range and negative value, otherwise treat it as an expression and check for restricted vars
	  $oidnum = NULL;
	  if (ctype_digit($oid) || ($oid[0] === '-' && ctype_digit(substr($oid, 1))))
	     {
	      if (($oidnum = intval($oid)) !== TITLEOBJECTID && $oidnum !== NEWOBJECTID && $oidnum < STARTOBJECTID) continue;
	     }
	   else
	     {
	      if ($oid !== '*' && preg_match("/[^oenq\+\-\;\&\|\!\*\/0123456789\.\%\>\<\=\(\) ]/", $oid)) continue;
	     }

	  // Object id (oid) is a number or asterisk, all other values - expression. Process all elements in $eids for the specified oid
	  unset($arr['eid']);
	  foreach ($eids as $eid => $value)
		  {
		   $src = $arr;
		   if (!isset($layout['elements'][$eid])) $layout['elements'][$eid] = ['*' => [], 'expression' => [], 'order' => $order[$eid]];
		   if ($oidnum === TITLEOBJECTID)
		      {
		       if (!isset($src['value'])) $src['value'] = ($pos = array_search($eid, SERVICEELEMENTS)) === false ? $client['allelements'][$eid]['element1']['data'] : SERVICEELEMENTTITLES[$pos];
		       if (!isset($src['hint'])) $src['hint'] = array_search($eid, SERVICEELEMENTS) === false ? $client['allelements'][$eid]['element2']['data'] : '';
		      }
		   if ($oidnum === NEWOBJECTID)
		      {
		       if (!isset($src['value'])) $src['value'] = '';
		       if (!isset($src['hint'])) $src['hint'] = '';
		      }
		   if ($oid === '*' || isset($oidnum))
		      {
		       unset($src['oid']);
		       if (!isset($layout['elements'][$eid][$oid])) $layout['elements'][$eid][$oid] = [];
		       $layout['elements'][$eid][$oid] = $src + $layout['elements'][$eid][$oid];
		       continue;
		      }
		   $layout['elements'][$eid]['expression'][] = $src;
		  }
	 }
}

function getUserId($db, $user)
{
 if (gettype($user) != 'string' || $user === '') return;
 $query = $db->prepare("SELECT id FROM `uniq_1` WHERE eid1=:user");
 $query->execute([':user' => $user]);
 $id = $query->fetchAll(PDO::FETCH_NUM);
 if (isset($id[0][0])) return $id[0][0];
}

function getUserPass($db, $id)
{
 $pass = getElementProp($db, '1', $id, '1', 'password');
 if (!isset($pass) || gettype($pass) != 'string') return '';
 return $pass;
}

function getUserName($db, $id)
{
 $name = getElementProp($db, '1', $id, '1', 'value');
 if (!isset($name) || gettype($name) != 'string') return '';
 return $name;
}

function getUserGroups($db, $id)
{
 // Fetch group list extracted from user JSON
 $query = $db->prepare("SELECT JSON_EXTRACT(eid1, '$.groups') FROM `data_1` WHERE id=:id AND lastversion=1 AND version!=0");
 $query->execute([':id' => $id]);
 $groups = $query->fetchAll(PDO::FETCH_NUM);
 if (!isset($groups[0][0])) return [];
 // Convert group list to the array
 $groups = UnsetEmptyArrayElements(explode("\\n", substr($groups[0][0], 1, -1)));
 // Check group names on existed username and exlude the group in case of true
 foreach ($groups as $key => $name)
	 {
	  $query = $db->prepare("SELECT id FROM `uniq_1` WHERE eid1=:name");
	  $query->execute([':name' => $name]);
	  $group = $query->fetchAll(PDO::FETCH_NUM);
	  if (isset($group[0][0])) unset($groups[$key]);
	 }
 return $groups;
}

function UnsetEmptyArrayElements($arr)
{
 if (!is_array($arr)) return []; // Return empty array in case of wrong input
 foreach ($arr as $key => $value) if ($value === '' || gettype($value) != 'string') unset($arr[$key]);
 return $arr;
}

function getUserODAddPermission($db, $id)
{
 $query = $db->prepare("SELECT JSON_EXTRACT(eid1, '$.odaddperm') FROM `data_1` WHERE id=:id AND lastversion=1 AND version!=0");
 $query->execute([':id' => $id]);
 $odaddperm = $query->fetchAll(PDO::FETCH_NUM);
 if (isset($odaddperm[0][0])) return substr($odaddperm[0][0], 1, -1);
 return '';
}

function getUserProps($db, $id, $props)
{
 if (gettype($props) !== 'array' || !count($props)) return [];
 $query = '';
 foreach ($props as $prop) $query .= "JSON_UNQUOTE(JSON_EXTRACT(eid1, '$.$prop')) as $prop,";
 $query = substr($query, 0, -1);

 $query = $db->prepare("SELECT $query FROM `data_1` WHERE id=:id AND lastversion=1 AND version!=0");
 $query->execute([':id' => $id]);
 $data = $query->fetchAll(PDO::FETCH_ASSOC);
 if (isset($data[0])) return $data[0];
 return [];
}

function getUserCustomization($db, $uid)
{
 $customization = json_decode(getElementProp($db, '1', $uid, '6', 'dialog'), true); // Get current user JSON customization and decode it
 if (($error = json_last_error_msg()) !== 'No error') return $error;

 // If current user customization forces to use another user customization, and the user doesn't point to itself and does exist - get it
 if (($forceuser = $customization['pad']['application']['element3']['data']) != '' && $forceuser != 'system' && ($forceuser = getUserId($db, $forceuser)))
 if (isset($forceuser) && $uid != $forceuser)
    {
     $forceuser = json_decode(getElementProp($db, '1', $forceuser, '6', 'dialog'), true);
     if (isset($forceuser)) return $forceuser;
    }

 return $customization;
}

function getLoginDialogData($title = '')
{
 if (!$title) $title = "\nUsername";
 return [
	 'title'   => 'Login',
	 'dialog'  => ['pad' => ['profile' => ['element1' => ['head' => $title, 'type' => 'text'], 'element2' => ['head' => 'Password', 'type' => 'password']]]],
	 'buttons' => ['LOGIN' => ['value' => 'LOGIN', 'call' => 'LOGIN', 'enterkey' => '']],
	 'flags'   => ['style' => 'min-width: 350px; min-height: 140px; max-width: 1500px; max-height: 500px;']
	];
}

function LogMessage($db, &$client, $log)
{
 $msg = '';
 if (isset($client['auth']) && $client['auth']) $msg .= "USER: '$client[auth]', ";
 if (isset($client['OD']) && $client['OD']) $msg .= "OD: '$client[OD]', OV: '$client[OV]', ";
 if (isset($client['oId']) && $client['oId']) $msg .= "OBJECT ID: '$client[oId]', ";
 if (isset($client['eId']) && $client['eId']) $msg .= "ELEMENT ID: '$client[eId]', ";

 if ($msg != '') $msg = '[ '.substr($msg, 0, -2).' ] ';
 lg($msg .= $log);

 $_client = ['ODid' => '2', 'OVid' => '1', 'OD' => 'Logs', 'OV' => 'All logs', 'allelements' => ['1' => ''], 'uniqelements' => [], 'params' => []];
 isset($client['auth']) ? $_client['auth'] = $client['auth'] : $_client['auth'] = 'system';
 $output = ['1' => ['cmd' => 'RESET', 'value' => $msg] + DEFAULTELEMENTPROPS];

 AddObject($db, $_client, $output);
 $query = $db->prepare("INSERT INTO `$$` (client) VALUES (:client)");
 $query->execute([':client' => json_encode($output + $_client, JSON_HEX_APOS | JSON_HEX_QUOT | JSON_INVALID_UTF8_IGNORE)]);
}




function LinkNamesStringToArray($names)
{
 // Initing link names array
 $linknames = [];
 // Calculating delimiter
 (($posAND = strpos($names, '/')) !== false && (($posOR = strpos($names, '|')) === false || $posOR > $posAND)) ? $delimiter = '/' : $delimiter = '|';
 // Calculating link names separated by delimiter
 foreach (preg_split("/\\".$delimiter."/", $names) as $name) if (trim($name)) $linknames[] = trim($name);
 // Set empty key flag for delimiter '/'
 if ($linknames !== [] && $delimiter === '/') $linknames[''] = '';
 return $linknames;
}


function CopyArrayElements(&$from, &$to, $props)
{
 foreach ($props as $value) isset($from[$value]) ? $to[$value] = $from[$value] : $to[$value] = '';
}

function cutKeys(&$arr, $keys) // Function cuts all keys of array $arr except of keys defined in $keys array
{
 foreach ($arr as $key => $value) if (array_search($key, $keys) === false) unset($arr[$key]);
}

function CopyKeys(&$arr, $keys)
{
 $result = [];
 foreach ($keys as $value) if (isset($arr[$value])) $result[$value] = $arr[$value];
 return $result;
}

function CreateTree($db, &$client, $oid, &$data, $cmd)
{
 // Init head object and all tree objects global array for loop detection at the 1st entry
 if ($oid === 0)
    {
     $client['objects'] = [];
     $client['tree'] = [];
     if (!($oid = GetHeadId($db, $client))) return;
     $client['objects'][$oid] = true;
     $data = ['link' => []]; // Init tree with head object
     if (isset($client['elementselection']['call'])) $data['oid'] = $oid; // If call prop is set - place oid for tree element to retreive params after user call
     switch ($cmd) // Process command
	    {
	     case 'TABLE':
		  GetObjectData($db, $client, $oid);
		  break;
	     case 'SEARCH':
		  GetObjectSearchData($db, $client, $oid);
		  break;
	     case 'TREE':
		  $data['content'] = [[], []];
		  GetTreeElementContent($db, $client, $data['content'], $oid);
		  $data['class'] = 'treeelement';
		  break;
	     case 'EXISTENCE':
		  if ($client['oId'] === $oid) return;
		  break;
	    }
    }

 // Tree search is finished?
 if ((isset($client['treelastnode']) && $client['treelastnode'] === $oid) || (!isset($client['treelastnode']) && $cmd === 'EXISTENCE' && $client['oId'] === $oid) || ($cmd === 'SEARCH' && !$client['limit'])) return true;

 // Get object all element link and value props
 if (!($count = count($object = GetObjectElementLinksArray($db, $client, $oid)))) return;

 // Get through all elements matched link names
 $linknames = $client['linknames'];
 for ($i = 0; $i < $count; $i += 3)
 foreach (LinkMatch($linknames, $object[$i + 1]) as $value)
	 {
	  // Generate tree content
	  if ($cmd === 'TREE') $content = [ ['id' => $object[$i], 'title' => $client['allelements'][$object[$i]]['element1']['data'], 'value' => $object[$i + 2]], ['id' => $value[0], 'title' => GetELementTitle($value[0], $client['allelements'])] ];

	  // Search uplink object id
	  try {
	       $query = $db->prepare("SELECT id FROM `data_$client[ODid]` WHERE lastversion=1 AND version!=0 AND $value[1] LIMIT 1");
	       $query->execute();
	      }
	  catch (PDOException $e) // Syntax error? Make virtual error node with error message as a content
	      {
	       if ($cmd === 'TREE') // Each $data (for cmd=TREE) array element is class (content css class name), content (elemnt list and its values) and link (array of uplink nodes): ['link' => [nodes array], 'content' => [eid, etitle, evalue], 'class' => '']
		  {
		   $content[2]['value'] = "Link syntax error: '$value[1]'";
		   $data['link'][] = ['content' => $content, 'class' => 'treeerror'];
		  }
	       continue; // Go to next uplink object search via $select
	      }

	  // Uplink object not found? Make virtual error node with error message as a content and continue
	  $uplinkoid = $query->fetch(PDO::FETCH_NUM);
	  $query->closeCursor();
	  if (!isset($uplinkoid[0]))
	     {
	      if ($cmd === 'TREE')
		  {
	           $content[2]['value'] = "Link points to nonexistent object: '$value[1]'";
		   $data['link'][] = ['content' => $content, 'class' => 'treeerror'];
		  }
	      continue;
	     }

	  // Check loop via uplink object id existence in $objects array that consists of object ids already in the tree. Continue if exists, otherwise remember uplink object id in $objects array
	  if (isset($client['objects'][$uplinkoid = $uplinkoid[0]]))
	     {
	      if ($cmd === 'TREE')
		  {
		   //$content[2]['value'] = "Loop from object id $oid to me [object id $uplinkoid]!";
		   $data['link'][] = ['content' => $content, 'class' => 'treeerror'];
		    $index = array_key_last($data['link']);
		    if (isset($client['elementselection']['call'])) $data['link'][$index]['oid'] = $uplinkoid; // If call prop is set - place oid for tree element to retreive params after user call
		    GetTreeElementContent($db, $client, $data['link'][$index]['content'], $uplinkoid);
		  }
	      continue;
	     }

	  // Remember uplink object id for loop detection
	  $client['objects'][$uplinkoid] = true;

	  // Build tree element and define uplink node tree via recursive function call
	  $data['link'][] = ['link' => []];
	  $index = array_key_last($data['link']);
	  if (($result = CreateTree($db, $client, $uplinkoid, $data['link'][$index], $cmd)) && isset($client['treelastnode']))
	     {
	      DeleteTree($data['link'], $client['objects'], $index);
	      $data['link'] = [$data['link'][$index]];
	      $index = 0;
	     }
	  switch ($cmd)
		 {
		  case 'TABLE':
		       if ($result || !isset($client['treelastnode'])) GetObjectData($db, $client, $uplinkoid);
		       break;
		  case 'SEARCH':
		       if ($result || !isset($client['treelastnode'])) GetObjectSearchData($db, $client, $uplinkoid);
		       break;
		  case 'TREE':
		       $data['link'][$index] += ['content' => $content, 'class' => 'treeelement'];
		       if (isset($client['elementselection']['call'])) $data['link'][$index]['oid'] = $uplinkoid; // If call prop is set - place oid for tree element to retreive params after user call
		       GetTreeElementContent($db, $client, $data['link'][$index]['content'], $uplinkoid);
		       break;
		 }
	  if ($result) return true;
	 }
}

function GetObjectSearchData($db, &$client, $oid)
{
 if (!$client['limit']) return;

 try {
      $query = $db->prepare("SELECT $client[select] FROM (SELECT * FROM `data_$client[ODid]` WHERE id=$oid AND lastversion=1 AND version!=0) _ WHERE $client[selection]");
      $query->execute();
      $object = $query->fetchAll(PDO::FETCH_NUM);
      if (isset($object[0]))
	 {
	  $client['tree'][] = $object[0];
	  $client['limit'] --;
	 }
     }
 catch (PDOException $e) {}
}

function GetObjectData($db, &$client, $oid)
{
 try {
      $query = $db->prepare("SELECT $client[elementquery] FROM `data_$client[ODid]` WHERE id=$oid AND lastversion=1 AND version!=0");
      $query->execute();
      $object = $query->fetchAll(PDO::FETCH_ASSOC);
      if (isset($object[0])) $client['tree'][] = $object[0];
     }
 catch (PDOException $e) {}
}

function DeleteTree(&$tree, &$objects, $index = NULL)
{
 foreach ($tree as $key => $value)
	 {
	  if ($key === $index) continue;
	  unset($objects[$value['oid']]);
	  DeleteTree($value['link'], $objects);
	 }
}

function GetHeadId($db, &$client)
{
 $selection = preg_split("/\n/", $client['objectselection']);
 if (gettype($selection) !== 'array') return;

 unset($client['treelastnode']);
 if (isset($selection[1]))
    {
     $client['objectselection'] = $selection[1];
     $client['treelastnode'] = GetHead($db, $client);
    }

 $client['objectselection'] = $selection[0];
 return GetHead($db, $client);
}

function GetHead($db, &$client)
{
 // Execute object selection data from OD to get first found object to build the tree from
 try {
      $query = $db->prepare("SELECT id,version,lastversion FROM `data_$client[ODid]` $client[objectselection]");
      $query->execute();
     }
 catch (PDOException $e)
     {
      return;
     }

 // Get 1st found real object
 while ($head = $query->fetch(PDO::FETCH_ASSOC))
       if (isset($head['id']) && $head['lastversion'] === '1' && $head['version'] !== '0')
	  {
	   $query->closeCursor();
	   return $head['id'];
	  }
}

function LinkMatch(&$linknames, $linkprop)
{
 if (gettype($linkprop) !== 'string' || !$linkprop) return [];
 $links = []; // Array of [<remote element id>, <uplink object selection>]

 // Calculate matched link names (via '|' or '/') list to element link prop
 foreach (preg_split("/\n/", $linkprop) as $value)
	 {
	  if (!trim($value) || gettype($last = preg_split("/\|/", $value, 3)) !== 'array') continue; // Is linkprop line splited to 2 or 3 elements?
	  if (count($last) !== 3) continue; // All fields are defined
	  if (in_array(trim($last[0]), $linknames))
	     {
	      $links[] = [trim($last[1]), trim($last[2])]; // Check linprop link names to match view props link names
	      if (isset($linknames[''])) $linknames = [trim($last[0])]; // Reset linknames array to use $last[0] as 1st found link name for other object element links (for '/' divided names, with key '' set, only)
	     }
	 }

 // Return matched links result array
 return $links;
}

function GetObjectElementLinksArray($db, &$client, $oid)
{
 // Build a query for all elements to fetch their link and value props
 $query = '';
 foreach ($client['allelements'] as $eid => $element)
	 $query .= "$eid, JSON_UNQUOTE(JSON_EXTRACT(eid$eid, '$.link')), JSON_UNQUOTE(JSON_EXTRACT(eid$eid, '$.value')), ";
 if (!$query) return [];
 $query = substr($query, 0, -2);

 // Execute the query
 try {
      $query = $db->prepare("SELECT $query FROM `data_$client[ODid]` WHERE id=$oid AND lastversion=1 AND version!=0");
      $query->execute();
      $object = $query->fetchAll(PDO::FETCH_NUM);
     }
 catch (PDOException $e)
     {
      unset($object);
     }

 // Return result array of object all element link and value props
 if (isset($object[0][0])) return $object[0];
 return []; // No fetched object? Return empty array
}

function GetTreeElementContent($db, &$client, &$content, $oid)
{
 // Content is array of object elements: [<downlink node linked object element>, <local node linked object element>, <first layout element of local node>, <second..>]
 // Each array element consists of three props: element identificator, its title and value

 // First go through all elements in the layout and put them to the content
 foreach ($client['elementselection'] as $eid => $value)
	 if ($eid != 'rotate' && $eid != 'call') $content[] = ['id' => $eid, 'title' => GetElementTitle($eid, $client['allelements'])];

 // Make query string to select element values from DB
 $query = '';
 foreach ($content as $key => $e) if ($key)
	 {
	  if (!isset($e['id'])) $query .= 'NULL,';
	   elseif (array_search($e['id'], SERVICEELEMENTS) !== false) $query .= $e['id'].',';
	   elseif (!isset($client['allelements'][$e['id']])) $query .= 'NULL,';
	   else $query .= 'JSON_UNQUOTE(JSON_EXTRACT(eid'.$e['id'].", '$.value')),";
	 }

 // Select prepared elements above from object id $oid and put them to content array begining from index 1.
 try {
      $query = $db->prepare('SELECT '.substr($query, 0, -1)." FROM `data_$client[ODid]` WHERE lastversion=1 AND version!=0 AND id=$oid");
      $query->execute();
      foreach ($query->fetch(PDO::FETCH_NUM) as $key => $value) $value ? $content[$key + 1]['value'] = $value : $content[$key + 1]['value'] = '';
     }
 catch (PDOException $e)
     {
      lg($e);
     }
}

function GetElementTitle($eid, &$allelements)
{
 if (isset($allelements[$eid])) $title = $allelements[$eid]['element1']['data'];
  elseif (array_search($eid, SERVICEELEMENTS) !== false) $title = $eid;
  else  $title = '';

 return $title;
}

function IsDirNotEmpty($dir)
{
 if (is_dir($dir)) foreach (scandir($dir) as $name) if ($name !== '.' && $name !== '..') return true;
 return false;
}

function RangeTest($a, $b)
{
 $c = count($b);
 for ($i = 0; $i < $c; $i += 2)
     if ($a >= $b[$i] && $a <= $b[$i+1]) return true;
 return false;
}

function SplitCronLine($cronline)
{
 if (($cronline = trim($cronline)) === '') return false; // Cron line is empty? Return empty array
 $cronline = explode(' ', $cronline); // Split cron line fields
 $cron = [];

 foreach ($cronline as $key => $value)
      if (count($cron) < count(CRONLINEFIELDS))
         {
          if (trim($value)) $cron[] = trim($value);     // Datetime and vid fields
         }
       else
         {
          isset($cron[count(CRONLINEFIELDS) - 1]) ? $cron[count(CRONLINEFIELDS) - 1] .= ' '.$value : $cron[count(CRONLINEFIELDS) - 1] = $value ; // Command line field
         }

 if (!isset($cron[count(CRONLINEFIELDS) - 1]) || !$cron[count(CRONLINEFIELDS) - 1]) return false;

 return $cron;
}

function ExecWrapper(&$client, $wait = false)
{
 $wait = $wait ? '' : ' &';
 $now = strval(strtotime("now"));
 // old version: exec(WRAPPERBINARY." '$client[uid]' ".strval(strtotime("now"))." '$client[ODid]' '$client[OVid]' '$client[oId]' '$client[eId]' '$client[cmd]' '$client[ip]' '".json_encode($client, JSON_HEX_APOS | JSON_HEX_QUOT)."' >/dev/null");
 exec(PHPBINARY.' '.APPDIR.WRAPPERCMD." '$client[ODid]' '$client[OVid]' '$client[eId]' '$client[cmdline]' '$client[oId]' '$client[cmd]' '$client[uid]' '$client[ip]' '$now' '".json_encode($client, JSON_HEX_APOS | JSON_HEX_QUOT | JSON_INVALID_UTF8_IGNORE)."' >/dev/null$wait");
}

function GetCMD($db, &$client)
{
 // Caclulate incoming client event modificator keys
 if ($client['cmd'] === 'DOUBLECLICK')
    {
     $event = 'DOUBLECLICK';
     $modificators = $client['data'];
     $client['data'] = '';
    }
  else if (ctype_digit($client['cmd']))
    {
     $event = intval($client['cmd']) & 255;
     $modificators = strval((intval($client['cmd']) & 65280) / 256);
    }
  else
    {
     $event = $client['cmd'];
    }

 foreach ($client['allelements'][$client['eId']] as $key => $value)
	 {
	  $eid = intval(substr($key, 7)); // Calculate interface element id number
	  if ($eid < 11 || !($eid % 2)) continue; // Then check it to be more than 10 and odd
	  if (isset($modificators) && $modificators !== $value['modificators']) continue; // Check Ctrl, Alt, Shift, Meta modificators match if exist
	  $client['handlereventmodificators'] = $value['modificators']; // Fix modificators value

	  if ($event === ($elementevent = $value['event'])) // Exact event match
	  if ($event === 'SCHEDULE') // For 'SCHEDULE' event retrieve command line from specified text line of crontab text area, for others - cmd line is an dialog interface text area value
	     {
	      $cmdline = preg_split("/\n/", $value['data']); // Split "crontab" text area line by line first
	      if (!isset($cmdline[$client['cmdline']])) return; //  Specified text line of crontab does not exist? Return NULL
	      $cmdline = $cmdline[$client['cmdline']]; // Retrieve specified cron line
	      if (!($cron = SplitCronLine($cmdline))) return; // Split cron line to retrieve effective command line
	      $client['handlercmdline'] = $cmdline = $cron[count(CRONLINEFIELDS) - 1]; // Fix command line
	      $client['handlermode'] = $client['allelements'][$client['eId']]['element'.strval($eid - 1)]['data']; // and corresponded handler mode output
	      $client['handlerevent'] = $elementevent;
	      break;
	     }
	   else
	     {
	      $client['handlercmdline'] = $cmdline = $value['data'];
	      $client['handlermode'] = $client['allelements'][$client['eId']]['element'.strval($eid - 1)]['data'];
	      $client['handlerevent'] = $elementevent;
	      break;
	     }

	  if (gettype($event) !== 'integer') continue; // No key down event? Continue

	  if (!(($i = array_search($event, USEREVENTKEYCODES)) === false) && USEREVENTCODES[$i] === $elementevent) // Exact key event match
	     {
	      $client['handlercmdline'] = $cmdline = $value['data'];
	      $client['handlermode'] = $client['allelements'][$client['eId']]['element'.strval($eid - 1)]['data'];
	      $client['handlerevent'] = $elementevent;
	      break;
	     }
	
	  if ($elementevent === 'KEYPRESS' && RangeTest($event, KEYCODESYMBOLRANGES))
	     {
	      $client['handlercmdline'] = $cmdline = $value['data']; // May be symbol key to match KEYPRESS
	      $client['handlermode'] = $client['allelements'][$client['eId']]['element'.strval($eid - 1)]['data'];
	      $client['handlerevent'] = $elementevent;
	     }
	 }

 // Check result command line
 if (!isset($cmdline) || !($len = strlen($cmdline))) return;
 $i = -1;
 $newcmdline = '';

 // Return only defined command line string in case of unset db var
 if (!$db) return true;

 // Otherwise calc effective cmd line parsing its args to replace
 while (++$i < $len)
       {
	if (($add = $cmdline[$i]) === "'" && ($j = strpos($cmdline, "'", $i + 1)) !== false)
	   {
	    $newcmdline .= "'".substr($cmdline, $i + 1, $j - $i - 1)."'";
	    $i = $j;
	    continue;
	   }
        if ($add === '>') continue;
	if ($add === '<')
	   {
	    $double = 0;
	    if ($cmdline[$i + 1] === '<') $double = 1;
	    $i += $double;
	    if (($j = strpos($cmdline, '>'.($double ? '>' : ''), $i + 1)) === false) continue;

	    switch ($match = substr($cmdline, $i + 1, $j - $i - 1))
		   {
		    case 'data':		$add = QuoteArg($client['data'], $double); break;
		    case 'user':		$add = QuoteArg($client['auth'], $double); break;
		    case 'dir':			$add = QuoteArg(UPLOADDIR.$client['ODid'].'/'.$client['oId'].'/'.$client['eId'].'/', $double); break;
		    case 'oid':			$add = QuoteArg($client['oId'], $double); break;
		    case 'odid':		$add = QuoteArg($client['ODid'], $double); break;
		    case 'ovid':		$add = QuoteArg($client['OVid'], $double); break;
		    case 'od':			$add = QuoteArg($client['OD'], $double); break;
		    case 'ov':			$add = QuoteArg($client['OV'], $double); break;
		    case 'event':		$add = QuoteArg($client['handlerevent'], $double); break;
		    case 'modificators':	$add = QuoteArg($client['handlereventmodificators'], $double); break;
		    case 'title':		$add = QuoteArg($client['allelements'][$client['eId']]['element1']['data'], $double); break;
		    case 'datetime':		$datetime = new DateTime(); $add = QuoteArg($datetime->format('Y-m-d H:i:s'), $double); break;
		    default:			if (gettype($add = json_decode($match, true)) === 'array')
						   {
						    $add = QuoteArg(GetElementProperty($db, $add, $client, 0), $double);
						   }
						 else
						   {
						    $add = $double ? QuoteArg("<<$match>>", false) : QuoteArg("<$match>", false); // Quote pair single/double angle brackets to avoid stdin/stdout
						   }
		   }
	    $i = $j + $double;
	   }
       $newcmdline .= $add;
      }

 // Fix modified command line and return true
 $client['handlercmdlineeffective'] = $newcmdline;
 return true;
}

function QuoteArg($string, $double)
{
 if (!$double) return "'".str_replace("'", "'".'"'."'".'"'."'", $string)."'";
 return $string;
}

function GetObjectSelection($objectSelection, $params, $user, $anyway = false)
{
 // Check input paramValues array and add reserved :user parameter value
 if (gettype($objectSelection) != 'string' || ($objectSelection = trim($objectSelection)) === '') return DEFAULTOBJECTSELECTION;
 $i = -1;
 $len = strlen($objectSelection);
 if (gettype($params) != 'array') $params = [];
 $params[':user'] = $user;
 $isDialog = false;
 $objectSelectionNew = '';
 $objectSelectionParamsDialogProfiles = [];

 // Check $objectSelection every char and retrieve params in non-quoted substrings started with ':' and finished with space or another ':'
 while  (++$i <= $len)
     // Parameter delimiter char (single/double quote, colon or space) detected
     if ($i === $len || $objectSelection[$i] === '"' || $objectSelection[$i] === "'" || $objectSelection[$i] === ':' || $objectSelection[$i] === ' ' || $objectSelection[$i] === '\\' || $objectSelection[$i] === "\n")
	{
	 if (isset($newparam))
	 if (isset($params[$newparam])) // Object selection input parameter key does exist? Do code below
	    {
	     // Add appropriate dialog element (html <input>) for the new parameter with existing parameter data
	     $objectSelectionParamsDialogProfiles[$newparam] = ['head' => "\n".str_replace('_', ' ', substr($newparam, 1)).':', 'type' => 'text', 'data' => $params[$newparam]];
	     if (!$isDialog) $objectSelectionNew .= $params[$newparam]; // Insert appropriate pramater value to object selection
	    }
	  else // Otherwise dialog is required, so add appropriate dialog element (html <input>) for the new parameter with empty data
	    {
	     $objectSelectionParamsDialogProfiles[$newparam] = ['head' => "\n".str_replace('_', ' ', substr($newparam, 1)).':', 'type' => 'text', 'data' => ''];
	     $isDialog = true;
	    }
	 if ($i === $len) break; // Break in case of end line
	 $newparam = NULL;	 // No new paramter for default
	 $objectSelection[$i] === ':' ? $newparam = ':' : $objectSelectionNew .= $objectSelection[$i]; // Char ':' starts new param, otherwise just record current char to the object selection string
	}
      else if (isset($newparam)) $newparam .= $objectSelection[$i]; // Otherwise: if new parameter is being setting - record current char
      else $objectSelectionNew .= $objectSelection[$i]; // Otherwise record current char to the object selection string

 //  In case of no dialog (or anyway flag set) - return object selection string
 if (!$isDialog || $anyway) return $objectSelectionNew;

 // Otherwise return dialog array
 $buttons = OKCANCEL;
 $buttons['OK']['call'] = 'CALL';
 $buttons['CANCEL']['error'] = 'View output has been canceled';
 return [
	 'title'   => 'Object View parameters',
	 'dialog'  => ['pad' => ['profile' => $objectSelectionParamsDialogProfiles]],
	 'buttons' => $buttons,
	 'flags'   => ['style' => 'min-width: 350px; min-height: 140px; max-width: 1500px; max-height: 500px;', 'esc' => '']
	];
}
