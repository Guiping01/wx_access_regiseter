# 云开发数据库配置

## 需要创建的集合

### 1. users (用户表)
```json
{
  "_id": "自动生成",
  "openid": "微信用户唯一标识",
  "name": "用户姓名",
  "gender": "male/female",
  "age": 25,
  "phone": "手机号",
  "avatarUrl": "头像URL",
  "isWxPhone": true/false,
  "status": "active/inactive",
  "registerTime": "注册时间",
  "lastLoginTime": "最后登录时间",
  "createBy": "创建者openid",
  "updateBy": "更新者openid", 
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

### 2. sms_codes (短信验证码表)
```json
{
  "_id": "自动生成",
  "phone": "手机号",
  "code": "验证码",
  "used": false,
  "createTime": "创建时间",
  "expireTime": "过期时间",
  "usedTime": "使用时间",
  "createBy": "创建者openid"
}
```

### 3. login_logs (登录日志表)
```json
{
  "_id": "自动生成",
  "userId": "用户ID",
  "openid": "用户openid",
  "phone": "手机号",
  "loginTime": "登录时间",
  "loginType": "phone/wechat",
  "deviceInfo": {
    "model": "设备型号",
    "system": "系统版本"
  },
  "createTime": "创建时间"
}
```

### 4. door_logs (开门记录表)
```json
{
  "_id": "自动生成",
  "userId": "用户ID",
  "deviceId": "设备ID",
  "deviceName": "设备名称",
  "result": "success/failed",
  "latency": 380,
  "location": "位置信息",
  "createTime": "创建时间"
}
```

## 数据库索引建议

### users 集合
- phone: 唯一索引
- openid: 普通索引
- status: 普通索引

### sms_codes 集合
- phone + createTime: 复合索引
- phone + code + used: 复合索引

### login_logs 集合
- userId + loginTime: 复合索引

### door_logs 集合
- userId + createTime: 复合索引
- deviceId + createTime: 复合索引

## 权限配置

### 读权限
- users: 仅创建者可读
- sms_codes: 仅创建者可读
- login_logs: 仅创建者可读
- door_logs: 仅创建者可读

### 写权限
- users: 仅云函数可写
- sms_codes: 仅云函数可写
- login_logs: 仅云函数可写
- door_logs: 仅云函数可写

## 部署步骤

1. 在微信开发者工具中打开云开发控制台
2. 创建上述4个集合
3. 配置相应的索引
4. 设置权限：所有集合设为"仅创建者可读写"
5. 上传云函数并部署 