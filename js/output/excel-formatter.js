/**
 * Excel 출력 포맷팅 모듈
 * CS59_별첨1_일람표.xlsx 스타일 정의
 *
 * @module ExcelFormatter
 * @version 1.0.0
 */

(function() {
    'use strict';

    /**
     * Excel 스타일 정의
     */
    const EXCEL_STYLES = {
        // 테두리 스타일
        borders: {
            thin: { style: 'thin', color: { rgb: '000000' } },
            medium: { style: 'medium', color: { rgb: '000000' } },
            thick: { style: 'thick', color: { rgb: '000000' } }
        },

        // 전체 테두리 (thin)
        allBordersThin: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
        },

        // 전체 테두리 (medium)
        allBordersMedium: {
            top: { style: 'medium', color: { rgb: '000000' } },
            bottom: { style: 'medium', color: { rgb: '000000' } },
            left: { style: 'medium', color: { rgb: '000000' } },
            right: { style: 'medium', color: { rgb: '000000' } }
        },

        // 외곽선만 (thick) - 표 전체 테두리용
        outerBorderThick: {
            top: { style: 'thick', color: { rgb: '000000' } },
            bottom: { style: 'thick', color: { rgb: '000000' } },
            left: { style: 'thick', color: { rgb: '000000' } },
            right: { style: 'thick', color: { rgb: '000000' } }
        },

        // 폰트 스타일
        fonts: {
            // 제목 폰트 (볼드, 12pt)
            title: {
                name: '맑은 고딕',
                sz: 12,
                bold: true,
                color: { rgb: '000000' }
            },
            // 헤더 폰트 (볼드, 10pt)
            header: {
                name: '맑은 고딕',
                sz: 10,
                bold: true,
                color: { rgb: '000000' }
            },
            // 서브헤더 폰트 (볼드, 9pt)
            subHeader: {
                name: '맑은 고딕',
                sz: 9,
                bold: true,
                color: { rgb: '000000' }
            },
            // SOC 폰트 (볼드, 9pt)
            soc: {
                name: '맑은 고딕',
                sz: 9,
                bold: true,
                color: { rgb: '000000' }
            },
            // PT 폰트 (일반, 9pt)
            pt: {
                name: '맑은 고딕',
                sz: 9,
                bold: false,
                color: { rgb: '000000' }
            },
            // 데이터 폰트 (일반, 9pt)
            data: {
                name: '맑은 고딕',
                sz: 9,
                bold: false,
                color: { rgb: '000000' }
            },
            // 합계 폰트 (볼드, 10pt)
            total: {
                name: '맑은 고딕',
                sz: 10,
                bold: true,
                color: { rgb: '000000' }
            }
        },

        // 배경색
        fills: {
            // 제목 배경 (진한 파랑)
            title: {
                fgColor: { rgb: '1F4E79' },
                patternType: 'solid'
            },
            // 헤더 배경 (연한 파랑)
            header: {
                fgColor: { rgb: 'BDD7EE' },
                patternType: 'solid'
            },
            // 서브헤더 배경 (더 연한 파랑)
            subHeader: {
                fgColor: { rgb: 'DDEBF7' },
                patternType: 'solid'
            },
            // SOC 행 배경 (연한 회색)
            soc: {
                fgColor: { rgb: 'F2F2F2' },
                patternType: 'solid'
            },
            // PT 행 배경 (흰색)
            pt: {
                fgColor: { rgb: 'FFFFFF' },
                patternType: 'solid'
            },
            // 합계 행 배경 (연한 노랑)
            total: {
                fgColor: { rgb: 'FFF2CC' },
                patternType: 'solid'
            },
            // 중대한 이상사례 배경 (연한 빨강)
            serious: {
                fgColor: { rgb: 'FCE4D6' },
                patternType: 'solid'
            }
        },

        // 정렬
        alignments: {
            // 중앙 정렬
            center: {
                horizontal: 'center',
                vertical: 'center',
                wrapText: true
            },
            // 왼쪽 정렬
            left: {
                horizontal: 'left',
                vertical: 'center',
                wrapText: true
            },
            // 오른쪽 정렬 (숫자용)
            right: {
                horizontal: 'right',
                vertical: 'center',
                wrapText: false
            }
        }
    };

    /**
     * 셀 스타일 조합 프리셋
     */
    const CELL_PRESETS = {
        // 문서 제목 셀
        documentTitle: {
            font: EXCEL_STYLES.fonts.title,
            fill: EXCEL_STYLES.fills.title,
            alignment: EXCEL_STYLES.alignments.center,
            border: EXCEL_STYLES.allBordersMedium
        },

        // 헤더 셀 (1단계)
        headerLevel1: {
            font: { ...EXCEL_STYLES.fonts.header, color: { rgb: 'FFFFFF' } },
            fill: EXCEL_STYLES.fills.title,
            alignment: EXCEL_STYLES.alignments.center,
            border: EXCEL_STYLES.allBordersThin
        },

        // 헤더 셀 (2단계)
        headerLevel2: {
            font: EXCEL_STYLES.fonts.header,
            fill: EXCEL_STYLES.fills.header,
            alignment: EXCEL_STYLES.alignments.center,
            border: EXCEL_STYLES.allBordersThin
        },

        // 헤더 셀 (3단계)
        headerLevel3: {
            font: EXCEL_STYLES.fonts.subHeader,
            fill: EXCEL_STYLES.fills.subHeader,
            alignment: EXCEL_STYLES.alignments.center,
            border: EXCEL_STYLES.allBordersThin
        },

        // SOC 행 (볼드, 회색 배경)
        socRow: {
            font: EXCEL_STYLES.fonts.soc,
            fill: EXCEL_STYLES.fills.soc,
            alignment: EXCEL_STYLES.alignments.left,
            border: EXCEL_STYLES.allBordersThin
        },

        // PT 행 (일반, 흰색 배경)
        ptRow: {
            font: EXCEL_STYLES.fonts.pt,
            fill: EXCEL_STYLES.fills.pt,
            alignment: EXCEL_STYLES.alignments.left,
            border: EXCEL_STYLES.allBordersThin
        },

        // 데이터 셀 (숫자)
        dataNumber: {
            font: EXCEL_STYLES.fonts.data,
            fill: EXCEL_STYLES.fills.pt,
            alignment: EXCEL_STYLES.alignments.right,
            border: EXCEL_STYLES.allBordersThin
        },

        // SOC 데이터 셀 (숫자, 회색 배경)
        socDataNumber: {
            font: EXCEL_STYLES.fonts.soc,
            fill: EXCEL_STYLES.fills.soc,
            alignment: EXCEL_STYLES.alignments.right,
            border: EXCEL_STYLES.allBordersThin
        },

        // 합계 행
        totalRow: {
            font: EXCEL_STYLES.fonts.total,
            fill: EXCEL_STYLES.fills.total,
            alignment: EXCEL_STYLES.alignments.center,
            border: EXCEL_STYLES.allBordersMedium
        },

        // 합계 숫자 셀
        totalNumber: {
            font: EXCEL_STYLES.fonts.total,
            fill: EXCEL_STYLES.fills.total,
            alignment: EXCEL_STYLES.alignments.right,
            border: EXCEL_STYLES.allBordersMedium
        }
    };

    /**
     * 열 너비 정의 (CS59_별첨1_일람표 형식)
     */
    const COLUMN_WIDTHS = {
        cs59: [
            { wch: 3 },   // A - 번호
            { wch: 35 },  // B - SOC (기관계분류)
            { wch: 30 },  // C - PT (이상사례명)
            { wch: 8 },   // D - 중대한 이상사례 수
            { wch: 8 },   // E - 중대한 이상사례 %
            { wch: 8 },   // F - 중대한 이상사례 건
            { wch: 8 },   // G - 중대한 약물이상반응 수
            { wch: 8 },   // H - 중대한 약물이상반응 %
            { wch: 8 },   // I - 중대한 약물이상반응 건
            { wch: 8 },   // J - 비중대 이상사례 수
            { wch: 8 },   // K - 비중대 이상사례 %
            { wch: 8 },   // L - 비중대 이상사례 건
            { wch: 8 },   // M - 비중대 약물이상반응 수
            { wch: 8 },   // N - 비중대 약물이상반응 %
            { wch: 8 },   // O - 비중대 약물이상반응 건
            { wch: 8 },   // P - 총 이상사례 수
            { wch: 8 },   // Q - 총 이상사례 %
            { wch: 8 },   // R - 총 이상사례 건
            { wch: 8 },   // S - 총 약물이상반응 수
            { wch: 8 },   // T - 총 약물이상반응 %
            { wch: 8 },   // U - 총 약물이상반응 건
            { wch: 8 },   // V - 시판후연구 수
            { wch: 8 },   // W - 시판후연구 %
            { wch: 8 },   // X - 시판후연구 건
        ]
    };

    /**
     * 행 높이 정의
     */
    const ROW_HEIGHTS = {
        title: 25,      // 제목 행
        header1: 20,    // 1단계 헤더
        header2: 18,    // 2단계 헤더
        header3: 16,    // 3단계 헤더
        soc: 18,        // SOC 행
        pt: 15,         // PT 행
        total: 20       // 합계 행
    };

    /**
     * ExcelFormatter 클래스
     */
    class ExcelFormatter {
        constructor() {
            this.styles = EXCEL_STYLES;
            this.presets = CELL_PRESETS;
            this.columnWidths = COLUMN_WIDTHS;
            this.rowHeights = ROW_HEIGHTS;
        }

        /**
         * 셀에 스타일 적용 (xlsx-style 호환)
         * @param {Object} ws - 워크시트
         * @param {string} cellRef - 셀 참조 (예: 'A1')
         * @param {string} presetName - 프리셋 이름
         */
        applyCellStyle(ws, cellRef, presetName) {
            if (!ws[cellRef]) return;

            const preset = this.presets[presetName];
            if (!preset) {
                console.warn(`Unknown preset: ${presetName}`);
                return;
            }

            ws[cellRef].s = {
                font: preset.font,
                fill: preset.fill,
                alignment: preset.alignment,
                border: preset.border
            };
        }

        /**
         * 범위에 스타일 적용
         * @param {Object} ws - 워크시트
         * @param {string} startCell - 시작 셀 (예: 'A1')
         * @param {string} endCell - 종료 셀 (예: 'C5')
         * @param {string} presetName - 프리셋 이름
         */
        applyRangeStyle(ws, startCell, endCell, presetName) {
            const startCol = this.colToIndex(startCell.match(/[A-Z]+/)[0]);
            const startRow = parseInt(startCell.match(/\d+/)[0]);
            const endCol = this.colToIndex(endCell.match(/[A-Z]+/)[0]);
            const endRow = parseInt(endCell.match(/\d+/)[0]);

            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    const cellRef = this.indexToCol(c) + r;
                    this.applyCellStyle(ws, cellRef, presetName);
                }
            }
        }

        /**
         * 열 인덱스를 열 문자로 변환
         * @param {number} index - 열 인덱스 (0부터 시작)
         * @returns {string} 열 문자 (예: 'A', 'B', 'AA')
         */
        indexToCol(index) {
            let col = '';
            let temp = index;
            while (temp >= 0) {
                col = String.fromCharCode((temp % 26) + 65) + col;
                temp = Math.floor(temp / 26) - 1;
            }
            return col;
        }

        /**
         * 열 문자를 열 인덱스로 변환
         * @param {string} col - 열 문자 (예: 'A', 'B', 'AA')
         * @returns {number} 열 인덱스 (0부터 시작)
         */
        colToIndex(col) {
            let index = 0;
            for (let i = 0; i < col.length; i++) {
                index = index * 26 + (col.charCodeAt(i) - 64);
            }
            return index - 1;
        }

        /**
         * CS59_별첨1_일람표 워크시트에 스타일 적용
         * @param {Object} ws - 워크시트
         * @param {number} dataStartRow - 데이터 시작 행 (1부터 시작)
         * @param {number} dataEndRow - 데이터 종료 행
         * @param {Array} socRows - SOC 행 번호 배열
         * @param {number} totalRow - 합계 행 번호
         */
        applyCS59Styles(ws, dataStartRow, dataEndRow, socRows, totalRow) {
            // 열 너비 적용
            ws['!cols'] = this.columnWidths.cs59;

            // 헤더 스타일 적용 (행 1-6)
            this.applyRangeStyle(ws, 'A1', 'X1', 'documentTitle');
            this.applyRangeStyle(ws, 'A4', 'X4', 'headerLevel1');
            this.applyRangeStyle(ws, 'A5', 'X5', 'headerLevel2');
            this.applyRangeStyle(ws, 'A6', 'X6', 'headerLevel3');

            // SOC 행 스타일 적용
            socRows.forEach(row => {
                for (let c = 0; c < 24; c++) {
                    const cellRef = this.indexToCol(c) + row;
                    if (ws[cellRef]) {
                        if (c < 3) {
                            this.applyCellStyle(ws, cellRef, 'socRow');
                        } else {
                            this.applyCellStyle(ws, cellRef, 'socDataNumber');
                        }
                    }
                }
            });

            // PT 행 스타일 적용
            for (let r = dataStartRow; r <= dataEndRow; r++) {
                if (!socRows.includes(r) && r !== totalRow) {
                    for (let c = 0; c < 24; c++) {
                        const cellRef = this.indexToCol(c) + r;
                        if (ws[cellRef]) {
                            if (c < 3) {
                                this.applyCellStyle(ws, cellRef, 'ptRow');
                            } else {
                                this.applyCellStyle(ws, cellRef, 'dataNumber');
                            }
                        }
                    }
                }
            }

            // 합계 행 스타일 적용
            if (totalRow) {
                for (let c = 0; c < 24; c++) {
                    const cellRef = this.indexToCol(c) + totalRow;
                    if (ws[cellRef]) {
                        if (c < 3) {
                            this.applyCellStyle(ws, cellRef, 'totalRow');
                        } else {
                            this.applyCellStyle(ws, cellRef, 'totalNumber');
                        }
                    }
                }
            }

            return ws;
        }

        /**
         * 스타일 프리셋 가져오기
         * @param {string} name - 프리셋 이름
         * @returns {Object} 스타일 객체
         */
        getPreset(name) {
            return this.presets[name] || null;
        }

        /**
         * 새 스타일 프리셋 추가
         * @param {string} name - 프리셋 이름
         * @param {Object} style - 스타일 객체
         */
        addPreset(name, style) {
            this.presets[name] = style;
        }

        /**
         * 열 너비 설정 가져오기
         * @param {string} type - 타입 (예: 'cs59')
         * @returns {Array} 열 너비 배열
         */
        getColumnWidths(type) {
            return this.columnWidths[type] || this.columnWidths.cs59;
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.ExcelFormatter = ExcelFormatter;
        window.excelFormatter = new ExcelFormatter();
        window.EXCEL_STYLES = EXCEL_STYLES;
        window.CELL_PRESETS = CELL_PRESETS;
        window.COLUMN_WIDTHS = COLUMN_WIDTHS;
        window.ROW_HEIGHTS = ROW_HEIGHTS;
    }

})();
