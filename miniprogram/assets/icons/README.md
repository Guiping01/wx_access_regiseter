# 图标资源

这个目录包含了访客门禁系统的TabBar图标资源。

## 图标列表

### 1. me.png
- **用途**: "我的"页面普通状态图标
- **格式**: PNG
- **使用场景**: TabBar普通状态

### 2. me-active.png  
- **用途**: "我的"页面激活状态图标
- **格式**: PNG
- **使用场景**: TabBar激活状态

### 3. login.png
- **用途**: 登记页面普通状态图标
- **格式**: PNG
- **使用场景**: TabBar普通状态

### 4. login-active.png
- **用途**: 登记页面激活状态图标
- **格式**: PNG
- **使用场景**: TabBar激活状态

## 使用方法

在app.json中配置TabBar图标：

```json
{
  "tabBar": {
    "color": "#7A7E83",
    "selectedColor": "#0052d9",
    "borderStyle": "black",
    "backgroundColor": "#ffffff",
    "list": [
      {
        "pagePath": "pages/register/index",
        "text": "登记",
        "iconPath": "assets/icons/login.png",
        "selectedIconPath": "assets/icons/login-active.png"
      },
      {
        "pagePath": "pages/me/index", 
        "text": "我的",
        "iconPath": "assets/icons/me.png",
        "selectedIconPath": "assets/icons/me-active.png"
      }
    ]
  }
}
```

在页面中使用：

```html
<!-- 在WXML中使用 -->
<image src="/assets/icons/me.png" class="icon" />
```

```css
/* 在WXSS中定义样式 */
.icon {
  width: 48rpx;
  height: 48rpx;
}
```

## 设计规范

- **格式**: PNG图片格式
- **建议尺寸**: 48x48px (适配各种屏幕密度)
- **用途**: 主要用于TabBar导航图标
- **命名规范**: 
  - 普通状态: `功能名.png`
  - 激活状态: `功能名-active.png`
