import { useState, useEffect } from 'react';
import {
  Card, Tabs, Form, Input, InputNumber, DatePicker, Button, Table,
  Space, message, Modal, Typography, Row, Col, Statistic, Progress,
  Segmented, Empty, Spin, Popconfirm
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, LineChartOutlined,
  DashboardOutlined, AimOutlined, FireOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthApi } from '../services/healthApi';
import HealthCharts from '../components/HealthCharts';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

function Health() {
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [thresholdForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取统计数据
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['healthStats', period],
    queryFn: () => healthApi.getStats(period).then(res => res.data),
  });

  // 获取健康记录
  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['healthRecords'],
    queryFn: () => healthApi.getRecords().then(res => res.data),
  });

  // 获取阈值设置
  const { data: thresholdsData } = useQuery({
    queryKey: ['healthThresholds'],
    queryFn: () => healthApi.getThresholds().then(res => res.data),
  });

  // 添加记录
  const addMutation = useMutation({
    mutationFn: (data) => healthApi.addRecord(data),
    onSuccess: () => {
      message.success('添加成功');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries(['healthRecords']);
      queryClient.invalidateQueries(['healthStats']);
    },
    onError: (err) => {
      message.error(err.response?.data?.error || '添加失败');
    }
  });

  // 更新记录
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => healthApi.updateRecord(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setIsModalOpen(false);
      setEditingRecord(null);
      form.resetFields();
      queryClient.invalidateQueries(['healthRecords']);
      queryClient.invalidateQueries(['healthStats']);
    },
    onError: (err) => {
      message.error(err.response?.data?.error || '更新失败');
    }
  });

  // 删除记录
  const deleteMutation = useMutation({
    mutationFn: (id) => healthApi.deleteRecord(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries(['healthRecords']);
      queryClient.invalidateQueries(['healthStats']);
    },
    onError: (err) => {
      message.error(err.response?.data?.error || '删除失败');
    }
  });

  // 保存阈值
  const saveThresholdMutation = useMutation({
    mutationFn: (data) => healthApi.saveThresholds(data),
    onSuccess: () => {
      message.success('设置已保存');
      setIsThresholdModalOpen(false);
      queryClient.invalidateQueries(['healthThresholds']);
    },
    onError: (err) => {
      message.error(err.response?.data?.error || '保存失败');
    }
  });

  // 打开添加/编辑模态框
  const openModal = (record = null) => {
    setEditingRecord(record);
    if (record) {
      form.setFieldsValue({
        recordDate: dayjs(record.record_date),
        weight: record.weight,
        systolic: record.systolic,
        diastolic: record.diastolic,
        steps: record.steps,
      });
    } else {
      form.setFieldsValue({
        recordDate: dayjs(),
      });
    }
    setIsModalOpen(true);
  };

  // 提交表单
  const handleSubmit = (values) => {
    const data = {
      recordDate: values.recordDate.format('YYYY-MM-DD'),
      weight: values.weight,
      systolic: values.systolic,
      diastolic: values.diastolic,
      steps: values.steps,
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  // 打开阈值设置模态框
  const openThresholdModal = () => {
    if (thresholdsData?.threshold) {
      thresholdForm.setFieldsValues({
        weightMin: thresholdsData.threshold.weight_min,
        weightMax: thresholdsData.threshold.weight_max,
        systolicMin: thresholdsData.threshold.systolic_min,
        systolicMax: thresholdsData.threshold.systolic_max,
        diastolicMin: thresholdsData.threshold.diastolic_min,
        diastolicMax: thresholdsData.threshold.diastolic_max,
        stepsGoal: thresholdsData.threshold.steps_goal,
      });
    } else {
      thresholdForm.setFieldsValue({
        systolicMin: 90,
        systolicMax: 140,
        diastolicMin: 60,
        diastolicMax: 90,
        stepsGoal: 10000,
      });
    }
    setIsThresholdModalOpen(true);
  };

  // 保存阈值设置
  const handleThresholdSubmit = (values) => {
    saveThresholdMutation.mutate({
      weightMin: values.weightMin,
      weightMax: values.weightMax,
      systolicMin: values.systolicMin,
      systolicMax: values.systolicMax,
      diastolicMin: values.diastolicMin,
      diastolicMax: values.diastolicMax,
      stepsGoal: values.stepsGoal,
    });
  };

  // 表格列定义
  const columns = [
    {
      title: '日期',
      dataIndex: 'record_date',
      key: 'record_date',
      sorter: (a, b) => new Date(a.record_date) - new Date(b.record_date),
    },
    {
      title: '体重(kg)',
      dataIndex: 'weight',
      key: 'weight',
      render: (v) => v ?? '-',
    },
    {
      title: '收缩压(mmHg)',
      dataIndex: 'systolic',
      key: 'systolic',
      render: (v) => v ?? '-',
    },
    {
      title: '舒张压(mmHg)',
      dataIndex: 'diastolic',
      key: 'diastolic',
      render: (v) => v ?? '-',
    },
    {
      title: '步数',
      dataIndex: 'steps',
      key: 'steps',
      render: (v) => v?.toLocaleString() ?? '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          />
          <Popconfirm
            title="确定删除这条记录吗？"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 计算进度
  const threshold = thresholdsData?.threshold || {};
  const stats = statsData?.stats || {};

  // 步数进度
  const stepsProgress = threshold.steps_goal && stats.avgSteps
    ? Math.min(100, Math.round((stats.avgSteps / threshold.steps_goal) * 100))
    : 0;

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-6">
          <Title level={3} className="!mb-0">
            <DashboardOutlined className="mr-2" />
            健康数据
          </Title>
          <Space>
            <Button icon={<AimOutlined />} onClick={openThresholdModal}>
              设置目标
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              添加记录
            </Button>
          </Space>
        </div>

        {/* 时间段选择 */}
        <div className="mb-4">
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { label: '近7天', value: 'week' },
              { label: '近30天', value: 'month' },
              { label: '近一年', value: 'year' },
            ]}
          />
        </div>

        {/* 标签页 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: '概览',
              icon: <DashboardOutlined />,
              children: (
                <Spin spinning={statsLoading}>
                  {/* 统计卡片 */}
                  <Row gutter={[16, 16]} className="mb-6">
                    <Col xs={12} md={6}>
                      <Card>
                        <Statistic
                          title="平均体重"
                          value={stats.avgWeight?.toFixed(1) || '-'}
                          suffix="kg"
                          precision={1}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} md={6}>
                      <Card>
                        <Statistic
                          title="平均收缩压"
                          value={stats.avgSystolic?.toFixed(0) || '-'}
                          suffix="mmHg"
                        />
                      </Card>
                    </Col>
                    <Col xs={12} md={6}>
                      <Card>
                        <Statistic
                          title="平均舒张压"
                          value={stats.avgDiastolic?.toFixed(0) || '-'}
                          suffix="mmHg"
                        />
                      </Card>
                    </Col>
                    <Col xs={12} md={6}>
                      <Card>
                        <Statistic
                          title="总步数"
                          value={stats.totalSteps || 0}
                          suffix="步"
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* 步数目标进度 */}
                  <Card title="步数目标" className="mb-6">
                    <div className="flex items-center gap-4">
                      <Progress
                        type="circle"
                        percent={stepsProgress}
                        format={() => `${stepsProgress}%`}
                        strokeColor={{
                          '0%': '#108ee9',
                          '100%': '#87d068',
                        }}
                      />
                      <div>
                        <Text>日均步数: {stats.avgSteps?.toFixed(0) || 0} 步</Text>
                        <br />
                        <Text type="secondary">目标: {threshold.steps_goal || 10000} 步/天</Text>
                      </div>
                    </div>
                  </Card>

                  {/* 图表 */}
                  {statsData?.records?.length > 0 ? (
                    <HealthCharts
                      records={statsData.records}
                      threshold={threshold}
                    />
                  ) : (
                    <Empty description="暂无数据，请先添加健康记录" />
                  )}
                </Spin>
              ),
            },
            {
              key: 'records',
              label: '记录列表',
              icon: <LineChartOutlined />,
              children: (
                <Card>
                  <Table
                    columns={columns}
                    dataSource={recordsData?.records || []}
                    rowKey="id"
                    loading={recordsLoading}
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              ),
            },
          ]}
        />

        {/* 添加/编辑记录模态框 */}
        <Modal
          title={editingRecord ? '编辑记录' : '添加记录'}
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
            form.resetFields();
          }}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="recordDate"
              label="日期"
              rules={[{ required: true, message: '请选择日期' }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="weight" label="体重(kg)">
                  <InputNumber
                    className="w-full"
                    min={20}
                    max={300}
                    step={0.1}
                    precision={1}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="steps" label="步数">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="systolic" label="收缩压(mmHg)">
                  <InputNumber className="w-full" min={60} max={250} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="diastolic" label="舒张压(mmHg)">
                  <InputNumber className="w-full" min={40} max={150} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item className="mb-0 text-right">
              <Space>
                <Button onClick={() => {
                  setIsModalOpen(false);
                  setEditingRecord(null);
                  form.resetFields();
                }}>
                  取消
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={addMutation.isPending || updateMutation.isPending}
                >
                  {editingRecord ? '更新' : '添加'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* 阈值设置模态框 */}
        <Modal
          title="健康目标设置"
          open={isThresholdModalOpen}
          onCancel={() => setIsThresholdModalOpen(false)}
          footer={null}
        >
          <Form
            form={thresholdForm}
            layout="vertical"
            onFinish={handleThresholdSubmit}
          >
            <Title level={5}>体重范围 (kg)</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="weightMin" label="最小">
                  <InputNumber className="w-full" min={20} max={300} step={0.1} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="weightMax" label="最大">
                  <InputNumber className="w-full" min={20} max={300} step={0.1} />
                </Form.Item>
              </Col>
            </Row>

            <Title level={5}>血压范围 (mmHg)</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="systolicMin" label="收缩压最小">
                  <InputNumber className="w-full" min={60} max={250} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="systolicMax" label="收缩压最大">
                  <InputNumber className="w-full" min={60} max={250} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="diastolicMin" label="舒张压最小">
                  <InputNumber className="w-full" min={40} max={150} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="diastolicMax" label="舒张压最大">
                  <InputNumber className="w-full" min={40} max={150} />
                </Form.Item>
              </Col>
            </Row>

            <Title level={5}>每日目标</Title>
            <Form.Item name="stepsGoal" label="步数目标">
              <InputNumber className="w-full" min={1000} max={50000} step={1000} />
            </Form.Item>

            <Form.Item className="mb-0 text-right">
              <Space>
                <Button onClick={() => setIsThresholdModalOpen(false)}>
                  取消
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saveThresholdMutation.isPending}
                >
                  保存
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}

export default Health;
