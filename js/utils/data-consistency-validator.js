/**
 * Data Consistency Validator
 * js/utils/data-consistency-validator.js
 *
 * 사용자 입력 데이터와 RAW 파일 데이터 간의 일관성 검증
 * - 품목허가일과 판매 데이터 연도 비교
 * - 제품명/성분명과 RAW 파일 내 제품명 비교
 * - 보고기간과 데이터 기간 비교
 */

(function() {
    'use strict';

    /**
     * DataConsistencyValidator - 데이터 일관성 검증 클래스
     */
    class DataConsistencyValidator {
        constructor() {
            this.validationResults = [];
            this.warnings = [];
            this.errors = [];
        }

        /**
         * 전체 검증 실행
         * @param {Object} userInputs - P13에서 입력된 사용자 데이터
         * @param {Array} markdownFiles - 변환된 마크다운 파일 목록
         * @returns {Object} 검증 결과
         */
        async validate(userInputs, markdownFiles) {
            console.log('[DataConsistencyValidator] Starting validation...');

            this.validationResults = [];
            this.warnings = [];
            this.errors = [];

            // 1. 품목허가일 vs 판매 데이터 연도 검증
            this.validateSalesDataPeriod(userInputs, markdownFiles);

            // 2. 제품명/성분명 일관성 검증
            this.validateProductNameConsistency(userInputs, markdownFiles);

            // 3. 보고기간 vs 데이터 기간 검증
            this.validateReportingPeriod(userInputs, markdownFiles);

            // 4. 임상시험 데이터 일관성 검증
            this.validateClinicalTrialData(userInputs, markdownFiles);

            // 5. LineListing 데이터 기간 검증
            this.validateLineListingPeriod(userInputs, markdownFiles);

            const result = {
                isValid: this.errors.length === 0,
                hasWarnings: this.warnings.length > 0,
                errors: this.errors,
                warnings: this.warnings,
                details: this.validationResults,
                summary: this.generateSummary()
            };

            console.log('[DataConsistencyValidator] Validation complete:', result.summary);
            return result;
        }

        /**
         * 1. 품목허가일 vs 판매 데이터 연도 검증
         */
        validateSalesDataPeriod(userInputs, markdownFiles) {
            const approvalDate = userInputs.CS5_국내허가일자 || userInputs.approval_date;
            if (!approvalDate) {
                this.validationResults.push({
                    rule: 'sales_period',
                    status: 'skipped',
                    message: '품목허가일 정보 없음'
                });
                return;
            }

            const approvalYear = new Date(approvalDate).getFullYear();

            // RAW3 마크다운 파일 찾기
            const raw3Files = markdownFiles.filter(f =>
                f.rawId === 'RAW3' ||
                (f.filename && f.filename.includes('RAW3'))
            );

            if (raw3Files.length === 0) {
                this.validationResults.push({
                    rule: 'sales_period',
                    status: 'skipped',
                    message: 'RAW3 (시판후sales데이터) 파일 없음'
                });
                return;
            }

            // 마크다운에서 연도 추출
            for (const file of raw3Files) {
                const content = file.markdownContent || file.content || '';
                const years = this.extractYearsFromContent(content);

                if (years.length > 0) {
                    const minYear = Math.min(...years);
                    const maxYear = Math.max(...years);

                    // 품목허가 전 판매 데이터가 있는지 확인
                    if (minYear < approvalYear) {
                        this.warnings.push({
                            type: 'DATA_PERIOD_MISMATCH',
                            severity: 'warning',
                            title: '판매 데이터 기간 불일치',
                            message: `품목허가일(${approvalYear}년) 이전의 판매 데이터가 있습니다.`,
                            details: `RAW3 데이터 기간: ${minYear}년 ~ ${maxYear}년`,
                            suggestion: '테스트 데이터와 제품 정보가 일치하는지 확인하세요.',
                            rawId: 'RAW3',
                            file: file.filename
                        });
                    }

                    this.validationResults.push({
                        rule: 'sales_period',
                        status: minYear >= approvalYear ? 'pass' : 'warning',
                        approvalYear,
                        dataYearRange: { min: minYear, max: maxYear }
                    });
                }
            }
        }

        /**
         * 2. 제품명/성분명 일관성 검증
         */
        validateProductNameConsistency(userInputs, markdownFiles) {
            const brandName = userInputs.CS1_브랜드명 || userInputs.brand_name || '';
            const ingredientName = userInputs.CS0_성분명 || userInputs.ingredient_name || '';
            const companyName = userInputs.CS2_회사명 || userInputs.company_name || '';

            if (!brandName && !ingredientName) {
                this.validationResults.push({
                    rule: 'product_name',
                    status: 'skipped',
                    message: '제품명/성분명 정보 없음'
                });
                return;
            }

            // 검증할 RAW 파일들
            const targetRawIds = ['RAW1.1', 'RAW2.1', 'RAW2.2', 'RAW8', 'RAW3'];

            for (const rawId of targetRawIds) {
                const files = markdownFiles.filter(f =>
                    f.rawId === rawId ||
                    (f.filename && f.filename.includes(rawId.replace('.', '')))
                );

                for (const file of files) {
                    const content = (file.markdownContent || file.content || '').toLowerCase();

                    // 제품명 포함 여부 확인
                    const brandFound = brandName && content.includes(brandName.toLowerCase());
                    const ingredientFound = ingredientName && content.includes(ingredientName.toLowerCase());

                    // 다른 제품명이 주로 언급되는지 확인
                    const otherProducts = this.detectOtherProductNames(content, brandName, ingredientName);

                    if (otherProducts.length > 0 && !brandFound && !ingredientFound) {
                        this.warnings.push({
                            type: 'PRODUCT_NAME_MISMATCH',
                            severity: 'warning',
                            title: '제품명 불일치 가능성',
                            message: `${rawId} 파일에 다른 제품명이 발견되었습니다.`,
                            details: `발견된 제품명: ${otherProducts.join(', ')}`,
                            expected: `예상 제품명: ${brandName || ingredientName}`,
                            suggestion: '해당 RAW 파일이 올바른 제품의 데이터인지 확인하세요.',
                            rawId: rawId,
                            file: file.filename
                        });
                    }
                }
            }

            this.validationResults.push({
                rule: 'product_name',
                status: this.warnings.filter(w => w.type === 'PRODUCT_NAME_MISMATCH').length === 0 ? 'pass' : 'warning',
                brandName,
                ingredientName
            });
        }

        /**
         * 3. 보고기간 vs 데이터 기간 검증
         */
        validateReportingPeriod(userInputs, markdownFiles) {
            const reportStartDate = userInputs.CS3_보고시작날짜 || userInputs.report_start_date;
            const reportEndDate = userInputs.CS4_보고종료날짜 || userInputs.report_end_date;

            if (!reportStartDate || !reportEndDate) {
                this.validationResults.push({
                    rule: 'reporting_period',
                    status: 'skipped',
                    message: '보고기간 정보 없음'
                });
                return;
            }

            const startYear = new Date(reportStartDate).getFullYear();
            const endYear = new Date(reportEndDate).getFullYear();

            // RAW3 데이터 기간과 보고기간 비교
            const raw3Files = markdownFiles.filter(f => f.rawId === 'RAW3');

            for (const file of raw3Files) {
                const content = file.markdownContent || file.content || '';
                const years = this.extractYearsFromContent(content);

                if (years.length > 0) {
                    const dataMinYear = Math.min(...years);
                    const dataMaxYear = Math.max(...years);

                    // 보고기간 이전 데이터만 있는 경우
                    if (dataMaxYear < startYear) {
                        this.warnings.push({
                            type: 'REPORTING_PERIOD_MISMATCH',
                            severity: 'warning',
                            title: '보고기간과 데이터 기간 불일치',
                            message: `RAW3 데이터가 보고기간 이전에 종료됩니다.`,
                            details: `보고기간: ${startYear}~${endYear}년, 데이터 기간: ${dataMinYear}~${dataMaxYear}년`,
                            rawId: 'RAW3',
                            file: file.filename
                        });
                    }
                }
            }

            this.validationResults.push({
                rule: 'reporting_period',
                status: 'checked',
                reportPeriod: { start: startYear, end: endYear }
            });
        }

        /**
         * 4. 임상시험 데이터 일관성 검증
         */
        validateClinicalTrialData(userInputs, markdownFiles) {
            const brandName = userInputs.CS1_브랜드명 || userInputs.brand_name || '';
            const ingredientName = userInputs.CS0_성분명 || userInputs.ingredient_name || '';
            const companyName = userInputs.CS2_회사명 || userInputs.company_name || '';

            // RAW8 (임상노출데이터) 파일 확인
            const raw8Files = markdownFiles.filter(f =>
                f.rawId === 'RAW8' ||
                (f.filename && f.filename.includes('RAW8'))
            );

            for (const file of raw8Files) {
                const content = (file.markdownContent || file.content || '').toLowerCase();

                // 다른 회사/제품의 임상시험 데이터가 있는지 확인
                const competitorProducts = [
                    'astrazeneca', '아스트라제네카',
                    'moderna', '모더나',
                    'janssen', '얀센',
                    'novavax', '노바백스'
                ];

                const foundCompetitors = competitorProducts.filter(p => content.includes(p.toLowerCase()));

                // 현재 제품명이 없고 경쟁사 제품이 있는 경우
                const brandFound = brandName && content.includes(brandName.toLowerCase());
                const ingredientFound = ingredientName && content.includes(ingredientName.toLowerCase());

                if (foundCompetitors.length > 0 && !brandFound && !ingredientFound) {
                    this.warnings.push({
                        type: 'CLINICAL_DATA_MISMATCH',
                        severity: 'warning',
                        title: '임상시험 데이터 불일치',
                        message: `RAW8에 다른 제품의 임상시험 데이터가 포함되어 있습니다.`,
                        details: `발견된 제품/회사: ${foundCompetitors.join(', ')}`,
                        expected: `예상 제품: ${brandName || ingredientName}`,
                        suggestion: 'RAW8 파일이 올바른 제품의 임상시험 데이터인지 확인하세요.',
                        rawId: 'RAW8',
                        file: file.filename
                    });
                }
            }

            this.validationResults.push({
                rule: 'clinical_trial',
                status: 'checked'
            });
        }

        /**
         * 5. LineListing 데이터 기간 검증
         */
        validateLineListingPeriod(userInputs, markdownFiles) {
            const reportStartDate = userInputs.CS3_보고시작날짜 || userInputs.report_start_date;
            const reportEndDate = userInputs.CS4_보고종료날짜 || userInputs.report_end_date;

            if (!reportStartDate || !reportEndDate) {
                return;
            }

            const startDate = new Date(reportStartDate);
            const endDate = new Date(reportEndDate);

            // RAW19 또는 RAW12-15 파일 확인
            const lineListingFiles = markdownFiles.filter(f =>
                ['RAW19', 'RAW12', 'RAW13', 'RAW14', 'RAW15'].includes(f.rawId) ||
                (f.filename && /RAW1[2-5]|RAW19/.test(f.filename))
            );

            for (const file of lineListingFiles) {
                const content = file.markdownContent || file.content || '';
                const dates = this.extractDatesFromContent(content);

                if (dates.length > 0) {
                    const outOfRangeDates = dates.filter(d => d < startDate || d > endDate);

                    if (outOfRangeDates.length > dates.length * 0.3) { // 30% 이상이 기간 외
                        this.warnings.push({
                            type: 'LINELISTING_PERIOD_MISMATCH',
                            severity: 'info',
                            title: 'LineListing 데이터 기간 참고',
                            message: `일부 이상사례 보고일이 보고기간 외에 있습니다.`,
                            details: `보고기간 외 데이터 비율: ${Math.round(outOfRangeDates.length / dates.length * 100)}%`,
                            rawId: file.rawId,
                            file: file.filename
                        });
                    }
                }
            }
        }

        /**
         * 콘텐츠에서 연도 추출
         */
        extractYearsFromContent(content) {
            const yearPattern = /\b(20[0-2][0-9]|19[89][0-9])\b/g;
            const matches = content.match(yearPattern) || [];
            return [...new Set(matches.map(y => parseInt(y)))].filter(y => y >= 1990 && y <= 2030);
        }

        /**
         * 콘텐츠에서 날짜 추출
         */
        extractDatesFromContent(content) {
            const dates = [];

            // YYYY-MM-DD 형식
            const pattern1 = /\b(20[0-2][0-9])[-\/](0[1-9]|1[0-2])[-\/](0[1-9]|[12][0-9]|3[01])\b/g;
            let match;
            while ((match = pattern1.exec(content)) !== null) {
                dates.push(new Date(match[0]));
            }

            // YYYY.MM.DD 형식
            const pattern2 = /\b(20[0-2][0-9])\.(0[1-9]|1[0-2])\.(0[1-9]|[12][0-9]|3[01])\b/g;
            while ((match = pattern2.exec(content)) !== null) {
                dates.push(new Date(match[0].replace(/\./g, '-')));
            }

            return dates.filter(d => !isNaN(d.getTime()));
        }

        /**
         * 다른 제품명 감지
         */
        detectOtherProductNames(content, brandName, ingredientName) {
            const knownProducts = [
                // COVID-19 백신
                { names: ['comirnaty', '코미나티'], company: 'pfizer' },
                { names: ['spikevax', '스파이크백스'], company: 'moderna' },
                { names: ['vaxzevria', '백스제브리아', 'astrazeneca', '아스트라제네카'], company: 'astrazeneca' },
                { names: ['janssen', '얀센'], company: 'janssen' },
                { names: ['novavax', '노바백스', '뉴백소비드'], company: 'novavax' },
                // 기타 일반 의약품 (예시)
                { names: ['lipitor', '리피토'], company: 'pfizer' },
                { names: ['viagra', '비아그라'], company: 'pfizer' },
            ];

            const foundProducts = [];
            const normalizedBrand = (brandName || '').toLowerCase();
            const normalizedIngredient = (ingredientName || '').toLowerCase();

            for (const product of knownProducts) {
                for (const name of product.names) {
                    if (content.includes(name.toLowerCase())) {
                        // 현재 제품이 아닌 경우에만 추가
                        if (!normalizedBrand.includes(name.toLowerCase()) &&
                            !normalizedIngredient.includes(name.toLowerCase()) &&
                            !name.toLowerCase().includes(normalizedBrand) &&
                            !name.toLowerCase().includes(normalizedIngredient)) {
                            foundProducts.push(name);
                        }
                    }
                }
            }

            return [...new Set(foundProducts)];
        }

        /**
         * 검증 결과 요약 생성
         */
        generateSummary() {
            return {
                totalChecks: this.validationResults.length,
                passed: this.validationResults.filter(r => r.status === 'pass').length,
                warnings: this.warnings.length,
                errors: this.errors.length,
                skipped: this.validationResults.filter(r => r.status === 'skipped').length
            };
        }

        /**
         * 검증 결과를 HTML로 렌더링
         */
        renderResultsHTML() {
            if (this.warnings.length === 0 && this.errors.length === 0) {
                return `
                    <div class="validation-success">
                        <i class="fas fa-check-circle"></i>
                        <span>데이터 일관성 검증 통과</span>
                    </div>
                `;
            }

            let html = '<div class="validation-results">';

            // 에러 표시
            for (const error of this.errors) {
                html += `
                    <div class="validation-item validation-error">
                        <div class="validation-header">
                            <i class="fas fa-times-circle"></i>
                            <strong>${error.title}</strong>
                        </div>
                        <p>${error.message}</p>
                        ${error.details ? `<small>${error.details}</small>` : ''}
                        ${error.suggestion ? `<div class="validation-suggestion">💡 ${error.suggestion}</div>` : ''}
                    </div>
                `;
            }

            // 경고 표시
            for (const warning of this.warnings) {
                const icon = warning.severity === 'warning' ? 'exclamation-triangle' : 'info-circle';
                const className = warning.severity === 'warning' ? 'validation-warning' : 'validation-info';

                html += `
                    <div class="validation-item ${className}">
                        <div class="validation-header">
                            <i class="fas fa-${icon}"></i>
                            <strong>${warning.title}</strong>
                            <span class="validation-rawid">${warning.rawId || ''}</span>
                        </div>
                        <p>${warning.message}</p>
                        ${warning.details ? `<small>${warning.details}</small>` : ''}
                        ${warning.expected ? `<small>예상: ${warning.expected}</small>` : ''}
                        ${warning.suggestion ? `<div class="validation-suggestion">💡 ${warning.suggestion}</div>` : ''}
                    </div>
                `;
            }

            html += '</div>';
            return html;
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.DataConsistencyValidator = DataConsistencyValidator;
        window.dataConsistencyValidator = new DataConsistencyValidator();
    }

})();
