<?php

require_once 'core.php';
//lg($_POST);
//lg($_FILES);
//lg($_GET);

if (isset($_GET['id']))
   {
    $id = $_GET['id'];
    $cmd = 'GALLERY';
    if (!isset($_GET['img'])) exit;
    $img = $_GET['img'];
   }
 else
   {
    $id = $_POST['id'];
    $cmd = $_POST['cmd'];
   }

try {
     $query = $db->prepare('DELETE FROM `$$$` WHERE now()-time>'.strval(CALLFILEMNGTTIMEOUT));
     $query->execute();
     $query = $db->prepare("SELECT client FROM `$$$` WHERE id='$id'");
     $query->execute();
     $client = $query->fetchAll(PDO::FETCH_NUM);
     if (!isset($client[0][0]))
	{
	 echo json_encode(['cmd' => '', 'alert' => "File management dialog timeout, please try again!"]);
	 exit;
	}
    }
catch (PDOException $e)
    {
     lg($e, 'View.php PDO exception');
     echo json_encode(['cmd' => '', 'error' => 'PDO driver exception error!']);
     exit;
    }
$client = json_decode($client[0][0], true);

switch ($cmd)
       {
	case 'UPLOAD':
	     if (gettype($_FILES['files']['name']) !== 'array' || !($filecount = count($_FILES['files']['name']))) break;
	     $successfilecount = 0;
	     $prefix = UPLOADDIR."$client[ODid]/$client[oId]/$client[eId]/";
	     if (!is_dir($prefix)) if (!mkdir($prefix, 0700, true)) break;
	     foreach ($_FILES['files']['name'] as $i => $name)
		     if (intval($_FILES['files']['size'][$i]) < MAXFILESIZE)
		     if (move_uploaded_file($_FILES['files']['tmp_name'][$i], $prefix.$name)) $successfilecount++;
	     echo json_encode(['cmd' => 'SET', 'data' => [$client['eId'] => ['attached' => IsDirNotEmpty(UPLOADDIR."$client[ODid]/$client[oId]/$client[eId]")]], 'alert' => $successfilecount.' of '.$filecount.' file(-s) uploaded successfully!'] + $client); // Echo output result
	     break;
	case 'DOWNLOAD':
	     $file = UPLOADDIR."$client[ODid]/$client[oId]/$client[eId]/".$client['list'][$_POST['fileindex']];
	     header('Content-Description: File Transfer');
	     header('Content-Type: application/octet-stream');
	     header('Content-Disposition: attachment; filename='.json_encode(['name' => basename($file)]));
	     header('Expires: 0');
	     header('Cache-Control: must-revalidate');
	     header('Pragma: public');
	     header('Content-Length: '.filesize($file));
	     ob_clean();
	     flush();
	     readfile($file);
	     break;
	case 'GALLERY':
	     $file = UPLOADDIR."$client[ODid]/$client[oId]/$client[eId]/".$client['list'][$img];
	     if (is_file($file)) readfile($file);
	     break;
	case 'DELETE':
	     $successfilecount = $filecount = 0;
	     foreach ($_POST as $i => $value)
		  if ($value === '' && gettype($i) === 'integer')
		     {
		      $filecount++;
		      if (unlink(UPLOADDIR."$client[ODid]/$client[oId]/$client[eId]/".$client['list'][$i])) $successfilecount++;
		     }
	     echo json_encode(['cmd' => 'SET', 'data' => [$client['eId'] => ['attached' => IsDirNotEmpty(UPLOADDIR."$client[ODid]/$client[oId]/$client[eId]")]], 'alert' => $successfilecount.' of '.$filecount.' file(-s) deleted successfully!'] + $client); // Echo output result
	     break;
       }
