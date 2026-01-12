# Summary

## Purpose
본  프로그램은 제약사 약물감시 결과를 보고하는 문서를 자동으로 작성하도록 하는데 그 목적이 있다. 재작되는 프로그램은 'KSUR'이라고 부르며, 아래의 순서를 따른다.

### Process
1. 로그인
2. 기본정보 입력
3. 입력
   - Step 1: 제품정보 입력(RAW1.x, RAW2.x, RAW7)
   - Step 2: 임상자료 입력(RAW8, RAW17)
   - Step 3: linelisting 입력(RAW12, RAW13, RAW14, RAW15)
   - Step 4: 나머지 자료 입력
4. 마크다운 변환
   - 개별문서 변환
   - 하나의 문서로 통합(파일명: MD_Total.md)
   - 문서 - RAW ID 매칭, 태그 부여
5. LLM 질의
   - 질의 컨텍스트(UserPrompt) 송신
   - 답변 수신
6. 보고서 수정
   - 섹션별 수정/저장
   - 리뷰어 접근/수정 가능
7. QC
   - 작성된 내용이 원문에 부합하는지 점검
   - 입력된 마크다운 변환 문서와 결과물이 일치하는지 LLM에게 정밀 분석 요청

### 사양
1. 로그인
   - 권한: master/user/reviewer
   
2. 기본정보입력

   2.1 처음작성시
    - 기본 '사용자 입력정보' 입력
        - 보고서 작성시 매번 입력하여야 하는 기본 정보. 이 정보는 '자동 입력정보'에 포함되지 않는 내용을 사용자로부터 입력 받음.
        - 작성후, '생성'버튼을 누르면 '약품명_PSUR 제출일_보고서 버전'을 '보고서 명'으로 하는 '문서 DB' 생성. DB의 '문서상태' 필드에 'Draft'표시.

    - 사용자 입력 내용은 아래와 같음.
        | Variable ID | 설명 |
        |-------------|------|
        | CS6_보고서제출일 | PSUR 제출일 |
        | CS7_버전넘버 | 보고서 버전 (예: 1.0) |
        | CS13_유효기간 | 품목 유효기간 |
        | CS20_1일사용량 | 바이알 기준 1일 사용량 |
        | CS21_환자1명당사용량 | 연간 사용량 |
        | CS24_MedDRA버전넘버 | 사용된 MedDRA 버전 |
    
3. '소스문서' 입력
   3.1 보고서 작성에 필요한 정보를 입력 받음. 
   - 여러 문서를 입력 받으면, 아래 표의 Description에 따라 이 문서들이 어느문서에 해당하는지 파악하여 해당하는 'Raw ID' 태그를 달아서 나중에 알아볼 수 있도록 분류 함. 
   - 이 과정은 매우 중요하며, 문서의 종류는 아래와 같음.
   - 문서의 분류는 LLM에게을 통하여 진행.
  
    | Raw ID | English Description (Literal) | 한글 명칭 |
    |---|---|---|
    | RAW1 | latest attached document | 최신첨부문서 |
    | RAW2.1 | dosage and administration | 용법용량 |
    | RAW2.2 | efficacy and effect | 효능효과 |
    | RAW2.3 | precautions for use | 사용상의주의사항 |
    | RAW2.6 | reporting guideline – precautions for use | 보고서작성지침사용상의주의사항 |
    | RAW3 | post-marketing sales data | 시판후sales데이터 |
    | RAW4 | approval status | 허가현황 |
    | RAW5.1 | safety measure approval email | 안전성조치허가메일 |
    | RAW6.1 | safety measure approval email – compiled | 안전성조치허가메일_취합본 |
    | RAW7.1 | safety information change – multiple items | 안전성정보변경_복수항목 |
    | RAW7.2 | safety information change | 안전성정보변경 |
    | RAW7.3 | safety information change – dosage and administration | 안전성정보변경_용법용량 |
    | RAW7.4 | safety information change – expression format – multiple items | 안전성정보변경_표현식복수항목 |
    | RAW8 | clinical exposure data | 임상노출데이터 |
    | RAW9 | literature data | 문헌자료 |
    | RAW12 | domestic expedited report line listing | 국내신속보고LineListing |
    | RAW13 | domestic expedited report line listing | 국내신속보고LineListing |
    | RAW14 | raw data line listing | 원시자료LineListing |
    | RAW15 | periodic report line listing | 정기보고LineListing |

    - 아래 예시와 같이 'Raw ID'만의 형태로 '04_TestProcess/02_RawData_MD/'에 '보고서명_화일명매칭테이블_YYMMDD_hhmmss.md' 형태로 저장.
        | 원본화일명 | 태그화일명 |
        |-----------|-----------|
        | RAW1.1_최신첨부문서_예시1.pdf | RAW1.1 |

4. '소스문서' 마크다운 변환
   - 모든 소스문서는 마크다운으로 변환하여 로컬에 1차 저장. 
   - 변환하여 저장시 'Raw ID' 태그에 맞춰 저장.
   - 변환은 지정된 LLM에게 요청하여 마크다운으로 변환. 텍스트, pdf, 엑셀, docx 문서를 입력 받아서 변환하도록 구현.
   - 중요!! 절대로 내용을 추가하거나 변형하여서는 안됨. 원본 문서 그대로 변환하여야 함.
   - 저장 경로는 '`/04_MainProcess/02_RawData_MD/`, 'Raw ID' 태그에 '_파일명.md' 형식으로 저장. 문서의 크기와 컨텍스트 사용을 합리적으로 하기 위함. 동시에 DB에 저장. DB 구조는 별도 설명.
  
5. 데이터 추출
'CS 데이터', 'PH 데이터', 'Table 데이터' 추출 
   - 마크다운으로 변환된 모든 화일에서 정의된 3가지 데이터 추출
   - 추출은 LLM에게 요청하여 진행.
   - LLM에게 문서와 이 문서에서 추출하여야 할 데이터 리스트를 주고 결과를 받아 옴.
   - 각 문서별로 추출되어지는 데이터들을 `01_Content/0114_CS_from_Source.md`를 참조하여 문서별로 하나씩 추출.
   - `011_CSExtract.md`에 정의된 내용대로 추출.
   - 저장경로: `03_ExtractedData_MD` 하위에 `01_Extracted_CSData.md`, `02_Extracted_PHData.md`, `03_Extracted_TableData.md` 이름으로 각각 저장.

1. 보고서 템플릿에 추출 데이터 입력
   - 보고서 템플릿: `03_Template/02_Sections/`의 각 화일을 템플릿으로 사용.
   - `01_Content/0116_Source_CS_Sections.md`의 내용에 따라 각 섹션별로 필요한 데이터들을 가져다가 각 섹션 템플릿에 적용하여 작성.
   - '서술문'이 아닌경우, 각 데이터들을 대입하여 템플릿의 원 문장 그대로 사용하여야 함.
   - '서술문'의 경우, 각 템플릿의 문장과 동일한 구조와 길이로 작성하여야 함. 추가 설명등을 하지 말 것.

2. 리뷰
제작된 섹션별 마크다운 보고서를 섹션별로 보여주고 수정하도록 구성. LLM이 필요없는 단계.
   - 각 섹션별로 작성된 마크다운 화일을 섹션별로 왼쪽에 보여주고, 오른쪽에서 수정하면 반영되도록 제작.
   - 마크다운 포맷이 아니라 문서화일로 보여주어야 함.
   - 저장버튼을 제작하여 각 섹션별로 문서를 저장하도록 수정.
   - '머지'를 누르면 각 섹션별 문서를 하나로 취합하여 문서를 제작하도록 구현.
   - '출력' 버튼을 눌러서 워드화일로 Draft 버전 출력. 로컬 다운로드 폴더에 저장하도록 구현. 문서 뒤에 '_Draft'라고 명기
   - 수정전/후 내용을 데이터베이스에 저장

1. QC
제작된 전체 문서에 문제가 없는지 파악하여 보고.
   - '리뷰'에서 작성된 Draft 문서와 '4.'에서 작성된 마크다운 문서를 LLM에게 전달하고 서로 상충되는 부분이 없는지 면밀하게 분석하도록 요청.
   - 페이지가 정상 작성되었는지 확인.
   - 표가 없어서 삭제된 경우, 표 제목이 순차적으로 작성 되었는지 확인.
   - 매우 중요한 작업이므로 지침에 'Ultrathink, Think Hard, Think step by step, Take your time'등 삽입.
   - 특히, 'CS 데이터', 'PH 데이터', 'Table 데이터'가 각 소스문서의 내용과 상충되는 부분이 없는지 전체 분석.
   - '서술문'의 내용이 원본문서의 내용에 위배되는지 확인.
   - 수정사항이 발생하면 전체 내용을 리스트하고 수정하도록 하는 UI 제공하여 수정하도록 함. 수정 후, QC 단계 다시 시도.
   - 수정사항이 없으면, 사용자에게 없다고 알리고 Draft 상태 해제.

1. 출력
   - 전체 내용을 '출력 포맷'에 맞도록 수정.



## LLM 설정
- 사용자가 지정한 LLM을 사용할 수 있도록 구현.
- 초기값은 'GOOGLE GEMINI 3 Flash'/'GOOGLE GEMINI 3 Pro'모델을 선택적으로 사용하도록 제작.
- .env화일을 작성하고 관련 API 환경변수를 입력하여 사용할 것.

## DB 설정
- Supabase DB를 사용.
- .env 화일에 관련 API를 이용하여 사용.

### DB 저장 내용
- 로그인 정보 테이블: 로그인 권한(마스터/작성자/리뷰어/뷰어)로 나누어서 저장.
- 리뷰 수정 내용 테이블: 리뷰 화면에서 사용자가 수정한 내용을 수정전/수정후로 나누어서 저장.(날자/문서명/수정전/수정후/수정자)

## 테스트모드
프로그램 제작시 단계별로 테스트하기 위한 지침.
아래 기능을 단위테스트 하기 위하여 각 기능별 선행 데이터는 아래 지정된 선행데이터 사용.

### 로그인
  - ID/비밀번호 생성등의 기능 확인.
  - 선행데이터: 없음
### 레포트 상태
  - 초기/계속 선택시 정상동작하는지 확인.
### 소스문서 입력
  - UI에서 사용자가 파일들을 선택하면, 순서대로 문서의 성격에 따른 태그를 명확히 확보하는지 확인.
  - 선행데이터: '04_TestProcess/01_RawData'내의 데이터.
### 마크다운 변환
  - 화일명이 변환된 소스문서가 마크다운으로 정확하게 변환되는지 확인.
  - 선행데이터: '04_TestProcess/02_RawData_MD/testPill_1_파일매칭테이블_251227_192325.md' 사용.
### 데이터 추출
  - 각 데이터가 명확히 추출되는지 확인. 특히, LLM과의 대화가 명확하게 이루어지는지 확인.
  - LLM에게 보내는 컨택스트와 LLM으로 응답받는 컨텍스트를 '02_Context/05_DialogWithLLM'에 '보고서명_YYMMDD_hhmmss'파일명으로 저장. 사용된 LLM 명과 [User Msb.], [Resp. Msg]로 구분하여 데이터 추출단계의 싱글턴 대화내용 표시.
  - '03_Template/03_CS_Data_List.md'의 해당 표의 해당 데이터의 'Data'에 삽입 후'04_TestProcess/03_CSData_MD' 폴더에 'CS_Data_List_YYMMDD_hhmmss.md'에 저장.
  - 선행데이터: 
### 보고서 템플릿에 추출 데이터 입력
  - 선행데이터: `03_ExtractedData_MD` 하위에 `01_Extracted_CSData.md`, `02_Extracted_PHData.md`, `03_Extracted_TableData.md` 데이터 사용.

### 리뷰
    - 추후 작성

### QC
    - 추후 작성

### 출력
    - 추후 작성