import React from 'react';

const VehiclePaging = ({ page, pageCount, pageSize, PAGE_SIZES, handlePageChange, handlePageSizeChange }) => (
  <div className="vehicles-paging" style={{display:'flex', alignItems:'center', gap:'1.2rem', marginTop:'1.2rem'}}>
    <span>Řádků na stránku: </span>
    <select value={pageSize} onChange={handlePageSizeChange}>
      {PAGE_SIZES.map(size => (
        <option key={size} value={size}>{size}</option>
      ))}
    </select>
    <span style={{marginLeft: '2rem'}}>Strana: </span>
    <button disabled={page === 1} onClick={() => handlePageChange(page - 1)}>&lt;</button>
    <span>{page} / {pageCount || 1}</span>
    <button disabled={page === pageCount || pageCount === 0} onClick={() => handlePageChange(page + 1)}>&gt;</button>
  </div>
);

export default VehiclePaging;
