// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { startDate, limit = 50 } = event;
  
  try {
    console.log('获取用户开门记录，openid:', wxContext.OPENID);
    console.log('查询参数:', { startDate, limit });
    
    // 先获取用户ID
    const userResult = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get();
    
    if (!userResult.data || userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      };
    }
    
    const userId = userResult.data[0]._id;
    
    // 构建查询条件
    let whereCondition = { userId: userId };
    
    if (startDate) {
      whereCondition.createTime = db.command.gte(new Date(startDate));
    }
    
    // 查询开门记录
    const logsResult = await db.collection('door_logs')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();
    
    console.log('查询到开门记录:', logsResult.data.length, '条');
    
    return {
      success: true,
      data: logsResult.data,
      total: logsResult.data.length
    };

  } catch (error) {
    console.error('获取开门记录失败:', error);
    return {
      success: false,
      message: '获取开门记录失败'
    };
  }
}; 