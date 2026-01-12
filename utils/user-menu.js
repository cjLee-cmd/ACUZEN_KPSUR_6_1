/**
 * User Menu Component
 * 모든 페이지에서 공통으로 사용하는 사용자 메뉴 (드롭다운 포함)
 */

(function() {
    'use strict';

    // 사용자 메뉴 HTML 생성
    function getUserMenuHTML(user) {
        const initial = (user.name || '사용자').charAt(0).toUpperCase();
        const name = user.name || '사용자';
        const role = user.role || 'Author';
        const position = user.position || '';

        return `
            <div class="user-menu" onclick="window.UserMenu.toggleDropdown(event)">
                <div class="user-avatar">${initial}</div>
                <div class="user-info">
                    <div class="user-name">${name}</div>
                    <div class="user-role">${role}</div>
                    ${position ? `<div class="user-position">${position}</div>` : ''}
                </div>
                <button class="user-menu-toggle">▼</button>
                <div class="user-dropdown" id="userDropdown">
                    <div class="dropdown-item" onclick="window.UserMenu.goToSettings(event)">
                        <span class="dropdown-icon">⚙️</span>
                        <span class="dropdown-label">설정</span>
                    </div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item" onclick="window.UserMenu.logout(event)">
                        <span class="dropdown-icon">🚪</span>
                        <span class="dropdown-label">로그아웃</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 드롭다운 토글
    function toggleDropdown(event) {
        event.stopPropagation();
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    // 설정 페이지로 이동
    function goToSettings(event) {
        event.stopPropagation();
        closeDropdown();
        if (typeof navigateTo === 'function') {
            navigateTo('P91_Settings.html');
        } else {
            window.location.href = 'P91_Settings.html';
        }
    }

    // 로그아웃
    function logout(event) {
        event.stopPropagation();
        closeDropdown();

        // 세션 정리
        localStorage.removeItem('kpsur_session');
        localStorage.removeItem('current_report');

        // 로그인 페이지로 이동
        if (typeof navigateTo === 'function') {
            navigateTo('P01_Login.html');
        } else {
            window.location.href = 'P01_Login.html';
        }
    }

    // 드롭다운 닫기
    function closeDropdown() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    // 페이지 클릭 시 드롭다운 닫기
    function handleDocumentClick(event) {
        const userMenu = document.querySelector('.user-menu');
        if (userMenu && !userMenu.contains(event.target)) {
            closeDropdown();
        }
    }

    // 사용자 메뉴 초기화
    function initUserMenu() {
        // 세션에서 사용자 정보 가져오기
        let user = { name: '사용자', role: 'Author', position: '' };

        try {
            const sessionData = localStorage.getItem('kpsur_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                user = {
                    name: session.userName || session.name || '사용자',
                    role: session.userRole || session.role || 'Author',
                    position: session.userPosition || session.position || ''
                };
            }
        } catch (e) {
            console.warn('UserMenu: Failed to parse session', e);
        }

        // 기존 user-menu 요소 찾아서 교체
        const existingMenu = document.querySelector('.user-menu');
        if (existingMenu) {
            const parent = existingMenu.parentElement;
            existingMenu.remove();

            // 새 메뉴 삽입
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = getUserMenuHTML(user);
            const newMenu = tempDiv.firstElementChild;
            parent.appendChild(newMenu);
        }

        // 문서 클릭 이벤트 등록
        document.removeEventListener('click', handleDocumentClick);
        document.addEventListener('click', handleDocumentClick);
    }

    // 전역 함수로 노출
    window.UserMenu = {
        init: initUserMenu,
        getHTML: getUserMenuHTML,
        toggleDropdown: toggleDropdown,
        goToSettings: goToSettings,
        logout: logout,
        closeDropdown: closeDropdown
    };

    // DOM 로드 후 자동 초기화
    document.addEventListener('DOMContentLoaded', function() {
        // 약간의 딜레이를 주어 세션 로드 후 실행
        setTimeout(initUserMenu, 100);
    });
})();
