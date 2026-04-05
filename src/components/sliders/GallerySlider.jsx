import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { getOptimizedUrl, mediaSizes } from '../../utils/media';

export default function GallerySlider({ images }) {
  return (
    <div className="w-full aspect-[4/5] bg-neutral-900 overflow-hidden">
      <Swiper
        modules={[Pagination, Navigation]}
        pagination={{ clickable: true }}
        navigation
        className="h-full w-full"
      >
        {images?.map((img, idx) => (
          <SwiperSlide key={idx}>
            <img
              src={getOptimizedUrl(img, mediaSizes.gallery)}
              className="w-full h-full object-cover"
              alt="Product"
              loading="lazy"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
