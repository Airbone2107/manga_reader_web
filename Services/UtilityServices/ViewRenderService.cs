using Microsoft.AspNetCore.Mvc;

namespace manga_reader_web.Services.UtilityServices
{
    /// <summary>
    /// Service xử lý việc render view dựa trên loại request (HTMX hoặc thông thường)
    /// </summary>
    public class ViewRenderService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        
        public ViewRenderService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }
        
        /// <summary>
        /// Quyết định trả về View hay PartialView dựa vào loại request
        /// </summary>
        /// <param name="controller">Controller hiện tại</param>
        /// <param name="viewName">Tên view (nullable, sẽ dùng tên action mặc định nếu null)</param>
        /// <param name="model">Model để truyền vào view</param>
        /// <returns>ActionResult phù hợp với loại request</returns>
        public IActionResult RenderViewBasedOnRequest(Controller controller, string viewName, object model)
        {
            var httpContext = _httpContextAccessor.HttpContext;
            
            // Kiểm tra nếu là HTMX request
            if (httpContext != null && httpContext.Request.Headers.ContainsKey("HX-Request"))
            {
                return controller.PartialView(viewName, model);
            }
            
            return controller.View(viewName, model);
        }
        
        /// <summary>
        /// Overload của phương thức RenderViewBasedOnRequest không yêu cầu tên view cụ thể
        /// </summary>
        public IActionResult RenderViewBasedOnRequest(Controller controller, object model)
        {
            return RenderViewBasedOnRequest(controller, null, model);
        }
    }
}
