/**
 * Supabase Core - 초기화 및 연결 관리
 * js/db/supabase-core.js
 */

(function() {
    'use strict';

    // CONFIG fallback
    if (!window.CONFIG) {
        window.CONFIG = {
            SUPABASE_URL: 'https://toelnxgizxwbdikskmxa.supabase.co',
            SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZWxueGdpenh3YmRpa3NrbXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDAyMzUsImV4cCI6MjA3NzU3NjIzNX0.mpBAWTufodmfPUp6nmg7Qez6uygrplK9S91xl8c4mR8'
        };
    }

    /**
     * SupabaseCore - 클라이언트 초기화 및 기본 연결 관리
     */
    class SupabaseCore {
        constructor() {
            this.client = null;
            this.initialized = false;
        }

        /**
         * Supabase 클라이언트 초기화
         */
        async init() {
            if (this.initialized) {
                return this.client;
            }

            try {
                // Supabase SDK 로드 확인
                if (typeof window.supabase === 'undefined') {
                    throw new Error('Supabase SDK not loaded');
                }

                const { createClient } = window.supabase;
                this.client = createClient(
                    window.CONFIG.SUPABASE_URL,
                    window.CONFIG.SUPABASE_ANON_KEY
                );

                this.initialized = true;
                console.log('✅ Supabase client initialized');
                return this.client;

            } catch (error) {
                console.error('❌ Supabase initialization failed:', error);
                throw error;
            }
        }

        /**
         * 클라이언트 인스턴스 가져오기
         */
        getClient() {
            return this.client;
        }

        /**
         * 초기화 상태 확인
         */
        isInitialized() {
            return this.initialized;
        }

        /**
         * 범용 쿼리 빌더 접근
         */
        async query(table) {
            await this.init();
            return this.client.from(table);
        }

        /**
         * 파일 업로드 (Supabase Storage)
         */
        async uploadFile(bucket, path, file) {
            await this.init();

            try {
                const { data, error } = await this.client.storage
                    .from(bucket)
                    .upload(path, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) throw error;

                console.log('✅ File uploaded:', path);
                return { success: true, path: data.path };

            } catch (error) {
                console.error('❌ File upload failed:', error.message);
                return { success: false, error: error.message };
            }
        }

        /**
         * 파일 다운로드 URL 가져오기
         */
        async getFileUrl(bucket, path) {
            await this.init();

            try {
                const { data } = this.client.storage
                    .from(bucket)
                    .getPublicUrl(path);

                console.log('✅ File URL retrieved:', path);
                return { success: true, url: data.publicUrl };

            } catch (error) {
                console.error('❌ Get file URL failed:', error.message);
                return { success: false, error: error.message };
            }
        }
    }

    // Singleton instance
    const supabaseCore = new SupabaseCore();

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.SupabaseCore = SupabaseCore;
        window.supabaseCore = supabaseCore;
    }

})();
