import React, { useState } from 'react';
import { QrCode, Copy, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function BanglaQRPayment({
  advanceAmount,
  finalTotal,
  paymentOption,
  setPaymentOption,
  senderNumber,
  onSenderNumberChange
}) {
  const { language } = useLanguage();
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedQrId, setCopiedQrId] = useState(false);

  const merchantNumber = "01347250661";
  const merchantName = "BIG BAZAR";
  const qrId = "T1654131";
  const bankNameBn = "ইসলামী ব্যাংক বাংলাদেশ পিএলসি";
  const bankNameEn = "Islami Bank Bangladesh PLC";

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'number') {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } else if (type === 'qrid') {
      setCopiedQrId(true);
      setTimeout(() => setCopiedQrId(false), 2000);
    }
  };

  const dueAmount = Math.max(0, finalTotal - advanceAmount);

  return (
    <div className="bg-[#ce112d]/5 border border-[#ce112d]/15 rounded-2xl p-4 md:p-5 space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-[#ce112d]/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ce112d] text-white flex items-center justify-center shadow-md">
            <QrCode size={18} />
          </div>
          <div>
            <h5 className="text-xs font-black uppercase text-neutral-900 tracking-wide">
              {language === 'bn' ? 'বাংলা কিউআর পেমেন্ট' : 'Bangla QR Payment'}
            </h5>
            <p className="text-[10px] font-bold text-emerald-600">
              {language === 'bn' ? bankNameBn : bankNameEn}
            </p>
          </div>
        </div>
      </div>

      {/* 2 Payment Amount Options (Advance vs Full) */}
      <div className="space-y-2.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">
          {language === 'bn' ? 'পেমেন্টের পরিমাণ নির্বাচন করুন:' : 'Select Payment Amount:'}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentOption('advance')}
            className={`p-3 rounded-xl border-2 transition-all text-left flex flex-col gap-1 ${
              paymentOption === 'advance'
                ? 'border-[#ce112d] bg-white shadow-sm ring-2 ring-[#ce112d]/10'
                : 'border-neutral-200 bg-neutral-50/50 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase ${paymentOption === 'advance' ? 'text-[#ce112d]' : 'text-neutral-600'}`}>
                {language === 'bn' ? '১. অগ্রিম পেমেন্ট' : '1. Advance Payment'}
              </span>
              {paymentOption === 'advance' && <Check size={14} className="text-[#ce112d]" />}
            </div>
            <span className="text-sm font-black text-neutral-900">৳{advanceAmount}</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentOption('full')}
            className={`p-3 rounded-xl border-2 transition-all text-left flex flex-col gap-1 ${
              paymentOption === 'full'
                ? 'border-[#ce112d] bg-white shadow-sm ring-2 ring-[#ce112d]/10'
                : 'border-neutral-200 bg-neutral-50/50 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase ${paymentOption === 'full' ? 'text-[#ce112d]' : 'text-neutral-600'}`}>
                {language === 'bn' ? '২. সম্পূর্ণ পেমেন্ট' : '2. Full Payment'}
              </span>
              {paymentOption === 'full' && <Check size={14} className="text-[#ce112d]" />}
            </div>
            <span className="text-sm font-black text-neutral-900">৳{finalTotal}</span>
          </button>
        </div>

        {/* Dynamic Explanation Text */}
        <p className="text-[11px] leading-relaxed font-bold text-neutral-700 bg-white p-3 rounded-xl border border-[#ce112d]/15">
          {paymentOption === 'advance' ? (
            language === 'bn'
              ? <>অগ্রিম পেমেন্ট <strong className="text-[#ce112d]">৳{advanceAmount}</strong> টাকা নিচের নম্বর/কিউআর আইডিতে পাঠাবেন। বাকি <strong className="text-neutral-900">৳{dueAmount}</strong> টাকা পণ্য হাতে পেয়ে ডেলিভারি ম্যানের কাছে পরিশোধ করবেন।</>
              : <>Pay advance amount <strong className="text-[#ce112d]">৳{advanceAmount}</strong> below. Pay due <strong className="text-neutral-900">৳{dueAmount}</strong> on delivery.</>
          ) : (
            language === 'bn'
              ? <>সম্পূর্ণ পেমেন্ট <strong className="text-[#ce112d]">৳{finalTotal}</strong> টাকা পাঠাবেন। পণ্য হাতে পাওয়ার পর আর কোনো টাকা পরিশোধ করতে হবে না।</>
              : <>Pay full amount <strong className="text-[#ce112d]">৳{finalTotal}</strong> below. No extra payment required on delivery.</>
          )}
        </p>
      </div>

      {/* Bangla QR Merchant Details (No Image) */}
      <div className="bg-white border border-neutral-200 rounded-xl p-3.5 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <span className="text-[11px] font-bold text-neutral-500">
            {language === 'bn' ? 'মার্চেন্ট নম্বর:' : 'Merchant Number:'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-widest text-[#ce112d]">{merchantNumber}</span>
            <button
              type="button"
              onClick={() => handleCopy(merchantNumber, 'number')}
              className={`p-1.5 rounded-lg transition-all ${copiedNumber ? 'bg-green-500 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
              title="Copy Number"
            >
              {copiedNumber ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <span className="text-[11px] font-bold text-neutral-500">
            {language === 'bn' ? 'মার্চেন্ট নাম:' : 'Merchant Name:'}
          </span>
          <span className="text-xs font-black text-neutral-900 tracking-wider">{merchantName}</span>
        </div>

        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <span className="text-[11px] font-bold text-neutral-500">
            {language === 'bn' ? 'কিউআর আইডি:' : 'QR ID / Terminal ID:'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-neutral-900 tracking-wider">{qrId}</span>
            <button
              type="button"
              onClick={() => handleCopy(qrId, 'qrid')}
              className={`p-1.5 rounded-lg transition-all ${copiedQrId ? 'bg-green-500 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
              title="Copy QR ID"
            >
              {copiedQrId ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-neutral-500">
            {language === 'bn' ? 'ব্যাংক নাম:' : 'Bank Name:'}
          </span>
          <span className="text-xs font-black text-emerald-600">
            {language === 'bn' ? bankNameBn : bankNameEn}
          </span>
        </div>
      </div>

      {/* Sender Account Name / Txn ID Input */}
      <input
        type="text"
        name="senderNumber"
        placeholder={language === 'bn' ? "প্রেরকের অ্যাকাউন্ট নাম / ট্রানজেকশন আইডি" : "Sender account name / Txn ID"}
        value={senderNumber}
        onChange={onSenderNumberChange}
        className="w-full border border-neutral-200 rounded-xl py-2.5 px-4 text-xs focus:border-[#ce112d] outline-none bg-white font-bold"
      />
    </div>
  );
}
