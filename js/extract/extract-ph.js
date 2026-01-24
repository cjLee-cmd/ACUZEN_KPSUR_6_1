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
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW14'],
            filterColumn: '원시/신속/정기',
            filterValue: '원시',
            description: '원시자료(KIDS) 이상사례 요약 서술문',
            source: 'raw_data',
            type: 'A',
            guideline: 'RAW19 통합 LineListing에서 원시자료 필터링 후 요약. [표7_원시자료내역]을 간단하게 요약해서 기술함.',
            examples: [
                '본 보고기간 동안 한국의약품안전관리원에서 제공받은 자발적 보고자료(원시자료)로부터 [CS28_원시총환자수]명의 환자에서 [CS29_원시총사례수]건의 이상사례가 확인되었으며, 이 중 중대한 이상사례는 [CS30_원시중대한사례수]건이었다. 상세 정보는 별첨 3에 제시하였다.',
                '원시자료를 [CS31_원시자료신청일]에 신청하였으며, 결과를 확인하였을 때 본보고기간 동안의 원시자료 내역은 없었다.'
            ]
        },
        'PH5_원시자료서술문2': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW14'],
            filterColumn: '원시/신속/정기',
            filterValue: '원시',
            description: '원시자료 서술문 (표7 참조)',
            source: 'raw_data',
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
            source: 'raw_data',
            type: 'A',
            guideline: 'RAW19 통합 LineListing 전체를 분석하여 작성. 별첨3과 개별증례 분석문을 위한 backbone listing을 생성.',
            examples: ['별도 워드 문서 예시 참고']
        },

        // === 임상시험/연구 관련 서술문 ===
        'PH7_새로_분석된_의뢰의_시험': {
            rawIds: ['RAW8', 'RAW17'],  // RAW10 제거 (미정의 RAW ID)
            description: '보고기간 중 종료/분석완료된 임상시험(IIT 포함) 서술문',
            source: 'raw_data',
            type: 'B',
            guideline: '종료된(or분석완료된) 회사가 의뢰한 임상시험과, 회사가 알고 있는 IIT를 기술. [RAW8_임상노출데이터]에서 보고기간 동안 종료/분석완료된 품목허가권자 의뢰 임상시험 확인. 시험번호, 제목, 진행상황, 안전성 데이터 요약.',
            examples: [
                '본 보고기간 동안 "[CS1_브랜드명]([CS0_성분명])"과 관련된 중요한 안전성 정보를 포함하거나 새롭게 분석된 회사 의뢰의 시험이 없어 해당사항이 없다.'
            ]
        },
        'PH7.1_새로분석된_비중재시험': {
            rawIds: ['RAW17'],  // RAW11 제거 (미정의 RAW ID)
            description: '보고기간 중 종료/분석완료된 NIS(비중재연구) 서술문',
            source: 'raw_data',
            type: 'B',
            guideline: 'RAW데이터에서 보고기간 동안 종료/분석완료된 품목허가권자 의뢰 비중재적 연구 확인 (IIT 제외, NIS만). 시험번호, 제목, 진행상황, 안전성 데이터 요약.',
            examples: []
        },
        'PH8_시작또는진행중시험': {
            rawIds: ['RAW8', 'RAW17'],  // RAW10 제거 (미정의 RAW ID)
            description: '보고기간 중 시작/진행중인 임상시험(IIT 포함) 서술문',
            source: 'raw_data',
            type: 'B',
            guideline: '보고기간동안 시작되었거나 진행중인 회사 의뢰 임상시험과 IIT를 기술. [RAW8_임상노출데이터]에서 보고기간동안 시작/진행중인 품목허가권자 의뢰 임상시험 확인.',
            examples: [
                '본 보고기간 동안 "[CS1_브랜드명]([CS0_성분명])"과 관련된 안전성 문제를 검토하기 위하여 특별히 계획되었거나 실행된 새로운 시험이 없어 해당사항이 없다.'
            ]
        },
        'PH8.1_시작또는진행중인_비중재시험': {
            rawIds: ['RAW17'],
            description: '보고기간 중 시작/진행중인 NIS(비중재연구) 서술문',
            source: 'raw_data',
            type: 'B',
            guideline: 'RAW데이터에서 보고기간 동안 시작/진행중인 품목허가권자 의뢰 비중재연구 확인 (IIT 제외, NIS만). 시험번호, 제목, 진행상황, 안전성 데이터 요약.',
            examples: []
        },

        // === 문헌/유효성 관련 서술문 ===
        'PH9_문헌에발표된안전성': {
            rawIds: ['RAW9', 'RAW9.1'],
            description: '문헌 검토 결과 안전성 서술문',
            source: 'raw_data',
            type: 'B',
            guideline: '[RAW9_문헌자료]에서 문헌제목, 저자, 출판년도, 회사 comment, abstract, 제목, 목적, 시험방법, 시험결과, 결론을 추출하여 분석. [RAW9.1_추가데이터_문헌자료상세] 상세 데이터가 있으면 함께 분석.',
            examples: ['별도 워드 문서 예시 참고']
        },
        'PH10_유효성관련정보': {
            rawIds: ['RAW19', 'RAW16'],
            legacyRawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'],
            filterColumn: 'PT',
            filterSource: 'RAW16',
            filterType: 'SMQ_MATCH',
            description: 'Lack of efficacy (유효성 결여) 분석 서술문',
            source: 'raw_data',
            type: 'A',
            guideline: 'RAW19 통합 LineListing 전체를 분석하여, [RAW16_MedDRA_SMQ_lack_of_efficacy] 기준으로 분석. PT 텀이 SMQ term에 해당하면 해당 증례 추출.',
            examples: [
                '본 보고기간 동안의 데이터에 대해 MedDRA SMQ(lack of efficacy)가 관련 사례를 식별하는 데 적용되었다. 검토결과 "[CS1_브랜드명]([CS0_성분명])"과 관련되어, 유효성이 없어 치명적인 결과를 초래하는 사례는 없었다.'
            ]
        },

        // === 종합평가 및 결론 (생성형 - 전체 문서 분석 기반) ===
        'PH11_총괄평가문': {
            rawIds: ['GENERATED'],
            source: 'generated',  // 생성형: 전체 추출 데이터 기반 LLM 생성
            description: '종합적인 안전성 평가 서술문',
            type: 'A',
            guideline: '생성된 문서 전반을 평가함. 특정 raw데이터만 참고하지 않음. 예시 참고.',
            examples: [
                '보고기간 동안 수집된 안전성 정보 평가결과는 다음과 같다.\n\n중대한 이상사례 검토 결과 위해성 프로파일에 반영이 필요한 정보는 없었다.\n중대하지 않은 이상사례 검토 결과, 허가사항에 반영되지 않은 이상사례는 유의미한 안전성 정보로 판단하기에 충분한 정보를 가지고 있지 않았다.\n문헌 검토 결과, "[CS1_브랜드명]([CS0_성분명])" 주성분과 관련한 논문에서 기존에 알려진 안전성 정보와 다른 양상을 보이거나 새로운 유효성 및 안전성 정보를 포함하는 발표된 연구 결과가 없었다.'
            ]
        },
        'PH12_결론': {
            rawIds: ['GENERATED'],
            source: 'generated',  // 생성형: 전체 추출 데이터 기반 LLM 생성
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
            this.smqTermsCache = null; // RAW16 SMQ 용어 캐시
        }

        /**
         * PH 데이터 추출
         */
        async extract(markdownFiles, phDefinitions = null) {
            console.log('[ExtractPH] Extracting PH Data...');

            const definitions = phDefinitions || PH_DEFINITIONS;

            // RAW16 SMQ 용어 미리 로드 (PH10용)
            await this.loadSMQTerms(markdownFiles);

            for (const file of markdownFiles) {
                const rawId = file.rawId;
                const markdownContent = file.markdownContent || file.markdown || file.content;

                // 관련 RAW ID인지 확인 (legacyRawIds 포함)
                const relevantDefs = this.getRelevantDefinitions(rawId, definitions, markdownFiles);

                if (Object.keys(relevantDefs).length === 0) {
                    console.log(`[ExtractPH] Skipping ${rawId} - no PH definitions`);
                    continue;
                }

                // RAW19인 경우 필터링 적용
                if (rawId && rawId.startsWith('RAW19')) {
                    await this.processRAW19WithFilters(markdownContent, rawId, relevantDefs);
                } else {
                    // 일반 처리
                    const enrichedDefs = this.enrichDefinitionsWithFilter(relevantDefs);
                    const result = await this.base.extractFromMarkdown(
                        markdownContent,
                        rawId,
                        enrichedDefs
                    );

                    if (result.success) {
                        this.base.mergeExtractedData(result.data, 'PH');
                    }
                }
            }

            const phData = this.base.getData('PH');
            console.log(`[ExtractPH] PH Data extraction complete (${Object.keys(phData).length} variables)`);
            return phData;
        }

        /**
         * RAW19 LineListing을 필터링하여 PH 변수별로 처리
         */
        async processRAW19WithFilters(markdownContent, rawId, definitions) {
            console.log('[ExtractPH] Processing RAW19 with filters...');

            // LineListing 파싱
            const allRows = this.parseLineListingFromMarkdown(markdownContent);
            console.log(`[ExtractPH] Parsed ${allRows.length} rows from RAW19`);

            if (allRows.length === 0) {
                console.warn('[ExtractPH] No rows parsed from RAW19, falling back to standard extraction');
                const enrichedDefs = this.enrichDefinitionsWithFilter(definitions);
                const result = await this.base.extractFromMarkdown(markdownContent, rawId, enrichedDefs);
                if (result.success) {
                    this.base.mergeExtractedData(result.data, 'PH');
                }
                return;
            }

            // 각 PH 정의별로 필터링 적용
            for (const [varId, def] of Object.entries(definitions)) {
                let filteredRows = allRows;
                let filterDescription = '';

                // filterColumn/filterValue 필터 적용 (PH4, PH5)
                if (def.filterColumn && def.filterValue) {
                    filteredRows = this.filterByColumnValue(allRows, def.filterColumn, def.filterValue);
                    filterDescription = `${def.filterColumn}="${def.filterValue}"`;
                    console.log(`[ExtractPH] ${varId}: Filtered by ${filterDescription} → ${filteredRows.length} rows`);
                }

                // SMQ 필터 적용 (PH10)
                if (def.filterType === 'SMQ_MATCH' && def.filterColumn) {
                    filteredRows = this.filterBySMQ(filteredRows, def.filterColumn);
                    filterDescription = `SMQ match on ${def.filterColumn}`;
                    console.log(`[ExtractPH] ${varId}: Filtered by ${filterDescription} → ${filteredRows.length} rows`);
                }

                // 필터링된 데이터를 마크다운 테이블로 재구성
                const filteredMarkdown = this.rowsToMarkdownTable(filteredRows, allRows);

                // LLM으로 서술문 생성
                const prompt = this.buildFilteredPHPrompt(varId, def, filteredMarkdown, filteredRows.length, filterDescription);

                try {
                    const result = await this.base.extractFromMarkdown(
                        filteredMarkdown,
                        rawId,
                        { [varId]: def },
                        prompt
                    );

                    if (result.success) {
                        this.base.mergeExtractedData(result.data, 'PH');
                    }
                } catch (err) {
                    console.error(`[ExtractPH] Error extracting ${varId}:`, err);
                }
            }
        }

        /**
         * RAW16에서 SMQ 용어 로드
         */
        async loadSMQTerms(markdownFiles) {
            if (this.smqTermsCache) return;

            const raw16File = markdownFiles.find(f => f.rawId === 'RAW16' || f.rawId?.startsWith('RAW16'));
            if (!raw16File) {
                console.log('[ExtractPH] RAW16 not found, SMQ filtering will be skipped');
                this.smqTermsCache = new Set();
                return;
            }

            const content = raw16File.markdownContent || raw16File.markdown || raw16File.content || '';
            const smqTerms = new Set();

            // SMQ 테이블에서 PT 용어 추출
            const lines = content.split('\n');
            let inTable = false;
            let ptColumnIndex = -1;

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('|')) continue;

                const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());

                // 구분선 건너뛰기
                if (cells.every(cell => /^[-:\s]*$/.test(cell))) continue;

                // 헤더 행에서 PT 컬럼 인덱스 찾기
                if (!inTable) {
                    ptColumnIndex = cells.findIndex(c =>
                        c.toLowerCase().includes('pt') ||
                        c.includes('Preferred Term') ||
                        c.includes('선호용어')
                    );
                    if (ptColumnIndex === -1) ptColumnIndex = 0; // 기본값
                    inTable = true;
                    continue;
                }

                // PT 값 추출
                if (cells[ptColumnIndex]) {
                    const ptValue = cells[ptColumnIndex].trim();
                    if (ptValue && ptValue !== '-' && ptValue !== 'N/A') {
                        smqTerms.add(ptValue.toLowerCase());
                    }
                }
            }

            this.smqTermsCache = smqTerms;
            console.log(`[ExtractPH] Loaded ${smqTerms.size} SMQ terms from RAW16`);
        }

        /**
         * 컬럼 값으로 필터링
         */
        filterByColumnValue(rows, columnName, filterValue) {
            // 컬럼명 변형 처리
            const columnVariants = [
                columnName,
                columnName.replace(/\//g, '_'),
                columnName.replace(/\//g, '／'),
                ...this.getColumnNameVariants(columnName)
            ];

            return rows.filter(row => {
                for (const variant of columnVariants) {
                    const cellValue = row[variant];
                    if (cellValue !== undefined) {
                        // 값 매칭 (대소문자 무시, 부분 일치 허용)
                        const normalizedCell = String(cellValue).trim().toLowerCase();
                        const normalizedFilter = filterValue.toLowerCase();
                        if (normalizedCell === normalizedFilter || normalizedCell.includes(normalizedFilter)) {
                            return true;
                        }
                    }
                }
                return false;
            });
        }

        /**
         * 컬럼명 변형 목록 생성
         */
        getColumnNameVariants(columnName) {
            const variants = [];
            // 원시/신속/정기 → 다양한 표기법
            if (columnName === '원시/신속/정기') {
                variants.push('원시_신속_정기', '원시／신속／정기', '보고유형', '유형', 'Type', 'Report_Type');
            }
            return variants;
        }

        /**
         * SMQ 용어로 필터링 (PT 매칭)
         */
        filterBySMQ(rows, ptColumnName) {
            if (!this.smqTermsCache || this.smqTermsCache.size === 0) {
                console.warn('[ExtractPH] No SMQ terms loaded, returning all rows');
                return rows;
            }

            // PT 컬럼명 변형
            const ptVariants = [
                ptColumnName,
                'PT',
                'k-MedDRA PT_v28.1',
                'MedDRA PT',
                'Preferred Term',
                '선호용어',
                'PT_Name'
            ];

            return rows.filter(row => {
                for (const variant of ptVariants) {
                    const ptValue = row[variant];
                    if (ptValue) {
                        const normalizedPT = String(ptValue).trim().toLowerCase();
                        if (this.smqTermsCache.has(normalizedPT)) {
                            return true;
                        }
                    }
                }
                return false;
            });
        }

        /**
         * 마크다운에서 LineListing 테이블 파싱
         */
        parseLineListingFromMarkdown(markdownContent) {
            const rows = [];
            const lines = markdownContent.split('\n');
            let headers = [];
            let inTable = false;
            let headerParsed = false;

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('|')) continue;

                const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());

                // 구분선 감지 (모든 셀이 -, :, 공백으로만 구성)
                const isSeparator = cells.every(cell => /^[-:\s]*$/.test(cell));
                if (isSeparator) continue;

                if (!headerParsed) {
                    headers = cells;
                    headerParsed = true;
                    inTable = true;
                    continue;
                }

                if (inTable && cells.length > 0) {
                    const row = {};
                    headers.forEach((h, i) => { row[h] = cells[i] || ''; });
                    rows.push(row);
                }
            }

            return rows;
        }

        /**
         * 행 배열을 마크다운 테이블로 변환
         */
        rowsToMarkdownTable(rows, originalRows) {
            if (rows.length === 0) {
                return '데이터 없음 (필터 조건에 해당하는 행이 없습니다)';
            }

            // 원본에서 헤더 추출
            const headers = Object.keys(originalRows[0] || rows[0]);

            // 마크다운 테이블 생성
            let md = '| ' + headers.join(' | ') + ' |\n';
            md += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

            for (const row of rows) {
                md += '| ' + headers.map(h => row[h] || '').join(' | ') + ' |\n';
            }

            return md;
        }

        /**
         * 필터링된 데이터용 PH 프롬프트 생성
         */
        buildFilteredPHPrompt(varId, def, filteredMarkdown, rowCount, filterDescription) {
            return `## 작업: ${varId} 서술문 생성

## 변수 정보
- 변수ID: ${varId}
- 설명: ${def.description}
- 지침: ${def.guideline || '없음'}

## 필터 조건
- 적용된 필터: ${filterDescription || '없음'}
- 필터링된 행 수: ${rowCount}건

## 필터링된 데이터
${filteredMarkdown}

## 예시 서술문
${def.examples && def.examples.length > 0 ? def.examples.map((e, i) => `예시 ${i+1}: ${e}`).join('\n') : '예시 없음'}

## 출력 형식
\`\`\`json
{
  "${varId}": "생성된 서술문 (실제 데이터 기반)"
}
\`\`\`

## 규칙
1. 필터링된 데이터를 기반으로 서술문을 생성하세요.
2. 행 수가 0인 경우 "해당 데이터 없음" 형태로 작성하세요.
3. 예시의 형식을 참고하되, 실제 데이터 값을 사용하세요.
4. [CSxx_변수명] 형태의 참조 변수는 그대로 유지하세요.`;
        }

        /**
         * 필터 조건을 정의에 보강 (LLM 프롬프트에 포함되도록)
         */
        enrichDefinitionsWithFilter(definitions) {
            const enriched = {};

            Object.entries(definitions).forEach(([key, def]) => {
                enriched[key] = { ...def };

                // filterColumn/filterValue가 있으면 guideline에 필터 정보 추가
                if (def.filterColumn && def.filterValue) {
                    enriched[key].guideline = `${def.guideline || ''}\n[필터 조건] ${def.filterColumn} 컬럼에서 "${def.filterValue}" 값을 가진 행만 분석 대상입니다.`;
                }

                // SMQ 필터가 있으면 guideline에 SMQ 매칭 정보 추가
                if (def.filterType === 'SMQ_MATCH' && def.filterSource) {
                    enriched[key].guideline = `${def.guideline || ''}\n[SMQ 필터] ${def.filterSource}의 SMQ 터m 목록과 ${def.filterColumn} 컬럼 값을 매칭하여 해당 증례만 추출합니다.`;
                }
            });

            return enriched;
        }

        /**
         * 해당 RAW ID와 관련된 정의만 필터링 (legacyRawIds 폴백 지원)
         * @param {string} rawId - 현재 처리 중인 RAW ID
         * @param {Object} definitions - PH 정의 객체
         * @param {Array} markdownFiles - 전체 마크다운 파일 목록 (폴백 확인용)
         */
        getRelevantDefinitions(rawId, definitions, markdownFiles = []) {
            const relevant = {};
            const availableRawIds = new Set(markdownFiles.map(f => f.rawId));

            Object.entries(definitions).forEach(([key, def]) => {
                // 1. 기본 rawIds 매칭
                if (def.rawIds && def.rawIds.includes(rawId)) {
                    relevant[key] = def;
                    return;
                }

                // 2. legacyRawIds 폴백: 기본 rawIds가 없고, legacyRawIds에 현재 rawId가 포함된 경우
                if (def.legacyRawIds && def.legacyRawIds.includes(rawId)) {
                    // 기본 rawIds가 업로드되지 않은 경우에만 legacyRawIds 사용
                    const primaryRawIdsAvailable = def.rawIds && def.rawIds.some(id =>
                        availableRawIds.has(id) || [...availableRawIds].some(a => a?.startsWith(id))
                    );

                    if (!primaryRawIdsAvailable) {
                        console.log(`[ExtractPH] Using legacy fallback for ${key}: ${rawId} (primary: ${def.rawIds?.join(', ')})`);
                        relevant[key] = def;
                    }
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
