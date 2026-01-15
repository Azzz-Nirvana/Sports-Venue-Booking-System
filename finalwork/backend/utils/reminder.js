const { db } = require('../db/init');
const { createNotification } = require('../routes/notifications');

// 格式化时间为HH:mm
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 格式化日期为YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 检查并发送预约提醒
function checkAndSendReminders() {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const today = formatDate(now);
  const currentTime = formatTime(now);
  const oneHourLaterTime = formatTime(oneHourLater);
  
  const query = `
    SELECT r.*, v.name as venue_name, u.name as user_name
    FROM reservations r
    LEFT JOIN venues v ON r.venue_id = v.id
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.status = 'confirmed'
    AND r.reservation_date = ?
    AND r.start_time <= ?
    AND r.start_time > ?
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.user_id = r.user_id 
      AND n.type = 'reservation_reminder' 
      AND n.related_id = r.id
      AND DATE(n.created_at) = DATE('now')
    )
  `;
  
  db.all(query, [today, oneHourLaterTime, currentTime], async (err, reservations) => {
    if (err) {
      console.error('检查预约提醒失败:', err);
      return;
    }
    
    for (const reservation of reservations) {
      try {
        await createNotification(
          reservation.user_id,
          'reservation_reminder',
          '预约即将开始',
          `您的预约即将在1小时后开始，场馆：${reservation.venue_name}，时间：${reservation.start_time}-${reservation.end_time}，请准时到场`,
          reservation.id,
          'reservation'
        );
        console.log(`已发送预约提醒给用户 ${reservation.user_id}`);
      } catch (error) {
        console.error(`发送预约提醒失败 (预约ID: ${reservation.id}):`, error);
      }
    }
  });
}

// 每5分钟检查一次
setInterval(checkAndSendReminders, 5 * 60 * 1000);

// 启动时立即检查一次
checkAndSendReminders();

module.exports = { checkAndSendReminders };
