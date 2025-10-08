"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Heart,
  ShoppingBag,
  Star,
  Menu,
  Sparkles,
  Crown,
  Award,
  Filter,
  Grid3X3,
  List,
  Eye,
  Share2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---------- Types ----------
interface CatalogItem {
  id: string;
  name: string;
  image: string | null;
}

interface Subfolder {
  id: string;
  name: string;
  preview: CatalogItem[];
  all: CatalogItem[];
}

interface Category {
  id: string;
  name: string;
  subfolders: Subfolder[];
}

// ---------- Component ----------
export default function SareeCatalog() {
  const API_BASE = "https://saree-backend-j7zj.onrender.com";
  // const API_BASE = "http://localhost:5000";
  const [catalog, setCatalog] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubfolder, setActiveSubfolder] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxItems, setLightboxItems] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const categoryRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // ---- Utils ----
  async function tryFetchJson(url: string): Promise<any | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error("Fetch error:", err);
      return null;
    }
  }

  function normalizeFileObj(f: any): CatalogItem | null {
    if (!f) return null;
    const id: string = f.id || f.fileId || f.name;
    const name: string =
      f.name || f.title || f.fileName?.split(".").slice(0, -1).join(".") || id;
    const image: string | null =
      f.image || (id ? `https://drive.google.com/uc?id=${id}` : null);
    return { id, name, image };
  }

  function normalizeFilesArray(arr: unknown[] = []): CatalogItem[] {
    return arr
      .map(normalizeFileObj)
      .filter((f): f is CatalogItem => f !== null)
      .filter((v, i, a) => v.id && a.findIndex((x) => x.id === v.id) === i);
  }

  // ---- Fetch catalog ----
  async function loadCatalog() {
    setLoading(true);
    setError(null);

    const data = await tryFetchJson(`${API_BASE}/api/catalog`);
    console.log("📦 Catalog API response:", data);
    setLoading(false);

    if (!Array.isArray(data)) {
      setError("Cannot fetch catalog");
      setLoading(false);
      return;
    }

    const normalized: Category[] = data.map((cat) => ({
      id: cat.id,
      name: cat.name,
      subfolders: (cat.subfolders || []).map((sub: any) => {
        const preview = normalizeFilesArray(
          sub.preview || sub.files || []
        ).slice(0, 5);
        const all = normalizeFilesArray(sub.all || sub.files || []);
        return {
          id: sub.id,
          name: sub.name,
          preview,
          all: all.length ? all : preview,
        };
      }),
    }));

    console.log("✅ Normalized Catalog:", normalized);

    setCatalog(normalized);
    setLoading(false);
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  // ---- Filtering ----
  const filteredCatalog = useMemo(() => {
    if (!searchQuery && selectedCategories.size === 0) return catalog;

    return catalog
      .map((category) => ({
        ...category,
        subfolders: category.subfolders.filter((sub) => {
          const matchesSearch =
            searchQuery === "" ||
            sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.name.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesCategory =
            selectedCategories.size === 0 ||
            selectedCategories.has(category.id);
          return matchesSearch && matchesCategory;
        }),
      }))
      .filter((category) => category.subfolders.length > 0);
  }, [catalog, searchQuery, selectedCategories]);

  // ---- UI State Handlers ----
  function toggleSubfolder(subId: string) {
    setActiveSubfolder((prev) => (prev === subId ? null : subId));
  }

  function openLightbox(items: CatalogItem[], index: number) {
    setLightboxItems(items);
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxIndex(null);
    setLightboxItems([]);
  }

  function prevImage() {
    setLightboxIndex((prev) =>
      prev !== null ? (prev > 0 ? prev - 1 : lightboxItems.length - 1) : null
    );
  }

  function nextImage() {
    setLightboxIndex((prev) =>
      prev !== null ? (prev < lightboxItems.length - 1 ? prev + 1 : 0) : null
    );
  }

  function toggleFavorite(itemId: string) {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      return newFavorites;
    });
  }

  function scrollToCategory(categoryId: string) {
    const element = categoryRefs.current[categoryId];
    if (element) {
      const offset = 180; // Account for sticky headers
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }

  function toggleCategoryFilter(categoryId: string) {
    setSelectedCategories((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(categoryId)) {
        newSelected.delete(categoryId);
      } else {
        newSelected.add(categoryId);
      }
      return newSelected;
    });
  }

  function clearAllFilters() {
    setSelectedCategories(new Set());
    setSearchQuery("");
  }

  // ---- Loading ----
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-primary/5">
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-primary">
              Curating Excellence
            </h2>
            <p className="text-muted-foreground">
              Unveiling our premium saree collection...
            </p>
          </div>
        </motion.div>
      </div>
    );

  // ---- Error ----
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-8 text-center max-w-md shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Oops! Something went wrong
              </h3>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={loadCatalog} className="w-full">
                <ArrowRight className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );

  // ---- Main UI ----
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[70vh] overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5">
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
        <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-4xl space-y-6"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="w-8 h-8 text-primary" />
              <Badge
                variant="secondary"
                className="px-4 py-2 text-sm font-medium"
              >
                Premium Collection
              </Badge>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6 text-balance">
              Saree Studio
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-pretty">
              Where tradition meets elegance. Discover our curated collection of
              exquisite sarees crafted for the modern woman.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button size="lg" className="px-8 py-4 text-lg font-medium">
                <Sparkles className="w-5 h-5 mr-2" />
                Explore Collection
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-4 text-lg font-medium bg-transparent"
              >
                <Award className="w-5 h-5 mr-2" />
                Premium Catalog
              </Button>
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Crown className="w-8 h-8 text-primary" />
              <div>
                <h2 className="text-xl font-bold text-primary">Saree Studio</h2>
                <p className="text-xs text-muted-foreground">
                  Premium Collection
                </p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <a
                href="#catalog"
                className="hover:text-primary transition-colors font-medium"
              >
                Collection
              </a>
              <a
                href="#about"
                className="hover:text-primary transition-colors font-medium"
              >
                About
              </a>
              <a
                href="#contact"
                className="hover:text-primary transition-colors font-medium"
              >
                Contact
              </a>
              <Button size="sm" className="ml-4">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Cart ({favorites.size})
              </Button>
            </nav>

            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <section className="bg-card/30 border-y border-border backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search exquisite sarees, collections, or styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg border-2 border-border/50 focus:border-primary/50 bg-background/80 backdrop-blur-sm"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-border"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      Filter by Collection
                    </p>
                    {selectedCategories.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {catalog.map((category) => (
                      <Button
                        key={category.id}
                        variant={
                          selectedCategories.has(category.id)
                            ? "default"
                            : "outline"
                        }
                        onClick={() => toggleCategoryFilter(category.id)}
                        size="sm"
                        className="gap-2"
                      >
                        {category.name}
                        {selectedCategories.has(category.id) && (
                          <X className="w-3 h-3" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Filters Display */}
          {selectedCategories.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-3 flex-wrap"
            >
              <span className="text-sm font-medium text-muted-foreground">
                Active Filters:
              </span>
              {Array.from(selectedCategories).map((categoryId) => {
                const category = catalog.find((c) => c.id === categoryId);
                return (
                  <Badge
                    key={categoryId}
                    variant="secondary"
                    className="px-3 py-1 gap-2 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => toggleCategoryFilter(categoryId)}
                  >
                    {category?.name}
                    <X className="w-3 h-3" />
                  </Badge>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* Category Navigation - Dynamic Sticky Header */}
      {filteredCatalog.length > 0 && (
        <section className="sticky top-16 z-40 bg-background/95 backdrop-blur-xl border-b border-border shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 py-4 overflow-x-auto scrollbar-hide">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex gap-2 flex-nowrap">
                {filteredCatalog.map((category) => (
                  <Button
                    key={category.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => scrollToCategory(category.id)}
                    className="whitespace-nowrap hover:bg-primary/10 hover:text-primary transition-all duration-300 font-medium"
                  >
                    {category.name}
                    <Badge
                      variant="secondary"
                      className="ml-2 text-xs bg-primary/10"
                    >
                      {category.subfolders.length}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Catalog */}
      <main
        id="catalog"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        {filteredCatalog.map((category, categoryIndex) => (
          <motion.section
            key={category.id}
            ref={(el) => {
              categoryRefs.current[category.id] = el;
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
            className="mb-20 scroll-mt-32"
          >
            <div className="text-center mb-16">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: categoryIndex * 0.1 + 0.2 }}
                className="space-y-4"
              >
                <Badge
                  variant="outline"
                  className="px-4 py-2 text-sm font-medium mb-4"
                >
                  {category.name} Collection
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6 text-balance">
                  {category.name}
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-primary via-accent to-primary mx-auto rounded-full"></div>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
                  Discover the finest collection of{" "}
                  {category.name.toLowerCase()} sarees, each piece telling a
                  story of craftsmanship and elegance.
                </p>
              </motion.div>
            </div>

            {category.subfolders.map((sub, subIndex) => {
              const isActive = activeSubfolder === sub.id;
              const images = isActive ? sub.all : sub.preview;
              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: subIndex * 0.1 }}
                  className="mb-16"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-2">
                      <h3 className="text-2xl md:text-3xl font-semibold text-foreground">
                        {sub.name}
                      </h3>
                      <p className="text-muted-foreground">
                        {sub.all.length} exquisite pieces in this collection
                      </p>
                    </div>
                    {(sub.all.length > 6 || isActive) && (
                      <Button
                        variant="outline"
                        onClick={() => toggleSubfolder(sub.id)}
                        className="gap-2"
                      >
                        {isActive ? (
                          <>
                            <ChevronLeft className="w-4 h-4" />
                            Show Less
                          </>
                        ) : (
                          <>
                            View All ({sub.all.length})
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div
                    className={`grid gap-8 ${
                      viewMode === "grid"
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        : "grid-cols-1 md:grid-cols-2 gap-6"
                    }`}
                  >
                    {images.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        whileHover={{ y: -8 }}
                        className="group"
                      >
                        <Card className="overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 bg-card/80 backdrop-blur-sm">
                          <div className="relative aspect-[3/4] overflow-hidden">
                            <img
                              src={
                                item.image ||
                                "/placeholder.svg?height=600&width=450&query=elegant saree"
                              }
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer"
                              onClick={() => openLightbox(images, index)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="flex gap-3">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="backdrop-blur-sm bg-background/80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(item.id);
                                  }}
                                >
                                  <Heart
                                    className={`w-4 h-4 ${
                                      favorites.has(item.id)
                                        ? "fill-current text-red-500"
                                        : ""
                                    }`}
                                  />
                                </Button>
                                <Button
                                  size="sm"
                                  className="backdrop-blur-sm"
                                  onClick={() => openLightbox(images, index)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="backdrop-blur-sm bg-background/80"
                                >
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <Badge className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm">
                              Premium
                            </Badge>
                          </div>
                          <CardContent className="p-6 space-y-4">
                            <div>
                              <h4 className="font-semibold text-lg mb-2 line-clamp-2 text-balance">
                                {item.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Handcrafted with premium materials
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className="w-4 h-4 fill-current text-yellow-400"
                                  />
                                ))}
                                <span className="text-sm ml-2 text-muted-foreground">
                                  (4.9)
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleFavorite(item.id)}
                                className="hover:bg-red-50 hover:text-red-500"
                              >
                                <Heart
                                  className={`w-4 h-4 ${
                                    favorites.has(item.id)
                                      ? "fill-current text-red-500"
                                      : ""
                                  }`}
                                />
                              </Button>
                            </div>
                            <div className="pt-2 border-t border-border/50">
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-primary">
                                  ₹12,999
                                </span>
                                <Button size="sm" className="gap-2">
                                  <ShoppingBag className="w-4 h-4" />
                                  Add to Cart
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.section>
        ))}
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative flex items-center max-w-7xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={closeLightbox}
                className="absolute top-4 right-4 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
              >
                <X className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={prevImage}
                className="absolute left-4 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <div className="w-full flex justify-center">
                <img
                  src={lightboxItems[lightboxIndex]?.image || ""}
                  alt={lightboxItems[lightboxIndex]?.name || ""}
                  className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextImage}
                className="absolute right-4 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-sm">
                <p className="text-sm font-medium">
                  {lightboxItems[lightboxIndex]?.name}
                </p>
                <p className="text-xs text-gray-300">
                  {lightboxIndex + 1} of {lightboxItems.length}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-card/50 border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center space-y-8">
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-8 h-8 text-primary" />
              <h3 className="text-2xl font-bold text-primary">Saree Studio</h3>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto text-pretty">
              Celebrating the timeless beauty of Indian craftsmanship through
              our curated collection of premium sarees.
            </p>
            <div className="flex justify-center gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Contact Us
              </a>
            </div>
            <div className="pt-8 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                © 2024 Saree Studio. Crafted with love for tradition and
                elegance.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// "use client";

// import { useEffect, useState, useMemo } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   X,
//   ChevronLeft,
//   ChevronRight,
//   Search,
//   Heart,
//   ShoppingBag,
//   Star,
//   Menu,
//   Sparkles,
//   Crown,
//   Award,
//   Filter,
//   Grid3X3,
//   List,
//   Eye,
//   Share2,
//   ArrowRight,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";

// // ---------- Types ----------
// interface CatalogItem {
//   id: string;
//   name: string;
//   image: string | null;
// }

// interface Subfolder {
//   id: string;
//   name: string;
//   preview: CatalogItem[];
//   all: CatalogItem[];
// }

// interface Category {
//   id: string;
//   name: string;
//   subfolders: Subfolder[];
// }

// // ---------- Component ----------
// export default function SareeCatalog() {
//   // const API_BASE = "https://saree-backend-j7zj.onrender.com";
//   const API_BASE = "http://localhost:5000";
//   const [catalog, setCatalog] = useState<Category[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [activeSubfolder, setActiveSubfolder] = useState<string | null>(null);
//   const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
//   const [lightboxItems, setLightboxItems] = useState<CatalogItem[]>([]);
//   const [error, setError] = useState<string | null>(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedCategory, setSelectedCategory] = useState("all");
//   const [favorites, setFavorites] = useState<Set<string>>(new Set());
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
//   const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
//   const [showFilters, setShowFilters] = useState(false);

//   // ---- Utils ----
//   async function tryFetchJson(url: string): Promise<any | null> {
//     try {
//       const res = await fetch(url);
//       if (!res.ok) return null;
//       return await res.json();
//     } catch (err) {
//       console.error("Fetch error:", err);
//       return null;
//     }
//   }

//   function normalizeFileObj(f: any): CatalogItem | null {
//     if (!f) return null;
//     const id: string = f.id || f.fileId || f.name;
//     const name: string =
//       f.name || f.title || f.fileName?.split(".").slice(0, -1).join(".") || id;
//     const image: string | null =
//       f.image || (id ? `https://drive.google.com/uc?id=${id}` : null);
//     return { id, name, image };
//   }

//   function normalizeFilesArray(arr: unknown[] = []): CatalogItem[] {
//     return arr
//       .map(normalizeFileObj)
//       .filter((f): f is CatalogItem => f !== null)
//       .filter((v, i, a) => v.id && a.findIndex((x) => x.id === v.id) === i);
//   }

//   // ---- Fetch catalog ----
//   async function loadCatalog() {
//     setLoading(true);
//     setError(null);

//     const data = await tryFetchJson(`${API_BASE}/api/catalog`);
//     console.log("📦 Catalog API response:", data);
//     setLoading(false);

//     if (!Array.isArray(data)) {
//       setError("Cannot fetch catalog");
//       setLoading(false);
//       return;
//     }

//     const normalized: Category[] = data.map((cat) => ({
//       id: cat.id,
//       name: cat.name,
//       subfolders: (cat.subfolders || []).map((sub: any) => {
//         const preview = normalizeFilesArray(
//           sub.preview || sub.files || []
//         ).slice(0, 5);
//         const all = normalizeFilesArray(sub.all || sub.files || []);
//         return {
//           id: sub.id,
//           name: sub.name,
//           preview,
//           all: all.length ? all : preview,
//         };
//       }),
//     }));

//     console.log("✅ Normalized Catalog:", normalized);

//     setCatalog(normalized);
//     setLoading(false);
//   }

//   useEffect(() => {
//     loadCatalog();
//   }, []);

//   // ---- Filtering ----
//   const filteredCatalog = useMemo(() => {
//     if (!searchQuery && selectedCategory === "all") return catalog;

//     return catalog
//       .map((category) => ({
//         ...category,
//         subfolders: category.subfolders.filter((sub) => {
//           const matchesSearch =
//             searchQuery === "" ||
//             sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//             category.name.toLowerCase().includes(searchQuery.toLowerCase());
//           const matchesCategory =
//             selectedCategory === "all" ||
//             category.name
//               .toLowerCase()
//               .includes(selectedCategory.toLowerCase());
//           return matchesSearch && matchesCategory;
//         }),
//       }))
//       .filter((category) => category.subfolders.length > 0);
//   }, [catalog, searchQuery, selectedCategory]);

//   // ---- UI State Handlers ----
//   function toggleSubfolder(subId: string) {
//     setActiveSubfolder((prev) => (prev === subId ? null : subId));
//   }

//   function openLightbox(items: CatalogItem[], index: number) {
//     setLightboxItems(items);
//     setLightboxIndex(index);
//   }

//   function closeLightbox() {
//     setLightboxIndex(null);
//     setLightboxItems([]);
//   }

//   function prevImage() {
//     setLightboxIndex((prev) =>
//       prev !== null ? (prev > 0 ? prev - 1 : lightboxItems.length - 1) : null
//     );
//   }

//   function nextImage() {
//     setLightboxIndex((prev) =>
//       prev !== null ? (prev < lightboxItems.length - 1 ? prev + 1 : 0) : null
//     );
//   }

//   function toggleFavorite(itemId: string) {
//     setFavorites((prev) => {
//       const newFavorites = new Set(prev);
//       if (newFavorites.has(itemId)) {
//         newFavorites.delete(itemId);
//       } else {
//         newFavorites.add(itemId);
//       }
//       return newFavorites;
//     });
//   }

//   // ---- Loading ----
//   if (loading)
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-primary/5">
//         <motion.div
//           className="text-center space-y-6"
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.6 }}
//         >
//           <div className="relative">
//             <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
//             <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
//           </div>
//           <div className="space-y-2">
//             <h2 className="text-2xl font-bold text-primary">
//               Curating Excellence
//             </h2>
//             <p className="text-muted-foreground">
//               Unveiling our premium saree collection...
//             </p>
//           </div>
//         </motion.div>
//       </div>
//     );

//   // ---- Error ----
//   if (error)
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
//         <motion.div
//           initial={{ opacity: 0, scale: 0.9 }}
//           animate={{ opacity: 1, scale: 1 }}
//           transition={{ duration: 0.5 }}
//         >
//           <Card className="p-8 text-center max-w-md shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
//             <CardContent className="space-y-4">
//               <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
//                 <X className="w-8 h-8 text-destructive" />
//               </div>
//               <h3 className="text-xl font-semibold text-foreground">
//                 Oops! Something went wrong
//               </h3>
//               <p className="text-muted-foreground">{error}</p>
//               <Button onClick={loadCatalog} className="w-full">
//                 <ArrowRight className="w-4 h-4 mr-2" />
//                 Try Again
//               </Button>
//             </CardContent>
//           </Card>
//         </motion.div>
//       </div>
//     );

//   // ---- Main UI ----
//   return (
//     <div className="min-h-screen bg-background">
//       {/* Hero Section */}
//       <section className="relative h-[70vh] overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/10 to-accent/5 paisley-pattern">
//         <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
//         <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
//           <motion.div
//             initial={{ opacity: 0, y: 30 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.8, delay: 0.2 }}
//             className="max-w-4xl space-y-6"
//           >
//             <div className="flex items-center justify-center gap-2 mb-4">
//               <Crown className="w-8 h-8 text-primary" />
//               <Badge
//                 variant="secondary"
//                 className="px-4 py-2 text-sm font-medium"
//               >
//                 Premium Collection
//               </Badge>
//             </div>
//             <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6 text-balance">
//               Saree Studio
//             </h1>
//             <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-pretty">
//               Where tradition meets elegance. Discover our curated collection of
//               exquisite sarees crafted for the modern woman.
//             </p>
//             <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
//               <Button size="lg" className="px-8 py-4 text-lg font-medium">
//                 <Sparkles className="w-5 h-5 mr-2" />
//                 Explore Collection
//               </Button>
//               <Button
//                 size="lg"
//                 variant="outline"
//                 className="px-8 py-4 text-lg font-medium bg-transparent"
//               >
//                 <Award className="w-5 h-5 mr-2" />
//                 Premium Catalog
//               </Button>
//             </div>
//           </motion.div>
//         </div>
//         <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
//       </section>

//       {/* Header */}
//       <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border shadow-lg">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between h-16">
//             <div className="flex items-center space-x-4">
//               <Crown className="w-8 h-8 text-primary" />
//               <div>
//                 <h2 className="text-xl font-bold text-primary">Saree Studio</h2>
//                 <p className="text-xs text-muted-foreground">
//                   Premium Collection
//                 </p>
//               </div>
//             </div>

//             <nav className="hidden md:flex items-center space-x-8">
//               <a
//                 href="#catalog"
//                 className="hover:text-primary transition-colors font-medium"
//               >
//                 Collection
//               </a>
//               <a
//                 href="#about"
//                 className="hover:text-primary transition-colors font-medium"
//               >
//                 About
//               </a>
//               <a
//                 href="#contact"
//                 className="hover:text-primary transition-colors font-medium"
//               >
//                 Contact
//               </a>
//               <Button size="sm" className="ml-4">
//                 <ShoppingBag className="w-4 h-4 mr-2" />
//                 Cart ({favorites.size})
//               </Button>
//             </nav>

//             <Button
//               variant="ghost"
//               size="sm"
//               className="md:hidden"
//               onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
//             >
//               <Menu className="w-5 h-5" />
//             </Button>
//           </div>
//         </div>
//       </header>

//       {/* Search & Filters */}
//       <section className="bg-card/30 border-y border-border backdrop-blur-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           <div className="flex flex-col lg:flex-row gap-6 items-center">
//             <div className="flex-1 relative">
//               <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
//               <Input
//                 placeholder="Search exquisite sarees, collections, or styles..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="pl-12 h-14 text-lg border-2 border-border/50 focus:border-primary/50 bg-background/80 backdrop-blur-sm"
//               />
//             </div>
//             <div className="flex items-center gap-4">
//               <div className="flex gap-2">
//                 <Button
//                   variant={viewMode === "grid" ? "default" : "outline"}
//                   size="sm"
//                   onClick={() => setViewMode("grid")}
//                 >
//                   <Grid3X3 className="w-4 h-4" />
//                 </Button>
//                 <Button
//                   variant={viewMode === "list" ? "default" : "outline"}
//                   size="sm"
//                   onClick={() => setViewMode("list")}
//                 >
//                   <List className="w-4 h-4" />
//                 </Button>
//               </div>
//               <Button
//                 variant="outline"
//                 onClick={() => setShowFilters(!showFilters)}
//                 className="gap-2"
//               >
//                 <Filter className="w-4 h-4" />
//                 Filters
//               </Button>
//             </div>
//           </div>

//           <AnimatePresence>
//             {showFilters && (
//               <motion.div
//                 initial={{ opacity: 0, height: 0 }}
//                 animate={{ opacity: 1, height: "auto" }}
//                 exit={{ opacity: 0, height: 0 }}
//                 className="mt-6 pt-6 border-t border-border"
//               >
//                 <div className="flex gap-3 flex-wrap">
//                   {[
//                     "all",
//                     "silk",
//                     "cotton",
//                     "designer",
//                     "bridal",
//                     "casual",
//                     "party",
//                     "traditional",
//                   ].map((category) => (
//                     <Button
//                       key={category}
//                       variant={
//                         selectedCategory === category ? "default" : "outline"
//                       }
//                       onClick={() => setSelectedCategory(category)}
//                       className="capitalize"
//                       size="sm"
//                     >
//                       {category === "all" ? "All Collections" : category}
//                     </Button>
//                   ))}
//                 </div>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
//       </section>

//       {/* Catalog */}
//       <main
//         id="catalog"
//         className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
//       >
//         {filteredCatalog.map((category, categoryIndex) => (
//           <motion.section
//             key={category.id}
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
//             className="mb-20"
//           >
//             <div className="text-center mb-16">
//               <motion.div
//                 initial={{ scale: 0.9 }}
//                 animate={{ scale: 1 }}
//                 transition={{ duration: 0.5, delay: categoryIndex * 0.1 + 0.2 }}
//                 className="space-y-4"
//               >
//                 <Badge
//                   variant="outline"
//                   className="px-4 py-2 text-sm font-medium mb-4"
//                 >
//                   {category.name} Collection
//                 </Badge>
//                 <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6 text-balance">
//                   {category.name}
//                 </h2>
//                 <div className="w-32 h-1 bg-gradient-to-r from-primary via-accent to-primary mx-auto rounded-full"></div>
//                 <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
//                   Discover the finest collection of{" "}
//                   {category.name.toLowerCase()} sarees, each piece telling a
//                   story of craftsmanship and elegance.
//                 </p>
//               </motion.div>
//             </div>

//             {category.subfolders.map((sub, subIndex) => {
//               const isActive = activeSubfolder === sub.id;
//               const images = isActive ? sub.all : sub.preview;
//               return (
//                 <motion.div
//                   key={sub.id}
//                   initial={{ opacity: 0, y: 20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ duration: 0.5, delay: subIndex * 0.1 }}
//                   className="mb-16"
//                 >
//                   <div className="flex items-center justify-between mb-8">
//                     <div className="space-y-2">
//                       <h3 className="text-2xl md:text-3xl font-semibold text-foreground">
//                         {sub.name}
//                       </h3>
//                       <p className="text-muted-foreground">
//                         {sub.all.length} exquisite pieces in this collection
//                       </p>
//                     </div>
//                     {(sub.all.length > 6 || isActive) && (
//                       <Button
//                         variant="outline"
//                         onClick={() => toggleSubfolder(sub.id)}
//                         className="gap-2"
//                       >
//                         {isActive ? (
//                           <>
//                             <ChevronLeft className="w-4 h-4" />
//                             Show Less
//                           </>
//                         ) : (
//                           <>
//                             View All ({sub.all.length})
//                             <ChevronRight className="w-4 h-4" />
//                           </>
//                         )}
//                       </Button>
//                     )}
//                   </div>

//                   <div
//                     className={`grid gap-8 ${
//                       viewMode === "grid"
//                         ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
//                         : "grid-cols-1 md:grid-cols-2 gap-6"
//                     }`}
//                   >
//                     {images.map((item, index) => (
//                       <motion.div
//                         key={item.id}
//                         initial={{ opacity: 0, scale: 0.9 }}
//                         animate={{ opacity: 1, scale: 1 }}
//                         transition={{ duration: 0.4, delay: index * 0.05 }}
//                         whileHover={{ y: -8 }}
//                         className="group"
//                       >
//                         <Card className="overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 bg-card/80 backdrop-blur-sm">
//                           <div className="relative aspect-[3/4] overflow-hidden">
//                             <img
//                               src={
//                                 item.image ||
//                                 "/placeholder.svg?height=600&width=450&query=elegant saree"
//                               }
//                               alt={item.name}
//                               className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer"
//                               onClick={() => openLightbox(images, index)}
//                             />
//                             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
//                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
//                               <div className="flex gap-3">
//                                 <Button
//                                   size="sm"
//                                   variant="secondary"
//                                   className="backdrop-blur-sm bg-background/80"
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     toggleFavorite(item.id);
//                                   }}
//                                 >
//                                   <Heart
//                                     className={`w-4 h-4 ${
//                                       favorites.has(item.id)
//                                         ? "fill-current text-red-500"
//                                         : ""
//                                     }`}
//                                   />
//                                 </Button>
//                                 <Button
//                                   size="sm"
//                                   className="backdrop-blur-sm"
//                                   onClick={() => openLightbox(images, index)}
//                                 >
//                                   <Eye className="w-4 h-4 mr-2" />
//                                   View
//                                 </Button>
//                                 <Button
//                                   size="sm"
//                                   variant="secondary"
//                                   className="backdrop-blur-sm bg-background/80"
//                                 >
//                                   <Share2 className="w-4 h-4" />
//                                 </Button>
//                               </div>
//                             </div>
//                             <Badge className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm">
//                               Premium
//                             </Badge>
//                           </div>
//                           <CardContent className="p-6 space-y-4">
//                             <div>
//                               <h4 className="font-semibold text-lg mb-2 line-clamp-2 text-balance">
//                                 {item.name}
//                               </h4>
//                               <p className="text-sm text-muted-foreground">
//                                 Handcrafted with premium materials
//                               </p>
//                             </div>
//                             <div className="flex items-center justify-between">
//                               <div className="flex items-center gap-1">
//                                 {[...Array(5)].map((_, i) => (
//                                   <Star
//                                     key={i}
//                                     className="w-4 h-4 fill-current text-yellow-400"
//                                   />
//                                 ))}
//                                 <span className="text-sm ml-2 text-muted-foreground">
//                                   (4.9)
//                                 </span>
//                               </div>
//                               <Button
//                                 size="sm"
//                                 variant="ghost"
//                                 onClick={() => toggleFavorite(item.id)}
//                                 className="hover:bg-red-50 hover:text-red-500"
//                               >
//                                 <Heart
//                                   className={`w-4 h-4 ${
//                                     favorites.has(item.id)
//                                       ? "fill-current text-red-500"
//                                       : ""
//                                   }`}
//                                 />
//                               </Button>
//                             </div>
//                             <div className="pt-2 border-t border-border/50">
//                               <div className="flex items-center justify-between">
//                                 <span className="text-lg font-bold text-primary">
//                                   ₹12,999
//                                 </span>
//                                 <Button size="sm" className="gap-2">
//                                   <ShoppingBag className="w-4 h-4" />
//                                   Add to Cart
//                                 </Button>
//                               </div>
//                             </div>
//                           </CardContent>
//                         </Card>
//                       </motion.div>
//                     ))}
//                   </div>
//                 </motion.div>
//               );
//             })}
//           </motion.section>
//         ))}
//       </main>

//       {/* Lightbox */}
//       <AnimatePresence>
//         {lightboxIndex !== null && (
//           <motion.div
//             className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             onClick={closeLightbox}
//           >
//             <motion.div
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               className="relative flex items-center max-w-7xl w-full"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={closeLightbox}
//                 className="absolute top-4 right-4 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
//               >
//                 <X className="w-5 h-5" />
//               </Button>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={prevImage}
//                 className="absolute left-4 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
//               >
//                 <ChevronLeft className="w-6 h-6" />
//               </Button>
//               <div className="w-full flex justify-center">
//                 <img
//                   src={lightboxItems[lightboxIndex]?.image || ""}
//                   alt={lightboxItems[lightboxIndex]?.name || ""}
//                   className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
//                 />
//               </div>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={nextImage}
//                 className="absolute right-4 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
//               >
//                 <ChevronRight className="w-6 h-6" />
//               </Button>
//               <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-sm">
//                 <p className="text-sm font-medium">
//                   {lightboxItems[lightboxIndex]?.name}
//                 </p>
//                 <p className="text-xs text-gray-300">
//                   {lightboxIndex + 1} of {lightboxItems.length}
//                 </p>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Footer */}
//       <footer className="bg-card/50 border-t border-border mt-20">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
//           <div className="text-center space-y-8">
//             <div className="flex items-center justify-center gap-2">
//               <Crown className="w-8 h-8 text-primary" />
//               <h3 className="text-2xl font-bold text-primary">Saree Studio</h3>
//             </div>
//             <p className="text-muted-foreground max-w-2xl mx-auto text-pretty">
//               Celebrating the timeless beauty of Indian craftsmanship through
//               our curated collection of premium sarees.
//             </p>
//             <div className="flex justify-center gap-8 text-sm text-muted-foreground">
//               <a href="#" className="hover:text-primary transition-colors">
//                 Privacy Policy
//               </a>
//               <a href="#" className="hover:text-primary transition-colors">
//                 Terms of Service
//               </a>
//               <a href="#" className="hover:text-primary transition-colors">
//                 Contact Us
//               </a>
//             </div>
//             <div className="pt-8 border-t border-border/50">
//               <p className="text-sm text-muted-foreground">
//                 © 2024 Saree Studio. Crafted with love for tradition and
//                 elegance.
//               </p>
//             </div>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }
