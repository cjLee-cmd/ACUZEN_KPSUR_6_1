# E2E 테스트: GitHub Pages 웹 환경

## 개요

| 항목 | 내용 |
|------|------|
| **테스트 URL** | https://cjlee-cmd.github.io/ACUZEN_KPSUR_6_1/ |
| **테스트 유형** | E2E (End-to-End) 웹 UI 테스트 |
| **테스트 도구** | Chrome DevTools MCP |
| **테스트 범위** | Login → Dashboard → Stage 1 → Stage 2 → Stage 3 |
| **테스트 약품** | 아일리아주 (애플리버셉트) - 바이엘코리아(주) |

---

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| **Master** | `main@main.com` | `1111` |
| Author | `author@kpsur.test` | `test1234` |

---

## 테스트 시퀀스

### Phase 1: 로그인 및 대시보드

#### TC-01: 로그인 (P01_Login.html)

```
URL: https://cjlee-cmd.github.io/ACUZEN_KPSUR_6_1/pages/P01_Login.html
```

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 페이지 접속 | 로그인 폼 표시 |
| 2 | 이메일 입력: `main@main.com` | 입력 완료 |
| 3 | 비밀번호 입력: `1111` | 입력 완료 |
| 4 | "로그인" 버튼 클릭 | Dashboard로 이동 |

#### TC-02: 대시보드 (P10_Dashboard.html)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 대시보드 로드 확인 | 사용자 정보 표시 (Master Admin) |
| 2 | "새 보고서 생성" 버튼 클릭 | P13_NewReport.html 이동 |

---

### Phase 2: Stage 1 - 새 보고서 생성

#### TC-03: 새 보고서 생성 (P13_NewReport.html)

**필수 입력 데이터:**

| 필드명 | ID | 입력값 |
|--------|-----|--------|
| 약물 검색 | `drugSearch` | 아일리아 (검색 후 선택) |
| MedDRA 버전 | `meddra_version` | 27.1 |
| 원시자료신청일 | `raw_data_request_date` | 2025-06-30 |
| 문헌DB | `literature_db` | PubMed, Embase, Cochrane Library |
| 유효기간 | `expiry_date` | 2028-12-31 |
| 최초허가일자 | `first_approval_date` | 2014-09-24 |
| 최초허가국가 | (select) | 대한민국 |
| 작성자명 | `author_name` | 테스트작성자 |
| 작성자직책 | `author_position` | 약물감시담당자 |

**보고 기간 설정:**

| 필드 | 값 |
|------|-----|
| 보고시작연도 | 2023 |
| 보고시작월 | 01 |
| 보고시작일 | 01 |
| 보고종료연도 | 2025 |
| 보고종료월 | 12 |
| 보고종료일 | 31 |
| 보고서제출연도 | 2026 |
| 보고서제출월 | 01 |
| 보고서제출일 | 31 |
| 보고주기 | 5년 |

**브라우저 콘솔 스크립트 (자동 입력):**

```javascript
// P13 테스트 데이터 자동 입력
(function() {
    const inputs = {
        'meddra_version': '27.1',
        'raw_data_request_date': '2025-06-30',
        'literature_db': 'PubMed, Embase, Cochrane Library',
        'expiry_date': '2028-12-31',
        'first_approval_date': '2014-09-24',
        'author_name': '테스트작성자',
        'author_position': '약물감시담당자'
    };

    Object.entries(inputs).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`✅ ${id} = ${value}`);
        }
    });

    // 약물 검색
    const search = document.getElementById('drugSearch');
    if (search) {
        search.value = '아일리아';
        search.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => {
            const item = document.querySelector('.drug-item');
            if (item) item.click();
        }, 500);
    }

    // Select 박스 설정
    const selects = {
        'start_year': '2023', 'start_month': '01', 'start_day': '01',
        'end_year': '2025', 'end_month': '12', 'end_day': '31',
        'submit_year': '2026', 'submit_month': '01', 'submit_day': '31',
        'report_cycle': '5년'
    };

    Object.entries(selects).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    console.log('🎯 P13 테스트 데이터 입력 완료');
})();
```

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 페이지 로드 | 빈 폼 표시 |
| 2 | 콘솔에서 스크립트 실행 | 모든 필드 자동 채움 |
| 3 | 아일리아 약물 선택 확인 | 약물 정보 표시 |
| 4 | "보고서 생성" 버튼 클릭 | P14_UnifiedProcessing.html 이동 |

---

### Phase 3: Stage 2 - 파일 업로드 및 처리

#### TC-04: 통합 처리 (P14_UnifiedProcessing.html)

> **중요**: GitHub Pages 환경에서는 파일 업로드가 로컬 파일 시스템에서 수동으로 이루어져야 합니다.

**Step 1 of 3 - 제품정보 (6개 파일)**

| 업로드 존 | 파일명 | RAW ID |
|----------|--------|--------|
| 보고기간 시작시점 | 사용상의주의사항_아일리아2018년.pdf | RAW2.6 |
| | 아일리아_용법용량.pdf | RAW2.5 |
| | 아일리아_효능효과.pdf | RAW2.4 |
| 보고기간 종료시점 | 아일리아_사용상의주의사항_2025년.pdf | RAW2.3 |
| | 아일리아_용법용량.pdf | RAW2.1 |
| | 아일리아_효능효과.pdf | RAW2.2 |

**Step 2 of 3 - 임상 자료 (4개 파일)**

| 업로드 존 | 파일명 | RAW ID |
|----------|--------|--------|
| Sponsored 임상 | 아일리아_NIS-IIT_Tracker_완성본.xlsx | RAW17 |
| 기타임상 | 임상노출데이터_아일리아.docx | RAW8 |
| | 임상시험_안전성_1.pdf | RAW10 |
| | 임상시험에서의 안전성데이터2_아일리아.txt | RAW10 |

**Step 3 of 3 - 기타 자료 (11개 파일)**

| 파일명 | RAW ID |
|--------|--------|
| Distribution_Tracker_2015-2025_Vial_아일리아.xlsx | RAW3 |
| 허가현황_전체_아일리아.xlsx | RAW4 |
| 규제당국 안전성조치_아일리아.docx | RAW5 |
| 허가팀 메일 _제품정보 변경.docx | RAW7 |
| 사용상의주의사항_변경내용상세_비교자료.pdf | RAW7 |
| 사용상의주의사항_변경내용상세_비교자료_아일리아18~25.pdf | RAW7 |
| 아일리아_문헌자료_완성본.xlsx | RAW9 |
| MedDRA_SMQ_lack_of_efficacy.xlsx | RAW16 |
| 아일리아_통합LineListing.xlsx | RAW19 |
| CS0_성분명,CS1_브랜드명... 정보.xlsx | 참조용 |
| 기본정보_성분명브랜드명_아일리아... 등.docx | 참조용 |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Step 1 파일 업로드 (6개) | 파일 목록 표시 |
| 2 | "다음" 클릭 | Step 2로 이동 |
| 3 | Step 2 파일 업로드 (4개) | 파일 목록 표시 |
| 4 | "다음" 클릭 | Step 3으로 이동 |
| 5 | Step 3 파일 업로드 (11개) | 파일 목록 표시 |
| 6 | "LLM 분류 시작" 클릭 | RAW ID 자동 분류 |
| 7 | 분류 결과 확인 | 21개 파일 모두 분류됨 |
| 8 | "MD 변환 시작" 클릭 | 마크다운 변환 진행 |
| 9 | "데이터 추출 시작" 클릭 | CS/PH/Table 추출 |
| 10 | "Stage 3으로 이동" 클릭 | P15_SectionEditor.html 이동 |

---

### Phase 4: Stage 3 - 데이터 검증

#### TC-05: 섹션 에디터 (P15_SectionEditor.html)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 페이지 로드 | 15개 섹션 목록 표시 |
| 2 | CS 데이터 뷰어 열기 | CS 변수 목록 표시 |
| 3 | PH 데이터 뷰어 열기 | PH 변수 목록 표시 |
| 4 | Table 데이터 뷰어 열기 | 표 데이터 목록 표시 |

---

## 데이터 검증 체크리스트

### CS 데이터 (필수 확인)

| Variable ID | 예상값 | 확인 |
|-------------|--------|------|
| CS0_성분명 | 애플리버셉트 | ☐ |
| CS1_브랜드명 | 아일리아주 | ☐ |
| CS2_회사명 | 바이엘코리아(주) | ☐ |
| CS3_보고시작날짜 | 2023-01-01 | ☐ |
| CS4_보고종료날짜 | 2025-12-31 | ☐ |
| CS21_환자1명당사용량 | 8 Vials/년 | ☐ |
| CS22_연평균판매량 | 계산값 확인 | ☐ |
| CS23_연평균환자노출 | 계산값 확인 | ☐ |
| CS24_MedDRA버전넘버 | 27.1 | ☐ |

### 표 데이터 (필수 확인)

| 표 ID | 내용 | 확인 |
|-------|------|------|
| 표2_연도별판매량 | 10년 판매 데이터 | ☐ |
| 표3_연평균환자노출 | 환자노출 계산 테이블 | ☐ |
| 표5_신속보고내역 | 신속보고 LineListing | ☐ |
| 표6_정기보고내역 | 정기보고 LineListing | ☐ |

---

## 미추출 판단 기준

> **다음 패턴은 모두 "미추출"로 분류:**

```
❌ PLACEHOLDER
❌ 빈 값, null, undefined
❌ "[...] - 필요" 형태의 설명문
❌ "LLM 추출 필요" 포함 텍스트
❌ "계산 필요" 포함 텍스트
❌ "사용자 입력 필요" 포함 텍스트
❌ N/A, -
```

---

## Chrome DevTools MCP 명령어 참조

### 페이지 이동
```
mcp__chrome-devtools__navigate_page(url="https://...")
mcp__chrome-devtools__navigate_page(type="reload", ignoreCache=true)
```

### 스냅샷 및 스크린샷
```
mcp__chrome-devtools__take_snapshot()
mcp__chrome-devtools__take_screenshot()
```

### 요소 조작
```
mcp__chrome-devtools__click(uid="...")
mcp__chrome-devtools__fill(uid="...", value="...")
mcp__chrome-devtools__fill_form(elements=[...])
```

### JavaScript 실행
```
mcp__chrome-devtools__evaluate_script(function="() => { ... }")
```

---

## 테스트 결과 템플릿

```markdown
## E2E 테스트 결과 - [날짜]

### 환경
- URL: https://cjlee-cmd.github.io/ACUZEN_KPSUR_6_1/
- 브라우저: Chrome
- 테스트 계정: main@main.com

### 결과 요약
| Phase | 테스트 케이스 | 결과 |
|-------|--------------|------|
| 1 | TC-01 로그인 | ✅/❌ |
| 1 | TC-02 대시보드 | ✅/❌ |
| 2 | TC-03 새 보고서 | ✅/❌ |
| 3 | TC-04 통합 처리 | ✅/❌ |
| 4 | TC-05 데이터 검증 | ✅/❌ |

### 이슈
1. [이슈 설명]

### 스크린샷
[첨부]
```

---

## 버전 정보

| 항목 | 값 |
|------|-----|
| 문서 버전 | 1.0 |
| 작성일 | 2026-01-24 |
| 앱 버전 | v.0.8.13 |
| 기본 LLM | Gemini 3 Flash Preview |
