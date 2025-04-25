function DrawChart(x1, y1, x2, y2)
{
 if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return;

 let sum = 0, key, value, chart = {};
 x1 = Math.min(Math.min(x1, x2), x2 = Math.max(x1, x2));
 y1 = Math.min(Math.min(y1, y2), y2 = Math.max(y1, y2));

 const horizontal = x1 === x2 ? false : true; // X-axis is horiszontal?
 if (x1 === x2) x2++; else if (y1 === y2) y2++;	// Extend selected area

 for (let y = y1; y <= y2; y++)
 for (let x = x1; x <= x2; x++)
     {
      if ((horizontal && y === y1) || (!horizontal && x === x1))
	 {
	  if (mainTable[y]?.[x]) key = mainTable[y][x].data; else key = '';
	  continue;
	 }
      if (horizontal) if (mainTable[y1]?.[x]) key = mainTable[y1][x].data; else key = '';
      if (mainTable[y]?.[x]) value = Math.trunc(Number(mainTable[y][x].data)); else value = 0;
      if (typeof key !== 'string') key = '';
      if (typeof value !== 'number' || isNaN(value)) value = 0;
      if (chart[key] === undefined) chart[key] = 0;
      chart[key] += value;
      sum += value;
     }

 if (!sum) return warning("Chart draw failed: no numerical data found!");

 mainTablediv.style.display = 'none';
 OVtype = 'Chart';
 canvas = document.createElement('canvas');
 canvas.innerHTML = '<h1>Please update your browser! Canvas is not supported!</h1>';
 mainDiv.appendChild(canvas);
 canvas.width = Math.trunc(mainDiv.offsetWidth * 0.9);
 canvas.height = Math.trunc(mainDiv.offsetHeight * 0.9);

 const ctx = canvas.getContext('2d');
 ctx.font = '15px arial';
 ctx.textBaseline = 'middle';
 // ctx.mozImageSmoothingEnabled = false; ctx.webkitImageSmoothingEnabled = false; ctx.msImageSmoothingEnabled = false; ctx.imageSmoothingEnabled = false;

 const centr = Math.min(canvas.width, canvas.height) * 0.45;
 let x = centr * 2, y = centr * 0.25, endAngle = beginAngle = Math.PI * 1.5, pies = [];
 for (key in chart) pies.push({name: key, angle: (chart[key]/sum) * Math.PI * 2});
 pies.sort(function(a, b) { return b.angle - a.angle; });
 value = 0;

 for (key in uiProfile['chart colors']) if (pies[value]) pies[value++]['color'] = uiProfile['chart colors'][key];

 sum = 0;
 for (let pie of pies)
     {
      if (pie['color'] === undefined)
	 {
	  sum += pie.angle;
	  value = true;
	  continue;
	 }
      beginAngle = endAngle;
      endAngle += pie.angle;
      CanvasDrawPie(ctx, centr, beginAngle, endAngle, pie['color'])
      CanvasDrawPieDescription(ctx, x, y, pie['name'], (endAngle - beginAngle) * 50 / Math.PI, '#202020');
      y += 45;
     }

 if (value === true) // Process 'Others' pie if exist
    {
     beginAngle = endAngle;
     endAngle += sum;
     CanvasDrawPie(ctx, centr, beginAngle, endAngle, '#F0F0F0');
     CanvasDrawPieDescription(ctx, x, y, 'Others', (endAngle - beginAngle) * 50 / Math.PI, '#202020');
    }

 return true;
}

function CanvasDrawPie(ctx, centr, beginAngle, endAngle, color)
{
 ctx.fillStyle = color;
 if (beginAngle == endAngle) return;
 ctx.beginPath();
 ctx.moveTo(centr, centr);
 ctx.arc(centr, centr, centr * 0.8, beginAngle, endAngle);
 ctx.lineTo(centr, centr);
 ctx.stroke();
 ctx.fill();
}

function CanvasDrawPieDescription(ctx, x, y, text, percent, color)
{
 ctx.fillRect(x, y - 13, 50, 23);
 if (color !== undefined) ctx.fillStyle = color;
 ctx.fillText(text, x + 60, y);
 ctx.fillText(String(percent).substr(0, 4) + '%', x + 5, y);
}
