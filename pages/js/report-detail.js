/**
 * Report Detail Page Script
 * pages/js/report-detail.js
 *
 * P12_ReportDetail.html 인라인 스크립트 분리
 */

(function() {
    'use strict';

    /**
     * 페이지 초기화
     */
    function initializePage() {
        // 전역 객체 로드 확인
        if (!window.__GLOBALS_LOADED__) {
            setTimeout(initializePage, 50);
            return;
        }

        // 세션 정보로 UI 업데이트
        const session = typeof loadSessionData === 'function' ? loadSessionData() : null;
        if (session) {
            const userName = document.querySelector('.user-name');
            const userRole = document.querySelector('.user-role');
            const userPosition = document.querySelector('.user-position');
            const userAvatar = document.querySelector('.user-avatar');

            if (userName) userName.textContent = session.userName;
            if (userRole) userRole.textContent = session.userRole;
            if (userPosition) userPosition.textContent = session.userPosition || '';
            if (userAvatar) userAvatar.textContent = session.userName.charAt(0);
        }

        // 사용자 메뉴 설정
        if (typeof setupUserMenu === 'function') {
            setupUserMenu();
        }
    }

    /**
     * 탭 전환
     */
    function switchTab(tabName) {
        // 모든 탭 버튼과 콘텐츠 비활성화
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // 선택한 탭 활성화
        if (event && event.target) {
            event.target.classList.add('active');
        }

        const tabContent = document.getElementById(`tab-${tabName}`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
    }

    /**
     * 보고서 계속 진행
     */
    function continueReport() {
        // Stage 7 (리뷰) 페이지로 이동
        if (typeof navigateTo === 'function') {
            navigateTo('P18_Review.html?id=1');
        } else {
            window.location.href = 'P18_Review.html?id=1';
        }
    }

    /**
     * 보고서 내보내기
     */
    function exportReport() {
        if (typeof showToast === 'function') {
            showToast('보고서를 내보내는 중...', 'info');
        }
        setTimeout(() => {
            if (typeof showToast === 'function') {
                showToast('보고서가 성공적으로 내보내졌습니다.', 'success');
            }
        }, 1500);
    }

    /**
     * 보고서 삭제
     */
    function deleteReport() {
        if (confirm('이 보고서를 삭제하시겠습니까? 삭제된 보고서는 복구할 수 없습니다.')) {
            if (typeof showToast === 'function') {
                showToast('보고서가 삭제되었습니다.', 'success');
            }
            setTimeout(() => {
                if (typeof navigateTo === 'function') {
                    navigateTo('P11_ReportList.html');
                } else {
                    window.location.href = 'P11_ReportList.html';
                }
            }, 1000);
        }
    }

    /**
     * 댓글 추가
     */
    function addComment() {
        const textarea = document.querySelector('.comment-textarea');
        const text = textarea ? textarea.value.trim() : '';

        if (!text) {
            if (typeof showToast === 'function') {
                showToast('댓글 내용을 입력해주세요.', 'warning');
            }
            return;
        }

        if (typeof showToast === 'function') {
            showToast('댓글이 등록되었습니다.', 'success');
        }
        if (textarea) {
            textarea.value = '';
        }

        // TODO: 실제로는 API 호출하여 댓글 저장하고 목록 새로고침
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

    // 다크모드 초기화 (페이지 로드 즉시)
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
    window.ReportDetailPage = {
        initializePage,
        switchTab,
        continueReport,
        exportReport,
        deleteReport,
        addComment,
        toggleDarkMode
    };

    // 기존 HTML 호환용 전역 함수
    window.switchTab = switchTab;
    window.continueReport = continueReport;
    window.exportReport = exportReport;
    window.deleteReport = deleteReport;
    window.addComment = addComment;
    window.toggleDarkMode = toggleDarkMode;

})();
