import { useState } from 'react';
import { Card, Tabs, Typography, Alert } from 'antd';
import { RobotOutlined, SettingOutlined } from '@ant-design/icons';
import AIChat from '../components/AIChat';
import AIConfig from '../components/AIConfig';
import { useQuery } from '@tanstack/react-query';
import { aiConfigApi } from '../services/aiApi';

const { Title, Text } = Typography;

function AI() {
  const [activeTab, setActiveTab] = useState('chat');
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取配置列表，检查是否有配置
  const { data: configsData } = useQuery({
    queryKey: ['aiConfigs'],
    queryFn: () => aiConfigApi.getConfigs().then(res => res.data),
  });

  const hasConfig = (configsData?.configs?.length || 0) > 0;
  const defaultConfig = configsData?.configs?.find(c => c.is_default) || configsData?.configs?.[0];

  // 配置变更回调
  const handleConfigChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-6">
          <Title level={3} className="!mb-0">
            <RobotOutlined className="mr-2" />
            AI 智能助手
          </Title>
        </div>

        {/* 提示信息 */}
        {!hasConfig && (
          <Alert
            message="请先配置 AI 模型"
            description="在使用 AI 助手之前，请先在「模型配置」标签页中添加您的 AI 模型配置。支持 OpenAI、Anthropic、DeepSeek 等多种服务商。"
            type="info"
            showIcon
            className="mb-6"
          />
        )}

        {/* 标签页 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'chat',
              label: '对话',
              icon: <RobotOutlined />,
              children: (
                <Card>
                  <AIChat
                    key={refreshKey}
                    configId={defaultConfig?.id}
                    hasConfig={hasConfig}
                  />
                </Card>
              ),
            },
            {
              key: 'config',
              label: '模型配置',
              icon: <SettingOutlined />,
              children: (
                <Card>
                  <AIConfig onConfigChange={handleConfigChange} />
                </Card>
              ),
            },
          ]}
        />

        {/* 使用说明 */}
        <Card title="使用说明" className="mt-6">
          <div className="space-y-3">
            <div>
              <Text strong>1. 配置模型</Text>
              <br />
              <Text type="secondary">
                在「模型配置」中添加您的 AI 模型。支持 OpenAI、Anthropic、DeepSeek、Moonshot 等服务商，
                也可以添加自定义兼容 API。
              </Text>
            </div>
            <div>
              <Text strong>2. 开始对话</Text>
              <br />
              <Text type="secondary">
                配置完成后，即可在「对话」标签页与 AI 交流。AI 会根据您的健康数据和训练记录提供个性化建议。
              </Text>
            </div>
            <div>
              <Text strong>3. 快速建议</Text>
              <br />
              <Text type="secondary">
                点击「训练建议」「饮食建议」「制定计划」按钮，可快速获取针对性的建议。
              </Text>
            </div>
            <div>
              <Text strong>4. 隐私说明</Text>
              <br />
              <Text type="secondary">
                您的 API Key 会安全存储在本地数据库中，不会上传到其他服务器。
              </Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default AI;
