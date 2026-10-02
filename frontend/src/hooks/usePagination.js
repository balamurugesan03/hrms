import { useState, useCallback } from 'react';

const usePagination = (initialLimit = 10) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);

  const handlePageChange = useCallback((newPage) => setPage(newPage), []);
  const handleLimitChange = useCallback((newLimit) => { setLimit(newLimit); setPage(1); }, []);
  const reset = useCallback(() => { setPage(1); }, []);

  return { page, limit, handlePageChange, handleLimitChange, reset };
};

export default usePagination;
