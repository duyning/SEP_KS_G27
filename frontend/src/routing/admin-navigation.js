import { Activity, ClipboardCheck, Flag, LayoutDashboard, Users } from 'lucide-react';

export const adminDashboardViews = {
  overview: ['Tổng quan', '/admin', LayoutDashboard],
  accounts: ['Tài khoản', '/admin?view=accounts', Users],
  assignment: ['Phân công xác minh', '/admin?view=assignment', ClipboardCheck],
  activity: ['Nhật ký kiểm duyệt', '/admin?view=activity', Activity],
};

export const adminReportsLink = ['Báo cáo cộng đồng', '/admin/community/reports', Flag];

export function getAdminDashboardView(params) {
  const view = params.get('view');
  return Object.hasOwn(adminDashboardViews, view) ? view : 'overview';
}
