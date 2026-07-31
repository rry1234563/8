// 后台管理 - 主逻辑

const API_BASE = '';

// 全局状态
let state = {
    conversations: [],
    abnormalList: [],
    keywords: [],
    questionnaires: {},
    presetQA: [],
    users: [],
    assessments: [],
    currentPage: 'dashboard',
    editingQAId: null,
    editingUserId: null
};

// DOM元素
const navItems = document.querySelectorAll('.nav-item[data-page]');
const pages = document.querySelectorAll('.page');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const confirmModalBtn = document.getElementById('confirmModalBtn');
const toast = document.getElementById('toast');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    setupNavigation();
    loadDashboard();
    setupEventListeners();
    loadAdminInfo();
}

// 加载当前管理员信息
async function loadAdminInfo() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`);
        const result = await response.json();
        if (result.success) {
            document.getElementById('currentAdminName').textContent = result.data.username;
        }
    } catch (error) {
        console.error('加载管理员信息失败:', error);
    }
}

// 设置导航
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
            
            // 移动端点击导航后收起菜单
            const navMenu = document.getElementById('navMenu');
            if (navMenu && window.innerWidth <= 640) {
                navMenu.classList.remove('show');
            }
        });
    });
    
    // 移动端菜单切换
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('show');
        });
    }
}

function switchPage(pageName) {
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageName);
    });
    
    pages.forEach(page => {
        page.classList.toggle('active', page.id === `page-${pageName}`);
    });
    
    state.currentPage = pageName;
    
    // 加载对应页面数据
    switch (pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'preset-qa':
            loadPresetQA();
            break;
        case 'conversations':
            loadConversations();
            break;
        case 'abnormal':
            loadAbnormal();
            break;
        case 'keywords':
            loadKeywords();
            break;
        case 'questionnaires':
            loadQuestionnaires();
            break;
        case 'assessments':
            loadAssessments();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

// 设置事件监听
function setupEventListeners() {
    // 清理数据
    document.getElementById('cleanupBtn').addEventListener('click', () => {
        showConfirm('确认清理', '将删除所有对话记录，只保留最近1000条记录。此操作不可恢复。', () => {
            fetch(`${API_BASE}/api/cleanup`, { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast('数据清理成功', 'success');
                        loadDashboard();
                    }
                })
                .catch(err => showToast('操作失败', 'error'));
        });
    });
    
    // 导出数据
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    
    // 刷新对话
    document.getElementById('refreshConversationsBtn').addEventListener('click', loadConversations);
    
    // 搜索
    document.getElementById('searchInput').addEventListener('input', filterConversations);
    
    // 异常筛选
    document.getElementById('abnormalFilter').addEventListener('change', renderAbnormal);
    
    // 添加关键词
    document.getElementById('addKeywordBtn').addEventListener('click', addKeyword);
    document.getElementById('newKeywordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addKeyword();
    });
    
    // 添加题目
    document.getElementById('addQuestionBtn').addEventListener('click', addNewQuestion);
    
    // 测评类型选择
    document.getElementById('questionnaireSelect').addEventListener('change', loadQuestionnaires);
    
    // 测评记录筛选
    const assessmentFilter = document.getElementById('assessmentFilter');
    if (assessmentFilter) {
        assessmentFilter.addEventListener('change', renderAssessments);
    }
    
    // 刷新测评记录
    const refreshAssessmentsBtn = document.getElementById('refreshAssessmentsBtn');
    if (refreshAssessmentsBtn) {
        refreshAssessmentsBtn.addEventListener('click', loadAssessments);
    }
    
    // 预设问答表单事件
    document.getElementById('addPresetQABtn').addEventListener('click', () => {
        state.editingQAId = null;
        document.getElementById('formTitle').textContent = '新增预设问答';
        document.getElementById('qaQuestion').value = '';
        document.getElementById('qaKeywords').value = '';
        document.getElementById('qaAnswer').value = '';
        document.getElementById('qaEnabled').checked = true;
        document.getElementById('presetQAForm').style.display = 'block';
    });
    
    document.getElementById('closeFormBtn').addEventListener('click', () => {
        document.getElementById('presetQAForm').style.display = 'none';
    });
    
    document.getElementById('cancelFormBtn').addEventListener('click', () => {
        document.getElementById('presetQAForm').style.display = 'none';
    });
    
    document.getElementById('saveFormBtn').addEventListener('click', savePresetQA);
    
    // 用户管理表单事件
    document.getElementById('addUserBtn').addEventListener('click', () => {
        state.editingUserId = null;
        document.getElementById('userFormTitle').textContent = '新增账号';
        document.getElementById('userUsername').value = '';
        document.getElementById('userRole').value = 'user';
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('userForm').style.display = 'block';
    });
    
    document.getElementById('closeUserFormBtn').addEventListener('click', () => {
        document.getElementById('userForm').style.display = 'none';
    });
    
    document.getElementById('cancelUserBtn').addEventListener('click', () => {
        document.getElementById('userForm').style.display = 'none';
    });
    
    document.getElementById('saveUserBtn').addEventListener('click', saveUser);
    
    // 管理员退出登录
    const logoutAdminBtn = document.getElementById('logoutAdminBtn');
    if (logoutAdminBtn) {
        logoutAdminBtn.addEventListener('click', async () => {
            try {
                await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
                localStorage.removeItem('userInfo');
                window.location.href = '/login.html';
            } catch (error) {
                window.location.href = '/login.html';
            }
        });
    }
    
    // 弹窗
    closeModalBtn.addEventListener('click', hideModal);
    cancelModalBtn.addEventListener('click', hideModal);
}

// 加载仪表盘数据
async function loadDashboard() {
    try {
        const [convRes, abRes, kwRes, qaRes] = await Promise.all([
            fetch(`${API_BASE}/api/conversations`).then(r => r.json()),
            fetch(`${API_BASE}/api/abnormal`).then(r => r.json()),
            fetch(`${API_BASE}/api/danger-keywords`).then(r => r.json()),
            fetch(`${API_BASE}/api/preset-qa`).then(r => r.json())
        ]);
        
        const conversations = convRes.data || [];
        const abnormal = abRes.data || [];
        const keywords = kwRes.data || [];
        const presetQA = qaRes.data || [];
        const resolved = abnormal.filter(a => a.resolved).length;
        
        document.getElementById('totalConversations').textContent = conversations.length;
        document.getElementById('totalPresetQA').textContent = presetQA.length;
        document.getElementById('totalAbnormal').textContent = abnormal.length;
        document.getElementById('resolvedAbnormal').textContent = resolved;
        document.getElementById('totalKeywords').textContent = keywords.length;
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
    }
}

// 加载对话记录
async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE}/api/conversations`);
        const result = await response.json();
        state.conversations = result.data || [];
        renderConversations();
    } catch (error) {
        console.error('加载对话记录失败:', error);
    }
}

function renderConversations() {
    const tbody = document.getElementById('conversationsTable');
    tbody.innerHTML = '';
    
    // 按时间倒序显示
    const sorted = [...state.conversations].reverse();
    
    sorted.forEach(conv => {
        const tr = document.createElement('tr');
        const time = new Date(conv.timestamp);
        const timeStr = time.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const userAccount = conv.userAccount || '未知';
        
        tr.innerHTML = `
            <td class="time-cell">${timeStr}</td>
            <td class="account-cell">${escapeHtml(userAccount)}</td>
            <td class="type-${conv.type}">${conv.type === 'user' ? '👤 用户' : '🤖 AI'}</td>
            <td class="content-cell">${escapeHtml(conv.content)}</td>
            <td>
                <button class="btn btn-danger btn-sm" data-id="${conv.id}">删除</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // 添加删除事件
    tbody.querySelectorAll('.btn-danger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            deleteConversation(id);
        });
    });
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#999;">暂无对话记录</td></tr>';
    }
}

function filterConversations() {
    const keyword = document.getElementById('searchInput').value.toLowerCase();
    const tbody = document.getElementById('conversationsTable');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const content = row.querySelector('.content-cell');
        if (content) {
            row.style.display = content.textContent.toLowerCase().includes(keyword) ? '' : 'none';
        }
    });
}

async function deleteConversation(id) {
    showConfirm('删除确认', '确定要删除这条对话记录吗？', async () => {
        try {
            const response = await fetch(`${API_BASE}/api/conversations/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (result.success) {
                showToast('删除成功', 'success');
                loadConversations();
                loadDashboard();
            }
        } catch (error) {
            showToast('删除失败', 'error');
        }
    });
}

// 加载异常记录
async function loadAbnormal() {
    try {
        const response = await fetch(`${API_BASE}/api/abnormal`);
        const result = await response.json();
        state.abnormalList = result.data || [];
        renderAbnormal();
    } catch (error) {
        console.error('加载异常记录失败:', error);
    }
}

function renderAbnormal() {
    const tbody = document.getElementById('abnormalTable');
    const filter = document.getElementById('abnormalFilter').value;
    tbody.innerHTML = '';
    
    let filtered = [...state.abnormalList];
    if (filter === 'unresolved') {
        filtered = filtered.filter(a => !a.resolved);
    } else if (filter === 'resolved') {
        filtered = filtered.filter(a => a.resolved);
    }
    
    // 按时间倒序
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    filtered.forEach(record => {
        const tr = document.createElement('tr');
        const time = new Date(record.timestamp);
        const timeStr = time.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const keywordsHtml = record.keywords.map(kw => 
            `<span class="keyword-tag">${escapeHtml(kw)}</span>`
        ).join('');
        
        const userAccount = record.userAccount || '未知';
        
        tr.innerHTML = `
            <td class="time-cell">${timeStr}</td>
            <td class="account-cell">${escapeHtml(userAccount)}</td>
            <td class="content-cell">${escapeHtml(record.message)}</td>
            <td>${keywordsHtml}</td>
            <td><span class="status-badge status-${record.resolved ? 'resolved' : 'unresolved'}">${record.resolved ? '已处理' : '未处理'}</span></td>
            <td>
                ${record.resolved ? '' : `<button class="btn btn-primary btn-sm" data-id="${record.id}">标记已处理</button>`}
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // 添加处理事件
    tbody.querySelectorAll('.btn-primary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            resolveAbnormal(id);
        });
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">暂无异常记录</td></tr>';
    }
}

async function resolveAbnormal(id) {
    try {
        const response = await fetch(`${API_BASE}/api/abnormal/${id}/resolve`, { method: 'PUT' });
        const result = await response.json();
        if (result.success) {
            showToast('已标记为已处理', 'success');
            loadAbnormal();
            loadDashboard();
        }
    } catch (error) {
        showToast('操作失败', 'error');
    }
}

// 加载关键词
async function loadKeywords() {
    try {
        const response = await fetch(`${API_BASE}/api/danger-keywords`);
        const result = await response.json();
        state.keywords = result.data || [];
        renderKeywords();
    } catch (error) {
        console.error('加载关键词失败:', error);
    }
}

function renderKeywords() {
    const list = document.getElementById('keywordList');
    list.innerHTML = '';
    
    state.keywords.forEach((keyword, index) => {
        const item = document.createElement('div');
        item.className = 'keyword-item';
        item.innerHTML = `
            <span>${escapeHtml(keyword)}</span>
            <button class="delete-btn" data-index="${index}">✕</button>
        `;
        list.appendChild(item);
    });
    
    list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removeKeyword(index);
        });
    });
    
    if (state.keywords.length === 0) {
        list.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">暂无关键词</p>';
    }
}

function addKeyword() {
    const input = document.getElementById('newKeywordInput');
    const value = input.value.trim();
    
    if (!value) return;
    if (state.keywords.includes(value)) {
        showToast('关键词已存在', 'error');
        return;
    }
    
    state.keywords.push(value);
    saveKeywords();
    input.value = '';
}

function removeKeyword(index) {
    showConfirm('删除关键词', `确定要删除关键词"${state.keywords[index]}"吗？`, () => {
        state.keywords.splice(index, 1);
        saveKeywords();
    });
}

async function saveKeywords() {
    try {
        const response = await fetch(`${API_BASE}/api/danger-keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords: state.keywords })
        });
        const result = await response.json();
        if (result.success) {
            showToast('保存成功', 'success');
            renderKeywords();
            loadDashboard();
        }
    } catch (error) {
        showToast('保存失败', 'error');
    }
}

// 加载测评题库
async function loadQuestionnaires() {
    try {
        const response = await fetch(`${API_BASE}/api/questionnaires`);
        const result = await response.json();
        state.questionnaires = result.data || {};
        renderQuestionnaires();
    } catch (error) {
        console.error('加载题库失败:', error);
    }
}

function renderQuestionnaires() {
    const type = document.getElementById('questionnaireSelect').value;
    const editor = document.getElementById('questionnaireEditor');
    const questionnaire = state.questionnaires[type];
    
    if (!questionnaire) {
        editor.innerHTML = '<p style="color:#999;text-align:center;padding:40px;">未找到题库</p>';
        return;
    }
    
    let html = `<h3 style="margin-bottom:20px;">${escapeHtml(questionnaire.name)}</h3>`;
    
    questionnaire.questions.forEach((q, qIndex) => {
        html += `
            <div class="question-item" data-index="${qIndex}">
                <div class="question-header">
                    <h4>题目 ${qIndex + 1}</h4>
                    <button class="btn btn-danger btn-sm remove-question-btn" data-index="${qIndex}">🗑️ 删除</button>
                </div>
                <input type="text" class="question-text-input" value="${escapeHtml(q.text)}" data-qindex="${qIndex}" placeholder="题目内容">
                <div class="options-list">
        `;
        
        q.options.forEach((opt, oIndex) => {
            html += `
                <div class="option-item-editor">
                    <input type="text" value="${escapeHtml(opt)}" data-qindex="${qIndex}" data-oindex="${oIndex}" placeholder="选项 ${oIndex + 1}">
                    <button class="remove-option-btn" data-qindex="${qIndex}" data-oindex="${oIndex}">✕</button>
                </div>
            `;
        });
        
        html += `
                <button class="add-option-btn" data-qindex="${qIndex}">➕ 添加选项</button>
                </div>
            </div>
        `;
    });
    
    html += '<button class="save-all-btn" id="saveQuestionnairesBtn">💾 保存所有修改</button>';
    
    editor.innerHTML = html;
    
    // 添加事件监听
    editor.querySelectorAll('.question-text-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const qIndex = parseInt(e.target.dataset.qindex);
            state.questionnaires[type].questions[qIndex].text = e.target.value;
        });
    });
    
    editor.querySelectorAll('.option-item-editor input').forEach(input => {
        input.addEventListener('input', (e) => {
            const qIndex = parseInt(e.target.dataset.qindex);
            const oIndex = parseInt(e.target.dataset.oindex);
            state.questionnaires[type].questions[qIndex].options[oIndex] = e.target.value;
        });
    });
    
    editor.querySelectorAll('.remove-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIndex = parseInt(e.target.dataset.qindex);
            const oIndex = parseInt(e.target.dataset.oindex);
            state.questionnaires[type].questions[qIndex].options.splice(oIndex, 1);
            renderQuestionnaires();
        });
    });
    
    editor.querySelectorAll('.add-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIndex = parseInt(e.target.dataset.qindex);
            state.questionnaires[type].questions[qIndex].options.push('新选项');
            renderQuestionnaires();
        });
    });
    
    editor.querySelectorAll('.remove-question-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIndex = parseInt(e.target.dataset.qindex);
            showConfirm('删除题目', '确定要删除这道题目吗？', () => {
                state.questionnaires[type].questions.splice(qIndex, 1);
                renderQuestionnaires();
            });
        });
    });
    
    document.getElementById('saveQuestionnairesBtn').addEventListener('click', saveQuestionnaires);
}

function addNewQuestion() {
    const type = document.getElementById('questionnaireSelect').value;
    const questionnaire = state.questionnaires[type];
    
    if (questionnaire) {
        questionnaire.questions.push({
            text: '新题目',
            options: ['选项1', '选项2', '选项3', '选项4']
        });
        renderQuestionnaires();
    }
}

async function saveQuestionnaires() {
    try {
        const response = await fetch(`${API_BASE}/api/questionnaires`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionnaires: state.questionnaires })
        });
        const result = await response.json();
        if (result.success) {
            showToast('保存成功', 'success');
        }
    } catch (error) {
        showToast('保存失败', 'error');
    }
}

// 导出数据
async function exportData() {
    try {
        const data = {
            conversations: state.conversations,
            abnormal: state.abnormalList,
            keywords: state.keywords,
            questionnaires: state.questionnaires,
            exportTime: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-assistant-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('导出成功', 'success');
    } catch (error) {
        showToast('导出失败', 'error');
    }
}

// 弹窗
function showConfirm(title, message, callback, informational = false) {
    modalTitle.textContent = title;
    modalBody.textContent = message;
    modal.classList.add('active');
    
    if (informational) {
        confirmModalBtn.textContent = '我知道了';
        cancelModalBtn.style.display = 'none';
    } else {
        confirmModalBtn.textContent = '确认';
        cancelModalBtn.style.display = 'inline-block';
    }
    
    confirmModalBtn.onclick = () => {
        callback();
        hideModal();
        // 恢复按钮状态
        cancelModalBtn.style.display = 'inline-block';
        confirmModalBtn.textContent = '确认';
    };
}

function hideModal() {
    modal.classList.remove('active');
    cancelModalBtn.style.display = 'inline-block';
    confirmModalBtn.textContent = '确认';
    modalBody.textContent = '内容';
}

// Toast提示
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 预设问答管理 ==========

// 加载预设问答
async function loadPresetQA() {
    try {
        const response = await fetch(`${API_BASE}/api/preset-qa`);
        const result = await response.json();
        state.presetQA = result.data || [];
        renderPresetQA();
    } catch (error) {
        console.error('加载预设问答失败:', error);
    }
}

// 渲染预设问答列表
function renderPresetQA() {
    const tbody = document.getElementById('presetQATable');
    tbody.innerHTML = '';
    
    // 按创建时间倒序显示
    const sorted = [...state.presetQA].reverse();
    
    sorted.forEach(qa => {
        const tr = document.createElement('tr');
        const time = new Date(qa.createdAt);
        const timeStr = time.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const keywordsHtml = (qa.keywords || []).map(kw => 
            `<span class="keyword-tag">${escapeHtml(kw)}</span>`
        ).join('');
        
        tr.innerHTML = `
            <td class="keywords-cell">${escapeHtml(qa.question)}</td>
            <td class="keywords-cell">${keywordsHtml}</td>
            <td class="answer-cell">${escapeHtml(qa.answer)}</td>
            <td>
                <span class="status-badge ${qa.enabled ? 'enabled' : 'disabled'}">
                    ${qa.enabled ? '启用' : '禁用'}
                </span>
            </td>
            <td class="date-cell">${timeStr}</td>
            <td class="action-buttons">
                <button class="btn btn-primary btn-sm" data-id="${qa.id}" data-action="edit">编辑</button>
                <button class="btn btn-secondary btn-sm" data-id="${qa.id}" data-action="toggle">${qa.enabled ? '禁用' : '启用'}</button>
                <button class="btn btn-danger btn-sm" data-id="${qa.id}" data-action="delete">删除</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // 添加操作事件
    tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const action = e.target.dataset.action;
            
            switch (action) {
                case 'edit':
                    editPresetQA(id);
                    break;
                case 'toggle':
                    togglePresetQA(id);
                    break;
                case 'delete':
                    deletePresetQA(id);
                    break;
            }
        });
    });
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">暂无预设问答，点击"新增问答"添加</td></tr>';
    }
}

// 保存预设问答
async function savePresetQA() {
    const question = document.getElementById('qaQuestion').value.trim();
    const keywordsStr = document.getElementById('qaKeywords').value.trim();
    const answer = document.getElementById('qaAnswer').value.trim();
    const enabled = document.getElementById('qaEnabled').checked;
    
    if (!question || !answer) {
        showToast('问题和回答不能为空', 'error');
        return;
    }
    
    let keywords;
    if (keywordsStr) {
        keywords = keywordsStr.split(/[,，]/).map(k => k.trim()).filter(k => k);
    } else {
        keywords = [question];
    }
    
    try {
        if (state.editingQAId) {
            // 更新现有记录
            const response = await fetch(`${API_BASE}/api/preset-qa/${state.editingQAId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, keywords, answer, enabled })
            });
            const result = await response.json();
            if (result.success) {
                showToast('更新成功', 'success');
                document.getElementById('presetQAForm').style.display = 'none';
                loadPresetQA();
                loadDashboard();
            }
        } else {
            // 添加新记录
            const response = await fetch(`${API_BASE}/api/preset-qa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, keywords, answer })
            });
            const result = await response.json();
            if (result.success) {
                showToast('添加成功', 'success');
                document.getElementById('presetQAForm').style.display = 'none';
                loadPresetQA();
                loadDashboard();
            }
        }
    } catch (error) {
        console.error('保存预设问答失败:', error);
        showToast('保存失败', 'error');
    }
}

// 编辑预设问答
function editPresetQA(id) {
    const qa = state.presetQA.find(q => q.id === id);
    if (!qa) return;
    
    state.editingQAId = id;
    document.getElementById('formTitle').textContent = '编辑预设问答';
    document.getElementById('qaQuestion').value = qa.question;
    document.getElementById('qaKeywords').value = (qa.keywords || []).join(',');
    document.getElementById('qaAnswer').value = qa.answer;
    document.getElementById('qaEnabled').checked = qa.enabled;
    document.getElementById('presetQAForm').style.display = 'block';
}

// 切换启用状态
async function togglePresetQA(id) {
    const qa = state.presetQA.find(q => q.id === id);
    if (!qa) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/preset-qa/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: !qa.enabled })
        });
        const result = await response.json();
        if (result.success) {
            showToast(qa.enabled ? '已禁用' : '已启用', 'success');
            loadPresetQA();
            loadDashboard();
        }
    } catch (error) {
        showToast('操作失败', 'error');
    }
}

// 删除预设问答
function deletePresetQA(id) {
    showConfirm('删除确认', '确定要删除这个预设问答吗？', async () => {
        try {
            const response = await fetch(`${API_BASE}/api/preset-qa/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (result.success) {
                showToast('删除成功', 'success');
                loadPresetQA();
                loadDashboard();
            }
        } catch (error) {
            showToast('删除失败', 'error');
        }
    });
}

// ========== 测评记录管理 ==========

// 加载测评记录
async function loadAssessments() {
    try {
        const response = await fetch(`${API_BASE}/api/assessments`);
        const result = await response.json();
        state.assessments = result.data || [];
        renderAssessments();
    } catch (error) {
        console.error('加载测评记录失败:', error);
    }
}

// 渲染测评记录
function renderAssessments() {
    const tbody = document.getElementById('assessmentsTable');
    const filter = document.getElementById('assessmentFilter');
    const filterValue = filter ? filter.value : 'all';
    tbody.innerHTML = '';
    
    let filtered = [...state.assessments];
    if (filterValue !== 'all') {
        filtered = filtered.filter(a => a.type === filterValue);
    }
    
    // 按时间倒序
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    filtered.forEach(assessment => {
        const tr = document.createElement('tr');
        const time = new Date(assessment.timestamp);
        const timeStr = time.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const typeName = assessment.typeName || (assessment.type === 'depression' ? '抑郁测评' : '焦虑测评');
        const levelClass = `level-${assessment.level}`;
        
        tr.innerHTML = `
            <td class="account-cell">${escapeHtml(assessment.userAccount || '未知')}</td>
            <td>${escapeHtml(typeName)}</td>
            <td class="score-cell">${assessment.score}</td>
            <td><span class="status-badge ${levelClass}">${escapeHtml(assessment.level)}</span></td>
            <td class="time-cell">${timeStr}</td>
        `;
        
        tbody.appendChild(tr);
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#999;">暂无测评记录</td></tr>';
    }
}

// ========== 账号管理 ==========

// 加载用户列表
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/users`);
        const result = await response.json();
        state.users = result.data || [];
        renderUsers();
    } catch (error) {
        console.error('加载用户列表失败:', error);
        if (error.message && error.message.includes('401')) {
            showToast('请先登录', 'error');
        }
    }
}

// 渲染用户列表
function renderUsers() {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '';
    
    // 按创建时间倒序
    const sorted = [...state.users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    sorted.forEach(user => {
        const tr = document.createElement('tr');
        const time = new Date(user.createdAt);
        const timeStr = time.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        tr.innerHTML = `
            <td>${escapeHtml(user.username)}</td>
            <td>
                <span class="role-badge role-${user.role}">${user.role === 'admin' ? '👑 管理员' : '👤 普通用户'}</span>
            </td>
            <td class="time-cell">${timeStr}</td>
            <td class="action-buttons">
                <button class="btn btn-secondary btn-sm" data-id="${user.id}" data-action="reset">重置密码</button>
                <button class="btn btn-primary btn-sm" data-id="${user.id}" data-action="toggle-role">${user.role === 'admin' ? '设为用户' : '设为管理员'}</button>
                ${user.username !== 'admin' ? `<button class="btn btn-danger btn-sm" data-id="${user.id}" data-action="delete">删除</button>` : '<span class="system-tag">系统账号</span>'}
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // 添加操作事件
    tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const action = e.target.dataset.action;
            
            switch (action) {
                case 'reset':
                    resetUserPassword(id);
                    break;
                case 'toggle-role':
                    toggleUserRole(id);
                    break;
                case 'delete':
                    deleteUser(id);
                    break;
            }
        });
    });
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:#999;">暂无账号，点击"新增账号"添加</td></tr>';
    }
}

// 保存用户
async function saveUser() {
    const username = document.getElementById('userUsername').value.trim();
    const role = document.getElementById('userRole').value;
    
    if (!username) {
        showToast('账号不能为空', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, role })
        });
        const result = await response.json();
        
        if (result.success) {
            const defaultPassword = result.data.defaultPassword;
            showConfirm('账号创建成功', `账号：${username}\n默认密码：${defaultPassword}\n请妥善保管此密码！`, () => {
                document.getElementById('userForm').style.display = 'none';
                loadUsers();
            }, true);
        } else {
            showToast(result.error || '创建失败', 'error');
        }
    } catch (error) {
        console.error('创建用户失败:', error);
        showToast('创建失败', 'error');
    }
}

// 重置用户密码
async function resetUserPassword(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    
    const defaultPassword = user.username.slice(-6) || '123456';
    
    showConfirm('重置密码', `确定要重置账号"${user.username}"的密码吗？\n新密码将重置为：${defaultPassword}`, async () => {
        try {
            const response = await fetch(`${API_BASE}/api/admin/users/${id}/reset-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                showToast('密码重置成功', 'success');
            } else {
                showToast(result.error || '重置失败', 'error');
            }
        } catch (error) {
            showToast('重置失败', 'error');
        }
    });
}

// 切换用户角色
async function toggleUserRole(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const actionText = newRole === 'admin' ? '设为管理员' : '设为普通用户';
    
    showConfirm('修改角色', `确定要将"${user.username}"${actionText}吗？`, async () => {
        try {
            const response = await fetch(`${API_BASE}/api/admin/users/${id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            const result = await response.json();
            if (result.success) {
                showToast('角色修改成功', 'success');
                loadUsers();
            } else {
                showToast(result.error || '修改失败', 'error');
            }
        } catch (error) {
            showToast('修改失败', 'error');
        }
    });
}

// 删除用户
function deleteUser(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    
    showConfirm('删除账号', `确定要删除账号"${user.username}"吗？此操作不可恢复！`, async () => {
        try {
            const response = await fetch(`${API_BASE}/api/admin/users/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (result.success) {
                showToast('删除成功', 'success');
                loadUsers();
            } else {
                showToast(result.error || '删除失败', 'error');
            }
        } catch (error) {
            showToast('删除失败', 'error');
        }
    });
}
