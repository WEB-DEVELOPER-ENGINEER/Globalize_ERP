/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Migration Tool Component
 * Add this temporarily to your app to migrate data
 */

import { useState } from 'react';
import { Database, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  migrateLocalStorageToSupabase, 
  exportLocalStorageBackup, 
  validateMigration 
} from '../scripts/migrateToSupabase';

export function MigrationTool() {
  const [status, setStatus] = useState<'idle' | 'backing-up' | 'migrating' | 'validating' | 'complete' | 'error'>('idle');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleBackup = () => {
    try {
      setStatus('backing-up');
      exportLocalStorageBackup();
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleMigrate = async () => {
    try {
      setStatus('migrating');
      setError('');
      const migrationResults = await migrateLocalStorageToSupabase();
      setResults(migrationResults);
      
      if (migrationResults.errors.length === 0) {
        setStatus('complete');
      } else {
        setStatus('error');
        setError(`Migration completed with ${migrationResults.errors.length} errors`);
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleValidate = async () => {
    try {
      setStatus('validating');
      setError('');
      const validation = await validateMigration();
      setResults(validation);
      setStatus('complete');
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white shadow-2xl rounded-lg border-2 border-blue-500 p-6 z-50">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-6 h-6 text-blue-600" />
        <h3 className="font-bold text-lg">Supabase Migration Tool</h3>
      </div>

      <div className="space-y-3">
        {/* Backup Button */}
        <button
          onClick={handleBackup}
          disabled={status === 'backing-up'}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors border border-gray-300"
        >
          <Download className="w-5 h-5" />
          <span className="font-medium">
            {status === 'backing-up' ? 'Downloading...' : '1. Backup localStorage'}
          </span>
        </button>

        {/* Migration Button */}
        <button
          onClick={handleMigrate}
          disabled={status === 'migrating'}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          {status === 'migrating' ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="font-medium">Migrating...</span>
            </>
          ) : (
            <>
              <Database className="w-5 h-5" />
              <span className="font-medium">2. Migrate to Supabase</span>
            </>
          )}
        </button>

        {/* Validation Button */}
        <button
          onClick={handleValidate}
          disabled={status === 'validating'}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
        >
          {status === 'validating' ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="font-medium">Validating...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">3. Validate Migration</span>
            </>
          )}
        </button>
      </div>

      {/* Status Messages */}
      {status === 'complete' && results && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-800">Success!</p>
              {results.success && (
                <p className="text-green-700 mt-1">
                  ✓ {results.success.length} operations completed
                </p>
              )}
              {results.allMatch !== undefined && (
                <p className="text-green-700 mt-1">
                  {results.allMatch ? '✓ All data validated' : '⚠ Some counts differ'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {results?.errors && results.errors.length > 0 && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg max-h-32 overflow-y-auto">
          <p className="font-semibold text-orange-800 text-sm mb-2">
            Errors ({results.errors.length}):
          </p>
          <ul className="text-xs text-orange-700 space-y-1">
            {results.errors.map((err: string, idx: number) => (
              <li key={idx}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Instructions:</strong>
          <br />
          1. First, backup your data
          <br />
          2. Run the migration to Supabase
          <br />
          3. Validate that all data was migrated
          <br />
          4. Remove this component when done
        </p>
      </div>

      {/* Open Console Note */}
      <p className="mt-3 text-xs text-gray-500 text-center">
        Check browser console for detailed logs
      </p>
    </div>
  );
}
