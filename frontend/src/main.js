import './style.css';
import './app.css';
import { SelectDirectory, SelectFile, StartCompare, GetDiffDetail } from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime';

const appState = {
  tabs: [],
  activeTab: null,
};

const $ = (sel) => document.querySelector(sel);

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Tab management ──

function tabLabel(tab) {
  switch (tab.type) {
    case 'home': return 'Home';
    case 'result': return tab.loading ? '比较中...' : '比较结果';
    case 'file': return tab.name;
    default: return '';
  }
}

function addTab(tab) {
  appState.tabs.push(tab);
  appState.activeTab = tab.id;
  renderApp();
}

function switchTab(id) {
  appState.activeTab = id;
  renderContent();
  highlightActiveTab();
}

function closeTab(id) {
  const idx = appState.tabs.findIndex(t => t.id === id);
  if (idx === -1) return;
  const tab = appState.tabs[idx];
  if (tab.type === 'home') return;

  appState.tabs.splice(idx, 1);
  if (appState.activeTab === id) {
    appState.activeTab = appState.tabs[Math.min(idx, appState.tabs.length - 1)]?.id || null;
  }
  if (appState.tabs.length === 0) {
    createAndShowHome();
    return;
  }
  renderApp();
}

function highlightActiveTab() {
  document.querySelectorAll('.tab-item').forEach(el => {
    const id = el.dataset.tabId;
    el.classList.toggle('active', id === appState.activeTab);
  });
}

// ── Shell rendering ──

function renderApp() {
  let barHtml = '';
  for (const tab of appState.tabs) {
    const active = tab.id === appState.activeTab ? ' active' : '';
    const closable = tab.type !== 'home';
    barHtml += `
      <div class="tab-item${active}" data-tab-id="${tab.id}" onclick="window.switchTab('${tab.id}')">
        <span class="tab-name">${escapeHtml(tabLabel(tab))}</span>
        ${closable ? `<span class="tab-close" onclick="event.stopPropagation(); window.closeTab('${tab.id}')">×</span>` : ''}
      </div>
    `;
  }

  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <div class="tab-bar-row">${barHtml}</div>
      <div class="tab-content-area" id="contentArea"></div>
    </div>
  `;

  window.switchTab = switchTab;
  window.closeTab = closeTab;

  renderContent();
}

function renderContent() {
  const area = document.getElementById('contentArea');
  if (!area) return;

  const tab = appState.tabs.find(t => t.id === appState.activeTab);
  if (!tab) { area.innerHTML = ''; return; }

  switch (tab.type) {
    case 'home': renderHomeContent(area, tab); break;
    case 'result': renderResultContent(area, tab); break;
    case 'file': renderFileContent(area, tab); break;
  }
}

// ── Home tab ──

function createAndShowHome() {
  appState.tabs = [{ id: 'home', type: 'home', leftPath: '', rightPath: '' }];
  appState.activeTab = 'home';
  renderApp();
}

function renderHomeContent(area, tab) {
  area.innerHTML = `
    <main class="home-view">
      <header class="app-header">
        <h1>HotDiff</h1>
        <p class="subtitle">文件比较工具</p>
      </header>
      <div class="compare-form">
        <div class="input-group">
          <label>左侧目录 / 文件</label>
          <div class="input-row">
            <input type="text" id="leftPath" class="path-input" value="${escapeHtml(tab.leftPath || '')}" placeholder="选择左侧目录或文件..." readonly />
            <button class="btn btn-secondary" onclick="window.selectLeft()">选择目录</button>
            <button class="btn btn-secondary" onclick="window.selectLeftFile()">选择文件</button>
          </div>
        </div>
        <div class="input-group">
          <label>右侧目录 / 文件</label>
          <div class="input-row">
            <input type="text" id="rightPath" class="path-input" value="${escapeHtml(tab.rightPath || '')}" placeholder="选择右侧目录或文件..." readonly />
            <button class="btn btn-secondary" onclick="window.selectRight()">选择目录</button>
            <button class="btn btn-secondary" onclick="window.selectRightFile()">选择文件</button>
          </div>
        </div>
        <button id="compareBtn" class="btn btn-primary btn-lg" onclick="window.startCompare()">
          <span class="btn-icon">⚡</span> Compare
        </button>
        <div id="progressArea" class="progress-area hidden">
          <div class="progress-bar-container">
            <div id="progressBar" class="progress-bar"></div>
          </div>
          <p id="progressText" class="progress-text">准备中...</p>
        </div>
      </div>
    </main>
  `;

  window.selectLeft = async () => {
    const dir = await SelectDirectory();
    if (dir) { tab.leftPath = dir; $('#leftPath').value = dir; }
  };
  window.selectLeftFile = async () => {
    const file = await SelectFile();
    if (file) { tab.leftPath = file; $('#leftPath').value = file; }
  };
  window.selectRight = async () => {
    const dir = await SelectDirectory();
    if (dir) { tab.rightPath = dir; $('#rightPath').value = dir; }
  };
  window.selectRightFile = async () => {
    const file = await SelectFile();
    if (file) { tab.rightPath = file; $('#rightPath').value = file; }
  };

  window.startCompare = () => {
    const left = $('#leftPath').value.trim();
    const right = $('#rightPath').value.trim();
    if (!left || !right) { alert('请选择左右两侧的目录或文件'); return; }
    tab.leftPath = left;
    tab.rightPath = right;
    doCompare(left, right);
  };
}

// ── Compare logic ──

function doCompare(left, right) {
  const resultTab = { id: 'result_' + Date.now(), type: 'result', leftPath: left, rightPath: right, result: null, loading: true, progress: null, error: null };
  addTab(resultTab);

  const unlisten = EventsOn('compare-progress', (progress) => {
    if (progress.error) {
      resultTab.error = progress.error;
      resultTab.loading = false;
      unlisten();
      renderContent();
      updateTabLabel(resultTab);
      return;
    }
    if (progress.completed) {
      resultTab.result = progress.result;
      resultTab.loading = false;
      unlisten();
      renderContent();
      updateTabLabel(resultTab);
      return;
    }
    resultTab.progress = { current: progress.current, total: progress.total, fileName: progress.fileName };
    if (appState.activeTab === resultTab.id) {
      updateProgressBar(progress);
    }
  });

  StartCompare(left, right);
}

function updateProgressBar(progress) {
  const bar = $('#progressBar');
  const text = $('#progressText');
  if (!bar || !text) return;
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  bar.style.width = pct + '%';
  text.textContent = progress.current + ' / ' + progress.total + ': ' + (progress.fileName || '');
}

function updateTabLabel(tab) {
  const el = document.querySelector(`.tab-item[data-tab-id="${tab.id}"] .tab-name`);
  if (el) el.textContent = tabLabel(tab);
}

// ── Result tab ──

function renderResultContent(area, tab) {
  if (tab.error) {
    area.innerHTML = `<div class="error-message">${escapeHtml(tab.error)}</div>`;
    return;
  }

  if (tab.loading || !tab.result) {
    const pct = tab.progress ? Math.round((tab.progress.current / tab.progress.total) * 100) : 0;
    const text = tab.progress ? `${tab.progress.current} / ${tab.progress.total}: ${escapeHtml(tab.progress.fileName)}` : '准备中...';
    area.innerHTML = `
      <div class="result-view">
        <header class="app-header result-header"><h2>比较结果</h2></header>
        <div class="progress-area">
          <div class="progress-bar-container">
            <div id="progressBar" class="progress-bar" style="width: ${pct}%"></div>
          </div>
          <p id="progressText" class="progress-text">${text}</p>
        </div>
      </div>
    `;
    return;
  }

  const result = tab.result;
  area.innerHTML = `
    <div class="result-view">
      <header class="app-header result-header">
        <div class="header-left"><h2>比较结果</h2></div>
        <div class="header-stats">
          <span class="stat stat-same">= ${result.sameCount}</span>
          <span class="stat stat-diff">≠ ${result.differentCount}</span>
          <span class="stat stat-similar">≈ ${result.similarCount}</span>
          <span class="stat stat-left">L: ${result.leftOnlyCount}</span>
          <span class="stat stat-right">R: ${result.rightOnlyCount}</span>
        </div>
      </header>
      <div class="result-content">
        <div class="panel-header-row">
          <div class="panel-header panel-left">${escapeHtml(result.leftDir)}</div>
          <div class="panel-header panel-center">状态</div>
          <div class="panel-header panel-right">${escapeHtml(result.rightDir)}</div>
        </div>
        <div id="diffList" class="diff-list"></div>
      </div>
    </div>
  `;

  renderDiffList(result);
}

// ── File tab ──

function renderFileContent(area, tab) {
  if (tab.loading) {
    area.innerHTML = '<div class="tab-loading"><div class="loading-spinner"></div><p>加载差异详情...</p></div>';
    return;
  }
  area.innerHTML = tab.content || '<div class="error-message">暂无内容</div>';
}

async function loadFileTab(tab) {
  try {
    const res = await GetDiffDetail(tab.leftPath, tab.rightPath);
    tab.content = res.html || '';
    tab.isCsv = res.isCsv || false;
    if (res.error) tab.content = '<div class="error-message">' + escapeHtml(res.error) + '</div>';
  } catch (err) {
    tab.content = '<div class="error-message">' + escapeHtml(String(err)) + '</div>';
  }
  tab.loading = false;
  renderContent();
}

// ── Diff list (inside result tab) ──

function renderDiffList(result) {
  const container = $('#diffList');
  if (!container) return;

  const rows = buildDiffRows(result.files, result);

  let htmlStr = '';
  for (const row of rows) {
    const indent = row.depth * 16;
    if (row.isDir) {
      htmlStr += `
        <div class="diff-row dir-row collapsed" data-path="${escapeHtml(row.path)}">
          <div class="diff-cell left-cell" style="padding-left:${indent}px"><span class="tree-icon">📁</span><span>${escapeHtml(row.name)}</span></div>
          <div class="diff-cell center-cell"></div>
          <div class="diff-cell right-cell" style="padding-left:${indent}px"><span class="tree-icon">📁</span><span>${escapeHtml(row.name)}</span></div>
        </div>`;
    } else {
      const sIcon = getStatusIcon(row.status);
      const sCls = getStatusClass(row.status);
      htmlStr += `
        <div class="diff-row file-row" data-path="${escapeHtml(row.path)}">
          <div class="diff-cell left-cell" style="padding-left:${indent}px"><span class="tree-icon">📄</span><span>${escapeHtml(row.name)}</span></div>
          <div class="diff-cell center-cell ${sCls}">${sIcon}</div>
          <div class="diff-cell right-cell" style="padding-left:${indent}px"><span class="tree-icon">📄</span><span>${escapeHtml(row.name)}</span></div>
        </div>`;
    }
  }
  container.innerHTML = htmlStr;

  container.addEventListener('click', e => {
    const row = e.target.closest('.diff-row');
    if (!row) return;
    if (row.classList.contains('dir-row')) {
      row.classList.toggle('collapsed');
      updateRowVisibility(container.querySelectorAll('.diff-row'));
    }
  });

  container.addEventListener('dblclick', e => {
    const row = e.target.closest('.diff-row');
    if (!row || row.classList.contains('dir-row')) return;

    const path = row.dataset.path;
    const file = result.files.find(f => f.relativePath === path);
    if (!file || file.isDir) return;

    const leftPath = file.leftPath || '';
    const rightPath = file.rightPath || '';
    if (!leftPath && !rightPath) return;

    const existing = appState.tabs.find(t => t.type === 'file' && t.path === file.relativePath);
    if (existing) { appState.activeTab = existing.id; renderApp(); return; }

    const fileTab = { id: 'file_' + Date.now(), type: 'file', name: file.name, path: file.relativePath,
      leftPath, rightPath, content: '', loading: true, isCsv: file.isCsv };
    addTab(fileTab);
    loadFileTab(fileTab);
  });
}

function updateRowVisibility(rows) {
  for (const row of rows) {
    const path = row.dataset.path;
    let hide = false;
    for (const other of rows) {
      if (other === row) break;
      const op = other.dataset.path;
      if (other.classList.contains('dir-row') && other.classList.contains('collapsed') && op) {
        if (path && path.startsWith(op + '/')) { hide = true; break; }
      }
    }
    row.style.display = hide ? 'none' : '';
  }
}

function buildDiffRows(files) {
  const tree = buildFileTree(files);
  const rows = [];
  flattenTreeRows(tree, rows, 0);
  return rows;
}

function buildFileTree(files) {
  const root = [];
  for (const f of files) {
    const parts = f.relativePath.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      let item = current.find(x => x.name === parts[i] && (i < parts.length - 1 || !f.isDir));
      if (!item) {
        const isDir = i < parts.length - 1;
        item = { name: parts[i], path: parts.slice(0, i + 1).join('/'), isDir: isDir || f.isDir,
          status: isDir ? -1 : f.status, leftPath: isDir ? '' : f.leftPath, rightPath: isDir ? '' : f.rightPath,
          children: [] };
        current.push(item);
      }
      current = item.children;
    }
  }
  return root;
}

function flattenTreeRows(nodes, rows, depth) {
  const sorted = [...nodes].sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of sorted) {
    rows.push({ name: node.name, path: node.path, depth, isDir: node.isDir,
      status: node.status, leftPath: node.leftPath, rightPath: node.rightPath });
    if (node.children.length > 0) flattenTreeRows(node.children, rows, depth + 1);
  }
}

function getStatusIcon(status) {
  switch (status) { case 0: return '='; case 1: return '\u2260'; case 2: return '\u2248'; case 3: return 'L'; case 4: return 'R'; default: return '?'; }
}

function getStatusClass(status) {
  switch (status) { case 0: return 'status-same'; case 1: return 'status-different'; case 2: return 'status-similar'; case 3: return 'status-left-only'; case 4: return 'status-right-only'; default: return ''; }
}

// ── Init ──

document.addEventListener('DOMContentLoaded', () => {
  createAndShowHome();
});
