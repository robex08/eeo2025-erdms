import React, { createContext, useContext } from 'react';

/**
 * Activity Context - provides triggerActivity function to child components
 * Use this to manually trigger activity updates on save operations (orders, users, etc.)
 */
const ActivityContext = createContext();

export const ActivityProvider = ({ children, triggerActivity }) => {
  return (
    <ActivityContext.Provider value={{ triggerActivity }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    return { triggerActivity: () => {} }; // Return no-op function
  }
  return context;
};

export default ActivityContext;
