/**
 * Supabase Documents - 소스 문서 및 마크다운 문서 관리
 * js/db/supabase-documents.js
 *
 * 의존성: supabase-core.js
 */

(function() {
    'use strict';

    /**
     * SupabaseDocuments - 문서 관리
     */
    class SupabaseDocuments {
        constructor(core) {
            this.core = core;
        }

        // ==========================================
        // Source Documents CRUD
        // ==========================================

        /**
         * 소스 문서 생성
         */
        async createSourceDocument(reportId, data) {
            await this.core.init();

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

                const { data: result, error } = await this.core.client
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
         */
        async getSourceDocuments(reportId) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
         */
        async updateSourceDocument(documentId, updates) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
         */
        async deleteSourceDocument(documentId) {
            await this.core.init();

            try {
                const { error } = await this.core.client
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
         */
        async bulkCreateSourceDocuments(reportId, documents) {
            await this.core.init();

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

                const { data, error } = await this.core.client
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
        // Markdown Documents CRUD
        // ==========================================

        /**
         * 마크다운 문서 생성/업데이트
         */
        async upsertMarkdownDocument(sourceDocId, data) {
            await this.core.init();

            try {
                const mdData = {
                    source_document_id: sourceDocId,
                    markdown_content: data.content || data.markdown_content,
                    conversion_method: data.method || data.conversion_method || 'auto',
                    conversion_status: data.status || 'completed'
                };

                const { data: result, error } = await this.core.client
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
         */
        async getMarkdownDocument(sourceDocId) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
         */
        async getMarkdownDocumentsByReport(reportId) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
        // Extracted Data CRUD
        // ==========================================

        /**
         * 추출 데이터 생성/업데이트
         */
        async upsertExtractedData(reportId, dataType, data) {
            await this.core.init();

            try {
                const extractedData = {
                    report_id: reportId,
                    data_type: dataType,
                    data_key: data.key || data.data_key,
                    data_value: data.value || data.data_value,
                    source_raw_id: data.sourceRawId || data.source_raw_id || null,
                    confidence: data.confidence || 1.0
                };

                const { data: result, error } = await this.core.client
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
         * 보고서의 추출 데이터 조회
         */
        async getExtractedData(reportId, dataType = null) {
            await this.core.init();

            try {
                let query = this.core.client
                    .from('extracted_data')
                    .select('*')
                    .eq('report_id', reportId);

                if (dataType) {
                    query = query.eq('data_type', dataType);
                }

                const { data, error } = await query.order('data_key');

                if (error) throw error;

                // P15 호환성: data_key를 variable_id로도 제공
                const mappedData = data.map(item => ({
                    ...item,
                    variable_id: item.data_key  // P15 CS/PH/Table 뷰어 호환
                }));

                console.log(`✅ Retrieved ${mappedData.length} extracted data items`);
                return { success: true, data: mappedData };

            } catch (error) {
                console.error('❌ Get extracted data failed:', error.message);
                return { success: false, error: error.message };
            }
        }

        /**
         * 추출 데이터 일괄 저장
         */
        async bulkUpsertExtractedData(reportId, items) {
            await this.core.init();

            try {
                const dataItems = items.map(item => ({
                    report_id: reportId,
                    data_type: item.type || item.data_type,
                    variable_id: item.variable_id || item.key || item.data_key,  // DB 컬럼명: variable_id
                    data_value: item.value || item.data_value,
                    source_raw_id: item.sourceRawId || item.source_raw_id || null,
                    validation_status: item.validation_status || 'Pending'
                }));

                const { data, error } = await this.core.client
                    .from('extracted_data')
                    .upsert(dataItems, {
                        onConflict: 'report_id,data_type,variable_id',
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
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.SupabaseDocuments = SupabaseDocuments;

        if (window.supabaseCore) {
            window.supabaseDocuments = new SupabaseDocuments(window.supabaseCore);
        }
    }

})();
