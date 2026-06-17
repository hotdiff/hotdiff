import { useMemo, useState, useCallback } from 'react';
import { Typography, Progress, Tag, Spin, Alert, Empty } from 'antd';
import { FileOutlined, FolderOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TabData, FileResult, CompareSummary } from '../models/types';
import { FileStatus } from '../models/types';

const { Title, Text } = Typography;

interface ResultViewProps {
  tab: TabData;
  onOpenFileDiff: (tab: TabData) => void;
}

interface FlatRow {
  name: string;
  path: string;
  depth: number;
  isDir: boolean;
  status: number;
  leftPath: string;
  rightPath: string;
  isCsv: boolean;
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
          path: parts.slice(0, i + 1).join('/'),
          depth: 0,
          isDir,
          status: isDir ? -1 : f.status,
          leftPath: isDir ? '' : f.leftPath,
          rightPath: isDir ? '' : f.rightPath,
          isCsv: f.isCsv,
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
      path: node.path,
      depth,
      isDir: node.isDir,
      status: node.status,
      leftPath: node.leftPath,
      rightPath: node.rightPath,
      isCsv: node.isCsv,
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
    case FileStatus.Same: return '#a6e3a1';
    case FileStatus.Different: return '#f38ba8';
    case FileStatus.Similar: return '#f9e2af';
    case FileStatus.LeftOnly: return '#89b4fa';
    case FileStatus.RightOnly: return '#cba6f7';
    default: return '#a6adc8';
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

  const handleDoubleClick = useCallback((row: FlatRow) => {
    if (row.isDir) return;
    if (!row.leftPath && !row.rightPath) return;
    const fileTab: TabData = {
      id: 'file_' + Date.now(),
      type: 'file',
      label: row.name,
      fileName: row.name,
      filePath: row.path,
      leftPath: row.leftPath,
      rightPath: row.rightPath,
      isCsv: row.isCsv,
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
      <div style={{ padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#cdd6f4' }}>{t('result.title')}</Title>
        </div>
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <Spin tip={t('result.comparing')} size="large" style={{ display: 'block', marginBottom: 24 }}>
            <div style={{ height: 50 }} />
          </Spin>
          {tab.progress && (
            <Progress
              percent={tab.progress.total > 0 ? Math.round((tab.progress.current / tab.progress.total) * 100) : 0}
              format={() => `${tab.progress?.current || 0} / ${tab.progress?.total || 0}`}
              strokeColor={{ from: '#cba6f7', to: '#89b4fe' }}
            />
          )}
          {tab.progress && (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #313244',
        flexShrink: 0,
      }}>
        <Title level={4} style={{ color: '#cdd6f4', margin: 0 }}>{t('result.title')}</Title>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
        borderBottom: '1px solid #313244',
        background: '#181825',
        flexShrink: 0,
      }}>
        <Text style={{
          padding: '8px 12px', fontSize: 12, fontWeight: 700,
          color: '#a6adc8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {result.leftDir}
        </Text>
        <Text style={{
          padding: '8px 0', fontSize: 12, fontWeight: 700,
          color: '#a6adc8', textAlign: 'center',
        }}>
          {t('result.status')}
        </Text>
        <Text style={{
          padding: '8px 12px', fontSize: 12, fontWeight: 700,
          color: '#a6adc8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
                fontSize: 13,
                borderBottom: '1px solid #252536',
                background: 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#313244')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => { if (row.isDir) toggleDir(row.path); }}
              onDoubleClick={() => { if (!row.isDir) handleDoubleClick(row); }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', padding: '3px 12px',
                paddingLeft: row.depth * 16 + 12,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                gap: 4, fontWeight: row.isDir ? 600 : undefined,
                color: row.isDir ? '#89b4fa' : '#cdd6f4',
              }}>
                {row.isDir ? (
                  <><FolderOutlined style={{ fontSize: 12, flexShrink: 0 }} /><span>{row.name}</span></>
                ) : (
                  <><FileOutlined style={{ fontSize: 12, flexShrink: 0, opacity: 0.6 }} /><span>{row.name}</span></>
                )}
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '3px 0', fontSize: 16, fontWeight: 700,
                borderLeft: '1px solid #313244', borderRight: '1px solid #313244',
                color: getStatusColor(row.status),
              }}>
                {!row.isDir && getStatusChar(row.status)}
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', padding: '3px 12px',
                paddingLeft: row.depth * 16 + 12,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                gap: 4, fontWeight: row.isDir ? 600 : undefined,
                color: row.isDir ? '#89b4fa' : '#cdd6f4',
              }}>
                {row.isDir ? (
                  <><FolderOutlined style={{ fontSize: 12, flexShrink: 0 }} /><span>{row.name}</span></>
                ) : (
                  <><FileOutlined style={{ fontSize: 12, flexShrink: 0, opacity: 0.6 }} /><span>{row.name}</span></>
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
