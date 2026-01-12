/**
 * Cost Tracker
 * LLM 사용 비용 추적 및 표시
 * localStorage에 지속적으로 저장
 */

// 가격 정보 (per 1M tokens)
const PRICING = {
    claude: {
        'claude-opus-4-5': { input: 15, output: 75 },
        'claude-sonnet-3-5': { input: 3, output: 15 },
        'claude-haiku-3-5': { input: 0.80, output: 4 }
    },
    openai: {
        'gpt-4o': { input: 5, output: 15 },
        'gpt-4o-mini': { input: 0.15, output: 0.60 }
    },
    google: {
        'gemini-3-flash-preview': { input: 0.075, output: 0.30 },
        'gemini-3-pro-preview': { input: 1.25, output: 5 },
        'gemini-2.5-flash': { input: 0.075, output: 0.30 },
        'gemini-2.5-pro': { input: 1.25, output: 5 },
        'gemini-2.0-flash': { input: 0, output: 0 }
    }
};

class CostTracker {
    constructor() {
        this.storageKey = 'llm_cost_history';
        this.sessionKey = 'llm_session_cost';
        this.loadFromStorage();
    }

    /**
     * localStorage에서 비용 히스토리 로드
     */
    loadFromStorage() {
        try {
            this.history = JSON.parse(localStorage.getItem(this.storageKey)) || [];
            this.sessionCosts = JSON.parse(sessionStorage.getItem(this.sessionKey)) || [];
        } catch (e) {
            this.history = [];
            this.sessionCosts = [];
        }
    }

    /**
     * 비용 저장
     */
    saveToStorage() {
        try {
            // 최근 100개 항목만 유지
            const recentHistory = this.history.slice(-100);
            localStorage.setItem(this.storageKey, JSON.stringify(recentHistory));
            sessionStorage.setItem(this.sessionKey, JSON.stringify(this.sessionCosts));
        } catch (e) {
            console.warn('Failed to save cost history:', e);
        }
    }

    /**
     * 비용 기록 추가
     */
    recordCost(data) {
        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            provider: data.provider,
            model: data.model,
            inputTokens: data.inputTokens || 0,
            outputTokens: data.outputTokens || 0,
            cost: this.calculateCost(data.provider, data.model, data.inputTokens, data.outputTokens),
            reportName: data.reportName || 'Unknown',
            operation: data.operation || 'generate'
        };

        this.history.push(record);
        this.sessionCosts.push(record);
        this.saveToStorage();

        // 이벤트 발생 (UI 업데이트용)
        window.dispatchEvent(new CustomEvent('costUpdated', { detail: record }));

        return record;
    }

    /**
     * 비용 계산
     */
    calculateCost(provider, model, inputTokens, outputTokens) {
        const pricing = PRICING[provider]?.[model];
        if (!pricing) return 0;

        const inputCost = (inputTokens / 1000000) * pricing.input;
        const outputCost = (outputTokens / 1000000) * pricing.output;
        return inputCost + outputCost;
    }

    /**
     * 예상 비용 계산
     */
    estimateCost(provider, model, inputTokens, outputTokens) {
        return this.calculateCost(provider, model, inputTokens, outputTokens);
    }

    /**
     * 세션 총 비용
     */
    getSessionTotal() {
        return this.sessionCosts.reduce((sum, record) => sum + record.cost, 0);
    }

    /**
     * 오늘 총 비용
     */
    getTodayTotal() {
        const today = new Date().toDateString();
        return this.history
            .filter(record => new Date(record.timestamp).toDateString() === today)
            .reduce((sum, record) => sum + record.cost, 0);
    }

    /**
     * 월간 총 비용
     */
    getMonthTotal() {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        return this.history
            .filter(record => {
                const date = new Date(record.timestamp);
                return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
            })
            .reduce((sum, record) => sum + record.cost, 0);
    }

    /**
     * 보고서별 비용
     */
    getReportCost(reportName) {
        return this.history
            .filter(record => record.reportName === reportName)
            .reduce((sum, record) => sum + record.cost, 0);
    }

    /**
     * 통계 요약
     */
    getStatistics() {
        return {
            sessionTotal: this.getSessionTotal(),
            todayTotal: this.getTodayTotal(),
            monthTotal: this.getMonthTotal(),
            totalRecords: this.history.length,
            sessionRecords: this.sessionCosts.length,
            byProvider: this.getByProvider(),
            byModel: this.getByModel()
        };
    }

    /**
     * 프로바이더별 비용
     */
    getByProvider() {
        const result = {};
        this.history.forEach(record => {
            if (!result[record.provider]) {
                result[record.provider] = { cost: 0, count: 0 };
            }
            result[record.provider].cost += record.cost;
            result[record.provider].count += 1;
        });
        return result;
    }

    /**
     * 모델별 비용
     */
    getByModel() {
        const result = {};
        this.history.forEach(record => {
            if (!result[record.model]) {
                result[record.model] = { cost: 0, count: 0 };
            }
            result[record.model].cost += record.cost;
            result[record.model].count += 1;
        });
        return result;
    }

    /**
     * 최근 기록 가져오기
     */
    getRecentRecords(limit = 10) {
        return this.history.slice(-limit).reverse();
    }

    /**
     * 기록 초기화
     */
    clearHistory() {
        this.history = [];
        this.sessionCosts = [];
        this.saveToStorage();
        window.dispatchEvent(new CustomEvent('costCleared'));
    }

    /**
     * 세션 비용만 초기화
     */
    clearSession() {
        this.sessionCosts = [];
        sessionStorage.removeItem(this.sessionKey);
        window.dispatchEvent(new CustomEvent('costUpdated'));
    }

    /**
     * 비용 포맷팅
     */
    formatCost(cost) {
        if (cost < 0.01) {
            return `$${cost.toFixed(4)}`;
        } else if (cost < 1) {
            return `$${cost.toFixed(3)}`;
        } else {
            return `$${cost.toFixed(2)}`;
        }
    }

    /**
     * 비용 표시 위젯 생성
     */
    createCostWidget(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const widget = document.createElement('div');
        widget.className = 'cost-tracker-widget';
        widget.innerHTML = this.renderWidgetHTML();
        container.appendChild(widget);

        // 이벤트 리스너 등록
        window.addEventListener('costUpdated', () => {
            this.updateWidget(widget);
        });

        return widget;
    }

    /**
     * 위젯 HTML 렌더링
     */
    renderWidgetHTML() {
        const stats = this.getStatistics();
        return `
            <div class="cost-widget-header">
                <span class="cost-widget-title">💰 비용 현황</span>
                <button class="cost-widget-toggle" onclick="window.costTracker.toggleDetails()">
                    <span id="costToggleIcon">▼</span>
                </button>
            </div>
            <div class="cost-widget-summary">
                <div class="cost-item">
                    <span class="cost-label">이번 세션</span>
                    <span class="cost-value" id="sessionCost">${this.formatCost(stats.sessionTotal)}</span>
                </div>
                <div class="cost-item">
                    <span class="cost-label">오늘</span>
                    <span class="cost-value" id="todayCost">${this.formatCost(stats.todayTotal)}</span>
                </div>
                <div class="cost-item">
                    <span class="cost-label">이번 달</span>
                    <span class="cost-value" id="monthCost">${this.formatCost(stats.monthTotal)}</span>
                </div>
            </div>
            <div class="cost-widget-details" id="costDetails" style="display: none;">
                <div class="cost-details-section">
                    <h5>프로바이더별</h5>
                    ${this.renderProviderBreakdown(stats.byProvider)}
                </div>
                <div class="cost-details-section">
                    <h5>최근 요청</h5>
                    ${this.renderRecentRequests()}
                </div>
            </div>
        `;
    }

    /**
     * 프로바이더별 비용 렌더링
     */
    renderProviderBreakdown(byProvider) {
        const providers = Object.entries(byProvider);
        if (providers.length === 0) {
            return '<p class="cost-empty">기록 없음</p>';
        }

        return providers.map(([provider, data]) => `
            <div class="cost-breakdown-item">
                <span class="cost-breakdown-label">${this.getProviderName(provider)}</span>
                <span class="cost-breakdown-value">${this.formatCost(data.cost)} (${data.count}회)</span>
            </div>
        `).join('');
    }

    /**
     * 최근 요청 렌더링
     */
    renderRecentRequests() {
        const recent = this.getRecentRecords(5);
        if (recent.length === 0) {
            return '<p class="cost-empty">기록 없음</p>';
        }

        return recent.map(record => `
            <div class="cost-request-item">
                <span class="cost-request-model">${record.model}</span>
                <span class="cost-request-cost">${this.formatCost(record.cost)}</span>
            </div>
        `).join('');
    }

    /**
     * 프로바이더 이름 변환
     */
    getProviderName(provider) {
        const names = {
            claude: 'Anthropic',
            openai: 'OpenAI',
            google: 'Google'
        };
        return names[provider] || provider;
    }

    /**
     * 상세 정보 토글
     */
    toggleDetails() {
        const details = document.getElementById('costDetails');
        const icon = document.getElementById('costToggleIcon');
        if (details) {
            const isHidden = details.style.display === 'none';
            details.style.display = isHidden ? 'block' : 'none';
            if (icon) icon.textContent = isHidden ? '▲' : '▼';
        }
    }

    /**
     * 위젯 업데이트
     */
    updateWidget(widget) {
        if (!widget) return;
        const stats = this.getStatistics();

        const sessionCost = widget.querySelector('#sessionCost');
        const todayCost = widget.querySelector('#todayCost');
        const monthCost = widget.querySelector('#monthCost');

        if (sessionCost) sessionCost.textContent = this.formatCost(stats.sessionTotal);
        if (todayCost) todayCost.textContent = this.formatCost(stats.todayTotal);
        if (monthCost) monthCost.textContent = this.formatCost(stats.monthTotal);
    }
}

// CSS 스타일 주입
function injectCostTrackerStyles() {
    if (document.getElementById('cost-tracker-styles')) return;

    const style = document.createElement('style');
    style.id = 'cost-tracker-styles';
    style.textContent = `
        .cost-tracker-widget {
            background: var(--card-bg, white);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 12px;
            padding: 16px;
            font-size: 13px;
        }

        .cost-widget-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .cost-widget-title {
            font-weight: 600;
            color: var(--text-primary, #07161D);
        }

        .cost-widget-toggle {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 12px;
            color: var(--text-secondary, #64748b);
        }

        .cost-widget-summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }

        .cost-item {
            text-align: center;
            padding: 8px;
            background: var(--section-bg, #f8fafc);
            border-radius: 8px;
        }

        .cost-label {
            display: block;
            font-size: 11px;
            color: var(--text-secondary, #64748b);
            margin-bottom: 4px;
        }

        .cost-value {
            display: block;
            font-size: 16px;
            font-weight: 700;
            color: #25739B;
        }

        .cost-widget-details {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--border-color, #e2e8f0);
        }

        .cost-details-section {
            margin-bottom: 12px;
        }

        .cost-details-section h5 {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary, #64748b);
            margin-bottom: 8px;
        }

        .cost-breakdown-item,
        .cost-request-item {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 12px;
        }

        .cost-breakdown-label,
        .cost-request-model {
            color: var(--text-primary, #07161D);
        }

        .cost-breakdown-value,
        .cost-request-cost {
            color: var(--text-secondary, #64748b);
            font-weight: 500;
        }

        .cost-empty {
            color: var(--text-muted, #94a3b8);
            font-size: 12px;
            text-align: center;
            padding: 8px;
        }

        /* 플로팅 비용 배지 */
        .cost-badge-floating {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #25739B, #1E5F7F);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(37, 115, 155, 0.3);
            z-index: 9990;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .cost-badge-floating:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(37, 115, 155, 0.4);
        }

        .cost-badge-icon {
            margin-right: 8px;
        }

        /* 다크모드 */
        [data-theme="dark"] .cost-tracker-widget {
            background: #1e293b;
            border-color: #334155;
        }

        [data-theme="dark"] .cost-widget-title {
            color: #f1f5f9;
        }

        [data-theme="dark"] .cost-item {
            background: #334155;
        }

        [data-theme="dark"] .cost-breakdown-label,
        [data-theme="dark"] .cost-request-model {
            color: #f1f5f9;
        }
    `;
    document.head.appendChild(style);
}

// Singleton instance
const costTracker = new CostTracker();

// 스타일 주입
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectCostTrackerStyles);
    } else {
        injectCostTrackerStyles();
    }
}

// 전역으로 내보내기
if (typeof window !== 'undefined') {
    window.costTracker = costTracker;
    window.CostTracker = CostTracker;
    window.PRICING = PRICING;
}
