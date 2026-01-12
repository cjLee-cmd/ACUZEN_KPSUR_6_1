/**
 * Multi-LLM Client
 * Claude, OpenAI, Gemini 멀티 프로바이더 지원
 * GitHub Pages 정적 호스팅 호환
 */

// AppStorage - 커스텀 스토리지 유틸리티
// (window.Storage는 브라우저 내장 인터페이스라 덮어쓸 수 없음)
const AppStorage = window.AppStorage || {
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            return localStorage.getItem(key);
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        } catch (e) {
            console.error('AppStorage.set error:', e);
        }
    }
};
window.AppStorage = AppStorage;

// DateHelper fallback (config.js에서 이미 선언된 경우 재선언하지 않음)
if (!window.DateHelper) {
    window.DateHelper = {
        formatYYMMDD_hhmmss: () => {
            const now = new Date();
            return now.toISOString().replace(/[-:T]/g, '').substring(0, 14);
        },
        formatISO: () => new Date().toISOString()
    };
}

// 전역 객체 참조 (config.js에서 로드된 경우 사용)

// LLM 프로바이더 정의
const LLM_PROVIDERS = {
    claude: {
        name: 'Anthropic Claude',
        endpoint: 'https://api.anthropic.com/v1/messages',
        models: {
            'claude-opus-4-5': {
                name: 'Claude Opus 4.5',
                inputPrice: 15,
                outputPrice: 75,
                maxTokens: 16000,
                quality: 'highest',
                description: '최고 품질 - 핵심 분석/평가'
            },
            'claude-sonnet-3-5': {
                name: 'Claude Sonnet 3.5',
                inputPrice: 3,
                outputPrice: 15,
                maxTokens: 12000,
                quality: 'high',
                description: '균형 - 초안 작성'
            },
            'claude-haiku-3-5': {
                name: 'Claude Haiku 3.5',
                inputPrice: 0.80,
                outputPrice: 4,
                maxTokens: 8000,
                quality: 'fast',
                description: '빠른 처리 - 분류/검증'
            }
        },
        defaultModel: 'claude-sonnet-3-5',
        apiKeyName: 'ANTHROPIC_API_KEY'
    },
    openai: {
        name: 'OpenAI',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        models: {
            'gpt-4o': {
                name: 'GPT-4o',
                inputPrice: 5,
                outputPrice: 15,
                maxTokens: 12000,
                quality: 'high',
                description: '균형 - 범용'
            },
            'gpt-4o-mini': {
                name: 'GPT-4o Mini',
                inputPrice: 0.15,
                outputPrice: 0.60,
                maxTokens: 8000,
                quality: 'fast',
                description: '빠른 처리 - 경제적'
            }
        },
        defaultModel: 'gpt-4o',
        apiKeyName: 'OPENAI_API_KEY'
    },
    google: {
        name: 'Google Gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        models: {
            'gemini-3-pro-preview': {
                name: 'Gemini 3 Pro Preview',
                inputPrice: 1.25,
                outputPrice: 5,
                maxTokens: 65536,
                quality: 'highest',
                description: '최고 품질 - 심층 분석'
            },
            'gemini-3-flash-preview': {
                name: 'Gemini 3 Flash Preview',
                inputPrice: 0.075,
                outputPrice: 0.30,
                maxTokens: 65536,
                quality: 'fast',
                description: '빠른 처리 - 기본 모델'
            },
            'gemini-2.5-pro': {
                name: 'Gemini 2.5 Pro',
                inputPrice: 1.25,
                outputPrice: 5,
                maxTokens: 65536,
                quality: 'high',
                description: '고품질 - 정밀 분석'
            },
            'gemini-2.5-flash': {
                name: 'Gemini 2.5 Flash',
                inputPrice: 0.075,
                outputPrice: 0.30,
                maxTokens: 65536,
                quality: 'fast',
                description: 'Flash - 빠르고 효율적'
            },
            'gemini-flash-latest': {
                name: 'Gemini Flash Latest',
                inputPrice: 0.075,
                outputPrice: 0.30,
                maxTokens: 8192,
                quality: 'fast',
                description: 'Gemini Flash Latest - 최신 안정 Flash 별칭'
            }
        },
        defaultModel: 'gemini-3-flash-preview',
        apiKeyName: 'GOOGLE_API_KEY'
    }
};

// Hybrid 모드 설정
const HYBRID_MODES = {
    'sonnet-opus': {
        name: 'Sonnet → Opus (권장)',
        phase1: { provider: 'claude', model: 'claude-sonnet-3-5', description: '전체 초안' },
        phase2: { provider: 'claude', model: 'claude-opus-4-5', description: '핵심 섹션 개선' },
        refineSections: [9, 10],
        estimatedSavings: 61
    },
    'haiku-sonnet': {
        name: 'Haiku → Sonnet (경제적)',
        phase1: { provider: 'claude', model: 'claude-haiku-3-5', description: '전체 초안' },
        phase2: { provider: 'claude', model: 'claude-sonnet-3-5', description: '핵심 섹션 개선' },
        refineSections: [9, 10],
        estimatedSavings: 75
    },
    'gemini-opus': {
        name: 'Gemini → Opus (초경제적)',
        phase1: { provider: 'google', model: 'gemini-3-flash-preview', description: '전체 초안' },
        phase2: { provider: 'claude', model: 'claude-opus-4-5', description: '핵심 섹션 개선' },
        refineSections: [9, 10],
        estimatedSavings: 80
    }
};

class MultiLLMClient {
    constructor() {
        this.dialogHistory = [];
        this.totalCost = 0;
        this.currentMode = 'single'; // 'single' or 'hybrid'
        this.hybridConfig = null;
    }

    // API 키 관리
    setApiKey(provider, apiKey) {
        const keyName = LLM_PROVIDERS[provider]?.apiKeyName;
        if (keyName) {
            AppStorage.set(keyName, apiKey);
            console.log(`✅ ${provider} API key set`);
            return true;
        }
        return false;
    }

    getApiKey(provider) {
        const keyName = LLM_PROVIDERS[provider]?.apiKeyName;
        return keyName ? AppStorage.get(keyName) : null;
    }

    hasApiKey(provider) {
        return !!this.getApiKey(provider);
    }

    // 프로바이더 정보 조회
    getProviders() {
        return LLM_PROVIDERS;
    }

    getModels(provider) {
        return LLM_PROVIDERS[provider]?.models || {};
    }

    getHybridModes() {
        return HYBRID_MODES;
    }

    // 비용 계산
    estimateCost(provider, model, inputTokens, outputTokens) {
        const modelInfo = LLM_PROVIDERS[provider]?.models[model];
        if (!modelInfo) return 0;

        const inputCost = (inputTokens / 1000000) * modelInfo.inputPrice;
        const outputCost = (outputTokens / 1000000) * modelInfo.outputPrice;
        return inputCost + outputCost;
    }

    // Claude API 호출
    async callClaude(prompt, options = {}) {
        const apiKey = this.getApiKey('claude');
        if (!apiKey) throw new Error('Anthropic API 키가 설정되지 않았습니다.');

        const model = options.model || LLM_PROVIDERS.claude.defaultModel;
        const modelInfo = LLM_PROVIDERS.claude.models[model];

        const response = await fetch(LLM_PROVIDERS.claude.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: options.maxTokens || modelInfo.maxTokens,
                temperature: options.temperature || 0.3,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Claude API Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || '';

        // 비용 계산
        const inputTokens = data.usage?.input_tokens || 0;
        const outputTokens = data.usage?.output_tokens || 0;
        const cost = this.estimateCost('claude', model, inputTokens, outputTokens);
        this.totalCost += cost;

        return {
            success: true,
            text,
            model,
            provider: 'claude',
            usage: { inputTokens, outputTokens },
            cost
        };
    }

    // OpenAI API 호출
    async callOpenAI(prompt, options = {}) {
        const apiKey = this.getApiKey('openai');
        if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

        const model = options.model || LLM_PROVIDERS.openai.defaultModel;
        const modelInfo = LLM_PROVIDERS.openai.models[model];

        const response = await fetch(LLM_PROVIDERS.openai.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                max_tokens: options.maxTokens || modelInfo.maxTokens,
                temperature: options.temperature || 0.3,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        const inputTokens = data.usage?.prompt_tokens || 0;
        const outputTokens = data.usage?.completion_tokens || 0;
        const cost = this.estimateCost('openai', model, inputTokens, outputTokens);
        this.totalCost += cost;

        return {
            success: true,
            text,
            model,
            provider: 'openai',
            usage: { inputTokens, outputTokens },
            cost
        };
    }

    // Gemini API 호출
    async callGemini(prompt, options = {}) {
        const apiKey = this.getApiKey('google');
        if (!apiKey) throw new Error('Google API 키가 설정되지 않았습니다.');

        const model = options.model || LLM_PROVIDERS.google.defaultModel;
        const modelInfo = LLM_PROVIDERS.google.models[model];
        // 모델별 API 버전 지원 (gemini-1.5-flash는 v1 사용)
        const apiVersion = modelInfo?.apiVersion || 'v1beta';
        const baseUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models`;
        const url = `${baseUrl}/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: options.temperature || 0.3,
                    maxOutputTokens: options.maxTokens || 8192
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Gemini는 usage 정보가 다름
        const inputTokens = data.usageMetadata?.promptTokenCount || 0;
        const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
        const cost = this.estimateCost('google', model, inputTokens, outputTokens);
        this.totalCost += cost;

        return {
            success: true,
            text,
            model,
            provider: 'google',
            usage: { inputTokens, outputTokens },
            cost
        };
    }

    // 통합 호출 메서드
    async generate(prompt, options = {}) {
        const provider = options.provider || 'claude';
        const startTime = Date.now();

        let result;
        switch (provider) {
            case 'claude':
                result = await this.callClaude(prompt, options);
                break;
            case 'openai':
                result = await this.callOpenAI(prompt, options);
                break;
            case 'google':
                result = await this.callGemini(prompt, options);
                break;
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }

        result.duration = ((Date.now() - startTime) / 1000).toFixed(2);

        // 대화 로그 저장
        this.logDialog(prompt, result);

        return result;
    }

    // ==========================================
    // 스트리밍 API 메서드들
    // ==========================================

    // Claude 스트리밍 API 호출
    async callClaudeStream(prompt, options = {}, onChunk) {
        const apiKey = this.getApiKey('claude');
        if (!apiKey) throw new Error('Anthropic API 키가 설정되지 않았습니다.');

        const model = options.model || LLM_PROVIDERS.claude.defaultModel;
        const modelInfo = LLM_PROVIDERS.claude.models[model];

        const response = await fetch(LLM_PROVIDERS.claude.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: options.maxTokens || modelInfo.maxTokens,
                temperature: options.temperature || 0.3,
                stream: true,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Claude API Error: ${error.error?.message || response.statusText}`);
        }

        return this.processClaudeStream(response, model, onChunk);
    }

    // Claude SSE 스트림 처리
    async processClaudeStream(response, model, onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let inputTokens = 0;
        let outputTokens = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

                for (const line of lines) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const json = JSON.parse(data);

                        if (json.type === 'content_block_delta' && json.delta?.text) {
                            fullText += json.delta.text;
                            if (onChunk) onChunk(json.delta.text, fullText);
                        } else if (json.type === 'message_delta' && json.usage) {
                            outputTokens = json.usage.output_tokens || 0;
                        } else if (json.type === 'message_start' && json.message?.usage) {
                            inputTokens = json.message.usage.input_tokens || 0;
                        }
                    } catch (e) {
                        // Skip unparseable lines
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        const cost = this.estimateCost('claude', model, inputTokens, outputTokens);
        this.totalCost += cost;

        return {
            success: true,
            text: fullText,
            model,
            provider: 'claude',
            usage: { inputTokens, outputTokens },
            cost
        };
    }

    // OpenAI 스트리밍 API 호출
    async callOpenAIStream(prompt, options = {}, onChunk) {
        const apiKey = this.getApiKey('openai');
        if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

        const model = options.model || LLM_PROVIDERS.openai.defaultModel;
        const modelInfo = LLM_PROVIDERS.openai.models[model];

        const response = await fetch(LLM_PROVIDERS.openai.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                max_tokens: options.maxTokens || modelInfo.maxTokens,
                temperature: options.temperature || 0.3,
                stream: true,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
        }

        return this.processOpenAIStream(response, model, onChunk);
    }

    // OpenAI SSE 스트림 처리
    async processOpenAIStream(response, model, onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

                for (const line of lines) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const json = JSON.parse(data);
                        const text = json.choices?.[0]?.delta?.content || '';

                        if (text) {
                            fullText += text;
                            if (onChunk) onChunk(text, fullText);
                        }
                    } catch (e) {
                        // Skip unparseable lines
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        // OpenAI streaming doesn't return usage in stream, estimate it
        const inputTokens = Math.ceil(prompt.length / 4);
        const outputTokens = Math.ceil(fullText.length / 4);
        const cost = this.estimateCost('openai', model, inputTokens, outputTokens);
        this.totalCost += cost;

        return {
            success: true,
            text: fullText,
            model,
            provider: 'openai',
            usage: { inputTokens, outputTokens },
            cost
        };
    }

    // Gemini 스트리밍 API 호출
    async callGeminiStream(prompt, options = {}, onChunk) {
        const apiKey = this.getApiKey('google');
        if (!apiKey) throw new Error('Google API 키가 설정되지 않았습니다.');

        const model = options.model || LLM_PROVIDERS.google.defaultModel;
        const modelInfo = LLM_PROVIDERS.google.models[model];
        const apiVersion = modelInfo?.apiVersion || 'v1beta';
        const baseUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models`;
        // streamGenerateContent 엔드포인트 사용
        const url = `${baseUrl}/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: options.temperature || 0.3,
                    maxOutputTokens: options.maxTokens || 8192
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
        }

        return this.processGeminiStream(response, model, onChunk);
    }

    // Gemini SSE 스트림 처리
    async processGeminiStream(response, model, onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let inputTokens = 0;
        let outputTokens = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

                for (const line of lines) {
                    const data = line.slice(6);

                    try {
                        const json = JSON.parse(data);
                        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

                        if (json.usageMetadata) {
                            inputTokens = json.usageMetadata.promptTokenCount || inputTokens;
                            outputTokens = json.usageMetadata.candidatesTokenCount || outputTokens;
                        }

                        if (text) {
                            fullText += text;
                            if (onChunk) onChunk(text, fullText);
                        }
                    } catch (e) {
                        // Skip unparseable lines
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        const cost = this.estimateCost('google', model, inputTokens, outputTokens);
        this.totalCost += cost;

        return {
            success: true,
            text: fullText,
            model,
            provider: 'google',
            usage: { inputTokens, outputTokens },
            cost
        };
    }

    // 통합 스트리밍 호출 메서드
    async generateStream(prompt, options = {}, onChunk) {
        const provider = options.provider || 'google';
        const startTime = Date.now();

        let result;
        switch (provider) {
            case 'claude':
                result = await this.callClaudeStream(prompt, options, onChunk);
                break;
            case 'openai':
                result = await this.callOpenAIStream(prompt, options, onChunk);
                break;
            case 'google':
                result = await this.callGeminiStream(prompt, options, onChunk);
                break;
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }

        result.duration = ((Date.now() - startTime) / 1000).toFixed(2);

        // 대화 로그 저장
        this.logDialog(prompt, result);

        return result;
    }

    // Hybrid 모드 생성
    async generateHybrid(prompt, hybridMode, options = {}) {
        const config = HYBRID_MODES[hybridMode];
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

    // Phase 2용 개선 프롬프트 생성
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

    // 결과 병합
    mergeResults(draft, refined, refineSections) {
        let result = draft;

        // 개선된 각 섹션 추출 및 병합
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

    // 대화 로그 저장
    logDialog(prompt, result) {
        this.dialogHistory.push({
            timestamp: DateHelper.formatISO(),
            prompt: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''),
            response: result.text?.substring(0, 500) + (result.text?.length > 500 ? '...' : ''),
            model: result.model,
            provider: result.provider,
            duration: result.duration,
            cost: result.cost,
            usage: result.usage
        });
    }

    // 대화 로그 내보내기
    exportDialogHistory(reportName) {
        const timestamp = DateHelper.formatYYMMDD_hhmmss();
        const filename = `${reportName}_LLMLog_${timestamp}.md`;

        let markdown = `# LLM Dialog History: ${reportName}\n\n`;
        markdown += `**생성 시간**: ${DateHelper.formatISO()}\n`;
        markdown += `**총 비용**: $${this.totalCost.toFixed(4)}\n\n`;
        markdown += `---\n\n`;

        this.dialogHistory.forEach((dialog, index) => {
            markdown += `## Dialog ${index + 1}\n\n`;
            markdown += `- **시간**: ${dialog.timestamp}\n`;
            markdown += `- **프로바이더**: ${dialog.provider}\n`;
            markdown += `- **모델**: ${dialog.model}\n`;
            markdown += `- **소요 시간**: ${dialog.duration}s\n`;
            markdown += `- **비용**: $${dialog.cost?.toFixed(4) || 'N/A'}\n`;
            markdown += `- **토큰**: 입력 ${dialog.usage?.inputTokens || 0}, 출력 ${dialog.usage?.outputTokens || 0}\n\n`;
            markdown += `### Prompt (일부)\n\`\`\`\n${dialog.prompt}\n\`\`\`\n\n`;
            markdown += `### Response (일부)\n\`\`\`\n${dialog.response}\n\`\`\`\n\n`;
            markdown += `---\n\n`;
        });

        return { filename, content: markdown };
    }

    // 통계 조회
    getStats() {
        return {
            totalCost: this.totalCost,
            dialogCount: this.dialogHistory.length,
            history: this.dialogHistory
        };
    }

    // 초기화
    reset() {
        this.dialogHistory = [];
        this.totalCost = 0;
    }

    // 호환성 래퍼: sendMessage (기존 코드 호환용)
    async sendMessage(prompt, options = {}) {
        // 기본 provider를 google로 설정 (Gemini 사용)
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

    // 호환성 래퍼: generateContent (llm-client.js 호환용)
    async generateContent(prompt, options = {}) {
        return this.sendMessage(prompt, options);
    }

    // =====================================================
    // History-enabled API Methods (세션 대화 지원)
    // =====================================================

    /**
     * Claude API with conversation history
     * @param {string} systemPrompt - 시스템 프롬프트
     * @param {Array} messages - 대화 히스토리 [{role: 'user'|'assistant', content: string}]
     * @param {Object} options - 추가 옵션
     */
    async callClaudeWithHistory(systemPrompt, messages, options = {}) {
        const apiKey = this.getApiKey('claude');
        if (!apiKey) throw new Error('Anthropic API 키가 설정되지 않았습니다.');

        const model = options.model || LLM_PROVIDERS.claude.defaultModel;
        const modelInfo = LLM_PROVIDERS.claude.models[model];

        // messages 배열 검증 및 정규화
        const normalizedMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const requestBody = {
            model: model,
            max_tokens: options.maxTokens || modelInfo.maxTokens,
            temperature: options.temperature || 0.3,
            messages: normalizedMessages
        };

        // system 프롬프트가 있으면 추가
        if (systemPrompt) {
            requestBody.system = systemPrompt;
        }

        const response = await fetch(LLM_PROVIDERS.claude.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Claude API Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || '';

        const inputTokens = data.usage?.input_tokens || 0;
        const outputTokens = data.usage?.output_tokens || 0;
        const cost = this.estimateCost('claude', model, inputTokens, outputTokens);
        this.totalCost += cost;

        return {
            success: true,
            text,
            model,
            provider: 'claude',
            usage: { inputTokens, outputTokens },
            cost
        };
    }

    /**
     * OpenAI API with conversation history
     * @param {string} systemPrompt - 시스템 프롬프트
     * @param {Array} messages - 대화 히스토리 [{role: 'user'|'assistant', content: string}]
     * @param {Object} options - 추가 옵션
     */
    async callOpenAIWithHistory(systemPrompt, messages, options = {}) {
        const apiKey = this.getApiKey('openai');
        if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

        const model = options.model || LLM_PROVIDERS.openai.defaultModel;
        const modelInfo = LLM_PROVIDERS.openai.models[model];

        // OpenAI는 system role 메시지를 첫 번째로 추가
        const allMessages = [];
        if (systemPrompt) {
            allMessages.push({ role: 'system', content: systemPrompt });
        }

        // 대화 히스토리 추가
        messages.forEach(msg => {
            allMessages.push({
                role: msg.role,
                content: msg.content
            });
        });

        const response = await fetch(LLM_PROVIDERS.openai.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                max_tokens: options.maxTokens || modelInfo.maxTokens,
                temperature: options.temperature || 0.3,
                messages: allMessages
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        const inputTokens = data.usage?.prompt_tokens || 0;
        const outputTokens = data.usage?.completion_tokens || 0;
        const cost = this.estimateCost('openai', model, inputTokens, outputTokens);
        this.totalCost += cost;

        return {
            success: true,
            text,
            model,
            provider: 'openai',
            usage: { inputTokens, outputTokens },
            cost
        };
    }

    /**
     * Gemini API with conversation history
     * @param {string} systemPrompt - 시스템 프롬프트
     * @param {Array} messages - 대화 히스토리 [{role: 'user'|'assistant', content: string}]
     * @param {Object} options - 추가 옵션
     */
    async callGeminiWithHistory(systemPrompt, messages, options = {}) {
        const apiKey = this.getApiKey('google');
        if (!apiKey) throw new Error('Google API 키가 설정되지 않았습니다.');

        const model = options.model || LLM_PROVIDERS.google.defaultModel;
        const modelInfo = LLM_PROVIDERS.google.models[model];
        const apiVersion = modelInfo?.apiVersion || 'v1beta';
        const baseUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models`;
        const url = `${baseUrl}/${model}:generateContent?key=${apiKey}`;

        // Gemini 형식으로 변환: role은 'user' 또는 'model'
        const contents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: options.temperature || 0.3,
                maxOutputTokens: options.maxTokens || 8192
            }
        };

        // systemInstruction 추가 (Gemini 1.5+ 지원)
        if (systemPrompt) {
            requestBody.systemInstruction = {
                parts: [{ text: systemPrompt }]
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const inputTokens = data.usageMetadata?.promptTokenCount || 0;
        const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
        const cost = this.estimateCost('google', model, inputTokens, outputTokens);
        this.totalCost += cost;

        return {
            success: true,
            text,
            model,
            provider: 'google',
            usage: { inputTokens, outputTokens },
            cost
        };
    }

    /**
     * 통합 히스토리 호출 메서드
     * @param {string} systemPrompt - 시스템 프롬프트
     * @param {Array} messages - 대화 히스토리
     * @param {Object} options - provider, model 등 옵션
     */
    async generateWithHistory(systemPrompt, messages, options = {}) {
        const provider = options.provider || 'claude';
        const startTime = Date.now();

        try {
            let result;

            switch (provider) {
                case 'claude':
                case 'anthropic':
                    result = await this.callClaudeWithHistory(systemPrompt, messages, options);
                    break;
                case 'openai':
                    result = await this.callOpenAIWithHistory(systemPrompt, messages, options);
                    break;
                case 'google':
                case 'gemini':
                    result = await this.callGeminiWithHistory(systemPrompt, messages, options);
                    break;
                default:
                    throw new Error(`지원하지 않는 provider: ${provider}`);
            }

            result.latency = Date.now() - startTime;
            return result;

        } catch (error) {
            console.error(`[MultiLLMClient] ${provider} with history error:`, error);
            throw error;
        }
    }
}

// Singleton instance
const multiLLMClient = new MultiLLMClient();

// 전역 내보내기 (ES6 모듈 대신)
if (typeof window !== 'undefined') {
    window.multiLLMClient = multiLLMClient;
    window.MultiLLMClient = MultiLLMClient;
    window.LLM_PROVIDERS = LLM_PROVIDERS;
    window.HYBRID_MODES = HYBRID_MODES;
}
