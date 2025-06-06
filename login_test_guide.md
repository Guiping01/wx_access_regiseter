# 📱 登录功能测试指南

## 🎯 修复内容总结

### ✅ 已解决的问题：
1. **跳转错误** - 使用 `wx.switchTab()` 替代 `wx.redirectTo()`
2. **流程复杂** - 简化为：微信授权 → 获取手机号 → 直接跳转
3. **角色选择** - 移除不必要的角色选择逻辑

### ⚠️ 字体错误说明：
```
Failed to load font https://tdesign.gtimg.com/icon/0.3.2/fonts/t.woff2
```
这是 **TDesign 组件库的已知问题**，不影响功能使用，可以安全忽略。

---

## 🔧 测试步骤

### 1. 启动小程序
1. 打开微信开发者工具
2. 选择小程序项目
3. 点击编译运行

### 2. 测试微信授权登录
1. 进入登录页面
2. 点击 **"微信授权登录"** 按钮
3. 确认授权
4. 查看是否显示用户信息

**预期结果**：
- ✅ 显示用户头像和昵称
- ✅ 状态显示"已授权微信登录"
- ✅ 出现"获取手机号"按钮

### 3. 测试手机号获取（可选）
1. 点击 **"获取手机号"** 按钮
2. 确认手机号授权

**可能结果**：
- ✅ **成功**：显示手机号获取成功，自动跳转注册页
- ❌ **失败**：显示"getPhoneNumber:fail no permission"

**失败原因**：
- 测试号没有手机号获取权限
- 需要企业认证（300元）才能获取手机号

### 4. 测试游客模式
1. 点击 **"游客模式"** 按钮
2. 确认跳转

**预期结果**：
- ✅ 显示"游客模式已启用"
- ✅ 自动跳转到注册页面

---

## 🚀 部署云函数（如需手机号功能）

### 1. 在微信开发者工具中
1. 右键点击 `cloudfunctions/getPhoneNumber`
2. 选择 **"上传并部署"**
3. 等待部署完成

### 2. 配置权限
1. 进入微信小程序管理后台
2. 开发管理 → 开发设置
3. 确认已开通云开发

---

## 🎮 测试场景

### 场景1：正常授权流程
```
进入登录页 → 微信授权 → 获取手机号 → 跳转注册页
```

### 场景2：仅微信授权
```
进入登录页 → 微信授权 → 手动跳转注册页
```

### 场景3：游客模式
```
进入登录页 → 游客模式 → 跳转注册页
```

### 场景4：拒绝授权
```
进入登录页 → 微信授权 → 拒绝 → 显示提示信息
```

---

## 🔍 调试信息

### 控制台日志关键词：
- `=== 微信授权登录 ===`
- `用户信息获取成功:`
- `=== 获取手机号 ===`
- `手机号获取成功:`
- `跳转到注册页面`

### 检查存储数据：
```javascript
// 在控制台执行
console.log('用户信息:', wx.getStorageSync('userInfo'))
console.log('登录状态:', wx.getStorageSync('isLoggedIn'))
console.log('手机号:', wx.getStorageSync('phoneNumber'))
```

---

## ❌ 常见问题解决

### 1. 跳转失败
**错误**: `redirectTo:fail can not redirectTo a tabbar page`
**解决**: 已修复，使用 `wx.switchTab()` 跳转

### 2. 字体加载错误
**错误**: `Failed to load font t.woff2`
**解决**: 忽略即可，不影响功能

### 3. 手机号获取失败
**错误**: `getPhoneNumber:fail no permission`
**解决**: 
- 使用游客模式继续测试
- 或申请企业认证获取权限

### 4. 授权弹窗不出现
**问题**: 点击授权按钮无反应
**解决**: 
- 检查是否在真机上测试
- 确认微信版本支持

---

## 📊 测试检查清单

- [ ] 登录页面正常显示
- [ ] 微信授权按钮可点击
- [ ] 用户信息正确显示
- [ ] 手机号获取按钮出现（授权后）
- [ ] 游客模式正常工作
- [ ] 页面跳转无错误
- [ ] 控制台无严重错误（字体错误可忽略）
- [ ] 数据正确保存到Storage

---

## 🎯 下一步优化建议

1. **完善注册页**: 使用获取到的用户信息预填表单
2. **错误处理**: 添加更详细的错误提示
3. **用户体验**: 添加加载动画和过渡效果
4. **数据验证**: 添加手机号格式验证

---

## 💡 总结

✅ **主要问题已解决**：
- 跳转错误修复
- 流程简化完成
- 授权功能正常

⚠️ **注意事项**：
- 字体错误可以忽略
- 手机号获取需要认证
- 优先测试微信授权和游客模式

🚀 **建议**：
先测试基础功能，手机号获取功能可以后期优化。 