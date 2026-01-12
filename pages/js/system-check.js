/**
 * System Check Page Script
 * pages/js/system-check.js
 *
 * P05_SystemCheck.html 인라인 스크립트 분리
 */

(function() {
    'use strict';

    // === 설정 ===
    const SUPABASE_URL = 'https://toelnxgizxwbdikskmxa.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZWxueGdpenh3YmRpa3NrbXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDAyMzUsImV4cCI6MjA3NzU3NjIzNX0.mpBAWTufodmfPUp6nmg7Qez6uygrplK9S91xl8c4mR8';

    // === 상태 관리 ===
    let currentTest = 0;
    const totalTests = 3;
    const testResults = {
        llm: null,
        db: null,
        storage: null
    };

    // Supabase 클라이언트
    let supabaseClient = null;

    // === 다크모드 토글 기능 ===
    function getPreferredTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    function setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        applyTheme(getPreferredTheme());

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        });

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    // === OAuth 콜백 처리 ===
    async function handleOAuthCallback() {
        if (!supabaseClient) return;

        const hash = window.location.hash;
        const params = new URLSearchParams(window.location.search);

        // OAuth 리다이렉트 감지 (access_token이 hash 또는 query에 있는 경우)
        if (hash.includes('access_token') || params.has('code')) {
            console.log('OAuth callback detected, processing...');

            try {
                const { data, error } = await supabaseClient.auth.getSession();

                if (error) throw error;

                if (data.session) {
                    const user = data.session.user;
                    console.log('OAuth login successful:', user.email);

                    // 세션 데이터 생성 (기존 형식에 맞춤)
                    const sessionData = {
                        userId: user.id,
                        email: user.email,
                        userName: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
                        userRole: user.user_metadata?.role || 'Author',
                        userPosition: user.user_metadata?.position || '',
                        loginTime: new Date().toISOString(),
                        rememberMe: true,
                        type: 'google',
                        timestamp: Date.now(),
                        avatarUrl: user.user_metadata?.avatar_url || null
                    };

                    // localStorage에 세션 저장
                    localStorage.setItem('kpsur_session', JSON.stringify(sessionData));

                    // URL에서 OAuth 파라미터 제거 (깔끔한 URL)
                    history.replaceState(null, '', window.location.pathname);
                }
            } catch (error) {
                console.error('OAuth callback error:', error);
            }
        }
    }

    // === 배경 파티클 생성 ===
    function createParticles() {
        const container = document.getElementById('particles');
        if (!container) return;

        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 20 + 's';
            particle.style.animationDuration = (15 + Math.random() * 10) + 's';
            container.appendChild(particle);
        }
    }

    // === 진행률 업데이트 ===
    function updateProgress(current, total, text) {
        const percent = Math.round((current / total) * 100);
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        const progressText = document.getElementById('progressText');

        if (progressFill) progressFill.style.width = percent + '%';
        if (progressPercent) progressPercent.textContent = percent + '%';
        if (progressText) progressText.textContent = text;
    }

    // === 테스트 항목 상태 업데이트 ===
    function updateTestStatus(testId, status, message) {
        const testItem = document.getElementById(testId);
        if (!testItem) return;

        const statusEl = testItem.querySelector('.test-status');
        const spinner = testItem.querySelector('.spinner');
        const icon = testItem.querySelector('.test-icon');

        // 클래스 초기화
        testItem.classList.remove('active', 'success', 'error');

        if (status === 'testing') {
            testItem.classList.add('active');
            if (spinner) spinner.style.display = 'block';
            if (statusEl) statusEl.textContent = message || '테스트 중...';
        } else if (status === 'success') {
            testItem.classList.add('success');
            if (spinner) spinner.style.display = 'none';
            if (icon) icon.textContent = '✅';
            if (statusEl) statusEl.textContent = message || '연결 성공';
        } else if (status === 'error') {
            testItem.classList.add('error');
            if (spinner) spinner.style.display = 'none';
            if (icon) icon.textContent = '❌';
            if (statusEl) statusEl.textContent = message || '연결 실패';
        }
    }

    // === LLM 연결 테스트 ===
    async function testLLMConnection() {
        updateTestStatus('testLLM', 'testing', 'AI 엔진 연결 중...');
        updateProgress(1, totalTests, 'AI 엔진 연결 테스트');

        try {
            // localStorage에서 API 키 가져오기
            const apiKeyRaw = localStorage.getItem('GOOGLE_API_KEY');

            if (!apiKeyRaw) {
                throw new Error('Gemini API 키가 설정되지 않았습니다. 시스템 설정에서 API 키를 등록해주세요.');
            }

            // API 키 파싱 (JSON 형식과 일반 문자열 모두 지원)
            let apiKey;
            try {
                apiKey = JSON.parse(apiKeyRaw);
            } catch {
                apiKey = apiKeyRaw;
            }

            // 간단한 연결 테스트 - gemini-3-flash-preview 사용
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Hello' }] }]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: API 응답 실패`);
            }

            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('응답 데이터가 올바르지 않습니다');
            }

            testResults.llm = true;
            updateTestStatus('testLLM', 'success', '연결 성공');
            currentTest++;
            return true;

        } catch (error) {
            testResults.llm = false;
            updateTestStatus('testLLM', 'error', error.message);
            throw error;
        }
    }

    // === 데이터베이스 연결 테스트 ===
    async function testDatabaseConnection() {
        updateTestStatus('testDB', 'testing', '데이터베이스 연결 중...');
        updateProgress(2, totalTests, '데이터베이스 연결 테스트');

        try {
            // 세션 확인
            const session = JSON.parse(localStorage.getItem('session') || '{}');
            if (!session.user || !session.user.id) {
                throw new Error('사용자 세션이 유효하지 않습니다');
            }

            // 간단한 쿼리 테스트
            const { data, error } = await supabaseClient
                .from('system_settings')
                .select('count')
                .limit(1);

            if (error) {
                throw new Error(error.message);
            }

            testResults.db = true;
            updateTestStatus('testDB', 'success', '연결 성공');
            currentTest++;
            return true;

        } catch (error) {
            testResults.db = false;
            updateTestStatus('testDB', 'error', error.message);
            throw error;
        }
    }

    // === 파일 저장소 연결 테스트 ===
    async function testStorageConnection() {
        updateTestStatus('testStorage', 'testing', '저장소 연결 중...');
        updateProgress(3, totalTests, '파일 저장소 연결 테스트');

        try {
            // Storage 버킷 목록 조회
            const { data, error } = await supabaseClient.storage.listBuckets();

            if (error) {
                throw new Error(error.message);
            }

            testResults.storage = true;
            updateTestStatus('testStorage', 'success', '연결 성공');
            currentTest++;
            return true;

        } catch (error) {
            testResults.storage = false;
            updateTestStatus('testStorage', 'error', error.message);
            throw error;
        }
    }

    // === 전체 테스트 실행 ===
    async function runAllTests() {
        try {
            // 각 테스트를 순차적으로 실행
            await testLLMConnection();
            await new Promise(resolve => setTimeout(resolve, 500));

            await testDatabaseConnection();
            await new Promise(resolve => setTimeout(resolve, 500));

            await testStorageConnection();
            await new Promise(resolve => setTimeout(resolve, 500));

            // 모든 테스트 성공
            updateProgress(totalTests, totalTests, '모든 점검 완료!');

            // 네비게이션 플래그 설정
            if (typeof setNavigationFlag === 'function') {
                setNavigationFlag();
            }

            // 1초 후 대시보드로 이동
            setTimeout(() => {
                window.location.href = 'P10_Dashboard.html';
            }, 1000);

        } catch (error) {
            showError(error.message);
        }
    }

    // === 에러 표시 ===
    function showError(message) {
        const errorDetails = document.getElementById('errorDetails');
        const errorMessage = document.getElementById('errorMessage');

        if (!errorDetails || !errorMessage) return;

        // Check if it's an API key error and enhance with link to Settings
        if (message.includes('Gemini API 키가 설정되지 않았습니다')) {
            errorMessage.innerHTML = `
                Gemini API 키가 설정되지 않았습니다.<br><br>
                <a href="#" onclick="SystemCheckPage.navigateToSettings(); return false;" style="color: #12305B; font-weight: 600; text-decoration: underline; cursor: pointer;">
                    ⚙️ 시스템 설정에서 API 키 등록하기 →
                </a>
            `;
        } else {
            errorMessage.textContent = message;
        }

        errorDetails.classList.add('show');
        updateProgress(currentTest, totalTests, '점검 실패');
    }

    // === 재시도 ===
    function retryTests() {
        // 에러 메시지 숨기기
        const errorDetails = document.getElementById('errorDetails');
        if (errorDetails) errorDetails.classList.remove('show');

        // 상태 초기화
        currentTest = 0;
        testResults.llm = null;
        testResults.db = null;
        testResults.storage = null;

        // 테스트 항목 초기화
        const icons = ['🤖', '💾', '📁'];
        ['testLLM', 'testDB', 'testStorage'].forEach((id, index) => {
            const testItem = document.getElementById(id);
            if (!testItem) return;

            testItem.classList.remove('active', 'success', 'error');
            const statusEl = testItem.querySelector('.test-status');
            const spinner = testItem.querySelector('.spinner');
            const icon = testItem.querySelector('.test-icon');

            if (statusEl) statusEl.textContent = '대기 중';
            if (spinner) spinner.style.display = 'none';
            if (icon) icon.textContent = icons[index];
        });

        // 진행률 초기화
        updateProgress(0, totalTests, '준비 중...');

        // 재실행
        setTimeout(runAllTests, 500);
    }

    // === 건너뛰기 ===
    function skipToMain() {
        if (confirm('시스템 점검을 건너뛰면 일부 기능이 제대로 작동하지 않을 수 있습니다.\n그래도 계속하시겠습니까?')) {
            if (typeof setNavigationFlag === 'function') {
                setNavigationFlag();
            }
            window.location.href = 'P10_Dashboard.html';
        }
    }

    // === 설정 페이지로 이동 ===
    function navigateToSettings() {
        if (typeof navigateTo === 'function') {
            navigateTo('P91_Settings.html');
        } else {
            window.location.href = 'P91_Settings.html';
        }
    }

    // === 초기화 ===
    function initialize() {
        // 테마 토글 설정
        setupThemeToggle();

        // Supabase 클라이언트 초기화
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        // OAuth 콜백 처리
        handleOAuthCallback();

        // 배경 파티클 생성
        createParticles();

        // 세션 확인
        const session = JSON.parse(localStorage.getItem('session') || '{}');
        if (!session.user) {
            // 세션이 없으면 로그인 페이지로 리다이렉트
            window.location.href = 'P01_Login.html';
            return;
        }

        // 1초 후 테스트 시작
        setTimeout(runAllTests, 1000);
    }

    // === 페이지 로드 시 실행 ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // 전역 함수 노출 (HTML onclick 호환용)
    window.SystemCheckPage = {
        retryTests,
        skipToMain,
        navigateToSettings
    };

    // 전역 함수로도 노출 (기존 HTML 호환)
    window.retryTests = retryTests;
    window.skipToMain = skipToMain;

})();
