# 数据库初始化说明

## 需要创建的集合

### 1. sms_codes（短信验证码）
用于存储短信验证码信息

**字段说明：**
- `phone`: 手机号
- `code`: 验证码
- `expireTime`: 过期时间
- `used`: 是否已使用
- `createTime`: 创建时间
- `openid`: 用户openid

**权限设置：**
- 读权限：仅创建者可读
- 写权限：仅创建者可写

### 2. users（用户信息）
用于存储用户登记信息

**字段说明：**
- `name`: 姓名
- `gender`: 性别
- `age`: 年龄
- `phone`: 手机号
- `isWxPhone`: 是否微信获取的手机号
- `createTime`: 创建时间
- `openid`: 用户openid
- `status`: 状态（active/inactive）

**权限设置：**
- 读权限：仅创建者可读
- 写权限：仅创建者可写

### 3. admins（管理员信息）
用于存储管理员账号信息

**字段说明：**
- `username`: 用户名
- `password`: 密码（MD5加密）
- `realName`: 真实姓名
- `email`: 邮箱
- `role`: 角色（ADMIN/SUPER_ADMIN）
- `permissions`: 权限列表
- `status`: 状态（active/inactive）
- `createTime`: 创建时间
- `lastLoginTime`: 最后登录时间
- `loginCount`: 登录次数

**权限设置：**
- 读权限：仅管理员可访问
- 写权限：仅管理员可访问

### 4. admin_logs（管理员操作日志）
用于记录管理员操作日志

**字段说明：**
- `adminId`: 管理员ID
- `adminName`: 管理员用户名
- `action`: 操作类型
- `description`: 操作描述
- `targetType`: 目标类型
- `targetId`: 目标ID
- `result`: 操作结果
- `createTime`: 创建时间

**权限设置：**
- 读权限：仅管理员可访问
- 写权限：仅管理员可访问

### 5. door_logs（开门记录）
用于存储开门日志（用于数据统计）

**字段说明：**
- `userId`: 用户ID
- `result`: 开门结果（success/failed）
- `latency`: 响应延迟（毫秒）
- `createTime`: 创建时间

**权限设置：**
- 读权限：仅管理员可访问
- 写权限：仅管理员可访问

## 创建步骤

1. 在微信开发者工具中打开云开发控制台
2. 进入数据库管理
3. 创建以上5个集合
4. 设置对应的权限
5. 初始化管理员账号（见下方）

## 初始化管理员账号

在数据库的 `admins` 集合中手动添加以下记录：

```json
{
  "username": "admin",
  "password": "e10adc3949ba59abbe56e057f20f883e",
  "realName": "系统管理员",
  "email": "admin@example.com",
  "role": "SUPER_ADMIN",
  "permissions": ["dashboard", "user_management", "admin_management"],
  "status": "active",
  "createTime": "2024-05-29T12:00:00.000Z",
  "lastLoginTime": null,
  "loginCount": 0
}
```

**注意：** 
- 密码字段是 "123456" 的MD5加密值
- 默认管理员账号：admin / 123456
- 生产环境请务必修改默认密码

## 生产环境配置

### 短信服务配置
1. 修改 `cloudfunctions/sendSMS/index.js` 中的 `isDevelopment` 为 `false`
2. 配置真实的短信服务API（如腾讯云SMS）
3. 安装对应的SDK依赖

### 安全配置
1. 修改管理员默认密码
2. 配置数据库安全规则
3. 启用云函数访问控制

## 测试数据

开发阶段可以通过小程序直接测试：
1. 填写表单信息
2. 点击发送验证码（开发模式会显示验证码）
3. 输入验证码并提交
4. 检查数据库中的数据是否正确保存
5. 使用 admin/123456 登录管理后台查看数据大屏 