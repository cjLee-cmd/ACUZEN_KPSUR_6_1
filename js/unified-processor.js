/**
 * Unified Processor Module
 * 파일 업로드부터 PSUR 보고서 생성까지 통합 처리
 *
 * 처리 순서:
 * 1. 파일 검증
 * 2. 마크다운 변환 (각 파일)
 * 3. RAW ID 분류 (각 파일)
 * 4. 마크다운 통합 (totalMD)
 * 5. PSUR 보고서 생성 (LLM 단일 요청)
 */

class UnifiedProcessor {
    constructor() {
        this.files = [];
        this.markdowns = [];
        this.combinedMD = '';
        this.generatedReport = null;
        this.generatedSections = {};

        // 처리 상태
        this.currentStep = 0;
        this.totalSteps = 6;  // Step 6: Line Listing 분석 추가
        this.isProcessing = false;
        this.errors = [];
        this.lineListingCSValues = {};  // Line Listing에서 추출한 CS 값

        // 지원 파일 형식
        this.supportedFormats = ['.pdf', '.xlsx', '.xls', '.docx', '.txt', '.md'];
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
    }

    /**
     * 파일 추가 및 검증
     */
    addFiles(fileList) {
        const validFiles = [];
        const errors = [];

        for (const file of fileList) {
            const validation = this.validateFile(file);
            if (validation.valid) {
                validFiles.push({
                    file: file,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    rawId: null,
                    markdown: null,
                    status: 'pending'
                });
            } else {
                errors.push({
                    fileName: file.name,
                    error: validation.error
                });
            }
        }

        this.files = [...this.files, ...validFiles];
        return { added: validFiles.length, errors };
    }

    /**
     * 파일 검증
     */
    validateFile(file) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();

        if (!this.supportedFormats.includes(ext)) {
            return { valid: false, error: `지원하지 않는 형식: ${ext}` };
        }

        if (file.size > this.maxFileSize) {
            return { valid: false, error: `파일 크기 초과: ${(file.size / 1024 / 1024).toFixed(1)}MB > 50MB` };
        }

        return { valid: true };
    }

    /**
     * 파일 제거
     */
    removeFile(index) {
        if (index >= 0 && index < this.files.length) {
            this.files.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 전체 파일 목록 초기화
     */
    clearFiles() {
        this.files = [];
        this.markdowns = [];
        this.combinedMD = '';
        this.generatedReport = null;
        this.generatedSections = {};
        this.errors = [];
        this.lineListingCSValues = {};
    }

    /**
     * Step 1: 파일 검증 (이미 addFiles에서 수행됨)
     */
    async step1_validateFiles(onProgress) {
        if (onProgress) onProgress({ step: 1, message: '파일 검증 중...', progress: 0 });

        if (this.files.length === 0) {
            throw new Error('업로드된 파일이 없습니다.');
        }

        if (onProgress) onProgress({ step: 1, message: `${this.files.length}개 파일 검증 완료`, progress: 100 });
        return { success: true, fileCount: this.files.length };
    }

    /**
     * Step 2: 마크다운 변환
     */
    async step2_convertToMarkdown(onProgress) {
        if (onProgress) onProgress({ step: 2, message: '마크다운 변환 중...', progress: 0 });

        const converter = window.markdownConverter;
        const handler = window.fileHandler;

        if (!converter || !handler) {
            throw new Error('마크다운 변환 모듈이 로드되지 않았습니다.');
        }

        const total = this.files.length;
        let completed = 0;

        for (const fileItem of this.files) {
            try {
                // 파일 내용 읽기
                const fileData = await handler.readFile(fileItem.file);

                // 기본 마크다운 변환 (LLM 없이)
                let markdown = '';
                if (typeof converter.textToBasicMarkdown === 'function') {
                    markdown = converter.textToBasicMarkdown(fileData.text, fileItem.fileName);
                } else {
                    markdown = `# ${fileItem.fileName}\n\n${fileData.text}`;
                }

                fileItem.markdown = markdown;
                fileItem.status = 'converted';

                this.markdowns.push({
                    fileName: fileItem.fileName,
                    rawId: fileItem.rawId,
                    content: markdown
                });

            } catch (error) {
                fileItem.status = 'error';
                fileItem.error = error.message;
                this.errors.push({ file: fileItem.fileName, step: 2, error: error.message });
            }

            completed++;
            if (onProgress) {
                onProgress({
                    step: 2,
                    message: `변환 중: ${fileItem.fileName}`,
                    progress: Math.round((completed / total) * 100),
                    current: completed,
                    total: total
                });
            }
        }

        if (onProgress) onProgress({ step: 2, message: `${completed}개 파일 변환 완료`, progress: 100 });
        return { success: true, converted: completed };
    }

    /**
     * Step 3: RAW ID 분류
     */
    async step3_classifyRawIds(onProgress) {
        if (onProgress) onProgress({ step: 3, message: 'RAW ID 분류 중...', progress: 0 });

        const handler = window.fileHandler;
        if (!handler) {
            throw new Error('파일 핸들러 모듈이 로드되지 않았습니다.');
        }

        const total = this.files.length;
        let completed = 0;

        for (const fileItem of this.files) {
            try {
                // 규칙 기반 분류 시도
                let rawId = null;
                if (typeof handler.matchByFilename === 'function') {
                    rawId = handler.matchByFilename(fileItem.fileName);
                }

                // 분류 실패 시 LLM 사용 (옵션)
                if (!rawId && typeof handler.classifyWithLLM === 'function') {
                    const preview = fileItem.markdown ? fileItem.markdown.substring(0, 1500) : '';
                    const result = await handler.classifyWithLLM(fileItem.fileName, preview);
                    rawId = result?.rawId || null;
                }

                fileItem.rawId = rawId || 'UNKNOWN';

                // markdowns 배열에도 반영
                const mdItem = this.markdowns.find(m => m.fileName === fileItem.fileName);
                if (mdItem) {
                    mdItem.rawId = fileItem.rawId;
                }

            } catch (error) {
                fileItem.rawId = 'UNKNOWN';
                this.errors.push({ file: fileItem.fileName, step: 3, error: error.message });
            }

            completed++;
            if (onProgress) {
                onProgress({
                    step: 3,
                    message: `분류 중: ${fileItem.fileName} → ${fileItem.rawId}`,
                    progress: Math.round((completed / total) * 100),
                    current: completed,
                    total: total
                });
            }

            // API 레이트 리밋 방지
            await this.delay(100);
        }

        if (onProgress) onProgress({ step: 3, message: `${completed}개 파일 분류 완료`, progress: 100 });
        return { success: true, classified: completed };
    }

    /**
     * Step 4: 마크다운 통합
     */
    async step4_combineMarkdowns(onProgress) {
        if (onProgress) onProgress({ step: 4, message: '마크다운 통합 중...', progress: 0 });

        const generator = window.PSURGenerator;
        if (!generator) {
            throw new Error('PSUR 생성기 모듈이 로드되지 않았습니다.');
        }

        // markdowns 배열 준비
        const markdownsForCombine = this.markdowns.map(m => ({
            fileName: m.fileName,
            rawId: m.rawId || 'UNKNOWN',
            markdown: m.content
        }));

        // PSURGenerator의 combineAllMarkdowns 사용
        this.combinedMD = generator.combineAllMarkdowns(markdownsForCombine);

        // localStorage에 저장
        try {
            localStorage.setItem('combinedMarkdown', JSON.stringify({
                content: this.combinedMD,
                fileCount: this.markdowns.length,
                generatedAt: new Date().toISOString()
            }));
        } catch (e) {
            console.warn('[UnifiedProcessor] localStorage 저장 실패:', e);
        }

        if (onProgress) onProgress({ step: 4, message: '마크다운 통합 완료', progress: 100 });
        return { success: true, length: this.combinedMD.length };
    }

    /**
     * Step 5: PSUR 보고서 생성
     */
    async step5_generatePSUR(onProgress) {
        if (onProgress) onProgress({ step: 5, message: 'PSUR 보고서 생성 중...', progress: 0 });

        const generator = window.PSURGenerator;
        if (!generator) {
            throw new Error('PSUR 생성기 모듈이 로드되지 않았습니다.');
        }

        // API 키 확인
        const apiKey = localStorage.getItem('GOOGLE_API_KEY');
        if (!apiKey) {
            throw new Error('Google API 키가 설정되지 않았습니다. 설정 페이지에서 API 키를 입력하세요.');
        }
        generator.apiKey = apiKey;

        // 진행 상태 콜백
        const progressCallback = (info) => {
            if (onProgress) {
                let progress = 10;
                switch (info.step) {
                    case 'templates': progress = 20; break;
                    case 'examples': progress = 30; break;
                    case 'testdata': progress = 40; break;
                    case 'combine': progress = 50; break;
                    case 'prompt': progress = 60; break;
                    case 'api': progress = 70; break;
                    case 'complete': progress = 100; break;
                }
                onProgress({ step: 5, message: info.message, progress });
            }
        };

        // generateFullReport 호출
        const result = await generator.generateFullReport({
            convertedMarkdowns: this.markdowns.map(m => ({
                fileName: m.fileName,
                rawId: m.rawId,
                markdown: m.content
            })),
            useTestData: false,
            onProgress: progressCallback
        });

        if (!result.success) {
            throw new Error(result.error || 'PSUR 생성 실패');
        }

        this.generatedReport = result.report;

        // 섹션별로 파싱
        if (generator.parseSectionsFromResponse) {
            this.generatedSections = generator.parseSectionsFromResponse(result.report.content);
        } else {
            // 기본 파싱 (## 섹션번호. 패턴 기준)
            this.generatedSections = this.parseSections(result.report.content);
        }

        // localStorage에 저장
        try {
            localStorage.setItem('generatedSections', JSON.stringify(this.generatedSections));
            localStorage.setItem('generatedPSURReport', JSON.stringify(this.generatedReport));
        } catch (e) {
            console.warn('[UnifiedProcessor] localStorage 저장 실패:', e);
        }

        if (onProgress) onProgress({ step: 5, message: 'PSUR 보고서 생성 완료', progress: 100 });
        return { success: true, report: this.generatedReport, sections: this.generatedSections };
    }

    /**
     * Step 6: Line Listing 자동 분석
     * RAW12-15 파일에서 Seriousness/Causality/SOC 분석 후 CS 값 추출
     */
    async step6_analyzeLineListings(onProgress) {
        if (onProgress) onProgress({ step: 6, message: 'Line Listing 분석 확인 중...', progress: 0 });

        const extractor = window.extractLineListings;
        if (!extractor) {
            console.warn('[UnifiedProcessor] Line Listing 모듈 미로드, 스킵');
            return { success: true, skipped: true, message: 'Line Listing 모듈 없음' };
        }

        // Line Listing 파일 확인
        const lineListingFiles = extractor.getLineListingFilesFromStorage();
        if (!lineListingFiles || lineListingFiles.length === 0) {
            if (onProgress) onProgress({ step: 6, message: 'Line Listing 파일 없음 (스킵)', progress: 100 });
            return { success: true, skipped: true, message: 'Line Listing 파일 없음' };
        }

        console.log(`[UnifiedProcessor] Line Listing 파일 ${lineListingFiles.length}개 감지`);
        if (onProgress) onProgress({ step: 6, message: `${lineListingFiles.length}개 Line Listing 파일 분석 시작...`, progress: 10 });

        const fileResults = [];
        let processedCount = 0;

        for (const file of lineListingFiles) {
            try {
                if (!file.markdownContent) {
                    console.warn(`[UnifiedProcessor] ${file.name}: 마크다운 없음, 스킵`);
                    continue;
                }

                // 마크다운 테이블 파싱
                const { aeData, causData } = extractor.parseMarkdownTable(file.markdownContent);
                if (!aeData || aeData.length === 0) {
                    console.warn(`[UnifiedProcessor] ${file.name}: 이상사례 데이터 없음`);
                    continue;
                }

                if (onProgress) {
                    onProgress({
                        step: 6,
                        message: `분석 중: ${file.name} (${aeData.length}건)`,
                        progress: 10 + Math.round((processedCount / lineListingFiles.length) * 60)
                    });
                }

                // LLM 분석 실행 (Seriousness, Causality, SOC)
                const apiKey = localStorage.getItem('GOOGLE_API_KEY');
                if (apiKey) {
                    const analysisResult = await extractor.analyzeWithLLM(aeData, causData, {
                        apiKey: apiKey,
                        batchSize: 30,
                        provider: 'gemini'
                    });

                    if (analysisResult && analysisResult.processedData) {
                        fileResults.push({
                            rawId: file.rawId,
                            fileName: file.name,
                            processedData: analysisResult.processedData,
                            statistics: extractor.statistics
                        });

                        console.log(`[UnifiedProcessor] ${file.rawId} 분석 완료: ${analysisResult.processedData.length}건`);
                    }
                } else {
                    // API 키 없으면 기본 파싱만 수행
                    extractor.processedData = aeData;
                    extractor.updateStatistics();

                    fileResults.push({
                        rawId: file.rawId,
                        fileName: file.name,
                        processedData: aeData,
                        statistics: extractor.statistics
                    });

                    console.log(`[UnifiedProcessor] ${file.rawId} 기본 분석: ${aeData.length}건 (LLM 미사용)`);
                }

                processedCount++;

            } catch (error) {
                console.error(`[UnifiedProcessor] ${file.name} 분석 오류:`, error);
                this.errors.push({ file: file.name, step: 6, error: error.message });
            }

            // API 레이트 리밋 방지
            await this.delay(200);
        }

        // CS 값 추출
        if (onProgress) onProgress({ step: 6, message: 'CS 값 추출 중...', progress: 80 });

        this.lineListingCSValues = extractor.extractAllCSValues(fileResults);

        // extractedData에 저장 (Supabase + localStorage)
        await this.mergeLineListingCSToExtractedData();

        // localStorage에 분석 결과 저장
        const reportId = localStorage.getItem('current_report');
        extractor.saveToStorage(reportId);

        if (onProgress) onProgress({ step: 6, message: `Line Listing 분석 완료 (${processedCount}개 파일)`, progress: 100 });

        return {
            success: true,
            analyzed: processedCount,
            csValues: this.lineListingCSValues,
            fileResults: fileResults
        };
    }

    /**
     * Line Listing에서 추출한 CS 값을 extractedData에 병합 (localStorage + Supabase)
     */
    async mergeLineListingCSToExtractedData() {
        if (!this.lineListingCSValues || Object.keys(this.lineListingCSValues).length === 0) {
            return;
        }

        const reportId = localStorage.getItem('current_report');

        // localStorage에서 기존 extractedData 로드
        let extractedData = {};
        try {
            const stored = localStorage.getItem('extractedData');
            if (stored) {
                extractedData = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[UnifiedProcessor] extractedData 로드 실패:', e);
        }

        // CS 섹션 초기화
        if (!extractedData.CS) {
            extractedData.CS = {};
        }

        // Supabase 저장용 배열
        const supabaseItems = [];

        // Line Listing CS 값 병합
        for (const [key, value] of Object.entries(this.lineListingCSValues)) {
            // 배열인 경우 쉼표로 조인 (줄바꿈은 DB에서 문제가 될 수 있음)
            const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);

            // RAW ID 추출 (CS25는 RAW12/13, CS28-30은 RAW14)
            let sourceRawId = 'LINE_LISTING';
            if (key.includes('CS25')) {
                sourceRawId = 'RAW12';
            } else if (key.includes('CS28') || key.includes('CS29') || key.includes('CS30')) {
                sourceRawId = 'RAW14';
            } else if (key.includes('CS34')) {
                sourceRawId = 'RAW15';
            }

            extractedData.CS[key] = {
                value: formattedValue,
                source: sourceRawId,
                extractedAt: new Date().toISOString()
            };

            // Supabase 저장용 데이터 준비
            supabaseItems.push({
                variable_id: key,
                data_value: formattedValue,
                source_raw_id: sourceRawId
            });

            console.log(`[UnifiedProcessor] CS 병합: ${key} = ${formattedValue.substring(0, 50)}...`);
        }

        // localStorage에 저장
        try {
            localStorage.setItem('extractedData', JSON.stringify(extractedData));
            console.log('[UnifiedProcessor] extractedData localStorage 저장 완료');
        } catch (e) {
            console.error('[UnifiedProcessor] extractedData localStorage 저장 실패:', e);
        }

        // Supabase에 저장
        if (reportId && window.supabaseClient && supabaseItems.length > 0) {
            try {
                const result = await window.supabaseClient.saveExtractedData(reportId, supabaseItems);
                if (result.error) {
                    console.error('[UnifiedProcessor] Supabase 저장 실패:', result.error);
                } else {
                    console.log(`[UnifiedProcessor] Supabase 저장 완료: ${supabaseItems.length}개 CS 변수`);
                }
            } catch (e) {
                console.error('[UnifiedProcessor] Supabase 저장 예외:', e);
            }
        }
    }

    /**
     * 섹션 파싱 (기본 구현)
     */
    parseSections(content) {
        const sections = {};
        const sectionPattern = /##\s*(\d{2})[.\s]+([^\n]+)\n([\s\S]*?)(?=##\s*\d{2}[.\s]|$)/g;

        let match;
        while ((match = sectionPattern.exec(content)) !== null) {
            const sectionId = match[1];
            const sectionName = match[2].trim();
            const sectionContent = match[3].trim();

            sections[sectionId] = {
                id: sectionId,
                name: sectionName,
                content: `## ${sectionId}. ${sectionName}\n\n${sectionContent}`,
                generatedAt: new Date().toISOString()
            };
        }

        return sections;
    }

    /**
     * 전체 처리 실행
     */
    async processAll(onStepComplete, onError) {
        if (this.isProcessing) {
            throw new Error('이미 처리 중입니다.');
        }

        this.isProcessing = true;
        this.errors = [];

        const steps = [
            { name: 'validateFiles', fn: this.step1_validateFiles.bind(this) },
            { name: 'convertToMarkdown', fn: this.step2_convertToMarkdown.bind(this) },
            { name: 'classifyRawIds', fn: this.step3_classifyRawIds.bind(this) },
            { name: 'combineMarkdowns', fn: this.step4_combineMarkdowns.bind(this) },
            { name: 'generatePSUR', fn: this.step5_generatePSUR.bind(this) },
            { name: 'analyzeLineListings', fn: this.step6_analyzeLineListings.bind(this) }
        ];

        try {
            for (let i = 0; i < steps.length; i++) {
                this.currentStep = i + 1;
                const step = steps[i];

                try {
                    const result = await step.fn((progress) => {
                        if (onStepComplete) {
                            onStepComplete({
                                stepNumber: i + 1,
                                stepName: step.name,
                                ...progress
                            });
                        }
                    });

                    if (onStepComplete) {
                        onStepComplete({
                            stepNumber: i + 1,
                            stepName: step.name,
                            completed: true,
                            result
                        });
                    }
                } catch (stepError) {
                    if (onError) {
                        onError({
                            stepNumber: i + 1,
                            stepName: step.name,
                            error: stepError.message
                        });
                    }
                    throw stepError;
                }
            }

            this.isProcessing = false;
            return {
                success: true,
                files: this.files,
                markdowns: this.markdowns,
                combinedMD: this.combinedMD,
                report: this.generatedReport,
                sections: this.generatedSections,
                lineListingCSValues: this.lineListingCSValues
            };

        } catch (error) {
            this.isProcessing = false;
            throw error;
        }
    }

    /**
     * 처리 결과 가져오기
     */
    getResults() {
        return {
            files: this.files,
            markdowns: this.markdowns,
            combinedMD: this.combinedMD,
            report: this.generatedReport,
            sections: this.generatedSections,
            lineListingCSValues: this.lineListingCSValues,
            errors: this.errors
        };
    }

    /**
     * 처리 상태 가져오기
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            fileCount: this.files.length,
            errorCount: this.errors.length
        };
    }

    /**
     * 지연 함수
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 전역으로 노출
window.UnifiedProcessor = UnifiedProcessor;
window.unifiedProcessor = new UnifiedProcessor();
