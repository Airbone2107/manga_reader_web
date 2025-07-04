using MangaReaderLib.Enums;
using MangaReaderLib.DTOs.Common;
using MangaReaderLib.DTOs.Tags;

namespace MangaReaderLib.DTOs.Mangas
{
    public class MangaAttributesDto
    {
        public string Title { get; set; } = string.Empty;
        public string OriginalLanguage { get; set; } = string.Empty;
        public PublicationDemographic? PublicationDemographic { get; set; }
        public MangaStatus Status { get; set; }
        public int? Year { get; set; }
        public ContentRating ContentRating { get; set; }
        public bool IsLocked { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        public List<ResourceObject<TagInMangaAttributesDto>>? Tags { get; set; }
    }
} 