import { useState, useEffect } from 'react';
import { Typography, Spin, Alert, Empty } from 'antd';
import { DiffEditor, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { TabData } from '../models/types';
import type { main, diff } from '../../wailsjs/go/models';
import { GetDiffDetail } from '../../wailsjs/go/main/App';

loader.config({ monaco });

const { Text } = Typography;

interface DiffViewProps {
  tab: TabData;
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
        <span style={{ background: 'rgba(243,139,168,0.15)', color: '#f38ba8', padding: '1px 4px', borderRadius: 2 }}>{leftValue}</span>
        {' '}
        <span style={{ background: 'rgba(166,227,161,0.15)', color: '#a6e3a1', padding: '1px 4px', borderRadius: 2 }}>{rightValue}</span>
      </>
    );
  }
  if (leftValue && !rightValue) {
    return <span style={{ background: 'rgba(243,139,168,0.15)', color: '#f38ba8', padding: '1px 4px', borderRadius: 2 }}>{leftValue}</span>;
  }
  if (!leftValue && rightValue) {
    return <span style={{ background: 'rgba(166,227,161,0.15)', color: '#a6e3a1', padding: '1px 4px', borderRadius: 2 }}>{rightValue}</span>;
  }
  return leftValue || rightValue;
}

function CsvDiffTableView({ table, leftName, rightName }: { table: diff.CsvDiffTable; leftName: string; rightName: string }) {
  if (!table || (!table.Headers?.length && !table.Rows?.length)) {
    return <Empty description="Files are identical" style={{ padding: 40 }} />;
  }

  return (
    <div style={{ overflow: 'auto', padding: '16px 0' }}>
      <div style={{
        display: 'flex',
        padding: '8px 16px',
        background: '#181825',
        borderBottom: '1px solid #313244',
        fontSize: 12,
        fontFamily: 'monospace',
      }}>
        <Text style={{ flex: 1, color: '#f38ba8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {leftName || '[deleted]'}
        </Text>
        <Text style={{ width: 40, textAlign: 'center', color: '#585b70' }}>⇔</Text>
        <Text style={{ flex: 1, color: '#a6e3a1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
          {rightName || '[new]'}
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
              border: '1px solid #313244',
              padding: '4px 8px',
              background: '#181825',
              color: '#a6adc8',
              width: 40,
              textAlign: 'right',
            }}>#</th>
            {table.Headers.map((cell, i) => (
              <th key={i} className={getCsvCellClass(cell.CellType)} style={{
                border: '1px solid #313244',
                padding: '4px 8px',
                background: cell.CellType === 2 ? '#2a2a1e' : cell.CellType === 3 ? '#1e3a2f' : cell.CellType === 4 ? '#3a1e1e' : '#181825',
                color: '#a6adc8',
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
                border: '1px solid #313244',
                padding: '4px 8px',
                color: '#585b70',
                textAlign: 'right',
                width: 40,
              }}>{row.RowNum}</td>
              {row.Cells.map((cell, j) => (
                <td key={j} className={getCsvCellClass(cell.CellType)} style={{
                  border: '1px solid #313244',
                  padding: '4px 8px',
                  background: cell.CellType === 2 ? '#2a2a1e' : cell.CellType === 3 ? '#1e3a2f' : cell.CellType === 4 ? '#3a1e1e' : undefined,
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

export default function DiffView({ tab }: DiffViewProps) {
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
        <Spin tip="加载差异详情..." size="large">
          <div style={{ height: 50 }} />
        </Spin>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <Alert type="error" message="加载出错" description={error} showIcon />
      </div>
    );
  }

  if (!content) {
    return <Empty description="暂无内容" style={{ padding: 40 }} />;
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
        background: '#181825',
        borderBottom: '1px solid #313244',
        fontSize: 12,
        fontFamily: 'monospace',
        flexShrink: 0,
      }}>
        <Text style={{ flex: 1, color: '#f38ba8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {content.oldName || tab.leftPath || '[deleted]'}
        </Text>
        <Text style={{ width: 40, textAlign: 'center', color: '#585b70', fontWeight: 700 }}>⇔</Text>
        <Text style={{ flex: 1, color: '#a6e3a1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
          {content.newName || tab.rightPath || '[new]'}
        </Text>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DiffEditor
          original={content.original}
          modified={content.modified}
          language={content.language || 'plaintext'}
          theme="vs-dark"
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
              <Spin tip="加载编辑器..." />
            </div>
          }
        />
      </div>
    </div>
  );
}
