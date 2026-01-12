/**
 * Permission Management System
 * 역할 기반 접근 제어 (RBAC)
 */

// 역할 정의
const ROLES = {
    MASTER: 'Master',
    AUTHOR: 'Author',
    REVIEWER: 'Reviewer',
    VIEWER: 'Viewer'
};

// 역할 계층 (높을수록 더 많은 권한)
const ROLE_HIERARCHY = {
    [ROLES.MASTER]: 4,
    [ROLES.AUTHOR]: 3,
    [ROLES.REVIEWER]: 2,
    [ROLES.VIEWER]: 1
};

// 역할별 한국어 라벨
const ROLE_LABELS = {
    [ROLES.MASTER]: '관리자',
    [ROLES.AUTHOR]: '작성자',
    [ROLES.REVIEWER]: '리뷰어',
    [ROLES.VIEWER]: '뷰어'
};

// 역할별 설명
const ROLE_DESCRIPTIONS = {
    [ROLES.MASTER]: '모든 기능에 대한 완전한 접근 권한',
    [ROLES.AUTHOR]: '보고서 작성 및 수정 권한',
    [ROLES.REVIEWER]: '보고서 검토 및 승인 권한',
    [ROLES.VIEWER]: '보고서 조회만 가능'
};

// 페이지별 최소 요구 역할
const PAGE_PERMISSIONS = {
    // 공개 페이지 (로그인 불필요)
    'P01_Login.html': null,
    'P02_Signup.html': null,
    'P03_PasswordReset.html': null,
    'P05_SystemCheck.html': null,

    // 인증 필요 (모든 역할)
    'P04_PasswordChange.html': ROLES.VIEWER,
    'P10_Dashboard.html': ROLES.VIEWER,
    'P11_ReportList.html': ROLES.VIEWER,
    'P12_ReportDetail.html': ROLES.VIEWER,

    // 작성자 이상
    'P13_NewReport.html': ROLES.AUTHOR,
    'P14_UnifiedProcessing.html': ROLES.AUTHOR,
    'P15_SectionEditor.html': ROLES.AUTHOR,
    'P20_Output.html': ROLES.AUTHOR,

    // 리뷰어 이상
    'P18_Review.html': ROLES.REVIEWER,
    'P19_QC.html': ROLES.REVIEWER,

    // 관리자만
    'P30_UserManagement.html': ROLES.MASTER,
    'P90_SystemTest.html': ROLES.MASTER,
    'P91_Settings.html': ROLES.MASTER
};

// 액션별 권한
const ACTION_PERMISSIONS = {
    // 보고서 관련
    'report:create': ROLES.AUTHOR,
    'report:edit': ROLES.AUTHOR,
    'report:delete': ROLES.MASTER,
    'report:view': ROLES.VIEWER,
    'report:export': ROLES.AUTHOR,

    // 리뷰 관련
    'review:submit': ROLES.REVIEWER,
    'review:approve': ROLES.REVIEWER,
    'review:reject': ROLES.REVIEWER,

    // QC 관련
    'qc:validate': ROLES.REVIEWER,
    'qc:approve': ROLES.REVIEWER,

    // 사용자 관리
    'user:view': ROLES.MASTER,
    'user:create': ROLES.MASTER,
    'user:edit': ROLES.MASTER,
    'user:delete': ROLES.MASTER,
    'user:changeRole': ROLES.MASTER,

    // 시스템 설정
    'settings:view': ROLES.MASTER,
    'settings:edit': ROLES.MASTER,
    'system:test': ROLES.MASTER
};

/**
 * Permission Manager Class
 */
class PermissionManager {
    constructor() {
        this.currentUser = null;
    }

    /**
     * 현재 사용자 설정
     */
    setCurrentUser(user) {
        this.currentUser = user;
    }

    /**
     * 현재 사용자 가져오기
     */
    getCurrentUser() {
        if (!this.currentUser && window.authManager) {
            this.currentUser = window.authManager.getCurrentUser();
        }
        return this.currentUser;
    }

    /**
     * 역할 레벨 가져오기
     */
    getRoleLevel(role) {
        return ROLE_HIERARCHY[role] || 0;
    }

    /**
     * 사용자가 특정 역할 이상인지 확인
     */
    hasRole(requiredRole) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const userLevel = this.getRoleLevel(user.role);
        const requiredLevel = this.getRoleLevel(requiredRole);

        return userLevel >= requiredLevel;
    }

    /**
     * 사용자가 특정 역할인지 확인 (정확히 일치)
     */
    isRole(role) {
        const user = this.getCurrentUser();
        if (!user) return false;
        return user.role === role;
    }

    /**
     * 페이지 접근 권한 확인
     */
    canAccessPage(pageName) {
        const requiredRole = PAGE_PERMISSIONS[pageName];

        // 공개 페이지
        if (requiredRole === null) return true;

        // 권한 확인
        return this.hasRole(requiredRole);
    }

    /**
     * 액션 권한 확인
     */
    canPerformAction(action) {
        const requiredRole = ACTION_PERMISSIONS[action];
        if (!requiredRole) {
            console.warn(`Unknown action: ${action}`);
            return false;
        }
        return this.hasRole(requiredRole);
    }

    /**
     * 페이지 접근 제어 (가드)
     */
    guardPage(pageName) {
        const user = this.getCurrentUser();
        const requiredRole = PAGE_PERMISSIONS[pageName];

        // 공개 페이지
        if (requiredRole === null) return true;

        // 로그인 필요
        if (!user) {
            console.warn('⚠️ Authentication required');
            this.redirectToLogin();
            return false;
        }

        // 권한 확인
        if (!this.hasRole(requiredRole)) {
            console.warn(`⚠️ Insufficient permissions. Required: ${requiredRole}, Current: ${user.role}`);
            this.showAccessDenied(requiredRole);
            return false;
        }

        return true;
    }

    /**
     * 로그인 페이지로 리다이렉트
     */
    redirectToLogin() {
        const currentPage = window.location.pathname;
        const returnUrl = encodeURIComponent(currentPage);
        window.location.href = `P01_Login.html?returnUrl=${returnUrl}`;
    }

    /**
     * 접근 거부 처리
     */
    showAccessDenied(requiredRole) {
        const roleLabel = ROLE_LABELS[requiredRole] || requiredRole;
        alert(`접근 권한이 없습니다.\n이 페이지는 "${roleLabel}" 이상의 권한이 필요합니다.`);
        window.location.href = 'P10_Dashboard.html';
    }

    /**
     * UI 요소 표시/숨김 처리
     */
    toggleElementByRole(element, requiredRole) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (!element) return;

        if (this.hasRole(requiredRole)) {
            element.style.display = '';
            element.removeAttribute('disabled');
        } else {
            element.style.display = 'none';
        }
    }

    /**
     * 버튼 활성화/비활성화
     */
    enableButtonByRole(element, requiredRole) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (!element) return;

        if (this.hasRole(requiredRole)) {
            element.removeAttribute('disabled');
            element.classList.remove('disabled');
        } else {
            element.setAttribute('disabled', 'disabled');
            element.classList.add('disabled');
        }
    }

    /**
     * 여러 요소에 권한 적용
     */
    applyPermissions(config) {
        config.forEach(({ selector, role, action = 'toggle' }) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (action === 'toggle') {
                    this.toggleElementByRole(el, role);
                } else if (action === 'enable') {
                    this.enableButtonByRole(el, role);
                }
            });
        });
    }

    /**
     * 역할 정보 가져오기
     */
    getRoleInfo(role) {
        return {
            name: role,
            label: ROLE_LABELS[role] || role,
            description: ROLE_DESCRIPTIONS[role] || '',
            level: ROLE_HIERARCHY[role] || 0
        };
    }

    /**
     * 모든 역할 목록
     */
    getAllRoles() {
        return Object.values(ROLES).map(role => this.getRoleInfo(role));
    }

    /**
     * 현재 사용자의 역할 정보
     */
    getCurrentRoleInfo() {
        const user = this.getCurrentUser();
        if (!user) return null;
        return this.getRoleInfo(user.role);
    }
}

// Singleton instance
const permissionManager = new PermissionManager();

// 전역으로 내보내기
if (typeof window !== 'undefined') {
    window.ROLES = ROLES;
    window.ROLE_HIERARCHY = ROLE_HIERARCHY;
    window.ROLE_LABELS = ROLE_LABELS;
    window.PAGE_PERMISSIONS = PAGE_PERMISSIONS;
    window.ACTION_PERMISSIONS = ACTION_PERMISSIONS;
    window.permissionManager = permissionManager;
    window.PermissionManager = PermissionManager;
}
