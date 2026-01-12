/**
 * Common Page Initialization
 * pages/js/common/page-init.js
 *
 * 모든 페이지에서 공통으로 사용되는 초기화 로직
 */

(function() {
    'use strict';

    /**
     * PageInit - 공통 페이지 초기화 클래스
     */
    class PageInit {
        constructor() {
            this.initialized = false;
        }

        /**
         * 다크모드 초기화
         */
        initDarkMode() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
        }

        /**
         * 다크모드 토글
         */
        toggleDarkMode() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        }

        /**
         * 사용자 메뉴 설정
         */
        setupUserMenu() {
            try {
                const userMenuToggle = document.querySelector('.user-menu-toggle');
                const userMenu = document.querySelector('.user-menu');
                if (!userMenuToggle || !userMenu) return;

                userMenuToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    let dropdown = document.querySelector('.user-menu-dropdown');
                    if (!dropdown) {
                        dropdown = document.createElement('div');
                        dropdown.className = 'user-menu-dropdown';
                        dropdown.style.cssText = 'position:absolute;top:100%;right:0;margin-top:8px;background:var(--app-surface);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:180px;z-index:1000;';
                        dropdown.innerHTML = `
                            <div style="padding:8px 0;">
                                <a href="P91_Settings.html" style="display:block;padding:10px 16px;color:var(--app-text-strong);text-decoration:none;">설정</a>
                                <a href="#" onclick="clearSessionData();window.location.href='P01_Login.html'" style="display:block;padding:10px 16px;color:#EF4444;text-decoration:none;">로그아웃</a>
                            </div>
                        `;
                        userMenu.appendChild(dropdown);
                    }
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                });

                document.addEventListener('click', (e) => {
                    const dropdown = document.querySelector('.user-menu-dropdown');
                    if (dropdown && !userMenu.contains(e.target)) {
                        dropdown.style.display = 'none';
                    }
                });
            } catch (error) {
                console.error('[PageInit] setupUserMenu error:', error);
            }
        }

        /**
         * 배포 모드 업데이트
         */
        updateDeploymentMode(mode) {
            const badge = document.querySelector('.deployment-badge');
            if (badge) {
                badge.textContent = mode === 'production' ? '운영' : '테스트';
            }
        }

        /**
         * 세션 데이터로 UI 업데이트
         */
        updateUserDisplay(session) {
            if (!session) return;

            const elements = {
                userName: document.getElementById('userName'),
                userNameEl: document.querySelector('.user-name'),
                userRoleEl: document.querySelector('.user-role'),
                userPositionEl: document.querySelector('.user-position'),
                userAvatarEl: document.querySelector('.user-avatar')
            };

            if (elements.userName) elements.userName.textContent = session.userName || session.name || '';
            if (elements.userNameEl) elements.userNameEl.textContent = session.userName || session.name || '';
            if (elements.userRoleEl) elements.userRoleEl.textContent = session.userRole || session.role || '';
            if (elements.userPositionEl) elements.userPositionEl.textContent = session.userPosition || session.position || '';
            if (elements.userAvatarEl) elements.userAvatarEl.textContent = (session.userName || session.name || '?').charAt(0);
        }

        /**
         * 안전한 모노 아이콘 렌더링
         */
        renderIcon(iconId, extraClass = '') {
            if (typeof renderMonoIcon === 'function') {
                return renderMonoIcon(iconId, extraClass);
            }
            return `<svg class="mono-icon icon-${iconId} ${extraClass}" aria-hidden="true" focusable="false">
                <use href="#icon-${iconId}"></use>
            </svg>`;
        }

        /**
         * 시간 경과 계산
         */
        getTimeAgo(dateString) {
            if (!dateString) return '알 수 없음';

            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 1) return '방금 전';
            if (diffMins < 60) return `${diffMins}분 전`;
            if (diffHours < 24) return `${diffHours}시간 전`;
            if (diffDays < 7) return `${diffDays}일 전`;
            return date.toLocaleDateString('ko-KR');
        }

        /**
         * 안전한 네비게이션
         */
        navigateTo(page) {
            if (typeof setNavigationFlag === 'function') {
                setNavigationFlag();
            }
            if (typeof window.navigateTo === 'function') {
                window.navigateTo(page);
            } else {
                window.location.href = page;
            }
        }

        /**
         * 알림 표시
         */
        showAlert(message, type = 'info', duration = 3000) {
            // 기존 알림 제거
            const existingAlert = document.querySelector('.page-alert');
            if (existingAlert) existingAlert.remove();

            const alert = document.createElement('div');
            alert.className = `page-alert page-alert-${type}`;
            alert.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;

            const colors = {
                success: { bg: '#10B981', color: '#fff' },
                error: { bg: '#EF4444', color: '#fff' },
                warning: { bg: '#F59E0B', color: '#fff' },
                info: { bg: '#3B82F6', color: '#fff' }
            };

            const color = colors[type] || colors.info;
            alert.style.background = color.bg;
            alert.style.color = color.color;
            alert.textContent = message;

            document.body.appendChild(alert);

            if (duration > 0) {
                setTimeout(() => {
                    alert.style.animation = 'fadeOut 0.3s ease';
                    setTimeout(() => alert.remove(), 300);
                }, duration);
            }

            return alert;
        }

        /**
         * 로딩 표시
         */
        showLoading(container, message = '로딩 중...') {
            const loading = document.createElement('div');
            loading.className = 'page-loading';
            loading.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            `;
            loading.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                gap: 16px;
            `;

            if (container) {
                container.innerHTML = '';
                container.appendChild(loading);
            }

            return loading;
        }

        /**
         * 기본 초기화 실행
         */
        init(options = {}) {
            if (this.initialized) return;

            // 다크모드
            this.initDarkMode();

            // 세션 확인
            const session = typeof loadSessionData === 'function' ? loadSessionData() : null;
            if (session) {
                this.updateUserDisplay(session);
            }

            // 사용자 메뉴
            if (options.userMenu !== false) {
                this.setupUserMenu();
            }

            // 배포 모드
            const deploymentMode = localStorage.getItem('deploymentMode') || 'test';
            this.updateDeploymentMode(deploymentMode);

            this.initialized = true;
            console.log('[PageInit] Initialized');

            return this;
        }
    }

    // 전역 인스턴스 생성
    const pageInit = new PageInit();

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.PageInit = PageInit;
        window.pageInit = pageInit;

        // 전역 유틸 함수
        window.toggleDarkMode = () => pageInit.toggleDarkMode();
    }

})();
