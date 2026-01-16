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
        this.totalSteps = 5;
        this.isProcessing = false;
        this.errors = [];

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
            { name: 'generatePSUR', fn: this.step5_generatePSUR.bind(this) }
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
                sections: this.generatedSections
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
