using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using manga_reader_web.Services.AuthServices;

namespace manga_reader_web.Controllers
{
    public class AuthController : Controller
    {
        private readonly IUserService _userService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IUserService userService,
            ILogger<AuthController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        /// <summary>
        /// Trang đăng nhập hiển thị các phương thức đăng nhập có sẵn
        /// </summary>
        /// <param name="returnUrl">URL trả về sau khi đăng nhập thành công</param>
        /// <returns>View đăng nhập</returns>
        public IActionResult Login(string returnUrl = null)
        {
            ViewBag.ReturnUrl = returnUrl;
            return View();
        }

        /// <summary>
        /// Bắt đầu quá trình đăng nhập bằng Google
        /// </summary>
        /// <param name="returnUrl">URL trả về sau khi đăng nhập thành công</param>
        /// <returns>Chuyển hướng đến URL xác thực Google</returns>
        public async Task<IActionResult> GoogleLogin(string returnUrl = null)
        {
            // Lưu returnUrl vào session để sử dụng sau khi callback
            if (!string.IsNullOrEmpty(returnUrl))
            {
                HttpContext.Session.SetString("ReturnUrl", returnUrl);
            }

            try
            {
                // Lấy URL xác thực Google từ backend
                string authUrl = await _userService.GetGoogleAuthUrlAsync();
                
                if (string.IsNullOrEmpty(authUrl))
                {
                    _logger.LogError("Không thể lấy URL xác thực Google từ backend");
                    TempData["ErrorMessage"] = "Không thể kết nối đến dịch vụ xác thực. Vui lòng thử lại sau.";
                    return RedirectToAction("Login");
                }
                
                // Chuyển hướng người dùng đến Google để xác thực
                return Redirect(authUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi trong quá trình bắt đầu đăng nhập Google");
                TempData["ErrorMessage"] = "Có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại sau.";
                return RedirectToAction("Login");
            }
        }

        /// <summary>
        /// Xử lý callback sau khi xác thực Google thành công
        /// </summary>
        /// <param name="token">JWT token từ backend</param>
        /// <returns>Chuyển hướng đến trang chính hoặc trang được yêu cầu trước đó</returns>
        public IActionResult Callback(string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                _logger.LogError("Token không được cung cấp trong callback");
                TempData["ErrorMessage"] = "Đăng nhập không thành công. Vui lòng thử lại.";
                return RedirectToAction("Login");
            }

            try
            {
                // Lưu token vào session
                _userService.SaveToken(token);
                
                // Lấy URL trả về từ session (nếu có)
                string returnUrl = HttpContext.Session.GetString("ReturnUrl");
                HttpContext.Session.Remove("ReturnUrl");
                
                if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
                {
                    return Redirect(returnUrl);
                }
                
                return RedirectToAction("Index", "Home");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi trong quá trình xử lý callback");
                TempData["ErrorMessage"] = "Có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại sau.";
                return RedirectToAction("Login");
            }
        }

        /// <summary>
        /// Đăng xuất người dùng
        /// </summary>
        /// <returns>Chuyển hướng đến trang chính</returns>
        public IActionResult Logout()
        {
            try
            {
                // Xóa token khỏi session
                _userService.RemoveToken();
                
                // Thông báo đăng xuất thành công
                TempData["SuccessMessage"] = "Bạn đã đăng xuất thành công.";
                
                return RedirectToAction("Index", "Home");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi trong quá trình đăng xuất");
                return RedirectToAction("Index", "Home");
            }
        }

        /// <summary>
        /// Lấy thông tin người dùng hiện tại (dùng cho AJAX)
        /// </summary>
        /// <returns>Thông tin người dùng dưới dạng JSON</returns>
        [HttpGet]
        public async Task<IActionResult> GetCurrentUser()
        {
            if (!_userService.IsAuthenticated())
            {
                return Json(new { isAuthenticated = false });
            }

            try
            {
                var user = await _userService.GetUserInfoAsync();
                
                if (user == null)
                {
                    return Json(new { isAuthenticated = false });
                }
                
                return Json(new
                {
                    isAuthenticated = true,
                    user = new
                    {
                        id = user.Id,
                        displayName = user.DisplayName,
                        email = user.Email,
                        photoUrl = user.PhotoURL
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thông tin người dùng hiện tại");
                return Json(new { isAuthenticated = false, error = "Có lỗi xảy ra khi lấy thông tin người dùng" });
            }
        }

        /// <summary>
        /// Trang profile người dùng
        /// </summary>
        /// <returns>View profile người dùng</returns>
        public async Task<IActionResult> Profile()
        {
            if (!_userService.IsAuthenticated())
            {
                return RedirectToAction("Login");
            }

            try
            {
                var user = await _userService.GetUserInfoAsync();
                
                if (user == null)
                {
                    TempData["ErrorMessage"] = "Không thể lấy thông tin người dùng. Vui lòng đăng nhập lại.";
                    return RedirectToAction("Login");
                }
                
                return View(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tải trang profile người dùng");
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi tải trang profile. Vui lòng thử lại sau.";
                return RedirectToAction("Index", "Home");
            }
        }
    }
} 