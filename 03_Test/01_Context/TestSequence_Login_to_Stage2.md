# 테스트 시퀀스: 로그인 ~ Stage 2

## 개요

| 항목 | 내용 |
|------|------|
| **테스트 범위** | 로그인 → 시스템체크 → 대시보드 → Stage 1 (새 보고서) → Stage 2 (Raw Data 처리) |
| **테스트 유형** | E2E (End-to-End) 기능 테스트 |
| **대상 환경** | http://localhost:8000 또는 GitHub Pages |

---

## 사전 조건

### 테스트 계정
| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| Master | `main@main.com` | `1111` |
| Author | `author@kpsur.test` | `test1234` |

### 필요 파일 (Stage 2 테스트용)
- PDF 파일 (RAW1_최신첨부문서)
- Excel 파일 (RAW3_시판후sales데이터, RAW4_허가현황)
- Word 파일 (RAW5_안전성조치메일)

### 브라우저 준비
1. localStorage 초기화: `localStorage.clear()`
2. API 키 설정 확인 (GOOGLE_API_KEY)

---

## 테스트 시퀀스

### TC-01: 로그인 (P01_Login.html)

#### TC-01-01: 이메일/비밀번호 로그인 성공
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | `pages/P01_Login.html` 접속 | 로그인 폼 표시 |
| 2 | 이메일: `main@main.com` 입력 | 입력값 표시 |
| 3 | 비밀번호: `1111` 입력 | 마스킹 표시 (●●●●) |
| 4 | "로그인" 버튼 클릭 | 로딩 표시 후 P05_SystemCheck.html 이동 |

#### TC-01-02: 로그인 실패 - 잘못된 비밀번호
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 이메일: `main@main.com` 입력 | - |
| 2 | 비밀번호: `wrongpass` 입력 | - |
| 3 | "로그인" 버튼 클릭 | 에러 메시지: "이메일 또는 비밀번호가 올바르지 않습니다" |

#### TC-01-03: 로그인 실패 - 존재하지 않는 계정
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 이메일: `notexist@test.com` 입력 | - |
| 2 | 비밀번호: `anypass` 입력 | - |
| 3 | "로그인" 버튼 클릭 | 에러 메시지 표시 |

#### TC-01-04: Google OAuth 로그인
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "Google로 로그인" 버튼 클릭 | Google OAuth 페이지로 리다이렉트 |
| 2 | Google 계정 선택/로그인 | P05_SystemCheck.html로 콜백 리다이렉트 |

---

### TC-02: 시스템 체크 (P05_SystemCheck.html)

#### TC-02-01: 시스템 연결 확인
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 페이지 로드 | 자동으로 시스템 체크 시작 |
| 2 | Supabase 연결 확인 | ✅ 체크 완료 표시 |
| 3 | LLM API 연결 확인 | ✅ 체크 완료 (API 키 설정된 경우) |
| 4 | 세션 유효성 확인 | ✅ 체크 완료 |
| 5 | 모든 체크 완료 | "대시보드로 이동" 버튼 활성화 |

#### TC-02-02: API 키 미설정 시
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | API 키 없이 페이지 로드 | LLM API: ⚠️ 경고 표시 |
| 2 | "설정 페이지로 이동" 링크 표시 | 클릭 시 P91_Settings.html 이동 |

---

### TC-03: 대시보드 (P10_Dashboard.html)

#### TC-03-01: 대시보드 초기 로드
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 페이지 로드 | 사용자 정보 표시 (이름, 역할) |
| 2 | 사이드바 메뉴 표시 | 대시보드, 보고서 목록, 설정 등 |
| 3 | 통계 카드 표시 | 총 보고서 수, 진행중, 완료 등 |
| 4 | 최근 보고서 목록 | 최신 5개 보고서 표시 |

#### TC-03-02: 새 보고서 생성 버튼
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | "새 보고서 생성" 버튼 확인 | Author 이상 역할만 표시 |
| 2 | 버튼 클릭 | P13_NewReport.html 이동 |

#### TC-03-03: 권한별 메뉴 표시
| 역할 | 표시 메뉴 |
|------|----------|
| Master | 모든 메뉴 (사용자 관리, 시스템 설정 포함) |
| Author | 보고서 작성/편집 메뉴 |
| Reviewer | 리뷰/QC 메뉴 |
| Viewer | 조회 메뉴만 |

---

### TC-04: Stage 1 - 새 보고서 생성 (P13_NewReport.html)

#### TC-04-01: 폼 초기 상태
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 페이지 로드 | 빈 폼 표시 |
| 2 | 필수 필드 확인 | `*` 표시된 필드 확인 |
| 3 | 기본값 확인 | MedDRA 버전 등 기본값 설정 |

#### TC-04-02: 보고서 기본 정보 입력
| 필드 | 입력값 예시 | 유효성 |
|------|------------|--------|
| 보고서명 | `TestReport_YYMMDD` | 필수, 중복 불가 |
| 제출일 | `2026-01-05` | 필수, 날짜 형식 |
| 버전 | `1.0` | 필수 |
| 유효기간 시작 | `2025-01-01` | 필수 |
| 유효기간 종료 | `2025-12-31` | 필수, 시작일 이후 |

#### TC-04-03: CS 데이터 입력 (필수 항목)
| CS ID | 항목명 | 입력값 예시 |
|-------|--------|------------|
| CS0 | 성분명 | `Aspirin` |
| CS1 | 브랜드명 | `아스피린정100mg` |
| CS2 | 회사명 | `테스트제약` |
| CS5 | 국내허가일자 | `2020-01-15` |
| CS20 | 1일사용량 | `100` |
| CS21 | 환자1명당사용량 | `365` |
| CS24 | MedDRA 버전 | `27.0` |

#### TC-04-04: 보고서 생성 실행
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 모든 필수 필드 입력 완료 | "생성" 버튼 활성화 |
| 2 | "생성" 버튼 클릭 | 로딩 표시 |
| 3 | Supabase에 보고서 생성 | 성공 메시지 |
| 4 | localStorage에 report_id 저장 | `current_report` 키에 UUID 저장 |
| 5 | P14_Stage2_Processing.html 이동 | Stage 2 페이지 표시 |

#### TC-04-05: 유효성 검사 실패
| 케이스 | Expected Result |
|--------|-----------------|
| 필수 필드 누락 | "필수 항목을 입력해주세요" 메시지 |
| 유효기간 종료 < 시작 | "종료일이 시작일보다 빨릅니다" 메시지 |
| 중복 보고서명 | "이미 존재하는 보고서명입니다" 메시지 |

---

### TC-05: Stage 2 - Raw Data 처리 (P14_Stage2_Processing.html)

#### TC-05-01: 페이지 초기 상태
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 페이지 로드 | Stage 2 배지 표시 |
| 2 | 보고서 정보 표시 | 현재 보고서명, 진행 상태 |
| 3 | 파일 업로드 영역 | 드래그앤드롭 존 표시 |
| 4 | 프로세스 단계 표시 | 업로드 → MD변환 → 데이터추출 |

#### TC-05-02: 파일 업로드
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 업로드 영역 클릭 | 파일 선택 다이얼로그 |
| 2 | PDF 파일 선택 | 파일 목록에 추가 |
| 3 | 드래그앤드롭 | 파일 목록에 추가 |
| 4 | 여러 파일 선택 | 복수 파일 표시 |

#### TC-05-03: RAW ID 자동 분류
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 파일 업로드 완료 | LLM 자동 분류 시작 |
| 2 | 분류 진행 | 프로그레스바 표시 |
| 3 | 분류 완료 | 각 파일에 RAW ID 태그 표시 |

**RAW ID 분류 예시:**
| 파일명 | 자동 분류 RAW ID |
|--------|-----------------|
| `최신첨부문서_아스피린.pdf` | RAW1 |
| `판매데이터_2025.xlsx` | RAW3 |
| `허가현황_국가별.xlsx` | RAW4 |
| `안전성조치_메일.docx` | RAW5 |

#### TC-05-04: RAW ID 수동 수정
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 파일의 RAW ID 드롭다운 클릭 | RAW ID 목록 표시 |
| 2 | 다른 RAW ID 선택 | 즉시 변경 적용 |
| 3 | 변경 내용 저장 | localStorage 업데이트 |

#### TC-05-05: Markdown 변환
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

#### TC-05-06: 데이터 추출
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

#### TC-05-07: Stage 2 완료
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

### 로그인 (TC-01)
- [ ] 정상 로그인 성공
- [ ] 잘못된 비밀번호 에러
- [ ] 존재하지 않는 계정 에러
- [ ] Google OAuth 로그인

### 시스템 체크 (TC-02)
- [ ] Supabase 연결 확인
- [ ] LLM API 연결 확인
- [ ] 세션 유효성 확인

### 대시보드 (TC-03)
- [ ] 사용자 정보 표시
- [ ] 통계 카드 표시
- [ ] 권한별 메뉴 표시

### Stage 1 (TC-04)
- [ ] 필수 필드 입력
- [ ] CS 데이터 입력
- [ ] 보고서 생성 성공
- [ ] 유효성 검사

### Stage 2 (TC-05)
- [ ] 파일 업로드
- [ ] RAW ID 자동 분류
- [ ] RAW ID 수동 수정
- [ ] Markdown 변환
- [ ] 데이터 추출
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

*문서 버전: 1.0*
*작성일: 2026-01-05*
*대상 시스템: KPSUR AGENT v1.0*
