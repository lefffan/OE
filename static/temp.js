<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Virtualized Grid</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: sans-serif;
    }

    .viewport {
      height: 100vh;
      overflow-y: auto;
      position: relative;
    }

    .spacer {
      height: 100000px; /* placeholder space */
      position: relative;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
      position: absolute;
      width: 100%;
    }

    .item {
      background-color: #f0f0f0;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="viewport" id="viewport">
    <div class="spacer" id="spacer">
      <div class="grid" id="grid"></div>
    </div>
  </div>

  <script>
    const totalItems = 100000; // simulate a huge dataset
    const itemHeight = 120; // height of one grid row approx
    const buffer = 20; // number of items to render extra (above/below viewport)
    const grid = document.getElementById('grid');
    const viewport = document.getElementById('viewport');
    const spacer = document.getElementById('spacer');

    const cols = () => Math.floor(viewport.clientWidth / 170); // 150px item + 20px gap
    const itemsPerRow = () => Math.max(cols(), 1);
    const rowHeight = itemHeight;

    function renderVisibleItems() {
      const scrollTop = viewport.scrollTop;
      const viewportHeight = viewport.clientHeight;

      const itemsPerRowCount = itemsPerRow();
      const itemCountPerScreen = Math.ceil(viewportHeight / rowHeight) * itemsPerRowCount;
      const startIndex = Math.floor(scrollTop / rowHeight) * itemsPerRowCount;
      const endIndex = Math.min(totalItems, startIndex + itemCountPerScreen + buffer * itemsPerRowCount);

      // Position grid
      grid.style.top = `${Math.floor(startIndex / itemsPerRowCount) * rowHeight}px`;

      // Clear previous
      grid.innerHTML = '';

      for (let i = startIndex; i < endIndex; i++) {
        const item = document.createElement('div');
        item.className = 'item';
        item.textContent = `Item ${i + 1}`;
        grid.appendChild(item);
      }
    }

    viewport.addEventListener('scroll', renderVisibleItems);
    //window.addEventListener('resize', renderVisibleItems);

    // Update spacer height dynamically
    function updateSpacerHeight() {
      const totalRows = Math.ceil(totalItems / itemsPerRow());
      spacer.style.height = `${totalRows * rowHeight}px`;
    }

    window.addEventListener('resize', () => {
      //updateSpacerHeight();
      //renderVisibleItems();
    });

    updateSpacerHeight();
    renderVisibleItems();
  </script>
</body>
</html>