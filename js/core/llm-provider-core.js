/**
 * ============================================================================
 * LLM PROVIDER CORE MODULE
 * ============================================================================
 *
 * @sealed DO NOT MODIFY WITHOUT EXPLICIT AUTHORIZATION
 *
 * This module contains core LLM API communication patterns for
 * Claude, OpenAI, and Gemini providers.
 * Changes to this module require explicit user approval and version tracking.
 *
 * MODIFICATION HISTORY:
 * --------------------------------
 * v1.0.0 (2026-01-07) - Initial sealed version
 *
 * ============================================================================
 */

(function() {
    'use strict';

    const MODULE_VERSION = '1.0.0';
    const MODULE_NAME = 'LLMProviderCore';
    const CREATED_AT = '2026-01-07';

    /**
     * Provider endpoint configurations (immutable)
     */
    const PROVIDER_ENDPOINTS = Object.freeze({
        claude: 'https://api.anthropic.com/v1/messages',
        openai: 'https://api.openai.com/v1/chat/completions',
        gemini: 'https://generativelanguage.googleapis.com/v1beta/models'
    });

    /**
     * Token pricing per million tokens (immutable)
     */
    const TOKEN_PRICING = Object.freeze({
        'claude-opus-4-5': { input: 15, output: 75 },
        'claude-sonnet-3-5': { input: 3, output: 15 },
        'claude-haiku-3-5': { input: 0.80, output: 4 },
        'gpt-4o': { input: 5, output: 15 },
        'gpt-4o-mini': { input: 0.15, output: 0.60 },
        'gemini-3-pro-preview': { input: 1.25, output: 5 },
        'gemini-3-flash-preview': { input: 0.075, output: 0.30 },
        'gemini-2.5-pro': { input: 1.25, output: 5 },
        'gemini-2.5-flash': { input: 0.075, output: 0.30 }
    });

    /**
     * Core LLM operations
     */
    const LLMProviderCore = {
        /**
         * Module metadata
         */
        VERSION: MODULE_VERSION,
        NAME: MODULE_NAME,
        ENDPOINTS: PROVIDER_ENDPOINTS,
        PRICING: TOKEN_PRICING,

        /**
         * Build Claude API request configuration
         * @param {string} prompt - User prompt
         * @param {Object} options - Request options
         * @returns {Object} Request configuration
         */
        buildClaudeRequest: function(prompt, options = {}) {
            const model = options.model || 'claude-sonnet-3-5';

            const config = {
                provider: 'claude',
                endpoint: PROVIDER_ENDPOINTS.claude,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: {
                    model: model,
                    max_tokens: options.maxTokens || 12000,
                    temperature: options.temperature || 0.3,
                    messages: [{ role: 'user', content: prompt }]
                },
                requiresApiKey: 'x-api-key'
            };

            // Add system prompt if provided
            if (options.systemPrompt) {
                config.body.system = options.systemPrompt;
            }

            // Add conversation history if provided
            if (options.messages && Array.isArray(options.messages)) {
                config.body.messages = options.messages;
            }

            return Object.freeze(config);
        },

        /**
         * Build OpenAI API request configuration
         * @param {string} prompt - User prompt
         * @param {Object} options - Request options
         * @returns {Object} Request configuration
         */
        buildOpenAIRequest: function(prompt, options = {}) {
            const model = options.model || 'gpt-4o';

            const messages = [];

            // Add system prompt
            if (options.systemPrompt) {
                messages.push({ role: 'system', content: options.systemPrompt });
            }

            // Add conversation history or single prompt
            if (options.messages && Array.isArray(options.messages)) {
                messages.push(...options.messages);
            } else {
                messages.push({ role: 'user', content: prompt });
            }

            const config = {
                provider: 'openai',
                endpoint: PROVIDER_ENDPOINTS.openai,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    model: model,
                    max_tokens: options.maxTokens || 12000,
                    temperature: options.temperature || 0.3,
                    messages: messages
                },
                requiresApiKey: 'Authorization',
                apiKeyPrefix: 'Bearer '
            };

            return Object.freeze(config);
        },

        /**
         * Build Gemini API request configuration
         * @param {string} prompt - User prompt
         * @param {Object} options - Request options
         * @returns {Object} Request configuration
         */
        buildGeminiRequest: function(prompt, options = {}) {
            const model = options.model || 'gemini-3-flash-preview';
            const apiVersion = options.apiVersion || 'v1beta';

            // Build contents array
            let contents;
            if (options.messages && Array.isArray(options.messages)) {
                contents = options.messages.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                }));
            } else {
                contents = [{ parts: [{ text: prompt }] }];
            }

            const bodyConfig = {
                contents: contents,
                generationConfig: {
                    temperature: options.temperature || 0.3,
                    maxOutputTokens: options.maxTokens || 8192
                }
            };

            // Add system instruction if provided
            if (options.systemPrompt) {
                bodyConfig.systemInstruction = {
                    parts: [{ text: options.systemPrompt }]
                };
            }

            const config = {
                provider: 'gemini',
                endpoint: `${PROVIDER_ENDPOINTS.gemini}/${model}:generateContent`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: bodyConfig,
                requiresApiKey: 'query',
                apiKeyParam: 'key'
            };

            return Object.freeze(config);
        },

        /**
         * Calculate cost based on token usage
         * @param {string} model - Model name
         * @param {number} inputTokens - Input token count
         * @param {number} outputTokens - Output token count
         * @returns {number} Estimated cost in USD
         */
        calculateCost: function(model, inputTokens, outputTokens) {
            const pricing = TOKEN_PRICING[model];
            if (!pricing) {
                console.warn(`[${MODULE_NAME}] Unknown model for pricing: ${model}`);
                return 0;
            }

            const inputCost = (inputTokens / 1000000) * pricing.input;
            const outputCost = (outputTokens / 1000000) * pricing.output;

            return inputCost + outputCost;
        },

        /**
         * Estimate token count from text
         * @param {string} text - Text to estimate
         * @returns {number} Estimated token count
         */
        estimateTokens: function(text) {
            if (!text) return 0;
            // Rough estimation: ~4 characters per token for English
            // For Korean, ~2-3 characters per token
            const koreanChars = (text.match(/[가-힣]/g) || []).length;
            const otherChars = text.length - koreanChars;

            return Math.ceil(koreanChars / 2 + otherChars / 4);
        },

        /**
         * Parse Claude API response
         * @param {Object} response - API response
         * @returns {Object} Parsed response
         */
        parseClaudeResponse: function(response) {
            return {
                text: response.content?.[0]?.text || '',
                inputTokens: response.usage?.input_tokens || 0,
                outputTokens: response.usage?.output_tokens || 0,
                model: response.model || 'unknown',
                stopReason: response.stop_reason
            };
        },

        /**
         * Parse OpenAI API response
         * @param {Object} response - API response
         * @returns {Object} Parsed response
         */
        parseOpenAIResponse: function(response) {
            return {
                text: response.choices?.[0]?.message?.content || '',
                inputTokens: response.usage?.prompt_tokens || 0,
                outputTokens: response.usage?.completion_tokens || 0,
                model: response.model || 'unknown',
                finishReason: response.choices?.[0]?.finish_reason
            };
        },

        /**
         * Parse Gemini API response
         * @param {Object} response - API response
         * @returns {Object} Parsed response
         */
        parseGeminiResponse: function(response) {
            return {
                text: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
                inputTokens: response.usageMetadata?.promptTokenCount || 0,
                outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
                model: response.modelVersion || 'unknown',
                finishReason: response.candidates?.[0]?.finishReason
            };
        },

        /**
         * Execute HTTP request to LLM API
         * @param {Object} config - Request configuration
         * @param {string} apiKey - API key
         * @returns {Promise<Object>} API response
         */
        executeRequest: async function(config, apiKey) {
            if (!apiKey) {
                throw new Error(`API key is required for ${config.provider}`);
            }

            // Build headers with API key
            const headers = { ...config.headers };

            if (config.requiresApiKey === 'query') {
                // Gemini uses query parameter
                config.endpoint = `${config.endpoint}?${config.apiKeyParam}=${apiKey}`;
            } else if (config.apiKeyPrefix) {
                headers[config.requiresApiKey] = `${config.apiKeyPrefix}${apiKey}`;
            } else {
                headers[config.requiresApiKey] = apiKey;
            }

            const startTime = Date.now();

            try {
                const response = await fetch(config.endpoint, {
                    method: config.method,
                    headers: headers,
                    body: JSON.stringify(config.body)
                });

                const latency = Date.now() - startTime;

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(
                        errorData.error?.message ||
                        `${config.provider} API error: ${response.status}`
                    );
                }

                const data = await response.json();

                // Parse response based on provider
                let parsed;
                switch (config.provider) {
                    case 'claude':
                        parsed = this.parseClaudeResponse(data);
                        break;
                    case 'openai':
                        parsed = this.parseOpenAIResponse(data);
                        break;
                    case 'gemini':
                        parsed = this.parseGeminiResponse(data);
                        break;
                    default:
                        parsed = { text: '', inputTokens: 0, outputTokens: 0 };
                }

                // Calculate cost
                const cost = this.calculateCost(
                    config.body.model || parsed.model,
                    parsed.inputTokens,
                    parsed.outputTokens
                );

                return {
                    success: true,
                    text: parsed.text,
                    provider: config.provider,
                    model: config.body.model || parsed.model,
                    usage: {
                        inputTokens: parsed.inputTokens,
                        outputTokens: parsed.outputTokens
                    },
                    cost: cost,
                    latency: latency
                };

            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    provider: config.provider,
                    latency: Date.now() - startTime
                };
            }
        },

        /**
         * Verify module integrity
         * @returns {Object} Integrity verification result
         */
        verifyIntegrity: function() {
            const requiredMethods = [
                'buildClaudeRequest',
                'buildOpenAIRequest',
                'buildGeminiRequest',
                'calculateCost',
                'estimateTokens',
                'parseClaudeResponse',
                'parseOpenAIResponse',
                'parseGeminiResponse',
                'executeRequest'
            ];

            const missingMethods = requiredMethods.filter(
                method => typeof this[method] !== 'function'
            );

            return {
                valid: missingMethods.length === 0,
                version: MODULE_VERSION,
                name: MODULE_NAME,
                missingMethods: missingMethods,
                frozen: Object.isFrozen(this)
            };
        }
    };

    // Freeze the module to prevent modifications
    Object.freeze(LLMProviderCore);

    // Register globally
    if (typeof window !== 'undefined') {
        if (window.LLMProviderCore) {
            console.warn(`[${MODULE_NAME}] Already registered. Skipping re-registration.`);
        } else {
            window.LLMProviderCore = LLMProviderCore;
            console.log(`[${MODULE_NAME}] v${MODULE_VERSION} loaded and sealed`);
        }
    }

    // Export for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = LLMProviderCore;
    }

})();
