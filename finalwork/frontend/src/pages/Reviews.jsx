import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Space, Button, Modal, Form, Rate, Input, Select, message, Typography, Row, Col, Statistic, Empty } from 'antd';
import { 
  StarOutlined, 
  EditOutlined, 
  DeleteOutlined,
  PlusOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { 
  getAllReviews, 
  createReview, 
  updateReview, 
  deleteReview,
  getVenueReviewStats,
  getAllVenues
} from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

function Reviews({ user }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venueStats, setVenueStats] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [ratingFilter, setRatingFilter] = useState(null);
  const [form] = Form.useForm();

  const loadReviews = async () => {
    if (!user || !user.id) {
      console.error('Reviews组件：无法加载评价，user.id为空');
      setReviews([]);
      return;
    }
    
    setLoading(true);
    try {
      const data = await getAllReviews({ user_id: user.id });
      setReviews(data || []);
    } catch (error) {
      console.error('加载评价失败:', error);
      message.error('加载评价失败: ' + (error.response?.data?.error || error.message));
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.id) {
      loadReviews();
      loadVenues();
    } else {
      console.warn('Reviews组件：user或user.id为空', user);
    }
  }, [user]);

  // 如果没有用户信息，显示错误提示
  if (!user || !user.id) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Typography.Title level={3}>用户信息未找到</Typography.Title>
        <Typography.Text type="secondary">请重新登录</Typography.Text>
      </div>
    );
  }

  const loadVenues = async () => {
    try {
      const data = await getAllVenues();
      setVenues(data || []);
    } catch (error) {
      console.error('加载场馆失败:', error);
    }
  };

  const loadVenueStats = async (venueId) => {
    try {
      const stats = await getVenueReviewStats(venueId);
      setVenueStats(stats);
    } catch (error) {
      console.error('加载场馆统计失败:', error);
    }
  };

  const handleAddReview = () => {
    setEditingReview(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    form.setFieldsValue({
      venue_id: review.venue_id,
      rating: review.rating,
      comment: review.comment
    });
    setSelectedVenue(review.venue_id);
    if (review.venue_id) {
      loadVenueStats(review.venue_id);
    }
    setModalVisible(true);
  };

  const handleDeleteReview = async (id) => {
    try {
      await deleteReview(id);
      message.success('评价已删除');
      loadReviews();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingReview) {
        await updateReview(editingReview.id, {
          rating: values.rating,
          comment: values.comment
        });
        message.success('评价已更新');
      } else {
        await createReview({
          user_id: user.id,
          venue_id: values.venue_id,
          rating: values.rating,
          comment: values.comment
        });
        message.success('评价已提交');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingReview(null);
      setSelectedVenue(null);
      setVenueStats(null);
      loadReviews();
    } catch (error) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleVenueChange = (venueId) => {
    setSelectedVenue(venueId);
    if (venueId) {
      loadVenueStats(venueId);
    } else {
      setVenueStats(null);
    }
  };

  const columns = [
    {
      title: '场馆',
      dataIndex: 'venue_name',
      key: 'venue_name',
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => (
        <Space>
          <Rate disabled defaultValue={rating} />
          <span>{rating} 星</span>
        </Space>
      ),
    },
    {
      title: '评价内容',
      dataIndex: 'comment',
      key: 'comment',
      render: (text) => text || <Text type="secondary">暂无评价</Text>,
    },
    {
      title: '预约信息',
      key: 'reservation',
      render: (_, record) => {
        if (record.reservation_date) {
          return `${record.reservation_date} ${record.start_time}-${record.end_time}`;
        }
        return '-';
      },
    },
    {
      title: '评价时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditReview(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '确定要删除这条评价吗？',
                onOk: () => handleDeleteReview(record.id),
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <StarOutlined /> 我的评价
        </Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAddReview}
        >
          添加评价
        </Button>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Input.Search
              placeholder="搜索场馆名称"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder="筛选评分"
              style={{ width: 150 }}
              allowClear
              value={ratingFilter}
              onChange={setRatingFilter}
            >
              <Select.Option value="5">5星</Select.Option>
              <Select.Option value="4">4星</Select.Option>
              <Select.Option value="3">3星</Select.Option>
              <Select.Option value="2">2星</Select.Option>
              <Select.Option value="1">1星</Select.Option>
            </Select>
            <Button onClick={loadReviews}>刷新</Button>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={reviews.filter(r => {
            if (searchText && !r.venue_name?.toLowerCase().includes(searchText.toLowerCase())) {
              return false;
            }
            if (ratingFilter && r.rating !== parseInt(ratingFilter)) {
              return false;
            }
            return true;
          })}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无评价' }}
        />
      </Card>

      {/* 添加/编辑评价模态框 */}
      <Modal
        title={editingReview ? '编辑评价' : '添加评价'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingReview(null);
          setSelectedVenue(null);
          setVenueStats(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {!editingReview && (
            <Form.Item
              name="venue_id"
              label="选择场馆"
              rules={[{ required: true, message: '请选择场馆' }]}
            >
              <Select
                placeholder="请选择要评价的场馆"
                onChange={handleVenueChange}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={venues.map(v => ({
                  value: v.id,
                  label: `${v.name} (${v.type})`
                }))}
              />
            </Form.Item>
          )}

          {selectedVenue && venueStats && (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="平均评分"
                    value={venueStats.averageRating}
                    prefix={<StarOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="评价总数"
                    value={venueStats.totalReviews}
                    prefix={<MessageOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>评分分布</Text>
                    <div style={{ marginTop: 4 }}>
                      {[5, 4, 3, 2, 1].map(rating => (
                        <div key={rating} style={{ fontSize: 11, marginTop: 2 }}>
                          {rating}星: {venueStats.ratingDistribution[rating]}条
                        </div>
                      ))}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          <Form.Item
            name="rating"
            label="评分"
            rules={[{ required: true, message: '请选择评分' }]}
          >
            <Rate />
          </Form.Item>

          <Form.Item
            name="comment"
            label="评价内容"
          >
            <TextArea
              rows={4}
              placeholder="请输入您的评价（可选）"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingReview ? '更新评价' : '提交评价'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Reviews;
