import { useMemo, useState, useCallback } from 'react';
import { Typography, Progress, Tag, Spin, Alert, Empty } from 'antd';
import { FileOutlined, FolderOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TabData, FileResult, CompareSummary } from '../models/types';
import { FileStatus } from '../models/types';

const { Text } = Typography;

interface ResultViewProps {
  tab: TabData;
  onOpenFileDiff: (tab: TabData) => void;
}

interface FlatRow {
  name: string;
  rightName: string;
  path: string;
  depth: number;
  isDir: boolean;
  status: number;
  leftPath: string;
  rightPath: string;
  isCsv: boolean;
  isImage: boolean;
}

function buildFileTree(files: FileResult[]) {
  const root: FlatRow[] = [];
  for (const f of files) {
    const parts = f.relativePath.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      let existing = current.find(
        (x) => x.name === parts[i] && (i < parts.length - 1 || !f.isDir)
      );
      if (!existing) {
        const isDir = i < parts.length - 1 || f.isDir;
        existing = {
          name: parts[i],
          rightName: f.rightName || '',
          path: parts.slice(0, i + 1).join('/'),
          depth: 0,
          isDir,
          status: isDir ? -1 : f.status,
          leftPath: isDir ? '' : f.leftPath,
          rightPath: isDir ? '' : f.rightPath,
          isCsv: f.isCsv,
          isImage: f.isImage,
        };
        current.push(existing);
      }
      current = (existing as any).children || ((existing as any).children = []);
    }
  }
  return root;
}

function flattenTree(nodes: any[], rows: FlatRow[], depth: number) {
  const sorted = [...nodes].sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of sorted) {
    rows.push({
      name: node.name,
      rightName: node.rightName,
      path: node.path,
      depth,
      isDir: node.isDir,
      status: node.status,
      leftPath: node.leftPath,
      rightPath: node.rightPath,
      isCsv: node.isCsv,
      isImage: node.isImage,
    });
    if (node.children && node.children.length > 0) {
      flattenTree(node.children, rows, depth + 1);
    }
  }
}

function getStatusChar(status: FileStatus): string {
  switch (status) {
    case FileStatus.Same: return '=';
    case FileStatus.Different: return '\u2260';
    case FileStatus.Similar: return '\u2248';
    case FileStatus.LeftOnly: return 'L';
    case FileStatus.RightOnly: return 'R';
    default: return '?';
  }
}

function getStatusColor(status: FileStatus): string {
  switch (status) {
    case FileStatus.Same: return 'var(--status-same)';
    case FileStatus.Different: return 'var(--status-different)';
    case FileStatus.Similar: return 'var(--status-similar)';
    case FileStatus.LeftOnly: return 'var(--status-left-only)';
    case FileStatus.RightOnly: return 'var(--status-right-only)';
    default: return 'var(--status-unknown)';
  }
}

export default function ResultView({ tab, onOpenFileDiff }: ResultViewProps) {
  const { t } = useTranslation();

  const allRows = useMemo(() => {
    if (!tab.result?.files) return [] as FlatRow[];
    const tree = buildFileTree(tab.result.files);
    const rows: FlatRow[] = [];
    flattenTree(tree, rows, 0);
    return rows;
  }, [tab.result]);

  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (allRows.length > 0) {
      for (const row of allRows) {
        if (row.isDir) set.add(row.path);
      }
    }
    return set;
  });

  const toggleDir = useCallback((path: string) => {
    setCollapsedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const visibleRows = useMemo(() => {
    const result: FlatRow[] = [];
    for (const row of allRows) {
      let hidden = false;
      for (const dir of collapsedDirs) {
        if (row.path.startsWith(dir + '/')) {
          hidden = true;
          break;
        }
      }
      if (!hidden) result.push(row);
    }
    return result;
  }, [allRows, collapsedDirs]);

  const handleOpenFile = useCallback((row: FlatRow) => {
    if (row.isDir) return;
    if (!row.leftPath && !row.rightPath) return;
    const label = row.rightName && row.rightName !== row.name
      ? `${row.name} \u2194 ${row.rightName}`
      : row.name;
    const fileTab: TabData = {
      id: 'file_' + Date.now(),
      type: 'file',
      label,
      fileName: row.name,
      filePath: row.path,
      leftPath: row.leftPath,
      rightPath: row.rightPath,
      isCsv: row.isCsv,
      isImage: row.isImage,
      loading: true,
    };
    onOpenFileDiff(fileTab);
  }, [onOpenFileDiff]);

  if (tab.error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert type="error" message={t('result.error.title')} description={tab.error} showIcon />
      </div>
    );
  }

  if (tab.loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
      }}>
        <div style={{ maxWidth: 400, width: '100%' }}>
          <Spin tip={t('result.comparing')} size="large" style={{ display: 'block', marginBottom: 24 }}>
            <div style={{ height: 50 }} />
          </Spin>
          {tab.progress && (
            <Progress
              percent={tab.progress.total > 0 ? Math.round((tab.progress.current / tab.progress.total) * 100) : 0}
              format={() => `${tab.progress?.current || 0} / ${tab.progress?.total || 0}`}
              strokeColor={{ from: 'var(--color-primary)', to: 'var(--status-left-only)' }}
              style={{ marginTop: 24 }}
            />
          )}
          {tab.progress && (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 14 }}>
              {tab.progress.fileName}
            </Text>
          )}
        </div>
      </div>
    );
  }

  const result = tab.result as CompareSummary;
  if (!result) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 14 }}>
          <Tag color="green" style={{ margin: 0 }}>= {result.sameCount}</Tag>
          <Tag color="red" style={{ margin: 0 }}>≠ {result.differentCount}</Tag>
          <Tag color="gold" style={{ margin: 0 }}>≈ {result.similarCount}</Tag>
          <Tag color="blue" style={{ margin: 0 }}>L: {result.leftOnlyCount}</Tag>
          <Tag color="purple" style={{ margin: 0 }}>R: {result.rightOnlyCount}</Tag>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 48px 1fr',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
      }}>
        <Text style={{
          padding: '8px 12px', fontSize: 14, fontWeight: 700,
          color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {result.leftDir}
        </Text>
        <Text style={{
          padding: '8px 0', fontSize: 14, fontWeight: 700,
          color: 'var(--text-secondary)', textAlign: 'center',
        }}>
          {t('result.status')}
        </Text>
        <Text style={{
          padding: '8px 12px', fontSize: 14, fontWeight: 700,
          color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {result.rightDir}
        </Text>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {visibleRows.length > 0 ? (
          visibleRows.map((row, idx) => (
            <div
              key={row.path + ':' + idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 48px 1fr',
                cursor: 'pointer',
                fontSize: 14,
                borderBottom: '1px solid var(--border-subtle)',
                background: 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-row-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => { if (row.isDir) { toggleDir(row.path); } else { handleOpenFile(row); } }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', padding: '3px 12px',
                paddingLeft: row.depth * 16 + 12,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                gap: 4, fontWeight: row.isDir ? 600 : undefined,
                color: row.isDir ? 'var(--dir-color)' : 'var(--text-primary)',
              }}>
                {row.isDir ? (
                  <><FolderOutlined style={{ fontSize: 12, flexShrink: 0 }} /><span>{row.name}</span></>
                ) : (
                  <><FileOutlined style={{ fontSize: 12, flexShrink: 0, opacity: 0.6 }} /><span>{row.name}</span></>
                )}
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '3px 0', fontSize: 18, fontWeight: 700,
                borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)',
                color: getStatusColor(row.status),
              }}>
                {!row.isDir && getStatusChar(row.status)}
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', padding: '3px 12px',
                paddingLeft: row.depth * 16 + 12,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                gap: 4, fontWeight: row.isDir ? 600 : undefined,
                color: row.isDir ? 'var(--dir-color)' : 'var(--text-primary)',
              }}>
                {row.isDir ? (
                  <><FolderOutlined style={{ fontSize: 12, flexShrink: 0 }} /><span>{row.name}</span></>
                ) : (
                  <><FileOutlined style={{ fontSize: 12, flexShrink: 0, opacity: 0.6 }} /><span>{row.rightName || row.name}</span></>
                )}
              </div>
            </div>
          ))
        ) : (
          <Empty description={t('result.error.empty')} style={{ padding: 40 }} />
        )}
      </div>
    </div>
  );
}
