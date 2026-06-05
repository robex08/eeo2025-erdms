import React, { useState, useEffect } from 'react';
import { Layout } from 'lucide-react';
import Header from '../components/Header';
import HeaderV2 from '../components/HeaderV2';

const TestLayout: React.FC = () => {
  const [headerVersion, setHeaderVersion] = useState<1 | 2>(() => {
    const saved = localStorage.getItem('headerVersion');
    return saved === '2' ? 2 : 1;
  });

  useEffect(() => {
    localStorage.setItem('headerVersion', String(headerVersion));
  }, [headerVersion]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Layout className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Test Layout</h2>
            <p className="text-gray-600">Návrhy částí, bloků a sekcí intranetu</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Header Component Test */}
          <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 bg-orange-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">LIVE</span>
                Hlavička intranetu - Verze {headerVersion}
              </h3>
              
              {/* Přepínač verzí */}
              <div className="flex gap-2">
                <button
                  onClick={() => setHeaderVersion(1)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                    headerVersion === 1
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  Verze 1 (Původní)
                </button>
                <button
                  onClick={() => setHeaderVersion(2)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                    headerVersion === 2
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  Verze 2 (INTRANET Text)
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              {headerVersion === 1 ? (
                <>Původní verze s animovanou EKG křivkou.</>
              ) : (
                <>Nová verze s textem "INTRANET" zakomponovaným do EKG křivky.</>
              )}
            </p>
            
            <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
              {headerVersion === 1 ? <Header /> : <HeaderV2 />}
            </div>
          </div>

          {/* Example Section 2 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Příklad: Obsahové okno</h3>
            <div className="bg-white rounded-lg shadow p-6 border">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Obsahová karta</h4>
              <p className="text-gray-600 mb-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              <button className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition">
                Akce
              </button>
            </div>
          </div>

          {/* Example Section 3 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Příklad: Dlaždice (Grid)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
                  <h5 className="font-semibold text-gray-900 mb-2">Dlaždice {i}</h5>
                  <p className="text-sm text-gray-600">Ukázkový obsah dlaždice.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          ⚠️ <strong>Poznámka:</strong> Toto je prostor pro experimentování. Hotové komponenty přesuňte do složky "Komponenty" a poté je použijte v "Náhled intranetu".
        </p>
      </div>
    </div>
  );
};

export default TestLayout;
