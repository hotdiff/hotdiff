import './style.css';
import './app.css';
import { SelectDirectory, SelectFile, StartCompare, GetDiffDetail } from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime';

let appState = {
  view: 'home',
  result: null,
  tabs: [],
  activeTab: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHome() {
  appState.view = 'home';
  const app = $('#app');
  app.innerHTML = `
    <div class="app-container">
      <header class="app-header">
        <h1>HotDiff</h1>
        <p class="subtitle">文件比较工具</p>
      </header>
      <main class="home-view">
        <div class="compare-form">
          <div class="input-group">
            <label>左侧目录 / 文件</label>
            <div class="input-row">
              <input type="text" id="leftPath" class="path-input" placeholder="选择左侧目录或文件..." readonly />
              <button class="btn btn-secondary" onclick="window.selectLeft()">选择目录</button>
              <button class="btn btn-secondary" onclick="window.selectLeftFile()">选择文件</button>
            </div>
          </div>
          <div class="input-group">
            <label>右侧目录 / 文件</label>
            <div class="input-row">
              <input type="text" id="rightPath" class="path-input" placeholder="选择右侧目录或文件..." readonly />
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
    </div>
  `;

  window.selectLeft = async () => {
    const dir = await SelectDirectory();
    if (dir) $('#leftPath').value = dir;
  };
  window.selectLeftFile = async () => {
    const file = await SelectFile();
    if (file) $('#leftPath').value = file;
  };
  window.selectRight = async () => {
    const dir = await SelectDirectory();
    if (dir) $('#rightPath').value = dir;
  };
  window.selectRightFile = async () => {
    const file = await SelectFile();
    if (file) $('#rightPath').value = file;
  };

  window.startCompare = async () => {
    const left = $('#leftPath').value.trim();
    const right = $('#rightPath').value.trim();
    if (!left || !right) {
      alert('请选择左右两侧的目录或文件');
      return;
    }
    doCompare(left, right);
  };
}

function doCompare(left, right) {
  const progressArea = $('#progressArea');
  const progressBar = $('#progressBar');
  const progressText = $('#progressText');
  const compareBtn = $('#compareBtn');

  progressArea.classList.remove('hidden');
  compareBtn.disabled = true;
  compareBtn.textContent = '比较中...';

  const unlisten = EventsOn('compare-progress', (progress) => {
    if (progress.error) {
      progressText.textContent = '错误: ' + progress.error;
      compareBtn.disabled = false;
      compareBtn.innerHTML = '<span class="btn-icon">⚡</span> Compare';
      unlisten();
      return;
    }
    if (progress.completed) {
      progressBar.style.width = '100%';
      progressText.textContent = '比较完成！';
      compareBtn.disabled = false;
      compareBtn.innerHTML = '<span class="btn-icon">⚡</span> Compare';
      unlisten();
      if (progress.result) {
        appState.result = progress.result;
        renderResult();
      }
      return;
    }
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    progressBar.style.width = pct + '%';
    progressText.textContent = progress.current + ' / ' + progress.total + ': ' + escapeHtml(progress.fileName);
  });

  StartCompare(left, right);
}

function renderResult() {
  appState.view = 'result';
  const result = appState.result;
  if (!result) return;

  const app = $('#app');
  app.innerHTML = `
    <div class="app-container result-layout">
      <header class="app-header result-header">
        <div class="header-left">
          <button class="btn btn-back" onclick="window.goHome()">← 返回</button>
          <h2>比较结果</h2>
        </div>
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
      <div id="tabContainer" class="tab-container hidden">
        <div class="tab-bar" id="tabBar"></div>
        <div class="tab-content" id="tabContent"></div>
      </div>
    </div>
  `;

  window.goHome = () => {
    appState.tabs = [];
    appState.activeTab = null;
    renderHome();
  };

  renderDiffList(result);
}

function renderDiffList(result) {
  const container = $('#diffList');
  if (!container) return;

  const rows = buildDiffRows(result.files, result);

  let htmlStr = '';
  for (const row of rows) {
    const leftIndent = row.depth * 16;
    const rightIndent = row.depth * 16;

    if (row.isDir) {
      htmlStr += `
        <div class="diff-row dir-row collapsed" data-path="${escapeHtml(row.path)}">
          <div class="diff-cell left-cell" style="padding-left: ${leftIndent}px">
            <span class="tree-icon">📁</span><span>${escapeHtml(row.name)}</span>
          </div>
          <div class="diff-cell center-cell"></div>
          <div class="diff-cell right-cell" style="padding-left: ${rightIndent}px">
            <span class="tree-icon">📁</span><span>${escapeHtml(row.name)}</span>
          </div>
        </div>
      `;
    } else {
      const statusIcon = getStatusIcon(row.status);
      const statusCls = getStatusClass(row.status);
      htmlStr += `
        <div class="diff-row file-row" data-path="${escapeHtml(row.path)}">
          <div class="diff-cell left-cell" style="padding-left: ${leftIndent}px">
            <span class="tree-icon">📄</span><span>${escapeHtml(row.name)}</span>
          </div>
          <div class="diff-cell center-cell ${statusCls}">${statusIcon}</div>
          <div class="diff-cell right-cell" style="padding-left: ${rightIndent}px">
            <span class="tree-icon">📄</span><span>${escapeHtml(row.name)}</span>
          </div>
        </div>
      `;
    }
  }
  container.innerHTML = htmlStr;

  container.addEventListener('click', (e) => {
    const row = e.target.closest('.diff-row');
    if (!row) return;

    if (row.classList.contains('dir-row')) {
      row.classList.toggle('collapsed');
      const allRows = container.querySelectorAll('.diff-row');
      updateRowVisibility(allRows);
      return;
    }

    const path = row.dataset.path;
    const file = result.files.find(f => f.relativePath === path);
    if (!file || file.isDir) return;

    const leftPath = file.leftPath || '';
    const rightPath = file.rightPath || '';
    if (!leftPath && !rightPath) return;

    openTab(file, leftPath, rightPath);
  });
}

function updateRowVisibility(rows) {
  for (const row of rows) {
    const path = row.dataset.path;
    let shouldHide = false;
    for (const other of rows) {
      if (other === row) break;
      const otherPath = other.dataset.path;
      if (other.classList.contains('dir-row') && other.classList.contains('collapsed') && otherPath) {
        if (path && path.startsWith(otherPath + '/')) {
          shouldHide = true;
          break;
        }
      }
    }
    row.style.display = shouldHide ? 'none' : '';
  }
}

function buildDiffRows(files, result) {
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
        item = {
          name: parts[i],
          path: parts.slice(0, i + 1).join('/'),
          isDir: isDir || f.isDir,
          status: isDir ? -1 : f.status,
          leftName: isDir ? parts[i] : (f.leftPath ? f.name : ''),
          rightName: isDir ? parts[i] : (f.rightPath ? f.name : ''),
          leftPath: isDir ? '' : f.leftPath,
          rightPath: isDir ? '' : f.rightPath,
          children: [],
          fileResult: isDir ? null : f,
        };
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
    rows.push({
      name: node.name,
      path: node.path,
      depth: depth,
      isDir: node.isDir,
      status: node.status,
      leftName: node.leftName,
      rightName: node.rightName,
      leftPath: node.leftPath,
      rightPath: node.rightPath,
    });
    if (node.children.length > 0) {
      flattenTreeRows(node.children, rows, depth + 1);
    }
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 0: return '=';
    case 1: return '\u2260';
    case 2: return '\u2248';
    case 3: return 'L';
    case 4: return 'R';
    default: return '?';
  }
}

function getStatusClass(status) {
  switch (status) {
    case 0: return 'status-same';
    case 1: return 'status-different';
    case 2: return 'status-similar';
    case 3: return 'status-left-only';
    case 4: return 'status-right-only';
    default: return '';
  }
}

function openTab(file, leftPath, rightPath) {
  const existing = appState.tabs.find(t => t.path === file.relativePath);
  if (existing) {
    appState.activeTab = existing.id;
    renderTabs();
    return;
  }

  const tabId = 'tab_' + Date.now();
  const tab = {
    id: tabId,
    path: file.relativePath,
    name: file.name,
    leftPath,
    rightPath,
    loading: true,
    content: '',
    isCsv: file.isCsv,
  };
  appState.tabs.push(tab);
  appState.activeTab = tabId;
  renderTabs();

  loadTabContent(tab);
}

async function loadTabContent(tab) {
  try {
    const result = await GetDiffDetail(tab.leftPath, tab.rightPath);
    tab.content = result.html || '';
    tab.isCsv = result.isCsv || false;
    if (result.error) {
      tab.content = '<div class="error-message">' + escapeHtml(result.error) + '</div>';
    }
  } catch (err) {
    tab.content = '<div class="error-message">' + escapeHtml(String(err)) + '</div>';
  }
  tab.loading = false;
  renderTabs();
}

function renderTabs() {
  const container = $('#tabContainer');
  const bar = $('#tabBar');
  const content = $('#tabContent');
  if (!container || !bar || !content) return;

  container.classList.remove('hidden');

  if (appState.tabs.length === 0) {
    container.classList.add('hidden');
    return;
  }

  let barHtml = '';
  for (const tab of appState.tabs) {
    const active = tab.id === appState.activeTab ? ' active' : '';
    barHtml += `
      <div class="tab-item${active}" data-tab-id="${tab.id}" onclick="window.switchTab('${tab.id}')">
        <span class="tab-name">${escapeHtml(tab.name)}</span>
        <span class="tab-close" onclick="event.stopPropagation(); window.closeTab('${tab.id}')">×</span>
      </div>
    `;
  }
  bar.innerHTML = barHtml;

  const activeTab = appState.tabs.find(t => t.id === appState.activeTab);
  if (activeTab) {
    if (activeTab.loading) {
      content.innerHTML = '<div class="tab-loading"><div class="loading-spinner"></div><p>加载差异详情...</p></div>';
    } else {
      content.innerHTML = activeTab.content;
    }
  } else {
    content.innerHTML = '';
  }

  window.switchTab = (id) => {
    appState.activeTab = id;
    renderTabs();
  };

  window.closeTab = (id) => {
    appState.tabs = appState.tabs.filter(t => t.id !== id);
    if (appState.activeTab === id) {
      appState.activeTab = appState.tabs.length > 0 ? appState.tabs[appState.tabs.length - 1].id : null;
    }
    renderTabs();
  };
}

document.addEventListener('DOMContentLoaded', () => {
  renderHome();
});
