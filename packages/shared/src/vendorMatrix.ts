// BRD §6.2 — Vendor Comparison Matrix.
// Upserv is always first and highlighted in the UI.

export type VendorKey = "upserv" | "wix-squarespace" | "godaddy" | "wordpress";

export interface VendorRow {
  feature: string;
  upserv: string;
  wixSquarespace: string;
  godaddy: string;
  wordpress: string;
}

export const VENDOR_HEADER: Record<VendorKey, string> = {
  upserv: "Upserv (Recommended)",
  "wix-squarespace": "Wix / Squarespace",
  godaddy: "GoDaddy",
  wordpress: "WordPress",
};

export const VENDOR_MATRIX: ReadonlyArray<VendorRow> = [
  {
    feature: "AI Visibility Audit",
    upserv: "Included, ongoing",
    wixSquarespace: "One-time, manual",
    godaddy: "No",
    wordpress: "Manual / plugin",
  },
  {
    feature: "Proactive Gap Hunting",
    upserv: "Yes — monthly",
    wixSquarespace: "No",
    godaddy: "No",
    wordpress: "No",
  },
  {
    feature: "Human Content Experts",
    upserv: "Dedicated team",
    wixSquarespace: "No",
    godaddy: "No",
    wordpress: "No",
  },
  {
    feature: "AEO-Optimized FAQs",
    upserv: "100s, definitive",
    wixSquarespace: "User-written",
    godaddy: "User-written",
    wordpress: "User-written",
  },
  {
    feature: "Service Page Depth",
    upserv: "500+ pages of authority content",
    wixSquarespace: "Template",
    godaddy: "Template",
    wordpress: "Manual",
  },
  {
    feature: "Hosting + Maintenance",
    upserv: "Included",
    wixSquarespace: "Self-managed",
    godaddy: "Self-managed",
    wordpress: "Self-managed",
  },
];
