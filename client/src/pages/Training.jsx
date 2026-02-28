import { useState, useEffect } from 'react';
import {
  Card, Tabs, Button, Table, Modal, Form, Input, InputNumber, Select,
  Space, message, Typography, Row, Col, Statistic, Tag, Empty, Spin,
  Popconfirm, List, DatePicker, Divider, Badge
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, BookOutlined,
  HistoryOutlined, SettingOutlined, CheckCircleOutlined,
  ClockCircleOutlined, FireOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentApi, trainingPlanApi, trainingLogApi } from '../services/trainingApi';

const { Title, Text } = Typography;
const { Option } = Select;

function Training() {
  const [activeTab, setActiveTab] = useState('plans');
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [planItems, setPlanItems] = useState([]);
  const [logItems, setLogItems] = useState([]);
  const [planForm] = Form.useForm();
  const [logForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // 获取训练统计
  const { data: statsData } = useQuery({
    queryKey: ['trainingStats'],
    queryFn: () => trainingLogApi.getStats().then(res => res.data),
  });

  // 获取训练计划列表
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['trainingPlans'],
    queryFn: () => trainingPlanApi.getPlans().then(res => res.data),
  });

  // 获取训练日志
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['trainingLogs'],
    queryFn: () => trainingLogApi.getLogs({ limit: 20 }).then(res => res.data),
  });

  // 获取器材列表
  const { data: equipmentData } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => equipmentApi.getAll().then(res => res.data),
  });

  // 获取用户器材
  const { data: myEquipmentData } = useQuery({
    queryKey: ['myEquipment'],
    queryFn: () => equipmentApi.getMyEquipment().then(res => res.data),
  });

  // 获取器材分类
  const { data: categoriesData } = useQuery({
    queryKey: ['equipmentCategories'],
    queryFn: () => equipmentApi.getCategories().then(res => res.data),
  });

  // 创建/更新计划
  const planMutation = useMutation({
    mutationFn: (data) => editingPlan
      ? trainingPlanApi.updatePlan(editingPlan.id, data)
      : trainingPlanApi.createPlan(data),
    onSuccess: () => {
      message.success(editingPlan ? '更新成功' : '创建成功');
      setPlanModalOpen(false);
      setEditingPlan(null);
      setPlanItems([]);
      planForm.resetFields();
      queryClient.invalidateQueries(['trainingPlans']);
    },
    onError: (err) => message.error(err.response?.data?.error || '操作失败'),
  });

  // 删除计划
  const deletePlanMutation = useMutation({
    mutationFn: (id) => trainingPlanApi.deletePlan(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries(['trainingPlans']);
    },
  });

  // 激活计划
  const activatePlanMutation = useMutation({
    mutationFn: ({ id, isActive }) => trainingPlanApi.setActive(id, isActive),
    onSuccess: () => {
      message.success('状态已更新');
      queryClient.invalidateQueries(['trainingPlans']);
    },
  });

  // 创建训练日志
  const logMutation = useMutation({
    mutationFn: (data) => trainingLogApi.createLog(data),
    onSuccess: () => {
      message.success('记录成功');
      setLogModalOpen(false);
      setLogItems([]);
      logForm.resetFields();
      queryClient.invalidateQueries(['trainingLogs', 'trainingStats']);
    },
    onError: (err) => message.error(err.response?.data?.error || '记录失败'),
  });

  // 删除日志
  const deleteLogMutation = useMutation({
    mutationFn: (id) => trainingLogApi.deleteLog(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries(['trainingLogs', 'trainingStats']);
    },
  });

  // 添加用户器材
  const addEquipmentMutation = useMutation({
    mutationFn: (id) => equipmentApi.addEquipment(id),
    onSuccess: () => {
      message.success('已添加');
      queryClient.invalidateQueries(['myEquipment']);
    },
    onError: (err) => message.error(err.response?.data?.error || '添加失败'),
  });

  // 移除用户器材
  const removeEquipmentMutation = useMutation({
    mutationFn: (id) => equipmentApi.removeEquipment(id),
    onSuccess: () => {
      message.success('已移除');
      queryClient.invalidateQueries(['myEquipment']);
    },
  });

  // 打开计划模态框
  const openPlanModal = (plan = null) => {
    setEditingPlan(plan);
    if (plan) {
      planForm.setFieldsValue({
        name: plan.name,
        description: plan.description,
        startDate: plan.start_date ? dayjs(plan.start_date) : null,
        endDate: plan.end_date ? dayjs(plan.end_date) : null,
      });
      setPlanItems(plan.items || []);
    } else {
      planForm.resetFields();
      setPlanItems([]);
    }
    setPlanModalOpen(true);
  };

  // 提交计划
  const handlePlanSubmit = (values) => {
    planMutation.mutate({
      name: values.name,
      description: values.description,
      startDate: values.startDate?.format('YYYY-MM-DD'),
      endDate: values.endDate?.format('YYYY-MM-DD'),
      items: planItems.map((item, index) => ({
        equipmentId: item.equipment_id,
        exerciseName: item.exercise_name,
        sets: item.sets,
        reps: item.reps,
        weight: item.weight,
        duration: item.duration,
        dayOfWeek: item.day_of_week,
        sortOrder: index,
      })),
    });
  };

  // 添加计划项目
  const handleAddPlanItem = (values) => {
    setPlanItems([...planItems, {
      id: Date.now(),
      equipment_id: values.equipmentId,
      equipment_name: equipmentData?.equipment?.find(e => e.id === values.equipmentId)?.name,
      exercise_name: values.exerciseName,
      sets: values.sets,
      reps: values.reps,
      weight: values.weight,
      duration: values.duration,
      day_of_week: values.dayOfWeek,
    }]);
    setItemModalOpen(false);
    itemForm.resetFields();
  };

  // 打开训练日志模态框
  const openLogModal = (planId = null) => {
    setSelectedPlanId(planId);
    logForm.setFieldsValue({
      planId,
      duration: null,
      notes: '',
    });
    setLogItems([]);
    setLogModalOpen(true);
  };

  // 提交训练日志
  const handleLogSubmit = (values) => {
    logMutation.mutate({
      planId: values.planId || null,
      duration: values.duration,
      notes: values.notes,
      items: logItems.map(item => ({
        equipmentId: item.equipment_id,
        exerciseName: item.exercise_name,
        sets: item.sets,
        reps: item.reps,
        weight: item.weight,
        duration: item.duration,
      })),
    });
  };

  // 添加日志项目
  const handleAddLogItem = (values) => {
    setLogItems([...logItems, {
      id: Date.now(),
      equipment_id: values.equipmentId,
      equipment_name: equipmentData?.equipment?.find(e => e.id === values.equipmentId)?.name,
      exercise_name: values.exerciseName,
      sets: values.sets,
      reps: values.reps,
      weight: values.weight,
      duration: values.duration,
    }]);
    setItemModalOpen(false);
    itemForm.resetFields();
  };

  // 计划表格列
  const planColumns = [
    { title: '计划名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '项目数', dataIndex: 'item_count', key: 'item_count', width: 80 },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (v) => v ? <Tag color="green">激活</Tag> : <Tag>未激活</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => openPlanModal(record)}>编辑</Button>
          <Button
            size="small"
            type={record.is_active ? 'default' : 'primary'}
            onClick={() => activatePlanMutation.mutate({ id: record.id, isActive: !record.is_active })}
          >
            {record.is_active ? '停用' : '激活'}
          </Button>
          <Button size="small" onClick={() => openLogModal(record.id)}>记录</Button>
          <Popconfirm title="确定删除？" onConfirm={() => deletePlanMutation.mutate(record.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 日志表格列
  const logColumns = [
    {
      title: '日期',
      dataIndex: 'log_date',
      key: 'log_date',
      width: 180,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    { title: '计划', dataIndex: 'plan_name', key: 'plan_name', render: (v) => v || '-' },
    { title: '时长(分钟)', dataIndex: 'duration', key: 'duration', width: 100 },
    { title: '项目数', key: 'items', width: 80, render: (_, r) => r.items?.length || 0 },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Popconfirm title="确定删除？" onConfirm={() => deleteLogMutation.mutate(record.id)}>
          <Button size="small" danger>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  const stats = statsData || {};

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-6">
          <Title level={3} className="!mb-0">
            <BookOutlined className="mr-2" />
            训练中心
          </Title>
          <Space>
            <Button icon={<SettingOutlined />} onClick={() => setEquipmentModalOpen(true)}>
              我的器材
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openLogModal()}>
              记录训练
            </Button>
          </Space>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="总训练次数"
                value={stats.totalLogs || 0}
                prefix={<FireOutlined />}
                suffix="次"
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="总训练时长"
                value={stats.totalDuration || 0}
                prefix={<ClockCircleOutlined />}
                suffix="分钟"
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="本周训练"
                value={stats.weekLogs || 0}
                prefix={<CheckCircleOutlined />}
                suffix="次"
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="训练计划"
                value={plansData?.plans?.filter(p => p.is_active).length || 0}
                prefix={<BookOutlined />}
                suffix="个激活"
              />
            </Card>
          </Col>
        </Row>

        {/* 标签页 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'plans',
              label: '训练计划',
              icon: <BookOutlined />,
              children: (
                <Card
                  title="计划列表"
                  extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openPlanModal()}>新建计划</Button>}
                >
                  <Table
                    columns={planColumns}
                    dataSource={plansData?.plans || []}
                    rowKey="id"
                    loading={plansLoading}
                    pagination={false}
                  />
                </Card>
              ),
            },
            {
              key: 'logs',
              label: '训练记录',
              icon: <HistoryOutlined />,
              children: (
                <Card title="历史记录">
                  <Table
                    columns={logColumns}
                    dataSource={logsData?.logs || []}
                    rowKey="id"
                    loading={logsLoading}
                    expandable={{
                      expandedRowRender: (record) => (
                        <div className="p-2">
                          {record.notes && <Text type="secondary">备注: {record.notes}</Text>}
                          {record.items?.length > 0 && (
                            <Table
                              size="small"
                              dataSource={record.items}
                              rowKey="id"
                              pagination={false}
                              columns={[
                                { title: '动作', dataIndex: 'exercise_name' },
                                { title: '器材', dataIndex: 'equipment_name', render: v => v || '-' },
                                { title: '组数', dataIndex: 'sets', render: v => v || '-' },
                                { title: '次数', dataIndex: 'reps', render: v => v || '-' },
                                { title: '重量(kg)', dataIndex: 'weight', render: v => v || '-' },
                              ]}
                            />
                          )}
                        </div>
                      ),
                    }}
                  />
                </Card>
              ),
            },
          ]}
        />

        {/* 计划模态框 */}
        <Modal
          title={editingPlan ? '编辑计划' : '新建计划'}
          open={planModalOpen}
          onCancel={() => { setPlanModalOpen(false); setEditingPlan(null); planForm.resetFields(); setPlanItems([]); }}
          onOk={() => planForm.submit()}
          width={700}
          confirmLoading={planMutation.isPending}
        >
          <Form form={planForm} layout="vertical" onFinish={handlePlanSubmit}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="name" label="计划名称" rules={[{ required: true }]}>
                  <Input placeholder="如：胸肌训练计划" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="startDate" label="开始日期">
                  <DatePicker className="w-full" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="endDate" label="结束日期">
                  <DatePicker className="w-full" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={2} placeholder="计划描述..." />
            </Form.Item>
          </Form>

          <Divider>训练项目</Divider>

          <div className="mb-4">
            <Button icon={<PlusOutlined />} onClick={() => setItemModalOpen(true)}>
              添加项目
            </Button>
          </div>

          <Table
            size="small"
            dataSource={planItems}
            rowKey="id"
            pagination={false}
            columns={[
              { title: '动作', dataIndex: 'exercise_name' },
              { title: '器材', dataIndex: 'equipment_name', render: v => v || '-' },
              { title: '组数', dataIndex: 'sets', width: 60 },
              { title: '次数', dataIndex: 'reps', width: 60 },
              { title: '重量', dataIndex: 'weight', width: 60 },
              { title: '时长', dataIndex: 'duration', width: 60 },
              {
                title: '',
                width: 40,
                render: (_, record, index) => (
                  <Button
                    size="small"
                    type="text"
                    danger
                    onClick={() => setPlanItems(planItems.filter((_, i) => i !== index))}
                  >
                    ×
                  </Button>
                ),
              },
            ]}
            locale={{ emptyText: '暂无项目，点击上方按钮添加' }}
          />
        </Modal>

        {/* 训练日志模态框 */}
        <Modal
          title="记录训练"
          open={logModalOpen}
          onCancel={() => { setLogModalOpen(false); setLogItems([]); logForm.resetFields(); }}
          onOk={() => logForm.submit()}
          width={700}
          confirmLoading={logMutation.isPending}
        >
          <Form form={logForm} layout="vertical" onFinish={handleLogSubmit}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="planId" label="关联计划">
                  <Select allowClear placeholder="选择计划（可选）">
                    {plansData?.plans?.map(p => (
                      <Option key={p.id} value={p.id}>{p.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="duration" label="训练时长(分钟)">
                  <InputNumber className="w-full" min={1} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>

          <Divider>训练详情</Divider>

          <div className="mb-4">
            <Button icon={<PlusOutlined />} onClick={() => setItemModalOpen(true)}>
              添加动作
            </Button>
          </div>

          <Table
            size="small"
            dataSource={logItems}
            rowKey="id"
            pagination={false}
            columns={[
              { title: '动作', dataIndex: 'exercise_name' },
              { title: '器材', dataIndex: 'equipment_name', render: v => v || '-' },
              { title: '组数', dataIndex: 'sets', width: 60 },
              { title: '次数', dataIndex: 'reps', width: 60 },
              { title: '重量', dataIndex: 'weight', width: 60 },
              {
                title: '',
                width: 40,
                render: (_, record, index) => (
                  <Button
                    size="small"
                    type="text"
                    danger
                    onClick={() => setLogItems(logItems.filter((_, i) => i !== index))}
                  >
                    ×
                  </Button>
                ),
              },
            ]}
            locale={{ emptyText: '暂无项目，点击上方按钮添加' }}
          />
        </Modal>

        {/* 添加项目模态框 */}
        <Modal
          title="添加训练项目"
          open={itemModalOpen}
          onCancel={() => { setItemModalOpen(false); itemForm.resetFields(); }}
          onOk={() => itemForm.submit()}
        >
          <Form form={itemForm} layout="vertical" onFinish={activeTab === 'plans' ? handleAddPlanItem : handleAddLogItem}>
            <Form.Item name="exerciseName" label="动作名称" rules={[{ required: true }]}>
              <Input placeholder="如：卧推、深蹲、引体向上" />
            </Form.Item>
            <Form.Item name="equipmentId" label="器材">
              <Select allowClear placeholder="选择器材（可选）" showSearch optionFilterProp="children">
                {equipmentData?.equipment?.map(e => (
                  <Option key={e.id} value={e.id}>{e.name} ({e.category})</Option>
                ))}
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="sets" label="组数">
                  <InputNumber className="w-full" min={1} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="reps" label="次数">
                  <InputNumber className="w-full" min={1} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="weight" label="重量(kg)">
                  <InputNumber className="w-full" min={0} step={0.5} />
                </Form.Item>
              </Col>
            </Row>
            {activeTab === 'plans' && (
              <Form.Item name="dayOfWeek" label="训练日">
                <Select allowClear placeholder="选择训练日（可选）">
                  <Option value={0}>周日</Option>
                  <Option value={1}>周一</Option>
                  <Option value={2}>周二</Option>
                  <Option value={3}>周三</Option>
                  <Option value={4}>周四</Option>
                  <Option value={5}>周五</Option>
                  <Option value={6}>周六</Option>
                </Select>
              </Form.Item>
            )}
          </Form>
        </Modal>

        {/* 我的器材模态框 */}
        <Modal
          title="我的器材"
          open={equipmentModalOpen}
          onCancel={() => setEquipmentModalOpen(false)}
          footer={null}
          width={800}
        >
          <Tabs
            items={(categoriesData?.categories || []).map(category => ({
              key: category,
              label: category,
              children: (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {equipmentData?.equipment?.filter(e => e.category === category).map(eq => {
                    const isOwned = myEquipmentData?.equipment?.some(e => e.id === eq.id);
                    return (
                      <Card
                        key={eq.id}
                        size="small"
                        hoverable
                        className={isOwned ? 'border-green-500' : ''}
                        onClick={() => isOwned
                          ? removeEquipmentMutation.mutate(eq.id)
                          : addEquipmentMutation.mutate(eq.id)
                        }
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{eq.name}</div>
                            <Text type="secondary" className="text-xs">{eq.description}</Text>
                          </div>
                          {isOwned && <Tag color="green">已拥有</Tag>}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ),
            }))}
          />
        </Modal>
      </div>
    </div>
  );
}

export default Training;
