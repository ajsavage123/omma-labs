/**
 * Dev Error Interceptor
 * Intercepts console.error and uncaught exceptions in development mode
 * to display detailed, developer-friendly diagnostic reports.
 */

interface DBError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

const POSTGRES_ERROR_MAP: Record<string, { title: string; cause: string; fix: string }> = {
  '42501': {
    title: 'Row-Level Security (RLS) Policy Violation',
    cause: 'The active user does not have permission to query, insert, update, or delete rows on this table under current RLS policies.',
    fix: 'Check the table policies in Supabase dashboard under Authentication -> Policies. Verify you have defined SELECT, INSERT, UPDATE, or DELETE policies for the user\'s role (usually authenticated or service_role).'
  },
  '42P01': {
    title: 'Table/Relation Not Found',
    cause: 'The table you are trying to query does not exist in the active schema or database.',
    fix: 'Verify the table name spelling. Make sure database migrations or initialization SQL scripts (e.g. crm_schema.sql or supabase_schema.sql) have been run successfully in the Supabase SQL editor.'
  },
  '23505': {
    title: 'Unique Key Constraint Violation',
    cause: 'You tried to insert or update a record with a value (like an email or primary key ID) that already exists in a unique column.',
    fix: 'Ensure the unique fields (e.g. ID, email, username) are unique. Check existing table records before trying again.'
  },
  '23503': {
    title: 'Foreign Key Constraint Violation',
    cause: 'You tried to insert or update a row referencing an ID in another table that does not exist (e.g. task referencing a non-existent lead).',
    fix: 'Check that the referenced ID actually exists in the foreign table. Ensure related records are created first.'
  },
  '23502': {
    title: 'Not-Null Constraint Violation',
    cause: 'A required database column is missing or received a null/undefined value.',
    fix: 'Verify that all mandatory columns are included in your insert payload. Check table definitions to see which fields are nullable.'
  },
  '22001': {
    title: 'Value Too Long (String Data Truncation)',
    cause: 'The character string you attempted to insert exceeds the defined length constraint of the column.',
    fix: 'Shorten the input text, or increase the column length constraint in the Supabase schema using ALTER TABLE.'
  },
  'P0001': {
    title: 'Database Trigger/Function Exception',
    cause: 'A custom PostgreSQL trigger or function threw a custom exception during write/update execution.',
    fix: 'Review your custom Postgres functions and triggers. Look for RAISE EXCEPTION messages inside the triggers.'
  },
  'PGRST116': {
    title: 'PostgREST Single Row Expected Violation',
    cause: 'A query with .single() was expected to return exactly one row, but returned zero or multiple rows instead.',
    fix: 'Use .maybeSingle() if it\'s acceptable to return null when no rows exist, or ensure that a matching row is seeded.'
  }
};

function parseErrorObject(err: any): { type: string; details: DBError; cause?: string; fix?: string } | null {
  if (!err) return null;

  // Check for Supabase/PostgREST error format
  if (typeof err === 'object') {
    const isDbError = 'code' in err || 'details' in err || 'hint' in err;
    if (isDbError) {
      const code = String(err.code || '');
      const mapped = POSTGRES_ERROR_MAP[code];
      return {
        type: 'Database (Supabase / PostgREST) Error',
        details: err as DBError,
        cause: mapped?.cause || 'An unmapped database error occurred during execution.',
        fix: mapped?.fix || 'Refer to the Postgres error code or check Supabase RLS / table structures.'
      };
    }
  }

  // Check if string contains typical Supabase error patterns
  if (typeof err === 'string') {
    if (err.includes('RLS') || err.includes('row-level security') || err.includes('policy')) {
      return {
        type: 'Database Policy Exception',
        details: { message: err },
        cause: POSTGRES_ERROR_MAP['42501'].cause,
        fix: POSTGRES_ERROR_MAP['42501'].fix
      };
    }
    if (err.includes('relation') && err.includes('does not exist')) {
      return {
        type: 'Database Table Exception',
        details: { message: err },
        cause: POSTGRES_ERROR_MAP['42P01'].cause,
        fix: POSTGRES_ERROR_MAP['42P01'].fix
      };
    }
  }

  return null;
}

function printStyledDiagnostic(title: string, details: any, cause?: string, fix?: string) {
  const headerStyle = 'background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;';
  const labelStyle = 'color: #94a3b8; font-weight: bold;';
  const valStyle = 'color: #f1f5f9;';
  const causeStyle = 'color: #fca5a5; font-style: italic;';
  const fixStyle = 'color: #4ade80; font-weight: bold;';

  console.groupCollapsed(`%c[DEV DIAGNOSTICS] ⚠️ ${title}`, headerStyle);
  
  if (details.code) {
    console.log(`%cError Code: %c${details.code}`, labelStyle, valStyle);
  }
  if (details.message) {
    console.log(`%cMessage:    %c${details.message}`, labelStyle, valStyle);
  }
  if (details.details) {
    console.log(`%cDetails:    %c${details.details}`, labelStyle, valStyle);
  }
  if (details.hint) {
    console.log(`%cHint:       %c${details.hint}`, labelStyle, valStyle);
  }
  
  if (cause) {
    console.log(`%cRoot Cause: %c${cause}`, labelStyle, causeStyle);
  }
  
  if (fix) {
    console.log(`%cHow to Fix: %c${fix}`, labelStyle, fixStyle);
  }

  // Include stack trace reference
  console.log('%cStack Trace:', labelStyle);
  console.trace();
  
  console.groupEnd();
}

export function initializeDevErrorInterceptor() {
  if (import.meta.env && !import.meta.env.DEV) {
    // Only intercept in local development modes
    return;
  }

  console.log('%c[Dev Interceptor]%c Active & listening for manual testing validation.', 'color: #6366f1; font-weight: bold;', 'color: #94a3b8;');

  // Intercept standard console.error
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    // Call the original logger so it still logs standard logs
    originalConsoleError.apply(console, args);

    // Scan the arguments for database or typical runtime failures
    for (const arg of args) {
      const dbDiagnostics = parseErrorObject(arg);
      if (dbDiagnostics) {
        printStyledDiagnostic(
          dbDiagnostics.type,
          dbDiagnostics.details,
          dbDiagnostics.cause,
          dbDiagnostics.fix
        );
      }
    }
  };

  // Listen to uncaught runtime errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    const dbDiagnostics = parseErrorObject(error) || parseErrorObject(event.message);
    if (dbDiagnostics) {
      printStyledDiagnostic(
        dbDiagnostics.type,
        dbDiagnostics.details,
        dbDiagnostics.cause,
        dbDiagnostics.fix
      );
    } else if (error) {
      // General JavaScript error formatting
      printStyledDiagnostic(
        'JavaScript Runtime Error',
        { message: error.message || event.message },
        'A browser runtime or evaluation exception occurred in your code.',
        'Inspect the call stack below and fix the failing method or state check.'
      );
    }
  });

  // Listen to unhandled promise rejections (highly common with fetch and Supabase clients)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const dbDiagnostics = parseErrorObject(reason);
    if (dbDiagnostics) {
      printStyledDiagnostic(
        dbDiagnostics.type,
        dbDiagnostics.details,
        dbDiagnostics.cause,
        dbDiagnostics.fix
      );
    } else if (reason) {
      printStyledDiagnostic(
        'Unhandled Promise Rejection',
        { 
          message: reason.message || String(reason),
          details: reason.details || undefined,
          code: reason.code || undefined
        },
        'A promise was rejected, but no .catch() handler or try/catch block intercepted it.',
        'Wrap your async call or API request in a try/catch block, or add a .catch() handler.'
      );
    }
  });
}
