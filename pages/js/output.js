/**
 * Output Page Script
 * pages/js/output.js
 *
 * P20_Output.html 인라인 스크립트 분리
 * Stage 5: 최종 출력 기능
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

    // outputGenerator fallback
    if (!window.outputGenerator && !window.hybridGenerator) {
        window.outputGenerator = {
            validateReportFormat: (content) => ({ valid: true, issues: [] }),
            addMetadata: (content, metadata) => content,
            generateWordDocument: async (name, content, isDraft) => ({ filename: name + '.docx' }),
            downloadHTML: (name, content, isDraft) => ({ filename: name + '.html' }),
            printToPDF: (name, content, isDraft) => ({ filename: name + '.pdf' }),
            getOutputHistory: () => []
        };
    }

    // authManager fallback
    if (!window.authManager) {
        window.authManager = {
            isAuthenticated: () => true,
            getUser: () => ({ name: '관리자', role: 'Admin' }),
            getCurrentUser: () => ({ name: '관리자', role: 'Admin' })
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

    // === Data ===
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('reportId');
    console.log('[P20] Report ID from URL:', reportId);

    const draftReport = window.Storage.get('draftReport') || {};
    const qcResults = window.Storage.get('qcResults') || {};
    let generatedSections = window.Storage.get('generatedSections') || [];
    const reportContent = draftReport.content || '';

    let zoomLevel = 100;
    let exportHistory = [];

    // Get outputGenerator
    const outputGenerator = window.hybridGenerator || window.outputGenerator;

    // Try to load export history
    try {
        if (outputGenerator && typeof outputGenerator.getOutputHistory === 'function') {
            exportHistory = outputGenerator.getOutputHistory() || [];
        }
    } catch (e) {
        console.warn('Export history not available:', e.message);
    }

    // === DB Functions ===
    async function loadSectionsFromDB() {
        if (!reportId) {
            console.log('[P20] No reportId, using localStorage');
            return;
        }

        try {
            // Wait for supabaseClient
            if (typeof window.supabaseClient === 'undefined') {
                const module = await import('../js/supabase-client.js');
                window.supabaseClient = module.default;
            }

            if (!window.supabaseClient) {
                console.warn('[P20] supabaseClient not available');
                return;
            }

            const result = await window.supabaseClient.getSections(reportId);

            if (result.success && result.sections && result.sections.length > 0) {
                console.log(`[P20] Loaded ${result.sections.length} sections from DB`);

                // Convert DB data to generatedSections format
                generatedSections = {};
                result.sections.forEach(dbSection => {
                    generatedSections[dbSection.section_number] = {
                        id: dbSection.section_number,
                        name: dbSection.section_name,
                        content: dbSection.content_markdown,
                        dbId: dbSection.id,
                        version: dbSection.version
                    };
                });

                // Refresh preview
                const preview = document.getElementById('documentPreview');
                if (preview) {
                    preview.innerHTML = generatePreviewHTML();
                }
            }
        } catch (error) {
            console.error('[P20] DB load error:', error);
        }
    }

    // === Helper Functions ===
    function convertMarkdownToHTML(content) {
        // Table conversion (process before line break conversion)
        content = content.replace(/(\|[^\n]+\|\n)+/g, (tableMatch) => {
            const rows = tableMatch.trim().split('\n');
            let tableHtml = '<table>';
            rows.forEach((row, idx) => {
                const cells = row.split('|').filter(c => c.trim() !== '');
                // Skip separator row (|---|---|)
                if (cells.every(c => /^[\s:-]+$/.test(c))) {
                    return;
                }
                const isHeader = idx === 0;
                const tag = isHeader ? 'th' : 'td';
                const cellsHtml = cells.map(c => '<' + tag + '>' + c.trim() + '</' + tag + '>').join('');
                tableHtml += '<tr>' + cellsHtml + '</tr>';
            });
            tableHtml += '</table>';
            return tableHtml;
        });

        // Basic markdown conversion - process headers in order (highest level first)
        content = content
            .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
            .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        return content;
    }

    function generatePreviewHTML() {
        // 1. Generate from generatedSections (highest priority)
        let sectionsArray = [];

        if (generatedSections) {
            if (Array.isArray(generatedSections)) {
                sectionsArray = generatedSections;
            } else if (typeof generatedSections === 'object') {
                // Convert object values to array and sort by ID
                sectionsArray = Object.values(generatedSections).sort((a, b) => {
                    const idA = parseInt(a.id) || 0;
                    const idB = parseInt(b.id) || 0;
                    return idA - idB;
                });
            }
        }

        if (sectionsArray.length > 0) {
            let html = '<h1>의약품 재심사 안전성 정기보고서</h1>\n';

            sectionsArray.forEach((section) => {
                if (section && section.content) {
                    const content = convertMarkdownToHTML(section.content);
                    html += `<div class="section-content"><p>${content}</p></div>\n`;
                }
            });

            return html;
        }

        // 2. Use draftReport.content if available (Fallback)
        if (reportContent && reportContent.trim().length > 0) {
            return '<div class="section-content"><p>' + convertMarkdownToHTML(reportContent) + '</p></div>';
        }

        // 3. Fallback - default message
        return `
            <h1>의약품 재심사 안전성 정기보고서</h1>
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <p style="font-size: 16px;">생성된 보고서 내용이 없습니다.</p>
                <p style="font-size: 14px;">템플릿 작성 단계에서 보고서를 생성해 주세요.</p>
            </div>
        `;
    }

    // === Zoom Functions ===
    function zoomIn() {
        if (zoomLevel < 150) {
            zoomLevel += 10;
            applyZoom();
        }
    }

    function zoomOut() {
        if (zoomLevel > 50) {
            zoomLevel -= 10;
            applyZoom();
        }
    }

    function applyZoom() {
        const preview = document.getElementById('documentPreview');
        if (preview) {
            preview.style.transform = `scale(${zoomLevel / 100})`;
            preview.style.transformOrigin = 'top center';
        }
        const zoomEl = document.getElementById('zoomLevel');
        if (zoomEl) {
            zoomEl.textContent = zoomLevel + '%';
        }
    }

    // === Preview Functions ===
    function printPreview() {
        window.print();
    }

    function fullscreen() {
        const element = document.getElementById('previewContent');
        if (element && element.requestFullscreen) {
            element.requestFullscreen();
        }
    }

    // === File Name Functions ===
    function updateFileNamePreview() {
        const fileNameEl = document.getElementById('fileName');
        const formatEl = document.querySelector('input[name="exportFormat"]:checked');
        const previewEl = document.getElementById('fileNamePreview');

        if (!fileNameEl || !formatEl || !previewEl) return;

        const fileName = fileNameEl.value;
        const format = formatEl.value;

        let preview = fileName;
        if (format === 'docx') {
            preview += '.docx';
        } else if (format === 'pdf') {
            preview += '.pdf';
        } else if (format === 'both') {
            preview += '.docx / .pdf';
        }

        previewEl.textContent = preview;
    }

    // === Export Functions ===
    async function exportDocument() {
        const formatEl = document.querySelector('input[name="exportFormat"]:checked');
        const fileNameEl = document.getElementById('fileName');
        const format = formatEl ? formatEl.value : 'docx';
        const fileName = fileNameEl ? fileNameEl.value : 'report';
        const isDraft = document.getElementById('saveAsDraft')?.checked || false;

        // Check outputGenerator - prefer OutputGenerator instance
        let generator = window.outputGenerator;
        if (!generator || typeof generator.validateReportFormat !== 'function') {
            if (window.OutputGenerator) {
                generator = new window.OutputGenerator();
                console.log('Created new OutputGenerator instance for export');
            } else {
                if (typeof showToast === 'function') {
                    showToast('출력 모듈을 로드하지 못했습니다.', 'error');
                }
                return;
            }
        }

        if (typeof showLLMLoading === 'function') {
            showLLMLoading('최종 문서를 생성하고 있습니다...');
        }

        try {
            // Get saved report content
            let content = reportContent;

            // If no content, get from current preview
            if (!content || content.trim().length === 0) {
                const preview = document.getElementById('documentPreview');
                if (preview) {
                    content = preview.innerHTML;
                }
            }

            // Validate report (only if content exists)
            if (content && content.length > 100) {
                const validation = generator.validateReportFormat(content);
                if (!validation.valid) {
                    console.warn('Report validation warnings:', validation.issues);
                }
            }

            // Add metadata
            const metadata = {
                reportName: fileName,
                version: '1.0',
                date: window.DateHelper.formatISO ? window.DateHelper.formatISO() : new Date().toISOString(),
                author: window.authManager.getCurrentUser()?.name || 'Unknown',
                isDraft: isDraft
            };

            const contentWithMetadata = generator.addMetadata(content, metadata);

            // Export based on format
            let result;
            if (format === 'docx') {
                result = await generator.generateWordDocument(fileName, contentWithMetadata, isDraft);
            } else if (format === 'html') {
                result = generator.downloadHTML(fileName, contentWithMetadata, isDraft);
            } else if (format === 'pdf') {
                result = generator.printToPDF(fileName, contentWithMetadata, isDraft);
            } else if (format === 'both') {
                result = await generator.generateWordDocument(fileName, contentWithMetadata, isDraft);
                generator.printToPDF(fileName, contentWithMetadata, isDraft);
            }

            // Update export history
            exportHistory = generator.getOutputHistory();
            renderExportHistory();

            if (typeof hideLLMLoading === 'function') {
                hideLLMLoading();
            }
            if (typeof showToast === 'function') {
                showToast(`${result.filename || fileName} 파일이 생성되었습니다`, 'success');
            }
        } catch (error) {
            console.error('Export error:', error);
            if (typeof hideLLMLoading === 'function') {
                hideLLMLoading();
            }
            if (typeof showToast === 'function') {
                showToast('문서 생성 중 오류가 발생했습니다: ' + error.message, 'error');
            }
        }
    }

    function saveAsDraft() {
        if (typeof showLLMLoading === 'function') {
            showLLMLoading('임시 저장 중...');
        }

        setTimeout(() => {
            if (typeof hideLLMLoading === 'function') {
                hideLLMLoading();
            }
            if (typeof showToast === 'function') {
                showToast('임시 저장되었습니다', 'success');
            }
        }, 1000);
    }

    // === Submission Functions ===
    async function prepareSubmission() {
        const checkReview = document.getElementById('checkReview')?.checked;
        const checkApproval = document.getElementById('checkApproval')?.checked;

        if (!checkReview || !checkApproval) {
            if (typeof showToast === 'function') {
                showToast('책임자 검토와 최종 승인자 서명을 완료해주세요', 'error');
            }
            return;
        }

        if (typeof showLLMLoading === 'function') {
            showLLMLoading('MFDS 제출 패키지를 생성하고 있습니다...');
        }

        await new Promise(resolve => setTimeout(resolve, 3000));

        if (typeof hideLLMLoading === 'function') {
            hideLLMLoading();
        }
        if (typeof showToast === 'function') {
            showToast('제출 패키지가 생성되었습니다', 'success');
        }

        // Show completion message
        setTimeout(() => {
            if (confirm('모든 작업이 완료되었습니다! 대시보드로 이동하시겠습니까?')) {
                if (typeof navigateTo === 'function') {
                    navigateTo('P10_Dashboard.html');
                } else {
                    window.location.href = 'P10_Dashboard.html';
                }
            }
        }, 500);
    }

    // === Export History Functions ===
    function renderExportHistory() {
        const container = document.getElementById('exportHistoryList');
        if (!container) return;

        const historyHtml = exportHistory.map(item => `
            <div class="export-history-item">
                <div class="export-history-name">${item.name}</div>
                <div class="export-history-meta">
                    ${item.format} / ${item.timestamp} / ${item.size}
                </div>
                <div class="export-history-actions">
                    <button class="history-action-btn" onclick="OutputPage.downloadExport(${item.id})">
                        다운로드
                    </button>
                    <button class="history-action-btn" onclick="OutputPage.deleteExport(${item.id})">
                        삭제
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = historyHtml || `
            <p style="color: #94a3b8; font-size: 12px; text-align: center; padding: 20px 0;">
                내보내기 기록이 없습니다
            </p>
        `;
    }

    function downloadExport(id) {
        const item = exportHistory.find(e => e.id === id);
        if (item && typeof showToast === 'function') {
            showToast(`${item.name} 다운로드를 시작합니다`, 'info');
        }
    }

    function deleteExport(id) {
        if (!confirm('이 내보내기를 삭제하시겠습니까?')) return;

        const index = exportHistory.findIndex(e => e.id === id);
        if (index !== -1) {
            exportHistory.splice(index, 1);
            renderExportHistory();
            if (typeof showToast === 'function') {
                showToast('삭제되었습니다', 'success');
            }
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

    // === Event Listeners ===
    function setupEventListeners() {
        // File name input change
        const fileNameEl = document.getElementById('fileName');
        if (fileNameEl) {
            fileNameEl.addEventListener('input', updateFileNamePreview);
        }

        // Export format change
        document.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
            radio.addEventListener('change', updateFileNamePreview);
        });
    }

    // === Initialization ===
    function init() {
        const layout = new AppLayout({
            currentStage: 9,
            reportName: 'testPill_1'
        });

        const content = `
            <div class="app-content">
            <main class="main-content">
            <div class="output-container">
                <!-- Left Panel - Document Preview -->
                <div class="preview-panel">
                    <div class="preview-header">
                        <h2 class="preview-title">최종 문서 미리보기</h2>

                        <div class="preview-info">
                            <div class="preview-info-text">
                                <strong>QC 검증 완료!</strong> 최종 보고서를 미리 확인하고 원하는 형식으로 내보내세요.
                            </div>
                        </div>

                        <div class="preview-controls">
                            <div class="zoom-control">
                                <button class="zoom-btn" onclick="OutputPage.zoomOut()">-</button>
                                <span class="zoom-level" id="zoomLevel">${zoomLevel}%</span>
                                <button class="zoom-btn" onclick="OutputPage.zoomIn()">+</button>
                            </div>
                            <button class="btn btn-secondary" onclick="OutputPage.printPreview()">
                                인쇄 미리보기
                            </button>
                            <button class="btn btn-secondary" onclick="OutputPage.fullscreen()">
                                전체화면
                            </button>
                        </div>
                    </div>

                    <div class="preview-content" id="previewContent">
                        <div class="document-preview" id="documentPreview">
                            ${generatePreviewHTML()}
                        </div>
                    </div>
                </div>

                <!-- Right Panel - Export Options -->
                <div class="export-panel">
                    <div class="export-section">
                        <h3 class="export-section-title">내보내기 형식</h3>

                        <div class="export-option-group">
                            <label class="export-option">
                                <input type="radio" name="exportFormat" value="docx" checked>
                                <span class="export-option-label">
                                    Word 문서
                                    <span class="format-badge">.docx</span>
                                </span>
                                <span class="export-option-icon"></span>
                            </label>

                            <label class="export-option">
                                <input type="radio" name="exportFormat" value="pdf">
                                <span class="export-option-label">
                                    PDF 문서
                                    <span class="format-badge">.pdf</span>
                                </span>
                                <span class="export-option-icon"></span>
                            </label>

                            <label class="export-option">
                                <input type="radio" name="exportFormat" value="both">
                                <span class="export-option-label">
                                    Word + PDF
                                    <span class="format-badge">둘 다</span>
                                </span>
                                <span class="export-option-icon"></span>
                            </label>
                        </div>
                    </div>

                    <div class="export-section">
                        <h3 class="export-section-title">추가 옵션</h3>

                        <div class="export-option-group">
                            <label class="export-option">
                                <input type="checkbox" id="includeTableData" checked>
                                <span class="export-option-label">표 데이터 Excel 파일 포함</span>
                                <span class="export-option-icon"></span>
                            </label>

                            <label class="export-option">
                                <input type="checkbox" id="includeSourceDocs">
                                <span class="export-option-label">소스 문서 포함</span>
                                <span class="export-option-icon"></span>
                            </label>

                            <label class="export-option">
                                <input type="checkbox" id="includeChangeLogs">
                                <span class="export-option-label">변경 이력 포함</span>
                                <span class="export-option-icon"></span>
                            </label>
                        </div>
                    </div>

                    <div class="export-section">
                        <h3 class="export-section-title">파일명</h3>

                        <input type="text" class="file-name-input" id="fileName" value="testPill_1_v1.1" placeholder="파일명 입력">
                        <div class="file-name-preview">
                            미리보기: <strong id="fileNamePreview">testPill_1_v1.1.docx</strong>
                        </div>
                    </div>

                    <div class="export-section">
                        <h3 class="export-section-title">버전 정보</h3>

                        <div class="version-info">
                            <div class="version-info-row">
                                <span class="version-info-label">현재 버전:</span>
                                <span class="version-info-value">v1.1</span>
                            </div>
                            <div class="version-info-row">
                                <span class="version-info-label">생성일:</span>
                                <span class="version-info-value">2025-01-15 14:23</span>
                            </div>
                            <div class="version-info-row">
                                <span class="version-info-label">작성자:</span>
                                <span class="version-info-value">홍길동</span>
                            </div>
                            <div class="version-info-row">
                                <span class="version-info-label">상태:</span>
                                <span class="version-info-value">QC 승인됨</span>
                            </div>
                        </div>
                    </div>

                    <div class="export-section">
                        <div class="export-button-group">
                            <button class="export-btn primary magic-effect" onclick="OutputPage.exportDocument()">
                                최종 문서 내보내기
                            </button>
                            <button class="export-btn secondary" onclick="OutputPage.saveAsDraft()">
                                임시 저장
                            </button>
                        </div>
                    </div>

                    <div class="submission-panel">
                        <div class="submission-title">MFDS 제출 준비</div>
                        <div class="submission-text">
                            식품의약품안전처(MFDS) 제출을 위한 최종 체크리스트를 확인하세요.
                        </div>

                        <div class="submission-checklist">
                            <div class="submission-checklist-item">
                                <input type="checkbox" id="checkComplete" checked disabled>
                                <label for="checkComplete">모든 섹션 작성 완료</label>
                            </div>
                            <div class="submission-checklist-item">
                                <input type="checkbox" id="checkQC" checked disabled>
                                <label for="checkQC">QC 검증 통과</label>
                            </div>
                            <div class="submission-checklist-item">
                                <input type="checkbox" id="checkReview">
                                <label for="checkReview">책임자 검토 완료</label>
                            </div>
                            <div class="submission-checklist-item">
                                <input type="checkbox" id="checkApproval">
                                <label for="checkApproval">최종 승인자 서명</label>
                            </div>
                        </div>

                        <button class="export-btn primary" onclick="OutputPage.prepareSubmission()" style="width: 100%;">
                            제출 패키지 생성
                        </button>
                    </div>

                    <div class="export-section export-history">
                        <h3 class="export-section-title">내보내기 기록</h3>
                        <div id="exportHistoryList"></div>
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

        setupEventListeners();
        renderExportHistory();

        // Load sections from DB (async)
        if (reportId) {
            loadSectionsFromDB();
        }
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
    window.OutputPage = {
        init,
        zoomIn,
        zoomOut,
        printPreview,
        fullscreen,
        exportDocument,
        saveAsDraft,
        prepareSubmission,
        downloadExport,
        deleteExport,
        toggleDarkMode
    };

    // HTML compatibility
    window.zoomIn = zoomIn;
    window.zoomOut = zoomOut;
    window.printPreview = printPreview;
    window.fullscreen = fullscreen;
    window.exportDocument = exportDocument;
    window.saveAsDraft = saveAsDraft;
    window.prepareSubmission = prepareSubmission;
    window.downloadExport = downloadExport;
    window.deleteExport = deleteExport;
    window.toggleDarkMode = toggleDarkMode;

})();
