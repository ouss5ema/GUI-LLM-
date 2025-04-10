import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Flex,
  Heading,
  IconButton,
  Spinner,
  Text,
  useColorModeValue,
  Avatar,
  Tag,
  Textarea,
  Code,
  Link,
  UnorderedList,
  ListItem,
  OrderedList,
  Button,
  Alert,
  AlertIcon,
  Tooltip,
  useToast,
  Badge
} from '@chakra-ui/react';
import { FiSend, FiX, FiInfo, FiClock } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';

function App() {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState({});
  const cancelTokenRef = useRef(null);
  const toast = useToast();
  const messagesEndRef = useRef(null);
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const codeBackground = useColorModeValue('gray.100', 'gray.900');
  const inlineCodeBackground = useColorModeValue('gray.100', 'gray.700');

  // Initial system message
  useEffect(() => {
    setHistory([{
      role: 'assistant',
      content: "**Assistant Local - Mode Optimisé**\nPrêt à répondre à vos questions !",
      meta: {
        warning: "Mode basse consommation activé",
        timestamp: Date.now()
      }
    }]);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleStop = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Request cancelled by user');
      setIsLoading(false);
      toast({
        title: 'Requête annulée',
        status: 'warning',
        duration: 2000
      });
    }
  };

  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const customStyle = {
        margin: '1em 0',
        borderRadius: '8px',
        padding: '1em',
        backgroundColor: codeBackground
      };

      return !inline && match ? (
        <SyntaxHighlighter
          style={materialDark}
          language={match[1]}
          PreTag="div"
          {...props}
          customStyle={customStyle}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <Code 
          bg={inlineCodeBackground}
          p={1}
          borderRadius="md"
          {...props}
        >
          {children}
        </Code>
      );
    },
    a: ({ href, children }) => <Link href={href} color="blue.500" isExternal>{children}</Link>,
    ul: ({ children }) => <UnorderedList pl={4} my={2}>{children}</UnorderedList>,
    ol: ({ children }) => <OrderedList pl={4} my={2}>{children}</OrderedList>,
    li: ({ children }) => <ListItem my={1}>{children}</ListItem>,
    h2: ({ children }) => <Heading as="h2" size="md" my={4}>{children}</Heading>,
    h3: ({ children }) => <Heading as="h3" size="sm" my={3}>{children}</Heading>,
    p: ({ children }) => <Text my={2} lineHeight="tall">{children}</Text>
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    
    // Ajout du message utilisateur à l'historique
    setHistory(prev => [...prev, { role: 'user', content: prompt }]);
    setPrompt('');

    try {
      cancelTokenRef.current = axios.CancelToken.source();
      
      const result = await axios.post('http://localhost:3001/api/generate', { 
        prompt,
        history: history.filter(msg => msg.role !== 'system') 
      }, {
        cancelToken: cancelTokenRef.current.token
      });

      // Mise à jour de l'historique complet
      setHistory(result.data.history);
      setSystemStatus(result.data.metadata || {});

    } catch (error) {
      if (!axios.isCancel(error)) {
        const errorData = error.response?.data || {};
        const errorMessage = errorData.error || 'Erreur inconnue';
        const recommendation = errorData.recommendation || 'Réessayez plus tard';

        // Message d'erreur contextuel
        toast({
          title: errorMessage,
          description: recommendation,
          status: 'error',
          duration: 5000,
          isClosable: true
        });

        // Ajout de l'erreur à l'historique
        setHistory(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ Erreur: ${errorMessage}`,
          isError: true,
          meta: {
            timestamp: Date.now(),
            details: errorData.details
          }
        }]);
      }
    } finally {
      setIsLoading(false);
      cancelTokenRef.current = null;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Flex direction="column" h="100vh" maxW="800px" mx="auto" p={4}>
      <Flex align="center" mb={6} gap={2}>
        <Avatar name="Phi-2.7B" src="https://example.com/ai-avatar.png" />
        <Heading size="lg">Assistant Local</Heading>
        <Tag colorScheme="blue" ml={2}>Phi-2.7B</Tag>
        
        <Tooltip label="Statut du système">
          <Flex align="center" ml="auto" gap={2}>
            <FiInfo color={systemStatus.low_memory ? 'orange' : 'green'} />
            <Text fontSize="sm">
              {systemStatus.mode || 'Mode standard'}
            </Text>
          </Flex>
        </Tooltip>
      </Flex>

      <Flex 
        direction="column" 
        flex={1} 
        mb={4} 
        p={4} 
        bg={bgColor}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={borderColor}
        overflowY="auto"
      >
        {history.map((message, index) => (
          <Flex 
            key={index} 
            align="start" 
            mb={4} 
            gap={3}
            direction={message.role === 'user' ? 'row-reverse' : 'row'}
          >
            <Avatar 
              size="sm" 
              name={message.role === 'user' ? "User" : "AI"} 
              src={message.role === 'user' ? 
                "https://example.com/user-avatar.png" : 
                "https://example.com/ai-avatar.png"
              } 
            />
            
            <Box
              p={3}
              maxW="80%"
              borderRadius="lg"
              bg={message.role === 'user' ? 'blue.100' : 'white'}
              borderWidth="1px"
              borderColor={message.isError ? 'red.200' : message.role === 'user' ? 'blue.200' : borderColor}
              width="100%"
              position="relative"
            >
              {message.meta?.warning && (
                <Alert status="warning" mb={3} borderRadius="md">
                  <AlertIcon />
                  {message.meta.warning}
                </Alert>
              )}

              <ReactMarkdown
                components={MarkdownComponents}
                remarkPlugins={[remarkGfm]}
                skipHtml
              >
                {message.content}
              </ReactMarkdown>

              <Flex mt={2} align="center" justify="space-between">
                <Flex align="center" gap={2}>
                  <FiClock size="12px" />
                  <Text fontSize="xs" color="gray.500">
                    {formatTimestamp(message.meta?.timestamp || Date.now())}
                  </Text>
                </Flex>
                
                <Flex gap={2}>
                  {message.meta?.tokens && (
                    <Badge colorScheme="purple">
                      {message.meta.tokens} tokens
                    </Badge>
                  )}
                  {message.meta?.model && (
                    <Badge colorScheme="teal">
                      {message.meta.model}
                    </Badge>
                  )}
                </Flex>
              </Flex>
            </Box>
          </Flex>
        ))}
        <div ref={messagesEndRef} />
      </Flex>

      <form onSubmit={handleSubmit}>
        <Flex gap={2} align="center">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Entrez votre message (max 500 caractères)..."
            resize="vertical"
            minH="60px"
            pr="50px"
            isDisabled={isLoading}
            maxLength={500}
          />
          
          <Flex direction="column" gap={2}>
            <IconButton
              type="submit"
              colorScheme="blue"
              icon={isLoading ? <Spinner size="sm" /> : <FiSend />}
              aria-label="Envoyer"
              isDisabled={isLoading}
            />
            
            {isLoading && (
              <Button
                leftIcon={<FiX />}
                colorScheme="red"
                variant="outline"
                size="sm"
                onClick={handleStop}
              >
                Arrêter
              </Button>
            )}
          </Flex>
        </Flex>
      </form>
    </Flex>
  );
}

export default App;

// import React, { useState, useRef, useEffect } from 'react';
// import axios from 'axios';
// import {
//   Box,
//   Flex,
//   Heading,
//   IconButton,
//   Spinner,
//   Text,
//   useColorModeValue,
//   Avatar,
//   Tag,
//   Textarea,
//   Code,
//   Link,
//   UnorderedList,
//   ListItem,
//   OrderedList,
//   Button,
//   Collapse,
//   Alert,
//   AlertIcon
// } from '@chakra-ui/react';
// import { FiSend, FiX, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi';
// import ReactMarkdown from 'react-markdown';
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { materialDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
// import remarkGfm from 'remark-gfm';

// function App() {
//   const [prompt, setPrompt] = useState('');
//   const [messages, setMessages] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [context, setContext] = useState([]);
//   const [openReasoningIndex, setOpenReasoningIndex] = useState(-1);
//   const abortControllerRef = useRef(null);

//   const bgColor = useColorModeValue('gray.50', 'gray.800');
//   const borderColor = useColorModeValue('gray.200', 'gray.600');
//   const codeBackground = useColorModeValue('gray.100', 'gray.900');
//   const inlineCodeBackground = useColorModeValue('gray.100', 'gray.700');

//   useEffect(() => {
//     setMessages([{
//       content: "**Système de raisonnement activé:**\n" +
//                "1. Analyse étape par étape\n" +
//                "2. Vérification hors ligne\n" +
//                "3. Génération sécurisée",
//       isUser: false,
//       timestamp: new Date().toLocaleTimeString(),
//       isSystem: true
//     }]);
//   }, []);

//   const handleKeyDown = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSubmit(e);
//     }
//   };

//   const handleStop = () => {
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort();
//       setIsLoading(false);
//       setMessages(prev => prev.map(msg => 
//         msg.isStreaming ? { ...msg, isStreaming: false } : msg
//       ));
//     }
//   };

//   const MarkdownComponents = {
//     code({ node, inline, className, children, ...props }) {
//       const match = /language-(\w+)/.exec(className || '');
//       const customStyle = {
//         margin: '1em 0',
//         borderRadius: '8px',
//         padding: '1em',
//         backgroundColor: codeBackground
//       };

//       return !inline && match ? (
//         <SyntaxHighlighter
//           style={materialDark}
//           language={match[1]}
//           PreTag="div"
//           {...props}
//           customStyle={customStyle}
//         >
//           {String(children).replace(/\n$/, '')}
//         </SyntaxHighlighter>
//       ) : (
//         <Code 
//           bg={inlineCodeBackground}
//           p={1}
//           borderRadius="md"
//           {...props}
//         >
//           {children}
//         </Code>
//       );
//     },
//     a: ({ href, children }) => <Link href={href} color="blue.500" isExternal>{children}</Link>,
//     ul: ({ children }) => <UnorderedList pl={4} my={2}>{children}</UnorderedList>,
//     ol: ({ children }) => <OrderedList pl={4} my={2}>{children}</OrderedList>,
//     li: ({ children }) => <ListItem my={1}>{children}</ListItem>,
//     h2: ({ children }) => <Heading as="h2" size="md" my={4}>{children}</Heading>,
//     h3: ({ children }) => <Heading as="h3" size="sm" my={3}>{children}</Heading>,
//     p: ({ children }) => <Text my={2} lineHeight="tall">{children}</Text>,
//     blockquote: ({ children }) => (
//       <Alert status="info" variant="left-accent" my={2}>
//         <AlertIcon />
//         <Box>{children}</Box>
//       </Alert>
//     )
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!prompt.trim() || isLoading) return;

//     setIsLoading(true);
//     const newMessage = { content: prompt, isUser: true };
//     setMessages(prev => [...prev, newMessage]);
//     setPrompt('');

//     const botMessage = {
//       content: '',
//       reasoning: '',
//       isUser: false,
//       timestamp: new Date().toLocaleTimeString(),
//       isStreaming: true
//     };
//     setMessages(prev => [...prev, botMessage]);

//     try {
//       abortControllerRef.current = new AbortController();
      
//       const response = await fetch('http://localhost:3001/api/generate', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ prompt, context }),
//         signal: abortControllerRef.current.signal
//       });

//       const reader = response.body.getReader();
//       const decoder = new TextDecoder();
//       let buffer = '';
//       let currentSection = '';

//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;

//         buffer += decoder.decode(value, { stream: true });
        
//         const eventEnd = buffer.indexOf('\n\n');
//         if (eventEnd === -1) continue;

//         const eventData = buffer.slice(0, eventEnd);
//         buffer = buffer.slice(eventEnd + 2);

//         const [eventHeader, ...dataLines] = eventData.split('\n');
//         const eventType = eventHeader.replace('event: ', '');
//         const messageData = JSON.parse(dataLines[0].replace('data: ', ''));

//         setMessages(prev => {
//           const lastMessage = prev[prev.length - 1];
//           if (!lastMessage.isStreaming) return prev;

//           switch (eventType) {
//             case 'section':
//               currentSection = messageData.section;
//               return prev.map(msg => 
//                 msg === lastMessage ? { ...msg, [currentSection]: '' } : msg
//               );
              
//             case 'chunk':
//               return prev.map(msg => 
//                 msg === lastMessage ? { 
//                   ...msg, 
//                   [currentSection]: msg[currentSection] + messageData.content 
//                 } : msg
//               );

//             case 'done':
//               setContext(prev => [...prev, messageData.context]);
//               return prev.map(msg => 
//                 msg === lastMessage ? { ...msg, isStreaming: false } : msg
//               );

//             default:
//               return prev;
//           }
//         });
//       }
//     } catch (error) {
//       if (error.name !== 'AbortError') {
//         console.error('Error:', error);
//         setMessages(prev => [...prev, {
//           content: '❌ Erreur de connexion',
//           isUser: false,
//           timestamp: new Date().toLocaleTimeString()
//         }]);
//       }
//     } finally {
//       setIsLoading(false);
//       abortControllerRef.current = null;
//     }
//   };

//   const toggleReasoning = (index) => {
//     setOpenReasoningIndex(prev => prev === index ? -1 : index);
//   };

//   const handleResetContext = async () => {
//     try {
//       await axios.post('http://localhost:3001/api/reset-context');
//       setContext([]);
//       setMessages([{
//         content: "**Contexte réinitialisé**",
//         isUser: false,
//         timestamp: new Date().toLocaleTimeString(),
//         isSystem: true
//       }]);
//     } catch (error) {
//       console.error('Reset error:', error);
//     }
//   };

//   return (
//     <Flex direction="column" h="100vh" maxW="800px" mx="auto" p={4}>
//       <Flex align="center" mb={6} gap={2}>
//         <Avatar name="Phi-2.7B" src="https://example.com/ai-avatar.png" />
//         <Heading size="lg">Altavo's Assistant</Heading>
//         <Tag colorScheme="blue" ml={2}>v2.7B</Tag>
        
//         <Button
//           ml="auto"
//           leftIcon={<FiRefreshCw />}
//           colorScheme="orange"
//           variant="outline"
//           size="sm"
//           onClick={handleResetContext}
//         >
//           Réinitialiser
//         </Button>
//       </Flex>

//       <Flex 
//         direction="column" 
//         flex={1} 
//         mb={4} 
//         p={4} 
//         bg={bgColor}
//         borderRadius="lg"
//         borderWidth="1px"
//         borderColor={borderColor}
//         overflowY="auto"
//       >
//         {messages.map((message, index) => (
//           <Box key={index} mb={4}>
//             {message.isUser ? (
//               <Flex align="start" gap={3} direction="row-reverse">
//                 <Avatar size="sm" name="User" src="https://example.com/user-avatar.png" />
//                 <Box
//                   p={3}
//                   maxW="80%"
//                   borderRadius="lg"
//                   bg="blue.100"
//                   borderWidth="1px"
//                   borderColor="blue.200"
//                 >
//                   <ReactMarkdown
//                     components={MarkdownComponents}
//                     remarkPlugins={[remarkGfm]}
//                     skipHtml
//                   >
//                     {message.content}
//                   </ReactMarkdown>
//                 </Box>
//               </Flex>
//             ) : (
//               <Flex align="start" gap={3} direction="row">
//                 {!message.isSystem && (
//                   <Avatar size="sm" name="AI" src="https://example.com/ai-avatar.png" />
//                 )}
//                 <Box
//                   p={3}
//                   maxW="80%"
//                   borderRadius="lg"
//                   bg={message.isSystem ? 'green.50' : 'white'}
//                   borderWidth="1px"
//                   borderColor={message.isSystem ? 'green.200' : borderColor}
//                   width="100%"
//                 >
//                   <ReactMarkdown
//                     components={MarkdownComponents}
//                     remarkPlugins={[remarkGfm]}
//                     skipHtml
//                   >
//                     {message.content}
//                   </ReactMarkdown>

//                   {message.reasoning && (
//                     <Box mt={3}>
//                       <Button
//                         size="xs"
//                         variant="ghost"
//                         rightIcon={openReasoningIndex === index ? <FiChevronUp /> : <FiChevronDown />}
//                         onClick={() => toggleReasoning(index)}
//                       >
//                         Afficher le raisonnement
//                       </Button>
//                       <Collapse in={openReasoningIndex === index}>
//                         <Box mt={2} p={3} bg="gray.100" borderRadius="md">
//                           <ReactMarkdown
//                             components={MarkdownComponents}
//                             remarkPlugins={[remarkGfm]}
//                           >
//                             {message.reasoning}
//                           </ReactMarkdown>
//                         </Box>
//                       </Collapse>
//                     </Box>
//                   )}

//                   {message.isStreaming && (
//                     <Box 
//                       height="2px" 
//                       bg="blue.200" 
//                       width="50px" 
//                       my={2} 
//                       borderRadius="full"
//                       animation="pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite"
//                     />
//                   )}

//                   {!message.isSystem && !message.isStreaming && (
//                     <Text fontSize="xs" color="gray.500" mt={2}>
//                       {message.timestamp}
//                     </Text>
//                   )}
//                 </Box>
//               </Flex>
//             )}
//           </Box>
//         ))}
//       </Flex>

//       <form onSubmit={handleSubmit}>
//         <Flex gap={2} align="center">
//           <Textarea
//             value={prompt}
//             onChange={(e) => setPrompt(e.target.value)}
//             onKeyDown={handleKeyDown}
//             placeholder="Entrez votre message..."
//             resize="vertical"
//             minH="60px"
//             pr="50px"
//           />
          
//           <Flex direction="column" gap={2}>
//             <IconButton
//               type="submit"
//               colorScheme="blue"
//               icon={isLoading ? <Spinner size="sm" /> : <FiSend />}
//               aria-label="Envoyer"
//               isDisabled={isLoading}
//             />
            
//             {isLoading && (
//               <Button
//                 leftIcon={<FiX />}
//                 colorScheme="red"
//                 variant="outline"
//                 size="sm"
//                 onClick={handleStop}
//               >
//                 Arrêter
//               </Button>
//             )}
//           </Flex>
//         </Flex>
//       </form>
//     </Flex>
//   );
// }

// export default App;