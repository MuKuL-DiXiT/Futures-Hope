import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImage Component - Implements lazy loading for images using Intersection Observer API
 * 
 * Props:
 * - src: Image source URL
 * - alt: Alternative text
 * - className: CSS classes to apply
 * - placeholder: Optional placeholder image/color (default: light gray)
 * - onLoad: Optional callback when image loads
 * - onError: Optional callback when image fails to load
 */
export default function LazyImage({ 
  src, 
  alt = '', 
  className = '', 
  placeholder = 'bg-gray-200 dark:bg-gray-700',
  onLoad,
  onError,
  ...props
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // Skip if no src provided
    if (!src) {
      setIsLoading(false);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Image is now visible, start loading
            setImageSrc(src);
            // Stop observing this element
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src]);

  const handleImageLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsLoading(false);
    setIsError(true);
    onError?.();
  };

  return (
    <div ref={imgRef} className={`${isLoading ? placeholder : ''} ${className}`}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={className}
          {...props}
        />
      ) : (
        <div className={`${placeholder} ${className}`} />
      )}
    </div>
  );
}
