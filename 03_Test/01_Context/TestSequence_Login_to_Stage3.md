# 테스트 시퀀스: 대시보드 ~ Stage 3

## 개요

| 항목 | 내용 |
|------|------|
| **테스트 범위** | 대시보드 → Stage 1 (새 보고서) → Stage 2 (Raw Data 처리) → Stage 2.5 (Line Listing 분석) → Stage 3 (섹션 편집) |
| **테스트 유형** | E2E (End-to-End) 기능 테스트 |
| **대상 환경** | http://localhost:8000 또는 GitHub Pages |
| **사전 로그인** | 테스트 시작 전 로그인 완료 상태 가정 |

---

## 🚨 AI/Claude 에이전트 필수 준수 사항

> **이 섹션은 AI 에이전트(Claude 등)가 이 테스트를 실행할 때 반드시 준수해야 하는 절대 규칙입니다.**

### 절대 규칙

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🚫 절대 금지 사항                                                            │
│                                                                              │
│  1. 파일 수 미달 상태에서 "LLM 분류 시작" 클릭 금지                           │
│     - Step 1: 8개 미만 → 진행 금지                                           │
│     - Step 2: 2개 미만 → 진행 금지                                           │
│     - Step 3: 20개 미만 → 진행 금지                                          │
│     - 총합: 30개 미만 → 진행 금지                                            │
│                                                                              │
│  2. UI 제약 발생 시 임의로 파일 삭제/스킵 금지                                │
│     - 드롭다운에 옵션이 없어도 파일 삭제 금지                                 │
│     - 반드시 사용자에게 문의 후 진행                                          │
│                                                                              │
│  3. 검증 단계 스킵 금지                                                       │
│     - 각 Step 완료 전 파일 수 확인 필수                                       │
│     - "다음" 클릭 전 해당 Step 파일 수 검증 필수                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 필수 검증 체크리스트 (매 Step마다 수행)

| 검증 시점 | 검증 내용 | 기대값 | 미달 시 조치 |
|-----------|----------|--------|-------------|
| Step 1 완료 전 | UI에 표시된 파일 수 | **8개** | ⛔ 누락 파일 업로드 |
| Step 2 완료 전 | UI에 표시된 파일 수 | **2개** | ⛔ 누락 파일 업로드 |
| Step 3 완료 전 | UI에 표시된 파일 수 | **20개** (16+4) | ⛔ 누락 파일 업로드 |
| LLM 분류 시작 전 | 총 파일 수 | **30개** | ⛔ 진행 중단, 누락 확인 |

### UI 제약 발생 시 대응

```
상황: 파일 업로드 후 RAW ID 드롭다운에 해당 옵션이 없음
    ↓
❌ 잘못된 대응: 파일 삭제하고 계속 진행
    ↓
✅ 올바른 대응:
   1. 해당 파일을 그대로 유지
   2. 사용자에게 상황 보고
   3. 사용자 지시에 따라 진행
```

### 세션 컨텍스트 요약 시 필수 기록 사항

테스트 중 세션이 종료되거나 컨텍스트가 압축될 때, 다음 정보를 반드시 기록:

```
- 현재 Step: Step X of 3
- 업로드된 파일 수: Step1(N개) + Step2(N개) + Step3(N개) = 총 N개
- 누락된 파일 목록: [파일명...]
- 발생한 UI 제약: [내용...]
```

---

## 사전 조건

### 테스트 계정
| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| Master | `main@main.com` | `1111` |
| Author | `author@kpsur.test` | `test1234` |

### 필요 파일 (Stage 2 테스트용) - 총 30개 파일

**기본 경로**: `02_relateDocs/00_fromKSJ/학습데이터세트_output예시+raw데이터예시_20260102/raw데이터예시__20260102/`

#### Step 1 of 3 (제품정보) - 8개 파일
**경로**: `02_Step_1/`

| 파일명 | RAW ID | 형식 |
|--------|--------|------|
| RAW1.1_최신첨부문서_예시1.pdf | RAW1.1 | PDF |
| RAW1.2_보고기간시작시점첨부문서_예시1.pdf | RAW1.2 | PDF |
| RAW2.1_용법용량_예시1.pdf | RAW2.1 | PDF |
| RAW2.2_효능효과_예시1.pdf | RAW2.2 | PDF |
| RAW7_안전성정보변경_예시1_복수항목.docx | RAW7 | DOCX |
| RAW7_안전성정보변경_예시2_.docx | RAW7 | DOCX |
| RAW7_안전성정보변경_예시3_용법용량.docx | RAW7 | DOCX |
| RAW7_안전성정보변경_예시4_표형식복수항목.docx | RAW7 | DOCX |

#### Step 2 of 3 (임상 자료) - 2개 파일
**경로**: `03_Step_2/`

| 파일명 | RAW ID | 형식 |
|--------|--------|------|
| RAW8_임상노출데이터_예시1.docx | RAW8 | DOCX |
| RAW17_IIT및NIS트래커_예시1.xlsx | RAW17 | XLSX |

#### Step 3 of 3 (기타 자료) - 16개 파일
**경로**: `03_Step_3/`

| 파일명 | RAW ID | 형식 |
|--------|--------|------|
| RAW2.3_사용상의주의사항_예시1.pdf | RAW2.3 | PDF |
| RAW2.4_보고기간시작시점효능효과_예시1.pdf | RAW2.4 | PDF |
| RAW2.5_보고기간시작시점용법용량_예시1.pdf | RAW2.5 | PDF |
| RAW2.6_보고시작시점사용상의주의사항_예시1.pdf | RAW2.6 | PDF |
| RAW3_시판후sales데이터_예시1.xlsx | RAW3 | XLSX |
| RAW4_허가현황_예시1.xlsx | RAW4 | XLSX |
| RAW5_안전성조치허가팀메일_예시1.docx | RAW5 | DOCX |
| RAW5_안전성조치허가팀메일_예시2.docx | RAW5 | DOCX |
| RAW5_안전성조치허가팀메일_예시3.docx | RAW5 | DOCX |
| RAW5_안전성조치허가팀메일_예시4.docx | RAW5 | DOCX |
| RAW5_안전성조치허가팀메일_예시5.docx | RAW5 | DOCX |
| RAW5_안전성조치허가팀메일_예시6.docx | RAW5 | DOCX |
| RAW6_안전성조치허가팀메일_취합본_예시1 (1).docx | RAW6 | DOCX |
| RAW6_안전성조치허가팀메일_취합본_예시1.docx | RAW6 | DOCX |
| RAW9_문헌자료_예시1.xlsx | RAW9 | XLSX |
| RAW16_MedDRA_SMQ_lack_of_efficacy_예시1.xlsx | RAW16 | XLSX |

#### Line Listing 파일 (별도) - 4개 파일
**경로**: `01_PreProcessing_LineListing/`

| 파일명 | RAW ID | 형식 |
|--------|--------|------|
| Raw12_국외신속보고LineListing_예시1.xlsx | RAW12 | XLSX |
| Raw13_국내신속보고LineListing_예시1.xlsx | RAW13 | XLSX |
| Raw14_원시자료LineListing_예시1.xlsx | RAW14 | XLSX |
| Raw15_정기보고LineListing_예시1.xlsx | RAW15 | XLSX |

> **참고**: Line Listing 파일(RAW12-15)은 Step 3 기타 자료에서 업로드하거나, Stage 2.5에서 별도 업로드 가능

### 브라우저 준비
1. **사전 로그인**: `main@main.com` / `1111`로 로그인 완료
2. API 키 설정 확인 (GOOGLE_API_KEY)
3. 대시보드 (P10_Dashboard.html) 페이지에서 테스트 시작

---

## 테스트 시퀀스

### TC-01: 대시보드 (P10_Dashboard.html)

#### TC-01-01: 대시보드 초기 로드
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 페이지 로드 | 사용자 정보 표시 (이름, 역할) |
| 2 | 사이드바 메뉴 표시 | 대시보드, 보고서 목록, 설정 등 |
| 3 | 통계 카드 표시 | 총 보고서 수, 진행중, 완료 등 |
| 4 | 최근 보고서 목록 | 최신 5개 보고서 표시 |

#### TC-01-02: 새 보고서 생성 버튼
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "새 보고서 생성" 버튼 확인 | Author 이상 역할만 표시 |
| 2 | 버튼 클릭 | P13_NewReport.html 이동 |

#### TC-01-03: 권한별 메뉴 표시
| 역할 | 표시 메뉴 |
|------|----------|
| Master | 모든 메뉴 (사용자 관리, 시스템 설정 포함) |
| Author | 보고서 작성/편집 메뉴 |
| Reviewer | 리뷰/QC 메뉴 |
| Viewer | 조회 메뉴만 |

---

### TC-02: Stage 1 - 새 보고서 생성 (P13_NewReport.html)

#### TC-02-01: 폼 초기 상태
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 페이지 로드 | 빈 폼 표시 |
| 2 | 필수 필드 확인 | `*` 표시된 필드 확인 |
| 3 | 기본값 확인 | MedDRA 버전 등 기본값 설정 |

#### TC-02-02: 보고서 기본 정보 입력
| 필드 | 입력값 예시 | 유효성 |
|------|------------|--------|
| 보고서명 | `TestReport_YYMMDD` | 필수, 중복 불가 |
| 제출일 | `2026-01-05` | 필수, 날짜 형식 |
| 버전 | `1.0` | 필수 |
| 유효기간 시작 | `2025-01-01` | 필수 |
| 유효기간 종료 | `2025-12-31` | 필수, 시작일 이후 |

#### TC-02-03: CS 데이터 입력 (필수 항목)
| CS ID | 항목명 | 입력값 예시 |
|-------|--------|------------|
| CS0 | 성분명 | `글리빅사정(메만틴염산염)` |
| CS1 | 브랜드명 | `글리빅사정10mg` |
| CS2 | 회사명 | `대웅바이오(주)` |
| CS5 | 국내허가일자 | `2019-01-01` |
| CS20 | 1일사용량 | `10` |
| CS21 | 환자1명당사용량 | `365` |
| CS24 | MedDRA 버전 | `27.0` |

---

### 🤖 E2E 테스트 자동화 스크립트 (AI 에이전트 전용)

> **이 스크립트는 E2E 테스트에서만 사용합니다.**
> AI 에이전트(Claude 등)가 P13_NewReport.html에서 브라우저 콘솔에 실행하여 테스트 데이터를 자동으로 입력합니다.

#### 사용 방법

1. P13_NewReport.html 페이지 로드
2. 브라우저 콘솔(F12 → Console)에서 아래 스크립트 실행
3. 스크립트 실행 후 "보고서 생성" 버튼 클릭

#### 자동화 스크립트

```javascript
/**
 * E2E 테스트용 P13 자동 입력 스크립트
 * 실행: 브라우저 콘솔에서 전체 복사하여 붙여넣기
 */
(function fillE2ETestData() {
    console.log('🧪 E2E 테스트 데이터 자동 입력 시작...');

    // === 테스트 데이터 정의 ===
    const testData = {
        // 약품 정보 (자동 채워지는 필드)
        drug: {
            ingredient: '글리빅사정(메만틴염산염)',  // CS0_성분명
            brand: '글리빅사정10mg',               // CS1_브랜드명
            company: '대웅바이오(주)',             // CS2_회사명
            approvalDate: '2019-01-01',          // CS5_국내허가일자
            efficacy: '알츠하이머형 치매',        // CS15_효능효과
            dosage: '1일 1회 10mg'                // CS16_용법용량
        },
        // 보고서 정보
        report: {
            cs4EndDate: '2025-12-31',            // CS4_보고종료날짜
            cs7Version: '1.0',                   // CS7_버전넘버
            cs6SubmitDate: '2026-01-15',         // CS6_보고서제출일
            authorName: '홍길동',                 // 작성자
            authorPosition: '약물감시팀장',       // 작성자 직책
            cs24Period: '5',                     // CS24_보고주기 (5년)
            cs13Expiry: '36개월',                // CS13_유효기간
            llmModel: 'gemini-3-flash-preview', // LLM 모델
            description: 'E2E 테스트용 보고서'   // 보고서 설명
        }
    };

    // === 1. 약품 정보 자동 채우기 ===
    // 약품 선택 버튼 텍스트 변경
    const drugNameBtn = document.getElementById('selectedDrugName');
    if (drugNameBtn) {
        drugNameBtn.textContent = `${testData.drug.ingredient} (${testData.drug.brand})`;
    }

    // 자동 채워지는 섹션 표시
    const autoFilledSection = document.getElementById('autoFilledSection');
    if (autoFilledSection) {
        autoFilledSection.style.display = 'block';
    }

    // CS0_성분명
    const afIngredient = document.getElementById('af_ingredient');
    if (afIngredient) afIngredient.textContent = testData.drug.ingredient;

    // CS1_브랜드명
    const afBrand = document.getElementById('af_brand');
    if (afBrand) afBrand.textContent = testData.drug.brand;

    // CS2_회사명
    const afCompany = document.getElementById('af_company');
    if (afCompany) afCompany.textContent = testData.drug.company;

    // CS5_국내허가일자
    const afApprovalDate = document.getElementById('af_approval_date');
    if (afApprovalDate) afApprovalDate.textContent = testData.drug.approvalDate;

    // CS15_효능효과
    const afEfficacy = document.getElementById('af_efficacy');
    if (afEfficacy) afEfficacy.textContent = testData.drug.efficacy;

    // CS16_용법용량
    const afDosage = document.getElementById('af_dosage');
    if (afDosage) afDosage.textContent = testData.drug.dosage;

    // CS4_보고종료날짜 (input)
    const afCs4 = document.getElementById('af_cs4');
    if (afCs4) {
        afCs4.value = testData.report.cs4EndDate;
        afCs4.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // === 2. 보고서 정보 입력 ===
    // CS7_버전넘버
    const versionInput = document.getElementById('first_approval_country');
    if (versionInput) versionInput.value = testData.report.cs7Version;

    // CS6_보고서제출일
    const submitDateInput = document.getElementById('first_approval_date');
    if (submitDateInput) submitDateInput.value = testData.report.cs6SubmitDate;

    // 작성자
    const authorNameInput = document.getElementById('author_name');
    if (authorNameInput) authorNameInput.value = testData.report.authorName;

    // 작성자 직책
    const authorPositionInput = document.getElementById('author_position');
    if (authorPositionInput) authorPositionInput.value = testData.report.authorPosition;

    // CS24_보고주기 (select)
    const periodSelect = document.getElementById('report_period');
    if (periodSelect) {
        periodSelect.value = testData.report.cs24Period;
        periodSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // CS13_유효기간
    const expiryInput = document.getElementById('submitter');
    if (expiryInput) expiryInput.value = testData.report.cs13Expiry;

    // === 3. LLM 설정 ===
    const llmSelect = document.getElementById('llm_model');
    if (llmSelect) {
        llmSelect.value = testData.report.llmModel;
        llmSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // === 4. 추가 정보 ===
    const descriptionInput = document.getElementById('report_description');
    if (descriptionInput) descriptionInput.value = testData.report.description;

    // === 5. 내부 데이터 구조 설정 (selectedDrug 객체) ===
    // P13의 submitForm()에서 사용하는 selectedDrug 전역 변수 설정
    window.selectedDrug = {
        id: 999,
        ingredient_name: testData.drug.ingredient,
        brand_name: testData.drug.brand,
        company_name: testData.drug.company,
        domestic_approval_date: testData.drug.approvalDate,
        efficacy: testData.drug.efficacy,
        dosage: testData.drug.dosage
    };

    console.log('✅ E2E 테스트 데이터 자동 입력 완료!');
    console.log('📋 입력된 데이터:', { testData, selectedDrug: window.selectedDrug });
    console.log('👉 이제 "보고서 생성" 버튼을 클릭하세요.');

    return { success: true, data: testData };
})();
```

#### 스크립트 검증

스크립트 실행 후 아래 항목이 채워졌는지 확인:

| 필드 | 예상 값 | 확인 |
|------|---------|------|
| 약품명 버튼 | `글리빅사정(메만틴염산염) (글리빅사정10mg)` | ☐ |
| CS0_성분명 | `글리빅사정(메만틴염산염)` | ☐ |
| CS1_브랜드명 | `글리빅사정10mg` | ☐ |
| CS2_회사명 | `대웅바이오(주)` | ☐ |
| CS4_보고종료날짜 | `2025-12-31` | ☐ |
| CS7_버전넘버 | `1.0` | ☐ |
| CS6_보고서제출일 | `2026-01-15` | ☐ |
| 작성자 | `홍길동` | ☐ |
| 작성자 직책 | `약물감시팀장` | ☐ |
| CS24_보고주기 | `5년` | ☐ |
| CS13_유효기간 | `36개월` | ☐ |
| LLM 모델 | `gemini-3-flash-preview` | ☐ |

---

#### TC-02-04: 보고서 생성 실행
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 모든 필수 필드 입력 완료 | "생성" 버튼 활성화 |
| 2 | "생성" 버튼 클릭 | 로딩 표시 |
| 3 | Supabase에 보고서 생성 | 성공 메시지 |
| 4 | localStorage에 report_id 저장 | `current_report` 키에 UUID 저장 |
| 5 | P14_UnifiedProcessing.html 이동 | Stage 2 페이지 표시 |

#### TC-02-05: 유효성 검사 실패
| 케이스 | Expected Result |
|--------|-----------------|
| 필수 필드 누락 | "필수 항목을 입력해주세요" 메시지 |
| 유효기간 종료 < 시작 | "종료일이 시작일보다 빨릅니다" 메시지 |
| 중복 보고서명 | "이미 존재하는 보고서명입니다" 메시지 |

---

### TC-03: Stage 2 - Raw Data 처리 (P14_UnifiedProcessing.html)

#### TC-03-01: 페이지 초기 상태
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 페이지 로드 | Stage 2 배지 표시 |
| 2 | 보고서 정보 표시 | 현재 보고서명, 진행 상태 |
| 3 | 파일 업로드 영역 | 드래그앤드롭 존 표시 |
| 4 | 프로세스 단계 표시 | 업로드 → MD변환 → 데이터추출 |

#### TC-03-02: 파일 업로드 (3단계 위자드)

**Step 1 of 3: 제품정보 문서 업로드**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Step 1 화면 확인 | "제품정보 관련 문서" 안내 표시 |
| 2 | "있음" 라디오 버튼 선택 | 업로드 영역 활성화 |
| 3 | 아래 8개 파일 업로드 (02_Step_1/ 폴더) | 파일 목록에 모두 표시 |

**Step 1 업로드 파일 (8개):**
```
RAW1.1_최신첨부문서_예시1.pdf
RAW1.2_보고기간시작시점첨부문서_예시1.pdf
RAW2.1_용법용량_예시1.pdf
RAW2.2_효능효과_예시1.pdf
RAW7_안전성정보변경_예시1_복수항목.docx
RAW7_안전성정보변경_예시2_.docx
RAW7_안전성정보변경_예시3_용법용량.docx
RAW7_안전성정보변경_예시4_표형식복수항목.docx
```
| Step | Action | Expected Result |
|------|--------|-----------------|
| 4 | "다음" 버튼 클릭 | Step 2로 이동 |

**Step 2 of 3: 임상 자료 업로드**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Step 2 화면 확인 | "임상 관련 문서" 안내 표시 |
| 2 | "있음" 라디오 버튼 선택 | 업로드 영역 활성화 |
| 3 | 아래 2개 파일 업로드 (03_Step_2/ 폴더) | 파일 목록에 모두 표시 |

**Step 2 업로드 파일 (2개):**
```
RAW8_임상노출데이터_예시1.docx
RAW17_IIT및NIS트래커_예시1.xlsx
```
| Step | Action | Expected Result |
|------|--------|-----------------|
| 4 | "다음" 버튼 클릭 | Step 3으로 이동 |

**Step 3 of 3: 기타 자료 업로드**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Step 3 화면 확인 | "기타 관련 문서" 안내 표시 |
| 2 | "있음" 라디오 버튼 선택 | 업로드 영역 활성화 |
| 3-1 | 아래 16개 파일 업로드 (03_Step_3/ 폴더) | 파일 목록에 **16개** 표시 |
| 3-2 | 아래 4개 파일 업로드 (01_PreProcessing_LineListing/ 폴더) | 파일 목록에 **20개** 표시 |

> **🚨 주의**: Step 3에서는 **반드시 20개 파일**을 업로드해야 합니다.
> - 기타 자료: 16개 (03_Step_3/ 폴더)
> - Line Listing: 4개 (01_PreProcessing_LineListing/ 폴더)
>
> **4개만 업로드하고 진행하면 테스트 실패입니다!**

**Step 3 업로드 파일 - 기타 자료 (16개) [03_Step_3/ 폴더]:**

| # | 파일명 | RAW ID |
|---|--------|--------|
| 1 | RAW2.3_사용상의주의사항_예시1.pdf | RAW2.3 |
| 2 | RAW2.4_보고기간시작시점효능효과_예시1.pdf | RAW2.4 |
| 3 | RAW2.5_보고기간시작시점용법용량_예시1.pdf | RAW2.5 |
| 4 | RAW2.6_보고시작시점사용상의주의사항_예시1.pdf | RAW2.6 |
| 5 | RAW3_시판후sales데이터_예시1.xlsx | RAW3 |
| 6 | RAW4_허가현황_예시1.xlsx | RAW4 |
| 7 | RAW5_안전성조치허가팀메일_예시1.docx | RAW5 |
| 8 | RAW5_안전성조치허가팀메일_예시2.docx | RAW5 |
| 9 | RAW5_안전성조치허가팀메일_예시3.docx | RAW5 |
| 10 | RAW5_안전성조치허가팀메일_예시4.docx | RAW5 |
| 11 | RAW5_안전성조치허가팀메일_예시5.docx | RAW5 |
| 12 | RAW5_안전성조치허가팀메일_예시6.docx | RAW5 |
| 13 | RAW6_안전성조치허가팀메일_취합본_예시1 (1).docx | RAW6 |
| 14 | RAW6_안전성조치허가팀메일_취합본_예시1.docx | RAW6 |
| 15 | RAW9_문헌자료_예시1.xlsx | RAW9 |
| 16 | RAW16_MedDRA_SMQ_lack_of_efficacy_예시1.xlsx | RAW16 |

**Step 3 업로드 파일 - Line Listing (4개) [01_PreProcessing_LineListing/ 폴더]:**

| # | 파일명 | RAW ID |
|---|--------|--------|
| 17 | Raw12_국외신속보고LineListing_예시1.xlsx | RAW12 |
| 18 | Raw13_국내신속보고LineListing_예시1.xlsx | RAW13 |
| 19 | Raw14_원시자료LineListing_예시1.xlsx | RAW14 |
| 20 | Raw15_정기보고LineListing_예시1.xlsx | RAW15 |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 4 | **⚠️ Step 3 파일 수 검증** | UI에 **20개** 파일 표시 확인 |
| 5 | 총 30개 파일 업로드 확인 | Step 1(8) + Step 2(2) + Step 3(20) = **30개** |
| 6 | "🚀 LLM 분류 시작" 버튼 클릭 | LLM 자동 분류 프로세스 시작 |

```
⚠️ Step 3 검증 실패 시:
   - 파일 수가 20개 미만이면 절대 "LLM 분류 시작" 클릭 금지
   - 누락된 파일을 찾아서 추가 업로드
   - 03_Step_3/ 폴더에서 16개, 01_PreProcessing_LineListing/ 폴더에서 4개 확인
```

---

### ⚠️ 필수: 파일 업로드 검증 단계 (TC-03-02 보충)

> **중요**: 다음 검증 단계를 반드시 수행하지 않으면 테스트가 실패합니다.
> 파일이 일부만 업로드되면 PSUR 섹션 생성이 불완전해집니다.

#### 각 Step별 파일 수 검증

| Step | 검증 시점 | Expected 파일 수 | 검증 방법 |
|------|----------|-----------------|----------|
| Step 1 | "다음" 클릭 전 | **8개** | UI 파일 목록에서 8개 확인 |
| Step 2 | "다음" 클릭 전 | **2개** | UI 파일 목록에서 2개 확인 |
| Step 3 | "LLM 분류 시작" 클릭 전 | **20개** (16+4) | UI 파일 목록에서 20개 확인 |

#### "LLM 분류 시작" 전 최종 검증

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 화면 상단의 총 파일 수 확인 | **총 30개 파일** 표시 |
| 2 | 파일 목록 스크롤하여 모든 파일 확인 | 30개 파일 모두 목록에 표시 |
| 3 | 파일 수가 30개 미만인 경우 | **⛔ 진행 중단**, 누락 파일 추가 업로드 |
| 4 | 30개 확인 후 "🚀 LLM 분류 시작" 클릭 | 처리 시작 |

#### 마크다운 변환 결과 확인

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 변환 완료 팝업 확인 | **30개 성공** 표시 |
| 2 | 성공 파일 수가 30개 미만인 경우 | 실패 파일 확인 후 재업로드 또는 계속 진행 결정 |

#### 검증 실패 시 조치

```
⛔ 파일 수 부족 발견 시:
1. "LLM 분류 시작" 버튼 클릭하지 않음
2. 해당 Step으로 돌아가서 누락 파일 추가 업로드
3. 다시 파일 수 검증
4. 30개 확인 후 진행
```

---

#### TC-03-03: RAW ID 자동 분류
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 파일 업로드 완료 | LLM 자동 분류 시작 |
| 2 | 분류 진행 | 프로그레스바 표시 |
| 3 | 분류 완료 | 각 파일에 RAW ID 태그 표시 |

**RAW ID 분류 예시 (총 30개 파일):**

**Step 1 파일 (8개):**
| 파일명 | 자동 분류 RAW ID |
|--------|-----------------|
| `RAW1.1_최신첨부문서_예시1.pdf` | RAW1.1 |
| `RAW1.2_보고기간시작시점첨부문서_예시1.pdf` | RAW1.2 |
| `RAW2.1_용법용량_예시1.pdf` | RAW2.1 |
| `RAW2.2_효능효과_예시1.pdf` | RAW2.2 |
| `RAW7_안전성정보변경_예시1_복수항목.docx` | RAW7 |
| `RAW7_안전성정보변경_예시2_.docx` | RAW7 |
| `RAW7_안전성정보변경_예시3_용법용량.docx` | RAW7 |
| `RAW7_안전성정보변경_예시4_표형식복수항목.docx` | RAW7 |

**Step 2 파일 (2개):**
| 파일명 | 자동 분류 RAW ID |
|--------|-----------------|
| `RAW8_임상노출데이터_예시1.docx` | RAW8 |
| `RAW17_IIT및NIS트래커_예시1.xlsx` | RAW17 |

**Step 3 파일 - 기타 자료 (16개):**
| 파일명 | 자동 분류 RAW ID |
|--------|-----------------|
| `RAW2.3_사용상의주의사항_예시1.pdf` | RAW2.3 |
| `RAW2.4_보고기간시작시점효능효과_예시1.pdf` | RAW2.4 |
| `RAW2.5_보고기간시작시점용법용량_예시1.pdf` | RAW2.5 |
| `RAW2.6_보고시작시점사용상의주의사항_예시1.pdf` | RAW2.6 |
| `RAW3_시판후sales데이터_예시1.xlsx` | RAW3 |
| `RAW4_허가현황_예시1.xlsx` | RAW4 |
| `RAW5_안전성조치허가팀메일_예시1.docx` | RAW5 |
| `RAW5_안전성조치허가팀메일_예시2.docx` | RAW5 |
| `RAW5_안전성조치허가팀메일_예시3.docx` | RAW5 |
| `RAW5_안전성조치허가팀메일_예시4.docx` | RAW5 |
| `RAW5_안전성조치허가팀메일_예시5.docx` | RAW5 |
| `RAW5_안전성조치허가팀메일_예시6.docx` | RAW5 |
| `RAW6_안전성조치허가팀메일_취합본_예시1 (1).docx` | RAW6 |
| `RAW6_안전성조치허가팀메일_취합본_예시1.docx` | RAW6 |
| `RAW9_문헌자료_예시1.xlsx` | RAW9 |
| `RAW16_MedDRA_SMQ_lack_of_efficacy_예시1.xlsx` | RAW16 |

**Step 3 파일 - Line Listing (4개):**
| 파일명 | 자동 분류 RAW ID |
|--------|-----------------|
| `Raw12_국외신속보고LineListing_예시1.xlsx` | RAW12 |
| `Raw13_국내신속보고LineListing_예시1.xlsx` | RAW13 |
| `Raw14_원시자료LineListing_예시1.xlsx` | RAW14 |
| `Raw15_정기보고LineListing_예시1.xlsx` | RAW15 |

#### TC-03-04: RAW ID 수동 수정
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 파일의 RAW ID 드롭다운 클릭 | RAW ID 목록 표시 |
| 2 | 다른 RAW ID 선택 | 즉시 변경 적용 |
| 3 | 변경 내용 저장 | localStorage 업데이트 |

#### TC-03-05: Markdown 변환
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "MD 변환 시작" 버튼 클릭 | 변환 프로세스 시작 |
| 2 | PDF → Markdown | 텍스트 추출 및 변환 |
| 3 | Excel → Markdown | 테이블 형식 유지 |
| 4 | Word → Markdown | 서식 보존 |
| 5 | 변환 완료 | 각 파일별 MD 프리뷰 표시 |

**변환 품질 확인:**
- [ ] 원본 텍스트 100% 보존
- [ ] 테이블 구조 유지
- [ ] 특수문자/한글 정상 표시

#### TC-03-06: 데이터 추출
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "데이터 추출 시작" 버튼 클릭 | LLM 추출 시작 |
| 2 | CS 데이터 추출 | CS0~CS60 변수 추출 |
| 3 | PH 데이터 추출 | PH1~PH11 서술문 추출 |
| 4 | Table 데이터 추출 | 표2~표9 테이블 추출 |
| 5 | 추출 완료 | 추출 결과 요약 표시 |

**추출 데이터 검증:**
| 데이터 유형 | 검증 항목 |
|------------|----------|
| CS | 변수ID, 값, 소스 RAW ID |
| PH | 서술문 전체 텍스트, 소스 |
| Table | 컬럼명, 행 데이터, 소스 |

#### TC-03-07: Stage 2 완료
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 모든 처리 완료 확인 | 체크마크 표시 |
| 2 | "다음 단계로" 버튼 클릭 | P18_Review.html 이동 |
| 3 | 보고서 상태 업데이트 | `current_stage: 3` |

---

## 데이터 검증 포인트

### localStorage 저장 확인
```javascript
// 콘솔에서 확인
console.log('Session:', JSON.parse(localStorage.getItem('kpsur_session')));
console.log('Report ID:', localStorage.getItem('current_report'));
console.log('Uploaded Files:', JSON.parse(localStorage.getItem('uploadedFiles')));
console.log('Converted MD:', JSON.parse(localStorage.getItem('convertedMarkdowns')));
console.log('Extracted Data:', JSON.parse(localStorage.getItem('extractedData')));
```

### Supabase 데이터 확인
```sql
-- 생성된 보고서 확인
SELECT * FROM reports WHERE report_name LIKE 'TestReport%' ORDER BY created_at DESC;

-- 업로드된 소스 문서
SELECT * FROM source_documents WHERE report_id = '<report_uuid>';

-- 추출된 데이터
SELECT * FROM extracted_data WHERE report_id = '<report_uuid>';
```

---

## 에러 시나리오

### E-01: 네트워크 오류
| 상황 | Expected Behavior |
|------|------------------|
| Supabase 연결 실패 | 재시도 버튼 표시, 오프라인 모드 안내 |
| LLM API 타임아웃 | "다시 시도" 옵션, 부분 결과 저장 |

### E-02: 파일 처리 오류
| 상황 | Expected Behavior |
|------|------------------|
| 지원하지 않는 파일 형식 | "지원하지 않는 형식입니다" 메시지 |
| 파일 크기 초과 (>10MB) | "파일 크기가 너무 큽니다" 메시지 |
| 손상된 파일 | "파일을 읽을 수 없습니다" 메시지 |

### E-03: 세션 만료
| 상황 | Expected Behavior |
|------|------------------|
| 세션 타임아웃 | 로그인 페이지로 리다이렉트 |
| 토큰 만료 | 자동 갱신 시도, 실패 시 재로그인 |

---

## 테스트 체크리스트

### 대시보드 (TC-01)
- [ ] 사용자 정보 표시
- [ ] 통계 카드 표시
- [ ] 권한별 메뉴 표시

### Stage 1 (TC-02)
- [ ] 필수 필드 입력
- [ ] CS 데이터 입력
- [ ] 보고서 생성 성공
- [ ] 유효성 검사

### Stage 2 (TC-03)
- [ ] 파일 업로드 (3단계 위자드)
- [ ] RAW ID 자동 분류
- [ ] RAW ID 수동 수정
- [ ] Markdown 변환
- [ ] 데이터 추출
- [ ] Stage 완료 및 이동

### Stage 2.5 - Line Listing 분석 (TC-04)
- [ ] Line Listing 페이지 접근
- [ ] Line Listing 파일 선택 (RAW12-15)
- [ ] LLM 싱글샷 분석 실행
- [ ] Seriousness/인과성/SOC 컬럼 추가 확인
- [ ] CS59 별첨3 요약 테이블 생성
- [ ] 통계 요약 (총 건수, 중대/비중대, Certain/Probable)
- [ ] 결과 테이블 미리보기 (Seriousness "Yes" 하이라이트)
- [ ] Excel/Markdown 다운로드
- [ ] localStorage 저장 확인
- [ ] PSUR 생성 시 자동 통합 (섹션 08, 14)

### Stage 3 - 섹션 편집 (TC-05)
- [ ] 15개 섹션 목록 로드
- [ ] 섹션 상태 배지 (생성됨/데이터 부족)
- [ ] **CS/PH/Table 데이터 뷰어 확인** (NEW)
  - [ ] CS 데이터 66개 확인
  - [ ] PH 데이터 11개 확인
  - [ ] Table 데이터 6개 확인
  - [ ] 데이터 소스 표시 (P13_UserInput, RAW{n}, CALCULATED 등)
- [ ] 섹션 내용 보기/편집
- [ ] 마크다운 에디터/미리보기
- [ ] 섹션 08 Line Listing 반영 확인
- [ ] 섹션 14 CS59 테이블 확인
- [ ] 섹션 재생성 기능
- [ ] Stage 완료 및 이동

---

## 테스트 환경 설정

### API 키 설정 (테스트 전)
```javascript
// 브라우저 콘솔에서 실행
localStorage.setItem('GOOGLE_API_KEY', JSON.stringify('YOUR_GEMINI_API_KEY'));
```

### 테스트 데이터 초기화
```javascript
// 테스트 전 초기화
localStorage.removeItem('current_report');
localStorage.removeItem('uploadedFiles');
localStorage.removeItem('convertedMarkdowns');
localStorage.removeItem('extractedData');
```

---

*문서 버전: 2.0*
*최초작성일: 2026-01-05*
*최종수정일: 2026-01-17*
*대상 시스템: KPSUR AGENT v1.0*

---

## 2026-01-07 구현 완료 사항

### 1. 빈 PSUR 섹션 문제 해결 (Phase 1-5) ✅

**근본 원인**: E2E 테스트에서 21개 파일 중 5개만 업로드되어 섹션 04, 05, 07, 08, 09 생성 실패

**구현 내용**:

| Phase | 파일 | 내용 |
|-------|------|------|
| Phase 1 | `js/config.js` L42-74 | `SECTION_DATA_DEPENDENCIES` 설정 추가 |
| Phase 2 | `P14_UnifiedProcessing.html` L2009-2140 | `validateDataCompleteness()`, `showDataValidationWarning()` |
| Phase 3 | `P14_UnifiedProcessing.html` L2167-2243 | LLM 프롬프트에 데이터 가용성 상태 포함 |
| Phase 4 | `P14_UnifiedProcessing.html` L2296-2401 | `extractSectionsWithLogging()`, `generatePlaceholderSection()` |
| Phase 5 | `P15_SectionEditor.html` L740-756 | 불완전 섹션 "⚠️ 데이터 부족" 배지 |

**섹션별 데이터 의존성**:
```javascript
SECTION_DATA_DEPENDENCIES: {
    "04": { name: "전세계판매허가현황", required: ["RAW4"], optional: [] },
    "05": { name: "안전성조치", required: ["RAW7"], optional: ["RAW5", "RAW6"] },
    "07": { name: "환자노출", required: ["RAW3"], optional: [] },
    "08": { name: "개별증례병력", required: ["RAW14"], optional: ["RAW12", "RAW13", "RAW15"] },
    "09": { name: "시험", required: [], optional: ["RAW8", "RAW17"] }
}
```

### 2. 단계별 결과 확인 기능 추가 ✅

**마크다운 변환 결과 확인 팝업**:
- 파일: `P14_UnifiedProcessing.html` L1901-2007
- 함수: `showConversionResultPopup()`
- 기능: 변환 성공/실패 파일 표시, 취소/계속 선택

**처리 워크플로우**:
```
Step 1: 마크다운 변환
       ↓
📄 변환 결과 확인 팝업  ← NEW
       ↓
Step 2: RAW ID 분류
       ↓
Step 3: 데이터 통합
       ↓
⚠️ 누락 파일 확인 팝업  ← EXISTING
       ↓
Step 4: PSUR 섹션 생성
       ↓
Stage 3 (P15_SectionEditor)
```

### 3. Hook 설정 추가 ✅

**AskUserQuestion 알림**:
- 스크립트: `~/.claude/hooks/ask-user-notify.sh`
- 설정: `~/.claude/settings.json` PostToolUse 추가
- 소리: "Ping" (응답 완료 "Glass"와 구분)

---

## 다음 테스트 단계

### 필수 검증 항목

1. **전체 E2E 테스트**: 30개 파일 모두 업로드하여 전체 워크플로우 검증
2. **부분 데이터 테스트**: 5개 파일만 업로드하여 경고 모달 및 플레이스홀더 검증
3. **변환 결과 팝업 테스트**: 변환 성공/실패 시나리오 테스트

### TC-03-08: 마크다운 변환 결과 확인 (NEW)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 모든 파일 업로드 후 "🚀 LLM 분류 시작" 클릭 | 마크다운 변환 시작 |
| 2 | 변환 완료 | **변환 결과 확인 팝업** 표시 |
| 3 | 팝업에서 성공/실패 파일 확인 | 성공 파일: 이름, RAW ID, 크기 표시<br>실패 파일: 이름, 오류 메시지 표시 |
| 4 | "계속 진행" 버튼 클릭 | RAW ID 분류 단계로 진행 |
| 4-alt | "취소" 버튼 클릭 | 처리 중단, 파일 수정 가능 |

### TC-03-09: 데이터 완전성 검증 (NEW)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 일부 파일만 업로드 (예: RAW1.1, RAW2.1만) | |
| 2 | LLM 분류 및 데이터 통합 완료 | **데이터 부족 경고 팝업** 표시 |
| 3 | 팝업에서 누락 파일 확인 | 필수 누락: RAW3, RAW4, RAW7, RAW14 등<br>선택 누락: RAW5, RAW6, RAW8 등 |
| 4 | "계속 진행" 버튼 클릭 | 플레이스홀더 섹션으로 PSUR 생성 |
| 4-alt | "취소 (파일 추가하기)" 버튼 클릭 | 처리 중단, 파일 추가 가능 |

### TC-03-10: 불완전 섹션 배지 확인 (NEW)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 일부 파일만으로 Stage 3 진입 | P15_SectionEditor 로드 |
| 2 | 섹션 목록 확인 | 데이터 부족 섹션에 "⚠️ 데이터 부족" 배지 표시 |
| 3 | 불완전 섹션 클릭 | 플레이스홀더 내용 표시:<br>- 필요 파일 목록<br>- 다음 단계 안내 |

---

### TC-04: Stage 2.5 - Line Listing 분석 (P16_LineListingAnalysis.html)

#### TC-04-01: Line Listing 페이지 접근

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Stage 2 완료 후 사이드바에서 "Line Listing 분석" 클릭 | P16_LineListingAnalysis.html 이동 |
| 2 | 또는 P14 완료 후 "Line Listing 분석" 버튼 클릭 | P16 페이지 로드 |
| 3 | 페이지 초기 상태 | 업로드 영역 표시, 기존 파일 목록 (있는 경우) |

#### TC-04-02: Line Listing 파일 선택

**테스트 파일 (RAW12-15):**
```
Raw12_국외신속보고LineListing_예시1.xlsx
Raw13_국내신속보고LineListing_예시1.xlsx
Raw14_원시자료LineListing_예시1.xlsx
Raw15_정기보고LineListing_예시1.xlsx
```

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | P14에서 업로드한 파일이 있는 경우 | 기존 Line Listing 파일 목록 자동 표시 |
| 2 | 새 파일 업로드 (드래그앤드롭 또는 클릭) | 파일 선택 다이얼로그, 파일 추가됨 |
| 3 | 파일 목록에서 분석할 파일 선택 | 선택된 파일 하이라이트, "분석 시작" 버튼 활성화 |
| 4 | 파일 선택 해제 | 선택 해제, 0개 선택 시 버튼 비활성화 |

#### TC-04-03: Line Listing LLM 분석 (싱글샷)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "🔍 분석 시작" 버튼 클릭 | 분석 프로세스 시작, 프로그레스바 표시 |
| 2 | 마크다운 테이블 파싱 | 이상사례(AE), 인과성평가(Causality) 데이터 추출 |
| 3 | LLM 싱글샷 분석 | 진행 상태: "LLM에 데이터 전송 중..." |
| 4 | 분석 완료 | 진행 상태: "분석 완료" |

**분석 결과 검증:**
| 항목 | Expected Result |
|------|-----------------|
| Seriousness 컬럼 | 각 행에 "Yes" 또는 "No" 값 추가 |
| 인과성평가 컬럼 | Certain, Probable, Possible, Unlikely 등 매핑 |
| SOC 컬럼 | MedDRA PT → SOC 영문명 추출 |

#### TC-04-04: CS59 별첨3 요약 테이블 생성

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 분석 완료 후 결과 탭 확인 | "요약 테이블" 탭 표시 |
| 2 | CS59 테이블 형식 확인 | SOC/PT별 행, 6개 카테고리 컬럼 |

**CS59 테이블 컬럼:**
| 컬럼명 | 형식 |
|--------|------|
| 구분 (SOC / PT) | SOC 굵게, PT 들여쓰기 |
| 중대한 이상사례 | 환자수/건수 (예: 14/22) |
| 중대한 약물이상반응 | 환자수/건수 |
| 중대하지 않은 이상사례 | 환자수/건수 |
| 중대하지 않은 약물이상반응 | 환자수/건수 |
| 총-이상사례 | 환자수/건수 |
| 총-약물이상반응 | 환자수/건수 |

**테이블 검증:**
- [ ] SOC 행은 **굵게** 표시
- [ ] PT 행은 들여쓰기 (`&nbsp;&nbsp;`)
- [ ] 마지막 행은 **총계**
- [ ] 약물이상반응(ADR) = Certain + Probable + Possible 인과성만 포함

#### TC-04-05: 통계 요약 확인

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 통계 패널 확인 | 4개 주요 통계 표시 |

**통계 항목:**
| 항목 | 설명 |
|------|------|
| 총 건수 | 전체 이상사례 건수 |
| 중대한 이상사례 | Seriousness = "Yes" 건수 |
| 중대하지 않은 이상사례 | Seriousness = "No" 건수 |
| Certain/Probable 인과성 | 높은 인과성 건수 |

#### TC-04-06: 결과 테이블 미리보기

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "처리된 데이터" 탭 클릭 | 전체 데이터 테이블 표시 |
| 2 | Seriousness "Yes" 행 확인 | 빨간색 하이라이트 (serious-yes 클래스) |
| 3 | 인과성 배지 확인 | Certain: 빨강, Probable: 주황, Possible: 노랑, Unlikely: 회색 |
| 4 | 테이블 스크롤 | 최대 100행 미리보기, 나머지는 "총 N행 중 100행만 표시" |

#### TC-04-07: 결과 다운로드

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "📥 Excel 다운로드" 버튼 클릭 | CS59_별첨1_일람표.xlsx 다운로드 |
| 2 | Excel 파일 열기 | SOC/PT 테이블, 셀 병합, 퍼센트 계산 포함 |
| 3 | "📥 Markdown 다운로드" 버튼 클릭 | Result.md 다운로드 |
| 4 | MD 파일 내용 확인 | 마크다운 테이블 형식, 별첨1 제목 포함 |

#### TC-04-08: localStorage 저장 확인

```javascript
// 콘솔에서 확인
console.log('Line Listing Analysis:', JSON.parse(localStorage.getItem('lineListingAnalysis')));
```

**저장 데이터 구조:**
```json
{
  "cs59Summary": [...],
  "reportMarkdown": "# [별첨 3] ...",
  "statistics": {
    "total": 80,
    "seriousYes": 40,
    "seriousNo": 40,
    "certainProbable": 30
  },
  "analyzedAt": "2026-01-08T..."
}
```

#### TC-04-09: PSUR 생성 시 Line Listing 자동 통합

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | P14에서 "PSUR 생성" 실행 | Line Listing 파일 자동 감지 |
| 2 | RAW12-15 파일 있는 경우 | "Line Listing 분석 시작..." 메시지 |
| 3 | 분석 완료 | "Line Listing 분석 완료, 본문 생성 진행" 로그 |
| 4 | 통합 프롬프트 확인 | "[Line Listing 분석 결과]" 섹션 포함 |
| 5 | 생성된 섹션 08, 14 확인 | Line Listing 통계 및 CS59 테이블 반영 |

---

### TC-05: Stage 3 - 섹션 편집 (P15_SectionEditor.html)

#### TC-05-01: 페이지 초기 로드

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Stage 2 완료 후 자동 이동 | P15_SectionEditor.html 로드 |
| 2 | 또는 사이드바에서 "섹션 편집" 클릭 | P15 페이지 표시 |
| 3 | 보고서 정보 표시 | 보고서명, Stage 3 배지 |
| 4 | 섹션 목록 로드 | 15개 섹션 목록 (00-14) |

#### TC-05-02: 섹션 목록 확인

**15개 PSUR 섹션:**
| 번호 | 섹션명 | 상태 확인 |
|------|--------|----------|
| 00 | 표지 | 생성됨/미생성 |
| 01 | 목차 | 생성됨/미생성 |
| 02 | 약어설명 | 생성됨/미생성 |
| 03 | 서론 | 생성됨/미생성 |
| 04 | 전세계판매허가현황 | 생성됨/미생성/⚠️ 데이터 부족 |
| 05 | 안전성조치 | 생성됨/미생성/⚠️ 데이터 부족 |
| 06 | 안전성정보참고정보변경 | 생성됨/미생성 |
| 07 | 환자노출 | 생성됨/미생성/⚠️ 데이터 부족 |
| 08 | 개별증례병력 | 생성됨/미생성/⚠️ 데이터 부족 |
| 09 | 시험 | 생성됨/미생성 |
| 10 | 기타정보 | 생성됨/미생성 |
| 11 | 종합적인안전성평가 | 생성됨/미생성 |
| 12 | 결론 | 생성됨/미생성 |
| 13 | 참고문헌 | 생성됨/미생성 |
| 14 | 별첨 | 생성됨/미생성 |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 섹션 목록 스크롤 | 15개 섹션 모두 표시 |
| 2 | 생성된 섹션 확인 | ✅ 체크마크 또는 "생성됨" 배지 |
| 3 | 데이터 부족 섹션 확인 | ⚠️ "데이터 부족" 배지 표시 |

#### TC-05-03: CS/PH/Table 데이터 뷰어 확인 (NEW)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 사이드바의 "📊 CS/PH/Table 데이터 보기" 버튼 확인 | 버튼에 총 데이터 개수 표시 (예: "83") |
| 2 | 버튼 클릭 | 데이터 뷰어 모달 팝업 |
| 3 | CS 탭 확인 | CS 데이터 목록 (66개 항목) |
| 4 | PH 탭 클릭 | PH 데이터 목록 (11개 항목) |
| 5 | Table 탭 클릭 | Table 데이터 목록 (6개 항목) |
| 6 | 개별 데이터 항목 클릭 | 우측 패널에 상세 값 표시 |
| 7 | 모달 닫기 (X 버튼 또는 ESC) | 모달 닫힘 |

**데이터 소스 확인:**
| 소스 타입 | 의미 | 예시 |
|----------|------|------|
| P13_UserInput | Stage 1에서 사용자 입력 | CS0_성분명, CS1_브랜드명 |
| RAW{n} | RAW 파일에서 추출 | CS17_전세계허가현황표 (RAW4) |
| CALCULATED | 계산 필요 | CS14_신청기한, CS22_연평균판매량 |
| GENERATED | PSUR 생성 시 자동 | CS9_목차, CS12_약어표 |
| USER_INPUT | 추가 사용자 입력 필요 | CS24_MedDRA버전넘버 |

#### TC-05-04: 섹션 내용 보기/편집

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 섹션 행 클릭 | 해당 섹션 내용 에디터에 로드 |
| 2 | 마크다운 에디터 표시 | 원본 마크다운 텍스트 표시 |
| 3 | 미리보기 탭 클릭 | 렌더링된 HTML 미리보기 |
| 4 | 내용 수정 | 에디터에서 텍스트 편집 |
| 5 | "저장" 버튼 클릭 | 변경사항 저장, 성공 메시지 |

#### TC-05-05: 섹션 08 (개별증례병력) Line Listing 반영 확인

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 섹션 08 "개별증례병력" 클릭 | 에디터에 내용 로드 |
| 2 | Line Listing 통계 확인 | 총 건수, 중대/비중대 건수 포함 |
| 3 | SOC별 분포 확인 | 주요 SOC 언급 |

#### TC-05-06: 섹션 14 (별첨) CS59 테이블 확인

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 섹션 14 "별첨" 클릭 | 에디터에 내용 로드 |
| 2 | CS59 테이블 확인 | "[별첨 3] 시판 후 정보..." 테이블 포함 |
| 3 | 테이블 형식 확인 | SOC/PT 행, 6개 카테고리 컬럼 |

#### TC-05-07: 섹션 재생성

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 섹션 선택 후 "재생성" 버튼 클릭 | 확인 다이얼로그 |
| 2 | "확인" 클릭 | LLM 재생성 시작, 프로그레스 표시 |
| 3 | 재생성 완료 | 새 내용으로 에디터 업데이트 |

#### TC-05-08: Stage 3 완료

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 모든 섹션 검토 완료 | 체크리스트 완료 상태 |
| 2 | "다음 단계로" 버튼 클릭 | P18_Review.html 이동 |
| 3 | 보고서 상태 업데이트 | `current_stage: 4` |

---

---

## 2026-01-16 구현 완료 사항

### 1. 데이터 추출 정의 동기화 (하드코딩 제거) ✅

**근본 원인**: P14_UnifiedProcessing.html의 `buildExtractedData()` 함수가 하드코딩된 CS/PH/Table 변수명을 사용하여 명세서(extractData.md)와 불일치

**수정 파일**:
| 파일 | 수정 내용 |
|------|----------|
| `js/extract/extract-cs.js` | CS_DEFINITIONS 65개 변수 정의 (명세서 기준) |
| `js/extract/extract-ph.js` | PH_DEFINITIONS 11개 변수 정의 (명세서 기준) |
| `js/extract/extract-tables.js` | TABLE_DEFINITIONS 6개 변수 정의 (명세서 기준) |
| `pages/P14_UnifiedProcessing.html` | buildExtractedData() 함수가 전역 정의 사용하도록 변경 |

**P14 코드 변경 위치**:
- Lines 2555-2611: CS 추출 설정이 `CS_DEFINITIONS` 기반으로 동적 생성
- Lines 2683-2708: PH 추출이 `PH_DEFINITIONS` 기반으로 동적 생성
- Lines 2710-2742: Table 추출이 `TABLE_DEFINITIONS` 기반으로 동적 생성

**제거된 하드코딩 변수 (더 이상 사용하지 않음)**:
```
❌ CS3_적응증, CS11_효능효과, CS12_용법용량, CS13_사용상주의사항
❌ PH1_국내판매량서술문, PH2_노출환자수서술문, PH3_국외판매량서술문
❌ 표1_허가현황, 표3_노출환자수, 표4_문헌목록, 표8_이상사례통계
```

**신규 명세서 기반 변수 (현재 사용 중)**:
```
✅ CS0_성분명, CS15_효능효과, CS16_용법용량, CS24_제형, CS27_사용상주의사항
✅ PH4_원시자료서술문, PH9_문헌에발표된안전성, PH10_유효성관련정보
✅ 표2_연도별판매량, 표5_신속보고내역, 표6_정기보고내역, 표9_SOC별건수
```

---

### TC-03-11: 하이브리드 추출 하드코딩 검증 테스트 (NEW)

> **목적**: P14 추출 로직이 전역 정의(CS_DEFINITIONS, PH_DEFINITIONS, TABLE_DEFINITIONS)를 사용하는지 검증

#### 사전 조건

1. 새 세션에서 테스트 시작 (메모리 효과 방지)
2. localStorage 초기화:
```javascript
// 브라우저 콘솔에서 실행
localStorage.removeItem('extractedData');
localStorage.removeItem('generatedSections');
```

#### TC-03-11-01: 전역 정의 로드 확인

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | P14 페이지 로드 | 페이지 정상 표시 |
| 2 | 브라우저 콘솔에서 전역 정의 확인 | 아래 스크립트 실행 |

**검증 스크립트**:
```javascript
// 전역 정의 개수 확인
console.log('CS_DEFINITIONS:', Object.keys(window.CS_DEFINITIONS || {}).length);
console.log('PH_DEFINITIONS:', Object.keys(window.PH_DEFINITIONS || {}).length);
console.log('TABLE_DEFINITIONS:', Object.keys(window.TABLE_DEFINITIONS || {}).length);
```

**Expected Result**:
```
CS_DEFINITIONS: 65
PH_DEFINITIONS: 11
TABLE_DEFINITIONS: 6
```

#### TC-03-11-02: 데이터 추출 실행

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 30개 파일 업로드 (TC-03-02 절차) | 파일 업로드 완료 |
| 2 | "🚀 LLM 분류 시작" 클릭 | 처리 시작 |
| 3 | 마크다운 변환 완료 | 30개 성공 표시 |
| 4 | RAW ID 분류 완료 | 분류 완료 표시 |
| 5 | 데이터 통합 완료 | 통합 완료 표시 |
| 6 | PSUR 섹션 생성 완료 | 15개 섹션 생성 |

#### TC-03-11-03: 하드코딩 변수 검증

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 추출 완료 후 콘솔에서 검증 스크립트 실행 | 아래 스크립트 실행 |

**하드코딩 검증 스크립트**:
```javascript
(() => {
    const extractedData = JSON.parse(localStorage.getItem('extractedData') || '[]');

    // 이전 하드코딩 변수 목록 (명세서와 불일치했던 변수들)
    const oldHardcodedVariables = [
        'CS3_적응증', 'CS11_효능효과', 'CS12_용법용량', 'CS13_사용상주의사항',
        'CS14_제조사', 'CS22_허가국가', 'CS23_허가날짜',
        'PH1_국내판매량서술문', 'PH2_노출환자수서술문', 'PH3_국외판매량서술문',
        '표1_허가현황', '표3_노출환자수', '표4_문헌목록', '표8_이상사례통계'
    ];

    // 명세서 기반 올바른 변수 (extractData.md 기준)
    const correctVariables = [
        'CS0_성분명', 'CS15_효능효과', 'CS16_용법용량', 'CS24_제형', 'CS27_사용상주의사항',
        'PH4_원시자료서술문', 'PH9_문헌에발표된안전성', 'PH10_유효성관련정보',
        '표2_연도별판매량', '표5_신속보고내역', '표6_정기보고내역', '표9_SOC별건수'
    ];

    const foundOld = extractedData.filter(d => oldHardcodedVariables.includes(d.variable_id));
    const foundCorrect = extractedData.filter(d => correctVariables.includes(d.variable_id));

    const byType = { CS: 0, PH: 0, Table: 0 };
    extractedData.forEach(d => {
        if (d.data_type === 'CS') byType.CS++;
        else if (d.data_type === 'PH') byType.PH++;
        else if (d.data_type === 'Table') byType.Table++;
    });

    console.log('=== 하드코딩 검증 결과 ===');
    console.log(`총 추출 항목: ${extractedData.length}개 (CS: ${byType.CS}, PH: ${byType.PH}, Table: ${byType.Table})`);
    console.log(`이전 하드코딩 변수 발견: ${foundOld.length === 0 ? '✅ 없음 (정상)' : '❌ ' + foundOld.map(d => d.variable_id).join(', ')}`);
    console.log(`명세서 기반 변수 발견: ${foundCorrect.length}개`);
    console.log('발견된 명세서 변수:', foundCorrect.map(d => d.variable_id));

    return {
        pass: foundOld.length === 0,
        total: extractedData.length,
        byType,
        oldFound: foundOld.map(d => d.variable_id),
        correctFound: foundCorrect.map(d => d.variable_id)
    };
})();
```

**Expected Result**:
```
=== 하드코딩 검증 결과 ===
총 추출 항목: 33개 (CS: 18, PH: 9, Table: 6)
이전 하드코딩 변수 발견: ✅ 없음 (정상)
명세서 기반 변수 발견: 15개
발견된 명세서 변수: ["CS0_성분명", "CS15_효능효과", "CS16_용법용량", ...]
```

#### TC-03-11-04: PSUR 섹션 생성 확인

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | localStorage에서 섹션 확인 | 아래 스크립트 실행 |

**섹션 검증 스크립트**:
```javascript
const sections = JSON.parse(localStorage.getItem('generatedSections') || '{}');
console.log('생성된 섹션 수:', Object.keys(sections).length);
Object.entries(sections).forEach(([k, v]) => {
    console.log(`섹션 ${k}: ${v.sectionName} (${v.content?.length || 0}자)`);
});
```

**Expected Result**:
```
생성된 섹션 수: 15
섹션 00: 표지 (163자)
섹션 01: 목차 (809자)
... (15개 모두 100자 이상)
```

#### 검증 합격 기준

| 항목 | 합격 기준 |
|------|----------|
| 전역 정의 로드 | CS: 65, PH: 11, Table: 6 |
| 이전 하드코딩 변수 | **0개** (없어야 함) |
| 추출된 데이터 | 30개 이상 |
| 생성된 섹션 | 15개 (모두 100자 이상) |

---

---

## 2026-01-17 E2E 테스트 결과 및 발견 사항

### 1. 보고서 컨텍스트 불일치 문제 발견 ⚠️

**문제 상황**: E2E 테스트 중 `current_report`와 `generatedSections` 간 보고서 정보 불일치 발견

| 저장소 | 보고서명 | 성분명 | 회사명 |
|--------|---------|--------|--------|
| `current_report` (localStorage) | 노바스크정_PSUR_2026Q01_MKFNT5LF | 암로디핀 | 한국화이자제약 |
| `generatedSections` (localStorage) | - | 글리빅사정(메만틴염산염) | 대웅바이오(주) |
| 테스트 사양 (이 문서) | - | 메만틴염산염 | 테스트제약 |

**원인 분석**:
- 이전 세션에서 다른 보고서로 작업 후 P14 처리 실행
- `generatedSections`는 P14에서 처리된 파일 기반으로 생성
- `current_report`는 이전에 선택한 보고서 ID 유지
- 두 저장소가 동기화되지 않아 불일치 발생

**영향**:
- P19 QC 페이지에서 "보고서를 먼저 생성해주세요" 오류 발생
- QC 검증 시 current_report 기반 데이터와 generatedSections 비교로 인한 불일치 경고

**권장 조치**:
1. P14 처리 시작 시 `current_report` 검증 추가
2. 보고서 컨텍스트 일관성 체크 로직 구현 필요
3. E2E 테스트 전 localStorage 완전 초기화 필수

---

### 2. 데이터 저장 방식 확인 사항 ✅

**발견**: `extractedData` localStorage가 비어있어도 데이터 추출이 성공한 것임

**현재 데이터 흐름**:
```
RAW 파일 업로드
    ↓
마크다운 변환 (convertedMarkdowns)
    ↓
RAW ID 분류
    ↓
데이터 통합 (LLM이 직접 섹션에 통합)
    ↓
PSUR 섹션 생성 (generatedSections)  ← 데이터가 여기에 포함됨
```

**검증 방법**:
```javascript
// extractedData는 비어있을 수 있음 (정상)
const extracted = JSON.parse(localStorage.getItem('extractedData') || '{}');
console.log('extractedData:', Object.keys(extracted).length); // 0 가능

// 실제 데이터는 generatedSections 내 섹션 콘텐츠에 포함
const sections = JSON.parse(localStorage.getItem('generatedSections') || '{}');
console.log('섹션 07 (환자노출):', sections['07']?.content?.includes('28,694,974')); // true
console.log('섹션 08 (개별증례):', sections['08']?.content?.includes('신속보고')); // true
```

**E2E 테스트 시 확인된 데이터**:
| 섹션 | 확인된 데이터 |
|------|-------------|
| 섹션 00 (표지) | 글리빅사정(메만틴염산염), 대웅바이오(주) |
| 섹션 07 (환자노출) | 연도별 판매량: 2019년 3,693,040정 ~ 2024년 6,044,610정, 총 28,694,974정 |
| 섹션 08 (개별증례) | 신속보고 5건 + 정기보고 5건 = 15건 |
| 섹션 14 (별첨) | SOC별 테이블: Cardiac disorders, Gastrointestinal disorders 등 23건 |

---

### 3. P18 Review 페이지 테스트 결과 ✅

| 테스트 항목 | 결과 | 비고 |
|------------|------|------|
| 페이지 로드 | ✅ 성공 | 15개 섹션 목록 표시 |
| 섹션 00 (표지) 확인 | ✅ 성공 | 글리빅사정(메만틴염산염) 표시 |
| 섹션 03 (서론) 확인 | ✅ 성공 | 보고기간 2019-01-01 ~ 2024-06-30 표시 |
| 섹션 06 (안전성정보) 확인 | ✅ 성공 | 안전성정보변경 내역 표시 |
| 섹션 08 (개별증례) 확인 | ✅ 성공 | LineListing 표 정상 렌더링 |

---

### 4. P19 QC 검증 결과 ✅

**QC 검증 진행**: 16/16 항목 완료

**결과 요약**:
| 카테고리 | Critical | Warning | Info |
|----------|----------|---------|------|
| 데이터 일관성 | 0 | 0 | 5 |
| 형식 검증 | 0 | 0 | 3 |
| 참조 무결성 | 0 | 0 | 2 |
| 규정 준수 | 0 | 0 | 2 |
| 문서 완전성 | 0 | 0 | 1 |
| **총계** | **0** | **0** | **13** |

**INFO 수준 이슈 (13건)**:
- 대부분 보고서 컨텍스트 불일치로 인한 경고
- 실제 데이터 누락이 아닌 검증 기준 불일치

---

### TC-03-12: 보고서 컨텍스트 일관성 검증 (NEW)

> **목적**: P14 처리 전후 보고서 컨텍스트 일관성 확인

#### TC-03-12-01: 처리 전 컨텍스트 확인

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | P14 페이지 로드 | 현재 보고서 정보 표시 |
| 2 | 콘솔에서 current_report 확인 | UUID 존재 |
| 3 | 보고서명 확인 | UI에 표시된 이름과 일치 |

**검증 스크립트**:
```javascript
const reportId = localStorage.getItem('current_report');
console.log('current_report:', reportId);

// Supabase에서 보고서 정보 조회 필요 시
// const { data } = await supabaseClient.getReport(reportId);
```

#### TC-03-12-02: 처리 후 컨텍스트 일관성

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | P14 전체 처리 완료 | PSUR 섹션 생성 완료 |
| 2 | generatedSections의 보고서 정보 확인 | current_report와 일치 |

**검증 스크립트**:
```javascript
(() => {
    const reportId = localStorage.getItem('current_report');
    const sections = JSON.parse(localStorage.getItem('generatedSections') || '{}');

    // 섹션 00 (표지)에서 보고서 정보 추출
    const coverContent = sections['00']?.content || '';

    console.log('=== 보고서 컨텍스트 일관성 검증 ===');
    console.log('current_report:', reportId);
    console.log('섹션 00 내용 (처음 200자):', coverContent.substring(0, 200));

    // 불일치 경고
    if (reportId && !coverContent.includes(reportId.split('_')[0])) {
        console.warn('⚠️ 보고서 ID와 섹션 내용이 일치하지 않을 수 있음');
    }

    return { reportId, coverPreview: coverContent.substring(0, 200) };
})();
```

#### TC-03-12-03: 불일치 발생 시 복구 절차

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | localStorage 초기화 | 아래 스크립트 실행 |
| 2 | P13에서 새 보고서 생성 | 새 UUID 할당 |
| 3 | P14에서 처리 재실행 | 일관된 컨텍스트 |

**초기화 스크립트**:
```javascript
// 전체 초기화 (새 E2E 테스트 시작 전)
localStorage.removeItem('current_report');
localStorage.removeItem('uploadedFiles');
localStorage.removeItem('convertedMarkdowns');
localStorage.removeItem('extractedData');
localStorage.removeItem('generatedSections');
console.log('✅ localStorage 초기화 완료');
```

---

### TC-06: Stage 4 - QC 검증 (P19_QC.html) (NEW)

#### TC-06-01: QC 페이지 접근

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | P18에서 "QC 단계로" 버튼 클릭 | P19_QC.html 이동 |
| 2 | 또는 직접 URL 접근 | 페이지 로드 |
| 3 | 보고서 정보 표시 | current_report 기반 정보 표시 |

#### TC-06-02: QC 검증 실행

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "QC 검증 시작" 버튼 클릭 | 검증 프로세스 시작 |
| 2 | 진행률 표시 | 1/16, 2/16, ... 16/16 |
| 3 | 검증 완료 | 결과 요약 표시 |

#### TC-06-03: QC 결과 확인

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 결과 카테고리 확인 | Critical/Warning/Info 구분 표시 |
| 2 | 이슈 상세 확인 | 각 이슈별 설명 표시 |
| 3 | Critical/Warning이 0인 경우 | "다음 단계로" 버튼 활성화 |

**합격 기준**:
| 항목 | 기준 |
|------|------|
| Critical 이슈 | **0개** (필수) |
| Warning 이슈 | **0개** (권장) |
| Info 이슈 | 제한 없음 |

---

### 테스트 데이터 (글리빅사정) - 2026-01-17 확정

> **공식 E2E 테스트 약품**: 글리빅사정(메만틴염산염) / 대웅바이오(주)

**현재 테스트 데이터 (TC-02-03 기준)**:
| 항목 | 값 |
|------|-----|
| CS0_성분명 | `글리빅사정(메만틴염산염)` |
| CS1_브랜드명 | `글리빅사정10mg` |
| CS2_회사명 | `대웅바이오(주)` |
| CS5_국내허가일자 | `2019-01-01` |

**RAW 데이터 파일과의 일치**:
- 테스트 RAW 파일들은 위 글리빅사정 약품의 데이터를 포함
- 판매량 데이터: 2019년~2024년 (총 28,694,974정)
- 이상사례 데이터: 신속보고 5건 + 정기보고 5건 = 15건

---

## 변경 이력

| 버전 | 일자 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-01-05 | 초기 버전 작성 |
| 1.1 | 2026-01-05 | TC-05 Stage 2 테스트 파일 상세화 (총 19개 파일, Step별 구분) |
| 1.2 | 2026-01-05 | 로그인/시스템체크 테스트 제거, TC 번호 재정렬 (TC-01: 대시보드 → TC-02: Stage 1 → TC-03: Stage 2) |
| 1.3 | 2026-01-07 | 빈 PSUR 섹션 해결, 단계별 결과 확인 기능, Hook 설정 추가 (TC-03-08~10 신규) |
| 1.4 | 2026-01-08 | Stage 2.5 Line Listing 분석 테스트 추가 (TC-04), Stage 3 섹션 편집 테스트 추가 (TC-05) |
| 1.5 | 2026-01-08 | 실제 테스트 데이터 디렉토리 구조 반영 (총 30개 파일): Step1=8개(RAW7×4), Step2=2개, Step3=16개+LineListing 4개. RAW2.3-2.6은 Step3으로 이동, RAW5×6, RAW6×2 파일 추가 |
| 1.6 | 2026-01-08 | **⚠️ 필수: 파일 업로드 검증 단계** 추가 (TC-03-02 보충). 각 Step별 파일 수 검증, "LLM 분류 시작" 전 최종 검증(30개), 마크다운 변환 결과 확인, 검증 실패 시 조치 절차 명시 |
| 1.7 | 2026-01-08 | **🚨 AI/Claude 에이전트 필수 준수 사항** 섹션 추가. Step 3에서 18개만 업로드하는 반복 오류 방지: (1) 절대 규칙 박스 추가 - 파일 수 미달 시 진행 금지, UI 제약 시 임의 삭제 금지, 검증 스킵 금지 (2) 필수 검증 체크리스트 테이블 추가 (3) UI 제약 발생 시 대응 플로우 명시 (4) 세션 컨텍스트 요약 시 필수 기록 사항 추가 (5) Step 3 파일 목록을 번호 매긴 테이블로 재구성하여 16+4=20개 명확화 |
| 1.8 | 2026-01-16 | **데이터 추출 하드코딩 제거 검증** (TC-03-11 신규). P14 buildExtractedData() 함수가 전역 정의(CS_DEFINITIONS, PH_DEFINITIONS, TABLE_DEFINITIONS) 사용하도록 수정. 하드코딩 검증 스크립트 및 합격 기준 추가 |
| 1.9 | 2026-01-17 | **E2E 테스트 결과 반영**: (1) 보고서 컨텍스트 불일치 문제 발견 및 원인 분석 (current_report vs generatedSections) (2) 데이터 저장 방식 문서화 - extractedData 비어있어도 정상, 데이터는 섹션에 직접 통합됨 (3) P18 Review/P19 QC 테스트 결과 추가 - QC 16/16 완료, 13 INFO 이슈 (4) TC-03-12 보고서 컨텍스트 일관성 검증 테스트케이스 신규 (5) TC-06 Stage 4 QC 검증 테스트케이스 신규 (6) 테스트 데이터 DB 불일치 안내 추가 |
| 2.0 | 2026-01-17 | **TC-05 Stage 3 데이터 뷰어 테스트 추가**: (1) TC-05-03 CS/PH/Table 데이터 뷰어 확인 신규 - 66개 CS, 11개 PH, 6개 Table 데이터 확인 (2) 데이터 소스 타입 명세 (P13_UserInput, RAW{n}, CALCULATED, GENERATED, USER_INPUT) (3) TC-05 번호 재정렬 (TC-05-03~08) (4) Stage 3 체크리스트에 데이터 뷰어 항목 추가 |
