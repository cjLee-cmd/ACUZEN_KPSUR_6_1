/**
 * Chat Modal Controller
 * LLM 대화 UI 제어 및 세션 매니저 통합
 *
 * 기능:
 * - 모달 열기/닫기/최소화
 * - 메시지 전송 및 표시
 * - "왜 이렇게 답변했나요?" 기능
 * - 토큰 사용량 표시
 * - 세션 정보 표시
 */

class ChatModal {
    constructor() {
        this.isOpen = false;
        this.isMinimized = false;
        this.isLoading = false;
        this.currentContext = null;  // 현재 섹션 컨텍스트

        // DOM 요소 참조
        this.elements = {
            overlay: null,
            modal: null,
            body: null,
            input: null,
            sendBtn: null,
            floatingBtn: null,
            tokenProgress: null,
            tokenText: null,
            sessionInfo: null
        };

        // 바인딩
        this.handleSend = this.handleSend.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleQuickAction = this.handleQuickAction.bind(this);
    }

    /**
     * 모달 초기화 (DOM 생성)
     */
    init() {
        if (document.getElementById('chat-modal')) {
            console.log('[ChatModal] Already initialized');
            return;
        }

        this.createModalHTML();
        this.cacheElements();
        this.bindEvents();

        console.log('[ChatModal] Initialized');
    }

    /**
     * 모달 HTML 생성
     */
    createModalHTML() {
        const html = `
            <!-- Floating Button -->
            <button id="chat-floating-btn" class="chat-floating-btn" title="AI 채팅">
                <span>&#128172;</span>
            </button>

            <!-- Modal Overlay -->
            <div id="chat-modal-overlay" class="chat-modal-overlay"></div>

            <!-- Chat Modal -->
            <div id="chat-modal" class="chat-modal">
                <!-- Header -->
                <div class="chat-header" id="chat-header">
                    <div class="chat-header-left">
                        <div class="chat-header-icon">&#129302;</div>
                        <div>
                            <div class="chat-header-title">KPSUR AI Assistant</div>
                            <div class="chat-header-status" id="chat-status">
                                세션 활성
                            </div>
                        </div>
                    </div>
                    <div class="chat-header-actions">
                        <button class="chat-header-btn" id="chat-minimize-btn" title="최소화">
                            &#8722;
                        </button>
                        <button class="chat-header-btn" id="chat-close-btn" title="닫기">
                            &#10005;
                        </button>
                    </div>
                </div>

                <!-- Session Info -->
                <div class="chat-session-info" id="chat-session-info">
                    <span class="chat-session-info-item">
                        &#128172; <strong id="chat-message-count">0</strong> 메시지
                    </span>
                    <span class="chat-session-info-item">
                        &#127919; <strong id="chat-model-name">-</strong>
                    </span>
                </div>

                <!-- Body / Messages -->
                <div class="chat-body" id="chat-body">
                    <div class="chat-empty-state" id="chat-empty-state">
                        <div class="chat-empty-icon">&#128172;</div>
                        <div class="chat-empty-title">대화를 시작하세요</div>
                        <div class="chat-empty-desc">
                            PSUR 보고서 작성에 대해 질문하거나<br>
                            생성된 내용에 대해 물어보세요.
                        </div>
                    </div>
                </div>

                <!-- Input Area -->
                <div class="chat-input-area">
                    <div class="chat-input-wrapper">
                        <div class="chat-input-container">
                            <textarea
                                id="chat-input"
                                class="chat-input"
                                placeholder="메시지를 입력하세요..."
                                rows="1"
                            ></textarea>
                            <button id="chat-send-btn" class="chat-input-send" title="전송">
                                &#10148;
                            </button>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="chat-quick-actions">
                        <button class="chat-quick-btn" data-action="why">
                            &#128269; 왜 이렇게 답변했나요?
                        </button>
                        <button class="chat-quick-btn" data-action="improve">
                            &#128161; 개선 제안
                        </button>
                        <button class="chat-quick-btn" data-action="reference">
                            &#128214; 참조 문서
                        </button>
                    </div>

                    <!-- Token Usage -->
                    <div class="chat-token-bar">
                        <div class="chat-token-progress" id="chat-token-progress" style="width: 0%;"></div>
                    </div>
                    <div class="chat-token-text" id="chat-token-text">
                        토큰: 0 / 200,000
                    </div>
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
    }

    /**
     * DOM 요소 캐싱
     */
    cacheElements() {
        this.elements = {
            overlay: document.getElementById('chat-modal-overlay'),
            modal: document.getElementById('chat-modal'),
            header: document.getElementById('chat-header'),
            body: document.getElementById('chat-body'),
            input: document.getElementById('chat-input'),
            sendBtn: document.getElementById('chat-send-btn'),
            floatingBtn: document.getElementById('chat-floating-btn'),
            minimizeBtn: document.getElementById('chat-minimize-btn'),
            closeBtn: document.getElementById('chat-close-btn'),
            tokenProgress: document.getElementById('chat-token-progress'),
            tokenText: document.getElementById('chat-token-text'),
            sessionInfo: document.getElementById('chat-session-info'),
            messageCount: document.getElementById('chat-message-count'),
            modelName: document.getElementById('chat-model-name'),
            status: document.getElementById('chat-status'),
            emptyState: document.getElementById('chat-empty-state')
        };
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 플로팅 버튼 클릭
        this.elements.floatingBtn?.addEventListener('click', () => this.open());

        // 헤더 클릭 (최소화 토글)
        this.elements.header?.addEventListener('click', (e) => {
            if (!e.target.closest('.chat-header-btn')) {
                this.toggleMinimize();
            }
        });

        // 최소화 버튼
        this.elements.minimizeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMinimize();
        });

        // 닫기 버튼
        this.elements.closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        // 오버레이 클릭으로 닫기
        this.elements.overlay?.addEventListener('click', () => this.close());

        // 전송 버튼
        this.elements.sendBtn?.addEventListener('click', this.handleSend);

        // Enter 키 전송 (Shift+Enter는 줄바꿈)
        this.elements.input?.addEventListener('keydown', this.handleKeyPress);

        // 텍스트 영역 자동 높이 조절
        this.elements.input?.addEventListener('input', () => this.autoResizeInput());

        // 퀵 액션 버튼들
        document.querySelectorAll('.chat-quick-btn').forEach(btn => {
            btn.addEventListener('click', this.handleQuickAction);
        });
    }

    /**
     * 모달 열기
     * @param {Object} context - 섹션 컨텍스트 (예: 현재 섹션 내용)
     */
    async open(context = null) {
        this.currentContext = context;

        // 세션 초기화 확인
        if (!window.llmSessionManager?.currentSession) {
            const reportId = this.getReportId();
            if (reportId) {
                try {
                    await window.llmSessionManager.initSession(reportId);
                } catch (error) {
                    console.error('[ChatModal] Session init failed:', error);
                    this.showError('세션 초기화에 실패했습니다.');
                    return;
                }
            }
        }

        // UI 업데이트
        this.elements.modal?.classList.add('active');
        this.elements.overlay?.classList.add('active');
        this.elements.floatingBtn?.classList.add('hidden');

        this.isOpen = true;
        this.isMinimized = false;
        this.elements.modal?.classList.remove('minimized');

        // 메시지 히스토리 로드
        this.loadMessageHistory();

        // 세션 정보 업데이트
        this.updateSessionInfo();

        // 입력 필드 포커스
        setTimeout(() => this.elements.input?.focus(), 100);
    }

    /**
     * 모달 닫기
     */
    close() {
        this.elements.modal?.classList.remove('active', 'minimized');
        this.elements.overlay?.classList.remove('active');
        this.elements.floatingBtn?.classList.remove('hidden');

        this.isOpen = false;
        this.isMinimized = false;
    }

    /**
     * 최소화 토글
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            this.elements.modal?.classList.add('minimized');
        } else {
            this.elements.modal?.classList.remove('minimized');
            this.scrollToBottom();
        }
    }

    /**
     * 메시지 전송 처리
     */
    async handleSend() {
        const message = this.elements.input?.value?.trim();
        if (!message || this.isLoading) return;

        // 입력 필드 초기화
        this.elements.input.value = '';
        this.autoResizeInput();

        // 사용자 메시지 표시
        this.addMessage('user', message);

        // 로딩 표시
        this.setLoading(true);
        this.showTypingIndicator();

        try {
            // 세션 매니저로 메시지 전송
            const result = await window.llmSessionManager.sendMessage(message);

            // 타이핑 인디케이터 제거
            this.hideTypingIndicator();

            if (result.success) {
                // 어시스턴트 응답 표시
                this.addMessage('assistant', result.text);

                // 토큰 사용량 업데이트
                this.updateTokenUsage();
            } else {
                this.showError(result.error || '응답 생성에 실패했습니다.');
            }

        } catch (error) {
            this.hideTypingIndicator();
            this.showError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 키 입력 처리
     */
    handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSend();
        }
    }

    /**
     * 퀵 액션 처리
     */
    async handleQuickAction(e) {
        const action = e.target.dataset.action;
        if (!action || this.isLoading) return;

        let message = '';

        switch (action) {
            case 'why':
                // 현재 컨텍스트가 있으면 포함
                if (this.currentContext) {
                    message = `다음 내용에 대해 왜 이렇게 작성했는지 설명해주세요:\n\n"${this.currentContext.substring(0, 500)}..."`;
                } else {
                    message = '이전 답변에서 왜 그렇게 답변했는지 설명해주세요.';
                }
                break;

            case 'improve':
                message = '이전에 생성된 내용을 어떻게 개선할 수 있을까요? 구체적인 제안을 해주세요.';
                break;

            case 'reference':
                message = '이 섹션 작성에 참조할 수 있는 규정이나 가이드라인이 있나요?';
                break;
        }

        if (message) {
            this.elements.input.value = message;
            this.autoResizeInput();
            this.elements.input.focus();
        }
    }

    /**
     * 메시지 추가
     */
    addMessage(role, content) {
        // Empty state 숨김
        this.elements.emptyState?.classList.add('hidden');
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }

        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${role}`;

        // 마크다운 기본 변환 (간단한 포맷팅)
        const formattedContent = this.formatContent(content);

        messageEl.innerHTML = `
            <div class="chat-message-content">${formattedContent}</div>
            <div class="chat-message-time">${this.formatTime(new Date())}</div>
        `;

        this.elements.body?.appendChild(messageEl);
        this.scrollToBottom();
        this.updateMessageCount();
    }

    /**
     * 메시지 히스토리 로드
     */
    loadMessageHistory() {
        if (!window.llmSessionManager) return;

        const messages = window.llmSessionManager.getMessageHistory();

        // 기존 메시지 클리어 (empty state 제외)
        const existingMessages = this.elements.body?.querySelectorAll('.chat-message, .chat-typing');
        existingMessages?.forEach(el => el.remove());

        // Empty state 처리
        if (messages.length === 0) {
            if (this.elements.emptyState) {
                this.elements.emptyState.style.display = 'flex';
                this.elements.emptyState.classList.remove('hidden');
            }
            return;
        }

        // Empty state 숨김
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }

        // 메시지 표시
        messages.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = `chat-message ${msg.role}`;

            const formattedContent = this.formatContent(msg.content);
            const time = msg.timestamp ? new Date(msg.timestamp) : new Date();

            messageEl.innerHTML = `
                <div class="chat-message-content">${formattedContent}</div>
                <div class="chat-message-time">${this.formatTime(time)}</div>
            `;

            this.elements.body?.appendChild(messageEl);
        });

        this.scrollToBottom();
        this.updateMessageCount();
    }

    /**
     * 컨텐츠 포맷팅 (간단한 마크다운 변환)
     */
    formatContent(content) {
        if (!content) return '';

        // HTML 이스케이프
        let formatted = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 코드 블록
        formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g,
            '<pre><code>$2</code></pre>');

        // 인라인 코드
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 볼드
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // 이탤릭
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // 줄바꿈
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    /**
     * 타이핑 인디케이터 표시
     */
    showTypingIndicator() {
        const existingTyping = this.elements.body?.querySelector('.chat-typing');
        if (existingTyping) return;

        const typingEl = document.createElement('div');
        typingEl.className = 'chat-typing';
        typingEl.innerHTML = `
            <div class="chat-typing-dot"></div>
            <div class="chat-typing-dot"></div>
            <div class="chat-typing-dot"></div>
        `;

        this.elements.body?.appendChild(typingEl);
        this.scrollToBottom();
    }

    /**
     * 타이핑 인디케이터 숨김
     */
    hideTypingIndicator() {
        const typingEl = this.elements.body?.querySelector('.chat-typing');
        typingEl?.remove();
    }

    /**
     * 에러 표시
     */
    showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'chat-message assistant';
        errorEl.style.borderColor = 'var(--color-error)';
        errorEl.innerHTML = `
            <div class="chat-message-content" style="color: var(--color-error);">
                &#9888; ${message}
            </div>
        `;

        this.elements.body?.appendChild(errorEl);
        this.scrollToBottom();
    }

    /**
     * 세션 정보 업데이트
     */
    updateSessionInfo() {
        if (!window.llmSessionManager) return;

        const status = window.llmSessionManager.getSessionStatus();

        if (this.elements.modelName) {
            const modelText = status.model || '-';
            const sessionId = status.sessionId ? ` (${status.sessionId.split('_').pop().substring(0, 8)})` : '';
            this.elements.modelName.textContent = modelText + sessionId;
        }

        if (this.elements.status) {
            this.elements.status.textContent = status.status === 'active' ? '세션 활성' : '세션 비활성';
        }

        this.updateTokenUsage();
        this.updateMessageCount();
    }

    /**
     * 토큰 사용량 업데이트
     */
    updateTokenUsage() {
        if (!window.llmSessionManager) return;

        const status = window.llmSessionManager.getSessionStatus();
        const usage = status.tokenUsage || { current: 0, max: 200000, percentUsed: 0 };

        // 진행바 업데이트
        if (this.elements.tokenProgress) {
            this.elements.tokenProgress.style.width = `${usage.percentUsed}%`;

            // 색상 변경
            this.elements.tokenProgress.classList.remove('warning', 'danger');
            if (usage.percentUsed >= 80) {
                this.elements.tokenProgress.classList.add('danger');
            } else if (usage.percentUsed >= 60) {
                this.elements.tokenProgress.classList.add('warning');
            }
        }

        // 텍스트 업데이트
        if (this.elements.tokenText) {
            this.elements.tokenText.textContent =
                `토큰: ${usage.current.toLocaleString()} / ${usage.max.toLocaleString()}`;
        }
    }

    /**
     * 메시지 카운트 업데이트
     */
    updateMessageCount() {
        if (!window.llmSessionManager) return;

        const count = window.llmSessionManager.getMessageHistory().length;
        if (this.elements.messageCount) {
            this.elements.messageCount.textContent = count;
        }
    }

    /**
     * 로딩 상태 설정
     */
    setLoading(loading) {
        this.isLoading = loading;

        if (this.elements.sendBtn) {
            this.elements.sendBtn.disabled = loading;
        }

        if (this.elements.input) {
            this.elements.input.disabled = loading;
        }
    }

    /**
     * 스크롤 하단으로 이동
     */
    scrollToBottom() {
        if (this.elements.body) {
            this.elements.body.scrollTop = this.elements.body.scrollHeight;
        }
    }

    /**
     * 입력 필드 자동 높이 조절
     */
    autoResizeInput() {
        const input = this.elements.input;
        if (!input) return;

        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }

    /**
     * 시간 포맷팅
     */
    formatTime(date) {
        return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * 현재 보고서 ID 가져오기
     */
    getReportId() {
        // URL에서 추출
        const urlParams = new URLSearchParams(window.location.search);
        let reportId = urlParams.get('reportId') || urlParams.get('id');

        // localStorage에서 추출
        if (!reportId) {
            const report = localStorage.getItem('currentReport');
            if (report) {
                try {
                    reportId = JSON.parse(report).id;
                } catch (e) {}
            }
        }

        return reportId;
    }

    /**
     * 컨텍스트 설정 (섹션 내용 등)
     */
    setContext(context) {
        this.currentContext = context;
    }

    /**
     * 세션 리셋
     */
    async resetSession() {
        if (window.llmSessionManager) {
            await window.llmSessionManager.resetSession();
        }

        // 메시지 영역 초기화
        const existingMessages = this.elements.body?.querySelectorAll('.chat-message');
        existingMessages?.forEach(el => el.remove());

        // Empty state 표시
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'flex';
            this.elements.emptyState.classList.remove('hidden');
        }

        this.updateSessionInfo();
    }
}

// 전역 싱글톤
const chatModal = new ChatModal();

// 전역 내보내기
if (typeof window !== 'undefined') {
    window.ChatModal = ChatModal;
    window.chatModal = chatModal;
}
