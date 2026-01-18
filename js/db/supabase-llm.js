/**
 * Supabase LLM - LLM 대화 및 세션 관리
 * js/db/supabase-llm.js
 *
 * 의존성: supabase-core.js
 */

(function() {
    'use strict';

    /**
     * SupabaseLLM - LLM 대화 로그 및 세션 관리
     */
    class SupabaseLLM {
        constructor(core) {
            this.core = core;
        }

        // ==========================================
        // LLM Dialogs CRUD
        // ==========================================

        /**
         * LLM 대화 로그 생성
         */
        async createLLMDialog(reportId, data) {
            await this.core.init();

            try {
                // DB 스키마에 맞는 필드명 사용 (001_initial_schema.sql 참조)
                const inputTokens = data.inputTokens || data.input_tokens || 0;
                const outputTokens = data.outputTokens || data.output_tokens || 0;

                const dialogData = {
                    report_id: reportId,
                    stage: data.stage || data.promptType || data.prompt_type || 'generation',
                    model_name: data.model_name || data.model,
                    user_message: data.user_message || data.requestSummary || data.request_summary || null,
                    assistant_message: data.assistant_message || data.responseSummary || data.response_summary || null,
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    total_tokens: inputTokens + outputTokens,
                    estimated_cost_usd: data.estimated_cost_usd || data.costUsd || data.cost_usd || 0,
                    actual_duration_ms: data.actual_duration_ms || data.durationMs || data.duration_ms || 0
                };

                const { data: result, error } = await this.core.client
                    .from('llm_dialogs')
                    .insert([dialogData])
                    .select()
                    .single();

                if (error) throw error;

                console.log(`✅ LLM dialog logged: ${dialogData.model_name}`);
                return { success: true, dialog: result };

            } catch (error) {
                console.error('❌ Create LLM dialog failed:', error.message);
                return { success: false, error: error.message };
            }
        }

        /**
         * 보고서의 LLM 대화 로그 조회
         */
        async getLLMDialogs(reportId) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
         */
        async getLLMDialogsByType(reportId, dialogType) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
         */
        async getLLMCostStats(reportId = null) {
            await this.core.init();

            try {
                let query = this.core.client
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

        // ==========================================
        // LLM Session Management
        // ==========================================

        /**
         * LLM 세션 생성
         */
        async createLLMSession(reportId, data = {}) {
            await this.core.init();

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

                const { data: result, error } = await this.core.client
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
         */
        async getLLMSession(reportId) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
         */
        async updateLLMSession(sessionId, data) {
            await this.core.init();

            try {
                const updateData = {
                    last_activity_at: new Date().toISOString()
                };

                if (data.systemPrompt !== undefined) updateData.system_prompt = data.systemPrompt;
                if (data.model !== undefined) updateData.model_name = data.model;
                if (data.contextTokens !== undefined) updateData.context_window_tokens = data.contextTokens;
                if (data.status !== undefined) updateData.status = data.status;

                const { data: result, error } = await this.core.client
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
         */
        async getLLMSessionMessages(sessionId) {
            await this.core.init();

            try {
                const { data, error } = await this.core.client
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
         */
        async saveLLMMessage(sessionId, reportId, data) {
            await this.core.init();

            try {
                // 현재 시퀀스 번호 조회
                const { data: lastMsg } = await this.core.client
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

                const { data: result, error } = await this.core.client
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
         */
        async archiveLLMSession(sessionId) {
            return await this.updateLLMSession(sessionId, { status: 'archived' });
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.SupabaseLLM = SupabaseLLM;

        if (window.supabaseCore) {
            window.supabaseLLM = new SupabaseLLM(window.supabaseCore);
        }
    }

})();
