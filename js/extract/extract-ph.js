/**
 * Extract PH - PH 데이터 추출
 * js/extract/extract-ph.js
 *
 * Paragraph/Phrase (PH) 변수 추출 전문 모듈
 */

(function() {
    'use strict';

    // PH 변수 정의 (PH1-PH15)
    const PH_DEFINITIONS = {
        'PH1_서론문': { rawIds: ['RAW2.1'], description: '서론 섹션 기본 문구' },
        'PH2_적응증서술문': { rawIds: ['RAW2.2'], description: '적응증 서술 문구' },
        'PH3_용법용량서술문': { rawIds: ['RAW2.1'], description: '용법용량 서술 문구' },
        'PH4_원시자료서술문': { rawIds: ['RAW14'], description: '원시자료 LineListing 서술 문구' },
        'PH5_문헌검토서술문': { rawIds: ['RAW9'], description: '문헌 검토 결과 서술 문구' },
        'PH6_신속보고서술문': { rawIds: ['RAW12', 'RAW13'], description: '신속보고 결과 서술 문구' },
        'PH7_정기보고서술문': { rawIds: ['RAW15'], description: '정기보고 결과 서술 문구' },
        'PH8_임상시험서술문': { rawIds: ['RAW8', 'RAW17'], description: '임상시험 현황 서술 문구' },
        'PH9_안전성조치서술문': { rawIds: ['RAW5', 'RAW6'], description: '안전성 조치 서술 문구' },
        'PH10_허가사항변경서술문': { rawIds: ['RAW7'], description: '허가사항 변경 서술 문구' },
        'PH11_총괄평가문': { rawIds: ['RAW2.1'], description: '종합 안전성 평가 문구' },
        'PH12_결론문': { rawIds: ['RAW2.1'], description: '결론 섹션 기본 문구' },
        'PH13_유익성위해성평가문': { rawIds: ['RAW2.1'], description: '유익성-위해성 평가 문구' },
        'PH14_추가조치권고문': { rawIds: ['RAW5', 'RAW6'], description: '추가 조치 권고 문구' },
        'PH15_허가현황서술문': { rawIds: ['RAW4'], description: '전세계 허가 현황 서술 문구' }
    };

    /**
     * ExtractPH - PH 데이터 추출 클래스
     */
    class ExtractPH {
        constructor(base) {
            this.base = base || window.extractBase;
        }

        /**
         * PH 데이터 추출
         */
        async extract(markdownFiles, phDefinitions = null) {
            console.log('[ExtractPH] Extracting PH Data...');

            const definitions = phDefinitions || PH_DEFINITIONS;

            for (const file of markdownFiles) {
                // 관련 RAW ID인지 확인
                const relevantDefs = this.getRelevantDefinitions(file.rawId, definitions);

                if (Object.keys(relevantDefs).length === 0) {
                    console.log(`[ExtractPH] Skipping ${file.rawId} - no PH definitions`);
                    continue;
                }

                const result = await this.base.extractFromMarkdown(
                    file.markdownContent || file.markdown || file.content,
                    file.rawId,
                    relevantDefs
                );

                if (result.success) {
                    this.base.mergeExtractedData(result.data, 'PH');
                }
            }

            const phData = this.base.getData('PH');
            console.log(`[ExtractPH] PH Data extraction complete (${Object.keys(phData).length} variables)`);
            return phData;
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
         * PH 정의 가져오기
         */
        getDefinitions() {
            return PH_DEFINITIONS;
        }

        /**
         * 특정 PH 변수 값 가져오기
         */
        getValue(variableId) {
            return this.base.getData('PH')[variableId];
        }

        /**
         * PH 데이터 전체 가져오기
         */
        getData() {
            return this.base.getData('PH');
        }

        /**
         * 필수 PH 변수 확인
         */
        validateRequired(requiredFields) {
            const phData = this.base.getData('PH');
            const missing = [];

            requiredFields.forEach(field => {
                if (!phData[field]) {
                    missing.push(field);
                }
            });

            return {
                valid: missing.length === 0,
                missing: missing
            };
        }

        /**
         * PH 추출 프롬프트 생성
         */
        buildPrompt(markdownContent, rawId) {
            const definitions = this.getRelevantDefinitions(rawId, PH_DEFINITIONS);

            return `다음 문서에서 PH(Paragraph/Phrase) 데이터를 추출하세요.

## 문서 (${rawId})
${markdownContent.substring(0, 25000)}

## 추출 대상 변수
${Object.entries(definitions).map(([k, v]) => `- ${k}: ${v.description}`).join('\n')}

## 출력 형식
\`\`\`json
{
  "PH1_서론문": "추출된 문구 또는 DATA_NOT_FOUND",
  ...
}
\`\`\`

문서에서 해당 서술문/문구를 정확히 추출하세요. 없는 경우 DATA_NOT_FOUND를 반환하세요.`;
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.ExtractPH = ExtractPH;
        window.extractPH = new ExtractPH();
        window.PH_DEFINITIONS = PH_DEFINITIONS;
    }

})();
