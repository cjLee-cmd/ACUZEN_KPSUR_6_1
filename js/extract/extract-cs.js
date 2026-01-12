/**
 * Extract CS - CS 데이터 추출
 * js/extract/extract-cs.js
 *
 * Context-Specific (CS) 변수 추출 전문 모듈
 */

(function() {
    'use strict';

    // CS 변수 정의 (CS0-CS24)
    const CS_DEFINITIONS = {
        'CS0_성분명': { rawIds: ['RAW1.1', 'RAW2.1'], description: '의약품 성분명' },
        'CS1_제품명': { rawIds: ['RAW1.1', 'RAW2.1'], description: '의약품 제품명' },
        'CS2_약효군': { rawIds: ['RAW1.1'], description: '약효 분류' },
        'CS3_적응증': { rawIds: ['RAW2.2', 'RAW1.1'], description: '허가된 적응증' },
        'CS4_제형': { rawIds: ['RAW1.1', 'RAW2.1'], description: '제형 정보' },
        'CS5_국내허가일자': { rawIds: ['RAW4'], description: '국내 최초 허가일' },
        'CS6_보고기간시작': { rawIds: ['RAW2.1'], description: 'PSUR 보고기간 시작일' },
        'CS7_보고기간종료': { rawIds: ['RAW2.1'], description: 'PSUR 보고기간 종료일' },
        'CS8_IBD': { rawIds: ['RAW4'], description: 'International Birth Date' },
        'CS9_제조사': { rawIds: ['RAW1.1', 'RAW4'], description: '제조사명' },
        'CS10_수입사': { rawIds: ['RAW1.1', 'RAW4'], description: '수입사명' },
        'CS11_효능효과': { rawIds: ['RAW2.2'], description: '효능효과 전문' },
        'CS12_용법용량': { rawIds: ['RAW2.1'], description: '용법용량 전문' },
        'CS13_사용상주의사항': { rawIds: ['RAW2.3'], description: '사용상의 주의사항' },
        'CS14_금기': { rawIds: ['RAW2.3'], description: '금기사항' },
        'CS15_이상반응': { rawIds: ['RAW2.3'], description: '이상반응 정보' },
        'CS16_상호작용': { rawIds: ['RAW2.3'], description: '상호작용 정보' },
        'CS17_저장방법': { rawIds: ['RAW1.1'], description: '저장방법' },
        'CS18_유효기간': { rawIds: ['RAW1.1'], description: '유효기간' },
        'CS19_허가번호': { rawIds: ['RAW4'], description: '품목허가번호' },
        'CS20_표준코드': { rawIds: ['RAW4'], description: '의약품 표준코드' },
        'CS21_ATC코드': { rawIds: ['RAW1.1', 'RAW4'], description: 'ATC 분류코드' },
        'CS22_KPIC코드': { rawIds: ['RAW4'], description: 'KPIC 코드' },
        'CS23_DUR정보': { rawIds: ['RAW1.1'], description: 'DUR 정보' },
        'CS24_보험코드': { rawIds: ['RAW4'], description: '보험 급여 코드' }
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
         */
        getRelevantDefinitions(rawId, definitions) {
            const relevant = {};

            Object.entries(definitions).forEach(([key, def]) => {
                if (def.rawIds && def.rawIds.includes(rawId)) {
                    relevant[key] = def;
                }
            });

            return relevant;
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
