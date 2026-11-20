"use client"
import { useEffect, useState } from "react"

interface Props {
  src: string
  alt: string
  fallbackSrc: string
  className?: string
}

export default function SafeImage({ src, alt, fallbackSrc, className }: Props) {
  const [imgSrc, setImgSrc] = useState(src)

  // عند التنقل بين المقالات في نفس المسار يتغيّر src دون إعادة تركيب المكوّن،
  // فلا بد من مزامنته وإلا تظهر صورة المقال السابق.
  useEffect(() => {
    setImgSrc(src)
  }, [src])

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setImgSrc(fallbackSrc)}
      className={className}
    />
  )
}
