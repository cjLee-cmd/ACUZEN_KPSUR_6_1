/**
 * Workflow Sidebar Component
 * 모든 페이지에서 공통으로 사용하는 진행 상황 사이드바
 */

(function() {
    'use strict';

    // 사이드바 HTML 템플릿
    function getSidebarHTML(currentStage = 0) {
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

        return `
            <aside class="workflow-sidebar">
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
        `;
    }

    // 사이드바 삽입 함수
    function insertSidebar(currentStage = 0) {
        // app-content 또는 main-content를 찾아서 사이드바 삽입
        const appContent = document.querySelector('.app-content');

        if (!appContent) {
            console.warn('Sidebar: .app-content not found');
            return;
        }

        // 이미 사이드바가 있으면 중복 삽입 방지
        if (document.querySelector('.workflow-sidebar')) {
            return;
        }

        // main 태그 다음에 사이드바 삽입
        const main = appContent.querySelector('main') || appContent.querySelector('.main-content');
        if (main) {
            main.insertAdjacentHTML('afterend', getSidebarHTML(currentStage));
        } else {
            appContent.insertAdjacentHTML('beforeend', getSidebarHTML(currentStage));
        }
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
        getHTML: getSidebarHTML
    };

    // DOM 로드 후 자동 삽입
    document.addEventListener('DOMContentLoaded', function() {
        const currentStage = getCurrentStage();
        insertSidebar(currentStage);
    });
})();
