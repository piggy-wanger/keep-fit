import { useState, useRef, useEffect } from 'react';
import { Input, Button, Typography, Spin, Empty, Space, Card, Tag } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, BulbOutlined } from '@ant-design/icons';
import { aiChatApi } from '../services/aiApi';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

function AIChat({ configId, hasConfig }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreamingContent('');

    try {
      // 使用流式响应
      const allMessages = [...messages, userMessage];
      let fullContent = '';

      for await (const chunk of aiChatApi.chatStream(configId, allMessages)) {
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      // 添加 AI 响应
      setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
      setStreamingContent('');
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `错误: ${error.message}`,
        isError: true,
      }]);
      setStreamingContent('');
    } finally {
      setLoading(false);
    }
  };

  // 快速建议
  const handleSuggest = async (type) => {
    if (loading) return;

    const prompts = {
      training: '请给我一些训练建议',
      diet: '请给我一些饮食建议',
      plan: '请帮我制定训练计划',
    };

    setInput(prompts[type]);
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!hasConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <Empty
          description="请先配置 AI 模型"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* 快捷操作 */}
      <div className="mb-4">
        <Space>
          <Button
            icon={<BulbOutlined />}
            onClick={() => handleSuggest('training')}
            size="small"
          >
            训练建议
          </Button>
          <Button
            icon={<BulbOutlined />}
            onClick={() => handleSuggest('diet')}
            size="small"
          >
            饮食建议
          </Button>
          <Button
            icon={<BulbOutlined />}
            onClick={() => handleSuggest('plan')}
            size="small"
          >
            制定计划
          </Button>
        </Space>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
        {messages.length === 0 && !loading && (
          <div className="text-center py-12">
            <RobotOutlined className="text-4xl text-gray-300 mb-4" />
            <Text type="secondary">你好！我是你的健身 AI 助手，有什么可以帮你的吗？</Text>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : msg.isError
                    ? 'bg-red-100 text-red-600'
                    : 'bg-white shadow'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                <Text className={msg.role === 'user' ? '!text-white/80' : '!text-gray-500'} strong>
                  {msg.role === 'user' ? '我' : 'AI 助手'}
                </Text>
              </div>
              <Paragraph
                className={`!mb-0 whitespace-pre-wrap ${msg.role === 'user' ? '!text-white' : ''}`}
              >
                {msg.content}
              </Paragraph>
            </div>
          </div>
        ))}

        {/* 流式响应内容 */}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg bg-white shadow">
              <div className="flex items-center gap-2 mb-1">
                <RobotOutlined />
                <Text type="secondary" strong>AI 助手</Text>
              </div>
              <Paragraph className="!mb-0 whitespace-pre-wrap">
                {streamingContent}
              </Paragraph>
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {loading && !streamingContent && (
          <div className="flex justify-start">
            <div className="p-3 rounded-lg bg-white shadow">
              <Spin size="small" />
              <Text type="secondary" className="ml-2">正在思考...</Text>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="flex gap-2">
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          className="flex-1"
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!input.trim()}
        >
          发送
        </Button>
      </div>
    </div>
  );
}

export default AIChat;
