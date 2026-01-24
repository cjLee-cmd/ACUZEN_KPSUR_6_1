/**
 * Extract Tables - 표 데이터 추출
 * js/extract/extract-tables.js
 *
 * Table 데이터 추출 전문 모듈
 */

(function() {
    'use strict';

    // Table 정의 - 데이터명세서_한국PSUR_master 기반 (7개)
    // 표 데이터는 RAW 데이터에서 추출하여 가공
    const TABLE_DEFINITIONS = {
        // === 시판후 노출 관련 표 (RAW3) ===
        '표2_연도별판매량': {
            rawIds: ['RAW3'],
            description: '연도별 판매량 표',
            columns: ['연도', '판매량', '단위'],
            dependencies: ['CS19_시판후노출count시작날짜', 'CS19.1_시판후노출count종료날짜'],
            guideline: '[CS19_시판후노출count시작날짜]와 [CS19.1_시판후노출count종료날짜]를 고려해서 표의 맨상단 가로행 연도 결정. 예: 2020년 6월1일~2025년 4월30일이면, 가로행은 총 6칸(총합계 제외)이고 연도는 2020년(6월~12월), 2021년, 2022년, 2023년, 2024년, 2025년(1월~4월)로 표기.',
            examples: ['별도 워드 문서 예시 참고']
        },
        '표3_연평균환자노출': {
            rawIds: ['RAW3', 'RAW1.1', 'RAW2.1'],
            description: '연 평균 환자 노출 추정표',
            columns: ['항목', '수치', '비고'],
            dependencies: ['표2_연도별판매량', 'CS20_1일사용량', 'CS21_환자1명당사용량'],
            guideline: 'DDD(Defined Daily Dose)가 없는 경우: 1) 엑셀에서 기간별 월별 데이터를 국가별로 추출하여 월합 계산, 2) 기간별(연도별) 총합 계산, 3) 전체기간 판매량 총합을 총개월수로 나눈 후 12를 곱해 연평균판매량 계산, 4) 연평균판매량을 환자1명당연간사용량으로 나눠 연평균환자노출 계산.',
            examples: ['별도 워드 문서 예시 참고']
        },

        // === 이상사례 보고 내역 표 (RAW19 통합LineListing 사용) ===
        '표5_신속보고내역': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13'],  // 하위 호환용
            description: '신속보고 이상사례 내역 표',
            columns: ['순번', '보고일자', '관리번호', '이상사례명', '중대성', '비고'],
            filterColumn: '원시/신속/정기',
            filterValue: '신속',
            columnMapping: {
                '순번': 'index',
                '보고일자': [
                    'Report_Date', '보고일자', 'report_date', 'ReportDate',
                    '보고 일자', '보고_일자', 'Date', 'date', '일자'
                ],
                '관리번호': [
                    'Report_Number', '관리번호', 'report_number', 'Case_Number',
                    'Case_ID', 'CASE_ID', '사례번호', 'case_id', '케이스번호',
                    '관리 번호', '관리_번호', 'CaseNumber', 'Report_No'
                ],
                '이상사례명': [
                    'k-MedDRA PT_v28.1', 'PT', 'Preferred_Term', '이상사례명',
                    'PT_Name', 'MedDRA PT', '선호용어', 'preferred_term',
                    '이상사례', 'AE_Term', 'Event_Term', '이상 사례명'
                ],
                '중대성': [
                    'Seriousness', '중대성', 'seriousness', 'Serious', 'serious',
                    '중대함', '중대여부', 'Is_Serious', 'SERIOUS', '중대 여부'
                ],
                '비고': ['비고', 'Remark', 'Note', 'remark', 'note', 'Comment', '기타', '메모']
            },
            guideline: 'RAW19 통합LineListing에서 "원시/신속/정기" 컬럼이 "신속"인 행만 필터링하여 추출.',
            examples: ['별도 워드 문서 예시 참고']
        },
        '표6_정기보고내역': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW15'],  // 하위 호환용
            description: '정기보고 이상사례 내역 표',
            columns: ['순번', '보고일자', '관리번호', '이상사례명', '중대성', '비고'],
            filterColumn: '원시/신속/정기',
            filterValue: '정기',
            columnMapping: {
                '순번': 'index',
                '보고일자': [
                    'Report_Date', '보고일자', 'report_date', 'ReportDate',
                    '보고 일자', '보고_일자', 'Date', 'date', '일자'
                ],
                '관리번호': [
                    'Report_Number', '관리번호', 'report_number', 'Case_Number',
                    'Case_ID', 'CASE_ID', '사례번호', 'case_id', '케이스번호',
                    '관리 번호', '관리_번호', 'CaseNumber', 'Report_No'
                ],
                '이상사례명': [
                    'k-MedDRA PT_v28.1', 'PT', 'Preferred_Term', '이상사례명',
                    'PT_Name', 'MedDRA PT', '선호용어', 'preferred_term',
                    '이상사례', 'AE_Term', 'Event_Term', '이상 사례명'
                ],
                '중대성': [
                    'Seriousness', '중대성', 'seriousness', 'Serious', 'serious',
                    '중대함', '중대여부', 'Is_Serious', 'SERIOUS', '중대 여부'
                ],
                '비고': ['비고', 'Remark', 'Note', 'remark', 'note', 'Comment', '기타', '메모']
            },
            guideline: 'RAW19 통합LineListing에서 "원시/신속/정기" 컬럼이 "정기"인 행만 필터링하여 추출.',
            examples: ['별도 워드 문서 예시 참고']
        },
        '표7_원시자료내역': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW14'],  // 하위 호환용
            description: '원시자료(KIDS) 이상사례 내역 표',
            columns: ['순번', '보고일자', '관리번호', '이상사례명', '중대성', '비고'],
            filterColumn: '원시/신속/정기',
            filterValue: '원시',
            columnMapping: {
                '순번': 'index',
                '보고일자': [
                    'Report_Date', '보고일자', 'report_date', 'ReportDate',
                    '보고 일자', '보고_일자', 'Date', 'date', '일자'
                ],
                '관리번호': [
                    'Report_Number', '관리번호', 'report_number', 'Case_Number',
                    'Case_ID', 'CASE_ID', '사례번호', 'case_id', '케이스번호',
                    '관리 번호', '관리_번호', 'CaseNumber', 'Report_No'
                ],
                '이상사례명': [
                    'k-MedDRA PT_v28.1', 'PT', 'Preferred_Term', '이상사례명',
                    'PT_Name', 'MedDRA PT', '선호용어', 'preferred_term',
                    '이상사례', 'AE_Term', 'Event_Term', '이상 사례명'
                ],
                '중대성': [
                    'Seriousness', '중대성', 'seriousness', 'Serious', 'serious',
                    '중대함', '중대여부', 'Is_Serious', 'SERIOUS', '중대 여부'
                ],
                '비고': ['비고', 'Remark', 'Note', 'remark', 'note', 'Comment', '기타', '메모']
            },
            guideline: 'RAW19 통합LineListing에서 "원시/신속/정기" 컬럼이 "원시"인 행만 필터링하여 추출.',
            examples: ['별도 워드 문서 예시 참고']
        },

        // === 이상사례 건수 요약 표 (RAW19 사용) ===
        '표8_모든이상사례건수': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'],  // 하위 호환용
            description: '모든 이상사례 건수 요약 표 (중대/비중대)',
            columns: ['구분', '중대한(건)', '중대하지않은(건)', '총건수', '비율(%)'],
            type: 'A',
            aggregationType: 'count',  // 집계 유형: count
            sourceColumnMapping: {
                // 중대성 컬럼
                '중대성': [
                    'Seriousness', '중대성', 'seriousness', 'Serious', 'serious',
                    '중대함', '중대여부', 'Is_Serious', 'SERIOUS'
                ],
                // 보고유형 컬럼
                '보고유형': [
                    '원시/신속/정기', '원시_신속_정기', '원시／신속／정기',
                    '보고유형', '보고 유형', '보고_유형', 'Report_Type', 'report_type',
                    '유형', 'Type', 'type', '구분', 'Category'
                ],
                // 환자/증례 식별자 컬럼
                '관리번호': [
                    'Report_Number', '관리번호', 'report_number', 'Case_Number',
                    'Case_ID', 'CASE_ID', '사례번호', 'case_id'
                ],
                // PT/이상사례 컬럼
                '이상사례명': [
                    'k-MedDRA PT_v28.1', 'PT', 'Preferred_Term', '이상사례명',
                    'PT_Name', 'MedDRA PT', '선호용어', 'preferred_term'
                ],
                // SOC 컬럼
                'SOC': [
                    'k-MedDRA SOC_v28.1', 'SOC', 'System_Organ_Class',
                    '기관계분류', 'SOC_Name', 'soc'
                ],
                // ADR 관련 컬럼
                'ADR_flag': [
                    'ADR_flag', 'ADR Flag', 'Causality', '인과관계',
                    '약물이상반응여부', 'Is_ADR', 'Related', 'related'
                ]
            },
            seriousnessValues: {
                '중대함': ['예', 'Yes', 'Y', '중대함', 'Serious', 'serious', '1', 'TRUE', 'true'],
                '중대하지않음': ['아니오', 'No', 'N', '비중대', 'Non-serious', 'non-serious', '0', 'FALSE', 'false', '중대하지 않음']
            },
            adrValues: {
                '관련': ['related', 'Related', '관련', '관련있음', 'Yes', 'yes', '예', '1', 'TRUE', 'true'],
                '비관련': ['unrelated', 'Unrelated', '비관련', '관련없음', 'No', 'no', '아니오', '0', 'FALSE', 'false']
            },
            outputRows: [
                { '구분': '신속보고', filterValue: '신속' },
                { '구분': '정기보고', filterValue: '정기' },
                { '구분': '원시자료', filterValue: '원시' },
                { '구분': '총합계', filterValue: null }  // 전체 합계
            ],
            guideline: 'RAW19 통합LineListing 전체 데이터에서 Seriousness 컬럼 기준으로 중대/비중대 건수 집계. "예"=중대, "아니오"=비중대. 비율(%)은 총합계 대비 계산.',
            examples: ['별도 워드 문서 예시 참고']
        },

        // === SOC별 분석 표 (RAW19 사용) - 템플릿 14_별첨.md 기준 ===
        '표9_SOC별건수': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'],  // 하위 호환용
            description: 'SOC/PT별 이상사례 및 약물이상반응 건수 표 (환자수/건수 형식)',
            columns: [
                '구분 (SOC / PT)',
                '중대한 이상사례 (환자수/건수)',
                '중대한 약물이상반응 (환자수/건수)',
                '중대하지 않은 이상사례 (환자수/건수)',
                '중대하지 않은 약물이상반응 (환자수/건수)',
                '총-이상사례 (환자수/건수)',
                '총-약물이상반응 (환자수/건수)'
            ],
            type: 'A',
            columnMapping: {
                'SOC': 'k-MedDRA SOC_v28.1',
                'PT': 'k-MedDRA PT_v28.1',
                '중대성': 'Seriousness',
                '약물이상반응': 'ADR_flag',
                '환자명': 'Patient_Name'
            },
            guideline: 'RAW19 통합LineListing에서 SOC/PT별 피벗 테이블 생성. ' +
                       'Seriousness="예"→중대, "아니오"→비중대. ' +
                       'ADR_flag="예"→약물이상반응, 그 외→이상사례. ' +
                       'Patient_Name 기준 환자수 집계, 전체 행수가 건수. ' +
                       '형식: "환자수/건수" (예: 14/22)',
            examples: ['| **Blood and lymphatic system disorders** | 14/22 | 11/19 | 14/14 | 11/11 | 28/36 | 22/30 |']
        }
    };

    /**
     * ExtractTables - Table 데이터 추출 클래스
     */
    class ExtractTables {
        constructor(base) {
            this.base = base || window.extractBase;
        }

        /**
         * Table 데이터 추출
         */
        async extract(markdownFiles, tableDefinitions = null) {
            console.log('[ExtractTables] Extracting Table Data...');

            const definitions = tableDefinitions || TABLE_DEFINITIONS;

            for (const file of markdownFiles) {
                // 관련 RAW ID인지 확인 (legacyRawIds 폴백 지원)
                const relevantDefs = this.getRelevantDefinitions(file.rawId, definitions, markdownFiles);

                if (Object.keys(relevantDefs).length === 0) {
                    console.log(`[ExtractTables] Skipping ${file.rawId} - no Table definitions`);
                    continue;
                }

                const markdownContent = file.markdownContent || file.markdown || file.content;

                // RAW19인 경우 표9를 코드 기반으로 직접 집계
                if (file.rawId && file.rawId.startsWith('RAW19') && relevantDefs['표9_SOC별건수']) {
                    console.log('[ExtractTables] Processing 표9 with code-based aggregation...');

                    try {
                        // 마크다운에서 LineListing 데이터 파싱
                        const lineListingRows = this.parseLineListingFromMarkdown(markdownContent);
                        console.log(`[ExtractTables] Parsed ${lineListingRows.length} rows from LineListing`);

                        if (lineListingRows.length > 0) {
                            // 코드 기반 집계
                            const table9Data = this.aggregateTable9FromLineListing(lineListingRows);
                            console.log(`[ExtractTables] Aggregated 표9: ${table9Data.data.length} rows`);

                            // 결과 저장
                            this.base.mergeExtractedData({
                                '표9_SOC별건수': JSON.stringify(table9Data)
                            }, 'Table');

                            // 표5-표8은 LLM 추출 (표9 제외)
                            const otherDefs = { ...relevantDefs };
                            delete otherDefs['표9_SOC별건수'];

                            if (Object.keys(otherDefs).length > 0) {
                                const result = await this.base.extractFromMarkdown(
                                    markdownContent,
                                    file.rawId,
                                    otherDefs
                                );

                                if (result.success) {
                                    this.base.mergeExtractedData(result.data, 'Table');
                                }
                            }

                            continue;
                        }
                    } catch (err) {
                        console.error('[ExtractTables] Code-based aggregation failed, falling back to LLM:', err);
                    }
                }

                // 기본 LLM 추출
                const result = await this.base.extractFromMarkdown(
                    markdownContent,
                    file.rawId,
                    relevantDefs
                );

                if (result.success) {
                    this.base.mergeExtractedData(result.data, 'Table');
                }
            }

            const tableData = this.base.getData('Table');
            console.log(`[ExtractTables] Table Data extraction complete (${Object.keys(tableData).length} tables)`);
            return tableData;
        }

        /**
         * 마크다운에서 표 직접 파싱
         */
        parseTablesFromMarkdown(markdownContent) {
            const tables = [];
            const tableRegex = /\|[^\n]+\|\n\|[-:\s|]+\|\n((\|[^\n]+\|\n)+)/g;

            let match;
            while ((match = tableRegex.exec(markdownContent)) !== null) {
                const tableText = match[0];
                const parsedTable = this.parseMarkdownTable(tableText);
                if (parsedTable) {
                    tables.push(parsedTable);
                }
            }

            return tables;
        }

        /**
         * RAW3 시판후 판매 데이터에서 모든 연도 테이블 추출 및 병합
         */
        parseAllYearTablesFromRAW3(markdownContent) {
            // 연도별 섹션 분리 (## 2017, ## 2018 등)
            const yearSectionRegex = /## (\d{4})\s*\n([\s\S]*?)(?=## \d{4}|$)/g;
            const allYearData = {
                headers: ['Month', 'Korea', 'Japan', 'Taiwan', 'Malaysia', 'USA', 'Canada', 'India', 'Total'],
                rows: [],
                rowCount: 0,
                yearSummary: {} // 연도별 합계
            };

            let match;
            while ((match = yearSectionRegex.exec(markdownContent)) !== null) {
                const year = match[1];
                const sectionContent = match[2];

                // 해당 섹션에서 테이블 추출
                const tableRegex = /\|[^\n]+\|\n\|[-:\s|]+\|\n((\|[^\n]+\|\n)+)/;
                const tableMatch = sectionContent.match(tableRegex);

                if (tableMatch) {
                    const parsedTable = this.parseMarkdownTable(tableMatch[0]);
                    if (parsedTable && parsedTable.rows) {
                        // 각 행에 연도 정보 추가하여 저장
                        parsedTable.rows.forEach(row => {
                            // Total 행은 연도별 합계로 저장
                            if (row.Month && row.Month.includes('Total')) {
                                allYearData.yearSummary[year] = {
                                    year: year,
                                    Korea: row.Korea || '0',
                                    Japan: row.Japan || '0',
                                    Taiwan: row.Taiwan || '0',
                                    Malaysia: row.Malaysia || '0',
                                    USA: row.USA || '0',
                                    Canada: row.Canada || '0',
                                    India: row.India || '0',
                                    Total: row.Total || '0'
                                };
                            }
                            allYearData.rows.push(row);
                        });
                    }
                }
            }

            allYearData.rowCount = allYearData.rows.length;
            return allYearData;
        }

        /**
         * 연도별 합계 테이블 생성 (표2_연도별판매량용)
         */
        createYearlySummaryTable(markdownContent, startYear = null, endYear = null) {
            const allData = this.parseAllYearTablesFromRAW3(markdownContent);

            // 연도별 합계만 추출
            const summaryRows = [];
            const years = Object.keys(allData.yearSummary).sort();

            years.forEach(year => {
                const yearNum = parseInt(year);
                // 시작/종료 연도 필터링
                if (startYear && yearNum < startYear) return;
                if (endYear && yearNum > endYear) return;

                const data = allData.yearSummary[year];
                summaryRows.push({
                    연도: year,
                    Korea: data.Korea,
                    Japan: data.Japan,
                    Taiwan: data.Taiwan,
                    Malaysia: data.Malaysia,
                    USA: data.USA,
                    Canada: data.Canada,
                    India: data.India,
                    Total: data.Total
                });
            });

            return {
                headers: ['연도', 'Korea', 'Japan', 'Taiwan', 'Malaysia', 'USA', 'Canada', 'India', 'Total'],
                rows: summaryRows,
                rowCount: summaryRows.length,
                allYearData: allData // 전체 월별 데이터도 포함
            };
        }

        /**
         * 마크다운 테이블 파싱
         */
        parseMarkdownTable(tableText) {
            const lines = tableText.trim().split('\n');
            if (lines.length < 3) return null;

            // 헤더 파싱
            const headerLine = lines[0];
            const headers = headerLine.split('|').filter(cell => cell.trim()).map(cell => cell.trim());

            // 데이터 행 파싱 (구분선 제외)
            const rows = [];
            for (let i = 2; i < lines.length; i++) {
                const cells = lines[i].split('|').filter(cell => cell.trim()).map(cell => cell.trim());
                if (cells.length > 0) {
                    const row = {};
                    headers.forEach((header, idx) => {
                        row[header] = cells[idx] || '';
                    });
                    rows.push(row);
                }
            }

            return {
                headers: headers,
                rows: rows,
                rowCount: rows.length
            };
        }

        /**
         * 해당 RAW ID와 관련된 정의만 필터링
         * @param {string} rawId - 현재 처리 중인 RAW ID
         * @param {object} definitions - 테이블 정의 객체
         * @param {Array} markdownFiles - 사용 가능한 마크다운 파일 목록 (legacyRawIds 폴백용)
         */
        getRelevantDefinitions(rawId, definitions, markdownFiles = []) {
            const relevant = {};
            const availableRawIds = new Set(markdownFiles.map(f => f.rawId));

            Object.entries(definitions).forEach(([key, def]) => {
                const actualRawIds = def.rawIds || [];

                // 1. 기본 rawIds 매칭
                if (actualRawIds.includes(rawId)) {
                    relevant[key] = def;
                    return;
                }

                // 2. legacyRawIds 폴백: 기본 rawIds가 없고, legacyRawIds에 현재 rawId가 포함된 경우
                if (def.legacyRawIds && def.legacyRawIds.includes(rawId)) {
                    // 기본 rawIds의 파일이 존재하는지 확인
                    const primaryRawIdsAvailable = actualRawIds.some(id =>
                        availableRawIds.has(id) || [...availableRawIds].some(a => a?.startsWith(id))
                    );

                    // 기본 rawIds 파일이 없으면 legacy 사용
                    if (!primaryRawIdsAvailable) {
                        console.log(`[ExtractTables] Using legacy fallback: ${rawId} for ${key}`);
                        relevant[key] = def;
                    }
                }
            });

            return relevant;
        }

        /**
         * Table 정의 가져오기
         */
        getDefinitions() {
            return TABLE_DEFINITIONS;
        }

        /**
         * 특정 Table 데이터 가져오기
         */
        getValue(tableId) {
            return this.base.getData('Table')[tableId];
        }

        /**
         * Table 데이터 전체 가져오기
         */
        getData() {
            return this.base.getData('Table');
        }

        /**
         * 필수 Table 확인
         */
        validateRequired(requiredFields) {
            const tableData = this.base.getData('Table');
            const missing = [];

            requiredFields.forEach(field => {
                if (!tableData[field]) {
                    missing.push(field);
                }
            });

            return {
                valid: missing.length === 0,
                missing: missing
            };
        }

        /**
         * Table 추출 프롬프트 생성
         */
        buildPrompt(markdownContent, rawId) {
            const definitions = this.getRelevantDefinitions(rawId, TABLE_DEFINITIONS);

            // 표9인 경우 전용 프롬프트 사용
            if (definitions['표9_SOC별건수'] && rawId.startsWith('RAW19')) {
                return this.buildTable9Prompt(markdownContent);
            }

            const tableInfo = Object.entries(definitions).map(([k, v]) => {
                let info = `- ${k}: ${v.description}`;
                info += `\n  컬럼: ${v.columns.join(', ')}`;
                if (v.guideline) {
                    info += `\n  지침: ${v.guideline}`;
                }
                if (v.filterColumn && v.filterValue) {
                    info += `\n  필터: "${v.filterColumn}" 컬럼이 "${v.filterValue}"인 행만 추출`;
                }
                return info;
            }).join('\n\n');

            return `## 지시사항
다음 문서에서 표(Table) 데이터를 추출하세요.

## 절대 규칙
1. 데이터를 요약하거나 생략하지 마세요. 모든 행을 빠짐없이 출력하세요.
2. 원본 데이터의 값을 그대로 사용하세요. 임의로 수정하지 마세요.
3. 숫자 계산이 필요한 경우 정확히 계산하세요.

## 문서 (${rawId})
${markdownContent}

## 추출 대상 표
${tableInfo}

## 출력 형식 (JSON)
\`\`\`json
{
  "표명": {
    "headers": ["컬럼1", "컬럼2", "컬럼3"],
    "rows": [
      {"컬럼1": "값1", "컬럼2": "값2", "컬럼3": "값3"},
      {"컬럼1": "값1", "컬럼2": "값2", "컬럼3": "값3"}
    ]
  }
}
\`\`\`

표가 없는 경우 해당 키에 "DATA_NOT_FOUND"를 반환하세요.`;
        }

        /**
         * 표9 전용 프롬프트 생성 (SOC/PT별 이상사례 집계)
         */
        buildTable9Prompt(markdownContent) {
            return `## 작업: 표9_SOC별건수 집계표 생성

## 절대 규칙 (반드시 준수)
1. **데이터를 요약하거나 생략하지 마세요.** 모든 SOC와 PT를 빠짐없이 출력하세요.
2. **환자수와 건수를 구분하세요:**
   - 환자수 = 동일 Report_Number를 가진 행은 1명으로 계산 (중복 제거)
   - 건수 = 총 행의 개수
3. **이상사례(AE)와 약물이상반응(ADR)을 구분하세요:**
   - 이상사례(AE): 모든 행이 해당 (전체)
   - 약물이상반응(ADR): ADR_flag가 "related"인 행만 해당
   - ADR_flag가 "unrelated"인 행은 이상사례에만 포함, 약물이상반응에는 미포함
4. **중대성(Seriousness)을 구분하세요:**
   - 중대함: Seriousness = "예", "Yes", "Y", "중대함"
   - 중대하지 않음: Seriousness = "아니오", "No", "N", "비중대"

## 원본 데이터 (RAW19 통합LineListing)
${markdownContent}

## 집계 방법

### Step 1: 각 행 분류
| Report_Number | SOC | PT | Seriousness | ADR_flag | → 분류 |
|---------------|-----|----|-----------  |----------|--------|
| KR-AA-001 | 위장관 장애 | 구역 | 아니오 | related | 비중대 AE + ADR |
| KR-AA-002 | 위장관 장애 | 구토 | 예 | unrelated | 중대 AE만 (ADR 아님) |
| KR-AA-001 | 위장관 장애 | 복통 | 아니오 | related | 비중대 AE + ADR (같은 환자) |

### Step 2: SOC별 집계 (위 예시 기준)
- **위장관 장애** SOC:
  - 중대한 이상사례: 1명/1건 (KR-AA-002)
  - 중대한 약물이상반응: 0명/0건 (unrelated이므로 ADR 아님)
  - 중대하지 않은 이상사례: 1명/2건 (KR-AA-001이 2행이지만 1명)
  - 중대하지 않은 약물이상반응: 1명/2건 (둘 다 related)

### Step 3: PT별 집계 (SOC 하위에 들여쓰기)
- 구역: 0/0 | 0/0 | 1/1 | 1/1 | 1/1 | 1/1
- 구토: 1/1 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0
- 복통: 0/0 | 0/0 | 1/1 | 1/1 | 1/1 | 1/1

## 출력 형식

### 7열 구조
| 구분 (SOC / PT) | 중대한 이상사례 | 중대한 약물이상반응 | 중대하지 않은 이상사례 | 중대하지 않은 약물이상반응 | 총-이상사례 | 총-약물이상반응 |

### 값 형식
- 모든 값은 "환자수/건수" 형식 (예: "3/5" = 3명의 환자에서 5건)
- SOC 행은 **굵게** 표시 (마크다운: **SOC명**)
- PT 행은 들여쓰기 (마크다운: &nbsp;&nbsp; PT명)

## 출력 JSON 형식
\`\`\`json
{
  "표9_SOC별건수": {
    "headers": [
      "구분 (SOC / PT)",
      "중대한 이상사례 (환자수/건수)",
      "중대한 약물이상반응 (환자수/건수)",
      "중대하지 않은 이상사례 (환자수/건수)",
      "중대하지 않은 약물이상반응 (환자수/건수)",
      "총-이상사례 (환자수/건수)",
      "총-약물이상반응 (환자수/건수)"
    ],
    "data": [
      {
        "category": "**각종 위장관 장애**",
        "serious_ae": "1/1",
        "serious_adr": "0/0",
        "nonserious_ae": "1/2",
        "nonserious_adr": "1/2",
        "total_ae": "2/3",
        "total_adr": "1/2"
      },
      {
        "category": "&nbsp;&nbsp; 구역",
        "serious_ae": "0/0",
        "serious_adr": "0/0",
        "nonserious_ae": "1/1",
        "nonserious_adr": "1/1",
        "total_ae": "1/1",
        "total_adr": "1/1"
      },
      {
        "category": "**총계**",
        "serious_ae": "2/3",
        "serious_adr": "1/2",
        "nonserious_ae": "10/15",
        "nonserious_adr": "8/12",
        "total_ae": "12/18",
        "total_adr": "9/14"
      }
    ]
  }
}
\`\`\`

## 주의사항
1. 모든 SOC를 출력하세요. 생략하지 마세요.
2. 각 SOC 아래에 해당하는 모든 PT를 출력하세요.
3. 마지막에 **총계** 행을 추가하세요.
4. 계산이 틀리면 안 됩니다. 환자수/건수를 정확히 계산하세요.
5. ADR_flag="unrelated"인 행은 약물이상반응 열에 포함하지 마세요.

이제 위 원본 데이터를 분석하여 표9를 JSON 형식으로 출력하세요.`;
        }

        /**
         * 표5/표6/표7 전용 프롬프트 생성 (LineListing 필터링)
         */
        buildLineListingFilterPrompt(markdownContent, tableName, filterValue) {
            const filterDescription = {
                '신속': '신속보고 (긴급/중대한 이상사례)',
                '정기': '정기보고 (일반적인 정기 보고)',
                '원시': '원시자료 (KIDS 자발적 보고)'
            };

            return `## 작업: ${tableName} 추출

## 절대 규칙
1. **모든 해당 행을 빠짐없이 출력하세요.** 요약하거나 생략하지 마세요.
2. "원시/신속/정기" 컬럼이 "${filterValue}"인 행만 추출하세요.
3. 순번은 1부터 시작하여 순차적으로 부여하세요.

## 필터 조건
- 컬럼: "원시/신속/정기"
- 값: "${filterValue}" (${filterDescription[filterValue] || filterValue})

## 원본 데이터 (RAW19 통합LineListing)
${markdownContent}

## 추출할 컬럼 매핑
| 출력 컬럼 | 원본 컬럼명 |
|----------|------------|
| 순번 | (자동 생성: 1, 2, 3...) |
| 보고일자 | Report_Date, 보고일자 |
| 관리번호 | Report_Number, 관리번호, Case_Number |
| 이상사례명 | k-MedDRA PT_v28.1, PT, Preferred_Term |
| 중대성 | Seriousness (예→중대함, 아니오→중대하지 않음) |
| 비고 | (중대성 값을 한글로 변환) |

## 출력 형식
\`\`\`json
{
  "${tableName}": {
    "headers": ["순번", "보고일자", "관리번호", "이상사례명", "비고"],
    "rows": [
      {"순번": "1", "보고일자": "2025-01-22", "관리번호": "KR-AA-011964", "이상사례명": "상복부의 불편감", "비고": "중대하지 않음"},
      {"순번": "2", "보고일자": "2025-07-07", "관리번호": "KR-AA-013069", "이상사례명": "흑색변", "비고": "중대함"}
    ],
    "totalCount": 2
  }
}
\`\`\`

## 주의사항
1. "원시/신속/정기" 컬럼이 "${filterValue}"가 아닌 행은 제외하세요.
2. 날짜 형식이 숫자(예: 45681)인 경우 YYYY-MM-DD로 변환하세요.
3. 모든 해당 행을 출력하세요. "..." 또는 생략 표시 금지.

이제 위 데이터에서 "${filterValue}" 조건에 맞는 행을 JSON으로 출력하세요.`;
        }

        /**
         * 표8 전용 프롬프트 생성 (이상사례 건수 집계)
         */
        buildTable8Prompt(markdownContent) {
            return `## 작업: 표8_모든이상사례건수 집계

## 절대 규칙
1. 정확한 건수를 계산하세요. 추정하지 마세요.
2. Seriousness 컬럼을 기준으로 중대/비중대를 분류하세요.

## 원본 데이터 (RAW19 통합LineListing)
${markdownContent}

## 집계 기준
- **중대함**: Seriousness = "예", "Yes", "Y", "중대함", "Serious"
- **중대하지 않음**: Seriousness = "아니오", "No", "N", "비중대", "Non-serious"

## 집계 항목
1. 신속보고: "원시/신속/정기" = "신속"인 행
2. 정기보고: "원시/신속/정기" = "정기"인 행
3. 원시자료: "원시/신속/정기" = "원시"인 행
4. 총합계: 모든 행

## 출력 형식
\`\`\`json
{
  "표8_모든이상사례건수": {
    "headers": ["구분", "중대한(건)", "중대하지않은(건)", "총건수", "비율(%)"],
    "rows": [
      {"구분": "신속보고", "중대한(건)": "3", "중대하지않은(건)": "0", "총건수": "3", "비율(%)": "11.1"},
      {"구분": "정기보고", "중대한(건)": "0", "중대하지않은(건)": "24", "총건수": "24", "비율(%)": "88.9"},
      {"구분": "원시자료", "중대한(건)": "0", "중대하지않은(건)": "0", "총건수": "0", "비율(%)": "0.0"},
      {"구분": "총합계", "중대한(건)": "3", "중대하지않은(건)": "24", "총건수": "27", "비율(%)": "100.0"}
    ]
  }
}
\`\`\`

## 계산 예시
- 전체 27건 중 신속보고 3건이면: 비율 = 3/27*100 = 11.1%
- 소수점 첫째 자리까지 표시

이제 위 데이터를 분석하여 정확한 집계 결과를 JSON으로 출력하세요.`;
        }

        /**
         * RAW19에서 표9 데이터 직접 집계 (코드 기반)
         */
        aggregateTable9FromLineListing(lineListingRows) {
            // SOC/PT별 집계 데이터 구조
            const aggregation = {};

            for (const row of lineListingRows) {
                const soc = row['k-MedDRA SOC_v28.1'] || row['SOC'] || '';
                const pt = row['k-MedDRA PT_v28.1'] || row['PT'] || '';
                const serious = ['예', 'Yes', 'Y', '중대함', 'Serious', 'serious', '1', 'TRUE'].includes(row['Seriousness']);
                const isADR = ['related', 'Related', '관련', '관련있음'].includes(row['ADR_flag']);
                const patientId = row['Report_Number'] || row['관리번호'] || row['Patient_Name'] || Math.random().toString();

                if (!soc) continue;

                // SOC 초기화
                if (!aggregation[soc]) {
                    aggregation[soc] = {
                        patients: { serious_ae: new Set(), serious_adr: new Set(), nonserious_ae: new Set(), nonserious_adr: new Set() },
                        cases: { serious_ae: 0, serious_adr: 0, nonserious_ae: 0, nonserious_adr: 0 },
                        pts: {}
                    };
                }

                // PT 초기화
                if (!aggregation[soc].pts[pt]) {
                    aggregation[soc].pts[pt] = {
                        patients: { serious_ae: new Set(), serious_adr: new Set(), nonserious_ae: new Set(), nonserious_adr: new Set() },
                        cases: { serious_ae: 0, serious_adr: 0, nonserious_ae: 0, nonserious_adr: 0 }
                    };
                }

                // 집계
                const category = serious ? 'serious' : 'nonserious';

                // 이상사례 (모든 행)
                aggregation[soc].patients[`${category}_ae`].add(patientId);
                aggregation[soc].cases[`${category}_ae`]++;
                aggregation[soc].pts[pt].patients[`${category}_ae`].add(patientId);
                aggregation[soc].pts[pt].cases[`${category}_ae`]++;

                // 약물이상반응 (ADR_flag=related인 경우만)
                if (isADR) {
                    aggregation[soc].patients[`${category}_adr`].add(patientId);
                    aggregation[soc].cases[`${category}_adr`]++;
                    aggregation[soc].pts[pt].patients[`${category}_adr`].add(patientId);
                    aggregation[soc].pts[pt].cases[`${category}_adr`]++;
                }
            }

            // 결과 데이터 생성
            const result = {
                headers: [
                    '구분 (SOC / PT)',
                    '중대한 이상사례 (환자수/건수)',
                    '중대한 약물이상반응 (환자수/건수)',
                    '중대하지 않은 이상사례 (환자수/건수)',
                    '중대하지 않은 약물이상반응 (환자수/건수)',
                    '총-이상사례 (환자수/건수)',
                    '총-약물이상반응 (환자수/건수)'
                ],
                data: []
            };

            // 총계 집계용
            const total = {
                patients: { serious_ae: new Set(), serious_adr: new Set(), nonserious_ae: new Set(), nonserious_adr: new Set() },
                cases: { serious_ae: 0, serious_adr: 0, nonserious_ae: 0, nonserious_adr: 0 }
            };

            // SOC별 데이터 추가
            Object.entries(aggregation).sort((a, b) => a[0].localeCompare(b[0])).forEach(([soc, data]) => {
                // SOC 행
                result.data.push({
                    category: `**${soc}**`,
                    serious_ae: `${data.patients.serious_ae.size}/${data.cases.serious_ae}`,
                    serious_adr: `${data.patients.serious_adr.size}/${data.cases.serious_adr}`,
                    nonserious_ae: `${data.patients.nonserious_ae.size}/${data.cases.nonserious_ae}`,
                    nonserious_adr: `${data.patients.nonserious_adr.size}/${data.cases.nonserious_adr}`,
                    total_ae: `${data.patients.serious_ae.size + data.patients.nonserious_ae.size}/${data.cases.serious_ae + data.cases.nonserious_ae}`,
                    total_adr: `${data.patients.serious_adr.size + data.patients.nonserious_adr.size}/${data.cases.serious_adr + data.cases.nonserious_adr}`
                });

                // PT 행들
                Object.entries(data.pts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([pt, ptData]) => {
                    result.data.push({
                        category: `&nbsp;&nbsp; ${pt}`,
                        serious_ae: `${ptData.patients.serious_ae.size}/${ptData.cases.serious_ae}`,
                        serious_adr: `${ptData.patients.serious_adr.size}/${ptData.cases.serious_adr}`,
                        nonserious_ae: `${ptData.patients.nonserious_ae.size}/${ptData.cases.nonserious_ae}`,
                        nonserious_adr: `${ptData.patients.nonserious_adr.size}/${ptData.cases.nonserious_adr}`,
                        total_ae: `${ptData.patients.serious_ae.size + ptData.patients.nonserious_ae.size}/${ptData.cases.serious_ae + ptData.cases.nonserious_ae}`,
                        total_adr: `${ptData.patients.serious_adr.size + ptData.patients.nonserious_adr.size}/${ptData.cases.serious_adr + ptData.cases.nonserious_adr}`
                    });
                });

                // 총계에 추가
                data.patients.serious_ae.forEach(p => total.patients.serious_ae.add(p));
                data.patients.serious_adr.forEach(p => total.patients.serious_adr.add(p));
                data.patients.nonserious_ae.forEach(p => total.patients.nonserious_ae.add(p));
                data.patients.nonserious_adr.forEach(p => total.patients.nonserious_adr.add(p));
                total.cases.serious_ae += data.cases.serious_ae;
                total.cases.serious_adr += data.cases.serious_adr;
                total.cases.nonserious_ae += data.cases.nonserious_ae;
                total.cases.nonserious_adr += data.cases.nonserious_adr;
            });

            // 총계 행 추가
            result.data.push({
                category: '**총계**',
                serious_ae: `${total.patients.serious_ae.size}/${total.cases.serious_ae}`,
                serious_adr: `${total.patients.serious_adr.size}/${total.cases.serious_adr}`,
                nonserious_ae: `${total.patients.nonserious_ae.size}/${total.cases.nonserious_ae}`,
                nonserious_adr: `${total.patients.nonserious_adr.size}/${total.cases.nonserious_adr}`,
                total_ae: `${total.patients.serious_ae.size + total.patients.nonserious_ae.size}/${total.cases.serious_ae + total.cases.nonserious_ae}`,
                total_adr: `${total.patients.serious_adr.size + total.patients.nonserious_adr.size}/${total.cases.serious_adr + total.cases.nonserious_adr}`
            });

            return result;
        }

        /**
         * 마크다운 테이블에서 LineListing 행 파싱
         */
        parseLineListingFromMarkdown(markdownContent) {
            const rows = [];
            const lines = markdownContent.split('\n');

            let headers = [];
            let inTable = false;
            let headerParsed = false;

            for (const line of lines) {
                const trimmed = line.trim();

                // 테이블이 아닌 행 스킵
                if (!trimmed.startsWith('|')) {
                    continue;
                }

                // 셀 파싱
                const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());

                // 구분선 감지 (모든 셀이 -, :, 공백으로만 구성)
                const isSeparator = cells.every(cell => /^[-:\s]*$/.test(cell));
                if (isSeparator) {
                    continue;
                }

                // 헤더 행
                if (!headerParsed) {
                    headers = cells;
                    headerParsed = true;
                    inTable = true;
                    continue;
                }

                // 데이터 행 파싱
                if (inTable && cells.length > 0) {
                    const row = {};
                    headers.forEach((h, i) => {
                        row[h] = cells[i] || '';
                    });
                    rows.push(row);
                }
            }

            return rows;
        }

        /**
         * 표를 마크다운 형식으로 변환
         */
        toMarkdown(tableData) {
            if (!tableData || !tableData.headers || !tableData.rows) {
                return '';
            }

            let markdown = '| ' + tableData.headers.join(' | ') + ' |\n';
            markdown += '| ' + tableData.headers.map(() => '---').join(' | ') + ' |\n';

            tableData.rows.forEach(row => {
                const cells = tableData.headers.map(h => row[h] || '');
                markdown += '| ' + cells.join(' | ') + ' |\n';
            });

            return markdown;
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.ExtractTables = ExtractTables;
        window.extractTables = new ExtractTables();
        window.TABLE_DEFINITIONS = TABLE_DEFINITIONS;
    }

})();
