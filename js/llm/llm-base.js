/**
 * LLM Base - 공통 인터페이스 및 유틸리티
 * js/llm/llm-base.js
 *
 * LLM 프로바이더 정의, API 키 관리, 비용 계산 등 공통 기능
 */

(function() {
    'use strict';

    // AppStorage - 커스텀 스토리지 유틸리티
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

    // DateHelper fallback
    if (!window.DateHelper) {
        window.DateHelper = {
            formatYYMMDD_hhmmss: () => {
                const now = new Date();
                return now.toISOString().replace(/[-:T]/g, '').substring(0, 14);
            },
            formatISO: () => new Date().toISOString()
        };
    }

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

    /**
     * LLMBase - 공통 기능 클래스
     */
    class LLMBase {
        constructor() {
            this.dialogHistory = [];
            this.totalCost = 0;
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

        // 대화 로그 저장
        logDialog(prompt, result) {
            this.dialogHistory.push({
                timestamp: window.DateHelper.formatISO(),
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
            const timestamp = window.DateHelper.formatYYMMDD_hhmmss();
            const filename = `${reportName}_LLMLog_${timestamp}.md`;

            let markdown = `# LLM Dialog History: ${reportName}\n\n`;
            markdown += `**생성 시간**: ${window.DateHelper.formatISO()}\n`;
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
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.LLM_PROVIDERS = LLM_PROVIDERS;
        window.HYBRID_MODES = HYBRID_MODES;
        window.LLMBase = LLMBase;
        window.llmBase = new LLMBase();
    }

})();
