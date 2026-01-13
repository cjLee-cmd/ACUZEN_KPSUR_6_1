/**
 * Unified Processing Page Script
 * pages/js/unified-processing.js
 *
 * P14_UnifiedProcessing.html 인라인 스크립트 분리
 * Stage 2: 파일 업로드, 마크다운 변환, LLM 분류, PSUR 섹션 생성
 *
 * @requires RawIdDetector - js/utils/raw-id-detector.js (RAW ID 감지 모듈)
 */

(function() {
    'use strict';

    // ========================================
    // RAW ID 모듈 참조 (Single Source of Truth: raw-id-detector.js)
    // ========================================

    // 모듈 로드 확인
    const isRawIdModuleLoaded = () => {
        return window.RawIdDetector &&
               window.RawIdDetector.ZONE_RAW_ID_MAPPING &&
               window.RawIdDetector.STEP3_RAW_ID_OPTIONS;
    };

    // 모듈 참조 (없으면 에러 로깅)
    function getModule() {
        if (!isRawIdModuleLoaded()) {
            console.error('[UnifiedProcessing] RawIdDetector 모듈 미로드! raw-id-detector.js 확인 필요');
            return {
                ZONE_RAW_ID_MAPPING: {},
                STEP3_RAW_ID_OPTIONS: [],
                detectRawIdForZone: (f, z) => null,
                detectRawIdDetailed: (f) => null,
                detectRawIdFromFileName: (f) => null
            };
        }
        return window.RawIdDetector;
    }

    // Zone별 RAW ID 매핑 - 모듈에서만 참조 (중복 데이터 제거)
    const getRawIdMapping = () => getModule().ZONE_RAW_ID_MAPPING;
    const getStep3RawIdOptions = () => getModule().STEP3_RAW_ID_OPTIONS;

    // ========================================
    // 전역 상태
    // ========================================
    let currentStep = 1;
    const totalSteps = 3;

    // 파일 저장소 (zone별) - Step 1, 2, 3
    const uploadedFiles = {
        // Step 1
        startPeriod: [],      // RAW1.2, RAW2.6
        endPeriod: [],        // RAW1.1, RAW2.1~2.3
        changeHistory: [],    // RAW5, RAW6, RAW7
        // Step 2
        sponsored: [],        // RAW8
        iitnis: [],           // RAW17
        // Step 3 - Line Listing
        lineListing_domestic: [],   // RAW13 - 국내 신속보고
        lineListing_foreign: [],    // RAW12 - 국외 신속보고
        lineListing_raw: [],        // RAW14 - 원시자료
        lineListing_periodic: []    // RAW15 - 정기보고
    };

    // Step 3 파일 저장소 (드랍다운 선택 방식)
    const step3Files = [];  // { file, name, size, rawId }

    // ========================================
    // 파일명 기반 RAW ID 자동 감지 (모듈 함수 래퍼)
    // ========================================
    /**
     * 파일명에서 RAW ID를 감지합니다.
     * RawIdDetector 모듈의 detectRawIdForZone 함수를 사용합니다.
     *
     * @param {string} filename - 파일명
     * @param {string[]} candidates - zone별 RAW ID 후보 목록
     * @returns {string|null} - 감지된 RAW ID 또는 첫 번째 후보
     */
    function detectRawIdFromFilename(filename, candidates) {
        const detector = getModule();

        // 모듈 로드 여부 확인
        if (detector.detectRawIdDetailed) {
            const detected = detector.detectRawIdDetailed(filename, candidates);
            if (detected) {
                return detected;
            }
        }

        // Fallback: 첫 번째 후보 반환
        return candidates && candidates.length > 0 ? candidates[0] : null;
    }

    // ========================================
    // 초기화
    // ========================================
    async function initializePage() {
        initDarkMode();
        await loadSavedState();  // 저장된 데이터 복원
        updateStepUI();
    }

    // ========================================
    // 저장된 상태 복원
    // ========================================
    async function loadSavedState() {
        const urlParams = new URLSearchParams(window.location.search);
        const reportId = urlParams.get('reportId');

        if (!reportId) {
            console.log('[P14] reportId 없음 - 새 세션');
            return;
        }

        console.log('[P14] 저장된 상태 복원 시작, reportId:', reportId);

        try {
            showToast('저장된 데이터를 불러오는 중...', 'info');

            // 1. DB에서 reports.user_inputs 로드 시도
            if (window.supabaseClient && typeof window.supabaseClient.getReport === 'function') {
                const report = await window.supabaseClient.getReport(reportId);
                if (report?.user_inputs?.stage2) {
                    console.log('[P14] DB에서 stage2 데이터 발견');
                    await restoreStateFromUserInputs(report.user_inputs.stage2);
                    showToast('저장된 데이터를 복원했습니다', 'success');
                    return;
                }
            }

            // 2. Fallback: localStorage에서 로드
            const restored = await restoreStateFromLocalStorage();
            if (restored) {
                showToast('저장된 데이터를 복원했습니다', 'success');
            }

        } catch (error) {
            console.error('[P14] 상태 복원 실패:', error);
            showToast('저장된 데이터 로드 실패', 'error');
        }
    }

    async function restoreStateFromUserInputs(stage2Data) {
        console.log('[P14] user_inputs에서 복원:', stage2Data);

        // Step 1-2 파일 복원
        if (stage2Data.uploadedFiles) {
            Object.keys(uploadedFiles).forEach(zone => {
                if (stage2Data.uploadedFiles[zone]) {
                    uploadedFiles[zone] = stage2Data.uploadedFiles[zone].map(file => ({
                        ...file,
                        isRestored: true  // UI 표시용 플래그
                    }));
                }
            });
        }

        // Step 3 파일 복원
        if (stage2Data.step3Files) {
            step3Files.length = 0;
            stage2Data.step3Files.forEach(file => {
                step3Files.push({ ...file, isRestored: true });
            });
        }

        // 라디오 버튼 상태 복원
        if (stage2Data.radioStates) {
            setRadioStatesFromData(stage2Data.radioStates);
        }

        // 처리 완료 상태 복원
        if (stage2Data.processingComplete) {
            markProcessingComplete();
        }

        // UI 갱신
        renderAllFileLists();
        updateAllUploadButtons();
    }

    async function restoreStateFromLocalStorage() {
        console.log('[P14] localStorage에서 복원 시도');

        // localStorage에서 복원
        const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
        const savedMarkdowns = JSON.parse(localStorage.getItem('convertedMarkdowns') || '{}');

        if (Array.isArray(savedFiles) && savedFiles.length > 0) {
            // uploadedFiles 배열 형식인 경우 (이전 저장 형식)
            savedFiles.forEach(file => {
                const zoneId = file.zoneId;
                if (zoneId === 'step3') {
                    step3Files.push({
                        name: file.fileName,
                        size: file.fileSize,
                        rawId: file.rawId,
                        isRestored: true
                    });
                } else if (uploadedFiles[zoneId]) {
                    uploadedFiles[zoneId].push({
                        name: file.fileName,
                        size: file.fileSize,
                        rawIdCandidates: getRawIdMapping()[zoneId] || [],
                        isRestored: true
                    });
                }
            });

            renderAllFileLists();
            updateAllUploadButtons();
            console.log('[P14] localStorage에서 복원 완료:', savedFiles.length, '개 파일');
            return true;
        }

        console.log('[P14] localStorage에 저장된 파일 없음');
        return false;
    }

    // 헬퍼 함수들
    function setRadioStatesFromData(radioStates) {
        Object.entries(radioStates).forEach(([name, value]) => {
            const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (radio) {
                radio.checked = true;
                // 라디오 상태에 따라 업로드 영역 토글
                const zoneId = name.replace('_hasChanges', '').replace('step2_sponsored', 'step2_sponsored').replace('step2_iitnis', 'step2_iitnis');
                toggleUploadZones(name.replace('_hasChanges', '').replace('step2_sponsored', 'step2_sponsored').replace('step2_iitnis', 'step2_iitnis'));
            }
        });
    }

    function renderAllFileLists() {
        // Step 1-2 파일 목록 렌더링
        Object.keys(uploadedFiles).forEach(zone => {
            renderZoneFiles(zone);
        });
        // Step 3 파일 목록 렌더링
        renderStep3FileList();
    }

    function updateAllUploadButtons() {
        Object.keys(uploadedFiles).forEach(zone => {
            updateUploadButton(zone);
        });
    }

    function markProcessingComplete() {
        const icons = document.querySelectorAll('.processing-step-icon');
        icons.forEach(icon => {
            icon.classList.add('completed');
            icon.textContent = '✓';
        });
        const status = document.getElementById('processingStatus');
        if (status) status.classList.add('visible');
    }

    function clearAllFiles() {
        Object.keys(uploadedFiles).forEach(zone => {
            uploadedFiles[zone] = [];
        });
        step3Files.length = 0;
    }

    function initDarkMode() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }

    function toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // ========================================
    // Step 네비게이션
    // ========================================
    function updateStepUI() {
        // Step indicator
        const stepIndicator = document.getElementById('stepIndicator');
        if (stepIndicator) stepIndicator.textContent = `Step ${currentStep} of ${totalSteps}`;

        // Progress bar
        const progress = (currentStep / totalSteps) * 100;
        const progressFill = document.getElementById('progressFill');
        if (progressFill) progressFill.style.width = `${progress}%`;

        // Step content
        document.querySelectorAll('.step-content').forEach((el, index) => {
            el.classList.toggle('active', index + 1 === currentStep);
        });

        // Navigation buttons
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';

        if (nextBtn) {
            if (currentStep === totalSteps) {
                nextBtn.textContent = '🚀 LLM 분류 시작';
                nextBtn.classList.remove('btn-wizard-next');
                nextBtn.classList.add('btn-wizard-process');
            } else {
                nextBtn.textContent = '다음 →';
                nextBtn.classList.remove('btn-wizard-process');
                nextBtn.classList.add('btn-wizard-next');
            }
        }

        // Step 3에서 파일 요약 및 리스트 업데이트
        if (currentStep === 3) {
            updateFileSummary();
            renderStep3FileList();
        }
    }

    function nextStep() {
        if (currentStep < totalSteps) {
            currentStep++;
            updateStepUI();
        } else {
            // Step 3에서 LLM 분류 시작
            startLLMClassification();
        }
    }

    function prevStep() {
        if (currentStep > 1) {
            currentStep--;
            updateStepUI();
        }
    }

    // ========================================
    // 업로드 영역 토글
    // ========================================
    function toggleUploadZones(zoneId) {
        const zoneMap = {
            'step1': { radio: 'step1_hasChanges', zones: 'step1_zones' },
            'step2_sponsored': { radio: 'step2_sponsored', zones: 'step2_sponsored_zones' },
            'step2_iitnis': { radio: 'step2_iitnis', zones: 'step2_iitnis_zones' }
        };

        const config = zoneMap[zoneId];
        if (!config) return;

        const radio = document.querySelector(`input[name="${config.radio}"]:checked`);
        const zones = document.getElementById(config.zones);

        if (radio && zones) {
            zones.classList.toggle('visible', radio.value === 'yes');
        }
    }

    // ========================================
    // 파일 처리
    // ========================================
    function triggerFileInput(zoneId) {
        const input = document.getElementById(`${zoneId}_input`);
        if (input) input.click();
    }

    async function handleFileSelect(zoneId, files) {
        if (!files || files.length === 0) return;

        // 파일 추가 (ArrayBuffer 읽기 시도, 실패해도 파일 저장)
        for (const file of files) {
            let arrayBuffer = null;
            try {
                arrayBuffer = await file.arrayBuffer();
                console.log(`[P14] 파일 로드: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
            } catch (err) {
                console.warn(`[P14] ArrayBuffer 읽기 실패 (나중에 재시도): ${file.name}`, err);
            }

            uploadedFiles[zoneId].push({
                file: file,
                arrayBuffer: arrayBuffer,
                name: file.name,
                size: file.size,
                type: file.type,
                rawIdCandidates: getRawIdMapping()[zoneId] || []
            });
        }

        // UI 업데이트
        renderZoneFiles(zoneId);
        updateUploadButton(zoneId);

        showToast(`${files.length}개 파일 추가됨`, 'success');
    }

    function renderZoneFiles(zoneId) {
        const container = document.getElementById(`${zoneId}_files`);
        if (!container) return;

        const files = uploadedFiles[zoneId];

        container.innerHTML = files.map((f, index) => `
            <div class="zone-file-item ${f.isRestored ? 'restored' : ''}">
                <span class="zone-file-name">${f.name}</span>
                ${f.isRestored ? '<span class="restored-badge">복원됨</span>' : ''}
                <button class="zone-file-remove" onclick="UnifiedProcessingPage.removeFile('${zoneId}', ${index})">✕</button>
            </div>
        `).join('');
    }

    function removeFile(zoneId, index) {
        uploadedFiles[zoneId].splice(index, 1);
        renderZoneFiles(zoneId);
        updateUploadButton(zoneId);
    }

    function updateUploadButton(zoneId) {
        const input = document.getElementById(`${zoneId}_input`);
        if (!input) return;

        const btn = input.previousElementSibling;
        if (!btn) return;

        const hasFiles = uploadedFiles[zoneId].length > 0;
        btn.classList.toggle('has-files', hasFiles);
        btn.innerHTML = hasFiles
            ? `<span>✓</span> ${uploadedFiles[zoneId].length}개 파일`
            : `<span>📤</span> 파일 추가`;
    }

    // ========================================
    // Step 3 파일 처리 (드랍다운 방식)
    // ========================================
    function triggerStep3FileInput() {
        const input = document.getElementById('step3_file_input');
        if (input) input.click();
    }

    async function handleStep3FileSelect(files) {
        if (!files || files.length === 0) return;

        for (const file of files) {
            let arrayBuffer = null;
            try {
                arrayBuffer = await file.arrayBuffer();
                console.log(`[P14] 파일 로드: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
            } catch (err) {
                console.warn(`[P14] ArrayBuffer 읽기 실패 (나중에 재시도): ${file.name}`, err);
            }

            step3Files.push({
                file: file,
                arrayBuffer: arrayBuffer,
                name: file.name,
                size: file.size,
                type: file.type,
                rawId: getStep3RawIdOptions()[0]?.value || 'RAW3'  // 기본값: RAW3
            });
        }

        renderStep3FileList();
        showToast(`${files.length}개 파일 추가됨`, 'success');

        // input 초기화 (같은 파일 다시 선택 가능하도록)
        const input = document.getElementById('step3_file_input');
        if (input) input.value = '';
    }

    function renderStep3FileList() {
        const container = document.getElementById('step3FileList');
        if (!container) return;

        if (step3Files.length === 0) {
            container.innerHTML = `
                <div class="step3-empty-state">
                    업로드된 파일이 없습니다
                </div>
            `;
            return;
        }

        container.innerHTML = step3Files.map((f, index) => `
            <div class="step3-file-item ${f.isRestored ? 'restored' : ''}">
                <span class="step3-file-icon">${getFileIcon(f.name)}</span>
                <div class="step3-file-info">
                    <div class="step3-file-name">${f.name}</div>
                    <div class="step3-file-size">${formatFileSize(f.size)}${f.isRestored ? ' <span class="restored-badge">복원됨</span>' : ''}</div>
                </div>
                <select class="step3-rawid-select" onchange="UnifiedProcessingPage.updateStep3RawId(${index}, this.value)" ${f.isRestored ? 'disabled' : ''}>
                    ${getStep3RawIdOptions().map(opt => `
                        <option value="${opt.value}" ${f.rawId === opt.value ? 'selected' : ''}>
                            ${opt.label}
                        </option>
                    `).join('')}
                </select>
                <button class="step3-file-remove" onclick="UnifiedProcessingPage.removeStep3File(${index})" title="삭제">✕</button>
            </div>
        `).join('');
    }

    function updateStep3RawId(index, rawId) {
        if (step3Files[index]) {
            step3Files[index].rawId = rawId;
        }
    }

    function removeStep3File(index) {
        step3Files.splice(index, 1);
        renderStep3FileList();
    }

    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'pdf': '📕',
            'docx': '📘',
            'doc': '📘',
            'xlsx': '📗',
            'xls': '📗',
            'txt': '📄',
            'md': '📝'
        };
        return icons[ext] || '📄';
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ========================================
    // 파일 요약 (Step 1~2 파일만 표시)
    // ========================================
    function updateFileSummary() {
        const summaryContainer = document.getElementById('fileSummary');
        const summaryList = document.getElementById('fileSummaryList');

        if (!summaryContainer || !summaryList) return;

        // 전체 파일 수집
        let allFiles = [];
        for (const [zoneId, files] of Object.entries(uploadedFiles)) {
            files.forEach(f => {
                const candidates = getRawIdMapping()[zoneId] || [];
                const detectedRawId = detectRawIdFromFilename(f.name, candidates);
                allFiles.push({
                    name: f.name,
                    zone: zoneId,
                    rawIds: candidates,
                    detectedRawId: detectedRawId
                });
            });
        }

        if (allFiles.length === 0) {
            summaryContainer.style.display = 'none';
            return;
        }

        summaryContainer.style.display = 'block';
        summaryList.innerHTML = allFiles.map(f => `
            <div class="file-summary-item">
                <span class="file-summary-badge">${f.detectedRawId || f.rawIds[0] || '?'}</span>
                <span>${f.name}</span>
            </div>
        `).join('');
    }

    // ========================================
    // LLM 분류 시작
    // ========================================
    async function startLLMClassification() {
        // Step 1 & 2 파일 수집 (arrayBuffer 포함)
        let allFiles = [];
        for (const [zoneId, files] of Object.entries(uploadedFiles)) {
            files.forEach(f => {
                const candidates = getRawIdMapping()[zoneId] || [];
                // 파일명 기반 RAW ID 감지 (개선된 로직)
                const detectedRawId = detectRawIdFromFilename(f.name, candidates);
                allFiles.push({
                    file: f.file,
                    arrayBuffer: f.arrayBuffer,  // ArrayBuffer 전달
                    name: f.name,
                    size: f.size,
                    type: f.type,
                    zoneId: zoneId,
                    rawIdCandidates: candidates,
                    assignedRawId: detectedRawId
                });
            });
        }

        // Step 3 파일 추가 (드랍다운에서 선택된 RAW ID 사용)
        step3Files.forEach(f => {
            allFiles.push({
                file: f.file,
                arrayBuffer: f.arrayBuffer,  // ArrayBuffer 전달
                name: f.name,
                size: f.size,
                type: f.type,
                zoneId: 'step3',
                rawIdCandidates: [f.rawId],
                assignedRawId: f.rawId
            });
        });

        if (allFiles.length === 0) {
            showToast('업로드된 파일이 없습니다', 'error');
            return;
        }

        // UI 업데이트
        const nextBtn = document.getElementById('nextBtn');
        const processingStatus = document.getElementById('processingStatus');

        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = '처리 중...';
        }
        if (processingStatus) processingStatus.classList.add('visible');

        try {
            // Step 1: 마크다운 변환
            updateProcessingStep(1, 'active', '변환 중...');
            const convertedFiles = await convertAllToMarkdown(allFiles);
            updateProcessingStep(1, 'completed', '완료');

            // Step 1 결과 확인 팝업
            const conversionOk = await showConversionResultPopup(convertedFiles);
            if (!conversionOk) {
                showToast('변환 결과 확인 후 다시 시도하세요.', 'warning');
                if (nextBtn) {
                    nextBtn.disabled = false;
                    nextBtn.textContent = '🚀 LLM 분류 시작';
                }
                if (processingStatus) processingStatus.classList.remove('visible');
                return;
            }

            // Step 2: RAW ID 분류 (LLM) - 현재는 사용자 지정 RAW ID 사용
            updateProcessingStep(2, 'active', '분류 중...');
            // LLM 분류 로직은 추후 추가
            await new Promise(resolve => setTimeout(resolve, 500));
            updateProcessingStep(2, 'completed', '완료');

            // Step 3: 데이터 통합
            updateProcessingStep(3, 'active', '통합 중...');
            await saveProcessingResults(convertedFiles);
            updateProcessingStep(3, 'completed', '완료');

            // Step 4: PSUR 섹션 생성 (LLM)
            // 누락 파일 체크는 generatePSURSections 내부에서 수행됨
            updateProcessingStep(4, 'active', '섹션 생성 중...');
            const convertedMarkdowns = JSON.parse(localStorage.getItem('convertedMarkdowns') || '{}');
            const generatedSections = await generatePSURSections(convertedMarkdowns);

            // localStorage에 저장
            localStorage.setItem('generatedSections', JSON.stringify(generatedSections));
            localStorage.setItem('generatedPSURReport', JSON.stringify({
                content: JSON.stringify({ sections: generatedSections }),
                generatedAt: new Date().toISOString(),
                model: 'gemini-3-flash-preview',
                sourceFiles: Object.keys(convertedMarkdowns).length
            }));
            updateProcessingStep(4, 'completed', '완료');

            showToast('처리 완료! 다음 단계로 이동합니다.', 'success');

            // 다음 페이지로 이동
            setTimeout(() => {
                const reportId = getUrlParam('reportId') || 'local_' + Date.now();
                if (typeof navigateTo === 'function') {
                    navigateTo(`P15_SectionEditor.html?reportId=${reportId}`);
                } else {
                    window.location.href = `P15_SectionEditor.html?reportId=${reportId}`;
                }
            }, 1000);

        } catch (error) {
            console.error('[P14] 처리 실패:', error);
            showToast(`처리 실패: ${error.message}`, 'error');
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.textContent = '🚀 LLM 분류 시작';
            }
        }
    }

    function updateProcessingStep(stepNum, status, text) {
        const icon = document.getElementById(`procIcon${stepNum}`);
        const statusEl = document.getElementById(`procStatus${stepNum}`);

        if (icon) {
            icon.className = 'processing-step-icon';
            if (status === 'active') icon.classList.add('active');
            if (status === 'completed') {
                icon.classList.add('completed');
                icon.textContent = '✓';
            }
        }

        if (statusEl) statusEl.textContent = text;
    }

    // ========================================
    // 마크다운 변환
    // ========================================
    async function convertAllToMarkdown(files) {
        const results = [];

        for (const fileInfo of files) {
            try {
                const markdown = await convertFileToMarkdown(fileInfo);
                results.push({
                    ...fileInfo,
                    markdown: markdown
                });
            } catch (error) {
                console.warn(`[P14] 파일 변환 실패: ${fileInfo.name}`, error);
                results.push({
                    ...fileInfo,
                    markdown: `# ${fileInfo.name}\n\n변환 실패: ${error.message}`
                });
            }
        }

        return results;
    }

    async function convertFileToMarkdown(fileInfo) {
        const ext = fileInfo.name.split('.').pop().toLowerCase();
        const file = fileInfo.file;
        const arrayBuffer = fileInfo.arrayBuffer;

        if (ext === 'md' || ext === 'txt') {
            // ArrayBuffer가 있으면 사용, 없으면 File 객체 사용
            if (arrayBuffer) {
                const decoder = new TextDecoder('utf-8');
                return decoder.decode(arrayBuffer);
            }
            return await file.text();
        }

        if (ext === 'xlsx' || ext === 'xls') {
            return await convertExcelToMarkdown(fileInfo);
        }

        if (ext === 'docx') {
            return await convertDocxToMarkdown(fileInfo);
        }

        if (ext === 'pdf') {
            return await convertPdfToMarkdown(fileInfo);
        }

        return `# ${fileInfo.name}\n\n지원하지 않는 파일 형식입니다.`;
    }

    async function convertExcelToMarkdown(fileInfo) {
        const arrayBuffer = fileInfo.arrayBuffer || await fileInfo.file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let markdown = `# ${fileInfo.name}\n\n`;

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (data.length === 0) return;

            markdown += `## ${sheetName}\n\n`;

            // 헤더
            if (data[0]) {
                markdown += '| ' + data[0].map(c => c || '').join(' | ') + ' |\n';
                markdown += '| ' + data[0].map(() => '---').join(' | ') + ' |\n';
            }

            // 데이터
            for (let i = 1; i < data.length; i++) {
                if (data[i] && data[i].length > 0) {
                    markdown += '| ' + data[i].map(c => c || '').join(' | ') + ' |\n';
                }
            }
            markdown += '\n';
        });

        return markdown;
    }

    async function convertDocxToMarkdown(fileInfo) {
        const arrayBuffer = fileInfo.arrayBuffer || await fileInfo.file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        // HTML을 간단한 마크다운으로 변환
        let markdown = result.value
            .replace(/<h1[^>]*>/gi, '# ')
            .replace(/<h2[^>]*>/gi, '## ')
            .replace(/<h3[^>]*>/gi, '### ')
            .replace(/<\/h[1-6]>/gi, '\n\n')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '');

        return `# ${fileInfo.name}\n\n${markdown}`;
    }

    async function convertPdfToMarkdown(fileInfo) {
        const fileName = fileInfo.name;
        try {
            // ArrayBuffer 획득 (저장된 것 우선, 없으면 File 객체에서)
            const arrayBuffer = fileInfo.arrayBuffer || await fileInfo.file.arrayBuffer();

            // Worker 설정
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            // CMap 설정 (한글 지원 필수)
            const pdf = await pdfjsLib.getDocument({
                data: arrayBuffer,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true
            }).promise;

            let text = '';
            const numPages = pdf.numPages;

            // Step 1: PDF.js 텍스트 추출 시도
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items.map(item => item.str).join(' ');
                text += `## 페이지 ${i}\n\n${pageText}\n\n`;
            }

            // Step 2: 품질 검증 - 실제 텍스트 내용 확인
            const cleanText = text.replace(/##\s*페이지\s*\d+/g, '').replace(/\s+/g, ' ').trim();
            const textLength = cleanText.length;
            const avgCharsPerPage = textLength / numPages;

            console.log(`[P14] PDF 분석: ${fileName}`);
            console.log(`   - 총 페이지: ${numPages}, 추출 텍스트: ${textLength}자`);
            console.log(`   - 페이지당 평균: ${Math.round(avgCharsPerPage)}자`);

            // Step 3: OCR 필요 여부 판단
            // - 페이지당 평균 50자 미만이면 이미지 기반 PDF로 판단
            const needsOCR = avgCharsPerPage < 50;

            if (needsOCR && typeof Tesseract !== 'undefined') {
                console.log(`[P14] 이미지 기반 PDF 감지 - OCR 시작: ${fileName}`);
                showToast(`OCR 변환 중: ${fileName}...`, 'info');

                try {
                    const worker = await Tesseract.createWorker('kor+eng', 1, {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                console.log(`[P14] OCR 진행: ${Math.round(m.progress * 100)}%`);
                            }
                        }
                    });

                    let ocrText = '';
                    for (let i = 1; i <= numPages; i++) {
                        console.log(`[P14] OCR 페이지 ${i}/${numPages}...`);
                        showToast(`OCR 변환 중: ${fileName} (${i}/${numPages} 페이지)...`, 'info');
                        const page = await pdf.getPage(i);

                        // 고해상도 렌더링 (2배)
                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;

                        await page.render({
                            canvasContext: context,
                            viewport: viewport
                        }).promise;

                        // OCR 실행
                        const result = await worker.recognize(canvas);
                        ocrText += `## 페이지 ${i}\n\n${result.data.text.trim() || '[인식된 텍스트 없음]'}\n\n`;

                        // 메모리 해제
                        canvas.width = 0;
                        canvas.height = 0;
                    }

                    await worker.terminate();

                    const ocrCleanText = ocrText.replace(/##\s*페이지\s*\d+/g, '').replace(/\s+/g, ' ').trim();
                    console.log(`[P14] OCR 완료: ${fileName}, ${ocrCleanText.length}자`);

                    // OCR 결과가 더 좋으면 사용
                    if (ocrCleanText.length > textLength) {
                        return `# ${fileName}\n\n[OCR 변환]\n\n${ocrText}`;
                    }
                } catch (ocrError) {
                    console.error(`[P14] OCR 실패: ${ocrError.message}`);
                }
            } else if (needsOCR) {
                console.warn(`[P14] Tesseract.js 미로드 - OCR 불가: ${fileName}`);
            } else {
                console.log(`[P14] 텍스트 기반 PDF - OCR 불필요: ${fileName}`);
            }

            console.log(`[P14] PDF 변환 완료: ${fileName}`);
            return `# ${fileName}\n\n${text}`;
        } catch (error) {
            console.error(`[P14] PDF 변환 실패: ${fileName}`, error);
            return `# ${fileName}\n\n[PDF 변환 실패: ${error.message}]`;
        }
    }

    // ========================================
    // 결과 저장
    // ========================================
    async function saveProcessingResults(convertedFiles) {
        // localStorage에 저장
        const uploadedFilesData = convertedFiles.map(f => ({
            fileName: f.name,
            fileSize: f.size,
            rawId: f.assignedRawId,
            zoneId: f.zoneId
        }));

        const convertedMarkdowns = {};
        convertedFiles.forEach(f => {
            convertedMarkdowns[f.name] = f.markdown;
        });

        localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFilesData));
        localStorage.setItem('convertedMarkdowns', JSON.stringify(convertedMarkdowns));

        // Stage 2 상태 데이터 구성 (DB 저장용)
        const stage2Data = {
            uploadedFiles: {},
            step3Files: step3Files.map(f => ({
                name: f.name,
                size: f.size,
                rawId: f.rawId
            })),
            radioStates: collectRadioStates(),
            processingComplete: true,
            savedAt: new Date().toISOString()
        };

        // uploadedFiles를 zone별로 저장 (파일 객체 제외)
        Object.keys(uploadedFiles).forEach(zone => {
            stage2Data.uploadedFiles[zone] = uploadedFiles[zone].map(f => ({
                name: f.name,
                size: f.size,
                rawIdCandidates: f.rawIdCandidates || []
            }));
        });

        // current_report 업데이트
        const currentReport = JSON.parse(localStorage.getItem('current_report') || '{}');
        currentReport.user_inputs = currentReport.user_inputs || {};
        currentReport.user_inputs.uploadedFiles = uploadedFilesData;
        currentReport.user_inputs.convertedMarkdowns = convertedMarkdowns;
        currentReport.user_inputs.stage2 = stage2Data;  // Stage 2 전체 상태 저장
        localStorage.setItem('current_report', JSON.stringify(currentReport));

        // DB에 저장 (reports.user_inputs 업데이트)
        const reportId = getUrlParam('reportId');
        if (reportId && window.supabaseClient && typeof window.supabaseClient.updateReport === 'function') {
            try {
                await window.supabaseClient.updateReport(reportId, {
                    user_inputs: currentReport.user_inputs,
                    current_stage: 2
                });
                console.log('[P14] DB에 Stage 2 상태 저장 완료');
            } catch (dbError) {
                console.warn('[P14] DB 저장 실패 (localStorage는 성공):', dbError);
            }
        }

        console.log('[P14] 처리 결과 저장 완료:', convertedFiles.length, '개 파일');
    }

    // 라디오 버튼 상태 수집
    function collectRadioStates() {
        const radioNames = ['step1_hasChanges', 'step2_sponsored', 'step2_iitnis'];
        const states = {};
        radioNames.forEach(name => {
            const checked = document.querySelector(`input[name="${name}"]:checked`);
            if (checked) {
                states[name] = checked.value;
            }
        });
        return states;
    }

    // ========================================
    // 마크다운 변환 결과 확인 팝업
    // ========================================
    function showConversionResultPopup(convertedFiles) {
        return new Promise((resolve) => {
            const successFiles = convertedFiles.filter(f => !f.markdown.includes('변환 실패'));
            const failedFiles = convertedFiles.filter(f => f.markdown.includes('변환 실패'));

            let html = `
                <div class="modal-overlay" id="conversionResultPopup" style="display: flex; justify-content: center; align-items: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
                    <div class="modal-content" style="background: white; padding: 30px; border-radius: 8px; max-width: 800px; max-height: 80vh; overflow-y: auto;">
                        <h2 style="color: #1976d2; margin-bottom: 20px;">마크다운 변환 결과</h2>

                        <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                            <div style="flex: 1; background: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 2rem; color: #2e7d32;">${successFiles.length}</div>
                                <div style="color: #2e7d32;">성공</div>
                            </div>
                            <div style="flex: 1; background: ${failedFiles.length > 0 ? '#ffebee' : '#f5f5f5'}; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 2rem; color: ${failedFiles.length > 0 ? '#c62828' : '#9e9e9e'};">${failedFiles.length}</div>
                                <div style="color: ${failedFiles.length > 0 ? '#c62828' : '#9e9e9e'};">실패</div>
                            </div>
                        </div>
            `;

            if (failedFiles.length > 0) {
                html += `
                    <div style="background: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin-bottom: 15px; border-radius: 4px;">
                        <strong style="color: #d32f2f;">변환 실패 파일:</strong>
                        <ul style="margin-top: 10px; padding-left: 20px;">
                `;
                failedFiles.forEach(f => {
                    const errorMsg = f.markdown.match(/변환 실패: (.+)/)?.[1] || '알 수 없는 오류';
                    html += `
                        <li style="margin: 8px 0; color: #c62828;">
                            <strong>${f.name}</strong>
                            <br><small style="color: #666;">${errorMsg}</small>
                        </li>
                    `;
                });
                html += `</ul></div>`;
            }

            html += `
                <div style="background: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; margin-bottom: 15px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                    <strong style="color: #2e7d32;">변환 성공 파일:</strong>
                    <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
                        <thead>
                            <tr style="background: rgba(46, 125, 50, 0.1);">
                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #c8e6c9;">파일명</th>
                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #c8e6c9;">RAW ID</th>
                                <th style="padding: 8px; text-align: right; border-bottom: 1px solid #c8e6c9;">크기</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            successFiles.forEach(f => {
                const rawId = f.rawIdCandidates?.[0] || f.rawId || 'N/A';
                const size = f.markdown.length > 1000
                    ? `${(f.markdown.length / 1000).toFixed(1)}KB`
                    : `${f.markdown.length}B`;
                html += `
                    <tr>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e0e0e0;">${f.name}</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e0e0e0;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${rawId}</code></td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${size}</td>
                    </tr>
                `;
            });
            html += `
                        </tbody>
                    </table>
                </div>
            `;

            const canProceed = successFiles.length > 0;
            html += `
                <p style="margin-bottom: 20px; color: #666;">
                    ${failedFiles.length > 0
                        ? '일부 파일 변환에 실패했습니다. 실패한 파일을 다시 업로드하거나, 성공한 파일로만 계속 진행할 수 있습니다.'
                        : '모든 파일이 정상적으로 변환되었습니다.'}
                </p>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancelConversionBtn" style="padding: 10px 20px; background: #757575; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        취소 (파일 재업로드)
                    </button>
                    <button id="continueConversionBtn" style="padding: 10px 20px; background: ${canProceed ? '#2196f3' : '#ccc'}; color: white; border: none; border-radius: 4px; cursor: ${canProceed ? 'pointer' : 'not-allowed'};" ${canProceed ? '' : 'disabled'}>
                        ${failedFiles.length > 0 ? '성공한 파일로 계속 진행' : '계속 진행'}
                    </button>
                </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);

            document.getElementById('cancelConversionBtn').onclick = () => {
                document.getElementById('conversionResultPopup').remove();
                resolve(false);
            };

            document.getElementById('continueConversionBtn').onclick = () => {
                document.getElementById('conversionResultPopup').remove();
                resolve(true);
            };
        });
    }

    // ========================================
    // 데이터 검증 (섹션별 필수 파일 체크)
    // ========================================
    function validateDataCompleteness(uploadedFilesData) {
        const uploadedRAWIds = new Set();

        // Extract all uploaded RAW IDs
        // 데이터 형식 감지: 배열 또는 객체
        if (Array.isArray(uploadedFilesData)) {
            // 배열 형식: [{fileName, rawId, zoneId}, ...]
            uploadedFilesData.forEach(f => {
                if (f.rawId) uploadedRAWIds.add(f.rawId);
            });
        } else {
            // 객체 형식 (레거시 호환): {startPeriod: [...], endPeriod: [...], ...}
            if (uploadedFilesData.startPeriod) {
                uploadedFilesData.startPeriod.forEach(f => {
                    if (f.rawIdCandidates) uploadedRAWIds.add(f.rawIdCandidates[0]);
                    if (f.rawId) uploadedRAWIds.add(f.rawId);
                });
            }
            if (uploadedFilesData.endPeriod) {
                uploadedFilesData.endPeriod.forEach(f => {
                    if (f.rawIdCandidates) uploadedRAWIds.add(f.rawIdCandidates[0]);
                    if (f.rawId) uploadedRAWIds.add(f.rawId);
                });
            }
            if (uploadedFilesData.changeHistory) {
                uploadedFilesData.changeHistory.forEach(f => {
                    if (f.rawIdCandidates) uploadedRAWIds.add(f.rawIdCandidates[0]);
                    if (f.rawId) uploadedRAWIds.add(f.rawId);
                });
            }
            if (uploadedFilesData.step3Files) {
                uploadedFilesData.step3Files.forEach(f => {
                    if (f.rawId) uploadedRAWIds.add(f.rawId);
                });
            }
        }

        console.log('[P14] 업로드된 RAW IDs (검증용):', [...uploadedRAWIds].sort().join(', '));

        const warnings = [];
        const criticalMissing = [];

        // CONFIG.SECTION_DATA_DEPENDENCIES에서 가져오기
        const dependencies = window.CONFIG?.SECTION_DATA_DEPENDENCIES || {};

        // Check each section's dependencies
        for (const [sectionId, deps] of Object.entries(dependencies)) {
            const missing = deps.required.filter(rawId => !uploadedRAWIds.has(rawId));
            const optionalMissing = deps.optional.filter(rawId => !uploadedRAWIds.has(rawId));

            if (missing.length > 0) {
                criticalMissing.push({
                    sectionId,
                    sectionName: deps.name,
                    missingFiles: missing,
                    description: deps.description
                });
            }

            if (optionalMissing.length > 0) {
                warnings.push({
                    sectionId,
                    sectionName: deps.name,
                    missingFiles: optionalMissing,
                    description: deps.description,
                    severity: 'optional'
                });
            }
        }

        return { criticalMissing, warnings, uploadedRAWIds };
    }

    function showDataValidationWarning(validation) {
        return new Promise((resolve) => {
            let html = `
                <div class="modal-overlay" id="validationWarning" style="display: flex; justify-content: center; align-items: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
                    <div class="modal-content" style="background: white; padding: 30px; border-radius: 8px; max-width: 700px; max-height: 80vh; overflow-y: auto;">
                        <h2 style="color: #ff9800; margin-bottom: 20px;">데이터 부족 경고</h2>
            `;

            if (validation.criticalMissing.length > 0) {
                html += `
                    <div style="background: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin-bottom: 15px; border-radius: 4px;">
                        <strong style="color: #d32f2f;">다음 섹션은 필수 데이터가 없어 생성되지 않을 수 있습니다:</strong>
                        <ul style="margin-top: 10px; padding-left: 20px;">
                `;
                validation.criticalMissing.forEach(item => {
                    html += `
                        <li style="margin: 10px 0;">
                            <strong>섹션 ${item.sectionId}: ${item.sectionName}</strong>
                            <br><span style="color: #666;">누락 파일: ${item.missingFiles.join(', ')}</span>
                            <br><small style="color: #888;">${item.description}</small>
                        </li>
                    `;
                });
                html += `</ul></div>`;
            }

            if (validation.warnings.length > 0) {
                html += `
                    <div style="background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin-bottom: 15px; border-radius: 4px;">
                        <strong style="color: #f57c00;">권장 파일이 누락되었습니다 (선택적):</strong>
                        <ul style="margin-top: 10px; padding-left: 20px;">
                `;
                validation.warnings.forEach(item => {
                    html += `
                        <li style="margin: 5px 0;">
                            섹션 ${item.sectionId}: ${item.sectionName}
                            <br><span style="color: #666;">누락 파일: ${item.missingFiles.join(', ')}</span>
                        </li>
                    `;
                });
                html += `</ul></div>`;
            }

            html += `
                        <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin-bottom: 20px; border-radius: 4px;">
                            <strong style="color: #1976d2;">업로드된 파일:</strong>
                            <span style="color: #666;">${Array.from(validation.uploadedRAWIds).join(', ')}</span>
                        </div>
                        <p style="margin-bottom: 10px;"><strong>계속 진행하시겠습니까?</strong></p>
                        <p style="color: #666; margin-bottom: 20px;">누락된 섹션은 기본 템플릿으로 생성되며, 나중에 수동으로 편집할 수 있습니다.</p>
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button id="cancelValidationBtn" style="padding: 10px 20px; background: #757575; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                취소 (파일 추가하기)
                            </button>
                            <button id="continueValidationBtn" style="padding: 10px 20px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                계속 진행
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);

            document.getElementById('cancelValidationBtn').onclick = () => {
                document.getElementById('validationWarning').remove();
                resolve(false);
            };

            document.getElementById('continueValidationBtn').onclick = () => {
                document.getElementById('validationWarning').remove();
                resolve(true);
            };
        });
    }

    // ========================================
    // RAW ID 복원 헬퍼 함수 (모듈 함수 래퍼)
    // ========================================

    /**
     * 파일명에서 RAW ID를 추출합니다.
     * RawIdDetector 모듈의 detectRawIdDetailed 함수를 사용합니다.
     * @param {string} fileName - 파일명
     * @returns {string} - 추출된 RAW ID 또는 'UNKNOWN'
     */
    function extractRawIdFromFileName(fileName) {
        if (!fileName) return 'UNKNOWN';

        const detector = getModule();
        if (detector.detectRawIdDetailed) {
            const detected = detector.detectRawIdDetailed(fileName);
            if (detected) return detected;
        }

        // Fallback: 기본 패턴 매칭
        if (detector.detectRawIdFromFileName) {
            const detected = detector.detectRawIdFromFileName(fileName);
            if (detected) return detected;
        }

        return 'UNKNOWN';
    }

    /**
     * convertedMarkdowns에 rawId를 복원합니다.
     * uploadedFiles와 조인하거나 파일명에서 추출합니다.
     *
     * @param {Object} convertedMarkdowns - {fileName: markdownContent} 형태
     * @returns {Array} - [{fileName, rawId, markdown}] 형태의 배열
     */
    function restoreRawIdToMarkdowns(convertedMarkdowns) {
        // uploadedFiles에서 rawId 매핑 가져오기
        const uploadedFilesData = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
        const rawIdMap = {};

        // uploadedFiles 배열에서 rawId 매핑 생성
        if (Array.isArray(uploadedFilesData)) {
            uploadedFilesData.forEach(file => {
                if (file.fileName && file.rawId) {
                    rawIdMap[file.fileName] = file.rawId;
                }
            });
        }

        console.log('[P14] RAW ID 매핑 복원:', Object.keys(rawIdMap).length, '개 파일');

        // convertedMarkdowns를 배열로 변환하면서 rawId 복원
        const result = Object.entries(convertedMarkdowns).map(([fileName, content]) => {
            // 1차: uploadedFiles에서 rawId 찾기
            let rawId = rawIdMap[fileName];

            // 2차: 파일명에서 rawId 추출 (fallback)
            if (!rawId) {
                rawId = extractRawIdFromFileName(fileName);
                console.log(`[P14] RAW ID 파일명에서 추출: ${fileName} → ${rawId}`);
            }

            return {
                fileName,
                rawId,
                markdown: content
            };
        });

        // RAW ID 순서로 정렬
        result.sort((a, b) => {
            const aNum = parseFloat(a.rawId.replace(/[^0-9.]/g, '')) || 999;
            const bNum = parseFloat(b.rawId.replace(/[^0-9.]/g, '')) || 999;
            return aNum - bNum;
        });

        console.log('[P14] RAW ID 복원 완료:', result.map(r => `${r.rawId}:${r.fileName.substring(0, 20)}`));

        return result;
    }

    // ========================================
    // PSUR 섹션 생성
    // ========================================
    async function generatePSURSections(convertedMarkdowns) {
        const sectionNames = {
            '00': '표지', '01': '목차', '02': '약어설명', '03': '서론',
            '04': '전세계판매허가현황', '05': '안전성조치', '06': '안전성정보참고정보변경',
            '07': '환자노출', '08': '개별증례병력', '09': '시험', '10': '기타정보',
            '11': '종합적인안전성평가', '12': '결론', '13': '참고문헌', '14': '별첨'
        };

        try {
            // 0. PRE-CHECK: Validate data completeness
            const uploadedFilesData = JSON.parse(localStorage.getItem('uploadedFiles') || '{}');
            const validation = validateDataCompleteness(uploadedFilesData);

            // Show warning modal if critical data missing
            if (validation.criticalMissing.length > 0 || validation.warnings.length > 0) {
                const shouldContinue = await showDataValidationWarning(validation);
                if (!shouldContinue) {
                    throw new Error('사용자가 처리를 취소했습니다. 필요한 파일을 업로드한 후 다시 시도하세요.');
                }
            }

            // Store validation result for later use
            sessionStorage.setItem('lastValidation', JSON.stringify(validation));

            // 1. 컨텍스트 로드
            const context = await loadPSURContext();

            // 2. RAW ID 복원 및 마크다운 통합
            const markdownsWithRawId = restoreRawIdToMarkdowns(convertedMarkdowns);

            // RAW ID를 포함한 마크다운 통합
            const allMarkdowns = markdownsWithRawId
                .map(({ fileName, rawId, markdown }) =>
                    `### [${rawId}] ${fileName}\n\n${markdown}`)
                .join('\n\n---\n\n');

            // 업로드된 RAW ID 목록 생성 (LLM에 전달)
            const uploadedRawIds = [...new Set(markdownsWithRawId.map(m => m.rawId))].sort();
            console.log('[P14] 업로드된 RAW IDs:', uploadedRawIds.join(', '));

            // 3. 데이터 가용성 상태 메시지 생성
            const dataStatus = validation.criticalMissing.length > 0
                ? validation.criticalMissing.map(item =>
                    `- 섹션 ${item.sectionId} (${item.sectionName}): 필수 파일 ${item.missingFiles.join(', ')} 누락`
                  ).join('\n')
                : '모든 필수 데이터 파일 업로드 완료';

            // 4. LLM 프롬프트 구성 (데이터 상태 포함)
            const prompt = `${context}

# 중요 지침

## 업로드된 RAW ID 목록
다음 RAW ID의 데이터가 제공되었습니다: **${uploadedRawIds.join(', ')}**

## 데이터 가용성 상태
${dataStatus}

## 섹션별 생성 규칙

### 데이터가 있는 섹션
- 제공된 RAW 데이터를 기반으로 상세하고 정확한 내용 작성
- 모든 테이블은 마크다운 형식으로 작성
- 소스를 명확히 인용 (예: "[RAW4 참조]")

### 데이터가 없는 섹션 (필수 파일이 업로드되지 않음)
다음 형식의 명확한 플레이스홀더를 작성하세요:

**데이터 상태**: 필요한 소스 파일이 업로드되지 않았습니다.

**필요 파일**:
- [누락된 RAW ID 나열]

**다음 단계**:
1. 위 파일들을 업로드하십시오
2. "재생성" 버튼을 클릭하여 이 섹션을 다시 생성하십시오

**참고**: 이 섹션은 다음 정보를 포함해야 합니다:
- [섹션에서 다루어야 할 주요 내용 나열]

## RAW 원시자료 (변환된 마크다운)
총 ${markdownsWithRawId.length}개 파일 (RAW IDs: ${uploadedRawIds.join(', ')})

${markdownsWithRawId.length > 0 ? allMarkdowns : '제공된 RAW 데이터가 없습니다. 모든 섹션을 플레이스홀더로 생성하세요.'}

## 출력 형식 (Structured Output)
위의 RAW 원시자료를 분석하여 다음 JSON 형식으로 PSUR 15개 섹션을 생성하세요.
각 섹션의 content는 마크다운 형식이어야 합니다.

\`\`\`json
{
  "sections": {
    "00": { "sectionName": "표지", "content": "## 00. 표지\\n\\n..." },
    "01": { "sectionName": "목차", "content": "## 01. 목차\\n\\n..." },
    "02": { "sectionName": "약어설명", "content": "## 02. 약어설명\\n\\n..." },
    "03": { "sectionName": "서론", "content": "## 03. 서론\\n\\n..." },
    "04": { "sectionName": "전세계판매허가현황", "content": "## 04. 전세계판매허가현황\\n\\n..." },
    "05": { "sectionName": "안전성조치", "content": "## 05. 안전성조치\\n\\n..." },
    "06": { "sectionName": "안전성정보참고정보변경", "content": "## 06. 안전성정보참고정보변경\\n\\n..." },
    "07": { "sectionName": "환자노출", "content": "## 07. 환자노출\\n\\n..." },
    "08": { "sectionName": "개별증례병력", "content": "## 08. 개별증례병력\\n\\n..." },
    "09": { "sectionName": "시험", "content": "## 09. 시험\\n\\n..." },
    "10": { "sectionName": "기타정보", "content": "## 10. 기타정보\\n\\n..." },
    "11": { "sectionName": "종합적인안전성평가", "content": "## 11. 종합적인안전성평가\\n\\n..." },
    "12": { "sectionName": "결론", "content": "## 12. 결론\\n\\n..." },
    "13": { "sectionName": "참고문헌", "content": "## 13. 참고문헌\\n\\n..." },
    "14": { "sectionName": "별첨", "content": "## 14. 별첨\\n\\n..." }
  }
}
\`\`\`

중요: 반드시 위 JSON 형식으로만 응답하세요. 추가 설명 없이 JSON만 출력하세요.`;

            console.log('[P14] LLM 프롬프트 생성 완료, 토큰 수:', prompt.length);

            // 4. LLM 호출 (세션 매니저를 통해 - DB에 저장됨)
            if (!window.llmSessionManager) {
                throw new Error('llmSessionManager가 초기화되지 않았습니다.');
            }

            // 세션 초기화 (reportId 기반)
            const reportId = new URLSearchParams(window.location.search).get('reportId') ||
                             localStorage.getItem('current_report_id') ||
                             'local_' + Date.now();

            await window.llmSessionManager.initSession(reportId, {
                model: 'gemini-3-flash-preview',
                provider: 'google'
            });

            // 세션 매니저를 통해 LLM 호출 → DB에 자동 저장됨
            const response = await window.llmSessionManager.sendMessage(prompt, {
                provider: 'google',
                model: 'gemini-3-flash-preview',
                dialogType: 'psur_generation',  // 대화 타입 구분
                skipHistory: true  // 대용량 프롬프트이므로 히스토리 누적 방지
            });

            // response는 객체, response.text가 실제 텍스트
            const responseText = response?.text || '';
            console.log('[P14] LLM 응답 수신:', responseText.length, '자');
            console.log('[P14] PSUR 생성 대화가 세션에 저장됨 (dialogType: psur_generation)');

            // 5. JSON 파싱 with enhanced logging
            return extractSectionsWithLogging(responseText, sectionNames, validation);

        } catch (error) {
            console.error('[P14] PSUR 섹션 생성 실패:', error);

            // 에러 시 빈 섹션 반환
            const sections = {};
            for (const [id, name] of Object.entries(sectionNames)) {
                sections[id] = {
                    id,
                    name,
                    content: `## ${id}. ${name}\n\n[섹션 생성 실패: ${error.message}]`,
                    generatedAt: null,
                    isEdited: false
                };
            }
            return sections;
        }
    }

    function extractSectionsWithLogging(responseText, sectionNames, validation) {
        const sections = {};

        console.group('[P14] PSUR Section Generation Debug');
        console.log('1. LLM Response Length:', responseText.length, 'chars');
        console.log('2. First 500 chars:', responseText.substring(0, 500));
        console.log('3. Last 500 chars:', responseText.substring(responseText.length - 500));

        try {
            // JSON 코드블록 제거
            let cleanText = responseText.trim();
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            }
            if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            const jsonData = JSON.parse(cleanText);

            if (jsonData.sections) {
                console.log('JSON format detected and parsed');
                for (const [key, value] of Object.entries(jsonData.sections)) {
                    const sectionId = key.substring(0, 2);
                    sections[sectionId] = {
                        id: sectionId,
                        name: value.sectionName || sectionNames[sectionId],
                        content: value.content || `## ${sectionId}. ${sectionNames[sectionId]}\n\n[내용 없음]`,
                        generatedAt: new Date().toISOString(),
                        isEdited: false
                    };
                }
                console.log('JSON parsing successful:', Object.keys(sections).length, 'sections');
            }

        } catch (e) {
            console.log('JSON parsing failed, trying regex...');
            console.error('Parse error:', e.message);
        }

        console.log('4. Parsed Sections:', Object.keys(sections).length);
        console.log('5. Section IDs Found:', Object.keys(sections).sort().join(', '));

        // 누락 섹션 확인 및 플레이스홀더 생성
        const missingSections = [];
        for (const [id, name] of Object.entries(sectionNames)) {
            if (!sections[id]) {
                missingSections.push(id);
            }
        }

        if (missingSections.length > 0) {
            console.warn('Missing Sections:', missingSections.join(', '));
            console.log('Generating placeholder sections...');

            // Generate placeholder sections
            missingSections.forEach(id => {
                sections[id] = generatePlaceholderSection(id, validation);
            });
        }

        console.groupEnd();

        return sections;
    }

    function generatePlaceholderSection(sectionId, validation) {
        const sectionNames = {
            "00": "표지", "01": "목차", "02": "약어설명", "03": "서론",
            "04": "전세계판매허가현황", "05": "안전성조치", "06": "안전성정보참고정보변경",
            "07": "환자노출", "08": "개별증례병력", "09": "시험", "10": "기타정보",
            "11": "종합적인안전성평가", "12": "결론", "13": "참고문헌", "14": "별첨"
        };

        const missingInfo = validation.criticalMissing.find(m => m.sectionId === sectionId);
        const warningInfo = validation.warnings.find(w => w.sectionId === sectionId);

        let content = `## ${sectionId}. ${sectionNames[sectionId]}\n\n`;

        if (missingInfo) {
            content += `**데이터 상태**: 필요한 소스 파일이 업로드되지 않았습니다.\n\n`;
            content += `**필요 파일**:\n`;
            missingInfo.missingFiles.forEach(f => {
                content += `- ${f}\n`;
            });
            content += `\n**설명**: ${missingInfo.description}\n\n`;
            content += `**다음 단계**:\n`;
            content += `1. 위 파일들을 업로드하십시오\n`;
            content += `2. "재생성" 버튼을 클릭하여 이 섹션을 다시 생성하십시오\n`;
        } else if (warningInfo) {
            content += `**데이터 부족**: 권장 파일이 누락되었습니다.\n\n`;
            content += `**권장 파일**: ${warningInfo.missingFiles.join(', ')}\n\n`;
            content += `기본 템플릿으로 작성되었습니다. 상세 데이터를 추가하려면 권장 파일을 업로드하고 재생성하십시오.\n`;
        } else {
            content += `[이 섹션은 생성되지 않았습니다]\n\n`;
            content += `예상치 못한 오류가 발생했습니다. 로그를 확인하십시오.\n`;
        }

        return {
            id: sectionId,
            name: sectionNames[sectionId],
            content,
            generatedAt: new Date().toISOString(),
            isEdited: false
        };
    }

    async function loadPSURContext() {
        // 기본 컨텍스트 (나중에 01_Context/UserPrompt.md에서 로드 가능)
        return `# PSUR(정기적 안전성 갱신 보고서) 생성 AI 어시스턴트

당신은 의약품 안전성 보고서(PSUR/PBRER) 작성을 전문으로 하는 AI 어시스턴트입니다.
식품의약품안전처 가이드라인에 따라 정확하고 규정을 준수하는 보고서를 작성합니다.

## 섹션별 작성 가이드

### 00. 표지
- 제품명, 성분명, 회사명, 보고 기간 정보

### 01. 목차
- 전체 문서의 목차 구성

### 02. 약어설명
- 보고서에 사용된 약어 정리 (반드시 마크다운 테이블 형식으로 작성)
- 테이블 형식: | 약어 | 약어 설명 (영문) | 약어 설명 (국문) |

### 03. 서론
- 보고서 목적 및 제품 소개, 적응증 설명

### 04. 전세계판매허가현황
- 국가별 허가 현황, 허가일, 허가 상태

### 05. 안전성조치
- 안전성 관련 규제 조치 내역

### 06. 안전성정보참고정보변경
- 허가사항 변경 이력

### 07. 환자노출
- 판매량 데이터 기반 환자 노출 추정

### 08. 개별증례병력
- 이상사례 보고 분석 (신속보고, 정기보고)

### 09. 시험
- 임상시험 정보 및 결과

### 10. 기타정보
- 문헌 검토, 추가 안전성 정보

### 11. 종합적인안전성평가
- 전체 안전성 데이터 종합 평가

### 12. 결론
- 유익성-위해성 평가 결론

### 13. 참고문헌
- 인용 문헌 목록

### 14. 별첨
- 별첨 자료

## 중요 규칙
1. 원시자료에 있는 데이터만 사용하세요.
2. 데이터가 없으면 "[해당 데이터 없음]"으로 표시하세요.
3. 추정이나 가정을 하지 마세요.`;
    }

    // ========================================
    // 유틸리티
    // ========================================
    function getUrlParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ========================================
    // 페이지 로드 시 초기화
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }

    // ========================================
    // 전역 함수 노출
    // ========================================
    window.UnifiedProcessingPage = {
        initializePage,
        nextStep,
        prevStep,
        toggleUploadZones,
        triggerFileInput,
        handleFileSelect,
        removeFile,
        triggerStep3FileInput,
        handleStep3FileSelect,
        updateStep3RawId,
        removeStep3File,
        toggleDarkMode
    };

    // 기존 HTML 호환용 전역 함수
    window.nextStep = nextStep;
    window.prevStep = prevStep;
    window.toggleUploadZones = toggleUploadZones;
    window.triggerFileInput = triggerFileInput;
    window.handleFileSelect = handleFileSelect;
    window.removeFile = removeFile;
    window.triggerStep3FileInput = triggerStep3FileInput;
    window.handleStep3FileSelect = handleStep3FileSelect;
    window.updateStep3RawId = updateStep3RawId;
    window.removeStep3File = removeStep3File;
    window.toggleDarkMode = toggleDarkMode;

})();
