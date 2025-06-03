# 管理员登录功能部署指南

## 🚀 部署步骤

### 1. 创建数据库集合

在云开发控制台创建以下集合：

#### ✅ 已有集合
- `users` - 用户表
- `door_logs` - 开门记录表  
- `sms_codes` - 短信验证码表
- `login_logs` - 登录日志表

#### 🆕 需要新建的集合
- `admins` - 管理员表
- `devices` - 设备管理表
- `admin_logs` - 管理员操作日志表
- `system_config` - 系统配置表

### 2. 添加示例数据

#### admins 集合
```json
{
  "username": "admin",
  "password": "e10adc3949ba59abbe56e057f20f883e",
  "email": "admin@company.com",
  "role": "ADMIN",
  "permissions": ["dashboard", "user_management", "system_config"],
  "realName": "系统管理员",
  "phone": "13800000000",
  "status": "active",
  "lastLoginTime": "2024-05-29T10:30:00.000Z",
  "loginCount": 256,
  "createTime": "2024-01-01T00:00:00.000Z",
  "updateTime": "2024-05-29T10:30:00.000Z"
}
```

#### devices 集合
```json
{
  "deviceId": "LOCK-01",
  "deviceName": "办公楼大门",
  "deviceType": "door_lock",
  "location": "北京市朝阳区办公楼一层",
  "ipAddress": "192.168.1.100",
  "status": "online",
  "lastHeartbeat": "2024-05-29T10:25:00.000Z",
  "installDate": "2024-01-15T00:00:00.000Z",
  "maintainDate": "2024-03-15T00:00:00.000Z",
  "createTime": "2024-01-15T00:00:00.000Z",
  "updateTime": "2024-05-29T10:25:00.000Z"
}
```

#### admin_logs 集合
```json
{
  "adminId": "64a1b2c3d4e5f67890123456",
  "adminName": "admin",
  "action": "view_dashboard",
  "description": "查看数据大屏",
  "targetType": "dashboard",
  "targetId": null,
  "ipAddress": "192.168.1.10",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  "result": "success",
  "createTime": "2024-05-29T10:30:00.000Z"
}
```

#### system_config 集合
```json
{
  "configKey": "sms_frequency_limit",
  "configValue": "60",
  "configType": "number",
  "description": "短信发送频率限制(秒)",
  "category": "sms",
  "isEditable": true,
  "createTime": "2024-01-01T00:00:00.000Z",
  "updateTime": "2024-05-29T10:30:00.000Z"
}
```

### 3. 部署云函数

在微信开发者工具中：

1. 右键 `cloudfunctions/adminLogin` → **上传并部署**
2. 右键 `cloudfunctions/getDashboardData` → **上传并部署**
3. 验证部署成功

### 4. 权限配置

所有集合权限设置为：**仅创建者可读写**

### 5. 测试管理员登录

**默认管理员账户：**
- **用户名**: `admin`
- **密码**: `123456`

**测试步骤：**
1. 进入管理员登录页面
2. 输入用户名：`admin`
3. 输入密码：`123456`
4. 点击登录
5. 验证是否跳转到数据大屏

## ✨ 功能特性

### 🔐 真实认证
- 密码MD5加密存储
- Token生成和验证
- 权限检查

### 📊 管理员信息显示
- 导航栏显示管理员姓名
- 个性化退出确认

### 🛡️ 安全机制
- 登录失败记录
- 权限验证
- 自动跳转登录页

### 🔄 状态管理
- 本地存储管理员信息
- 登录状态持久化
- 安全退出清理

## 🐛 故障排除

### 登录失败
1. 检查云函数是否部署成功
2. 验证admins集合是否创建
3. 确认用户名密码正确

### 权限错误
1. 检查permissions字段包含'dashboard'
2. 验证管理员状态为'active'
3. 确认adminInfo存储正确

### 云函数错误
1. 查看云函数日志
2. 检查数据库连接
3. 验证集合权限配置 