/**
 * Section Editor Page Script
 * pages/js/section-editor.js
 *
 * P15_SectionEditor.html 인라인 스크립트 분리
 * Stage 3: PSUR 섹션 편집 기능
 */

(function() {
    'use strict';

    // 전역 변수
    let editor = null;
    let currentSectionId = null;
    let isEdited = false;

    // 보고서 ID 가져오기 함수 (전역)
    function getReportId() {
        const urlParams = new URLSearchParams(window.location.search);
        let reportId = urlParams.get('reportId') || urlParams.get('id');

        if (!reportId) {
            const report = localStorage.getItem('currentReport');
            if (report) {
                try { reportId = JSON.parse(report).id; } catch(e) {}
            }
        }
        return reportId;
    }

    // 초기화
    async function initializePage() {
        initDarkMode();
        initEditor();
        renderSectionList();
        updateSummary();

        // 보고서 ID가 있으면 Stage 업데이트
        const reportId = getReportId();
        if (reportId) {
            await updateCurrentStage(reportId, 3);
        }

        // 채팅 모달 초기화
        if (window.chatModal) {
            window.chatModal.init();

            // 보고서 ID가 있으면 세션 초기화
            if (reportId && window.llmSessionManager) {
                try {
                    console.log('[P15] Initializing LLM Session for reportId:', reportId);
                    await window.llmSessionManager.initSession(reportId);

                    // 세션 정보 확인
                    const sessionInfo = window.llmSessionManager.getSessionInfo();
                    console.log('[P15] LLM Session initialized:', sessionInfo);
                    console.log('[P15] Session messages count:', window.llmSessionManager.messages.length);
                } catch (error) {
                    console.warn('[P15] LLM Session init failed:', error);
                }
            }
        }

        // 편집 이벤트 리스너
        const editableContent = document.getElementById('editableContent');
        if (editableContent) {
            editableContent.addEventListener('input', function() {
                isEdited = true;
                const editStatus = document.getElementById('editStatus');
                if (editStatus) {
                    editStatus.textContent = '수정됨 (저장 필요)';
                    editStatus.style.color = '#F59E0B';
                }
            });
        }
    }

    // 다크모드
    function initDarkMode() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }

    function toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // Editor 초기화
    function initEditor() {
        if (!window.SectionEditor) {
            console.warn('[P15] SectionEditor class not found');
            return;
        }

        editor = new window.SectionEditor();
        const loaded = editor.loadSections();

        if (!loaded) {
            showToast('생성된 섹션이 없습니다. 통합 처리를 먼저 실행하세요.', 'warning');
        }
    }

    // 섹션 목록 렌더링
    function renderSectionList() {
        const sectionList = document.getElementById('sectionList');
        if (!sectionList || !editor) return;

        const definitions = editor.getSectionDefinitions();

        sectionList.innerHTML = definitions.map(def => {
            const section = editor.getSection(def.id);
            const status = editor.getSectionStatus(def.id);
            const statusIcon = status === 'edited' ? '✏️' :
                               status === 'generated' ? '✓' : '○';

            // Check if section is incomplete (missing required data)
            const isIncomplete = section?.content?.includes('필요한 소스 파일이 업로드되지 않았습니다') ||
                                 section?.content?.includes('[이 섹션은 생성되지 않았습니다]');
            const badge = isIncomplete ? '<span class="badge badge-warning" style="margin-left: 8px; font-size: 0.7rem;">데이터 부족</span>' : '';

            return `
                <div class="section-item ${currentSectionId === def.id ? 'active' : ''} ${isIncomplete ? 'incomplete' : ''}"
                     onclick="SectionEditorPage.selectSection('${def.id}')">
                    <div class="section-status ${status}">${statusIcon}</div>
                    <div class="section-info">
                        <div class="section-id">${def.id}</div>
                        <div class="section-name">${def.name}${badge}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 섹션 선택
    function selectSection(sectionId) {
        // 저장 안 된 변경사항 확인
        if (isEdited && currentSectionId) {
            if (!confirm('저장되지 않은 변경사항이 있습니다. 계속하시겠습니까?')) {
                return;
            }
        }

        currentSectionId = sectionId;
        editor.setCurrentSection(sectionId);
        isEdited = false;

        // UI 업데이트
        renderSectionList();
        loadSectionContent();

        // 패널 표시
        const emptyState = document.getElementById('emptyState');
        const sourcePanel = document.getElementById('sourcePanel');
        const editorPanel = document.getElementById('editorPanel');

        if (emptyState) emptyState.style.display = 'none';
        if (sourcePanel) sourcePanel.style.display = 'flex';
        if (editorPanel) editorPanel.style.display = 'flex';
    }

    // 섹션 내용 로드
    function loadSectionContent() {
        if (!editor) return;

        const section = editor.getCurrentSection();
        if (!section) return;

        // 타이틀 업데이트
        const editorTitle = document.getElementById('editorTitle');
        if (editorTitle) {
            editorTitle.textContent = `${section.id}. ${section.name}`;
        }

        // 마크다운 소스
        const markdownSource = document.getElementById('markdownSource');
        if (markdownSource) {
            markdownSource.textContent = section.content || '';
        }

        // 편집 가능 영역 (HTML 변환)
        const editableContent = document.getElementById('editableContent');
        if (editableContent) {
            const html = editor.markdownToHtml(section.content);
            editableContent.innerHTML = html;
        }

        // 편집 상태 초기화
        const editStatus = document.getElementById('editStatus');
        if (editStatus) {
            editStatus.textContent = '저장됨';
            editStatus.style.color = '#64748B';
        }

        // 채팅 모달에 현재 섹션 컨텍스트 전달
        if (window.chatModal) {
            const contextText = `[섹션 ${section.id}. ${section.name}]\n\n${section.content || ''}`;
            window.chatModal.setContext(contextText);
        }

        // Section 02 (약어설명)일 때 모델 확인 및 변경
        if (section.id === '02' && window.llmSessionManager && window.llmSessionManager.currentSession) {
            // 현재 모델이 Gemini가 아니면 사용자에게 알림
            const currentModel = window.llmSessionManager.currentSession.modelName;
            if (!currentModel.startsWith('gemini')) {
                console.log('[P15] Section 02: Current model is', currentModel);
                console.log('[P15] Note: Gemini 3-Flash is recommended for this section');
            }

            // 세션 정보 업데이트 (대화 히스토리 유지)
            if (window.chatModal) {
                window.chatModal.updateSessionInfo();
            }
        }
    }

    // 섹션 저장
    function saveSection() {
        if (!currentSectionId || !editor) {
            showToast('저장할 섹션이 선택되지 않았습니다', 'error');
            return;
        }

        const editableContent = document.getElementById('editableContent');
        if (!editableContent) return;

        const html = editableContent.innerHTML;
        const markdown = editor.htmlToMarkdown(html);

        editor.updateSection(currentSectionId, markdown);
        editor.saveSection(currentSectionId);

        isEdited = false;
        const editStatus = document.getElementById('editStatus');
        if (editStatus) {
            editStatus.textContent = '저장됨';
            editStatus.style.color = 'var(--success)';
        }

        // 마크다운 소스 업데이트
        const markdownSource = document.getElementById('markdownSource');
        if (markdownSource) {
            markdownSource.textContent = markdown;
        }

        renderSectionList();
        updateSummary();
        showToast('섹션이 저장되었습니다', 'success');
    }

    // 섹션 초기화
    function resetSection() {
        if (!currentSectionId || !editor) return;

        if (!confirm('이 섹션을 원본으로 초기화하시겠습니까?')) {
            return;
        }

        editor.resetSection(currentSectionId);
        loadSectionContent();
        isEdited = false;
        renderSectionList();
        showToast('섹션이 초기화되었습니다', 'info');
    }

    // 마크다운 소스 복사
    function copySource() {
        const markdownSource = document.getElementById('markdownSource');
        if (!markdownSource) return;

        const source = markdownSource.textContent;
        navigator.clipboard.writeText(source).then(() => {
            showToast('클립보드에 복사되었습니다', 'success');
        });
    }

    // 요약 업데이트
    function updateSummary() {
        if (!editor) return;

        const summary = editor.getSummary();

        const summaryBadge = document.getElementById('summaryBadge');
        if (summaryBadge) {
            summaryBadge.innerHTML = `
                <span class="badge badge-success">${summary.generated} 완료</span>
                <span class="badge badge-warning">${summary.edited} 수정</span>
            `;
        }

        const footerInfo = document.getElementById('footerInfo');
        if (footerInfo) {
            footerInfo.textContent = `15개 섹션 중 ${summary.generated}개 완료`;
        }
    }

    // 전체 병합
    function mergeAll() {
        if (!editor) return;

        if (isEdited) {
            if (!confirm('저장되지 않은 변경사항이 있습니다. 먼저 저장하시겠습니까?')) {
                return;
            }
            saveSection();
        }

        const merged = editor.mergeAllSections();
        showToast('전체 보고서가 병합되었습니다', 'success');

        // 다운로드 옵션
        if (confirm('병합된 보고서를 다운로드하시겠습니까?')) {
            downloadMerged(merged);
        }
    }

    // 병합 결과 다운로드
    function downloadMerged(content) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '').substring(0, 15);
        const filename = `PSUR_Merged_${timestamp}.md`;

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        showToast(`${filename} 다운로드됨`, 'success');
    }

    // Word 내보내기
    async function exportWord() {
        if (!editor) return;

        if (isEdited) {
            if (!confirm('저장되지 않은 변경사항이 있습니다. 먼저 저장하시겠습니까?')) {
                return;
            }
            saveSection();
        }

        const success = await editor.exportToWord();
        if (success) {
            showToast('파일이 다운로드되었습니다', 'success');
        } else {
            showToast('내보내기 실패', 'error');
        }
    }

    // Toast 표시
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // 이전 Stage로 이동 (reportId 유지)
    function goToPreviousStage() {
        const reportId = getReportId();
        if (typeof navigateTo === 'function') {
            if (reportId) {
                navigateTo(`P14_UnifiedProcessing.html?reportId=${reportId}`);
            } else {
                navigateTo('P14_UnifiedProcessing.html');
            }
        } else {
            if (reportId) {
                window.location.href = `P14_UnifiedProcessing.html?reportId=${reportId}`;
            } else {
                window.location.href = 'P14_UnifiedProcessing.html';
            }
        }
    }

    // 현재 Stage 업데이트 (DB)
    async function updateCurrentStage(reportId, stage) {
        if (!reportId || reportId.startsWith('local_')) return;
        if (!window.supabaseClient) return;

        try {
            const result = await window.supabaseClient.updateReport(reportId, {
                current_stage: stage
            });

            if (result.success) {
                console.log(`[P15] Stage ${stage}로 업데이트됨`);

                // localStorage의 current_report도 업데이트 (JSON 객체 또는 UUID 문자열 모두 안전하게 처리)
                let currentReport = {};
                const storedReport = localStorage.getItem('current_report');
                if (storedReport) {
                    try {
                        const parsed = JSON.parse(storedReport);
                        currentReport = (typeof parsed === 'object' && parsed !== null) ? parsed : { reportId: storedReport };
                    } catch (parseError) {
                        currentReport = { reportId: storedReport };
                    }
                }
                currentReport.current_stage = stage;
                localStorage.setItem('current_report', JSON.stringify(currentReport));
            } else {
                console.warn('[P15] Stage 업데이트 실패:', result.error);
            }
        } catch (error) {
            console.warn('[P15] Stage 업데이트 오류:', error.message);
        }
    }

    // 페이지 로드 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }

    // 전역 함수 노출
    window.SectionEditorPage = {
        initializePage,
        selectSection,
        saveSection,
        resetSection,
        copySource,
        mergeAll,
        exportWord,
        goToPreviousStage,
        toggleDarkMode,
        getReportId
    };

    // 기존 HTML 호환용 전역 함수
    window.selectSection = selectSection;
    window.saveSection = saveSection;
    window.resetSection = resetSection;
    window.copySource = copySource;
    window.mergeAll = mergeAll;
    window.exportWord = exportWord;
    window.goToPreviousStage = goToPreviousStage;
    window.toggleDarkMode = toggleDarkMode;
    window.getReportId = getReportId;

})();
