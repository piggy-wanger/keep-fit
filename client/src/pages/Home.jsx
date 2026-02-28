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

  // 功能卡片数据
  const features = [
    { icon: '📊', title: '健康数据', desc: '记录体重、血压、步数', path: '/health', available: true },
    { icon: '🏋️', title: '训练计划', desc: '制定你的健身计划', path: '/training', available: false },
    { icon: '✅', title: '每日打卡', desc: '坚持打卡获得奖励', path: '/checkin', available: false },
    { icon: '🎯', title: '成就系统', desc: '解锁成就获得经验', path: '/achievements', available: false },
    { icon: '👥', title: '健身搭子', desc: '邀请好友一起锻炼', path: '/partners', available: false },
    { icon: '🤖', title: 'AI 助手', desc: '智能健身建议', path: '/ai', available: false },
  ];

  const handleCardClick = (feature) => {
    if (feature.available) {
      navigate(feature.path);
    }
  };

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

        {/* 功能卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <Card
              key={index}
              hoverable={feature.available}
              className={`text-center ${!feature.available ? 'opacity-60 cursor-not-allowed' : ''}`}
              onClick={() => handleCardClick(feature)}
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <Title level={5}>{feature.title}</Title>
              <Text type="secondary">{feature.desc}</Text>
              {!feature.available && (
                <div className="mt-2">
                  <Text type="secondary" className="text-xs">开发中...</Text>
                </div>
              )}
            </Card>
          ))}
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
