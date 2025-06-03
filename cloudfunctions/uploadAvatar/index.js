// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  try {
    const { fileBuffer, fileName, fileType } = event;
    
    if (!fileBuffer) {
      return {
        success: false,
        message: '请提供文件数据'
      };
    }
    
    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const extension = fileType === 'image/jpeg' ? '.jpg' : 
                     fileType === 'image/png' ? '.png' : 
                     fileType === 'image/gif' ? '.gif' : '.jpg';
    
    const cloudPath = `avatars/${wxContext.OPENID}/${timestamp}_${randomStr}${extension}`;
    
    // 上传到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: Buffer.from(fileBuffer)
    });
    
    if (uploadResult.fileID) {
      return {
        success: true,
        message: '头像上传成功',
        data: {
          fileID: uploadResult.fileID,
          cloudPath: cloudPath
        }
      };
    } else {
      return {
        success: false,
        message: '头像上传失败'
      };
    }
    
  } catch (error) {
    console.error('头像上传错误:', error);
    return {
      success: false,
      message: '头像上传失败: ' + error.message
    };
  }
}; 