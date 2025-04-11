import React, {useEffect, useRef, useState} from 'react';
import * as echarts from 'echarts';

const forceOptions = [
    {label: 'Fx', color: '#ff4d4f'},
    {label: 'Fy', color: '#52c41a'},
    {label: 'Fz', color: '#1890ff'},
];

const ChartPanel = ({forceData}) => {
    const chartsRef = useRef([]);
    const chartElementsRef = useRef([]);
    const startTimeRef = useRef(null);
    const [chartsInitialized, setChartsInitialized] = useState(false);

    const initChart = (element, title, color) => {
        if (!element) {
            console.error('initChart: DOM element is null');
            return null;
        }
        const chart = echarts.init(element);
        const option = {
            title: [
                {
                    text: 'Force (N)',
                    left: 'left',
                    top: 'top',
                    textStyle: {color: '#fff', fontSize: 16, fontFamily: 'Roboto'},
                },
                {
                    text: title,
                    right: 'right',
                    top: 'top',
                    textStyle: {color: '#fff', fontSize: 16, fontFamily: 'Roboto'},
                },
                {
                    text: 'Frame', // 添加 "Frame" 文字到右下角
                    right: 'right',
                    bottom: 'bottom',
                    textStyle: {color: '#fff', fontSize: 16, fontFamily: 'Roboto'},
                },
            ],
            grid: {top: 40, right: 10, bottom: 30, left: 45, containLabel: true}, // 调整 bottom 空间
            xAxis: {
                type: 'value',
                // 移除 name 和相关配置
                min: 0,
                max: 10000,
                interval: 2000,
                axisLine: {lineStyle: {color: '#444'}},
                axisLabel: {
                    color: '#fff',
                    fontSize: 12,
                    fontFamily: 'Roboto',
                    formatter: (value) => `${Math.round(value)}`,
                },
                splitLine: {show: false},
            },
            yAxis: {
                type: 'value',
                name: '',
                min: -6,
                max: 6,
                interval: 3,
                axisLine: {lineStyle: {color: '#444'}},
                axisLabel: {
                    color: '#fff',
                    fontSize: 12,
                    fontFamily: 'Roboto',
                },
                splitLine: {lineStyle: {color: '#333'}},
            },
            series: [
                {
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    data: [],
                    lineStyle: {color, width: 1.5},
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            {offset: 0, color: `${color}80`},
                            {offset: 1, color: `${color}00`},
                        ]),
                    },
                },
            ],
        };
        chart.setOption(option);
        return chart;
    };

    const handleChartRef = (element, index) => {
        if (!element) {
            setTimeout(() => {
                if (chartElementsRef.current[index]) {
                    handleChartRef(chartElementsRef.current[index], index);
                }
            }, 100);
            return;
        }
        chartElementsRef.current[index] = element;
        if (chartsRef.current[index] && !chartsRef.current[index].isDisposed()) {
            return;
        }

        const titles = ['Fx = 0.00N', 'Fy = 0.00N', 'Fz = 0.00N'];
        const chart = initChart(element, titles[index], forceOptions[index].color);
        if (chart) {
            chartsRef.current[index] = chart;
            if (chartsRef.current.length === 3 && chartsRef.current.every(c => c && !c.isDisposed())) {
                setChartsInitialized(true);
            }
        }
    };

    useEffect(() => {
        return () => {
            chartsRef.current.forEach(chart => {
                if (chart && !chart.isDisposed()) {
                    chart.dispose();
                }
            });
            chartsRef.current = [];
            chartElementsRef.current = [];
            setChartsInitialized(false);
        };
    }, []);

    useEffect(() => {
        if (!forceData || !chartsInitialized) {
            return;
        }

        const updateChart = () => {
            const {normal, shear, timestamp} = forceData;
            const height = normal.length;
            const width = normal[0].length;

            if (!startTimeRef.current) startTimeRef.current = timestamp * 1000;
            const timeSinceStart = (timestamp * 1000) - startTimeRef.current;

            let normalMin = Infinity, normalMax = -Infinity;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const n = normal[y][x];
                    if (isFinite(n)) {
                        normalMin = Math.min(normalMin, n);
                        normalMax = Math.max(normalMax, n);
                    }
                }
            }
            const normalRange = normalMax - normalMin > 0 ? normalMax - normalMin : 0;
            const threshold = Math.max(0.05, normalMax * 0.3);

            const hasDeformation = normalRange > 0 && normalMax > threshold;

            let shearXSum = 0, shearYSum = 0, normalSum = 0, count = 0;
            let minValue = Infinity, maxValue = -Infinity;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const shearX = shear[y][x][0] || 0;
                    const shearY = shear[y][x][1] || 0;
                    const normalVal = normal[y][x];
                    const cleanedShearX = isFinite(shearX) ? shearX : 0;
                    const cleanedShearY = isFinite(shearY) ? shearY : 0;
                    const cleanedNormal = isFinite(normalVal) ? normalVal : 0;

                    if (!hasDeformation || (hasDeformation && cleanedNormal > threshold)) {
                        shearXSum += cleanedShearX;
                        shearYSum += cleanedShearY;
                        normalSum += cleanedNormal;
                        count++;
                        minValue = Math.min(minValue, cleanedShearX, cleanedShearY, cleanedNormal);
                        maxValue = Math.max(maxValue, cleanedShearX, cleanedShearY, cleanedNormal);
                    }
                }
            }

            const avgShearX = count ? shearXSum / count : 0;
            const avgShearY = count ? shearYSum / count : 0;
            const avgNormal = count ? normalSum / count : 0;

            chartsRef.current.forEach((chart, index) => {
                if (!chart || chart.isDisposed()) {
                    if (chartElementsRef.current[index]) {
                        const titles = ['Fx = 0.00N', 'Fy = 0.00N', 'Fz = 0.00N'];
                        const newChart = initChart(chartElementsRef.current[index], titles[index], forceOptions[index].color);
                        if (newChart) {
                            chartsRef.current[index] = newChart;
                            chart = newChart;
                        } else {
                            return;
                        }
                    } else {
                        return;
                    }
                }

                const currentOption = chart.getOption() || {};
                const series = currentOption.series && currentOption.series[0] ? currentOption.series[0] : {data: []};
                const seriesData = series.data || [];

                const newValue = index === 0 ? avgShearX : index === 1 ? avgShearY : avgNormal;
                seriesData.push([timeSinceStart, newValue]);
                if (seriesData.length > 500) seriesData.shift();

                const xMin = Math.max(0, timeSinceStart - 10000);
                const xMax = timeSinceStart;

                chart.setOption({
                    title: [
                        {
                            text: 'Force (N)',
                            left: 'left',
                            top: 'top',
                            textStyle: {color: '#fff', fontSize: 16, fontFamily: 'Roboto'},
                        },
                        {
                            text: `${forceOptions[index].label} = ${newValue.toFixed(2)}N`,
                            right: 'right',
                            top: 'top',
                            textStyle: {color: '#fff', fontSize: 16, fontFamily: 'Roboto'},
                        },
                        {
                            text: 'Time(ms)', // 确保 "Frame" 文字在右下角
                            right: 'right',
                            bottom: 'bottom',
                            textStyle: {color: '#fff', fontSize: 16, fontFamily: 'Roboto'},
                        },
                    ],
                    xAxis: {
                        min: xMin,
                        max: xMax,
                        interval: (xMax - xMin) / 5,
                        axisLabel: {
                            formatter: (value) => `${Math.round(value)}`, color: '#fff',
                            fontSize: 12,
                            fontFamily: 'Roboto',
                        },

                    },
                    yAxis: {
                        min: -4,
                        max: 4,
                        interval: 2,
                        axisLabel: {
                            color: '#fff',
                            fontSize: 12,
                            fontFamily: 'Roboto',
                            formatter: (value) => `${value}`,
                        },
                        splitLine: {lineStyle: {color: '#333'}},
                    },
                    series: [
                        {
                            type: 'line',
                            smooth: true,
                            showSymbol: false,
                            data: seriesData,
                            lineStyle: {color: forceOptions[index].color, width: 1.5},
                            areaStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    {offset: 0, color: `${forceOptions[index].color}80`},
                                    {offset: 1, color: `${forceOptions[index].color}00`},
                                ]),
                            },
                        },
                    ],
                }, true);
                chart.resize();
            });
        };

        const timer = setTimeout(updateChart, 30);
        return () => clearTimeout(timer);
    }, [forceData, chartsInitialized]);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '10px',
            backgroundColor: '#121212'
        }}>
            {[0, 1, 2].map(index => (
                <div
                    key={index}
                    style={{
                        width: 'calc(100% - 60px)',
                        height: 'calc(33.33% - 60px)',
                        backgroundColor: '#2d2d2d',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        padding: '20px',
                    }}
                    ref={el => handleChartRef(el, index)}
                />
            ))}
        </div>
    );
};

export default ChartPanel;