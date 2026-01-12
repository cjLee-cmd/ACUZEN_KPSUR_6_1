/**
 * Dashboard Page Script
 * pages/js/dashboard.js
 *
 * P10_Dashboard.html의 인라인 스크립트 분리
 */

(function() {
    'use strict';

    // Globals loaded flag
    window.__GLOBALS_LOADED__ = true;

    /**
     * 다크모드 초기화
     */
    function initDarkMode() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    /**
     * 다크모드 토글
     */
    function toggleDarkMode() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    /**
     * 사용자 메뉴 설정
     */
    function setupUserMenu() {
        try {
            const userMenuToggle = document.querySelector('.user-menu-toggle');
            const userMenu = document.querySelector('.user-menu');
            if (!userMenuToggle || !userMenu) return;

            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                let dropdown = document.querySelector('.user-menu-dropdown');
                if (!dropdown) {
                    dropdown = document.createElement('div');
                    dropdown.className = 'user-menu-dropdown';
                    dropdown.style.cssText = 'position:absolute;top:100%;right:0;margin-top:8px;background:#fff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:180px;z-index:1000;';
                    dropdown.innerHTML = '<div style="padding:8px 0;"><a href="P91_Settings.html" style="display:block;padding:10px 16px;color:var(--app-text-strong);text-decoration:none;">설정</a><a href="#" onclick="clearSessionData();window.location.href=\'P01_Login.html\'" style="display:block;padding:10px 16px;color:#EF4444;text-decoration:none;">로그아웃</a></div>';
                    userMenu.appendChild(dropdown);
                }
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });

            document.addEventListener('click', (e) => {
                const dropdown = document.querySelector('.user-menu-dropdown');
                if (dropdown && !userMenu.contains(e.target)) dropdown.style.display = 'none';
            });
        } catch (error) {
            console.error('setupUserMenu error:', error);
        }
    }

    /**
     * 배포 모드 업데이트
     */
    function updateDeploymentMode(mode) {
        const badge = document.querySelector('.deployment-badge');
        if (badge) badge.textContent = mode === 'production' ? '운영' : '테스트';
    }

    /**
     * 페이지 초기화
     */
    function initializePage() {
        // 글로벌 로드 확인
        if (!window.__GLOBALS_LOADED__) {
            setTimeout(initializePage, 50);
            return;
        }

        // 세션 데이터 확인
        const session = typeof loadSessionData === 'function' ? loadSessionData() : null;
        if (!session) {
            // 테스트용 세션 생성
            const testSession = {
                userName: '김작성자',
                userRole: 'Author',
                userPosition: '약물감시담당자',
                email: 'author@kpsur.test'
            };
            if (typeof saveSessionData === 'function') {
                saveSessionData(testSession);
            }
            updateUserDisplay(testSession);
        } else {
            updateUserDisplay(session);
        }

        // 사용자 메뉴 설정
        setupUserMenu();

        // 배포 모드 확인
        const deploymentMode = localStorage.getItem('deploymentMode') || 'test';
        updateDeploymentMode(deploymentMode);

        // 통계 데이터 로드
        loadDashboardStats();

        // 통계 카드 클릭 이벤트
        document.querySelectorAll('.stat-card').forEach((card, index) => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                const filters = ['all', 'in-progress', 'qc', 'completed'];
                if (typeof navigateTo === 'function') {
                    navigateTo(`P11_ReportList.html?filter=${filters[index]}`);
                }
            });
        });
    }

    /**
     * 사용자 정보 표시 업데이트
     */
    function updateUserDisplay(session) {
        const userName = document.getElementById('userName');
        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        const userPositionEl = document.querySelector('.user-position');
        const userAvatarEl = document.querySelector('.user-avatar');

        if (userName) userName.textContent = session.userName;
        if (userNameEl) userNameEl.textContent = session.userName;
        if (userRoleEl) userRoleEl.textContent = session.userRole;
        if (userPositionEl) userPositionEl.textContent = session.userPosition || '';
        if (userAvatarEl) userAvatarEl.textContent = session.userName.charAt(0);
    }

    /**
     * 새 보고서 생성
     */
    function createNewReport() {
        if (typeof navigateTo === 'function') {
            navigateTo('P13_NewReport.html');
        } else {
            window.location.href = 'P13_NewReport.html';
        }
    }

    /**
     * 대시보드 통계 로드
     */
    async function loadDashboardStats() {
        const reports = await loadReportsFromDB();

        if (reports) {
            updateStatsFromReports(reports);
            if (reports.length > 0) {
                updateActivityFromReports(reports);
            } else {
                showEmptyActivity();
            }
        }
    }

    /**
     * 빈 활동 표시
     */
    function showEmptyActivity() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">${renderMonoIconSafe('clipboard')}</div>
                <div class="activity-content">
                    <div class="activity-title">보고서가 없습니다</div>
                    <div class="activity-time">새 보고서를 생성하세요</div>
                </div>
            </div>
        `;
    }

    /**
     * 안전한 모노 아이콘 렌더링
     */
    function renderMonoIconSafe(iconId, extraClass = '') {
        if (typeof renderMonoIcon === 'function') {
            return renderMonoIcon(iconId, extraClass);
        }
        return `<svg class="mono-icon icon-${iconId} ${extraClass}" aria-hidden="true" focusable="false">
            <use href="#icon-${iconId}"></use>
        </svg>`;
    }

    /**
     * 통계 업데이트
     */
    function updateStatsFromReports(reports) {
        const total = reports.length;
        const inProgress = reports.filter(r => r.status === 'Draft' || r.status === 'InReview').length;
        const qcPending = reports.filter(r => r.status === 'QC').length;
        const completed = reports.filter(r => r.status === 'Completed').length;

        const now = new Date();
        const thisMonth = reports.filter(r => {
            if (r.status !== 'Completed') return false;
            const updated = new Date(r.updated_at);
            return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear();
        }).length;

        const reviewPending = reports.filter(r => r.status === 'InReview').length;

        // UI 업데이트
        setElementText('totalReports', total);
        setElementText('inProgressReports', inProgress);
        setElementText('qcReports', qcPending);
        setElementText('completedReports', completed);

        setElementText('totalTrend', `전체 ${total}건 등록`);
        setElementText('inProgressTrend', reviewPending > 0 ? `${reviewPending}개 리뷰 대기` : '진행 중');
        setElementText('qcTrend', qcPending > 0 ? '처리 필요' : '대기 없음');
        setElementText('completedTrend', `이번 달 ${thisMonth}건 완료`);
    }

    /**
     * 엘리먼트 텍스트 설정
     */
    function setElementText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    /**
     * 활동 목록 업데이트
     */
    function updateActivityFromReports(reports) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        const recentReports = reports.slice(0, 5);

        if (recentReports.length === 0) {
            showEmptyActivity();
            return;
        }

        const stageActions = {
            1: { iconId: 'lock', iconClass: 'create', title: '로그인' },
            2: { iconId: 'clipboard', iconClass: 'create', title: '보고서 생성됨' },
            3: { iconId: 'upload', iconClass: 'update', title: '파일 업로드' },
            4: { iconId: 'sync', iconClass: 'update', title: 'MD 변환 진행' },
            5: { iconId: 'gear', iconClass: 'update', title: '데이터 추출' },
            6: { iconId: 'document', iconClass: 'update', title: '템플릿 작성' },
            7: { iconId: 'pencil', iconClass: 'review', title: '리뷰 진행' },
            8: { iconId: 'check', iconClass: 'complete', title: 'QC 검증' },
            9: { iconId: 'export', iconClass: 'complete', title: '최종 출력' }
        };

        const statusActions = {
            'Draft': { iconId: 'plus', iconClass: 'create', title: '임시 저장됨' },
            'InReview': { iconId: 'pencil', iconClass: 'review', title: '리뷰 중' },
            'QC': { iconId: 'check', iconClass: 'complete', title: 'QC 대기' },
            'Completed': { iconId: 'check', iconClass: 'complete', title: '보고서 완료' }
        };

        activityList.innerHTML = recentReports.map(report => {
            const stage = report.current_stage || 2;
            const status = report.status || 'Draft';

            let action;
            if (status === 'Completed') {
                action = statusActions['Completed'];
            } else {
                action = stageActions[stage] || statusActions[status] || { iconId: 'clipboard', iconClass: 'update', title: '업데이트' };
            }

            const timeAgo = getTimeAgo(report.updated_at);
            const reportName = report.report_name || '이름 없음';

            return `
                <div class="activity-item" onclick="navigateTo('P12_ReportDetail.html?id=${report.id}')" style="cursor:pointer;">
                    <div class="activity-icon ${action.iconClass}">${renderMonoIconSafe(action.iconId || 'clipboard')}</div>
                    <div class="activity-content">
                        <div class="activity-title">${action.title}</div>
                        <div class="activity-time">${reportName} · ${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 시간 경과 계산
     */
    function getTimeAgo(dateString) {
        if (!dateString) return '알 수 없음';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays < 7) return `${diffDays}일 전`;
        return date.toLocaleDateString('ko-KR');
    }

    /**
     * DB에서 보고서 로드
     */
    async function loadReportsFromDB() {
        try {
            if (!window.supabaseClient) {
                throw new Error('Supabase client not loaded');
            }

            const result = await window.supabaseClient.getReports();

            if (result.success) {
                const reports = result.reports;
                console.log('[Dashboard] Loaded', reports.length, 'reports from DB');
                renderReportsTable(reports.slice(0, 10));
                return reports;
            } else {
                throw new Error(result.error || 'Failed to load reports');
            }

        } catch (error) {
            console.error('[Dashboard] DB load failed:', error.message);
            renderReportsTable([]);
            return [];
        }
    }

    /**
     * 카드 플립 토글
     */
    function toggleFlip(card, event) {
        if (event) event.stopPropagation();
        card.classList.toggle('flipped');
    }

    /**
     * 보고서 테이블 렌더링
     */
    function renderReportsTable(reports) {
        const grid = document.getElementById('reportsGrid');
        if (!grid) return;

        if (!reports || reports.length === 0) {
            grid.innerHTML = `
                <div class="reports-empty" style="grid-column: 1 / -1;">
                    <div class="reports-empty-icon">${renderMonoIconSafe('clipboard')}</div>
                    <div class="reports-empty-text">등록된 보고서가 없습니다.</div>
                </div>
            `;
            return;
        }

        const stageNames = {
            1: '보고서 설정', 2: '통합 처리', 3: '파일 업로드', 4: 'MD 변환',
            5: '섹션 편집', 6: '데이터 추출', 7: '템플릿 작성', 8: '리뷰', 9: 'QC 검증', 10: '최종 출력'
        };

        const statusMap = {
            'Draft': { class: 'in-progress', label: '작성중' },
            'InReview': { class: 'review', label: '리뷰중' },
            'QC': { class: 'qc', label: 'QC대기' },
            'Completed': { class: 'completed', label: '완료' }
        };

        grid.innerHTML = reports.map(report => {
            const ingredientName = report.user_inputs?.CS0_성분명 || report.products?.ingredient_name || '-';
            const brandName = report.user_inputs?.CS1_브랜드명 || report.products?.product_name || '-';
            const stage = report.current_stage || 2;
            const stageName = stageNames[stage] || '알 수 없음';
            const status = statusMap[report.status] || { class: 'draft', label: report.status };
            const updatedAt = report.updated_at ? new Date(report.updated_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-';
            const createdAt = report.created_at ? new Date(report.created_at).toLocaleDateString('ko-KR') : '-';
            const authorName = report.users?.name || '-';
            const progressPercent = Math.round((stage / 10) * 100);
            const isInProgress = report.status !== 'Completed';

            return `
                <div class="report-card" onclick="toggleFlip(this, event)">
                    <div class="report-card-inner">
                        <!-- Front Side -->
                        <div class="report-card-front">
                            <div class="report-card-header">
                                <div class="report-card-title" title="${report.report_name}">${report.report_name}</div>
                                <span class="status-badge ${status.class}">${status.label}</span>
                            </div>
                            <div class="report-card-body">
                                <div class="report-card-info-row">
                                    <div class="report-card-info">
                                        <span class="report-card-label">성분:</span>
                                        <span class="report-card-value">${ingredientName}</span>
                                    </div>
                                </div>
                                <div class="report-card-progress">
                                    <div class="report-card-progress-bar">
                                        <div class="report-card-progress-fill" style="width: ${progressPercent}%"></div>
                                    </div>
                                    <span class="report-card-progress-text">${stage}/10 ${stageName}</span>
                                </div>
                            </div>
                            <div class="report-card-footer">
                                <span class="report-card-meta">${updatedAt} 수정</span>
                                <span style="font-size: 10px; color: var(--app-text-muted);">클릭하여 상세 보기</span>
                            </div>
                        </div>
                        <!-- Back Side -->
                        <div class="report-card-back">
                            <div style="display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; margin-bottom: 8px;">
                                ${renderMonoIconSafe('clipboard', 'on-dark small-icon')}
                                <span>상세 정보</span>
                            </div>
                            <div style="font-size: 12px; opacity: 0.9; line-height: 1.6;">
                                <div><strong>브랜드:</strong> ${brandName}</div>
                                <div><strong>성분:</strong> ${ingredientName}</div>
                                <div><strong>작성자:</strong> ${authorName}</div>
                                <div><strong>생성일:</strong> ${createdAt}</div>
                            </div>
                            <div style="display: flex; gap: 8px; margin-top: 12px;">
                                ${isInProgress ? `
                                    <button class="btn-continue" onclick="continueReport('${report.id}', ${stage}); event.stopPropagation();" style="flex: 1;">
                                        계속 작성
                                    </button>
                                ` : `
                                    <span style="display:flex;align-items:center;gap:6px;color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 600;">
                                        ${renderMonoIconSafe('check', 'on-dark small-icon')}
                                        완료됨
                                    </span>
                                `}
                                <button class="btn-continue" onclick="navigateTo('P12_ReportDetail.html?id=${report.id}'); event.stopPropagation();" style="flex: 1; background: rgba(255,255,255,0.2);">
                                    상세 보기
                                </button>
                            </div>
                            <div class="flip-hint">클릭하여 돌아가기</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 보고서 계속 작성
     */
    async function continueReport(reportId, currentStage) {
        if (window.resumeReport) {
            await window.resumeReport(reportId);
        } else {
            const stagePages = {
                1: 'P12_ReportDetail.html',
                2: 'P14_UnifiedProcessing.html',
                3: 'P14_UnifiedProcessing.html',
                4: 'P14_UnifiedProcessing.html',
                5: 'P15_SectionEditor.html',
                6: 'P15_SectionEditor.html',
                7: 'P15_SectionEditor.html',
                8: 'P18_Review.html',
                9: 'P19_QC.html',
                10: 'P20_Output.html'
            };
            const targetPage = stagePages[currentStage] || 'P14_UnifiedProcessing.html';
            if (typeof navigateTo === 'function') {
                navigateTo(`${targetPage}?reportId=${reportId}`);
            } else {
                window.location.href = `${targetPage}?reportId=${reportId}`;
            }
        }
    }

    /**
     * API 키 확인
     */
    function checkApiKey() {
        const apiKeyRaw = localStorage.getItem('GOOGLE_API_KEY');
        if (!apiKeyRaw) {
            console.log('[Dashboard] API key not found. Redirecting to Settings...');
            if (typeof setNavigationFlag === 'function') setNavigationFlag();
            window.location.href = 'P91_Settings.html?firstSetup=true';
        }
    }

    // 다크모드 즉시 초기화
    initDarkMode();

    // API 키 확인 (지연)
    setTimeout(checkApiKey, 100);

    // DOM Ready 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }

    // 전역 함수 노출
    window.toggleDarkMode = toggleDarkMode;
    window.createNewReport = createNewReport;
    window.toggleFlip = toggleFlip;
    window.continueReport = continueReport;

    // 네임스페이스
    window.DashboardPage = {
        initializePage,
        loadDashboardStats,
        createNewReport,
        toggleFlip,
        continueReport
    };

})();
