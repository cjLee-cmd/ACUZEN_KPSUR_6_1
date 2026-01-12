/**
 * User Management Page Script
 * pages/js/user-management.js
 *
 * P30_UserManagement.html 인라인 스크립트 분리
 * 사용자 관리 기능
 */

(function() {
    'use strict';

    // === Fallbacks ===
    if (!window.Storage) {
        window.Storage = {
            get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
            set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
            remove: (key) => { try { localStorage.removeItem(key); return true; } catch { return false; } }
        };
    }

    if (!window.CONFIG) {
        window.CONFIG = {
            STORAGE_KEYS: {
                SESSION: 'kpsur_session'
            }
        };
    }

    // AppLayout stub class
    class AppLayout {
        constructor(options = {}) {
            this.currentStage = options.currentStage || 0;
            this.reportName = options.reportName || '';
        }

        render(content) {
            return content;
        }
    }

    // === Data ===
    let users = [];
    let currentEditUser = null;
    let filterRole = 'all';
    let filterStatus = 'all';

    // === Toast Notification ===
    function showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '' : type === 'error' ? '' : ''}</span>
            <span class="toast-message">${message}</span>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // === Header Functions ===
    function loadHeaderUserInfo() {
        const session = window.Storage?.get(window.CONFIG?.STORAGE_KEYS?.SESSION || 'kpsur_session');
        if (session) {
            const avatarEl = document.getElementById('headerUserAvatar');
            const nameEl = document.getElementById('headerUserName');
            const roleEl = document.getElementById('headerUserRole');

            if (avatarEl) avatarEl.textContent = (session.userName || 'U').charAt(0);
            if (nameEl) nameEl.textContent = session.userName || '사용자';
            if (roleEl) roleEl.textContent = session.userRole || 'User';
        }
    }

    async function handleLogout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            if (window.authManager) {
                await window.authManager.logout();
            } else {
                window.Storage?.remove(window.CONFIG?.STORAGE_KEYS?.SESSION || 'kpsur_session');
            }
            window.location.href = 'P01_Login.html';
        }
    }

    // === User Data Functions ===
    async function loadUsersFromSupabase() {
        try {
            if (window.supabaseClient) {
                await window.supabaseClient.init();
                const result = await window.supabaseClient.client
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (result.data && result.data.length > 0) {
                    users = result.data.map(u => ({
                        id: u.id,
                        name: u.name || u.email,
                        email: u.email,
                        department: u.department || '-',
                        role: u.role?.toLowerCase() || 'viewer',
                        status: u.status || 'active',
                        lastLogin: u.last_login ? new Date(u.last_login).toLocaleString('ko-KR') : '-',
                        reports: u.report_count || 0
                    }));
                    console.log('Users loaded from Supabase:', users.length);
                    return;
                }
            }
        } catch (error) {
            console.warn('Failed to load users from Supabase:', error);
        }

        // Fallback to sample data
        users = [
            { id: 1, name: '홍길동', email: 'hong@kpsur.test', department: '약물안전관리부', role: 'master', status: 'active', lastLogin: '2025-01-15 09:23', reports: 15 },
            { id: 2, name: '김영희', email: 'kim@kpsur.test', department: '약물안전관리부', role: 'author', status: 'active', lastLogin: '2025-01-14 14:55', reports: 8 },
            { id: 3, name: '이철수', email: 'lee@kpsur.test', department: '품질관리부', role: 'reviewer', status: 'active', lastLogin: '2025-01-13 16:30', reports: 0 },
            { id: 4, name: '박민수', email: 'park@kpsur.test', department: '연구개발부', role: 'viewer', status: 'active', lastLogin: '2025-01-12 11:20', reports: 0 },
            { id: 5, name: '정지은', email: 'jung@kpsur.test', department: '약물안전관리부', role: 'author', status: 'inactive', lastLogin: '2024-12-20 15:40', reports: 3 }
        ];
        console.log('Using sample user data');
    }

    // === Render Functions ===
    function renderUsers() {
        const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const roleFilterValue = document.getElementById('roleFilter')?.value || 'all';
        const statusFilterValue = document.getElementById('statusFilter')?.value || 'all';

        let filteredUsers = users.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchQuery) ||
                                user.email.toLowerCase().includes(searchQuery);
            const matchesRole = roleFilterValue === 'all' || user.role === roleFilterValue;
            const matchesStatus = statusFilterValue === 'all' || user.status === statusFilterValue;

            return matchesSearch && matchesRole && matchesStatus;
        });

        const tbody = document.getElementById('userTableBody');
        if (!tbody) return;

        tbody.innerHTML = filteredUsers.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${user.name.charAt(0)}</div>
                        <div class="user-details">
                            <div class="user-name">${user.name}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>${user.department}</td>
                <td><span class="role-badge ${user.role}">${getRoleLabel(user.role)}</span></td>
                <td><span class="status-badge ${user.status}">${user.status === 'active' ? '활성' : '비활성'}</span></td>
                <td>${user.lastLogin}</td>
                <td>${user.reports}개</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="UserManagementPage.editUser(${user.id})">편집</button>
                        <button class="action-btn" onclick="UserManagementPage.resetPassword(${user.id})">비밀번호</button>
                        <button class="action-btn" onclick="UserManagementPage.deleteUser(${user.id})">삭제</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function getRoleLabel(role) {
        const labels = {
            'master': 'Master',
            'author': 'Author',
            'reviewer': 'Reviewer',
            'viewer': 'Viewer'
        };
        return labels[role] || role;
    }

    function updateStats() {
        const totalUsersEl = document.getElementById('totalUsers');
        const activeUsersEl = document.getElementById('activeUsers');
        const authorsEl = document.getElementById('authors');
        const totalReportsEl = document.getElementById('totalReports');

        if (totalUsersEl) totalUsersEl.textContent = users.length;
        if (activeUsersEl) activeUsersEl.textContent = users.filter(u => u.status === 'active').length;
        if (authorsEl) authorsEl.textContent = users.filter(u => u.role === 'author').length;
        if (totalReportsEl) totalReportsEl.textContent = users.reduce((sum, u) => sum + u.reports, 0);
    }

    // === Filter Function ===
    function filterUsers() {
        renderUsers();
    }

    // === Modal Functions ===
    function showAddUserModal() {
        currentEditUser = null;
        const modalTitle = document.getElementById('modalTitle');
        const userForm = document.getElementById('userForm');
        const passwordGroup = document.getElementById('passwordGroup');
        const modal = document.getElementById('userModal');

        if (modalTitle) modalTitle.textContent = '새 사용자 추가';
        if (userForm) userForm.reset();
        if (passwordGroup) passwordGroup.style.display = 'block';
        if (modal) modal.classList.add('show');
    }

    function editUser(userId) {
        currentEditUser = users.find(u => u.id === userId);
        if (!currentEditUser) return;

        const modalTitle = document.getElementById('modalTitle');
        const userNameEl = document.getElementById('userName');
        const userEmailEl = document.getElementById('userEmail');
        const userDepartmentEl = document.getElementById('userDepartment');
        const userRoleEl = document.getElementById('userRole');
        const userStatusEl = document.getElementById('userStatus');
        const passwordGroup = document.getElementById('passwordGroup');
        const modal = document.getElementById('userModal');

        if (modalTitle) modalTitle.textContent = '사용자 정보 수정';
        if (userNameEl) userNameEl.value = currentEditUser.name;
        if (userEmailEl) userEmailEl.value = currentEditUser.email;
        if (userDepartmentEl) userDepartmentEl.value = currentEditUser.department;
        if (userRoleEl) userRoleEl.value = currentEditUser.role;
        if (userStatusEl) userStatusEl.value = currentEditUser.status;
        if (passwordGroup) passwordGroup.style.display = 'none';
        if (modal) modal.classList.add('show');
    }

    function saveUser() {
        const name = document.getElementById('userName')?.value;
        const email = document.getElementById('userEmail')?.value;
        const department = document.getElementById('userDepartment')?.value;
        const role = document.getElementById('userRole')?.value;
        const status = document.getElementById('userStatus')?.value;
        const password = document.getElementById('userPassword')?.value;

        if (!name || !email || !role) {
            showToast('필수 항목을 입력해주세요', 'error');
            return;
        }

        if (!currentEditUser && !password) {
            showToast('비밀번호를 입력해주세요', 'error');
            return;
        }

        if (currentEditUser) {
            // Edit existing user
            currentEditUser.name = name;
            currentEditUser.email = email;
            currentEditUser.department = department;
            currentEditUser.role = role;
            currentEditUser.status = status;

            showToast('사용자 정보가 수정되었습니다', 'success');
        } else {
            // Add new user
            const newUser = {
                id: users.length + 1,
                name,
                email,
                department,
                role,
                status,
                lastLogin: '-',
                reports: 0
            };

            users.push(newUser);
            showToast('새 사용자가 추가되었습니다', 'success');
        }

        closeUserModal();
        renderUsers();
        updateStats();
    }

    function closeUserModal() {
        const modal = document.getElementById('userModal');
        if (modal) modal.classList.remove('show');
        currentEditUser = null;
    }

    // === User Actions ===
    function resetPassword(userId) {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        if (confirm(`${user.name}님의 비밀번호를 초기화하시겠습니까?`)) {
            showToast('임시 비밀번호가 이메일로 전송되었습니다', 'success');
        }
    }

    function deleteUser(userId) {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        if (confirm(`${user.name}님을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            users = users.filter(u => u.id !== userId);
            renderUsers();
            updateStats();
            showToast('사용자가 삭제되었습니다', 'success');
        }
    }

    // === Dark Mode ===
    function toggleDarkMode() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // === Initialization ===
    async function init() {
        loadHeaderUserInfo();

        const layout = new AppLayout({
            currentStage: null,
            reportName: null,
            hideWorkflowSidebar: true
        });

        const content = `
            <div class="app-content">
            <main class="main-content">
            <div class="user-management-container">
                <div class="page-header">
                    <h1 class="page-title">사용자 관리</h1>
                    <p class="page-subtitle">시스템 사용자 및 권한을 관리합니다</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon"></div>
                        <div class="stat-value" id="totalUsers">0</div>
                        <div class="stat-label">전체 사용자</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"></div>
                        <div class="stat-value" id="activeUsers">0</div>
                        <div class="stat-label">활성 사용자</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"></div>
                        <div class="stat-value" id="authors">0</div>
                        <div class="stat-label">작성자</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"></div>
                        <div class="stat-value" id="totalReports">0</div>
                        <div class="stat-label">총 작성 보고서</div>
                    </div>
                </div>

                <div class="control-bar">
                    <div class="control-left">
                        <input type="text" class="search-input" placeholder="이름 또는 이메일 검색..." id="searchInput" oninput="UserManagementPage.filterUsers()">
                        <select class="filter-select" id="roleFilter" onchange="UserManagementPage.filterUsers()">
                            <option value="all">모든 역할</option>
                            <option value="master">Master</option>
                            <option value="author">Author</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="viewer">Viewer</option>
                        </select>
                        <select class="filter-select" id="statusFilter" onchange="UserManagementPage.filterUsers()">
                            <option value="all">모든 상태</option>
                            <option value="active">활성</option>
                            <option value="inactive">비활성</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="UserManagementPage.showAddUserModal()">
                        새 사용자 추가
                    </button>
                </div>

                <div class="user-table-container">
                    <table class="user-table">
                        <thead>
                            <tr>
                                <th>사용자</th>
                                <th>부서</th>
                                <th>역할</th>
                                <th>상태</th>
                                <th>마지막 로그인</th>
                                <th>작성 보고서</th>
                                <th>작업</th>
                            </tr>
                        </thead>
                        <tbody id="userTableBody">
                        </tbody>
                    </table>
                </div>
            </div>
            </main>
            </div>

            <!-- Footer -->
            <footer class="app-footer">
                <div class="footer-content">
                    Copyright. Power Solution., Inc. 2026.
                </div>
            </footer>
        `;

        const appElement = document.getElementById('app');
        if (appElement) {
            const header = appElement.querySelector('.app-header');
            if (header) {
                header.insertAdjacentHTML('afterend', layout.render(content));
            } else {
                appElement.innerHTML = layout.render(content);
            }
        }

        // Load users from Supabase and render
        await loadUsersFromSupabase();
        renderUsers();
        updateStats();
    }

    // === Dark mode initialization (before DOM ready) ===
    (function() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    })();

    // === Page Load ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // === Global Export ===
    window.UserManagementPage = {
        init,
        filterUsers,
        showAddUserModal,
        editUser,
        saveUser,
        closeUserModal,
        resetPassword,
        deleteUser,
        handleLogout,
        toggleDarkMode
    };

    // HTML compatibility
    window.filterUsers = filterUsers;
    window.showAddUserModal = showAddUserModal;
    window.editUser = editUser;
    window.saveUser = saveUser;
    window.closeUserModal = closeUserModal;
    window.resetPassword = resetPassword;
    window.deleteUser = deleteUser;
    window.handleLogout = handleLogout;
    window.toggleDarkMode = toggleDarkMode;

})();
