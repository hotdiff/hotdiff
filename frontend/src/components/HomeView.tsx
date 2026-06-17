import { useState } from 'react';
import { Button, Input, Space } from 'antd';
import { FolderOutlined, FileOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { SelectDirectory, SelectFile } from '../../wailsjs/go/main/App';

interface HomeViewProps {
  onCompare: (left: string, right: string) => void;
}

const inputStyle: React.CSSProperties = {
  height: 44,
  fontSize: 14,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: '#cdd6f4',
  cursor: 'pointer',
};

const iconBtnStyle: React.CSSProperties = {
  color: 'rgba(205,214,244,0.45)',
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function HomeView({ onCompare }: HomeViewProps) {
  const { t } = useTranslation();
  const [leftPath, setLeftPath] = useState('');
  const [rightPath, setRightPath] = useState('');

  const selectLeftDir = async () => { const dir = await SelectDirectory(); if (dir) setLeftPath(dir); };
  const selectLeftFile = async () => { const file = await SelectFile(); if (file) setLeftPath(file); };
  const selectRightDir = async () => { const dir = await SelectDirectory(); if (dir) setRightPath(dir); };
  const selectRightFile = async () => { const file = await SelectFile(); if (file) setRightPath(file); };

  const handleCompare = () => {
    if (!leftPath.trim() || !rightPath.trim()) return;
    onCompare(leftPath.trim(), rightPath.trim());
  };

  const canCompare = leftPath.trim() && rightPath.trim();

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 32px',
      minHeight: '100%',
    }}>
      <h1 style={{
        margin: 0,
        fontSize: 48,
        fontWeight: 600,
        color: '#cdd6f4',
        letterSpacing: '-0.5px',
      }}>
        {t('app.title')}
      </h1>

      <div style={{
        width: '100%',
        maxWidth: 480,
        marginTop: 56,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <Input
          value={leftPath}
          placeholder={t('home.chooseLeft')}
          allowClear
          onChange={e => { if (!e.target.value) setLeftPath(''); }}
          onClick={selectLeftDir}
          suffix={
            <Space size={0}>
              <Button type="text" size="small" icon={<FolderOutlined />}
                style={iconBtnStyle}
                onClick={e => { e.stopPropagation(); selectLeftDir(); }} />
              <Button type="text" size="small" icon={<FileOutlined />}
                style={iconBtnStyle}
                onClick={e => { e.stopPropagation(); selectLeftFile(); }} />
            </Space>
          }
          style={inputStyle}
        />

        <Input
          value={rightPath}
          placeholder={t('home.chooseRight')}
          allowClear
          onChange={e => { if (!e.target.value) setRightPath(''); }}
          onClick={selectRightDir}
          suffix={
            <Space size={0}>
              <Button type="text" size="small" icon={<FolderOutlined />}
                style={iconBtnStyle}
                onClick={e => { e.stopPropagation(); selectRightDir(); }} />
              <Button type="text" size="small" icon={<FileOutlined />}
                style={iconBtnStyle}
                onClick={e => { e.stopPropagation(); selectRightFile(); }} />
            </Space>
          }
          style={inputStyle}
        />

        <Button
          onClick={handleCompare}
          disabled={!canCompare}
          style={{
            height: 44,
            marginTop: 20,
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: '-0.2px',
            border: 'none',
            background: canCompare ? '#cba6f7' : 'rgba(255,255,255,0.06)',
            color: canCompare ? '#1e1e2e' : 'rgba(205,214,244,0.25)',
          }}
          block
        >
          {t('home.compare')}
        </Button>
      </div>
    </div>
  );
}
