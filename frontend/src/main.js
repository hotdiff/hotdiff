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
  syncSplitScroll(area);
  setupDiffHeader(area);
  syncRowHeights(area);
}

function setupDiffHeader(container) {
  const summary = container.querySelector('.diff-summary');
  const leftPanel = container.querySelector('.left-panel');
  const rightPanel = container.querySelector('.right-panel');
  if (!summary || !leftPanel || !rightPanel) return;

  const btnGroup = document.createElement('div');
  btnGroup.className = 'diff-header-actions';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'diff-nav-btn';
  prevBtn.title = '上一个差异';
  prevBtn.innerHTML = '&#9650;';
  prevBtn.addEventListener('click', () => jumpToChange(leftPanel, rightPanel, -1));

  const nextBtn = document.createElement('button');
  nextBtn.className = 'diff-nav-btn';
  nextBtn.title = '下一个差异';
  nextBtn.innerHTML = '&#9660;';
  nextBtn.addEventListener('click', () => jumpToChange(leftPanel, rightPanel, 1));

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'collapse-toggle-btn';
  collapseBtn.title = '折叠未变化区域';
  collapseBtn.innerHTML = '&plusmn;';
  collapseBtn.addEventListener('click', () => {
    collapseBtn.classList.toggle('active');
    applyCollapse(leftPanel, rightPanel, collapseBtn.classList.contains('active'));
  });

  btnGroup.appendChild(prevBtn);
  btnGroup.appendChild(nextBtn);
  btnGroup.appendChild(collapseBtn);
  summary.appendChild(btnGroup);
}

function jumpToChange(leftPanel, rightPanel, direction) {
  const leftTable = leftPanel.querySelector('table');
  const rightTable = rightPanel.querySelector('table');
  if (!leftTable || !rightTable) return;

  const leftRows = leftTable.querySelectorAll('tr:not(.collapse-placeholder)');
  const rightRows = rightTable.querySelectorAll('tr:not(.collapse-placeholder)');
  const len = Math.min(leftRows.length, rightRows.length);

  const changes = [];
  for (let i = 0; i < len; i++) {
    if (isChanged(leftRows[i], rightRows[i]) && leftRows[i].style.display !== 'none') {
      changes.push(i);
    }
  }
  if (changes.length === 0) return;

  const panelRect = rightPanel.getBoundingClientRect();
  let current = -1;
  for (let i = 0; i < changes.length; i++) {
    const row = rightRows[changes[i]];
    if (row.getBoundingClientRect().top - panelRect.top > -20) { current = i; break; }
  }
  if (current === -1) current = changes.length - 1;

  const targetIdx = (current + direction + changes.length) % changes.length;
  const targetRow = rightRows[changes[targetIdx]];

  const rowRelativeTop = targetRow.getBoundingClientRect().top - panelRect.top;
  const scrollTarget = rightPanel.scrollTop + rowRelativeTop - 60;

  leftPanel.scrollTop = scrollTarget;
  rightPanel.scrollTop = scrollTarget;

  targetRow.style.transition = 'background 0.15s';
  targetRow.style.background = '#45475a';
  setTimeout(() => {
    targetRow.style.transition = 'background 0.5s';
    targetRow.style.background = '';
  }, 800);
}

function isChanged(leftRow, rightRow) {
  return leftRow.classList.contains('del-code') || leftRow.classList.contains('add-code') ||
         rightRow.classList.contains('del-code') || rightRow.classList.contains('add-code');
}

function syncRowHeights(container) {
  const left = container.querySelector('.left-panel');
  const right = container.querySelector('.right-panel');
  if (left && right) syncRowHeightsForPanels(left, right);
}

function syncRowHeightsForPanels(leftPanel, rightPanel) {
  const leftTable = leftPanel.querySelector('table');
  const rightTable = rightPanel.querySelector('table');
  if (!leftTable || !rightTable) return;

  const leftRows = leftTable.querySelectorAll('tr:not(.collapse-placeholder)');
  const rightRows = rightTable.querySelectorAll('tr:not(.collapse-placeholder)');
  const len = Math.min(leftRows.length, rightRows.length);

  for (let i = 0; i < len; i++) {
    leftRows[i].style.height = '';
    rightRows[i].style.height = '';
  }

  const heights = [];
  for (let i = 0; i < len; i++) {
    const lVis = leftRows[i].style.display !== 'none';
    const rVis = rightRows[i].style.display !== 'none';
    heights.push({
      lh: lVis ? leftRows[i].getBoundingClientRect().height : 0,
      rh: rVis ? rightRows[i].getBoundingClientRect().height : 0,
    });
  }

  for (let i = 0; i < len; i++) {
    const maxH = Math.max(heights[i].lh, heights[i].rh);
    if (maxH > 0 && leftRows[i].style.display !== 'none') {
      leftRows[i].style.height = maxH + 'px';
    }
    if (maxH > 0 && rightRows[i].style.display !== 'none') {
      rightRows[i].style.height = maxH + 'px';
    }
  }
}

const COLLAPSE_CONTEXT = 3;

function applyCollapse(leftPanel, rightPanel, collapsed) {
  const leftTable = leftPanel.querySelector('table');
  const rightTable = rightPanel.querySelector('table');
  if (!leftTable || !rightTable) return;

  leftTable.querySelectorAll('.collapse-placeholder').forEach(el => el.remove());
  rightTable.querySelectorAll('.collapse-placeholder').forEach(el => el.remove());

  const leftRows = leftTable.querySelectorAll('tr:not(.collapse-placeholder)');
  const rightRows = rightTable.querySelectorAll('tr:not(.collapse-placeholder)');
  const len = Math.min(leftRows.length, rightRows.length);

  for (let i = 0; i < len; i++) {
    leftRows[i].style.display = '';
    rightRows[i].style.display = '';
  }

  if (!collapsed) return;

  const keep = new Array(len).fill(false);
  let inBlock = false;
  let blockStart = -1;

  for (let i = 0; i < len; i++) {
    if (isChanged(leftRows[i], rightRows[i]) && leftRows[i].style.display !== 'none') {
      if (!inBlock) { inBlock = true; blockStart = i; }
    } else {
      if (inBlock) {
        for (let j = Math.max(0, blockStart - COLLAPSE_CONTEXT); j < Math.min(len, i + COLLAPSE_CONTEXT); j++) {
          keep[j] = true;
        }
        inBlock = false;
      }
    }
  }
  if (inBlock) {
    for (let j = Math.max(0, blockStart - COLLAPSE_CONTEXT); j < len; j++) {
      keep[j] = true;
    }
  }

  for (let i = 0; i < len; i++) {
    if (leftRows[i].classList.contains('tag-code')) keep[i] = true;
  }

  let i = 0;
  while (i < len) {
    if (!keep[i]) {
      const start = i;
      while (i < len && !keep[i]) i++;
      const count = i - start;

      for (let j = start; j < i; j++) {
        leftRows[j].style.display = 'none';
        rightRows[j].style.display = 'none';
      }

      const ph = `<tr class="collapse-placeholder"><td colspan="3" class="placeholder-cell">⋮ ${count} unchanged lines</td></tr>`;

      if (i < len) {
        leftRows[i].insertAdjacentHTML('beforebegin', ph);
        rightRows[i].insertAdjacentHTML('beforebegin', ph);
      } else {
        leftTable.insertAdjacentHTML('beforeend', ph);
        rightTable.insertAdjacentHTML('beforeend', ph);
      }
    } else {
      i++;
    }
  }

  syncRowHeightsForPanels(leftPanel, rightPanel);
}

function syncSplitScroll(container) {
  const left = container.querySelector('.left-panel');
  const right = container.querySelector('.right-panel');
  if (!left || !right) return;

  left.addEventListener('scroll', () => {
    if (Math.abs(right.scrollTop - left.scrollTop) > 1) {
      right.scrollTop = left.scrollTop;
    }
    if (Math.abs(right.scrollLeft - left.scrollLeft) > 0) {
      right.scrollLeft = left.scrollLeft;
    }
  });
  right.addEventListener('scroll', () => {
    if (Math.abs(left.scrollTop - right.scrollTop) > 1) {
      left.scrollTop = right.scrollTop;
    }
    if (Math.abs(left.scrollLeft - right.scrollLeft) > 0) {
      left.scrollLeft = right.scrollLeft;
    }
  });
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
