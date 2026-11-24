const keys = ['category', 'q', 'page', 'availability', 'minPrice', 'maxPrice', 'sort'];

export function catalogQuery(input) {
  const query = new URLSearchParams({limit: '12'});
  for (const key of keys) {
    for (const value of input.getAll(key)) query.append(key, value);
  }
  return query.toString();
}
