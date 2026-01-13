/**
 * session.js
 * 세션 관리 유틸리티 (localStorage 기반)
 */

const SESSION_KEY = 'kpsur_session';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24시간 (auth.js, page-guard.js와 통일)

/**
 * 세션 데이터 로드
 * @returns {Object|null} 세션 데이터 또는 null
 */
function loadSessionData() {
    try {
        const sessionStr = localStorage.getItem(SESSION_KEY);
        if (!sessionStr) {
            return null;
        }

        const session = JSON.parse(sessionStr);

        // rememberMe가 true면 타임아웃 체크 건너뜀 (auth.js와 동일한 로직)
        if (session.rememberMe) {
            return session;
        }

        // 세션 타임아웃 체크
        if (session.timestamp || session.loginTime) {
            const now = Date.now();
            // timestamp 또는 loginTime 기준으로 체크 (auth.js 호환)
            const sessionTime = session.timestamp || new Date(session.loginTime).getTime();
            const elapsed = now - sessionTime;

            if (elapsed > SESSION_TIMEOUT) {
                console.warn('Session expired (24h timeout)');
                clearSessionData();
                return null;
            }
        }

        return session;
    } catch (error) {
        console.error('Session load error:', error);
        return null;
    }
}

/**
 * 세션 데이터 저장
 * @param {Object} data - 저장할 세션 데이터
 * @returns {boolean} 성공 여부
 */
function saveSessionData(data) {
    try {
        if (!data || typeof data !== 'object') {
            console.warn('saveSessionData: data must be an object');
            return false;
        }

        // 타임스탬프 추가
        const sessionData = {
            ...data,
            timestamp: Date.now()
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        return true;
    } catch (error) {
        console.error('Session save error:', error);
        return false;
    }
}

/**
 * 세션 데이터 삭제
 */
function clearSessionData() {
    try {
        localStorage.removeItem(SESSION_KEY);
    } catch (error) {
        console.error('Session clear error:', error);
    }
}

/**
 * 로그인 상태 확인
 * @returns {boolean} 로그인 여부
 */
function isAuthenticated() {
    const session = loadSessionData();
    return session !== null && session.email && session.userName;
}

/**
 * 현재 사용자 정보 가져오기
 * @returns {Object|null} 사용자 정보
 */
function getCurrentUser() {
    const session = loadSessionData();
    if (!session) {
        return null;
    }

    return {
        userName: session.userName || '사용자',
        userRole: session.userRole || 'Viewer',
        email: session.email || '',
        userId: session.userId || null
    };
}

/**
 * 세션 데이터 업데이트 (부분 업데이트)
 * @param {Object} updates - 업데이트할 데이터
 * @returns {boolean} 성공 여부
 */
function updateSessionData(updates) {
    try {
        const currentSession = loadSessionData();
        if (!currentSession) {
            return false;
        }

        const updatedSession = {
            ...currentSession,
            ...updates,
            timestamp: Date.now()
        };

        return saveSessionData(updatedSession);
    } catch (error) {
        console.error('Session update error:', error);
        return false;
    }
}

/**
 * 배포 모드 가져오기
 * @returns {string} 'test' 또는 'production'
 */
function getDeploymentMode() {
    try {
        return localStorage.getItem('deploymentMode') || 'test';
    } catch (error) {
        console.error('getDeploymentMode error:', error);
        return 'test';
    }
}

/**
 * 배포 모드 설정
 * @param {string} mode - 'test' 또는 'production'
 */
function setDeploymentMode(mode) {
    try {
        if (mode !== 'test' && mode !== 'production') {
            console.warn('Invalid deployment mode:', mode);
            return;
        }
        localStorage.setItem('deploymentMode', mode);
    } catch (error) {
        console.error('setDeploymentMode error:', error);
    }
}

/**
 * 네비게이션 보안 체크
 * localStorage 세션이 유효하면 통과, 없으면 로그인으로 리다이렉트
 * @returns {boolean} true: 정상, false: 리다이렉트
 */
function checkNavigationSecurity() {
    try {
        const currentPage = window.location.pathname;

        // 로그인 페이지는 체크 제외
        if (currentPage.includes('P01_Login') || currentPage.includes('index.html') || currentPage.endsWith('/')) {
            return true;
        }

        // 공개 페이지 제외 (회원가입, 비밀번호 찾기, 시스템 테스트)
        if (currentPage.includes('P02_') || currentPage.includes('P03_') || currentPage.includes('P90_')) {
            return true;
        }

        // localStorage 세션 확인 (sessionStorage 플래그 대신)
        const session = loadSessionData();

        if (session && session.email) {
            // 유효한 세션 있음 - 통과
            return true;
        }

        // 세션 없음 - 로그인 페이지로 리다이렉트
        console.warn('Security: No valid session. Redirecting to login.');

        const basePath = window.location.pathname.split('/pages/')[0];
        window.location.href = `${basePath}/pages/P01_Login.html`;
        return false;

    } catch (error) {
        console.error('checkNavigationSecurity error:', error);
        return true; // 에러 시 통과
    }
}

/**
 * 네비게이션 플래그 설정 (외부에서 수동 호출용)
 * 로그인 성공 후 호출하여 다음 페이지 이동 허용
 */
function setNavigationFlag() {
    try {
        sessionStorage.setItem('kpsur_valid_navigation', 'true');
    } catch (error) {
        console.error('setNavigationFlag error:', error);
    }
}

// 전역으로 내보내기 (window 객체)
if (typeof window !== 'undefined') {
    window.loadSessionData = loadSessionData;
    window.saveSessionData = saveSessionData;
    window.clearSessionData = clearSessionData;
    window.isAuthenticated = isAuthenticated;
    window.getCurrentUser = getCurrentUser;
    window.updateSessionData = updateSessionData;
    window.getDeploymentMode = getDeploymentMode;
    window.setDeploymentMode = setDeploymentMode;
    window.checkNavigationSecurity = checkNavigationSecurity;
    window.setNavigationFlag = setNavigationFlag;

    // 자동 보안 체크 제거 - page-guard.js가 세션 검증을 담당
    // (중복 체크로 인한 예측 불가능한 리다이렉트 방지)
}
