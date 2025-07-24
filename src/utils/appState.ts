// Utility functions for persisting app state to localStorage

export interface AppState {
  activePage?: string;
  selectedTicker?: string;
  currentUser?: {
    id: number;
    username: string;
    email?: string;
  };
  currentPortfolio?: {
    id: number;
    user_id: number;
    name: string;
  };
  portfolioSelection?: {
    userId: number;
    portfolioId: number;
    userName: string;
    portfolioName: string;
  };
  theme?: 'light' | 'dark';
}

const APP_STATE_KEY = 'daliatrac_app_state';

export const saveAppState = (state: Partial<AppState>): void => {
  try {
    const currentState = getAppState();
    const newState = { ...currentState, ...state };
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(newState));
  } catch (error) {
    console.warn('Error saving app state to localStorage:', error);
  }
};

export const getAppState = (): AppState => {
  try {
    const saved = localStorage.getItem(APP_STATE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Error loading app state from localStorage:', error);
  }
  return {};
};

export const clearAppState = (): void => {
  try {
    localStorage.removeItem(APP_STATE_KEY);
  } catch (error) {
    console.warn('Error clearing app state from localStorage:', error);
  }
};

// Hook personalizado para usar estado persistente
export const usePersistedState = <T>(
  key: keyof AppState,
  defaultValue: T,
  autoSave: boolean = true
): [T, (value: T) => void] => {
  const savedState = getAppState();
  const initialValue = (savedState[key] as T) ?? defaultValue;

  const setValue = (value: T) => {
    if (autoSave) {
      saveAppState({ [key]: value });
    }
  };

  return [initialValue, setValue];
};
