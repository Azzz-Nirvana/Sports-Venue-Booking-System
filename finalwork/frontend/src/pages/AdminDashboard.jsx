import React, { useState, useEffect } from 'react';
import { Tabs, Card, Table, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, message, Row, Col, Statistic, Dropdown } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  DollarOutlined,
  ShopOutlined,
  UserOutlined,
  CalendarOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { 
  getAllUsers,
  getAllVenues, 
  createVenue, 
  updateVenue, 
  deleteVenue,
  getAllReservations,
  updateReservationStatus,
  getAllUsageRecords,
  getOverviewStats,
  getRevenueByDate,
  getVenueUsageStats,
  getAllSubVenues,
  createSubVenue,
  updateSubVenue,
  deleteSubVenue,
  getUserById,
  updateUser,
  deleteUser
} from '../services/api';

const { TabPane } = Tabs;

function AdminDashboard({ user, tab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(tab);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [venues, setVenues] = useState([]);
  const [subVenues, setSubVenues] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [usageRecords, setUsageRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [revenueStats, setRevenueStats] = useState([]);
  const [venueStats, setVenueStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [subVenueModalVisible, setSubVenueModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [editingSubVenue, setEditingSubVenue] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [subVenueForm] = Form.useForm();
  const [userForm] = Form.useForm();

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverview();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'applications') {
      loadApplications();
    } else if (activeTab === 'venues') {
      loadVenues();
      loadSubVenues();
    } else if (activeTab === 'reservations') {
      loadReservations();
    } else if (activeTab === 'usage') {
      loadUsageRecords();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      message.error('加载用户失败');
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await getAllReservations({ status: 'pending' });
      setApplications(data);
    } catch (error) {
      message.error('加载申请列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmApplication = async (id) => {
    try {
      await updateReservationStatus(id, 'confirmed');
      message.success('申请已确认');
      loadApplications();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleRejectApplication = async (id) => {
    try {
      await updateReservationStatus(id, 'cancelled');
      message.success('申请已拒绝');
      loadApplications();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [overview, revenue, venue] = await Promise.all([
        getOverviewStats(),
        getRevenueByDate(),
        getVenueUsageStats()
      ]);
      setStats(overview);
      setRevenueStats(revenue);
      setVenueStats(venue);
    } catch (error) {
      message.error('加载统计失败');
    } finally {
      setLoading(false);
    }
  };

  const loadVenues = async () => {
    setLoading(true);
    try {
      const data = await getAllVenues();
      setVenues(data);
    } catch (error) {
      message.error('加载场馆失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSubVenues = async () => {
    setLoading(true);
    try {
      const data = await getAllSubVenues();
      setSubVenues(data);
    } catch (error) {
      message.error('加载子场地失败');
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async () => {
    setLoading(true);
    try {
      const data = await getAllReservations();
      setReservations(data);
    } catch (error) {
      message.error('加载预约失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUsageRecords = async () => {
    setLoading(true);
    try {
      const data = await getAllUsageRecords();
      setUsageRecords(data);
    } catch (error) {
      message.error('加载使用记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVenue = () => {
    setEditingVenue(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'available',
      capacity: 1
    });
    setModalVisible(true);
  };

  const handleEditVenue = (venue) => {
    setEditingVenue(venue);
    form.setFieldsValue(venue);
    setModalVisible(true);
  };

  const handleDeleteVenue = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个场馆吗？',
      onOk: async () => {
        try {
          await deleteVenue(id);
          message.success('删除成功');
          loadVenues();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleSubmitVenue = async (values) => {
    try {
      if (editingVenue) {
        await updateVenue(editingVenue.id, values);
        message.success('更新成功');
      } else {
        await createVenue(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadVenues();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  // 子场地管理函数
  const handleAddSubVenue = () => {
    setEditingSubVenue(null);
    subVenueForm.resetFields();
    subVenueForm.setFieldsValue({ status: 'available', capacity: 1 });
    setSubVenueModalVisible(true);
  };

  const handleEditSubVenue = (subVenue) => {
    setEditingSubVenue(subVenue);
    subVenueForm.setFieldsValue(subVenue);
    setSubVenueModalVisible(true);
  };

  const handleDeleteSubVenue = async (id) => {
    try {
      await deleteSubVenue(id);
      message.success('删除成功');
      loadSubVenues();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmitSubVenue = async (values) => {
    try {
      if (editingSubVenue) {
        await updateSubVenue(editingSubVenue.id, values);
        message.success('更新成功');
      } else {
        await createSubVenue(values);
        message.success('创建成功');
      }
      setSubVenueModalVisible(false);
      loadSubVenues();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  // 用户管理函数
  const handleEditUser = async (user) => {
    try {
      const userData = await getUserById(user.id);
      setEditingUser(userData);
      userForm.setFieldsValue(userData);
      setUserModalVisible(true);
    } catch (error) {
      message.error('加载用户信息失败');
    }
  };

  const handleDeleteUser = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除用户将同时删除该用户的所有相关数据，此操作不可恢复！',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteUser(id);
          message.success('删除成功');
          loadUsers();
        } catch (error) {
          message.error(error.response?.data?.error || '删除失败');
        }
      }
    });
  };

  const handleSubmitUser = async (values) => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, values);
        message.success('更新成功');
      } else {
        // 创建用户需要调用注册接口
        message.warning('创建用户功能请使用注册接口');
        return;
      }
      setUserModalVisible(false);
      loadUsers();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  // 数据导出功能
  const exportToCSV = (data, filename, columns) => {
    if (!data || data.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    // 构建CSV内容
    const headers = columns.map(col => col.title || col.key).join(',');
    const rows = data.map(item => {
      return columns.map(col => {
        let value = item[col.dataIndex];
        // 处理特殊格式
        if (col.dataIndex === 'status') {
          const statusMap = {
            pending: '待确认',
            confirmed: '已确认',
            in_use: '使用中',
            completed: '已完成',
            cancelled: '已取消',
            paid: '已支付',
            unpaid: '未支付'
          };
          value = statusMap[value] || value;
        }
        if (col.dataIndex === 'payment_status') {
          value = value === 'paid' ? '已支付' : '未支付';
        }
        if (col.dataIndex === 'total_amount' && value) {
          value = parseFloat(value).toFixed(2);
        }
        if (col.dataIndex === 'duration_hours' && value) {
          value = `${value} 小时`;
        }
        return `"${String(value || '').replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('导出成功');
  };

  const handleExportReservations = () => {
    const columns = [
      { title: '预约日期', dataIndex: 'reservation_date', key: 'reservation_date' },
      { title: '开始时间', dataIndex: 'start_time', key: 'start_time' },
      { title: '结束时间', dataIndex: 'end_time', key: 'end_time' },
      { title: '用户', dataIndex: 'user_name', key: 'user_name' },
      { title: '电话', dataIndex: 'user_phone', key: 'user_phone' },
      { title: '场馆', dataIndex: 'venue_name', key: 'venue_name' },
      { title: '子场地', dataIndex: 'sub_venue_name', key: 'sub_venue_name' },
      { title: '状态', dataIndex: 'status', key: 'status' },
    ];
    exportToCSV(reservations, '预约记录', columns);
  };

  const handleExportUsageRecords = () => {
    const columns = [
      { title: '用户', dataIndex: 'user_name', key: 'user_name' },
      { title: '场馆', dataIndex: 'venue_name', key: 'venue_name' },
      { title: '使用时长', dataIndex: 'duration_hours', key: 'duration_hours' },
      { title: '费用', dataIndex: 'total_amount', key: 'total_amount' },
      { title: '支付状态', dataIndex: 'payment_status', key: 'payment_status' },
      { title: '开始时间', dataIndex: 'actual_start_time', key: 'actual_start_time' },
      { title: '结束时间', dataIndex: 'actual_end_time', key: 'actual_end_time' },
    ];
    exportToCSV(usageRecords, '使用记录', columns);
  };

  const venueColumns = [
    {
      title: '场馆名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '价格/小时',
      dataIndex: 'price_per_hour',
      key: 'price_per_hour',
      render: (text) => `¥${parseFloat(text).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'available' ? 'green' : status === 'maintenance' ? 'orange' : 'red'}>
          {status === 'available' ? '可用' : status === 'maintenance' ? '维护中' : '已关闭'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEditVenue(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteVenue(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const reservationColumns = [
    {
      title: '预约日期',
      dataIndex: 'reservation_date',
      key: 'reservation_date',
    },
    {
      title: '时间段',
      key: 'time',
      render: (_, record) => `${record.start_time} - ${record.end_time}`,
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
    },
    {
      title: '场馆',
      dataIndex: 'venue_name',
      key: 'venue_name',
    },
    {
      title: '子场地',
      dataIndex: 'sub_venue_name',
      key: 'sub_venue_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          pending: { color: 'orange', text: '待确认' },
          confirmed: { color: 'blue', text: '已确认' },
          in_use: { color: 'green', text: '使用中' },
          completed: { color: 'default', text: '已完成' },
          cancelled: { color: 'red', text: '已取消' }
        };
        const config = statusMap[status] || statusMap.pending;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  const usageColumns = [
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
    },
    {
      title: '场馆',
      dataIndex: 'venue_name',
      key: 'venue_name',
    },
    {
      title: '使用时长',
      dataIndex: 'duration_hours',
      key: 'duration_hours',
      render: (text) => text ? `${text} 小时` : '-',
    },
    {
      title: '费用',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (text) => text ? `¥${parseFloat(text).toFixed(2)}` : '-',
    },
    {
      title: '支付状态',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => (
        <Tag color={status === 'paid' ? 'green' : 'orange'}>
          {status === 'paid' ? '已支付' : '未支付'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="数据统计" key="overview">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic 
                    title="总用户数" 
                    value={stats.total_users || 0} 
                    prefix={<UserOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic 
                    title="总场馆数" 
                    value={stats.total_venues || 0} 
                    prefix={<ShopOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic 
                    title="总预约数" 
                    value={stats.total_reservations || 0} 
                    prefix={<CalendarOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic 
                    title="总收入" 
                    value={stats.total_revenue || 0} 
                    prefix={<DollarOutlined />}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
            </Row>

            <Card title="按日期统计收入">
              <Table
                columns={[
                  { title: '日期', dataIndex: 'date', key: 'date' },
                  { title: '使用次数', dataIndex: 'count', key: 'count' },
                  { 
                    title: '总收入', 
                    dataIndex: 'total_revenue', 
                    key: 'total_revenue',
                    render: (text) => text ? `¥${parseFloat(text).toFixed(2)}` : '¥0.00'
                  },
                  { 
                    title: '已支付', 
                    dataIndex: 'paid_revenue', 
                    key: 'paid_revenue',
                    render: (text) => text ? `¥${parseFloat(text).toFixed(2)}` : '¥0.00'
                  },
                ]}
                dataSource={revenueStats}
                rowKey="date"
                pagination={{ pageSize: 10 }}
              />
            </Card>

            <Card title="按场馆统计使用情况">
              <Table
                columns={[
                  { title: '场馆名称', dataIndex: 'name', key: 'name' },
                  { title: '类型', dataIndex: 'type', key: 'type' },
                  { title: '使用次数', dataIndex: 'usage_count', key: 'usage_count' },
                  { 
                    title: '总收入', 
                    dataIndex: 'total_revenue', 
                    key: 'total_revenue',
                    render: (text) => text ? `¥${parseFloat(text).toFixed(2)}` : '¥0.00'
                  },
                  { 
                    title: '已支付', 
                    dataIndex: 'paid_revenue', 
                    key: 'paid_revenue',
                    render: (text) => text ? `¥${parseFloat(text).toFixed(2)}` : '¥0.00'
                  },
                  { 
                    title: '平均时长', 
                    dataIndex: 'avg_duration', 
                    key: 'avg_duration',
                    render: (text) => text ? `${parseFloat(text).toFixed(2)} 小时` : '-'
                  },
                ]}
                dataSource={venueStats}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </Space>
        </TabPane>

        <TabPane tab="用户管理" key="users">
          <Card 
            title="用户列表"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                setEditingUser(null);
                userForm.resetFields();
                userForm.setFieldsValue({ role: 'user' });
                setUserModalVisible(true);
              }}>
                添加用户
              </Button>
            }
          >
            <Table
              columns={[
                { title: 'ID', dataIndex: 'id', key: 'id' },
                { title: '姓名', dataIndex: 'name', key: 'name' },
                { title: '电话', dataIndex: 'phone', key: 'phone' },
                { 
                  title: '角色', 
                  dataIndex: 'role', 
                  key: 'role',
                  render: (role) => (
                    <Tag color={role === 'admin' ? 'red' : 'blue'}>
                      {role === 'admin' ? '管理员' : '用户'}
                    </Tag>
                  )
                },
                { 
                  title: '注册时间', 
                  dataIndex: 'created_at', 
                  key: 'created_at',
                  render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-'
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => (
                    <Space>
                      <Button 
                        type="link" 
                        icon={<EditOutlined />}
                        onClick={() => handleEditUser(record)}
                      >
                        编辑
                      </Button>
                      <Button 
                        type="link" 
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteUser(record.id)}
                      >
                        删除
                      </Button>
                    </Space>
                  ),
                },
              ]}
              dataSource={users}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="申请列表" key="applications">
          <Card title="待确认的预约申请">
            <Table
              columns={[
                { title: '预约日期', dataIndex: 'reservation_date', key: 'reservation_date' },
                { 
                  title: '时间段', 
                  key: 'time',
                  render: (_, record) => `${record.start_time} - ${record.end_time}`
                },
                { title: '用户', dataIndex: 'user_name', key: 'user_name' },
                { title: '联系电话', dataIndex: 'user_phone', key: 'user_phone' },
                { title: '场馆', dataIndex: 'venue_name', key: 'venue_name' },
                { title: '子场地', dataIndex: 'sub_venue_name', key: 'sub_venue_name' },
                { 
                  title: '状态', 
                  dataIndex: 'status', 
                  key: 'status',
                  render: (status) => <Tag color="orange">待确认</Tag>
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => (
                    <Space>
                      <Button 
                        type="primary" 
                        size="small"
                        onClick={() => handleConfirmApplication(record.id)}
                      >
                        确认
                      </Button>
                      <Button 
                        danger 
                        size="small"
                        onClick={() => handleRejectApplication(record.id)}
                      >
                        拒绝
                      </Button>
                    </Space>
                  ),
                },
              ]}
              dataSource={applications}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="场馆管理" key="venues">
          <Card 
            title="场馆列表"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddVenue}
              >
                新增场馆
              </Button>
            }
          >
            <Table
              columns={venueColumns}
              dataSource={venues}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>

          <Card 
            title="子场地管理"
            style={{ marginTop: 24 }}
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSubVenue}>
                新增子场地
              </Button>
            }
          >
            <Table
              columns={[
                { title: 'ID', dataIndex: 'id', key: 'id' },
                { 
                  title: '所属场馆', 
                  dataIndex: 'venue_id', 
                  key: 'venue_id',
                  render: (venueId) => {
                    const venue = venues.find(v => v.id === venueId);
                    return venue ? venue.name : venueId;
                  }
                },
                { title: '子场地名称', dataIndex: 'name', key: 'name' },
                { title: '容量', dataIndex: 'capacity', key: 'capacity', render: (text) => `${text}人` },
                { 
                  title: '状态', 
                  dataIndex: 'status', 
                  key: 'status',
                  render: (status) => (
                    <Tag color={status === 'available' ? 'green' : status === 'maintenance' ? 'orange' : 'red'}>
                      {status === 'available' ? '可用' : status === 'maintenance' ? '维护中' : '已关闭'}
                    </Tag>
                  )
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => (
                    <Space>
                      <Button 
                        type="link" 
                        icon={<EditOutlined />}
                        onClick={() => handleEditSubVenue(record)}
                      >
                        编辑
                      </Button>
                      <Button 
                        type="link" 
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteSubVenue(record.id)}
                      >
                        删除
                      </Button>
                    </Space>
                  ),
                },
              ]}
              dataSource={subVenues}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="预约记录" key="reservations">
          <Card 
            title="所有预约记录"
            extra={
              <Button 
                icon={<DownloadOutlined />}
                onClick={handleExportReservations}
              >
                导出CSV
              </Button>
            }
          >
            <Table
              columns={reservationColumns}
              dataSource={reservations}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="使用记录" key="usage">
          <Card 
            title="所有使用记录"
            extra={
              <Button 
                icon={<DownloadOutlined />}
                onClick={handleExportUsageRecords}
              >
                导出CSV
              </Button>
            }
          >
            <Table
              columns={[
                { title: '用户', dataIndex: 'user_name', key: 'user_name' },
                { title: '场馆', dataIndex: 'venue_name', key: 'venue_name' },
                { title: '使用时长', dataIndex: 'duration_hours', key: 'duration_hours', render: (text) => text ? `${text} 小时` : '-' },
                { title: '费用', dataIndex: 'total_amount', key: 'total_amount', render: (text) => text ? `¥${parseFloat(text).toFixed(2)}` : '-' },
                { 
                  title: '支付状态', 
                  dataIndex: 'payment_status', 
                  key: 'payment_status',
                  render: (status) => (
                    <Tag color={status === 'paid' ? 'green' : 'orange'}>
                      {status === 'paid' ? '已支付' : '未支付'}
                    </Tag>
                  )
                },
                { title: '开始时间', dataIndex: 'actual_start_time', key: 'actual_start_time', render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-' },
                { title: '结束时间', dataIndex: 'actual_end_time', key: 'actual_end_time', render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-' },
              ]}
              dataSource={usageRecords}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title={editingVenue ? '编辑场馆' : '新增场馆'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitVenue}
        >
          <Form.Item
            name="name"
            label="场馆名称"
            rules={[{ required: true, message: '请输入场馆名称' }]}
          >
            <Input placeholder="例如：1号篮球场" />
          </Form.Item>

          <Form.Item
            name="type"
            label="场馆类型"
            rules={[{ required: true, message: '请选择场馆类型' }]}
          >
            <Select placeholder="请选择类型">
              <Select.Option value="篮球场">篮球场</Select.Option>
              <Select.Option value="足球场">足球场</Select.Option>
              <Select.Option value="羽毛球场">羽毛球场</Select.Option>
              <Select.Option value="网球场">网球场</Select.Option>
              <Select.Option value="乒乓球场">乒乓球场</Select.Option>
              <Select.Option value="游泳馆">游泳馆</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="capacity"
            label="容量（人）"
            rules={[{ required: true, message: '请输入容量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="price_per_hour"
            label="价格/小时（元）"
            rules={[{ required: true, message: '请输入价格' }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Select.Option value="available">可用</Select.Option>
              <Select.Option value="maintenance">维护中</Select.Option>
              <Select.Option value="closed">已关闭</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="场馆描述信息" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingVenue ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 子场地管理Modal */}
      <Modal
        title={editingSubVenue ? '编辑子场地' : '新增子场地'}
        open={subVenueModalVisible}
        onCancel={() => {
          setSubVenueModalVisible(false);
          subVenueForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={subVenueForm}
          layout="vertical"
          onFinish={handleSubmitSubVenue}
        >
          <Form.Item
            name="venue_id"
            label="所属场馆"
            rules={[{ required: true, message: '请选择所属场馆' }]}
          >
            <Select placeholder="请选择场馆">
              {venues.map(venue => (
                <Select.Option key={venue.id} value={venue.id}>
                  {venue.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="子场地名称"
            rules={[{ required: true, message: '请输入子场地名称' }]}
          >
            <Input placeholder="例如：1号台" />
          </Form.Item>

          <Form.Item
            name="capacity"
            label="容量（人数）"
            rules={[{ required: true, message: '请输入容量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入容量" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Select.Option value="available">可用</Select.Option>
              <Select.Option value="maintenance">维护中</Select.Option>
              <Select.Option value="closed">已关闭</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingSubVenue ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 用户管理Modal */}
      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={userModalVisible}
        onCancel={() => {
          setUserModalVisible(false);
          userForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={userForm}
          layout="vertical"
          onFinish={handleSubmitUser}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="电话"
            rules={[{ required: true, message: '请输入电话' }]}
          >
            <Input placeholder="请输入电话" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Select.Option value="user">普通用户</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingUser ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AdminDashboard;

