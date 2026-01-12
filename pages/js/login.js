/**
 * Login Page Script
 * pages/js/login.js
 *
 * P01_Login.html의 인라인 스크립트 분리
 */

(function() {
    'use strict';

    // 앱 버전
    const APP_VERSION = 'v.0.1.2.';

    // DOM Elements
    let loginForm, loginBtn, alertBox, googleLoginBtn;

    /**
     * 알림 표시
     */
    function showAlert(message, type = 'error') {
        if (!alertBox) return;

        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
        alertBox.style.display = 'block';

        setTimeout(() => {
            alertBox.style.display = 'none';
        }, 5000);
    }

    /**
     * 로그인 폼 제출 핸들러
     */
    async function handleLoginSubmit(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;

        // 로딩 시작
        loginBtn.classList.add('loading');

        try {
            // AuthManager를 통한 로그인
            const result = await window.authManager.login(email, password, remember);

            if (result.success) {
                showAlert('로그인 성공! 시스템 점검 중...', 'success');

                // 네비게이션 플래그 설정
                if (typeof setNavigationFlag === 'function') {
                    setNavigationFlag();
                }

                // 시스템 체크 페이지로 이동
                setTimeout(() => {
                    window.location.href = window.CONFIG?.PAGES?.SYSTEM_CHECK || 'P05_SystemCheck.html';
                }, 1000);
            } else {
                showAlert(result.error || '이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
                loginBtn.classList.remove('loading');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('로그인 중 오류가 발생했습니다.', 'error');
            loginBtn.classList.remove('loading');
        }
    }

    /**
     * Google 로그인 핸들러
     */
    async function handleGoogleLogin() {
        try {
            googleLoginBtn.disabled = true;
            googleLoginBtn.innerHTML = '<div class="loading-spinner" style="display:block;"></div>';

            if (window.supabaseClient) {
                const result = await window.supabaseClient.signInWithGoogle();
                if (!result.success) {
                    showAlert(result.error || 'Google 로그인에 실패했습니다.', 'error');
                    resetGoogleButton();
                }
                // OAuth는 리다이렉트되므로 성공시 여기에 도달하지 않음
            } else {
                showAlert('Supabase 클라이언트가 초기화되지 않았습니다.', 'error');
                resetGoogleButton();
            }
        } catch (error) {
            console.error('Google login error:', error);
            showAlert('Google 로그인 중 오류가 발생했습니다.', 'error');
            resetGoogleButton();
        }
    }

    /**
     * Google 버튼 리셋
     */
    function resetGoogleButton() {
        if (!googleLoginBtn) return;

        googleLoginBtn.disabled = false;
        googleLoginBtn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google 계정으로 로그인
        `;
    }

    /**
     * 다크모드 토글
     */
    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    /**
     * 초기화
     */
    function initialize() {
        // 버전 표시
        const headerVersion = document.getElementById('headerVersion');
        const badgeVersion = document.getElementById('badgeVersion');
        if (headerVersion) headerVersion.textContent = APP_VERSION;
        if (badgeVersion) badgeVersion.textContent = APP_VERSION;

        // 전역 변수 확인
        if (!window.CONFIG) {
            window.CONFIG = { PAGES: { SYSTEM_CHECK: 'P05_SystemCheck.html' } };
        }

        // DOM 요소 참조
        loginForm = document.getElementById('loginForm');
        loginBtn = document.getElementById('loginBtn');
        alertBox = document.getElementById('alertBox');
        googleLoginBtn = document.getElementById('googleLoginBtn');

        // 이벤트 리스너 등록
        if (loginForm) {
            loginForm.addEventListener('submit', handleLoginSubmit);
        }

        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', handleGoogleLogin);
        }

        // 엔터키 폼 제출
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && document.activeElement.tagName !== 'BUTTON') {
                if (loginForm) loginForm.requestSubmit();
            }
        });

        // 다크모드 토글
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        // 다크모드 초기 상태
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // DOM Ready 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // 전역 함수 노출 (HTML onclick 호환용)
    window.LoginPage = {
        showAlert,
        toggleTheme
    };

})();
