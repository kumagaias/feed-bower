"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import NestSVG from "./NestSVG";
import EggSVG from "./EggSVG";
import Toast from "./Toast";
import BowerIcon from "./BowerIcon";
import BirdSVG from "./BirdSVG";
import BalloonSVG from "./BalloonSVG";
import { colors as themeColors } from "@/styles/colors";

interface FloatingKeyword {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface Egg {
  id: string;
  keyword: string;
  color: string;
}

export default function BowerCreator() {
  const router = useRouter();
  const { language, bowers, setBowers } = useApp();
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const isKeywordEditMode = searchParams?.get("mode") === "keywords";
  const isModalMode = searchParams?.get("modal") === "true";
  const [floatingKeywords, setFloatingKeywords] = useState<FloatingKeyword[]>(
    []
  );
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [draggedKeyword, setDraggedKeyword] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "warning">(
    "warning"
  );
  const [userQuery, setUserQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editingBowerId, setEditingBowerId] = useState<string | null>(null);
  const nestRef = useRef<HTMLDivElement>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [tappedItem, setTappedItem] = useState<string | null>(null);

  const colors = [
    themeColors.tertiary,
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    themeColors.tertiary,
    "#DDA0DD",
    "#98D8C8",
  ];

  // Random keywords pool
  const keywordPool =
    language === "ja"
      ? [
          "テクノロジー",
          "AI",
          "機械学習",
          "プログラミング",
          "デザイン",
          "スタートアップ",
          "イノベーション",
          "データサイエンス",
          "クラウド",
          "セキュリティ",
          "モバイル",
          "ウェブ開発",
          "アプリ開発",
          "ブロックチェーン",
          "IoT",
          "VR",
          "AR",
          "ゲーム",
          "エンターテイメント",
          "ビジネス",
          "マーケティング",
          "ソーシャルメディア",
          "健康",
          "フィットネス",
          "料理",
          "旅行",
          "ファッション",
          "音楽",
          "映画",
          "読書",
          "教育",
          "科学",
          "環境",
          "サステナビリティ",
          "アート",
          "写真",
        ]
      : [
          "Technology",
          "AI",
          "Machine Learning",
          "Programming",
          "Design",
          "Startup",
          "Innovation",
          "Data Science",
          "Cloud",
          "Security",
          "Mobile",
          "Web Dev",
          "App Development",
          "Blockchain",
          "IoT",
          "VR",
          "AR",
          "Gaming",
          "Entertainment",
          "Business",
          "Marketing",
          "Social Media",
          "Health",
          "Fitness",
          "Cooking",
          "Travel",
          "Fashion",
          "Music",
          "Movies",
          "Reading",
          "Education",
          "Science",
          "Environment",
          "Sustainability",
          "Art",
          "Photography",
        ];

  // Generate keywords based on user query
  const generateRandomKeywords = (query: string = "") => {
    let pool = keywordPool;

    // Filter keywords based on query if provided
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      pool = keywordPool.filter((k) => k.toLowerCase().includes(lowerQuery));

      // If no matches, use all keywords
      if (pool.length === 0) {
        pool = keywordPool;
      }
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    // Randomly select keywords based on screen size
    // Mobile (< 768px): 6-8 keywords, PC (>= 768px): 6-8 keywords
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const minCount = 6;
    const maxCount = 8;
    const count =
      Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    const selected = shuffled.slice(0, count);

    // Generate non-overlapping positions with better spacing
    const positions: { x: number; y: number; width: number; height: number }[] =
      [];

    return selected.map((keyword, index) => {
      // Estimate keyword dimensions more accurately
      const estimatedWidth = keyword.length * 14 + 48; // ~14px per char + padding (increased)
      const estimatedHeight = 48; // Height of keyword badge
      const minDistance = 240; // Even more increased minimum distance

      // Use very wide area to reduce crowding
      let x: number = Math.random() * 600 + 30; // Very wide range: 30-630
      let y: number = Math.random() * 220 + 10; // Wider range: 10-230
      let attempts = 0;

      while (attempts < 100) {
        let hasOverlap = false;

        for (const pos of positions) {
          const distance = Math.sqrt(
            Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2)
          );
          // Calculate required distance based on both widths and heights
          const avgWidth = (estimatedWidth + pos.width) / 2;
          const avgHeight = (estimatedHeight + pos.height) / 2;
          const requiredDistance = Math.max(avgWidth, avgHeight) + 80; // Even more padding

          if (distance < Math.max(minDistance, requiredDistance)) {
            hasOverlap = true;
            break;
          }
        }

        if (!hasOverlap) {
          break;
        }

        // Try new position with more variation
        x = Math.random() * 600 + 30;
        y = Math.random() * 220 + 10;
        attempts++;
      }

      positions.push({ x, y, width: estimatedWidth, height: estimatedHeight });

      return {
        id: `random-${Date.now()}-${index}`,
        text: keyword,
        x,
        y,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });
  };

  // Restore eggs from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined" && eggs.length === 0) {
      const storedData = sessionStorage.getItem("bowerPreview");
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          if (data.keywords && Array.isArray(data.keywords)) {
            // Restore eggs from stored keywords
            const restoredEggs: Egg[] = data.keywords.map(
              (keyword: string, index: number) => ({
                id: `restored-${Date.now()}-${index}`,
                keyword: keyword,
                color: colors[index % colors.length],
              })
            );
            setEggs(restoredEggs);

            // Check if in edit mode
            if (data.editMode && data.bowerId) {
              setEditMode(true);
              setEditingBowerId(data.bowerId);
            }
          }
        } catch (error) {
          console.error("Failed to restore eggs:", error);
        }
      }
    }
  }, []);

  // Initialize with random keywords
  useEffect(() => {
    // Only initialize if no keywords exist yet
    if (floatingKeywords.length === 0) {
      setFloatingKeywords(generateRandomKeywords());
    }

    // Change keywords every 10 seconds
    const interval = setInterval(() => {
      setFloatingKeywords((prev) => {
        // Keep user-added keywords (those without 'random-' prefix)
        const userKeywords = prev.filter((k) => !k.id.startsWith("random-"));
        const newRandomKeywords = generateRandomKeywords(userQuery);
        return [...userKeywords, ...newRandomKeywords];
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [language, floatingKeywords.length, userQuery]);

  // Update keywords when user query changes
  const handleQuerySubmit = () => {
    if (!userQuery.trim()) return;

    // Limit to 8 keywords
    if (eggs.length >= 8) {
      setToastMessage(
        language === "ja"
          ? "キーワードは8個までです"
          : "Maximum 8 keywords allowed"
      );
      setUserQuery(""); // Clear input even when limit reached
      return;
    }

    // Extract keywords from query (split by comma, space, or Japanese comma)
    const keywords = userQuery.split(/[,、\s]+/).filter((k) => k.trim());

    // Get existing keywords (case-insensitive)
    const existingKeywords = eggs.map((egg) => egg.keyword.toLowerCase());
    let addedCount = 0;
    let duplicateCount = 0;

    // Add keywords directly to eggs
    keywords.forEach((keyword) => {
      const trimmedKeyword = keyword.trim();
      if (eggs.length < 10 && trimmedKeyword) {
        // Check for duplicates (case-insensitive)
        if (existingKeywords.includes(trimmedKeyword.toLowerCase())) {
          duplicateCount++;
          return;
        }

        const newEgg: Egg = {
          id: `user-${Date.now()}-${Math.random()}`,
          keyword: trimmedKeyword,
          color: colors[Math.floor(Math.random() * colors.length)],
        };
        setEggs((prev) => {
          if (prev.length < 10) {
            addedCount++;
            existingKeywords.push(trimmedKeyword.toLowerCase());
            return [...prev, newEgg];
          }
          return prev;
        });
      }
    });

    // Show message if there were duplicates
    if (duplicateCount > 0) {
      setToastMessage(
        language === "ja"
          ? "そのキーワードは既に追加されています"
          : "That keyword is already added"
      );
    }

    // Update floating keywords based on query
    const newKeywords = generateRandomKeywords(userQuery);
    setFloatingKeywords((prev) => {
      const userKeywords = prev.filter((k) => !k.id.startsWith("random-"));
      return [...userKeywords, ...newKeywords];
    });

    // Always clear input after submit
    setUserQuery("");
  };

  const handleKeywordDragStart = (
    e: React.DragEvent,
    keyword: FloatingKeyword
  ) => {
    setDraggedKeyword(keyword.id);
    e.dataTransfer.setData("text/plain", JSON.stringify(keyword));
  };

  const handleNestDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedKeyword) return;

    const keywordData = JSON.parse(e.dataTransfer.getData("text/plain"));

    // Remove from floating keywords
    setFloatingKeywords((prev) => prev.filter((k) => k.id !== draggedKeyword));

    // Add to eggs
    const newEgg: Egg = {
      id: keywordData.id,
      keyword: keywordData.text,
      color: keywordData.color,
    };
    setEggs((prev) => [...prev, newEgg]);
    setDraggedKeyword(null);
  };

  const handleEggClick = (eggId: string) => {
    const egg = eggs.find((e) => e.id === eggId);
    if (!egg) return;

    // Remove from eggs
    setEggs((prev) => prev.filter((e) => e.id !== eggId));

    // Add back to floating keywords
    const floatingKeyword: FloatingKeyword = {
      id: egg.id,
      text: egg.keyword,
      x: Math.random() * 300 + 50,
      y: Math.random() * 200 + 50,
      color: egg.color,
    };
    setFloatingKeywords((prev) => [...prev, floatingKeyword]);
  };

  const handlePreviewClick = () => {
    if (eggs.length === 0) return;

    // Open preview modal
    setPreviewModalOpen(true);
  };

  // Create preview bower object
  const previewBower = {
    id: "preview",
    name: language === "ja" ? "プレビュー" : "Preview",
    keywords: eggs.map((egg) => egg.keyword),
    color: eggs.length > 0 ? eggs[0].color : colors[0],
    eggColors: eggs.map((egg) => egg.color),
    feeds: [],
    createdAt: new Date(),
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Page Title */}
      <div className="hidden md:block py-4">
        <h1
          className="text-xl font-bold"
          style={{ color: themeColors.primary }}
        >
          {isKeywordEditMode
            ? language === "ja"
              ? "キーワード編集"
              : "Edit Keywords"
            : language === "ja"
            ? "バウアー作成"
            : "Create Bower"}
        </h1>
      </div>

      {/* Mobile Title */}
      <div className="mb-6 md:hidden">
        <h1
          className="text-xl font-bold"
          style={{ color: themeColors.primary }}
        >
          {isKeywordEditMode
            ? language === "ja"
              ? "キーワード編集"
              : "Edit Keywords"
            : language === "ja"
            ? "バウアー作成"
            : "Create Bower"}
        </h1>
      </div>

      <div className="p-4">
        <div className="rounded-lg overflow-hidden shadow-lg">
          {/* Floating Keywords Area */}
          <div
            className="relative pt-8 h-[300px] overflow-hidden"
            style={{
              background: `
              linear-gradient(to bottom, 
                #87CEEB 0%, 
                #B0E0E6 50%, 
                #E0F6FF 100%
              )
            `,
            }}
          >
            {/* Refresh Button - Top Right (Sun Icon) */}
            <button
              onClick={() => {
                // Keep user-added keywords (those without 'random-' prefix)
                const userKeywords = floatingKeywords.filter(
                  (k) => !k.id.startsWith("random-")
                );
                // Generate new random keywords
                const newRandomKeywords = generateRandomKeywords(userQuery);
                setFloatingKeywords([...userKeywords, ...newRandomKeywords]);
              }}
              className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 hover:rotate-90 transition-all duration-300 z-20 bg-white bg-opacity-20 backdrop-blur-sm"
              title={
                language === "ja" ? "キーワードを更新" : "Refresh keywords"
              }
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Sun center */}
                <circle cx="12" cy="12" r="4" fill="#FFD700" />
                {/* Sun rays */}
                <line
                  x1="12"
                  y1="1"
                  x2="12"
                  y2="4"
                  stroke="#FFD700"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="12"
                  y1="20"
                  x2="12"
                  y2="23"
                  stroke="#FFD700"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="1"
                  y1="12"
                  x2="4"
                  y2="12"
                  stroke="#FFD700"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="20"
                  y1="12"
                  x2="23"
                  y2="12"
                  stroke="#FFD700"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="4.22"
                  y1="4.22"
                  x2="6.34"
                  y2="6.34"
                  stroke="#FFD700"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="17.66"
                  y1="17.66"
                  x2="19.78"
                  y2="19.78"
                  stroke="#FFD700"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="4.22"
                  y1="19.78"
                  x2="6.34"
                  y2="17.66"
                  stroke="#FFD700"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="17.66"
                  y1="6.34"
                  x2="19.78"
                  y2="4.22"
                  stroke="#FFD700"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Background Elements */}
            {/* Clouds - flowing from left to right */}
            <div
              className="absolute top-8 w-28 h-16 bg-white rounded-full shadow-sm cloud-drift"
              style={{
                animationDuration: "25s",
                animationDelay: "0s",
                left: "10%",
              }}
            ></div>
            <div
              className="absolute top-12 w-32 h-18 bg-white rounded-full shadow-sm cloud-drift"
              style={{
                animationDuration: "30s",
                animationDelay: "0s",
                left: "40%",
              }}
            ></div>
            <div
              className="absolute top-6 w-24 h-14 bg-white rounded-full shadow-sm cloud-drift"
              style={{
                animationDuration: "28s",
                animationDelay: "0s",
                left: "70%",
              }}
            ></div>
            <div
              className="absolute top-16 w-30 h-16 bg-white rounded-full shadow-sm cloud-drift"
              style={{
                animationDuration: "32s",
                animationDelay: "8s",
                left: "5%",
              }}
            ></div>
            <div
              className="absolute top-10 w-26 h-15 bg-white rounded-full shadow-sm cloud-drift"
              style={{
                animationDuration: "27s",
                animationDelay: "12s",
                left: "25%",
              }}
            ></div>
            <div
              className="absolute top-14 w-30 h-17 bg-white rounded-full shadow-sm cloud-drift"
              style={{
                animationDuration: "29s",
                animationDelay: "16s",
                left: "55%",
              }}
            ></div>
            <div
              className="absolute top-4 w-22 h-13 bg-white rounded-full shadow-sm cloud-drift"
              style={{
                animationDuration: "26s",
                animationDelay: "20s",
                left: "80%",
              }}
            ></div>

            {/* Birds - flying across with flapping animation (less frequent) */}
            <div
              className="absolute top-10 bird-fly"
              style={{
                animationDuration: "35s",
                animationDelay: "8s",
                opacity: 0,
              }}
            >
              <div
                className={tappedItem === "bird1" ? "animate-bird-shake" : ""}
              >
                <BirdSVG
                  onClick={() => {
                    setTappedItem("bird1");
                    setTimeout(() => setTappedItem(null), 500);
                  }}
                />
              </div>
            </div>

            {/* Balloons - floating across (less frequent) */}
            <div
              className="absolute top-8 balloon-float"
              style={{
                animationDuration: "40s",
                animationDelay: "20s",
                opacity: 0,
              }}
            >
              <div
                className={
                  tappedItem === "balloon1" ? "animate-balloon-pop" : ""
                }
              >
                <BalloonSVG
                  color="#FF6B9D"
                  onClick={() => {
                    setTappedItem("balloon1");
                    setTimeout(() => setTappedItem(null), 400);
                  }}
                />
              </div>
            </div>

            {/* Floating Keywords */}
            {floatingKeywords.map((keyword) => (
              <div
                key={keyword.id}
                draggable
                onDragStart={(e) => handleKeywordDragStart(e, keyword)}
                onClick={() => {
                  // Limit to 8 keywords
                  if (eggs.length >= 8) {
                    setToastMessage(
                      language === "ja"
                        ? "キーワードは8個までです"
                        : "Maximum 8 keywords allowed"
                    );
                    return;
                  }

                  // Check for duplicates (case-insensitive)
                  const existingKeywords = eggs.map((egg) =>
                    egg.keyword.toLowerCase()
                  );
                  if (existingKeywords.includes(keyword.text.toLowerCase())) {
                    setToastMessage(
                      language === "ja"
                        ? "このキーワードは既に追加されています"
                        : "This keyword is already added"
                    );
                    return;
                  }

                  // Remove from floating keywords
                  setFloatingKeywords((prev) =>
                    prev.filter((k) => k.id !== keyword.id)
                  );

                  // Add to eggs
                  const newEgg: Egg = {
                    id: keyword.id,
                    keyword: keyword.text,
                    color: keyword.color,
                  };
                  setEggs((prev) => [...prev, newEgg]);
                }}
                className="absolute cursor-pointer keyword-float hover:scale-110 transition-transform z-10"
                style={{
                  left: `${keyword.x}px`,
                  top: `${keyword.y}px`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              >
                <div
                  className="px-4 py-3 rounded-2xl text-white font-medium shadow-lg border border-white border-opacity-30 backdrop-blur-sm"
                  style={{ backgroundColor: keyword.color }}
                >
                  {keyword.text}
                </div>
              </div>
            ))}
          </div>

          {/* Nest Area */}
          <div
            className="relative px-8 pb-4 min-h-[280px] overflow-visible"
            style={{
              background: `
              linear-gradient(to bottom, 
                #E0F6FF 0%, 
                #E0F6FF 100%
              )
            `,
            }}
          >
            {/* SVG Nest - Centered */}
            <div
              ref={nestRef}
              onDrop={handleNestDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex justify-center items-start hover:scale-105 transition-transform duration-300"
            >
              <div className="w-80 h-50 relative">
                <NestSVG className="drop-shadow-lg" />

                {/* Eggs in Nest - naturally clustered */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-72 h-24 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {eggs.map((egg, index) => {
                      // Calculate position in a circular/clustered pattern with fixed seed
                      const angle =
                        (index / Math.max(eggs.length, 1)) * Math.PI * 2;
                      // Use egg.id to generate consistent random values
                      const seed = egg.id
                        .split("")
                        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const radius = 30 + (seed % 40);
                      const x = Math.cos(angle) * radius;
                      const y = Math.sin(angle) * radius * 0.5; // Flatten vertically
                      const scale = 0.85 + (seed % 30) / 100;
                      const rotation = (seed % 50) - 25;

                      return (
                        <div
                          key={egg.id}
                          className="egg-bounce transition-transform absolute"
                          style={{
                            left: `calc(50% + ${x}px)`,
                            top: `calc(50% + ${y}px)`,
                            transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
                            zIndex: Math.floor(50 - y),
                          }}
                        >
                          <EggSVG
                            color={egg.color}
                            onClick={() => handleEggClick(egg.id)}
                            title={egg.keyword}
                            className="hover:scale-125 transition-transform duration-200"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* User Query Input - Below Nest */}
            <div className="mt-6 max-w-xl mx-auto">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Only submit if Enter is pressed and not during IME composition (Japanese input)
                    if (
                      e.key === "Enter" &&
                      !e.nativeEvent.isComposing &&
                      userQuery.trim()
                    ) {
                      e.preventDefault();
                      handleQuerySubmit();
                    }
                  }}
                  onCompositionStart={(e) => {
                    // Mark that IME composition has started
                    (e.target as HTMLInputElement).dataset.composing = "true";
                  }}
                  onCompositionEnd={(e) => {
                    // Mark that IME composition has ended
                    (e.target as HTMLInputElement).dataset.composing = "false";
                  }}
                  className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                  style={{ outline: "none" }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = themeColors.tertiary)
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#d1d5db")
                  }
                  placeholder={
                    language === "ja"
                      ? "例: AI、プログラミング、デザイン"
                      : "e.g., AI, Programming, Design"
                  }
                />
                <button
                  onClick={handleQuerySubmit}
                  disabled={!userQuery.trim()}
                  className="px-4 py-2 rounded-lg transition-colors font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:text-white"
                  style={{
                    backgroundColor: themeColors.primary,
                    color: "white",
                  }}
                  onMouseEnter={(e) => {
                    if (userQuery.trim())
                      e.currentTarget.style.backgroundColor =
                        themeColors.tertiary;
                  }}
                  onMouseLeave={(e) => {
                    if (userQuery.trim())
                      e.currentTarget.style.backgroundColor =
                        themeColors.primary;
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>

            {/* Keywords Display - Below Input */}
            {eggs.length > 0 && (
              <div className="mt-6 text-center">
                <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                  {eggs.map((egg) => (
                    <span
                      key={egg.id}
                      className="px-3 py-1.5 rounded-2xl text-white text-sm font-medium cursor-pointer hover:opacity-80 border border-white border-opacity-30 shadow-sm backdrop-blur-sm"
                      style={{ backgroundColor: egg.color }}
                      onClick={() => handleEggClick(egg.id)}
                    >
                      {egg.keyword} ✕
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Below Nest Area */}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              setEggs([]);
              setFloatingKeywords([]);
              setUserQuery("");
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("bowerPreview");
              }
            }}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-md"
          >
            {language === "ja" ? "やり直す" : "Reset"}
          </button>
          <button
            onClick={() => {
              if (isKeywordEditMode) {
                // Save keywords and go back to bowers page
                const newBower = {
                  id: editingBowerId || `bower-${Date.now()}`,
                  name: `Bower ${eggs.map((e) => e.keyword).join(", ")}`,
                  keywords: eggs.map((egg) => egg.keyword),
                  feeds: [],
                  color: eggs[0]?.color || themeColors.tertiary,
                  eggColors: eggs.map((egg) => egg.color),
                  createdAt: new Date(),
                };

                if (typeof window !== "undefined") {
                  const savedBowers = localStorage.getItem("bowers");
                  let bowersList = savedBowers ? JSON.parse(savedBowers) : [];

                  if (editingBowerId) {
                    bowersList = bowersList.map((b: any) =>
                      b.id === editingBowerId
                        ? {
                            ...b,
                            keywords: newBower.keywords,
                            eggColors: newBower.eggColors,
                          }
                        : b
                    );
                  }

                  localStorage.setItem("bowers", JSON.stringify(bowersList));
                  sessionStorage.removeItem("bowerPreview");
                }

                setToastType("success");
                setToastMessage(
                  language === "ja"
                    ? "キーワードを保存しました！"
                    : "Keywords saved successfully!"
                );

                setTimeout(() => {
                  if (
                    isModalMode &&
                    typeof window !== "undefined" &&
                    window.parent !== window
                  ) {
                    // Close modal by sending message to parent
                    window.parent.postMessage({ type: "closeModal" }, "*");
                  } else {
                    router.push("/bowers");
                  }
                }, 1000);
              } else {
                handlePreviewClick();
              }
            }}
            disabled={eggs.length === 0}
            className="px-8 py-3 rounded-lg transition-colors font-semibold shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{
              backgroundColor: themeColors.accent,
              color: themeColors.button.text,
            }}
            onMouseEnter={(e) => {
              if (eggs.length > 0)
                e.currentTarget.style.backgroundColor = themeColors.primary;
            }}
            onMouseLeave={(e) => {
              if (eggs.length > 0)
                e.currentTarget.style.backgroundColor = themeColors.accent;
            }}
          >
            {isKeywordEditMode
              ? language === "ja"
                ? "保存"
                : "Save"
              : language === "ja"
              ? "次へ"
              : "Next"}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {previewModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <BowerIcon eggColors={previewBower.eggColors} size={48} />
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {language === "ja" ? "プレビュー" : "Preview"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {eggs.length}{" "}
                    {language === "ja" ? "個のキーワード" : "keywords"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Keywords */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {language === "ja" ? "キーワード" : "Keywords"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {eggs.map((egg) => (
                    <span
                      key={egg.id}
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                      style={{
                        backgroundColor: `${egg.color}20`,
                        color: egg.color,
                        border: `1px solid ${egg.color}40`,
                      }}
                    >
                      {egg.keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mock Feed Preview */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  {language === "ja"
                    ? "発見されるフィードの例"
                    : "Example Feeds"}
                </h3>
                <div className="space-y-3">
                  {/* Mock Feed 1 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-gray-800 mb-1">
                      {language === "ja"
                        ? `${
                            eggs[0]?.keyword || "キーワード"
                          }に関する最新ニュース`
                        : `Latest News about ${eggs[0]?.keyword || "Keyword"}`}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {language === "ja"
                        ? "AIが自動的に関連するフィードを発見します..."
                        : "AI will automatically discover relevant feeds..."}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>📰</span>
                      <span>
                        {language === "ja" ? "ニュースサイト" : "News Site"}
                      </span>
                    </div>
                  </div>

                  {/* Mock Feed 2 */}
                  {eggs.length > 1 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h4 className="font-semibold text-gray-800 mb-1">
                        {language === "ja"
                          ? `${eggs[1]?.keyword}の専門ブログ`
                          : `${eggs[1]?.keyword} Expert Blog`}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {language === "ja"
                          ? "関連する専門家のブログやメディアを発見..."
                          : "Discover expert blogs and media..."}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>📝</span>
                        <span>{language === "ja" ? "ブログ" : "Blog"}</span>
                      </div>
                    </div>
                  )}

                  {/* Mock Feed 3 */}
                  {eggs.length > 2 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h4 className="font-semibold text-gray-800 mb-1">
                        {language === "ja"
                          ? `${eggs[2]?.keyword}のコミュニティ`
                          : `${eggs[2]?.keyword} Community`}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {language === "ja"
                          ? "コミュニティやフォーラムの最新情報..."
                          : "Latest from communities and forums..."}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>💬</span>
                        <span>
                          {language === "ja" ? "コミュニティ" : "Community"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  {language === "ja"
                    ? "保存すると、これらのキーワードに基づいてAIが自動的にフィードを発見します。"
                    : "Once saved, AI will automatically discover feeds based on these keywords."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-6 flex justify-end gap-3">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-6 py-2 rounded-lg transition-colors font-medium"
                style={{ backgroundColor: "#e5e7eb", color: "#374151" }}
              >
                {language === "ja" ? "戻る" : "Back"}
              </button>
              <button
                onClick={() => {
                  // Save bower logic
                  const newBower = {
                    id: editingBowerId || `bower-${Date.now()}`,
                    name: `Bower ${eggs.map((e) => e.keyword).join(", ")}`,
                    keywords: eggs.map((egg) => egg.keyword),
                    feeds: [],
                    color: eggs[0]?.color || themeColors.tertiary,
                    eggColors: eggs.map((egg) => egg.color),
                    createdAt: new Date(),
                  };

                  // Save to localStorage
                  if (typeof window !== "undefined") {
                    const savedBowers = localStorage.getItem("bowers");
                    let bowersList = savedBowers ? JSON.parse(savedBowers) : [];

                    if (editingBowerId) {
                      // Update existing bower
                      bowersList = bowersList.map((b: any) =>
                        b.id === editingBowerId ? newBower : b
                      );
                    } else {
                      // Add new bower
                      bowersList.push(newBower);
                    }

                    localStorage.setItem("bowers", JSON.stringify(bowersList));
                    sessionStorage.removeItem("bowerPreview");
                  }

                  // Show success message and redirect to bowers page
                  setToastType("success");
                  setToastMessage(
                    language === "ja"
                      ? "バウアーを保存しました！"
                      : "Bower saved successfully!"
                  );

                  setTimeout(() => {
                    router.push("/bowers");
                  }, 1000);
                }}
                className="px-8 py-2 rounded-lg transition-colors font-semibold shadow-lg"
                style={{
                  backgroundColor: themeColors.accent,
                  color: themeColors.button.text,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = themeColors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = themeColors.accent;
                }}
              >
                {language === "ja" ? "保存" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
