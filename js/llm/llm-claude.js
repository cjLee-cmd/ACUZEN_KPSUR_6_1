/**
 * LLM Claude - Anthropic Claude API 구현
 * js/llm/llm-claude.js
 *
 * 의존성: llm-base.js
 */

(function() {
    'use strict';

    /**
     * LLMClaude - Claude API 호출 클래스
     */
    class LLMClaude {
        constructor(base) {
            this.base = base;
        }

        /**
         * Claude API 호출 (단일 메시지)
         */
        async call(prompt, options = {}) {
            const apiKey = this.base.getApiKey('claude');
            if (!apiKey) throw new Error('Anthropic API 키가 설정되지 않았습니다.');

            const model = options.model || window.LLM_PROVIDERS.claude.defaultModel;
            const modelInfo = window.LLM_PROVIDERS.claude.models[model];

            const response = await fetch(window.LLM_PROVIDERS.claude.endpoint, {
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

            const inputTokens = data.usage?.input_tokens || 0;
            const outputTokens = data.usage?.output_tokens || 0;
            const cost = this.base.estimateCost('claude', model, inputTokens, outputTokens);
            this.base.totalCost += cost;

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
         * Claude 스트리밍 API 호출
         */
        async callStream(prompt, options = {}, onChunk) {
            const apiKey = this.base.getApiKey('claude');
            if (!apiKey) throw new Error('Anthropic API 키가 설정되지 않았습니다.');

            const model = options.model || window.LLM_PROVIDERS.claude.defaultModel;
            const modelInfo = window.LLM_PROVIDERS.claude.models[model];

            const response = await fetch(window.LLM_PROVIDERS.claude.endpoint, {
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

            return this.processStream(response, model, onChunk);
        }

        /**
         * Claude SSE 스트림 처리
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

            const cost = this.base.estimateCost('claude', model, inputTokens, outputTokens);
            this.base.totalCost += cost;

            return {
                success: true,
                text: fullText,
                model,
                provider: 'claude',
                usage: { inputTokens, outputTokens },
                cost
            };
        }

        /**
         * Claude API with conversation history
         */
        async callWithHistory(systemPrompt, messages, options = {}) {
            const apiKey = this.base.getApiKey('claude');
            if (!apiKey) throw new Error('Anthropic API 키가 설정되지 않았습니다.');

            const model = options.model || window.LLM_PROVIDERS.claude.defaultModel;
            const modelInfo = window.LLM_PROVIDERS.claude.models[model];

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

            const response = await fetch(window.LLM_PROVIDERS.claude.endpoint, {
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
            const cost = this.base.estimateCost('claude', model, inputTokens, outputTokens);
            this.base.totalCost += cost;

            return {
                success: true,
                text,
                model,
                provider: 'claude',
                usage: { inputTokens, outputTokens },
                cost
            };
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.LLMClaude = LLMClaude;

        if (window.llmBase) {
            window.llmClaude = new LLMClaude(window.llmBase);
        }
    }

})();
