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
                // DB 스키마: original_filename, raw_id, file_type, file_path (NOT NULL)
                const fileName = data.fileName || data.file_name || data.original_filename || 'unknown';
                const docData = {
                    report_id: reportId,
                    original_filename: fileName,
                    raw_id: data.rawId || data.raw_id || 'unknown',
                    file_type: data.fileType || data.file_type || data.originalType || fileName.split('.').pop() || 'unknown',
                    file_path: data.filePath || data.file_path || `/${reportId}/${fileName}`
                };

                const { data: result, error } = await this.core.client
                    .from('source_documents')
                    .insert([docData])
                    .select()
                    .single();

                if (error) throw error;

                console.log(`✅ Source document created: ${docData.original_filename}`);
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
                // DB 스키마: original_filename, raw_id, file_type, file_path (NOT NULL)
                const docsData = documents.map(doc => {
                    const fileName = doc.fileName || doc.file_name || doc.original_filename || 'unknown';
                    return {
                        report_id: reportId,
                        original_filename: fileName,
                        raw_id: doc.rawId || doc.raw_id || 'unknown',
                        file_type: doc.fileType || doc.file_type || doc.originalType || fileName.split('.').pop() || 'unknown',
                        file_path: doc.filePath || doc.file_path || `/${reportId}/${fileName}`
                    };
                });

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
                    .select('*')
                    .eq('report_id', reportId);

                if (error) throw error;

                console.log(`✅ Retrieved ${data.length} markdown documents for report ${reportId}`);
                return { success: true, documents: data };

            } catch (error) {
                console.error('❌ Get markdown documents by report failed:', error.message);
                return { success: false, error: error.message };
            }
        }

        /**
         * 마크다운 문서 일괄 저장 (P14용)
         * @param {string} reportId - 보고서 UUID
         * @param {Array} markdowns - [{fileName, rawId, content, convertedBy, sourceDocId?}]
         */
        async bulkSaveMarkdownDocuments(reportId, markdowns) {
            await this.core.init();

            // PostgreSQL이 지원하지 않는 유니코드 문자 제거 (특히 \u0000 null character)
            const sanitizeContent = (content) => {
                if (!content || typeof content !== 'string') return content;
                // null character 및 기타 제어 문자 제거 (탭, 개행 제외)
                return content
                    .replace(/\u0000/g, '')  // null character
                    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');  // 제어 문자 (탭\x09, 개행\x0A, 캐리지리턴\x0D 제외)
            };

            try {
                // 기존 마크다운 삭제 (덮어쓰기)
                await this.core.client
                    .from('markdown_documents')
                    .delete()
                    .eq('report_id', reportId);

                if (!markdowns || markdowns.length === 0) {
                    console.log('⚠️ No markdowns to save');
                    return { success: true, count: 0 };
                }

                // source_documents 테이블에서 파일명으로 ID 조회 (자동 매핑)
                const { data: sourceDocs, error: sourceError } = await this.core.client
                    .from('source_documents')
                    .select('id, original_filename')
                    .eq('report_id', reportId);

                if (sourceError) {
                    console.warn('⚠️ source_documents 조회 실패, sourceDocId 없이 진행:', sourceError.message);
                }

                // 파일명 -> source_document_id 매핑 생성
                const fileNameToId = {};
                if (sourceDocs && sourceDocs.length > 0) {
                    sourceDocs.forEach(doc => {
                        fileNameToId[doc.original_filename] = doc.id;
                    });
                    console.log(`📋 source_documents에서 ${sourceDocs.length}개 파일 ID 매핑 완료`);
                }

                const mdDocs = markdowns.map(md => ({
                    report_id: reportId,
                    source_document_id: md.sourceDocId || fileNameToId[md.fileName] || null,
                    raw_id: md.rawId || 'unknown',
                    markdown_content: sanitizeContent(md.content),
                    file_path: md.fileName || null,
                    converted_by: md.convertedBy || 'gemini-flash'
                }));

                const { data, error } = await this.core.client
                    .from('markdown_documents')
                    .insert(mdDocs)
                    .select();

                if (error) throw error;

                console.log(`✅ Bulk saved ${data.length} markdown documents for report ${reportId}`);
                return { success: true, count: data.length, documents: data };

            } catch (error) {
                console.error('❌ Bulk save markdown documents failed:', error.message);
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
                    variable_id: data.variable_id || data.key || data.data_key,
                    data_value: data.value || data.data_value,
                    source_raw_id: data.sourceRawId || data.source_raw_id || null,
                    validation_status: data.validation_status || 'Pending'
                };

                const { data: result, error } = await this.core.client
                    .from('extracted_data')
                    .upsert(extractedData, {
                        onConflict: 'report_id,data_type,variable_id',
                        ignoreDuplicates: false
                    })
                    .select()
                    .single();

                if (error) throw error;

                console.log(`✅ Extracted data upserted: ${dataType}.${extractedData.variable_id}`);
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

                const { data, error } = await query.order('variable_id');

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

                console.log(`[bulkUpsertExtractedData] Upserting ${dataItems.length} items to extracted_data`);

                const { data, error } = await this.core.client
                    .from('extracted_data')
                    .upsert(dataItems, {
                        onConflict: 'report_id,data_type,variable_id',
                        ignoreDuplicates: false
                    })
                    .select();

                if (error) {
                    console.error('❌ Supabase upsert error:', error);
                    console.error('❌ Error details - code:', error.code, 'message:', error.message);
                    console.error('❌ First item sample:', JSON.stringify(dataItems[0], null, 2));
                    throw error;
                }

                console.log(`✅ Bulk upserted ${data.length} extracted data items`);
                return { success: true, data: data };

            } catch (error) {
                console.error('❌ Bulk upsert extracted data failed:', error.message || error);
                return { success: false, error: error.message || String(error) };
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
