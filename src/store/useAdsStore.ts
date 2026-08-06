import { create } from 'zustand';
import { Ad } from '../types';

interface AdsState {
  ads: Ad[];
  loading: boolean;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  selectedCity: string;
  searchTerm: string;
  minPrice: string;
  maxPrice: string;
  
  setAds: (ads: Ad[]) => void;
  setLoading: (loading: boolean) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedSubcategory: (subcategory: string | null) => void;
  setSelectedCity: (city: string) => void;
  setSearchTerm: (term: string) => void;
  setMinPrice: (price: string) => void;
  setMaxPrice: (price: string) => void;
  resetFilters: () => void;
}

export const useAdsStore = create<AdsState>((set) => ({
  ads: [],
  loading: true,
  selectedCategory: null,
  selectedSubcategory: null,
  selectedCity: '',
  searchTerm: '',
  minPrice: '',
  maxPrice: '',

  setAds: (ads) => set({ ads }),
  setLoading: (loading) => set({ loading }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory, selectedSubcategory: null }),
  setSelectedSubcategory: (selectedSubcategory) => set({ selectedSubcategory }),
  setSelectedCity: (selectedCity) => set({ selectedCity }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setMinPrice: (minPrice) => set({ minPrice }),
  setMaxPrice: (maxPrice) => set({ maxPrice }),
  resetFilters: () => set({
    selectedCategory: null,
    selectedSubcategory: null,
    selectedCity: '',
    searchTerm: '',
    minPrice: '',
    maxPrice: ''
  })
}));
