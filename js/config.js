/**
 * KSUR System Configuration
 * GitHub Pages 배포용 - API 키는 localStorage에서 관리
 */

const CONFIG = {
    // Supabase 설정 (공개 정보 - GitHub Pages에서 사용 가능)
    SUPABASE_URL: 'https://toelnxgizxwbdikskmxa.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZWxueGdpenh3YmRpa3NrbXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDAyMzUsImV4cCI6MjA3NzU3NjIzNX0.mpBAWTufodmfPUp6nmg7Qez6uygrplK9S91xl8c4mR8',

    // LLM 설정
    LLM: {
        DEFAULT_MODEL: 'gemini-3-flash-preview',
        MODELS: {
            FLASH: 'gemini-3-flash-preview',
            PRO: 'gemini-2.0-pro-exp'
        },
        API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models'
    },

    // 로컬 저장 키
    STORAGE_KEYS: {
        GOOGLE_API_KEY: 'GOOGLE_API_KEY',
        SESSION: 'kpsur_session',
        CURRENT_REPORT: 'current_report',
        LAST_STAGE: 'last_stage'
    },

    // RAW ID 정의 → RawIdDetector.RAW_ID_DEFINITIONS 참조 (js/utils/raw-id-detector.js)
    // 중복 제거됨 - Single Source of Truth 패턴 적용

    // PSUR 섹션별 데이터 의존성 (섹션 생성에 필요한 RAW 파일 정의)
    // 모든 15개 섹션 정의 (00-14)
    SECTION_DATA_DEPENDENCIES: {
        "00": {
            name: "표지",
            required: [],
            optional: [],
            description: "보고서 표지 (사용자 입력 데이터 기반)"
        },
        "01": {
            name: "목차",
            required: [],
            optional: [],
            description: "목차 (자동 생성)"
        },
        "02": {
            name: "약어설명",
            required: [],
            optional: [],
            description: "약어 설명 (보고서 내용 기반 자동 생성)"
        },
        "03": {
            name: "서론",
            required: [],
            optional: ["RAW1.1", "RAW2.1", "RAW2.2"],
            description: "서론 (제품 정보, 효능효과, 용법용량)"
        },
        "04": {
            name: "전세계판매허가현황",
            required: ["RAW4"],
            optional: [],
            description: "허가현황 데이터 (국가별 승인 정보)"
        },
        "05": {
            name: "안전성조치",
            required: ["RAW7"],
            optional: ["RAW5", "RAW6"],
            description: "안전성 조치 이력 (허가팀 메일, 변경 내역)"
        },
        "06": {
            name: "안전성정보참고정보변경",
            required: [],
            optional: ["RAW7", "RAW2.3", "RAW2.6"],
            description: "허가사항 변경 이력 (사용상의주의사항 비교)"
        },
        "07": {
            name: "환자노출",
            required: ["RAW3"],
            optional: [],
            description: "시판 후 판매 데이터 (노출 환자 수 계산용)"
        },
        "08": {
            name: "개별증례병력",
            required: ["RAW19"],
            optional: [],
            description: "이상사례 Line Listing (통합 LineListing - 원시/신속/정기 포함)"
        },
        "09": {
            name: "시험",
            required: [],
            optional: ["RAW8", "RAW17"],
            description: "임상 시험 데이터 (회사 주관 임상, IIT/NIS)"
        },
        "10": {
            name: "기타정보",
            required: [],
            optional: ["RAW9"],
            description: "문헌 자료 및 기타 안전성 정보"
        },
        "11": {
            name: "종합적인안전성평가",
            required: [],
            optional: [],
            description: "종합적인 안전성 평가 (이전 섹션 종합)"
        },
        "12": {
            name: "결론",
            required: [],
            optional: [],
            description: "결론 (유익성-위해성 평가)"
        },
        "13": {
            name: "참고문헌",
            required: [],
            optional: ["RAW9"],
            description: "참고문헌 (학술 논문 목록)"
        },
        "14": {
            name: "별첨",
            required: [],
            optional: [],
            description: "별첨 자료"
        }
    },

    // 워크플로우 단계 (신규 5-Stage 구조)
    STAGES: {
        LOGIN: 0,
        STAGE1_USER_INPUT: 1,    // 사용자 입력 데이터
        STAGE2_RAW_PROCESSING: 2, // Raw Data 처리 (LLM 자동 처리)
        STAGE3_REVIEW: 3,         // 결과 보기 및 편집
        STAGE4_QC: 4,             // QC 검증
        STAGE5_OUTPUT: 5          // 워드 출력
    },

    // 페이지 라우팅
    PAGES: {
        // 인증
        LOGIN: 'P01_Login.html',
        SIGNUP: 'P02_Signup.html',
        PASSWORD_RESET: 'P03_PasswordReset.html',
        PASSWORD_CHANGE: 'P04_PasswordChange.html',
        SYSTEM_CHECK: 'P05_SystemCheck.html',

        // 대시보드
        DASHBOARD: 'P10_Dashboard.html',
        REPORT_LIST: 'P11_ReportList.html',
        REPORT_DETAIL: 'P12_ReportDetail.html',

        // Stage 1: 사용자 입력
        STAGE1_USER_INPUT: 'P13_NewReport.html',

        // Stage 2: Raw Data 처리 (통합)
        STAGE2_PROCESSING: 'P14_UnifiedProcessing.html',

        // Stage 2.5: Line Listing 분석
        LINE_LISTING_ANALYSIS: 'P16_LineListingAnalysis.html',

        // Stage 3: 결과 보기 및 편집
        STAGE3_REVIEW: 'P18_Review.html',

        // Stage 4: QC 검증
        STAGE4_QC: 'P19_QC.html',

        // Stage 5: 출력
        STAGE5_OUTPUT: 'P20_Output.html',

        // 관리
        SYSTEM_TEST: 'P90_SystemTest.html',
        SETTINGS: 'P91_Settings.html',

        // Legacy (하위 호환)
        NEW_REPORT: 'P13_NewReport.html',
        FILE_UPLOAD: 'P14_UnifiedProcessing.html',
        REVIEW: 'P18_Review.html',
        QC: 'P19_QC.html',
        OUTPUT: 'P20_Output.html'
    }
};

// localStorage 헬퍼 함수
const Storage = {
    get(key) {
        try {
            const value = localStorage.getItem(key);
            if (!value) return null;
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (e) {
            console.error(`Error reading from localStorage (${key}):`, e);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error writing to localStorage (${key}):`, e);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Error removing from localStorage (${key}):`, e);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Error clearing localStorage:', e);
            return false;
        }
    }
};

// 날짜/시간 헬퍼 함수
const DateHelper = {
    now() {
        return new Date();
    },

    formatYYMMDD_hhmmss(date = new Date()) {
        const yy = String(date.getFullYear()).slice(-2);
        const MM = String(date.getMonth() + 1).padStart(2, '0');
        const DD = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${yy}${MM}${DD}_${hh}${mm}${ss}`;
    },

    formatISO(date = new Date()) {
        return date.toISOString();
    }
};

// 전역으로 내보내기 (window 객체 - 기존 호환성)
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.Storage = Storage;
    window.DateHelper = DateHelper;
}

// ES6 Module export (조건부 - 모듈로 로드될 때만)
// 일반 스크립트로 로드될 때는 export 사용 불가
// export { CONFIG, Storage, DateHelper };
