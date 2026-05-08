// Admin dashboard placeholders (enquiries/stats) until the admin phase wires real data.
export type EnquiryStatus = "new" | "in-progress" | "closed";
export const enquiries: { id: string; name: string; product: string; channel: string; date: string; status: EnquiryStatus }[] = [
  { id: "E-1042", name: "Ananya Rao", product: "Celestial Ring", channel: "WhatsApp", date: "2 Oct 2026", status: "new" },
  { id: "E-1041", name: "Kabir Mehta", product: "Aurum Bangles", channel: "Website", date: "1 Oct 2026", status: "in-progress" },
  { id: "E-1040", name: "Ishita Sen", product: "Heritage Jhumka", channel: "WhatsApp", date: "30 Sep 2026", status: "new" },
  { id: "E-1039", name: "Rohan Kapoor", product: "Solitaire Pendant", channel: "Website", date: "28 Sep 2026", status: "closed" },
];

export const adminStats = [
  { label: "Products", value: "124", delta: "+6 this month" },
  { label: "Collections", value: "12", delta: "2 drafts" },
  { label: "Enquiries", value: "38", delta: "+12% vs last month" },
  { label: "Views", value: "14,284", delta: "+8.4% vs last month" },
];

export const topProducts = [
  { name: "Celestial Ring", views: 2140, enquiries: 14 },
  { name: "Heritage Jhumka", views: 1872, enquiries: 9 },
  { name: "Aurum Bangles", views: 1420, enquiries: 7 },
];
