import { useState, useRef, useEffect } from 'react';
import { IconCpu, IconSend, IconX, IconMessage, IconRefresh, IconSettings, IconInfoCircle } from '@tabler/icons-react';
import api from '../services/api';

interface Message {
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'வணக்கம்! நான் **Hi-Secure AI**.\nHi Secure Solutions இன் ERP உதவியாளர். உங்களுக்கு இன்று எவ்வாறு உதவ முடியும்?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Draggable states
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag on left click
    if (e.button !== 0) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.posX + dx,
        y: dragRef.current.posY + dy
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Check if AI is enabled on mount/open
  useEffect(() => {
    if (isOpen) {
      api.get('/settings')
        .then(res => {
          const cfg = res.data?.ai || {};
          setAiEnabled(cfg.ai_enabled === true || cfg.ai_enabled === 'true');
        })
        .catch(() => setAiEnabled(false));
    }
  }, [isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (!textToSend) {
      setInputText('');
    }

    // Add user message
    const newMsg: Message = { sender: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: text });
      const reply = res.data?.response || 'I processed your request but returned an empty answer.';
      setMessages(prev => [...prev, { sender: 'ai', text: reply, timestamp: new Date() }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'system',
        text: `Error: ${err.response?.data?.error || err.message || 'Failed to connect to AI engine.'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = (text: string) => {
    handleSend(text);
  };

  const clearChat = () => {
    setMessages([
      {
        sender: 'ai',
        text: 'வணக்கம்! நான் **Hi-Secure AI**.\nஉங்களுக்கு இன்று எவ்வாறு உதவ முடியும்?',
        timestamp: new Date(),
      },
    ]);
  };

  const renderMessageText = (text: string) => {
    if (text.startsWith('__FILE_ATTACHMENT__::')) {
      const parts = text.split('::');
      const filePath = parts[1];
      const fileName = parts[2];
      const desc = parts[3] || 'Here is the requested file.';
      
      const fileUrl = import.meta.env?.DEV
        ? `http://localhost:3015/temp/${fileName}`
        : `/temp/${fileName}`;

      const isExcel = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');

      return (
        <div style={{ padding: '4px 0' }}>
          <p style={{ margin: '0 0 12px 0', lineHeight: '1.5' }}>{desc}</p>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={fileName}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: isExcel ? '#107c41' : '#e11d48',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '12.5px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'none';
            }}
          >
            <span>{isExcel ? '📊' : '📄'}</span>
            <span>{fileName}</span>
          </a>
        </div>
      );
    }

    // Simple markdown formatting helper (bold, code blocks, lists)
    let formatted = text;
    // Replace **bold**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Replace *italic*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Replace `code`
    formatted = formatted.replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:2px 4px;border-radius:4px;font-family:monospace;font-size:11px;">$1</code>');
    
    // Split lines
    const lines = formatted.split('\n');
    return lines.map((line, idx) => {
      // Check if bullet point
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <li key={idx} style={{ marginLeft: 16, listStyleType: 'disc', margin: '4px 0' }} dangerouslySetInnerHTML={{ __html: line.substring(2) }} />;
      }
      return <p key={idx} style={{ margin: '4px 0', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: line }} />;
    });
  };

  return (
    <>
      {/* ── Chat Toggle Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#1a3480',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 14px rgba(26, 52, 128, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'all 0.3s ease',
          transform: isOpen ? 'rotate(90deg)' : 'none',
        }}
        className="hover:scale-105"
        title="Hi-Secure AI Assistant"
      >
        {isOpen ? <IconX size={24} /> : <IconMessage size={24} />}
      </button>

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            transform: `translate(${position.x}px, ${position.y}px)`,
            width: '380px',
            height: '550px',
            maxHeight: 'calc(100vh - 120px)',
            borderRadius: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9998,
            fontFamily: 'Inter, sans-serif',
            animation: 'slideUp 0.3s ease',
          }}
        >
          {/* Header */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              padding: '16px',
              backgroundColor: '#1a3480',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'move',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconCpu size={20} />
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Hi-Secure AI</h4>
                <span style={{ fontSize: '10px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: aiEnabled ? '#4ade80' : '#ea580c', display: 'inline-block' }} />
                  {aiEnabled ? 'நிமிடம் ஆன்லைன்' : 'இணைப்பு செயலிழக்கப்பட்டது'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={clearChat}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ background: 'none', border: 'none', color: '#ffffff', opacity: 0.8, cursor: 'pointer', display: 'flex', padding: 4 }}
                title="அரட்டையை அழி"
              >
                <IconRefresh size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ background: 'none', border: 'none', color: '#ffffff', opacity: 0.8, cursor: 'pointer', display: 'flex', padding: 4 }}
              >
                <IconX size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#f8fafc',
            }}
          >
            {!aiEnabled && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '8px',
                  color: '#b45309',
                  fontSize: '11px',
                  display: 'flex',
                  gap: 8,
                }}
              >
                <IconInfoCircle size={16} style={{ flexShrink: 0 }} />
                <div>
                  AI அசிஸ்டெண்ட் முடக்கப்பட்டுள்ளது. தயவுசெய்து <strong>அமைப்புகள் → Hi-Secure AI</strong> திரைக்குச் சென்று NVIDIA API விசையை உள்ளிட்டு இதனை இயக்கவும்.
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                    backgroundColor: msg.sender === 'user' ? '#1a3480' : msg.sender === 'system' ? '#fecaca' : '#ffffff',
                    color: msg.sender === 'user' ? '#ffffff' : msg.sender === 'system' ? '#991b1b' : '#334155',
                    fontSize: '12.5px',
                    boxShadow: msg.sender === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                  }}
                >
                  {renderMessageText(msg.text)}
                </div>
                <span
                  style={{
                    fontSize: '9px',
                    color: '#94a3b8',
                    marginTop: '4px',
                    display: 'block',
                    textAlign: msg.sender === 'user' ? 'right' : 'left',
                  }}
                >
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px 12px 12px 0',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 50,
                  }}
                >
                  <span className="dot" style={{ animationDelay: '0s' }} />
                  <span className="dot" style={{ animationDelay: '0.2s' }} />
                  <span className="dot" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions */}
          {aiEnabled && !loading && (
            <div
              style={{
                padding: '8px 12px',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                backgroundColor: '#f1f5f9',
                borderTop: '1px solid #e2e8f0',
                scrollbarWidth: 'none',
              }}
            >
              {[
                { label: 'வன்பொருள் உடல் நலம்', text: 'வன்பொருள் மற்றும் தரவுத்தளத்தின் ஆரோக்கியம் (System Health) என்ன?' },
                { label: 'பேக்கப் எடுக்கவும்', text: 'புதிய தரவுத்தள பேக்கப்பைத் (Backup) தொடங்கவும்.' },
                { label: 'இருப்பு சோதனை', text: 'குறைந்த இருப்பு உள்ள பொருட்கள் (Low stock parts) எவை?' },
                { label: 'லெட்ஜர் சோதனை', text: 'கணக்கு புத்தகத்தின் (Ledger balance) நிலையை சரிபார்க்கவும்.' },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggest(chip.text)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    color: '#1a3480',
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                  className="hover:bg-slate-50 hover:border-slate-400"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div
            style={{
              padding: '12px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
              backgroundColor: '#ffffff',
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={aiEnabled ? 'Hi-Secure AI யிடம் கேளுங்கள்...' : 'AI முடக்கப்பட்டுள்ளது...'}
              disabled={!aiEnabled || loading}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: aiEnabled ? '#ffffff' : '#f1f5f9',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!aiEnabled || loading || !inputText.trim()}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: aiEnabled && inputText.trim() ? '#1a3480' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                cursor: aiEnabled && inputText.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconSend size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Global Styles for Chat Panel ── */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .dot {
          width: 6px;
          height: 6px;
          background-color: #64748b;
          border-radius: 50%;
          display: inline-block;
          animation: bounce 1.4s infinite both;
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </>
  );
}