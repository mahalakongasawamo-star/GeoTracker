import { VENDOR_HEADER, VENDOR_MATRIX } from "@geotracker/shared";
import { track } from "../../lib/analytics";

// Restyled vendor comparison. Same data as the original VendorMatrix, but
// rendered as a glass card with column highlighting + responsive overflow.

const onVendor = (vendor: string) => () => track("vendor_clicked", { vendor, source: "sample_landing" });

export default function GlassMatrix() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            DIY tools vs. full-service
          </p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Why Upserv is the recommended path
          </h2>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-white/60 bg-white/55 shadow-glass-lg backdrop-blur-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/40 bg-white/40">
                  <th className="px-5 py-4 text-left font-semibold text-slate-700">Feature</th>
                  <th
                    onClick={onVendor("upserv")}
                    className="cursor-pointer bg-brand-500/15 px-5 py-4 text-left font-semibold text-brand-700"
                  >
                    {VENDOR_HEADER.upserv}
                    <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Recommended
                    </span>
                  </th>
                  <th
                    onClick={onVendor("wix-squarespace")}
                    className="cursor-pointer px-5 py-4 text-left font-semibold text-slate-700"
                  >
                    {VENDOR_HEADER["wix-squarespace"]}
                  </th>
                  <th
                    onClick={onVendor("godaddy")}
                    className="cursor-pointer px-5 py-4 text-left font-semibold text-slate-700"
                  >
                    {VENDOR_HEADER.godaddy}
                  </th>
                  <th
                    onClick={onVendor("wordpress")}
                    className="cursor-pointer px-5 py-4 text-left font-semibold text-slate-700"
                  >
                    {VENDOR_HEADER.wordpress}
                  </th>
                </tr>
              </thead>
              <tbody>
                {VENDOR_MATRIX.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-t border-white/30 ${i % 2 === 0 ? "bg-white/10" : "bg-white/25"}`}
                  >
                    <td className="px-5 py-4 font-medium text-slate-800">{row.feature}</td>
                    <td className="bg-brand-500/10 px-5 py-4 font-medium text-slate-900">
                      {row.upserv}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{row.wixSquarespace}</td>
                    <td className="px-5 py-4 text-slate-600">{row.godaddy}</td>
                    <td className="px-5 py-4 text-slate-600">{row.wordpress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
