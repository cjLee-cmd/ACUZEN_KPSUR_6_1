/**
 * Supabase Auth - 인증 관련 기능
 * js/db/supabase-auth.js
 *
 * 의존성: supabase-core.js
 */

(function() {
    'use strict';

    /**
     * SupabaseAuth - 인증 관련 기능
     */
    class SupabaseAuth {
        constructor(core) {
            this.core = core;
        }

        /**
         * 이메일/비밀번호 로그인
         */
        async signInWithPassword(email, password) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                console.log('✅ User signed in:', data.user.email);
                return { success: true, user: data.user, session: data.session };

            } catch (error) {
                console.error('❌ Sign in failed:', error.message);
                return { success: false, error: error.message };
            }
        }

        /**
         * Google OAuth 로그인
         */
        async signInWithGoogle() {
            await this.core.init();

            try {
                const { data, error } = await this.core.client.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: `${window.location.origin}/pages/P05_SystemCheck.html`,
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent'
                        }
                    }
                });

                if (error) throw error;

                console.log('✅ Google OAuth initiated');
                return { success: true, data };

            } catch (error) {
                console.error('❌ Google OAuth failed:', error.message);
                return { success: false, error: error.message };
            }
        }

        /**
         * OAuth 콜백 처리
         */
        async handleOAuthCallback() {
            await this.core.init();

            try {
                const { data, error } = await this.core.client.auth.getSession();

                if (error) throw error;

                if (data.session) {
                    const user = data.session.user;
                    console.log('✅ OAuth callback - user authenticated:', user.email);

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

                    localStorage.setItem('kpsur_session', JSON.stringify(sessionData));
                    return { success: true, user, session: sessionData };
                }

                return { success: false, error: 'No session found' };

            } catch (error) {
                console.error('❌ OAuth callback failed:', error.message);
                return { success: false, error: error.message };
            }
        }

        /**
         * 인증 상태 변경 리스너
         */
        onAuthStateChange(callback) {
            if (!this.core.client) {
                console.warn('Supabase client not initialized');
                return null;
            }

            return this.core.client.auth.onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event);
                callback(event, session);
            });
        }

        /**
         * 로그아웃
         */
        async signOut() {
            await this.core.init();

            try {
                const { error } = await this.core.client.auth.signOut();
                if (error) throw error;

                console.log('✅ User signed out');
                return { success: true };

            } catch (error) {
                console.error('❌ Sign out failed:', error.message);
                return { success: false, error: error.message };
            }
        }

        /**
         * 현재 세션 가져오기
         */
        async getSession() {
            await this.core.init();

            try {
                const { data, error } = await this.core.client.auth.getSession();
                if (error) throw error;

                return { success: true, session: data.session };

            } catch (error) {
                console.error('❌ Get session failed:', error.message);
                return { success: false, error: error.message };
            }
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.SupabaseAuth = SupabaseAuth;

        // supabaseCore가 이미 로드되었으면 인스턴스 생성
        if (window.supabaseCore) {
            window.supabaseAuth = new SupabaseAuth(window.supabaseCore);
        }
    }

})();
