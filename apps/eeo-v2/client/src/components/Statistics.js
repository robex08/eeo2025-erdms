import React, { useState, useMemo, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const Statistics = ({ filteredOrders, selectedYear, lpsData }) => {
  const year = useMemo(() => {
    // Use the selectedYear prop or fallback to the value from localStorage
    return selectedYear || localStorage.getItem('orders_yearFilter') || "Všechny roky";
  }, [selectedYear]);

  const [activeTab, setActiveTab] = useState(() => {
    // Load the active tab from localStorage or default to 'overview'
    return localStorage.getItem('statistics_activeTab') || 'overview';
  });

  // Save the active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('statistics_activeTab', activeTab);
  }, [activeTab]);

  // Calculate the total price of all orders
  const totalPrice = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + (parseFloat(order.cena_rok) || 0), 0);
  }, [filteredOrders]);

  // Process data for the "Přehled dle úseků" tab
  const sectionData = useMemo(() => {
    const sectionMap = filteredOrders.reduce((acc, order) => {
      const section = order.garant || 'neuvedeno';
      if (!acc[section]) {
        acc[section] = { count: 0, totalPrice: 0 };
      }
      acc[section].count += 1;
      acc[section].totalPrice += parseFloat(order.cena_rok) || 0;
      return acc;
    }, {});

    return Object.entries(sectionMap).map(([section, data]) => ({
      section,
      count: data.count,
      totalPrice: data.totalPrice,
      percentage: ((data.totalPrice / totalPrice) * 100).toFixed(2), // Calculate percentage
    }));
  }, [filteredOrders, totalPrice]);

  // Prepare data for the pie chart
  const pieChartData = useMemo(() => {
    const labels = sectionData.map((item) => item.section);
    const data = sectionData.map((item) => item.totalPrice);
    const backgroundColors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8DD3C7',
    ];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors.slice(0, labels.length),
        },
      ],
    };
  }, [sectionData]);

  const pieChartOptions = useMemo(() => ({
    plugins: {
      legend: {
        display: false, // Disable the native legend
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const percentage = ((value / totalPrice) * 100).toFixed(2);
            const formattedValue = value.toLocaleString('cs-CZ'); // Format the value as currency
            return `${percentage}% (${formattedValue} Kč)`; // Display percentage and total price
          },
        },
      },
      datalabels: {
        display: (context) => {
          const value = context.dataset.data[context.dataIndex]; // Access the correct value
          const percentage = (value / totalPrice) * 100;
          return percentage >= 6; // Only display labels for percentages >= 6%
        },
        formatter: (value, context) => {
          const percentage = ((value / totalPrice) * 100).toFixed(2);
          return `${percentage}%`; // Display percentage on the slice
        },
        color: '#fff',
        font: {
          weight: 'bold',
          size: 14, // Adjust font size for better visibility
        },

        align: 'end', // Align labels towards the edge
        offset: 12, // Offset labels from the edge

      },
    },
  }), [totalPrice]);

  // Process data for the table
  const tableData = useMemo(() => {
    if (!lpsData.length) return [];

    // Determine the year interval based on the selected year
    const yearStart = year === "Všechny roky" ? new Date("2000-01-01") : new Date(`${year}-01-01`);
    const yearEnd = year === "Všechny roky" ? new Date("2099-12-31") : new Date(`${year}-12-31`);

    const lpMap = {};

    // Helper function to parse dates from "dd.mm.yyyy" format
    const parseDate = (dateString) => {
      if (!dateString) return null;
      const [day, month, year] = dateString.split('.').map(Number);
      return new Date(year, month - 1, day); // Month is 0-indexed in JavaScript Date
    };

    // Group API data by category
    lpsData.forEach((lp) => {
      const platneOd = parseDate(lp.platne_od); // Parse `platne_od`
      const platneDo = parseDate(lp.platne_do); // Parse `platne_do`

      // Filter LPs based on the interval
      if (
        (!platneOd || platneOd >= yearStart) &&
        (!platneDo || platneDo <= yearEnd)
      ) {
        const category = lp.kategorie || 'neuvedeno';
        if (!lpMap[category]) {
          lpMap[category] = {
            jmeno: lp.jmeno || 'neuvedeno',
            garant: lp.garant_id || 'neuvedeno',
            kategorie: category,
            budget: 0,
            ordersCount: 0,
            ordersPrice: 0,
            subRows: [],
          };
        }

        // Prepare sub-row data
        const subRow = {
          cisloLP: lp.cislo_lp || 'neuvedeno',
          cisloUctu: lp.cislo_uctu || '',
          nazevUctu: lp.nazev_uctu || '',
          budget: parseFloat(lp.vyse_financniho_kryti) || 0,
          ordersCount: 0,
          ordersPrice: 0,
        };

        // Calculate sub-row data based on filtered orders
        filteredOrders.forEach((order) => {
          if (order.cislo_lp === lp.cislo_lp) {
            subRow.ordersCount += 1;
            subRow.ordersPrice += parseFloat(order.cena_rok) || 0;
          }
        });

        // Check if the sub-row with the same `cisloLP` already exists
        const existingSubRow = lpMap[category].subRows.find((row) => row.cisloLP === subRow.cisloLP);
        if (existingSubRow) {
          // If it exists, aggregate only the budget (avoid duplicating ordersCount and ordersPrice)
          existingSubRow.budget += subRow.budget;
        } else {
          lpMap[category].subRows.push(subRow);
        }
      }
    });

    // Aggregate main row data from sub-rows
    Object.values(lpMap).forEach((mainRow) => {
      mainRow.budget = mainRow.subRows.reduce((sum, subRow) => sum + subRow.budget, 0); // Aggregate budget
      mainRow.ordersCount = mainRow.subRows.reduce((sum, subRow) => sum + subRow.ordersCount, 0);
      mainRow.ordersPrice = mainRow.subRows.reduce((sum, subRow) => sum + subRow.ordersPrice, 0);
    });

    return Object.values(lpMap);
  }, [lpsData, filteredOrders, year]);

  // Define columns for the table
  const columns = useMemo(() => [
    {
      id: 'expander',
      header: ({ table }) => {
        const isAllExpanded = table.getIsAllRowsExpanded();
        return (
          <button
            onClick={() => table.toggleAllRowsExpanded()}
            style={{
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              padding: '0', // Remove padding
              display: 'flex',
              alignItems: 'center', // Center vertically
              justifyContent: 'center', // Center horizontally
            }}
            title={isAllExpanded ? 'Sbalit vše' : 'Rozbalit vše'}
          >
            {isAllExpanded ? '−' : '+'}
          </button>
        );
      },
      size: 30, // Minimized width for the expander column
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            row.toggleExpanded();
          }}
          style={{
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            padding: '0', // Remove padding
            display: 'flex',
            alignItems: 'center', // Center vertically
            justifyContent: 'center', // Center horizontally
          }}
        >
          {row.getIsExpanded() ? '−' : '+'}
        </button>
      ),
    },
    { accessorKey: 'jmeno', header: 'Příkazce', size: 150 },
    {
      accessorKey: 'garant',
      header: 'Úsek',
      size: 100,
      cell: (info) => (
        <div style={{ textAlign: 'center' }}>{info.getValue()}</div>
      ),
    },
    { accessorKey: 'kategorie', header: 'LP', size: 80 },
    {
      accessorKey: 'budget',
      header: 'Budget',
      size: 120,
      cell: (info) => (
        <div style={{ textAlign: 'right', padding: '0 5px' }}>
          {info.getValue().toLocaleString('cs-CZ')} Kč
        </div>
      ),
    },
    {
      accessorKey: 'ordersCount',
      header: 'OBJ (KS)',
      size: 80,
      cell: (info) => (
        <div style={{ textAlign: 'center', padding: '0 5px' }}>
          {info.getValue()}
        </div>
      ),
    },
    {
      accessorKey: 'ordersPrice',
      header: 'Cena s DPH (OBJ)',
      size: 120,
      cell: (info) => (
        <div style={{ textAlign: 'right', padding: '0 5px' }}>
          {info.getValue().toLocaleString('cs-CZ')} Kč
        </div>
      ),
    },
    {
      id: 'difference',
      header: 'Zbývá',
      size: 120,
      cell: ({ row }) => {
        const difference = row.original.budget - row.original.ordersPrice;
        const color = difference > 0 ? 'green' : 'red';
        return (
          <div style={{ textAlign: 'right', color, padding: '0 5px' }}>
            {difference.toLocaleString('cs-CZ')} Kč
          </div>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: activeTab === 'limitedPromises' ? tableData : [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => row.original.subRows?.length > 0,
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="legend-chart-container">
            <div className="legend-container">
              {sectionData.map((item, index) => (
                <div key={index} className="legend-item">
                  <span
                    className="legend-color"
                    style={{ backgroundColor: pieChartData.datasets[0].backgroundColor[index] }}
                  ></span>
                  <span className="legend-text">
                    {item.section}: {item.count} Ks : {item.totalPrice.toLocaleString('cs-CZ')} Kč ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
            <div className="chart-wrapper">
              <Pie data={pieChartData} options={pieChartOptions} />
            </div>
          </div>
        );
      case 'limitedPromises':
        return (
          <div className="limited-promises-table-wrapper">
            <table className="limited-promises-table">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr className="lp-main-row">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                    {row.getIsExpanded() && (
                      <>
                        {row.original.subRows.map((subRow, index) => {
                          const diff = subRow.budget - subRow.ordersPrice;
                          return (
                            <tr className="lp-sub-row" key={index}>
                              {/* expander placeholder */}
                              <td className="lp-sub-empty" />
                              {/* Příkazce placeholder */}
                              <td className="lp-sub-empty" />
                              {/* Úsek placeholder */}
                              <td className="lp-sub-empty" />
                              {/* LP column actual content */}
                              <td className="lp-sub-lp">
                                <span className="lp-code">{subRow.cisloLP}</span>{' '}
                                <span className="lp-account">({subRow.cisloUctu})</span>
                                <br />
                                <span className="lp-account">{subRow.nazevUctu}</span>
                              </td>
                              <td style={{ textAlign: 'right' }}>{subRow.budget.toLocaleString('cs-CZ')} Kč</td>
                              <td style={{ textAlign: 'center' }}>{subRow.ordersCount}</td>
                              <td style={{ textAlign: 'right' }}>{subRow.ordersPrice.toLocaleString('cs-CZ')} Kč</td>
                              <td style={{ textAlign: 'right' }}>
                                <span className={diff > 0 ? 'value-positive' : 'value-negative'}>
                                  {diff.toLocaleString('cs-CZ')} Kč
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return <p>Obsah zatím není k dispozici.</p>;
    }
  };

  return (
    <div className="statistics-container">
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Přehled dle úseků
        </button>
        <button
          className={`tab-button ${activeTab === 'limitedPromises' ? 'active' : ''}`}
          onClick={() => setActiveTab('limitedPromises')}
        >
          Limitované přísliby
        </button>
      </div>
      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Statistics;
