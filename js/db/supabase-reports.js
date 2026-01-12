/**
 * Supabase Reports - 보고서 CRUD
 * js/db/supabase-reports.js
 *
 * 의존성: supabase-core.js
 */

(function() {
    'use strict';

    /**
     * SupabaseReports - 보고서 및 섹션 관리
     */
    class SupabaseReports {
        constructor(core) {
            this.core = core;
        }

        // ==========================================
        // Reports CRUD
        // ==========================================

        /**
         * 보고서 목록 조회
         */
        async getReports(userId = null) {
            await this.core.init();

            try {
                let query = this.core.client
                    .from('reports')
                    .select('*');

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
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
         * 단일 보고서 조회
         */
        async getReportById(reportId) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
            await this.core.init();

            try {
                const { data, error } = await this.core.client
                    .from('reports')
                    .update(updates)
                    .eq('id', reportId)
                    .select()
                    .maybeSingle();

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
         */
        async upsertSection(reportId, sectionNumber, data) {
            await this.core.init();

            try {
                const sectionData = {
                    report_id: reportId,
                    section_number: sectionNumber,
                    section_name: data.name || data.section_name || '',
                    content_markdown: data.content || data.content_markdown || '',
                    version: data.version || 1
                };

                const { data: result, error } = await this.core.client
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
         */
        async getSections(reportId) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
         */
        async getSection(reportId, sectionNumber) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
         * 섹션 업데이트
         */
        async updateSection(sectionId, updates) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
         */
        async deleteSection(sectionId) {
            await this.core.init();

            try {
                const { error } = await this.core.client
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
         */
        async bulkUpsertSections(reportId, sections) {
            await this.core.init();

            try {
                const sectionData = sections.map(sec => ({
                    report_id: reportId,
                    section_number: sec.number || sec.section_number,
                    section_name: sec.name || sec.section_name || '',
                    content_markdown: sec.content || sec.content_markdown || '',
                    version: sec.version || 1
                }));

                const { data, error } = await this.core.client
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
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.SupabaseReports = SupabaseReports;

        if (window.supabaseCore) {
            window.supabaseReports = new SupabaseReports(window.supabaseCore);
        }
    }

})();
