import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { getOptimizedUrl, mediaSizes } from '../../utils/media';

export default function BannerSlider({ banners }) {
  return (
    <div className="w-full h-[200px] md:h-[450px] mb-8 rounded-2xl overflow-hidden shadow-2xl">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 5000 }}
        pagination={{ clickable: true }}
        className="h-full w-full"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div className="relative h-full w-full">
              <img
                src={getOptimizedUrl(banner.image, mediaSizes.banner)}
                className="w-full h-full object-cover"
                alt="Promotion"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-8 md:p-12">
                <span className="bg-[#ce112d] text-white px-6 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-red-900/40">Limited Collection</span>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
