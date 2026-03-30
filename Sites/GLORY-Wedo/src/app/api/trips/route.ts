// 對齊《御之旅 MVP 開發規劃建議書 v2》Day 3 — 行程草稿 CRUD
export const runtime = "edge";

import { createServiceSupabase } from "@/lib/supabase";

// POST — 儲存行程草稿至 public.trips
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, destination, days_json, tags, share_token } = body;

    if (!title || !days_json) {
      return Response.json(
        { success: false, error: "title 與 days_json 為必填" },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabase();

    // 若前端提供 share_token（AI 生成時已產生），用 upsert 避免重複插入
    if (share_token) {
      const { data: existing } = await supabase
        .from("trips")
        .select("id")
        .eq("share_token", share_token)
        .maybeSingle();

      if (existing) {
        // 已存在：更新
        const { data, error } = await supabase
          .from("trips")
          .update({
            title,
            destination,
            days_json,
            tags,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          return Response.json({ success: false, error: error.message }, { status: 500 });
        }
        return Response.json({ success: true, trip: data, action: "updated" });
      }
    }

    // 新增
    const { data, error } = await supabase
      .from("trips")
      .insert({
        title,
        destination,
        days_json,
        tags,
        ...(share_token ? { share_token } : {}),
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, trip: data, action: "created" }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ success: false, error: msg }, { status: 500 });
  }
}

// GET — 取得草稿列表（依建立時間倒序）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "draft";
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

    const supabase = createServiceSupabase();

    const { data, error } = await supabase
      .from("trips")
      .select("id, title, destination, tags, share_token, status, created_at, updated_at")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, trips: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ success: false, error: msg }, { status: 500 });
  }
}
