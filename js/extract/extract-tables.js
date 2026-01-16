/**
 * Extract Tables - 표 데이터 추출
 * js/extract/extract-tables.js
 *
 * Table 데이터 추출 전문 모듈
 */

(function() {
    'use strict';

    // Table 정의 - extractData.md 명세서 기반 (6개)
    // 표 데이터는 RAW 데이터에서 추출하여 가공
    const TABLE_DEFINITIONS = {
        // === 시판후 노출 관련 표 (RAW3) ===
        '표2_연도별판매량': {
            rawIds: ['RAW3'],
            description: '연도별 판매량 표',
            columns: ['연도', '판매량', '단위'],
            dependencies: ['CS19_시판후노출count시작날짜', 'CS19_.1_시판후노출count종료날짜']
        },
        '표3_연평균환자노출': {
            rawIds: ['RAW3', 'RAW1.1', 'RAW2.1'],
            description: '연 평균 환자 노출 추정표',
            columns: ['항목', '수치', '비고'],
            dependencies: ['표2_연도별판매량', 'CS20_1일사용량', 'CS21_환자1명당사용량']
        },

        // === 이상사례 보고 내역 표 ===
        '표5_신속보고내역': {
            rawIds: ['RAW12', 'RAW13'],
            description: '신속보고 이상사례 내역 표',
            columns: ['보고일자', '관리번호', '이상사례명', '비고'],
            note: '국외신속보고 + 국내신속보고 LineListing 합침'
        },
        '표6_정기보고내역': {
            rawIds: ['RAW15'],
            description: '정기보고 이상사례 내역 표',
            columns: ['보고일자', '관리번호', '이상사례명', '비고']
        },
        '표7_원시자료내역': {
            rawIds: ['RAW14'],
            description: '원시자료(KIDS) 이상사례 내역 표',
            columns: ['보고일자', '관리번호', '이상사례명', '비고']
        },

        // === SOC별 분석 표 ===
        '표9_SOC별건수': {
            rawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'],
            description: 'SOC별 이상사례 건수 표 (중대/비중대)',
            columns: ['SOC', 'PT', '중대한(건)', '중대하지않은(건)', '총누적(건)', '비율(%)'],
            type: 'A',  // 모든 LineListing 합쳐서 피벗 분석 필요
            note: 'MedDRA SOC/PT 기준으로 피벗테이블 형태'
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
                // 관련 RAW ID인지 확인
                const relevantDefs = this.getRelevantDefinitions(file.rawId, definitions);

                if (Object.keys(relevantDefs).length === 0) {
                    console.log(`[ExtractTables] Skipping ${file.rawId} - no Table definitions`);
                    continue;
                }

                const result = await this.base.extractFromMarkdown(
                    file.markdownContent || file.markdown || file.content,
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

            return `다음 문서에서 표(Table) 데이터를 추출하세요.

## 문서 (${rawId})
${markdownContent.substring(0, 25000)}

## 추출 대상 표
${Object.entries(definitions).map(([k, v]) => `- ${k}: ${v.description}`).join('\n')}

## 출력 형식
\`\`\`json
{
  "표1_전세계허가현황": {
    "headers": ["국가", "허가일자", "제품명"],
    "rows": [
      {"국가": "한국", "허가일자": "2020-01-01", "제품명": "XXX"}
    ]
  }
}
\`\`\`

표가 없는 경우 해당 키에 DATA_NOT_FOUND를 반환하세요.`;
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
