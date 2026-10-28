export function paginationRange(currentPage, totalPages) {
  const pages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])]
    .filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  return pages.flatMap((page, index) => {
    const gap = page - pages[index - 1];
    return index === 0 || gap === 1 ? [page] : gap === 2 ? [page - 1, page] : [`gap-${page}`, page];
  });
}
