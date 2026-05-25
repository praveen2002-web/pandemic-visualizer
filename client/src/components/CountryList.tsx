import React, { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectActiveCountriesList } from '@/store/pandemicSelectors';
import { setSelectedCountry } from '@/store/pandemicSlice';
import { formatNumber, formatPercentage } from '../utils/colorUtils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortKey = 'country' | 'cases' | 'deaths' | 'recovered' | 'active' | 'fatalityRate' | 'vaccinationPercentage';
type SortOrder = 'asc' | 'desc';

export const CountryList: React.FC = () => {
  const dispatch = useAppDispatch();
  const countries = useAppSelector(selectActiveCountriesList);
  const [sortKey, setSortKey] = useState<SortKey>('cases');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedCountries = useMemo(() => {
    let sorted = [...countries];

    // Filter by search term
    if (searchTerm) {
      sorted = sorted.filter(c =>
        c.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.countryCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    sorted.sort((a, b) => {
      let aVal: any = (a as any)[sortKey];
      let bVal: any = (b as any)[sortKey];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  }, [countries, sortKey, sortOrder, searchTerm]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-4 h-4 text-slate-500" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-blue-400" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-400" />
    );
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-lg p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-white mb-4">Locations List</h2>

      {/* Search */}
      <input
        type="text"
        placeholder="Search locations..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 mb-4 focus:outline-none focus:border-blue-500"
      />

      {/* Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800/50">
            <tr className="border-b border-slate-700">
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('country')}
                  className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                >
                  Location
                  <SortIcon column="country" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('cases')}
                  className="flex items-center justify-end gap-2 w-full hover:text-blue-400 transition-colors"
                >
                  Cases
                  <SortIcon column="cases" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('deaths')}
                  className="flex items-center justify-end gap-2 w-full hover:text-blue-400 transition-colors"
                >
                  Deaths
                  <SortIcon column="deaths" />
                </button>
              </th>
              {countries.some(c => c.fatalityRate !== undefined) && (
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('fatalityRate')}
                    className="flex items-center justify-end gap-2 w-full hover:text-blue-400 transition-colors"
                  >
                    Fatality Rate
                    <SortIcon column="fatalityRate" />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedCountries.map(location => (
              <tr
                key={location.countryCode}
                onClick={() => dispatch(setSelectedCountry(location.countryCode))}
                className="border-b border-slate-700/50 hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-white">{location.country}</span>
                </td>
                <td className="px-4 py-3 text-right text-blue-400">{formatNumber(location.cases)}</td>
                <td className="px-4 py-3 text-right text-red-400">{formatNumber(location.deaths)}</td>
                {location.fatalityRate !== undefined && (
                  <td className="px-4 py-3 text-right text-amber-400">
                    {location.fatalityRate.toFixed(1)}%
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedCountries.length === 0 && (
        <div className="flex items-center justify-center py-8 text-slate-400">
          No locations found
        </div>
      )}
    </div>
  );
};
