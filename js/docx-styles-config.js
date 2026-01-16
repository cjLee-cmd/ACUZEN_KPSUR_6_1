/**
 * DOCX Styles Configuration
 * 참조 문서: 품목갱신+안전성_draft9_20251230.docx 포맷 기반
 * MFDS PSUR 보고서 스타일 설정
 */

(function() {
'use strict';

/**
 * 단위 변환 유틸리티
 * Word에서 사용하는 단위: twips (1/20 point), half-points (1/2 point)
 */
const UNITS = {
    // cm to twips (1 inch = 1440 twips, 1 inch = 2.54 cm)
    cmToTwips: (cm) => Math.round(cm * 1440 / 2.54),
    // pt to half-points (docx.js uses half-points for font size)
    ptToHalfPoints: (pt) => pt * 2,
    // pt to twips (for spacing)
    ptToTwips: (pt) => pt * 20
};

/**
 * DOCX 스타일 설정
 */
const DOCX_STYLES_CONFIG = {
    /**
     * 페이지 설정 (A4 + MFDS 여백)
     */
    PAGE_SETTINGS: {
        size: {
            width: UNITS.cmToTwips(21),    // 21cm = 11906 twips (A4 width)
            height: UNITS.cmToTwips(29.7)  // 29.7cm = 16838 twips (A4 height)
        },
        margins: {
            top: UNITS.cmToTwips(3.0),     // 3cm = 1701 twips
            bottom: UNITS.cmToTwips(2.54), // 2.54cm = 1440 twips
            left: UNITS.cmToTwips(2.54),   // 2.54cm = 1440 twips
            right: UNITS.cmToTwips(2.54)   // 2.54cm = 1440 twips
        }
    },

    /**
     * 폰트 설정 (한글 지원)
     */
    FONTS: {
        PRIMARY: 'Malgun Gothic',           // 주요 폰트
        FALLBACK: ['Arial Unicode MS', 'MS Mincho', 'Arial', 'sans-serif'],
        EAST_ASIA: 'Malgun Gothic',         // 동아시아 폰트
        ASCII: 'Malgun Gothic',             // ASCII 폰트
        H_ANSI: 'Malgun Gothic'             // High ANSI 폰트
    },

    /**
     * 헤딩 스타일
     */
    HEADING_STYLES: {
        // Heading 1: 주요 섹션 제목 (서론, 전세계 판매 허가 현황 등)
        H1: {
            font: 'Malgun Gothic',
            size: UNITS.ptToHalfPoints(14),  // 14pt = 28 half-points
            bold: true,
            color: '000000',
            spacing: {
                before: UNITS.ptToTwips(12), // 12pt before
                after: UNITS.ptToTwips(6)    // 6pt after
            }
        },
        // Heading 2: 서브섹션 제목 (6.1, 6.2 등)
        H2: {
            font: 'Malgun Gothic',
            size: UNITS.ptToHalfPoints(12),  // 12pt = 24 half-points
            bold: true,
            color: '000000',
            spacing: {
                before: UNITS.ptToTwips(10),
                after: UNITS.ptToTwips(4)
            }
        },
        // Heading 3: 하위 섹션 (7.1.1 등)
        H3: {
            font: 'Malgun Gothic',
            size: UNITS.ptToHalfPoints(11),  // 11pt = 22 half-points
            bold: true,
            color: '000000',
            spacing: {
                before: UNITS.ptToTwips(8),
                after: UNITS.ptToTwips(4)
            }
        }
    },

    /**
     * 본문 스타일
     */
    BODY_STYLES: {
        NORMAL: {
            font: 'Malgun Gothic',
            size: UNITS.ptToHalfPoints(11),  // 11pt
            color: '000000',
            spacing: {
                after: UNITS.ptToTwips(6),   // 6pt after
                line: 276                     // 1.15 line spacing (240 = single)
            }
        },
        SMALL: {
            font: 'Malgun Gothic',
            size: UNITS.ptToHalfPoints(9),   // 9pt (상세 표용)
            color: '000000'
        }
    },

    /**
     * 섹션별 스타일 설정
     */
    SECTION_STYLES: {
        // 00. 표지
        '00': {
            type: 'COVER_PAGE',
            title: {
                alignment: 'CENTER',
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(24),  // 24pt
                bold: true,
                spacing: {
                    before: UNITS.ptToTwips(72), // 72pt (1 inch) from top
                    after: UNITS.ptToTwips(12)
                }
            },
            subtitle: {
                alignment: 'CENTER',
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(16),  // 16pt
                bold: true,
                spacing: { after: UNITS.ptToTwips(24) }
            },
            infoLine: {
                alignment: 'CENTER',
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(11),  // 11pt
                labelBold: true,
                spacing: { after: UNITS.ptToTwips(4) }
            }
        },

        // 01. 목차
        '01': {
            type: 'TOC',
            title: {
                alignment: 'CENTER',
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(13),  // 13pt
                bold: true,
                spacing: { after: UNITS.ptToTwips(12) }
            },
            entry: {
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(11),
                spacing: { after: UNITS.ptToTwips(2) }
            }
        },

        // 02. 약어설명
        '02': {
            type: 'ABBREVIATIONS',
            title: {
                alignment: 'LEFT',
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(11),
                bold: true,
                spacing: { after: UNITS.ptToTwips(6) }
            }
        },

        // 03-14: 기본 콘텐츠 섹션
        'DEFAULT': {
            type: 'CONTENT',
            useHeading1: true,
            useHeading2: true,
            bodyStyle: 'NORMAL'
        }
    },

    /**
     * 표 스타일 설정
     */
    TABLE_STYLES: {
        // 기본 표 스타일
        DEFAULT: {
            header: {
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(10),  // 10pt
                bold: true,
                color: 'FFFFFF',                  // 흰색 텍스트
                shading: '25739B',               // 파란 배경
                alignment: 'CENTER',
                verticalAlign: 'CENTER',
                margins: {
                    top: 50,
                    bottom: 50,
                    left: 75,
                    right: 75
                }
            },
            body: {
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(10),  // 10pt
                bold: false,
                color: '000000',
                alignment: 'LEFT',
                verticalAlign: 'CENTER',
                margins: {
                    top: 50,
                    bottom: 50,
                    left: 75,
                    right: 75
                }
            },
            borders: {
                style: 'SINGLE',
                size: 4,                         // 0.5pt
                color: '000000'
            },
            width: 100                           // 100% width
        },

        // 상세 표 (개별 증례 등) - 9pt 폰트
        DETAIL: {
            header: {
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(9),   // 9pt
                bold: true,
                color: '000000',
                shading: 'F2F2F2',               // 연한 회색 배경
                alignment: 'CENTER'
            },
            body: {
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(9),   // 9pt
                bold: false,
                color: '000000',
                alignment: 'LEFT'
            }
        },

        // 간단한 표 (약어표 등) - 테두리 없음
        SIMPLE: {
            header: {
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(10),
                bold: true,
                color: '000000',
                shading: null
            },
            body: {
                font: 'Malgun Gothic',
                size: UNITS.ptToHalfPoints(10),
                bold: false,
                color: '000000'
            },
            borders: null
        }
    },

    /**
     * 표별 스타일 매핑
     * 마크다운에서 "표 N" 형식으로 표를 식별하여 적절한 스타일 적용
     */
    TABLE_MAPPING: {
        '표1': { style: 'DEFAULT', name: '전세계 판매 허가 현황' },
        '표2': { style: 'DEFAULT', name: '연도별 판매량' },
        '표3': { style: 'DEFAULT', name: '환자노출 추정' },
        '표4': { style: 'DETAIL', name: '증례 유형별 분류' },
        '표5': { style: 'DETAIL', name: '신속보고 내역' },
        '표6': { style: 'DETAIL', name: '국내 신속보고' },
        '표7': { style: 'DETAIL', name: '국외 신속보고' },
        '표8': { style: 'DEFAULT', name: '이상사례 분류' },
        '표9': { style: 'DETAIL', name: 'SOC/PT별 이상사례' },
        '표10': { style: 'DEFAULT', name: '효능효과' },
        '표11': { style: 'DEFAULT', name: '허가사항 변경' }
    },

    /**
     * 특수 요소 스타일
     */
    SPECIAL_STYLES: {
        // Draft 워터마크
        DRAFT_WATERMARK: {
            text: '[ DRAFT - 초안 ]',
            font: 'Malgun Gothic',
            size: UNITS.ptToHalfPoints(16),  // 16pt
            bold: true,
            color: 'FF0000',                  // 빨간색
            alignment: 'CENTER'
        },

        // 페이지 번호
        PAGE_NUMBER: {
            font: 'Malgun Gothic',
            size: UNITS.ptToHalfPoints(10),
            alignment: 'CENTER'
        },

        // 구분선
        SEPARATOR: {
            type: 'HORIZONTAL_RULE',
            width: 100,
            color: 'CCCCCC'
        }
    }
};

/**
 * 스타일 헬퍼 함수
 */
const STYLE_HELPERS = {
    /**
     * 섹션 ID로 스타일 가져오기
     * @param {string} sectionId - 섹션 ID (00-14)
     * @returns {Object} 섹션 스타일 객체
     */
    getSectionStyle: function(sectionId) {
        return DOCX_STYLES_CONFIG.SECTION_STYLES[sectionId] ||
               DOCX_STYLES_CONFIG.SECTION_STYLES['DEFAULT'];
    },

    /**
     * 표 ID로 스타일 가져오기
     * @param {string} tableId - 표 ID (표1, 표2 등)
     * @returns {Object} 표 스타일 객체
     */
    getTableStyle: function(tableId) {
        const mapping = DOCX_STYLES_CONFIG.TABLE_MAPPING[tableId];
        const styleName = mapping ? mapping.style : 'DEFAULT';
        return DOCX_STYLES_CONFIG.TABLE_STYLES[styleName];
    },

    /**
     * 헤딩 레벨로 스타일 가져오기
     * @param {number} level - 헤딩 레벨 (1, 2, 3)
     * @returns {Object} 헤딩 스타일 객체
     */
    getHeadingStyle: function(level) {
        const key = `H${level}`;
        return DOCX_STYLES_CONFIG.HEADING_STYLES[key] ||
               DOCX_STYLES_CONFIG.HEADING_STYLES.H1;
    },

    /**
     * 폰트 설정 객체 생성 (docx.js 호환)
     * @param {Object} options - 폰트 옵션
     * @returns {Object} docx.js TextRun 호환 객체
     */
    createFontOptions: function(options = {}) {
        const fonts = DOCX_STYLES_CONFIG.FONTS;
        return {
            font: options.font || fonts.PRIMARY,
            size: options.size || DOCX_STYLES_CONFIG.BODY_STYLES.NORMAL.size,
            bold: options.bold || false,
            italics: options.italics || false,
            color: options.color || '000000'
        };
    },

    /**
     * 표지 페이지 여부 확인
     * @param {string} sectionId - 섹션 ID
     * @returns {boolean}
     */
    isCoverPage: function(sectionId) {
        const style = this.getSectionStyle(sectionId);
        return style.type === 'COVER_PAGE';
    },

    /**
     * 마크다운에서 표 ID 추출
     * @param {string} text - 마크다운 텍스트
     * @returns {string|null} 표 ID (예: "표1") 또는 null
     */
    extractTableId: function(text) {
        const match = text.match(/표\s*(\d+)/);
        return match ? `표${match[1]}` : null;
    }
};

// 전역 객체로 내보내기
if (typeof window !== 'undefined') {
    window.DOCX_STYLES_CONFIG = DOCX_STYLES_CONFIG;
    window.DOCX_STYLE_HELPERS = STYLE_HELPERS;
    window.DOCX_UNITS = UNITS;
    console.log('DOCX Styles Config loaded');
}

})();
