/**
 * Extract PH - PH 데이터 추출
 * js/extract/extract-ph.js
 *
 * Paragraph/Phrase (PH) 변수 추출 전문 모듈
 */

(function() {
    'use strict';

    // PH 변수 정의 - extractData.md 명세서 기반 (11개)
    // PH = Phrase/서술문 데이터 (LLM이 생성하는 서술문)
    const PH_DEFINITIONS = {
        // === 원시자료 관련 서술문 ===
        'PH4_원시자료서술문': {
            rawIds: ['RAW14', '표7_원시자료내역'],
            description: '원시자료(KIDS) 이상사례 요약 서술문',
            type: 'A',  // type A = 가공 필요
            example: '본 보고기간 동안 한국의약품안전관리원에서 제공받은 자발적 보고자료(원시자료)로부터 [CS28_원시총환자수]명의 환자에서 [CS29_원시총이상사례수]건의 이상사례가 확인되었으며...'
        },
        'PH5_원시자료서술문2': {
            rawIds: ['RAW14', '표7_원시자료내역'],
            description: '원시자료 서술문 (표7 참조)',
            type: 'B'
        },

        // === 개별증례 분석문 ===
        'PH6_개별증례분석문': {
            rawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'],
            description: '개별 이상사례 증례 분석 서술문',
            type: 'A'  // 모든 LineListing 합쳐서 분석
        },

        // === 임상시험/연구 관련 서술문 ===
        'PH7_새로분석된의뢰의시험': {
            rawIds: ['RAW8', 'RAW17'],
            description: '보고기간 중 종료/분석완료된 임상시험(IIT 포함) 서술문',
            type: 'B',
            example: '본 보고기간 동안 "[CS1_브랜드명]([CS0_성분명])"과 관련된 중요한 안전성 정보를 포함하거나 새롭게 분석된 회사 의뢰의 시험이 없어 해당사항이 없다.'
        },
        'PH7_.1_새로분석된비중재시험': {
            rawIds: ['RAW17'],
            description: '보고기간 중 종료/분석완료된 NIS(비중재연구) 서술문',
            type: 'B'
        },
        'PH8_시작또는진행중시험': {
            rawIds: ['RAW8', 'RAW17'],
            description: '보고기간 중 시작/진행중인 임상시험(IIT 포함) 서술문',
            type: 'B',
            example: '본 보고기간 동안 "[CS1_브랜드명]([CS0_성분명])"과 관련된 안전성 문제를 검토하기 위하여 특별히 계획되었거나 실행된 새로운 시험이 없어 해당사항이 없다.'
        },
        'PH8_.1_시작또는진행중인비중재시험': {
            rawIds: ['RAW17'],
            description: '보고기간 중 시작/진행중인 NIS(비중재연구) 서술문',
            type: 'B'
        },

        // === 문헌/유효성 관련 서술문 ===
        'PH9_문헌에발표된안전성': {
            rawIds: ['RAW9'],
            description: '문헌 검토 결과 안전성 서술문',
            type: 'B'
        },
        'PH10_유효성관련정보': {
            rawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15', 'RAW16'],
            description: 'Lack of efficacy (유효성 결여) 분석 서술문',
            type: 'A',  // SMQ 기반 분석 필요
            example: '본 보고기간 동안의 데이터에 대해 MedDRA SMQ(lack of efficacy)가 관련 사례를 식별하는 데 적용되었다...'
        },

        // === 종합평가 및 결론 ===
        'PH11_총괄평가문': {
            rawIds: ['GENERATED'],
            description: '종합적인 안전성 평가 서술문',
            type: 'A',  // 전체 문서 기반 생성
            example: '보고기간 동안 수집된 안전성 정보 평가결과는 다음과 같다...'
        },
        'PH12_결론': {
            rawIds: ['GENERATED'],
            description: '결론 서술문 (유익성-위해성 평가 포함)',
            type: 'A',  // 전체 문서 기반 생성
            example: '본 보고기간([CS3_보고시작날짜] ~[CS4_보고종료날짜]) 동안 수집된 "[CS1_브랜드명]([CS0_성분명])"의 안전성 정보를 분석 평가한 결과...'
        }
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
