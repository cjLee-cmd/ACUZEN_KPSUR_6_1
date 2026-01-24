/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║  RAW ID DETECTOR MODULE                                                    ║
 * ║  Version: 2.3.1                                                            ║
 * ║  Last Modified: 2026-01-19                                                 ║
 * ║                                                                            ║
 * ╠════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                            ║
 * ║  ⚠️  WARNING: DO NOT MODIFY THIS FILE                                      ║
 * ║                                                                            ║
 * ║  This is a SEALED MODULE containing RAW ID detection logic.               ║
 * ║  Any modifications require explicit approval and documentation.            ║
 * ║                                                                            ║
 * ║  이 파일은 RAW ID 감지 로직을 포함한 봉인된 모듈입니다.                    ║
 * ║  수정 시 반드시 명시적인 승인과 문서화가 필요합니다.                        ║
 * ║                                                                            ║
 * ║  MODIFICATION HISTORY:                                                     ║
 * ║  - 2026-01-08: Initial creation (v1.0.0)                                   ║
 * ║  - 2026-01-12: Add ZONE_RAW_ID_MAPPING, STEP3_RAW_ID_OPTIONS (v2.0.0)      ║
 * ║  - 2026-01-13: Add standalone '첨부문서' pattern, seal module (v2.1.0)     ║
 * ║  - 2026-01-19: Add RAW10, RAW11, RAW14, RAW15, RAW19 patterns (v2.2.0)     ║
 * ║  - 2026-01-19: Add '허가현황' keyword to RAW4 pattern (v2.3.1)           ║
 * ║  - 2026-01-19: Add 한글 keywords to RAW1.x/RAW2.x patterns (v2.3.1)      ║
 * ║  - 2026-01-19: Add Distribution Tracker keyword to RAW3 (v2.3.1)         ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 *
 * @fileoverview RAW ID Detection Module
 * @module RawIdDetector
 * @version 2.3.1
 * @readonly
 * @sealed
 */

(function(global) {
    'use strict';

    // ========================================
    // 모듈 버전 및 봉인 상태
    // ========================================
    const MODULE_VERSION = '2.3.1';

    // 이미 봉인된 경우 재초기화 방지
    if (global.RawIdDetector && global.RawIdDetector._sealed) {
        console.warn('⚠️ RawIdDetector is already initialized and sealed.');
        return;
    }

    // ========================================
    // RAW ID 정의 (CLAUDE.md 기준)
    // ========================================
    const RAW_ID_DEFINITIONS = Object.freeze({
        // PDF 문서 - 개별 파일 키워드 기반 자동 감지
        // RAW2.4~2.6: 보고기간 시작시점 (2018년 등 과거 연도)
        'RAW2.4': { pattern: /RAW2\.4|시작시점.*효능|보고기간.*시작.*효능|효능.*201[0-8]/i, description: '보고기간시작시점효능효과' },
        'RAW2.5': { pattern: /RAW2\.5|시작시점.*용법|보고기간.*시작.*용법|용법.*201[0-8]/i, description: '보고기간시작시점용법용량' },
        'RAW2.6': { pattern: /RAW2\.6|시작시점.*사용상|주의사항.*201[0-8]|201[0-8]년.*주의사항/i, description: '보고시작시점사용상의주의사항' },
        // RAW2.1~2.3: 보고기간 종료시점 (2020년 이후 최신)
        'RAW2.1': { pattern: /RAW2\.1|용법용량/i, description: '용법용량' },
        'RAW2.2': { pattern: /RAW2\.2|효능효과/i, description: '효능효과' },
        'RAW2.3': { pattern: /RAW2\.3|주의사항.*20[2-9]\d|20[2-9]\d년.*주의사항/i, description: '사용상의주의사항' },
        // RAW1.x: 통합 첨부문서
        'RAW1.1': { pattern: /RAW1\.1|최신.*첨부문서|첨부문서.*최신/i, description: '최신첨부문서' },
        'RAW1.2': { pattern: /RAW1\.2|시작시점.*첨부문서|첨부문서.*시작시점/i, description: '보고기간시작시점첨부문서' },

        // Excel 문서
        'RAW3': { pattern: /RAW3[_\s-]|Distribution.*Tracker|판매.*데이터|sales.*data/i, description: '시판후sales데이터' },
        'RAW4': { pattern: /RAW4[_\s-]|허가현황|허가.*Tracker|license.*status/i, description: '허가현황' },
        'RAW9': { pattern: /RAW9[_\s-]/i, description: '문헌자료' },
        'RAW12': { pattern: /RAW12[_\s-]|Raw12[_\s-]/i, description: '국외신속보고LineListing' },
        'RAW13': { pattern: /RAW13[_\s-]|Raw13[_\s-]/i, description: '국내신속보고LineListing' },
        'RAW14': { pattern: /RAW14[_\s-]|Raw14[_\s-]/i, description: '원시자료LineListing' },
        'RAW15': { pattern: /RAW15[_\s-]|Raw15[_\s-]/i, description: '정기보고LineListing' },
        'RAW16': { pattern: /RAW16[_\s-]/i, description: 'MedDRA_SMQ_lack_of_efficacy' },
        'RAW17': { pattern: /RAW17[_\s-]/i, description: 'IIT및NIS트래커' },
        'RAW19': { pattern: /RAW19[_\s-]|통합.*LineListing/i, description: '통합LineListing' },

        // 임상시험 안전성 데이터
        'RAW10': { pattern: /RAW10[_\s-]|임상시험.*안전성|임상.*안전성.*데이터/i, description: '임상시험안전성데이터' },
        'RAW11': { pattern: /RAW11[_\s-]|추가.*임상.*안전성/i, description: '추가임상안전성데이터' },

        // Word 문서
        'RAW5': { pattern: /RAW5[_\s-]|규제.*당국.*안전성|허가.*팀.*메일/i, description: '안전성조치허가팀메일' },
        'RAW6': { pattern: /RAW6[_\s-]/i, description: '안전성조치허가팀메일_취합본' },
        'RAW7': { pattern: /RAW7[_\s-]|비교자료|변경내용.*상세.*비교|안전성.*정보.*변경/i, description: '안전성정보변경' },
        'RAW8': { pattern: /RAW8[_\s-]/i, description: '임상노출데이터' }
    });

    // ========================================
    // Zone별 RAW ID 매핑 (P14 업로드 영역별)
    // ========================================
    const ZONE_RAW_ID_MAPPING = Object.freeze({
        // Step 1 - 제품정보 문서
        startPeriod: ['RAW1.2', 'RAW2.4', 'RAW2.5', 'RAW2.6'],   // 보고기간 시작시점
        endPeriod: ['RAW1.1', 'RAW2.1', 'RAW2.2', 'RAW2.3'],     // 보고기간 종료시점
        changeHistory: ['RAW5', 'RAW6', 'RAW7'],                  // 안전성 변경 이력
        // Step 2 - 임상 자료
        sponsored: ['RAW8'],                                       // 임상노출데이터
        iitnis: ['RAW17', 'RAW10', 'RAW11'],                       // IIT/NIS 트래커 + 임상시험안전성
        // Step 3 - 기타 자료 (LineListing 포함, 자동 인식)
        step3_all: ['RAW3', 'RAW4', 'RAW5', 'RAW6', 'RAW7', 'RAW9', 'RAW10', 'RAW11',
                    'RAW14', 'RAW15', 'RAW16', 'RAW19']            // 모든 기타 자료
    });

    // ========================================
    // Step 3 기타자료 RAW ID 옵션 (드롭다운용)
    // ========================================
    const STEP3_RAW_ID_OPTIONS = Object.freeze([
        { value: 'RAW3', label: 'RAW3 - 시판후 판매 데이터 (Distribution)' },
        { value: 'RAW4', label: 'RAW4 - 허가현황' },
        { value: 'RAW5', label: 'RAW5 - 안전성조치/규제당국메일' },
        { value: 'RAW6', label: 'RAW6 - 안전성조치허가팀메일_취합본' },
        { value: 'RAW7', label: 'RAW7 - 안전성정보변경/비교자료' },
        { value: 'RAW9', label: 'RAW9 - 문헌자료' },
        { value: 'RAW10', label: 'RAW10 - 임상시험안전성데이터' },
        { value: 'RAW11', label: 'RAW11 - 추가임상안전성데이터' },
        { value: 'RAW14', label: 'RAW14 - 원시자료LineListing' },
        { value: 'RAW15', label: 'RAW15 - 정기보고LineListing' },
        { value: 'RAW16', label: 'RAW16 - MedDRA SMQ' },
        { value: 'RAW19', label: 'RAW19 - 통합LineListing' }
    ]);

    // ========================================
    // 상세 패턴 매칭 (한글/영문 키워드 포함)
    // ========================================
    const DETAILED_PATTERNS = [
        // ⚠️ RAW7 - 비교자료/변경내용 (최우선 - RAW2.x보다 먼저 체크해야 함)
        { pattern: /raw7|변경내용.*상세.*비교|비교자료|안전성.*정보.*변경/i, rawId: 'RAW7' },

        // RAW1.x - 첨부문서 (연도 기반 구분)
        // 과거 연도(2018-2023): RAW1.2 (보고기간 시작시점)
        { pattern: /raw1\.?2|보고.*기간.*시작.*시점.*첨부|시작.*시점.*첨부/i, rawId: 'RAW1.2' },
        { pattern: /(사용상.*주의|주의사항).*(201[0-9]|202[0-3])년/i, rawId: 'RAW1.2' },
        // 최신 연도(2024-2026): RAW1.1 (최신 첨부문서)
        { pattern: /raw1\.?1|최신.*첨부|첨부문서/i, rawId: 'RAW1.1' },
        { pattern: /(사용상.*주의|주의사항).*(202[4-6])년/i, rawId: 'RAW1.1' },

        // RAW2.x - 허가정보 (구체적 버전 먼저)
        { pattern: /raw2\.?6|보고.*시작.*시점.*사용상|시작.*시점.*주의/i, rawId: 'RAW2.6' },
        { pattern: /raw2\.?5|보고.*기간.*시작.*시점.*용법|시작.*시점.*용법/i, rawId: 'RAW2.5' },
        { pattern: /raw2\.?4|보고.*기간.*시작.*시점.*효능|시작.*시점.*효능/i, rawId: 'RAW2.4' },
        { pattern: /raw2\.?3|사용상.*주의|주의사항(?!.*시작)/i, rawId: 'RAW2.3' },
        { pattern: /raw2\.?2|효능.*효과/i, rawId: 'RAW2.2' },
        { pattern: /raw2\.?1|용법.*용량/i, rawId: 'RAW2.1' },

        // RAW5-6 - 안전성 관련
        { pattern: /raw6|취합본|취합/i, rawId: 'RAW6' },
        { pattern: /raw5|안전성.*조치.*메일|허가.*팀.*메일|규제.*당국.*안전성/i, rawId: 'RAW5' },

        // RAW8, RAW17 - 임상자료
        { pattern: /raw17|iit.*nis|nis.*iit|트래커.*완성/i, rawId: 'RAW17' },
        { pattern: /raw8|임상.*노출|clinical.*exposure/i, rawId: 'RAW8' },

        // RAW10, RAW11 - 임상시험 안전성 데이터
        { pattern: /raw10|임상시험.*안전성|임상.*안전성.*데이터/i, rawId: 'RAW10' },
        { pattern: /raw11|추가.*임상.*안전성/i, rawId: 'RAW11' },

        // RAW19 - 통합 LineListing (RAW14, RAW15보다 먼저 체크)
        { pattern: /raw19|통합.*linelisting|통합linelisting/i, rawId: 'RAW19' },

        // RAW14, RAW15 - Line Listing (개별)
        { pattern: /raw15|정기.*보고.*linelisting|정기보고linelisting/i, rawId: 'RAW15' },
        { pattern: /raw14|원시.*자료.*linelisting|원시자료linelisting/i, rawId: 'RAW14' },
        { pattern: /raw13|국내.*신속/i, rawId: 'RAW13' },
        { pattern: /raw12|국외.*신속/i, rawId: 'RAW12' },

        // 기타
        { pattern: /raw16|meddra|smq|lack.*of.*efficacy/i, rawId: 'RAW16' },
        { pattern: /raw9|문헌.*자료|문헌.*완성|literature/i, rawId: 'RAW9' },
        { pattern: /raw4|허가.*현황|license/i, rawId: 'RAW4' },
        { pattern: /raw3|distribution.*tracker|sales|판매/i, rawId: 'RAW3' }
    ];

    // RAW ID 우선순위 (소수점 있는 것 먼저, RAW19 통합LineListing 우선)
    const PRIORITY_ORDER = [
        // RAW2.4~2.6 먼저 체크 (시작시점 - 2018년 등 과거 연도 매칭)
        'RAW2.4', 'RAW2.5', 'RAW2.6',
        // RAW2.1~2.3 다음 체크 (종료시점 - 2020년 이후 또는 단순 키워드)
        'RAW2.1', 'RAW2.2', 'RAW2.3',
        // RAW1.x 마지막 (통합 첨부문서)
        'RAW1.1', 'RAW1.2',
        'RAW19',  // 통합 LineListing 우선 체크
        'RAW10', 'RAW11', 'RAW12', 'RAW13', 'RAW14', 'RAW15', 'RAW16', 'RAW17',
        'RAW3', 'RAW4', 'RAW5', 'RAW6', 'RAW7', 'RAW8', 'RAW9'
    ];

    // ========================================
    // 기본 감지 함수
    // ========================================

    /**
     * 파일명에서 RAW ID 감지 (기본 패턴)
     * @param {string} fileName - 파일명
     * @returns {string|null} 감지된 RAW ID 또는 null
     */
    function detectRawIdFromFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return null;
        }

        for (const rawId of PRIORITY_ORDER) {
            const definition = RAW_ID_DEFINITIONS[rawId];
            if (definition && definition.pattern.test(fileName)) {
                return rawId;
            }
        }

        return null;
    }

    /**
     * 파일명에서 RAW ID 감지 (상세 패턴 - 한글/영문 키워드 포함)
     * @param {string} fileName - 파일명
     * @param {string[]} candidates - zone별 RAW ID 후보 목록 (선택)
     * @returns {string|null} 감지된 RAW ID 또는 null
     */
    function detectRawIdDetailed(fileName, candidates = null) {
        if (!fileName || typeof fileName !== 'string') {
            return null;
        }

        const lowerFilename = fileName.toLowerCase();

        for (const { pattern, rawId } of DETAILED_PATTERNS) {
            if (pattern.test(lowerFilename)) {
                // 후보 목록이 있으면 후보 내에서 매칭 확인
                if (candidates && candidates.length > 0) {
                    const normalizedRawId = rawId.split('.')[0];
                    const matchingCandidate = candidates.find(c => {
                        const normalizedCandidate = c.split('.')[0];
                        return normalizedCandidate === normalizedRawId || c === rawId;
                    });

                    if (matchingCandidate) {
                        return rawId;
                    }
                } else {
                    return rawId;
                }
            }
        }

        return null;
    }

    // ========================================
    // Zone 기반 감지 함수 (통합)
    // ========================================

    /**
     * Zone 기반 RAW ID 감지 (통합 함수)
     * 파일명과 zone 정보를 기반으로 가장 적합한 RAW ID 반환
     *
     * @param {string} fileName - 파일명
     * @param {string} zoneId - 업로드 zone ID (예: 'startPeriod', 'endPeriod')
     * @returns {string|null} 감지된 RAW ID 또는 zone의 첫 번째 후보
     */
    function detectRawIdForZone(fileName, zoneId) {
        const candidates = ZONE_RAW_ID_MAPPING[zoneId] || [];

        if (!fileName || candidates.length === 0) {
            return candidates[0] || null;
        }

        // 1. 상세 패턴 매칭 시도
        const detailedMatch = detectRawIdDetailed(fileName, candidates);
        if (detailedMatch) {
            console.log(`[RAW ID] ${fileName} → ${detailedMatch} (상세 패턴 매칭)`);
            return detailedMatch;
        }

        // 2. 기본 패턴 매칭 시도
        const basicMatch = detectRawIdFromFileName(fileName);
        if (basicMatch && candidates.includes(basicMatch)) {
            console.log(`[RAW ID] ${fileName} → ${basicMatch} (기본 패턴 매칭)`);
            return basicMatch;
        }

        // 3. 패턴 매칭 실패 시 첫 번째 후보 반환
        console.log(`[RAW ID] ${fileName} → 패턴 미매칭, 기본값 ${candidates[0]} 사용`);
        return candidates[0];
    }

    /**
     * Zone의 RAW ID 후보 목록 조회
     * @param {string} zoneId - 업로드 zone ID
     * @returns {string[]} RAW ID 후보 목록
     */
    function getZoneCandidates(zoneId) {
        return ZONE_RAW_ID_MAPPING[zoneId] || [];
    }

    // ========================================
    // Step 3 전용 함수
    // ========================================

    /**
     * Step 3 기타자료용 RAW ID 감지
     * @param {string} fileName - 파일명
     * @param {Array} allowedRawIds - 허용된 RAW ID 목록
     * @param {string} defaultRawId - 기본값 (매칭 실패 시)
     * @returns {string} 감지된 RAW ID 또는 기본값
     */
    function detectStep3RawId(fileName, allowedRawIds, defaultRawId = 'RAW3') {
        const detectedRawId = detectRawIdDetailed(fileName) || detectRawIdFromFileName(fileName);

        if (detectedRawId && allowedRawIds.includes(detectedRawId)) {
            console.log(`[RAW ID Detector] "${fileName}" → ${detectedRawId} (자동 감지)`);
            return detectedRawId;
        }

        if (detectedRawId) {
            console.log(`[RAW ID Detector] "${fileName}" → ${detectedRawId} 감지됨, 허용 목록에 없어 ${defaultRawId} 사용`);
        } else {
            console.log(`[RAW ID Detector] "${fileName}" → 패턴 미일치, ${defaultRawId} 사용`);
        }

        return defaultRawId;
    }

    /**
     * 여러 파일의 RAW ID 일괄 감지
     * @param {Array} files - 파일 객체 배열
     * @param {Array} allowedRawIds - 허용된 RAW ID 목록
     * @param {string} defaultRawId - 기본값
     * @returns {Array} RAW ID가 추가된 파일 배열
     */
    function detectRawIdsForFiles(files, allowedRawIds, defaultRawId = 'RAW3') {
        return files.map(file => ({
            ...file,
            rawId: detectStep3RawId(file.name, allowedRawIds, defaultRawId),
            rawIdAutoDetected: true
        }));
    }

    // ========================================
    // 유틸리티 함수
    // ========================================

    /**
     * RAW ID 정의 정보 조회
     * @param {string} rawId - RAW ID
     * @returns {Object|null} RAW ID 정의 정보
     */
    function getRawIdInfo(rawId) {
        return RAW_ID_DEFINITIONS[rawId] || null;
    }

    /**
     * 모든 RAW ID 목록 반환
     * @returns {Array} RAW ID 목록
     */
    function getAllRawIds() {
        return Object.keys(RAW_ID_DEFINITIONS);
    }

    /**
     * 모든 Zone ID 목록 반환
     * @returns {Array} Zone ID 목록
     */
    function getAllZoneIds() {
        return Object.keys(ZONE_RAW_ID_MAPPING);
    }

    // ========================================
    // 모듈 내보내기
    // ========================================
    const RawIdDetector = {
        // 상수
        RAW_ID_DEFINITIONS,
        ZONE_RAW_ID_MAPPING,
        STEP3_RAW_ID_OPTIONS,

        // 기본 감지
        detectRawIdFromFileName,
        detectRawIdDetailed,

        // Zone 기반 감지 (통합)
        detectRawIdForZone,
        getZoneCandidates,

        // Step 3 전용
        detectStep3RawId,
        detectRawIdsForFiles,

        // 유틸리티
        getRawIdInfo,
        getAllRawIds,
        getAllZoneIds,

        /**
         * 모듈 버전 조회
         * @returns {string} 모듈 버전
         */
        get version() {
            return MODULE_VERSION;
        },

        /**
         * 모듈 무결성 검증
         * @returns {boolean} 무결성 상태
         */
        verifyIntegrity() {
            const requiredFunctions = [
                'detectRawIdFromFileName',
                'detectRawIdDetailed',
                'detectRawIdForZone',
                'getZoneCandidates',
                'detectStep3RawId'
            ];
            const requiredConstants = [
                'RAW_ID_DEFINITIONS',
                'ZONE_RAW_ID_MAPPING',
                'STEP3_RAW_ID_OPTIONS'
            ];

            const functionsValid = requiredFunctions.every(fn => typeof this[fn] === 'function');
            const constantsValid = requiredConstants.every(c => this[c] && Object.isFrozen(this[c]));

            return functionsValid && constantsValid && this._sealed === true;
        },

        // 봉인 플래그
        _sealed: true
    };

    // 모듈 봉인 (Object.freeze)
    Object.freeze(RawIdDetector);

    // 전역으로 내보내기 (window 객체)
    if (typeof window !== 'undefined') {
        window.RawIdDetector = RawIdDetector;
        // 개별 함수도 직접 접근 가능하도록 export
        window.detectStep3RawId = detectStep3RawId;
        window.detectRawIdFromFileName = detectRawIdFromFileName;
        window.getStep3RawIdOptions = () => STEP3_RAW_ID_OPTIONS;
    }
    if (typeof global !== 'undefined') {
        global.RawIdDetector = RawIdDetector;
    }

    // ES6 모듈 지원 (향후 사용)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RawIdDetector;
    }

    console.log(`🔒 RawIdDetector v${MODULE_VERSION} initialized and sealed.`);

})(typeof window !== 'undefined' ? window : this);
