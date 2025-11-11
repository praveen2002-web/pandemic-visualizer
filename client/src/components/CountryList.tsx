import React, { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectCountriesList } from '../store/selectors';
import { setSelectedCountry } from '../store/covidSlice';
import { formatNumber, formatPercentage } from '../utils/colorUtils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortKey = 'name' | 'cases' | 'deaths' | 'recovered' | 'active' | 'vaccinationPercentage';
type SortOrder = 'asc' | 'desc';

export const CountryList: React.FC = () => {
  const dispatch = useAppDispatch();
  const countries = useAppSelector(selectCountriesList);
  const [sortKey, setSortKey] = useState<SortKey>('cases');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedCountries = useMemo(() => {
    let sorted = [...countries];

    // Filter by search term
    if (searchTerm) {
      sorted = sorted.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    sorted.sort((a, b) => {
      let aVal: any = sortKey === 'vaccinationPercentage' ? a.vaccinationPercentage : (a as any)[sortKey];
      let bVal: any = sortKey === 'vaccinationPercentage' ? b.vaccinationPercentage : (b as any)[sortKey];

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
      <h2 className="text-2xl font-bold text-white mb-4">Countries List</h2>

      {/* Search */}
      <input
        type="text"
        placeholder="Search countries..."
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
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                >
                  Country
                  <SortIcon column="name" />
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
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('recovered')}
                  className="flex items-center justify-end gap-2 w-full hover:text-blue-400 transition-colors"
                >
                  Recovered
                  <SortIcon column="recovered" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('active')}
                  className="flex items-center justify-end gap-2 w-full hover:text-blue-400 transition-colors"
                >
                  Active
                  <SortIcon column="active" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('vaccinationPercentage')}
                  className="flex items-center justify-end gap-2 w-full hover:text-blue-400 transition-colors"
                >
                  Vaccination
                  <SortIcon column="vaccinationPercentage" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCountries.map(country => (
              <tr
                key={country.code}
                onClick={() => dispatch(setSelectedCountry(country.code))}
                className="border-b border-slate-700/50 hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {country.flag && (
                      <img
                        src={country.flag}
                        alt={country.name}
                        className="w-6 h-4 rounded object-cover"
                      />
                    )}
                    <span className="font-medium text-white">{country.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-blue-400">{formatNumber(country.cases)}</td>
                <td className="px-4 py-3 text-right text-red-400">{formatNumber(country.deaths)}</td>
                <td className="px-4 py-3 text-right text-green-400">{formatNumber(country.recovered)}</td>
                <td className="px-4 py-3 text-right text-yellow-400">{formatNumber(country.active)}</td>
                <td className="px-4 py-3 text-right text-purple-400">
                  {formatPercentage(country.vaccinationPercentage)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedCountries.length === 0 && (
        <div className="flex items-center justify-center py-8 text-slate-400">
          No countries found
        </div>
      )}
    </div>
  );
};
