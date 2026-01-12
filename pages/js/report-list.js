/**
 * Report List Page Script
 * pages/js/report-list.js
 *
 * P11_ReportList.html 인라인 스크립트 분리
 */

(function() {
    'use strict';

    // 보고서 데이터
    let allReports = [];
    let currentReports = [];
    let isLoading = false;

    /**
     * 페이지 초기화
     */
    async function initializePage() {
        // 전역 객체 로드 확인
        if (!window.__GLOBALS_LOADED__ || !window.supabaseClient || !window.authManager) {
            setTimeout(initializePage, 50);
            return;
        }

        // 세션 정보로 UI 업데이트
        const session = typeof loadSessionData === 'function' ? loadSessionData() : null;
        if (session) {
            const userName = document.querySelector('.user-name');
            const userRole = document.querySelector('.user-role');
            const userPosition = document.querySelector('.user-position');
            const userAvatar = document.querySelector('.user-avatar');

            if (userName) userName.textContent = session.userName;
            if (userRole) userRole.textContent = session.userRole;
            if (userPosition) userPosition.textContent = session.userPosition || '';
            if (userAvatar) userAvatar.textContent = session.userName.charAt(0);
        }

        // 사용자 메뉴 설정
        if (typeof setupUserMenu === 'function') {
            setupUserMenu();
        }

        // 필터 칩 설정
        setupFilterChips();

        // DB에서 보고서 목록 로드
        await loadReportsFromDB();

        // URL 파라미터에서 필터 확인
        const urlParams = new URLSearchParams(window.location.search);
        const filter = urlParams.get('filter');
        if (filter && filter !== 'all') {
            const chip = document.querySelector(`[data-status="${filter}"]`);
            if (chip) {
                const activeChip = document.querySelector('.filter-chip.active');
                if (activeChip) activeChip.classList.remove('active');
                chip.classList.add('active');
                applyFilters();
            }
        }
    }

    /**
     * DB에서 보고서 목록 로드
     */
    async function loadReportsFromDB() {
        try {
            isLoading = true;
            showLoadingState();

            // 현재 사용자 정보 가져오기
            const currentUser = window.authManager?.getCurrentUser();
            const userId = currentUser?.id;

            if (!userId) {
                console.warn('No user logged in, showing empty list');
                allReports = [];
                currentReports = [];
                renderReports();
                return;
            }

            // DB에서 보고서 조회
            const result = await window.supabaseClient.getReports(userId);

            if (result.success) {
                // DB 데이터를 UI 포맷으로 변환
                allReports = result.reports.map(dbReport => {
                    const userInputs = dbReport.user_inputs || {};
                    return {
                        id: dbReport.id,
                        name: dbReport.report_name || '제목 없음',
                        ingredient: userInputs.CS0_성분명 || '-',
                        stage: dbReport.current_stage || 2,
                        status: mapStatusToUI(dbReport.status),
                        author: dbReport.created_by_name || '알 수 없음',
                        date: formatDate(dbReport.updated_at || dbReport.created_at),
                        urgent: isUrgent(dbReport)
                    };
                });

                currentReports = [...allReports];
                console.log(`Loaded ${allReports.length} reports from DB`);
            } else {
                console.error('Failed to load reports:', result.error);
                if (typeof showToast === 'function') {
                    showToast('보고서 목록 로드 실패', 'error');
                }
            }

        } catch (error) {
            console.error('loadReportsFromDB error:', error);
            if (typeof showToast === 'function') {
                showToast('DB 연결 오류', 'error');
            }
        } finally {
            isLoading = false;
            renderReports();
        }
    }

    /**
     * DB status를 UI status로 매핑
     */
    function mapStatusToUI(dbStatus) {
        const statusMap = {
            'Draft': 'draft',
            'InProgress': 'in-progress',
            'Review': 'review',
            'QC': 'qc',
            'Completed': 'completed'
        };
        return statusMap[dbStatus] || 'draft';
    }

    /**
     * 날짜 포맷팅
     */
    function formatDate(isoDate) {
        if (!isoDate) return '-';
        const date = new Date(isoDate);
        return date.toISOString().split('T')[0];
    }

    /**
     * 긴급 여부 판단 (Stage 7-8이고 최근 업데이트된 경우)
     */
    function isUrgent(report) {
        const stage = report.current_stage || 0;
        if (stage < 7 || stage > 8) return false;

        const updatedAt = new Date(report.updated_at || report.created_at);
        const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate <= 3;
    }

    /**
     * 로딩 상태 표시
     */
    function showLoadingState() {
        const tbody = document.getElementById('reportsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <div>🔄 보고서 목록을 불러오는 중...</div>
                    </td>
                </tr>
            `;
        }
    }

    /**
     * 필터 칩 설정
     */
    function setupFilterChips() {
        const chips = document.querySelectorAll('.filter-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const activeChip = document.querySelector('.filter-chip.active');
                if (activeChip) activeChip.classList.remove('active');
                chip.classList.add('active');
                applyFilters();
            });
        });
    }

    /**
     * 보고서 목록 렌더링
     */
    function renderReports() {
        const tbody = document.getElementById('reportsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (currentReports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <div style="margin-bottom: 12px;">📭 보고서가 없습니다.</div>
                        <button class="btn-primary" onclick="ReportListPage.navigateToNewReport()">
                            ➕ 새 보고서 생성
                        </button>
                    </td>
                </tr>
            `;
            updateTableCount();
            return;
        }

        currentReports.forEach(report => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="report-name" onclick="ReportListPage.viewReport('${report.id}')">
                        ${report.urgent ? '<span class="urgent-badge"></span>' : ''}
                        ${report.name}
                    </div>
                </td>
                <td>${report.ingredient}</td>
                <td><span class="stage-text">Stage ${report.stage} - ${getStageName(report.stage)}</span></td>
                <td><span class="status-badge ${report.status}">${getStatusText(report.status)}</span></td>
                <td>${report.author}</td>
                <td>${report.date}</td>
                <td>
                    <div class="action-buttons">
                        ${report.status === 'draft' || report.status === 'in-progress'
                            ? `<button class="action-btn" onclick="ReportListPage.resumeReport('${report.id}')" title="계속 작성" style="background: var(--primary-color); color: white;">▶️</button>`
                            : ''}
                        <button class="action-btn" onclick="ReportListPage.viewReport('${report.id}')" title="보기">👁️</button>
                        <button class="action-btn" onclick="ReportListPage.editReport('${report.id}')" title="편집">✏️</button>
                        <button class="action-btn" onclick="ReportListPage.deleteReport('${report.id}')" title="삭제">🗑️</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        updateTableCount();
    }

    /**
     * 단계 이름 가져오기
     */
    function getStageName(stage) {
        const stages = {
            1: '보고서 설정',
            2: '통합 처리',
            3: '파일 업로드',
            4: 'MD 변환',
            5: '섹션 편집',
            6: '데이터 추출',
            7: '템플릿 작성',
            8: '리뷰',
            9: 'QC 검증',
            10: '최종 출력'
        };
        return stages[stage] || '';
    }

    /**
     * 상태 텍스트 가져오기
     */
    function getStatusText(status) {
        const texts = {
            'draft': '임시저장',
            'in-progress': '진행중',
            'review': '리뷰중',
            'qc': 'QC대기',
            'completed': '완료'
        };
        return texts[status] || status;
    }

    /**
     * 테이블 카운트 업데이트
     */
    function updateTableCount() {
        const tableCount = document.getElementById('tableCount');
        const paginationInfo = document.getElementById('paginationInfo');

        if (tableCount) {
            tableCount.textContent = `총 ${currentReports.length}개 보고서`;
        }
        if (paginationInfo) {
            paginationInfo.textContent = `1-${Math.min(10, currentReports.length)} / ${currentReports.length}개 보고서`;
        }
    }

    /**
     * 필터 적용
     */
    function applyFilters() {
        const searchInput = document.getElementById('searchInput');
        const authorFilter = document.getElementById('authorFilter');
        const stageFilter = document.getElementById('stageFilter');
        const activeChip = document.querySelector('.filter-chip.active');

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const author = authorFilter ? authorFilter.value : '';
        const stage = stageFilter ? stageFilter.value : '';
        const status = activeChip ? activeChip.dataset.status : '';

        currentReports = allReports.filter(report => {
            const matchesSearch = !searchTerm ||
                report.name.toLowerCase().includes(searchTerm) ||
                report.ingredient.toLowerCase().includes(searchTerm);
            const matchesAuthor = !author || report.author === author;
            const matchesStage = !stage || report.stage.toString() === stage;
            const matchesStatus = !status || report.status === status;

            return matchesSearch && matchesAuthor && matchesStage && matchesStatus;
        });

        renderReports();
        if (typeof showToast === 'function') {
            showToast('필터가 적용되었습니다.', 'info');
        }
    }

    /**
     * 필터 초기화
     */
    function resetFilters() {
        const searchInput = document.getElementById('searchInput');
        const authorFilter = document.getElementById('authorFilter');
        const periodFilter = document.getElementById('periodFilter');
        const stageFilter = document.getElementById('stageFilter');

        if (searchInput) searchInput.value = '';
        if (authorFilter) authorFilter.value = '';
        if (periodFilter) periodFilter.value = '';
        if (stageFilter) stageFilter.value = '';

        const activeChip = document.querySelector('.filter-chip.active');
        const allChip = document.querySelector('.filter-chip[data-status=""]');
        if (activeChip) activeChip.classList.remove('active');
        if (allChip) allChip.classList.add('active');

        currentReports = [...allReports];
        renderReports();
        if (typeof showToast === 'function') {
            showToast('필터가 초기화되었습니다.', 'info');
        }
    }

    /**
     * 테이블 정렬
     */
    function sortTable(column) {
        if (typeof showToast === 'function') {
            showToast('정렬 기능은 곧 추가됩니다.', 'info');
        }
    }

    /**
     * 보고서 보기
     */
    function viewReport(id) {
        if (typeof navigateTo === 'function') {
            navigateTo(`P12_ReportDetail.html?reportId=${id}`);
        } else {
            window.location.href = `P12_ReportDetail.html?reportId=${id}`;
        }
    }

    /**
     * 보고서 편집
     */
    function editReport(id) {
        if (typeof navigateTo === 'function') {
            navigateTo(`P12_ReportDetail.html?reportId=${id}&mode=edit`);
        } else {
            window.location.href = `P12_ReportDetail.html?reportId=${id}&mode=edit`;
        }
    }

    /**
     * 보고서 삭제
     */
    async function deleteReport(id) {
        if (confirm('이 보고서를 삭제하시겠습니까?')) {
            // TODO: DB에서 삭제 구현
            if (typeof showToast === 'function') {
                showToast('삭제 기능은 곧 추가됩니다.', 'info');
            }
        }
    }

    /**
     * 보고서 재개
     */
    function resumeReport(id) {
        viewReport(id);
    }

    /**
     * 새 보고서 생성 페이지로 이동
     */
    function navigateToNewReport() {
        if (typeof navigateTo === 'function') {
            navigateTo('P13_NewReport.html');
        } else {
            window.location.href = 'P13_NewReport.html';
        }
    }

    // 페이지 로드 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }

    // 전역 함수 노출
    window.ReportListPage = {
        initializePage,
        loadReportsFromDB,
        applyFilters,
        resetFilters,
        sortTable,
        viewReport,
        editReport,
        deleteReport,
        resumeReport,
        navigateToNewReport
    };

    // 기존 HTML 호환용 전역 함수
    window.applyFilters = applyFilters;
    window.resetFilters = resetFilters;
    window.sortTable = sortTable;
    window.loadReportsFromDB = loadReportsFromDB;
    window.viewReport = viewReport;
    window.editReport = editReport;
    window.deleteReport = deleteReport;

})();
