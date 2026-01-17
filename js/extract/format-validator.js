/**
 * Format Validator - 형식 검증 모듈
 * js/extract/format-validator.js
 *
 * 기능:
 * - 표 형식 검증 (마크다운 테이블)
 * - 서술문 형식 검증 (PH 데이터)
 * - 예시와 비교한 구조 검증
 */

(function() {
    'use strict';

    /**
     * FormatValidator - 형식 검증 클래스
     */
    class FormatValidator {
        constructor() {
            // 검증 결과 저장
            this.validationResults = [];
        }

        /**
         * 마크다운 테이블 형식 검증
         */
        validateTableFormat(content, options = {}) {
            const result = {
                valid: true,
                errors: [],
                warnings: [],
                structure: null
            };

            if (!content || typeof content !== 'string') {
                result.valid = false;
                result.errors.push('콘텐츠가 비어있거나 유효하지 않습니다.');
                return result;
            }

            // 테이블 라인 추출
            const lines = content.split('\n').filter(line => line.trim());
            const tableLines = lines.filter(line => line.includes('|'));

            if (tableLines.length === 0) {
                result.valid = false;
                result.errors.push('마크다운 테이블을 찾을 수 없습니다.');
                return result;
            }

            // 헤더 라인 확인
            const headerLine = tableLines[0];
            const headers = this._parseTableRow(headerLine);

            if (headers.length === 0) {
                result.valid = false;
                result.errors.push('테이블 헤더를 파싱할 수 없습니다.');
                return result;
            }

            // 구분선 확인
            if (tableLines.length > 1) {
                const separatorLine = tableLines[1];
                if (!this._isValidSeparator(separatorLine)) {
                    result.warnings.push('테이블 구분선이 표준 형식이 아닙니다.');
                }
            }

            // 데이터 행 검증
            const dataRows = tableLines.slice(2);
            let columnCountMismatch = 0;

            dataRows.forEach((row, idx) => {
                const cells = this._parseTableRow(row);
                if (cells.length !== headers.length) {
                    columnCountMismatch++;
                    if (columnCountMismatch <= 3) {
                        result.warnings.push(`행 ${idx + 1}: 열 개수 불일치 (예상: ${headers.length}, 실제: ${cells.length})`);
                    }
                }
            });

            if (columnCountMismatch > 3) {
                result.warnings.push(`... 외 ${columnCountMismatch - 3}개 행에서 열 개수 불일치`);
            }

            // 필수 헤더 검증 (옵션)
            if (options.requiredHeaders && Array.isArray(options.requiredHeaders)) {
                const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));
                options.requiredHeaders.forEach(required => {
                    if (!headerSet.has(required.toLowerCase().trim())) {
                        result.errors.push(`필수 헤더 누락: ${required}`);
                        result.valid = false;
                    }
                });
            }

            // 구조 정보 저장
            result.structure = {
                headers: headers,
                rowCount: dataRows.length,
                columnCount: headers.length
            };

            return result;
        }

        /**
         * 테이블 행 파싱
         */
        _parseTableRow(row) {
            if (!row || !row.includes('|')) return [];

            return row
                .split('|')
                .map(cell => cell.trim())
                .filter((cell, idx, arr) => {
                    // 첫 번째와 마지막 빈 셀 제거
                    if (idx === 0 && cell === '') return false;
                    if (idx === arr.length - 1 && cell === '') return false;
                    return true;
                });
        }

        /**
         * 테이블 구분선 검증
         */
        _isValidSeparator(line) {
            if (!line.includes('|')) return false;
            // ----- 또는 :---- 등의 패턴 확인
            const parts = line.split('|').filter(p => p.trim());
            return parts.every(p => /^[\s:]*-+[\s:]*$/.test(p.trim()));
        }

        /**
         * PH (서술문) 형식 검증
         */
        validatePHFormat(content, options = {}) {
            const result = {
                valid: true,
                errors: [],
                warnings: [],
                structure: null
            };

            if (!content || typeof content !== 'string') {
                result.valid = false;
                result.errors.push('콘텐츠가 비어있거나 유효하지 않습니다.');
                return result;
            }

            const trimmedContent = content.trim();

            // 최소 길이 검증
            if (trimmedContent.length < 10) {
                result.warnings.push('서술문이 너무 짧습니다.');
            }

            // 문장 구조 검증
            const sentences = trimmedContent.split(/[.。]/);
            const validSentences = sentences.filter(s => s.trim().length > 5);

            if (validSentences.length === 0) {
                result.warnings.push('완전한 문장이 없습니다.');
            }

            // 불릿 포인트 확인
            const hasBullets = /^[-*•]\s/.test(trimmedContent) || /\n[-*•]\s/.test(trimmedContent);

            // 번호 목록 확인
            const hasNumberedList = /^\d+[.)]\s/.test(trimmedContent) || /\n\d+[.)]\s/.test(trimmedContent);

            // 헤더 확인
            const hasHeaders = /^#+\s/.test(trimmedContent) || /\n#+\s/.test(trimmedContent);

            // 필수 키워드 검증 (옵션)
            if (options.requiredKeywords && Array.isArray(options.requiredKeywords)) {
                const lowerContent = trimmedContent.toLowerCase();
                options.requiredKeywords.forEach(keyword => {
                    if (!lowerContent.includes(keyword.toLowerCase())) {
                        result.warnings.push(`권장 키워드 누락: ${keyword}`);
                    }
                });
            }

            // 구조 정보 저장
            result.structure = {
                length: trimmedContent.length,
                sentenceCount: validSentences.length,
                hasBullets: hasBullets,
                hasNumberedList: hasNumberedList,
                hasHeaders: hasHeaders,
                paragraphCount: trimmedContent.split(/\n\n+/).length
            };

            return result;
        }

        /**
         * 예시와 구조 비교
         */
        async compareWithExample(content, variableId) {
            const result = {
                match: true,
                similarity: 0,
                differences: [],
                recommendations: []
            };

            // ExampleLoader 확인
            const exampleLoader = window.exampleLoader;
            if (!exampleLoader) {
                result.match = false;
                result.differences.push('ExampleLoader를 사용할 수 없습니다.');
                return result;
            }

            // 예시 로드
            const examples = await exampleLoader.loadExamples(variableId);
            if (examples.length === 0) {
                result.match = true; // 예시가 없으면 검증 생략
                return result;
            }

            const exampleContent = examples[0].content;

            // 타입 감지
            const isTable = content.includes('|') && content.includes('---');
            const isExampleTable = exampleContent.includes('|') && exampleContent.includes('---');

            if (isTable !== isExampleTable) {
                result.match = false;
                result.differences.push('콘텐츠 타입이 다릅니다 (표 vs 서술문).');
                return result;
            }

            if (isTable) {
                // 테이블 구조 비교
                return this._compareTableStructures(content, exampleContent);
            } else {
                // 서술문 구조 비교
                return this._comparePHStructures(content, exampleContent);
            }
        }

        /**
         * 테이블 구조 비교
         */
        _compareTableStructures(content, exampleContent) {
            const result = {
                match: true,
                similarity: 0,
                differences: [],
                recommendations: []
            };

            const contentValidation = this.validateTableFormat(content);
            const exampleValidation = this.validateTableFormat(exampleContent);

            if (!contentValidation.valid || !exampleValidation.valid) {
                result.match = false;
                result.differences.push('테이블 형식이 유효하지 않습니다.');
                return result;
            }

            const contentStructure = contentValidation.structure;
            const exampleStructure = exampleValidation.structure;

            // 열 개수 비교
            if (contentStructure.columnCount !== exampleStructure.columnCount) {
                result.differences.push(`열 개수 불일치: 현재 ${contentStructure.columnCount}, 예시 ${exampleStructure.columnCount}`);
            }

            // 헤더 유사도 계산
            const contentHeaders = new Set(contentStructure.headers.map(h => h.toLowerCase()));
            const exampleHeaders = new Set(exampleStructure.headers.map(h => h.toLowerCase()));

            let matchingHeaders = 0;
            exampleHeaders.forEach(eh => {
                if (contentHeaders.has(eh)) matchingHeaders++;
            });

            const headerSimilarity = exampleHeaders.size > 0 ? matchingHeaders / exampleHeaders.size : 1;

            // 누락된 헤더 확인
            exampleHeaders.forEach(eh => {
                if (!contentHeaders.has(eh)) {
                    result.differences.push(`헤더 누락: ${eh}`);
                }
            });

            // 추가된 헤더 확인
            contentHeaders.forEach(ch => {
                if (!exampleHeaders.has(ch)) {
                    result.differences.push(`추가된 헤더: ${ch}`);
                }
            });

            // 유사도 계산
            const columnSimilarity = contentStructure.columnCount === exampleStructure.columnCount ? 1 : 0.5;
            result.similarity = (headerSimilarity * 0.7 + columnSimilarity * 0.3) * 100;

            // 일치 여부 판정
            result.match = result.similarity >= 70 && result.differences.length <= 2;

            // 권장 사항
            if (!result.match) {
                result.recommendations.push('예시 테이블의 구조를 참고하여 헤더를 수정하세요.');
            }

            return result;
        }

        /**
         * 서술문 구조 비교
         */
        _comparePHStructures(content, exampleContent) {
            const result = {
                match: true,
                similarity: 0,
                differences: [],
                recommendations: []
            };

            const contentValidation = this.validatePHFormat(content);
            const exampleValidation = this.validatePHFormat(exampleContent);

            const contentStructure = contentValidation.structure;
            const exampleStructure = exampleValidation.structure;

            // 구조 요소 비교
            if (exampleStructure.hasBullets && !contentStructure.hasBullets) {
                result.differences.push('예시에는 불릿 포인트가 있으나 현재 콘텐츠에는 없습니다.');
            }

            if (exampleStructure.hasNumberedList && !contentStructure.hasNumberedList) {
                result.differences.push('예시에는 번호 목록이 있으나 현재 콘텐츠에는 없습니다.');
            }

            if (exampleStructure.hasHeaders && !contentStructure.hasHeaders) {
                result.differences.push('예시에는 헤더가 있으나 현재 콘텐츠에는 없습니다.');
            }

            // 길이 비교
            const lengthRatio = contentStructure.length / exampleStructure.length;
            if (lengthRatio < 0.3) {
                result.differences.push('콘텐츠가 예시보다 훨씬 짧습니다.');
            } else if (lengthRatio > 3) {
                result.differences.push('콘텐츠가 예시보다 훨씬 깁니다.');
            }

            // 유사도 계산
            let similarityScore = 100;
            if (exampleStructure.hasBullets !== contentStructure.hasBullets) similarityScore -= 15;
            if (exampleStructure.hasNumberedList !== contentStructure.hasNumberedList) similarityScore -= 15;
            if (exampleStructure.hasHeaders !== contentStructure.hasHeaders) similarityScore -= 10;
            if (lengthRatio < 0.3 || lengthRatio > 3) similarityScore -= 20;

            result.similarity = Math.max(0, similarityScore);
            result.match = result.similarity >= 60 && result.differences.length <= 2;

            // 권장 사항
            if (!result.match) {
                result.recommendations.push('예시 서술문의 구조(불릿, 헤더 등)를 참고하세요.');
            }

            return result;
        }

        /**
         * 검증 결과 저장
         */
        logValidation(variableId, result) {
            this.validationResults.push({
                variableId: variableId,
                result: result,
                timestamp: new Date().toISOString()
            });
        }

        /**
         * 검증 결과 가져오기
         */
        getValidationResults() {
            return this.validationResults;
        }

        /**
         * 검증 결과 클리어
         */
        clearResults() {
            this.validationResults = [];
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.FormatValidator = FormatValidator;
        window.formatValidator = new FormatValidator();
        console.log('✅ FormatValidator module loaded');
    }

})();
