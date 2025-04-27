import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

const forceOptions = [
    { label: 'Dx', color: '#e61736' },
    { label: 'Dy', color: '#e61736' },
    { label: 'Dz', color: '#e61736' },
];

const ChartPanel = ({ forceData }) => {
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
                    text: 'Deformation (mm)',
                    left: 'left',
                    top: 'top',
                    textStyle: { color: '#fff', fontSize: 16, fontFamily: 'Roboto' },
                },
                {
                    text: title,
                    right: 'right',
                    top: 'top',
                    textStyle: { color: '#fff', fontSize: 16, fontFamily: 'Roboto' },
                },
                {
                    text: 'Time(ms)', // 修改为 "Time(ms)" 与 X 轴一致
                    right: 'right',
                    bottom: 'bottom',
                    textStyle: { color: '#fff', fontSize: 16, fontFamily: 'Roboto' },
                },
            ],
            grid: { top: 40, right: 10, bottom: 30, left: 25, containLabel: true },
            xAxis: {
                type: 'value',
                min: 0,
                max: 500,
                interval: 100,
                axisLine: { lineStyle: { color: '#444' } },
                axisLabel: {
                    color: '#fff',
                    fontSize: 12,
                    fontFamily: 'Roboto',
                    formatter: (value) => `${Math.round(value)}`,
                },
                splitLine: { show: false },
            },
            yAxis: {
                type: 'value',
                name: '',
                min: -6,
                max: 6,
                interval: 3,
                axisLine: { lineStyle: { color: '#444' } },
                axisLabel: {
                    color: '#fff',
                    fontSize: 12,
                    fontFamily: 'Roboto',
                },
                splitLine: { lineStyle: { color: '#333' } },
            },
            series: [
                {
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    data: [],
                    lineStyle: { color, width: 1.5 },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: `${color}80` },
                            { offset: 1, color: `${color}00` },
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

        const titles = ['Dx = 0.00mm', 'Dy = 0.00mm', 'Dz = 0.00mm'];
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
            const { normal, shear, timestamp } = forceData;
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
                        const titles = ['Dx = 0.00mm', 'Dy = 0.00mm', 'Dz = 0.00mm'];
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
                const series = currentOption.series && currentOption.series[0] ? currentOption.series[0] : { data: [] };
                const seriesData = series.data || [];

                const newValue = index === 0 ? avgShearX : index === 1 ? avgShearY : avgNormal;
                seriesData.push([timeSinceStart, newValue]);
                if (seriesData.length > 500) seriesData.shift();

                const xMin = Math.max(0, timeSinceStart - 10000); // 最近 10 秒
                const xMax = timeSinceStart;

                // 动态计算 X 轴间隔（以秒为单位）
                const timeRangeSeconds = (xMax - xMin) / 1000; // 转换为秒
                const desiredLabelCount = 3; // 目标标签数量（可调整）
                const intervalSeconds = Math.ceil(timeRangeSeconds / desiredLabelCount); // 每隔几秒一个标签
                const intervalMilliseconds = intervalSeconds * 1000; // 转换为毫秒

                chart.setOption({
                    title: [
                        {
                            text: 'Deformation (mm)',
                            left: 'left',
                            top: 'top',
                            textStyle: { color: '#fff', fontSize: 16, fontFamily: 'Roboto' },
                        },
                        {
                            text: `${forceOptions[index].label} = ${newValue.toFixed(2)}mm`,
                            right: 'right',
                            top: 'top',
                            textStyle: { color: '#fff', fontSize: 16, fontFamily: 'Roboto' },
                        },
                        {
                            text: 'Time (s)',
                            right: 'right',
                            bottom: 'bottom',
                            textStyle: { color: '#fff', fontSize: 16, fontFamily: 'Roboto' },
                        },
                    ],
                    xAxis: {
                        min: xMin,
                        max: xMax,
                        interval: intervalMilliseconds,
                        axisLabel: {
                            formatter: (value) => `${(value / 1000).toFixed(1)}s`, // 显示为秒，保留一位小数
                            color: '#fff',
                            fontSize: 12,
                            fontFamily: 'Roboto',
                        },
                        splitLine: { show: false },
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
                        splitLine: { lineStyle: { color: '#464b50' } },
                    },
                    series: [
                        {
                            type: 'line',
                            smooth: true,
                            showSymbol: false,
                            data: seriesData,
                            lineStyle: { color: forceOptions[index].color, width: 1.5 },
                            areaStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: `${forceOptions[index].color}80` },
                                    { offset: 1, color: `${forceOptions[index].color}00` },
                                ]),
                            },
                        },
                    ],
                }, true);
                chart.resize();
            });
        };

        // 直接调用 updateChart，移除 setTimeout
        updateChart();
    }, [forceData, chartsInitialized]);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '10px',
            backgroundColor: '#000000',
            marginLeft: '20px'
        }}>
            {[0, 1, 2].map(index => (
                <div
                    key={index}
                    style={{
                        width: 'calc(100% - 50px)',
                        height: 'calc(33.33% - 48px)',
                        backgroundColor: '#232528',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        padding: '10px',
                    }}
                    ref={el => handleChartRef(el, index)}
                />
            ))}
        </div>
    );
};

export default ChartPanel;