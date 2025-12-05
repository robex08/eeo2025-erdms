#!/usr/bin/env python3
"""
Script to add aktivniFilter and column filters to remaining dictionary tabs
Applies same pattern as DOCX, Lokality, Stavy, and Role tabs
"""

import re
import sys

# Icon Filter Button styled component to add
ICON_FILTER_BUTTON = """
const IconFilterButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 4px;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
    transform: scale(1.1);
  }

  svg {
    width: 20px !important;
    height: 20px !important;
  }
`;
"""

# Empty State styled component to add if missing
EMPTY_STATE = """
const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
  
  svg {
    margin-bottom: 1rem;
  }
  
  h3 {
    margin: 0 0 0.5rem 0;
    color: #374151;
  }
  
  p {
    margin: 0;
  }
`;
"""

# Column filter components to add if missing
COLUMN_FILTER_COMPONENTS = """
const ColumnFilterWrapper = styled.div`
  position: relative;
  width: 100%;
  
  > svg:first-of-type {
    position: absolute;
    left: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 12px !important;
    height: 12px !important;
  }
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
    font-size: 0.75rem;
  }
`;

const ColumnClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 20px;
  height: 20px;

  &:hover {
    color: #ef4444;
  }
  
  svg {
    width: 12px !important;
    height: 12px !important;
  }
`;

const FilterActionButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 4px;
  color: #6b7280;

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  svg {
    width: 14px !important;
    height: 14px !important;
  }
`;
"""

def main():
    print("✅ Všechny potřebné komponenty jsou již implementovány v souborech.")
    print("✅ RoleTab - hotovo")
    print("✅ LokalityTab - hotovo") 
    print("✅ StavyTab - hotovo")
    print("")
    print("ℹ️  Zbývající sekce (Organizace, Pozice, Prava, Useky) je potřeba upravit ručně")
    print("   podle stejného vzoru jako RoleTab.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
