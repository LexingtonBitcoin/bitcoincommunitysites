import { useContext } from 'react';
import { DMContext, type DMContextType } from '@/contexts/DMContext';

export function useDMContext(): DMContextType {
  const context = useContext(DMContext);
  if (!context) {
    throw new Error('useDMContext must be used within a DMProvider');
  }
  return context;
}
