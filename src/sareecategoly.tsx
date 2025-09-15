"use client";

import { useEffect, useState, useMemo } from "react";
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
  const [catalog, setCatalog] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubfolder, setActiveSubfolder] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxItems, setLightboxItems] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    if (!searchQuery && selectedCategory === "all") return catalog;

    return catalog
      .map((category) => ({
        ...category,
        subfolders: category.subfolders.filter((sub) => {
          const matchesSearch =
            searchQuery === "" ||
            sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.name.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesCategory =
            selectedCategory === "all" ||
            category.name
              .toLowerCase()
              .includes(selectedCategory.toLowerCase());
          return matchesSearch && matchesCategory;
        }),
      }))
      .filter((category) => category.subfolders.length > 0);
  }, [catalog, searchQuery, selectedCategory]);

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

  // ---- Loading ----
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xl font-medium">Loading your collection...</p>
        </div>
      </div>
    );

  // ---- Error ----
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <CardContent>
            <p className="text-destructive text-lg font-semibold mb-4">
              {error}
            </p>
            <Button onClick={loadCatalog} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  // ---- Main UI ----
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                Saree Studio
              </h1>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Premium Collection
              </Badge>
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
                Cart
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
      <section className="bg-card/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-6 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search sarees, collections, or styles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            {["all", "silk", "cotton", "designer", "bridal", "casual"].map(
              (category) => (
                <Button
                  key={category}
                  variant={
                    selectedCategory === category ? "default" : "outline"
                  }
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category === "all" ? "All Collections" : category}
                </Button>
              )
            )}
          </div>
        </div>
      </section>

      {/* Catalog */}
      <main
        id="catalog"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        {filteredCatalog.map((category) => (
          <section key={category.id} className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4">
                {category.name}
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto"></div>
            </div>

            {category.subfolders.map((sub) => {
              const isActive = activeSubfolder === sub.id;
              const images = isActive ? sub.all : sub.preview;
              return (
                <div key={sub.id} className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-semibold">{sub.name}</h3>
                    {(sub.all.length > 6 || isActive) && (
                      <Button
                        variant="ghost"
                        onClick={() => toggleSubfolder(sub.id)}
                      >
                        {isActive
                          ? "Show Less"
                          : `View All (${sub.all.length})`}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {images.map((item, index) => (
                      <Card
                        key={item.id}
                        className="group overflow-hidden hover:shadow-xl transition-all"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                            onClick={() => openLightbox(images, index)}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-3">
                              <Button
                                size="sm"
                                variant="secondary"
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
                                onClick={() => openLightbox(images, index)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-6">
                          <h4 className="font-semibold text-lg mb-2 line-clamp-2">
                            {item.name}
                          </h4>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className="w-4 h-4 fill-current text-yellow-400"
                                />
                              ))}
                              <span className="text-sm ml-2">(4.8)</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleFavorite(item.id)}
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
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
                className="absolute top-4 right-4 bg-black/50 text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={prevImage}
                className="absolute left-4 bg-black/50 text-white rounded-full"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <img
                src={lightboxItems[lightboxIndex]?.image || ""}
                alt={lightboxItems[lightboxIndex]?.name || ""}
                className="max-h-[90vh] max-w-[90vw] rounded-lg"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={nextImage}
                className="absolute right-4 bg-black/50 text-white rounded-full"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
