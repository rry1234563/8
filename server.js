const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const aiService = require('./services/ai-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Session配置
app.use(session({
  secret: 'ai-qa-assistant-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 数据存储路径
const DATA_DIR = path.join(__dirname, 'data');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const ABnormal_FILE = path.join(DATA_DIR, 'abnormal.json');
const DANGER_KEYWORDS_FILE = path.join(DATA_DIR, 'danger_keywords.json');
const QUESTIONNAIRES_FILE = path.join(DATA_DIR, 'questionnaires.json');
const PRESET_QA_FILE = path.join(DATA_DIR, 'preset_qa.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ASSESSMENTS_FILE = path.join(DATA_DIR, 'assessments.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化数据文件
function initDataFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

initDataFile(CONVERSATIONS_FILE, []);
initDataFile(ABnormal_FILE, []);
initDataFile(ASSESSMENTS_FILE, []);
initDataFile(DANGER_KEYWORDS_FILE, ['自杀', '自残', '轻生', '想死', '活不下去', '没意思', '绝望']);
initDataFile(PRESET_QA_FILE, [
  {
    id: '1',
    question: '你好',
    keywords: ['你好', '您好', 'hi', 'hello'],
    answer: '你好！很高兴见到你，有什么我可以帮助你的吗？',
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    question: '你是谁',
    keywords: ['你是谁', '你是'],
    answer: '我是AI心理助手，可以陪你聊天、回答你的问题，还能帮你做心理测评。',
    enabled: true,
    createdAt: new Date().toISOString()
  }
]);

// 初始化用户数据文件
const defaultUsers = [
  {
    id: 'admin-001',
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-001',
    username: '12345678900000',
    password: bcrypt.hashSync('000000', 10),
    role: 'user',
    createdAt: new Date().toISOString()
  }
];
initDataFile(USERS_FILE, defaultUsers);

initDataFile(QUESTIONNAIRES_FILE, {
  depression: {
    name: '抑郁自评量表 (PHQ-9)',
    questions: [
      { id: 1, text: '做事时提不起劲或没有兴趣', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 2, text: '感到心情低落、沮丧或绝望', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 3, text: '入睡困难、睡不安稳或睡眠过多', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 4, text: '感觉疲倦或没有活力', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 5, text: '食欲不振或吃太多', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 6, text: '觉得自己很糟或让家人失望', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 7, text: '注意力难以集中', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 8, text: '动作或说话迟缓或烦躁', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 9, text: '有不如死掉或伤害自己的念头', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] }
    ],
    scores: [0, 1, 2, 3],
    levels: [
      { max: 4, level: '良好', suggestion: '保持良好的心理状态，继续关注自己的情绪变化。' },
      { max: 9, level: '轻度', suggestion: '有轻度抑郁倾向，建议适当运动、保持社交、关注积极事物。' },
      { max: 14, level: '中度', suggestion: '中度抑郁症状，建议寻求专业心理咨询师的帮助。' },
      { max: 27, level: '重度', suggestion: '重度抑郁症状，强烈建议立即寻求专业医疗帮助！' }
    ]
  },
  anxiety: {
    name: '焦虑自评量表 (GAD-7)',
    questions: [
      { id: 1, text: '感觉紧张、焦虑或烦躁', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 2, text: '不能停止或控制担忧', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 3, text: '对各种事情过度担忧', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 4, text: '难以放松', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 5, text: '坐立不安', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 6, text: '容易烦恼或易怒', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] },
      { id: 7, text: '害怕有可怕的事情发生', options: ['完全没有', '几天', '一半以上时间', '几乎每天'] }
    ],
    scores: [0, 1, 2, 3],
    levels: [
      { max: 4, level: '良好', suggestion: '焦虑水平正常，继续保持良好的心理状态。' },
      { max: 9, level: '轻度', suggestion: '轻度焦虑，建议进行深呼吸练习、规律运动。' },
      { max: 14, level: '中度', suggestion: '中度焦虑，建议寻求心理咨询师的帮助。' },
      { max: 21, level: '重度', suggestion: '重度焦虑，强烈建议立即寻求专业医疗帮助！' }
    ]
  }
});

// 读取数据文件
function readData(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

// 写入数据文件
function writeData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// 检测危险关键词
function detectDangerKeywords(text) {
  const keywords = readData(DANGER_KEYWORDS_FILE);
  const found = keywords.filter(kw => text.includes(kw));
  return found;
}

// 匹配预设问答
function matchPresetQA(question) {
  const q = question.toLowerCase();
  const presetQA = readData(PRESET_QA_FILE);
  
  // 只匹配启用的预设问答
  const enabledQA = presetQA.filter(qa => qa.enabled);
  
  // 优先精确匹配问题
  for (const qa of enabledQA) {
    if (q === qa.question.toLowerCase()) {
      return qa.answer;
    }
  }
  
  // 然后匹配关键词
  for (const qa of enabledQA) {
    if (qa.keywords && qa.keywords.length > 0) {
      for (const keyword of qa.keywords) {
        if (q.includes(keyword.toLowerCase())) {
          return qa.answer;
        }
      }
    }
  }
  
  return null;
}

// AI回答生成
async function generateAIAnswer(question, sessionId = 'default') {
  const q = question.toLowerCase();
  
  // 1. 优先匹配预设问答（本地配置的固定问答）
  const presetAnswer = matchPresetQA(question);
  if (presetAnswer) {
    return {
      answer: presetAnswer,
      source: 'preset'  // 标记来源为预设问答
    };
  }
  
  // 2. 尝试调用外部 AI API
  try {
    const serviceInfo = aiService.getServiceInfo();
    if (serviceInfo.apiConfigured) {
      const aiAnswer = await aiService.getAIAnswer(question, sessionId);
      return {
        answer: aiAnswer,
        source: 'ai'  // 标记来源为 AI 服务
      };
    }
  } catch (error) {
    console.warn('AI服务调用失败，使用本地回答作为备用:', error.message);
  }
  
  // 3. 关键词库（本地备用方案）
  const knowledgeBase = [
    { keywords: ['你好', '您好', 'hi', 'hello'], response: '你好！很高兴见到你，有什么我可以帮助你的吗？' },
    { keywords: ['你是谁', '你是'], response: '我是AI心理助手，可以陪你聊天、回答你的问题，还能帮你做心理测评。' },
    { keywords: ['谢谢', '感谢', '多谢'], response: '不客气！很高兴能帮到你。如果还有其他问题，随时可以问我。' },
    { keywords: ['再见', '拜拜', 'bye'], response: '再见！希望你今天有个好心情，有需要随时回来找我。' },
    { keywords: ['心情不好', '心情差', '不开心', '难过', '伤心'], response: '听到你心情不好，我很关心。能告诉我发生什么事了吗？说出来可能会好受一些。' },
    { keywords: ['压力大', '压力很大', '有压力', '工作累', '很累', '疲惫'], response: '工作学习压力大确实会让人感到很疲惫。建议你试试深呼吸、适当运动，或者和朋友聊聊天。如果压力持续存在，建议寻求专业心理咨询师的帮助。' },
    { keywords: ['失眠', '睡不着', '睡眠不好'], response: '失眠是很常见的问题。建议保持规律的作息时间，睡前避免使用电子设备，卧室保持安静舒适。可以试试睡前听轻音乐或做放松练习。如果持续失眠，建议咨询医生。' },
    { keywords: ['焦虑', '紧张', '担心', '害怕'], response: '焦虑是正常的情绪反应。试试4-7-8呼吸法：吸气4秒，屏息7秒，呼气8秒。这有助于缓解焦虑。也可以试试渐进性肌肉放松法。' },
    { keywords: ['抑郁', '情绪低落', '没兴趣', '没精神'], response: '如果你感到持续的低落、失去兴趣等症状，建议你寻求专业心理咨询师的帮助。你值得被关心和帮助。现在有很多有效的治疗方法，不要犹豫寻求帮助。' },
    { keywords: ['孤独', '一个人', '没人陪'], response: '感到孤独是很正常的情绪。试着主动联系朋友、参加社交活动，或者培养一些兴趣爱好。记住，我也在这里陪你。' },
    { keywords: ['学习', '考试', '成绩'], response: '学习是成长的重要部分。建议制定合理的学习计划，劳逸结合，适当休息。找到适合自己的学习方法很重要。' },
    { keywords: ['工作', '上班', '职场'], response: '工作是生活的一部分，但不是全部。注意工作与生活的平衡，适当休息和放松。如果工作压力影响了健康，考虑调整或寻求帮助。' },
    { keywords: ['家庭', '家人', '父母'], response: '家庭是重要的支持系统。与家人保持良好的沟通，相互理解和尊重。如果有家庭矛盾，可以尝试沟通或寻求家庭咨询。' },
    { keywords: ['朋友', '友情'], response: '友谊是珍贵的。真诚对待朋友，保持联系，相互支持。真正的朋友会在你需要的时候陪伴你。' },
    { keywords: ['感情', '恋爱', '分手', '男朋友', '女朋友'], response: '感情问题是人生中重要的课题。无论是恋爱中的甜蜜还是分手的痛苦，都是成长的一部分。给自己时间疗伤，学会爱自己。' },
    { keywords: ['自卑', '不自信', '没信心'], response: '每个人都有自己的闪光点。试着关注自己的优点和成就，而不是只看到不足。建立自信需要时间和练习，从小事开始，逐步建立信心。' },
    { keywords: ['放松', '减压', '解压'], response: '有很多放松的方法：1) 深呼吸练习 2) 运动如散步、瑜伽 3) 听音乐 4) 冥想 5) 和朋友聊天。找到适合你的方法，定期 practice。' },
    { keywords: ['自杀', '自残', '轻生', '想死', '活不下去'], response: '我非常担心你的安全。请记住，你不是一个人，有很多人愿意帮助你。请立即拨打心理援助热线：400-161-9995，或120（紧急情况）。你的生命非常宝贵！' }
  ];
  
  // 精确匹配（长关键词优先）
  for (const item of knowledgeBase) {
    for (const keyword of item.keywords) {
      if (q.includes(keyword)) {
        return {
          answer: item.response,
          source: 'local'  // 标记来源为本地关键词
        };
      }
    }
  }
  
  // 4. 通用回答（本地兜底）
  const genericResponses = [
    `关于"${question}"这个问题，我可以告诉你：这是一个很有意思的话题。你想了解哪方面的内容呢？`,
    `我理解你想了解关于"${question}"的信息。能详细说说你的具体情况吗？这样我能给出更有针对性的建议。`,
    `这是一个很好的问题。关于"${question}"，我建议你可以从以下几个方面思考：1) 了解相关知识 2) 结合自身情况 3) 寻求专业帮助。你觉得呢？`,
    `听到你问"${question}"，我想告诉你：每个人都会遇到类似的困惑。重要的是保持积极的心态，一步一步来解决。`,
    `关于"${question}"，这可能涉及多个方面。你可以告诉我更多细节，我会尽力帮助你。`
  ];
  
  return {
    answer: genericResponses[Math.floor(Math.random() * genericResponses.length)],
    source: 'local'  // 标记来源为本地兜底
  };
}

// ========== 认证中间件 ==========

// 验证登录状态
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: '请先登录' });
  }
}

// 验证管理员权限
function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: '需要管理员权限' });
  }
}

// ========== 认证API ==========

// 获取当前登录用户信息
app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.userId) {
    const users = readData(USERS_FILE);
    const user = users.find(u => u.id === req.session.userId);
    if (user) {
      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } else {
      res.status(404).json({ error: '用户不存在' });
    }
  } else {
    res.json({ success: false });
  }
});

// 用户登录
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '账号和密码不能为空' });
    }
    
    const users = readData(USERS_FILE);
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({ error: '账号或密码错误' });
    }
    
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '账号或密码错误' });
    }
    
    // 保存session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 用户登出
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '登出失败' });
    }
    res.json({ success: true });
  });
});

// 修改密码
app.put('/api/auth/password', requireAuth, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少6位' });
    }
    
    const users = readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === req.session.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const user = users[userIndex];
    const isValid = bcrypt.compareSync(oldPassword, user.password);
    
    if (!isValid) {
      return res.status(401).json({ error: '旧密码错误' });
    }
    
    // 更新密码
    users[userIndex].password = bcrypt.hashSync(newPassword, 10);
    writeData(USERS_FILE, users);
    
    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 用户管理API (管理员) ==========

// 获取用户列表
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const users = readData(USERS_FILE);
    // 返回用户列表（不返回密码）
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt
    }));
    res.json({ success: true, data: safeUsers });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 添加用户
app.post('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const { username, role } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: '账号不能为空' });
    }
    
    const users = readData(USERS_FILE);
    
    // 检查账号是否已存在
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: '账号已存在' });
    }
    
    // 默认密码为账号后6位
    let defaultPassword = username.slice(-6);
    if (!defaultPassword) {
      defaultPassword = '123456';
    }
    
    const newUser = {
      id: uuidv4(),
      username: username,
      password: bcrypt.hashSync(defaultPassword, 10),
      role: role || 'user',
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeData(USERS_FILE, users);
    
    res.json({
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        defaultPassword: defaultPassword
      }
    });
  } catch (error) {
    console.error('添加用户错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 重置用户密码
app.put('/api/admin/users/:id/reset-password', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    const users = readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    let passwordToSet = newPassword;
    if (!passwordToSet) {
      // 默认重置为账号后6位
      passwordToSet = users[userIndex].username.slice(-6) || '123456';
    }
    
    users[userIndex].password = bcrypt.hashSync(passwordToSet, 10);
    writeData(USERS_FILE, users);
    
    res.json({ success: true, message: '密码重置成功', newPassword: passwordToSet });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除用户
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const users = readData(USERS_FILE);
    
    // 不允许删除自己
    if (id === req.session.userId) {
      return res.status(400).json({ error: '不能删除自己的账号' });
    }
    
    // 不允许删除admin账号
    const user = users.find(u => u.id === id);
    if (user && user.username === 'admin') {
      return res.status(400).json({ error: '不能删除admin账号' });
    }
    
    const filtered = users.filter(u => u.id !== id);
    writeData(USERS_FILE, filtered);
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新用户角色
app.put('/api/admin/users/:id/role', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: '无效的角色' });
    }
    
    const users = readData(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    users[userIndex].role = role;
    writeData(USERS_FILE, users);
    
    res.json({ success: true, data: users[userIndex] });
  } catch (error) {
    console.error('更新角色错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== API路由（需要认证） ==========

// 1. 发送消息并获取AI回答
app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: '消息不能为空' });
    }
    
    const userAccount = req.session.username;
    
    const userMessage = {
      id: uuidv4(),
      type: 'user',
      content: message,
      userAccount: userAccount,
      timestamp: new Date().toISOString()
    };
    
    // 检测危险关键词
    const dangerKeywords = detectDangerKeywords(message);
    let dangerAlert = null;
    
    if (dangerKeywords.length > 0) {
      const abnormalRecord = {
        id: uuidv4(),
        userAccount: userAccount,
        message: message,
        keywords: dangerKeywords,
        timestamp: new Date().toISOString(),
        resolved: false
      };
      
      const abnormalList = readData(ABnormal_FILE);
      abnormalList.push(abnormalRecord);
      writeData(ABnormal_FILE, abnormalList);
      
      dangerAlert = {
        detected: true,
        keywords: dangerKeywords,
        message: '检测到可能的危险信号，已记录到异常列表。请关注该用户的情况。'
      };
    }
    
    // 生成AI回答（传递会话ID用于上下文管理）
    const sessionId = req.session.userId || 'anonymous';
    const aiResult = await generateAIAnswer(message, sessionId);
    const aiResponse = aiResult.answer;
    const aiSource = aiResult.source;
    
    const aiMessage = {
      id: uuidv4(),
      type: 'ai',
      content: aiResponse,
      source: aiSource,  // 记录回答来源：preset/ai/local
      userAccount: userAccount,
      timestamp: new Date().toISOString()
    };
    
    // 保存对话记录
    const conversations = readData(CONVERSATIONS_FILE);
    conversations.push(userMessage, aiMessage);
    writeData(CONVERSATIONS_FILE, conversations);
    
    res.json({
      success: true,
      data: {
        userMessage,
        aiMessage,
        dangerAlert,
        aiSource  // 返回给前端，可用于显示回答来源
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 2. 获取对话历史（管理员可查看所有，普通用户只能看自己的）
app.get('/api/conversations', requireAuth, (req, res) => {
  try {
    const conversations = readData(CONVERSATIONS_FILE);
    if (req.session.role === 'admin') {
      res.json({ success: true, data: conversations });
    } else {
      const userConversations = conversations.filter(c => c.userAccount === req.session.username);
      res.json({ success: true, data: userConversations });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 3. 获取异常记录（需要管理员权限）
app.get('/api/abnormal', requireAuth, requireAdmin, (req, res) => {
  try {
    const abnormalList = readData(ABnormal_FILE);
    res.json({ success: true, data: abnormalList });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 4. 获取/更新危险关键词库（需要管理员权限修改）
app.get('/api/danger-keywords', requireAuth, (req, res) => {
  try {
    const keywords = readData(DANGER_KEYWORDS_FILE);
    res.json({ success: true, data: keywords });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/danger-keywords', requireAuth, requireAdmin, (req, res) => {
  try {
    const { keywords } = req.body;
    writeData(DANGER_KEYWORDS_FILE, keywords);
    res.json({ success: true, message: '关键词库已更新' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 5. 获取/更新心理测评题库（管理员可更新）
app.get('/api/questionnaires', requireAuth, (req, res) => {
  try {
    const questionnaires = readData(QUESTIONNAIRES_FILE);
    res.json({ success: true, data: questionnaires });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/questionnaires', requireAuth, requireAdmin, (req, res) => {
  try {
    const { questionnaires } = req.body;
    writeData(QUESTIONNAIRES_FILE, questionnaires);
    res.json({ success: true, message: '题库已更新' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 6. 提交测评答案
app.post('/api/assessment', requireAuth, (req, res) => {
  try {
    const { type, answers } = req.body;
    const questionnaires = readData(QUESTIONNAIRES_FILE);
    const questionnaire = questionnaires[type];
    
    if (!questionnaire) {
      return res.status(400).json({ error: '无效的测评类型' });
    }
    
    // 计算总分
    let totalScore = 0;
    questionnaire.questions.forEach((q, index) => {
      const answerIndex = answers[index];
      if (answerIndex !== undefined && answerIndex !== null) {
        totalScore += questionnaire.scores[answerIndex];
      }
    });
    
    // 确定等级
    let level = questionnaire.levels[0];
    for (const l of questionnaire.levels) {
      if (totalScore <= l.max) {
        level = l;
        break;
      }
    }
    
    // 保存测评记录
    const assessmentRecord = {
      id: uuidv4(),
      userAccount: req.session.username,
      type: type,
      typeName: questionnaire.name,
      answers: answers,
      score: totalScore,
      level: level.level,
      suggestion: level.suggestion,
      timestamp: new Date().toISOString()
    };
    
    const assessments = readData(ASSESSMENTS_FILE);
    assessments.push(assessmentRecord);
    writeData(ASSESSMENTS_FILE, assessments);
    
    res.json({
      success: true,
      data: {
        score: totalScore,
        level: level.level,
        suggestion: level.suggestion
      }
    });
  } catch (error) {
    console.error('Assessment error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取测评记录
app.get('/api/assessments', requireAuth, (req, res) => {
  try {
    const assessments = readData(ASSESSMENTS_FILE);
    if (req.session.role === 'admin') {
      res.json({ success: true, data: assessments });
    } else {
      const userAssessments = assessments.filter(a => a.userAccount === req.session.username);
      res.json({ success: true, data: userAssessments });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 7. 清理旧数据（需要管理员权限）
app.post('/api/cleanup', requireAuth, requireAdmin, (req, res) => {
  try {
    const conversations = readData(CONVERSATIONS_FILE);
    const trimmed = conversations.slice(-1000);
    writeData(CONVERSATIONS_FILE, trimmed);
    res.json({ success: true, message: '数据清理完成' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 8. 标记异常记录为已处理（需要管理员权限）
app.put('/api/abnormal/:id/resolve', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const abnormalList = readData(ABnormal_FILE);
    const record = abnormalList.find(r => r.id === id);
    if (record) {
      record.resolved = true;
      writeData(ABnormal_FILE, abnormalList);
      res.json({ success: true, message: '已标记为已处理' });
    } else {
      res.status(404).json({ error: '记录不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 9. 删除对话记录（需要管理员权限）
app.delete('/api/conversations/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const conversations = readData(CONVERSATIONS_FILE);
    const filtered = conversations.filter(c => c.id !== id);
    writeData(CONVERSATIONS_FILE, filtered);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 10. 预设问答管理API（需要管理员权限修改）
// 获取所有预设问答
app.get('/api/preset-qa', requireAuth, (req, res) => {
  try {
    const presetQA = readData(PRESET_QA_FILE);
    res.json({ success: true, data: presetQA });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 添加预设问答
app.post('/api/preset-qa', requireAuth, requireAdmin, (req, res) => {
  try {
    const { question, keywords, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: '问题和回答不能为空' });
    }
    
    const presetQA = readData(PRESET_QA_FILE);
    const newItem = {
      id: uuidv4(),
      question: question,
      keywords: keywords || [question],
      answer: answer,
      enabled: true,
      createdAt: new Date().toISOString()
    };
    
    presetQA.push(newItem);
    writeData(PRESET_QA_FILE, presetQA);
    res.json({ success: true, data: newItem });
  } catch (error) {
    console.error('添加预设问答失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新预设问答
app.put('/api/preset-qa/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { question, keywords, answer, enabled } = req.body;
    const presetQA = readData(PRESET_QA_FILE);
    const item = presetQA.find(q => q.id === id);
    
    if (!item) {
      return res.status(404).json({ error: '记录不存在' });
    }
    
    if (question !== undefined) item.question = question;
    if (keywords !== undefined) item.keywords = keywords;
    if (answer !== undefined) item.answer = answer;
    if (enabled !== undefined) item.enabled = enabled;
    item.updatedAt = new Date().toISOString();
    
    writeData(PRESET_QA_FILE, presetQA);
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('更新预设问答失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除预设问答
app.delete('/api/preset-qa/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const presetQA = readData(PRESET_QA_FILE);
    const filtered = presetQA.filter(q => q.id !== id);
    writeData(PRESET_QA_FILE, filtered);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 页面路由保护 ==========

// 登录页面（不需要认证）
app.get('/login.html', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/index.html');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

// 主页面（需要认证）
app.get('/index.html', (req, res) => {
  if (req.session && req.session.userId) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.redirect('/login.html');
  }
});

// 后台管理页面（需要管理员权限）
app.get('/admin.html', (req, res) => {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } else if (req.session && req.session.userId) {
    res.status(403).send('您没有权限访问后台管理页面');
  } else {
    res.redirect('/login.html');
  }
});

// ========== AI服务管理API ==========

// 获取当前AI服务信息
app.get('/api/ai/service-info', requireAuth, (req, res) => {
  try {
    const info = aiService.getServiceInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ error: '获取服务信息失败' });
  }
});

// 测试AI服务连接
app.post('/api/ai/test-connection', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await aiService.testConnection();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: '测试连接失败' });
  }
});

// 切换AI服务（管理员）
app.post('/api/ai/switch-service', requireAuth, requireAdmin, (req, res) => {
  try {
    const { service } = req.body;
    const validServices = ['aliyun', 'tencent', 'baidu', 'qianfan', 'custom'];
    
    if (!validServices.includes(service)) {
      return res.status(400).json({ error: `无效的服务类型，可选: ${validServices.join(', ')}` });
    }
    
    // 更新配置
    const aiConfig = require('./config/ai-config');
    aiConfig.ENABLED_SERVICE = service;
    
    // 清除对话历史（切换服务后重新开始）
    aiService.clearHistory('default');
    
    res.json({ 
      success: true, 
      message: `已切换到 ${aiConfig.services[service].name}`,
      data: aiService.getServiceInfo()
    });
  } catch (error) {
    res.status(500).json({ error: '切换服务失败' });
  }
});

// 清除对话历史
app.post('/api/ai/clear-history', requireAuth, (req, res) => {
  try {
    const sessionId = req.session.userId || 'anonymous';
    aiService.clearHistory(sessionId);
    aiService.clearHistory('default');
    res.json({ success: true, message: '对话历史已清除' });
  } catch (error) {
    res.status(500).json({ error: '清除历史失败' });
  }
});

app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/index.html');
  } else {
    res.redirect('/login.html');
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`AI问答助手服务器运行在 http://localhost:${PORT}`);
  console.log(`默认管理员账号: admin / 密码: admin123`);
  console.log(`默认测试账号: 12345678900000 / 密码: 000000`);
  console.log(`AI服务配置文件: config/ai-config.js`);
  console.log(`请在 config/ai-config.js 中配置您的AI服务API Key`);
});
