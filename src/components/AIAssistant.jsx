import { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Paper, Typography, TextField, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';

const FloatingButton = styled(IconButton)(({ theme }) => ({
  position: 'fixed',
  backgroundColor: '#4080ff',
  color: '#fff',
  zIndex: 1400,
  '&:hover': {
    backgroundColor: '#3070ff',
  },
}));

const ChatWindow = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  width: '300px',
  height: '400px',
  backgroundColor: '#2d2d2d',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 1400,
}));

const MessageList = styled(List)({
  flexGrow: 1,
  overflow: 'auto',
  padding: '10px',
  '& .MuiListItem-root': {
    marginBottom: '8px',
  },
});

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { text: '您好！我是AI助手，有什么可以帮您？', isAI: true },
  ]);
  const [buttonPosition, setButtonPosition] = useState({ x: 20, y: window.innerHeight / 2 - 24, side: 'left' });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [apiKey, setApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const buttonRef = useRef(null);
  const chatWindowRef = useRef(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    if (!apiKey) {
      setMessages([...messages, { text: "请先在设置中配置阿里云API密钥", isAI: true }]);
      setIsSettingsOpen(true);
      return;
    }

    setMessages([...messages, { text: message, isAI: false }]);
    setMessage('');

    try {
      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络设置');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwq-32b',
          messages: [{ role: 'user', content: message }],
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `请求失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let isAnswering = false;
      let reasoningContent = '';
      let answerContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (!data.choices?.length) continue;

              const delta = data.choices[0].delta;

              if (delta.reasoning_content) {
                reasoningContent += delta.reasoning_content;
                setMessages(prev => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage.isAI && lastMessage.isReasoning) {
                    return [...prev.slice(0, -1), { text: reasoningContent, isAI: true, isReasoning: true }];
                  } else {
                    return [...prev, { text: reasoningContent, isAI: true, isReasoning: true }];
                  }
                });
              } else if (delta.content) {
                if (!isAnswering) {
                  isAnswering = true;
                  answerContent = '';
                }
                answerContent += delta.content;
                setMessages(prev => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage.isAI && !lastMessage.isReasoning) {
                    return [...prev.slice(0, -1), { text: answerContent, isAI: true }];
                  } else {
                    return [...prev, { text: answerContent, isAI: true }];
                  }
                });
              }
            } catch (e) {
              console.error('解析响应数据出错:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('API调用错误:', error);
      let errorMessage = '请检查API密钥是否正确';

      if (error.name === 'AbortError') {
        errorMessage = '请求超时，请稍后重试';
      } else if (!navigator.onLine) {
        errorMessage = '网络连接已断开，请检查网络设置';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMessages(prev => [...prev, {
        text: `调用AI服务时出错: ${errorMessage}`,
        isAI: true,
      }]);
    }
  };

  const handleMouseDown = (e) => {
    console.log('Button mouse down triggered');
    setIsDragging(true);
    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !buttonRef.current) return;

    console.log('Button dragging...');
    const button = buttonRef.current;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const rect = button.getBoundingClientRect();

    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;

    newX = Math.max(0, Math.min(newX, windowWidth - rect.width));
    newY = Math.max(0, Math.min(newY, windowHeight - rect.height));

    button.style.left = `${newX}px`;
    button.style.top = `${newY}px`;
    button.style.transform = 'none';

    // 如果窗口打开，同步调整 ChatWindow 位置
    if (isOpen && chatWindowRef.current) {
      const chatWindow = chatWindowRef.current;
      const chatRect = chatWindow.getBoundingClientRect();
      if (buttonPosition.side === 'left') {
        chatWindow.style.left = `${newX + rect.width + 10}px`; // 按钮右侧
        chatWindow.style.right = 'auto';
      } else {
        chatWindow.style.right = `${windowWidth - newX + 10}px`; // 按钮左侧
        chatWindow.style.left = 'auto';
      }
      chatWindow.style.top = `${newY}px`;
      chatWindow.style.transform = 'none';
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || !buttonRef.current) return;
    console.log('Button mouse up triggered');
    setIsDragging(false);

    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    const windowWidth = window.innerWidth;

    const centerX = rect.left + rect.width / 2;
    const newSide = centerX < windowWidth / 2 ? 'left' : 'right';
    const newX = newSide === 'left' ? 20 : windowWidth - rect.width - 20;
    const newY = rect.top;

    setButtonPosition({
      x: newX,
      y: newY,
      side: newSide,
    });

    button.style.left = `${newX}px`;
    button.style.right = 'auto';
    button.style.top = `${newY}px`;
    button.style.transform = 'none';

    // 如果窗口打开，调整 ChatWindow 位置
    if (isOpen && chatWindowRef.current) {
      const chatWindow = chatWindowRef.current;
      if (newSide === 'left') {
        chatWindow.style.left = `${newX + rect.width + 10}px`; // 按钮右侧
        chatWindow.style.right = 'auto';
      } else {
        chatWindow.style.right = `${windowWidth - newX + 10}px`; // 按钮左侧
        chatWindow.style.left = 'auto';
      }
      chatWindow.style.top = `${newY}px`;
      chatWindow.style.transform = 'none';
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isOpen, buttonPosition]);

  const handleSettingsOpen = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handleApiKeySave = () => {
    localStorage.setItem('aiApiKey', apiKey);
    setIsSettingsOpen(false);
  };

  useEffect(() => {
    const savedApiKey = localStorage.getItem('aiApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  return (
    <>
      <FloatingButton
        ref={buttonRef}
        onClick={handleToggle}
        onMouseDown={handleMouseDown}
        style={{
          left: `${buttonPosition.x}px`,
          top: `${buttonPosition.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <SmartToyIcon />
      </FloatingButton>

      {isOpen && (
        <ChatWindow
          elevation={4}
          ref={chatWindowRef}
          style={{
            left: buttonPosition.side === 'left' ? `${buttonPosition.x + 60}px` : 'auto',
            right: buttonPosition.side === 'right' ? `${window.innerWidth - buttonPosition.x + 10}px` : 'auto',
            top: `${buttonPosition.y}px`,
            transform: 'none',
          }}
        >
          <Box sx={{
            p: 2,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <Typography variant="h6">AI助手</Typography>
            <Box>
              <IconButton
                size="small"
                onClick={handleSettingsOpen}
                sx={{ color: '#fff', mr: 1 }}
              >
                <SettingsIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleToggle}
                sx={{ color: '#fff' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <MessageList>
            {messages.map((msg, index) => (
              <ListItem
                key={index}
                sx={{
                  flexDirection: 'column',
                  alignItems: msg.isAI ? 'flex-start' : 'flex-end',
                }}
              >
                <Paper
                  sx={{
                    p: 1,
                    backgroundColor: msg.isAI ? '#4080ff' : '#666',
                    maxWidth: '80%',
                  }}
                >
                  <Typography variant="body2">{msg.text}</Typography>
                </Paper>
              </ListItem>
            ))}
          </MessageList>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              p: 2,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: '#262626',
            }}
          >
            <TextField
              fullWidth
              size="small"
              value={message}
              onChange={handleMessageChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="请输入您的问题"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                  '&.Mui-focused fieldset': { borderColor: '#4080ff' },
                },
              }}
            />
          </Box>
        </ChatWindow>
      )}

      <Dialog
        open={isSettingsOpen}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: {
            backgroundColor: '#2d2d2d',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>API设置</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="API密钥"
            type="password"
            fullWidth
            variant="outlined"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                '&.Mui-focused fieldset': { borderColor: '#4080ff' },
              },
              '& .MuiInputLabel-root': {
                color: '#999',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleSettingsClose} sx={{ color: '#999' }}>取消</Button>
          <Button
            onClick={handleApiKeySave}
            variant="contained"
            sx={{ backgroundColor: '#4080ff', '&:hover': { backgroundColor: '#3070ff' } }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AIAssistant;