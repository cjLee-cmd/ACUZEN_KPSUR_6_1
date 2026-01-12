/**
 * New Report Page Script
 * pages/js/new-report.js
 *
 * P13_NewReport.html 인라인 스크립트 분리
 */

(function() {
    'use strict';

    // 약품 데이터베이스 (샘플)
    const drugDatabase = [
        {
            id: 1,
            ingredient: '토지나메란',
            brand: '코미나티주',
            company: '한국화이자제약',
            report_start_date: '2021-03-05',
            report_end_date: '2026-03-04',
            approval_date: '2021-03-05',
            efficacy: '16세 이상에서 코로나19 예방',
            dosage: '0.3mL를 3주 간격으로 2회 근육주사'
        },
        {
            id: 2,
            ingredient: '암로디핀',
            brand: '노바스크정',
            company: '한국화이자제약',
            report_start_date: '1997-05-20',
            report_end_date: '2002-05-19',
            approval_date: '1997-05-20',
            efficacy: '고혈압, 협심증 치료',
            dosage: '1일 1회 5mg 경구투여'
        },
        {
            id: 3,
            ingredient: '메트포르민',
            brand: '글루코파지정',
            company: '한국머크',
            report_start_date: '2001-08-15',
            report_end_date: '2006-08-14',
            approval_date: '2001-08-15',
            efficacy: '제2형 당뇨병 치료',
            dosage: '1일 2-3회 500-850mg 경구투여'
        },
        {
            id: 4,
            ingredient: '아토르바스타틴',
            brand: '리피토정',
            company: '한국화이자제약',
            report_start_date: '2000-01-15',
            report_end_date: '2005-01-14',
            approval_date: '2000-01-15',
            efficacy: '고콜레스테롤혈증, 이상지질혈증 치료',
            dosage: '1일 1회 10-80mg 경구투여'
        },
        {
            id: 5,
            ingredient: '에소메프라졸',
            brand: '넥시움정',
            company: '한국아스트라제네카',
            report_start_date: '2002-06-10',
            report_end_date: '2007-06-09',
            approval_date: '2002-06-10',
            efficacy: '위식도역류질환, 소화성궤양 치료',
            dosage: '1일 1회 20-40mg 경구투여'
        },
        {
            id: 6,
            ingredient: '로수바스타틴',
            brand: '크레스토정',
            company: '한국아스트라제네카',
            report_start_date: '2004-03-22',
            report_end_date: '2009-03-21',
            approval_date: '2004-03-22',
            efficacy: '고콜레스테롤혈증, 고지혈증 치료',
            dosage: '1일 1회 5-20mg 경구투여'
        },
        {
            id: 7,
            ingredient: '셀레콕시브',
            brand: '쎄레브렉스캡슐',
            company: '한국화이자제약',
            report_start_date: '2001-11-08',
            report_end_date: '2006-11-07',
            approval_date: '2001-11-08',
            efficacy: '골관절염, 류마티스관절염 치료',
            dosage: '1일 1-2회 100-200mg 경구투여'
        },
        {
            id: 8,
            ingredient: '둘라글루타이드',
            brand: '트루리시티주',
            company: '한국릴리',
            report_start_date: '2016-09-05',
            report_end_date: '2021-09-04',
            approval_date: '2016-09-05',
            efficacy: '제2형 당뇨병 치료',
            dosage: '주 1회 0.75-1.5mg 피하주사'
        },
        {
            id: 9,
            ingredient: '리바록사반',
            brand: '자렐토정',
            company: '바이엘코리아',
            report_start_date: '2012-07-18',
            report_end_date: '2017-07-17',
            approval_date: '2012-07-18',
            efficacy: '심부정맥혈전증 예방 및 치료',
            dosage: '1일 1회 10-20mg 경구투여'
        },
        {
            id: 10,
            ingredient: '엠파글리플로진',
            brand: '자디앙정',
            company: '한국베링거인겔하임',
            report_start_date: '2015-04-28',
            report_end_date: '2020-04-27',
            approval_date: '2015-04-28',
            efficacy: '제2형 당뇨병 치료',
            dosage: '1일 1회 10-25mg 경구투여'
        },
        {
            id: 11,
            ingredient: '메만틴염산염',
            brand: '글리빅사정',
            company: '대웅바이오(주)',
            report_start_date: '2020-01-16',
            report_end_date: '2025-01-15',
            approval_date: '2016-08-26',
            efficacy: '중등도에서 중증의 알츠하이머병 치료',
            dosage: '1일 20mg (10mg씩 1일 2회)'
        }
    ];

    let selectedDrug = null;

    /**
     * 페이지 초기화
     */
    function initializePage() {
        // 유틸리티 함수 로드 확인
        if (typeof navigateTo === 'undefined' || typeof loadSessionData === 'undefined') {
            setTimeout(initializePage, 50);
            return;
        }

        // 세션 정보로 UI 업데이트
        const session = loadSessionData();
        if (session) {
            const userName = document.querySelector('.user-name');
            const userRole = document.querySelector('.user-role');
            const userPosition = document.querySelector('.user-position');
            const userAvatar = document.querySelector('.user-avatar');

            if (userName) userName.textContent = session.userName;
            if (userRole) userRole.textContent = session.userRole;
            if (userPosition) userPosition.textContent = session.userPosition || '';
            if (userAvatar) userAvatar.textContent = session.userName.charAt(0);

            // 작성자 자동 입력
            const authorInput = document.getElementById('author_name');
            if (authorInput) authorInput.value = session.userName;

            // 작성자 직책 자동 입력
            const positionInput = document.getElementById('author_position');
            if (positionInput && session.userPosition) {
                positionInput.value = session.userPosition;
            }
        }

        // 버전넘버 초기값 '1.0' 자동 설정
        const versionInput = document.getElementById('first_approval_country');
        if (versionInput && !versionInput.value) {
            versionInput.value = '1.0';
        }

        // 사용자 메뉴 설정
        if (typeof setupUserMenu === 'function') {
            setupUserMenu();
        } else {
            // 간단한 사용자 메뉴 토글 구현
            const userMenuToggle = document.querySelector('.user-menu-toggle');
            if (userMenuToggle) {
                userMenuToggle.addEventListener('click', () => {
                    if (confirm('로그아웃 하시겠습니까?')) {
                        if (typeof clearSessionData === 'function') {
                            clearSessionData();
                        }
                        navigateTo('P01_Login.html');
                    }
                });
            }
        }

        setupDrugSearch();
        setupForm();
    }

    /**
     * 폼 설정
     */
    function setupForm() {
        const form = document.getElementById('newReportForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!selectedDrug) {
                if (typeof showToast === 'function') {
                    showToast('약품을 선택해주세요.', 'warning');
                }
                return;
            }

            // 폼 데이터 수집
            const formData = {
                drug: selectedDrug,
                first_approval_country: document.getElementById('first_approval_country')?.value,
                first_approval_date: document.getElementById('first_approval_date')?.value,
                author_name: document.getElementById('author_name')?.value,
                author_position: document.getElementById('author_position')?.value,
                report_period: document.getElementById('report_period')?.value,
                submitter: document.getElementById('submitter')?.value,
                description: document.getElementById('report_description')?.value
            };

            if (typeof showLLMLoading === 'function') {
                showLLMLoading('새 보고서를 생성하고 있습니다...');
            }

            // LLM 설정 가져오기
            const llmSettings = getLLMSettings();

            // 현재 사용자 정보 가져오기
            let userId = null;
            if (window.authManager) {
                const sessionResult = window.authManager.checkSession();
                if (sessionResult.authenticated && sessionResult.user) {
                    userId = sessionResult.user.id;
                }
            }

            // userId가 없으면 에러 표시 후 진행 중단
            if (!userId) {
                if (typeof hideLLMLoading === 'function') {
                    hideLLMLoading();
                }
                if (typeof showToast === 'function') {
                    showToast('로그인 세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
                }
                setTimeout(() => navigateTo('P01_Login.html'), 2000);
                return;
            }

            // 보고서명 생성
            const timestamp = Date.now().toString(36).toUpperCase();
            const reportName = `${selectedDrug.brand}_PSUR_${new Date().toISOString().slice(0, 7).replace('-', 'Q')}_${timestamp}`;

            // user_inputs에 저장할 데이터 구조
            const userInputs = {
                CS0_성분명: selectedDrug.ingredient,
                CS1_브랜드명: selectedDrug.brand,
                CS2_회사명: selectedDrug.company,
                CS5_국내허가일자: selectedDrug.approval_date,
                CS6_보고서제출일: formData.first_approval_date,
                CS7_최초허가국: formData.first_approval_country,
                CS13_제출자: formData.submitter,
                CS24_보고주기: formData.report_period,
                CS15_효능효과: selectedDrug.efficacy,
                CS16_용법용량: selectedDrug.dosage,
                authorName: formData.author_name,
                authorPosition: formData.author_position,
                description: formData.description,
                llmSettings: llmSettings
            };

            try {
                // supabase-client 초기화 확인
                if (!window.supabaseClient) {
                    throw new Error('Supabase client not loaded');
                }
                await window.supabaseClient.init();

                // DB에 보고서 저장
                const dbResult = await window.supabaseClient.createReport({
                    report_name: reportName,
                    created_by: userId,
                    status: 'Draft',
                    current_stage: 2,
                    product_id: null,
                    user_inputs: userInputs
                });

                if (!dbResult.success) {
                    throw new Error(dbResult.error || 'DB 저장 실패');
                }

                const reportId = dbResult.report.id;
                console.log('보고서 DB 저장 완료:', reportId);

                // 이전 보고서 데이터 및 세션 캐시 삭제
                clearPreviousReportData();

                // localStorage에도 캐시
                const localData = {
                    ...userInputs,
                    reportId: reportId,
                    reportName: reportName,
                    createdAt: dbResult.report.created_at
                };
                localStorage.setItem('current_report', JSON.stringify(localData));

                if (typeof hideLLMLoading === 'function') {
                    hideLLMLoading();
                }
                if (typeof showToast === 'function') {
                    showToast('보고서가 생성되었습니다.', 'success');
                }

                // 다음 단계로 이동
                setTimeout(() => {
                    navigateTo(`P14_UnifiedProcessing.html?reportId=${reportId}`);
                }, 1000);

            } catch (error) {
                console.warn('DB 저장 실패, localStorage 폴백 사용:', error.message);

                clearPreviousReportData();

                // DB 저장 실패 시 localStorage만 사용
                const fallbackId = `local_${Date.now()}`;
                const localData = {
                    ...userInputs,
                    reportId: fallbackId,
                    reportName: reportName,
                    createdAt: new Date().toISOString(),
                    status: 'Draft',
                    current_stage: 2,
                    isLocalOnly: true
                };
                localStorage.setItem('current_report', JSON.stringify(localData));

                // 로컬 보고서 목록에도 추가
                const localReports = JSON.parse(localStorage.getItem('local_reports') || '[]');
                localReports.push(localData);
                localStorage.setItem('local_reports', JSON.stringify(localReports));

                if (typeof hideLLMLoading === 'function') {
                    hideLLMLoading();
                }
                if (typeof showToast === 'function') {
                    showToast('보고서가 생성되었습니다. (로컬 저장)', 'success');
                }

                setTimeout(() => {
                    navigateTo(`P14_UnifiedProcessing.html?reportId=${fallbackId}`);
                }, 1000);
            }
        });
    }

    /**
     * 이전 보고서 데이터 및 세션 캐시 삭제
     */
    function clearPreviousReportData() {
        console.log('[P13] Clearing previous report data and session cache');

        // LLM 세션 캐시 삭제
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('llm_session_cache_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        // 작업 데이터 삭제
        localStorage.removeItem('uploadedFiles');
        localStorage.removeItem('convertedMarkdowns');
        localStorage.removeItem('extractedData');
        localStorage.removeItem('generatedSections');
        localStorage.removeItem('current_report');
    }

    /**
     * 약품 선택 모달 열기
     */
    function openDrugSelector() {
        const modal = document.getElementById('drugSelectorModal');
        if (modal) {
            modal.classList.add('show');
            renderDrugList();
        }
    }

    /**
     * 약품 선택 모달 닫기
     */
    function closeDrugSelector() {
        const modal = document.getElementById('drugSelectorModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * 약품 검색 설정
     */
    function setupDrugSearch() {
        const searchInput = document.getElementById('drugSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderDrugList(e.target.value);
            });
        }
    }

    /**
     * 약품 목록 렌더링
     */
    function renderDrugList(searchTerm = '') {
        const list = document.getElementById('drugList');
        if (!list) return;

        const filtered = drugDatabase.filter(drug =>
            drug.ingredient.toLowerCase().includes(searchTerm.toLowerCase()) ||
            drug.brand.toLowerCase().includes(searchTerm.toLowerCase())
        );

        list.innerHTML = filtered.map(drug => `
            <div class="drug-item" onclick="NewReportPage.selectDrug(${drug.id})">
                <div class="drug-item-name">${drug.ingredient} (${drug.brand})</div>
                <div class="drug-item-meta">${drug.company} · 허가일: ${drug.approval_date}</div>
            </div>
        `).join('');

        if (filtered.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--app-text-muted); padding: 40px;">검색 결과가 없습니다.</p>';
        }
    }

    /**
     * 약품 선택
     */
    function selectDrug(drugId) {
        selectedDrug = drugDatabase.find(d => d.id === drugId);

        if (selectedDrug) {
            // 버튼 업데이트
            const btn = document.querySelector('.drug-search-btn');
            const selectedName = document.getElementById('selectedDrugName');
            if (btn) btn.classList.add('drug-selected');
            if (selectedName) {
                selectedName.textContent = `${selectedDrug.ingredient} (${selectedDrug.brand})`;
            }

            // 자동 채워진 정보 표시
            const autoFilledSection = document.getElementById('autoFilledSection');
            if (autoFilledSection) autoFilledSection.style.display = 'block';

            const fields = {
                'af_ingredient': selectedDrug.ingredient,
                'af_brand': selectedDrug.brand,
                'af_company': selectedDrug.company,
                'af_approval_date': selectedDrug.approval_date,
                'af_efficacy': selectedDrug.efficacy,
                'af_dosage': selectedDrug.dosage
            };

            Object.entries(fields).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            });

            const cs4Input = document.getElementById('af_cs4');
            if (cs4Input) cs4Input.value = selectedDrug.report_end_date;

            // CS3 자동 계산
            updateReportDates();

            // 모달 닫기
            closeDrugSelector();

            if (typeof showToast === 'function') {
                showToast('약품 정보가 자동으로 입력되었습니다.', 'success');
            }
        }
    }

    /**
     * 선택된 모델 정보 업데이트
     */
    function updateSelectedModelInfo() {
        const modelSelect = document.getElementById('llm_model');
        const hintDisplay = document.getElementById('modelInfoHint');

        if (!modelSelect || !hintDisplay) return;

        const modelInfo = {
            'gemini-3-flash-preview': '최신 Gemini 3 Flash 프리뷰 모델',
            'gemini-2.0-flash': '빠르고 효율적인 모델',
            'gemini-2.0-pro': '균형 잡힌 고품질 모델',
            'gemini-2.5-flash': '최저 비용의 경제적 모델',
            'claude-opus-4-5': '최고 품질의 심층 분석 모델',
            'claude-sonnet-3-5': '품질과 비용의 균형',
            'claude-haiku-3-5': '빠른 처리 속도',
            'gpt-4o': '고품질 범용 모델',
            'gpt-4o-mini': '경제적인 경량 모델'
        };

        hintDisplay.textContent = modelInfo[modelSelect.value] || '';
    }

    /**
     * LLM 설정 데이터 가져오기
     */
    function getLLMSettings() {
        const modelSelect = document.getElementById('llm_model');
        const model = modelSelect ? modelSelect.value : 'gemini-3-flash-preview';
        return {
            mode: 'single',
            model: model
        };
    }

    /**
     * CS3 = CS4 - CS24 계산 함수
     */
    function updateReportDates() {
        const cs4Input = document.getElementById('af_cs4');
        const cs24Select = document.getElementById('report_period');
        const cs3Display = document.getElementById('af_cs3');

        if (!cs4Input || !cs24Select || !cs3Display) return;

        const cs4Value = cs4Input.value;
        const cs24Value = parseInt(cs24Select.value) || 5;

        if (cs4Value) {
            const cs4Date = new Date(cs4Value);
            const cs3Date = new Date(cs4Date);
            cs3Date.setFullYear(cs3Date.getFullYear() - cs24Value);
            cs3Date.setDate(cs3Date.getDate() + 1);

            const cs3Formatted = cs3Date.toISOString().split('T')[0];
            cs3Display.textContent = cs3Formatted;
        } else {
            cs3Display.textContent = '-';
        }
    }

    /**
     * 다크모드 토글
     */
    function toggleDarkMode() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // 다크모드 초기화
    (function() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    })();

    // 페이지 로드 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }

    // 전역 함수 노출
    window.NewReportPage = {
        initializePage,
        openDrugSelector,
        closeDrugSelector,
        selectDrug,
        updateSelectedModelInfo,
        updateReportDates,
        toggleDarkMode
    };

    // 기존 HTML 호환용 전역 함수
    window.openDrugSelector = openDrugSelector;
    window.closeDrugSelector = closeDrugSelector;
    window.selectDrug = selectDrug;
    window.updateSelectedModelInfo = updateSelectedModelInfo;
    window.updateReportDates = updateReportDates;
    window.toggleDarkMode = toggleDarkMode;

})();
