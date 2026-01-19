/**
 * Extract PH - PH 데이터 추출
 * js/extract/extract-ph.js
 *
 * Paragraph/Phrase (PH) 변수 추출 전문 모듈
 */

(function() {
    'use strict';

    // PH 변수 정의 - 데이터명세서_한국PSUR_master 기반 (11개)
    // PH = Phrase/서술문 데이터 (LLM이 생성하는 서술문)
    const PH_DEFINITIONS = {
        // === 원시자료 관련 서술문 (RAW19 통합 LineListing - 원시 필터) ===
        'PH4_원시자료서술문': {
            rawIds: ['RAW19', '표7_원시자료내역'],
            legacyRawIds: ['RAW14'],
            filterColumn: '원시/신속/정기',
            filterValue: '원시',
            description: '원시자료(KIDS) 이상사례 요약 서술문',
            type: 'A',
            guideline: 'RAW19 통합 LineListing에서 원시자료 필터링 후 요약. [표7_원시자료내역]을 간단하게 요약해서 기술함.',
            examples: [
                '본 보고기간 동안 한국의약품안전관리원에서 제공받은 자발적 보고자료(원시자료)로부터 [CS28_원시총환자수]명의 환자에서 [CS29_원시총사례수]건의 이상사례가 확인되었으며, 이 중 중대한 이상사례는 [CS30_원시중대한사례수]건이었다. 상세 정보는 별첨 3에 제시하였다.',
                '원시자료를 [CS31_원시자료신청일]에 신청하였으며, 결과를 확인하였을 때 본보고기간 동안의 원시자료 내역은 없었다.'
            ]
        },
        'PH5_원시자료서술문2': {
            rawIds: ['RAW19', '표7_원시자료내역'],
            legacyRawIds: ['RAW14'],
            filterColumn: '원시/신속/정기',
            filterValue: '원시',
            description: '원시자료 서술문 (표7 참조)',
            type: 'B',
            guideline: 'RAW19 통합 LineListing에서 원시자료 필터링 후 요약. [표7_원시자료내역]을 간단하게 요약해서 기술함.',
            examples: [
                '본 보고기간 동안 한국의약품안전관리원에서 제공받은 자발적 보고자료(원시자료)로부터 [CS28_원시총환자수]명의 환자에서 [CS29_원시총이상사례수]건의 이상사례가 확인되었으며, 세부내역은 다음 표 7에 제시 하였다. [CS2_회사명](주)가 KIDS로 보고한 사례는 제외하였다.',
                '원시자료를 [CS31_원시자료신청일]에 신청하였으며, 결과를 확인하였을 때 본보고기간 동안의 원시자료 내역은 없었다.'
            ]
        },

        // === 개별증례 분석문 (RAW19 통합 LineListing) ===
        'PH6_개별증례분석문': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'],
            description: '개별 이상사례 증례 분석 서술문',
            type: 'A',
            guideline: 'RAW19 통합 LineListing 전체를 분석하여 작성. 별첨3과 개별증례 분석문을 위한 backbone listing을 생성.',
            examples: ['별도 워드 문서 예시 참고']
        },

        // === 임상시험/연구 관련 서술문 ===
        'PH7_새로_분석된_의뢰의_시험': {
            rawIds: ['RAW8', 'RAW17', 'RAW10'],
            description: '보고기간 중 종료/분석완료된 임상시험(IIT 포함) 서술문',
            type: 'B',
            guideline: '종료된(or분석완료된) 회사가 의뢰한 임상시험과, 회사가 알고 있는 IIT를 기술. [RAW8_임상노출데이터]에서 보고기간 동안 종료/분석완료된 품목허가권자 의뢰 임상시험 확인. 시험번호, 제목, 진행상황, 안전성 데이터 요약.',
            examples: [
                '본 보고기간 동안 "[CS1_브랜드명]([CS0_성분명])"과 관련된 중요한 안전성 정보를 포함하거나 새롭게 분석된 회사 의뢰의 시험이 없어 해당사항이 없다.'
            ]
        },
        'PH7.1_새로분석된_비중재시험': {
            rawIds: ['RAW17', 'RAW11'],
            description: '보고기간 중 종료/분석완료된 NIS(비중재연구) 서술문',
            type: 'B',
            guideline: 'RAW데이터에서 보고기간 동안 종료/분석완료된 품목허가권자 의뢰 비중재적 연구 확인 (IIT 제외, NIS만). 시험번호, 제목, 진행상황, 안전성 데이터 요약.',
            examples: []
        },
        'PH8_시작또는진행중시험': {
            rawIds: ['RAW8', 'RAW17', 'RAW10'],
            description: '보고기간 중 시작/진행중인 임상시험(IIT 포함) 서술문',
            type: 'B',
            guideline: '보고기간동안 시작되었거나 진행중인 회사 의뢰 임상시험과 IIT를 기술. [RAW8_임상노출데이터]에서 보고기간동안 시작/진행중인 품목허가권자 의뢰 임상시험 확인.',
            examples: [
                '본 보고기간 동안 "[CS1_브랜드명]([CS0_성분명])"과 관련된 안전성 문제를 검토하기 위하여 특별히 계획되었거나 실행된 새로운 시험이 없어 해당사항이 없다.'
            ]
        },
        'PH8.1_시작또는진행중인_비중재시험': {
            rawIds: ['RAW17'],
            description: '보고기간 중 시작/진행중인 NIS(비중재연구) 서술문',
            type: 'B',
            guideline: 'RAW데이터에서 보고기간 동안 시작/진행중인 품목허가권자 의뢰 비중재연구 확인 (IIT 제외, NIS만). 시험번호, 제목, 진행상황, 안전성 데이터 요약.',
            examples: []
        },

        // === 문헌/유효성 관련 서술문 ===
        'PH9_문헌에발표된안전성': {
            rawIds: ['RAW9', 'RAW9.1'],
            description: '문헌 검토 결과 안전성 서술문',
            type: 'B',
            guideline: '[RAW9_문헌자료]에서 문헌제목, 저자, 출판년도, 회사 comment, abstract, 제목, 목적, 시험방법, 시험결과, 결론을 추출하여 분석. [RAW9.1_추가데이터_문헌자료상세] 상세 데이터가 있으면 함께 분석.',
            examples: ['별도 워드 문서 예시 참고']
        },
        'PH10_유효성관련정보': {
            rawIds: ['RAW19', 'RAW16'],
            legacyRawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'],
            description: 'Lack of efficacy (유효성 결여) 분석 서술문',
            type: 'A',
            guideline: 'RAW19 통합 LineListing 전체를 분석하여, [RAW16_MedDRA_SMQ_lack_of_efficacy] 기준으로 분석. PT 텀이 SMQ term에 해당하면 해당 증례 추출.',
            examples: [
                '본 보고기간 동안의 데이터에 대해 MedDRA SMQ(lack of efficacy)가 관련 사례를 식별하는 데 적용되었다. 검토결과 "[CS1_브랜드명]([CS0_성분명])"과 관련되어, 유효성이 없어 치명적인 결과를 초래하는 사례는 없었다.'
            ]
        },

        // === 종합평가 및 결론 ===
        'PH11_총괄평가문': {
            rawIds: ['GENERATED'],
            description: '종합적인 안전성 평가 서술문',
            type: 'A',
            guideline: '생성된 문서 전반을 평가함. 특정 raw데이터만 참고하지 않음. 예시 참고.',
            examples: [
                '보고기간 동안 수집된 안전성 정보 평가결과는 다음과 같다.\n\n중대한 이상사례 검토 결과 위해성 프로파일에 반영이 필요한 정보는 없었다.\n중대하지 않은 이상사례 검토 결과, 허가사항에 반영되지 않은 이상사례는 유의미한 안전성 정보로 판단하기에 충분한 정보를 가지고 있지 않았다.\n문헌 검토 결과, "[CS1_브랜드명]([CS0_성분명])" 주성분과 관련한 논문에서 기존에 알려진 안전성 정보와 다른 양상을 보이거나 새로운 유효성 및 안전성 정보를 포함하는 발표된 연구 결과가 없었다.'
            ]
        },
        'PH12_결론': {
            rawIds: ['GENERATED'],
            description: '결론 서술문 (유익성-위해성 평가 포함)',
            type: 'A',
            guideline: '생성된 문서 전반에서 결론의견을 작성함. 특정 raw데이터만 참고하지 않음. 예시 참고.',
            examples: [
                '본 보고기간([CS3_보고시작날짜] ~[CS4_보고종료날짜]) 동안 수집된 "[CS1_브랜드명]([CS0_성분명])"의 안전성 정보를 분석 평가한 결과, 안전성 프로파일이 허가사항에 적절하게 반영되어 있으며, "[CS1_브랜드명]([CS0_성분명])"의 유익성-위해성은 기존과 같이 유익성이 위해성을 상회하는 것으로 평가된다. 다만 평가된 안전성정보와 관련하여 허가사항 반영 여부에 대한 논의가 필요한 경우, 적극적으로 논의할 예정이다.'
            ]
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

            const variableInfo = Object.entries(definitions).map(([k, v]) => {
                let info = `- ${k}: ${v.description}`;
                if (v.guideline) {
                    info += `\n  지침: ${v.guideline}`;
                }
                if (v.examples && v.examples.length > 0 && v.examples[0]) {
                    info += `\n  예시: ${v.examples[0].substring(0, 150)}...`;
                }
                return info;
            }).join('\n');

            return `다음 문서에서 PH(Paragraph/Phrase) 서술문 데이터를 생성하세요.

## 문서 (${rawId})
${markdownContent.substring(0, 25000)}

## 생성 대상 변수
${variableInfo}

## 출력 형식
\`\`\`json
{
  "PH변수명": "생성된 서술문 또는 DATA_NOT_FOUND",
  ...
}
\`\`\`

지침과 예시를 참고하여 서술문을 생성하세요. 데이터가 없는 경우 DATA_NOT_FOUND를 반환하세요.`;
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.ExtractPH = ExtractPH;
        window.extractPH = new ExtractPH();
        window.PH_DEFINITIONS = PH_DEFINITIONS;
    }

})();
