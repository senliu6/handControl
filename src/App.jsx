import { useState } from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, Grid, Drawer, List, ListItem, ListItemText, ListItemSecondaryAction, TextField, Button } from '@mui/material';
import { useLanguage } from './contexts/LanguageContext';
import AIAssistant from './components/AIAssistant';
import { styled } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DeleteIcon from '@mui/icons-material/Delete';
import ChartPanel from './components/ChartPanel';
import ThreeScene from './components/ThreeScene';

const MainContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  height: '100vh',
  backgroundColor: '#1a1a1a',
  color: '#fff'
}));

const ContentContainer = styled(Box)({  
  height: 'calc(100vh - 64px)',
  padding: '20px',
  width: '100%',
  overflow: 'hidden',
  position: 'relative',
  zIndex: 0
});

const DrawerContainer = styled(Box)({
  width: '60px',
  height: '100vh',
  backgroundColor: '#2d2d2d',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '10px 0'
});

function App() {
  const [open, setOpen] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [serialList, setSerialList] = useState([]);
  const { t, toggleLanguage, language } = useLanguage();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleInputChange = (event) => {
    const value = event.target.value.replace(/[^a-zA-Z0-9]/g, '');
    setSerialNumber(value);
  };

  const handleAddSerial = () => {
    if (serialNumber && !serialList.includes(serialNumber)) {
      setSerialList([...serialList, serialNumber]);
      setSerialNumber('');
    }
  };

  const handleDeleteSerial = (index) => {
    const newList = serialList.filter((_, i) => i !== index);
    setSerialList(newList);
  };

  const handleSerialClick = (serial) => {
    alert(`点击了序列号: ${serial}`);
  };

  return (
    <MainContainer>
      <AppBar position="static" sx={{ backgroundColor: '#2d2d2d', zIndex: 1300 }}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('title')}
          </Typography>
          <Button
            color="inherit"
            onClick={toggleLanguage}
            sx={{ ml: 2 }}
          >
            {language === 'zh' ? 'EN' : '中文'}
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex' }}>
        <Drawer
          variant="permanent"
          sx={{
            width: open ? 240 : 60,
            transition: 'width 0.3s',
            position: 'relative',
            zIndex: 1200,
            '& .MuiDrawer-paper': {
              width: open ? 240 : 60,
              transition: 'width 0.3s',
              backgroundColor: '#2d2d2d',
              color: '#fff',
              overflowX: 'hidden',
              position: 'relative'
            }
          }}
        >
          {open ? (
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  value={serialNumber}
                  onChange={handleInputChange}
                  placeholder={t('inputSerialNumber')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                      '&.Mui-focused fieldset': { borderColor: '#4080ff' }
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddSerial}
                  sx={{ backgroundColor: '#4080ff', '&:hover': { backgroundColor: '#3070ff' } }}
                >
                  {t('add')}
                </Button>
              </Box>
              <List>
                {serialList.map((serial, index) => (
                  <ListItem
                    key={index}
                    onClick={() => handleSerialClick(serial)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ListItemText primary={serial} />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteSerial(index)}
                        sx={{ color: '#fff' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <List>
              {serialList.map((serial, index) => (
                <ListItem
                  key={index}
                  onClick={() => handleSerialClick(serial)}
                  sx={{ cursor: 'pointer', px: 1 }}
                >
                  <ListItemText
                    primary={serial.slice(0, 3) + (serial.length > 3 ? '...' : '')}
                    sx={{ '& .MuiListItemText-primary': { fontSize: '0.75rem' } }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDeleteSerial(index)}
                      sx={{ color: '#fff' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Drawer>
        <ContentContainer>
          <Grid container spacing={3} sx={{ height: '100%', margin: '-20px', width: 'calc(100% + 40px)' }}>
            <Grid item xs={8} sx={{ height: '100%' }}>
              <ThreeScene />
            </Grid>
            <Grid item xs={4} sx={{ height: '100%' }}>
              <ChartPanel />
            </Grid>
          </Grid>
        </ContentContainer>
      </Box>
      <AIAssistant />
    </MainContainer>
  );
}

export default App;