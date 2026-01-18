/**
 * Supabase DB Module Index - 통합 Export
 * js/db/index.js
 *
 * 모든 DB 모듈을 통합하고 기존 supabaseClient와 호환성 유지
 *
 * 로드 순서:
 * 1. supabase-core.js
 * 2. supabase-auth.js
 * 3. supabase-reports.js
 * 4. supabase-documents.js
 * 5. supabase-llm.js
 * 6. index.js (이 파일)
 */

(function() {
    'use strict';

    /**
     * SupabaseClient - 기존 API와 호환되는 통합 Facade
     * 모든 서브모듈의 메서드를 하나의 객체로 통합
     */
    class SupabaseClient {
        constructor() {
            // Core 인스턴스 확인
            if (!window.supabaseCore) {
                console.error('❌ SupabaseCore not loaded. Load supabase-core.js first.');
                return;
            }

            this.core = window.supabaseCore;
            this.auth = window.supabaseAuth;
            this.reports = window.supabaseReports;
            this.documents = window.supabaseDocuments;
            this.llm = window.supabaseLLM;

            // 초기화 상태
            this.initialized = false;
        }

        /**
         * 초기화 (Core에 위임)
         */
        async init() {
            if (this.initialized) return this.core.getClient();

            await this.core.init();
            this.initialized = true;
            return this.core.getClient();
        }

        // ==========================================
        // Auth Methods (Delegation)
        // ==========================================

        async signInWithPassword(email, password) {
            return this.auth.signInWithPassword(email, password);
        }

        async signInWithGoogle() {
            return this.auth.signInWithGoogle();
        }

        async handleOAuthCallback() {
            return this.auth.handleOAuthCallback();
        }

        onAuthStateChange(callback) {
            return this.auth.onAuthStateChange(callback);
        }

        async signOut() {
            return this.auth.signOut();
        }

        async getSession() {
            return this.auth.getSession();
        }

        // ==========================================
        // Reports Methods (Delegation)
        // ==========================================

        async getReports(userId = null) {
            return this.reports.getReports(userId);
        }

        async createReport(reportData) {
            return this.reports.createReport(reportData);
        }

        async getReportById(reportId) {
            return this.reports.getReportById(reportId);
        }

        async updateReport(reportId, updates) {
            return this.reports.updateReport(reportId, updates);
        }

        async upsertSection(reportId, sectionNumber, data) {
            return this.reports.upsertSection(reportId, sectionNumber, data);
        }

        async getSections(reportId) {
            return this.reports.getSections(reportId);
        }

        async getSection(reportId, sectionNumber) {
            return this.reports.getSection(reportId, sectionNumber);
        }

        async updateSection(sectionId, updates) {
            return this.reports.updateSection(sectionId, updates);
        }

        async deleteSection(sectionId) {
            return this.reports.deleteSection(sectionId);
        }

        async bulkUpsertSections(reportId, sections) {
            return this.reports.bulkUpsertSections(reportId, sections);
        }

        // ==========================================
        // Documents Methods (Delegation)
        // ==========================================

        async createSourceDocument(reportId, data) {
            return this.documents.createSourceDocument(reportId, data);
        }

        async getSourceDocuments(reportId) {
            return this.documents.getSourceDocuments(reportId);
        }

        async updateSourceDocument(documentId, updates) {
            return this.documents.updateSourceDocument(documentId, updates);
        }

        async deleteSourceDocument(documentId) {
            return this.documents.deleteSourceDocument(documentId);
        }

        async bulkCreateSourceDocuments(reportId, documents) {
            return this.documents.bulkCreateSourceDocuments(reportId, documents);
        }

        async upsertMarkdownDocument(sourceDocId, data) {
            return this.documents.upsertMarkdownDocument(sourceDocId, data);
        }

        async getMarkdownDocument(sourceDocId) {
            return this.documents.getMarkdownDocument(sourceDocId);
        }

        async getMarkdownDocumentsByReport(reportId) {
            return this.documents.getMarkdownDocumentsByReport(reportId);
        }

        async upsertExtractedData(reportId, dataType, data) {
            return this.documents.upsertExtractedData(reportId, dataType, data);
        }

        async getExtractedData(reportId, dataType = null) {
            return this.documents.getExtractedData(reportId, dataType);
        }

        async bulkUpsertExtractedData(reportId, items) {
            return this.documents.bulkUpsertExtractedData(reportId, items);
        }

        // saveExtractedData는 bulkUpsertExtractedData의 alias (P14에서 사용)
        async saveExtractedData(reportId, items) {
            return this.documents.bulkUpsertExtractedData(reportId, items);
        }

        // ==========================================
        // LLM Methods (Delegation)
        // ==========================================

        async createLLMDialog(reportId, data) {
            return this.llm.createLLMDialog(reportId, data);
        }

        async getLLMDialogs(reportId) {
            return this.llm.getLLMDialogs(reportId);
        }

        async getLLMDialogsByType(reportId, dialogType) {
            return this.llm.getLLMDialogsByType(reportId, dialogType);
        }

        async getLLMCostStats(reportId = null) {
            return this.llm.getLLMCostStats(reportId);
        }

        async createLLMSession(reportId, data = {}) {
            return this.llm.createLLMSession(reportId, data);
        }

        async getLLMSession(reportId) {
            return this.llm.getLLMSession(reportId);
        }

        async updateLLMSession(sessionId, data) {
            return this.llm.updateLLMSession(sessionId, data);
        }

        async getLLMSessionMessages(sessionId) {
            return this.llm.getLLMSessionMessages(sessionId);
        }

        async saveLLMMessage(sessionId, reportId, data) {
            return this.llm.saveLLMMessage(sessionId, reportId, data);
        }

        async archiveLLMSession(sessionId) {
            return this.llm.archiveLLMSession(sessionId);
        }

        // ==========================================
        // Storage Methods (from Core)
        // ==========================================

        async uploadFile(bucket, path, file) {
            return this.core.uploadFile(bucket, path, file);
        }

        async getFileUrl(bucket, path) {
            return this.core.getFileUrl(bucket, path);
        }

        // ==========================================
        // Direct Query Access
        // ==========================================

        /**
         * 테이블 쿼리 빌더 반환 (기존 코드 호환용)
         * 주의: init()이 먼저 호출되어야 함
         * @param {string} table - 테이블명
         * @returns {QueryBuilder}
         */
        from(table) {
            const client = this.core.getClient();
            if (!client) {
                console.error('❌ Supabase client not initialized. Call init() first.');
                throw new Error('Supabase client not initialized');
            }
            return client.from(table);
        }

        async query(table) {
            return this.core.query(table);
        }

        getClient() {
            return this.core.getClient();
        }

        /**
         * 원본 Supabase 클라이언트 접근 (기존 코드 호환용)
         * @returns {SupabaseClient}
         */
        get client() {
            return this.core.getClient();
        }

        /**
         * auth 객체 직접 접근 (기존 코드 호환용)
         */
        get authClient() {
            const client = this.core.getClient();
            return client ? client.auth : null;
        }

        isInitialized() {
            return this.core.isInitialized();
        }
    }

    // Singleton 인스턴스 생성 및 전역 등록
    if (typeof window !== 'undefined') {
        // 모든 서브모듈이 로드되었는지 확인
        const requiredModules = ['supabaseCore', 'supabaseAuth', 'supabaseReports', 'supabaseDocuments', 'supabaseLLM'];
        const missingModules = requiredModules.filter(mod => !window[mod]);

        if (missingModules.length > 0) {
            console.warn('⚠️ Missing Supabase modules:', missingModules.join(', '));
            console.warn('⚠️ Make sure to load all modules before index.js');
        }

        // 기존 supabaseClient와 호환되는 통합 인스턴스 생성
        const supabaseClient = new SupabaseClient();

        // 전역 등록 (기존 코드와 호환)
        window.SupabaseClient = SupabaseClient;
        window.supabaseClient = supabaseClient;

        // 네임스페이스 객체로도 접근 가능
        window.KPSUR = window.KPSUR || {};
        window.KPSUR.db = {
            client: supabaseClient,
            core: window.supabaseCore,
            auth: window.supabaseAuth,
            reports: window.supabaseReports,
            documents: window.supabaseDocuments,
            llm: window.supabaseLLM
        };

        console.log('✅ Supabase DB modules loaded and integrated');
    }

})();
