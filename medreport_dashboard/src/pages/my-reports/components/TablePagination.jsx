import React from 'react';

import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const TablePagination = ({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange, 
  onItemsPerPageChange 
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const itemsPerPageOptions = [
    { value: 10, label: '10 per page' },
    { value: 25, label: '25 per page' },
    { value: 50, label: '50 per page' },
    { value: 100, label: '100 per page' }
  ];

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range?.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots?.push(1, '...');
    } else {
      rangeWithDots?.push(1);
    }

    rangeWithDots?.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots?.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots?.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
        {/* Items per page selector */}
        <div className="flex items-center space-x-3">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select
            options={itemsPerPageOptions}
            value={itemsPerPage}
            onChange={onItemsPerPageChange}
            className="w-32"
          />
        </div>

        {/* Page info */}
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {totalItems} reports
        </div>

        {/* Pagination controls */}
        <div className="flex items-center space-x-2">
          {/* Previous button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            iconName="ChevronLeft"
            iconPosition="left"
          >
            Previous
          </Button>

          {/* Page numbers */}
          <div className="hidden sm:flex items-center space-x-1">
            {getVisiblePages()?.map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="px-3 py-2 text-muted-foreground">...</span>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className="w-10 h-10"
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile page indicator */}
          <div className="sm:hidden flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          {/* Next button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            iconName="ChevronRight"
            iconPosition="right"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TablePagination;