'use client';

import { useState, useEffect, useCallback } from 'react';
import { browseDirectory, type BrowseResult } from '../services/browse-action';

interface Props {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
}

export function DirectoryPicker({ value, onChange, placeholder }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [browseResult, setBrowseResult] = useState<BrowseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadDirectory = useCallback(async (dirPath?: string) => {
    setIsLoading(true);
    const result = await browseDirectory(dirPath);
    setBrowseResult(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && !browseResult) {
      loadDirectory(value || undefined);
    }
  }, [isOpen, browseResult, value, loadDirectory]);

  function handleOpen() {
    setBrowseResult(null);
    setIsOpen(true);
  }

  function handleSelect(path: string) {
    onChange(path);
    setIsOpen(false);
    setBrowseResult(null);
  }

  function handleNavigate(path: string) {
    loadDirectory(path);
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={handleOpen}
          className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
        >
          Explorar
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-80 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-900/80 border-b border-gray-700">
            <span className="text-xs text-gray-400 truncate flex-1 mr-2">
              {browseResult?.currentPath ?? 'Cargando...'}
            </span>
            <button
              type="button"
              onClick={() => { setIsOpen(false); setBrowseResult(null); }}
              className="text-gray-500 hover:text-white text-sm px-1"
            >
              X
            </button>
          </div>

          {/* Navigation */}
          <div className="flex gap-1 px-3 py-2 border-b border-gray-700">
            {browseResult?.parentPath && (
              <button
                type="button"
                onClick={() => handleNavigate(browseResult.parentPath!)}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                .. Subir
              </button>
            )}
            <button
              type="button"
              onClick={() => browseResult && handleSelect(browseResult.currentPath)}
              className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600 ml-auto"
            >
              Seleccionar esta carpeta
            </button>
          </div>

          {/* Error */}
          {browseResult?.error && (
            <div className="px-3 py-2 text-xs text-red-400">{browseResult.error}</div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">Cargando...</div>
          )}

          {/* Directory list */}
          {!isLoading && browseResult && (
            <div className="overflow-y-auto max-h-48">
              {browseResult.entries.length === 0 && !browseResult.error && (
                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                  No hay subcarpetas
                </div>
              )}
              {browseResult.entries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() => handleNavigate(entry.path)}
                  onDoubleClick={() => handleSelect(entry.path)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
                >
                  <span className="text-yellow-500 text-xs">&#x1F4C1;</span>
                  {entry.name}
                </button>
              ))}
            </div>
          )}

          {/* Hint */}
          <div className="px-3 py-1.5 border-t border-gray-700 text-xs text-gray-600">
            Click para navegar - Doble click para seleccionar
          </div>
        </div>
      )}
    </div>
  );
}
