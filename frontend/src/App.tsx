import { useState, useCallback, useEffect } from 'react';
import { ConfigProvider, theme, Layout, Tabs, Button, Dropdown, Modal, Typography } from 'antd';
import { HomeOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './i18n';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { WindowSetTitle } from '../wailsjs/runtime/runtime';
import { BrowserOpenURL } from '../wailsjs/runtime/runtime';
import { StartCompare } from '../wailsjs/go/main/App';
import type { TabData, CompareProgress, CompareSummary } from './models/types';
import HomeView from './components/HomeView';
import ResultView from './components/ResultView';
import DiffView from './components/DiffView';
import { useTheme } from './contexts/ThemeContext';

const { Content } = Layout;
const HOME_TAB_ID = 'home';
const { Text, Link } = Typography;

export default function App() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();

  useEffect(() => {
    WindowSetTitle(t('window.title'));
  }, [i18n.language, t]);
  const [tabs, setTabs] = useState<TabData[]>([{
    id: HOME_TAB_ID,
    type: 'home' as const,
    label: 'Home',
  }]);
  const [activeTab, setActiveTab] = useState(HOME_TAB_ID);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    return EventsOn('show-about', () => setAboutOpen(true));
  }, []);

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
      setActiveTab(tab.id);
      return [...prev, tab];
    });
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
      label: t('app.comparing'),
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
          label: t('app.result'),
        }));
        unlisten();
        return;
      }
      if (progress.completed) {
        updateTab(resultTabId, tab => ({
          ...tab,
          result: progress.result as CompareSummary,
          loading: false,
          label: t('app.result'),
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
  }, [addTab, updateTab, t]);

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
        return <DiffView tab={tab} isDark={isDark} />;
      default:
        return null;
    }
  };

  const langItems = {
    items: [
      { key: 'en', label: 'English', onClick: () => i18n.changeLanguage('en') },
      { key: 'zh', label: '中文', onClick: () => i18n.changeLanguage('zh') },
    ],
  };

  const themeConfig = isDark ? {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#fb923c',
      colorBgContainer: '#1e1e2e',
      colorBgElevated: '#181825',
      colorBgLayout: '#11111b',
      colorBorder: '#313244',
      colorText: '#cdd6f4',
      colorTextSecondary: '#a6adc8',
      borderRadius: 6,
    },
  } : {
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: '#c2410c',
      borderRadius: 6,
    },
  };

  return (
    <ConfigProvider theme={themeConfig}>
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
            tabBarExtraContent={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button type="text" icon={<HomeOutlined />} onClick={() => setActiveTab(HOME_TAB_ID)} style={{ color: 'var(--text-secondary)', marginRight: 8 }} />
                <Dropdown menu={langItems} trigger={['click']}>
                  <Button type="text" icon={<GlobalOutlined />} style={{ color: 'var(--text-secondary)', marginRight: 8 }} />
                </Dropdown>
              </div>
            }
            items={tabs.map(tab => ({
              key: tab.id,
              label: (
                <span>
                  {tab.type === 'home' && <HomeOutlined style={{ marginRight: 6 }} />}
                  {tab.type === 'home' ? t('app.home') : tab.label}
                </span>
              ),
              closable: tab.type !== 'home',
              children: renderTabContent(tab),
            }))}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            tabBarStyle={{ background: 'var(--bg-layout)', margin: 0, paddingLeft: 8 }}
          />
          <Modal
            title={t('about.title')}
            open={aboutOpen}
            centered
            styles={{ header: { textAlign: 'center' }, footer: { display: 'flex', justifyContent: 'center' } }}
            onOk={() => setAboutOpen(false)}
            onCancel={() => setAboutOpen(false)}
            okText="OK"
            cancelButtonProps={{ style: { display: 'none' } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <div>
                <Text type="secondary">{t('about.version')}:</Text>{' '}
                <Text strong>0.1.0</Text>
              </div>
              <div>
                <Text type="secondary">{t('about.email')}:</Text>{' '}
                <Text>jack.ju@itiky.com</Text>
              </div>
              <div>
                <Text type="secondary">{t('about.repository')}:</Text>{' '}
                <Link onClick={() => BrowserOpenURL('https://github.com/hotdiff/hotdiff')}>
                  https://github.com/hotdiff/hotdiff
                </Link>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">{t('about.mit')} | {t('about.poweredBy')} v2.12.0</Text>
              </div>
            </div>
          </Modal>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
