import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;

export const PLACEHOLDER_AVATAR = data.placeholderImages.find(img => img.id === 'user-avatar')?.imageUrl || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a';
