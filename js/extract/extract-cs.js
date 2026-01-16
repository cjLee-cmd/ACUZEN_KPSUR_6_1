/**
 * Extract CS - CS 데이터 추출
 * js/extract/extract-cs.js
 *
 * Context-Specific (CS) 변수 추출 전문 모듈
 */

(function() {
    'use strict';

    // CS 변수 정의 - extractData.md 명세서 기반 (75개)
    // fromRawData: 사용자입력 = UI에서 입력받음, 계산값 = 다른 CS로부터 계산
    const CS_DEFINITIONS = {
        // === 기본 정보 (사용자 입력) ===
        'CS0_성분명': { rawIds: ['USER_INPUT'], description: '의약품 성분명', source: 'user_input' },
        'CS1_브랜드명': { rawIds: ['USER_INPUT'], description: '의약품 브랜드명', source: 'user_input' },
        'CS2_회사명': { rawIds: ['USER_INPUT'], description: '품목허가권자 회사명', source: 'user_input' },
        'CS3_보고시작날짜': { rawIds: ['CALCULATED'], description: 'PSUR 보고기간 시작일 (CS4로부터 5년 전)', source: 'calculated' },
        'CS4_보고종료날짜': { rawIds: ['USER_INPUT'], description: 'PSUR 보고기간 종료일 (DLP)', source: 'user_input' },
        'CS5_국내허가일자': { rawIds: ['USER_INPUT'], description: '국내 품목허가일', source: 'user_input' },
        'CS6_보고서제출일': { rawIds: ['USER_INPUT'], description: '보고서 제출 예정일', source: 'user_input' },
        'CS7_버전넘버': { rawIds: ['USER_INPUT'], description: '보고서 버전 번호', source: 'user_input' },
        'CS8_버전날짜': { rawIds: ['CALCULATED'], description: 'CS4_보고종료날짜와 동일', source: 'calculated' },

        // === 목차 관련 (문서 생성 후 자동) ===
        'CS9_목차': { rawIds: ['GENERATED'], description: '섹션 목차', source: 'generated' },
        'CS10_표목차': { rawIds: ['GENERATED'], description: '표 목차', source: 'generated' },
        'CS11_별첨목차': { rawIds: ['GENERATED'], description: '별첨 목차', source: 'generated' },
        'CS12_약어표': { rawIds: ['GENERATED'], description: '약어 및 정의 목록', source: 'generated' },

        // === 일자 관련 ===
        'CS13_유효기간': { rawIds: ['USER_INPUT'], description: '의약품 유효기간', source: 'user_input' },
        'CS14_신청기한': { rawIds: ['CALCULATED'], description: 'CS13_유효기간 6개월 전', source: 'calculated' },

        // === 첨부문서 정보 ===
        'CS15_효능효과': { rawIds: ['RAW1.1', 'RAW2.2'], description: '최신 효능효과', source: 'raw_data' },
        'CS16_용법용량': { rawIds: ['RAW1.1', 'RAW2.1'], description: '최신 용법용량', source: 'raw_data' },

        // === 허가 현황 (RAW4) ===
        'CS17_전세계허가현황표': { rawIds: ['RAW4'], description: '국가별 허가 현황 표', source: 'raw_data' },
        'CS17_.1_허가국가': { rawIds: ['RAW4'], description: '허가 국가명', source: 'raw_data' },
        'CS17_.2_허가일': { rawIds: ['RAW4'], description: '허가일자', source: 'raw_data' },
        'CS17_.3_허가품목명': { rawIds: ['RAW4'], description: '허가 품목명', source: 'raw_data' },
        'CS17_.4_허가권자': { rawIds: ['RAW4'], description: '허가권자', source: 'raw_data' },
        'CS17_.5_허가비고': { rawIds: ['RAW4'], description: '허가 비고', source: 'raw_data' },
        'CS17_.6_허가현황서술문': { rawIds: ['RAW4', 'CS17_전세계허가현황표'], description: '허가현황 서술문', source: 'generated' },

        // === 임상 노출 (RAW8) ===
        'CS18_임상노출': { rawIds: ['RAW8'], description: '임상시험 노출 데이터', source: 'raw_data' },

        // === 시판후 노출 (RAW3) ===
        'CS19_시판후노출count시작날짜': { rawIds: ['RAW3'], description: '판매량 집계 시작일', source: 'raw_data' },
        'CS19_.1_시판후노출count종료날짜': { rawIds: ['RAW3'], description: '판매량 집계 종료일', source: 'raw_data' },
        'CS19_.2_시판후판매연도': { rawIds: ['RAW3'], description: '연도별 컬럼', source: 'raw_data' },
        'CS19_.3_시판후판매연도별판매량': { rawIds: ['RAW3'], description: '연도별 판매량', source: 'raw_data' },
        'CS19_.4_시판후판매량합계': { rawIds: ['RAW3'], description: '판매량 총합계', source: 'calculated' },

        // === 용량/환자 계산 ===
        'CS20_1일사용량': { rawIds: ['RAW1.1', 'RAW2.1'], description: '1일 사용량', source: 'raw_data' },
        'CS21_환자1명당사용량': { rawIds: ['RAW1.1', 'RAW2.1'], description: '환자당 사용량', source: 'raw_data' },
        'CS22_연평균판매량': { rawIds: ['표2_연도별판매량'], description: '연 평균 판매량', source: 'calculated' },
        'CS23_연평균환자노출': { rawIds: ['CS22_연평균판매량', 'CS21_환자1명당사용량'], description: '연 평균 환자 노출 수', source: 'calculated' },
        'CS24_MedDRA버전넘버': { rawIds: ['USER_INPUT'], description: 'MedDRA 버전', source: 'user_input' },

        // === 신속보고 관련 (RAW12, RAW13) ===
        'CS25_.1_신속보고일자': { rawIds: ['RAW12', 'RAW13'], description: '신속보고 보고일자', source: 'raw_data' },
        'CS25_.2_신속관리번호': { rawIds: ['RAW12', 'RAW13'], description: '신속보고 관리번호', source: 'raw_data' },
        'CS25_.3_신속이상사례명': { rawIds: ['RAW12', 'RAW13'], description: '신속보고 이상사례명', source: 'raw_data' },
        'CS25_.4_신속비고': { rawIds: ['RAW12', 'RAW13'], description: '신속보고 비고', source: 'raw_data' },

        // === 원시자료 관련 (RAW14) ===
        'CS28_원시총환자수': { rawIds: ['RAW14'], description: '원시자료 총 환자수', source: 'raw_data' },
        'CS29_원시총이상사례수': { rawIds: ['RAW14'], description: '원시자료 총 이상사례 건수', source: 'raw_data' },
        'CS30_원시중대한사례수': { rawIds: ['RAW14'], description: '원시자료 중대한 이상사례 건수', source: 'raw_data' },
        'CS31_원시자료신청일': { rawIds: ['USER_INPUT'], description: '원시자료 신청일', source: 'user_input' },

        // === 보고 건수 합계 ===
        'CS32_신속정기보고총사례수': { rawIds: ['RAW12', 'RAW13', 'RAW15'], description: '신속+정기 총 사례수', source: 'calculated' },
        'CS33_신속보고총사례수': { rawIds: ['RAW12', 'RAW13'], description: '신속보고 총 사례수', source: 'calculated' },
        'CS34_정기보고총사례수': { rawIds: ['RAW15'], description: '정기보고 총 사례수', source: 'calculated' },
        'CS35_신속정기원시총사례수': { rawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'], description: '전체 총 사례수', source: 'calculated' },
        'CS36_중대한총사례수': { rawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'], description: '중대한 이상사례 총 건수', source: 'calculated' },
        'CS37_중대하지않은총사례수': { rawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'], description: '중대하지 않은 이상사례 총 건수', source: 'calculated' },

        // === 문헌 DB (사용자 입력) ===
        'CS53_문헌DB': { rawIds: ['USER_INPUT'], description: '문헌 검색 DB 목록', source: 'user_input' },

        // === 안전성 조치 (RAW5, RAW6) ===
        'CS55_안전성조치서술문': { rawIds: ['RAW5', 'RAW6'], description: '안전성 조치 서술문', source: 'raw_data' },

        // === 참고정보 변경 (RAW7) ===
        'CS56_참고정보의변경서술문': { rawIds: ['RAW7'], description: '참고정보 변경 서술문', source: 'raw_data' },
        'CS56_별첨2참고정보변경표': { rawIds: ['RAW7'], description: '별첨2 변경 대비표', source: 'raw_data' },
        'CS56_.1_허가사항변경일': { rawIds: ['RAW7'], description: '허가사항 변경일', source: 'raw_data' },
        'CS56_.2_기존효능효과': { rawIds: ['RAW7', 'RAW1.2', 'RAW2.4'], description: '보고시작시점 효능효과', source: 'raw_data' },
        'CS56_.3_기존용법용량': { rawIds: ['RAW7', 'RAW1.2', 'RAW2.5'], description: '보고시작시점 용법용량', source: 'raw_data' },
        'CS56_.4_기존사용상의주의사항': { rawIds: ['RAW7', 'RAW1.2', 'RAW2.6'], description: '보고시작시점 사용상의주의사항', source: 'raw_data' },
        'CS56_.5_최신효능효과': { rawIds: ['RAW7', 'RAW1.1', 'RAW2.2'], description: '보고종료시점 효능효과', source: 'raw_data' },
        'CS56_.6_최신용법용량': { rawIds: ['RAW7', 'RAW1.1', 'RAW2.1'], description: '보고종료시점 용법용량', source: 'raw_data' },
        'CS56_.7_최신사용상의주의사항': { rawIds: ['RAW7', 'RAW1.1', 'RAW2.3'], description: '보고종료시점 사용상의주의사항', source: 'raw_data' },

        // === 참고문헌 (RAW9) ===
        'CS57_참고문헌리스트': { rawIds: ['RAW9', 'GENERATED'], description: '참고문헌 목록', source: 'generated' },

        // === 별첨1 (RAW1.1, RAW2) ===
        'CS58_.1_별첨1효능효과': { rawIds: ['RAW1.1', 'RAW2.2'], description: '별첨1 효능효과 전문', source: 'raw_data' },
        'CS58_.2_별첨1용법용량': { rawIds: ['RAW1.1', 'RAW2.1'], description: '별첨1 용법용량 전문', source: 'raw_data' },
        'CS58_.3_별첨1사용상의주의사항': { rawIds: ['RAW1.1', 'RAW2.3'], description: '별첨1 사용상의주의사항 전문', source: 'raw_data' },

        // === 별첨3 일람표 (모든 LineListing) ===
        'CS59_별첨3_일람표': { rawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'], description: '별첨3 전체 이상사례 일람표', source: 'raw_data' }
    };

    /**
     * ExtractCS - CS 데이터 추출 클래스
     */
    class ExtractCS {
        constructor(base) {
            this.base = base || window.extractBase;
        }

        /**
         * CS 데이터 추출
         */
        async extract(markdownFiles, csDefinitions = null) {
            console.log('[ExtractCS] Extracting CS Data...');

            const definitions = csDefinitions || CS_DEFINITIONS;

            for (const file of markdownFiles) {
                // 관련 RAW ID인지 확인
                const relevantDefs = this.getRelevantDefinitions(file.rawId, definitions);

                if (Object.keys(relevantDefs).length === 0) {
                    console.log(`[ExtractCS] Skipping ${file.rawId} - no CS definitions`);
                    continue;
                }

                const result = await this.base.extractFromMarkdown(
                    file.markdownContent || file.markdown || file.content,
                    file.rawId,
                    relevantDefs
                );

                if (result.success) {
                    this.base.mergeExtractedData(result.data, 'CS');
                }
            }

            const csData = this.base.getData('CS');
            console.log(`[ExtractCS] CS Data extraction complete (${Object.keys(csData).length} variables)`);
            return csData;
        }

        /**
         * 해당 RAW ID와 관련된 정의만 필터링
         * 특수 rawId: USER_INPUT, CALCULATED, GENERATED는 파일 추출 대상에서 제외
         */
        getRelevantDefinitions(rawId, definitions) {
            const relevant = {};
            const specialSources = ['USER_INPUT', 'CALCULATED', 'GENERATED'];

            Object.entries(definitions).forEach(([key, def]) => {
                if (def.rawIds) {
                    // 특수 소스가 아닌 실제 RAW ID와 매칭되는 항목만 필터링
                    const actualRawIds = def.rawIds.filter(id => !specialSources.includes(id));
                    if (actualRawIds.includes(rawId)) {
                        relevant[key] = def;
                    }
                }
            });

            return relevant;
        }

        /**
         * 소스 타입별 CS 정의 가져오기
         * @param {string} sourceType - 'user_input' | 'calculated' | 'generated' | 'raw_data'
         */
        getDefinitionsBySource(sourceType) {
            const filtered = {};
            Object.entries(CS_DEFINITIONS).forEach(([key, def]) => {
                if (def.source === sourceType) {
                    filtered[key] = def;
                }
            });
            return filtered;
        }

        /**
         * 사용자 입력이 필요한 CS 항목 목록
         */
        getUserInputFields() {
            return Object.keys(this.getDefinitionsBySource('user_input'));
        }

        /**
         * RAW 데이터에서 추출해야 하는 CS 항목 목록
         */
        getRawDataFields() {
            return Object.keys(this.getDefinitionsBySource('raw_data'));
        }

        /**
         * 계산/생성되는 CS 항목 목록
         */
        getCalculatedFields() {
            return [
                ...Object.keys(this.getDefinitionsBySource('calculated')),
                ...Object.keys(this.getDefinitionsBySource('generated'))
            ];
        }

        /**
         * CS 정의 가져오기
         */
        getDefinitions() {
            return CS_DEFINITIONS;
        }

        /**
         * 특정 CS 변수 값 가져오기
         */
        getValue(variableId) {
            return this.base.getData('CS')[variableId];
        }

        /**
         * CS 데이터 전체 가져오기
         */
        getData() {
            return this.base.getData('CS');
        }

        /**
         * 필수 CS 변수 확인
         */
        validateRequired(requiredFields) {
            const csData = this.base.getData('CS');
            const missing = [];

            requiredFields.forEach(field => {
                if (!csData[field]) {
                    missing.push(field);
                }
            });

            return {
                valid: missing.length === 0,
                missing: missing
            };
        }

        /**
         * CS 추출 프롬프트 생성
         */
        buildPrompt(markdownContent, rawId) {
            const definitions = this.getRelevantDefinitions(rawId, CS_DEFINITIONS);

            return `다음 문서에서 CS(Context-Specific) 데이터를 추출하세요.

## 문서 (${rawId})
${markdownContent.substring(0, 25000)}

## 추출 대상 변수
${Object.entries(definitions).map(([k, v]) => `- ${k}: ${v.description}`).join('\n')}

## 출력 형식
\`\`\`json
{
  "CS0_성분명": "추출된 값 또는 DATA_NOT_FOUND",
  ...
}
\`\`\`

정확히 일치하는 데이터만 추출하고, 추정하지 마세요.`;
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.ExtractCS = ExtractCS;
        window.extractCS = new ExtractCS();
        window.CS_DEFINITIONS = CS_DEFINITIONS;
    }

})();
