import {ApiError, request} from './auth.js';
const basePath='/api/admin';
function page(data) {
  if(!data || !Array.isArray(data.content) || !Number.isInteger(data.totalElements) || !Number.isInteger(data.totalPages) || !Number.isInteger(data.number) || !Number.isInteger(data.size))throw new ApiError('Dữ liệu quản trị không hợp lệ. Vui lòng thử lại.',502);
  return data;
}
export const adminApi={
  async dashboard(signal){const data=await request('/dashboard',{basePath,signal});if(!data || !['totalAccounts','activeAccounts','totalProperties','pendingVerifications','unassignedVerifications'].every(key=>Number.isInteger(data[key])&&data[key]>=0) || !['roles','staff','recentApplications','activities'].every(key=>Array.isArray(data[key])))throw new ApiError('Không xác minh được dữ liệu tổng quan.',502);return data;},
  async list(view,filters,signal){const endpoint={accounts:'accounts',assignment:'assignments',activity:'activity'}[view];if(!endpoint)throw new ApiError('Mục quản trị không hợp lệ.',400);return page(await request(`/${endpoint}?${new URLSearchParams(filters)}`,{basePath,signal}));}
};
