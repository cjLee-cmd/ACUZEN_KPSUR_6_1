/**
 * LLM OpenAI - OpenAI API 구현
 * js/llm/llm-openai.js
 *
 * 의존성: llm-base.js
 */

(function() {
    'use strict';

    /**
     * LLMOpenAI - OpenAI API 호출 클래스
     */
    class LLMOpenAI {
        constructor(base) {
            this.base = base;
        }

        /**
         * OpenAI API 호출 (단일 메시지)
         */
        async call(prompt, options = {}) {
            const apiKey = this.base.getApiKey('openai');
            if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

            const model = options.model || window.LLM_PROVIDERS.openai.defaultModel;
            const modelInfo = window.LLM_PROVIDERS.openai.models[model];

            const response = await fetch(window.LLM_PROVIDERS.openai.endpoint, {
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
            const cost = this.base.estimateCost('openai', model, inputTokens, outputTokens);
            this.base.totalCost += cost;

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
         * OpenAI 스트리밍 API 호출
         */
        async callStream(prompt, options = {}, onChunk) {
            const apiKey = this.base.getApiKey('openai');
            if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

            const model = options.model || window.LLM_PROVIDERS.openai.defaultModel;
            const modelInfo = window.LLM_PROVIDERS.openai.models[model];

            const response = await fetch(window.LLM_PROVIDERS.openai.endpoint, {
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

            return this.processStream(response, model, prompt, onChunk);
        }

        /**
         * OpenAI SSE 스트림 처리
         */
        async processStream(response, model, prompt, onChunk) {
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
            const cost = this.base.estimateCost('openai', model, inputTokens, outputTokens);
            this.base.totalCost += cost;

            return {
                success: true,
                text: fullText,
                model,
                provider: 'openai',
                usage: { inputTokens, outputTokens },
                cost
            };
        }

        /**
         * OpenAI API with conversation history
         */
        async callWithHistory(systemPrompt, messages, options = {}) {
            const apiKey = this.base.getApiKey('openai');
            if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

            const model = options.model || window.LLM_PROVIDERS.openai.defaultModel;
            const modelInfo = window.LLM_PROVIDERS.openai.models[model];

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

            const response = await fetch(window.LLM_PROVIDERS.openai.endpoint, {
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
            const cost = this.base.estimateCost('openai', model, inputTokens, outputTokens);
            this.base.totalCost += cost;

            return {
                success: true,
                text,
                model,
                provider: 'openai',
                usage: { inputTokens, outputTokens },
                cost
            };
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.LLMOpenAI = LLMOpenAI;

        if (window.llmBase) {
            window.llmOpenAI = new LLMOpenAI(window.llmBase);
        }
    }

})();
