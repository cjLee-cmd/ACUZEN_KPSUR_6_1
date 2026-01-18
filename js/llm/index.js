/**
 * LLM Module Index - 통합 Export
 * js/llm/index.js
 *
 * 모든 LLM 모듈을 통합하고 기존 multiLLMClient와 호환성 유지
 *
 * 로드 순서:
 * 1. llm-base.js
 * 2. llm-claude.js
 * 3. llm-openai.js
 * 4. llm-gemini.js
 * 5. index.js (이 파일)
 */

(function() {
    'use strict';

    /**
     * MultiLLMClient - 기존 API와 호환되는 통합 Facade
     */
    class MultiLLMClient {
        constructor() {
            // 서브모듈 확인
            if (!window.llmBase) {
                console.error('❌ LLMBase not loaded. Load llm-base.js first.');
                return;
            }

            this.base = window.llmBase;
            this.claude = window.llmClaude;
            this.openai = window.llmOpenAI;
            this.gemini = window.llmGemini;

            // 기존 속성 위임
            this.dialogHistory = this.base.dialogHistory;
            this.currentMode = 'single';
            this.hybridConfig = null;
        }

        // 총 비용 getter
        get totalCost() {
            return this.base.totalCost;
        }

        // ==========================================
        // API Key Methods (Delegation to Base)
        // ==========================================

        setApiKey(provider, apiKey) {
            return this.base.setApiKey(provider, apiKey);
        }

        getApiKey(provider) {
            return this.base.getApiKey(provider);
        }

        hasApiKey(provider) {
            return this.base.hasApiKey(provider);
        }

        // ==========================================
        // Provider Info Methods
        // ==========================================

        getProviders() {
            return this.base.getProviders();
        }

        getModels(provider) {
            return this.base.getModels(provider);
        }

        getHybridModes() {
            return this.base.getHybridModes();
        }

        // ==========================================
        // Cost Estimation
        // ==========================================

        estimateCost(provider, model, inputTokens, outputTokens) {
            return this.base.estimateCost(provider, model, inputTokens, outputTokens);
        }

        // ==========================================
        // Provider-specific Methods (Legacy Support)
        // ==========================================

        async callClaude(prompt, options = {}) {
            return this.claude.call(prompt, options);
        }

        async callOpenAI(prompt, options = {}) {
            return this.openai.call(prompt, options);
        }

        async callGemini(prompt, options = {}) {
            return this.gemini.call(prompt, options);
        }

        // ==========================================
        // Streaming Methods
        // ==========================================

        async callClaudeStream(prompt, options = {}, onChunk) {
            return this.claude.callStream(prompt, options, onChunk);
        }

        async callOpenAIStream(prompt, options = {}, onChunk) {
            return this.openai.callStream(prompt, options, onChunk);
        }

        async callGeminiStream(prompt, options = {}, onChunk) {
            return this.gemini.callStream(prompt, options, onChunk);
        }

        // ==========================================
        // History-enabled Methods
        // ==========================================

        async callClaudeWithHistory(systemPrompt, messages, options = {}) {
            return this.claude.callWithHistory(systemPrompt, messages, options);
        }

        async callOpenAIWithHistory(systemPrompt, messages, options = {}) {
            return this.openai.callWithHistory(systemPrompt, messages, options);
        }

        async callGeminiWithHistory(systemPrompt, messages, options = {}) {
            return this.gemini.callWithHistory(systemPrompt, messages, options);
        }

        // ==========================================
        // Unified Methods
        // ==========================================

        /**
         * 통합 호출 메서드
         */
        async generate(prompt, options = {}) {
            const provider = options.provider || 'claude';
            const startTime = Date.now();

            let result;
            switch (provider) {
                case 'claude':
                    result = await this.claude.call(prompt, options);
                    break;
                case 'openai':
                    result = await this.openai.call(prompt, options);
                    break;
                case 'google':
                    result = await this.gemini.call(prompt, options);
                    break;
                default:
                    throw new Error(`Unknown provider: ${provider}`);
            }

            result.duration = ((Date.now() - startTime) / 1000).toFixed(2);
            this.base.logDialog(prompt, result, { stage: options.stage || 'llm_generate' });

            return result;
        }

        /**
         * 통합 스트리밍 호출 메서드
         */
        async generateStream(prompt, options = {}, onChunk) {
            const provider = options.provider || 'google';
            const startTime = Date.now();

            let result;
            switch (provider) {
                case 'claude':
                    result = await this.claude.callStream(prompt, options, onChunk);
                    break;
                case 'openai':
                    result = await this.openai.callStream(prompt, options, onChunk);
                    break;
                case 'google':
                    result = await this.gemini.callStream(prompt, options, onChunk);
                    break;
                default:
                    throw new Error(`Unknown provider: ${provider}`);
            }

            result.duration = ((Date.now() - startTime) / 1000).toFixed(2);
            this.base.logDialog(prompt, result, { stage: options.stage || 'llm_stream' });

            return result;
        }

        /**
         * 통합 히스토리 호출 메서드
         */
        async generateWithHistory(systemPrompt, messages, options = {}) {
            const provider = options.provider || 'claude';
            const startTime = Date.now();

            try {
                let result;

                switch (provider) {
                    case 'claude':
                    case 'anthropic':
                        result = await this.claude.callWithHistory(systemPrompt, messages, options);
                        break;
                    case 'openai':
                        result = await this.openai.callWithHistory(systemPrompt, messages, options);
                        break;
                    case 'google':
                    case 'gemini':
                        result = await this.gemini.callWithHistory(systemPrompt, messages, options);
                        break;
                    default:
                        throw new Error(`지원하지 않는 provider: ${provider}`);
                }

                result.latency = Date.now() - startTime;
                result.duration = ((Date.now() - startTime) / 1000).toFixed(2);

                // 로깅: 마지막 사용자 메시지를 프롬프트로 사용
                const lastUserMsg = messages.filter(m => m.role === 'user').pop();
                this.base.logDialog(lastUserMsg?.content || systemPrompt, result, {
                    stage: options.stage || 'llm_history'
                });

                return result;

            } catch (error) {
                console.error(`[MultiLLMClient] ${provider} with history error:`, error);
                throw error;
            }
        }

        // ==========================================
        // Hybrid Mode Methods
        // ==========================================

        /**
         * Hybrid 모드 생성
         */
        async generateHybrid(prompt, hybridMode, options = {}) {
            const config = window.HYBRID_MODES[hybridMode];
            if (!config) throw new Error(`Unknown hybrid mode: ${hybridMode}`);

            const results = {
                phase1: null,
                phase2: null,
                merged: null,
                totalCost: 0,
                totalDuration: 0
            };

            // Phase 1: 전체 초안 생성
            console.log(`🚀 Phase 1: ${config.phase1.description} (${config.phase1.model})`);
            results.phase1 = await this.generate(prompt, {
                provider: config.phase1.provider,
                model: config.phase1.model,
                temperature: options.temperature || 0.5
            });
            results.totalCost += results.phase1.cost;
            results.totalDuration += parseFloat(results.phase1.duration);

            if (options.onPhase1Complete) {
                options.onPhase1Complete(results.phase1);
            }

            // Phase 2: 핵심 섹션 개선
            const refinementPrompt = this.buildRefinementPrompt(
                results.phase1.text,
                config.refineSections,
                options.context
            );

            console.log(`✨ Phase 2: ${config.phase2.description} (${config.phase2.model})`);
            results.phase2 = await this.generate(refinementPrompt, {
                provider: config.phase2.provider,
                model: config.phase2.model,
                temperature: options.temperature || 0.3
            });
            results.totalCost += results.phase2.cost;
            results.totalDuration += parseFloat(results.phase2.duration);

            if (options.onPhase2Complete) {
                options.onPhase2Complete(results.phase2);
            }

            // 결과 병합
            results.merged = this.mergeResults(
                results.phase1.text,
                results.phase2.text,
                config.refineSections
            );

            return results;
        }

        /**
         * Phase 2용 개선 프롬프트 생성
         */
        buildRefinementPrompt(draft, sections, context) {
            const sectionNames = {
                9: '종합적인 안전성 평가',
                10: '결론'
            };

            const sectionList = sections.map(s => `${s}. ${sectionNames[s] || `섹션 ${s}`}`).join(', ');

            return `당신은 PSUR(정기 안전성 갱신 보고서) 전문가입니다.

아래는 초안으로 생성된 PSUR 보고서입니다. 다음 핵심 섹션들을 전문가 수준으로 개선해주세요:
**개선 대상 섹션**: ${sectionList}

**개선 지침**:
1. 정량적 분석 강화 (Patient-years 계산, 발생률 분석)
2. Signal Detection 방법론 명시 (PRR, ROR 등)
3. 규제 요건에 맞는 구조화된 평가
4. SOC별 체계적 분류
5. 유익성-위해성 균형 심층 분석

${context ? `**참고 컨텍스트**:\n${context}\n` : ''}

**초안 보고서**:
${draft}

**출력 형식**:
개선된 섹션들만 마크다운 형식으로 출력하세요. 각 섹션은 "## {섹션번호}. {섹션명}" 형식으로 시작합니다.`;
        }

        /**
         * 결과 병합
         */
        mergeResults(draft, refined, refineSections) {
            let result = draft;

            for (const sectionNum of refineSections) {
                const sectionPattern = new RegExp(
                    `## ${sectionNum}\\.[^#]*?(?=## \\d+\\.|$)`,
                    's'
                );

                const refinedMatch = refined.match(sectionPattern);
                if (refinedMatch) {
                    result = result.replace(sectionPattern, refinedMatch[0]);
                }
            }

            return result;
        }

        // ==========================================
        // Utility Methods
        // ==========================================

        logDialog(prompt, result) {
            this.base.logDialog(prompt, result);
        }

        exportDialogHistory(reportName) {
            return this.base.exportDialogHistory(reportName);
        }

        getStats() {
            return this.base.getStats();
        }

        reset() {
            this.base.reset();
            this.dialogHistory = this.base.dialogHistory;
        }

        // ==========================================
        // Legacy Compatibility Methods
        // ==========================================

        /**
         * 호환성 래퍼: sendMessage (기존 코드 호환용)
         */
        async sendMessage(prompt, options = {}) {
            const provider = options.provider || 'google';
            const model = options.model || (provider === 'google' ? 'gemini-3-flash-preview' : undefined);

            try {
                const result = await this.generate(prompt, {
                    ...options,
                    provider,
                    model
                });

                return {
                    content: result.text,
                    success: result.success,
                    model: result.model,
                    provider: result.provider,
                    usage: result.usage,
                    cost: result.cost
                };
            } catch (error) {
                console.error('LLM sendMessage error:', error);
                return {
                    content: '',
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * 호환성 래퍼: generateContent (llm-client.js 호환용)
         */
        async generateContent(prompt, options = {}) {
            return this.sendMessage(prompt, options);
        }
    }

    // Singleton 인스턴스 생성 및 전역 등록
    if (typeof window !== 'undefined') {
        // 모든 서브모듈이 로드되었는지 확인
        const requiredModules = ['llmBase', 'llmClaude', 'llmOpenAI', 'llmGemini'];
        const missingModules = requiredModules.filter(mod => !window[mod]);

        if (missingModules.length > 0) {
            console.warn('⚠️ Missing LLM modules:', missingModules.join(', '));
            console.warn('⚠️ Make sure to load all modules before index.js');
        }

        // 기존 multiLLMClient와 호환되는 통합 인스턴스 생성
        const multiLLMClient = new MultiLLMClient();

        // 전역 등록 (기존 코드와 호환)
        window.MultiLLMClient = MultiLLMClient;
        window.multiLLMClient = multiLLMClient;

        // 네임스페이스 객체로도 접근 가능
        window.KPSUR = window.KPSUR || {};
        window.KPSUR.llm = {
            client: multiLLMClient,
            base: window.llmBase,
            claude: window.llmClaude,
            openai: window.llmOpenAI,
            gemini: window.llmGemini
        };

        console.log('✅ LLM modules loaded and integrated');
    }

})();
