/**
 * LLM Gemini - Google Gemini API 구현
 * js/llm/llm-gemini.js
 *
 * 의존성: llm-base.js
 */

(function() {
    'use strict';

    /**
     * LLMGemini - Gemini API 호출 클래스
     */
    class LLMGemini {
        constructor(base) {
            this.base = base;
        }

        /**
         * Gemini API 호출 (단일 메시지)
         */
        async call(prompt, options = {}) {
            const apiKey = this.base.getApiKey('google');
            if (!apiKey) throw new Error('Google API 키가 설정되지 않았습니다.');

            const model = options.model || window.LLM_PROVIDERS.google.defaultModel;
            const modelInfo = window.LLM_PROVIDERS.google.models[model];
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
            const cost = this.base.estimateCost('google', model, inputTokens, outputTokens);
            this.base.totalCost += cost;

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
         * Gemini 스트리밍 API 호출
         */
        async callStream(prompt, options = {}, onChunk) {
            const apiKey = this.base.getApiKey('google');
            if (!apiKey) throw new Error('Google API 키가 설정되지 않았습니다.');

            const model = options.model || window.LLM_PROVIDERS.google.defaultModel;
            const modelInfo = window.LLM_PROVIDERS.google.models[model];
            const apiVersion = modelInfo?.apiVersion || 'v1beta';
            const baseUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models`;
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

            return this.processStream(response, model, onChunk);
        }

        /**
         * Gemini SSE 스트림 처리
         */
        async processStream(response, model, onChunk) {
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

            const cost = this.base.estimateCost('google', model, inputTokens, outputTokens);
            this.base.totalCost += cost;

            return {
                success: true,
                text: fullText,
                model,
                provider: 'google',
                usage: { inputTokens, outputTokens },
                cost
            };
        }

        /**
         * Gemini API with conversation history
         */
        async callWithHistory(systemPrompt, messages, options = {}) {
            const apiKey = this.base.getApiKey('google');
            if (!apiKey) throw new Error('Google API 키가 설정되지 않았습니다.');

            const model = options.model || window.LLM_PROVIDERS.google.defaultModel;
            const modelInfo = window.LLM_PROVIDERS.google.models[model];
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
            const cost = this.base.estimateCost('google', model, inputTokens, outputTokens);
            this.base.totalCost += cost;

            return {
                success: true,
                text,
                model,
                provider: 'google',
                usage: { inputTokens, outputTokens },
                cost
            };
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.LLMGemini = LLMGemini;

        if (window.llmBase) {
            window.llmGemini = new LLMGemini(window.llmBase);
        }
    }

})();
