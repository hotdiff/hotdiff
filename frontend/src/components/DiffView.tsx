import { useState, useEffect, useMemo } from 'react';
import { Typography, Spin, Alert, Empty } from 'antd';
import { DiffEditor, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useTranslation } from 'react-i18next';
import { Grid } from '@githubocto/flat-ui';
import type { TabData } from '../models/types';
import type { main } from '../../wailsjs/go/models';
import { GetDiffDetail } from '../../wailsjs/go/main/App';

loader.config({ monaco });

const { Text } = Typography;

interface DiffViewProps {
  tab: TabData;
  isDark: boolean;
}

function CsvDiffView({ leftData, rightData }: { leftData: string; rightData: string }) {
  const { t } = useTranslation();

  const leftRows = useMemo(() => {
    if (!leftData) return [];
    try { return JSON.parse(leftData) as Record<string, string>[]; } catch { return []; }
  }, [leftData]);

  const rightRows = useMemo(() => {
    if (!rightData) return [];
    try { return JSON.parse(rightData) as Record<string, string>[]; } catch { return []; }
  }, [rightData]);

  if (!leftRows.length && !rightRows.length) {
    return <Empty description={t('diff.error.identical')} style={{ padding: 40 }} />;
  }

  return (
    <div className="csv-diff-grid" style={{ height: '100%', overflow: 'hidden' }}>
      <Grid
        data={leftRows}
        diffData={rightRows.length > 0 ? rightRows : undefined}
        canDownload={false}
      />
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

  if (content.isCsv && content.csvLeftData !== undefined && content.csvRightData !== undefined) {
    return (
      <CsvDiffView
        leftData={content.csvLeftData}
        rightData={content.csvRightData}
      />
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
