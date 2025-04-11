// hooks/useColorScheme.js
import { useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const useColorScheme = () => {
  const systemScheme = useRNColorScheme();
  const [colorScheme, setColorScheme] = useState(systemScheme);

  useEffect(() => {
    setColorScheme(systemScheme);
  }, [systemScheme]);

  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  return { colorScheme, toggleColorScheme };
};

export default useColorScheme;
