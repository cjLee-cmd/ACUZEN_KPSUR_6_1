/**
 * LLM Progress Bar Component
 * 재사용 가능한 LLM 처리 진행상황 표시 컴포넌트
 *
 * 기능:
 * - 페이지 푸터에 고정 배치
 * - 다단계 처리 진행상황 표시
 * - 스트리밍 응답 실시간 표시 (3-5줄)
 * - 일체형 디자인
 *
 * @requires CSS 변수: --glass-bg, --glass-border, --gradient-primary, etc.
 */

(function() {
    'use strict';

    /**
     * LLM Progress Bar 클래스
     */
    class LLMProgressBar {
        constructor(options = {}) {
            this.containerId = options.containerId || 'llm-progress-container';
            this.maxVisibleLines = options.maxVisibleLines || 4;
            this.position = options.position || 'bottom'; // 'bottom' or 'top'
            this.zIndex = options.zIndex || 1000;

            this.steps = [];
            this.currentStep = 0;
            this.totalSteps = 0;
            this.isVisible = false;
            this.streamingBuffer = [];
            this._initialized = false;

            // DOM이 준비되면 컨테이너 생성
            if (document.body) {
                this._initDOM();
            } else {
                // <head>에서 로드된 경우 DOM 준비 대기
                document.addEventListener('DOMContentLoaded', () => this._initDOM());
            }
        }

        /**
         * DOM 초기화 (컨테이너 + 스타일)
         */
        _initDOM() {
            if (this._initialized) return;
            this._initialized = true;
            this._createContainer();
            this._injectStyles();
            console.log('[LLMProgressBar] DOM 초기화 완료');
        }

        /**
         * 스타일 주입
         */
        _injectStyles() {
            if (document.getElementById('llm-progress-styles')) return;

            const styles = document.createElement('style');
            styles.id = 'llm-progress-styles';
            styles.textContent = `
                /* LLM Progress Bar Container */
                .llm-progress-container {
                    position: fixed;
                    left: 0;
                    right: 0;
                    ${this.position === 'bottom' ? 'bottom: 100px;' : 'top: 0;'}
                    background: var(--glass-bg, rgba(255, 255, 255, 0.95));
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border-${this.position === 'bottom' ? 'top' : 'bottom'}: 1px solid var(--glass-border, rgba(0, 0, 0, 0.1));
                    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
                    z-index: ${this.zIndex};
                    padding: 16px 24px;
                    transform: translateY(${this.position === 'bottom' ? '100%' : '-100%'});
                    opacity: 0;
                    transition: transform 0.3s ease, opacity 0.3s ease;
                    pointer-events: none;
                }

                .llm-progress-container.visible {
                    transform: translateY(0);
                    opacity: 1;
                    pointer-events: auto;
                }

                /* Progress Layout */
                .llm-progress-layout {
                    display: flex;
                    gap: 24px;
                    align-items: flex-start;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                /* Left Section - Progress Info */
                .llm-progress-info {
                    flex: 0 0 280px;
                    min-width: 280px;
                }

                .llm-progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .llm-progress-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary, #18181B);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .llm-progress-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid var(--glass-border, #e4e4e7);
                    border-top-color: var(--color-primary, #18181B);
                    border-radius: 50%;
                    animation: llm-spin 1s linear infinite;
                }

                @keyframes llm-spin {
                    to { transform: rotate(360deg); }
                }

                .llm-progress-percent {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--color-primary, #18181B);
                }

                /* Progress Bar */
                .llm-progress-bar-wrapper {
                    height: 8px;
                    background: var(--app-surface-muted, #F4F4F5);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 12px;
                }

                .llm-progress-bar-fill {
                    height: 100%;
                    background: var(--gradient-primary, linear-gradient(135deg, #18181B 0%, #27272A 100%));
                    border-radius: 4px;
                    transition: width 0.3s ease;
                    position: relative;
                }

                .llm-progress-bar-fill::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(255, 255, 255, 0.3) 50%,
                        transparent 100%
                    );
                    animation: llm-shimmer 1.5s infinite;
                }

                @keyframes llm-shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                /* Step Indicators */
                .llm-steps-container {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .llm-step {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                    color: var(--text-tertiary, #71717A);
                    padding: 4px 8px;
                    background: var(--app-surface-muted, #F4F4F5);
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .llm-step.active {
                    background: rgba(37, 99, 235, 0.1);
                    color: var(--color-info, #2563EB);
                    font-weight: 500;
                }

                .llm-step.completed {
                    background: rgba(5, 150, 105, 0.1);
                    color: var(--color-success, #059669);
                }

                .llm-step-icon {
                    font-size: 12px;
                }

                /* Right Section - Streaming Text */
                .llm-stream-container {
                    flex: 1;
                    min-width: 0;
                    background: var(--bg-secondary, #FAFAFA);
                    border: 1px solid var(--glass-border, #E4E4E7);
                    border-radius: 8px;
                    padding: 12px 16px;
                    max-height: 100px;
                    overflow: hidden;
                }

                .llm-stream-label {
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--text-tertiary, #71717A);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                }

                .llm-stream-content {
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 12px;
                    line-height: 1.5;
                    color: var(--text-secondary, #3F3F46);
                    white-space: pre-wrap;
                    word-break: break-all;
                    max-height: 72px;
                    overflow: hidden;
                    position: relative;
                }

                .llm-stream-content::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 24px;
                    background: linear-gradient(transparent, var(--bg-secondary, #FAFAFA));
                    pointer-events: none;
                }

                .llm-cursor {
                    display: inline-block;
                    width: 8px;
                    height: 14px;
                    background: var(--color-primary, #18181B);
                    animation: llm-blink 1s step-end infinite;
                    vertical-align: middle;
                    margin-left: 2px;
                }

                @keyframes llm-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }

                /* Cancel Button */
                .llm-cancel-btn {
                    flex: 0 0 auto;
                    padding: 8px 16px;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--color-error, #DC2626);
                    background: transparent;
                    border: 1px solid var(--color-error, #DC2626);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    align-self: center;
                }

                .llm-cancel-btn:hover {
                    background: rgba(220, 38, 38, 0.1);
                }

                /* Dark Mode Support */
                @media (prefers-color-scheme: dark) {
                    .llm-progress-container {
                        background: rgba(24, 24, 27, 0.95);
                        border-color: rgba(255, 255, 255, 0.1);
                    }

                    .llm-stream-container {
                        background: rgba(39, 39, 42, 0.5);
                        border-color: rgba(255, 255, 255, 0.1);
                    }

                    .llm-stream-content::after {
                        background: linear-gradient(transparent, rgba(39, 39, 42, 0.5));
                    }
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .llm-progress-layout {
                        flex-direction: column;
                        gap: 12px;
                    }

                    .llm-progress-info {
                        flex: none;
                        min-width: 100%;
                    }

                    .llm-stream-container {
                        max-height: 80px;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        /**
         * 컨테이너 생성
         */
        _createContainer() {
            if (document.getElementById(this.containerId)) {
                this.container = document.getElementById(this.containerId);
                return;
            }

            this.container = document.createElement('div');
            this.container.id = this.containerId;
            this.container.className = 'llm-progress-container';
            this.container.innerHTML = `
                <div class="llm-progress-layout">
                    <!-- Left: Progress Info -->
                    <div class="llm-progress-info">
                        <div class="llm-progress-header">
                            <div class="llm-progress-title">
                                <div class="llm-progress-spinner"></div>
                                <span>LLM 처리 중...</span>
                            </div>
                            <span class="llm-progress-percent">0%</span>
                        </div>
                        <div class="llm-progress-bar-wrapper">
                            <div class="llm-progress-bar-fill" style="width: 0%"></div>
                        </div>
                        <div class="llm-steps-container"></div>
                    </div>

                    <!-- Right: Streaming Text -->
                    <div class="llm-stream-container">
                        <div class="llm-stream-label">실시간 응답</div>
                        <div class="llm-stream-content">
                            <span class="llm-stream-text">대기 중...</span>
                            <span class="llm-cursor"></span>
                        </div>
                    </div>

                    <!-- Cancel Button -->
                    <button class="llm-cancel-btn" title="처리 중단">취소</button>
                </div>
            `;

            document.body.appendChild(this.container);

            // 취소 버튼 이벤트
            this.container.querySelector('.llm-cancel-btn').addEventListener('click', () => {
                this.onCancel?.();
            });
        }

        /**
         * 프로그레스 바 초기화
         * @param {Object} config - 설정
         * @param {Array} config.steps - 단계 목록 [{id, name, icon}]
         * @param {string} config.title - 제목
         * @param {Function} config.onCancel - 취소 콜백
         */
        init(config = {}) {
            // DOM이 아직 초기화되지 않았다면 초기화
            if (!this._initialized) {
                this._initDOM();
            }

            this.steps = config.steps || [];
            this.totalSteps = this.steps.length;
            this.currentStep = 0;
            this.onCancel = config.onCancel;
            this.streamingBuffer = [];

            // 제목 업데이트
            if (config.title && this.container) {
                const titleSpan = this.container.querySelector('.llm-progress-title span');
                if (titleSpan) titleSpan.textContent = config.title;
            }

            // 단계 표시 업데이트
            this._renderSteps();
            this._updateProgress(0);

            return this;
        }

        /**
         * 단계 렌더링
         */
        _renderSteps() {
            if (!this.container) return;
            const stepsContainer = this.container.querySelector('.llm-steps-container');
            if (!stepsContainer) return;
            stepsContainer.innerHTML = this.steps.map((step, idx) => `
                <div class="llm-step" data-step="${idx}">
                    <span class="llm-step-icon">${step.icon || '○'}</span>
                    <span>${step.name}</span>
                </div>
            `).join('');
        }

        /**
         * 진행률 업데이트
         * @param {number} percent - 0-100
         */
        _updateProgress(percent) {
            if (!this.container) return;
            const fill = this.container.querySelector('.llm-progress-bar-fill');
            const percentEl = this.container.querySelector('.llm-progress-percent');

            if (fill) fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
        }

        /**
         * 프로그레스 바 표시
         */
        show() {
            // DOM이 아직 초기화되지 않았다면 초기화
            if (!this._initialized) {
                this._initDOM();
            }
            this.isVisible = true;
            if (this.container) {
                this.container.classList.add('visible');
            }
            return this;
        }

        /**
         * 프로그레스 바 숨김
         */
        hide() {
            this.isVisible = false;
            if (this.container) {
                this.container.classList.remove('visible');
            }
            return this;
        }

        /**
         * 단계 시작
         * @param {number|string} stepId - 단계 인덱스 또는 ID
         */
        startStep(stepId) {
            if (!this.container) return this;

            const stepIdx = typeof stepId === 'number' ? stepId :
                this.steps.findIndex(s => s.id === stepId);

            if (stepIdx < 0) return this;

            this.currentStep = stepIdx;

            // UI 업데이트
            const stepEls = this.container.querySelectorAll('.llm-step');
            stepEls.forEach((el, idx) => {
                el.classList.remove('active', 'completed');
                if (idx < stepIdx) {
                    el.classList.add('completed');
                    el.querySelector('.llm-step-icon').textContent = '✓';
                } else if (idx === stepIdx) {
                    el.classList.add('active');
                    el.querySelector('.llm-step-icon').textContent = this.steps[idx]?.icon || '●';
                }
            });

            // 진행률 계산
            const percent = (stepIdx / this.totalSteps) * 100;
            this._updateProgress(percent);

            // 제목 업데이트
            const currentStepName = this.steps[stepIdx]?.name || '';
            const titleEl = this.container.querySelector('.llm-progress-title span');
            if (titleEl) titleEl.textContent = `${currentStepName} 처리 중...`;

            return this;
        }

        /**
         * 단계 완료
         * @param {number|string} stepId - 단계 인덱스 또는 ID
         */
        completeStep(stepId) {
            if (!this.container) return this;

            const stepIdx = typeof stepId === 'number' ? stepId :
                this.steps.findIndex(s => s.id === stepId);

            if (stepIdx < 0) return this;

            const stepEl = this.container.querySelectorAll('.llm-step')[stepIdx];
            if (stepEl) {
                stepEl.classList.remove('active');
                stepEl.classList.add('completed');
                stepEl.querySelector('.llm-step-icon').textContent = '✓';
            }

            // 진행률 업데이트
            const percent = ((stepIdx + 1) / this.totalSteps) * 100;
            this._updateProgress(percent);

            return this;
        }

        /**
         * 스트리밍 텍스트 추가 (청크 단위)
         * @param {string} chunk - 텍스트 청크
         */
        appendStreamText(chunk) {
            if (!chunk || !this.container) return this;

            this.streamingBuffer.push(chunk);

            // 최근 텍스트만 표시 (약 4줄)
            const fullText = this.streamingBuffer.join('');
            const lines = fullText.split('\n');
            const recentLines = lines.slice(-this.maxVisibleLines);
            const displayText = recentLines.join('\n');

            const streamText = this.container.querySelector('.llm-stream-text');
            if (streamText) streamText.textContent = displayText || '처리 중...';

            // 스크롤 최하단으로
            const streamContent = this.container.querySelector('.llm-stream-content');
            if (streamContent) streamContent.scrollTop = streamContent.scrollHeight;

            return this;
        }

        /**
         * 스트리밍 텍스트 설정 (전체 교체)
         * @param {string} text - 전체 텍스트
         */
        setStreamText(text) {
            if (!this.container) return this;
            const streamText = this.container.querySelector('.llm-stream-text');
            if (streamText) streamText.textContent = text || '대기 중...';
            return this;
        }

        /**
         * 스트리밍 텍스트 초기화
         */
        clearStreamText() {
            this.streamingBuffer = [];
            this.setStreamText('대기 중...');
            return this;
        }

        /**
         * 완료 상태로 전환
         * @param {string} message - 완료 메시지
         */
        complete(message = '처리 완료!') {
            if (!this.container) return this;

            this._updateProgress(100);

            // 모든 단계 완료 표시
            const stepEls = this.container.querySelectorAll('.llm-step');
            stepEls.forEach(el => {
                el.classList.remove('active');
                el.classList.add('completed');
                el.querySelector('.llm-step-icon').textContent = '✓';
            });

            // 스피너 숨기기
            const spinner = this.container.querySelector('.llm-progress-spinner');
            if (spinner) spinner.style.display = 'none';

            // 제목 업데이트
            const titleEl = this.container.querySelector('.llm-progress-title span');
            if (titleEl) titleEl.textContent = message;

            // 1.5초 후 자동 숨김
            setTimeout(() => this.hide(), 1500);

            return this;
        }

        /**
         * 에러 상태로 전환
         * @param {string} message - 에러 메시지
         */
        error(message = '처리 중 오류가 발생했습니다.') {
            if (!this.container) return this;

            const spinner = this.container.querySelector('.llm-progress-spinner');
            if (spinner) spinner.style.display = 'none';

            const title = this.container.querySelector('.llm-progress-title span');
            if (title) {
                title.textContent = message;
                title.style.color = 'var(--color-error, #DC2626)';
            }

            const fill = this.container.querySelector('.llm-progress-bar-fill');
            if (fill) fill.style.background = 'var(--color-error, #DC2626)';

            // 3초 후 자동 숨김
            setTimeout(() => this.hide(), 3000);

            return this;
        }

        /**
         * 컴포넌트 정리
         */
        destroy() {
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            const styles = document.getElementById('llm-progress-styles');
            if (styles) {
                styles.parentNode.removeChild(styles);
            }
        }
    }

    // 전역 등록
    window.LLMProgressBar = LLMProgressBar;

    // 싱글톤 인스턴스 제공
    window.llmProgressBar = new LLMProgressBar();

    console.log('[LLMProgressBar] 컴포넌트 로드 완료');

})();
