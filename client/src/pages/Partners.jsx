import { useState } from 'react';
import {
  Card, Tabs, Button, Typography, Row, Col, Avatar, Space, Tag, Empty,
  Modal, Form, Input, List, message, Popconfirm, Spin
} from 'antd';
import {
  UserOutlined, TeamOutlined, PlusOutlined, SearchOutlined,
  CheckOutlined, CloseOutlined, DeleteOutlined, LogoutOutlined,
  CopyOutlined, QrcodeOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerApi, groupApi } from '../services/socialApi';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

function Partners() {
  const [activeTab, setActiveTab] = useState('partner');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [joinGroupModalOpen, setJoinGroupModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [groupForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取搭子信息
  const { data: partnerData, isLoading: partnerLoading } = useQuery({
    queryKey: ['partner'],
    queryFn: () => partnerApi.getPartner().then(res => res.data),
  });

  // 获取搭子打卡记录
  const { data: partnerCheckinsData } = useQuery({
    queryKey: ['partnerCheckins'],
    queryFn: () => partnerApi.getPartnerCheckins().then(res => res.data),
    enabled: !!partnerData?.partner,
  });

  // 获取群组列表
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupApi.getGroups().then(res => res.data),
  });

  // 搜索用户
  const { data: searchResults, refetch: searchUsers, isLoading: searchLoading } = useQuery({
    queryKey: ['searchUsers', searchKeyword],
    queryFn: () => partnerApi.searchUsers(searchKeyword).then(res => res.data),
    enabled: false,
  });

  // 搜索群组
  const { data: groupSearchResults, refetch: searchGroups, isLoading: groupSearchLoading } = useQuery({
    queryKey: ['searchGroups', joinCode],
    queryFn: () => groupApi.getAvailableGroups(joinCode).then(res => res.data),
    enabled: false,
  });

  // 发送搭子请求
  const sendRequestMutation = useMutation({
    mutationFn: (partnerId) => partnerApi.sendRequest(partnerId),
    onSuccess: () => {
      message.success('请求已发送');
      setSearchModalOpen(false);
      queryClient.invalidateQueries(['partner']);
    },
    onError: (err) => message.error(err.response?.data?.error || '发送失败'),
  });

  // 接受请求
  const acceptRequestMutation = useMutation({
    mutationFn: (requestId) => partnerApi.acceptRequest(requestId),
    onSuccess: () => {
      message.success('已成为健身搭子！');
      queryClient.invalidateQueries(['partner']);
    },
    onError: (err) => message.error(err.response?.data?.error || '接受失败'),
  });

  // 拒绝请求
  const rejectRequestMutation = useMutation({
    mutationFn: (requestId) => partnerApi.rejectRequest(requestId),
    onSuccess: () => {
      message.success('已拒绝请求');
      queryClient.invalidateQueries(['partner']);
    },
  });

  // 解除搭子
  const removePartnerMutation = useMutation({
    mutationFn: () => partnerApi.removePartner(),
    onSuccess: () => {
      message.success('已解除搭子关系');
      queryClient.invalidateQueries(['partner']);
    },
  });

  // 取消请求
  const cancelRequestMutation = useMutation({
    mutationFn: (requestId) => partnerApi.cancelRequest(requestId),
    onSuccess: () => {
      message.success('已取消请求');
      queryClient.invalidateQueries(['partner']);
    },
  });

  // 创建群组
  const createGroupMutation = useMutation({
    mutationFn: (data) => groupApi.createGroup(data),
    onSuccess: (res) => {
      message.success('群组创建成功');
      setCreateGroupModalOpen(false);
      groupForm.resetFields();
      queryClient.invalidateQueries(['groups']);
      // 复制群组ID
      navigator.clipboard.writeText(res.data.group.id);
      message.info('群组邀请码已复制到剪贴板');
    },
    onError: (err) => message.error(err.response?.data?.error || '创建失败'),
  });

  // 加入群组
  const joinGroupMutation = useMutation({
    mutationFn: (groupId) => groupApi.joinGroup(groupId),
    onSuccess: () => {
      message.success('已加入群组');
      setJoinGroupModalOpen(false);
      setJoinCode('');
      queryClient.invalidateQueries(['groups']);
    },
    onError: (err) => message.error(err.response?.data?.error || '加入失败'),
  });

  // 离开群组
  const leaveGroupMutation = useMutation({
    mutationFn: (groupId) => groupApi.leaveGroup(groupId),
    onSuccess: () => {
      message.success('已离开群组');
      queryClient.invalidateQueries(['groups']);
    },
  });

  // 解散群组
  const deleteGroupMutation = useMutation({
    mutationFn: (groupId) => groupApi.deleteGroup(groupId),
    onSuccess: () => {
      message.success('群组已解散');
      queryClient.invalidateQueries(['groups']);
    },
  });

  // 搜索用户
  const handleSearch = () => {
    if (searchKeyword.length >= 2) {
      searchUsers();
    }
  };

  // 搜索群组
  const handleSearchGroup = () => {
    if (joinCode.length >= 2) {
      searchGroups();
    }
  };

  // 复制群组邀请码
  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    message.success('邀请码已复制');
  };

  const partner = partnerData?.partner;
  const pendingRequests = partnerData?.pendingRequests || [];
  const sentRequests = partnerData?.sentRequests || [];
  const groups = groupsData?.groups || [];

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <Title level={3} className="mb-6">
          <TeamOutlined className="mr-2" />
          健身社交
        </Title>

        {/* 标签页 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'partner',
              label: '健身搭子',
              icon: <UserOutlined />,
              children: (
                <Spin spinning={partnerLoading}>
                  {/* 当前搭子 */}
                  {partner ? (
                    <Card title="我的搭子" className="mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar size={64} icon={<UserOutlined />} src={partner.avatar} />
                          <div>
                            <Title level={5} className="!mb-1">
                              {partner.nickname || partner.username}
                            </Title>
                            <Text type="secondary">Lv.{partner.level}</Text>
                          </div>
                        </div>
                        <Popconfirm
                          title="确定解除搭子关系？"
                          onConfirm={() => removePartnerMutation.mutate()}
                        >
                          <Button danger icon={<DeleteOutlined />}>
                            解除关系
                          </Button>
                        </Popconfirm>
                      </div>

                      {/* 搭子打卡记录 */}
                      <div className="mt-6">
                        <Title level={5}>最近打卡</Title>
                        {partnerCheckinsData?.checkins?.length > 0 ? (
                          <List
                            size="small"
                            dataSource={partnerCheckinsData.checkins.slice(0, 5)}
                            renderItem={(item) => (
                              <List.Item>
                                <Space>
                                  <Text>{dayjs(item.check_date).format('MM-DD')}</Text>
                                  <Tag>{item.check_type}</Tag>
                                </Space>
                              </List.Item>
                            )}
                          />
                        ) : (
                          <Empty description="暂无打卡记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                      </div>
                    </Card>
                  ) : (
                    <Card className="mb-6">
                      <div className="text-center py-8">
                        <UserOutlined className="text-4xl text-gray-300 mb-4" />
                        <Text type="secondary" className="block mb-4">
                          你还没有健身搭子
                        </Text>
                        <Button
                          type="primary"
                          icon={<SearchOutlined />}
                          onClick={() => setSearchModalOpen(true)}
                        >
                          搜索搭子
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* 待处理的请求 */}
                  {pendingRequests.length > 0 && (
                    <Card title="待处理的请求" className="mb-6">
                      <List
                        dataSource={pendingRequests}
                        renderItem={(item) => (
                          <List.Item
                            actions={[
                              <Button
                                key="accept"
                                type="primary"
                                size="small"
                                icon={<CheckOutlined />}
                                onClick={() => acceptRequestMutation.mutate(item.id)}
                              >
                                接受
                              </Button>,
                              <Button
                                key="reject"
                                size="small"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => rejectRequestMutation.mutate(item.id)}
                              >
                                拒绝
                              </Button>,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={<Avatar icon={<UserOutlined />} src={item.avatar} />}
                              title={item.nickname || item.username}
                            />
                          </List.Item>
                        )}
                      />
                    </Card>
                  )}

                  {/* 已发送的请求 */}
                  {sentRequests.length > 0 && (
                    <Card title="已发送的请求">
                      <List
                        dataSource={sentRequests}
                        renderItem={(item) => (
                          <List.Item
                            actions={[
                              <Button
                                key="cancel"
                                size="small"
                                onClick={() => cancelRequestMutation.mutate(item.id)}
                              >
                                取消
                              </Button>,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={<Avatar icon={<UserOutlined />} src={item.avatar} />}
                              title={item.nickname || item.username}
                              description="等待对方回应"
                            />
                          </List.Item>
                        )}
                      />
                    </Card>
                  )}
                </Spin>
              ),
            },
            {
              key: 'groups',
              label: '健身群组',
              icon: <TeamOutlined />,
              children: (
                <Spin spinning={groupsLoading}>
                  {/* 操作按钮 */}
                  <div className="mb-4 flex gap-2">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setCreateGroupModalOpen(true)}
                      disabled={groups.length > 0}
                    >
                      创建群组
                    </Button>
                    <Button
                      icon={<QrcodeOutlined />}
                      onClick={() => setJoinGroupModalOpen(true)}
                      disabled={groups.length > 0}
                    >
                      加入群组
                    </Button>
                  </div>

                  {/* 群组列表 */}
                  {groups.length > 0 ? (
                    <div className="space-y-4">
                      {groups.map((group) => (
                        <GroupCard
                          key={group.id}
                          group={group}
                          onLeave={() => leaveGroupMutation.mutate(group.id)}
                          onDelete={() => deleteGroupMutation.mutate(group.id)}
                          onCopyCode={() => copyInviteCode(group.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <div className="text-center py-8">
                        <TeamOutlined className="text-4xl text-gray-300 mb-4" />
                        <Text type="secondary" className="block mb-2">
                          你还没有加入任何群组
                        </Text>
                        <Text type="secondary" className="text-sm">
                          创建或加入一个群组，和好友一起健身吧！
                        </Text>
                      </div>
                    </Card>
                  )}
                </Spin>
              ),
            },
          ]}
        />

        {/* 搜索用户模态框 */}
        <Modal
          title="搜索用户"
          open={searchModalOpen}
          onCancel={() => {
            setSearchModalOpen(false);
            setSearchKeyword('');
          }}
          footer={null}
        >
          <Space.Compact className="w-full mb-4">
            <Input
              placeholder="输入用户名或昵称搜索"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button type="primary" onClick={handleSearch} loading={searchLoading}>
              搜索
            </Button>
          </Space.Compact>

          <List
            loading={searchLoading}
            dataSource={searchResults?.users || []}
            locale={{ emptyText: '输入关键词搜索用户' }}
            renderItem={(user) => (
              <List.Item
                actions={[
                  <Button
                    key="invite"
                    type="primary"
                    size="small"
                    onClick={() => sendRequestMutation.mutate(user.id)}
                    loading={sendRequestMutation.isPending}
                  >
                    邀请
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} src={user.avatar} />}
                  title={user.nickname || user.username}
                  description={`Lv.${user.level}`}
                />
              </List.Item>
            )}
          />
        </Modal>

        {/* 创建群组模态框 */}
        <Modal
          title="创建群组"
          open={createGroupModalOpen}
          onCancel={() => {
            setCreateGroupModalOpen(false);
            groupForm.resetFields();
          }}
          onOk={() => groupForm.submit()}
          confirmLoading={createGroupMutation.isPending}
        >
          <Form
            form={groupForm}
            layout="vertical"
            onFinish={(values) => createGroupMutation.mutate(values)}
          >
            <Form.Item
              name="name"
              label="群组名称"
              rules={[{ required: true, message: '请输入群组名称' }]}
            >
              <Input placeholder="如：健身小分队" maxLength={20} />
            </Form.Item>
            <Form.Item name="description" label="群组描述">
              <Input.TextArea rows={3} placeholder="介绍一下你的群组..." maxLength={100} />
            </Form.Item>
            <Form.Item name="maxMembers" label="最大人数" initialValue={4}>
              <Input type="number" min={2} max={4} />
            </Form.Item>
          </Form>
        </Modal>

        {/* 加入群组模态框 */}
        <Modal
          title="加入群组"
          open={joinGroupModalOpen}
          onCancel={() => {
            setJoinGroupModalOpen(false);
            setJoinCode('');
          }}
          footer={null}
        >
          <Space.Compact className="w-full mb-4">
            <Input
              placeholder="输入群组邀请码"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <Button type="primary" onClick={handleSearchGroup} loading={groupSearchLoading}>
              搜索
            </Button>
          </Space.Compact>

          <List
            loading={groupSearchLoading}
            dataSource={groupSearchResults?.groups || []}
            locale={{ emptyText: '输入邀请码搜索群组' }}
            renderItem={(group) => (
              <List.Item
                actions={[
                  <Button
                    key="join"
                    type="primary"
                    size="small"
                    onClick={() => joinGroupMutation.mutate(group.id)}
                    loading={joinGroupMutation.isPending}
                    disabled={group.member_count >= group.max_members}
                  >
                    {group.member_count >= group.max_members ? '已满' : '加入'}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={group.name}
                  description={`${group.member_count}/${group.max_members} 人 · 创建者: ${group.creator_name}`}
                />
              </List.Item>
            )}
          />
        </Modal>
      </div>
    </div>
  );
}

// 群组卡片组件
function GroupCard({ group, onLeave, onDelete, onCopyCode }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMembers = async () => {
    if (members.length > 0) return;
    setLoading(true);
    try {
      const res = await groupApi.getMembers(group.id);
      setMembers(res.data.members);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span>{group.name}</span>
          <Space>
            <Button size="small" icon={<CopyOutlined />} onClick={onCopyCode}>
              复制邀请码
            </Button>
          </Space>
        </div>
      }
      extra={
        group.role === 'creator' ? (
          <Popconfirm title="确定解散群组？" onConfirm={onDelete}>
            <Button size="small" danger>
              解散群组
            </Button>
          </Popconfirm>
        ) : (
          <Popconfirm title="确定离开群组？" onConfirm={onLeave}>
            <Button size="small" icon={<LogoutOutlined />}>
              离开
            </Button>
          </Popconfirm>
        )
      }
    >
      <Text type="secondary">{group.description || '暂无描述'}</Text>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <Text strong>成员 ({group.member_count}/{group.max_members})</Text>
          <Button size="small" onClick={loadMembers} loading={loading}>
            查看详情
          </Button>
        </div>
        <Avatar.Group maxCount={4}>
          {members.map((m) => (
            <Avatar key={m.id} icon={<UserOutlined />} src={m.avatar}>
              {m.nickname?.[0] || m.username?.[0]}
            </Avatar>
          ))}
        </Avatar.Group>
      </div>
    </Card>
  );
}

export default Partners;
