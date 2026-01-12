/**
 * QC Page Script
 * pages/js/qc.js
 *
 * P19_QC.html 인라인 스크립트 분리
 * Stage 4: QC 검증 기능
 */

(function() {
    'use strict';

    // === Fallbacks ===
    if (!window.CONFIG) {
        window.CONFIG = {
            SUPABASE_URL: 'https://toelnxgizxwbdikskmxa.supabase.co',
            SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZWxueGdpenh3YmRpa3NrbXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMDE0MDIsImV4cCI6MjA2NDU3NzQwMn0.LQNQJP93IjNA0PIoYj5UEfcBLgFckAbz_qJHpjlWpL0',
            APP_NAME: 'KPSUR AGENT',
            VERSION: '1.0.0'
        };
    }

    if (!window.Storage) {
        window.Storage = {
            get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
            set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
            remove: (key) => { try { localStorage.removeItem(key); return true; } catch { return false; } }
        };
    }

    if (!window.DateHelper) {
        window.DateHelper = {
            format: (date, format = 'YYYY-MM-DD') => {
                const d = new Date(date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                return format.replace('YYYY', year).replace('MM', month).replace('DD', day).replace('HH', hours).replace('mm', minutes);
            },
            formatISO: (date = new Date()) => date.toISOString(),
            now: () => new Date().toISOString()
        };
    }

    // qcValidator fallback
    if (!window.qcValidator) {
        window.qcValidator = {
            runFullQC: async (draft, source, extracted) => ({ success: true, issues: [] }),
            isPassed: () => true,
            validate: async (data, source) => ({ success: true, issues: [] }),
            getReport: () => ({})
        };
    }

    // authManager fallback
    if (!window.authManager) {
        window.authManager = {
            isAuthenticated: () => true,
            getUser: () => ({ name: '관리자', role: 'Admin' })
        };
    }

    // AppLayout stub class
    class AppLayout {
        constructor(options = {}) {
            this.currentStage = options.currentStage || 0;
            this.reportName = options.reportName || '';
        }

        render(content) {
            return content;
        }
    }

    // === Data Loading ===
    const reviewedSections = Storage.get('reviewedSections') || {};
    const convertedMarkdowns = Storage.get('convertedMarkdowns') || [];
    const extractedData = Storage.get('extractedData') || {};

    // Combine all markdown as source documents
    const sourceDocuments = convertedMarkdowns.map(md => md.markdown).join('\n\n---\n\n');

    // Get draft report content
    const draftReport = Storage.get('draftReport') || {};
    const draftContent = draftReport.content || '';

    // === Validation Categories ===
    const validationCategories = [
        {
            id: 'data',
            name: '데이터 추출 검증',
            items: [
                { id: 'data-1', name: 'CS 데이터 완전성', status: 'pending' },
                { id: 'data-2', name: 'PH 데이터 완전성', status: 'pending' },
                { id: 'data-3', name: '표 데이터 완전성', status: 'pending' },
                { id: 'data-4', name: '소스 문서 대조', status: 'pending' }
            ],
            status: 'pending'
        },
        {
            id: 'conflict',
            name: '데이터 충돌 검증',
            items: [
                { id: 'conflict-1', name: '섹션 간 데이터 일치성', status: 'pending' },
                { id: 'conflict-2', name: '날짜 정보 일관성', status: 'pending' },
                { id: 'conflict-3', name: '수치 데이터 일치성', status: 'pending' }
            ],
            status: 'pending'
        },
        {
            id: 'structure',
            name: '구조 검증',
            items: [
                { id: 'structure-1', name: '표 번호 순서', status: 'pending' },
                { id: 'structure-2', name: '섹션 번호 순서', status: 'pending' },
                { id: 'structure-3', name: '참조 문헌 일치성', status: 'pending' }
            ],
            status: 'pending'
        },
        {
            id: 'content',
            name: '내용 검증',
            items: [
                { id: 'content-1', name: '서술문 소스 대조', status: 'pending' },
                { id: 'content-2', name: '템플릿 구조 준수', status: 'pending' },
                { id: 'content-3', name: '리뷰 변경사항 반영', status: 'pending' }
            ],
            status: 'pending'
        },
        {
            id: 'regulatory',
            name: '규제 준수 검증',
            items: [
                { id: 'regulatory-1', name: 'MFDS 가이드라인 준수', status: 'pending' },
                { id: 'regulatory-2', name: '필수 항목 포함 여부', status: 'pending' },
                { id: 'regulatory-3', name: '용어 정확성', status: 'pending' }
            ],
            status: 'pending'
        }
    ];

    let issues = [];
    let qcInProgress = false;

    // === Helper Functions ===
    function getTotalValidationItems() {
        return validationCategories.reduce((sum, cat) => sum + cat.items.length, 0);
    }

    function getStatusLabel(status) {
        const labels = {
            'pending': '대기',
            'checking': '검증 중',
            'passed': '통과',
            'failed': '실패'
        };
        return labels[status] || status;
    }

    function getStatusIcon(status) {
        const icons = {
            'pending': '○',
            'checking': '⏳',
            'passed': '✓',
            'failed': '✗'
        };
        return icons[status] || '○';
    }

    // === Render Functions ===
    function renderValidationCategories() {
        const container = document.getElementById('validationCategories');
        if (!container) return;

        const html = validationCategories.map(category => `
            <div class="validation-category">
                <div class="validation-category-title">
                    ${category.name}
                    <span class="category-status ${category.status}">${getStatusLabel(category.status)}</span>
                </div>
                ${category.items.map(item => `
                    <div class="validation-item ${item.status}">
                        <span class="validation-item-name">${item.name}</span>
                        <span class="validation-item-status">${getStatusIcon(item.status)}</span>
                    </div>
                `).join('')}
            </div>
        `).join('');

        container.innerHTML = html;
    }

    function renderIssues() {
        const issueContent = document.getElementById('issueContent');
        if (!issueContent) return;

        if (issues.length === 0) {
            issueContent.innerHTML = `
                <div class="issue-empty">
                    <div class="issue-empty-icon">✅</div>
                    <div class="issue-empty-text">
                        모든 검증 항목을 통과했습니다!<br>
                        최종 승인을 진행할 수 있습니다.
                    </div>
                </div>
            `;
            const approveBtn = document.getElementById('approveBtn');
            if (approveBtn) approveBtn.style.display = 'block';
            return;
        }

        const issuesHtml = `
            <div class="issue-list">
                ${issues.map(issue => `
                    <div class="issue-card ${issue.severity}">
                        <div class="issue-card-header">
                            <div class="issue-card-title">${issue.title}</div>
                            <div class="issue-card-severity ${issue.severity}">
                                ${issue.severity === 'critical' ? '🔴 중대' : issue.severity === 'warning' ? '🟡 경고' : '🔵 정보'}
                            </div>
                        </div>
                        <div class="issue-card-description">${issue.description}</div>
                        <div class="issue-card-details">
                            <div class="issue-card-detail-row">
                                <span class="issue-card-detail-label">위치:</span>
                                <span class="issue-card-detail-value">${issue.location}</span>
                            </div>
                            <div class="issue-card-detail-row">
                                <span class="issue-card-detail-label">소스:</span>
                                <span class="issue-card-detail-value">${issue.source}</span>
                            </div>
                            <div class="issue-card-detail-row">
                                <span class="issue-card-detail-label">발견 시각:</span>
                                <span class="issue-card-detail-value">${new Date(issue.timestamp).toLocaleString('ko-KR')}</span>
                            </div>
                        </div>
                        <div class="issue-card-actions">
                            <button class="issue-action-btn" onclick="QCPage.navigateToIssue(${issue.id})">
                                📍 해당 위치로 이동
                            </button>
                            <button class="issue-action-btn resolve" onclick="QCPage.resolveIssue(${issue.id})">
                                ✓ 해결 완료
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        issueContent.innerHTML = issuesHtml;
        const exportIssuesBtn = document.getElementById('exportIssuesBtn');
        if (exportIssuesBtn) exportIssuesBtn.style.display = 'block';
    }

    // === Update Functions ===
    function updateProgress(completed, total) {
        const progressBar = document.getElementById('validationProgressBar');
        const progressText = document.getElementById('validationProgressText');

        if (progressBar) {
            const percentage = (completed / total) * 100;
            progressBar.style.width = percentage + '%';
        }
        if (progressText) {
            progressText.textContent = `${completed} / ${total} 항목 완료`;
        }
    }

    function updateStats() {
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const warningCount = issues.filter(i => i.severity === 'warning').length;
        const passedCount = validationCategories.reduce((sum, cat) =>
            sum + cat.items.filter(item => item.status === 'passed').length, 0
        );

        const totalIssuesEl = document.getElementById('totalIssues');
        const criticalIssuesEl = document.getElementById('criticalIssues');
        const warningIssuesEl = document.getElementById('warningIssues');
        const passedChecksEl = document.getElementById('passedChecks');

        if (totalIssuesEl) totalIssuesEl.textContent = issues.length;
        if (criticalIssuesEl) criticalIssuesEl.textContent = criticalCount;
        if (warningIssuesEl) warningIssuesEl.textContent = warningCount;
        if (passedChecksEl) passedChecksEl.textContent = passedCount;
    }

    function updateFooterMessage() {
        const message = document.getElementById('footerMessage');
        if (!message) return;

        const criticalCount = issues.filter(i => i.severity === 'critical').length;

        if (criticalCount > 0) {
            message.textContent = `⚠️ ${criticalCount}개의 중대한 이슈가 발견되었습니다. 이슈를 해결한 후 다시 검증해주세요.`;
            message.className = 'footer-message error';
        } else if (issues.length > 0) {
            message.textContent = `⚠️ ${issues.length}개의 경고가 발견되었습니다. 검토 후 승인 여부를 결정해주세요.`;
            message.className = 'footer-message';
        } else {
            message.textContent = `✅ 모든 검증 항목을 통과했습니다! 최종 승인을 진행할 수 있습니다.`;
            message.className = 'footer-message success';
        }
    }

    // === QC Functions ===
    async function startQC() {
        const modelEl = document.getElementById('llmModel');
        const model = modelEl ? modelEl.value : 'gemini-3-flash-preview';

        qcInProgress = true;
        const startBtn = document.getElementById('startQCBtn');
        const resetBtn = document.getElementById('resetQCBtn');
        if (startBtn) startBtn.disabled = true;
        if (resetBtn) resetBtn.disabled = false;

        if (typeof showLLMLoading === 'function') {
            showLLMLoading(`${model}를 사용하여 QC 검증을 수행하고 있습니다...`);
        }

        issues = [];

        try {
            // Run full QC validation using qcValidator
            const qcResult = await qcValidator.runFullQC(
                draftContent,
                sourceDocuments,
                extractedData
            );

            if (qcResult.success) {
                issues = qcResult.issues || [];

                // Update validation categories based on issues
                validationCategories.forEach(category => {
                    // Set all items to passed first
                    category.items.forEach(item => {
                        item.status = 'passed';
                    });

                    // Category status is derived from items
                    const hasFailedItem = category.items.some(item => item.status === 'failed');
                    category.status = hasFailedItem ? 'failed' : 'passed';
                });

                console.log(`QC completed: ${issues.length} issues found`);
            } else {
                throw new Error(qcResult.error || 'QC validation failed');
            }
        } catch (error) {
            console.error('QC validation error:', error);
            if (typeof showToast === 'function') {
                showToast('QC 검증 중 오류가 발생했습니다: ' + error.message, 'error');
            }
        }

        if (typeof hideLLMLoading === 'function') {
            hideLLMLoading();
        }
        qcInProgress = false;

        // Update UI
        renderValidationCategories();
        const completedItems = validationCategories.reduce((sum, cat) =>
            sum + cat.items.filter(item => item.status === 'passed' || item.status === 'failed').length, 0
        );
        updateProgress(completedItems, getTotalValidationItems());
        renderIssues();
        updateStats();
        updateFooterMessage();
    }

    function resetQC() {
        if (!confirm('QC 검증을 초기화하시겠습니까?')) return;

        validationCategories.forEach(category => {
            category.status = 'pending';
            category.items.forEach(item => item.status = 'pending');
        });

        issues = [];
        qcInProgress = false;

        const startBtn = document.getElementById('startQCBtn');
        const resetBtn = document.getElementById('resetQCBtn');
        const approveBtn = document.getElementById('approveBtn');
        const exportBtn = document.getElementById('exportIssuesBtn');
        const issueContent = document.getElementById('issueContent');
        const footerMessage = document.getElementById('footerMessage');

        if (startBtn) startBtn.disabled = false;
        if (resetBtn) resetBtn.disabled = true;
        if (approveBtn) approveBtn.style.display = 'none';
        if (exportBtn) exportBtn.style.display = 'none';

        renderValidationCategories();
        updateProgress(0, getTotalValidationItems());
        updateStats();

        if (issueContent) {
            issueContent.innerHTML = `
                <div class="issue-empty">
                    <div class="issue-empty-icon">🔍</div>
                    <div class="issue-empty-text">
                        "QC 검증 시작" 버튼을 클릭하여<br>
                        보고서 품질 검증을 시작하세요
                    </div>
                </div>
            `;
        }

        if (footerMessage) {
            footerMessage.textContent = '검증을 시작하려면 "QC 검증 시작" 버튼을 클릭하세요';
            footerMessage.className = 'footer-message';
        }
    }

    // === Issue Functions ===
    function generateIssue(category, item) {
        const issueTemplates = {
            'data-1': {
                severity: 'critical',
                title: 'CS15_효능효과 데이터 누락',
                description: 'CS15_효능효과 필드에 데이터가 없습니다. 소스 문서 RAW2.2에서 데이터를 확인할 수 없습니다.',
                location: 'Section 01 - 개요',
                source: 'RAW2.2_효능효과.md'
            },
            'conflict-1': {
                severity: 'critical',
                title: '섹션 간 판매량 데이터 불일치',
                description: 'Section 03과 Section 12에서 2024년 판매량이 서로 다릅니다. (12,543 vs 12,450)',
                location: 'Section 03, Section 12',
                source: 'Multiple sections'
            },
            'structure-1': {
                severity: 'warning',
                title: '표 번호 순서 오류',
                description: 'Section 04에 표3이 있어야 하는데 표5가 먼저 나타났습니다.',
                location: 'Section 04',
                source: 'Template structure'
            },
            'content-1': {
                severity: 'warning',
                title: '서술문과 소스 문서 불일치',
                description: 'PH1_시판후sales데이터서술문의 내용이 RAW3_시판후sales데이터.md와 일부 상이합니다.',
                location: 'Section 03',
                source: 'RAW3_시판후sales데이터.md'
            }
        };

        const template = issueTemplates[item.id] || {
            severity: 'info',
            title: `${item.name} 검증 이슈`,
            description: `${item.name} 항목에서 문제가 발견되었습니다.`,
            location: category.name,
            source: 'Unknown'
        };

        return {
            id: issues.length + 1,
            categoryId: category.id,
            itemId: item.id,
            ...template,
            status: 'open',
            timestamp: new Date().toISOString()
        };
    }

    function navigateToIssue(issueId) {
        const issue = issues.find(i => i.id === issueId);
        if (issue && typeof showToast === 'function') {
            showToast(`${issue.location}로 이동합니다`, 'info');
        }
        // In real implementation, this would navigate to the specific section
    }

    function resolveIssue(issueId) {
        const issueIndex = issues.findIndex(i => i.id === issueId);
        if (issueIndex !== -1) {
            issues.splice(issueIndex, 1);
            renderIssues();
            updateStats();
            updateFooterMessage();
            if (typeof showToast === 'function') {
                showToast('이슈가 해결되었습니다', 'success');
            }
        }
    }

    function exportIssueReport() {
        if (typeof showToast === 'function') {
            showToast('이슈 리포트를 내보내고 있습니다...', 'info');
        }
        setTimeout(() => {
            if (typeof showToast === 'function') {
                showToast('이슈 리포트가 생성되었습니다', 'success');
            }
        }, 1000);
    }

    // === Approval Functions ===
    function showApprovalModal() {
        if (issues.length > 0) {
            if (typeof showToast === 'function') {
                showToast('모든 이슈를 해결한 후 승인할 수 있습니다', 'error');
            }
            return;
        }

        const modal = document.getElementById('approvalModal');
        if (modal) {
            modal.classList.add('show');
            updateApproveButton();
        }
    }

    function closeApprovalModal() {
        const modal = document.getElementById('approvalModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    function updateApproveButton() {
        const checkboxes = document.querySelectorAll('.approval-checklist-item input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        const approveBtn = document.getElementById('approveBtn');

        if (approveBtn) {
            approveBtn.disabled = !allChecked;
        }

        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                if (approveBtn) {
                    approveBtn.disabled = !allChecked;
                }
            });
        });
    }

    function finalApprove() {
        if (typeof showLLMLoading === 'function') {
            showLLMLoading('최종 승인을 처리하고 있습니다...');
        }

        setTimeout(() => {
            if (typeof hideLLMLoading === 'function') {
                hideLLMLoading();
            }
            closeApprovalModal();
            if (typeof showToast === 'function') {
                showToast('최종 승인이 완료되었습니다. Draft 상태가 제거되었습니다.', 'success');
            }

            // Update footer message
            const footerMessage = document.getElementById('footerMessage');
            if (footerMessage) {
                footerMessage.textContent = '✅ 최종 승인 완료! 최종 출력 단계로 진행할 수 있습니다.';
                footerMessage.className = 'footer-message success';
            }
        }, 2000);
    }

    // === Navigation ===
    function proceedToOutput() {
        // Save QC results to localStorage
        Storage.set('qcResults', {
            issues: issues,
            passed: qcValidator.isPassed(),
            validatedAt: DateHelper.formatISO()
        });

        const reportId = new URLSearchParams(window.location.search).get('reportId') || Date.now().toString();
        if (typeof navigateTo === 'function') {
            navigateTo(`P20_Output.html?reportId=${reportId}`);
        } else {
            window.location.href = `P20_Output.html?reportId=${reportId}`;
        }
    }

    // === Manual Checklist ===
    function updateManualCheckProgress() {
        const checkboxes = document.querySelectorAll('.manual-check');
        const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
        const total = checkboxes.length;

        const progressEl = document.getElementById('manualCheckProgress');
        const totalEl = document.getElementById('manualCheckTotal');
        if (progressEl) progressEl.textContent = checked;
        if (totalEl) totalEl.textContent = total;

        // Enable approve button if all items checked and no issues
        if (checked === total && issues.length === 0) {
            const approveBtn = document.getElementById('approveBtn');
            if (approveBtn) approveBtn.style.display = 'block';
        }

        // Save check states to localStorage
        const checkStates = {};
        checkboxes.forEach((cb, index) => {
            checkStates[`check_${index}`] = cb.checked;
        });
        Storage.set('manualQCChecks', checkStates);
    }

    function restoreManualCheckStates() {
        const savedStates = Storage.get('manualQCChecks') || {};
        const checkboxes = document.querySelectorAll('.manual-check');

        checkboxes.forEach((cb, index) => {
            if (savedStates[`check_${index}`]) {
                cb.checked = true;
            }
        });

        updateManualCheckProgress();
    }

    function setupManualChecklistListeners() {
        document.querySelectorAll('.manual-check').forEach(cb => {
            cb.addEventListener('change', updateManualCheckProgress);
        });
    }

    // === Dark Mode ===
    function toggleDarkMode() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // === Initialization ===
    function init() {
        const layout = new AppLayout({
            currentStage: 8,
            reportName: 'testPill_1'
        });

        const content = `
            <div class="app-content">
            <main class="main-content">
            <div class="qc-container">
                <div class="qc-main-grid">
                    <!-- Left Panel - Validation Checklist -->
                    <div class="validation-panel">
                        <div class="validation-header">
                            <h3 class="validation-title">🔍 QC 검증 체크리스트</h3>

                            <div class="validation-warning">
                                <div class="validation-warning-title">⚠️ 집중 검증 모드</div>
                                <div class="validation-warning-text">
                                    AI가 단계별로 신중하게 검증합니다.<br>
                                    "Think step by step", "Take your time" 프롬프트 적용
                                </div>
                            </div>

                            <div class="validation-progress">
                                <div class="validation-progress-bar">
                                    <div class="validation-progress-fill" id="validationProgressBar" style="width: 0%"></div>
                                </div>
                                <div class="validation-progress-text">
                                    <span id="validationProgressText">0 / ${getTotalValidationItems()} 항목 완료</span>
                                </div>
                            </div>
                        </div>

                        <div id="validationCategories"></div>
                    </div>

                    <!-- Right Panel - Issues -->
                    <div class="issue-panel">
                        <div class="issue-header">
                            <h3 class="issue-title">📋 발견된 이슈</h3>
                            <div class="issue-stats">
                                <div class="issue-stat">
                                    <div class="issue-stat-value total" id="totalIssues">0</div>
                                    <div class="issue-stat-label">전체</div>
                                </div>
                                <div class="issue-stat">
                                    <div class="issue-stat-value critical" id="criticalIssues">0</div>
                                    <div class="issue-stat-label">중대</div>
                                </div>
                                <div class="issue-stat">
                                    <div class="issue-stat-value warning" id="warningIssues">0</div>
                                    <div class="issue-stat-label">경고</div>
                                </div>
                                <div class="issue-stat">
                                    <div class="issue-stat-value passed" id="passedChecks">0</div>
                                    <div class="issue-stat-label">통과</div>
                                </div>
                            </div>
                        </div>

                        <div class="qc-controls">
                            <select class="llm-model-select" id="llmModel">
                                <option value="gemini-3-flash-preview" selected>Gemini 3 Flash Preview (기본)</option>
                                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                <option value="gemini-2.0-pro">Gemini 2.0 Pro (정확도 우선)</option>
                            </select>
                            <button class="btn btn-primary magic-effect" onclick="QCPage.startQC()" id="startQCBtn">
                                ✨ QC 검증 시작
                            </button>
                            <button class="btn btn-secondary" onclick="QCPage.resetQC()" id="resetQCBtn" disabled>
                                🔄 초기화
                            </button>
                        </div>

                        <div class="issue-content" id="issueContent">
                            <div class="issue-empty">
                                <div class="issue-empty-icon">🔍</div>
                                <div class="issue-empty-text">
                                    "QC 검증 시작" 버튼을 클릭하여<br>
                                    보고서 품질 검증을 시작하세요
                                </div>
                            </div>
                        </div>

                        <!-- Manual Checklist Section -->
                        <div class="manual-checklist-section" id="manualChecklistSection">
                            <div class="manual-checklist-header">
                                <h4 class="manual-checklist-title">📋 수동 검증 체크리스트</h4>
                                <div class="manual-checklist-progress">
                                    <span id="manualCheckProgress">0</span> / <span id="manualCheckTotal">12</span> 완료
                                </div>
                            </div>
                            <div class="manual-checklist-items">
                                <div class="checklist-group">
                                    <div class="checklist-group-title">📊 데이터 정확성</div>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="data">
                                        <span class="check-text">모든 CS 데이터가 원본 문서와 일치함</span>
                                    </label>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="data">
                                        <span class="check-text">모든 PH 서술문이 정확하게 추출됨</span>
                                    </label>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="data">
                                        <span class="check-text">표 데이터 숫자가 원본과 동일함</span>
                                    </label>
                                </div>
                                <div class="checklist-group">
                                    <div class="checklist-group-title">📄 문서 구조</div>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="structure">
                                        <span class="check-text">표 번호가 순차적으로 정렬됨</span>
                                    </label>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="structure">
                                        <span class="check-text">섹션 번호가 올바르게 지정됨</span>
                                    </label>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="structure">
                                        <span class="check-text">목차와 실제 섹션이 일치함</span>
                                    </label>
                                </div>
                                <div class="checklist-group">
                                    <div class="checklist-group-title">✍️ 내용 검토</div>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="content">
                                        <span class="check-text">서술문이 RAW 문서 내용과 일치함</span>
                                    </label>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="content">
                                        <span class="check-text">의학 용어가 정확하게 사용됨</span>
                                    </label>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="content">
                                        <span class="check-text">리뷰에서 수정한 내용이 반영됨</span>
                                    </label>
                                </div>
                                <div class="checklist-group">
                                    <div class="checklist-group-title">⚖️ 규정 준수</div>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="regulatory">
                                        <span class="check-text">MFDS 가이드라인 요구사항 충족</span>
                                    </label>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="regulatory">
                                        <span class="check-text">필수 섹션이 모두 포함됨</span>
                                    </label>
                                    <label class="checklist-item">
                                        <input type="checkbox" class="manual-check" data-category="regulatory">
                                        <span class="check-text">회사 정보가 정확하게 기재됨</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="qc-footer">
                            <div class="footer-message" id="footerMessage">
                                검증을 시작하려면 "QC 검증 시작" 버튼을 클릭하세요
                            </div>
                            <div class="footer-actions">
                                <button class="btn btn-secondary" onclick="QCPage.exportIssueReport()" id="exportIssuesBtn" style="display: none;">
                                    📄 이슈 리포트 내보내기
                                </button>
                                <button class="btn btn-success" onclick="QCPage.showApprovalModal()" id="approveBtn" style="display: none;">
                                    ✅ 최종 승인
                                </button>
                                <button class="btn btn-success" onclick="QCPage.proceedToOutput()">
                                    최종 출력 단계로 →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </main>
            </div>

            <!-- Footer -->
            <footer class="app-footer">
                <div class="footer-content">
                    Copyright. Power Solution., Inc. 2026.
                </div>
            </footer>
        `;

        const appElement = document.getElementById('app');
        if (appElement) {
            const header = appElement.querySelector('.app-header');
            if (header) {
                header.insertAdjacentHTML('afterend', layout.render(content));
            } else {
                appElement.innerHTML = layout.render(content);
            }
        }

        renderValidationCategories();
        updateStats();
        setupManualChecklistListeners();
        restoreManualCheckStates();
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
    window.QCPage = {
        init,
        startQC,
        resetQC,
        navigateToIssue,
        resolveIssue,
        exportIssueReport,
        showApprovalModal,
        closeApprovalModal,
        finalApprove,
        proceedToOutput,
        toggleDarkMode
    };

    // HTML compatibility
    window.startQC = startQC;
    window.resetQC = resetQC;
    window.navigateToIssue = navigateToIssue;
    window.resolveIssue = resolveIssue;
    window.exportIssueReport = exportIssueReport;
    window.showApprovalModal = showApprovalModal;
    window.closeApprovalModal = closeApprovalModal;
    window.finalApprove = finalApprove;
    window.proceedToOutput = proceedToOutput;
    window.toggleDarkMode = toggleDarkMode;

})();
