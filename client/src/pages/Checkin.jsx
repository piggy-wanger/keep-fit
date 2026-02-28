import { useState, useEffect } from 'react';
import {
  Card, Button, Typography, Row, Col, Statistic, message, Tag, Space,
  Calendar, Badge, Modal, Input, Empty, Spin
} from 'antd';
import {
  CheckCircleOutlined, FireOutlined, TrophyOutlined,
  CalendarOutlined, LeftOutlined, RightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from '../services/checkinApi';

const { Title, Text } = Typography;

function Checkin() {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  // 获取今日打卡状态
  const { data: todayData, isLoading: todayLoading, refetch: refetchToday } = useQuery({
    queryKey: ['checkinToday'],
    queryFn: () => checkinApi.getToday().then(res => res.data),
  });

  // 获取打卡统计
  const { data: statsData } = useQuery({
    queryKey: ['checkinStats'],
    queryFn: () => checkinApi.getStats().then(res => res.data),
  });

  // 获取日历数据
  const { data: calendarData } = useQuery({
    queryKey: ['checkinCalendar', currentMonth.year(), currentMonth.month() + 1],
    queryFn: () => checkinApi.getCalendar(currentMonth.year(), currentMonth.month() + 1).then(res => res.data),
  });

  // 打卡
  const checkinMutation = useMutation({
    mutationFn: ({ type, notes }) => checkinApi.checkin(type, notes),
    onSuccess: (res) => {
      const data = res.data;
      message.success(`打卡成功！获得 ${data.expReward} 经验`);
      if (data.levelUp) {
        message.info(`🎉 恭喜升级到 ${data.newLevel} 级！`);
      }
      setNoteModalOpen(false);
      setNote('');
      queryClient.invalidateQueries(['checkinToday', 'checkinStats', 'checkinCalendar']);
    },
    onError: (err) => {
      message.error(err.response?.data?.error || '打卡失败');
    },
  });

  // 取消打卡
  const cancelMutation = useMutation({
    mutationFn: (type) => checkinApi.cancel(type),
    onSuccess: () => {
      message.success('已取消打卡');
      queryClient.invalidateQueries(['checkinToday', 'checkinStats', 'checkinCalendar']);
    },
  });

  // 处理打卡
  const handleCheckin = (type) => {
    setSelectedType(type);
    setNoteModalOpen(true);
  };

  // 确认打卡
  const confirmCheckin = () => {
    if (selectedType) {
      checkinMutation.mutate({ type: selectedType, notes: note });
    }
  };

  // 日历单元格渲染
  const dateCellRender = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const calendar = calendarData?.calendar || {};
    const types = calendar[dateStr];

    if (!types || types.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 p-1">
        {types.map((type, index) => {
          const typeInfo = todayData?.today?.[type];
          return (
            <span key={index} className="text-xs">
              {typeInfo?.icon || '✓'}
            </span>
          );
        })}
      </div>
    );
  };

  // 切换月份
  const changeMonth = (direction) => {
    setCurrentMonth(currentMonth.add(direction, 'month'));
  };

  const stats = statsData || {};
  const todayStatus = todayData?.today || {};

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-6">
          <Title level={3} className="!mb-0">
            <CheckCircleOutlined className="mr-2" />
            每日打卡
          </Title>
          <Text type="secondary">{dayjs().format('YYYY年MM月DD日')}</Text>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="连续打卡"
                value={stats.currentStreak || 0}
                prefix={<FireOutlined style={{ color: '#f5222d' }} />}
                suffix="天"
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="累计打卡"
                value={stats.totalCheckins || 0}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                suffix="次"
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="最长连续"
                value={stats.longestStreak || 0}
                prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
                suffix="天"
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="本周打卡"
                value={stats.weekDays || 0}
                prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                suffix="天"
              />
            </Card>
          </Col>
        </Row>

        {/* 今日打卡 */}
        <Card title="今日打卡" className="mb-6" loading={todayLoading}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(todayStatus).map(([key, info]) => (
              <div
                key={key}
                className={`text-center p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  info.checked
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onClick={() => {
                  if (info.checked) {
                    cancelMutation.mutate(key);
                  } else {
                    handleCheckin(key);
                  }
                }}
              >
                <div className="text-3xl mb-2">{info.icon}</div>
                <div className="font-medium">{info.name}</div>
                <div className="text-xs text-gray-500 mt-1">+{info.expReward} EXP</div>
                {info.checked && (
                  <Tag color="success" className="mt-2">已打卡</Tag>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* 打卡日历 */}
        <Card
          title="打卡日历"
          extra={
            <Space>
              <Button icon={<LeftOutlined />} onClick={() => changeMonth(-1)} />
              <Text strong>{currentMonth.format('YYYY年MM月')}</Text>
              <Button icon={<RightOutlined />} onClick={() => changeMonth(1)} />
            </Space>
          }
        >
          <Calendar
            value={currentMonth}
            onSelect={() => {}}
            cellRender={(date, info) => {
              if (info.type === 'date') {
                return dateCellRender(date);
              }
              return info.originNode;
            }}
          />
        </Card>

        {/* 打卡类型统计 */}
        <Card title="打卡类型统计" className="mt-6">
          <Row gutter={[16, 16]}>
            {Object.entries(stats.typeStats || {}).map(([type, count]) => {
              const typeInfo = todayStatus[type];
              return (
                <Col xs={12} md={8} key={type}>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">{typeInfo?.icon || '📌'}</span>
                    <div>
                      <div className="font-medium">{typeInfo?.name || type}</div>
                      <Text type="secondary">累计 {count} 次</Text>
                    </div>
                  </div>
                </Col>
              );
            })}
            {Object.keys(stats.typeStats || {}).length === 0 && (
              <Col span={24}>
                <Empty description="暂无打卡记录" />
              </Col>
            )}
          </Row>
        </Card>

        {/* 打卡备注模态框 */}
        <Modal
          title="添加打卡备注"
          open={noteModalOpen}
          onCancel={() => { setNoteModalOpen(false); setNote(''); }}
          onOk={confirmCheckin}
          confirmLoading={checkinMutation.isPending}
        >
          <div className="mb-4">
            <Text>正在打卡: </Text>
            <Tag color="blue">
              {todayStatus[selectedType]?.icon} {todayStatus[selectedType]?.name}
            </Tag>
          </div>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="记录一下今天的心得（可选）"
            rows={3}
          />
        </Modal>
      </div>
    </div>
  );
}

export default Checkin;
