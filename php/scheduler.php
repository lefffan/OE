<?php

/******************************************************************************************************
field         allowed values
-----         --------------
minute        0-59
hour          0-23
day of month  1-31
month         1-12
day of week   0-7 (0 or 7 is Sunday)

A field may be an asterisk (*), which always stands for 'first-last'. Ranges of numbers are allowed.
Ranges are two numbers separated with a hyphen. The specified range is inclusive. For example, 8-11
for an 'hours' entry specifies execution at hours 8, 9, 10 and 11.
Lists are allowed.  A list is a set of numbers (or ranges) separated by commas.
Examples: '1,2,5,9', '0-4,8-12'.
Step values can be used in conjunction with ranges.  Following a range with '/<number>' specifies
skips of the number's value through the range.
For example, '0-3/2' can be used in the hours field to specify 0,2 hours execution.
******************************************************************************************************/

require_once 'core.php';

function CompareCronField($cronfield, $nowvalue)
{
 if ($cronfield === '*') return true;

 foreach (explode(',', $cronfield) as $value)		// Split cron field on ','
      if (($pos = strpos($value, '/')) !== false)	// Step value?
	 {
	  if (strlen($value) > $pos + 1)		// Some chars after slash?
	  if (CompareCronField(substr($value, 0, $pos), $nowvalue)) // Compare string before the slash
	  if ($nowvalue % intval(substr($value, $pos + 1)) === 0) return true; // and in case of match - test on remainder of division
	 }
       else
	 {
	  if (($pos = strpos($value, '-')) === false && $value === strval($nowvalue)) return true; // No range and exact match?
	  if ($pos !== false && $nowvalue >= intval(substr($value, 0, $pos)) && $nowvalue <= intval(substr($value, $pos + 1))) return true; // Range and match in the range?
	 }

 return false; // No any match? Return false
}

while (true)
{
 $now = getdate(); // [ 'seconds' => 16, 'minutes' => 30, 'hours' => 2, 'mday' => 11, 'wday' => 0, 'mon' => 4, 'year' => 2021, 'yday' => 100, 'weekday' => 'Sunday', 'month' => 'April', 0 => 1618108216 ]
 $query = $db->prepare("SELECT JSON_EXTRACT(odprops, '$.dialog.View') as views,odname,JSON_EXTRACT(odprops, '$.dialog.Element') as elements,id FROM $");
 $query->execute();

 foreach ($query->fetchAll(PDO::FETCH_ASSOC) as $od) // Go through all OD structures
	 {
	  $elements = json_decode($od['elements'], true); // Decode current OD structure Element section
	  if (gettype($elements) !== 'array') continue; // Continue if error
	  foreach ($elements as $key => $element) if ($key != 'New element') // Go trough all element profiles except 'New element'
	  foreach ($element as $interface) if (isset($interface['event']) && $interface['event'] === 'SCHEDULE') // Go through all dialog interface elements for the SCHEDULE event
	  foreach (preg_split("/\n/", $interface['data']) as $line => $cronline) // Go through all text lines of SCHEDULE event text area data
		  {
		   // Incorrect cron line? Continue, otherwise exec 'schedulerwrapper' with next args: <uniq code> <$od['id']> <$cron[count(CRONLINEFIELDS) - 2]> <$element['element1']['id'] = ''> <$cron[count(CRONLINEFIELDS) - 3]>;
		   if (!($cron = SplitCronLine($cronline))) continue;
		   // Check datetime parameters match
		   for ($i = 0; $i < count(CRONLINEFIELDS) - 3; $i++) if (!CompareCronField($cron[$i], $now[CRONLINEFIELDS[$i]])) break 2;
		   // Check correctness of queue and view id cron fields
		   if (!ctype_digit($cron[count(CRONLINEFIELDS) - 2]) || !ctype_digit($cron[count(CRONLINEFIELDS) - 3])) continue;
		   $queue = max(1, intval($cron[count(CRONLINEFIELDS) - 3]));
		   $queue = strval(min($queue, QUEUEWRAPPERSMAX));
		   // Current scheduler id loader does already exist? Continue
		   $output = [];
		   $schedulerwrapperargs = SCHEDULERID.' '.$od['id'].' '.$cron[count(CRONLINEFIELDS) - 2].' '.$element['element1']['id'].' '.$line.' '.$queue;
		   exec(SEARCHPROCESSCMD." '".$schedulerwrapperargs."'", $output);
		   if (count($output))
		      {
		       $client = [];
		       LogMessage($db, $client, "Failed to launch scheduler task (OD id $od[id], element id ".$element['element1']['id'].", cron line ".strval($line + 1).": previous one is not completed yet!");
		       continue;
		      }
		   // Execute current scheduler id loader with next args: <scheduler id> <OD id> <OV id> <eid> <crontab line>
		   exec(PHPBINARY.' '.APPDIR.SCHEDULERWRAPPERCMD.' '.$schedulerwrapperargs.' >/dev/null &');
		  }
	 }

 $finish = getdate();
 if ($finish['minutes'] === $now['minutes'] && $finish['hours'] === $now['hours']) sleep(60 - $finish['seconds']);
}
