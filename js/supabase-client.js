/**
 * Supabase Client - 호환성 래퍼
 *
 * ⚠️ DEPRECATED: 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새로운 코드는 js/db/ 모듈 구조를 직접 사용하세요.
 *
 * 모듈 로드 순서:
 * 1. js/db/supabase-core.js
 * 2. js/db/supabase-auth.js
 * 3. js/db/supabase-reports.js
 * 4. js/db/supabase-documents.js
 * 5. js/db/supabase-llm.js
 * 6. js/db/index.js
 *
 * 또는 이 파일 하나만 로드 (레거시 호환)
 */

(function() {
    'use strict';

    // 모듈 구조가 이미 로드되었는지 확인
    if (window.supabaseClient && window.KPSUR?.db) {
        console.log('✅ Supabase modular structure already loaded');
        return;
    }

    // CONFIG fallback
    if (!window.CONFIG) {
        window.CONFIG = {
            SUPABASE_URL: 'https://toelnxgizxwbdikskmxa.supabase.co',
            SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZWxueGdpenh3YmRpa3NrbXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDAyMzUsImV4cCI6MjA3NzU3NjIzNX0.mpBAWTufodmfPUp6nmg7Qez6uygrplK9S91xl8c4mR8'
        };
    }

    /**
     * LegacySupabaseClient - 모듈화된 구조로 마이그레이션되기 전 호환용
     * 모든 메서드를 인라인으로 포함 (js/db/ 모듈 미로드 시 폴백)
     */
    class LegacySupabaseClient {
        constructor() {
            this.client = null;
            this.initialized = false;
        }

        async init() {
            if (this.initialized) return this.client;

            try {
                if (typeof window.supabase === 'undefined') {
                    throw new Error('Supabase SDK not loaded');
                }

                const { createClient } = window.supabase;
                this.client = createClient(
                    window.CONFIG.SUPABASE_URL,
                    window.CONFIG.SUPABASE_ANON_KEY
                );

                this.initialized = true;
                console.log('✅ Supabase client initialized (legacy mode)');
                return this.client;

            } catch (error) {
                console.error('❌ Supabase initialization failed:', error);
                throw error;
            }
        }

        // ==========================================
        // Auth Methods
        // ==========================================

        async signInWithPassword(email, password) {
            await this.init();
            try {
                const { data, error } = await this.client.auth.signInWithPassword({ email, password });
                if (error) throw error;
                return { success: true, user: data.user, session: data.session };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        async signInWithGoogle() {
            await this.init();
            try {
                const { data, error } = await this.client.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: `${window.location.origin}/pages/P05_SystemCheck.html`
                    }
                });
                if (error) throw error;
                return { success: true, data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        async handleOAuthCallback() {
            await this.init();
            const { data: { session }, error } = await this.client.auth.getSession();
            if (error) return { success: false, error: error.message };
            if (!session) return { success: false, error: 'No session' };
            return { success: true, user: session.user, session };
        }

        onAuthStateChange(callback) {
            if (!this.client) return null;
            return this.client.auth.onAuthStateChange(callback);
        }

        async signOut() {
            await this.init();
            const { error } = await this.client.auth.signOut();
            if (error) return { success: false, error: error.message };
            return { success: true };
        }

        async getSession() {
            await this.init();
            const { data, error } = await this.client.auth.getSession();
            if (error) return { success: false, error: error.message };
            return { success: true, session: data.session };
        }

        // ==========================================
        // Reports Methods
        // ==========================================

        async getReports(userId = null) {
            await this.init();
            let query = this.client.from('reports').select('*');
            if (userId) query = query.eq('created_by', userId);
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) return { success: false, error: error.message };
            return { success: true, reports: data };
        }

        async createReport(reportData) {
            await this.init();
            const { data, error } = await this.client.from('reports').insert([reportData]).select().single();
            if (error) return { success: false, error: error.message };
            return { success: true, report: data };
        }

        async getReportById(reportId) {
            await this.init();
            const { data, error } = await this.client.from('reports').select('*').eq('id', reportId).single();
            if (error) return { success: false, error: error.message };
            return { success: true, report: data };
        }

        // Alias for getReportById
        async getReport(reportId) {
            return this.getReportById(reportId);
        }

        async updateReport(reportId, updates) {
            await this.init();
            // updated_at 자동 갱신
            const updateData = {
                ...updates,
                updated_at: new Date().toISOString()
            };
            const { data, error } = await this.client.from('reports').update(updateData).eq('id', reportId).select().maybeSingle();
            if (error) return { success: false, error: error.message };
            if (!data) return { success: false, error: 'Report not found or no update permission' };
            return { success: true, report: data };
        }

        // ==========================================
        // Sections Methods
        // ==========================================

        async upsertSection(reportId, sectionNumber, data) {
            await this.init();
            const sectionData = { report_id: reportId, section_number: sectionNumber, ...data };
            const { data: result, error } = await this.client.from('report_sections').upsert(sectionData, { onConflict: 'report_id,section_number' }).select().single();
            if (error) return { success: false, error: error.message };
            return { success: true, section: result };
        }

        async getSections(reportId) {
            await this.init();
            const { data, error } = await this.client.from('report_sections').select('*').eq('report_id', reportId).order('section_number');
            if (error) return { success: false, error: error.message };
            return { success: true, sections: data };
        }

        async getSection(reportId, sectionNumber) {
            await this.init();
            const { data, error } = await this.client.from('report_sections').select('*').eq('report_id', reportId).eq('section_number', sectionNumber).single();
            if (error) return { success: false, error: error.message };
            return { success: true, section: data };
        }

        async updateSection(sectionId, updates) {
            await this.init();
            const { data, error } = await this.client.from('report_sections').update(updates).eq('id', sectionId).select().single();
            if (error) return { success: false, error: error.message };
            return { success: true, section: data };
        }

        async deleteSection(sectionId) {
            await this.init();
            const { error } = await this.client.from('report_sections').delete().eq('id', sectionId);
            if (error) return { success: false, error: error.message };
            return { success: true };
        }

        async bulkUpsertSections(reportId, sections) {
            await this.init();
            const sectionData = sections.map(s => ({ report_id: reportId, ...s }));
            const { data, error } = await this.client.from('report_sections').upsert(sectionData, { onConflict: 'report_id,section_number' }).select();
            if (error) return { success: false, error: error.message };
            return { success: true, sections: data };
        }

        // ==========================================
        // Source Documents Methods
        // ==========================================

        async createSourceDocument(reportId, docData) {
            await this.init();
            const { data, error } = await this.client.from('source_documents').insert([{ report_id: reportId, ...docData }]).select().single();
            if (error) return { success: false, error: error.message };
            return { success: true, document: data };
        }

        async getSourceDocuments(reportId) {
            await this.init();
            const { data, error } = await this.client.from('source_documents').select('*').eq('report_id', reportId);
            if (error) return { success: false, error: error.message };
            return { success: true, documents: data };
        }

        async updateSourceDocument(documentId, updates) {
            await this.init();
            const { data, error } = await this.client.from('source_documents').update(updates).eq('id', documentId).select().single();
            if (error) return { success: false, error: error.message };
            return { success: true, document: data };
        }

        async deleteSourceDocument(documentId) {
            await this.init();
            const { error } = await this.client.from('source_documents').delete().eq('id', documentId);
            if (error) return { success: false, error: error.message };
            return { success: true };
        }

        async bulkCreateSourceDocuments(reportId, documents) {
            await this.init();
            const docsData = documents.map(d => ({ report_id: reportId, ...d }));
            const { data, error } = await this.client.from('source_documents').insert(docsData).select();
            if (error) return { success: false, error: error.message };
            return { success: true, documents: data };
        }

        // ==========================================
        // Markdown Documents Methods
        // ==========================================

        async upsertMarkdownDocument(sourceDocId, docData) {
            await this.init();
            const mdData = { source_document_id: sourceDocId, ...docData };
            const { data, error } = await this.client.from('markdown_documents').upsert(mdData, { onConflict: 'source_document_id' }).select().single();
            if (error) return { success: false, error: error.message };
            return { success: true, document: data };
        }

        async getMarkdownDocument(sourceDocId) {
            await this.init();
            const { data, error } = await this.client.from('markdown_documents').select('*').eq('source_document_id', sourceDocId).single();
            if (error) return { success: false, error: error.message };
            return { success: true, document: data };
        }

        async getMarkdownDocumentsByReport(reportId) {
            await this.init();
            const { data, error } = await this.client.from('markdown_documents').select('*, source_documents!inner(report_id)').eq('source_documents.report_id', reportId);
            if (error) return { success: false, error: error.message };
            return { success: true, documents: data };
        }

        // ==========================================
        // Extracted Data Methods
        // ==========================================

        async upsertExtractedData(reportId, dataType, data) {
            await this.init();
            const extractData = { report_id: reportId, data_type: dataType, ...data };
            const { data: result, error } = await this.client.from('extracted_data').upsert(extractData, { onConflict: 'report_id,data_type,variable_id' }).select().single();
            if (error) return { success: false, error: error.message };
            return { success: true, data: result };
        }

        async getExtractedData(reportId, dataType = null) {
            await this.init();
            let query = this.client.from('extracted_data').select('*').eq('report_id', reportId);
            if (dataType) query = query.eq('data_type', dataType);
            const { data, error } = await query;
            if (error) return { success: false, error: error.message };
            return { success: true, data };
        }

        async bulkUpsertExtractedData(reportId, items) {
            await this.init();
            const extractData = items.map(item => ({ report_id: reportId, ...item }));
            const { data, error } = await this.client.from('extracted_data').upsert(extractData, { onConflict: 'report_id,data_type,variable_id' }).select();
            if (error) return { success: false, error: error.message };
            return { success: true, data };
        }

        // ==========================================
        // LLM Methods
        // ==========================================

        async createLLMDialog(reportId, dialogData) {
            await this.init();
            const { data, error } = await this.client.from('llm_dialogs').insert([{ report_id: reportId, ...dialogData }]).select().single();
            if (error) return { success: false, error: error.message };
            return { success: true, dialog: data };
        }

        async getLLMDialogs(reportId) {
            await this.init();
            const { data, error } = await this.client.from('llm_dialogs').select('*').eq('report_id', reportId).order('created_at');
            if (error) return { success: false, error: error.message };
            return { success: true, dialogs: data };
        }

        async getLLMDialogsByType(reportId, dialogType) {
            await this.init();
            const { data, error } = await this.client.from('llm_dialogs').select('*').eq('report_id', reportId).eq('dialog_type', dialogType).order('sequence_number');
            if (error) return { success: false, error: error.message };
            return { success: true, dialogs: data };
        }

        async getLLMCostStats(reportId = null) {
            await this.init();
            let query = this.client.from('llm_dialogs').select('model_name, input_tokens, output_tokens, estimated_cost_usd');
            if (reportId) query = query.eq('report_id', reportId);
            const { data, error } = await query;
            if (error) return { success: false, error: error.message };

            const stats = data.reduce((acc, d) => {
                acc.totalInputTokens += d.input_tokens || 0;
                acc.totalOutputTokens += d.output_tokens || 0;
                acc.totalCost += d.estimated_cost_usd || 0;
                return acc;
            }, { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0 });

            return { success: true, stats };
        }

        async createLLMSession(reportId, sessionData = {}) {
            await this.init();
            const { data, error } = await this.client.from('llm_sessions').insert([{ report_id: reportId, ...sessionData }]).select().single();
            if (error) return { success: false, error: error.message };
            return { success: true, session: data };
        }

        async getLLMSession(reportId) {
            await this.init();
            const { data, error } = await this.client.from('llm_sessions').select('*').eq('report_id', reportId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single();
            if (error) return { success: false, error: error.message };
            return { success: true, session: data };
        }

        async updateLLMSession(sessionId, updates) {
            await this.init();
            const { data, error } = await this.client.from('llm_sessions').update(updates).eq('id', sessionId).select().single();
            if (error) return { success: false, error: error.message };
            return { success: true, session: data };
        }

        async getLLMSessionMessages(sessionId) {
            await this.init();
            const { data, error } = await this.client.from('llm_dialogs').select('*').eq('session_id', sessionId).order('sequence_number');
            if (error) return { success: false, error: error.message };
            return { success: true, messages: data };
        }

        async saveLLMMessage(sessionId, reportId, messageData) {
            await this.init();
            const { data, error } = await this.client.from('llm_dialogs').insert([{ session_id: sessionId, report_id: reportId, ...messageData }]).select().single();
            if (error) return { success: false, error: error.message };
            return { success: true, message: data };
        }

        async archiveLLMSession(sessionId) {
            return this.updateLLMSession(sessionId, { status: 'archived' });
        }

        // ==========================================
        // Storage Methods
        // ==========================================

        async uploadFile(bucket, path, file) {
            await this.init();
            const { data, error } = await this.client.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
            if (error) return { success: false, error: error.message };
            return { success: true, path: data.path };
        }

        async getFileUrl(bucket, path) {
            await this.init();
            const { data } = this.client.storage.from(bucket).getPublicUrl(path);
            return { success: true, url: data.publicUrl };
        }

        // ==========================================
        // Direct Query Access
        // ==========================================

        from(table) {
            if (!this.client) {
                throw new Error('Supabase client not initialized. Call init() first.');
            }
            return this.client.from(table);
        }

        async query(table) {
            await this.init();
            return this.client.from(table);
        }

        getClient() {
            return this.client;
        }

        isInitialized() {
            return this.initialized;
        }
    }

    // Singleton instance
    const supabaseClient = new LegacySupabaseClient();

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.SupabaseClient = LegacySupabaseClient;
        window.supabaseClient = supabaseClient;

        // KPSUR 네임스페이스 (호환성)
        window.KPSUR = window.KPSUR || {};
        window.KPSUR.db = window.KPSUR.db || { client: supabaseClient };

        console.log('✅ Supabase client loaded (legacy compatibility mode)');
    }

})();
