import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { v4 as uuidv4 } from 'uuid';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [chatSessions, setChatSessions] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Load chat sessions
  const loadChatSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatSessions(response.data);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  // Initialize
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadChatSessions();
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
  }, [navigate]);

  // Load specific chat session
  const loadChatSession = async (sid) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/chat/history/${sid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data.messages);
      setSessionId(sid);
    } catch (error) {
      console.error('Error loading chat session:', error);
    }
  };

  // Start new chat
  const startNewChat = () => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    setMessages([]);
  };

  // Delete chat session
  const deleteSession = async (sid) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/chat/session/${sid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadChatSessions();
      if (sid === sessionId) {
        startNewChat();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat`,
        { message: input, sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.message 
      }]);

      // Refresh chat sessions list
      loadChatSessions();
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setMessages(prev => [...prev, {
          role: 'system',
          content: 'Sorry, there was an error processing your request.'
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const components = {
    code({ inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      return !inline && language ? (
        <div className="my-4 rounded-lg overflow-hidden bg-gray-900">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
            <span className="text-xs text-gray-400 uppercase">{language}</span>
          </div>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={language}
            PreTag="div"
            className="!my-0 !bg-transparent"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-800" {...props}>
          {children}
        </code>
      );
    },
    p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
    li: ({ children }) => <li className="mb-1">{children}</li>,
    a: ({ children, href }) => (
      <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-bold mb-3 mt-4">{children}</h3>,
  };

  // Get user info
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-gray-800 transition-all duration-300 flex flex-col h-full`}>
        <div className="p-4 flex-shrink-0">
          {/* User Profile */}
          <div className="flex items-center mb-4 pb-4 border-b border-gray-700">
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full mr-2"
              />
            )}
            <div className="flex-1">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-gray-400 text-xs truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={startNewChat}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 mb-4 hover:bg-blue-700"
          >
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 pt-0">
          <div className="space-y-2">
            {chatSessions.map((session) => (
              <div
                key={session.sessionId}
                className={`p-2 rounded-lg cursor-pointer hover:bg-gray-700 flex justify-between items-center ${
                  session.sessionId === sessionId ? 'bg-gray-700' : ''
                }`}
              >
                <div
                  className="flex-1 text-white truncate"
                  onClick={() => loadChatSession(session.sessionId)}
                >
                  {session.title}
                </div>
                <button
                  onClick={() => deleteSession(session.sessionId)}
                  className="text-gray-400 hover:text-red-500 ml-2"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full">
        <div className="bg-white shadow-xl rounded-lg m-4 flex flex-col h-full">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-white mr-4"
              >
                ☰
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Programming Assistant</h1>
                <p className="text-blue-100 text-sm">Ask any programming question</p>
              </div>
            </div>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : msg.role === 'system'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100'
                  }`}
                >
                  <ReactMarkdown 
                    components={components}
                    className={`${msg.role === 'user' ? 'text-white [&_code]:bg-blue-500' : 'text-gray-800'}`}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse">Thinking</div>
                    <div className="animate-bounce">...</div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="border-t p-4 flex-shrink-0">
            <div className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a programming question..."
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50
                         transition duration-200"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chat;