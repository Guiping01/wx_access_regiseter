// 云函数入口文件
const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  try {
    const { username, password, loginType } = event;

    // 参数验证
    if (!username || !password) {
      return {
        success: false,
        message: '请提供完整的登录信息'
      };
    }

    // 密码加密
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

    // 查找管理员
    const adminResult = await db.collection('admins').where({
      username: username,
      password: hashedPassword,
      status: 'active'
    }).get();

    if (adminResult.data.length === 0) {
      // 记录失败日志
      await recordLoginLog(null, username, 'failed', '用户名或密码错误');
      
      return {
        success: false,
        message: '用户名或密码错误'
      };
    }

    const adminData = adminResult.data[0];

    // 更新登录信息
    await db.collection('admins').doc(adminData._id).update({
      data: {
        lastLoginTime: db.serverDate(),
        loginCount: db.command.inc(1),
        updateTime: db.serverDate()
      }
    });

    // 记录成功日志
    await recordLoginLog(adminData._id, username, 'success', '登录成功');

    // 生成token (实际项目中应使用JWT)
    const token = generateToken(adminData._id);

    return {
      success: true,
      message: '登录成功',
      data: {
        adminId: adminData._id,
        token: token,
        adminInfo: {
          username: adminData.username,
          realName: adminData.realName,
          role: adminData.role,
          permissions: adminData.permissions,
          email: adminData.email
        }
      }
    };

  } catch (error) {
    console.error('管理员登录错误:', error);
    return {
      success: false,
      message: '服务器错误，请稍后重试'
    };
  }
};

// 记录管理员登录日志
async function recordLoginLog(adminId, username, result, description) {
  try {
    await db.collection('admin_logs').add({
      data: {
        adminId: adminId,
        adminName: username,
        action: 'login',
        description: description,
        targetType: 'system',
        targetId: null,
        result: result,
        createTime: db.serverDate()
      }
    });
  } catch (error) {
    console.error('记录管理员日志失败:', error);
  }
}

// 生成token
function generateToken(adminId) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  return `admin_${adminId}_${timestamp}_${randomStr}`;
} 