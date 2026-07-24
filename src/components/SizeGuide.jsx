import React from 'react';

export default function SizeGuide() {
  return (
    <div className="space-y-6">
      <p className="text-zinc-600 leading-relaxed text-sm">
        আপনার জন্য সঠিক মাপের পোশাকটি অর্ডার করতে নিচের সাইজ চার্ট নির্দেশিকাটি অনুসরণ করুন।
      </p>
      <div className="overflow-x-auto rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
        <table className="w-full text-center border-collapse text-xs md:text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-[#ce112d] font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Size (সাইজ)</th>
              <th className="py-3 px-4">Chest (বডি ইঞ্চি)</th>
              <th className="py-3 px-4">Length (লম্বা ইঞ্চি)</th>
              <th className="py-3 px-4">Fit Type</th>
            </tr>
          </thead>
          <tbody className="text-zinc-655 font-semibold">
            <tr className="border-b border-zinc-100">
              <td className="py-3 px-4">S</td>
              <td className="py-3 px-4">36" - 38"</td>
              <td className="py-3 px-4">26"</td>
              <td className="py-3 px-4">Regular</td>
            </tr>
            <tr className="border-b border-zinc-100">
              <td className="py-3 px-4">M</td>
              <td className="py-3 px-4">38" - 40"</td>
              <td className="py-3 px-4">27"</td>
              <td className="py-3 px-4">Regular</td>
            </tr>
            <tr className="border-b border-zinc-100">
              <td className="py-3 px-4">L</td>
              <td className="py-3 px-4">40" - 42"</td>
              <td className="py-3 px-4">28"</td>
              <td className="py-3 px-4">Regular</td>
            </tr>
            <tr className="border-b border-zinc-100">
              <td className="py-3 px-4">XL</td>
              <td className="py-3 px-4">42" - 44"</td>
              <td className="py-3 px-4">29"</td>
              <td className="py-3 px-4">Regular</td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-bold text-zinc-900">FREE SIZE</td>
              <td className="py-3 px-4">34" - 44"</td>
              <td className="py-3 px-4">Flexible</td>
              <td className="py-3 px-4 font-bold text-rose-500">Universal Fit</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-400 italic mt-4 pl-1">
        * প্রিপেইড বা কাস্টমাইজড অর্ডারের সময় সঠিক গাইড পেয়ে আমাদের হোয়াটসঅ্যাপ হেল্পলাইনে সরাসরি মেসেজ দিতে পারেন।
      </p>
    </div>
  );
}
