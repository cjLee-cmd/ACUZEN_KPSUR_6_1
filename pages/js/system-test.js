/**
 * System Test Page Script
 * pages/js/system-test.js
 *
 * P90_SystemTest.html 인라인 스크립트 분리
 * 시스템 테스트 기능 (LLM, Database)
 */

(function() {
    'use strict';

    // === TestRunner Class ===
    class TestRunner {
        constructor() {
            // LLM client will be initialized when needed
            this.llmClient = null;
            this.results = { llm: [], db: [] };
        }

        initLLMClient() {
            if (!this.llmClient && window.MultiLLMClient) {
                this.llmClient = new window.MultiLLMClient();
            }
            return this.llmClient;
        }

        async runLLMTests(models) {
            const resultsContainer = document.getElementById('llmResults');
            if (!resultsContainer) return;

            resultsContainer.innerHTML = '';
            this.results.llm = [];

            // Show progress
            const progressEl = document.getElementById('llmProgress');
            if (progressEl) progressEl.style.display = 'block';

            const client = this.initLLMClient();
            if (!client) {
                this.showError(resultsContainer, 'MultiLLMClient가 로드되지 않았습니다. js/multi-llm-client.js를 확인해주세요.');
                return;
            }

            let completed = 0;
            const total = models.length;

            for (const model of models) {
                const resultCard = this.createResultCard(model, 'testing');
                resultsContainer.appendChild(resultCard);

                // Update progress
                this.updateProgress('llm', completed, total, `테스트 중: ${model}`);

                try {
                    const startTime = Date.now();
                    const response = await client.generate('안녕하세요. 간단히 "테스트 성공"이라고 답변해주세요.', {
                        provider: 'google',
                        model: model,
                        maxTokens: 100
                    });
                    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

                    this.updateResultCard(resultCard, 'success', {
                        model,
                        response: response.text?.substring(0, 100) || '응답 없음',
                        duration: `${duration}s`,
                        tokens: response.usage ? `${response.usage.inputTokens}/${response.usage.outputTokens}` : '-'
                    });

                    this.results.llm.push({ model, status: 'success', duration, response: response.text });
                } catch (error) {
                    this.updateResultCard(resultCard, 'error', {
                        model,
                        error: error.message
                    });
                    this.results.llm.push({ model, status: 'error', error: error.message });
                }

                completed++;
            }

            // Update final progress
            this.updateProgress('llm', total, total, '테스트 완료');

            // Show summary
            this.updateSummary('llm');
        }

        async runDBTests() {
            const resultsContainer = document.getElementById('dbResults');
            if (!resultsContainer) return;

            resultsContainer.innerHTML = '';
            this.results.db = [];

            // Show progress
            const progressEl = document.getElementById('dbProgress');
            if (progressEl) progressEl.style.display = 'block';

            const tests = [
                { name: 'Supabase 연결', test: () => this.testSupabaseConnection() },
                { name: 'Auth 상태 확인', test: () => this.testAuthStatus() }
            ];

            let completed = 0;
            const total = tests.length;

            for (const { name, test } of tests) {
                const resultCard = this.createResultCard(name, 'testing');
                resultsContainer.appendChild(resultCard);

                // Update progress
                this.updateProgress('db', completed, total, `테스트 중: ${name}`);

                try {
                    const startTime = Date.now();
                    const result = await test();
                    const duration = Date.now() - startTime;

                    this.updateResultCard(resultCard, 'success', { model: name, response: result, duration: `${duration}ms` });
                    this.results.db.push({ name, status: 'success', result, duration });
                } catch (error) {
                    this.updateResultCard(resultCard, 'error', { model: name, error: error.message });
                    this.results.db.push({ name, status: 'error', error: error.message });
                }

                completed++;
            }

            // Update final progress
            this.updateProgress('db', total, total, '테스트 완료');

            // Show summary
            this.updateSummary('db');
        }

        async testSupabaseConnection() {
            // Simple connection test
            if (window.supabaseClient) {
                return 'Supabase 클라이언트 로드됨';
            }
            throw new Error('Supabase 클라이언트를 찾을 수 없습니다');
        }

        async testAuthStatus() {
            const session = localStorage.getItem('kpsur_session');
            return session ? '세션 활성화됨' : '세션 없음';
        }

        createResultCard(name, status) {
            const card = document.createElement('div');
            card.className = `result-card ${status}`;
            card.innerHTML = `
                <div class="result-header">
                    <span class="result-model">${name}</span>
                    <span class="result-status">${status === 'testing' ? '테스트 중...' : status}</span>
                </div>
                <div class="result-body">
                    ${status === 'testing' ? '<div class="spinner" style="width:20px;height:20px;"></div>' : ''}
                </div>
            `;
            return card;
        }

        updateResultCard(card, status, data) {
            card.className = `result-card ${status}`;
            const statusEl = card.querySelector('.result-status');
            const bodyEl = card.querySelector('.result-body');

            if (statusEl) {
                statusEl.textContent = status === 'success' ? '성공' : '실패';
                statusEl.style.color = status === 'success' ? '#059669' : '#DC2626';
            }

            if (bodyEl) {
                if (status === 'success') {
                    bodyEl.innerHTML = `
                        <div style="font-size:13px;color:var(--app-text-strong);">
                            ${data.response ? `<div><strong>응답:</strong> ${data.response}</div>` : ''}
                            ${data.duration ? `<div><strong>시간:</strong> ${data.duration}</div>` : ''}
                            ${data.tokens ? `<div><strong>토큰:</strong> ${data.tokens}</div>` : ''}
                        </div>
                    `;
                } else {
                    bodyEl.innerHTML = `
                        <div style="color:#DC2626;font-size:13px;">${data.error}</div>
                        <a href="P91_Settings.html" style="display:inline-block;margin-top:8px;color:var(--color-primary);font-size:12px;text-decoration:underline;">API Key 설정하기</a>
                    `;
                }
            }
        }

        updateProgress(type, current, total, text) {
            const progressBar = document.getElementById(`${type}ProgressBar`);
            const progressText = document.getElementById(`${type}ProgressText`);

            if (progressBar) {
                const percent = total > 0 ? (current / total) * 100 : 0;
                progressBar.style.width = `${percent}%`;
            }
            if (progressText) {
                progressText.textContent = text;
            }
        }

        updateSummary(type) {
            const results = type === 'llm' ? this.results.llm : this.results.db;
            const summaryEl = document.getElementById(`${type}Summary`);

            if (summaryEl) {
                summaryEl.style.display = 'grid';
            }

            const totalEl = document.getElementById(`${type}TotalTests`);
            const passedEl = document.getElementById(`${type}PassedTests`);
            const failedEl = document.getElementById(`${type}FailedTests`);
            const avgTimeEl = document.getElementById(`${type}AvgTime`);

            const passed = results.filter(r => r.status === 'success').length;
            const failed = results.filter(r => r.status === 'error').length;

            if (totalEl) totalEl.textContent = results.length;
            if (passedEl) passedEl.textContent = passed;
            if (failedEl) failedEl.textContent = failed;

            // Calculate average time
            const successResults = results.filter(r => r.status === 'success' && r.duration);
            if (successResults.length > 0 && avgTimeEl) {
                const avgTime = successResults.reduce((sum, r) => {
                    const time = parseFloat(r.duration);
                    return sum + (isNaN(time) ? 0 : time);
                }, 0) / successResults.length;
                avgTimeEl.textContent = type === 'llm' ? `${avgTime.toFixed(2)}s` : `${avgTime.toFixed(0)}ms`;
            }
        }

        showError(container, message) {
            container.innerHTML = `
                <div class="result-card error">
                    <div class="result-header">
                        <span class="result-model">오류</span>
                        <span class="result-status" style="color:#DC2626;">실패</span>
                    </div>
                    <div class="result-body">
                        <div style="color:#DC2626;font-size:13px;">${message}</div>
                    </div>
                </div>
            `;
        }

        exportResults(type) {
            const data = type === 'llm' ? this.results.llm : this.results.db;
            if (data.length === 0) {
                alert('내보낼 결과가 없습니다.');
                return;
            }
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_test_results_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
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

    // === Tab Switching ===
    function setupTabs() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.tab;

                // Update buttons
                document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                button.classList.add('active');

                // Update content
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const tabContent = document.getElementById(`tab-${tab}`);
                if (tabContent) tabContent.classList.add('active');
            });
        });
    }

    // === Event Listeners ===
    function setupEventListeners(testRunner) {
        // LLM Tests
        const runLLMBtn = document.getElementById('runLLMTests');
        if (runLLMBtn) {
            runLLMBtn.addEventListener('click', async () => {
                const selectedModels = Array.from(document.querySelectorAll('.model-checkbox input:checked'))
                    .map(input => input.value);

                if (selectedModels.length === 0) {
                    alert('테스트할 모델을 선택해주세요.');
                    return;
                }

                runLLMBtn.disabled = true;
                runLLMBtn.textContent = '테스트 중...';

                try {
                    await testRunner.runLLMTests(selectedModels);
                } finally {
                    runLLMBtn.disabled = false;
                    runLLMBtn.textContent = '전체 테스트 실행';
                }
            });
        }

        // DB Tests
        const runDBBtn = document.getElementById('runDBTests');
        if (runDBBtn) {
            runDBBtn.addEventListener('click', async () => {
                runDBBtn.disabled = true;
                runDBBtn.textContent = '테스트 중...';

                try {
                    await testRunner.runDBTests();
                } finally {
                    runDBBtn.disabled = false;
                    runDBBtn.textContent = '전체 테스트 실행';
                }
            });
        }

        // Export results
        const exportLLMBtn = document.getElementById('exportLLMResults');
        if (exportLLMBtn) {
            exportLLMBtn.addEventListener('click', () => {
                testRunner.exportResults('llm');
            });
        }

        const exportDBBtn = document.getElementById('exportDBResults');
        if (exportDBBtn) {
            exportDBBtn.addEventListener('click', () => {
                testRunner.exportResults('db');
            });
        }
    }

    // === Initialization ===
    function init() {
        // Create test runner instance
        const testRunner = new TestRunner();

        // Setup tabs
        setupTabs();

        // Setup event listeners
        setupEventListeners(testRunner);

        // Expose to global for debugging
        window.testRunner = testRunner;
    }

    // === Dark mode initialization (before DOM ready) ===
    (function() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    })();

    // === Page Load ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // === Global Export ===
    window.SystemTestPage = {
        TestRunner,
        init,
        toggleDarkMode
    };

    // HTML compatibility
    window.toggleDarkMode = toggleDarkMode;

})();
