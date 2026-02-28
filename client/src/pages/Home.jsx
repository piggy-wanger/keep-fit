import { Button, Avatar, Card, Typography, Space } from 'antd';
import { UserOutlined, LogoutOutlined, TrophyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

function Home() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm mb-6 p-4 rounded-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💪</span>
          <span className="text-xl font-bold text-gray-800">Keep-Fit</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Avatar icon={<UserOutlined />} src={user?.avatar} />
            <span className="text-gray-700">{user?.nickname || user?.username}</span>
          </div>
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            退出
          </Button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-4xl mx-auto">
        {/* 欢迎卡片 */}
        <Card className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex justify-between items-center">
            <div>
              <Title level={3} className="!text-white !mb-2">
                欢迎回来，{user?.nickname || user?.username}！
              </Title>
              <Text className="!text-white/80">
                今天是开始健身的好日子！让我们一起变得更强壮。
              </Text>
            </div>
            <div className="text-center">
              <TrophyOutlined className="text-4xl mb-2" />
              <div className="text-lg">Lv.{user?.level || 1}</div>
              <div className="text-sm text-white/80">{user?.exp || 0} EXP</div>
            </div>
          </div>
        </Card>

        {/* 功能占位卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card hoverable className="text-center">
            <div className="text-4xl mb-3">📊</div>
            <Title level={5}>健康数据</Title>
            <Text type="secondary">记录体重、血压、步数</Text>
          </Card>

          <Card hoverable className="text-center">
            <div className="text-4xl mb-3">🏋️</div>
            <Title level={5}>训练计划</Title>
            <Text type="secondary">制定你的健身计划</Text>
          </Card>

          <Card hoverable className="text-center">
            <div className="text-4xl mb-3">✅</div>
            <Title level={5}>每日打卡</Title>
            <Text type="secondary">坚持打卡获得奖励</Text>
          </Card>

          <Card hoverable className="text-center">
            <div className="text-4xl mb-3">🎯</div>
            <Title level={5}>成就系统</Title>
            <Text type="secondary">解锁成就获得经验</Text>
          </Card>

          <Card hoverable className="text-center">
            <div className="text-4xl mb-3">👥</div>
            <Title level={5}>健身搭子</Title>
            <Text type="secondary">邀请好友一起锻炼</Text>
          </Card>

          <Card hoverable className="text-center">
            <div className="text-4xl mb-3">🤖</div>
            <Title level={5}>AI 助手</Title>
            <Text type="secondary">智能健身建议</Text>
          </Card>
        </div>

        {/* 开发提示 */}
        <Card className="mt-6 bg-yellow-50 border-yellow-200">
          <div className="text-center text-yellow-800">
            <Text>
              🚧 应用正在开发中，更多功能即将上线...
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Home;
