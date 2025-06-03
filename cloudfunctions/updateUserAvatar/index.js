// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { avatarUrl } = event;
  
  try {
    console.log('更新用户头像，openid:', wxContext.OPENID);
    console.log('新头像URL:', avatarUrl);
    
    if (!avatarUrl) {
      return {
        success: false,
        message: '头像URL不能为空'
      };
    }
    
    // 更新用户头像
    const updateResult = await db.collection('users').where({
      openid: wxContext.OPENID
    }).update({
      data: {
        avatarUrl: avatarUrl,
        updateTime: new Date()
      }
    });

    if (updateResult.stats.updated > 0) {
      console.log('头像更新成功');
      return {
        success: true,
        message: '头像更新成功'
      };
    } else {
      console.log('未找到用户记录');
      return {
        success: false,
        message: '用户不存在'
      };
    }

  } catch (error) {
    console.error('更新头像失败:', error);
    return {
      success: false,
      message: '更新头像失败'
    };
  }
}; 