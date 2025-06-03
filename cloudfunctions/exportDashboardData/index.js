// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { startDate, endDate, gender, ageRange } = event;
    
    // 构建查询条件
    let whereCondition = {};
    
    // 日期过滤
    if (startDate || endDate) {
      whereCondition.createTime = {};
      if (startDate) whereCondition.createTime[db.command.gte] = new Date(startDate);
      if (endDate) whereCondition.createTime[db.command.lte] = new Date(endDate);
    }
    
    // 性别过滤
    if (gender && gender !== 'all') {
      whereCondition.gender = gender;
    }
    
    // 年龄过滤
    if (ageRange && ageRange !== 'all') {
      const [minAge, maxAge] = ageRange.split('-').map(Number);
      whereCondition.age = db.command.and(
        db.command.gte(minAge), 
        db.command.lte(maxAge)
      );
    }
    
    // 获取用户数据
    const usersResult = await db.collection('users')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .limit(1000)  // 限制导出数量
      .get();
    
    // 获取门禁记录
    const doorLogsResult = await db.collection('door_logs')
      .where(startDate || endDate ? {
        createTime: whereCondition.createTime || {}
      } : {})
      .orderBy('createTime', 'desc')
      .limit(1000)
      .get();
    
    // 构造CSV数据
    const csvData = {
      users: usersResult.data.map(user => ({
        姓名: user.name,
        性别: user.gender === 'male' ? '男' : '女',
        年龄: user.age,
        手机号: user.phone,
        注册时间: user.createTime ? new Date(user.createTime).toLocaleString('zh-CN') : '',
        状态: user.status === 'active' ? '正常' : '禁用'
      })),
      doorLogs: doorLogsResult.data.map(log => ({
        用户ID: log.userId,
        设备ID: log.deviceId,
        通行结果: log.result === 'success' ? '成功' : '失败',
        延迟时间: log.latency ? `${log.latency}ms` : '',
        位置: log.location || '',
        时间: log.createTime ? new Date(log.createTime).toLocaleString('zh-CN') : ''
      }))
    };
    
    return {
      success: true,
      message: '数据导出成功',
      data: {
        totalUsers: usersResult.data.length,
        totalLogs: doorLogsResult.data.length,
        csvData: csvData,
        exportTime: new Date().toLocaleString('zh-CN')
      }
    };
    
  } catch (error) {
    console.error('数据导出错误:', error);
    return {
      success: false,
      message: '数据导出失败: ' + error.message
    };
  }
}; 