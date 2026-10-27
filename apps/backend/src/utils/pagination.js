function parsePagination(query = {}) {
  const requested = query.page !== undefined || query.pageSize !== undefined;
  if (!requested) return null;
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 25));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

function paginateResult(items, total, pagination) {
  return {
    items,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      pageCount: Math.ceil(total / pagination.pageSize)
    }
  };
}

module.exports = { parsePagination, paginateResult };
