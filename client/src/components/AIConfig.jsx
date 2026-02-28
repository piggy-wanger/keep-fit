import { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Select, Button, Table, Space, Tag, message,
  Popconfirm, Empty
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, StarOutlined,
  StarFilled, ApiOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiConfigApi } from '../services/aiApi';

const { Option } = Select;

function AIConfig({ onConfigChange }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取支持的模型服务商
  const { data: providersData } = useQuery({
    queryKey: ['aiProviders'],
    queryFn: () => aiConfigApi.getProviders().then(res => res.data),
  });

  // 获取配置列表
  const { data: configsData, isLoading } = useQuery({
    queryKey: ['aiConfigs'],
    queryFn: () => aiConfigApi.getConfigs().then(res => res.data),
  });

  // 创建配置
  const createMutation = useMutation({
    mutationFn: (data) => aiConfigApi.createConfig(data),
    onSuccess: () => {
      message.success('配置创建成功');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries(['aiConfigs']);
      onConfigChange?.();
    },
    onError: (err) => message.error(err.response?.data?.error || '创建失败'),
  });

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => aiConfigApi.updateConfig(id, data),
    onSuccess: () => {
      message.success('配置更新成功');
      setModalOpen(false);
      setEditingConfig(null);
      form.resetFields();
      queryClient.invalidateQueries(['aiConfigs']);
      onConfigChange?.();
    },
    onError: (err) => message.error(err.response?.data?.error || '更新失败'),
  });

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: (id) => aiConfigApi.deleteConfig(id),
    onSuccess: () => {
      message.success('配置已删除');
      queryClient.invalidateQueries(['aiConfigs']);
      onConfigChange?.();
    },
  });

  // 设为默认
  const setDefaultMutation = useMutation({
    mutationFn: (id) => aiConfigApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['aiConfigs']);
      onConfigChange?.();
    },
  });

  // 打开模态框
  const openModal = (config = null) => {
    setEditingConfig(config);
    if (config) {
      form.setFieldsValue({
        name: config.name,
        provider: config.provider,
        model: config.model,
        baseUrl: config.base_url,
        apiKey: '', // 不显示已有 API Key
      });
    } else {
      form.resetFields();
    }
    setModalOpen(true);
  };

  // 提交表单
  const handleSubmit = (values) => {
    const data = {
      name: values.name,
      provider: values.provider,
      model: values.model,
      baseUrl: values.baseUrl || null,
      apiKey: values.apiKey,
      isDefault: !editingConfig, // 新建时默认为默认配置
    };

    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // 表格列
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '服务商',
      dataIndex: 'provider',
      key: 'provider',
      render: (v) => {
        const names = {
          openai: 'OpenAI',
          anthropic: 'Anthropic',
          deepseek: 'DeepSeek',
          moonshot: 'Moonshot',
          custom: '自定义',
        };
        return names[v] || v;
      },
    },
    {
      title: '模型',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => (
        record.is_default
          ? <Tag color="blue" icon={<StarFilled />}>默认</Tag>
          : <Tag>备用</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {!record.is_default && (
            <Button
              size="small"
              icon={<StarOutlined />}
              onClick={() => setDefaultMutation.mutate(record.id)}
            >
              设为默认
            </Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此配置？"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 获取当前服务商的模型列表
  const selectedProvider = Form.useWatch('provider', form);
  const providerModels = providersData?.providers?.find(p => p.id === selectedProvider)?.models || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <ApiOutlined />
          <span className="font-medium">AI 模型配置</span>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          添加配置
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={configsData?.configs || []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        locale={{
          emptyText: (
            <Empty
              description="暂无配置，请添加 AI 模型配置"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        size="small"
      />

      {/* 配置模态框 */}
      <Modal
        title={editingConfig ? '编辑配置' : '添加配置'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingConfig(null);
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
            name="name"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="如：我的 GPT-4" />
          </Form.Item>

          <Form.Item
            name="provider"
            label="模型服务商"
            rules={[{ required: true, message: '请选择服务商' }]}
          >
            <Select placeholder="选择服务商">
              {providersData?.providers?.map(p => (
                <Option key={p.id} value={p.id}>{p.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="model"
            label="模型名称"
            rules={[{ required: true, message: '请输入或选择模型' }]}
          >
            <Select
              placeholder="选择或输入模型名称"
              showSearch
              allowClear
            >
              {providerModels.map(m => (
                <Option key={m} value={m}>{m}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="baseUrl"
            label="API URL（可选）"
            extra="自定义 API 地址，留空使用默认地址"
          >
            <Input placeholder="如：https://api.openai.com/v1" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[
              { required: !editingConfig, message: '请输入 API Key' },
            ]}
            extra={editingConfig ? '留空则保持原有 API Key 不变' : ''}
          >
            <Input.Password placeholder="输入 API Key" />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => {
                setModalOpen(false);
                setEditingConfig(null);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingConfig ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AIConfig;
