// AI问答助手 - 主应用逻辑

// 配置
const API_BASE = ''; // 同源请求

// 全局状态
let isVoiceEnabled = true;
let isRecording = false;
let mediaRecorder = null;
let recognition = null;
let currentUser = null;

// DOM元素
const digitalHuman = document.getElementById('digitalHuman');
const digitalHumanFallback = document.getElementById('digitalHumanFallback');
const avatarCharacter = document.getElementById('avatarCharacter');
const avatarMouth = document.getElementById('avatarMouth');
const speakingIndicator = document.getElementById('speakingIndicator');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const voiceInputBtn = document.getElementById('voiceInputBtn');
const voiceToggle = document.getElementById('voiceToggle');
const suggestedQuestions = document.getElementById('suggestedQuestions');
const suggestTags = document.getElementById('suggestTags');
const alertModal = document.getElementById('alertModal');
const alertMessage = document.getElementById('alertMessage');
const closeAlertBtn = document.getElementById('closeAlertBtn');
const assessmentBtn = document.getElementById('assessmentBtn');
const assessmentModal = document.getElementById('assessmentModal');
const closeAssessmentBtn = document.getElementById('closeAssessmentBtn');
const voiceIndicator = document.getElementById('voiceIndicator');

// 推荐问题
const recommendedQuestions = [
    '我最近心情不好怎么办？',
    '如何缓解工作压力？',
    '失眠该怎么办？',
    '如何克服焦虑？',
    '怎样改善人际关系？',
    '有什么放松的方法？'
];

// 初始化
function init() {
    setupEventListeners();
    setupSpeechRecognition();
    loadSuggestedQuestions();
    initAuth();
}

// 初始化认证
async function initAuth() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`);
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.data;
            updateUserUI();
        } else {
            // 未登录，跳转到登录页
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('认证检查失败:', error);
        window.location.href = '/login.html';
    }
}

// 更新用户界面
function updateUserUI() {
    if (!currentUser) return;
    
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    const adminLink = document.getElementById('adminLink');
    
    // 显示用户名
    const displayName = currentUser.username.length > 10 
        ? currentUser.username.slice(0, 10) + '...' 
        : currentUser.username;
    userNameEl.textContent = displayName;
    userAvatarEl.textContent = currentUser.role === 'admin' ? '👑' : '👤';
    
    // 管理员显示后台管理链接
    if (currentUser.role === 'admin') {
        adminLink.style.display = 'inline-block';
    }
}

// 设置用户相关事件
function setupUserEventListeners() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const closePasswordBtn = document.getElementById('closePasswordBtn');
    
    // 用户菜单切换
    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.classList.toggle('show');
    });
    
    // 点击其他地方关闭菜单
    document.addEventListener('click', () => {
        userMenu.classList.remove('show');
    });
    
    // 退出登录
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
    });
    
    // 修改密码
    changePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openChangePasswordModal();
    });
    
    // 关闭修改密码弹窗
    closePasswordBtn.addEventListener('click', closeChangePasswordModal);
    
    // 修改密码表单提交
    const passwordForm = document.getElementById('changePasswordForm');
    passwordForm.addEventListener('submit', handleChangePassword);
}

// 退出登录
async function logout() {
    try {
        await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
        localStorage.removeItem('userInfo');
        window.location.href = '/login.html';
    } catch (error) {
        console.error('登出失败:', error);
        window.location.href = '/login.html';
    }
}

// 打开修改密码弹窗
function openChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'flex';
    document.getElementById('passwordError').textContent = '';
    document.getElementById('changePasswordForm').reset();
    document.getElementById('userMenu').classList.remove('show');
}

// 关闭修改密码弹窗
function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
}

// 处理修改密码
async function handleChangePassword(e) {
    e.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorEl = document.getElementById('passwordError');
    
    // 验证
    if (newPassword !== confirmPassword) {
        errorEl.textContent = '两次输入的新密码不一致';
        return;
    }
    
    if (newPassword.length < 6) {
        errorEl.textContent = '新密码至少6位';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('密码修改成功！');
            closeChangePasswordModal();
        } else {
            errorEl.textContent = result.error || '修改失败';
        }
    } catch (error) {
        console.error('修改密码错误:', error);
        errorEl.textContent = '网络错误，请重试';
    }
}

// 显示提示消息
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// 设置事件监听
function setupEventListeners() {
    // 发送按钮
    sendBtn.addEventListener('click', sendMessage);
    
    // 回车发送
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // 语音开关
    voiceToggle.addEventListener('change', (e) => {
        isVoiceEnabled = e.target.checked;
    });
    
    // 语音输入按钮
    voiceInputBtn.addEventListener('click', toggleVoiceInput);
    
    // 关闭告警弹窗
    closeAlertBtn.addEventListener('click', () => {
        alertModal.style.display = 'none';
    });
    
    // 测评按钮
    assessmentBtn.addEventListener('click', openAssessment);
    closeAssessmentBtn.addEventListener('click', closeAssessment);
    
    // 用户相关事件
    setupUserEventListeners();
}

// 加载推荐问题
function loadSuggestedQuestions() {
    suggestTags.innerHTML = '';
    const shuffled = recommendedQuestions.sort(() => 0.5 - Math.random()).slice(0, 4);
    shuffled.forEach(question => {
        const tag = document.createElement('div');
        tag.className = 'suggest-tag';
        tag.textContent = question;
        tag.addEventListener('click', () => {
            messageInput.value = question;
            sendMessage();
        });
        suggestTags.appendChild(tag);
    });
}

// 发送消息
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // 添加用户消息到界面
    addMessage('user', message);
    messageInput.value = '';
    
    // 显示AI思考中
    const thinkingMessage = addThinkingMessage();
    
    try {
        // 发送到服务器
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        // 处理认证错误
        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }
        
        const result = await response.json();
        
        // 移除思考中消息
        thinkingMessage.remove();
        
        if (result.success) {
            // 添加AI回复
            addMessage('ai', result.data.aiMessage.content);
            
            // 切换数字人为说话状态
            setDigitalHumanSpeaking(true);
            
            // 语音播报
            if (isVoiceEnabled) {
                speak(result.data.aiMessage.content);
            }
            
            // 检查危险信号
            if (result.data.dangerAlert && result.data.dangerAlert.detected) {
                showAlert(result.data.dangerAlert.keywords);
            }
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        thinkingMessage.remove();
        addMessage('ai', '抱歉，服务器出现了问题，请稍后再试。');
    }
}

// 添加消息到界面
function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = type === 'user' ? '👤' : '🤖';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

// 添加思考中消息
function addThinkingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.id = 'thinking-message';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = '<span style="display:inline-block;">思考中</span><span class="typing-dots"></span>';
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

// 设置数字人说话状态
function setDigitalHumanSpeaking(speaking) {
    const usingFallback = digitalHumanFallback.style.display === 'flex';
    
    if (usingFallback) {
        // 使用后备CSS动画角色
        if (speaking) {
            avatarCharacter.classList.add('speaking');
            avatarMouth.classList.add('speaking');
            speakingIndicator.style.display = 'flex';
        } else {
            avatarCharacter.classList.remove('speaking');
            avatarMouth.classList.remove('speaking');
            speakingIndicator.style.display = 'none';
        }
    } else {
        // 使用GIF图片
        if (speaking) {
            digitalHuman.src = 'assets/speaking.gif';
            speakingIndicator.style.display = 'flex';
        } else {
            digitalHuman.src = 'assets/idle.gif';
            speakingIndicator.style.display = 'none';
        }
    }
}

// 语音播报
function speak(text) {
    if (!('speechSynthesis' in window)) {
        console.warn('浏览器不支持语音合成');
        setDigitalHumanSpeaking(false);
        return;
    }
    
    // 取消之前的语音
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // 尝试选择中文语音
    const voices = window.speechSynthesis.getVoices();
    const chineseVoice = voices.find(voice => voice.lang.includes('zh'));
    if (chineseVoice) {
        utterance.voice = chineseVoice;
    }
    
    utterance.onend = () => {
        setDigitalHumanSpeaking(false);
    };
    
    utterance.onerror = () => {
        setDigitalHumanSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
}

// 设置语音识别
function setupSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('浏览器不支持语音识别');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
        isRecording = true;
        voiceInputBtn.classList.add('recording');
        voiceIndicator.style.display = 'flex';
    };
    
    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript) {
            messageInput.value = finalTranscript;
        } else if (interimTranscript) {
            messageInput.value = interimTranscript;
        }
    };
    
    recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        isRecording = false;
        voiceInputBtn.classList.remove('recording');
        voiceIndicator.style.display = 'none';
    };
    
    recognition.onend = () => {
        isRecording = false;
        voiceInputBtn.classList.remove('recording');
        voiceIndicator.style.display = 'none';
        
        // 如果识别到内容，自动发送
        if (messageInput.value.trim()) {
            setTimeout(() => sendMessage(), 500);
        }
    };
}

// 切换语音输入
function toggleVoiceInput() {
    if (!recognition) {
        alert('您的浏览器不支持语音识别功能，请使用Chrome或Edge浏览器。');
        return;
    }
    
    if (isRecording) {
        recognition.stop();
    } else {
        messageInput.value = '';
        recognition.start();
    }
}

// 显示告警
function showAlert(keywords) {
    const keywordText = keywords.join('、');
    alertMessage.textContent = `检测到用户消息中包含以下危险关键词：${keywordText}`;
    alertModal.style.display = 'flex';
}

// 心理测评
let assessmentState = {
    type: 'depression',
    questions: [],
    currentIndex: 0,
    answers: []
};

function openAssessment() {
    assessmentModal.style.display = 'flex';
    resetAssessment();
}

function closeAssessment() {
    assessmentModal.style.display = 'none';
}

function resetAssessment() {
    assessmentState = {
        type: 'depression',
        questions: [],
        currentIndex: 0,
        answers: []
    };
    
    document.getElementById('assessmentType').value = 'depression';
    document.getElementById('assessmentContent').innerHTML = '<p class="assessment-intro">请选择一个测评量表开始测试。这些量表可以帮助你了解自己的心理状态。</p>';
    document.getElementById('assessmentFooter').style.display = 'none';
    document.getElementById('assessmentResult').style.display = 'none';
    document.getElementById('assessmentActions').style.display = 'block';
    document.getElementById('assessmentActions').innerHTML = '<button class="btn btn-primary" id="startAssessmentBtn">开始测评</button>';
    
    document.getElementById('startAssessmentBtn').addEventListener('click', startAssessment);
    document.getElementById('assessmentType').addEventListener('change', (e) => {
        assessmentState.type = e.target.value;
    });
}

async function startAssessment() {
    const type = document.getElementById('assessmentType').value;
    
    try {
        const response = await fetch(`${API_BASE}/api/questionnaires`);
        const result = await response.json();
        
        if (result.success) {
            const questionnaire = result.data[type];
            if (questionnaire) {
                assessmentState.type = type;
                assessmentState.questions = questionnaire.questions;
                assessmentState.currentIndex = 0;
                assessmentState.answers = new Array(questionnaire.questions.length).fill(null);
                
                showQuestion();
            }
        }
    } catch (error) {
        console.error('加载题库失败:', error);
        alert('加载题库失败，请重试。');
    }
}

function showQuestion() {
    const { questions, currentIndex, answers } = assessmentState;
    const question = questions[currentIndex];
    const content = document.getElementById('assessmentContent');
    const footer = document.getElementById('assessmentFooter');
    const progress = document.getElementById('progressIndicator');
    const nextBtn = document.getElementById('nextQuestionBtn');
    const prevBtn = document.getElementById('prevQuestionBtn');
    
    content.innerHTML = `
        <div class="question-card">
            <h4>问题 ${currentIndex + 1}：${question.text}</h4>
            ${question.options.map((option, index) => `
                <div class="option-item ${answers[currentIndex] === index ? 'selected' : ''}" data-index="${index}">
                    ${option}
                </div>
            `).join('')}
        </div>
    `;
    
    // 添加选项点击事件
    document.querySelectorAll('.option-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            assessmentState.answers[currentIndex] = index;
            showQuestion();
        });
    });
    
    progress.textContent = `${currentIndex + 1} / ${questions.length}`;
    footer.style.display = 'flex';
    
    prevBtn.style.visibility = currentIndex === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = currentIndex === questions.length - 1 ? '查看结果' : '下一题';
    nextBtn.disabled = answers[currentIndex] === null;
    
    prevBtn.onclick = () => {
        if (currentIndex > 0) {
            assessmentState.currentIndex--;
            showQuestion();
        }
    };
    
    nextBtn.onclick = () => {
        if (currentIndex < questions.length - 1) {
            assessmentState.currentIndex++;
            showQuestion();
        } else {
            submitAssessment();
        }
    };
}

async function submitAssessment() {
    const resultDiv = document.getElementById('assessmentResult');
    
    try {
        const response = await fetch(`${API_BASE}/api/assessment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: assessmentState.type,
                answers: assessmentState.answers
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const { score, level, suggestion } = result.data;
            
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <h3>测评结果</h3>
                <div class="result-score">${score} 分</div>
                <div class="result-level result-level${level}">${level}</div>
                <p class="result-suggestion">${suggestion}</p>
            `;
            
            document.getElementById('assessmentFooter').style.display = 'none';
            document.getElementById('assessmentActions').style.display = 'none';
            
            // 添加关闭按钮
            setTimeout(() => {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'btn btn-primary';
                closeBtn.textContent = '完成';
                closeBtn.style.marginTop = '20px';
                closeBtn.onclick = closeAssessment;
                resultDiv.appendChild(closeBtn);
            }, 100);
        }
    } catch (error) {
        console.error('提交测评失败:', error);
        alert('提交测评失败，请重试。');
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// 预加载语音
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}
