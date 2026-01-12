/**
 * raw-id-detector.js
 * 파일명에서 RAW ID를 자동 감지하는 모듈
 *
 * @version 1.0.0
 * @description Step 3 기타자료 업로드 시 파일명 기반 RAW ID 자동 분류
 */

(function() {
    'use strict';

    /**
     * RAW ID 정의 (CLAUDE.md 기준)
     * 각 RAW ID의 패턴과 설명
     */
    const RAW_ID_DEFINITIONS = {
        // PDF 문서
        'RAW1.1': { pattern: /RAW1\.1/i, description: '최신첨부문서' },
        'RAW1.2': { pattern: /RAW1\.2/i, description: '보고기간시작시점첨부문서' },
        'RAW2.1': { pattern: /RAW2\.1/i, description: '용법용량' },
        'RAW2.2': { pattern: /RAW2\.2/i, description: '효능효과' },
        'RAW2.3': { pattern: /RAW2\.3/i, description: '사용상의주의사항' },
        'RAW2.4': { pattern: /RAW2\.4/i, description: '보고기간시작시점효능효과' },
        'RAW2.5': { pattern: /RAW2\.5/i, description: '보고기간시작시점용법용량' },
        'RAW2.6': { pattern: /RAW2\.6/i, description: '보고시작시점사용상의주의사항' },

        // Excel 문서
        'RAW3': { pattern: /RAW3[_\s-]/i, description: '시판후sales데이터' },
        'RAW4': { pattern: /RAW4[_\s-]/i, description: '허가현황' },
        'RAW9': { pattern: /RAW9[_\s-]/i, description: '문헌자료' },
        'RAW12': { pattern: /RAW12[_\s-]|Raw12[_\s-]/i, description: '국외신속보고LineListing' },
        'RAW13': { pattern: /RAW13[_\s-]|Raw13[_\s-]/i, description: '국내신속보고LineListing' },
        'RAW14': { pattern: /RAW14[_\s-]|Raw14[_\s-]/i, description: '원시자료LineListing' },
        'RAW15': { pattern: /RAW15[_\s-]|Raw15[_\s-]/i, description: '정기보고LineListing' },
        'RAW16': { pattern: /RAW16[_\s-]/i, description: 'MedDRA_SMQ_lack_of_efficacy' },
        'RAW17': { pattern: /RAW17[_\s-]/i, description: 'IIT및NIS트래커' },

        // Word 문서
        'RAW5': { pattern: /RAW5[_\s-]/i, description: '안전성조치허가팀메일' },
        'RAW6': { pattern: /RAW6[_\s-]/i, description: '안전성조치허가팀메일_취합본' },
        'RAW7': { pattern: /RAW7[_\s-]/i, description: '안전성정보변경' },
        'RAW8': { pattern: /RAW8[_\s-]/i, description: '임상노출데이터' }
    };

    /**
     * 파일명에서 RAW ID 감지
     * @param {string} fileName - 파일명
     * @returns {string|null} 감지된 RAW ID 또는 null
     */
    function detectRawIdFromFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return null;
        }

        // RAW ID 패턴 우선순위: 소수점 있는 것 먼저 (RAW2.3이 RAW2보다 먼저)
        const priorityOrder = [
            'RAW1.1', 'RAW1.2',
            'RAW2.1', 'RAW2.2', 'RAW2.3', 'RAW2.4', 'RAW2.5', 'RAW2.6',
            'RAW12', 'RAW13', 'RAW14', 'RAW15', 'RAW16', 'RAW17',
            'RAW3', 'RAW4', 'RAW5', 'RAW6', 'RAW7', 'RAW8', 'RAW9'
        ];

        for (const rawId of priorityOrder) {
            const definition = RAW_ID_DEFINITIONS[rawId];
            if (definition && definition.pattern.test(fileName)) {
                return rawId;
            }
        }

        return null;
    }

    /**
     * Step 3 기타자료용 RAW ID 감지
     * Step 3에서 허용된 RAW ID 목록과 매칭
     * @param {string} fileName - 파일명
     * @param {Array} allowedRawIds - 허용된 RAW ID 목록 (예: ['RAW3', 'RAW4', 'RAW9', 'RAW16'])
     * @param {string} defaultRawId - 기본값 (매칭 실패 시)
     * @returns {string} 감지된 RAW ID 또는 기본값
     */
    function detectStep3RawId(fileName, allowedRawIds, defaultRawId = 'RAW3') {
        const detectedRawId = detectRawIdFromFileName(fileName);

        if (detectedRawId && allowedRawIds.includes(detectedRawId)) {
            console.log(`[RAW ID Detector] "${fileName}" → ${detectedRawId} (자동 감지)`);
            return detectedRawId;
        }

        // 허용 목록에 없는 경우 기본값 반환
        if (detectedRawId) {
            console.log(`[RAW ID Detector] "${fileName}" → ${detectedRawId} 감지됨, 허용 목록에 없어 ${defaultRawId} 사용`);
        } else {
            console.log(`[RAW ID Detector] "${fileName}" → 패턴 미일치, ${defaultRawId} 사용`);
        }

        return defaultRawId;
    }

    /**
     * 여러 파일의 RAW ID 일괄 감지
     * @param {Array} files - 파일 객체 배열 [{name: 'filename.xlsx', ...}, ...]
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

    // 모듈 내보내기
    const RawIdDetector = {
        detectRawIdFromFileName,
        detectStep3RawId,
        detectRawIdsForFiles,
        getRawIdInfo,
        getAllRawIds,
        RAW_ID_DEFINITIONS
    };

    // 전역으로 내보내기 (window 객체)
    if (typeof window !== 'undefined') {
        window.RawIdDetector = RawIdDetector;
    }

    // ES6 모듈 지원 (향후 사용)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RawIdDetector;
    }

})();
