# 📁 云存储配置指南

## 🎯 **存储需求**

### 1. **用户头像存储**
- **路径**: `avatars/{openid}/{timestamp}_{random}.jpg`
- **格式**: JPG, PNG, GIF
- **大小限制**: 最大 2MB
- **权限**: 用户只能访问自己的文件

### 2. **系统文件存储**
- **路径**: `system/{category}/{filename}`
- **用途**: 默认头像、图标等
- **权限**: 所有用户可读

## 🛠️ **配置步骤**

### 1. **开启云存储**
1. 打开微信开发者工具
2. 进入云开发控制台
3. 点击"存储"标签
4. 开启云存储功能

### 2. **配置安全规则**
```json
{
  "read": true,
  "write": "auth.openid == resource.openid"
}
```

### 3. **设置存储权限**
- 读权限：所有用户（头像需要展示给其他用户）
- 写权限：仅文件所有者
- 删除权限：仅文件所有者

## 📂 **目录结构**

```
cloud-storage/
├── avatars/           # 用户头像
│   ├── {openid1}/
│   │   ├── 1699123456_abc123.jpg
│   │   └── 1699234567_def456.jpg
│   └── {openid2}/
│       └── 1699345678_ghi789.jpg
├── system/            # 系统文件
│   ├── icons/
│   ├── defaults/
│   └── assets/
└── temp/              # 临时文件（定期清理）
```

## 🚀 **使用方法**

### 前端上传
```javascript
wx.cloud.uploadFile({
  cloudPath: 'avatars/user_avatar_' + Date.now() + '.jpg',
  filePath: tempFilePath,
  success: (res) => {
    console.log('上传成功:', res.fileID);
  }
});
```

### 云函数处理
```javascript
// 上传文件
const uploadResult = await cloud.uploadFile({
  cloudPath: cloudPath,
  fileContent: Buffer.from(fileBuffer)
});

// 获取下载链接
const downloadURL = await cloud.getTempFileURL({
  fileList: [fileID]
});
```

## 🔧 **最佳实践**

### 1. **文件命名规范**
- 使用时间戳 + 随机字符串
- 包含用户标识符
- 使用标准文件扩展名

### 2. **大小控制**
- 前端压缩图片
- 设置合理的尺寸限制
- 超大文件拒绝上传

### 3. **定期清理**
- 删除过期临时文件
- 清理无效引用
- 监控存储使用量

## 📊 **存储配额**

### 免费额度
- 存储空间：5GB
- 下载次数：150万次/月
- 上传次数：30万次/月

### 付费方案
- 超出免费额度后按量计费
- 详见[微信云开发定价](https://cloud.weixin.qq.com/cloudrun/pricing)

## 🚨 **注意事项**

1. **文件永久性**
   - 上传到云存储的文件是永久的
   - 删除用户时记得清理相关文件

2. **隐私保护**
   - 头像文件可被任何人访问
   - 不要存储敏感信息

3. **成本控制**
   - 监控存储使用量
   - 定期清理无用文件
   - 合理设置文件大小限制

## 🔍 **故障排查**

### 上传失败
1. 检查网络连接
2. 确认文件大小是否超限
3. 验证文件格式是否支持
4. 查看云存储是否已开启

### 显示异常
1. 检查fileID是否正确
2. 确认文件是否已删除
3. 验证访问权限设置
4. 使用临时下载链接测试 