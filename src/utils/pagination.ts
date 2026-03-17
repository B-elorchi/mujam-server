export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export const getPagination = (page?: string | string[], limit?: string | string[]): PaginationParams => {
  const pageStr = Array.isArray(page) ? page[0] : page;
  const limitStr = Array.isArray(limit) ? limit[0] : limit;
  
  const pageNum = pageStr ? parseInt(pageStr, 10) : 1;
  const limitNum = limitStr ? parseInt(limitStr, 10) : 20;
  
  const safePage = isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
  const safeLimit = isNaN(limitNum) || limitNum < 1 ? 20 : Math.min(limitNum, 100);
  
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
};

export const cursorPagination = <T extends { id: string }>(
  items: T[],
  cursor: string | undefined,
  limit: number
): { items: T[]; nextCursor: string | null } => {
  let startIndex = 0;
  
  if (cursor) {
    const cursorIndex = items.findIndex(item => item.id === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }
  
  const paginatedItems = items.slice(startIndex, startIndex + limit);
  const nextCursor = paginatedItems.length === limit ? paginatedItems[paginatedItems.length - 1].id : null;
  
  return {
    items: paginatedItems,
    nextCursor,
  };
};