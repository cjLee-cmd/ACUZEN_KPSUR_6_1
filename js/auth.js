/**
 * Authentication & Session Management
 * 사용자 인증 및 세션 관리
 */

// 전역 의존성 fallback (config.js에서 이미 선언된 경우 재선언하지 않음)
if (!window.CONFIG) {
    window.CONFIG = {
        PAGES: {
            LOGIN: 'P01_Login.html',
            DASHBOARD: 'P10_Dashboard.html',
            SYSTEM_CHECK: 'P05_SystemCheck.html'
        }
    };
}

if (!window.Storage) {
    window.Storage = {
        get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
        set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
        remove: (key) => { try { localStorage.removeItem(key); } catch {} }
    };
}

// env fallback
if (!window.env) {
    window.env = {
        getConfig: () => ({
            features: { testAccounts: true },
            isTest: true
        })
    };
}

// config.js에서 로드된 전역 객체 사용 (CONFIG, Storage)
// (const 재선언 금지 - 전역 스코프 충돌 방지)

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.currentSession = null;
    }

    /**
     * 사용자를 users 테이블에 동기화 (upsert)
     * reports.created_by FK 제약조건을 충족하기 위해 필요
     */
    async syncUserToDatabase(userId, email, name, role, position = '') {
        try {
            if (!window.supabaseClient || !window.supabaseClient.client) {
                console.warn('⚠️ syncUserToDatabase: supabaseClient not available');
                return { success: false, error: 'supabaseClient not available' };
            }

            // 기본 필드만 사용 (position 컬럼이 없을 수 있음)
            const userData = {
                id: userId,
                email: email,
                name: name,
                role: role
            };

            const { data, error } = await window.supabaseClient.client
                .from('users')
                .upsert(userData, { onConflict: 'id' })
                .select()
                .single();

            if (error) {
                // RLS 오류 시에도 진행 가능하도록 경고만 출력
                console.warn('⚠️ syncUserToDatabase failed (RLS?):', error.message);
                return { success: false, error: error.message };
            }

            console.log('✅ User synced to database:', email);
            return { success: true, user: data };
        } catch (e) {
            console.warn('⚠️ syncUserToDatabase error:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * 로그인 (테스트 계정 + Supabase Auth)
     * 테스트 계정은 개발 모드에서만 활성화됨
     */
    async login(email, password, rememberMe = false) {
        // 테스트 계정 (개발 모드에서만 활성화)
        const testAccountsEnabled = window.env.getConfig().features.testAccounts;

        if (testAccountsEnabled) {
            const testAccounts = {
                'author@kpsur.test': {
                    password: 'test1234',
                    id: '6f19f4a9-48ec-4a43-a032-b8f79e71d2d3',
                    name: 'Test Author',
                    role: 'Author',
                    position: '리뷰어'
                },
                'main@main.com': {
                    password: '1111',
                    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    name: 'Master Admin',
                    role: 'Master',
                    position: '약물감시 팀장'
                },
                // Supabase Auth에 등록된 테스트 계정 (DB 저장 가능)
                'master@kpsur.test': {
                    password: 'master123',
                    id: '3d4afddc-14b5-491b-8aca-0e80dbafea2e',
                    name: 'Master Admin',
                    role: 'Master',
                    position: '약물감시 팀장',
                    supabaseAuth: true  // Supabase Auth 계정 표시
                }
            };

            // 테스트 계정 확인
            const testAccount = testAccounts[email];

            if (testAccount && testAccount.password === password) {
            // 테스트 계정 로그인 성공
            // session.js 형식에 맞춤 (email, userName, userRole, userPosition, userId, timestamp)
            const sessionData = {
                userId: testAccount.id,
                email: email,
                userName: testAccount.name,
                userRole: testAccount.role,
                userPosition: testAccount.position,
                loginTime: new Date().toISOString(),
                rememberMe: rememberMe,
                type: 'test',
                timestamp: Date.now()
            };
            // 기존 호환성을 위한 user 객체
            const userObj = {
                id: testAccount.id,
                email: email,
                name: testAccount.name,
                role: testAccount.role,
                position: testAccount.position
            };

            this.currentUser = userObj;
            this.currentSession = sessionData;
            Storage.set(CONFIG.STORAGE_KEYS.SESSION, sessionData);

            // Supabase 인증도 시도 (RLS 정책 통과를 위해)
            try {
                if (window.supabaseClient) {
                    const supabaseResult = await window.supabaseClient.signInWithPassword(email, password);
                    if (supabaseResult.success) {
                        console.log('✅ Supabase auth also successful for test account');
                        sessionData.type = 'test+supabase';
                        Storage.set(CONFIG.STORAGE_KEYS.SESSION, sessionData);

                        // users 테이블에 동기화 (reports FK 충족)
                        await this.syncUserToDatabase(
                            testAccount.id,
                            email,
                            testAccount.name,
                            testAccount.role,
                            testAccount.position
                        );
                    } else {
                        console.log('ℹ️ Supabase auth failed:', supabaseResult.error);
                    }
                }
            } catch (e) {
                console.log('ℹ️ Supabase auth skipped for test account:', e.message);
            }

            console.log('✅ Login successful (test account):', email);

            return {
                success: true,
                user: sessionData.user,
                session: sessionData
            };
            }
        }

        // Supabase Auth 시도
        if (!window.supabaseClient) {
            return { success: false, error: 'Supabase client not initialized' };
        }
        const result = await window.supabaseClient.signInWithPassword(email, password);

        if (result.success) {
            // session.js 형식에 맞춤 (email, userName, userRole, userPosition, userId, timestamp)
            const sessionData = {
                userId: result.user.id,
                email: result.user.email,
                userName: result.user.user_metadata?.name || email,
                userRole: result.user.user_metadata?.role || 'Author',
                userPosition: result.user.user_metadata?.position || '',
                loginTime: new Date().toISOString(),
                rememberMe: rememberMe,
                type: 'supabase',
                timestamp: Date.now()
            };
            // 기존 호환성을 위한 user 객체
            const userObj = {
                id: result.user.id,
                email: result.user.email,
                name: result.user.user_metadata?.name || email,
                role: result.user.user_metadata?.role || 'Author',
                position: result.user.user_metadata?.position || ''
            };

            this.currentUser = userObj;
            this.currentSession = sessionData;
            Storage.set(CONFIG.STORAGE_KEYS.SESSION, sessionData);

            // users 테이블에 동기화 (reports FK 충족)
            await this.syncUserToDatabase(
                result.user.id,
                result.user.email,
                result.user.user_metadata?.name || email,
                result.user.user_metadata?.role || 'Author',
                result.user.user_metadata?.position || ''
            );

            console.log('✅ Login successful (Supabase):', email);

            return {
                success: true,
                user: sessionData.user,
                session: sessionData
            };
        }

        // 로그인 실패
        console.error('❌ Login failed:', result.error);
        return {
            success: false,
            error: '이메일 또는 비밀번호가 올바르지 않습니다.'
        };
    }

    /**
     * 로그아웃
     */
    async logout() {
        // Supabase 로그아웃
        if (this.currentSession?.type === 'supabase' || this.currentSession?.type === 'test+supabase') {
            if (window.supabaseClient) {
                await window.supabaseClient.signOut();
            }
        }

        // 세션 정보 제거
        this.currentUser = null;
        this.currentSession = null;
        Storage.remove(CONFIG.STORAGE_KEYS.SESSION);
        Storage.remove(CONFIG.STORAGE_KEYS.CURRENT_REPORT);
        Storage.remove(CONFIG.STORAGE_KEYS.LAST_STAGE);

        console.log('✅ Logout successful');

        return { success: true };
    }

    /**
     * 세션 확인
     */
    checkSession() {
        const session = Storage.get(CONFIG.STORAGE_KEYS.SESSION);

        if (!session) {
            return { authenticated: false };
        }

        // Remember Me 확인
        if (!session.rememberMe) {
            // 로그인 시간 확인 (24시간)
            const loginTime = new Date(session.loginTime);
            const now = new Date();
            const hoursPassed = (now - loginTime) / (1000 * 60 * 60);

            if (hoursPassed > 24) {
                this.logout();
                return { authenticated: false, expired: true };
            }
        }

        // Reconstruct user object from session data
        // (session stores userId, userName, userRole, userPosition at root level, not as session.user)
        const user = {
            id: session.userId,
            email: session.email,
            name: session.userName,
            role: session.userRole,
            position: session.userPosition || ''
        };
        this.currentUser = user;
        this.currentSession = session;

        return {
            authenticated: true,
            user: user,
            session: session
        };
    }

    /**
     * 현재 사용자 가져오기
     */
    getCurrentUser() {
        if (!this.currentUser) {
            const session = this.checkSession();
            if (session.authenticated) {
                return session.user;
            }
            return null;
        }
        return this.currentUser;
    }

    /**
     * 권한 확인
     */
    hasRole(role) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const roleHierarchy = {
            'Master': 4,
            'Author': 3,
            'Reviewer': 2,
            'Viewer': 1
        };

        const userLevel = roleHierarchy[user.role] || 0;
        const requiredLevel = roleHierarchy[role] || 0;

        return userLevel >= requiredLevel;
    }

    /**
     * 로그인 페이지로 리다이렉트
     */
    redirectToLogin() {
        window.location.href = `pages/${CONFIG.PAGES.LOGIN}`;
    }

    /**
     * 페이지 접근 권한 확인 (가드)
     */
    requireAuth(requiredRole = null) {
        const session = this.checkSession();

        if (!session.authenticated) {
            console.warn('⚠️ Authentication required');
            this.redirectToLogin();
            return false;
        }

        if (requiredRole && !this.hasRole(requiredRole)) {
            console.warn('⚠️ Insufficient permissions');
            alert('접근 권한이 없습니다.');
            window.location.href = `pages/${CONFIG.PAGES.DASHBOARD}`;
            return false;
        }

        return true;
    }
}

// Singleton instance
const authManager = new AuthManager();

// 전역으로 내보내기 (window 객체)
if (typeof window !== 'undefined') {
    window.authManager = authManager;
    window.AuthManager = AuthManager;
}

