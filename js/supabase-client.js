/**
 * Supabase Client
 * Supabase 데이터베이스 연결 및 쿼리 헬퍼
 */

// CONFIG fallback (config.js가 먼저 로드되지 않은 경우)
if (!window.CONFIG) {
    window.CONFIG = {
        SUPABASE_URL: 'https://toelnxgizxwbdikskmxa.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZWxueGdpenh3YmRpa3NrbXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDAyMzUsImV4cCI6MjA3NzU3NjIzNX0.mpBAWTufodmfPUp6nmg7Qez6uygrplK9S91xl8c4mR8'
    };
}

class SupabaseClient {
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
     * 사용자 인증 - 이메일/비밀번호
     */
    async signInWithPassword(email, password) {
        await this.init();

        try {
            const { data, error } = await this.client.auth.signInWithPassword({
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
        await this.init();

        try {
            const { data, error } = await this.client.auth.signInWithOAuth({
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
     * OAuth 콜백 처리 (리다이렉트 후 세션 확인)
     */
    async handleOAuthCallback() {
        await this.init();

        try {
            const { data, error } = await this.client.auth.getSession();

            if (error) throw error;

            if (data.session) {
                const user = data.session.user;
                console.log('✅ OAuth callback - user authenticated:', user.email);

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
        if (!this.client) {
            console.warn('Supabase client not initialized');
            return null;
        }

        return this.client.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            callback(event, session);
        });
    }

    /**
     * 사용자 로그아웃
     */
    async signOut() {
        await this.init();

        try {
            const { error } = await this.client.auth.signOut();
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
        await this.init();

        try {
            const { data, error } = await this.client.auth.getSession();
            if (error) throw error;

            return { success: true, session: data.session };

        } catch (error) {
            console.error('❌ Get session failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 보고서 목록 조회
     */
    async getReports(userId = null) {
        await this.init();

        try {
            let query = this.client
                .from('reports')
                .select('*');

            // userId가 제공된 경우에만 필터링
            if (userId) {
                query = query.eq('created_by', userId);
            }

            const { data, error } = await query.order('updated_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ Retrieved ${data.length} reports${userId ? ' for user ' + userId : ''}`);
            return { success: true, reports: data };

        } catch (error) {
            console.error('❌ Get reports failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 새 보고서 생성
     */
    async createReport(reportData) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('reports')
                .insert([reportData])
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Report created:', data.report_name);
            return { success: true, report: data };

        } catch (error) {
            console.error('❌ Create report failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 단일 보고서 조회 (ID로)
     */
    async getReportById(reportId) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('reports')
                .select('*')
                .eq('id', reportId)
                .single();

            if (error) throw error;

            console.log('✅ Report retrieved:', data.report_name);
            return { success: true, report: data };

        } catch (error) {
            console.error('❌ Get report by ID failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 보고서 업데이트
     */
    async updateReport(reportId, updates) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('reports')
                .update(updates)
                .eq('id', reportId)
                .select()
                .maybeSingle();  // single() 대신 maybeSingle() 사용 - 결과가 없어도 에러 안남

            if (error) throw error;

            if (data) {
                console.log('✅ Report updated:', reportId);
                return { success: true, report: data };
            } else {
                console.warn('⚠️ Report not found for update:', reportId);
                return { success: false, error: 'Report not found' };
            }

        } catch (error) {
            console.error('❌ Update report failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ==========================================
    // Report Sections CRUD
    // ==========================================

    /**
     * 섹션 생성/업데이트 (upsert)
     * @param {string} reportId - 보고서 UUID
     * @param {string} sectionNumber - 섹션 번호 (예: "00", "01", "09")
     * @param {Object} data - 섹션 데이터
     */
    async upsertSection(reportId, sectionNumber, data) {
        await this.init();

        try {
            const sectionData = {
                report_id: reportId,
                section_number: sectionNumber,
                section_name: data.name || data.section_name || '',
                content_markdown: data.content || data.content_markdown || '',
                version: data.version || 1
            };

            const { data: result, error } = await this.client
                .from('report_sections')
                .upsert(sectionData, {
                    onConflict: 'report_id,section_number',
                    ignoreDuplicates: false
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Section ${sectionNumber} upserted for report ${reportId}`);
            return { success: true, section: result };

        } catch (error) {
            console.error('❌ Upsert section failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 보고서의 모든 섹션 조회
     * @param {string} reportId - 보고서 UUID
     */
    async getSections(reportId) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('report_sections')
                .select('*')
                .eq('report_id', reportId)
                .order('section_number', { ascending: true });

            if (error) throw error;

            console.log(`✅ Retrieved ${data.length} sections for report ${reportId}`);
            return { success: true, sections: data };

        } catch (error) {
            console.error('❌ Get sections failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 특정 섹션 조회
     * @param {string} reportId - 보고서 UUID
     * @param {string} sectionNumber - 섹션 번호
     */
    async getSection(reportId, sectionNumber) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('report_sections')
                .select('*')
                .eq('report_id', reportId)
                .eq('section_number', sectionNumber)
                .single();

            if (error) throw error;

            console.log(`✅ Section ${sectionNumber} retrieved`);
            return { success: true, section: data };

        } catch (error) {
            console.error('❌ Get section failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 섹션 업데이트 (내용만)
     * @param {string} sectionId - 섹션 UUID
     * @param {Object} updates - 업데이트할 필드
     */
    async updateSection(sectionId, updates) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('report_sections')
                .update({
                    content_markdown: updates.content || updates.content_markdown,
                    version: updates.version,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sectionId)
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Section ${sectionId} updated`);
            return { success: true, section: data };

        } catch (error) {
            console.error('❌ Update section failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 섹션 삭제
     * @param {string} sectionId - 섹션 UUID
     */
    async deleteSection(sectionId) {
        await this.init();

        try {
            const { error } = await this.client
                .from('report_sections')
                .delete()
                .eq('id', sectionId);

            if (error) throw error;

            console.log(`✅ Section ${sectionId} deleted`);
            return { success: true };

        } catch (error) {
            console.error('❌ Delete section failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 여러 섹션 일괄 저장
     * @param {string} reportId - 보고서 UUID
     * @param {Array} sections - 섹션 배열 [{number, name, content}, ...]
     */
    async bulkUpsertSections(reportId, sections) {
        await this.init();

        try {
            const sectionData = sections.map(sec => ({
                report_id: reportId,
                section_number: sec.number || sec.section_number,
                section_name: sec.name || sec.section_name || '',
                content_markdown: sec.content || sec.content_markdown || '',
                version: sec.version || 1
            }));

            const { data, error } = await this.client
                .from('report_sections')
                .upsert(sectionData, {
                    onConflict: 'report_id,section_number',
                    ignoreDuplicates: false
                })
                .select();

            if (error) throw error;

            console.log(`✅ Bulk upserted ${data.length} sections for report ${reportId}`);
            return { success: true, sections: data };

        } catch (error) {
            console.error('❌ Bulk upsert sections failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ==========================================
    // Source Documents CRUD
    // ==========================================

    /**
     * 소스 문서 생성
     * @param {string} reportId - 보고서 UUID
     * @param {Object} data - 문서 데이터
     */
    async createSourceDocument(reportId, data) {
        await this.init();

        try {
            const docData = {
                report_id: reportId,
                file_name: data.fileName || data.file_name,
                original_type: data.originalType || data.original_type || 'unknown',
                raw_id: data.rawId || data.raw_id || null,
                file_size: data.fileSize || data.file_size || 0,
                storage_path: data.storagePath || data.storage_path || null,
                status: data.status || 'uploaded'
            };

            const { data: result, error } = await this.client
                .from('source_documents')
                .insert([docData])
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Source document created: ${docData.file_name}`);
            return { success: true, document: result };

        } catch (error) {
            console.error('❌ Create source document failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 보고서의 모든 소스 문서 조회
     * @param {string} reportId - 보고서 UUID
     */
    async getSourceDocuments(reportId) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('source_documents')
                .select('*')
                .eq('report_id', reportId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            console.log(`✅ Retrieved ${data.length} source documents for report ${reportId}`);
            return { success: true, documents: data };

        } catch (error) {
            console.error('❌ Get source documents failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 소스 문서 업데이트
     * @param {string} documentId - 문서 UUID
     * @param {Object} updates - 업데이트할 필드
     */
    async updateSourceDocument(documentId, updates) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('source_documents')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', documentId)
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Source document updated: ${documentId}`);
            return { success: true, document: data };

        } catch (error) {
            console.error('❌ Update source document failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 소스 문서 삭제
     * @param {string} documentId - 문서 UUID
     */
    async deleteSourceDocument(documentId) {
        await this.init();

        try {
            const { error } = await this.client
                .from('source_documents')
                .delete()
                .eq('id', documentId);

            if (error) throw error;

            console.log(`✅ Source document deleted: ${documentId}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Delete source document failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 여러 소스 문서 일괄 생성
     * @param {string} reportId - 보고서 UUID
     * @param {Array} documents - 문서 배열
     */
    async bulkCreateSourceDocuments(reportId, documents) {
        await this.init();

        try {
            const docsData = documents.map(doc => ({
                report_id: reportId,
                file_name: doc.fileName || doc.file_name,
                original_type: doc.originalType || doc.original_type || 'unknown',
                raw_id: doc.rawId || doc.raw_id || null,
                file_size: doc.fileSize || doc.file_size || 0,
                storage_path: doc.storagePath || doc.storage_path || null,
                status: doc.status || 'uploaded'
            }));

            const { data, error } = await this.client
                .from('source_documents')
                .insert(docsData)
                .select();

            if (error) throw error;

            console.log(`✅ Bulk created ${data.length} source documents`);
            return { success: true, documents: data };

        } catch (error) {
            console.error('❌ Bulk create source documents failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ==========================================
    // File Storage
    // ==========================================

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

    /**
     * 범용 쿼리 실행
     */
    async query(table) {
        await this.init();
        return this.client.from(table);
    }

    // ==========================================
    // Markdown Documents CRUD (Phase 4)
    // ==========================================

    /**
     * 마크다운 문서 생성/업데이트
     * @param {string} sourceDocId - 소스 문서 UUID
     * @param {Object} data - 마크다운 데이터
     */
    async upsertMarkdownDocument(sourceDocId, data) {
        await this.init();

        try {
            const mdData = {
                source_document_id: sourceDocId,
                markdown_content: data.content || data.markdown_content,
                conversion_method: data.method || data.conversion_method || 'auto',
                conversion_status: data.status || 'completed'
            };

            const { data: result, error } = await this.client
                .from('markdown_documents')
                .upsert(mdData, {
                    onConflict: 'source_document_id',
                    ignoreDuplicates: false
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Markdown document upserted for source ${sourceDocId}`);
            return { success: true, document: result };

        } catch (error) {
            console.error('❌ Upsert markdown document failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 마크다운 문서 조회 (소스 문서 ID로)
     * @param {string} sourceDocId - 소스 문서 UUID
     */
    async getMarkdownDocument(sourceDocId) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('markdown_documents')
                .select('*')
                .eq('source_document_id', sourceDocId)
                .single();

            if (error) throw error;

            return { success: true, document: data };

        } catch (error) {
            console.error('❌ Get markdown document failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 보고서의 모든 마크다운 문서 조회
     * @param {string} reportId - 보고서 UUID
     */
    async getMarkdownDocumentsByReport(reportId) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('markdown_documents')
                .select(`
                    *,
                    source_documents!inner(report_id, file_name, raw_id)
                `)
                .eq('source_documents.report_id', reportId);

            if (error) throw error;

            console.log(`✅ Retrieved ${data.length} markdown documents for report ${reportId}`);
            return { success: true, documents: data };

        } catch (error) {
            console.error('❌ Get markdown documents by report failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ==========================================
    // Extracted Data CRUD (Phase 5)
    // ==========================================

    /**
     * 추출 데이터 생성/업데이트
     * @param {string} reportId - 보고서 UUID
     * @param {string} dataType - 데이터 타입 (CS, PH, Table)
     * @param {Object} data - 추출 데이터
     */
    async upsertExtractedData(reportId, dataType, data) {
        await this.init();

        try {
            const extractedData = {
                report_id: reportId,
                data_type: dataType,
                data_key: data.key || data.data_key,
                data_value: data.value || data.data_value,
                source_raw_id: data.sourceRawId || data.source_raw_id || null,
                confidence: data.confidence || 1.0
            };

            const { data: result, error } = await this.client
                .from('extracted_data')
                .upsert(extractedData, {
                    onConflict: 'report_id,data_type,data_key',
                    ignoreDuplicates: false
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Extracted data upserted: ${dataType}.${extractedData.data_key}`);
            return { success: true, data: result };

        } catch (error) {
            console.error('❌ Upsert extracted data failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 보고서의 추출 데이터 조회 (타입별)
     * @param {string} reportId - 보고서 UUID
     * @param {string} dataType - 데이터 타입 (CS, PH, Table, 또는 null=전체)
     */
    async getExtractedData(reportId, dataType = null) {
        await this.init();

        try {
            let query = this.client
                .from('extracted_data')
                .select('*')
                .eq('report_id', reportId);

            if (dataType) {
                query = query.eq('data_type', dataType);
            }

            const { data, error } = await query.order('data_key');

            if (error) throw error;

            console.log(`✅ Retrieved ${data.length} extracted data items`);
            return { success: true, data: data };

        } catch (error) {
            console.error('❌ Get extracted data failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 추출 데이터 일괄 저장
     * @param {string} reportId - 보고서 UUID
     * @param {Array} items - 추출 데이터 배열 [{type, key, value}, ...]
     */
    async bulkUpsertExtractedData(reportId, items) {
        await this.init();

        try {
            const dataItems = items.map(item => ({
                report_id: reportId,
                data_type: item.type || item.data_type,
                data_key: item.key || item.data_key,
                data_value: item.value || item.data_value,
                source_raw_id: item.sourceRawId || item.source_raw_id || null,
                confidence: item.confidence || 1.0
            }));

            const { data, error } = await this.client
                .from('extracted_data')
                .upsert(dataItems, {
                    onConflict: 'report_id,data_type,data_key',
                    ignoreDuplicates: false
                })
                .select();

            if (error) throw error;

            console.log(`✅ Bulk upserted ${data.length} extracted data items`);
            return { success: true, data: data };

        } catch (error) {
            console.error('❌ Bulk upsert extracted data failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ==========================================
    // LLM Dialogs CRUD (Phase 6)
    // ==========================================

    /**
     * LLM 대화 로그 생성
     * @param {string} reportId - 보고서 UUID
     * @param {Object} data - 대화 데이터
     */
    async createLLMDialog(reportId, data) {
        await this.init();

        try {
            const dialogData = {
                report_id: reportId,
                model: data.model,
                prompt_type: data.promptType || data.prompt_type || 'generation',
                input_tokens: data.inputTokens || data.input_tokens || 0,
                output_tokens: data.outputTokens || data.output_tokens || 0,
                cost_usd: data.costUsd || data.cost_usd || 0,
                request_summary: data.requestSummary || data.request_summary || null,
                response_summary: data.responseSummary || data.response_summary || null,
                duration_ms: data.durationMs || data.duration_ms || 0
            };

            const { data: result, error } = await this.client
                .from('llm_dialogs')
                .insert([dialogData])
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ LLM dialog logged: ${dialogData.model}`);
            return { success: true, dialog: result };

        } catch (error) {
            console.error('❌ Create LLM dialog failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 보고서의 LLM 대화 로그 조회
     * @param {string} reportId - 보고서 UUID
     */
    async getLLMDialogs(reportId) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('llm_dialogs')
                .select('*')
                .eq('report_id', reportId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ Retrieved ${data.length} LLM dialogs for report ${reportId}`);
            return { success: true, dialogs: data };

        } catch (error) {
            console.error('❌ Get LLM dialogs failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 보고서의 LLM 대화 로그 조회 (타입별 필터링)
     * @param {string} reportId - 보고서 UUID
     * @param {string} dialogType - 대화 유형 ('chat' | 'psur_generation')
     */
    async getLLMDialogsByType(reportId, dialogType) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('llm_dialogs')
                .select('*')
                .eq('report_id', reportId)
                .eq('dialog_type', dialogType)
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ Retrieved ${data.length} LLM dialogs (type: ${dialogType}) for report ${reportId}`);
            return { success: true, dialogs: data };

        } catch (error) {
            console.error('❌ Get LLM dialogs by type failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * LLM 비용 통계 조회
     * @param {string} reportId - 보고서 UUID (null이면 전체)
     */
    async getLLMCostStats(reportId = null) {
        await this.init();

        try {
            let query = this.client
                .from('llm_dialogs')
                .select('model, input_tokens, output_tokens, cost_usd');

            if (reportId) {
                query = query.eq('report_id', reportId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // 통계 계산
            const stats = {
                totalCost: data.reduce((sum, d) => sum + (d.cost_usd || 0), 0),
                totalInputTokens: data.reduce((sum, d) => sum + (d.input_tokens || 0), 0),
                totalOutputTokens: data.reduce((sum, d) => sum + (d.output_tokens || 0), 0),
                callCount: data.length,
                byModel: {}
            };

            data.forEach(d => {
                if (!stats.byModel[d.model]) {
                    stats.byModel[d.model] = { cost: 0, calls: 0, tokens: 0 };
                }
                stats.byModel[d.model].cost += d.cost_usd || 0;
                stats.byModel[d.model].calls += 1;
                stats.byModel[d.model].tokens += (d.input_tokens || 0) + (d.output_tokens || 0);
            });

            return { success: true, stats: stats };

        } catch (error) {
            console.error('❌ Get LLM cost stats failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // =========================================
    // LLM Session Management Methods
    // =========================================

    /**
     * LLM 세션 생성
     * @param {string} reportId - 보고서 UUID
     * @param {Object} data - 세션 데이터
     */
    async createLLMSession(reportId, data = {}) {
        await this.init();

        try {
            const sessionId = data.sessionId || `session_${reportId}_${Date.now()}`;

            const sessionData = {
                report_id: reportId,
                session_id: sessionId,
                system_prompt: data.systemPrompt || null,
                model_name: data.modelName || data.model || 'claude-sonnet-3-5',
                context_window_tokens: 0,
                max_context_tokens: data.maxTokens || 200000,
                status: 'active'
            };

            const { data: result, error } = await this.client
                .from('llm_sessions')
                .insert([sessionData])
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ LLM session created: ${sessionId}`);
            return { success: true, session: result };

        } catch (error) {
            console.error('❌ Create LLM session failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 보고서의 활성 LLM 세션 조회
     * @param {string} reportId - 보고서 UUID
     */
    async getLLMSession(reportId) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('llm_sessions')
                .select('*')
                .eq('report_id', reportId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

            if (data) {
                console.log(`✅ LLM session found: ${data.session_id}`);
                return { success: true, session: data };
            }

            return { success: true, session: null };

        } catch (error) {
            console.error('❌ Get LLM session failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * LLM 세션 업데이트
     * @param {string} sessionId - 세션 UUID (llm_sessions.id)
     * @param {Object} data - 업데이트할 데이터
     */
    async updateLLMSession(sessionId, data) {
        await this.init();

        try {
            const updateData = {
                last_activity_at: new Date().toISOString()
            };

            if (data.systemPrompt !== undefined) updateData.system_prompt = data.systemPrompt;
            if (data.model !== undefined) updateData.model_name = data.model;
            if (data.contextTokens !== undefined) updateData.context_window_tokens = data.contextTokens;
            if (data.status !== undefined) updateData.status = data.status;

            const { data: result, error } = await this.client
                .from('llm_sessions')
                .update(updateData)
                .eq('id', sessionId)
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ LLM session updated: ${sessionId}`);
            return { success: true, session: result };

        } catch (error) {
            console.error('❌ Update LLM session failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 세션의 전체 대화 메시지 조회
     * @param {string} sessionId - 세션 UUID (llm_sessions.id)
     */
    async getLLMSessionMessages(sessionId) {
        await this.init();

        try {
            const { data, error } = await this.client
                .from('llm_dialogs')
                .select('*')
                .eq('session_id', sessionId)
                .order('sequence_number', { ascending: true });

            if (error) throw error;

            console.log(`✅ Retrieved ${data.length} messages for session ${sessionId}`);
            return { success: true, messages: data };

        } catch (error) {
            console.error('❌ Get session messages failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 세션에 대화 메시지 저장
     * @param {string} sessionId - 세션 UUID (llm_sessions.id)
     * @param {string} reportId - 보고서 UUID
     * @param {Object} data - 메시지 데이터
     */
    async saveLLMMessage(sessionId, reportId, data) {
        await this.init();

        try {
            // 현재 시퀀스 번호 조회
            const { data: lastMsg } = await this.client
                .from('llm_dialogs')
                .select('sequence_number')
                .eq('session_id', sessionId)
                .order('sequence_number', { ascending: false })
                .limit(1)
                .single();

            const sequenceNumber = (lastMsg?.sequence_number || 0) + 1;

            const messageData = {
                session_id: sessionId,
                report_id: reportId,
                sequence_number: sequenceNumber,
                dialog_type: data.dialogType || 'chat',
                model_name: data.modelName || data.model || 'unknown',
                user_message: data.userMessage,
                assistant_message: data.assistantMessage,
                input_tokens: data.inputTokens || 0,
                output_tokens: data.outputTokens || 0
            };

            const { data: result, error } = await this.client
                .from('llm_dialogs')
                .insert([messageData])
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Message saved to session (seq: ${sequenceNumber})`);
            return { success: true, message: result };

        } catch (error) {
            console.error('❌ Save LLM message failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 세션 아카이브 (비활성화)
     * @param {string} sessionId - 세션 UUID
     */
    async archiveLLMSession(sessionId) {
        return await this.updateLLMSession(sessionId, { status: 'archived' });
    }
}

// Singleton instance
const supabaseClient = new SupabaseClient();

// 브라우저 환경에서 전역 접근 가능하도록 설정
window.supabaseClient = supabaseClient;
window.SupabaseClient = SupabaseClient;
