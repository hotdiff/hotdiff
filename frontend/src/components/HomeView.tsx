import { useState } from 'react';
import { Button, Input, Space, Typography, Card, Progress } from 'antd';
import { FolderOpenOutlined, FileOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { SelectDirectory, SelectFile } from '../../wailsjs/go/main/App';

const { Title, Text } = Typography;

interface HomeViewProps {
  onCompare: (left: string, right: string) => void;
}

export default function HomeView({ onCompare }: HomeViewProps) {
  const [leftPath, setLeftPath] = useState('');
  const [rightPath, setRightPath] = useState('');

  const selectLeftDir = async () => {
    const dir = await SelectDirectory();
    if (dir) setLeftPath(dir);
  };

  const selectLeftFile = async () => {
    const file = await SelectFile();
    if (file) setLeftPath(file);
  };

  const selectRightDir = async () => {
    const dir = await SelectDirectory();
    if (dir) setRightPath(dir);
  };

  const selectRightFile = async () => {
    const file = await SelectFile();
    if (file) setRightPath(file);
  };

  const handleCompare = () => {
    if (!leftPath.trim() || !rightPath.trim()) return;
    onCompare(leftPath.trim(), rightPath.trim());
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      minHeight: '100%',
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 640,
          borderColor: '#313244',
        }}
        styles={{ body: { padding: 40 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={1} style={{ color: '#cba6f7', margin: 0, fontSize: 36 }}>
            HotDiff
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>文件比较工具</Text>
        </div>

        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#a6adc8', textTransform: 'uppercase' }}>
            左侧目录 / 文件
          </Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={leftPath}
              placeholder="选择左侧目录或文件..."
              readOnly
              style={{ background: '#1e1e2e', borderColor: '#313244', color: '#cdd6f4' }}
            />
            <Button icon={<FolderOpenOutlined />} onClick={selectLeftDir} style={{ background: '#313244', color: '#cdd6f4', borderColor: '#313244' }}>
              目录
            </Button>
            <Button icon={<FileOutlined />} onClick={selectLeftFile} style={{ background: '#313244', color: '#cdd6f4', borderColor: '#313244' }}>
              文件
            </Button>
          </Space.Compact>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#a6adc8', textTransform: 'uppercase' }}>
            右侧目录 / 文件
          </Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={rightPath}
              placeholder="选择右侧目录或文件..."
              readOnly
              style={{ background: '#1e1e2e', borderColor: '#313244', color: '#cdd6f4' }}
            />
            <Button icon={<FolderOpenOutlined />} onClick={selectRightDir} style={{ background: '#313244', color: '#cdd6f4', borderColor: '#313244' }}>
              目录
            </Button>
            <Button icon={<FileOutlined />} onClick={selectRightFile} style={{ background: '#313244', color: '#cdd6f4', borderColor: '#313244' }}>
              文件
            </Button>
          </Space.Compact>
        </div>

        <Button
          type="primary"
          block
          size="large"
          icon={<ThunderboltOutlined />}
          onClick={handleCompare}
          disabled={!leftPath.trim() || !rightPath.trim()}
          style={{
            height: 48,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Compare
        </Button>
      </Card>
    </div>
  );
}
