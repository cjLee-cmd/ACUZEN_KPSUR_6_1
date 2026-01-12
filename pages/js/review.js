/**
 * Review Page Script
 * pages/js/review.js
 *
 * P18_Review.html 인라인 스크립트 분리
 * Stage 4: 리뷰 기능
 */

(function() {
    'use strict';

    // PSUR 섹션 정의 (15개 섹션)
    const sections = [
        { id: '00', number: '00', name: '표지', status: 'pending', hasChanges: false },
        { id: '01', number: '01', name: '목차', status: 'pending', hasChanges: false },
        { id: '02', number: '02', name: '약어설명', status: 'pending', hasChanges: false },
        { id: '03', number: '03', name: '서론', status: 'pending', hasChanges: false },
        { id: '04', number: '04', name: '전세계판매허가현황', status: 'pending', hasChanges: false },
        { id: '05', number: '05', name: '안전성조치', status: 'pending', hasChanges: false },
        { id: '06', number: '06', name: '안전성정보참고정보변경', status: 'pending', hasChanges: false },
        { id: '07', number: '07', name: '환자노출', status: 'pending', hasChanges: false },
        { id: '08', number: '08', name: '개별증례병력', status: 'pending', hasChanges: false },
        { id: '09', number: '09', name: '시험', status: 'pending', hasChanges: false },
        { id: '10', number: '10', name: '기타정보', status: 'pending', hasChanges: false },
        { id: '11', number: '11', name: '종합적인안전성평가', status: 'pending', hasChanges: false },
        { id: '12', number: '12', name: '결론', status: 'pending', hasChanges: false },
        { id: '13', number: '13', name: '참고문헌', status: 'pending', hasChanges: false },
        { id: '14', number: '14', name: '별첨', status: 'pending', hasChanges: false }
    ];

    let currentSection = sections[0];
    let sectionContents = {};
    let changeHistory = [];
    let markdownFiles = [];
    let originalContent = '';
    let viewMode = 'split';
    let currentMdViewFileIndex = -1;

    // Review session manager (ReviewManager stub)
    const reviewManager = {
        getCurrentSession: () => null,
        endReviewSession: () => Promise.resolve({ success: true })
    };

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

    // 다크모드 초기화 (DOM 로드 전)
    (function() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    })();

    function toggleDarkMode() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // 마크다운을 HTML로 변환
    function convertMarkdownToHTML(markdown) {
        if (!markdown) return '';
        let html = markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/\n/gim, '<br>');
        return html;
    }

    // 전역 의존성 fallback
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
                return format.replace('YYYY', year).replace('MM', month).replace('DD', day);
            },
            formatISO: (date = new Date()) => date.toISOString(),
            now: () => new Date().toISOString()
        };
    }

    // 페이지 초기화
    function init() {
        const Storage = window.Storage;
        const reportId = new URLSearchParams(window.location.search).get('reportId');

        // localStorage에서 섹션 내용 로드
        const generatedSections = Storage.get('generatedSections') || {};

        // 변환된 마크다운 파일 로드
        markdownFiles = Storage.get('convertedMarkdowns') || [];

        // 섹션 내용 매핑
        sections.forEach(section => {
            const sectionData = generatedSections[section.id];
            if (sectionData) {
                sectionContents[section.id] = {
                    markdown: sectionData.content || sectionData.markdown || '',
                    html: convertMarkdownToHTML(sectionData.content || sectionData.markdown || '')
                };
                section.status = sectionData.status || 'generated';
            }
        });

        const layout = new AppLayout({
            currentStage: 7,
            reportName: 'testPill_1'
        });

        renderPage(layout, reportId);
    }

    // 페이지 렌더링
    function renderPage(layout, reportId) {
        const content = `
            <div class="app-content">
            <main class="main-content">
            <div class="review-container">
                <div class="review-header">
                    <div class="review-header-left">
                        <h3 class="review-title">📝 리뷰</h3>
                        <span class="review-badge">Stage 7</span>
                    </div>
                    <div class="review-header-right">
                        <div class="review-stats">
                            <span class="stat-item">
                                <span class="stat-label">검토 완료:</span>
                                <span class="stat-value" id="reviewedCount">0</span>
                                <span class="stat-unit">/ 15</span>
                            </span>
                            <span class="stat-item">
                                <span class="stat-label">변경:</span>
                                <span class="stat-value" id="changeCount">0</span>
                            </span>
                        </div>
                        <div class="view-mode-buttons">
                            <button class="view-mode-btn active" onclick="ReviewPage.setViewMode('split')">분할</button>
                            <button class="view-mode-btn" onclick="ReviewPage.setViewMode('single')">단일</button>
                        </div>
                    </div>
                </div>

                <div class="review-main-grid">
                    <!-- Section Navigation -->
                    <div class="section-nav-panel">
                        <div class="section-nav-header">
                            <h4>섹션 목록</h4>
                            <button class="btn-icon" onclick="ReviewPage.showChangeHistory()" title="변경 이력">📋</button>
                        </div>
                        <div class="section-nav-list" id="sectionNavList"></div>

                        <!-- Markdown Files Mini Panel -->
                        <div class="markdown-files-panel" style="margin-top: 16px; padding: 12px; background: var(--glass-bg); border-radius: var(--radius-lg); border: 1px solid var(--glass-border);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">📄 변환된 파일</span>
                                <span class="badge" id="markdownFilesCount" style="font-size: 10px;">0</span>
                            </div>
                            <div id="markdownFilesList" style="max-height: 150px; overflow-y: auto;"></div>
                            <button class="btn btn-sm btn-secondary" onclick="ReviewPage.openMdViewModal()" style="width: 100%; margin-top: 8px; font-size: 11px;">
                                📑 전체 보기
                            </button>
                        </div>
                    </div>

                    <!-- Review Content -->
                    <div class="review-content" id="reviewContent">
                        <!-- Markdown Source -->
                        <div class="markdown-column" id="markdownColumn">
                            <div class="column-header">
                                <span class="column-title">📄 마크다운 소스</span>
                                <button class="btn-icon" onclick="ReviewPage.copyMarkdown()" title="복사">📋</button>
                            </div>
                            <pre class="markdown-viewer" id="markdownViewer"></pre>
                        </div>

                        <!-- Document Editor -->
                        <div class="editor-column">
                            <div class="column-header">
                                <span class="column-title">✏️ 편집</span>
                                <div class="editor-toolbar">
                                    <button class="toolbar-btn" onclick="ReviewPage.toggleEdit()" id="editToggle">
                                        <span id="editToggleIcon">🔒</span>
                                        <span id="editToggleText">편집 잠금</span>
                                    </button>
                                    <button class="toolbar-btn" onclick="ReviewPage.saveSection()">💾 저장</button>
                                    <button class="toolbar-btn" onclick="ReviewPage.resetSection()">↩️ 초기화</button>
                                </div>
                            </div>
                            <div class="document-editor" id="documentEditor" contenteditable="false" oninput="ReviewPage.trackChange()"></div>
                        </div>
                    </div>
                </div>

                <div class="review-footer">
                    <div class="footer-info">
                        현재 섹션: <strong id="currentSectionName">-</strong>
                        <span class="change-count" id="sectionChangeCount">변경사항 없음</span>
                    </div>
                    <div class="footer-actions">
                        <button class="btn btn-secondary" onclick="ReviewPage.previousSection()">← 이전</button>
                        <button class="btn btn-primary" onclick="ReviewPage.saveAndNext()">저장 및 다음 →</button>
                        <button class="btn btn-secondary" onclick="ReviewPage.mergeAll()">🔗 모두 병합</button>
                        <button class="btn btn-success" onclick="ReviewPage.showExportModal()">📤 내보내기</button>
                        <button class="btn btn-success" onclick="ReviewPage.proceedToQC()">QC 단계로 →</button>
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
        const header = appElement.querySelector('.app-header');
        if (header) {
            header.insertAdjacentHTML('afterend', layout.render(content));
        } else {
            appElement.innerHTML = layout.render(content);
        }

        renderSectionNav();
        renderMarkdownFilesList();
        selectSection(sections[0]);
        updateStats();

        // DB에서 섹션 로드 (비동기)
        if (reportId) {
            loadSectionsFromDB();
        }
    }

    // DB에서 섹션 로드
    async function loadSectionsFromDB() {
        // TODO: Supabase에서 섹션 로드 구현
        console.log('Loading sections from DB...');
    }

    // DB에 섹션 저장
    async function saveSectionToDB(sectionNumber, content, name) {
        // TODO: Supabase에 섹션 저장 구현
        console.log('Saving section to DB:', sectionNumber, name);
    }

    // 섹션 네비게이션 렌더링
    function renderSectionNav() {
        const navHtml = sections.map(section => `
            <div class="section-nav-item ${currentSection.id === section.id ? 'active' : ''} ${section.status}"
                 onclick="ReviewPage.selectSection(sections.find(s => s.id === '${section.id}'))">
                <div class="section-nav-number">${section.number}</div>
                <div class="section-nav-name">${section.name}</div>
                <div class="section-nav-status">
                    <span class="status-badge ${section.status}">
                        ${section.status === 'reviewed' ? '✓' : section.status === 'edited' ? '✏️' : '○'}
                    </span>
                </div>
            </div>
        `).join('');

        document.getElementById('sectionNavList').innerHTML = navHtml;
    }

    // 마크다운 파일 목록 렌더링
    function renderMarkdownFilesList() {
        const listContainer = document.getElementById('markdownFilesList');
        const countElement = document.getElementById('markdownFilesCount');

        if (!listContainer) return;

        if (markdownFiles.length === 0) {
            listContainer.innerHTML = `
                <p style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 12px;">
                    변환된 파일이 없습니다
                </p>
            `;
            countElement.textContent = '0';
            return;
        }

        const getFileIcon = (filename) => {
            const ext = filename.split('.').pop().toLowerCase();
            if (ext === 'pdf') return '📄';
            if (ext === 'xlsx' || ext === 'xls') return '📊';
            if (ext === 'docx' || ext === 'doc') return '📝';
            return '📁';
        };

        const filesHtml = markdownFiles.map((file, index) => `
            <div class="markdown-file-item" onclick="ReviewPage.showMarkdownPopup(${index})" title="${file.name}">
                <span class="markdown-file-icon">${getFileIcon(file.name)}</span>
                <span class="markdown-file-name">${file.name}</span>
                ${file.rawId ? `<span class="markdown-file-rawid">${file.rawId}</span>` : ''}
            </div>
        `).join('');

        listContainer.innerHTML = filesHtml;
        countElement.textContent = markdownFiles.length;
    }

    // 마크다운 팝업 표시
    function showMarkdownPopup(fileIndex) {
        const file = markdownFiles[fileIndex];
        if (!file) return;

        const overlay = document.getElementById('markdownPopupOverlay');
        const fileNameEl = document.getElementById('markdownPopupFileName');
        const contentEl = document.getElementById('markdownPopupContent');

        if (overlay && fileNameEl && contentEl) {
            fileNameEl.textContent = file.name;
            contentEl.textContent = file.markdown || file.content || '마크다운 내용이 없습니다.';
            overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    // 마크다운 팝업 닫기
    function closeMarkdownPopup(event) {
        if (event && event.target !== event.currentTarget) {
            return;
        }

        const overlay = document.getElementById('markdownPopupOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // 팝업 마크다운 복사
    function copyPopupMarkdown() {
        const content = document.getElementById('markdownPopupContent')?.textContent;
        if (content) {
            navigator.clipboard.writeText(content).then(() => {
                showToast('마크다운이 복사되었습니다', 'success');
            }).catch(() => {
                showToast('복사에 실패했습니다', 'error');
            });
        }
    }

    // MD View 모달 열기
    function openMdViewModal() {
        const modal = document.getElementById('mdViewModal');
        if (modal) {
            renderMdViewFileList();
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    // MD View 모달 닫기
    function closeMdViewModal(event) {
        if (event && event.target !== event.currentTarget) {
            return;
        }
        const modal = document.getElementById('mdViewModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
        currentMdViewFileIndex = -1;
    }

    // MD View 파일 목록 렌더링
    function renderMdViewFileList() {
        const listContainer = document.getElementById('mdViewFileList');
        const countElement = document.getElementById('mdViewFileCount');

        if (!listContainer) return;

        if (countElement) countElement.textContent = markdownFiles.length;

        if (markdownFiles.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                    <div style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;">📭</div>
                    <div>변환된 마크다운 파일이 없습니다</div>
                </div>
            `;
            return;
        }

        const getFileIcon = (filename) => {
            const ext = filename.split('.').pop().toLowerCase();
            if (ext === 'pdf') return '📕';
            if (ext === 'xlsx' || ext === 'xls') return '📗';
            if (ext === 'docx' || ext === 'doc') return '📘';
            return '📄';
        };

        const getFileSize = (markdown) => {
            const bytes = new Blob([markdown || '']).size;
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        };

        const filesHtml = markdownFiles.map((file, index) => `
            <div class="md-view-file-item ${currentMdViewFileIndex === index ? 'active' : ''}"
                 onclick="ReviewPage.selectMdViewFile(${index})"
                 title="${file.name}">
                <span class="md-view-file-icon">${getFileIcon(file.name)}</span>
                <div class="md-view-file-info">
                    <div class="md-view-file-name">${file.name}</div>
                    <div class="md-view-file-meta">
                        <span>${getFileSize(file.markdown || '')}</span>
                        ${file.rawId ? `<span class="md-view-file-rawid">${file.rawId}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        listContainer.innerHTML = filesHtml;
    }

    // MD View 파일 선택
    function selectMdViewFile(index) {
        currentMdViewFileIndex = index;
        const file = markdownFiles[index];

        if (!file) return;

        renderMdViewFileList();

        const contentTitle = document.getElementById('mdViewContentTitle');
        const markdownContainer = document.getElementById('mdViewMarkdown');
        const copyBtn = document.getElementById('mdViewCopyBtn');
        const downloadBtn = document.getElementById('mdViewDownloadBtn');

        const ext = file.name.split('.').pop().toLowerCase();
        let icon = '📄';
        if (ext === 'pdf') icon = '📕';
        else if (ext === 'xlsx' || ext === 'xls') icon = '📗';
        else if (ext === 'docx' || ext === 'doc') icon = '📘';

        if (contentTitle) {
            contentTitle.innerHTML = `<span>${icon}</span><span>${file.name}</span>`;
        }

        if (markdownContainer) {
            if (file.markdown && file.markdown.trim()) {
                markdownContainer.className = 'md-view-markdown md-rendered';
                markdownContainer.innerHTML = convertMarkdownToHTML(file.markdown);
                if (copyBtn) copyBtn.style.display = 'inline-flex';
                if (downloadBtn) downloadBtn.style.display = 'inline-flex';
            } else {
                markdownContainer.className = 'md-view-empty';
                markdownContainer.innerHTML = `
                    <div class="md-view-empty-icon">⚠️</div>
                    <div>마크다운 내용이 비어 있습니다</div>
                `;
                if (copyBtn) copyBtn.style.display = 'none';
                if (downloadBtn) downloadBtn.style.display = 'none';
            }
        }
    }

    // MD View 내용 복사
    function copyMdViewContent() {
        const content = document.getElementById('mdViewMarkdown')?.textContent;
        if (content) {
            navigator.clipboard.writeText(content).then(() => {
                showToast('마크다운이 클립보드에 복사되었습니다', 'success');
            }).catch(() => {
                showToast('복사에 실패했습니다', 'error');
            });
        }
    }

    // MD View 내용 다운로드
    function downloadMdViewContent() {
        if (currentMdViewFileIndex < 0) return;

        const file = markdownFiles[currentMdViewFileIndex];
        if (!file) return;

        const content = file.markdown || '';
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace(/\.[^.]+$/, '.md');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('마크다운 파일이 다운로드되었습니다', 'success');
    }

    // ESC 키로 팝업 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const mdViewModal = document.getElementById('mdViewModal');
            if (mdViewModal && mdViewModal.classList.contains('show')) {
                closeMdViewModal();
                return;
            }
            const overlay = document.getElementById('markdownPopupOverlay');
            if (overlay && overlay.classList.contains('show')) {
                closeMarkdownPopup();
            }
        }
    });

    // 섹션 선택
    function selectSection(section) {
        if (currentSection.hasChanges) {
            if (!confirm('현재 섹션의 변경사항을 저장하지 않았습니다. 계속하시겠습니까?')) {
                return;
            }
        }

        currentSection = section;
        loadSectionContent();
        renderSectionNav();
        updateStats();
    }

    // 섹션 내용 로드
    function loadSectionContent() {
        const content = sectionContents[currentSection.id] || {
            markdown: `# ${currentSection.number}. ${currentSection.name}\n\n내용이 준비 중입니다...`,
            html: `<h1>${currentSection.number}. ${currentSection.name}</h1><p>내용이 준비 중입니다...</p>`
        };

        const markdownViewer = document.getElementById('markdownViewer');
        const documentEditor = document.getElementById('documentEditor');
        const currentSectionName = document.getElementById('currentSectionName');
        const sectionChangeCount = document.getElementById('sectionChangeCount');

        if (markdownViewer) markdownViewer.textContent = content.markdown;
        if (documentEditor) documentEditor.innerHTML = content.html;
        if (currentSectionName) currentSectionName.textContent = `${currentSection.number}. ${currentSection.name}`;
        if (sectionChangeCount) {
            sectionChangeCount.textContent = '변경사항 없음';
            sectionChangeCount.style.display = 'none';
        }

        originalContent = content.html;
        currentSection.hasChanges = false;
    }

    // 변경 추적
    function trackChange() {
        const currentContent = document.getElementById('documentEditor')?.innerHTML;
        if (currentContent !== originalContent) {
            currentSection.hasChanges = true;
            currentSection.status = 'edited';
            const changeCount = document.getElementById('sectionChangeCount');
            if (changeCount) {
                changeCount.textContent = '수정됨';
                changeCount.style.display = 'inline-block';
            }
            renderSectionNav();
        }
    }

    // 섹션 저장
    function saveSection() {
        const editedContent = document.getElementById('documentEditor')?.innerHTML;

        if (!currentSection.hasChanges) {
            showToast('변경사항이 없습니다', 'info');
            return;
        }

        const change = {
            id: changeHistory.length + 1,
            timestamp: new Date().toISOString(),
            section: `${currentSection.number}. ${currentSection.name}`,
            editor: '홍길동',
            before: originalContent,
            after: editedContent
        };

        changeHistory.push(change);

        currentSection.status = 'reviewed';
        currentSection.hasChanges = false;
        originalContent = editedContent;

        const changeCount = document.getElementById('sectionChangeCount');
        if (changeCount) {
            changeCount.textContent = '저장됨';
            changeCount.style.display = 'none';
        }

        renderSectionNav();
        updateStats();
        showToast('섹션이 저장되었습니다', 'success');

        saveSectionToDB(currentSection.number, editedContent, currentSection.name);
    }

    // 섹션 초기화
    function resetSection() {
        if (!confirm('현재 섹션을 원본으로 복원하시겠습니까? 변경사항이 모두 손실됩니다.')) {
            return;
        }

        loadSectionContent();
        currentSection.status = 'pending';
        currentSection.hasChanges = false;
        renderSectionNav();
        showToast('원본으로 복원되었습니다', 'info');
    }

    // 보기 모드 설정
    function setViewMode(mode) {
        viewMode = mode;

        const reviewContent = document.getElementById('reviewContent');
        const markdownColumn = document.getElementById('markdownColumn');

        document.querySelectorAll('.view-mode-btn').forEach(btn => btn.classList.remove('active'));
        if (event && event.target) {
            event.target.classList.add('active');
        }

        if (mode === 'single') {
            if (reviewContent) reviewContent.classList.add('single-view');
            if (markdownColumn) markdownColumn.style.display = 'none';
        } else {
            if (reviewContent) reviewContent.classList.remove('single-view');
            if (markdownColumn) markdownColumn.style.display = 'flex';
        }
    }

    // 편집 모드 토글
    function toggleEdit() {
        const editor = document.getElementById('documentEditor');
        if (!editor) return;

        const isEditable = editor.contentEditable === 'true';

        editor.contentEditable = !isEditable;
        const editToggleIcon = document.getElementById('editToggleIcon');
        const editToggleText = document.getElementById('editToggleText');

        if (editToggleIcon) editToggleIcon.textContent = isEditable ? '🔒' : '🔓';
        if (editToggleText) editToggleText.textContent = isEditable ? '편집 잠금' : '편집 중';

        editor.style.cursor = isEditable ? 'default' : 'text';
    }

    // 이전 섹션
    function previousSection() {
        const currentIndex = sections.findIndex(s => s.id === currentSection.id);
        if (currentIndex > 0) {
            selectSection(sections[currentIndex - 1]);
        }
    }

    // 저장 후 다음
    function saveAndNext() {
        saveSection();

        const currentIndex = sections.findIndex(s => s.id === currentSection.id);
        if (currentIndex < sections.length - 1) {
            selectSection(sections[currentIndex + 1]);
        }
    }

    // 마크다운 복사
    function copyMarkdown() {
        const markdown = document.getElementById('markdownViewer')?.textContent;
        if (markdown) {
            navigator.clipboard.writeText(markdown).then(() => {
                showToast('마크다운이 복사되었습니다', 'success');
            });
        }
    }

    // 변경 이력 표시
    function showChangeHistory() {
        renderChangeHistory();
        const panel = document.getElementById('changeHistoryPanel');
        if (panel) panel.classList.add('show');
    }

    // 변경 이력 닫기
    function closeChangeHistory() {
        const panel = document.getElementById('changeHistoryPanel');
        if (panel) panel.classList.remove('show');
    }

    // 변경 이력 렌더링
    function renderChangeHistory() {
        const listEl = document.getElementById('changeHistoryList');
        if (!listEl) return;

        if (changeHistory.length === 0) {
            listEl.innerHTML = `
                <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 40px;">
                    변경 이력이 없습니다
                </p>
            `;
            return;
        }

        const historyHtml = changeHistory.slice().reverse().map(change => `
            <div class="change-item">
                <div class="change-meta">
                    ${new Date(change.timestamp).toLocaleString('ko-KR')} | ${change.editor} | ${change.section}
                </div>
                <div class="change-before">이전: ${change.before.substring(0, 100)}...</div>
                <div class="change-after">이후: ${change.after.substring(0, 100)}...</div>
            </div>
        `).join('');

        listEl.innerHTML = historyHtml;
    }

    // 모두 병합
    function mergeAll() {
        showLLMLoading('모든 섹션을 병합하고 있습니다...');

        setTimeout(() => {
            hideLLMLoading();
            showToast('모든 섹션이 병합되었습니다', 'success');
        }, 2000);
    }

    // 내보내기 모달 표시
    function showExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) modal.classList.add('show');
    }

    // 내보내기 모달 닫기
    function closeExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) modal.classList.remove('show');
    }

    // 내보내기 확인
    function confirmExport() {
        const merge = document.getElementById('exportMerge')?.checked;
        const draft = document.getElementById('exportDraft')?.checked;
        const formatEl = document.querySelector('input[name="exportFormat"]:checked');
        const format = formatEl ? formatEl.value : 'docx';

        const fileName = `testPill_1${draft ? '_Draft' : ''}.${format}`;

        showLLMLoading(`문서를 ${format.toUpperCase()} 형식으로 내보내는 중...`);

        setTimeout(() => {
            hideLLMLoading();
            closeExportModal();
            showToast(`${fileName} 파일이 생성되었습니다`, 'success');
        }, 2000);
    }

    // QC 단계로 이동
    async function proceedToQC() {
        const allReviewed = sections.every(s => s.status === 'reviewed');

        if (!allReviewed) {
            const pendingCount = sections.filter(s => s.status !== 'reviewed').length;
            if (!confirm(`${pendingCount}개 섹션이 아직 검토되지 않았습니다. QC 단계로 진행하시겠습니까?`)) {
                return;
            }
        }

        // End review session
        if (reviewManager.getCurrentSession()) {
            const result = await reviewManager.endReviewSession();
            if (result.success) {
                console.log('Review session ended successfully');
            }
        }

        // Save reviewed sections to localStorage
        const reviewedSections = {};
        const DateHelper = window.DateHelper;
        const Storage = window.Storage;

        sections.forEach(section => {
            const content = sectionContents[section.id];
            if (content) {
                reviewedSections[section.id] = {
                    ...content,
                    status: section.status,
                    reviewedAt: DateHelper.formatISO()
                };
            }
        });

        Storage.set('reviewedSections', reviewedSections);
        Storage.set('reviewChangeHistory', changeHistory);

        const reportId = new URLSearchParams(window.location.search).get('reportId') || Date.now().toString();

        if (typeof navigateTo === 'function') {
            navigateTo(`P19_QC.html?reportId=${reportId}`);
        } else {
            window.location.href = `P19_QC.html?reportId=${reportId}`;
        }
    }

    // 통계 업데이트
    function updateStats() {
        const reviewedCount = sections.filter(s => s.status === 'reviewed').length;
        const reviewedEl = document.getElementById('reviewedCount');
        const changeEl = document.getElementById('changeCount');

        if (reviewedEl) reviewedEl.textContent = reviewedCount;
        if (changeEl) changeEl.textContent = changeHistory.length;
    }

    // Toast 표시
    function showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // LLM 로딩 표시
    function showLLMLoading(text) {
        if (typeof window.showLLMLoading === 'function') {
            window.showLLMLoading(text);
        } else {
            console.log('Loading:', text);
        }
    }

    // LLM 로딩 숨기기
    function hideLLMLoading() {
        if (typeof window.hideLLMLoading === 'function') {
            window.hideLLMLoading();
        }
    }

    // 페이지 로드 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 전역 함수 노출
    window.ReviewPage = {
        init,
        selectSection: function(section) { selectSection(section); },
        saveSection,
        resetSection,
        setViewMode,
        toggleEdit,
        previousSection,
        saveAndNext,
        copyMarkdown,
        showChangeHistory,
        closeChangeHistory,
        mergeAll,
        showExportModal,
        closeExportModal,
        confirmExport,
        proceedToQC,
        toggleDarkMode,
        showMarkdownPopup,
        closeMarkdownPopup,
        copyPopupMarkdown,
        openMdViewModal,
        closeMdViewModal,
        selectMdViewFile,
        copyMdViewContent,
        downloadMdViewContent,
        trackChange
    };

    // sections를 전역으로 노출 (selectSection에서 참조)
    window.sections = sections;

    // 기존 HTML 호환용 전역 함수
    window.selectSection = function(section) { selectSection(section); };
    window.saveSection = saveSection;
    window.resetSection = resetSection;
    window.setViewMode = setViewMode;
    window.toggleEdit = toggleEdit;
    window.previousSection = previousSection;
    window.saveAndNext = saveAndNext;
    window.copyMarkdown = copyMarkdown;
    window.showChangeHistory = showChangeHistory;
    window.closeChangeHistory = closeChangeHistory;
    window.mergeAll = mergeAll;
    window.showExportModal = showExportModal;
    window.closeExportModal = closeExportModal;
    window.confirmExport = confirmExport;
    window.proceedToQC = proceedToQC;
    window.toggleDarkMode = toggleDarkMode;

})();
