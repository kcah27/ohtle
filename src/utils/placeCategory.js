export function inferCategory(types) {
  if (!types) return 'attraction'
  if (types.includes('lodging')) return 'lodging'
  if (types.includes('restaurant') || types.includes('food') || types.includes('cafe') || types.includes('bakery') || types.includes('bar') || types.includes('meal_delivery') || types.includes('meal_takeaway')) return 'lunch'
  return 'attraction'
}
