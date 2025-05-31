import { createContext, useState } from 'react';

export const ThesisContext = createContext();

export const ThesisProvider = ({ children }) => {
  const [thesisTopic, setThesisTopic] = useState('');

  return (
    <ThesisContext.Provider value={{ thesisTopic, setThesisTopic }}>
      {children}
    </ThesisContext.Provider>
  );
};
