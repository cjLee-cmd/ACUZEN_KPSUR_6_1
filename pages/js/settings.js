/**
 * Settings Page Script
 * pages/js/settings.js
 *
 * P91_Settings.html 인라인 스크립트 분리
 * Multi-LLM API Key 관리, 비용 추적, 시스템 정보 기능
 */

(function() {
    'use strict';

    // === Provider Configuration ===
    const providers = ['anthropic', 'openai', 'google'];
    let currentProvider = 'anthropic';

    const apiEndpoints = {
        anthropic: 'https://api.anthropic.com/v1/messages',
        openai: 'https://api.openai.com/v1/models',
        google: 'https://generativelanguage.googleapis.com/v1beta/models'
    };

    const storageKeys = {
        anthropic: 'ANTHROPIC_API_KEY',
        openai: 'OPENAI_API_KEY',
        google: 'GOOGLE_API_KEY'
    };

    // === API Key Management ===
    function getApiKey(provider) {
        return localStorage.getItem(storageKeys[provider]);
    }

    function setApiKeyStorage(provider, key) {
        localStorage.setItem(storageKeys[provider], key);
        return true;
    }

    function removeApiKey(provider) {
        localStorage.removeItem(storageKeys[provider]);
        return true;
    }

    function maskApiKey(key) {
        if (!key) return '-';
        return key.substring(0, 8) + '...' + key.substring(key.length - 4);
    }

    // === Page Initialization ===
    async function initSettingsPage() {
        checkFirstSetup();
        updateAllProviderStatus();
        displayEnvironmentInfo();
        initCostTracker();
    }

    function checkFirstSetup() {
        const urlParams = new URLSearchParams(window.location.search);
        const isFirstSetup = urlParams.get('firstSetup') === 'true';

        if (isFirstSetup) {
            const banner = document.getElementById('firstSetupBanner');
            if (banner) banner.style.display = 'block';
            setTimeout(() => {
                const googleInput = document.getElementById('input-google');
                if (googleInput) googleInput.focus();
                switchProvider('google');
            }, 500);
        }
    }

    // === Provider Switching ===
    function switchProvider(provider) {
        currentProvider = provider;

        // Update tabs
        document.querySelectorAll('.provider-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.provider === provider);
        });

        // Update panels
        providers.forEach(p => {
            const panel = document.getElementById(`panel-${p}`);
            if (panel) {
                panel.style.display = p === provider ? 'block' : 'none';
            }
        });
    }

    // === Provider Status Updates ===
    function updateAllProviderStatus() {
        providers.forEach(provider => {
            updateProviderStatus(provider);
        });
    }

    function updateProviderStatus(provider) {
        const key = getApiKey(provider);
        const configured = !!key;

        // Update badge
        const badge = document.getElementById(`badge-${provider}`);
        if (badge) {
            badge.textContent = configured ? '✅ 설정됨' : '❌ 미설정';
            badge.className = `badge ${configured ? 'badge-success' : 'badge-error'}`;
        }

        // Update masked key
        const masked = document.getElementById(`masked-${provider}`);
        if (masked) {
            masked.textContent = maskApiKey(key);
        }

        // Update tab status
        const tabStatus = document.getElementById(`status-${provider}`);
        if (tabStatus) {
            tabStatus.textContent = configured ? '●' : '○';
            tabStatus.style.color = configured ? '#10B981' : 'var(--app-text-muted)';
        }

        // Update summary
        const summary = document.getElementById(`summary-${provider}`);
        if (summary) {
            summary.classList.toggle('configured', configured);
            const statusEl = summary.querySelector('.summary-status');
            if (statusEl) {
                statusEl.textContent = configured ? '설정됨' : '미설정';
            }
        }
    }

    // === Environment Info ===
    function displayEnvironmentInfo() {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const envMode = document.getElementById('envMode');
        const hostname = document.getElementById('hostname');

        if (envMode) envMode.textContent = isLocal ? 'Development' : 'Production';
        if (hostname) hostname.textContent = window.location.hostname;
    }

    // === API Key Operations ===
    async function saveApiKey(provider) {
        const input = document.getElementById(`input-${provider}`);
        if (!input) return;

        const keyValue = input.value.trim();

        if (!keyValue) {
            showToast('API 키를 입력해주세요', 'warning');
            return;
        }

        // Test connection before saving
        showLoading('연결 테스트 중...');
        const testResult = await testApiKeyConnection(provider, keyValue);
        hideLoading();

        if (!testResult.success) {
            showToast('❌ ' + (testResult.message || '연결 실패'), 'error');
            return;
        }

        // Save to localStorage
        setApiKeyStorage(provider, keyValue);
        updateProviderStatus(provider);
        input.value = '';
        showToast('✅ API 키가 저장되었습니다', 'success');

        // If this was first setup, redirect to dashboard
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('firstSetup') === 'true') {
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1500);
        }
    }

    async function testApiKey(provider) {
        const input = document.getElementById(`input-${provider}`);
        const inputValue = input ? input.value.trim() : '';
        const storedKey = getApiKey(provider);
        const keyToTest = inputValue || storedKey;

        if (!keyToTest) {
            showToast('API 키를 입력해주세요', 'warning');
            return;
        }

        showLoading('연결 테스트 중...');
        const result = await testApiKeyConnection(provider, keyToTest);
        hideLoading();

        if (result.success) {
            showToast('✅ 연결 성공!', 'success');
        } else {
            showToast('❌ ' + (result.message || '연결 실패'), 'error');
        }
    }

    async function testApiKeyConnection(provider, key) {
        try {
            let response;

            switch (provider) {
                case 'anthropic':
                    // Anthropic requires a POST request with specific headers
                    response = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': key,
                            'anthropic-version': '2023-06-01',
                            'anthropic-dangerous-direct-browser-access': 'true'
                        },
                        body: JSON.stringify({
                            model: 'claude-3-haiku-20240307',
                            max_tokens: 10,
                            messages: [{ role: 'user', content: 'Hi' }]
                        })
                    });
                    break;

                case 'openai':
                    response = await fetch('https://api.openai.com/v1/models', {
                        headers: {
                            'Authorization': `Bearer ${key}`
                        }
                    });
                    break;

                case 'google':
                    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                    break;
            }

            if (response.ok || response.status === 200) {
                return { success: true };
            } else {
                const errorText = await response.text();
                return { success: false, message: `HTTP ${response.status}` };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    function clearApiKey(provider) {
        if (!confirm(`${provider.toUpperCase()} API 키를 삭제하시겠습니까?`)) {
            return;
        }

        removeApiKey(provider);
        updateProviderStatus(provider);
        const input = document.getElementById(`input-${provider}`);
        if (input) input.value = '';
        showToast('✅ API 키가 삭제되었습니다', 'success');
    }

    function toggleVisibility(provider) {
        const input = document.getElementById(`input-${provider}`);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
    }

    // === Toast Notifications ===
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast toast-${type}`;
        toast.style.display = 'block';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }

    // === Loading Overlay ===
    function showLoading(text = '처리 중...') {
        const loadingText = document.getElementById('loadingText');
        const loadingOverlay = document.getElementById('loadingOverlay');

        if (loadingText) loadingText.textContent = text;
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }

    // === Cost Tracker Integration ===
    function initCostTracker() {
        if (window.costTracker) {
            window.costTracker.createCostWidget('costTrackerContainer');
            renderRecentCosts();

            // Listen for cost updates
            window.addEventListener('costUpdated', renderRecentCosts);
            window.addEventListener('costCleared', renderRecentCosts);
        } else {
            console.warn('Cost tracker not loaded');
            const container = document.getElementById('costTrackerContainer');
            if (container) {
                container.innerHTML = `
                    <p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">
                        비용 추적 모듈 로딩 실패
                    </p>
                `;
            }
        }
    }

    function renderRecentCosts() {
        const container = document.getElementById('recentCostsList');
        if (!container || !window.costTracker) return;

        const records = window.costTracker.getRecentRecords(10);

        if (records.length === 0) {
            container.innerHTML = `
                <p style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 16px;">
                    아직 비용 기록이 없습니다
                </p>
            `;
            return;
        }

        container.innerHTML = records.map(record => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 6px; background: var(--card-bg); border-radius: 6px; border: 1px solid var(--border-color);">
                <div>
                    <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">
                        ${record.model}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">
                        ${formatTimestamp(record.timestamp)} · ${record.inputTokens + record.outputTokens} tokens
                    </div>
                </div>
                <div style="font-size: 14px; font-weight: 600; color: #12305B;">
                    ${window.costTracker.formatCost(record.cost)}
                </div>
            </div>
        `).join('');
    }

    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function exportCostHistory() {
        if (!window.costTracker) return;

        const records = window.costTracker.history;
        const stats = window.costTracker.getStatistics();

        let csv = 'Timestamp,Provider,Model,Input Tokens,Output Tokens,Cost ($)\n';
        records.forEach(r => {
            csv += `${r.timestamp},${r.provider},${r.model},${r.inputTokens},${r.outputTokens},${r.cost.toFixed(6)}\n`;
        });

        csv += `\n\nSummary\n`;
        csv += `Total Cost,$${stats.monthTotal.toFixed(4)}\n`;
        csv += `Total Records,${stats.totalRecords}\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `llm_cost_history_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        showToast('비용 기록이 내보내졌습니다', 'success');
    }

    function clearCostHistory() {
        if (!confirm('모든 비용 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
            return;
        }

        if (window.costTracker) {
            window.costTracker.clearHistory();
            renderRecentCosts();
            showToast('비용 기록이 초기화되었습니다', 'success');
        }
    }

    // === Dark Mode ===
    function toggleDarkMode() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // === Dark mode initialization (before DOM ready) ===
    (function() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    })();

    // === Page Load ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSettingsPage);
    } else {
        initSettingsPage();
    }

    // === Global Export ===
    window.SettingsPage = {
        init: initSettingsPage,
        switchProvider,
        saveApiKey,
        testApiKey,
        clearApiKey,
        toggleVisibility,
        exportCostHistory,
        clearCostHistory,
        toggleDarkMode,
        showToast,
        showLoading,
        hideLoading
    };

    // HTML compatibility - expose functions globally
    window.switchProvider = switchProvider;
    window.saveApiKey = saveApiKey;
    window.testApiKey = testApiKey;
    window.clearApiKey = clearApiKey;
    window.toggleVisibility = toggleVisibility;
    window.exportCostHistory = exportCostHistory;
    window.clearCostHistory = clearCostHistory;
    window.toggleDarkMode = toggleDarkMode;

})();
