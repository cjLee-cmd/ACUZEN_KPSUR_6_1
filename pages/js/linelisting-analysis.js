/**
 * Line Listing Analysis Page Script
 * pages/js/linelisting-analysis.js
 *
 * P16_LineListingAnalysis.html 페이지 스크립트
 */

(function() {
    'use strict';

    // State
    let selectedFiles = [];
    let newUploadedFiles = [];
    let isProcessing = false;
    let abortController = null;

    // DOM Elements
    const elements = {
        existingFilesList: null,
        selectedFilesSummary: null,
        selectedFilesCount: null,
        uploadZone: null,
        fileInput: null,
        llmProvider: null,
        startAnalysisBtn: null,
        stopAnalysisBtn: null,
        progressContainer: null,
        progressFill: null,
        progressStatus: null,
        progressPercent: null,
        statsGrid: null,
        statTotal: null,
        statSerious: null,
        statCertain: null,
        statProcessed: null,
        logContainer: null,
        resultsSection: null,
        resultsTable: null,
        reportContent: null,
        downloadExcelBtn: null,
        downloadMarkdownBtn: null,
        saveToReportBtn: null
    };

    /**
     * Initialize page
     */
    async function init() {
        console.log('[LineListing] Initializing page...');

        // Get DOM elements
        initElements();

        // Setup event listeners
        setupEventListeners();

        // Load existing files from P14
        loadExistingFiles();

        // Load previous results if any
        loadPreviousResults();

        // Setup tabs
        setupTabs();

        // Initialize chat modal if available
        initChatModal();

        log('info', 'Line Listing 분석 도구가 준비되었습니다.');
    }

    /**
     * Initialize DOM element references
     */
    function initElements() {
        elements.existingFilesList = document.getElementById('existingFilesList');
        elements.selectedFilesSummary = document.getElementById('selectedFilesSummary');
        elements.selectedFilesCount = document.getElementById('selectedFilesCount');
        elements.uploadZone = document.getElementById('uploadZone');
        elements.fileInput = document.getElementById('fileInput');
        elements.llmProvider = document.getElementById('llmProvider');
        elements.startAnalysisBtn = document.getElementById('startAnalysisBtn');
        elements.stopAnalysisBtn = document.getElementById('stopAnalysisBtn');
        elements.progressContainer = document.getElementById('progressContainer');
        elements.progressFill = document.getElementById('progressFill');
        elements.progressStatus = document.getElementById('progressStatus');
        elements.progressPercent = document.getElementById('progressPercent');
        elements.statsGrid = document.getElementById('statsGrid');
        elements.statTotal = document.getElementById('statTotal');
        elements.statSerious = document.getElementById('statSerious');
        elements.statCertain = document.getElementById('statCertain');
        elements.statProcessed = document.getElementById('statProcessed');
        elements.logContainer = document.getElementById('logContainer');
        elements.resultsSection = document.getElementById('resultsSection');
        elements.resultsTable = document.getElementById('resultsTable');
        elements.reportContent = document.getElementById('reportContent');
        elements.downloadExcelBtn = document.getElementById('downloadExcelBtn');
        elements.downloadMarkdownBtn = document.getElementById('downloadMarkdownBtn');
        elements.saveToReportBtn = document.getElementById('saveToReportBtn');
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Upload zone
        if (elements.uploadZone) {
            elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
            elements.uploadZone.addEventListener('dragover', handleDragOver);
            elements.uploadZone.addEventListener('dragleave', handleDragLeave);
            elements.uploadZone.addEventListener('drop', handleDrop);
        }

        // File input
        if (elements.fileInput) {
            elements.fileInput.addEventListener('change', handleFileSelect);
        }

        // Start/Stop buttons
        if (elements.startAnalysisBtn) {
            elements.startAnalysisBtn.addEventListener('click', startAnalysis);
        }
        if (elements.stopAnalysisBtn) {
            elements.stopAnalysisBtn.addEventListener('click', stopAnalysis);
        }

        // Download buttons
        if (elements.downloadExcelBtn) {
            elements.downloadExcelBtn.addEventListener('click', downloadExcel);
        }
        if (elements.downloadMarkdownBtn) {
            elements.downloadMarkdownBtn.addEventListener('click', downloadMarkdown);
        }
        if (elements.saveToReportBtn) {
            elements.saveToReportBtn.addEventListener('click', saveToReport);
        }
    }

    /**
     * Setup tab switching
     */
    function setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;

                // Update buttons
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    /**
     * Load existing files from localStorage (uploaded in P14)
     */
    function loadExistingFiles() {
        if (!window.extractLineListings) {
            log('warning', 'extractLineListings 모듈이 로드되지 않았습니다.');
            return;
        }

        const lineListingFiles = window.extractLineListings.getLineListingFilesFromStorage();

        if (lineListingFiles.length === 0) {
            elements.existingFilesList.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;">
                    <div class="empty-state-icon">📂</div>
                    <div class="empty-state-text">P14에서 업로드된 Line Listing 파일이 없습니다.<br>아래에서 새 파일을 업로드하세요.</div>
                </div>
            `;
            return;
        }

        // Render file cards
        let html = '';
        lineListingFiles.forEach((file, index) => {
            html += `
                <div class="file-card" data-index="${index}" data-filename="${file.name}" data-rawid="${file.rawId}">
                    <div class="file-card-header">
                        <input type="checkbox" class="file-checkbox" id="file_${index}">
                        <span class="file-card-badge">${file.rawId}</span>
                    </div>
                    <div class="file-card-title">${file.name}</div>
                    <div class="file-card-info">
                        ${file.hasMarkdown ? '✅ 마크다운 변환됨' : '📄 원본 파일'}
                    </div>
                </div>
            `;
        });
        elements.existingFilesList.innerHTML = html;

        // Add click handlers to file cards
        document.querySelectorAll('.file-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = card.querySelector('.file-checkbox');
                    checkbox.checked = !checkbox.checked;
                }
                card.classList.toggle('selected', card.querySelector('.file-checkbox').checked);
                updateSelectedFilesCount();
            });
        });

        log('info', `P14에서 ${lineListingFiles.length}개의 Line Listing 파일을 찾았습니다.`);
    }

    /**
     * Load previous analysis results if any
     */
    function loadPreviousResults() {
        const reportId = localStorage.getItem('current_report');
        if (!reportId || !window.extractLineListings) return;

        const loaded = window.extractLineListings.loadFromStorage(reportId);
        if (loaded && window.extractLineListings.processedData.length > 0) {
            log('info', `이전 분석 결과 ${window.extractLineListings.processedData.length}건을 불러왔습니다.`);
            showResults();
        }
    }

    /**
     * Handle drag over
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadZone.classList.add('dragover');
    }

    /**
     * Handle drag leave
     */
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadZone.classList.remove('dragover');
    }

    /**
     * Handle drop
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadZone.classList.remove('dragover');

        const files = e.dataTransfer.files;
        processNewFiles(files);
    }

    /**
     * Handle file select from input
     */
    function handleFileSelect(e) {
        const files = e.target.files;
        processNewFiles(files);
    }

    /**
     * Process newly uploaded files
     */
    async function processNewFiles(files) {
        for (const file of files) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!['xlsx', 'xls'].includes(ext)) {
                log('warning', `${file.name}: Excel 파일만 지원됩니다.`);
                continue;
            }

            try {
                const arrayBuffer = await file.arrayBuffer();
                newUploadedFiles.push({
                    name: file.name,
                    rawId: guessRawId(file.name),
                    arrayBuffer: arrayBuffer,
                    isNew: true
                });
                log('success', `${file.name} 추가됨`);
            } catch (err) {
                log('error', `${file.name} 읽기 실패: ${err.message}`);
            }
        }

        updateSelectedFilesCount();
    }

    /**
     * Guess RAW ID from filename
     */
    function guessRawId(filename) {
        const lower = filename.toLowerCase();
        if (lower.includes('raw12') || lower.includes('국외') || lower.includes('foreign')) return 'RAW12';
        if (lower.includes('raw13') || lower.includes('국내신속') || lower.includes('domestic')) return 'RAW13';
        if (lower.includes('raw14') || lower.includes('원시') || lower.includes('spontaneous')) return 'RAW14';
        if (lower.includes('raw15') || lower.includes('정기') || lower.includes('periodic')) return 'RAW15';
        return 'RAW14'; // Default
    }

    /**
     * Update selected files count and button state
     */
    function updateSelectedFilesCount() {
        const checkedBoxes = document.querySelectorAll('.file-checkbox:checked');
        const totalSelected = checkedBoxes.length + newUploadedFiles.length;

        if (elements.selectedFilesCount) {
            elements.selectedFilesCount.textContent = totalSelected;
        }

        if (elements.selectedFilesSummary) {
            elements.selectedFilesSummary.style.display = totalSelected > 0 ? 'block' : 'none';
        }

        if (elements.startAnalysisBtn) {
            elements.startAnalysisBtn.disabled = totalSelected === 0;
        }
    }

    /**
     * Start analysis
     */
    async function startAnalysis() {
        if (isProcessing) return;
        if (!window.extractLineListings) {
            log('error', 'extractLineListings 모듈이 로드되지 않았습니다.');
            return;
        }
        if (!window.multiLLMClient) {
            log('error', 'multiLLMClient가 로드되지 않았습니다.');
            return;
        }

        isProcessing = true;
        abortController = new AbortController();

        // Update UI
        elements.startAnalysisBtn.disabled = true;
        elements.stopAnalysisBtn.disabled = false;
        elements.progressContainer.style.display = 'block';
        elements.statsGrid.style.display = 'grid';

        log('info', '분석을 시작합니다...');

        try {
            // Collect selected files
            const filesToProcess = await collectFilesToProcess();
            if (filesToProcess.length === 0) {
                throw new Error('처리할 파일이 없습니다.');
            }

            log('info', `${filesToProcess.length}개 파일 처리 시작`);

            // Process each file
            let allAeData = [];
            let allCausData = [];

            for (const file of filesToProcess) {
                log('info', `파일 처리 중: ${file.name}`);

                let parsedData;
                if (file.arrayBuffer) {
                    // New uploaded file - parse Excel directly
                    parsedData = window.extractLineListings.parseExcelBuffer(file.arrayBuffer);
                } else if (file.markdownContent) {
                    // Existing file with markdown
                    parsedData = window.extractLineListings.parseMarkdownTable(file.markdownContent);
                }

                if (parsedData && parsedData.aeData) {
                    allAeData = allAeData.concat(parsedData.aeData);
                    if (parsedData.causData) {
                        allCausData = allCausData.concat(parsedData.causData);
                    }
                }
            }

            if (allAeData.length === 0) {
                throw new Error('이상사례 데이터를 찾을 수 없습니다.');
            }

            log('info', `총 ${allAeData.length}건의 이상사례 데이터 발견`);

            // Get selected provider (map dropdown values to multi-llm-client provider names)
            const providerMap = {
                'gemini': 'google',
                'claude': 'anthropic',
                'openai': 'openai'
            };
            const selectedProvider = elements.llmProvider.value || 'gemini';
            const provider = providerMap[selectedProvider] || 'google';

            // Analyze with LLM
            const result = await window.extractLineListings.analyzeWithLLM(
                allAeData,
                allCausData,
                {
                    provider: provider,
                    signal: abortController.signal
                },
                (progress) => updateProgress(progress)
            );

            if (result.success) {
                log('success', `분석 완료: ${result.processedCount}건 처리됨`);

                // Save to storage
                const reportId = localStorage.getItem('current_report');
                if (reportId) {
                    window.extractLineListings.saveToStorage(reportId);
                }

                // Show results
                showResults();
            } else {
                throw new Error(result.error || '분석 실패');
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                log('warning', '사용자에 의해 중단됨');
            } else {
                log('error', `분석 실패: ${err.message}`);
                console.error(err);
            }
        } finally {
            isProcessing = false;
            elements.startAnalysisBtn.disabled = false;
            elements.stopAnalysisBtn.disabled = true;
        }
    }

    /**
     * Collect files to process
     */
    async function collectFilesToProcess() {
        const files = [];

        // Get selected existing files
        const checkedCards = document.querySelectorAll('.file-card.selected');
        const lineListingFiles = window.extractLineListings.getLineListingFilesFromStorage();

        for (const card of checkedCards) {
            const index = parseInt(card.dataset.index);
            const file = lineListingFiles[index];
            if (file) {
                files.push(file);
            }
        }

        // Add new uploaded files
        files.push(...newUploadedFiles);

        return files;
    }

    /**
     * Stop analysis
     */
    function stopAnalysis() {
        if (abortController) {
            abortController.abort();
        }
        log('warning', '분석 중단 요청됨...');
    }

    /**
     * Update progress UI
     */
    function updateProgress(progress) {
        const percent = Math.round((progress.current / progress.total) * 100);

        if (elements.progressFill) {
            elements.progressFill.style.width = `${percent}%`;
        }
        if (elements.progressPercent) {
            elements.progressPercent.textContent = `${percent}%`;
        }
        if (elements.progressStatus) {
            elements.progressStatus.textContent = progress.status || `처리 중: ${progress.current}/${progress.total}`;
        }

        // Update stats
        if (window.extractLineListings) {
            const stats = window.extractLineListings.statistics;
            if (elements.statTotal) elements.statTotal.textContent = stats.total;
            if (elements.statSerious) elements.statSerious.textContent = stats.seriousYes;
            if (elements.statCertain) elements.statCertain.textContent = stats.certainProbable;
            if (elements.statProcessed) elements.statProcessed.textContent = stats.processed;
        }
    }

    /**
     * Show results
     */
    function showResults() {
        if (!window.extractLineListings) return;

        // Show results section
        elements.resultsSection.style.display = 'block';

        // Update statistics
        const stats = window.extractLineListings.statistics;
        if (elements.statTotal) elements.statTotal.textContent = stats.total;
        if (elements.statSerious) elements.statSerious.textContent = stats.seriousYes;
        if (elements.statCertain) elements.statCertain.textContent = stats.certainProbable;
        if (elements.statProcessed) elements.statProcessed.textContent = stats.processed;
        elements.statsGrid.style.display = 'grid';

        // Render table
        const tableHtml = window.extractLineListings.renderTable(
            window.extractLineListings.processedData,
            100 // Max rows to display
        );
        elements.resultsTable.innerHTML = tableHtml;

        // Update report preview
        const reportMd = window.extractLineListings.generateReportMarkdown();
        elements.reportContent.textContent = reportMd;

        // Enable download buttons
        elements.downloadExcelBtn.disabled = false;
        elements.downloadMarkdownBtn.disabled = false;
        elements.saveToReportBtn.disabled = false;

        // Scroll to results
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Download Excel (CS59_별첨3_일람표 형식)
     */
    function downloadExcel() {
        if (!window.extractLineListings) return;

        const filename = `CS59_별첨3_일람표.xlsx`;

        window.extractLineListings.downloadExcel(filename);
        log('success', `Excel 파일 다운로드: ${filename}`);
    }

    /**
     * Download Markdown
     */
    function downloadMarkdown() {
        if (!window.extractLineListings) return;

        const reportId = localStorage.getItem('current_report') || 'unknown';
        const filename = `LineListing_Report_${reportId}_${new Date().toISOString().slice(0,10)}.md`;

        window.extractLineListings.downloadMarkdown(filename);
        log('success', `Markdown 파일 다운로드: ${filename}`);
    }

    /**
     * Save to report (localStorage)
     */
    function saveToReport() {
        const reportId = localStorage.getItem('current_report');
        if (!reportId) {
            log('error', '저장할 보고서가 없습니다. (current_report 없음)');
            return;
        }

        if (!window.extractLineListings) return;

        window.extractLineListings.saveToStorage(reportId);
        log('success', `보고서 ${reportId}에 저장되었습니다.`);
    }

    /**
     * Initialize chat modal
     */
    function initChatModal() {
        // Initialize chat modal if available
        if (window.chatModal) {
            window.chatModal.init();

            // Set context provider for Line Listing
            if (window.extractLineListings) {
                window.chatModal.setContextProvider(() => {
                    return window.extractLineListings.buildChatContext();
                });
            }

            console.log('[LineListing] Chat modal initialized with context provider');
        }
    }

    /**
     * Log message to console and UI
     */
    function log(type, message) {
        const timestamp = new Date().toLocaleTimeString('ko-KR');
        const logClass = `log-${type}`;

        console.log(`[LineListing][${type.toUpperCase()}] ${message}`);

        if (elements.logContainer) {
            const entry = document.createElement('div');
            entry.className = `log-entry ${logClass}`;
            entry.textContent = `[${timestamp}] ${message}`;
            elements.logContainer.appendChild(entry);
            elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for debugging
    window.lineListingPage = {
        init,
        startAnalysis,
        stopAnalysis,
        log
    };

})();

// ============================================
// Navigation Functions (Global scope for onclick)
// ============================================

/**
 * Navigate to previous stage (P14 Unified Processing)
 */
function goToPreviousStage() {
    const reportId = getUrlParam('reportId') || localStorage.getItem('current_report') || '';
    if (typeof navigateTo === 'function') {
        navigateTo(`P14_UnifiedProcessing.html?reportId=${reportId}`);
    } else {
        window.location.href = `P14_UnifiedProcessing.html?reportId=${reportId}`;
    }
}

/**
 * Navigate to next stage (P15 Section Editor)
 */
function goToNextStage() {
    const reportId = getUrlParam('reportId') || localStorage.getItem('current_report') || '';
    if (typeof navigateTo === 'function') {
        navigateTo(`P15_SectionEditor.html?reportId=${reportId}`);
    } else {
        window.location.href = `P15_SectionEditor.html?reportId=${reportId}`;
    }
}

/**
 * Get URL parameter by name
 */
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}
