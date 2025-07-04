/**
 * htmx-handlers.js - Quản lý tất cả chức năng liên quan đến HTMX
 * 
 * File này đóng vai trò quan trọng trong việc đảm bảo các chức năng JavaScript vẫn hoạt động 
 * sau khi HTMX thay đổi nội dung (swap). Nó chịu trách nhiệm khởi tạo lại các chức năng JavaScript
 * cần thiết cho nội dung mới mà không cần load lại toàn bộ trang.
 * 
 * Các nguyên tắc chính:
 * 1. Chỉ khởi tạo lại những gì cần thiết dựa trên nội dung đã được swap
 * 2. Dọn dẹp (dispose) các instance cũ trước khi tạo mới
 * 3. Sử dụng event delegation khi có thể
 */

// Import các hàm từ các module khác (sẽ được sử dụng trong HTMX)
import { initAuthUI } from '../auth.js';
import { initCustomDropdowns } from './custom-dropdown.js';
import { initMangaDetailsPage } from './manga-details.js';
import { initChapterDropdownNav, initImageLoading, initImageScaling, initPlaceholderButtons, initReadPage, initSidebarToggle } from './read-page.js';
import SearchModule from './search.js';
import { initSidebar, updateActiveSidebarLink } from './sidebar.js';
import { initUIToggles } from './ui-toggles.js';
import { adjustFooterPosition, adjustMangaTitles, createDefaultImage, fixAccordionIssues, initBackToTop, initResponsive, initTooltips } from './ui.js';
import { createAuthorSearch } from './author-search.js';

/**
 * Khởi tạo lại các chức năng cần thiết sau khi HTMX cập nhật nội dung
 *
 * @param {HTMLElement} targetElement - Phần tử được HTMX swap
 */
function reinitializeAfterHtmxSwap(targetElement) {
    console.log('[HTMX Swap] Reinitializing JS for swapped element:', targetElement);
    // Cập nhật active sidebar link - luôn thực hiện khi có swap
    updateActiveSidebarLink();

    // Xử lý khi main-content được swap (toàn bộ trang hoặc phần lớn)
    if (targetElement.id === 'main-content' || targetElement.closest('#main-content')) {
        console.log('[HTMX Swap] Main content swapped, reinitializing page-specific modules...');
        // Khi nội dung chính được swap, khởi tạo lại các thành phần trong đó
        if (targetElement.querySelector('#searchForm') || targetElement.id === 'searchForm') {
            SearchModule.initSearchPage?.();
            if (window.initSearchTagsDropdown) {
                console.log('[HTMX Swap] Initializing Search Tags Dropdown for search form.');
                window.initSearchTagsDropdown();
            }
            createAuthorSearch('authorSearchContainer');
            createAuthorSearch('artistSearchContainer');
        }
        if (targetElement.querySelector('.details-manga-header-background')) {
            initMangaDetailsPage();
        }
        // Khởi tạo lại trang đọc chapter nếu có
        if (targetElement.querySelector('.chapter-reader-container') || targetElement.querySelector('#readingSidebar')) {
            console.log('[HTMX Swap] Chapter Read page detected, initializing read-page modules');
            initReadPage();
        }
        // Khởi tạo lại pagination nếu có
        if (targetElement.querySelector('.pagination')) {
            SearchModule.initPageGoTo?.();
        }
        // Điều chỉnh tiêu đề manga nếu có
        adjustMangaTitles(targetElement);
    }
    // Xử lý khi chỉ kết quả tìm kiếm và phân trang được swap
    else if (targetElement.id === 'search-results-and-pagination') {
        console.log('[HTMX Swap] Search results swapped, reinitializing pagination/tooltips...');
        SearchModule.initPageGoTo?.();
        initTooltips();
    }
    // Xử lý khi chỉ container kết quả được swap (chuyển đổi view mode)
    else if (targetElement.id === 'search-results-container') {
        console.log('[HTMX Swap] Search results container swapped (view mode change).');
        initTooltips();
    }
    // Xử lý khi chỉ container ảnh chapter được swap
    else if (targetElement.id === 'chapterImagesContainer') {
        console.log('[HTMX Swap] Chapter images container swapped, initializing image loading...');
        initImageLoading('#chapterImagesContainer');
    }
    // Xử lý khi chỉ sidebar đọc truyện được swap (nếu có)
    else if (targetElement.id === 'readingSidebar') {
        console.log('[HTMX Swap] Reading sidebar swapped, reinitializing relevant parts...');
        initSidebarToggle();
        initChapterDropdownNav();
        initPlaceholderButtons();
        initImageScaling();
    }
    // Xử lý khi các nút chuyển đổi UI (theme/source) bị swap (ít khả năng, nhưng cần)
    // (Kiểm tra nếu bất kỳ phần tử con nào của #userDropdownMenu chứa một trong các switcher)
    if (targetElement.querySelector('#userDropdownMenu') || targetElement.closest('#userDropdownMenu')) {
         if (targetElement.querySelector('#customThemeSwitcherItem') || targetElement.querySelector('#customSourceSwitcherItem')) {
             console.log('[HTMX Swap] UI Toggles detected in swapped content, reinitializing.');
             initUIToggles(); // Gọi hàm khởi tạo chính cho cả hai nút
         }
    }

    // Luôn khởi tạo lại các component Bootstrap trong phần tử đã swap
    initializeBootstrapComponents(targetElement);
    console.log('[HTMX Swap] Reinitialization complete for swapped element.');
}


/**
 * Khởi tạo lại các chức năng sau khi HTMX khôi phục nội dung từ lịch sử (Back/Forward)
 * @param {HTMLElement} targetElement - Thường là body hoặc main-content
 */
function reinitializeAfterHtmxLoad(targetElement) {
    console.log('[HTMX Load] Reinitializing JS after history navigation for element:', targetElement);

    // *** BƯỚC QUAN TRỌNG: Xóa loading state ngay lập tức ***
    if (targetElement && targetElement.classList.contains('htmx-loading-target')) {
        console.log('[HTMX Load] Force removing htmx-loading-target on restored element.');
        targetElement.classList.remove('htmx-loading-target');
    }
    const mainContent = document.getElementById('main-content');
    if (mainContent && mainContent.classList.contains('htmx-loading-target')) {
         mainContent.classList.remove('htmx-loading-target');
    }
    const searchResults = document.getElementById('search-results-and-pagination');
     if (searchResults && searchResults.classList.contains('htmx-loading-target')) {
          searchResults.classList.remove('htmx-loading-target');
     }
    // *** KẾT THÚC BƯỚC XÓA LOADING STATE ***

    // --- 1. Khởi tạo lại các chức năng TOÀN CỤC ---
    console.log('[HTMX Load] Reinitializing global functions...');
    initSidebar();
    initAuthUI();
    initCustomDropdowns();
    initUIToggles();
    initBackToTop();
    initResponsive();
    fixAccordionIssues();
    adjustFooterPosition();
    initTooltips();
    createDefaultImage();

    // --- 2. Khởi tạo lại các chức năng TRANG CỤ THỂ (Có điều kiện) ---
    if (targetElement.querySelector('#searchForm')) {
        console.log('[HTMX Load] Reinitializing Search Page...');
        SearchModule.initSearchPage?.();
        if (window.initSearchTagsDropdown) {
            console.log('[HTMX Load] Initializing Search Tags Dropdown for search form.');
            window.initSearchTagsDropdown();
        }
        createAuthorSearch('authorSearchContainer');
        createAuthorSearch('artistSearchContainer');
        SearchModule.initPageGoTo?.();
    } else if (targetElement.querySelector('.details-manga-header-background')) {
        console.log('[HTMX Load] Reinitializing Manga Details Page...');
        initMangaDetailsPage();
    } else if (targetElement.querySelector('.chapter-reader-container') || targetElement.querySelector('#readingSidebar')) {
        console.log('[HTMX Load] Reinitializing Chapter Read Page...');
        initReadPage();
    } else {
        console.log('[HTMX Load] Reinitializing Home Page or other...');
        const latestGrid = document.getElementById('latest-manga-grid');
        if (latestGrid && latestGrid.innerHTML.includes('spinner')) {
            console.log('[HTMX Load] Retriggering hx-trigger="load" for #latest-manga-grid');
            setTimeout(() => htmx.trigger(latestGrid, 'load'), 50);
        }
    }

    // --- 3. Khởi tạo lại các thành phần UI/Bootstrap chung ---
    initializeBootstrapComponents(targetElement);

    // --- 4. Điều chỉnh UI cuối cùng ---
    adjustMangaTitles(targetElement);

    console.log('[HTMX Load] Reinitialization complete.');
}

/**
 * Helper function to initialize Bootstrap components within a target element.
 * This function now includes more robust error handling and logging.
 */
function initializeBootstrapComponents(targetElement) {
    if (!targetElement || typeof targetElement.querySelectorAll !== 'function') {
        console.warn('[Bootstrap Init] Invalid targetElement provided:', targetElement);
        return;
    }
    console.log('[Bootstrap Init] Initializing components within:', targetElement);

    // Dropdowns
    targetElement.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(el => {
        // Skip custom dropdowns
        if (el.closest('.custom-user-dropdown')) return;
        
        const elId = el.id || el.tagName; // Use ID if available for logging
        console.log(`[Bootstrap Init - Dropdown] Processing element: ${elId}`);
        try {
            var instance = bootstrap.Dropdown.getInstance(el);
            if (instance) {
                console.log(`[Bootstrap Init - Dropdown] Disposing existing instance for ${elId}`);
                instance.dispose();
            } else {
                 console.log(`[Bootstrap Init - Dropdown] No existing instance found for ${elId}`);
            }
            console.log(`[Bootstrap Init - Dropdown] Creating new instance for ${elId}`);
            new bootstrap.Dropdown(el);
        } catch (e) {
            console.error(`[Bootstrap Init - Dropdown] Error re-initializing ${elId}:`, e);
        }
    });
    // Collapse
    targetElement.querySelectorAll('[data-bs-toggle="collapse"]').forEach(el => {
         try {
            var instance = bootstrap.Collapse.getInstance(el);
            if (instance) instance.dispose();
            new bootstrap.Collapse(el);
         } catch (e) { console.error("Error re-init Collapse:", e); }
    });
    // Tabs
     targetElement.querySelectorAll('[data-bs-toggle="tab"]').forEach(el => {
         try {
            var instance = bootstrap.Tab.getInstance(el);
            if (instance) instance.dispose();
            new bootstrap.Tab(el);
         } catch (e) { console.error("Error re-init Tab:", e); }
     });
    // Tooltips (được gọi riêng)
    // initTooltips(); // Gọi lại nếu cần quét toàn bộ document
}

/**
 * Khởi tạo các sự kiện xử lý HTMX
 */
function initHtmxHandlers() {
    console.log("Initializing generic HTMX handlers with loading state...");

    // Lưu trữ target element đang loading để xử lý lỗi
    let loadingTargetElement = null;

    // Trước khi gửi request
    htmx.on('htmx:beforeRequest', function (event) {
        // Xác định phần tử target
        const requestConfig = event.detail.requestConfig;
        let targetElement = null;

        // Ưu tiên lấy target từ requestConfig.target
        if (requestConfig.target) {
            // Kiểm tra xem requestConfig.target là chuỗi selector hay đối tượng DOM
            if (typeof requestConfig.target === 'string') {
                try {
                    // Cố gắng querySelector với chuỗi target
                    targetElement = document.querySelector(requestConfig.target);
                    if (!targetElement) {
                         console.warn(`[HTMX BeforeRequest] Target element not found for selector: ${requestConfig.target}`);
                    }
                } catch (e) {
                     // Nếu querySelector lỗi (selector không hợp lệ), ghi log và fallback
                     console.error(`[HTMX BeforeRequest] Invalid selector provided for target: '${requestConfig.target}'`, e);
                     targetElement = event.detail.elt; // Fallback về phần tử kích hoạt
                     console.log('[HTMX BeforeRequest] Fallback target to triggering element due to invalid selector:', targetElement);
                }
            } else if (requestConfig.target instanceof Element) {
                // Nếu requestConfig.target đã là một đối tượng DOM
                targetElement = requestConfig.target;
                console.log('[HTMX BeforeRequest] Target is already a DOM element:', targetElement);
            } else {
                 // Trường hợp target không phải chuỗi cũng không phải Element
                 console.warn('[HTMX BeforeRequest] requestConfig.target is neither a string nor an Element:', requestConfig.target);
                 targetElement = event.detail.elt; // Fallback về phần tử kích hoạt
                 console.log('[HTMX BeforeRequest] Fallback target to triggering element:', targetElement);
            }
        } else {
            // Nếu không có target rõ ràng, sử dụng phần tử kích hoạt
            targetElement = event.detail.elt;
            console.log('[HTMX BeforeRequest] No explicit target found, using triggering element:', targetElement);
        }

        // Chỉ thêm class loading nếu targetElement là một Element hợp lệ
        if (targetElement instanceof Element) {
            console.log(`[HTMX BeforeRequest] Adding htmx-loading-target to:`, targetElement);
            targetElement.classList.add('htmx-loading-target');
            loadingTargetElement = targetElement; // Lưu lại target đang load
        } else {
            console.warn('[HTMX BeforeRequest] Could not determine a valid target element for loading state. Target:', targetElement);
            loadingTargetElement = null;
        }

        // Xử lý spinner toàn cục (nếu vẫn muốn giữ lại cho main-content)
        if (targetElement && targetElement.id === 'main-content') {
             const mainSpinner = document.getElementById('content-loading-spinner');
             if (mainSpinner) mainSpinner.style.display = 'block';
        }
    });

     // Sau khi swap xong nội dung
     htmx.on('htmx:afterSwap', function (event) {
        const swappedElement = event.detail.target; // Phần tử đã được swap

        if (swappedElement && swappedElement instanceof Element) {
            console.log(`[HTMX AfterSwap] Removing htmx-loading-target from swapped:`, swappedElement);
            // Xóa class loading state khỏi phần tử MỚI được swap vào
            swappedElement.classList.remove('htmx-loading-target');
        } else {
             console.warn('[HTMX AfterSwap] Swapped target is not a valid Element:', swappedElement);
        }

        // Khởi tạo lại JS cho nội dung mới (Quan trọng - Giữ lại dòng này)
        reinitializeAfterHtmxSwap(swappedElement);

        loadingTargetElement = null; // Reset target đang load
    });

    // Sau khi request hoàn tất (thành công hoặc lỗi) - Dọn dẹp nếu swap không xảy ra
    htmx.on('htmx:afterRequest', function(event) {
        // Ẩn spinner toàn cục (nếu có)
        const mainSpinner = document.getElementById('content-loading-spinner');
        if (mainSpinner) mainSpinner.style.display = 'none';

        // *** LUÔN kiểm tra và xóa loading state khỏi target đã lưu ***
        if (loadingTargetElement && loadingTargetElement instanceof Element && loadingTargetElement.classList.contains('htmx-loading-target')) {
            console.warn(`[HTMX AfterRequest] Cleaning up potentially stuck loading state from:`, loadingTargetElement, `(Request Success: ${event.detail.successful})`);
            loadingTargetElement.classList.remove('htmx-loading-target');
        }
        // *** KẾT THÚC KIỂM TRA VÀ XÓA ***

        loadingTargetElement = null; // Reset target đang load
    });

    // Xử lý lỗi response (trước khi swap)
    htmx.on('htmx:responseError', function(event) {
        console.error("HTMX response error:", event.detail.xhr);
        const xhr = event.detail.xhr;
        const requestPath = event.detail.requestConfig?.path || '';

        // Nếu có target đang loading, xóa trạng thái loading
        if (loadingTargetElement && loadingTargetElement instanceof Element) {
            console.warn('[HTMX ResponseError] Removing loading state due to response error from:', loadingTargetElement);
            loadingTargetElement.classList.remove('htmx-loading-target');
            loadingTargetElement = null; // Reset
        }

        // Kiểm tra điều kiện để bỏ qua thông báo lỗi 401 cho SaveReadingProgress
        if (requestPath.includes('/Chapter/SaveReadingProgress') && xhr.status === 401) {
            console.warn('[HTMX ResponseError] Ignored 401 error for /Chapter/SaveReadingProgress. User likely not logged in.');
            // Không hiển thị toast cho trường hợp này
        } else {
            // Hiển thị toast lỗi cho các trường hợp khác (nếu có)
            if (window.showToast) {
                let errorMessage = 'Đã xảy ra lỗi khi tải nội dung. Vui lòng thử lại.';
                // Cố gắng lấy thông tin lỗi chi tiết hơn từ server nếu có
                if (xhr.responseText) {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        if (errorData && errorData.errors && errorData.errors.length > 0) {
                            errorMessage = errorData.errors.map(e => e.detail || e.title).join('\n');
                        } else if (errorData && errorData.title) { // Xử lý trường hợp lỗi đơn lẻ như ApiError
                            errorMessage = errorData.detail || errorData.title;
                        }
                    } catch (e) {
                        // Bỏ qua nếu không parse được JSON, giữ errorMessage mặc định
                        console.warn("[HTMX ResponseError] Could not parse JSON from error responseText for toast.");
                    }
                }
                window.showToast('Lỗi', errorMessage, 'error');
            }
        }
    });

     // Xử lý lỗi swap (sau khi nhận response nhưng trước khi swap)
     htmx.on('htmx:swapError', function(event) {
        console.error("HTMX swap error:", event.detail.error);

        // Nếu có target đang loading, xóa trạng thái loading
        if (loadingTargetElement && loadingTargetElement instanceof Element) {
            console.warn('[HTMX SwapError] Removing loading state due to swap error from:', loadingTargetElement);
            loadingTargetElement.classList.remove('htmx-loading-target');
            loadingTargetElement = null; // Reset
        }

        // Hiển thị toast lỗi (nếu có)
         if (window.showToast) {
             window.showToast('Lỗi', 'Đã xảy ra lỗi khi cập nhật giao diện.', 'error');
         }
     });
    
    // *** LẮNG NGHE SỰ KIỆN htmx:load CHO HISTORY NAVIGATION ***
    htmx.on('htmx:load', function(event) {
        // event.detail.elt thường là body hoặc container chính được khôi phục
        const restoredElement = event.detail.elt;
        if (restoredElement) {
            console.log('[HTMX Load] Content restored via history navigation into:', restoredElement);
            // Gọi hàm khởi tạo lại cho nội dung được khôi phục
            reinitializeAfterHtmxLoad(restoredElement);

            // Xóa loading state nếu còn sót lại (ít khả năng xảy ra với htmx:load)
            if (restoredElement.classList.contains('htmx-loading-target')) {
                restoredElement.classList.remove('htmx-loading-target');
            }
        } else {
            console.warn('[HTMX Load] No element found in event detail.');
        }
        loadingTargetElement = null; // Reset target đang load
    });
    // *** KẾT THÚC LẮNG NGHE htmx:load ***

    // Bắt sự kiện popstate (nếu cần cập nhật UI khác)
    window.addEventListener('popstate', function() {
        updateActiveSidebarLink();
    });

    console.log("Generic HTMX Handlers Initialized.");
}

// Export các hàm cần thiết
export { initHtmxHandlers, reinitializeAfterHtmxLoad, reinitializeAfterHtmxSwap };
