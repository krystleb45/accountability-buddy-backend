export const paginate = (
  totalItems: number,
  currentPage: number,
  pageSize: number,
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    totalItems,
    currentPage,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
};
