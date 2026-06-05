import React from 'react';
import { Package } from 'lucide-react';

const ComponentsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Package className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Komponenty</h2>
            <p className="text-gray-600">Přehled a ladění jednotlivých komponent intranetu</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Component Preview Card */}
          <div className="border rounded-lg p-6 hover:shadow-md transition">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-blue-600">📋</span>
              Ukázková komponenta
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Popis komponenty a jejího použití.
            </p>
            <div className="bg-gray-50 rounded p-4 border">
              <p className="text-xs text-gray-500 mb-2">Preview:</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
                Tlačítko
              </button>
            </div>
          </div>

          {/* Add Component Placeholder */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Přidejte další komponenty</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          💡 <strong>Tip:</strong> Vytvářejte komponenty jako samostatné soubory v <code className="bg-green-100 px-1 rounded">src/components/</code> a importujte je zde pro testování.
        </p>
      </div>
    </div>
  );
};

export default ComponentsPage;
