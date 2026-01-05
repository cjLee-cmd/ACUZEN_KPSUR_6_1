/**
 * LLM Session Manager
 * 보고서별 LLM 세션 관리 및 대화 히스토리 유지
 *
 * 주요 기능:
 * - 세션 초기화/복원 (DB 우선, localStorage 캐시)
 * - 대화 히스토리 관리
 * - 컨텍스트 윈도우 토큰 관리 (80% 임계값)
 * - "왜 이렇게 답변했나요?" 기능 지원
 */

class LLMSessionManager {
    constructor() {
        this.currentSession = null;
        this.messages = [];  // 대화 히스토리
        this.systemPrompt = '';

        // 토큰 관리 설정
        this.tokenLimits = {
            'claude-opus-4-5': { max: 200000, safe: 160000 },
            'claude-sonnet-4': { max: 200000, safe: 160000 },
            'claude-sonnet-3-5': { max: 200000, safe: 160000 },
            'gpt-4o': { max: 128000, safe: 102000 },
            'gemini-3-flash-preview': { max: 1000000, safe: 800000 },
            'gemini-2.5-pro-preview': { max: 1000000, safe: 800000 }
        };

        this.currentTokens = 0;
        this.sequenceNumber = 0;
    }

    /**
     * 세션 초기화 또는 복원
     * @param {string} reportId - 보고서 UUID
     * @param {Object} options - 추가 옵션 (systemPrompt, model)
     */
    async initSession(reportId, options = {}) {
        if (!reportId) {
            throw new Error('reportId가 필요합니다.');
        }

        console.log('[LLMSessionManager] Initializing session for report:', reportId);

        // 1. DB에서 기존 세션 조회
        let existingSession = null;
        try {
            if (window.supabaseClient) {
                existingSession = await window.supabaseClient.getLLMSession(reportId);
            }
        } catch (error) {
            console.warn('[LLMSessionManager] DB session lookup failed:', error);
        }

        // 2. DB에 세션이 있으면 복원
        if (existingSession && existingSession.status === 'active') {
            await this.restoreSession(existingSession);
            return this.getSessionInfo();
        }

        // 3. localStorage 캐시 확인
        const cachedSession = this.loadFromCache(reportId);
        if (cachedSession) {
            console.log('[LLMSessionManager] Restoring from cache');
            this.currentSession = cachedSession.session;
            this.messages = cachedSession.messages || [];
            // 시스템 프롬프트 - 항상 최신 마크다운 데이터 포함하여 재생성
            this.systemPrompt = this.getDefaultSystemPrompt();
            this.currentTokens = cachedSession.currentTokens || 0;
            this.sequenceNumber = cachedSession.sequenceNumber || 0;
            return this.getSessionInfo();
        }

        // 4. 새 세션 생성
        await this.createNewSession(reportId, options);
        return this.getSessionInfo();
    }

    /**
     * DB에서 세션 복원
     */
    async restoreSession(dbSession) {
        console.log('[LLMSessionManager] Restoring session from DB:', dbSession.session_id);

        this.currentSession = {
            id: dbSession.id,
            sessionId: dbSession.session_id,
            reportId: dbSession.report_id,
            modelName: dbSession.model_name,
            status: dbSession.status,
            createdAt: dbSession.created_at,
            lastActivityAt: dbSession.last_activity_at
        };

        // 시스템 프롬프트 - 항상 최신 마크다운 데이터 포함하여 재생성
        this.systemPrompt = this.getDefaultSystemPrompt();
        this.currentTokens = dbSession.context_window_tokens || 0;

        // 대화 히스토리 복원
        try {
            if (window.supabaseClient) {
                const dbMessages = await window.supabaseClient.getLLMSessionMessages(dbSession.id);
                this.messages = dbMessages.map(msg => ({
                    role: msg.role,
                    content: msg.user_message || msg.assistant_message || msg.request_summary || '',
                    sequenceNumber: msg.sequence_number,
                    timestamp: msg.created_at
                })).filter(m => m.content);

                this.sequenceNumber = Math.max(0, ...this.messages.map(m => m.sequenceNumber || 0));
            }
        } catch (error) {
            console.warn('[LLMSessionManager] Failed to load message history:', error);
            this.messages = [];
        }

        // 캐시 업데이트
        this.saveToCache();
    }

    /**
     * 새 세션 생성
     */
    async createNewSession(reportId, options = {}) {
        const sessionId = `session_${reportId}_${Date.now()}`;

        // 모델 자동 선택: 사용 가능한 API 키 기반
        const modelName = options.model || this.detectAvailableModel();

        console.log('[LLMSessionManager] Creating new session:', sessionId, 'model:', modelName);

        // 기본 시스템 프롬프트
        this.systemPrompt = options.systemPrompt || this.getDefaultSystemPrompt();

        this.currentSession = {
            sessionId: sessionId,
            reportId: reportId,
            modelName: modelName,
            status: 'active',
            createdAt: new Date().toISOString()
        };

        this.messages = [];
        this.currentTokens = 0;
        this.sequenceNumber = 0;

        // DB에 세션 저장
        try {
            if (window.supabaseClient) {
                const dbResult = await window.supabaseClient.createLLMSession(reportId, {
                    sessionId: sessionId,
                    systemPrompt: this.systemPrompt,
                    modelName: modelName
                });

                if (dbResult) {
                    this.currentSession.id = dbResult.id;
                }
            }
        } catch (error) {
            console.warn('[LLMSessionManager] Failed to save session to DB:', error);
        }

        // 캐시 저장
        this.saveToCache();
    }

    /**
     * 기본 시스템 프롬프트
     */
    getDefaultSystemPrompt() {
        // 업로드된 마크다운 데이터 로드
        const markdownContext = this.loadMarkdownContext();

        let basePrompt = `당신은 한국 식품의약품안전처(MFDS) PSUR 보고서 작성을 전문으로 하는 AI 어시스턴트입니다.

역할:
- PSUR 15개 섹션에 대한 전문적인 작성 지원
- 규제 요구사항 준수 확인
- 데이터 정확성 검증

절대 규칙:
1. 누락된 데이터를 임의로 생성하지 마세요. 데이터가 없으면 사용자에게 요청하세요.
2. 충돌하는 데이터가 있으면 모든 버전을 제시하고 사용자가 선택하도록 하세요.
3. 모든 답변은 한국어로 제공하세요.

이전 대화 컨텍스트를 유지하며, 사용자의 질문에 일관된 답변을 제공하세요.`;

        // 마크다운 컨텍스트가 있으면 추가
        if (markdownContext) {
            basePrompt += `\n\n=== 업로드된 원본 문서 데이터 ===\n${markdownContext}`;
        }

        return basePrompt;
    }

    /**
     * localStorage에서 마크다운 컨텍스트 로드
     */
    loadMarkdownContext() {
        try {
            // 1. current_report에서 user_inputs.convertedMarkdowns 확인
            const currentReport = localStorage.getItem('current_report');
            if (currentReport) {
                const report = JSON.parse(currentReport);
                if (report.user_inputs?.convertedMarkdowns) {
                    return this.formatMarkdownData(report.user_inputs.convertedMarkdowns);
                }
            }

            // 2. 직접 convertedMarkdowns 확인
            const convertedMarkdowns = localStorage.getItem('convertedMarkdowns');
            if (convertedMarkdowns) {
                return this.formatMarkdownData(JSON.parse(convertedMarkdowns));
            }

            // 3. uploadedMarkdown (단일 파일 케이스)
            const uploadedMarkdown = localStorage.getItem('uploadedMarkdown');
            if (uploadedMarkdown) {
                return uploadedMarkdown;
            }

            return null;
        } catch (error) {
            console.warn('[LLMSessionManager] Failed to load markdown context:', error);
            return null;
        }
    }

    /**
     * 마크다운 데이터 포맷팅
     */
    formatMarkdownData(markdowns) {
        if (!markdowns || typeof markdowns !== 'object') return null;

        const entries = Object.entries(markdowns);
        if (entries.length === 0) return null;

        // 토큰 제한을 위해 각 문서는 최대 50000자로 제한
        const MAX_CHARS_PER_DOC = 50000;

        return entries.map(([fileName, content]) => {
            let truncatedContent = content;
            if (content.length > MAX_CHARS_PER_DOC) {
                truncatedContent = content.substring(0, MAX_CHARS_PER_DOC) + '\n... (내용 생략됨)';
            }
            return `\n--- ${fileName} ---\n${truncatedContent}`;
        }).join('\n');
    }

    /**
     * 메시지 전송 (히스토리 포함)
     * @param {string} userMessage - 사용자 메시지
     * @param {Object} options - 추가 옵션
     */
    async sendMessage(userMessage, options = {}) {
        if (!this.currentSession) {
            throw new Error('세션이 초기화되지 않았습니다. initSession()을 먼저 호출하세요.');
        }

        // 사용자 메시지 추가
        this.sequenceNumber++;
        const userEntry = {
            role: 'user',
            content: userMessage,
            sequenceNumber: this.sequenceNumber,
            timestamp: new Date().toISOString()
        };
        this.messages.push(userEntry);

        // 토큰 트리밍 (필요시)
        await this.trimContextIfNeeded();

        // LLM API 호출
        const provider = options.provider || this.getProviderFromModel(this.currentSession.modelName);

        try {
            const result = await window.multiLLMClient.generateWithHistory(
                this.systemPrompt,
                this.messages.map(m => ({ role: m.role, content: m.content })),
                {
                    provider: provider,
                    model: options.model || this.currentSession.modelName,
                    temperature: options.temperature || 0.3
                }
            );

            if (!result.success) {
                throw new Error(result.error || 'LLM 응답 실패');
            }

            // 어시스턴트 응답 추가
            this.sequenceNumber++;
            const assistantEntry = {
                role: 'assistant',
                content: result.text,
                sequenceNumber: this.sequenceNumber,
                timestamp: new Date().toISOString()
            };
            this.messages.push(assistantEntry);

            // 토큰 업데이트
            this.currentTokens += (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0);

            // DB에 저장
            await this.saveMessageToDb(userEntry, assistantEntry, result.usage);

            // 캐시 업데이트
            this.saveToCache();

            return {
                success: true,
                text: result.text,
                usage: result.usage,
                cost: result.cost
            };

        } catch (error) {
            // 실패 시 사용자 메시지 롤백
            this.messages.pop();
            this.sequenceNumber--;
            throw error;
        }
    }

    /**
     * "왜 이렇게 답변했나요?" 기능
     * @param {string} context - 질문 대상 컨텍스트 (예: 특정 섹션 내용)
     */
    async askWhy(context = '') {
        let question = '이전 답변에서 왜 그렇게 답변했는지 설명해주세요.';

        if (context) {
            question = `다음 내용에 대해 왜 이렇게 답변했는지 설명해주세요:\n\n"${context.substring(0, 500)}..."`;
        }

        return this.sendMessage(question);
    }

    /**
     * 컨텍스트 윈도우 트리밍
     * 80% 임계값 초과 시 오래된 메시지 제거
     */
    async trimContextIfNeeded() {
        const model = this.currentSession.modelName;
        const limits = this.tokenLimits[model] || { max: 200000, safe: 160000 };

        if (this.currentTokens > limits.safe) {
            console.log('[LLMSessionManager] Trimming context, current tokens:', this.currentTokens);

            // 최소 4개 메시지 유지 (최근 2개 user-assistant 쌍)
            while (this.messages.length > 4 && this.currentTokens > limits.safe) {
                const removed = this.messages.shift();
                // 대략적인 토큰 추정 (한국어: 글자당 ~2토큰)
                const estimatedTokens = (removed.content?.length || 0) * 2;
                this.currentTokens = Math.max(0, this.currentTokens - estimatedTokens);
            }

            console.log('[LLMSessionManager] After trim, tokens:', this.currentTokens, 'messages:', this.messages.length);
        }
    }

    /**
     * DB에 메시지 저장
     */
    async saveMessageToDb(userEntry, assistantEntry, usage = {}) {
        if (!window.supabaseClient || !this.currentSession.id) {
            return;
        }

        try {
            await window.supabaseClient.saveLLMMessage(
                this.currentSession.id,
                this.currentSession.reportId,
                {
                    sequenceNumber: userEntry.sequenceNumber,
                    userMessage: userEntry.content,
                    assistantMessage: assistantEntry.content,
                    dialogType: 'chat',
                    inputTokens: usage.inputTokens || 0,
                    outputTokens: usage.outputTokens || 0
                }
            );
        } catch (error) {
            console.warn('[LLMSessionManager] Failed to save message to DB:', error);
        }
    }

    /**
     * localStorage 캐시 저장
     */
    saveToCache() {
        if (!this.currentSession) return;

        const cacheKey = `llm_session_cache_${this.currentSession.reportId}`;
        const cacheData = {
            session: this.currentSession,
            messages: this.messages,
            systemPrompt: this.systemPrompt,
            currentTokens: this.currentTokens,
            sequenceNumber: this.sequenceNumber,
            cachedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('[LLMSessionManager] Failed to save cache:', error);
        }
    }

    /**
     * localStorage 캐시 로드
     */
    loadFromCache(reportId) {
        const cacheKey = `llm_session_cache_${reportId}`;

        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                // 캐시 유효성 검사 (7일)
                const cachedDate = new Date(data.cachedAt);
                const daysDiff = (Date.now() - cachedDate.getTime()) / (1000 * 60 * 60 * 24);

                if (daysDiff < 7) {
                    return data;
                }
            }
        } catch (error) {
            console.warn('[LLMSessionManager] Failed to load cache:', error);
        }

        return null;
    }

    /**
     * 캐시 삭제
     */
    clearCache(reportId) {
        const cacheKey = `llm_session_cache_${reportId}`;
        try {
            localStorage.removeItem(cacheKey);
        } catch (error) {
            console.warn('[LLMSessionManager] Failed to clear cache:', error);
        }
    }

    /**
     * 모델명에서 provider 추론
     */
    getProviderFromModel(modelName) {
        if (modelName.startsWith('claude')) return 'claude';
        if (modelName.startsWith('gpt')) return 'openai';
        if (modelName.startsWith('gemini')) return 'google';
        return 'claude';  // 기본값
    }

    /**
     * 사용 가능한 API 키 기반으로 모델 자동 선택
     */
    detectAvailableModel() {
        // API 키 확인 순서: Claude > OpenAI > Google
        const claudeKey = localStorage.getItem('ANTHROPIC_API_KEY');
        const openaiKey = localStorage.getItem('OPENAI_API_KEY');
        const googleKey = localStorage.getItem('GOOGLE_API_KEY');

        if (claudeKey) {
            return 'claude-sonnet-4';
        }
        if (openaiKey) {
            return 'gpt-4o';
        }
        if (googleKey) {
            return 'gemini-2.0-flash';
        }

        // 기본값 (키가 없어도 일단 설정)
        console.warn('[LLMSessionManager] No API key found, defaulting to gemini-2.0-flash');
        return 'gemini-2.0-flash';
    }

    /**
     * 세션 정보 반환
     */
    getSessionInfo() {
        return {
            session: this.currentSession,
            messageCount: this.messages.length,
            currentTokens: this.currentTokens,
            systemPrompt: this.systemPrompt,
            isActive: this.currentSession?.status === 'active'
        };
    }

    /**
     * 세션 상태 반환
     */
    getSessionStatus() {
        const model = this.currentSession?.modelName || 'claude-sonnet-3-5';
        const limits = this.tokenLimits[model] || { max: 200000, safe: 160000 };

        return {
            sessionId: this.currentSession?.sessionId,
            reportId: this.currentSession?.reportId,
            model: model,
            status: this.currentSession?.status || 'inactive',
            messageCount: this.messages.length,
            tokenUsage: {
                current: this.currentTokens,
                max: limits.max,
                safe: limits.safe,
                percentUsed: Math.round((this.currentTokens / limits.max) * 100)
            }
        };
    }

    /**
     * 대화 히스토리 반환
     */
    getMessageHistory() {
        return [...this.messages];
    }

    /**
     * 세션 종료 및 아카이브
     */
    async archiveSession() {
        if (!this.currentSession) return;

        try {
            if (window.supabaseClient && this.currentSession.id) {
                await window.supabaseClient.archiveLLMSession(this.currentSession.id);
            }
        } catch (error) {
            console.warn('[LLMSessionManager] Failed to archive session:', error);
        }

        // 캐시도 정리
        this.clearCache(this.currentSession.reportId);

        // 상태 초기화
        this.currentSession = null;
        this.messages = [];
        this.currentTokens = 0;
        this.sequenceNumber = 0;
    }

    /**
     * 세션 리셋 (새로 시작)
     */
    async resetSession() {
        if (!this.currentSession) return;

        const reportId = this.currentSession.reportId;
        await this.archiveSession();
        await this.initSession(reportId);
    }
}

// 전역 싱글톤
const llmSessionManager = new LLMSessionManager();

// 전역 내보내기
if (typeof window !== 'undefined') {
    window.LLMSessionManager = LLMSessionManager;
    window.llmSessionManager = llmSessionManager;
}
