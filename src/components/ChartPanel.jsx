import { useEffect, useRef, useState } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, Grid } from '@mui/material';
import * as echarts from 'echarts';
import { useLanguage } from '../contexts/LanguageContext';

const ChartPanel = () => {
  const chartsRef = useRef([]);
  const [selectedForces, setSelectedForces] = useState([]);
  const { t } = useLanguage();

  const forceOptions = [
    { value: 1, label: t('force1'), color: '#4080ff' },
    { value: 2, label: t('force2'), color: '#ff4040' },
    { value: 3, label: t('force3'), color: '#ffffff' },
    { value: 4, label: t('force4'), color: '#40ff40' }
  ];

  useEffect(() => {
    const handleResize = () => {
      chartsRef.current.forEach(chart => chart.resize());
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartsRef.current.forEach(chart => chart.dispose());
    };
  }, []);

  const initChart = (element, title) => {
    if (!element) return null;

    const chart = echarts.init(element);
    const option = {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          color: '#fff'
        }
      },
      grid: {
        top: 60,
        right: 20,
        bottom: 40,
        left: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: [0, 30, 60, 90, 120],
        axisLine: { lineStyle: { color: '#666' } },
        axisLabel: { color: '#999' }
      },
      yAxis: {
        type: 'value',
        name: 'Force (N)',
        axisLine: { lineStyle: { color: '#666' } },
        axisLabel: { color: '#999' },
        splitLine: { lineStyle: { color: '#333' } }
      },
      series: []
    };
    chart.setOption(option);
    return chart;
  };

  const handleChartRef = (element, index) => {
    if (!element) return;

    const titles = [t('xAxisForce'), t('yAxisForce'), t('zAxisForce')];
    const newChart = initChart(element, titles[index]);
    if (newChart) {
      chartsRef.current[index] = newChart;
    }
  };

  useEffect(() => {
    let dataCache = new Map();
    const dataPoints = 100;
    const updateInterval = 100;

    const generateData = (force) => {
      const now = Date.now();
      if (!dataCache.has(force)) {
        const initialData = [];
        for (let i = 0; i < dataPoints; i++) {
          initialData.push({
            time: now - (dataPoints - 1 - i) * updateInterval,
            value: Math.random() * 2 + 1
          });
        }
        dataCache.set(force, initialData);
      }

      const data = dataCache.get(force);
      const newPoint = {
        time: now,
        value: Math.random() * 2 + 1
      };
      data.push(newPoint);
      data.shift();
      return data;
    };

    const updateCharts = () => {
      chartsRef.current.forEach((chart) => {
        if (!chart) return;

        const series = selectedForces.map(force => {
          const forceOption = forceOptions.find(opt => opt.value === force);
          const data = generateData(force);
          return {
            name: `Force ${force}`,
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: data.map((d, index) => [index * updateInterval, d.value * force]),
            lineStyle: { 
              color: forceOption.color,
              width: 2
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: `${forceOption.color}33` },
                { offset: 1, color: `${forceOption.color}11` }
              ])
            }
          };
        });

        chart.setOption({
          xAxis: {
            type: 'value',
            boundaryGap: false,
            min: 0,
            max: (dataPoints - 1) * updateInterval,
            axisLabel: {
              formatter: (value) => {
                return `${Math.floor(value / 1000)}s`;
              },
              color: '#999'
            }
          },
          yAxis: {
            type: 'value',
            name: 'Force (N)',
            axisLine: { lineStyle: { color: '#666' } },
            axisLabel: { color: '#999' },
            splitLine: { lineStyle: { color: '#333' } }
          },
          series
        }, true);
      });
    };

    const timer = setInterval(updateCharts, updateInterval);
    updateCharts();

    return () => {
      clearInterval(timer);
      dataCache.clear();
    };
  }, [selectedForces]);

  const handleForceChange = (event) => {
    setSelectedForces(event.target.value);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="force-select-label" sx={{ color: '#999' }}>{t('forceSelect')}</InputLabel>
        <Select
          labelId="force-select-label"
          multiple
          value={selectedForces}
          onChange={handleForceChange}
          label={t('forceSelect')}
          sx={{
            color: '#fff',
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.23)'
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.23)'
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#4080ff'
            },
            '.MuiSvgIcon-root': {
              color: '#999'
            }
          }}
        >
          {forceOptions.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {[0, 1, 2].map((index) => (
          <Grid item xs={12} key={index} sx={{ height: 'calc((100% - 32px) / 3)' }}>
            <Box
              ref={(element) => handleChartRef(element, index)}
              sx={{
                height: '100%',
                backgroundColor: '#2d2d2d',
                borderRadius: '8px'
              }}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ChartPanel;