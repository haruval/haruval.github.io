import React, { useState, useEffect, useRef } from 'react';
import MikuScene from './components/MikuScene';

function App() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Set document title
  useEffect(() => {
    document.title = "xdxdxd";
  }, []);

  // Create interactive grid background
  useEffect(() => {
    // Create canvas for grid lines that bend away from mouse
    const setupGridCanvas = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const container = document.getElementById('grid-background');
      
      if (!container) return;
      
      // Clear any existing canvas
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      container.appendChild(canvas);
      
      // Set canvas size to match window
      const resizeCanvas = () => {
        // Check if container still exists
        if (!document.getElementById('grid-background')) return;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawGrid();
      };
      
      // Track mouse position
      let mouseX = window.innerWidth / 2;
      let mouseY = window.innerHeight / 2;
      
      const onMouseMove = (e) => {
        // Store mouse coordinates directly from the event
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Only redraw if the container still exists
        const gridContainer = document.getElementById('grid-background');
        if (gridContainer && ctx) {
          drawGrid();
        }
      };
      
      window.addEventListener('mousemove', onMouseMove);
      
      // Draw the grid with distortion effect
      const drawGrid = () => {
        if (!ctx || !canvas) return;
        
        try {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Grid configuration
          const gridSize = 50; // Size of grid cells
          const distortionFactor = 15; // How much the grid bends away from mouse
          const maxDistance = 300; // How far the distortion effect reaches
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; // White grid lines
          ctx.lineWidth = 1;
          
          // Draw vertical lines
          for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            
            for (let y = 0; y <= canvas.height; y += 5) {
              // Calculate distance from mouse
              const dx = x - mouseX;
              const dy = y - mouseY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              // Calculate distortion
              let distortion = 0;
              if (distance < maxDistance) {
                // Calculate how much to distort based on distance from mouse
                distortion = (1 - distance / maxDistance) * distortionFactor;
                // Direction away from mouse (normalize dx)
                if (dx !== 0) {
                  distortion *= Math.abs(dx) / dx; // This makes it bend away
                }
              }
              
              // Add point with distortion
              if (y === 0) {
                ctx.moveTo(x + distortion, y);
              } else {
                ctx.lineTo(x + distortion, y);
              }
            }
            
            ctx.stroke();
          }
          
          // Draw horizontal lines
          for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            
            for (let x = 0; x <= canvas.width; x += 5) {
              // Calculate distance from mouse
              const dx = x - mouseX;
              const dy = y - mouseY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              // Calculate distortion
              let distortion = 0;
              if (distance < maxDistance) {
                // Calculate how much to distort based on distance from mouse
                distortion = (1 - distance / maxDistance) * distortionFactor;
                // Direction away from mouse (normalize dy)
                if (dy !== 0) {
                  distortion *= Math.abs(dy) / dy; // This makes it bend away
                }
              }
              
              // Add point with distortion
              if (x === 0) {
                ctx.moveTo(x, y + distortion);
              } else {
                ctx.lineTo(x, y + distortion);
              }
            }
            
            ctx.stroke();
          }
        } catch (error) {
          console.error('Error in drawGrid:', error);
        }
      };
      
      // Handle window resize
      window.addEventListener('resize', resizeCanvas);
      
      // Initial setup
      resizeCanvas();
      
      // Return cleanup function
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', resizeCanvas);
      };
    };
    
    // Set up the grid canvas
    const cleanup = setupGridCanvas();
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  // Auto-scroll to the bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mock GPT response function (replace with actual API call in production)
  const getGptResponse = async (message) => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock responses based on keywords in user input
    const input = message.toLowerCase();
    let response;
    
    if (input.includes('hello') || input.includes('hi')) {
      response = "hai :33";
    } else {
      response = "im figuring out how to limit the api so it doesn't cost me a ton of money let me cook";
    }
    
    setIsLoading(false);
    return response;
  };

  // Handle sending messages
  const handleSend = async () => {
    if (!userInput.trim()) return;
    
    // Add user message
    const userMsg = { role: 'user', content: userInput.trim() };
    setMessages(prev => [...prev, userMsg]);
    
    // Clear input
    setUserInput('');
    
    // Get and add bot response
    const botResponse = await getGptResponse(userInput);
    const botMsg = { role: 'bot', content: botResponse };
    setMessages(prev => [...prev, botMsg]);
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100vh', 
      fontFamily: '"Times New Roman", serif',
      backgroundColor: '#e394fb', // Updated light purple/pink background
      backgroundImage: 'none', // Remove previous background image
      overflow: 'hidden'
    }}>
      {/* Dynamic grid background */}
      <div id="grid-background" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1
      }}></div>

      {/* Top scrolling banner */}
      <div style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        backgroundColor: '#b500ff',
        padding: '10px 0',  // Back to original padding
        overflow: 'hidden',
        zIndex: 20
      }}>
        <div className="scroll-text" style={{
          color: '#deff00',
          fontSize: '2.5rem',  // Back to original size
          fontWeight: 'bold',
          fontFamily: '"Helvetica Neue", Arial, sans-serif',
          whiteSpace: 'nowrap',
          letterSpacing: '0.3em',  // Keeping the spacing between characters
          animation: 'scrollText 15s linear infinite',
        }}>
          私 た ち は 初 音 ミ ク チ ャ ッ ト が 大 好 き で す 　 　 私 た ち は 初 音 ミ ク チ ャ ッ ト が 大 好 き で す
        </div>
      </div>

      {/* Bottom scrolling banner */}
      <div style={{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        backgroundColor: '#b500ff',
        padding: '10px 0',  // Back to original padding
        overflow: 'hidden',
        zIndex: 20
      }}>
        <div className="scroll-text" style={{
          color: '#deff00',
          fontSize: '2.5rem',  // Back to original size
          fontWeight: 'bold',
          fontFamily: '"Helvetica Neue", Arial, sans-serif',
          whiteSpace: 'nowrap',
          letterSpacing: '0.3em',  // Keeping the spacing between characters
          animation: 'scrollTextReverse 15s linear infinite',
        }}>
          私 た ち は 初 音 ミ ク チ ャ ッ ト が 大 好 き で す 　 　 私 た ち は 初 音 ミ ク チ ャ ッ ト が 大 好 き で す
        </div>
      </div>

      {/* CSS for the scrolling animation */}
      <style>
        {`
          @keyframes scrollText {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          
          @keyframes scrollTextReverse {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>

      {/* 3D Scene */}
      <MikuScene />

      {/* Chat Box */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '20%', // Position chat window on the left side
          transform: 'translateY(-50%)',
          width: '300px',
          backgroundColor: 'rgba(255, 255, 255, 0.3)', // More transparent for glassy effect
          backdropFilter: 'blur(10px)', // Creates glassy effect
          padding: '15px',
          borderRadius: '12px',
          fontFamily: '"Times New Roman", serif',
          fontSize: '18px',
          boxShadow: '0 4px 15px rgba(255, 255, 255, 0.3), 0 6px 20px rgba(0, 0, 0, 0.15)', // Enhanced glassy shadow
          border: '1px solid rgba(255, 255, 255, 0.4)', // Subtle border for glass effect
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
          zIndex: 15
        }}
      >
        <h2 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>gpt wrapper go here</h2>
        
        <div
          style={{
            flex: 1,
            height: '300px',
            overflowY: 'auto',
            marginBottom: '10px',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)', // More transparent for glass effect
            backdropFilter: 'blur(5px)', // Add blur to enhance glass effect
            boxShadow: 'inset 0 2px 5px rgba(255, 255, 255, 0.2)'
          }}
        >
          {messages.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>
              Start a conversation...
            </div>
          ) : (
            messages.map((msg, i) => (
              <div 
                key={i} 
                style={{ 
                  marginBottom: '12px',
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: msg.role === 'user' ? 'rgba(220, 248, 255, 0.4)' : 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(5px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  wordWrap: 'break-word'
                }}
              >
                <strong>{msg.role === 'user' ? 'You' : 'Miku'}:</strong> {msg.content}
              </div>
            ))
          )}
          {isLoading && (
            <div style={{ textAlign: 'left', color: '#888' }}>Miku is typing...</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(5px)',
              fontFamily: '"Times New Roman", serif',
              fontSize: '16px',
            }}
            type="text"
            placeholder="Type something..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            style={{
              padding: '8px 15px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              backgroundColor: 'rgba(77, 144, 254, 0.7)',
              backdropFilter: 'blur(5px)',
              color: 'white',
              fontFamily: '"Times New Roman", serif',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onClick={handleSend}
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;