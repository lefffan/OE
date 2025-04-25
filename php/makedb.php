<?php
// Be aware of removing old ODs by using that script

require_once 'core.php';
require_once HANDLERDIR.'customizationjson.php';

try {
     //------------------------------------------Dropping old shit------------------------------------------
     $query = $db->prepare("drop database ".DATABASENAME."; create database ".DATABASENAME."; use ".DATABASENAME);
     $query->execute();



     //------------------------------------------Create initial DBs------------------------------------------
     // Create OV request list sql table with next fields: id,time,ODid,OV
     $query = $db->prepare("CREATE TABLE `$$$` (id CHAR(".USERPASSMINLENGTH.") NOT NULL, time DATETIME DEFAULT NOW(), client MEDIUMTEXT, PRIMARY KEY (id)) ENGINE InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
     $query->execute();

     // Create queue sql table with next fields: id,cid,ODid,OV,oid,eid,event
     $query = $db->prepare("CREATE TABLE `$$` (id MEDIUMINT NOT NULL AUTO_INCREMENT, client MEDIUMTEXT, PRIMARY KEY (id)) ENGINE InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
     $query->execute();

     // Create OD list data sql table
     $query = $db->prepare("CREATE TABLE `$` (id MEDIUMINT NOT NULL AUTO_INCREMENT, odname CHAR(".strval(ODSTRINGMAXCHAR).") NOT NULL, odprops JSON, UNIQUE(odname), PRIMARY KEY (id)) ENGINE InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
     $query->execute();



     //------------------------------------------Create default OD 'Users'------------------------------------------
     initNewODDialogElements();
     $newProperties['element1']['data'] = 'Users';
     $newProperties['element2']['data'] = 'Application users database';
     $newProperties['element6']['data'] = "+User/group list allowed to change 'Database' section|Disallowed list (allowed for others)|";
     $newProperties['element8']['data'] = "+User/group list allowed to change 'Element' section|Disallowed list (allowed for others)|";
     $newProperties['element10']['data'] = "+User/group list allowed to change 'View' section|Disallowed list (allowed for others)|";
     $newProperties['element12']['data'] = "+User/group list allowed to change 'Rule' section|Disallowed list (allowed for others)|";
     $newProperties['element7']['data'] = $newProperties['element9']['data'] = $newProperties['element11']['data'] = $newProperties['element13']['data'] = "root\nsoa\nam\nvsp\nkia\nkvv\n";
     $userOD = ['title'  => 'Edit Object Database Structure', 'dialog' => ['Database' => ['Properties' => $newProperties], 'Element' => ['New element' => $newElement], 'View' => ['New view' => $newView], 'Rule' => ['New rule' => $newRule]], 'buttons' => SAVECANCEL, 'flags'  => ['style' => 'width: 860px; height: 720px;', 'esc' => '', 'profilehead' => ['Element' => "Select element", 'View' => "Select view", 'Rule' => "Select rule"]]];
     $userOD['buttons']['SAVE']['call'] = 'Database Configuration';
     $userOD['dialog']['Element']['New element']['element1']['id'] = '7';
     $userOD['dialog']['View']['New view']['element1']['id'] = '4';

     $newView['element1']['id'] = '1';
     $newView['element1']['head'] = "View (id1) name";
     $newView['element1']['data'] = 'All users';
     $newView['element6']['data'] = ' *';
     $userOD['dialog']['View']['All users'] = $newView;

     $newView['element1']['id'] = '2';
     $newView['element1']['head'] = "View (id2) name";
     $newView['element1']['data'] = '_history';
     $newView['element4']['data'] = "WHERE id=':id'";
     $newView['element6']['data'] = 'version,datetime,owner,*';
     $userOD['dialog']['View']['_history'] = $newView;

     $newView['element1']['id'] = '3';
     $newView['element1']['head'] = "View (id3) name";
     $newView['element1']['data'] = 'My account';
     $newView['element4']['data'] = "WHERE lastversion=1 AND version!=0 AND JSON_UNQUOTE(JSON_EXTRACT(eid1, '$.value'))=':user'";
     $newView['element6']['data'] = '*'."\n".'{"eid":"1", "oid":"1", "hint":"Double click the username to change the password"}';
     $userOD['dialog']['View']['My account'] = $newView;

     $newRule['element1']['data'] = 'write restrict';
     $newRule['element2']['data'] = 'You can modify only your own account!';
     $newRule['element3']['data'] = 'Accept|+Reject|';
     $newRule['element4']['data'] = "INIT\nCHANGE";
     $newRule['element5']['data'] = "SELECT 1 FROM :odtable WHERE id=:oid and version=:postversion and JSON_UNQUOTE(JSON_EXTRACT(eid1, '$.value'))!=':user' AND ':user'!='root'";
     $userOD['dialog']['Rule']['write restrict'] = $newRule;


     $newElement['element1']['id'] = '1';
     $newElement['element1']['data'] = 'User';
     $newElement['element2']['data'] = '';
     $newElement['element3']['data'] = UNIQELEMENTTYPE;
     $newElement['element3']['readonly'] = '';
     // INIT, F2, CONFIRMDIALOG..
     CreateHandlerSection(10, 'INIT', '', PHPBINARY.' '.HANDLERDIR.'user.php <event> <data>');
     CreateHandlerSection(12, 'DOUBLECLICK', 'NONE', PHPBINARY.' '.HANDLERDIR.'user.php EDIT <{}> <{"prop":"odaddperm"}> <{"prop":"groups"}> <user> <{"prop":"odvisible"}> <{"prop":"odvisiblelist"}> <{"prop":"odwrite"}> <{"prop":"odwritelist"}>');
     CreateHandlerSection(14, 'F2', 'NONE', PHPBINARY.' '.HANDLERDIR.'user.php EDIT <{}> <{"prop":"odaddperm"}> <{"prop":"groups"}> <user> <{"prop":"odvisible"}> <{"prop":"odvisiblelist"}> <{"prop":"odwrite"}> <{"prop":"odwritelist"}>');
     CreateHandlerSection(16, 'CONFIRMDIALOG', '', PHPBINARY.' '.HANDLERDIR.'user.php <event> <data>');
     $userOD['dialog']['Element']['User (id1)'] = $newElement;

     initNewODDialogElements();
     $newElement['element1']['id'] = '2';
     $newElement['element1']['data'] = 'Name';
     $newElement['element2']['data'] = '';
     $newElement['element3']['data'] = 'unique';
     $newElement['element3']['readonly'] = '';
     // INIT, F2, CONFIRMDIALOG..
     CreateHandlerSection(10, 'INIT', '', PHPBINARY.' '.HANDLERDIR.'_.php SET <data>');
     CreateHandlerSection(12, 'KeyF2', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT');
     CreateHandlerSection(14, 'KeyDelete', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php SET');
     CreateHandlerSection(16, 'KeyInsert', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php SETPROP link <{"prop":"link"}> hint <{"prop":"hint"}> style <{"prop":"style"}>');
     CreateHandlerSection(18, 'KEYPRESS', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(20, 'KEYPRESS', 'SHIFT', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(22, 'PASTE', '', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(24, 'KeyF12', 'ALT', PHPBINARY.' '.HANDLERDIR.'_.php CALL _history <oid>');
     CreateHandlerSection(26, 'DOUBLECLICK', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT');
     CreateHandlerSection(28, 'DOUBLECLICK', 'SHIFT', PHPBINARY.' '.HANDLERDIR.'_.php UPLOADDIALOG');
     CreateHandlerSection(30, 'DOUBLECLICK', 'CTRL', PHPBINARY.' '.HANDLERDIR.'_.php DOWNLOADDIALOG');
     CreateHandlerSection(32, 'DOUBLECLICK', 'ALT', PHPBINARY.' '.HANDLERDIR.'_.php UNLOADDIALOG');
     CreateHandlerSection(34, 'DOUBLECLICK', 'CTRL+ALT', PHPBINARY.' '.HANDLERDIR.'_.php GALLERY');
     CreateHandlerSection(36, 'CONFIRMDIALOG', '', PHPBINARY.' '.HANDLERDIR.'_.php <event> <data>');
     CreateHandlerSection(38, 'CONFIRM', '', PHPBINARY.' '.HANDLERDIR.'_.php SET <data>');
     $userOD['dialog']['Element']['Name (id2)'] = $newElement;

     initNewODDialogElements();
     $newElement['element1']['id'] = '3';
     $newElement['element1']['data'] = 'Contact';
     $newElement['element2']['data'] = '';
     $newElement['element3']['data'] = 'unique';
     $newElement['element3']['readonly'] = '';
     // INIT, F2, CONFIRMDIALOG..
     CreateHandlerSection(10, 'INIT', '', PHPBINARY.' '.HANDLERDIR.'_.php SET <data>');
     CreateHandlerSection(12, 'KeyF2', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT');
     CreateHandlerSection(14, 'KeyDelete', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php SET');
     CreateHandlerSection(16, 'KeyInsert', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php SETPROP link <{"prop":"link"}> hint <{"prop":"hint"}> style <{"prop":"style"}>');
     CreateHandlerSection(18, 'KEYPRESS', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(20, 'KEYPRESS', 'SHIFT', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(22, 'PASTE', '', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(24, 'KeyF12', 'ALT', PHPBINARY.' '.HANDLERDIR.'_.php CALL _history <oid>');
     CreateHandlerSection(26, 'DOUBLECLICK', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT');
     CreateHandlerSection(28, 'DOUBLECLICK', 'SHIFT', PHPBINARY.' '.HANDLERDIR.'_.php UPLOADDIALOG');
     CreateHandlerSection(30, 'DOUBLECLICK', 'CTRL', PHPBINARY.' '.HANDLERDIR.'_.php DOWNLOADDIALOG');
     CreateHandlerSection(32, 'DOUBLECLICK', 'ALT', PHPBINARY.' '.HANDLERDIR.'_.php UNLOADDIALOG');
     CreateHandlerSection(34, 'DOUBLECLICK', 'CTRL+ALT', PHPBINARY.' '.HANDLERDIR.'_.php GALLERY');
     CreateHandlerSection(36, 'CONFIRMDIALOG', '', PHPBINARY.' '.HANDLERDIR.'_.php <event> <data>');
     CreateHandlerSection(38, 'CONFIRM', '', PHPBINARY.' '.HANDLERDIR.'_.php SET <data>');
     $userOD['dialog']['Element']['Contact (id3)'] = $newElement;

     initNewODDialogElements();
     $newElement['element1']['id'] = '4';
     $newElement['element1']['data'] = 'Email';
     $newElement['element2']['data'] = '';
     $newElement['element3']['data'] = 'unique';
     $newElement['element3']['readonly'] = '';
     // INIT, F2, CONFIRMDIALOG..
     CreateHandlerSection(10, 'INIT', '', PHPBINARY.' '.HANDLERDIR.'_.php SET <data>');
     CreateHandlerSection(12, 'KeyF2', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT');
     CreateHandlerSection(14, 'KeyDelete', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php SET');
     CreateHandlerSection(16, 'KeyInsert', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php SETPROP link <{"prop":"link"}> hint <{"prop":"hint"}> style <{"prop":"style"}>');
     CreateHandlerSection(18, 'KEYPRESS', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(20, 'KEYPRESS', 'SHIFT', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(22, 'PASTE', '', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(24, 'KeyF12', 'ALT', PHPBINARY.' '.HANDLERDIR.'_.php CALL _history <oid>');
     CreateHandlerSection(26, 'DOUBLECLICK', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT');
     CreateHandlerSection(28, 'DOUBLECLICK', 'SHIFT', PHPBINARY.' '.HANDLERDIR.'_.php UPLOADDIALOG');
     CreateHandlerSection(30, 'DOUBLECLICK', 'CTRL', PHPBINARY.' '.HANDLERDIR.'_.php DOWNLOADDIALOG');
     CreateHandlerSection(32, 'DOUBLECLICK', 'ALT', PHPBINARY.' '.HANDLERDIR.'_.php UNLOADDIALOG');
     CreateHandlerSection(34, 'DOUBLECLICK', 'CTRL+ALT', PHPBINARY.' '.HANDLERDIR.'_.php GALLERY');
     CreateHandlerSection(36, 'CONFIRMDIALOG', '', PHPBINARY.' '.HANDLERDIR.'_.php <event> <data>');
     CreateHandlerSection(38, 'CONFIRM', '', PHPBINARY.' '.HANDLERDIR.'_.php SET <data>');
     $userOD['dialog']['Element']['Email (id4)'] = $newElement;

     initNewODDialogElements();
     $newElement['element1']['id'] = '5';
     $newElement['element1']['data'] = 'Comment';
     $newElement['element2']['data'] = '';
     $newElement['element3']['data'] = 'unique';
     $newElement['element3']['readonly'] = '';
     // INIT, F2, CONFIRMDIALOG..
     CreateHandlerSection(10, 'INIT', '', PHPBINARY.' '.HANDLERDIR.'_.php SET <data>');
     CreateHandlerSection(12, 'KeyF2', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT');
     CreateHandlerSection(14, 'KeyDelete', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php SET');
     CreateHandlerSection(16, 'KeyInsert', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php SETPROP link <{"prop":"link"}> hint <{"prop":"hint"}> style <{"prop":"style"}>');
     CreateHandlerSection(18, 'KEYPRESS', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(20, 'KEYPRESS', 'SHIFT', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(22, 'PASTE', '', PHPBINARY.' '.HANDLERDIR.'_.php EDIT <data>');
     CreateHandlerSection(24, 'KeyF12', 'ALT', PHPBINARY.' '.HANDLERDIR.'_.php CALL _history <oid>');
     CreateHandlerSection(26, 'DOUBLECLICK', 'NONE', PHPBINARY.' '.HANDLERDIR.'_.php EDIT');
     CreateHandlerSection(28, 'DOUBLECLICK', 'SHIFT', PHPBINARY.' '.HANDLERDIR.'_.php UPLOADDIALOG');
     CreateHandlerSection(30, 'DOUBLECLICK', 'CTRL', PHPBINARY.' '.HANDLERDIR.'_.php DOWNLOADDIALOG');
     CreateHandlerSection(32, 'DOUBLECLICK', 'ALT', PHPBINARY.' '.HANDLERDIR.'_.php UNLOADDIALOG');
     CreateHandlerSection(34, 'DOUBLECLICK', 'CTRL+ALT', PHPBINARY.' '.HANDLERDIR.'_.php GALLERY');
     CreateHandlerSection(36, 'CONFIRMDIALOG', '', PHPBINARY.' '.HANDLERDIR.'_.php <event> <data>');
     CreateHandlerSection(38, 'CONFIRM', '', PHPBINARY.' '.HANDLERDIR.'_.php SET <data>');
     $userOD['dialog']['Element']['Comment (id5)'] = $newElement;

     initNewODDialogElements();
     $newElement['element1']['id'] = '6';
     $newElement['element1']['data'] = 'Customization';
     $newElement['element2']['data'] = "Double click 'Customize' to change color, font, background and other properties for the user";
     $newElement['element3']['data'] = 'unique';
     $newElement['element3']['readonly'] = '';
     // INIT, CONFIRMDIALOG..
     CreateHandlerSection(10, 'INIT', '', PHPBINARY.' '.HANDLERDIR.'customization.php <event>');
     CreateHandlerSection(12, 'DOUBLECLICK', 'NONE', PHPBINARY.' '.HANDLERDIR.'customization.php CUSTOMIZE <{"prop": "dialog"}>');
     CreateHandlerSection(14, 'CONFIRMDIALOG', '', PHPBINARY.' '.HANDLERDIR.'customization.php <event> <data>');
     $userOD['dialog']['Element']['Customization (id6)'] = $newElement;

     $query = $db->prepare("INSERT INTO `$` (odname,odprops) VALUES ('Users',:odprops)");
     $query->execute([':odprops' => json_encode($userOD)]);
     $query->closeCursor();

     // Create Object Database (uniq instance)
     $query = $db->prepare("CREATE TABLE `uniq_1` (id MEDIUMINT NOT NULL AUTO_INCREMENT, PRIMARY KEY (id)) AUTO_INCREMENT=".strval(STARTOBJECTID)." ENGINE InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
     $query->execute();
     $query = $db->prepare("ALTER TABLE `uniq_1` ADD eid1 BLOB(65535), ADD UNIQUE(eid1(".USERSTRINGMAXCHAR."))");
     $query->execute();

     // Create Object Database (actual data instance)
     $query = $db->prepare("CREATE TABLE `data_1` (id MEDIUMINT NOT NULL, mask TEXT, lastversion BOOL DEFAULT 1, version MEDIUMINT NOT NULL, owner CHAR(64), datetime DATETIME DEFAULT NOW(), eid1 JSON, eid2 JSON, eid3 JSON, eid4 JSON, eid5 JSON, eid6 JSON, PRIMARY KEY (id, version)) ENGINE InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
     $query->execute();
     $query = $db->prepare("ALTER TABLE `data_1` ADD INDEX (`lastversion`)");
     $query->execute();

     // Insert two objects (two users) to OD with id=1
     $client['auth'] = 'system';
     $client['ODid'] = '1';
     $client['allelements'] = ['1' => '', '2' => '', '3' => '', '4' => '', '5' => '', '6' => ''];
     $client['uniqelements'] = ['1' => ''];
     $output = ['1' => ['cmd' => 'RESET', 'value' => 'system', 'odvisible' => 'Visible DatabaseID:ViewID list for the user|+Hidden list for the user (others visible)', 'odvisiblelist' => '', 'odwrite' => 'Writable DatabaseID:ViewID list for the user|+Read-only list for the user (others writable)', 'odwritelist' => ''] + DEFAULTELEMENTPROPS,
		'2' => ['cmd' => 'RESET', 'value' => ''] + DEFAULTELEMENTPROPS,
		'3' => ['cmd' => 'RESET', 'value' => ''] + DEFAULTELEMENTPROPS,
		'4' => ['cmd' => 'RESET', 'value' => ''] + DEFAULTELEMENTPROPS,
		'5' => ['cmd' => 'RESET', 'value' => 'System account'] + DEFAULTELEMENTPROPS];
     AddObject($db, $client, $output);

     $output = ['1' => ['cmd' => 'RESET', 'value' => DEFAULTUSER, 'odaddperm' => '+Allow user to add Object Databases|', 'password' => password_hash(DEFAULTPASSWORD, PASSWORD_DEFAULT), 'groups' => '', 'odvisible' => 'Visible DatabaseID:ViewID list for the user|+Hidden list for the user (others visible)', 'odvisiblelist' => '', 'odwrite' => 'Writable DatabaseID:ViewID list for the user|+Read-only list for the user (others writable)', 'odwritelist' => ''] + DEFAULTELEMENTPROPS,
    		'2' => ['cmd' => 'RESET', 'value' => 'Charlie'] + DEFAULTELEMENTPROPS,
		'3' => ['cmd' => 'RESET', 'value' => ''] + DEFAULTELEMENTPROPS,
		'4' => ['cmd' => 'RESET', 'value' => ''] + DEFAULTELEMENTPROPS,
		'5' => ['cmd' => 'RESET', 'value' => 'Administrator'] + DEFAULTELEMENTPROPS,
		'6' => ['cmd' => 'RESET', 'value' => 'Customize', 'dialog' => defaultCustomizationDialogJSON()] + DEFAULTELEMENTPROPS];
     AddObject($db, $client, $output);



     //------------------------------------------Create default OD 'Logs'------------------------------------------
     initNewODDialogElements();
     $newProperties['element1']['data'] = 'Logs';
     $newProperties['element6']['data'] = "+User/group list allowed to change 'Database' section|Disallowed list (allowed for others)|";
     $newProperties['element8']['data'] = "+User/group list allowed to change 'Element' section|Disallowed list (allowed for others)|";
     $newProperties['element7']['data'] = $newProperties['element9']['data'] = 'root';
     $logOD = ['title'  => 'Edit Object Database Structure', 'dialog'  => ['Database' => ['Properties' => $newProperties], 'Element' => ['New element' => $newElement], 'View' => ['New view' => $newView], 'Rule' => ['New rule' => $newRule]], 'buttons' => SAVECANCEL, 'flags'  => ['style' => 'width: 860px; height: 720px;', 'esc' => '', 'profilehead' => ['Element' => "Select element", 'View' => "Select view", 'Rule' => "Select rule"]]];
     $logOD['buttons']['SAVE']['call'] = 'Database Configuration';
     $logOD['dialog']['Element']['New element']['element1']['id'] = '2';
     $logOD['dialog']['View']['New view']['element1']['id'] = '2';

     $newView['element1']['id'] = '1';
     $newView['element1']['head'] = "View (id$1) name";
     $newView['element1']['data'] = 'All logs';
     $newView['element6']['data'] = 'id,datetime,1';
     $newView['element10']['data'] = '+User/groups list allowed to change this view objects|Disallowed list (allowed for others)|';
     $newView['element11']['data'] = 'root';
     $logOD['dialog']['View']['All logs'] = $newView;

     $newElement['element1']['id'] = '1';
     $newElement['element1']['data'] = '            Log message            ';
     $newElement['element2']['data'] = '';
     $newElement['element3']['data'] = 'unique';
     $newElement['element3']['readonly'] = '';
     $logOD['dialog']['Element']['Log message (id1)'] = $newElement;

     $query = $db->prepare("INSERT INTO `$` (odname,odprops) VALUES ('Logs',:odprops)");
     $query->execute([':odprops' => json_encode($logOD)]);

     // Create Object Database (uniq instance)
     $query = $db->prepare("CREATE TABLE `uniq_2` (id MEDIUMINT NOT NULL AUTO_INCREMENT, PRIMARY KEY (id)) AUTO_INCREMENT=".strval(STARTOBJECTID)." ENGINE InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
     $query->execute();

     // Create Object Database (actual data instance)
     $query = $db->prepare("CREATE TABLE `data_2` (id MEDIUMINT NOT NULL, mask TEXT, lastversion BOOL DEFAULT 1, version MEDIUMINT NOT NULL, owner CHAR(64), datetime DATETIME DEFAULT NOW(), eid1 JSON, PRIMARY KEY (id, version)) ENGINE InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
     $query->execute();
     $query = $db->prepare("ALTER TABLE `data_2` ADD INDEX (`lastversion`)");
     $query->execute();
    }

catch (PDOException $e)
    {
     echo 'Failed to reset default sql tables: '."\n".$e->getMessage();
     exit;
    }

echo 'All sql tables reset to default successfully!'."\n";
