// import React from 'react';
// import ReactDOM from 'react-dom';
// import { ChakraProvider } from '@chakra-ui/react';
// import App from './App';

// ReactDOM.render(
//   <ChakraProvider>
//     <App />
//   </ChakraProvider>,
//   document.getElementById('root')
// );
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <ChakraProvider>
    <App />
  </ChakraProvider>
);