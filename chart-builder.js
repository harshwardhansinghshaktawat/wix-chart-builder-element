class ChartBuilderElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.chartInstance = null;
    this.chartData = {
      labels: [],
      values: [],
      colors: []
    };
    this.chartOptions = {
      type: 'pie',
      title: 'Custom Chart',
      showLegend: true,
      legendPosition: 'top',
      animation: true,
      enableDataLabels: false,
      theme: 'default'
    };
    // Initialize properties with default values
    this._showDataTab = true;
    this._showSettingsTab = true;
    this._showStyleTab = true;
  }

  // Define observed attributes
  static get observedAttributes() {
    return ['show-data-tab', 'show-settings-tab', 'show-style-tab'];
  }

  // Handle attribute changes
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      switch(name) {
        case 'show-data-tab':
          this._showDataTab = newValue === 'true';
          break;
        case 'show-settings-tab':
          this._showSettingsTab = newValue === 'true';
          break;
        case 'show-style-tab':
          this._showStyleTab = newValue === 'true';
          break;
      }
      if (this.shadowRoot) {
        this.updateTabVisibility();
      }
    }
  }

  connectedCallback() {
    this.render();
    this.loadDependencies();
  }

  async loadDependencies() {
    await this.loadScript('https://cdn.jsdelivr.net/npm/chart.js');
    await this.loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels');
    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js');
    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    this.initializeChartBuilder();
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          --primary-color: #4285f4;
          --primary-hover: #3367d6;
          --background-color: #ffffff;
          --text-color: #333333;
          --border-color: #e0e0e0;
          --success-color: #0f9d58;
          --warning-color: #f4b400;
          --danger-color: #db4437;
        }

        * {
          box-sizing: border-box;
        }

        .container {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          background: var(--background-color);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .tab-container {
          width: 100%;
        }

        .tab-buttons {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          background: #f9f9f9;
        }

        .tab-button {
          padding: 15px 25px;
          cursor: pointer;
          background: transparent;
          border: none;
          outline: none;
          font-weight: 600;
          color: #707070;
          font-size: 14px;
          transition: all 0.3s ease;
          position: relative;
        }

        .tab-button.hidden {
          display: none;
        }

        .tab-button:hover {
          color: var(--primary-color);
        }

        .tab-button.active {
          color: var(--primary-color);
        }

        .tab-button.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: var(--primary-color);
        }

        .tab-content {
          display: none;
          padding: 25px;
        }

        .tab-content.hidden {
          display: none !important;
        }

        .tab-content.active {
          display: block;
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          border-radius: 5px;
          overflow: hidden;
          box-shadow: 0 0 10px rgba(0,0,0,0.05);
        }

        .data-table th {
          padding: 15px;
          background: #f5f5f5;
          color: #555;
          font-weight: 600;
          text-align: left;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.5px;
        }

        .data-table td {
          padding: 15px;
          border-bottom: 1px solid var(--border-color);
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .data-table tr:hover {
          background-color: #fafafa;
        }

        .data-input {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-family: inherit;
          transition: border 0.3s ease;
        }

        .data-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
        }

        .color-picker {
          width: 50px;
          height: 30px;
          padding: 0;
          border: none;
          cursor: pointer;
          border-radius: 4px;
          overflow: hidden;
        }

        .canvas-container {
          max-width: 100%;
          position: relative;
          margin: 0 auto;
          padding: 20px;
        }

        canvas {
          max-width: 100%;
          margin: 0 auto;
          display: block;
        }

        .chart-settings {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .settings-group {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
        }

        .settings-title {
          font-weight: 600;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-color);
          color: #555;
        }

        .form-group {
          margin-bottom: 15px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 14px;
          color: #555;
        }

        select, input[type="text"], input[type="number"] {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-family: inherit;
          background-color: white;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
        }

        .checkbox-group label {
          margin-bottom: 0;
          margin-left: 8px;
        }

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .color-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 15px;
        }

        .color-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          background: white;
          padding: 8px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
        }

        .color-label {
          margin-left: 10px;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }

        .btn {
          padding: 10px 20px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn:hover {
          background: var(--primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .btn-success {
          background: var(--success-color);
        }

        .btn-danger {
          background: var(--danger-color);
        }

        .btn-info {
          background: #9e9e9e;
        }

        .btn-group {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .csv-area {
          width: 100%;
          min-height: 150px;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-family: monospace;
          resize: vertical;
        }

        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px 25px;
          background: #323232;
          color: white;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          opacity: 0;
          transform: translateY(-20px);
          transition: all 0.3s ease;
          z-index: 1000;
        }

        .toast.show {
          opacity: 1;
          transform: translateY(0);
        }

        .toast-success {
          background: var(--success-color);
        }

        .toast-error {
          background: var(--danger-color);
        }

        .chart-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          align-items: center;
        }

        .chart-navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .theme-selector {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .theme-option {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .theme-option.active {
          border-color: var(--primary-color);
          transform: scale(1.1);
        }

        .theme-option:hover {
          transform: scale(1.05);
        }

        .data-action {
          width: 120px;
        }

        @media (max-width: 768px) {
          .chart-settings {
            grid-template-columns: 1fr;
          }
          .color-group {
            flex-direction: column;
          }
        }

        .animate-in {
          animation: slideIn 0.5s forwards;
        }

        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        .theme-default {
          --chart-bg1: #4285f4;
          --chart-bg2: #db4437;
          --chart-bg3: #f4b400;
          --chart-bg4: #0f9d58;
          --chart-bg5: #673ab7;
          --chart-bg6: #3f51b5;
          --chart-bg7: #039be5;
          --chart-bg8: #009688;
          --chart-bg9: #ff5722;
          --chart-bg10: #795548;
        }

        .theme-pastel {
          --chart-bg1: #FFB3BA;
          --chart-bg2: #FFDFBA;
          --chart-bg3: #FFFFBA;
          --chart-bg4: #BAFFC9;
          --chart-bg5: #BAE1FF;
          --chart-bg6: #E2BAFF;
          --chart-bg7: #F7BAFF;
          --chart-bg8: #FFBAE1;
          --chart-bg9: #BAFFFC;
          --chart-bg10: #D4FFBA;
        }

        .theme-dark {
          --chart-bg1: #1F1F1F;
          --chart-bg2: #424242;
          --chart-bg3: #616161;
          --chart-bg4: #757575;
          --chart-bg5: #9E9E9E;
          --chart-bg6: #2F2F2F;
          --chart-bg7: #404040;
          --chart-bg8: #505050;
          --chart-bg9: #606060;
          --chart-bg10: #707070;
        }

        .theme-vibrant {
          --chart-bg1: #FF1744;
          --chart-bg2: #F50057;
          --chart-bg3: #D500F9;
          --chart-bg4: #651FFF;
          --chart-bg5: #3D5AFE;
          --chart-bg6: #2979FF;
          --chart-bg7: #00B0FF;
          --chart-bg8: #00BFA5;
          --chart-bg9: #00C853;
          --chart-bg10: #FFD600;
        }
      </style>

      <div class="container">
        <div class="tab-container">
          <div class="tab-buttons">
            <button class="tab-button ${this._showDataTab ? 'active' : 'hidden'}" data-tab="data">Data Entry</button>
            <button class="tab-button ${!this._showDataTab && this._showSettingsTab ? 'active' : ''} ${this._showSettingsTab ? '' : 'hidden'}" data-tab="settings">Chart Settings</button>
            <button class="tab-button ${!this._showDataTab && !this._showSettingsTab && this._showStyleTab ? 'active' : ''} ${this._showStyleTab ? '' : 'hidden'}" data-tab="style">Style & Colors</button>
            <button class="tab-button ${!this._showDataTab && !this._showSettingsTab && !this._showStyleTab ? 'active' : ''}" data-tab="preview">Preview & Export</button>
          </div>

          <div class="tab-content ${this._showDataTab ? 'active' : 'hidden'}" id="data-tab">
            <div class="chart-navbar">
              <h3>Chart Data</h3>
              <div class="btn-group">
                <button id="import-csv" class="btn btn-info">Import CSV</button>
                <button id="bulk-edit" class="btn">Bulk Edit</button>
              </div>
            </div>
            <div id="table-view">
              <table class="data-table">
                <thead>
                  <tr>
                    <th width="40%">Label</th>
                    <th width="40%">Value</th>
                    <th class="data-action">Action</th>
                  </tr>
                </thead>
                <tbody id="data-rows">
                  <tr>
                    <td><input type="text" class="data-input label-input" placeholder="Enter label"></td>
                    <td><input type="number" class="data-input value-input" placeholder="Enter value"></td>
                    <td><button class="btn btn-danger remove-row">Remove</button></td>
                  </tr>
                </tbody>
              </table>
              <button id="add-row" class="btn">Add Row</button>
            </div>
            <div id="bulk-edit-view" style="display: none;">
              <label for="csv-data">CSV Data (Label,Value format)</label>
              <textarea id="csv-data" class="csv-area" placeholder="Label1,100\nLabel2,150\nLabel3,200"></textarea>
              <div class="btn-group">
                <button id="apply-csv" class="btn btn-success">Apply Data</button>
                <button id="cancel-bulk" class="btn btn-info">Cancel</button>
              </div>
            </div>
            <div class="btn-group">
              <button id="update-chart" class="btn btn-success">Update Chart</button>
              <button id="reset-data" class="btn btn-danger">Reset Data</button>
            </div>
          </div>

          <div class="tab-content ${!this._showDataTab && this._showSettingsTab ? 'active' : ''} ${this._showSettingsTab ? '' : 'hidden'}" id="settings-tab">
            <div class="chart-settings">
              <div class="settings-group">
                <h3 class="settings-title">Chart Properties</h3>
                <div class="form-group">
                  <label for="chart-type">Chart Type</label>
                  <select id="chart-type" class="data-input">
                    <option value="pie">Pie Chart</option>
                    <option value="doughnut">Doughnut Chart</option>
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="polarArea">Polar Area Chart</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="chart-title">Chart Title</label>
                  <input type="text" id="chart-title" class="data-input" value="Custom Chart">
                </div>
                <div class="form-group checkbox-group">
                  <input type="checkbox" id="show-legend" checked>
                  <label for="show-legend">Show Legend</label>
                </div>
                <div class="form-group" id="legend-position-group">
                  <label for="legend-position">Legend Position</label>
                  <select id="legend-position" class="data-input">
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
              <div class="settings-group">
                <h3 class="settings-title">Advanced Options</h3>
                <div class="form-group checkbox-group">
                  <input type="checkbox" id="enable-animation" checked>
                  <label for="enable-animation">Enable Animations</label>
                </div>
                <div class="form-group checkbox-group">
                  <input type="checkbox" id="enable-data-labels">
                  <label for="enable-data-labels">Show Data Labels</label>
                </div>
                <div class="form-group checkbox-group">
                  <input type="checkbox" id="enable-tooltips" checked>
                  <label for="enable-tooltips">Show Tooltips</label>
                </div>
                <div class="form-group">
                  <label for="aspect-ratio">Aspect Ratio</label>
                  <select id="aspect-ratio" class="data-input">
                    <option value="1">1:1 (Square)</option>
                    <option value="1.33">4:3</option>
                    <option value="1.78" selected>16:9</option>
                    <option value="2">2:1</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="tab-content ${!this._showDataTab && !this._showSettingsTab && this._showStyleTab ? 'active' : ''} ${this._showStyleTab ? '' : 'hidden'}" id="style-tab">
            <div class="chart-settings">
              <div class="settings-group">
                <h3 class="settings-title">Color Theme</h3>
                <div class="form-group">
                  <label>Select Theme</label>
                  <div class="theme-selector">
                    <div class="theme-option active" data-theme="default" style="background: linear-gradient(135deg, #4285f4, #db4437);"></div>
                    <div class="theme-option" data-theme="pastel" style="background: linear-gradient(135deg, #FFB3BA, #BAFFC9);"></div>
                    <div class="theme-option" data-theme="vibrant" style="background: linear-gradient(135deg, #FF1744, #651FFF);"></div>
                    <div class="theme-option" data-theme="dark" style="background: linear-gradient(135deg, #1F1F1F, #9E9E9E);"></div>
                  </div>
                </div>
                <div class="form-group checkbox-group">
                  <input type="checkbox" id="use-custom-colors">
                  <label for="use-custom-colors">Use Custom Colors</label>
                </div>
              </div>
              <div class="settings-group">
                <h3 class="settings-title">Custom Colors</h3>
                <div id="color-pickers" class="color-group"></div>
              </div>
            </div>
          </div>

          <div class="tab-content ${!this._showDataTab && !this._showSettingsTab && !this._showStyleTab ? 'active' : ''}" id="preview-tab">
            <div class="chart-navbar">
              <h3>Chart Preview</h3>
            </div>
            <div class="canvas-container">
              <canvas id="chart-canvas"></canvas>
            </div>
            <div class="chart-actions">
              <div class="btn-group">
                <button id="download-png" class="btn btn-success">Download PNG</button>
                <button id="download-csv" class="btn">Download CSV</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="toast" class="toast"></div>
    `;
  }

  initializeChartBuilder() {
    this.setupEventListeners();
    this.updateChart();
    this.updateColorPickers();
    this.updateTabVisibility();
    if (window.Chart) {
      window.Chart.register(window.ChartDataLabels);
    }
  }

  updateTabVisibility() {
    const shadow = this.shadowRoot;
    
    const dataTabButton = shadow.querySelector('.tab-button[data-tab="data"]');
    const settingsTabButton = shadow.querySelector('.tab-button[data-tab="settings"]');
    const styleTabButton = shadow.querySelector('.tab-button[data-tab="style"]');
    const previewTabButton = shadow.querySelector('.tab-button[data-tab="preview"]');
    
    dataTabButton.classList.toggle('hidden', !this._showDataTab);
    settingsTabButton.classList.toggle('hidden', !this._showSettingsTab);
    styleTabButton.classList.toggle('hidden', !this._showStyleTab);

    const dataTab = shadow.getElementById('data-tab');
    const settingsTab = shadow.getElementById('settings-tab');
    const styleTab = shadow.getElementById('style-tab');
    const previewTab = shadow.getElementById('preview-tab');

    dataTab.classList.toggle('hidden', !this._showDataTab);
    settingsTab.classList.toggle('hidden', !this._showSettingsTab);
    styleTab.classList.toggle('hidden', !this._showStyleTab);

    const activeButton = shadow.querySelector('.tab-button.active');
    if (!activeButton || activeButton.classList.contains('hidden')) {
      const firstVisibleButton = shadow.querySelector('.tab-button:not(.hidden)');
      if (firstVisibleButton) {
        shadow.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        shadow.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        firstVisibleButton.classList.add('active');
        shadow.getElementById(`${firstVisibleButton.dataset.tab}-tab`).classList.add('active');
      }
    }
  }

  setupEventListeners() {
    const shadow = this.shadowRoot;

    shadow.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        if (!button.classList.contains('hidden')) {
          shadow.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
          shadow.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
          
          button.classList.add('active');
          shadow.getElementById(`${button.dataset.tab}-tab`).classList.add('active');
          
          if (button.dataset.tab === 'preview') {
            this.updateChart();
          }
        }
      });
    });

    shadow.getElementById('add-row').addEventListener('click', () => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="text" class="data-input label-input" placeholder="Enter label"></td>
        <td><input type="number" class="data-input value-input" placeholder="Enter value"></td>
        <td><button class="btn btn-danger remove-row">Remove</button></td>
      `;
      shadow.getElementById('data-rows').appendChild(row);
      row.classList.add('animate-in');
    });

    shadow.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-row')) {
        if (shadow.querySelectorAll('#data-rows tr').length > 1) {
          const row = e.target.closest('tr');
          row.style.transition = 'all 0.3s ease';
          row.style.opacity = '0';
          row.style.transform = 'translateX(20px)';
          setTimeout(() => row.remove(), 300);
        } else {
          e.target.closest('tr').classList.add('shake');
          setTimeout(() => e.target.closest('tr').classList.remove('shake'), 500);
          this.showToast('Cannot remove last row', 'error');
        }
      }
    });

    shadow.getElementById('update-chart').addEventListener('click', () => {
      if (this.validateData()) {
        this.updateChart();
        this.showToast('Chart updated successfully!', 'success');
      }
    });

    shadow.getElementById('reset-data').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all data?')) {
        const dataRows = shadow.getElementById('data-rows');
        dataRows.innerHTML = `
          <tr>
            <td><input type="text" class="data-input label-input" placeholder="Enter label"></td>
            <td><input type="number" class="data-input value-input" placeholder="Enter value"></td>
            <td><button class="btn btn-danger remove-row">Remove</button></td>
          </tr>
        `;
        this.chartData = { labels: [], values: [], colors: [] };
        this.updateChart();
        this.showToast('Data has been reset', 'success');
      }
    });

    shadow.getElementById('bulk-edit').addEventListener('click', () => {
      shadow.getElementById('table-view').style.display = 'none';
      shadow.getElementById('bulk-edit-view').style.display = 'block';
      const csvData = this.chartData.labels.map((label, index) => 
        `${label},${this.chartData.values[index]}`
      ).join('\n');
      shadow.getElementById('csv-data').value = csvData;
    });

    shadow.getElementById('cancel-bulk').addEventListener('click', () => {
      shadow.getElementById('table-view').style.display = 'block';
      shadow.getElementById('bulk-edit-view').style.display = 'none';
    });

    shadow.getElementById('apply-csv').addEventListener('click', () => {
      const csvText = shadow.getElementById('csv-data').value;
      const rows = csvText.split('\n').filter(row => row.trim() !== '');
      if (rows.length === 0) {
        this.showToast('No data to apply', 'error');
        return;
      }
      shadow.getElementById('data-rows').innerHTML = '';
      rows.forEach(row => {
        const [label, value] = row.split(',').map(item => item.trim());
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
          <td><input type="text" class="data-input label-input" placeholder="Enter label" value="${label || ''}"></td>
          <td><input type="number" class="data-input value-input" placeholder="Enter value" value="${value || ''}"></td>
          <td><button class="btn btn-danger remove-row">Remove</button></td>
        `;
        shadow.getElementById('data-rows').appendChild(newRow);
        newRow.classList.add('animate-in');
      });
      shadow.getElementById('table-view').style.display = 'block';
      shadow.getElementById('bulk-edit-view').style.display = 'none';
      this.showToast(`${rows.length} rows imported successfully`, 'success');
    });

    shadow.getElementById('import-csv').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
          const csvData = event.target.result;
          shadow.getElementById('csv-data').value = csvData;
          shadow.getElementById('table-view').style.display = 'none';
          shadow.getElementById('bulk-edit-view').style.display = 'block';
          this.showToast('CSV file imported', 'success');
        };
        reader.readAsText(file);
      };
      input.click();
    });

    shadow.getElementById('chart-type').addEventListener('change', (e) => {
      this.chartOptions.type = e.target.value;
      this.updateChart();
    });

    shadow.getElementById('chart-title').addEventListener('change', (e) => {
      this.chartOptions.title = e.target.value;
      this.updateChart();
    });

    shadow.getElementById('show-legend').addEventListener('change', (e) => {
      this.chartOptions.showLegend = e.target.checked;
      shadow.getElementById('legend-position-group').style.display = e.target.checked ? 'block' : 'none';
      this.updateChart();
    });

    shadow.getElementById('legend-position').addEventListener('change', (e) => {
      this.chartOptions.legendPosition = e.target.value;
      this.updateChart();
    });

    shadow.getElementById('enable-animation').addEventListener('change', (e) => {
      this.chartOptions.animation = e.target.checked;
      this.updateChart();
    });

    shadow.getElementById('enable-data-labels').addEventListener('change', (e) => {
      this.chartOptions.enableDataLabels = e.target.checked;
      this.updateChart();
    });

    shadow.getElementById('enable-tooltips').addEventListener('change', (e) => {
      this.chartOptions.enableTooltips = e.target.checked;
      this.updateChart();
    });

    shadow.getElementById('aspect-ratio').addEventListener('change', (e) => {
      this.chartOptions.aspectRatio = parseFloat(e.target.value);
      this.updateChart();
    });

    shadow.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        shadow.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        this.chartOptions.theme = option.dataset.theme;
        this.updateChart();
      });
    });

    shadow.getElementById('use-custom-colors').addEventListener('change', (e) => {
      this.chartOptions.useCustomColors = e.target.checked;
      shadow.getElementById('color-pickers').style.opacity = e.target.checked ? '1' : '0.5';
      this.updateChart();
    });

    shadow.getElementById('download-png').addEventListener('click', () => {
      const canvas = shadow.getElementById('chart-canvas');
      const link = document.createElement('a');
      link.download = `${this.chartOptions.title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.showToast('Chart downloaded as PNG', 'success');
    });

    shadow.getElementById('download-csv').addEventListener('click', () => {
      const csvContent = 'data:text/csv;charset=utf-8,' + 
        'Label,Value\n' +
        this.chartData.labels.map((label, i) => `${label},${this.chartData.values[i]}`).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${this.chartOptions.title.replace(/\s+/g, '-').toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast('Data downloaded as CSV', 'success');
    });
  }

  validateData() {
    const shadow = this.shadowRoot;
    const rows = shadow.querySelectorAll('#data-rows tr');
    let isValid = true;
    let hasData = false;

    rows.forEach(row => {
      const label = row.querySelector('.label-input').value;
      const value = row.querySelector('.value-input').value;
      
      if (label && value) hasData = true;
      if ((label && !value) || (!label && value)) {
        row.classList.add('shake');
        setTimeout(() => row.classList.remove('shake'), 500);
        isValid = false;
      }
    });

    if (!hasData) {
      this.showToast('Please add at least one complete data entry', 'error');
      return false;
    }
    if (!isValid) {
      this.showToast('Please complete all data entries', 'error');
      return false;
    }
    return true;
  }

  showToast(message, type = 'default') {
    const toast = this.shadowRoot.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type ? 'toast-' + type : ''}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  updateChart() {
    const shadow = this.shadowRoot;
    this.collectChartData();
    this.updateColorPickers();

    if (this.chartInstance) this.chartInstance.destroy();
    if (this.chartData.labels.length === 0) return;

    const ctx = shadow.getElementById('chart-canvas').getContext('2d');
    let backgroundColor = this.chartOptions.useCustomColors && this.chartData.colors.length 
      ? this.chartData.colors 
      : this.getThemeColors(this.chartData.labels.length);

    const config = {
      type: this.chartOptions.type,
      data: {
        labels: this.chartData.labels,
        datasets: [{
          data: this.chartData.values,
          backgroundColor,
          borderColor: this.chartOptions.type === 'line' ? backgroundColor[0] : 'white',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        aspectRatio: this.chartOptions.aspectRatio || 1.78,
        animation: {
          animateRotate: this.chartOptions.animation,
          animateScale: this.chartOptions.animation
        },
        plugins: {
          legend: {
            display: this.chartOptions.showLegend,
            position: this.chartOptions.legendPosition
          },
          title: {
            display: true,
            text: this.chartOptions.title
          },
          tooltip: { enabled: this.chartOptions.enableTooltips !== false },
          datalabels: {
            display: this.chartOptions.enableDataLabels,
            color: '#fff',
            formatter: (value, context) => {
              const sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              return `${((value / sum) * 100).toFixed(1)}%`;
            }
          }
        }
      }
    };

    this.chartInstance = new Chart(ctx, config);
  }

  collectChartData() {
    const shadow = this.shadowRoot;
    this.chartData.labels = [];
    this.chartData.values = [];

    shadow.querySelectorAll('#data-rows tr').forEach(row => {
      const label = row.querySelector('.label-input').value.trim();
      const value = parseFloat(row.querySelector('.value-input').value) || 0;
      if (label && value !== 0) {
        this.chartData.labels.push(label);
        this.chartData.values.push(value);
      }
    });
  }

  updateColorPickers() {
    const shadow = this.shadowRoot;
    const container = shadow.getElementById('color-pickers');
    container.innerHTML = '';
    const themeColors = this.getThemeColors(this.chartData.labels.length);

    this.chartData.labels.forEach((label, index) => {
      if (!this.chartData.colors[index]) this.chartData.colors[index] = themeColors[index];
      const colorItem = document.createElement('div');
      colorItem.className = 'color-item';
      colorItem.innerHTML = `
        <input type="color" class="color-picker" value="${this.chartData.colors[index] || themeColors[index]}">
        <span class="color-label">${label}</span>
      `;
      container.appendChild(colorItem);
      colorItem.querySelector('.color-picker').addEventListener('change', (e) => {
        this.chartData.colors[index] = e.target.value;
        if (this.chartOptions.useCustomColors) this.updateChart();
      });
    });
  }

  getThemeColors(count) {
    const theme = this.chartOptions.theme || 'default';
    const colors = [];
    for (let i = 0; i < count; i++) {
      const varIndex = (i % 10) + 1;
      const colorVar = getComputedStyle(this.shadowRoot.host).getPropertyValue(`--chart-bg${varIndex}`).trim();
      colors.push(colorVar || this.generateRandomColor());
    }
    return colors.length ? colors : this.generateDefaultColors(count);
  }

  generateRandomColor() {
    return `hsl(${Math.random() * 360}, 70%, 50%)`;
  }

  generateDefaultColors(count) {
    const defaultColors = ['#4285f4', '#db4437', '#f4b400', '#0f9d58', '#673ab7', '#3f51b5', '#039be5', '#009688', '#ff5722', '#795548'];
    const colors = [];
    for (let i = 0; i < count; i++) colors.push(defaultColors[i % defaultColors.length]);
    return colors;
  }

  // Property getters and setters
  get showDataTab() {
    return this._showDataTab;
  }

  set showDataTab(value) {
    this._showDataTab = Boolean(value);
    this.setAttribute('show-data-tab', this._showDataTab);
  }

  get showSettingsTab() {
    return this._showSettingsTab;
  }

  set showSettingsTab(value) {
    this._showSettingsTab = Boolean(value);
    this.setAttribute('show-settings-tab', this._showSettingsTab);
  }

  get showStyleTab() {
    return this._showStyleTab;
  }

  set showStyleTab(value) {
    this._showStyleTab = Boolean(value);
    this.setAttribute('show-style-tab', this._showStyleTab);
  }
}

customElements.define('chart-builder', ChartBuilderElement);
