/**
 * 御之旅 Phase 7.1 — 互動式客戶端行程入口 (ClientPortal)
 * Premium 行動端響應式設計，免登入（UUID token）
 * 功能：Google Maps 導航、加入行事曆、即時更新、多語系
 */
export const runtime = "edge";

import { createServiceSupabase } from "@/lib/supabase";
import ClientPortal from "./ClientPortal";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = createServiceSupabase();
  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();

  if (error || !trip) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0f172a,#1e293b)", fontFamily: "'Noto Sans TC', 'Hiragino Sans', sans-serif" }}>
        <div style={{ textAlign: "center", padding: 40, color: "#fff" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🏯</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>找不到此行程</h1>
          <p style={{ fontSize: 14, color: "#94a3b8" }}>連結可能已過期或不存在</p>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 16 }}>御之旅 NOBLE HOUSE GLORY</p>
        </div>
      </div>
    );
  }

  return <ClientPortal trip={trip} token={token} />;
}
