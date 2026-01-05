# KPSUR Supabase Database Schema

> KPSUR (Korean PSUR Agent) - 의약품 정기안전성업데이트보고서 자동화 시스템

## 1. 개요

### 프로젝트 정보
| 항목 | 값 |
|------|-----|
| **Supabase Project ID** | `toelnxgizxwbdikskmxa` |
| **Project URL** | `https://toelnxgizxwbdikskmxa.supabase.co` |
| **스키마 버전** | v1.0 (2025.01) |

### 마이그레이션 파일
- `migrations/001_initial_schema.sql` - 전체 스키마 정의
- `migrations/000_reset_database.sql` - 데이터베이스 초기화
- `migrations/add_position_to_users.sql` - 사용자 직책 필드 추가

---

## 2. 테이블 목록

| # | 테이블명 | 설명 | 레코드 타입 |
|---|----------|------|-------------|
| 1 | `users` | 사용자 인증 및 권한 관리 | Master Data |
| 2 | `products` | 약품 마스터 정보 | Master Data |
| 3 | `reports` | 보고서 메타데이터 및 상태 | Transaction |
| 4 | `source_documents` | 업로드된 원본 소스 문서 | Transaction |
| 5 | `markdown_documents` | 마크다운 변환된 문서 | Transaction |
| 6 | `extracted_data` | 추출된 CS/PH/Table 데이터 | Transaction |
| 7 | `report_sections` | 섹션별 생성된 보고서 | Transaction |
| 8 | `review_changes` | 리뷰 단계 수정 내역 | Log |
| 9 | `llm_dialogs` | LLM 대화 로그 | Log |
| 10 | `file_matching_table` | 파일-RAW ID 매칭 | Transaction |
| 11 | `system_settings` | 시스템 설정 | Config |

---

## 3. 테이블 상세

### 3.1 users (사용자)

사용자 인증 및 권한을 관리하는 테이블

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(255) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  name varchar(100) NOT NULL,
  position varchar(100),                    -- 직책 (선택)
  role varchar(20) NOT NULL
    CHECK (role IN ('Master', 'Author', 'Reviewer', 'Viewer')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**인덱스**
- `idx_users_email` - 이메일 검색
- `idx_users_role` - 역할별 필터링

**역할 권한**
| 역할 | 설명 | 권한 |
|------|------|------|
| Master | 시스템 관리자 | 전체 접근, 사용자 관리, 설정 변경 |
| Author | 보고서 작성자 | 보고서 생성/수정, 파일 업로드 |
| Reviewer | 검토자 | 보고서 조회, 리뷰 코멘트 |
| Viewer | 조회자 | 읽기 전용 |

**테스트 계정**
| 이메일 | 비밀번호 | 역할 |
|--------|----------|------|
| `main@main.com` | `1111` | Master |
| `master@kpsur.test` | `master123` | Master |
| `author@kpsur.test` | `test1234` | Author |
| `reviewer@kpsur.test` | `test1234` | Reviewer |
| `viewer@kpsur.test` | `test1234` | Viewer |

---

### 3.2 products (약품)

의약품 마스터 정보를 관리하는 테이블

```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 기본 정보
  product_name varchar(200) UNIQUE NOT NULL,      -- CS1_브랜드명
  ingredient_name varchar(200) NOT NULL,          -- CS0_성분명
  company_name varchar(200) NOT NULL,             -- CS2_회사명

  -- 허가 정보
  domestic_approval_date date NOT NULL,           -- CS5_국내허가일자

  -- 용량/사용량 정보
  shelf_life_months int NOT NULL,                 -- 유효기간 (개월)
  daily_dosage decimal(10, 2),                    -- CS20_1일사용량
  annual_usage_per_patient decimal(10, 2),        -- CS21_환자1명당사용량
  meddra_version varchar(20),                     -- CS24_MedDRA버전넘버

  -- 메타데이터
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**인덱스**
- `idx_products_name` - 제품명 검색
- `idx_products_company` - 회사별 조회
- `idx_products_active` - 활성 제품 필터

---

### 3.3 reports (보고서)

PSUR 보고서의 메타데이터와 워크플로우 상태를 관리

```sql
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_name varchar(255) UNIQUE NOT NULL,
  product_id uuid REFERENCES products(id),
  created_by uuid REFERENCES users(id) NOT NULL,

  -- 상태 관리
  status varchar(20) NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'InReview', 'QC', 'Completed')),
  current_stage int DEFAULT 1,                    -- 1~9 단계

  -- 사용자 입력 데이터
  user_inputs jsonb,                              -- CS0~CS24 모든 변수 저장

  -- QC 설정
  qc_model varchar(100) DEFAULT 'gemini-2.0-flash-thinking',
  qc_precision_mode boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**인덱스**
- `idx_reports_status` - 상태별 필터링
- `idx_reports_created_by` - 작성자별 조회
- `idx_reports_product` - 제품별 조회

**상태 흐름**
```
Draft → InReview → QC → Completed
```

**워크플로우 단계 (current_stage)**
| 단계 | 설명 | 페이지 |
|------|------|--------|
| 1 | 로그인 | P01_Login |
| 2 | 보고서 설정 | P13_NewReport |
| 3 | 파일 업로드 | P14_FileUpload |
| 4 | 마크다운 변환 | P15_MarkdownConversion |
| 5 | 데이터 추출 | P16_DataExtraction |
| 6 | 템플릿 작성 | P17_TemplateWriting |
| 7 | 리뷰 | P18_Review |
| 8 | QC 검증 | P19_QC |
| 9 | 최종 출력 | P20_Output |

---

### 3.4 source_documents (원본 문서)

업로드된 원본 소스 문서 메타데이터

```sql
CREATE TABLE source_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  original_filename varchar(255) NOT NULL,
  raw_id varchar(20) NOT NULL,                    -- RAW1, RAW2.1, RAW3 등
  file_type varchar(10) NOT NULL
    CHECK (file_type IN ('pdf', 'xlsx', 'docx', 'txt')),
  file_path text NOT NULL,                        -- Supabase Storage 경로
  file_size bigint,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
```

**인덱스**
- `idx_source_docs_report` - 보고서별 조회
- `idx_source_docs_raw_id` - RAW ID별 필터링

**RAW ID 분류**
| RAW ID | 문서 유형 |
|--------|-----------|
| RAW1 | 최신첨부문서 |
| RAW2.1 | 용법용량 |
| RAW2.2 | 효능효과 |
| RAW2.3 | 사용상의주의사항 |
| RAW3 | 시판후 Sales 데이터 |
| RAW4 | 허가현황 |
| RAW5 | 안전성조치 관련 메일 |
| RAW6 | 안전성조치 변경사항 |
| RAW7 | 기타 안전성 문서 |
| RAW12 | LineListing - 신속보고 |
| RAW13 | LineListing - 정기보고 |
| RAW14 | LineListing - 원시자료 |
| RAW15 | 기타 LineListing |

---

### 3.5 markdown_documents (마크다운 문서)

PDF/Excel/Word에서 변환된 마크다운 문서

```sql
CREATE TABLE markdown_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_document_id uuid REFERENCES source_documents(id) ON DELETE CASCADE NOT NULL,
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  raw_id varchar(20) NOT NULL,
  markdown_content text NOT NULL,
  file_path text,                                 -- Storage 백업 경로
  converted_by varchar(50),                       -- 변환에 사용된 모델명
  created_at timestamptz DEFAULT now()
);
```

**인덱스**
- `idx_markdown_docs_report` - 보고서별 조회
- `idx_markdown_docs_source` - 원본 문서 참조

---

### 3.6 extracted_data (추출 데이터)

마크다운에서 추출된 CS/PH/Table 데이터

```sql
CREATE TABLE extracted_data (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  data_type varchar(10) NOT NULL
    CHECK (data_type IN ('CS', 'PH', 'Table')),
  variable_id varchar(50) NOT NULL,               -- CS0, CS1, PH4, 표2 등
  variable_name varchar(100),                     -- 한글 변수명
  data_value text,                                -- 추출된 값
  source_raw_id varchar(20),                      -- 원본 RAW ID
  extracted_from uuid REFERENCES markdown_documents(id) ON DELETE SET NULL,
  extracted_by varchar(50),                       -- 추출 모델명
  validation_status varchar(20) DEFAULT 'Pending'
    CHECK (validation_status IN ('Pending', 'Validated', 'Conflict')),
  created_at timestamptz DEFAULT now()
);
```

**인덱스**
- `idx_extracted_data_report_variable` - 보고서+변수 조회
- `idx_extracted_data_type` - 데이터 타입별 필터링

**데이터 타입**
| 타입 | 설명 | 변수 수 | 예시 |
|------|------|---------|------|
| CS | Clinical Summary (단일값) | ~60개 | CS0_성분명, CS1_브랜드명, CS5_국내허가일자 |
| PH | Pharmacovigilance (서술문) | ~10개 | PH4_원시자료서술문, PH11_총괄평가문 |
| Table | 구조화 테이블 | 7~9개 | 표2_연도별판매량, 표5_신속보고내역 |

---

### 3.7 report_sections (보고서 섹션)

생성된 PSUR 보고서 섹션 내용

```sql
CREATE TABLE report_sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  section_number varchar(10) NOT NULL,            -- "00", "01", "09" 등
  section_name varchar(100) NOT NULL,
  content_markdown text,                          -- 생성된 마크다운
  content_final text,                             -- 최종 승인 내용
  version int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**인덱스**
- `idx_report_section` (UNIQUE) - 보고서+섹션번호 조합

**PSUR 섹션 목록 (15개)**
| 번호 | 섹션명 (한글) | 섹션명 (영문) |
|------|---------------|---------------|
| 00 | 표지 | Cover |
| 01 | 목차 | Table of Contents |
| 02 | 약어설명 | Abbreviations |
| 03 | 서론 | Introduction |
| 04 | 전세계판매허가현황 | Global Approval Status |
| 05 | 안전성조치 | Safety Measures |
| 06 | 안전성정보참고정보변경 | Safety Info Changes |
| 07 | 환자노출 | Patient Exposure |
| 08 | 개별증례병력 | Case Histories |
| 09 | 시험 | Studies |
| 10 | 기타정보 | Other Information |
| 11 | 종합적인안전성평가 | Overall Safety Assessment |
| 12 | 결론 | Conclusion |
| 13 | 참고문헌 | References |
| 14 | 별첨 | Appendices |

---

### 3.8 review_changes (리뷰 변경)

리뷰 단계에서의 수정 이력 추적

```sql
CREATE TABLE review_changes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  section_id uuid REFERENCES report_sections(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES users(id) NOT NULL,
  content_before text,
  content_after text,
  change_type varchar(20)
    CHECK (change_type IN ('Edit', 'Add', 'Delete')),
  comment text,                                   -- 변경 사유
  created_at timestamptz DEFAULT now()
);
```

**인덱스**
- `idx_review_changes_report` - 보고서별 변경 이력
- `idx_review_changes_section` - 섹션별 변경 이력

---

### 3.9 llm_dialogs (LLM 대화 로그)

모든 LLM API 호출 기록 (비용 추적 포함)

```sql
CREATE TABLE llm_dialogs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE,
  stage varchar(50),                              -- classify, convert, extract 등
  model_name varchar(50),                         -- gemini-2.0-flash, claude-opus 등
  user_message text,                              -- 프롬프트
  assistant_message text,                         -- 응답

  -- 토큰 및 비용 추적
  input_tokens int,
  output_tokens int,
  total_tokens int,
  estimated_cost_usd decimal(10, 6),
  actual_duration_ms int,

  created_at timestamptz DEFAULT now()
);
```

**인덱스**
- `idx_llm_dialogs_report` - 보고서별 대화 로그
- `idx_llm_dialogs_stage` - 단계별 필터링
- `idx_llm_dialogs_cost` - 비용 분석
- `idx_llm_dialogs_tokens` - 토큰 사용량 분석

**Stage 값**
| Stage | 설명 |
|-------|------|
| classify | 파일 분류 (RAW ID 매칭) |
| convert | 마크다운 변환 |
| extract | 데이터 추출 |
| template_write | 템플릿 작성 |
| review | 리뷰 보조 |
| qc | QC 검증 |

---

### 3.10 file_matching_table (파일 매칭)

업로드된 파일과 RAW ID 매칭 정보

```sql
CREATE TABLE file_matching_table (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  original_filename varchar(255) NOT NULL,
  assigned_raw_id varchar(20) NOT NULL,
  confidence_score decimal(3,2),                  -- 0.00~1.00
  classified_by varchar(50),                      -- 분류 모델/사용자
  file_path text,
  created_at timestamptz DEFAULT now()
);
```

**인덱스**
- `idx_file_matching_report` - 보고서별 파일 매칭

---

### 3.11 system_settings (시스템 설정)

시스템 전역 설정 (JSON 형태)

```sql
CREATE TABLE system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key varchar(100) UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now()
);
```

**인덱스**
- `idx_system_settings_key` - 설정 키 검색

**기본 설정값**
```json
{
  "default_llm_models": {
    "classify": "gemini-2.0-flash",
    "convert": "gemini-2.0-flash",
    "extract": "gemini-2.0-flash",
    "qc": "gemini-2.0-flash-thinking"
  },
  "qc_precision_mode": true,
  "file_size_limits": {
    "max_file_size_mb": 50,
    "max_total_size_mb": 500
  },
  "conversion_timeout_seconds": 150
}
```

---

## 4. 테이블 관계도 (ERD)

```
┌─────────────┐
│   users     │
└──────┬──────┘
       │ 1:N
       ├──────────────────────────────────────────────────────┐
       │                                                      │
       ▼                                                      ▼
┌─────────────┐    1:N    ┌─────────────┐    1:N    ┌─────────────────┐
│  products   │◄──────────│   reports   │──────────►│ source_documents│
└─────────────┘           └──────┬──────┘           └────────┬────────┘
                                 │                           │
                                 │ 1:N                       │ 1:N
       ┌─────────────────────────┼───────────────────────────┤
       │                         │                           │
       ▼                         ▼                           ▼
┌──────────────┐    ┌────────────────────┐    ┌─────────────────────┐
│ llm_dialogs  │    │  extracted_data    │    │ markdown_documents  │
└──────────────┘    └────────────────────┘    └─────────────────────┘
                                 ▲
                                 │ N:1
       ┌─────────────────────────┘
       │
       │            ┌─────────────────────┐
       │            │  report_sections    │
       │            └──────────┬──────────┘
       │                       │ 1:N
       │                       ▼
       │            ┌─────────────────────┐
       │            │  review_changes     │
       │            └─────────────────────┘
       │
       │            ┌─────────────────────┐
       └───────────►│ file_matching_table │
                    └─────────────────────┘

┌─────────────────┐
│ system_settings │  (독립 테이블)
└─────────────────┘
```

### 관계 요약

| 부모 테이블 | 자식 테이블 | 관계 | ON DELETE |
|-------------|-------------|------|-----------|
| users | products | 1:N | SET NULL |
| users | reports | 1:N | RESTRICT |
| users | source_documents | 1:N | SET NULL |
| users | review_changes | 1:N | RESTRICT |
| products | reports | 1:N | SET NULL |
| reports | source_documents | 1:N | CASCADE |
| reports | markdown_documents | 1:N | CASCADE |
| reports | extracted_data | 1:N | CASCADE |
| reports | report_sections | 1:N | CASCADE |
| reports | review_changes | 1:N | CASCADE |
| reports | llm_dialogs | 1:N | CASCADE |
| reports | file_matching_table | 1:N | CASCADE |
| source_documents | markdown_documents | 1:N | CASCADE |
| markdown_documents | extracted_data | 1:N | SET NULL |
| report_sections | review_changes | 1:N | CASCADE |

---

## 5. Row Level Security (RLS)

모든 테이블에 RLS가 활성화되어 있습니다.

### 공통 헬퍼 함수
```sql
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text SECURITY DEFINER AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql;
```

### 주요 정책

| 테이블 | SELECT | INSERT/UPDATE/DELETE |
|--------|--------|---------------------|
| users | 본인 또는 Master | Master만 |
| products | 모든 사용자 (is_active=true) | Master만 |
| reports | 작성자, Reviewer, Master | 작성자 또는 Master |
| source_documents | 보고서 접근 권한 기반 | 보고서 작성자 또는 Master |
| report_sections | 보고서 접근 권한 기반 | 보고서 작성자 또는 Master |
| system_settings | 모든 사용자 | Master만 |

---

## 6. JavaScript 클라이언트 (supabase-client.js)

### 주요 메서드

#### 인증
```javascript
supabaseClient.signInWithPassword(email, password)
supabaseClient.signOut()
supabaseClient.getSession()
```

#### Reports CRUD
```javascript
supabaseClient.getReports(userId)
supabaseClient.getReportById(reportId)
supabaseClient.createReport(reportData)
supabaseClient.updateReport(reportId, updates)
```

#### Sections CRUD
```javascript
supabaseClient.getSection(reportId, sectionNumber)
supabaseClient.getSections(reportId)
supabaseClient.upsertSection(reportId, sectionNumber, data)
supabaseClient.bulkUpsertSections(reportId, sections)
```

#### Source Documents
```javascript
supabaseClient.getSourceDocuments(reportId)
supabaseClient.createSourceDocument(reportId, data)
supabaseClient.bulkCreateSourceDocuments(reportId, documents)
```

#### Extracted Data
```javascript
supabaseClient.getExtractedData(reportId, dataType)
supabaseClient.upsertExtractedData(reportId, dataType, data)
supabaseClient.bulkUpsertExtractedData(reportId, items)
```

#### LLM Dialogs
```javascript
supabaseClient.createLLMDialog(reportId, data)
supabaseClient.getLLMDialogs(reportId)
supabaseClient.getLLMCostStats(reportId)
```

---

## 7. Storage Buckets

| Bucket | 용도 |
|--------|------|
| `reports` | 원본 소스 문서 업로드 |
| `markdown` | 변환된 마크다운 문서 백업 |
| `outputs` | 생성된 Word 문서 |

---

## 8. 요약 통계

| 항목 | 수량 |
|------|------|
| 테이블 | 11개 |
| 인덱스 | 18개 |
| 트리거 | 5개 |
| RLS 정책 | 25+ |
| CS 변수 | ~60개 |
| PH 변수 | ~10개 |
| Table 데이터셋 | 7~9개 |
| PSUR 섹션 | 15개 |
| 테스트 계정 | 5개 |

---

*문서 작성일: 2025-01-03*
*스키마 버전: v1.0*
