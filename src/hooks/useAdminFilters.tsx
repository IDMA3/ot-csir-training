import { useState, useMemo, useCallback } from 'react';
import type { LearnerReport } from '@/components/admin/LearnerReportTable';

export interface AdminFiltersState {
  nameFilter: string;
  organizationFilter: string;
  courseFilter: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export function useAdminFilters(learners: LearnerReport[]) {
  const [nameFilter, setNameFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Get unique organizations for filter dropdown
  const organizations = useMemo(() => {
    const orgs = learners
      .map(l => l.organization)
      .filter((org): org is string => !!org);
    return [...new Set(orgs)].sort();
  }, [learners]);

  // Apply all filters
  const filteredLearners = useMemo(() => {
    return learners.filter(l => {
      // Name filter
      if (nameFilter) {
        const nameLower = nameFilter.toLowerCase();
        const fullName = `${l.first_name} ${l.last_name}`.toLowerCase();
        if (!fullName.includes(nameLower)) return false;
      }
      
      // Organization filter
      if (organizationFilter && organizationFilter !== 'all') {
        if (l.organization !== organizationFilter) return false;
      }
      
      // Date range filter
      if (startDate || endDate) {
        if (!l.completion_date) return false;
        const completionDate = new Date(l.completion_date);
        if (startDate && completionDate < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (completionDate > endOfDay) return false;
        }
      }
      
      return true;
    });
  }, [learners, nameFilter, organizationFilter, startDate, endDate]);

  const hasActiveFilters = nameFilter || organizationFilter !== 'all' || courseFilter !== 'all' || startDate || endDate;

  const clearFilters = useCallback(() => {
    setNameFilter('');
    setOrganizationFilter('all');
    setCourseFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  }, []);

  return {
    // Filter state
    nameFilter,
    setNameFilter,
    organizationFilter,
    setOrganizationFilter,
    courseFilter,
    setCourseFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    
    // Derived state
    organizations,
    filteredLearners,
    hasActiveFilters,
    clearFilters,
  };
}
