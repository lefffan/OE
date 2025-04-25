<?php

/****************************Platform dependent constants*********************************/
const DATABASENAME			= 'OE9';
const DATABASEUSER			= 'tabel';
const DATABASEPASS			= '17MAy2001#';
const PHPBINARY				= 'php';
const HANDLERDIR			= '/usr/local/src/tabels/handlers/';
const APPDIR				= '/usr/local/src/tabels/';
const WRAPPERCMD			= 'wrapper.php';
const SEARCHPROCESSCMD			= 'ps -C "php" ww | grep';
const KILLPROCESSCMD			= 'kill -9';
const SCHEDULERID			= 'kGk4Jghyg6';
const SCHEDULERWRAPPERCMD		= 'schedulerwrapper.php';
const AVERAGELOADCMD			= 'w';
//const IP				= '195.208.152.8';
const IP				= 'mng.gcom.ru';
const PORT				= 7889;
const UPLOADDIR				= '/usr/local/lib/tabels/';
const MAXFILESIZE			= 157286400;
const MAXFILEUPLOADS			= 20;

/****************************Other constants**********************************************/
const MAXOBJECTS			= 100000;
const ODSTRINGMAXCHAR			= 64;
const OVSTRINGMAXCHAR			= 64;
const USERSTRINGMAXCHAR			= '64';
const USERPASSMINLENGTH			= '8';
const SOCKETREADMAXBYTES		= 15000000;
const SOCKETTIMEOUTUSEC			= 200000;
const ELEMENTDATAVALUEMAXCHAR		= 10240;
const ELEMENTPROFILENAMEMAXCHAR		= 32;
const ELEMENTPROFILENAMEADDSTRING	= ' (id';
const UNIQKEYCHARLENGTH			= 300;
const UNIQELEMENTTYPE			= '+unique|';
const TITLEOBJECTID			= 1;
const NEWOBJECTID			= 2;
const STARTOBJECTID			= 3;
const CHECK_OD_OV			= 0b00000001;
const GET_ELEMENTS			= 0b00000010;
const GET_VIEWS				= 0b00000100;
const CHECK_DATA			= 0b00001000;
const CHECK_OID				= 0b00010000;
const CHECK_EID				= 0b00100000;
const CHECK_ACCESS			= 0b01000000;
const DEFAULTUSER			= 'root';
const DEFAULTPASSWORD			= 'root';
const SESSIONLIFETIME			= 36000;
const CALLTIMEOUT			= 15;
const CALLFILEMNGTTIMEOUT		= 300;
const DEFAULTOBJECTSELECTION		= 'WHERE lastversion=1 AND version!=0';
const SERVICEELEMENTS			= ['id', 'version', 'owner', 'datetime', 'lastversion'];
const SERVICEELEMENTTITLES		= ['Id', 'Version', 'Owner', '   Date and time   ', 'Actual version'];
const SERVICEELEMENTHINTS		= ['Object identificator', 'Object version number', 'User created current object version', 'Date and time object version was created', 'Actual object version status'];
const SAVECANCEL			= ['SAVE' => ['value' => 'SAVE', 'call' => '', 'enterkey' => ''], 'CANCEL' => ['value' => 'CANCEL', 'style' => 'background-color: red;']];
const CREATECANCEL			= ['CREATE' => ['value' => 'CREATE', 'call' => '', 'enterkey' => ''], 'CANCEL' => ['value' => 'CANCEL', 'style' => 'background-color: red;']];
const OKCANCEL				= ['OK' => ['value' => 'OK', 'call' => '', 'enterkey' => ''], 'CANCEL' => ['value' => 'CANCEL', 'style' => 'background-color: red;']];
const MINBUTTONTIMERMSEC		= 500;
const MAXBUTTONTIMERMSEC		= 36000000;
const DEFAULTELEMENTPROPS		= ['value' => '', 'hint' => '', 'link' => '', 'style' => ''];
const ARGRECURSIONNUM			= 3;
const ARGRESULTLIMITNUM			= 256;
const ARGVCLIENTINDEX			= 10;
const CRONLINEFIELDS			= ['minutes', 'hours', 'mday', 'mon', 'wday', 'queue', 'vid', 'cmd'];
const HANDLEREVENTS			= ['EDIT', 'ALERT', 'DIALOG', 'CALL', 'SET', 'RESET', 'UPLOADDIALOG', 'DOWNLOADDIALOG', 'UNLOADDIALOG', 'GALLERY', 'NEWPAGE', ''];
const MINUSECONDSINTERVAL		= 500000; // 500 msec
const MAXUSECONDSINTERVAL		= 10000000; // 10 sec
const QUEUEWRAPPERSMAX			= 1024;
// 65-90 a-z 48-57 0-9 96-107 numpad0-9*+ 109-111 numpad-./ 186-192 ;=,->/` 219-222 [\]' 32space FF59; FF61= FF173- 226\ F1-F12 112-123 INS45 DEL46
const USEREVENTKEYCODES			= [65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,48,49,50,51,52,53,54,55,56,57,112,113,114,115,116,117,118,119,120,121,122,123,32,45,46,219,221];
const KEYCODESYMBOLRANGES		= [65,90,48,57,96,107,109,111,186,192,219,222,32,32,59,59,61,61,173,173,226,226];
const USEREVENTCODES			= ['KeyA','KeyB','KeyC','KeyD','KeyE','KeyF','KeyG','KeyH','KeyI','KeyJ','KeyK','KeyL','KeyM','KeyN','KeyO','KeyP','KeyQ','KeyR','KeyS','KeyT','KeyU','KeyV','KeyW','KeyX','KeyY','KeyZ','Key0','Key1','Key2','Key3','Key4','Key5','Key6','Key7','Key8','Key9','KeyF1','KeyF2','KeyF3','KeyF4','KeyF5','KeyF6','KeyF7','KeyF8','KeyF9','KeyF10','KeyF11','KeyF12','KeySpace','KeyInsert','KeyDelete','KeyBracketLeft','KeyBracketRight'];
const GROUPEVENTS			= ['CHANGE', 'INIT', 'SCHEDULE'];
// All events = mouse + key + others events
const MOUSEKEYBOARDEVENTS		= ['DOUBLECLICK','KEYPRESS','KeyA','KeyB','KeyC','KeyD','KeyE','KeyF','KeyG','KeyH','KeyI','KeyJ','KeyK','KeyL','KeyM','KeyN','KeyO','KeyP','KeyQ','KeyR','KeyS','KeyT','KeyU','KeyV','KeyW','KeyX','KeyY','KeyZ','Key0','Key1','Key2','Key3','Key4','Key5','Key6','Key7','Key8','Key9','KeyF1','KeyF2','KeyF3','KeyF4','KeyF5','KeyF6','KeyF7','KeyF8','KeyF9','KeyF10','KeyF11','KeyF12','KeySpace','KeyInsert','KeyDelete','KeyBracketLeft','KeyBracketRight'];
const NOMOUSEKEYBOARDEVENTS		= ['INIT','DELETE','CONFIRM','CONFIRMDIALOG','CHANGE','PASTE','SCHEDULE'];
const ALLOBJECTEVENTS			= ['INIT','DELETE','CONFIRM','CONFIRMDIALOG','CHANGE','PASTE','SCHEDULE','DOUBLECLICK','KEYPRESS','KeyA','KeyB','KeyC','KeyD','KeyE','KeyF','KeyG','KeyH','KeyI','KeyJ','KeyK','KeyL','KeyM','KeyN','KeyO','KeyP','KeyQ','KeyR','KeyS','KeyT','KeyU','KeyV','KeyW','KeyX','KeyY','KeyZ','Key0','Key1','Key2','Key3','Key4','Key5','Key6','Key7','Key8','Key9','KeyF1','KeyF2','KeyF3','KeyF4','KeyF5','KeyF6','KeyF7','KeyF8','KeyF9','KeyF10','KeyF11','KeyF12','KeySpace','KeyInsert','KeyDelete','KeyBracketLeft','KeyBracketRight'];
