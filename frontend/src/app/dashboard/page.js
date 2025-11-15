"use client";

import { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { newsAPI, userAPI } from "@/lib/api";
import { useAuthStore, useNewsStore } from "@/lib/store";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FiSearch, FiFilter } from "react-icons/fi";
import toast from "react-hot-toast";

const CATEGORIES = [
  { value: "", label: "All News" },
  { value: "technology", label: "Technology" },
  { value: "business", label: "Business" },
  { value: "science", label: "Science" },
  { value: "health", label: "Health" },
  { value: "entertainment", label: "Entertainment" },
  { value: "sports", label: "Sports" },
];

// Helper function to generate consistent articleId
const generateArticleId = (article) => {
  if (article.articleId) return article.articleId;

  const str = `${article.title}-${article.publishedAt}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString();
};

export default function DashboardPage() {
  const { isAuthenticated } = useAuthStore();
  const { favorites, setFavorites } = useNewsStore();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch news
  const {
    data: newsData,
    isLoading,
    error,
  } = useQuery(
    ["news", selectedCategory, debouncedSearch],
    async () => {
      if (debouncedSearch) {
        const response = await newsAPI.searchNews(debouncedSearch);
        return response.data;
      } else {
        const params = selectedCategory ? { category: selectedCategory } : {};
        const response = await newsAPI.getNews(params);
        return response.data;
      }
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    }
  );

  // Fetch favorites if authenticated
  const { data: favoritesData } = useQuery(
    ["favorites"],
    async () => {
      const response = await userAPI.getFavorites();
      return response.data;
    },
    {
      enabled: isAuthenticated,
      onSuccess: (data) => {
        setFavorites(data.data?.favorites || []);
      },
    }
  );

  const handleFavoriteToggle = async (article) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to save favorites");
      return;
    }

    // Ensure article has articleId
    const articleId = generateArticleId(article);
    const isFavorited = favorites.some((fav) => fav.articleId === articleId);

    try {
      if (isFavorited) {
        await userAPI.removeFavorite(articleId);
        setFavorites(favorites.filter((fav) => fav.articleId !== articleId));
        toast.success("Removed from favorites");
      } else {
        const favoriteData = {
          articleId: articleId,
          title: article.title,
          url: article.url,
          source: article.source?.name || "Unknown",
        };

        console.log("Saving favorite:", favoriteData); // Debug log

        const response = await userAPI.addFavorite(favoriteData);
        setFavorites([...favorites, favoriteData]);
        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Favorite toggle error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update favorites"
      );
    }
  };

  const isFavorited = (article) => {
    const articleId = generateArticleId(article);
    return favorites.some((fav) => fav.articleId === articleId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {debouncedSearch
              ? `Search Results for "${debouncedSearch}"`
              : "Latest News"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Stay updated with AI-powered news summaries
          </p>
        </div>

        {/* Filters and Search */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news..."
              className="input-field pl-10"
            />
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <FiFilter className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
            {CATEGORIES.map((category) => (
              <button
                key={category.value}
                onClick={() => {
                  setSelectedCategory(category.value);
                  setSearchQuery("");
                }}
                className={`category-badge flex-shrink-0 ${
                  selectedCategory === category.value
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* News Grid */}
        {isLoading ? (
          <LoadingSpinner size="lg" />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">
              Failed to load news. Please try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        ) : newsData?.data?.articles?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No articles found. Try a different search or category.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newsData?.data?.articles?.map((article, index) => {
                // Ensure each article has an articleId
                const articleWithId = {
                  ...article,
                  articleId: generateArticleId(article),
                };

                return (
                  <NewsCard
                    key={articleWithId.articleId}
                    article={articleWithId}
                    onFavoriteToggle={handleFavoriteToggle}
                    isFavorited={isFavorited(articleWithId)}
                  />
                );
              })}
            </div>

            {/* Results Info */}
            {newsData?.results && (
              <div className="mt-8 text-center text-gray-600 dark:text-gray-400">
                Showing {newsData.results} of{" "}
                {newsData.totalResults || newsData.results} articles
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
