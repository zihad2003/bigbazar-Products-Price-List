import React, { useEffect, useState } from 'react';
import { Star, Send } from 'lucide-react';
import { bigBazarApi } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';

export default function ProductReviews({ productId, productName }) {
  const { language } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const { data } = await bigBazarApi.from('reviews').select('*').eq('product_id', productId);
      setReviews(Array.isArray(data) ? data : []);
    } catch (_) {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [productId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError(language === 'bn' ? 'মতামত লিখুন' : 'Please write a review');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
          customer_name: name.trim() || (language === 'bn' ? 'কাস্টমার' : 'Customer'),
          product_id: productId,
          product_name: productName || '',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      setDone(true);
      setComment('');
      setName('');
      setRating(5);
      await load();
    } catch (err) {
      setError(err.message || (language === 'bn' ? 'জমা দিতে ব্যর্থ' : 'Submit failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const avg =
    reviews.length > 0
      ? reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length
      : 0;

  return (
    <section className="mt-10 md:mt-14 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-zinc-900 tracking-tight">
            {language === 'bn' ? 'কাস্টমার রিভিউ' : 'Customer reviews'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {reviews.length > 0
              ? `${avg.toFixed(1)} / 5 · ${reviews.length} ${language === 'bn' ? 'টি রিভিউ' : 'reviews'}`
              : language === 'bn'
                ? 'এখনো কোনো রিভিউ নেই — প্রথমটি আপনিই দিন'
                : 'No reviews yet — be the first'}
          </p>
        </div>
        {reviews.length > 0 && (
          <div className="flex gap-0.5 text-[#ce112d]">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={16} className={s <= Math.round(avg) ? 'fill-current' : 'text-zinc-200'} />
            ))}
          </div>
        )}
      </div>

      {!loading && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.slice(0, 12).map((r) => (
            <div key={r.id} className="rounded-2xl border border-zinc-150 bg-zinc-50/50 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex gap-0.5 text-[#ce112d]">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={12} className={s <= r.rating ? 'fill-current' : 'text-zinc-200'} />
                  ))}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                </span>
              </div>
              {r.comment && <p className="text-sm text-zinc-700 leading-relaxed">{r.comment}</p>}
              <p className="text-xs font-semibold text-zinc-500 mt-2">{r.customer_name || 'Customer'}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 space-y-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {language === 'bn' ? 'রিভিউ লিখুন' : 'Write a review'}
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              className={`p-1 ${s <= rating ? 'text-[#ce112d]' : 'text-zinc-300'}`}
              aria-label={`${s} stars`}
            >
              <Star size={20} className={s <= rating ? 'fill-current' : ''} />
            </button>
          ))}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={language === 'bn' ? 'আপনার নাম (ঐচ্ছিক)' : 'Your name (optional)'}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#ce112d]/40"
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={language === 'bn' ? 'আপনার মতামত লিখুন...' : 'Share your experience...'}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#ce112d]/40 resize-none"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {done && (
          <p className="text-xs text-emerald-600">
            {language === 'bn' ? 'ধন্যবাদ! আপনার রিভিউ যোগ হয়েছে।' : 'Thanks! Your review was added.'}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ce112d] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#b00e26] disabled:opacity-60"
        >
          <Send size={14} />
          {submitting
            ? language === 'bn'
              ? 'পাঠানো হচ্ছে...'
              : 'Sending...'
            : language === 'bn'
              ? 'জমা দিন'
              : 'Submit review'}
        </button>
      </form>
    </section>
  );
}
