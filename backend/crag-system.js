// // crag-system.js
// const { DirectoryLoader } = require('langchain/document_loaders/fs/directory');
// const { PDFLoader } = require('langchain/document_loaders/fs/pdf');
// const { TextLoader } = require('langchain/document_loaders/fs/text');
// const { DocxLoader } = require('langchain/document_loaders/fs/docx');
// const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
// const { Chroma } = require('langchain/vectorstores/chroma');
// const { HuggingFaceTransformersEmbeddings } = require('langchain/embeddings/hf_transformers');

// class CRAGSystem {
//   constructor() {
//     this.vectorStore = null;
//     this.embeddings = new HuggingFaceTransformersEmbeddings({
//       modelName: 'Xenova/all-mpnet-base-v2'
//     });
//     this.textSplitter = new RecursiveCharacterTextSplitter({
//       chunkSize: 1000,
//       chunkOverlap: 200
//     });
//   }

//   async initializeVectorStore(docsPath = './knowledge_base') {
//     try {
//       const loader = new DirectoryLoader(docsPath, {
//         '.pdf': (path) => new PDFLoader(path),
//         '.txt': (path) => new TextLoader(path),
//         '.docx': (path) => new DocxLoader(path)
//       });

//       const rawDocs = await loader.load();
//       const splitDocs = await this.textSplitter.splitDocuments(rawDocs);
      
//       this.vectorStore = await Chroma.fromDocuments(
//         splitDocs,
//         this.embeddings,
//         {
//           collectionName: 'knowledge_base',
//           url: 'http://localhost:8000' // URL de ChromaDB
//         }
//       );
//     } catch (error) {
//       console.error('Erreur initialisation vector store:', error);
//       throw error;
//     }
//   }

//   async retrieveContext(query, k = 3) {
//     if (!this.vectorStore) {
//       throw new Error('Vector store non initialisé');
//     }

//     const results = await this.vectorStore.similaritySearch(query, k);
//     return results.map(doc => doc.pageContent).join('\n\n');
//   }
// }

// module.exports = CRAGSystem;