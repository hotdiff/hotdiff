import { useState, useCallback } from 'react';
import { ConfigProvider, theme, Layout, Tabs } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { StartCompare } from '../wailsjs/go/main/App';
import type { TabData, CompareProgress, CompareSummary } from './models/types';
import HomeView from './components/HomeView';
import ResultView from './components/ResultView';
import DiffView from './components/DiffView';

const { Content } = Layout;
const HOME_TAB_ID = 'home';

function createHomeTab(): TabData {
  return { id: HOME_TAB_ID, type: 'home', label: 'Home' };
}

export default function App() {
  const [tabs, setTabs] = useState<TabData[]>([createHomeTab()]);
  const [activeTab, setActiveTab] = useState(HOME_TAB_ID);

  const updateTab = useCallback((id: string, updater: (tab: TabData) => TabData) => {
    setTabs(prev => prev.map(t => t.id === id ? updater(t) : t));
  }, []);

  const addTab = useCallback((tab: TabData) => {
    setTabs(prev => {
      const existing = prev.find(t => t.type === 'file' && t.filePath === tab.filePath);
      if (existing) {
        setActiveTab(existing.id);
        return prev;
      }
      return [...prev, tab];
    });
    setActiveTab(tab.id);
  }, []);

  const closeTab = useCallback((id: string) => {
    if (id === HOME_TAB_ID) return;
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx === -1) return prev;
      const filtered = prev.filter(t => t.id !== id);
      return filtered;
    });
    setActiveTab(prevActive => {
      const idx = tabs.findIndex(t => t.id === id);
      if (prevActive !== id) return prevActive;
      const filtered = tabs.filter(t => t.id !== id);
      const newIdx = Math.min(idx, filtered.length - 1);
      return filtered[newIdx]?.id || HOME_TAB_ID;
    });
  }, [tabs]);

  const onCompare = useCallback((left: string, right: string) => {
    const resultTabId = 'result_' + Date.now();
    const resultTab: TabData = {
      id: resultTabId,
      type: 'result',
      label: '比较中...',
      leftPath: left,
      rightPath: right,
      loading: true,
    };
    addTab(resultTab);

    const unlisten = EventsOn('compare-progress', (progress: CompareProgress) => {
      if (progress.error) {
        updateTab(resultTabId, tab => ({
          ...tab,
          error: progress.error,
          loading: false,
          label: '比较结果',
        }));
        unlisten();
        return;
      }
      if (progress.completed) {
        updateTab(resultTabId, tab => ({
          ...tab,
          result: progress.result as CompareSummary,
          loading: false,
          label: '比较结果',
        }));
        unlisten();
        return;
      }
      updateTab(resultTabId, tab => ({
        ...tab,
        progress: { current: progress.current, total: progress.total, fileName: progress.fileName },
      }));
    });

    StartCompare(left, right);
  }, [addTab, updateTab]);

  const onOpenFileDiff = useCallback((tabData: TabData) => {
    addTab(tabData);
  }, [addTab]);

  const renderTabContent = (tab: TabData) => {
    switch (tab.type) {
      case 'home':
        return <HomeView onCompare={onCompare} />;
      case 'result':
        return <ResultView tab={tab} onOpenFileDiff={onOpenFileDiff} />;
      case 'file':
        return <DiffView tab={tab} />;
      default:
        return null;
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#cba6f7',
          colorBgContainer: '#1e1e2e',
          colorBgElevated: '#181825',
          colorBgLayout: '#11111b',
          colorBorder: '#313244',
          colorText: '#cdd6f4',
          colorTextSecondary: '#a6adc8',
          borderRadius: 6,
        },
      }}
    >
      <Layout style={{ height: '100vh' }}>
        <Content style={{ display: 'flex', flexDirection: 'column' }}>
          <Tabs
            type="editable-card"
            activeKey={activeTab}
            onChange={setActiveTab}
            onEdit={(targetKey, action) => {
              if (action === 'remove' && typeof targetKey === 'string') {
                closeTab(targetKey);
              }
            }}
            hideAdd
            items={tabs.map(tab => ({
              key: tab.id,
              label: (
                <span>
                  {tab.type === 'home' && <HomeOutlined style={{ marginRight: 6 }} />}
                  {tab.label}
                </span>
              ),
              closable: tab.type !== 'home',
              children: renderTabContent(tab),
            }))}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            tabBarStyle={{ background: '#11111b', margin: 0, paddingLeft: 8 }}
          />
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
