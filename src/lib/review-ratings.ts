export const REVIEW_CATEGORIES = { cleanliness: "Cleanliness", accuracy: "Accuracy", check_in: "Check-in", communication: "Communication", location: "Location", value: "Value" } as const;
export type ReviewCategory = keyof typeof REVIEW_CATEGORIES;
export type CategoryRatings = Partial<Record<ReviewCategory, number>>;
export const validRating = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;
export function reviewRatingErrors(rating: unknown, categories: unknown): string[] {
  const errors = validRating(rating) ? [] : ["Overall rating must be a whole number from 1 to 5."];
  if (categories != null) {
    if (typeof categories !== "object" || Array.isArray(categories)) errors.push("Category ratings must be an object.");
    else for (const [key,value] of Object.entries(categories)) if (!Object.hasOwn(REVIEW_CATEGORIES, key) || !validRating(value)) errors.push("Category ratings must be whole numbers from 1 to 5, or left blank.");
  }
  return errors;
}
export function normalizeCategoryRatings(value: unknown): CategoryRatings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key,n])=>Object.hasOwn(REVIEW_CATEGORIES, key) && validRating(n)));
}
export function aggregateReviews(reviews: { published: boolean; rating: number; categoryRatings?: CategoryRatings }[]) {
  const published=reviews.filter(r=>r.published && validRating(r.rating));
  const distribution=[5,4,3,2,1].map(stars=>({stars,count:published.filter(r=>r.rating===stars).length}));
  const categories=Object.entries(REVIEW_CATEGORIES).map(([key,label])=>{const values=published.map(r=>r.categoryRatings?.[key as ReviewCategory]).filter(validRating);return {key:key as ReviewCategory,label,count:values.length,average:values.length?values.reduce((a,b)=>a+b,0)/values.length:null};});
  return { count:published.length,average:published.length?published.reduce((n,r)=>n+r.rating,0)/published.length:null,distribution,categories };
}
