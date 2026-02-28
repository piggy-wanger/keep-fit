import { useState, useEffect } from 'react';
import {
  Card, Typography, Row, Col, Progress, Tag, Empty, Spin, Space,
  Statistic, Badge, Segmented, Button, message
} from 'antd';
import {
  TrophyOutlined, StarOutlined, FireOutlined, LockOutlined,
  CheckCircleOutlined, GiftOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { achievementApi } from '../services/checkinApi';

const { Title, Text } = Typography;

function Achievements() {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  // 获取成就列表
  const { data: achievementsData, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => achievementApi.getAll().then(res => res.data),
  });

  // 获取成就统计
  const { data: statsData } = useQuery({
    queryKey: ['achievementStats'],
    queryFn: () => achievementApi.getStats().then(res => res.data),
  });

  // 获取成就分类
  const { data: categoriesData } = useQuery({
    queryKey: ['achievementCategories'],
    queryFn: () => achievementApi.getCategories().then(res => res.data),
  });

  // 检查成就
  const checkMutation = useMutation({
    mutationFn: () => achievementApi.check(),
    onSuccess: (res) => {
      const data = res.data;
      if (data.count > 0) {
        message.success(`🎉 恭喜解锁 ${data.count} 个新成就！`);
        queryClient.invalidateQueries(['achievements', 'achievementStats']);
      } else {
        message.info('暂无新成就可解锁');
      }
    },
  });

  const stats = statsData || {};
  const achievements = achievementsData?.achievements || [];
  const categories = categoriesData?.categories || [];

  // 计算进度
  const progress = stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0;

  // 过滤成就
  const filteredAchievements = achievements.filter(ach => {
    if (filter === 'all') return true;
    if (filter === 'unlocked') return ach.unlocked;
    if (filter === 'locked') return !ach.unlocked;
    return ach.category === filter;
  });

  // 按分类分组
  const groupedAchievements = achievements.reduce((acc, ach) => {
    if (!acc[ach.category]) {
      acc[ach.category] = [];
    }
    acc[ach.category].push(ach);
    return acc;
  }, {});

  // 获取分类图标
  const getCategoryIcon = (category) => {
    const icons = {
      '打卡': <CheckCircleOutlined />,
      '训练': <FireOutlined />,
      '健康': <StarOutlined />,
      '等级': <TrophyOutlined />,
      '特殊': <GiftOutlined />,
    };
    return icons[category] || <TrophyOutlined />;
  };

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-6">
          <Title level={3} className="!mb-0">
            <TrophyOutlined className="mr-2" />
            成就系统
          </Title>
          <Button
            type="primary"
            onClick={() => checkMutation.mutate()}
            loading={checkMutation.isPending}
          >
            检查成就
          </Button>
        </div>

        {/* 总体进度 */}
        <Card className="mb-6">
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} md={8}>
              <div className="text-center">
                <Progress
                  type="circle"
                  percent={progress}
                  format={() => (
                    <div>
                      <div className="text-3xl font-bold">{stats.unlocked || 0}</div>
                      <div className="text-gray-500">/ {stats.total || 0}</div>
                    </div>
                  )}
                  strokeColor={{
                    '0%': '#ffd700',
                    '100%': '#ff8c00',
                  }}
                  trailColor="#f0f0f0"
                />
                <div className="mt-2">
                  <Text type="secondary">已解锁成就</Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={16}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="获得经验"
                    value={stats.expEarned || 0}
                    prefix={<StarOutlined style={{ color: '#faad14' }} />}
                    suffix="EXP"
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="完成度"
                    value={progress}
                    suffix="%"
                    valueStyle={{ color: progress >= 50 ? '#52c41a' : '#faad14' }}
                  />
                </Col>
              </Row>
              <div className="mt-4">
                <Text type="secondary">分类进度</Text>
                <div className="mt-2 space-y-2">
                  {(stats.categoryStats || []).map(cat => {
                    const catProgress = cat.total > 0 ? Math.round((cat.unlocked / cat.total) * 100) : 0;
                    return (
                      <div key={cat.category} className="flex items-center gap-2">
                        <Text className="w-16">{cat.category}</Text>
                        <Progress
                          percent={catProgress}
                          size="small"
                          className="flex-1"
                          format={() => `${cat.unlocked}/${cat.total}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 筛选 */}
        <div className="mb-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { label: '全部', value: 'all' },
              { label: '已解锁', value: 'unlocked' },
              { label: '未解锁', value: 'locked' },
              ...categories.map(c => ({ label: c, value: c })),
            ]}
          />
        </div>

        {/* 成就列表 */}
        {isLoading ? (
          <div className="text-center py-12">
            <Spin size="large" />
          </div>
        ) : filter === 'all' ? (
          // 分组显示
          <div className="space-y-6">
            {Object.entries(groupedAchievements).map(([category, items]) => {
              const unlockedCount = items.filter(a => a.unlocked).length;
              return (
                <Card
                  key={category}
                  title={
                    <Space>
                      {getCategoryIcon(category)}
                      <span>{category}</span>
                      <Tag color="blue">{unlockedCount}/{items.length}</Tag>
                    </Space>
                  }
                >
                  <Row gutter={[16, 16]}>
                    {items.map(ach => (
                      <Col xs={12} md={8} lg={6} key={ach.id}>
                        <div
                          className={`p-4 rounded-lg border-2 text-center transition-all ${
                            ach.unlocked
                              ? 'border-yellow-400 bg-yellow-50'
                              : 'border-gray-200 bg-gray-50 opacity-60'
                          }`}
                        >
                          <div className="text-4xl mb-2">
                            {ach.unlocked ? ach.icon : <LockOutlined />}
                          </div>
                          <div className="font-medium mb-1">{ach.name}</div>
                          <div className="text-xs text-gray-500 mb-2">{ach.description}</div>
                          <Tag color={ach.unlocked ? 'gold' : 'default'}>
                            +{ach.exp_reward} EXP
                          </Tag>
                          {ach.unlocked && ach.unlockedAt && (
                            <div className="text-xs text-gray-400 mt-2">
                              {new Date(ach.unlockedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Card>
              );
            })}
          </div>
        ) : (
          // 过滤显示
          <Row gutter={[16, 16]}>
            {filteredAchievements.length > 0 ? (
              filteredAchievements.map(ach => (
                <Col xs={12} md={8} lg={6} key={ach.id}>
                  <div
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      ach.unlocked
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="text-4xl mb-2">
                      {ach.unlocked ? ach.icon : <LockOutlined />}
                    </div>
                    <div className="font-medium mb-1">{ach.name}</div>
                    <div className="text-xs text-gray-500 mb-2">{ach.description}</div>
                    <Tag color={ach.unlocked ? 'gold' : 'default'}>
                      +{ach.exp_reward} EXP
                    </Tag>
                    {ach.unlocked && ach.unlockedAt && (
                      <div className="text-xs text-gray-400 mt-2">
                        {new Date(ach.unlockedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </Col>
              ))
            ) : (
              <Col span={24}>
                <Empty description="暂无成就" />
              </Col>
            )}
          </Row>
        )}
      </div>
    </div>
  );
}

export default Achievements;
