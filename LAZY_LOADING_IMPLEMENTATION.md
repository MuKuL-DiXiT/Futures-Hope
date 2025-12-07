# Lazy Loading Implementation

## Overview
Implemented lazy loading for images across the application using the Intersection Observer API. This improves performance by deferring image loading until they're needed (visible in the viewport).

## Changes Made

### 1. Created LazyImage Component
**File:** `frontend/src/components/LazyImage.jsx`

A reusable lazy-loading image component that:
- Uses the Intersection Observer API to detect when images enter the viewport
- Loads images 50px before they become visible (configurable margin)
- Provides placeholder styling while images load
- Supports fallback/error handling
- Accepts all standard HTML img attributes
- Includes optional callbacks for load/error events

**Features:**
- Automatic cleanup of observers
- Smooth transitions with placeholder
- Responsive error handling
- Dark mode support for placeholders

### 2. Updated Components

#### PostCard Component
**File:** `frontend/src/components/common/PostCard.jsx`
- Profile pictures of post authors → LazyImage
- Post media (photos) → LazyImage

#### Profile Component
**File:** `frontend/src/components/Profile.jsx`
- User profile picture in header → LazyImage
- Profile picture in expanded modal → LazyImage

#### PeopleProfile Component
**File:** `frontend/src/components/PeopleProfile.jsx`
- User profile picture → LazyImage

#### CommunityPage Component
**File:** `frontend/src/components/CommunityPage.jsx`
- Community profile picture → LazyImage

#### Home Component
**File:** `frontend/src/components/Home.jsx`
- Search results user profile pictures → LazyImage
- Search results community profile pictures → LazyImage
- Communities section profile pictures → LazyImage

## Performance Benefits

1. **Reduced Initial Load Time**: Images are only downloaded when needed
2. **Lower Bandwidth Usage**: Off-screen images aren't loaded
3. **Better Performance on Mobile**: Especially beneficial with limited bandwidth
4. **Improved Perceived Performance**: Page feels faster as critical content loads first

## Browser Support

The Intersection Observer API is supported in all modern browsers:
- Chrome 51+
- Firefox 55+
- Safari 12.1+
- Edge 16+

## Implementation Details

### Lazy Loading Margin
Images start loading 50px before entering the viewport. This can be adjusted in `LazyImage.jsx`:

```javascript
rootMargin: '50px', // Adjust this value
```

### Placeholder Styling
Default placeholder uses Tailwind's gray-200 (light mode) and gray-700 (dark mode). Customize via the `placeholder` prop:

```jsx
<LazyImage 
  src={imageUrl} 
  placeholder="bg-blue-100 dark:bg-blue-900"
/>
```

### Error Handling
Images that fail to load show the placeholder indefinitely. To handle errors:

```jsx
<LazyImage 
  src={imageUrl}
  onError={() => console.log('Image failed to load')}
/>
```

## Migration Guide

To add lazy loading to new images:

```jsx
// Before
<img src={imageUrl} alt="description" className="w-10 h-10 rounded-full" />

// After
<LazyImage src={imageUrl} alt="description" className="w-10 h-10 rounded-full" />
```

Just replace `img` with `LazyImage` and add the import:

```jsx
import LazyImage from './LazyImage';
```

## Notes

- Videos still use native `<video>` tags (no lazy loading applied)
- The component gracefully handles missing or null src URLs
- All existing image functionality is preserved
