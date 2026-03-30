// src/lib/useItineraryGenerator.ts
//
// 前端 hook：呼叫 /api/generate-itinerary（Gemini Edge API），管理載入狀態
//
// 使用方式：
//   const { generate, loading, error } = useItineraryGenerator();
//   const plan = await generate(answers);
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from "react";

export interface ItineraryAnswers {
  destination?: string;
  duration?: string;
  pax?: string;
  vibe?: string;
  season?: string;
  pace?: string;
}

export interface ItineraryStop {
  type: string;
  name: string;
  desc: string;
  duration: number;
  cost: number;
}

export interface ItineraryDay {
  day: number;
  title: string;
  route: string;
  stops: ItineraryStop[];
}

export interface GeneratedItinerary {
  id: string;
  title: string;
  subtitle: string;
  destination: string;
  totalDays: number;
  pax: number;
  season: string;
  transport: string;
  hotel: string;
  tags: string[];
  shareToken: string;
  createdAt: string;
  days: ItineraryDay[];
}

export function useItineraryGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (answers: ItineraryAnswers): Promise<GeneratedItinerary | null> => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/generate-itinerary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "生成失敗");
        }

        return data.itinerary as GeneratedItinerary;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "未知錯誤";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { generate, loading, error };
}
