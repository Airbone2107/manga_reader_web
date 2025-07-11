using MangaReaderLib.DTOs.Common;
using MangaReaderLib.DTOs.Tags;
using MangaReaderLib.Services.Interfaces;
using Microsoft.Extensions.Logging;
using System.Text;

namespace MangaReaderLib.Services.Implementations
{
    public class TagClient : ITagClient
    {
        private readonly IApiClient _apiClient;
        private readonly ILogger<TagClient> _logger;

        public TagClient(IApiClient apiClient, ILogger<TagClient> logger)
        {
            _apiClient = apiClient ?? throw new ArgumentNullException(nameof(apiClient));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }
        
        private string BuildQueryString(string baseUri, Dictionary<string, List<string>> queryParams)
        {
            var queryString = new StringBuilder();
            if (queryParams != null && queryParams.Any())
            {
                bool firstParam = true;
                foreach (var param in queryParams)
                {
                    if (param.Value != null && param.Value.Any())
                    {
                        foreach (var value in param.Value)
                        {
                            if (string.IsNullOrEmpty(value)) continue;

                            if (firstParam)
                            {
                                queryString.Append("?");
                                firstParam = false;
                            }
                            else
                            {
                                queryString.Append("&");
                            }
                            queryString.Append($"{Uri.EscapeDataString(param.Key)}={Uri.EscapeDataString(value)}");
                        }
                    }
                }
            }
            return $"{baseUri}{queryString}";
        }

        private void AddQueryParam(Dictionary<string, List<string>> queryParams, string key, string? value)
        {
            if (!string.IsNullOrEmpty(value))
            {
                if (!queryParams.ContainsKey(key))
                {
                    queryParams[key] = new List<string>();
                }
                queryParams[key].Add(value);
            }
        }

        public async Task<ApiCollectionResponse<ResourceObject<TagAttributesDto>>?> GetTagsAsync(
            int? offset = null, int? limit = null, Guid? tagGroupId = null, string? nameFilter = null, 
            string? orderBy = null, bool? ascending = null, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Getting tags with filters: TagGroupId={TagGroupId}, NameFilter={NameFilter}", 
                tagGroupId, nameFilter);
            
            var queryParams = new Dictionary<string, List<string>>();
            AddQueryParam(queryParams, "offset", offset?.ToString());
            AddQueryParam(queryParams, "limit", limit?.ToString());
            AddQueryParam(queryParams, "tagGroupId", tagGroupId?.ToString());
            AddQueryParam(queryParams, "nameFilter", nameFilter);
            AddQueryParam(queryParams, "orderBy", orderBy);
            AddQueryParam(queryParams, "ascending", ascending?.ToString().ToLower());
            
            string requestUri = BuildQueryString("Tags", queryParams);
            return await _apiClient.GetAsync<ApiCollectionResponse<ResourceObject<TagAttributesDto>>>(requestUri, cancellationToken);
        }
        
        public async Task<ApiResponse<ResourceObject<TagAttributesDto>>?> GetTagByIdAsync(Guid tagId, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Getting tag by ID: {TagId}", tagId);
            return await _apiClient.GetAsync<ApiResponse<ResourceObject<TagAttributesDto>>>($"Tags/{tagId}", cancellationToken);
        }

        public async Task<ApiResponse<ResourceObject<TagAttributesDto>>?> CreateTagAsync(CreateTagRequestDto request, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Creating new tag: {Name} in group: {TagGroupId}", request.Name, request.TagGroupId);
            return await _apiClient.PostAsync<CreateTagRequestDto, ApiResponse<ResourceObject<TagAttributesDto>>>("Tags", request, cancellationToken);
        }

        public async Task UpdateTagAsync(Guid tagId, UpdateTagRequestDto request, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Updating tag with ID: {TagId}", tagId);
            await _apiClient.PutAsync($"Tags/{tagId}", request, cancellationToken);
        }

        public async Task DeleteTagAsync(Guid tagId, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Deleting tag with ID: {TagId}", tagId);
            await _apiClient.DeleteAsync($"Tags/{tagId}", cancellationToken);
        }
    }
} 