import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import SizeGuide from './SizeGuide';
import VideoPlayer from './VideoPlayer';

const ProductTabs = ({ description, videoUrl, hasSizes }) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('description');

  // Determine which tabs to show
  const tabs = [
    { id: 'description', label: language === 'bn' ? 'বিবরণ' : 'Description' },
  ];

  if (videoUrl) {
    tabs.push({ id: 'video', label: language === 'bn' ? 'প্রোডাক্ট ভিডিও' : 'Product Video' });
  }

  if (hasSizes) {
    tabs.push({ id: 'sizeguide', label: language === 'bn' ? 'সাইজ গাইড' : 'Size Guide' });
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-neutral-200 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-[#ce112d] text-[#ce112d]'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'description' && (
          <div className="text-sm leading-relaxed text-neutral-600 font-medium whitespace-pre-wrap">
            {description || (language === 'bn' ? 'কোনো বিবরণ নেই' : 'No description available')}
          </div>
        )}

        {activeTab === 'video' && (
          <div className="space-y-4 pt-2">
            {videoUrl ? (
              <div className="w-full max-w-sm sm:max-w-md mx-auto aspect-[9/16] min-h-[480px] max-h-[580px] rounded-2xl overflow-hidden shadow-2xl bg-black border border-neutral-800 relative">
                <VideoPlayer src={videoUrl} priority={true} />
              </div>
            ) : (
              <div className="p-4 bg-neutral-50 rounded-xl text-center text-neutral-500 text-sm">
                {language === 'bn' ? 'কোনো ভিডিও নেই' : 'No video available'}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sizeguide' && <SizeGuide />}
      </div>
    </div>
  );
};

export default ProductTabs;
