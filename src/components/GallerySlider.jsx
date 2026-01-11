import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

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
            <img src={img} className="w-full h-full object-cover" alt="Product" />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}