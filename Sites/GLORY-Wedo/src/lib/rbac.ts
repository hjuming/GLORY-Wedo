/**
 * 御之旅 Phase 6.1 — RBAC 權限定義
 * profiles.role: 'admin' | 'agent' | 'client'
 *   admin  → Admin（全權管理：成本、利潤、設定）
 *   agent  → Op（營運：可看成本，可管理團務）
 *   client → Sales（業務：僅報價、團員、行程，不可看成本結構）
 */

export type AppRole = 'admin' | 'agent' | 'client';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: '管理員',
  agent: '營運',
  client: '業務',
};

// 功能權限 key
export type Permission =
  | 'view_cost_breakdown'    // 成本結構明細
  | 'view_transport_cost'    // 交通車隊成本
  | 'view_hotel_cost'        // 住宿成本
  | 'view_profit_dashboard'  // 利潤儀表板
  | 'edit_markup'            // 調整 markup / FX
  | 'edit_alert_threshold'   // 調整預警門檻
  | 'manage_tours'           // 建立/編輯團務
  | 'manage_members'         // 匯入/編輯團員
  | 'manage_quotation'       // 報價
  | 'manage_cleaning'        // 清潔排程
  | 'manage_users'           // 使用者管理
  | 'export_supplier_pdf'    // 供應商 PDF
  | 'view_ai_planner';       // AI 行程規劃

const PERMISSION_MATRIX: Record<AppRole, Permission[]> = {
  admin: [
    'view_cost_breakdown',
    'view_transport_cost',
    'view_hotel_cost',
    'view_profit_dashboard',
    'edit_markup',
    'edit_alert_threshold',
    'manage_tours',
    'manage_members',
    'manage_quotation',
    'manage_cleaning',
    'manage_users',
    'export_supplier_pdf',
    'view_ai_planner',
  ],
  agent: [
    'view_cost_breakdown',
    'view_transport_cost',
    'view_hotel_cost',
    'manage_tours',
    'manage_members',
    'manage_quotation',
    'manage_cleaning',
    'export_supplier_pdf',
    'view_ai_planner',
  ],
  client: [
    'manage_members',
    'manage_quotation',
    'view_ai_planner',
  ],
};

/** 檢查角色是否具有指定權限 */
export function hasPermission(role: AppRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

/** 取得角色的所有權限 */
export function getPermissions(role: AppRole): Permission[] {
  return PERMISSION_MATRIX[role] ?? [];
}

// 路由 → 所需權限對照（middleware 使用）
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/api/trips': 'manage_tours',
  '/api/quotations': 'manage_quotation',
  '/api/analytics/profit': 'view_profit_dashboard',
  '/api/transport': 'view_transport_cost',
  '/api/hotels': 'view_hotel_cost',
  '/api/users': 'manage_users',
};

// 受保護的路由前綴（未登入時導向 /login）
export const PROTECTED_PREFIXES = ['/api/trips', '/api/quotations', '/api/profit', '/api/transport', '/api/hotels', '/api/users'];
// 公開路由（不需登入）
export const PUBLIC_PATHS = ['/login', '/auth/callback', '/embed', '/api/generate-itinerary', '/api/webhook', '/api/notify', '/share'];
