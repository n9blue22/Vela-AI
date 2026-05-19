import { Plan } from "../../types";

export const planOptions: Array<{
  id: Plan;
  title: string;
  price: string;
  description: string;
  leadLimit: string;
  aiLimit: string;
  features: string[];
}> = [
  {
    id: "mien_phi",
    title: "Miễn phí",
    price: "0đ / tháng",
    description: "Khởi động nhanh cho spa mới thử AI.",
    leadLimit: "Tối đa 30 lead",
    aiLimit: "5 lượt AI / ngày",
    features: ["Mẫu nội dung cơ bản", "Quản lý lead cơ bản", "Quản lý task cá nhân"]
  },
  {
    id: "tiet_kiem",
    title: "Tiết kiệm",
    price: "250.000đ / tháng",
    description: "Tối ưu chi phí cho spa nhỏ và vừa.",
    leadLimit: "Tối đa 200 lead",
    aiLimit: "35 lượt AI / ngày",
    features: ["Mẫu nâng cao", "Ưu tiên hỗ trợ", "Quản lý task + lịch follow-up"]
  },
  {
    id: "cao_cap",
    title: "Cao cấp",
    price: "499.000đ / tháng",
    description: "Toàn bộ tính năng dành cho vận hành tăng trưởng.",
    leadLimit: "Không giới hạn lead",
    aiLimit: "300 lượt AI / ngày",
    features: ["Tất cả tính năng", "Quản trị admin nâng cao", "Thêm admin phụ trách", "Báo cáo vận hành"]
  }
];

export function planLabel(plan: string) {
  return planOptions.find((item) => item.id === plan)?.title ?? "Miễn phí";
}
