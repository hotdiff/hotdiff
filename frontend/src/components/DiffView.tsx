import { useState, useEffect } from 'react';
import { Typography, Spin, Alert, Empty } from 'antd';
import { DiffEditor, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useTranslation } from 'react-i18next';
import type { TabData } from '../models/types';
import type { main, diff } from '../../wailsjs/go/models';
import { GetDiffDetail } from '../../wailsjs/go/main/App';

loader.config({ monaco });

const { Text } = Typography;

interface DiffViewProps {
  tab: TabData;
  isDark: boolean;
}

function getCsvCellClass(cellType: number): string {
  switch (cellType) {
    case 2: return 'csv-cell-changed';
    case 3: return 'csv-cell-add';
    case 4: return 'csv-cell-del';
    default: return '';
  }
}

function getCsvCellLabel(cellType: number, leftValue: string, rightValue: string): React.ReactNode {
  if (leftValue && rightValue && leftValue !== rightValue) {
    return (
      <>
        <span style={{ background: 'var(--highlight-deleted)', color: 'var(--csv-deleted-text)', padding: '1px 4px', borderRadius: 2 }}>{leftValue}</span>
        {' '}
        <span style={{ background: 'var(--highlight-added)', color: 'var(--csv-added-text)', padding: '1px 4px', borderRadius: 2 }}>{rightValue}</span>
      </>
    );
  }
  if (leftValue && !rightValue) {
    return <span style={{ background: 'var(--highlight-deleted)', color: 'var(--csv-deleted-text)', padding: '1px 4px', borderRadius: 2 }}>{leftValue}</span>;
  }
  if (!leftValue && rightValue) {
    return <span style={{ background: 'var(--highlight-added)', color: 'var(--csv-added-text)', padding: '1px 4px', borderRadius: 2 }}>{rightValue}</span>;
  }
  return leftValue || rightValue;
}

function CsvDiffTableView({ table, leftName, rightName }: { table: diff.CsvDiffTable; leftName: string; rightName: string }) {
  const { t } = useTranslation();
  if (!table || (!table.Headers?.length && !table.Rows?.length)) {
    return <Empty description={t('diff.error.identical')} style={{ padding: 40 }} />;
  }

  return (
    <div style={{ overflow: 'auto', padding: '16px 0' }}>
      <div style={{
        display: 'flex',
        padding: '8px 16px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        fontSize: 12,
        fontFamily: 'monospace',
      }}>
        <Text style={{ flex: 1, color: 'var(--csv-deleted-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {leftName || t('diff.deleted')}
        </Text>
        <Text style={{ width: 40, textAlign: 'center', color: 'var(--text-faint)' }}>⇔</Text>
        <Text style={{ flex: 1, color: 'var(--csv-added-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
          {rightName || t('diff.new')}
        </Text>
      </div>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 12,
        fontFamily: '"SF Mono", "Fira Code", monospace',
      }}>
        <thead>
          <tr>
            <th style={{
              border: '1px solid var(--border-color)',
              padding: '4px 8px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              width: 40,
              textAlign: 'right',
            }}>#</th>
            {table.Headers.map((cell, i) => (
              <th key={i} className={getCsvCellClass(cell.CellType)} style={{
                border: '1px solid var(--border-color)',
                padding: '4px 8px',
                background: cell.CellType === 2 ? 'var(--csv-changed-bg)' : cell.CellType === 3 ? 'var(--csv-added-bg)' : cell.CellType === 4 ? 'var(--csv-deleted-bg)' : 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}>
                {getCsvCellLabel(cell.CellType, cell.LeftValue, cell.RightValue)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.Rows.map((row) => (
            <tr key={row.RowNum}>
              <td style={{
                border: '1px solid var(--border-color)',
                padding: '4px 8px',
                color: 'var(--text-faint)',
                textAlign: 'right',
                width: 40,
              }}>{row.RowNum}</td>
              {row.Cells.map((cell, j) => (
                <td key={j} className={getCsvCellClass(cell.CellType)} style={{
                  border: '1px solid var(--border-color)',
                  padding: '4px 8px',
                  background: cell.CellType === 2 ? 'var(--csv-changed-bg)' : cell.CellType === 3 ? 'var(--csv-added-bg)' : cell.CellType === 4 ? 'var(--csv-deleted-bg)' : undefined,
                }}>
                  {getCsvCellLabel(cell.CellType, cell.LeftValue, cell.RightValue)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DiffView({ tab, isDark }: DiffViewProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState<main.DiffDetailResult | null>(null);
  const [loading, setLoading] = useState(tab.loading !== false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tab.leftPath && !tab.rightPath) return;
    setLoading(true);
    GetDiffDetail(tab.leftPath || '', tab.rightPath || '')
      .then(res => {
        setContent(res);
        if (res.error) setError(res.error);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, [tab.leftPath, tab.rightPath]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Spin tip={t('diff.loading')} size="large">
          <div style={{ height: 50 }} />
        </Spin>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <Alert type="error" message={t('diff.error.title')} description={error} showIcon />
      </div>
    );
  }

  if (!content) {
    return <Empty description={t('diff.error.empty')} style={{ padding: 40 }} />;
  }

  if (content.isCsv && content.csvTable) {
    return (
      <div style={{ padding: '0 16px', height: '100%', overflow: 'auto' }}>
        <CsvDiffTableView
          table={content.csvTable}
          leftName={tab.leftPath || ''}
          rightName={tab.rightPath || ''}
        />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 16px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        fontSize: 12,
        fontFamily: 'monospace',
        flexShrink: 0,
      }}>
        <Text style={{ flex: 1, color: 'var(--csv-deleted-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {content.oldName || tab.leftPath || t('diff.deleted')}
        </Text>
        <Text style={{ width: 40, textAlign: 'center', color: 'var(--text-faint)', fontWeight: 700 }}>⇔</Text>
        <Text style={{ flex: 1, color: 'var(--csv-added-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
          {content.newName || tab.rightPath || t('diff.new')}
        </Text>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DiffEditor
          original={content.original}
          modified={content.modified}
          language={content.language || 'plaintext'}
          theme={isDark ? 'vs-dark' : 'light'}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineNumbers: 'on',
            folding: true,
          }}
          loading={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Spin tip={t('diff.loadingEditor')} />
            </div>
          }
        />
      </div>
    </div>
  );
}
