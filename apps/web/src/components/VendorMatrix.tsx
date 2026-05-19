import { VENDOR_MATRIX, VENDOR_HEADER } from "@geotracker/shared";

export default function VendorMatrix() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left px-4 py-3 font-semibold text-slate-700">Feature</th>
            <th className="text-left px-4 py-3 font-semibold text-brand-700 bg-brand-50">
              {VENDOR_HEADER.upserv}
            </th>
            <th className="text-left px-4 py-3 font-semibold text-slate-700">
              {VENDOR_HEADER["wix-squarespace"]}
            </th>
            <th className="text-left px-4 py-3 font-semibold text-slate-700">{VENDOR_HEADER.godaddy}</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-700">{VENDOR_HEADER.wordpress}</th>
          </tr>
        </thead>
        <tbody>
          {VENDOR_MATRIX.map((row) => (
            <tr key={row.feature} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium text-slate-700">{row.feature}</td>
              <td className="px-4 py-3 bg-brand-50/40 text-slate-900">{row.upserv}</td>
              <td className="px-4 py-3 text-slate-600">{row.wixSquarespace}</td>
              <td className="px-4 py-3 text-slate-600">{row.godaddy}</td>
              <td className="px-4 py-3 text-slate-600">{row.wordpress}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
