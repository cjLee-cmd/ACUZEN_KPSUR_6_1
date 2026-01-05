-- =====================================================
-- Migration 002: LLM Sessions Table
-- Description: Add session management for LLM conversations
-- Date: 2025-01-04
-- =====================================================

-- 1. LLM 세션 테이블 생성
-- 보고서별 LLM 대화 세션을 관리합니다.
CREATE TABLE IF NOT EXISTS llm_sessions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id uuid REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
    session_id varchar(100) UNIQUE NOT NULL,
    system_prompt text,
    model_name varchar(50) DEFAULT 'claude-sonnet-3-5',
    context_window_tokens int DEFAULT 0,
    max_context_tokens int DEFAULT 200000,
    status varchar(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'expired')),
    created_at timestamptz DEFAULT now(),
    last_activity_at timestamptz DEFAULT now()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_llm_sessions_report ON llm_sessions(report_id);
CREATE INDEX IF NOT EXISTS idx_llm_sessions_status ON llm_sessions(status);
CREATE INDEX IF NOT EXISTS idx_llm_sessions_session_id ON llm_sessions(session_id);

-- 3. llm_dialogs 테이블 확장 (기존 테이블에 컬럼 추가)
-- session_id: 세션 참조
ALTER TABLE llm_dialogs ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES llm_sessions(id) ON DELETE SET NULL;

-- sequence_number: 대화 순서
ALTER TABLE llm_dialogs ADD COLUMN IF NOT EXISTS sequence_number int DEFAULT 0;

-- user_message: 전체 사용자 메시지 (기존 request_summary보다 상세)
ALTER TABLE llm_dialogs ADD COLUMN IF NOT EXISTS user_message text;

-- assistant_message: 전체 AI 응답 (기존 response_summary보다 상세)
ALTER TABLE llm_dialogs ADD COLUMN IF NOT EXISTS assistant_message text;

-- dialog_type: 대화 유형 (generation, chat, refinement)
ALTER TABLE llm_dialogs ADD COLUMN IF NOT EXISTS dialog_type varchar(20) DEFAULT 'generation';

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_llm_dialogs_session ON llm_dialogs(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_dialogs_sequence ON llm_dialogs(report_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_llm_dialogs_type ON llm_dialogs(dialog_type);

-- 5. RLS 정책 (llm_sessions)
ALTER TABLE llm_sessions ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 보고서 작성자만 세션 조회 가능
CREATE POLICY "Users can view their own report sessions"
ON llm_sessions FOR SELECT
USING (
    report_id IN (
        SELECT id FROM reports WHERE created_by = auth.uid()
    )
);

-- 삽입 정책: 인증된 사용자만 세션 생성 가능
CREATE POLICY "Authenticated users can create sessions"
ON llm_sessions FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    report_id IN (
        SELECT id FROM reports WHERE created_by = auth.uid()
    )
);

-- 수정 정책: 본인 보고서의 세션만 수정 가능
CREATE POLICY "Users can update their own sessions"
ON llm_sessions FOR UPDATE
USING (
    report_id IN (
        SELECT id FROM reports WHERE created_by = auth.uid()
    )
);

-- 삭제 정책: 본인 보고서의 세션만 삭제 가능
CREATE POLICY "Users can delete their own sessions"
ON llm_sessions FOR DELETE
USING (
    report_id IN (
        SELECT id FROM reports WHERE created_by = auth.uid()
    )
);

-- 6. 세션 마지막 활동 시간 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_session_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- llm_dialogs에 새 행이 추가될 때 해당 세션의 last_activity_at 업데이트
    IF NEW.session_id IS NOT NULL THEN
        UPDATE llm_sessions
        SET last_activity_at = now(),
            context_window_tokens = context_window_tokens + COALESCE(NEW.input_tokens, 0) + COALESCE(NEW.output_tokens, 0)
        WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_session_activity ON llm_dialogs;
CREATE TRIGGER trigger_update_session_activity
AFTER INSERT ON llm_dialogs
FOR EACH ROW
EXECUTE FUNCTION update_session_last_activity();

-- 8. 만료된 세션 자동 정리 함수 (선택적)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    -- 7일 이상 비활성 세션을 expired로 변경
    UPDATE llm_sessions
    SET status = 'expired'
    WHERE status = 'active'
    AND last_activity_at < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 실행 후 확인:
-- SELECT * FROM llm_sessions LIMIT 5;
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'llm_dialogs' ORDER BY ordinal_position;
-- =====================================================
