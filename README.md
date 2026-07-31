# AI问答助手 - 虚拟人物问答工具

一个基于Node.js的虚拟人物AI问答助手，支持语音交互、心理测评和后台管理。

## 功能特性

1. **数字人形象动画** - 使用GIF图片展示待机动画和说话动画
2. **智能聊天** - 用户与AI助手进行对话
3. **语音输入** - 使用麦克风进行语音输入
4. **语音播报** - AI回复支持语音播报
5. **心理测评** - 内置抑郁和焦虑自评量表
6. **异常检测** - 自动检测危险关键词并告警
7. **后台管理** - 管理对话记录、异常记录、关键词库和测评题库
8. **数据持久化** - 所有数据保存到本地

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 放置数字人GIF图片

将您的数字人形象GIF图片放到 `public/assets/` 目录下：
- `idle.gif` - 待机动画
- `speaking.gif` - 说话动画

### 3. 启动服务器

```bash
npm start
```

### 4. 访问应用

- 主页：http://localhost:3000
- 后台管理：http://localhost:3000/admin.html

## 项目结构

```
├── server.js          # 后端服务器
├── package.json       # 项目配置
├── data/              # 数据存储目录
│   ├── conversations.json    # 对话记录
│   ├── abnormal.json         # 异常记录
│   ├── danger_keywords.json  # 危险关键词库
│   └── questionnaires.json   # 测评题库
└── public/            # 前端静态文件
    ├── index.html     # 主页面
    ├── admin.html     # 后台管理页面
    ├── css/
    │   ├── style.css  # 主页面样式
    │   └── admin.css  # 后台管理样式
    ├── js/
    │   ├── app.js     # 主页面逻辑
    │   └── admin.js   # 后台管理逻辑
    └── assets/        # 图片资源
        ├── idle.gif   # 待机动画（需自行放置）
        └── speaking.gif # 说话动画（需自行放置）
```

## API接口

### 聊天相关
- `POST /api/chat` - 发送消息获取AI回答
- `GET /api/conversations` - 获取对话历史
- `DELETE /api/conversations/:id` - 删除对话记录

### 异常检测
- `GET /api/abnormal` - 获取异常记录
- `PUT /api/abnormal/:id/resolve` - 标记异常为已处理

### 关键词管理
- `GET /api/danger-keywords` - 获取危险关键词库
- `POST /api/danger-keywords` - 更新关键词库

### 测评相关
- `GET /api/questionnaires` - 获取测评题库
- `POST /api/questionnaires` - 更新题库
- `POST /api/assessment` - 提交测评答案

### 数据管理
- `POST /api/cleanup` - 清理旧数据

## 技术栈

- **后端**: Node.js + Express
- **前端**: 原生HTML/CSS/JavaScript
- **语音**: Web Speech API
- **存储**: JSON文件

## 注意事项

1. 语音功能需要使用Chrome或Edge浏览器
2. 首次使用需要允许麦克风权限
3. 建议使用HTTPS部署以确保语音功能正常工作
