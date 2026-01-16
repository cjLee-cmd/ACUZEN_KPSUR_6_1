/**
 * Workflow Sidebar Component
 * 모든 페이지에서 공통으로 사용하는 진행 상황 사이드바
 * 숨기기/보이기 토글 기능 포함
 */

(function() {
    'use strict';

    // localStorage 키
    const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

    // 사이드바 HTML 템플릿
    function getSidebarHTML(currentStage = 0, isCollapsed = false) {
        const stages = [
            { num: 1, name: '로그인', icon: 'lock' },
            { num: 2, name: '보고서 상태', icon: 'clipboard' },
            { num: 3, name: '파일 업로드', icon: 'upload' },
            { num: 4, name: 'MD 변환', icon: 'sync' },
            { num: 5, name: '데이터 추출', icon: 'gear' },
            { num: 6, name: '템플릿 작성', icon: 'document' },
            { num: 7, name: '리뷰', icon: 'pencil' },
            { num: 8, name: 'QC 검증', icon: 'check' },
            { num: 9, name: '최종 출력', icon: 'export' }
        ];

        const progressPercent = Math.round((currentStage / 9) * 100);
        const progressText = currentStage === 0 ? '대시보드' : `Stage ${currentStage}`;

        let stagesHTML = stages.map(stage => {
            let statusClass = 'pending';
            let statusIcon = 'circle';

            if (stage.num < currentStage) {
                statusClass = 'completed';
                statusIcon = 'check';
            } else if (stage.num === currentStage) {
                statusClass = 'active';
                statusIcon = 'circle';
            }

            return `
                <div class="workflow-stage ${statusClass}">
                    <div class="stage-icon">
                        <svg class="mono-icon icon-${stage.icon}" aria-hidden="true" focusable="false">
                            <use href="#icon-${stage.icon}"></use>
                        </svg>
                    </div>
                    <div class="stage-info">
                        <div class="stage-name">Stage ${stage.num}</div>
                        <div class="stage-label">${stage.name}</div>
                    </div>
                    <div class="stage-status">
                        <svg class="mono-icon icon-${statusIcon}" aria-hidden="true" focusable="false">
                            <use href="#icon-${statusIcon}"></use>
                        </svg>
                    </div>
                </div>
            `;
        }).join('');

        // Chevron 아이콘 (접기: 오른쪽 화살표, 펼치기: 왼쪽 화살표)
        const chevronRight = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        const chevronLeft = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;

        return `
            <aside class="workflow-sidebar${isCollapsed ? ' collapsed' : ''}">
                <!-- 접기 버튼 -->
                <button class="sidebar-toggle-btn" onclick="WorkflowSidebar.toggle()" title="사이드바 숨기기" aria-label="사이드바 숨기기">
                    ${chevronRight}
                </button>

                <div class="workflow-header">
                    <h3>진행 상황</h3>
                    <div class="workflow-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="progress-text">${progressText}</div>
                    </div>
                </div>

                <div class="workflow-stages">
                    ${stagesHTML}
                </div>

                <!-- Settings Link -->
                <div style="padding: 16px; margin-top: 20px; border-top: 2px solid var(--app-border-soft);">
                    <a href="#" onclick="navigateTo('P91_Settings.html'); return false;"
                        style="display: flex; align-items: center; gap: 8px; padding: 12px; background: var(--app-surface-muted); border-radius: 8px; text-decoration: none; color: var(--app-text-normal); font-size: 13px; transition: all 0.2s; cursor: pointer;">
                        <svg class="mono-icon icon-gear" aria-hidden="true" focusable="false"
                            style="width: 18px; height: 18px;">
                            <use href="#icon-gear"></use>
                        </svg>
                        <span style="font-weight: 600;">시스템 설정</span>
                    </a>
                </div>

                <div class="workflow-footer">
                    <div class="medical-badge">의료용 AI 소프트웨어</div>
                </div>
            </aside>
            <!-- 펼치기 버튼 (사이드바 외부) -->
            <button class="sidebar-expand-btn" onclick="WorkflowSidebar.toggle()" title="사이드바 보이기" aria-label="사이드바 보이기">
                ${chevronLeft}
            </button>
        `;
    }

    // 토글 버튼 추가 함수 (기존 사이드바에 버튼 추가)
    function addToggleButtons(sidebar) {
        // Chevron 아이콘
        const chevronRight = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        const chevronLeft = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;

        // 접기 버튼이 없으면 추가
        if (!sidebar.querySelector('.sidebar-toggle-btn')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'sidebar-toggle-btn';
            toggleBtn.setAttribute('onclick', 'WorkflowSidebar.toggle()');
            toggleBtn.setAttribute('title', '사이드바 숨기기');
            toggleBtn.setAttribute('aria-label', '사이드바 숨기기');
            toggleBtn.innerHTML = chevronRight;
            sidebar.insertBefore(toggleBtn, sidebar.firstChild);
        }

        // 펼치기 버튼이 없으면 추가 (사이드바 다음에)
        if (!document.querySelector('.sidebar-expand-btn')) {
            const expandBtn = document.createElement('button');
            expandBtn.className = 'sidebar-expand-btn';
            expandBtn.setAttribute('onclick', 'WorkflowSidebar.toggle()');
            expandBtn.setAttribute('title', '사이드바 보이기');
            expandBtn.setAttribute('aria-label', '사이드바 보이기');
            expandBtn.innerHTML = chevronLeft;
            sidebar.insertAdjacentElement('afterend', expandBtn);
        }
    }

    // 사이드바 삽입 함수
    function insertSidebar(currentStage = 0) {
        // app-content 또는 main-content를 찾아서 사이드바 삽입
        const appContent = document.querySelector('.app-content');

        if (!appContent) {
            console.warn('Sidebar: .app-content not found');
            return;
        }

        // 저장된 상태 확인
        const isCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';

        // body에 collapsed 클래스 설정 (펼치기 버튼 표시용)
        if (isCollapsed) {
            document.body.classList.add('sidebar-collapsed');
        }

        // 이미 사이드바가 있으면 토글 버튼만 추가
        const existingSidebar = document.querySelector('.workflow-sidebar');
        if (existingSidebar) {
            addToggleButtons(existingSidebar);
            // 저장된 숨김 상태 적용
            if (isCollapsed) {
                existingSidebar.classList.add('collapsed');
            }
            return;
        }

        // main 태그 다음에 사이드바 삽입
        const main = appContent.querySelector('main') || appContent.querySelector('.main-content');
        if (main) {
            main.insertAdjacentHTML('afterend', getSidebarHTML(currentStage, isCollapsed));
        } else {
            appContent.insertAdjacentHTML('beforeend', getSidebarHTML(currentStage, isCollapsed));
        }
    }

    // 사이드바 토글 함수
    function toggle() {
        const sidebar = document.querySelector('.workflow-sidebar');
        if (!sidebar) return;

        const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');

        if (isCurrentlyCollapsed) {
            expand();
        } else {
            collapse();
        }
    }

    // 사이드바 접기 함수
    function collapse() {
        const sidebar = document.querySelector('.workflow-sidebar');
        if (!sidebar) return;

        sidebar.classList.add('collapsed');
        document.body.classList.add('sidebar-collapsed');
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
    }

    // 사이드바 펼치기 함수
    function expand() {
        const sidebar = document.querySelector('.workflow-sidebar');
        if (!sidebar) return;

        sidebar.classList.remove('collapsed');
        document.body.classList.remove('sidebar-collapsed');
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'false');
    }

    // 현재 상태 확인
    function isCollapsed() {
        return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    }

    // 현재 페이지에 따른 스테이지 번호 자동 감지
    function getCurrentStage() {
        const path = window.location.pathname;
        const fileName = path.split('/').pop();

        const stageMap = {
            'P01_Login.html': 1,
            'P10_Dashboard.html': 1,
            'P11_ReportList.html': 2,
            'P12_ReportDetail.html': 2,
            'P13_NewReport.html': 2,
            'P14_UnifiedProcessing.html': 2,
            'P16_LineListingAnalysis.html': 3,  // Line Listing 분석
            'P15_SectionEditor.html': 3,
            'P18_Review.html': 7,
            'P19_QC.html': 8,
            'P20_Output.html': 9
        };

        return stageMap[fileName] || 0;
    }

    // 전역 함수로 노출
    window.WorkflowSidebar = {
        insert: insertSidebar,
        getCurrentStage: getCurrentStage,
        getHTML: getSidebarHTML,
        toggle: toggle,
        collapse: collapse,
        expand: expand,
        isCollapsed: isCollapsed
    };

    // DOM 로드 후 자동 삽입
    document.addEventListener('DOMContentLoaded', function() {
        const currentStage = getCurrentStage();
        insertSidebar(currentStage);
    });
})();
