// 登录页面逻辑

const API_BASE = '';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoading = loginBtn.querySelector('.btn-loading');
    const errorMessage = document.getElementById('errorMessage');
    
    // 检查是否已登录
    checkAuth();
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // 清除错误信息
        errorMessage.textContent = '';
        
        // 验证输入
        if (!username || !password) {
            errorMessage.textContent = '请输入账号和密码';
            return;
        }
        
        // 显示加载状态
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        
        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 登录成功，保存用户信息
                localStorage.setItem('userInfo', JSON.stringify(result.data));
                
                // 根据角色跳转
                if (result.data.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/index.html';
                }
            } else {
                errorMessage.textContent = result.error || '登录失败';
            }
        } catch (error) {
            console.error('登录错误:', error);
            errorMessage.textContent = '网络错误，请重试';
        } finally {
            // 恢复按钮状态
            loginBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    });
});

// 检查用户认证状态
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`);
        const result = await response.json();
        
        if (result.success) {
            // 已登录，跳转到对应页面
            if (result.data.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/index.html';
            }
        }
    } catch (error) {
        // 未登录，保持在登录页面
    }
}
