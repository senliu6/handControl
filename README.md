DM-tac 项目架构及优缺点分析
项目概述
DM-tac 是一个基于 Python 和 PyQt6 的 3D 可视化分析系统，旨在实时采集和展示传感器数据（深度和剪切力），支持数据保存、回放功能，并提供用户友好的图形界面。项目支持两种传感器模式：真实传感器（通过 dmrobotics.Sensor）和后备传感器（FallbackSensor），后者用于测试或无硬件环境下的数据模拟。
项目架构
1. 总体结构
   项目采用模块化设计，核心代码集中在 main1.py 文件中，包含以下主要组件：

图形用户界面 (GUI)：基于 PyQt6，包含主窗口、图表面板和 3D 场景面板。
传感器模块：支持 dmrobotics.Sensor 和 FallbackSensor，处理数据采集和回放。
数据处理与可视化：使用 numpy、pyqtgraph 和 vedo 处理和展示传感器数据。
日志系统：通过 logging 模块记录运行状态和错误。

