import React from 'react';

export default function AdCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700/60 overflow-hidden animate-pulse flex flex-col text-right h-full" dir="rtl">
      <div className="w-full h-28 sm:h-36 bg-gray-200 dark:bg-slate-700 flex-shrink-0" />
      <div className="p-2.5 sm:p-3 flex-1 space-y-2 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="h-2.5 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-2.5 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
          </div>
          <div className="h-3.5 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-2.5 bg-gray-200 dark:bg-slate-700 rounded w-full" />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-700/50">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="flex gap-1">
            <div className="h-6 w-6 bg-gray-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-6 w-12 bg-gray-200 dark:bg-slate-700 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
