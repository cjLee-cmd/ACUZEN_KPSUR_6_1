/**
 * navigation.js
 * 페이지 네비게이션 유틸리티
 */

/**
 * 페이지 → 스테이지 매핑
 */
const PAGE_STAGE_MAP = {
    'P13_NewReport.html': 1,
    'P14_UnifiedProcessing.html': 2,
    'P16_LineListingAnalysis.html': 2.5,  // Line Listing 분석
    'P15_SectionEditor.html': 3,
    'P18_Review.html': 4,
    'P19_QC.html': 5,
    'P20_Output.html': 6
};

/**
 * 현재 보고서 진행 상태 저장
 * @param {number} stage - 이동할 스테이지 번호
 */
async function saveReportProgress(stage) {
    try {
        // 현재 보고서 정보 가져오기
        const currentReport = JSON.parse(localStorage.getItem('current_report') || '{}');
        const reportId = currentReport.reportId || getUrlParam('reportId');

        if (!reportId || reportId.startsWith('local_')) {
            console.log('[Navigation] No valid report ID, skipping progress save');
            return;
        }

        // 진행 상태 데이터 수집
        const progressData = {
            current_stage: stage,
            updated_at: new Date().toISOString()
        };

        // user_inputs 업데이트 (localStorage 데이터 포함)
        const userInputs = currentReport.user_inputs || currentReport || {};

        // 스테이지별 관련 데이터 추가
        const uploadedFiles = localStorage.getItem('uploadedFiles');
        const convertedMarkdowns = localStorage.getItem('convertedMarkdowns');
        const extractedData = localStorage.getItem('extractedData');
        const generatedSections = localStorage.getItem('generatedSections');

        if (uploadedFiles) userInputs.uploadedFiles = JSON.parse(uploadedFiles);
        if (convertedMarkdowns) userInputs.convertedMarkdowns = JSON.parse(convertedMarkdowns);
        if (extractedData) userInputs.extractedData = JSON.parse(extractedData);
        if (generatedSections) userInputs.generatedSections = JSON.parse(generatedSections);

        progressData.user_inputs = userInputs;

        // DB 업데이트
        if (window.supabaseClient) {
            const result = await window.supabaseClient.updateReport(reportId, progressData);
            if (result.success) {
                console.log(`✅ [Navigation] Progress saved: Stage ${stage}`);
            } else {
                console.warn('⚠️ [Navigation] Progress save failed:', result.error);
            }
        }

        // localStorage도 업데이트
        currentReport.current_stage = stage;
        currentReport.user_inputs = userInputs;
        localStorage.setItem('current_report', JSON.stringify(currentReport));

    } catch (error) {
        console.error('❌ [Navigation] Progress save error:', error);
    }
}

/**
 * 페이지 이동 (세션 보존 + 진행 상태 저장)
 * @param {string} page - 이동할 페이지 파일명 (예: 'P10_Dashboard.html')
 */
async function navigateTo(page) {
    if (!page) {
        console.warn('navigateTo: page parameter is required');
        return;
    }

    try {
        // 네비게이션 플래그 설정 (리프레시 감지용)
        sessionStorage.setItem('kpsur_valid_navigation', 'true');

        // 이동할 페이지의 스테이지 확인 및 저장
        const targetStage = PAGE_STAGE_MAP[page];
        if (targetStage) {
            await saveReportProgress(targetStage);
        }

        // 현재 경로에서 /pages/ 이전 경로 추출
        const basePath = window.location.pathname.split('/pages/')[0];
        const targetPath = `${basePath}/pages/${page}`;

        console.log(`Navigating to: ${targetPath}`);
        window.location.href = targetPath;
    } catch (error) {
        console.error('Navigation error:', error);
        // Fallback: 상대 경로로 이동 시도
        sessionStorage.setItem('kpsur_valid_navigation', 'true');
        window.location.href = page;
    }
}

/**
 * 현재 페이지명 반환
 * @returns {string} 현재 페이지 파일명 (예: 'P10_Dashboard.html')
 */
function getCurrentPage() {
    try {
        const pathname = window.location.pathname;
        const pageName = pathname.split('/').pop();
        return pageName || 'index.html';
    } catch (error) {
        console.error('getCurrentPage error:', error);
        return 'unknown';
    }
}

/**
 * URL 파라미터 파싱
 * @returns {Object} URL 파라미터 객체
 */
function getUrlParams() {
    try {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);

        for (const [key, value] of searchParams) {
            params[key] = value;
        }

        return params;
    } catch (error) {
        console.error('getUrlParams error:', error);
        return {};
    }
}

/**
 * URL 파라미터 가져오기
 * @param {string} key - 파라미터 키
 * @returns {string|null} 파라미터 값
 */
function getUrlParam(key) {
    try {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get(key);
    } catch (error) {
        console.error('getUrlParam error:', error);
        return null;
    }
}

/**
 * 보고서 진행 상태 로드 (재개 시)
 * @param {string} reportId - 보고서 UUID
 * @returns {Object} 로드된 데이터 및 이동할 페이지
 */
async function loadReportProgress(reportId) {
    try {
        if (!reportId || reportId.startsWith('local_')) {
            console.log('[Navigation] No valid report ID');
            return null;
        }

        // DB에서 보고서 로드
        if (window.supabaseClient) {
            const result = await window.supabaseClient.getReportById(reportId);
            if (!result.success) {
                console.warn('[Navigation] Failed to load report:', result.error);
                return null;
            }

            const report = result.report;
            const userInputs = report.user_inputs || {};

            // localStorage에 데이터 복원
            localStorage.setItem('current_report', JSON.stringify({
                ...userInputs,
                reportId: report.id,
                reportName: report.report_name,
                current_stage: report.current_stage,
                status: report.status
            }));

            // 스테이지별 데이터 복원
            if (userInputs.uploadedFiles) {
                localStorage.setItem('uploadedFiles', JSON.stringify(userInputs.uploadedFiles));
            }
            if (userInputs.convertedMarkdowns) {
                localStorage.setItem('convertedMarkdowns', JSON.stringify(userInputs.convertedMarkdowns));
            }
            if (userInputs.extractedData) {
                localStorage.setItem('extractedData', JSON.stringify(userInputs.extractedData));
            }
            if (userInputs.generatedSections) {
                localStorage.setItem('generatedSections', JSON.stringify(userInputs.generatedSections));
            }

            // 스테이지에 맞는 페이지 찾기
            const stagePageMap = Object.entries(PAGE_STAGE_MAP).reduce((acc, [page, stage]) => {
                if (!acc[stage]) acc[stage] = page;
                return acc;
            }, {});

            const targetPage = stagePageMap[report.current_stage] || 'P14_UnifiedProcessing.html';

            console.log(`✅ [Navigation] Report loaded: Stage ${report.current_stage} → ${targetPage}`);

            return {
                report: report,
                userInputs: userInputs,
                currentStage: report.current_stage,
                targetPage: targetPage
            };
        }

        return null;

    } catch (error) {
        console.error('❌ [Navigation] Load progress error:', error);
        return null;
    }
}

/**
 * 보고서 재개 (목록에서 클릭 시)
 * @param {string} reportId - 보고서 UUID
 */
async function resumeReport(reportId) {
    const progress = await loadReportProgress(reportId);
    if (progress) {
        navigateTo(`${progress.targetPage}?reportId=${reportId}`);
    } else {
        console.warn('[Navigation] Could not resume report');
    }
}

// 전역으로 내보내기 (window 객체)
if (typeof window !== 'undefined') {
    window.PAGE_STAGE_MAP = PAGE_STAGE_MAP;
    window.saveReportProgress = saveReportProgress;
    window.loadReportProgress = loadReportProgress;
    window.resumeReport = resumeReport;
    window.navigateTo = navigateTo;
    window.getCurrentPage = getCurrentPage;
    window.getUrlParams = getUrlParams;
    window.getUrlParam = getUrlParam;
}
